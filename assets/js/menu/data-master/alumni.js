// data-master/alumni.js
// Sub-modul Data Master: Data Alumni.
// Dipecah dari assets/js/menu/data-master.js -- butuh core.js dimuat lebih dulu.

function loadDataAlumni() {
    stopAndBack(false);
    setActiveMenu('Data Alumni');
    showView('view-data-alumni');
    selectedAlumniIds.clear();
    updateBulkDeleteUI('alumni');
    const checkAllAlumniEl = document.getElementById('checkAllAlumni');
    if (checkAllAlumniEl) checkAllAlumniEl.checked = false;
    const dropdown = document.getElementById('filterTahunAlumni');
    const fillDropdown = (dataTahun) => {
        if (!dropdown) return;
        const currentValue = dropdown.value;
        let options = '<option value="">Semua Tahun Lulus</option>';
        if (dataTahun && dataTahun.length > 0) {
            dataTahun.forEach(tahun => {
                options += `<option value="${tahun}">${tahun}</option>`;
            });
        }
        dropdown.innerHTML = options;
        if (currentValue) dropdown.value = currentValue;
    };
    dropdown.innerHTML = '<option value="">Memuat data...</option>';
    siakadRun.withSuccessHandler(result => {
        // Polyfill mengembalikan array langsung untuk getDaftarTahunLulus
        if (Array.isArray(result)) {
            fillDropdown(result);
        } else if (result && result.success) {
            fillDropdown(result.data);
        }
    }).withFailureHandler(() => {
        if (dropdown) dropdown.innerHTML = '<option value="">Semua Tahun Lulus</option>';
    }).getDaftarTahunLulus();
    document.getElementById('tbody-alumni').innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data alumni...</td></tr>';
    siakadRun.withSuccessHandler(result => {
        if (result.success) {
            tableState.alumni.fullData = result.data;
            processTableData('alumni');
        } else {
            document.getElementById('tbody-alumni').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>${result.message || 'Gagal memuat data alumni.'}</td></tr>`;
            showAlert('error', result.message);
        }
    }).withFailureHandler(err => {
        document.getElementById('tbody-alumni').innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500"><i class="fas fa-exclamation-circle mr-2"></i>Gagal memuat data: ${err && err.message ? err.message : 'terjadi kesalahan'}</td></tr>`;
        console.error('loadDataAlumni error:', err);
    }).getAlumniList();
}
function renderAlumniRows(data, startIdx) {
    const tbody = document.getElementById('tbody-alumni');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((alumni, i) => {
        const isSelected = selectedAlumniIds.has(String(alumni.nisn));
        return `
    <tr class="hover:bg-gray-50 transition border-b border-gray-50 group select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${alumni.nisn}" data-type="alumni">
        <td class="p-1.5 md:p-3 text-center hidden md:table-cell">
            <input type="checkbox" class="chk-alumni w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" value="${alumni.nisn}" ${isSelected ? 'checked' : ''} onchange="toggleAlumniRow('${alumni.nisn}', this.checked)">
        </td>
        <td class="p-1.5 md:p-3 text-center text-gray-500 text-[10px] md:text-sm">${startIdx + i + 1}</td>
        <td class="p-1.5 md:p-3">
            <div class="flex items-center">
                <div class="relative mr-3 shrink-0 avatar-badge-slot">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-150 ${isSelected ? 'bg-[#1b2a4a] text-white' : 'bg-[#d0d8e8] text-[#1b2a4a]'}" data-initial="${(alumni.nama || '-').charAt(0)}">
                        ${isSelected ? '<i class="fas fa-check text-[11px]"></i>' : (alumni.nama || '-').charAt(0)}
                    </div>
                </div>
                <div class="min-w-0">
                    <div class="font-bold text-xs md:text-sm text-gray-900 truncate">${alumni.nama}</div>
                    <div class="text-[10px] text-gray-400 md:hidden font-mono mt-0.5">${alumni.nisn}</div>
                </div>
            </div>
        </td>
        <td class="p-1.5 md:p-3 hidden md:table-cell text-sm text-gray-600 font-mono">${alumni.nisn}</td>
        <td class="p-1.5 md:p-3 hidden sm:table-cell"><span class="px-2 py-1 bg-[#e8ecf4] text-[#152238] rounded text-xs font-bold">${alumni.kelasTerakhir}</span></td>
        <td class="p-1.5 md:p-3 text-center"><span class="px-2 py-1 bg-[#e8ecf4] text-[#152238] rounded text-xs font-bold">${alumni.tahunLulus}</span></td>
        <td class="p-1.5 md:p-3 hidden lg:table-cell text-sm text-gray-600">${alumni.kontak}</td>
        <td class="p-1.5 md:p-3 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                <button onclick="viewAlumniDetail('${alumni.nisn}')" class="btn-aksi-tabel aksi-lihat text-[10px] md:text-xs" title="Lihat Detail"><i class="fas fa-eye"></i></button>
            </div>
        </td>
    </tr>`}).join('');
    updateSelectAllHeaderState('alumni');
}
function deleteAlumniConfirm(nisn, nama) {
    Swal.fire({
        title: 'Hapus Data Alumni?',
        text: `Data alumni "${nama}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
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
            .deleteAlumni(token, nisn);
    });
}
// ---------- Helper & Modal Detail (Siswa / Guru / Alumni) ----------
// Diletakkan di scope global agar tersedia untuk semua fungsi view detail.
function viewAlumniDetail(nisn) {
    showLoading();
    const token = currentUser.token;
    siakadRun
        .withSuccessHandler(function(res) {
            hideLoading();
            if (!res || !res.success) {
                Swal.fire('Gagal', (res && res.message) || 'Gagal memuat detail', 'error');
                return;
            }
            const d = res.data;
            const bills = (d.tagihan || []).length
                ? d.tagihan.map(function(b) {
                    const st = String(b.status || '').toLowerCase();
                    const badge = st === 'lunas'
                        ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Lunas</span>'
                        : (st === 'belum bayar' || st === 'belum' || st === 'menunggu'
                            ? '<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Belum</span>'
                            : '<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">' + (b.status || '-') + '</span>');
                    return '<tr class="border-b border-gray-50 dark:border-gray-700"><td class="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">' + (b.bulan || '-') + '</td><td class="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">' + (b.jenis || '-') + '</td><td class="px-3 py-2 text-right font-bold text-gray-800 dark:text-gray-300 text-xs">' + 'Rp ' + Number(b.nominal || 0).toLocaleString('id-ID') + '</td><td class="px-3 py-2 text-center">' + badge + '</td></tr>';
                }).join('')
                : '<tr><td colspan="4" class="py-8 text-center text-[#8fa3c0] dark:text-gray-600 text-xs">Tidak ada tagihan</td></tr>';
            const pays = (d.pembayaran || []).length
                ? d.pembayaran.map(function(p) {
                    return '<tr class="border-b border-gray-50 dark:border-gray-700"><td class="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">' + (p.tanggal || '-') + '</td><td class="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">' + (p.metode || '-') + '</td><td class="px-3 py-2 text-right font-bold text-emerald-600 text-xs">' + 'Rp ' + Number(p.nominal || 0).toLocaleString('id-ID') + '</td><td class="px-3 py-2 text-gray-400 dark:text-gray-500 text-[10px] font-mono">' + (p.resi || '-') + '</td></tr>';
                }).join('')
                : '<tr><td colspan="4" class="py-8 text-center text-[#8fa3c0] dark:text-gray-600 text-xs">Belum ada pembayaran</td></tr>';
            const financeSection = (d.tagihan && d.tagihan.length) || (d.pembayaran && d.pembayaran.length) ? `
                ${_modalSection('fa-file-invoice-dollar', 'Tagihan SPP', `
                    <div class="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-800 text-[10px] uppercase text-gray-400 dark:text-gray-500 sticky top-0 z-10">
                                <tr><th class="px-3 py-2 text-left">Bulan</th><th class="px-3 py-2 text-left">Jenis</th><th class="px-3 py-2 text-right">Nominal</th><th class="px-3 py-2 text-center">Status</th></tr>
                            </thead>
                            <tbody class="divide-y">${bills}</tbody>
                        </table>
                    </div>
                `)}
                ${_modalSection('fa-receipt', 'Pembayaran', `
                    <div class="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-800 text-[10px] uppercase text-gray-400 dark:text-gray-500 sticky top-0 z-10">
                                <tr><th class="px-3 py-2 text-left">Tanggal</th><th class="px-3 py-2 text-left">Metode</th><th class="px-3 py-2 text-right">Nominal</th><th class="px-3 py-2 text-left">No. Resi</th></tr>
                            </thead>
                            <tbody class="divide-y">${pays}</tbody>
                        </table>
                    </div>
                    <div class="px-3 py-2 mt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-right rounded-b-lg">
                        <span class="text-xs font-black text-emerald-600">Total: Rp ${Number(d.totalBayar || 0).toLocaleString('id-ID')}</span>
                    </div>
                `)}
            ` : '';
            showModal(`
                <div class="bg-gradient-to-r from-[#1b2a4a] to-[#152238] px-5 py-3 text-white flex justify-between items-center shrink-0">
                        <div class="flex gap-3 items-center">
                            <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-sm font-bold border-2 border-white/30 shadow-inner">
                                ${(d.nama || '-').charAt(0)}
                            </div>
                            <div>
                                <h3 class="text-base font-bold tracking-tight">${d.nama || '-'}</h3>
                                <p class="opacity-90 text-sm flex items-center gap-2">
                                    <i class="far fa-id-card"></i> ${d.nisn || '-'}
                                    <span class="bg-white/20 px-2 py-0.5 rounded text-xs font-bold ml-1">Lulus ${d.tahunLulus || '-'}</span>
                                </p>
                            </div>
                        </div>
                        <button onclick="closeModal()" class="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition text-white">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0 overflow-y-auto">
                        <div class="space-y-3">
                            ${_modalSection('fa-user-circle', 'Data Pribadi', `
                                ${_modalRow('NISN', d.nisn)}
                                ${_modalRow('Jenis Kelamin', d.jenisKelamin)}
                                ${_modalRow('Tempat Lahir', d.tempatLahir)}
                                ${_modalRow('Tanggal Lahir', d.tanggalLahir)}
                            `)}
                        </div>
                        <div class="space-y-3">
                            ${_modalSection('fa-users', 'Orang Tua & Kontak', `
                                ${_modalRow('Nama Ayah', d.namaAyah)}
                                ${_modalRow('Nama Ibu', d.namaIbu)}
                                ${_modalRow('No. Handphone', d.noHp)}
                                ${_modalRow('Email', d.email)}
                            `)}
                        </div>
                        <div class="space-y-3">
                            ${_modalSection('fa-info-circle', 'Info Lainnya', `
                                ${_modalRow('Agama', d.agama)}
                                ${_modalRow('Kelas Terakhir', d.kelasTerakhir)}
                                ${_modalRow('Tahun Lulus', d.tahunLulus)}
                            `)}
                        </div>
                        <div class="md:col-span-3 space-y-3">
                            ${_modalSection('fa-map-marker-alt', 'Alamat', `
                                <div class="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium break-words whitespace-pre-line">${d.alamat || 'Alamat belum diisi.'}</div>
                            `)}
                            ${financeSection}
                        </div>
                    </div>
                    <div class="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end flex-shrink-0">
                        <button onclick="closeModal()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition">Tutup</button>
                    </div>
            `, 'max-w-4xl');
        })
        .withFailureHandler(function(err) {
            hideLoading();
            Swal.fire('Error', 'Terjadi kesalahan server: ' + (err && err.message ? err.message : err), 'error');
        })
        .getAlumniDetail(token, nisn);
}
