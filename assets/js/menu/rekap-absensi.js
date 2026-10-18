// ===== MENU REKAP ABSENSI (laporan per rentang tanggal) =====
// Semua fungsi pendukung view-rekap-absensi: loader menu, switch tab,
// filter/cari data, render tabel (via processTableData), dan export Excel.

function loadMenuRekapAbsensi() {
    setActiveMenu('Rekap Absensi');
    showView('view-rekap-absensi');
    // Default periode: awal bulan berjalan s.d. hari ini
    const sEl = document.getElementById('fStart');
    const eEl = document.getElementById('fEnd');
    const today = new Date();
    if (eEl && !eEl.value) eEl.value = siakadTodayStr();
    if (sEl && !sEl.value) sEl.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';
    _raFillDropdowns(function () { applyFilter(); });
}

function _raFillDropdowns(setelahItu) {
    // Dropdown kelas
    const kSel = document.getElementById('fKelasRekap');
    if (kSel) {
        kSel.innerHTML = '<option value="">Semua Kelas</option>';
        (existingClasses || []).forEach(function (k) {
            const opt = document.createElement('option');
            opt.value = k; opt.textContent = k;
            kSel.appendChild(opt);
        });
    }
    // Dropdown jabatan (role guru di absensi_guru) — selalu dibangun ulang
    const jSel = document.getElementById('fJabatanRekap');
    if (jSel) {
        jSel.innerHTML = '';
        [['', 'Semua Jabatan'], ['guru', 'Guru'], ['walikelas', 'Walikelas'],
         ['admin', 'Admin'], ['kepsek', 'Kepsek']].forEach(function (pair) {
            const opt = document.createElement('option');
            opt.value = pair[0];
            opt.textContent = pair[1];
            jSel.appendChild(opt);
        });
    }
    if ((!existingClasses || existingClasses.length === 0)) {
        siakadRun
            .withSuccessHandler(function (result) {
                if (result.success) {
                    existingClasses = result.data;
                    const sel2 = document.getElementById('fKelasRekap');
                    if (sel2) {
                        sel2.innerHTML = '<option value="">Semua Kelas</option>';
                        (existingClasses || []).forEach(function (k) {
                            const opt = document.createElement('option');
                            opt.value = k; opt.textContent = k;
                            sel2.appendChild(opt);
                        });
                    }
                }
                if (setelahItu) setelahItu();
            })
            .withFailureHandler(function () { if (setelahItu) setelahItu(); })
            .getKelasList();
    } else {
        if (setelahItu) setelahItu();
    }
}

function switchRekapTab(tab) {
    window._rekapTabAktifRk = tab;
    const contS = document.getElementById('rekapContainer');
    const contG = document.getElementById('rekapGuruContainer');
    const emptyEl = document.getElementById('rekapEmptyState');
    const wrapK = document.getElementById('wrapFilterKelasRekap');
    const wrapJ = document.getElementById('wrapFilterJabatanRekap');
    const btnS = document.getElementById('tabRekapSiswa');
    const btnG = document.getElementById('tabRekapGuru');
    const activeCls = 'px-4 py-2 rounded-lg text-xs font-bold transition bg-[#1b2a4a] text-white shadow-md';
    const inactiveCls = 'px-4 py-2 rounded-lg text-xs font-bold transition bg-white text-gray-600 border border-gray-200 hover:bg-gray-50';
    const sudahMuat = !!window._rekapSudahMuatRk;
    if (tab === 'siswa') {
        contS.classList.toggle('hidden', !sudahMuat);
        contG.classList.add('hidden');
        wrapK.classList.remove('hidden');
        wrapJ.classList.add('hidden');
        btnS.className = activeCls;
        btnG.className = inactiveCls;
    } else {
        contG.classList.toggle('hidden', !sudahMuat);
        contS.classList.add('hidden');
        wrapJ.classList.remove('hidden');
        wrapK.classList.add('hidden');
        btnG.className = activeCls;
        btnS.className = inactiveCls;
    }
    if (emptyEl) emptyEl.classList.toggle('hidden', sudahMuat);
}

