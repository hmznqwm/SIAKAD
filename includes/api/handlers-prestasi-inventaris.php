<?php
switch ($action) {
        case 'getPrestasiList':
            $stmt = $pdo->query("SELECT * FROM prestasi ORDER BY tanggal DESC");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                // Parse namaKegiatan & jenisPrestasi dari nama_prestasi (format: "Nama [Jenis]")
                $namaPrestasi = $r['nama_prestasi'] ?? '';
                $namaKegiatan = $namaPrestasi;
                $jenisPrestasi = '';
                if (preg_match('/^(.+)\s*\[(.+)\]$/', $namaPrestasi, $m)) {
                    $namaKegiatan = trim($m[1]);
                    $jenisPrestasi = trim($m[2]);
                }
                // Ekstrak tahun dari tanggal
                $tahun = $r['tanggal'] ? substr($r['tanggal'], 0, 4) : '';
                return [
                    'id' => $r['id'],
                    'tanggal' => $r['tanggal'],
                    'nisn' => $r['nisn'],
                    'nama' => $r['nama_siswa'],
                    'namaSiswa' => $r['nama_siswa'],
                    'kelas' => $r['kelas'],
                    'namaPrestasi' => $namaPrestasi,
                    'namaKegiatan' => $namaKegiatan,
                    'jenisPrestasi' => $jenisPrestasi,
                    'tingkat' => $r['tingkat'],
                    'peringkat' => $r['peringkat'],
                    'tahun' => $tahun,
                    'keterangan' => $r['keterangan']
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'addPrestasi':
            $p = $input['prestasiData'] ?? $input;
            // Bangun nama_prestasi dari namaKegiatan + jenisPrestasi jika namaPrestasi kosong
            $namaPrestasi = $p['namaPrestasi'] ?? '';
            if (empty($namaPrestasi)) {
                $namaKegiatan = $p['namaKegiatan'] ?? '';
                $jenisPrestasi = $p['jenisPrestasi'] ?? '';
                $namaPrestasi = $namaKegiatan . ($jenisPrestasi ? ' [' . $jenisPrestasi . ']' : '');
            }
            // Bangun tanggal dari field tahun jika tanggal kosong
            $tanggal = $p['tanggal'] ?? '';
            if (empty($tanggal) && !empty($p['tahun'])) {
                $tanggal = $p['tahun'] . '-01-01';
            }
            if (empty($tanggal)) $tanggal = date('Y-m-d');
            $ins = $pdo->prepare("INSERT INTO prestasi (tanggal, nisn, nama_siswa, kelas, nama_prestasi, tingkat, peringkat, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                $tanggal,
                $p['nisn'] ?? '',
                $p['namaSiswa'] ?? $p['nama'] ?? '',
                $p['kelas'] ?? '',
                $namaPrestasi,
                $p['tingkat'] ?? '',
                $p['peringkat'] ?? '',
                $p['keterangan'] ?? ''
            ]);
            sendJson(['success' => true, 'message' => 'Prestasi berhasil ditambahkan']);
            break;

        case 'updatePrestasi':
            $id = $input['id'] ?? null;
            $p = $input['prestasiData'] ?? $input;
            if (!$id) { sendJson(['success' => false, 'message' => 'ID tidak ditemukan']); break; }
            $namaPrestasi = $p['namaPrestasi'] ?? '';
            if (empty($namaPrestasi)) {
                $namaKegiatan = $p['namaKegiatan'] ?? '';
                $jenisPrestasi = $p['jenisPrestasi'] ?? '';
                $namaPrestasi = $namaKegiatan . ($jenisPrestasi ? ' [' . $jenisPrestasi . ']' : '');
            }
            $tanggal = $p['tanggal'] ?? '';
            if (empty($tanggal) && !empty($p['tahun'])) {
                $tanggal = $p['tahun'] . '-01-01';
            }
            if (empty($tanggal)) $tanggal = date('Y-m-d');
            $upd = $pdo->prepare("UPDATE prestasi SET tanggal=?, nisn=?, nama_siswa=?, kelas=?, nama_prestasi=?, tingkat=?, peringkat=?, keterangan=? WHERE id=?");
            $upd->execute([
                $tanggal,
                $p['nisn'] ?? '',
                $p['namaSiswa'] ?? $p['nama'] ?? '',
                $p['kelas'] ?? '',
                $namaPrestasi,
                $p['tingkat'] ?? '',
                $p['peringkat'] ?? '',
                $p['keterangan'] ?? '',
                $id
            ]);
            sendJson(['success' => true, 'message' => 'Prestasi berhasil diperbarui']);
            break;

        case 'deletePrestasi':
            $id = $input['id'] ?? null;
            if (!$id) { sendJson(['success' => false, 'message' => 'ID tidak ditemukan']); break; }
            $del = $pdo->prepare("DELETE FROM prestasi WHERE id=?");
            $del->execute([$id]);
            sendJson(['success' => true, 'message' => 'Prestasi berhasil dihapus']);
            break;

        case 'deleteMultiplePrestasi':
            $ids = $input['ids'] ?? [];
            if (empty($ids)) { sendJson(['success' => false, 'message' => 'Tidak ada data yang dipilih']); break; }
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $del = $pdo->prepare("DELETE FROM prestasi WHERE id IN ($placeholders)");
            $del->execute($ids);
            sendJson(['success' => true, 'message' => count($ids) . ' data prestasi berhasil dihapus']);
            break;

        case 'getInventarisList':
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS satuan VARCHAR(50) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS tanggal_masuk DATE DEFAULT NULL"); } catch(Exception $e) {}
            $stmt = $pdo->query("SELECT * FROM inventaris ORDER BY nama_barang ASC");
            $rows = $stmt->fetchAll();
            $data = array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'kodeBarang' => $r['kode_barang'],
                    'namaBarang' => $r['nama_barang'],
                    'kategori' => $r['kategori'] ?? '',
                    'jumlah' => $r['jumlah'],
                    'satuan' => $r['satuan'] ?? '',
                    'kondisi' => $r['kondisi'],
                    'lokasi' => $r['lokasi'],
                    'tanggalMasuk' => $r['tanggal_masuk'] ?? '',
                    'keterangan' => $r['keterangan']
                ];
            }, $rows);
            sendJson(['success' => true, 'data' => $data]);
            break;

        case 'addInventaris':
            $v = $input['inventarisData'] ?? $input;
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS satuan VARCHAR(50) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS tanggal_masuk DATE DEFAULT NULL"); } catch(Exception $e) {}
            $ins = $pdo->prepare("INSERT INTO inventaris (kode_barang, nama_barang, kategori, jumlah, satuan, kondisi, lokasi, tanggal_masuk, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                $v['kodeBarang'] ?? '',
                $v['namaBarang'] ?? '',
                $v['kategori'] ?? '',
                intval($v['jumlah'] ?? 1),
                $v['satuan'] ?? '',
                $v['kondisi'] ?? 'Baik',
                $v['lokasi'] ?? '',
                !empty($v['tanggalMasuk']) ? $v['tanggalMasuk'] : null,
                $v['keterangan'] ?? ''
            ]);
            sendJson(['success' => true, 'message' => 'Inventaris berhasil ditambahkan']);
            break;

        case 'updateInventaris':
            $oldKode = $input['oldKode'] ?? null;
            $v = $input['inventarisData'] ?? $input;
            if (!$oldKode) { sendJson(['success' => false, 'message' => 'Kode barang tidak ditemukan']); break; }
            $upd = $pdo->prepare("UPDATE inventaris SET kode_barang=?, nama_barang=?, kategori=?, jumlah=?, satuan=?, kondisi=?, lokasi=?, tanggal_masuk=?, keterangan=? WHERE kode_barang=?");
            $upd->execute([
                $v['kodeBarang'] ?? $oldKode,
                $v['namaBarang'] ?? '',
                $v['kategori'] ?? '',
                intval($v['jumlah'] ?? 1),
                $v['satuan'] ?? '',
                $v['kondisi'] ?? 'Baik',
                $v['lokasi'] ?? '',
                !empty($v['tanggalMasuk']) ? $v['tanggalMasuk'] : null,
                $v['keterangan'] ?? '',
                $oldKode
            ]);
            sendJson(['success' => true, 'message' => 'Inventaris berhasil diperbarui']);
            break;

        case 'deleteInventaris':
            $kode = $input['kode'] ?? $input['kodeBarang'] ?? null;
            if (!$kode) { sendJson(['success' => false, 'message' => 'Kode barang tidak ditemukan']); break; }
            $del = $pdo->prepare("DELETE FROM inventaris WHERE kode_barang=?");
            $del->execute([$kode]);
            sendJson(['success' => true, 'message' => 'Inventaris berhasil dihapus']);
            break;

        case 'deleteMultipleInventaris':
            $ids = $input['ids'] ?? [];
            if (empty($ids)) { sendJson(['success' => false, 'message' => 'Tidak ada data yang dipilih']); break; }
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $del = $pdo->prepare("DELETE FROM inventaris WHERE kode_barang IN ($placeholders)");
            $del->execute($ids);
            sendJson(['success' => true, 'message' => count($ids) . ' data inventaris berhasil dihapus']);
            break;

        case 'importPrestasiBulk':
            $rows = $input['data'] ?? $input['args'][0] ?? [];
            $added = 0; $skipped = 0;
            $ins = $pdo->prepare("INSERT INTO prestasi (tanggal, nisn, nama_siswa, kelas, nama_prestasi, tingkat, peringkat, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($rows as $row) {
                $namaSiswa = $row['namaSiswa'] ?? $row['nama'] ?? '';
                $namaKegiatan = $row['namaKegiatan'] ?? '';
                $jenisPrestasi = $row['jenisPrestasi'] ?? '';
                $namaPrestasi = $row['namaPrestasi'] ?? ($namaKegiatan . ($jenisPrestasi ? ' [' . $jenisPrestasi . ']' : ''));
                $tahun = $row['tahun'] ?? date('Y');
                $tanggal = $row['tanggal'] ?? ($tahun . '-01-01');
                if (empty($namaSiswa) || empty($namaKegiatan)) { $skipped++; continue; }
                try {
                    $ins->execute([$tanggal, $row['nisn'] ?? '', $namaSiswa, $row['kelas'] ?? '', $namaPrestasi, $row['tingkat'] ?? 'Madrasah', $row['peringkat'] ?? '', $row['keterangan'] ?? '']);
                    $added++;
                } catch (Exception $e) { $skipped++; }
            }
            sendJson(['success' => true, 'added' => $added, 'skipped' => $skipped, 'message' => "$added data prestasi berhasil diimport"]);
            break;

        case 'importInventarisBulk':
            $rows = $input['data'] ?? $input['args'][0] ?? [];
            $added = 0; $skipped = 0;
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS satuan VARCHAR(50) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE inventaris ADD COLUMN IF NOT EXISTS tanggal_masuk DATE DEFAULT NULL"); } catch(Exception $e) {}
            $ins = $pdo->prepare("INSERT INTO inventaris (kode_barang, nama_barang, kategori, jumlah, satuan, kondisi, lokasi, tanggal_masuk, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nama_barang=VALUES(nama_barang), kategori=VALUES(kategori), jumlah=VALUES(jumlah), satuan=VALUES(satuan), kondisi=VALUES(kondisi), lokasi=VALUES(lokasi)");
            foreach ($rows as $row) {
                $namaBarang = $row['namaBarang'] ?? $row['nama'] ?? '';
                $kodeBarang = $row['kodeBarang'] ?? $row['kode'] ?? '';
                if (empty($namaBarang) || empty($kodeBarang)) { $skipped++; continue; }
                $tanggalMasuk = !empty($row['tanggalMasuk']) ? $row['tanggalMasuk'] : null;
                try {
                    $ins->execute([$kodeBarang, $namaBarang, $row['kategori'] ?? '', $row['jumlah'] ?? 0, $row['satuan'] ?? '', $row['kondisi'] ?? 'Baik', $row['lokasi'] ?? '', $tanggalMasuk, $row['keterangan'] ?? '']);
                    $added++;
                } catch (Exception $e) { $skipped++; }
            }
            sendJson(['success' => true, 'added' => $added, 'skipped' => $skipped, 'message' => "$added data inventaris berhasil diimport"]);
            break;

}
