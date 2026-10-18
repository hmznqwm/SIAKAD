<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Formulir Pendaftaran Siswa Baru</title>
<link rel="icon" type="image/png" href="assets/img/logo.png">
<meta name="description" content="Formulir pendaftaran siswa baru. Isi data dengan lengkap dan wajib mengunggah berkas.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>
<link rel="stylesheet" href="assets/css/daftar.min.css?v=1">
<script>
  // Terapkan tema gelap/terang SEBELUM render agar tidak ada kedipan (FOUC).
  // Di-inline (bukan file terpisah) supaya tidak ada request jaringan ekstra
  // yang memblokir render.
  (function() {
    try {
      var saved = localStorage.getItem('siakad_theme');
      var wantDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (wantDark) document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
</script>
</head>
<body>
<?php include __DIR__ . '/views/pendaftaran/page.php'; ?>
<script src="assets/js/menu/pendaftaran.min.js?v=1"></script>
</body>
</html>

