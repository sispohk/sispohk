
    const currentUser = getCurrentUser();
    if (!currentUser) window.location.href = 'login.html';

    // ===== ROLE HELPERS (Guru/Wali gabungan) =====
    function hasText(v) {
      return v !== null && v !== undefined && String(v).trim() !== '';
    }
    function getWaliKelas(u) {
      // dukung beberapa kemungkinan penamaan
      return (hasText(u?.kelas_wali) ? String(u.kelas_wali).trim()
        : hasText(u?.kelas) ? String(u.kelas).trim()
        : '');
    }
    function isAdminUser(u) {
      return u?.role === 'admin';
    }
    function isGuruUser(u) {
      return u?.role === 'guru' || u?.role === 'guru_wali';
    }
    function isWaliUser(u) {
      // role wali murni ATAU guru yang punya kelas_wali
      return u?.role === 'wali_kelas' || u?.role === 'guru_wali' || (isGuruUser(u) && hasText(getWaliKelas(u)));
    }
    function roleLabel(u) {
      const guru = isGuruUser(u);
      const wali = isWaliUser(u);
      if (guru && wali) return 'guru & wali';
      if (guru) return 'guru';
      if (wali) return 'wali_kelas';
      return String(u?.role || '-');
    }

    // Tampilkan label peran yang lebih manusiawi
    document.getElementById('user-info').innerText = `Halo, ${currentUser.name} (${roleLabel(currentUser)})`;

    // ===== UX UTILITIES (Paket 1) =====
    const toastContainer = document.getElementById('toast-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    function showToast(message, variant = 'info', timeoutMs = 3200) {
      if (!toastContainer) return;

      const variantStyles = {
        success: { ring: 'ring-1 ring-green-200', bg: 'bg-green-50', text: 'text-green-900', dot: 'bg-green-600', label: 'Sukses' },
        error:   { ring: 'ring-1 ring-red-200',   bg: 'bg-red-50',   text: 'text-red-900',   dot: 'bg-red-600',   label: 'Gagal'  },
        warn:    { ring: 'ring-1 ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-900', dot: 'bg-amber-600', label: 'Info'   },
        info:    { ring: 'ring-1 ring-blue-200',  bg: 'bg-blue-50',  text: 'text-blue-900',  dot: 'bg-blue-600',  label: 'Info'   },
      };
      const s = variantStyles[variant] || variantStyles.info;

      const el = document.createElement('div');
      el.className = `rounded-xl shadow-lg ${s.bg} ${s.ring} px-4 py-3 flex gap-3 items-start`;
      el.innerHTML = `
        <div class="mt-1 h-2.5 w-2.5 rounded-full ${s.dot}"></div>
        <div class="flex-1">
          <div class="text-xs font-semibold opacity-80">${s.label}</div>
          <div class="text-sm ${s.text} leading-snug">${escapeHtml(message)}</div>
        </div>
        <button class="text-gray-500 hover:text-gray-700" aria-label="Tutup">✕</button>
      `;

      const closeBtn = el.querySelector('button');
      const remove = () => {
        el.classList.add('opacity-0', 'translate-x-2');
        setTimeout(() => el.remove(), 160);
      };
      closeBtn.addEventListener('click', remove);

      el.style.transition = 'all 160ms ease';
      toastContainer.appendChild(el);

      setTimeout(remove, timeoutMs);
    }

    function setLoading(isLoading, title = 'Memproses…', subtitle = 'Mohon tunggu sebentar.') {
      if (!loadingOverlay) return;
      document.getElementById('loading-title').innerText = title;
      document.getElementById('loading-subtitle').innerText = subtitle;

      if (isLoading) {
        loadingOverlay.classList.remove('hidden');
        document.body.classList.add('cursor-wait');
      } else {
        loadingOverlay.classList.add('hidden');
        document.body.classList.remove('cursor-wait');
      }
    }

    function openConfirm({ title = 'Konfirmasi', message = 'Apakah kamu yakin?', okText = 'Ya, lanjut', danger = true, onConfirm }) {
      const modal = document.getElementById('confirm-modal');
      const ttl = document.getElementById('confirm-title');
      const msg = document.getElementById('confirm-message');
      const btnCancel = document.getElementById('confirm-cancel');
      const btnOk = document.getElementById('confirm-ok');
      if (!modal || !btnCancel || !btnOk) return;

      ttl.innerText = title;
      msg.innerText = message;
      btnOk.innerText = okText;
      btnOk.className = danger
        ? 'px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700'
        : 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700';

      const onBackdrop = (e) => { if (e.target === modal) cleanup(); };

      const cleanup = () => {
        modal.classList.add('hidden');
        modal.removeEventListener('click', onBackdrop);
        btnCancel.removeEventListener('click', onCancel);
        btnOk.removeEventListener('click', onOk);
      };

      const onCancel = () => cleanup();

      const onOk = async () => {
        try { await onConfirm?.(); } finally { cleanup(); }
      };

      modal.classList.remove('hidden');
      modal.addEventListener('click', onBackdrop);
      btnCancel.addEventListener('click', onCancel);
      btnOk.addEventListener('click', onOk);
    }

    function clampScore(value) {
      const n = parseInt(value, 10);
      if (Number.isNaN(n)) return 0;
      return Math.max(0, Math.min(100, n));
    }

    function clampScoreNullable(value) {
      if (value === '' || value === null || value === undefined) return null;
      const n = parseInt(value, 10);
      if (Number.isNaN(n)) return null;
      return Math.max(0, Math.min(100, n));
    }

    function calcUhFromParts(parts) {
      const vals = (parts || [])
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .map(v => Number(v))
        .filter(v => Number.isFinite(v));
      if (!vals.length) return null;
      return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
    }

    const DEFAULT_BOBOT = { hadir: 10, tugas: 20, uh: 40, pas: 30 };

    function bobotKey(kelas, mapel) {
      return 'bobot:global';
    }

    function loadBobot(kelas, mapel) {
      try {
        const raw = localStorage.getItem(bobotKey(kelas, mapel));
        if (!raw) return { ...DEFAULT_BOBOT };
        const obj = JSON.parse(raw);
        const w = {
          hadir: Number(obj.hadir),
          tugas: Number(obj.tugas),
          uh: Number(obj.uh),
          pas: Number(obj.pas),
        };
        const ok = ['hadir','tugas','uh','pas'].every(k => Number.isFinite(w[k]) && w[k] >= 0);
        return ok ? w : { ...DEFAULT_BOBOT };
      } catch {
        return { ...DEFAULT_BOBOT };
      }
    }

    function saveBobot(kelas, mapel, w) {
      localStorage.setItem(bobotKey(kelas, mapel), JSON.stringify(w));
    }

    function calcNilaiAkhir(score, w) {
      const hadir = Number(score?.kehadiran) || 0;
      const tugas = Number(score?.tugas) || 0;
      const uhAvg = Number(score?.uh);
      const uh = Number.isFinite(uhAvg) ? uhAvg : (Number(getUhAvg(score)) || 0);
      const pas = Number(score?.pas) || 0;
      return Math.round((hadir * w.hadir + tugas * w.tugas + uh * w.uh + pas * w.pas) / 100);
    }


    function setBobotUI(w) {
      const ih = document.getElementById('bobot-hadir');
      const it = document.getElementById('bobot-tugas');
      const iu = document.getElementById('bobot-uh');
      const ip = document.getElementById('bobot-pas');
      if (!ih || !it || !iu || !ip) return;
      ih.value = w.hadir;
      it.value = w.tugas;
      iu.value = w.uh;
      ip.value = w.pas;
      updateBobotTotal();
    }

    function readBobotUI() {
      const ih = document.getElementById('bobot-hadir');
      const it = document.getElementById('bobot-tugas');
      const iu = document.getElementById('bobot-uh');
      const ip = document.getElementById('bobot-pas');
      const w = {
        hadir: Number(ih?.value) || 0,
        tugas: Number(it?.value) || 0,
        uh: Number(iu?.value) || 0,
        pas: Number(ip?.value) || 0,
      };
      return w;
    }

    function updateBobotTotal() {
      const s = document.getElementById('bobot-total');
      const btnSave = document.querySelector('button[onclick="saveScores()"]');
      const w = readBobotUI();
      const total = (w.hadir + w.tugas + w.uh + w.pas);
      if (s) s.textContent = `Total: ${total}%`;
      const ok = (total === 100);
      if (s) {
        s.classList.toggle('text-emerald-700', ok);
        s.classList.toggle('text-amber-700', !ok);
      }
      if (btnSave) {
        btnSave.disabled = !ok;
        btnSave.classList.toggle('opacity-60', !ok);
        btnSave.classList.toggle('cursor-not-allowed', !ok);
      }
      return { total, ok };
    }

    function syncBobotUI() {
      const panel = document.getElementById('bobot-panel');
      if (!panel) return;
      panel.classList.remove('hidden');
      const w = loadBobot();
      setBobotUI(w);
    }

    function bindBobotUIOnce() {
      const panel = document.getElementById('bobot-panel');
      if (!panel) return;
      if (panel.dataset.bound === '1') return;
      panel.dataset.bound = '1';

      const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
      const onChange = () => {
        const ih = document.getElementById('bobot-hadir');
        const it = document.getElementById('bobot-tugas');
        const iu = document.getElementById('bobot-uh');
        const ip = document.getElementById('bobot-pas');
        if (ih) ih.value = clamp(ih.value);
        if (it) it.value = clamp(it.value);
        if (iu) iu.value = clamp(iu.value);
        if (ip) ip.value = clamp(ip.value);
        const { ok } = updateBobotTotal();
        saveBobot(null, null, readBobotUI());
        if (!ok) {
          showToast('Total bobot harus 100%.', 'warn', 2000);
        }
      };

      ['bobot-hadir','bobot-tugas','bobot-uh','bobot-pas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', onChange);
      });

      // initial
      updateBobotTotal();
    }


    function initAdminBobot() {
      // tampilkan & sinkron bobot global
      syncBobotUI();
      bindBobotUIOnce();
    }

    function getUhAvg(sc) {
      if (!sc) return "";
      const raw = [sc.uh1, sc.uh2, sc.uh3, sc.uh4, sc.uh5];
      const vals = raw
        .filter(v => v !== null && v !== undefined && String(v).trim() !== "")
        .map(v => Number(v))
        .filter(v => Number.isFinite(v));
      if (vals.length) return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
      const legacy = Number(sc.uh);
      return Number.isFinite(legacy) ? legacy : "";
    }

    function escapeHtml(str) {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }


    function normalizeText(str) {
      return String(str ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    

function populateSantriKelasFilter() {
  const sel = document.getElementById('admin-santri-kelas-filter');
  if (!sel) return;

  const kelasList = [...new Set((students || [])
    .map(s => s?.kelas)
    .filter(Boolean)
  )].sort((a,b) => String(a).localeCompare(String(b), 'id'));

  const current = sel.value || '';
  sel.innerHTML = `<option value="">Semua Kelas</option>` +
    kelasList.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');

  if (kelasList.includes(current)) sel.value = current;
}

// untuk kompatibilitas cetak rapor (beberapa template lama mengecek fitur absen)
function isAttendanceSupported() {
  const sample = (students && students.length) ? students[0] : null;
  if (!sample) return true;
  return ('hadir_s' in sample) || ('hadir_i' in sample) || ('hadir_a' in sample);
}

// ===== PAKET 2: INPUT NILAI NGEBUT =====
    let autoSaveEnabled = false;
    let lastFocusedInput = null;
    const rowSaveTimers = new Map();
    let bulkSaveTimer = null;

    function getRowElFromInput(inputEl) {
      return inputEl?.closest?.('.student-row') || null;
    }

    function setAutosaveStatus(text) {
      const el = document.getElementById('autosave-status');
      if (el) el.textContent = text || '';
    }
    // Status badge per siswa (Paket 2.5)
    function setRowStatus(rowEl, state) {
      if (!rowEl) return;

      const badge = rowEl.querySelector('.row-status');
      const dot = rowEl.querySelector('.row-dot');
      const text = rowEl.querySelector('.row-status-text');

      const map = {
        empty:  { label: 'Belum',     badge: 'border-gray-200 text-gray-700 bg-gray-50', dot: 'bg-gray-400' },
        dirty:  { label: 'Menunggu',  badge: 'border-amber-200 text-amber-800 bg-amber-50', dot: 'bg-amber-500' },
        saving: { label: 'Menyimpan', badge: 'border-blue-200 text-blue-800 bg-blue-50', dot: 'bg-blue-600' },
        saved:  { label: 'Tersimpan', badge: 'border-green-200 text-green-800 bg-green-50', dot: 'bg-green-600' },
        error:  { label: 'Gagal',     badge: 'border-red-200 text-red-800 bg-red-50', dot: 'bg-red-600' }
      };

      const cfg = map[state] || map.empty;
      rowEl.dataset.status = state;

      if (badge) {
        // reset class ke base + cfg
        badge.className = 'row-status inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border ' + cfg.badge;
        badge.dataset.state = state;
      }
      if (dot) dot.className = 'row-dot h-2 w-2 rounded-full ' + cfg.dot;
      if (text) text.textContent = cfg.label;

      updateRowSaveButtonState(rowEl);
    }

    function updateRowSaveButtonState(rowEl) {
      const btn = rowEl?.querySelector?.('.btn-save-row');
      if (!btn) return;

      const status = rowEl.dataset.status || 'empty';
      const dirty = rowEl.dataset.dirty === '1';

      // aturan sederhana:
      // - kalau saving => disable
      // - kalau saved & tidak dirty => disable (sudah aman)
      // - sisanya => enable (dirty / empty / error)
      const disabled = status === 'saving' || (status === 'saved' && !dirty);
      btn.disabled = disabled;

      if (status === 'saving') btn.textContent = '...';
      else btn.textContent = 'Simpan';
    }

    // Klik tombol "Simpan" per baris (sekali binding pakai delegation)
    let __rowSaveBound = false;
    function bindRowSaveDelegationOnce() {
      if (__rowSaveBound) return;
      __rowSaveBound = true;

      const tbody = document.getElementById('input-tbody');
      if (!tbody) return;

      tbody.addEventListener('click', async (e) => {
        const btn = e.target.closest?.('[data-action="save-row"]');
        if (!btn) return;

        const rowEl = btn.closest('.student-row');
        if (!rowEl) return;

        setLoading(true, 'Menyimpan…', 'Menyimpan 1 baris nilai.');
        try {
          await saveRow(rowEl, { silent: true });
          showToast('Baris tersimpan.', 'success', 1800);
        } finally {
          setLoading(false);
        }
      });
    }

    // Auto-save toggle & Copy down: bind aman dari duplikasi
    let __autoUIBound = false;
    function bindAutoSaveUIOnce() {
      if (__autoUIBound) return;
      __autoUIBound = true;
    }


    function markRowDirty(rowEl, dirty = true) {
      if (!rowEl) return;
      if (dirty) {
        rowEl.dataset.dirty = '1';
        rowEl.classList.add('bg-amber-50');
        setRowStatus(rowEl, 'dirty');
      } else {
        rowEl.dataset.dirty = '0';
        rowEl.classList.remove('bg-amber-50');
        // status jangan diubah di sini; biar saveRow yang menentukan
        updateRowSaveButtonState(rowEl);
      }
    }
    function getRowData(rowEl) {
      const name = rowEl.getAttribute('data-name');

      const u1 = clampScoreNullable(rowEl.querySelector('.i-u1')?.value);
      const u2 = clampScoreNullable(rowEl.querySelector('.i-u2')?.value);
      const u3 = clampScoreNullable(rowEl.querySelector('.i-u3')?.value);
      const u4 = clampScoreNullable(rowEl.querySelector('.i-u4')?.value);
      const u5 = clampScoreNullable(rowEl.querySelector('.i-u5')?.value);

      const uh = calcUhFromParts([u1, u2, u3, u4, u5]);

      return {
        student_name: name,
        kelas: selKelas,
        mapel: selMapel,
        kehadiran: clampScore(rowEl.querySelector('.i-h')?.value),
        tugas: clampScore(rowEl.querySelector('.i-t')?.value),
        uh: uh,
        uh1: u1,
        uh2: u2,
        uh3: u3,
        uh4: u4,
        uh5: u5,
        pas: clampScore(rowEl.querySelector('.i-p')?.value),
      };
    }

    async function saveRow(rowEl, { silent = false } = {}) {
      if (!rowEl) return;

      const data = getRowData(rowEl);

      // sinkronkan UI biar rapi (0–100)
      rowEl.querySelector('.i-h').value = data.kehadiran;
      rowEl.querySelector('.i-t').value = data.tugas;
      rowEl.querySelector('.i-u1').value = (data.uh1 ?? '');
      rowEl.querySelector('.i-u2').value = (data.uh2 ?? '');
      rowEl.querySelector('.i-u3').value = (data.uh3 ?? '');
      rowEl.querySelector('.i-u4').value = (data.uh4 ?? '');
      rowEl.querySelector('.i-u5').value = (data.uh5 ?? '');
      rowEl.querySelector('.i-p').value = data.pas;

      setRowStatus(rowEl, 'saving');

      try {
        setAutosaveStatus(silent ? 'Menyimpan otomatis…' : 'Menyimpan…');
        await saveScoreToDB(data);

        // update cache lokal scores
        const idx = scores.findIndex(sc => sc.student_name === data.student_name && sc.mapel === data.mapel);
        if (idx >= 0) scores[idx] = { ...scores[idx], ...data };
        else scores.push({ ...data });

        // baris sekarang dianggap tersimpan
        rowEl.dataset.dirty = '0';
        rowEl.classList.remove('bg-amber-50');
        setRowStatus(rowEl, 'saved');

        if (!silent) showToast('Baris tersimpan.', 'success', 1800);
      } catch (err) {
        console.error(err);
        setRowStatus(rowEl, 'error');
        showToast('Gagal menyimpan (cek koneksi / data bentrok).', 'error', 3800);
      } finally {
        setAutosaveStatus('');
      }
    }

    function scheduleSaveRow(rowEl) {
      if (!autoSaveEnabled || !rowEl) return;
      const key = rowEl.getAttribute('data-name');
      const prev = rowSaveTimers.get(key);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => saveRow(rowEl, { silent: true }), 900);
      rowSaveTimers.set(key, t);
    }

    function scheduleSaveDirtyAll() {
      if (!autoSaveEnabled) return;
      if (bulkSaveTimer) clearTimeout(bulkSaveTimer);

      bulkSaveTimer = setTimeout(async () => {
        const dirtyRows = [...document.querySelectorAll('.student-row[data-dirty="1"]')];
        if (!dirtyRows.length) return;

        setAutosaveStatus('Menyimpan otomatis (batch)…');
        for (const r of dirtyRows) {
          await saveRow(r, { silent: true });
        }
        setAutosaveStatus('');
      }, 1000);
    }

    function focusCell(rowIdx, colIdx) {
      const el = document.querySelector(`.score-input[data-row="${rowIdx}"][data-col="${colIdx}"]`);
      if (el) { el.focus(); el.select?.(); }
    }

    function bindInputBehaviors() {
      document.querySelectorAll('.score-input').forEach(inp => {
        inp.addEventListener('focus', () => { lastFocusedInput = inp; });

        inp.addEventListener('keydown', (e) => {
          const row = parseInt(inp.dataset.row, 10);
          const col = parseInt(inp.dataset.col, 10);
          const maxRow = parseInt(inp.dataset.maxRow, 10);
          const maxCol = parseInt(inp.dataset.maxCol || '7', 10);

          const move = (r, c) => {
            const nr = Math.max(0, Math.min(maxRow, r));
            const nc = Math.max(0, Math.min(maxCol, c));
            focusCell(nr, nc);
          };

          if (e.key === 'ArrowRight') { e.preventDefault(); move(row, col + 1); }
          if (e.key === 'ArrowLeft')  { e.preventDefault(); move(row, col - 1); }
          if (e.key === 'ArrowDown')  { e.preventDefault(); move(row + 1, col); }
          if (e.key === 'ArrowUp')    { e.preventDefault(); move(row - 1, col); }
        });
      });
    }

    // ===== Excel Preview Flow (dinonaktifkan) =====
    function openExcelPreview({ applyFn } = {}) {
      try {
        if (typeof applyFn === 'function') applyFn();
      } catch (e) {
        console.error(e);
        showToast('Gagal menerapkan Excel.', 'error', 3500);
      }
    }

    // ===== Validasi input nilai (0–100) + dirty =====
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (el && el.classList && el.classList.contains('score-input')) {
        if (el.value.length > 3) el.value = el.value.slice(0, 3);
        const rowEl = getRowElFromInput(el);
        markRowDirty(rowEl, true);}
    });

    document.addEventListener('blur', (e) => {
      const el = e.target;
      if (el && el.classList && el.classList.contains('score-input')) {
        el.value = clampScore(el.value);
      }
    }, true);

    // ===== INIT LOAD =====
    (async () => {
      setLoading(true, 'Memuat data…', 'Mengambil data dari database.');
      try {
        await loadInitialData();

        if (isAdminUser(currentUser)) {
          bindAdminControls();
        }

        if (isGuruUser(currentUser)) {
          renderGuruMapelSidebar();
    renderMusyrifSidebar();
        }

        if (isWaliUser(currentUser)) {
          document.getElementById('menu-wali').classList.remove('hidden');
          const kelas = getWaliKelas(currentUser) || '-';
          document.getElementById('wali-kelas-lbl').innerText = kelas;
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal memuat data. Cek koneksi internet / konfigurasi Supabase.', 'error', 4500);
      } finally {
        setLoading(false);
      }
    
      try { bindWaliListeners(); } catch(e) { console.warn(e); }
})();

    // ===== NAVIGASI =====
    function showSection(id) {
      document.querySelectorAll('.section').forEach(e => e.classList.add('hidden'));
      const target = document.getElementById('section-' + id);
      if (target) target.classList.remove('hidden');

      if (id === 'input-nilai') initInputNilai();
      if (id === 'wali-dashboard') renderWaliTab();
      if (id === 'admin-bobot') initAdminBobot();
      if (id === 'guru-dashboard') renderGuruDashboard();
      if (id === 'musyrif-dashboard') renderMusyrifDashboard();
    }


    // ===== DASHBOARD RINGKAS (TOP MENU) =====
    function openGuruDashboard() {
      showSection('guru-dashboard');
    }
    function openMusyrifDashboard() {
      showSection('musyrif-dashboard');
    }
    function openWaliDashboard() {
      showWaliTab('overview');
    }

    async function refreshGuruDashboard() {
      try { setLoading(true, 'Memuat...', 'Mengambil data terbaru'); } catch(e) {}
      try { await loadInitialData(); } catch(e) { console.warn(e); }
      try { renderGuruDashboard(); } catch(e) { console.warn(e); }
      try { setLoading(false); } catch(e) {}
    }

    async function refreshMusyrifDashboard() {
      try { setLoading(true, 'Memuat...', 'Mengambil data terbaru'); } catch(e) {}
      try { await loadInitialData(); } catch(e) { console.warn(e); }
      try { renderMusyrifDashboard(); } catch(e) { console.warn(e); }
      try { setLoading(false); } catch(e) {}
    }

    function renderGuruDashboard() {
      const mp = safeArray(currentUser?.mapel);
      const kelasAjar = safeArray(currentUser?.classes);

      const mpCount = mp.length;
      const kCount = kelasAjar.length;

      const filtered = (Array.isArray(scores) ? scores : []).filter(sc => {
        const okMapel = mp.includes(sc.mapel);
        const okKelas = !kCount || kelasAjar.includes(sc.kelas);
        return okMapel && okKelas;
      });

      const pasVals = filtered.map(r => Number(r.pas)).filter(v => Number.isFinite(v));
      const avgPas = pasVals.length ? Math.round(pasVals.reduce((a,b)=>a+b,0) / pasVals.length) : null;

      const elMapel = document.getElementById('guru-stat-mapel');
      const elKelas = document.getElementById('guru-stat-kelas');
      const elEntri = document.getElementById('guru-stat-entri');
      const elAvg   = document.getElementById('guru-stat-avgpas');

      if (elMapel) elMapel.textContent = String(mpCount);
      if (elKelas) elKelas.textContent = String(kCount);
      if (elEntri) elEntri.textContent = String(filtered.length);
      if (elAvg) elAvg.textContent = avgPas === null ? '-' : String(avgPas);

      const tb = document.getElementById('guru-dashboard-tbody');
      if (!tb) return;

      if (!mpCount) {
        tb.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 italic">Mapel belum diatur.</td></tr>`;
        return;
      }

      tb.innerHTML = mp.map(m => {
        const rows = filtered.filter(r => String(r.mapel) === String(m));
        const kelasSet = new Set(rows.map(r => String(r.kelas || '').trim()).filter(Boolean));
        const pVals = rows.map(r => Number(r.pas)).filter(v => Number.isFinite(v));
        const aPas = pVals.length ? Math.round(pVals.reduce((a,b)=>a+b,0) / pVals.length) : null;

        return `<tr class="border-b">
          <td class="p-2">${escapeHtml(m)}</td>
          <td class="p-2">${kelasSet.size}</td>
          <td class="p-2">${rows.length}</td>
          <td class="p-2">${aPas === null ? '-' : aPas}</td>
        </tr>`;
      }).join('');
      bindTbodyArrowNav('wali-absen-tbody');
    }

    function getSingleMusyrifKelas() {
      const raw = (currentUser?.musyrif || '').trim();
      const arr = parseMusyrifClasses(raw);
      return arr && arr.length ? String(arr[0]) : '';
    }

    function renderMusyrifDashboard() {
      const kelas = getSingleMusyrifKelas();
      const siswa = (Array.isArray(students) ? students : []).filter(s => String(s.kelas) === String(kelas));
      const ms = (Array.isArray(musyrifScores) ? musyrifScores : []).filter(r => String(r.kelas) === String(kelas));

      const totalSiswa = siswa.length;
      const entri = ms.length;
      const cover = totalSiswa ? Math.round((entri / totalSiswa) * 100) : 0;

      const avg = (key) => {
        const vals = ms.map(r => Number(r[key])).filter(v => Number.isFinite(v));
        return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0) / vals.length) : null;
      };

      const elK = document.getElementById('musyrif-stat-kelas');
      const elS = document.getElementById('musyrif-stat-siswa');
      const elE = document.getElementById('musyrif-stat-entri');
      const elC = document.getElementById('musyrif-stat-cover');
      const elFs = document.getElementById('musyrif-stat-avgfs');

      if (elK) elK.textContent = kelas || '-';
      if (elS) elS.textContent = String(totalSiswa);
      if (elE) elE.textContent = String(entri);
      if (elC) elC.textContent = `${cover}%`;

      const avgFs = avg('fashohah');
      if (elFs) elFs.textContent = avgFs === null ? '-' : String(avgFs);

      const elHW = document.getElementById('musyrif-avg-hw');
      const elHM = document.getElementById('musyrif-avg-hm');
      const elZY = document.getElementById('musyrif-avg-zy');
      const elAF = document.getElementById('musyrif-avg-fs');

      const aHW = avg('hafalan_wajib');
      const aHM = avg('hafalan_murojaah');
      const aZY = avg('ziyadah');

      if (elHW) elHW.textContent = aHW === null ? '-' : String(aHW);
      if (elHM) elHM.textContent = aHM === null ? '-' : String(aHM);
      if (elZY) elZY.textContent = aZY === null ? '-' : String(aZY);
      if (elAF) elAF.textContent = avgFs === null ? '-' : String(avgFs);
    }

    // ===== Role menu =====
    if (isAdminUser(currentUser)) document.getElementById('menu-admin').classList.remove('hidden');
    if (isGuruUser(currentUser)) document.getElementById('menu-guru').classList.remove('hidden');
    if ((currentUser?.musyrif || '').trim()) document.getElementById('menu-musyrif').classList.remove('hidden');
    if (isWaliUser(currentUser)) document.getElementById('menu-wali').classList.remove('hidden');

    // ===== GURU =====
    let selKelas = '';
    let selMapel = '';

    function safeArray(x) {
      if (Array.isArray(x)) return x;
      if (!x) return [];
      try { return JSON.parse(x); } catch { return []; }
    }

    
    // ===== PAKET 4.2 (CLEAN): Sidebar Mapel Aktif -> Pilih Mapel dulu, lalu Kelas =====
    var sidebarSelectedMapel = '';
    var sidebarLastKelasByMapel = {};
    var sidebarKelasDropdownBound = false;

    function getGuruMapelList() {
      return safeArray(currentUser?.mapel);
    }

    function renderGuruMapelSidebar() {
      const list = document.getElementById('guru-mapel-list');
      if (!list) return;

      const mp = getGuruMapelList();
      if (!mp.length) {
        list.innerHTML = '<div class="text-blue-100 italic">Belum ada mapel</div>';
        return;
      }

      list.innerHTML = mp.map(m => {
        const label = escapeHtml(m);
        const key = String(m);
        const isActive = sidebarSelectedMapel === key;
        const cls = isActive
          ? 'w-full text-left px-2 py-1 rounded bg-blue-700 text-white shadow-sm'
          : 'w-full text-left px-2 py-1 rounded hover:bg-blue-700/60 text-blue-50';

        const safe = key.replaceAll("'", "\\'");
        return `<button class="${cls}" onclick="openInputNilaiFromSidebar('${safe}')">📘 ${label}</button>`;
      }).join('');
    }


    function openInputNilaiFromSidebar(mapel) {
      sidebarSelectedMapel = String(mapel || '');
      selMapel = sidebarSelectedMapel;
      selKelas = '';

      // highlight aktif
      renderGuruMapelSidebar();

      // buka input nilai -> langsung pilih kelas
      showSection('input-nilai');
    }

    
    // ===== MUSYRIF: Sidebar kelas yang diampu =====
    function parseMusyrifClasses(raw) {
      const v = String(raw || '').trim();
      if (!v) return [];
      // support JSON array text
      if ((v.startsWith('[') && v.endsWith(']'))) {
        try {
          const arr = JSON.parse(v);
          if (Array.isArray(arr)) return arr.map(x => String(x).trim()).filter(Boolean);
        } catch (e) {}
      }
      // support comma-separated
      return v.split(',').map(s => s.trim()).filter(Boolean);
    }

    function renderMusyrifSidebar() {
      const list = document.getElementById('musyrif-kelas-list');
      if (!list) return;

      const raw = (currentUser?.musyrif || '').trim();
      const kelasList = parseMusyrifClasses(raw);

      if (!kelasList.length) {
        list.innerHTML = '<div class="text-blue-100 italic">Belum ada kelas musyrif</div>';
        return;
      }

      list.innerHTML = kelasList.map(k => {
        const label = escapeHtml(k);
        return `<button class="w-full text-left px-2 py-1 rounded hover:bg-blue-700/60 text-blue-50" onclick="openMusyrifKelasFromSidebar('${encodeURIComponent(k)}')">📗 ${label}</button>`;
      }).join('');
    }

    function openMusyrifKelasFromSidebar(kelasEncoded) {
      const kelas = decodeURIComponent(String(kelasEncoded || ''));
      sidebarSelectedMapel = '__MUSYRIF__';
      selMapel = sidebarSelectedMapel;
      selKelas = kelas;
      sidebarLastKelasByMapel[sidebarSelectedMapel] = kelas;
      renderGuruMapelSidebar();
      renderMusyrifSidebar();
      showSection('input-nilai');
    }


    function clearSidebarMapel() {
      sidebarSelectedMapel = '';
      selMapel = '';
      // reset agar alur normal (kelas -> mapel)
      initInputNilai();
      renderGuruMapelSidebar();
    }

    function showInputTableFromSidebar(kelas) {
      selKelas = kelas;
      if (!selMapel) {
        // fallback: kalau mapel belum dipilih, pakai alur normal
        showMapel(kelas);
        return;
      }

      document.getElementById('lbl-kelas2').innerText = selKelas;
      document.getElementById('lbl-mapel').innerText = selMapel;

      document.getElementById('guru-step-kelas').classList.add('hidden');
      document.getElementById('guru-step-mapel').classList.add('hidden');
      document.getElementById('guru-step-table').classList.remove('hidden');

      renderTable();
    }


    function initInputNilai() {
      // Mode: mapel dipilih dari sidebar -> dropdown kelas -> tabel langsung tampil
      if (sidebarSelectedMapel) {
        initInputNilaiSidebar();
        return;
      }

      // reset UI header tabel (untuk mode normal)
      const btnBack = document.getElementById('btn-back-table');
      const btnGanti = document.getElementById('btn-ganti-mapel');
      const normalInfo = document.getElementById('normal-kelas-mapel-info');
      const sidebarInfo = document.getElementById('sidebar-kelas-mapel-info');
      if (btnBack) btnBack.classList.remove('hidden');
      if (btnGanti) btnGanti.classList.add('hidden');
      if (normalInfo) normalInfo.classList.remove('hidden');
      if (sidebarInfo) sidebarInfo.classList.add('hidden');

      document.getElementById('guru-step-kelas').classList.remove('hidden');
      document.getElementById('guru-step-mapel').classList.add('hidden');
      document.getElementById('guru-step-table').classList.add('hidden');

      // Banner mapel (kalau masuk lewat sidebar mapel)
      const banner = document.getElementById('mapel-banner');
      const bannerMapel = document.getElementById('banner-mapel');
      if (banner && bannerMapel) {
        if (sidebarSelectedMapel) {
          banner.classList.remove('hidden');
          bannerMapel.innerText = sidebarSelectedMapel;
        } else {
          banner.classList.add('hidden');
          bannerMapel.innerText = '';
        }
      }

      const kelasList = document.getElementById('kelas-list');
      kelasList.innerHTML = '';

      const kelasAjar = (selMapel === '__MUSYRIF__')
        ? ((currentUser?.musyrif || '').trim() ? [String(currentUser.musyrif).trim()] : [])
        : safeArray(currentUser.classes);
      if (!kelasAjar.length) {
        kelasList.innerHTML = `<div class="text-gray-500 italic">Kelas ajar belum diatur.</div>`;
        return;
      }

      kelasAjar.forEach(k => {
        const safeK = String(k).replaceAll("'", "\\'");
        const onclickFn = sidebarSelectedMapel
          ? `showInputTableFromSidebar('${safeK}')`
          : `showMapel('${safeK}')`;

        kelasList.innerHTML += `
          <button onclick="${onclickFn}" class="bg-white shadow rounded p-3 hover:bg-gray-50 text-left">
            <div class="font-semibold">${escapeHtml(k)}</div>
          </button>
        `;
      });
    }


    function initInputNilaiSidebar() {
      selMapel = sidebarSelectedMapel;

      document.getElementById('guru-step-kelas').classList.add('hidden');
      document.getElementById('guru-step-mapel').classList.add('hidden');
      document.getElementById('guru-step-table').classList.remove('hidden');

      // toggle header UI untuk mode sidebar
      const btnBack = document.getElementById('btn-back-table');
      const btnGanti = document.getElementById('btn-ganti-mapel');
      const normalInfo = document.getElementById('normal-kelas-mapel-info');
      const sidebarInfo = document.getElementById('sidebar-kelas-mapel-info');
      if (btnBack) btnBack.classList.add('hidden');
      if (btnGanti) btnGanti.classList.remove('hidden');
      if (normalInfo) normalInfo.classList.add('hidden');
      if (sidebarInfo) sidebarInfo.classList.remove('hidden');

      const lblMapelSide = document.getElementById('lbl-mapel-sidebar');
      if (lblMapelSide) lblMapelSide.innerText = (selMapel === '__MUSYRIF__' ? 'Musyrif' : selMapel);

      const dd = document.getElementById('sidebar-kelas-dropdown');
      const ddWrap = document.getElementById('sidebar-kelas-select-wrap');
      const fixedWrap = document.getElementById('sidebar-kelas-fixed');
      const fixedLbl = document.getElementById('lbl-kelas-sidebar-fixed');
      if (!dd) return;

      // MUSYRIF: kelas tunggal (tanpa dropdown)
      if (selMapel === '__MUSYRIF__') {
        const kList = parseMusyrifClasses((currentUser?.musyrif || '').trim());
        const onlyK = (selKelas && String(selKelas).trim()) || ((kList && kList.length) ? String(kList[0]) : '');
        selKelas = onlyK;

        // UI: sembunyikan dropdown, tampilkan kelas fixed
        if (ddWrap) ddWrap.classList.add('hidden');
        if (fixedWrap) fixedWrap.classList.remove('hidden');
        if (fixedLbl) fixedLbl.textContent = selKelas || '-';

        // update label normal (buat konsistensi fungsi lain)
        const lblK = document.getElementById('lbl-kelas2');
        const lblM = document.getElementById('lbl-mapel');
        if (lblK) lblK.innerText = selKelas;
        if (lblM) lblM.innerText = 'Musyrif';

        renderTable();
        return;
      } else {
        // UI: tampilkan dropdown normal
        if (ddWrap) ddWrap.classList.remove('hidden');
        if (fixedWrap) fixedWrap.classList.add('hidden');
      }

      const kelasAjar = safeArray(currentUser.classes);
      if (!kelasAjar.length) {
        dd.innerHTML = '<option value="">Kelas ajar belum diatur</option>';
        dd.disabled = true;
        const tbody = document.getElementById('input-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="p-4 text-center text-gray-500 italic">Kelas ajar belum diatur.</td></tr>`;
        return;
      }

      dd.disabled = false;
      dd.innerHTML = '<option value="">Pilih kelas</option>' + kelasAjar
        .map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`)
        .join('');

      bindSidebarKelasDropdownOnce();

      // restore last kelas per mapel, kalau ada
      const saved = sidebarLastKelasByMapel[selMapel];
      const initial = (saved && kelasAjar.includes(saved)) ? saved : kelasAjar[0];
      dd.value = initial;
      selKelas = initial;
      sidebarLastKelasByMapel[selMapel] = initial;

      // update label normal (buat konsistensi fungsi lain)
      const lblK = document.getElementById('lbl-kelas2');
      const lblM = document.getElementById('lbl-mapel');
      if (lblK) lblK.innerText = selKelas;
      if (lblM) lblM.innerText = selMapel;

      renderTable();
    }

    function bindSidebarKelasDropdownOnce() {
      if (sidebarKelasDropdownBound) return;
      const dd = document.getElementById('sidebar-kelas-dropdown');
      const ddWrap = document.getElementById('sidebar-kelas-select-wrap');
      const fixedWrap = document.getElementById('sidebar-kelas-fixed');
      const fixedLbl = document.getElementById('lbl-kelas-sidebar-fixed');
      if (!dd) return;

      // MUSYRIF: kelas tunggal (tanpa dropdown)
      if (selMapel === '__MUSYRIF__') {
        const kList = parseMusyrifClasses((currentUser?.musyrif || '').trim());
        const onlyK = (selKelas && String(selKelas).trim()) || ((kList && kList.length) ? String(kList[0]) : '');
        selKelas = onlyK;

        // UI: sembunyikan dropdown, tampilkan kelas fixed
        if (ddWrap) ddWrap.classList.add('hidden');
        if (fixedWrap) fixedWrap.classList.remove('hidden');
        if (fixedLbl) fixedLbl.textContent = selKelas || '-';

        // update label normal (buat konsistensi fungsi lain)
        const lblK = document.getElementById('lbl-kelas2');
        const lblM = document.getElementById('lbl-mapel');
        if (lblK) lblK.innerText = selKelas;
        if (lblM) lblM.innerText = 'Musyrif';

        renderTable();
        return;
      } else {
        // UI: tampilkan dropdown normal
        if (ddWrap) ddWrap.classList.remove('hidden');
        if (fixedWrap) fixedWrap.classList.add('hidden');
      }

      dd.addEventListener('change', () => {
        if (!sidebarSelectedMapel) return;
        const v = dd.value;
        if (!v) return;

        selMapel = sidebarSelectedMapel;
        selKelas = v;
        sidebarLastKelasByMapel[selMapel] = v;

        const lblK = document.getElementById('lbl-kelas2');
        const lblM = document.getElementById('lbl-mapel');
        if (lblK) lblK.innerText = selKelas;
        if (lblM) lblM.innerText = selMapel;

        renderTable();
      });

      sidebarKelasDropdownBound = true;
    }

    function showMapel(kelas) {
      selKelas = kelas;
      document.getElementById('lbl-kelas').innerText = kelas;
      document.getElementById('guru-step-kelas').classList.add('hidden');
      document.getElementById('guru-step-mapel').classList.remove('hidden');

      const mapelList = document.getElementById('mapel-list');
      mapelList.innerHTML = '';

      const mapelGuru = safeArray(currentUser.mapel);
      if (!mapelGuru.length) {
        mapelList.innerHTML = `<div class="text-gray-500 italic">Mapel belum diatur.</div>`;
        return;
      }

      mapelGuru.forEach(m => {
        mapelList.innerHTML += `
          <button onclick="showInputTable('${String(m).replaceAll("'", "\\'")}')" class="bg-white shadow rounded p-3 hover:bg-gray-50 text-left">
            <div class="font-semibold">📘 ${escapeHtml(m)}</div>
          </button>
        `;
      });
    }

    function backToKelas() {
      document.getElementById('guru-step-mapel').classList.add('hidden');
      document.getElementById('guru-step-kelas').classList.remove('hidden');
    }

    function showInputTable(mapel) {
      selMapel = mapel;
      document.getElementById('lbl-kelas2').innerText = selKelas;
      document.getElementById('lbl-mapel').innerText = selMapel;

      document.getElementById('guru-step-mapel').classList.add('hidden');
      document.getElementById('guru-step-table').classList.remove('hidden');

      renderTable();
    }

    function resetInputView() {
      document.getElementById('guru-step-table').classList.add('hidden');
      document.getElementById('guru-step-mapel').classList.remove('hidden');
    }

    
    function renderTable() {
      const tbody = document.getElementById('input-tbody');
      tbody.innerHTML = '';

      // switch header depending on mode (mapel vs musyrif)
      const thead = document.getElementById('input-thead');
      if (thead) {
        if (selMapel === '__MUSYRIF__') {
          thead.innerHTML = `
              <tr>
                <th class="p-2">No</th>
                <th class="p-2">NIS</th>
                <th class="p-2 col-name">Nama Lengkap</th>
                <th class="p-2 text-center">L/P</th>
                <th class="p-2">Hafalan Wajib</th>
                <th class="p-2">Hafalan Murojaah</th>
                <th class="p-2">Ziyadah</th>
                <th class="p-2">Fashohah</th>
                <th class="p-2">Status</th>
              </tr>`;
        } else {
          thead.innerHTML = `
              <tr>
                <th class="p-2">No</th>
                <th class="p-2">NIS</th>
                <th class="p-2 col-name">Nama Lengkap</th>
                <th class="p-2 text-center">L/P</th>
                <th class="p-2">Hadir</th>
                <th class="p-2">Tugas</th>
                <th class="p-2">UH1</th>
                <th class="p-2">UH2</th>
                <th class="p-2">UH3</th>
                <th class="p-2">UH4</th>
                <th class="p-2">UH5</th>
                <th class="p-2">PAS</th>
                <th class="p-2">Status</th>
              </tr>`;
        }
      }

      if (selMapel === '__MUSYRIF__') {
        renderMusyrifTable();
        return;
      }

      const listSiswa = students.filter(s => s.kelas === selKelas);
      if (!listSiswa.length) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-4 text-center text-gray-500 italic">Belum ada data siswa untuk kelas ini.</td></tr>`;
        return;
      }

      const maxRow = listSiswa.length - 1;

      listSiswa.forEach((s, rowIdx) => {
        const existing = scores.find(sc => sc.student_name === s.name && sc.mapel === selMapel);
        const h = existing ? (existing.kehadiran ?? 0) : 0;
        const t = existing ? (existing.tugas ?? 0) : 0;

        const parts = existing ? [existing.uh1, existing.uh2, existing.uh3, existing.uh4, existing.uh5] : [];
        const hasAnyPart = parts.some(v => v !== null && v !== undefined && String(v).trim() !== '');
        const legacyUh = existing ? existing.uh : null;

        const u1 = existing ? ((existing.uh1 !== null && existing.uh1 !== undefined && String(existing.uh1).trim() !== '')
          ? existing.uh1
          : ((!hasAnyPart && legacyUh !== null && legacyUh !== undefined && String(legacyUh).trim() !== '') ? legacyUh : '')) : '';
        const u2 = existing ? ((existing.uh2 !== null && existing.uh2 !== undefined && String(existing.uh2).trim() !== '') ? existing.uh2 : '') : '';
        const u3 = existing ? ((existing.uh3 !== null && existing.uh3 !== undefined && String(existing.uh3).trim() !== '') ? existing.uh3 : '') : '';
        const u4 = existing ? ((existing.uh4 !== null && existing.uh4 !== undefined && String(existing.uh4).trim() !== '') ? existing.uh4 : '') : '';
        const u5 = existing ? ((existing.uh5 !== null && existing.uh5 !== undefined && String(existing.uh5).trim() !== '') ? existing.uh5 : '') : '';
        const p = existing ? (existing.pas ?? 0) : 0;

        const initialState = existing ? 'saved' : 'empty';
        const initialLabel = existing ? 'Tersimpan' : 'Belum';

        tbody.innerHTML += `
          <tr class="border-b student-row" data-name="${escapeHtml(s.name)}" data-nis="${escapeHtml(s.nis || '')}" data-dirty="0" data-status="${initialState}">
            <td class="p-2">${rowIdx+1}</td>
            <td class="p-2">${escapeHtml(s.nis || '-')}</td>
            <td class="p-2 col-name">${escapeHtml(s.name)}</td>
            <td class="p-2 text-center">${escapeHtml(getStudentGender(s))}</td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-h"
                data-row="${rowIdx}" data-col="0" data-max-row="${maxRow}"
                value="${h}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-t"
                data-row="${rowIdx}" data-col="1" data-max-row="${maxRow}"
                value="${t}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-u1"
                data-row="${rowIdx}" data-col="2" data-max-row="${maxRow}"
                value="${u1}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-u2"
                data-row="${rowIdx}" data-col="3" data-max-row="${maxRow}"
                value="${u2}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-u3"
                data-row="${rowIdx}" data-col="4" data-max-row="${maxRow}"
                value="${u3}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-u4"
                data-row="${rowIdx}" data-col="5" data-max-row="${maxRow}"
                value="${u4}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-u5"
                data-row="${rowIdx}" data-col="6" data-max-row="${maxRow}"
                value="${u5}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input i-p"
                data-row="${rowIdx}" data-col="7" data-max-row="${maxRow}"
                value="${p}">
            </td>

            <td class="p-2">
              <span class="row-status inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border"
                data-state="${initialState}">
                <span class="row-dot h-2 w-2 rounded-full"></span>
                <span class="row-status-text">${initialLabel}</span>
              </span>
            </td></tr>
        `;
      });

      // set status styling sesuai state awal
      document.querySelectorAll('.student-row').forEach(r => setRowStatus(r, r.dataset.status || 'empty'));

      // setelah render: pasang behavior keyboard nav + tombol per baris
      bindInputBehaviors();bindAutoSaveUIOnce();
    }



    function getMusyrifExisting(studentId, kelas) {
      const sid = Number(studentId);
      const kk = String(kelas || '');
      return (Array.isArray(window.musyrifScores) ? window.musyrifScores : (Array.isArray(musyrifScores) ? musyrifScores : []))
        .find(r => Number(r.student_id) === sid && String(r.kelas || '') === kk) || null;
    }

    function renderMusyrifTable() {
      const tbody = document.getElementById('input-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      const listSiswa = students.filter(s => s.kelas === selKelas);
      if (!listSiswa.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-500 italic">Belum ada data siswa untuk kelas ini.</td></tr>`;
        return;
      }

      const maxRow = listSiswa.length - 1;

      listSiswa.forEach((s, rowIdx) => {
        const existing = getMusyrifExisting(s.id, selKelas);
        const hw = existing ? (existing.hafalan_wajib ?? 0) : 0;
        const hm = existing ? (existing.hafalan_murojaah ?? 0) : 0;
        const zy = existing ? (existing.ziyadah ?? 0) : 0;
        const fs = existing ? (existing.fashohah ?? 0) : 0;

        const initialState = existing ? 'saved' : 'empty';
        const initialLabel = existing ? 'Tersimpan' : 'Belum';

        tbody.innerHTML += `
          <tr class="border-b musyrif-row student-row" data-student-id="${s.id}" data-name="${escapeHtml(s.name)}" data-nis="${escapeHtml(s.nis || '')}" data-dirty="0" data-status="${initialState}">
            <td class="p-2">${rowIdx+1}</td>
            <td class="p-2">${escapeHtml(s.nis || '-')}</td>
            <td class="p-2 col-name">${escapeHtml(s.name)}</td>
            <td class="p-2 text-center">${escapeHtml(getStudentGender(s))}</td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input m-hw"
                data-row="${rowIdx}" data-col="0" data-max-col="3" data-max-row="${maxRow}"
                value="${hw}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input m-hm"
                data-row="${rowIdx}" data-col="1" data-max-col="3" data-max-row="${maxRow}"
                value="${hm}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input m-zy"
                data-row="${rowIdx}" data-col="2" data-max-col="3" data-max-row="${maxRow}"
                value="${zy}">
            </td>

            <td class="p-1">
              <input type="number" min="0" max="100" step="1" inputmode="numeric"
                class="w-full border p-1 rounded score-input m-fs"
                data-row="${rowIdx}" data-col="3" data-max-col="3" data-max-row="${maxRow}"
                value="${fs}">
            </td>

            <td class="p-2">
              <span class="row-status inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border"
                data-state="${initialState}">
                <span class="row-dot h-2 w-2 rounded-full"></span>
                <span class="row-status-text">${initialLabel}</span>
              </span>
            </td></tr>
        `;
      });

      document.querySelectorAll('.student-row').forEach(r => setRowStatus(r, r.dataset.status || 'empty'));
      bindInputBehaviors();bindAutoSaveUIOnce();
    }

    async function saveMusyrifScores() {
      const allRows = [...document.querySelectorAll('.musyrif-row')];
      if (!allRows.length) {
        showToast('Tidak ada baris musyrif untuk disimpan.', 'warn');
        return;
      }

      const dirtyRows = allRows.filter(r => r.dataset.dirty === '1');
      const targetRows = dirtyRows.length ? dirtyRows : allRows;

      setLoading(true, 'Menyimpan nilai musyrif…', `Menyimpan ${targetRows.length} baris.`);
      try {
        for (const r of targetRows) {
          const sid = Number(r.getAttribute('data-student-id'));
          const hw = clampScore(r.querySelector('.m-hw')?.value || 0);
          const hm = clampScore(r.querySelector('.m-hm')?.value || 0);
          const zy = clampScore(r.querySelector('.m-zy')?.value || 0);
          const fs = clampScore(r.querySelector('.m-fs')?.value || 0);

          const st = students.find(x => Number(x.id) === sid);
          const payload = {
            student_id: sid,
            nis: st?.nis || null,
            student_name: st?.name || (r.getAttribute('data-name') || ''),
            kelas: selKelas,
            hafalan_wajib: hw,
            hafalan_murojaah: hm,
            ziyadah: zy,
            fashohah: fs
          };
          await saveMusyrifScoreToDB(payload);
          markRowDirty(r, false);
          setRowStatus(r, 'saved');
        }
        showToast(dirtyRows.length ? 'Perubahan musyrif tersimpan.' : 'Nilai musyrif tersimpan.', 'success');
        await loadInitialData();
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan nilai musyrif. Cek koneksi / hak akses / data bentrok.', 'error', 4500);
      } finally {
        setLoading(false);
      }
    }

    async function saveScores() {
      if (selMapel === '__MUSYRIF__') {
        await saveMusyrifScores();
        return;
      }

      const allRows = [...document.querySelectorAll('.student-row')];
      if (!allRows.length) {
        showToast('Tidak ada baris nilai untuk disimpan.', 'warn');
        return;
      }

      const dirtyRows = allRows.filter(r => r.dataset.dirty === '1');
      const targetRows = dirtyRows.length ? dirtyRows : allRows;

      setLoading(true, 'Menyimpan nilai…', `Menyimpan ${targetRows.length} baris.`);
      try {
        for (const r of targetRows) {
          await saveRow(r, { silent: true });
        }
        showToast(dirtyRows.length ? 'Perubahan tersimpan.' : 'Nilai tersimpan.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan nilai. Cek koneksi / hak akses / data bentrok.', 'error', 4500);
      } finally {
        setLoading(false);
      }
    }



    // ===== Helper: Excel template robust headers & auto width =====
    function __normHeaderKey(k) {
      return normalizeText(String(k || '')).replace(/[^a-z0-9]/g, '');
    }

    function getCellCI(row, keys) {
      if (!row) return undefined;
      const map = {};
      Object.keys(row).forEach(k => { map[__normHeaderKey(k)] = row[k]; });
      for (const k of (keys || [])) {
        const nk = __normHeaderKey(k);
        if (Object.prototype.hasOwnProperty.call(map, nk)) return map[nk];
      }
      return undefined;
    }

    function autoFitSheet(ws, data) {
      try {
        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const widths = headers.map(h => String(h).length);
        rows.forEach(r => {
          headers.forEach((h, i) => {
            const v = r[h];
            const len = String(v ?? '').length;
            if (len > widths[i]) widths[i] = len;
          });
        });
        ws['!cols'] = widths.map(w => ({ wch: Math.max(8, Math.min(42, w + 2)) }));
      } catch (e) {
        console.warn('autoFitSheet error', e);
      }
    }
    function downloadTemplate() {
      if (selMapel === '__MUSYRIF__') {
        const data = students.filter(s => s.kelas === selKelas)
          .map(s => ({ "NIS": s.nis || '', "Nama": s.name, "Hafalan Wajib": 0, "Hafalan Murojaah": 0, "Ziyadah": 0, "Fashohah": 0 }));
        const ws = XLSX.utils.json_to_sheet(data);
        autoFitSheet(ws, data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, `template_musyrif_${selKelas}.xlsx`);
        return;
      }

      const data = students.filter(s => s.kelas === selKelas)
        .map(s => ({ "NIS": s.nis || '', "Nama": s.name, "Hadir": 0, "Tugas": 0, "UH1": 0, "UH2": 0, "UH3": 0, "UH4": 0, "UH5": 0, "PAS": 0 }));
      const ws = XLSX.utils.json_to_sheet(data);
      autoFitSheet(ws, data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `template_${selKelas}_${selMapel}.xlsx`);
    }

    function handleFileUpload(inp) {
      const f = inp.files?.[0];
      if (!f) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);        const rows = [...document.querySelectorAll('.student-row')];

        // kunci utama: NIS (lebih stabil). fallback: Nama.
        const tableKeys = rows
          .map(r => (r.getAttribute('data-nis') || '').trim() || (r.getAttribute('data-name') || '').trim())
          .filter(Boolean);

        const excelKeys = json
          .map(r => String(getCellCI(r, ['NIS','nis']) ?? '').trim() || String(getCellCI(r, ['Nama','Nama Lengkap','name']) ?? '').trim())
          .filter(Boolean);

        const missingInTable = excelKeys.filter(k => !tableKeys.includes(k));
        const missingInExcel = tableKeys.filter(k => !excelKeys.includes(k));

        const applyFn = () => {
          let applied = 0;

          if (selMapel === '__MUSYRIF__') {
            rows.forEach(r => {
              const nis = (r.getAttribute('data-nis') || '').trim();
              const nama = (r.getAttribute('data-name') || '').trim();
              const found = (nis ? json.find(x => String(getCellCI(x, ['NIS','nis']) ?? '').trim() === nis) : null)
                         || json.find(x => String(getCellCI(x, ['Nama','Nama Lengkap','name']) ?? '').trim() === nama);
              if (!found) return;

              const hw = clampScore(getCellCI(found, ['Hafalan Wajib','hafalanwajib']) ?? 0);
              const hm = clampScore(getCellCI(found, ['Hafalan Murojaah','hafalanmurojaah']) ?? 0);
              const zy = clampScore(getCellCI(found, ['Ziyadah','ziyadah']) ?? 0);
              const fs = clampScore(getCellCI(found, ['Fashohah','fashohah']) ?? 0);

              r.querySelector('.m-hw').value = hw;
              r.querySelector('.m-hm').value = hm;
              r.querySelector('.m-zy').value = zy;
              r.querySelector('.m-fs').value = fs;

              markRowDirty(r, true);
              applied++;
            });

            showToast(`Excel diterapkan ke tabel (${applied} siswa cocok).`, 'success', 3000);
            showToast('Jangan lupa klik “Simpan Nilai”.', 'info', 2400);
            return;
          }

          rows.forEach(r => {
            const nis = (r.getAttribute('data-nis') || '').trim();
            const nama = (r.getAttribute('data-name') || '').trim();
            const found = (nis ? json.find(x => String(getCellCI(x, ['NIS','nis']) ?? '').trim() === nis) : null)
                       || json.find(x => String(getCellCI(x, ['Nama','Nama Lengkap','name']) ?? '').trim() === nama);
            if (!found) return;

            const h = clampScore(getCellCI(found, ['Hadir','Kehadiran','kehadiran']) ?? 0);
            const t = clampScore(getCellCI(found, ['Tugas','tugas']) ?? 0);
            const u1 = clampScore(getCellCI(found, ['UH1','UH 1','Ulangan Harian 1','uh1']) ?? getCellCI(found, ['UH','uh']) ?? 0);
            const u2 = clampScore(getCellCI(found, ['UH2','UH 2','uh2']) ?? 0);
            const u3 = clampScore(getCellCI(found, ['UH3','UH 3','uh3']) ?? 0);
            const u4 = clampScore(getCellCI(found, ['UH4','UH 4','uh4']) ?? 0);
            const u5 = clampScore(getCellCI(found, ['UH5','UH 5','uh5']) ?? 0);
            const p = clampScore(getCellCI(found, ['PAS','pas']) ?? 0);

            r.querySelector('.i-h').value = h;
            r.querySelector('.i-t').value = t;
            r.querySelector('.i-u1').value = u1;
            r.querySelector('.i-u2').value = u2;
            r.querySelector('.i-u3').value = u3;
            r.querySelector('.i-u4').value = u4;
            r.querySelector('.i-u5').value = u5;
            r.querySelector('.i-p').value = p;

            markRowDirty(r, true);
            applied++;
          });

          showToast(`Excel diterapkan ke tabel (${applied} siswa cocok).`, 'success', 3000);
          showToast('Jangan lupa klik “Simpan Nilai”.', 'info', 2400);
        };

        openExcelPreview({
          excelCount: json.length,
          missingInTable,
          missingInExcel,
          sampleMissingInTable: missingInTable.slice(0, 12),
          sampleMissingInExcel: missingInExcel.slice(0, 12),
          applyFn
        });
      };

      reader.readAsArrayBuffer(f);
    }


    // ===== Wali Kelas: Template & Upload Excel (Data Siswa / Absen / Catatan / Prestasi) =====
    function downloadWaliTemplate(type) {
      const kelas = getWaliKelasCurrent();
      const list = students.filter(s => s.kelas === kelas);
      let data = [];

      if (type === 'data-siswa') {
        // Template identitas dasar (kolom lain bisa ditambahkan nanti)
        data = list.map(s => ({
          "ID": s.id ?? '',
          "NIS": s.nis ?? '',
          "NISN": s.nisn ?? '',
          "Nama Lengkap": s.name ?? '',
          "L/P": getStudentGender(s) ?? '',
          "TTL": (s.ttl ?? '') || '',
          "Kelas": s.kelas ?? kelas ?? '',
          "Agama": s.agama ?? '',
          "Status Keluarga": s.status_keluarga ?? '',
          "Anak Ke": s.anak_ke ?? '',
          "Telpon Siswa": s.telp_siswa ?? '',
          "Alamat Siswa": s.alamat_siswa ?? '',
          "Sekolah Nama Asal": s.sekolah_asal ?? '',
          "Tanggal Diterima": s.tanggal_diterima ?? '',
          "Terima di kelas": s.diterima_kelas ?? '',
          "Nama Ayah": s.nama_ayah ?? '',
          "Nama Ibu": s.nama_ibu ?? '',
          "Pekerjaan Ayah": s.pekerjaan_ayah ?? '',
          "Pekerjaan Ibu": s.pekerjaan_ibu ?? '',
          "Alamat Orang Tua": s.alamat_ortu ?? '',
          "Nama Wali": s.nama_wali ?? '',
          "Pekerjaan Wali": s.pekerjaan_wali ?? '',
          "Alamat Wali": s.alamat_wali ?? '',
        }));
      } else if (type === 'absen') {
        data = list.map(s => ({
          "NIS": s.nis || '',
          "Nama": s.name || '',
          "Sakit": Number((getWaliRow(s.id, kelas)?.hadir_s ?? s.hadir_s) ?? 0) || 0,
          "Ijin": Number((getWaliRow(s.id, kelas)?.hadir_i ?? s.hadir_i) ?? 0) || 0,
          "Alpa": Number((getWaliRow(s.id, kelas)?.hadir_a ?? s.hadir_a) ?? 0) || 0,
        }));
      } else if (type === 'catatan') {
        data = list.map(s => ({
          "NIS": s.nis || '',
          "Nama": s.name || '',
          "Catatan": ((getWaliRow(s.id, kelas)?.catatan) ?? s.catatan ?? '-') || '-',
        }));
      } else if (type === 'prestasi') {
        data = list.map(s => {
          const w = getWaliRow(s.id, kelas);
          return {
            "NIS": s.nis || '',
            "Nama": s.name || '',
            "Prestasi 1": (w?.prestasi ?? s.prestasi ?? '-') || '-',
            "Prestasi 2": (w?.prestasi2 ?? '-') || '-',
            "Prestasi 3": (w?.prestasi3 ?? '-') || '-',
          };
        });
      } else if (type === 'sikap') {
        data = list.map(s => {
          const w = getWaliRow(s.id, kelas);
          return {
            "NIS": s.nis || '',
            "Nama": s.name || '',
            "Akhlak": Number(w?.akhlak ?? 0) || 0,
            "Kerajinan": Number(w?.kerajinan ?? 0) || 0,
            "Kebersihan": Number(w?.kebersihan ?? 0) || 0,
            "Kedisiplinan": Number(w?.kedisiplinan ?? 0) || 0,
          };
        });
      } else {
        showToast('Tipe template tidak dikenal.', 'warn');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      autoFitSheet(ws, data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      const safeKelas = String(kelas || 'kelas').replace(/\s+/g, '_');
      XLSX.writeFile(wb, `template_${type}_${safeKelas}.xlsx`);
    }

    function clampNonNegInt(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.trunc(n));
    }

    // Draft perubahan untuk Data Siswa (hasil upload excel sebelum disimpan)
    let __waliDraftDataSiswa = {};

    function pickFirst(obj, keys) {
      for (const k of keys) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
      }
      return undefined;
    }

    function asText(v) {
      const s = String(v ?? '').trim();
      return s;
    }

    function asDateText(v) {
      // Terima format date/number/string, kembalikan string yg aman disimpan
      if (v == null) return '';
      if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);
      const s = String(v).trim();
      return s;
    }

    function handleWaliFileUpload(inp, type) {
      const f = inp.files?.[0];
      if (!f) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);

        // rows currently rendered in table (untuk data-siswa: gunakan data students langsung)
        const tbodyId = type === 'absen' ? 'wali-absen-tbody'
                       : (type === 'catatan' ? 'wali-catatan-tbody'
                       : (type === 'prestasi' ? 'wali-prestasi-tbody'
                       : (type === 'sikap' ? 'wali-sikap-tbody'
                       : 'wali-data-tbody')));
        const tb = document.getElementById(tbodyId);
        const rows = tb ? [...tb.querySelectorAll('tr[data-id]')] : [];

        const kelas = getWaliKelasCurrent();
        const dataList = students.filter(s => s.kelas === kelas);
        const tableKeys = (type === 'data-siswa')
          ? dataList.map(s => String(s.nis ?? '').trim()).filter(Boolean)
          : rows.map(r => (r.getAttribute('data-nis') || '').trim()).filter(Boolean);

        const excelKeys = json.map(r => String(pickFirst(r, ["NISN","NIS","nisn","nis"]) ?? '').trim()).filter(Boolean);

        const missingInTable = excelKeys.filter(k => !tableKeys.includes(k));
        const missingInExcel = tableKeys.filter(k => !excelKeys.includes(k));

        const applyFn = () => {
          let applied = 0;

          if (type === 'data-siswa') {
            // Terapkan ke draft + cache students agar tabel langsung ikut berubah
            dataList.forEach(s => {
              const nis = String(s.nis ?? '').trim();
              const nisnBase = String(s.nisn ?? '').trim();

              // Prioritas pencocokan: NIS (utama) -> NISN (opsional) -> Nama
              const found = json.find(x => String(pickFirst(x,["NIS","nis"]) ?? '').trim() === nis)
                         || (nisnBase ? json.find(x => String(pickFirst(x,["NISN","nisn"]) ?? '').trim() === nisnBase) : null)
                         || json.find(x => asText(pickFirst(x,["Nama Lengkap","Nama","name"])) === asText(s.name));
              if (!found) return;

              const id = Number(s.id);
              const nama = asText(pickFirst(found,["Nama Lengkap","Nama","name"])) || s.name;
              const lp   = asText(pickFirst(found,["L/P","LP","JK","Jenis Kelamin","gender"])) || (getStudentGender(s) !== '-' ? getStudentGender(s) : '');
              const tempat = asText(pickFirst(found,["Tempat Lahir","Tempat","tempat_lahir"])) || '';
              const tgl    = asDateText(pickFirst(found,["Tanggal Lahir","Tgl Lahir","Tanggal","tanggal_lahir"])) || '';
              const ttlXls = asText(pickFirst(found,["TTL","Tempat Tanggal Lahir","tempat_tanggal_lahir"]))
                          || (tempat && tgl ? `${tempat}, ${tgl}` : '');

              const nisXls  = asText(pickFirst(found,["NIS","nis"])) || nis;
              const nisnXls = asText(pickFirst(found,["NISN","nisn"])) || nisnBase;

              const patch = {
                id,
                // kolom utama
                name: nama,
                nis: nisXls,
              };
              if (nisnXls) patch.nisn = nisnXls;

              // kolom identitas tambahan (aktif setelah migration dijalankan)

              if (lp) patch.lp = lp;
              if (ttlXls) patch.ttl = ttlXls;

              // kolom tambahan (opsional)
              const agama = asText(pickFirst(found,["Agama","agama"]));
              if (agama) patch.agama = agama;
              const statusK = asText(pickFirst(found,["Status Keluarga","status_keluarga"]));
              if (statusK) patch.status_keluarga = statusK;
              const anakKe = pickFirst(found,["Anak Ke","anak_ke"]);
              if (anakKe !== undefined && anakKe !== '') patch.anak_ke = Number(anakKe);
              const telp = asText(pickFirst(found,["Telpon Siswa","Telepon Siswa","telp_siswa"]));
              if (telp) patch.telp_siswa = telp;
              const alamatS = asText(pickFirst(found,["Alamat Siswa","alamat_siswa"]));
              if (alamatS) patch.alamat_siswa = alamatS;

              const sekolahAsal = asText(pickFirst(found,["Sekolah Nama Asal","Sekolah Asal","sekolah_asal"]));
              if (sekolahAsal) patch.sekolah_asal = sekolahAsal;
              const tglTerima = asDateText(pickFirst(found,["Tanggal Diterima","tanggal_diterima"]));
              if (tglTerima) patch.tanggal_diterima = tglTerima;
              const terimaKelas = asText(pickFirst(found,["Terima di kelas","diterima_kelas"]));
              if (terimaKelas) patch.diterima_kelas = terimaKelas;

              const ayah = asText(pickFirst(found,["Nama Ayah","nama_ayah"]));
              if (ayah) patch.nama_ayah = ayah;
              const ibu = asText(pickFirst(found,["Nama Ibu","nama_ibu"]));
              if (ibu) patch.nama_ibu = ibu;
              const kerjaAyah = asText(pickFirst(found,["Pekerjaan Ayah","pekerjaan_ayah"]));
              if (kerjaAyah) patch.pekerjaan_ayah = kerjaAyah;
              const kerjaIbu = asText(pickFirst(found,["Pekerjaan Ibu","pekerjaan_ibu"]));
              if (kerjaIbu) patch.pekerjaan_ibu = kerjaIbu;
              const alamatOrtu = asText(pickFirst(found,["Alamat Orang Tua","alamat_ortu"]));
              if (alamatOrtu) patch.alamat_ortu = alamatOrtu;

              const namaWali = asText(pickFirst(found,["Nama Wali","nama_wali"]));
              if (namaWali) patch.nama_wali = namaWali;
              const kerjaWali = asText(pickFirst(found,["Pekerjaan Wali","pekerjaan_wali"]));
              if (kerjaWali) patch.pekerjaan_wali = kerjaWali;
              const alamatWali = asText(pickFirst(found,["Alamat Wali","alamat_wali"]));
              if (alamatWali) patch.alamat_wali = alamatWali;

              __waliDraftDataSiswa[id] = { ...( __waliDraftDataSiswa[id] || {} ), ...patch };

              // Mutasi cache students supaya tabel langsung menampilkan nilai terbaru
              const idx = students.findIndex(x => Number(x.id) === id);
              if (idx >= 0) students[idx] = { ...students[idx], ...patch };
              applied++;
            });

            renderWaliDataSiswa();
          } else {
            rows.forEach(r => {
              const nis = (r.getAttribute('data-nis') || '').trim();
              const nama = (r.getAttribute('data-name') || '').trim();
              const found = json.find(x => String(pickFirst(x,["NISN","NIS","nisn","nis"]) ?? '').trim() === nis)
                         || json.find(x => String(pickFirst(x,["Nama","Nama Lengkap","name"]) ?? '').trim() === nama);
              if (!found) return;

              if (type === 'absen') {
              const sakit = clampNonNegInt(found["Sakit"] ?? 0);
              const izin  = clampNonNegInt(found["Ijin"] ?? found["Izin"] ?? 0);
              const alpa  = clampNonNegInt(found["Alpa"] ?? 0);

              const iS = r.querySelector('.wali-sakit');
              const iI = r.querySelector('.wali-izin');
              const iA = r.querySelector('.wali-alpa');
              if (iS) iS.value = sakit;
              if (iI) iI.value = izin;
              if (iA) iA.value = alpa;
              applied++;
            }

              if (type === 'catatan') {
              const v = String(found["Catatan"] ?? '').trim();
              const val = v.length ? v : '-';
              const el = r.querySelector('.wali-catatan');
              if (el) el.value = val;
              applied++;
              }

              if (type === 'prestasi') {
              const p1 = String(getCellCI(found, ['Prestasi 1','Prestasi1','Prestasi']) ?? '').trim();
              const p2 = String(getCellCI(found, ['Prestasi 2','Prestasi2']) ?? '').trim();
              const p3 = String(getCellCI(found, ['Prestasi 3','Prestasi3']) ?? '').trim();

              const v1 = (p1.length ? p1 : '-');
              const v2 = (p2.length ? p2 : '-');
              const v3 = (p3.length ? p3 : '-');

              const e1 = r.querySelector('.wali-prestasi1');
              const e2 = r.querySelector('.wali-prestasi2');
              const e3 = r.querySelector('.wali-prestasi3');
              if (e1) e1.value = v1;
              if (e2) e2.value = v2;
              if (e3) e3.value = v3;
              applied++;
              }

              if (type === 'sikap') {
              const akhlak = clampScore(found["Akhlak"] ?? 0);
              const kerajinan = clampScore(found["Kerajinan"] ?? 0);
              const kebersihan = clampScore(found["Kebersihan"] ?? 0);
              const kedisiplinan = clampScore(found["Kedisiplinan"] ?? 0);

              const iA = r.querySelector('.wali-akhlak');
              const iK = r.querySelector('.wali-kerajinan');
              const iB = r.querySelector('.wali-kebersihan');
              const iD = r.querySelector('.wali-kedisiplinan');
              if (iA) iA.value = akhlak;
              if (iK) iK.value = kerajinan;
              if (iB) iB.value = kebersihan;
              if (iD) iD.value = kedisiplinan;
              applied++;
              }
            });
          }

          showToast(`Excel diterapkan ke tabel (${applied} baris cocok).`, 'success', 3000);
          showToast('Jangan lupa klik “Simpan”.', 'info', 2400);
        };

        openExcelPreview({
          excelCount: json.length,
          missingInTable,
          missingInExcel,
          sampleMissingInTable: missingInTable.slice(0, 12),
          sampleMissingInExcel: missingInExcel.slice(0, 12),
          applyFn
        });
      };

      reader.readAsArrayBuffer(f);
    }

    // Bind tombol Paket 2 (Paket 2.5)
    bindAutoSaveUIOnce();

    function showWaliSantriList() {
      document.getElementById('wali-menu').classList.remove('hidden');
      document.getElementById('wali-detail').classList.add('hidden');

      const kelas = getWaliKelas(currentUser);
      document.getElementById('wali-kelas-lbl').innerText = kelas || '-';

      const siswaKelas = students.filter(s => s.kelas === kelas);
      const expectedMapel = getExpectedMapelForClass(kelas);

      // Stats
      const statSiswa = document.getElementById('wali-stat-siswa');
      const statMapel = document.getElementById('wali-stat-mapel');
      const statComplete = document.getElementById('wali-stat-complete');
      const statCompleteCount = document.getElementById('wali-stat-complete-count');

      if (statSiswa) statSiswa.textContent = String(siswaKelas.length);
      if (statMapel) statMapel.textContent = String(expectedMapel.length);

      let completeCount = 0;
      siswaKelas.forEach(s => {
        const prog = computeStudentProgress(s, kelas, expectedMapel);
        if (prog.complete) completeCount += 1;
      });

      const pct = siswaKelas.length ? Math.round((completeCount / siswaKelas.length) * 100) : 0;
      if (statComplete) statComplete.textContent = `${pct}%`;
      if (statCompleteCount) statCompleteCount.textContent = String(completeCount);

      // Bind controls once
      if (!waliControlsBound) {
        waliControlsBound = true;
        const search = document.getElementById('wali-search');
        const filter = document.getElementById('wali-filter');

        const rerender = () => renderWaliStudentCards(kelas, siswaKelas, expectedMapel);

        if (search) {
          let t = null;
          search.addEventListener('input', () => {
            if (t) clearTimeout(t);
            t = setTimeout(rerender, 160);
          });
        }
        if (filter) filter.addEventListener('change', rerender);
      }

      renderWaliStudentCards(kelas, siswaKelas, expectedMapel);
    }

