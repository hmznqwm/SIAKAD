<?php
// ============================================================
// SECURITY HEADERS & CONTENT SECURITY POLICY (CSP)
// ============================================================
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff', true);
    header('X-Frame-Options: SAMEORIGIN', true);
    header('X-XSS-Protection: 1; mode=block', true);
    header('Referrer-Policy: strict-origin-when-cross-origin', true);
    header('Permissions-Policy: geolocation=(), microphone=(self), camera=(self)', true);
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.sheetjs.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com; frame-src 'self' https://accounts.google.com; object-src 'none'; base-uri 'self';", true);
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains', true);
    }
}

// ============================================================
// KONFIGURASI DATABASE - SIAKAD
// ============================================================
// CARA PAKAI (pilih salah satu):
//
// [A] LOKAL (XAMPP/Laragon): tidak perlu ubah apa-apa.
//     File ini sudah otomatis pakai 'localhost' + 'root' tanpa password.
//
// [B] HOSTING (disarankan — lebih aman):
//     Set variabel environment berikut di panel hosting
//     (cPanel → Softaculous / PHP Config, atau .env via file manager):
//       DB_HOST  = nama host database dari cPanel
//       DB_NAME  = nama database
//       DB_USER  = username database
//       DB_PASS  = password database
//     Jika env sudah diisi, nilai di bawah TIDAK akan dipakai.
//
// [C] HOSTING tanpa env (isi langsung di bawah — JANGAN commit ke repo publik):
//     Isi $_prod_db_* di bagian "NILAI FALLBACK" di bawah.
// ============================================================

// ── Deteksi lingkungan ──────────────────────────────────────
$_host = $_SERVER['HTTP_HOST']   ?? '';
$_addr = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

$_isLocal = (php_sapi_name() === 'cli')
    || in_array($_host, ['localhost', '127.0.0.1'], true)
    || str_contains($_host, 'localhost')
    || str_contains($_host, '127.0.0')
    || preg_match('/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/', $_addr);

unset($_host, $_addr);   // tidak perlu lagi di scope global

// ── NILAI FALLBACK (dipakai jika env tidak disetel) ─────────
// Lokal
$_local_db_host = 'localhost';
$_local_db_user = 'root';
$_local_db_pass = '';
$_local_db_name = 'siakad_db';

// Hosting — ganti nilai di bawah ini dengan kredensial dari cPanel
// PERBAIKAN KEAMANAN: hardcoded credential dihapus. Wajib isi via env
// atau ganti string kosong di bawah dengan nilai aktual Anda.
// JANGAN commit file ini ke repository publik jika sudah diisi.
$_prod_db_host = getenv('DB_HOST')  ?: '';
$_prod_db_user = getenv('DB_USER')  ?: '';
$_prod_db_pass = getenv('DB_PASS')  ?: '';
$_prod_db_name = getenv('DB_NAME')  ?: '';

// ── Resolusi nilai aktif ─────────────────────────────────────
$db_host = $_isLocal ? $_local_db_host : $_prod_db_host;
$db_user = $_isLocal ? $_local_db_user : $_prod_db_user;
$db_pass = $_isLocal ? $_local_db_pass : $_prod_db_pass;
$db_name = $_isLocal ? $_local_db_name : $_prod_db_name;

// Cegah startup production tanpa konfigurasi database
if (!$_isLocal && ($db_host === '' || $db_name === '' || $db_user === '')) {
    error_log('[SIAKAD] Konfigurasi database production belum diisi (DB_HOST/DB_NAME/DB_USER).');
    if (!defined('SIAKAD_NO_JSON_ERROR')) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Konfigurasi server belum lengkap.']);
    } else {
        http_response_code(503);
        echo 'Konfigurasi server belum lengkap.';
    }
    exit;
}

unset($_local_db_host, $_local_db_user, $_local_db_pass, $_local_db_name,
      $_prod_db_host,  $_prod_db_user,  $_prod_db_pass,  $_prod_db_name,
      $_isLocal);

// ============================================================
// GOOGLE LOGIN
// Isi dengan Client ID dari Google Cloud Console:
// https://console.cloud.google.com/apis/credentials
// Kosongkan string ('') untuk menonaktifkan fitur ini.
// PERBAIKAN KEAMANAN: set via env, jangan hardcode di sini.
// ============================================================
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '');

// ============================================================
// SMTP GMAIL — pengirim email OTP (Lupa Password)
// SMTP_PASS = App Password Gmail (16 huruf tanpa spasi).
// Cara buat: Google Account → Keamanan → Verifikasi 2 Langkah
//            → Sandi Aplikasi → buat sandi khusus "Mail"
// PERBAIKAN KEAMANAN: WAJIB set via environment variable.
// Jangan hardcode credential SMTP di sini.
// ============================================================
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_SECURE', strtolower(getenv('SMTP_SECURE') ?: 'tls'));

// ============================================================
// MODE APLIKASI (set APP_ENV=production di hosting)
// Dipakai untuk mencegah info debug bocor ke response
// ============================================================
define('APP_IS_LOCAL', php_sapi_name() === 'cli'
    || in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1'], true)
    || str_contains($_SERVER['HTTP_HOST'] ?? '', 'localhost')
    || (getenv('APP_ENV') === 'local'));

// ============================================================
// KONEKSI DATABASE
// ============================================================
try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    // Catat error ke log server — JANGAN tampilkan detail ke browser
    error_log('[SIAKAD] Koneksi database gagal: ' . $e->getMessage());

    if (!defined('SIAKAD_NO_JSON_ERROR')) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'Layanan sementara tidak tersedia. Silakan coba beberapa saat lagi.',
        ]);
    } else {
        http_response_code(503);
        echo 'Layanan sementara tidak tersedia. Silakan coba beberapa saat lagi.';
    }
    exit;
}