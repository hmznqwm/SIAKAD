// ===== PENDAFTARAN SISWA BARU (admin) =====
let pendaftarFilter = 'Menunggu';
let pendaftarSearch = '';
let pendaftarAllRows = [];
let pendaftarSelected = new Set();

function loadPendaftaranSiswa() {
    const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : (localStorage.getItem('siakad_token') || '');
    updateFilterButtons();
    showView('view-pendaftar');
    setActiveMenu('Pendaftaran Siswa');
    const tbody = document.getElementById('tbody-pendaftar');
    if (tbody) {
        tbody.innerHTML = '<tr class="pendaftar-mobile-state"><td colspan="10" class="p-10 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat...</td></tr>';
    }
    siakadRun
        .withSuccessHandler(function(res) {
            if (!res || !res.success) {
                if (tbody) tbody.innerHTML = `<tr class="pendaftar-mobile-state"><td colspan="10" class="p-8 text-center text-red-500">${(res && res.message) || 'Gagal memuat data.'}</td></tr>`;
                return;
            }
            const rows = res.data || [];
            pendaftarAllRows = rows;
            const countMenunggu = rows.filter(r => r.status === 'Menunggu').length;
            const stat = document.getElementById('statPendaftarMenunggu');
            if (stat) stat.textContent = countMenunggu;
            document.getElementById('statPendaftarDiterima').textContent = rows.filter(r => r.status === 'Diterima').length;
            document.getElementById('statPendaftarDitolak').textContent = rows.filter(r => r.status === 'Ditolak').length;
            document.getElementById('statPendaftarTotal').textContent = rows.length;
            const filtered = pendaftarAllRows.filter(r => {
                const okStatus = !pendaftarFilter || r.status === pendaftarFilter;
                const q = pendaftarSearch.trim().toLowerCase();
                const okSearch = !q || ['nama', 'nisn', 'email', 'no_hp', 'kelas_minat'].some(k => String(r[k] || '').toLowerCase().includes(q));
                return okStatus && okSearch;
            });
            if (filtered.length === 0) {
                if (tbody) tbody.innerHTML = '<tr class="pendaftar-mobile-state"><td colspan="10" class="p-14 text-center"><div class="flex flex-col items-center gap-3"><i class="fas fa-user-plus text-5xl text-gray-200"></i><p class="font-semibold text-sm text-gray-400">Belum ada data pendaftar</p><p class="text-xs text-gray-300">Bagikan link formulir ke calon siswa baru</p></div></td></tr>';
                return;
            }
            renderPendaftarRows(filtered);
        })
        .withFailureHandler(function(err) {
            if (tbody) tbody.innerHTML = `<tr class="pendaftar-mobile-state"><td colspan="10" class="p-8 text-center text-red-500"><i class="fas fa-exclamation-circle mr-1"></i>${(err && err.message) || 'Terjadi kesalahan server.'}</td></tr>`;
        })
        .getPendaftarList(token, pendaftarFilter);
}

