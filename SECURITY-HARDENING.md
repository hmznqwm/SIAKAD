# SIAKAD Security Hardening

Perubahan keamanan diterapkan tanpa menghapus Google Client ID maupun konfigurasi SMTP yang digunakan untuk Login Google dan Lupa Password.

Perbaikan utama:
- Central server-side authentication gate untuk API non-publik.
- Pembatasan role untuk operasi administrasi dan data sensitif.
- Perlindungan akses data siswa berdasarkan role/identitas.
- Verifikasi Google ID Token secara cryptographic dengan Google public keys/JWKS dan fallback tokeninfo yang tetap memvalidasi audience/issuer/expiry.
- Password default siswa tidak lagi diterima setelah password custom dibuat.
- OTP reset password dikonsumsi secara atomik untuk mencegah penggunaan ulang/race condition.
- Session token diperkuat menjadi 32 random bytes.
- Password user tidak dikirim dalam response daftar guru.
- Security headers dasar ditambahkan.
- Prepared statements dan mekanisme keamanan yang sudah ada dipertahankan.

Google Client ID dan SMTP configuration tetap dipertahankan agar fitur Login Google dan Lupa Password tetap berfungsi.
