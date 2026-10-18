<?php
switch ($action) {
        case 'login':
            // PERBAIKAN KEAMANAN: Rate limiting login (max 10 percobaan per 5 menit per IP)
            checkRateLimit($pdo, 'login', 10, 300);

            $username = trim($input['username'] ?? $_POST['username'] ?? '');
            $password = trim($input['password'] ?? $_POST['password'] ?? '');
            $nisn = trim($input['nisn'] ?? $_POST['nisn'] ?? '');

            if ($username === '' && $nisn === '') {
                sendJson(['success' => false, 'message' => 'Masukkan username/NISN']);
            }
            if ($password === '') {
                sendJson(['success' => false, 'message' => 'Masukkan password']);
            }

            // 1. Login Siswa via NISN
            // Password default siswa = tanggal lahir format DDMMYYYY (misal: 15082010)
            // Jika tanggal lahir kosong, password default = NISN itu sendiri
            $searchNisn = $nisn ?: $username;
            if ($searchNisn) {
                $stmt = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ? AND status_siswa = 'aktif'");
                $stmt->execute([$searchNisn]);
                $siswa = $stmt->fetch();

                if ($siswa) {
                    $tglLahir = $siswa['tanggal_lahir'] ?? '';
                    $passwordDefault = $tglLahir
                        ? date('dmY', strtotime($tglLahir))
                        : $siswa['nisn'];
                    $customPass = $siswa['password_custom'] ?? '';
                    $passOk = false;
                    if (!empty($customPass)) {
                        // Setelah password custom dibuat, password default tidak lagi diterima.
                        $passOk = password_verify($password, $customPass);
                    } else {
                        $passOk = ($password === $passwordDefault);
                    }

                    if ($passOk) {
                        $token = bin2hex(random_bytes(32));
                        $expiry = date('Y-m-d H:i:s', strtotime('+24 hours'));

                        $ins = $pdo->prepare("INSERT INTO sessions (token, identifier, role, expiry) VALUES (?, ?, 'siswa', ?)");
                        $ins->execute([$token, $siswa['nisn'], $expiry]);

                        sendJson([
                            'success' => true,
                            'token' => $token,
                            'role' => 'siswa',
                            'username' => $siswa['nisn'],
                            'nama' => $siswa['nama'],
                            'kelas' => $siswa['kelas'],
                            'tempatLahir' => $siswa['tempat_lahir'] ?? '',
                            'tanggalLahir' => $siswa['tanggal_lahir'] ?? '',
                            'foto' => $siswa['foto'] ?? null,
                            'alamat' => $siswa['alamat'] ?? '',
                            'nip' => null,
                            'nisn' => $siswa['nisn']
                        ]);
                    } else {
                        // NISN ditemukan tapi password salah — jangan lanjut ke cek user tabel
                        sendJson(['success' => false, 'message' => 'Password salah']);
                    }
                }
            }

            // 2. Login Staff (Admin / Guru / Walikelas / Bendahara / Kepsek) via User Table
            $userFound = false;
            if ($username) {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR nip = ?");
                $stmt->execute([$username, $username]);
                $user = $stmt->fetch();

                if (!$user) {
                    // Guru terdaftar di Data Guru tapi belum punya akun User →
                    // daftarkan otomatis (username & password default = NIP), lalu coba lagi.
                    syncGuruUserAccounts($pdo);
                    $stmt->execute([$username, $username]);
                    $user = $stmt->fetch();
                }

                if ($user) {
                    $userFound = true;
                    $validPass = false;
                    $storedPass = $user['password'] ?? '';

                    if (password_verify($password, $storedPass)) {
                        // Hash bcrypt valid
                        $validPass = true;
                    } elseif (strlen($storedPass) < 60 && $storedPass === $password) {
                        // Password lama plaintext — izinkan login dan langsung upgrade ke hash
                        $newHash = password_hash($password, PASSWORD_DEFAULT);
                        $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")
                            ->execute([$newHash, $user['id']]);
                        $validPass = true;
                    }

                    if ($validPass) {
                        $token = bin2hex(random_bytes(32));
                        $expiry = date('Y-m-d H:i:s', strtotime('+24 hours'));

                        $ins = $pdo->prepare("INSERT INTO sessions (token, identifier, role, expiry) VALUES (?, ?, ?, ?)");
                        $ins->execute([$token, $user['username'], $user['role'], $expiry]);

                        // Daftar kelas+mapel yang diajar (multi kelas & multi mapel didukung).
                        $mengajar = getMengajarByNip($pdo, $user['username']);
                        $kelasMengajarList = array_values(array_unique(array_map(fn($m) => $m['kelas'], $mengajar)));
                        // 'kelas' tetap dikirim (comma-joined) untuk kompatibilitas kode lama,
                        // sekarang berisi UNION dari kelas_wali (jika ada) + semua kelas yang diajar.
                        $kelasGabungan = $kelasMengajarList;
                        if (!empty($user['kelas_wali'])) $kelasGabungan[] = $user['kelas_wali'];
                        $kelasGabungan = array_values(array_unique(array_filter($kelasGabungan)));
                        if (empty($kelasGabungan) && !empty($user['kelas'])) {
                            // Fallback: belum pernah dimigrasi ke guru_mengajar, pakai kolom lama.
                            $kelasGabungan = normalizeKelasList($user['kelas']);
                        }

                        // Jika alumni, ambil data lengkap dari tabel siswa
                        $alumniData = [];
                        if ($user['role'] === 'alumni') {
                            $stmtAl = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ? AND status_siswa = 'alumni'");
                            $stmtAl->execute([$user['username']]);
                            $rowAl = $stmtAl->fetch();
                            if ($rowAl) {
                                $alumniData = [
                                    'nisn'        => $rowAl['nisn'],
                                    'tempatLahir' => $rowAl['tempat_lahir'] ?? '',
                                    'tanggalLahir'=> $rowAl['tanggal_lahir'] ?? '',
                                    'foto'        => $rowAl['foto'] ?? null,
                                    'alamat'      => $rowAl['alamat'] ?? '',
                                    'tahunLulus'  => $rowAl['tahun_lulus'] ?? '',
                                    'kelas'       => $rowAl['kelas'] ?? '',
                                ];
                            }
                        }
                        sendJson(array_merge([
                            'success' => true,
                            'token' => $token,
                            'role' => $user['role'],
                            'username' => $user['username'],
                            'nama' => $user['nama'] ?? $user['username'],
                            'kelas' => implode(',', $kelasGabungan),
                            'kelasWali' => $user['kelas_wali'] ?? '',
                            'mengajar' => $mengajar,
                            'nip' => ($user['role'] === 'guru' || $user['role'] === 'walikelas') ? ($user['nip'] ?? $user['username'] ?? '') : null,
                            'nisn' => $user['role'] === 'alumni' ? $user['username'] : null
                        ], $alumniData));
                    }
                }
            }

            if ($userFound) {
                sendJson(['success' => false, 'message' => 'Password salah']);
            }
            sendJson(['success' => false, 'message' => 'Username/NISN tidak ditemukan']);
            break;

        // ── LOGOUT: Hapus token sesi dari DB (cegah session replay attack) ──
        case 'logout':
            $token = trim($input['token'] ?? '');
            if ($token && preg_match('/^[a-f0-9]{32,128}$/', $token)) {
                $pdo->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]);
                // Hapus juga sesi kedaluwarsa milik user yang sama (clean up)
                $stmt = $pdo->prepare("SELECT identifier FROM sessions WHERE token = ? LIMIT 1");
                $stmt->execute([$token]);
                // Token sudah dihapus, cek identifier dari query sebelum delete
            }
            // Bersihkan juga sesi yang sudah kedaluwarsa (maintenance ringan)
            try {
                $pdo->exec("DELETE FROM sessions WHERE expiry < NOW()");
            } catch (Exception $e) {}
            sendJson(['success' => true, 'message' => 'Logout berhasil']);
            break;

        case 'loginGoogle':
            // PENTEST DEFENSE: Rate limiting (max 15 percobaan per 5 menit per IP)
            checkRateLimit($pdo, 'login_google', 15, 300);

            $idToken = trim($input['idToken'] ?? $_POST['idToken'] ?? '');
            if ($idToken === '') {
                sendJson(['success' => false, 'message' => 'Token Google kosong']);
            }
            $gCfg = defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : '';
            if (empty($gCfg)) {
                sendJson(['success' => false, 'message' => 'Google Login belum dikonfigurasi pada server']);
            }

            $googleIdentity = verifyGoogleIdTokenSecure($idToken, $gCfg);
            if (!$googleIdentity) {
                sendJson(['success' => false, 'message' => 'Verifikasi token Google gagal atau kedaluwarsa. Silakan login kembali.']);
            }

            $email = strtolower(trim($googleIdentity['email']));
            $namaGoogle = trim($googleIdentity['name'] ?? '');

            // Cari akun: guru, staff/admin (users), siswa, atau alumni
            $role = '';
            $username = '';
            $nama = '';
            $kelas = '';
            $kelasWali = '';
            $mengajar = [];
            $nip = null;
            $nisn = null;
            $profileExtra = [];

            // 1) Guru: cocokkan email di profil_guru -> ambil nip -> cari akun users
            $stmt = $pdo->prepare("SELECT * FROM profil_guru WHERE LOWER(email) = ? LIMIT 1");
            $stmt->execute([$email]);
            $pg = $stmt->fetch();
            if ($pg && !empty($pg['nip'])) {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR nip = ? LIMIT 1");
                $stmt->execute([$pg['nip'], $pg['nip']]);
                $user = $stmt->fetch();
                if (!$user) {
                    syncGuruUserAccounts($pdo);
                    $stmt->execute([$pg['nip'], $pg['nip']]);
                    $user = $stmt->fetch();
                }
                if ($user) {
                    $role = $user['role'];
                    $username = $user['username'];
                    $nama = $user['nama'] ?? $pg['nama_guru'] ?? $namaGoogle;
                    $nip = $user['nip'] ?? $pg['nip'] ?? $username;
                    $mengajar = getMengajarByNip($pdo, $username);
                    $kelasMengajarList = array_values(array_unique(array_map(fn($m) => $m['kelas'], $mengajar)));
                    $kelasGabungan = $kelasMengajarList;
                    if (!empty($user['kelas_wali'])) $kelasGabungan[] = $user['kelas_wali'];
                    $kelasGabungan = array_values(array_unique(array_filter($kelasGabungan)));
                    $kelas = implode(',', $kelasGabungan);
                    $kelasWali = $user['kelas_wali'] ?? '';
                } else {
                    sendJson(['success' => false, 'message' => 'Akun login guru belum dibuat. Hubungi administrator.']);
                }
            }

            // 2) Akun users langsung (admin, bendahara, pegawai, guru yang emailnya di tabel users):
            if ($role === '') {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1");
                $stmt->execute([$email]);
                $userDirect = $stmt->fetch();
                if ($userDirect) {
                    $role = $userDirect['role'];
                    $username = $userDirect['username'];
                    $nama = $userDirect['nama'] ?? $namaGoogle;
                    if ($role === 'guru' || $role === 'walikelas') {
                        $nip = $userDirect['nip'] ?? $username;
                        $mengajar = getMengajarByNip($pdo, $username);
                        $kelasMengajarList = array_values(array_unique(array_map(fn($m) => $m['kelas'], $mengajar)));
                        $kelasGabungan = $kelasMengajarList;
                        if (!empty($userDirect['kelas_wali'])) $kelasGabungan[] = $userDirect['kelas_wali'];
                        $kelasGabungan = array_values(array_unique(array_filter($kelasGabungan)));
                        $kelas = implode(',', $kelasGabungan);
                        $kelasWali = $userDirect['kelas_wali'] ?? '';
                    } elseif ($role === 'alumni') {
                        $stmtAl = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ? AND status_siswa = 'alumni' LIMIT 1");
                        $stmtAl->execute([$username]);
                        $rowAl = $stmtAl->fetch();
                        if ($rowAl) {
                            $profileExtra = [
                                'tempatLahir'  => $rowAl['tempat_lahir'] ?? '',
                                'tanggalLahir' => $rowAl['tanggal_lahir'] ?? '',
                                'foto'         => $rowAl['foto'] ?? null,
                                'alamat'       => $rowAl['alamat'] ?? '',
                                'tahunLulus'   => $rowAl['tahun_lulus'] ?? '',
                                'kelas'        => $rowAl['kelas'] ?? '',
                            ];
                        }
                    }
                }
            }

            // 3) Siswa: cocokkan email di data siswa (status aktif)
            if ($role === '') {
                $stmt = $pdo->prepare("SELECT * FROM siswa WHERE LOWER(email) = ? AND status_siswa = 'aktif' LIMIT 1");
                $stmt->execute([$email]);
                $siswa = $stmt->fetch();
                if ($siswa) {
                    $role = 'siswa';
                    $username = $siswa['nisn'];
                    $nama = $siswa['nama'];
                    $kelas = $siswa['kelas'] ?? '';
                    $nisn = $siswa['nisn'];
                    $profileExtra = [
                        'tempatLahir'  => $siswa['tempat_lahir'] ?? '',
                        'tanggalLahir' => $siswa['tanggal_lahir'] ?? '',
                        'foto'         => $siswa['foto'] ?? null,
                        'alamat'       => $siswa['alamat'] ?? '',
                    ];
                }
            }

            // 4) Alumni: cocokkan email di data siswa dengan status alumni
            if ($role === '') {
                $stmt = $pdo->prepare("SELECT * FROM siswa WHERE LOWER(email) = ? AND status_siswa = 'alumni' LIMIT 1");
                $stmt->execute([$email]);
                $alumniRow = $stmt->fetch();
                if ($alumniRow) {
                    $role = 'alumni';
                    $username = $alumniRow['nisn'];
                    $nama = $alumniRow['nama'];
                    $kelas = $alumniRow['kelas'] ?? '';
                    $nisn = $alumniRow['nisn'];
                    $profileExtra = [
                        'tempatLahir'  => $alumniRow['tempat_lahir'] ?? '',
                        'tanggalLahir' => $alumniRow['tanggal_lahir'] ?? '',
                        'foto'         => $alumniRow['foto'] ?? null,
                        'alamat'       => $alumniRow['alamat'] ?? '',
                        'tahunLulus'   => $alumniRow['tahun_lulus'] ?? '',
                    ];
                }
            }

            if ($role === '') {
                sendJson(['success' => false, 'message' => 'Email Google (' . htmlspecialchars($email) . ') belum terdaftar di SIAKAD. Hubungi administrator untuk mendaftarkannya.']);
            }

            $token = bin2hex(random_bytes(32));
            $expiry = date('Y-m-d H:i:s', strtotime('+24 hours'));
            $pdo->prepare("INSERT INTO sessions (token, identifier, role, expiry) VALUES (?, ?, ?, ?)")
                ->execute([$token, $username, $role, $expiry]);

            $responsePayload = array_merge([
                'success'   => true,
                'token'     => $token,
                'role'      => $role,
                'username'  => $username,
                'nama'      => $nama,
                'kelas'     => $kelas,
                'kelasWali' => $kelasWali,
                'mengajar'  => $mengajar,
                'email'     => $email,
                'nip'       => $nip,
                'nisn'      => ($role === 'siswa' || $role === 'alumni') ? $username : null,
            ], $profileExtra);

            sendJson($responsePayload);
            break;


        case 'verifyUser':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if ($sess) {
                sendJson(['success' => true, 'role' => $sess['role'], 'username' => $sess['identifier']]);
            } else {
                sendUnauthorized('Sesi tidak valid');
            }
            break;

        case 'myGoogleEmail':
            // Ikat / lihat email Google milik akun sendiri (untuk login via Google).
            // Berlaku untuk semua akun staff di tabel users (admin, bendahara, guru, dll).
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if ($sess['role'] === 'siswa') {
                sendJson(['success' => false, 'message' => 'Email Google siswa dikelola oleh admin pada menu Data Siswa.']);
            }
            $stmt = $pdo->prepare("SELECT id, email FROM users WHERE username = ?");
            $stmt->execute([$sess['identifier']]);
            $me = $stmt->fetch();
            if (!$me) { sendJson(['success' => false, 'message' => 'Akun tidak ditemukan']); }
            $newEmail = strtolower(trim($input['emailGoogle'] ?? ''));
            if ($newEmail === '') {
                // Mode baca: kembalikan email yang terikat saat ini
                sendJson(['success' => true, 'email' => $me['email'] ?? '']);
            }
            // Mode simpan
            if (filter_var($newEmail, FILTER_VALIDATE_EMAIL) === false) {
                sendJson(['success' => false, 'message' => 'Format email Google tidak valid']);
            }
            // Email tidak boleh dipakai akun users lain
            $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?");
            $stmt->execute([$newEmail, $me['id']]);
            if ($stmt->fetch()) { sendJson(['success' => false, 'message' => 'Email sudah digunakan akun lain']); }
            // Email tidak boleh dipakai profil guru lain
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM profil_guru WHERE LOWER(email) = ? AND NOT (nip IS NOT NULL AND nip != '' AND nip = ?)");
            $stmt->execute([$newEmail, $me['username']]);
            if ((int)$stmt->fetchColumn() > 0) { sendJson(['success' => false, 'message' => 'Email sudah terdaftar pada data guru lain']); }
            // Email tidak boleh dipakai siswa lain
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM siswa WHERE LOWER(email) = ?");
            $stmt->execute([$newEmail]);
            if ((int)$stmt->fetchColumn() > 0) { sendJson(['success' => false, 'message' => 'Email sudah terdaftar pada data siswa']); }
            $pdo->prepare("UPDATE users SET email = ? WHERE id = ?")->execute([$newEmail, $me['id']]);
            sendJson(['success' => true, 'message' => 'Email Google berhasil disimpan. Sekarang Anda bisa login dengan tombol "Masuk dengan Google".', 'email' => $newEmail]);
            break;


        // ==========================================
        // 2. DATA SISWA, ALUMNI & KENAIKAN KELAS
        // ==========================================
        case 'gantiPassword':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $passwordLama = trim($input['passwordLama'] ?? '');
            $passwordBaru = trim($input['passwordBaru'] ?? '');

            if (empty($passwordLama) || empty($passwordBaru)) {
                sendJson(['success' => false, 'message' => 'Password lama dan baru tidak boleh kosong']);
                break;
            }
            if (strlen($passwordBaru) < 6) {
                sendJson(['success' => false, 'message' => 'Password baru minimal 6 karakter']);
                break;
            }

            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }

            $role       = $sess['role'];
            $identifier = $sess['identifier'];

            // --- SISWA ---
            if ($role === 'siswa') {
                $stmt = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ? AND status_siswa = 'aktif'");
                $stmt->execute([$identifier]);
                $siswa = $stmt->fetch();

                if (!$siswa) {
                    sendJson(['success' => false, 'message' => 'Data siswa tidak ditemukan']);
                    break;
                }

                // Password default siswa = tanggal lahir DDMMYYYY atau NISN
                $tglLahir = $siswa['tanggal_lahir'] ?? '';
                $passwordDefault = $tglLahir ? date('dmY', strtotime($tglLahir)) : $siswa['nisn'];

                // Cek apakah siswa sudah punya custom password di tabel users
                $userStmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR nip = ?");
                $userStmt->execute([$identifier, $identifier]);
                $userSiswa = $userStmt->fetch();

                if ($userSiswa) {
                    // Punya akun di tabel users — verifikasi dari sana
                    $storedPass = $userSiswa['password'];
                    $valid = false;
                    if (password_verify($passwordLama, $storedPass)) {
                        $valid = true;
                    } elseif (strlen($storedPass) < 60 && $storedPass === $passwordLama) {
                        $valid = true;
                    }
                    if (!$valid) {
                        sendJson(['success' => false, 'message' => 'Password lama tidak sesuai']);
                        break;
                    }
                    $newHash = password_hash($passwordBaru, PASSWORD_DEFAULT);
                    $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$newHash, $userSiswa['id']]);
                    $pdo->prepare("UPDATE siswa SET password_custom = ? WHERE nisn = ?")->execute([$newHash, $identifier]);
                } else {
                    // Belum punya akun users — verifikasi via password default, lalu buat akun
                    if ($passwordLama !== $passwordDefault) {
                        sendJson(['success' => false, 'message' => 'Password lama tidak sesuai (gunakan tanggal lahir format DDMMYYYY atau NISN)']);
                        break;
                    }
                    // Buat akun user untuk siswa agar password custom tersimpan
                    $newHash = password_hash($passwordBaru, PASSWORD_DEFAULT);
                    $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip, nama) VALUES (?, ?, 'siswa', ?, '', ?)")
                        ->execute([$identifier, $newHash, $siswa['kelas'] ?? '', $siswa['nama']]);
                    $pdo->prepare("UPDATE siswa SET password_custom = ? WHERE nisn = ?")->execute([$newHash, $identifier]);
                }
                // Tendang semua sesi aktif milik siswa ini → dipaksa login ulang
                $pdo->prepare("DELETE FROM sessions WHERE identifier = ?")->execute([$identifier]);
                sendJson(['success' => true, 'message' => 'Password berhasil diubah! Silakan login ulang dengan password baru.', 'forceLogout' => true]);
                break;
            }

            // --- GURU / STAFF ---
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->execute([$identifier]);
            $user = $stmt->fetch();

            if (!$user) {
                sendJson(['success' => false, 'message' => 'Akun tidak ditemukan']);
                break;
            }

            $storedPass = $user['password'] ?? '';
            $validPass = false;
            if (password_verify($passwordLama, $storedPass)) {
                $validPass = true;
            } elseif (strlen($storedPass) < 60 && $storedPass === $passwordLama) {
                $validPass = true;
            }

            if (!$validPass) {
                sendJson(['success' => false, 'message' => 'Password lama tidak sesuai']);
                break;
            }

            $newHash = password_hash($passwordBaru, PASSWORD_DEFAULT);
            $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$newHash, $user['id']]);
            // Tendang semua sesi aktif user ini (termasuk perangkat lain) → dipaksa login ulang
            $pdo->prepare("DELETE FROM sessions WHERE identifier = ?")->execute([$identifier]);
            sendJson(['success' => true, 'message' => 'Password berhasil diubah! Silakan login ulang dengan password baru.', 'forceLogout' => true]);
            break;

        // ==========================================
        // 8. ACTION TAMBAHAN (sebelumnya hanya ada di Google Apps Script)
        // ==========================================

        case 'requestResetPassword':
            // PERBAIKAN KEAMANAN: Rate limiting reset password (max 5 per 10 menit per IP)
            checkRateLimit($pdo, 'reset_password', 5, 600);
            $identifier = strtolower(trim($input['identifier'] ?? ''));
            $email = strtolower(trim($input['email'] ?? ''));
            if ($identifier === '' || $email === '') {
                sendJson(['success' => false, 'message' => 'NISN/Username dan email wajib diisi']);
            }
            // Cari di siswa: nisn + email harus cocok
            $found = null;
            $role = '';
            $stmt = $pdo->prepare("SELECT * FROM siswa WHERE LOWER(nisn) = ? AND LOWER(email) = ? AND status_siswa = 'aktif'");
            $stmt->execute([$identifier, $email]);
            $siswaRow = $stmt->fetch();
            if ($siswaRow) {
                $found = $siswaRow;
                $role = 'siswa';
            }
            if (!$found) {
                // Cek semua akun staff/admin langsung dari users.email.
                // Guru juga tetap didukung lewat profil_guru.email sebagai fallback.
                $userRow = null;
                $stmt = $pdo->prepare("SELECT * FROM users WHERE (LOWER(username) = ? OR LOWER(nip) = ?) AND LOWER(email) = ? LIMIT 1");
                $stmt->execute([$identifier, $identifier, $email]);
                $userRow = $stmt->fetch();
                if ($userRow) {
                    $found = $userRow;
                    $role = $userRow['role'];
                }
            }
            if (!$found) {
                $stmt = $pdo->prepare("SELECT * FROM profil_guru WHERE LOWER(email) = ? AND nip IS NOT NULL AND nip <> '' LIMIT 1");
                $stmt->execute([$email]);
                $pgRow = $stmt->fetch();
                if ($pgRow && !empty($pgRow['nip'])) {
                    $stmt = $pdo->prepare("SELECT * FROM users WHERE (LOWER(username) = ? OR LOWER(nip) = ?) LIMIT 1");
                    $stmt->execute([$identifier, $pgRow['nip']]);
                    $userRow = $stmt->fetch();
                    if ($userRow) {
                        $found = $userRow;
                        $role = $userRow['role'];
                    }
                }
            }
            if (!$found) {
                sendJson(['success' => false, 'message' => 'NISN/Username dan email tidak cocok dengan data terdaftar']);
            }
            // Generate OTP 6 digit, berlaku 10 menit
            $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));
            $pdo->prepare("INSERT INTO password_resets (identifier, role, email, otp, expires_at) VALUES (?, ?, ?, ?, ?)")
                ->execute([$identifier, $role, $email, $otp, $expires]);
            // Kirim email via mail() (XAMPP localhost:25)
            $nama = $siswaRow['nama'] ?? $userRow['nama'] ?? 'Pengguna';
            $subject = 'Kode OTP Reset Password - SIAKAD';
            $body = "Halo $nama,\n\n" .
                "Kode OTP untuk mereset password akun Anda adalah:\n\n" .
                "    $otp\n\n" .
                "Kode berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.\n\n" .
                "Salam,\nSistem Informasi Akademik (SIAKAD)";
            require_once dirname(__DIR__) . '/mailer.php';
            $mailRes = kirimEmailSmtp($email, $subject, $body);
            $sent = $mailRes['ok'] === true;
            if (!$sent) {
                error_log('[SIAKAD] SMTP reset password gagal: ' . ($mailRes['error'] ?? 'unknown'));
                // Jangan mengaku OTP terkirim jika server SMTP gagal.
                $pdo->prepare("DELETE FROM password_resets WHERE identifier = ? AND otp = ?")->execute([$identifier, $otp]);
                $message = 'Email OTP gagal dikirim. Periksa konfigurasi SMTP dan App Password Gmail.';
                if (defined('APP_IS_LOCAL') && APP_IS_LOCAL) {
                    $message .= ' Detail: ' . ($mailRes['error'] ?? 'unknown');
                }
                sendJson(['success' => false, 'message' => $message]);
            }
            sendJson([
                'success' => true,
                'message' => 'OTP berhasil dikirim ke email ' . $email,
            ]);
            break;

        case 'verifyResetOtp':
            // PERBAIKAN KEAMANAN: Rate limiting OTP brute-force (max 5 percobaan per 5 menit per IP)
            checkRateLimit($pdo, 'verify_otp', 5, 300);
            $identifier = strtolower(trim($input['identifier'] ?? ''));
            $otp = trim($input['otp'] ?? '');
            if ($identifier === '' || $otp === '') {
                sendJson(['success' => false, 'message' => 'Data tidak lengkap']);
            }
            $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE identifier = ? AND used = 0 ORDER BY id DESC LIMIT 1");
            $stmt->execute([$identifier]);
            $row = $stmt->fetch();
            if (!$row || !hash_equals($row['otp'], $otp)) {
                sendJson(['success' => false, 'message' => 'Kode OTP salah']);
            }
            if (strtotime($row['expires_at']) < time()) {
                sendJson(['success' => false, 'message' => 'Kode OTP sudah kedaluwarsa']);
            }
            // PERBAIKAN BUG: tandai OTP sudah diverifikasi agar tidak bisa dipakai ulang
            // sebelum setNewPassword dipanggil (mencegah race condition)
            $pdo->prepare("UPDATE password_resets SET used = 2 WHERE id = ?")->execute([$row['id']]);
            sendJson(['success' => true, 'message' => 'OTP valid, silakan atur password baru', 'resetId' => (int)$row['id']]);
            break;

        case 'setNewPassword':
            $identifier = strtolower(trim($input['identifier'] ?? ''));
            $otp = trim($input['otp'] ?? '');
            $newPass = trim($input['newPassword'] ?? '');
            if ($identifier === '' || $otp === '' || $newPass === '') {
                sendJson(['success' => false, 'message' => 'Data tidak lengkap']);
            }
            if (strlen($newPass) < 6) {
                sendJson(['success' => false, 'message' => 'Password minimal 6 karakter']);
            }
            // PERBAIKAN BUG: cek used=2 (sudah diverifikasi oleh verifyResetOtp)
            $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE identifier = ? AND used = 2 ORDER BY id DESC LIMIT 1");
            $stmt->execute([$identifier]);
            $row = $stmt->fetch();
            if (!$row || !hash_equals($row['otp'], $otp)) {
                sendJson(['success' => false, 'message' => 'Kode OTP salah atau belum diverifikasi']);
            }
            if (strtotime($row['expires_at']) < time()) {
                sendJson(['success' => false, 'message' => 'Kode OTP sudah kedaluwarsa']);
            }
            $hash = password_hash($newPass, PASSWORD_DEFAULT);
            try {
                $pdo->beginTransaction();
                // Konsumsi OTP secara atomik: hanya request pertama yang dapat mengubah password.
                $consume = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ? AND identifier = ? AND otp = ? AND used = 2 AND expires_at > NOW()");
                $consume->execute([(int)$row['id'], $identifier, $otp]);
                if ($consume->rowCount() !== 1) {
                    $pdo->rollBack();
                    sendJson(['success' => false, 'message' => 'Kode OTP sudah digunakan atau tidak valid']);
                }
                if ($row['role'] === 'siswa') {
                    $updPass = $pdo->prepare("UPDATE siswa SET password_custom = ? WHERE LOWER(nisn) = ?");
                    $updPass->execute([$hash, $identifier]);
                } else {
                    $updPass = $pdo->prepare("UPDATE users SET password = ? WHERE LOWER(username) = ? OR LOWER(nip) = ?");
                    $updPass->execute([$hash, $identifier, $identifier]);
                }
                $pdo->commit();
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                error_log('[SIAKAD] Reset password gagal: ' . $e->getMessage());
                sendJson(['success' => false, 'message' => 'Reset password gagal. Silakan coba lagi.']);
            }
            // Tendang semua sesi aktif akun terkait karena password sudah berganti
            $pdo->prepare("DELETE FROM sessions WHERE LOWER(identifier) = ?")->execute([$identifier]);
            sendJson(['success' => true, 'message' => 'Password berhasil diubah. Silakan login.']);
            break;

}