// ===== WALI KELAS =====
    let currentWaliTab = 'data-siswa';
    let waliSelectedStudentId = null; // legacy
    let waliRaporSelectedId = null;

    const WALI_TAB_LABELS = {
      'overview': 'Dashboard Ringkas',
      'data-siswa': 'Data Santri',
      'absen': 'Absen Santri',
      'prestasi': 'Prestasi Santri',
      'catatan': 'Catatan Wali Kelas',
      'sikap': 'Sikap Santri',
      'status-nilai': 'Statur Nilai',
      'rapor': 'Rapor & Legger'
    };

    let __waliTableBindOnce = false;

    function showWaliTab(tab) {
      currentWaliTab = tab;
      // Highlight sidebar
      document.querySelectorAll('.wali-nav').forEach(b => {
        const t = b.getAttribute('data-wali-tab');
        if (t === tab) b.classList.add('bg-blue-700');
        else b.classList.remove('bg-blue-700');
      });
      showSection('wali-dashboard');
    }

    function getWaliKelasCurrent() {
      return currentUser.kelas_wali || currentUser.kelas || '';
    }

    function getWaliRow(studentId, kelas) {
      const sid = Number(studentId);
      const kk = String(kelas || '');
      return (Array.isArray(window.waliScores) ? window.waliScores : (Array.isArray(waliScores) ? waliScores : []))
        .find(r => Number(r.student_id) === sid && String(r.kelas || '') === kk) || null;
    }


    function getStudentGender(st) {
      return st.lp || st.LP || st.jk || st.gender || st.sex || '-';
    }

    function getStudentTTL(st) {
      return st.ttl || st.TTL || st.tempat_tanggal_lahir || '-';
    }

    function filterStudents(list, q) {
      const qq = normalizeText(q || '');
      if (!qq) return list;
      return list.filter(s => {
        const name = normalizeText(s.name || '');
        const nis = normalizeText(s.nis || '');
        return name.includes(qq) || nis.includes(qq);
      });
    }

    function bindWaliTableEventsOnce() {
      if (__waliTableBindOnce) return;
      __waliTableBindOnce = true;

      // search inputs
      const map = [
        ['wali-search-data', () => renderWaliDataSiswa()],
        ['wali-search-absen', () => renderWaliAbsen()],
        ['wali-search-catatan', () => renderWaliCatatan()],
        ['wali-search-prestasi', () => renderWaliPrestasi()],
        ['wali-search-sikap', () => renderWaliSikap()],
        ['wali-search-rapor', () => refreshWaliRapor()],
      ];
      map.forEach(([id, fn]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', fn);
      });

      // save buttons
      const btnData = document.getElementById('btn-wali-save-data');
      if (btnData) btnData.addEventListener('click', saveWaliDataSiswaBatch);
      const btnAbsen = document.getElementById('btn-wali-save-absen');
      if (btnAbsen) btnAbsen.addEventListener('click', saveWaliAbsenBatch);
      const btnCat = document.getElementById('btn-wali-save-catatan');
      if (btnCat) btnCat.addEventListener('click', saveWaliCatatanBatch);
      const btnPre = document.getElementById('btn-wali-save-prestasi');
      if (btnPre) btnPre.addEventListener('click', saveWaliPrestasiBatch);
      const btnSikap = document.getElementById('btn-wali-save-sikap');
      if (btnSikap) btnSikap.addEventListener('click', saveWaliSikapBatch);
    }

    function renderWaliTab() {
      const kelas = getWaliKelasCurrent();
      document.getElementById('wali-kelas-lbl').innerText = kelas || '-';
      document.getElementById('wali-tab-label').innerText = WALI_TAB_LABELS[currentWaliTab] || 'Wali';

      // panels
      const pOverview = document.getElementById('wali-panel-overview');
      const pStatus = document.getElementById('wali-panel-status-nilai');
      const pRapor  = document.getElementById('wali-panel-rapor');
      const pData   = document.getElementById('wali-panel-data-siswa');
      const pAbsen  = document.getElementById('wali-panel-absen');
      const pCat    = document.getElementById('wali-panel-catatan');
      const pPre    = document.getElementById('wali-panel-prestasi');
      const pSikap = document.getElementById('wali-panel-sikap');

      ;[pOverview,pStatus,pRapor,pData,pAbsen,pCat,pPre,pSikap].forEach(p => p && p.classList.add('hidden'));

      // always refresh summary
      refreshWaliSummary();
      bindWaliTableEventsOnce();

      // subtitles
      const sub = kelas || '-';
      const setSub = (id) => { const el = document.getElementById(id); if (el) el.textContent = sub; };
      setSub('wali-subtitle-data');
      setSub('wali-subtitle-absen');
      setSub('wali-subtitle-catatan');
      setSub('wali-subtitle-prestasi');
      setSub('wali-subtitle-sikap');
      setSub('wali-subtitle-rapor');


      if (currentWaliTab === 'overview') {
        pOverview && pOverview.classList.remove('hidden');
        return;
      }

      if (currentWaliTab === 'sikap') {
        pSikap && pSikap.classList.remove('hidden');
        renderWaliSikap();
        return;
      }

      if (currentWaliTab === 'status-nilai') {
        pStatus && pStatus.classList.remove('hidden');
        refreshWaliStatusNilai();
        return;
      }

      if (currentWaliTab === 'rapor') {
        pRapor && pRapor.classList.remove('hidden');
        refreshWaliRapor();
        return;
      }

      if (currentWaliTab === 'data-siswa') {
        pData && pData.classList.remove('hidden');
        renderWaliDataSiswa();
        return;
      }

      if (currentWaliTab === 'absen') {
        pAbsen && pAbsen.classList.remove('hidden');
        renderWaliAbsen();
        return;
      }

      if (currentWaliTab === 'catatan') {
        pCat && pCat.classList.remove('hidden');
        renderWaliCatatan();
        return;
      }

      if (currentWaliTab === 'prestasi') {
        pPre && pPre.classList.remove('hidden');
        renderWaliPrestasi();
        return;
      }
    }

    function renderWaliDataSiswa() {
      const kelas = getWaliKelasCurrent();
      const q = (document.getElementById('wali-search-data')?.value || '').trim();
      const list = filterStudents(students.filter(s => s.kelas === kelas), q);
      const tb = document.getElementById('wali-data-tbody');
      if (!tb) return;
      if (!list.length) {
        tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 italic">Belum ada data siswa.</td></tr>`;
        return;
      }
      tb.innerHTML = list.map((s, i) => `
        <tr class="border-t" data-id="${s.id}" data-nis="${escapeHtml(s.nis || "")}" data-name="${escapeHtml(s.name || "")}">
          <td class="p-2">${i+1}</td>
          <td class="p-2">${escapeHtml(s.nis || '-')}</td>
          <td class="p-2 col-name">${escapeHtml(s.name || '-')}</td>
          <td class="p-2 text-center">${escapeHtml(getStudentGender(s))}</td>
          <td class="p-2">${escapeHtml(getStudentTTL(s))}</td>
        </tr>
      `).join('');
    }

    async function saveWaliDataSiswaBatch() {
      const keys = Object.keys(__waliDraftDataSiswa || {});
      if (!keys.length) {
        showToast('Belum ada perubahan dari Excel untuk disimpan.', 'info', 2500);
        return;
      }

      const rows = keys
        .map(k => __waliDraftDataSiswa[k])
        .filter(Boolean)
        .map(r => ({ ...r }));

      try {
        await updateStudentsBatch(rows);
        __waliDraftDataSiswa = {};
        showToast('Data siswa berhasil disimpan.', 'success', 3000);
        renderWaliDataSiswa();
      } catch (e) {
        console.error(e);
        showToast('Gagal menyimpan data siswa. Pastikan migration DB sudah dijalankan.', 'error', 4000);
      }
    }



    // Navigasi cepat (↑↓←→) untuk grid input wali kelas (absen & sikap)
    function bindTbodyArrowNav(tbodyId) {
      const tb = document.getElementById(tbodyId);
      if (!tb) return;
      const inputs = [...tb.querySelectorAll('input[data-row][data-col]')];
      if (!inputs.length) return;

      const focusInTbody = (row, col) => {
        const el = tb.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
        if (el) { el.focus(); el.select?.(); }
      };

      inputs.forEach(inp => {
        inp.addEventListener('keydown', (e) => {
          const row = parseInt(inp.dataset.row, 10);
          const col = parseInt(inp.dataset.col, 10);
          const maxRow = parseInt(inp.dataset.maxRow, 10);
          const maxCol = parseInt(inp.dataset.maxCol, 10);
          if (Number.isNaN(row) || Number.isNaN(col)) return;

          const move = (r, c) => {
            const nr = Math.max(0, Math.min(maxRow, r));
            const nc = Math.max(0, Math.min(maxCol, c));
            focusInTbody(nr, nc);
          };

          if (e.key === 'ArrowRight') { e.preventDefault(); move(row, col + 1); }
          if (e.key === 'ArrowLeft')  { e.preventDefault(); move(row, col - 1); }
          if (e.key === 'ArrowDown')  { e.preventDefault(); move(row + 1, col); }
          if (e.key === 'ArrowUp')    { e.preventDefault(); move(row - 1, col); }
        }, { passive: false });
      });
    }
    function renderWaliAbsen() {
      const kelas = getWaliKelasCurrent();
      const q = (document.getElementById('wali-search-absen')?.value || '').trim();
      const list = filterStudents(students.filter(s => s.kelas === kelas), q);
      const tb = document.getElementById('wali-absen-tbody');
      if (!tb) return;
      if (!list.length) {
        tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 italic">Belum ada data siswa.</td></tr>`;
        return;
      }
      tb.innerHTML = list.map((s, i) => {
        const w = getWaliRow(s.id, kelas);
        const sakit = Number((w?.hadir_s ?? s.hadir_s) ?? 0) || 0;
        const izin  = Number((w?.hadir_i ?? s.hadir_i) ?? 0) || 0;
        const alpa  = Number((w?.hadir_a ?? s.hadir_a) ?? 0) || 0;
        return `
        <tr class="border-t" data-id="${s.id}" data-nis="${escapeHtml(s.nis || "")}" data-name="${escapeHtml(s.name || "")}">
          <td class="p-2">${i+1}</td>
          <td class="p-2">${escapeHtml(s.nis || '-')}</td>
          <td class="p-2 col-name">${escapeHtml(s.name || '-')}</td>
          <td class="p-2 text-center">${escapeHtml(getStudentGender(s))}</td>
          <td class="p-2 text-center"><input class="wali-sakit w-24 border rounded px-2 py-1 text-center" type="number" min="0" value="${sakit}" data-row="${i}" data-col="0" data-max-row="${list.length-1}" data-max-col="2"></td>
          <td class="p-2 text-center"><input class="wali-izin w-24 border rounded px-2 py-1 text-center" type="number" min="0" value="${izin}" data-row="${i}" data-col="1" data-max-row="${list.length-1}" data-max-col="2"></td>
          <td class="p-2 text-center"><input class="wali-alpa w-24 border rounded px-2 py-1 text-center" type="number" min="0" value="${alpa}" data-row="${i}" data-col="2" data-max-row="${list.length-1}" data-max-col="2"></td>
        </tr>`;
      }).join('');
      bindTbodyArrowNav('wali-absen-tbody');
    }

    function renderWaliCatatan() {
      const kelas = getWaliKelasCurrent();
      const q = (document.getElementById('wali-search-catatan')?.value || '').trim();
      const list = filterStudents(students.filter(s => s.kelas === kelas), q);
      const tb = document.getElementById('wali-catatan-tbody');
      if (!tb) return;
      if (!list.length) {
        tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 italic">Belum ada data siswa.</td></tr>`;
        return;
      }
      tb.innerHTML = list.map((s, i) => {
        const w = getWaliRow(s.id, kelas);
        const cat = (w?.catatan ?? s.catatan ?? '-')
        return `
        <tr class="border-t" data-id="${s.id}" data-nis="${escapeHtml(s.nis || "")}" data-name="${escapeHtml(s.name || "")}">
          <td class="p-2 align-top">${i+1}</td>
          <td class="p-2 align-top">${escapeHtml(s.nis || '-')}</td>
          <td class="p-2 col-name align-top">${escapeHtml(s.name || '-')}</td>
          <td class="p-2 align-top text-center">${escapeHtml(getStudentGender(s))}</td>
          <td class="p-2"><input class="wali-catatan w-full border rounded px-2 py-1" type="text" value="${escapeHtml(cat)}"></td>
        </tr>`;
      }).join('');
    }

    function renderWaliPrestasi() {
      const kelas = getWaliKelasCurrent();
      const q = (document.getElementById('wali-search-prestasi')?.value || '').trim();
      const list = filterStudents(students.filter(s => s.kelas === kelas), q);
      const tb = document.getElementById('wali-prestasi-tbody');
      if (!tb) return;
      if (!list.length) {
        tb.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 italic">Belum ada data siswa.</td></tr>`;
        return;
      }
      tb.innerHTML = list.map((s, i) => {
        const w = getWaliRow(s.id, kelas);
        const pre1 = (w?.prestasi ?? s.prestasi ?? '-')
        const pre2 = (w?.prestasi2 ?? '-')
        const pre3 = (w?.prestasi3 ?? '-')
        return `
        <tr class="border-t" data-id="${s.id}" data-nis="${escapeHtml(s.nis || "")}" data-name="${escapeHtml(s.name || "")}">
          <td class="p-2 align-top">${i+1}</td>
          <td class="p-2 align-top">${escapeHtml(s.nis || '-')}</td>
          <td class="p-2 col-name align-top">${escapeHtml(s.name || '-')}</td>
          <td class="p-2 align-top text-center">${escapeHtml(getStudentGender(s))}</td>
          <td class="p-2 text-center"><input class="wali-prestasi1 w-32 border rounded px-2 py-1 text-center" type="text" value="${escapeHtml(pre1)}"></td>
          <td class="p-2 text-center"><input class="wali-prestasi2 w-32 border rounded px-2 py-1 text-center" type="text" value="${escapeHtml(pre2)}"></td>
          <td class="p-2 text-center"><input class="wali-prestasi3 w-32 border rounded px-2 py-1 text-center" type="text" value="${escapeHtml(pre3)}"></td>
        </tr>`;
      }).join('');
    }


    function renderWaliSikap() {
      const kelas = getWaliKelasCurrent();
      const q = (document.getElementById('wali-search-sikap')?.value || '').trim();
      const list = filterStudents(students.filter(s => s.kelas === kelas), q);
      const tb = document.getElementById('wali-sikap-tbody');
      if (!tb) return;
      if (!list.length) {
        tb.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-500 italic">Belum ada data siswa.</td></tr>`;
        return;
      }
      tb.innerHTML = list.map((s, i) => {
        const w = getWaliRow(s.id, kelas);
        const akhlak = Number((w?.akhlak ?? 0) ?? 0) || 0;
        const kerajinan = Number((w?.kerajinan ?? 0) ?? 0) || 0;
        const kebersihan = Number((w?.kebersihan ?? 0) ?? 0) || 0;
        const kedisiplinan = Number((w?.kedisiplinan ?? 0) ?? 0) || 0;
        return `
        <tr class="border-t" data-id="${s.id}" data-nis="${escapeHtml(s.nis || "")}" data-name="${escapeHtml(s.name || "")}">
          <td class="p-2">${i+1}</td>
          <td class="p-2">${escapeHtml(s.nis || '-')}</td>
          <td class="p-2 col-name">${escapeHtml(s.name || '-')}</td>
          <td class="p-2 text-center">${escapeHtml(getStudentGender(s))}</td>
          <td class="p-2 text-center"><input class="wali-akhlak w-24 border rounded px-2 py-1 text-center" type="number" min="0" max="100" value="${akhlak}" data-row="${i}" data-col="0" data-max-row="${list.length-1}" data-max-col="3"></td>
          <td class="p-2 text-center"><input class="wali-kerajinan w-24 border rounded px-2 py-1 text-center" type="number" min="0" max="100" value="${kerajinan}" data-row="${i}" data-col="1" data-max-row="${list.length-1}" data-max-col="3"></td>
          <td class="p-2 text-center"><input class="wali-kebersihan w-24 border rounded px-2 py-1 text-center" type="number" min="0" max="100" value="${kebersihan}" data-row="${i}" data-col="2" data-max-row="${list.length-1}" data-max-col="3"></td>
          <td class="p-2 text-center"><input class="wali-kedisiplinan w-24 border rounded px-2 py-1 text-center" type="number" min="0" max="100" value="${kedisiplinan}" data-row="${i}" data-col="3" data-max-row="${list.length-1}" data-max-col="3"></td>
        </tr>`;
      }).join('');
      bindTbodyArrowNav('wali-sikap-tbody');
    }
    async function saveWaliAbsenBatch() {
      const tb = document.getElementById('wali-absen-tbody');
      if (!tb) return;
      const kelas = getWaliKelasCurrent();
      const rows = [...tb.querySelectorAll('tr[data-id]')].map(tr => {
        const id = Number(tr.getAttribute('data-id'));
        const sakit = Math.max(0, Number(tr.querySelector('.wali-sakit')?.value || 0));
        const izin  = Math.max(0, Number(tr.querySelector('.wali-izin')?.value || 0));
        const alpa  = Math.max(0, Number(tr.querySelector('.wali-alpa')?.value || 0));
        return { student_id: id, kelas, hadir_s: sakit, hadir_i: izin, hadir_a: alpa };
      });
      try {
        await updateWaliScoresBatch(rows);
        showToast('Absen berhasil disimpan.', 'success', 2200);
        await loadInitialData();
        renderWaliAbsen();
      } catch (e) {
        console.error(e);
        showToast('Gagal menyimpan absen.', 'error', 3000);
      }
    }

    async function saveWaliCatatanBatch() {
      const tb = document.getElementById('wali-catatan-tbody');
      if (!tb) return;
      const kelas = getWaliKelasCurrent();
      const rows = [...tb.querySelectorAll('tr[data-id]')].map(tr => {
        const id = Number(tr.getAttribute('data-id'));
        const cat = (tr.querySelector('.wali-catatan')?.value || '').trim() || '-';
        return { student_id: id, kelas, catatan: cat };
      });
      try {
        await updateWaliScoresBatch(rows);
        showToast('Catatan berhasil disimpan.', 'success', 2200);
        await loadInitialData();
        renderWaliCatatan();
      } catch (e) {
        console.error(e);
        showToast('Gagal menyimpan catatan.', 'error', 3000);
      }
    }

    async function saveWaliPrestasiBatch() {
      const tb = document.getElementById('wali-prestasi-tbody');
      if (!tb) return;
      const kelas = getWaliKelasCurrent();
      const rows = [...tb.querySelectorAll('tr[data-id]')].map(tr => {
        const id = Number(tr.getAttribute('data-id'));
        const pre1 = (tr.querySelector('.wali-prestasi1')?.value || '').trim() || '-';
        const pre2 = (tr.querySelector('.wali-prestasi2')?.value || '').trim() || '-';
        const pre3 = (tr.querySelector('.wali-prestasi3')?.value || '').trim() || '-';
        return { student_id: id, kelas, prestasi: pre1, prestasi2: pre2, prestasi3: pre3 };
      });
      try {
        await updateWaliScoresBatch(rows);
        showToast('Prestasi berhasil disimpan.', 'success', 2200);
        await loadInitialData();
        renderWaliPrestasi();
      } catch (e) {
        console.error(e);
        showToast('Gagal menyimpan prestasi.', 'error', 3000);
      }
    }

    async function saveWaliSikapBatch() {
      const tb = document.getElementById('wali-sikap-tbody');
      if (!tb) return;
      const kelas = getWaliKelasCurrent();
      const rows = [...tb.querySelectorAll('tr[data-id]')].map(tr => {
        const id = Number(tr.getAttribute('data-id'));
        const akhlak = clampScore(tr.querySelector('.wali-akhlak')?.value || 0);
        const kerajinan = clampScore(tr.querySelector('.wali-kerajinan')?.value || 0);
        const kebersihan = clampScore(tr.querySelector('.wali-kebersihan')?.value || 0);
        const kedisiplinan = clampScore(tr.querySelector('.wali-kedisiplinan')?.value || 0);
        return { student_id: id, kelas, akhlak, kerajinan, kebersihan, kedisiplinan };
      });
      try {
        await updateWaliScoresBatch(rows);
        showToast('Sikap berhasil disimpan.', 'success', 2200);
        await loadInitialData();
        renderWaliSikap();
      } catch (e) {
        console.error(e);
        showToast('Gagal menyimpan sikap.', 'error', 3000);
      }
    }

    function refreshWaliSummary() {

      const kelas = getWaliKelasCurrent();
      const siswa = students.filter(s => s.kelas === kelas);

      const mapelItems = getMapelAssignmentsForKelas(kelas);
      const mapelList = mapelItems.map(x => x.mapel);

      // completeness per student: has score for all monitored mapel
      const perStudentComplete = siswa.map(st => {
        const stScores = scores.filter(sc => sc.kelas === kelas && sc.student_name === st.name);
        const setMapel = new Set(stScores.map(x => x.mapel));
        const missing = mapelList.filter(m => !setMapel.has(m));
        return { id: st.id, name: st.name, missingCount: missing.length, total: mapelList.length };
      });

      const completeCount = perStudentComplete.filter(x => x.total > 0 && x.missingCount === 0).length;
      const percent = siswa.length ? Math.round((completeCount / siswa.length) * 100) : 0;

      // avg PAS class (all scores in class)
      const kelasScores = scores.filter(sc => sc.kelas === kelas);
      const pasVals = kelasScores.map(x => Number(x.pas ?? 0)).filter(n => !Number.isNaN(n));
      const avgPas = pasVals.length ? Math.round(pasVals.reduce((a,b)=>a+b,0) / pasVals.length) : null;

      document.getElementById('wali-stat-siswa').textContent = String(siswa.length);
      document.getElementById('wali-stat-mapel').textContent = String(new Set(mapelList).size);
      document.getElementById('wali-stat-complete-count').textContent = String(completeCount);
      document.getElementById('wali-stat-complete').textContent = `${percent}%`;
      document.getElementById('wali-avg-pas').textContent = avgPas === null ? '-' : String(avgPas);

      // cache completeness in window for filtering
      window.__waliCompleteCache = perStudentComplete;
    }

    function getMapelAssignmentsForKelas(kelas) {
      // returns list of {mapel, guru_name, guru_username}
      const items = [];
      const guruList = users.filter(u => u.role === 'guru');

      guruList.forEach(g => {
        const classes = g.classes || [];
        const mapel = g.mapel || [];

        // support mapping object: classes can be object mapel->kelas[]
        const isObj = classes && !Array.isArray(classes) && typeof classes === 'object';

        mapel.forEach(m => {
          let teaches = false;
          if (isObj) {
            const arr = classes[m] || [];
            teaches = Array.isArray(arr) && arr.includes(kelas);
          } else {
            teaches = Array.isArray(classes) && classes.includes(kelas);
          }
          if (teaches) items.push({ mapel: m, guru_name: g.name, guru_username: g.username });
        });
      });

      // unique by mapel+guru
      const seen = new Set();
      return items.filter(x => {
        const key = `${x.mapel}||${x.guru_username}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function refreshWaliStatusNilai() {
      const kelas = getWaliKelasCurrent();
      const tbody = document.getElementById('wali-status-nilai-tbody');
      tbody.innerHTML = '';

      const siswa = students.filter(s => s.kelas === kelas);
      const totalSiswa = siswa.length;

      const assignments = getMapelAssignmentsForKelas(kelas);
      const mapelUnique = [...new Set(assignments.map(x => x.mapel))];

      document.getElementById('wali-mapel-hint').textContent =
        `Mapel terpantau: ${mapelUnique.length}. Progress dihitung dari jumlah siswa yang sudah punya entri nilai per mapel.`;

      if (!assignments.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 italic">Belum ada guru-mapel terdeteksi untuk kelas ini.</td></tr>`;
        return;
      }

      assignments.forEach(item => {
        const count = scores.filter(sc => sc.kelas === kelas && sc.mapel === item.mapel).length;
        const uniqStudent = new Set(scores.filter(sc => sc.kelas === kelas && sc.mapel === item.mapel).map(x => x.student_name)).size;
        const done = uniqStudent;

        let statusText = 'Belum';
        let badge = 'bg-red-50 text-red-700 border-red-200';
        if (done > 0 && done < totalSiswa) { statusText = 'Sebagian'; badge = 'bg-amber-50 text-amber-700 border-amber-200'; }
        if (totalSiswa > 0 && done >= totalSiswa) { statusText = 'Lengkap'; badge = 'bg-green-50 text-green-700 border-green-200'; }

        tbody.innerHTML += `
          <tr class="border-b">
            <td class="p-2 text-left">${escapeHtml(item.mapel)}</td>
            <td class="p-2 col-name text-left">${escapeHtml(item.guru_name)}</td>
            <td class="p-2 text-center">${done}/${totalSiswa}</td>
            <td class="p-2 text-center">
              <span class="inline-flex items-center px-2 py-1 rounded-full border text-xs ${badge}">${statusText}</span>
            </td>
          </tr>
        `;
      });
    }

    function renderWaliStudentList() {
      const kelas = getWaliKelasCurrent();
      const listEl = document.getElementById('wali-santri-list');
      const emptyEl = document.getElementById('wali-empty');

      const search = (document.getElementById('wali-search').value || '').toLowerCase().trim();
      const filt = document.getElementById('wali-filter').value || 'all';

      const siswa = students.filter(s => s.kelas === kelas);
      if (!siswa.length) {
        listEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
      }
      emptyEl.classList.add('hidden');

      const completeness = window.__waliCompleteCache || [];
      const compById = new Map(completeness.map(x => [String(x.id), x]));

      const filtered = siswa
        .filter(s => !search || s.name.toLowerCase().includes(search))
        .filter(s => {
          const c = compById.get(String(s.id));
          if (!c || c.total === 0) return true;
          if (filt === 'complete') return c.missingCount === 0;
          if (filt === 'incomplete') return c.missingCount > 0;
          return true;
        })
        .sort((a,b) => a.name.localeCompare(b.name, 'id'));

      listEl.innerHTML = '';
      filtered.forEach(s => {
        const isActive = String(waliSelectedStudentId) === String(s.id);
        const c = compById.get(String(s.id));
        let badgeText = 'Belum';
        let badgeClass = 'bg-gray-100 text-gray-700';
        if (c && c.total > 0) {
          if (c.missingCount === 0) { badgeText = 'Lengkap'; badgeClass = 'bg-green-100 text-green-800'; }
          else { badgeText = `Kurang ${c.missingCount}`; badgeClass = 'bg-amber-100 text-amber-800'; }
        }

        listEl.innerHTML += `
          <button onclick="showWaliStudentDetail('${s.id}')" class="w-full text-left p-3 rounded border ${isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}">
            <div class="font-semibold">${escapeHtml(s.name)}</div>
            <div class="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badgeClass}">${badgeText}</div>
          </button>
        `;
      });
    }

    function showWaliStudentDetail(id) {
      waliSelectedStudentId = id;
      renderWaliStudentList();

      const s = students.find(x => String(x.id) === String(id));
      if (!s) return;

      document.getElementById('wali-placeholder').classList.add('hidden');
      document.getElementById('wali-detail').classList.remove('hidden');
      document.getElementById('wali-santri-name').textContent = s.name;
      document.getElementById('target-siswa-id').value = s.id;

      // hide forms
      document.getElementById('wali-form-kehadiran').classList.add('hidden');
      document.getElementById('wali-form-prestasi').classList.add('hidden');
      document.getElementById('wali-form-catatan').classList.add('hidden');

      // show correct form
      if (currentWaliTab === 'kehadiran') {
        document.getElementById('wali-form-kehadiran').classList.remove('hidden');
        const supported = isAttendanceSupported();
        document.getElementById('wali-attendance-warning').classList.toggle('hidden', supported);
        document.getElementById('inp-sakit').value = supported ? (s.hadir_s ?? 0) : 0;
        document.getElementById('inp-izin').value  = supported ? (s.hadir_i ?? 0) : 0;
        document.getElementById('inp-alpa').value  = supported ? (s.hadir_a ?? 0) : 0;
      }

      if (currentWaliTab === 'prestasi') {
        document.getElementById('wali-form-prestasi').classList.remove('hidden');
        document.getElementById('inp-prestasi').value = s.prestasi || '-';
      }

      if (currentWaliTab === 'catatan') {
        document.getElementById('wali-form-catatan').classList.remove('hidden');
        document.getElementById('inp-catatan').value = s.catatan || '-';
      }

      // status label
      document.getElementById('wali-row-status').textContent = 'Menunggu';
      setTimeout(() => document.getElementById('wali-row-status').textContent = 'Belum', 400);
      updateWaliNilaiNote(s);
    }

    function updateWaliNilaiNote(s) {
      const kelas = getWaliKelasCurrent();
      const assignments = getMapelAssignmentsForKelas(kelas);
      const mapelSet = new Set(assignments.map(x => x.mapel));
      const stScores = scores.filter(sc => sc.kelas === kelas && sc.student_name === s.name);
      const setMapel = new Set(stScores.map(x => x.mapel));
      const missing = [...mapelSet].filter(m => !setMapel.has(m));

      const note = missing.length ? `Nilai belum lengkap: ${missing.join(', ')}` : 'Nilai mapel terpantau sudah lengkap.';
      document.getElementById('wali-nilai-note').textContent = note;
    }

    async function saveWaliCurrentTab() {
      const id = document.getElementById('target-siswa-id').value;
      if (!id) { showToast('Pilih siswa dulu.', 'warn'); return; }

      const payload = {};

      if (currentWaliTab === 'kehadiran') {
        if (!isAttendanceSupported()) {
          showToast('Kolom hadir_s/hadir_i/hadir_a belum ada di tabel students.', 'error', 4500);
          return;
        }
        payload.hadir_s = Math.max(0, parseInt(document.getElementById('inp-sakit').value || '0', 10));
        payload.hadir_i = Math.max(0, parseInt(document.getElementById('inp-izin').value  || '0', 10));
        payload.hadir_a = Math.max(0, parseInt(document.getElementById('inp-alpa').value  || '0', 10));
      }

      if (currentWaliTab === 'prestasi') {
        payload.prestasi = (document.getElementById('inp-prestasi').value || '').trim() || '-';
      }

      if (currentWaliTab === 'catatan') {
        payload.catatan = (document.getElementById('inp-catatan').value || '').trim() || '-';
      }

      setLoading(true, 'Menyimpan…', 'Memperbarui data siswa.');
      document.getElementById('wali-row-status').textContent = 'Menyimpan';
      try {
        await updateStudentFields(id, payload);
        showToast('Data wali berhasil disimpan.', 'success');

        // refresh local students
        await loadInitialData();
        refreshWaliSummary();
        renderWaliStudentList();
        const s = students.find(x => String(x.id) === String(id));
        if (s) updateWaliNilaiNote(s);

        document.getElementById('wali-row-status').textContent = 'Tersimpan';
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan. Cek koneksi / struktur tabel.', 'error', 4500);
        document.getElementById('wali-row-status').textContent = 'Gagal';
      } finally {
        setLoading(false);
        setTimeout(() => { if (document.getElementById('wali-row-status').textContent === 'Tersimpan') document.getElementById('wali-row-status').textContent = 'Belum'; }, 1200);
      }
    }

    // ==== RAPOR & LEGGER ====
    function refreshWaliRapor() {
      const kelas = getWaliKelasCurrent();
      const q = (document.getElementById('wali-search-rapor')?.value || '').trim();

      const list = filterStudents(students.filter(s => s.kelas === kelas), q)
        .sort((a,b) => (a.name||'').localeCompare(b.name||'', 'id'));

      const thead = document.getElementById('wali-rapor-thead');
      const tb = document.getElementById('wali-rapor-tbody');
      const note = document.getElementById('wali-rapor-bobot-note');
      if (!thead || !tb) return;

      const kelasScores = scores.filter(sc => sc.kelas === kelas);
      const mapelSet = new Set(kelasScores.map(x => x.mapel).filter(Boolean));
      const mapelList = [...mapelSet].sort((a,b)=>String(a).localeCompare(String(b),'id'));

      const w = loadBobot();
      if (note) note.textContent = `Bobot global dipakai: Hadir ${w.hadir}% • Tugas ${w.tugas}% • UH ${w.uh}% • PAS/PAT ${w.pas}%`;

      // Build THEAD
      let headRow = `<tr>
        <th class="p-2">No</th>
        <th class="p-2">NIS</th>
        <th class="p-2 col-name">Nama Lengkap</th>
        <th class="p-2 text-center">L/P</th>`;
      mapelList.forEach(m => { headRow += `<th class="p-2 text-center whitespace-nowrap">${escapeHtml(m)}</th>`; });
      headRow += `</tr>`;
      thead.innerHTML = headRow;

      if (!list.length) {
        tb.innerHTML = `<tr><td colspan="${4 + mapelList.length}" class="p-4 text-center text-gray-500 italic">Belum ada data rapor.</td></tr>`;
        return;
      }

      // Pre-index scores for fast lookup: student_name -> (mapel -> score)
      const byStudent = new Map();
      kelasScores.forEach(sc => {
        if (!byStudent.has(sc.student_name)) byStudent.set(sc.student_name, new Map());
        byStudent.get(sc.student_name).set(sc.mapel, sc);
      });

      tb.innerHTML = list.map((s, i) => {
        const m = byStudent.get(s.name) || new Map();
        let row = `<tr class="border-t" data-id="${s.id}" onclick="selectRaporStudent('${s.id}')">`;
        row += `<td class="p-2">${i+1}</td>`;
        row += `<td class="p-2">${escapeHtml(s.nis || '-')}</td>`;
        row += `<td class="p-2 col-name">${escapeHtml(s.name || '-')}</td>`;
        row += `<td class="p-2 text-center">${escapeHtml(getStudentGender(s))}</td>`;
        mapelList.forEach(mp => {
          const sc = m.get(mp);
          const val = sc ? calcNilaiAkhir(sc, w) : '';
          row += `<td class="p-2 text-center">${val === '' ? '<span class="text-gray-400">-</span>' : val}</td>`;
        });
        row += `</tr>`;
        return row;
      }).join('');
    }


    function selectRaporStudent(id) {
      waliRaporSelectedId = id;
      refreshWaliRapor();
    }

    function renderRaporPreview(id) {
      const s = students.find(x => String(x.id) === String(id));
      if (!s) return;

      document.getElementById('wali-rapor-selected').textContent = s.name;

      const kelasScores = scores.filter(sc => sc.student_name === s.name);
      const tbody = document.getElementById('wali-nilai-tbody');
      tbody.innerHTML = '';

      if (!kelasScores.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-gray-500 italic">Belum ada nilai.</td></tr>`;
        document.getElementById('wali-nilai-note-2').textContent = '';
        return;
      }

      kelasScores.sort((a,b) => a.mapel.localeCompare(b.mapel, 'id')).forEach(n => {
        tbody.innerHTML += `<tr class="border-b">
          <td class="p-2 text-left">${escapeHtml(n.mapel)}</td>
          <td class="p-2 text-center">${n.kehadiran ?? 0}</td>
          <td class="p-2 text-center">${n.tugas ?? 0}</td>
          <td class="p-2 text-center">${getUhAvg(n)}</td>
          <td class="p-2 text-center">${n.pas ?? 0}</td>
        </tr>`;
      });

      document.getElementById('wali-nilai-note-2').textContent = `Total mapel punya nilai: ${kelasScores.length}`;
    }

    function printRaporSelected() {
      const id = waliRaporSelectedId;
      const s = students.find(x => String(x.id) === String(id));
      if (!s) { showToast('Pilih siswa dulu.', 'warn'); return; }

      // header
      document.getElementById('rapor-nama').textContent = s.name;
      document.getElementById('rapor-kelas').textContent = s.kelas;

      // attendance if exist
      document.getElementById('rapor-sakit').textContent = isAttendanceSupported() ? (s.hadir_s ?? 0) : 0;
      document.getElementById('rapor-izin').textContent  = isAttendanceSupported() ? (s.hadir_i ?? 0) : 0;
      document.getElementById('rapor-alpa').textContent  = isAttendanceSupported() ? (s.hadir_a ?? 0) : 0;

      // notes
      document.getElementById('rapor-catatan').textContent = s.catatan || '-';
      document.getElementById('rapor-prestasi').textContent = s.prestasi || '-';

      // scores
      const tbody = document.getElementById('rapor-tbody');
      tbody.innerHTML = '';
      const nilaiSiswa = scores.filter(sc => sc.student_name === s.name).sort((a,b)=>a.mapel.localeCompare(b.mapel,'id'));

      if (!nilaiSiswa.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-gray-500 italic">Belum ada nilai.</td></tr>`;
      } else {
        nilaiSiswa.forEach(n => {
          tbody.innerHTML += `<tr class="border-b">
            <td class="p-2 text-left">${escapeHtml(n.mapel)}</td>
            <td class="p-2 text-center">${n.kehadiran ?? 0}</td>
            <td class="p-2 text-center">${n.tugas ?? 0}</td>
            <td class="p-2 text-center">${getUhAvg(n)}</td>
            <td class="p-2 text-center">${n.pas ?? 0}</td>
          </tr>`;
        });
      }

      document.getElementById('print-legger').classList.add('hidden');
      document.getElementById('print-area').classList.remove('hidden');
      window.print();
    }

    function buildLeggerTable() {
      const kelas = getWaliKelasCurrent();
      const siswa = students.filter(s => s.kelas === kelas).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'id'));

      // mapel yang sudah punya nilai di kelas ini
      const kelasScores = scores.filter(sc => sc.kelas === kelas);
      const mapelList = [...new Set(kelasScores.map(x => x.mapel).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'id'));

      const w = loadBobot();
      const table = document.getElementById('legger-table');
      table.innerHTML = '';

      // header
      let thead = `<thead class="bg-gray-100"><tr>` +
        `<th class="p-2 border text-center">No</th>` +
        `<th class="p-2 border text-left">NIS</th>` +
        `<th class="p-2 border col-name">Nama</th>` +
        `<th class="p-2 border text-center">L/P</th>`;
      mapelList.forEach(m => { thead += `<th class="p-2 border text-center">${escapeHtml(m)}</th>`; });
      thead += `<th class="p-2 border text-center">Rerata</th></tr></thead>`;

      // index scores by student
      const byStudent = new Map();
      kelasScores.forEach(sc => {
        if (!byStudent.has(sc.student_name)) byStudent.set(sc.student_name, new Map());
        byStudent.get(sc.student_name).set(sc.mapel, sc);
      });

      let tbody = `<tbody>`;
      siswa.forEach((st, i) => {
        const m = byStudent.get(st.name) || new Map();
        const vals = [];
        let row = `<tr>` +
          `<td class="p-2 border text-center">${i+1}</td>` +
          `<td class="p-2 border">${escapeHtml(st.nis || '-')}</td>` +
          `<td class="p-2 col-name border">${escapeHtml(st.name || '-')}</td>` +
          `<td class="p-2 border text-center">${escapeHtml(getStudentGender(st))}</td>`;

        mapelList.forEach(mp => {
          const sc = m.get(mp);
          const val = sc ? calcNilaiAkhir(sc, w) : '';
          if (val !== '' && Number.isFinite(Number(val))) vals.push(Number(val));
          row += `<td class="p-2 border text-center">${val === '' ? '' : val}</td>`;
        });
        const avg = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : '';
        row += `<td class="p-2 border text-center font-semibold">${avg}</td></tr>`;
        tbody += row;
      });
      tbody += `</tbody>`;

      table.innerHTML = thead + tbody;
      document.getElementById('legger-kelas').textContent = kelas;
    }

    function printLegger() {
      buildLeggerTable();
      document.getElementById('print-area').classList.add('hidden');
      document.getElementById('print-legger').classList.remove('hidden');
      window.print();
    }

    function closePrintAreas() {
      document.getElementById('print-area').classList.add('hidden');
      document.getElementById('print-legger').classList.add('hidden');
    }

    // bind search/filter for wali panels
    function bindWaliListeners() {
      const s1 = document.getElementById('wali-search');
      const f1 = document.getElementById('wali-filter');
      if (s1) s1.addEventListener('input', () => renderWaliStudentList());
      if (f1) f1.addEventListener('change', () => renderWaliStudentList());

      const s2 = document.getElementById('wali-search-rapor');
      if (s2) s2.addEventListener('input', () => refreshWaliRapor());
    }

    // expose for sidebar button refresh
    function refreshWaliStatusNilaiWrapper(){ refreshWaliStatusNilai(); }
    function refreshWaliRaporWrapper(){ refreshWaliRapor(); }

    // keep backward names used by buttons
    window.refreshWaliStatusNilai = refreshWaliStatusNilai;
    window.refreshWaliRapor = refreshWaliRapor;

