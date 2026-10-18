              <div id="view-scanner-guru" class="view-section animate-fade-in">
                  <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 max-w-5xl mx-auto items-start">
                      <div class="lg:col-span-2 space-y-4">
                          <div class="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                              <div class="p-4 border-b border-gray-100 bg-white">
                                  <h3 class="font-bold text-sm text-gray-800">Scan QR Absensi Guru</h3>
                                  <p class="text-gray-400 text-[10px] mt-0.5">Scan langsung tersimpan otomatis</p>
                              </div>
                              <div class="p-4 space-y-3">
                                  <button onclick="openCameraPopupGuru()"
                                      class="w-full bg-[#1b2a4a] hover:bg-[#152238] active:scale-95 text-white py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-[#b8c4d8]">
                                      <i class="fas fa-video text-lg"></i>
                                      <span>Buka Kamera Live</span>
                                  </button>
                                  <p class="text-[10px] text-center text-gray-400">Membuka kamera langsung di halaman ini</p>
                                  <div id="scanCacheStatusGuru" class="hidden text-xs text-center py-1"></div>
                                  <div id="pollingStatusGuru" class="hidden bg-[#e8ecf4] border border-[#b8c4d8] rounded-xl p-3 text-center">
                                      <div class="flex items-center justify-center gap-2 text-[#152238] text-xs font-bold">
                                          <i class="fas fa-circle-notch fa-spin"></i>
                                          <span>Menunggu hasil scan dari kamera...</span>
                                      </div>
                                  </div>
                                  <div class="flex items-center gap-3"><div class="flex-1 h-px bg-gray-200"></div><span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">atau</span><div class="flex-1 h-px bg-gray-200"></div></div>
                                  <div>
                                      <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Input NIP Manual</label>
                                      <div class="flex gap-2">
                                          <input type="text" id="manualNipGuru" placeholder="Ketik NIP/NUPTK..."
                                              class="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#a0b0cc] focus:border-[#5b7aaa] focus:bg-white outline-none transition"
                                              onkeydown="if(event.key==='Enter') submitManualNipGuru()" autocomplete="off">
                                          <button onclick="submitManualNipGuru()" class="bg-gray-900 hover:bg-black text-white px-4 py-3 rounded-xl text-sm font-bold transition shadow-sm">
                                              <i class="fas fa-check"></i>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div id="fileResultGuru"></div>
                      </div>
                      <div class="lg:col-span-3 bg-white rounded-2xl shadow border border-gray-100 overflow-hidden flex flex-col" style="max-height: 75vh;">
                          <div class="p-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                              <div>
                                  <h3 class="font-bold text-sm text-gray-800">Riwayat Absensi Guru</h3>
                                  <p class="text-gray-400 text-[10px]">Setiap scan langsung tersimpan</p>
                              </div>
                              <div class="flex items-center gap-2">
                                  <span id="scanCountBadgeGuru" class="bg-[#e8ecf4] text-[#152238] text-xs font-bold px-3 py-1.5 rounded-full">0 Guru</span>
                                  <button onclick="resetScanTableGuru()" title="Kosongkan tampilan riwayat (data tersimpan tidak terpengaruh)" class="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition text-gray-500 hover:text-gray-700">
                                      <i class="fas fa-trash-alt text-xs"></i>
                                  </button>
                              </div>
                          </div>
                          <div class="bg-[#e8ecf4] border-b border-[#d0d8e8] px-4 py-2 flex items-center gap-2 shrink-0">
                              <i class="fas fa-circle-check text-[#1b2a4a] text-xs"></i>
                              <p class="text-[10px] text-[#152238] font-semibold">Data <b>otomatis tersimpan</b> </p>
                          </div>
                          <div class="overflow-y-auto flex-1" id="scanTableWrapperGuru">
                              <table class="w-full text-sm border-collapse">
                                  <thead class="sticky top-0 z-10">
                                      <tr class="bg-gray-50 border-b-2 border-gray-100">
                                          <th class="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase w-8">No</th>
                                          <th class="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Nama Guru</th>
                                          <th class="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Jabatan</th>
                                          <th class="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Mapel</th>
                                          <th class="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Jam Scan</th>
                                          <th class="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                      </tr>
                                  </thead>
                                  <tbody id="tbody-scan-live-guru">
                                      <tr id="scan-empty-row-guru">
                                          <td colspan="6" class="py-16 text-center">
                                              <div class="flex flex-col items-center gap-3">
                                                  <i class="fas fa-qrcode text-3xl text-gray-200"></i>
                                                  <p class="font-semibold text-sm text-gray-400">Belum ada riwayat scan</p>
                                                  <p class="text-xs text-gray-300">Scan QR — data langsung tersimpan otomatis</p>
                                              </div>
                                          </td>
                                      </tr>
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              </div>
