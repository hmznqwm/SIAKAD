<div id="view-admin-dashboard" class="view-section animate-fade-in">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
    <div>
      <h2 class="text-base font-bold text-gray-900 tracking-tight">Selamat datang kembali 👋</h2>
      <p class="text-xs text-gray-400 mt-0.5">Pusat kontrol data akademik — <span id="adminDateDisplay" class="text-[#1b2a4a] font-semibold">...</span></p>
    </div>
  </div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
    <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 bg-[#e8ecf4] rounded-xl flex items-center justify-center shrink-0">
        <i class="fas fa-users text-[#1b2a4a] text-sm"></i>
      </div>
      <div>
        <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Siswa</p>
        <h3 id="admStatTotal" class="text-xl font-black text-gray-900 leading-none mt-0.5">—</h3>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 bg-[#e8ecf4] rounded-xl flex items-center justify-center shrink-0">
        <i class="fas fa-chalkboard-teacher text-[#1b2a4a] text-sm"></i>
      </div>
      <div>
        <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Guru</p>
        <h3 id="admStatTotalGuru" class="text-xl font-black text-gray-900 leading-none mt-0.5">—</h3>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 bg-[#e8ecf4] rounded-xl flex items-center justify-center shrink-0">
        <i class="fas fa-user-graduate text-[#1b2a4a] text-sm"></i>
      </div>
      <div>
        <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Alumni</p>
        <h3 id="admStatTotalAlumni" class="text-xl font-black text-gray-900 leading-none mt-0.5">—</h3>
      </div>
    </div>
    <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 bg-[#e8ecf4] rounded-xl flex items-center justify-center shrink-0">
        <i class="fas fa-school text-[#1b2a4a] text-sm"></i>
      </div>
      <div>
        <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Kelas</p>
        <h3 id="admStatTotalKelas" class="text-xl font-black text-gray-900 leading-none mt-0.5">—</h3>
      </div>
    </div>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
    <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm min-w-0">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-sm font-bold text-gray-800">Kehadiran Siswa</h3>
          <p class="text-[10px] text-gray-400 mt-0.5" id="admSiswaChartSub">Rekap hari ini</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative flex items-center">
            <i class="fas fa-calendar-alt text-[10px] text-gray-400 absolute left-2.5 pointer-events-none"></i>
            <select onchange="setAdminSiswaPeriod(this.value)" class="appearance-none bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg pl-7 pr-7 py-2 shadow-sm focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#5b7aaa] cursor-pointer hover:border-gray-300 transition-all">
              <option value="harian" selected>Hari Ini</option>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
              <option value="tahunan">Tahunan</option>
            </select>
            <i class="fas fa-chevron-down text-[9px] text-gray-400 absolute right-2.5 pointer-events-none"></i>
          </div>
        </div>
      </div>
      <div class="relative w-full h-[200px] sm:h-[240px] lg:h-[260px] min-w-0"><canvas id="adminAttendanceChart"></canvas></div>
    </div>
    <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm min-w-0">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-sm font-bold text-gray-800">Kehadiran Guru</h3>
          <p class="text-[10px] text-gray-400 mt-0.5" id="admGuruChartSub">Rekap hari ini</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative flex items-center">
            <i class="fas fa-calendar-alt text-[10px] text-gray-400 absolute left-2.5 pointer-events-none"></i>
            <select onchange="setAdminGuruPeriod(this.value)" class="appearance-none bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg pl-7 pr-7 py-2 shadow-sm focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#5b7aaa] cursor-pointer hover:border-gray-300 transition-all">
              <option value="harian" selected>Hari Ini</option>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
              <option value="tahunan">Tahunan</option>
            </select>
            <i class="fas fa-chevron-down text-[9px] text-gray-400 absolute right-2.5 pointer-events-none"></i>
          </div>
        </div>
      </div>
      <div class="relative w-full h-[200px] sm:h-[240px] lg:h-[260px] min-w-0"><canvas id="adminAttendanceChartGuru"></canvas></div>
    </div>
  </div>
  <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3 min-w-0">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-bold text-gray-800">Administrasi Pembayaran</h3>
        <p class="text-[10px] text-gray-400 mt-0.5">Ringkasan tagihan &amp; pemasukan</p>
      </div>
      <div class="relative flex items-center">
        <i class="fas fa-filter text-[10px] text-gray-400 absolute left-2.5 pointer-events-none"></i>
        <select id="admPayFilter" onchange="loadAdminPaymentChart()" class="appearance-none bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg pl-7 pr-7 py-2 shadow-sm focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#5b7aaa] cursor-pointer hover:border-gray-300 transition-all">
          <option value="">Semua Tagihan</option>
        </select>
        <i class="fas fa-chevron-down text-[9px] text-gray-400 absolute right-2.5 pointer-events-none"></i>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
      <div class="md:col-span-2 space-y-3">
        <div class="flex items-center gap-3 bg-[#e8ecf4] rounded-xl px-4 py-3 border border-[#d0d8e8]">
          <span class="w-2.5 h-2.5 rounded-full bg-[#1b2a4a] shrink-0"></span>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold text-[#5b7aaa] uppercase tracking-wider">Sudah Dibayar</p>
            <p id="admPayLunas" class="text-sm font-black text-[#152238] leading-tight truncate">—</p>
          </div>
        </div>

        <div class="flex items-center gap-3 bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
          <span class="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0"></span>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Belum Lunas</p>
            <p id="admPayBelum" class="text-sm font-black text-orange-600 leading-tight truncate">—</p>
          </div>
        </div>

        <div class="flex items-center gap-3 bg-[#e8ecf4] rounded-xl px-4 py-3 border border-[#d0d8e8]">
          <span class="w-2.5 h-2.5 rounded-full bg-[#5b7aaa] shrink-0"></span>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold text-[#5b7aaa] uppercase tracking-wider">Total Tagihan</p>
            <p id="admPayTotal" class="text-sm font-black text-[#152238] leading-tight truncate">—</p>
          </div>
        </div>
      </div>
      <div class="md:col-span-3 relative w-full h-[220px] sm:h-[240px] min-w-0"><canvas id="adminPaymentChart"></canvas></div>
    </div>
  </div>
  <div id="adminQuickAccess" class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
    <div class="flex items-center gap-2 mb-3">
      <i class="fas fa-bolt text-[#1b2a4a] dark:text-blue-300 text-[11px]"></i>
      <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Akses Cepat</p>
    </div>
    <div class="grid grid-cols-3 md:grid-cols-6 gap-2.5">

      <button type="button" onclick="loadDaftarHadirGuru()" class="aqc-btn aqc-blue group" title="Buka Daftar Hadir">
        <div class="aqc-icon"><i class="fas fa-clipboard-check"></i></div>
        <span class="aqc-label">Daftar Hadir</span>
      </button>

      <button type="button" onclick="loadDataSiswa()" class="aqc-btn aqc-emerald group" title="Buka Data Siswa">
        <div class="aqc-icon"><i class="fas fa-user-graduate"></i></div>
        <span class="aqc-label">Data Siswa</span>
      </button>

      <button type="button" onclick="loadDataProfilGuru()" class="aqc-btn aqc-purple group" title="Buka Data Guru">
        <div class="aqc-icon"><i class="fas fa-chalkboard-teacher"></i></div>
        <span class="aqc-label">Data Guru</span>
      </button>

      <button type="button" onclick="loadMenuRekapBulanan()" class="aqc-btn aqc-amber group" title="Buka Laporan Rekap Bulanan">
        <div class="aqc-icon"><i class="fas fa-file-alt"></i></div>
        <span class="aqc-label">Laporan</span>
      </button>

      <button type="button" onclick="loadKelolaAbsen()" class="aqc-btn aqc-rose group" title="Kelola Hari Libur">
        <div class="aqc-icon"><i class="fas fa-calendar-times"></i></div>
        <span class="aqc-label">Hari Libur</span>
      </button>

      <!-- Absensi Guru: langsung buka Daftar Hadir dalam mode Scan Guru,
           bukan sekadar laporan Rekap Bulanan (dulu tombol ini "diam" /
           tidak melakukan aksi absensi apa pun ketika diklik). -->
      <button type="button" onclick="loadAbsensiGuruLangsung()" class="aqc-btn aqc-cyan group" title="Scan / Input Absensi Guru">
        <div class="aqc-icon"><i class="fas fa-qrcode"></i></div>
        <span class="aqc-label">Absensi Guru</span>
      </button>

    </div>
  </div>
</div>
