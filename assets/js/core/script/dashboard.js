// core/script/dashboard.js
// Dashboard: initDashboard, dropdown kelas, refreshData, showLoading/hideLoading/showAlert,
// togglePassword, downloadTemplate.
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

function initDashboard() {
    // Safety guard: must have a valid currentUser with role before rendering dashboard
    const VALID_ROLES = ['admin', 'guru', 'walikelas', 'kepsek', 'wakel', 'pencatat', 'bendahara', 'siswa', 'alumni'];
    if (!currentUser || !currentUser.role || !VALID_ROLES.includes(currentUser.role) || !currentUser.token) {
        // Jangan panggil doLogout() langsung agar tidak crash di mobile
        try {
            var dc = document.getElementById('dashboardContainer');
            var lp = document.getElementById('loginPage');
            showLoginPage();
        } catch(e) {}
        return;
    }
    const name = currentUser.nama || currentUser.username;
    document.getElementById('navUserName').textContent = name;
    const initialEl = document.getElementById('navUserInitial');
    if (initialEl) initialEl.textContent = (name || '?').trim().charAt(0);
    const roleLabelMap = {
        admin: 'ADMIN',
        guru: 'GURU PENGAJAR',
        walikelas: 'WALI KELAS',
        kepsek: 'KEPALA MADRASAH',
        wakel: 'WAKIL KEPALA MADRASAH',
        pencatat: 'PENCATAT BARANG & PRESTASI',
        bendahara: 'BENDAHARA',
        siswa: 'SISWA',
        alumni: 'ALUMNI'
    };
    let displayRole = roleLabelMap[currentUser.role] || currentUser.role.toUpperCase();
    document.getElementById('navUserRole').textContent = displayRole;
    const rolesWithProfil = ['guru', 'walikelas', 'kepsek', 'wakel'];
    if (rolesWithProfil.includes(currentUser.role) && currentUser.token) {
        siakadRun
            .withSuccessHandler(function(info) {
                if (!info || !info.success) return;
                currentUser.jabatan = info.jabatan || null;
                currentUser.mapelProfil = info.mapel || null;
                const jabatanEl = document.getElementById('navUserRole');
                if (!jabatanEl) return;
                let subtitle = '';
                if (info.jabatan) subtitle += info.jabatan;
                if (info.mapel) {
                    const mapelShort = info.mapel.length > 30 ? info.mapel.substring(0, 28) + '…' : info.mapel;
                    subtitle += (subtitle ? ' · ' : '') + mapelShort;
                }
                if (subtitle) {
                    jabatanEl.innerHTML =
                        `<span>${displayRole}</span>` +
                        `<span class="block text-[9px] font-normal text-[#8fa3c0] dark:text-gray-500 mt-0.5 leading-tight truncate" title="${(info.jabatan||'')} ${info.mapel ? '· '+info.mapel : ''}">${subtitle}</span>`;
                }
            })
            .withFailureHandler(function() { })
            .getInfoGuru(currentUser.token);
    }
    const menuContainer = document.getElementById('sidebarMenu');
    let menuHTML = '';
    const createItem = (label, icon, onclick, isDefaultActive = false, badgeId = '') => {
        const activeClass = isDefaultActive ? 'active-menu' : '';
        const badgeHtml = badgeId
            ? `<span id="${badgeId}" class="sidebar-notif-badge" style="display:none;"></span>`
            : '';
        return `
        <a data-name="${label}" onclick="${onclick}" class="${activeClass}" style="position:relative;">
            <i class="fas ${icon}"></i>
            <span class="sidebar-label">${label}</span>
            ${badgeHtml}
        </a>`;
    };
    const createGroupLabel = (label) => {
        return `<div class="sidebar-group-label">${label}</div>`;
    };
    if (currentUser.role === 'admin') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadAdminDashboard()', true);
        menuHTML += createGroupLabel('Data');
        menuHTML += createItem('Data Siswa', 'fa-user-graduate', 'loadDataSiswa()');
        menuHTML += createItem('Pendaftaran Siswa', 'fa-user-plus', 'loadPendaftaranSiswa()');
        menuHTML += createItem('Data Alumni', 'fa-user-graduate', 'loadDataAlumni()');
        menuHTML += createItem('Data Guru', 'fa-chalkboard-user', 'loadDataProfilGuru()');
        menuHTML += createItem('Manajemen Kelas', 'fa-table-cells', 'loadManajemenKelas()');
        menuHTML += createItem('Jadwal Pelajaran', 'fa-calendar-days', 'loadJadwalPelajaran()');
        menuHTML += createItem('Data Prestasi', 'fa-trophy', 'loadDataPrestasi()');
        menuHTML += createItem('Data Inventaris', 'fa-boxes-stacked', 'loadDataInventaris()');
        menuHTML += createItem('Nilai Siswa', 'fa-star-half-stroke', "showView('view-nilai-siswa'); setActiveMenu('Nilai Siswa'); loadDataNilai()");
        menuHTML += createItem('User', 'fa-user-shield', 'loadDataGuru()');
        menuHTML += createGroupLabel('Absensi');
        menuHTML += createItem('Kelola Absen', 'fa-calendar-times', 'loadKelolaAbsen()');
        menuHTML += createItem('Daftar Hadir', 'fa-clipboard-check', 'loadDaftarHadirGuru()');
        menuHTML += createItem('Perizinan Guru', 'fa-file-pen', 'loadPerizinanGuru()', false, 'badge-perizinan-guru');
        menuHTML += createItem('Izin Siswa', 'fa-hand-paper', "showView('view-perizinan-siswa-guru'); setActiveMenu('Izin Siswa'); loadPerizinanSiswaUntukGuru()", false, 'badge-izin-siswa');
        menuHTML += createGroupLabel('Laporan');
        menuHTML += createItem('Rekap Bulanan', 'fa-calendar-days', 'loadMenuRekapBulanan()');
        menuHTML += createItem('Kenaikan Kelas', 'fa-arrow-up', 'loadKenaikanKelas()');
        menuHTML += createGroupLabel('Pembayaran SPP');
        menuHTML += createItem('Manajemen Tagihan', 'fa-file-invoice-dollar', 'sikasLoadTagihan()');
        menuHTML += createItem('Kasir Pembayaran', 'fa-cash-register', 'sikasLoadKasir()');
        menuHTML += createItem('Riwayat & Cetak Resi', 'fa-receipt', 'sikasLoadRiwayat()');
        menuHTML += createItem('Tagihan', 'fa-tags', 'sikasLoadPengaturan()');
        menuHTML += createItem('Tabungan Siswa', 'fa-piggy-bank', 'tabunganLoad()');
    } 
    else if (currentUser.role === 'guru') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadGuruDashboard()', true);
        menuHTML += createItem('Daftar Hadir', 'fa-clipboard-check', 'loadDaftarHadirGuru()');
        menuHTML += createItem('Rekap Bulanan', 'fa-calendar-days', 'loadMenuRekapBulanan()');
        menuHTML += createItem('Nilai Siswa', 'fa-star-half-stroke', "showView('view-nilai-siswa'); setActiveMenu('Nilai Siswa'); loadDataNilai()");
        menuHTML += createItem('Izin Siswa', 'fa-hand-paper', "showView('view-perizinan-siswa-guru'); setActiveMenu('Izin Siswa'); loadPerizinanSiswaUntukGuru()", false, 'badge-izin-siswa');
        menuHTML += createItem('Jadwal Mengajar', 'fa-calendar-days', 'loadJadwalMengajar()');
        menuHTML += createItem('Profil Saya', 'fa-user', 'loadProfilSaya()');
    }
    else if (currentUser.role === 'wakel') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadAdminDashboard()', true);
        menuHTML += createGroupLabel('Laporan');
        menuHTML += createItem('Rekap Bulanan', 'fa-calendar-days', 'loadMenuRekapBulanan()');
    }
    else if (currentUser.role === 'walikelas') {
        // Wali kelas tetap seorang guru: dapat menu guru biasa + menu tambahan "Kelas Saya"
        menuHTML += createItem('Dashboard', 'fa-home', 'loadGuruDashboard()', true);
        menuHTML += createGroupLabel('Kelas Saya');
        menuHTML += createItem('Data Siswa', 'fa-user-graduate', 'loadDataSiswa()');
        menuHTML += createItem('Daftar Hadir', 'fa-clipboard-check', 'loadDaftarHadirGuru()');
        menuHTML += createGroupLabel('Laporan');
        menuHTML += createItem('Rekap Bulanan', 'fa-calendar-days', 'loadMenuRekapBulanan()');
        menuHTML += createItem('Nilai Siswa', 'fa-star-half-stroke', "showView('view-nilai-siswa'); setActiveMenu('Nilai Siswa'); loadDataNilai()");
        menuHTML += createGroupLabel('Perizinan');
        menuHTML += createItem('Izin Siswa', 'fa-hand-paper', "showView('view-perizinan-siswa-guru'); setActiveMenu('Izin Siswa'); loadPerizinanSiswaUntukGuru()", false, 'badge-izin-siswa');
        menuHTML += createGroupLabel('Guru');
        menuHTML += createItem('Jadwal Mengajar', 'fa-calendar-days', 'loadJadwalMengajar()');
        menuHTML += createItem('Profil Saya', 'fa-user', 'loadProfilSaya()');
    }
    else if (currentUser.role === 'kepsek') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadAdminDashboard()', true);
        menuHTML += createGroupLabel('Data');
        menuHTML += createItem('Data Siswa', 'fa-user-graduate', 'loadDataSiswa()');
        menuHTML += createItem('Data Guru', 'fa-chalkboard-user', 'loadDataProfilGuru()');
        menuHTML += createItem('Data Prestasi', 'fa-trophy', 'loadDataPrestasi()');
        menuHTML += createItem('Data Inventaris', 'fa-boxes-stacked', 'loadDataInventaris()');
        menuHTML += createGroupLabel('Kehadiran');
        menuHTML += createItem('Daftar Hadir', 'fa-clipboard-check', 'loadDaftarHadirGuru()');
        menuHTML += createItem('Monitoring', 'fa-eye', 'loadMonitoringAbsensi()');
        menuHTML += createGroupLabel('Laporan');
        menuHTML += createItem('Rekap Bulanan', 'fa-calendar-days', 'loadMenuRekapBulanan()');
        menuHTML += createItem('Kenaikan Kelas', 'fa-arrow-up', 'loadKenaikanKelas()');
        menuHTML += createItem('Nilai Siswa', 'fa-star-half-stroke', "showView('view-nilai-siswa'); setActiveMenu('Nilai Siswa'); loadDataNilai()");
    }
    else if (currentUser.role === 'pencatat') {
        menuHTML += createItem('Data Prestasi', 'fa-trophy', 'loadDataPrestasi()', true);
        menuHTML += createItem('Data Inventaris', 'fa-boxes-stacked', 'loadDataInventaris()');
    }
    else if (currentUser.role === 'bendahara') {
        menuHTML += createItem('Dashboard', 'fa-home', 'sikasDashboard()', true);
        menuHTML += createItem('Manajemen Tagihan', 'fa-file-invoice-dollar', 'sikasLoadTagihan()');
        menuHTML += createItem('Kasir Pembayaran', 'fa-cash-register', 'sikasLoadKasir()');
        menuHTML += createItem('Riwayat & Cetak Resi', 'fa-receipt', 'sikasLoadRiwayat()');
        menuHTML += createItem('Tagihan', 'fa-tags', 'sikasLoadPengaturan()');
        menuHTML += createItem('Tabungan Siswa', 'fa-piggy-bank', 'tabunganLoad()');
    }
    else if (currentUser.role === 'siswa') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadSiswaDashboard()', true);
        menuHTML += createItem('Kartu Saya', 'fa-id-card', 'loadQRCodeSiswa()');
        menuHTML += createItem('Jadwal Saya', 'fa-calendar-days', "loadJadwalSiswa()");
        menuHTML += createItem('Nilai Saya', 'fa-star-half-stroke', "showView('view-nilai-siswa'); setActiveMenu('Nilai Saya'); loadDataNilai()");
        menuHTML += createGroupLabel('Pembayaran');
        menuHTML += createItem('Tagihan Saya', 'fa-file-invoice-dollar', 'sikasLoadTagihanSaya()');
        menuHTML += createItem('Tabungan Saya', 'fa-piggy-bank', 'tabunganLoadSaya()');
        menuHTML += createGroupLabel('Perizinan');
        menuHTML += createItem('Izin / Sakit', 'fa-hand-paper', "showView('view-perizinan-siswa'); setActiveMenu('Izin / Sakit'); loadPerizinanSiswaMilikSaya()");
    }
    else if (currentUser.role === 'alumni') {
        menuHTML += createItem('Dashboard', 'fa-home', 'loadSiswaDashboard()', true);
        menuHTML += createItem('Kartu Saya', 'fa-id-card', 'loadQRCodeSiswa()');
        menuHTML += createItem('Nilai Saya', 'fa-star-half-stroke', "showView('view-nilai-siswa'); setActiveMenu('Nilai Saya'); loadDataNilai()");
    }
    menuContainer.innerHTML = menuHTML;
    const SIDEBAR_SCROLL_KEY = 'siakadSidebarScroll';
    if (!menuContainer._scrollListenerAttached) {
        menuContainer.addEventListener('scroll', function() {
            try { localStorage.setItem(SIDEBAR_SCROLL_KEY, menuContainer.scrollTop); } catch(e) {}
        }, { passive: true });
        menuContainer._scrollListenerAttached = true;
    }
    loadKelasSuggestions();
    if (initDashboard._isNewLogin) {
        try { localStorage.removeItem(LAST_MENU_KEY); localStorage.removeItem(SIDEBAR_SCROLL_KEY); } catch(e) {}
        menuContainer.scrollTop = 0;
        _isSavingMenu = true;
        try { _getDefaultLoader()(); } finally { _isSavingMenu = false; }
        initDashboard._isNewLogin = false;
        // Animasi masuk dashboard setelah login berhasil (berlaku untuk semua role)
        try {
            var dcAnim = document.getElementById('dashboardContainer');
            if (dcAnim) {
                dcAnim.classList.remove('dashboard-enter-animate');
                // force reflow supaya animasi bisa di-trigger ulang setiap login
                void dcAnim.offsetWidth;
                dcAnim.classList.add('dashboard-enter-animate');
                dcAnim.addEventListener('animationend', function handler() {
                    dcAnim.classList.remove('dashboard-enter-animate');
                    dcAnim.removeEventListener('animationend', handler);
                });
            }
        } catch(e) {}
    } else {
        restoreLastMenu();
        try {
            const savedScroll = parseInt(localStorage.getItem(SIDEBAR_SCROLL_KEY) || '0', 10);
            if (savedScroll > 0) {
                requestAnimationFrame(() => { menuContainer.scrollTop = savedScroll; });
            }
        } catch(e) {}
    }
    if (typeof startNotifBadgePolling === 'function') {
        setTimeout(startNotifBadgePolling, 800);
    }
}
    function loadKelasSuggestions() {
        console.log("Memuat daftar kelas dari Konfigurasi...");
        siakadRun.withSuccessHandler(function(classes) {
            existingClasses = classes; 
            populateAllClassDropdowns();
        }).getDaftarKelas();
    }
    function reloadExistingClasses(callback) {
        siakadRun
            .withSuccessHandler(function(classes) {
                existingClasses = classes || [];
                populateAllClassDropdowns();
                if (typeof callback === 'function') callback();
            })
            .withFailureHandler(function() {
                if (typeof callback === 'function') callback();
            })
            .getDaftarKelas();
    }
