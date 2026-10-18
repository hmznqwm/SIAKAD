<?php
// api.php - REST API Endpoint untuk SIAKAD MySQL (Synchronized, Multi-Role Login, Rekap & Kenaikan Kelas)
error_reporting(0);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
require_once 'includes/config.php';

// ============================================================
// AUTO-MIGRATION: Tambah kolom baru jika belum ada di database
// Aman dijalankan berulang kali (cek information_schema dulu).
// ============================================================
(function() use ($pdo) {
    $db = $pdo->query("SELECT DATABASE()")->fetchColumn();
    $migrations = [
        ['users',           'kelas_wali',    "VARCHAR(50)  DEFAULT NULL COMMENT 'Kelas yang diwalikan (homeroom)'"],
        ['users',           'nama',          "VARCHAR(150) DEFAULT NULL"],
        ['perizinan_siswa', 'jenis',         "VARCHAR(50)  DEFAULT 'Izin'"],
        ['kelas_master',    'wali_kelas',    "VARCHAR(100) DEFAULT NULL COMMENT 'username dari tabel users'"],
        ['profil_guru',     'jenis_kelamin', "VARCHAR(20)  DEFAULT NULL"],
        ['profil_guru',     'tanggal_lahir', "DATE         DEFAULT NULL"],
        ['profil_guru',     'agama',         "VARCHAR(30)  DEFAULT NULL"],
        ['profil_guru',     'alamat',        "TEXT         DEFAULT NULL"],
        ['profil_guru',     'nama_ayah',     "VARCHAR(100) DEFAULT NULL"],
        ['profil_guru',     'nama_ibu',      "VARCHAR(100) DEFAULT NULL"],
        ['siswa',           'foto',          "LONGTEXT DEFAULT NULL COMMENT 'Foto profil siswa (base64 atau path)'"],
        ['siswa',           'tempat_lahir',  "VARCHAR(100) DEFAULT NULL"],
        ['siswa',           'password_custom', "VARCHAR(255) DEFAULT NULL COMMENT 'Password custom hasil reset (jika ada)'"],
        ['siswa',           'email',           "VARCHAR(100) DEFAULT NULL COMMENT 'Email untuk login Google'"],
        ['profil_guru',     'email',           "VARCHAR(100) DEFAULT NULL COMMENT 'Email untuk login Google'"],
        ['users',           'email',           "VARCHAR(100) DEFAULT NULL COMMENT 'Email untuk login Google (admin/bendahara/staff)'"],
    ];
    $check = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?"
    );
    foreach ($migrations as [$tbl, $col, $def]) {
        $check->execute([$db, $tbl, $col]);
        if ((int)$check->fetchColumn() === 0) {
            try {
                $pdo->exec("ALTER TABLE `$tbl` ADD COLUMN `$col` $def");
            } catch (Exception $e) {
                // Kolom mungkin sudah ditambah secara paralel; abaikan.
            }
        }
    }
    // Tabel tabungan siswa (auto-create aman dijalankan berulang)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `tabungan` (
            `id` VARCHAR(40) NOT NULL PRIMARY KEY,
            `siswa_id` VARCHAR(20) NOT NULL,
            `saldo` DECIMAL(12,2) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uq_tabungan_siswa` (`siswa_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `tabungan_transaksi` (
            `id` VARCHAR(40) NOT NULL PRIMARY KEY,
            `tabungan_id` VARCHAR(40) NOT NULL,
            `tipe` VARCHAR(10) NOT NULL DEFAULT 'setor',
            `nominal` DECIMAL(12,2) NOT NULL DEFAULT 0,
            `keterangan` VARCHAR(200) DEFAULT NULL,
            `tanggal` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `petugas` VARCHAR(100) DEFAULT NULL,
            KEY `idx_tabungan_transaksi` (`tabungan_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `password_resets` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `identifier` VARCHAR(100) NOT NULL,
            `role` VARCHAR(20) NOT NULL DEFAULT 'siswa',
            `email` VARCHAR(255) NOT NULL,
            `otp` VARCHAR(10) NOT NULL,
            `expires_at` DATETIME NOT NULL,
            `used` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY `idx_resets_identifier` (`identifier`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `pendaftar` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `nama` VARCHAR(150) NOT NULL,
            `nisn` VARCHAR(50) DEFAULT NULL,
            `jenis_kelamin` VARCHAR(20) DEFAULT NULL,
            `tempat_lahir` VARCHAR(100) DEFAULT NULL,
            `tanggal_lahir` DATE DEFAULT NULL,
            `agama` VARCHAR(30) DEFAULT NULL,
            `nama_ayah` VARCHAR(150) DEFAULT NULL,
            `nama_ibu` VARCHAR(150) DEFAULT NULL,
            `no_hp` VARCHAR(30) DEFAULT NULL,
            `email` VARCHAR(255) DEFAULT NULL,
            `alamat` TEXT DEFAULT NULL,
            `kelas_minat` VARCHAR(50) DEFAULT NULL,
            `berkas` VARCHAR(500) DEFAULT NULL,
            `status` VARCHAR(20) NOT NULL DEFAULT 'Menunggu',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY `idx_pendaftar_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `ref_nisn` (
            `nisn` VARCHAR(50) NOT NULL PRIMARY KEY,
            `nama_ibu` VARCHAR(150) NOT NULL,
            `nama_siswa` VARCHAR(150) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        
        $checkRef = $pdo->query("SELECT COUNT(*) FROM `ref_nisn`")->fetchColumn();
        if ((int)$checkRef === 0) {
            $seeds = [
                ['3055941306', 'Euis Trihartati', 'Hamizan Qowiem'],
                ['3055949999', 'Euis Trihartati', 'Ppppp'],
                ['0123456789', 'Siti', 'Ahmad Fauzi'],
                ['0098765432', 'Budi', 'Budi Handoko']
            ];
            $stmt = $pdo->prepare("INSERT INTO `ref_nisn` (nisn, nama_ibu, nama_siswa) VALUES (?, ?, ?)");
            foreach ($seeds as $s) {
                $stmt->execute($s);
            }
        }
    } catch (Exception $e) {}
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM pendaftar")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('berkas', $cols)) {
            $pdo->exec("ALTER TABLE `pendaftar` ADD COLUMN `berkas` VARCHAR(500) DEFAULT NULL AFTER `kelas_minat`");
        }
        if (!in_array('assigned_kelas', $cols)) {
            $pdo->exec("ALTER TABLE `pendaftar` ADD COLUMN `assigned_kelas` VARCHAR(50) DEFAULT NULL COMMENT 'Kelas yang ditentukan admin sebelum menerima' AFTER `berkas`");
        }
    } catch (Exception $e) {}
})();
// ============================================================

