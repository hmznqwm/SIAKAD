function loadMonitoringAbsensi() {
    stopAndBack(false);
    setActiveMenu('Monitoring');
    showView('view-monitoring');
    document.getElementById('monitoringDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const todayISO = (typeof siakadTodayStr === 'function') ? siakadTodayStr() : new Date().toISOString().split('T')[0];
    const elStart = document.getElementById('exportMonStart');
    const elEnd = document.getElementById('exportMonEnd');
    if(elStart && !elStart.value) elStart.value = todayISO;
    if(elEnd && !elEnd.value) elEnd.value = todayISO;

    const isGuruRole = currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas');
    // Build the kelas list for the dropdown
    const kelasDropdown = document.getElementById('filterKelasMonitoring');
    if (kelasDropdown) {
        let kelasList = [];
        if (isGuruRole && currentUser.kelas) {
            kelasList = String(currentUser.kelas).split(',').map(k => k.trim()).filter(Boolean);
        } else {
            kelasList = existingClasses || [];
        }
        const currentVal = kelasDropdown.value;
        let opts = '<option value="">Semua Kelas</option>';
        kelasList.forEach(k => {
            opts += `<option value="${k}" ${currentVal === k ? 'selected' : ''}>${k}</option>`;
        });
        kelasDropdown.innerHTML = opts;
        kelasDropdown.style.display = '';
        if (kelasDropdown.parentElement) kelasDropdown.parentElement.style.display = '';
    }

    // For guru: pass their kelas to the API so they only see their students
    // Support comma-separated multi-kelas
    const myClass = isGuruRole ? (currentUser.kelas || null) : null;

    // Always force fresh load (data changes frequently throughout the day)
    // For guru, always clear cache to avoid stale cross-class data
    if (isGuruRole) {
        tableState.monitoring.fullData = [];
    }

    if (tableState.monitoring.fullData.length > 0) {
        processTableData('monitoring');
    } else {
        fetchMonitoringData(false);
    }

    // LIVE SYNC dengan Daftar Hadir: refresh otomatis tiap 30 detik
    // selama menu Monitoring terbuka, agar status siswa yang baru diabsen
    // di Daftar Hadir langsung kelihatan di sini.
    if (window._monLiveTimer) clearInterval(window._monLiveTimer);
    window._monLiveTimer = setInterval(function () {
        const view = document.getElementById('view-monitoring');
        if (!view || view.classList.contains('hidden')) {
            clearInterval(window._monLiveTimer);
            window._monLiveTimer = null;
            return;
        }
        tableState.monitoring.fullData = [];
        fetchMonitoringData(true);
    }, 30000);
}
function fetchMonitoringData(silent) {
    const isGuruRole = currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas');
    const myClass = isGuruRole ? (currentUser.kelas || null) : null;
    const tbody = document.getElementById('tbody-monitoring');
    if (!tbody) return;
    if (!silent) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...</td></tr>';
    }
    siakadRun.withSuccessHandler(result => {
        if (result && result.success) {
            tableState.monitoring.fullData = result.data || [];
            populateMonitoringMapelFilter();
            processTableData('monitoring');
        } else if (!silent) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-12 text-center text-gray-400 italic bg-white">Data tidak ditemukan.</td></tr>';
        }
    }).withFailureHandler(err => {
        if (!silent) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-12 text-center text-red-400 italic bg-white">Gagal memuat: ${err}</td></tr>`;
        }
    }).getMonitoringRealtime(myClass);
}
// Isi dropdown filter mapel dari daftar mapel yang ada di data monitoring
function populateMonitoringMapelFilter() {
    const sel = document.getElementById('filterMapelMonitoring');
    if (!sel) return;
    const cur = sel.value;
    const set = new Set();
    (tableState.monitoring.fullData || []).forEach(d => {
        const m = String(d.mapel || '').trim();
        if (m) set.add(m);
    });
    let opts = '<option value="">Semua Mapel</option>';
    Array.from(set).sort((a, b) => a.localeCompare(b)).forEach(m => {
        opts += `<option value="${m}" ${m === cur ? 'selected' : ''}>${m}</option>`;
    });
    sel.innerHTML = opts;
}
async function exportMonitoringExcel() {
    await ensureLib('xlsx');
    if (typeof XLSX === 'undefined') {
        showAlert('error', 'Library Excel (SheetJS) belum termuat. Coba refresh halaman.');
        return;
    }
    const btn = document.getElementById('btnExportMonitoring');
    const originalContent = btn.innerHTML;
    const startDate = document.getElementById('exportMonStart').value;
    const endDate   = document.getElementById('exportMonEnd').value;
    if (!startDate || !endDate) {
        showAlert('error', 'Harap pilih tanggal mulai dan akhir untuk export.');
        return;
    }
    const dropdownKelas   = document.getElementById('filterKelasMonitoring')?.value || '';
    const myClassDefault  = (currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas')) ? currentUser.kelas : null;
    const kelasForExport  = dropdownKelas || myClassDefault || null;

    function doExport(data) {
        btn.disabled = true;
        btn.classList.add('cursor-not-allowed', 'opacity-75');
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span class="hidden sm:inline">Memproses...</span>';
        try {
            // Filter by date range
            let rows = data;
            if (startDate || endDate) {
                rows = data.filter(function(d) {
                    const tgl = d.tanggal || '';
                    return (!startDate || tgl >= startDate) && (!endDate || tgl <= endDate);
                });
            }
            if (kelasForExport) {
                rows = rows.filter(function(d) { return d.kelas === kelasForExport; });
            }
            const headers = ['No', 'Nama', 'NISN', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan', 'Status'];
            const aoa = [
                ['REKAP MONITORING KEHADIRAN' + (kelasForExport ? ' - ' + kelasForExport.toUpperCase() : '')],
                ['Periode: ' + startDate + ' s/d ' + endDate],
                [],
                headers,
                ...rows.map(function(d, i) {
                    return [i + 1, d.nama || '', d.nisn || '', d.kelas || '', d.jamDatang || '-', d.jamPulang || '-', d.keterangan || '-', d.status || '-'];
                })
            ];
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            ws['!cols'] = [{ wch: 4 }, { wch: 25 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Monitoring');
            const namaFile = 'Monitoring_' + (kelasForExport ? kelasForExport + '_' : '') + startDate + '_sd_' + endDate + '.xlsx';
            XLSX.writeFile(wb, namaFile);
            showAlert('success', 'Data monitoring berhasil di-export!');
        } catch (e) {
            showAlert('error', 'Gagal mengekspor: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.classList.remove('cursor-not-allowed', 'opacity-75');
            btn.innerHTML = originalContent;
        }
    }

    // Gunakan data yang sudah dimuat jika ada, jika tidak ambil dari server
    if (tableState.monitoring.fullData && tableState.monitoring.fullData.length > 0) {
        doExport(tableState.monitoring.fullData);
    } else {
        btn.disabled = true;
        btn.classList.add('cursor-not-allowed', 'opacity-75');
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span class="hidden sm:inline">Mengambil data...</span>';
        siakadRun
            .withSuccessHandler(function(result) {
                btn.disabled = false;
                btn.classList.remove('cursor-not-allowed', 'opacity-75');
                btn.innerHTML = originalContent;
                if (result && result.success) {
                    tableState.monitoring.fullData = result.data || [];
                    doExport(tableState.monitoring.fullData);
                } else {
                    showAlert('error', result.message || 'Gagal memuat data monitoring.');
                }
            })
            .withFailureHandler(function(err) {
                btn.disabled = false;
                btn.classList.remove('cursor-not-allowed', 'opacity-75');
                btn.innerHTML = originalContent;
                showAlert('error', 'Gagal menghubungi server: ' + err);
            })
            .getMonitoringRealtime(kelasForExport);
    }
}
function renderMonitoringRows(data, startIdx) {
    const tbody = document.getElementById('tbody-monitoring');
    const canEdit = ((currentUser.role === 'guru' || currentUser.role === 'walikelas') || currentUser.role === 'admin');
    const isGuruRole = currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas');
    // Toggle header: guru -> Mapel + Jam Scan; admin -> Jam Datang/Pulang
    const thMapel = document.getElementById('thMonMapel');
    const thJamDatang = document.getElementById('thMonJamDatang');
    const thJamPulang = document.getElementById('thMonJamPulang');
    if (thMapel) thMapel.classList.toggle('hidden', !isGuruRole);
    if (thJamDatang) thJamDatang.textContent = isGuruRole ? 'Jam Scan' : 'Jam Datang';
    if (thJamPulang) thJamPulang.classList.toggle('hidden', isGuruRole);
    const cursorClass = canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70';
    const disabledAttr = canEdit ? '' : 'disabled';
    tbody.innerHTML = data.map((d, i) => {
        let statusColor = 'bg-gray-100 text-gray-600';
        if(d.status === 'Hadir') statusColor = 'bg-[#d0d8e8] text-[#1b2a4a]';
        else if(d.status === 'Izin') statusColor = 'bg-[#d0d8e8] text-[#152238]';
        else if(d.status === 'Sakit') statusColor = 'bg-yellow-100 text-yellow-700';
        else if(d.status === 'Alpa') statusColor = 'bg-red-100 text-red-700';
        else if(d.status === 'Libur') statusColor = 'bg-slate-100 text-slate-500';
        let ketText = d.keterangan || "-"; 
        let ketStyle = "text-gray-400 font-mono text-[10px]"; 
        let ketIcon = "";
        if (String(ketText).includes("Terlambat")) {
            ketStyle = "text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 text-[10px]";
            ketIcon = '<i class="fas fa-history mr-1"></i>';
        } else if (String(ketText).includes("Pulang Cepat")) {
            ketStyle = "text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100 text-[10px]";
            ketIcon = '<i class="fas fa-running mr-1"></i>';
        } else if (ketText === "Tepat Waktu") {
            ketStyle = "text-[#1b2a4a] font-bold text-[10px]";
            ketIcon = '<i class="fas fa-check-double mr-1"></i>';
        }
        const jamScan = d.jamDatang && d.jamDatang !== '-' ? d.jamDatang : '-';
        return `
        <tr class="hover:bg-gray-50 border-b border-gray-50 transition group">
            <td class="p-4 text-center text-gray-400 text-xs">${startIdx + i + 1}</td>
            <td class="p-4">
                <div class="font-bold text-sm text-gray-900">${d.nama}</div>
                <div class="text-xs text-gray-500 font-mono">${d.nisn}</div>
            </td>
            <td class="p-4 text-center">
                <span class="bg-[#e8ecf4] text-[#1b2a4a] px-2 py-1 rounded text-xs font-bold border border-blue-100">${d.kelas}</span>
            </td>
            ${isGuruRole ? `<td class="p-4 text-center text-xs font-bold text-[#152238]">${d.mapel ? '<span class="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg">' + d.mapel + '</span>' : '<span class="text-gray-400">-</span>'}</td>` : ''}
            <td class="p-4 text-center text-xs font-mono text-gray-600">${isGuruRole ? jamScan : d.jamDatang}</td>
            ${isGuruRole ? '' : `<td class="p-4 text-center text-xs font-mono text-gray-600">${d.jamPulang}</td>`}
            <td class="p-4 text-center align-middle">
                 <span class="${ketStyle} inline-block whitespace-nowrap">${ketIcon}${ketText}</span>
            </td>
            <td class="p-4 text-center relative">
                <select onchange="changeStatus('${d.nisn}', '${d.nama}', '${d.kelas}', this)" 
                        class="text-xs font-bold py-1.5 px-2 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none text-center w-32 ${statusColor} ${cursorClass}"
                        ${disabledAttr}>
                    <option value="Belum Absen" ${d.status === 'Belum Absen' ? 'selected' : ''}>Belum Absen</option>
                    <option value="Hadir" ${d.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
                    <option value="Izin" ${d.status === 'Izin' ? 'selected' : ''}>Izin</option>
                    <option value= - akit" ${d.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
                    <option value="Libur" ${d.status === 'Libur' ? 'selected' : ''} disabled>Libur (otomatis)</option>
                    <option value="Alpa" ${d.status === 'Alpa' ? 'selected' : ''}>Alpa</option>
                </select>
                ${canEdit ? '<i class="fas fa-chevron-down absolute right-6 top-1/2 transform -translate-y-1/2 text-[10px] pointer-events-none opacity-40"></i>' : ''}
            </td>
        </tr>`;
    }).join('');
}
function changeStatus(nisn, nama, kelas, selectElement) {
    const newStatus = selectElement.value;
    // ATURAN: setiap absensi wajib menyertakan mata pelajaran
    const mapelFilterVal = document.getElementById('filterMapelMonitoring')?.value || '';
    const jalankanUpdate = function(mapelTerpilih) {
        if (!mapelTerpilih) {
            selectElement.value = 'Belum Absen';
            showAlert('error', 'Setiap absensi wajib menyertakan mata pelajaran.');
            return;
        }
        selectElement.disabled = true;
        selectElement.style.opacity = '0.5';
        const token = currentUser ? currentUser.token : null;
        const todayStr = (typeof siakadTodayStr === 'function') ? siakadTodayStr() : new Date().toISOString().split('T')[0]; // Monitoring realtime = hari ini
        siakadRun.withSuccessHandler(res => {
            selectElement.disabled = false;
            selectElement.style.opacity = '1';
            if (res && res.success) {
                let newColor = 'bg-gray-100 text-gray-600';
                if(newStatus === 'Hadir') newColor = 'bg-[#d0d8e8] text-[#1b2a4a]';
                else if(newStatus === 'Izin') newColor = 'bg-[#d0d8e8] text-[#152238]';
                else if(newStatus === 'Sakit') newColor = 'bg-yellow-100 text-yellow-700';
                else if(newStatus === 'Alpa') newColor = 'bg-red-100 text-red-700';
                else if(newStatus === 'Belum Absen') newColor = 'bg-gray-100 text-gray-600';
                selectElement.className = `text-xs font-bold py-1.5 px-2 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none text-center w-32 cursor-pointer ${newColor}`;
                // Invalidate monitoring cache & mark rekap as needing refresh
                tableState.monitoring.fullData = [];
                monitoringDirty = true; // rekap bulanan will reload on next open
                // Also update in-memory data if available
                if (tableState.monitoring.fullData && tableState.monitoring.fullData.length > 0) {
                    const idx = tableState.monitoring.fullData.findIndex(d => d.nisn === nisn);
                    if (idx >= 0) tableState.monitoring.fullData[idx].status = newStatus;
                }
                // Clear rekap cache if it exists
                if (window.tableState && window.tableState.rekap) window.tableState.rekap.fullData = [];
            } else {
                showAlert('error', 'Gagal update: ' + (res ? res.message : 'Koneksi gagal'));
                loadMonitoringAbsensi();
            }
        })
        .withFailureHandler(error => {
            selectElement.disabled = false;
            selectElement.style.opacity = '1';
            showAlert('error', 'Error koneksi: ' + error);
        })
        .updateAbsensiStatus(token, nisn, nama, kelas, newStatus, todayStr, mapelTerpilih);
    };
    if (mapelFilterVal) {
        jalankanUpdate(mapelFilterVal);
        return;
    }
    // Mapel belum difilter: minta pilih mapel dulu (dari mapel yang ada di data)
    const mapelOpts = [...new Set((tableState.monitoring.fullData || [])
        .map(d => String(d.mapel || '').trim())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (mapelOpts.length === 0) {
        selectElement.value = 'Belum Absen';
        showAlert('error', 'Belum ada mapel tersedia. Absensi wajib menyertakan mata pelajaran.');
        return;
    }
    const inputOpts = {};
    mapelOpts.forEach(m => { inputOpts[m] = m; });
    Swal.fire({
        title: 'Pilih Mata Pelajaran',
        text: 'Absensi harus diikuti mapel — pilih mapel untuk status ini.',
        input: 'select',
        inputOptions: inputOpts,
        inputPlaceholder: '-- Pilih Mapel --',
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        confirmButtonColor: '#2563eb',
        cancelButtonText: 'Batal',
        inputValidator: v => { if (!v) return 'Pilih mata pelajaran terlebih dahulu.'; }
    }).then(r => {
        if (r.isConfirmed && r.value) jalankanUpdate(r.value);
        else selectElement.value = 'Belum Absen';
    });
}