function populateAllClassDropdowns() {
    const dropdownIds = [
        'filterKelas',       
        'rekapKelas',        
        'promoKelasAsal',    
        'promoKelasTujuan',  
        'filterKelasJadwal'  
    ];
    dropdownIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            const defaultOption = select.options[0] ? select.options[0].cloneNode(true) : null;
            let extraOption = null;
            if(id === 'promoKelasTujuan') {
               extraOption = select.querySelector('option[value="LULUS"]');
            }
            select.innerHTML = '';
            if (defaultOption) select.appendChild(defaultOption);
            if (extraOption) select.appendChild(extraOption.cloneNode(true));
            existingClasses.forEach(kelas => {
                const option = document.createElement('option');
                option.value = kelas;
                option.text = kelas;
                select.appendChild(option);
            });
            if (existingClasses.includes(currentValue)) {
                select.value = currentValue;
            }
        }
    });
}
    function openKelasDropdown() {
        const input = document.getElementById('inputKelas');
        const dropdown = document.getElementById('dropdownKelasList');
        if (!dropdown) return;
        renderKelasDropdown(existingClasses);
        dropdown.classList.remove('hidden');
    }
    function filterKelasDropdown(keyword) {
        const filtered = existingClasses.filter(c => c.toLowerCase().includes(keyword.toLowerCase()));
        renderKelasDropdown(filtered);
    }
    function renderKelasDropdown(items) {
        const dropdown = document.getElementById('dropdownKelasList');
        if (!items || items.length === 0) {
            dropdown.innerHTML = '<div class="px-4 py-3 text-xs text-gray-400 italic">Kelas tidak ditemukan. Ketik untuk membuat baru.</div>';
            return;
        }
        dropdown.innerHTML = items.map(kelas => `
            <div onclick="selectKelas('${kelas}')" class="px-4 py-2 hover:bg-[#e8ecf4] cursor-pointer text-sm text-gray-700 transition-colors border-b border-gray-50 last:border-none">
                ${kelas}
            </div>
        `).join('');
    }
    function selectKelas(value) {
        const input = document.getElementById('inputKelas');
        if (input) {
            input.value = value;
            closeKelasDropdown();
        }
    }
    function closeKelasDropdown() {
        const dropdown = document.getElementById('dropdownKelasList');
        if (dropdown) {
            setTimeout(() => dropdown.classList.add('hidden'), 200);
        }
    }
