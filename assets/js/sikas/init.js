// sikas/init.js
// Bootstrap: panggil sikasInjectViews() untuk memasang semua view ke DOM.
// HARUS dimuat PALING TERAKHIR dari seluruh file sikas/*.js.
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

sikasInjectViews();