// ── Batasi ukuran request body (cegah DoS via body besar) ──
$rawInput = '';
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 2 * 1024 * 1024) { // Maks 2MB
    http_response_code(413);
    echo json_encode(['success' => false, 'message' => 'Request terlalu besar.']);
    exit;
}
$rawInput = file_get_contents('php://input');

// Tolak jika JSON tidak valid (kecuali multipart/form-data)
$input = [];
if ($rawInput !== '') {
    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        $input = []; // Abaikan body rusak, jangan error
    }
}

// Bersihkan semua nilai string di input dari whitespace ekstra
array_walk_recursive($input, function(&$val) {
    if (is_string($val)) $val = trim($val);
});

// Tentukan action yang dipanggil — HANYA dari sumber terpercaya
$action = '';
if (isset($_GET['action'])) {
    $action = trim($_GET['action']);
} elseif (isset($input['action'])) {
    $action = trim($input['action']);
} elseif (isset($_POST['action'])) {
    $action = trim($_POST['action']);
}

// Validasi action: hanya huruf, angka, underscore — cegah path traversal / injection
if (!preg_match('/^[a-zA-Z0-9_]{1,60}$/', $action)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action tidak valid.']);
    exit;
}

// PERBAIKAN KEAMANAN: Validasi CSRF via Origin header
// Dilewati di localhost/XAMPP, aktif di production hosting
(function() use ($action) {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    // Deteksi lingkungan lokal (XAMPP, Laragon, dll) — skip CSRF check
    $isLocal = in_array($host, ['localhost', '127.0.0.1'], true)
        || str_contains($host, 'localhost')
        || str_contains($host, '127.0.0.');
    if ($isLocal) return;

    $publicActions = ['login', 'loginGoogle', 'requestResetPassword', 'verifyResetOtp',
                      'setNewPassword', 'daftarPendaftar', 'getAppConfig', 'submitPendaftaran',
                      'validateNisn'];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $origin     = $_SERVER['HTTP_ORIGIN'] ?? '';
        $referer    = $_SERVER['HTTP_REFERER'] ?? '';
        $originHost = parse_url($origin, PHP_URL_HOST) ?? '';
        $refererHost = parse_url($referer, PHP_URL_HOST) ?? '';

        // Untuk loginGoogle, pastikan request berasal dari domain yang sama jika Origin dikirimkan browser
        if ($action === 'loginGoogle' && $origin !== '') {
            if ($originHost !== $host && !str_contains($host, $originHost)) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Permintaan ditolak: origin tidak valid.']);
                exit;
            }
        }

        // Blokir action non-publik jika origin ada dan tidak cocok, DAN referer tidak cocok
        if (!in_array($action, $publicActions, true)) {
            if ($origin !== '' && $originHost !== $host && $refererHost !== $host) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Permintaan ditolak: origin tidak valid.']);
                exit;
            }
        }
    }
})();


