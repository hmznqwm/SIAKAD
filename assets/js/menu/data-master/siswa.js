// data-master/siswa.js
// Sub-modul Data Master: Data Siswa.
// Dipecah dari assets/js/menu/data-master.js -- butuh core.js dimuat lebih dulu.

function loadDataSiswa() {
    stopAndBack(false);
    setActiveMenu('Data Siswa');
    showView('view-data-siswa');
    selectedSiswaIds.clear();
    updateBulkDeleteUI('siswa');
    const checkAllSiswaEl = document.getElementById('checkAllSiswa');
    if (checkAllSiswaEl) checkAllSiswaEl.checked = false;
    const filterKelas = ((currentUser.role === 'guru' || currentUser.role === 'walikelas')) ? currentUser.kelas : null;
    const kelasLabel = filterKelas
        ? String(filterKelas).split(',').map(k => k.trim()).filter(Boolean).join(', ')
        : null;
    const pageTitle = document.querySelector('#view-data-siswa h3');
    if (kelasLabel) {
        pageTitle.textContent = `Direktori Siswa (${kelasLabel})`;
        document.getElementById('filterKelasSiswa').parentElement.style.display = 'none';
    } else {
        pageTitle.textContent = 'Direktori Siswa';
        document.getElementById('filterKelasSiswa').parentElement.style.display = 'flex';
    }
    const dropdown = document.getElementById('filterKelasSiswa');
    const fillDropdown = (dataKelas) => {
        if (!dropdown) return;
        const currentValue = dropdown.value; 
        let options = '<option value="">Semua Kelas</option>';
        if (dataKelas && dataKelas.length > 0) {
            dataKelas.forEach(kelas => {
                options += `<option value="${kelas}">${kelas}</option>`;
            });
        }
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    };
    if (existingClasses && existingClasses.length > 0) {
        fillDropdown(existingClasses);
    } else {
        dropdown.innerHTML = '<option value="">Memuat data...</option>';
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                existingClasses = result.data;
                fillDropdown(existingClasses);
            }
        }).getKelasList();
    }
    document.getElementById('tbody-siswa').innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data siswa...</td></tr>';
    siakadRun.withSuccessHandler(result => {
        if (result.success) {
            tableState.siswa.fullData = result.data;
            // Populate global lookup map for all pages
            window._siswaMap = {};
            (result.data || []).forEach(s => { window._siswaMap[String(s.nisn)] = s; });
            processTableData('siswa');
        } else {
            document.getElementById('tbody-siswa').innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>${result.message || 'Gagal memuat data siswa.'}</td></tr>`;
            showAlert('error', result.message);
        }
    }).withFailureHandler(err => {
        document.getElementById('tbody-siswa').innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>Gagal memuat data: ${err && err.message ? err.message : 'terjadi kesalahan'}</td></tr>`;
        console.error('loadDataSiswa error:', err);
    }).getSiswaList(filterKelas); 
}
function renderSiswaRows(data, startIdx) {
        const tbody = document.getElementById('tbody-siswa');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
            return;
        }
        // Store siswa objects in a map for safe lookup by NISN
        window._siswaMap = window._siswaMap || {};
        data.forEach(s => { window._siswaMap[String(s.nisn)] = s; });

        tbody.innerHTML = data.map((siswa, i) => {
            const nisn = String(siswa.nisn);
            // Encode NISN aman untuk HTML attribute (menghindari masalah apostrof/karakter khusus di onclick)
            const nisnAttr = nisn.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const isSelected = selectedSiswaIds.has(nisn);
            const checked = isSelected ? 'checked' : '';
            return `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50 group select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${nisn}" data-type="siswa">
            <td class="p-1.5 md:p-3 text-center hidden md:table-cell">
                <input type="checkbox" class="chk-siswa w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" value="${nisnAttr}" ${checked} data-nisn="${nisnAttr}" onchange="toggleSiswaRow(this.dataset.nisn, this.checked)">
            </td>
            <td class="p-1.5 md:p-3 text-center text-gray-500 text-[10px] md:text-sm">${startIdx + i + 1}</td>
            <td class="p-1.5 md:p-3">
                <div class="flex items-center">
                    <div class="relative mr-3 shrink-0 avatar-badge-slot">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-150 ${isSelected ? 'bg-[#1b2a4a] text-white' : 'bg-[#d0d8e8] text-[#1b2a4a]'}" data-initial="${(siswa.nama || '?').charAt(0)}">
                            ${isSelected ? '<i class="fas fa-check text-[11px]"></i>' : (siswa.nama || '?').charAt(0)}
                        </div>
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-xs md:text-sm text-gray-900 truncate">${siswa.nama || '-'}</div>
                        <div class="text-[10px] text-gray-400 md:hidden font-mono mt-0.5">${nisn}</div>
                    </div>
                </div>
            </td>
            <td class="p-1.5 md:p-3 hidden md:table-cell text-sm text-gray-600 font-mono">${nisn}</td>
            <td class="p-1.5 md:p-3 hidden sm:table-cell"><span class="px-2 py-1 bg-[#e8ecf4] text-[#152238] rounded text-xs font-bold">${siswa.kelas || '-'}</span></td>
            <td class="p-1.5 md:p-3 text-center">
                <div class="flex justify-center space-x-1.5 md:space-x-2 opacity-80 group-hover:opacity-100">
                    <button data-nisn="${nisnAttr}" data-aksi="view" class="btn-aksi-siswa btn-aksi-tabel aksi-lihat text-[10px] md:text-xs" title="Lihat Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button data-nisn="${nisnAttr}" data-aksi="edit" class="btn-aksi-siswa btn-aksi-tabel aksi-edit text-[10px] md:text-xs" title="Edit"><i class="fas fa-edit"></i></button>
                    <button data-nisn="${nisnAttr}" data-aksi="qr" class="btn-aksi-siswa btn-aksi-tabel aksi-qr text-[10px] md:text-xs" title="QR Code"><i class="fas fa-qrcode"></i></button>
                </div>
            </td>
        </tr>`;
        }).join('');

        // Daftarkan event delegation hanya sekali di tbody-siswa
        if (!tbody._siswaClickBound) {
            tbody.addEventListener('click', function(e) {
                const btn = e.target.closest('.btn-aksi-siswa');
                if (!btn) return;
                const nisn = btn.dataset.nisn;
                const aksi = btn.dataset.aksi;
                if (!nisn) return;
                if (aksi === 'view') viewSiswaByNisn(nisn);
                else if (aksi === 'edit') editSiswaByNisn(nisn);
                else if (aksi === 'qr') generateQRForSiswa(nisn);
            });
            tbody._siswaClickBound = true;
        }

        updateSelectAllHeaderState('siswa');
    }
