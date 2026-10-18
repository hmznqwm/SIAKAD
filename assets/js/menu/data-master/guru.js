// data-master/profil-guru.js
// Sub-modul Data Master: Profil/Biodata Guru.
// Dipecah dari assets/js/menu/data-master.js -- butuh core.js dimuat lebih dulu.

function loadDataProfilGuru() {
    stopAndBack(false);
    setActiveMenu('Data Guru');
    showView('view-profil-guru');
    selectedProfilGuruIds.clear();
    updateBulkDeleteUI('guruprofil');
    const checkAllEl = document.getElementById('checkAllProfilGuru');
    if (checkAllEl) checkAllEl.checked = false;
    if (tableState.guruprofil.fullData.length > 0) {
        processTableData('guruprofil');
    } else {
        document.getElementById('tbody-guruprofil').innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data guru...</td></tr>';
        const token = currentUser.token;
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                tableState.guruprofil.fullData = result.data;
                processTableData('guruprofil');
            } else {
                document.getElementById('tbody-guruprofil').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500 font-bold"><i class="fas fa-exclamation-triangle mr-2"></i>${result.message}</td></tr>`;
                showAlert('error', result.message);
            }
        })
        .withFailureHandler(error => {
            document.getElementById('tbody-guruprofil').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500">Gagal koneksi: ${error}</td></tr>`;
        })
        .getProfilGuruList(token);
    }
}
function renderProfilGuruRows(data, startIdx) {
    const tbody = document.getElementById('tbody-guruprofil');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((guru, i) => {
        const badgeChips = (val, max = 2) => {
            const items = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
            if (items.length === 0) return '<span class="text-gray-400 italic text-xs">-</span>';
            const chips = items.slice(0, max)
                .map(x => `<span class="inline-block px-2 py-0.5 bg-[#e8ecf4] text-[#152238] rounded text-xs font-bold">${x}</span>`)
                .join(' ');
            const more = items.length > max ? `<span class="text-[10px] font-bold text-gray-400 ml-0.5">+${items.length - max}</span>` : '';
            return chips + more;
        };
        const isSelected = selectedProfilGuruIds.has(String(guru.nip));
        return `
    <tr class="hover:bg-gray-50 transition border-b border-gray-50 group select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${guru.nip}" data-type="guruprofil">
        <td class="p-4 text-center hidden md:table-cell">
            <input type="checkbox" class="chk-guruprofil w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" value="${guru.nip}" ${isSelected ? 'checked' : ''} onchange="toggleProfilGuruRow('${guru.nip}', this.checked)">
        </td>
        <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
        <td class="p-4">
            <div class="flex items-center">
                <div class="relative mr-3 shrink-0 avatar-badge-slot">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-150 ${isSelected ? 'bg-[#1b2a4a] text-white' : 'bg-[#d0d8e8] text-[#1b2a4a]'}" data-initial="${(guru.nama || '-').charAt(0)}">
                        ${isSelected ? '<i class="fas fa-check text-[11px]"></i>' : (guru.nama || '-').charAt(0)}
                    </div>
                </div>
                <div class="min-w-0">
                    <div class="font-bold text-sm text-gray-900 truncate">${guru.nama}</div>
                    <div class="text-xs text-gray-500 font-mono truncate">${guru.nip}</div>
                </div>
            </div>
        </td>
        <td class="p-4 hidden sm:table-cell"><div class="flex items-center gap-1 whitespace-nowrap">${badgeChips(guru.jabatan)}</div></td>
        <td class="p-4 hidden md:table-cell"><div class="flex items-center gap-1 whitespace-nowrap">${badgeChips(guru.mapel)}</div></td>
        <td class="p-4 hidden lg:table-cell text-sm text-gray-600 whitespace-nowrap">${guru.statusKepegawaian || '-'}</td>
        <td class="p-4 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                <button onclick='viewProfilGuru(${safeJsonAttr(guru)})' class="btn-aksi-tabel aksi-lihat" title="Lihat Detail"><i class="fas fa-eye"></i></button>
                <button onclick="generateQRForGuru('${guru.nip}', '${String(guru.nama).replace(/'/g, "\\'")}', '${String(guru.jabatan || '-').replace(/'/g, "\\'")}')" class="btn-aksi-tabel aksi-qr" title="QR Code / Kartu Guru"><i class="fas fa-qrcode"></i></button>
                ${(currentUser.role === 'admin') ? `<button onclick='editProfilGuru(${safeJsonAttr(guru)})' class="btn-aksi-tabel aksi-edit" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
            </div>
        </td>
    </tr>`;
    }).join('');
    updateSelectAllHeaderState('guruprofil');
}
function saveProfilGuru(e, isEdit) {
    e.preventDefault();
    showLoading();
    const fd = new FormData(e.target);
    const guruData = {
        nama: fd.get('nama'),
        nip: fd.get('nip'),
        jenisKelamin: fd.get('jenisKelamin'),
        tanggalLahir: fd.get('tanggalLahir'),
        agama: fd.get('agama'),
        jabatan: collectProfilJabatan(),
        noHp: fd.get('noHp'),
        email: fd.get('email'),
        statusKepegawaian: fd.get('statusKepegawaian'),
        alamat: fd.get('alamat'),
        mengajar: collectProfilMengajar()
    };
    const token = currentUser ? currentUser.token : null;
    const callback = (res) => {
        hideLoading();
        if (res.success) {
            closeModal();
            tableState.guruprofil.fullData = [];
            loadDataProfilGuru();
            if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache();
            if (res.akunBaru) {
                Swal.fire({
                    icon: 'success',
                    title: 'Profil Ditambahkan',
                    html: `Profil guru berhasil disimpan.<br><br>
                           <div class="text-left bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                             <p class="font-bold text-blue-800 mb-1"><i class="fas fa-user-shield mr-1"></i> Akun Login Otomatis Dibuat</p>
                             <p class="text-blue-700">Username: <b>${res.username}</b></p>
                             <p class="text-blue-700">Password: <b>${res.username}</b></p>
                             <p class="text-xs text-blue-500 mt-1">Segera ganti password melalui menu User.</p>
                           </div>`,
                    confirmButtonColor: '#1b2a4a'
                });
                // Refresh tabel user jika sedang terbuka
                tableState.guru.fullData = [];
            } else {
                showAlert('success', res.message);
            }
        } else {
            showAlert('error', res.message);
        }
    };
    const failureCallback = (err) => {
        hideLoading();
        showAlert('error', 'Terjadi kesalahan: ' + err);
    };
    if (isEdit) {
        const oldNip = fd.get('oldNip');
        syncProfilMapelBaruKeMaster(guruData.mengajar).then(() => {
            siakadRun
                .withSuccessHandler(callback)
                .withFailureHandler(failureCallback)
                .updateProfilGuru(token, oldNip, guruData);
        });
    } else {
        syncProfilMapelBaruKeMaster(guruData.mengajar).then(() => {
            siakadRun
                .withSuccessHandler(callback)
                .withFailureHandler(failureCallback)
                .addProfilGuru(token, guruData);
        });
    }
}
    function showAddProfilGuruModal() { showModal(createProfilGuruModal()); initProfilJabatan(); loadProfilMengajarOptions(); }
    function editProfilGuru(g) { showModal(createProfilGuruModal(g)); initProfilJabatan(); loadProfilMengajarOptions(g); }
function createProfilGuruModal(g = null) {
        const isEdit = g !== null;
        const inputClass = "w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-[#5b7aaa]/20 focus:border-[#1b2a4a] focus:bg-white transition-all p-3 placeholder-gray-400";
        const labelClass = "block mb-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider";
        const sectionTitle = (icon, title) => `
            <div class="flex items-center gap-2 mb-3">
                <div class="w-7 h-7 rounded-lg bg-[#1b2a4a] flex items-center justify-center shrink-0">
                    <i class="fas fa-${icon} text-white text-xs"></i>
                </div>
                <h4 class="text-sm font-extrabold text-[#152238]">${title}</h4>
                <span class="flex-1 h-px bg-gradient-to-r from-[#d0d8e8] to-transparent"></span>
            </div>`;
        return `
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div class="px-6 py-5 bg-gradient-to-r from-[#1b2a4a] to-[#152238] flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
                        <i class="fas fa-chalkboard-user text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-white">${isEdit ? 'Edit Data Guru' : 'Tambah Data Guru'}</h3>
                        <p class="text-[11px] text-[#a0b0cc] font-medium">Lengkapi data identitas guru</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-xl transition"><i class="fas fa-times text-lg"></i></button>
            </div>
            <div class="p-6 max-h-[75vh] overflow-y-auto">
                <form onsubmit="saveProfilGuru(event, ${isEdit})" class="space-y-6">
                    <div>
                        ${sectionTitle('id-card', 'Identitas & Kepegawaian')}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="${labelClass}">Nama Lengkap <span class="text-red-500">*</span></label>
                                <input type="text" name="nama" value="${g?.nama || ''}" required class="${inputClass}" placeholder= - esuai gelar & ijazah">
                            </div>
                            <div>
                                <label class="${labelClass}">NIP / NUPTK <span class="text-red-500">*</span></label>
                                <input type="text" name="nip" value="${g?.nip || ''}" required ${isEdit ? 'readonly class="' + inputClass + ' opacity-60 cursor-not-allowed"' : `class="${inputClass}"`} placeholder="Nomor Induk Pegawai">
                            </div>
                            <div>
                                <label class="${labelClass}">Status Kepegawaian</label>
                                <select name="statusKepegawaian" class="${inputClass}">
                                    <option value="PNS" ${g?.statusKepegawaian === 'PNS' ? 'selected' : ''}>PNS</option>
                                    <option value="PPPK" ${g?.statusKepegawaian === 'PPPK' ? 'selected' : ''}>PPPK</option>
                                    <option value="Honorer" ${g?.statusKepegawaian === 'Honorer' ? 'selected' : ''}>Honorer</option>
                                    <option value="GTT" ${g?.statusKepegawaian === 'GTT' ? 'selected' : ''}>GTT (Guru Tidak Tetap)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        ${sectionTitle('user', 'Biodata')}
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="${labelClass}">Jenis Kelamin</label>
                                <select name="jenisKelamin" class="${inputClass}">
                                    <option value="Laki-laki" ${g?.jenisKelamin === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                                    <option value="Perempuan" ${g?.jenisKelamin === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label class="${labelClass}">Tanggal Lahir <span class="text-red-500">*</span></label>
                                <input type="date" name="tanggalLahir" value="${g?.tanggalLahir || ''}" required class="${inputClass}">
                            </div>
                            <div>
                                <label class="${labelClass}">Agama</label>
                                <select name="agama" class="${inputClass}">
                                    <option value="Islam" ${g?.agama === 'Islam' ? 'selected' : ''}>Islam</option>
                                    <option value="Kristen" ${g?.agama === 'Kristen' ? 'selected' : ''}>Kristen</option>
                                    <option value="Katolik" ${g?.agama === 'Katolik' ? 'selected' : ''}>Katolik</option>
                                    <option value="Hindu" ${g?.agama === 'Hindu' ? 'selected' : ''}>Hindu</option>
                                    <option value="Buddha" ${g?.agama === 'Buddha' ? 'selected' : ''}>Buddha</option>
                                    <option value="Lainnya" ${g?.agama === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        ${sectionTitle('briefcase', 'Jabatan & Kontak')}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="${labelClass}">Jabatan <span class="normal-case font-normal text-gray-400">(bisa lebih dari satu)</span></label>
                                <div class="relative" id="jabatanDropdownWrap">
                                    <button type="button" onclick="toggleJabatanDropdown(event)" class="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-[#5b7aaa]/20 focus:border-[#1b2a4a] p-3 flex items-center justify-between gap-2 transition-all text-left">
                                        <span id="jabatanDropdownLabel" class="text-gray-400 truncate">- Pilih Jabatan -</span>
                                        <i class="fas fa-chevron-down text-gray-400 text-xs shrink-0 transition-transform" id="jabatanDropdownArrow"></i>
                                    </button>
                                    <div id="jabatanDropdownPanel" class="hidden absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
                                        ${['Guru Kelas', 'Guru Mapel', 'Wali Kelas', 'Kepala Madrasah', 'Wakil Kepala Madrasah', 'Bendahara', 'Pencatat Barang & Prestasi', 'Staff TU'].map(j => `
                                        <label class="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <input type="checkbox" class="jabatan-opt accent-[#1b2a4a] w-4 h-4" value="${j}" ${String(g?.jabatan || '').split(',').map(s => s.trim()).includes(j) ? 'checked' : ''} onchange="updateJabatanDropdown()">
                                            <span class="text-xs font-medium text-gray-700">${j}</span>
                                        </label>`).join('')}
                                    </div>
                                </div>
                                <p id="jabatanSelectedChips" class="flex flex-wrap gap-1.5 mt-2"></p>
                            </div>
                            <div>
                                <label class="${labelClass}">No. Handphone</label>
                                <input type="tel" name="noHp" value="${g?.noHp || ''}" class="${inputClass}" placeholder="08xxxxxxxxxx">
                            </div>
                            <div>
                                <label class="${labelClass}">Email <span class="normal-case font-normal text-gray-400">(untuk login Google)</span></label>
                                <input type="email" name="email" value="${g?.email || ''}" class="${inputClass}" placeholder="nama@email.com">
                            </div>
                        </div>
                    </div>
                    <div class="bg-[#eef3fa] border border-[#b8c4d8]/50 rounded-2xl p-5">
                        ${sectionTitle('book-open', 'Kelas & Mata Pelajaran Diampu')}
                        <p class="text-[11px] text-gray-400 mb-3">Mendukung lebih dari 1 kelas & 1 mapel. Data ini otomatis dipakai di menu Absensi, Nilai, Jadwal, dan Perizinan.</p>
                        <div id="profilMengajarRows" class="space-y-2 mb-2" style="max-height:240px; overflow-y:auto;">
                            <p class="text-xs text-gray-400 text-center py-3"><i class="fas fa-circle-notch fa-spin mr-1"></i> Memuat data...</p>
                        </div>
                        <button type="button" onclick="addProfilMengajarRow()" class="w-full border border-dashed border-[#5b7aaa] text-[#1b2a4a] py-2.5 rounded-xl text-xs font-bold hover:bg-[#d0d8e8]/40 transition mb-2">
                            <i class="fas fa-plus mr-1"></i> Tambah Kelas + Mapel
                        </button>
                    </div>
                    <div>
                        ${sectionTitle('map-location-dot', 'Alamat')}
                        <textarea name="alamat" rows="2" class="${inputClass}" placeholder="Alamat lengkap tempat tinggal">${g?.alamat || ''}</textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="closeModal()" class="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition">Batal</button>
                        <button type="submit" class="px-6 py-3 bg-gradient-to-r from-[#1b2a4a] to-[#23365e] hover:from-[#152238] hover:to-[#1b2a4a] text-white rounded-xl font-bold shadow-lg shadow-[#b8c4d8]/50 transition transform active:scale-95 flex items-center gap-2">
                            <i class="fas fa-save text-sm"></i> Simpan Data
                        </button>
                    </div>
                    ${isEdit ? `<input type="hidden" name="oldNip" value="${g.nip}">` : ''}
                </form>
            </div>
        </div>`;
    }
    function viewProfilGuru(guru) {
        showModal(createViewProfilGuruModal(guru), 'max-w-2xl');
    }
    function createViewProfilGuruModal(g) {
        return `
            <div class="bg-gradient-to-r from-[#1b2a4a] to-[#152238] px-4 py-3 text-white flex justify-between items-center shrink-0">
                <div class="flex gap-2.5 items-center min-w-0">
                    <div class="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-sm font-bold ring-1 ring-white/20 shrink-0 uppercase">
                        ${(g.nama || '-').charAt(0)}
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-sm font-extrabold tracking-tight truncate">${g.nama || '-'}</h3>
                        <p class="opacity-90 text-[10px] flex items-center gap-1.5">
                            <i class="far fa-id-card"></i> ${g.nip || '-'}
                            <span class="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">${g.jabatan || '-'}</span>
                        </p>
                    </div>
                </div>
                <button onclick="closeModal()" class="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
                ${_modalSection('fa-user-circle', 'Data Pribadi', `
                    ${_modalRow('Jenis Kelamin', g.jenisKelamin)}
                    ${_modalRow('Tanggal Lahir', g.tanggalLahir)}
                    ${_modalRow('Agama', g.agama)}
                `)}
                ${_modalSection('fa-briefcase', 'Kepegawaian', `
                    ${_modalRow('Jabatan', g.jabatan)}
                    ${_modalRow('Mapel / Kelas', g.mapel)}
                    ${_modalRow('Status', g.statusKepegawaian)}
                    ${_modalRow('NIP / NUPTK', g.nip)}
                `)}
                ${_modalSection('fa-mobile-alt', 'Kontak', `
                    ${_modalRow('No. Handphone', g.noHp)}
                    ${_modalRow('Email', g.email)}
                `)}
                ${_modalSection('fa-map-marker-alt', 'Alamat', `
                    <div class="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium break-words whitespace-pre-line">${g.alamat || 'Alamat belum diisi.'}</div>
                `)}
            </div>
            <div class="px-4 pb-3 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2 shrink-0">
                <button onclick="closeModal()" class="px-3.5 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition">Tutup</button>
            </div>`;
    }
    function deleteProfilGuruConfirm(nip, nama) {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: `Data guru "${nama}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#3d5478',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                showLoading();
                const token = currentUser.token;
                siakadRun.withSuccessHandler(r => {
                    hideLoading();
                    if (r.success) {
                        selectedProfilGuruIds.delete(String(nip));
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
                .deleteProfilGuru(token, nip);
            }
        });
    }
    function loadProfilMengajarOptions(g) {
        Promise.all([
            new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve([])).getDaftarKelas()),
            new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve([])).getDaftarMapel()),
            g && g.nip
                ? new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve({ data: [] })).getGuruMengajarList(currentUser ? currentUser.token : null, g.nip))
                : Promise.resolve(null)
        ]).then(([kelasList, mapelList, mengajarRes]) => {
            window._mengajarKelasOptions = kelasList || [];
            window._mengajarMapelOptions = mapelList || [];
            const container = document.getElementById('profilMengajarRows');
            if (!container) return;
            container.innerHTML = '';
            const rows = (mengajarRes && mengajarRes.data) ? mengajarRes.data : [];
            if (rows.length === 0) addProfilMengajarRow();
            else rows.forEach(r => addProfilMengajarRow(r.kelas, r.mata_pelajaran));
        });
    }

    function addProfilMengajarRow(selectedKelas = '', selectedMapel = '') {
        const container = document.getElementById('profilMengajarRows');
        if (!container) return;
        const kelasOpts = (window._mengajarKelasOptions || []).map(k =>
            `<option value="${k}" ${k === selectedKelas ? 'selected' : ''}>${k}</option>`).join('');
        const rowId = 'prow_' + Math.random().toString(36).slice(2, 9);
        const row = document.createElement('div');
        row.id = rowId;
        row.className = 'flex gap-2 items-center';
        row.innerHTML = `
            <select class="profil-mengajar-kelas flex-1 bg-white border border-blue-200 text-gray-900 text-xs rounded-lg p-2">
                <option value="">- Pilih Kelas -</option>
                ${kelasOpts}
            </select>
            <div class="flex-1 relative min-w-0">
                <input type="text" class="profil-mengajar-mapel w-full bg-white border border-blue-200 text-gray-900 text-xs rounded-lg p-2 pr-6"
                    placeholder="Ketik atau pilih mapel..." autocomplete="off" value="${selectedMapel}">
                <i class="fas fa-chevron-down text-[9px] text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-400 hover:text-red-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition">
                <i class="fas fa-trash-alt text-xs"></i>
            </button>`;
        container.appendChild(row);
        // Dropdown mapel dibuat mengambang (position:fixed, appended ke <body>)
        // lewat setupMapelCombobox di core.js, supaya tidak ikut kepotong oleh
        // overflow-y:auto di #profilMengajarRows / body modal (sebelumnya harus
        // di-scroll dulu baru dropdown-nya kelihatan).
        setupMapelCombobox(row.querySelector('.profil-mengajar-mapel'), () => window._mengajarMapelOptions || []);
    }

    // Sinkron mapel yang diketik manual (belum ada di daftar) ke mapel_master
    // lewat endpoint addMapel, supaya mapel baru langsung tersimpan sebagai
    // data master.
    function syncProfilMapelBaruKeMaster(mengajarList) {
        const known = (window._mengajarMapelOptions || []).map(m => m.toLowerCase());
        const baru = [];
        (mengajarList || []).forEach(item => {
            const nama = (item.mata_pelajaran || '').trim();
            if (nama && !known.includes(nama.toLowerCase()) && !baru.some(b => b.toLowerCase() === nama.toLowerCase())) {
                baru.push(nama);
            }
        });
        if (baru.length === 0) return Promise.resolve();
        return Promise.all(baru.map(nama => new Promise(resolve => {
            siakadRun.withSuccessHandler(() => resolve()).withFailureHandler(() => resolve()).addMapel(nama);
        }))).then(() => {
            window._mengajarMapelOptions = [...(window._mengajarMapelOptions || []), ...baru].sort();
            if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache();
        });
    }

    function collectProfilMengajar() {
        const container = document.getElementById('profilMengajarRows');
        if (!container) return [];
        const assignments = [];
        container.querySelectorAll('.profil-mengajar-kelas').forEach(sel => {
            const row = sel.closest('div');
            const kelas = sel.value;
            const mapel = row.querySelector('.profil-mengajar-mapel')?.value || '';
            if (kelas && mapel) assignments.push({ kelas: kelas, mata_pelajaran: mapel });
        });
        return assignments;
    }

    function initProfilJabatan() {
        updateJabatanDropdown();
    }

    function toggleJabatanDropdown(e) {
        if (e) e.stopPropagation();
        const panel = document.getElementById('jabatanDropdownPanel');
        const arrow = document.getElementById('jabatanDropdownArrow');
        const isHidden = panel.classList.contains('hidden');
        // Tutup dropdown lain (kalau ada) lalu buka/tutup ini
        document.querySelectorAll('#jabatanDropdownPanel').forEach(p => p.classList.add('hidden'));
        panel.classList.toggle('hidden', !isHidden);
        if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : '';
    }

    function updateJabatanDropdown() {
        const checked = Array.from(document.querySelectorAll('#jabatanDropdownWrap .jabatan-opt:checked')).map(c => c.value);
        const label = document.getElementById('jabatanDropdownLabel');
        const chipsWrap = document.getElementById('jabatanSelectedChips');
        if (checked.length === 0) {
            if (label) { label.textContent = '- Pilih Jabatan -'; label.classList.remove('text-gray-900'); label.classList.add('text-gray-400'); }
        } else {
            if (label) { label.textContent = checked.length + ' jabatan dipilih'; label.classList.remove('text-gray-400'); label.classList.add('text-gray-900'); }
        }
        if (chipsWrap) {
            chipsWrap.innerHTML = checked.map(j =>
                `<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e8ecf4] text-[#152238] rounded-full text-xs font-bold">${j}
                    <button type="button" onclick="removeJabatanOption('${j.replace(/'/g, "\\'")}')" class="text-[#152238]/50 hover:text-red-600 transition-colors"><i class="fas fa-times"></i></button>
                </span>`).join('');
        }
    }

    function removeJabatanOption(j) {
        const cb = Array.from(document.querySelectorAll('#jabatanDropdownWrap .jabatan-opt')).find(c => c.value === j);
        if (cb) cb.checked = false;
        updateJabatanDropdown();
    }

    function collectProfilJabatan() {
        const checked = Array.from(document.querySelectorAll('#jabatanDropdownWrap .jabatan-opt:checked')).map(c => c.value);
        return checked.join(', ');
    }

    document.addEventListener('click', function (e) {
        const wrap = document.getElementById('jabatanDropdownWrap');
        if (wrap && !wrap.contains(e.target)) {
            const panel = document.getElementById('jabatanDropdownPanel');
            const arrow = document.getElementById('jabatanDropdownArrow');
            if (panel) panel.classList.add('hidden');
            if (arrow) arrow.style.transform = '';
        }
    });

    function triggerImportProfilGuru() {
        document.getElementById('fileInputProfilGuru').click();
    }
    async function handleFileImportProfilGuru(input) {
        const file = input.files[0];
        if (!file) return;
        showLoading();
        await ensureLib('xlsx');
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            if (jsonData.length === 0) {
                hideLoading();
                showAlert('error', 'File Excel kosong atau format salah.');
                input.value = '';
                return;
            }
            const firstRow = jsonData[0];
            const hasNama = firstRow.hasOwnProperty('Nama Lengkap') || firstRow.hasOwnProperty('Nama');
            const hasNip = firstRow.hasOwnProperty('NIP/NUPTK') || firstRow.hasOwnProperty('NIP') || firstRow.hasOwnProperty('NUPTK');
            if (!hasNama || !hasNip) {
                hideLoading();
                showAlert('error', 'Format Excel salah! Pastikan ada kolom header: Nama Lengkap dan NIP/NUPTK.');
                input.value = '';
                return;
            }
            processImportProfilGuru(jsonData, input);
        };
        reader.onerror = function() {
            hideLoading();
            showAlert('error', 'Gagal membaca file.');
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
    function processImportProfilGuru(data, inputElement) {
        const formattedData = data.map(row => {
            const clean = importField;
            return {
                nama: clean(row, ['Nama Lengkap', 'Nama'], false),
                nip: clean(row, ['NIP/NUPTK', 'NIP', 'NUPTK'], false).replace(/'/g, ""),
                jenisKelamin: clean(row, ['Jenis Kelamin', 'JK'], false),
                tanggalLahir: clean(row, ['Tanggal Lahir', 'Tgl Lahir'], true),
                agama: clean(row, ['Agama'], false),
                jabatan: clean(row, ['Jabatan'], false),
                mapel: clean(row, ['Mata Pelajaran / Kelas Diampu', 'Mata Pelajaran', 'Mapel'], false),
                noHp: clean(row, ['No Handphone', 'HP', 'No HP'], false),
                email: clean(row, ['Email', 'E-mail', 'Alamat Email'], false),
                statusKepegawaian: clean(row, ['Status Kepegawaian', 'Status'], false),
                alamat: clean(row, ['Alamat'], false)
            };
        });
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                inputElement.value = '';
                if (res.success) {
                    tableState.guruprofil.fullData = []; 
                    loadDataProfilGuru(); 
                    if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache();
                    let msg = `Berhasil: ${res.added}, Gagal/Duplikat: ${res.skipped}`;
                    showAlert('success', 'Import Data Guru Selesai! ' + msg);
                } else {
                    showAlert('error', res.message);
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                inputElement.value = '';
                showAlert('error', 'Error Server: ' + err);
            })
            .importProfilGuruBulk(formattedData);
    }
/* Mobile: long-press selection ala Gmail. Checkbox tetap untuk desktop; di HP checkbox disembunyikan. */
(function initProfilGuruLongPress(){
    if (window.__profilGuruLongPressInit) return;
    window.__profilGuruLongPressInit = true;
    let timer = null;
    let startX = 0, startY = 0;
    let longPressed = false;
    const DURATION = 550;
    const MOVE_TOLERANCE = 10;

    const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    const getRow = (target) => target && target.closest ? target.closest('#tbody-guruprofil tr.select-row-target') : null;
    const clearTimer = () => {
        if (timer) { clearTimeout(timer); timer = null; }
    };

    document.addEventListener('touchstart', function(e){
        if (!isMobile()) return;
        const row = getRow(e.target);
        if (!row || e.touches.length !== 1) return;
        if (e.target.closest('button, input, select, a, label')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        longPressed = false;
        clearTimer();
        timer = setTimeout(() => {
            const nip = row.dataset.id;
            if (!nip) return;
            longPressed = true;
            const willSelect = !selectedProfilGuruIds.has(String(nip));
            toggleProfilGuruRow(String(nip), willSelect);
            if (navigator.vibrate) navigator.vibrate(25);
        }, DURATION);
    }, {passive:true});

    document.addEventListener('touchmove', function(e){
        if (!timer || !e.touches.length) return;
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clearTimer();
    }, {passive:true});

    document.addEventListener('touchend', function(){ clearTimer(); }, {passive:true});
    document.addEventListener('touchcancel', function(){ clearTimer(); }, {passive:true});

    document.addEventListener('contextmenu', function(e){
        if (!isMobile()) return;
        const row = getRow(e.target);
        if (row && longPressed) e.preventDefault();
    });
})();
