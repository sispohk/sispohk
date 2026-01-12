
    document.addEventListener('DOMContentLoaded', async () => {
        const u = getCurrentUser();
        if(!u) { window.location.href = 'login.html'; return; }
        document.getElementById('user-info-name').innerText = u.name;
        document.getElementById('user-info-role').innerText = u.role;
        setLoading(true, "Memuat Data...");
        setLoadingProgress(0, 'Memuat ulang data...');
            await loadInitialData({ onProgress: (pct, label) => setLoadingProgress(pct, label) });
        setLoading(false);
        renderSidebar();
        renderDashboardContent();
    });
    const isGuru = u => (u?.role || '').toLowerCase().includes('guru') || (u?.mapel && parseMapelData(u.mapel).length > 0);
    // isAdmin, isWali, getWaliKelas sudah didefinisikan di data.js (hindari duplicate declaration)

    function renderSidebar() {
        const u = getCurrentUser();
        const menu = document.getElementById('sidebar-menu');
        menu.innerHTML = `<li><a href="#" onclick="renderDashboardContent()" class="flex items-center gap-3 p-3 rounded hover:bg-blue-700 font-bold text-sm">🏠 Dashboard</a></li>`;

        if (isAdmin(u)) {
            menu.innerHTML += `
            <li class="px-3 mt-6 mb-2 text-xs text-blue-300 uppercase font-bold tracking-wider">Administrator</li>
            <li><a href="#" onclick="renderAdminGuru()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">👥 Data Guru</a></li>
            <li><a href="#" onclick="renderAdminSantri()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🎓 Data Santri</a></li>
            <li><a href="#" onclick="renderAdminLegger()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">📊 Legger Santri</a></li>
            <li><a href="#" onclick="renderBobotNilai()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">⚖️ Bobot Nilai</a></li>
            <li><a href="#" onclick="renderKonversiNilai()" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🔄 Konversi Nilai</a></li>`;
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
            <li><a href="#" onclick="renderWaliPage('print')" class="block p-2 rounded hover:bg-blue-700 text-sm pl-4">🖨️ Raport & Legger</a></li>`;
        }
    }

        function renderDashboardContent() {
        const u = getCurrentUser();

        // Admin dashboard: ringkasan statistik
        if (isAdmin(u)) {
            const totalGuru = users.length;
            const totalSantri = students.length;
            const totalWali = users.filter(x => (x.wali || x.kelas_wali || '').toString().trim() !== '').length;
            const totalMusyrif = users.filter(x => (x.musyrif || '').toString().trim() !== '').length;

            // hitung mapel unik
            const mapelSet = new Set();
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

                <div class="bg-white p-6 rounded-xl shadow border">
                    <h3 class="text-lg font-bold text-gray-800 mb-2">Catatan Singkat</h3>
                    <ul class="list-disc pl-6 text-sm text-gray-700 space-y-1">
                        <li>Role akun hanya: <b>admin</b> dan <b>guru</b>. Peran wali kelas/musyrif otomatis aktif kalau kolom <b>wali</b> / <b>musyrif</b> terisi.</li>
                        <li>Menu <b>Data Santri</b> kini menampilkan semua kolom sesuai tabel <b>public.santri</b> (import/export juga sama).</li>
                    </ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow border">
                    <h3 class="text-lg font-bold text-gray-800 mb-2">Panduan Penggunaan (Admin)</h3>
                    <div class="text-sm text-gray-700 space-y-3">
                        <details class="bg-gray-50 border rounded-lg p-3">
                            <summary class="font-bold cursor-pointer">1) Kelola Data Guru</summary>
                            <ul class="list-disc pl-6 mt-2 space-y-1">
                                <li>Role akun hanya <b>admin</b> dan <b>guru</b>.</li>
                                <li>Kolom <b>wali</b> dan <b>musyrif</b> akan mengaktifkan mode Wali Kelas/Musyrif otomatis.</li>
                                <li>Saat edit, <b>biarkan password kosong</b> jika tidak ingin mengganti password.</li>
                            </ul>
                        </details>
                        <details class="bg-gray-50 border rounded-lg p-3">
                            <summary class="font-bold cursor-pointer">2) Kelola Data Santri</summary>
                            <ul class="list-disc pl-6 mt-2 space-y-1">
                                <li>Pastikan kolom <b>NIS</b> di Excel diset sebagai <b>Text</b> sebelum isi data.</li>
                                <li>Import akan dipreview dulu; klik <b>Simpan</b> untuk upsert ke database (batch).</li>
                            </ul>
                        </details>
                        <details class="bg-gray-50 border rounded-lg p-3">
                            <summary class="font-bold cursor-pointer">3) Legger Santri</summary>
                            <ul class="list-disc pl-6 mt-2 space-y-1">
                                <li>Pilih filter kelas, lalu export <b>XLSX</b> atau cetak (bisa <i>Save as PDF</i>).</li>
                                <li>Kolom <b>PRINT</b> di tiap baris untuk cetak per-santri (format detail menyusul).</li>
                            </ul>
                        </details>
                    </div>
                </div>

            </div>`;
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
            filled += scores.filter(sc =>
                String(sc.kelas||'') === String(c.kelas) &&
                String(sc.mapel||'').toUpperCase() === String(c.mapel||'').toUpperCase()
            ).length;
        });

        const pct = expected ? Math.min(100, Math.round((filled/expected)*100)) : 0;
        const isWaliRole = isWali(u);
        const isMusyrifRole = !!(u.musyrif && String(u.musyrif).trim());

        document.getElementById('main-content').innerHTML = `
        <div class="max-w-6xl mx-auto space-y-6">
            <div class="bg-white p-8 rounded-xl shadow border-l-8 border-blue-600">
                <h2 class="text-3xl font-extrabold text-gray-800 mb-2">Selamat Datang, ${u.name}</h2>
                <div class="flex flex-wrap gap-2 items-center">
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase">${u.role}</span>
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
                    <div class="text-sm text-gray-500 font-bold mb-1">Peran Tambahan</div>
                    <div class="text-base font-extrabold text-gray-800">
                        ${isWaliRole ? '✅ Wali Kelas' : '—'}<br>
                        ${isMusyrifRole ? '✅ Musyrif' : '—'}
                    </div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow border">
                    <div class="text-sm text-gray-500 font-bold mb-1">Input Nilai (Tersimpan)</div>
                    <div class="text-3xl font-extrabold text-gray-800">${pct}%</div>
                    <div class="mt-2 h-2 bg-gray-200 rounded">
                        <div class="h-2 bg-blue-600 rounded" style="width:${pct}%"></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">${filled} / ${expected} baris</div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow border">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Catatan</h3>
                <ul class="list-disc pl-6 text-sm text-gray-700 space-y-1">
                    <li>Input nilai disimpan <b>batch</b> agar tidak terpotong saat data banyak.</li>
                    <li>Absensi (S/I/A) berbentuk angka; Sikap berbentuk <b>A/B/C/D</b>.</li>
                </ul>
            </div>
            <div class="bg-white p-6 rounded-xl shadow border">
                <h3 class="text-lg font-bold text-gray-800 mb-2">Panduan Penggunaan</h3>
                <div class="text-sm text-gray-700 space-y-3">
                    <details class="bg-gray-50 border rounded-lg p-3">
                        <summary class="font-bold cursor-pointer">Guru Mapel</summary>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Pilih <b>MAPEL</b> di sidebar, lalu pilih <b>kelas</b> yang diajar.</li>
                            <li>UH dihitung dari <b>rata-rata UH1..UH5</b>.</li>
                            <li>Gunakan tombol <b>Export</b> untuk template, <b>Import</b> untuk preview, dan <b>Simpan</b> untuk kirim ke DB (batch).</li>
                            <li>Di tabel, kamu bisa pindah cepat pakai tombol panah (↑ ↓ ← →).</li>
                        </ul>
                    </details>
                    <details class="bg-gray-50 border rounded-lg p-3">
                        <summary class="font-bold cursor-pointer">Musyrif</summary>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Menu <b>Musyrif</b> aktif otomatis kalau kolom <b>musyrif</b> terisi di akun guru.</li>
                            <li>Isi data hafalan, lalu <b>Simpan</b> (batch).</li>
                        </ul>
                    </details>
                    <details class="bg-gray-50 border rounded-lg p-3">
                        <summary class="font-bold cursor-pointer">Wali Kelas</summary>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Menu <b>Wali Kelas</b> aktif otomatis kalau kolom <b>wali</b> terisi.</li>
                            <li>Absensi: S/I/A = angka. Sikap = <b>A/B/C/D</b>.</li>
                            <li>Raport & Legger: tersedia export <b>XLSX</b> dan cetak (bisa <i>Save as PDF</i>).</li>
                        </ul>
                    </details>
                </div>
            </div>

        </div>`;
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
                    <button ${canEdit ? `onclick="editGuru(${u.id})"` : 'disabled'} class="${canEdit ? 'text-blue-600 hover:bg-blue-100' : 'text-gray-400 cursor-not-allowed'} font-bold text-xs p-1 rounded">Edit</button>
                </td>
            </tr>`;
        }).join('');

        const headerBtn = `
        <div class="flex flex-wrap gap-2 justify-end">
            <button onclick="triggerImport('guru')" class="bg-green-600 text-white px-4 py-2 rounded font-bold shadow text-sm">Import</button>
            <button onclick="downloadExcelGuru()" class="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow text-sm">Export</button>
            <button onclick="saveAdminImport('guru')" class="bg-blue-800 text-white px-4 py-2 rounded font-bold shadow text-sm">Simpan</button>
            <button onclick="openModal('guru')" class="bg-gray-700 text-white px-4 py-2 rounded font-bold shadow text-sm">Tambah</button>
        </div>`;

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                <h2 class="text-2xl font-bold">Data Guru</h2>
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
        enableArrowNavigation('table-musyrif');
    }


    // --- ADMIN: SANTRI (FIX: 1 Baris Nama, JK) ---
        function renderAdminSantri() {
        const main = document.getElementById('main-content');
        const sourceData = window.tempImportDataSantri || students;

        const rows = sourceData.map((s, i) => {
            const canEdit = !!s.id && !window.tempImportDataSantri;
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
                    <button ${canEdit ? `onclick="editSantri(${s.id})"` : 'disabled'} class="${canEdit ? 'text-blue-600 hover:bg-blue-100' : 'text-gray-400 cursor-not-allowed'} font-bold text-xs p-1 rounded">Edit</button>
                </td>
            </tr>`;
        }).join('');

        const headerBtn = `
        <div class="flex flex-wrap gap-2 justify-end">
            <button onclick="triggerImport('santri')" class="bg-green-600 text-white px-4 py-2 rounded font-bold shadow text-sm">Import</button>
            <button onclick="downloadExcelSantri()" class="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow text-sm">Export</button>
            <button onclick="saveAdminImport('santri')" class="bg-blue-800 text-white px-4 py-2 rounded font-bold shadow text-sm">Simpan</button>
            <button onclick="openModal('santri')" class="bg-gray-700 text-white px-4 py-2 rounded font-bold shadow text-sm">Tambah</button>
        </div>`;

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                <h2 class="text-2xl font-bold">Data Santri</h2>
                ${headerBtn}
            </div>
            <input type="text" onkeyup="filterTable('tbody-santri')" placeholder="Cari Santri..." class="w-full border p-2 mb-4 rounded">
            <div class="overflow-auto max-h-[70vh]">
                <table class="min-w-[1700px] w-full text-xs border std-table whitespace-nowrap">
                    <thead class="bg-blue-600 text-white sticky top-0">
                        <tr>
                            <th>No</th><th>NIS</th><th class="text-left">Nama</th><th>JK</th><th>Kelas</th>
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
                    <button onclick="renderBobotNilai()" class="bg-gray-200 text-gray-800 px-6 py-3 rounded font-bold hover:bg-gray-300">Refresh</button>
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
                        <button onclick="renderKonversiNilai()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold hover:bg-gray-300">Refresh</button>
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
                </div>
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
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="kehadiran" value="${sc.kehadiran||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh1" value="${sc.uh1||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh2" value="${sc.uh2||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh3" value="${sc.uh3||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh4" value="${sc.uh4||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="uh5" value="${sc.uh5||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="tugas" value="${sc.tugas||0}" class="bg-yellow-50 nav-input"></td>
                <td class="p-2"><input type="number" data-name="${s.name}" data-nis="${s.nis||''}" data-field="pas_pat" value="${sc.pas_pat||sc.pas||0}" class="bg-blue-50 nav-input"></td>
            </tr>`;
        }).join('');

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex justify-between items-center mb-4">
                <div><h2 class="text-2xl font-bold">${mapel} - ${kelas}</h2></div>
                <div class="flex gap-2">
                    <button onclick="triggerImport('mapel', '${mapel}', '${kelas}')" class="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold shadow">Import</button>
                    <button onclick="exportExcelNilai('${mapel}', '${kelas}')" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold shadow">Export</button>
                    <button onclick="saveNilaiMapel('${mapel}', '${kelas}')" class="bg-blue-800 text-white px-6 py-2 rounded font-bold shadow">Simpan</button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm border std-table" id="table-nilai">
                    <thead class="bg-blue-600 text-white">
                        <tr>
                            <th class="p-2">No</th><th class="p-2">NIS</th><th class="p-2 text-left w-64">Nama</th>
                            <th class="p-2 w-14">Hadir</th><th class="p-2 w-14">UH1</th><th class="p-2 w-14">UH2</th><th class="p-2 w-14">UH3</th><th class="p-2 w-14">UH4</th><th class="p-2 w-14">UH5</th>
                            <th class="p-2 w-14 bg-yellow-600 text-white">Tugas</th><th class="p-2 w-20 bg-blue-800 text-white">PAS/PAT</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-nilai">${rows}</tbody>
                </table>
            </div>
        </div>`;
        
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
            data.forEach(d => {
                let conv = meanIdeal;
                if (denom > 0) {
                    conv = meanIdeal + (d.nilai_rapor - meanAsli) * (maxIdeal - minIdeal) / denom;
                }
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
                        <button onclick="renderKonversiMapelPage('${mapel}','${kelas}')" class="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300">Refresh</button>
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
                </div>
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

enableArrowNavigation('table-nilai');
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
        return `<select data-id="${id}" data-nis="${nis||''}" data-field="${field}" class="bg-blue-50 border rounded px-2 py-1 w-20">
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
            ${mode!=='print' && mode!=='data' ? `<button onclick="triggerImport('${mode}', '${kelas}')" class="bg-green-600 text-white px-3 py-1 rounded shadow text-sm font-bold">Import</button>` : ''}
            ${mode!=='print' ? `<button onclick="exportExcelWali('${mode}', '${kelas}')" class="bg-indigo-600 text-white px-3 py-1 rounded shadow text-sm font-bold">Export</button>` : ''}
            ${(mode==='absen' || mode==='catatan') ? `<button onclick="saveWaliDataLocal('${mode}')" class="bg-blue-800 text-white px-4 py-1 rounded shadow text-sm font-bold">Simpan</button>` : ''}
            ${mode==='data' ? `<button onclick="refreshWaliDataKelas()" class="bg-blue-800 text-white px-4 py-1 rounded shadow text-sm font-bold">Simpan</button>` : ''}
            ${mode==='print' ? `
                <button onclick="exportLeggerXLSX('${kelas}')" class="bg-indigo-600 text-white px-3 py-1 rounded shadow text-sm font-bold">XLSX</button>
                <button onclick="printLeggerKelas('${kelas}', true)" class="bg-gray-700 text-white px-3 py-1 rounded shadow text-sm font-bold">PDF</button>
                <button onclick="printLeggerKelas('${kelas}', false)" class="bg-green-700 text-white px-3 py-1 rounded shadow text-sm font-bold">Print</button>
            ` : ''}
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
                        <button ${canEdit ? `onclick="editSantri(${s.id})"` : 'disabled'} class="${canEdit ? 'text-blue-600 hover:bg-blue-100' : 'text-gray-400 cursor-not-allowed'} font-bold text-xs p-1 rounded">Edit</button>
                    </td>
                </tr>`;
            }).join('');

            content = `
              <div class="bg-white rounded-xl shadow p-6">
                <input type="text" onkeyup="filterTable('tbody-wali-data')" placeholder="Cari Santri..." class="w-full border p-2 mb-4 rounded">
                <div class="overflow-auto max-h-[70vh]">
                  <table class="min-w-[1700px] w-full text-xs border std-table whitespace-nowrap">
                    <thead class="bg-blue-600 text-white sticky top-0">
                      <tr>
                        <th>No</th><th>NIS</th><th class="text-left">Nama</th><th>JK</th><th>Kelas</th>
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
                </div>
              </div>`;
        } 

        else if (mode === 'absen') {
            const rows = siswa.map((s, i) => {
                const { tahun_ajar, semester } = getActivePeriode();
                const sc = waliScores.find(x => String(x.nis)===String(s.nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                return `
                <tr class="hover:bg-gray-50 border-b tr-item">
                    <td class="p-2 text-center">${i+1}</td>
                    <td class="p-2 font-medium text-left filter-target"><div class="single-line" title="${s.name}" data-name="${s.name}">${s.name}</div></td>
                    <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hadir_s" value="${sc.hadir_s||0}"></td>
                    <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hadir_i" value="${sc.hadir_i||0}"></td>
                    <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hadir_a" value="${sc.hadir_a||0}"></td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'akhlak', sc.akhlak)}</td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'kerajinan', sc.kerajinan)}</td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'kebersihan', sc.kebersihan)}</td>
                    <td class="p-2">${_sikapSelectHTML(s.id, s.nis||'', 'kedisiplinan', sc.kedisiplinan)}</td>
                </tr>`;
            }).join('');
            content = `<table class="w-full text-sm border std-table" id="table-absen"><thead class="bg-blue-600 text-white"><tr><th rowspan="2">No</th><th rowspan="2" class="text-left w-64">Nama</th><th colspan="3">Absensi</th><th colspan="4">Sikap (A/B/C/D)</th></tr><tr><th>S</th><th>I</th><th>A</th><th>Akhlak</th><th>Kerajinan</th><th>Bersih</th><th>Disiplin</th></tr></thead><tbody id="tbody-wali">${rows}</tbody></table>`;
        } 
        else if (mode === 'catatan') {
            const rows = siswa.map((s, i) => {
                const { tahun_ajar, semester } = getActivePeriode();
                const sc = waliScores.find(x => String(x.nis)===String(s.nis) && String(x.tahun_ajar)===String(tahun_ajar) && Number(x.semester)===Number(semester)) || {};
                return `
                <tr class="hover:bg-gray-50 border-b tr-item">
                    <td class="p-2 text-center">${i+1}</td>
                    <td class="p-2 font-medium text-left filter-target"><div class="single-line" title="${s.name}" data-name="${s.name}">${s.name}</div></td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="catatan" class="h-16">${sc.catatan||'-'}</textarea></td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="prestasi1" class="h-16">${sc.prestasi1||'-'}</textarea></td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="prestasi2" class="h-16">${sc.prestasi2||'-'}</textarea></td>
                    <td class="p-2"><textarea data-id="${s.id}" data-nis="${s.nis||''}" data-field="prestasi3" class="h-16">${sc.prestasi3||'-'}</textarea></td>
                </tr>`;
            }).join('');
            content = `<table class="w-full text-sm border std-table" id="table-catatan"><thead class="bg-blue-600 text-white"><tr><th>No</th><th class="text-left w-64">Nama</th><th>Catatan</th><th>Prestasi 1</th><th>Prestasi 2</th><th>Prestasi 3</th></tr></thead><tbody id="tbody-wali">${rows}</tbody></table>`;
        }
        else if (mode === 'print') {
            content = `<div class="bg-white rounded-xl shadow p-6">
                ${renderLeggerTableHTML(kelas, 'table-legger-wali', 'Wali Kelas • ' + kelas)}
            </div>`;
        }

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold capitalize">${(() => { const m = String(mode||""); const kelasTitle = kelas; if(m==="data") return `Wali Kelas ${kelasTitle}: Data`; if(m==="absen") return `Wali Kelas ${kelasTitle}: Absensi & Sikap`; if(m==="catatan") return `Wali Kelas ${kelasTitle}: Catatan & Prestasi`; if(m==="print") return `Wali Kelas ${kelasTitle}: Rapor dan Legger`; return `Wali Kelas ${kelasTitle}`; })()}</h2>
                ${headerBtn}
            </div>
            ${content}
        </div>`;
        if(mode==='absen') enableArrowNavigation('table-absen');
        if(mode==='catatan') enableArrowNavigation('table-catatan');
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
        if (!kelas) { main.innerHTML = `<div class="p-10 text-red-500 text-center font-bold">Bukan Musyrif</div>`; return; }
        
        const siswa = students.filter(s => s.kelas === kelas);
        const rows = siswa.map((s, i) => {
            const sc = musyrifScores.find(x => x.student_id === s.id) || {};
            return `
            <tr class="hover:bg-gray-50 border-b">
                <td class="p-2 text-center">${i+1}</td>
                <td class="p-2 text-center font-mono">${s.nis||'-'}</td>
                <td class="p-2 text-left font-bold filter-target"><div class="single-line" title="${s.name}" data-name="${s.name}">${s.name}</div></td>
                <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hafalan_wajib" value="${sc.hafalan_wajib||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="hafalan_murojaah" value="${sc.hafalan_murojaah||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="ziyadah" value="${sc.ziyadah||0}" class="nav-input"></td>
                <td class="p-2"><input type="number" data-id="${s.id}" data-nis="${s.nis||''}" data-field="fashohah" value="${sc.fashohah||0}" class="bg-blue-50 nav-input"></td>
            </tr>`;
        }).join('');

        main.innerHTML = `
        <div class="bg-white p-6 rounded shadow">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">Musyrif Kelas ${kelas}</h2>
                <div class="flex gap-2">
                    <button onclick="triggerImport('musyrif', '${kelas}')" class="bg-green-600 text-white px-4 py-2 rounded font-bold shadow text-sm">Import</button>
                    <button onclick="exportExcelMusyrif('${kelas}')" class="bg-blue-600 text-white px-4 py-2 rounded font-bold shadow text-sm">Export</button>
                    <button onclick="saveMusyrifData()" class="bg-purple-600 text-white px-4 py-2 rounded font-bold shadow text-sm">Simpan</button>
                </div>
            </div>
            <table class="w-full text-sm border std-table" id="table-musyrif"><thead class="bg-purple-600 text-white"><tr><th>No</th><th>NIS</th><th class="text-left w-64">Nama</th><th>Wajib</th><th>Murojaah</th><th>Ziyadah</th><th>Fashohah</th></tr></thead><tbody id="tbody-musyrif">${rows}</tbody></table>
        </div>`;
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

    function buildLeggerDataForKelas(kelas){
        const { tahun_ajar, semester } = getActivePeriode();
        const mapels = getMapelListForKelas(kelas);
        const siswa = students.filter(s => String(s.kelas||'').trim() === String(kelas||'').trim());

        const rows = siswa.map((s, idx) => {
            const mvals = {};
            let sum = 0;

            mapels.forEach(m => {
                const sc = (scores||[]).find(x =>
                    String(x.nis||'') === String(s.nis||'') &&
                    String(x.kelas||'').trim() === String(kelas||'').trim() &&
                    String(x.tahun_ajar||'') === String(tahun_ajar||'') &&
                    Number(x.semester||0) === Number(semester||0) &&
                    _upper(x.mapel) === _upper(m)
                );

                const rap = calcNilaiRapor(sc);
                const fixed = rap > 0 ? Math.round(rap * 100) / 100 : 0;
                mvals[_upper(m)] = fixed;
                sum += fixed;
            });

            const rata = mapels.length ? (sum / mapels.length) : 0;

            return {
                no: idx + 1,
                nis: String(s.nis||''),
                nama: String(s.name||s.nama_santri||''),
                jk: String(s.jk||s.lp||''),
                jumlah: Math.round(sum * 100) / 100,
                rata: Math.round(rata * 100) / 100,
                ranking: 0,
                mapel: mvals
            };
        });

        // ranking per kelas (rata-rata desc)
        const sorted = [...rows].sort((a,b) => (b.rata||0) - (a.rata||0) || a.nama.localeCompare(b.nama));
        sorted.forEach((r,i) => { r.ranking = i + 1; });
        const rankMap = new Map(sorted.map(r => [r.nis, r.ranking]));
        rows.forEach(r => r.ranking = rankMap.get(r.nis) || 0);

        return { mapels: mapels.map(_upper), rows, tahun_ajar, semester };
    }

    function renderLeggerTableHTML(kelas, tableId, scopeLabel){
        const { mapels, rows, tahun_ajar, semester } = buildLeggerDataForKelas(kelas);

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
                <td class="p-2 border text-center font-bold">${r.jumlah || 0}</td>
                <td class="p-2 border text-center font-bold">${r.rata || 0}</td>
                <td class="p-2 border text-center font-bold">${r.ranking || '-'}</td>
                <td class="p-2 border text-center">
                    <button onclick="printLeggerSantri('${r.nis}', '${kelas}')" class="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs" title="Print per santri">🖨️</button>
                </td>
                <td class="p-2 border text-center">${r.jk || '-'}</td>
                ${tds}
            </tr>`;
        }).join('');

        const emptyNote = rows.length ? '' : `<div class="text-sm text-gray-500 mb-3">Belum ada santri di kelas ini, atau data belum termuat.</div>`;

        return `
            <div class="text-sm text-gray-600 mb-3">
                <b>${scopeLabel}</b> • Tahun Ajar: <b>${tahun_ajar}</b> • Semester: <b>${semester}</b>
            </div>
            ${emptyNote}
            <div class="overflow-auto max-h-[70vh]">
                <table class="min-w-[1200px] w-full text-xs border std-table whitespace-nowrap" id="${tableId}">
                    <thead class="bg-blue-700 text-white sticky top-0">
                        <tr>
                            <th class="p-2 border">No</th>
                            <th class="p-2 border">NIS</th>
                            <th class="p-2 border text-left">NAMA</th>
                            <th class="p-2 border">JUMLAH</th>
                            <th class="p-2 border">RATA-RATA</th>
                            <th class="p-2 border">RANKING</th>
                            <th class="p-2 border">PRINT</th>
                            <th class="p-2 border">L/P</th>
                            ${headMapel}
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
                JUMLAH: r.jumlah,
                'RATA-RATA': r.rata,
                RANKING: r.ranking,
                'L/P': r.jk,
            };
            mapels.forEach(m => { o[m] = (r.mapel[m] ? r.mapel[m] : ''); });
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
        const head = ['No','NIS','NAMA','JUMLAH','RATA-RATA','RANKING','L/P', ...mapels];
        const thead = head.map(h=>`<th>${h}</th>`).join('');
        const tbody = rows.map(r=>{
            const cells = [
                r.no, r.nis, r.nama, r.jumlah, r.rata, r.ranking, r.jk,
                ...mapels.map(m => r.mapel[m] ? r.mapel[m] : '')
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

    function printLeggerSantri(nis, kelas){
        const { mapels, rows, tahun_ajar, semester } = buildLeggerDataForKelas(kelas);
        const r = rows.find(x => String(x.nis) === String(nis));
        if(!r) { showToast('Data santri tidak ditemukan di legger.', 'error'); return; }

        const tbody = mapels.map(m => {
            const v = (r.mapel && r.mapel[m] !== undefined && r.mapel[m] !== null && r.mapel[m] !== '') ? r.mapel[m] : '-';
            return '<tr><td>' + m + '</td><td class="center">' + v + '</td></tr>';
        }).join('');

        const html = [
            '<h1>PRINT PER SANTRI (FORMAT SEMENTARA)</h1>',
            '<div class="meta">' +
              'Nama: <b>' + (r.nama || '-') + '</b> • NIS: <b>' + (r.nis || '-') + '</b> • Kelas: <b>' + (kelas || '-') + '</b><br/>' +
              'Tahun Ajar: <b>' + (tahun_ajar || '-') + '</b> • Semester: <b>' + (semester || '-') + '</b>' +
            '</div>',
            '<table>',
              '<thead><tr><th>Mapel</th><th>Nilai</th></tr></thead>',
              '<tbody>' + tbody + '</tbody>',
            '</table>',
            '<div class="meta">Catatan: format final “print rapor per-santri” menyusul sesuai instruksi berikutnya.</div>'
        ].join(String.fromCharCode(10));

        _printHTML('LEGGER_' + kelas + '_' + r.nis, html);
    }


    async function renderAdminLegger(){
        const main = document.getElementById('main-content');
        const kelasList = Array.from(new Set(students.map(s=>String(s.kelas||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        const defaultKelas = kelasList[0] || '';
        main.innerHTML = `
            <div class="bg-white p-6 rounded shadow">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-2xl font-bold">📊 Legger Santri</h2>
                        <div class="text-sm text-gray-600">Tampilan ini mengikuti filter kelas.</div>
                    </div>
                    <div class="flex flex-wrap gap-2 items-center justify-end">
                        <select id="admin-legger-kelas" class="border rounded px-3 py-2 text-sm">
                            ${kelasList.map(k=>`<option value="${k}">${k}</option>`).join('')}
                        </select>
                        <button onclick="exportLeggerXLSX(document.getElementById('admin-legger-kelas').value)" class="bg-indigo-600 text-white px-4 py-2 rounded font-bold shadow text-sm">XLSX</button>
                        <button onclick="printLeggerKelas(document.getElementById('admin-legger-kelas').value, true)" class="bg-gray-700 text-white px-4 py-2 rounded font-bold shadow text-sm">PDF</button>
                        <button onclick="printLeggerKelas(document.getElementById('admin-legger-kelas').value, false)" class="bg-green-700 text-white px-4 py-2 rounded font-bold shadow text-sm">Print</button>
                    </div>
                </div>
                <div id="admin-legger-wrap"></div>
            </div>
        `;
        const sel = document.getElementById('admin-legger-kelas');
        const render = () => {
            const k = sel.value;
            document.getElementById('admin-legger-wrap').innerHTML = renderLeggerTableHTML(k, 'table-legger-admin', `Admin • Kelas ${k}`);
        };
        if (defaultKelas) sel.value = defaultKelas;
        sel.addEventListener('change', render);
        render();
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
            return {NIS: s.nis, Nama: s.name, Kelas: kelas, Mapel: mapel, Hadir: sc.kehadiran||0, UH1: sc.uh1||0, UH2: sc.uh2||0, UH3: sc.uh3||0, UH4: sc.uh4||0, UH5: sc.uh5||0, Tugas: sc.tugas||0, "PAS/PAT": sc.pas_pat||sc.pas||0};
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
    function toggleSidebar() { document.getElementById('sidebar').classList.toggle('-translate-x-full'); }
    function logout() { localStorage.removeItem('erapor_user'); window.location.href = 'login.html'; }
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
  