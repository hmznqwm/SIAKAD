          <div id="view-perizinan-guru" class="view-section animate-fade-in hidden">
            <div class="space-y-5 pb-6">
              
              <!-- Header Section -->
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                  <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
                     Perizinan Guru
                  </h3>
                  <p class="text-xs text-gray-500 mt-1">Kelola pengajuan izin &amp; sakit dari guru</p>
                </div>
                <!-- Stats Pills -->
                <div class="flex flex-wrap gap-2 items-center md:justify-end md:ml-auto shrink-0" id="statPerizinanWrap">
                  <span class="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3.5 py-1.5 text-[11px]">
                    <i class="fas fa-hourglass-half text-amber-600 text-[10px]"></i>
                    <b class="text-sm font-bold text-amber-700 leading-none" id="statPzMenunggu">-</b>
                    <span class="font-bold text-amber-600 uppercase tracking-wider text-[10px]">Menunggu</span>
                  </span>
                  <span class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1.5 text-[11px]">
                    <i class="fas fa-check-circle text-emerald-600 text-[10px]"></i>
                    <b class="text-sm font-bold text-emerald-700 leading-none" id="statPzDisetujui">-</b>
                    <span class="font-bold text-emerald-600 uppercase tracking-wider text-[10px]">Disetujui</span>
                  </span>
                  <span class="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-3.5 py-1.5 text-[11px]">
                    <i class="fas fa-times-circle text-rose-600 text-[10px]"></i>
                    <b class="text-sm font-bold text-rose-700 leading-none" id="statPzDitolak">-</b>
                    <span class="font-bold text-rose-600 uppercase tracking-wider text-[10px]">Ditolak</span>
                  </span>
                </div>
              </div>

              <!-- Filters Card -->
              <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Bulan
                    </label>
                    <input type="month" id="filterPerizinanBulan" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#1b2a4a] transition" autocomplete="off">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Status
                    </label>
                    <select id="filterPerizinanStatus" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#1b2a4a] transition">
                      <option value="">Semua Status</option>
                      <option value="Menunggu" selected>Menunggu</option>
                      <option value="Disetujui">Disetujui</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
                  </div>
                  <div>
                    <button onclick="filterAndLoadPerizinan()" class="w-full inline-flex items-center justify-center gap-2 bg-[#1b2a4a] hover:bg-[#152238] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm whitespace-nowrap">
                      <i class="fas fa-search"></i> Tampilkan
                    </button>
                  </div>
                </div>
              </div>

              <!-- Table Card -->
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="bg-gray-50 border-b border-gray-100">
                        <th class="px-4 py-3.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-16">No</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal Izin</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Guru</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-24">Jenis</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Keterangan</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-32">Status</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan Admin</th>
                        <th class="px-4 py-3.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-40" id="thAksiPerizinan">Aksi</th>
                      </tr>
                    </thead>
                    <tbody id="tbody-perizinan" class="divide-y divide-gray-100">
                      <tr><td colspan="8" class="p-10 text-center text-gray-400"><i class="fas fa-file-signature mr-2 text-lg"></i>Klik <b>Tampilkan</b> untuk memuat data perizinan</td></tr>
                    </tbody>
                  </table>
                </div>
                <div id="perizinan-empty" class="hidden p-14 text-center text-gray-400">
                  <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 text-2xl"><i class="fas fa-clipboard-list"></i></div>
                  <p class="text-base font-bold text-gray-700 mb-1">Belum ada data perizinan</p>
                  <p class="text-xs text-gray-500">Perizinan akan muncul saat guru mengajukan izin</p>
                </div>
              </div>

            </div>
          </div>
          </div>
