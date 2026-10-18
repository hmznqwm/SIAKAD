const REKAP_PERIOD_LABELS = {
    harian:   'Rekap hari ini',
    mingguan: 'Rekap 7 hari terakhir',
    bulanan:  'Rekap bulan ini',
    tahunan:  'Rekap tahun ini'
};
function _applyPeriodBtnStyle() { /* dropdown menggantikan tombol periode */ }
function loadAttendanceStatsChart(periode, kelas, cb) {
    siakadRun
        .withSuccessHandler(res => { if (res && res.success && cb) cb(res.data); })
        .withFailureHandler(() => {})
        .getAttendanceStats(currentUser ? currentUser.token : '', periode, kelas || null);
}

let admSiswaPeriod = 'harian';
function setAdminSiswaPeriod(p) {
    admSiswaPeriod = p;
    _applyPeriodBtnStyle(p, 'admsiswa');
    const sub = document.getElementById('admSiswaChartSub');
    if (sub) sub.textContent = REKAP_PERIOD_LABELS[p];
    updateAdminSiswaChart();
}
function updateAdminSiswaChart() {
    loadAttendanceStatsChart(admSiswaPeriod, null, c =>
        renderAdminChart(c.hadir, c.sakit, c.izin, c.alpa, c.belum, c.libur));
}

let admGuruPeriod = 'harian';
function setAdminGuruPeriod(p) {
    admGuruPeriod = p;
    _applyPeriodBtnStyle(p, 'admguru');
    const sub = document.getElementById('admGuruChartSub');
    if (sub) sub.textContent = REKAP_PERIOD_LABELS[p];
    updateAdminGuruChart();
}
function updateAdminGuruChart() {
    siakadRun
        .withSuccessHandler(res => {
            if (res && res.success) {
                const c = res.data;
                renderAdminChartGuru(c.hadir, c.sakit, c.izin, c.alpa, c.belum, c.libur);
            }
        })
        .withFailureHandler(() => {})
        .getAttendanceStatsGuru(currentUser ? currentUser.token : '', admGuruPeriod);
}

let guruDashPeriod = 'harian';
function setGuruDashPeriod(p) {
    guruDashPeriod = p;
    _applyPeriodBtnStyle(p, 'gurudash');
    const sub = document.getElementById('guruChartSub');
    if (sub) sub.textContent = REKAP_PERIOD_LABELS[p];
    updateGuruDashChart();
}
function updateGuruDashChart() {
    const myClass = currentUser ? currentUser.kelas : null;
    loadAttendanceStatsChart(guruDashPeriod, myClass, c => {
        animateValue("statGuruSakit", 0, c.sakit, 800);
        animateValue("statGuruIzin", 0, c.izin, 800);
        animateValue("statGuruAlpa", 0, c.alpa, 800);
        renderGuruChart(c.hadir, c.sakit, c.izin, c.alpa, c.belum, c.libur);
    });
}

