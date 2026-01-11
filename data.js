// =====================================================
// data.js — E-Rapor (Supabase) | Skema DB baru
//   - public.guru
//   - public.santri
//   - public.nilai_mapel
//   - public.nilai_walikelas
//   - public.nilai_musyrif
//
// Konvensi UI (kompatibel dashboard.html):
//   - users[] memakai: name, kelas_wali, jk
//   - students[] memakai: name, jk
//   - scores[] memakai: student_name
// =====================================================

// --- 1) KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://rfmlsxtchzhstheqdmla.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWxzeHRjaHpoc3RoZXFkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTA2MDEsImV4cCI6MjA4MjA2NjYwMX0.uuBqvhQ-1fsB2cF63-uluHpS6I-1JuYv5dF1bPcZdrU';

let db;
if (typeof supabase !== 'undefined') {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error('Library Supabase gagal dimuat.');
}

// --- 2) GLOBAL STATE ---
let users = [];
let students = [];
let scores = [];
let waliScores = [];
let musyrifScores = [];
let currentUser = null;

// --- 2B) KONFIGURASI PERIODE AKTIF (cached) ---
let appConfig = { tahun_ajar_aktif: '2025/2026', semester_aktif: 1 };
let bobotNilai = null; // { bobot_kehadiran, bobot_tugas, bobot_uh, bobot_paspat }
const konversiIdealCache = new Map(); // key: `${tahunAjar||'GLOBAL'}|${jenjang}|${semester}`

function getActivePeriode() {
  return { tahun_ajar: appConfig.tahun_ajar_aktif, semester: appConfig.semester_aktif };
}


// --- 3) ROLE HELPERS ---
function isAdmin(u) {
  return (u?.role || '').toLowerCase() === 'admin';
}
function isWali(u) {
  return !!getWaliKelas(u);
}
function getWaliKelas(u) {
  return (u?.wali || u?.kelas_wali || '').toString().trim();
}
function isMusyrif(u) {
  return !!(u?.musyrif || '').toString().trim();
}

// --- 3B) UTIL: sleep & paging (untuk data besar / free tier) ---
function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ambil semua data bertahap dengan .range() (menghindari limit default 1000 rows).
 * onProgress: (percent:number, label:string) => void
 */
async function fetchAllPaged(table, {
  select = "*",
  orderCol = null,
  ascending = true,
  pageSize = 1000,
  label = table,
  onProgress = null,
  filtersEq = null, // {col:value}
} = {}) {
  // Ambil count dulu (head request)
  let total = null;
  try {
    const head = await db.from(table).select("id", { count: "exact", head: true });
    if (!head.error && typeof head.count === "number") total = head.count;
  } catch {}

  let all = [];
  let from = 0;

  while (true) {
    let q = db.from(table).select(select).range(from, from + pageSize - 1);
    if (filtersEq && typeof filtersEq === 'object') {
      for (const [k, v] of Object.entries(filtersEq)) {
        q = q.eq(k, v);
      }
    }
    if (orderCol) q = q.order(orderCol, { ascending });

    const { data, error } = await q;
    if (error) throw new Error(error.message || String(error));

    all = all.concat(data || []);
    from += (data || []).length;

    if (typeof onProgress === "function" && total) {
      const pct = Math.min(100, Math.round((from / total) * 100));
      onProgress(pct, label);
    } else if (typeof onProgress === "function") {
      onProgress(0, label);
    }

    if (!data || data.length < pageSize) break;
    await _sleep(80);
  }

  if (typeof onProgress === "function" && total) onProgress(100, label);
  return all;
}

/**
 * Upsert SANTRI dalam batch agar tidak kena rate-limit / request terlalu banyak.
 */
