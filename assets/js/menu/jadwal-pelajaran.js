let mkAllKelas = [];
let mkAllSiswa = [];
let mkGuruList = [];
function loadManajemenKelas() {
    setActiveMenu('Manajemen Kelas');
    showView('view-manajemen-kelas');
    mkLoadKelas();
}
function mkLoadKelas() {
    const list = document.getElementById('mkKelasList');
    if (!list) return;
    list.className = 'p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto';
    list.style.maxHeight = '62vh';
    list.innerHTML = '<div class="col-span-full text-center py-12 text-gray-300"><i class="fas fa-circle-notch fa-spin text-lg mb-3 block"></i><p class="text-sm">Memuat data kelas…</p></div>';
    const elTotal = document.getElementById('mkTotalKelas');
    const elSiswa = document.getElementById('mkTotalSiswa');
    const elInfo  = document.getElementById('mkInfoKelas');
    if (elTotal) elTotal.textContent = '';
    if (elSiswa) elSiswa.textContent = ' siswa';
    if (elInfo)  elInfo.textContent  = '';
    // Load guru list for wali kelas dropdown
    mkGuruList = [];
    siakadRun
        .withSuccessHandler(gRes => {
            if (gRes && gRes.success) {
                // Wali kelas hanya boleh diisi oleh Guru Pengajar / Wali Kelas 
                // bukan admin, kepala madrasah, bendahara, pencatat, dll.
                mkGuruList = (gRes.data || []).filter(g => g.role === 'guru' || g.role === 'walikelas');
            }
        })
        .withFailureHandler(() => {})
        .getGuruList(currentUser && currentUser.token);
    // Load siswa list for count per kelas
    siakadRun
        .withSuccessHandler(sRes => {
            if (sRes && sRes.success && sRes.data) {
                mkAllSiswa = sRes.data;
                if (elSiswa) elSiswa.textContent = sRes.data.length + ' siswa';
                // Jika kelas sudah ter-render duluan (race condition), render ulang
                // supaya jumlah siswa per kartu kelas akurat.
                if (mkAllKelas.length > 0) {
                    const q = document.getElementById('mkSearchKelas');
                    mkRenderList(q && q.value.trim() ? mkAllKelas.filter(k => k.nama.toLowerCase().includes(q.value.trim().toLowerCase())) : mkAllKelas);
                }
            }
        })
        .withFailureHandler(() => { if (elSiswa) elSiswa.textContent = ' siswa'; })
        .getSiswaList(null);
    siakadRun
        .withSuccessHandler(res => {
            if (!res || !res.success) {
                mkShowListError((res && res.message) ? res.message : 'Gagal memuat data kelas.');
                return;
            }
            mkAllKelas = res.data || [];
            mkRenderList(mkAllKelas);
            if (elTotal) elTotal.textContent = mkAllKelas.length;
            if (elInfo)  elInfo.textContent  = String(mkAllKelas.length);
        })
        .withFailureHandler(err => mkShowListError(String(err)))
        .getKelasMaster();
}
function mkShowListError(msg) {
    const list = document.getElementById('mkKelasList');
    if (list) list.innerHTML = `<div class="col-span-full text-center py-12 text-red-400"><i class="fas fa-exclamation-circle text-lg mb-2 block"></i><p class="text-sm">${msg}</p></div>`;
}
function mkFilterKelas() {
    const q = document.getElementById('mkSearchKelas').value.trim().toLowerCase();
    const filtered = q ? mkAllKelas.filter(k => k.nama.toLowerCase().includes(q)) : mkAllKelas;
    const elInfo = document.getElementById('mkInfoKelas');
    if (elInfo) elInfo.textContent = String(filtered.length) + (q ? ' hasil pencarian' : '');
    mkRenderList(filtered);
}
function mkRenderList(kelasList) {
    const list = document.getElementById('mkKelasList');
    if (!list) return;
    if (!kelasList || kelasList.length === 0) {
        list.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <i class="fas fa-inbox text-gray-300 text-lg"></i>
          </div>
          <p class="text-sm font-bold text-gray-500">Belum ada data kelas</p>
          <p class="text-xs text-gray-400 mt-1">Klik tombol "Tambah Kelas" di atas untuk menambahkan.</p>
        </div>`;
        return;
    }
    list.innerHTML = '';
    kelasList.forEach((k, i) => {
        const nama = k.nama || '';
        const initials = nama.substring(0, 2).toUpperCase();
        const ri = k.rowIndex;
        const wali = k.nama_wali || k.wali_kelas || k.waliKelas || '';
        // Count siswa in this kelas
        const jumlahSiswa = mkAllSiswa.filter(s => s.kelas === nama).length;
        const card = document.createElement('div');
        card.className = 'kelas-card group';
        card.id = 'kelas-card-' + ri;
        card.innerHTML = `
          <div class="kelas-avatar">${initials}</div>
          <div class="flex-1 min-w-0">
            <div id="kelas-label-${ri}" class="font-bold text-sm text-gray-800 truncate">${nama}</div>
            <input id="kelas-input-${ri}" type="text" class="kelas-input-edit hidden" value="${nama}"
              onkeydown="if(event.key==='Enter') mkSimpanEdit(${ri}); if(event.key==='Escape') mkBatalEdit(${ri});">
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="kelas-badge"><i class="fas fa-users text-[9px] mr-1"></i>${jumlahSiswa}</span>
              <span id="wali-label-${ri}" class="text-[10px] text-gray-400 truncate max-w-[100px]">${wali ? '<i class=\'fas fa-chalkboard-teacher text-[9px] mr-0.5\'></i>' + wali : '<span class=\'italic\'>Belum ada wali</span>'}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" id="kelas-actions-${ri}">
            <button onclick="mkBukaDetail('${nama}', ${ri})"
              class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-[#e8ecf4] text-gray-500 hover:text-[#1b2a4a] flex items-center justify-center transition" title="Lihat siswa">
              <i class="fas fa-users text-[11px]"></i>
            </button>
            <button onclick="mkMulaiEdit(${ri})"
              class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-[#e8ecf4] text-gray-500 hover:text-[#1b2a4a] flex items-center justify-center transition" title="Edit nama">
              <i class="fas fa-pen text-[11px]"></i>
            </button>
            <button id="btn-hapus-${ri}"
              class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition" title="Hapus kelas">
              <i class="fas fa-trash text-[11px]"></i>
            </button>
          </div>
          <div class="hidden items-center gap-1" id="kelas-edit-actions-${ri}">
            <button onclick="mkSimpanEdit(${ri})"
              class="w-7 h-7 rounded-lg bg-[#1b2a4a] hover:bg-[#152238] text-white flex items-center justify-center transition" title= - impan">
              <i class="fas fa-check text-[11px]"></i>
            </button>
            <button onclick="mkBatalEdit(${ri})"
              class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition" title="Batal">
              <i class="fas fa-times text-[11px]"></i>
            </button>
          </div>`;
        card.querySelector('#btn-hapus-' + ri).addEventListener('click', () => mkHapusKelas(ri, nama));
        list.appendChild(card);
    });
}

//  Detail panel: siswa per kelas + wali kelas 
function mkBukaDetail(namaKelas, rowIndex) {
    // Close existing
    const existingPanel = document.getElementById('mk-detail-panel');
    if (existingPanel) existingPanel.remove();
    // Find container
    const container = document.getElementById('mkPanelWrapper');
    if (!container) return;
    // Build panel
    const panel = document.createElement('div');
    panel.id = 'mk-detail-panel';
    panel.className = 'mt-3 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden';
    const waliKelas = mkAllKelas.find(k => k.rowIndex === rowIndex);
    const currentWali = (waliKelas && (waliKelas.wali_kelas || waliKelas.waliKelas)) || '';
    const currentWaliNama = (waliKelas && waliKelas.nama_wali) || currentWali;
    const siswaDiKelas = mkAllSiswa.filter(s => s.kelas === namaKelas);
    // Build guru options
    const guruOpts = mkGuruList.length
        ? mkGuruList.map(g => `<option value="${g.username||g.nama||''}" ${(g.username||g.nama||'') === currentWali ? 'selected' : ''}>${g.nama||g.username||'-'} ${g.kelas ? '('+g.kelas+')' : ''}</option>`).join('')
        : '<option value=""> Memuat guru... </option>';
    panel.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-[#1b2a4a] flex items-center justify-center shrink-0">
            <span class="text-white text-xs font-black">${namaKelas.substring(0,2).toUpperCase()}</span>
          </div>
          <div>
            <p class="text-sm font-bold text-gray-800">Kelas ${namaKelas}</p>
            <p class="text-[10px] text-gray-400">${siswaDiKelas.length} siswa terdaftar</p>
          </div>
        </div>
        <button onclick="document.getElementById('mk-detail-panel').remove()"
          class="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
      <!-- Wali Kelas -->
      <div class="px-4 py-3 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="flex items-center gap-2 shrink-0">
          <i class="fas fa-chalkboard-teacher text-[#1b2a4a] text-xs w-4 text-center"></i>
          <span class="text-xs font-bold text-gray-600">Wali Kelas</span>
        </div>
        <div class="flex-1 flex items-center gap-2">
          <select id="mk-wali-select-${rowIndex}"
            class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-800 focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] outline-none transition">
            <option value=""> Pilih Wali Kelas </option>
            ${guruOpts}
          </select>
          <button onclick="mkSimpanWali('${namaKelas}', ${rowIndex})"
            class="px-3 py-2 rounded-xl bg-[#1b2a4a] hover:bg-[#152238] text-white text-xs font-bold transition active:scale-95 flex items-center gap-1.5 shrink-0">
            <i class="fas fa-save text-[10px]"></i> Simpan
          </button>
        </div>
      </div>
      <!-- Daftar Siswa -->
      <div class="px-4 py-3">
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Daftar Siswa</p>
        ${siswaDiKelas.length === 0
          ? `<div class="text-center py-6 text-gray-300"><i class="fas fa-user-slash text-base mb-2 block"></i><p class="text-xs">Belum ada siswa di kelas ini</p></div>`
          : `<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              ${siswaDiKelas.map((s, idx) => `
                <div class="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 transition">
                  <div class="w-6 h-6 rounded-lg bg-[#e8ecf4] flex items-center justify-center shrink-0">
                    <span class="text-[#1b2a4a] text-[10px] font-black">${(s.nama||'').substring(0,1).toUpperCase()}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-semibold text-gray-800 truncate">${s.nama||'-'}</p>
                    <p class="text-[10px] text-gray-400 font-mono">${s.nisn||s.id||'-'}</p>
                  </div>
                  <span class="text-[10px] text-gray-300 shrink-0">${idx+1}</span>
                </div>`).join('')}
            </div>`}
      </div>`;
    container.appendChild(panel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function mkSimpanWali(namaKelas, rowIndex) {
    const sel = document.getElementById('mk-wali-select-' + rowIndex);
    if (!sel) return;
    const waliUsername = sel.value;
    const btn = sel.nextElementSibling;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[10px]"></i>';
    siakadRun
        .withSuccessHandler(res => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save text-[10px]"></i> Simpan';
            if (res && res.success) {
                showAlert('success', res.message || 'Wali kelas berhasil disimpan.');
                mkLoadKelas();
                document.getElementById('mk-detail-panel') && document.getElementById('mk-detail-panel').remove();
            } else {
                showAlert('error', (res && res.message) || 'Gagal menyimpan wali kelas.');
            }
        })
        .withFailureHandler(err => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save text-[10px]"></i> Simpan';
            showAlert('error', String(err));
        })
        .setWaliKelas(currentUser && currentUser.token, namaKelas, waliUsername);
}

function mkMulaiEdit(rowIndex) {
    // Close detail panel if open
    const dp = document.getElementById('mk-detail-panel');
    if (dp) dp.remove();
    document.getElementById('kelas-label-' + rowIndex).classList.add('hidden');
    document.getElementById('kelas-input-' + rowIndex).classList.remove('hidden');
    document.getElementById('kelas-actions-' + rowIndex).classList.add('opacity-100');
    document.getElementById('kelas-actions-' + rowIndex).style.opacity = '1';
    document.getElementById('kelas-actions-' + rowIndex).classList.add('hidden');
    document.getElementById('kelas-edit-actions-' + rowIndex).classList.remove('hidden');
    document.getElementById('kelas-edit-actions-' + rowIndex).classList.add('flex');
    const inp = document.getElementById('kelas-input-' + rowIndex);
    inp.focus(); inp.select();
}
function mkBatalEdit(rowIndex) {
    const k = mkAllKelas.find(x => x.rowIndex === rowIndex);
    if (k) document.getElementById('kelas-input-' + rowIndex).value = k.nama;
    document.getElementById('kelas-label-' + rowIndex).classList.remove('hidden');
    document.getElementById('kelas-input-' + rowIndex).classList.add('hidden');
    document.getElementById('kelas-actions-' + rowIndex).classList.remove('hidden');
    document.getElementById('kelas-edit-actions-' + rowIndex).classList.add('hidden');
    document.getElementById('kelas-edit-actions-' + rowIndex).classList.remove('flex');
}
function mkSimpanEdit(rowIndex) {
    const namaBaru = document.getElementById('kelas-input-' + rowIndex).value.trim();
    if (!namaBaru) { showAlert('error', 'Nama kelas tidak boleh kosong.'); return; }
    showLoading();
    siakadRun
        .withSuccessHandler(res => {
            hideLoading();
            if (res.success) {
                showAlert('success', res.message);
                mkLoadKelas();
                reloadExistingClasses();
            } else {
                showAlert('error', res.message);
                mkBatalEdit(rowIndex);
            }
        })
        .withFailureHandler(err => { hideLoading(); showAlert('error', String(err)); mkBatalEdit(rowIndex); })
        .updateKelas(rowIndex, namaBaru);
}
function mkHapusKelas(rowIndex, namaKelas) {
    Swal.fire({
        title: 'Hapus Kelas?',
        html: `<p class="text-gray-500 text-sm">Kelas <b>${namaKelas}</b> akan dihapus.<br><span class="text-red-500 text-xs">Tidak bisa dihapus jika masih ada siswa terdaftar.</span></p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then(r => {
        if (!r.isConfirmed) return;
        showLoading();
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                if (res.success) {
                    showAlert('success', res.message);
                    mkLoadKelas();
                    reloadExistingClasses();
                } else Swal.fire('Gagal', res.message, 'error');
            })
            .withFailureHandler(err => { hideLoading(); showAlert('error', String(err)); })
            .deleteKelas(rowIndex, namaKelas);
    });
}
function mkOpenTambahKelasModal() {
    showModal(`
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div class="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#e8ecf4] flex items-center justify-center shrink-0">
                    <i class="fas fa-plus text-[#1b2a4a] text-sm"></i>
                </div>
                <div>
                    <h3 class="font-bold text-gray-800 text-sm">Tambah Kelas Baru</h3>
                    <p class="text-xs text-gray-400 mt-0.5">Masukkan nama kelas yang ingin ditambahkan</p>
                </div>
            </div>
            <div class="p-5 space-y-3">
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nama Kelas</label>
                    <input type="text" id="inputNamaKelas" placeholder="Contoh: 1A, 2B, 3C …" autofocus
                        onkeydown="if(event.key==='Enter') mkTambahKelas()"
                        class="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800 bg-gray-50 focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] focus:bg-white outline-none transition placeholder:font-normal placeholder:text-gray-400">
                </div>
            </div>
            <div class="p-5 pt-0 flex gap-2">
                <button onclick="closeModal()"
                    class="flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all active:scale-95">
                    Batal
                </button>
                <button onclick="mkTambahKelas()" id="btnTambahKelas"
                    class="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 bg-[#1b2a4a] hover:bg-[#152238] shadow-sm">
                    <i class="fas fa-plus text-xs"></i> Tambah Kelas
                </button>
            </div>
        </div>
    `);
    setTimeout(() => {
        const inp = document.getElementById('inputNamaKelas');
        if (inp) inp.focus();
    }, 50);
}
function mkTambahKelas() {
    const inp = document.getElementById('inputNamaKelas');
    if (!inp) return;
    const nama = inp.value.trim();
    if (!nama) { inp.focus(); showAlert('error', 'Masukkan nama kelas terlebih dahulu.'); return; }
    const btn = document.getElementById('btnTambahKelas');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xs"></i> Menyimpan...'; }
    siakadRun
        .withSuccessHandler(res => {
            if (res.success) {
                showAlert('success', res.message);
                closeModal();
                mkLoadKelas();
                reloadExistingClasses();
            } else {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus text-xs"></i> Tambah Kelas'; }
                showAlert('error', res.message);
            }
        })
        .withFailureHandler(err => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus text-xs"></i> Tambah Kelas'; }
            showAlert('error', String(err));
        })
        .addKelas(nama);
}
let mmAllMapel = []; 
let jadwalGuruNamaList = []; 
let jadwalMapelList = [];   
function loadJadwalPelajaran() {
  stopAndBack(false);
  setActiveMenu('Jadwal Pelajaran');
  showView('view-manajemen-mapel');
  document.getElementById('pageTitle').textContent = 'Jadwal Pelajaran';
  const filterSelect = document.getElementById('filterKelasJadwal');
  if (filterSelect) {
    filterSelect.onchange = function() { loadJadwalData(this.value); };
  }
  function buildJadwalGuruMapelFromData(data) {
    jadwalGuruNamaList = data.map(g => g.nama).filter(Boolean).sort();
    const mapelSet = new Set();
    data.forEach(g => {
      if (g.mapel) {
        String(g.mapel).split(',').forEach(m => { const t = m.trim(); if (t) mapelSet.add(t); });
      }
    });
    jadwalMapelList = Array.from(mapelSet).sort();
  }
  if (tableState.guruprofil && tableState.guruprofil.fullData && tableState.guruprofil.fullData.length > 0) {
    buildJadwalGuruMapelFromData(tableState.guruprofil.fullData);
  } else {
    siakadRun
      .withSuccessHandler(res => {
        if (res.success && res.data) {
          tableState.guruprofil.fullData = res.data;
          buildJadwalGuruMapelFromData(res.data);
        }
      })
      .withFailureHandler(() => {})
      .getProfilGuruList(currentUser.token);
  }
  reloadExistingClasses(function() {
    siakadRun
      .withSuccessHandler(function() { loadJadwalData(null); })
      .withFailureHandler(function()  { loadJadwalData(null); })
      .bersihkanDuplikatJadwal(currentUser.token);
  });
}
const selectedJadwalRows = new Set();
function toggleJadwalRow(rowIndex, checked) {
  if (checked) selectedJadwalRows.add(rowIndex);
  else selectedJadwalRows.delete(rowIndex);
  const cb = document.querySelector('.chk-jadwal[value="' + rowIndex + '"]');
  if (cb) cb.checked = checked;
  const tr = cb ? cb.closest('tr') : document.querySelector('.select-row-target[data-type="jadwal"][data-id="' + rowIndex + '"]');
  if (tr) {
    if (checked) {
      tr.classList.add('bg-blue-50/60', 'selected-row', 'border-l-4', 'border-l-[#1b2a4a]');
      tr.classList.remove('border-l-transparent');
    } else {
      tr.classList.remove('bg-blue-50/60', 'selected-row', 'border-l-4', 'border-l-[#1b2a4a]');
      tr.classList.add('border-l-transparent');
    }
  }
  const checkAllJadwal = document.getElementById('checkAllJadwal');
  if (checkAllJadwal) {
    const rowsEls = document.querySelectorAll('.chk-jadwal');
    checkAllJadwal.checked = rowsEls.length > 0 && Array.from(rowsEls).every(c => c.checked);
  }
  updateBulkDeleteJadwalUI();
}
function toggleSelectAllJadwal(source) {
  document.querySelectorAll('.chk-jadwal').forEach(cb => {
    cb.checked = source.checked;
    const val = parseInt(cb.value);
    if (source.checked) selectedJadwalRows.add(val);
    else selectedJadwalRows.delete(val);
  });
  updateBulkDeleteJadwalUI();
}
function updateBulkDeleteJadwalUI() {
  const btn = document.getElementById('btnBulkDeleteJadwal');
  if (!btn) return;
  const count = selectedJadwalRows.size;
  const badge = btn.querySelector('.bulk-count');
  if (badge) badge.textContent = count;
  if (count > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}
function bulkDeleteJadwal() {
  const rows = Array.from(selectedJadwalRows);
  if (rows.length === 0) return;
  Swal.fire({
    title: 'Hapus Data Massal?',
    text: `${rows.length} data jadwal yang dipilih akan dihapus secara permanen.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#3d5478',
    confirmButtonText: `Ya, Hapus ${rows.length} Data!`,
    cancelButtonText: 'Batal',
    reverseButtons: true
  }).then((result) => {
    if (!result.isConfirmed) return;
    showLoading();
    const token = currentUser.token;
    siakadRun
      .withSuccessHandler(r => {
        hideLoading();
        if (r.success) {
          selectedJadwalRows.clear();
          updateBulkDeleteJadwalUI();
          loadJadwalData(document.getElementById('filterKelasJadwal')?.value || null);
          showAlert('success', r.message);
        } else {
          showAlert('error', r.message);
        }
      })
      .withFailureHandler(err => {
        hideLoading();
        showAlert('error', 'Error server: ' + err);
      })
      .deleteMultipleJadwal(token, rows);
  });
}
let jadwalDataCache = [];
function loadJadwalData(kelasFilter) {
  const tbody = document.getElementById('tbody-jadwal');
  tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i> Memuat data...</td></tr>';
  siakadRun
    .withSuccessHandler(function(res) {
      if (!res.success) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-red-400">${res.message}</td></tr>`;
        document.getElementById('info-jadwal').textContent = 'Gagal memuat data';
        return;
      }
      const data = res.data || [];
      jadwalDataCache = data;
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-gray-400">Belum ada data jadwal untuk kelas ini. Import dari Excel atau tambah manual!</td></tr>`;
        const mobileCards = document.getElementById('jadwalMobileCards'); if (mobileCards) mobileCards.innerHTML = `<div class="py-12 text-center text-gray-400 text-sm">Belum ada data jadwal untuk kelas ini.</div>`;
        document.getElementById('info-jadwal').textContent = '0 data';
        return;
      }
      let html = '';
      let mobileHtml = '';
      data.forEach((item, idx) => {
        const isSelected = selectedJadwalRows.has(item.rowIndex);
        html += `
          <tr class="hover:bg-gray-50 transition border-b border-gray-50 select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${item.rowIndex}" data-type="jadwal">
            <td class="p-1.5 md:p-3 text-center hidden md:table-cell">
              <input type="checkbox" class="chk-jadwal w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" value="${item.rowIndex}" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="p-1.5 md:p-3 text-center text-gray-500 text-[10px] md:text-sm">${idx + 1}</td>
            <td class="p-1.5 md:p-3"><span class="jadwal-hari-badge">${item.hari || '-'}</span></td>
            <td class="p-1.5 md:p-3 font-bold text-xs md:text-sm text-gray-900">${item.mapel || '-'}</td>
            <td class="p-1.5 md:p-3 text-[10px] md:text-sm text-gray-600">${item.pengajar || '-'}</td>
            <td class="p-1.5 md:p-3 text-[10px] md:text-sm font-mono text-gray-500">${item.jam_mulai || '-'}</td>
            <td class="p-1.5 md:p-3 text-[10px] md:text-sm font-mono text-gray-500">${item.jam_selesai || '-'}</td>
            <td class="p-1.5 md:p-3"><span class="px-2 py-1 bg-[#e8ecf4] text-[#152238] rounded text-xs font-bold">${item.kelas || '-'}</span></td>
            <td class="p-1.5 md:p-3 text-center">
              <div style="display:flex;align-items:center;justify-content:center;gap:6px">
                <button onclick="openJadwalFormModal('edit', ${item.rowIndex})" class="jadwal-btn-edit text-[10px] md:text-xs" title="Edit Jadwal">
                  <i class="fas fa-pen"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
        mobileHtml += `
          <article class="jadwal-mobile-card" data-id="${item.rowIndex}" data-type="jadwal">
            <div class="jadwal-mobile-card__top">
              <div class="jadwal-mobile-card__title">
                <span class="jadwal-mobile-card__number">${idx + 1}</span>
                <div class="jadwal-mobile-card__subject">${item.mapel || '-'}</div>
              </div>
              <button type="button" onclick="openJadwalFormModal('edit', ${item.rowIndex})" class="jadwal-mobile-card__edit" aria-label="Edit jadwal" title="Edit">
                <i class="fas fa-pen"></i>
              </button>
            </div>
            <div class="jadwal-mobile-card__meta">
              <span><i class="fas fa-calendar-day"></i>${item.hari || '-'}</span>
              <span><i class="fas fa-clock"></i>${item.jam_mulai || '-'} - ${item.jam_selesai || '-'}</span>
            </div>
            <div class="jadwal-mobile-card__bottom">
              <span><i class="fas fa-user-tie"></i>${item.pengajar || '-'}</span>
              <span class="jadwal-mobile-card__class">${item.kelas || '-'}</span>
            </div>
          </article>`;
      });
      tbody.innerHTML = html;
      const mobileCards = document.getElementById('jadwalMobileCards');
      if (mobileCards) mobileCards.innerHTML = mobileHtml;
      document.getElementById('info-jadwal').textContent = '';
      const checkAllJadwal = document.getElementById('checkAllJadwal');
      if (checkAllJadwal) checkAllJadwal.checked = false;
      document.querySelectorAll('.chk-jadwal').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          toggleJadwalRow(parseInt(this.value), this.checked);
        });
      });
      updateBulkDeleteJadwalUI();
    })
    .withFailureHandler(function(err) {
      tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-red-400">Error: ${err}</td></tr>`;
      document.getElementById('info-jadwal').textContent = 'Error';
    })
    .getJadwalList(kelasFilter || null);
}
function bersihkanDuplikatJadwal() {
  Swal.fire({
    title: 'Bersihkan Duplikat?',
    text: 'Sistem akan menghapus semua baris jadwal yang persis sama (hari, mapel, guru, jam, kelas identik). Tindakan ini tidak dapat dibatalkan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#3d5478',
    confirmButtonText: 'Ya, Bersihkan!',
    cancelButtonText: 'Batal',
    reverseButtons: true
  }).then(result => {
    if (!result.isConfirmed) return;
    showLoading();
    siakadRun
      .withSuccessHandler(r => {
        hideLoading();
        if (r.success) {
          loadJadwalData(document.getElementById('filterKelasJadwal')?.value || null);
          Swal.fire('Selesai', r.message, 'success');
        } else {
          Swal.fire('Gagal', r.message, 'error');
        }
      })
      .withFailureHandler(err => { hideLoading(); Swal.fire('Error', String(err), 'error'); })
      .bersihkanDuplikatJadwal(currentUser.token);
  });
}
function openJadwalFormModal(mode, rowIndex) {
  const isEdit = mode === 'edit';
  const existing = isEdit ? jadwalDataCache.find(j => j.rowIndex === rowIndex) : null;
  if (isEdit && !existing) {
    showAlert('error', 'Data jadwal tidak ditemukan. Silakan refresh.');
    return;
  }
  const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jumat", 'Sabtu', 'Minggu'];
  const hariOptions = hariList.map(h =>
    `<option value="${h}" ${existing && existing.hari === h ? 'selected' : ''}>${h}</option>`
  ).join('');
  const kelasOptions = (existingClasses || []).map(k =>
    `<option value="${k}" ${existing && existing.kelas === k ? 'selected' : ''}>${k}</option>`
  ).join('');
  Swal.fire({
    title: isEdit ? '<span class="jf-modal-title"><i class="fas fa-pen-to-square"></i> Edit Jadwal</span>' : '<span class="jf-modal-title"><i class="fas fa-calendar-plus"></i> Tambah Jadwal</span>',
    html: `
      <div class="jf-form">
        <div class="jf-field">
          <label class="jf-label">Hari <span class="jf-required">*</span></label>
          <select id="swal-jadwal-hari" class="jf-select">
            ${hariOptions}
          </select>
        </div>
        <div class="jf-field">
          <label class="jf-label">Nama Mapel <span class="jf-required">*</span></label>
          <select id="swal-jadwal-mapel" class="jf-select">
            <option value="">-- Pilih Mapel --</option>
            ${(jadwalMapelList.length > 0 ? jadwalMapelList : [existing ? existing.mapel : ''].filter(Boolean))
              .map(m => `<option value="${m}" ${existing && existing.mapel === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <div id="jadwal-mapel-hint" style="font-size:11px;color:#5b7aaa;margin-top:3px;display:none"><i class="fas fa-circle-notch fa-spin" style="margin-right:4px"></i>Memuat daftar mapel...</div>
        </div>
        <div class="jf-field" style="position:relative">
          <label class="jf-label">Pengajar <span class="jf-required">*</span></label>
          <input id="swal-jadwal-pengajar" class="jf-input" placeholder="Ketik atau pilih nama guru..." autocomplete="off" value="${existing ? existing.pengajar.replace(/"/g,'&quot;') : ''}">
          <div id="guru-dropdown" style="display:none;position:absolute;left:0;right:0;top:100%;background:#fff;border:1px solid #d0d8e8;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);max-height:180px;overflow-y:auto;z-index:99999;margin-top:2px"></div>
          <div id="jadwal-pengajar-hint" style="font-size:11px;color:#5b7aaa;margin-top:3px;display:none"><i class="fas fa-circle-notch fa-spin" style="margin-right:4px"></i>Memuat daftar guru...</div>
        </div>
        <div class="jf-row">
          <div class="jf-field">
            <label class="jf-label">Jam Mulai</label>
            <input type="time" id="swal-jadwal-jammulai" class="jf-input" value="${existing ? existing.jam_mulai : '07:00'}">
          </div>
          <div class="jf-field">
            <label class="jf-label">Jam Selesai</label>
            <input type="time" id="swal-jadwal-jamselesai" class="jf-input" value="${existing ? existing.jam_selesai : '08:00'}">
          </div>
        </div>
        <div class="jf-field">
          <label class="jf-label">Kelas</label>
          <select id="swal-jadwal-kelas" class="jf-select">
            <option value="">-- Pilih Kelas --</option>
            ${kelasOptions}
          </select>
        </div>
      </div>
    `,
    width: 440,
    showCancelButton: true,
    confirmButtonText: isEdit ? '<i class="fas fa-save" style="margin-right:6px"></i>Simpan' : '<i class="fas fa-plus" style="margin-right:6px"></i>Tambah',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4F46E5',
    cancelButtonColor: '#3d5478',
    reverseButtons: false,
    focusConfirm: false,
    customClass: { popup: 'jf-popup' },
    didOpen: () => {
      const popup = Swal.getPopup();
      const input = popup.querySelector('#swal-jadwal-pengajar');
      const dropdown = popup.querySelector('#guru-dropdown');
      const hint = popup.querySelector('#jadwal-pengajar-hint');
      const mapelSelect = popup.querySelector('#swal-jadwal-mapel');
      const mapelHint = popup.querySelector('#jadwal-mapel-hint');
      const populateMapelSelect = (list) => {
        if (!mapelSelect) return;
        const currentVal = mapelSelect.value;
        mapelSelect.innerHTML = '<option value="">-- Pilih Mapel --</option>' +
          list.map(m => `<option value="${m}" ${m === currentVal || (existing && existing.mapel === m && !currentVal) ? 'selected' : ''}>${m}</option>`).join('');
        if (mapelHint) mapelHint.style.display = 'none';
      };
      if (jadwalMapelList && jadwalMapelList.length > 0) {
        populateMapelSelect(jadwalMapelList);
      } else {
        if (mapelHint) mapelHint.style.display = 'block';
        siakadRun
          .withSuccessHandler(res => {
            if (res.success && res.data) {
              tableState.guruprofil.fullData = res.data;
              jadwalGuruNamaList = res.data.map(g => g.nama).filter(Boolean).sort();
              const mapelSet = new Set();
              res.data.forEach(g => {
                if (g.mapel) String(g.mapel).split(',').forEach(m => { const t = m.trim(); if (t) mapelSet.add(t); });
              });
              jadwalMapelList = Array.from(mapelSet).sort();
            }
            populateMapelSelect(jadwalMapelList);
          })
          .withFailureHandler(() => { if (mapelHint) mapelHint.style.display = 'none'; })
          .getProfilGuruList(currentUser.token);
      }
      const renderDropdown = (namaList, query) => {
        const q = (query || '').toLowerCase();
        const filtered = q
          ? namaList.filter(n => n.toLowerCase().includes(q))
          : namaList;
        if (filtered.length === 0) {
          dropdown.innerHTML = '<div style="padding:10px 14px;color:#8fa3c0;font-size:13px">Tidak ada guru ditemukan</div>';
        } else {
          dropdown.innerHTML = filtered.map(n => {
            const highlighted = q
              ? n.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'), '<strong style="color:#4f46e5">$1</strong>')
              : n;
            return `<div class="guru-dd-item" style="padding:9px 14px;cursor:pointer;font-size:13px;color:#1e2d4a;border-bottom:1px solid #eef0f6" data-nama="${n}">${highlighted}</div>`;
          }).join('');
          dropdown.querySelectorAll('.guru-dd-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
              e.preventDefault();
              input.value = item.getAttribute('data-nama');
              dropdown.style.display = 'none';
            });
            item.addEventListener('mouseover', () => { item.style.background = '#eef2ff'; });
            item.addEventListener('mouseout',  () => { item.style.background = ''; });
          });
        }
        dropdown.style.display = 'block';
      };
      const initDropdown = (namaList) => {
        if (hint) hint.style.display = 'none';
        input.addEventListener('focus', () => renderDropdown(namaList, input.value));
        input.addEventListener('input', () => renderDropdown(namaList, input.value));
        input.addEventListener('blur',  () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
      };
      if (jadwalGuruNamaList && jadwalGuruNamaList.length > 0) {
        initDropdown(jadwalGuruNamaList);
      } else {
        if (hint) hint.style.display = 'block';
        const retryGuru = setInterval(() => {
          if (jadwalGuruNamaList && jadwalGuruNamaList.length > 0) {
            clearInterval(retryGuru);
            initDropdown(jadwalGuruNamaList);
          }
        }, 300);
        setTimeout(() => { clearInterval(retryGuru); if (hint) hint.style.display = 'none'; }, 10000);
      }
    },
    preConfirm: () => {
      const hari = Swal.getPopup().querySelector('#swal-jadwal-hari').value;
      const mapel = Swal.getPopup().querySelector('#swal-jadwal-mapel').value.trim();
      const pengajar = Swal.getPopup().querySelector('#swal-jadwal-pengajar').value.trim();
      const jam_mulai = Swal.getPopup().querySelector('#swal-jadwal-jammulai').value;
      const jam_selesai = Swal.getPopup().querySelector('#swal-jadwal-jamselesai').value;
      const kelas = Swal.getPopup().querySelector('#swal-jadwal-kelas').value.trim();
      if (!hari || !mapel) {
        Swal.showValidationMessage('Hari dan Nama Mapel wajib diisi.');
        return false;
      }
      if (!pengajar) {
        Swal.showValidationMessage('Nama Pengajar wajib diisi.');
        return false;
      }
      if (jadwalGuruNamaList.length > 0 && !jadwalGuruNamaList.includes(pengajar)) {
        Swal.showValidationMessage(`Guru "${pengajar}" tidak terdaftar. Pilih nama dari daftar guru yang ada.`);
        return false;
      }
      if (jam_mulai && jam_selesai && jam_selesai <= jam_mulai) {
        Swal.showValidationMessage('Jam Selesai harus lebih besar dari Jam Mulai.');
        return false;
      }
      if (!kelas) {
        Swal.showValidationMessage('Kelas wajib dipilih.');
        return false;
      }
      if (jam_mulai && jam_selesai && kelas && hari) {
        const checkConflict = (jadwalList, skipRowIndex) => {
          for (const j of jadwalList) {
            if (skipRowIndex !== undefined && j.rowIndex === skipRowIndex) continue;
            if (j.hari !== hari) continue;
            if (!j.jam_mulai || !j.jam_selesai) continue;
            const overlap = jam_mulai < j.jam_selesai && jam_selesai > j.jam_mulai;
            if (!overlap) continue;
            if (j.pengajar && pengajar && j.pengajar.trim().toLowerCase() === pengajar.toLowerCase()) {
              return `&#9888; Konflik Guru: <b>${pengajar}</b> sudah mengajar <b>${j.mapel}</b> di kelas <b>${j.kelas || '-'}</b> pada hari <b>${hari}</b> jam <b>${j.jam_mulai} - ${j.jam_selesai}</b>.`;
            }
            if (j.kelas && j.kelas.trim().toLowerCase() === kelas.toLowerCase()) {
              return `&#9888; Konflik Kelas: Kelas <b>${kelas}</b> sudah ada jadwal <b>${j.mapel}</b> (${j.pengajar || '-'}) pada hari <b>${hari}</b> jam <b>${j.jam_mulai} - ${j.jam_selesai}</b>.`;
            }
          }
          return null;
        };
        const conflict = checkConflict(jadwalDataCache, isEdit ? rowIndex : undefined);
        if (conflict) {
          Swal.showValidationMessage(conflict);
          return false;
        }
      }
      return { hari, mapel, pengajar, jam_mulai, jam_selesai, kelas };
    }
  }).then((result) => {
    if (!result.isConfirmed) return;
    const data = result.value;
    showLoading();
    const token = currentUser.token;
    const handler = {
      onSuccess: (res) => {
        hideLoading();
        if (res.success) {
          showAlert('success', res.message);
          loadJadwalData(document.getElementById('filterKelasJadwal')?.value || null);
        } else {
          showAlert('error', res.message);
        }
      },
      onFailure: (err) => {
        hideLoading();
        showAlert('error', 'Error server: ' + err);
      }
    };
    if (isEdit) {
      siakadRun
        .withSuccessHandler(handler.onSuccess)
        .withFailureHandler(handler.onFailure)
        .updateJadwal(token, rowIndex, data);
    } else {
      siakadRun
        .withSuccessHandler(handler.onSuccess)
        .withFailureHandler(handler.onFailure)
        .addJadwal(token, data);
    }
  });
}
function deleteSingleJadwal(rowIndex) {
  const item = jadwalDataCache.find(j => j.rowIndex === rowIndex);
  const label = item ? `${item.mapel} (${item.hari}, ${item.kelas || '-'})` : 'data ini';
  Swal.fire({
    title: 'Hapus Jadwal?',
    text: `Jadwal ${label} akan dihapus secara permanen.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#3d5478',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
    reverseButtons: true
  }).then((result) => {
    if (!result.isConfirmed) return;
    showLoading();
    const token = currentUser.token;
    siakadRun
      .withSuccessHandler(r => {
        hideLoading();
        if (r.success) {
          loadJadwalData(document.getElementById('filterKelasJadwal')?.value || null);
          showAlert('success', r.message);
        } else {
          showAlert('error', r.message);
        }
      })
      .withFailureHandler(err => {
        hideLoading();
        showAlert('error', 'Error server: ' + err);
      })
      .deleteMultipleJadwal(token, [rowIndex]);
  });
}
function triggerImportJadwal() {
  document.getElementById('fileInputJadwal').click();
}
async function handleFileImportJadwal(input) {
  const file = input.files[0];
  if (!file) return;
  showLoading();
  await ensureLib('xlsx');
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      if (jsonData.length === 0) {
        hideLoading();
        showAlert('error', 'File Excel kosong atau format salah.');
        input.value = '';
        return;
      }
      const firstRow = jsonData[0];
      const required = ['Hari', 'Nama Mapel', 'Pengajar', 'Jam Mulai', 'Jam Selesai', 'Kelas'];
      const hasAll = required.every(col => firstRow.hasOwnProperty(col));
      if (!hasAll) {
        hideLoading();
        showAlert('error', 'Format Excel salah! Pastikan header: Hari, Nama Mapel, Pengajar, Jam Mulai, Jam Selesai, Kelas.');
        input.value = '';
        return;
      }
      function parseJamExcel(jam) {
        if (typeof jam === 'number') {
          if (jam > 1) {
            const totalMinutes = Math.round(jam * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
          } else if (jam >= 0 && jam <= 1) {
            const totalMinutes = Math.round(jam * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
          } else {
            const hours = Math.floor(jam);
            const minutes = Math.round((jam - hours) * 60);
            return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
          }
        } else if (jam instanceof Date) {
          return jam.toTimeString().slice(0, 5);
        } else {
          let s = String(jam || '').trim().replace(/[^0-9:]/g, '');
          if (s.length === 4 && s.indexOf(':') === -1) s = s.slice(0,2) + ':' + s.slice(2);
          return /^\d{1,2}:\d{2}$/.test(s) ? s : '00:00';
        }
      }
const formatted = jsonData.map(row => {
  const jam_mulai  = parseJamExcel(row['Jam Mulai']);
  const jam_selesai = parseJamExcel(row['Jam Selesai']);
  return {
    hari: String(row['Hari'] || '').trim(),
    mapel: String(row['Nama Mapel'] || '').trim(),
    pengajar: String(row['Pengajar'] || '').trim(),
    jam_mulai: jam_mulai,
    jam_selesai: jam_selesai,
    kelas: String(row['Kelas'] || '').trim()
  };
}).filter(item => item.hari && item.mapel);
      if (formatted.length === 0) {
        hideLoading();
        showAlert('error', 'Tidak ada data valid. Pastikan kolom Hari dan Nama Mapel terisi.');
        input.value = '';
        return;
      }
      const combinedForCheck = [...(jadwalDataCache || [])];
      const importConflicts = [];
      const importVirtual = []; 
      for (let i = 0; i < formatted.length; i++) {
        const f = formatted[i];
        if (!f.jam_mulai || !f.jam_selesai || !f.kelas || !f.hari) { importVirtual.push(f); continue; }
        const allExisting = [...combinedForCheck, ...importVirtual];
        for (const j of allExisting) {
          if (j.hari !== f.hari) continue;
          if (!j.jam_mulai || !j.jam_selesai) continue;
          const overlap = f.jam_mulai < j.jam_selesai && f.jam_selesai > j.jam_mulai;
          if (!overlap) continue;
          if (j.pengajar && f.pengajar && j.pengajar.trim().toLowerCase() === f.pengajar.trim().toLowerCase()) {
            importConflicts.push(`Baris ${i+1}: Guru "${f.pengajar}" bentrok dengan "${j.mapel}" (${j.kelas||'-'}) hari ${f.hari} jam ${j.jam_mulai} - ${j.jam_selesai}`);
            break;
          }
          if (j.kelas && f.kelas && j.kelas.trim().toLowerCase() === f.kelas.trim().toLowerCase()) {
            importConflicts.push(`Baris ${i+1}: Kelas "${f.kelas}" bentrok dengan "${j.mapel}" (${j.pengajar||'-'}) hari ${f.hari} jam ${j.jam_mulai} - ${j.jam_selesai}`);
            break;
          }
        }
        importVirtual.push(f);
      }
      if (importConflicts.length > 0) {
        hideLoading();
        input.value = '';
        Swal.fire({
          title: 'Konflik Jadwal Ditemukan!',
          html: `<div style="text-align:left;font-size:13px;max-height:260px;overflow-y:auto;background:#fef2f2;border-radius:8px;padding:10px 14px;color:#b91c1c;line-height:1.7">
            ${importConflicts.map(c => `<div>&#9888; ${c}</div>`).join('')}
          </div><p style="margin-top:10px;font-size:12px;color:#5b7aaa">Perbaiki data Excel lalu coba import ulang.</p>`,
          icon: 'error',
          confirmButtonColor: '#4F46E5'
        });
        return;
      }
      siakadRun
        .withSuccessHandler(function(res) {
          hideLoading();
          input.value = '';
          if (res.success) {
            loadJadwalData(); 
            showAlert('success', `Berhasil import ${res.added} data jadwal.`);
          } else {
            showAlert('error', res.message);
          }
        })
        .withFailureHandler(function(err) {
          hideLoading();
          input.value = '';
          showAlert('error', 'Error server: ' + err);
        })
        .importJadwalBulk(formatted);
    } catch (err) {
      hideLoading();
      showAlert('error', 'Gagal membaca file: ' + err.message);
      input.value = '';
    }
  };
  reader.onerror = function() {
    hideLoading();
    showAlert('error', 'Gagal membaca file.');
    input.value = '';
  };
  reader.readAsArrayBuffer(file);
}
async function downloadTemplateJadwal() {
  await ensureLib('xlsx');
  if (typeof XLSX === 'undefined') {
    showAlert('error', 'Library Excel (SheetJS) belum termuat. Coba refresh halaman.');
    return;
  }
  try {
    // Kolom HARUS sesuai persis dengan yang dibaca handleFileImportJadwal
    const headers = ['Hari', 'Kelas', 'Nama Mapel', 'Pengajar', 'Jam Mulai', 'Jam Selesai'];
    const contoh = [
      ['Senin', 'X-A', 'Matematika', 'Bu Sari', '07:00', '07:45'],
      ['Senin', 'X-A', 'Bahasa Indonesia', 'Pak Budi', '07:45', '08:30'],
      ['Selasa', 'X-B', 'IPA', 'Bu Dewi', '07:00', '07:45'],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...contoh]);
    ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Jadwal');
    XLSX.writeFile(wb, 'Template_Import_JADWAL.xlsx');
    showAlert('success', 'Template jadwal berhasil diunduh!');
  } catch (e) {
    showAlert('error', 'Gagal membuat template: ' + e.message);
  }
}
async function downloadTemplateLibur() {
  await ensureLib('xlsx');
  if (typeof XLSX === 'undefined') {
    showAlert('error', 'Library Excel (SheetJS) belum termuat. Coba refresh halaman.');
    return;
  }
  try {
    // Kolom HARUS sesuai persis dengan yang dibaca handleFileImportLibur
    const headers = ['Tanggal', 'Keterangan'];
    const contoh = [
      ['2025-01-01', 'Tahun Baru Masehi'],
      ['2025-03-31', 'Hari Raya Idul Fitri'],
      ['2025-04-18', 'Wafat Isa Al Masih'],
      ['2025-05-01', 'Hari Buruh Internasional'],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...contoh]);
    ws['!cols'] = [{ wch: 14 }, { wch: 30 }];
    // Format kolom Tanggal sebagai teks agar tidak berubah jadi angka serial
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell) { cell.t = 's'; cell.z = '@'; }
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Template Hari Libur');
    XLSX.writeFile(wb, 'Template_Import_HariLibur.xlsx');
    showAlert('success', 'Template hari libur berhasil diunduh!');
  } catch (e) {
    showAlert('error', 'Gagal membuat template: ' + e.message);
  }
}
function mmLoadMapel() {
    const list = document.getElementById('mmMapelList');
    list.innerHTML = '<div class="text-center py-10 text-gray-400"><i class="fas fa-circle-notch fa-spin text-lg mb-3 block"></i><p class="text-sm">Memuat data mapel...</p></div>';
    document.getElementById('mmTotalMapel').textContent = '';
    siakadRun
        .withSuccessHandler(res => {
            if (!res.success) { mmShowListError(res.message); return; }
            mmAllMapel = res.data || [];
            mmRenderList(mmAllMapel);
            document.getElementById('mmTotalMapel').textContent = mmAllMapel.length;
        })
        .withFailureHandler(err => mmShowListError(String(err)))
        .getMapelMaster();
}
function mmShowListError(msg) {
    document.getElementById('mmMapelList').innerHTML =
        `<div class="text-center py-10 text-red-400"><i class="fas fa-exclamation-circle text-lg mb-2 block"></i><p class="text-sm">${msg}</p></div>`;
}
function mmFilterMapel() {
    const q = document.getElementById('mmSearchMapel').value.trim().toLowerCase();
    const filtered = q ? mmAllMapel.filter(m => m.nama.toLowerCase().includes(q)) : mmAllMapel;
    mmRenderList(filtered);
}
function mmRenderList(mapelList) {
    const list = document.getElementById('mmMapelList');
    if (!mapelList || mapelList.length === 0) {
        list.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-book-open text-2xl mb-3 block opacity-40"></i><p class="text-sm font-semibold">Belum ada mapel terdaftar</p><p class="text-xs mt-1">Tambahkan mapel baru menggunakan form di sebelah kiri.</p></div>';
        return;
    }
    list.innerHTML = mapelList.map((m, i) => {
        return `
        <div class="mapel-card" id="mapel-card-${m.rowIndex}">
          <div class="mapel-avatar"><i class="fas fa-book"></i></div>
          <div class="flex-1 min-w-0">
            <div id="mapel-label-${m.rowIndex}" class="font-bold text-sm text-gray-800">${m.nama}</div>
            <input id="mapel-input-${m.rowIndex}" type="text" value="${m.nama}"
              class="mapel-input-edit hidden"
              onkeydown="if(event.key==='Enter') mmSimpanEdit(${m.rowIndex}); if(event.key==='Escape') mmBatalEdit(${m.rowIndex});">
            <div class="text-[10px] text-gray-400 mt-0.5">Mapel ke-${i + 1}</div>
          </div>
          <div class="flex items-center gap-1.5" id="mapel-actions-${m.rowIndex}">
            <button onclick="mmMulaiEdit(${m.rowIndex})"
              class="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition text-sm" title="Edit">
              <i class="fas fa-pen text-xs"></i>
            </button>
            <button onclick="mmHapusMapel(${m.rowIndex}, '${m.nama.replace(/'/g, "\'")}')"
              class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition text-sm" title="Hapus">
              <i class="fas fa-trash text-xs"></i>
            </button>
          </div>
          <div class="hidden items-center gap-1.5" id="mapel-edit-actions-${m.rowIndex}">
            <button onclick="mmSimpanEdit(${m.rowIndex})"
              class="w-8 h-8 rounded-lg bg-[#1b2a4a] hover:bg-[#152238] text-white flex items-center justify-center transition" title= - impan">
              <i class="fas fa-check text-xs"></i>
            </button>
            <button onclick="mmBatalEdit(${m.rowIndex})"
              class="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition" title="Batal">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>`;
    }).join('');
}
function mmMulaiEdit(rowIndex) {
    document.getElementById('mapel-label-' + rowIndex).classList.add('hidden');
    document.getElementById('mapel-input-' + rowIndex).classList.remove('hidden');
    document.getElementById('mapel-actions-' + rowIndex).classList.add('hidden');
    document.getElementById('mapel-edit-actions-' + rowIndex).classList.remove('hidden');
    document.getElementById('mapel-edit-actions-' + rowIndex).classList.add('flex');
    const inp = document.getElementById('mapel-input-' + rowIndex);
    inp.focus(); inp.select();
}
function mmBatalEdit(rowIndex) {
    const m = mmAllMapel.find(x => x.rowIndex === rowIndex);
    if (m) document.getElementById('mapel-input-' + rowIndex).value = m.nama;
    document.getElementById('mapel-label-' + rowIndex).classList.remove('hidden');
    document.getElementById('mapel-input-' + rowIndex).classList.add('hidden');
    document.getElementById('mapel-actions-' + rowIndex).classList.remove('hidden');
    document.getElementById('mapel-edit-actions-' + rowIndex).classList.add('hidden');
    document.getElementById('mapel-edit-actions-' + rowIndex).classList.remove('flex');
}
function mmSimpanEdit(rowIndex) {
    const namaBaru = document.getElementById('mapel-input-' + rowIndex).value.trim();
    if (!namaBaru) { showAlert('error', 'Nama mapel tidak boleh kosong.'); return; }
    showLoading();
    siakadRun
        .withSuccessHandler(res => {
            hideLoading();
            if (res.success) {
                showAlert('success', res.message);
                mmLoadMapel();
                if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache();
            } else {
                showAlert('error', res.message);
                mmBatalEdit(rowIndex);
            }
        })
        .withFailureHandler(err => { hideLoading(); showAlert('error', String(err)); mmBatalEdit(rowIndex); })
        .updateMapel(rowIndex, namaBaru);
}
function mmHapusMapel(rowIndex, namaMapel) {
    Swal.fire({
        title: 'Hapus Mapel?',
        html: `<p class="text-gray-600 text-sm">Mapel <b>${namaMapel}</b> akan dihapus dari sistem.<br><span class="text-red-500 text-xs">Mapel tidak bisa dihapus jika masih diampu oleh guru.</span></p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then(r => {
        if (!r.isConfirmed) return;
        showLoading();
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                if (res.success) { showAlert('success', res.message); mmLoadMapel(); if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache(); }
                else Swal.fire('Gagal', res.message, 'error');
            })
            .withFailureHandler(err => { hideLoading(); showAlert('error', String(err)); })
            .deleteMapel(rowIndex, namaMapel);
    });
}
function mmTambahMapel() {
    const inp = document.getElementById('inputNamaMapel');
    const nama = inp.value.trim();
    if (!nama) { inp.focus(); showAlert('error', 'Masukkan nama mapel terlebih dahulu.'); return; }
    const btn = document.getElementById('btnTambahMapel');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
    siakadRun
        .withSuccessHandler(res => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Mapel';
            if (res.success) {
                showAlert('success', res.message);
                inp.value = '';
                mmLoadMapel();
                if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache();
            } else {
                showAlert('error', res.message);
            }
        })
        .withFailureHandler(err => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Mapel';
            showAlert('error', String(err));
        })
        .addMapel(nama);
}
