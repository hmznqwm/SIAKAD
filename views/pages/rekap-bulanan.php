<div id="view-rekap-bulanan" class="view-section animate-fade-in hidden">
    <style>
        /* Khusus HP (<640px): matikan kolom "sticky" (No/Nama/Mapel) di tabel
           Rekapitulasi Bulanan (tab Siswa & Guru) supaya seluruh tabel bisa
           digeser bebas ke kiri/kanan, tidak ada kolom yang "nempel" diam.
           !important dipakai karena sebagian kolom memakai inline style
           position:sticky yang butuh dilawan dari CSS eksternal. */
        @media (max-width: 639px) {
            #thead-rekap-bulanan th,
            #tbody-rekap-bulanan td,
            #thead-rekap-bulanan-guru th,
            #tbody-rekap-bulanan-guru td {
                position: static !important;
                left: auto !important;
            }
        }
    </style>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <!-- HEADER: judul kiri, filter & tombol menempel KANAN -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="shrink-0">
                <h3 class="font-bold text-gray-800 dark:text-gray-100">Rekapitulasi Bulanan</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400" id="rekapBulananSubtitle">Matriks kehadiran siswa per bulan</p>
            </div>
            <div class="w-full sm:flex-1 min-w-0">
                <!-- Filter khusus TAB SISWA -->
                <div id="toolbarRekapSiswa" class="w-full">
                    <div class="grid grid-cols-2 sm:grid-cols-4 sm:flex sm:flex-row sm:flex-nowrap sm:items-center gap-2 w-full sm:justify-end">
                        <div id="wrapRekapKelas" class="sm:flex-1 sm:min-w-[90px] sm:max-w-[160px]">
                            <select id="rekapKelas" onchange="loadDataRekapBulanan()" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
                                <option value="">-- Pilih Kelas --</option>
                            </select>
                        </div>
                        <select id="rekapBulan" onchange="loadDataRekapBulanan()" class="w-full sm:flex-1 sm:min-w-[90px] sm:max-w-[140px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
                            <option value="0">Januari</option>
                            <option value="1">Februari</option>
                            <option value="2">Maret</option>
                            <option value="3">April</option>
                            <option value="4">Mei</option>
                            <option value="5">Juni</option>
                            <option value="6">Juli</option>
                            <option value="7">Agustus</option>
                            <option value="8">September</option>
                            <option value="9">Oktober</option>
                            <option value="10">November</option>
                            <option value="11">Desember</option>
                        </select>
                        <select id="rekapTahun" onchange="loadDataRekapBulanan()" class="w-full sm:flex-1 sm:min-w-[70px] sm:max-w-[100px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
                        </select>
                        <button onclick="exportRekapBulananExcel()" id="btnExportRekap" class="w-full sm:w-auto sm:shrink-0 bg-[#1b2a4a] dark:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#152238] dark:hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap col-span-2 sm:col-span-1">
                            <i class="fas fa-file-excel"></i> <span>Export</span>
                        </button>
                    </div>
                </div>
                <!-- Filter khusus TAB GURU (terpisah dari tab Siswa) -->
                <div id="toolbarRekapGuru" class="hidden w-full">
                    <div class="grid grid-cols-2 sm:grid-cols-4 sm:flex sm:flex-row sm:flex-nowrap sm:items-center gap-2 w-full sm:justify-end">
                        <select id="rekapKelasGuru" onchange="loadDataRekapBulananGuru()" class="w-full sm:flex-1 sm:min-w-[90px] sm:max-w-[160px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
                            <option value="">-- Semua Kelas --</option>
                        </select>
                        <select id="rekapBulanGuru" onchange="loadDataRekapBulananGuru()" class="w-full sm:flex-1 sm:min-w-[90px] sm:max-w-[140px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
                            <option value="0">Januari</option>
                            <option value="1">Februari</option>
                            <option value="2">Maret</option>
                            <option value="3">April</option>
                            <option value="4">Mei</option>
                            <option value="5">Juni</option>
                            <option value="6">Juli</option>
                            <option value="7">Agustus</option>
                            <option value="8">September</option>
                            <option value="9">Oktober</option>
                            <option value="10">November</option>
                            <option value="11">Desember</option>
                        </select>
                        <select id="rekapTahunGuru" onchange="loadDataRekapBulananGuru()" class="w-full sm:flex-1 sm:min-w-[70px] sm:max-w-[100px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
                        </select>
                        <button onclick="exportRekapBulananExcel()" id="btnExportRekapGuru" class="w-full sm:w-auto sm:shrink-0 bg-[#1b2a4a] dark:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#152238] dark:hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap col-span-2 sm:col-span-1">
                            <i class="fas fa-file-excel"></i> <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button id="tabRekapBulananSiswa" onclick="switchRekapBulananTab('siswa')"
                class="px-5 py-2.5 text-xs font-bold border-b-2 border-[#1b2a4a] dark:border-blue-400 text-[#152238] dark:text-blue-300 bg-white dark:bg-gray-800 transition">
                <i class="fas fa-user-graduate mr-1"></i> Siswa
            </button>
            <button id="tabRekapBulananGuru" onclick="switchRekapBulananTab('guru')"
                class="px-5 py-2.5 text-xs font-bold border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-[#152238] dark:hover:text-blue-300 transition">
                <i class="fas fa-chalkboard-teacher mr-1"></i> Guru
            </button>
        </div>
        <div id="panelRekapBulananSiswa">
            <div class="overflow-x-auto relative">
                <table class="w-full text-left border-collapse text-xs text-gray-800 dark:text-gray-200">
                    <thead class="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 uppercase font-bold sticky top-0 z-10">
                        <tr id="thead-rekap-bulanan"></tr>
                    </thead>
                    <tbody id="tbody-rekap-bulanan" class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        <tr><td class="p-10 text-center text-gray-400 dark:text-gray-500" colspan="10"><i class="fas fa-filter mr-2"></i>Pilih filter (kelas / bulan / mapel) — rekap akan tampil otomatis.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div id="panelRekapBulananGuru" class="hidden">
            <div class="overflow-x-auto relative">
                <table class="w-full text-left border-collapse text-xs text-gray-800 dark:text-gray-200">
                    <thead class="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 uppercase font-bold sticky top-0 z-10">
                        <tr id="thead-rekap-bulanan-guru"></tr>
                    </thead>
                    <tbody id="tbody-rekap-bulanan-guru" class="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        <tr><td class="p-10 text-center text-gray-400 dark:text-gray-500" colspan="10"><i class="fas fa-filter mr-2"></i>Pilih filter (bulan / tahun) — rekap akan tampil otomatis.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>