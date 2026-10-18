/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './*.php',
    './views/**/*.php',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        /*
           ========================================================================
           SIAKAD PALET WARNA RESMI & ATURAN PEMAKAIAN (Single Source of Truth)
           ========================================================================
           1. brand-*   -> Aksi utama, header aktif/sidebar, hover, status positif
                           (Hadir, Lunas, Disetujui, Izin, Aktif).
           2. warning-* -> Status menunggu/perhatian: Sakit, Menunggu, Belum Lunas, Telat.
           3. danger-*  -> Status negatif/hapus: Alpa, Ditolak, tombol Hapus, tunggakan.
           4. info-*    -> Angka statistik netral (bukan status baik/buruk).
           5. gray-*    -> Teks & border netral (Hapus semua pemakaian slate-*).
           6. dark      -> Teks/tombol gelap (#111827).
           ========================================================================
        */
        brand: {
          50:  '#e8ecf4',
          100: '#d0d8e8',
          400: '#5b7aaa',
          500: '#1b2a4a',
          600: '#1b2a4a',
          700: '#152238',
          800: '#0f1d35',
          900: '#1e3a8a',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50:  '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50:  '#e8ecf4',
          500: '#1b2a4a',
          600: '#1b2a4a',
        },
        dark: '#111827',
      }
    }
  },
  plugins: [],
}
