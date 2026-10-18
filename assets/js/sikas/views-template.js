// sikas/views-template.js
// Template HTML seluruh view SIKAS (dashboard, tagihan, kasir, riwayat, pengaturan)
// yang di-inject ke DOM saat modul dimuat. Satu fungsi besar (markup statis).
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

function sikasInjectViews() {
  const area = document.getElementById('mainContentArea');
  if (!area || document.getElementById('view-sikas-tagihan')) return;
  // Inject dashboard bendahara
  if (!document.getElementById('view-sikas-dashboard')) {
    const dashDiv = document.createElement('div');
    dashDiv.innerHTML = `
<div id="view-sikas-dashboard" class="view-section animate-fade-in hidden">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
    <div>
      <h2 class="text-base font-bold text-gray-900 tracking-tight">Dashboard Keuangan</h2>
      <p class="text-xs text-[#5b7aaa] mt-0.5" id="sikas-dash-date"></p>
    </div>
    <div class="flex gap-2">
      <select id="sikas-dash-filter" onchange="sikasRenderDashboard()" class="bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[#a0b0cc] focus:bg-white outline-none transition">
        <option value="">Semua Jenis Tagihan</option>
      </select>
    </div>
  </div>
  <!-- Stat Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" id="sikas-dash-stats">
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div class="flex items-center gap-2 mb-1"><span class="w-8 h-8 rounded-xl bg-[#d0d8e8] flex items-center justify-center"><i class="fas fa-check-circle text-[#1b2a4a] text-sm"></i></span><span class="text-xs text-[#5b7aaa] font-medium">Total Terkumpul</span></div>
      <p class="text-base font-extrabold text-[#1b2a4a]" id="sikas-dash-lunas">—</p>
      <p class="text-xs text-[#8fa3c0]" id="sikas-dash-lunas-sub"></p>
    </div>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div class="flex items-center gap-2 mb-1"><span class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center"><i class="fas fa-clock text-amber-500 text-sm"></i></span><span class="text-xs text-[#5b7aaa] font-medium">Belum Lunas</span></div>
      <p class="text-base font-extrabold text-amber-500" id="sikas-dash-belum">—</p>
      <p class="text-xs text-[#8fa3c0]" id="sikas-dash-belum-sub"></p>
    </div>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div class="flex items-center gap-2 mb-1"><span class="w-8 h-8 rounded-xl bg-[#d0d8e8] flex items-center justify-center"><i class="fas fa-calendar-check text-[#1b2a4a] text-sm"></i></span><span class="text-xs text-[#5b7aaa] font-medium">Transaksi Bulan Ini</span></div>
      <p class="text-base font-extrabold text-[#1b2a4a]" id="sikas-dash-bulan">—</p>
      <p class="text-xs text-[#8fa3c0]" id="sikas-dash-bulan-sub"></p>
    </div>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div class="flex items-center gap-2 mb-1"><span class="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center"><i class="fas fa-exclamation-triangle text-rose-500 text-sm"></i></span><span class="text-xs text-[#5b7aaa] font-medium">Siswa Menunggak</span></div>
      <p class="text-base font-extrabold text-rose-600" id="sikas-dash-overdue-count">—</p>
      <p class="text-xs text-[#8fa3c0]">Tunggakan &gt; 7 hari</p>
    </div>
  </div>
  <!-- Chart + Overdue Table -->
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
    <!-- Doughnut Chart -->
    <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style="min-width:0">
      <p class="text-sm font-bold text-[#1b2a4a] mb-4">Komposisi Pembayaran</p>
      <div class="relative" style="height:200px;min-width:0">
        <canvas id="sikas-dash-chart"></canvas>
      </div>
      <div class="flex justify-center gap-5 mt-4">
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-[#1b2a4a] inline-block"></span><span class="text-xs text-[#3d5478]">Lunas</span></div>
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-amber-400 inline-block"></span><span class="text-xs text-[#3d5478]">Belum Lunas</span></div>
      </div>
    </div>
    <!-- Overdue Table -->
    <div class="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p class="text-sm font-bold text-[#1b2a4a] mb-3">Siswa Menunggak Terlama</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="text-xs text-[#8fa3c0] border-b border-gray-100">
            <th class="pb-2 text-left font-semibold">Nama</th>
            <th class="pb-2 text-left font-semibold">Kelas</th>
            <th class="pb-2 text-left font-semibold">Jenis</th>
            <th class="pb-2 text-right font-semibold">Nominal</th>
            <th class="pb-2 text-right font-semibold">Terlambat</th>
          </tr></thead>
          <tbody id="sikas-dash-overdue-body">
            <tr><td colspan="5" class="py-6 text-center text-[#8fa3c0]"><i class="fas fa-circle-notch fa-spin mr-2 text-[#1b2a4a]"></i>Memuat...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>`;
    area.appendChild(dashDiv.firstElementChild);
  }

  const viewsHTML = `
<div id="view-sikas-tagihan" class="view-section animate-fade-in hidden">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
    <div>
      <h2 class="text-lg font-bold text-[#0f1d35] tracking-tight">Manajemen Tagihan</h2>
      <p class="text-sm text-[#3d5478] mt-0.5">Tagihan SPP &amp; pembayaran per siswa</p>
    </div>
    <div class="flex gap-2 w-full sm:w-auto">
      <button onclick="sikasSendMassWhatsApp()" class="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25d366] hover:bg-[#1eb85a] text-white rounded-lg text-xs font-bold shadow-sm transition-colors shrink-0 w-full sm:w-auto whitespace-nowrap">
        <i class="fab fa-whatsapp text-sm"></i> Kirim WA Massal
      </button>
    </div>
  </div>
  <div id="sikas-tagihan-stats" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"></div>
  <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#f4f6fb]/50">
      <div>
        <h3 class="text-sm font-bold text-[#0f1d35]">Tagihan per Siswa</h3>
        <p class="text-xs text-[#3d5478] mt-0.5">Klik siswa untuk melihat detail tagihan</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <div class="relative w-full sm:w-52">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8fa3c0] pointer-events-none"><i class="fas fa-search text-[11px]"></i></span>
          <input type="text" id="sikas-tagihan-search" oninput="sikasFilterTagihanStudents()" placeholder="Cari nama / NISN / kelas..." class="bg-white border border-[#d0d8e8] text-[#152238] text-xs rounded-lg pl-7 pr-3 py-2 font-medium focus:ring-[#5b7aaa] focus:border-[#1b2a4a] shadow-sm outline-none w-full">
        </div>
        <select id="sikas-tagihan-jenis" onchange="sikasFilterTagihanStudents()" class="bg-white border border-[#d0d8e8] text-[#152238] text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] focus:border-[#1b2a4a] shadow-sm cursor-pointer outline-none w-full sm:w-auto">
          <option value="">Semua Jenis Tagihan</option>
        </select>
        <select id="sikas-tagihan-filter" onchange="sikasFilterTagihanStudents()" class="bg-white border border-[#d0d8e8] text-[#152238] text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] focus:border-[#1b2a4a] shadow-sm cursor-pointer outline-none w-full sm:w-auto">
          <option value="">Semua Status</option>
          <option value="Belum Lunas" selected>Belum Lunas</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>
    </div>
    <div id="sikas-tagihan-students" class="p-4">
      <div class="text-center py-10 text-[#8fa3c0]"><i class="fas fa-circle-notch fa-spin text-lg mb-2 block text-[#1b2a4a]"></i><p class="text-sm">Memuat data tagihan...</p></div>
    </div>
  </div>
  <div id="sikas-tagihan-detail" class="hidden mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-[#f4f6fb]/50">
      <div class="flex items-center gap-3 min-w-0">
        <button onclick="sikasBackToTagihanList()" class="p-2 hover:bg-[#e8ecf4] rounded-lg transition-colors text-[#5b7aaa] shrink-0"><i class="fas fa-arrow-left text-sm"></i></button>
        <div id="sikas-tagihan-detail-avatar" class="w-10 h-10 rounded-full bg-[#e8ecf4] flex items-center justify-center text-[#152238] font-bold text-sm shrink-0 border border-[#d0d8e8]"></div>
        <div class="min-w-0">
          <h3 id="sikas-tagihan-detail-name" class="font-bold text-base text-[#1b2a4a] truncate"></h3>
          <p id="sikas-tagihan-detail-info" class="text-xs text-[#5b7aaa] truncate"></p>
        </div>
      </div>
      <button onclick="sikasSendBulkWhatsApp()" class="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#e8ecf4] text-[#152238] rounded-lg text-xs font-bold hover:bg-[#d0d8e8] transition-colors shrink-0 w-full sm:w-auto whitespace-nowrap">
        <i class="fab fa-whatsapp text-sm"></i> Kirim Semua via WA
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-[#f4f6fb] text-[#3d5478] text-xs uppercase font-bold">
          <tr>
            <th class="px-4 py-2.5 text-center w-10"><input type="checkbox" id="sikas-tagihan-check-all" onchange="sikasToggleAllDetailBills(this)" class="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]"></th>
            <th class="px-4 py-2.5">Jenis Tagihan</th>
            <th class="px-4 py-2.5">Jumlah</th>
            <th class="px-4 py-2.5">Jatuh Tempo</th>
            <th class="px-4 py-2.5">Status</th>
            <th class="px-4 py-2.5 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody id="sikas-tagihan-detail-bills" class="divide-y divide-gray-50 bg-white text-sm"></tbody>
      </table>
    </div>
    <div id="sikas-tagihan-detail-summary" class="px-4 py-3 bg-[#f4f6fb] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-[#1b2a4a] font-medium"></div>
  </div>
</div>

<div id="view-sikas-kasir" class="view-section animate-fade-in hidden">
  <div class="flex items-center justify-between mb-3">
    <div>
      <h2 class="text-base font-bold text-[#0f1d35]">Kasir Pembayaran</h2>
      <p class="text-xs text-[#3d5478] mt-0.5">Terima pembayaran tagihan siswa secara langsung</p>
    </div>
  </div>
  <div class="grid grid-cols-12 gap-3">
    <!-- Kiri: Cari Siswa + Profil -->
    <div class="col-span-12 lg:col-span-5 space-y-2">
      <!-- Cari Siswa -->
      <div class="bg-white border border-gray-100 px-3 py-2.5 rounded-xl shadow-sm">
        <label class="text-xs font-bold uppercase text-[#1b2a4a] mb-2 block tracking-wider flex items-center gap-1.5">
          <span class="w-5 h-5 bg-[#d0d8e8] rounded-md flex items-center justify-center"><i class="fas fa-user-graduate text-[#1b2a4a] text-[10px]"></i></span>
          Pilih Siswa
        </label>
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3c0] pointer-events-none text-xs"></i>
          <input type="text" id="sikas-kasir-search" autocomplete="off" placeholder="Cari nama, kelas, atau NISN..."
            class="w-full bg-[#f4f6fb] border border-[#d0d8e8] rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#152238] transition-all focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8]"
            onfocus="sikasFilterKasirDropdown()" oninput="sikasFilterKasirDropdown()" onblur="setTimeout(function(){document.getElementById('sikas-kasir-dropdown').classList.add('hidden');},150)">
          <div id="sikas-kasir-dropdown" class="hidden absolute z-30 left-0 right-0 mt-1 bg-white border border-[#d0d8e8] rounded-xl shadow-lg max-h-52 overflow-y-auto"></div>
        </div>
      </div>
      <!-- Profil Siswa -->
      <div id="sikas-kasir-profile" class="hidden bg-white border border-gray-100 px-3 py-2.5 rounded-xl shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#e8ecf4] flex items-center justify-center shrink-0 border border-[#d0d8e8]">
            <span id="sikas-kasir-avatar" class="text-sm font-bold text-[#152238]">--</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-0.5">
              <span class="px-2 py-0.5 bg-[#e8ecf4] text-[#152238] text-[10px] font-bold rounded-full">Aktif</span>
              <span id="sikas-kasir-nisn" class="text-[10px] text-[#8fa3c0] font-medium truncate"></span>
            </div>
            <h3 id="sikas-kasir-name" class="font-bold text-sm text-[#0f1d35] truncate"></h3>
            <p id="sikas-kasir-class" class="text-xs text-[#3d5478] font-medium"></p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <div class="bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
            <p class="text-[10px] text-rose-600 font-bold uppercase leading-tight">Total Tunggakan</p>
            <p id="sikas-kasir-tunggakan" class="font-bold text-rose-700 text-sm mt-0.5">Rp 0</p>
          </div>
          <div class="bg-[#e8ecf4] px-3 py-2 rounded-lg border border-[#d0d8e8]">
            <p class="text-[10px] text-[#1b2a4a] font-bold uppercase leading-tight">Jumlah Tagihan</p>
            <p id="sikas-kasir-billcount" class="font-bold text-[#0f1d35] text-sm mt-0.5">0 tagihan</p>
          </div>
        </div>
      </div>
    </div>
    <!-- Kanan: Rincian Tagihan -->
    <div class="col-span-12 lg:col-span-7">
      <div class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
        <!-- Header Rincian -->
        <div class="px-3 py-2.5 bg-[#f4f6fb]/70 flex justify-between items-center border-b border-gray-100">
          <div>
            <h4 class="font-bold text-sm text-[#0f1d35]">Rincian Tagihan</h4>
            <p class="text-[11px] text-[#3d5478]">Pilih tagihan yang ingin dibayarkan hari ini</p>
          </div>
          <button onclick="sikasSelectAllKasirBills()" class="text-[11px] font-bold uppercase tracking-wider text-[#152238] bg-white px-2.5 py-1 rounded-lg shadow-sm border border-[#d0d8e8] hover:bg-[#e8ecf4] transition-colors">
            <i class="fas fa-check-double mr-1 text-[#1b2a4a]"></i>Pilih Semua
          </button>
        </div>
        <!-- Daftar Tagihan -->
        <div id="sikas-kasir-bills" class="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin" style="max-height:220px;">
          <div class="py-10 text-center text-[#8fa3c0] text-xs">
            <i class="fas fa-user-circle text-2xl text-gray-200 mb-2 block"></i>
            Silakan pilih siswa terlebih dahulu.
          </div>
        </div>
        <!-- Footer Bayar -->
        <div class="px-3 py-2.5 bg-[#f4f6fb]/70 border-t border-gray-100">
          <div class="flex flex-col md:flex-row justify-between items-end gap-3">
            <!-- Metode Pembayaran -->
            <div class="w-full md:w-1/2">
              <label class="text-[11px] font-bold uppercase text-[#1b2a4a] block tracking-wider mb-1.5">Metode Pembayaran</label>
              <div class="grid grid-cols-3 gap-1.5">
                <button class="sikas-pay-method active px-2 py-2 border-2 border-[#1b2a4a] bg-[#e8ecf4] rounded-lg flex flex-col items-center gap-0.5 transition-all" data-method="Tunai">
                  <i class="fas fa-money-bill-wave text-sm text-[#152238]"></i>
                  <span class="text-xs font-bold text-[#0f1d35]">Tunai</span>
                </button>
                <button class="sikas-pay-method px-2 py-2 border-2 border-[#d0d8e8] bg-white hover:border-[#1b2a4a] rounded-lg flex flex-col items-center gap-0.5 transition-all text-[#3d5478]" data-method="Transfer">
                  <i class="fas fa-credit-card text-sm"></i>
                  <span class="text-xs font-bold">Transfer</span>
                </button>
                <button class="sikas-pay-method px-2 py-2 border-2 border-[#d0d8e8] bg-white hover:border-[#1b2a4a] rounded-lg flex flex-col items-center gap-0.5 transition-all text-[#3d5478]" data-method="QRIS">
                  <i class="fas fa-qrcode text-sm"></i>
                  <span class="text-xs font-bold">QRIS</span>
                </button>
              </div>
            </div>
            <!-- Total + Bayar -->
            <div class="w-full md:w-1/2 flex flex-col items-end">
              <div class="text-right mb-2">
                <p class="text-[11px] text-[#3d5478] font-semibold">Total yang harus dibayar:</p>
                <h2 id="sikas-kasir-total" class="text-xl font-black text-[#0f1d35] leading-tight">Rp 0</h2>
              </div>
              <button onclick="sikasProcessPayment()" class="w-full py-2.5 bg-[#1b2a4a] hover:bg-[#0f1d35] text-white rounded-lg font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                <i class="fas fa-check-circle"></i> Bayar Sekarang
              </button>
              <p class="mt-1 text-[10px] text-[#8fa3c0] italic">Kwitansi dicetak otomatis setelah berhasil.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="view-sikas-tagihan-saya" class="view-section animate-fade-in hidden">
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
    <div>
      <h2 class="text-lg font-bold text-[#0f1d35] tracking-tight">Tagihan Saya</h2>
      <p class="text-sm text-[#3d5478] mt-1">Riwayat tagihan SPP &amp; pembayaran Anda</p>
    </div>
    <!-- Stats Pills -->
    <div id="sikas-tagihan-saya-stats" class="flex flex-wrap gap-2 items-center md:justify-end md:ml-auto shrink-0"></div>
  </div>
  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-100 bg-[#f4f6fb]/50">
      <h3 class="font-bold text-[#1b2a4a]">Daftar Tagihan</h3>
      <p class="text-xs text-[#5b7aaa] mt-0.5">Tagihan yang perlu Anda bayarkan</p>
    </div>
    <div id="sikas-tagihan-saya-mobile-cards" class="sikas-siswa-mobile-cards" aria-live="polite"></div>
    <div class="sikas-tagihan-saya-desktop-table overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-[#f4f6fb] text-[#3d5478] text-xs uppercase font-bold">
          <tr>
            <th class="p-4">Jenis Tagihan</th>
            <th class="p-4">Bulan</th>
            <th class="p-4">Jatuh Tempo</th>
            <th class="p-4 text-right">Nominal</th>
            <th class="p-4 text-center">Status</th>
          </tr>
        </thead>
        <tbody id="sikas-tagihan-saya-body" class="divide-y divide-gray-50 bg-white text-sm">
          <tr><td colspan="5" class="p-8 text-center text-[#8fa3c0]"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat tagihan...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<div id="view-sikas-riwayat" class="view-section animate-fade-in hidden">
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
    <div>
      <h2 class="text-lg font-bold text-[#0f1d35] tracking-tight">Riwayat &amp; Cetak Resi</h2>
      <p class="text-sm text-[#3d5478] mt-1">Semua transaksi pembayaran</p>
    </div>
    <div class="flex flex-wrap gap-2 items-center md:justify-end md:ml-auto shrink-0">
      <!-- Tombol Hapus Massal: muncul saat ada baris terpilih (checkbox desktop / tekan-tahan di HP) -->
      <button id="btnBulkDeleteRiwayat" onclick="sikasBulkDeleteRiwayat()" class="hidden bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-1.5 whitespace-nowrap">
        <i class="fas fa-trash-alt"></i> Hapus (<span class="bulk-count">0</span>)
      </button>
      <!-- Stats Pills -->
      <div id="sikas-riwayat-stats" class="flex flex-wrap gap-2 items-center"></div>
    </div>
  </div>

  <!-- Bar Filter Riwayat Client-side -->
  <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4 flex flex-col md:flex-row gap-3">
    <div class="flex-1 relative">
      <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3c0] text-xs"></i>
      <input type="text" id="sikas-riwayat-search" oninput="sikasFilterRiwayatClient()" placeholder="Cari nama siswa..." class="w-full bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#a0b0cc] transition-all">
    </div>
    <div class="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center riwayat-filter-group">
      <div class="flex items-center gap-2 bg-[#f4f6fb] px-3 py-2 rounded-xl border border-[#d0d8e8] w-full sm:w-auto riwayat-filter-dates">
        <input type="date" id="sikas-riwayat-start" onchange="sikasFilterRiwayatClient()" class="flex-1 min-w-0 text-xs border-none focus:ring-0 text-[#3d5478] font-bold bg-transparent cursor-pointer outline-none" title="Tanggal Mulai">
        <span class="text-[#8fa3c0] text-xs shrink-0">—</span>
        <input type="date" id="sikas-riwayat-end" onchange="sikasFilterRiwayatClient()" class="flex-1 min-w-0 text-xs border-none focus:ring-0 text-[#3d5478] font-bold bg-transparent cursor-pointer outline-none" title="Tanggal Akhir">
      </div>
      <select id="sikas-riwayat-jenis" onchange="sikasFilterRiwayatClient()" class="w-full sm:w-auto bg-white border border-[#d0d8e8] text-[#152238] text-xs rounded-xl p-2 font-bold focus:ring-[#1b2a4a] shadow-sm cursor-pointer outline-none riwayat-filter-jenis">
        <option value="">Semua Jenis Tagihan</option>
      </select>
      <select id="sikas-riwayat-metode" onchange="sikasFilterRiwayatClient()" class="w-full sm:w-auto bg-white border border-[#d0d8e8] text-[#152238] text-xs rounded-xl p-2 font-bold focus:ring-[#1b2a4a] shadow-sm cursor-pointer outline-none riwayat-filter-metode">
        <option value="">Semua Metode</option>
        <option value="Tunai">Tunai</option>
        <option value="Transfer">Transfer</option>
        <option value="QRIS">QRIS</option>
      </select>
    </div>
  </div>

  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-[#f4f6fb] text-[#3d5478] text-xs uppercase font-bold">
          <tr>
            <th class="p-3 text-center w-9 riwayat-col-checkbox"><input type="checkbox" id="checkAllRiwayat" onchange="sikasToggleSelectAllRiwayat(this)" class="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" autocomplete="off"></th>
            <th class="p-4">Tanggal</th>
            <th class="p-4">Siswa</th>
            <th class="p-4">Kategori</th>
            <th class="p-4">Nominal</th>
            <th class="p-4 riwayat-col-metode">Metode</th>
            <th class="p-4 riwayat-col-resi">Resi</th>
            <th class="p-4 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody id="sikas-riwayat-body" class="divide-y divide-gray-50 bg-white text-sm">
          <tr><td colspan="8" class="p-8 text-center text-[#8fa3c0]"><i class="fas fa-circle-notch fa-spin mr-2 text-[#1b2a4a]"></i>Memuat transaksi...</td></tr>
        </tbody>
      </table>
    </div>
    <!-- Footer Pagination untuk Riwayat -->
    <div id="footer-sikas-riwayat" class="p-4 border-t border-gray-100 bg-[#f4f6fb]/30 flex justify-between items-center text-xs text-[#5b7aaa]">
      <span id="info-sikas-riwayat" class="font-medium"></span>
      <div class="flex gap-1.5">
        <button id="btn-prev-sikas-riwayat" class="inline-flex items-center gap-1 bg-white border border-[#d0d8e8] hover:bg-[#f4f6fb] text-[#152238] px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-40"><i class="fas fa-chevron-left text-[9px]"></i> Prev</button>
        <button id="btn-next-sikas-riwayat" class="inline-flex items-center gap-1 bg-white border border-[#d0d8e8] hover:bg-[#f4f6fb] text-[#152238] px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-40">Next <i class="fas fa-chevron-right text-[9px]"></i></button>
      </div>
    </div>
  </div>
</div>

<div id="view-sikas-pengaturan" class="view-section animate-fade-in hidden">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div>
      <h2 class="text-base font-bold text-gray-900 tracking-tight">Tagihan</h2>
      <p class="text-sm text-[#5b7aaa] mt-0.5">Master jenis tagihan &amp; generate tagihan massal ke siswa</p>
    </div>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <!-- Master Jenis Tagihan -->
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-3 py-2.5 border-b border-gray-100 bg-[#f4f6fb]/60 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-[#e8ecf4] rounded-lg flex items-center justify-center text-[#152238] border border-[#d0d8e8]">
            <i class="fas fa-database text-xs"></i>
          </div>
          <div>
            <h3 class="font-bold text-[#1b2a4a] text-xs">Master Jenis Tagihan</h3>
            <p class="text-[10px] text-[#5b7aaa]">Kelola daftar jenis tagihan &amp; default harga</p>
          </div>
        </div>
        <button onclick="sikasOpenMasterModal()" class="px-3 py-1.5 bg-[#1b2a4a] hover:bg-[#152238] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
          <i class="fas fa-plus text-[10px]"></i> Tambah
        </button>
      </div>
      <div class="overflow-y-auto" style="max-height:420px;">
        <table class="w-full text-left">
          <thead class="bg-[#f4f6fb] text-[#5b7aaa] text-[10px] uppercase font-semibold sticky top-0">
            <tr>
              <th class="px-3 py-2">Nama Tagihan</th>
              <th class="px-3 py-2">Tipe</th>
              <th class="px-3 py-2 text-right">Nominal</th>
              <th class="px-3 py-2 text-center w-16">Aksi</th>
            </tr>
          </thead>
          <tbody id="sikas-master-list" class="divide-y divide-gray-50 text-xs">
            <tr><td colspan="4" class="text-center py-8 text-[#8fa3c0] italic">Memuat master tagihan...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <!-- Generate Tagihan Massal -->
    <section class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 bg-[#f4f6fb]/60 flex items-center gap-3">
        <div class="w-9 h-9 bg-[#e8ecf4] rounded-xl flex items-center justify-center text-[#152238] border border-[#d0d8e8]">
          <i class="fas fa-layer-group text-sm"></i>
        </div>
        <div>
          <h3 class="font-bold text-[#1b2a4a] text-sm">Generate Tagihan Massal</h3>
          <p class="text-xs text-[#5b7aaa]">Buat tagihan otomatis untuk banyak bulan / siswa</p>
        </div>
      </div>
      <form id="sikas-bulk-form" class="p-5 space-y-4" onsubmit="event.preventDefault(); sikasSubmitBulkGeneration();">
        <div class="space-y-1.5">
          <label class="text-xs font-bold uppercase tracking-wider text-[#5b7aaa] block">Pilih Target Siswa</label>
          <div class="relative">
            <input type="text" id="sikas-bulk-target-input" autocomplete="off" placeholder="Ketik nama/kelas siswa..."
              class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-sm font-medium text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] transition-all"
              onfocus="sikasBulkTargetShow()" oninput="sikasBulkTargetShow()" onblur="setTimeout(function(){document.getElementById('sikas-bulk-target-dd').classList.add('hidden');},150)">
            <input type="hidden" id="sikas-bulk-target" value="Semua Siswa">
            <div id="sikas-bulk-target-dd" class="hidden absolute z-30 left-0 right-0 mt-1 bg-white border border-[#d0d8e8] rounded-xl shadow-lg max-h-48 overflow-y-auto"></div>
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-bold uppercase tracking-wider text-[#5b7aaa] block">Pilih Jenis Tagihan</label>
          <select id="sikas-bulk-jenis" onchange="sikasAutoFillNominal()" required class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-sm font-medium text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] transition-all outline-none cursor-pointer">
            <option value="" disabled selected>-- Pilih Tagihan --</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase tracking-wider text-[#5b7aaa] block">Nominal (Rp)</label>
            <input id="sikas-bulk-nominal" type="number" required placeholder="0" class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-sm font-medium focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] transition-all">
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-bold uppercase tracking-wider text-[#5b7aaa] block">Durasi (Bulan)</label>
            <input id="sikas-bulk-durasi" type="number" value="1" min="1" required class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-sm font-medium focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] transition-all">
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-bold uppercase tracking-wider text-[#5b7aaa] block">Mulai Jatuh Tempo</label>
          <input id="sikas-bulk-jatuh" type="date" required class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-sm font-medium focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] transition-all cursor-pointer">
        </div>
        <button type="submit" class="w-full flex justify-center items-center gap-2 py-3 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold text-sm rounded-xl shadow transition-all active:scale-95">
          <i class="fas fa-magic"></i> Buat Tagihan Sekarang
        </button>
      </form>
    </section>
  </div>
</div>
<!-- Master Tagihan Modal -->
<div id="sikas-master-modal" class="hidden fixed inset-0 z-[120] items-center justify-center bg-gray-900/50 p-4">
  <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
    <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-[#f4f6fb]/50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#e8ecf4] text-[#152238] flex items-center justify-center border border-[#d0d8e8]"><i class="fas fa-database text-base"></i></div>
        <div><h3 id="sikas-master-title" class="font-bold text-sm text-[#1b2a4a]">Tambah Master Tagihan</h3><p class="text-xs text-[#5b7aaa]">Buat template tagihan baru</p></div>
      </div>
      <button onclick="sikasCloseMasterModal()" class="text-[#8fa3c0] hover:text-[#3d5478] transition-colors w-8 h-8 rounded-lg hover:bg-[#e8ecf4] flex items-center justify-center"><i class="fas fa-times"></i></button>
    </div>
    <div class="p-6 space-y-4 bg-white">
      <input type="hidden" id="sikas-master-id" value="">
      <div class="space-y-1.5">
        <label class="text-[10px] font-bold uppercase tracking-wider text-[#5b7aaa] block">Nama Tagihan</label>
        <input id="sikas-master-nama" type="text" placeholder="Contoh: SPP Bulanan" class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-xs font-semibold text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#a0b0cc] transition-all">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-[#5b7aaa] block">Tipe Tagihan</label>
          <select id="sikas-master-tipe" class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-xs font-semibold text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#a0b0cc] transition-all outline-none cursor-pointer">
            <option value="Bulanan">Bulanan</option>
            <option value="Tahunan">Tahunan</option>
            <option value="Sekali">Sekali Bayar</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-[#5b7aaa] block">Nominal Default (Rp)</label>
          <input id="sikas-master-nominal" type="number" placeholder="0" class="w-full px-4 py-2.5 bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#a0b0cc] transition-all">
        </div>
      </div>
    </div>
    <div class="p-4 bg-[#f4f6fb] flex gap-3 border-t border-gray-100">
      <button onclick="sikasCloseMasterModal()" class="flex-1 py-2.5 bg-white border border-[#d0d8e8] text-[#152238] font-bold rounded-xl hover:bg-[#f4f6fb] transition-all shadow-sm">Batal</button>
      <button onclick="sikasSaveMaster()" class="flex-1 py-2.5 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold rounded-xl shadow transition-all active:scale-95">Simpan Master</button>
    </div>
  </div>
</div>

<!-- Receipt Modal -->
<div id="sikas-receipt-modal" class="hidden fixed inset-0 z-[120] items-center justify-center bg-gray-900/50 p-4">
  <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
    <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f4f6fb]/50 receipt-modal-head">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><i class="fas fa-check-circle"></i></div>
        <div><h3 class="font-bold text-sm text-[#1b2a4a]">Pembayaran Berhasil</h3><p class="text-xs text-[#5b7aaa]">Kwitansi dapat dicetak sebagai bukti sah</p></div>
      </div>
      <button onclick="sikasCloseReceipt()" class="text-[#8fa3c0] hover:text-[#3d5478] transition-colors w-8 h-8 rounded-lg hover:bg-[#e8ecf4] flex items-center justify-center"><i class="fas fa-times"></i></button>
    </div>
    <div class="p-6 overflow-y-auto bg-[#f4f6fb]">
      <div class="receipt-card mx-auto w-full max-w-[340px] bg-white shadow-md rounded-xl overflow-hidden border border-gray-300 text-gray-800">
        <!-- Kop Kwitansi -->
        <div class="receipt-head bg-white px-5 py-4 text-center border-b-2 border-dashed border-gray-400">
          <h4 class="text-black font-bold text-sm uppercase tracking-wide leading-tight">Kwitansi Pembayaran</h4>
          <p class="text-gray-500 text-[10px] mt-0.5">Sistem Administrasi Sekolah &middot; SIKAS</p>
          <p class="text-gray-500 text-[8px] font-bold uppercase tracking-widest">No. Resi</p>
          <p id="sikas-receipt-resi" class="text-black text-[11px] font-bold font-mono">TRX-XXX</p>
        </div>
        <!-- Isi Kwitansi -->
        <div class="px-5 py-4 text-xs">
          <div class="space-y-1.5 pb-3 border-b border-dashed border-gray-300">
            <div class="flex justify-between gap-2"><span class="text-gray-500 w-20 shrink-0">Tanggal</span><span id="sikas-receipt-tanggal" class="font-semibold text-right">-</span></div>
            <div class="flex justify-between gap-2"><span class="text-gray-500 shrink-0">NISN</span><span id="sikas-receipt-nisn" class="font-mono font-semibold">-</span></div>
            <div class="flex justify-between gap-2"><span class="text-gray-500 shrink-0">Nama Siswa</span><span id="sikas-receipt-nama" class="font-bold uppercase text-right">-</span></div>
          </div>
          <div class="py-3 border-b border-dashed border-gray-300">
            <p class="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Rincian Pembayaran</p>
            <div class="flex justify-between gap-2 items-baseline">
              <span id="sikas-receipt-kategori" class="font-semibold">-</span>
              <span id="sikas-receipt-nominal" class="font-mono font-bold">-</span>
            </div>
          </div>
          <div class="py-3 space-y-1.5 border-b border-dashed border-gray-300">
            <div class="flex justify-between items-center bg-gray-100 rounded-lg px-3 py-2">
              <span class="text-[10px] font-bold uppercase tracking-wider">Total Bayar</span>
              <span id="sikas-receipt-total" class="font-bold text-sm">-</span>
            </div>
            <div class="flex justify-between gap-2 px-1"><span class="text-gray-500">Metode: <span id="sikas-receipt-metode" class="font-semibold text-gray-800">TUNAI</span></span><span>Dibayar: <span id="sikas-receipt-bayar" class="font-mono font-semibold">-</span></span></div>
            <div class="flex justify-between gap-2 px-1"><span class="text-gray-500">Kembalian</span><span id="sikas-receipt-kembali" class="font-mono font-semibold">-</span></div>
          </div>
          <!-- Area Tanda Tangan -->
          <div class="pt-4 flex justify-end">
            <div class="h-14 w-40 border border-gray-300 rounded-md bg-white"></div>
          </div>
        </div>
        <!-- Footer -->
        <div class="bg-white border-t border-dashed border-gray-300 px-5 py-2.5 text-center">
          <p class="text-[9px] text-gray-400 tracking-wide">&mdash;&nbsp; Terima kasih &middot; Dokumen ini sah sebagai bukti pembayaran &middot; &mdash;</p>
        </div>
      </div>
    </div>
    <div class="receipt-actions p-4 bg-[#f4f6fb] flex gap-3 border-t border-gray-100">
      <button onclick="sikasPrintReceipt('a6')" class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-[#d0d8e8] text-[#152238] font-bold rounded-xl hover:bg-[#f4f6fb] transition-all shadow-sm"><i class="fas fa-file-alt text-[#5b7aaa]"></i>Cetak A6</button>
      <button onclick="sikasPrintReceipt('thermal')" class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold rounded-xl shadow transition-all active:scale-95"><i class="fas fa-print"></i>Cetak Termal</button>
    </div>
  </div>
</div>`;

  area.insertAdjacentHTML('beforeend', viewsHTML);

  // Method payment click handling
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.sikas-pay-method');
    if (!btn) return;
    document.querySelectorAll('.sikas-pay-method').forEach(function (b) {
      b.className = 'sikas-pay-method px-2 py-2 border-2 border-[#d0d8e8] bg-white hover:border-[#1b2a4a] rounded-lg flex flex-col items-center gap-0.5 transition-all text-[#3d5478]';
    });
    btn.className = 'sikas-pay-method active px-2 py-2 border-2 border-[#1b2a4a] bg-[#e8ecf4] rounded-lg flex flex-col items-center gap-0.5 transition-all text-[#0f1d35] font-bold';
  });
}

// ---------- Navigation helpers ----------