async function loadAdminDashboard() {
    await ensureLib('chartjs');
    stopAndBack(false);
    setActiveMenu('Dashboard');
    showView('view-admin-dashboard');
    document.getElementById('adminDateDisplay').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const quickAccessPanel = document.getElementById('adminQuickAccess');
    const dashboardTitle = document.querySelector('#view-admin-dashboard h2');
    if (currentUser.role === 'wakel') {
        if(quickAccessPanel) quickAccessPanel.style.display = 'none';
        if(dashboardTitle) dashboardTitle.textContent = 'Dashboard Wakil Kepala Madrasah';
    } else if (currentUser.role === 'kepsek') {
        if(quickAccessPanel) quickAccessPanel.style.display = 'block';
        if(dashboardTitle) dashboardTitle.textContent = 'Dashboard Kepala Madrasah';
    } else {
        if(quickAccessPanel) quickAccessPanel.style.display = 'block';
        if(dashboardTitle) dashboardTitle.textContent = 'Dashboard Admin';
    }
    function refreshAdminDash() {
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                const data = result.data;
                animateValue("admStatTotal", 0, data.length, 800);
            }
        }).getMonitoringRealtime();
        // Grafik siswa per periode  logika sama dengan Rekapitulasi Bulanan
        updateAdminSiswaChart();
        if (['admin', 'kepsek', 'wakel', 'superadmin'].includes((currentUser.role || '').toLowerCase())) {
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                const dataGuru = result.data;
                animateValue("admStatTotalGuru", 0, dataGuru.length, 800);
            } else {
                document.getElementById('admStatTotalGuru').textContent = '-';
            }
        }).withFailureHandler(() => {
            document.getElementById('admStatTotalGuru').textContent = '-';
        }).getProfilGuruList(currentUser.token);
            siakadRun.withSuccessHandler(result => {
                if (result.success) {
                    animateValue("admStatTotalAlumni", 0, result.data.length, 800);
                } else {
                    document.getElementById('admStatTotalAlumni').textContent = '-';
                }
            }).withFailureHandler(() => {
                document.getElementById('admStatTotalAlumni').textContent = '-';
            }).getAlumniList();
            siakadRun.withSuccessHandler(result => {
                if (result.success) {
                    animateValue("admStatTotalKelas", 0, result.data.length, 800);
                } else {
                    document.getElementById('admStatTotalKelas').textContent = '-';
                }
            }).withFailureHandler(() => {
                document.getElementById('admStatTotalKelas').textContent = '-';
            }).getKelasList();
        }
        // Grafik guru per periode  logika sama dengan Rekapitulasi Bulanan Guru
        updateAdminGuruChart();
        // Grafik Administrasi Pembayaran SPP
        loadAdminPaymentChart();
    }
    refreshAdminDash();
    // Grafik dashboard auto-refresh tiap 30 detik agar tetap sinkron
    startDashLive(refreshAdminDash, 30000);
}
    function loadAdminPaymentChart() {
        if (typeof sikasApi !== 'function') return;
        const sel = document.getElementById('admPayFilter');
        const jenis = sel ? sel.value : '';
        sikasApi('getDashboardStats', { jenis: jenis }).then(stats => {
            if (!stats || stats.success === false) return;
            // Sinkronkan opsi filter Jenis Tagihan dgn Master Jenis Tagihan setiap
            // kali chart dimuat/di-refresh, supaya jenis baru dari menu "Tagihan"
            // langsung tercermin di sini juga.
            if (sel && Array.isArray(stats.jenisTagihanOptions)) {
                const currentVal = sel.value;
                let optHtml = '<option value="">Semua Tagihan</option>';
                stats.jenisTagihanOptions.forEach(function (j) {
                    optHtml += '<option value="' + String(j).replace(/"/g, '&quot;') + '">' + j + '</option>';
                });
                sel.innerHTML = optHtml;
                if (currentVal && stats.jenisTagihanOptions.includes(currentVal)) sel.value = currentVal;
            }
            const belum = document.getElementById('admPayBelum');
            const lunas = document.getElementById('admPayLunas');
            const totalEl = document.getElementById('admPayTotal');
            const fmtRp = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
            if (belum) belum.textContent = fmtRp(stats.totalBelumLunas || 0);
            if (lunas) lunas.textContent = fmtRp(stats.totalTerbayar || 0);
            if (totalEl) totalEl.textContent = fmtRp((Number(stats.totalBelumLunas) || 0) + (Number(stats.totalTerbayar) || 0));
            renderAdminPaymentChart(stats);
        });
    }
    function renderAdminPaymentChart(stats) {
        const ctx = document.getElementById('adminPaymentChart');
        if (!ctx) return;
        if (adminPaymentChartInstance) adminPaymentChartInstance.destroy();
        if (typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); }
        const fmt = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
        const total = Number(stats.totalBelumLunas || 0) + Number(stats.totalTerbayar || 0);
        const pct = v => total > 0 ? Math.round((Number(v || 0) / total) * 100) + '%' : '0%';
        const belum = Number(stats.totalBelumLunas || 0);
        const lunas = Number(stats.totalTerbayar || 0);
        adminPaymentChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Sudah Dibayar', 'Belum Lunas'],
                datasets: [{
                    data: [lunas, belum],
                    backgroundColor: ['#3b82f6', '#F59E0B'],
                    borderColor: _siakadChartColors().doughnutBorder,
                    borderWidth: 3,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (c) => ' ' + c.label + ': ' + fmt(c.parsed) + ' (' + pct(c.parsed) + ')'
                        }
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 11 },
                        formatter: (val) => val > 0 ? pct(val) : '',
                        textAlign: 'center'
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw(chart) {
                    if (!chart.ctx) return;
                    const w = chart.width, h = chart.height;
                    const x = w / 2, y = h / 2 - 4;
                    const paidPct = total > 0 ? Math.round((lunas / total) * 100) : 0;
                    chart.ctx.save();
                    chart.ctx.textAlign = 'center';
                    chart.ctx.textBaseline = 'middle';
                    chart.ctx.font = '800 22px Inter, sans-serif';
                    chart.ctx.fillStyle = '#3b82f6';
                    chart.ctx.fillText(paidPct + '%', x, y);
                    chart.ctx.font = '500 10px Inter, sans-serif';
                    chart.ctx.fillStyle = '#9CA3AF';
                    chart.ctx.fillText('Terkumpul', x, y + 20);
                    chart.ctx.restore();
                }
            }]
        });
    }
    function renderAdminChart(hadir, sakit, izin, alpa, belum, libur) {
        const ctx = document.getElementById('adminAttendanceChart');
        if (!ctx) return;
        if (adminChartInstance) {
            adminChartInstance.destroy();
        }
        if (typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); }
        adminChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Absen', 'Libur'],
                datasets: [{
                    label: 'Jumlah Siswa',
                    data: [hadir, sakit, izin, alpa, belum, libur || 0],
                    backgroundColor: [
                        '#3b82f6', 
                        '#EAB308', 
                        '#3b82f6', 
                        '#EF4444', 
                        '#9CA3AF',
                        '#d0d8e8'
                    ],
                    borderRadius: 8,
                    barPercentage: 0.5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (val) => val > 0 ? val : '',
                        font: { weight: 'bold' },
                        color: _siakadChartColors().datalabel
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 2], color: _siakadChartColors().grid }, ticks: { color: _siakadChartColors().tick } },
                    x: { grid: { display: false }, ticks: { color: _siakadChartColors().tick } }
                }
            }
        });
    }
    function renderAdminChartGuru(hadir, sakit, izin, alpa, belum, libur) {
        const ctx = document.getElementById('adminAttendanceChartGuru');
        if (!ctx) return;
        if (adminChartInstanceGuru) {
            adminChartInstanceGuru.destroy();
        }
        if (typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); }
        adminChartInstanceGuru = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Absen', 'Libur'],
                datasets: [{
                    label: 'Jumlah Guru',
                    data: [hadir, sakit, izin, alpa, belum, libur || 0],
                    backgroundColor: [
                        '#3b82f6', 
                        '#EAB308', 
                        '#3b82f6', 
                        '#EF4444', 
                        '#9CA3AF',
                        '#d0d8e8'
                    ],
                    borderRadius: 8,
                    barPercentage: 0.5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (val) => val > 0 ? val : '',
                        font: { weight: 'bold' },
                        color: _siakadChartColors().datalabel
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 2], color: _siakadChartColors().grid }, ticks: { color: _siakadChartColors().tick } },
                    x: { grid: { display: false }, ticks: { color: _siakadChartColors().tick } }
                }
            }
        });
    }