function saveSiswa(e, isEdit) {
    e.preventDefault();
    showLoading();
    const fd = new FormData(e.target);
    const siswaData = {
        nama: fd.get('nama'),
        nisn: fd.get('nisn'),
        jenisKelamin: fd.get('jenisKelamin'),
        tempatLahir: fd.get('tempatLahir'),
        tanggalLahir: fd.get('tanggalLahir'),
        agama: fd.get('agama'),
        namaAyah: fd.get('namaAyah'),
        namaIbu: fd.get('namaIbu'),
        noHp: fd.get('noHp'),
        email: fd.get('email'),
        kelas: fd.get('kelas'),
        alamat: fd.get('alamat')
    };
    const token = currentUser ? currentUser.token : null; 
    const callback = (res) => {
        hideLoading();
        if (res.success) {
            closeModal();
            tableState.siswa.fullData = [];
            loadDataSiswa();
            showAlert('success', res.message);
        } else {
            showAlert('error', res.message);
        }
    };
    const failureCallback = (err) => {
        hideLoading();
        showAlert('error', 'Terjadi kesalahan: ' + err);
    };
    if (isEdit) {
        const oldNisn = fd.get('oldNisn');
        siakadRun
            .withSuccessHandler(callback)
            .withFailureHandler(failureCallback)
            .updateSiswa(token, oldNisn, siswaData); 
    } else {
        siakadRun
            .withSuccessHandler(callback)
            .withFailureHandler(failureCallback)
            .addSiswa(token, siswaData); 
    }
}
    function showAddSiswaModal() { showModal(createSiswaModal()); }
    function editSiswa(s) { showModal(createSiswaModal(s)); }
    // Safe lookup wrappers  row buttons call these with only NISN
    function viewSiswaByNisn(nisn) {
        const s = (window._siswaMap || {})[String(nisn)];
        if (s) viewSiswa(s);
    }
    function editSiswaByNisn(nisn) {
        const s = (window._siswaMap || {})[String(nisn)];
        if (s) editSiswa(s);
    }
