<div id="view-rekap-absensi" class="view-section animate-fade-in">
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-5 border-b border-gray-100 bg-gray-50/50">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                    <h3 class="font-bold text-sm text-gray-800">Laporan Kehadiran</h3>
                    <p id="rekapSubtitle" class="text-xs text-gray-500">Rekap data absensi siswa berdasarkan periode.</p>
                </div>
            </div>
            <div class="flex gap-2 mb-4">
                <button id="tabRekapSiswa" onclick="switchRekapTab('siswa')" class="px-4 py-2 rounded-lg text-xs font-bold transition bg-[#1b2a4a] text-white shadow-md">
                    <i class="fas fa-user-graduate mr-1"></i> Siswa
                </button>
                <button id="tabRekapGuru" onclick="switchRekapTab('guru')" class="px-4 py-2 rounded-lg text-xs font-bold transition bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
                    <i class="fas fa-chalkboard-teacher mr-1"></i> Guru
                </button>
            </div>
            <div class="flex flex-col md:flex-row gap-3 items-end bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div class="w-full md:flex-1">
                   <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Dari Tanggal</label>
                   <input type="date" id="fStart" class="w-full border-gray-300 rounded-lg text-xs p-2.5 focus:ring-[#5b7aaa] focus:border-[#1b2a4a]" autocomplete="off">
                </div>
                <div class="w-full md:flex-1">
                   <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Sampai Tanggal</label>
                   <input type="date" id="fEnd" class="w-full border-gray-300 rounded-lg text-xs p-2.5 focus:ring-[#5b7aaa] focus:border-[#1b2a4a]" autocomplete="off">
                </div>
                <div class="w-full md:flex-1" id="wrapFilterKelasRekap">
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Filter Kelas</label>
                    <select id="fKelasRekap" class="w-full border-gray-300 rounded-lg text-xs p-2.5 focus:ring-[#5b7aaa] focus:border-[#1b2a4a] bg-white">
                        <option value="">Semua Kelas</option>
                        </select>
                </div>
                <div class="w-full md:flex-1 hidden" id="wrapFilterJabatanRekap">
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Filter Jabatan</label>
                    <select id="fJabatanRekap" class="w-full border-gray-300 rounded-lg text-xs p-2.5 focus:ring-[#5b7aaa] focus:border-[#1b2a4a] bg-white">
                        <option value="">Semua Jabatan</option>
                        </select>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <button onclick="applyFilter()" class="flex-1 md:flex-none bg-[#1b2a4a] text-white px-5 py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-[#152238] transition transform active:scale-95 flex items-center justify-center gap-2">
                        <i class="fas fa-search"></i> Cari Data
                    </button>
                    <button onclick="exportToExcel()" id="btnExportExcel" class="flex-1 md:flex-none bg-[#1b2a4a] text-white px-5 py-2.5 rounded-lg font-bold text-xs shadow-md hover:bg-[#152238] transition transform active:scale-95 flex items-center justify-center gap-2">
                        <i class="fas fa-file-excel"></i> Export Excel
                    </button>
                </div>
            </div>
        </div>
        <div id="rekapContainer" class="hidden">
            <div class="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex items-center gap-2 text-xs">
                    <select onchange="handleTableLimit('rekap', this.value)" class="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block p-2">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="all">Semua</option>
                    </select>
                </div>
                <div class="relative w-full md:w-64">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fas fa-search text-gray-400 text-xs"></i>
                    </div>
                    <input type="text" oninput="handleTableSearch('rekap', this.value)" class="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block w-full pl-10 p-2" placeholder="Cari Siswa / Kelas..." autocomplete="off">
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold">
                      <tr>
                          <th class="p-4 text-center w-10">No</th>
                          <th class="p-4">Tanggal</th>
                          <th class="p-4">Nama Siswa</th>
                          <th class="p-4 text-center">Kelas</th>
                          <th class="p-4 text-center">Jam Datang</th>
                          <th class="p-4 text-center">Jam Pulang</th>
                          <th class="p-4 text-center">Keterangan Waktu</th>
                          <th class="p-4 text-center">Status</th>
                      </tr>
                  </thead>
                    <tbody id="tbody-rekap" class="bg-white divide-y divide-gray-50 text-sm"></tbody>
                </table>
            </div>
            <div id="footer-rekap" class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
                <span id="info-rekap"></span>
                <div class="flex gap-1">
                    <button onclick="changePage('rekap', -1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50" id="btn-prev-rekap">Prev</button>
                    <button onclick="changePage('rekap', 1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50" id="btn-next-rekap">Next</button>
                </div>
            </div>
        </div>
        <div id="rekapGuruContainer" class="hidden">
            <div class="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex items-center gap-2 text-xs">
                    <select onchange="handleTableLimit('rekapGuru', this.value)" class="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block p-2">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="all">Semua</option>
                    </select>
                </div>
                <div class="relative w-full md:w-64">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fas fa-search text-gray-400 text-xs"></i>
                    </div>
                    <input type="text" oninput="handleTableSearch('rekapGuru', this.value)" class="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block w-full pl-10 p-2" placeholder="Cari Guru / Jabatan..." autocomplete="off">
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold">
                      <tr>
                          <th class="p-4 text-center w-10">No</th>
                          <th class="p-4">Tanggal</th>
                          <th class="p-4">Nama Guru</th>
                          <th class="p-4 text-center">NIP</th>
                          <th class="p-4 text-center">Jabatan</th>
                          <th class="p-4 text-center">Jam Datang</th>
                          <th class="p-4 text-center">Jam Pulang</th>
                          <th class="p-4 text-center">Keterangan</th>
                          <th class="p-4 text-center">Status</th>
                      </tr>
                  </thead>
                    <tbody id="tbody-rekapGuru" class="bg-white divide-y divide-gray-50 text-sm"></tbody>
                </table>
            </div>
            <div id="footer-rekapGuru" class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
                <span id="info-rekapGuru"></span>
                <div class="flex gap-1">
                    <button onclick="changePage('rekapGuru', -1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50" id="btn-prev-rekapGuru">Prev</button>
                    <button onclick="changePage('rekapGuru', 1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50" id="btn-next-rekapGuru">Next</button>
                </div>
            </div>
        </div>
        <div id="rekapEmptyState" class="text-center p-16 flex flex-col items-center justify-center">
            <div class="w-20 h-20 bg-[#e8ecf4] rounded-full flex items-center justify-center text-[#b8c4d8] mb-4 text-4xl">
                <i class="fas fa-calendar-alt"></i>
            </div>
            <h4 class="font-bold text-gray-800 text-sm">Menunggu Filter</h4>
            <p class="text-gray-500 text-sm mt-1 max-w-xs mx-auto">Silakan pilih rentang tanggal mulai dan akhir, lalu klik tombol <b>Cari Data</b>.</p>
        </div>
        <div id="rekapLoading" class="hidden text-center p-16 flex flex-col items-center justify-center">
             <div class="w-16 h-16 border-4 border-[#d0d8e8] border-t-blue-500 rounded-full animate-spin mb-4"></div>
             <h4 class="font-bold text-gray-800">Sedang Memproses...</h4>
             <p class="text-gray-500 text-xs mt-1">Mengambil data</p>
        </div>
    </div>
</div>