function renderPendaftarRows(rows) {
    const tbody = document.getElementById('tbody-pendaftar');
    if (!tbody) return;
    const statusBadge = {
        'Menunggu': `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-200/50 whitespace-nowrap"><i class="fas fa-hourglass-half text-[9px] sm:text-[10px]"></i> Menunggu</span>`,
        'Diterima': `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-200/50 whitespace-nowrap"><i class="fas fa-check text-[9px] sm:text-[10px]"></i> Diterima</span>`,
        'Ditolak': `<span class="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-rose-200/50 whitespace-nowrap"><i class="fas fa-times text-[9px] sm:text-[10px]"></i> Ditolak</span>`
    };
    tbody.innerHTML = rows.map((r, idx) => {
        const isSelected = pendaftarSelected.has(String(r.id));
        return `
        <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-blue-50/20 transition-colors select-row-target mobile-pendaftar-card ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${r.id}" data-type="pendaftar">
            <td class="p-3 text-center hidden md:table-cell"><input type="checkbox" class="pf-check accent-[#1b2a4a] w-3.5 h-3.5 cursor-pointer" value="${r.id}" ${isSelected ? 'checked' : ''} onchange="pendaftarUpdateSelection()"></td>
            <td class="p-2 sm:p-3 text-gray-400 text-[10px] sm:text-xs font-semibold">${idx + 1}</td>
            <td class="p-2 sm:p-3 min-w-0">
                <div class="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div class="relative shrink-0 avatar-badge-slot">
                        <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${isSelected ? 'bg-[#1b2a4a] text-white' : 'bg-[#1b2a4a] text-white'}">
                            ${isSelected ? '<i class="fas fa-check text-[11px]"></i>' : escapeHtml(String(r.nama || '?').charAt(0).toUpperCase())}
                        </div>
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-gray-900 text-xs truncate">${escapeHtml(r.nama || '-')}</div>
                        <div class="text-[10px] text-gray-400 mt-0.5 truncate">${escapeHtml(r.nisn || '-')}</div>
                    </div>
                </div>
            </td>
            <td class="p-3 text-xs text-gray-600 font-medium hidden sm:table-cell">${escapeHtml(r.no_hp || '-')}</td>
            <td class="p-3 text-center hidden sm:table-cell">
                <span class="inline-block px-2 py-0.5 bg-[#e8ecf4] text-[#1b2a4a] rounded-md text-[10px] font-bold">${escapeHtml(r.kelas_minat || '-')}</span>
            </td>
            <td class="p-2 sm:p-3 text-center">${statusBadge[r.status] || r.status}</td>
            <td class="p-2 sm:p-3 text-center">
                <div class="flex flex-col sm:flex-row justify-center items-stretch gap-1 sm:gap-1.5">
                    <button onclick='viewPendaftar(${JSON.stringify(r)})' class="px-2 sm:px-2.5 py-1 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg text-[9px] sm:text-[10px] font-bold transition shadow-sm whitespace-nowrap">Detail</button>
                    ${r.status === 'Menunggu' ? `
                    <button onclick='bukaModalTerima(${JSON.stringify(r)})' class="px-2 sm:px-2.5 py-1 bg-[#1b2a4a] hover:bg-[#152238] text-white rounded-lg text-[9px] sm:text-[10px] font-bold transition shadow-sm whitespace-nowrap">Terima</button>
                    ` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
    pendaftarSyncSelection();
}


(function initPendaftarMobileLongPress(){
    if (window.__pendaftarLongPressReady) return;
    window.__pendaftarLongPressReady = true;
    let timer = null, sx = 0, sy = 0, active = null;
    const clear = () => { if (timer) clearTimeout(timer); timer = null; active = null; };
    document.addEventListener('pointerdown', function(e){
        if (window.innerWidth > 767) return;
        const card = e.target.closest?.('#tbody-pendaftar .mobile-pendaftar-card');
        if (!card || e.target.closest('button,a,input,select,textarea,label')) return;
        clear(); active = card; sx=e.clientX; sy=e.clientY;
        timer=setTimeout(()=>{
            if (!active) return;
            const id=String(active.dataset.id);
            if (pendaftarSelected.has(id)) pendaftarSelected.delete(id); else pendaftarSelected.add(id);
            renderPendaftarRows(pendaftarAllRows.filter(r => (!pendaftarFilter || r.status===pendaftarFilter) && (!pendaftarSearch.trim() || ['nama','nisn','email','no_hp','kelas_minat'].some(k=>String(r[k]||'').toLowerCase().includes(pendaftarSearch.trim().toLowerCase())))));
            pendaftarSyncSelection();
            navigator.vibrate?.(18);
            timer=null;
        },550);
    },{passive:true});
    document.addEventListener('pointermove',e=>{if(timer&&(Math.abs(e.clientX-sx)>8||Math.abs(e.clientY-sy)>8))clear();},{passive:true});
    document.addEventListener('pointerup',clear,{passive:true});
    document.addEventListener('pointercancel',clear,{passive:true});
    document.addEventListener('scroll',clear,{passive:true});
    document.addEventListener('contextmenu',e=>{if(window.innerWidth<=767&&e.target.closest?.('#tbody-pendaftar .mobile-pendaftar-card'))e.preventDefault();});
})();

function filterPendaftar(status) {
    pendaftarFilter = status;
    updateFilterButtons();
    loadPendaftaranSiswa();
}

function searchPendaftar(q) {
    pendaftarSearch = q;
    const filtered = pendaftarAllRows.filter(r => {
        const okStatus = !pendaftarFilter || r.status === pendaftarFilter;
        const s = pendaftarSearch.trim().toLowerCase();
        const okSearch = !s || ['nama', 'nisn', 'email', 'no_hp', 'kelas_minat'].some(k => String(r[k] || '').toLowerCase().includes(s));
        return okStatus && okSearch;
    });
    if (filtered.length === 0) {
        const tbody = document.getElementById('tbody-pendaftar');
        if (tbody) tbody.innerHTML = '<tr class="pendaftar-mobile-state"><td colspan="10" class="p-14 text-center"><div class="flex flex-col items-center gap-3"><i class="fas fa-search text-5xl text-gray-200"></i><p class="font-semibold text-sm text-gray-400">Pendaftar tidak ditemukan</p><p class="text-xs text-gray-300">Coba kata kunci lain</p></div></td></tr>';
        return;
    }
    renderPendaftarRows(filtered);
}

function updateFilterButtons() {
    const el = document.getElementById('pfDropdown');
    if (el) el.value = pendaftarFilter || '';
}

// ---------- Seleksi Massal ----------
function pendaftarUpdateSelection() {
    pendaftarSelected = new Set();
    document.querySelectorAll('.pf-check:checked').forEach(cb => pendaftarSelected.add(String(cb.value)));
    const bar = document.getElementById('pendaftarBulkBar');
    const count = document.getElementById('pendaftarSelectedCount');
    if (count) count.textContent = pendaftarSelected.size;
    if (bar) {
        if (pendaftarSelected.size === 0) {
            bar.classList.add('hidden');
            bar.classList.remove('flex');
        } else {
            bar.classList.remove('hidden');
            bar.classList.add('flex');
        }
    }
}

function pendaftarToggleAll(el) {
    document.querySelectorAll('.pf-check').forEach(cb => { cb.checked = el.checked; });
    pendaftarUpdateSelection();
}

function pendaftarClearSelection() {
    pendaftarSelected.clear();
    document.querySelectorAll('.pf-check').forEach(cb => { cb.checked = false; });
    const all = document.getElementById('pfCheckAll');
    if (all) all.checked = false;
    pendaftarUpdateSelection();
}

function pendaftarMasal(status) {
    if (pendaftarSelected.size === 0) { pendaftarUpdateSelection(); return; }
    const ids = Array.from(pendaftarSelected);
    const tipe = status === 'Diterima' ? 'Terima' : 'Tolak';
    Swal.fire({
        title: tipe + ' ' + ids.length + ' Pendaftar?',
        html: status === 'Diterima'
            ? 'Data terpilih akan dibuat sebagai <b>siswa baru</b> (akun login otomatis).'
            : 'Pendaftaran terpilih akan <b>ditolak</b>.',
        icon: status === 'Diterima' ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check"></i> Ya, ' + tipe,
        cancelButtonText: 'Batal',
        confirmButtonColor: status === 'Diterima' ? '#059669' : '#dc2626',
        reverseButtons: true
    }).then(result => {
        if (!result.isConfirmed) return;
        const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : (localStorage.getItem('siakad_token') || '');
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                showAlert(res && res.success ? 'success' : 'error', (res && res.message) || 'Gagal');
                if (res && res.success) { pendaftarClearSelection(); loadPendaftaranSiswa(); }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                showAlert('error', 'Gagal server: ' + (err && err.message));
            })
            .setStatusPendaftarMasal(token, ids, status);
    });
}

function pendaftarHapusMasal() {
    if (pendaftarSelected.size === 0) { pendaftarUpdateSelection(); return; }
    const ids = Array.from(pendaftarSelected);
    Swal.fire({
        title: 'Hapus ' + ids.length + ' Pendaftar?',
        html: 'Data pendaftaran terpilih akan <b>dihapus permanen</b>.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-trash"></i> Ya, Hapus',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#dc2626',
        reverseButtons: true
    }).then(result => {
        if (!result.isConfirmed) return;
        const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : (localStorage.getItem('siakad_token') || '');
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                showAlert(res && res.success ? 'success' : 'error', (res && res.message) || 'Gagal');
                if (res && res.success) { pendaftarClearSelection(); loadPendaftaranSiswa(); }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                showAlert('error', 'Gagal server: ' + (err && err.message));
            })
            .hapusPendaftarMasal(token, ids);
    });
}

// Dipakai oleh mode-pilih tekan-tahan (long press) di HP -- lihat ui-fixes.js
function togglePendaftarRow(id, checked) {
    const cb = document.querySelector('.pf-check[value="' + id + '"]');
    if (cb) cb.checked = checked;
    const tr = cb ? cb.closest('tr') : document.querySelector('.select-row-target[data-type="pendaftar"][data-id="' + id + '"]');
    if (tr) {
        if (checked) {
            tr.classList.add('bg-blue-50/60', 'selected-row', 'border-l-[#1b2a4a]');
            tr.classList.remove('border-l-transparent');
        } else {
            tr.classList.remove('bg-blue-50/60', 'selected-row', 'border-l-[#1b2a4a]');
            tr.classList.add('border-l-transparent');
        }
        const slot = tr.querySelector('.avatar-badge-slot');
        const avatar = slot ? slot.firstElementChild : null;
        if (avatar) {
            if (checked) {
                if (avatar.dataset.initial === undefined) avatar.dataset.initial = avatar.innerHTML.trim();
                avatar.innerHTML = '<i class="fas fa-check text-[11px]"></i>';
            } else {
                avatar.innerHTML = avatar.dataset.initial || '';
            }
        }
    }
    pendaftarUpdateSelection();
}

function pendaftarSyncSelection() {
    pendaftarSelected.forEach(id => {
        const cb = document.querySelector('.pf-check[value="' + id + '"]');
        if (cb) cb.checked = true;
    });
    pendaftarUpdateSelection();
}

function viewPendaftar(p) {
    const statusBadge = {
        'Menunggu': '<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Menunggu</span>',
        'Diterima': '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Diterima</span>',
        'Ditolak': '<span class="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Ditolak</span>'
    };
    const row = (lbl, val) => `
        <div class="flex items-center justify-between gap-3 px-3 py-1.5">
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">${lbl}</span>
            <span class="text-xs font-bold text-gray-800 text-right break-words min-w-0">${val || '-'}</span>
        </div>`;
    const section = (icon, title, bodyRows) => `
        <div class="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div class="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                <i class="fas ${icon} text-[#1b2a4a] text-[10px]"></i>
                <span class="text-[10px] font-extrabold text-[#152238] uppercase tracking-wider">${title}</span>
            </div>
            <div class="divide-y divide-gray-50">${bodyRows}</div>
        </div>`;
    showModal(`
            <div class="px-4 py-3 bg-gradient-to-r from-[#1b2a4a] to-[#152238] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-white/20 shrink-0"><i class="fas fa-user-graduate text-white text-sm"></i></div>
                    <div class="min-w-0">
                        <h3 class="text-sm font-extrabold text-white truncate">${p.nama}</h3>
                        <p class="text-[10px] text-[#a0b0cc] flex items-center gap-1.5">Daftar ${p.created_at || '-'} ${statusBadge[p.status] || p.status}</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
                ${section('fa-id-card', 'Data Pendaftaran', `
                    ${row('NISN', p.nisn)}
                    ${row('Jurusan Minat', p.kelas_minat)}
                    ${row('Kelas Ditentukan', p.assigned_kelas ? `<span class="font-bold text-emerald-700">${p.assigned_kelas}</span>` : '-')}
                `)}
                ${section('fa-user', 'Data Pribadi', `
                    ${row('Jenis Kelamin', p.jenis_kelamin)}
                    ${row('Tempat / Tgl Lahir', (p.tempat_lahir || '') + (p.tanggal_lahir ? ' / ' + p.tanggal_lahir : ''))}
                    ${row('Agama', p.agama)}
                `)}
                ${section('fa-users', 'Orang Tua & Kontak', `
                    ${row('Nama Ayah', p.nama_ayah)}
                    ${row('Nama Ibu', p.nama_ibu)}
                    ${row('No. HP', p.no_hp)}
                    ${row('Email', p.email)}
                `)}
                ${section('fa-map-marker-alt', 'Alamat', `
                    <div class="px-3 py-2 text-xs text-gray-700 leading-relaxed font-medium break-words whitespace-pre-line">${p.alamat || '-'}</div>
                `)}
            </div>
            ${p.berkas ? `
            <div class="px-3 pb-3">
                <div class="p-2 bg-[#e8ecf4]/60 border border-[#d0d8e8] rounded-xl flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#1b2a4a] shrink-0 shadow-sm text-xs"><i class="fas fa-paperclip"></i></div>
                        <p class="text-[11px] font-bold text-[#152238] truncate">${String(p.berkas).split('/').pop()}</p>
                    </div>
                    <a href="${p.berkas}" target="_blank" class="inline-flex items-center gap-1 bg-[#1b2a4a] hover:bg-[#152238] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition shrink-0"><i class="fas fa-download text-[9px]"></i> Lihat</a>
                </div>
            </div>` : ''}
            ${p.status === 'Menunggu' ? `
            <div class="px-4 pb-3 pt-2 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end shrink-0">
                <button onclick="closeModal(); setStatusPendaftar(${p.id}, 'Ditolak', '${String(p.nama).replace(/'/g, "\\'")}')" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 py-2 rounded-lg transition text-xs"><i class="fas fa-times mr-1"></i> Tolak</button>
                <button onclick="closeModal(); bukaModalTerima(${JSON.stringify(p).replace(/"/g, '&quot;')})" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg transition text-xs"><i class="fas fa-check mr-1"></i> Terima & Tentukan Kelas</button>
            </div>` : ''}
    `, 'max-w-2xl');
}

function setStatusPendaftar(id, status, nama) {
    const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : (localStorage.getItem('siakad_token') || '');
    Swal.fire({
        title: status === 'Diterima' ? 'Terima Pendaftar?' : 'Tolak Pendaftar?',
        html: status === 'Diterima'
            ? `Data <b>${nama}</b> akan dibuat sebagai <b>siswa baru</b> (akun login otomatis).`
            : `Pendaftaran <b>${nama}</b> akan ditolak.`,
        icon: status === 'Diterima' ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonText: status === 'Diterima' ? '<i class="fas fa-check"></i> Ya, Terima' : '<i class="fas fa-times"></i> Ya, Tolak',
        cancelButtonText: 'Batal',
        confirmButtonColor: status === 'Diterima' ? '#059669' : '#dc2626',
        reverseButtons: true
    }).then(result => {
        if (!result.isConfirmed) return;
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                if (res && res.success) {
                    showAlert('success', res.message);
                    loadPendaftaranSiswa();
                } else {
                    showAlert('error', (res && res.message) || 'Gagal');
                }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                showAlert('error', 'Gagal server: ' + (err && err.message));
            })
            .setStatusPendaftar(token, id, status);
    });
}

function hapusPendaftar(id, nama) {
    const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : (localStorage.getItem('siakad_token') || '');
    Swal.fire({
        title: 'Hapus Data Pendaftar?',
        html: `Data pendaftaran <b>${nama}</b> akan dihapus permanen.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-trash"></i> Ya, Hapus',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#dc2626',
        reverseButtons: true
    }).then(result => {
        if (!result.isConfirmed) return;
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                showAlert(res && res.success ? 'success' : 'error', (res && res.message) || 'Gagal');
                if (res && res.success) loadPendaftaranSiswa();
            })
            .withFailureHandler(function(err) {
                hideLoading();
                showAlert('error', 'Gagal server: ' + (err && err.message));
            })
            .hapusPendaftar(token, id);
    });
}

