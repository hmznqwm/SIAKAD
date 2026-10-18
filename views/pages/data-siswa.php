<div id="view-data-siswa" class="view-section animate-fade-in">
  <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
      <div class="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h3 class="font-bold text-base text-gray-800">Direktori Siswa</h3>
            <p class="text-sm text-gray-500 mt-0.5">Kelola data siswa, kelas, dan cetak kartu.</p>
        </div>
        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:justify-end">
            <button id="btnBulkDeleteSiswa" onclick="bulkDeleteSiswa()" class="hidden col-span-2 sm:col-span-1 bg-red-600 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:bg-red-700 transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap">
                <i class="fas fa-trash-alt"></i> Hapus Massal (<span class="bulk-count">0</span>)
            </button>
            <button onclick="downloadTemplate('siswa')" class="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap" title="Download Template Excel">
                <i class="fas fa-download text-[#1b2a4a]"></i> Template
            </button>
            <button onclick="downloadKartuSiswaBulk()" class="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap">
                <i class="fas fa-id-card text-purple-600"></i> Cetak Kartu
            </button>
            <button onclick="triggerImportSiswa()" class="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm whitespace-nowrap">
                <i class="fas fa-file-excel text-[#1b2a4a]"></i> Import
            </button>
            <input type="file" id="fileInputSiswa" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleFileImportSiswa(this)" autocomplete="off">
            <button onclick="showAddSiswaModal()" class="bg-[#1b2a4a] hover:bg-[#152238] text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 shadow whitespace-nowrap">
                <i class="fas fa-plus"></i> Tambah
            </button>
        </div>
      </div>
      <div class="tbl-toolbar">
          <div class="tbl-toolbar-left">
              <select id="filterKelasSiswa" onchange="handleTableClassFilter('siswa', this.value)" class="tbl-select" style="min-width:110px;font-weight:700">
                  <option value="">Semua Kelas</option>
              </select>
          </div>
          <div class="tbl-toolbar-right">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-search text-gray-400 text-xs"></i>
              </div>
              <input type="text" name="cari_siswa_kotak" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other" oninput="handleTableSearch('siswa', this.value)" class="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block w-full pl-10 p-2 transition-all" placeholder="Cari Nama / Id...">
          </div>
      </div>
      <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold border-b border-gray-200">
                  <tr>
                      <th class="p-3 text-center w-10 hidden md:table-cell"><input type="checkbox" id="checkAllSiswa" onchange="toggleSelectAllSiswa(this)" class="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" autocomplete="off"></th>
                      <th class="p-3 text-center w-12">No</th>
                      <th class="p-3">Nama Lengkap</th>
                      <th class="p-3 hidden md:table-cell">Id</th>
                      <th class="p-3 hidden sm:table-cell">Kelas</th>
                      <th class="p-3 text-center w-28 md:w-40">Aksi</th>
                  </tr>
              </thead>
              <tbody id="tbody-siswa" class="divide-y divide-gray-50 bg-white text-xs text-gray-700">
                  </tbody>
          </table>
      </div>
      <div id="footer-siswa" class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
          <span id="info-siswa"></span>
          <div class="tbl-pagination-controls">
                                          <select onchange="handleTableLimit('siswa', this.value)" class="tbl-select">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="all">Semua</option>
                            </select>
              
              <button onclick="changePage('siswa', -1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition shadow-sm" id="btn-prev-siswa">Prev</button>
              <button onclick="changePage('siswa', 1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition shadow-sm" id="btn-next-siswa">Next</button>
          </div>
      </div>
  </div>
</div>
