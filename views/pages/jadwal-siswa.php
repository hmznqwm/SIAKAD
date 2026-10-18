              <div id="view-jadwal-siswa" class="view-section animate-fade-in hidden">
                <div class="p-4 md:p-6 space-y-5">
                  <!-- Header -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 class="text-base font-bold text-gray-800 flex items-center gap-2">
                        <span class="w-8 h-8 bg-[#1b2a4a] rounded-lg flex items-center justify-center shrink-0">
                          <i class="fas fa-calendar-alt text-white text-sm"></i>
                        </span>
                        Jadwal Pelajaran
                      </h2>
                      <p class="text-sm text-gray-400 mt-0.5 ml-10" id="jadwalSiswaKelasLabel">Kelas saya</p>
                    </div>
                    <!-- Filter Hari -->
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                      <select id="filterHariJadwalSiswa" onchange="renderJadwalSiswaTabel()"
                        class="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-[#1b2a4a]/30 focus:border-[#1b2a4a] outline-none cursor-pointer font-bold text-gray-700 shadow-sm w-full sm:w-auto">
                        <option value="">Semua Hari</option>
                        <option value="Senin">Senin</option>
                        <option value="Selasa">Selasa</option>
                        <option value="Rabu">Rabu</option>
                        <option value="Kamis">Kamis</option>
                        <option value="Jumat">Jumat</option>
                        <option value="Sabtu">Sabtu</option>
                      </select>
                    </div>
                  </div>

                  <!-- Tabel per hari (accordion style) -->
                  <div id="jadwalSiswaTabelContainer" class="space-y-4">
                    <div class="py-16 text-center text-gray-400">
                      <i class="fas fa-circle-notch fa-spin text-2xl mb-3 block text-[#1b2a4a]/40"></i>
                      <p class="text-sm">Memuat jadwal...</p>
                    </div>
                  </div>
                </div>
              </div>