// ─── MODAL TENTUKAN KELAS & TERIMA PENDAFTAR ───
function bukaModalTerima(p) {
    fetch('api.php?action=getKelasList')
        .then(r => r.json())
        .then(json => {
            const kelasList = (json && Array.isArray(json.data)) ? json.data.map(k => k.nama || k) : [];
            const opts = kelasList.map(k =>
                `<option value="${k}" ${p.assigned_kelas === k ? 'selected' : ''}>${k}</option>`
            ).join('');
            showModal(`
                <div class="px-6 py-5 bg-gradient-to-r from-[#1b2a4a] to-[#152238] flex justify-between items-center">
                    <div>
                        <h3 class="text-base font-extrabold text-white">Tentukan Kelas</h3>
                        <p class="text-[11px] text-[#a0b0cc]">${p.nama}</p>
                    </div>
                    <button onclick="closeModal()" class="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6">
                    <div class="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                        <i class="fas fa-info-circle text-amber-500 shrink-0"></i>
                        <div>
                            <p class="text-xs font-bold text-amber-800">Jurusan Minat Calon Siswa</p>
                            <p class="text-sm font-extrabold text-amber-900 mt-0.5">${p.kelas_minat || '-'}</p>
                        </div>
                    </div>
                    <div class="mb-5">
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <i class="fas fa-door-open mr-1 text-[#1b2a4a]"></i>Tempatkan ke Kelas
                        </label>
                        <div class="relative">
                            <select id="modalKelasSelect" class="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-gray-200 focus:border-[#1b2a4a] focus:outline-none text-sm font-bold text-gray-800 bg-white appearance-none transition">
                                <option value="">— Pilih Kelas —</option>
                                ${opts}
                            </select>
                            <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                        </div>
                        ${kelasList.length === 0
                            ? '<p class="text-[11px] text-rose-500 mt-2"><i class="fas fa-exclamation-triangle mr-1"></i>Belum ada kelas. Buat dulu di menu <b>Manajemen Kelas</b>.</p>'
                            : '<p class="text-[11px] text-gray-400 mt-2">Kelas dikelola di menu <b>Manajemen Kelas</b>. Pilih yang sesuai jurusan minat siswa.</p>'
                        }
                    </div>
                    <div class="flex gap-3 pt-1">
                        <button onclick="closeModal()" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition text-sm">Batal</button>
                        <button onclick="konfirmasiTerima(${p.id}, '${String(p.nama).replace(/'/g, "\\'")}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm">
                            <i class="fas fa-check mr-1"></i> Terima & Masukkan
                        </button>
                    </div>
                </div>`, 'max-w-md');
        })
        .catch(() => { showAlert('error', 'Gagal memuat daftar kelas. Coba lagi.'); });
}

