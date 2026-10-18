// core/script/table-state.js
// State & helper tabel: tableState, set ID terpilih per-entitas, peta bulk-select,
// fungsi toggle/bulk-delete, filter & pagination tabel (processTableData dkk).
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

const tableState = {
        siswa: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
        guru: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '', roleFilter: '' },
        guruprofil: { fullData: [], filtered: [], limit: 10, page: 1, search: '' },
        libur: { fullData: [], filtered: [], limit: 10, page: 1, search: '' },
        monitoring: { fullData: [], filtered: [], limit: 10, page: 1, search: '', statusFilter: '', classFilter: '', mapelFilter: '' },
        rekap: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
        rekapGuru: { fullData: [], filtered: [], limit: 10, page: 1, search: '', classFilter: '' },
        alumni: { fullData: [], filtered: [], limit: 10, page: 1, search: '', tahunFilter: '' },
        prestasi: { fullData: [], filtered: [], limit: 10, page: 1, search: '' },
        inventaris: { fullData: [], filtered: [], limit: 10, page: 1, search: '' }
    };
const selectedSiswaIds = new Set();
const selectedGuruIds = new Set();
const selectedProfilGuruIds = new Set();
const selectedAlumniIds = new Set();
const selectedPrestasiIds = new Set();
const selectedInventarisIds = new Set();
const selectedNilaiIds = new Set();
const bulkSelectSetMap = {
    siswa: () => selectedSiswaIds,
    guru: () => selectedGuruIds,
    guruprofil: () => selectedProfilGuruIds,
    alumni: () => selectedAlumniIds,
    prestasi: () => selectedPrestasiIds,
    inventaris: () => selectedInventarisIds,
    nilai: () => selectedNilaiIds
};
const bulkDeleteBtnIdMap = {
    siswa: 'btnBulkDeleteSiswa',
    guru: 'btnBulkDeleteGuru',
    guruprofil: 'btnBulkDeleteProfilGuru',
    alumni: 'btnBulkDeleteAlumni',
    prestasi: 'btnBulkDeletePrestasi',
    inventaris: 'btnBulkDeleteInventaris',
    nilai: 'btnBulkDeleteNilai'
};
const bulkRowClassMap = {
    siswa:      '.chk-siswa',
    guru:       '.chk-guru',
    guruprofil: '.chk-guruprofil',
    alumni:     '.chk-alumni',
    prestasi:   '.chk-prestasi',
    inventaris: '.chk-inventaris',
    nilai:      '.nilai-cb'
};
const bulkHeaderIdMap = {
    siswa:      'checkAllSiswa',
    guru:       'checkAllGuru',
    guruprofil: 'checkAllProfilGuru',
    alumni:     'checkAllAlumni',
    prestasi:   'checkAllPrestasi',
    inventaris: 'checkAllInventaris',
    nilai:      'checkAllNilai'
};
function updateBulkDeleteUI(type) {
    const set = bulkSelectSetMap[type] ? bulkSelectSetMap[type]() : new Set();
    const btn = document.getElementById(bulkDeleteBtnIdMap[type]);
    if (!btn) return;
    const countEl = btn.querySelector('.bulk-count');
    if (set.size > 0) {
        if (countEl) countEl.textContent = set.size;
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}
function updateSelectAllHeaderState(type) {
    const selector = bulkRowClassMap[type];
    const headerId = bulkHeaderIdMap[type];
    const rows = document.querySelectorAll(selector);
    const header = document.getElementById(headerId);
    if (!header) return;
    header.checked = rows.length > 0 && Array.from(rows).every(cb => cb.checked);
    updateBulkDeleteUI(type);
}
function updateRowHighlight(type, id, checked) {
    const selector = (bulkRowClassMap[type] || '') + `[value="${id}"]`;
    const chk = document.querySelector(selector);
    if (chk) {
        chk.checked = checked; // Sync checked state
        const tr = chk.closest('tr');
        if (tr) {
            if (checked) {
                tr.classList.add('bg-blue-50/60', 'selected-row', 'border-l-[#1b2a4a]');
                tr.classList.remove('border-l-transparent');
            } else {
                tr.classList.remove('bg-blue-50/60', 'selected-row', 'border-l-[#1b2a4a]');
                tr.classList.add('border-l-transparent');
            }
            // Avatar baris berubah jadi indikator biru bertanda centang (gaya Gmail)
            // saat dipilih -- terutama membantu di HP, karena kolom checkbox
            // disembunyikan pada breakpoint mobile.
            const slot = tr.querySelector('.avatar-badge-slot');
            const avatar = slot ? slot.firstElementChild : null;
            if (avatar) {
                if (checked) {
                    // Simpan isi asli avatar (huruf inisial ATAU ikon FontAwesome) sebagai
                    // innerHTML, bukan textContent -- supaya avatar berbasis ikon (mis. trofi
                    // prestasi, kotak inventaris) juga bisa dikembalikan dengan benar.
                    if (avatar.dataset.initial === undefined) {
                        avatar.dataset.initial = avatar.innerHTML.trim();
                        avatar.dataset.origClass = avatar.className;
                    }
                    avatar.classList.remove('bg-[#d0d8e8]', 'text-[#1b2a4a]', 'bg-amber-100', 'text-amber-600');
                    avatar.classList.add('bg-[#1b2a4a]', 'text-white');
                    avatar.innerHTML = '<i class="fas fa-check text-[11px]"></i>';
                } else {
                    avatar.classList.remove('bg-[#1b2a4a]', 'text-white');
                    if (avatar.dataset.origClass) {
                        avatar.classList.add(...avatar.dataset.origClass.split(' '));
                    } else {
                        avatar.classList.add('bg-[#d0d8e8]', 'text-[#1b2a4a]');
                    }
                    avatar.innerHTML = avatar.dataset.initial || '';
                }
            }
        }
    }
}
function toggleSelectAllSiswa(source) {
    document.querySelectorAll('.chk-siswa').forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) {
            selectedSiswaIds.add(String(cb.value));
            updateRowHighlight('siswa', cb.value, true);
        } else {
            selectedSiswaIds.delete(String(cb.value));
            updateRowHighlight('siswa', cb.value, false);
        }
    });
    updateBulkDeleteUI('siswa');
}
function toggleSiswaRow(nisn, checked) {
    if (checked) selectedSiswaIds.add(String(nisn));
    else selectedSiswaIds.delete(String(nisn));
    updateRowHighlight('siswa', nisn, checked);
    updateSelectAllHeaderState('siswa');
}
function toggleSelectAllGuru(source) {
    document.querySelectorAll('.chk-guru').forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) {
            selectedGuruIds.add(String(cb.value));
            updateRowHighlight('guru', cb.value, true);
        } else {
            selectedGuruIds.delete(String(cb.value));
            updateRowHighlight('guru', cb.value, false);
        }
    });
    updateBulkDeleteUI('guru');
}
function toggleGuruRow(username, checked) {
    if (checked) selectedGuruIds.add(String(username));
    else selectedGuruIds.delete(String(username));
    updateRowHighlight('guru', username, checked);
    updateSelectAllHeaderState('guru');
}
function toggleSelectAllNilai(source) {
    document.querySelectorAll('.nilai-cb').forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) {
            selectedNilaiIds.add(String(cb.value));
            updateRowHighlight('nilai', cb.value, true);
        } else {
            selectedNilaiIds.delete(String(cb.value));
            updateRowHighlight('nilai', cb.value, false);
        }
    });
    updateSelectAllHeaderState('nilai');
    if (typeof updateBulkNilaiBtn === 'function') updateBulkNilaiBtn();
}
function toggleNilaiRow(id, checked) {
    if (checked) selectedNilaiIds.add(String(id));
    else selectedNilaiIds.delete(String(id));
    updateRowHighlight('nilai', id, checked);
    updateSelectAllHeaderState('nilai');
    if (typeof updateBulkNilaiBtn === 'function') updateBulkNilaiBtn();
}
function toggleSelectAllProfilGuru(source) {
    document.querySelectorAll('.chk-guruprofil').forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) selectedProfilGuruIds.add(String(cb.value));
        else selectedProfilGuruIds.delete(String(cb.value));
    });
    updateBulkDeleteUI('guruprofil');
}
function toggleProfilGuruRow(nip, checked) {
    if (checked) selectedProfilGuruIds.add(String(nip));
    else selectedProfilGuruIds.delete(String(nip));
    updateRowHighlight('guruprofil', nip, checked);
    updateSelectAllHeaderState('guruprofil');
}
function toggleSelectAllAlumni(source) {
    document.querySelectorAll('.chk-alumni').forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) {
            selectedAlumniIds.add(String(cb.value));
            updateRowHighlight('alumni', cb.value, true);
        } else {
            selectedAlumniIds.delete(String(cb.value));
            updateRowHighlight('alumni', cb.value, false);
        }
    });
    updateBulkDeleteUI('alumni');
}
function toggleAlumniRow(nisn, checked) {
    if (checked) selectedAlumniIds.add(String(nisn));
    else selectedAlumniIds.delete(String(nisn));
    updateRowHighlight('alumni', nisn, checked);
    updateSelectAllHeaderState('alumni');
}
function toggleSelectAllPrestasi(source) {
    document.querySelectorAll('.chk-prestasi').forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) selectedPrestasiIds.add(String(cb.value));
        else selectedPrestasiIds.delete(String(cb.value));
    });
    updateBulkDeleteUI('prestasi');
}
function togglePrestasiRow(id, checked) {
    if (checked) selectedPrestasiIds.add(String(id));
    else selectedPrestasiIds.delete(String(id));
    updateRowHighlight('prestasi', id, checked);
    updateSelectAllHeaderState('prestasi');
}
function toggleSelectAllInventaris(source) {
    document.querySelectorAll('.chk-inventaris').forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) selectedInventarisIds.add(String(cb.value));
        else selectedInventarisIds.delete(String(cb.value));
    });
    updateBulkDeleteUI('inventaris');
}
function toggleInventarisRow(kode, checked) {
    if (checked) selectedInventarisIds.add(String(kode));
    else selectedInventarisIds.delete(String(kode));
    updateRowHighlight('inventaris', kode, checked);
    updateSelectAllHeaderState('inventaris');
}
function bulkDeleteSiswa() {
    const ids = Array.from(selectedSiswaIds);
    if (ids.length === 0) return;
    Swal.fire({
        title: 'Hapus Data Massal?',
        text: `${ids.length} data siswa yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: `Ya, Hapus ${ids.length} Data!`,
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
                    selectedSiswaIds.clear();
                    tableState.siswa.fullData = [];
                    loadDataSiswa();
                    Swal.fire('Terhapus!', r.message, 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            })
            .deleteMultipleSiswa(token, ids);
    });
}
function bulkDeleteGuru() {
    const ids = Array.from(selectedGuruIds);
    if (ids.length === 0) return;
    Swal.fire({
        title: 'Hapus Akun Massal?',
        text: `${ids.length} akun guru yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: `Ya, Hapus ${ids.length} Akun!`,
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
                    selectedGuruIds.clear();
                    tableState.guru.fullData = [];
                    loadDataGuru();
                    Swal.fire('Terhapus!', r.message, 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            })
            .deleteMultipleGuru(token, ids);
    });
}
function bulkDeleteProfilGuru() {
    const ids = Array.from(selectedProfilGuruIds);
    if (ids.length === 0) return;
    Swal.fire({
        title: 'Hapus Data Massal?',
        text: `${ids.length} data guru yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: `Ya, Hapus ${ids.length} Data!`,
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
                    selectedProfilGuruIds.clear();
                    tableState.guruprofil.fullData = [];
                    loadDataProfilGuru();
                    if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache();
                    Swal.fire('Terhapus!', r.message, 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            })
            .deleteMultipleProfilGuru(token, ids);
    });
}
function bulkDeleteAlumni() {
    const ids = Array.from(selectedAlumniIds);
    if (ids.length === 0) return;
    Swal.fire({
        title: 'Hapus Data Massal?',
        text: `${ids.length} data alumni yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: `Ya, Hapus ${ids.length} Data!`,
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
                    selectedAlumniIds.clear();
                    tableState.alumni.fullData = [];
                    loadDataAlumni();
                    Swal.fire('Terhapus!', r.message, 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            })
            .deleteMultipleAlumni(token, ids);
    });
}
function bulkDeletePrestasi() {
    const ids = Array.from(selectedPrestasiIds);
    if (ids.length === 0) return;
    Swal.fire({
        title: 'Hapus Data Massal?',
        text: `${ids.length} data prestasi yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: `Ya, Hapus ${ids.length} Data!`,
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
                    selectedPrestasiIds.clear();
                    tableState.prestasi.fullData = [];
                    loadDataPrestasi();
                    Swal.fire('Terhapus!', r.message, 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            })
            .deleteMultiplePrestasi(token, ids);
    });
}
function bulkDeleteInventaris() {
    const ids = Array.from(selectedInventarisIds);
    if (ids.length === 0) return;
    Swal.fire({
        title: 'Hapus Data Massal?',
        text: `${ids.length} data inventaris yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: `Ya, Hapus ${ids.length} Data!`,
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
                    selectedInventarisIds.clear();
                    tableState.inventaris.fullData = [];
                    loadDataInventaris();
                    Swal.fire('Terhapus!', r.message, 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            })
            .deleteMultipleInventaris(token, ids);
    });
}
function bulkDeleteNilai() {
    const ids = Array.from(selectedNilaiIds);
    if (ids.length === 0) return;
    Swal.fire({
        title: 'Hapus Data Massal?',
        text: `${ids.length} data nilai yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#3d5478',
        confirmButtonText: `Ya, Hapus ${ids.length} Data!`,
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (!result.isConfirmed) return;
        showLoading();
        const token = currentUser ? currentUser.token : '';
        siakadRun
            .withSuccessHandler(r => {
                hideLoading();
                if (r.success) {
                    selectedNilaiIds.clear();
                    loadDataNilai();
                    Swal.fire('Terhapus!', r.message, 'success');
                } else {
                    Swal.fire('Gagal!', r.message, 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
            })
            .deleteMultipleNilai(token, ids);
    });
}
function handleTableSearch(type, query) {
        tableState[type].search = query.toLowerCase();
        tableState[type].page = 1; 
        processTableData(type);
    }
    function handleTableClassFilter(type, value) {
        if (tableState[type]) {
            tableState[type].classFilter = value;
            tableState[type].page = 1; 
            processTableData(type);
        }
    }
function handleTableStatusFilter(type, status) {
        if (tableState[type]) {
            tableState[type].statusFilter = status;
            tableState[type].page = 1; 
            processTableData(type);
        }
    }
    function handleTableMapelFilter(type, value) {
        if (tableState[type]) {
            tableState[type].mapelFilter = value;
            tableState[type].page = 1;
            processTableData(type);
        }
    }
    function handleTableRoleFilter(type, value) {
        if (tableState[type]) {
            tableState[type].roleFilter = value;
            tableState[type].page = 1;
            processTableData(type);
        }
    }
    function handleAlumniYearFilter(value) {
        tableState.alumni.tahunFilter = value;
        tableState.alumni.page = 1; 
        processTableData('alumni');
    }
    function handleTableLimit(type, limit) {
        tableState[type].limit = limit === 'all' ? Infinity : parseInt(limit);
        tableState[type].page = 1; 
        processTableData(type);
    }
    function changePage(type, direction) {
        const state = tableState[type];
        const maxPage = !isFinite(state.limit) ? (state.filtered.length > 0 ? 1 : 0) : Math.ceil(state.filtered.length / state.limit);
        const newPage = state.page + direction;
        if (newPage >= 1 && newPage <= maxPage) {
            state.page = newPage;
            processTableData(type);
        }
    }

// Aksi kartu mobile untuk Data Inventaris & Data Prestasi.
// Tekan lama kartu (bukan scroll) untuk membuka menu Edit/Hapus.
(function initMobileMasterLongPress() {
    if (window.__masterLongPressReady) return;
    window.__masterLongPressReady = true;
    let timer = null;
    let startX = 0;
    let startY = 0;
    let activeCard = null;

    function clearPress() {
        if (timer) { clearTimeout(timer); timer = null; }
        activeCard = null;
    }

    function getItem(card) {
        const type = card?.dataset?.type;
        const id = card?.dataset?.id;
        if (!type || id == null) return null;
        const state = tableState[type];
        if (!state) return null;
        return state.fullData.find(item => String(type === 'inventaris' ? item.kodeBarang : item.id) === String(id)) || null;
    }

    function showMobileMasterActions(card) {
        const type = card?.dataset?.type;
        const item = getItem(card);
        if (!item || !['inventaris', 'prestasi'].includes(type)) return;
        if (!['admin', 'pencatat'].includes(currentUser?.role)) return;

        const popupId = 'mobileMasterActionPopup';
        const existing = document.getElementById(popupId);
        if (existing) existing.remove();

        const rect = card.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.id = popupId;
        popup.className = 'mobile-master-action-popup';
        popup.innerHTML = `
            <button type="button" data-action="detail" aria-label="Lihat detail" title="Lihat detail"><i class="fas fa-eye"></i></button>
            <button type="button" data-action="edit" aria-label="Edit" title="Edit"><i class="fas fa-pen"></i></button>
            <button type="button" data-action="delete" aria-label="Hapus" title="Hapus"><i class="fas fa-trash"></i></button>
            <button type="button" data-action="cancel" aria-label="Batal" title="Batal"><i class="fas fa-times"></i></button>`;
        document.body.appendChild(popup);

        const width = popup.offsetWidth || 176;
        const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + (rect.width - width) / 2));
        const top = Math.max(8, rect.top - (popup.offsetHeight || 48) - 7);
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.classList.add('is-visible');

        const close = () => { popup.classList.remove('is-visible'); setTimeout(() => popup.remove(), 120); };
        popup.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const action = button.dataset.action;
            close();
            if (action === 'edit') {
                if (type === 'inventaris') editInventaris(item); else editPrestasi(item);
            } else if (action === 'delete') {
                if (type === 'inventaris') deleteInventarisConfirm(item.kodeBarang, item.namaBarang || 'Barang inventaris');
                else deletePrestasiConfirm(item.id, item.namaSiswa || 'Data prestasi');
            } else if (action === 'detail') {
                showMobileMasterDetail(type, item);
            }
        });
        setTimeout(() => document.addEventListener('pointerdown', function outside(e) {
            if (!popup.contains(e.target)) { close(); document.removeEventListener('pointerdown', outside); }
        }, { once: true }), 0);
    }

    function showMobileMasterDetail(type, item) {
        const rows = type === 'inventaris' ? [
            ['Nama Barang', item.namaBarang], ['Jumlah', `${item.jumlah || 0} ${item.satuan || ''}`],
            ['Lokasi', item.lokasi || '-'], ['Kode Barang', item.kodeBarang || '-'],
            ['Kategori', item.kategori || '-'], ['Kondisi', item.kondisi || '-']
        ] : [
            ['Nama', item.namaSiswa || '-'], ['Lomba', item.namaKegiatan || '-'], ['Tingkat', item.tingkat || '-'],
            ['Peringkat', item.peringkat || '-'], ['Tahun', item.tahun || '-']
        ];
        Swal.fire({
            html: `<div class="mobile-master-detail"><div class="mobile-master-detail-grid">${rows.map(([label, value]) => `<div><span>${escapeHtml(String(label))}</span><strong>${escapeHtml(String(value ?? '-'))}</strong></div>`).join('')}</div></div>`,
            showConfirmButton: false, showCloseButton: true, width: 330, padding: '14px',
            customClass: { popup: 'mobile-master-detail-popup' }
        });
    }

    document.addEventListener('pointerdown', function (event) {
        if (window.innerWidth > 767) return;
        const card = event.target.closest?.('tr.mobile-action-card');
        if (!card) return;
        if (event.target.closest('button, input, select, a, textarea, label')) return;
        clearPress();
        activeCard = card;
        startX = event.clientX;
        startY = event.clientY;
        timer = setTimeout(() => {
            if (activeCard === card) {
                activeCard.classList.add('mobile-longpress-active');
                showMobileMasterActions(card);
                timer = null;
            }
        }, 550);
    }, { passive: true });

    document.addEventListener('pointermove', function (event) {
        if (!timer || !activeCard) return;
        if (Math.abs(event.clientX - startX) > 8 || Math.abs(event.clientY - startY) > 8) clearPress();
    }, { passive: true });
    document.addEventListener('pointerup', clearPress, { passive: true });
    document.addEventListener('pointercancel', clearPress, { passive: true });
    document.addEventListener('scroll', clearPress, { passive: true });
    document.addEventListener('contextmenu', function (event) {
        if (window.innerWidth <= 767 && event.target.closest?.('tr.mobile-action-card')) event.preventDefault();
    });
})();

function processTableData(type) {
        const state = tableState[type];
        let result = [...state.fullData];
        if ((type === 'siswa' || type === 'monitoring') && state.classFilter) {
            result = result.filter(item => item.kelas === state.classFilter);
        }
        if (type === 'guru' && state.roleFilter) {
            result = result.filter(item => item.role === state.roleFilter);
        }
        if (type === 'monitoring' && state.statusFilter) {
            result = result.filter(item => item.status === state.statusFilter);
        }
        if (type === 'monitoring' && state.mapelFilter) {
            result = result.filter(item => String(item.mapel || '').trim() === state.mapelFilter);
        }
        if (type === 'alumni' && state.tahunFilter) {
            result = result.filter(item => String(item.tahunLulus) === String(state.tahunFilter));
        }
        if (state.search) {
            const query = state.search.toLowerCase();
            result = result.filter(item => 
                Object.values(item).some(val => 
                    String(val).toLowerCase().includes(query)
                )
            );
        }
        state.filtered = result;
        const total = state.filtered.length;
        const isShowAll = !isFinite(state.limit);
        const totalPages = isShowAll ? (total > 0 ? 1 : 0) : Math.ceil(total / state.limit);
        if (state.page > totalPages && totalPages > 0) state.page = totalPages;
        if (total === 0) state.page = 1;
        const startIdx = isShowAll ? 0 : (state.page - 1) * state.limit;
        const endIdx = isShowAll ? total : startIdx + state.limit;
        const pagedData = state.filtered.slice(startIdx, endIdx);
        if (type === 'siswa') renderSiswaRows(pagedData, startIdx);
        else if (type === 'guru') renderGuruRows(pagedData, startIdx);
        else if (type === 'guruprofil') renderProfilGuruRows(pagedData, startIdx);
        else if (type === 'libur') renderLiburRows(pagedData, startIdx);
        else if (type === 'monitoring') renderMonitoringRows(pagedData, startIdx);
        else if (type === 'alumni') renderAlumniRows(pagedData, startIdx);
        else if (type === 'prestasi') renderPrestasiRows(pagedData, startIdx);
        else if (type === 'inventaris') renderInventarisRows(pagedData, startIdx);
        else if (type === 'rekap') renderRekapRows(pagedData, startIdx);
        else if (type === 'rekapGuru') renderRekapGuruRows(pagedData, startIdx);
        updatePaginationUI(type, startIdx, pagedData.length, total, state.page, totalPages);
    }
    function updatePaginationUI(type, startIdx, currentCount, total, currentPage, totalPages) {
        const infoEl = document.getElementById(`info-${type}`);
        const btnPrev = document.getElementById(`btn-prev-${type}`);
        const btnNext = document.getElementById(`btn-next-${type}`);
        if (total === 0) {
            infoEl.textContent = '';
            btnPrev.disabled = true;
            btnNext.disabled = true;
        } else {
            const end = startIdx + currentCount;
            infoEl.textContent = ''; 
            btnPrev.disabled = currentPage === 1;
            btnNext.disabled = currentPage >= totalPages;
        }
    }
    