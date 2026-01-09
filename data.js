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

// --- 3. AUTH SEDERHANA (localStorage) ---
function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}
function getCurrentUser() {
    const u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Login
async function login(username, password) {
    // Pastikan data ter-load dulu
    if (!users.length) await loadInitialData();

    const found = users.find(u => u.username === username && u.password === password);
    if (!found) return false;

    setCurrentUser(found);
    return true;
}

// Load semua data awal
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
        if (typeof showToast === "function") {
            showToast("Gagal memuat data. Cek koneksi internet / konfigurasi Supabase.", "error", 4500);
        } else {
            alert("Gagal memuat data. Cek koneksi internet.");
        }
        throw err;
    }
}

// Guru: Upsert nilai
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
