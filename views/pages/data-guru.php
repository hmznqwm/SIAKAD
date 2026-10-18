<div id="view-profil-guru" class="view-section animate-fade-in">
  <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
      <div class="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h3 class="font-bold text-base text-gray-800">Data Guru</h3>
            <p class="text-sm text-gray-500 mt-0.5">Data dan profil guru.</p>
        </div>
        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:justify-end">
            <button id="btnBulkDeleteProfilGuru" onclick="bulkDeleteProfilGuru()" class="hidden col-span-2 sm:col-span-1 min-w-0 bg-red-600 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:bg-red-700 transition flex items-center justify-center gap-1.5 whitespace-nowrap">
                <i class="fas fa-trash-alt shrink-0"></i> <span class="truncate">Hapus Massal (<span class="bulk-count">0</span>)</span>
            </button>
            <button onclick="downloadTemplate('guruprofil')"
              class="min-w-0 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm whitespace-nowrap"
              title="Download Template Excel">
                <i class="fas fa-download text-[#1b2a4a] shrink-0"></i>
                <span class="truncate">Template</span>
            </button>
            <button onclick="triggerImportProfilGuru()"
              class="min-w-0 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm whitespace-nowrap">
                <i class="fas fa-file-excel text-[#1b2a4a] shrink-0"></i>
                <span class="truncate">Import</span>
            </button>
            <input type="file" id="fileInputProfilGuru" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleFileImportProfilGuru(this)" autocomplete="off">
            <button onclick="showAddProfilGuruModal()"
              class="col-span-2 sm:col-span-1 min-w-0 flex items-center justify-center gap-1.5 bg-[#1b2a4a] hover:bg-[#152238] text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow whitespace-nowrap">
                <i class="fas fa-plus shrink-0"></i>
                <span class="truncate">Tambah</span>
            </button>
        </div>
      </div>
      <div class="tbl-toolbar">
          <div class="tbl-toolbar-left">
          </div>
          <div class="tbl-toolbar-right">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-search text-gray-400 text-xs"></i>
              </div>
              <input type="text" oninput="handleTableSearch('guruprofil', this.value)" class="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-[#5b7aaa] focus:border-[#1b2a4a] block w-full pl-10 p-2" placeholder="Cari Nama / NIP..." autocomplete="off">
          </div>
      </div>
      <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold border-b border-gray-200">
                <tr>
                    <th class="p-3 text-center w-10 hidden md:table-cell"><input type="checkbox" id="checkAllProfilGuru" onchange="toggleSelectAllProfilGuru(this)" class="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" autocomplete="off"></th>
                    <th class="p-3 text-center w-10">No</th>
                    <th class="p-3">Nama Lengkap</th>
                    <th class="p-3 hidden sm:table-cell">Jabatan</th>
                    <th class="p-3 hidden md:table-cell">Mata Pelajaran</th>
                    <th class="p-3 hidden lg:table-cell">Status</th>
                    <th class="p-3 text-center">Aksi</th>
                </tr>
            </thead>
              <tbody id="tbody-guruprofil" class="divide-y divide-gray-50 bg-white text-xs text-gray-700">
                  </tbody>
          </table>
      </div>
      <div id="footer-guruprofil" class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
          <span id="info-guruprofil"></span>
          <div class="tbl-pagination-controls">
                                          <select onchange="handleTableLimit('guruprofil', this.value)" class="tbl-select">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="all">Semua</option>
                            </select>
              
              <button onclick="changePage('guruprofil', -1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition" id="btn-prev-guruprofil">Prev</button>
              <button onclick="changePage('guruprofil', 1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition" id="btn-next-guruprofil">Next</button>
          </div>
      </div>
  </div>
</div>