function refreshData(type) {
        const btnIcon = event ? event.currentTarget.querySelector('i') : null;
        if(btnIcon) btnIcon.classList.add('fa-spin');
        if (type === 'siswa') {
            tableState.siswa.fullData = []; 
            loadDataSiswa();       
            showAlert('success', 'Data siswa diperbarui.');
        } 
        else if (type === 'guru') {
             tableState.guru.fullData = []; 
            loadDataGuru();        
            showAlert('success', 'Data user diperbarui.');
        }
        else if (type === 'guruprofil') {
            tableState.guruprofil.fullData = []; 
            loadDataProfilGuru();
            showAlert('success', 'Data guru diperbarui.');
        }
        else if (type === 'dashboard') {
            if (currentUser.role === 'admin' || currentUser.role === 'wakel' || currentUser.role === 'kepsek') loadAdminDashboard();
            else if (currentUser.role === 'guru' || currentUser.role === 'walikelas') loadGuruDashboard();
            else if (currentUser.role === 'pencatat') loadDataPrestasi();
            else loadSiswaDashboard();
            showAlert('success', 'Statistik Dashboard diperbarui.');
        }
        else if (type === 'monitoring') {
            tableState.monitoring.fullData = [];
            loadMonitoringAbsensi(); 
            showAlert('success', 'Data monitoring diperbarui.');
        }
        else if (type === 'alumni') {
            tableState.alumni.fullData = []; 
            loadDataAlumni();
            showAlert('success', 'Data alumni diperbarui.');
        }
        else if (type === 'prestasi') {
            tableState.prestasi.fullData = [];
            loadDataPrestasi();
            showAlert('success', 'Data prestasi diperbarui.');
        }
        else if (type === 'inventaris') {
            tableState.inventaris.fullData = [];
            loadDataInventaris();
            showAlert('success', 'Data inventaris diperbarui.');
        }
        if(btnIcon) setTimeout(() => btnIcon.classList.remove('fa-spin'), 1000);
    }