async function upsertSantriBatchByNIS(rawRows, {
  batchSize = 200,
  onProgress = null,
  label = "santri",
  maxRetries = 3,
} = {}) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return;

  // 1) Normalisasi tipe data + bersihkan string kosong
  const normalized = rawRows
    .map(r => normalizeSantriPayload(r))
    .filter(r => !!r.nis);

  // 2) DEDUPE: pastikan dalam 1 batch tidak ada NIS duplikat.
  //    Error "ON CONFLICT DO UPDATE command cannot affect row a second time"
  //    terjadi kalau 1 request upsert berisi 2+ row dengan conflict key yang sama.
  const byNis = new Map();
  const dupNis = new Set();

  const mergePreferNonNull = (oldRow, newRow) => {
    const out = { ...oldRow };
    for (const k of Object.keys(newRow)) {
      if (k === 'nis') { out.nis = newRow.nis; continue; }
      const v = newRow[k];
      // overwrite kalau value baru "punya isi" (tidak null)
      if (v !== null && v !== undefined && String(v).trim() !== '') out[k] = v;
    }
    return out;
  };

  for (const row of normalized) {
    const key = row.nis;
    if (!key) continue;
    if (byNis.has(key)) dupNis.add(key);
    const prev = byNis.get(key) || {};
    byNis.set(key, mergePreferNonNull(prev, row));
  }

  const deduped = Array.from(byNis.values());

  if (dupNis.size > 0) {
    console.warn(`[IMPORT] Ditemukan NIS duplikat di file import: ${dupNis.size} NIS. (Dipakai baris terakhir / nilai yang terisi)`);
  }

  const total = deduped.length;
  let done = 0;

  for (let i = 0; i < deduped.length; i += batchSize) {
    const batch = deduped.slice(i, i + batchSize);

    let attempt = 0;
    while (true) {
      try {
        const res = await db.from("santri").upsert(batch, { onConflict: "nis" });
        if (res.error) throw new Error(res.error.message || String(res.error));
        break;
      } catch (e) {
        attempt += 1;
        const msg = (e && e.message) ? e.message : String(e);
        const maybeTransient = /429|too many|rate|timeout|gateway|503|502/i.test(msg);
        if (attempt <= maxRetries && maybeTransient) {
          await _sleep(400 * attempt);
          continue;
        }
        throw e;
      }
    }

    done += batch.length;
    if (typeof onProgress === "function") {
      const pct = Math.min(100, Math.round((done / total) * 100));
      const extra = dupNis.size ? ` • duplikat NIS: ${dupNis.size}` : '';
      onProgress(pct, `${label}${extra}`);
    }
    await _sleep(80);
  }

  if (typeof onProgress === "function") {
    const extra = dupNis.size ? ` • duplikat NIS: ${dupNis.size}` : '';
    onProgress(100, `${label}${extra}`);
  }
}

// --- 4) SESSION ---
function getCurrentUser() {
  if (currentUser) return currentUser;
  const stored = localStorage.getItem('erapor_user');
  if (!stored) return null;
  try {
    currentUser = JSON.parse(stored);
    return currentUser;
  } catch {
    return null;
  }
}
function logout() {
  localStorage.removeItem('erapor_user');
  window.location.href = 'index.html';
}

// --- 5) NORMALIZER ---
function _cleanText(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function _toIntOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function _toDateOrNull(v) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);

  const s = String(v).trim();
  if (!s) return null;

  // support YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // support DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // fallback: Date.parse
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);

  return null;
}

// Konversi angka panjang (termasuk scientific notation dari Excel) menjadi string digit utuh.
// Catatan: jika Excel sudah kehilangan presisi (angka > 15 digit disimpan sebagai number),
// digit yang hilang tidak bisa dipulihkan. Solusi terbaik: format kolom NIS sebagai Text di Excel.
function _toPlainDigitString(v) {
  if (v === undefined || v === null) return '';
  let s = String(v).trim();
  if (!s) return '';

  // Jika sudah berbentuk digit murni, return cepat
  if (/^\d+$/.test(s)) return s;

  // Excel/JS kadang memberi scientific notation: 1.234E+19
  if (/^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(s)) {
    const lower = s.toLowerCase();
    const [mantissa, expPart] = lower.split('e');
    const exp = parseInt(expPart, 10);

    // mantissa bisa "1.234" -> "1234"
    const dotIdx = mantissa.indexOf('.');
    const digitsAfterDot = dotIdx === -1 ? 0 : (mantissa.length - dotIdx - 1);
    let m = mantissa.replace('.', '');

    // shift = exp - digitsAfterDot
    const shift = exp - digitsAfterDot;

    if (shift >= 0) {
      return m + '0'.repeat(shift);
    } else {
      // Jika shift negatif: ambil bagian integer saja (NIS seharusnya integer)
      const cut = m.length + shift;
      return cut > 0 ? m.slice(0, cut) : '0';
    }
  }

  return s;
}

