          <div id="view-perizinan-siswa-guru" class="view-section animate-fade-in hidden">
            <div class="space-y-5 pb-6">
              
              <!-- Header Section -->
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                  <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
                     Perizinan Siswa
                  </h3>
                  <p class="text-xs text-gray-500 mt-1">Perizinan siswa yang ditujukan ke mata pelajaran Anda</p>
                </div>
                <!-- Stats Pills -->
                <div class="flex flex-wrap gap-2 items-center md:justify-end md:ml-auto shrink-0" id="statPzSiswaGuruWrap">
                  <span class="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3.5 py-1.5 text-[11px]">
                    <i class="fas fa-hourglass-half text-amber-600 text-[10px]"></i>
                    <b class="text-sm font-bold text-amber-700 leading-none" id="statPzSGMenunggu">-</b>
                    <span class="font-bold text-amber-600 uppercase tracking-wider text-[10px]">Menunggu</span>
                  </span>
                  <span class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1.5 text-[11px]">
                    <i class="fas fa-check-circle text-emerald-600 text-[10px]"></i>
                    <b class="text-sm font-bold text-emerald-700 leading-none" id="statPzSGDisetujui">-</b>
                    <span class="font-bold text-emerald-600 uppercase tracking-wider text-[10px]">Disetujui</span>
                  </span>
                  <span class="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-3.5 py-1.5 text-[11px]">
                    <i class="fas fa-times-circle text-rose-600 text-[10px]"></i>
                    <b class="text-sm font-bold text-rose-700 leading-none" id="statPzSGDitolak">-</b>
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
                    <input type="month" id="filterPzSGBulan" onchange="loadPerizinanSiswaUntukGuru()" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#1b2a4a] transition" autocomplete="off">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Kelas
                    </label>
                    <select id="filterPzSGKelas" onchange="loadPerizinanSiswaUntukGuru()" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#1b2a4a] transition">
                      <option value="">Semua Kelas</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Status
                    </label>
                    <select id="filterPzSGStatus" onchange="loadPerizinanSiswaUntukGuru()" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#1b2a4a] transition">
                      <option value="">Semua Status</option>
                      <option value="Menunggu" selected>Menunggu</option>
                      <option value="Disetujui">Disetujui</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
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
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tgl Izin</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Siswa</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Kelas</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Mapel</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-24">Jenis</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Keterangan</th>
                        <th class="px-4 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-32">Status</th>
                        <th class="px-4 py-3.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody id="tbody-perizinan-siswa-guru" class="divide-y divide-gray-100">
                      <tr><td colspan="9" class="p-10 text-center text-gray-400"><i class="fas fa-inbox mr-2 text-lg"></i>Klik <b>Tampilkan</b> untuk memuat data perizinan</td></tr>
                    </tbody>
                  </table>
                </div>
                <div id="perizinan-siswa-guru-empty" class="hidden p-14 text-center text-gray-400">
                  <div class="w-16 h-16 bg-[#e8ecf4] rounded-full flex items-center justify-center mx-auto mb-4 text-[#1b2a4a] text-2xl"><i class="fas fa-inbox"></i></div>
                  <p class="text-base font-bold text-gray-700 mb-1">Belum ada perizinan masuk</p>
                  <p class="text-xs text-gray-500">Perizinan siswa akan muncul di sini setelah siswa mengajukan izin</p>
                </div>
              </div>

            </div>
          </div>

          <!-- VIEW: KELOLA PERIZINAN GURU (ADMIN) -->
