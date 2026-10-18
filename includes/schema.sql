-- ============================================================
-- DATABASE SCHEMA UNTUK SIAKAD (Sistem Informasi Akademik)
-- Database Name: siakad_db
-- MySQL 5.7+ / MariaDB 10.2+ Compatible
-- ============================================================

-- CATATAN HOSTING GRATIS (InfinityFree, dsb.):
-- Baris CREATE DATABASE / USE sengaja TIDAK disertakan di sini karena
-- akun shared hosting biasanya tidak punya izin membuat database baru.
-- Database sudah otomatis dibuat lewat panel hosting Anda (nama biasanya
-- seperti if0_XXXXXXX_siakad_db) — cukup PILIH database itu di phpMyAdmin
-- terlebih dahulu, baru import file ini.
--
-- Kalau Anda develop di lokal (XAMPP/Laragon) dan ingin database otomatis
-- dibuat, jalankan dua baris ini secara manual sebelum import:
--   CREATE DATABASE IF NOT EXISTS `siakad_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   USE `siakad_db`;

-- ------------------------------------------------------------
-- 1. TABEL USERS (Akun Pengguna Sistem)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'guru',
  `kelas` VARCHAR(50) DEFAULT NULL,
  `nip` VARCHAR(50) DEFAULT NULL,
  `nama` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL COMMENT 'Email untuk login Google (admin/bendahara/staff)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data Awal: password di-hash dengan password_hash(PASSWORD_DEFAULT / bcrypt)
-- PERBAIKAN KEAMANAN: password default diganti. Wajib ganti via aplikasi setelah install!
-- Password sementara untuk kedua akun: GantiPassword!2025
-- Hash bcrypt di bawah adalah hash dari 'GantiPassword!2025'
INSERT INTO `users` (`username`, `password`, `role`, `kelas`, `nip`, `nama`)
VALUES ('admin', '$2b$10$qT3dFQVuAMDEfhb75cmG1ObtELFS3mYrpoevi4HsQ38MSgRx/IB5m', 'admin', '', '', 'Administrator')
ON DUPLICATE KEY UPDATE `username`=`username`;

INSERT INTO `users` (`username`, `password`, `role`, `kelas`, `nip`, `nama`)
VALUES ('bendahara', '$2b$10$QG98oot/.0LeJ1xlBeOwLuEpGvRRq5PctTi7epu/.EuU3CzgW0LRy', 'bendahara', '', '', 'Bendahara')
ON DUPLICATE KEY UPDATE `username`=`username`;
-- PENTING: Ganti password kedua akun di atas segera setelah instalasi!

-- ------------------------------------------------------------
-- 2. TABEL SISWA (Data Induk Siswa)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `siswa` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(150) NOT NULL,
  `nisn` VARCHAR(50) NOT NULL UNIQUE,
  `jenis_kelamin` VARCHAR(20) DEFAULT NULL,
  `tanggal_lahir` DATE DEFAULT NULL,
  `agama` VARCHAR(50) DEFAULT NULL,
  `nama_ayah` VARCHAR(150) DEFAULT NULL,
  `nama_ibu` VARCHAR(150) DEFAULT NULL,
  `no_hp` VARCHAR(50) DEFAULT NULL,
  `kelas` VARCHAR(50) DEFAULT NULL,
  `alamat` TEXT DEFAULT NULL,
  `status_siswa` ENUM('aktif', 'alumni') DEFAULT 'aktif',
  `email` VARCHAR(100) DEFAULT NULL,
  `tahun_lulus` VARCHAR(10) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. TABEL PROFIL GURU (Data Guru & Staf)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profil_guru` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nip` VARCHAR(50) NOT NULL UNIQUE,
  `nama_guru` VARCHAR(150) NOT NULL,
  `mata_pelajaran` VARCHAR(150) DEFAULT NULL,
  `no_hp` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `status_kepegawaian` VARCHAR(50) DEFAULT NULL,
  `jabatan` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. TABEL ABSENSI (Kehadiran Siswa Harian)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `absensi` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL,
  `nisn` VARCHAR(50) NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `kelas` VARCHAR(50) DEFAULT NULL,
  `jam_datang` TIME DEFAULT NULL,
  `jam_pulang` TIME DEFAULT NULL,
  `keterangan_waktu` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Hadir',
  `jam_sholat` VARCHAR(50) DEFAULT NULL,
  `mata_pelajaran` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_absensi_tgl_nisn` (`tanggal`, `nisn`),
  INDEX `idx_absensi_kelas` (`kelas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. TABEL ABSENSI SHOLAT
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `absensi_sholat` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL,
  `nisn` VARCHAR(50) NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `kelas` VARCHAR(50) DEFAULT NULL,
  `waktu_sholat` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Ya',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `input_oleh` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_absensi_sholat_tgl_nisn` (`tanggal`, `nisn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. TABEL ABSENSI GURU
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `absensi_guru` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL,
  `nip` VARCHAR(50) NOT NULL,
  `nama_guru` VARCHAR(150) NOT NULL,
  `jam_masuk` TIME DEFAULT NULL,
  `jam_pulang` TIME DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Hadir',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_absensi_guru_tgl_nip` (`tanggal`, `nip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. TABEL PERIZINAN (LEGACY - tidak digunakan aktif, digantikan perizinan_siswa & perizinan_guru)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `perizinan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL,
  `nama` VARCHAR(150) NOT NULL,
  `role` VARCHAR(50) DEFAULT NULL,
  `alasan` TEXT DEFAULT NULL,
  `status_izin` VARCHAR(50) DEFAULT 'Menunggu',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 8. TABEL PERIZINAN SISWA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `perizinan_siswa` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL,
  `nisn` VARCHAR(50) NOT NULL,
  `nama_siswa` VARCHAR(150) NOT NULL,
  `kelas` VARCHAR(50) DEFAULT NULL,
  `jenis` VARCHAR(50) DEFAULT 'Izin',
  `alasan` TEXT DEFAULT NULL,
  `status_izin` VARCHAR(50) DEFAULT 'Menunggu',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_perizinan_siswa_nisn_tgl` (`nisn`, `tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 8b. TABEL PERIZINAN GURU
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `perizinan_guru` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL,
  `nip` VARCHAR(50) DEFAULT NULL,
  `nama_guru` VARCHAR(150) NOT NULL,
  `jabatan` VARCHAR(100) DEFAULT NULL,
  `jenis` VARCHAR(50) DEFAULT 'Izin',
  `keterangan` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Menunggu',
  `catatan_admin` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_perizinan_guru_nip_tgl` (`nip`, `tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 9. TABEL PRESTASI SISWA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prestasi` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE DEFAULT NULL,
  `nisn` VARCHAR(50) NOT NULL,
  `nama_siswa` VARCHAR(150) NOT NULL,
  `kelas` VARCHAR(50) DEFAULT NULL,
  `nama_prestasi` VARCHAR(255) NOT NULL,
  `tingkat` VARCHAR(100) DEFAULT NULL,
  `peringkat` VARCHAR(50) DEFAULT NULL,
  `kategori` VARCHAR(100) DEFAULT NULL,
  `satuan` VARCHAR(50) DEFAULT NULL,
  `tanggal_masuk` DATE DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 10. TABEL INVENTARIS SEKOLAH
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventaris` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_barang` VARCHAR(50) NOT NULL UNIQUE,
  `nama_barang` VARCHAR(150) NOT NULL,
  `kategori` VARCHAR(100) DEFAULT NULL,
  `jumlah` INT DEFAULT 0,
  `satuan` VARCHAR(50) DEFAULT NULL,
  `kondisi` VARCHAR(50) DEFAULT 'Baik',
  `lokasi` VARCHAR(100) DEFAULT NULL,
  `tanggal_masuk` DATE DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 11. TABEL JADWAL PELAJARAN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `jadwal` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hari` VARCHAR(20) NOT NULL,
  `kelas` VARCHAR(50) NOT NULL,
  `mata_pelajaran` VARCHAR(150) NOT NULL,
  `jam_ke` INT DEFAULT 1,
  `waktu` VARCHAR(50) DEFAULT NULL,
  `nama_guru` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_jadwal_kelas_hari` (`kelas`, `hari`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 12. TABEL NILAI SISWA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `nilai` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nisn` VARCHAR(50) NOT NULL,
  `nama_siswa` VARCHAR(150) NOT NULL,
  `kelas` VARCHAR(50) DEFAULT NULL,
  `mata_pelajaran` VARCHAR(150) NOT NULL,
  `semester` VARCHAR(20) DEFAULT 'Ganjil',
  `nilai_tugas` DECIMAL(5,2) DEFAULT 0,
  `nilai_uts` DECIMAL(5,2) DEFAULT 0,
  `nilai_uas` DECIMAL(5,2) DEFAULT 0,
  `nilai_akhir` DECIMAL(5,2) DEFAULT 0,
  `keterangan` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nilai_nisn` (`nisn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 13. TABEL HARI LIBUR
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hari_libur` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal` DATE NOT NULL UNIQUE,
  `keterangan` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 14. TABEL KONFIGURASI SISTEM
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `konfigurasi` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_name` VARCHAR(100) NOT NULL UNIQUE,
  `value_name` TEXT NOT NULL,
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `konfigurasi` (`key_name`, `value_name`, `keterangan`) VALUES
('mode_absen', 'masuk_pulang', 'Mode: masuk_saja | masuk_pulang | masuk_sholat_pulang')
ON DUPLICATE KEY UPDATE `value_name`=`value_name`;

-- ------------------------------------------------------------
-- 15. TABEL SESSIONS (Token Login)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token` VARCHAR(100) NOT NULL UNIQUE,
  `identifier` VARCHAR(100) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `expiry` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sessions_token` (`token`),
  INDEX `idx_sessions_expiry` (`expiry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 16. TABEL MASTER KELAS
-- FIX: ALTER TABLE dipindahkan keluar dari CREATE TABLE (BUG KRITIS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kelas_master` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_kelas` VARCHAR(50) NOT NULL UNIQUE,
  `wali_kelas` VARCHAR(100) DEFAULT NULL COMMENT 'username dari tabel users',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 17. TABEL MASTER MATA PELAJARAN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mapel_master` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_mapel` VARCHAR(150) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 18. TABEL MASTER TAGIHAN (SIKAS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `master_tagihan` (
  `id` VARCHAR(50) NOT NULL,
  `nama_tagihan` VARCHAR(255) NOT NULL,
  `nominal_default` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `tipe_tagihan` VARCHAR(50) NOT NULL DEFAULT 'Bulanan',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 19. TABEL TAGIHAN SISWA (SIKAS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tagihan` (
  `id` VARCHAR(50) NOT NULL,
  `siswa_id` VARCHAR(50) NOT NULL,
  `jenis_tagihan` VARCHAR(255) NOT NULL,
  `nominal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `jatuh_tempo` DATE NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Belum Lunas',
  `bulan` VARCHAR(100) DEFAULT NULL,
  `dibuat_pada` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tagihan_siswa` (`siswa_id`),
  KEY `idx_tagihan_status` (`status`),
  KEY `idx_tagihan_jatuh_tempo` (`jatuh_tempo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 20. TABEL TRANSAKSI PEMBAYARAN (SIKAS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transaksi` (
  `id` VARCHAR(50) NOT NULL,
  `siswa_id` VARCHAR(50) NOT NULL,
  `tagihan_id` TEXT NOT NULL,
  `nominal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `metode_bayar` VARCHAR(100) NOT NULL,
  `tanggal` DATETIME NOT NULL,
  `nomor_resi` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transaksi_siswa` (`siswa_id`),
  KEY `idx_transaksi_tanggal` (`tanggal`),
  KEY `idx_transaksi_resi` (`nomor_resi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data awal master tagihan
INSERT IGNORE INTO `master_tagihan` (`id`, `nama_tagihan`, `nominal_default`, `tipe_tagihan`) VALUES
('m1', 'SPP Bulanan', 100000, 'Bulanan'),
('m2', 'Uang Gedung', 250000, 'Tahunan'),
('m3', 'Kegiatan Ekstrakurikuler', 50000, 'Bulanan'),
('m4', 'Biaya Ujian', 75000, 'Sekali');

-- ------------------------------------------------------------
-- 21. TABEL GURU_MENGAJAR (Relasi Guru - Kelas - Mapel, Many-to-Many)
-- Satu guru bisa punya banyak baris di sini: kombinasi kelas+mapel
-- berbeda-beda. Ini menggantikan pola lama "kolom koma" di
-- users.kelas / profil_guru.mata_pelajaran yang rawan bug saat guru
-- mengajar lebih dari 1 kelas dan/atau lebih dari 1 mata pelajaran.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guru_mengajar` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nip` VARCHAR(50) NOT NULL COMMENT 'username guru (users.username) / nip (profil_guru.nip)',
  `kelas` VARCHAR(50) NOT NULL,
  `mata_pelajaran` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_guru_kelas_mapel` (`nip`, `kelas`, `mata_pelajaran`),
  INDEX `idx_guru_mengajar_nip` (`nip`),
  INDEX `idx_guru_mengajar_kelas` (`kelas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MIGRASI AMAN: Tambah kolom jika belum ada (Safe ALTER TABLE)
-- ============================================================
SET @dbname = DATABASE();

SET @tablename = 'users';
SET @columnname = 'kelas_wali';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `users` ADD COLUMN `kelas_wali` VARCHAR(50) DEFAULT NULL COMMENT \'Kelas yang diwalikan (homeroom)\''
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @columnname = 'nama';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `users` ADD COLUMN `nama` VARCHAR(150) DEFAULT NULL'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tablename = 'perizinan_siswa';
SET @columnname = 'jenis';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `perizinan_siswa` ADD COLUMN `jenis` VARCHAR(50) DEFAULT \'Izin\''
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tablename = 'kelas_master';
SET @columnname = 'wali_kelas';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `kelas_master` ADD COLUMN `wali_kelas` VARCHAR(100) DEFAULT NULL COMMENT \'username dari tabel users\''
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- FIX: Hapus UNIQUE constraint pada kolom `nip` di tabel users
-- ============================================================
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'nip'
);
SET @sql = IF(@idx_exists > 0, 'ALTER TABLE `users` DROP INDEX `nip`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `users` MODIFY COLUMN `nip` VARCHAR(50) DEFAULT NULL;

-- ============================================================
-- FIX: Tambah kolom yang kurang di tabel profil_guru secara aman
-- ============================================================
SET @dbname = DATABASE();
SET @tablename = 'profil_guru';

SET @columnname = 'jenis_kelamin';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0, 'SELECT 1', 'ALTER TABLE `profil_guru` ADD COLUMN `jenis_kelamin` VARCHAR(20) DEFAULT NULL'));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @columnname = 'tanggal_lahir';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0, 'SELECT 1', 'ALTER TABLE `profil_guru` ADD COLUMN `tanggal_lahir` DATE DEFAULT NULL'));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @columnname = 'agama';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0, 'SELECT 1', 'ALTER TABLE `profil_guru` ADD COLUMN `agama` VARCHAR(30) DEFAULT NULL'));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @columnname = 'alamat';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0, 'SELECT 1', 'ALTER TABLE `profil_guru` ADD COLUMN `alamat` TEXT DEFAULT NULL'));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @columnname = 'nama_ayah';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0, 'SELECT 1', 'ALTER TABLE `profil_guru` ADD COLUMN `nama_ayah` VARCHAR(100) DEFAULT NULL'));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @columnname = 'nama_ibu';
SET @preparedStatement = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0, 'SELECT 1', 'ALTER TABLE `profil_guru` ADD COLUMN `nama_ibu` VARCHAR(100) DEFAULT NULL'));
PREPARE stmt FROM @preparedStatement; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- MIGRASI AMAN: Tambah UNIQUE INDEX email di tabel siswa & profil_guru
-- Email tidak boleh double agar login Google & validasi data konsisten.
-- ============================================================

-- UNIQUE email di tabel siswa (abaikan baris dengan email NULL/kosong via partial-unique trick)
-- Catatan: MySQL tidak mendukung partial unique index, jadi kita gunakan UNIQUE biasa.
-- NULL tidak dianggap duplicate di MySQL, sehingga NULL aman.
-- String kosong ('') AKAN dianggap duplicate — pastikan aplikasi menyimpan NULL bukan '' jika email tidak diisi.
SET @idx_siswa_email = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'siswa'
      AND INDEX_NAME = 'uniq_siswa_email'
);
SET @sql = IF(@idx_siswa_email = 0,
    'ALTER TABLE `siswa` ADD UNIQUE INDEX `uniq_siswa_email` (`email`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- UNIQUE email di tabel profil_guru
SET @idx_guru_email = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'profil_guru'
      AND INDEX_NAME = 'uniq_guru_email'
);
SET @sql = IF(@idx_guru_email = 0,
    'ALTER TABLE `profil_guru` ADD UNIQUE INDEX `uniq_guru_email` (`email`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;