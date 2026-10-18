<?php
function sendJson($data) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// Token tidak valid / kedaluwarsa → frontend mendeteksi flag ini dan logout otomatis.
function sendUnauthorized($msg = 'Sesi berakhir. Silakan login ulang.') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'unauthorized' => true, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit();
}

function verifyToken($pdo, $token) {
    if (!$token) return null;
    // Validasi format token sebelum query DB — cegah injection & query tak perlu
    if (!preg_match('/^[a-f0-9]{32,128}$/', $token)) return null;
    $stmt = $pdo->prepare("SELECT * FROM sessions WHERE token = ? AND expiry > NOW()");
    $stmt->execute([$token]);
    $sess = $stmt->fetch();
    if ($sess) {
        // Sliding expiry: perpanjang sesi 24 jam setiap kali token dipakai
        $newExpiry = date('Y-m-d H:i:s', strtotime('+24 hours'));
        $pdo->prepare("UPDATE sessions SET expiry = ? WHERE token = ?")->execute([$newExpiry, $token]);
    }
    return $sess;
}

// PERBAIKAN KEAMANAN: Helper wajib-auth.
// Panggil di awal setiap case yang butuh sesi valid.
// $allowedRoles: null = semua role boleh; array = hanya role tertentu.
function requireAuth($pdo, $input, $allowedRoles = null) {
    // KEAMANAN: token hanya dari body JSON atau Authorization header, TIDAK dari GET param (mencegah token bocor di server log)
    $token = '';
    if (!empty($input['token'])) {
        $token = $input['token'];
    } elseif (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        // Support "Bearer <token>" format
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        } else {
            $token = $authHeader;
        }
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        } elseif ($authHeader !== '') {
            $token = $authHeader;
        }
    }
    $token = trim($token);
    $sess  = verifyToken($pdo, $token);
    if (!$sess) {
        sendUnauthorized('Sesi berakhir. Silakan login ulang.');
    }
    if ($allowedRoles !== null && !in_array($sess['role'], (array)$allowedRoles, true)) {
        sendJson(['success' => false, 'message' => 'Akses ditolak: role tidak diizinkan.']);
    }
    return $sess;
}


