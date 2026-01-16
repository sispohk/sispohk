document.addEventListener('DOMContentLoaded', async () => {
        const u = getCurrentUser();
        if(!u) { window.location.href = 'index.html'; return; }
        document.getElementById('user-info-name').innerText = u.name;
        (() => {
        const labels = [];
        try {
            if (typeof isAdmin === 'function' && isAdmin(u)) labels.push('Admin');
            else if (typeof isGuru === 'function' && isGuru(u)) labels.push('Guru');
            else if (u.role) labels.push(String(u.role));
            if (typeof isMusyrif === 'function' && isMusyrif(u)) labels.push('Musyrif');
            if (typeof isWali === 'function' && isWali(u)) labels.push('Wali Kelas');
        } catch (e) {
            if (u.role) labels.push(String(u.role));
        }
        const uniq = labels.filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
        document.getElementById('user-info-role').innerText = uniq.join(', ');
    })();
        setLoading(true, "Memuat Data...");
        setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
        setLoading(false);
        renderSidebar();
        bindMobileSidebarAutoClose();
        // Ensure sidebar starts closed on small screens
        closeSidebar();
        renderDashboardContent();
    });

    function bindMobileSidebarAutoClose() {
        const menu = document.getElementById('sidebar-menu');
        if (!menu) return;
        if (menu.dataset.boundMobileClose === '1') return;
        menu.dataset.boundMobileClose = '1';

        menu.addEventListener('click', (e) => {
            // Close only when a link is clicked (not when expanding collapsible headers)
            const a = e.target && e.target.closest && e.target.closest('a');
            if (!a) return;
            if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
                closeSidebar();
            }
        });

        // If user rotates / resizes to desktop, ensure backdrop disappears
        window.addEventListener('resize', () => {
            if (window.matchMedia && !window.matchMedia('(max-width: 768px)').matches) {
                closeSidebar();
            }
        });
    }
    const isGuru = u => (u?.role || '').toLowerCase().includes('guru') || (u?.mapel && parseMapelData(u.mapel).length > 0);
    // isAdmin, isWali, getWaliKelas sudah didefinisikan di data.js (hindari duplicate declaration)

    function renderSidebar() {
        const u = getCurrentUser();
        const menu = document.getElementById('sidebar-menu');
        menu.innerHTML = `<li><a href="#" onclick="renderDashboardContent()" class="flex items-center gap-3 p-3 rounded hover:bg-blue-700 font-bold text-sm">🏠 Dashboard</a></li>`;

        if (isAdmin(u)) {
            menu.innerHTML += `
            <li class="px-3 mt-6 mb-2 text-xs text-blue-300 uppercase font-bold tracking-wider">Database</li>
            <li><a href="#" onclick="renderAdminGuru()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">👥 Data Guru</a></li>
            <li><a href="#" onclick="renderAdminSantri()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🎓 Data Santri</a></li>
            <li><a href="#" onclick="renderAdminLegger()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">📊 Legger Santri</a></li>

            <li><a href="#" onclick="renderAdminRanking()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🏆 Ranking / Juara</a></li>
<li class="px-3 mt-6 mb-2 text-xs text-blue-300 uppercase font-bold tracking-wider">Pengaturan</li>
            <li><a href="#" onclick="renderBobotNilai()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">⚖️ Bobot Nilai</a></li>
            <li><a href="#" onclick="renderKonversiNilai()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🔄 Konversi Nilai</a></li>
`;
        }
        
        if (isGuru(u)) {
            const mapelList = parseMapelData(u.mapel);
            if (mapelList.length > 0) {
                menu.innerHTML += `<li class="px-3 mt-6 mb-2 text-xs text-blue-300 uppercase font-bold tracking-wider">Guru Mapel</li>`;
                mapelList.forEach((m, idx) => {
                    const collapseId = `sub-mapel-${idx}`;
                    const kelasLinks = m.kelas.length > 0 ? m.kelas.map(cls => 
                        `<li><a href="#" onclick="renderNilaiPage('${m.nama}', '${cls}')" class="block p-2 pl-8 hover:bg-blue-800 text-sm text-gray-200">${cls}</a></li>`
                    ).join('') : `<li><span class="text-xs text-gray-400 pl-8 block py-1">Belum ada kelas</span></li>`;
                    menu.innerHTML += `
                    <li class="mb-1">
                        <div onclick="document.getElementById('${collapseId}').classList.toggle('hidden')" class="flex justify-between items-center cursor-pointer p-2 rounded hover:bg-blue-700 text-sm font-semibold pl-4">
                            <span>📘 ${m.nama}</span><span class="text-xs">▼</span>
                        </div>
                        <ul id="${collapseId}" class="hidden mt-1 bg-blue-900 bg-opacity-40 rounded mb-2">${kelasLinks}</ul>
                    </li>`;
                });

                // Menu KONVERSI NILAI (isi sama seperti Guru Mapel)
                menu.innerHTML += `<li class="px-3 mt-6 mb-2 text-xs text-blue-300 uppercase font-bold tracking-wider">Konversi Nilai</li>`;
                mapelList.forEach((m, idx) => {
                    const collapseId = `sub-konv-${idx}`;
                    const kelasLinks = m.kelas.length > 0 ? m.kelas.map(cls =>
                        `<li><a href="#" onclick="renderKonversiMapelPage('${m.nama}', '${cls}')" class="block p-2 pl-8 hover:bg-blue-800 text-sm text-gray-200">${cls}</a></li>`
                    ).join('') : `<li><span class="text-xs text-gray-400 pl-8 block py-1">Belum ada kelas</span></li>`;
                    menu.innerHTML += `
                    <li class="mb-1">
                        <div onclick="document.getElementById('${collapseId}').classList.toggle('hidden')" class="flex justify-between items-center cursor-pointer p-2 rounded hover:bg-blue-700 text-sm font-semibold pl-4">
                            <span>🔄 ${m.nama}</span><span class="text-xs">▼</span>
                        </div>
                        <ul id="${collapseId}" class="hidden mt-1 bg-blue-900 bg-opacity-40 rounded mb-2">${kelasLinks}</ul>
                    </li>`;
                });

            }
        }

        if (u.musyrif) {
            menu.innerHTML += `
            <li class="px-3 mt-6 mb-2 text-xs text-blue-300 uppercase font-bold tracking-wider">Musyrif</li>
            <li><a href="#" onclick="renderMusyrifPage()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🕌 ${u.musyrif}</a></li>`;
        }

        if (isWali(u)) {
            const kelasWali = getWaliKelas(u);
            menu.innerHTML += `
            <li class="px-3 mt-6 mb-2 text-xs text-blue-300 uppercase font-bold tracking-wider">Wali Kelas</li>
            <li><a href="#" onclick="renderWaliPage('data')" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">📋 Data Kelas</a></li>
            <li><a href="#" onclick="renderWaliPage('absen')" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">📅 Absensi & Sikap</a></li>
            <li><a href="#" onclick="renderWaliPage('catatan')" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">📝 Catatan & Prestasi</a></li>
<li><a href="#" onclick="renderWaliPage('print')" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🖨️ Rapor & Legger</a></li>`;
        }
    }

        function renderDashboardContent() {
        const u = getCurrentUser();

        const isWaliRole = (typeof isWali === 'function') ? isWali(u) : !!(u && (u.kelas_wali || u.wali));

        // Admin dashboard: ringkasan statistik
        if (isAdmin(u)) {
            const totalGuru = users.length;
            const totalSantri = students.length;
            const totalWali = users.filter(x => (x.wali || x.kelas_wali || '').toString().trim() !== '').length;
            const totalMusyrif = users.filter(x => (x.musyrif || '').toString().trim() !== '').length;

            // hitung mapel unik
            const mapelSet = new Set();
            const { tahun_ajar, semester } = getActivePeriode();
            const _todosNilai = computeNilaiTodoEntries({ tahun_ajar, semester });
            const _adminTodoHtml = renderAdminTodoDashboardHTML(_todosNilai);
            const _adminAnalyticsHtml = renderAdminAnalyticsHTML({ tahun_ajar, semester });
            users.forEach(g => {
                const m = parseMapelData(g.mapel);
                m.forEach(x => { if (x?.nama) mapelSet.add(String(x.nama).toUpperCase().trim()); });
            });

            document.getElementById('main-content').innerHTML = `
            <div class="max-w-6xl mx-auto space-y-6">
                <div class="bg-white p-8 rounded-xl shadow border-l-8 border-blue-600">
                    <h2 class="text-3xl font-extrabold text-gray-800 mb-2">Selamat Datang, Administrator</h2>
                    <div class="flex flex-wrap gap-2 items-center">
                        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase">admin</span>
                        <span class="text-xs text-gray-500">Terakhir refresh: ${new Date().toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div class="bg-white p-5 rounded-xl shadow border">
                        <div class="text-sm text-gray-500 font-bold mb-1">Total Guru</div>
                        <div class="text-3xl font-extrabold text-gray-800">${totalGuru}</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow border">
                        <div class="text-sm text-gray-500 font-bold mb-1">Total Santri</div>
                        <div class="text-3xl font-extrabold text-gray-800">${totalSantri}</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow border">
                        <div class="text-sm text-gray-500 font-bold mb-1">Wali Kelas Aktif</div>
                        <div class="text-3xl font-extrabold text-gray-800">${totalWali}</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow border">
                        <div class="text-sm text-gray-500 font-bold mb-1">Musyrif Aktif</div>
                        <div class="text-3xl font-extrabold text-gray-800">${totalMusyrif}</div>
                    </div>
                    <div class="bg-white p-5 rounded-xl shadow border">
                        <div class="text-sm text-gray-500 font-bold mb-1">Mapel Unik</div>
                        <div class="text-3xl font-extrabold text-gray-800">${mapelSet.size}</div>
                    </div>
                </div>
${_adminAnalyticsHtml}

${_adminTodoHtml}



                
                <div class="bg-white p-6 rounded-xl shadow border">
                    <h3 class="text-lg font-bold text-gray-800 mb-2">Panduan Singkat Admin</h3>
                    <ol class="list-decimal pl-6 text-sm text-gray-700 space-y-1">
                        <li>Cek <b>Periode Aktif</b> (Tahun Ajar & Semester) di bagian atas.</li>
                        <li>Isi/cek <b>Database</b>: Guru, Santri, Legger (import/export tersedia).</li>
                        <li>Atur <b>Bobot</b> & <b>Konversi</b> sebelum input nilai berjalan jauh.</li>
                        <li>Pantau <b>Status Nilai</b> dan gunakan menu <b>Ranking</b> untuk Top 3.</li>
                        <li>Bangun/cetak <b>Rapor & Legger</b> setelah nilai mapel lengkap.</li>
                    </ol>
                    
                </div>
</div>`;
        // Load inbox pesan (guru)
        loadChatInboxInto('chat-inbox-guru');
            return;
        }

        // Guru dashboard (default)
        const { tahun_ajar, semester } = getActivePeriode();
        const mapelList = parseMapelData(u.mapel);
        const combos = [];
        mapelList.forEach(m => (m.kelas||[]).forEach(k => combos.push({ mapel: m.nama, kelas: k })));

        const kelasSet = new Set(combos.map(c => String(c.kelas)));
        const santriSet = new Set();

        let expected = 0;
        let filled = 0;

        combos.forEach(c => {
            const santriKelas = students.filter(s => String(s.kelas||'') === String(c.kelas));
            expected += santriKelas.length;
            santriKelas.forEach(s => santriSet.add(String(s.nis)));
            filled += _countDistinctScoresFor(c.mapel, c.kelas, tahun_ajar, semester);
        });

        const pct = expected ? Math.min(100, Math.round((filled/expected)*100)) : 0;
        const isMusyrifRole = !!(u.musyrif && String(u.musyrif).trim());

        const _comboProgress = computeGuruComboProgress(u, combos);
const _guruAnalyticsHtml = renderGuruAnalyticsHTML(u, combos);
        const _guruChatHtml = renderChatInboxCardHTML('guru');
        const _waliMissingHtml = (typeof isWali==='function' && isWali(u)) ? buildWaliMissingNilaiCardHTML(getWaliKelas(u), { tahun_ajar, semester }) : '';
        
        const _guruTodoHtml = '';
document.getElementById('main-content').innerHTML = `
        <div class="max-w-6xl mx-auto space-y-6">
            <div class="bg-white p-8 rounded-xl shadow border-l-8 border-blue-600">
                <h2 class="text-3xl font-extrabold text-gray-800 mb-2">Selamat Datang, ${u.name}</h2>
                <div class="flex flex-wrap gap-2 items-center">
                    ${(() => {
                    const badges = [];
                    badges.push('Guru');
                    if (u.musyrif) badges.push('Musyrif');
                    if (u.kelas_wali) badges.push('Wali Kelas');
                    return badges.map(b=>`<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase">${b}</span>`).join('');
                })()}
                    <span class="text-xs text-gray-500">Periode aktif: <b>${tahun_ajar}</b> / Semester <b>${semester}</b></span>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div class="bg-white p-5 rounded-xl shadow border">
                    <div class="text-sm text-gray-500 font-bold mb-1">Mapel Diampu</div>
                    <div class="text-3xl font-extrabold text-gray-800">${mapelList.length}</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow border">
                    <div class="text-sm text-gray-500 font-bold mb-1">Kelas Diampu</div>
                    <div class="text-3xl font-extrabold text-gray-800">${kelasSet.size}</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow border">
                    <div class="text-sm text-gray-500 font-bold mb-1">Santri Terjangkau</div>
                    <div class="text-3xl font-extrabold text-gray-800">${santriSet.size}</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow border">
                    <div class="text-sm text-gray-500 font-bold mb-1">Input Nilai (Terisi)</div>
                    <div class="text-3xl font-extrabold text-gray-800">${pct}%</div>
                    <div class="mt-2 h-2 bg-gray-200 rounded w-full">
                        <div class="h-2 bg-blue-600 rounded" style="width:${pct}%"></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">${filled} / ${expected} baris</div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow border">
                    <div class="text-sm text-gray-500 font-bold mb-1">Peran Tambahan</div>
                    <div class="text-base font-extrabold text-gray-800">
                        ${isWaliRole ? '✅ Wali Kelas' : '❎ Wali Kelas'}<br>
                        ${isMusyrifRole ? '✅ Musyrif' : '❎ Musyrif'}
                    </div>
                </div>
            </div>

            <div class="space-y-6">
</div>

            ${_guruAnalyticsHtml}

            ${_guruChatHtml}

            ${_waliMissingHtml}
<div class="bg-white p-6 rounded-xl shadow border">
                <h3 class="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><span class="text-xl">📘</span><span>Panduan Singkat Guru</span></h3>
                <ol class="list-decimal pl-6 text-sm text-gray-700 space-y-1">
                    <li>Pilih <b>Mapel → Kelas</b> dari sidebar.</li>
                    <li>Isi nilai, lalu klik <b>Simpan</b> (disimpan batch agar aman untuk data banyak).</li>
                    <li>Cek <b>Status Nilai</b> (jika tersedia) untuk memastikan mapel sudah terkirim.</li>
                    <li>Kalau Anda juga <b>Wali Kelas</b> atau <b>Musyrif</b>, menu tambahan akan muncul otomatis.</li>
                </ol>
                
            </div>

            </div>

        </div>`;
        loadChatInboxInto('chat-inbox-guru');
    }


// ===============================
// DASHBOARD: TO-DO NILAI (ADMIN) & QUICK CONTINUE (GURU)
// ===============================

function _normUpper(s){ return String(s||'').toUpperCase().trim(); }
function _normStr(s){ return String(s||'').trim(); }



// Safe encode for inline onclick attributes
function _encArg(v){ return encodeURIComponent(String(v ?? '')); }
function escapeHtml(str){
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// A score row is considered "filled" only if at least one component > 0.
function _isScoreFilled(sc){
    if (!sc) return false;
    const nums = [
        sc.kehadiran, sc.tugas,
        sc.uh1, sc.uh2, sc.uh3, sc.uh4, sc.uh5,
        sc.pas, sc.pas_pat, sc.paspat
    ];
    for (const v of nums){
        const n = Number(v) || 0;
        if (n > 0) return true;
    }
    return false;
}
function _countDistinctScoresFor(mapel, kelas, tahun_ajar, semester){
    const set = new Set();
    (scores || []).forEach(sc => {
        if (_normUpper(sc.mapel) !== _normUpper(mapel)) return;
        if (_normStr(sc.kelas) !== _normStr(kelas)) return;
        if (String(sc.tahun_ajar||'') !== String(tahun_ajar||'')) return;
        if (Number(sc.semester||0) !== Number(semester||0)) return;
        if (!_isScoreFilled(sc)) return;
        const nis = sc.nis ?? sc.nis_santri ?? sc.student_id ?? '';
        if (nis !== null && nis !== undefined && String(nis).trim() !== '') set.add(String(nis).trim());
    });
    return set.size;
}

function computeNilaiTodoEntries({ tahun_ajar, semester }){
    const todos = [];
    (users || []).forEach(g => {
        const mapelArr = parseMapelData(g.mapel);
        mapelArr.forEach(m => {
            const mapel = m?.nama;
            (m.kelas || []).forEach(kelas => {
                const siswa = (students || []).filter(s => _normStr(s.kelas) === _normStr(kelas));
                const expected = siswa.length;
                if (!expected) return;
                const filled = _countDistinctScoresFor(mapel, kelas, tahun_ajar, semester);
                const missing = Math.max(0, expected - filled);
                if (missing > 0) {
                    todos.push({
                        kelas: _normStr(kelas),
                        mapel: String(mapel || '').trim(),
                        guru: String(g.name || g.nama_guru || g.username || '-').trim(),
                        guru_id: g.id,
                        expected, filled, missing
                    });
                }
            });
        });
    });
    // sort: paling banyak yang belum masuk dulu
    todos.sort((a,b)=> (b.missing-a.missing) || a.kelas.localeCompare(b.kelas) || a.mapel.localeCompare(b.mapel));
    return todos;
}


// Rekap nilai mapel BELUM masuk khusus untuk wali kelas (ditampilkan di dashboard guru jika ia wali kelas)
function buildWaliMissingNilaiCardHTML(kelasWali, { tahun_ajar, semester }){
    try{
        const kelas = String(kelasWali||'').trim();
        if(!kelas) return '';
        const siswa = (students || []).filter(s => _normStr(s.kelas) === _normStr(kelas));
        const expected = siswa.length;
        if(!expected) return '';

        // build combos dari penugasan guru (mapel x kelas)
        const combos = [];
        (users || []).forEach(g => {
            const arr = parseMapelData(g.mapel);
            (arr || []).forEach(m => {
                const mapelRaw = String(m?.nama || '').trim();
                if(!mapelRaw) return;
                (m.kelas || []).forEach(k => {
                    if(_normStr(k) !== _normStr(kelas)) return;
                    combos.push({
                        mapel: _normUpper(mapelRaw),
                        mapelRaw,
                        guru: String(g.name || g.nama_guru || g.username || '-').trim(),
                        guru_id: g.id
                    });
                });
            });
        });

        // unique by mapel+guru_id
        const seen = new Set();
        const list = combos.filter(c=>{
            const key = `${c.mapel}||${c.guru_id||c.guru}`;
            if(seen.has(key)) return false;
            seen.add(key);
            return true;
        }).map(c=>{
            const filled = _countDistinctScoresFor(c.mapelRaw, kelas, tahun_ajar, semester);
            const missing = Math.max(0, expected - filled);
            return { ...c, filled, missing, expected };
        }).filter(r=> r.missing > 0);

        if(!list.length) return '';

        // sort: paling banyak belum masuk
        list.sort((a,b)=> (b.missing-a.missing) || a.mapel.localeCompare(b.mapel,'id') || String(a.guru||'').localeCompare(String(b.guru||''),'id'));

        const top = list.slice(0, 20); // biar tidak kepanjangan
        const rows = top.map((r, idx)=>{
            const toNameEnc = encodeURIComponent(r.guru || '');
            const mapelEnc = encodeURIComponent(r.mapelRaw || '');
            const kelasEnc = encodeURIComponent(kelas);
            return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-2 text-center text-xs text-gray-500">${idx+1}</td>
                <td class="p-2 text-left font-extrabold">${escapeHtml(r.mapel)}</td>
                <td class="p-2 text-left">${escapeHtml(r.guru||'-')}</td>
                <td class="p-2 text-center font-mono">${r.filled}/${r.expected}</td>
                <td class="p-2 text-center font-mono font-extrabold">${r.missing}</td>
                <td class="p-2 text-center">
                    <button class="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded font-bold text-xs shadow"
                        onclick="openChatCompose(${Number(r.guru_id)||0}, '${toNameEnc}', '${mapelEnc}', '${kelasEnc}')">Kirim Pesan</button>
                </td>
            </tr>`;
        }).join('');

        return `
        <div class="bg-white p-6 rounded-xl shadow border">
            <div class="flex items-center justify-between gap-2 mb-3">
                <div>
                    <h3 class="text-lg font-extrabold text-gray-800">📌 Nilai Mapel Belum Masuk (Kelas ${escapeHtml(kelas)})</h3>
                    <div class="text-xs text-gray-600">Menampilkan mapel yang masih belum lengkap untuk kelas wali Anda.</div>
                </div>
            </div>
            <div class="overflow-auto">
                <table class="min-w-[900px] w-full text-sm border std-table">
                    <thead class="bg-gray-800 text-white">
                        <tr>
                            <th class="p-2 w-12">No</th>
                            <th class="p-2 text-left">Mata Pelajaran</th>
                            <th class="p-2 text-left">Nama Guru</th>
                            <th class="p-2 w-28">Yang Sudah</th>
                            <th class="p-2 w-28">Yang Belum</th>
                            <th class="p-2 w-32">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    }catch(e){
        console.error(e);
        return '';
    }
}
function computeNilaiTodoEntriesForGuru(u, { tahun_ajar, semester }){
    const todos = [];
    const mapelArr = parseMapelData(u?.mapel);
    mapelArr.forEach(m => {
        const mapel = m?.nama;
        (m.kelas || []).forEach(kelas => {
            const siswa = (students || []).filter(s => _normStr(s.kelas) === _normStr(kelas));
            const expected = siswa.length;
            if (!expected) return;
            const filled = _countDistinctScoresFor(mapel, kelas, tahun_ajar, semester);
            const missing = Math.max(0, expected - filled);
            if (missing > 0){
                todos.push({
                    kelas: _normStr(kelas),
                    mapel: String(mapel || '').trim(),
                    guru: String(u?.name || u?.nama_guru || u?.username || '-').trim(),
                    expected, filled, missing
                });
            }
        });
    });
    todos.sort((a,b)=> (b.missing-a.missing) || a.mapel.localeCompare(b.mapel, 'id') || a.kelas.localeCompare(b.kelas, 'id'));
    return todos;
}

function renderGuruTodoDashboardHTML(todos){
    const { tahun_ajar, semester } = getActivePeriode();
    if (!todos || todos.length === 0){
        return `
        <div class="bg-white p-6 rounded-xl shadow border">
            <h3 class="text-lg font-bold text-gray-800 mb-1">To-do Nilai Mapel yang Belum Masuk</h3>
            <div class="text-sm text-gray-700">Periode <b>${tahun_ajar}</b> / Semester <b>${semester}</b> sudah lengkap untuk mapel yang Anda ampu.</div>
        </div>`;
    }

    // Top 10 mapel paling belum lengkap
    const topMapel = _aggTop(todos, 'mapel').slice(0, 10);
    const topSet = new Set(topMapel.map(([k,_]) => k));
    const rows = todos.filter(t => topSet.has(String(t.mapel||'').trim()));

    return `
        <div class="bg-white p-6 rounded-xl shadow border">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">To-do Nilai Mapel yang Belum Masuk</h3>
                    <div class="text-xs text-gray-500">Menampilkan 10 mapel paling belum lengkap (khusus mapel yang Anda ampu) • Periode <b>${tahun_ajar}</b> / Semester <b>${semester}</b></div>
                </div>
            </div>
            <div class="overflow-auto">
                <table class="min-w-[900px] w-full text-sm border std-table">
                    <thead class="bg-blue-600 text-white">
                        <tr>
                            <th class="p-2">No</th>
                            <th class="p-2 text-left">Mapel</th>
                            <th class="p-2">Kelas</th>
                            <th class="p-2">Terisi</th>
                            <th class="p-2">Belum</th>
                            <th class="p-2">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((t,i)=>`
                            <tr class="border-b hover:bg-gray-50">
                                <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
                                <td class="p-2 text-left font-extrabold">${t.mapel}</td>
                                <td class="p-2 text-center">${t.kelas}</td>
                                <td class="p-2 text-center font-mono">${t.filled}/${t.expected}</td>
                                <td class="p-2 text-center"><span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-extrabold">${t.missing}</span></td>
                                <td class="p-2 text-center">
                                    <button class="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded shadow text-xs font-bold"
                                        onclick="renderNilaiPage('${t.mapel.replace(/'/g,"\\'")}', '${t.kelas.replace(/'/g,"\\'")}')">Input Nilai</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}


function _aggTop(todos, key){
    const m = new Map();
    (todos || []).forEach(t => {
        const k = String(t[key] || '').trim();
        if (!k) return;
        m.set(k, (m.get(k)||0) + Number(t.missing||0));
    });
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
}


function renderAdminTodoDashboardHTML(todos){
    const { tahun_ajar, semester } = getActivePeriode();
    const list = (todos || []).filter(t => (t.missing || 0) > 0);

    if (!list.length){
        return `
        <div class="bg-white p-6 rounded-xl shadow border">
            <h3 class="text-lg font-extrabold text-blue-900">🧭 Nilai Mapel yang Belum Masuk</h3>
            <div class="text-sm text-gray-700">Periode <b>${tahun_ajar}</b> / Semester <b>${semester}</b> • Semua mapel sudah lengkap.</div>
        </div>`;
    }

    // Top 10 MAPEL paling belum lengkap (diakumulasikan dari semua kelas)
    const agg = {};
    list.forEach(t => {
        const k = String(t.mapel || '').trim();
        if (!k) return;
        agg[k] = (agg[k] || 0) + (t.missing || 0);
    });
    const topMapel = Object.entries(agg)
        .sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0], 'id'))
        .slice(0, 10)
        .map(x => x[0]);

    const topSet = new Set(topMapel);
    const rows = list
        .filter(t => topSet.has(String(t.mapel || '').trim()))
        .sort((a,b)=> (b.missing-a.missing) || String(a.mapel||'').localeCompare(String(b.mapel||''), 'id') || String(a.kelas||'').localeCompare(String(b.kelas||''), 'id'));

    const body = rows.map((t, i) => `
        <tr class="hover:bg-gray-50 border-b">
            <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
            <td class="p-2 text-left font-bold">${escapeHtml(t.mapel||'-')}</td>
            <td class="p-2 text-center font-mono">${escapeHtml(t.kelas||'-')}</td>
            <td class="p-2 text-left">${escapeHtml(t.guru||'-')}</td>
            <td class="p-2 text-center">
                <div class="flex flex-wrap gap-2 justify-center">
                    <button class="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 rounded shadow text-xs font-bold ${t.guru_id ? '' : 'opacity-50 cursor-not-allowed'}"
                        ${t.guru_id ? `onclick="event.stopPropagation(); openChatCompose(${t.guru_id}, '${_encArg(t.guru||'')}', '${_encArg(t.mapel||'')}', '${_encArg(t.kelas||'')}')"` : 'disabled'}>Kirim Pesan</button>
                </div>
            </td>
        </tr>
    `).join('');

    return `
    <div class="bg-white p-6 rounded-xl shadow border">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div>
                <h3 class="text-lg font-extrabold text-blue-900">🧭 Nilai Mapel yang Belum Masuk</h3>
                <div class="text-xs text-gray-600">Periode <b>${tahun_ajar}</b> / Semester <b>${semester}</b> • Menampilkan 10 mapel paling belum lengkap (mapel lengkap tidak ditampilkan).</div>
            </div>
        </div>
        <div class="overflow-auto">
            <table class="min-w-[980px] w-full text-sm border std-table">
                <thead class="bg-blue-600 text-white">
                    <tr>
                        <th class="p-2 w-12">No</th>
                        <th class="p-2 text-left">Mapel</th>
                        <th class="p-2 w-28">Kelas</th>
                        <th class="p-2 text-left">Guru</th>
                        <th class="p-2 w-28">Aksi</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>
        </div>
    </div>`;
}

function computeGuruComboProgress(u, combos){
    const { tahun_ajar, semester } = getActivePeriode();
    const list = [];
    (combos || []).forEach(c => {
        const mapel = c.mapel;
        const kelas = c.kelas;
        const siswa = (students || []).filter(s => _normStr(s.kelas) === _normStr(kelas));
        const expected = siswa.length;
        if (!expected) return;
        const filled = _countDistinctScoresFor(mapel, kelas, tahun_ajar, semester);
        const pct = expected ? Math.min(100, Math.round((filled/expected)*100)) : 0;
        list.push({ mapel, kelas, expected, filled, missing: Math.max(0, expected-filled), pct });
    });
    list.sort((a,b)=> (a.pct-b.pct) || (b.missing-a.missing) || a.mapel.localeCompare(b.mapel) || a.kelas.localeCompare(b.kelas));
    return list;
}

function renderGuruQuickContinueHTML(items){
    if (!items || items.length === 0){
        return `
        <div class="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
            <h3 class="text-lg font-extrabold text-yellow-900 mb-1">🚀 Lanjut Input Nilai</h3>
            <div class="text-sm text-yellow-900">Belum ada mapel-kelas yang terdeteksi untuk akun ini.</div>
        </div>`;
    }
    const top = items.slice(0, 8);
    const rows = top.map(it => `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg border hover:bg-gray-50 w-full">
            <div class="min-w-0 flex-1 w-full">
                <div class="font-extrabold text-gray-800 truncate" title="${it.mapel} • ${it.kelas}">${it.mapel} <span class="text-gray-400 font-black">•</span> ${it.kelas}</div>
                <div class="text-xs text-gray-600">${it.filled}/${it.expected} terisi • sisa <b>${it.missing}</b></div>
                <div class="mt-2 h-2 bg-gray-200 rounded w-full">
                    <div class="h-2 bg-blue-600 rounded" style="width:${it.pct}%"></div>
                </div>
            </div>
            <div class="flex gap-2 shrink-0">
                <button class="px-4 py-2 rounded bg-blue-600 text-white text-sm font-bold shadow"
                    onclick="renderNilaiPage(decodeURIComponent('${_encArg(it.mapel)}'), decodeURIComponent('${_encArg(it.kelas)}'))">Lanjut</button>
            </div>
        </div>
    `).join('');

    return `
    <div class="bg-white p-6 rounded-xl shadow border">
        <div class="flex items-center justify-between gap-3 mb-3">
            <h3 class="text-lg font-extrabold text-gray-800">🚀 Lanjut Input Nilai</h3>
            <div class="text-xs text-gray-500">Diprioritaskan yang paling belum lengkap</div>
        </div>
        <div class="space-y-2">${rows}</div>
    </div>`;
}

function renderAdminTodoPage(){
    const main = document.getElementById('main-content');
    const { tahun_ajar, semester } = getActivePeriode();
    const todos = computeNilaiTodoEntries({ tahun_ajar, semester });

    const rows = (todos || []).map((t,i)=>`
        <tr class="hover:bg-gray-50 border-b cursor-pointer"
            onclick="renderAdminNilaiMonitor(decodeURIComponent('${_encArg(t.mapel)}'), decodeURIComponent('${_encArg(t.kelas)}'), decodeURIComponent('${_encArg(t.guru)}'))">
            <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
            <td class="p-2 font-bold">${t.kelas}</td>
            <td class="p-2">${t.mapel}</td>
            <td class="p-2">${t.guru}</td>
            <td class="p-2 text-center font-mono text-sm">${t.filled}/${t.expected}</td>
            <td class="p-2 text-center"><span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-extrabold">${t.missing}</span></td>
            <td class="p-2 text-center">
                <button class="px-3 py-1 rounded bg-blue-700 text-white text-xs font-bold shadow"
                    onclick="event.stopPropagation(); renderNilaiPage(decodeURIComponent('${_encArg(t.mapel)}'), decodeURIComponent('${_encArg(t.kelas)}'))">Input Nilai</button>
            </td>
        </tr>
    `).join('');

    main.innerHTML = `
    <div class="bg-white p-6 rounded shadow">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
                <h2 class="text-2xl font-bold">🧭 To-do Nilai Mapel</h2>
                <div class="text-sm text-gray-600">Periode: <b>${tahun_ajar}</b> / Semester <b>${semester}</b> • klik baris untuk detail.</div>
            </div>
            <div class="flex gap-2 justify-end">
                <button onclick="renderDashboardContent()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold text-sm">Kembali</button>
            </div>
        </div>
        <input type="text" onkeyup="filterTable('tbody-todo-nilai')" placeholder="Cari (kelas/mapel/guru)..." class="w-full border p-2 mb-4 rounded">
        <div class="overflow-auto">
            <table class="min-w-[900px] w-full text-sm border std-table">
                <thead class="bg-blue-600 text-white sticky top-0">
                    <tr>
                        <th class="p-2 w-12">No</th>
                        <th class="p-2 text-left">Kelas</th>
                        <th class="p-2 text-left">Mapel</th>
                        <th class="p-2 text-left">Guru</th>
                        <th class="p-2 w-24">Terisi</th>
                        <th class="p-2 w-20">Sisa</th>
                        <th class="p-2 w-44">Aksi</th>
                    </tr>
                </thead>
                <tbody id="tbody-todo-nilai">${rows}</tbody>
            </table>
        </div>
    </div>`;
}


// ===============================
// DASHBOARD ANALYTICS (ADMIN/GURU)
// - Admin tahap 1: Heatmap kelengkapan nilai + Kelas "rawan telat"
// ===============================

function _kelasJenjangNum(kelas){
    const t = String(kelas||'').trim().split(/\s+/)[0] || '';
    const up = t.toUpperCase();
    if (up === 'X') return 10;
    if (up === 'XI') return 11;
    if (up === 'XII') return 12;
    const n = Number(t);
    if (n === 10) return 10;
    if (n === 11) return 11;
    if (n === 12) return 12;
    return 999;
}

function _sortKelasList(list){
    return (list||[]).slice().sort((a,b)=>{
        const na = _kelasJenjangNum(a);
        const nb = _kelasJenjangNum(b);
        if (na !== nb) return na-nb;
        return String(a).localeCompare(String(b), 'id', { numeric:true, sensitivity:'base' });
    });
}

function _heatBgFromPct(pct){
    const p = Math.max(0, Math.min(100, Number(pct)||0));
    const hue = Math.round(p * 1.2); // 0 merah → 120 hijau
    const light = 93 - Math.round(p * 0.18);
    return `hsl(${hue}, 75%, ${light}%)`;
}

function _buildScoreIndexForPeriode(tahun_ajar, semester){
    const idx = new Map(); // key -> Set(nis)
    (scores || []).forEach(sc => {
        if (String(sc.tahun_ajar||'') !== String(tahun_ajar||'')) return;
        if (Number(sc.semester||0) !== Number(semester||0)) return;
        if (!_isScoreFilled(sc)) return;
        const mapel = _normUpper(sc.mapel);
        const kelas = _normStr(sc.kelas);
        if (!mapel || !kelas) return;
        const nis = sc.nis ?? sc.nis_santri ?? sc.student_id ?? '';
        const nisStr = String(nis||'').trim();
        if (!nisStr) return;
        const key = `${mapel}||${kelas}`;
        let set = idx.get(key);
        if (!set){ set = new Set(); idx.set(key, set); }
        set.add(nisStr);
    });
    return idx;
}

function renderAdminAnalyticsHTML({ tahun_ajar, semester }){
    // Tahap 1: Heatmap dihapus sesuai permintaan
    const heatmapHtml = ``;

    // Tahap 2: Outlier detector
    const outlierHtml = buildAdminOutlierHTML({ tahun_ajar, semester });

    return `
        <div class="space-y-4">
            ${outlierHtml}
        </div>
    `;
}

// ===============================
// ADMIN DASHBOARD — Tahap 2
// - Distribusi nilai per Jenjang & Paralel (berdasarkan rata-rata legger)
// - Outlier detector mapel×kelas (berdasarkan nilai rapor per mapel)
// ===============================

function _statMean(arr){
    const a = (arr||[]).filter(v => Number.isFinite(v));
    if (!a.length) return 0;
    return a.reduce((x,y)=>x+y,0)/a.length;
}
function _statStd(arr){
    const a = (arr||[]).filter(v => Number.isFinite(v));
    if (a.length < 2) return 0;
    const m = _statMean(a);
    const v = a.reduce((s,x)=>s+Math.pow(x-m,2),0)/(a.length-1);
    return Math.sqrt(v);
}
function _fmtNum(n, d=2){
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    return (Math.round(v*Math.pow(10,d))/Math.pow(10,d)).toFixed(d);
}
function _histBins(vals, bins=10){
    const out = new Array(bins).fill(0);
    const a = (vals||[]).filter(v => Number.isFinite(v) && v >= 0);
    if (!a.length) return out;
    const min = 0, max = 100;
    const step = (max-min)/bins;
    a.forEach(v=>{
        let idx = Math.floor((v-min)/step);
        if (idx < 0) idx = 0;
        if (idx >= bins) idx = bins-1;
        out[idx] += 1;
    });
    return out;
}
function _sparkHist(vals){
    const bins = _histBins(vals, 10);
    const maxC = Math.max(1, ...bins);
    const bars = bins.map(c=>{
        const h = 6 + Math.round((c/maxC) * 18); // 6..24px
        const op = 0.25 + (c/maxC)*0.75;
        return `<div class="w-[8px] rounded-sm" style="height:${h}px;background:rgba(17,24,39,${op})" title="${c}"></div>`;
    }).join('');
    return `<div class="flex items-end gap-[2px] h-[26px]">${bars}</div>`;
}


// ===============================
// Ranking/Distribusi: helper legger untuk ranking (cache)
// ===============================
let _rankingCache = { key: '', rows: [], tahun_ajar: '', semester: 0 };


function _sortRankingRows(rows){
    const arr = Array.isArray(rows) ? rows.slice() : [];
    const num = (v)=> {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const str = (v)=> String(v||'').trim();
    arr.sort((a,b)=>{
        const ra = num(a.rata);
        const rb = num(b.rata);
        if (rb !== ra) return rb - ra;
        // tie-breaker: total/jumlah
        const ta = num(a.total ?? a.jumlah ?? a.sum ?? a.nilai_total);
        const tb = num(b.total ?? b.jumlah ?? b.sum ?? b.nilai_total);
        if (tb !== ta) return tb - ta;
        // tie-breaker: nama
        const na = str(a.nama || a.name);
        const nb = str(b.nama || b.name);
        const c = na.localeCompare(nb, 'id', { sensitivity: 'base' });
        if (c !== 0) return c;
        // tie-breaker: NIS
        return str(a.nis).localeCompare(str(b.nis), 'id', { sensitivity: 'base' });
    });
    return arr;
}
function _inferParalelFromKelas(kelas) {
    try {
        if (typeof _parseKelasParts === 'function') {
            const p = _parseKelasParts(kelas);
            if (p && p.paralel) return p.paralel;
        }
    } catch(e){}
    const tokens = String(kelas || '').trim().split(/\s+/).filter(Boolean);
    return tokens.length ? tokens[tokens.length - 1] : '';
}

function _getAllLeggerRowsForRanking() {
    const { tahun_ajar, semester } = getActivePeriode();
    const key = `${tahun_ajar}|${semester}|${(typeof bobotNilai !== 'undefined' && bobotNilai && JSON.stringify(bobotNilai)) ? 'b' : 'nb'}`;
    if (_rankingCache.key === key && Array.isArray(_rankingCache.rows)) {
        return { rows: _rankingCache.rows, tahun_ajar: _rankingCache.tahun_ajar, semester: _rankingCache.semester };
    }

    const kelasList = Array.from(new Set((students || []).map(s => String(s.kelas || '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

    const all = [];
    kelasList.forEach(kelas => {
        try {
            const d = buildLeggerDataForKelas(kelas);
            (d.rows || []).forEach(r => {
                all.push({
                    nis: r.nis,
                    nama: r.nama,
                    kelas: String(kelas || ''),
                    jenjang: (typeof _inferJenjangFromKelas === 'function' ? (_inferJenjangFromKelas(kelas) || '') : ''),
                    paralel: _inferParalelFromKelas(kelas) || '',
                    jurusan_key: (()=>{ const p=_parseKelasParts(kelas); const j=(p.jenjang||'').trim(); const jur=(p.jurusan||'').trim(); return (jur?`${j} ${jur}`.trim():j); })(),
                    rata: Number(r.rata || 0) || 0,
                    jumlah: Number(r.jumlah || 0) || 0
                });
            });
        } catch (e) {
            console.warn('Gagal build legger untuk kelas', kelas, e);
        }
    });

    _rankingCache = { key, rows: all, tahun_ajar, semester: Number(semester) || 0 };
    return { rows: all, tahun_ajar, semester: Number(semester) || 0 };
}

function buildAdminDistribusiHTML({ tahun_ajar, semester }){
    try {
        const rank = (typeof _getAllLeggerRowsForRanking === 'function') ? _getAllLeggerRowsForRanking() : { rows: [] };
        const base = (rank.rows || []).filter(r => Number(r.rata||0) > 0);

        const byJenjang = new Map();
        const byParalel = new Map();
        base.forEach(r=>{
            const j = String(r.jenjang||'').trim() || 'NA';
            const p = String(r.paralel||'').trim() || 'NA';
            if (!byJenjang.has(j)) byJenjang.set(j, []);
            if (!byParalel.has(p)) byParalel.set(p, []);
            byJenjang.get(j).push(Number(r.rata||0));
            byParalel.get(p).push(Number(r.rata||0));
        });

        const _rowsFor = (mp) => Array.from(mp.entries()).map(([k, vals])=>{
            const a = (vals||[]).filter(v=>Number.isFinite(v) && v>0);
            const mn = a.length ? Math.min(...a) : 0;
            const mx = a.length ? Math.max(...a) : 0;
            const me = a.length ? _statMean(a) : 0;
            return { key:k, n:a.length, min:mn, mean:me, max:mx, vals:a };
        }).sort((a,b)=> (b.mean-a.mean) || (b.n-a.n) || String(a.key).localeCompare(String(b.key), 'id', { sensitivity:'base' }));

        const jenRows = _rowsFor(byJenjang);
        const parRows = _rowsFor(byParalel).filter(x=>x.key!=='NA');

        const _tbl = (title, rows) => {
            if (!rows.length) return `
                <div class="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                    <div class="font-extrabold text-yellow-900">ℹ️ ${title}</div>
                    <div class="text-sm text-yellow-900">Belum ada data nilai rapor yang bisa dihitung (pastikan legger bisa dibangun).</div>
                </div>`;

            const body = rows.map((r,i)=>`
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
                    <td class="p-2 font-extrabold">${r.key}</td>
                    <td class="p-2 text-center font-mono">${r.n}</td>
                    <td class="p-2 text-center font-mono">${_fmtNum(r.min,2)}</td>
                    <td class="p-2 text-center font-extrabold">${_fmtNum(r.mean,2)}</td>
                    <td class="p-2 text-center font-mono">${_fmtNum(r.max,2)}</td>
                    <td class="p-2">${_sparkHist(r.vals)}</td>
                </tr>
            `).join('');

            return `
                <div class="bg-white p-6 rounded-xl shadow border">
                    <div class="mb-2">
                        <h3 class="text-lg font-extrabold text-gray-800">📊 ${title}</h3>
                        <div class="text-xs text-gray-500">Ringkasan min/mean/max dari <b>rata-rata rapor per santri</b> (mengikuti bobot & konversi jika aktif).</div>
                    </div>
                    <div class="overflow-auto">
                        <table class="min-w-[900px] w-full text-sm border std-table">
                            <thead class="bg-gray-800 text-white">
                                <tr>
                                    <th class="p-2 w-12">No</th>
                                    <th class="p-2 text-left">Grup</th>
                                    <th class="p-2 w-20">N</th>
                                    <th class="p-2 w-24">Min</th>
                                    <th class="p-2 w-24">Mean</th>
                                    <th class="p-2 w-24">Max</th>
                                    <th class="p-2 text-left">Histogram</th>
                                </tr>
                            </thead>
                            <tbody>${body}</tbody>
                        </table>
                    </div>
                </div>`;
        };

        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${_tbl('Distribusi Nilai per Jenjang', jenRows)}
                ${_tbl('Distribusi Nilai per Paralel/Jurusan', parRows)}
            </div>
        `;
    } catch (e) {
        console.warn('Gagal membangun distribusi nilai', e);
        return `
            <div class="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                <div class="font-extrabold text-yellow-900">ℹ️ Distribusi nilai belum bisa dihitung</div>
                <div class="text-sm text-yellow-900">Terjadi error saat menghitung distribusi. Coba refresh atau cek data legger.</div>
            </div>
        `;
    }
}

