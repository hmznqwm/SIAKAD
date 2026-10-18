// ============================================================
// SIAKAD - Lazy loader untuk library pihak ketiga yang berat
// ============================================================
// Dulu semua library ini (Chart.js, XLSX/SheetJS, jsPDF,
// html5-qrcode, qrcodejs) dimuat di <head> di SETIAP halaman,
// padahal cuma dipakai di halaman/fitur tertentu (grafik dashboard,
// export/import Excel, cetak PDF, scan QR). Ini bikin "unused
// JavaScript" besar di laporan performa.
//
// Sekarang library-library itu baru diminta lewat jaringan saat
// fiturnya benar-benar dipakai, lewat window.ensureLib('nama').
// Hasilnya di-cache (Promise) supaya dipanggil berkali-kali tetap
// cuma download sekali per kunjungan halaman.
//
// Cara pakai di file lain (lihat contoh di script.js / sikas.js):
//   async function downloadTemplate(type) {
//       await ensureLib('xlsx');
//       ... kode asli yang pakai XLSX ...
//   }
(function () {
  var cache = {};

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('Gagal memuat: ' + src)); };
      document.head.appendChild(el);
    });
  }

  function loadScripts(sources) {
    // Berurutan (bukan Promise.all) supaya plugin yang butuh library
    // intinya lebih dulu (mis. datalabels butuh Chart) selalu aman.
    return sources.reduce(function (p, src) {
      return p.then(function () { return loadScript(src); });
    }, Promise.resolve());
  }

  var LIBS = {
    xlsx: function () {
      return loadScript('https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js');
    },
    jspdf: function () {
      return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    },
    chartjs: function () {
      return loadScripts([
        'assets/js/vendor/chart.umd.min.js?v=1',
        'assets/js/vendor/chartjs-plugin-datalabels.min.js?v=1'
      ]);
    },
    html5qrcode: function () {
      return loadScript('https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js');
    },
    qrcodejs: function () {
      return loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');
    }
  };

  window.ensureLib = function (name) {
    if (!LIBS[name]) return Promise.reject(new Error('Lib tidak dikenal: ' + name));
    if (!cache[name]) cache[name] = LIBS[name]();
    return cache[name];
  };
})();
