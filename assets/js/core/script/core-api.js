// core/script/core-api.js
// Bootstrap inti: pembersih URL, escapeHtml, kelas _SiakadRunner + siakadRun proxy,
// warna chart & toggle tema, executeApiCall + mapArgsToAction (router aksi API),
// helper import Excel (normImportCell/excelSerialToDate/importField).
// HARUS dimuat PALING AWAL -- semua file lain bergantung pada siakadRun/executeApiCall.
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

// Clean InfinityFree tracking query parameters (e.g. ?i=1) from URL bar seamlessly
(function cleanUrlParameters() {
  if (window.location.search && (window.location.search.includes('i=1') || window.location.search.includes('?i='))) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  }
})();

window.escapeHtml = function(str) {
  if (typeof str !== 'string') return str === null || str === undefined ? '' : String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};


/* SIAKAD API Runner */
class _SiakadRunner {
  constructor() { this._ok = null; this._err = null; }
  withSuccessHandler(fn) { this._ok = fn; return this; }
  withFailureHandler(fn) { this._err = fn; return this; }
}

function _makeRunner(runner) {
  return new Proxy({}, {
    get(_, action) {
      if (action === 'withSuccessHandler') return fn => { runner._ok = fn; return _makeRunner(runner); };
      if (action === 'withFailureHandler') return fn => { runner._err = fn; return _makeRunner(runner); };
      return (...args) => executeApiCall(action, args, runner._ok, runner._err);
    }
  });
}

const siakadRun = new Proxy({}, {
  get(_, action) {
    if (action === 'withSuccessHandler') return fn => { const r = new _SiakadRunner(); r._ok = fn; return _makeRunner(r); };
    if (action === 'withFailureHandler') return fn => { const r = new _SiakadRunner(); r._err = fn; return _makeRunner(r); };
    return (...args) => executeApiCall(action, args, null, null);
  }
});