function createSiswaModal(s = null) {
        const isEdit = s !== null;
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
                        <i class="fas fa-user-graduate text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-white">${isEdit ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}</h3>
                        <p class="text-[11px] text-[#a0b0cc] font-medium">Lengkapi data identitas siswa</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-xl transition"><i class="fas fa-times text-lg"></i></button>
            </div>
            <div class="p-6 max-h-[75vh] overflow-y-auto">
                <form onsubmit="saveSiswa(event, ${isEdit})" class="space-y-6">
                    <div>
                        ${sectionTitle('id-card', 'Identitas')}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="${labelClass}">Nama Lengkap <span class="text-red-500">*</span></label>
                                <input type="text" name="nama" value="${s?.nama || ''}" required class="${inputClass}" placeholder= - esuai Akta Kelahiran">
                            </div>
                            <div>
                                <label class="${labelClass}">NISN / ID <span class="text-red-500">*</span></label>
                                <input type="number" name="nisn" value="${s?.nisn || ''}" required ${isEdit ? 'readonly class="' + inputClass + ' opacity-60 cursor-not-allowed"' : `class="${inputClass}"`} placeholder="Nomor Induk Siswa">
                            </div>
                            <div class="relative group">
                                <label class="${labelClass}">Kelas <span class="text-red-500">*</span></label>
                                <input type="text" name="kelas" id="inputKelas" 
                                    value="${s?.kelas || ''}" 
                                    required 
                                    class="${inputClass}" 
                                    placeholder="Ketik atau pilih kelas" 
                                    autocomplete="off"
                                    onfocus="openKelasDropdown()"
                                    oninput="filterKelasDropdown(this.value)"
                                    onblur="closeKelasDropdown()">
                                <div id="dropdownKelasList" class="hidden absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto mt-1 scrollbar-hide"></div>
                            </div>
                        </div>
                    </div>
                    <div>
                        ${sectionTitle('user', 'Biodata')}
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="${labelClass}">Jenis Kelamin</label>
                                <select name="jenisKelamin" class="${inputClass}">
                                    <option value="Laki-laki" ${s?.jenisKelamin === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                                    <option value="Perempuan" ${s?.jenisKelamin === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label class="${labelClass}">Tempat Lahir</label>
                                <input type="text" name="tempatLahir" value="${s?.tempatLahir || ''}" class="${inputClass}" placeholder="Contoh: Malang">
                            </div>
                            <div>
                                <label class="${labelClass}">Tanggal Lahir <span class="text-red-500">*</span></label>
                                <input type="date" name="tanggalLahir" value="${s?.tanggalLahir || ''}" required class="${inputClass}">
                            </div>
                            <div>
                                <label class="${labelClass}">Agama</label>
                                <select name="agama" class="${inputClass}">
                                    <option value="Islam" ${s?.agama === 'Islam' ? 'selected' : ''}>Islam</option>
                                    <option value="Kristen" ${s?.agama === 'Kristen' ? 'selected' : ''}>Kristen</option>
                                    <option value="Katolik" ${s?.agama === 'Katolik' ? 'selected' : ''}>Katolik</option>
                                    <option value="Hindu" ${s?.agama === 'Hindu' ? 'selected' : ''}>Hindu</option>
                                    <option value="Buddha" ${s?.agama === 'Buddha' ? 'selected' : ''}>Buddha</option>
                                    <option value="Lainnya" ${s?.agama === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="bg-[#f4f6fb] border border-[#d0d8e8]/60 rounded-2xl p-5">
                        ${sectionTitle('users', 'Orang Tua & Kontak')}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="${labelClass}">Nama Ayah</label>
                                <input type="text" name="namaAyah" value="${s?.namaAyah || ''}" class="${inputClass}" placeholder="Nama lengkap ayah">
                            </div>
                            <div>
                                <label class="${labelClass}">Nama Ibu</label>
                                <input type="text" name="namaIbu" value="${s?.namaIbu || ''}" class="${inputClass}" placeholder="Nama lengkap ibu">
                            </div>
                            <div>
                                <label class="${labelClass}">No. Handphone</label>
                                <input type="tel" name="noHp" value="${s?.noHp || ''}" class="${inputClass}" placeholder="08xxxxxxxxxx">
                            </div>
                            <div>
                                <label class="${labelClass}">Email <span class="normal-case font-normal text-gray-400">(untuk login Google)</span></label>
                                <input type="email" name="email" value="${s?.email || ''}" class="${inputClass}" placeholder="nama@email.com">
                            </div>
                        </div>
                    </div>
                    <div>
                        ${sectionTitle('map-location-dot', 'Alamat')}
                        <textarea name="alamat" rows="2" class="${inputClass}" placeholder="Alamat lengkap tempat tinggal">${s?.alamat || ''}</textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="closeModal()" class="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition">Batal</button>
                        <button type="submit" class="px-6 py-3 bg-gradient-to-r from-[#1b2a4a] to-[#23365e] hover:from-[#152238] hover:to-[#1b2a4a] text-white rounded-xl font-bold shadow-lg shadow-[#b8c4d8]/50 transition transform active:scale-95 flex items-center gap-2">
                            <i class="fas fa-save text-sm"></i> Simpan Data
                        </button>
                    </div>
                    ${isEdit ? `<input type="hidden" name="oldNisn" value="${s.nisn}">` : ''}
                </form>
            </div>
        </div>`;
    }
    function viewSiswa(siswa) {
        showModal(createViewSiswaModal(siswa), 'max-w-2xl');
    }
    function createViewSiswaModal(s) {
        return `
            <div class="bg-gradient-to-r from-[#1b2a4a] to-[#152238] px-4 py-3 text-white flex justify-between items-center shrink-0">
                <div class="flex gap-2.5 items-center min-w-0">
                    <div class="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-sm font-bold ring-1 ring-white/20 shrink-0 uppercase">
                        ${(s.nama || '-').charAt(0)}
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-sm font-extrabold tracking-tight truncate">${s.nama || '-'}</h3>
                        <p class="opacity-90 text-[10px] flex items-center gap-1.5">
                            <i class="far fa-id-card"></i> ${s.nisn || '-'}
                            <span class="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">${s.kelas || '-'}</span>
                        </p>
                    </div>
                </div>
                <button onclick="closeModal()" class="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
                ${_modalSection('fa-user-circle', 'Data Pribadi', `
                    ${_modalRow('Jenis Kelamin', s.jenisKelamin)}
                    ${_modalRow('Tempat Lahir', s.tempatLahir)}
                    ${_modalRow('Tanggal Lahir', s.tanggalLahir)}
                    ${_modalRow('Agama', s.agama)}
                `)}
                ${_modalSection('fa-users', 'Orang Tua & Kontak', `
                    ${_modalRow('Nama Ayah', s.namaAyah)}
                    ${_modalRow('Nama Ibu', s.namaIbu)}
                    ${_modalRow('No. Handphone', s.noHp)}
                    ${_modalRow('Email', s.email)}
                `)}
                <div class="sm:col-span-2">
                    ${_modalSection('fa-map-marker-alt', 'Alamat', `
                        <div class="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium break-words whitespace-pre-line">${s.alamat || 'Alamat belum diisi.'}</div>
                    `)}
                </div>
            </div>
            <div class="px-4 pb-3 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2 shrink-0">
                <button onclick="closeModal()" class="px-3.5 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                    Tutup
                </button>
                <button onclick="editSiswaByNisn('${s.nisn}')" class="px-3.5 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold text-xs hover:bg-amber-200 transition flex items-center justify-center gap-1.5">
                    <i class="fas fa-edit"></i> Edit Data
                </button>
            </div>`;
    }
function deleteSiswaConfirm(nisn, nama) {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: `Data siswa "${nama}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
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
                        tableState.siswa.fullData = []; 
                        loadDataSiswa(); 
                        Swal.fire(
                            'Terhapus!',
                            'Data siswa berhasil dihapus.',
                            'success'
                        );
                    } else {
                        Swal.fire(
                            'Gagal!',
                            r.message,
                            'error'
                        );
                    }
                })
                .withFailureHandler(err => {
                    hideLoading();
                    Swal.fire('Error', 'Terjadi kesalahan server: ' + err, 'error');
                })
                .deleteSiswa(token, nisn); 
            }
        });
    }
    function triggerImportSiswa() {
        document.getElementById('fileInputSiswa').click();
    }
