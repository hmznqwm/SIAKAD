<div id="view-data-alumni" class="view-section animate-fade-in">
  <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
      <div class="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h3 class="font-bold text-base text-gray-800">Data Alumni</h3>
            <p class="text-sm text-gray-500 mt-0.5">Daftar siswa yang telah lulus beserta tahun kelulusannya.</p>
        </div>
        <div class="flex flex-wrap gap-2 justify-end">
            <button id="btnBulkDeleteAlumni" onclick="bulkDeleteAlumni()" class="hidden bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-red-700 transition flex items-center gap-2">
                <i class="fas fa-trash-alt"></i> Hapus Massal (<span class="bulk-count">0</span>)
            </button>
        </div>
      </div>
      <div class="tbl-toolbar">
          <div class="tbl-toolbar-left">
              <select id="filterTahunAlumni" onchange="handleAlumniYearFilter(this.value)" class="tbl-select" style="min-width:120px;font-weight:700">
                  <option value="">Semua Tahun Lulus</option>
              </select>
          </div>
          <div class="tbl-toolbar-right">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-search text-gray-400 text-xs"></i>
              </div>
              <input type="text" oninput="handleTableSearch('alumni', this.value)" class="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block w-full pl-10 p-2 transition-all" placeholder="Cari Nama / Id..." autocomplete="off">
          </div>
      </div>
      <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold border-b border-gray-200">
                  <tr>
                      <th class="p-3 text-center w-10 hidden md:table-cell"><input type="checkbox" id="checkAllAlumni" onchange="toggleSelectAllAlumni(this)" class="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" autocomplete="off"></th>
                      <th class="p-3 text-center w-12 alumni-no-col">No</th>
                      <th class="p-3">Nama Lengkap</th>
                      <th class="p-3 hidden md:table-cell">Id</th>
                      <th class="p-3 hidden sm:table-cell">Kelas Terakhir</th>
                      <th class="p-3 text-center">Tahun Lulus</th>
                      <th class="p-3 hidden lg:table-cell">Nomor Hp</th>
                      <th class="p-3 text-center w-20">Aksi</th>
                  </tr>
              </thead>
              <tbody id="tbody-alumni" class="divide-y divide-gray-50 bg-white text-xs text-gray-700">
                  </tbody>
          </table>
      </div>
      <div id="footer-alumni" class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
          <span id="info-alumni"></span>
          <div class="tbl-pagination-controls">
                                          <select onchange="handleTableLimit('alumni', this.value)" class="tbl-select">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="all">Semua</option>
                            </select>
              
              <button onclick="changePage('alumni', -1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition shadow-sm" id="btn-prev-alumni">Prev</button>
              <button onclick="changePage('alumni', 1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition shadow-sm" id="btn-next-alumni">Next</button>
          </div>
      </div>
  </div>
</div>