function _toNIS(v) {
  let s = _toPlainDigitString(v);
  if (!s) return null;

  // Kalau ada desimal (kasus aneh), ambil integer part
  if (s.includes('.')) s = s.split('.')[0];

  // Sisakan digit saja (hapus spasi/strip/titik, dsb)
  s = s.replace(/[^\d]/g, '');

  return s === '' ? null : s;
}

function normalizeGuruPayload(raw, { isInsert = false } = {}) {
  const p = { ...(raw || {}) };

  // UI -> DB
  if (p.name !== undefined && p.nama_guru === undefined) p.nama_guru = p.name;
  if (p.kelas_wali !== undefined && p.wali === undefined) p.wali = p.kelas_wali;

  // koherensi: jk (bukan lp)
  if (p.jk === undefined && p.lp !== undefined) p.jk = p.lp;

  // role: hanya admin/guru
  let role = (p.role || 'guru').toString().toLowerCase();
  if (!['admin', 'guru'].includes(role)) role = 'guru';
  p.role = role;

  // mapel: pastikan jsonb (array/object)
  if (typeof p.mapel === 'string') {
    try { p.mapel = JSON.parse(p.mapel); } catch { /* ignore */ }
  }

  const cleaned = {
    username: _cleanText(p.username),
    password: _cleanText(p.password),
    role: p.role,
    nama_guru: _cleanText(p.nama_guru),
    mapel: p.mapel ?? null,
    kelas: _cleanText(p.kelas),
    wali: _cleanText(p.wali),
    musyrif: _cleanText(p.musyrif),
    jk: _cleanText(p.jk),
  };

  // password default saat insert kalau kosong
  if (isInsert && !cleaned.password) cleaned.password = '123456';

  // hapus key null yang tidak wajib? tetap kirim null boleh, tapi lebih bersih:
  Object.keys(cleaned).forEach(k => {
    if (cleaned[k] === undefined) delete cleaned[k];
  });

  return cleaned;
}

function normalizeSantriPayload(raw) {
  const p = { ...(raw || {}) };

  if (p.name !== undefined && p.nama_santri === undefined) p.nama_santri = p.name;

  // koherensi: jk (bukan lp)
  if (p.jk === undefined && p.lp !== undefined) p.jk = p.lp;

  const cleaned = {
    nis: _toNIS(p.nis),
    nama_santri: _cleanText(p.nama_santri),
    jk: _cleanText(p.jk),
    kelas: _cleanText(p.kelas),
    ttl: _cleanText(p.ttl),
    status_keluarga: _cleanText(p.status_keluarga),
    anak_ke: _toIntOrNull(p.anak_ke),
    asal_sekolah: _cleanText(p.asal_sekolah),
    tanggal_diterima: _toDateOrNull(p.tanggal_diterima),
    diterima_kelas: _cleanText(p.diterima_kelas),
    nama_ayah: _cleanText(p.nama_ayah),
    nama_ibu: _cleanText(p.nama_ibu),
    pekerjaan_ayah: _cleanText(p.pekerjaan_ayah),
    pekerjaan_ibu: _cleanText(p.pekerjaan_ibu),
    alamat_ortu: _cleanText(p.alamat_ortu),
    nama_wali: _cleanText(p.nama_wali),
    pekerjaan_wali: _cleanText(p.pekerjaan_wali),
    alamat_wali: _cleanText(p.alamat_wali),
  };

  Object.keys(cleaned).forEach(k => {
    if (cleaned[k] === undefined) delete cleaned[k];
  });

  return cleaned;
}