//  Dark mode / Light mode toggle  //
// Palet warna Chart.js yang menyesuaikan tema aktif  dipakai baik saat
// chart pertama kali dibuat maupun saat tema di-toggle (live, tanpa refresh).
function _siakadChartColors() {
    var isDark = document.documentElement.classList.contains('dark');
    return {
        tick: isDark ? '#aab6c9' : '#374151',
        tickSoft: isDark ? '#9aa7bd' : '#94a3b8',
        grid: isDark ? '#2b3549' : '#e5e7eb',
        gridSoft: isDark ? 'rgba(255,255,255,.08)' : 'rgba(148,163,184,.12)',
        gridFaint: isDark ? '#232c40' : '#F3F4F6',
        datalabel: isDark ? '#dbe2ee' : '#666',
        datalabelSoft: isDark ? '#cbd4e3' : '#4B5563',
        doughnutBorder: isDark ? '#1a2233' : '#ffffff'
    };
}
function _siakadApplyThemeIcon() {
    var isDark = document.documentElement.classList.contains('dark');
    var moon = document.getElementById('themeToggleIconMoon');
    var sun  = document.getElementById('themeToggleIconSun');
    if (moon) moon.classList.toggle('hidden', isDark);
    if (sun)  sun.classList.toggle('hidden', !isDark);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0f1420' : '#1b2a4a');
    // Samakan warna teks/garis Chart.js dengan tema agar tidak "hilang" atau tabrakan.
    // Beberapa chart di dashboard memakai warna hardcode (bukan Chart.defaults), jadi
    // warna itu harus di-set ulang satu-satu di sini agar berubah SAAT ITU JUGA,
    // tanpa harus refresh atau pindah menu dulu.
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = isDark ? '#aab6c9' : '#374151';
        Chart.defaults.borderColor = isDark ? '#2b3549' : '#e5e7eb';
        var c = _siakadChartColors();
        try {
            if (typeof adminChartInstance !== 'undefined' && adminChartInstance) {
                adminChartInstance.options.plugins.datalabels.color = c.datalabel;
                adminChartInstance.options.scales.y.grid.color = c.grid;
                adminChartInstance.options.scales.y.ticks.color = c.tick;
                adminChartInstance.options.scales.x.ticks.color = c.tick;
                adminChartInstance.update('none');
            }
            if (typeof adminChartInstanceGuru !== 'undefined' && adminChartInstanceGuru) {
                adminChartInstanceGuru.options.plugins.datalabels.color = c.datalabel;
                adminChartInstanceGuru.options.scales.y.grid.color = c.grid;
                adminChartInstanceGuru.options.scales.y.ticks.color = c.tick;
                adminChartInstanceGuru.options.scales.x.ticks.color = c.tick;
                adminChartInstanceGuru.update('none');
            }
            if (typeof guruChartInstance !== 'undefined' && guruChartInstance) {
                guruChartInstance.options.plugins.datalabels.color = c.datalabelSoft;
                guruChartInstance.options.scales.y.grid.color = c.gridFaint;
                guruChartInstance.update('none');
            }
            if (typeof adminPaymentChartInstance !== 'undefined' && adminPaymentChartInstance) {
                adminPaymentChartInstance.data.datasets[0].borderColor = c.doughnutBorder;
                adminPaymentChartInstance.update('none');
            }
            if (typeof siswaNilaiChartInstance !== 'undefined' && siswaNilaiChartInstance) {
                siswaNilaiChartInstance.options.scales.y.grid.color = c.gridSoft;
                siswaNilaiChartInstance.options.scales.y.ticks.color = c.tickSoft;
                siswaNilaiChartInstance.options.scales.x.ticks.color = c.tick;
                siswaNilaiChartInstance.update('none');
            }
        } catch (e) {}
        // Jaga-jaga untuk chart lain yang tidak disebut di atas (legend, tooltip, dll)
        try {
            Object.values(Chart.instances || {}).forEach(function(ch) { ch.update('none'); });
        } catch (e) {}
    }
}
function toggleSiakadTheme() {
    var html = document.documentElement;
    var isDark = html.classList.toggle('dark');
    try { localStorage.setItem('siakad_theme', isDark ? 'dark' : 'light'); } catch(e) {}
    _siakadApplyThemeIcon();
}
document.addEventListener('DOMContentLoaded', _siakadApplyThemeIcon);

//  Visibilitas halaman  //
function showLoginPage() {
  // Hapus tag style dinamis dari document.write yang memblokir perubahan tampilan
  var dynamicStyles = document.querySelectorAll('style');
  dynamicStyles.forEach(function(style) {
    var txt = style.textContent;
    if (txt.includes('#loginPage{display:none}') || txt.includes('#dashboardContainer{display:none}')) {
      style.remove();
    }
  });

  var lp = document.getElementById('loginPage');
  var dc = document.getElementById('dashboardContainer');
  // Hapus semua inline style dulu agar tidak konflik dengan Tailwind/CSS stylesheet
  if (dc) { dc.removeAttribute('style'); dc.classList.add('hidden'); }
  if (lp) { lp.removeAttribute('style'); lp.classList.remove('hidden'); }
  try { window.scrollTo(0, 0); } catch(e) {}
}
function showDashboardPage() {
  // Hapus tag style dinamis dari document.write yang memblokir perubahan tampilan
  var dynamicStyles = document.querySelectorAll('style');
  dynamicStyles.forEach(function(style) {
    var txt = style.textContent;
    if (txt.includes('#loginPage{display:none}') || txt.includes('#dashboardContainer{display:none}')) {
      style.remove();
    }
  });

  var lp = document.getElementById('loginPage');
  var dc = document.getElementById('dashboardContainer');
  // Hapus semua inline style dulu agar tidak konflik dengan Tailwind/CSS stylesheet
  if (lp) { lp.removeAttribute('style'); lp.classList.add('hidden'); }
  if (dc) { dc.removeAttribute('style'); dc.classList.remove('hidden'); }
}


