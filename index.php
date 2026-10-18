<?php
define('SIAKAD_NO_JSON_ERROR', true);
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/api/helpers.php';

// Verifikasi token sesi dari cookie untuk perlindungan server-side
$token = $_COOKIE['siakad_token'] ?? '';
$sess = verifyToken($pdo, $token);
$isLoggedIn = !empty($sess);
$userRole = $sess['role'] ?? '';
?>
<!DOCTYPE html>
<html lang="id">
<?php include __DIR__ . '/views/layout/head.php'; ?>
<body class="bg-gray-50 font-sans antialiased text-gray-800 selection:bg-[#1b2a4a] selection:text-white overflow-x-hidden">
<?php include __DIR__ . '/views/login.php'; ?>
<?php if ($isLoggedIn): ?>
<?php include __DIR__ . '/views/layout/shell-open.php'; ?>
<?php include __DIR__ . '/views/pages/admin-dashboard.php'; ?>
<?php include __DIR__ . '/views/pages/pendaftar.php'; ?>
<?php include __DIR__ . '/views/pages/guru-dashboard.php'; ?>
<?php include __DIR__ . '/views/pages/daftar-hadir-guru.php'; ?>
<?php include __DIR__ . '/views/pages/siswa-dashboard.php'; ?>
<?php include __DIR__ . '/views/pages/data-siswa.php'; ?>
<?php include __DIR__ . '/views/pages/data-alumni.php'; ?>
<?php include __DIR__ . '/views/pages/data-guru.php'; ?>
<?php include __DIR__ . '/views/pages/manajemen-user.php'; ?>
<?php include __DIR__ . '/views/pages/data-prestasi.php'; ?>
<?php include __DIR__ . '/views/pages/data-inventaris.php'; ?>
<?php include __DIR__ . '/views/pages/manajemen-kelas.php'; ?>
<?php include __DIR__ . '/views/pages/jadwal-pelajaran.php'; ?>
<?php include __DIR__ . '/views/pages/kelola-absen.php'; ?>
<?php include __DIR__ . '/views/pages/monitoring.php'; ?>
<?php include __DIR__ . '/views/pages/rekap-bulanan.php'; ?>
<?php include __DIR__ . '/views/pages/kenaikan-kelas.php'; ?>
<?php include __DIR__ . '/views/pages/scan-absensi.php'; ?>
<?php include __DIR__ . '/views/pages/scanner-guru.php'; ?>
<?php include __DIR__ . '/views/pages/kartu-siswa.php'; ?>
<?php include __DIR__ . '/views/pages/jadwal-siswa.php'; ?>
<?php include __DIR__ . '/views/pages/nilai-siswa.php'; ?>
<?php include __DIR__ . '/views/pages/perizinan-siswa.php'; ?>
<?php include __DIR__ . '/views/pages/perizinan-siswa-guru.php'; ?>
<?php include __DIR__ . '/views/pages/perizinan-guru.php'; ?>
<?php include __DIR__ . '/views/layout/shell-close.php'; ?>
<?php include __DIR__ . '/views/modals/ganti-password.php'; ?>
<?php endif; ?>
<?php include __DIR__ . '/views/modals/reset-password.php'; ?>
<?php include __DIR__ . '/views/modals/loading-overlay.php'; ?>
<?php include __DIR__ . '/views/layout/scripts.php'; ?>
<?php include __DIR__ . '/views/layout/qr-camera-modal.php'; ?>
</body>
</html>


