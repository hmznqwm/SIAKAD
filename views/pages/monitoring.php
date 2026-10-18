<div id="view-monitoring" class="view-section animate-fade-in">
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 class="font-bold text-base text-gray-800">Monitoring Kehadiran</h3>
                <p class="text-sm text-gray-500 mt-0.5">Data Realtime: <span id="monitoringDate" class="text-[#152238] font-bold">...</span></p>
            </div>
            <div class="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <input type="date" id="exportMonStart" class="text-sm border-none focus:ring-0 text-gray-600 font-bold bg-transparent cursor-pointer" title="Tanggal Mulai" autocomplete="off">
                    <span class="text-gray-400 text-xs">—</span>
                    <input type="date" id="exportMonEnd" class="text-sm border-none focus:ring-0 text-gray-600 font-bold bg-transparent cursor-pointer" title="Tanggal Akhir" autocomplete="off">
                </div>
            </div>
        </div>
        <div class="tbl-toolbar">
            <div class="tbl-toolbar-left">
                <select onchange="handleTableStatusFilter('monitoring', this.value)" class="tbl-select" style="font-weight:700">
                    <option value="">Semua Status</option>
                    <option value="Hadir">Hadir</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpa">Alpa</option>
                    <option value="Belum Absen">Belum Absen</option>
                </select>
                <select id="filterKelasMonitoring" onchange="handleTableClassFilter('monitoring', this.value)" class="tbl-select" style="min-width:100px;font-weight:700">
                    <option value="">Semua Kelas</option>
                </select>
                <select id="filterMapelMonitoring" onchange="handleTableMapelFilter('monitoring', this.value)" class="tbl-select" style="min-width:100px;font-weight:700">
                    <option value="">Semua Mapel</option>
                </select>
            </div>
            <div class="tbl-toolbar-right">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fas fa-search text-gray-400 text-xs"></i>
                </div>
                <input type="text" oninput="handleTableSearch('monitoring', this.value)" class="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block w-full pl-10 p-2 transition-all" placeholder="Cari Nama / Kelas..." autocomplete="off">
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold">
                  <tr>
                      <th class="p-4 text-center w-10">No</th>
                      <th class="p-4">Siswa</th>
                      <th class="p-4 text-center">Kelas</th>
                      <th id="thMonMapel" class="p-4 text-center hidden">Mata Pelajaran</th>
                      <th id="thMonJamDatang" class="p-4 text-center">Jam Datang</th>
                      <th id="thMonJamPulang" class="p-4 text-center">Jam Pulang</th>
                      <th class="p-4 text-center">Keterangan Waktu</th>
                      <th class="p-4 text-center">Status Kehadiran</th>
                  </tr>
              </thead>
              <tbody id="tbody-monitoring" class="divide-y divide-gray-50 bg-white text-sm">
                  </tbody>
            </table>
        </div>
        <div id="footer-monitoring" class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
            <span id="info-monitoring"></span>
            <div class="tbl-pagination-controls">
                                          <select onchange="handleTableLimit('monitoring', this.value)" class="tbl-select">
                                  <option value="10">10</option>
                                  <option value="25">25</option>
                                  <option value="50">50</option>
                                  <option value="all">Semua</option>
                              </select>
              
                <button onclick="changePage('monitoring', -1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition" id="btn-prev-monitoring">Prev</button>
                <button onclick="changePage('monitoring', 1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition" id="btn-next-monitoring">Next</button>
            </div>
        </div>
    </div>
</div>