// Aksi yang hanya untuk tampilan  kalau unauthorized, jangan logout global, cukup diam.
const NON_CRITICAL_ACTIONS = new Set([
  'getInfoGuru', 'getPerizinanSiswaList', 'getPerizinanList'
]);

async function executeApiCall(action, args, onSuccess, onFailure) {
  try {
    const payload = { 
      action: action, 
      args: args, 
      token: localStorage.getItem('siakad_token') || '', 
      ...mapArgsToAction(action, args) 
    };
    const response = await fetch('api.php?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const res = await response.json();
    if (res && res.unauthorized === true) {
      if (NON_CRITICAL_ACTIONS.has(action)) {
        // Aksi non-kritis: jangan logout, cukup panggil failure handler saja
        if (onFailure) onFailure(new Error(res.message || 'Sesi berakhir.'));
        return;
      }
      try {
        localStorage.removeItem('absensiAppSession');
        localStorage.removeItem('siakad_token');
        document.cookie = "siakad_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      } catch(e) {}
      if (typeof currentUser !== 'undefined') { try { currentUser = null; } catch(e) {} }
      window.location.reload();
      return;
    }
    if (res.success !== false) {
      if (onSuccess) {
        if (action === 'getDaftarKelas' || action === 'getDaftarMapel' || 
            action === 'getSiswaByKelas' || action === 'getDaftarTahunLulus') {
          onSuccess(res.data !== undefined ? res.data : (Array.isArray(res) ? res : []));
        } else if (action === 'getMapelDariGuru') {
          onSuccess(Array.isArray(res) ? res : (res.data !== undefined ? res.data : []));
        } else if (action === 'getModeAbsen') {
          onSuccess(res.mode !== undefined ? res.mode : 'masuk_pulang');
        } else {
          onSuccess(res);
        }
      }
    } else {
      if (onFailure) onFailure(new Error(res.message || 'Error occurred'));
      else if (onSuccess) onSuccess(res);
    }
  } catch (err) {
    console.error('API Call Error (' + action + '):', err);
    if (onFailure) onFailure(err);
  }
}

function mapArgsToAction(action, args) {
  if (!args || args.length === 0) return {};
  switch (action) {
    case 'login':
      return { username: args[0], password: args[1], nisn: args[2] };
    case 'getSiswaList':
      return { filterKelas: args[0] };
    case 'getSiswaByKelas':
      return { kelas: args[0] };
    case 'getSiswaByNisn':
      return { nisn: args[0] };
    case 'updateFotoSiswa':
      return { nisn: args[0], foto: args[1] };
    case 'addSiswa':
      return { token: args[0], siswaData: args[1] };
    case 'updateSiswa':
      return { token: args[0], oldNisn: args[1], siswaData: args[2] || args[1] };
    case 'deleteSiswa':
      return { token: args[0], nisn: args[1] };
    case 'deleteMultipleSiswa':
      return { token: args[0], nisnArray: args[1] };
    case 'importSiswaBulk':
      return { data: args[0] };
    case 'processIndividualPromotion':
      return { asal: args[0], tujuan: args[1], promoData: args[2] };
    case 'processGradePromotion':
      return { mapping: args[0] };
    case 'getMonthlyReportData':
      return { token: args[0], bulan: args[1], tahun: args[2], kelas: args[3], mapel: args[4], kelas_guru: args[5] };
    case 'getAttendanceStats':
      return { token: args[0], periode: args[1], kelas: args[2] };
    case 'getAttendanceStatsGuru':
      return { token: args[0], periode: args[1] };
    case 'scanAbsensi':
      return { nisn: args[0], tanggal: args[1] };
    case 'scanAbsensiGuru':
      return { nip: args[0], tanggal: args[1] };
    case 'getAbsensiToday':
    case 'getAbsensiList':
      return { tanggal: args[0], kelas: args[1] };
    case 'getAbsensiGuruList':
      return { tanggal: args[0] };
    case 'addGuru':
      return { token: args[0], username: args[1], password: args[2], kelas: args[3], nip: args[4], role: args[5], kelasWali: args[6], mengajar: args[7] };
    case 'updateGuru':
      return { token: args[0], oldUsername: args[1], username: args[2], password: args[3], kelas: args[4], nip: args[5], role: args[6], kelasWali: args[7], mengajar: args[8] };
    case 'getGuruMengajarList':
      return { token: args[0], nip: args[1] };
    case 'setGuruMengajarList':
      return { token: args[0], nip: args[1], assignments: args[2] };
    case 'setKelasWali':
      return { token: args[0], nip: args[1], kelasWali: args[2] };
    case 'deleteGuru':
      return { token: args[0], username: args[1] };
    case 'syncGuruRoles':
      return { token: args[0] };
    case 'addProfilGuru':
      return { token: args[0], profilData: args[1] };
    case 'updateProfilGuru':
      return { token: args[0], oldNip: args[1], profilData: args[2] };
    case 'deleteProfilGuru':
      return { token: args[0], nip: args[1] };
    case 'addHariLibur':
      return { tanggal: args[0], keterangan: args[1] };
    case 'addHariLiburRange':
      return { tanggal_mulai: args[0], tanggal_akhir: args[1], keterangan: args[2] };
    case 'updateHariLibur':
      return { oldDate: args[0], newDate: args[1], newKeterangan: args[2] };
    case 'importHariLiburBulk':
      return { data: args[0] };
    case 'deleteHariLibur':
      return { id: args[0], tanggal: args[0] };
    case 'ajukanIzinSiswa':
      if (typeof args[0] === 'object' && args[0] !== null) {
        return { token: localStorage.getItem('siakad_token') || '', izinData: args[0], ...args[0] };
      }
      return { token: args[0], tanggal: args[1], jenis: args[2], keterangan: args[3], alasan: args[3], mapel: args[4], mataPelajaran: args[4] };
    case 'getPerizinanSiswaList':
      return { token: args[0], status: args[1], bulan: args[2], kelas: args[3] };
    case 'getPerizinanSiswaMilikSaya':
      return { token: args[0], bulan: args[1], status: args[2] };
    case 'updateStatusPerizinanSiswa':
      return { token: args[0], id: args[1], rowId: args[1], statusIzin: args[2], status: args[2], catatanAdmin: args[3], catatan: args[3] };
    case 'deletePerizinanSiswa':
      return { token: args[0], id: args[1], rowId: args[1] };
    case 'addNilai':
    case 'updateNilai':
      return { nilaiData: args[0] };
    case 'getNilaiList':
      return { token: args[0], kelas: args[1], semester: args[2] };
    case 'addJadwal':
      return { token: args[0], jadwalData: args[1] || args[0] };
    case 'updateJadwal':
      return { token: args[0], rowIndex: args[1], id: args[1], jadwalData: args[2] || args[1] };
    case 'deleteMultipleJadwal':
      return { token: args[0], rows: args[1] || args[0], idArray: args[1] || args[0] };
    case 'bersihkanDuplikatJadwal':
      return { token: args[0] };
    case 'importJadwalBulk':
      return { token: args[0], jadwalList: args[1] || args[0], data: args[1] || args[0] };
    case 'updateAbsensiGuruEntryByDate':
      return { token: args[0], nip: args[1], nama: args[2], tanggal: args[3], mapel: args[4], status: args[5] };
    case 'deleteAbsensiGuruEntry':
      return { token: args[0], nip: args[1], tanggal: args[2], mapel: args[3] };
    case 'updateAbsensiEntryByDate':
      return { token: args[0], nisn: args[1], nama: args[2], kelas: args[3], tanggal: args[4], mapel: args[5], status: args[6] };
    case 'deleteAbsensiEntry':
      return { token: args[0], nisn: args[1], tanggal: args[2], mapel: args[3] };
    case 'ajukanIzinGuru':
      if (typeof args[0] === 'object' && args[0] !== null) {
        return { token: localStorage.getItem('siakad_token') || '', izinData: args[0], ...args[0] };
      }
      return { token: args[0], jenis: args[1], keterangan: args[2], tanggal: args[3], tanggalIzin: args[3] };
    case 'getPerizinanList':
      return { token: args[0], status: args[1], bulan: args[2] };
    case 'updateStatusPerizinan':
      return { token: args[0], id: args[1], rowId: args[1], status: args[2], statusIzin: args[2], catatan: args[3], catatanAdmin: args[3] };
    case 'deletePerizinan':
      return { token: args[0], id: args[1], rowId: args[1] };
    case 'addPrestasi':
      return { token: args[0], prestasiData: args[1] !== undefined ? args[1] : args[0] };
    case 'updatePrestasi':
      return { token: args[0], id: args[1], prestasiData: args[2] };
    case 'deletePrestasi':
      return { token: args[0], id: args[1] };
    case 'addInventaris':
      return { token: args[0], inventarisData: args[1] !== undefined ? args[1] : args[0] };
    case 'updateInventaris':
      return { token: args[0], oldKode: args[1], inventarisData: args[2] };
    case 'deleteInventaris':
      return { token: args[0], kode: args[1] };
    case 'getPrestasiList':
      return { token: args[0] };
    case 'getInventarisList':
      return { token: args[0] };
    case 'deleteMultiplePrestasi':
      return { token: args[0], ids: args[1] };
    case 'deleteMultipleInventaris':
      return { token: args[0], ids: args[1] };
    case 'importPrestasiBulk':
      return { data: args[0] };
    case 'importInventarisBulk':
      return { data: args[0] };
    case 'getMapelDariGuru':
      return { token: args[0] };
    case 'saveAppConfig':
      return { configData: args[0], data: args[0] };
    case 'addKelas':
      return { namaKelas: args[0], nama: args[0] };
    case 'updateKelas':
      return { rowIndex: args[0], id: args[0], namaBaru: args[1], nama: args[1] };
    case 'deleteKelas':
      return { rowIndex: args[0], id: args[0], namaKelas: args[1], nama: args[1] };
    case 'setWaliKelas':
      return { token: args[0], namaKelas: args[1], waliUsername: args[2] };
    case 'addMapel':
      return { namaMapel: args[0], nama: args[0] };
    case 'updateMapel':
      return { rowIndex: args[0], id: args[0], namaBaru: args[1], nama: args[1] };
    case 'deleteMapel':
      return { rowIndex: args[0], id: args[0], namaMapel: args[1], nama: args[1] };
    case 'deleteAlumni':
      return { token: args[0], nisn: args[1] };
    case 'deleteMultipleAlumni':
      return { token: args[0], nisnArray: args[1], ids: args[1] };
    case 'deleteMultipleGuru':
      return { token: args[0], usernameArray: args[1], ids: args[1] };
    case 'deleteMultipleProfilGuru':
      return { token: args[0], nipArray: args[1], ids: args[1] };
    case 'deleteNilai':
      return { token: args[0], id: args[1] };
    case 'deleteMultipleNilai':
      return { token: args[0], ids: args[1] || args[0], idArray: args[1] || args[0] };
    case 'ajukanIzinGuru':
      return { token: args[0], jenis: args[1], keterangan: args[2], tanggal: args[3] };
    case 'getPerizinanList':
      return { token: args[0], status: args[1], bulan: args[2] };
    case 'updateStatusPerizinan':
      return { token: args[0], id: args[1], rowId: args[1], status: args[2], catatan: args[3], catatanAdmin: args[3] };
    case 'deletePerizinan':
      return { token: args[0], id: args[1], rowId: args[1] };
    case 'getInfoGuru':
      return { token: args[0] };
    case 'getSiswaForScanCache':
      return {};
    case 'getGuruForScanCache':
      return {};
    case 'batchScanAbsensi':
      return { nisnList: args[0], role: args[1], kelas: args[2], mapel: args[3], jam: args[4] };
    case 'importGuruBulk':
      return { data: args[0], formattedData: args[0] };
    case 'importProfilGuruBulk':
      return { data: args[0], formattedData: args[0] };
    case 'importNilaiBulk':
      return { token: args[0], data: args[1], formattedData: args[1] };
    case 'gantiPassword':
      return { token: args[0], passwordLama: args[1], passwordBaru: args[2] };
    case 'getMonitoringRealtime':
      // args[0] = kelas (null/string/comma-separated for guru with multiple classes)
      return { kelas: args[0] !== undefined ? args[0] : null };
    case 'getRekapAbsensiRange':
      return { token: args[0], start: args[1], end: args[2], kelas: args[3], jabatan: args[4] };
    case 'getMonitoringRealtimeGuru':
      return {};
    case 'updateAbsensiStatus':
      // args: token, nisn, nama, kelas, newStatus, [tanggal], [mapel]
      // tanggal WAJIB dikirim eksplisit (default hari ini) - jangan andalkan args[4]
      // karena args[4] berisi teks status ("Hadir"/"Izin"/dst), bukan tanggal.
      // mapel WAJIB untuk entri baru (tanpa absensi umum).
      return {
        token: args[0], nisn: args[1], nama: args[2], kelas: args[3],
        status: args[4], newStatus: args[4],
        tanggal: args[5] || ((typeof siakadTodayStr === 'function') ? siakadTodayStr() : new Date().toISOString().split('T')[0]),
        mapel: args[6] || ''
      };
    case 'getDaftarHadirByKelasAndTanggal':
      return { kelas: args[0], tanggal: args[1], mapel: args[2] };
    case 'submitDaftarHadirGuru':
      return { dataList: args[0], tanggal: args[1], namaGuru: args[2], mapel: args[3] };
    case 'getPendaftarList':
      return { token: args[0], filterStatus: args[1] || '' };
    case 'setStatusPendaftar':
      return { token: args[0], id: args[1], status: args[2] };
    case 'assignKelasPendaftar':
      return { token: args[0], id: args[1], assigned_kelas: args[2] };
    case 'hapusPendaftar':
      return { token: args[0], id: args[1] };
    case 'setStatusPendaftarMasal':
      return { token: args[0], ids: args[1], status: args[2] };
    case 'hapusPendaftarMasal':
      return { token: args[0], ids: args[1] };
    case 'getAlumniDetail':
      return { token: args[0], nisn: args[1] };

    default:
      return { data: args[0] };
  }
}

// Helper normalisasi sel Excel untuk import:
// - angka besar (NISN) dibaca sebagai string penuh
// - tanggal excel (serial number) dikonversi ke YYYY-MM-DD
function normImportCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) >= 1e9) return String(Math.round(v));
    return String(v);
  }
  if (v instanceof Date) {
    return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
  }
  return String(v).trim();
}

// Konversi tanggal Excel serial (mis. 45292) ke YYYY-MM-DD
function excelSerialToDate(v) {
  if (typeof v !== 'number' || !isFinite(v)) return '';
  const ms = Math.round((v - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Ambil nilai kolom dengan normalisasi
function importField(row, keys, isDate) {
  for (const k of keys) {
    if (row.hasOwnProperty(k)) {
      const v = row[k];
      if (isDate) {
        const s = excelSerialToDate(v);
        if (s) return s;
        return normImportCell(v);
      }
      return normImportCell(v);
    }
  }
  return '';
}

    