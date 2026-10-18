<div id="view-data-inventaris" class="view-section animate-fade-in">
  <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
      <div class="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h3 class="font-bold text-base text-gray-800">Data Inventaris Madrasah</h3>
            <p class="text-sm text-gray-500 mt-0.5">Daftar barang / aset inventaris madrasah.</p>
        </div>
        <div class="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            <button id="btnBulkDeleteInventaris" onclick="bulkDeleteInventaris()" class="hidden col-span-2 sm:col-span-1 items-center justify-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-red-700 transition whitespace-nowrap">
                <i class="fas fa-trash-alt"></i> <span>Hapus Massal (<span class="bulk-count">0</span>)</span>
            </button>
            <button onclick="downloadTemplate('inventaris')"
              class="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
              title="Download Template Excel">
                <i class="fas fa-download text-[#1b2a4a]"></i>
                <span>Template</span>
            </button>
            <button onclick="triggerImportInventaris()"
              class="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap">
                <i class="fas fa-file-excel text-[#1b2a4a]"></i>
                <span>Import</span>
            </button>
            <input type="file" id="fileInputInventaris" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleFileImportInventaris(this)" autocomplete="off">
            <button onclick="showAddInventarisModal()"
              class="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-[#1b2a4a] hover:bg-[#152238] text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow whitespace-nowrap">
                <i class="fas fa-plus"></i>
                <span>Tambah</span>
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
              <input type="text" oninput="handleTableSearch('inventaris', this.value)" class="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:ring-[#1b2a4a] focus:border-[#1b2a4a] block w-full pl-10 p-2" placeholder="Cari Nama / Kode Barang..." autocomplete="off">
          </div>
      </div>
      <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold">
                <tr>
                    <th class="p-3 text-center w-10 hidden md:table-cell"><input type="checkbox" id="checkAllInventaris" onchange="toggleSelectAllInventaris(this)" class="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" autocomplete="off"></th>
                    <th class="p-3 text-center w-10">No</th>
                    <th class="p-3 min-w-[150px]">Nama Barang</th>
                    <th class="p-3 min-w-[120px]">Kode Barang</th>
                    <th class="p-3 min-w-[110px]">Kategori</th>
                    <th class="p-3 text-center min-w-[80px]">Jumlah</th>
                    <th class="p-3 min-w-[100px]">Kondisi</th>
                    <th class="p-3 min-w-[120px]">Lokasi</th>
                    <th class="p-3 text-center min-w-[90px]">Aksi</th>
                </tr>
            </thead>
              <tbody id="tbody-inventaris" class="divide-y divide-gray-50 bg-white text-xs">
                  </tbody>
          </table>
      </div>
      <div id="footer-inventaris" class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
          <span id="info-inventaris"></span>
          <div class="tbl-pagination-controls">
                                          <select onchange="handleTableLimit('inventaris', this.value)" class="tbl-select">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="all">Semua</option>
                            </select>
              
              <button onclick="changePage('inventaris', -1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition" id="btn-prev-inventaris">Prev</button>
              <button onclick="changePage('inventaris', 1)" class="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition" id="btn-next-inventaris">Next</button>
          </div>
      </div>
  </div>
</div>

