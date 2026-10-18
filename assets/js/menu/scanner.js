async function loadQRCodeSiswa(nisnParam, namaParam, kelasParam) {
    await ensureLib('qrcodejs');
    if (typeof stopAndBack === "function") stopAndBack(false);
    // PERBAIKAN: fallback ke currentUser.username (untuk role siswa, username = NISN)
    let rawNisn = nisnParam || (currentUser ? (currentUser.nisn || currentUser.username) : "");
    const namaSiswa = namaParam || (currentUser ? currentUser.nama : "Siswa");
    const kelasSiswa = kelasParam || (currentUser ? currentUser.kelas : "X");
    let cleanNisn = rawNisn ? String(rawNisn).replace(/[^a-zA-Z0-9]/g, "").trim() : "";
    const isSiswaRole = currentUser && currentUser.role === 'siswa';
    const isAlumniRole = currentUser && currentUser.role === 'alumni';
    let dataSiswa = { ...(currentUser && (currentUser.role === 'siswa' || currentUser.role === 'alumni') ? currentUser : {}) };

    function buildAndShowModal() {
        const tglLahirSiswa = dataSiswa.tanggalLahir
            ? (() => { try {
                const t = new Date(dataSiswa.tanggalLahir);
                if (isNaN(t)) return dataSiswa.tanggalLahir;
                return t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
              } catch(e) { return dataSiswa.tanggalLahir; } })()
            : '-';
        const fotoSiswa = dataSiswa.foto || null;
        const alamatSiswa = dataSiswa.alamat || '';
        const fotoHtml = fotoSiswa
            ? `<div class="w-full h-full cursor-pointer" onclick="document.getElementById('fotoSiswaInput').click()">
                 <img src="${fotoSiswa}" class="kartu-foto" alt="Foto siswa">
               </div>`
            : `<button type="button" onclick="document.getElementById('fotoSiswaInput').click()" class="kartu-avatar w-full h-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition">
                 <i class="fas fa-camera text-gray-400 text-2xl"></i>
               </button>`;

        const content = `
            <div class="bg-gradient-to-r from-[#1b2a4a] to-[#152238] px-4 py-3 text-white flex justify-between items-center shrink-0">
                <h3 class="text-base font-bold tracking-tight">Kartu Absensi Siswa</h3>

                <button onclick="closeModal()" class="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-3 sm:p-4">
                <!-- Kartu landscape: rasio kartu pelajar 85.6 x 54 mm -->
                <div class="kartu-landscape bg-white dark:bg-[#1a2233] rounded-2xl shadow-xl ring-1 ring-gray-100 dark:ring-white/10 overflow-hidden relative mx-auto" style="max-width: 600px;">
                    <!-- Header biru (kiri-atas) -->
                    <div class="kartu-header">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center ring-1 ring-white/25">
                                    <i class="fas fa-school text-white text-sm"></i>
                                </div>
                                <div>
                                    <h2 class="text-white font-black tracking-wide leading-none">KARTU ABSENSI</h2>
                                    <p class="text-[9px] tracking-[0.25em] uppercase text-blue-200/80 mt-1">SIAKAD</p>
                                </div>
                            </div>
                            <span class="text-[9px] font-bold text-blue-200/80 border border-white/20 bg-white/10 px-2 py-1 rounded-md uppercase tracking-wider">${kelasSiswa}</span>
                        </div>
                        <!-- strip dekoratif -->
                        <div class="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300"></div>
                    </div>
                    <!-- Body: foto 3x4 kiri + identitas & QR kanan -->
                    <div class="kartu-body">
                        <div class="kartu-info-row">
                            <div class="kartu-foto-wrap relative">
                                ${fotoHtml}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Nama Siswa</p>
                                <h3 class="kartu-name truncate">${namaSiswa}</h3>
                                <div class="kartu-id mt-1.5">
                                    <p class="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Nomor Induk</p>
                                    <p class="kartu-nisn font-mono">${cleanNisn || '-'}</p>
                                </div>
                                <div class="kartu-tgl mt-1.5">
                                    <p class="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Tempat, Tanggal Lahir</p>
                                    <p class="kartu-tgl-val">${dataSiswa.tempatLahir ? dataSiswa.tempatLahir + ', ' : ''}${tglLahirSiswa}</p>
                                </div>
                                ${alamatSiswa ? `<div class="kartu-asal mt-1.5 truncate"><i class="fas fa-map-marker-alt mr-1"></i>${alamatSiswa}</div>` : ''}
                            </div>
                        </div>
                        <div class="kartu-qr-zone">
                            <div id="myQrcode"></div>
                        </div>
                    </div>
                    <input type="file" id="fotoSiswaInput" accept="image/jpeg,image/png,image/webp" class="hidden" onchange="uploadFotoProfilSiswa(this)">
                    <!-- Aksi -->
                    <div class="p-3 bg-gray-50 dark:bg-[#141b2c] border-t border-gray-100 dark:border-white/10 flex gap-2">
                        <button onclick="window.print()" class="flex-1 bg-[#1b2a4a] text-white py-2.5 rounded-lg font-bold text-xs shadow hover:bg-[#152238] transition flex items-center justify-center gap-1.5">
                            <i class="fas fa-print text-xs"></i> Cetak
                        </button>
                        <button onclick="closeModal()" class="flex-1 border border-gray-300 dark:border-white/15 text-gray-600 dark:text-slate-300 py-2.5 rounded-lg font-bold text-xs hover:bg-gray-100 dark:hover:bg-white/5 transition">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        `;
        showModal(content, 'max-w-[520px]');
        setTimeout(() => {
            const qrElement = document.getElementById("myQrcode");
            if (qrElement && cleanNisn) {
                qrElement.innerHTML = "";
                try {
                    new QRCode(qrElement, {
                        text: cleanNisn,
                        width: 120,
                        height: 120,
                        colorDark: "#1f2937",
                        colorLight: "#ffffff",
                        correctLevel : QRCode.CorrectLevel.L
                    });
                } catch (e) {
                    console.error("Gagal generate QR:", e);
                    qrElement.innerHTML = "<span class='text-red-500 text-xs'>Error Data</span>";
                }
            }
        }, 100);
    }

    if (!isSiswaRole && !isAlumniRole) {
        // Admin/guru: fetch detail siswa
        siakadRun
            .withSuccessHandler(res => {
                if (res && res.success && res.data) {
                    dataSiswa = res.data;
                    if (dataSiswa.nisn) {
                        cleanNisn = String(dataSiswa.nisn).replace(/[^a-zA-Z0-9]/g, "").trim();
                    }
                }
                buildAndShowModal();
            })
            .withFailureHandler(() => buildAndShowModal())
            .getSiswaByNisn(cleanNisn);
    } else {
        // Siswa/alumni: fetch dari DB untuk dapat tanggal lahir, foto, alamat lengkap
        siakadRun
            .withSuccessHandler(res => {
                if (res && res.success && res.data) {
                    dataSiswa = { ...dataSiswa, ...res.data };
                    if (dataSiswa.nisn) {
                        cleanNisn = String(dataSiswa.nisn).replace(/[^a-zA-Z0-9]/g, "").trim();
                    }
                    if (currentUser && (currentUser.role === 'siswa' || currentUser.role === 'alumni')) {
                        currentUser = { ...currentUser, ...res.data };
                        try { localStorage.setItem('absensiAppSession', JSON.stringify(currentUser)); } catch(e) {}
                    }
                }
                buildAndShowModal();
            })
            .withFailureHandler(() => buildAndShowModal())
            .getSiswaByNisn(cleanNisn);
    }
}
function uploadFotoProfilSiswa(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const nisn = currentUser ? currentUser.nisn : '';
    if (!nisn) { showAlert('error', 'NISN tidak ditemukan'); return; }
    // Resize ke rasio 3x4 (300x400) lewat canvas supaya hemat & rapi
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const targetW = 300, targetH = 400;
            const scale = Math.max(targetW / img.width, targetH / img.height);
            const sw = targetW / scale, sh = targetH / scale;
            canvas.width = targetW; canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, targetW, targetH);
            const fotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
            showLoading();
            siakadRun
                .withSuccessHandler(res => {
                    hideLoading();
                    if (res && res.success) {
                        currentUser.foto = fotoBase64;
                        try { localStorage.setItem('absensiAppSession', JSON.stringify(currentUser)); } catch(e) {}
                        showAlert('success', 'Foto profil diperbarui!');
                        loadQRCodeSiswa(nisn, currentUser.nama, currentUser.kelas);
                    } else {
                        showAlert('error', (res && res.message) || 'Gagal simpan foto');
                    }
                })
                .withFailureHandler(err => {
                    hideLoading();
                    showAlert('error', 'Gagal simpan foto: ' + (err && err.message ? err.message : ''));
                })
                .updateFotoSiswa(nisn, fotoBase64);
        };
        img.onerror = function() { showAlert('error', 'File gambar tidak valid'); };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
