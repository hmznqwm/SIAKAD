// sikas/util.js
// Helper dasar SIKAS (SPP/Tabungan): pemanggil API, format Rupiah/tanggal, toast notifikasi.
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

/* ============================================================
   sikas.js - Modul Manajemen Pembayaran SPP (SIKAS)
   Diintegrasikan ke SIAKAD - khusus role ADMIN
   ============================================================ */

// ---------- API Helper (POST JSON ke api.php) ----------
async function sikasApi(action, payload = {}) {
  try {
    // Selalu sertakan token autentikasi di setiap request SIKAS
    const token = localStorage.getItem('siakad_token') || '';
    const res = await fetch('api.php?action=' + encodeURIComponent(action) + '&_=' + Date.now(), {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ ...payload, token })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: String(err && err.message || err) };
  }
}

// ---------- Sinkronisasi lintas menu SIKAS ----------
// Setelah data keuangan berubah, semua menu yang sedang aktif diperbarui
// tanpa perlu reload halaman.
function sikasRefreshActiveView() {
  try {
    const active = document.querySelector('.view-section.active');
    if (!active) return Promise.resolve();
    const id = active.id;
    if (id === 'view-sikas-tagihan' && typeof sikasLoadTagihan === 'function') return sikasLoadTagihan();
    if (id === 'view-sikas-kasir' && typeof sikasRenderKasirBills === 'function') {
      if (typeof sikasKasirStudent !== 'undefined' && sikasKasirStudent) {
        return sikasLoadData().then(function () { sikasRenderKasirBills(); });
      }
    }
    if (id === 'view-sikas-dashboard' && typeof sikasRenderDashboard === 'function') return sikasRenderDashboard();
    if (id === 'view-sikas-riwayat' && typeof sikasRenderRiwayat === 'function') return sikasRenderRiwayat();
  } catch (e) { console.warn('SIKAS refresh view:', e); }
  return Promise.resolve();
}

async function sikasRefreshAfterMutation() {
  await sikasLoadData();
  await sikasRefreshActiveView();
}

// ---------- Format Helpers ----------
function sikasRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}
function sikasDate(str) {
  if (!str) return '-';
  const d = new Date(String(str).replace(' ', 'T'));
  if (isNaN(d.getTime())) return str;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
function sikasDaysOverdue(jatuhTempo) {
  const now = new Date();
  const due = new Date(jatuhTempo);
  const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
// ---------- Sinkronisasi Filter "Jenis Tagihan" ----------
// Sumber tunggal (single source of truth) untuk semua dropdown filter jenis
// tagihan di seluruh menu SIKAS (Manajemen Tagihan, Riwayat, Dashboard) adalah
// tabel master_tagihan (dikelola di menu "Tagihan"). Fungsi ini SELALU
// mengambil ulang & membangun ulang <option> dari master supaya jenis yang
// baru ditambah/diubah/dihapus di menu Tagihan langsung tersinkron di menu
// lain -- bukan hanya sekali saat pertama kali dropdown dirender.
async function sikasPopulateJenisSelect(selectId, allLabel) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    const masters = await sikasApi('getMasterTagihan');
    const list = Array.isArray(masters) ? masters : [];
    const currentVal = sel.value;
    let html = '<option value="">' + (allLabel || 'Semua Jenis Tagihan') + '</option>';
    list.forEach(function (m) {
      const nama = m.NamaTagihan || '';
      if (!nama) return;
      html += '<option value="' + nama.replace(/"/g, '&quot;') + '">' + nama + '</option>';
    });
    sel.innerHTML = html;
    // Pertahankan pilihan sebelumnya jika jenisnya masih ada di master
    if (currentVal && list.some(function (m) { return m.NamaTagihan === currentVal; })) {
      sel.value = currentVal;
    }
  } catch (e) { /* biarkan dropdown apa adanya jika gagal memuat */ }
}

function sikasToast(message) {
  if (typeof showToast === 'function') { showToast(message); return; }
  let t = document.querySelector('.toast-notification');
  if (t) t.remove();
  t = document.createElement('div');
  t.className = 'toast-notification toast fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-3 bg-[#1b2a4a] text-white rounded-full shadow-2xl';
  t.innerHTML = '<span class="fa-solid fa-circle-check text-[#5b7aaa]"></span><span class="text-sm font-medium">' + message + '</span>';
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3000);
}

// ---------- Views (injected ke #mainContentArea) ----------
