// --- 1. KONFIGURASI SUPABASE ---
// GANTI DENGAN KUNCI PROYEK ANDA SENDIRI!
const SUPABASE_URL = 'https://rfmlsxtchzhstheqdmla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWxzeHRjaHpoc3RoZXFkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTA2MDEsImV4cCI6MjA4MjA2NjYwMX0.uuBqvhQ-1fsB2cF63-uluHpS6I-1JuYv5dF1bPcZdrU';

// Cek Library
if (typeof supabase === 'undefined') {
    console.error("Library Supabase belum dimuat!");
} else {
    var db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// --- 2. GLOBAL STATE ---
let users = [];
let students = [];
let scores = [];
let waliScores = [];
let musyrifScores = [];

// --- 3. AUTH (LOGIN) ---
async function login(username, password) {
    try {
        const { data, error } = await db
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) return false;

        // Mapping khusus Wali Kelas: pindahkan kelas_wali ke properti kelas
        if (data.role === 'wali_kelas' && data.kelas_wali) {
            data.kelas = data.kelas_wali;
        }

        localStorage.setItem('currentUser', JSON.stringify(data));
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// --- 4. LOAD DATA (INIT) ---
async function loadInitialData() {
    console.log("Loading data Supabase...");
    try {
        const usersReq = await db.from('users').select('*');
        if (usersReq.data) users = usersReq.data;

        const studentsReq = await db.from('students').select('*');
        if (studentsReq.data) students = studentsReq.data;

        const scoresReq = await db.from('scores').select('*');
        if (scoresReq.data) scores = scoresReq.data;

        // Optional tables (bisa belum dibuat saat pertama deploy)
        const waliReq = await db.from('wali_scores').select('*');
        if (!waliReq.error && waliReq.data) waliScores = waliReq.data;
        else if (waliReq.error) { console.warn('wali_scores not loaded:', waliReq.error.message); waliScores = []; }

        const musReq = await db.from('musyrif_scores').select('*');
        if (!musReq.error && musReq.data) musyrifScores = musReq.data;
        else if (musReq.error) { console.warn('musyrif_scores not loaded:', musReq.error.message); musyrifScores = []; }

        console.log("Data loaded.", { users, students, scores, waliScores, musyrifScores });
    } catch (err) {
        console.error(err);
        alert("Gagal memuat data. Cek koneksi internet.");
    }
}

// --- 5. CRUD FUNCTIONS ---

// Guru: Simpan Nilai
async function saveScoreToDB(scoreData) {
    // scoreData: { student_name, kelas, mapel, kehadiran, tugas, uh1, uh2, uh3, uh4, uh5, pas }
    const { error } = await db
        .from('scores')
        .upsert(scoreData, { onConflict: 'student_name,mapel' });
    
    if (error) throw new Error(error.message);
}

// Wali Kelas: Simpan Catatan & Prestasi

async function updateStudentFields(id, fields) {
  try {
    const { error } = await db
      .from('students')
      .update(fields)
      .eq('id', id);
    if (error) throw error;
    await loadInitialData(); // refresh local
    return true;
  } catch (err) {
    console.error('updateStudentFields error:', err);
    throw err;
  }
}

// Wali Kelas: Batch update students (absen/catatan/prestasi)

async function updateStudentsBatch(rows) {
  try {
    const incoming = Array.isArray(rows) ? rows : [];
    if (!incoming.length) return true;

    // Kolom VALID untuk tabel public.students (sesuai skema terbaru)
    const STUDENT_COLS = new Set([
      "id","nis","name","kelas","nisn","lp","ttl","agama",
      "status_keluarga","anak_ke","telp_siswa","alamat_siswa","sekolah_asal",
      "tanggal_diterima","diterima_kelas",
      "nama_ayah","nama_ibu","pekerjaan_ayah","pekerjaan_ibu","alamat_ortu",
      "nama_wali","pekerjaan_wali","alamat_wali"
    ]);

    const pickStudentCols = (obj) => {
      const out = {};
      if (!obj || typeof obj !== "object") return out;
      for (const k of Object.keys(obj)) {
        if (!STUDENT_COLS.has(k)) continue;
        if (obj[k] === undefined) continue;
        out[k] = obj[k];
      }
      return out;
    };

    // Merge dengan data students yang sudah ada di cache lokal.
    // Skip id yang tidak ditemukan di cache agar tidak terjadi INSERT baru tanpa kolom wajib.
    const payload = incoming
      .map(r => {
        const id = Number(r?.id);
        if (!Number.isFinite(id)) return null;

        const base = (students || []).find(s => Number(s.id) === id);
        if (!base) return null;

        const safeBase = {
          id: base.id,
          name: base.name,   // NOT NULL
          kelas: base.kelas  // NOT NULL
        };

        const baseExtras = pickStudentCols(base);
        const overrides = pickStudentCols(r);

        // Jangan biarkan override merusak kolom NOT NULL
        if (overrides.name === null || overrides.name === "") delete overrides.name;
        if (overrides.kelas === null || overrides.kelas === "") delete overrides.kelas;

        return { ...baseExtras, ...safeBase, ...overrides };
      })
      .filter(Boolean);

    if (!payload.length) return true;

    const { error } = await db
      .from("students")
      .upsert(payload, { onConflict: "id" });

    if (error) throw error;
    await loadInitialData();
    return true;
  } catch (err) {
    console.error("updateStudentsBatch error:", err);
    throw err;
  }
}

// Wali: upsert absen, catatan, prestasi, sikap ke tabel wali_scores
async function updateWaliScoresBatch(rows) {
  const incoming = Array.isArray(rows) ? rows : [];
  if (!incoming.length) return true;

  // helper: hanya set properti jika val bukan null/undefined
  const setIf = (obj, key, val) => {
    if (val === undefined || val === null) return;
    if (typeof val === 'number' && Number.isNaN(val)) return;
    obj[key] = val;
  };

  const payload = incoming
    .map(r => {
      const sid = Number(r?.student_id ?? r?.studentId ?? r?.id);
      if (!Number.isFinite(sid)) return null;

      const base = (students || []).find(s => Number(s.id) === sid);
      if (!base) return null; // jangan buat baris baru tanpa data wajib

      const kelas = String(r?.kelas ?? base.kelas ?? '').trim();
      if (!kelas) return null;

      // kolom wajib (selalu dikirim)
      const row = {
        student_id: sid,
        nis: (r?.nis ?? base.nis ?? null),
        student_name: (r?.student_name ?? r?.studentName ?? base.name),
        kelas,
        updated_at: new Date().toISOString(),
      };

      // kolom opsional: hanya dikirim jika ada nilainya
      setIf(row, 'hadir_s', (r?.hadir_s ?? r?.hadirS));
      setIf(row, 'hadir_i', (r?.hadir_i ?? r?.hadirI));
      setIf(row, 'hadir_a', (r?.hadir_a ?? r?.hadirA));
      setIf(row, 'catatan', r?.catatan);

      // Prestasi 1 (tetap pakai nama kolom "prestasi" di DB saat ini)
      setIf(row, 'prestasi', r?.prestasi);
      setIf(row, 'prestasi2', r?.prestasi2);
      setIf(row, 'prestasi3', r?.prestasi3);

      setIf(row, 'akhlak', r?.akhlak);
      setIf(row, 'kerajinan', r?.kerajinan);
      setIf(row, 'kebersihan', r?.kebersihan);
      setIf(row, 'kedisiplinan', r?.kedisiplinan);

      return row;
    })
    .filter(Boolean);

  if (!payload.length) return true;

  const { data, error } = await db
    .from('wali_scores')
    .upsert(payload, { onConflict: 'student_id,kelas' })
    .select('*');

  if (error) throw error;

  // update cache minimal (atau reload)
  if (Array.isArray(data)) {
    data.forEach(item => {
      const idx = (waliScores || []).findIndex(x => Number(x.student_id) === Number(item.student_id) && String(x.kelas) === String(item.kelas));
      if (idx >= 0) waliScores[idx] = item;
      else (waliScores || []).push(item);
    });
  }
  return true;
}


// Musyrif: upsert nilai ke tabel musyrif_scores
async function saveMusyrifScoreToDB(payload) {
  const sid = Number(payload?.student_id ?? payload?.studentId ?? payload?.id);
  if (!Number.isFinite(sid)) throw new Error('student_id tidak valid');

  const base = (students || []).find(s => Number(s.id) === sid);
  if (!base) throw new Error('Santri tidak ditemukan');

  const kelas = String(payload?.kelas ?? base.kelas ?? '').trim();
  if (!kelas) throw new Error('kelas kosong');

  const row = {
    student_id: sid,
    nis: payload?.nis ?? base.nis ?? null,
    student_name: payload?.student_name ?? payload?.studentName ?? base.name,
    kelas,

    hafalan_wajib: payload?.hafalan_wajib,
    hafalan_murojaah: payload?.hafalan_murojaah,
    ziyadah: payload?.ziyadah,
    fashohah: payload?.fashohah,

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('musyrif_scores')
    .upsert(row, { onConflict: 'student_id,kelas' })
    .select('*')
    .single();

  if (error) throw error;

  const idx = (musyrifScores || []).findIndex(x => Number(x.student_id) === Number(row.student_id) && String(x.kelas) === String(row.kelas));
  if (idx >= 0) musyrifScores[idx] = data;
  else (musyrifScores || []).push(data);

  return data;
}




async function updateStudentNotes(id, catatan, prestasi) {
    const { error } = await db
        .from('students')
        .update({ catatan: catatan, prestasi: prestasi })
        .eq('id', id);
    
    if (error) throw new Error(error.message);
    await loadInitialData(); // Refresh data lokal
}

// Admin: CRUD Guru (Users)
async function addGuruToDB(data) {
    const { error } = await db.from('users').insert(data);
    if(error) throw error; else await loadInitialData();
}
async function updateGuruInDB(id, data) {
    const { error } = await db.from('users').update(data).eq('id', id);
    if(error) throw error; else await loadInitialData();
}
async function deleteUserFromDB(id) {
    const { error } = await db.from('users').delete().eq('id', id);
    if(error) throw error; else await loadInitialData();
}

// Admin: CRUD Santri (Students)
async function addSantriToDB(data) {
    const { error } = await db.from('students').insert(data);
    if(error) throw error; else await loadInitialData();
}
async function updateSantriInDB(id, data) {
    const { error } = await db.from('students').update(data).eq('id', id);
    if(error) throw error; else await loadInitialData();
}
async function deleteSantriFromDB(id) {
    const { error } = await db.from('students').delete().eq('id', id);
    if(error) throw error; else await loadInitialData();
}