async function loadQRCodeGuru(nipParam, namaParam, jabatanParam) {
    await ensureLib('qrcodejs');
    if (typeof stopAndBack === "function") stopAndBack(false);
    const namaGuru = namaParam || (currentUser ? currentUser.nama : "Guru");
    const jabatanGuru = jabatanParam || '-';
    let cleanNip = String(nipParam || '').replace(/[^a-zA-Z0-9]/g, "").trim();

    const content = `
        <div class="bg-gradient-to-r from-[#1b2a4a] to-[#152238] px-4 py-3 text-white flex justify-between items-center shrink-0">
            <h3 class="text-base font-bold tracking-tight">Kartu Absensi Guru</h3>
            <button onclick="closeModal()" class="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-white">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="p-4">
            <!-- Kartu landscape: rasio kartu pelajar 85.6 x 54 mm -->
            <div class="kartu-landscape bg-white dark:bg-[#1a2233] rounded-2xl shadow-xl ring-1 ring-gray-100 dark:ring-white/10 overflow-hidden relative mx-auto" style="max-width: 600px;">
                <!-- Header biru (kiri-atas) -->
                <div class="kartu-header">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center ring-1 ring-white/25">
                                <i class="fas fa-user-tie text-white text-sm"></i>
                            </div>
                            <div>
                                <h2 class="text-white font-black tracking-wide leading-none">KARTU ABSENSI GURU</h2>
                                <p class="text-[9px] tracking-[0.25em] uppercase text-blue-200/80 mt-1">SIAKAD</p>
                            </div>
                        </div>
                        <span class="text-[9px] font-bold text-blue-200/80 border border-white/20 bg-white/10 px-2 py-1 rounded-md uppercase tracking-wider">${jabatanGuru}</span>
                    </div>
                    <!-- strip dekoratif -->
                    <div class="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300"></div>
                </div>
                <!-- Body: avatar kiri + identitas & QR kanan (struktur sama seperti kartu siswa, biar rapi & konsisten) -->
                <div class="kartu-body">
                    <div class="flex items-center gap-3">
                        <div class="kartu-foto-wrap">
                            <div class="kartu-avatar">${(namaGuru || '?').charAt(0).toUpperCase()}</div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Nama Guru</p>
                            <h3 class="kartu-name truncate">${namaGuru}</h3>
                            <div class="kartu-id mt-1.5">
                                <p class="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">NIP / NUPTK</p>
                                <p class="kartu-nisn font-mono">${cleanNip || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="kartu-qr-zone">
                        <div id="myQrcode"></div>
                    </div>
                </div>
                <!-- Aksi -->
                <div class="p-3 bg-gray-50 dark:bg-[#141b2c] border-t border-gray-100 dark:border-white/10 flex gap-2">
                    <button onclick="window.print()" class="flex-1 bg-[#1b2a4a] text-white py-2.5 rounded-lg font-bold text-xs shadow hover:bg-[#152238] transition flex items-center justify-center gap-1.5">
                        <i class="fas fa-print text-xs"></i> Cetak
                    </button>
                    <button onclick="closeModal()" class="flex-1 border border-gray-300 dark:border-white/15 text-gray-600 dark:text-slate-300 py-2.5 rounded-lg font-bold text-xs hover:bg-gray-100 dark:hover:bg-white/5 transition">
                        Tutup
                    </button>
                </div>
            </div>
        </div>`;

    showModal(content, 'max-w-[520px]');

    setTimeout(() => {
        const qrElement = document.getElementById("myQrcode");
        if (qrElement && cleanNip) {
            qrElement.innerHTML = "";
            try {
                new QRCode(qrElement, {
                    text: cleanNip,
                    width: 120,
                    height: 120,
                    colorDark: "#1f2937",
                    colorLight: "#ffffff",
                    correctLevel : QRCode.CorrectLevel.L
                });
            } catch (e) {
                console.error("Gagal generate QR:", e);
                qrElement.innerHTML = "<span class='text-red-500 text-xs'>Error Data</span>";
            }
        }
    }, 100);
}
function generateQRForGuru(nip, nama, jabatan) {
    loadQRCodeGuru(nip, nama, jabatan);
}
let siswaLocalCache = {}; 
let siswaLocalCacheLoaded = false;
let jadwalMapelHariIni = []; 
let mapelDipilih = null;     
function loadJadwalMapelHariIni() {
    const wrap = document.getElementById('mapelPickerWrap');
    if (!wrap) return;
    wrap.innerHTML = '<div class="text-[10px] text-gray-400 flex items-center gap-1"><i class="fas fa-spinner fa-spin"></i> Memuat jadwal...</div>';
    const myKelas = currentUser ? (currentUser.kelas || '') : '';
    siakadRun
        .withSuccessHandler(res => {
            jadwalMapelHariIni = res.data || [];
            renderMapelPicker(res.hari || '');
        })
        .withFailureHandler(() => {
            wrap.innerHTML = '<div class="text-[10px] text-red-400">Gagal memuat jadwal mapel</div>';
        })
        .getJadwalHariIni(myKelas || null);
}
function renderMapelPicker(hari) {
    const wrap = document.getElementById('mapelPickerWrap');
    if (!wrap) return;
    mapelDipilih = null;
    if (!jadwalMapelHariIni.length) {
        wrap.innerHTML = `<div class="text-[10px] text-amber-500 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
            <i class="fas fa-circle-info"></i>
            <span>Tidak ada jadwal mapel hari ${hari}. Absensi menggunakan jam global.</span>
        </div>`;
        return;
    }
    let html = `<div class="space-y-1.5">
        <div class="flex items-center justify-between mb-1">
            <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pilih Mapel (${hari})</p>
            <span class="text-[10px] text-red-400 font-semibold"><i class="fas fa-circle-exclamation mr-1"></i>Wajib dipilih</span>
        </div>`;
    jadwalMapelHariIni.forEach((m, i) => {
        html += `<button onclick="pilihMapel(${i})" id="btnMapel_${i}"
            class="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-[#e8ecf4] transition group mapel-btn">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-800 group-hover:text-[#152238]">${m.mapel}</span>
                <span class="text-[10px] font-mono bg-gray-100 group-hover:bg-[#d0d8e8] text-gray-500 group-hover:text-[#1b2a4a] px-2 py-0.5 rounded-full">${m.jam_mulai} - ${m.jam_selesai}</span>
            </div>
            ${m.pengajar ? `<div class="text-[10px] text-gray-400 mt-0.5">${m.pengajar}</div>` : ''}
        </button>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
}
function pilihMapel(idx) {
    const mapelBaru = jadwalMapelHariIni[idx] || null;
    if (!mapelBaru) return;
    const sudahAdaSiswa = scanLiveCount > 0;
    const mapelBerubah = mapelDipilih && mapelDipilih.mapel !== mapelBaru.mapel;
    if (sudahAdaSiswa && mapelBerubah) {
        Swal.fire({
            title: 'Ganti Mapel?',
            html: `Antrian <b>${scanLiveCount} siswa</b> untuk mapel <b>${mapelDipilih.mapel}</b> akan dihapus. Pastikan sudah dikirim terlebih dahulu.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#3d5478',
            confirmButtonText: 'Ya, Ganti',
            cancelButtonText: 'Batal'
        }).then(res => {
            if (res.isConfirmed) {
                resetScanTable();
                _terapkanPilihMapel(idx, mapelBaru);
            }
        });
        return;
    }
    _terapkanPilihMapel(idx, mapelBaru);
}
function _terapkanPilihMapel(idx, mapelBaru) {
    mapelDipilih = mapelBaru;
    document.querySelectorAll('.mapel-btn').forEach((b, i) => {
        if (i === idx) {
            b.className = b.className.replace('border-gray-200', 'border-blue-400 bg-[#e8ecf4]');
        } else {
            b.className = b.className.replace('border-blue-400 bg-[#e8ecf4]', 'border-gray-200');
        }
    });
    updateScannerHeader(mapelDipilih);
    updateBatchBtn();
}
function updateScannerHeader(m) {
    const el = document.getElementById('scannerMapelInfo');
    if (!el) return;
    if (!m) {
        el.innerHTML = '';
        el.classList.add('hidden');
        return;
    }
    el.classList.remove('hidden');
    el.innerHTML = `<i class="fas fa-book-open mr-1.5"></i>${m.mapel}
        <span class="ml-2 font-mono text-blue-200 text-[10px]">${m.jam_mulai} - ${m.jam_selesai}</span>`;
}
function loadScanAbsensi() {
    loadAbsensi('siswa');
}
    function loadScanQR(defaultMode) {
        const mode = defaultMode || window._lastScanQRMode || 'siswa';
        loadAbsensi(mode);
        setTimeout(() => _renderScanQRModeToggle(mode), 80);
    }
    function _renderScanQRModeToggle(activeMode) {
        let container = document.getElementById('scanQRModeToggle');
        if (!container) {
            const view = document.getElementById('view-absensi');
            if (!view) return;
            container = document.createElement('div');
            container.id = 'scanQRModeToggle';
            container.className = 'flex items-center gap-2 mb-4 px-1';
            view.insertBefore(container, view.firstChild);
        }
        container.innerHTML = `
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Filter:</span>
            <button id="scanQRBtnSiswa"
                onclick="loadScanQR('siswa')"
                class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150
                    ${activeMode === 'siswa'
                        ? 'bg-[#1b2a4a] text-white border-blue-600 shadow'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-[#1b2a4a]'}">
                <i class="fas fa-user-graduate text-xs"></i> Siswa
            </button>
            <button id="scanQRBtnGuru"
                onclick="loadScanQR('guru')"
                class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150
                    ${activeMode === 'guru'
                        ? 'bg-[#1b2a4a] text-white border-blue-600 shadow'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-[#1b2a4a]'}">
                <i class="fas fa-chalkboard-teacher text-xs"></i> Guru
            </button>
        `;
        window._lastScanQRMode = activeMode;
    }
    function setScanMode(mode) {}
    function loadAbsensi(defaultTab = 'siswa') {
        setActiveMenu('Absensi');
        showView('view-absensi');
        switchAbsensiTab(defaultTab);
    }
    function switchAbsensiTab(tab) {
        setTimeout(() => _renderScanQRModeToggle(tab), 50);
        const tabSiswa = document.getElementById('absensiTabSiswa');
        const tabGuru  = document.getElementById('absensiTabGuru');
        const panelSiswa = document.getElementById('absensiPanelSiswa');
        const panelGuru  = document.getElementById('absensiPanelGuru');
        if (tabSiswa) tabSiswa.classList.toggle('active-tab', tab === 'siswa');
        if (tabGuru)  tabGuru.classList.toggle('active-tab', tab === 'guru');
        if (panelSiswa) panelSiswa.style.display = tab === 'siswa' ? '' : 'none';
        if (panelGuru)  panelGuru.style.display  = tab === 'guru'  ? '' : 'none';
        if (tab === 'siswa') {
            isScanning = false;
            scanMode = 'siswa';
            stopPolling();
            setTimeout(() => {
                const inp = document.getElementById('qrFileInput');
                if (inp) inp.value = '';
                const fr = document.getElementById('fileResult');
                if (fr) fr.innerHTML = '';
                const ps = document.getElementById('pollingStatus');
                if (ps) ps.classList.add('hidden');
            }, 100);
            loadJadwalMapelHariIni();
            if (!siswaLocalCacheLoaded) {
                const cacheStatus = document.getElementById('scanCacheStatus');
                if (cacheStatus) {
                    cacheStatus.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memuat data siswa...';
                    cacheStatus.className = 'text-xs text-yellow-500';
                    cacheStatus.classList.remove('hidden');
                }
                siakadRun
                    .withSuccessHandler(res => {
                        if (res.success) {
                            siswaLocalCache = {};
                            res.data.forEach(s => {
                                const cleanKey = String(s.nisn || '').replace(/[^a-zA-Z0-9]/g, '').trim();
                                if (cleanKey) siswaLocalCache[cleanKey] = { nama: s.nama, kelas: s.kelas };
                            });
                            siswaLocalCacheLoaded = true;
                            if (cacheStatus) {
                                cacheStatus.innerHTML = '<i class="fas fa-circle-check mr-1"></i> ' + res.data.length + ' siswa siap discan';
                                cacheStatus.className = 'text-xs text-[#1b2a4a]';
                                setTimeout(() => cacheStatus.classList.add('hidden'), 3000);
                            }
                        }
                    })
                    .withFailureHandler(() => {
                        if (cacheStatus) {
                            cacheStatus.innerHTML = '<i class="fas fa-triangle-exclamation mr-1"></i> Gagal muat data';
                            cacheStatus.className = 'text-xs text-red-400';
                        }
                    })
                    .getSiswaForScanCache();
            }
        } else if (tab === 'guru') {
            _loadScanAbsensiGuruInternal();
        }
    }
    let cameraPopup = null;
    let cameraPopupContext = null;
    // Helper: kirim feedback ke inline modal ATAU popup (jika ada)
    function _sendCameraFeedback(type, nama, kelas) {
        var modal = document.getElementById('qrCameraModal');
        var isModalOpen = modal && (modal.style.display === 'flex' || modal.classList.contains('active'));
        if (isModalOpen) {
            // Kirim ke inline modal via postMessage ke diri sendiri
            try { window.postMessage({ type: type, nama: nama || '', kelas: kelas || '' }, '*'); } catch(e) {}
        } else if (cameraPopup && !cameraPopup.closed) {
            try { cameraPopup.postMessage({ type: type, nama: nama || '', kelas: kelas || '' }, '*'); } catch(e) {}
        }
    }
    let pollingInterval = null;
    const LS_KEY = 'siakad_qr_result';
    function stopPolling() {
        if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
        ['pollingStatus', 'pollingStatusGuru', 'dhPollingStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        const dhBtn = document.getElementById('dhCamBtn');
        if (dhBtn) {
            dhBtn.classList.remove('hidden');
            dhBtn.innerHTML = '<i class="fas fa-camera text-base"></i> Buka Kamera Live';
        }
    }
    window.addEventListener('message', function(event) {
        if (!event.data || event.data.type !== 'QR_SCAN_RESULT') return;
        var nisn = event.data.nisn;
        if (!nisn || typeof nisn !== 'string') return;
        if (event.data.ts && (Date.now() - event.data.ts) > 30000) return;
        onScanRouted(nisn);
    });
    function onScanRouted(text) {
        if (scanMode === 'guru') onScanSuccessGuru(text);
        else if (scanMode === 'daftar-hadir') {
            dhOnScanResult(text);
            if (cameraPopup && !cameraPopup.closed) {
                const key = String(text).replace(/[^a-zA-Z0-9]/g,'').trim();
                // PERBAIKAN: overlay feedback kamera sebelumnya SELALU mencocokkan
                // hasil scan ke daftar siswa (dhStudents), walaupun tab yang aktif
                // adalah "Guru" — sehingga scan QR guru yang valid & tersimpan tetap
                // ditampilkan sebagai "Id Tidak Dikenal" di popup kamera.
                if (typeof dhModeFilter !== 'undefined' && dhModeFilter === 'guru') {
                    const guru = (Array.isArray(dhGuruList) ? dhGuruList : [])
                        .find(g => String(g.nip || '').replace(/[^a-zA-Z0-9]/g,'').trim() === key);
                    if (guru) {
                        _sendCameraFeedback('SCAN_SUCCESS', guru.nama, guru.jabatan || '');
                    } else {
                        _sendCameraFeedback('SCAN_ERROR', 'NIP Tidak Dikenal', 'NIP tidak terdaftar sebagai guru');
                    }
                } else {
                    const siswa = dhStudents.find(s => s.nisn === key);
                    if (siswa) {
                        _sendCameraFeedback('SCAN_SUCCESS', siswa.nama, '');
                    } else {
                        _sendCameraFeedback('SCAN_ERROR', 'Id Tidak Dikenal', 'Id tidak ada di kelas ini');
                    }
                }
            }
        }
        else onScanSuccess(text);
    }
    window.onScanRouted = onScanRouted; // expose for inline camera modal
    function startPolling() {
        stopPolling();
        try { localStorage.removeItem(LS_KEY); } catch(e) {}
        const psId = scanMode === 'guru' ? 'pollingStatusGuru' : scanMode === 'daftar-hadir' ? 'dhPollingStatus' : 'pollingStatus';
        const ps = document.getElementById(psId);
        if (ps) ps.classList.remove('hidden');
        pollingInterval = setInterval(() => {
            if (cameraPopup && cameraPopup.closed) {
                cameraPopup = null;
                stopPolling();
                return;
            }
            try {
                const raw = localStorage.getItem(LS_KEY);
                if (!raw) return;
                const data = JSON.parse(raw);
                if (Date.now() - data.ts > 30000) { localStorage.removeItem(LS_KEY); return; }
                localStorage.removeItem(LS_KEY);
                onScanRouted(data.nisn);
            } catch(e) {}
        }, 300);
    }
    function openCameraPopup() {
        if (scanMode !== 'guru' && scanMode !== 'daftar-hadir') scanMode = 'siswa';
        // Gunakan modal kamera inline  tidak perlu popup/tab baru
        if (true) { console.log("Calling openQRCameraModal");
            window.openQRCameraModal();
        }
    }
    async function scanFromFile(input) {
        if (!input.files || !input.files[0]) return;
        await ensureLib('html5qrcode');
        scanMode = 'siswa';
        const resDiv = document.getElementById('fileResult');
        resDiv.innerHTML = `<div class="text-center text-[#1b2a4a] text-sm py-3 animate-pulse"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memindai QR...</div>`;
        Html5Qrcode.scanFile(input.files[0], true)
            .then(decodedText => { resDiv.innerHTML = ''; onScanSuccess(decodedText); })
            .catch(() => { resDiv.innerHTML = `<div class="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-xs text-center">QR tidak terdeteksi. Coba foto lebih dekat.</div>`; });
        input.value = '';
    }
    function submitManualNisn() {
        const nisn = document.getElementById('manualNisn')?.value?.trim();
        if (!nisn) { showAlert('error', 'Masukkan Id terlebih dahulu'); return; }
        document.getElementById('manualNisn').value = '';
        scanMode = 'siswa';
        onScanSuccess(nisn);
    }
function onScanSuccess(decodedText) {
    if (!decodedText || decodedText.trim() === "" || decodedText === "undefined") return;
    if (isScanning) return;
    const key = String(decodedText).replace(/[^a-zA-Z0-9]/g, '').trim();
    if (!mapelDipilih) {
        Swal.fire({
            icon: 'warning',
            title: 'Pilih Mapel Dulu!',
            text: 'Silakan pilih mata pelajaran yang sedang berlangsung sebelum melakukan scan absensi.',
            confirmButtonColor: '#2563eb'
        });
        return;
    }
    const dupKey = key + '|' + mapelDipilih.mapel;
    if (scanLiveMap[dupKey]) {
        siakadBeep('warning');
        siakadVibrate([60, 60, 60]);
        highlightScanRow(scanLiveMap[dupKey], document.getElementById('scanTableWrapper'));
        {
            const tr = scanLiveMap[dupKey];
            const namaEl  = tr ? tr.querySelector('td:nth-child(2) .font-bold') : null;
            const kelasEl = tr ? tr.querySelector('td:nth-child(3) span') : null;
            _sendCameraFeedback('SCAN_DUPLICATE', namaEl ? namaEl.textContent : key, kelasEl ? kelasEl.textContent : '');
        }
        return;
    }
    isScanning = true;
    if (siswaLocalCacheLoaded && siswaLocalCache[key]) {
        const found = siswaLocalCache[key];
        isScanning = false;
        addToScanQueue({ nisn: key, nama: found.nama, kelas: found.kelas });
        _sendCameraFeedback('SCAN_SUCCESS', found.nama, found.kelas);
    } else {
        siakadRun
            .withSuccessHandler(result => {
                isScanning = false;
                if (result && result.success && result.data) {
                    const data = result.data;
                    addToScanQueue({ nisn: key, nama: data.nama, kelas: data.kelas });
                    _sendCameraFeedback('SCAN_SUCCESS', data.nama, data.kelas);
                } else {
                    siakadBeep('error');
                    showAlert('error', 'Id [' + key + '] tidak terdaftar');
                    _sendCameraFeedback('SCAN_ERROR', 'Id Tidak Dikenal', 'Id tidak terdaftar');
                }
            })
            .withFailureHandler(err => {
                isScanning = false;
                siakadBeep('error');
                showAlert('error', 'Id [' + key + '] tidak terdaftar');
                _sendCameraFeedback('SCAN_ERROR', 'Id Tidak Dikenal', 'Id tidak terdaftar');
            })
            .getSiswaByNisn(key);
    }
}
    function showScanModal(content) {}
    function closeScanModal() { isScanning = false; }
    function addToScanQueue(siswa) {
        siakadBeep('success');
        siakadVibrate(120);
        const tbody   = document.getElementById('tbody-scan-live');
        const wrapper = document.getElementById('scanTableWrapper');
        if (!tbody) return;
        const emptyRow = document.getElementById('scan-empty-row');
        if (emptyRow) emptyRow.remove();
        const now = new Date();
        const jamScan = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const namaMapelScan = mapelDipilih ? mapelDipilih.mapel : '';
        const jamMapelInfo  = mapelDipilih ? `${mapelDipilih.jam_mulai} - ${mapelDipilih.jam_selesai}` : '';
        const dupKey = siswa.nisn + '|' + namaMapelScan;
        scanLiveCount++;
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-50 transition-colors duration-700 scan-row-highlight';
        tr.setAttribute('data-nisn', siswa.nisn);
        tr.setAttribute('data-dupkey', dupKey);
        tr.innerHTML = `
            <td class="px-3 py-3 text-center text-xs text-gray-400 font-mono">${scanLiveCount}</td>
            <td class="px-4 py-3">
                <div class="font-bold text-sm text-gray-900">${siswa.nama}</div>
                <div class="text-[10px] text-gray-400 font-mono">${siswa.nisn}</div>
                ${namaMapelScan ? `<div class="text-[10px] text-blue-500 font-semibold mt-0.5"><i class="fas fa-book-open mr-1"></i>${namaMapelScan} <span class="text-gray-400 font-mono">${jamMapelInfo}</span></div>` : ''}
            </td>
            <td class="px-3 py-3 text-center">
                <span class="bg-[#e8ecf4] text-[#1b2a4a] px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">${siswa.kelas}</span>
            </td>
            <td class="px-3 py-3 text-center text-xs font-mono text-gray-600">${jamScan}</td>
            <td class="px-3 py-3 text-center">
                <button onclick="removeScanRow(this, '${dupKey}')" class="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-100 hover:text-red-500 transition mx-auto" title="Hapus dari antrian">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        scanLiveMap[dupKey] = tr;
        const badge = document.getElementById('scanCountBadge');
        if (badge) badge.textContent = scanLiveCount + ' Siswa';
        updateBatchBtn();
        highlightScanRow(tr, wrapper);
    }
    function removeScanRow(btn, dupKey) {
        const tr = btn.closest('tr');
        if (!tr) return;
        tr.remove();
        delete scanLiveMap[dupKey];
        const rows = document.querySelectorAll('#tbody-scan-live tr[data-nisn]');
        rows.forEach((r, i) => { r.cells[0].textContent = i + 1; });
        scanLiveCount = rows.length;
        const badge = document.getElementById('scanCountBadge');
        if (badge) badge.textContent = scanLiveCount + ' Siswa';
        if (scanLiveCount === 0) {
            const tbody = document.getElementById('tbody-scan-live');
            tbody.innerHTML = `<tr id="scan-empty-row"><td colspan="5" class="py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                    <i class="fas fa-qrcode text-3xl text-gray-200"></i>
                    <p class="font-semibold text-sm text-gray-400">Belum ada siswa dalam antrian</p>
                    <p class="text-xs text-gray-300">Scan QR untuk menambahkan siswa</p>
                </div></td></tr>`;
        }
        updateBatchBtn();
    }
    function updateBatchBtn() {
        const btn   = document.getElementById('btnSubmitBatch');
        const label = document.getElementById('btnSubmitBatchLabel');
        if (!btn) return;
        const siapKirim = scanLiveCount > 0 && mapelDipilih;
        if (siapKirim) {
            btn.disabled = false;
            btn.style.pointerEvents = '';
            btn.className = 'w-full py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 bg-[#1b2a4a] hover:bg-[#152238] active:scale-95 text-white shadow-md shadow-blue-200';
            label.textContent = `Kirim Absensi ${mapelDipilih.mapel} (${scanLiveCount} Siswa)`;
        } else if (scanLiveCount > 0 && !mapelDipilih) {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.className = 'w-full py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 bg-amber-100 text-amber-600 cursor-not-allowed';
            label.textContent = '&#9888; Pilih mapel dulu sebelum kirim';
        } else {
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
            btn.className = 'w-full py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 bg-gray-200 text-gray-400 cursor-not-allowed';
            label.textContent = 'Kirim Absensi (0 Siswa)';
        }
    }
    function submitBatchAbsensi() {
        if (scanLiveCount === 0) return;
        if (!mapelDipilih) {
            Swal.fire({
                icon: 'warning',
                title: 'Pilih Mapel Dulu!',
                text: 'Absensi harus dikaitkan dengan mata pelajaran. Pilih mapel yang sedang berlangsung.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }
        const rows = document.querySelectorAll('#tbody-scan-live tr[data-nisn]');
        const nisnList = Array.from(rows).map(r => r.getAttribute('data-nisn'));
        const myRole  = currentUser ? currentUser.role  : '';
        const myKelas = currentUser ? currentUser.kelas : '';
        const namaMapel = mapelDipilih.mapel;
        const jamMapel  = { jam_mulai: mapelDipilih.jam_mulai, jam_selesai: mapelDipilih.jam_selesai };
        const mapelInfo = `<div class="mt-1 text-xs text-[#1b2a4a] font-semibold"><i class="fas fa-book-open mr-1"></i>${namaMapel} (${mapelDipilih.jam_mulai} - ${mapelDipilih.jam_selesai})</div>`;
        Swal.fire({
            title: `Kirim ${nisnList.length} Absensi?`,
            html: `<p style="color:#5b7aaa;font-size:13px">Data akan dikirim sekaligus ke server dan dicatat secara permanen.</p>${mapelInfo}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#3d5478',
            confirmButtonText: '\u2713 Ya, Kirim Sekarang',
            cancelButtonText: 'Batal'
        }).then(res => {
            if (!res.isConfirmed) return;
            showLoading();
            siakadRun
                .withSuccessHandler(result => {
                    hideLoading();
                    if (result.success) {
                        showBatchResultModal(result.results);
                        resetScanTable();
                    } else {
                        Swal.fire('Gagal', result.message, 'error');
                    }
                })
                .withFailureHandler(err => {
                    hideLoading();
                    Swal.fire('Error Server', err.message || String(err), 'error');
                })
                .batchScanAbsensi(nisnList, myRole, myKelas, namaMapel, jamMapel);
        });
    }
    function showBatchResultModal(results) {
        const berhasil = results.filter(r => r.success);
        const gagal    = results.filter(r => !r.success);
        const berhasilHtml = berhasil.map(r =>
            `<div class="flex items-center gap-2 py-1 border-b border-gray-50">
                <span class="text-blue-500 text-xs">\u2713</span>
                <div class="flex-1 text-left">
                    <span class="font-semibold text-xs text-gray-800">${r.nama}</span>
                    <span class="text-[10px] text-gray-400"> (${r.kelas})</span>
                    ${r.mapel ? `<span class="ml-1 text-[10px] bg-[#e8ecf4] text-[#1b2a4a] px-1.5 py-0.5 rounded font-semibold">${r.mapel}</span>` : ''}
                </div>
                <span class="text-[10px] text-gray-400 font-mono">${r.jamDatang || r.jamPulang || ''}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded ${r.type==='datang' ? 'bg-[#d0d8e8] text-[#152238]' : 'bg-[#d0d8e8] text-[#152238]'}">${r.type==='datang' ? 'Masuk' : 'Pulang'}</span>
            </div>`
        ).join('');
        const gagalHtml = gagal.length > 0 ? `
            <div class="mt-3 bg-red-50 rounded-xl p-3 border border-red-100">
                <p class="text-xs font-bold text-red-600 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i> ${gagal.length} Gagal</p>
                ${gagal.map(r => `<div class="text-xs text-red-500 py-0.5">\u2022 ${r.nama || r.nisn}: ${r.message}</div>`).join('')}
            </div>` : '';
        Swal.fire({
            title: `<span style="font-size:18px">\u2705 Absensi Tersimpan</span>`,
            html: `
                <div style="text-align:center;margin-bottom:12px">
                    <span style="font-size:13px;color:#5b7aaa">${berhasil.length} dari ${results.length} data berhasil disimpan</span>
                </div>
                <div style="max-height:300px;overflow-y:auto;text-align:left;padding:0 4px">
                    ${berhasilHtml}
                </div>
                ${gagalHtml}`,
            icon: berhasil.length === results.length ? 'success' : 'warning',
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#111827',
        });
    }
    function highlightScanRow(tr, wrapper) {
        document.querySelectorAll('.scan-row-highlight').forEach(el => el.classList.remove('scan-row-highlight'));
        tr.classList.add('scan-row-highlight');
        const wrapperEl = wrapper || document.getElementById('scanTableWrapper');
        if (wrapperEl && tr) {
            wrapperEl.scrollTo({ top: tr.offsetTop - (wrapperEl.clientHeight / 2) + (tr.offsetHeight / 2), behavior: 'smooth' });
        }
        setTimeout(() => tr.classList.remove('scan-row-highlight'), 3000);
    }
    function resetScanTable() {
        const tbody = document.getElementById('tbody-scan-live');
        if (!tbody) return;
        tbody.innerHTML = `<tr id="scan-empty-row"><td colspan="5" class="py-16 text-center">
            <div class="flex flex-col items-center gap-3">
                <i class="fas fa-qrcode text-3xl text-gray-200"></i>
                <p class="font-semibold text-sm text-gray-400">Belum ada siswa dalam antrian</p>
                <p class="text-xs text-gray-300">Scan QR untuk menambahkan siswa</p>
            </div></td></tr>`;
        scanLiveCount = 0;
        scanLiveMap   = {};
        const badge = document.getElementById('scanCountBadge');
        if (badge) badge.textContent = '0 Siswa';
        updateBatchBtn();
    }
    function updateScanLiveTable() {}
    function loadScanAbsensiGuru() {
        loadAbsensi('guru');
    }
    function _loadScanAbsensiGuruInternal() {
        isScanning = false;
        scanMode = 'guru';
        setActiveMenu('Absensi');
        showView('view-absensi');
        switchAbsensiTab('guru');
        stopPolling();
        cekStatusAlfaOtomatisGuru();
        setTimeout(() => {
            const inp = document.getElementById('qrFileInputGuru');
            if (inp) inp.value = '';
            const fr = document.getElementById('fileResultGuru');
            if (fr) fr.innerHTML = '';
            const ps = document.getElementById('pollingStatusGuru');
            if (ps) ps.classList.add('hidden');
        }, 100);
        if (!guruLocalCacheLoaded) {
            const cacheStatus = document.getElementById('scanCacheStatusGuru');
            if (cacheStatus) {
                cacheStatus.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memuat data guru...';
                cacheStatus.className = 'text-xs text-yellow-500';
                cacheStatus.classList.remove('hidden');
            }
            siakadRun
                .withSuccessHandler(res => {
                    if (res.success) {
                        guruLocalCache = {};
                        res.data.forEach(g => {
                            const cleanKey = String(g.nip || '').replace(/[^a-zA-Z0-9]/g, '').trim();
                            if (cleanKey) guruLocalCache[cleanKey] = { nama: g.nama, jabatan: g.jabatan, mapelList: g.mapelList || [] };
                        });
                        guruLocalCacheLoaded = true;
                        if (cacheStatus) {
                            cacheStatus.innerHTML = '<i class="fas fa-circle-check mr-1"></i> ' + res.data.length + ' guru siap discan';
                            cacheStatus.className = 'text-xs text-[#1b2a4a]';
                            setTimeout(() => cacheStatus.classList.add('hidden'), 3000);
                        }
                    }
                })
                .withFailureHandler(() => {
                    if (cacheStatus) {
                        cacheStatus.innerHTML = '<i class="fas fa-triangle-exclamation mr-1"></i> Gagal muat data, scan akan lebih lambat';
                        cacheStatus.className = 'text-xs text-red-400';
                    }
                })
                .getGuruForScanCache();
        }
    }
    function openCameraPopupGuru() {
        scanMode = 'guru';
        openCameraPopup();
    }
    function cekStatusAlfaOtomatisGuru() {
        // Trigger otomatis alfa guru tidak digunakan di mode lokal
    }
    async function scanFromFileGuru(input) {
        if (!input.files || !input.files[0]) return;
        await ensureLib('html5qrcode');
        scanMode = 'guru';
        const resDiv = document.getElementById('fileResultGuru');
        if (resDiv) resDiv.innerHTML = `<div class="text-center text-[#1b2a4a] text-sm py-3 animate-pulse"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memindai QR...</div>`;
        Html5Qrcode.scanFile(input.files[0], true)
            .then(decodedText => { if (resDiv) resDiv.innerHTML = ''; onScanSuccessGuru(decodedText); })
            .catch(() => { if (resDiv) resDiv.innerHTML = `<div class="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-xs text-center">QR tidak terdeteksi. Coba foto lebih dekat.</div>`; });
        input.value = '';
    }
    function submitManualNipGuru() {
        const nip = document.getElementById('manualNipGuru')?.value?.trim();
        if (!nip) { showAlert('error', 'Masukkan NIP terlebih dahulu'); return; }
        document.getElementById('manualNipGuru').value = '';
        scanMode = 'guru';
        onScanSuccessGuru(nip);
    }
    function onScanSuccessGuru(decodedText) {
        if (!decodedText || decodedText.trim() === "" || decodedText === "undefined") return;
        if (isScanning) return;
        const key = String(decodedText).replace(/[^a-zA-Z0-9]/g, '').trim();
        if (scanLiveMapGuru[key]) {
            siakadBeep('warning');
            siakadVibrate([60, 60, 60]);
            const tr = scanLiveMapGuru[key];
            if (tr && tr.tagName === 'TR') {
                highlightScanRowGuru(tr, document.getElementById('scanTableWrapperGuru'));
            }
            return;
        }
        isScanning = true;
        scanLiveMapGuru[key] = 'processing';
        const namaHint = (guruLocalCacheLoaded && guruLocalCache[key]) ? guruLocalCache[key].nama : null;
        const jabatanHint = (guruLocalCacheLoaded && guruLocalCache[key]) ? guruLocalCache[key].jabatan : null;
        const tr = addScanRowGuru(key, namaHint, jabatanHint, 'saving');
        scanLiveMapGuru[key] = tr;
        runScanAbsensiGuru(key, tr, undefined);
    }
    function runScanAbsensiGuru(key, tr, mapel) {
        siakadRun
            .withSuccessHandler(result => {
                isScanning = false;
                if (result && result.needMapelPicker) {
                    showMapelPickerGuru(tr, key, result.mapelList || []);
                    return;
                }
                updateScanRowGuruResult(tr, result);
                if (result.success) { siakadBeep('success'); siakadVibrate(120); } else { siakadBeep('error'); }
                if (cameraPopup && !cameraPopup.closed) {
                    if (result.success) {
                        _sendCameraFeedback('SCAN_SUCCESS', result.nama, result.jabatan || '');
                    } else {
                        _sendCameraFeedback('SCAN_ERROR', 'Id Tidak Dikenal', result.message || 'Tidak ditemukan');
                    }
                }
            })
            .withFailureHandler(err => {
                isScanning = false;
                siakadBeep('error');
                updateScanRowGuruResult(tr, { success: false, message: 'Error: ' + (err.message || String(err)) });
                {
                    _sendCameraFeedback('SCAN_ERROR', 'Error Server', 'Error server');
                }
            })
            .scanAbsensiGuru(key, mapel);
    }
    function showMapelPickerGuru(tr, key, mapelList) {
        if (!tr) return;
        const mapelTd = tr.children[3];
        const statusTd = tr.children[5];
        if (mapelTd) {
            mapelTd.innerHTML = mapelList.map(m =>
                `<button onclick="pilihMapelGuru('${key}', '${String(m).replace(/'/g, "\\'")}', this)" class="block w-full mb-1 last:mb-0 px-2 py-1 bg-[#e8ecf4] hover:bg-[#d0d8e8] text-[#152238] rounded text-[10px] font-bold border border-blue-100">${m}</button>`
            ).join('');
        }
        if (statusTd) {
            statusTd.innerHTML = `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500"><i class="fas fa-hand-pointer"></i> Pilih mapel</span>`;
        }
    }
    function pilihMapelGuru(key, mapel, btnEl) {
        const tr = btnEl ? btnEl.closest('tr') : null;
        if (!tr) return;
        const mapelTd = tr.children[3];
        if (mapelTd) mapelTd.innerHTML = `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500"><i class="fas fa-circle-notch fa-spin"></i> Menyimpan...</span>`;
        isScanning = true;
        runScanAbsensiGuru(key, tr, mapel);
    }
    function addScanRowGuru(nip, namaHint, jabatanHint) {
        const tbody = document.getElementById('tbody-scan-live-guru');
        const wrapper = document.getElementById('scanTableWrapperGuru');
        if (!tbody) return null;
        const emptyRow = document.getElementById('scan-empty-row-guru');
        if (emptyRow) emptyRow.remove();
        scanLiveCountGuru++;
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-50 transition-colors duration-700 scan-row-highlight';
        tr.setAttribute('data-nip', nip);
        tr.innerHTML = `
            <td class="px-3 py-3 text-center text-xs text-gray-400 font-mono">${scanLiveCountGuru}</td>
            <td class="px-4 py-3">
                <div class="font-bold text-sm text-gray-900">${namaHint || nip}</div>
                <div class="text-[10px] text-gray-400 font-mono">${nip}</div>
            </td>
            <td class="px-3 py-3 text-center">
                <span class="bg-[#e8ecf4] text-[#1b2a4a] px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">${jabatanHint || '-'}</span>
            </td>
            <td class="px-3 py-3 text-center text-xs text-gray-500">-</td>
            <td class="px-3 py-3 text-center text-xs font-mono text-gray-600">-</td>
            <td class="px-3 py-3 text-center">
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500"><i class="fas fa-circle-notch fa-spin"></i> Menyimpan...</span>
            </td>
        `;
        tbody.appendChild(tr);
        const badge = document.getElementById('scanCountBadgeGuru');
        if (badge) badge.textContent = scanLiveCountGuru + ' Guru';
        highlightScanRowGuru(tr, wrapper);
        return tr;
    }
    function updateScanRowGuruResult(tr, result) {
        if (!tr) return;
        const now = new Date();
        const jamScan = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (result && result.success) {
            dhPlayBeep('success');
            const namaTd = tr.querySelector('td:nth-child(2) .font-bold');
            if (namaTd && result.nama) namaTd.textContent = result.nama;
            const jabatanTd = tr.querySelector('td:nth-child(3) span');
            if (jabatanTd && result.jabatan) jabatanTd.textContent = result.jabatan;
            tr.children[3].textContent = result.mapel || '-';
            tr.children[4].textContent = jamScan;
            tr.children[5].innerHTML = `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#d0d8e8] text-[#152238]"><i class="fas fa-circle-check"></i> Hadir tersimpan</span>`;
        } else {
            dhPlayBeep('error');
            tr.children[4].textContent = jamScan;
            const errMsg = (result && result.message) || 'Gagal';
            tr.children[5].innerHTML = `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-600" title="${errMsg}"><i class="fas fa-circle-xmark"></i> Gagal</span>
            <div class="text-[9px] text-red-400 mt-0.5 max-w-[140px] break-words leading-tight">${errMsg}</div>`;
        }
    }
    function resetScanTableGuru() {
        const tbody = document.getElementById('tbody-scan-live-guru');
        if (!tbody) return;
        tbody.innerHTML = `<tr id="scan-empty-row-guru"><td colspan="6" class="py-16 text-center">
            <div class="flex flex-col items-center gap-3">
                <i class="fas fa-qrcode text-3xl text-gray-200"></i>
                <p class="font-semibold text-sm text-gray-400">Belum ada riwayat scan</p>
                <p class="text-xs text-gray-300">Scan QR — data langsung tersimpan otomatis</p>
            </div></td></tr>`;
        scanLiveCountGuru = 0;
        scanLiveMapGuru = {};
        const badge = document.getElementById('scanCountBadgeGuru');
        if (badge) badge.textContent = '0 Guru';
    }
    function highlightScanRowGuru(tr, wrapper) {
        document.querySelectorAll('.scan-row-highlight').forEach(el => el.classList.remove('scan-row-highlight'));
        tr.classList.add('scan-row-highlight');
        const wrapperEl = wrapper || document.getElementById('scanTableWrapperGuru');
        if (wrapperEl && tr) {
            wrapperEl.scrollTo({ top: tr.offsetTop - (wrapperEl.clientHeight / 2) + (tr.offsetHeight / 2), behavior: 'smooth' });
        }
        setTimeout(() => tr.classList.remove('scan-row-highlight'), 3000);
    }
    function stopAndBackGuru(redirect = true) {
        stopPolling();
        if (cameraPopup && !cameraPopup.closed) { cameraPopup.close(); cameraPopup = null; }
        isScanning = false;
        scanMode = 'siswa';
        if (redirect && currentUser) returnToDashboard();
    }
