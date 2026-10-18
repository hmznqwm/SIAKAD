// core/script/navigation.js
// Navigasi menu: simpan/pulihkan menu terakhir, showView, setActiveMenu,
// CSS sidebar, toggleSidebar, closeSidebarMobile.
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

var LAST_MENU_KEY = 'absensiLastMenu';
    var menuLoaderMap = {
        'Dashboard':         function() {
            var r = currentUser.role;
            if (r==='guru'||r==='walikelas') loadGuruDashboard();
            else if (r==='siswa') loadSiswaDashboard();
            else if (r==='bendahara') sikasDashboard();
            else loadAdminDashboard();
        },
        'Data Siswa':        function() { loadDataSiswa(); },
        'Data Alumni':       function() { loadDataAlumni(); },
        'Pendaftaran Siswa': function() { loadPendaftaranSiswa(); },
        'Data Guru':         function() { loadDataProfilGuru(); },
        'Manajemen Kelas':   function() { loadManajemenKelas(); },
        'Jadwal Pelajaran':  function() { loadJadwalPelajaran(); },
        'Jadwal Saya':       function() { loadJadwalSiswa(); },
        'Data Prestasi':     function() { loadDataPrestasi(); },
        'Data Inventaris':   function() { loadDataInventaris(); },
        'Nilai Siswa':       function() { showView('view-nilai-siswa'); setActiveMenu('Nilai Siswa'); loadDataNilai(); },
        'Nilai Saya':        function() { showView('view-nilai-siswa'); setActiveMenu('Nilai Saya'); loadDataNilai(); },
        'User':              function() { loadDataGuru(); },
        'Kelola Absen':      function() { loadKelolaAbsen(); },
        'Daftar Hadir':      function() { loadDaftarHadirGuru(); },
        'Scan QR':           function() { loadScanQR('siswa'); },
        'Absensi':           function() { loadAbsensi(); },
        'Rekap Bulanan':     function() { loadMenuRekapBulanan(); },
        'Kenaikan Kelas':    function() { loadKenaikanKelas(); },
        'Monitoring':        function() { loadMonitoringAbsensi(); },
        'Kartu Saya':        function() { loadQRCodeSiswa(); },
        'Perizinan Guru':    function() { loadPerizinanGuru(); },
        'Izin Siswa':        function() { showView('view-perizinan-siswa-guru'); setActiveMenu('Izin Siswa'); loadPerizinanSiswaUntukGuru(); },
        'Izin / Sakit':      function() { showView('view-perizinan-siswa'); setActiveMenu('Izin / Sakit'); loadPerizinanSiswaMilikSaya(); },
        'Manajemen Tagihan': function() { sikasLoadTagihan(); },
        'Kasir Pembayaran':  function() { sikasLoadKasir(); },
        'Riwayat & Cetak Resi': function() { sikasLoadRiwayat(); },
        'Tagihan':         function() { sikasLoadPengaturan(); },
        'Tagihan Saya':      function() { sikasLoadTagihanSaya(); },
        'Tabungan Siswa':    function() { tabunganLoad(); },
        'Tabungan Saya':     function() { tabunganLoadSaya(); },
    };
    var _isSavingMenu = false; 
    function saveLastMenu(menuName) {
        if (_isSavingMenu) return; 
        try {
            localStorage.setItem(LAST_MENU_KEY, JSON.stringify({
                menu: menuName,
                role: currentUser ? currentUser.role : ''
            }));
        } catch(e) {}
    }
    window.saveLastMenu = saveLastMenu;
    function _getDefaultLoader() {
        var r = currentUser ? currentUser.role : '';
        if (r === 'guru' || r === 'walikelas') return function() { loadGuruDashboard(); };
        if (r === 'siswa') return function() { loadSiswaDashboard(); };
        if (r === 'alumni') return function() { loadSiswaDashboard(); };
        if (r === 'pencatat') return function() { loadDataPrestasi(); };
        if (r === 'bendahara') return function() { sikasDashboard(); };
        return function() { loadAdminDashboard(); };
    }
    function restoreLastMenu() {
        _isSavingMenu = true; 
        try {
            var raw = localStorage.getItem(LAST_MENU_KEY);
            var restored = false;
            if (raw) {
                var saved = JSON.parse(raw);
                if (saved && saved.menu && saved.role === (currentUser ? currentUser.role : '')) {
                    var loader = menuLoaderMap[saved.menu];
                    if (loader) {
                        loader();
                        restored = true;
                    }
                }
            }
            if (!restored) {
                _getDefaultLoader()();
            }
        } catch(e) {
            try { _getDefaultLoader()(); } catch(e2) {}
        } finally {
            _isSavingMenu = false; 
        }
    }
    function applyRoleRestrictions() {
        if (!currentUser) return;
        const role = currentUser.role;
        const readOnlyRoles = ['kepsek', 'wakel'];
        if (readOnlyRoles.includes(role)) {
            const blockedOnclick = [
                'bulkDeleteProfilGuru', 'triggerImportProfilGuru', 'showAddProfilGuruModal',
                'bulkDeleteGuru', 'triggerImportGuru', 'showAddGuruModal',
                'bulkDeletePrestasi', 'triggerImportPrestasi', 'showAddPrestasiModal',
                'bulkDeleteInventaris', 'triggerImportInventaris', 'showAddInventarisModal',
            ];
            const viewIds = ['view-profil-guru', 'view-data-guru', 'view-data-prestasi', 'view-data-inventaris'];
            viewIds.forEach(function(viewId) {
                const view = document.getElementById(viewId);
                if (!view) return;
                view.querySelectorAll('button').forEach(function(btn) {
                    const oc = btn.getAttribute('onclick') || '';
                    if (blockedOnclick.some(function(kw) { return oc.includes(kw); })) {
                        btn.style.display = 'none';
                    }
                });
                view.querySelectorAll('thead input[type="checkbox"]').forEach(function(cb) {
                    cb.closest('th') && (cb.closest('th').style.display = 'none');
                });
            });
        }
    }
