<?php
switch ($action) {
        case 'submitPendaftaran':
            // Publik — tanpa token
            $d = $input;
            $nama = trim($d['nama'] ?? '');
            $nisn = trim($d['nisn'] ?? '');
            $kelasMinat = trim($d['kelasMinat'] ?? '');
            $jenisKelamin = trim($d['jenisKelamin'] ?? '');
            $tempatLahir = trim($d['tempatLahir'] ?? '');
            $tanggalLahir = trim($d['tanggalLahir'] ?? '');
            $agama = trim($d['agama'] ?? '');
            $namaAyah = trim($d['namaAyah'] ?? '');
            $namaIbu = trim($d['namaIbu'] ?? '');
            $noHp = trim($d['noHp'] ?? '');
            $email = trim($d['email'] ?? '');
            $alamat = trim($d['alamat'] ?? '');
            $berkasNama = trim($d['berkasNama'] ?? '');
            $berkasB64 = trim($d['berkasB64'] ?? '');

            $wajib = [
                'nama' => $nama, 'NISN' => $nisn, 'jurusan minat' => $kelasMinat,
                'jenis kelamin' => $jenisKelamin, 'tempat lahir' => $tempatLahir,
                'tanggal lahir' => $tanggalLahir, 'agama' => $agama,
                'nama ayah' => $namaAyah, 'nama ibu' => $namaIbu,
                'no. handphone' => $noHp, 'email' => $email, 'alamat' => $alamat
            ];
            foreach ($wajib as $label => $val) {
                if ($val === '') {
                    sendJson(['success' => false, 'message' => ucfirst($label) . ' wajib diisi']);
                }
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                sendJson(['success' => false, 'message' => 'Format email tidak valid']);
            }

            // Validasi NISN ke Basis Data Kemendikbud secara otomatis
            $nisnValidation = validateNisnExternal($pdo, $nisn, $namaIbu);
            if (!$nisnValidation['success']) {
                sendJson(['success' => false, 'message' => $nisnValidation['message']]);
            }

            // Berkas
            $berkasPath = null;
            if ($berkasNama !== '' || $berkasB64 !== '') {
                $ext = strtolower(pathinfo($berkasNama, PATHINFO_EXTENSION));
                if (!in_array($ext, ['jpg', 'jpeg', 'png', 'pdf'])) {
                    sendJson(['success' => false, 'message' => 'Format berkas tidak didukung. Gunakan JPG, PNG, atau PDF']);
                }
                $raw = base64_decode($berkasB64, true);
                if ($raw === false || $raw === '') {
                    sendJson(['success' => false, 'message' => 'Berkas gagal dibaca, coba unggah ulang']);
                }
                if (strlen($raw) > 2 * 1024 * 1024) {
                    sendJson(['success' => false, 'message' => 'Ukuran berkas melebihi 2MB']);
                }
                // PERBAIKAN KEAMANAN: validasi MIME type sesungguhnya (bukan hanya ekstensi nama file)
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $detectedMime = $finfo->buffer($raw);
                $allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
                if (!in_array($detectedMime, $allowedMimes, true)) {
                    sendJson(['success' => false, 'message' => 'Tipe file tidak diizinkan. Hanya JPG, PNG, PDF.']);
                }
                $uploadDir = __DIR__ . '/uploads/pendaftar';
                if (!is_dir($uploadDir)) { @mkdir($uploadDir, 0775, true); }
                $berkasPath = 'uploads/pendaftar/' . bin2hex(random_bytes(12)) . '.' . $ext; // KEAMANAN: nama acak, bukan timestamp
                if (file_put_contents(__DIR__ . '/' . $berkasPath, $raw) === false) {
                    sendJson(['success' => false, 'message' => 'Gagal menyimpan berkas, coba lagi']);
                }
            } else {
                sendJson(['success' => false, 'message' => 'Berkas pendukung wajib diunggah']);
            }

            // Cek duplikat nama (pendaftaran ganda menunggu)
            $check = $pdo->prepare("SELECT id FROM pendaftar WHERE LOWER(nama) = ? AND status = 'Menunggu'");
            $check->execute([strtolower($nama)]);
            if ($check->fetch()) {
                sendJson(['success' => false, 'message' => 'Data pendaftaran dengan nama ini sudah masuk dan sedang menunggu verifikasi']);
            }

            // Cek NISN sudah terdaftar sebagai siswa aktif
            if ($nisn !== '') {
                $chkNisnSiswa = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
                $chkNisnSiswa->execute([$nisn]);
                if ($chkNisnSiswa->fetch()) {
                    sendJson(['success' => false, 'message' => 'NISN "' . $nisn . '" sudah terdaftar sebagai siswa. Hubungi administrator jika ada kesalahan.']);
                }
                // Cek NISN sudah ada di antrian pendaftar
                $chkNisnPendaftar = $pdo->prepare("SELECT id FROM pendaftar WHERE nisn = ? AND status = 'Menunggu'");
                $chkNisnPendaftar->execute([$nisn]);
                if ($chkNisnPendaftar->fetch()) {
                    sendJson(['success' => false, 'message' => 'NISN "' . $nisn . '" sudah digunakan pada pendaftaran lain yang sedang menunggu verifikasi.']);
                }
            }

            // Cek Email sudah terdaftar sebagai siswa aktif
            $emailLower = strtolower($email);
            $chkEmailSiswa = $pdo->prepare("SELECT id FROM siswa WHERE LOWER(email) = ?");
            $chkEmailSiswa->execute([$emailLower]);
            if ($chkEmailSiswa->fetch()) {
                sendJson(['success' => false, 'message' => 'Email "' . $email . '" sudah terdaftar sebagai siswa. Hubungi administrator jika ada kesalahan.']);
            }
            // Cek Email sudah ada di antrian pendaftar
            $chkEmailPendaftar = $pdo->prepare("SELECT id FROM pendaftar WHERE LOWER(email) = ? AND status = 'Menunggu'");
            $chkEmailPendaftar->execute([$emailLower]);
            if ($chkEmailPendaftar->fetch()) {
                sendJson(['success' => false, 'message' => 'Email "' . $email . '" sudah digunakan pada pendaftaran lain yang sedang menunggu verifikasi.']);
            }

            $ins = $pdo->prepare("INSERT INTO pendaftar (nama, nisn, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, nama_ayah, nama_ibu, no_hp, email, alamat, kelas_minat, berkas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                $nama,
                $nisn,
                $jenisKelamin,
                $tempatLahir,
                $tanggalLahir ?: null,
                $agama,
                $namaAyah,
                $namaIbu,
                $noHp,
                $email,
                $alamat,
                $kelasMinat,
                $berkasPath
            ]);
            sendJson(['success' => true, 'message' => 'Formulir berhasil dikirim. Pendaftaran Anda sedang menunggu verifikasi.']);
            break;

        case 'getPendaftarList':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin'])) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $statusFilter = $input['filterStatus'] ?? $_GET['filterStatus'] ?? '';
            if ($statusFilter !== '') {
                $stmt = $pdo->prepare("SELECT * FROM pendaftar WHERE status = ? ORDER BY id DESC");
                $stmt->execute([$statusFilter]);
            } else {
                $stmt = $pdo->query("SELECT * FROM pendaftar ORDER BY id DESC");
            }
            $rows = $stmt->fetchAll();
            $base = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
            $base .= $_SERVER['HTTP_HOST'];
            $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
            sendJson(['success' => true, 'data' => $rows, 'linkPendaftaran' => $base . rtrim($dir, '/') . '/daftar.php']);
            break;

        case 'setStatusPendaftar':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin'])) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $id = (int)($input['id'] ?? 0);
            $status = $input['status'] ?? '';
            if (!$id || !in_array($status, ['Diterima', 'Ditolak'])) {
                sendJson(['success' => false, 'message' => 'Data tidak valid']);
            }
            $stmt = $pdo->prepare("SELECT * FROM pendaftar WHERE id = ?");
            $stmt->execute([$id]);
            $p = $stmt->fetch();
            if (!$p) {
                sendJson(['success' => false, 'message' => 'Pendaftar tidak ditemukan']);
            }
            if ($status === 'Diterima') {
                $r = terimaPendaftar($pdo, $p);
                if (!$r['ok']) sendJson(['success' => false, 'message' => $r['message']]);
                $msg = 'Pendaftar diterima & data siswa dibuat';
            } else {
                $msg = 'Pendaftar ditolak';
            }
            $pdo->prepare("UPDATE pendaftar SET status = ? WHERE id = ?")->execute([$status, $id]);
            sendJson(['success' => true, 'message' => $msg]);
            break;

        case 'assignKelasPendaftar':
            $token = $input['token'] ?? '';
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin'])) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $id = (int)($input['id'] ?? 0);
            $assignedKelas = trim($input['assigned_kelas'] ?? '');
            if (!$id) { sendJson(['success' => false, 'message' => 'ID tidak valid']); }
            $stmt = $pdo->prepare("SELECT id FROM pendaftar WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) { sendJson(['success' => false, 'message' => 'Pendaftar tidak ditemukan']); }
            $pdo->prepare("UPDATE pendaftar SET assigned_kelas = ? WHERE id = ?")->execute([$assignedKelas ?: null, $id]);
            sendJson(['success' => true, 'message' => $assignedKelas ? "Kelas $assignedKelas berhasil ditentukan" : 'Kelas berhasil dikosongkan']);
            break;

        case 'setStatusPendaftarMasal':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin'])) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $ids = $input['ids'] ?? [];
            $status = $input['status'] ?? '';
            if (!is_array($ids) || !count($ids) || !in_array($status, ['Diterima', 'Ditolak'])) {
                sendJson(['success' => false, 'message' => 'Data tidak valid']);
            }
            $ids = array_values(array_unique(array_map('intval', $ids)));
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $pdo->prepare("SELECT * FROM pendaftar WHERE id IN ($placeholders)");
            $stmt->execute($ids);
            $rows = $stmt->fetchAll();
            $sukses = 0;
            $gagal = [];
            $pdo->beginTransaction();
            try {
                foreach ($rows as $p) {
                    if ($status === 'Diterima') {
                        $r = terimaPendaftar($pdo, $p);
                        if (!$r['ok']) { $gagal[] = $p['nama'] . ' (' . $r['message'] . ')'; continue; }
                    }
                    $pdo->prepare("UPDATE pendaftar SET status = ? WHERE id = ?")->execute([$status, $p['id']]);
                    $sukses++;
                }
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                sendJson(['success' => false, 'message' => 'Gagal proses masal: ' . $e->getMessage()]);
            }
            $pesan = $sukses . ' pendaftar berhasil diproses';
            if (count($gagal)) $pesan .= '. Gagal: ' . implode('; ', array_slice($gagal, 0, 5));
            sendJson(['success' => true, 'message' => $pesan, 'gagal' => $gagal]);
            break;

        case 'hapusPendaftar':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin'])) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $id = (int)($input['id'] ?? 0);
            $pdo->prepare("DELETE FROM pendaftar WHERE id = ?")->execute([$id]);
            sendJson(['success' => true, 'message' => 'Data pendaftar dihapus']);
            break;

        case 'hapusPendaftarMasal':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin'])) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $ids = $input['ids'] ?? [];
            if (!is_array($ids) || !count($ids)) {
                sendJson(['success' => false, 'message' => 'Tidak ada data dipilih']);
            }
            $ids = array_values(array_unique(array_map('intval', $ids)));
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $pdo->prepare("DELETE FROM pendaftar WHERE id IN ($placeholders)")->execute($ids);
            sendJson(['success' => true, 'message' => count($ids) . ' data pendaftar dihapus']);
            break;

}
