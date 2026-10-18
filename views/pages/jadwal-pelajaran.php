<div id="view-manajemen-mapel" class="view-section animate-fade-in hidden">
  <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="p-4 md:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <h3 class="font-bold text-base text-gray-800 flex items-center gap-2">
           Jadwal Pelajaran
        </h3>
        <p class="text-sm text-gray-500 mt-0.5">Catatan jadwal pelajaran siswa per kelas.</p>
      </div>

      <!-- Button + Filter Area -->
      <div class="w-full sm:w-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:justify-end">

        <!-- Filter Kelas - full width di HP -->
        <select id="filterKelasJadwal" class="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-xs rounded-xl px-3 py-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
          <option value="">Semua Kelas</option>
        </select>

        <!-- Hapus Massal - full width saat muncul -->
        <button id="btnBulkDeleteJadwal" onclick="bulkDeleteJadwal()" class="hidden w-full sm:w-auto bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-red-700 transition flex items-center justify-center gap-1.5">
          <i class="fas fa-trash-alt"></i> Hapus Massal (<span class="bulk-count">0</span>)
        </button>

        <!-- Template & Import: 2 kolom -->
        <div class="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          <button onclick="downloadTemplateJadwal()" class="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap">
            <i class="fas fa-download text-[#1b2a4a]"></i> Template
          </button>
          <button onclick="triggerImportJadwal()" class="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap">
            <i class="fas fa-file-excel text-[#1b2a4a]"></i> Import
          </button>
          <input type="file" id="fileInputJadwal" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleFileImportJadwal(this)" autocomplete="off">

          <!-- Tambah: full baris bawah di HP -->
          <button onclick="openJadwalFormModal('add')" class="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-[#1b2a4a] hover:bg-[#152238] text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow whitespace-nowrap">
            <i class="fas fa-plus"></i> Tambah
          </button>
        </div>

      </div>
    </div>
    <div id="jadwalDesktopTable" class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold border-b border-gray-200">
          <tr>
            <th class="p-1.5 md:p-3 text-center w-8 md:w-10 hidden md:table-cell">
              <input type="checkbox" id="checkAllJadwal" onchange="toggleSelectAllJadwal(this)" class="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" autocomplete="off">
            </th>
            <th class="p-1.5 md:p-3 text-center w-8 md:w-12">No</th>
            <th class="p-1.5 md:p-3">Hari</th>
            <th class="p-1.5 md:p-3">Nama Mapel</th>
            <th class="p-1.5 md:p-3">Pengajar</th>
            <th class="p-1.5 md:p-3">Jam Mulai</th>
            <th class="p-1.5 md:p-3">Jam Selesai</th>
            <th class="p-1.5 md:p-3">Kelas</th>
            <th class="p-1.5 md:p-3 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody id="tbody-jadwal" class="divide-y divide-gray-50 bg-white text-sm">
          <tr>
            <td colspan="9" class="p-8 text-center text-gray-400">
              <i class="fas fa-circle-notch fa-spin mr-2"></i> Memuat data...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="jadwalMobileCards" class="p-3 space-y-2.5 bg-gray-50/50 dark:bg-gray-900/20"></div>
    <div class="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
      <span id="info-jadwal"></span>
    </div>
  </div>
</div>
