<?php
switch ($action) {
        case 'getGuruList':
            // PERBAIKAN KEAMANAN: hanya user terautentikasi
            requireAuth($pdo, $input, ['admin', 'guru', 'walikelas']);
            // Pastikan semua guru di Data Guru terdaftar sebagai akun User
            syncGuruUserAccounts($pdo);
            $stmt = $pdo->query("
                SELECT u.username, u.password, u.role, u.kelas, u.nip, u.kelas_wali,
                       COALESCE(pg.nama_guru, u.username) AS nama
                FROM users u
                LEFT JOIN profil_guru pg ON pg.nip = u.nip
                ORDER BY u.role ASC, u.username ASC
            ");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return [
                    'username'  => $r['username'],
                    'role'      => $r['role'],
                    'kelas'     => $r['kelas'],
                    'kelasWali' => $r['kelas_wali'],
                    'nip'       => $r['nip'],
                    'nama'      => $r['nama'],
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'addGuru':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            // Accept either flat fields or guruData object
            $u = (isset($input['guruData']) && is_array($input['guruData'])) ? $input['guruData'] : $input;
            $newUsername = trim($u['username'] ?? $input['username'] ?? '');
            $newPassword = trim($u['password'] ?? $input['password'] ?? '');
            $newRole     = trim($u['role']     ?? $input['role']     ?? 'guru');
            $newKelas    = trim($u['kelas']    ?? $input['kelas']    ?? '');
            $newKelasWali = trim($u['kelasWali'] ?? $input['kelasWali'] ?? '');
            $newNip      = trim($u['nip']      ?? $input['nip']      ?? '');
            // Simpan NIP kosong sebagai NULL agar tidak bentrok UNIQUE constraint
            $newNip      = ($newNip === '') ? null : $newNip;

            // Default: username & password guru memakai NIP (konsisten dengan import guru)
            if ($newNip !== null) {
                if ($newUsername === '') $newUsername = $newNip;
                if ($newPassword === '') $newPassword = $newNip;
            }

            if (empty($newUsername)) {
                sendJson(['success' => false, 'message' => 'Username tidak boleh kosong']);
                break;
            }
            if (empty($newPassword)) {
                sendJson(['success' => false, 'message' => 'Password tidak boleh kosong']);
                break;
            }

            // Cek duplikat username
            $chk = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $chk->execute([$newUsername]);
            if ($chk->fetch()) {
                sendJson(['success' => false, 'message' => "Username \"$newUsername\" sudah digunakan. Pilih username lain."]);
                break;
            }

            // Cek duplikat NIP (hanya jika NIP diisi)
            if ($newNip !== null) {
                $chkNip = $pdo->prepare("SELECT id FROM users WHERE nip = ?");
                $chkNip->execute([$newNip]);
                if ($chkNip->fetch()) {
                    sendJson(['success' => false, 'message' => "NIP \"$newNip\" sudah digunakan oleh akun lain."]);
                    break;
                }
            }

            // WAJIB: akun Guru Pengajar harus ditentukan kelas & mapel yang diampu
            $mengajarBaru = (isset($u['mengajar']) && is_array($u['mengajar'])) ? $u['mengajar'] : null;
            if ($newRole === 'guru') {
                $validRowsAdd = 0;
                if (is_array($mengajarBaru)) {
                    foreach ($mengajarBaru as $a) {
                        if (trim($a['kelas'] ?? '') !== '' && trim($a['mata_pelajaran'] ?? $a['mapel'] ?? '') !== '') $validRowsAdd++;
                    }
                }
                if ($validRowsAdd === 0) {
                    sendJson(['success' => false, 'message' => 'Akun Guru Pengajar wajib memiliki minimal 1 penugasan Kelas + Mapel. Isi bagian "Kelas & Mapel yang Diampu" terlebih dahulu.']);
                    break;
                }
            }

            // PERBAIKAN KEAMANAN: hash password sebelum disimpan (jangan plaintext)
            $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $ins = $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip, kelas_wali) VALUES (?, ?, ?, ?, ?, ?)");
            $ins->execute([$newUsername, $hashedNewPassword, $newRole, $newKelas, $newNip, $newKelasWali !== '' ? $newKelasWali : null]);

            // Simpan penugasan kelas+mapel (guru_mengajar) jika ada, tanpa auto-insert ke profil_guru
            if (is_array($mengajarBaru) && !empty($mengajarBaru)) {
                $profilNip = $newNip ?? $newUsername;
                try { saveMengajarForNip($pdo, resolveGuruUsername($pdo, $profilNip), $mengajarBaru); } catch (Exception $e) {}
            }

            sendJson(['success' => true, 'message' => "Akun \"$newUsername\" berhasil dibuat"]);
            break;

        case 'updateGuru':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $u = (isset($input['guruData']) && is_array($input['guruData'])) ? $input['guruData'] : $input;
            $oldUsername = trim($u['oldUsername'] ?? $input['oldUsername'] ?? $u['username'] ?? $input['username'] ?? '');
            $newUsername = trim($u['username']    ?? $input['username']    ?? $oldUsername);
            $newPassword = trim($u['password']    ?? $input['password']    ?? '');
            $newRole     = trim($u['role']        ?? $input['role']        ?? 'guru');
            $newKelas    = trim($u['kelas']       ?? $input['kelas']       ?? '');
            $newKelasWali = trim($u['kelasWali']  ?? $input['kelasWali']   ?? '');
            $hasKelasWaliInput = isset($u['kelasWali']) || isset($input['kelasWali']);
            $newNip      = trim($u['nip']         ?? $input['nip']         ?? '');
            // Simpan NIP kosong sebagai NULL agar tidak bentrok UNIQUE constraint
            $newNip      = ($newNip === '') ? null : $newNip;

            if (empty($oldUsername)) {
                sendJson(['success' => false, 'message' => 'Username lama tidak ditemukan']);
                break;
            }

            // Check if new username is taken by someone else
            if ($newUsername !== $oldUsername) {
                $chk = $pdo->prepare("SELECT id FROM users WHERE username = ?");
                $chk->execute([$newUsername]);
                if ($chk->fetch()) {
                    sendJson(['success' => false, 'message' => "Username \"$newUsername\" sudah digunakan."]);
                    break;
                }
            }

            // Cek duplikat NIP (hanya jika NIP diisi dan beda dari yang lama)
            if ($newNip !== null) {
                $chkNip = $pdo->prepare("SELECT id FROM users WHERE nip = ? AND username != ?");
                $chkNip->execute([$newNip, $oldUsername]);
                if ($chkNip->fetch()) {
                    sendJson(['success' => false, 'message' => "NIP \"$newNip\" sudah digunakan oleh akun lain."]);
                    break;
                }
            }

            // WAJIB: akun Guru Pengajar harus ditentukan kelas & mapel yang diampu
            $mengajarUpd = (isset($u['mengajar']) && is_array($u['mengajar'])) ? $u['mengajar'] : null;
            if ($newRole === 'guru') {
                if (is_array($mengajarUpd)) {
                    $validRowsUpd = 0;
                    foreach ($mengajarUpd as $a) {
                        if (trim($a['kelas'] ?? '') !== '' && trim($a['mata_pelajaran'] ?? $a['mapel'] ?? '') !== '') $validRowsUpd++;
                    }
                    if ($validRowsUpd === 0) {
                        sendJson(['success' => false, 'message' => 'Akun Guru Pengajar wajib memiliki minimal 1 penugasan Kelas + Mapel. Isi bagian "Kelas & Mapel yang Diampu".']);
                        break;
                    }
                } else {
                    // Tidak dikirim dari form -> cek penugasan yang sudah ada di database
                    $nipKeyChk = ($newNip !== null && $newNip !== '') ? $newNip : $oldUsername;
                    $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM guru_mengajar WHERE nip = ?");
                    $cntStmt->execute([resolveGuruUsername($pdo, $nipKeyChk)]);
                    if ((int)$cntStmt->fetchColumn() === 0) {
                        sendJson(['success' => false, 'message' => 'Akun Guru Pengajar belum memiliki penugasan Kelas + Mapel. Tentukan lewat bagian "Kelas & Mapel yang Diampu" terlebih dahulu.']);
                        break;
                    }
                }
            }

            // If password empty, keep existing
            if (empty($newPassword)) {
                $upd = $pdo->prepare("UPDATE users SET username=?, role=?, kelas=?, nip=? WHERE username=?");
                $upd->execute([$newUsername, $newRole, $newKelas, $newNip, $oldUsername]);
            } else {
                // PERBAIKAN KEAMANAN: hash password sebelum update (jangan plaintext)
                $hashedUpdatePassword = password_hash($newPassword, PASSWORD_DEFAULT);
                $upd = $pdo->prepare("UPDATE users SET username=?, password=?, role=?, kelas=?, nip=? WHERE username=?");
                $upd->execute([$newUsername, $hashedUpdatePassword, $newRole, $newKelas, $newNip, $oldUsername]);
            }

            // kelas_wali (homeroom) hanya ditimpa jika memang dikirim dari form ini,
            // supaya tidak menghapus status walikelas yang diatur lewat menu lain.
            if ($hasKelasWaliInput) {
                $pdo->prepare("UPDATE users SET kelas_wali = ? WHERE username = ?")
                    ->execute([$newKelasWali !== '' ? $newKelasWali : null, $newUsername]);
            }

            // Jika username berubah, ikut pindahkan penugasan kelas+mapel (guru_mengajar)
            if ($newUsername !== $oldUsername) {
                try { $pdo->prepare("UPDATE guru_mengajar SET nip = ? WHERE nip = ?")->execute([$newUsername, $oldUsername]); } catch (Exception $e) {}
            }

            // Update sessions if username changed
            if ($newUsername !== $oldUsername) {
                $updSess = $pdo->prepare("UPDATE sessions SET identifier=? WHERE identifier=?");
                $updSess->execute([$newUsername, $oldUsername]);
            }

            // SINKRON: jika role siswa/alumni, update kelas di tabel siswa
            if (in_array($newRole, ['siswa', 'alumni'])) {
                $pdo->prepare("UPDATE siswa SET kelas=?, nama=? WHERE nisn=?")
                    ->execute([$newKelas, '', $oldUsername]);
                // Jika NISN (username) berubah, update juga di tabel siswa
                if ($newUsername !== $oldUsername) {
                    $pdo->prepare("UPDATE siswa SET nisn=? WHERE nisn=?")->execute([$newUsername, $oldUsername]);
                }
            }

            // Simpan penugasan kelas+mapel (guru_mengajar) & sinkronkan users.kelas
            if (is_array($mengajarUpd)) {
                try {
                    $nipKeySave = ($newNip !== null && $newNip !== '') ? $newNip : $newUsername;
                    saveMengajarForNip($pdo, resolveGuruUsername($pdo, $nipKeySave), $mengajarUpd);
                } catch (Exception $e) {}
            }
            // SINKRON: jika role guru/staff dan NIP berubah, sinkron profil_guru
            if (!in_array($newRole, ['siswa', 'alumni']) && $newNip !== null && $newNip !== $oldUsername) {
                try {
                    $pdo->prepare("UPDATE profil_guru SET nip=? WHERE nip=?")->execute([$newNip, $oldUsername]);
                    $pdo->prepare("UPDATE guru_mengajar SET nip=? WHERE nip=?")->execute([$newNip, $oldUsername]);
                } catch (Exception $e) {}
            }

            sendJson(['success' => true, 'message' => "Akun \"$newUsername\" berhasil diperbarui"]);
            break;

        case 'deleteGuru':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $username = trim($input['username'] ?? $_GET['username'] ?? '');
            if (empty($username)) {
                sendJson(['success' => false, 'message' => 'Username tidak ditemukan']);
                break;
            }
            // Ambil role dulu untuk sinkron ke tabel asal
            $stmtRole = $pdo->prepare("SELECT role, nip FROM users WHERE username = ?");
            $stmtRole->execute([$username]);
            $userRow = $stmtRole->fetch();
            $userRole = $userRow['role'] ?? '';
            $userNip  = $userRow['nip'] ?? '';

            $del = $pdo->prepare("DELETE FROM users WHERE username = ?");
            $del->execute([$username]);
            // Hapus sesi aktif user tersebut
            $pdo->prepare("DELETE FROM sessions WHERE identifier = ?")->execute([$username]);

            // SINKRON berdasarkan role:
            if ($userRole === 'siswa') {
                // Hapus data siswa aktif
                $pdo->prepare("DELETE FROM siswa WHERE nisn = ? AND status_siswa = 'aktif'")->execute([$username]);
            } elseif ($userRole === 'alumni') {
                // Soft-delete data alumni
                $pdo->prepare("UPDATE siswa SET status_siswa = 'deleted' WHERE nisn = ? AND status_siswa = 'alumni'")->execute([$username]);
            } else {
                // Guru/staff: bersihkan penugasan kelas & mapel
                $nipKey = ($userNip !== '' && $userNip !== null) ? $userNip : $username;
                try { $pdo->prepare("DELETE FROM guru_mengajar WHERE nip = ?")->execute([$nipKey]); } catch (Exception $e) {}
                // Hapus profil_guru yang terhubung
                try { $pdo->prepare("DELETE FROM profil_guru WHERE nip = ?")->execute([$nipKey]); } catch (Exception $e) {}
            }

            sendJson(['success' => true, 'message' => "Akun \"$username\" berhasil dihapus"]);
            break;

        case 'getProfilGuruList':
            $stmt = $pdo->query("SELECT * FROM profil_guru ORDER BY nama_guru ASC");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return [
                    'nip' => $r['nip'],
                    'nama' => $r['nama_guru'],
                    'namaGuru' => $r['nama_guru'],
                    'mapel' => $r['mata_pelajaran'],
                    'mataPelajaran' => $r['mata_pelajaran'],
                    'noHp' => $r['no_hp'],
                    'email' => $r['email'],
                    'statusKepegawaian' => $r['status_kepegawaian'],
                    'jabatan' => $r['jabatan'],
                    'jenisKelamin' => $r['jenis_kelamin'] ?? null,
                    'tanggalLahir' => $r['tanggal_lahir'] ?? null,
                    'agama' => $r['agama'] ?? null,
                    'alamat' => $r['alamat'] ?? null,
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'addProfilGuru':
            $g = $input['profilData'] ?? $input;
            $nipBaru  = trim($g['nip'] ?? '');
            $namaBaru = trim($g['nama'] ?? $g['namaGuru'] ?? '');
            $tanggalLahir = !empty($g['tanggalLahir']) ? $g['tanggalLahir'] : null;
            $emailGuruBaru = strtolower(trim($g['email'] ?? ''));

            // Cek duplikat NIP
            if ($nipBaru !== '') {
                $chkNipG = $pdo->prepare("SELECT id FROM profil_guru WHERE nip = ?");
                $chkNipG->execute([$nipBaru]);
                if ($chkNipG->fetch()) {
                    sendJson(['success' => false, 'message' => 'NIP "' . $nipBaru . '" sudah terdaftar. Gunakan NIP lain.']);
                }
            }

            // Cek duplikat Email guru (hanya jika email diisi)
            if ($emailGuruBaru !== '') {
                $chkEmailG = $pdo->prepare("SELECT id FROM profil_guru WHERE LOWER(email) = ?");
                $chkEmailG->execute([$emailGuruBaru]);
                if ($chkEmailG->fetch()) {
                    sendJson(['success' => false, 'message' => 'Email "' . $emailGuruBaru . '" sudah digunakan oleh guru lain.']);
                }
            }

            $ins = $pdo->prepare("INSERT INTO profil_guru (nip, nama_guru, mata_pelajaran, no_hp, email, status_kepegawaian, jabatan, jenis_kelamin, tanggal_lahir, agama, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                $nipBaru,
                $namaBaru,
                $g['mapel'] ?? $g['mataPelajaran'] ?? '',
                $g['noHp'] ?? '',
                $emailGuruBaru !== '' ? $emailGuruBaru : null,
                $g['statusKepegawaian'] ?? '',
                $g['jabatan'] ?? '',
                $g['jenisKelamin'] ?? null,
                $tanggalLahir,
                $g['agama'] ?? null,
                $g['alamat'] ?? null,
            ]);
            // Auto-create akun di tabel users jika NIP diisi dan belum ada akun
            $akunBaru = false;
            if ($nipBaru !== '') {
                $cekUser = $pdo->prepare("SELECT id FROM users WHERE username = ? OR nip = ?");
                $cekUser->execute([$nipBaru, $nipBaru]);
                if (!$cekUser->fetch()) {
                    // PERBAIKAN KEAMANAN: hash password default = NIP
                    $insUser = $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip, nama) VALUES (?, ?, 'guru', '', ?, ?)");
                    $insUser->execute([$nipBaru, password_hash($nipBaru, PASSWORD_DEFAULT), $nipBaru, $namaBaru]);
                    $akunBaru = true;
                }
            }
            $msg = 'Profil guru ditambahkan';
            if ($akunBaru) $msg .= ". Akun login otomatis dibuat (username: $nipBaru, password: $nipBaru)";
            // Simpan penugasan multi kelas+mapel (guru_mengajar) jika dikirim dari form
            $mengajar = $g['mengajar'] ?? $g['assignments'] ?? [];
            if (is_array($mengajar) && !empty($mengajar) && $nipBaru !== '') {
                try { saveMengajarForNip($pdo, $nipBaru, $mengajar); } catch (Exception $e) {}
            }
            sendJson(['success' => true, 'message' => $msg, 'akunBaru' => $akunBaru, 'username' => $nipBaru]);
            break;

        case 'updateProfilGuru':
            $g = $input['profilData'] ?? $input;
            $nipLama  = trim($input['oldNip'] ?? $g['oldNip'] ?? $g['nip'] ?? '');
            $nipBaru  = trim($g['nip'] ?? $nipLama);
            $namaBaru = trim($g['nama'] ?? $g['namaGuru'] ?? '');
            $tanggalLahirUpd = !empty($g['tanggalLahir']) ? $g['tanggalLahir'] : null;
            $emailGuruUpd = strtolower(trim($g['email'] ?? ''));

            // Cek duplikat NIP (hanya jika NIP berubah)
            if ($nipBaru !== '' && $nipBaru !== $nipLama) {
                $chkNipUpd = $pdo->prepare("SELECT id FROM profil_guru WHERE nip = ?");
                $chkNipUpd->execute([$nipBaru]);
                if ($chkNipUpd->fetch()) {
                    sendJson(['success' => false, 'message' => 'NIP "' . $nipBaru . '" sudah digunakan oleh guru lain.']);
                }
            }

            // Cek duplikat Email (hanya jika email diisi, kecualikan guru yang sedang diedit)
            if ($emailGuruUpd !== '') {
                $chkEmailUpd = $pdo->prepare("SELECT id FROM profil_guru WHERE LOWER(email) = ? AND nip != ?");
                $chkEmailUpd->execute([$emailGuruUpd, $nipLama]);
                if ($chkEmailUpd->fetch()) {
                    sendJson(['success' => false, 'message' => 'Email "' . $emailGuruUpd . '" sudah digunakan oleh guru lain.']);
                }
            }

            $upd = $pdo->prepare("UPDATE profil_guru SET nama_guru=?, mata_pelajaran=?, no_hp=?, email=?, status_kepegawaian=?, jabatan=?, jenis_kelamin=?, tanggal_lahir=?, agama=?, alamat=? WHERE nip=?");
            $upd->execute([
                $namaBaru,
                $g['mapel'] ?? $g['mataPelajaran'] ?? '',
                $g['noHp'] ?? '',
                $emailGuruUpd !== '' ? $emailGuruUpd : null,
                $g['statusKepegawaian'] ?? '',
                $g['jabatan'] ?? '',
                $g['jenisKelamin'] ?? null,
                $tanggalLahirUpd,
                $g['agama'] ?? null,
                $g['alamat'] ?? null,
                $nipLama
            ]);
            // SINKRON: update nama, nip, dan username di tabel users
            if ($nipLama !== '') {
                if ($nipBaru !== '' && $nipBaru !== $nipLama) {
                    // NIP berubah -> update username dan nip sekaligus
                    $pdo->prepare("UPDATE users SET username=?, nip=?, nama=? WHERE nip=? OR username=?")
                        ->execute([$nipBaru, $nipBaru, $namaBaru, $nipLama, $nipLama]);
                    // Update identifier sesi jika username berubah
                    $pdo->prepare("UPDATE sessions SET identifier=? WHERE identifier=?")
                        ->execute([$nipBaru, $nipLama]);
                } else {
                    // NIP tidak berubah -> hanya update nama
                    $pdo->prepare("UPDATE users SET nama=? WHERE nip=? OR username=?")
                        ->execute([$namaBaru, $nipLama, $nipLama]);
                }
            }
            // Sinkronkan assignment multi kelas+mapel (guru_mengajar) jika dikirim dari form
            $mengajarUpd = $g['mengajar'] ?? $g['assignments'] ?? null;
            if (is_array($mengajarUpd) && $nipLama !== '') {
                try { saveMengajarForNip($pdo, $nipLama, $mengajarUpd); } catch (Exception $e) {}
            }
            sendJson(['success' => true, 'message' => 'Profil guru diperbarui']);
            break;

        case 'deleteProfilGuru':
            requireAuth($pdo, $input, ['admin']);
            $nip = $input['nip'] ?? $_GET['nip'] ?? '';
            $del = $pdo->prepare("DELETE FROM profil_guru WHERE nip = ?");
            $del->execute([$nip]);
            // Ikut bersihkan assignment kelas+mapel guru ini
            try { $pdo->prepare("DELETE FROM guru_mengajar WHERE nip = ?")->execute([$nip]); } catch (Exception $e) {}
            // SINKRON: hapus akun users & sesi guru ini (match by nip atau username)
            $pdo->prepare("DELETE FROM users WHERE nip = ? OR username = ?")->execute([$nip, $nip]);
            $pdo->prepare("DELETE FROM sessions WHERE identifier = ?")->execute([$nip]);
            sendJson(['success' => true, 'message' => 'Profil guru dan akun login dihapus']);
            break;

        // ==========================================
        // 3b. GURU MENGAJAR (MULTI KELAS & MULTI MAPEL)
        // Satu guru bisa punya banyak baris (kelas, mata_pelajaran).
        // 'kelas_wali' (homeroom) diatur terpisah lewat setWaliKelas.
        // ==========================================
        case 'getGuruMengajarList':
            $nip = $_GET['nip'] ?? $input['nip'] ?? $input['args'][0] ?? '';
            if ($nip === '') sendJson(['success' => false, 'message' => 'nip wajib diisi']);
            $nip = resolveGuruUsername($pdo, $nip);
            $rows = getMengajarByNip($pdo, $nip);
            $userStmt = $pdo->prepare("SELECT kelas_wali FROM users WHERE username = ? OR nip = ?");
            $userStmt->execute([$nip, $nip]);
            $u = $userStmt->fetch();
            sendJson([
                'success' => true,
                'data' => $rows,
                'kelasWali' => $u['kelas_wali'] ?? ''
            ]);
            break;

        case 'setGuruMengajarList':
            // assignments: [{kelas: 'X-A', mata_pelajaran: 'Matematika'}, ...]
            $nip = $input['nip'] ?? $_GET['nip'] ?? '';
            $assignments = $input['assignments'] ?? $input['args'][1] ?? [];
            if ($nip === '') sendJson(['success' => false, 'message' => 'nip wajib diisi']);
            if (!is_array($assignments)) sendJson(['success' => false, 'message' => 'assignments harus berupa array']);
            $nip = resolveGuruUsername($pdo, $nip);

            try {
                saveMengajarForNip($pdo, $nip, $assignments);
            } catch (Exception $e) {
                sendJson(['success' => false, 'message' => 'Gagal menyimpan: ' . $e->getMessage()]);
            }

            sendJson(['success' => true, 'message' => 'Penugasan kelas & mapel guru berhasil disimpan', 'data' => getMengajarByNip($pdo, $nip)]);
            break;

        case 'setKelasWali':
            // Menetapkan/menghapus kelas yang diwalikan (homeroom) seorang guru,
            // TANPA mempengaruhi kelas-kelas lain yang dia ajar (guru_mengajar).
            $nip = $input['nip'] ?? $_GET['nip'] ?? '';
            $kelasWali = trim($input['kelasWali'] ?? $input['kelas_wali'] ?? '');
            if ($nip === '') sendJson(['success' => false, 'message' => 'nip wajib diisi']);
            $nip = resolveGuruUsername($pdo, $nip);

            $pdo->prepare("UPDATE users SET kelas_wali = ? WHERE username = ? OR nip = ?")
                ->execute([$kelasWali !== '' ? $kelasWali : null, $nip, $nip]);

            sendJson(['success' => true, 'message' => $kelasWali !== '' ? "Guru ditetapkan sebagai walikelas $kelasWali" : 'Status walikelas dilepas']);
            break;

        // ==========================================
        // 4. MANAJEMEN KELAS & MAPEL MASTER
        // ==========================================
        case 'syncGuruRoles':
            // Sinkron massal semua role guru berdasarkan kelas_master (wali kelas) dan jadwal (pengajar)
            $sess = verifyToken($pdo, $input['token'] ?? '');
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if ($sess['role'] !== 'admin') {
                sendJson(['success' => false, 'message' => 'Akses ditolak']);
                break;
            }
            // 1. User yang jadi wali kelas → role walikelas
            $pdo->exec("
                UPDATE users u
                JOIN kelas_master km ON km.wali_kelas = u.username
                SET u.role = 'walikelas', u.kelas = km.nama_kelas
                WHERE u.role NOT IN ('admin','kepsek','wakel','pencatat','bendahara')
            ");
            // 2. User yang ada di jadwal sebagai pengajar (via profil_guru) → role guru, tapi jangan timpa walikelas
            $pdo->exec("
                UPDATE users u
                JOIN profil_guru pg ON (u.nip = pg.nip OR u.username = pg.nip)
                JOIN (SELECT DISTINCT nama_guru FROM jadwal WHERE nama_guru IS NOT NULL AND nama_guru != '') j
                     ON TRIM(pg.nama_guru) = TRIM(j.nama_guru)
                SET u.role = 'guru'
                WHERE u.role NOT IN ('walikelas','admin','kepsek','wakel','pencatat','bendahara')
            ");
            sendJson(['success' => true, 'message' => 'Sinkronisasi role guru selesai']);
            break;

        case 'deleteMultipleGuru':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $usernameArray = $input['usernameArray'] ?? $input['ids'] ?? [];
            if (!empty($usernameArray)) {
                $inQuery = implode(',', array_fill(0, count($usernameArray), '?'));
                // Ambil role & nip semua user yang akan dihapus dulu
                $stmtRoles = $pdo->prepare("SELECT username, role, nip FROM users WHERE username IN ($inQuery)");
                $stmtRoles->execute($usernameArray);
                $userRows = $stmtRoles->fetchAll();

                $del = $pdo->prepare("DELETE FROM users WHERE username IN ($inQuery)");
                $del->execute($usernameArray);
                // Hapus sesi semua user ini
                $pdo->prepare("DELETE FROM sessions WHERE identifier IN ($inQuery)")->execute($usernameArray);

                // SINKRON per role
                $siswaNisns = []; $alumniNisns = []; $guruNips = [];
                foreach ($userRows as $row) {
                    if ($row['role'] === 'siswa')   $siswaNisns[]  = $row['username'];
                    elseif ($row['role'] === 'alumni') $alumniNisns[] = $row['username'];
                    else {
                        $nipKey = ($row['nip'] !== '' && $row['nip'] !== null) ? $row['nip'] : $row['username'];
                        $guruNips[] = $nipKey;
                    }
                }
                if (!empty($siswaNisns)) {
                    $q = implode(',', array_fill(0, count($siswaNisns), '?'));
                    $pdo->prepare("DELETE FROM siswa WHERE nisn IN ($q) AND status_siswa = 'aktif'")->execute($siswaNisns);
                }
                if (!empty($alumniNisns)) {
                    $q = implode(',', array_fill(0, count($alumniNisns), '?'));
                    $pdo->prepare("UPDATE siswa SET status_siswa = 'deleted' WHERE nisn IN ($q) AND status_siswa = 'alumni'")->execute($alumniNisns);
                }
                if (!empty($guruNips)) {
                    $q = implode(',', array_fill(0, count($guruNips), '?'));
                    try { $pdo->prepare("DELETE FROM guru_mengajar WHERE nip IN ($q)")->execute($guruNips); } catch (Exception $e) {}
                    try { $pdo->prepare("DELETE FROM profil_guru WHERE nip IN ($q)")->execute($guruNips); } catch (Exception $e) {}
                }
            }
            sendJson(['success' => true, 'message' => 'Akun berhasil dihapus']);
            break;

        case 'deleteMultipleProfilGuru':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $nipArray = $input['nipArray'] ?? $input['ids'] ?? [];
            if (!empty($nipArray)) {
                $inQuery = implode(',', array_fill(0, count($nipArray), '?'));
                $del = $pdo->prepare("DELETE FROM profil_guru WHERE nip IN ($inQuery)");
                $del->execute($nipArray);
                // SINKRON: hapus akun users & sesi guru-guru ini
                $pdo->prepare("DELETE FROM users WHERE nip IN ($inQuery) OR username IN ($inQuery)")->execute(array_merge($nipArray, $nipArray));
                $pdo->prepare("DELETE FROM sessions WHERE identifier IN ($inQuery)")->execute($nipArray);
                try {
                    $pdo->prepare("DELETE FROM guru_mengajar WHERE nip IN ($inQuery)")->execute($nipArray);
                } catch (Exception $e) {}
            }
            sendJson(['success' => true, 'message' => 'Profil guru dan akun login berhasil dihapus']);
            break;

        case 'getInfoGuru':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = $pdo->prepare("SELECT identifier FROM sessions WHERE token = ? AND expiry > NOW()");
            $sess->execute([$token]);
            $row = $sess->fetch();
            if (!$row) { sendUnauthorized('Sesi tidak valid'); }
            $guru = $pdo->prepare("SELECT * FROM profil_guru WHERE nip = ?");
            $guru->execute([$row['identifier']]);
            $gData = $guru->fetch();
            if ($gData) {
                sendJson(['success' => true, 'data' => [
                    'nip' => $gData['nip'],
                    'nama' => $gData['nama_guru'],
                    'jabatan' => $gData['jabatan'],
                    'mapel' => $gData['mata_pelajaran'],
                    'noHp' => $gData['no_hp'],
                    'email' => $gData['email'],
                    'status' => $gData['status_kepegawaian']
                ]]);
            } else {
                $user = $pdo->prepare("SELECT * FROM users WHERE username = ?");
                $user->execute([$row['identifier']]);
                $uData = $user->fetch();
                sendJson(['success' => true, 'data' => [
                    'nip' => $uData['nip'] ?? '',
                    'nama' => $uData['username'] ?? '',
                    'jabatan' => $uData['role'] ?? '',
                    'mapel' => '',
                    'noHp' => '',
                    'email' => '',
                    'status' => ''
                ]]);
            }
            break;

        case 'getProfilSaya':
            // Profil lengkap guru yang sedang login (dari profil_guru + users)
            $sessPs = requireAuth($pdo, $input);
            $identPs = $sessPs['identifier'];
            // Resolve akun user dulu (username & nip bisa berbeda)
            $stPsU = $pdo->prepare("SELECT username, role, kelas_wali, nip, nama FROM users WHERE username = ? OR nip = ? LIMIT 1");
            $stPsU->execute([$identPs, $identPs]);
            $uPs = $stPsU->fetch();
            $nipPs = $uPs['nip'] ?? $identPs;
            $stPs = $pdo->prepare("SELECT * FROM profil_guru WHERE nip = ? OR REPLACE(nip, ' ', '') = ? OR REPLACE(nip, ' ', '') = ?");
            $stPs->execute([$nipPs, $nipPs, $identPs]);
            $pPs = $stPs->fetch();
            // Fallback nama dari users jika profil_guru tidak ditemukan
            $namaPs = $pPs['nama_guru'] ?? ($uPs['nama'] ?? ($uPs['username'] ?? ''));
            sendJson(['success' => true, 'data' => [
                'nip' => $pPs['nip'] ?? $nipPs,
                'nama' => $namaPs,
                'jabatan' => $pPs['jabatan'] ?? '',
                'mapel' => $pPs['mata_pelajaran'] ?? '',
                'noHp' => $pPs['no_hp'] ?? '',
                'email' => $pPs['email'] ?? '',
                'statusKepegawaian' => $pPs['status_kepegawaian'] ?? '',
                'jenisKelamin' => $pPs['jenis_kelamin'] ?? '',
                'tanggalLahir' => $pPs['tanggal_lahir'] ?? '',
                'agama' => $pPs['agama'] ?? '',
                'alamat' => $pPs['alamat'] ?? '',
                'username' => $uPs['username'] ?? $identPs,
                'role' => $sessPs['role'],
                'kelasWali' => $uPs['kelas_wali'] ?? ''
            ]]);
            break;

        case 'getJadwalMengajarSaya':
            // Jadwal mengajar guru yang sedang login (dicocokkan lewat nama di tabel jadwal).
            // Format data sama dengan getJadwalList agar tampilannya konsisten.
            $sessJm = requireAuth($pdo, $input);
            $identJm = $sessJm['identifier'];
            $namaJm = null;
            $stJmU = $pdo->prepare("SELECT nip, nama FROM users WHERE username = ? OR nip = ? LIMIT 1");
            $stJmU->execute([$identJm, $identJm]);
            $uJm = $stJmU->fetch();
            $stJm = $pdo->prepare("SELECT nama_guru FROM profil_guru WHERE nip = ? OR REPLACE(nip, ' ', '') = ?");
            $stJm->execute([$uJm['nip'] ?? $identJm, $identJm]);
            $namaJm = $stJm->fetchColumn();
            if (!$namaJm) $namaJm = $uJm['nama'] ?? null;
            if (!$namaJm || trim($namaJm) === '') sendJson(['success' => true, 'data' => []]);
            $stmtJm = $pdo->prepare("
                SELECT hari, kelas, mata_pelajaran, jam_ke, waktu, nama_guru
                FROM jadwal
                WHERE TRIM(LOWER(nama_guru)) = TRIM(LOWER(?))
                ORDER BY FIELD(LOWER(hari), 'senin','selasa','rabu','kamis','jumat','sabtu','minggu'), jam_ke ASC, waktu ASC
            ");
            $stmtJm->execute([trim($namaJm)]);
            $dataJm = array_map(function($r) {
                $waktuArrJm = array_map('trim', explode('-', $r['waktu'] ?? ''));
                return [
                    'hari' => $r['hari'],
                    'kelas' => $r['kelas'],
                    'mapel' => $r['mata_pelajaran'],
                    'mata_pelajaran' => $r['mata_pelajaran'],
                    'pengajar' => $r['nama_guru'],
                    'jamKe' => $r['jam_ke'],
                    'jam_ke' => $r['jam_ke'],
                    'waktu' => $r['waktu'],
                    'jam_mulai' => $waktuArrJm[0] ?? ($r['waktu'] ?? '-'),
                    'jam_selesai' => $waktuArrJm[1] ?? '-'
                ];
            }, $stmtJm->fetchAll());
            sendJson(['success' => true, 'data' => $dataJm]);
            break;

        case 'getGuruForScanCache':
            $stmt = $pdo->query("SELECT nip, nama_guru, jabatan FROM profil_guru ORDER BY nama_guru ASC");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return ['nip' => $r['nip'], 'nama' => $r['nama_guru'], 'jabatan' => $r['jabatan'] ?? ''];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'importGuruBulk':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $dataArr = $input['data'] ?? $input['formattedData'] ?? [];
            $added = 0; $skipped = 0;
            foreach ($dataArr as $u) {
                $username = trim($u['username'] ?? $u['Username'] ?? '');
                if (empty($username)) { $skipped++; continue; }
                $chk = $pdo->prepare("SELECT id FROM users WHERE username = ?");
                $chk->execute([$username]);
                if ($chk->fetch()) { $skipped++; continue; }
                $nip   = trim($u['nip'] ?? $u['NIP'] ?? '');
                $role  = trim($u['role'] ?? $u['Role'] ?? 'guru');
                $kelas = trim($u['kelas'] ?? $u['Kelas'] ?? '');
                $nama  = trim($u['nama'] ?? $u['Nama'] ?? '');
                $ins = $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip) VALUES (?, ?, ?, ?, ?)");
                $ins->execute([
                    $username,
                    password_hash($u['password'] ?? $u['Password'] ?? 'password123', PASSWORD_DEFAULT),
                    $role ?: 'guru',
                    $kelas,
                    $nip
                ]);
                // Jika ada nama & NIP, auto-insert ke profil_guru agar data nama tersimpan
                if (!empty($nama) && !empty($nip)) {
                    $chkP = $pdo->prepare("SELECT id FROM profil_guru WHERE nip = ?");
                    $chkP->execute([$nip]);
                    if (!$chkP->fetch()) {
                        $insP = $pdo->prepare("INSERT INTO profil_guru (nip, nama_guru, mata_pelajaran, no_hp, email, status_kepegawaian, jabatan) VALUES (?, ?, '', '', '', '', '')");
                        $insP->execute([$nip, $nama]);
                    }
                }
                $added++;
            }
            sendJson(['success' => true, 'message' => "Import selesai: $added ditambahkan, $skipped dilewati", 'added' => $added, 'skipped' => $skipped]);
            break;

        case 'importProfilGuruBulk':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $dataArr = $input['data'] ?? $input['formattedData'] ?? [];
            $added = 0; $skipped = 0; $akunDibuat = 0;
            foreach ($dataArr as $g) {
                $nip = trim($g['nip'] ?? $g['NIP'] ?? '');
                if (empty($nip)) { $skipped++; continue; }
                // Cek duplikat NIP
                $chk = $pdo->prepare("SELECT id FROM profil_guru WHERE nip = ?");
                $chk->execute([$nip]);
                if ($chk->fetch()) { $skipped++; continue; }
                // Cek duplikat Email (hanya jika email diisi)
                $emailBulkGuru = strtolower(trim($g['email'] ?? $g['Email'] ?? ''));
                if ($emailBulkGuru !== '') {
                    $chkEG = $pdo->prepare("SELECT id FROM profil_guru WHERE LOWER(email) = ?");
                    $chkEG->execute([$emailBulkGuru]);
                    if ($chkEG->fetch()) { $skipped++; continue; }
                }
                $namaGuru = trim($g['namaGuru'] ?? $g['nama'] ?? $g['Nama'] ?? '');
                $ins = $pdo->prepare("INSERT INTO profil_guru (nip, nama_guru, mata_pelajaran, no_hp, email, status_kepegawaian, jabatan, jenis_kelamin, tanggal_lahir, agama, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([
                    $nip,
                    $namaGuru,
                    $g['mapel'] ?? $g['mataPelajaran'] ?? $g['Bidang Studi'] ?? '',
                    $g['noHp'] ?? $g['No Telepon'] ?? '',
                    $emailBulkGuru !== '' ? $emailBulkGuru : null,
                    $g['statusKepegawaian'] ?? '',
                    $g['jabatan'] ?? $g['Jabatan'] ?? '',
                    $g['jenisKelamin'] ?? $g['Jenis Kelamin'] ?? '',
                    $g['tanggalLahir'] ?? $g['Tanggal Lahir'] ?? null,
                    $g['agama'] ?? $g['Agama'] ?? '',
                    $g['alamat'] ?? $g['Alamat'] ?? ''
                ]);
                $added++;
                // Auto-create akun jika belum ada
                $cekUser = $pdo->prepare("SELECT id FROM users WHERE username = ? OR nip = ?");
                $cekUser->execute([$nip, $nip]);
                if (!$cekUser->fetch()) {
                    $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip, nama) VALUES (?, ?, 'guru', '', ?, ?)")
                        ->execute([$nip, password_hash($nip, PASSWORD_DEFAULT), $nip, $namaGuru]);
                    $akunDibuat++;
                }
            }
            sendJson(['success' => true, 'message' => "Import selesai: $added ditambahkan, $skipped dilewati, $akunDibuat akun login otomatis dibuat", 'added' => $added, 'skipped' => $skipped, 'akunDibuat' => $akunDibuat]);
            break;

}