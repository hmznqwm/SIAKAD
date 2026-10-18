<div id="view-manajemen-kelas" class="view-section animate-fade-in hidden">

  <!-- ── Header ── -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h3 class="font-bold text-base text-gray-800">Manajemen Kelas</h3>
        <p class="text-sm text-gray-500 mt-0.5">Data kelas siswa</p>
      </div>
      <button onclick="mkOpenTambahKelasModal()" id="btnBukaTambahKelas"
        class="inline-flex items-center justify-center gap-2 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 w-full sm:w-auto shrink-0">
        <i class="fas fa-plus text-xs"></i> Tambah Kelas
      </button>
  </div>

  <!-- ── Panel Daftar Kelas (full width) ── -->
  <div id="mkPanelWrapper">
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

    <!-- Header + search -->
    <div class="px-4 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p class="text-sm font-bold text-gray-800">Daftar Kelas</p>
      <div class="relative w-full sm:w-52">
        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
        <input type="text" id="mkSearchKelas" placeholder="Cari kelas…"
          oninput="mkFilterKelas()"
          class="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8] outline-none transition" autocomplete="off">
      </div>
    </div>

    <!-- List -->
    <div id="mkKelasList" class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-y-auto" style="max-height:62vh;">
      <div class="col-span-full text-center py-12 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-2xl mb-3 block"></i>
        <p class="text-sm">Memuat data kelas…</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
      <span id="mkInfoKelas" class="text-[10px] text-gray-400 font-medium"></span>
      <span class="text-[10px] text-gray-300">Sheet: "kelas"</span>
    </div>
  </div>
  </div>

</div>
