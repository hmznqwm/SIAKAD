<?php
switch ($action) {
        case 'getKelasList':
        case 'getDaftarKelas':
            $stmt = $pdo->query("SELECT DISTINCT nama_kelas AS nama FROM kelas_master UNION SELECT DISTINCT kelas AS nama FROM siswa WHERE status_siswa='aktif' AND kelas IS NOT NULL AND kelas != '' ORDER BY 1 ASC");
            $kelases = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (empty($kelases)) $kelases = ['1A', '1B', '2A', '2B', '3A', '3B'];
            sendJson(['success' => true, 'data' => $kelases]);
            break;

        case 'getKelasMaster':
            $stmt = $pdo->query("
                SELECT km.id, km.nama_kelas AS nama, km.wali_kelas,
                       COALESCE(pg.nama_guru, km.wali_kelas) AS nama_wali
                FROM kelas_master km
                LEFT JOIN users u ON u.username = km.wali_kelas
                LEFT JOIN profil_guru pg ON pg.nip = u.nip
                ORDER BY km.nama_kelas ASC
            ");
            $rows = $stmt->fetchAll();
            if (empty($rows)) {
                $stmt2 = $pdo->query("SELECT DISTINCT kelas AS nama FROM siswa WHERE status_siswa='aktif' AND kelas IS NOT NULL AND kelas != '' ORDER BY kelas ASC");
                $rows2 = $stmt2->fetchAll();
                $idx = 1;
                $rows = array_map(function($r) use (&$idx) {
                    return ['id' => $idx, 'nama' => $r['nama'], 'rowIndex' => $idx++, 'wali_kelas' => null, 'nama_wali' => null];
                }, $rows2);
            } else {
                $idx = 1;
                $rows = array_map(function($r) use (&$idx) {
                    return [
                        'id'         => $r['id'],
                        'nama'       => $r['nama'],
                        'rowIndex'   => $idx++,
                        'wali_kelas' => $r['wali_kelas'],
                        'nama_wali'  => $r['nama_wali'],
                    ];
                }, $rows);
            }
            sendJson(['success' => true, 'data' => $rows]);
            break;

        case 'addKelas':
            $nama = trim($input['nama'] ?? $_POST['nama'] ?? '');
            if (!$nama) sendJson(['success' => false, 'message' => 'Nama kelas tidak boleh kosong']);
            $ins = $pdo->prepare("INSERT INTO kelas_master (nama_kelas) VALUES (?) ON DUPLICATE KEY UPDATE nama_kelas=VALUES(nama_kelas)");
            $ins->execute([$nama]);
            sendJson(['success' => true, 'message' => "Kelas '$nama' berhasil ditambahkan"]);
            break;

        case 'updateKelas':
            $id = $input['id'] ?? $input['rowIndex'] ?? null;
            $namaBaru = trim($input['namaBaru'] ?? $input['nama'] ?? '');
            if ($id && is_numeric($id) && $namaBaru) {
                $stmt = $pdo->prepare("SELECT nama_kelas FROM kelas_master WHERE id = ?");
                $stmt->execute([$id]);
                $oldName = $stmt->fetchColumn();
                if ($oldName) {
                    $upd1 = $pdo->prepare("UPDATE kelas_master SET nama_kelas = ? WHERE id = ?");
                    $upd1->execute([$namaBaru, $id]);
                    $upd2 = $pdo->prepare("UPDATE siswa SET kelas = ? WHERE kelas = ?");
                    $upd2->execute([$namaBaru, $oldName]);
                }
            }
            sendJson(['success' => true, 'message' => 'Nama kelas berhasil diperbarui']);
            break;

        case 'setWaliKelas':
            $sess = verifyToken($pdo, $input['token'] ?? '');
            if (!$sess) { sendUnauthorized('Sesi berakhir. Silakan login ulang.'); }
            if ($sess['role'] !== 'admin') {
                sendJson(['success' => false, 'message' => 'Akses ditolak. Hanya admin yang dapat mengatur wali kelas.']);
                break;
            }
            $namaKelas    = trim($input['namaKelas'] ?? '');
            $waliUsername = trim($input['waliUsername'] ?? '');
            if (!$namaKelas) {
                sendJson(['success' => false, 'message' => 'Nama kelas tidak boleh kosong']);
                break;
            }
            // Wali kelas hanya boleh diisi akun dengan role Guru/Wali Kelas —
            // bukan admin, kepala madrasah, bendahara, pencatat, dll.
            if ($waliUsername !== '') {
                $roleChk = $pdo->prepare("SELECT role FROM users WHERE username = ?");
                $roleChk->execute([$waliUsername]);
                $waliRole = $roleChk->fetchColumn();
                if (!in_array($waliRole, ['guru', 'walikelas'], true)) {
                    sendJson(['success' => false, 'message' => 'Wali kelas hanya bisa dipilih dari akun dengan role Guru.']);
                    break;
                }
            }
            // Cek kelas ada; jika belum ada di kelas_master (mis. hanya ada di tabel siswa),
            // auto-buat barisnya supaya wali kelas tetap bisa disimpan.
            $chk = $pdo->prepare("SELECT id FROM kelas_master WHERE nama_kelas = ?");
            $chk->execute([$namaKelas]);
            if (!$chk->fetch()) {
                $insKelas = $pdo->prepare("INSERT IGNORE INTO kelas_master (nama_kelas) VALUES (?)");
                $insKelas->execute([$namaKelas]);
                $chk2 = $pdo->prepare("SELECT id FROM kelas_master WHERE nama_kelas = ?");
                $chk2->execute([$namaKelas]);
                if (!$chk2->fetch()) {
                    sendJson(['success' => false, 'message' => "Kelas '$namaKelas' tidak ditemukan"]);
                    break;
                }
            }
            // Ambil wali kelas lama sebelum diubah
            $oldWaliStmt = $pdo->prepare("SELECT wali_kelas FROM kelas_master WHERE nama_kelas = ?");
            $oldWaliStmt->execute([$namaKelas]);
            $oldWali = $oldWaliStmt->fetchColumn();

            // Set atau clear wali kelas
            $waliVal = $waliUsername !== '' ? $waliUsername : null;
            $upd = $pdo->prepare("UPDATE kelas_master SET wali_kelas = ? WHERE nama_kelas = ?");
            $upd->execute([$waliVal, $namaKelas]);

            if ($waliUsername) {
                // PENTING: hanya set kelas_wali (homeroom) + role penanda walikelas.
                // Kolom `kelas` (kelas-kelas yang diajar mapel, via guru_mengajar)
                // TIDAK disentuh, supaya guru yang sekaligus jadi walikelas
                // tetap membawa semua kelas & mapel yang dia ajar.
                $curRoleStmt = $pdo->prepare("SELECT role FROM users WHERE username = ?");
                $curRoleStmt->execute([$waliUsername]);
                $curRole = $curRoleStmt->fetchColumn();
                $newRole = ($curRole === 'admin' || $curRole === 'bendahara' || $curRole === 'kepsek') ? $curRole : 'walikelas';
                $pdo->prepare("UPDATE users SET kelas_wali = ?, role = ? WHERE username = ?")
                    ->execute([$namaKelas, $newRole, $waliUsername]);
            }
            // Lepas status walikelas dari wali lama jika dia bukan wali di kelas lain manapun
            if ($oldWali && $oldWali !== $waliUsername) {
                $cekMasihWali = $pdo->prepare("SELECT COUNT(*) FROM kelas_master WHERE wali_kelas = ?");
                $cekMasihWali->execute([$oldWali]);
                if ((int)$cekMasihWali->fetchColumn() === 0) {
                    // Hanya lepas kelas_wali & turunkan role; kelas yang diajar (kolom kelas) dibiarkan apa adanya.
                    $pdo->prepare("UPDATE users SET role = 'guru', kelas_wali = NULL WHERE username = ? AND role = 'walikelas'")
                        ->execute([$oldWali]);
                }
            }
            $msg = $waliUsername
                ? "Wali kelas '$namaKelas' diatur ke '$waliUsername' (role diperbarui ke Wali Kelas)"
                : "Wali kelas '$namaKelas' berhasil dikosongkan";
            sendJson(['success' => true, 'message' => $msg]);
            break;

        case 'deleteKelas':
            $namaKelas = trim($input['namaKelas'] ?? $input['nama'] ?? '');
            $id = $input['id'] ?? null;

            // Resolve nama kelas dari id jika nama tidak dikirim
            if (!$namaKelas && $id) {
                $res = $pdo->prepare("SELECT nama_kelas FROM kelas_master WHERE id = ?");
                $res->execute([$id]);
                $row = $res->fetch();
                if ($row) $namaKelas = $row['nama_kelas'];
            }

            if ($namaKelas) {
                $pdo->prepare("DELETE FROM kelas_master WHERE nama_kelas = ?")->execute([$namaKelas]);
                // Hapus jadwal pelajaran kelas ini (data operasional, aman dihapus)
                $pdo->prepare("DELETE FROM jadwal WHERE kelas = ?")->execute([$namaKelas]);
                // Kosongkan wali_kelas di users yang mengacu ke kelas ini
                $pdo->prepare("UPDATE users SET kelas = NULL WHERE kelas = ?")->execute([$namaKelas]);
                // Catatan: absensi, nilai, prestasi siswa TIDAK dihapus — data historis
            } elseif ($id) {
                $pdo->prepare("DELETE FROM kelas_master WHERE id = ?")->execute([$id]);
            }
            sendJson(['success' => true, 'message' => 'Kelas berhasil dihapus']);
            break;

        case 'getDaftarMapel':
            $mapelSet = [];
            // Dari mapel_master
            $stmt = $pdo->query("SELECT DISTINCT nama_mapel FROM mapel_master WHERE nama_mapel IS NOT NULL AND nama_mapel != '' ORDER BY nama_mapel ASC");
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $m) {
                $m = trim($m);
                if ($m !== '') $mapelSet[$m] = true;
            }
            // Dari profil_guru.mata_pelajaran — bisa berisi koma-separated, harus di-split
            $stmt2 = $pdo->query("SELECT DISTINCT mata_pelajaran FROM profil_guru WHERE mata_pelajaran IS NOT NULL AND mata_pelajaran != ''");
            foreach ($stmt2->fetchAll(PDO::FETCH_COLUMN) as $raw) {
                foreach (explode(',', $raw) as $m) {
                    $m = trim($m);
                    if ($m !== '') $mapelSet[$m] = true;
                }
            }
            $mapels = array_keys($mapelSet);
            sort($mapels);
            if (empty($mapels)) $mapels = ['Al-Qur\'an', 'Fiqih', 'Aqidah Akhlak', 'Sejarah Kebudayaan Islam', 'Bahasa Arab'];
            sendJson(['success' => true, 'data' => $mapels]);
            break;

        case 'getMapelDariGuru':
            // Sinkron: ambil semua mapel dari mapel_master + mata_pelajaran guru (bisa multi, dipisah koma)
            $mapelSet = [];
            // Dari mapel_master
            $stmt = $pdo->query("SELECT DISTINCT nama_mapel FROM mapel_master WHERE nama_mapel IS NOT NULL AND nama_mapel != '' ORDER BY nama_mapel ASC");
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $m) {
                $mapelSet[trim($m)] = true;
            }
            // Dari profil_guru.mata_pelajaran (bisa berisi koma-separated)
            $stmt2 = $pdo->query("SELECT DISTINCT mata_pelajaran FROM profil_guru WHERE mata_pelajaran IS NOT NULL AND mata_pelajaran != ''");
            foreach ($stmt2->fetchAll(PDO::FETCH_COLUMN) as $raw) {
                foreach (explode(',', $raw) as $m) {
                    $m = trim($m);
                    if ($m !== '') $mapelSet[$m] = true;
                }
            }
            $result = array_keys($mapelSet);
            sort($result);
            if (empty($result)) $result = ['Al-Qur\'an', 'Fiqih', 'Aqidah Akhlak', 'Sejarah Kebudayaan Islam', 'Bahasa Arab'];
            sendJson($result);
            break;

        case 'getMapelMaster':
            $stmt = $pdo->query("SELECT id, nama_mapel AS nama FROM mapel_master ORDER BY nama_mapel ASC");
            $rows = $stmt->fetchAll();
            if (empty($rows)) {
                $stmt2 = $pdo->query("SELECT DISTINCT mata_pelajaran AS nama FROM profil_guru WHERE mata_pelajaran IS NOT NULL AND mata_pelajaran != '' ORDER BY mata_pelajaran ASC");
                $rows2 = $stmt2->fetchAll();
                $idx = 1;
                $rows = array_map(function($r) use (&$idx) {
                    return ['id' => $idx, 'nama' => $r['nama'], 'rowIndex' => $idx++];
                }, $rows2);
            } else {
                $idx = 1;
                $rows = array_map(function($r) use (&$idx) {
                    return ['id' => $r['id'], 'nama' => $r['nama'], 'rowIndex' => $idx++];
                }, $rows);
            }
            sendJson(['success' => true, 'data' => $rows]);
            break;

        case 'addMapel':
            $nama = trim($input['nama'] ?? $_POST['nama'] ?? '');
            if (!$nama) sendJson(['success' => false, 'message' => 'Nama mapel tidak boleh kosong']);
            $ins = $pdo->prepare("INSERT INTO mapel_master (nama_mapel) VALUES (?) ON DUPLICATE KEY UPDATE nama_mapel=VALUES(nama_mapel)");
            $ins->execute([$nama]);
            sendJson(['success' => true, 'message' => "Mapel '$nama' berhasil ditambahkan"]);
            break;

        case 'updateMapel':
            $id = $input['id'] ?? $input['rowIndex'] ?? null;
            $namaBaru = trim($input['namaBaru'] ?? $input['nama'] ?? '');
            if ($id && is_numeric($id) && $namaBaru) {
                $upd = $pdo->prepare("UPDATE mapel_master SET nama_mapel = ? WHERE id = ?");
                $upd->execute([$namaBaru, $id]);
            }
            sendJson(['success' => true, 'message' => 'Mapel berhasil diperbarui']);
            break;

        case 'deleteMapel':
            $namaMapel = trim($input['namaMapel'] ?? $input['nama'] ?? '');
            if ($namaMapel) {
                $del = $pdo->prepare("DELETE FROM mapel_master WHERE nama_mapel = ?");
                $del->execute([$namaMapel]);
            }
            sendJson(['success' => true, 'message' => 'Mapel berhasil dihapus']);
            break;

        // ==========================================
        // 5. ABSENSI SISWA, GURU, HARI LIBUR & KONFIGURASI
        // ==========================================
        case 'getJadwalList':
            $kelasFilter = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][0] ?? null;
            $sql = "SELECT * FROM jadwal";
            $params = [];
            if ($kelasFilter && $kelasFilter !== 'SEMUA') {
                $sql .= " WHERE kelas = ?";
                $params[] = $kelasFilter;
            }
            $sql .= " ORDER BY FIELD(hari, 'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'), jam_ke ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                $waktuArr = array_map('trim', explode('-', $r['waktu'] ?? ''));
                return [
                    'id' => $r['id'],
                    'rowIndex' => $r['id'],
                    'hari' => $r['hari'],
                    'kelas' => $r['kelas'],
                    'mapel' => $r['mata_pelajaran'],
                    'mataPelajaran' => $r['mata_pelajaran'],
                    'pengajar' => $r['nama_guru'],
                    'namaGuru' => $r['nama_guru'],
                    'jamKe' => $r['jam_ke'],
                    'waktu' => $r['waktu'],
                    'jam_mulai' => $waktuArr[0] ?? $r['waktu'] ?? '-',
                    'jam_selesai' => $waktuArr[1] ?? '-'
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'getJadwalHariIni':
        case 'getJadwalByHari':
            $kelasFilter = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][0] ?? null;
            // 'getJadwalHariIni' is called without an explicit day, so it always means "today"
            // (server time), matching the label. 'getJadwalByHari' accepts an explicit day
            // (e.g. from a date picker) and falls back to today if none is given.
            $hariNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
            $hariFilter = $_GET['hari'] ?? $input['hari'] ?? $input['args'][1] ?? null;
            if (!$hariFilter) {
                $hariFilter = $hariNames[date('w')];
            }
            $sql = "SELECT * FROM jadwal WHERE hari = ?";
            $params = [$hariFilter];
            if ($kelasFilter && $kelasFilter !== 'SEMUA') {
                [$kelasJadwalClause, $kelasJadwalParams] = buildKelasInClause($kelasFilter);
                $sql .= $kelasJadwalClause;
                $params = array_merge($params, $kelasJadwalParams);
            }
            $sql .= " ORDER BY jam_ke ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                $waktuArr = array_map('trim', explode('-', $r['waktu'] ?? ''));
                return [
                    'id' => $r['id'],
                    'rowIndex' => $r['id'],
                    'hari' => $r['hari'],
                    'kelas' => $r['kelas'],
                    'mapel' => $r['mata_pelajaran'],
                    'mataPelajaran' => $r['mata_pelajaran'],
                    'pengajar' => $r['nama_guru'],
                    'namaGuru' => $r['nama_guru'],
                    'jamKe' => $r['jam_ke'],
                    'waktu' => $r['waktu'],
                    'jam_mulai' => $waktuArr[0] ?? $r['waktu'] ?? '-',
                    'jam_selesai' => $waktuArr[1] ?? '-'
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data, 'hari' => $hariFilter]);
            break;

        case 'addJadwal':
            $j = $input['jadwalData'] ?? $input['args'][1] ?? $input['args'][0] ?? $input;
            $hari = $j['hari'] ?? 'Senin';
            $kelas = $j['kelas'] ?? '';
            $mapel = $j['mapel'] ?? $j['mata_pelajaran'] ?? $j['mataPelajaran'] ?? '';
            $guru = trim($j['pengajar'] ?? $j['nama_guru'] ?? $j['namaGuru'] ?? '');
            $jamMulai = $j['jam_mulai'] ?? $j['jamMulai'] ?? '';
            $jamSelesai = $j['jam_selesai'] ?? $j['jamSelesai'] ?? '';
            $waktu = $j['waktu'] ?? (!empty($jamMulai) && !empty($jamSelesai) ? "$jamMulai - $jamSelesai" : $jamMulai);
            $jamKe = $j['jamKe'] ?? $j['jam_ke'] ?? 1;

            $ins = $pdo->prepare("INSERT INTO jadwal (hari, kelas, mata_pelajaran, jam_ke, waktu, nama_guru) VALUES (?, ?, ?, ?, ?, ?)");
            $ins->execute([$hari, $kelas, $mapel, $jamKe, $waktu, $guru]);
            // Sinkron: set role=guru pada user yang namanya cocok di profil_guru, jika belum walikelas/admin
            if ($guru !== '') {
                $pdo->prepare("
                    UPDATE users u
                    JOIN profil_guru pg ON TRIM(pg.nama_guru) = ?
                    SET u.role = 'guru'
                    WHERE (u.nip = pg.nip OR u.username = pg.nip)
                      AND u.role NOT IN ('walikelas','admin','kepsek','wakel','pencatat','bendahara')
                ")->execute([$guru]);
            }
            sendJson(['success' => true, 'message' => 'Jadwal ditambahkan']);
            break;

        case 'updateJadwal':
            $id = $_GET['id'] ?? $input['id'] ?? $input['rowIndex'] ?? $input['args'][1] ?? $input['args'][0] ?? null;
            $j = $input['jadwalData'] ?? $input['args'][2] ?? $input['args'][1] ?? $input;
            $hari = $j['hari'] ?? 'Senin';
            $kelas = $j['kelas'] ?? '';
            $mapel = $j['mapel'] ?? $j['mata_pelajaran'] ?? $j['mataPelajaran'] ?? '';
            $guru = trim($j['pengajar'] ?? $j['nama_guru'] ?? $j['namaGuru'] ?? '');
            $jamMulai = $j['jam_mulai'] ?? $j['jamMulai'] ?? '';
            $jamSelesai = $j['jam_selesai'] ?? $j['jamSelesai'] ?? '';
            $waktu = $j['waktu'] ?? (!empty($jamMulai) && !empty($jamSelesai) ? "$jamMulai - $jamSelesai" : $jamMulai);
            $jamKe = $j['jamKe'] ?? $j['jam_ke'] ?? 1;

            $upd = $pdo->prepare("UPDATE jadwal SET hari=?, kelas=?, mata_pelajaran=?, jam_ke=?, waktu=?, nama_guru=? WHERE id=?");
            $upd->execute([$hari, $kelas, $mapel, $jamKe, $waktu, $guru, $id]);
            // Sinkron role guru sama seperti addJadwal
            if ($guru !== '') {
                $pdo->prepare("
                    UPDATE users u
                    JOIN profil_guru pg ON TRIM(pg.nama_guru) = ?
                    SET u.role = 'guru'
                    WHERE (u.nip = pg.nip OR u.username = pg.nip)
                      AND u.role NOT IN ('walikelas','admin','kepsek','wakel','pencatat','bendahara')
                ")->execute([$guru]);
            }
            sendJson(['success' => true, 'message' => 'Jadwal diperbarui']);
            break;

        case 'deleteMultipleJadwal':
            $ids = $input['rows'] ?? $input['idArray'] ?? $input['args'][1] ?? $input['args'][0] ?? [];
            if (!empty($ids)) {
                $inQuery = implode(',', array_fill(0, count($ids), '?'));
                $del = $pdo->prepare("DELETE FROM jadwal WHERE id IN ($inQuery)");
                $del->execute($ids);
            }
            sendJson(['success' => true, 'message' => 'Jadwal terhapus']);
            break;

        case 'bersihkanDuplikatJadwal':
            $pdo->exec("
                DELETE j1 FROM jadwal j1
                INNER JOIN jadwal j2 
                WHERE j1.id > j2.id 
                  AND j1.hari = j2.hari 
                  AND j1.kelas = j2.kelas 
                  AND j1.mata_pelajaran = j2.mata_pelajaran 
                  AND j1.nama_guru = j2.nama_guru 
                  AND j1.waktu = j2.waktu
            ");
            sendJson(['success' => true, 'message' => 'Duplikat jadwal dibersihkan']);
            break;

        case 'importJadwalBulk':
            $list = $input['jadwalList'] ?? $input['data'] ?? $input['args'][1] ?? $input['args'][0] ?? [];
            $added = 0;
            if (is_array($list)) {
                $ins = $pdo->prepare("INSERT INTO jadwal (hari, kelas, mata_pelajaran, jam_ke, waktu, nama_guru) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($list as $item) {
                    $hari = $item['hari'] ?? '';
                    $kelas = $item['kelas'] ?? '';
                    $mapel = $item['mapel'] ?? $item['mata_pelajaran'] ?? $item['mataPelajaran'] ?? '';
                    $guru = $item['pengajar'] ?? $item['nama_guru'] ?? $item['namaGuru'] ?? '';
                    $jamMulai = $item['jam_mulai'] ?? $item['jamMulai'] ?? '';
                    $jamSelesai = $item['jam_selesai'] ?? $item['jamSelesai'] ?? '';
                    $waktu = $item['waktu'] ?? (!empty($jamMulai) && !empty($jamSelesai) ? "$jamMulai - $jamSelesai" : $jamMulai);
                    $jamKe = $item['jamKe'] ?? $item['jam_ke'] ?? 1;
                    if ($hari && $mapel) {
                        $ins->execute([$hari, $kelas, $mapel, $jamKe, $waktu, $guru]);
                        $added++;
                    }
                }
                // Sinkron massal: set role=guru untuk semua guru pengajar di jadwal yang ada akun
                $pdo->exec("
                    UPDATE users u
                    JOIN profil_guru pg ON (u.nip = pg.nip OR u.username = pg.nip)
                    JOIN (SELECT DISTINCT nama_guru FROM jadwal WHERE nama_guru IS NOT NULL AND nama_guru != '') j
                         ON TRIM(pg.nama_guru) = TRIM(j.nama_guru)
                    SET u.role = 'guru'
                    WHERE u.role NOT IN ('walikelas','admin','kepsek','wakel','pencatat','bendahara')
                ");
            }
            sendJson(['success' => true, 'added' => $added, 'message' => "Berhasil mengimport $added jadwal"]);
            break;

}