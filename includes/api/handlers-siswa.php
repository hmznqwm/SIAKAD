<?php
switch ($action) {
        case 'getSiswaList':
            // PERBAIKAN KEAMANAN: data siswa hanya bisa diakses oleh user yang login
            requireAuth($pdo, $input);
            $filterKelas = $_GET['filterKelas'] ?? $input['filterKelas'] ?? null;
            $sql = "SELECT * FROM siswa WHERE status_siswa = 'aktif'";
            $params = [];

            if ($filterKelas) {
                $kelasList = array_map('trim', explode(',', $filterKelas));
                $inQuery = implode(',', array_fill(0, count($kelasList), '?'));
                $sql .= " AND kelas IN ($inQuery)";
                $params = $kelasList;
            }
            $sql .= " ORDER BY kelas ASC, nama ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $data = array_map(function($r) {
                return [
                    'nama' => $r['nama'],
                    'nisn' => $r['nisn'],
                    'jenisKelamin' => $r['jenis_kelamin'],
                    'tanggalLahir' => $r['tanggal_lahir'],
                    'tempatLahir' => $r['tempat_lahir'] ?? '',
                    'agama' => $r['agama'],
                    'namaAyah' => $r['nama_ayah'],
                    'namaIbu' => $r['nama_ibu'],
                    'noHp' => $r['no_hp'],
                    'email' => $r['email'] ?? '',
                    'kelas' => $r['kelas'],
                    'alamat' => $r['alamat']
                ];
            }, $rows);

            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'getSiswaByKelas':
            // Mendukung multi-kelas: $kelas boleh "7A" atau "7A,8B" (guru dgn >1 kelas)
            $kelas = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][0] ?? '';
            // PEMBATASAN AKSES: guru hanya boleh melihat siswa kelas yang dia ampu,
            // walikelas hanya kelas yang diwalikan
            $sessSbK = requireAuth($pdo, $input);
            if (in_array($sessSbK['role'], ['guru', 'walikelas'], true)) {
                $aksesSbK = guruAksesKelasMapel($pdo, $sessSbK);
                $okSbK = false;
                foreach (normalizeKelasList($kelas) as $kReq) {
                    if (guruBolehAksesKelas($aksesSbK, $kReq)) { $okSbK = true; break; }
                }
                if (!$okSbK) sendJson(['success' => true, 'data' => []]);
            }
            [$kelasClause, $kelasParams] = buildKelasInClause($kelas);
            $stmt = $pdo->prepare("SELECT * FROM siswa WHERE status_siswa = 'aktif' $kelasClause ORDER BY nama ASC");
            $stmt->execute($kelasParams);
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return [
                    'nama' => $r['nama'],
                    'nisn' => $r['nisn'],
                    'jenisKelamin' => $r['jenis_kelamin'],
                    'tanggalLahir' => $r['tanggal_lahir'],
                    'kelas' => $r['kelas']
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'getSiswaByNisn':
            $sessByNisn = requireAuth($pdo, $input);
            $nisn = trim((string)($_GET['nisn'] ?? $input['nisn'] ?? ''));
            // Siswa/alumni hanya boleh melihat data dirinya sendiri.
            if (in_array($sessByNisn['role'], ['siswa','alumni'], true) && $sessByNisn['identifier'] !== $nisn) {
                sendJson(['success' => false, 'message' => 'Akses ditolak']);
            }
            // Toleransi format: nol depan hilang / notasi Excel
            $r = resolveSiswaByNisn($pdo, $nisn);
            if ($r) {
                sendJson([
                    'success' => true,
                    'data' => [
                        'nama' => $r['nama'],
                        'nisn' => $r['nisn'],
                        'jenisKelamin' => $r['jenis_kelamin'],
                        'tanggalLahir' => $r['tanggal_lahir'],
                        'agama' => $r['agama'],
                        'namaAyah' => $r['nama_ayah'],
                        'namaIbu' => $r['nama_ibu'],
                        'noHp' => $r['no_hp'],
                        'kelas' => $r['kelas'],
                        'tempatLahir' => $r['tempat_lahir'] ?? '',
                        'email' => $r['email'] ?? '',
                        'alamat' => $r['alamat'],
                        'foto' => $r['foto'] ?? null
                    ]
                ]);
            } else {
                sendJson(['success' => false, 'message' => 'Siswa tidak ditemukan']);
            }
            break;

        case 'updateFotoSiswa':
            // PERBAIKAN KEAMANAN: wajib sesi valid; siswa hanya bisa edit foto sendiri
            $sessFoto = requireAuth($pdo, $input);
            $nisn = trim($input['nisn'] ?? '');
            // Siswa hanya boleh update foto sendiri; admin/guru boleh update siapapun
            if ($sessFoto['role'] === 'siswa' && $sessFoto['identifier'] !== $nisn) {
                sendJson(['success' => false, 'message' => 'Akses ditolak']);
                break;
            }
            $foto = $input['foto'] ?? '';
            if (!$nisn || !$foto) {
                sendJson(['success' => false, 'message' => 'NISN dan foto wajib diisi']);
                break;
            }
            // Validasi base64 data URL foto (jpeg/png/webp)
            if (!preg_match('#^data:image/(jpeg|png|webp);base64,#i', $foto)) {
                sendJson(['success' => false, 'message' => 'Format foto tidak valid. Gunakan JPG/PNG/WebP.']);
                break;
            }
            // Batasi ukuran ±2MB
            $raw = base64_decode(preg_replace('#^data:image/[a-z]+;base64,#i', '', $foto));
            if ($raw === false || strlen($raw) > 2 * 1024 * 1024) {
                sendJson(['success' => false, 'message' => 'Ukuran foto maksimal 2MB.']);
                break;
            }
            // PERBAIKAN KEAMANAN: validasi MIME type sesungguhnya dari isi file
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $detectedFotoMime = $finfo->buffer($raw);
            if (!in_array($detectedFotoMime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                sendJson(['success' => false, 'message' => 'Format foto tidak valid. Hanya JPG/PNG/WebP.']);
                break;
            }
            // PERBAIKAN KEAMANAN: simpan foto ke disk (bukan base64 di DB) — lebih efisien & aman
            $fotoDir = __DIR__ . '/uploads/foto';
            if (!is_dir($fotoDir)) { @mkdir($fotoDir, 0775, true); }
            $fotoExt = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$detectedFotoMime];
            $fotoPath = 'uploads/foto/' . bin2hex(random_bytes(12)) . '.' . $fotoExt;
            if (file_put_contents(__DIR__ . '/' . $fotoPath, $raw) === false) {
                sendJson(['success' => false, 'message' => 'Gagal menyimpan foto, coba lagi.']);
                break;
            }
            // Hapus foto lama jika ada (bukan base64)
            $oldFoto = $pdo->prepare("SELECT foto FROM siswa WHERE nisn = ?");
            $oldFoto->execute([$nisn]);
            $oldFotoRow = $oldFoto->fetch();
            if ($oldFotoRow && $oldFotoRow['foto'] && strpos($oldFotoRow['foto'], 'uploads/') === 0) {
                $oldPath = __DIR__ . '/' . $oldFotoRow['foto'];
                if (file_exists($oldPath)) { @unlink($oldPath); }
            }
            $sts = $pdo->prepare("UPDATE siswa SET foto = ? WHERE nisn = ? AND status_siswa = 'aktif'");
            $sts->execute([$fotoPath, $nisn]);
            // PERBAIKAN BUG: rowCount() >= 0 selalu true; harus > 0
            if ($sts->rowCount() > 0) {
                sendJson(['success' => true, 'message' => 'Foto profil berhasil diperbarui']);
            } else {
                sendJson(['success' => false, 'message' => 'Siswa tidak ditemukan atau tidak ada perubahan']);
            }
            break;

        case 'addSiswa':
            // PERBAIKAN KEAMANAN: hanya admin yang boleh tambah siswa
            requireAuth($pdo, $input, ['admin']);
            $s = $input['siswaData'] ?? $input;
            $addNisn  = trim($s['nisn'] ?? '');
            $addEmail = strtolower(trim($s['email'] ?? ''));

            // Cek duplikat NISN
            if ($addNisn !== '') {
                $stmt = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
                $stmt->execute([$addNisn]);
                if ($stmt->fetch()) {
                    sendJson(['success' => false, 'message' => 'NISN "' . $addNisn . '" sudah terdaftar. Gunakan NISN lain.']);
                }
            }

            // Cek duplikat Email (hanya jika email diisi)
            if ($addEmail !== '') {
                $stmtE = $pdo->prepare("SELECT id FROM siswa WHERE LOWER(email) = ?");
                $stmtE->execute([$addEmail]);
                if ($stmtE->fetch()) {
                    sendJson(['success' => false, 'message' => 'Email "' . $addEmail . '" sudah digunakan oleh siswa lain.']);
                }
            }

            $addTglLahir = !empty($s['tanggalLahir']) ? $s['tanggalLahir'] : null;
            $ins = $pdo->prepare("INSERT INTO siswa (nama, nisn, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, nama_ayah, nama_ibu, no_hp, email, kelas, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                $s['nama'] ?? '',
                $addNisn,
                $s['jenisKelamin'] ?? '',
                $s['tempatLahir'] ?? '',
                $addTglLahir,
                $s['agama'] ?? '',
                $s['namaAyah'] ?? '',
                $s['namaIbu'] ?? '',
                $s['noHp'] ?? '',
                $addEmail !== '' ? $addEmail : null,
                $s['kelas'] ?? '',
                $s['alamat'] ?? ''
            ]);

            // Otomatis buat akun login siswa jika NISN diisi dan belum ada di users
            $akunDibuat = false;
            if ($addNisn !== '') {
                $cekU = $pdo->prepare("SELECT id FROM users WHERE username = ?");
                $cekU->execute([$addNisn]);
                if (!$cekU->fetch()) {
                    $defaultPass = $addTglLahir ? date('dmY', strtotime($addTglLahir)) : $addNisn;
                    $hashedPass  = password_hash($defaultPass, PASSWORD_DEFAULT);
                    $pdo->prepare("INSERT INTO users (username, password, role, kelas, nip, nama) VALUES (?, ?, 'siswa', ?, NULL, ?)")
                        ->execute([$addNisn, $hashedPass, $s['kelas'] ?? '', $s['nama'] ?? '']);
                    $akunDibuat = true;
                }
            }

            $msg = 'Siswa berhasil ditambahkan';
            if ($akunDibuat) {
                $passInfo = $addTglLahir ? date('dmY', strtotime($addTglLahir)) : $addNisn;
                $msg .= '. Akun login dibuat otomatis — username: ' . $addNisn . ', password: ' . $passInfo;
            }
            sendJson(['success' => true, 'message' => $msg]);
            break;

        case 'updateSiswa':
            // PERBAIKAN KEAMANAN: hanya admin yang boleh ubah data siswa
            requireAuth($pdo, $input, ['admin']);
            $s = $input['siswaData'] ?? $input;
            $oldNisn = $input['oldNisn'] ?? ($s['oldNisn'] ?? ($s['nisn'] ?? ''));
            $newNisnSiswa = trim($s['nisn'] ?? $oldNisn);
            $updEmail = strtolower(trim($s['email'] ?? ''));

            // Cek duplikat NISN (hanya jika NISN berubah)
            if ($newNisnSiswa !== '' && $newNisnSiswa !== $oldNisn) {
                $chkNisn = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
                $chkNisn->execute([$newNisnSiswa]);
                if ($chkNisn->fetch()) {
                    sendJson(['success' => false, 'message' => 'NISN "' . $newNisnSiswa . '" sudah digunakan oleh siswa lain.']);
                }
            }

            // Cek duplikat Email (hanya jika email diisi, kecualikan siswa yang sedang diedit)
            if ($updEmail !== '') {
                $chkEmail = $pdo->prepare("SELECT id FROM siswa WHERE LOWER(email) = ? AND nisn != ?");
                $chkEmail->execute([$updEmail, $oldNisn]);
                if ($chkEmail->fetch()) {
                    sendJson(['success' => false, 'message' => 'Email "' . $updEmail . '" sudah digunakan oleh siswa lain.']);
                }
            }

            $upd = $pdo->prepare("UPDATE siswa SET nama=?, nisn=?, jenis_kelamin=?, tempat_lahir=?, tanggal_lahir=?, agama=?, nama_ayah=?, nama_ibu=?, no_hp=?, email=?, kelas=?, alamat=? WHERE nisn=?");
            $upd->execute([
                $s['nama'] ?? '',
                $newNisnSiswa,
                $s['jenisKelamin'] ?? '',
                $s['tempatLahir'] ?? '',
                $s['tanggalLahir'] ?: null,
                $s['agama'] ?? '',
                $s['namaAyah'] ?? '',
                $s['namaIbu'] ?? '',
                $s['noHp'] ?? '',
                $updEmail !== '' ? $updEmail : null,
                $s['kelas'] ?? '',
                $s['alamat'] ?? '',
                $oldNisn
            ]);
            // SINKRON: update akun users (username=nisn, kelas, nama) jika ada
            $pdo->prepare("UPDATE users SET username=?, kelas=?, nama=? WHERE username=? AND role IN ('siswa', 'alumni')")
                ->execute([$newNisnSiswa, $s['kelas'] ?? '', $s['nama'] ?? '', $oldNisn]);
            // Update identifier sesi jika username berubah
            if ($newNisnSiswa !== $oldNisn) {
                $pdo->prepare("UPDATE sessions SET identifier=? WHERE identifier=?")->execute([$newNisnSiswa, $oldNisn]);
            }
            sendJson(['success' => true, 'message' => 'Data siswa diperbarui']);
            break;

        case 'deleteSiswa':
            // PERBAIKAN KEAMANAN: hanya admin yang boleh hapus siswa
            requireAuth($pdo, $input, ['admin']);
            $nisn = $input['nisn'] ?? $_GET['nisn'] ?? '';
            // Ambil siswa_id (int) sebelum menghapus, untuk bersihkan tagihan & transaksi terkait
            $qId = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
            $qId->execute([$nisn]);
            $siswaId = (string)($qId->fetchColumn() ?: '');
            $del = $pdo->prepare("DELETE FROM siswa WHERE nisn = ?");
            $del->execute([$nisn]);
            // SINKRON: hapus akun users & sesi siswa ini
            $pdo->prepare("DELETE FROM users WHERE username = ? AND role IN ('siswa', 'alumni')")->execute([$nisn]);
            $pdo->prepare("DELETE FROM sessions WHERE identifier = ?")->execute([$nisn]);
            // Riwayat tagihan & transaksi TETAP disimpan
            sendJson(['success' => true, 'message' => 'Siswa berhasil dihapus']);
            break;

        case 'deleteMultipleSiswa':
            // PERBAIKAN KEAMANAN: hanya admin yang boleh hapus massal
            requireAuth($pdo, $input, ['admin']);
            $nisnArray = $input['nisnArray'] ?? [];
            if (!empty($nisnArray)) {
                $inQuery = implode(',', array_fill(0, count($nisnArray), '?'));
                // Ambil id siswa sebelum hapus (untuk bersihkan tagihan & transaksi)
                $qIds = $pdo->prepare("SELECT CAST(id AS CHAR) FROM siswa WHERE nisn IN ($inQuery)");
                $qIds->execute($nisnArray);
                $siswaIds = $qIds->fetchAll(PDO::FETCH_COLUMN);
                $del = $pdo->prepare("DELETE FROM siswa WHERE nisn IN ($inQuery)");
                $del->execute($nisnArray);
                // SINKRON: hapus akun users & sesi semua siswa ini
                $pdo->prepare("DELETE FROM users WHERE username IN ($inQuery) AND role IN ('siswa', 'alumni')")->execute($nisnArray);
                $pdo->prepare("DELETE FROM sessions WHERE identifier IN ($inQuery)")->execute($nisnArray);
                // Riwayat tagihan & transaksi TETAP disimpan
            }
            sendJson(['success' => true, 'message' => 'Beberapa siswa berhasil dihapus']);
            break;

        case 'importSiswaBulk':
            // PERBAIKAN KEAMANAN: hanya admin yang boleh import massal
            requireAuth($pdo, $input, ['admin']);
            $dataArr = $input['data'] ?? [];
            $added = 0; $skipped = 0;
            foreach ($dataArr as $s) {
                $nisn = trim(str_replace("'", "", $s['nisn'] ?? ''));
                if (empty($nisn)) { $skipped++; continue; }
                // Cek duplikat NISN
                $chk = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
                $chk->execute([$nisn]);
                if ($chk->fetch()) { $skipped++; continue; }
                // Cek duplikat Email (hanya jika email diisi)
                $bulkEmail = strtolower(trim($s['email'] ?? ''));
                if ($bulkEmail !== '') {
                    $chkBulkEmail = $pdo->prepare("SELECT id FROM siswa WHERE LOWER(email) = ?");
                    $chkBulkEmail->execute([$bulkEmail]);
                    if ($chkBulkEmail->fetch()) { $skipped++; continue; }
                }
                $ins = $pdo->prepare("INSERT INTO siswa (nama, nisn, jenis_kelamin, tanggal_lahir, agama, nama_ayah, nama_ibu, no_hp, kelas, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([
                    $s['nama'] ?? '', $nisn, $s['jenisKelamin'] ?? '', $s['tanggalLahir'] ?: null,
                    $s['agama'] ?? '', $s['namaAyah'] ?? '', $s['namaIbu'] ?? '',
                    $s['noHp'] ?? '', $s['kelas'] ?? '', $s['alamat'] ?? ''
                ]);
                $added++;
            }
            sendJson(['success' => true, 'message' => "Import selesai: $added ditambahkan, $skipped dilewati", 'added' => $added, 'skipped' => $skipped]);
            break;


        case 'getSiswaForScanCache':
            $stmt = $pdo->query("SELECT nisn, nama, kelas FROM siswa WHERE status_siswa = 'aktif' ORDER BY nama ASC");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return ['nisn' => $r['nisn'], 'nama' => $r['nama'], 'kelas' => $r['kelas']];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

}
