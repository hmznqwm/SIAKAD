
// =====================================================
// JADWAL PELAJARAN SISWA
// =====================================================

let _jadwalSiswaData = [];

const URUT_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function loadJadwalSiswa() {
  showView('view-jadwal-siswa');
  setActiveMenu('Jadwal Saya');

  const myKelas = (currentUser && currentUser.kelas) ? currentUser.kelas : '';
  const labelEl = document.getElementById('jadwalSiswaKelasLabel');
  if (labelEl) labelEl.textContent = myKelas ? `Kelas ${myKelas}` : 'Kelas belum diatur';

  const container = document.getElementById('jadwalSiswaTabelContainer');
  if (container) {
    container.innerHTML = `
      <div class="py-16 text-center text-gray-400">
        <i class="fas fa-circle-notch fa-spin text-lg mb-3 block text-[#1b2a4a]/40"></i>
        <p class="text-sm">Memuat jadwal...</p>
      </div>`;
  }

  if (!myKelas) {
    if (container) container.innerHTML = `
      <div class="py-16 text-center text-gray-400">
        <i class="fas fa-exclamation-circle text-xl mb-3 block text-yellow-400"></i>
        <p class="text-sm font-semibold">Kelas belum diatur</p>
        <p class="text-xs mt-1">Hubungi admin untuk mengatur kelas Anda.</p>
      </div>`;
    return;
  }

  siakadRun
    .withSuccessHandler(function(res) {
      _jadwalSiswaData = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      renderJadwalSiswaTabel();
    })
    .withFailureHandler(function(err) {
      if (container) container.innerHTML = `
        <div class="py-16 text-center text-red-400">
          <i class="fas fa-exclamation-triangle text-lg mb-3 block"></i>
          <p class="text-sm font-semibold">Gagal memuat jadwal</p>
          <p class="text-xs mt-1">${err ? err.message || err : 'Periksa koneksi server.'}</p>
        </div>`;
    })
    .getJadwalList(myKelas);
}

function renderJadwalSiswaTabel() {
  const container = document.getElementById('jadwalSiswaTabelContainer');
  if (!container) return;

  const filterHari = (document.getElementById('filterHariJadwalSiswa')?.value) || '';
  const data = _jadwalSiswaData;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-gray-400">
        <i class="fas fa-calendar-times text-xl mb-3 block text-gray-200"></i>
        <p class="text-sm font-semibold text-gray-500">Belum ada jadwal</p>
        <p class="text-xs mt-1 text-gray-400">Jadwal pelajaran belum diinput oleh admin.</p>
      </div>`;
    return;
  }

  // Kelompokkan per hari
  const grouped = {};
  data.forEach(j => {
    const h = j.hari || 'Lainnya';
    if (!grouped[h]) grouped[h] = [];
    grouped[h].push(j);
  });

  // Sort per hari sesuai urutan
  const hariList = filterHari
    ? (grouped[filterHari] ? [filterHari] : [])
    : URUT_HARI.filter(h => grouped[h]);

  if (hariList.length === 0) {
    container.innerHTML = `
      <div class="py-10 text-center text-gray-400">
        <i class="fas fa-filter text-lg mb-2 block text-gray-300"></i>
        <p class="text-sm font-semibold">Tidak ada jadwal untuk hari ${filterHari}</p>
      </div>`;
    return;
  }

  const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hariIni = HARI_NAMES[new Date().getDay()];

  // Palet seragam navy  selaras dengan tema aplikasi, tanpa gradasi
  const HEAD_CLS = 'bg-[#e8ecf4] dark:bg-gray-700 border-[#d0d8e8] dark:border-gray-600';

  container.innerHTML = hariList.map(hari => {
    const jadwal = (grouped[hari] || []).slice().sort((a, b) => {
      const ta = a.jam_mulai || (a.waktu ? a.waktu.split('-')[0].trim() : '99:99');
      const tb = b.jam_mulai || (b.waktu ? b.waktu.split('-')[0].trim() : '99:99');
      return ta.localeCompare(tb);
    });
    const isToday = (hari === hariIni);

    const rows = jadwal.map((j, idx) => {
      const mulai   = j.jam_mulai  || (j.waktu ? j.waktu.split('-')[0].trim() : '');
      const selesai = j.jam_selesai || (j.waktu ? (j.waktu.split('-')[1] || '').trim() : '');
      const mapel   = j.mapel || j.mataPelajaran || '-';
      const guru    = j.pengajar || j.namaGuru || '-';
      const jamKe   = j.jamKe || (idx + 1);
      // Format waktu memakai tanda hubung: 07.00 - 07.40
      const waktu = (mulai && selesai) ? `${mulai} - ${selesai}` : (mulai || selesai || j.waktu || '-');

      const rowCls = 'hover:bg-[#f4f6fb] dark:hover:bg-gray-700/50 transition-colors';
      const mapelCls = 'font-semibold text-gray-800 dark:text-gray-200';
      const waktuCls = 'text-gray-500 dark:text-gray-400';
      const guruCls  = 'text-gray-500 dark:text-gray-400';

      return `
        <tr class="${rowCls} border-b border-gray-100 dark:border-gray-700 last:border-0">
          <td class="py-2.5 px-3 text-center">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg ${HEAD_CLS} text-[#1b2a4a] dark:text-blue-300 text-xs font-bold">
              ${jamKe}
            </span>
          </td>
          <td class="py-2.5 px-3 whitespace-nowrap">
            <span class="${waktuCls} text-xs font-mono">${waktu}</span>
          </td>
          <td class="py-2.5 px-3">
            <div class="flex items-center flex-wrap gap-y-1">
              <span class="${mapelCls} text-sm">${mapel}</span>
            </div>
            <div class="${guruCls} text-[11px] mt-0.5 sm:hidden">${guru}</div>
          </td>
          <td class="py-2.5 px-3 hidden sm:table-cell">
            <span class="${guruCls} text-xs inline-flex items-center gap-1.5">
              <i class="fas fa-user-tie text-[10px] opacity-50"></i>${guru}
            </span>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-[#d0d8e8] dark:border-gray-600 ${isToday ? 'ring-2 ring-[#1b2a4a]/25 dark:ring-blue-500/40' : ''} overflow-hidden">
        <!-- Header hari -->
        <div class="flex items-center justify-between px-4 py-2.5 ${HEAD_CLS} border-b border-[#d0d8e8] dark:border-gray-600">
          <div class="flex items-center gap-2.5">
            <span class="font-bold text-[#1b2a4a] dark:text-blue-300 text-sm">${hari}</span>
            ${isToday ? `<span class="text-[10px] font-bold text-white bg-[#1b2a4a] dark:bg-blue-600 px-2 py-0.5 rounded-full">Hari Ini</span>` : ''}
          </div>
          <span class="text-[11px] font-bold text-[#1b2a4a] dark:text-blue-300 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-full border border-[#d0d8e8] dark:border-gray-600">${jadwal.length} Pelajaran</span>
        </div>
        <!-- Tabel -->
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-[#fafbfd] dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th class="py-2 px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center w-12">Jam</th>
                <th class="py-2 px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-32">Waktu</th>
                <th class="py-2 px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Mata Pelajaran</th>
                <th class="py-2 px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider hidden sm:table-cell">Pengajar</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}
