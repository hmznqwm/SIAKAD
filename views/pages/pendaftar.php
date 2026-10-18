<div id="view-pendaftar" class="view-section animate-fade-in hidden">
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
    <div>
      <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
        <i class="fas fa-user-plus text-[#1b2a4a]"></i> Pendaftaran Siswa Baru
      </h3>
      <p class="text-xs text-gray-500 mt-1">Kelola data calon siswa dari formulir pendaftaran online</p>
    </div>
    <!-- Stats Pills -->
    <div class="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:items-center md:justify-end md:w-auto md:ml-auto shrink-0">
      <span onclick="filterPendaftar('Menunggu')" class="inline-flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1.5 text-[11px] cursor-pointer hover:bg-amber-100 transition whitespace-nowrap" title="Tampilkan yang menunggu">
        <i class="fas fa-hourglass-half text-amber-600 text-[10px]"></i>
        <b class="text-sm font-bold text-amber-700 leading-none" id="statPendaftarMenunggu">0</b>
        <span class="font-bold text-amber-600 uppercase tracking-wider text-[10px]">Menunggu</span>
      </span>
      <span onclick="filterPendaftar('Diterima')" class="inline-flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1.5 text-[11px] cursor-pointer hover:bg-emerald-100 transition whitespace-nowrap" title="Tampilkan yang sudah diterima">
        <i class="fas fa-check text-emerald-600 text-[10px]"></i>
        <b class="text-sm font-bold text-emerald-700 leading-none" id="statPendaftarDiterima">0</b>
        <span class="font-bold text-emerald-600 uppercase tracking-wider text-[10px]">Diterima</span>
      </span>
      <span onclick="filterPendaftar('Ditolak')" class="inline-flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1.5 text-[11px] cursor-pointer hover:bg-rose-100 transition whitespace-nowrap" title="Tampilkan yang ditolak">
        <i class="fas fa-times text-rose-600 text-[10px]"></i>
        <b class="text-sm font-bold text-rose-700 leading-none" id="statPendaftarDitolak">0</b>
        <span class="font-bold text-rose-600 uppercase tracking-wider text-[10px]">Ditolak</span>
      </span>
      <span onclick="filterPendaftar('')" class="inline-flex items-center justify-center gap-1.5 bg-[#e8ecf4] border border-[#d0d8e8] rounded-full px-2.5 py-1.5 text-[11px] cursor-pointer hover:bg-[#d0d8e8] transition whitespace-nowrap" title="Tampilkan semua">
        <i class="fas fa-user-plus text-[#1b2a4a] text-[10px]"></i>
        <b class="text-sm font-bold text-[#152238] leading-none" id="statPendaftarTotal">0</b>
        <span class="font-bold text-[#1b2a4a] uppercase tracking-wider text-[10px]">Total</span>
      </span>
    </div>
  </div>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#e8ecf4]/30">
      <div>
        <h3 class="text-sm font-extrabold text-gray-800">Daftar Pendaftar</h3>
        <p class="text-[10px] text-gray-400 mt-0.5">Data masuk dari link formulir pendaftaran</p>
      </div>
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full lg:w-auto">
        <div class="relative flex-1 lg:flex-none">
          <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
          <input id="pfSearch" name="cari_pendaftar_kotak" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-form-type="other" oninput="searchPendaftar(this.value)" placeholder="Cari nama / NISN / email / kelas..."
            class="pl-9 pr-4 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition shadow-sm outline-none w-full lg:w-64 focus:ring-4 focus:ring-[#5b7aaa]/20 focus:border-[#1b2a4a]">
        </div>
        <div class="relative flex-1 lg:flex-none">
          <i class="fas fa-filter absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
          <select id="pfDropdown" onchange="filterPendaftar(this.value)" class="pl-9 pr-8 py-2 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer shadow-sm appearance-none w-full lg:w-44">
            <option value="">Semua Status</option>
            <option value="Menunggu" selected>Menunggu</option>
            <option value="Diterima">Diterima</option>
            <option value="Ditolak">Ditolak</option>
          </select>
          <i class="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
        </div>
      </div>
      <div id="pendaftarBulkBar" class="hidden items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm w-full lg:w-auto">
        <span class="text-xs font-bold text-gray-400 whitespace-nowrap mr-1"><span id="pendaftarSelectedCount">0</span> dipilih</span>
        <button onclick="pendaftarMasal('Diterima')" title="Setujui Massal" class="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition"><i class="fas fa-check text-xs"></i></button>
        <button onclick="pendaftarMasal('Ditolak')" title="Tolak Massal" class="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition"><i class="fas fa-times text-xs"></i></button>
        <button onclick="pendaftarHapusMasal()" title="Hapus Massal" class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition"><i class="fas fa-trash text-xs"></i></button>
        <span class="w-px h-5 bg-gray-200 mx-0.5"></span>
        <button onclick="pendaftarClearSelection()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition" title="Bersihkan"><i class="fas fa-xmark text-xs"></i></button>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="w-12 p-3 text-center hidden"><input type="checkbox" id="pfCheckAll" onchange="pendaftarToggleAll(this)" class="w-3.5 h-3.5 accent-[#1b2a4a] cursor-pointer" autocomplete="off"></th>
              <th class="p-2 sm:p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">No</th>
              <th class="p-2 sm:p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Calon Siswa</th>
              <th class="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">No HP</th>
              <th class="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center hidden sm:table-cell">Jurusan</th>
              <th class="p-2 sm:p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th class="p-2 sm:p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
            </tr>
          </thead>
          <tbody id="tbody-pendaftar" class="divide-y divide-gray-50 mobile-pendaftar-list"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