// --- 5B) SETTINGS: app_config, bobot_nilai, konversi_nilai_ideal ---
async function fetchAppConfig() {
  const { data, error } = await db.from('app_config').select('*').eq('id', 1).single();
  if (error) throw new Error(error.message || String(error));
  if (data?.tahun_ajar_aktif) appConfig.tahun_ajar_aktif = data.tahun_ajar_aktif;
  if (data?.semester_aktif) appConfig.semester_aktif = Number(data.semester_aktif) || 1;
  return appConfig;
}

async function fetchBobotNilaiGlobal() {
  // Coba ambil baris 'global' jika kolom scope ada; kalau tidak, ambil baris terbaru.
  let q = db.from('bobot_nilai').select('*');
  try {
    q = q.eq('scope', 'global');
  } catch {}
  let { data, error } = await q.order('updated_at', { ascending: false }).limit(1);
  if (error) {
    // fallback: tanpa scope
    const res2 = await db.from('bobot_nilai').select('*').order('updated_at', { ascending: false }).limit(1);
    data = res2.data; error = res2.error;
  }
  if (error) throw new Error(error.message || String(error));

  if (data && data.length) {
    bobotNilai = data[0];
    return bobotNilai;
  }

  // Jika kosong: insert default
  const payload = {
    scope: 'global',
    bobot_kehadiran: 10,
    bobot_tugas: 20,
    bobot_uh: 40,
    bobot_paspat: 30,
  };
  const ins = await db.from('bobot_nilai').insert(payload).select('*').single();
  if (ins.error) throw new Error(ins.error.message || String(ins.error));
  bobotNilai = ins.data;
  return bobotNilai;
}

async function saveBobotNilaiGlobal({ bobot_kehadiran, bobot_tugas, bobot_uh, bobot_paspat }) {
  const payload = {
    bobot_kehadiran: Number(bobot_kehadiran) || 0,
    bobot_tugas: Number(bobot_tugas) || 0,
    bobot_uh: Number(bobot_uh) || 0,
    bobot_paspat: Number(bobot_paspat) || 0,
    updated_at: new Date().toISOString(),
  };

  // Total 100 (biar nggak ditolak constraint)
  const sum = payload.bobot_kehadiran + payload.bobot_tugas + payload.bobot_uh + payload.bobot_paspat;
  if (sum !== 100) throw new Error('Total bobot harus 100%');

  // Jika punya id: update
  if (bobotNilai?.id) {
    const res = await db.from('bobot_nilai').update(payload).eq('id', bobotNilai.id).select('*').single();
    if (res.error) throw new Error(res.error.message || String(res.error));
    bobotNilai = res.data;
    return bobotNilai;
  }

  // Jika belum ada: insert global
  const ins = await db.from('bobot_nilai').insert({ ...payload, scope: 'global' }).select('*').single();
  if (ins.error) throw new Error(ins.error.message || String(ins.error));
  bobotNilai = ins.data;
  return bobotNilai;
}

function _idealKey(tahunAjar, jenjang, semester) {
  return `${(tahunAjar || 'GLOBAL')}|${jenjang}|${semester}`;
}

async function fetchKonversiIdeal(jenjang, semester, tahunAjar = null) {
  const key = _idealKey(tahunAjar, jenjang, semester);
  if (konversiIdealCache.has(key)) return konversiIdealCache.get(key);

  // 1) Coba override tahun ajar dulu (kalau diberikan)
  if (tahunAjar) {
    const res = await db.from('konversi_nilai_ideal')
      .select('*')
      .eq('tahun_ajar', tahunAjar)
      .eq('jenjang', jenjang)
      .eq('semester', semester)
      .limit(1);
    if (res.error) throw new Error(res.error.message || String(res.error));
    if (res.data && res.data.length) {
      konversiIdealCache.set(key, res.data[0]);
      return res.data[0];
    }
  }

  // 2) Fallback global (tahun_ajar null)
  const res2 = await db.from('konversi_nilai_ideal')
    .select('*')
    .is('tahun_ajar', null)
    .eq('jenjang', jenjang)
    .eq('semester', semester)
    .limit(1);
  if (res2.error) throw new Error(res2.error.message || String(res2.error));
  const row = (res2.data && res2.data.length) ? res2.data[0] : null;
  konversiIdealCache.set(key, row);
  return row;
}

