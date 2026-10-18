// data-master/prestasi.js
// Sub-modul Data Master: Data Prestasi Siswa.
// Dipecah dari assets/js/menu/data-master.js -- butuh core.js dimuat lebih dulu.

function loadDataPrestasi() {
    stopAndBack(false);
    setActiveMenu('Data Prestasi');
    showView('view-data-prestasi');
    selectedPrestasiIds.clear();
    updateBulkDeleteUI('prestasi');
    const checkAllEl = document.getElementById('checkAllPrestasi');
    if (checkAllEl) checkAllEl.checked = false;
    if (tableState.prestasi.fullData.length > 0) {
        processTableData('prestasi');
    } else {
        document.getElementById('tbody-prestasi').innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data prestasi...</td></tr>';
        const token = currentUser.token;
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                tableState.prestasi.fullData = result.data;
                processTableData('prestasi');
            } else {
                document.getElementById('tbody-prestasi').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500 font-bold"><i class="fas fa-exclamation-triangle mr-2"></i>${result.message}</td></tr>`;
                showAlert('error', result.message);
            }
        })
        .withFailureHandler(error => {
            document.getElementById('tbody-prestasi').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500">Gagal koneksi: ${error}</td></tr>`;
        })
        .getPrestasiList(token);
    }
}
function renderPrestasiRows(data, startIdx) {
    const tbody = document.getElementById('tbody-prestasi');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">Belum ada data prestasi.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((p, i) => {
    const isSelected = selectedPrestasiIds.has(String(p.id));
    return `
    <tr class="mobile-action-card hover:bg-gray-50 transition border-b border-gray-50 group select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${p.id}" data-type="prestasi">
        <td class="p-4 text-center hidden md:table-cell">
            <input type="checkbox" class="chk-prestasi w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-amber-600" value="${p.id}" ${isSelected ? 'checked' : ''} onchange="togglePrestasiRow('${p.id}', this.checked)">
        </td>
        <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
        <td class="p-3">
            <div class="flex items-center">
                <div class="relative mr-2 shrink-0 avatar-badge-slot">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-[#1b2a4a] text-white' : 'bg-amber-100 text-amber-600'}" data-initial="<i class=&quot;fas fa-trophy&quot;></i>">
                        ${isSelected ? '<i class="fas fa-check text-[11px]"></i>' : '<i class="fas fa-trophy"></i>'}
                    </div>
                </div>
                <div class="font-semibold text-sm ${p.namaSiswa ? 'text-gray-900' : 'text-gray-400 italic'} whitespace-nowrap">${p.namaSiswa || '(nama kosong)'}</div>
            </div>
        </td>
        <td class="p-3 text-sm text-gray-600">${p.namaKegiatan || '-'}</td>
        <td class="p-3"><span class="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-bold whitespace-nowrap">${p.tingkat || '-'}</span></td>
        <td class="p-3 text-sm text-gray-600">${p.peringkat || '-'}</td>
        <td class="p-4 text-center text-sm text-gray-600">${p.tahun || '-'}</td>
        <td class="p-4 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                ${(['admin', 'pencatat'].includes(currentUser.role)) ? `<button onclick='editPrestasi(${JSON.stringify(p)})' class="btn-aksi-tabel aksi-edit" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
            </div>
        </td>
    </tr>`;
    }).join('');
    updateSelectAllHeaderState('prestasi');
}
function savePrestasi(e, isEdit) {
    e.preventDefault();
    showLoading();
    const fd = new FormData(e.target);
    const tahun = fd.get('tahun') || new Date().getFullYear();
    const prestasiData = {
        namaSiswa: fd.get('namaSiswa'),
        nisn: fd.get('nisn') || '',
        kelas: fd.get('kelas') || '',
        namaKegiatan: fd.get('namaKegiatan') || '',
        jenisPrestasi: fd.get('jenisPrestasi') || '',
        namaPrestasi: (fd.get('namaKegiatan') || '') + (fd.get('jenisPrestasi') ? ' [' + fd.get('jenisPrestasi') + ']' : ''),
        tingkat: fd.get('tingkat') || '',
        peringkat: fd.get('peringkat') || '',
        tahun: tahun,
        tanggal: tahun + '-01-01',
        keterangan: fd.get('keterangan') || ''
    };
    const token = currentUser ? currentUser.token : null;
    const callback = (res) => {
        hideLoading();
        if (res.success) {
            closeModal();
            tableState.prestasi.fullData = [];
            loadDataPrestasi();
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
        const id = fd.get('id');
        siakadRun
            .withSuccessHandler(callback)
            .withFailureHandler(failureCallback)
            .updatePrestasi(token, id, prestasiData);
    } else {
        siakadRun
            .withSuccessHandler(callback)
            .withFailureHandler(failureCallback)
            .addPrestasi(token, prestasiData);
    }
}
function deletePrestasiConfirm(id, nama) {
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: `Data prestasi "${nama}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
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
                    selectedPrestasiIds.delete(String(id));
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
            .deletePrestasi(token, id);
        }
    });
}
    function showAddPrestasiModal() { showModal(createPrestasiModal()); }
    function editPrestasi(p) { showModal(createPrestasiModal(p)); }
    function createPrestasiModal(p = null) {
        const isEdit = p !== null;
        const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 transition-all";
        const labelClass = "block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide";
        return `
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 class="text-base font-bold text-gray-800">${isEdit ? 'Edit Data Prestasi' : 'Tambah Data Prestasi'}</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
            </div>
            <div class="p-6 max-h-[75vh] overflow-y-auto">
                <form onsubmit="savePrestasi(event, ${isEdit})" class="space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="${labelClass}">Nama Siswa</label>
                            <input type="text" name="namaSiswa" value="${p?.namaSiswa || ''}" required class="${inputClass}" placeholder="Nama lengkap siswa">
                        </div>
                        <div>
                            <label class="${labelClass}">Id / NISN (opsional)</label>
                            <input type="text" name="nisn" value="${p?.nisn || ''}" class="${inputClass}" placeholder="Nomor Induk Siswa">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="md:col-span-2">
                            <label class="${labelClass}">Nama Kegiatan / Lomba</label>
                            <input type="text" name="namaKegiatan" value="${p?.namaKegiatan || ''}" required class="${inputClass}" placeholder="Cth: Olimpiade Sains Nasional">
                        </div>
                        <div>
                            <label class="${labelClass}">Jenis Prestasi</label>
                            <select name="jenisPrestasi" class="${inputClass}">
                                <option value="Akademik" ${p?.jenisPrestasi === 'Akademik' ? 'selected' : ''}>Akademik</option>
                                <option value="Non-Akademik" ${p?.jenisPrestasi === 'Non-Akademik' ? 'selected' : ''}>Non-Akademik</option>
                            </select>
                        </div>
                        <div>
                            <label class="${labelClass}">Tingkat</label>
                            <select name="tingkat" class="${inputClass}">
                                <option value="Madrasah" ${p?.tingkat === 'Madrasah' ? 'selected' : ''}>Madrasah</option>
                                <option value="Kecamatan" ${p?.tingkat === 'Kecamatan' ? 'selected' : ''}>Kecamatan</option>
                                <option value="Kabupaten/Kota" ${p?.tingkat === 'Kabupaten/Kota' ? 'selected' : ''}>Kabupaten/Kota</option>
                                <option value="Provinsi" ${p?.tingkat === 'Provinsi' ? 'selected' : ''}>Provinsi</option>
                                <option value="Nasional" ${p?.tingkat === 'Nasional' ? 'selected' : ''}>Nasional</option>
                                <option value="Internasional" ${p?.tingkat === 'Internasional' ? 'selected' : ''}>Internasional</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="${labelClass}">Peringkat / Juara</label>
                            <input type="text" name="peringkat" value="${p?.peringkat || ''}" class="${inputClass}" placeholder="Cth: Juara 1">
                        </div>
                        <div>
                            <label class="${labelClass}">Tahun</label>
                            <input type="number" name="tahun" value="${p?.tahun || new Date().getFullYear()}" required class="${inputClass}" placeholder="2026">
                        </div>
                    </div>
                    <div>
                        <label class="${labelClass}">Keterangan</label>
                        <textarea name="keterangan" rows="2" class="${inputClass}">${p?.keterangan || ''}</textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="closeModal()" class="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition">Batal</button>
                        <button type="submit" class="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold shadow-lg hover:bg-amber-600 transition transform active:scale-95">Simpan Data</button>
                    </div>
                    ${isEdit ? `<input type="hidden" name="id" value="${p.id}">` : ''}
                </form>
            </div>
        </div>`;
    }
    function triggerImportPrestasi() {
        document.getElementById('fileInputPrestasi').click();
    }
    async function handleFileImportPrestasi(input) {
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
            const hasNama = firstRow.hasOwnProperty('Nama Siswa') || firstRow.hasOwnProperty('Nama');
            const hasKegiatan = firstRow.hasOwnProperty('Nama Kegiatan / Lomba') || firstRow.hasOwnProperty('Nama Kegiatan') || firstRow.hasOwnProperty('Lomba');
            if (!hasNama || !hasKegiatan) {
                hideLoading();
                showAlert('error', 'Format Excel salah! Pastikan ada kolom header: Nama Siswa dan Nama Kegiatan / Lomba.');
                input.value = '';
                return;
            }
            processImportPrestasi(jsonData, input);
        };
        reader.onerror = function() {
            hideLoading();
            showAlert('error', 'Gagal membaca file.');
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
    function processImportPrestasi(data, inputElement) {
        const formattedData = data.map(row => {
            const clean = importField;
            return {
                namaSiswa: clean(row, ['Nama Siswa', 'Nama'], false),
                nisn: clean(row, ['NISN', 'Id'], false).replace(/'/g, ""),
                jenisPrestasi: clean(row, ['Jenis Prestasi'], false) || 'Akademik',
                namaKegiatan: clean(row, ['Nama Kegiatan / Lomba', 'Nama Kegiatan', 'Lomba'], false),
                tingkat: clean(row, ['Tingkat'], false) || 'Madrasah',
                peringkat: clean(row, ['Peringkat', 'Juara'], false),
                tahun: clean(row, ['Tahun'], false) || new Date().getFullYear(),
                keterangan: clean(row, ['Keterangan'], false)
            };
        });
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                inputElement.value = '';
                if (res.success) {
                    tableState.prestasi.fullData = [];
                    loadDataPrestasi();
                    let msg = `Berhasil: ${res.added}, Gagal/Dilewati: ${res.skipped}`;
                    showAlert('success', 'Import Data Prestasi Selesai! ' + msg);
                } else {
                    showAlert('error', res.message);
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                inputElement.value = '';
                showAlert('error', 'Error Server: ' + err);
            })
            .importPrestasiBulk(formattedData);
    }