function konfirmasiTerima(id, nama) {
    const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : (localStorage.getItem('siakad_token') || '');
    const kelas = (document.getElementById('modalKelasSelect') || {}).value || '';
    if (!kelas) {
        showAlert('error', 'Pilih kelas terlebih dahulu sebelum menerima pendaftar.');
        return;
    }
    showLoading();
    siakadRun
        .withSuccessHandler(function(res1) {
            if (!res1 || !res1.success) {
                hideLoading();
                showAlert('error', (res1 && res1.message) || 'Gagal menyimpan kelas.');
                return;
            }
            siakadRun
                .withSuccessHandler(function(res2) {
                    hideLoading();
                    closeModal();
                    if (res2 && res2.success) {
                        showAlert('success', `${nama} diterima dan ditempatkan di kelas <b>${kelas}</b>.`);
                        loadPendaftaranSiswa();
                    } else {
                        showAlert('error', (res2 && res2.message) || 'Gagal menerima pendaftar.');
                    }
                })
                .withFailureHandler(function(err) { hideLoading(); showAlert('error', 'Gagal server: ' + (err && err.message)); })
                .setStatusPendaftar(token, id, 'Diterima');
        })
        .withFailureHandler(function(err) { hideLoading(); showAlert('error', 'Gagal server: ' + (err && err.message)); })
        .assignKelasPendaftar(token, id, kelas);
}