async function fetchKonversiIdealMatrixGlobal() {
  // Mengembalikan map: `${jenjang}|${semester}` -> row
  const res = await db.from('konversi_nilai_ideal').select('*').is('tahun_ajar', null);
  if (res.error) throw new Error(res.error.message || String(res.error));
  const map = new Map();
  (res.data || []).forEach(r => map.set(`${r.jenjang}|${r.semester}`, r));
  return map;
}

async function saveKonversiIdealGlobal(rows) {
  // rows: [{jenjang, semester, min_ideal, max_ideal, mean_ideal}]
  const payload = (rows || []).map(r => ({
    tahun_ajar: null,
    jenjang: r.jenjang,
    semester: Number(r.semester),
    min_ideal: Number(r.min_ideal) || 0,
    max_ideal: Number(r.max_ideal) || 0,
    mean_ideal: Number(r.mean_ideal) || 0,
    updated_at: new Date().toISOString(),
  }));

  const res = await db.from('konversi_nilai_ideal').upsert(payload, { onConflict: 'jenjang,semester' });
  if (res.error) throw new Error(res.error.message || String(res.error));

  // bersihkan cache global
  for (const r of payload) {
    konversiIdealCache.delete(_idealKey(null, r.jenjang, r.semester));
  }
  return true;
}

