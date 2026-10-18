<div id="view-kelola-absen" class="view-section animate-fade-in">

  <!-- Header ringkas + tab switcher -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
    <div>
      <h2 class="text-base font-bold text-gray-800">Kelola Absensi</h2>
      <p class="text-xs text-gray-400 mt-0.5">Pengaturan jam masuk & hari libur</p>
    </div>
    <div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-fit">
      <button onclick="kaTab('waktu')" id="ka-tab-waktu"
        class="flex-1 sm:flex-none text-center px-4 py-2 text-xs font-bold rounded-lg bg-[#1b2a4a] text-white shadow transition-all whitespace-nowrap">
        Jam Masuk
      </button>
      <button onclick="kaTab('libur')" id="ka-tab-libur"
        class="flex-1 sm:flex-none text-center px-4 py-2 text-xs font-bold rounded-lg text-gray-500 hover:text-gray-700 transition-all whitespace-nowrap">
        Hari Libur
      </button>
    </div>
  </div>

  <!-- Panel: Pengaturan Waktu -->
  <div id="ka-panel-waktu">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-[#e8ecf4] rounded-lg flex items-center justify-center">
            <i class="fas fa-clock text-[#1b2a4a] text-sm"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-gray-800">Pengaturan Jam Masuk</p>
            <p class="text-[11px] text-gray-400">Konfigurasi per hari aktif</p>
          </div>
        </div>
        <span id="autosaveStatusConfig" class="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 transition-opacity duration-300 opacity-0">
          <i class="fas fa-check-circle text-green-500"></i> Tersimpan
        </span>
      </div>
      <div class="p-4">
        <form id="form-global-config" onsubmit="return false;">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="jadwal-hari-container">
            <div class="col-span-2 text-center py-8 text-gray-400 text-xs">
              <i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat jadwal...
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Panel: Hari Libur -->
  <div id="ka-panel-libur" class="hidden">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      <!-- Header -->
      <div class="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
            <i class="fas fa-calendar-times text-amber-500 text-sm"></i>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-gray-800">Daftar Hari Libur</p>
            <p class="text-[11px] text-gray-400">Siswa tidak bisa absen pada tanggal ini</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <button onclick="downloadTemplateLibur()"
            class="flex-1 sm:flex-none justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm" title="Download Template Excel">
            <i class="fas fa-download text-[#1b2a4a]"></i> Template
          </button>
          <button onclick="triggerImportLibur()"
            class="flex-1 sm:flex-none justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
            <i class="fas fa-file-excel text-[#1b2a4a]"></i> Import Excel
          </button>
        </div>
        <input type="file" id="fileInputLibur" accept=".xlsx, .xls, .csv" class="hidden" onchange="handleFileImportLibur(this)" autocomplete="off">
      </div>

      <!-- Form tambah - kompak 1 baris di layar lebar, ditumpuk vertikal di HP -->
      <div class="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
        <form onsubmit="handleAddLibur(event)">
          <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
            <div class="flex flex-col gap-1 w-full sm:w-auto">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mulai</label>
              <input type="date" name="tanggal_mulai" id="input-libur-mulai" required
                class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#a0b0cc] outline-none transition w-full sm:w-auto"
                onchange="updatePreviewLibur()" autocomplete="off">
            </div>
            <div class="flex flex-col gap-1 w-full sm:w-auto">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Akhir</label>
              <input type="date" name="tanggal_akhir" id="input-libur-akhir" required
                class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#a0b0cc] outline-none transition w-full sm:w-auto"
                onchange="updatePreviewLibur()" autocomplete="off">
            </div>
            <div class="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[160px]">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Keterangan</label>
              <input type="text" name="keterangan" required placeholder="cth: Maulid Nabi, Libur Semester..."
                class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#a0b0cc] focus:bg-white outline-none transition w-full" autocomplete="off">
            </div>
            <button type="submit"
              class="bg-[#1b2a4a] hover:bg-[#152238] text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 w-full sm:w-auto sm:shrink-0">
              <i class="fas fa-plus"></i> Tambah
            </button>
          </div>
          <div id="preview-libur" class="hidden mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
            <i class="fas fa-calendar-alt text-amber-500"></i>
            <span id="preview-libur-text"></span>
          </div>
        </form>
      </div>

      <!-- Tabel -->
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-gray-50 text-gray-400 text-[10px] uppercase font-semibold">
            <tr>
              <th class="px-2 sm:px-4 py-3 w-8 sm:w-10 text-center">No</th>
              <th class="px-2 sm:px-4 py-3">Tanggal</th>
              <th class="px-2 sm:px-4 py-3">Keterangan</th>
              <th class="px-2 sm:px-4 py-3 text-center w-14 sm:w-16">Aksi</th>
            </tr>
          </thead>
          <tbody id="tbody-libur" class="divide-y divide-gray-50 text-sm"></tbody>
        </table>
      </div>

      <!-- Footer -->
      <div id="footer-libur" class="px-4 py-3 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center text-xs text-gray-500">
        <span id="info-libur" class="font-medium"></span>
        <div class="flex gap-1.5">
          <button onclick="changePage('libur', -1)" id="btn-prev-libur"
            class="inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-40">
            <i class="fas fa-chevron-left text-[9px]"></i> Prev
          </button>
          <button onclick="changePage('libur', 1)" id="btn-next-libur"
            class="inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-40">
            Next <i class="fas fa-chevron-right text-[9px]"></i>
          </button>
        </div>
      </div>

    </div>
  </div>


</div>