function buildAdminOutlierHTML({ tahun_ajar, semester }){
    try {
        const { tahun_ajar: ta, semester: sem } = getActivePeriode();

        // kumpulkan nilai rapor (raw) per mapel×kelas
        const mk = new Map(); // key -> { mapel, kelas, valsRaw:[] }
        (scores || []).forEach(sc=>{
            if (!sc) return;
            if (String(sc.tahun_ajar||'') !== String(ta||'')) return;
            if (Number(sc.semester||0) !== Number(sem||0)) return;
            const kelas = _normStr(sc.kelas);
            const mapel = _normUpper(sc.mapel);
            if (!kelas || !mapel) return;
            const v = Number(_calcNilaiRapor(sc, bobotNilai || null) || 0);
            if (!Number.isFinite(v) || v <= 0) return;
            const key = `${mapel}||${kelas}`;
            let o = mk.get(key);
            if (!o){ o = { mapel, kelas, valsRaw: [] }; mk.set(key, o); }
            o.valsRaw.push(v);
        });

        // ambil ideal sync agar konsisten dengan legger
        const getIdeal = (kelas) => {
            try {
                const jenjang = _inferJenjangFromKelas(kelas) || 'X';
                const m = window.konversiIdealMatrix;
                return m && typeof m.get === 'function' ? (m.get(`${jenjang}|${sem}`) || null) : null;
            } catch { return null; }
        };

        const combos = [];
        mk.forEach(o=>{
            const raw = (o.valsRaw||[]).filter(v=>Number.isFinite(v) && v>0);
            if (raw.length < 5) return; // minimal biar tidak noise
            const minAsli = Math.min(...raw);
            const maxAsli = Math.max(...raw);
            const meanAsli = _statMean(raw);
            const denom = (maxAsli - minAsli);

            const ideal = getIdeal(o.kelas);
            const minIdeal = Number(ideal?.min_ideal ?? 0) || 0;
            const maxIdeal = Number(ideal?.max_ideal ?? 100) || 100;
            const meanIdeal = Number(ideal?.mean_ideal ?? 0) || 0;
            const apply = !!ideal && (meanAsli < meanIdeal) && denom > 0;

            const vals = apply ? raw.map(v=>{
                let conv = meanIdeal + (v - meanAsli) * (maxIdeal - minIdeal) / denom;
                conv = _clamp(conv, minIdeal, maxIdeal);
                return Math.round(conv*100)/100;
            }) : raw.map(v=>Math.round(v*100)/100);

            combos.push({
                mapel:o.mapel, kelas:o.kelas, n:vals.length,
                min:Math.min(...vals), mean:_statMean(vals), max:Math.max(...vals),
                applyKonversi: apply
            });
        });

        // global per mapel (mean of class-means)
        const perMapel = new Map();
        combos.forEach(c=>{
            if (!perMapel.has(c.mapel)) perMapel.set(c.mapel, []);
            perMapel.get(c.mapel).push(c.mean);
        });
        const mapelStats = new Map();
        perMapel.forEach((means, mapel)=>{
            mapelStats.set(mapel, { gMean: _statMean(means), gStd: _statStd(means) });
        });

        const outliers = [];
        combos.forEach(c=>{
            const gs = mapelStats.get(c.mapel) || { gMean: 0, gStd: 0 };
            const gStd = Number(gs.gStd||0);
            const z = gStd > 0 ? ((c.mean - gs.gMean)/gStd) : 0;
            const absz = Math.abs(z);
            const flags = [];
            if (gStd > 0 && absz >= 2.0) flags.push(z < 0 ? 'Mean terlalu rendah' : 'Mean terlalu tinggi');
            if (gStd > 0 && c.min < (gs.gMean - 2.5*gStd)) flags.push('Min sangat rendah');
            if (gStd > 0 && c.max > (gs.gMean + 2.5*gStd)) flags.push('Max sangat tinggi');
            if ((c.max - c.min) >= 45) flags.push('Rentang terlalu lebar');
            if (flags.length) outliers.push({ ...c, z, absz, flags });
        });

        const top = outliers
            .sort((a,b)=> (b.absz-a.absz) || ((b.max-b.min)-(a.max-a.min)) || b.n-a.n)
            .slice(0, 25);

        if (!top.length){
            return ``;
        }

        const body = top.map((o,i)=>{
            const badge = o.applyKonversi ? `<span class="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-extrabold">Konversi</span>` : '';
            const flagHtml = o.flags.map(f=>`<span class="inline-flex items-center bg-red-100 text-red-800 px-2 py-1 rounded-full text-[10px] font-extrabold">${f}</span>`).join(' ');
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
                    <td class="p-2 font-extrabold">${o.mapel}${badge}</td>
                    <td class="p-2 font-extrabold">${o.kelas}</td>
                    <td class="p-2 text-center font-mono">${o.n}</td>
                    <td class="p-2 text-center font-mono">${_fmtNum(o.min,2)}</td>
                    <td class="p-2 text-center font-extrabold">${_fmtNum(o.mean,2)}</td>
                    <td class="p-2 text-center font-mono">${_fmtNum(o.max,2)}</td>
                    <td class="p-2 text-center font-mono">${_fmtNum(o.z,2)}</td>
                    <td class="p-2">${flagHtml}</td>
                    <td class="p-2 text-center">
                        <button class="px-3 py-1 rounded bg-gray-700 text-white text-xs font-bold shadow"
                            onclick="openAdminLeggerForKelas(decodeURIComponent('${_encArg(o.kelas)}'))">Legger</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-white p-6 rounded-xl shadow border">
                <div class="mb-2">
                    <h3 class="text-lg font-extrabold text-gray-800">🧪 Outlier Detector (Mapel × Kelas)</h3>
                    <div class="text-xs text-gray-500">Mendeteksi kombinasi mapel×kelas yang terlalu ekstrem dibanding kelas lain (berdasarkan <b>mean</b> antar kelas, z-score, serta min/max).</div>
                </div>
                <div class="overflow-auto">
                    <table class="min-w-[1100px] w-full text-sm border std-table">
                        <thead class="bg-gray-800 text-white">
                            <tr>
                                <th class="p-2 w-12">No</th>
                                <th class="p-2 text-left">Mapel</th>
                                <th class="p-2 text-left">Kelas</th>
                                <th class="p-2 w-16">N</th>
                                <th class="p-2 w-20">Min</th>
                                <th class="p-2 w-20">Mean</th>
                                <th class="p-2 w-20">Max</th>
                                <th class="p-2 w-20">Z</th>
                                <th class="p-2 text-left">Indikasi</th>
                                <th class="p-2 w-24">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>${body}</tbody>
                    
                    </table>


                <div class="text-xs text-gray-500 mt-2">Catatan: Z dihitung dari perbandingan <b>mean mapel</b> antar kelas. Kombinasi dengan data &lt; 5 santri terisi diabaikan agar tidak noise.</div>
            </div>
        `;
    } catch (e) {
        console.warn('Gagal membangun outlier detector', e);
        return `
            <div class="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                <div class="font-extrabold text-yellow-900">ℹ️ Outlier detector belum bisa dihitung</div>
                <div class="text-sm text-yellow-900">Terjadi error saat menghitung outlier. Coba refresh atau cek data nilai_mapel.</div>
            </div>
        `;
    }
}

// Guru analytics: Progress per kelas + ringkas UH vs PAS/PAT

// Guru analytics: Selisih UH(avg) vs PAS/PAT per mapel (diurutkan tertinggi→terendah)
function renderGuruAnalyticsHTML(u, combos){
    try {
        const { tahun_ajar, semester } = getActivePeriode();

        const comboList = (combos || []).map(c => ({
            mapel: String(c.mapel||'').trim(),
            kelas: String(c.kelas||'').trim()
        })).filter(c => c.mapel && c.kelas);

        if (!comboList.length) return '';

        // fast lookup
        const studentByNis = new Map((students || []).map(s => [String(s.nis||'').trim(), s]));
        const allow = new Set(comboList.map(c => `${_normUpper(c.mapel)}||${_normStr(c.kelas)}`));

        const byMapel = new Map(); // mapel -> rows
        const seen = new Set(); // avoid dup: mapel||kelas||nis

        (scores || []).forEach(sc => {
            if (!sc) return;
            if (String(sc.tahun_ajar||'') !== String(tahun_ajar||'')) return;
            if (Number(sc.semester||0) !== Number(semester||0)) return;

            const mapel = _normUpper(sc.mapel);
            const kelas = _normStr(sc.kelas);
            const key = `${mapel}||${kelas}`;
            if (!allow.has(key)) return;

            const nis = String(sc.nis ?? sc.nis_santri ?? sc.student_id ?? '').trim();
            if (!nis) return;

            const uniq = `${mapel}||${kelas}||${nis}`;
            if (seen.has(uniq)) return;
            seen.add(uniq);

            const uhAvg = Number(_avgUH(sc) || 0);
            const pas = Number(sc.pas_pat ?? sc.pas ?? sc.paspat ?? 0) || 0;

            // butuh dua-duanya agar delta bermakna
            if (uhAvg <= 0 || pas <= 0) return;

            const st = studentByNis.get(nis) || {};
            const nama = String(st.name || st.nama_santri || sc.nama_santri || '').trim() || '-';
            const jk = String(st.jk || st.lp || '').trim() || '-';
            const kls = String(st.kelas || kelas || '').trim() || kelas || '-';

            const delta = Math.round((pas - uhAvg) * 10) / 10;

            if (!byMapel.has(mapel)) byMapel.set(mapel, []);
            byMapel.get(mapel).push({
                nis, nama, jk, kelas: kls,
                uhAvg: Math.round(uhAvg*10)/10,
                pas: Math.round(pas*10)/10,
                delta
            });
        });

        const mapels = Array.from(byMapel.keys()).sort((a,b)=>a.localeCompare(b, 'id', { sensitivity:'base' }));
        if (!mapels.length){
            return `
                <div class="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                    <div class="font-extrabold text-yellow-900">ℹ️ Analisis delta UH vs PAS/PAT belum ada</div>
                    <div class="text-sm text-yellow-900">Pastikan ada nilai UH (minimal 1 UH terisi) dan PAS/PAT untuk periode aktif.</div>
                </div>
            `;
        }

        const badge = (d)=>{
            if (d >= 5) return `<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-extrabold">▲ +${d}</span>`;
            if (d <= -5) return `<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-extrabold">▼ ${d}</span>`;
            return `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-extrabold">${d > 0 ? '+'+d : d}</span>`;
        };

        const sections = mapels.map(mapel => {
            const rows = (byMapel.get(mapel) || []).slice();
            rows.sort((a,b)=> (b.delta - a.delta) || a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama, 'id', { sensitivity:'base' }));

            const body = rows.map((r,i)=>`
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
                    <td class="p-2 text-center font-mono">${r.nis}</td>
                    <td class="p-2 font-bold"><div class="single-line w-64" title="${r.nama}">${r.nama}</div></td>
                    <td class="p-2 text-center">${r.jk}</td>
                    <td class="p-2">${r.kelas}</td>
                    <td class="p-2 text-center font-mono">${r.uhAvg}</td>
                    <td class="p-2 text-center font-mono">${r.pas}</td>
                    <td class="p-2 text-center">${badge(r.delta)}</td>
                </tr>
            `).join('\n');

            return `
`;
        }).join('\n');

        return `<div class="space-y-4">${sections}</div>`;

    } catch (e) {
        console.warn('Gagal render Guru analytics', e);
        return `
            <div class="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                <div class="font-extrabold text-yellow-900">ℹ️ Statistik guru belum bisa dihitung</div>
                <div class="text-sm text-yellow-900">Terjadi error saat menghitung statistik. Coba refresh atau cek data nilai.</div>
            </div>
        `;
    }
}

function renderAdminNilaiMonitor(mapel, kelas, guru){
    const main = document.getElementById('main-content');
    const { tahun_ajar, semester } = getActivePeriode();
    const siswa = (students || []).filter(s => _normStr(s.kelas) === _normStr(kelas));
    const scoreByNis = new Map();
    (scores || []).forEach(sc => {
        if (_normUpper(sc.mapel) !== _normUpper(mapel)) return;
        if (_normStr(sc.kelas) !== _normStr(kelas)) return;
        if (String(sc.tahun_ajar||'') !== String(tahun_ajar||'')) return;
        if (Number(sc.semester||0) !== Number(semester||0)) return;
        const nis = String(sc.nis||'').trim();
        if (nis) scoreByNis.set(nis, sc);
    });

    const expected = siswa.length;
    const filled = scoreByNis.size;
    const missing = Math.max(0, expected - filled);

    const rows = siswa.map((s,i)=>{
        const has = scoreByNis.has(String(s.nis||'').trim());
        return `
        <tr class="border-b ${has ? 'hover:bg-gray-50' : 'bg-red-50 hover:bg-red-100'}">
            <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
            <td class="p-2 text-center font-mono">${s.nis||'-'}</td>
            <td class="p-2 font-bold filter-target"><div class="single-line w-64" title="${s.name||''}">${s.name||'-'}</div></td>
            <td class="p-2 text-center">${s.jk||s.lp||'-'}</td>
            <td class="p-2 text-center">${has ? '✅' : '—'}</td>
        </tr>`;
    }).join('');

    main.innerHTML = `
    <div class="bg-white p-6 rounded shadow">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
                <h2 class="text-2xl font-bold">🔎 Monitor Nilai: ${mapel} • ${kelas}</h2>
                <div class="text-sm text-gray-600">Guru: <b>${guru||'-'}</b> • Periode: <b>${tahun_ajar}</b> / Semester <b>${semester}</b></div>
            </div>
            <div class="flex flex-wrap gap-2 justify-end">
                <button onclick="renderAdminTodoPage()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold text-sm">Kembali</button>
                <button onclick="openAdminLeggerForKelas(decodeURIComponent('${_encArg(kelas)}'))" class="bg-gray-700 text-white px-4 py-2 rounded font-bold text-sm shadow">Legger</button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div class="p-4 rounded-xl border bg-blue-50">
                <div class="text-xs text-blue-900 font-bold mb-1">Target</div>
                <div class="text-2xl font-extrabold text-blue-900">${expected}</div>
            </div>
            <div class="p-4 rounded-xl border bg-green-50">
                <div class="text-xs text-green-900 font-bold mb-1">Terisi</div>
                <div class="text-2xl font-extrabold text-green-900">${filled}</div>
            </div>
            <div class="p-4 rounded-xl border bg-red-50">
                <div class="text-xs text-red-900 font-bold mb-1">Belum</div>
                <div class="text-2xl font-extrabold text-red-900">${missing}</div>
            </div>
        </div>

        <input type="text" onkeyup="filterTable('tbody-monitor-nilai')" placeholder="Cari santri..." class="w-full border p-2 mb-3 rounded">
        <div class="overflow-auto max-h-[70vh]">
            <table class="min-w-[700px] w-full text-sm border std-table whitespace-nowrap">
                <thead class="bg-blue-600 text-white sticky top-0">
                    <tr>
                        <th class="p-2 w-12">No</th>
                        <th class="p-2 w-24">NIS</th>
                        <th class="p-2 text-left">Nama</th>
                        <th class="p-2 w-16">JK</th>
                        <th class="p-2 w-20">Status</th>
                    </tr>
                </thead>
                <tbody id="tbody-monitor-nilai">${rows}</tbody>
            </table>
        </div>
        <div class="text-xs text-gray-500 mt-3">Baris merah = santri belum punya record nilai mapel (periode aktif). Ini biasanya berarti guru belum menekan <b>Simpan</b> untuk santri tersebut.</div>
    </div>`;
}