async function handleFileImportSiswa(input) {
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
            const hasNama = firstRow.hasOwnProperty('Nama') || firstRow.hasOwnProperty('Nama Lengkap');
            const hasNISN = firstRow.hasOwnProperty('NISN') || firstRow.hasOwnProperty('Id');
            if (!hasNama || !hasNISN) {
                hideLoading();
                showAlert('error', 'Format Excel salah! Pastikan ada kolom header: Nama Lengkap dan NISN. Gunakan tombol "Download Template" untuk mendapatkan format yang benar.');
                input.value = '';
                return;
            }
            processImportSiswa(jsonData, input);
        };
        reader.onerror = function() {
            hideLoading();
            showAlert('error', 'Gagal membaca file.');
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
function processImportSiswa(data, inputElement) {
        const formattedData = data.map(row => {
            const clean = importField;
            return {
                nama: clean(row, ['Nama Lengkap', 'Nama'], false),
                nisn: clean(row, ['NISN', 'Id'], false).replace(/'/g, ""),
                jenisKelamin: clean(row, ['Jenis Kelamin', 'JK'], false),
                tanggalLahir: clean(row, ['Tanggal Lahir', 'Tgl Lahir'], true),
                agama: clean(row, ['Agama'], false),
                namaAyah: clean(row, ['Nama Ayah'], false),
                namaIbu: clean(row, ['Nama Ibu'], false),
                noHp: clean(row, ['No Handphone', 'HP', 'No HP'], false),
                email: clean(row, ['Email', 'E-mail', 'Alamat Email'], false),
                kelas: clean(row, ['Kelas'], false),
                alamat: clean(row, ['Alamat'], false)
            };
        });
        console.log("Data Siap Import:", formattedData[0]);
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                inputElement.value = ''; 
                if (res.success) {
                    tableState.siswa.fullData = [];
                    loadDataSiswa(); 
                    let msg = `Berhasil: ${res.added}, Gagal/Duplikat: ${res.skipped}`;
                    showAlert('success', 'Import Selesai! ' + msg);
                } else {
                    showAlert('error', res.message);
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                inputElement.value = '';
                showAlert('error', 'Error Server: ' + err);
            })
            .importSiswaBulk(formattedData);
    }