async function loadGuruDashboard() {
    await ensureLib('chartjs');
    stopAndBack(false);
    setActiveMenu('Dashboard');
    showView('view-guru-dashboard');
    document.getElementById('guruDashboardDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const myClass = (currentUser.role === 'guru' || currentUser.role === 'walikelas') ? currentUser.kelas : null;
    const kelasLabel = myClass
        ? String(myClass).split(',').map(k => k.trim()).filter(Boolean).join(', ')
        : null;
    function refreshGuruDash() {
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                const data = result.data; 
                if (kelasLabel) {
                     document.querySelector('#view-guru-dashboard h2').textContent = `Dashboard Guru (${kelasLabel})`;
                }
                animateValue("statGuruTotal", 0, data.length, 1000);
            }
        }).getMonitoringRealtime(myClass); 
        // Grafik & stat Sakit/Izin/Alpa per periode  sinkron Rekapitulasi Bulanan
        updateGuruDashChart();
    }
    refreshGuruDash();
    // Grafik dashboard guru auto-refresh tiap 30 detik agar tetap sinkron
    startDashLive(refreshGuruDash, 30000);
}
  let _notifBadgeTimer = null;
  let _notifBadgePending = false; 
  function _setBadgeCount(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
  function refreshNotifBadge() {
    if (!currentUser) return;
    const rolesWithBadge = ['admin', 'guru', 'walikelas'];
    if (!rolesWithBadge.includes(currentUser.role)) return;
    const token = currentUser.token;
    if (!token) return;
    if (_notifBadgePending) return; 
    _notifBadgePending = true;
    let _done = 0;
    const _finish = () => { if (++_done >= 2) _notifBadgePending = false; };
    siakadRun
      .withSuccessHandler(function(res) {
        _finish();
        const all = (res && res.success) ? (res.allData || res.data || []) : [];
        _setBadgeCount('badge-izin-siswa', all.filter(r => r.status === 'Menunggu').length);
      })
      .withFailureHandler(function() {
        _finish();
        _setBadgeCount('badge-izin-siswa', 0);
      })
      .getPerizinanSiswaList(token, '', '', '');
    if (currentUser.role === 'admin') {
      siakadRun
        .withSuccessHandler(function(res) {
          _finish();
          const all = (res && res.success) ? (res.allData || res.data || []) : [];
          _setBadgeCount('badge-perizinan-guru', all.filter(r => r.status === 'Menunggu').length);
        })
        .withFailureHandler(function() {
          _finish();
          _setBadgeCount('badge-perizinan-guru', 0);
        })
        .getPerizinanList(token, '', '');
    } else {
      _finish();
    }
  }
  function startNotifBadgePolling() {
    refreshNotifBadge();
    if (_notifBadgeTimer) clearInterval(_notifBadgeTimer);
    _notifBadgeTimer = setInterval(refreshNotifBadge, 5 * 60 * 1000); 
  }
  const _origLoadPzGuru = typeof loadPerizinanSiswaUntukGuru === 'function'
    ? loadPerizinanSiswaUntukGuru : null;