async function openAdminLeggerForKelas(kelas){
    await renderAdminLegger();
    const sel = document.getElementById('admin-legger-kelas');
    if (sel){
        sel.value = String(kelas||'');
        sel.dispatchEvent(new Event('change'));
    }
}


    // --- ADMIN: GURU (FIX: 1 Baris Nama, JK) --- (FIX: 1 Baris Nama, JK) ---
        function renderAdminGuru() {
        const main = document.getElementById('main-content');
        const sourceData = window.tempImportDataGuru || users;

        const rows = sourceData.map((u, i) => {
            const canEdit = !!u.id && !window.tempImportDataGuru;
            const waliVal = (u.wali || u.kelas_wali || '-');
            return `
            <tr class="hover:bg-gray-50 border-b">
                <td class="p-2 text-center">${i + 1}</td>
                <td class="p-2 text-left font-bold filter-target"><div class="single-line w-64" title="${u.name}">${u.name}</div></td>
                <td class="p-2 font-mono text-xs">${u.username}</td>
                <td class="p-2 text-center text-xs uppercase">${(u.role||'guru')}</td>
                <td class="p-2 text-center text-sm">${u.jk||u.lp||'-'}</td>
                <td class="p-2 text-left text-xs">${parseMapelData(u.mapel).map(m=>`<div class="mb-1"><span class="bg-blue-100 font-bold px-1 rounded mr-1">${m.nama}</span>: ${m.kelas.join(', ')}</div>`).join('')}</td>
                <td class="p-2 text-center">${waliVal}</td>
                <td class="p-2 text-center">${u.musyrif||'-'}</td>
                <td class="p-2 text-center">
                    <button ${canEdit ? `onclick="editGuru(${u.id})"` : 'disabled'} class="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1 rounded shadow">Edit</button>
                    <button ${canEdit ? `onclick="adminDeleteGuru(${u.id})"` : 'disabled class="opacity-50 cursor-not-allowed"'} class="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1 rounded shadow">Hapus</button>
                </td>
            </tr>`;
        }).join('');

        const headerBtn = `
        <div class="flex flex-wrap gap-2 justify-end">
            <button onclick="downloadExcelGuru()" class="bg-blue-700 text-white px-4 py-2 rounded font-bold shadow text-sm">Export</button>
            <button onclick="triggerImport('guru')" class="bg-green-700 text-white px-4 py-2 rounded font-bold shadow text-sm">Import</button>
            <button onclick="openModal('guru')" class="bg-gray-800 text-white px-4 py-2 rounded font-bold shadow text-sm">Tambah</button>
            <button onclick="saveAdminImport('guru')" class="bg-blue-900 text-white px-4 py-2 rounded font-bold shadow text-sm">Simpan</button>
        </div>
`;

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                <h2 class="text-2xl font-bold">👥 Data Guru</h2>
                ${headerBtn}
            </div>
            <input type="text" onkeyup="filterTable('tbody-guru')" placeholder="Cari Guru..." class="w-full border p-2 mb-4 rounded">
            <div class="overflow-auto">
                <table class="min-w-[1100px] w-full text-sm border std-table">
                    <thead class="bg-blue-600 text-white">
                        <tr>
                            <th>No</th><th class="text-left w-64">Nama</th><th>User</th><th>Role</th><th>JK</th>
                            <th class="text-left w-1/3">Mapel & Kelas</th><th>Wali</th><th>Musyrif</th><th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-guru">${rows}</tbody>
                </table>
            </div>
        </div>`;
    }


    // --- ADMIN: SANTRI (FIX: 1 Baris Nama, JK) ---
        function renderAdminSantri() {
        const main = document.getElementById('main-content');
        const sourceData = window.tempImportDataSantri || students;

        // --- FILTER OPSI (Jenjang / Kelas Unik / Paralel) ---
        const _parseKelasInfo = (kelasStr) => {
            const s = (kelasStr || '').toString().trim();
            if (!s) return { jenjang: '', kelas_unik: '', paralel: '' };
            const parts = s.split(/\s+/).filter(Boolean);
            const jenjang = parts[0] || '';
            const paralel = parts.length ? parts[parts.length - 1] : '';
            const kelas_unik = (parts.length >= 2) ? parts.slice(0, -1).join(' ') : jenjang;
            return { jenjang, kelas_unik, paralel };
        };
        const _kelasInfos = sourceData.map(s => _parseKelasInfo(s.kelas));
        window.__adminSantriKelasInfos = _kelasInfos;
        const _uniq = (arr) => Array.from(new Set(arr.map(x => (x||'').toString().trim()).filter(Boolean)));
        const _sortSmart = (arr) => arr.sort((a,b)=> String(a).localeCompare(String(b), 'id', { numeric: true }));
        const jenjangList = _sortSmart(_uniq(_kelasInfos.map(x=>x.jenjang)));
        const kelasUnikList = _sortSmart(_uniq(_kelasInfos.map(x=>x.kelas_unik)));
        const paralelList = _sortSmart(_uniq(_kelasInfos.map(x=>x.paralel)));
        const jenjangOptions = jenjangList.map(v=>`<option value="${v}">${v}</option>`).join('');
        const kelasUnikOptions = kelasUnikList.map(v=>`<option value="${v}">${v}</option>`).join('');
        const paralelOptions = paralelList.map(v=>`<option value="${v}">${v}</option>`).join('');


        // --- PAGING STATE + CACHE (untuk performa) ---
        window.__adminSantriSourceData = sourceData;
        window.__adminSantriIsTempImport = !!window.tempImportDataSantri;
        window.__adminSantriState = window.__adminSantriState || { page: 1, pageSize: 100 };
        const rows = ''; // di-render via applyAdminSantriFilters()

        const headerBtn = `
        <div class="flex flex-wrap gap-2 justify-end">
            <button onclick="downloadExcelSantri()" class="bg-blue-700 text-white px-4 py-2 rounded font-bold shadow text-sm">Export</button>
            <button onclick="triggerImport('santri')" class="bg-green-700 text-white px-4 py-2 rounded font-bold shadow text-sm">Import</button>
            <button onclick="openModal('santri')" class="bg-gray-800 text-white px-4 py-2 rounded font-bold shadow text-sm">Tambah</button>
            <button onclick="saveAdminImport('santri')" class="bg-blue-900 text-white px-4 py-2 rounded font-bold shadow text-sm">Simpan</button>
        </div>
`;

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                <h2 class="text-2xl font-bold">🎓 Data Santri</h2>
                ${headerBtn}
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-4">
            <input id="admin-santri-search" type="text" oninput="applyAdminSantriFilters()" placeholder="Cari Santri..." class="flex-1 min-w-[220px] border p-2 rounded">
            <select id="flt-jenjang" onchange="applyAdminSantriFilters()" class="border p-2 rounded text-sm">
              <option value="">Semua Jenjang</option>
              ${jenjangOptions}
            </select>
            <select id="flt-kelasunik" onchange="applyAdminSantriFilters()" class="border p-2 rounded text-sm min-w-[180px]">
              <option value="">Semua Kelas</option>
              ${kelasUnikOptions}
            </select>
            <select id="flt-paralel" onchange="applyAdminSantriFilters()" class="border p-2 rounded text-sm">
              <option value="">Semua Paralel</option>
              ${paralelOptions}
            </select>
            <select id="admin-santri-pagesize" onchange="adminSantriSetPageSize(this.value)" class="border p-2 rounded text-sm">
              <option value="50">50/hal</option>
              <option value="100">100/hal</option>
              <option value="200">200/hal</option>
            </select>
            <button id="admin-santri-prev" onclick="adminSantriPrevPage()" class="bg-gray-200 px-3 py-2 rounded text-sm font-bold">‹</button>
            <span id="admin-santri-pageinfo" class="text-sm text-gray-700 font-bold min-w-[110px] text-center">1/1</span>
            <button id="admin-santri-next" onclick="adminSantriNextPage()" class="bg-gray-200 px-3 py-2 rounded text-sm font-bold">›</button>

          </div>
            <div class="overflow-auto max-h-[70vh]">
                <table class="min-w-[1700px] w-full text-xs sm:text-sm border std-table whitespace-nowrap">
                    <thead class="bg-blue-600 text-white sticky top-0">
                        <tr>
                            <th>No</th><th>NIS</th><th class="text-left">Nama</th><th>L/P</th><th>Kelas</th>
                            <th class="text-left">TTL</th><th class="text-left">Status Keluarga</th><th>Anak Ke</th><th class="text-left">Asal Sekolah</th>
                            <th>Tgl Diterima</th><th>Diterima Kelas</th>
                            <th class="text-left">Nama Ayah</th><th class="text-left">Nama Ibu</th>
                            <th class="text-left">Pekerjaan Ayah</th><th class="text-left">Pekerjaan Ibu</th>
                            <th class="text-left">Alamat Ortu</th>
                            <th class="text-left">Nama Wali</th><th class="text-left">Pekerjaan Wali</th><th class="text-left">Alamat Wali</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-santri">${rows}</tbody>
                </table>
            </div>
        </div>`;

        // set default page size control
        try {
            const st = window.__adminSantriState || { page: 1, pageSize: 100 };
            const ps = document.getElementById('admin-santri-pagesize');
            if (ps) ps.value = String(st.pageSize || 100);
        } catch {}
        applyAdminSantriFilters(true);
    }


    // --- FITUR ADMIN ---
    async function renderBobotNilai() {
        try {
            setLoading(true, "Memuat Bobot Nilai...");
            const b = await fetchBobotNilaiGlobal();

            const vKeh = Number(b.bobot_kehadiran ?? b.kehadiran ?? 10) || 0;
            const vTgs = Number(b.bobot_tugas ?? b.tugas ?? 20) || 0;
            const vUH  = Number(b.bobot_uh ?? b.uh ?? 40) || 0;
            const vPAS = Number(b.bobot_paspat ?? b.bobot_pas_pat ?? b.pas_pat ?? b.pas ?? 30) || 0;

            const card = (title, id, val, color) => `
                <div class="border rounded-xl p-6 ${color} shadow-sm hover:shadow-md transition text-center">
                    <h4 class="font-bold text-gray-700 text-lg mb-2">${title}</h4>
                    <div class="flex justify-center items-end gap-1">
                        <input id="${id}" type="number" value="${val}" min="0" max="100"
                            class="text-4xl font-bold bg-transparent border-b-2 border-gray-400 focus:border-blue-600 w-24 text-center outline-none">
                        <span class="text-xl font-bold text-gray-500 mb-2">%</span>
                    </div>
                </div>`;

            document.getElementById('main-content').innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-lg border-t-4 border-yellow-500 max-w-5xl mx-auto">
                <h2 class="text-3xl font-bold mb-2 text-gray-800">⚖️ Pengaturan Bobot Nilai</h2>
                <p class="text-sm text-gray-600 mb-6">Komponen: <b>Kehadiran</b>, <b>Tugas</b>, <b>UH (rata-rata UH1..UH5)</b>, <b>PAS/PAT</b>. Total harus <b>100%</b>.</p>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    ${card('Kehadiran', 'bobot-kehadiran', vKeh, 'bg-red-50')}
                    ${card('Tugas', 'bobot-tugas', vTgs, 'bg-yellow-50')}
                    ${card('UH', 'bobot-uh', vUH, 'bg-green-50')}
                    ${card('PAS/PAT', 'bobot-pas', vPAS, 'bg-blue-50')}
                </div>

                <div class="mt-8 flex flex-wrap gap-2 justify-end">
                    
                    <button onclick="saveBobotNilaiUI()" class="bg-yellow-600 text-white px-8 py-3 rounded font-bold hover:bg-yellow-700">Simpan</button>
                </div>
            </div>`;
        } catch (e) {
            console.error(e);
            showToast('Gagal memuat bobot: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    async function saveBobotNilaiUI() {
        try {
            const bobot_kehadiran = Number(document.getElementById('bobot-kehadiran')?.value || 0);
            const bobot_tugas = Number(document.getElementById('bobot-tugas')?.value || 0);
            const bobot_uh = Number(document.getElementById('bobot-uh')?.value || 0);
            const bobot_paspat = Number(document.getElementById('bobot-pas')?.value || 0);

            setLoading(true, "Menyimpan Bobot Nilai...");
            await saveBobotNilaiGlobal({ bobot_kehadiran, bobot_tugas, bobot_uh, bobot_paspat });

            showToast('Bobot tersimpan', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal simpan bobot: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    async function renderKonversiNilai() {
        const cols = [
            { jenjang: 'X', semester: 1, label: 'X • Sem 1' },
            { jenjang: 'X', semester: 2, label: 'X • Sem 2' },
            { jenjang: 'XI', semester: 1, label: 'XI • Sem 1' },
            { jenjang: 'XI', semester: 2, label: 'XI • Sem 2' },
            { jenjang: 'XII', semester: 1, label: 'XII • Sem 1' },
            { jenjang: 'XII', semester: 2, label: 'XII • Sem 2' },
        ];

        try {
            setLoading(true, "Memuat Konversi Ideal...");
            const map = await fetchKonversiIdealMatrixGlobal();

            const getVal = (jenjang, semester, field, defVal) => {
                const r = map.get(`${jenjang}|${semester}`);
                if (!r) return defVal;
                return Number(r[field] ?? defVal) || defVal;
            };

            const makeRow = (label, field, defaults) => `
              <tr>
                <td class="p-2 border font-bold bg-gray-50 text-left">${label}</td>
                ${cols.map((c, idx) => `
                  <td class="border p-1">
                    <input type="number"
                      data-jenjang="${c.jenjang}"
                      data-semester="${c.semester}"
                      data-field="${field}"
                      value="${getVal(c.jenjang, c.semester, field, defaults[idx])}"
                      class="w-full text-center p-1 border rounded">
                  </td>
                `).join('')}
              </tr>
            `;

            // default sesuai yang kamu tetapkan (6 opsi/preset)
            const minDef = [76,77,78,79,80,81];
            const maxDef = [94,95,96,97,98,99];
            const meanDef = [81,82,83,84,85,86];

            document.getElementById('main-content').innerHTML = `
            <div class="bg-white p-6 rounded shadow">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-2xl font-bold">🔄 Konversi Nilai (Ideal)</h2>
                        <p class="text-sm text-gray-600">Ini adalah <b>nilai ideal</b> yang dipakai rumus katrol untuk menghasilkan <b>Nilai Konversi</b>.</p>
                    </div>
                    <div class="flex gap-2 justify-end">
                        
                        <button onclick="saveKonversiNilaiUI()" class="bg-blue-800 text-white px-6 py-2 rounded font-bold">Simpan</button>
                    </div>
                </div>

                <div class="overflow-x-auto">
                <table class="w-full border text-sm text-center std-table">
                    <thead class="bg-blue-600 text-white">
                        <tr><th rowspan="2" class="p-2 border">Ket</th><th colspan="2" class="border">Kelas X</th><th colspan="2" class="border">Kelas XI</th><th colspan="2" class="border">Kelas XII</th></tr>
                        <tr><th>Sem 1</th><th>Sem 2</th><th>Sem 1</th><th>Sem 2</th><th>Sem 1</th><th>Sem 2</th></tr>
                    </thead>
                    <tbody id="konv-ideal-body">
                        ${makeRow('Nilai Minimum (Min Ideal)', 'min_ideal', minDef)}
                        ${makeRow('Nilai Maksimum (Max Ideal)', 'max_ideal', maxDef)}
                        ${makeRow('Nilai Rata-rata (Rerata Ideal)', 'mean_ideal', meanDef)}
                    </tbody>
                
                    </table>


            </div>`;
        } catch (e) {
            console.error(e);
            showToast('Gagal memuat konversi: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    async function saveKonversiNilaiUI() {
        try {
            const inputs = Array.from(document.querySelectorAll('#konv-ideal-body input'));
            const rowsMap = new Map(); // key jenjang|semester -> row

            for (const inp of inputs) {
                const jenjang = inp.dataset.jenjang;
                const semester = Number(inp.dataset.semester);
                const field = inp.dataset.field;
                const val = Number(inp.value || 0);

                const key = `${jenjang}|${semester}`;
                if (!rowsMap.has(key)) rowsMap.set(key, { jenjang, semester, min_ideal: 0, max_ideal: 0, mean_ideal: 0 });
                rowsMap.get(key)[field] = val;
            }

            const rows = Array.from(rowsMap.values());
            // Validasi sederhana
            for (const r of rows) {
                if (r.min_ideal > r.mean_ideal || r.mean_ideal > r.max_ideal) {
                    throw new Error(`Range ideal tidak valid untuk ${r.jenjang} sem ${r.semester}`);
                }
            }

            setLoading(true, "Menyimpan Konversi Ideal...");
            await saveKonversiIdealGlobal(rows);

            // refresh cache matrix agar legger/ranking langsung pakai nilai ideal terbaru
            try {
                window.konversiIdealMatrix = await fetchKonversiIdealMatrixGlobal();
            } catch (e) {
                console.warn('Gagal refresh matriks konversi ideal', e);
            }

            showToast('Konversi ideal tersimpan', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal simpan konversi: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    // --- GURU MAPEL (NILAI) (FIX: Width Nama) ---
    function renderNilaiPage(mapel, kelas) {
        const siswa = students.filter(s => s.kelas === kelas);
        const main = document.getElementById('main-content');
        if(siswa.length === 0) { main.innerHTML = `<div class="p-6 bg-white shadow rounded">Data santri kosong untuk kelas ${kelas}</div>`; return; }

        const rows = siswa.map((s, i) => {
            const { tahun_ajar, semester } = getActivePeriode();
            const sc = scores.find(x => String(x.nis) === String(s.nis) && x.mapel === mapel && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
            return `
            <tr class="hover:bg-gray-50 border-b">
                <td class="p-2 text-center text-gray-500">${i+1}</td>
                <td class="p-2 text-center text-sm font-mono">${s.nis||'-'}</td>
                <td class="p-2 font-medium text-left filter-target"><div class="single-line" title="${s.name}" data-name="${s.name}">${s.name}</div></td>
                <td class="p-2 text-center">${s.jk||s.lp||'-'}</td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="kehadiran" value="${sc.kehadiran||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="tugas" value="${sc.tugas||0}" class="bg-yellow-50 nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh1" value="${sc.uh1||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh2" value="${sc.uh2||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh3" value="${sc.uh3||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh4" value="${sc.uh4||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh5" value="${sc.uh5||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="pas_pat" value="${sc.pas_pat||sc.pas||0}" class="bg-blue-50 nav-input"></td>
            </tr>`;
        }).join('');

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex justify-between items-center mb-4">
                <div><h2 class="text-2xl font-bold">${mapel} - ${kelas}</h2></div>
                <div class="flex gap-2">
                    <button onclick="exportExcelNilai('${mapel}', '${kelas}')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold shadow">Export</button>
                    <button onclick="triggerImport('mapel', '${mapel}', '${kelas}')" class="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold shadow">Import</button>
                    <button onclick="saveNilaiMapel('${mapel}', '${kelas}')" class="bg-blue-800 text-white px-6 py-2 rounded font-bold shadow">Simpan</button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm border std-table" id="table-nilai">
                    <thead class="bg-blue-600 text-white">
                        <tr>
                            <th class="p-2">No</th><th class="p-2">NIS</th><th class="p-2 text-left w-64">Nama</th><th class="p-2 w-14">L/P</th>
                            <th class="p-2 w-14">Hadir</th><th class="p-2 w-14 bg-yellow-600 text-white">Tugas</th><th class="p-2 w-14">UH1</th><th class="p-2 w-14">UH2</th><th class="p-2 w-14">UH3</th><th class="p-2 w-14">UH4</th><th class="p-2 w-14">UH5</th><th class="p-2 w-20 bg-blue-800 text-white">PAS/PAT</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-nilai">${rows}</tbody>
                </table>
            </div>
        </div>`;
        enableArrowNavigation('table-nilai');
        attachInputIndicators('table-nilai', { max100: true, excludeFields: new Set([]) });
    }

    // --- GURU MAPEL: KONVERSI NILAI ---
    function _inferJenjangFromKelas(kelas) {
        const t = (kelas || '').trim().split(/\s+/)[0] || '';
        const up = t.toUpperCase();
        if (up === 'X' || up === 'XI' || up === 'XII') return up;
        // fallback kalau format numeric (10/11/12)
        if (t === '10') return 'X';
        if (t === '11') return 'XI';
        if (t === '12') return 'XII';
        return null;
    }

    function _avgUH(sc) {
        const vals = [sc.uh1, sc.uh2, sc.uh3, sc.uh4, sc.uh5].map(v => Number(v) || 0).filter(v => v > 0);
        if (!vals.length) return 0;
        return vals.reduce((a,b)=>a+b,0) / vals.length;
    }

    function _calcNilaiRapor(sc, bobot) {
        const keh = Number(sc.kehadiran) || 0;
        const tgs = Number(sc.tugas) || 0;
        const uhAvg = _avgUH(sc);
        const pas = Number(sc.pas ?? sc.pas_pat ?? sc.pas_pat) || 0;

        const bKeh = Number(bobot?.bobot_kehadiran ?? 10) || 0;
        const bTgs = Number(bobot?.bobot_tugas ?? 20) || 0;
        const bUH  = Number(bobot?.bobot_uh ?? 40) || 0;
        const bPAS = Number(bobot?.bobot_paspat ?? bobot?.bobot_pas_pat ?? 30) || 0;

        const total = (keh * bKeh + tgs * bTgs + uhAvg * bUH + pas * bPAS) / 100;
        // pembulatan 2 desimal biar enak dibaca
        return Math.round(total * 100) / 100;
    }

    function _clamp(v, min, max) {
        if (v < min) return min;
        if (v > max) return max;
        return v;
    }

    // cache hasil terakhir agar bisa diexport
    window._lastKonversiRows = [];

    async function renderKonversiMapelPage(mapel, kelas) {
        const main = document.getElementById('main-content');
        const siswa = students.filter(s => s.kelas === kelas);

        if (siswa.length === 0) {
            main.innerHTML = `<div class="p-6 bg-white shadow rounded">Data santri kosong untuk kelas ${kelas}</div>`;
            return;
        }

        try {
            setLoading(true, "Menghitung Konversi Nilai...");
            await fetchAppConfig();
            const bobot = await fetchBobotNilaiGlobal();

            const { tahun_ajar, semester } = getActivePeriode();
            const jenjang = _inferJenjangFromKelas(kelas) || 'X';
            const ideal = await fetchKonversiIdeal(jenjang, semester, tahun_ajar);

            if (!ideal) {
                showToast(`Konversi ideal belum di-set untuk ${jenjang} sem ${semester}. Set dulu di Admin > Konversi Nilai.`, 'error');
            }

            const minIdeal = Number(ideal?.min_ideal ?? 0) || 0;
            const maxIdeal = Number(ideal?.max_ideal ?? 100) || 100;
            const meanIdeal = Number(ideal?.mean_ideal ?? 0) || 0;

            // hitung nilai rapor per santri
            const data = siswa.map(s => {
                const sc = scores.find(x =>
                    String(x.nis) === String(s.nis) &&
                    String(x.mapel) === String(mapel) &&
                    String(x.tahun_ajar) === String(tahun_ajar) &&
                    Number(x.semester) === Number(semester)
                ) || {};
                const nilaiRapor = _calcNilaiRapor(sc, bobot);
                return {
                    nis: s.nis,
                    nama: s.name,
                    jk: s.jk || s.lp || '-',
                    nilai_rapor: nilaiRapor,
                };
            });

            // statistik asli (min/max/mean) — hanya dari santri yang sudah terisi nilai (bukan 0 semua)
            const valid = data
                .map(d => d.nilai_rapor)
                .filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);

            const minAsli = valid.length ? Math.min(...valid) : 0;
            const maxAsli = valid.length ? Math.max(...valid) : 0;
            const meanAsli = valid.length ? (valid.reduce((a,b)=>a+b,0) / valid.length) : 0;

            // hitung konversi per santri
            const denom = (maxAsli - minAsli);
            const applyKonversi = (valid.length > 0) && (meanAsli < meanIdeal) && (denom > 0);

            data.forEach(d => {
                // jika rerata asli >= rerata ideal, konversi tidak berlaku (nilai konversi = nilai asli)
                if (!applyKonversi) {
                    const v = Number(d.nilai_rapor) || 0;
                    d.nilai_konversi = Math.round(v * 100) / 100;
                    return;
                }

                let conv = meanIdeal + (d.nilai_rapor - meanAsli) * (maxIdeal - minIdeal) / denom;
                conv = _clamp(conv, minIdeal, maxIdeal);
                d.nilai_konversi = Math.round(conv * 100) / 100;
            });
window._lastKonversiRows = data;

            const rowsHtml = data.map((d, i) => `
              <tr class="hover:bg-gray-50 border-b">
                <td class="p-2 text-center text-gray-500">${i+1}</td>
                <td class="p-2 text-center font-mono">${d.nis||'-'}</td>
                <td class="p-2 text-left font-medium filter-target"><div class="single-line" title="${d.nama||''}">${d.nama||'-'}</div></td>
                <td class="p-2 text-center">${d.jk||'-'}</td>
                <td class="p-2 text-center font-bold">${d.nilai_rapor ?? '-'}</td>
                <td class="p-2 text-center font-bold">${d.nilai_konversi ?? '-'}</td>
              </tr>
            `).join('');

            main.innerHTML = `
            <div class="bg-white p-6 rounded shadow">
                <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                    <div>
                        <h2 class="text-2xl font-bold">🔄 Konversi Nilai • ${mapel} • ${kelas}</h2>
                        <div class="text-xs text-gray-600 mt-1">
                            Periode: <b>${tahun_ajar}</b> • Semester: <b>${semester}</b> • Jenjang: <b>${jenjang}</b>
                        </div>
                        <div class="mt-2 flex flex-wrap gap-2 text-xs">
                            <span class="px-3 py-1 rounded-full bg-gray-100">Asli: min <b>${minAsli.toFixed(2)}</b> • max <b>${maxAsli.toFixed(2)}</b> • mean <b>${meanAsli.toFixed(2)}</b></span>
                            <span class="px-3 py-1 rounded-full bg-blue-50">Ideal: min <b>${minIdeal}</b> • max <b>${maxIdeal}</b> • mean <b>${meanIdeal}</b></span>
                        </div>
                    </div>
                    <div class="flex gap-2 justify-end">
                        
                        <button onclick="exportExcelKonversi('${mapel}','${kelas}')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold shadow">Export</button>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm border std-table" id="table-konversi">
                        <thead class="bg-blue-600 text-white">
                            <tr>
                                <th class="p-2">No</th>
                                <th class="p-2">NIS</th>
                                <th class="p-2 text-left w-64">Nama</th>
                                <th class="p-2">L/P</th>
                                <th class="p-2">Nilai Rapot</th>
                                <th class="p-2">Nilai Konversi</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    
                    </table>


            </div>`;
        } catch (e) {
            console.error(e);
            showToast('Gagal menghitung konversi: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    // FIX: fungsi dipanggil dari atribut onclick (butuh scope global)
    window.renderKonversiMapelPage = renderKonversiMapelPage;

    function exportExcelKonversi(mapel, kelas) {
        try {
            const rows = (window._lastKonversiRows || []).map((r, idx) => ({
                No: idx + 1,
                NIS: r.nis,
                Nama: r.nama,
                "L/P": r.jk,
                "Nilai Rapot": r.nilai_rapor,
                "Nilai Konversi": r.nilai_konversi,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Konversi Nilai');
            const { tahun_ajar, semester } = getActivePeriode();
            XLSX.writeFile(wb, `Konversi_${mapel}_${kelas}_${tahun_ajar}_S${semester}.xlsx`);
        } catch (e) {
            console.error(e);
            showToast('Gagal export: ' + (e.message || e), 'error');
        }
    }
    async function saveNilaiMapel(mapel, kelas) {
        setLoading(true, "Menyimpan Nilai (Batch)...");
        try {
            const { tahun_ajar, semester } = getActivePeriode();
            const inputs = Array.from(document.querySelectorAll('#tbody-nilai input'));
            const rowsMap = new Map();
            const numFields = new Set(['kehadiran','tugas','uh1','uh2','uh3','uh4','uh5','pas_pat']);

            for (const inp of inputs) {
                const nis = String(inp.dataset.nis || '').trim();
                const nama = String(inp.dataset.name || '').trim();
                if (!nis) continue;
                if (!rowsMap.has(nis)) {
                    rowsMap.set(nis, {
                        nis,
                        mapel: String(mapel),
                        kelas: String(kelas || ''),
                        nama_santri: nama,
                        tahun_ajar: String(tahun_ajar || ''),
                        semester: Number(semester) || 1,
                        kehadiran: 0,
                        tugas: 0,
                        uh1: 0, uh2: 0, uh3: 0, uh4: 0, uh5: 0,
                        pas_pat: 0,
                    });
                }
                const r = rowsMap.get(nis);
                const f = inp.dataset.field;
                if (!f) continue;
                if (numFields.has(f)) r[f] = (inp.value === '' ? 0 : Number(inp.value) || 0);
            }

            const rows = Array.from(rowsMap.values());
            if (!rows.length) throw new Error('Tidak ada data untuk disimpan.');

            await window.upsertNilaiMapelBatch(rows, {
                batchSize: 200,
                onProgress: (pct, lbl) => setLoadingProgress(pct, `Menyimpan ${lbl}`)
            });

            setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
            renderNilaiPage(mapel, kelas);
            markTableSaved('table-nilai');
            showToast('Nilai Tersimpan!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal simpan nilai: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }


    function _sikapSelectHTML(id, nis, field, value) {
        const vRaw = (value === undefined || value === null) ? '' : String(value);
        const v = vRaw.trim().toUpperCase();
        const sel = (x) => (v === x ? 'selected' : '');
        return `<select data-id="${id}" data-nis="${nis||''}" data-field="${field}" class="bg-blue-50 border rounded px-2 py-1 w-20 nav-input">
            <option value=""></option>
            <option value="A" ${sel('A')}>A</option>
            <option value="B" ${sel('B')}>B</option>
            <option value="C" ${sel('C')}>C</option>
            <option value="D" ${sel('D')}>D</option>
        </select>`;
    }

    // --- WALI KELAS (FIX: Width Nama) ---
    function renderWaliPage(mode) {
        const u = getCurrentUser();
        const kelas = getWaliKelas(u);
        if (!kelas) { document.getElementById('main-content').innerHTML = `<div class="p-10 text-center text-red-500 font-bold">Bukan Wali Kelas.</div>`; return; }
        const siswa = students.filter(s => s.kelas === kelas);
        const main = document.getElementById('main-content');
        
        const headerBtn = `<div class="flex gap-2 flex-wrap justify-end">
            ${(mode!=='print' && mode!=='rekap') ? `<button onclick="exportExcelWali('${mode}', '${kelas}')" class="bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-bold">Export</button>` : ''}
            ${mode!=='print' && mode!=='data' && mode!=='rekap' ? `<button onclick="triggerImport('${mode}', '${kelas}')" class="bg-green-600 text-white px-4 py-2 rounded shadow text-sm font-bold">Import</button>` : ''}
            ${(mode==='absen' || mode==='catatan') ? `<button onclick="saveWaliDataLocal('${mode}')" class="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm font-bold">Simpan</button>` : ''}
            ${mode==='data' ? `
                <button onclick="saveWaliDataLocal('${mode}')" class="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm font-bold">Simpan</button>` : ''}
            ${mode==='print' ? `` : ''}
        </div>`;

let content = '';
        
        if (mode === 'data') {
            const list = siswa; // hanya kelas wali
            const rows = list.map((s, i) => {
                const canEdit = !!s.id;
                return `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-2 text-center">${i + 1}</td>
                    <td class="p-2 text-center font-mono">${s.nis||'-'}</td>
                    <td class="p-2 text-left font-bold filter-target"><div class="single-line w-64" title="${s.name||''}">${s.name||'-'}</div></td>
                    <td class="p-2 text-center">${s.jk||s.lp||'-'}</td>
                    <td class="p-2 text-center">${s.kelas||'-'}</td>
                    <td class="p-2 text-left"><div class="single-line w-56" title="${s.ttl||''}">${s.ttl||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-40" title="${s.status_keluarga||''}">${s.status_keluarga||'-'}</div></td>
                    <td class="p-2 text-center">${(s.anak_ke ?? '-') }</td>
                    <td class="p-2 text-left"><div class="single-line w-56" title="${s.asal_sekolah||''}">${s.asal_sekolah||'-'}</div></td>
                    <td class="p-2 text-center">${s.tanggal_diterima||'-'}</td>
                    <td class="p-2 text-center">${s.diterima_kelas||'-'}</td>
                    <td class="p-2 text-left"><div class="single-line w-44" title="${s.nama_ayah||''}">${s.nama_ayah||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-44" title="${s.nama_ibu||''}">${s.nama_ibu||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-44" title="${s.pekerjaan_ayah||''}">${s.pekerjaan_ayah||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-44" title="${s.pekerjaan_ibu||''}">${s.pekerjaan_ibu||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-72" title="${s.alamat_ortu||''}">${s.alamat_ortu||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-44" title="${s.nama_wali||''}">${s.nama_wali||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-44" title="${s.pekerjaan_wali||''}">${s.pekerjaan_wali||'-'}</div></td>
                    <td class="p-2 text-left"><div class="single-line w-72" title="${s.alamat_wali||''}">${s.alamat_wali||'-'}</div></td>
                    <td class="p-2 text-center">
                        <button ${canEdit ? `onclick="editSantri(${s.id})"` : 'disabled'} class="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1 rounded shadow">Edit</button>
                    </td>
                </tr>`;
            }).join('');

            content = `
                            <div class="bg-white rounded-xl shadow p-6">
                
                <div class="overflow-auto max-h-[70vh]">
                  <table class="min-w-[1700px] w-full text-xs sm:text-sm border std-table whitespace-nowrap">
                    <thead class="bg-blue-600 text-white sticky top-0">
                      <tr>
                        <th>No</th><th>NIS</th><th class="text-left">Nama</th><th>L/P</th><th>Kelas</th>
                        <th class="text-left">TTL</th><th class="text-left">Status Keluarga</th><th>Anak Ke</th><th class="text-left">Asal Sekolah</th>
                        <th>Tgl Diterima</th><th>Diterima Kelas</th>
                        <th class="text-left">Nama Ayah</th><th class="text-left">Nama Ibu</th>
                        <th class="text-left">Pekerjaan Ayah</th><th class="text-left">Pekerjaan Ibu</th>
                        <th class="text-left">Alamat Ortu</th>
                        <th class="text-left">Nama Wali</th><th class="text-left">Pekerjaan Wali</th><th class="text-left">Alamat Wali</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody id="tbody-wali-data">${rows}</tbody>
                  
                    </table>


              </div>`;
        } 

        else if (mode === 'absen') {
            const rows = siswa.map((s, i) => {
                const { tahun_ajar, semester } = getActivePeriode();
                const sc = waliScores.find(x => String(x.nis)===String(s.nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                return `
                <tr class="hover:bg-gray-50 border-b tr-item">
                    <td class="p-2 text-center">${i+1}</td>
                    <td class="p-2 text-center font-mono">${s.nis||'-'}</td>
                    <td class="p-2 font-medium text-left filter-target"><div class="single-line" title="${s.name}" data-name="${s.name}">${s.name}</div></td>
                    <td class="p-2 text-center">${s.jk||s.lp||'-'}</td>
                    <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hadir_s" value="${sc.hadir_s||0}" class="nav-input"></td>
                    <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hadir_i" value="${sc.hadir_i||0}" class="nav-input"></td>
                    <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hadir_a" value="${sc.hadir_a||0}" class="nav-input"></td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'akhlak', sc.akhlak)}</td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'kerajinan', sc.kerajinan)}</td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'kebersihan', sc.kebersihan)}</td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'kedisiplinan', sc.kedisiplinan)}</td>
                </tr>`;
            }).join('');
            content = `<table class="w-full text-sm border std-table" id="table-absen"><thead class="bg-blue-600 text-white"><tr><th rowspan="2">No</th><th rowspan="2">NIS</th><th rowspan="2" class="text-left w-64">Nama</th><th rowspan="2">L/P</th><th colspan="3">Absensi</th><th colspan="4">Sikap (A/B/C/D)</th></tr><tr><th>S</th><th>I</th><th>A</th><th>Akhlak</th><th>Kerajinan</th><th>Bersih</th><th>Disiplin</th></tr></thead><tbody id="tbody-wali">${rows}</tbody></table>`;
        } 
        else if (mode === 'catatan') {
            const rows = siswa.map((s, i) => {
                const { tahun_ajar, semester } = getActivePeriode();
                const sc = waliScores.find(x => String(x.nis)===String(s.nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                return `
                <tr class="hover:bg-gray-50 border-b tr-item">
                    <td class="p-2 text-center">${i+1}</td>
                    <td class="p-2 text-center font-mono">${s.nis||'-'}</td>
                    <td class="p-2 font-medium text-left filter-target"><div class="single-line" title="${s.name}" data-name="${s.name}">${s.name}</div></td>
                    <td class="p-2 text-center">${s.jk||s.lp||'-'}</td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="catatan" class="h-16 nav-input">${sc.catatan||'-'}</textarea></td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="prestasi1" class="h-16 nav-input">${sc.prestasi1||'-'}</textarea></td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="prestasi2" class="h-16 nav-input">${sc.prestasi2||'-'}</textarea></td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="prestasi3" class="h-16 nav-input">${sc.prestasi3||'-'}</textarea></td>
                </tr>`;
            }).join('');
            content = `<table class="w-full text-sm border std-table" id="table-catatan"><thead class="bg-blue-600 text-white"><tr><th>No</th><th>NIS</th><th class="text-left w-64">Nama</th><th>L/P</th><th>Catatan</th><th>Prestasi 1</th><th>Prestasi 2</th><th>Prestasi 3</th></tr></thead><tbody id="tbody-wali">${rows}</tbody></table>`;
        }
        else if (mode === 'rekap') {
            const { tahun_ajar, semester } = getActivePeriode();
            const expected = siswa.length;

            // Build expected combos from guru assignments (mapel × guru) for this class
            const combos = [];
            (users || []).forEach(g => {
                const arr = parseMapelData(g.mapel);
                (arr || []).forEach(m => {
                    const mapel = String(m?.nama || '').trim();
                    if (!mapel) return;
                    (m.kelas || []).forEach(k => {
                        if (_normStr(k) !== _normStr(kelas)) return;
                        combos.push({
                            mapel: _normUpper(mapel),
                            mapelRaw: mapel,
                            guru: String(g.name || g.nama_guru || g.username || '-').trim()
                        });
                    });
                });
            });

            // Unique by mapel+guru
            const seen = new Set();
            const list = combos.filter(c => {
                const key = `${c.mapel}||${c.guru}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).sort((a,b)=> a.mapel.localeCompare(b.mapel, 'id', { sensitivity:'base' }) || a.guru.localeCompare(b.guru, 'id', { sensitivity:'base' }));

            const rows = list.map((c, i) => {
                const filled = _countDistinctScoresFor(c.mapelRaw, kelas, tahun_ajar, semester);
                const missing = Math.max(0, expected - filled);
                const pct = expected ? Math.round((filled/expected)*100) : 0;

                const statusBadge = (filled === 0)
                    ? `<span class="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-extrabold">Belum Masuk</span>`
                    : (missing === 0
                        ? `<span class="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-extrabold">Lengkap</span>`
                        : `<span class="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-extrabold">Sebagian</span>`
                      );

                const barBg = _heatBgFromPct(pct);
                return `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
                        <td class="p-2 font-extrabold">${c.mapel}</td>
                        <td class="p-2">${c.guru || '-'}</td>
                        <td class="p-2 text-center">${statusBadge}</td>
                        <td class="p-2 text-center font-mono">${filled}/${expected}</td>
                        <td class="p-2">
                            <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden border">
                                <div class="h-3" style="width:${pct}%;background:${barBg}"></div>
                            </div>
                        </td>
</tr>
                `;
            }).join('');

            const empty = (!list.length) ? `
                <div class="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                    <div class="font-extrabold text-yellow-900">ℹ️ Belum ada data mapel untuk kelas ini</div>
                    <div class="text-sm text-yellow-900">Pastikan data <b>Guru → Mapel yang diampu</b> sudah diisi untuk kelas <b>${kelas}</b>.</div>
                </div>
            ` : `
                <div class="bg-white rounded-xl shadow p-6">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                        <div>
                            <h3 class="text-lg font-extrabold text-gray-800">Rekap Nilai Mapel</h3>
                            <div class="text-xs text-gray-500">Periode <b>${tahun_ajar}</b> / Semester <b>${semester}</b> • Kelas <b>${kelas}</b></div>
                        </div>
                    </div>
                    <div class="overflow-auto">
                        <table class="min-w-[900px] w-full text-sm border std-table">
                            <thead class="bg-gray-800 text-white">
                                <tr>
                                    <th class="p-2 w-12">No</th>
                                    <th class="p-2 text-left">Mapel</th>
                                    <th class="p-2 text-left">Guru Mapel</th>
                                    <th class="p-2 w-28">Status</th>
                                    <th class="p-2 w-28">Terisi</th>
                                    <th class="p-2 text-left">Progress</th>
                                    <th class="p-2 w-20">Sisa</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;

            content = empty;
        }

        else if (mode === 'print') {
            content = `
              <div class="bg-white rounded-xl shadow p-6 border">
                <div class="font-extrabold text-gray-800 mb-1">Print Rapor per Santri</div>
                <div class="text-sm text-gray-600 mb-4">Gunakan tombol print (ikon printer) pada kolom <b>Print</b> untuk mencetak rapor masing-masing santri.</div>
                ${renderLeggerTableHTML(kelas, 'table-legger-wali', 'Legger - ' + kelas)}
              </div>
            `;
        }
main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold capitalize">${(() => { const m = String(mode||""); const kelasTitle = kelas; if(m==="data") return `${kelasTitle} | Data Santri`; if(m==="absen") return `${kelasTitle} | Absensi & Sikap`; if(m==="catatan") return `${kelasTitle} | Catatan & Prestasi`; if(m==="rekap") return `${kelasTitle} | Rekap Nilai Mapel`; if(m==="print") return `${kelasTitle} | Rapor dan Legger`; return `${kelasTitle}`; })()}</h2>
                ${headerBtn}
            </div>
            ${content}
        </div>`;
        if(mode==='absen') { enableArrowNavigation('table-absen'); attachInputIndicators('table-absen', { max100: true }); }
        if(mode==='catatan') { enableArrowNavigation('table-catatan'); attachInputIndicators('table-catatan', { max100: false }); }
    }

    async function refreshWaliDataKelas() {
        try {
            setLoading(true, "Memuat ulang data...");
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
            renderWaliPage('data');
        } catch (e) {
            console.error(e);
            showToast('Gagal refresh: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    async function saveWaliDataLocal(mode) {
        // mode: 'absen' atau 'catatan'
        setLoading(true, "Menyimpan Data Wali (Batch)...");
        try {
            const { tahun_ajar, semester } = getActivePeriode();

            // hanya ambil input yang ada di tabel saat ini
            const inputs = Array.from(document.querySelectorAll('#tbody-wali input, #tbody-wali textarea, #tbody-wali select'));

            // field sets
            const numeric = new Set(['hadir_s','hadir_i','hadir_a']); // S/I/A = angka
            const sikapFields = new Set(['akhlak','kerajinan','kebersihan','kedisiplinan']); // Sikap = A/B/C/D (TEXT)
            const textFields = new Set(['catatan','prestasi1','prestasi2','prestasi3']);

            const allowed = new Set();
            if (mode === 'absen') {
                [...numeric, ...sikapFields].forEach(x => allowed.add(x));
            } else if (mode === 'catatan') {
                [...textFields].forEach(x => allowed.add(x));
            }

            const rowsMap = new Map();

            for (const inp of inputs) {
                const nis = String(inp.dataset.nis || '').trim();
                const sid = Number(inp.dataset.id) || null;
                const f = String(inp.dataset.field || '').trim();
                if (!nis || !f) continue;
                if (allowed.size && !allowed.has(f)) continue;

                const s = students.find(x => String(x.nis) === String(nis)) || {};
                if (!rowsMap.has(nis)) {
                    rowsMap.set(nis, {
                        student_id: sid || s.id || null,
                        nis: String(nis),
                        kelas: String(getWaliKelas(getCurrentUser()) || s.kelas || ''),
                        nama_santri: String(s.nama_santri || s.name || ''),
                        tahun_ajar: String(tahun_ajar),
                        semester: Number(semester)
                    });
                }
                const r = rowsMap.get(nis);

                if (numeric.has(f)) {
                    r[f] = (inp.value === '' ? 0 : Number(inp.value) || 0);
                } else if (sikapFields.has(f)) {
                    const v = String(inp.value || '').trim().toUpperCase();
                    r[f] = (['A','B','C','D'].includes(v) ? v : (v ? v[0] : '-'));
                } else if (textFields.has(f)) {
                    r[f] = (String(inp.value || '').trim() || '-');
                }
            }

            const rows = Array.from(rowsMap.values()).filter(r => r.nis);

            if (!rows.length) throw new Error('Tidak ada data untuk disimpan.');

            // validasi student_id untuk insert baru
            const missingId = rows.filter(r => !r.student_id);
            if (missingId.length) {
                console.warn('Ada santri tanpa student_id (id santri). Pastikan data santri sudah termuat.', missingId.slice(0, 3));
            }

            await window.upsertNilaiWaliBatch(rows, {
                batchSize: 200,
                onProgress: (pct, lbl) => setLoadingProgress(pct, `Menyimpan ${lbl}`)
            });

            setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
            showToast('Data Tersimpan!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal simpan wali: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    
    async function saveWaliKelasDataLocal() {
        setLoading(true, "Menyimpan Data Kelas (Batch)...");
        try {
            const u = getCurrentUser();
            const kelas = getWaliKelas(u);
            if (!kelas) throw new Error('Bukan Wali Kelas.');
            const rows = Array.isArray(window.tempWaliDataSantri) ? window.tempWaliDataSantri : [];
            if (!rows.length) throw new Error('Tidak ada data import untuk disimpan.');

            // paksa kelas = kelas wali untuk semua baris
            const payload = rows.map(r => ({
                id: null,
                nis: (typeof _toNIS === 'function' ? _toNIS(r.nis) : r.nis),
                name: r.name || r.nama_santri,
                jk: r.jk || r.lp || '',
                ttl: r.ttl || '',
                kelas: kelas
            })).filter(x => x.nis && x.name);

            if (!payload.length) throw new Error('Data import kosong / tidak valid.');

            await upsertSantriBatchByNIS(payload, {
                batchSize: 200,
                onProgress: (pct, lbl) => setLoadingProgress(pct, `Menyimpan ${lbl}`)
            });

            window.tempWaliDataSantri = null;
            setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
            renderWaliPage('data');
            showToast('Data kelas tersimpan!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal simpan data kelas: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }
    window.saveWaliKelasDataLocal = saveWaliKelasDataLocal;

// --- MUSYRIF PAGE (FIX: Width Nama) --- (FIX: Width Nama) ---
    function renderMusyrifPage() {
        const u = getCurrentUser();
        const kelas = u.musyrif || '';
        const main = document.getElementById('main-content');
        if (!kelas) { 
            main.innerHTML = `<div class=\"p-10 text-red-500 text-center font-bold\">Bukan Musyrif</div>`;
            return; 
        }

        const siswa = students.filter(s => s.kelas === kelas);
        const rows = siswa.map((s, i) => {
            const sc = musyrifScores.find(x => x.student_id === s.id) || {};
            return `
            <tr class=\"hover:bg-gray-50 border-b\">
                <td class=\"p-2 text-center\">${i+1}</td>
                <td class=\"p-2 text-center font-mono\">${s.nis||'-'}</td>
                <td class=\"p-2 text-left font-bold filter-target\"><div class=\"single-line\" title=\"${s.name}\" data-name=\"${s.name}\">${s.name}</div></td>
                <td class=\"p-2 text-center\">${s.jk||s.lp||'-'}</td>
                <td class=\"p-2\"><input type=\"number\" data-id=\"${s.id}\" data-nis=\"${s.nis||''}\" data-field=\"hafalan_wajib\" value=\"${sc.hafalan_wajib||0}\" class=\"nav-input\"></td>
                <td class=\"p-2\"><input type=\"number\" data-id=\"${s.id}\" data-nis=\"${s.nis||''}\" data-field=\"hafalan_murojaah\" value=\"${sc.hafalan_murojaah||0}\" class=\"nav-input\"></td>
                <td class=\"p-2\"><input type=\"number\" data-id=\"${s.id}\" data-nis=\"${s.nis||''}\" data-field=\"ziyadah\" value=\"${sc.ziyadah||0}\" class=\"nav-input\"></td>
                <td class=\"p-2\"><input type=\"number\" data-id=\"${s.id}\" data-nis=\"${s.nis||''}\" data-field=\"fashohah\" value=\"${sc.fashohah||0}\" class=\"bg-blue-50 nav-input\"></td>
            </tr>`;
        }).join('');

        main.innerHTML = `
        <div class=\"bg-white p-6 rounded shadow\">
            <div class=\"flex justify-between items-center mb-4\">
                <h2 class=\"text-2xl font-bold\">Musyrif Kelas ${kelas}</h2>
                <div class=\"flex gap-2\">
                    <button onclick=\"exportExcelMusyrif('${kelas}')\" class=\"bg-blue-600 text-white px-4 py-2 rounded font-bold shadow text-sm\">Export</button>
                    <button onclick=\"triggerImport('musyrif', '${kelas}')\" class=\"bg-green-600 text-white px-4 py-2 rounded font-bold shadow text-sm\">Import</button>
                    <button onclick=\"saveMusyrifData()\" class=\"bg-purple-600 text-white px-4 py-2 rounded font-bold shadow text-sm\">Simpan</button>
                </div>
            </div>
            <table class=\"w-full text-sm border std-table\" id=\"table-musyrif\">
                <thead class=\"bg-purple-600 text-white\">
                    <tr><th>No</th><th>NIS</th><th class=\"text-left w-64\">Nama</th><th>L/P</th><th>Wajib</th><th>Murojaah</th><th>Ziyadah</th><th>Fashohah</th></tr>
                </thead>
                <tbody id=\"tbody-musyrif\">${rows}</tbody>
            </table>
        </div>`;
        enableArrowNavigation('table-musyrif');
        attachInputIndicators('table-musyrif', { max100: false });
    }


    async function saveMusyrifData() {
        setLoading(true, "Menyimpan Hafalan (Batch)...");
        try {
            const { tahun_ajar, semester } = getActivePeriode();
            const inputs = Array.from(document.querySelectorAll('#tbody-musyrif input'));
            const rowsMap = new Map();
            const numFields = new Set(['hafalan_wajib','hafalan_murojaah','ziyadah','fashohah']);

            for (const inp of inputs) {
                const nis = String(inp.dataset.nis || '').trim();
                const sid = Number(inp.dataset.id) || null;
                if (!nis) continue;
                const s = students.find(x => String(x.nis) === String(nis)) || {};
                if (!rowsMap.has(nis)) {
                    rowsMap.set(nis, {
                        student_id: sid || s.id || null,
                        nis,
                        kelas: String(s.kelas || ''),
                        nama_santri: String(s.name || ''),
                        tahun_ajar: String(tahun_ajar || ''),
                        semester: Number(semester) || 1,
                        hafalan_wajib: 0,
                        hafalan_murojaah: 0,
                        ziyadah: 0,
                        fashohah: 0,
                    });
                }
                const r = rowsMap.get(nis);
                const f = inp.dataset.field;
                if (!f) continue;
                if (numFields.has(f)) r[f] = (inp.value === '' ? 0 : Number(inp.value) || 0);
            }

            const rows = Array.from(rowsMap.values());
            if (!rows.length) throw new Error('Tidak ada data untuk disimpan.');

            await window.upsertNilaiMusyrifBatch(rows, {
                batchSize: 200,
                onProgress: (pct, lbl) => setLoadingProgress(pct, `Menyimpan ${lbl}`)
            });

            setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
            renderMusyrifPage();
            markTableSaved('table-musyrif');
            showToast('Tersimpan!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal simpan musyrif: ' + (e.message || e), 'error');
        } finally {
            setLoading(false);
        }
    }

    
    // --- LEGGER (ADMIN & WALI) ---
    function _upper(s){ return String(s||'').trim().toUpperCase(); }

    function getMapelListForKelas(kelas){
        const k = String(kelas||'').trim();
        const set = new Set();

        // 1) dari data guru (mapel + kelas)
        (users||[]).forEach(g => {
            const md = parseMapelData(g.mapel);
            md.forEach(m => {
                const kelasArr = Array.isArray(m.kelas) ? m.kelas : [];
                if (kelasArr.some(x => String(x).trim() === k)) set.add(_upper(m.nama));
            });
        });

        // 2) fallback dari nilai_mapel yang sudah tersimpan
        if (set.size === 0) {
            (scores||[]).forEach(r => {
                if (String(r.kelas||'').trim() === k && r.mapel) set.add(_upper(r.mapel));
            });
        }

        return Array.from(set).sort((a,b)=>a.localeCompare(b));
    }

    function avgUH(row){
        const vals = [row?.uh1,row?.uh2,row?.uh3,row?.uh4,row?.uh5]
            .map(v => Number(v)||0)
            .filter(v => v > 0);
        if (!vals.length) return 0;
        return vals.reduce((a,b)=>a+b,0) / vals.length;
    }

    function calcNilaiRapor(row){
        // rapor = bobot% * komponen / 100
        if (!row) return 0;
        const b = bobotNilai || {};
        const wKeh = Number(b.bobot_kehadiran ?? b.kehadiran ?? 10) || 0;
        const wTgs = Number(b.bobot_tugas ?? b.tugas ?? 20) || 0;
        const wUH  = Number(b.bobot_uh ?? b.uh ?? 40) || 0;
        const wPAS = Number(b.bobot_paspat ?? b.bobot_pas_pat ?? b.pas_pat ?? b.pas ?? 30) || 0;

        const keh = Number(row.kehadiran)||0;
        const tgs = Number(row.tugas)||0;
        const uh  = avgUH(row);
        const pas = Number(row.pas_pat ?? row.pas_pat ?? row.pas_pat ?? row.pas_pat ?? row.pas_pat) || Number(row.pas_pat) || 0;

        const val = (keh*wKeh + tgs*wTgs + uh*wUH + pas*wPAS) / 100;
        return isFinite(val) ? val : 0;
    }

    function _getIdealSync(jenjang, semester){
        try {
            const m = window.konversiIdealMatrix;
            if (m && typeof m.get === 'function') return m.get(`${jenjang}|${semester}`) || null;
        } catch {}
        return null;
    }

    function buildLeggerDataForKelas(kelas){
        const { tahun_ajar, semester } = getActivePeriode();
        const mapels = getMapelListForKelas(kelas).map(_upper);
        const kelasKey = String(kelas||'').trim();
        const siswa = students.filter(s => String(s.kelas||'').trim() === kelasKey);

        // index nilai_mapel agar tidak .find berulang (lebih cepat untuk data besar)
        const idx = new Map();
        (scores||[]).forEach(r => {
            if (!r) return;
            if (String(r.kelas||'').trim() !== kelasKey) return;
            if (String(r.tahun_ajar||'') !== String(tahun_ajar||'')) return;
            if (Number(r.semester||0) !== Number(semester||0)) return;
            const key = `${String(r.nis||'')}|${_upper(r.mapel)}`;
            idx.set(key, r);
        });

        // 1) hitung nilai rapor (raw) dulu untuk semua mapel & santri
        const rowsRaw = siswa.map((s, idxNo) => {
            const raw = {};
            mapels.forEach(m => {
                const sc = idx.get(`${String(s.nis||'')}|${m}`);
                const rap = calcNilaiRapor(sc);
                raw[m] = rap > 0 ? Math.round(rap * 100) / 100 : 0;
            });
            return {
                no: idxNo + 1,
                nis: String(s.nis||''),
                nama: String(s.name||s.nama_santri||''),
                jk: String(s.jk||s.lp||''),
                mapel_raw: raw,
                mapel: {},
                jumlah: 0,
                rata: 0,
                ranking: 0,
            };
        });

        // 2) konversi per mapel (katrol) jika ideal tersedia & meanAsli < meanIdeal
        const jenjang = _inferJenjangFromKelas(kelasKey) || 'X';
        const ideal = _getIdealSync(jenjang, semester);
        const minIdeal = Number(ideal?.min_ideal ?? 0) || 0;
        const maxIdeal = Number(ideal?.max_ideal ?? 100) || 100;
        const meanIdeal = Number(ideal?.mean_ideal ?? 0) || 0;

        let anyKonversi = false;

        mapels.forEach(m => {
            const vals = rowsRaw.map(r => Number(r.mapel_raw[m]||0)).filter(v => Number.isFinite(v) && v > 0);
            const minAsli = vals.length ? Math.min(...vals) : 0;
            const maxAsli = vals.length ? Math.max(...vals) : 0;
            const meanAsli = vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length) : 0;
            const denom = (maxAsli - minAsli);
            const apply = !!ideal && vals.length > 0 && (meanAsli < meanIdeal) && (denom > 0);
            if (apply) anyKonversi = true;

            rowsRaw.forEach(r => {
                const v = Number(r.mapel_raw[m]||0);
                if (!v) { r.mapel[m] = 0; return; }
                if (!apply) { r.mapel[m] = Math.round(v * 100) / 100; return; }
                let conv = meanIdeal + (v - meanAsli) * (maxIdeal - minIdeal) / denom;
                conv = _clamp(conv, minIdeal, maxIdeal);
                r.mapel[m] = Math.round(conv * 100) / 100;
            });
        });

        // 3) hitung jumlah & rata-rata (pakai nilai setelah konversi bila berlaku)
        rowsRaw.forEach(r => {
            let sum = 0;
            mapels.forEach(m => { sum += Number(r.mapel[m]||0); });
            const rata = mapels.length ? (sum / mapels.length) : 0;
            r.jumlah = Math.round(sum * 100) / 100;
            r.rata = Math.round(rata * 100) / 100;
        });

        // ranking per kelas (rata-rata desc)
        const sorted = [...rowsRaw].sort((a,b) => (b.rata||0) - (a.rata||0) || a.nama.localeCompare(b.nama));
        sorted.forEach((r,i) => { r.ranking = i + 1; });
        const rankMap = new Map(sorted.map(r => [r.nis, r.ranking]));
        rowsRaw.forEach(r => r.ranking = rankMap.get(r.nis) || 0);

        return { mapels, rows: rowsRaw, tahun_ajar, semester, konversi_applied: anyKonversi, jenjang };
    }

    function renderLeggerTableHTML(kelas, tableId, scopeLabel){
        const { mapels, rows, tahun_ajar, semester, konversi_applied, jenjang } = buildLeggerDataForKelas(kelas);

        const headMapel = mapels.map(m => `<th class="p-2 border">${m}</th>`).join('');

        const body = rows.map((r) => {
            const tds = mapels.map(m => {
                const v = Number(r.mapel[m]||0);
                return `<td class="p-2 border text-center">${v ? v : '-'}</td>`;
            }).join('');

            return `
            <tr class="hover:bg-gray-50">
                <td class="p-2 border text-center">${r.no}</td>
                <td class="p-2 border text-center font-mono">${r.nis || '-'}</td>
                <td class="p-2 border text-left font-bold"><div class="single-line w-64" title="${r.nama}">${r.nama||'-'}</div></td>
                <td class="p-2 border text-center">${r.jk || '-'}</td>
                <td class="p-2 border text-center">
                    <button onclick="printRaporSantri('${r.nis}', '${kelas}')" class="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" title="Print per santri">🖨️</button>
                </td>
                ${tds}
                <td class="p-2 border text-center font-bold">${r.jumlah || 0}</td>
                <td class="p-2 border text-center font-bold">${r.rata || 0}</td>
                <td class="p-2 border text-center font-bold">${r.ranking || '-'}</td>
            </tr>`;
        }).join('');

        const emptyNote = rows.length ? '' : `<div class="text-sm text-gray-500 mb-3">Belum ada santri di kelas ini, atau data belum termuat.</div>`;

        const konvBadge = konversi_applied ? `<span class="ml-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold">Konversi aktif (${jenjang} • S${semester})</span>` : '';

        return `
            <div class="text-sm text-gray-600 mb-3">
                <b>${scopeLabel}</b> • Tahun Ajar: <b>${tahun_ajar}</b> • Semester: <b>${semester}</b>
                ${konvBadge}
            </div>
            ${emptyNote}
            <div class="overflow-auto max-h-[70vh]">
                <table class="min-w-[1200px] w-full text-xs sm:text-sm border std-table whitespace-nowrap" id="${tableId}">
                    <thead class="bg-blue-700 text-white sticky top-0">
                        <tr>
                            <th class="p-2 border">No</th>
                            <th class="p-2 border">NIS</th>
                            <th class="p-2 border text-left">NAMA</th>
                            <th class="p-2 border">L/P</th>
                            <th class="p-2 border">PRINT</th>
                            ${headMapel}
                            <th class="p-2 border">JUMLAH</th>
                            <th class="p-2 border">RATA-RATA</th>
                            <th class="p-2 border">RANKING</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    function exportLeggerXLSX(kelas){
        const { mapels, rows, tahun_ajar, semester } = buildLeggerDataForKelas(kelas);
        const out = rows.map(r => {
            const o = {
                No: r.no,
                NIS: r.nis,
                NAMA: r.nama,
                'L/P': r.jk,
                PRINT: ''
            };
            mapels.forEach(m => { o[m] = (r.mapel[m] ? r.mapel[m] : ''); });
            o['JUMLAH'] = r.jumlah;
            o['RATA-RATA'] = r.rata;
            o['RANKING'] = r.ranking;
            return o;
        });
        saveExcel(out, `LEGGER_${kelas}_${tahun_ajar}_S${semester}.xlsx`, [{wch:18}]);
    }


    function _printHTML(title, html){
        const w = window.open('', '_blank');
        if(!w) { showToast('Popup diblokir browser. Izinkan pop-up untuk print.', 'error'); return; }
        w.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <meta charset="utf-8"/>
                <base href=\"${window.location.href.replace(/[^\/]*$/, '')}\"/>
                <style>
                    body{ font-family: Arial, sans-serif; padding: 16px; }
                    h1{ font-size: 16px; margin: 0 0 10px; }
                    .meta{ font-size: 12px; color:#444; margin-bottom: 12px; }
                    table{ border-collapse: collapse; width: 100%; }
                    th, td{ border: 1px solid #333; padding: 6px 8px; font-size: 11px; }
                    th{ background:#f2f2f2; }
                    .right{ text-align: right; }
                    .center{ text-align:center; }
                    @media print { button{ display:none; } }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `);
        w.document.close();
        w.focus();
        w.print();
    }

    function printLeggerKelas(kelas, asPDF){
        const { mapels, rows, tahun_ajar, semester } = buildLeggerDataForKelas(kelas);
        const head = ['No','NIS','NAMA','L/P','PRINT', ...mapels, 'JUMLAH','RATA-RATA','RANKING'];
        const thead = head.map(h=>`<th>${h}</th>`).join('');
        const tbody = rows.map(r=>{
            const cells = [
                r.no,
                r.nis,
                r.nama,
                r.jk,
                '', // kolom PRINT tidak perlu isi saat cetak
                ...mapels.map(m => r.mapel[m] ? r.mapel[m] : ''),
                r.jumlah,
                r.rata,
                r.ranking
            ].map(v=>`<td>${v ?? ''}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        const hint = asPDF ? `<div class="meta"><b>Catatan:</b> pilih <i>Save as PDF</i> di dialog print untuk export PDF.</div>` : '';
        const html = `
            <h1>LEGGER KELAS ${kelas}</h1>
            <div class="meta">Tahun Ajar: <b>${tahun_ajar}</b> • Semester: <b>${semester}</b></div>
            ${hint}
            <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
        `;
        _printHTML(`LEGGER_${kelas}`, html);
    }

    // --- PRINT LEGGER KELAS (ARAB) ---

    // --- RAPOR PRINT (per santri) ---
    function _normMapel(m){ return String(m||'').trim().replace(/\s+/g,' ').toUpperCase(); }

    // Angka -> kata Arab sederhana (0-100). Cukup untuk “mirip format”.
    function _numToArabicWords(n){
        n = Math.round(Number(n)||0);
        if(n <= 0) return 'صفر';
        if(n === 100) return 'مائة';
        const unitStandalone = {1:'واحد',2:'اثنان',3:'ثلاثة',4:'أربعة',5:'خمسة',6:'ستة',7:'سبعة',8:'ثمانية',9:'تسعة'};
        const unitInCompound = {1:'واحد',2:'اثنان',3:'ثلاث',4:'أربع',5:'خمس',6:'ست',7:'سبع',8:'ثمان',9:'تسع'};
        const teens = {10:'عشرة',11:'أحد عشر',12:'اثنا عشر',13:'ثلاثة عشر',14:'أربعة عشر',15:'خمسة عشر',16:'ستة عشر',17:'سبعة عشر',18:'ثمانية عشر',19:'تسعة عشر'};
        const tens = {20:'عشرون',30:'ثلاثون',40:'أربعون',50:'خمسون',60:'ستون',70:'سبعون',80:'ثمانون',90:'تسعون'};
        if(n < 10) return unitStandalone[n] || String(n);
        if(n < 20) return teens[n] || String(n);
        const t = Math.floor(n/10)*10;
        const u = n%10;
        if(u === 0) return tens[t] || String(n);
        return (unitInCompound[u]||String(u)) + ' و' + (tens[t]||String(t));
    }

    // Mapping mapel -> Arab (boleh bertambah nanti)
    const _mapelAr = {
        'FIKIH':'الفقه',
        'BAHASA ARAB':'اللغة العربية',
        'BAHASA INGGRIS':'اللغة الإنجليزية',
        'PIDATO':'الخطابة',
        'AKIDAH':'العقيدة',
        'FIKIH DAKWAH':'فقه الدعوة',
        'USHUL FIKIH':'أصول الفقه',
        'QOWAID FIKHIYAH':'القواعد الفقهية',
        'HADITS':'الحديث',
        'TAFSIR':'التفسير',
        'NAHWU':'النحو',
        'SEJARAH INDONESIA':'تاريخ إندونيسيا',
        'SEJARAH KEBUDAYAAN ISLAM':'التاريخ الإسلامي',
        'PENDIDIKAN KEWARGANEGARAAN':'التربية الوطنية',
        'BAHASA INDONESIA':'اللغة الإندونيسية',
        'MATEMATIKA':'الرياضيات',
        'MATEMATIKA PEMINATAN':'الرياضيات (تخصص)',
        'BIOLOGI':'البيولوجيا',
        'FISIKA':'الفيزياء',
        'KIMIA':'الكيمياء',
        'GEOGRAFI':'الجغرافية',
        'SOSIOLOGI':'علم الاجتماع',
        'INFORMATIKA':'تقنية المعلومات'
    };

    // Template mapel rapor (agar mapel yang belum didaftarkan tetap tercetak dengan nilai "-")
    // Disusun mengikuti contoh rapor yang kamu kirim.
    const _raporTemplate = {
        lisan: [
            'FIKIH',
            'BAHASA ARAB',
            'BAHASA INGGRIS',
            'PIDATO'
        ],
        tulis: [
            'AKIDAH',
            'BAHASA ARAB',
            'FIKIH',
            'FIKIH DAKWAH',
            'USHUL FIKIH',
            'HADITS',
            'NAHWU',
            'TAFSIR',
            'QOWAID FIKHIYAH',
            'SEJARAH KEBUDAYAAN ISLAM',
            'PENDIDIKAN KEWARGANEGARAAN',
            'BAHASA INDONESIA',
            'BAHASA INGGRIS',
            'MATEMATIKA',
            'SEJARAH INDONESIA',
            'MATEMATIKA PEMINATAN',
            'BIOLOGI',
            'FISIKA',
            'KIMIA',
            'GEOGRAFI',
            'SOSIOLOGI',
            'INFORMATIKA'
        ]
    };

    function _toArabicIndic(str){
        const map = { '0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩' };
        return String(str||'').replace(/[0-9]/g, d => map[d] || d);
    }

    function _semesterToArab(sem){
        const s = Number(sem)||0;
        if(s===1) return 'الأول';
        if(s===2) return 'الثاني';
        return String(sem||'');
    }

    function _jenjangToArab(j){
        const x = String(j||'').trim().toUpperCase();
        if(x==='X') return 'العاشر';
        if(x==='XI') return 'الحادي عشر';
        if(x==='XII') return 'الثاني عشر';
        return x;
    }

    function _jurusanToArab(kelas){
        const k = String(kelas||'').toUpperCase();
        if(k.includes('IPA')) return 'العلوم';
        if(k.includes('IPS')) return 'الاجتماعية';
        if(k.includes('BAHASA')) return 'اللغة';
        return '-';
    }

    // Hitung nilai rapor mapel dari record nilai_mapel (bobot + UH rata2)
    function _calcNilaiRaporFromMapel(sc, bobot){
        const b = bobot || {kehadiran:10, tugas:20, uh:40, pas_pat:30};
        const kehadiran = Number(sc.kehadiran||0);
        const tugas = Number(sc.tugas||0);
        const uhVals = [sc.uh1,sc.uh2,sc.uh3,sc.uh4,sc.uh5].map(x=>Number(x||0)).filter(x=>x>0);
        const uh = uhVals.length ? (uhVals.reduce((a,c)=>a+c,0)/uhVals.length) : 0;
        const pas = Number(sc.pas_pat||sc.pas||0);
        const n = (kehadiran*(b.kehadiran/100)) + (tugas*(b.tugas/100)) + (uh*(b.uh/100)) + (pas*(b.pas_pat/100));
        return Math.round(n*100)/100;
    }

    function printRaporSantri(nis, kelas){
        try{
            const s = students.find(x => String(x.nis) === String(nis));
            if(!s){ showToast('Santri tidak ditemukan', 'error'); return; }
            // Alias aman: beberapa blok template print menggunakan nama variabel `santri`
            // untuk merujuk data santri yang sedang dicetak.
            const santri = s;
            const { tahun_ajar, semester } = getActivePeriode();

            // Ambil daftar mapel dari template (sesuai format rapor Canva yang disepakati)
            // Catatan: tidak menambahkan mapel extra di luar daftar template.
            const mapels = [..._raporTemplate.lisan, ..._raporTemplate.tulis].map(_normMapel);

            // Display helper: ubah uppercase jadi Title Case (biar enak dibaca di kolom Latin)
            const _toTitleCase = (str)=>{
                const s = String(str||'').trim();
                if(!s) return '';
                return s
                    .toLowerCase()
                    .split(/\s+/)
                    .map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1)) : w)
                    .join(' ');
            };

            // bobot dari memori/config (fallback default)
            const b = (window.bobotNilai && typeof window.bobotNilai === 'object') ? window.bobotNilai : {kehadiran:10, tugas:20, uh:40, pas_pat:30};

            // helper ambil nilai mapel untuk santri
            const getNilai = (mapel) => {
                const rec = scores.find(x => String(x.nis)===String(nis) && _normMapel(x.mapel)===_normMapel(mapel) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                const v = _calcNilaiRaporFromMapel(rec, b);
                return v ? v : 0;
            };

            // rata-rata kelas per mapel
            const avgKelas = (mapel) => {
                const vals = students.filter(st=>st.kelas===kelas).map(st => {
                    const rec = scores.find(x => String(x.nis)===String(st.nis) && _normMapel(x.mapel)===_normMapel(mapel) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                    return _calcNilaiRaporFromMapel(rec, b);
                }).filter(v=>Number(v)>0);
                if(!vals.length) return 0;
                return Math.round((vals.reduce((a,c)=>a+c,0)/vals.length)*100)/100;
            };

            const makeRow = (m, no, group)=>{
                const nm = _normMapel(m);
                const nilai = getNilai(m);
                const rata = avgKelas(m);
                return {
                    no,
                    mapel_id: _toTitleCase(m),
                    mapel_ar: _mapelAr[nm] || '',
                    nilai: nilai,
                    nilai_ar: nilai ? _numToArabicWords(nilai) : '-',
                    rata: rata || '-',
                    group
                };
            };

            const lisan = _raporTemplate.lisan.map((m,i)=>makeRow(m, i+1, 'LISAN'));
            const tulis = _raporTemplate.tulis.map((m,i)=>makeRow(m, i+1, 'TULIS'));
            const rows = [...lisan, ...tulis];

            const nilaiList = rows.map(r=>Number(r.nilai)||0).filter(v=>v>0);
            const jumlah = Math.round((nilaiList.reduce((a,c)=>a+c,0))*100)/100;
            const rata2 = nilaiList.length ? Math.round((jumlah/nilaiList.length)*100)/100 : 0;

            // ranking kelas berdasarkan rata2 mapel
            const rankArr = students.filter(st=>st.kelas===kelas).map(st => {
                const vals = mapels.map(m => {
                    const rec = scores.find(x => String(x.nis)===String(st.nis) && _normMapel(x.mapel)===_normMapel(m) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                    return _calcNilaiRaporFromMapel(rec, b);
                }).filter(v=>Number(v)>0);
                const sum = vals.reduce((a,c)=>a+c,0);
                const avg = vals.length ? (sum/vals.length) : 0;
                return { nis: st.nis, avg };
            }).sort((a,b)=>b.avg-a.avg);
            const ranking = Math.max(1, rankArr.findIndex(r=>String(r.nis)===String(nis))+1);

            const totalKelas = students.filter(st=>st.kelas===kelas).length || 0;

            const years = String(tahun_ajar||'').match(/\d{4}/g) || [];
            const y1 = years[0] || '';
            const y2 = years[1] || '';
            const tahunAr = (y1 && y2) ? `${_toArabicIndic(y1)} / ${_toArabicIndic(y2)}` : _toArabicIndic(tahun_ajar);

            const jenjang = _inferJenjangFromKelas(kelas);
            const _pKelas = (typeof _parseKelasParts==='function') ? _parseKelasParts(kelas) : { paralel:'', kelas:kelas };
            const paralelAr = (_pKelas.paralel && String(_pKelas.paralel).trim()!=='') ? String(_pKelas.paralel).trim() : '-';

            // Transliteration sederhana (fallback): Latin -> Arab agar nama tetap berhuruf Arab
            // Catatan: ini transliterasi praktis, bukan kaidah ilmiah 100%.
            const _latinToArabicName = (input)=>{
                let t = String(input||'').trim();
                if(!t) return '';
                const lower = t.toLowerCase();
                // proses per-kata, jaga spasi
                const mapPairs = {
                    'kh':'خ', 'sy':'ش', 'sh':'ش', 'dz':'ذ', 'ts':'ث', 'th':'ث',
                    'dh':'ض', 'gh':'غ', 'ng':'نغ', 'ny':'ني'
                };
                const mapChar = {
                    'a':'ا','b':'ب','c':'تش','d':'د','e':'ي','f':'ف','g':'غ','h':'ه','i':'ي',
                    'j':'ج','k':'ك','l':'ل','m':'م','n':'ن','o':'و','p':'ف','q':'ق','r':'ر',
                    's':'س','t':'ت','u':'و','v':'ف','w':'و','x':'كس','y':'ي','z':'ز'
                };
                const words = lower.split(/(\s+)/);
                const out = words.map(w=>{
                    if(/^\s+$/.test(w)) return w;
                    let s = w;
                    let res = '';
                    for(let i=0;i<s.length;){
                        const pair = s.slice(i,i+2);
                        if(mapPairs[pair]){ res += mapPairs[pair]; i += 2; continue; }
                        const ch = s[i];
                        if(/[a-z]/.test(ch)) res += (mapChar[ch]||ch);
                        else if(/[0-9]/.test(ch)) res += _toArabicIndic(ch);
                        else if(ch==='-'||ch==='\''||ch==='’') { /* skip */ }
                        else res += ch;
                        i += 1;
                    }
                    return res;
                }).join('');
                return out.replace(/\s{2,}/g,' ').trim();
            };

            // Nama Arab diambil dari DB (kolom santri.nama_arab). Jika kosong, fallback ke nama latin (tetap tampil).
            const namaLatin = (santri.nama || santri.name || santri.nama_latin || '').toString().trim() || '-';
            // Alias kompatibilitas: beberapa bagian template lama masih memakai _latinName
            const _latinName = namaLatin;

            const namaArab = (santri.nama_arab && String(santri.nama_arab).trim()!=='')
              ? String(santri.nama_arab).trim()
              : (santri.name_arab && String(santri.name_arab).trim()!=='')
                ? String(santri.name_arab).trim()
                : (namaLatin && namaLatin !== '-' ? (_latinToArabicName(namaLatin) || namaLatin) : '-');

            const nisArab = (santri.nis!=null && String(santri.nis).trim()!=='') ? _toArabicIndic(String(santri.nis)) : '-';

            const jumlahAr = jumlah ? _toArabicIndic(String(jumlah)) : '-';
            const rata2Ar = rata2 ? _toArabicIndic(String(rata2)) : '-';
            const rankingAr = ranking ? _toArabicIndic(String(ranking)) : '-';
            const totalAr = totalKelas ? _toArabicIndic(String(totalKelas)) : '-';
            const rankingTextAr = `${rankingAr} من ${totalAr} طالب/طالبة`;

            // ========= TTQ (Tahsin & Tahfidz) =========
            const _findNilaiByKeywords = (keywords, targetNis)=>{
                const kw = (keywords||[]).map(x=>_normMapel(x));
                const recs = (scores||[]).filter(x => String(x.nis)===String(targetNis)
                    && String(x.tahun_ajar)===String(tahun_ajar)
                    && Number(x.semester)===Number(semester)
                    && kw.some(k => _normMapel(x.mapel).includes(k))
                );
                if(!recs.length) return { nilai:0, rata:0 };
                const vals = recs.map(r=>_calcNilaiRaporFromMapel(r, b)).filter(v=>Number(v)>0);
                const nilai = vals.length ? Math.max(...vals) : 0;

                const avgVals = students.filter(st=>st.kelas===kelas).map(st=>{
                    const rs = (scores||[]).filter(x => String(x.nis)===String(st.nis)
                        && String(x.tahun_ajar)===String(tahun_ajar)
                        && Number(x.semester)===Number(semester)
                        && kw.some(k => _normMapel(x.mapel).includes(k))
                    );
                    if(!rs.length) return 0;
                    const vs = rs.map(r=>_calcNilaiRaporFromMapel(r, b)).filter(v=>Number(v)>0);
                    return vs.length ? Math.max(...vs) : 0;
                }).filter(v=>Number(v)>0);

                const rata = avgVals.length ? Math.round((avgVals.reduce((a,c)=>a+c,0)/avgVals.length)*100)/100 : 0;
                return { nilai, rata };
            };

            const ttqItems = [
                { grp:'TAHSIN', no:1, id:'Kelancaran membaca', ar:'طلاقة التلاوة', kw:['TAHSIN','KELANCARAN','BACA','TILAWAH'] },
                { grp:'TAHSIN', no:2, id:'Tajwid', ar:'التجويد', kw:['TAHSIN','TAJWID','TAJWEED'] },
                { grp:'TAHFIDZ', no:1, id:'Hafalan Wajib', ar:'الحفظ المقرر', kw:['TAHFIDZ','HAFALAN','WAJIB'] },
                { grp:'TAHFIDZ', no:2, id:'Hafalan Muroja\'ah', ar:'مراجعة الحفظ', kw:['TAHFIDZ','MUROJA','MURAJA','MURAJAAH','MURAJAH'] },
                { grp:'TAHFIDZ', no:3, id:'Hafalan Tambahan', ar:'الحفظ الإضافي', kw:['TAHFIDZ','TAMBAHAN','IDHAFI','TAMBAH'] },
                { grp:'TAHFIDZ', no:4, id:'Tajwid', ar:'التجويد', kw:['TAHFIDZ','TAJWID','TAJWEED'] },
                { grp:'TAHFIDZ', no:5, id:'Ujian Tulis', ar:'الامتحان التحريري', kw:['TAHFIDZ','UJIAN','TULIS'] }
            ];

            const ttqRows = ttqItems.map(it=>{
                const r = _findNilaiByKeywords(it.kw, nis);
                return {
                    grp: it.grp,
                    no: it.no,
                    mapel_id: it.id,
                    mapel_ar: it.ar,
                    nilai: r.nilai,
                    nilai_ar: r.nilai ? _numToArabicWords(r.nilai) : '-',
                    rata: r.rata || '-'
                };
            });

            const ttqTahsin = ttqRows.filter(x=>x.grp==='TAHSIN');
            const ttqTahfidz = ttqRows.filter(x=>x.grp==='TAHFIDZ');

            // ========= Absensi & Sikap =========
            const scWali = (waliScores || []).find(x => String(x.nis)===String(nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
            const hadirS = Number(scWali.hadir_s || 0) || 0;
            const hadirI = Number(scWali.hadir_i || 0) || 0;
            const hadirA = Number(scWali.hadir_a || 0) || 0;
            const hadirSAr = _toArabicIndic(String(hadirS));
            const hadirIAr = _toArabicIndic(String(hadirI));
            const hadirAAr = _toArabicIndic(String(hadirA));

            const _sikapToArab = (v)=>{
                const x = String(v||'').trim().toUpperCase();
                if(x==='A') return 'ممتاز';
                if(x==='B') return 'جيد جدا';
                if(x==='C') return 'جيد';
                if(x==='D') return 'مقبول';
                // kalau sudah Arabic / teks lain
                return (String(v||'').trim()!=='' ? String(v).trim() : '-');
            };
            const sikapAkhlak = _sikapToArab(scWali.akhlak);
            const sikapRajin = _sikapToArab(scWali.kerajinan);
            const sikapBersih = _sikapToArab(scWali.kebersihan);
            const sikapDisiplin = _sikapToArab(scWali.kedisiplinan);

            // ========= CSS (print rapor bilingual mengikuti desain PDF/Canva) =========
            const css = `
                @page { size: A4; margin: 11mm 13mm; }
                body{ line-height:1.0; font-family: Arial, sans-serif; color:#000; padding:0; margin:0;  font-size:15px; }
                .arab{ font-family: Arial, sans-serif; }
	                .latin{ font-family:"Times New Roman", Times, serif; direction:ltr;}
                .wrap{ width:100%; direction:rtl; }
                /* kontrol bahasa untuk blok identitas */
                .info-ar{ display:block; }
                .info-id{ display:none; }
                .wrap.rapor-lang-id .info-ar{ display:none; }
                .wrap.rapor-lang-id .info-id{ display:block; }

                /* rtl tapi tetap nempel kiri (sesuai request) */
                .rtl-left{ direction:rtl; text-align:left; }
                .page{ page-break-after: always; position:relative; }
                .page:last-child{ page-break-after: auto; }
                /* gunakan tinggi area print (A4 - margin atas/bawah) agar layout stabil */
                .page-inner{ padding-top: 0mm; display:flex; flex-direction:column; min-height: 275mm; box-sizing:border-box; position:relative; padding-bottom: 10mm; }

                /* rapetin jarak antar elemen */
                .page-inner div{ margin:0; }

                /* footer: nempel bawah via flex */
                .footer{ position:absolute; left:0; right:2mm; bottom:0; display:flex; justify-content:space-between; align-items:center; padding-top:2mm; padding-bottom:2mm; margin-bottom:0; }
                .footer .stu-name{ font-weight:700; font-size:15px; }
                .footer .stu-name .cls{ font-weight:700; font-size:13px; margin-left:6px; }
                .footer .pno{ display:inline-flex; width:22px; height:22px; border:2px solid #000; border-radius:999px; align-items:center; justify-content:center; font-weight:800; font-size:14px; }
                .footer.swap .stu-name{ text-align:right; }

                /* header */
                /* kurangi overlap kop -> identitas (logo sebelumnya "nabrak" identitas) */
                .head{ text-align:center; margin-top:0mm; margin-bottom:4mm; padding-top:0mm; }
                /* grid harus LTR biar logo benar-benar di kanan (wrapper RTL bikin grid kebalik) */
                .kop-grid{ display:grid; grid-template-columns: 100px 1fr 100px; align-items:center; gap:10px; direction:ltr; padding:0 4mm; box-sizing:border-box; }
                .kop-text{ direction:rtl; text-align:center; }
                .kop-logo{ align-self:center; display:flex; align-items:center; }
                .kop-logo.left{ justify-self:start; justify-content:flex-start; }
                .kop-logo.right{ justify-self:end; justify-content:flex-end; }
                /* logo diset agar sejajar tinggi 3 baris kop */
                /* tinggi logo dibuat sejajar dengan tinggi 3 baris kop */
                .kop-logo img{ height:95px; width:auto; display:block; margin-top:0; }
                /* kop: padding diperbesar agar identitas tidak tertimpa logo */
                /* padding antar 3 baris kop dipertegas supaya sejajar dan aman untuk logo */
                .inst{ font-size:29px; font-weight:900;  padding:5px 0; margin:0;  line-height:1.15; }
                .addr{ font-size:17px; font-weight:700; line-height:1.15; padding:5px 0; margin:0; }
                /* baris ke-3 diberi jarak bawah agar tidak nempel ke identitas */
                .year{ font-size:17px; font-weight:900; line-height:1.15; padding:5px 0 8px; margin:0; }

                /* student info (tanpa tabel) */
                /* identitas diberi padding atas agar ada jarak dari kop baris ke-3 */
                .info-block{ margin-top:0mm; padding-top:6px; direction:rtl; font-size:16px; text-align:left; width: calc(100% - 2mm); margin-right:2mm; box-sizing:border-box; }
                .info-row{ display:flex; justify-content:space-between; gap:14px; }
                /* identitas model Canva: 2 kolom (kiri=kelas/semester, kanan=nama/nis). Paralel dihapus. */
                .info-row.ident2{ display:grid; grid-template-columns: 50% 50%; gap:10px; direction:ltr; justify-items:stretch; }
                .info-row.ident2 .ident-col{ direction:rtl; text-align:left; display:flex; gap:8px; align-items:baseline; justify-content:flex-end; }
                /* kolom kanan (nama/nis) digeser sedikit ke kiri supaya tidak kepotong di tepi kanan saat print */
                .info-row.ident2 .ident-col:nth-child(1){ justify-content:flex-start; text-align:left; justify-self:start; }
                .info-row.ident2 .ident-col:nth-child(2){ justify-content:flex-start; text-align:right; justify-self:end; padding-right:7mm; box-sizing:border-box; }
                .info-row.ident2 .ident-col:nth-child(2) .val{ max-width:100%; overflow-wrap:anywhere; }
                .info-row.ident2 .ident-col .lbl{ font-weight:900; white-space:nowrap; }
                .info-row.ident2 .ident-col .val{ font-weight:800; }
                .info-row.three{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; direction:ltr; }
                .info-row.three .info-item{ direction:rtl; }
                .info-row.three .info-item.left{ justify-self:start; }
                .info-row.three .info-item.mid{ justify-self:center; }
                .info-row.three .info-item.right{ justify-self:end; }
                .info-row + .info-row{ margin-top:1.2mm; }
                .info-item{ display:flex; gap:8px; align-items:baseline; }
                .info-item .lbl{ font-weight:900; white-space:nowrap; }
                .info-item .val{ font-weight:800; }
                .info-row.single{ justify-content:flex-start; }

                /* info layout (dual columns) mengikuti Canva */
                .info-row.dual{ display:flex; justify-content:space-between; gap:14px; direction:ltr; }
                .info-col{ width:48%; }
                .info-col.right{ direction:rtl; text-align:right; }
                .info-col.left{ direction:rtl; text-align:left; }
                .info-line{ display:flex; gap:8px; align-items:baseline; }
                .info-line .lbl{ font-weight:900; white-space:nowrap; }
                .info-line .val{ font-weight:800; }
                .info-leftline{ display:flex; gap:10px; align-items:baseline; justify-content:flex-start; }

                /* pilihan bahasa identitas: default ikut Canva (Arab/bilingual). Mode Indonesia bisa diaktifkan via window.RAPOR_LANG='id' */
                .info-id{ display:none; }
                .rapor-lang-id .info-ar{ display:none; }
                .rapor-lang-id .info-id{ display:block; }

                /* Arab: tetap RTL, tapi rata kiri sesuai request user */
                .rapor-lang-ar .info-col.left,
                .rapor-lang-bi .info-col.left{ direction:rtl; text-align:left; }
                .rapor-lang-ar .info-leftline,
                .rapor-lang-bi .info-leftline{ justify-content:flex-start; }


                /* tables */
                table.tbl{ width: calc(100% - 2mm); margin-right:2mm; border-collapse:collapse; table-layout:fixed; direction:rtl; }
                table.tbl th, table.tbl td{ border:2px solid #000; padding:4px 4px; font-size:16px; line-height:1.0; vertical-align:middle; }
                table.tbl th{ font-weight:900; }
                table.tbl th:nth-child(6), table.tbl td:nth-child(6){ text-align:center; }
                .c{ text-align:center; }
                .r{ text-align:right; }
                .l{ text-align:left; }
                .num{ font-weight:900; }
                .words{ font-weight:900; font-size:16px; line-height:1.0; }
                .subject-ar{ font-weight:900; font-size:20px; line-height:1.0; }
	                .subject-id{ font-size:13px; }
	                /* Latin font sizing: one more step smaller (-1px) */
	                table.tbl th.latin, table.tbl td.latin{ font-size:15px; }
	                table.tbl th.latin.subject-id, table.tbl td.latin.subject-id{ font-size:12px; }
	                table.box th.latin, table.box td.latin{ font-size:17px; }
	                .info-block.latin{ font-size:15px; }
                .group-row td{ font-weight:900; font-size:18px; text-align:center; padding:4px 4px; line-height:1.0; }
                .sum-row td{ font-weight:900; font-size:16px; line-height:1.0; }

                table.tbl.legend{ margin-top:2mm; margin-bottom:1mm; }
                /* tampilkan garis atas (top border) untuk tabel ujian lisan/tulis seperti template Canva */
                table.tbl.body{ margin-top:0; margin-bottom:2mm; border:2px solid #000;  font-size:12px; }
                table.tbl.summary{ margin-top:0; }

                /* jarak title <-> tabel atas dan title <-> tabel bawah disamakan */
                .exam-title{ display:flex; justify-content:center; align-items:baseline; gap:12px; margin:2mm 0 2mm; }
                /* samakan ukuran judul ujian dengan ukuran "mata pelajaran" (header tabel) */
	                .exam-title .latin{ font-size:14px; font-style:normal; font-weight:900; }
                .exam-title .arab{ font-size:16px; font-weight:900; }

                .ttq-title{ display:flex; justify-content:center; align-items:baseline; gap:12px; margin:0 0 4mm; text-align:center; }
                /* samakan ukuran judul TTQ dengan judul ujian / "mata pelajaran" */
                /* TTQ title: tidak italic, cukup bold */
	                .ttq-title .latin{ font-size:14px; font-style:normal; font-weight:900; }
                .ttq-title .arab{ font-size:16px; font-weight:900; }

                /* boxes */
                .grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:10mm; margin-top:5mm; }
                table.box{ border-collapse:collapse; width:100%; direction:rtl; }
                /* khusus tabel ketidakhadiran: sejajarkan border kanan dengan tabel di atasnya (tanpa mengganggu border lain) */
                table.box.absen{ width: calc(100% - 2mm); margin-right:2mm; }
                table.box th, table.box td{ border:2px solid #000; padding:4px 4px; font-size:18px; line-height:1.0; vertical-align:middle; }
                table.box th{ font-weight:900; }
                table.box thead th{ font-size:16px; }
                .box-label{ font-size:14px; font-weight:900; }

                /* signatures */
                /* titimangsa rapor: beri jarak/padding agar tidak mepet */
                .sig-spacer-2{ height:2em; }
                .sig-date-line{ display:block; }
                .sig-date{ text-align:right; font-size: 16px; font-weight:900; margin-top:14mm; margin-bottom:12mm; padding:5px 2mm; }
                .sig-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; column-gap:12mm; align-items:flex-start; margin-top:6mm; padding-bottom:2mm; justify-items:stretch; }
                .sig-col{ text-align:center; display:flex; flex-direction:column; align-items:center; }
                .sig-title{ font-weight:900; font-size: 16px; line-height:1.15; height:18mm; min-height:18mm; display:flex; flex-direction:column; justify-content:center;  width:100%; }
                .sig-title .arab{ display:block; order:0; }
	                .sig-title .latin{ display:block; order:1; font-weight:700; font-size:14px; direction:ltr; }
                /* ruang tanda tangan: 4 baris kosong */
                .sig-gap{ height:22mm; }
                /* cukup 1 garis (tanpa titik-titik ganda) */
                .sig-line{ border-top:2px solid #000; width:80%; margin:0 auto; }
                
                .topline{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6mm; }
                .topline .stu{ font-size:22px; font-weight:900; }
                .topline .pno{ font-size:22px; font-weight:900; }

                /* GLOBAL: semua teks 12px (arabic & latin), kecuali kop */
                .wrap *{ font-size:15px !important; }
                .inst{ font-size:29px !important; }
                .addr{ font-size:17px !important; }
                .year{ font-size:17px !important; }

            `;

            // ========= Builders =========
            const _rowHTML = (r)=>{
                const no = _toArabicIndic(r.no);
                const angka = r.nilai ? _toArabicIndic(String(r.nilai)) : '-';
                const terbilang = r.nilai ? r.nilai_ar : '-';
                const rataAr = (r.rata && r.rata !== '-') ? _toArabicIndic(String(r.rata)) : '-';
                const subj = (r.mapel_ar && String(r.mapel_ar).trim()!=='') ? r.mapel_ar : '—';
                return `
                    <tr>
                        <td class="arab c num">${no}</td>
                        <td class="arab r subject-ar">${subj}</td>
                        <td class="arab c num">${rataAr}</td>
                        <td class="arab c num">${angka}</td>
                        <td class="arab r words">${terbilang}</td>
                    </tr>
                `;
            };

            // Format tabel mengikuti desain Canva (bilingual + 6 kolom: رقم | عربي | Latin | معدل | رقما | كتابة)
            const makeLegendHeader = (subjectTitleAr='المواد الدراسية')=>{
                return `
                    <table class="tbl legend">
                        <colgroup>
                            <col style="width:7%">   <!-- الرقم -->
                            <col style="width:21%">  <!-- mapel ar -->
                            <col style="width:27%">  <!-- mapel id -->
                            <col style="width:13%">  <!-- rata -->
                            <col style="width:9%">  <!-- angka -->
                            <col style="width:17%">  <!-- terbilang -->
                        </colgroup>
                        <thead>
                            <tr>
                                <th rowspan="2" class="arab c">الرقم</th>
                                <th colspan="2" class="arab c">${subjectTitleAr}</th>
                                <th class="arab c">معدل الصف</th>
                                <th colspan="2" class="arab c">الدرجة المكتسبة</th>
                            </tr>
                            <tr>
                                <th colspan="2" class="c latin">Mata Pelajaran</th>
                                <th class="c latin">Rata - rata<br/>Kelas</th>
                                <th class="arab c">رقما</th>
                                <th class="arab c">كتابة</th>
                            </tr>
                        </thead>
                    </table>
                `;
            };

            const _rowHTML6 = (r)=>{
                const no = _toArabicIndic(r.no);
                const angka = r.nilai ? _toArabicIndic(String(r.nilai)) : '';
                const terbilang = r.nilai ? r.nilai_ar : '';
                const rataAr = (r.rata && r.rata !== '-') ? _toArabicIndic(String(r.rata)) : '';
                const id = (r.mapel_id || '').trim();
                const ar = (r.mapel_ar || '').trim();
                return `
                    <tr>
                        <td class="arab c num">${no}</td>
                        <td class="arab r subject-ar">${ar || ''}</td>
                        <td class="latin l subject-id">${escapeHtml(id)}</td>
                        <td class="latin c num">${rataAr}</td>
                        <td class="arab c num">${angka}</td>
                        <td class="arab r words">${terbilang}</td>
                    </tr>
                `;
            };

            const makeExamTable = (arr)=>{
                return `
                    <table class="tbl body">
                        <colgroup>
                            <col style="width:7%">   <!-- الرقم -->
                            <col style="width:21%">  <!-- mapel ar -->
                            <col style="width:27%">  <!-- mapel id -->
                            <col style="width:13%">  <!-- rata -->
                            <col style="width:9%">  <!-- angka -->
                            <col style="width:17%">  <!-- terbilang -->
                        </colgroup>
                        <tbody>
                            ${arr.map(_rowHTML6).join('')}
                        </tbody>
                    </table>
                `;
            };

            const makeSummaryRows = ()=>{
                const rataWords = rata2 ? _numToArabicWords(rata2) : '';
                return `
                    <table class="tbl body summary">
                        <colgroup>
                            <col style="width:7%">
                            <col style="width:21%">
                            <col style="width:27%">
                            <col style="width:13%">
                            <col style="width:9%">
                            <col style="width:17%">
                        </colgroup>
                        <tbody>
                            <tr class="sum-row">
                                <td></td>
                                <td class="arab r subject-ar">مجموع الدرجات</td>
                                <td class="latin l subject-id">Jumlah</td>
                                <td></td>
                                <td class="arab c num">${jumlahAr}</td>
                                <td></td>
                            </tr>
                            <tr class="sum-row">
                                <td></td>
                                <td class="arab r subject-ar">المعدل التراكمي</td>
                                <td class="latin l subject-id">Rata-rata</td>
                                <td></td>
                                <td class="arab c num">${rata2Ar}</td>
                                <td class="arab r words" style="font-weight:800;">${rataWords}</td>
                            </tr>
                            <tr class="sum-row">
                                <td></td>
                                <td class="arab r subject-ar">الترتيب</td>
                                <td class="latin l subject-id">Rangking</td>
                                <td class="arab c" colspan="3" style="font-weight:900; text-align:center;">${rankingAr} من ${totalAr} طالب/طالبة</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            };

            const makeMainTable = ()=>{
                return `
                    ${makeLegendHeader()}

                    <div class="exam-title">
                        <span class="latin">Ujian Lisan</span>
                        <span class="arab">الامتحان الشفوي</span>
                    </div>
                    ${makeExamTable(lisan)}

                    <div class="exam-title">
                        <span class="latin">Ujian Tulis</span>
                        <span class="arab">الامتحان التحريري</span>
                    </div>
                    ${makeExamTable(tulis)}

                    ${makeSummaryRows()}
                `;
            };

            const makeTTQTable = ()=>{
                const rowTTQ = (r)=>{
                    const no = _toArabicIndic(r.no);
                    const angka = r.nilai ? _toArabicIndic(String(r.nilai)) : '';
                    const terbilang = r.nilai ? r.nilai_ar : '';
                    const rataAr = (r.rata && r.rata !== '-') ? _toArabicIndic(String(r.rata)) : '';
                    const id = (r.mapel_id || '').trim();
                    const ar = (r.mapel_ar || '').trim();
                    return `
                        <tr>
                            <td class="arab c num">${no}</td>
                            <td class="arab r subject-ar">${ar}</td>
                            <td class="latin l subject-id">${escapeHtml(id)}</td>
                            <td class="latin c num">${rataAr}</td>
                            <td class="arab c num">${angka}</td>
                            <td class="arab r words">${terbilang}</td>
                        </tr>
                    `;
                };

                return `
                    ${makeLegendHeader('المواد الدراسية الرئيسية')}

                    <table class="tbl body ttq">
                        <colgroup>
                            <col style="width:7%">
                            <col style="width:21%">
                            <col style="width:27%">
                            <col style="width:13%">
                            <col style="width:9%">
                            <col style="width:17%">
                        </colgroup>
                        <tbody>
                            <tr class="group-row">
                                <td class="arab c num">أ -</td>
                                <td colspan="5" class="c">
                                    <span class="latin">Tahsin</span>
                                    &nbsp;&nbsp;
                                    <span class="arab">التحسين</span>
                                </td>
                            </tr>
                            ${ttqTahsin.map(rowTTQ).join('')}

                            <tr class="group-row">
                                <td class="arab c num">ب -</td>
                                <td colspan="5" class="c">
                                    <span class="latin">Tahfidz</span>
                                    &nbsp;&nbsp;
                                    <span class="arab">التحفيظ</span>
                                </td>
                            </tr>
                            ${ttqTahfidz.map(rowTTQ).join('')}
                        </tbody>
                    </table>
                `;
            };

            const namaLabel = (String(s.jk||'').toUpperCase()==='P') ? 'اسم الطالبة' : 'اسم الطالب';
            const jurusanArab = _jurusanToArab(kelas);
            const _formatParalelToken = (p)=>{
                const s = String(p||'').trim();
                if(!s || s==='-') return '-';
                // contoh: A3 -> ٣A (digit arabic-indic dulu, lalu huruf)
                const m = s.match(/^([A-Za-z]+)(\d+)$/);
                if(m){
                    const letters = String(m[1]||'').toUpperCase();
                    const digits = String(m[2]||'');
                    return `${_toArabicIndic(digits)}${letters}`;
                }
                // format lain: hanya konversi digit
                return _toArabicIndic(s);
            };

            const paralelToken = _formatParalelToken(paralelAr);

            // Mode bahasa untuk identitas (default: bilingual ala Canva)
            // Bisa diubah dari console / inline: window.RAPOR_LANG = 'id' | 'ar' | 'bi'
            const _langRaw = String(window.RAPOR_LANG || window.raporLang || window.rapor_lang || 'bi').toLowerCase();
            const raporLang = (_langRaw.startsWith('id') || _langRaw.includes('indo')) ? 'id' : (_langRaw.startsWith('ar') || _langRaw.includes('arab')) ? 'ar' : 'bi';

            const kelasJurusanID = (()=>{
                // request: paralel (mis. A3) dihapus dari identitas
                const p = _pKelas || { jenjang:'', jurusan:'', paralel:'' };
                const a = [p.jenjang, p.jurusan].filter(Boolean).join(' ').trim();
                return a ? a : String(kelas||'');
            })();
            const semesterID = (Number(semester)===1) ? 'Awal' : (Number(semester)===2) ? 'Akhir' : String(semester||'');

            const html = `
                <div class="wrap rapor-lang-${raporLang}">

                    <!-- PAGE 1 -->
                    <div class="page">
                        <div class="page-inner">
                            <div class="head">
                                <div class="kop-grid">
                                    <div class="kop-logo left"><img src="logo2.png" /></div>
                                    <div class="kop-text">
                                        <div class="arab inst">معهد حسن الخاتمة الإسلامي</div>
                                        <div class="arab addr">مانيسكيدول - جالكسنا - كونينغان - جاوا الغربية</div>
                                        <div class="arab year">السنة الدراسية : ${tahunAr}</div>
                                    </div>
                                    <div class="kop-logo right"><img src="logo.png" /></div>
                                </div>
                            </div>

                            <!-- IDENTITAS (Arab/bilingual ala Canva): RTL tapi rata kiri. Paralel dihapus. -->
                            <div class="info-block arab info-ar">
                                <div class="info-row ident2">
                                    <div class="ident-col" style="text-align:left;">
                                        <span class="lbl" style="font-weight:900;">المستوى / القسم:</span>
                                        <span class="val" style="font-weight:800;">${_jenjangToArab(jenjang)} ${escapeHtml(jurusanArab)}</span>
                                    </div>
                                    <!-- kolom kanan (nama) harus rata kanan agar rapi dan tidak "nabrak" logo -->
                                    <div class="ident-col" style="justify-self:end; text-align:right; justify-content:flex-start;">
                                        <span class="lbl" style="font-weight:900;">${namaLabel} :</span>
                                        <span class="val" style="font-weight:800;">${namaArab}</span>
                                    </div>
                                </div>
                                <div class="info-row ident2" style="margin-top:1.2mm;">
                                    <div class="ident-col" style="text-align:left;">
                                        <span class="lbl" style="font-weight:900;">الفصل الدراسي :</span>
                                        <span class="val" style="font-weight:800;">${_semesterToArab(semester)}</span>
                                    </div>
                                    <div class="ident-col" style="justify-self:end; text-align:right; justify-content:flex-start;">
                                        <span class="lbl" style="font-weight:900;">رقم القيد :</span>
                                        <span class="val num" style="font-weight:800;">${nisArab}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- IDENTITAS (Indonesia) : kiri ke kanan, rata kiri -->
                            <div class="info-block latin info-id" style="direction:ltr; text-align:left;">
                                <div class="info-row" style="justify-content:flex-start; gap:18px; text-align:left;">
                                    <div class="info-item"><span class="lbl">Kelas/Jurusan:</span><span class="val">${escapeHtml(kelasJurusanID)}</span></div>
                                    <div class="info-item"><span class="lbl">Semester:</span><span class="val">${escapeHtml(semesterID)}</span></div>
                                </div>
                                <div class="info-row" style="justify-content:flex-start; gap:18px; margin-top:1.2mm;">
                                    <div class="info-item"><span class="lbl">Nama:</span><span class="val">${escapeHtml(_latinName || '-')}</span></div>
                                    <div class="info-item"><span class="lbl">No Induk:</span><span class="val">${escapeHtml(String(s.nis ?? '-'))}</span></div>
                                </div>
                            </div>

                            ${makeMainTable()}

                            <div class="footer"><div class="stu-name latin">${escapeHtml(namaLatin)}<span class="cls">(${escapeHtml(kelas)})</span></div><div class="pno">١</div></div>
                        </div>
                    </div>

                    <!-- PAGE 2 -->
                    <div class="page">
                        <div class="page-inner">
                            <!-- hapus angka 2 di kiri atas (nomor halaman sudah ada di bawah) -->

                            <div class="ttq-title">
                                <span class="latin">Tahsin dan Tahfidz Al-Qur’an</span>
                                <span class="arab">تحسين القرآن وتحفيظه</span>
                            </div>

                            ${makeTTQTable()}

                            <div class="grid2">
                                <table class="box absen">
                                    <thead>
                                        <tr><th colspan="3" class="c"><span class="latin">Ketidakhadiran</span> &nbsp;-&nbsp; <span class="arab">أيام الغياب</span></th></tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="arab r subject-ar" style="width:44%; font-weight:900;">لِمَرَضٍ</td>
                                            <td class="latin l subject-id" style="width:40%;">Sakit</td>
                                            <td class="arab c num" style="width:16%;">${hadirSAr}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab r subject-ar" style="font-weight:900;">لِاسْتِئْذَانٍ</td>
                                            <td class="latin l subject-id">Ijin</td>
                                            <td class="arab c num">${hadirIAr}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab r subject-ar" style="font-weight:900;">بِلَا عُذْرٍ</td>
                                            <td class="latin l subject-id">Alfa</td>
                                            <td class="arab c num">${hadirAAr}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <table class="box">
                                    <thead>
                                        <tr><th colspan="4" class="c"><span class="latin">Kepribadian</span> &nbsp;-&nbsp; <span class="arab">الشخصية</span></th></tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="arab c num" style="width:12%;">١</td>
                                            <td class="arab r subject-ar" style="width:32%; font-weight:900;">السلوك</td>
                                            <td class="latin l subject-id" style="width:34%;">Akhlak</td>
                                            <td class="arab c num" style="width:22%;">${sikapAkhlak}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab c num">٢</td>
                                            <td class="arab r subject-ar" style="font-weight:900;">المواظبة</td>
                                            <td class="latin l subject-id">Kerajinan</td>
                                            <td class="arab c num">${sikapRajin}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab c num">٣</td>
                                            <td class="arab r subject-ar" style="font-weight:900;">النظافة</td>
                                            <td class="latin l subject-id">Kebersihan</td>
                                            <td class="arab c num">${sikapBersih}</td>
                                        </tr>
                                        <tr>
                                            <td class="arab c num">٤</td>
                                            <td class="arab r subject-ar" style="font-weight:900;">الانضباط</td>
                                            <td class="latin l subject-id">Kedisiplinan</td>
                                            <td class="arab c num">${sikapDisiplin}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div class="sig-spacer-2"></div>
                            <div class="sig-date arab"><div>حريرا بكونينجان في</div><div class="sig-date-line">_______________________________</div></div>
                            <div class="sig-spacer-2"></div>

                            <div class="sig-grid arab" dir="rtl">
                                <div class="sig-col">
                                <div class="sig-title"><div class="arab">ولي الطالب / الطالبة</div><div class="latin">Orang Tua / Wali Santri</div></div>
                                    <div class="sig-gap"></div>
                                    <div class="sig-line"></div>
                                </div>
                                <div class="sig-col">
                                <div class="sig-title"><div class="arab">ولي الفصل</div><div class="latin">Wali Kelas</div></div>
                                    <div class="sig-gap"></div>
                                    <div class="sig-line"></div>
                                </div>
                                <div class="sig-col">
                                <div class="sig-title"><div class="arab">رئيس المدرسة</div><div class="latin">Kepala Madrasah</div></div>
                                    <div class="sig-gap"></div>
                                    <div class="sig-line"></div>
                                </div>
                            </div>

                            <div class="footer swap"><div class="pno">٢</div><div class="stu-name latin">${escapeHtml(namaLatin)}<span class="cls">(${escapeHtml(kelas)})</span></div></div>
                        </div>
                    </div>

                </div>
            `;

            _printHTML('RAPOR_' + kelas + '_' + s.nis, `<style>${css}</style>${html}`);
        }catch(e){
            console.error(e);
            showToast('Gagal print rapor: ' + (e.message||e), 'error');
        }
    }

    // Kompatibilitas: kalau ada kode lama yang memanggil printLeggerSantri
    // kita arahkan ke print rapor.
function printLeggerSantri(nis, kelas){
        return printRaporSantri(nis, kelas);
    }


function _parseKelasParts(k){
    const parts = String(k || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { jenjang:'', jurusan:'', paralel:'', kelas:'' };
    const jenjang = parts[0] || '';
    const paralel = parts.length >= 2 ? parts[parts.length - 1] : '';
    const jurusan = parts.length >= 3 ? parts.slice(1, -1).join(' ') : '';
    return { jenjang, jurusan, paralel, kelas: parts.join(' ') };
}

// Untuk ranking: group "per jenjang" yang diminta user adalah kombinasi seperti
// "X A" / "XI IPA" / "XII IPS" (mengabaikan paralel detail seperti A4).
function _rankJenjangKey(kelasStr){
    const p = _parseKelasParts(kelasStr);
    const j = (p.jenjang || '').trim();
    const jur = (p.jurusan || '').trim();
    const par = (p.paralel || '').trim();
    if (!j) return '';
    if (jur) return `${j} ${jur}`.trim();
    if (par) return `${j} ${par.charAt(0)}`.trim();
    return j;
}

function updateAdminLeggerKelasOptions(init=false){
    const jenSel = document.getElementById('flt-legger-jenjang');
    const jurSel = document.getElementById('flt-legger-jurusan');
    const kelasSel = document.getElementById('admin-legger-kelas');
    if (!jenSel || !jurSel || !kelasSel) return;

    const fJenjang = jenSel.value || '';
    const fJurusan = jurSel.value || '';

    const allKelas = Array.from(new Set((students || []).map(s => String(s.kelas||'').trim()).filter(Boolean)))
        .sort((a,b)=>a.localeCompare(b, 'id'));

    const filtered = allKelas.filter(k => {
        const p = _parseKelasParts(k);
        return (!fJenjang || p.jenjang === fJenjang) && (!fJurusan || p.jurusan === fJurusan);
    });

    const prev = kelasSel.value;
    kelasSel.innerHTML = filtered.map(k => `<option value="${k}">${k}</option>`).join('');
    if (filtered.includes(prev) && !init) kelasSel.value = prev;

    const selected = kelasSel.value || filtered[0] || '';
    const holder = document.getElementById('admin-legger-holder');
    if (holder && selected){
        holder.innerHTML = renderLeggerTableHTML(selected, 'table-legger-admin', 'Admin • ' + selected);
    } else if (holder){
        holder.innerHTML = `<div class="text-sm text-gray-600">Tidak ada data kelas untuk filter ini.</div>`;
    }
}

function renderAdminLegger(){
    const main = document.getElementById('main-content');

    const kelasAll = Array.from(new Set((students || []).map(s => String(s.kelas||'').trim()).filter(Boolean)))
        .sort((a,b)=>a.localeCompare(b, 'id'));

    const parts = kelasAll.map(k => _parseKelasParts(k));
    const jenjangList = Array.from(new Set(parts.map(p=>p.jenjang).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'id'));
    const jurusanList = Array.from(new Set(parts.map(p=>p.jurusan).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'id'));

    main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                    <h2 class="text-2xl font-bold">📊 Legger Santri</h2>
                    <div class="text-sm text-gray-600">Tampilan ini mengikuti filter kelas / jurusan / jenjang.</div>
                </div>
                <div class="flex flex-wrap gap-2 items-center justify-end">
                    <select id="flt-legger-jenjang" onchange="updateAdminLeggerKelasOptions()" class="border rounded px-3 py-2 text-sm">
                        <option value="">Semua Jenjang</option>
                        ${jenjangList.map(j=>`<option value="${j}">${j}</option>`).join('')}
                    </select>
                    <select id="flt-legger-jurusan" onchange="updateAdminLeggerKelasOptions()" class="border rounded px-3 py-2 text-sm">
                        <option value="">Semua Jurusan</option>
                        ${jurusanList.map(j=>`<option value="${j}">${j}</option>`).join('')}
                    </select>
                    <select id="admin-legger-kelas" onchange="updateAdminLeggerKelasOptions()" class="border rounded px-3 py-2 text-sm">
                        ${kelasAll.map(k=>`<option value="${k}">${k}</option>`).join('')}
                    </select>
                    <button onclick="exportLeggerXLSX(document.getElementById('admin-legger-kelas').value)" class="bg-green-700 text-white px-4 py-2 rounded font-bold shadow text-sm">XLSX</button>
                    <button onclick="printLeggerKelas(document.getElementById('admin-legger-kelas').value)" class="bg-gray-800 text-white px-4 py-2 rounded font-bold shadow text-sm">PDF</button>
                </div>
            </div>
            <div id="admin-legger-holder" class="bg-white rounded-xl border shadow-sm p-4">
                ${kelasAll[0] ? renderLeggerTableHTML(kelasAll[0], 'table-legger-admin', 'Admin • ' + kelasAll[0]) : `<div class="text-sm text-gray-600">Belum ada data kelas.</div>`}
            </div>
        </div>
    `;
    updateAdminLeggerKelasOptions(true);
}


function renderAdminRanking() {
    const main = document.getElementById('main-content');
    const { rows, tahun_ajar, semester } = _getAllLeggerRowsForRanking();

    const kelasList = Array.from(new Set(rows.map(r => r.kelas).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'));
    const jurusanList = Array.from(new Set(rows.map(r => r.jurusan_key).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'));
    const jenjangList = Array.from(new Set(rows.map(r => r.jenjang).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'));
main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                    <h2 class="text-2xl font-bold">🏆 Ranking / Juara 3 Terbaik</h2>
                    <div class="text-sm text-gray-600">Berdasarkan <b>Rata-rata</b> nilai rapor (mengikuti bobot nilai & data legger).</div>
                    <div class="text-xs text-gray-500 mt-1">Periode aktif: <b>${tahun_ajar}</b> • Semester: <b>${semester}</b></div>
                </div>
                <div class="flex flex-wrap gap-2 items-center justify-end">
                    <button onclick="renderAdminRanking()" class="bg-gray-700 text-white px-4 py-2 rounded font-bold shadow text-sm">↻ Refresh</button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                    <label class="text-xs font-bold text-gray-600">Tipe Ranking</label>
                    <select id="rank-scope" class="w-full border rounded px-3 py-2 text-sm">
                        <option value="kelas">Per Kelas</option>
                        <option value="jurusan">Per Jurusan</option>
                        <option value="jenjang">Per Jenjang</option>
                        <option value="umum">Juara Umum</option>
                    </select>
                </div>

                <div id="rank-key-wrap">
                    <label id="rank-key-label" class="text-xs font-bold text-gray-600">Filter</label>
                    <select id="rank-key" class="w-full border rounded px-3 py-2 text-sm"></select>
                </div>

                <div class="flex items-end justify-end gap-2">
                    <button id="btn-export-ranking" class="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded font-bold shadow text-sm">XLSX</button>
                    <button onclick="exportRankingPDF()" class="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded font-bold shadow text-sm">PDF</button>
                </div>
            </div>

            <div id="rank-result" class="mt-2"></div>
        </div>
    `;

    const scopeSel = document.getElementById('rank-scope');
    const keyWrap = document.getElementById('rank-key-wrap');
    const keySel = document.getElementById('rank-key');
    const keyLabel = document.getElementById('rank-key-label');
    const btnExport = document.getElementById('btn-export-ranking');

    const setKeyOptions = () => {
        const scope = scopeSel.value;
        let opts = [];
        if (scope === 'kelas') {
            keyWrap.classList.remove('hidden');
            keyLabel.innerText = 'Kelas';
            opts = kelasList;
        } else if (scope === 'jurusan') {
            keyWrap.classList.remove('hidden');
            keyLabel.innerText = 'Jurusan';
            opts = jurusanList;
        } else if (scope === 'jenjang') {
            keyWrap.classList.remove('hidden');
            keyLabel.innerText = 'Jenjang';
            opts = jenjangList;
        } else {
            keyWrap.classList.add('hidden');
            opts = [];
        }

        keySel.innerHTML = opts.map(v => `<option value="${v}">${v}</option>`).join('');
        if (opts.length === 0) keySel.value = '';
    };

    const renderTop3 = () => {
        const scope = scopeSel.value;
        const key = keySel.value;

        const _eq = (x, y) => String(x || '').trim() === String(y || '').trim();
        let filtered = rows;

        if (scope === 'kelas') filtered = rows.filter(r => _eq(r.kelas, key));
        if (scope === 'jurusan') filtered = rows.filter(r => _eq(r.jurusan_key, key));
        if (scope === 'jenjang') filtered = rows.filter(r => _eq(r.jenjang, key));
        if (scope === 'umum') filtered = rows;

        const sorted = _sortRankingRows(filtered);
        const top = sorted.slice(0, 3);

        const title =
            scope === 'kelas' ? `Kelas <b>${key || '-'}</b>` :
            scope === 'jurusan' ? `Jurusan <b>${key || '-'}</b>` :
            scope === 'jenjang' ? `Jenjang <b>${key || '-'}</b>` :
            `Juara Umum`;

        const empty = (!top.length)
            ? `<div class="p-4 bg-yellow-50 border rounded text-sm text-gray-700">Data belum tersedia untuk scope ini (atau nilai belum masuk).</div>`
            : '';

        const rowsHtml = top.map((r, i) => `
            <tr class="hover:bg-gray-50">
                <td class="p-2 border text-center font-bold">${i + 1}</td>
                <td class="p-2 border text-center font-mono">${r.nis || '-'}</td>
                <td class="p-2 border text-left font-semibold"><div class="single-line w-72" title="${r.nama}">${r.nama || '-'}</div></td>
                <td class="p-2 border text-center">${r.kelas || '-'}</td>
                <td class="p-2 border text-center">${r.jk || '-'}</td>
                <td class="p-2 border text-center font-bold">${(Number(r.rata || 0) ? (Math.round(Number(r.rata) * 100) / 100) : 0)}</td>
            </tr>
        `).join('');

        document.getElementById('rank-result').innerHTML = `
            <div class="text-sm text-gray-600 mb-2">Top 3 • ${title}</div>
            ${empty}
            ${top.length ? `
            <div class="overflow-x-auto">
                <table class="w-full text-sm border std-table whitespace-nowrap">
                    <thead class="bg-blue-700 text-white">
                        <tr>
                            <th class="p-2 border w-16">Rank</th>
                            <th class="p-2 border w-28">NIS</th>
                            <th class="p-2 border text-left">Nama</th>
                            <th class="p-2 border w-28">Kelas</th>
                            <th class="p-2 border w-16">JK</th>
                            <th class="p-2 border w-24">Rata-rata</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>` : ''}
        `;
        window.__lastRankingHTML = document.getElementById('rank-result').innerHTML;
        window.__lastRankingTitle = title;

        btnExport.onclick = () => exportRankingXLSX(scope, (scope === 'umum' ? '' : key));
    };

    setKeyOptions();
    renderTop3();

    scopeSel.addEventListener('change', () => { setKeyOptions(); renderTop3(); });
    keySel.addEventListener('change', renderTop3);
}

// --- IMPORT & EXPORT LOGIC ---
    let importContext = {};
    function triggerImport(type, p1, p2) {
        importContext = { type, p1, p2 };
        document.getElementById('file-import').value = '';
        document.getElementById('file-import').click();
    }
    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
                previewImport(data);
            } catch (err) { console.error(err); showToast('Gagal: ' + err.message, 'error'); }
        };
        reader.readAsBinaryString(file);
    });

    // FUNGSI PREVIEW UNIVERSAL
    function previewImport(data) {
        if (!data || data.length === 0) { showToast("Excel Kosong", 'error'); return; }
        const type = importContext.type;

        // ADMIN: DATA GURU (Handling Mapel String -> JSON)
        if (type === 'guru') {
             window.tempImportDataGuru = data.map(row => {
                 let mapelArr = [];
                 if(row.Mapel_Ajar && typeof row.Mapel_Ajar === 'string') {
                     const parts = row.Mapel_Ajar.split(';');
                     parts.forEach(p => {
                         const match = p.trim().match(/([^(]+)\(([^)]+)\)/);
                         if(match) {
                             const mName = match[1].trim();
                             const mKelas = match[2].split(',').map(c=>c.trim()).filter(c=>c);
                             if(mName && mKelas.length > 0) mapelArr.push({nama: mName, kelas: mKelas});
                         }
                     });
                 }
                 return {
                    id: null, name: row.Nama, username: row.Username, password: row.Password || '123456',
                    role: row.Role || 'guru', kelas_wali: row.Wali_Kelas, musyrif: row.Musyrif,
                    jk: row.LP, // Added LP
                    mapel: mapelArr 
                 };
             });
             renderAdminGuru();
             showToast(`Preview ${data.length} Data Guru. Klik Simpan.`, 'success');
             return;
        }
        
        // ADMIN: DATA SANTRI (Handling JK)
                if (type === 'santri') {
             window.tempImportDataSantri = data.map(row => ({
                id: null,
                nis: (typeof _toNIS === 'function' ? _toNIS(row.NIS) : row.NIS),
                name: (row.Nama_Santri ?? row.Nama ?? row.NamaSantri ?? row.NAMA ?? row.NAMA_SANTRI),
                nama_arab: (row.Nama_Arab ?? row.NamaArab ?? row.NAMA_ARAB ?? row.nama_arab ?? row.namaArab),
                kelas: row.Kelas,
                jk: (row.JK ?? row.LP),

                ttl: row.TTL,
                status_keluarga: row.Status_Keluarga,
                anak_ke: row.Anak_Ke,
                asal_sekolah: row.Asal_Sekolah,
                tanggal_diterima: row.Tanggal_Diterima,
                diterima_kelas: row.Diterima_Kelas,

                nama_ayah: row.Nama_Ayah,
                nama_ibu: row.Nama_Ibu,
                pekerjaan_ayah: row.Pekerjaan_Ayah,
                pekerjaan_ibu: row.Pekerjaan_Ibu,
                alamat_ortu: row.Alamat_Ortu,

                nama_wali: row.Nama_Wali,
                pekerjaan_wali: row.Pekerjaan_Wali,
                alamat_wali: row.Alamat_Wali
             }));
             renderAdminSantri();
             showToast(`Preview ${data.length} Data Santri. Klik Simpan.`, 'success');
             return;
        
        // WALI KELAS: DATA KELAS (Import roster)
        if (type === 'wali_data') {
            const kelas = importContext.p1;
            window.tempWaliDataSantri = data.map(row => ({
                id: null,
                nis: (typeof _toNIS === 'function' ? _toNIS(_get(row, ['NIS','nis','Nis'])) : _get(row, ['NIS','nis','Nis'])),
                name: _get(row, ['Nama','Nama_Santri','Nama Santri','nama_santri']),
                jk: _get(row, ['JK','jk','LP','lp','L/P','L_P']),
                ttl: _get(row, ['TTL','ttl'])
            })).filter(x => x.nis && x.name);

            renderWaliPage('data');
            showToast(`Preview ${window.tempWaliDataSantri.length} Data Kelas. Klik Simpan.`, 'success');
            return;
        }

}

        // NILAI/WALI/MUSYRIF (ISI INPUT)
        // FIX: sebelumnya cari td[data-name] (tidak ada), sehingga import selalu 0.
        // Sekarang kita pakai NIS sebagai kunci (lebih stabil) via atribut data-nis di input/textarea.
        let filledCount = 0;
        const _cssEscape = (s) => (window.CSS && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/[\\"\']/g, '\$&');
        const _normKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const _rowNorm = (row) => {
            const m = {};
            if (!row) return m;
            Object.keys(row).forEach(k => { m[_normKey(k)] = row[k]; });
            return m;
        };
        const _getRowNIS = (row) => {
            const rn = _rowNorm(row);
            const raw = row?.NIS ?? row?.Nis ?? row?.nis ?? row?.['N I S'] ?? row?.['NIS '] ?? rn['nis'] ?? '';
            return (typeof _toNIS === 'function') ? _toNIS(raw) : String(raw || '').trim();
        };
        const _findInputs = (row) => {
            const nis = _getRowNIS(row);
            if (nis) return Array.from(document.querySelectorAll(`[data-nis="${_cssEscape(nis)}"]`));
            const rn = _rowNorm(row);
            const nm = (row?.Nama ?? row?.nama ?? row?.Nama_Santri ?? rn['nama'] ?? rn['namasantri'] ?? '').toString().trim();
            if (!nm) return [];
            return Array.from(document.querySelectorAll(`[data-name="${_cssEscape(nm)}"]`));
        };

        const _get = (row, keys) => {
            const rn = _rowNorm(row);
            for (const k of keys) {
                if (row && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
                const nk = _normKey(k);
                if (rn[nk] !== undefined && rn[nk] !== null && String(rn[nk]).trim() !== '') return rn[nk];
            }
            return undefined;
        };

        data.forEach(row => {
            const inputs = _findInputs(row);
            if (inputs.length === 0) return;
            filledCount++;

            if (type === 'mapel') {
                const vHadir = _get(row, ['Hadir','hadir','KEHADIRAN']);
                const vUH1 = _get(row, ['UH1','uh1']);
                const vUH2 = _get(row, ['UH2','uh2']);
                const vUH3 = _get(row, ['UH3','uh3']);
                const vUH4 = _get(row, ['UH4','uh4']);
                const vUH5 = _get(row, ['UH5','uh5']);
                const vTugas = _get(row, ['Tugas','tugas']);
                const vPAS = _get(row, ['PAS/PAT','PAS_PAT','PASPAT','PAS','pas']);

                inputs.forEach(inp => {
                    const f = inp.dataset.field;
                    if(f==='kehadiran' && vHadir!==undefined) inp.value = vHadir;
                    if(f==='uh1' && vUH1!==undefined) inp.value = vUH1;
                    if(f==='uh2' && vUH2!==undefined) inp.value = vUH2;
                    if(f==='uh3' && vUH3!==undefined) inp.value = vUH3;
                    if(f==='uh4' && vUH4!==undefined) inp.value = vUH4;
                    if(f==='uh5' && vUH5!==undefined) inp.value = vUH5;
                    if(f==='tugas' && vTugas!==undefined) inp.value = vTugas;
                    if(f==='pas_pat' && vPAS!==undefined) inp.value = vPAS;
                });
            } else if (type === 'absen') {
                const vSakit = _get(row, ['S','Sakit','SAKIT','sakit']);
                const vIzin  = _get(row, ['I','Izin','IZIN','izin']);
                const vAlpha = _get(row, ['A','Alpha','ALPHA','Alpa','alpa','alpha']);
                const vAkhlak = _get(row, ['Akhlak','Sikap_Akhlak','Sikap Akhlak','akhlak']);
                const vKerajinan = _get(row, ['Kerajinan','Sikap_Kerajinan','Sikap Kerajinan','kerajinan']);
                const vDisiplin = _get(row, ['Disiplin','Sikap_Disiplin','Sikap Disiplin','kedisiplinan']);
                const vBersih = _get(row, ['Bersih','Kebersihan','Sikap_Bersih','Sikap Kebersihan','kebersihan']);

                inputs.forEach(inp => {
                    const f = inp.dataset.field;
                    if(f==='hadir_s' && vSakit!==undefined) inp.value = vSakit;
                    if(f==='hadir_i' && vIzin!==undefined) inp.value = vIzin;
                    if(f==='hadir_a' && vAlpha!==undefined) inp.value = vAlpha;
                    if(f==='akhlak' && vAkhlak!==undefined) inp.value = vAkhlak;
                    if(f==='kerajinan' && vKerajinan!==undefined) inp.value = vKerajinan;
                    if(f==='kedisiplinan' && vDisiplin!==undefined) inp.value = vDisiplin;
                    if(f==='kebersihan' && vBersih!==undefined) inp.value = vBersih;
                });
            } else if (type === 'catatan') {
                const vCat = _get(row, ['Catatan','Catatan_Wali','Catatan Wali','CatatanWali','catatan']);
                const vP1  = _get(row, ['Prestasi 1','Prestasi_1','Prestasi1','Prestasi','prestasi1','prestasi']);
                const vP2  = _get(row, ['Prestasi 2','Prestasi_2','Prestasi2','prestasi2']);
                const vP3  = _get(row, ['Prestasi 3','Prestasi_3','Prestasi3','prestasi3']);

                inputs.forEach(inp => {
                    const f = inp.dataset.field;
                    if(f==='catatan' && vCat!==undefined) inp.value = vCat;
                    if(f==='prestasi1' && vP1!==undefined) inp.value = vP1;
                    if(f==='prestasi2' && vP2!==undefined) inp.value = vP2;
                    if(f==='prestasi3' && vP3!==undefined) inp.value = vP3;
                });
            } else if (type === 'musyrif') {
                const vWajib = _get(row, ['Hafalan_Wajib','HafalanWajib','wajib']);
                const vMuro  = _get(row, ['Murojaah','murojaah','Hafalan_Murojaah']);
                const vZiy   = _get(row, ['Ziyadah','ziyadah']);
                const vFash  = _get(row, ['Fashohah','fashohah']);

                inputs.forEach(inp => {
                    const f = inp.dataset.field;
                    if(f==='hafalan_wajib' && vWajib!==undefined) inp.value = vWajib;
                    if(f==='hafalan_murojaah' && vMuro!==undefined) inp.value = vMuro;
                    if(f==='ziyadah' && vZiy!==undefined) inp.value = vZiy;
                    if(f==='fashohah' && vFash!==undefined) inp.value = vFash;
                });
            }
        });

        showToast(`${filledCount} baris terisi. Klik Simpan.`, 'success');
    }

    async function saveAdminImport(type) {
        setLoading(true, "Menyimpan Data Import...");
        try {
            if (type === 'guru' && window.tempImportDataGuru) {
                let _doneGuru = 0;
                const _totalGuru = window.tempImportDataGuru.length;
                for (const u of window.tempImportDataGuru) {
                     // FIX: Remove 'classes' property (bug 400 bad request)
                     const payload = {
                        name: u.name, username: u.username, password: u.password,
                        role: u.role, wali: u.kelas_wali, musyrif: u.musyrif, 
                        jk: (u.jk || u.lp), mapel: u.mapel
                     };
                     const exist = users.find(x => x.username === u.username);
                     if(exist) await updateGuruInDB(exist.id, payload); else await addGuruToDB(payload);
                     _doneGuru++;
                     if(_totalGuru) setLoadingProgress(Math.round((_doneGuru/_totalGuru)*100), `Menyimpan Guru (${_doneGuru}/${_totalGuru})`);
                }
                window.tempImportDataGuru = null;
            } 
            else if (type === 'santri' && window.tempImportDataSantri) {
                await upsertSantriBatchByNIS(window.tempImportDataSantri, {
                    batchSize: 200,
                    onProgress: (pct, lbl) => setLoadingProgress(pct, `Menyimpan ${lbl}`)
                });
                window.tempImportDataSantri = null;
            }
            setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
            if(type==='guru') renderAdminGuru(); else renderAdminSantri();
            showToast('Import Berhasil Disimpan!', 'success');
        } catch(e) { console.error(e); showToast('Gagal Simpan: '+e.message, 'error'); }
        setLoading(false);
    }

        function downloadExcelGuru() {
        if (!users.length) return;
        const data = users.map(u => ({
            Nama: u.name,
            Username: u.username,
            Password: u.password,
            Role: (u.role || 'guru'),
            JK: u.jk || u.lp || '',
            Wali_Kelas: u.wali || u.kelas_wali || '',
            Musyrif: u.musyrif || '',
            Mapel_Ajar: parseMapelData(u.mapel).map(m=>`${m.nama}(${m.kelas})`).join(';')
        }));
        saveExcel(data, "Data_Guru.xlsx", [{wch:30}, {wch:15}, {wch:10}, {wch:10}, {wch:5}, {wch:10}, {wch:10}, {wch:40}]);
    }

    function downloadExcelSantri() {
        if (!students.length) return;

        const mapData = students.map(s => ({
            NIS: s.nis,
            Nama_Santri: s.name,
            JK: s.jk || s.lp || '',
            Kelas: s.kelas || '',
            TTL: s.ttl || '',
            Status_Keluarga: s.status_keluarga || '',
            Anak_Ke: s.anak_ke ?? '',
            Asal_Sekolah: s.asal_sekolah || '',
            Tanggal_Diterima: s.tanggal_diterima || '',
            Diterima_Kelas: s.diterima_kelas || '',
            Nama_Ayah: s.nama_ayah || '',
            Nama_Ibu: s.nama_ibu || '',
            Pekerjaan_Ayah: s.pekerjaan_ayah || '',
            Pekerjaan_Ibu: s.pekerjaan_ibu || '',
            Alamat_Ortu: s.alamat_ortu || '',
            Nama_Wali: s.nama_wali || '',
            Pekerjaan_Wali: s.pekerjaan_wali || '',
            Alamat_Wali: s.alamat_wali || ''
        }));

        saveExcel(
            mapData,
            "Data_Santri_Lengkap.xlsx",
            [
                {wch:15},{wch:30},{wch:5},{wch:10},{wch:25},{wch:18},{wch:10},{wch:25},
                {wch:15},{wch:15},{wch:25},{wch:25},{wch:20},{wch:20},{wch:30},
                {wch:25},{wch:20},{wch:30}
            ]
        );
    }

    function exportExcelNilai(mapel, kelas) {
        const siswa = students.filter(s => s.kelas === kelas);
        const data = siswa.map(s => {
            const { tahun_ajar, semester } = getActivePeriode();
            const sc = scores.find(x => String(x.nis) === String(s.nis) && x.mapel === mapel && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
            return {NIS: s.nis, Nama: s.name, Kelas: kelas, Mapel: mapel, Hadir: sc.kehadiran||0, Tugas: sc.tugas||0, UH1: sc.uh1||0, UH2: sc.uh2||0, UH3: sc.uh3||0, UH4: sc.uh4||0, UH5: sc.uh5||0, "PAS/PAT": sc.pas_pat||sc.pas||0};
        });
        saveExcel(data, `Nilai_${mapel}_${kelas}.xlsx`, [{wch:15}, {wch:30}]);
    }
    function exportExcelWali(mode, kelas) {
        const siswa = students.filter(s => s.kelas === kelas);
        let data = [];
        if (mode === 'data') {
            data = siswa.map((s, i) => ({
                No: i + 1,
                NIS: s.nis,
                Nama: s.name,
                JK: s.jk||s.lp||'',
                Kelas: s.kelas||'',
                TTL: s.ttl||'',
                Status_Keluarga: s.status_keluarga||'',
                Anak_Ke: (s.anak_ke ?? ''),
                Asal_Sekolah: s.asal_sekolah||'',
                Tanggal_Diterima: s.tanggal_diterima||'',
                Diterima_Kelas: s.diterima_kelas||'',
                Nama_Ayah: s.nama_ayah||'',
                Nama_Ibu: s.nama_ibu||'',
                Pekerjaan_Ayah: s.pekerjaan_ayah||'',
                Pekerjaan_Ibu: s.pekerjaan_ibu||'',
                Alamat_Ortu: s.alamat_ortu||'',
                Nama_Wali: s.nama_wali||'',
                Pekerjaan_Wali: s.pekerjaan_wali||'',
                Alamat_Wali: s.alamat_wali||'',
            }));
        } else if(mode==='absen') {
             data = siswa.map(s => {
                const { tahun_ajar, semester } = getActivePeriode();
                const sc = waliScores.find(x => String(x.nis)===String(s.nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                return {
                    NIS: s.nis,
                    Nama: s.name,
                    S: sc.hadir_s||0,
                    I: sc.hadir_i||0,
                    A: sc.hadir_a||0,
                    Akhlak: sc.akhlak||'-',
                    Kerajinan: sc.kerajinan||'-',
                    Kebersihan: sc.kebersihan||'-',
                    Kedisiplinan: sc.kedisiplinan||'-',
                };
            });
        } else if (mode === 'catatan') {
            data = siswa.map(s => {
                const { tahun_ajar, semester } = getActivePeriode();
                const sc = waliScores.find(x => String(x.nis)===String(s.nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                return {
                    NIS: s.nis,
                    Nama: s.name,
                    Catatan: sc.catatan||'-',
                    'Prestasi 1': sc.prestasi1||'-',
                    'Prestasi 2': sc.prestasi2||'-',
                    'Prestasi 3': sc.prestasi3||'-',
                };
            });
        }
        saveExcel(data, `Wali_${mode}_${kelas}.xlsx`, [{wch:30}]);
    }
function exportExcelMusyrif(kelas) {
        const siswa = students.filter(s => s.kelas === kelas);
        const data = siswa.map(s => {
            const { tahun_ajar, semester } = getActivePeriode();
            const sc = musyrifScores.find(x => String(x.nis)===String(s.nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
            return { NIS: s.nis, Nama: s.name, Kelas: kelas, Hafalan_Wajib: sc.hafalan_wajib||0, Murojaah: sc.hafalan_murojaah||0, Ziyadah: sc.ziyadah||0, Fashohah: sc.fashohah||0 };
        });
        saveExcel(data, `Hafalan_${kelas}.xlsx`, [{wch:15}, {wch:30}]);
    }
    function saveExcel(json, filename, colWidths = []) {
        const ws = XLSX.utils.json_to_sheet(json);
        if(colWidths.length > 0) ws['!cols'] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, filename);
    }

    // --- UTILS ---
    function setLoading(active, text="Memproses...") {
        const ov = document.getElementById('loading-overlay');
        document.getElementById('loading-text').innerText = text;
        if(active) ov.classList.remove('hidden'); else ov.classList.add('hidden');
    }

    // Progress overlay helper (dipakai saat fetch bertahap & simpan batch)
    // pct: 0..100
    function setLoadingProgress(pct, label = '') {
        const ov = document.getElementById('loading-overlay');
        const textEl = document.getElementById('loading-text');
        const wrap = document.getElementById('loading-progress-wrap');
        const bar = document.getElementById('loading-progress-bar');
        const pctEl = document.getElementById('loading-progress-text');

        // Pastikan overlay tampil
        ov.classList.remove('hidden');

        const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
        if (label) textEl.innerText = label;

        // Tampilkan progress bar
        wrap.classList.remove('hidden');
        bar.style.width = safePct + '%';
        pctEl.innerText = safePct + '%';
    }

    // Opsional: sembunyikan progress bar (overlay tetap bisa dipakai)
    function resetLoadingProgress() {
        const wrap = document.getElementById('loading-progress-wrap');
        const bar = document.getElementById('loading-progress-bar');
        const pctEl = document.getElementById('loading-progress-text');
        if (wrap) wrap.classList.add('hidden');
        if (bar) bar.style.width = '0%';
        if (pctEl) pctEl.innerText = '0%';
    }
    function showToast(msg, type='info') {
        const t = document.getElementById('toast');
        document.getElementById('toast-msg').innerText = msg;
        t.className = `fixed bottom-5 right-5 px-6 py-3 rounded shadow-lg flex items-center gap-3 z-50 text-white ${type === 'error' ? 'bg-red-600' : type==='success'?'bg-green-600':'bg-gray-800'}`;
        t.classList.remove('translate-y-20');
        setTimeout(() => t.classList.add('translate-y-20'), 3000);
    }
    // Sidebar (mobile offcanvas)
    function openSidebar() {
        const sb = document.getElementById('sidebar');
        const bd = document.getElementById('sidebar-backdrop');
        if (sb) sb.classList.remove('-translate-x-full');
        if (bd) bd.classList.remove('hidden');
    }
    function closeSidebar() {
        const sb = document.getElementById('sidebar');
        const bd = document.getElementById('sidebar-backdrop');
        // Only force-close on mobile (desktop uses md:translate-x-0)
        if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
            if (sb) sb.classList.add('-translate-x-full');
            if (bd) bd.classList.add('hidden');
        } else {
            if (bd) bd.classList.add('hidden');
        }
    }
    function toggleSidebar() {
        const sb = document.getElementById('sidebar');
        if (!sb) return;
        const isClosed = sb.classList.contains('-translate-x-full');
        if (isClosed) openSidebar(); else closeSidebar();
    }
    function logout() { localStorage.removeItem('erapor_user'); window.location.href = 'index.html'; }
    function filterTable(tbodyId) {
        const filter = document.activeElement.value.toUpperCase();
        const tr = document.getElementById(tbodyId).getElementsByTagName('tr');
        for (let i = 0; i < tr.length; i++) {
            const td = tr[i].getElementsByClassName('filter-target')[0];
            if (td) tr[i].style.display = (td.textContent || td.innerText).toUpperCase().indexOf(filter) > -1 ? "" : "none";
        }
    }
    function enableArrowNavigation(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.tBodies && table.tBodies[0];
        if (!tbody) return;

        table.addEventListener('keydown', (e) => {
            if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;

            const active = document.activeElement;
            if (!active) return;
            if (!['INPUT','TEXTAREA','SELECT'].includes(active.tagName)) return;

            const td = active.closest('td');
            const tr = active.closest('tr');
            if (!td || !tr) return;

            const rows = Array.from(tbody.rows);
            const r0 = rows.indexOf(tr);
            if (r0 < 0) return;

            let r = r0;
            let c = td.cellIndex;

            const getCellInput = (ri, ci) => {
                const row = rows[ri];
                if (!row) return null;
                const cell = row.cells[ci];
                if (!cell) return null;
                return cell.querySelector('input, textarea, select');
            };

            const move = (dr, dc) => {
                let nr = r + dr;
                let nc = c + dc;

                // batas
                nr = Math.max(0, Math.min(rows.length - 1, nr));
                nc = Math.max(0, Math.min((rows[nr]?.cells?.length || 1) - 1, nc));

                // cari sel yang punya input
                const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
                const stepC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);

                let guard = 0;
                while (guard++ < 500) {
                    const inp = getCellInput(nr, nc);
                    if (inp) return { nr, nc, inp };

                    // geser sesuai arah utama
                    if (stepC !== 0) {
                        nc += stepC;
                        if (nc < 0 || nc >= (rows[nr]?.cells?.length || 0)) break;
                    } else if (stepR !== 0) {
                        nr += stepR;
                        if (nr < 0 || nr >= rows.length) break;
                        // sesuaikan kolom di row baru
                        nc = Math.max(0, Math.min((rows[nr]?.cells?.length || 1) - 1, c));
                    } else {
                        break;
                    }
                }
                return null;
            };

            let found = null;
            if (e.key === 'ArrowUp') found = move(-1, 0);
            if (e.key === 'ArrowDown') found = move(1, 0);
            if (e.key === 'ArrowLeft') found = move(0, -1);
            if (e.key === 'ArrowRight') found = move(0, 1);

            if (found && found.inp) {
                e.preventDefault();
                found.inp.focus();
                if (['INPUT','TEXTAREA'].includes(found.inp.tagName) && typeof found.inp.select === 'function') found.inp.select();
            }
        });
    }

    // --- Indikator perubahan & validasi nilai (maks 100) ---
    window._indicatorOptsByTable = window._indicatorOptsByTable || {};

    function _updateOneIndicator(el, opts) {
        if (!el) return;
        const saved = (el.dataset.savedValue ?? '');
        const cur = (el.value ?? '');

        const isUnsaved = String(cur) !== String(saved);

        // over-max (khusus input number tertentu)
        const field = String(el.dataset.field || '');
        const exclude = opts?.excludeFields || new Set();
        const checkMax100 = !!opts?.max100 && el.tagName === 'INPUT' && String(el.type || '').toLowerCase() === 'number' && !exclude.has(field);

        let isOver = false;
        if (checkMax100) {
            const n = (cur === '' ? NaN : Number(cur));
            isOver = Number.isFinite(n) && n > 100;
            // bantu UX: set atribut max supaya keyboard mobile aware (tapi tetap boleh lewat import)
            try { el.max = '100'; } catch (_) {}
        }

        // reset classes
        el.classList.remove('ring-2', 'ring-orange-300', 'ring-pink-400', 'bg-pink-200');

        if (isOver) {
            el.classList.add('bg-pink-200', 'ring-2', 'ring-pink-400');
        } else if (isUnsaved) {
            el.classList.add('ring-2', 'ring-orange-300');
        }
    }

    function attachInputIndicators(tableId, opts = {}) {
        const table = document.getElementById(tableId);
        if (!table) return;

        if (!window._indicatorOptsByTable) window._indicatorOptsByTable = {};
        window._indicatorOptsByTable[tableId] = opts;

        const els = table.querySelectorAll('input, textarea, select');
        els.forEach(el => {
            if (el.dataset.savedValue === undefined) el.dataset.savedValue = (el.value ?? '');

            const handler = () => _updateOneIndicator(el, opts);
            el.addEventListener('input', handler);
            el.addEventListener('change', handler);
            handler();
        });
    }

    function refreshInputIndicators(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const opts = window._indicatorOptsByTable?.[tableId] || {};
        const els = table.querySelectorAll('input, textarea, select');
        els.forEach(el => {
            if (el.dataset.savedValue === undefined) el.dataset.savedValue = (el.value ?? '');
            _updateOneIndicator(el, opts);
        });
    }

    function markTableSaved(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const opts = window._indicatorOptsByTable?.[tableId] || {};
        const els = table.querySelectorAll('input, textarea, select');
        els.forEach(el => {
            el.dataset.savedValue = (el.value ?? '');
            _updateOneIndicator(el, opts);
        });
    }


    function addMapelRow(n='', k=[]) {
        const div = document.createElement('div');
        div.className = "flex gap-2 items-start mapel-row border-b pb-2 mb-2";
        div.innerHTML = `
            <div class="flex-1 space-y-1">
                <input type="text" class="inp-mapel-name w-full border p-1 rounded text-sm" placeholder="Nama Mapel (ex: Matematika)" value="${n}">
                <input type="text" class="inp-mapel-kelas w-full border p-1 rounded text-sm" placeholder="Kelas (ex: 10-A, 10-B)" value="${k.join(', ')}">
            </div>
            <button onclick="this.parentElement.remove()" class="text-red-500 font-bold px-2">x</button>`;
        document.getElementById('mapel-container').appendChild(div);
    }

        function openModal(type) {
        document.getElementById('admin-modal').classList.remove('hidden');
        document.querySelectorAll('#admin-modal input').forEach(i => i.value = '');
        document.querySelectorAll('#admin-modal select').forEach(i => i.value = '');
        document.getElementById('edit-id').value = '';
        document.getElementById('mapel-container').innerHTML = '';

        if (type === 'santri') {
            document.getElementById('modal-title').innerText = 'Form Data Santri';
            document.getElementById('form-santri-fields').classList.remove('hidden');
            document.getElementById('form-guru-fields').classList.add('hidden');
        } else {
            document.getElementById('modal-title').innerText = 'Form Data Guru';
            document.getElementById('form-santri-fields').classList.add('hidden');
            document.getElementById('form-guru-fields').classList.remove('hidden');
            // default role guru
            if (document.getElementById('inp-role')) document.getElementById('inp-role').value = 'guru';
            addMapelRow();
        }
    }

    function closeModal() { document.getElementById('admin-modal').classList.add('hidden'); }
    
        function editGuru(id) {
        const u = users.find(x => x.id == id);
        if (!u) { showToast('Data guru tidak ditemukan.', 'error'); return; }
        openModal('guru');
        document.getElementById('edit-id').value = u.id;
        document.getElementById('inp-nama').value = u.name || u.nama_guru || '';
        document.getElementById('inp-username').value = u.username || '';
        document.getElementById('inp-kelas-wali').value = getWaliKelas(u);
        document.getElementById('inp-musyrif').value = u.musyrif || '';
        document.getElementById('inp-role').value = (u.role || 'guru');
        document.getElementById('inp-jk-guru').value = (u.jk || u.lp || '');

        const mapelData = parseMapelData(u.mapel);
        document.getElementById('mapel-container').innerHTML = '';
        if (mapelData.length > 0) mapelData.forEach(m => addMapelRow(m.nama, m.kelas));
        else addMapelRow();
    }

    function editSantri(id) {
        const s = students.find(x => x.id == id);
        if (!s) { showToast('Data santri tidak ditemukan.', 'error'); return; }
        openModal('santri');
        document.getElementById('edit-id').value = s.id;
        document.getElementById('inp-nama').value = s.name || s.nama_santri || '';
        if (document.getElementById('inp-nama-arab')) document.getElementById('inp-nama-arab').value = s.nama_arab || s.name_arab || '';
        document.getElementById('inp-nis').value = s.nis || '';
        document.getElementById('inp-kelas').value = s.kelas || '';
        if (document.getElementById('inp-jk-santri')) document.getElementById('inp-jk-santri').value = s.jk || s.lp || '';

        // kolom lengkap
        document.getElementById('inp-ttl').value = s.ttl || '';
        document.getElementById('inp-status-keluarga').value = s.status_keluarga || '';
        document.getElementById('inp-anak-ke').value = (s.anak_ke ?? '');
        document.getElementById('inp-asal-sekolah').value = s.asal_sekolah || '';
        document.getElementById('inp-tanggal-diterima').value = s.tanggal_diterima || '';
        document.getElementById('inp-diterima-kelas').value = s.diterima_kelas || '';
        document.getElementById('inp-nama-ayah').value = s.nama_ayah || '';
        document.getElementById('inp-nama-ibu').value = s.nama_ibu || '';
        document.getElementById('inp-pekerjaan-ayah').value = s.pekerjaan_ayah || '';
        document.getElementById('inp-pekerjaan-ibu').value = s.pekerjaan_ibu || '';
        document.getElementById('inp-alamat-ortu').value = s.alamat_ortu || '';
        document.getElementById('inp-nama-wali').value = s.nama_wali || '';
        document.getElementById('inp-pekerjaan-wali').value = s.pekerjaan_wali || '';
        document.getElementById('inp-alamat-wali').value = s.alamat_wali || '';
    }


    async function saveData() {
        setLoading(true, "Menyimpan...");
        const id = document.getElementById('edit-id').value;
        const isSantri = !document.getElementById('form-santri-fields').classList.contains('hidden');
        try {
            if (isSantri) {
                const data = {
                    name: document.getElementById('inp-nama').value,
                    nama_arab: (document.getElementById('inp-nama-arab') ? document.getElementById('inp-nama-arab').value : ''),
                    nis: document.getElementById('inp-nis').value,
                    kelas: document.getElementById('inp-kelas').value,
                    jk: document.getElementById('inp-jk-santri').value,

                    ttl: document.getElementById('inp-ttl').value,
                    status_keluarga: document.getElementById('inp-status-keluarga').value,
                    anak_ke: document.getElementById('inp-anak-ke').value,
                    asal_sekolah: document.getElementById('inp-asal-sekolah').value,
                    tanggal_diterima: document.getElementById('inp-tanggal-diterima').value,
                    diterima_kelas: document.getElementById('inp-diterima-kelas').value,

                    nama_ayah: document.getElementById('inp-nama-ayah').value,
                    nama_ibu: document.getElementById('inp-nama-ibu').value,
                    pekerjaan_ayah: document.getElementById('inp-pekerjaan-ayah').value,
                    pekerjaan_ibu: document.getElementById('inp-pekerjaan-ibu').value,
                    alamat_ortu: document.getElementById('inp-alamat-ortu').value,

                    nama_wali: document.getElementById('inp-nama-wali').value,
                    pekerjaan_wali: document.getElementById('inp-pekerjaan-wali').value,
                    alamat_wali: document.getElementById('inp-alamat-wali').value
                };
                if (id) await updateSantriInDB(id, data);
                else await addSantriToDB(data);
            } else {
                const rows = document.querySelectorAll('.mapel-row');
                const mapelStructure = [];
                // REMOVED 'allClasses' to fix Bug 400
                rows.forEach(r => {
                    const nama = r.querySelector('.inp-mapel-name').value.trim();
                    const kStr = r.querySelector('.inp-mapel-kelas').value;
                    if(nama) {
                        const kArr = kStr.split(',').map(s => s.trim()).filter(s => s !== '');
                        mapelStructure.push({ nama, kelas: kArr });
                    }
                });
                
                const data = {
                    name: document.getElementById('inp-nama').value, username: document.getElementById('inp-username').value,
                    role: document.getElementById('inp-role').value || 'guru',
                    wali: document.getElementById('inp-kelas-wali').value, 
                    musyrif: document.getElementById('inp-musyrif').value,
                    jk: document.getElementById('inp-jk-guru').value, // JK Guru
                    mapel: mapelStructure
                };
                const pass = document.getElementById('inp-password').value;
                if (pass) data.password = pass; else if (!id) data.password = '123456';
                if (id) await updateGuruInDB(id, data); else await addGuruToDB(data);
            }
            setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) }); 
            if(isSantri) renderAdminSantri(); else renderAdminGuru();
            closeModal(); showToast('Tersimpan', 'success');
        } catch (e) { console.error(e); showToast('Gagal: ' + e.message, 'error'); }
        setLoading(false);
    }

// ===============================
// ===============================
// ===============================
// DASHBOARD: ANALYTICS (ADMIN & GURU)
// ===============================

function _fmt1(n){
  const v = Number(n);
  if (!isFinite(v)) return '-';
  return (Math.round(v * 10) / 10).toFixed(1);
}
function _mean(arr){
  const a = (arr||[]).map(Number).filter(v => isFinite(v));
  if (!a.length) return 0;
  return a.reduce((x,y)=>x+y,0) / a.length;
}
function _std(arr){
  const a = (arr||[]).map(Number).filter(v => isFinite(v));
  if (a.length < 2) return 0;
  const m = _mean(a);
  const v = a.reduce((s,x)=>s+Math.pow(x-m,2),0) / (a.length-1);
  return Math.sqrt(v);
}
function _hslBgPct(pct){
  const p = Math.max(0, Math.min(100, Number(pct)||0));
  const hue = (p/100)*120; // red->green
  return `hsl(${hue.toFixed(0)},70%,88%)`;
}
function _periodMatch(r, tahun_ajar, semester){
  return String(r?.tahun_ajar||'')===String(tahun_ajar||'') && Number(r?.semester||0)===Number(semester||0);
}
function _scoreRowsFor(mapel, kelas, tahun_ajar, semester){
  const m = String(mapel||'').toUpperCase().trim();
  const k = String(kelas||'').trim();
  return (scores||[]).filter(r => _periodMatch(r,tahun_ajar,semester) && String(r?.kelas||'').trim()===k && String(r?.mapel||'').toUpperCase().trim()===m);
}
function _raporValsFor(mapel, kelas, tahun_ajar, semester){
  return _scoreRowsFor(mapel, kelas, tahun_ajar, semester)
    .map(r => calcNilaiRapor(r))
    .map(Number)
    .filter(v => isFinite(v) && v>0);
}
function _comboStats(mapel, kelas, tahun_ajar, semester){
  const vals = _raporValsFor(mapel, kelas, tahun_ajar, semester);
  return {
    count: vals.length,
    mean: vals.length ? _mean(vals) : 0,
    min: vals.length ? Math.min(...vals) : 0,
    max: vals.length ? Math.max(...vals) : 0,
  };
}



// --- Admin Santri: Combined filters (search + jenjang + kelas unik + paralel)
function adminSantriSetPageSize(v){
  try{
    const st = window.__adminSantriState = window.__adminSantriState || { page: 1, pageSize: 100 };
    st.pageSize = Math.max(1, Number(v)||100);
    st.page = 1;
    applyAdminSantriFilters(true);
  } catch(e){ console.error(e); }
}
function adminSantriPrevPage(){
  try{
    const st = window.__adminSantriState = window.__adminSantriState || { page: 1, pageSize: 100 };
    st.page = Math.max(1, (st.page||1) - 1);
    applyAdminSantriFilters(false);
  } catch(e){ console.error(e); }
}
function adminSantriNextPage(){
  try{
    const st = window.__adminSantriState = window.__adminSantriState || { page: 1, pageSize: 100 };
    st.page = (st.page||1) + 1;
    applyAdminSantriFilters(false);
  } catch(e){ console.error(e); }
}

function applyAdminSantriFilters(resetPage=false) {
  try {
    const src = window.__adminSantriSourceData || students || [];
    const infos = window.__adminSantriKelasInfos || src.map(s => ({ jenjang:'', kelas_unik:'', paralel:'' }));
    const isTemp = !!window.__adminSantriIsTempImport;

    const st = window.__adminSantriState = window.__adminSantriState || { page: 1, pageSize: 100 };
    if (resetPage) st.page = 1;

    const q = (document.getElementById('admin-santri-search')?.value || '').toString().toLowerCase().trim();
    const jen = (document.getElementById('flt-jenjang')?.value || '').toString();
    const kls = (document.getElementById('flt-kelasunik')?.value || '').toString();
    const par = (document.getElementById('flt-paralel')?.value || '').toString();

    const tbody = document.getElementById('tbody-santri');
    if (!tbody) return;

    // Filter data (lebih ringan daripada hide/show DOM ratusan baris)
    const filtered = [];
    for (let i=0;i<src.length;i++){
      const s = src[i];
      const info = infos[i] || { jenjang:'', kelas_unik:'', paralel:'' };

      if (jen && info.jenjang !== jen) continue;
      if (kls && info.kelas_unik !== kls) continue;
      if (par && info.paralel !== par) continue;

      if (q){
        const hay = `${s.nis||''} ${s.name||''} ${s.kelas||''} ${s.jk||s.lp||''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      filtered.push({ s, info, idx: i });
    }

    const total = filtered.length;
    const pageSize = Math.max(1, Number(document.getElementById('admin-santri-pagesize')?.value || st.pageSize || 100));
    st.pageSize = pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    st.page = Math.min(Math.max(1, st.page||1), totalPages);

    const from = (st.page - 1) * pageSize;
    const pageItems = filtered.slice(from, from + pageSize);

    const rows = pageItems.map((item, j) => {
      const s = item.s;
      const info = item.info || { jenjang:'', kelas_unik:'', paralel:'' };
      const canEdit = !!s.id && !isTemp;
      const no = from + j + 1;
      return `
            <tr class="hover:bg-gray-50 border-b" data-jenjang="${info.jenjang}" data-kelasunik="${info.kelas_unik}" data-paralel="${info.paralel}">
                <td class="p-2 text-center">${no}</td>
                <td class="p-2 text-center font-mono">${s.nis||'-'}</td>
                <td class="p-2 text-left font-bold filter-target"><div class="single-line w-64" title="${s.name||''}">${s.name||'-'}</div></td>
                <td class="p-2 text-center">${s.jk||s.lp||'-'}</td>
                <td class="p-2 text-center">${s.kelas||'-'}</td>
                <td class="p-2 text-left"><div class="single-line w-56" title="${s.ttl||''}">${s.ttl||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-44" title="${s.status_keluarga||''}">${s.status_keluarga||'-'}</div></td>
                <td class="p-2 text-center">${(s.anak_ke ?? '-') }</td>
                <td class="p-2 text-left"><div class="single-line w-56" title="${s.asal_sekolah||''}">${s.asal_sekolah||'-'}</div></td>
                <td class="p-2 text-center">${s.tanggal_diterima||'-'}</td>
                <td class="p-2 text-center">${s.diterima_kelas||'-'}</td>
                <td class="p-2 text-left"><div class="single-line w-44" title="${s.nama_ayah||''}">${s.nama_ayah||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-44" title="${s.nama_ibu||''}">${s.nama_ibu||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-44" title="${s.pekerjaan_ayah||''}">${s.pekerjaan_ayah||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-44" title="${s.pekerjaan_ibu||''}">${s.pekerjaan_ibu||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-72" title="${s.alamat_ortu||''}">${s.alamat_ortu||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-44" title="${s.nama_wali||''}">${s.nama_wali||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-44" title="${s.pekerjaan_wali||''}">${s.pekerjaan_wali||'-'}</div></td>
                <td class="p-2 text-left"><div class="single-line w-72" title="${s.alamat_wali||''}">${s.alamat_wali||'-'}</div></td>
                <td class="p-2 text-center">
                    <button ${canEdit ? `onclick="editSantri(${s.id})"` : 'disabled class="opacity-50 cursor-not-allowed"'} class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs px-3 py-1 rounded shadow">Edit</button>
                    <button ${canEdit ? `onclick="adminDeleteSantri(${s.id})"` : 'disabled class="opacity-50 cursor-not-allowed"'} class="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1 rounded shadow">Hapus</button>
                </td>
            </tr>`;
    }).join('');

    tbody.innerHTML = rows || `<tr><td colspan="20" class="p-4 text-center text-gray-500">Tidak ada data</td></tr>`;

    // pager UI
    const infoEl = document.getElementById('admin-santri-pageinfo');
    if (infoEl) infoEl.innerText = `${st.page}/${totalPages} • ${total} data`;
    const prevBtn = document.getElementById('admin-santri-prev');
    const nextBtn = document.getElementById('admin-santri-next');
    if (prevBtn) prevBtn.disabled = (st.page<=1);
    if (nextBtn) nextBtn.disabled = (st.page>=totalPages);

  } catch (e) {
    console.error(e);
  }
}

async function adminDeleteSantri(id){
  try{
    if(!confirm('Hapus data santri ini?')) return;
    await deleteSantriFromDB(id);
    students = (students||[]).filter(s => String(s.id)!==String(id));
    // refresh source cache
    if(window.__adminSantriSourceData){
      window.__adminSantriSourceData = (window.__adminSantriSourceData||[]).filter(s => String(s.id)!==String(id));
      window.__adminSantriKelasInfos = (window.__adminSantriSourceData||[]).map(s => {
        const sK = (s.kelas || '').toString().trim();
        const parts = sK ? sK.split(/\s+/).filter(Boolean) : [];
        const jenjang = parts[0] || '';
        const paralel = parts.length ? parts[parts.length - 1] : '';
        const kelas_unik = (parts.length >= 2) ? parts.slice(0, -1).join(' ') : jenjang;
        return { jenjang, kelas_unik, paralel };
      });
    }
    applyAdminSantriFilters(false);
    alert('Data santri dihapus.');
  } catch(e){
    console.error(e);
    alert('Gagal menghapus santri: ' + (e.message||e));
  }
}
async function adminDeleteGuru(id){
  try{
    if(!confirm('Hapus data guru ini?')) return;
    await deleteUserFromDB(id);
    users = (users||[]).filter(u => String(u.id)!==String(id));
    alert('Data guru dihapus.');
    renderAdminGuru();
  } catch(e){
    console.error(e);
    alert('Gagal menghapus guru: ' + (e.message||e));
  }
}



function exportRankingPDF(){
    const html = window.__lastRankingHTML;
    const title = window.__lastRankingTitle || 'Ranking';
    if (!html){
        alert('Ranking belum dihitung. Klik Proses dulu.');
        return;
    }
    const w = window.open('', '_blank');
    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body{font-family: Arial, sans-serif; padding: 16px;}
  table{border-collapse: collapse; width:100%;}
  th, td{border:1px solid #333; padding:6px; font-size:12px;}
  th{font-weight:700;}
  .no-print{display:none;}
</style>
</head>
<body>
  <h2 style="margin:0 0 10px 0;">${title}</h2>
  ${html}
  <script>window.onload=()=>{window.print();}</script>
</body>
</html>`);
    w.document.close();
}


// ===============================
// CHAT: WALI ↔ GURU MAPEL (Sederhana, via Supabase)
// Tabel: public.chat_messages (lihat SQL_MIGRASI_CHAT_MESSAGES.sql)
// ===============================

function renderChatInboxCardHTML(context){
    const title = (context === 'wali') ? '💬 Pesan untuk Wali Kelas' : '💬 Pesan cinta dari para Guru';
    const holderId = (context === 'wali') ? 'chat-inbox-wali' : 'chat-inbox-guru';
    return `
    <div class="bg-white p-6 rounded-xl shadow border">
        <div class="flex items-center justify-between gap-2 mb-2">
            <h3 class="text-lg font-extrabold text-gray-800">${title}</h3>
            <button onclick="loadChatInboxInto('${holderId}')" class="bg-gray-800 text-white px-3 py-1 rounded shadow text-xs font-bold">Refresh</button>
        </div>
        <div id="${holderId}" class="text-sm text-gray-600">Memuat pesan...</div>
    </div>`;
}

async function loadChatInboxInto(holderId){
    const u = getCurrentUser();
    const holder = document.getElementById(holderId);
    if (!holder) return;
    if (!u || !u.id){
        holder.innerHTML = `<div class="text-sm text-gray-600">Anda belum login.</div>`;
        return;
    }
    if (typeof db === 'undefined' || !db){
        holder.innerHTML = `<div class="text-sm text-gray-600">Menyiapkan koneksi...</div>`;
        // retry beberapa kali sampai db siap (mis. setelah data.js selesai load)
        window.__chatDbRetry = window.__chatDbRetry || {};
        window.__chatDbRetry[holderId] = (window.__chatDbRetry[holderId] || 0) + 1;
        if (window.__chatDbRetry[holderId] <= 30){
            setTimeout(()=>loadChatInboxInto(holderId), 150);
        } else {
            holder.innerHTML = `<div class="text-sm text-red-600">Supabase belum siap.</div>`;
        }
        return;
    }

    try{
        const { data, error } = await db
            .from('chat_messages')
            .select('*')
            .eq('to_guru_id', u.id)
            .order('created_at', { ascending: false })
            .limit(12);

        if (error) throw error;

        if (!data || data.length === 0){
            holder.innerHTML = `<div class="text-sm text-gray-600">Belum ada pesan.</div>`;
            return;
        }

        const rows = data.map(m => {
            const from = (users || []).find(x => String(x.id) === String(m.from_guru_id));
            const fromName = from ? (from.name || from.nama_guru || from.username) : `ID:${m.from_guru_id}`;
            const kelas = (m.kelas || '').toString().trim();
            const mapel = (m.mapel || '').toString().trim();
            const msg = (m.message || '').toString().trim();
            const time = m.created_at ? new Date(m.created_at).toLocaleString() : '';

            const chipKelas = kelas ? `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold" title="${escapeHtml(kelas)}">${escapeHtml(kelas)}</span>` : '';
            const chipMapel = mapel ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold" title="${escapeHtml(mapel)}">${escapeHtml(mapel)}</span>` : '';
            const chipMsg = msg ? `<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold max-w-[420px] truncate" title="${escapeHtml(msg)}">${escapeHtml(msg)}</span>` : '';

            return `
            <div class="bg-white rounded-xl border shadow-sm p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap items-center gap-2 min-w-0">
                        <span class="font-extrabold text-gray-900">${escapeHtml(fromName)}</span>
                        ${chipKelas}
                        ${chipMapel}
                        ${chipMsg}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="text-xs text-gray-500">${escapeHtml(time)}</span>
                        <button class="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded shadow text-xs font-bold"
                            onclick="openChatCompose(${m.from_guru_id}, '${_encArg(fromName)}', '${_encArg(m.mapel||'')}', '${_encArg(m.kelas||'')}')">Balas</button>
                    </div>
                </div>
            </div>`;
        }).join('');

        holder.innerHTML = rows || `<div class="text-sm text-gray-600">Belum ada pesan.</div>`;

        // Auto refresh inbox (tanpa perlu tekan tombol refresh)
        window.__chatInboxInterval = window.__chatInboxInterval || {};
        if (!window.__chatInboxInterval[holderId]){
            window.__chatInboxInterval[holderId] = setInterval(() => {
                const el = document.getElementById(holderId);
                if (!el){
                    clearInterval(window.__chatInboxInterval[holderId]);
                    delete window.__chatInboxInterval[holderId];
                    return;
                }
                loadChatInboxInto(holderId);
            }, 15000);
        }

    }catch(e){
        holder.innerHTML = `<div class="text-sm text-red-600">Gagal memuat pesan. Pastikan tabel <b>chat_messages</b> sudah dibuat.</div>`;
        console.error(e);
    }
}

function openChatCompose(toGuruId, toGuruNameEnc, mapelEnc, kelasEnc){
    const toName = decodeURIComponent(toGuruNameEnc || '');
    const mapel = decodeURIComponent(mapelEnc || '');
    const kelas = decodeURIComponent(kelasEnc || '');
    const hint = `${toName}${kelas ? ' • ' + kelas : ''}${mapel ? ' • ' + mapel : ''}`.trim();
    openChatComposeModal({ toGuruId, hint, kelas, mapel });
}

// Modal compose chat (lebih rapi daripada prompt)
function openChatComposeModal({ toGuruId, hint, kelas, mapel }){
    // pastikan db siap
    // jika db belum siap, tetap buka modal tapi tombol kirim dinonaktifkan sementara
    const _dbReadyNow = !(typeof db === 'undefined' || !db);

    const existing = document.getElementById('chat-compose-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'chat-compose-modal';
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4';
    modal.innerHTML = `
      <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl border">
        <div class="p-4 border-b flex items-start justify-between gap-3">
          <div>
            <div class="text-sm text-gray-500">Kirim Pesan</div>
            <div class="font-extrabold text-gray-900">${escapeHtml(hint || 'Guru')}</div>
          </div>
          <button id="chat-close" class="text-gray-500 hover:text-gray-800 font-bold px-2">✕</button>
        </div>

        <div class="p-4">
          ${_dbReadyNow ? "" : `<div class="mb-3 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2">Menyiapkan koneksi… tombol Kirim akan aktif otomatis.</div>`}
          <label class="block text-xs font-bold text-gray-600 mb-2">Isi pesan</label>
          <textarea id="chat-msg" rows="5" class="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Tulis pesan singkat dan jelas..."></textarea>
          <div class="text-xs text-gray-500 mt-2">Tips: sebutkan mapel/kelas bila perlu.</div>
        </div>

        <div class="p-4 border-t flex items-center justify-end gap-2">
          <button id="chat-cancel" class="px-4 py-2 rounded-xl border font-bold text-sm text-gray-700 hover:bg-gray-50">Batal</button>
          <button id="chat-send" ${_dbReadyNow ? "" : "disabled"} class="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm shadow ${_dbReadyNow ? "" : "opacity-50 cursor-not-allowed"}">Kirim</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('#chat-close').onclick = close;
    modal.querySelector('#chat-cancel').onclick = close;
    modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });

    const ta = modal.querySelector('#chat-msg');
    ta.focus();
    // jika db belum siap saat modal dibuka, aktifkan tombol kirim otomatis ketika sudah siap
    if (!_dbReadyNow){
        const btn = modal.querySelector('#chat-send');
        const t = setInterval(() => {
            if (typeof db !== 'undefined' && db){
                clearInterval(t);
                btn.disabled = false;
                btn.classList.remove('opacity-50','cursor-not-allowed');
            }
        }, 150);
        setTimeout(()=>{ try{ clearInterval(t);}catch(e){} }, 6000);
    }

    modal.querySelector('#chat-send').onclick = async () => {
        const msg = (ta.value || '').trim();
        if (!msg){
            showToast('Pesan masih kosong', 'error');
            ta.focus();
            return;
        }
        modal.querySelector('#chat-send').disabled = true;
        modal.querySelector('#chat-send').innerText = 'Mengirim...';
        await sendChatMessage(toGuruId, kelas, mapel, msg);
        close();
    };
}

async function sendChatMessage(toGuruId, kelas, mapel, message){
    const u = getCurrentUser();
    if (!u || !u.id){ showToast('Anda belum login', 'error'); return; }
    if (typeof db === 'undefined' || !db){ showToast('Supabase belum siap', 'error'); return; }
    try{
        const payload = {
            from_guru_id: u.id,
            to_guru_id: toGuruId,
            kelas: kelas || null,
            mapel: mapel || null,
            message: String(message || '').trim()
        };
        const { error } = await db.from('chat_messages').insert([payload]);
        if (error) throw error;
        showToast('Pesan terkirim', 'success');
        // refresh inbox penerima (kalau sedang dibuka di device yang sama)
        loadChatInboxInto('chat-inbox-guru');
    }catch(e){
        console.error(e);
        showToast('Gagal kirim pesan. Pastikan tabel chat_messages sudah dibuat.', 'error');
    }
}


// ===============================
// WALI: Rekap Nilai Mapel dipindah ke Dashboard + kolom Aksi
// ===============================
function renderWaliRekapDashboardHTML(kelas){
    const { tahun_ajar, semester } = getActivePeriode();
    const siswa = (students || []).filter(s => _normStr(s.kelas) === _normStr(kelas));
    const expected = siswa.length;

    // Build expected combos from guru assignments (mapel × guru) for this class
    const combos = [];
    (users || []).forEach(g => {
        const arr = parseMapelData(g.mapel);
        (arr || []).forEach(m => {
            const mapel = String(m?.nama || '').trim();
            if (!mapel) return;
            (m.kelas || []).forEach(k => {
                if (_normStr(k) !== _normStr(kelas)) return;
                combos.push({
                    mapel: _normUpper(mapel),
                    mapelRaw: mapel,
                    guru: String(g.name || g.nama_guru || g.username || '-').trim(),
                    guru_id: g.id
                });
            });
        });
    });

    // Unique by mapel+guru_id
    const seen = new Set();
    const list = combos.filter(c => {
        const key = `${c.mapel}||${c.guru_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a,b)=> a.mapel.localeCompare(b.mapel, 'id', { sensitivity:'base' }) || String(a.guru||'').localeCompare(String(b.guru||''), 'id', { sensitivity:'base' }));

    if (!list.length){
        return `
        <div class="bg-white rounded-xl shadow p-6 border">
            <h3 class="text-lg font-extrabold text-gray-800 mb-1">Rekap Nilai Mapel</h3>
            <div class="text-sm text-gray-600">Belum ada data mapel untuk kelas <b>${escapeHtml(kelas)}</b>.</div>
        </div>`;
    }

    const rows = list.map((c, i) => {
        const filled = _countDistinctScoresFor(c.mapelRaw, kelas, tahun_ajar, semester);
        const missing = Math.max(0, expected - filled);
        const pct = expected ? Math.round((filled/expected)*100) : 0;

        const statusBadge = (filled === 0)
            ? `<span class="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-extrabold">Belum Masuk</span>`
            : (missing === 0
                ? `<span class="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-extrabold">Lengkap</span>`
                : `<span class="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-extrabold">Sebagian</span>`
              );

        const barBg = _heatBgFromPct(pct);
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-2 text-center text-xs text-gray-500">${i+1}</td>
                <td class="p-2 font-extrabold text-left">${escapeHtml(c.mapel)}</td>
                <td class="p-2 text-left">${escapeHtml(c.guru || '-')}</td>
                <td class="p-2 text-center">${statusBadge}</td>
                <td class="p-2 text-center font-mono">${filled}/${expected}</td>
                <td class="p-2">
                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden border">
                        <div class="h-3" style="width:${pct}%;background:${barBg}"></div>
                    </div>
                </td>
                <td class="p-2 text-center">
                    <div class="flex flex-wrap gap-2 justify-center">
                        <button class="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded shadow text-xs font-bold"
                            onclick="renderAdminNilaiMonitor(decodeURIComponent('${_encArg(c.mapelRaw)}'), decodeURIComponent('${_encArg(kelas)}'), decodeURIComponent('${_encArg(c.guru)}'))">Lihat Nilai</button>
                        <button class="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 rounded shadow text-xs font-bold"
                            onclick="openChatCompose(${c.guru_id}, '${_encArg(c.guru)}', '${_encArg(c.mapelRaw)}', '${_encArg(kelas)}')">Kirim Pesan</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="bg-white rounded-xl shadow p-6 border">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                <div>
                    <h3 class="text-lg font-extrabold text-gray-800">Rekap Nilai Mapel</h3>
                    <div class="text-xs text-gray-500">Periode <b>${tahun_ajar}</b> / Semester <b>${semester}</b> • Kelas <b>${escapeHtml(kelas)}</b></div>
                </div>
            </div>
            <div class="overflow-auto">
                <table class="min-w-[980px] w-full text-sm border std-table">
                    <thead class="bg-gray-800 text-white">
                        <tr>
                            <th class="p-2 w-12">No</th>
                            <th class="p-2 text-left">Mapel</th>
                            <th class="p-2 text-left">Guru Mapel</th>
                            <th class="p-2 w-28">Status</th>
                            <th class="p-2 w-28">Terisi</th>
                            <th class="p-2 text-left">Progress</th>
                            <th class="p-2 w-40">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}