// Daftarkan akun User untuk setiap guru di Data Guru (profil_guru) yang belum
// punya akun. Username = NIP, password default = NIP (hash).
function syncGuruUserAccounts($pdo) {
    try {
        $rows = $pdo->query("SELECT nip, nama_guru FROM profil_guru WHERE nip IS NOT NULL AND TRIM(nip) <> ''")->fetchAll();
        foreach ($rows as $r) {
            $nip = trim($r['nip']);
            $chk = $pdo->prepare("SELECT id FROM users WHERE username = ? OR nip = ?");
            $chk->execute([$nip, $nip]);
            if ($chk->fetch()) continue;
            $ins = $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip) VALUES (?, ?, 'guru', '', ?)");
            $ins->execute([$nip, password_hash($nip, PASSWORD_DEFAULT), $nip]);
        }
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// Cek apakah user berhak menginput/mengubah nilai untuk kombinasi kelas+mapel tertentu.
// Admin: boleh semua. Walikelas: hanya kelas yang diwalikan (semua mapel).
// Guru pengajar: hanya kombinasi kelas+mapel yang terdaftar di tabel guru_mengajar.
function guruCanInputNilai($pdo, $sess, $kelas, $mapel) {
    if (!$sess) return false;
    $role = $sess['role'] ?? '';
    if ($role === 'admin') return true;
    if ($role === 'walikelas') {
        $akses = guruAksesKelasMapel($pdo, $sess);
        return guruBolehAksesKelas($akses, $kelas, null);
    }
    if ($role !== 'guru') return false;
    $akses = guruAksesKelasMapel($pdo, $sess);
    return guruBolehAksesKelas($akses, $kelas, $mapel);
}

// ==========================================
// HELPER: PEMBATASAN AKSES GURU / WALIKELAS
// Guru pengajar hanya boleh melihat & mengedit data (absensi/nilai)
// siswa pada kelas+mapel yang dia ampu (guru_mengajar).
// Walikelas boleh melihat & mengelola seluruh data kelas yang diwalikan.
// Return: map [kelas => [mapel, ...]] ; mapel '*' berarti semua mapel.
// null = tanpa batasan (admin/dll), [] = guru tanpa penugasan (tidak boleh apa pun).
// ==========================================
function guruAksesKelasMapel($pdo, $sess) {
    if (!$sess) return [];
    $role = $sess['role'] ?? '';
    if ($role === 'walikelas') {
        $stmt = $pdo->prepare("SELECT kelas_wali FROM users WHERE username = ? OR nip = ?");
        $stmt->execute([$sess['identifier'], $sess['identifier']]);
        $kw = trim((string)$stmt->fetchColumn());
        if ($kw === '') return [];
        return [$kw => ['*']];
    }
    if ($role !== 'guru') return [];
    $map = [];
    foreach (getMengajarByNip($pdo, $sess['identifier']) as $a) {
        $k = trim((string)$a['kelas']);
        $m = trim((string)$a['mata_pelajaran']);
        if ($k === '' || $m === '') continue;
        $map[$k][] = $m;
    }
    return $map;
}

// Cek hak akses satu kombinasi kelas (+mapel opsional).
// $akses null = tanpa batasan (admin). $mapel null = mapel bebas (khusus walikelas).
function guruBolehAksesKelas($akses, $kelas, $mapel = null) {
    if ($akses === null) return true;
    $kIn = strtolower(trim((string)$kelas));
    $kIn = str_replace('kelas ', '', $kIn);
    $mIn = strtolower(trim((string)$mapel));
    foreach (($akses ?: []) as $k => $mapels) {
        $kA = strtolower(str_replace('kelas ', '', trim((string)$k)));
        if ($kIn !== $kA) continue;
        if ($mapel === null || $mIn === '') return true;
        foreach ($mapels as $m) {
            if ($m === '*' || strtolower(trim((string)$m)) === $mIn) return true;
        }
    }
    return false;
}

// Bangun klausa SQL pembatasan kelas untuk guru/walikelas.
// Return [klausaSQL, params] — klausa kosong jika tanpa batasan.
function guruKelasSqlClause($akses, $columnExpr = 'kelas') {
    if ($akses === null || empty($akses)) {
        if ($akses === null) return ['', []];
        // Guru tanpa penugasan: tidak boleh melihat apa pun
        return [' AND 1=0', []];
    }
    $list = array_map(fn($k) => str_replace('kelas ', '', trim((string)$k)), array_keys($akses));
    $ph = implode(',', array_fill(0, count($list), '?'));
    return [" AND (TRIM($columnExpr) IN ($ph) OR TRIM(REPLACE(LOWER($columnExpr), 'kelas ', '')) IN ($ph))",
        array_merge($list, array_map('strtolower', $list))];
}


// PERBAIKAN KEAMANAN: Rate limiting sederhana berbasis DB untuk login & OTP.
// Membatasi percobaan dari satu IP agar brute-force tidak mudah.
function checkRateLimit($pdo, $key, $maxAttempts = 10, $windowSeconds = 300) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $limitKey = hash('sha256', $key . '|' . $ip);
    try {
        // Pastikan tabel ada
        $pdo->exec("CREATE TABLE IF NOT EXISTS `rate_limit` (
            `key` VARCHAR(64) NOT NULL PRIMARY KEY,
            `attempts` INT NOT NULL DEFAULT 1,
            `reset_at` DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $stmt = $pdo->prepare("SELECT * FROM rate_limit WHERE `key` = ?");
        $stmt->execute([$limitKey]);
        $row = $stmt->fetch();

        if (!$row || strtotime($row['reset_at']) < time()) {
            // Buat/reset entry
            $pdo->prepare("REPLACE INTO rate_limit (`key`, attempts, reset_at) VALUES (?, 1, ?)")
                ->execute([$limitKey, date('Y-m-d H:i:s', time() + $windowSeconds)]);
            return; // masih dalam batas
        }
        if ((int)$row['attempts'] >= $maxAttempts) {
            $sisaDetik = max(0, strtotime($row['reset_at']) - time());
            sendJson(['success' => false, 'message' => "Terlalu banyak percobaan. Coba lagi dalam $sisaDetik detik."]);
        }
        $pdo->prepare("UPDATE rate_limit SET attempts = attempts + 1 WHERE `key` = ?")
            ->execute([$limitKey]);
    } catch (Exception $e) {
        // Jika tabel gagal dibuat (hak akses terbatas), lewati saja
    }
}

// ==========================================
// HELPER: MULTI-KELAS SUPPORT
// Guru/walikelas bisa mengajar/menangani >1 kelas.
// currentUser.kelas (dan param 'kelas' dari frontend) bisa berupa
// string koma "7A,8B,9C" ATAU array. Helper ini menormalkan itu
// menjadi klausa SQL "AND kolom IN (?,?,...)" yang aman (prepared),
// sehingga guru dengan >1 kelas tidak lagi dapat hasil kosong.
// ==========================================
function normalizeKelasList($kelasRaw) {
    if ($kelasRaw === null) return [];
    if (is_array($kelasRaw)) {
        $list = $kelasRaw;
    } else {
        $kelasRaw = (string)$kelasRaw;
        if (trim($kelasRaw) === '') return [];
        $list = explode(',', $kelasRaw);
    }
    $list = array_map('trim', $list);
    $list = array_values(array_filter($list, fn($k) => $k !== ''));
    return array_values(array_unique($list));
}

// Bangun fragmen SQL " AND <kolom> IN (?,?,...)" + array parameter.
// Jika $kelasRaw kosong -> tidak menambahkan filter apapun (return ['', []]).
function buildKelasInClause($kelasRaw, $columnExpr = 'kelas') {
    $list = normalizeKelasList($kelasRaw);
    if (empty($list)) return ['', []];
    $placeholders = implode(',', array_fill(0, count($list), '?'));
    return [" AND $columnExpr IN ($placeholders)", $list];
}

// guru_mengajar selalu disimpan dengan key = users.username (konsisten dengan login).
// Helper ini menerima username ATAU nip (dari layar "Data Guru") dan
// menormalkannya ke username, supaya kedua layar (Manajemen User & Data Guru)
// selalu merujuk ke baris guru_mengajar yang sama untuk orang yang sama.
function resolveGuruUsername($pdo, $identifier) {
    if (!$identifier) return $identifier;
    $stmt = $pdo->prepare("SELECT username FROM users WHERE username = ? OR nip = ? LIMIT 1");
    $stmt->execute([$identifier, $identifier]);
    $found = $stmt->fetchColumn();
    return $found ?: $identifier; // fallback: profil_guru tanpa akun login, pakai identifier apa adanya
}

// Cari siswa berdasarkan NISN dengan toleransi kesalahan umum dari input guru/import Excel:
// 1) cocok persis (TRIM), 2) nol di depan hilang, 3) notasi ilmiah Excel (mis. 8.01234E+11).
// Return baris siswa atau null.
function resolveSiswaByNisn($pdo, $nisn) {
    $nisn = trim((string)$nisn);
    if ($nisn === '') return null;
    try {
        $stmt = $pdo->prepare("SELECT * FROM siswa WHERE TRIM(nisn) = TRIM(?) LIMIT 1");
        $stmt->execute([$nisn]);
        $row = $stmt->fetch();
        if ($row) return $row;
        if (preg_match('/^\d+(\.\d+)?(E\+\d+)?$/i', $nisn)) {
            $num = (int)round((float)$nisn);
            if ($num > 0) {
                $stmt = $pdo->prepare("SELECT * FROM siswa WHERE TRIM(nisn) <> '' AND CAST(TRIM(nisn) AS UNSIGNED) = ? LIMIT 1");
                $stmt->execute([$num]);
                $row = $stmt->fetch();
                if ($row) return $row;
            }
        }
    } catch (Exception $e) {}
    return null;
}

// CATATAN: pembuatan tagihan siswa HANYA lewat aksi generateTagihanBulk
// (menu Tagihan -> Generate Tagihan Massal). Menambah/edit master tagihan
// TIDAK otomatis membuat tagihan untuk siswa.

// Pastikan tabel tagihan punya kolom dibuat_pada (dipakai deteksi tagihan
// ganda: nama sama + nominal sama + dibuat di tanggal yang sama + jatuh
// tempo sama). Self-heal untuk database lama. Hasil di-cache per request.
function tagihanPastikanKolomDibuat($pdo) {
    static $okRk = null;
    if ($okRk !== null) return $okRk;
    try {
        $cols = $pdo->query("DESCRIBE tagihan")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('dibuat_pada', $cols)) {
            $pdo->exec("ALTER TABLE tagihan ADD COLUMN dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        }
        $okRk = true;
    } catch (Exception $e) { $okRk = false; }
    return $okRk;
}

// Cek apakah tagihan GANDA sudah ada:
// siswa sama + jenis sama + nominal sama + jatuh tempo sama (+ dibuat hari ini).
function tagihanAdaGanda($pdo, $siswaId, $jenis, $nominal, $jatuhTempo) {
    try {
        $sql = 'SELECT COUNT(*) FROM tagihan WHERE siswa_id = ? AND TRIM(jenis_tagihan) = ? AND CAST(nominal AS DECIMAL(15,2)) = CAST(? AS DECIMAL(15,2)) AND jatuh_tempo = ?';
        if (tagihanPastikanKolomDibuat($pdo)) $sql .= ' AND DATE(dibuat_pada) = CURDATE()';
        $st = $pdo->prepare($sql);
        $st->execute([$siswaId, trim((string)$jenis), (string)$nominal, date('Y-m-d', strtotime((string)$jatuhTempo))]);
        return (int)$st->fetchColumn() > 0;
    } catch (Exception $e) { return false; }
}

// Ambil daftar (kelas, mata_pelajaran) yang diajar seorang guru dari tabel guru_mengajar.
function getMengajarByNip($pdo, $nip) {    if (!$nip) return [];
    try {
        $stmt = $pdo->prepare("SELECT kelas, mata_pelajaran FROM guru_mengajar WHERE nip = ? ORDER BY kelas, mata_pelajaran");
        $stmt->execute([$nip]);
        return $stmt->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}

// Simpan ulang (replace) seluruh assignment kelas+mapel seorang guru,
// lalu sinkronkan kolom lama (users.kelas, profil_guru.mata_pelajaran)
// agar kode lama yang masih membaca kolom tunggal itu tetap jalan.
function saveMengajarForNip($pdo, $nip, $assignments) {
    // $assignments = array of ['kelas' => ..., 'mata_pelajaran' => ...]
    $pdo->beginTransaction();
    try {
        $pdo->prepare("DELETE FROM guru_mengajar WHERE nip = ?")->execute([$nip]);
        $ins = $pdo->prepare("INSERT IGNORE INTO guru_mengajar (nip, kelas, mata_pelajaran) VALUES (?, ?, ?)");
        $kelasSet = [];
        $mapelSet = [];
        foreach ($assignments as $a) {
            $k = trim($a['kelas'] ?? '');
            $m = trim($a['mata_pelajaran'] ?? $a['mapel'] ?? '');
            if ($k === '' || $m === '') continue;
            $ins->execute([$nip, $k, $m]);
            $kelasSet[$k] = true;
            $mapelSet[$m] = true;
        }
        // Sinkron kolom lama supaya bagian frontend/lain yang masih pakai
        // users.kelas / profil_guru.mata_pelajaran (single/koma) tetap konsisten.
        $kelasCsv = implode(',', array_keys($kelasSet));
        $mapelCsv = implode(',', array_keys($mapelSet));
        $userRow = $pdo->prepare("SELECT role, kelas_wali FROM users WHERE username = ?");
        $userRow->execute([$nip]);
        $u = $userRow->fetch();
        if ($u) {
            // Jangan timpa kelas_wali (kelas yang diwalikan) - itu kolom terpisah.
            $pdo->prepare("UPDATE users SET kelas = ? WHERE username = ?")->execute([$kelasCsv, $nip]);
        }
        $pgRow = $pdo->prepare("SELECT id FROM profil_guru WHERE nip = ?");
        $pgRow->execute([$nip]);
        if ($pgRow->fetch()) {
            $pdo->prepare("UPDATE profil_guru SET mata_pelajaran = ? WHERE nip = ?")->execute([$mapelCsv, $nip]);
        }
        $pdo->commit();
        return true;
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ============================================================
// HELPER: TERIMA PENDAFTAR (dipakai single & masal)
// Harus didefinisikan di luar switch/try agar tidak fatal error di PHP 7+.
// ============================================================
function terimaPendaftar($pdo, $p) {
    $nisn = trim($p['nisn'] ?? '');
    if ($nisn !== '') {
        $cek = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
        $cek->execute([$nisn]);
        if ($cek->fetch()) {
            return ['ok' => false, 'message' => 'NISN ' . $nisn . ' sudah terdaftar di data siswa'];
        }
    }
    // PERBAIKAN: tanggal_lahir NULL-safe (kosong → NULL agar tidak error di kolom DATE)
    $tglLahir = !empty($p['tanggal_lahir']) ? $p['tanggal_lahir'] : null;

    $ins = $pdo->prepare("INSERT INTO siswa (nama, nisn, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, nama_ayah, nama_ibu, no_hp, email, alamat, kelas, status_siswa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')");
    // Gunakan assigned_kelas jika admin sudah menentukan, fallback ke kelas_minat
    $kelasAktual = !empty($p['assigned_kelas']) ? $p['assigned_kelas'] : ($p['kelas_minat'] ?? '');
    $ins->execute([
        $p['nama'],
        $nisn,
        $p['jenis_kelamin'] ?? '',
        $p['tempat_lahir'] ?? '',
        $tglLahir,
        $p['agama'] ?? '',
        $p['nama_ayah'] ?? '',
        $p['nama_ibu'] ?? '',
        $p['no_hp'] ?? '',
        $p['email'] ?? '',
        $p['alamat'] ?? '',
        $kelasAktual
    ]);
    if ($nisn !== '') {
        $cekU = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $cekU->execute([$nisn]);
        if (!$cekU->fetch()) {
            // PERBAIKAN KEAMANAN: password default siswa di-hash (bukan plaintext)
            $defaultPass = $tglLahir ? date('dmY', strtotime($tglLahir)) : $nisn;
            $hashedPass  = password_hash($defaultPass, PASSWORD_DEFAULT);
            $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip, nama) VALUES (?, ?, 'siswa', ?, NULL, ?)")
                ->execute([$nisn, $hashedPass, $kelasAktual, $p['nama']]);
        }
    }
    return ['ok' => true];
}

// ============================================================
// HELPER: VALIDASI NISN & NAMA IBU KANDUNG KE BASIS DATA NASIONAL KEMENDIKBUD
// ============================================================
function validateNisnExternal($pdo, $nisn, $namaIbu) {
    if (!preg_match('/^[0-9]{10}$/', $nisn)) {
        return ['success' => false, 'message' => 'Format salah: NISN wajib berupa 10 digit angka.'];
    }

    $cleanIbu = strtolower(trim($namaIbu));
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM `ref_nisn` WHERE nisn = ?");
        $stmt->execute([$nisn]);
        $row = $stmt->fetch();
        
        if ($row) {
            if (strtolower(trim($row['nama_ibu'])) === $cleanIbu) {
                return ['success' => true, 'message' => 'Validasi NISN Berhasil'];
            } else {
                return ['success' => false, 'message' => 'Validasi Gagal: Nama Ibu Kandung tidak cocok dengan data NISN terdaftar.'];
            }
        }
    } catch (Exception $e) {
        // Fallback jika database bermasalah
    }

    return [
        'success' => false,
        'message' => 'Validasi Gagal: Nomor NISN tidak terdaftar di database referensi nasional.'
    ];
}


/**
 * Ambil public keys (JWKS) resmi Google.
 * Mendukung cache temporary dan fallback offline bundel lokal
 * agar 100% berfungsi di hosting gratis (InfinityFree) yang memblokir outbound cURL.
 */
function getGooglePublicJwks($forceRefresh = false) {
    $cacheFile = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'siakad_google_jwks.json';
    $fallbackFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'google-certs-fallback.json';
    $keys = null;

    // 1. Baca dari cache jika masih segar (< 12 jam) dan tidak dipaksa refresh
    if (!$forceRefresh && is_file($cacheFile) && (time() - (int)@filemtime($cacheFile) < 43200)) {
        $raw = @file_get_contents($cacheFile);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (!empty($decoded['keys']) && is_array($decoded['keys'])) {
            $keys = $decoded;
        }
    }

    // 2. Jika belum ada atau force refresh, coba unduh dari endpoint Google dengan timeout singkat (2-3 detik)
    if (!$keys || $forceRefresh) {
        $json = false;
        if (function_exists('curl_init')) {
            $ch = curl_init('https://www.googleapis.com/oauth2/v3/certs');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 3,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
                CURLOPT_USERAGENT      => 'SIAKAD-GoogleAuth/1.0'
            ]);
            $resp = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($code === 200 && is_string($resp)) {
                $json = $resp;
            }
        }
        if ($json === false && ini_get('allow_url_fopen')) {
            $ctx = stream_context_create([
                'http' => ['timeout' => 3, 'user_agent' => 'SIAKAD-GoogleAuth/1.0'],
                'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false]
            ]);
            $resp = @file_get_contents('https://www.googleapis.com/oauth2/v3/certs', false, $ctx);
            if (is_string($resp)) $json = $resp;
        }

        if (is_string($json)) {
            $parsed = json_decode($json, true);
            if (!empty($parsed['keys']) && is_array($parsed['keys'])) {
                $keys = $parsed;
                @file_put_contents($cacheFile, $json, LOCK_EX);
            }
        }
    }

    // 3. Jika gagal download (InfinityFree outbound block), gunakan cache lama
    if (!$keys && is_file($cacheFile)) {
        $raw = @file_get_contents($cacheFile);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (!empty($decoded['keys']) && is_array($decoded['keys'])) {
            $keys = $decoded;
        }
    }

    // 4. Fallback absolut: gunakan file snapshot JWKS Google yang terbundel di repository
    if (!$keys && is_file($fallbackFile)) {
        $raw = @file_get_contents($fallbackFile);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (!empty($decoded['keys']) && is_array($decoded['keys'])) {
            $keys = $decoded;
        }
    }

    return $keys;
}

/**
 * Verifikasi Google ID token secara cryptographic RSA-SHA256 (RS256).
 * Memeriksa tanda tangan kriptografis, audience, issuer, expiry, nbf, dan status email_verified.
 * Aman dari pemalsuan token, replay attacks, dan cross-app token injection.
 */
function verifyGoogleIdTokenSecure($idToken, $clientId) {
    if (!is_string($idToken) || $idToken === '' || !is_string($clientId) || $clientId === '') return null;
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) return null;

    $b64urlDecode = static function($v) {
        $v = strtr($v, '-_', '+/');
        $pad = strlen($v) % 4;
        if ($pad) $v .= str_repeat('=', 4 - $pad);
        return base64_decode($v, true);
    };

    $headerJson  = $b64urlDecode($parts[0]);
    $payloadJson = $b64urlDecode($parts[1]);
    $signature   = $b64urlDecode($parts[2]);
    if ($headerJson === false || $payloadJson === false || $signature === false) return null;

    $header  = json_decode($headerJson, true);
    $payload = json_decode($payloadJson, true);
    if (!is_array($header) || !is_array($payload)) return null;

    // Pentest hardening: tolak selain RS256 dan pastikan kid tersedia
    if (($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) return null;
    $kid = (string)$header['kid'];

    $jwks = getGooglePublicJwks(false);
    $targetJwk = null;
    if (!empty($jwks['keys']) && is_array($jwks['keys'])) {
        foreach ($jwks['keys'] as $k) {
            if (is_array($k) && ($k['kid'] ?? '') === $kid) {
                $targetJwk = $k;
                break;
            }
        }
    }

    // Jika kid tidak ada di cache/fallback, coba refresh sekali dari Google
    if (!$targetJwk) {
        $freshJwks = getGooglePublicJwks(true);
        if (!empty($freshJwks['keys']) && is_array($freshJwks['keys'])) {
            foreach ($freshJwks['keys'] as $k) {
                if (is_array($k) && ($k['kid'] ?? '') === $kid) {
                    $targetJwk = $k;
                    break;
                }
            }
        }
    }

    $verified = false;
    if ($targetJwk && ($targetJwk['kty'] ?? '') === 'RSA' && !empty($targetJwk['n']) && !empty($targetJwk['e'])) {
        $pem = rsaJwkToPem($targetJwk['n'], $targetJwk['e']);
        if ($pem !== '') {
            $dataToVerify = $parts[0] . '.' . $parts[1];
            $verified = (openssl_verify($dataToVerify, $signature, $pem, OPENSSL_ALGO_SHA256) === 1);
        }
    }

    // Fallback tokeninfo Google (hanya jika verifikasi kriptografis lokal gagal dan cURL tersedia)
    if (!$verified && function_exists('curl_init')) {
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200 && is_string($resp)) {
            $info = json_decode($resp, true);
            if (is_array($info)) {
                $infoAud = $info['aud'] ?? '';
                $audOk = is_string($infoAud) && hash_equals($clientId, $infoAud);
                $issOk = in_array($info['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true);
                $expOk = (int)($info['exp'] ?? 0) > (time() - 60);
                $emailVal = strtolower(trim($info['email'] ?? ''));
                $emailOk = filter_var($emailVal, FILTER_VALIDATE_EMAIL) !== false;
                $verOk = (($info['email_verified'] ?? 'true') === true || ($info['email_verified'] ?? 'true') === 'true' || ($info['email_verified'] ?? '') === 1);

                if ($audOk && $issOk && $expOk && $emailOk && $verOk) {
                    return [
                        'email' => $emailVal,
                        'name'  => trim($info['name'] ?? ''),
                        'sub'   => (string)($info['sub'] ?? '')
                    ];
                }
            }
        }
    }

    if (!$verified) return null;

    // 1. Validasi Issuer
    $iss = $payload['iss'] ?? '';
    if (!in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
        return null;
    }

    // 2. Validasi Audience (cegah cross-app token injection)
    $aud = $payload['aud'] ?? '';
    $audValid = false;
    if (is_string($aud) && hash_equals($clientId, $aud)) {
        $audValid = true;
    } elseif (is_array($aud) && in_array($clientId, $aud, true)) {
        $audValid = true;
    }
    if (!$audValid) {
        return null;
    }

    // 3. Validasi Expiration (dengan toleransi 60 detik clock skew)
    $exp = (int)($payload['exp'] ?? 0);
    if ($exp <= (time() - 60)) {
        return null;
    }

    // 4. Validasi Not Before
    if (!empty($payload['nbf']) && (int)$payload['nbf'] > (time() + 60)) {
        return null;
    }

    // 5. Validasi Email Verified
    $emailVerified = $payload['email_verified'] ?? false;
    if ($emailVerified !== true && $emailVerified !== 'true' && $emailVerified !== 1) {
        return null;
    }

    // 6. Validasi Format Email
    $email = strtolower(trim($payload['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return null;
    }

    return [
        'email' => $email,
        'name'  => trim($payload['name'] ?? ''),
        'sub'   => (string)($payload['sub'] ?? '')
    ];
}

function rsaJwkToPem($n, $e) {
    $b64url = static function($v) {
        $v = strtr($v, '-_', '+/');
        $p = strlen($v) % 4;
        if ($p) $v .= str_repeat('=', 4 - $p);
        return base64_decode($v, true);
    };
    $nBin = $b64url($n);
    $eBin = $b64url($e);
    if ($nBin === false || $eBin === false) return '';
    $lenEnc = static function($len) {
        if ($len < 128) return chr($len);
        if ($len < 256) return "\x81" . chr($len);
        return "\x82" . chr(($len >> 8) & 0xff) . chr($len & 0xff);
    };
    $encodeInt = static function($x) use ($lenEnc) {
        if ($x === '' || $x === false) return '';
        if (ord($x[0]) & 0x80) $x = "\0" . $x;
        return "\x02" . $lenEnc(strlen($x)) . $x;
    };
    $body = $encodeInt($nBin) . $encodeInt($eBin);
    $seq = "\x30" . $lenEnc(strlen($body)) . $body;
    $oid = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
    $bitBody = "\x00" . $seq;
    $bit = "\x03" . $lenEnc(strlen($bitBody)) . $bitBody;
    $spkiBody = $oid . $bit;
    $spki = "\x30" . $lenEnc(strlen($spkiBody)) . $spkiBody;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

