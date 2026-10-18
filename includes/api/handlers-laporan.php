<?php
switch ($action) {
        case 'getMonthlyReportData':
            // PERBAIKAN KEAMANAN: hanya user terautentikasi
            $sessRk = requireAuth($pdo, $input);
            $bulan = intval($_GET['bulan'] ?? $input['bulan'] ?? $input['args'][1] ?? date('m'));
            if ($bulan < 1) $bulan = 1;
            if ($bulan > 12) $bulan = 12;
            $tahun = intval($_GET['tahun'] ?? $input['tahun'] ?? $input['args'][2] ?? date('Y'));
            $kelas = $_GET['kelas'] ?? $input['kelas'] ?? $input['args'][3] ?? null;
            $mapelFilterInput = $_GET['mapel'] ?? $input['mapel'] ?? $input['args'][4] ?? null;
            // Filter kelas KHUSUS tab guru (Rekapitulasi Bulanan → tab Guru):
            // membatasi daftar guru pada yang mengajar di kelas tsb (via jadwal).
            $kelasGuruFilter = $_GET['kelas_guru'] ?? $input['kelas_guru'] ?? $input['args'][5] ?? null;

            // PEMBATASAN AKSES: guru pengajar hanya melihat rekap kelas+mapel yang dia ampu,
            // walikelas hanya kelas yang diwalikan (mapel bebas). Apapun yang dikirim client,
            // server paksa sesuai penugasan.
            if (in_array($sessRk['role'], ['guru', 'walikelas'], true)) {
                $aksesRk = guruAksesKelasMapel($pdo, $sessRk);
                if (empty($aksesRk)) {
                    $numDaysEmpty = date('t', strtotime(sprintf('%04d-%02d-01', $tahun, $bulan)));
                    sendJson(['success' => true, 'data' => [
                        'daysInMonth' => (int)$numDaysEmpty,
                        'mapelList' => [],
                        'students' => [],
                        'teachers' => []
                    ]]);
                }
                $kelas = implode(',', array_keys($aksesRk));
                $mapelAksesRk = [];
                foreach ($aksesRk as $msRk) {
                    foreach ((array)$msRk as $mmRk) { if ($mmRk !== '*' && trim($mmRk) !== '') $mapelAksesRk[] = trim($mmRk); }
                }
                if (!empty($mapelAksesRk)) {
                    $mfRk = trim((string)($mapelFilterInput ?? ''));
                    $mfOkRk = false;
                    foreach ($mapelAksesRk as $mmRk) {
                        if (mb_strtolower($mmRk) === mb_strtolower($mfRk)) { $mfOkRk = true; break; }
                    }
                    if (!$mfOkRk) $mapelFilterInput = $mapelAksesRk[0]; // paksa mapel amanan pertama
                } else {
                    $mapelFilterInput = null; // walikelas: bebas mapel
                }
            }

            $numDays = date('t', strtotime(sprintf('%04d-%02d-01', $tahun, $bulan)));
            $startDate = sprintf('%04d-%02d-01', $tahun, $bulan);
            $endDate = sprintf('%04d-%02d-%02d', $tahun, $bulan, $numDays);
            $today = date('Y-m-d');

            // Fetch Hari Libur dari Database
            $hlStmt = $pdo->query("SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl FROM hari_libur");
            $hariLiburDb = $hlStmt->fetchAll(PDO::FETCH_COLUMN);

            // Fetch Konfigurasi Rutinan (Minggu)
            $cfgStmt = $pdo->query("SELECT value_name FROM konfigurasi WHERE key_name = 'jadwal_harian'");
            $jadwalHarianJson = $cfgStmt->fetchColumn();
            $jadwalHarian = $jadwalHarianJson ? json_decode($jadwalHarianJson, true) : [];

            // Safe check for mata_pelajaran column
            $hasMapelCol = false;
            try {
                $cols = $pdo->query("DESCRIBE absensi")->fetchAll(PDO::FETCH_COLUMN);
                if (in_array('mata_pelajaran', $cols)) $hasMapelCol = true;
            } catch(Exception $e) {}

            // Get unique mapel from absensi table first for filtering logic
            $mapelSet = [];
            try {
                $checkMapelSql = $hasMapelCol
                    ? "SELECT DISTINCT mata_pelajaran FROM absensi WHERE tanggal BETWEEN ? AND ?"
                    : "SELECT DISTINCT '' as mata_pelajaran FROM absensi WHERE 1=0";
                $msStmt = $pdo->prepare($checkMapelSql);
                if ($hasMapelCol) $msStmt->execute([$startDate, $endDate]);
                else $msStmt->execute();
                while($mRow = $msStmt->fetchColumn()) {
                    $mTrim = trim($mRow);
                    if ($mTrim !== '') $mapelSet[] = $mTrim;
                }
            } catch(Exception $e) {}

            // (untuk guru/walikelas, $mapelFilterInput sudah dipaksa server di atas)
            if (!isset($mapelFilterInput)) $mapelFilterInput = $_GET['mapel'] ?? $input['mapel'] ?? null;

            // Batch Query Absensi Bulan Ini (Siswa)
            $sqlAbsen = $hasMapelCol
                ? "SELECT nisn, nama, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, status, mata_pelajaran FROM absensi WHERE tanggal BETWEEN ? AND ?"
                : "SELECT nisn, nama, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, status, '' as mata_pelajaran FROM absensi WHERE tanggal BETWEEN ? AND ?";
            $paramsAbsen = [$startDate, $endDate];
            // Mendukung multi-kelas: guru dengan >1 kelas kirim "7A,8B"
            [$kelasAbsenClause, $kelasAbsenParams] = buildKelasInClause($kelas);
            $sqlAbsen .= $kelasAbsenClause;
            $paramsAbsen = array_merge($paramsAbsen, $kelasAbsenParams);
            $abStmt = $pdo->prepare($sqlAbsen);
            $abStmt->execute($paramsAbsen);
            $absenRows = $abStmt->fetchAll();

            // Map: nisn -> tanggal -> mapel -> status
            $absensiMap = [];
            $absensiNameMap = [];
            // $mapelSet already collected above via distinct query for filter
            foreach ($absenRows as $ar) {
                $mp = trim($ar['mata_pelajaran'] ?? '');
                $mpKey = $mp === '' ? '(umum)' : $mp;
                if (!empty($ar['nisn'])) {
                    if (!isset($absensiMap[trim($ar['nisn'])])) $absensiMap[trim($ar['nisn'])] = [];
                    $absensiMap[trim($ar['nisn'])][$ar['tgl']][$mpKey] = $ar['status'];
                }
                if (!empty($ar['nama'])) {
                    $nm = mb_strtolower(trim($ar['nama']));
                    if (!isset($absensiNameMap[$nm])) $absensiNameMap[$nm] = [];
                    $absensiNameMap[$nm][$ar['tgl']][$mpKey] = $ar['status'];
                }
            }
            $mapelSet = array_unique($mapelSet);

            // Sync perizinan_siswa yang disetujui ke Rekap Bulanan Siswa
            // PRIORITY: absensi record (manual entry) always wins over perizinan.
            // Perizinan only fills gaps where there is NO absensi record for that day.
            try {
                $hasPzMapelCol = false;
                try {
                    $pzCols = $pdo->query("DESCRIBE perizinan_siswa")->fetchAll(PDO::FETCH_COLUMN);
                    if (in_array('mata_pelajaran', $pzCols)) $hasPzMapelCol = true;
                } catch(Exception $e) {}

                $pzSql = $hasPzMapelCol
                    ? "SELECT nisn, nama_siswa, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, jenis, mata_pelajaran FROM perizinan_siswa WHERE (status_izin = 'Disetujui' OR status_izin LIKE '%Setujui%') AND tanggal BETWEEN ? AND ?"
                    : "SELECT nisn, nama_siswa, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, jenis, '' as mata_pelajaran FROM perizinan_siswa WHERE (status_izin = 'Disetujui' OR status_izin LIKE '%Setujui%') AND tanggal BETWEEN ? AND ?";

                $pzSiswaStmt = $pdo->prepare($pzSql);
                $pzSiswaStmt->execute([$startDate, $endDate]);
                $pzSiswaRows = $pzSiswaStmt->fetchAll();
                foreach ($pzSiswaRows as $pz) {
                    $pzStatus = (mb_strtolower(trim($pz['jenis'])) === 'sakit') ? 'Sakit' : 'Izin';
                    $pzNisn = trim($pz['nisn'] ?? '');
                    $pzNama = mb_strtolower(trim($pz['nama_siswa'] ?? ''));
                    $pzMp   = trim($pz['mata_pelajaran'] ?? '');
                    $pzMpKey = $pzMp === '' ? '(umum)' : $pzMp;

                    if (!empty($pzNisn)) {
                        if (!isset($absensiMap[$pzNisn][$pz['tgl']][$pzMpKey])) {
                            $absensiMap[$pzNisn][$pz['tgl']][$pzMpKey] = $pzStatus;
                        }
                    }
                    if (!empty($pzNama)) {
                        if (!isset($absensiNameMap[$pzNama][$pz['tgl']][$pzMpKey])) {
                            $absensiNameMap[$pzNama][$pz['tgl']][$pzMpKey] = $pzStatus;
                        }
                    }
                }
            } catch(Exception $e) {}

            // Load jadwal pelajaran per KELAS: untuk setiap kelas, hari apa saja ada pelajaran?
            // kelasJadwalDays[kelas_lowercase] = [1,3,5, ...] (set of dayOfWeek N values)
            // Jika kelas tidak ada di jadwal → tidak pernah auto-Alpa (kosong/blank)
            if (!isset($hariToN)) {
                $hariToN = [
                    'senin'  => 1, 'selasa' => 2, 'rabu'   => 3,
                    'kamis'  => 4, 'jumat'  => 5, 'sabtu'  => 6, 'minggu' => 7
                ];
            }
            $kelasJadwalDays = [];
            try {
                $jadwalKelasRows = $pdo->query("SELECT DISTINCT LOWER(TRIM(kelas)) as kls, LOWER(TRIM(hari)) as hari FROM jadwal WHERE kelas IS NOT NULL AND kelas != ''")->fetchAll();
                foreach ($jadwalKelasRows as $jkr) {
                    $kls = $jkr['kls'];
                    $h   = $jkr['hari'];
                    if (!isset($kelasJadwalDays[$kls])) $kelasJadwalDays[$kls] = [];
                    if (isset($hariToN[$h])) $kelasJadwalDays[$kls][] = $hariToN[$h];
                }
            } catch(Exception $e) {}

            // SINKRON JADWAL PELAJARAN: daftar mapel & mapel per kelas diambil
            // langsung dari tabel jadwal (menu Jadwal Pelajaran), bukan hanya
            // dari catatan absensi. Sehingga filter mapel & baris rekap selalu
            // konsisten dengan apa yang dijadwalkan.
            $allJadwalMapels = [];
            $kelasJadwalMapels = [];
            try {
                $jmRows = $pdo->query("SELECT DISTINCT LOWER(TRIM(kelas)) as kls, TRIM(mata_pelajaran) as mp FROM jadwal WHERE mata_pelajaran IS NOT NULL AND TRIM(mata_pelajaran) != ''")->fetchAll();
                foreach ($jmRows as $jr) {
                    $mp = trim($jr['mp']);
                    if ($mp === '') continue;
                    $allJadwalMapels[$mp] = true;
                    if (!isset($kelasJadwalMapels[$jr['kls']])) $kelasJadwalMapels[$jr['kls']] = [];
                    if (!in_array($mp, $kelasJadwalMapels[$jr['kls']])) $kelasJadwalMapels[$jr['kls']][] = $mp;
                }
            } catch(Exception $e) {}

            // Kanonikalisasi filter mapel: samakan ejaan dengan daftar jadwal
            // (case-insensitive) agar filter selalu cocok.
            $mapelFilterCanonical = null;
            if ($mapelFilterInput !== null && trim((string)$mapelFilterInput) !== '') {
                $mfLower = mb_strtolower(trim((string)$mapelFilterInput));
                foreach (array_keys($allJadwalMapels) as $jm) {
                    if (mb_strtolower($jm) === $mfLower) { $mapelFilterCanonical = $jm; break; }
                }
                if ($mapelFilterCanonical === null) $mapelFilterCanonical = trim((string)$mapelFilterInput);
            }

            // Siswa List
            $sqlSiswa = "SELECT * FROM siswa WHERE status_siswa='aktif'";
            $paramsSiswa = [];
            [$kelasSiswaClause, $kelasSiswaParams] = buildKelasInClause($kelas);
            $sqlSiswa .= $kelasSiswaClause;
            $paramsSiswa = array_merge($paramsSiswa, $kelasSiswaParams);
            $sqlSiswa .= " ORDER BY kelas ASC, nama ASC";
            $sStmt = $pdo->prepare($sqlSiswa);
            $sStmt->execute($paramsSiswa);
            $siswaRows = $sStmt->fetchAll();

            $students = [];
            foreach ($siswaRows as $s) {
                $sNisn = trim($s['nisn'] ?? '');
                $sNamaClean = mb_strtolower(trim($s['nama'] ?? ''));
                $sKelasClean = mb_strtolower(trim($s['kelas'] ?? ''));
                $siswaDaysWithClass = $kelasJadwalDays[$sKelasClean] ?? null;

                $sAbsences = $absensiMap[$sNisn] ?? $absensiNameMap[$sNamaClean] ?? [];

                // Lookup absensi per mapel (case-insensitive terhadap nama mapel)
                $absByMapel = [];
                $absMapelNames = []; // lower => nama asli dari catatan absensi
                $tglAdaAbsenEksplisit = []; // tanggal yang punya catatan mapel eksplisit
                foreach ($sAbsences as $tgl => $mps) {
                    foreach ($mps as $mp => $st) {
                        if ($mp === '(umum)') continue;
                        $k = mb_strtolower($mp);
                        if (!isset($absByMapel[$k])) { $absByMapel[$k] = []; $absMapelNames[$k] = $mp; }
                        $absByMapel[$k][$tgl] = $st;
                        $tglAdaAbsenEksplisit[$tgl] = true;
                    }
                }

                // MODE RINGAN (anti-lag):
                // - Jika filter mapel aktif → hanya 1 baris mapel itu per siswa
                //   (roster lengkap, termasuk yang belum punya catatan absensi).
                // - Tanpa filter → baris 'Umum' + hanya mapel yang PUNYA catatan
                //   absensi (bukan semua mapel jadwal) agar payload tetap kecil.
                if ($mapelFilterCanonical !== null) {
                    $studentMapels = [$mapelFilterCanonical];
                } else {
                    $studentMapels = ['(umum)'];
                    $seenLower = ['(umum)' => true];
                    foreach ($absByMapel as $kl => $_) {
                        if (!isset($seenLower[$kl])) { $seenLower[$kl] = true; $studentMapels[] = $absMapelNames[$kl]; }
                    }
                }

                foreach ($studentMapels as $currentMp) {
                    $dailyCodes = [];
                    $hCount = 0; $sCount = 0; $iCount = 0; $aCount = 0; $holidayCount = 0;

                    for ($d = 1; $d <= $numDays; $d++) {
                        $tglStr = sprintf('%04d-%02d-%02d', $tahun, $bulan, $d);
                        $dayOfWeek = (int)date('N', strtotime($tglStr));

                        $isLibur = in_array($tglStr, $hariLiburDb);
                        if (!$isLibur && isset($jadwalHarian[(string)$dayOfWeek]) && !empty($jadwalHarian[(string)$dayOfWeek]['libur'])) {
                            $isLibur = true;
                        }
                        if (!$isLibur && $dayOfWeek == 7 && (!isset($jadwalHarian['7']) || !empty($jadwalHarian['7']['libur']))) {
                            $isLibur = true;
                        }

                        // Get status for this specific mapel on this day (lookup case-insensitive)
                        if ($currentMp === '(umum)') {
                            $status = $sAbsences[$tglStr]['(umum)'] ?? null;
                        } else {
                            $status = $absByMapel[mb_strtolower($currentMp)][$tglStr] ?? null;
                        }

                        $code = '';
                        if ($status === 'Hadir') { $code = 'H'; $hCount++; }
                        elseif ($status === 'Sakit') { $code = 'S'; $sCount++; }
                        elseif ($status === 'Izin') { $code = 'I'; $iCount++; }
                        elseif ($status === 'Alpa' || $status === 'Alfa') { $code = 'A'; $aCount++; }
                        elseif ($isLibur) { $code = 'L'; $holidayCount++; }
                        elseif ($status === null && !$isLibur && $tglStr < $today) {
                            if ($currentMp === '(umum)') {
                                // JANGAN auto-Alpa jika hari itu siswa sudah punya
                                // catatan absensi mapel eksplisit (mis. H Matematika),
                                // supaya rekap gabungan sinkron dengan rekap guru.
                                if (!isset($tglAdaAbsenEksplisit[$tglStr]) && $siswaDaysWithClass !== null && in_array($dayOfWeek, $siswaDaysWithClass)) {
                                    $code = 'A'; $aCount++;
                                }
                            }
                        }

                        $dailyCodes[] = [
                            'date'      => $d,
                            'code'      => $code,
                            'isHoliday' => $isLibur
                        ];
                    }

                    $effectiveDays = $numDays - $holidayCount;
                    $percent = ($effectiveDays > 0) ? round(($hCount / $effectiveDays) * 100) : 0;

                    $students[] = [
                        'nisn' => $s['nisn'],
                        'nama' => $s['nama'],
                        'kelas' => $s['kelas'],
                        'mapel' => $currentMp === '(umum)' ? '' : $currentMp,
                        'dailyCodes' => $dailyCodes,
                        'stats' => [
                            'h' => $hCount,
                            's' => $sCount,
                            'i' => $iCount,
                            'a' => $aCount,
                            'percent' => $percent
                        ]
                    ];
                }
            }

            // Batch Query Absensi Guru
            $hasAbsGuruMapel = false;
            try {
                $agCols = $pdo->query("DESCRIBE absensi_guru")->fetchAll(PDO::FETCH_COLUMN);
                if (in_array('mata_pelajaran', $agCols)) $hasAbsGuruMapel = true;
            } catch(Exception $e) {}

            $agSql = $hasAbsGuruMapel
                ? "SELECT nip, nama_guru, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, status, mata_pelajaran FROM absensi_guru WHERE tanggal BETWEEN ? AND ?"
                : "SELECT nip, nama_guru, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, status, '' as mata_pelajaran FROM absensi_guru WHERE tanggal BETWEEN ? AND ?";

            $absenGuruStmt = $pdo->prepare($agSql);
            $absenGuruStmt->execute([$startDate, $endDate]);
            $absenGuruRows = $absenGuruStmt->fetchAll();
            $absensiGuruMap = [];
            $absensiGuruNameMap = [];
            foreach ($absenGuruRows as $r) {
                $mp = trim($r['mata_pelajaran'] ?? '');
                if ($mp !== '') $mapelSet[] = $mp;
                $mpKey = $mp === '' ? '(umum)' : $mp;
                if (!empty($r['nip'])) {
                    if (!isset($absensiGuruMap[trim($r['nip'])])) $absensiGuruMap[trim($r['nip'])] = [];
                    $absensiGuruMap[trim($r['nip'])][$r['tgl']][$mpKey] = $r['status'];
                }
                if (!empty($r['nama_guru'])) {
                    $nm = mb_strtolower(trim($r['nama_guru']));
                    if (!isset($absensiGuruNameMap[$nm])) $absensiGuruNameMap[$nm] = [];
                    $absensiGuruNameMap[$nm][$r['tgl']][$mpKey] = $r['status'];
                }
            }

            // Sync perizinan_guru yang disetujui ke Rekap Bulanan Guru
            // PRIORITY: absensi_guru record always wins over perizinan (gap-fill only).
            try {
                $hasPzGuruMapel = false;
                try {
                    $pzgCols = $pdo->query("DESCRIBE perizinan_guru")->fetchAll(PDO::FETCH_COLUMN);
                    if (in_array('mata_pelajaran', $pzgCols)) $hasPzGuruMapel = true;
                } catch(Exception $e) {}

                $pzgSql = $hasPzGuruMapel
                    ? "SELECT nip, nama_guru, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, jenis, mata_pelajaran FROM perizinan_guru WHERE (status = 'Disetujui' OR status LIKE '%Setujui%') AND tanggal BETWEEN ? AND ?"
                    : "SELECT nip, nama_guru, DATE_FORMAT(tanggal, '%Y-%m-%d') as tgl, jenis, '' as mata_pelajaran FROM perizinan_guru WHERE (status = 'Disetujui' OR status LIKE '%Setujui%') AND tanggal BETWEEN ? AND ?";

                $pzGuruStmt = $pdo->prepare($pzgSql);
                $pzGuruStmt->execute([$startDate, $endDate]);
                $pzGuruRows = $pzGuruStmt->fetchAll();
                foreach ($pzGuruRows as $pzG) {
                    $pzGStatus = (mb_strtolower(trim($pzG['jenis'])) === 'sakit') ? 'Sakit' : 'Izin';
                    $pzGNip  = trim($pzG['nip'] ?? '');
                    $pzGNama = mb_strtolower(trim($pzG['nama_guru'] ?? ''));
                    $pzGMp   = trim($pzG['mata_pelajaran'] ?? '');
                    $pzGMpKey = $pzGMp === '' ? '(umum)' : $pzGMp;

                    if (!empty($pzGNip)) {
                        if (!isset($absensiGuruMap[$pzGNip][$pzG['tgl']][$pzGMpKey])) {
                            $absensiGuruMap[$pzGNip][$pzG['tgl']][$pzGMpKey] = $pzGStatus;
                        }
                    }
                    if (!empty($pzGNama)) {
                        if (!isset($absensiGuruNameMap[$pzGNama][$pzG['tgl']][$pzGMpKey])) {
                            $absensiGuruNameMap[$pzGNama][$pzG['tgl']][$pzGMpKey] = $pzGStatus;
                        }
                    }
                }
            } catch(Exception $e) {}

            // Query Guru
            $guruRows = $pdo->query("SELECT * FROM profil_guru ORDER BY nama_guru ASC")->fetchAll();
            if (empty($guruRows)) {
                $guruRows = $pdo->query("SELECT username as nip, username as nama_guru, kelas as mata_pelajaran FROM users WHERE role = 'guru'")->fetchAll();
            }

            // FILTER KELAS TAB GURU (admin): hanya guru yang mengajar di kelas
            // terpilih menurut tabel jadwal. null/'' = semua guru.
            $guruNamaKelasSet = null;
            if (!in_array($sessRk['role'], ['guru', 'walikelas'], true) && $kelasGuruFilter !== null && trim((string)$kelasGuruFilter) !== '') {
                try {
                    [$kgClause, $kgParams] = buildKelasInClause(trim((string)$kelasGuruFilter));
                    $kgStmt = $pdo->prepare("SELECT DISTINCT LOWER(TRIM(nama_guru)) as ng FROM jadwal WHERE nama_guru IS NOT NULL AND nama_guru != ''" . $kgClause);
                    $kgStmt->execute($kgParams);
                    $guruNamaKelasSet = [];
                    foreach ($kgStmt->fetchAll(PDO::FETCH_COLUMN) as $ngRk) {
                        if ($ngRk !== '' && !in_array($ngRk, $guruNamaKelasSet, true)) $guruNamaKelasSet[] = $ngRk;
                    }
                } catch(Exception $e) { $guruNamaKelasSet = null; }
            }

            // Load jadwal pelajaran: for each guru (by nama_guru), which Indonesian day names do they teach?
            $hariToN = [
                'senin'  => 1, 'selasa' => 2, 'rabu'   => 3,
                'kamis'  => 4, 'jumat'  => 5, 'sabtu'  => 6, 'minggu' => 7
            ];
            $guruJadwalDays = [];
            // FALLBACK MAPEL GURU #1 (paling otoritatif): penugasan resmi kelas+mapel
            // dari tabel guru_mengajar (menu "Data Guru" → assign kelas & mapel).
            // key = nip (konsisten dengan users.username, lihat helpers.php).
            $guruMengajarMapels = [];
            try {
                $gmRows = $pdo->query("SELECT nip, TRIM(mata_pelajaran) as mp FROM guru_mengajar WHERE mata_pelajaran IS NOT NULL AND TRIM(mata_pelajaran) != ''")->fetchAll();
                foreach ($gmRows as $gm) {
                    $gNip = trim($gm['nip'] ?? '');
                    $gMp  = trim($gm['mp'] ?? '');
                    if ($gNip === '' || $gMp === '') continue;
                    if (!isset($guruMengajarMapels[$gNip])) $guruMengajarMapels[$gNip] = [];
                    if (!in_array($gMp, $guruMengajarMapels[$gNip], true)) $guruMengajarMapels[$gNip][] = $gMp;
                }
            } catch(Exception $e) {}

            // FALLBACK MAPEL GURU #2: mapel yang diampu guru menurut Jadwal Pelajaran
            // (nama_guru -> daftar mata_pelajaran, urutan kemunculan asli dipertahankan).
            // Dipakai saat profil_guru, guru_mengajar, & catatan absensi sama sekali
            // tidak punya info mapel.
            $guruJadwalMapels = [];
            try {
                $jadwalRows = $pdo->query("SELECT DISTINCT LOWER(TRIM(nama_guru)) as ng, LOWER(TRIM(hari)) as hari, TRIM(mata_pelajaran) as mp FROM jadwal WHERE nama_guru IS NOT NULL AND nama_guru != ''")->fetchAll();
                foreach ($jadwalRows as $jr) {
                    $ng = $jr['ng'];
                    $h  = $jr['hari'];
                    if (!isset($guruJadwalDays[$ng])) $guruJadwalDays[$ng] = [];
                    if (isset($hariToN[$h])) {
                        $guruJadwalDays[$ng][] = $hariToN[$h];
                    }
                    $mpJ = trim($jr['mp'] ?? '');
                    if ($mpJ !== '') {
                        if (!isset($guruJadwalMapels[$ng])) $guruJadwalMapels[$ng] = [];
                        if (!in_array($mpJ, $guruJadwalMapels[$ng], true)) $guruJadwalMapels[$ng][] = $mpJ;
                    }
                }
            } catch(Exception $e) {}

            $teachers = [];
            foreach ($guruRows as $g) {
                $nip = trim($g['nip'] ?? $g['username'] ?? '');
                $namaGuru = $g['nama_guru'] ?? $g['nama'] ?? $g['username'] ?? '-';
                $namaGuruClean = mb_strtolower(trim($namaGuru));

                // Lewati guru di luar filter kelas tab guru (jika aktif)
                if (is_array($guruNamaKelasSet)) {
                    if (count($guruNamaKelasSet) === 0) break; // kelas tanpa jadwal → tabel kosong
                    if (!in_array($namaGuruClean, $guruNamaKelasSet, true)) continue;
                }
                $rawMapelGuru = trim($g['mata_pelajaran'] ?? '');

                // Determine teacher mapels
                $teacherMapels = ['(umum)'];
                if ($rawMapelGuru !== '') {
                    $parts = array_map('trim', explode(',', $rawMapelGuru));
                    foreach ($parts as $p) {
                        if ($p !== '' && !in_array($p, $teacherMapels)) $teacherMapels[] = $p;
                    }
                }
                // FALLBACK: profil_guru belum punya mata_pelajaran → coba ambil
                // dari penugasan resmi guru_mengajar dulu (paling akurat),
                // baru dari Jadwal Pelajaran. Tidak menimpa data yang sudah
                // ada, hanya mengisi saat benar-benar kosong.
                if ($rawMapelGuru === '' && !empty($guruMengajarMapels[$nip])) {
                    foreach ($guruMengajarMapels[$nip] as $pM) {
                        if ($pM !== '' && !in_array($pM, $teacherMapels)) $teacherMapels[] = $pM;
                    }
                }
                if ($rawMapelGuru === '' && empty($guruMengajarMapels[$nip]) && !empty($guruJadwalMapels[$namaGuruClean])) {
                    foreach ($guruJadwalMapels[$namaGuruClean] as $pJ) {
                        if ($pJ !== '' && !in_array($pJ, $teacherMapels)) $teacherMapels[] = $pJ;
                    }
                }
                $gAbsences = $absensiGuruMap[$nip] ?? $absensiGuruNameMap[$namaGuruClean] ?? [];
                $tglAdaAbsenEksplisitG = []; // tanggal yang punya catatan mapel eksplisit
                $adaAbsenUmumG = false; // ada catatan absensi yang benar-benar tersimpan sebagai "(umum)"
                foreach ($gAbsences as $tgl => $mps) {
                    foreach ($mps as $mp => $st) {
                        if ($mp !== '(umum)' && !in_array($mp, $teacherMapels)) $teacherMapels[] = $mp;
                        if ($mp !== '(umum)') $tglAdaAbsenEksplisitG[$tgl] = true;
                        else $adaAbsenUmumG = true;
                    }
                }

                // Buang baris "(umum)" secepat mungkin kalau guru sudah punya
                // mapel nyata lainnya (mis. "Al-Qur'an") — hindari guru muncul
                // dobel di rekap sekaligus mengurangi komputasi harian di bawah.
                // CATATAN: baris "(umum)" yang TERSISA (guru benar-benar tanpa
                // mapel sama sekali) tetap TIDAK PERNAH ditampilkan — lihat
                // guard "if ($currentMp === '(umum)') continue;" di bawah.
                if (count($teacherMapels) > 1) {
                    $teacherMapels = array_values(array_filter($teacherMapels, function($mp) {
                        return $mp !== '(umum)';
                    }));
                }

                $teachingDays = $guruJadwalDays[$namaGuruClean] ?? null;

                // PERBAIKAN: absensi_guru (fitur Absensi Guru / scan) selalu disimpan
                // TANPA mata_pelajaran — itu general check-in harian, bukan per mapel
                // (dropdown Mapel memang sengaja tidak ada di mode Absensi Guru).
                // Sebelumnya fallback record umum ini dipakai berulang untuk SETIAP
                // baris mapel yang diampu guru tsb, jadi 1x "Hadir" nyebar jadi hadir
                // di semua mapel. $umumTerpakaiTgl melacak tanggal yang SUDAH memakai
                // fallback umum untuk guru ybs, supaya hanya baris mapel PERTAMA yang
                // menerimanya — baris mapel lain di tanggal yang sama tidak lagi
                // otomatis ikut "Hadir".
                $umumTerpakaiTgl = [];

                foreach ($teacherMapels as $currentMp) {
                    $dailyCodes = [];
                    $hCount = 0; $sCount = 0; $iCount = 0; $aCount = 0; $holidayCount = 0;

                    for ($d = 1; $d <= $numDays; $d++) {
                        $tglStr = sprintf('%04d-%02d-%02d', $tahun, $bulan, $d);
                        $dateObj = new DateTime($tglStr);
                        $dayOfWeek = intval($dateObj->format('N'));

                        $isLibur = in_array($tglStr, $hariLiburDb);
                        if (!$isLibur && isset($jadwalHarian[(string)$dayOfWeek]) && !empty($jadwalHarian[(string)$dayOfWeek]['libur'])) {
                            $isLibur = true;
                        }
                        if (!$isLibur && $dayOfWeek == 7 && (!isset($jadwalHarian['7']) || !empty($jadwalHarian['7']['libur']))) {
                            $isLibur = true;
                        }

                        $status = $absensiGuruMap[$nip][$tglStr][$currentMp] ?? $absensiGuruNameMap[$namaGuruClean][$tglStr][$currentMp] ?? null;
                        if ($status === null && empty($umumTerpakaiTgl[$tglStr])) {
                            $status = $absensiGuruMap[$nip][$tglStr]['(umum)'] ?? $absensiGuruNameMap[$namaGuruClean][$tglStr]['(umum)'] ?? null;
                            if ($status !== null) $umumTerpakaiTgl[$tglStr] = true;
                        }
                        $code = '';
                        if ($status === 'Hadir') { $code = 'H'; $hCount++; }
                        elseif ($status === 'Sakit') { $code = 'S'; $sCount++; }
                        elseif ($status === 'Izin') { $code = 'I'; $iCount++; }
                        elseif ($status === 'Alpa' || $status === 'Alfa') { $code = 'A'; $aCount++; }
                        elseif ($isLibur) { $code = 'L'; $holidayCount++; }
                        elseif ($status === null && !$isLibur && $tglStr < $today) {
                            if ($currentMp === '(umum)') {
                                // Sama seperti siswa: jangan auto-Alpa bila hari itu
                                // sudah ada catatan absensi mapel eksplisit.
                                if (!isset($tglAdaAbsenEksplisitG[$tglStr]) && $teachingDays !== null && in_array($dayOfWeek, $teachingDays)) {
                                    $code = 'A'; $aCount++;
                                }
                            }
                        }

                        $dailyCodes[] = [
                            'date'      => $d,
                            'code'      => $code,
                            'isHoliday' => $isLibur,
                            // Tandai kolom tanggal yang guru ybs TIDAK ada jadwal mengajar
                            // (hari itu bukan hari ajarnya sama sekali). Kolom ini akan
                            // "dimatikan" di frontend — tidak bisa isi/edit/hapus Hadir.
                            // true (bukan array $teachingDays) = data jadwal guru tidak
                            // ditemukan → tidak dibatasi (menu tidak mati total).
                            'isTeachingDay' => ($teachingDays === null) ? true : in_array($dayOfWeek, $teachingDays, true)
                        ];
                    }

                    $effectiveDays = $numDays - $holidayCount;
                    $percent = ($effectiveDays > 0) ? round(($hCount / $effectiveDays) * 100) : 0;

                    // GARANSI: kolom mapel guru TIDAK BOLEH kosong / "-" / "Umum".
                    // Baris "(umum)" (tidak ada mata pelajaran nyata dari profil_guru,
                    // guru_mengajar, jadwal pelajaran, maupun catatan absensi bermapel)
                    // DIBUANG dari hasil sepenuhnya — bukan ditampilkan dengan label
                    // generik. Guru tsb baru muncul di tab ini setelah mapelnya
                    // diisi di Data Guru / penugasan kelas / jadwal pelajaran.
                    if ($currentMp === '(umum)') continue;

                    $teachers[] = [
                        'nip' => $nip,
                        'nama' => $namaGuru,
                        'mapel' => $currentMp,
                        'dailyCodes' => $dailyCodes,
                        'stats' => [
                            'h' => $hCount,
                            's' => $sCount,
                            'i' => $iCount,
                            'a' => $aCount,
                            'percent' => $percent
                        ]
                    ];
                }
            }

            sort($mapelSet);
            sendJson([
                'success' => true,
                'data' => [
                    'daysInMonth' => $numDays,
                    'mapelList' => array_values(array_unique(array_merge(array_keys($allJadwalMapels), $mapelSet))),
                    'students' => $students,
                    'teachers' => $teachers
                ]
            ]);
            break;

        // ==========================================
        // 7. MASTER JADWAL, NILAI, PRESTASI, INVENTARIS
        // ==========================================
        case 'archiveAndResetYear':
            // PERBAIKAN KEAMANAN: hanya admin
            requireAuth($pdo, $input, ['admin']);
            // PERBAIKAN BUG: mengembalikan error yang jelas agar admin tidak mengira data sudah diarsipkan.
            // Implementasi seharusnya: pindahkan data absensi ke tabel arsip, lalu reset tabel aktif.
            error_log('[SIAKAD] archiveAndResetYear dipanggil tetapi belum diimplementasikan!');
            sendJson(['success' => false, 'message' => 'Fitur arsip tahunan belum tersedia. Hubungi administrator sebelum melanjutkan — data TIDAK diarsipkan.']);
            break;

        // ==========================================
        // GANTI PASSWORD MANDIRI (Siswa & Guru)
        // ==========================================
}