function bindAdminControls() {
      const once = (id, ev, fn) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.dataset.bound === "1") return;
        el.dataset.bound = "1";
        el.addEventListener(ev, fn);
      };

      once("admin-guru-search", "input", () => renderAdminGuruTable());
      once("admin-guru-sort", "change", () => renderAdminGuruTable());

      once("admin-santri-search", "input", () => renderAdminSantriTable());
      once("admin-santri-sort", "change", () => renderAdminSantriTable());
      once("admin-santri-kelas-filter", "change", () => renderAdminSantriTable());

      renderAdminGuruTable();
      renderAdminSantriTable();
    }

function renderAdminGuruTable() {
      const t = document.getElementById('admin-guru-tbody');
      const count = document.getElementById('admin-guru-count');
      if (!t) return;

      const term = normalizeText(document.getElementById('admin-guru-search')?.value);
      const sortMode = document.getElementById('admin-guru-sort')?.value || 'name_asc';

      let list = users.filter(u => isGuruUser(u));

      if (term) {
        list = list.filter(g => {
          const blob = [
            g.name, g.username,
            (g.mapel || []).join(' '),
            (g.classes || []).join(' '),
            getWaliKelas(g),
            g.musyrif
          ].join(' ');
          return normalizeText(blob).includes(term);
        });
      }

      const sorters = {
        name_asc: (a,b) => String(a.name).localeCompare(String(b.name), 'id'),
        name_desc: (a,b) => String(b.name).localeCompare(String(a.name), 'id'),
        username_asc: (a,b) => String(a.username).localeCompare(String(b.username), 'id'),
        mapel_asc: (a,b) => String((a.mapel||[])[0]||'').localeCompare(String((b.mapel||[])[0]||''), 'id'),
      };
      list.sort(sorters[sortMode] || sorters.name_asc);

      if (count) count.textContent = `${list.length} guru`;

      if (!list.length) {
        t.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 italic">Tidak ada data yang cocok.</td></tr>`;
        return;
      }

      t.innerHTML = list.map(g => {
        const mp = (g.mapel || []).join(', ') || '-';
        const cls = (g.classes || []).join(', ') || '-';
        const wali = getWaliKelas(g) || '-';
        const mus = (g.musyrif || '').trim() || '-';
        return `
          <tr class="border-b">
            <td class="p-2 col-name">${escapeHtml(g.name)}</td>
            <td class="p-2 col-name font-mono text-xs">${escapeHtml(g.username)}</td>
            <td class="p-2">${escapeHtml(mp)}</td>
            <td class="p-2">${escapeHtml(cls)}</td>
            <td class="p-2">${escapeHtml(wali)}</td>
            <td class="p-2">${escapeHtml(mus)}</td>
            <td class="p-2 text-center whitespace-nowrap">
              <button onclick="editGuru('${g.id}')" class="text-blue-600 hover:underline">Edit</button>
              <button onclick="requestDeleteUser('${g.id}')" class="text-red-600 hover:underline ml-2">Hapus</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function renderAdminSantriTable() {
      const t = document.getElementById('admin-santri-tbody');
      const count = document.getElementById('admin-santri-count');
      if (!t) return;

      populateSantriKelasFilter();

      const term = normalizeText(document.getElementById('admin-santri-search')?.value);
      const kelasFilter = document.getElementById('admin-santri-kelas-filter')?.value || '';
      const sortMode = document.getElementById('admin-santri-sort')?.value || 'kelas_asc';

      let list = [...students];

      if (kelasFilter) list = list.filter(s => s.kelas === kelasFilter);

      if (term) {
        list = list.filter(s => {
          const blob = [s.nis, s.name, s.kelas].join(' ');
          return normalizeText(blob).includes(term);
        });
      }

      const sorters = {
        kelas_asc: (a,b) => String(a.kelas).localeCompare(String(b.kelas), 'id') || String(a.name).localeCompare(String(b.name), 'id'),
        name_asc: (a,b) => String(a.name).localeCompare(String(b.name), 'id'),
        name_desc: (a,b) => String(b.name).localeCompare(String(a.name), 'id'),
        nis_asc: (a,b) => String(a.nis||'').localeCompare(String(b.nis||''), 'id'),
      };
      list.sort(sorters[sortMode] || sorters.kelas_asc);

      if (count) count.textContent = `${list.length} santri`;

      if (!list.length) {
        t.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 italic">Tidak ada data yang cocok.</td></tr>`;
        return;
      }

      t.innerHTML = list.map(s => `
        <tr class="border-b">
          <td class="p-2 text-center font-mono text-xs">${escapeHtml(s.nis || '-')}</td>
          <td class="p-2 col-name">${escapeHtml(s.name)}</td>
          <td class="p-2 text-center">${escapeHtml(s.kelas)}</td>
          <td class="p-2 text-center whitespace-nowrap">
            <button onclick="editSantri('${s.id}')" class="text-blue-600 hover:underline">Edit</button>
            <button onclick="requestDeleteSantri('${s.id}')" class="text-red-600 hover:underline ml-2">Hapus</button>
          </td>
        </tr>
      `).join('');
    }

    function slugifyUsername(name) {
      return normalizeText(name)
        .replace(/[^a-z0-9\s._-]/g, '')
        .replace(/\s+/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '') || 'guru';
    }

    function autoFillGuruUsername() {
      const inpNama = document.getElementById('inp-nama');
      const inpUsername = document.getElementById('inp-username');
      const base = slugifyUsername(inpNama?.value || '');

      let u = base;
      let n = 1;
      const exists = (x) => users.some(p => normalizeText(p.username) === normalizeText(x));
      while (exists(u)) {
        n += 1;
        u = `${base}${n}`;
      }
      inpUsername.value = u;
      showToast(`Username dibuat: ${u}`, 'success', 2200);
    }

    // ===== Import Santri (Excel) =====
    function downloadSantriTemplateAdmin() {
      const data = [{
        "NIS": "",
        "NISN": "",
        "Nama Lengkap": "",
        "L/P": "",
        "TTL": "",
        "Kelas": "",
        "Agama": "",
        "Status Keluarga": "",
        "Anak ke": "",
        "Telp Siswa": "",
        "Alamat Siswa": "",
        "Sekolah Asal": "",
        "Tanggal Diterima (YYYY-MM-DD)": "",
        "Diterima Kelas": "",
        "Nama Ayah": "",
        "Nama Ibu": "",
        "Pekerjaan Ayah": "",
        "Pekerjaan Ibu": "",
        "Alamat Orang Tua": "",
        "Nama Wali": "",
        "Pekerjaan Wali": "",
        "Alamat Wali": ""
      }];
      const ws = XLSX.utils.json_to_sheet(data);
      autoFitSheet(ws, data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'template_import_santri.xlsx');
    }

    let pendingSantriImportPlan = null;

    function openSantriImportModal(plan) {
      // Preview modal dinonaktifkan: langsung konfirmasi singkat lalu eksekusi.
      pendingSantriImportPlan = plan;

      const total = plan.rows.length;
      const ins = plan.rows.filter(r => r.action === 'insert').length;
      const upd = plan.rows.filter(r => r.action === 'update').length;
      const skp = plan.rows.filter(r => r.action === 'skip').length;

      openConfirm({
        title: 'Konfirmasi Import Santri',
        message: `Total ${total} baris. Insert: ${ins}, Update: ${upd}, Skip: ${skp}. Lanjut eksekusi?`,
        okText: 'Ya, eksekusi',
        cancelText: 'Batal',
        onConfirm: async () => {
          await applySantriImport();
        }
      });
    }

    function handleSantriImport(inp) {
      const f = inp.files?.[0];
      if (!f) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);

        const plan = { rows: [], errors: [] };

        const seenNIS = new Set();
        json.forEach((raw, i) => {
          const rowNum = i + 2; // header = row 1
          const nis = String(getCellCI(raw, ['NIS','nis']) ?? '').trim() || null;
          const nisn = String(getCellCI(raw, ['NISN','nisn']) ?? '').trim() || null;
          const name = String(getCellCI(raw, ['Nama Lengkap','Nama','name']) ?? '').trim();
          const lp = String(getCellCI(raw, ['L/P','LP','Jenis Kelamin','Kelamin']) ?? '').trim() || null;
          const ttl = String(getCellCI(raw, ['TTL','Tempat Tanggal Lahir']) ?? '').trim() || null;
          const kelas = String(getCellCI(raw, ['Kelas','kelas']) ?? '').trim();

          const agama = String(getCellCI(raw, ['Agama']) ?? '').trim() || null;
          const status_keluarga = String(getCellCI(raw, ['Status Keluarga']) ?? '').trim() || null;
          const anak_ke_raw = getCellCI(raw, ['Anak ke','Anak Ke','anak_ke']);
          const anak_ke = (anak_ke_raw === '' || anak_ke_raw == null) ? null : Number(anak_ke_raw);
          const telp_siswa = String(getCellCI(raw, ['Telp Siswa','No HP Siswa']) ?? '').trim() || null;
          const alamat_siswa = String(getCellCI(raw, ['Alamat Siswa']) ?? '').trim() || null;
          const sekolah_asal = String(getCellCI(raw, ['Sekolah Asal']) ?? '').trim() || null;
          const tanggal_diterima = String(getCellCI(raw, ['Tanggal Diterima']) ?? '').trim() || null;
          const diterima_kelas = String(getCellCI(raw, ['Terima di kelas','Diterima Kelas']) ?? '').trim() || null;

          const nama_ayah = String(getCellCI(raw, ['Nama Ayah']) ?? '').trim() || null;
          const nama_ibu = String(getCellCI(raw, ['Nama Ibu']) ?? '').trim() || null;
          const pekerjaan_ayah = String(getCellCI(raw, ['Pekerjaan Ayah']) ?? '').trim() || null;
          const pekerjaan_ibu = String(getCellCI(raw, ['Pekerjaan Ibu']) ?? '').trim() || null;
          const alamat_ortu = String(getCellCI(raw, ['Alamat Orang Tua','Alamat Ortu']) ?? '').trim() || null;

          const nama_wali = String(getCellCI(raw, ['Nama Wali']) ?? '').trim() || null;
          const pekerjaan_wali = String(getCellCI(raw, ['Pekerjaan Wali']) ?? '').trim() || null;
          const alamat_wali = String(getCellCI(raw, ['Alamat Wali']) ?? '').trim() || null;

          if (!name || !kelas) {
            plan.rows.push({ nis, name: name || '-', kelas: kelas || '-', action: 'skip', reason: 'Nama/Kelas wajib' });
            plan.errors.push(`Baris ${rowNum}: Nama dan Kelas wajib diisi.`);
            return;
          }

          if (nis) {
            if (seenNIS.has(nis)) {
              plan.rows.push({ nis, name, kelas, action: 'skip', reason: 'Duplikat NIS di Excel' });
              plan.errors.push(`Baris ${rowNum}: Duplikat NIS di file Excel (${nis}).`);
              return;
            }
            seenNIS.add(nis);
          }

          // cek existing berdasarkan NIS
          const existing = nis ? students.find(s => String(s.nis ?? '') === nis) : null;
          if (existing) {
            plan.rows.push({ nis, nisn, name, lp, ttl, kelas, agama, status_keluarga, anak_ke, telp_siswa, alamat_siswa, sekolah_asal, tanggal_diterima, diterima_kelas, nama_ayah, nama_ibu, pekerjaan_ayah, pekerjaan_ibu, alamat_ortu, nama_wali, pekerjaan_wali, alamat_wali, action: 'update', targetId: existing.id });
          } else {
            plan.rows.push({ nis, nisn, name, lp, ttl, kelas, agama, status_keluarga, anak_ke, telp_siswa, alamat_siswa, sekolah_asal, tanggal_diterima, diterima_kelas, nama_ayah, nama_ibu, pekerjaan_ayah, pekerjaan_ibu, alamat_ortu, nama_wali, pekerjaan_wali, alamat_wali, action: 'insert' });
          }
        });

        openSantriImportModal(plan);
      };

      reader.readAsArrayBuffer(f);
    }

    async function applySantriImport() {
      const plan = pendingSantriImportPlan;
      if (!plan) return;

      const actionable = plan.rows.filter(r => r.action === 'insert' || r.action === 'update');
      if (!actionable.length) {
        showToast('Tidak ada baris yang bisa dieksekusi.', 'warn');
        return;
      }

      setLoading(true, 'Import santri…', `Menjalankan ${actionable.length} aksi (insert/update).`);

      let ok = 0, fail = 0;

      try {
        for (let i = 0; i < actionable.length; i++) {
          const r = actionable[i];
          document.getElementById('loading-subtitle').innerText = `Memproses ${i + 1}/${actionable.length}…`;

          const payload = {
            nis: r.nis,
            nisn: r.nisn || null,
            name: r.name,
            lp: r.lp || null,
            ttl: r.ttl || null,
            agama: r.agama || null,
            status_keluarga: r.status_keluarga || null,
            anak_ke: r.anak_ke ?? null,
            telp_siswa: r.telp_siswa || null,
            alamat_siswa: r.alamat_siswa || null,
            sekolah_asal: r.sekolah_asal || null,
            tanggal_diterima: r.tanggal_diterima || null,
            diterima_kelas: r.diterima_kelas || null,
            nama_ayah: r.nama_ayah || null,
            nama_ibu: r.nama_ibu || null,
            pekerjaan_ayah: r.pekerjaan_ayah || null,
            pekerjaan_ibu: r.pekerjaan_ibu || null,
            alamat_ortu: r.alamat_ortu || null,
            nama_wali: r.nama_wali || null,
            pekerjaan_wali: r.pekerjaan_wali || null,
            alamat_wali: r.alamat_wali || null,
            kelas: r.kelas
          };

          if (r.action === 'update') {
            const { error } = await db.from('students').update(payload).eq('id', r.targetId);
            if (error) throw error;
          } else {
            const { error } = await db.from('students').insert(payload);
            if (error) throw error;
          }
          ok += 1;
        }

        await loadInitialData();
        renderAdminSantriTable();
        showToast(`Import selesai. Berhasil: ${ok}.`, 'success', 3800);
      } catch (err) {
        console.error(err);
        fail += 1;
        showToast(`Import terhenti karena error: ${err.message || err}`, 'error', 5000);
      } finally {
        setLoading(false);
      }
    }

    
    // ===== Import Guru (Excel) =====
    function parseCommaList(v) {
      return String(v ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    function downloadGuruTemplateAdmin() {
      const data = [
        { "Username": "guru.ipa", "Nama": "Nama Guru", "Role": "guru", "Password": "", "Mapel": "Matematika,Fisika", "Kelas Ajar": "10-A,10-B", "Kelas Wali": "", "Musyrif": "10-A" }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      autoFitSheet(ws, data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GURU");
      XLSX.writeFile(wb, "template_import_guru.xlsx");
    }

    let pendingGuruImportPlan = null;

    function openGuruImportModal(plan) {
      const modal = document.getElementById('guru-import-modal');
      if (!modal) return;

      const total = plan.rows.length;
      const ins = plan.rows.filter(r => r.action === 'insert').length;
      const upd = plan.rows.filter(r => r.action === 'update').length;
      const skp = plan.rows.filter(r => r.action === 'skip').length;

      document.getElementById('guru-import-total').textContent = total;
      document.getElementById('guru-import-insert').textContent = ins;
      document.getElementById('guru-import-update').textContent = upd;
      document.getElementById('guru-import-skip').textContent = skp;

      const sampleTbody = document.getElementById('guru-import-sample');
      sampleTbody.innerHTML = plan.rows.slice(0, 12).map(r => {
        const badge = r.action === 'insert'
          ? '<span class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">insert</span>'
          : r.action === 'update'
            ? '<span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">update</span>'
            : '<span class="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">skip</span>';

        return `<tr class="border-b">
          <td class="p-2 col-name font-mono text-xs">${escapeHtml(r.username || '-')}</td>
          <td class="p-2 col-name">${escapeHtml(r.name || '-')}</td>
          <td class="p-2">${escapeHtml(r.role || '-')}</td>
          <td class="p-2">${badge}</td>
        </tr>`;
      }).join('');

      const errUl = document.getElementById('guru-import-errors');
      errUl.innerHTML = plan.errors.length
        ? plan.errors.slice(0, 12).map(e => `<li>${escapeHtml(e)}</li>`).join('')
        : `<li class="list-none text-gray-500 italic">Aman, tidak ada error.</li>`;

      pendingGuruImportPlan = plan;

      const close = () => {
        modal.classList.add('hidden');
        pendingGuruImportPlan = null;
        const f = document.getElementById('admin-guru-import');
        if (f) f.value = '';
      };

      document.getElementById('guru-import-close').onclick = close;
      document.getElementById('guru-import-cancel').onclick = close;
      document.getElementById('guru-import-apply').onclick = async () => {
        await applyGuruImport();
        close();
      };

      modal.classList.remove('hidden');
    }

    function handleGuruImport(inp) {
      const f = inp.files?.[0];
      if (!f) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);

        const plan = { rows: [], errors: [] };
        const seen = new Set();

        json.forEach((raw, i) => {
          const rowNum = i + 2;

          const username = String(raw["Username"] ?? raw["username"] ?? '').trim();
          const name = String(raw["Nama"] ?? raw["Name"] ?? raw["name"] ?? '').trim();
          const role = String(raw["Role"] ?? raw["role"] ?? 'guru').trim() || 'guru';
          const password = String(raw["Password"] ?? raw["password"] ?? '').trim();
          const mapel = parseCommaList(raw["Mapel"] ?? raw["mapel"] ?? '');
          const classes = parseCommaList(raw["Kelas Ajar"] ?? raw["Classes"] ?? raw["classes"] ?? '');
          const kelas_wali = String(raw["Kelas Wali"] ?? raw["kelas_wali"] ?? '').trim() || null;
          const musyrif = String(raw["Musyrif"] ?? raw["musyrif"] ?? '').trim() || null;

          if (!username || !name) {
            plan.rows.push({ username, name: name || '-', role, action: 'skip', reason: 'Username/Nama wajib' });
            plan.errors.push(`Baris ${rowNum}: Username dan Nama wajib diisi.`);
            return;
          }

          const key = normalizeText(username);
          if (seen.has(key)) {
            plan.rows.push({ username, name, role, action: 'skip', reason: 'Duplikat username di Excel' });
            plan.errors.push(`Baris ${rowNum}: Duplikat username di file Excel (${username}).`);
            return;
          }
          seen.add(key);

          const existing = users.find(u => normalizeText(u.username) === key);
          if (existing) {
            plan.rows.push({ username, name, role, password, mapel, classes, kelas_wali, musyrif, action: 'update', targetId: existing.id });
          } else {
            plan.rows.push({ username, name, role, password, mapel, classes, kelas_wali, musyrif, action: 'insert' });
          }
        });

        openGuruImportModal(plan);
      };

      reader.readAsArrayBuffer(f);
    }

    async function applyGuruImport() {
      const plan = pendingGuruImportPlan;
      if (!plan) return;

      const actionable = plan.rows.filter(r => r.action === 'insert' || r.action === 'update');
      if (!actionable.length) {
        showToast('Tidak ada baris yang bisa dieksekusi.', 'warn');
        return;
      }

      setLoading(true, 'Import guru…', `Menjalankan ${actionable.length} aksi (insert/update).`);
      let ok = 0;

      try {
        for (let i = 0; i < actionable.length; i++) {
          const r = actionable[i];
          document.getElementById('loading-subtitle').innerText = `Memproses ${i + 1}/${actionable.length}…`;

          const basePayload = {
            username: r.username,
            name: r.name,
            role: r.role || 'guru',
            mapel: Array.isArray(r.mapel) ? r.mapel : [],
            classes: Array.isArray(r.classes) ? r.classes : [],
            kelas_wali: r.kelas_wali ?? null,
            musyrif: r.musyrif ?? null,
          };

          if (r.action === 'update') {
            const payload = { ...basePayload };
            // jangan overwrite password kalau kosong
            if (r.password) payload.password = r.password;

            const { error } = await db.from('users').update(payload).eq('id', r.targetId);
            if (error) throw error;
          } else {
            const payload = { ...basePayload };
            payload.password = r.password || (r.username + '123');

            const { error } = await db.from('users').insert(payload);
            if (error) throw error;
          }

          ok += 1;
        }

        await loadInitialData();
        renderAdminGuruTable();
        showToast(`Import selesai. Berhasil: ${ok}.`, 'success', 3800);
      } catch (err) {
        console.error(err);
        showToast(`Import terhenti karena error: ${err.message || err}`, 'error', 5000);
      } finally {
        setLoading(false);
      }
    }

function requestDeleteUser(id) {
      const g = users.find(x => String(x.id) === String(id));
      openConfirm({
        title: 'Hapus Guru',
        message: `Yakin mau menghapus akun guru${g?.name ? ' “' + g.name + '”' : ''}? Tindakan ini tidak bisa dibatalkan.`,
        okText: 'Hapus',
        danger: true,
        onConfirm: async () => {
          setLoading(true, 'Menghapus…', 'Sedang menghapus data guru.');
          try {
            await deleteUserFromDB(id);
            renderAdminGuruTable();
            showToast('Guru berhasil dihapus.', 'success');
          } catch (err) {
            console.error(err);
            showToast('Gagal menghapus guru.', 'error', 4500);
          } finally {
            setLoading(false);
          }
        }
      });
    }

    function requestDeleteSantri(id) {
      const s = students.find(x => String(x.id) === String(id));
      openConfirm({
        title: 'Hapus Siswa',
        message: `Yakin mau menghapus data siswa${s?.name ? ' “' + s.name + '”' : ''}? Tindakan ini tidak bisa dibatalkan.`,
        okText: 'Hapus',
        danger: true,
        onConfirm: async () => {
          setLoading(true, 'Menghapus…', 'Sedang menghapus data siswa.');
          try {
            await deleteSantriFromDB(id);
            renderAdminSantriTable();
            showToast('Siswa berhasil dihapus.', 'success');
          } catch (err) {
            console.error(err);
            showToast('Gagal menghapus siswa.', 'error', 4500);
          } finally {
            setLoading(false);
          }
        }
      });
    }

    function openModal(type) {
      document.getElementById('admin-modal').classList.remove('hidden');
      document.getElementById('data-type').value = type;
      document.getElementById('edit-id').value = '';
      document.getElementById('modal-title').innerText = type === 'guru' ? 'Tambah Guru' : 'Tambah Santri';
      document.getElementById('inp-nama').value = '';

      if (type === 'guru') {
        document.getElementById('fields-guru').classList.remove('hidden');
        document.getElementById('fields-santri').classList.add('hidden');
        document.getElementById('inp-username').value = '';
        document.getElementById('inp-mapel').value = '';
        document.getElementById('inp-kelas-ajar').value = '';
        document.getElementById('inp-kelas-wali').value = '';
      } else {
        document.getElementById('fields-guru').classList.add('hidden');
        document.getElementById('fields-santri').classList.remove('hidden');
        document.getElementById('inp-nis').value = '';
        document.getElementById('inp-kelas-santri').value = '';
      }
    }

    async function saveAdminData() {
      const type = document.getElementById('data-type').value;
      const id = document.getElementById('edit-id').value;
      const nama = (document.getElementById('inp-nama').value || '').trim();

      if (!nama) { showToast('Nama wajib diisi.', 'warn'); return; }

      setLoading(true, 'Menyimpan…', 'Sedang menyimpan perubahan data.');
      try {
        if (type === 'guru') {
          const username = (document.getElementById('inp-username').value || '').trim();
          if (!username) { showToast('Username wajib diisi untuk guru.', 'warn'); return; }

          const mapel = (document.getElementById('inp-mapel').value || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          const kelasWali = (document.getElementById('inp-kelas-wali').value || '').trim() || null;
          const musyrif = (document.getElementById('inp-musyrif')?.value || '').trim() || null;

          const classes = (document.getElementById('inp-kelas-ajar').value || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          const data = {
            name: nama,
            role: 'guru',
            username,
            mapel,
            classes,
            kelas_wali: kelasWali,
            musyrif
          };

          // password hanya diset saat tambah (agar edit tidak mereset password yang sudah diganti)
          if (!id) data.password = username + '123';

          if (id) await updateGuruInDB(id, data);
          else await addGuruToDB(data);

          renderAdminGuruTable();
        } else {
          const nis = (document.getElementById('inp-nis').value || '').trim() || null;
          const kelas = (document.getElementById('inp-kelas-santri').value || '').trim();

          if (!kelas) { showToast('Kelas wajib diisi untuk siswa.', 'warn'); return; }

          const data = { nis, name: nama, kelas };

          if (id) await updateSantriInDB(id, data);
          else await addSantriToDB(data);

          renderAdminSantriTable();
        }

        document.getElementById('admin-modal').classList.add('hidden');
        showToast('Berhasil disimpan.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan data. Pastikan tidak ada duplikasi username/NIS.', 'error', 4500);
      } finally {
        setLoading(false);
      }
    }

    function editGuru(id) {
      const u = users.find(x => x.id == id);
      openModal('guru');
      document.getElementById('edit-id').value = u.id;
      document.getElementById('inp-nama').value = u.name;
      document.getElementById('inp-username').value = u.username;
      document.getElementById('inp-mapel').value = safeArray(u.mapel).join(',');
      document.getElementById('inp-kelas-ajar').value = safeArray(u.classes).join(',');
      document.getElementById('inp-kelas-wali').value = getWaliKelas(u);
      const mus = (u.musyrif || '').trim();
      const inpM = document.getElementById('inp-musyrif');
      if (inpM) inpM.value = mus;
    }

    function editSantri(id) {
      const s = students.find(x => x.id == id);
      openModal('santri');
      document.getElementById('edit-id').value = s.id;
      document.getElementById('inp-nama').value = s.name;
      document.getElementById('inp-nis').value = s.nis || '';
      document.getElementById('inp-kelas-santri').value = s.kelas;
    }
  