async function downloadKartuSiswaBulk() {
    await ensureLib('jspdf');
    await ensureLib('qrcodejs');
    const filterKelas = document.getElementById('filterKelasSiswa').value;
    const allSiswa = (tableState.siswa && tableState.siswa.fullData) ? tableState.siswa.fullData : [];
    if (!allSiswa || allSiswa.length === 0) {
        showAlert('error', 'Data siswa belum dimuat. Refresh data dulu.');
        return;
    }
    let dataToPrint = allSiswa;
    if (filterKelas && filterKelas !== "") {
        dataToPrint = allSiswa.filter(s => s.kelas === filterKelas);
    }
    if (dataToPrint.length === 0) {
        showAlert('error', 'Tidak ada siswa ditemukan.');
        return;
    }
    const result = await Swal.fire({
        title: 'Cetak Kartu Pelajar',
        text: `Mencetak ${dataToPrint.length} kartu. Layout: 8 Kartu per Halaman (A4).`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Cetak Sekarang',
        cancelButtonText: 'Batal'
    });
    if (!result.isConfirmed) return;
    Swal.fire({
        title: 'Generate PDF...',
        html: 'Sedang menyusun kartu...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    setTimeout(async () => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;  
            const pageHeight = 297; 
            const cardWidth = 86;   
            const cardHeight = 54;  
            const gapX = 10; 
            const gapY = 10; 
            const marginX = (pageWidth - ((cardWidth * 2) + gapX)) / 2;
            const marginY = (pageHeight - ((cardHeight * 4) + (gapY * 3))) / 2;
            let x = marginX;
            let y = marginY;
            let col = 0;
            let row = 0;
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '-9999px';
            document.body.appendChild(tempDiv);
            for (let i = 0; i < dataToPrint.length; i++) {
                const s = dataToPrint[i];
                let rawNisn = s.nisn || "0000";
                let cleanNisn = String(rawNisn).replace(/[^a-zA-Z0-9]/g, "").trim();
                doc.setDrawColor(200, 200, 200); 
                doc.setFillColor(255, 255, 255); 
                doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
                doc.setFillColor(6, 78, 59); 
                doc.rect(x, y, cardWidth, 14, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text("KARTU ABSENSI", x + (cardWidth/2), y + 6, {align:'center'});
                doc.setFontSize(6);
                doc.setFont("helvetica", "normal");
                doc.text("Sistem Akademik", x + (cardWidth/2), y + 10, {align:'center'});
                doc.setFillColor(245, 158, 11); 
                doc.rect(x, y + 14, cardWidth, 1, 'F');
                const qrSize = 22; 
                const qrX = x + 8; 
                const qrY = y + 22; 
                tempDiv.innerHTML = ''; 
                if(cleanNisn) {
                    try {
                        new QRCode(tempDiv, {
                            text: cleanNisn, 
                            width: 120, height: 120,
                            correctLevel: QRCode.CorrectLevel.L, 
                            colorDark : "#000000", colorLight : "#ffffff"
                        });
                        const canvas = tempDiv.querySelector('canvas');
                        if(canvas) {
                            const qrUrl = canvas.toDataURL("image/png");
                            doc.addImage(qrUrl, 'PNG', qrX, qrY, qrSize, qrSize);
                        }
                    } catch (e) {
                        console.error("Gagal buat QR untuk " + s.nama, e);
                    }
                }
                doc.setFontSize(5);
                doc.setTextColor(100, 116, 139);
                doc.text("Scan untuk Absensi", qrX + (qrSize/2), qrY + qrSize + 3, {align:'center'});
                const textX = x + 36; 
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(6, 78, 59); 
                let namaCetak = (s.nama || "").length > 20 ? (s.nama || "").substring(0, 20) + "..." : (s.nama || "");
                doc.text(namaCetak.toUpperCase(), textX, y + 26);
                doc.setDrawColor(226, 232, 240);
                doc.line(textX, y + 28, x + cardWidth - 5, y + 28);
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139); 
                doc.text("Id", textX, y + 34);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42); 
                doc.text(": " + cleanNisn, textX + 14, y + 34);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139);
                doc.text("Kelas", textX, y + 40);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
                doc.text(": " + (s.kelas || "-"), textX + 14, y + 40);
                col++;
                if (col >= 2) { 
                    col = 0;
                    row++;
                    x = marginX; 
                    y += cardHeight + gapY; 
                } else { 
                    x += cardWidth + gapX;
                }
                if (row >= 4 && i < dataToPrint.length - 1) {
                    doc.addPage();
                    col = 0; 
                    row = 0; 
                    x = marginX; 
                    y = marginY;
                }
            }
            document.body.removeChild(tempDiv);
            const fileName = filterKelas ? `Kartu_${filterKelas}.pdf` : `Kartu_Semua_Siswa.pdf`;
            doc.save(fileName);
            Swal.fire({
                icon: 'success',
                title: 'Selesai!',
                text: 'PDF Kartu berhasil diunduh.',
                timer: 2000
            });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Gagal membuat PDF: ' + error.message, 'error');
        }
    }, 500);
}
    function generateQRForSiswa(nisn, nama, kelas) {
        // When called from row buttons with only NISN, look up from map
        if (!nama) {
            const s = (window._siswaMap || {})[String(nisn)];
            if (s) { nama = s.nama; kelas = s.kelas; }
        }
        loadQRCodeSiswa(nisn, nama, kelas);
    }

