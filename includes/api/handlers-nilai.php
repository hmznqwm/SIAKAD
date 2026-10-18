<?php
switch ($action) {
        case 'getNilaiList':
            // Auto-migrate: tambah kolom keterangan jika belum ada
            try { $pdo->exec("ALTER TABLE nilai ADD COLUMN IF NOT EXISTS keterangan VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            $token = $input['token'] ?? null;  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);

            $kelas = $_GET['kelas'] ?? $input['kelas'] ?? null;
            $mapel = $_GET['mataPelajaran'] ?? $input['mataPelajaran'] ?? null;
            $semesterRaw = $_GET['semester'] ?? $input['semester'] ?? null;
            $nisnFilter = $_GET['nisn'] ?? $input['nisn'] ?? null;

            // Jika role siswa atau alumni, paksa nisn filter sesuai session
            if ($sess && in_array($sess['role'], ['siswa', 'alumni'])) {
                $nisnFilter = $sess['identifier'];
            }

            $sql = "SELECT n.*, 
                           COALESCE(NULLIF(n.nama_siswa, ''), s.nama, n.nisn) AS nama_siswa_fix, 
                           COALESCE(NULLIF(n.kelas, ''), s.kelas, '') AS kelas_fix 
                    FROM nilai n 
                    LEFT JOIN siswa s ON TRIM(n.nisn) = TRIM(s.nisn) 
                    WHERE 1=1";
            $params = [];

            if ($nisnFilter && trim($nisnFilter) !== '') {
                // Toleran: cocok persis ATAU sama secara angka (nol depan hilang / notasi Excel
                // yang sempat tersimpan salah oleh input manual/import lama).
                $sql .= " AND (TRIM(n.nisn) = TRIM(?)";
                $params[] = trim($nisnFilter);
                if (preg_match('/^\d+(\.\d+)?(E\+\d+)?$/i', trim($nisnFilter))) {
                    $num = (int)round((float)trim($nisnFilter));
                    if ($num > 0) {
                        $sql .= " OR (TRIM(n.nisn) <> '' AND TRIM(n.nisn) + 0 = ?)";
                        $params[] = $num;
                    }
                }
                $sql .= ")";
            }

            if ($kelas && trim($kelas) !== '') {
                // Mendukung multi-kelas: guru dengan >1 kelas kirim "7A,8B"
                $kelasListNilai = normalizeKelasList($kelas);
                $orParts = [];
                foreach ($kelasListNilai as $ck) {
                    $orParts[] = "(TRIM(n.kelas) = ? OR TRIM(s.kelas) = ? OR REPLACE(LOWER(n.kelas), 'kelas ', '') = REPLACE(LOWER(?), 'kelas ', ''))";
                    $params[] = $ck; $params[] = $ck; $params[] = $ck;
                }
                if (!empty($orParts)) $sql .= " AND (" . implode(' OR ', $orParts) . ")";
            }

            if ($mapel && trim($mapel) !== '') {
                $sql .= " AND (TRIM(n.mata_pelajaran) = ? OR LOWER(n.mata_pelajaran) LIKE LOWER(?))";
                $params[] = trim($mapel);
                $params[] = '%' . trim($mapel) . '%';
            }

            if ($semesterRaw && trim($semesterRaw) !== '') {
                $s = trim($semesterRaw);
                if ($s === '1' || strtolower($s) === 'ganjil') {
                    $sql .= " AND (n.semester = '1' OR n.semester = 'Ganjil' OR n.semester = 'ganjil' OR n.semester LIKE '%1%' OR LOWER(n.semester) LIKE '%ganjil%')";
                } else if ($s === '2' || strtolower($s) === 'genap') {
                    $sql .= " AND (n.semester = '2' OR n.semester = 'Genap' OR n.semester = 'genap' OR n.semester LIKE '%2%' OR LOWER(n.semester) LIKE '%genap%')";
                } else {
                    $sql .= " AND (n.semester = ? OR n.semester LIKE ?)";
                    $params[] = $s;
                    $params[] = '%' . $s . '%';
                }
            }

            // PEMBATASAN AKSES: guru pengajar hanya melihat nilai kelas+mapel yang dia ampu,
            // walikelas hanya melihat nilai kelas yang diwalikan (semua mapel).
            if ($sess && in_array($sess['role'], ['guru', 'walikelas'], true)) {
                $aksesNilai = guruAksesKelasMapel($pdo, $sess);
                if (empty($aksesNilai)) sendJson(['success' => true, 'data' => []]);
                $orPartsAkses = [];
                foreach (array_keys($aksesNilai) as $ck) {
                    $orPartsAkses[] = "(TRIM(n.kelas) = ? OR TRIM(s.kelas) = ? OR REPLACE(LOWER(n.kelas), 'kelas ', '') = REPLACE(LOWER(?), 'kelas ', ''))";
                    $params[] = $ck; $params[] = $ck; $params[] = $ck;
                }
                if (!empty($orPartsAkses)) $sql .= " AND (" . implode(' OR ', $orPartsAkses) . ")";
                $mapelAkses = [];
                foreach ($aksesNilai as $ms) {
                    foreach ((array)$ms as $mm) { if ($mm !== '*' && trim($mm) !== '') $mapelAkses[] = trim($mm); }
                }
                if (!empty($mapelAkses)) {
                    $sql .= " AND (TRIM(n.mata_pelajaran) IN (" . implode(',', array_fill(0, count($mapelAkses), '?')) . ")";
                    $params = array_merge($params, $mapelAkses);
                    foreach ($mapelAkses as $mm) {
                        $sql .= " OR LOWER(n.mata_pelajaran) LIKE LOWER(?)";
                        $params[] = '%' . $mm . '%';
                    }
                    $sql .= ")";
                }
            }

            $sql .= " ORDER BY nama_siswa_fix ASC, n.id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $makeEntry = function($r, $keterangan, $overrideVal = null) {
                $nTugas = floatval($r['nilai_tugas'] ?? 0);
                $nUts   = floatval($r['nilai_uts'] ?? 0);
                $nUas   = floatval($r['nilai_uas'] ?? 0);
                $nAkhir = floatval($r['nilai_akhir'] ?? 0);

                if ($overrideVal !== null) {
                    $nilaiDisplay = $overrideVal;
                } else if ($keterangan === 'Tugas' || $keterangan === 'Ulangan' || $keterangan === 'Ujian Harian') {
                    $nilaiDisplay = $nTugas ?: ($nAkhir ?: ($nUts ?: $nUas));
                } else if ($keterangan === 'UTS') {
                    $nilaiDisplay = $nUts ?: ($nAkhir ?: ($nTugas ?: $nUas));
                } else if ($keterangan === 'UAS') {
                    $nilaiDisplay = $nUas ?: ($nAkhir ?: ($nUts ?: $nTugas));
                } else {
                    $nilaiDisplay = $nAkhir;
                    if ($nilaiDisplay == 0) {
                        $nilaiDisplay = $nTugas ?: ($nUts ?: ($nUas ?: 0));
                        if ($nTugas > 0 && $nUts > 0 && $nUas > 0) {
                            $nilaiDisplay = round(($nTugas * 0.3) + ($nUts * 0.3) + ($nUas * 0.4), 2);
                        }
                    }
                }

                $sem = $r['semester'] ?? '1';
                if (strtolower($sem) === 'ganjil' || $sem === 'Semester 1') $sem = '1';
                if (strtolower($sem) === 'genap'  || $sem === 'Semester 2') $sem = '2';

                return [
                    'id' => $r['id'],
                    'nisn' => $r['nisn'],
                    'nama' => $r['nama_siswa_fix'],
                    'namaSiswa' => $r['nama_siswa_fix'],
                    'kelas' => $r['kelas_fix'],
                    'mapel' => $r['mata_pelajaran'],
                    'mataPelajaran' => $r['mata_pelajaran'],
                    'semester' => $sem,
                    'nilaiTugas' => $nTugas,
                    'nilaiUts' => $nUts,
                    'nilaiUas' => $nUas,
                    'nilaiAkhir' => $nAkhir,
                    'nilai' => $nilaiDisplay,
                    'keterangan' => $keterangan ?: 'Tugas'
                ];
            };

            // Data lama dengan keterangan "Tuntas"/"Belum Tuntas" dipecah menjadi
            // tiga entri terpisah: Tugas, UTS, dan UAS
            $data = [];
            foreach ($rows as $r) {
                $ket0 = trim($r['keterangan'] ?? '');
                if ($ket0 === 'Tuntas' || $ket0 === 'Belum Tuntas') {
                    if (floatval($r['nilai_tugas']) > 0) $data[] = $makeEntry($r, 'Tugas', floatval($r['nilai_tugas']));
                    if (floatval($r['nilai_uts']) > 0)   $data[] = $makeEntry($r, 'UTS', floatval($r['nilai_uts']));
                    if (floatval($r['nilai_uas']) > 0)   $data[] = $makeEntry($r, 'UAS', floatval($r['nilai_uas']));
                } else {
                    $data[] = $makeEntry($r, $ket0);
                }
            }

            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'addNilai':
        case 'updateNilai':
            // PERBAIKAN KEAMANAN: hanya guru/admin/walikelas yang boleh input nilai
            $sessNilai = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas']);
            // Auto-migrate: tambah kolom keterangan jika belum ada
            try { $pdo->exec("ALTER TABLE nilai ADD COLUMN IF NOT EXISTS keterangan VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            $n = $input['nilaiData'] ?? $input;
            $nisn = trim($n['nisn'] ?? '');
            $mapel = trim($n['mapel'] ?? $n['mataPelajaran'] ?? '');
            $keterangan = trim($n['keterangan'] ?? 'Tugas');

            // WAJIB: NISN harus milik siswa yang benar-benar terdaftar, supaya nilai
            // selalu muncul di akun siswa yang bersangkutan (bukan teks bebas).
            $siswaRow = resolveSiswaByNisn($pdo, $nisn);
            if (!$siswaRow) {
                sendJson(['success' => false, 'message' => 'NISN "' . $nisn . '" tidak ditemukan di data siswa. Periksa kembali NISN-nya.']);
            }
            $nisn = trim($siswaRow['nisn']); // simpan NISN kanonik dari data siswa

            // Support both single-nilai+keterangan mode and multi-nilai mode
            if (isset($n['nilai']) && $n['nilai'] !== '') {
                $nilaiVal = floatval($n['nilai']);
                $tugas = ($keterangan === 'Tugas' || $keterangan === 'Ulangan' || $keterangan === 'Ujian Harian') ? $nilaiVal : floatval($n['nilaiTugas'] ?? 0);
                $uts   = ($keterangan === 'UTS') ? $nilaiVal : floatval($n['nilaiUts'] ?? 0);
                $uas   = ($keterangan === 'UAS') ? $nilaiVal : floatval($n['nilaiUas'] ?? 0);
                $akhir = $nilaiVal;
            } else {
                $tugas = floatval($n['nilaiTugas'] ?? 0);
                $uts   = floatval($n['nilaiUts'] ?? 0);
                $uas   = floatval($n['nilaiUas'] ?? 0);
                $akhir = floatval($n['nilaiAkhir'] ?? 0);
                if ($akhir == 0 && ($tugas > 0 || $uts > 0 || $uas > 0)) {
                    $akhir = round(($tugas * 0.3) + ($uts * 0.3) + ($uas * 0.4), 2);
                }
            }

            $namaSiswa = trim($n['namaSiswa'] ?? $n['nama'] ?? '');
            $kelas = trim($n['kelas'] ?? '');
            $semester = trim($n['semester'] ?? '1');

            // Look up student name & class from `siswa` table if missing
            if (empty($namaSiswa) || empty($kelas)) {
                if (empty($namaSiswa)) $namaSiswa = $siswaRow['nama'];
                if (empty($kelas)) $kelas = $siswaRow['kelas'];
            }

            // Guru pengajar hanya boleh mengisi nilai kelas & mapel yang diajarnya
            if (!guruCanInputNilai($pdo, $sessNilai, $kelas, $mapel)) {
                sendJson(['success' => false, 'message' => 'Akses ditolak: Anda hanya boleh menginput nilai untuk kelas dan mata pelajaran yang Anda amanai.']);
            }

            $rowId = $input['id'] ?? $n['id'] ?? null;
            if ($rowId && is_numeric($rowId)) {
                $upd = $pdo->prepare("UPDATE nilai SET nisn=?, nama_siswa=?, kelas=?, mata_pelajaran=?, semester=?, nilai_tugas=?, nilai_uts=?, nilai_uas=?, nilai_akhir=?, keterangan=? WHERE id=?");
                $upd->execute([$nisn, $namaSiswa, $kelas, $mapel, $semester, $tugas, $uts, $uas, $akhir, $keterangan, $rowId]);
            } else {
                $chkStmt = $pdo->prepare("SELECT id FROM nilai WHERE TRIM(nisn) = TRIM(?) AND TRIM(mata_pelajaran) = TRIM(?) AND (semester = ? OR semester = ?) AND (keterangan = ? OR (keterangan IS NULL AND ? = ''))");
                $chkStmt->execute([$nisn, $mapel, $semester, ($semester === '1' ? 'Ganjil' : ($semester === '2' ? 'Genap' : $semester)), $keterangan, $keterangan]);
                $existing = $chkStmt->fetch();

                if ($existing) {
                    $upd = $pdo->prepare("UPDATE nilai SET nama_siswa=?, kelas=?, nilai_tugas=?, nilai_uts=?, nilai_uas=?, nilai_akhir=?, keterangan=? WHERE id=?");
                    $upd->execute([$namaSiswa, $kelas, $tugas, $uts, $uas, $akhir, $keterangan, $existing['id']]);
                } else {
                    $ins = $pdo->prepare("INSERT INTO nilai (nisn, nama_siswa, kelas, mata_pelajaran, semester, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $ins->execute([$nisn, $namaSiswa, $kelas, $mapel, $semester, $tugas, $uts, $uas, $akhir, $keterangan]);
                }
            }
            sendJson(['success' => true, 'message' => 'Nilai berhasil disimpan']);
            break;

        case 'deleteNilai':
            // PERBAIKAN KEAMANAN: hanya guru/admin
            $sessDel = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas']);
            $id = $input['id'] ?? $_GET['id'] ?? '';
            if ($id) {
                // Guru hanya boleh menghapus nilai pada kelas & mapel yang diajarnya
                if (($sessDel['role'] ?? '') === 'guru') {
                    $chk = $pdo->prepare("SELECT kelas, mata_pelajaran FROM nilai WHERE id = ?");
                    $chk->execute([$id]);
                    $row = $chk->fetch();
                    if (!$row || !guruCanInputNilai($pdo, $sessDel, $row['kelas'], $row['mata_pelajaran'])) {
                        sendJson(['success' => false, 'message' => 'Akses ditolak: nilai ini bukan pada kelas/mapel yang Anda amanai.']);
                    }
                }
                $del = $pdo->prepare("DELETE FROM nilai WHERE id = ?");
                $del->execute([$id]);
            }
            sendJson(['success' => true, 'message' => 'Data nilai berhasil dihapus']);
            break;

        case 'deleteMultipleNilai':
            // PERBAIKAN KEAMANAN: hanya guru/admin
            $sessDelM = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas']);
            $ids = $input['ids'] ?? $input['idArray'] ?? $input['rows'] ?? [];
            if (!empty($ids) && is_array($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                if (($sessDelM['role'] ?? '') === 'guru') {
                    // Saring: hanya id milik kelas+mapel yang diajar guru yang dihapus
                    $chkAll = $pdo->prepare("SELECT id, kelas, mata_pelajaran FROM nilai WHERE id IN ($inQuery)");
                    $chkAll->execute($ids);
                    $allowed = [];
                    foreach ($chkAll->fetchAll() as $row) {
                        if (guruCanInputNilai($pdo, $sessDelM, $row['kelas'], $row['mata_pelajaran'])) $allowed[] = $row['id'];
                    }
                    if (empty($allowed)) sendJson(['success' => false, 'message' => 'Akses ditolak: tidak ada data nilai pada kelas/mapel yang Anda amanai.']);
                    $ids = $allowed;
                    $inQuery = implode(',', array_fill(0, count($ids), '?'));
                }
                $del = $pdo->prepare("DELETE FROM nilai WHERE id IN ($inQuery)");
                $del->execute($ids);
            }
            sendJson(['success' => true, 'message' => 'Beberapa data nilai berhasil dihapus']);
            break;

        case 'importNilaiBulk':
            // PERBAIKAN KEAMANAN: hanya guru/admin
            $sessImp = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas']);
            try { $pdo->exec("ALTER TABLE nilai ADD COLUMN IF NOT EXISTS keterangan VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            $dataArr = $input['data'] ?? $input['formattedData'] ?? [];
            $added = 0; $skipped = 0;
            foreach ($dataArr as $n) {
                $nisn = trim($n['nisn'] ?? $n['NISN'] ?? '');
                $mapel = trim($n['mapel'] ?? $n['mataPelajaran'] ?? $n['Mata Pelajaran'] ?? '');
                if (empty($nisn) || empty($mapel)) { $skipped++; continue; }
                // Normalisasi NISN ke data siswa (toleransi nol depan / notasi Excel),
                // baris yang NISN-nya tidak dikenal dilewati agar tidak jadi data yatim.
                $siswaRow = resolveSiswaByNisn($pdo, $nisn);
                if (!$siswaRow) { $skipped++; continue; }
                $nisn = trim($siswaRow['nisn']);
                // Guru hanya boleh mengimpor nilai kelas & mapel yang diajarnya
                $rowKelas = trim($n['kelas'] ?? $n['Kelas'] ?? '') ?: trim($siswaRow['kelas']);
                if (!guruCanInputNilai($pdo, $sessImp, $rowKelas, $mapel)) { $skipped++; continue; }
                $nilaiVal = floatval($n['nilai'] ?? $n['Nilai'] ?? 0);
                $ket = $n['keterangan'] ?? $n['Keterangan'] ?? '';
                // Tolak duplikat: NISN + mapel + semester (1/Ganjil, 2/Genap setara) + keterangan sama
                $chk = $pdo->prepare("SELECT COUNT(*) FROM nilai WHERE TRIM(nisn) = TRIM(?) AND TRIM(mata_pelajaran) = TRIM(?)
                    AND ((semester = ? OR semester = ?)
                        OR (semester IN ('Ganjil','1') AND ? IN ('Ganjil','1'))
                        OR (semester IN ('Genap','2') AND ? IN ('Genap','2')))
                    AND TRIM(COALESCE(keterangan,'')) = TRIM(?)");
                $chk->execute([$nisn, $mapel, $n['semester'] ?? 'Ganjil', $n['semester'] ?? '', $n['semester'] ?? '', $n['semester'] ?? '', $ket]);
                if ($chk->fetchColumn() > 0) { $skipped++; continue; }
                $ins = $pdo->prepare("INSERT INTO nilai (nisn, nama_siswa, kelas, mata_pelajaran, semester, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                try {
                    $ins->execute([
                        $nisn,
                        $n['namaSiswa'] ?? $n['Nama Siswa'] ?? $siswaRow['nama'],
                        $n['kelas'] ?? $n['Kelas'] ?? $siswaRow['kelas'],
                        $mapel,
                        $n['semester'] ?? $n['Semester'] ?? 'Ganjil',
                        $ket === 'Tugas' || $ket === 'Ulangan' || $ket === 'Ujian Harian' ? $nilaiVal : 0,
                        $ket === 'UTS' ? $nilaiVal : 0,
                        $ket === 'UAS' ? $nilaiVal : 0,
                        $nilaiVal,
                        $ket
                    ]);
                    $added++;
                } catch (Exception $e) { $skipped++; }
            }
            sendJson(['success' => true, 'message' => "Import selesai: $added ditambahkan, $skipped dilewati", 'added' => $added, 'skipped' => $skipped]);
            break;

        case 'getNilaiKolom':
        case 'addNilaiKolom':
        case 'deleteNilaiKolom':
            $sessKolom = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas']);
            // Tabel definisi kolom kustom per petak (mapel+kelas+semester)
            try {
                $pdo->exec("CREATE TABLE IF NOT EXISTS nilai_kolom (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    mata_pelajaran VARCHAR(150) NOT NULL,
                    kelas VARCHAR(50) NOT NULL DEFAULT '',
                    semester VARCHAR(20) NOT NULL DEFAULT '',
                    nama_kolom VARCHAR(100) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_nilai_kolom (mata_pelajaran(150), kelas(50), semester(20), nama_kolom(100))
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } catch(Exception $e) {}

            if ($action === 'addNilaiKolom') {
                $mapelK = trim($input['mapel'] ?? '');
                $kelasK = trim($input['kelas'] ?? '');
                $semK   = trim($input['semester'] ?? '');
                $namaK  = trim($input['namaKolom'] ?? '');
                if ($mapelK === '' || $namaK === '') {
                    sendJson(['success' => false, 'message' => 'Mata pelajaran dan nama kolom wajib diisi']);
                }
                // Guru hanya boleh menambah kolom pada kelas & mapel yang diajarnya
                if (!guruCanInputNilai($pdo, $sessKolom, $kelasK, $mapelK)) {
                    sendJson(['success' => false, 'message' => 'Akses ditolak: Anda hanya boleh mengelola kolom nilai untuk kelas dan mata pelajaran yang Anda amanai.']);
                }
                $ins = $pdo->prepare("INSERT IGNORE INTO nilai_kolom (mata_pelajaran, kelas, semester, nama_kolom) VALUES (?, ?, ?, ?)");
                $ins->execute([$mapelK, $kelasK, $semK, $namaK]);
                sendJson(['success' => true, 'message' => "Kolom \"{$namaK}\" ditambahkan"]);
            }

            if ($action === 'deleteNilaiKolom') {
                $mapelK = trim($input['mapel'] ?? '');
                $kelasK = trim($input['kelas'] ?? '');
                $semK   = trim($input['semester'] ?? '');
                $namaK  = trim($input['namaKolom'] ?? '');
                if ($mapelK === '' || $namaK === '') {
                    sendJson(['success' => false, 'message' => 'Parameter tidak lengkap']);
                }
                if (!guruCanInputNilai($pdo, $sessKolom, $kelasK, $mapelK)) {
                    sendJson(['success' => false, 'message' => 'Akses ditolak: Anda hanya boleh mengelola kolom nilai untuk kelas dan mata pelajaran yang Anda amanai.']);
                }
                $del = $pdo->prepare("DELETE FROM nilai_kolom WHERE TRIM(mata_pelajaran)=? AND TRIM(kelas)=? AND TRIM(semester)=? AND TRIM(nama_kolom)=?");
                $del->execute([$mapelK, $kelasK, $semK, $namaK]);
                // Hapus juga entri nilai yang memakai keterangan kolom tsb di petak ini
                $semAlt = $semK === '1' ? 'Ganjil' : ($semK === '2' ? 'Genap' : $semK);
                $del2 = $pdo->prepare("DELETE FROM nilai WHERE TRIM(mata_pelajaran)=? AND TRIM(kelas)=? AND TRIM(keterangan)=? AND (TRIM(semester)=? OR TRIM(semester)=?)");
                $del2->execute([$mapelK, $kelasK, $namaK, $semK, $semAlt]);
                sendJson(['success' => true, 'message' => "Kolom \"{$namaK}\" dihapus"]);
            }

            // getNilaiKolom
            $rowsKolom = $pdo->query("SELECT mata_pelajaran, kelas, semester, nama_kolom FROM nilai_kolom ORDER BY id ASC")->fetchAll();
            sendJson(['success' => true, 'data' => array_map(function($r) {
                return [
                    'mapel' => trim($r['mata_pelajaran']),
                    'kelas' => trim($r['kelas']),
                    'semester' => trim($r['semester']),
                    'namaKolom' => trim($r['nama_kolom'])
                ];
            }, $rowsKolom)]);
            break;


        // ==========================================
        // SIKAS - MANAJEMEN PEMBAYARAN SPP (ADMIN)
        // ==========================================

}