function applyFilter() {
    const sEl = document.getElementById('fStart');
    const eEl = document.getElementById('fEnd');
    const kSel = document.getElementById('fKelasRekap');
    const jSel = document.getElementById('fJabatanRekap');
    const start = sEl ? sEl.value : '';
    const end = eEl ? eEl.value : '';
    if (!start || !end) { showAlert('error', 'Pilih tanggal mulai dan tanggal akhir terlebih dahulu.'); return; }
    if (start > end) { showAlert('error', 'Tanggal mulai tidak boleh setelah tanggal akhir.'); return; }
    const loadingEl = document.getElementById('rekapLoading');
    const emptyEl = document.getElementById('rekapEmptyState');
    document.getElementById('rekapContainer').classList.add('hidden');
    document.getElementById('rekapGuruContainer').classList.add('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (loadingEl) loadingEl.classList.remove('hidden');
    siakadRun
        .withSuccessHandler(function (res) {
            if (loadingEl) loadingEl.classList.add('hidden');
            if (!res || !res.success) {
                showAlert('error', (res && res.message) || 'Gagal mengambil data rekap.');
                if (emptyEl) emptyEl.classList.remove('hidden');
                return;
            }
            tableState.rekap.fullData = res.data.siswa || [];
            tableState.rekapGuru.fullData = res.data.guru || [];
            tableState.rekap.page = 1; tableState.rekap.search = '';
            tableState.rekapGuru.page = 1; tableState.rekapGuru.search = '';
            const qS = document.querySelector('#rekapContainer input[type="text"]');
            const qG = document.querySelector('#rekapGuruContainer input[type="text"]');
            if (qS) qS.value = '';
            if (qG) qG.value = '';
            window._rekapPeriodeRk = { start: start, end: end };
            window._rekapSudahMuatRk = true;
            processTableData('rekap');
            processTableData('rekapGuru');
            switchRekapTab(window._rekapTabAktifRk || 'siswa');
        })
        .withFailureHandler(function (err) {
            if (loadingEl) loadingEl.classList.add('hidden');
            if (emptyEl) emptyEl.classList.remove('hidden');
            showAlert('error', 'Error Server: ' + err);
        })
        .getRekapAbsensiRange(currentUser ? currentUser.token : '', start, end,
            kSel ? kSel.value : '', jSel ? jSel.value : '');
}

function renderRekapRows(pagedData, startIdx) {
    const tbody = document.getElementById('tbody-rekap');
    if (!tbody) return;
    const badgeCls = function (st) {
        if (st === 'Hadir') return 'text-green-700 dark:text-green-300 font-bold';
        if (st === 'Alpa' || st === 'Alfa') return 'text-red-600 font-bold';
        if (st === 'Izin') return 'text-[#1b2a4a] dark:text-blue-300 font-bold';
        if (st === 'Sakit') return 'text-yellow-600 font-bold';
        if (st === 'Terlambat') return 'text-orange-500 font-bold';
        return 'text-gray-500';
    };
    tbody.innerHTML = pagedData.length === 0
        ? '<tr><td colspan="8" class="p-8 text-center text-gray-400">Tidak ada data pada periode ini.</td></tr>'
        : pagedData.map(function (r, i) {
            return '<tr class="hover:bg-gray-50 transition border-b border-gray-50">' +
                '<td class="p-4 text-center text-gray-400">' + (startIdx + i + 1) + '</td>' +
                '<td class="p-4 text-xs text-gray-600 whitespace-nowrap">' + (r.tanggal || '-') + '</td>' +
                '<td class="p-4 text-xs font-bold text-gray-800">' + (r.nama || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.kelas || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.jam_datang || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.jam_pulang || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.keterangan_waktu || '-') + '</td>' +
                '<td class="p-4 text-xs text-center ' + badgeCls(r.status) + '">' + (r.status || '-') + '</td>' +
                '</tr>';
        }).join('');
}

function renderRekapGuruRows(pagedData, startIdx) {
    const tbody = document.getElementById('tbody-rekapGuru');
    if (!tbody) return;
    const badgeCls = function (st) {
        if (st === 'Hadir') return 'text-green-700 dark:text-green-300 font-bold';
        if (st === 'Alpa' || st === 'Alfa') return 'text-red-600 font-bold';
        if (st === 'Izin') return 'text-[#1b2a4a] dark:text-blue-300 font-bold';
        if (st === 'Sakit') return 'text-yellow-600 font-bold';
        if (st === 'Terlambat') return 'text-orange-500 font-bold';
        return 'text-gray-500';
    };
    tbody.innerHTML = pagedData.length === 0
        ? '<tr><td colspan="9" class="p-8 text-center text-gray-400">Tidak ada data pada periode ini.</td></tr>'
        : pagedData.map(function (r, i) {
            return '<tr class="hover:bg-gray-50 transition border-b border-gray-50">' +
                '<td class="p-4 text-center text-gray-400">' + (startIdx + i + 1) + '</td>' +
                '<td class="p-4 text-xs text-gray-600 whitespace-nowrap">' + (r.tanggal || '-') + '</td>' +
                '<td class="p-4 text-xs font-bold text-gray-800">' + (r.nama_guru || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.nip || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.jabatan || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.jam_masuk || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.jam_pulang || '-') + '</td>' +
                '<td class="p-4 text-xs text-center">' + (r.keterangan || '-') + '</td>' +
                '<td class="p-4 text-xs text-center ' + badgeCls(r.status) + '">' + (r.status || '-') + '</td>' +
                '</tr>';
        }).join('');
}

async function exportToExcel() {
    if (!window._rekapSudahMuatRk) {
        showAlert('error', 'Klik "Cari Data" terlebih dahulu sebelum export.');
        return;
    }
    await ensureLib('xlsx');
    if (typeof XLSX === 'undefined') {
        showAlert('error', 'Library Excel (SheetJS) belum termuat. Coba refresh halaman.');
        return;
    }
    const tab = window._rekapTabAktifRk || 'siswa';
    const state = tab === 'guru' ? tableState.rekapGuru : tableState.rekap;
    const rows = state.filtered || [];
    if (rows.length === 0) { showAlert('error', 'Tidak ada data untuk diekspor.'); return; }
    try {
        const wb = XLSX.utils.book_new();
        let aoa;
        if (tab === 'guru') {
            aoa = [['REKAP ABSENSI GURU' ]].concat([[]]);
            aoa.push(['No', 'Tanggal', 'Nama Guru', 'NIP', 'Jabatan', 'Jam Masuk', 'Jam Pulang', 'Keterangan', 'Status']);
            rows.forEach(function (r, i) {
                aoa.push([i + 1, r.tanggal || '-', r.nama_guru || '-', r.nip || '-', r.jabatan || '-',
                    r.jam_masuk || '-', r.jam_pulang || '-', r.keterangan || '-', r.status || '-']);
            });
        } else {
            aoa = [['REKAP ABSENSI SISWA']].concat([[]]);
            aoa.push(['No', 'Tanggal', 'Nama Siswa', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan Waktu', 'Status']);
            rows.forEach(function (r, i) {
                aoa.push([i + 1, r.tanggal || '-', r.nama || '-', r.kelas || '-',
                    r.jam_datang || '-', r.jam_pulang || '-', r.keterangan_waktu || '-', r.status || '-']);
            });
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, tab === 'guru' ? 'Rekap Guru' : 'Rekap Siswa');
        const periode = window._rekapPeriodeRk || {};
        const namaFile = 'Rekap_Absensi_' + (tab === 'guru' ? 'Guru_' : 'Siswa_') +
            (periode.start || '') + '_sd_' + (periode.end || '') + '.xlsx';
        XLSX.writeFile(wb, namaFile);
    } catch (e) {
        showAlert('error', 'Gagal mengekspor: ' + e.message);
    }
}
