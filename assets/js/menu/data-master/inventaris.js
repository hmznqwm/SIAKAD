// data-master/inventaris.js
// Sub-modul Data Master: Data Inventaris.
// Dipecah dari assets/js/menu/data-master.js -- butuh core.js dimuat lebih dulu.

function loadDataInventaris() {
    stopAndBack(false);
    setActiveMenu('Data Inventaris');
    showView('view-data-inventaris');
    selectedInventarisIds.clear();
    updateBulkDeleteUI('inventaris');
    const checkAllEl = document.getElementById('checkAllInventaris');
    if (checkAllEl) checkAllEl.checked = false;
    if (tableState.inventaris.fullData.length > 0) {
        processTableData('inventaris');
    } else {
        document.getElementById('tbody-inventaris').innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data inventaris...</td></tr>';
        const token = currentUser.token;
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                tableState.inventaris.fullData = result.data;
                processTableData('inventaris');
            } else {
                document.getElementById('tbody-inventaris').innerHTML = `<tr><td colspan="9" class="p-8 text-center text-red-500 font-bold"><i class="fas fa-exclamation-triangle mr-2"></i>${result.message}</td></tr>`;
                showAlert('error', result.message);
            }
        })
        .withFailureHandler(error => {
            document.getElementById('tbody-inventaris').innerHTML = `<tr><td colspan="9" class="p-8 text-center text-red-500">Gagal koneksi: ${error}</td></tr>`;
        })
        .getInventarisList(token);
    }
}
function renderInventarisRows(data, startIdx) {
    const tbody = document.getElementById('tbody-inventaris');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400">Belum ada data inventaris.</td></tr>';
        return;
    }
    const kondisiColor = (k) => {
        if (k === 'Baik') return 'bg-[#e8ecf4] text-[#152238]';
        if (k === 'Rusak Ringan') return 'bg-amber-50 text-amber-700';
        if (k === 'Rusak Berat') return 'bg-red-50 text-red-700';
        return 'bg-gray-100 text-gray-600';
    };
    tbody.innerHTML = data.map((item, i) => {
    const isSelected = selectedInventarisIds.has(String(item.kodeBarang));
    return `
    <tr class="mobile-action-card hover:bg-gray-50 transition border-b border-gray-50 group select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${item.kodeBarang}" data-type="inventaris">
        <td class="p-4 text-center hidden md:table-cell">
            <input type="checkbox" class="chk-inventaris w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" value="${item.kodeBarang}" ${isSelected ? 'checked' : ''} onchange="toggleInventarisRow('${item.kodeBarang}', this.checked)">
        </td>
        <td class="p-4 text-center text-gray-500 text-sm">${startIdx + i + 1}</td>
        <td class="p-3">
            <div class="flex items-center">
                <div class="relative mr-2 shrink-0 avatar-badge-slot">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-[#1b2a4a] text-white' : 'bg-[#d0d8e8] text-[#1b2a4a]'}">
                        ${isSelected ? '<i class="fas fa-check text-[11px]"></i>' : '<i class="fas fa-box"></i>'}
                    </div>
                </div>
                <div class="font-semibold text-sm text-gray-900 whitespace-nowrap">${item.namaBarang}</div>
            </div>
        </td>
        <td class="p-3 text-sm text-gray-600 font-mono whitespace-nowrap">${item.kodeBarang}</td>
        <td class="p-3 text-sm text-gray-600">${item.kategori || '-'}</td>
        <td class="p-3 text-center text-sm text-gray-700 font-bold whitespace-nowrap">${item.jumlah || 0} ${item.satuan || ''}</td>
        <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${kondisiColor(item.kondisi)}">${item.kondisi || '-'}</span></td>
        <td class="p-3 text-sm text-gray-600">${item.lokasi || '-'}</td>
        <td class="p-4 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                ${(['admin', 'pencatat'].includes(currentUser.role)) ? `<button onclick='editInventaris(${JSON.stringify(item)})' class="btn-aksi-tabel aksi-edit" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                
            </div>
        </td>
    </tr>`;
    }).join('');
    updateSelectAllHeaderState('inventaris');
}
function saveInventaris(e, isEdit) {
    e.preventDefault();
    showLoading();
    const fd = new FormData(e.target);
    const inventarisData = {
        namaBarang: fd.get('namaBarang'),
        kodeBarang: fd.get('kodeBarang'),
        kategori: fd.get('kategori'),
        jumlah: fd.get('jumlah'),
        satuan: fd.get('satuan'),
        kondisi: fd.get('kondisi'),
        lokasi: fd.get('lokasi'),
        tanggalMasuk: fd.get('tanggalMasuk'),
        keterangan: fd.get('keterangan')
    };
    const token = currentUser ? currentUser.token : null;
    const callback = (res) => {
        hideLoading();
        if (res.success) {
            closeModal();
            tableState.inventaris.fullData = [];
            loadDataInventaris();
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
        const oldKode = fd.get('oldKodeBarang');
        siakadRun
            .withSuccessHandler(callback)
            .withFailureHandler(failureCallback)
            .updateInventaris(token, oldKode, inventarisData);
    } else {
        siakadRun
            .withSuccessHandler(callback)
            .withFailureHandler(failureCallback)
            .addInventaris(token, inventarisData);
    }
}
function deleteInventarisConfirm(kode, nama) {
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: `Barang "${nama}" akan dihapus secara permanen dari data inventaris. Tindakan ini tidak dapat dibatalkan!`,
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
                    selectedInventarisIds.delete(String(kode));
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
            .deleteInventaris(token, kode);
        }
    });
}
    function showAddInventarisModal() { showModal(createInventarisModal()); }
    function editInventaris(item) { showModal(createInventarisModal(item)); }
    function createInventarisModal(item = null) {
        const isEdit = item !== null;
        const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-all";
        const labelClass = "block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide";
        return `
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 class="text-base font-bold text-gray-800">${isEdit ? 'Edit Data Inventaris' : 'Tambah Data Inventaris'}</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-lg"></i></button>
            </div>
            <div class="p-6 max-h-[75vh] overflow-y-auto">
                <form onsubmit="saveInventaris(event, ${isEdit})" class="space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="md:col-span-2">
                            <label class="${labelClass}">Nama Barang</label>
                            <input type="text" name="namaBarang" value="${item?.namaBarang || ''}" required class="${inputClass}" placeholder="Cth: Meja Kelas">
                        </div>
                        <div>
                            <label class="${labelClass}">Kode Barang</label>
                            <input type="text" name="kodeBarang" value="${item?.kodeBarang || ''}" required ${isEdit ? 'readonly class="' + inputClass + ' opacity-60 cursor-not-allowed"' : `class="${inputClass}"`} placeholder="Cth: INV-001">
                        </div>
                        <div>
                            <label class="${labelClass}">Kategori</label>
                            <input type="text" name="kategori" value="${item?.kategori || ''}" class="${inputClass}" placeholder="Cth: Furnitur / Elektronik">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label class="${labelClass}">Jumlah</label>
                            <input type="number" name="jumlah" min="0" value="${item?.jumlah ?? ''}" required class="${inputClass}" placeholder="0">
                        </div>
                        <div>
                            <label class="${labelClass}">Satuan</label>
                            <input type="text" name="satuan" value="${item?.satuan || ''}" class="${inputClass}" placeholder="Unit / Buah / Set">
                        </div>
                        <div>
                            <label class="${labelClass}">Kondisi</label>
                            <select name="kondisi" class="${inputClass}">
                                <option value="Baik" ${item?.kondisi === 'Baik' ? 'selected' : ''}>Baik</option>
                                <option value="Rusak Ringan" ${item?.kondisi === 'Rusak Ringan' ? 'selected' : ''}>Rusak Ringan</option>
                                <option value="Rusak Berat" ${item?.kondisi === 'Rusak Berat' ? 'selected' : ''}>Rusak Berat</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="${labelClass}">Lokasi / Ruang</label>
                            <input type="text" name="lokasi" value="${item?.lokasi || ''}" class="${inputClass}" placeholder="Cth: Ruang Kelas VI A">
                        </div>
                        <div>
                            <label class="${labelClass}">Tanggal Masuk</label>
                            <input type="date" name="tanggalMasuk" value="${item?.tanggalMasuk || ''}" class="${inputClass}">
                        </div>
                    </div>
                    <div>
                        <label class="${labelClass}">Keterangan</label>
                        <textarea name="keterangan" rows="2" class="${inputClass}">${item?.keterangan || ''}</textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="closeModal()" class="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition">Batal</button>
                        <button type="submit" class="px-6 py-2.5 bg-[#1b2a4a] text-white rounded-xl font-bold shadow-lg hover:bg-[#152238] transition transform active:scale-95">Simpan Data</button>
                    </div>
                    ${isEdit ? `<input type="hidden" name="oldKodeBarang" value="${item.kodeBarang}">` : ''}
                </form>
            </div>
        </div>`;
    }
    function triggerImportInventaris() {
        document.getElementById('fileInputInventaris').click();
    }
    async function handleFileImportInventaris(input) {
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
            const hasNama = firstRow.hasOwnProperty('Nama Barang') || firstRow.hasOwnProperty('Nama');
            const hasKode = firstRow.hasOwnProperty('Kode Barang') || firstRow.hasOwnProperty('Kode');
            if (!hasNama || !hasKode) {
                hideLoading();
                showAlert('error', 'Format Excel salah! Pastikan ada kolom header: Nama Barang dan Kode Barang.');
                input.value = '';
                return;
            }
            processImportInventaris(jsonData, input);
        };
        reader.onerror = function() {
            hideLoading();
            showAlert('error', 'Gagal membaca file.');
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
    function processImportInventaris(data, inputElement) {
        const formattedData = data.map(row => {
            const clean = importField;
            return {
                namaBarang: clean(row, ['Nama Barang', 'Nama'], false),
                kodeBarang: clean(row, ['Kode Barang', 'Kode'], false).replace(/'/g, ""),
                kategori: clean(row, ['Kategori'], false),
                jumlah: clean(row, ['Jumlah'], false) || 0,
                satuan: clean(row, ['Satuan'], false),
                kondisi: clean(row, ['Kondisi'], false) || 'Baik',
                lokasi: clean(row, ['Lokasi'], false),
                tanggalMasuk: clean(row, ['Tanggal Masuk'], true),
                keterangan: clean(row, ['Keterangan'], false)
            };
        });
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                inputElement.value = '';
                if (res.success) {
                    tableState.inventaris.fullData = [];
                    loadDataInventaris();
                    let msg = `Berhasil: ${res.added}, Gagal/Duplikat: ${res.skipped}`;
                    showAlert('success', 'Import Data Inventaris Selesai! ' + msg);
                } else {
                    showAlert('error', res.message);
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                inputElement.value = '';
                showAlert('error', 'Error Server: ' + err);
            })
            .importInventarisBulk(formattedData);
    }
