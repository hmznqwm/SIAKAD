// Minify SIAKAD's own JS files (script.js, sikas.js, menu/*.js, dst) into
// sibling *.min.js files. Vendor libraries (assets/js/vendor) and the tiny
// core loaders (assets/js/core) are left as-is on purpose.
//
// IMPORTANT: top-level function/variable names are kept EXACTLY as written
// (mangle.toplevel = false, the default) because a lot of markup calls
// these functions by name via onclick="..."/onchange="...". Only local
// variables inside functions get shortened. Comments and console output
// are left untouched to keep behaviour identical to the source files.
//
// Run: npm run build:js

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const ROOT = path.join(__dirname, '..');

const FILES = [
  'assets/js/core/script/core-api.js',
  'assets/js/core/script/state.js',
  'assets/js/core/script/table-state.js',
  'assets/js/core/script/navigation.js',
  'assets/js/core/script/auth.js',
  'assets/js/core/script/dashboard.js',
  'assets/js/core/script/ui-fixes.js',
  'assets/js/core/script/account-modal.js',
  'assets/js/sikas/util.js',
  'assets/js/sikas/views-template.js',
  'assets/js/sikas/dashboard.js',
  'assets/js/sikas/tagihan.js',
  'assets/js/sikas/kasir.js',
  'assets/js/sikas/riwayat.js',
  'assets/js/sikas/pengaturan.js',
  'assets/js/sikas/init.js',
  'assets/js/tabungan.js',
  'assets/js/pendaftar.js',
  'assets/js/menu/login.js',
  'assets/js/menu/dashboard-admin.js',
  'assets/js/menu/daftar-hadir.js',
  'assets/js/menu/perizinan.js',
  'assets/js/menu/jadwal-pelajaran.js',
  'assets/js/menu/kelola-absen.js',
  'assets/js/menu/data-master/core.js',
  'assets/js/menu/data-master/siswa.js',
  'assets/js/menu/data-master/alumni.js',
  'assets/js/menu/data-master/guru.js',
  'assets/js/menu/data-master/user.js',
  'assets/js/menu/data-master/prestasi.js',
  'assets/js/menu/data-master/inventaris.js',
  'assets/js/menu/monitoring.js',
  'assets/js/menu/qr-camera.js',
  'assets/js/menu/scanner.js',
  'assets/js/menu/rekap-bulanan.js',
  'assets/js/menu/kenaikan-kelas.js',
  'assets/js/menu/nilai.js',
  'assets/js/menu/jadwal-siswa.js',
  'assets/js/menu/profil-saya.js',
  'assets/js/menu/rekap-absensi.js',
  'assets/js/menu/pendaftaran.js'
];

const TERSER_OPTS = {
  compress: {
    drop_console: false,
    drop_debugger: true
  },
  mangle: {
    toplevel: false // JANGAN ganti nama fungsi/variabel top-level (dipanggil dari onclick= di HTML)
  },
  format: {
    comments: false
  }
};

(async () => {
  let totalBefore = 0;
  let totalAfter = 0;
  let failed = false;

  for (const rel of FILES) {
    const srcPath = path.join(ROOT, rel);
    const outPath = srcPath.replace(/\.js$/, '.min.js');
    const code = fs.readFileSync(srcPath, 'utf8');
    try {
      const result = await minify(code, TERSER_OPTS);
      if (!result.code) throw new Error('terser mengembalikan output kosong');
      fs.writeFileSync(outPath, result.code, 'utf8');
      totalBefore += Buffer.byteLength(code, 'utf8');
      totalAfter += Buffer.byteLength(result.code, 'utf8');
      console.log('OK  ' + rel + ' -> ' + path.basename(outPath) +
        '  (' + Buffer.byteLength(code) + ' -> ' + Buffer.byteLength(result.code) + ' bytes)');
    } catch (err) {
      failed = true;
      console.error('GAGAL ' + rel + ': ' + err.message);
    }
  }

  console.log('---');
  console.log('Total: ' + totalBefore + ' -> ' + totalAfter + ' bytes (' +
    Math.round((1 - totalAfter / totalBefore) * 100) + '% lebih kecil)');

  if (failed) process.exit(1);
})();
