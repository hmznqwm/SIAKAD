// core/script/state.js
// Variabel state global aplikasi (currentUser, cache, chart instance, dsb),
// helper live-refresh dashboard, jam tanggal berjalan, beep/vibrate scanner.
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

let currentUser = null;
    let html5QrCode = null;
    let isScanning = false;
    let isSidebarOpen = true;
    let scanLiveCount = 0;
    let scanLiveMap = {}; 
    let scanMode = 'siswa'; 
    let scanLiveCountGuru = 0;
    let scanLiveMapGuru = {}; 
    let guruLocalCache = {};  
    let guruLocalCacheLoaded = false;
    let appCache = {
        siswa: null,
        guru: null
    };
    let dashboardChart = null;
    let existingClasses = []; 
    let guruChartInstance = null;
    let adminChartInstance = null;
    let adminChartInstanceGuru = null;
    let adminPaymentChartInstance = null;
    // Timer refresh otomatis grafik dashboard supaya data tetap sinkron
    // dengan absensi/pembayaran terbaru tanpa harus pindah menu.
    let dashLiveTimer = null;
    function startDashLive(refreshFn, intervalMs) {
        if (dashLiveTimer) clearInterval(dashLiveTimer);
        dashLiveTimer = setInterval(function () {
            if (document.hidden) return; // hemat: jangan fetch saat tab tidak terlihat
            try { refreshFn(); } catch (e) {}
        }, intervalMs || 30000);
    }
    function stopDashLive() {
        if (dashLiveTimer) { clearInterval(dashLiveTimer); dashLiveTimer = null; }
    }
    // Flag: set true when monitoring status changes, so rekap bulanan auto-reloads
    let monitoringDirty = false;
    // Tanggal realtime: di-refresh tiap 30 detik agar tetap akurat walau tab
    // dibiarkan terbuka melewati tengah malam
    const DATE_DISPLAY_IDS = ['currentDateDisplay', 'adminDateDisplay', 'guruDashboardDate'];
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    function refreshDateDisplays() {
        const today = new Date().toLocaleDateString('id-ID', dateOptions);
        DATE_DISPLAY_IDS.forEach(function (id) {
            const el = document.getElementById(id);
            if (el && el.textContent !== today) el.textContent = today;
        });
    }
    refreshDateDisplays();
    setInterval(refreshDateDisplays, 30000);

    // Tanggal hari ini berdasarkan WAKTU LOKAL (bukan UTC).
    // toISOString() berbasis UTC sehingga di WIB (UTC+7) antara 00:00-06:59
    // masih mengembalikan tanggal kemarin.
    window.siakadTodayStr = function () {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    // Feedback audio untuk scan QR: 'success' (beep naik 2 nada),
    // 'warning' (1 nada sedang), 'error' (nada rendah panjang)
    window.siakadBeep = function (type) {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            const ctx = siakadBeep._ctx || (siakadBeep._ctx = new AC());
            if (ctx.state === 'suspended') ctx.resume();
            const tone = function (freq, start, dur, vol) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                gain.gain.setValueAtTime(vol, ctx.currentTime + start);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + dur);
            };
            if (type === 'success') { tone(880, 0, 0.15, 0.4); tone(1175, 0.14, 0.22, 0.4); }
            else if (type === 'warning') { tone(620, 0, 0.18, 0.35); }
            else { tone(300, 0, 0.3, 0.35); }
        } catch (e) {}
    };
    // Getar singkat (jika perangkat mendukung, mis. HP Android)
    window.siakadVibrate = function (pattern) {
        try { if (navigator.vibrate) navigator.vibrate(pattern || 80); } catch (e) {}
    };
    