<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>SIAKAD - SMAITA ASY-SYADZILI</title>
  <link rel="icon" type="image/png" href="assets/img/logo.png">
  <meta name="theme-color" content="#1b2a4a" id="themeColorMeta">

  <!-- Preconnect: kurangi 1 round-trip DNS+TLS ke Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- Google Fonts dimuat non-blocking (preload+swap ke stylesheet media=all),
       sama seperti pola Font Awesome di bawah. Aman karena font-family sudah
       punya fallback 'sans-serif' di tailwind.config.js, jadi tidak ada FOUC
       yang mengganggu, hanya font-swap super singkat saat font tiba. -->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"></noscript>

  <!-- theme-init di-inline (bukan file terpisah) supaya tidak ada request
       jaringan ekstra yang memblokir render, tapi tetap jalan SINKRON
       sebelum <body> dirender agar tidak ada kedipan tema gelap/terang. -->
  <script>
    (function() {
      try {
        var saved = localStorage.getItem('siakad_theme');
        var wantDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (wantDark) document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  </script>
  <!-- Tailwind sudah di-build jadi CSS statis lewat `npm run build:css` (lihat
       tailwind.config.js). Tidak ada lagi CDN JIT compiler yang jalan di
       browser, jadi tidak ada FOUC dan tidak ada script blocking di sini. -->
  <link rel="stylesheet" href="assets/css/tailwind-build.css?v=15">
  <!-- html5-qrcode, qrcodejs, Chart.js+datalabels, XLSX, dan jsPDF SEKARANG
       dimuat sesuai kebutuhan (lazy) lewat assets/js/core/lazy-libs.js,
       bukan di setiap halaman. Lihat file itu untuk daftar lib & pemicunya. -->
  <script src="assets/js/core/lazy-libs.js?v=15" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11" defer></script>
  <script src="assets/js/core/url-cleanup.js?v=15" defer></script>

  <!-- Font Awesome: load non-blocking, baru diterapkan setelah selesai -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>

  <!-- CSS aplikasi digabung jadi satu berkas minified (assets/css/app.min.css)
       untuk mengurangi jumlah request. Urutan asal (login, style, menu
       siswa-dashboard, menu manajemen-kelas, dashboard, qr-camera) tetap
       dipertahankan persis di dalam berkas gabungan agar urutan cascade CSS
       tidak berubah. Sumber asli tiap berkas TETAP ADA untuk diedit; jalankan
       `npm run build:css:app` setelah mengubahnya. -->
  <link rel="stylesheet" href="assets/css/app.min.css?v=45">
  <link rel="stylesheet" href="assets/css/tabungan-mobile.css?v=1">
  <link rel="stylesheet" href="assets/css/perizinan-mobile.css?v=2">
  <link rel="stylesheet" href="assets/css/master-mobile-cards-v25.css?v=29">

  <!-- session-init di-inline (bukan file terpisah) supaya tidak ada request
       jaringan ekstra. WAJIB tetap sinkron & document.write, posisi tidak
       boleh dipindah (mencegah flash login saat refresh). -->
  <script>
    (function() {
      var roles = ['admin','guru','walikelas','kepsek','wakel','pencatat','bendahara','siswa','alumni'];
      var valid = false;
      try {
        var s = localStorage.getItem('absensiAppSession');
        if (s) { var d = JSON.parse(s); if (d && d.success===true && d.token && roles.indexOf(d.role)>-1) valid=true; }
      } catch(e) {}
      if (valid) {
        document.write('<style>#loginPage{display:none}#dashboardContainer{display:flex!important}</style>');
      } else {
        document.write('<style>#dashboardContainer{display:none}</style>');
      }
    })();
  </script>
</head>