//  Grafik kehadiran siswa per periode (sinkron Rekapitulasi Bulanan)
    function stopAndBack(redirect = true) {
        stopPolling();
        stopDashLive();
        if (cameraPopup && !cameraPopup.closed) { cameraPopup.close(); cameraPopup = null; }
        if (html5QrCode) { try { html5QrCode.stop().catch(() => {}); } catch(e) {} html5QrCode = null; }
        isScanning = false;
        if (redirect && currentUser) returnToDashboard();
    }
    function returnToDashboard() {
        if(currentUser.role === 'admin' || currentUser.role === 'wakel' || currentUser.role === 'kepsek') loadAdminDashboard();
        else if(currentUser.role === 'guru' || currentUser.role === 'walikelas') loadGuruDashboard();
        else if(currentUser.role === 'pencatat') loadDataPrestasi();
        else loadSiswaDashboard();
    }
    function showLoading() { /* loading overlay dinonaktifkan sesuai permintaan */ }
    function hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }
    function showAlert(type, message) {
        const bg = type === 'success' ? 'bg-[#1b2a4a]' : 'bg-red-600';
        const div = document.createElement('div');
        div.className = `fixed top-6 right-6 ${bg} text-white px-6 py-4 rounded-xl shadow-2xl z-[80] flex items-center font-medium animate-fade-in transform translate-y-2`;
        div.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-3 text-base"></i> ${message}`;
        document.body.appendChild(div);
        setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
    }
    function togglePassword() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('togglePasswordIcon');
        // Pakai mask CSS, bukan type="password", agar terhindar dari notif Chrome (breach check & simpan password)
        const masked = passwordInput.style.webkitTextSecurity !== 'none' && passwordInput.style.webkitTextSecurity !== '';
        if (masked) {
            passwordInput.style.webkitTextSecurity = 'none';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.style.webkitTextSecurity = 'disc';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }
    async function downloadTemplate(type) {
        await ensureLib('xlsx');
        if (typeof XLSX === 'undefined') {
            showAlert('error', 'Library Excel (SheetJS) belum termuat. Coba refresh halaman.');
            return;
        }
        // Kolom HARUS sesuai persis dengan yang dibaca handler import di script.js
        const templateMap = {
            'siswa': {
                sheetName: 'Template Siswa',
                headers: ['Nama Lengkap', 'NISN', 'Jenis Kelamin', 'Tanggal Lahir', 'Agama', 'Nama Ayah', 'Nama Ibu', 'No Handphone', 'Email', 'Kelas', 'Alamat'],
                contoh: [
                    ['Budi Santoso', '1234567890', 'Laki-laki', '2010-05-20', 'Islam', 'Andi Santoso', 'Siti Aminah', '08123456789', 'budi@email.com', 'X-A', 'Jl. Merdeka No. 1'],
                    ['Siti Rahayu', '0987654321', 'Perempuan', '2010-08-15', 'Islam', 'Hendra Rahayu', 'Dewi Lestari', '08567891234', 'siti@email.com', 'X-B', 'Jl. Sudirman No. 5'],
                ],
                widths: [22, 15, 14, 14, 10, 18, 18, 16, 24, 8, 25]
            },
            'guru': {
                sheetName: 'Template Guru',
                headers: ['Nama', 'NIP', 'Username', 'Password', 'Role', 'Kelas'],
                contoh: [
                    ['Sari Dewi, S.Pd', '198501012010012001', 'saridewi', 'password123', 'guru', 'X-A'],
                    ['Budi Hartono, M.Pd', '197803152005011002', 'budihartono', 'password456', 'wakel', 'X-B'],
                ],
                widths: [22, 20, 16, 16, 8, 8]
            },
            'guruprofil': {
                sheetName: 'Template Profil Guru',
                // Import baca: 'Nama Lengkap'/'Nama', 'NIP/NUPTK'/'NIP', 'Jabatan',
                //   'Mata Pelajaran / Kelas Diampu', 'No Handphone'/'HP', 'Email', 'Status Kepegawaian', 'Alamat'
                headers: ['NIP/NUPTK', 'Nama Lengkap', 'Jenis Kelamin', 'Tanggal Lahir', 'Agama', 'Jabatan', 'Mata Pelajaran / Kelas Diampu', 'No Handphone', 'Email', 'Status Kepegawaian', 'Alamat'],
                contoh: [
                    ['198501012010012001', 'Sari Dewi, S.Pd', 'Perempuan', '1985-01-01', 'Islam', 'Guru Kelas', 'Matematika', '08123456789', 'sari@sekolah.sch.id', 'PNS', 'Jl. Guru No. 1'],
                    ['197803152005011002', 'Budi Hartono, M.Pd', 'Laki-laki', '1978-03-15', 'Islam', 'Wali Kelas', 'Bahasa Indonesia', '08567891234', 'budi@sekolah.sch.id', 'GTT', 'Jl. Pendidikan No. 2'],
                ],
                widths: [20, 22, 14, 14, 10, 14, 28, 16, 26, 18, 25]
            },
            'prestasi': {
                sheetName: 'Template Prestasi',
                // Import baca: 'Nama Siswa'/'Nama', 'Nama Kegiatan / Lomba'/'Nama Kegiatan'/'Lomba',
                //   'NISN', 'Jenis Prestasi', 'Tingkat', 'Peringkat'/'Juara', 'Tahun', 'Keterangan'
                headers: ['Nama Siswa', 'NISN', 'Jenis Prestasi', 'Nama Kegiatan / Lomba', 'Tingkat', 'Peringkat', 'Tahun', 'Keterangan'],
                contoh: [
                    ['Budi Santoso', '1234567890', 'Akademik', 'Olimpiade Matematika', 'Kabupaten', 'Juara 1', new Date().getFullYear(), 'Mewakili sekolah'],
                    ['Siti Rahayu', '0987654321', 'Non-Akademik', 'Lomba Pramuka', 'Provinsi', 'Juara 2', new Date().getFullYear(), ''],
                ],
                widths: [22, 15, 14, 28, 12, 12, 8, 20]
            },
            'inventaris': {
                sheetName: 'Template Inventaris',
                // Import baca: 'Nama Barang'/'Nama', 'Kode Barang'/'Kode',
                //   'Jumlah', 'Kondisi', 'Lokasi', 'Keterangan', 'Satuan', 'Kategori', 'Tanggal Masuk'
                headers: ['Kode Barang', 'Nama Barang', 'Kategori', 'Jumlah', 'Satuan', 'Kondisi', 'Lokasi', 'Tanggal Masuk', 'Keterangan'],
                contoh: [
                    ['INV-001', 'Meja Belajar', 'Mebel', 30, 'Unit', 'Baik', 'Ruang Kelas X-A', '2024-01-10', ''],
                    ['INV-002', 'Proyektor Epson', 'Elektronik', 5, 'Unit', 'Baik', 'Gudang', '2023-06-15', 'Termasuk kabel HDMI'],
                ],
                widths: [14, 22, 14, 8, 8, 10, 20, 14, 22]
            }
        };

        const tpl = templateMap[type];
        if (!tpl) {
            showAlert('error', 'Tipe template tidak dikenal: ' + type);
            return;
        }
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([tpl.headers, ...tpl.contoh]);
            ws['!cols'] = tpl.widths.map(function(w) { return { wch: w }; });
            XLSX.utils.book_append_sheet(wb, ws, tpl.sheetName);
            // Sheet petunjuk per tipe
            const petunjukMap = {
                'siswa': [
                    ['Kolom', 'Keterangan', 'Contoh'],
                    ['Nama Lengkap', 'Nama lengkap siswa (wajib)', 'Budi Santoso'],
                    ['NISN', 'Nomor Induk Siswa Nasional 10 digit (wajib)', '1234567890'],
                    ['Jenis Kelamin', 'Laki-laki atau Perempuan', 'Laki-laki'],
                    ['Tanggal Lahir', 'Format YYYY-MM-DD', '2010-05-20'],
                    ['Agama', 'Islam / Kristen / Katolik / Hindu / Budha / Konghucu', 'Islam'],
                    ['Nama Ayah', 'Nama ayah kandung', 'Andi Santoso'],
                    ['Nama Ibu', 'Nama ibu kandung', 'Siti Aminah'],
                    ['No Handphone', 'Nomor HP aktif', '08123456789'],
                    ['Email', 'Alamat email siswa (opsional, harus unik)', 'budi@email.com'],
                    ['Kelas', 'Kelas saat ini, sesuai yang ada di sistem', 'X-A'],
                    ['Alamat', 'Alamat lengkap tempat tinggal', 'Jl. Merdeka No. 1'],
                ],
                'guru': [
                    ['Kolom', 'Keterangan', 'Contoh'],
                    ['Nama', 'Nama lengkap guru (wajib)', 'Sari Dewi, S.Pd'],
                    ['NIP', 'Nomor Induk Pegawai (boleh kosong)', '198501012010012001'],
                    ['Username', 'Username login (wajib, unik)', 'saridewi'],
                    ['Password', 'Password awal login (wajib)', 'password123'],
                    ['Role', 'Peran: guru atau wakel (wajib)', 'guru'],
                    ['Kelas', 'Kelas wali (opsional, khusus wakel)', 'X-A'],
                ],
                'guruprofil': [
                    ['Kolom', 'Keterangan', 'Contoh'],
                    ['NIP/NUPTK', 'Nomor Induk Pegawai/NUPTK (wajib, unik)', '198501012010012001'],
                    ['Nama Lengkap', 'Nama lengkap guru (wajib)', 'Sari Dewi, S.Pd'],
                    ['Jenis Kelamin', 'Laki-laki atau Perempuan', 'Perempuan'],
                    ['Tanggal Lahir', 'Format YYYY-MM-DD', '1985-01-01'],
                    ['Agama', 'Islam / Kristen / Katolik / Hindu / Budha / Konghucu', 'Islam'],
                    ['Jabatan', 'Jabatan di sekolah', 'Guru Kelas'],
                    ['Mata Pelajaran / Kelas Diampu', 'Mapel atau kelas yang diampu', 'Matematika'],
                    ['No Handphone', 'Nomor HP aktif', '08123456789'],
                    ['Email', 'Alamat email guru (opsional, harus unik)', 'sari@sekolah.sch.id'],
                    ['Status Kepegawaian', 'PNS / GTT / GTY / Honorer', 'PNS'],
                    ['Alamat', 'Alamat lengkap', 'Jl. Guru No. 1'],
                ],
                'prestasi': [
                    ['Kolom', 'Keterangan', 'Contoh'],
                    ['Nama Siswa', 'Nama lengkap siswa (wajib)', 'Budi Santoso'],
                    ['NISN', 'NISN siswa', '1234567890'],
                    ['Jenis Prestasi', 'Akademik atau Non-Akademik', 'Akademik'],
                    ['Nama Kegiatan / Lomba', 'Nama lomba/kegiatan (wajib)', 'Olimpiade Matematika'],
                    ['Tingkat', 'Madrasah / Kecamatan / Kabupaten / Provinsi / Nasional', 'Kabupaten'],
                    ['Peringkat', 'Juara 1 / Juara 2 / Juara 3 / Harapan / Peserta', 'Juara 1'],
                    ['Tahun', 'Tahun pelaksanaan', new Date().getFullYear()],
                    ['Keterangan', 'Catatan tambahan (opsional)', 'Mewakili sekolah'],
                ],
                'inventaris': [
                    ['Kolom', 'Keterangan', 'Contoh'],
                    ['Kode Barang', 'Kode unik barang (wajib)', 'INV-001'],
                    ['Nama Barang', 'Nama barang (wajib)', 'Meja Belajar'],
                    ['Kategori', 'Kategori barang', 'Mebel'],
                    ['Jumlah', 'Jumlah unit (angka)', 30],
                    ['Satuan', 'Satuan: Unit / Buah / Lusin / Set / Rim', 'Unit'],
                    ['Kondisi', 'Baik / Rusak Ringan / Rusak Berat', 'Baik'],
                    ['Lokasi', 'Lokasi penyimpanan', 'Ruang Kelas X-A'],
                    ['Tanggal Masuk', 'Format YYYY-MM-DD', '2024-01-10'],
                    ['Keterangan', 'Catatan tambahan (opsional)', ''],
                ],
            };
            if (petunjukMap[type]) {
                const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukMap[type]);
                wsPetunjuk['!cols'] = [{ wch: 28 }, { wch: 46 }, { wch: 24 }];
                XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
            }
            XLSX.writeFile(wb, 'Template_Import_' + type.toUpperCase() + '.xlsx');
            showAlert('success', 'Template berhasil diunduh!');
        } catch (e) {
            showAlert('error', 'Gagal generate template: ' + e.message);
        }
    }
    // ===== PERBAIKAN BUG MOBILE: session restore & re-check =====
    // Mobile-safe session init: retry jika localStorage belum siap
    