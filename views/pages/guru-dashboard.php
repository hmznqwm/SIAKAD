<div id="view-guru-dashboard" class="view-section animate-fade-in">
                  <!-- Header halaman -->
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                      <div class="min-w-0">
                          <h2 class="text-base font-bold text-gray-900 tracking-tight">Dashboard Guru</h2>
                          <p class="text-xs text-gray-400 mt-0.5">Rekap kehadiran siswa — <span id="guruDashboardDate" class="text-[#1b2a4a] font-semibold whitespace-nowrap">...</span></p>
                      </div>
                      <button onclick="openAjukanIzinGuruModal()" class="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold text-white bg-[#1b2a4a] hover:bg-[#152238] active:scale-[0.98] px-4 py-3 sm:py-2.5 rounded-xl shadow-sm transition shrink-0">
                          <i class="fas fa-hand-paper"></i> Ajukan Izin
                      </button>
                  </div>
                  <!-- Kartu statistik: 2 kolom di HP, 4 kolom di layar besar -->
                  <div class="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-4">
                      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div class="w-9 h-9 sm:w-10 sm:h-10 bg-[#e8ecf4] text-[#1b2a4a] rounded-xl flex items-center justify-center text-sm shrink-0"><i class="fas fa-user-graduate"></i></div>
                          <div class="min-w-0">
                              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
                              <h3 id="statGuruTotal" class="text-lg sm:text-xl font-black text-gray-900 leading-none mt-0.5 truncate">—</h3>
                          </div>
                      </div>
                      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div class="w-9 h-9 sm:w-10 sm:h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-sm shrink-0"><i class="fas fa-procedures"></i></div>
                          <div class="min-w-0">
                              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sakit</p>
                              <h3 id="statGuruSakit" class="text-lg sm:text-xl font-black text-gray-900 leading-none mt-0.5 truncate">—</h3>
                          </div>
                      </div>
                      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div class="w-9 h-9 sm:w-10 sm:h-10 bg-[#e8ecf4] text-[#1b2a4a] rounded-xl flex items-center justify-center text-sm shrink-0"><i class="fas fa-envelope-open-text"></i></div>
                          <div class="min-w-0">
                              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Izin</p>
                              <h3 id="statGuruIzin" class="text-lg sm:text-xl font-black text-gray-900 leading-none mt-0.5 truncate">—</h3>
                          </div>
                      </div>
                      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div class="w-9 h-9 sm:w-10 sm:h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-sm shrink-0"><i class="fas fa-times-circle"></i></div>
                          <div class="min-w-0">
                              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Alpa</p>
                              <h3 id="statGuruAlpa" class="text-lg sm:text-xl font-black text-gray-900 leading-none mt-0.5 truncate">—</h3>
                          </div>
                      </div>
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <!-- Kartu grafik -->
                      <div class="lg:col-span-2 bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm min-w-0">
                          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div class="min-w-0">
                                  <h3 class="text-sm font-bold text-gray-800">Statistik Kehadiran</h3>
                                  <p class="text-[10px] text-gray-400 mt-0.5" id="guruChartSub">Hari Ini</p>
                              </div>
                              <div class="flex items-center gap-2 flex-wrap">
                                  <div class="relative flex items-center max-w-full">
                                      <i class="fas fa-calendar-alt text-[10px] text-gray-400 absolute left-2.5 pointer-events-none"></i>
                                      <select onchange="setGuruDashPeriod(this.value)" class="appearance-none bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg pl-7 pr-7 py-2 shadow-sm focus:ring-2 focus:ring-[#b8c4d8] focus:border-[#5b7aaa] cursor-pointer hover:border-gray-300 transition-all max-w-[150px]">
                                          <option value="harian" selected>Hari Ini</option>
                                          <option value="mingguan">Mingguan</option>
                                          <option value="bulanan">Bulanan</option>
                                          <option value="tahunan">Tahunan</option>
                                      </select>
                                      <i class="fas fa-chevron-down text-[9px] text-gray-400 absolute right-2.5 pointer-events-none"></i>
                                  </div>
                                  <span class="text-[10px] bg-[#e8ecf4] text-[#152238] px-2.5 py-1 rounded-full font-bold border border-[#d0d8e8]">Live</span>
                              </div>
                          </div>
                          <!-- Tinggi grafik adaptif agar label sumbu-X tetap terbaca di HP -->
                          <div class="relative w-full h-[220px] sm:h-[260px] lg:h-[280px] min-w-0">
                              <canvas id="guruAttendanceChart"></canvas>
                          </div>
                      </div>
                      <!-- Aksi cepat -->
                      <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between min-w-0">
                          <div>
                              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Aksi Cepat</p>
                              <button onclick="loadDaftarHadirGuru()" class="w-full bg-[#1b2a4a] hover:bg-[#152238] active:scale-[0.98] text-white px-4 py-3 sm:py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-3 shadow-sm mb-2 text-left">
                                  <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0"><i class="fas fa-clipboard-check text-sm"></i></div>
                                  <div class="min-w-0">
                                      <div class="font-bold text-sm">Daftar Hadir</div>
                                      <div class="text-[10px] opacity-80">Input kehadiran siswa</div>
                                  </div>
                              </button>
                              <button onclick="loadPerizinanSiswaUntukGuru()" class="w-full bg-white hover:bg-gray-50 active:scale-[0.98] border border-gray-200 text-gray-700 px-4 py-3 sm:py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-3 shadow-sm text-left">
                                  <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0"><i class="fas fa-hand-paper text-amber-500 text-sm"></i></div>
                                  <div class="min-w-0">
                                      <div class="font-semibold text-sm text-gray-700">Izin Siswa</div>
                                      <div class="text-[10px] text-gray-400">Kelola perizinan</div>
                                  </div>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