require_once __DIR__ . '/includes/api/helpers.php';

// ============================================================
// CENTRAL AUTHENTICATION GATE
// Semua action API harus melewati autentikasi server-side,
// kecuali action yang memang diperlukan sebelum login.
// Handler tetap bertanggung jawab atas authorization/ownership
// yang lebih spesifik.
// ============================================================
$publicApiActions = [
    'login', 'loginGoogle', 'logout',
    'requestResetPassword', 'verifyResetOtp', 'setNewPassword',
    'getAppConfig', 'getModeAbsen', 'validateNisn',
    'submitPendaftaran',
];
if (!in_array($action, $publicApiActions, true)) {
    requireAuth($pdo, $input);
}

// Akses data sensitif: batasi role yang memang memerlukannya.
$restrictedReadActions = [
    'getSiswaList' => ['admin','guru','walikelas','kepsek','wakel'],
    'getPrestasiList' => ['admin'],
    'getInventarisList' => ['admin'],
    'getAlumniList' => ['admin'],
    'getAlumniDetail' => ['admin'],
];
if (isset($restrictedReadActions[$action])) {
    requireAuth($pdo, $input, $restrictedReadActions[$action]);
}

// Action administrasi yang mengubah data master wajib admin.
$adminOnlyActions = [
    'addSiswa','updateSiswa','deleteSiswa','deleteMultipleSiswa','importSiswaBulk',
    'addGuru','updateGuru','deleteGuru','deleteMultipleGuru','importGuruBulk','importProfilGuruBulk',
    'addKelas','updateKelas','setWaliKelas','deleteKelas','addMapel','updateMapel','deleteMapel',
    'addJadwal','updateJadwal','deleteMultipleJadwal','bersihkanDuplikatJadwal','importJadwalBulk',
    'addPrestasi','updatePrestasi','deletePrestasi','deleteMultiplePrestasi','importPrestasiBulk',
    'addInventaris','updateInventaris','deleteInventaris','deleteMultipleInventaris','importInventarisBulk',
    'processIndividualPromotion','processGradePromotion','deleteAlumni','deleteMultipleAlumni',
    'setStatusPendaftar','assignKelasPendaftar','setStatusPendaftarMasal','hapusPendaftar','hapusPendaftarMasal',
    'archiveAndResetYear','saveAppConfig','setModeAbsen','addHariLiburRange','addHariLibur','updateHariLibur','deleteHariLibur','importHariLiburBulk'
];
if (in_array($action, $adminOnlyActions, true)) {
    $adminSess = requireAuth($pdo, $input, ['admin']);
}

