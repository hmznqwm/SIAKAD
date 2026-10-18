<?php
switch ($action) {
        case 'scanAbsensi':
            // PERBAIKAN KEAMANAN: wajib sesi valid (guru/admin/scanner)
            requireAuth($pdo, $input, ['admin', 'guru', 'walikelas', 'scanner']);
            $nisn = trim($input['nisn'] ?? '');
            $tanggal = $input['tanggal'] ?? date('Y-m-d');
            $mapelScan = trim($input['mapel'] ?? $input['args'][2] ?? '');
            $jamNow = date('H:i:s');

            // ATURAN: setiap absensi siswa wajib menyertakan mata pelajaran
            if ($mapelScan === '') {
                sendJson(['success' => false, 'message' => 'Setiap absensi wajib menyertakan mata pelajaran.']);
            }

            $stmt = $pdo->prepare("SELECT * FROM siswa WHERE nisn = ? AND status_siswa = 'aktif'");
            $stmt->execute([$nisn]);
            $siswa = $stmt->fetch();
            if (!$siswa) {
                sendJson(['success' => false, 'message' => 'NISN tidak terdaftar']);
            }

            // PEMBATASAN AKSES: guru/walikelas hanya boleh scan di kelas+mapel amanannya
            $sessScan = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas', 'scanner']);
            if (in_array($sessScan['role'], ['guru', 'walikelas'], true)) {
                $aksesScan = guruAksesKelasMapel($pdo, $sessScan);
                if (!guruBolehAksesKelas($aksesScan, $siswa['kelas'], $mapelScan !== '' ? $mapelScan : null)) {
                    sendJson(['success' => false, 'message' => 'Akses ditolak: scan di luar kelas/mapel yang Anda ampu.']);
                }
            }

            $chk = $pdo->prepare("SELECT * FROM absensi WHERE tanggal = ? AND nisn = ?");
            $chk->execute([$tanggal, $nisn]);
            $absen = $chk->fetch();

            if (!$absen) {
                $ins = $pdo->prepare("INSERT INTO absensi (tanggal, nisn, nama, kelas, jam_datang, status, keterangan_waktu, mata_pelajaran) VALUES (?, ?, ?, ?, ?, 'Hadir', ?, ?)");
                $ket = (strtotime($jamNow) > strtotime('07:30:00')) ? 'Terlambat' : 'Tepat Waktu';
                $ins->execute([$tanggal, $nisn, $siswa['nama'], $siswa['kelas'], $jamNow, $ket, $mapelScan]);

                sendJson([
                    'success' => true,
                    'message' => "Absen Masuk Berhasil: {$siswa['nama']} ({$siswa['kelas']})",
                    'type' => 'masuk',
                    'nama' => $siswa['nama'],
                    'kelas' => $siswa['kelas'],
                    'waktu' => $jamNow
                ]);
            } else {
                $upd = $pdo->prepare("UPDATE absensi SET jam_pulang = ? WHERE id = ?");
                $upd->execute([$jamNow, $absen['id']]);

                sendJson([
                    'success' => true,
                    'message' => "Absen Pulang Berhasil: {$siswa['nama']} ({$siswa['kelas']})",
                    'type' => 'pulang',
                    'nama' => $siswa['nama'],
                    'kelas' => $siswa['kelas'],
                    'waktu' => $jamNow
                ]);
            }
            break;

        case 'scanAbsensiGuru':
            // PERBAIKAN KEAMANAN: wajib sesi valid
            requireAuth($pdo, $input, ['admin', 'guru', 'walikelas', 'scanner']);
            $nip = trim($input['nip'] ?? '');
            $tanggal = $input['tanggal'] ?? date('Y-m-d');
            $jamNow = date('H:i:s');

            $stmt = $pdo->prepare("SELECT * FROM profil_guru WHERE nip = ?");
            $stmt->execute([$nip]);
            $guru = $stmt->fetch();
            if (!$guru) {
                sendJson(['success' => false, 'message' => 'NIP Guru tidak terdaftar']);
            }

            $chk = $pdo->prepare("SELECT * FROM absensi_guru WHERE tanggal = ? AND nip = ?");
            $chk->execute([$tanggal, $nip]);
            $absen = $chk->fetch();

            if (!$absen) {
                $ins = $pdo->prepare("INSERT INTO absensi_guru (tanggal, nip, nama_guru, jam_masuk, status) VALUES (?, ?, ?, ?, 'Hadir')");
                $ins->execute([$tanggal, $nip, $guru['nama_guru'], $jamNow]);
                sendJson(['success' => true, 'message' => "Absen Masuk Guru Berhasil: {$guru['nama_guru']}", 'type' => 'masuk']);
            } else {
                $upd = $pdo->prepare("UPDATE absensi_guru SET jam_pulang = ? WHERE id = ?");
                $upd->execute([$jamNow, $absen['id']]);
                sendJson(['success' => true, 'message' => "Absen Pulang Guru Berhasil: {$guru['nama_guru']}", 'type' => 'pulang']);
            }
            break;

        case 'getAbsensiToday':
        case 'getAbsensiList':
            $tanggal = $_GET['tanggal'] ?? $input['tanggal'] ?? date('Y-m-d');
            $kelas = $_GET['kelas'] ?? $input['kelas'] ?? null;

            $sql = "SELECT * FROM absensi WHERE tanggal = ?";
            $params = [$tanggal];

            [$kelasClause, $kelasParams] = buildKelasInClause($kelas);
            $sql .= $kelasClause;
            $params = array_merge($params, $kelasParams);
            $sql .= " ORDER BY jam_datang ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $data = array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'tanggal' => $r['tanggal'],
                    'nisn' => $r['nisn'],
                    'nama' => $r['nama'],
                    'namaSiswa' => $r['nama'],
                    'kelas' => $r['kelas'],
                    'jamDatang' => $r['jam_datang'],
                    'jamPulang' => $r['jam_pulang'],
                    'keteranganWaktu' => $r['keterangan_waktu'],
                    'status' => $r['status'],
                    'jamSholat' => $r['jam_sholat'],
                    'mataPelajaran' => $r['mata_pelajaran']
                ];
            }, $rows);

            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'getAbsensiGuruList':
            $tanggal = $_GET['tanggal'] ?? $input['tanggal'] ?? date('Y-m-d');
            $stmt = $pdo->prepare("SELECT * FROM absensi_guru WHERE tanggal = ? ORDER BY jam_masuk ASC");
            $stmt->execute([$tanggal]);
            $rows = $stmt->fetchAll();

            $data = array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'tanggal' => $r['tanggal'],
                    'nip' => $r['nip'],
                    'namaGuru' => $r['nama_guru'],
                    'jamMasuk' => $r['jam_masuk'],
                    'jamPulang' => $r['jam_pulang'],
                    'status' => $r['status'],
                    'keterangan' => $r['keterangan']
                ];
            }, $rows);

            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'updateAbsensiStatus':
        case 'updateAbsensiEntryByDate':
            $nisn    = $input['nisn']   ?? $input['args'][1] ?? null;
            $nama    = $input['nama']   ?? $input['args'][2] ?? null;
            $kelas   = $input['kelas']  ?? $input['args'][3] ?? null;
            // PENTING: jangan fallback ke $input['args'][4]/[3] untuk tanggal.
            // Untuk action 'updateAbsensiStatus' (dari Monitoring Real-time), args[4]
            // berisi TEKS STATUS ("Hadir"/"Izin"/dst), bukan tanggal. Memakainya sebagai
            // tanggal menyebabkan query mencari/menyimpan baris absensi dengan tanggal
            // yang salah, sehingga perubahan status (khususnya untuk siswa yang statusnya
            // berasal dari perizinan) terlihat berhasil tapi tidak pernah benar-benar
            // tersimpan pada tanggal yang tepat. Kalau tanggal tidak dikirim eksplisit,
            // gunakan tanggal hari ini (aman karena Monitoring Real-time selalu untuk hari ini).
            $tanggal = $input['tanggal'] ?? date('Y-m-d');
            $mapel   = $input['mapel']  ?? $input['args'][5] ?? null;
            $status  = $input['status'] ?? $input['newStatus'] ?? $input['args'][6] ?? $input['args'][5] ?? 'Hadir';

            // Normalize aliases
            if ($status === 'Alfa') $status = 'Alpa';

            // PEMBATASAN AKSES: guru/walikelas hanya boleh mengubah absensi
            // sesuai kelas+mapel amanannya.
            // PENTING: otorisasi dilakukan terhadap MAPEL YANG SEDANG DITULIS
            // ($mapel dari rekap guru), BUKAN mapel baris lama yang diambil
            // acak — sebelumnya baris milik guru lain pada tanggal yang sama
            // bisa ikut ter-pick sehingga penulisan sah ditolak dan data
            // rekap guru gagal tersimpan.
            $sessUas = requireAuth($pdo, $input);
            if (in_array($sessUas['role'], ['guru', 'walikelas'], true)) {
                $aksesUas = guruAksesKelasMapel($pdo, $sessUas);
                if ($mapel && trim((string)$mapel) !== '') {
                    // Rekap bulanan selalu kirim mapel target — cukup cek itu
                    $kelasCek = $kelas;
                    $mapelCek = trim((string)$mapel);
                } else {
                    // Tanpa mapel eksplisit (mis. tombol status Monitoring):
                    // pakai identitas entri lama jika ada
                    $chkUas = $pdo->prepare("SELECT kelas, mata_pelajaran FROM absensi WHERE nisn = ? AND tanggal = ? LIMIT 1");
                    $chkUas->execute([$nisn, $tanggal]);
                    $rowUas = $chkUas->fetch();
                    $kelasCek = $rowUas['kelas'] ?? $kelas;
                    $mapelCek = trim((string)($rowUas['mata_pelajaran'] ?? '')) !== '' ? $rowUas['mata_pelajaran'] : null;
                }
                if (!guruBolehAksesKelas($aksesUas, $kelasCek, $mapelCek)) {
                    sendJson(['success' => false, 'message' => 'Akses ditolak: absensi ini di luar kelas/mapel yang Anda ampu.']);
                    break;
                }
            }

            // Find existing record.
            // SINKRONISASI REKAP BULANAN: utamakan baris dengan mapel PERSIS sama.
            // Jika tidak ada dan $mapel dikirim, baris "umum" (mapel kosong, misal
            // hasil scan harian) boleh dipakai — lalu mapelnya DIISI saat update
            // agar entri tampil di kolom mapel yang tepat pada Rekap Bulanan
            // (view guru maupun admin), bukan menggantung di bucket "(umum)".
            $existing = null;
            if ($mapel) {
                $chkEx = $pdo->prepare("SELECT id, mata_pelajaran FROM absensi WHERE nisn = ? AND tanggal = ? AND mata_pelajaran = ? LIMIT 1");
                $chkEx->execute([$nisn, $tanggal, $mapel]);
                $existing = $chkEx->fetch();
                if (!$existing) {
                    $chkUm = $pdo->prepare("SELECT id, mata_pelajaran FROM absensi WHERE nisn = ? AND tanggal = ? AND (mata_pelajaran IS NULL OR mata_pelajaran = '') LIMIT 1");
                    $chkUm->execute([$nisn, $tanggal]);
                    $existing = $chkUm->fetch();
                }
            } else {
                $chk = $pdo->prepare("SELECT id, mata_pelajaran FROM absensi WHERE nisn = ? AND tanggal = ? LIMIT 1");
                $chk->execute([$nisn, $tanggal]);
                $existing = $chk->fetch();
            }

            if ($status === 'Belum Absen') {
                // "Belum Absen" = no record in DB, so delete any existing one
                // This keeps monitoring & rekap bulanan in sync (both show blank/empty for this day)
                if ($existing) {
                    $pdo->prepare("DELETE FROM absensi WHERE id = ?")->execute([$existing['id']]);
                }
                sendJson(['success' => true, 'message' => 'Status dikembalikan ke Belum Absen']);
            } elseif ($existing) {
                // Baris lama masih tanpa mapel + edit menyertakan mapel → isi mapelnya,
                // supaya tersimpan sesuai mapel & terkumpul benar di rekap bulanan admin.
                $mpLama = trim((string)($existing['mata_pelajaran'] ?? ''));
                if ($mapel && $mpLama === '') {
                    $upd = $pdo->prepare("UPDATE absensi SET status = ?, mata_pelajaran = ? WHERE id = ?");
                    $upd->execute([$status, $mapel, $existing['id']]);
                } else {
                    $upd = $pdo->prepare("UPDATE absensi SET status = ? WHERE id = ?");
                    $upd->execute([$status, $existing['id']]);
                }
                sendJson(['success' => true, 'message' => "Status diubah menjadi $status"]);
            } else {
                // ATURAN: entri baru wajib menyertakan mata pelajaran (tanpa absensi umum)
                if (trim((string)($mapel ?? '')) === '') {
                    sendJson(['success' => false, 'message' => 'Setiap absensi wajib menyertakan mata pelajaran.']);
                    break;
                }
                $ins = $pdo->prepare("INSERT INTO absensi (tanggal, nisn, nama, kelas, status, mata_pelajaran) VALUES (?, ?, ?, ?, ?, ?)");
                $ins->execute([$tanggal, $nisn, $nama, $kelas, $status, $mapel]);
                sendJson(['success' => true, 'message' => "Status diset $status"]);
            }
            break;

        case 'deleteAbsensiEntry':
            $nisn = $input['nisn'] ?? $input['args'][1] ?? null;
            $tanggal = $input['tanggal'] ?? $input['args'][2] ?? null;
            $mapel = $input['mapel'] ?? $input['args'][3] ?? null;
            $id = $input['id'] ?? null;

            // PEMBATASAN AKSES: guru/walikelas hanya boleh menghapus absensi
            // sesuai kelas+mapel amanannya.
            // Sama seperti update: jika $mapel target eksplisit, otorisasi
            // terhadap mapel itu — bukan baris lama acak milik guru lain.
            $sessDel = requireAuth($pdo, $input);
            if (in_array($sessDel['role'], ['guru', 'walikelas'], true)) {
                $aksesDel = guruAksesKelasMapel($pdo, $sessDel);
                if ($id) {
                    // Hapus by-id: identitas pasti dari baris itu sendiri
                    $stDel = $pdo->prepare("SELECT kelas, mata_pelajaran FROM absensi WHERE id = ?");
                    $stDel->execute([$id]);
                    $rowDel = $stDel->fetch();
                    $kelasDel = $rowDel['kelas'] ?? $input['kelas'] ?? null;
                    $mapelDel = (isset($rowDel['mata_pelajaran']) && trim((string)$rowDel['mata_pelajaran']) !== '') ? $rowDel['mata_pelajaran'] : ($mapel ?? null);
                } elseif ($mapel && trim((string)$mapel) !== '') {
                    $kelasDel = $input['kelas'] ?? null;
                    $mapelDel = trim((string)$mapel);
                } else {
                    $rowDel = null;
                    if ($nisn && $tanggal) {
                        $stDel = $pdo->prepare("SELECT kelas, mata_pelajaran FROM absensi WHERE nisn = ? AND tanggal = ? LIMIT 1");
                        $stDel->execute([$nisn, $tanggal]);
                        $rowDel = $stDel->fetch();
                    }
                    $kelasDel = $rowDel['kelas'] ?? $input['kelas'] ?? null;
                    $mapelDel = (isset($rowDel['mata_pelajaran']) && trim((string)$rowDel['mata_pelajaran']) !== '') ? $rowDel['mata_pelajaran'] : null;
                }
                if (!guruBolehAksesKelas($aksesDel, $kelasDel, $mapelDel)) {
                    sendJson(['success' => false, 'message' => 'Akses ditolak: absensi ini di luar kelas/mapel yang Anda ampu.']);
                    break;
                }
            }

            if ($id) {
                $del = $pdo->prepare("DELETE FROM absensi WHERE id = ?");
                $del->execute([$id]);
            } else if ($nisn && $tanggal) {
                // SINKRONISASI REKAP: utamakan hapus baris dengan mapel persis sama;
                // fallback ke baris "umum" (mapel kosong) hanya jika baris bermapel
                // tidak ada — selaras dengan updateAbsensiEntryByDate agar rekap
                // bulanan guru & admin tetap sinkron.
                $rowsDeleted = 0;
                if ($mapel) {
                    $delEx = $pdo->prepare("DELETE FROM absensi WHERE nisn = ? AND tanggal = ? AND mata_pelajaran = ? LIMIT 1");
                    $delEx->execute([$nisn, $tanggal, $mapel]);
                    $rowsDeleted = $delEx->rowCount();
                    if ($rowsDeleted === 0) {
                        $delUm = $pdo->prepare("DELETE FROM absensi WHERE nisn = ? AND tanggal = ? AND (mata_pelajaran IS NULL OR mata_pelajaran = '') LIMIT 1");
                        $delUm->execute([$nisn, $tanggal]);
                        $rowsDeleted = $delUm->rowCount();
                    }
                } else {
                    $sqlDel = "DELETE FROM absensi WHERE nisn = ? AND tanggal = ?";
                    $del = $pdo->prepare($sqlDel);
                    $del->execute([$nisn, $tanggal]);
                    $rowsDeleted = $del->rowCount();
                }

                // Jika tidak ada baris absensi yang terhapus, kemungkinan besar status di rekap
                // berasal murni dari perizinan yang disetujui (tidak ada baris absensi asli).
                // Tanpa penanda khusus, Rekap Bulanan akan tetap men-sinkronkan ulang status dari
                // perizinan tersebut sehingga sel yang "dihapus" akan muncul lagi setelah refresh.
                // Solusi: sisipkan baris penanda (status = 'Dihapus') agar prioritas baris absensi
                // menang atas sinkronisasi perizinan, membuat sel menjadi kosong secara permanen
                // sampai admin mengubahnya lagi secara manual.
                if ($rowsDeleted === 0) {
                    try {
                        $pzChk = $pdo->prepare("SELECT id FROM perizinan_siswa WHERE nisn = ? AND tanggal = ? AND (status_izin = 'Disetujui' OR status_izin LIKE '%Setujui%')");
                        $pzChk->execute([$nisn, $tanggal]);
                        if ($pzChk->fetch()) {
                            $sNama = $input['nama'] ?? null;
                            $sKelas = $input['kelas'] ?? null;
                            if (!$sNama || !$sKelas) {
                                $sStmt = $pdo->prepare("SELECT nama, kelas FROM siswa WHERE nisn = ?");
                                $sStmt->execute([$nisn]);
                                $sRow = $sStmt->fetch();
                                if ($sRow) {
                                    $sNama = $sNama ?: $sRow['nama'];
                                    $sKelas = $sKelas ?: $sRow['kelas'];
                                }
                            }
                            $insOverride = $pdo->prepare("INSERT INTO absensi (tanggal, nisn, nama, kelas, status, mata_pelajaran) VALUES (?, ?, ?, ?, 'Dihapus', ?)");
                            $insOverride->execute([$tanggal, $nisn, $sNama, $sKelas, $mapel]);
                        }
                    } catch (Exception $e) { /* perizinan_siswa mungkin belum ada, abaikan */ }
                }
            }
            sendJson(['success' => true, 'message' => 'Entri absensi dihapus']);
            break;

        case 'updateAbsensiGuruEntryByDate':
            $nip = $input['nip'] ?? $input['args'][1] ?? null;
            $nama = $input['nama'] ?? $input['args'][2] ?? null;
            $tanggal = $input['tanggal'] ?? $input['args'][3] ?? date('Y-m-d');
            $mapel = $input['mapel'] ?? $input['args'][4] ?? null;
            $status = $input['status'] ?? $input['newStatus'] ?? $input['args'][5] ?? $input['args'][4] ?? 'Hadir';

            $chk = $pdo->prepare("SELECT id FROM absensi_guru WHERE nip = ? AND tanggal = ?");
            $chk->execute([$nip, $tanggal]);
            $existing = $chk->fetch();

            if ($existing) {
                $upd = $pdo->prepare("UPDATE absensi_guru SET status = ? WHERE id = ?");
                $upd->execute([$status, $existing['id']]);
            } else {
                $ins = $pdo->prepare("INSERT INTO absensi_guru (tanggal, nip, nama_guru, jam_masuk, status) VALUES (?, ?, ?, '07:00', ?)");
                $ins->execute([$tanggal, $nip, $nama, $status]);
            }
            sendJson(['success' => true, 'message' => 'Status absensi guru berhasil diperbarui']);
            break;

        case 'deleteAbsensiGuruEntry':
            $nip = $input['nip'] ?? $input['args'][1] ?? null;
            $tanggal = $input['tanggal'] ?? $input['args'][2] ?? null;

            if ($nip && $tanggal) {
                $del = $pdo->prepare("DELETE FROM absensi_guru WHERE nip = ? AND tanggal = ?");
                $del->execute([$nip, $tanggal]);
                $rowsDeleted = $del->rowCount();

                // Sama seperti absensi siswa: kalau tidak ada baris yang terhapus, statusnya
                // kemungkinan besar berasal murni dari perizinan guru yang disetujui. Sisipkan
                // baris penanda agar tidak muncul lagi via sinkronisasi perizinan.
                if ($rowsDeleted === 0) {
                    try {
                        $pzChk = $pdo->prepare("SELECT id FROM perizinan_guru WHERE nip = ? AND tanggal = ? AND (status = 'Disetujui' OR status LIKE '%Setujui%')");
                        $pzChk->execute([$nip, $tanggal]);
                        if ($pzChk->fetch()) {
                            $gNama = $input['nama'] ?? null;
                            if (!$gNama) {
                                $gStmt = $pdo->prepare("SELECT nama_guru FROM profil_guru WHERE nip = ?");
                                $gStmt->execute([$nip]);
                                $gRow = $gStmt->fetch();
                                $gNama = $gRow ? $gRow['nama_guru'] : $nip;
                            }
                            $insOverride = $pdo->prepare("INSERT INTO absensi_guru (tanggal, nip, nama_guru, status) VALUES (?, ?, ?, 'Dihapus')");
                            $insOverride->execute([$tanggal, $nip, $gNama]);
                        }
                    } catch (Exception $e) { /* perizinan_guru mungkin belum ada, abaikan */ }
                }
            }
            sendJson(['success' => true, 'message' => 'Entri absensi guru dihapus']);
            break;


        case 'getDaftarHadirByKelasAndTanggal':
            $kelas = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][0] ?? '';
            $tanggal = $_GET['tanggal'] ?? $input['tanggal'] ?? $input['args'][1] ?? date('Y-m-d');
            $mapel = $_GET['mapel'] ?? $input['mapel'] ?? $input['args'][2] ?? '';

            // PEMBATASAN AKSES: guru hanya boleh melihat absensi kelas+mapel yang dia ampu,
            // walikelas hanya kelas yang diwalikan
            $sessDhL = requireAuth($pdo, $input);
            if (in_array($sessDhL['role'], ['guru', 'walikelas'], true)) {
                $aksesDhL = guruAksesKelasMapel($pdo, $sessDhL);
                if (!guruBolehAksesKelas($aksesDhL, $kelas, $mapel !== '' ? $mapel : null)) {
                    sendJson(['success' => true, 'data' => []]);
                }
            }

            $sql = "SELECT * FROM absensi WHERE tanggal = ?";
            $params = [$tanggal];

            if (!empty($kelas) && $kelas !== 'SEMUA') {
                $sql .= " AND kelas = ?";
                $params[] = $kelas;
            }

            if (!empty($mapel)) {
                $sql .= " AND (mata_pelajaran = ? OR mata_pelajaran IS NULL OR mata_pelajaran = '')";
                $params[] = $mapel;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $data = [];
            foreach ($rows as $r) {
                $nisnKey = trim($r['nisn']);
                $st = strtolower(trim($r['status']));
                if ($st === 'alfa') $st = 'alpa';
                $data[$nisnKey] = [
                    'status' => $st,
                    'jamDatang' => $r['jam_datang'] ? substr($r['jam_datang'], 0, 5) : '',
                    'hasJamDatang' => !empty($r['jam_datang'])
                ];
            }

            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'submitDaftarHadirGuru':
            $dataList = $input['dataList'] ?? $input['data'] ?? $input['args'][0] ?? [];
            $tanggal  = $input['tanggal']  ?? $input['args'][1] ?? date('Y-m-d');
            $namaGuru = $input['namaGuru'] ?? $input['args'][2] ?? '';
            $mapel    = $input['mapel']    ?? $input['args'][3] ?? '';
            $jamNow   = date('H:i:s');

            if (empty($dataList) || !is_array($dataList)) {
                sendJson(['success' => false, 'message' => 'Data absensi kosong']);
                break;
            }

            // PEMBATASAN AKSES: guru hanya boleh mengabsen siswa kelas+mapel yang dia ampu,
            // walikelas hanya kelas yang diwalikan (mapel bebas)
            $sessDhS = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas', 'kepsek', 'wakel', 'scanner']);
            $aksesDhS = in_array($sessDhS['role'], ['guru', 'walikelas'], true) ? guruAksesKelasMapel($pdo, $sessDhS) : null;

            // ATURAN: setiap absensi SISWA wajib menyertakan mata pelajaran
            // (absensi GURU via nip tidak wajib mapel)
            $adaSiswaTanpaMapel = false;
            if (trim((string)$mapel) === '') {
                foreach ($dataList as $item) {
                    if (!empty(trim($item['nisn'] ?? ''))) { $adaSiswaTanpaMapel = true; break; }
                }
            }
            if ($adaSiswaTanpaMapel) {
                sendJson(['success' => false, 'message' => 'Setiap absensi siswa wajib menyertakan mata pelajaran. Pilih mapel terlebih dahulu.']);
                break;
            }

            $savedCount = 0;
            foreach ($dataList as $item) {
                $nisn = trim($item['nisn'] ?? '');
                $nip = trim($item['nip'] ?? '');
                $nama = trim($item['nama'] ?? $item['namaGuru'] ?? '');
                $kelas = trim($item['kelas'] ?? '');
                $status = trim($item['status'] ?? 'Hadir');

                $status = ucfirst(strtolower($status));
                if ($status === 'Alfa') $status = 'Alpa';

                if ($nisn) {
                    // Cek hak akses guru/walikelas atas kelas+mapel ini
                    if (!guruBolehAksesKelas($aksesDhS, $kelas, trim((string)$mapel) !== '' ? $mapel : null)) {
                        sendJson(['success' => false, 'message' => "Akses ditolak: Anda tidak mengampu kelas $kelas" . (trim((string)$mapel) !== '' ? " mapel $mapel" : '') . '.']);
                        break;
                    }
                    $sqlChk = "SELECT id FROM absensi WHERE nisn = ? AND tanggal = ?";
                    $chkParams = [$nisn, $tanggal];
                    if ($mapel) {
                        $sqlChk .= " AND (mata_pelajaran = ? OR mata_pelajaran IS NULL OR mata_pelajaran = '')";
                        $chkParams[] = $mapel;
                    }
                    $chk = $pdo->prepare($sqlChk);
                    $chk->execute($chkParams);
                    $existing = $chk->fetch();

                    $ketWaktu = (strtotime($jamNow) > strtotime('07:30:00')) ? 'Terlambat' : 'Tepat Waktu';

                    if ($existing) {
                        $upd = $pdo->prepare("UPDATE absensi SET status = ?, nama = ?, kelas = ?, mata_pelajaran = ? WHERE id = ?");
                        $upd->execute([$status, $nama, $kelas, $mapel, $existing['id']]);
                    } else {
                        $ins = $pdo->prepare("INSERT INTO absensi (tanggal, nisn, nama, kelas, jam_datang, status, keterangan_waktu, mata_pelajaran) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                        $ins->execute([$tanggal, $nisn, $nama, $kelas, $jamNow, $status, $ketWaktu, $mapel]);
                    }
                    $savedCount++;
                } else if ($nip) {
                    // Proteksi sisi server: role guru/walikelas hanya boleh mencatat
                    // absensi SISWA. Filter dropdown di UI Daftar Hadir sudah membatasi
                    // ini, tapi endpoint API tetap harus divalidasi ulang di sini karena
                    // bisa dipanggil langsung tanpa lewat UI (mis. lewat console/network).
                    if (in_array($sessDhS['role'], ['guru', 'walikelas'], true)) {
                        sendJson(['success' => false, 'message' => 'Absensi guru hanya bisa dicatat oleh Admin.']);
                        break;
                    }
                    $chk = $pdo->prepare("SELECT id FROM absensi_guru WHERE nip = ? AND tanggal = ?");
                    $chk->execute([$nip, $tanggal]);
                    $existing = $chk->fetch();

                    if ($existing) {
                        $upd = $pdo->prepare("UPDATE absensi_guru SET status = ? WHERE id = ?");
                        $upd->execute([$status, $existing['id']]);
                    } else {
                        $ins = $pdo->prepare("INSERT INTO absensi_guru (tanggal, nip, nama_guru, jam_masuk, status) VALUES (?, ?, ?, ?, ?)");
                        $ins->execute([$tanggal, $nip, $nama, $jamNow, $status]);
                    }
                    $savedCount++;
                }
            }

            sendJson(['success' => true, 'message' => "Berhasil menyimpan $savedCount data absensi", 'count' => $savedCount]);
            break;

        case 'getHariLibur':
            $stmt = $pdo->query("SELECT * FROM hari_libur ORDER BY tanggal ASC");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return ['id' => $r['id'], 'tanggal' => $r['tanggal'], 'keterangan' => $r['keterangan']];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'addHariLiburRange':
            $tglMulai = $input['tanggal_mulai'] ?? $input['tglMulai'] ?? $input['args'][0] ?? '';
            $tglAkhir = $input['tanggal_akhir'] ?? $input['tglAkhir'] ?? $input['args'][1] ?? $tglMulai;
            $ket = $input['keterangan'] ?? $input['args'][2] ?? 'Hari Libur';

            if (!$tglMulai) {
                sendJson(['success' => false, 'message' => 'Tanggal mulai harus diisi']);
                break;
            }

            $start = strtotime($tglMulai);
            $end = strtotime($tglAkhir ?: $tglMulai);
            $count = 0;

            for ($curr = $start; $curr <= $end; $curr = strtotime('+1 day', $curr)) {
                $tglStr = date('Y-m-d', $curr);
                $ins = $pdo->prepare("INSERT INTO hari_libur (tanggal, keterangan) VALUES (?, ?) ON DUPLICATE KEY UPDATE keterangan=VALUES(keterangan)");
                $ins->execute([$tglStr, $ket]);
                $count++;
            }
            sendJson(['success' => true, 'message' => "Berhasil menambahkan $count hari libur"]);
            break;

        case 'addHariLibur':
            $tgl = $input['tanggal'] ?? $_GET['tanggal'] ?? '';
            $ket = $input['keterangan'] ?? $_GET['keterangan'] ?? 'Hari Libur';
            $ins = $pdo->prepare("INSERT INTO hari_libur (tanggal, keterangan) VALUES (?, ?) ON DUPLICATE KEY UPDATE keterangan=VALUES(keterangan)");
            $ins->execute([$tgl, $ket]);
            sendJson(['success' => true, 'message' => 'Hari libur berhasil disimpan']);
            break;

        case 'updateHariLibur':
            $oldDate = $input['oldDate'] ?? $input['args'][0] ?? null;
            $newDate = $input['newDate'] ?? $input['args'][1] ?? $oldDate;
            $newKet = $input['newKeterangan'] ?? $input['keterangan'] ?? $input['args'][2] ?? '';
            if ($oldDate) {
                $upd = $pdo->prepare("UPDATE hari_libur SET tanggal = ?, keterangan = ? WHERE tanggal = ?");
                $upd->execute([$newDate, $newKet, $oldDate]);
            }
            sendJson(['success' => true, 'message' => 'Hari libur berhasil diperbarui']);
            break;

        case 'importHariLiburBulk':
            $dataList = $input['data'] ?? $input['formattedData'] ?? $input['args'][0] ?? [];
            $added = 0; $skipped = 0;
            foreach ($dataList as $item) {
                if (!empty($item['tanggal'])) {
                    $ket = $item['keterangan'] ?? 'Libur';
                    $ins = $pdo->prepare("INSERT INTO hari_libur (tanggal, keterangan) VALUES (?, ?) ON DUPLICATE KEY UPDATE keterangan=VALUES(keterangan)");
                    $ins->execute([$item['tanggal'], $ket]);
                    $added++;
                } else {
                    $skipped++;
                }
            }
            sendJson(['success' => true, 'added' => $added, 'skipped' => $skipped, 'message' => 'Import hari libur selesai']);
            break;

        case 'deleteHariLibur':
            $id = $input['id'] ?? $input['tanggal'] ?? $_GET['id'] ?? null;
            if ($id) {
                $del = $pdo->prepare("DELETE FROM hari_libur WHERE id = ? OR tanggal = ?");
                $del->execute([$id, $id]);
            }
            sendJson(['success' => true, 'message' => 'Hari libur berhasil dihapus']);
            break;

        case 'getAppConfig':
        case 'getModeAbsen':
            $stmt = $pdo->query("SELECT * FROM konfigurasi");
            $rows = $stmt->fetchAll();
            $config = [];
            foreach ($rows as $r) {
                if ($r['key_name'] === 'jadwal_harian') {
                    $config['jadwal_harian'] = json_decode($r['value_name'], true);
                } else {
                    $config[$r['key_name']] = $r['value_name'];
                }
            }
            if (empty($config['jadwal_harian'])) {
                $defaultJadwal = [];
                for ($d = 1; $d <= 7; $d++) {
                    $defaultJadwal[(string)$d] = [
                        'libur' => ($d === 7),
                        'masuk_mulai' => '06:00',
                        'masuk_akhir' => '07:15',
                        'libur_rutinan' => true,
                        'ket_libur' => ''
                    ];
                }
                $config['jadwal_harian'] = $defaultJadwal;
            }
            sendJson(['success' => true, 'data' => $config, 'config' => $config, 'mode' => $config['mode_absen'] ?? 'masuk_pulang']);
            break;

        case 'saveAppConfig':
        case 'setModeAbsen':
            $cfg = $input['configData'] ?? $input['data'] ?? $input;
            if (isset($cfg['jadwal_harian'])) {
                $jsonJadwal = json_encode($cfg['jadwal_harian']);
                $upd = $pdo->prepare("INSERT INTO konfigurasi (key_name, value_name, keterangan) VALUES ('jadwal_harian', ?, 'Jadwal Harian') ON DUPLICATE KEY UPDATE value_name=VALUES(value_name)");
                $upd->execute([$jsonJadwal]);
            }
            if (isset($cfg['jam_masuk_mulai'])) {
                $upd = $pdo->prepare("INSERT INTO konfigurasi (key_name, value_name, keterangan) VALUES ('jam_masuk_mulai', ?, 'Jam Masuk Mulai') ON DUPLICATE KEY UPDATE value_name=VALUES(value_name)");
                $upd->execute([$cfg['jam_masuk_mulai']]);
            }
            if (isset($cfg['jam_masuk_akhir'])) {
                $upd = $pdo->prepare("INSERT INTO konfigurasi (key_name, value_name, keterangan) VALUES ('jam_masuk_akhir', ?, 'Jam Masuk Akhir') ON DUPLICATE KEY UPDATE value_name=VALUES(value_name)");
                $upd->execute([$cfg['jam_masuk_akhir']]);
            }
            if (isset($cfg['mode_absen'])) {
                $upd = $pdo->prepare("INSERT INTO konfigurasi (key_name, value_name, keterangan) VALUES ('mode_absen', ?, 'Mode Absen') ON DUPLICATE KEY UPDATE value_name=VALUES(value_name)");
                $upd->execute([$cfg['mode_absen']]);
            }
            sendJson(['success' => true, 'message' => 'Pengaturan waktu berhasil disimpan!']);
            break;

        case 'getRekapAbsensiRange':
            // Rekap absensi per RENTANG TANGGAL (menu Rekap Absensi):
            // mengirim baris siswa & guru sekaligus sesuai filter.
            $sessRa = requireAuth($pdo, $input);
            $startRa = $_GET['start'] ?? $input['start'] ?? $input['args'][1] ?? date('Y-m-d');
            $endRa   = $_GET['end'] ?? $input['end'] ?? $input['args'][2] ?? date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$startRa)) $startRa = date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$endRa)) $endRa = date('Y-m-d');
            if ($startRa > $endRa) { $tmpRa = $startRa; $startRa = $endRa; $endRa = $tmpRa; }
            $kelasRa = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][3] ?? '';
            $jabRa   = $_GET['jabatan'] ?? $input['jabatan'] ?? $input['args'][4] ?? '';

            // PEMBATASAN AKSES: guru/walikelas hanya kelas amanannya
            if (in_array($sessRa['role'], ['guru', 'walikelas'], true)) {
                $aksesRa = guruAksesKelasMapel($pdo, $sessRa);
                if (empty($aksesRa)) sendJson(['success' => true, 'data' => ['siswa' => [], 'guru' => []]]);
                $kelasRa = implode(',', array_keys($aksesRa));
            }

            // ---- Siswa ----
            $sqlS = "SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal, nisn, nama,
                            IFNULL(kelas,'-') as kelas, IFNULL(jam_datang,'') as jam_datang,
                            IFNULL(jam_pulang,'') as jam_pulang,
                            IFNULL(keterangan_waktu,'') as keterangan_waktu, status
                     FROM absensi WHERE tanggal BETWEEN ? AND ?";
            $paramsS = [$startRa, $endRa];
            [$clsRa, $parRa] = buildKelasInClause($kelasRa);
            if ($clsRa !== '') { $sqlS .= $clsRa; $paramsS = array_merge($paramsS, $parRa); }
            $sqlS .= " ORDER BY tanggal ASC, kelas ASC, nama ASC";
            $stS = $pdo->prepare($sqlS);
            $stS->execute($paramsS);

            // ---- Guru ----
            $sqlG = "SELECT DATE_FORMAT(ag.tanggal, '%Y-%m-%d') as tanggal, ag.nip, ag.nama_guru,
                            IFNULL(NULLIF(u.role,''),'-') as jabatan,
                            IFNULL(ag.jam_masuk,'') as jam_masuk, IFNULL(ag.jam_pulang,'') as jam_pulang,
                            IFNULL(ag.keterangan,'') as keterangan, ag.status
                     FROM absensi_guru ag
                     LEFT JOIN users u ON (u.username = ag.nip OR u.nip = ag.nip)
                     WHERE ag.tanggal BETWEEN ? AND ?";
            $paramsG = [$startRa, $endRa];
            if ($jabRa !== '' && $jabRa !== null) {
                $sqlG .= " AND u.role = ?";
                $paramsG[] = $jabRa;
            }
            $sqlG .= " ORDER BY ag.tanggal ASC, ag.nama_guru ASC";
            $stG = $pdo->prepare($sqlG);
            $stG->execute($paramsG);

            sendJson(['success' => true, 'data' => [
                'siswa' => $stS->fetchAll(),
                'guru'  => $stG->fetchAll()
            ]]);
            break;

        case 'getMonitoringRealtime':
            $sessMon = requireAuth($pdo, $input);
            $tanggal = date('Y-m-d');
            // Accept kelas filter from multiple sources (GET, POST-JSON, args)
            $kelasFilter = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][0] ?? null;
            // Empty string / null / 'null' string means all classes
            if (!$kelasFilter || $kelasFilter === 'null' || $kelasFilter === 'SEMUA') {
                $kelasFilter = null;
            }
            // PEMBATASAN AKSES: guru/walikelas selalu dibatasi ke kelas amanannya,
            // apapun kelas yang dikirim client
            if (in_array($sessMon['role'], ['guru', 'walikelas'], true)) {
                $aksesMon = guruAksesKelasMapel($pdo, $sessMon);
                if (empty($aksesMon)) sendJson(['success' => true, 'data' => []]);
                $kelasFilter = implode(',', array_keys($aksesMon));
            }
            $sql = "SELECT nisn, nama, kelas FROM siswa WHERE status_siswa='aktif'";
            $params = [];
            if ($kelasFilter) {
                // Support multiple classes (comma-separated, e.g. "10A,10B")
                $kelasList = array_filter(array_map('trim', explode(',', $kelasFilter)));
                if (count($kelasList) === 1) {
                    $sql .= " AND kelas = ?";
                    $params[] = $kelasList[0];
                } elseif (count($kelasList) > 1) {
                    $placeholders = implode(',', array_fill(0, count($kelasList), '?'));
                    $sql .= " AND kelas IN ($placeholders)";
                    $params = array_merge($params, $kelasList);
                }
            }
            $sql .= " ORDER BY kelas ASC, nama ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $siswaRows = $stmt->fetchAll();

            // SINKRON REKAP BULANAN: terapkan aturan hari libur & jadwal kelas yang
            // sama dengan getMonthlyReportData, agar grafik dashboard konsisten
            // dengan kolom tanggal yang sama di Rekapitulasi Bulanan.
            $dayOfWeekToday = (int)date('N');
            $isTodayLibur = false;
            try {
                $hlToday = $pdo->prepare("SELECT COUNT(*) FROM hari_libur WHERE DATE_FORMAT(tanggal, '%Y-%m-%d') = ?");
                $hlToday->execute([$tanggal]);
                if ((int)$hlToday->fetchColumn() > 0) $isTodayLibur = true;
            } catch(Exception $e) {}
            try {
                $cfgStmt2 = $pdo->query("SELECT value_name FROM konfigurasi WHERE key_name = 'jadwal_harian'");
                $jhJson = $cfgStmt2->fetchColumn();
                $jadwalHarianCfg = $jhJson ? json_decode($jhJson, true) : [];
                if (!$isTodayLibur && isset($jadwalHarianCfg[(string)$dayOfWeekToday]) && !empty($jadwalHarianCfg[(string)$dayOfWeekToday]['libur'])) {
                    $isTodayLibur = true;
                }
                if (!$isTodayLibur && $dayOfWeekToday == 7 && (!isset($jadwalHarianCfg['7']) || !empty($jadwalHarianCfg['7']['libur']))) {
                    $isTodayLibur = true;
                }
            } catch(Exception $e) {}
            $kelasJadwalDaysToday = [];
            try {
                $kjdStmt = $pdo->prepare("SELECT DISTINCT LOWER(TRIM(kelas)) as kls FROM jadwal WHERE kelas IS NOT NULL AND kelas != '' AND LOWER(TRIM(hari)) = ?");
                $hariNameToday = ['','senin','selasa','rabu','kamis','jumat','sabtu','minggu'][$dayOfWeekToday] ?? '';
                $kjdStmt->execute([$hariNameToday]);
                foreach ($kjdStmt->fetchAll(PDO::FETCH_COLUMN) as $kls) {
                    $kelasJadwalDaysToday[$kls] = true;
                }
            } catch(Exception $e) {}

            // Load today's absensi into a map by nisn
            $absStmt = $pdo->prepare("SELECT nisn, jam_datang, jam_pulang, keterangan_waktu, status, mata_pelajaran FROM absensi WHERE DATE_FORMAT(tanggal, '%Y-%m-%d') = ? ORDER BY id ASC");
            $absStmt->execute([$tanggal]);
            $absMap = [];
            foreach ($absStmt->fetchAll() as $r) { $absMap[$r['nisn']] = $r; }

            // Load today's approved perizinan siswa (status_izin = 'Disetujui')
            $pzMap = [];
            try {
                $pzStmt = $pdo->prepare("SELECT nisn, jenis FROM perizinan_siswa WHERE tanggal = ? AND status_izin = 'Disetujui'");
                $pzStmt->execute([$tanggal]);
                foreach ($pzStmt->fetchAll() as $r) { $pzMap[$r['nisn']] = $r['jenis']; }
            } catch(Exception $e) { /* table may not exist yet */ }

            $data = array_map(function($s) use ($absMap, $pzMap, $isTodayLibur, $dayOfWeekToday, $kelasJadwalDaysToday) {
                $status = 'Belum Absen';
                $jamDatang = '-';
                $jamPulang = '-';
                $keterangan = '-';

                if (isset($absMap[$s['nisn']])) {
                    $abs = $absMap[$s['nisn']];
                    // 'Dihapus' = penanda internal (dari hapus entri rekap bulanan yang asalnya
                    // dari perizinan) - tampilkan sebagai 'Belum Absen' di monitoring hari ini.
                    $status    = ($abs['status'] === 'Dihapus') ? 'Belum Absen' : ($abs['status'] ?: 'Hadir');
                    $jamDatang = $abs['jam_datang'] ? substr($abs['jam_datang'], 0, 5) : '-';
                    $jamPulang = $abs['jam_pulang'] ? substr($abs['jam_pulang'], 0, 5) : '-';
                    $keterangan = ($abs['status'] === 'Dihapus') ? '-' : ($abs['keterangan_waktu'] ?: '-');
                } elseif (isset($pzMap[$s['nisn']])) {
                    // Perizinan disetujui tapi belum ada di absensi → tampilkan langsung
                    $status = $pzMap[$s['nisn']]; // 'Izin' or 'Sakit'
                    $keterangan = 'Via Perizinan';
                } else {
                    // Tidak ada catatan sama sekali: jika hari ini libur / kelasnya
                    // memang tidak ada jadwal, tandai 'Libur' (bukan 'Belum Absen')
                    // agar sesuai dengan kolom 'L' di Rekapitulasi Bulanan.
                    $sKelasKey = mb_strtolower(trim($s['kelas'] ?? ''));
                    if ($isTodayLibur || !isset($kelasJadwalDaysToday[$sKelasKey])) {
                        $status = 'Libur';
                    }
                }

                return [
                    'nisn'       => $s['nisn'],
                    'nama'       => $s['nama'],
                    'kelas'      => $s['kelas'],
                    'status'     => $status,
                    'jamDatang'  => $jamDatang,
                    'jamPulang'  => $jamPulang,
                    'keterangan' => $keterangan,
                    'mapel'      => $abs['mata_pelajaran'] ?? '',
                ];
            }, $siswaRows);

            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'getAttendanceStats':
            // Statistik kehadiran siswa per periode (harian/mingguan/bulanan/tahunan).
            // Aturan status SAMA dengan Rekapitulasi Bulanan: catatan absensi >
            // perizinan disetujui > libur (hari_libur/jadwal_harian/jadwal kelas) >
            // auto-Alpa (hari sekolah yang sudah lewat tanpa catatan) > Belum Absen.
            requireAuth($pdo, $input);
            $periode = strtolower(trim($_GET['periode'] ?? $input['periode'] ?? $input['args'][1] ?? 'harian'));
            $kelasStats = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][2] ?? null;
            if (!$kelasStats || $kelasStats === 'null' || $kelasStats === 'SEMUA') $kelasStats = null;

            $today = date('Y-m-d');
            switch ($periode) {
                case 'mingguan': $start = date('Y-m-d', strtotime('-6 days')); break;
                case 'bulanan':  $start = date('Y-m-01'); break;
                case 'tahunan':  $start = date('Y-01-01'); break;
                default:         $periode = 'harian'; $start = $today;
            }
            $end = $today;
            $startTs = strtotime($start);
            $endTs   = strtotime($end);

            // Daftar siswa
            $sqlStats = "SELECT nisn, nama, kelas FROM siswa WHERE status_siswa='aktif'";
            $paramsStats = [];
            [$kelasClauseS, $kelasParamsS] = buildKelasInClause($kelasStats);
            $sqlStats .= $kelasClauseS;
            $paramsStats = array_merge($paramsStats, $kelasParamsS);
            $stStmt = $pdo->prepare($sqlStats);
            $stStmt->execute($paramsStats);
            $siswaStatRows = $stStmt->fetchAll();

            // Absensi dalam rentang (record terakhir menang, sama seperti monitoring)
            $absDayMap = [];
            try {
                $abStmt2 = $pdo->prepare("SELECT nisn, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, status FROM absensi WHERE tanggal BETWEEN ? AND ? ORDER BY id ASC");
                $abStmt2->execute([$start, $end]);
                foreach ($abStmt2->fetchAll() as $r) {
                    if (empty($r['nisn'])) continue;
                    $absDayMap[trim($r['nisn'])][$r['tgl']] = $r['status'];
                }
            } catch(Exception $e) {}

            // Perizinan disetujui (mengisi hari tanpa catatan absensi)
            $pzDayMap = [];
            try {
                $pzStmt2 = $pdo->prepare("SELECT nisn, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, jenis FROM perizinan_siswa WHERE (status_izin = 'Disetujui' OR status_izin LIKE '%Setujui%') AND tanggal BETWEEN ? AND ?");
                $pzStmt2->execute([$start, $end]);
                foreach ($pzStmt2->fetchAll() as $r) {
                    if (empty($r['nisn'])) continue;
                    $pzDayMap[trim($r['nisn'])][$r['tgl']] = (mb_strtolower(trim($r['jenis'])) === 'sakit') ? 'Sakit' : 'Izin';
                }
            } catch(Exception $e) {}

            // Hari libur + konfigurasi rutin + jadwal kelas
            $liburSet = [];
            try {
                $hl2 = $pdo->prepare("SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') FROM hari_libur WHERE tanggal BETWEEN ? AND ?");
                $hl2->execute([$start, $end]);
                foreach ($hl2->fetchAll(PDO::FETCH_COLUMN) as $t) $liburSet[$t] = true;
            } catch(Exception $e) {}
            $jhCfg = [];
            try {
                $c3 = $pdo->query("SELECT value_name FROM konfigurasi WHERE key_name = 'jadwal_harian'");
                $jhCfg = json_decode((string)$c3->fetchColumn(), true) ?: [];
            } catch(Exception $e) {}
            $hariToN3 = ['senin'=>1,'selasa'=>2,'rabu'=>3,'kamis'=>4,'jumat'=>5,'sabtu'=>6,'minggu'=>7];
            $kelasJadwalDaysS = [];
            try {
                foreach ($pdo->query("SELECT DISTINCT LOWER(TRIM(kelas)) as kls, LOWER(TRIM(hari)) as hari FROM jadwal WHERE kelas IS NOT NULL AND kelas != ''")->fetchAll() as $jr3) {
                    if (!isset($kelasJadwalDaysS[$jr3['kls']])) $kelasJadwalDaysS[$jr3['kls']] = [];
                    if (isset($hariToN3[$jr3['hari']])) $kelasJadwalDaysS[$jr3['kls']][] = $hariToN3[$jr3['hari']];
                }
            } catch(Exception $e) {}

            $counts = ['hadir'=>0,'sakit'=>0,'izin'=>0,'alpa'=>0,'belum'=>0,'libur'=>0];
            foreach ($siswaStatRows as $s) {
                $nisnS = trim($s['nisn'] ?? '');
                $daysWithClassS = $kelasJadwalDaysS[mb_strtolower(trim($s['kelas'] ?? ''))] ?? null;
                for ($ts = $startTs; $ts <= $endTs; $ts += 86400) {
                    $tglS = date('Y-m-d', $ts);
                    if ($tglS > $today) break;

                    $status = $absDayMap[$nisnS][$tglS] ?? null;
                    if ($status === 'Dihapus') $status = null;
                    if ($status !== null) {
                        if ($status === 'Hadir') { $counts['hadir']++; continue; }
                        if ($status === 'Sakit') { $counts['sakit']++; continue; }
                        if ($status === 'Izin')  { $counts['izin']++; continue; }
                        if ($status === 'Alpa' || $status === 'Alfa') { $counts['alpa']++; continue; }
                        $status = null; // status tak dikenal → perlakukan tanpa catatan
                    }
                    if (isset($pzDayMap[$nisnS][$tglS])) {
                        $counts[strtolower($pzDayMap[$nisnS][$tglS])]++; continue;
                    }

                    $dowS = (int)date('N', $ts);
                    $isLiburS = isset($liburSet[$tglS]);
                    if (!$isLiburS && isset($jhCfg[(string)$dowS]) && !empty($jhCfg[(string)$dowS]['libur'])) $isLiburS = true;
                    if (!$isLiburS && $dowS == 7 && (!isset($jhCfg['7']) || !empty($jhCfg['7']['libur']))) $isLiburS = true;

                    if ($isLiburS) { $counts['libur']++; continue; }
                    if ($tglS < $today && $daysWithClassS !== null && in_array($dowS, $daysWithClassS)) { $counts['alpa']++; continue; }
                    $counts['belum']++;
                }
            }

            sendJson(['success' => true, 'data' => array_merge([
                'periode' => $periode, 'start' => $start, 'end' => $end,
                'totalSiswa' => count($siswaStatRows)
            ], $counts)]);
            break;

        case 'getAttendanceStatsGuru':
            // Statistik kehadiran GURU per periode — aturan sama dengan Rekap
            // Bulanan Guru: absensi_guru > perizinan disetujui > libur >
            // auto-Alpa (hari mengajar yang sudah lewat tanpa catatan) > Belum Absen.
            requireAuth($pdo, $input);
            $periodeG = strtolower(trim($_GET['periode'] ?? $input['periode'] ?? $input['args'][1] ?? 'harian'));
            $today    = date('Y-m-d');
            switch ($periodeG) {
                case 'mingguan': $startG = date('Y-m-d', strtotime('-6 days')); break;
                case 'bulanan':  $startG = date('Y-m-01'); break;
                case 'tahunan':  $startG = date('Y-01-01'); break;
                default:         $periodeG = 'harian'; $startG = $today;
            }
            $endG    = $today;
            $startTs = strtotime($startG);
            $endTs   = strtotime($endG);

            // Hari libur dalam rentang + konfigurasi rutin (sama seperti rekap)
            $liburSet = [];
            try {
                $hlG = $pdo->prepare("SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') FROM hari_libur WHERE tanggal BETWEEN ? AND ?");
                $hlG->execute([$startG, $endG]);
                foreach ($hlG->fetchAll(PDO::FETCH_COLUMN) as $t) $liburSet[$t] = true;
            } catch(Exception $e) {}
            $jhCfg = [];
            try {
                $cG = $pdo->query("SELECT value_name FROM konfigurasi WHERE key_name = 'jadwal_harian'");
                $jhCfg = json_decode((string)$cG->fetchColumn(), true) ?: [];
            } catch(Exception $e) {}
            $hariToN3 = ['senin'=>1,'selasa'=>2,'rabu'=>3,'kamis'=>4,'jumat'=>5,'sabtu'=>6,'minggu'=>7];

            // Daftar guru (profil_guru, fallback users)
            try {
                $guruStatRows = $pdo->query("SELECT * FROM profil_guru ORDER BY nama_guru ASC")->fetchAll();
            } catch(Exception $e) { $guruStatRows = []; }
            if (empty($guruStatRows)) {
                try {
                    $guruStatRows = $pdo->query("SELECT username as nip, username as nama_guru FROM users WHERE role = 'guru'")->fetchAll();
                } catch(Exception $e) { $guruStatRows = []; }
            }

            // Absensi guru dalam rentang (record terakhir menang)
            $absGDayMap = [];
            try {
                $ag2 = $pdo->prepare("SELECT nip, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, status FROM absensi_guru WHERE tanggal BETWEEN ? AND ? ORDER BY id ASC");
                $ag2->execute([$startG, $endG]);
                foreach ($ag2->fetchAll() as $r) {
                    if (empty($r['nip'])) continue;
                    $absGDayMap[trim($r['nip'])][$r['tgl']] = $r['status'];
                }
            } catch(Exception $e) {}

            // Perizinan guru disetujui (gap-fill)
            $pzGDayMap = [];
            try {
                $pg2 = $pdo->prepare("SELECT nip, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, jenis FROM perizinan_guru WHERE (status = 'Disetujui' OR status LIKE '%Setujui%') AND tanggal BETWEEN ? AND ?");
                $pg2->execute([$startG, $endG]);
                foreach ($pg2->fetchAll() as $r) {
                    if (empty($r['nip'])) continue;
                    $pzGDayMap[trim($r['nip'])][$r['tgl']] = (mb_strtolower(trim($r['jenis'])) === 'sakit') ? 'Sakit' : 'Izin';
                }
            } catch(Exception $e) {}

            // Hari mengajar per guru (dari tabel jadwal, by nama_guru)
            $guruJadwalDaysS = [];
            try {
                foreach ($pdo->query("SELECT DISTINCT LOWER(TRIM(nama_guru)) as ng, LOWER(TRIM(hari)) as hari FROM jadwal WHERE nama_guru IS NOT NULL AND nama_guru != ''")->fetchAll() as $jr4) {
                    if (!isset($guruJadwalDaysS[$jr4['ng']])) $guruJadwalDaysS[$jr4['ng']] = [];
                    if (isset($hariToN3[$jr4['hari']])) $guruJadwalDaysS[$jr4['ng']][] = $hariToN3[$jr4['hari']];
                }
            } catch(Exception $e) {}

            $countsG = ['hadir'=>0,'sakit'=>0,'izin'=>0,'alpa'=>0,'belum'=>0,'libur'=>0];
            foreach ($guruStatRows as $g) {
                $nipG = trim($g['nip'] ?? '');
                $namaG = $g['nama_guru'] ?? '';
                $teachingDaysG = $guruJadwalDaysS[mb_strtolower(trim($namaG))] ?? null;
                for ($ts = $startTs; $ts <= $endTs; $ts += 86400) {
                    $tglG = date('Y-m-d', $ts);
                    if ($tglG > $today) break;

                    $status = $absGDayMap[$nipG][$tglG] ?? null;
                    if ($status === 'Dihapus') $status = null;
                    if ($status !== null) {
                        if ($status === 'Hadir') { $countsG['hadir']++; continue; }
                        if ($status === 'Sakit') { $countsG['sakit']++; continue; }
                        if ($status === 'Izin')  { $countsG['izin']++; continue; }
                        if ($status === 'Alpa' || $status === 'Alfa') { $countsG['alpa']++; continue; }
                        $status = null;
                    }
                    if (isset($pzGDayMap[$nipG][$tglG])) {
                        $countsG[strtolower($pzGDayMap[$nipG][$tglG])]++; continue;
                    }

                    $dowG = (int)date('N', $ts);
                    $isLiburG = isset($liburSet[$tglG]);
                    if (!$isLiburG && isset($jhCfg[(string)$dowG]) && !empty($jhCfg[(string)$dowG]['libur'])) $isLiburG = true;
                    if (!$isLiburG && $dowG == 7 && (!isset($jhCfg['7']) || !empty($jhCfg['7']['libur']))) $isLiburG = true;

                    if ($isLiburG) { $countsG['libur']++; continue; }
                    if ($tglG < $today && $teachingDaysG !== null && in_array($dowG, $teachingDaysG)) { $countsG['alpa']++; continue; }
                    $countsG['belum']++;
                }
            }

            sendJson(['success' => true, 'data' => array_merge([
                'periode' => $periodeG, 'start' => $startG, 'end' => $endG,
                'totalGuru' => count($guruStatRows)
            ], $countsG)]);
            break;

            $tanggal = date('Y-m-d');
            // Try profil_guru first, fallback to users table
            $guruRows = $pdo->query("SELECT nip, nama_guru FROM profil_guru ORDER BY nama_guru ASC")->fetchAll();
            if (empty($guruRows)) {
                $guruRows = $pdo->query("SELECT username AS nip, username AS nama_guru FROM users WHERE role IN ('guru','walikelas') ORDER BY username ASC")->fetchAll();
            }

            // Load today's guru absensi
            $absGuruStmt = $pdo->prepare("SELECT nip, jam_masuk, jam_pulang, status, keterangan FROM absensi_guru WHERE DATE_FORMAT(tanggal, '%Y-%m-%d') = ?");
            $absGuruStmt->execute([$tanggal]);
            $absGuruMap = [];
            foreach ($absGuruStmt->fetchAll() as $r) { $absGuruMap[$r['nip']] = $r; }

            // Load today's approved perizinan guru (status = 'Disetujui')
            $pzGuruMap = [];
            try {
                $pzGuruStmt = $pdo->prepare("SELECT nip, jenis FROM perizinan_guru WHERE tanggal = ? AND status = 'Disetujui'");
                $pzGuruStmt->execute([$tanggal]);
                foreach ($pzGuruStmt->fetchAll() as $r) { $pzGuruMap[$r['nip']] = $r['jenis']; }
            } catch(Exception $e) { /* table may not exist yet */ }

            $data = array_map(function($g) use ($absGuruMap, $pzGuruMap) {
                $nip    = $g['nip'] ?? '';
                $status = 'Belum Absen';
                $jamDatang  = '-';
                $jamPulang  = '-';
                $keterangan = '-';

                if (isset($absGuruMap[$nip])) {
                    $abs = $absGuruMap[$nip];
                    // 'Dihapus' = penanda internal, tampilkan sebagai 'Belum Absen' hari ini.
                    $status    = ($abs['status'] === 'Dihapus') ? 'Belum Absen' : ($abs['status'] ?: 'Hadir');
                    $jamDatang = $abs['jam_masuk'] ? substr($abs['jam_masuk'], 0, 5) : '-';
                    $jamPulang = $abs['jam_pulang'] ? substr($abs['jam_pulang'], 0, 5) : '-';
                    $keterangan = ($abs['status'] === 'Dihapus') ? '-' : ($abs['keterangan'] ?: '-');
                } elseif (isset($pzGuruMap[$nip])) {
                    $status = $pzGuruMap[$nip];
                    $keterangan = 'Via Perizinan';
                }

                return [
                    'nip'        => $nip,
                    'nama'       => $g['nama_guru'] ?? '-',
                    'status'     => $status,
                    'jamDatang'  => $jamDatang,
                    'jamPulang'  => $jamPulang,
                    'keterangan' => $keterangan,
                ];
            }, $guruRows);

            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'batchScanAbsensi':
            $nisnList = $input['nisnList'] ?? $input['data'] ?? [];
            $tanggal = date('Y-m-d');
            $jamNow = date('H:i:s');
            $mapelBatch = trim($input['mapel'] ?? $input['args'][3] ?? '');
            // ATURAN: setiap absensi siswa wajib menyertakan mata pelajaran
            if ($mapelBatch === '') {
                sendJson(['success' => false, 'message' => 'Setiap absensi wajib menyertakan mata pelajaran.']);
            }
            // PEMBATASAN AKSES: guru/walikelas hanya boleh batch scan di kelas amanannya
            $sessBatch = requireAuth($pdo, $input, ['admin', 'guru', 'walikelas', 'scanner']);
            $aksesBatch = in_array($sessBatch['role'], ['guru', 'walikelas'], true) ? guruAksesKelasMapel($pdo, $sessBatch) : null;
            $count = 0;
            $results = [];

            // PERF: sebelumnya query siswa + query cek duplikat dijalankan SATU-SATU
            // per NISN di dalam loop (N+1). Untuk 1 kelas isi 30 siswa itu ~60 query
            // per sekali scan batch. Sekarang cukup 2 query total pakai WHERE IN,
            // sisanya dicocokkan di memori (jauh lebih cepat & lebih ringan ke DB).
            $nisnClean = array_values(array_unique(array_filter(array_map('trim', $nisnList))));

            if (!empty($nisnClean)) {
                $ph = implode(',', array_fill(0, count($nisnClean), '?'));

                $stmt = $pdo->prepare("SELECT * FROM siswa WHERE status_siswa = 'aktif' AND nisn IN ($ph)");
                $stmt->execute($nisnClean);
                $siswaByNisn = [];
                foreach ($stmt->fetchAll() as $row) {
                    $siswaByNisn[$row['nisn']] = $row;
                }

                $chk = $pdo->prepare("SELECT nisn FROM absensi WHERE tanggal = ? AND nisn IN ($ph)");
                $chk->execute(array_merge([$tanggal], $nisnClean));
                $sudahAbsen = array_flip($chk->fetchAll(PDO::FETCH_COLUMN));

                $ket = (strtotime($jamNow) > strtotime('07:30:00')) ? 'Terlambat' : 'Tepat Waktu';
                $ins = $pdo->prepare("INSERT INTO absensi (tanggal, nisn, nama, kelas, jam_datang, status, keterangan_waktu, mata_pelajaran) VALUES (?, ?, ?, ?, ?, 'Hadir', ?, ?)");

                foreach ($nisnClean as $nisn) {
                    $siswa = $siswaByNisn[$nisn] ?? null;
                    if (!$siswa) continue;
                    if (!guruBolehAksesKelas($aksesBatch, $siswa['kelas'], $mapelBatch)) continue;
                    if (isset($sudahAbsen[$nisn])) continue;

                    $ins->execute([$tanggal, $nisn, $siswa['nama'], $siswa['kelas'], $jamNow, $ket, $mapelBatch]);
                    $count++;
                    $results[] = ['success' => true, 'nisn' => $nisn, 'nama' => $siswa['nama'], 'kelas' => $siswa['kelas'], 'mapel' => $mapelBatch, 'jamDatang' => substr($jamNow, 0, 5), 'type' => 'datang'];
                }
            }
            sendJson(['success' => true, 'message' => "$count siswa berhasil diabsen", 'count' => $count, 'results' => $results]);
            break;

}