function showView(viewId) {
        const absensiViews = ['view-absensi', 'view-scanner', 'view-scanner-guru', 'view-daftar-hadir-guru'];
        if (!absensiViews.includes(viewId)) {
            if (typeof stopPolling === 'function') stopPolling();
            if (typeof cameraPopup !== 'undefined' && cameraPopup && !cameraPopup.closed) {
                try { cameraPopup.close(); } catch(e) {}
            }
        }
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none'; 
        });
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block'; 
            target.classList.add('animate-fade-in');
            setTimeout(applyRoleRestrictions, 30);
        }
        let title = "Dashboard";
        switch (viewId) {
            case 'view-data-siswa': title = "Direktori Siswa"; break;
            case 'view-data-alumni': title = "Data Alumni"; break;
            case 'view-manajemen-kelas': title = "Manajemen Kelas"; break;
            case 'view-manajemen-mapel': title = "Manajemen Mapel"; break;
            case 'view-data-guru': title = "Manajemen User"; break;
            case 'view-profil-guru': title = "Data Guru"; break;
            case 'view-kelola-absen': title = "Kelola Hari Libur"; break; 
            case 'view-scanner': title = "Scan Absensi"; break;
            case 'view-scanner-guru': title = "Absensi Guru"; break;
            case 'view-daftar-hadir-guru': title = "Daftar Hadir"; break;
            case 'view-monitoring': title = "Monitoring Realtime"; break;
            case 'view-kartu-siswa': title = "Kartu Pelajar Digital"; break;
            case 'view-nilai-siswa': title = "Nilai Siswa"; break;
            case 'view-jadwal-siswa': title = "Jadwal Saya"; break;
            case 'view-perizinan-guru': title = "Perizinan Guru"; break;
            case 'view-perizinan-siswa': title = "Perizinan Saya"; break;
            case 'view-perizinan-siswa-guru': title = "Izin Siswa Masuk"; break;
            case 'view-pendaftar': title = "Pendaftaran Siswa Baru"; break;
        }
        document.getElementById('pageTitle').textContent = title;
        closeSidebarMobile();
    }
    function setActiveMenu(targetName) {
        document.querySelectorAll('#sidebarMenu a').forEach(link => {
            const isActive = link.getAttribute('data-name') === targetName;
            link.classList.toggle('active-menu', isActive);
        });
        if (typeof saveLastMenu === 'function') saveLastMenu(targetName);
    }
    window.setActiveMenu = setActiveMenu;
    window.closeSidebarMobile = closeSidebarMobile;
    (function injectSidebarCSS() {
        if (document.getElementById('sidebar-modern-style')) return;
        const style = document.createElement('style');
        style.id = 'sidebar-modern-style';
        style.textContent = `
            #sidebar {
                transition: none;
                box-shadow: none;
            }
            #mainContent {
                transition: margin-left 0s ease;
            }
            #sidebar[data-collapsed="true"] {
                width: 64px !important;
                min-width: 64px !important;
                overflow: hidden;
                transition: none;
            }
            @media (min-width: 768px) {
                #sidebar { transform: none; }
                #sidebar[data-collapsed="true"] ~ #mainContent {
                    margin-left: 64px !important;
                }
                #sidebar[data-collapsed="true"] #sidebarHeader,
                #sidebar[data-collapsed="true"] #sidebarBrand {
                    justify-content: center !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
                #sidebar[data-collapsed="true"] #sidebarHeader .sidebar-label,
                #sidebar[data-collapsed="true"] #sidebarBrand .sidebar-label,
                #sidebar[data-collapsed="true"] #sidebarBottomActions .sidebar-label {
                    display: none !important;
                }
                #sidebar[data-collapsed="true"] .sidebar-group-label {
                    display: none !important;
                }
            }
            #sidebar .sidebar-label {
                transition: none !important;
                overflow: hidden;
                white-space: nowrap;
                max-width: 200px;
                opacity: 1 !important;
                transform: none !important;
                display: inline-block !important;
            }
            #sidebar[data-collapsed="true"] .sidebar-label {
                display: none !important;
                pointer-events: none;
            }
            #sidebarMenu a {
                transition: none;
                display: flex;
                align-items: center;
                padding: 8px 10px;
                margin-bottom: 2px;
                border-radius: 10px;
                color: #64748b;
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
                gap: 10px;
            }
            #sidebarMenu a:hover {
                background: #f1f5f9;
                color: #1b2a4a;
            }
            #sidebarMenu a.active-menu {
                background: #1b2a4a;
                color: #fff;
                box-shadow: 0 2px 8px rgba(27,42,74,.25);
            }
            #sidebarMenu a.active-menu i {
                color: #fff;
            }
            #sidebarMenu a i {
                width: 18px;
                text-align: center;
                font-size: 13px;
                color: #94a3b8;
                flex-shrink: 0;
            }
            #sidebarMenu a:hover i {
                color: #1b2a4a;
            }
            .sidebar-group-label {
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: .08em;
                color: #94a3b8;
                padding: 14px 10px 4px;
            }
            #sidebar[data-collapsed="true"] #sidebarMenu a {
                justify-content: center;
                padding-left: 0 !important;
                padding-right: 0 !important;
                gap: 0 !important;
            }
            .sidebar-group-label {
                transition: opacity 0.2s ease, max-height 0.25s ease;
                overflow: hidden;
                max-height: 40px;
                opacity: 1;
            }
            #sidebar[data-collapsed="true"] .sidebar-group-label {
                opacity: 0 !important;
                max-height: 0;
                padding: 0 !important;
                margin: 0 !important;
                pointer-events: none;
            }
            .sidebar-group-divider {
            #sidebar[data-collapsed="true"] .sidebar-group-divider {
                opacity: 0;
                margin: 4px 8px;
            }
            #sidebarHeader {
                transition: padding 0.25s cubic-bezier(0.4,0,0.2,1), justify-content 0.25s ease;
            }
            #sidebarBrand {
                transition: justify-content 0.25s ease;
            }
            #sidebar[data-collapsed="true"] #sidebarHeader {
                padding-left: 0 !important;
                padding-right: 0 !important;
                justify-content: center;
            }
            #sidebar[data-collapsed="true"] #sidebarBrand {
                justify-content: center;
            }
            #sidebar[data-collapsed="true"] #sidebarBrandText {
                display: none !important;
            }
            #sidebarBrandText {
                transition: opacity 0.2s ease, max-width 0.25s ease;
                max-width: 200px;
                overflow: hidden;
                opacity: 1;
            }
            #userProfileCard {
                transition: justify-content 0.25s ease;
            }
            #sidebar[data-collapsed="true"] #userProfileCard {
                justify-content: center;
            }
            #sidebar[data-collapsed="true"] #userProfileCard .user-info-text {
                display: none !important;
            }
            #userProfileCard .user-info-text {
                transition: opacity 0.2s ease, max-width 0.25s ease;
                max-width: 200px;
                opacity: 1;
                overflow: hidden;
            }
            #sidebarBottomActions button {
                transition: padding 0.25s ease, justify-content 0.25s ease, gap 0.25s ease;
            }
            #sidebar[data-collapsed="true"] #sidebarBottomActions button {
                justify-content: center !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                gap: 0 !important;
                space-x: 0;
            }
            #sidebar[data-collapsed="true"] #sidebarBottomActions button i {
                margin: 0 auto !important;
            }
            #btnLogout {
                transition: padding 0.25s ease, justify-content 0.25s ease, gap 0.25s ease;
            }
            #sidebar[data-collapsed="true"] #btnLogout {
                justify-content: center;
                padding-left: 0 !important;
                padding-right: 0 !important;
                gap: 0 !important;
            }
            #btnLogout .logout-label {
                transition: opacity 0.2s ease, max-width 0.25s ease;
                max-width: 200px;
                overflow: hidden;
                opacity: 1;
                white-space: nowrap;
                display: inline-block;
            }
            #sidebar[data-collapsed="true"] #btnLogout .logout-label {
                display: none !important;
            }
            #sidebarToggleIcon {
                transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
            }
            #sidebar[data-collapsed="true"] #sidebarToggleIcon {
                transform: rotate(180deg);
            }
            #sidebar[data-collapsed="true"] #sidebarMenu a {
                position: relative;
            }
            #sidebar[data-collapsed="true"] #sidebarMenu a::after {
                content: attr(data-name);
                position: absolute;
                left: calc(100% + 10px);
                top: 50%;
                transform: translateY(-50%) scale(0.9);
                background: rgba(15,23,42,0.92);
                color: #fff;
                font-size: 11px;
                font-weight: 600;
                padding: 5px 10px;
                border-radius: 7px;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.15s ease, transform 0.15s ease;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            }
            #sidebar[data-collapsed="true"] #sidebarMenu a:hover::after {
                opacity: 1;
                transform: translateY(-50%) scale(1);
            }
            #mobileOverlay {
                transition: opacity 0.28s ease;
            }
            @media (max-width: 767px) {
                #sidebar {
                    width: 16rem !important;
                }
                #sidebar[data-mobile-open="true"] {
                    transform: translateX(0) !important;
                    box-shadow: 8px 0 32px rgba(0,0,0,0.18);
                }
            }
            .sidebar-notif-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 18px;
                height: 18px;
                padding: 0 5px;
                font-size: 10px;
                font-weight: 800;
                line-height: 1;
                color: #fff;
                background: #ef4444;
                border-radius: 999px;
                border: 2px solid #fff;
                box-shadow: 0 1px 4px rgba(239,68,68,0.45);
                position: absolute;
                top: 6px;
                right: 8px;
                animation: badge-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
                z-index: 10;
            }
            #sidebar[data-collapsed="true"] .sidebar-notif-badge {
                top: 4px;
                right: 4px;
                min-width: 14px;
                height: 14px;
                font-size: 8px;
                padding: 0 3px;
            }
            @keyframes badge-pop {
                from { transform: scale(0); opacity: 0; }
                to   { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    })();
    function toggleSidebar() {
        const sidebar  = document.getElementById('sidebar');
        const main     = document.getElementById('mainContent');
        const overlay  = document.getElementById('mobileOverlay');
        if (!sidebar || !main) return;
        if (window.innerWidth < 768) {
            // Mobile: drawer terbuka/tutup
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                sidebar.classList.remove('open');
                sidebar.removeAttribute('data-mobile-open');
                if (overlay) { overlay.classList.add('hidden'); overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
            } else {
                sidebar.classList.add('open');
                sidebar.setAttribute('data-mobile-open', 'true');
                if (overlay) { overlay.style.pointerEvents = ''; overlay.classList.remove('hidden'); setTimeout(() => { overlay.style.opacity = '1'; }, 10); }
            }
        } else {
            // Desktop: hide/show penuh via data-collapsed (CSS inject menangani margin main)
            const isHidden = sidebar.dataset.collapsed === 'true';
            if (isHidden) {
                sidebar.removeAttribute('data-collapsed');
            } else {
                sidebar.dataset.collapsed = 'true';
            }
        }
    }
    window.toggleSidebar = toggleSidebar;
    function closeSidebarMobile() {
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) { sidebar.classList.remove('open'); sidebar.removeAttribute('data-mobile-open'); }
            const overlay = document.getElementById('mobileOverlay');
            if (overlay) { overlay.classList.add('hidden'); overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
        }
    }
    