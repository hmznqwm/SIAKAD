<?php
switch ($action) {
        case 'processIndividualPromotion':
            $asal = $input['asal'] ?? $input['args'][0] ?? '';
            $tujuan = $input['tujuan'] ?? $input['args'][1] ?? '';
            $promoData = $input['promoData'] ?? $input['args'][2] ?? [];
            $thnNow = date('Y');
            $skippedTunggakan = [];

            if (!empty($promoData) && is_array($promoData)) {
                foreach ($promoData as $item) {
                    $nisn = $item['nisn'] ?? '';
                    $status = $item['status'] ?? 'NAIK';

                    if ($status === 'NAIK') {
                        if ($tujuan === 'LULUS' || $tujuan === 'ALUMNI') {
                            // Cek apakah siswa masih punya tunggakan
                            $cekSiswa = $pdo->prepare("SELECT id, nama FROM siswa WHERE nisn = ?");
                            $cekSiswa->execute([$nisn]);
                            $dataSiswa = $cekSiswa->fetch();

                            if ($dataSiswa) {
                                $cekTunggakan = $pdo->prepare(
                                    "SELECT COUNT(*) as jml FROM tagihan 
                                     WHERE siswa_id = ? AND LOWER(status) = 'belum lunas'"
                                );
                                $cekTunggakan->execute([$dataSiswa['id']]);
                                $jmlTunggakan = (int)$cekTunggakan->fetch()['jml'];

                                if ($jmlTunggakan > 0) {
                                    // Siswa masih menunggak, skip & catat
                                    $skippedTunggakan[] = [
                                        'nisn'  => $nisn,
                                        'nama'  => $dataSiswa['nama'],
                                        'jumlah_tunggakan' => $jmlTunggakan,
                                    ];
                                    continue;
                                }
                            }

                            $upd = $pdo->prepare("UPDATE siswa SET status_siswa = 'alumni', tahun_lulus = ? WHERE nisn = ?");
                            $upd->execute([$thnNow, $nisn]);
                        } else {
                            $upd = $pdo->prepare("UPDATE siswa SET kelas = ? WHERE nisn = ?");
                            $upd->execute([$tujuan, $nisn]);
                        }
                    }
                }
            }

            if (!empty($skippedTunggakan)) {
                $namaList = implode(', ', array_map(fn($s) => $s['nama'] . ' (' . $s['jumlah_tunggakan'] . ' tagihan)', $skippedTunggakan));
                sendJson([
                    'success' => false,
                    'message' => 'Gagal: siswa berikut masih memiliki tunggakan dan tidak dapat dijadikan alumni: ' . $namaList,
                    'skipped' => $skippedTunggakan,
                ]);
            }

            sendJson(['success' => true, 'message' => 'Proses kenaikan kelas individu berhasil!']);
            break;

        case 'processGradePromotion':
            $mapping = $input['mapping'] ?? $input['args'][0] ?? [];
            $thnNow = date('Y');
            $movedCount = 0;
            $skippedTunggakan = [];

            if (!empty($mapping) && is_array($mapping)) {
                foreach ($mapping as $item) {
                    $asal = $item['asal'] ?? '';
                    $tujuan = $item['tujuan'] ?? '';
                    if ($asal && $tujuan) {
                        if ($tujuan === 'LULUS' || $tujuan === 'ALUMNI') {
                            // Ambil semua siswa aktif di kelas ini
                            $getSiswa = $pdo->prepare(
                                "SELECT id, nama, nisn FROM siswa WHERE kelas = ? AND status_siswa = 'aktif'"
                            );
                            $getSiswa->execute([$asal]);
                            $listSiswa = $getSiswa->fetchAll();

                            foreach ($listSiswa as $siswa) {
                                // Cek tunggakan per siswa
                                $cekTunggakan = $pdo->prepare(
                                    "SELECT COUNT(*) as jml FROM tagihan 
                                     WHERE siswa_id = ? AND LOWER(status) = 'belum lunas'"
                                );
                                $cekTunggakan->execute([$siswa['id']]);
                                $jmlTunggakan = (int)$cekTunggakan->fetch()['jml'];

                                if ($jmlTunggakan > 0) {
                                    // Siswa masih menunggak, skip
                                    $skippedTunggakan[] = [
                                        'nisn'  => $siswa['nisn'],
                                        'nama'  => $siswa['nama'],
                                        'kelas' => $asal,
                                        'jumlah_tunggakan' => $jmlTunggakan,
                                    ];
                                    continue;
                                }

                                // Lunas — jadikan alumni
                                $updSatu = $pdo->prepare(
                                    "UPDATE siswa SET status_siswa = 'alumni', tahun_lulus = ? WHERE id = ?"
                                );
                                $updSatu->execute([$thnNow, $siswa['id']]);
                                $movedCount++;
                            }
                        } else {
                            // Kenaikan kelas biasa (bukan alumni) — tidak perlu cek tunggakan
                            $upd = $pdo->prepare("UPDATE siswa SET kelas = ? WHERE kelas = ? AND status_siswa = 'aktif'");
                            $upd->execute([$tujuan, $asal]);
                            $movedCount += $upd->rowCount();
                        }
                    }
                }
            }

            $msg = "Proses kenaikan kelas massal berhasil! $movedCount siswa diproses.";
            if (!empty($skippedTunggakan)) {
                $namaList = implode(', ', array_map(fn($s) => $s['nama'] . ' (' . $s['jumlah_tunggakan'] . ' tagihan)', $skippedTunggakan));
                $msg .= ' | DILEWATI karena masih menunggak: ' . $namaList;
            }

            sendJson([
                'success' => true,
                'message' => $msg,
                'movedCount' => $movedCount,
                'skipped' => $skippedTunggakan,
            ]);
            break;


        case 'getAlumniList':
            // PERBAIKAN KEAMANAN: hanya user terautentikasi
            requireAuth($pdo, $input);
            $stmt = $pdo->query("SELECT * FROM siswa WHERE status_siswa = 'alumni' ORDER BY tahun_lulus DESC, nama ASC");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return [
                    'nama' => $r['nama'],
                    'nisn' => $r['nisn'],
                    'jenisKelamin' => $r['jenis_kelamin'],
                    'tanggalLahir' => $r['tanggal_lahir'],
                    'tempatLahir' => $r['tempat_lahir'] ?? '',
                    'agama' => $r['agama'] ?? '',
                    'namaAyah' => $r['nama_ayah'] ?? '',
                    'namaIbu' => $r['nama_ibu'] ?? '',
                    'email' => $r['email'] ?? '',
                    'kontak' => $r['no_hp'] ?? '',
                    'noHp' => $r['no_hp'] ?? '',
                    'alamat' => $r['alamat'] ?? '',
                    'kelasTerakhir' => $r['kelas'],
                    'kelas' => $r['kelas'],
                    'tahunLulus' => $r['tahun_lulus'],
                    'siswaId' => (string)$r['id']
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'getAlumniDetail':
            // PERBAIKAN KEAMANAN: hanya user terautentikasi
            requireAuth($pdo, $input);
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin', 'kepsek', 'wakel'], true)) {
                sendJson(['success' => false, 'message' => 'Akses ditolak']);
            }
            $nisn = trim($input['nisn'] ?? '');

            $stmt = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ? AND status_siswa = 'alumni'");
            $stmt->execute([$nisn]);
            $r = $stmt->fetch();
            if (!$r) {
                sendJson(['success' => false, 'message' => 'Data alumni tidak ditemukan']);
            }
            $siswaId = (string)$r['id'];
            // Tagihan
            $bills = [];
            $stmtB = $pdo->prepare("SELECT * FROM tagihan WHERE siswa_id = ? ORDER BY jatuh_tempo ASC");
            $stmtB->execute([$siswaId]);
            foreach ($stmtB->fetchAll() as $b) {
                $bills[] = [
                    'id' => (string)$b['id'],
                    'jenis' => $b['jenis_tagihan'],
                    'nominal' => (float)$b['nominal'],
                    'jatuhTempo' => $b['jatuh_tempo'],
                    'status' => $b['status'],
                    'bulan' => $b['bulan'] ?? '',
                ];
            }
            // Transaksi pembayaran
            $pay = [];
            $stmtP = $pdo->prepare("SELECT * FROM transaksi WHERE siswa_id = ? ORDER BY tanggal DESC");
            $stmtP->execute([$siswaId]);
            foreach ($stmtP->fetchAll() as $t) {
                $pay[] = [
                    'id' => (string)$t['id'],
                    'nominal' => (float)$t['nominal'],
                    'metode' => $t['metode_bayar'],
                    'tanggal' => $t['tanggal'],
                    'resi' => $t['nomor_resi'] ?? '',
                    'tagihanId' => $t['tagihan_id'] ?? '',
                ];
            }
            $totalBayar = array_sum(array_map(function($p) { return $p['nominal']; }, $pay));
            sendJson([
                'success' => true,
                'data' => [
                    'nama' => $r['nama'],
                    'nisn' => $r['nisn'],
                    'jenisKelamin' => $r['jenis_kelamin'],
                    'tempatLahir' => $r['tempat_lahir'] ?? '',
                    'tanggalLahir' => $r['tanggal_lahir'],
                    'agama' => $r['agama'] ?? '',
                    'namaAyah' => $r['nama_ayah'] ?? '',
                    'namaIbu' => $r['nama_ibu'] ?? '',
                    'noHp' => $r['no_hp'] ?? '',
                    'email' => $r['email'] ?? '',
                    'alamat' => $r['alamat'] ?? '',
                    'kelasTerakhir' => $r['kelas'],
                    'tahunLulus' => $r['tahun_lulus'],
                    'tagihan' => $bills,
                    'pembayaran' => $pay,
                    'totalBayar' => $totalBayar,
                    'saldoTabungan' => 0
                ]
            ]);
            break;

        case 'getDaftarTahunLulus':
            $stmt = $pdo->query("SELECT DISTINCT tahun_lulus FROM siswa WHERE status_siswa = 'alumni' AND tahun_lulus IS NOT NULL AND tahun_lulus != '' ORDER BY tahun_lulus DESC");
            $thn = $stmt->fetchAll(PDO::FETCH_COLUMN);
            sendJson(['success' => true, 'data' => $thn]);
            break;

        // ==========================================
        // 3. GURU & STAF
        // ==========================================
        case 'deleteAlumni':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $nisn = $input['nisn'] ?? $_GET['nisn'] ?? '';
            // Ambil id siswa sebelum update status, untuk hapus tagihan & transaksi
            $qId = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ? AND status_siswa = 'alumni'");
            $qId->execute([$nisn]);
            $alumniId = (string)($qId->fetchColumn() ?: '');
            $del = $pdo->prepare("UPDATE siswa SET status_siswa = 'deleted' WHERE nisn = ? AND status_siswa = 'alumni'");
            $del->execute([$nisn]);
            // SINKRON: hapus akun users & sesi alumni ini
            $pdo->prepare("DELETE FROM users WHERE username = ? AND role IN ('siswa', 'alumni')")->execute([$nisn]);
            $pdo->prepare("DELETE FROM sessions WHERE identifier = ?")->execute([$nisn]);
            // Riwayat tagihan & transaksi TETAP disimpan
            sendJson(['success' => true, 'message' => 'Data alumni berhasil dihapus']);
            break;

        case 'deleteMultipleAlumni':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            $nisnArray = $input['nisnArray'] ?? $input['ids'] ?? [];
            if (!empty($nisnArray)) {
                $inQuery = implode(',', array_fill(0, count($nisnArray), '?'));
                // Ambil id alumni sebelum update status
                $qIds = $pdo->prepare("SELECT CAST(id AS CHAR) FROM siswa WHERE nisn IN ($inQuery) AND status_siswa = 'alumni'");
                $qIds->execute($nisnArray);
                $alumniIds = $qIds->fetchAll(PDO::FETCH_COLUMN);
                $del = $pdo->prepare("UPDATE siswa SET status_siswa = 'deleted' WHERE nisn IN ($inQuery) AND status_siswa = 'alumni'");
                $del->execute($nisnArray);
                // SINKRON: hapus akun users & sesi semua alumni ini
                $pdo->prepare("DELETE FROM users WHERE username IN ($inQuery) AND role IN ('siswa', 'alumni')")->execute($nisnArray);
                $pdo->prepare("DELETE FROM sessions WHERE identifier IN ($inQuery)")->execute($nisnArray);
                // Riwayat tagihan & transaksi TETAP disimpan
            }
            sendJson(['success' => true, 'message' => 'Data alumni berhasil dihapus']);
            break;

}
