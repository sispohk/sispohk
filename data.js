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
    window.location.href = 'login.html';
}

// --- 4. LOAD DATA (INIT) ---
async function loadInitialData() {
    console.log("Loading data Supabase...");
    try {
        const usersReq = await db.from('users').select('*');
        if(usersReq.data) users = usersReq.data;

        const studentsReq = await db.from('students').select('*');
        if(studentsReq.data) students = studentsReq.data;

        const scoresReq = await db.from('scores').select('*');
        if(scoresReq.data) scores = scoresReq.data;
        
        console.log("Data loaded.", {users, students, scores});
    } catch (err) {
        alert("Gagal memuat data. Cek koneksi internet.");
    }
}

// --- 5. CRUD FUNCTIONS ---

// Guru: Simpan Nilai
async function saveScoreToDB(scoreData) {
    // scoreData: { student_name, kelas, mapel, kehadiran, tugas, uh, pas }
    const { error } = await db
        .from('scores')
        .upsert(scoreData, { onConflict: 'student_name, mapel' });
    
    if (error) throw new Error(error.message);
}

// Wali Kelas: Simpan Catatan & Prestasi
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