// --- 6) LOGIN ---
async function login(username, password) {
  try {
    const { data, error } = await db
      .from('guru')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (error || !data) return false;

    // mapping kompatibel dashboard.html
    let role = (data.role || 'guru').toString().toLowerCase();
    if (!['admin','guru'].includes(role)) role = 'guru';
    const u = {
      ...data,
      role,
      name: data.nama_guru,
      kelas_wali: data.wali || '',
      jk: data.jk || '',
    };

    localStorage.setItem('erapor_user', JSON.stringify(u));
    currentUser = u;
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// --- 7) LOAD DATA ---
async function loadInitialData(opts = {}) {
  console.log('Fetching Data...');
  const onProgress = opts.onProgress || null;
  const pageSize = opts.pageSize || 1000;

  // 0) Ambil periode aktif (tahun ajar & semester) terlebih dahulu
  try { await fetchAppConfig(); } catch (e) { console.warn('Gagal fetch app_config, pakai default.', e); }
  try { await fetchBobotNilaiGlobal(); } catch (e) { console.warn('Gagal fetch bobot_nilai, pakai fallback.', e); }
  const { tahun_ajar, semester } = getActivePeriode();

  const tasks = [
    { table: 'guru', label: 'Guru', orderCol: 'nama_guru' },
    { table: 'santri', label: 'Santri', orderCol: 'nama_santri' },
    { table: 'nilai_mapel', label: 'Nilai Mapel', orderCol: null, filtersEq: { tahun_ajar, semester } },
    { table: 'nilai_walikelas', label: 'Nilai Wali Kelas', orderCol: null, filtersEq: { tahun_ajar, semester } },
    { table: 'nilai_musyrif', label: 'Nilai Musyrif', orderCol: null, filtersEq: { tahun_ajar, semester } },
  ];

  const result = {};
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const subProgress = (pct) => {
      if (typeof onProgress !== 'function') return;
      const overall = Math.min(100, Math.round(((i + (pct / 100)) / tasks.length) * 100));
      onProgress(overall, `Memuat ${t.label} (${pct}%)`);
    };

    result[t.table] = await fetchAllPaged(t.table, {
      select: '*',
      orderCol: t.orderCol,
      ascending: true,
      pageSize,
      label: t.label,
      onProgress: subProgress,
      filtersEq: t.filtersEq || null,
    });
  }

  // Mapping agar kompatibel dashboard.html
  users = (result.guru || []).map(g => {
    let role = (g.role || 'guru').toString().toLowerCase();
    if (!['admin','guru'].includes(role)) role = 'guru';
    return {
      ...g,
      role,
      name: g.nama_guru,
      kelas_wali: g.wali || '',
      jk: g.jk || '',
    };
  });

  students = (result.santri || []).map(x => ({
    ...x,
    name: x.nama_santri,
    jk: x.jk || '',
    lp: x.jk || '', // alias legacy
  }));

  scores = (result.nilai_mapel || []).map(x => ({
    ...x,
    student_name: x.nama_santri,
  }));

  waliScores = (result.nilai_walikelas || []).map(x => ({
    ...x,
    student_name: x.nama_santri,
  }));

  musyrifScores = (result.nilai_musyrif || []).map(x => ({
    ...x,
    student_name: x.nama_santri,
  }));

  if (typeof onProgress === 'function') onProgress(100, 'Selesai');
  console.log('Data Loaded.');
}

// --- 8) CRUD GURU ---
async function addGuruToDB(data) {
  const payload = normalizeGuruPayload(data, { isInsert: true });
  const res = await db.from('guru').insert(payload);
  if (res.error) throw new Error(res.error.message);
  return res;
}
async function updateGuruInDB(id, data) {
  const payload = normalizeGuruPayload(data, { isInsert: false });
  const res = await db.from('guru').update(payload).eq('id', id);
  if (res.error) throw new Error(res.error.message);
  return res;
}
async function deleteUserFromDB(id) {
  const res = await db.from('guru').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
  return res;
}

// --- 9) CRUD SANTRI ---
async function addSantriToDB(data) {
  const payload = normalizeSantriPayload(data);
  const res = await db.from('santri').insert(payload);
  if (res.error) throw new Error(res.error.message);
  return res;
}
async function updateSantriInDB(id, data) {
  const payload = normalizeSantriPayload(data);
  const res = await db.from('santri').update(payload).eq('id', id);
  if (res.error) throw new Error(res.error.message);
  return res;
}
async function deleteSantriFromDB(id) {
  const res = await db.from('santri').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
  return res;
}
async function upsertSantriByNIS(data) {
  const payload = normalizeSantriPayload(data);
  if (!payload.nis) return { data: null, error: null };
  const res = await db.from('santri').upsert(payload, { onConflict: 'nis' });
  if (res.error) throw new Error(res.error.message);
  return res;
}

// --- 10) NILAI MAPEL / WALI / MUSYRIF ---
async function upsertScore(student_name, kelas, mapel, field, value) {
  // cari NIS dari students
  const st = students.find(x => x.name === student_name || x.nama_santri === student_name);
  const nis = st?.nis;
  if (!nis) throw new Error('NIS tidak ditemukan untuk: ' + student_name);

  const { tahun_ajar, semester } = getActivePeriode();

  // NOTE:
  // Jangan bergantung pada cache local (scores[]) untuk menentukan update/insert.
  // Pakai UPSERT agar:
  // - aman dari 409 (Conflict)
  // - aman dari kondisi cache belum ter-refresh
  const payload = {
    nis: String(nis),
    mapel: String(mapel),
    kelas: String(kelas || ''),
    nama_santri: String(student_name || ''),
    tahun_ajar: String(tahun_ajar || ''),
    semester: Number(semester) || 1,
  };
  payload[field] = (value === '' || value === null || value === undefined) ? 0 : Number(value) || 0;

  const res = await db.from('nilai_mapel').upsert([payload], { onConflict: 'nis,mapel,tahun_ajar,semester' });
  if (res.error) throw new Error(res.error.message);
  return res;
}

async function upsertWaliScore(student_id, nis, name, kelas, field, value) {
  const numeric = new Set(['hadir_s','hadir_i','hadir_a','akhlak','kerajinan','kebersihan','kedisiplinan']);
  const { tahun_ajar, semester } = getActivePeriode();

  const payload = {
    student_id: student_id,
    nis: String(nis),
    kelas: String(kelas || ''),
    nama_santri: String(name || ''),
    tahun_ajar: String(tahun_ajar || ''),
    semester: Number(semester) || 1,
  };
  if (numeric.has(field)) payload[field] = (value === '' ? 0 : Number(value) || 0);
  else payload[field] = (value === '' || value === null || value === undefined) ? '-' : String(value);

  const res = await db.from('nilai_walikelas').upsert([payload], { onConflict: 'nis,tahun_ajar,semester' });
  if (res.error) throw new Error(res.error.message);
  return res;
}

async function upsertMusyrifScore(student_id, nis, name, kelas, field, value) {
  const { tahun_ajar, semester } = getActivePeriode();

  const payload = {
    student_id: student_id,
    nis: String(nis),
    kelas: String(kelas || ''),
    nama_santri: String(name || ''),
    tahun_ajar: String(tahun_ajar || ''),
    semester: Number(semester) || 1,
  };
  payload[field] = (value === '' ? 0 : Number(value) || 0);

  const res = await db.from('nilai_musyrif').upsert([payload], { onConflict: 'nis,tahun_ajar,semester' });
  if (res.error) throw new Error(res.error.message);
  return res;
}

// --- 12) BATCH UPSERT (untuk simpan massal hasil import) ---
function _chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function _dedupeByKeys(rows, keys) {
  const m = new Map();
  for (const r of rows) {
    const k = keys.map(kk => String(r[kk] ?? '')).join('||');
    if (!k) continue;
    // merge: yang terakhir menang (misal ada duplikat di UI)
    m.set(k, { ...(m.get(k) || {}), ...r });
  }
  return Array.from(m.values());
}

async function upsertBatch(table, rows, onConflict, opts = {}) {
  const batchSize = opts.batchSize || 200;
  const onProgress = opts.onProgress || null;
  const label = opts.label || table;
  const conflictKeys = onConflict.split(',').map(s => s.trim()).filter(Boolean);

  const cleanRows = _dedupeByKeys(rows.filter(Boolean), conflictKeys);
  const batches = _chunk(cleanRows, batchSize);
  let done = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    // retry ringan untuk 429/5xx
    let attempt = 0;
    while (true) {
      attempt++;
      const res = await db.from(table).upsert(batch, { onConflict });
      if (!res.error) break;
      const msg = res.error.message || '';
      const status = res.status || res.error.status || 0;
      const retryable = status === 429 || status >= 500 || /timeout|rate|Too Many|temporarily/i.test(msg);
      if (!retryable || attempt >= 4) throw new Error(`${label}: ${msg}`);
      await _sleep(400 * attempt);
    }

    done += batch.length;
    if (typeof onProgress === 'function') {
      const pct = Math.round((done / cleanRows.length) * 100);
      onProgress(pct, `${label} (${done}/${cleanRows.length})`);
    }
  }
  return { ok: true, count: cleanRows.length };
}

