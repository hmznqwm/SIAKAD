<?php
switch ($action) {
        case 'ajukanIzinSiswa':
            try {
                $pdo->exec("CREATE TABLE IF NOT EXISTS `perizinan_siswa` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `tanggal` DATE NOT NULL,
                    `nisn` VARCHAR(50) DEFAULT NULL,
                    `nama_siswa` VARCHAR(150) DEFAULT NULL,
                    `kelas` VARCHAR(50) DEFAULT NULL,
                    `mata_pelajaran` VARCHAR(100) DEFAULT NULL,
                    `jenis` VARCHAR(50) DEFAULT 'Izin',
                    `alasan` TEXT DEFAULT NULL,
                    `status_izin` VARCHAR(50) DEFAULT 'Menunggu',
                    `catatan_admin` VARCHAR(255) DEFAULT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } catch(Exception $e) {}

            try { $pdo->exec("ALTER TABLE perizinan_siswa ADD mata_pelajaran VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE perizinan_siswa ADD jenis VARCHAR(50) DEFAULT 'Izin'"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE perizinan_siswa ADD catatan_admin VARCHAR(255) DEFAULT NULL"); } catch(Exception $e) {}

            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $p = (isset($input['izinData']) && is_array($input['izinData'])) ? $input['izinData'] : $input;

            $tanggal = trim($p['tanggal'] ?? $p['tanggalIzin'] ?? $input['tanggal'] ?? date('Y-m-d'));
            $jenis   = trim($p['jenis'] ?? $p['jenisIzin'] ?? $input['jenis'] ?? 'Izin');
            $alasan  = trim($p['alasan'] ?? $p['keterangan'] ?? $input['keterangan'] ?? $input['alasan'] ?? '');
            $mapel   = trim($p['mapel'] ?? $p['mataPelajaran'] ?? $input['mapel'] ?? $input['mataPelajaran'] ?? '');
            $nisn    = trim($p['nisn'] ?? $input['nisn'] ?? '');
            $namaSiswa = trim($p['nama'] ?? $p['namaSiswa'] ?? $p['nama_siswa'] ?? $input['nama'] ?? $input['namaSiswa'] ?? '');
            $kelas   = trim($p['kelas'] ?? $input['kelas'] ?? '');

            $sess = verifyToken($pdo, $token);
            if ($sess && $sess['role'] === 'siswa') {
                $nisn = $sess['identifier'];
            }

            if (!empty($nisn) && (empty($namaSiswa) || empty($kelas))) {
                $sStmt = $pdo->prepare("SELECT nama, kelas FROM siswa WHERE TRIM(nisn) = TRIM(?)");
                $sStmt->execute([$nisn]);
                $sRow = $sStmt->fetch();
                if ($sRow) {
                    if (empty($namaSiswa)) $namaSiswa = $sRow['nama'];
                    if (empty($kelas)) $kelas = $sRow['kelas'];
                }
            }

            $ins = $pdo->prepare("INSERT INTO perizinan_siswa (tanggal, nisn, nama_siswa, kelas, mata_pelajaran, jenis, alasan, status_izin) VALUES (?, ?, ?, ?, ?, ?, ?, 'Menunggu')");
            if(!$ins->execute([$tanggal, $nisn, $namaSiswa, $kelas, $mapel, $jenis, $alasan])) {
                sendJson(['success' => false, 'message' => 'Gagal simpan ke DB']);
                break;
            }
            sendJson(['success' => true, 'message' => 'Pengajuan izin siswa berhasil dikirim']);
            break;

        case 'getPerizinanSiswaList':
        case 'getPerizinanSiswaMilikSaya':
            try { $pdo->exec("ALTER TABLE perizinan_siswa ADD mata_pelajaran VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE perizinan_siswa ADD jenis VARCHAR(50) DEFAULT 'Izin'"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE perizinan_siswa ADD catatan_admin VARCHAR(255) DEFAULT NULL"); } catch(Exception $e) {}

            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            $kelas = $_GET['kelas'] ?? $input['kelas'] ?? null;
            $bulan = $_GET['bulan'] ?? $input['bulan'] ?? null;
            $status = $_GET['status'] ?? $input['status'] ?? null;

            $sql = "SELECT p.*, 
                           COALESCE(NULLIF(p.nama_siswa, ''), s.nama, p.nisn, '-') AS nama_siswa_fix, 
                           COALESCE(NULLIF(p.kelas, ''), s.kelas, '-') AS kelas_fix 
                    FROM perizinan_siswa p 
                    LEFT JOIN siswa s ON TRIM(p.nisn) = TRIM(s.nisn) 
                    WHERE 1=1";
            $params = [];

            if ($sess && $sess['role'] === 'siswa') {
                $sql .= " AND (TRIM(p.nisn) = TRIM(?) OR TRIM(p.nama_siswa) = TRIM(?))";
                $params[] = $sess['identifier'];
                $params[] = $sess['identifier'];
            } elseif ($sess && ($sess['role'] === 'guru' || $sess['role'] === 'walikelas')) {
                // NOTE: tabel `sessions` tidak simpan kolom kelas, jadi ambil langsung
                // dari data guru saat ini: kelas_wali (jika walikelas) + semua kelas
                // yang dia ajar (guru_mengajar) - mendukung guru dgn >1 kelas.
                $guruClasses = array_map(fn($m) => $m['kelas'], getMengajarByNip($pdo, $sess['identifier']));
                $waliStmt = $pdo->prepare("SELECT kelas_wali FROM users WHERE username = ?");
                $waliStmt->execute([$sess['identifier']]);
                $kw = $waliStmt->fetchColumn();
                if (!empty($kw)) $guruClasses[] = $kw;
                $guruClasses = array_values(array_unique(array_filter(array_map('trim', $guruClasses))));
                if (!empty($guruClasses)) {
                    $inQ = implode(',', array_fill(0, count($guruClasses), '?'));
                    $sql .= " AND (p.kelas IN ($inQ) OR s.kelas IN ($inQ))";
                    foreach ($guruClasses as $gc) { $params[] = $gc; }
                    foreach ($guruClasses as $gc) { $params[] = $gc; }
                }
            }

            if ($kelas && trim($kelas) !== '') {
                $sql .= " AND (TRIM(p.kelas) = ? OR TRIM(s.kelas) = ?)";
                $params[] = trim($kelas);
                $params[] = trim($kelas);
            }

            if ($bulan && trim($bulan) !== '') {
                $sql .= " AND DATE_FORMAT(p.tanggal, '%Y-%m') = ?";
                $params[] = trim($bulan);
            }

            if ($status && trim($status) !== '') {
                $sql .= " AND (p.status_izin = ? OR p.status_izin LIKE ?)";
                $params[] = trim($status);
                $params[] = '%' . trim($status) . '%';
            }

            $sql .= " ORDER BY p.tanggal DESC, p.id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'rowId' => $r['id'],
                    'tanggal' => $r['tanggal'],
                    'tanggalIzin' => $r['tanggal'],
                    'nisn' => $r['nisn'],
                    'nama' => $r['nama_siswa_fix'],
                    'namaSiswa' => $r['nama_siswa_fix'],
                    'kelas' => $r['kelas_fix'],
                    'mataPelajaran' => $r['mata_pelajaran'] ?? '',
                    'mapel' => $r['mata_pelajaran'] ?? '',
                    'jenis' => $r['jenis'] ?? 'Izin',
                    'alasan' => $r['alasan'] ?? $r['keterangan'] ?? '',
                    'keterangan' => $r['alasan'] ?? $r['keterangan'] ?? '',
                    'status' => $r['status_izin'] ?? 'Menunggu',
                    'statusIzin' => $r['status_izin'] ?? 'Menunggu',
                    'catatanAdmin' => $r['catatan_admin'] ?? '',
                    'catatanGuru' => $r['catatan_admin'] ?? ''
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data, 'allData' => $data]);
            break;

        case 'updateStatusPerizinanSiswa':
            $id = $input['id'] ?? $input['rowId'] ?? null;
            $status = $input['statusIzin'] ?? $input['status'] ?? 'Disetujui';
            $catatan = $input['catatanAdmin'] ?? $input['catatan'] ?? '';
            if ($id) {
                $upd = $pdo->prepare("UPDATE perizinan_siswa SET status_izin = ?, catatan_admin = ? WHERE id = ?");
                $upd->execute([$status, $catatan, $id]);

                // Auto-sync ke tabel absensi
                try {
                    $pz = $pdo->prepare("SELECT * FROM perizinan_siswa WHERE id = ?");
                    $pz->execute([$id]);
                    $pRow = $pz->fetch();
                    if ($pRow) {
                        $nisn = trim($pRow['nisn'] ?? '');
                        $namaSiswa = trim($pRow['nama_siswa'] ?? '');
                        $kelas = trim($pRow['kelas'] ?? '');
                        $tgl = $pRow['tanggal'];
                        $mapel = trim($pRow['mata_pelajaran'] ?? '');
                        $jenis = trim($pRow['jenis'] ?? 'Izin');
                        $absenStatus = (mb_strtolower($jenis) === 'sakit') ? 'Sakit' : 'Izin';

                        if (strpos($status, 'Setujui') !== false || $status === 'Disetujui') {
                            $chk = $pdo->prepare("SELECT id FROM absensi WHERE (TRIM(nisn) = TRIM(?) OR TRIM(nama) = TRIM(?)) AND tanggal = ? LIMIT 1");
                            $chk->execute([$nisn, $namaSiswa, $tgl]);
                            $eRow = $chk->fetch();
                            if ($eRow) {
                                $updAbs = $pdo->prepare("UPDATE absensi SET status = ? WHERE id = ?");
                                $updAbs->execute([$absenStatus, $eRow['id']]);
                            } else {
                                $insAbs = $pdo->prepare("INSERT INTO absensi (tanggal, nisn, nama, kelas, mata_pelajaran, status) VALUES (?, ?, ?, ?, ?, ?)");
                                $insAbs->execute([$tgl, $nisn, $namaSiswa, $kelas, $mapel, $absenStatus]);
                            }
                        } else if ($status === 'Ditolak' || $status === 'Menunggu') {
                            $delAbs = $pdo->prepare("DELETE FROM absensi WHERE (TRIM(nisn) = TRIM(?) OR TRIM(nama) = TRIM(?)) AND tanggal = ? AND status IN ('Sakit', 'Izin')");
                            $delAbs->execute([$nisn, $namaSiswa, $tgl]);
                        }
                    }
                } catch(Exception $e) {}
            }
            sendJson(['success' => true, 'message' => 'Status izin siswa berhasil diperbarui']);
            break;

        case 'deletePerizinanSiswa':
            $id = $input['id'] ?? $input['rowId'] ?? $_GET['id'] ?? null;
            if ($id) {
                try {
                    $pz = $pdo->prepare("SELECT * FROM perizinan_siswa WHERE id = ?");
                    $pz->execute([$id]);
                    $pRow = $pz->fetch();
                    if ($pRow) {
                        $delAbs = $pdo->prepare("DELETE FROM absensi WHERE (TRIM(nisn) = TRIM(?) OR TRIM(nama) = TRIM(?)) AND tanggal = ? AND status IN ('Sakit', 'Izin')");
                        $delAbs->execute([trim($pRow['nisn'] ?? ''), trim($pRow['nama_siswa'] ?? ''), $pRow['tanggal']]);
                    }
                } catch(Exception $e) {}

                $del = $pdo->prepare("DELETE FROM perizinan_siswa WHERE id = ?");
                $del->execute([$id]);
            }
            sendJson(['success' => true, 'message' => 'Data izin siswa berhasil dihapus']);
            break;

        case 'ajukanIzinGuru':
            $pdo->exec("CREATE TABLE IF NOT EXISTS `perizinan_guru` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `tanggal` DATE NOT NULL,
                `nip` VARCHAR(50) DEFAULT NULL,
                `nama_guru` VARCHAR(150) NOT NULL,
                `jabatan` VARCHAR(100) DEFAULT NULL,
                `jenis` VARCHAR(50) DEFAULT 'Izin',
                `keterangan` TEXT DEFAULT NULL,
                `status` VARCHAR(50) DEFAULT 'Menunggu',
                `catatan_admin` VARCHAR(255) DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $p = (isset($input['izinData']) && is_array($input['izinData'])) ? $input['izinData'] : $input;

            $jenis = trim($p['jenis'] ?? $p['jenisIzin'] ?? $input['jenis'] ?? 'Izin');
            $ket   = trim($p['keterangan'] ?? $p['alasan'] ?? $input['keterangan'] ?? '');
            $tgl   = trim($p['tanggal'] ?? $p['tanggalIzin'] ?? $input['tanggal'] ?? date('Y-m-d'));
            $namaInput = trim($p['nama'] ?? $p['namaGuru'] ?? $p['nama_guru'] ?? $input['nama'] ?? $input['namaGuru'] ?? '');
            $nipInput  = trim($p['nip'] ?? $input['nip'] ?? '');
            $jabatanInput = trim($p['jabatan'] ?? $input['jabatan'] ?? '');

            $nip = $nipInput; $namaGuru = $namaInput; $jabatan = $jabatanInput;
            if ($token) {
                $sess = verifyToken($pdo, $token);
                if ($sess) {
                    $identifier = $sess['identifier'];
                    $gStmt = $pdo->prepare("SELECT * FROM profil_guru WHERE TRIM(nip) = TRIM(?) OR LOWER(TRIM(nama_guru)) = LOWER(TRIM(?))");
                    $gStmt->execute([$identifier, $identifier]);
                    $gData = $gStmt->fetch();
                    if ($gData) {
                        if (empty($nip)) $nip = $gData['nip'];
                        if (empty($namaGuru)) $namaGuru = $gData['nama_guru'];
                        if (empty($jabatan)) $jabatan = $gData['jabatan'] ?? 'Guru';
                    } else {
                        $uStmt = $pdo->prepare("SELECT * FROM users WHERE TRIM(username) = TRIM(?)");
                        $uStmt->execute([$identifier]);
                        $uData = $uStmt->fetch();
                        if ($uData) {
                            if (empty($namaGuru)) $namaGuru = $uData['nama_lengkap'] ?? $uData['nama'] ?? $uData['username'];
                            if (empty($nip)) $nip = $uData['username'];
                            if (empty($jabatan)) $jabatan = ucfirst($uData['role'] ?? 'Guru');
                        }
                    }
                }
            }

            if (empty($namaGuru)) $namaGuru = !empty($nip) ? $nip : 'Guru';
            if (empty($jabatan)) $jabatan = 'Guru';

            $ins = $pdo->prepare("INSERT INTO perizinan_guru (tanggal, nip, nama_guru, jabatan, jenis, keterangan, status) VALUES (?, ?, ?, ?, ?, ?, 'Menunggu')");
            $ins->execute([$tgl, $nip, $namaGuru, $jabatan, $jenis, $ket]);
            sendJson(['success' => true, 'message' => 'Pengajuan izin guru berhasil dikirim']);
            break;

        case 'getPerizinanList':
            $pdo->exec("CREATE TABLE IF NOT EXISTS `perizinan_guru` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `tanggal` DATE NOT NULL,
                `nip` VARCHAR(50) DEFAULT NULL,
                `nama_guru` VARCHAR(150) NOT NULL,
                `jabatan` VARCHAR(100) DEFAULT NULL,
                `jenis` VARCHAR(50) DEFAULT 'Izin',
                `keterangan` TEXT DEFAULT NULL,
                `status` VARCHAR(50) DEFAULT 'Menunggu',
                `catatan_admin` VARCHAR(255) DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            $status = $input['status'] ?? $_GET['status'] ?? '';
            $bulan = $input['bulan'] ?? $_GET['bulan'] ?? '';

            $sql = "SELECT p.*, 
                           COALESCE(NULLIF(p.nama_guru, ''), pg.nama_guru, u.username, NULLIF(p.nip, ''), 'Guru') AS nama_guru_fix, 
                           COALESCE(NULLIF(p.jabatan, ''), pg.jabatan, 'Guru') AS jabatan_fix 
                    FROM perizinan_guru p 
                    LEFT JOIN profil_guru pg ON TRIM(p.nip) = TRIM(pg.nip) 
                    LEFT JOIN users u ON TRIM(p.nip) = TRIM(u.username) 
                    WHERE 1=1";
            $params = [];

            if ($sess && ($sess['role'] === 'guru' || $sess['role'] === 'walikelas')) {
                $sql .= " AND (TRIM(p.nip) = TRIM(?) OR TRIM(p.nama_guru) = TRIM(?))";
                $params[] = $sess['identifier'];
                $params[] = $sess['identifier'];
            }

            if ($status && trim($status) !== '') {
                $sql .= " AND p.status = ?";
                $params[] = trim($status);
            }
            if ($bulan && trim($bulan) !== '') {
                $sql .= " AND DATE_FORMAT(p.tanggal, '%Y-%m') = ?";
                $params[] = trim($bulan);
            }
            $sql .= " ORDER BY p.tanggal DESC, p.id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return [
                    'rowId' => $r['id'],
                    'id' => $r['id'],
                    'tanggal' => $r['tanggal'],
                    'tanggalIzin' => $r['tanggal'],
                    'nip' => $r['nip'],
                    'nama' => $r['nama_guru_fix'],
                    'namaGuru' => $r['nama_guru_fix'],
                    'jabatan' => $r['jabatan_fix'],
                    'jenis' => $r['jenis'] ?? 'Izin',
                    'keterangan' => $r['keterangan'] ?? '',
                    'alasan' => $r['keterangan'] ?? '',
                    'status' => $r['status'] ?? 'Menunggu',
                    'catatanAdmin' => $r['catatan_admin'] ?? ''
                ];
            }, $rows);
            $canSeeAll = (!$sess || $sess['role'] === 'admin' || $sess['role'] === 'kepsek');
            sendJson(['success' => true, 'data' => $data, 'allData' => $data, 'canSeeAll' => $canSeeAll]);
            break;

        case 'updateStatusPerizinan':
            $id = $input['id'] ?? $input['rowId'] ?? null;
            $status = $input['status'] ?? $input['statusIzin'] ?? 'Menunggu';
            $catatan = $input['catatan'] ?? $input['catatanAdmin'] ?? '';
            if ($id) {
                $upd = $pdo->prepare("UPDATE perizinan_guru SET status = ?, catatan_admin = ? WHERE id = ?");
                $upd->execute([$status, $catatan, $id]);

                // Auto-sync ke tabel absensi_guru
                try {
                    $pzG = $pdo->prepare("SELECT * FROM perizinan_guru WHERE id = ?");
                    $pzG->execute([$id]);
                    $gRow = $pzG->fetch();
                    if ($gRow) {
                        $nip = trim($gRow['nip'] ?? '');
                        $namaGuru = trim($gRow['nama_guru'] ?? '');
                        $tgl = $gRow['tanggal'];
                        $jenis = trim($gRow['jenis'] ?? 'Izin');
                        $absenStatus = (mb_strtolower($jenis) === 'sakit') ? 'Sakit' : 'Izin';

                        if (strpos($status, 'Setujui') !== false || $status === 'Disetujui') {
                            $chkG = $pdo->prepare("SELECT id FROM absensi_guru WHERE (TRIM(nip) = TRIM(?) OR TRIM(nama_guru) = TRIM(?)) AND tanggal = ? LIMIT 1");
                            $chkG->execute([$nip, $namaGuru, $tgl]);
                            $eRowG = $chkG->fetch();
                            if ($eRowG) {
                                $updAbsG = $pdo->prepare("UPDATE absensi_guru SET status = ? WHERE id = ?");
                                $updAbsG->execute([$absenStatus, $eRowG['id']]);
                            } else {
                                $insAbsG = $pdo->prepare("INSERT INTO absensi_guru (tanggal, nip, nama_guru, status) VALUES (?, ?, ?, ?)");
                                $insAbsG->execute([$tgl, $nip, $namaGuru, $absenStatus]);
                            }
                        } else if ($status === 'Ditolak' || $status === 'Menunggu') {
                            $delAbsG = $pdo->prepare("DELETE FROM absensi_guru WHERE (TRIM(nip) = TRIM(?) OR TRIM(nama_guru) = TRIM(?)) AND tanggal = ? AND status IN ('Sakit', 'Izin')");
                            $delAbsG->execute([$nip, $namaGuru, $tgl]);
                        }
                    }
                } catch(Exception $e) {}
            }
            sendJson(['success' => true, 'message' => 'Status perizinan guru berhasil diperbarui']);
            break;

        case 'deletePerizinan':
            $id = $input['id'] ?? $input['rowId'] ?? $_GET['id'] ?? null;
            if ($id) {
                try {
                    $pzG = $pdo->prepare("SELECT * FROM perizinan_guru WHERE id = ?");
                    $pzG->execute([$id]);
                    $gRow = $pzG->fetch();
                    if ($gRow) {
                        $delAbsG = $pdo->prepare("DELETE FROM absensi_guru WHERE (TRIM(nip) = TRIM(?) OR TRIM(nama_guru) = TRIM(?)) AND tanggal = ? AND status IN ('Sakit', 'Izin')");
                        $delAbsG->execute([trim($gRow['nip'] ?? ''), trim($gRow['nama_guru'] ?? ''), $gRow['tanggal']]);
                    }
                } catch(Exception $e) {}

                $del = $pdo->prepare("DELETE FROM perizinan_guru WHERE id = ?");
                $del->execute([$id]);
            }
            sendJson(['success' => true, 'message' => 'Data perizinan berhasil dihapus']);
            break;

}
