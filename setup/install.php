<?php
// setup/install.php - Inisialisasi database SIAKAD UNTUK HOSTING
// ============================================================
// CARA PAKAI:
// 1. Upload semua file project ke hosting (public_html).
// 2. Isi kredensial database di config.php (atau set env DB_HOST,
//    DB_NAME, DB_USER, DB_PASS di panel hosting).
// 3. Buat database di cPanel (misal: siakad_db), lalu set env:
//    INSTALL_SECRET=<string_panjang_acak_Anda>
//    kemudian buka: https://domainanda.com/setup/install.php?secret=<string_itu>
// 4. SETELAH SELESAI, HAPUS file setup/install.php dari server!
// ============================================================

// PERBAIKAN KEAMANAN: secret key tidak lagi hardcoded.
// Set environment variable INSTALL_SECRET di panel hosting Anda
// sebelum menjalankan halaman ini.
$secretEnv = getenv('INSTALL_SECRET');
if ($secretEnv === false || $secretEnv === '') {
    http_response_code(403);
    die("403 Forbidden\n\nSet environment variable INSTALL_SECRET terlebih dahulu di panel hosting,\nlalu akses: setup/install.php?secret=<nilai_INSTALL_SECRET_Anda>\n");
}

if (!isset($_GET['secret']) || !hash_equals($secretEnv, $_GET['secret'])) {
    http_response_code(403);
    die('403 Forbidden - Secret tidak valid.');
}

define('SIAKAD_NO_JSON_ERROR', true);

// Pakai kredensial dari config.php (bukan hardcode)
require_once __DIR__ . '/includes/config.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    // Schema: tabel-tabel inti SIAKAD
    $schemaFile = __DIR__ . '/includes/schema.sql';
    if (!file_exists($schemaFile)) {
        die("ERROR: schema.sql tidak ditemukan.\n");
    }
    $sql = file_get_contents($schemaFile);

    $statements = array_filter(
        array_map('trim', preg_split('/;\s*$/m', $sql)),
        fn($s) => $s !== '' &&
            !preg_match('/^--/', $s) &&
            // Hosting: db sudah dibuat via cPanel; koneksi sudah ke db yang benar
            !preg_match('/^CREATE\s+DATABASE/i', $s) &&
            !preg_match('/^USE\s+/i', $s)
    );

    $ok = 0; $skip = 0;
    foreach ($statements as $stmt_sql) {
        if (empty(trim($stmt_sql))) continue;
        try {
            $pdo->exec($stmt_sql);
            $ok++;
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'Duplicate column') !== false ||
                strpos($e->getMessage(), 'already exists') !== false) {
                $skip++;
            } else {
                echo "SKIP: " . substr(trim($stmt_sql), 0, 80) . "...\n";
                echo "  -> " . $e->getMessage() . "\n";
                $skip++;
            }
        }
    }
    echo "Schema dijalankan: $ok berhasil, $skip dilewati.\n";

    echo "\nSELESAI! Database SIAKAD siap digunakan.\n";
    echo "\nSEGERA ganti password akun admin dan bendahara melalui panel aplikasi.\n";
    echo "(Jangan gunakan password default yang ada di schema.sql)\n";
    echo "\nSilakan buka: https://" . ($_SERVER['HTTP_HOST'] ?? 'domainanda.com') . "/index.html\n";
    echo "\nPENTING: Hapus setup/install.php setelah selesai!\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}