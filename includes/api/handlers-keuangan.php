<?php
switch ($action) {
        case 'getStudents':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $rows = $pdo->query("SELECT * FROM siswa WHERE status_siswa = 'aktif' ORDER BY nama ASC")->fetchAll();
            $mapped = array_map(function ($r) {
                return [
                    'ID' => (string)$r['id'],
                    'Nama' => $r['nama'],
                    'NISN' => $r['nisn'],
                    'Kelas' => $r['kelas'],
                    'Status' => ($r['status_siswa'] ?? 'aktif') === 'aktif' ? 'Aktif' : 'Tidak Aktif',
                    'Email' => $r['email'] ?? '',
                    'NoHP Ortu' => $r['no_hp'] ?? $r['nohp_ortu'] ?? '',
                ];
            }, $rows);
            sendJson($mapped);
            break;

        case 'getBills':
            $sessBills = requireAuth($pdo, $input, ['admin', 'bendahara', 'siswa', 'alumni']);
            // KEAMANAN: siswa/alumni HANYA boleh melihat tagihannya sendiri —
            // paksa nisn filter dari sesi, abaikan parameter nisn dari klien.
            if ($sessBills && in_array($sessBills['role'], ['siswa', 'alumni'])) {
                $input['nisn'] = $sessBills['identifier'];
            }
            $filterNisn = trim($input['nisn'] ?? '');
            if ($filterNisn !== '') {
                $stmt = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ? AND status_siswa IN ('aktif', 'alumni')");
                $stmt->execute([$filterNisn]);
                $sRow = $stmt->fetch();
                $siswaId = $sRow ? (string)$sRow['id'] : '__none__';
                $stmt = $pdo->prepare('SELECT t.* FROM tagihan t INNER JOIN siswa s ON CAST(t.siswa_id AS CHAR) = CAST(s.id AS CHAR) WHERE t.siswa_id = ? AND s.status_siswa IN (\'aktif\', \'alumni\') ORDER BY t.jatuh_tempo ASC');
                $stmt->execute([$siswaId]);
                $rows = $stmt->fetchAll();
            } else {
                // Hanya ambil tagihan milik siswa yang masih aktif (bukan yang sudah dihapus)
                $rows = $pdo->query("SELECT t.* FROM tagihan t INNER JOIN siswa s ON CAST(t.siswa_id AS CHAR) = CAST(s.id AS CHAR) WHERE s.status_siswa IN ('aktif', 'alumni') ORDER BY t.jatuh_tempo ASC")->fetchAll();
            }
            $mapped = array_map(function ($r) {
                return [
                    'ID' => (string)$r['id'],
                    'SiswaID' => (string)$r['siswa_id'],
                    'JenisTagihan' => $r['jenis_tagihan'],
                    'Nominal' => (float)$r['nominal'],
                    'JatuhTempo' => $r['jatuh_tempo'],
                    'Status' => $r['status'],
                    'Bulan' => $r['bulan'],
                ];
            }, $rows);
            sendJson($mapped);
            break;

        case 'getTransactions':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $rows = $pdo->query('SELECT * FROM transaksi ORDER BY tanggal DESC')->fetchAll();
            // Pre-load semua tagihan untuk lookup jenis_tagihan
            $allBills = $pdo->query('SELECT id, jenis_tagihan FROM tagihan')->fetchAll(PDO::FETCH_KEY_PAIR);
            // Pre-load semua siswa (aktif + alumni + deleted) agar nama tetap muncul di riwayat
            $allSiswaRows = $pdo->query('SELECT id, nama, nisn, kelas, status_siswa FROM siswa')->fetchAll();
            $allSiswaMap = [];
            foreach ($allSiswaRows as $sr) { $allSiswaMap[(string)$sr['id']] = $sr; }
            $mapped = array_map(function ($r) use ($allBills, $allSiswaMap) {
                // tagihan_id bisa berupa satu ID atau beberapa ID dipisah koma
                $tagihanIds = array_filter(array_map('trim', explode(',', $r['tagihan_id'] ?? '')));
                $jenisArr = [];
                foreach ($tagihanIds as $tid) {
                    if (!empty($allBills[$tid])) {
                        $jenisArr[] = $allBills[$tid];
                    }
                }
                $kategori = !empty($jenisArr) ? implode(', ', array_unique($jenisArr)) : '-';
                $sid = (string)$r['siswa_id'];
                $siswaInfo = $allSiswaMap[$sid] ?? null;
                $namaSiswa = $siswaInfo ? $siswaInfo['nama'] : ('Siswa #' . $sid);
                $statusSiswa = $siswaInfo ? $siswaInfo['status_siswa'] : '';
                return [
                    'ID' => (string)$r['id'],
                    'SiswaID' => $sid,
                    'NamaSiswa' => $namaSiswa,
                    'StatusSiswa' => $statusSiswa,
                    'TagihanID' => $r['tagihan_id'],
                    'Nominal' => (float)$r['nominal'],
                    'MetodeBayar' => $r['metode_bayar'],
                    'Tanggal' => $r['tanggal'],
                    'NomorResi' => $r['nomor_resi'],
                    'Kategori' => $kategori,
                ];
            }, $rows);
            sendJson($mapped);
            break;

        case 'addStudent':
            $studentData = $input['siswaData'] ?? $input['studentData'] ?? $input;
            $nisnVal = trim($studentData['nisn'] ?? $studentData['NISN'] ?? '');
            $check = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
            $check->execute([$nisnVal]);
            if ($check->fetch()) {
                sendJson(['success' => false, 'error' => 'NISN sudah terdaftar']);
            }
            $ins = $pdo->prepare("INSERT INTO siswa (nama, nisn, jenis_kelamin, tanggal_lahir, agama, nama_ayah, nama_ibu, no_hp, kelas, alamat, status_siswa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')");
            $ins->execute([
                $studentData['Nama'] ?? $studentData['nama'] ?? '',
                $nisnVal,
                $studentData['jenisKelamin'] ?? $studentData['Jenis Kelamin'] ?? '',
                $studentData['tanggalLahir'] ?? null,
                $studentData['agama'] ?? '',
                $studentData['namaAyah'] ?? $studentData['Nama Ayah'] ?? '',
                $studentData['namaIbu'] ?? $studentData['Nama Ibu'] ?? '',
                $studentData['NoHP Ortu'] ?? $studentData['noHp'] ?? $studentData['no_hp'] ?? '',
                $studentData['Kelas'] ?? $studentData['kelas'] ?? '',
                $studentData['alamat'] ?? '',
            ]);
            sendJson(['success' => true, 'id' => (string)$pdo->lastInsertId()]);
            break;

        case 'updateStudent':
            $studentId = $input['id'] ?? $input['ID'] ?? $input['siswaId'] ?? '';
            $studentData = $input['siswaData'] ?? $input['studentData'] ?? $input;
            $stmt = $pdo->prepare("UPDATE siswa SET nama = ?, nisn = ?, kelas = ?, email = ?, no_hp = ? WHERE id = ?");
            $stmt->execute([
                $studentData['Nama'] ?? $studentData['nama'] ?? '',
                $studentData['NISN'] ?? $studentData['nisn'] ?? '',
                $studentData['Kelas'] ?? $studentData['kelas'] ?? '',
                $studentData['Email'] ?? $studentData['email'] ?? '',
                $studentData['NoHP Ortu'] ?? $studentData['noHp'] ?? $studentData['no_hp'] ?? '',
                $studentId,
            ]);
            sendJson(['success' => true]);
            break;

        case 'deleteStudent':
            $studentId = (string)($input['id'] ?? $input['ID'] ?? $input['siswaId'] ?? '');
            $stmt = $pdo->prepare('DELETE FROM siswa WHERE id = ?');
            $stmt->execute([$studentId]);
            // Riwayat tagihan & transaksi TETAP disimpan
            sendJson(['success' => true]);
            break;

        case 'deleteStudentsBulk':
            $ids = $input['ids'] ?? $input['nisnArray'] ?? $input['idArray'] ?? [];
            if (is_array($ids) && count($ids) > 0) {
                $ids = array_map('strval', $ids);
                $ph = implode(',', array_fill(0, count($ids), '?'));
                $stmt = $pdo->prepare("DELETE FROM siswa WHERE id IN ($ph)");
                $stmt->execute($ids);
                // Riwayat tagihan & transaksi TETAP disimpan
            }
            sendJson(['success' => true, 'deleted' => $stmt->rowCount() ?? 0]);
            break;

        case 'addBill':
            $billData = $input['billData'] ?? $input;
            // ANTI TAGIHAN GANDA: tolak jika entri identik sudah ada hari ini
            // (nama sama + nominal sama + jatuh tempo sama + dibuat tgl sama).
            if (tagihanAdaGanda(
                $pdo,
                $billData['SiswaID'] ?? $billData['siswaId'] ?? '',
                $billData['JenisTagihan'] ?? $billData['jenisTagihan'] ?? '',
                $billData['Nominal'] ?? $billData['nominal'] ?? 0,
                $billData['JatuhTempo'] ?? $billData['jatuhTempo'] ?? date('Y-m-d')
            )) {
                sendJson(['success' => false, 'error' => 'Tagihan ganda: entri dengan nama, nominal, dan jatuh tempo yang sama sudah dibuat hari ini.']);
            }
            $billId = 'B' . date('YmdHis') . bin2hex(random_bytes(4));
            $stmt = $pdo->prepare('INSERT INTO tagihan (id, siswa_id, jenis_tagihan, nominal, jatuh_tempo, status, bulan) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $billId,
                $billData['SiswaID'] ?? $billData['siswaId'] ?? '',
                $billData['JenisTagihan'] ?? $billData['jenisTagihan'] ?? '',
                $billData['Nominal'] ?? $billData['nominal'] ?? 0,
                $billData['JatuhTempo'] ?? $billData['jatuhTempo'] ?? date('Y-m-d'),
                $billData['Status'] ?? $billData['status'] ?? 'Belum Lunas',
                $billData['Bulan'] ?? $billData['bulan'] ?? '',
            ]);
            sendJson(['success' => true, 'id' => $billId]);
            break;

        case 'updateBillStatus':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $billId = $input['id'] ?? $input['billId'] ?? $input['ID'] ?? '';
            $newStatus = $input['status'] ?? $input['newStatus'] ?? '';
            $stmt = $pdo->prepare('UPDATE tagihan SET status = ? WHERE id = ?');
            $stmt->execute([$newStatus, $billId]);
            sendJson(['success' => true]);
            break;

        case 'deleteBill':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $billId = $input['id'] ?? $input['billId'] ?? $input['ID'] ?? '';
            $stmt = $pdo->prepare('DELETE FROM tagihan WHERE id = ?');
            $stmt->execute([$billId]);
            sendJson(['success' => true]);
            break;

        case 'deleteTransaction':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $trxId = $input['id'] ?? $input['trxId'] ?? $input['ID'] ?? '';
            // Ambil daftar tagihan terkait lalu kembalikan statusnya ke Belum Lunas
            $stmt = $pdo->prepare('SELECT tagihan_id FROM transaksi WHERE id = ?');
            $stmt->execute([$trxId]);
            $trx = $stmt->fetch();
            if ($trx && !empty($trx['tagihan_id'])) {
                $billIds = array_filter(array_map('trim', explode(',', (string)$trx['tagihan_id'])));
                if (count($billIds) > 0) {
                    $ph = implode(',', array_fill(0, count($billIds), '?'));
                    $stmt = $pdo->prepare("UPDATE tagihan SET status = 'Belum Lunas' WHERE id IN ($ph)");
                    $stmt->execute($billIds);
                }
            }
            $stmt = $pdo->prepare('DELETE FROM transaksi WHERE id = ?');
            $stmt->execute([$trxId]);
            sendJson(['success' => true]);
            break;

        case 'getMasterTagihan':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $rows = $pdo->query('SELECT * FROM master_tagihan ORDER BY nama_tagihan ASC')->fetchAll();
            $mapped = array_map(function ($r) {
                return [
                    'ID' => (string)$r['id'],
                    'NamaTagihan' => $r['nama_tagihan'],
                    'NominalDefault' => (float)$r['nominal_default'],
                    'TipeTagihan' => $r['tipe_tagihan'],
                ];
            }, $rows);
            sendJson($mapped);
            break;

        case 'addMasterTagihan':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $data = $input['data'] ?? $input['masterData'] ?? $input;
            $mNama = $data['NamaTagihan'] ?? $data['nama'] ?? '';
            $mNominal = $data['NominalDefault'] ?? $data['nominal'] ?? 0;
            $mTipe = $data['TipeTagihan'] ?? $data['tipe'] ?? 'Bulanan';
            $mid = 'M' . date('YmdHis') . bin2hex(random_bytes(4));
            $stmt = $pdo->prepare('INSERT INTO master_tagihan (id, nama_tagihan, nominal_default, tipe_tagihan) VALUES (?, ?, ?, ?)');
            $stmt->execute([$mid, $mNama, $mNominal, $mTipe]);
            // MASTER SAJA: TIDAK otomatis membuat tagihan siswa. Tagihan baru
            // HANYA dibuat setelah admin/bendahara menjalankan
            // Generate Tagihan Massal (menu Tagihan).
            sendJson(['success' => true, 'id' => $mid, 'generated' => 0]);
            break;

        case 'updateMasterTagihan':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $mid = $input['id'] ?? $input['ID'] ?? '';
            $data = $input['data'] ?? $input['masterData'] ?? $input;
            // Ambil nama lama untuk sinkronisasi tagihan siswa yang sudah ter-generate
            $oldStmt = $pdo->prepare('SELECT nama_tagihan FROM master_tagihan WHERE id = ?');
            $oldStmt->execute([$mid]);
            $oldNama = $oldStmt->fetchColumn();
            $newNama = $data['NamaTagihan'] ?? $data['nama'] ?? '';
            $stmt = $pdo->prepare('UPDATE master_tagihan SET nama_tagihan = ?, nominal_default = ?, tipe_tagihan = ? WHERE id = ?');
            $stmt->execute([
                $newNama,
                $data['NominalDefault'] ?? $data['nominal'] ?? 0,
                $data['TipeTagihan'] ?? $data['tipe'] ?? 'Bulanan',
                $mid,
            ]);
            // Jika nama berubah, ikutkan tagihan siswa yang belum lunas agar tidak yatim
            if ($oldNama && $newNama && $oldNama !== $newNama) {
                try {
                    $pdo->prepare("UPDATE tagihan SET jenis_tagihan = ? WHERE jenis_tagihan = ? AND status = 'Belum Lunas'")
                        ->execute([$newNama, $oldNama]);
                } catch (Exception $e) {}
            }
            sendJson(['success' => true]);
            break;

        case 'deleteMasterTagihan':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $mid = $input['id'] ?? $input['ID'] ?? '';
            // Ambil nama master dulu agar bisa cari tagihan terkait
            $stmt = $pdo->prepare('SELECT nama_tagihan FROM master_tagihan WHERE id = ?');
            $stmt->execute([$mid]);
            $master = $stmt->fetch();
            if ($master) {
                // Hapus semua tagihan siswa dengan jenis tagihan tsb
                $stmt = $pdo->prepare('SELECT id FROM tagihan WHERE jenis_tagihan = ?');
                $stmt->execute([$master['nama_tagihan']]);
                $billIds = array_column($stmt->fetchAll(), 'id');
                if (count($billIds) > 0) {
                    // Hapus transaksi terkait tagihan tsb
                    foreach ($billIds as $bid) {
                        $stmt = $pdo->prepare("DELETE FROM transaksi WHERE tagihan_id LIKE ? OR tagihan_id LIKE ?");
                        $stmt->execute(["$bid,%", "%,$bid"]);
                        $stmt = $pdo->prepare("DELETE FROM transaksi WHERE tagihan_id = ?");
                        $stmt->execute([$bid]);
                    }
                    $ph = implode(',', array_fill(0, count($billIds), '?'));
                    $stmt = $pdo->prepare("DELETE FROM tagihan WHERE id IN ($ph)");
                    $stmt->execute($billIds);
                }
            }
            $stmt = $pdo->prepare('DELETE FROM master_tagihan WHERE id = ?');
            $stmt->execute([$mid]);
            sendJson(['success' => true]);
            break;

        case 'generateBulkBills':
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $payload = $input['payload'] ?? $input;
            if (($payload['targetSiswa'] ?? '') === 'Semua Siswa') {
                $targetList = $pdo->query("SELECT * FROM siswa WHERE status_siswa = 'aktif'")->fetchAll();
            } else {
                $stmt = $pdo->prepare('SELECT * FROM siswa WHERE id = ?');
                $stmt->execute([$payload['targetSiswa'] ?? '']);
                $targetList = $stmt->fetchAll();
            }
            if (count($targetList) === 0) {
                sendJson(['success' => false, 'error' => 'Tidak ada siswa yang dipilih atau aktif']);
            }
            $durasi = (int)($payload['durasiBulan'] ?? 1);
            $baseDate = new DateTime($payload['jatuhTempoAwal'] ?? 'now');
            $addedRows = 0;
            $skippedRows = 0;
            $monthsStr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            $insertStmt = $pdo->prepare('INSERT INTO tagihan (id, siswa_id, jenis_tagihan, nominal, jatuh_tempo, status, bulan) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach ($targetList as $s) {
                for ($m = 0; $m < $durasi; $m++) {
                    $dp = clone $baseDate;
                    if ($m > 0) $dp->modify('+' . $m . ' month');
                    // ANTI TAGIHAN GANDA: nama sama + nominal sama + jatuh tempo
                    // sama + dibuat di tanggal yang sama -> lewati, jangan insert.
                    if (tagihanAdaGanda($pdo, $s['id'], $payload['jenisTagihan'] ?? '', $payload['nominal'] ?? 0, $dp->format('Y-m-d'))) {
                        $skippedRows++;
                        continue;
                    }
                    $blnLabel = $monthsStr[(int)$dp->format('n') - 1] . ' ' . $dp->format('Y');
                    $billId = 'B' . date('YmdHis') . bin2hex(random_bytes(3)) . str_pad($m, 2, '0', STR_PAD_LEFT);
                    $insertStmt->execute([
                        $billId,
                        $s['id'],
                        $payload['jenisTagihan'] ?? '',
                        $payload['nominal'] ?? 0,
                        $dp->format('Y-m-d'),
                        'Belum Lunas',
                        $blnLabel,
                    ]);
                    $addedRows++;
                }
            }
            sendJson(['success' => true, 'count' => $addedRows, 'skipped' => $skippedRows]);
            break;

        case 'processPayment':
            // PERBAIKAN KEAMANAN: hanya bendahara/admin yang bisa proses pembayaran
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $studentData = $input['studentData'] ?? $input['siswa'] ?? [];
            $billIds = $input['billIds'] ?? $input['tagihanIds'] ?? [];
            $paymentMethod = $input['metode'] ?? $input['metodeBayar'] ?? 'Tunai';
            $totalAmount = $input['total'] ?? $input['nominal'] ?? 0;

            $now = new DateTime();
            $resiNum = 'TRX-' . $now->format('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(3)));

            if (is_array($billIds) && count($billIds) > 0) {
                $ph = implode(',', array_fill(0, count($billIds), '?'));
                $stmt = $pdo->prepare("UPDATE tagihan SET status = 'Lunas' WHERE id IN ($ph)");
                $stmt->execute($billIds);
                $stmt = $pdo->prepare("SELECT jenis_tagihan FROM tagihan WHERE id IN ($ph)");
                $stmt->execute($billIds);
                $categories = array_column($stmt->fetchAll(), 'jenis_tagihan');
            } else {
                $categories = [];
            }

            $trxId = 'T' . date('YmdHis') . bin2hex(random_bytes(4));
            $stmt = $pdo->prepare('INSERT INTO transaksi (id, siswa_id, tagihan_id, nominal, metode_bayar, tanggal, nomor_resi) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $trxId,
                (string)($studentData['id'] ?? ''),
                is_array($billIds) ? implode(',', $billIds) : '',
                $totalAmount,
                $paymentMethod,
                $now->format('Y-m-d H:i:s'),
                $resiNum,
            ]);

            sendJson([
                'success' => true,
                'resi' => $resiNum,
                'tanggal' => $now->format('Y-m-d'),
                'waktu' => $now->format('H:i'),
                'kategori' => implode(', ', $categories),
            ]);
            break;

        case 'getDashboardStats':
            // PERBAIKAN KEAMANAN: hanya user terautentikasi
            requireAuth($pdo, $input, ['admin', 'bendahara']);
            $filterJenis = trim($input['jenis'] ?? '');
            $students = $pdo->query('SELECT * FROM siswa')->fetchAll();
            if ($filterJenis !== '') {
                $stmt = $pdo->prepare('SELECT * FROM tagihan WHERE jenis_tagihan = ?');
                $stmt->execute([$filterJenis]);
                $bills = $stmt->fetchAll();
            } else {
                $bills = $pdo->query('SELECT * FROM tagihan')->fetchAll();
            }
            $transactions = $pdo->query('SELECT * FROM transaksi')->fetchAll();

            $totalSiswa = count($students);
            $siswaAktif = 0;
            foreach ($students as $s) {
                if (($s['status_siswa'] ?? 'aktif') === 'aktif') $siswaAktif++;
            }

            $totalTagihan = 0;
            $belumLunasCount = 0;
            $totalBelumLunas = 0;
            $totalTerbayar = 0;
            foreach ($bills as $b) {
                $totalTagihan += (float)($b['nominal'] ?? 0);
                $st = strtolower(trim((string)($b['status'] ?? '')));
                if ($st === 'belum lunas') {
                    $belumLunasCount++;
                    $totalBelumLunas += (float)($b['nominal'] ?? 0);
                } elseif ($st === 'lunas') {
                    $totalTerbayar += (float)($b['nominal'] ?? 0);
                }
            }

            $now = new DateTime();
            $studentMap = [];
            foreach ($students as $s) {
                $studentMap[(string)$s['id']] = $s;
            }
            $overdueList = [];
            foreach ($bills as $b) {
                if (strtolower(trim((string)($b['status'] ?? ''))) !== 'belum lunas') continue;
                $dueDate = new DateTime($b['jatuh_tempo']);
                $diffDays = (int)floor(($now->getTimestamp() - $dueDate->getTimestamp()) / 86400);
                if ($diffDays > 7) {
                    $st = $studentMap[(string)$b['siswa_id']] ?? null;
                    if ($st) {
                        $overdueList[] = [
                            'siswaId' => (string)$st['id'],
                            'billId' => (string)$b['id'],
                            'nama' => $st['nama'] ?? '',
                            'nisn' => $st['nisn'] ?? '',
                            'kelas' => $st['kelas'] ?? '',
                            'telp' => $st['no_hp'] ?? $st['nohp_ortu'] ?? '',
                            'jenis' => $b['jenis_tagihan'],
                            'nominal' => (float)$b['nominal'],
                            'terlambat' => $diffDays,
                        ];
                    }
                }
            }
            usort($overdueList, function ($a, $b) {
                return $b['terlambat'] <=> $a['terlambat'];
            });
            $limitedOverdue = array_slice($overdueList, 0, 10);

            $trxBulanIni = 0;
            $trxCountBulanIni = 0;
            $thisMonth = (int)$now->format('n');
            $thisYear = (int)$now->format('Y');
            foreach ($transactions as $t) {
                $tDate = new DateTime($t['tanggal']);
                if ((int)$tDate->format('n') === $thisMonth && (int)$tDate->format('Y') === $thisYear) {
                    $trxBulanIni += (float)$t['nominal'];
                    $trxCountBulanIni++;
                }
            }

            $siswaBelumBayar = [];
            $siswaPunyaTagihan = [];
            foreach ($bills as $b) {
                $siswaPunyaTagihan[(string)$b['siswa_id']] = true;
                if (strtolower(trim((string)($b['status'] ?? ''))) === 'belum lunas') {
                    $siswaBelumBayar[(string)$b['siswa_id']] = true;
                }
            }
            $siswaTotalTagihan = count($siswaPunyaTagihan);
            $siswaSudahBayarCount = max(0, $siswaTotalTagihan - count($siswaBelumBayar));

            // SINKRONISASI: sumber utama opsi filter Jenis Tagihan adalah tabel
            // master_tagihan (dikelola di menu "Tagihan"), bukan hanya jenis yang
            // kebetulan sudah pernah dipakai di tagihan. Dengan begitu jenis baru
            // langsung muncul sebagai filter walau belum ada tagihan/transaksi.
            $jenisTagihanSet = [];
            $masterJenisRows = $pdo->query('SELECT DISTINCT nama_tagihan FROM master_tagihan ORDER BY nama_tagihan ASC')->fetchAll(PDO::FETCH_COLUMN);
            foreach ($masterJenisRows as $mj) {
                if ($mj !== null && trim((string)$mj) !== '') $jenisTagihanSet[trim($mj)] = true;
            }
            // Tetap sertakan jenis dari tagihan lama yang mungkin sudah tidak ada
            // lagi di master (misal master pernah diubah manual), agar data lama
            // tidak "hilang" dari filter.
            foreach ($bills as $b) {
                if (!empty($b['jenis_tagihan'])) $jenisTagihanSet[trim($b['jenis_tagihan'])] = true;
            }

            sendJson([
                'success' => true,
                'totalSiswa' => $totalSiswa,
                'siswaAktif' => $siswaAktif,
                'siswaTidakAktif' => $totalSiswa - $siswaAktif,
                'totalTagihan' => $totalTagihan,
                'totalBelumLunas' => $totalBelumLunas,
                'belumLunasCount' => $belumLunasCount,
                'siswaBelumBayar' => count($siswaBelumBayar),
                'siswaTotalTagihan' => $siswaTotalTagihan,
                'siswaSudahBayarCount' => $siswaSudahBayarCount,
                'totalTerbayar' => $totalTerbayar,
                'jumlahTransaksi' => count($transactions),
                'trxBulanIni' => $trxBulanIni,
                'trxCountBulanIni' => $trxCountBulanIni,
                'overdueStudents' => $limitedOverdue,
                'jenisFilter' => $filterJenis,
                'jenisTagihanOptions' => array_keys($jenisTagihanSet),
            ]);
            break;

        // ==========================================
        // TABUNGAN SISWA (Bendahara, Admin, Siswa)
        // ==========================================
        case 'getTabunganList':
            $token = $input['token'] ?? '';
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin', 'bendahara'], true)) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $rows = $pdo->query(
                "SELECT t.id AS tab_id, t.saldo, t.created_at,
                        s.id AS siswa_id, s.nama AS nama_siswa, s.nisn, s.kelas, s.status_siswa
                 FROM siswa s
                 LEFT JOIN tabungan t ON t.siswa_id = s.id
                 WHERE s.status_siswa IN ('aktif', 'alumni')
                 ORDER BY s.status_siswa ASC, s.nama ASC"
            )->fetchAll();
            $out = [];
            foreach ($rows as $r) {
                $out[] = [
                    'id' => $r['tab_id'] ? (string)$r['tab_id'] : '',
                    'siswaId' => (string)$r['siswa_id'],
                    'nisn' => $r['nisn'] ?? '',
                    'namaSiswa' => $r['nama_siswa'] ?? '',
                    'kelas' => $r['kelas'] ?? '',
                    'saldo' => (float)($r['saldo'] ?? 0),
                    'punyaTabungan' => $r['tab_id'] ? 1 : 0,
                    'createdAt' => $r['created_at'] ?? '',
                    'statusSiswa' => $r['status_siswa'] ?? 'aktif',
                ];
            }
            sendJson(['success' => true, 'data' => $out]);
            break;

        case 'getTabunganSaya':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if ($sess['role'] !== 'siswa') { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $stmt = $pdo->prepare("SELECT id FROM siswa WHERE nisn = ?");
            $stmt->execute([$sess['identifier']]);
            $sRow = $stmt->fetch();
            if (!$sRow) sendJson(['success' => false, 'message' => 'Data siswa tidak ditemukan']);
            $siswaId = (string)$sRow['id'];
            $tab = $pdo->prepare("SELECT * FROM tabungan WHERE siswa_id = ?");
            $tab->execute([$siswaId]);
            $tRow = $tab->fetch();
            $saldo = $tRow ? (float)$tRow['saldo'] : 0;
            $trx = $pdo->prepare(
                "SELECT * FROM tabungan_transaksi tt
                 JOIN tabungan t ON t.id = tt.tabungan_id
                 WHERE t.siswa_id = ? ORDER BY tt.tanggal DESC, tt.id DESC LIMIT 200"
            );
            $trx->execute([$siswaId]);
            $list = [];
            foreach ($trx->fetchAll() as $r) {
                $list[] = [
                    'id' => (string)$r['id'],
                    'tipe' => $r['tipe'],
                    'nominal' => (float)$r['nominal'],
                    'keterangan' => $r['keterangan'] ?? '',
                    'tanggal' => $r['tanggal'] ?? '',
                    'petugas' => $r['petugas'] ?? '',
                ];
            }
            sendJson(['success' => true, 'saldo' => $saldo, 'transaksi' => $list]);
            break;

        case 'tabunganTransaksi':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin', 'bendahara'], true)) {
                sendJson(['success' => false, 'message' => 'Akses ditolak']);
            }
            $siswaId = trim($input['siswaId'] ?? '');
            $tipe = ($input['tipe'] ?? 'setor') === 'tarik' ? 'tarik' : 'setor';
            $nominal = (float)($input['nominal'] ?? 0);
            $keterangan = trim($input['keterangan'] ?? '');
            if ($siswaId === '' || $nominal <= 0) {
                sendJson(['success' => false, 'message' => 'Data tidak lengkap']);
            }
            // Ambil nama petugas (username role aktif)
            $petugas = $sess['identifier'] ?? '';
            // Cari/insert akun tabungan siswa
            $stmt = $pdo->prepare("SELECT * FROM tabungan WHERE siswa_id = ?");
            $stmt->execute([$siswaId]);
            $tRow = $stmt->fetch();
            if (!$tRow) {
                $tid = 'TBN' . date('YmdHis') . bin2hex(random_bytes(4));
                $pdo->prepare("INSERT INTO tabungan (id, siswa_id, saldo) VALUES (?, ?, 0)")
                    ->execute([$tid, $siswaId]);
                $tRow = ['id' => $tid, 'saldo' => 0];
            }
            $tid = $tRow['id'];
            $saldoLama = (float)$tRow['saldo'];
            if ($tipe === 'tarik' && $nominal > $saldoLama) {
                sendJson(['success' => false, 'message' => 'Saldo tidak mencukupi']);
            }
            $saldoBaru = $tipe === 'setor' ? $saldoLama + $nominal : $saldoLama - $nominal;
            $trxId = 'TBT' . date('YmdHis') . bin2hex(random_bytes(4));
            $pdo->beginTransaction();
            try {
                $pdo->prepare("UPDATE tabungan SET saldo = ? WHERE id = ?")
                    ->execute([$saldoBaru, $tid]);
                $pdo->prepare("INSERT INTO tabungan_transaksi (id, tabungan_id, tipe, nominal, keterangan, petugas) VALUES (?, ?, ?, ?, ?, ?)")
                    ->execute([$trxId, $tid, $tipe, $nominal, $keterangan, $petugas]);
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                sendJson(['success' => false, 'message' => 'Gagal simpan transaksi']);
            }
            sendJson(['success' => true, 'saldo' => $saldoBaru]);
            break;

        case 'getTabunganRiwayat':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin', 'bendahara'], true)) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $siswaId = trim($input['siswaId'] ?? '');
            if ($siswaId === '') sendJson(['success' => false, 'message' => 'Data tidak lengkap']);
            $stmt = $pdo->prepare(
                "SELECT tt.id, tt.tipe, tt.nominal, tt.keterangan, tt.petugas, tt.tanggal,
                        s.nama AS nama_siswa, s.nisn, s.kelas, t.saldo
                 FROM tabungan_transaksi tt
                 JOIN tabungan t ON t.id = tt.tabungan_id
                 JOIN siswa s ON s.id = t.siswa_id
                 WHERE t.siswa_id = ?
                 ORDER BY tt.tanggal DESC, tt.id DESC"
            );
            $stmt->execute([$siswaId]);
            $list = [];
            foreach ($stmt->fetchAll() as $r) {
                $list[] = [
                    'id' => (string)$r['id'],
                    'tipe' => $r['tipe'],
                    'nominal' => (float)$r['nominal'],
                    'keterangan' => $r['keterangan'] ?? '',
                    'petugas' => $r['petugas'] ?? '',
                    'tanggal' => $r['tanggal'] ?? '',
                    'namaSiswa' => $r['nama_siswa'] ?? '',
                    'nisn' => $r['nisn'] ?? '',
                    'kelas' => $r['kelas'] ?? '',
                    'saldo' => (float)($r['saldo'] ?? 0),
                ];
            }
            sendJson(['success' => true, 'data' => $list]);
            break;

        case 'hapusTabungan':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin', 'bendahara'], true)) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $siswaId = trim($input['siswaId'] ?? '');
            if ($siswaId === '') sendJson(['success' => false, 'message' => 'Data tidak lengkap']);
            $stmt = $pdo->prepare("SELECT id FROM tabungan WHERE siswa_id = ?");
            $stmt->execute([$siswaId]);
            $tRow = $stmt->fetch();
            if (!$tRow) sendJson(['success' => false, 'message' => 'Tabungan tidak ditemukan']);
            $pdo->beginTransaction();
            try {
                $pdo->prepare("DELETE FROM tabungan_transaksi WHERE tabungan_id = ?")->execute([$tRow['id']]);
                $pdo->prepare("DELETE FROM tabungan WHERE id = ?")->execute([$tRow['id']]);
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                sendJson(['success' => false, 'message' => 'Gagal menghapus tabungan']);
            }
            sendJson(['success' => true, 'message' => 'Tabungan & riwayat transaksi dihapus']);
            break;

        case 'hapusTabunganMasal':
            $token = $input['token'] ?? '';  // KEAMANAN: tidak membaca dari GET
            $sess = verifyToken($pdo, $token);
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if (!in_array($sess['role'], ['admin', 'bendahara'], true)) { sendJson(['success' => false, 'message' => 'Akses ditolak']); }
            $ids = $input['siswaIds'] ?? [];
            if (!is_array($ids) || !count($ids)) sendJson(['success' => false, 'message' => 'Tidak ada data dipilih']);
            $ids = array_values(array_unique(array_map('strval', $ids)));
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $pdo->beginTransaction();
            try {
                // Ambil semua tabungan id utk siswa tsb
                $stmt = $pdo->prepare("SELECT id FROM tabungan WHERE siswa_id IN ($placeholders)");
                $stmt->execute($ids);
                $tabIds = array_map(function ($r) { return $r['id']; }, $stmt->fetchAll());
                if ($tabIds) {
                    $ph2 = implode(',', array_fill(0, count($tabIds), '?'));
                    $pdo->prepare("DELETE FROM tabungan_transaksi WHERE tabungan_id IN ($ph2)")->execute($tabIds);
                    $pdo->prepare("DELETE FROM tabungan WHERE id IN ($ph2)")->execute($tabIds);
                }
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                sendJson(['success' => false, 'message' => 'Gagal menghapus tabungan masal']);
            }
            sendJson(['success' => true, 'message' => count($ids) . ' tabungan dihapus']);
            break;

}