try {
    $apiGroupMap = [
        'login' => 'auth',
        'logout' => 'auth',
        'loginGoogle' => 'auth',
        'verifyUser' => 'auth',
        'gantiPassword' => 'auth',
        'myGoogleEmail' => 'auth',
        'requestResetPassword' => 'auth',
        'verifyResetOtp' => 'auth',
        'setNewPassword' => 'auth',
        'getSiswaList' => 'siswa',
        'getSiswaByKelas' => 'siswa',
        'getSiswaByNisn' => 'siswa',
        'updateFotoSiswa' => 'siswa',
        'addSiswa' => 'siswa',
        'updateSiswa' => 'siswa',
        'deleteSiswa' => 'siswa',
        'deleteMultipleSiswa' => 'siswa',
        'importSiswaBulk' => 'siswa',
        'getSiswaForScanCache' => 'siswa',
        'processIndividualPromotion' => 'alumni',
        'processGradePromotion' => 'alumni',
        'getAlumniList' => 'alumni',
        'getAlumniDetail' => 'alumni',
        'getDaftarTahunLulus' => 'alumni',
        'deleteAlumni' => 'alumni',
        'deleteMultipleAlumni' => 'alumni',
        'getGuruList' => 'guru',
        'addGuru' => 'guru',
        'updateGuru' => 'guru',
        'deleteGuru' => 'guru',
        'deleteMultipleGuru' => 'guru',
        'getProfilGuruList' => 'guru',
        'addProfilGuru' => 'guru',
        'updateProfilGuru' => 'guru',
        'deleteProfilGuru' => 'guru',
        'deleteMultipleProfilGuru' => 'guru',
        'getGuruMengajarList' => 'guru',
        'setGuruMengajarList' => 'guru',
        'setKelasWali' => 'guru',
        'syncGuruRoles' => 'guru',
        'importGuruBulk' => 'guru',
        'importProfilGuruBulk' => 'guru',
        'getInfoGuru' => 'guru',
        'getProfilSaya' => 'guru',
        'getJadwalMengajarSaya' => 'guru',
        'getGuruForScanCache' => 'guru',
        'getKelasList' => 'kelas-mapel',
        'getDaftarKelas' => 'kelas-mapel',
        'getKelasMaster' => 'kelas-mapel',
        'addKelas' => 'kelas-mapel',
        'updateKelas' => 'kelas-mapel',
        'setWaliKelas' => 'kelas-mapel',
        'deleteKelas' => 'kelas-mapel',
        'getDaftarMapel' => 'kelas-mapel',
        'getMapelDariGuru' => 'kelas-mapel',
        'getMapelMaster' => 'kelas-mapel',
        'addMapel' => 'kelas-mapel',
        'updateMapel' => 'kelas-mapel',
        'deleteMapel' => 'kelas-mapel',
        'getJadwalList' => 'kelas-mapel',
        'getJadwalHariIni' => 'kelas-mapel',
        'getJadwalByHari' => 'kelas-mapel',
        'addJadwal' => 'kelas-mapel',
        'updateJadwal' => 'kelas-mapel',
        'deleteMultipleJadwal' => 'kelas-mapel',
        'bersihkanDuplikatJadwal' => 'kelas-mapel',
        'importJadwalBulk' => 'kelas-mapel',
        'scanAbsensi' => 'absensi',
        'scanAbsensiGuru' => 'absensi',
        'getAbsensiToday' => 'absensi',
        'getAbsensiList' => 'absensi',
        'getAbsensiGuruList' => 'absensi',
        'updateAbsensiStatus' => 'absensi',
        'updateAbsensiEntryByDate' => 'absensi',
        'deleteAbsensiEntry' => 'absensi',
        'updateAbsensiGuruEntryByDate' => 'absensi',
        'deleteAbsensiGuruEntry' => 'absensi',
        'getDaftarHadirByKelasAndTanggal' => 'absensi',
        'submitDaftarHadirGuru' => 'absensi',
        'getHariLibur' => 'absensi',
        'addHariLiburRange' => 'absensi',
        'addHariLibur' => 'absensi',
        'updateHariLibur' => 'absensi',
        'importHariLiburBulk' => 'absensi',
        'deleteHariLibur' => 'absensi',
        'getAppConfig' => 'absensi',
        'getModeAbsen' => 'absensi',
        'saveAppConfig' => 'absensi',
        'setModeAbsen' => 'absensi',
        'getMonitoringRealtime' => 'absensi',
        'getRekapAbsensiRange' => 'absensi',
        'getAttendanceStats' => 'absensi',
        'getAttendanceStatsGuru' => 'absensi',
        'batchScanAbsensi' => 'absensi',
        'getNilaiList' => 'nilai',
        'addNilai' => 'nilai',
        'updateNilai' => 'nilai',
        'deleteNilai' => 'nilai',
        'deleteMultipleNilai' => 'nilai',
        'importNilaiBulk' => 'nilai',
        'getNilaiKolom' => 'nilai',
        'addNilaiKolom' => 'nilai',
        'deleteNilaiKolom' => 'nilai',
        'ajukanIzinSiswa' => 'perizinan',
        'getPerizinanSiswaList' => 'perizinan',
        'getPerizinanSiswaMilikSaya' => 'perizinan',
        'updateStatusPerizinanSiswa' => 'perizinan',
        'deletePerizinanSiswa' => 'perizinan',
        'ajukanIzinGuru' => 'perizinan',
        'getPerizinanList' => 'perizinan',
        'updateStatusPerizinan' => 'perizinan',
        'deletePerizinan' => 'perizinan',
        'getPrestasiList' => 'prestasi-inventaris',
        'addPrestasi' => 'prestasi-inventaris',
        'updatePrestasi' => 'prestasi-inventaris',
        'deletePrestasi' => 'prestasi-inventaris',
        'deleteMultiplePrestasi' => 'prestasi-inventaris',
        'importPrestasiBulk' => 'prestasi-inventaris',
        'getInventarisList' => 'prestasi-inventaris',
        'addInventaris' => 'prestasi-inventaris',
        'updateInventaris' => 'prestasi-inventaris',
        'deleteInventaris' => 'prestasi-inventaris',
        'deleteMultipleInventaris' => 'prestasi-inventaris',
        'importInventarisBulk' => 'prestasi-inventaris',
        'getStudents' => 'keuangan',
        'getBills' => 'keuangan',
        'getTransactions' => 'keuangan',
        'addStudent' => 'keuangan',
        'updateStudent' => 'keuangan',
        'deleteStudent' => 'keuangan',
        'deleteStudentsBulk' => 'keuangan',
        'addBill' => 'keuangan',
        'updateBillStatus' => 'keuangan',
        'deleteBill' => 'keuangan',
        'deleteTransaction' => 'keuangan',
        'getMasterTagihan' => 'keuangan',
        'addMasterTagihan' => 'keuangan',
        'updateMasterTagihan' => 'keuangan',
        'deleteMasterTagihan' => 'keuangan',
        'generateBulkBills' => 'keuangan',
        'processPayment' => 'keuangan',
        'getDashboardStats' => 'keuangan',
        'getTabunganList' => 'keuangan',
        'getTabunganSaya' => 'keuangan',
        'tabunganTransaksi' => 'keuangan',
        'getTabunganRiwayat' => 'keuangan',
        'hapusTabungan' => 'keuangan',
        'hapusTabunganMasal' => 'keuangan',
        'getMonthlyReportData' => 'laporan',
        'archiveAndResetYear' => 'laporan',
        'submitPendaftaran' => 'pendaftaran',
        'getPendaftarList' => 'pendaftaran',
        'setStatusPendaftar' => 'pendaftaran',
        'assignKelasPendaftar' => 'pendaftaran',
        'setStatusPendaftarMasal' => 'pendaftaran',
        'hapusPendaftar' => 'pendaftaran',
        'hapusPendaftarMasal' => 'pendaftaran',
    ];
    if (isset($apiGroupMap[$action])) {
        include __DIR__ . '/includes/api/handlers-' . $apiGroupMap[$action] . '.php';
    } else {
        sendJson(['success' => true, 'message' => 'OK']);
    }
} catch (Exception $e) {
    sendJson(['success' => false, 'message' => 'Server Error: ' . $e->getMessage()]);
}
