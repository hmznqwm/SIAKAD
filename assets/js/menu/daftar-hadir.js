let dhStudents      = [];   
let dhStatusMap     = {};   
let dhCamStream     = null; 
let dhScanLoop      = null; 
let dhLastScan      = 0;
let dhCamActive     = false; 
let dhTorchOn       = false;
let dhTorchTrack    = null;
let dhCamFacing     = 'environment'; 
let dhZxingReader   = null; 
let dhLockedMap     = {}; 
let dhSavingMap     = {}; 
let dhGuruList       = [];
let dhGuruLockedMap  = {};
let dhGuruSavingMap  = {};
// Shortcut khusus tombol "Absensi Guru" di Akses Cepat Admin: langsung
// membuka Daftar Hadir DAN otomatis pindah ke mode Scan Guru (bukan
// berhenti di mode Siswa seperti saat menu dibuka lewat sidebar biasa).
// Sebelumnya tombol ini keliru diarahkan ke Rekap Bulanan (laporan saja,
// tidak bisa dipakai untuk absen guru) — sehingga terkesan "tidak berfungsi".
function loadAbsensiGuruLangsung() {
    loadDaftarHadirGuru();
    // Filter bar mode (Siswa/Guru) dibuat oleh _dhRenderModeFilter() secara
    // async (setTimeout), jadi ditunggu sampai tombolnya benar-benar ada di
    // DOM sebelum mode Guru diaktifkan — supaya tidak race condition.
    let dhAgTries = 0;
    (function dhAgWaitAndSwitch() {
        if (document.querySelector('#dhModeFilterSelect option[value="guru"]')) {
            dhSetModeFilter('guru');
        } else if (dhAgTries++ < 30) {
            setTimeout(dhAgWaitAndSwitch, 50);
        }
    })();
}
function loadDaftarHadirGuru() {
    dhStopPopup();
    setActiveMenu('Daftar Hadir');
    showView('view-daftar-hadir-guru');
    dhModeFilter = 'siswa';
    dhGuruList = [];
    dhGuruLockedMap = {};
    dhGuruSavingMap = {};
    setTimeout(_dhRenderModeFilter, 60);
    const today = (typeof siakadTodayStr === 'function') ? siakadTodayStr() : new Date().toISOString().split('T')[0];
    const dhTglEl = document.getElementById('dhTanggal');
    dhTglEl.value = today;
    // Tanggal paten: selalu hari ini (realtime), tidak bisa diubah.
    // Ditampilkan lewat #dhTanggalDisplay dengan format singkat sendiri (bukan
    // <input type="date"> native) supaya tidak meluber di HP yang format
    // tanggal bawaan OS-nya panjang (mis. "Minggu, 30 Agustus 2026").
    const dhTglDisplayEl = document.getElementById('dhTanggalDisplay');
    if (dhTglDisplayEl) {
        dhTglDisplayEl.textContent = (typeof _fmtTglSingkat === 'function') ? _fmtTglSingkat(today) : today;
    }
    const sel = document.getElementById('dhKelasSelect');
    sel.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'kepsek' || currentUser.role === 'wakel')) {
        sel.innerHTML = '<option value="">Memuat kelas...</option>';
        sel.disabled = true;
        siakadRun
            .withSuccessHandler(result => {
                sel.disabled = false;
                sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' +
                    '<option value= - EMUA">Semua Kelas</option>';
                const kelasList = (result && result.success && result.data) ? result.data : [];
                kelasList.forEach(k => {
                    const opt = document.createElement('option');
                    opt.value = k;
                    opt.textContent = k;
                    sel.appendChild(opt);
                });
            })
            .withFailureHandler(() => {
                sel.disabled = false;
                sel.innerHTML = '<option value="">-- Gagal memuat kelas --</option>';
            })
            .getKelasList();
    } else {
        const proceedDhGuru = function() {
            if (currentUser && currentUser.kelas) {
                const kelasList = String(currentUser.kelas).split(',').map(k => k.trim()).filter(Boolean);
                kelasList.forEach(k => {
                    const opt = document.createElement('option');
                    opt.value = k;
                    opt.textContent = k;
                    sel.appendChild(opt);
                });
                if (kelasList.length === 1) {
                    sel.value = kelasList[0];
                    dhRefreshMapelDropdown(kelasList[0], today, function() {
                        onDhKelasChange();
                    });
                }
            }
        };
        // Muat penugasan guru (kelas+mapel) untuk membatasi pilihan mapel
        if (currentUser && currentUser.role === 'guru' && !Array.isArray(window._guruMengajarList)) {
            siakadRun
                .withSuccessHandler(res => {
                    window._guruMengajarList = (res && res.success && Array.isArray(res.data)) ? res.data : [];
                    proceedDhGuru();
                })
                .withFailureHandler(() => { window._guruMengajarList = []; proceedDhGuru(); })
                .getGuruMengajarList(currentUser.token, currentUser.nip || currentUser.username || '');
        } else {
            proceedDhGuru();
        }
    }
}
function _dhNamaHari(tanggalStr) {
    if (!tanggalStr) return '';
    const hariMap = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    return hariMap[new Date(tanggalStr + 'T00:00').getDay()];
}
function dhRefreshMapelDropdown(kelas, tanggalStr, callback) {
    const sel = document.getElementById('dhMapelSelect');
    if (!sel) { if (callback) callback(); return; }
    if (!kelas || !tanggalStr) {
        sel.innerHTML = '<option value="">-- Pilih Mapel --</option>';
        sel.disabled = true;
        if (callback) callback();
        return;
    }
    const namaHari = _dhNamaHari(tanggalStr);
    sel.innerHTML = '<option value="">⏳ Memuat jadwal ' + namaHari + '...</option>';
    sel.disabled = true;
    siakadRun
        .withSuccessHandler(res => {
            let jadwal = (res && res.success && res.data) ? res.data : [];
            // Guru pengajar hanya melihat mapel yang diampunya di kelas tersebut
            if (currentUser && currentUser.role === 'guru' && Array.isArray(window._guruMengajarList) && window._guruMengajarList.length > 0) {
                const myMapel = new Set(window._guruMengajarList
                    .filter(m => String(m.kelas || '').trim() === String(kelas).trim())
                    .map(m => String(m.mata_pelajaran || '').trim().toLowerCase()));
                if (myMapel.size > 0) {
                    jadwal = jadwal.filter(j => myMapel.has(String(j.mapel || '').trim().toLowerCase()));
                }
            }
            if (jadwal.length > 0) {
                let html = '<option value="">-- Pilih Mapel --</option>';
                jadwal.forEach(j => {
                    html += `<option value="${j.mapel}">${j.mapel}${j.jam_mulai ? ' ('+j.jam_mulai+' - '+j.jam_selesai+')' : ''}</option>`;
                });
                sel.innerHTML = html;
            } else {
                sel.innerHTML = '<option value=""> Tidak ada jadwal ' + namaHari + ' </option>';
            }
            sel.disabled = false;
            if (callback) callback();
        })
        .withFailureHandler(() => {
            sel.innerHTML = '<option value="">-- Pilih Mapel --</option>';
            sel.disabled = false;
            if (callback) callback();
        })
        .getJadwalByHari(kelas === 'SEMUA' ? null : kelas, namaHari);
}
function onDhTanggalChange() {
    const kelas   = document.getElementById('dhKelasSelect').value;
    const tanggal = document.getElementById('dhTanggal').value;
    if (!kelas || !tanggal) return;
    dhRefreshMapelDropdown(kelas, tanggal, function() {
        onDhKelasChange();
    });
}
function onDhMapelChange() {
    onDhKelasChange();
}
function onDhKelasChange() {
    const kelas   = document.getElementById('dhKelasSelect').value;
    const tanggal = document.getElementById('dhTanggal').value;
    const mapel   = document.getElementById('dhMapelSelect')?.value || '';
    if (!kelas) return;
    dhStudents  = [];
    dhStatusMap = {};
    dhLockedMap = {};
    dhSavingMap = {};
    document.getElementById('dhCounter').textContent = '0 / 0';
    document.getElementById('dhSubmittedBanner').classList.add('hidden');
    const tbody = document.getElementById('dhSiswaTbody');
    // WAJIB: siswa baru muncul setelah kelas DAN mapel ditentukan
    if (!mapel) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center">
            <div class="flex flex-col items-center gap-2">
                <i class="fas fa-book-open text-3xl text-gray-200"></i>
                <p class="text-sm text-gray-400 font-semibold">Pilih mata pelajaran terlebih dahulu</p>
                <p class="text-[10px] text-gray-400">Absensi wajib diikuti mapel — nama siswa baru tampil setelah mapel dipilih.</p>
            </div>
        </td></tr>`;
        return;
    }
    if (!tanggal) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center">
            <div class="flex flex-col items-center gap-2">
                <i class="fas fa-calendar-day text-3xl text-gray-200"></i>
                <p class="text-sm text-gray-400 font-semibold">Pilih tanggal terlebih dahulu</p>
            </div>
        </td></tr>`;
        return;
    }
    tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat siswa...</td></tr>`;
    siakadRun
        .withSuccessHandler(result => {
            dhStudents = result || [];
            dhStatusMap = {};
            if (tanggal) {
                const mapelDipilih = document.getElementById('dhMapelSelect')?.value || '';
                siakadRun
                    .withSuccessHandler(res => {
                        dhLockedMap = {};
                        dhStatusMap = {};
                        if (res.success && res.data && Object.keys(res.data).length > 0) {
                            const bannerEl = document.getElementById('dhSubmittedBanner');
                            const bannerText = document.getElementById('dhSubmittedBannerText');
                            bannerEl.classList.remove('hidden');
                            if (bannerText) {
                                const mapelLabel = mapelDipilih ? `mapel <b>${mapelDipilih}</b>` : 'tanggal ini';
                                bannerText.innerHTML = `Semua siswa untuk ${mapelLabel} sudah tercatat dan tidak bisa diubah lagi.`;
                            }
                            Object.entries(res.data).forEach(([nisn, d]) => {
                                if (d && typeof d === 'object') {
                                    dhLockedMap[nisn] = d;
                                } else {
                                    dhLockedMap[nisn] = { status: d, jamDatang: '', hasJamDatang: true };
                                }
                            });
                        } else {
                            document.getElementById('dhSubmittedBanner').classList.add('hidden');
                        }
                        dhRenderStudentTable();
                    })
                    .withFailureHandler(() => dhRenderStudentTable())
                    .getDaftarHadirByKelasAndTanggal(kelas, tanggal, mapelDipilih);
            } else {
                dhLockedMap = {};
                dhRenderStudentTable();
            }
        })
        .withFailureHandler(() => {
            tbody.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-red-400">Gagal memuat data siswa.</td></tr>';
        })
        .getSiswaByKelas(kelas);
}
function dhRenderStudentTable() {
    const tbody = document.getElementById('dhSiswaTbody');
    if (!dhStudents || dhStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="py-12 text-center text-gray-400"><i class="fas fa-user-slash mr-2"></i>Tidak ada siswa di kelas ini.</td></tr>';
        return;
    }
    const statusConfig = {
        hadir: { label: 'Hadir', bg: 'bg-green-400', ring: 'ring-blue-300', text: 'text-[#152238]', rowBg: 'bg-[#e8ecf4]' },
        sakit: { label: 'Sakit', bg: 'bg-yellow-400',  ring: 'ring-yellow-200',  text: 'text-yellow-700',  rowBg: 'bg-yellow-50'  },
        izin:  { label: 'Izin',  bg: 'bg-blue-400',    ring: 'ring-blue-200',    text: 'text-[#152238]',    rowBg: 'bg-[#e8ecf4]'    },
        alpa:  { label: 'Alpa',  bg: 'bg-red-400',     ring: 'ring-red-200',     text: 'text-red-700',     rowBg: 'bg-red-50'     },
    };
    tbody.innerHTML = dhStudents.map((s, i) => {
        const saving = !!dhSavingMap[s.nisn];
        const lockedRaw = dhLockedMap[s.nisn] || null;
        const locked = lockedRaw !== null; 
        const st   = locked
            ? (lockedRaw && typeof lockedRaw === 'object' ? lockedRaw.status : String(lockedRaw))
            : (dhStatusMap[s.nisn] || '');
        const cfg  = statusConfig[st] || null;
        const rowBg = locked ? 'bg-gray-50 opacity-60' : (cfg ? cfg.rowBg : '');
        const isLastScan = s.nisn === dhLastScannedNisn;
        const isSemua = document.getElementById('dhKelasSelect').value === 'SEMUA';
        return `
        <tr id="dh-row-${s.nisn}" class="${isLastScan ? 'dh-row-last-scan' : rowBg} border-b border-gray-50 hover:bg-gray-50/30 transition">
          <td class="px-3 py-3 text-center text-xs text-gray-400 font-medium">${i+1}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full ${cfg ? cfg.bg : 'bg-gray-200'} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm transition-all duration-300">
                ${cfg ? cfg.label[0] : s.nama.charAt(0).toUpperCase()}
              </div>
              <div>
                <div class="font-semibold text-sm text-gray-800">${s.nama}</div>
                <div class="text-[10px] text-gray-400 font-mono">${s.nisn}${isSemua ? ` <span class="ml-1 bg-[#d0d8e8] text-[#1b2a4a] px-1.5 py-0.5 rounded font-bold">${s.kelas}</span>` : ''}</div>
              </div>
            </div>
          </td>
          <td class="px-3 py-3">
            ${saving
              ? `<div class="flex flex-col items-center justify-center">
                   <span class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-[#e8ecf4] text-[#152238] border border-blue-200 animate-pulse">
                     <i class="fas fa-circle-notch fa-spin text-[8px]"></i> Menyimpan
                   </span>
                 </div>`
              : locked
              ? (() => {
                   const lockedData = dhLockedMap[s.nisn];
                   const jamTxt = (lockedData && typeof lockedData === 'object' && lockedData.jamDatang) ? lockedData.jamDatang : '';
                   const statusLabel = cfg ? cfg.label : (typeof lockedData === 'string' ? lockedData : (lockedData && lockedData.status ? lockedData.status : '?'));
                   const bgClass = cfg ? cfg.bg + ' text-white shadow-sm' : 'bg-gray-200 text-gray-500';
                   return `<div class="flex flex-col items-center justify-center gap-0.5">
                     <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${bgClass}">
                       <i class="fas fa-lock text-[8px]"></i> ${statusLabel}
                     </span>
                     ${jamTxt ? `<span class="text-[9px] text-gray-400 font-medium"><i class="fas fa-clock"></i> ${jamTxt}</span>` : ''}
                   </div>`;
                 })()
              : `<div class="grid grid-cols-2 sm:flex sm:flex-row gap-1 justify-center max-w-[160px] sm:max-w-none mx-auto">
                   ${['hadir','sakit','izin','alpa'].map(status => {
                     const c = statusConfig[status];
                     const active = st === status;
                     const btnClass = 'px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] font-bold transition border text-center ' + (active ? c.bg + ' text-white ring-2 ' + c.ring + ' border-transparent shadow-sm' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300');
                     const btnTitle = active ? 'Batal' : c.label;
                     const btnLabel = active ? '<i class="fas fa-xmark text-[8px] mr-1"></i>' + c.label : c.label;
                     return `<button onclick="dhSetStatus('${s.nisn}','${status}')" title="${btnTitle}" class="${btnClass}">${btnLabel}</button>`;
                   }).join('')}
                 </div>`
            }
          </td>
        </tr>`;
    }).join('');
    dhUpdateCounter();
}
function dhSetStatus(nisn, status) {
    const siswa = dhStudents.find(s => s.nisn === nisn);
    if (!siswa) return;
    if (dhLockedMap[nisn] || dhSavingMap[nisn]) return; 
    const tanggal = document.getElementById('dhTanggal').value;
    const kelasDropdown = document.getElementById('dhKelasSelect').value;
    const mapelDipilih = document.getElementById('dhMapelSelect')?.value || '';
    if (!kelasDropdown || !tanggal) { showAlert('error', 'Pilih kelas dan tanggal terlebih dahulu.'); return; }
    if (!mapelDipilih) {
        Swal.fire({ icon: 'warning', title: 'Mata Pelajaran Belum Dipilih', text: 'Pilih mata pelajaran terlebih dahulu sebelum mencatat absensi. Absensi disimpan per mapel.', confirmButtonColor: '#2563eb' });
        document.getElementById('dhMapelSelect')?.focus();
        return;
    }
    const kelasSiswa = (kelasDropdown === 'SEMUA') ? siswa.kelas : kelasDropdown;
    dhSavingMap[nisn] = true;
    dhStatusMap[nisn] = status; 
    dhRenderStudentTable();
    const row = document.getElementById('dh-row-' + nisn);
    if (row) { row.classList.add('dh-row-flash'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); setTimeout(() => row.classList.remove('dh-row-flash'), 800); }
    siakadRun
        .withSuccessHandler(res => {
            delete dhSavingMap[nisn];
            delete dhStatusMap[nisn];
            if (res && res.success) {
                const jamNow = new Date().toTimeString().slice(0, 5);
                dhLockedMap[nisn] = { status: status, jamDatang: (status === 'hadir') ? jamNow : '', hasJamDatang: (status === 'hadir') };
                dhRenderStudentTable();
            } else {
                dhRenderStudentTable();
                showAlert('error', 'Gagal simpan ' + siswa.nama + ': ' + ((res && res.message) || 'Error tidak diketahui'));
            }
        })
        .withFailureHandler(err => {
            delete dhSavingMap[nisn];
            delete dhStatusMap[nisn];
            dhRenderStudentTable();
            showAlert('error', 'Error server: ' + String(err));
        })
        .submitDaftarHadirGuru([{ nisn: siswa.nisn, nama: siswa.nama, kelas: kelasSiswa, status: status }], tanggal, currentUser ? (currentUser.nama || currentUser.username || 'Guru') : 'Guru', (document.getElementById('dhMapelSelect')?.value || ''));
}
function dhTandaiSemua() {
    const tanggal = document.getElementById('dhTanggal').value;
    const kelasDropdown = document.getElementById('dhKelasSelect').value;
    const mapelDipilih = document.getElementById('dhMapelSelect')?.value || '';
    if (!kelasDropdown || !tanggal) { showAlert('error', 'Pilih kelas dan tanggal terlebih dahulu.'); return; }
    if (!mapelDipilih) {
        Swal.fire({ icon: 'warning', title: 'Mata Pelajaran Belum Dipilih', text: 'Pilih mata pelajaran terlebih dahulu. Absensi disimpan per mapel.', confirmButtonColor: '#2563eb' });
        document.getElementById('dhMapelSelect')?.focus();
        return;
    }
    const targets = dhStudents.filter(s => !dhLockedMap[s.nisn] && !dhSavingMap[s.nisn]);
    if (targets.length === 0) { showAlert('error', 'Semua siswa sudah tercatat pada tanggal ini.'); return; }
    Swal.fire({
        title: `Tandai ${targets.length} Siswa Hadir?`,
        text: 'Siswa yang belum tercatat pada tanggal ini akan langsung ditandai Hadir dan tersimpan permanen.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#3d5478',
        confirmButtonText: 'Ya, Tandai Semua',
        cancelButtonText: 'Batal'
    }).then(res => {
        if (!res.isConfirmed) return;
        targets.forEach(s => { dhSavingMap[s.nisn] = true; });
        dhRenderStudentTable();
        const dataList = targets.map(s => ({
            nisn: s.nisn,
            nama: s.nama,
            kelas: (kelasDropdown === 'SEMUA') ? s.kelas : kelasDropdown,
            status: 'hadir'
        }));
        showLoading();
        siakadRun
            .withSuccessHandler(res2 => {
                hideLoading();
                const jamNow = new Date().toTimeString().slice(0, 5);
                targets.forEach(s => { delete dhSavingMap[s.nisn]; });
                if (res2 && res2.success) {
                    targets.forEach(s => {
                        dhLockedMap[s.nisn] = { status: 'hadir', jamDatang: jamNow, hasJamDatang: true };
                    });
                    dhRenderStudentTable();
                    showAlert('success', res2.message || (targets.length + ' siswa berhasil ditandai hadir.'));
                } else {
                    dhRenderStudentTable();
                    Swal.fire('Gagal', (res2 && res2.message) || 'Terjadi kesalahan saat menyimpan.', 'error');
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                targets.forEach(s => { delete dhSavingMap[s.nisn]; });
                dhRenderStudentTable();
                Swal.fire('Error Server', err.message || String(err), 'error');
            })
            .submitDaftarHadirGuru(dataList, tanggal, currentUser ? (currentUser.nama || currentUser.username || 'Guru') : 'Guru', (document.getElementById('dhMapelSelect')?.value || ''));
    });
}
function dhUpdateCounter() {
    const total   = dhStudents.length;
    const locked  = Object.keys(dhLockedMap).filter(k => dhStudents.find(s => s.nisn === k)).length;
    const saving  = Object.keys(dhSavingMap).filter(k => dhStudents.find(s => s.nisn === k)).length;
    document.getElementById('dhCounter').textContent = locked + ' / ' + total + (saving > 0 ? ' (' + saving + ' menyimpan...)' : '');
}
function dhStopPopup() {
    if (typeof stopPolling === 'function') stopPolling();
    if (typeof cameraPopup !== 'undefined' && cameraPopup && !cameraPopup.closed) {
        try { cameraPopup.close(); } catch(e) {}
    }
}
let dhModeFilter = 'siswa';
function dhSetModeFilter(mode) {
    // Guru/pengajar & wali kelas hanya boleh memakai Scan Siswa
    if (mode === 'guru' && currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas')) {
        showAlert('error', 'Scan kehadiran guru hanya bisa dilakukan oleh Admin.');
        return;
    }
    dhModeFilter = mode;
    const modeSelect = document.getElementById('dhModeFilterSelect');
    if (modeSelect) modeSelect.value = mode;

    // Perbaiki Filter Tab Siswa dan Tab Guru agar Berbeda
    const kelasCol = document.getElementById('dhKelasCol');
    const mapelCol = document.getElementById('dhMapelCol');
    const filterGrid = document.getElementById('dhFilterGrid');
    const cardTitle = document.getElementById('dhScanCardTitle');
    const cardSub = document.getElementById('dhScanCardSub');
    const thNama = document.querySelector('#dhTheadMasuk th:nth-child(2)');
    const listTitle = document.getElementById('dhListTitle');
    const listSubtitle = document.getElementById('dhListSubtitle');
    const tandaiBtn = document.getElementById('dhTandaiSemuaBtn');
    const submittedBanner = document.getElementById('dhSubmittedBanner');

    if (mode === 'guru') {
        // Tab Guru: filter Kelas & Mapel TIDAK relevan (guru tidak terikat kelas/mapel),
        // jadi disembunyikan total — beda dengan tab Siswa yang wajib pilih kelas+mapel.
        // Filter Absensi & Tanggal tetap tampil sejajar (2 kolom tersisa).
        if (kelasCol) kelasCol.classList.add('hidden');
        if (mapelCol) mapelCol.classList.add('hidden');
        if (filterGrid) {
            filterGrid.classList.remove('md:grid-cols-4');
            filterGrid.classList.add('md:grid-cols-2');
        }
        if (cardTitle) cardTitle.textContent = 'Scan QR Guru';
        if (cardSub) cardSub.textContent = 'Scan langsung tersimpan otomatis';
        if (thNama) thNama.textContent = 'Nama Guru';
        if (listTitle) listTitle.textContent = 'Daftar Hadir Guru';
        if (listSubtitle) listSubtitle.textContent = 'tersimpan otomatis per scan';
        // "Tandai Semua" & banner "sudah tercatat per mapel" hanya berlaku untuk
        // absensi siswa (yang diikat per kelas+mapel) — tidak berlaku untuk guru.
        if (tandaiBtn) tandaiBtn.classList.add('hidden');
        if (submittedBanner) submittedBanner.classList.add('hidden');
    } else {
        if (kelasCol) kelasCol.classList.remove('hidden');
        if (mapelCol) mapelCol.classList.remove('hidden');
        if (filterGrid) {
            filterGrid.classList.remove('md:grid-cols-2');
            filterGrid.classList.add('md:grid-cols-4');
        }
        if (cardTitle) cardTitle.textContent = 'Scan QR Siswa';
        if (cardSub) cardSub.textContent = 'Scan langsung tersimpan otomatis';
        if (thNama) thNama.textContent = 'Nama Siswa';
        if (listTitle) listTitle.textContent = 'Daftar Hadir Siswa';
        if (listSubtitle) listSubtitle.textContent = 'tersimpan otomatis';
        if (tandaiBtn) tandaiBtn.classList.remove('hidden');
    }

    // Render tabel sesuai mode yang dipilih
    if (mode === 'guru') {
        dhRenderGuruTable();
    } else {
        // Balik ke tab Siswa: muat ulang data siswa terbaru (kelas+mapel yang
        // sudah dipilih sebelumnya) supaya status kehadiran tidak basi setelah
        // sempat berpindah ke tab Guru.
        const kelasVal = document.getElementById('dhKelasSelect')?.value || '';
        const mapelVal = document.getElementById('dhMapelSelect')?.value || '';
        if (kelasVal && mapelVal) {
            onDhKelasChange();
        } else {
            dhRenderStudentTable();
        }
    }
}

function dhRenderGuruTable() {
    const tbody = document.getElementById('dhSiswaTbody');
    if (!tbody) return;
    const tanggal = document.getElementById('dhTanggal')?.value || siakadTodayStr();

    tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data guru...</td></tr>`;

    Promise.all([
        new Promise((resolve) => {
            if (dhGuruList.length > 0) {
                resolve(dhGuruList);
            } else {
                siakadRun
                    .withSuccessHandler(res => {
                        if (res && res.success && res.data) {
                            dhGuruList = res.data;
                            resolve(res.data);
                        } else {
                            resolve([]);
                        }
                    })
                    .withFailureHandler(() => resolve([]))
                    .getGuruForScanCache();
            }
        }),
        new Promise((resolve) => {
            siakadRun
                .withSuccessHandler(res => {
                    if (res && res.success && res.data) {
                        resolve(res.data);
                    } else {
                        resolve([]);
                    }
                })
                .withFailureHandler(() => resolve([]))
                .getAbsensiGuruList(tanggal);
        })
    ]).then(([guruList, absensiList]) => {
        dhGuruLockedMap = {};
        if (Array.isArray(absensiList)) {
            absensiList.forEach(a => {
                const cleanNip = String(a.nip || '').replace(/[^a-zA-Z0-9]/g, '').trim();
                if (cleanNip) {
                    dhGuruLockedMap[cleanNip] = { jam: a.jamMasuk ? a.jamMasuk.slice(0, 5) : '' };
                }
            });
        }
        if (dhModeFilter === 'guru') {
            _dhRenderGuruRows();
        }
    }).catch(err => {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="3" class="py-8 text-center text-red-400">Gagal memuat data guru.</td></tr>`;
    });
}

function _dhRenderGuruRows() {
    const tbody = document.getElementById('dhSiswaTbody');
    if (!tbody) return;
    if (!dhGuruList || dhGuruList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-12 text-center text-gray-400"><i class="fas fa-user-slash mr-2"></i>Tidak ada data guru.</td></tr>`;
        return;
    }
    const tanggal = document.getElementById('dhTanggal')?.value || siakadTodayStr();
    tbody.innerHTML = dhGuruList.map((g, i) => {
        const nip = String(g.nip || '').replace(/[^a-zA-Z0-9]/g, '').trim();
        const saving = !!dhGuruSavingMap[nip];
        const locked = !!dhGuruLockedMap[nip];
        const jamTxt = dhGuruLockedMap[nip]?.jam || '';
        return `
        <tr id="dh-guru-row-${nip}" class="${locked ? 'bg-[#e8ecf4] opacity-70' : ''} border-b border-gray-50 transition-colors duration-300">
          <td class="px-3 py-3 text-center text-xs text-gray-400">${i + 1}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full ${locked ? 'bg-gray-400' : 'bg-blue-400'} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                ${locked ? '<i class="fas fa-check"></i>' : (g.nama ? g.nama.charAt(0).toUpperCase() : 'G')}
              </div>
              <div>
                <div class="font-semibold text-sm text-gray-800">${g.nama || '-'}</div>
                <div class="text-[10px] text-gray-400 font-mono">${g.nip || '-'} ${g.jabatan ? `<span class="ml-1 bg-[#d0d8e8] text-[#1b2a4a] px-1.5 py-0.5 rounded font-bold">${g.jabatan}</span>` : ''}</div>
              </div>
            </div>
          </td>
          <td class="px-3 py-3">
            ${saving
              ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#d0d8e8] text-[#1b2a4a]"><i class="fas fa-circle-notch fa-spin text-[8px]"></i> Menyimpan...</span>`
              : locked
              ? `<div class="flex flex-col items-center gap-1">
                   <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-500 text-white"><i class="fas fa-lock text-[8px]"></i> Hadir</span>
                   <span class="text-[9px] text-gray-400">${jamTxt ? '<i class="fas fa-clock"></i> ' + jamTxt : 'Sudah tercatat'}</span>
                 </div>`
              : `<button onclick="dhCatatGuruHadir('${nip}', '${(g.nama || '').replace(/'/g, "\\'")}')"
                   class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#d0d8e8] text-[#152238] hover:bg-green-500 hover:text-white border border-blue-200 transition">
                   <i class="fas fa-user-check mr-1"></i> Catat Hadir
                 </button>`
            }
          </td>
        </tr>`;
    }).join('');
    // Update counter untuk guru
    const total  = dhGuruList.length;
    const locked = Object.keys(dhGuruLockedMap).length;
    const counterEl = document.getElementById('dhCounter');
    if (counterEl) counterEl.textContent = locked + ' / ' + total;
}

function dhCatatGuruHadir(nip, namaGuru) {
    if (dhGuruSavingMap[nip] || dhGuruLockedMap[nip]) return;
    const tanggal = document.getElementById('dhTanggal')?.value || siakadTodayStr();
    // PERBAIKAN: `nip` di sini adalah versi yang SUDAH dibersihkan dari karakter
    // non-alfanumerik (dipakai sebagai key dhGuruLockedMap/dhGuruSavingMap).
    // Yang disimpan ke absensi_guru harus NIP ASLI persis seperti di profil_guru,
    // supaya cocok dengan pencocokan NIP di Rekap Bulanan tab Guru (yang hanya
    // trim(), tidak membersihkan karakter) — kalau tidak, baris tersimpan tapi
    // bisa tidak muncul/tidak terhitung di rekap.
    const guruRow = (dhGuruList || []).find(g => String(g.nip || '').replace(/[^a-zA-Z0-9]/g, '').trim() === nip);
    const nipToSave = guruRow ? guruRow.nip : nip;
    dhGuruSavingMap[nip] = true;
    _dhRenderGuruRows();
    siakadRun
        .withSuccessHandler(res => {
            delete dhGuruSavingMap[nip];
            if (res && res.success) {
                const jam = new Date().toTimeString().slice(0, 5);
                dhGuruLockedMap[nip] = { jam };
            }
            _dhRenderGuruRows();
        })
        .withFailureHandler(() => {
            delete dhGuruSavingMap[nip];
            _dhRenderGuruRows();
            showAlert('error', 'Gagal mencatat kehadiran ' + namaGuru);
        })
        .submitDaftarHadirGuru([{ nip: nipToSave, nama: namaGuru, status: 'hadir' }], tanggal, namaGuru, '');
}
function _dhRenderModeFilter() {
    const slot = document.getElementById('dhModeFilterCol');
    if (!slot) return;
    if (document.getElementById('dhModeFilterSelect')) return;
    // Role guru/wali kelas hanya boleh mengakses filter "Absensi Siswa" —
    // opsi "Absensi Guru" tidak dibuat sama sekali di dropdown-nya (bukan
    // sekadar disembunyikan lewat CSS) supaya benar-benar tidak bisa dipilih.
    const isGuru = currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas');
    dhModeFilter = 'siswa';
    slot.innerHTML = `
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Filter Absensi</label>
        <select id="dhModeFilterSelect"
            onchange="dhSetModeFilter(this.value)"
            ${isGuru ? 'disabled title="Guru hanya dapat mengakses Absensi Siswa"' : ''}
            class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#a0b0cc] outline-none transition cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
            <option value="siswa">Absensi Siswa</option>
            ${isGuru ? '' : '<option value="guru">Absensi Guru</option>'}
        </select>
    `;
}
function dhOpenCameraPopup() {
    const kelas = document.getElementById('dhKelasSelect')?.value;
    if (!kelas && dhModeFilter === 'siswa') {
        showAlert('error', 'Pilih kelas terlebih dahulu sebelum membuka kamera.');
        return;
    }
    scanMode = 'daftar-hadir';
    openCameraPopup();
}
function dhToggleCamera() { dhOpenCameraPopup(); }
function dhStartCamera()  {}
function dhStopCamera()   { dhStopPopup(); }
function dhSwitchCam()    {}
function dhToggleTorch()  {}
function dhBeginScan(video, canvas) {}
function dhOnDetected(text) {
    if (!text || (Date.now() - dhLastScan) < 1500) return;
    dhLastScan = Date.now();
    dhOnScanResult(text.trim());
}
function dhPlayBeep(type = 'success') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (type === 'success') {
            [0, 0.15].forEach((delay, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(i === 0 ? 880 : 1100, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.18);
            });
        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            gain.gain.setValueAtTime(0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch(e) { }
}
var dhLastScannedNisn = null;
function dhOnScanResult(rawNisn) {
    const nisn = String(rawNisn).replace(/[^a-zA-Z0-9]/g,'').trim();
    const notif = document.getElementById('dhScanNotif');
    const tanggal = document.getElementById('dhTanggal')?.value || siakadTodayStr();

    // Paksa mode siswa untuk role guru/pengajar & wali kelas (tanpa scan guru)
    if (dhModeFilter === 'guru' && currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas')) {
        dhModeFilter = 'siswa';
    }
    if (dhModeFilter === 'guru') {
        // PERBAIKAN: sebelumnya nama guru dicari dari `guruLocalCache`, cache milik
        // halaman Scan Absensi Guru yang lama (tidak pernah dimuat di halaman Daftar
        // Hadir ini) — sehingga selalu kosong dan hasil scan jatuh ke nama placeholder.
        // Sumber data yang benar di halaman ini adalah `dhGuruList`, yang sudah
        // dimuat oleh dhRenderGuruTable() saat tab "Guru" dibuka.
        const guruListLoaded = Array.isArray(dhGuruList) && dhGuruList.length > 0;
        const guruInfo = guruListLoaded
            ? dhGuruList.find(g => String(g.nip || '').replace(/[^a-zA-Z0-9]/g, '').trim() === nisn)
            : null;

        if (guruListLoaded && !guruInfo) {
            dhPlayBeep('error');
            notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-red-50 text-red-600 border border-red-100';
            notif.innerHTML = '<i class="fas fa-circle-xmark mr-1"></i> NIP [' + nisn + '] tidak terdaftar sebagai guru';
            notif.classList.remove('hidden');
            setTimeout(() => notif.classList.add('hidden'), 3000);
            return;
        }

        const namaGuru = guruInfo ? guruInfo.nama : ('Guru [' + nisn + ']');
        // PERBAIKAN: simpan NIP asli dari profil_guru (guruInfo.nip), bukan hasil
        // QR yang sudah dibersihkan (nisn) — supaya baris absensi_guru yang
        // tersimpan cocok persis dengan NIP di Rekap Bulanan tab Guru, sehingga
        // hasil scan dipastikan ikut terhitung di rekap (bukan cuma tersimpan
        // di tabel tapi "nyasar" karena format NIP beda).
        const nipToSave = guruInfo ? guruInfo.nip : nisn;

        // PERBAIKAN: sebelumnya scan guru tidak mengecek status terkunci/menyimpan
        // (dhGuruLockedMap / dhGuruSavingMap) seperti alur siswa, jadi scan ulang QR
        // yang sama bisa dikirim berkali-kali dan baris di tabel Guru tidak pernah
        // diperbarui setelah tersimpan — terlihat seolah "kebaca tapi tidak tersimpan".
        if (dhGuruLockedMap[nisn]) {
            dhPlayBeep('error');
            notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-yellow-50 text-yellow-700 border border-yellow-100';
            notif.innerHTML = '<i class="fas fa-lock mr-1"></i> ' + namaGuru + ' sudah tercatat Hadir hari ini';
            notif.classList.remove('hidden');
            setTimeout(() => notif.classList.add('hidden'), 2500);
            return;
        }
        if (dhGuruSavingMap[nisn]) return;

        dhGuruSavingMap[nisn] = true;
        if (dhModeFilter === 'guru') _dhRenderGuruRows();
        dhPlayBeep('success');
        notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-[#e8ecf4] text-[#1b2a4a] border border-blue-100';
        notif.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Menyimpan ' + namaGuru + '...';
        notif.classList.remove('hidden');
        siakadRun
            .withSuccessHandler(res => {
                delete dhGuruSavingMap[nisn];
                if (res && res.success) {
                    dhGuruLockedMap[nisn] = { jam: new Date().toTimeString().slice(0, 5) };
                    notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-[#e8ecf4] text-[#152238] border border-blue-100';
                    notif.innerHTML = '<i class="fas fa-circle-check mr-1"></i> ' + namaGuru + ' Hadir (tersimpan)';
                } else {
                    dhPlayBeep('error');
                    notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-red-50 text-red-600 border border-red-100';
                    notif.innerHTML = '<i class="fas fa-circle-xmark mr-1"></i> Gagal simpan: ' + ((res && res.message) || 'Error');
                }
                // Perbarui tabel Daftar Hadir Guru supaya status "Hadir" langsung
                // terlihat setelah scan berhasil, tanpa perlu pindah tab / refresh.
                if (dhModeFilter === 'guru') _dhRenderGuruRows();
                notif.classList.remove('hidden');
                setTimeout(() => notif.classList.add('hidden'), 2500);
            })
            .withFailureHandler(err => {
                delete dhGuruSavingMap[nisn];
                if (dhModeFilter === 'guru') _dhRenderGuruRows();
                dhPlayBeep('error');
                notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-red-50 text-red-600 border border-red-100';
                notif.innerHTML = '<i class="fas fa-circle-xmark mr-1"></i> Error: ' + String(err);
                notif.classList.remove('hidden');
                setTimeout(() => notif.classList.add('hidden'), 3000);
            })
            .submitDaftarHadirGuru([{ nip: nipToSave, nama: namaGuru, status: 'hadir' }], tanggal, namaGuru, '');
        return;
    }

    const siswa = dhStudents.find(s => String(s.nisn).replace(/[^a-zA-Z0-9]/g,'').trim() === nisn || String(s.nisn).trim() === nisn);
    if (!siswa) {
        dhPlayBeep('error');
        notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-red-50 text-red-600 border border-red-100';
        notif.innerHTML = '<i class="fas fa-circle-xmark mr-1"></i> Id [' + nisn + '] tidak ada di kelas ini';
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 3000);
        return;
    }
    if (dhLockedMap[nisn]) {
        dhPlayBeep('error');
        const lockedObj = dhLockedMap[nisn];
        const st = (lockedObj && typeof lockedObj === 'object') ? lockedObj.status : String(lockedObj);
        notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-yellow-50 text-yellow-700 border border-yellow-100';
        notif.innerHTML = '<i class="fas fa-lock mr-1"></i> ' + siswa.nama + ' sudah absen (' + st.charAt(0).toUpperCase() + st.slice(1) + ')';
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 2500);
        return;
    }
    if (dhSavingMap[nisn]) return; 
    const kelasDropdown = document.getElementById('dhKelasSelect').value;
    const mapelDipilih = document.getElementById('dhMapelSelect')?.value || '';
    if (!kelasDropdown || !tanggal) {
        dhPlayBeep('error');
        notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-yellow-50 text-yellow-700 border border-yellow-100';
        notif.innerHTML = '<i class="fas fa-triangle-exclamation mr-1"></i> Pilih kelas dan tanggal terlebih dahulu';
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 2500);
        return;
    }
    if (!mapelDipilih) {
        dhPlayBeep('error');
        notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-orange-50 text-orange-700 border border-orange-100';
        notif.innerHTML = '<i class="fas fa-book-open mr-1"></i> Pilih mata pelajaran dulu sebelum scan!';
        notif.classList.remove('hidden');
        setTimeout(() => notif.classList.add('hidden'), 3000);
        document.getElementById('dhMapelSelect')?.focus();
        return;
    }
    const kelasSiswa = (kelasDropdown === 'SEMUA') ? siswa.kelas : kelasDropdown;
    dhLastScannedNisn = nisn;
    dhSavingMap[nisn] = true;
    delete dhStatusMap[nisn];
    dhPlayBeep('success');
    dhRenderStudentTable();
    notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-[#e8ecf4] text-[#1b2a4a] border border-blue-100';
    notif.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Menyimpan ' + siswa.nama + '...';
    notif.classList.remove('hidden');
    const row = document.getElementById('dh-row-' + nisn);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    siakadRun
        .withSuccessHandler(res => {
            delete dhSavingMap[nisn];
            if (res && res.success) {
                const jamNow = new Date().toTimeString().slice(0, 5);
                dhLockedMap[nisn] = { status: 'hadir', jamDatang: jamNow, hasJamDatang: true };
                dhRenderStudentTable();
                notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-[#e8ecf4] text-[#152238] border border-blue-100';
                notif.innerHTML = '<i class="fas fa-circle-check mr-1"></i> ' + siswa.nama + ' Hadir (tersimpan)';
            } else {
                dhPlayBeep('error');
                dhRenderStudentTable();
                notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-red-50 text-red-600 border border-red-100';
                notif.innerHTML = '<i class="fas fa-circle-xmark mr-1"></i> Gagal simpan: ' + ((res && res.message) || 'Error tidak diketahui');
            }
            notif.classList.remove('hidden');
            setTimeout(() => notif.classList.add('hidden'), 2200);
        })
        .withFailureHandler(err => {
            delete dhSavingMap[nisn];
            dhRenderStudentTable();
            dhPlayBeep('error');
            notif.className = 'rounded-xl p-3 text-sm font-semibold text-center bg-red-50 text-red-600 border border-red-100';
            notif.innerHTML = '<i class="fas fa-circle-xmark mr-1"></i> Error: ' + String(err);
            notif.classList.remove('hidden');
            setTimeout(() => notif.classList.add('hidden'), 3000);
        })
        .submitDaftarHadirGuru([{ nisn: siswa.nisn, nama: siswa.nama, kelas: kelasSiswa, status: 'hadir' }], tanggal, currentUser ? (currentUser.nama || currentUser.username || 'Guru') : 'Guru', (document.getElementById('dhMapelSelect')?.value || ''));
}
function dhSubmitManual() {
    const inp = document.getElementById('dhManualNisn');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) { showAlert('error', 'Masukkan Id terlebih dahulu.'); return; }
    inp.value = '';
    dhOnScanResult(val);
}
