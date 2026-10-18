function loadKenaikanKelas() {
    stopAndBack(false);
    setActiveMenu('Kenaikan Kelas');
    showView('view-kenaikan-kelas');
    document.getElementById('container-promo-siswa').classList.add('hidden');
    const placeholder = document.getElementById('promo-placeholder');
    placeholder.classList.remove('hidden');
    placeholder.innerHTML = `<i class="fas fa-chalkboard-teacher text-4xl mb-3 opacity-30"></i><p>Silakan pilih kelas asal dan tujuan untuk memulai.</p>`;
    const selAsal = document.getElementById('promoKelasAsal');
    const selTujuan = document.getElementById('promoKelasTujuan');
    selAsal.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    selTujuan.innerHTML = '<option value="">-- Pilih Tujuan --</option><option value="LULUS" class="font-bold text-[#1b2a4a]">LULUS (Alumni)</option>';
    if (existingClasses && existingClasses.length > 0) {
        existingClasses.sort();
        existingClasses.forEach(c => {
            const opt1 = document.createElement('option');
            opt1.value = c;
            opt1.text = c;
            selAsal.add(opt1);
            const opt2 = document.createElement('option');
            opt2.value = c;
            opt2.text = c;
            selTujuan.add(opt2);
        });
    } else {
        siakadRun.withSuccessHandler(classes => {
            existingClasses = classes;
            const viewEl = document.getElementById('view-kenaikan-kelas');
            if (!viewEl || !viewEl.classList.contains('active')) return;
            if (classes && classes.length > 0) {
                classes.sort();
                classes.forEach(c => {
                    const opt1 = document.createElement('option');
                    opt1.value = c; opt1.text = c;
                    selAsal.add(opt1);
                    const opt2 = document.createElement('option');
                    opt2.value = c; opt2.text = c;
                    selTujuan.add(opt2);
                });
            }
        }).getDaftarKelas();
    }
}
function onPromoFilterChange() {
    const asal = document.getElementById('promoKelasAsal').value;
    const tujuan = document.getElementById('promoKelasTujuan').value;
    // Reset tampilan jika salah satu filter belum dipilih
    if (!asal || !tujuan) {
        document.getElementById('container-promo-siswa').classList.add('hidden');
        document.getElementById('promo-placeholder').classList.remove('hidden');
        return;
    }
    if (asal === tujuan) {
        document.getElementById('container-promo-siswa').classList.add('hidden');
        document.getElementById('promo-placeholder').classList.remove('hidden');
        document.getElementById('promo-placeholder').innerHTML = `
            <i class="fas fa-exclamation-triangle text-4xl mb-3 text-yellow-400 opacity-70"></i>
            <p class="text-yellow-600 font-semibold">Kelas Asal dan Tujuan tidak boleh sama.</p>`;
        return;
    }
    // Kedua filter sudah dipilih & valid  langsung load data
    loadSiswaUntukPromosi();
}
function loadSiswaUntukPromosi() {
    const asal = document.getElementById('promoKelasAsal').value;
    const tujuan = document.getElementById('promoKelasTujuan').value;
    if (!asal || !tujuan) {
        return;
    }
    if (asal === tujuan) {
        return;
    }
    showLoading(); 
    document.getElementById('tbody-promo-siswa').innerHTML = '<tr><td colspan="4" class="p-4 text-center"><i class="fas fa-circle-notch fa-spin"></i> Mengambil data siswa...</td></tr>';
    document.getElementById('container-promo-siswa').classList.remove('hidden');
    document.getElementById('promo-placeholder').classList.add('hidden');
    siakadRun.withSuccessHandler(siswaList => {
        hideLoading();
        renderTablePromosi(siswaList, tujuan);
    }).getSiswaByKelas(asal);
}
function renderTablePromosi(siswaList, namaKelasTujuan) {
    const tbody = document.getElementById('tbody-promo-siswa');
    tbody.innerHTML = '';
    if (siswaList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500">Tidak ada siswa di kelas ini.</td></tr>';
        return;
    }
    siswaList.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition border-b border-gray-50";
        const labelNaik = namaKelasTujuan === 'LULUS' ? 'Lulus' : 'Naik Kelas';
        const classNaik = namaKelasTujuan === 'LULUS' ? 'text-[#1b2a4a]' : 'text-[#1b2a4a]';
        tr.innerHTML = `
            <td class="p-3 text-center text-gray-500">${i + 1}</td>
            <td class="p-3 font-medium text-gray-800">${s.nama}</td>
            <td class="p-3 text-gray-500 text-xs">${s.nisn}</td>
            <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-4 promo-row" data-nisn="${s.nisn}" data-nama="${s.nama}">
                    <label class="cursor-pointer flex items-center gap-2 p-2 rounded-lg border border-transparent hover:bg-[#e8ecf4] transition">
                        <input type="radio" name="status_${s.nisn}" value="NAIK" checked class="w-4 h-4 text-[#1b2a4a] focus:ring-[#5b7aaa]">
                        <span class="text-xs font-bold ${classNaik}">${labelNaik}</span>
   </label>
                    <label class="cursor-pointer flex items-center gap-2 p-2 rounded-lg border border-transparent hover:bg-red-50 transition">
                        <input type="radio" name="status_${s.nisn}" value="TINGGAL" class="w-4 h-4 text-red-600 focus:ring-red-500">
                        <span class="text-xs font-bold text-red-600">Tinggal Kelas</span>
                    </label>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
function executePromotion() {
    const asal = document.getElementById('promoKelasAsal').value;
    const tujuan = document.getElementById('promoKelasTujuan').value;
    const rows = document.querySelectorAll('.promo-row');
    const promoData = [];
    let countNaik = 0;
    let countTinggal = 0;
    rows.forEach(row => {
        const nisn = row.getAttribute('data-nisn');
        const nama = row.getAttribute('data-nama');
        const status = document.querySelector(`input[name="status_${nisn}"]:checked`).value;
        promoData.push({
            nisn: nisn,
            nama: nama,
            status: status 
        });
        if (status === 'NAIK') countNaik++;
        else countTinggal++;
    });
    if (promoData.length === 0) return;
    Swal.fire({
        title: 'Konfirmasi Kenaikan',
        html: `
            Anda akan memproses kelas <b>${asal}</b> ke <b>${tujuan}</b>.<br><br>
            <ul class="text-left text-sm bg-gray-50 p-3 rounded">
                <li><i class="fas fa-circle-check text-blue-500 mr-1"></i><b>${countNaik}</b> siswa Naik/Lulus</li>
                <li><i class="fas fa-circle-xmark text-red-500 mr-1"></i><b>${countTinggal}</b> siswa Tinggal Kelas</li>
            </ul>
            <br>Lanjutkan?
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Ya, Proses!'
    }).then((result) => {
        if (result.isConfirmed) {
            const btn = document.getElementById('btn-eksekusi-promo');
            const originalTxt = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sedang memproses database...';
            siakadRun.withSuccessHandler(res => {
                btn.disabled = false;
                btn.innerHTML = originalTxt;
                if (res.success) {
                    Swal.fire('Berhasil!', `Data berhasil diperbarui.`, 'success');
                    loadKenaikanKelas();
                    loadDataSiswa();
                } else {
                    // Tampilkan daftar siswa yang masih menunggak
                    let htmlDetail = `
                      <div style="text-align:left">
                        <p style="font-size:13px;color:#6b7280;margin:0 0 10px">${res.message || 'Terdapat siswa yang masih memiliki tunggakan.'}</p>
                        ${(res.skipped && res.skipped.length > 0) ? `
                        <div style="border-radius:10px;overflow:hidden;border:1px solid #fecaca;margin-bottom:10px">
                          <div style="background:#fef2f2;padding:7px 12px;border-bottom:1px solid #fecaca">
                            <span style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:.5px">Daftar Tunggakan</span>
                          </div>
                          <div style="max-height:190px;overflow-y:auto">
                            ${res.skipped.map(s => `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #fee2e2;gap:8px">
                              <div style="min-width:0;flex:1">
                                <div style="font-size:13px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.nama}</div>
                                <div style="font-size:11px;color:#9ca3af;font-family:monospace;margin-top:2px">${s.nisn}</div>
                              </div>
                              <span style="flex-shrink:0;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;white-space:nowrap">${s.jumlah_tunggakan} tagihan</span>
                            </div>`).join('')}
                          </div>
                        </div>
                        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;display:flex;align-items:flex-start;gap:7px">
                          <span style="font-size:14px;flex-shrink:0;margin-top:1px">&#9888;</span>
                          <span>Lunasi tagihan terlebih dahulu sebelum memindahkan ke Alumni.</span>
                        </div>` : ''}
                      </div>`;
                    Swal.fire({
                        icon: 'error',
                        title: 'Ada Tunggakan!',
                        html: htmlDetail,
                        confirmButtonColor: '#dc2626',
                        confirmButtonText: 'Mengerti',
                        width: 420
                    });
                }
            }).processIndividualPromotion(asal, tujuan, promoData);
        }
    });
}
function showModalArsip() {
    Swal.fire({
        title: 'Tutup Tahun Ajaran (Arsip)',
        html: `
            <p class="text-xs text-gray-600 mb-3">Backup data absensi ke file baru & reset database absensi utama.</p>
            <input type="text" id="swal-input-arsip" class="swal2-input" placeholder="Nama File Arsip (misal: Absensi 2024-2025)">
        `,
        showCancelButton: true,
        confirmButtonText: 'Arsipkan & Reset',
        confirmButtonColor: '#d33',
        preConfirm: () => {
            const nama = Swal.getPopup().querySelector('#swal-input-arsip').value;
            if (!nama) Swal.showValidationMessage('Nama arsip wajib diisi');
            return nama;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            showLoading();
            siakadRun.withSuccessHandler(res => {
                hideLoading();
                if(res.success) Swal.fire('Sukses', 'Data berhasil diarsipkan', 'success');
                else Swal.fire('Gagal', res.message, 'error');
            }).archiveAndResetYear(result.value);
        }
    });
}
function showLoading() { /* loading Swal dinonaktifkan sesuai permintaan */ }
function hideLoading() {
    Swal.close();
}
function renderMappingTable(classes) {
    const tbody = document.getElementById('tbody-mapping-kelas');
    tbody.innerHTML = '';
    classes.sort();
    classes.forEach(kelasAsal => {
        let options = `<option value="">-- Pilih --</option>`;
        options += `<option value="LULUS" class="font-bold text-red-600">LULUS (Jadi Alumni)</option>`;
        classes.forEach(kelasTujuan => {
            options += `<option value="${kelasTujuan}">${kelasTujuan}</option>`;
        });
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 transition";
        tr.innerHTML = `
            <td class="p-3 font-bold text-gray-700 border-b border-gray-100">
                <input type="hidden" class="input-kelas-asal" value="${kelasAsal}">
                ${kelasAsal}
            </td>
            <td class="p-3 text-center text-gray-400 border-b border-gray-100">
                <i class="fas fa-arrow-right"></i>
            </td>
            <td class="p-3 border-b border-gray-100">
                <select class="input-kelas-tujuan w-full p-1 border border-gray-300 rounded text-sm focus:ring-blue-500">
                    ${options}
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
function processKenaikanKelas() {
    const mapping = [];
    const rows = document.querySelectorAll('#tbody-mapping-kelas tr');
    let isValid = true;
    rows.forEach(row => {
        const asal = row.querySelector('.input-kelas-asal').value;
        const tujuan = row.querySelector('.input-kelas-tujuan').value;
        if (tujuan) {
            mapping.push({ asal: asal, tujuan: tujuan });
        }
    });
    if (mapping.length === 0) {
        showAlert('error', 'Belum ada kenaikan kelas yang dipilih.');
        return;
    }
    Swal.fire({
        title: 'Konfirmasi Kenaikan?',
        text: `Anda akan memproses ${mapping.length} aturan kenaikan kelas. Data siswa akan berubah permanen!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4F46E5',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Proses Sekarang!'
    }).then((result) => {
        if (result.isConfirmed) {
            const btn = document.getElementById('btn-proses-naik');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memproses...';
            siakadRun.withSuccessHandler(res => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                loadDataSiswa();
                loadKenaikanKelas();
                if (res.skipped && res.skipped.length > 0) {
                    // Ada yang berhasil + ada yang dilewati karena tunggakan
                    let htmlDetail = `
                        <div style="text-align:left">
                          <div style="display:flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:13px;color:#166534">
                            <span style="font-size:15px">&#10003;</span>
                            <span><strong>${res.movedCount}</strong> siswa berhasil diproses.</span>
                          </div>
                          <div style="display:flex;align-items:center;gap:8px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:13px;color:#854d0e">
                            <span style="font-size:15px">&#9888;</span>
                            <span><strong>${res.skipped.length}</strong> siswa dilewati karena masih menunggak.</span>
                          </div>
                          <div style="border-radius:10px;overflow:hidden;border:1px solid #fde68a;margin-bottom:10px">
                            <div style="background:#fefce8;padding:7px 12px;border-bottom:1px solid #fde68a">
                              <span style="font-size:11px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:.5px">Siswa Dilewati</span>
                            </div>
                            <div style="max-height:190px;overflow-y:auto">
                              ${res.skipped.map(s => `
                              <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #fef9c3;gap:8px">
                                <div style="min-width:0;flex:1">
                                  <div style="font-size:13px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.nama}</div>
                                  <div style="font-size:11px;color:#9ca3af;margin-top:2px">${s.kelas}</div>
                                </div>
                                <span style="flex-shrink:0;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;white-space:nowrap">${s.jumlah_tunggakan} tagihan</span>
                              </div>`).join('')}
                            </div>
                          </div>
                          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e;display:flex;align-items:flex-start;gap:7px">
                            <span style="font-size:14px;flex-shrink:0;margin-top:1px">&#9888;</span>
                            <span>Lunasi tagihan siswa tersebut, lalu jalankan kenaikan kelas ulang.</span>
                          </div>
                        </div>`;
                    Swal.fire({
                        icon: 'warning',
                        title: 'Selesai dengan Catatan',
                        html: htmlDetail,
                        confirmButtonColor: '#d97706',
                        confirmButtonText: 'Mengerti',
                        width: 440
                    });
                } else {
                    Swal.fire('Berhasil!', `Data berhasil diperbarui. ${res.movedCount} siswa dipindahkan/lulus.`, 'success');
                }
            }).processGradePromotion(mapping);
        }
    });
}
function processTutupTahun() {
    const namaArsip = document.getElementById('namaArsip').value.trim();
    if (!namaArsip) {
        showAlert('error', 'Harap isi Label Arsip terlebih dahulu (Misal: Arsip 2024-2025)');
        return;
    }
    Swal.fire({
        title: 'TUTUP TAHUN AJARAN?',
        html: `Anda akan mengarsipkan data ke file <b>"${namaArsip}"</b> dan <span style="color:red; font-weight:bold;">MENGHAPUS SEMUA DATA ABSENSI</span> di aplikasi ini.<br><br>Tindakan ini tidak dapat dibatalkan!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2563eb', 
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Saya Paham & Lanjutkan'
    }).then((result) => {
        if (result.isConfirmed) {
            const btn = document.getElementById('btn-proses-arsip');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Mengarsipkan... (Bisa memakan waktu)';
            siakadRun.withSuccessHandler(res => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (res.success) {
                    Swal.fire('Selesai!', 'Data absensi tahunan berhasil diarsipkan dan direset.', 'success');
                    document.getElementById('namaArsip').value = '';
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            }).archiveAndResetYear(namaArsip);
        }
    });
}
function handleArchiveAndReset() {
        const backupNameInput = document.getElementById('backupName');
        const backupName = backupNameInput ? backupNameInput.value.trim() : ''; 
        Swal.fire({
            title: 'Tutup Tahun Ajaran?',
            text: "Sistem akan membackup data saat ini (Absensi, Siswa, Kelas) lalu MERESET data utama untuk tahun ajaran baru. Tindakan ini tidak bisa dibatalkan!",
            icon: 'warning',
            input: 'text', 
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Tutup & Reset!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                showLoading();
                siakadRun
                    .withSuccessHandler(function(res) {
                        hideLoading();
                        if (res.success) {
                            Swal.fire({
                                title: 'Berhasil!',
                                text: res.message + '\nFile Backup: ' + res.backupName, 
                                icon: 'success'
                            }).then(() => {
                                loadDashboardData(); 
                            });
                        } else {
                            showAlert('error', res.message);
                        }
                    })
                    .withFailureHandler(function(err) {
                        hideLoading();
                        showAlert('error', 'Gagal server: ' + err);
                    })
                    .archiveAndReset(backupName); 
            }
        });
    }
