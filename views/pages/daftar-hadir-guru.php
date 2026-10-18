<div id="view-daftar-hadir-guru" class="view-section animate-fade-in hidden">
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end" id="dhFilterGrid">
      <div id="dhModeFilterCol"></div>
      <div id="dhKelasCol">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pilih Kelas</label>
        <select id="dhKelasSelect" onchange="dhRefreshMapelDropdown(this.value, document.getElementById('dhTanggal').value, onDhKelasChange)" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#a0b0cc] outline-none transition cursor-pointer">
          <option value=""> Pilih Kelas </option>
        </select>
      </div>
      <div id="dhMapelCol">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mata Pelajaran</label>
        <select id="dhMapelSelect" onchange="onDhMapelChange()" class="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#a0b0cc] outline-none transition cursor-pointer" disabled>
          <option value=""> Pilih Mapel </option>
        </select>
      </div>
      <div id="dhTanggalCol">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tanggal (otomatis)</label>
        <div id="dhTanggalDisplay" class="w-full bg-gray-100 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl px-3.5 py-2.5 cursor-not-allowed overflow-hidden text-ellipsis whitespace-nowrap">-</div>
        <input type="hidden" id="dhTanggal" autocomplete="off">
      </div>
    </div>
    <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
      <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status Kehadiran Hari Ini</span>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-xs text-gray-500 font-medium">Tersimpan:</span>
        <span id="dhCounter" class="font-bold text-[#152238] text-sm">0 / 0</span>
      </div>
    </div>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
    <div class="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div>
          <h3 class="font-bold text-sm text-gray-800" id="dhListTitle">Daftar Hadir Siswa</h3>
          <p class="text-gray-400 text-[10px] mt-0.5" id="dhListSubtitle">tersimpan otomatis</p>
        </div>
        <button onclick="dhTandaiSemua()" id="dhTandaiSemuaBtn" class="bg-[#1b2a4a] hover:bg-[#152238] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
          <i class="fas fa-check mr-1"></i>Tandai Semua
        </button>
      </div>
      <div id="dhSubmittedBanner" class="hidden bg-[#e8ecf4] border-b border-[#b8c4d8] px-4 py-2 flex items-center gap-2">
        <i class="fas fa-check-circle text-[#1b2a4a] text-xs"></i>
        <p class="text-[10px] text-[#152238] font-semibold" id="dhSubmittedBannerText">Sebagian/semua siswa untuk mapel ini sudah tercatat dan tidak bisa diubah lagi.</p>
      </div>
      <div class="overflow-y-auto" style="max-height:62vh;">
        <table class="w-full text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-50 border-b border-gray-100" id="dhTheadMasuk">
              <th class="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase w-8">No</th>
              <th class="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Nama Siswa</th>
              <th class="px-3 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody id="dhSiswaTbody">
            <tr id="dhEmptyRow">
              <td colspan="3" class="py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <i class="fas fa-users text-3xl text-gray-200"></i>
                  <p class="text-sm text-gray-400 font-semibold">Pilih kelas untuk menampilkan siswa</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="lg:col-span-2 space-y-4" id="dhScanCard">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="dhScanCardInner">
        <div id="dhScanCardHeader" class="p-4 border-b border-gray-100 bg-white">
          <h3 class="font-bold text-sm text-gray-800" id="dhScanCardTitle">Scan QR Siswa</h3>
          <p class="text-[10px] text-gray-400 mt-0.5" id="dhScanCardSub">Scan langsung tersimpan otomatis</p>
        </div>
        <div class="p-4 space-y-3">
          <button id="dhCamBtn" onclick="dhOpenCameraPopup()"
            class="w-full bg-[#1b2a4a] hover:bg-[#152238] active:scale-95 text-white py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md">
            <i class="fas fa-camera text-base"></i> Buka Kamera Live
          </button>
          <div id="dhPollingStatus" class="hidden bg-[#e8ecf4] border border-[#b8c4d8] rounded-xl p-3 flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-[#1b2a4a] animate-pulse flex-shrink-0"></div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-[#0f1d35]" id="dhPollingText">Kamera aktif — menunggu QR...</p>
              <p class="text-[10px] text-[#1b2a4a] mt-0.5">Scan QR di popup kamera yang terbuka</p>
            </div>
            <button onclick="dhStopPopup()" title="Tutup kamera" class="w-7 h-7 bg-[#b8c4d8] hover:bg-[#b8c4d8] text-[#0f1d35] rounded-lg flex items-center justify-center transition flex-shrink-0">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
          <div id="dhScanNotif" class="hidden rounded-xl p-3 text-sm font-semibold text-center"></div>
          <div class="flex items-center gap-2 my-1">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-[10px] text-gray-400 font-bold uppercase">atau</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Input Id Manual</label>
            <div class="flex gap-2">
              <input type="number" id="dhManualNisn" placeholder="Ketik Nomor ID..."
                class="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#a0b0cc] focus:bg-white outline-none transition"
                onkeydown="if(event.key==='Enter') dhSubmitManual()" autocomplete="off">
              <button onclick="dhSubmitManual()" class="bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">
                <i class="fas fa-check"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Keterangan Status</p>
        <div class="flex flex-wrap gap-x-4 gap-y-1.5 justify-start">
          <div class="flex items-center gap-1.5 text-xs text-gray-600 font-semibold"><span class="w-2.5 h-2.5 rounded-full bg-[#1b2a4a] flex-shrink-0"></span>Hadir</div>
          <div class="flex items-center gap-1.5 text-xs text-gray-600 font-semibold"><span class="w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0"></span>Sakit</div>
          <div class="flex items-center gap-1.5 text-xs text-gray-600 font-semibold"><span class="w-2.5 h-2.5 rounded-full bg-[#5b7aaa] flex-shrink-0"></span>Izin</div>
          <div class="flex items-center gap-1.5 text-xs text-gray-600 font-semibold"><span class="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0"></span>Alpa</div>
        </div>
      </div>
    </div>
  </div>
</div>
