              <div id="view-nilai-siswa" class="view-section animate-fade-in hidden">
                <div class="p-4 md:p-6 space-y-5">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 class="text-base font-bold text-gray-800 dark:text-gray-100">Nilai Siswa</h2>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Input dan kelola data nilai per mata pelajaran</p>
                    </div>
                    <div id="btnTambahNilaiWrap" class="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
                      <button onclick="downloadTemplateNilai()" class="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap">
                        <i class="fas fa-download text-[#1b2a4a] dark:text-blue-300"></i>
                        <span>Template</span>
                      </button>
                      <button onclick="triggerImportNilai()" class="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap">
                        <i class="fas fa-file-excel text-[#1b2a4a] dark:text-blue-300"></i>
                        <span>Import</span>
                      </button>
                      <input type="file" id="fileInputNilai" accept=".xlsx,.xls" class="hidden" onchange="handleFileImportNilai(this)" autocomplete="off">
                      <button onclick="showAddNilaiModal()" class="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-[#1b2a4a] dark:bg-blue-600 hover:bg-[#152238] dark:hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow whitespace-nowrap">
                        <i class="fas fa-plus"></i>
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Filter Kelas</label>
                        <select id="filterNilaiKelas" onchange="loadDataNilai()" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#a0b0cc] outline-none">
                          <option value="">Semua Kelas</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Filter Semester</label>
                        <select id="filterNilaiSemester" onchange="loadDataNilai()" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#a0b0cc] outline-none">
                          <option value="">Semua Semester</option>
                          <option value="1">Semester 1</option>
                          <option value="2">Semester 2</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Filter Keterangan</label>
                        <select id="filterNilaiKeterangan" onchange="filterNilaiTable()" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#a0b0cc] outline-none">
                          <option value="">Semua Keterangan</option>
                          <option value="Tugas">Tugas</option>
                          <option value="Ulangan">Ulangan</option>
                          <option value="Ujian Harian">Ujian Harian (UH)</option>
                          <option value="UTS">UTS</option>
                          <option value="UAS">UAS</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Cari Siswa</label>
                        <input type="text" id="searchNilai" oninput="filterNilaiTable()" placeholder="Nama / NISN..."
                          class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-[#a0b0cc] outline-none" autocomplete="off">
                      </div>
                    </div>
                  </div>
                  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div id="nilaiOuterWrap" style="overflow-x:visible">
                      <table class="w-full text-sm" id="tabel-nilai-siswa">
                        <thead style="display:none;"></thead>
                        <tbody id="tbody-nilai">
                          <tr><td colspan="10" class="p-10 text-center text-gray-400 dark:text-gray-500">Memuat data...</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
          <!-- VIEW: PERIZINAN SISWA -->