// Convenience wrappers
async function upsertNilaiMapelBatch(rows, opts = {}) {
  return upsertBatch('nilai_mapel', rows, 'nis,mapel,tahun_ajar,semester', { ...opts, label: 'Nilai Mapel' });
}
async function upsertNilaiWaliBatch(rows, opts = {}) {
  return upsertBatch('nilai_walikelas', rows, 'nis,tahun_ajar,semester', { ...opts, label: 'Nilai Wali Kelas' });
}
async function upsertNilaiMusyrifBatch(rows, opts = {}) {
  return upsertBatch('nilai_musyrif', rows, 'nis,tahun_ajar,semester', { ...opts, label: 'Nilai Musyrif' });
}

// expose untuk dashboard.html
window.upsertNilaiMapelBatch = upsertNilaiMapelBatch;
window.upsertNilaiWaliBatch = upsertNilaiWaliBatch;
window.upsertNilaiMusyrifBatch = upsertNilaiMusyrifBatch;

// --- 11) Helper Parsing Mapel (UI) ---
function parseMapelData(mapelRaw) {
  if (Array.isArray(mapelRaw) && mapelRaw.length > 0 && typeof mapelRaw[0] === 'object') return mapelRaw;
  if (Array.isArray(mapelRaw) && typeof mapelRaw[0] === 'string') return mapelRaw.map(mName => ({ nama: mName, kelas: [] }));
  return [];
}
