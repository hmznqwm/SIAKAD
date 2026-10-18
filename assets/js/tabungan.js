/* ============================================================
   tabungan.js - Modul Tabungan Siswa
   Role: ADMIN (kelola semua), BENDAHARA (kelola semua), SISWA (lihat sendiri)
   ============================================================ */

// ---------- API Helper ----------
async function tabunganApi(action, payload = {}) {
  try {
    const token = localStorage.getItem('siakad_token') || '';
    const res = await fetch('api.php?action=' + encodeURIComponent(action), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, token })
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: String(err && err.message || err) };
  }
}

function tabunganRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

function tabunganTgl(str) {
  if (!str) return '-';
  const d = new Date(String(str).replace(' ', 'T'));
  if (isNaN(d.getTime())) return str;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function tabunganToast(message) {
  if (typeof showToast === 'function') { showToast(message); return; }
  const t = document.createElement('div');
  t.className = 'toast-notification toast fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-3 bg-[#1b2a4a] text-white rounded-full shadow-2xl';
  t.innerHTML = '<span class="fa-solid fa-circle-check text-[#5b7aaa]"></span><span class="text-sm font-medium">' + message + '</span>';
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3000);
}

// ---------- Views ----------
function tabunganInjectViews() {
  const area = document.getElementById('mainContentArea');
  if (!area || document.getElementById('view-tabungan-kelola')) return;

  const viewsHTML = `
<div id="view-tabungan-kelola" class="view-section animate-fade-in hidden">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
    <div>
      <h2 class="text-base font-bold text-gray-900 tracking-tight">Tabungan Siswa</h2>
      <p class="text-xs text-[#5b7aaa] mt-0.5">Kelola data tabungan siswa</p>
    </div>
    <div class="flex gap-2">
      <button onclick="tabunganHapusMasal()" id="btn-hapus-masal" class="hidden bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition items-center gap-2 shadow">
        <i class="fas fa-trash-can"></i> Hapus Masal (<span id="tabungan-selected-count">0</span>)
      </button>

      <button onclick="tabunganOpenModal('', '', '', 0, 'setor', true)" class="bg-[#1b2a4a] hover:bg-[#152238] text-white px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow">
        <i class="fas fa-plus"></i> Tambah Tabungan
      </button>
    </div>
  </div>
  <div id="tabungan-stats" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"></div>
  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#f4f6fb]/50">
      <div>
        <h3 class="font-bold text-[#1b2a4a]">Daftar Tabungan</h3>
        <p class="text-xs text-[#5b7aaa] mt-0.5">Pilih siswa untuk melihat data tabungan</p>
      </div>
      <div class="relative">
        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa3c0] text-xs"></i>
        <input id="tabungan-search" oninput="tabunganFilter()" placeholder="Cari nama / NISN / kelas..."
          class="bg-white border border-[#d0d8e8] text-[#152238] text-xs rounded-lg pl-8 pr-3 py-2 font-medium focus:ring-[#5b7aaa] focus:border-[#1b2a4a] shadow-sm outline-none w-56">
      </div>
    </div>
    <div class="tabungan-saya-desktop-table overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-[#f4f6fb] text-[#5b7aaa] text-[10px] uppercase font-semibold">
          <tr>
            <th class="p-4 w-10 hidden md:table-cell"><input type="checkbox" id="tabungan-check-all" onchange="tabunganToggleAll(this)" class="accent-[#1b2a4a] w-4 h-4 cursor-pointer"></th>
            <th class="p-4">Nama Siswa</th>
            <th class="p-4">NISN</th>
            <th class="p-4">Kelas</th>
            <th class="p-4 text-right">Saldo</th>
            <th class="p-4 text-center">Transaksi</th>
          </tr>
        </thead>
        <tbody id="tabungan-body" class="divide-y divide-gray-50 bg-white"></tbody>
      </table>
    </div>
  </div>
</div>

<div id="view-tabungan-saya" class="view-section animate-fade-in hidden">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
    <div>
      <h2 class="text-base font-bold text-gray-900 tracking-tight">Tabungan Saya</h2>
      <p class="text-xs text-[#5b7aaa] mt-0.5">Riwayat setor & penarikan tabungan</p>
    </div>

  </div>
  <div id="tabungan-saya-saldo" class="mb-4"></div>
  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div class="p-4 border-b border-gray-100 bg-[#f4f6fb]/50">
      <h3 class="font-bold text-[#1b2a4a]">Riwayat Transaksi</h3>
    </div>
    <div id="tabungan-saya-mobile-cards" class="sikas-siswa-mobile-cards" aria-live="polite"></div>
    <div class="tabungan-saya-desktop-table overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-[#f4f6fb] text-[#5b7aaa] text-[10px] uppercase font-semibold">
          <tr>
            <th class="p-4">Tanggal</th>
            <th class="p-4">Jenis</th>
            <th class="p-4 text-right">Nominal</th>
            <th class="p-4">Keterangan</th>
          </tr>
        </thead>
        <tbody id="tabungan-saya-body" class="divide-y divide-gray-50 bg-white"></tbody>
      </table>
    </div>
  </div>
</div>

<div id="modal-tabungan-trx" class="fixed inset-0 z-[70] hidden items-center justify-center p-4">
  <div class="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm" onclick="tabunganCloseModal()"></div>
  <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
    <div class="p-5 border-b border-gray-100 flex items-center justify-between">
      <div>
        <h3 id="tabungan-modal-title" class="font-bold text-[#1b2a4a]">Setor Tabungan</h3>
        <p id="tabungan-modal-siswa" class="text-xs text-[#5b7aaa] mt-0.5"></p>
      </div>
      <button onclick="tabunganCloseModal()" class="p-2 hover:bg-[#f4f6fb] rounded-lg text-[#8fa3c0]"><i class="fas fa-times"></i></button>
    </div>
    <div class="p-5 space-y-4">
      <div id="tabungan-modal-pilih" class="hidden">
        <label class="text-xs font-bold text-gray-500 mb-1 block">Pilih Siswa</label>
        <div class="relative" id="tabungan-siswa-combobox">
          <input id="tabungan-modal-siswa-search" type="text" autocomplete="off"
            oninput="tabunganFilterSiswaList(this.value)" onkeydown="tabunganHandleSiswaKey(event)"
            placeholder="Cari nama siswa..."
            class="w-full bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl py-3 pl-4 pr-10 text-sm font-semibold text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8]">
          <i class="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[#8fa3c0] text-xs pointer-events-none"></i>
          <input type="hidden" id="tabungan-modal-siswa-select" value="">
          <div id="tabungan-modal-siswa-list" class="hidden absolute left-0 right-0 top-full mt-1 z-[90] max-h-56 overflow-y-auto rounded-xl border border-[#d0d8e8] bg-white shadow-xl"></div>
        </div>
        <p class="text-[10px] text-[#8fa3c0] mt-1.5">Data siswa sinkron otomatis dari menu Data Siswa</p>
      </div>
      <div>
        <label class="text-xs font-bold text-gray-500 mb-1 block">Jenis Transaksi</label>
        <div class="grid grid-cols-2 gap-2">
          <button id="tabungan-tipe-setor" onclick="tabunganSetTipe('setor')" class="p-3 border-2 border-[#1b2a4a] bg-[#e8ecf4] rounded-xl text-sm font-bold text-[#152238] transition-all">Setor</button>
          <button id="tabungan-tipe-tarik" onclick="tabunganSetTipe('tarik')" class="p-3 border-2 border-transparent bg-white hover:border-[#d0d8e8] rounded-xl text-sm font-bold text-[#8fa3c0] transition-all">Tarik</button>
        </div>
      </div>
      <div>
        <label class="text-xs font-bold text-gray-500 mb-1 block">Nominal (Rp)</label>
        <input id="tabungan-modal-nominal" type="number" min="0" placeholder="0"
          class="w-full bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl py-3 px-4 text-sm font-bold text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8]">
      </div>
      <div>
        <label class="text-xs font-bold text-gray-500 mb-1 block">Keterangan (opsional)</label>
        <input id="tabungan-modal-ket" type="text" placeholder="Misal: Tabungan mingguan"
          class="w-full bg-[#f4f6fb] border border-[#d0d8e8] rounded-xl py-3 px-4 text-sm text-[#152238] focus:outline-none focus:border-[#1b2a4a] focus:ring-2 focus:ring-[#b8c4d8]">
      </div>
      <p id="tabungan-modal-saldo" class="text-xs text-[#5b7aaa] bg-[#f4f6fb] rounded-lg px-3 py-2"></p>
    </div>
    <div class="p-4 bg-[#f4f6fb] flex gap-3 border-t border-gray-100">
      <button onclick="tabunganCloseModal()" class="flex-1 py-2.5 bg-white border border-[#d0d8e8] text-[#152238] font-bold rounded-xl hover:bg-[#f4f6fb] transition-all shadow-sm text-sm">Batal</button>
      <button onclick="tabunganSubmit()" class="flex-1 py-2.5 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold rounded-xl shadow transition-all text-sm active:scale-95">
        <i class="fas fa-check mr-1"></i> Simpan
      </button>
    </div>
  </div>
</div>`;

  area.insertAdjacentHTML('beforeend', viewsHTML);
}

function tabunganShow(viewId, title) {
  document.querySelectorAll('.view-section').forEach(function (el) {
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
    target.classList.add('animate-fade-in');
  }
  const pt = document.getElementById('pageTitle');
  if (pt) pt.textContent = title;
  if (typeof setActiveMenu === 'function') setActiveMenu(title);
  try { if (typeof closeSidebarMobile === 'function') closeSidebarMobile(); } catch (e) {}
}

// ---------- Kelola (Admin & Bendahara) ----------
let tabunganCache = [];

async function tabunganLoad() {
  const role = currentUser ? currentUser.role : '';
  if (role !== 'admin' && role !== 'bendahara') {
    tabunganToast('Akses ditolak');
    return;
  }
  tabunganInjectViews();
  tabunganShow('view-tabungan-kelola', 'Tabungan Siswa');
  const body = document.getElementById('tabungan-body');
  body.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-[#8fa3c0]"><i class="fas fa-circle-notch fa-spin mr-2 text-[#1b2a4a]"></i>Memuat data tabungan...</td></tr>';
  const res = await tabunganApi('getTabunganList');
  if (!res || !res.success) {
    body.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-red-500">' + ((res && res.message) || 'Gagal memuat data') + '</td></tr>';
    return;
  }
  tabunganCache = res.data || [];
  tabunganRender();
}

function tabunganRender() {
  const q = (document.getElementById('tabungan-search')?.value || '').trim().toLowerCase();
  // BUGFIX: hanya tampilkan siswa yang sudah punya tabungan (punyaTabungan = 1)
  const penabungCache = tabunganCache.filter(function (t) { return t.punyaTabungan; });
  const rows = penabungCache.filter(function (t) {
    if (!q) return true;
    return (t.namaSiswa || '').toLowerCase().includes(q) ||
      (t.nisn || '').toLowerCase().includes(q) ||
      (t.kelas || '').toLowerCase().includes(q);
  });

  // Stats
  const statsEl = document.getElementById('tabungan-stats');
  const totalSaldo = penabungCache.reduce(function (a, t) { return a + (t.saldo || 0); }, 0);
  const penabung = penabungCache.length;
  statsEl.innerHTML =
    '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><p class="text-xs text-[#5b7aaa] font-medium">Total Saldo</p><p class="text-base font-extrabold text-[#1b2a4a]">' + tabunganRupiah(totalSaldo) + '</p></div>' +
    '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><p class="text-xs text-[#5b7aaa] font-medium">Jumlah Penabung</p><p class="text-base font-extrabold text-[#1b2a4a]">' + penabung + ' siswa</p></div>' +
    '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><p class="text-xs text-[#5b7aaa] font-medium">Saldo Tertinggi</p><p class="text-base font-extrabold text-[#1b2a4a]">' + (penabungCache.length ? tabunganRupiah(Math.max.apply(null, penabungCache.map(function (t) { return t.saldo || 0; }))) : 'Rp 0') + '</p></div>' +
    '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><p class="text-xs text-[#5b7aaa] font-medium">Data Tampil</p><p class="text-base font-extrabold text-[#1b2a4a]">' + rows.length + ' siswa</p></div>';

  const body = document.getElementById('tabungan-body');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-[#8fa3c0]"><i class="fas fa-piggy-bank text-lg mb-2 block opacity-40"></i>Belum ada data tabungan. Lakukan transaksi pertama untuk membuat tabungan siswa.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(function (t) {
    const isAlumni = String(t.statusSiswa || '').toLowerCase() === 'alumni';
    const alumniTag = isAlumni ? ' <span class="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full font-bold align-middle">Alumni</span>' : '';
    const isSelected = tabunganSelected.has(String(t.siswaId));
    return `<tr class="hover:bg-[#f4f6fb]/50 transition-colors select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-siswa="${t.siswaId}" data-id="${t.siswaId}" data-type="tabungan">
      <td class="p-4 tabungan-col-checkbox hidden md:table-cell" data-label="Pilih"><input type="checkbox" class="tabungan-check accent-[#1b2a4a] w-4 h-4 cursor-pointer" value="${t.siswaId}" ${isSelected ? 'checked' : ''} onchange="tabunganUpdateSelection()"></td>
      <td class="p-4 font-bold text-[#152238]" data-label="Nama Siswa" data-kelas="${t.kelas || '-'}"><span class="tabungan-name-text">${t.namaSiswa || '-'}</span><span class="tabungan-mobile-kelas">${t.kelas || '-'}</span>${alumniTag}</td>
      <td class="p-4 text-[#5b7aaa]" data-label="NISN">${t.nisn || '-'}</td>
      <td class="p-4" data-label="Kelas"><span class="px-2.5 py-1 bg-[#e8ecf4] text-[#152238] rounded-lg text-xs font-bold">${t.kelas || '-'}</span></td>
      <td class="p-4 text-right font-extrabold text-[#1b2a4a]" data-label="Saldo">${tabunganRupiah(t.saldo)}</td>
      <td class="p-4 text-center tabungan-col-aksi" data-label="Transaksi">
        <div class="tabungan-actions flex items-center justify-center gap-1.5 flex-wrap">
          <button onclick="tabunganOpenModal('${t.siswaId}', 'setor')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 active:scale-95 cursor-pointer tabungan-action-btn tabungan-action-setor">
            <i class="fas fa-arrow-down text-[10px]"></i> Setor
          </button>
          <button onclick="tabunganOpenModal('${t.siswaId}', 'tarik')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 active:scale-95 cursor-pointer tabungan-action-btn tabungan-action-tarik">
            <i class="fas fa-arrow-up text-[10px]"></i> Tarik
          </button>
          <button onclick="tabunganShowRiwayat('${t.siswaId}')" class="px-3 py-1.5 bg-[#1b2a4a] hover:bg-[#152238] active:bg-[#0f172a] text-white rounded-lg text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 active:scale-95 cursor-pointer tabungan-action-btn tabungan-action-riwayat">
            <i class="fas fa-clock-rotate-left text-[10px]"></i> Riwayat
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function tabunganFilter() { tabunganRender(); }

// ---------- Seleksi Massal ----------
let tabunganSelected = new Set();

function tabunganUpdateSelection() {
  tabunganSelected = new Set();
  document.querySelectorAll('.tabungan-check:checked').forEach(function (cb) {
    tabunganSelected.add(cb.value);
  });
  const btn = document.getElementById('btn-hapus-masal');
  const count = document.getElementById('tabungan-selected-count');
  if (count) count.textContent = tabunganSelected.size;
  if (btn) {
    if (tabunganSelected.size === 0) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  }
}

// Dipakai oleh mode-pilih tekan-tahan (long press) di HP -- lihat ui-fixes.js
function toggleTabunganRow(id, checked) {
  const cb = document.querySelector('.tabungan-check[value="' + id + '"]');
  if (cb) cb.checked = checked;
  const tr = cb ? cb.closest('tr') : document.querySelector('.select-row-target[data-type="tabungan"][data-id="' + id + '"]');
  if (tr) {
    if (checked) {
      tr.classList.add('bg-blue-50/60', 'selected-row', 'border-l-4', 'border-l-[#1b2a4a]');
      tr.classList.remove('border-l-transparent');
    } else {
      tr.classList.remove('bg-blue-50/60', 'selected-row', 'border-l-4', 'border-l-[#1b2a4a]');
      tr.classList.add('border-l-transparent');
    }
  }
  tabunganUpdateSelection();
}

function tabunganToggleAll(el) {
  document.querySelectorAll('.tabungan-check').forEach(function (cb) {
    cb.checked = el.checked;
  });
  tabunganUpdateSelection();
}

function tabunganHapusMasal() {
  if (tabunganSelected.size === 0) {
    tabunganToast('Pilih siswa terlebih dahulu');
    return;
  }
  Swal.fire({
    title: 'Hapus ' + tabunganSelected.size + ' Tabungan?',
    html: 'Tabungan dan seluruh riwayat transaksi siswa terpilih akan <b>dihapus permanen</b>.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '<i class="fas fa-trash"></i> Ya, Hapus Semua',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    reverseButtons: true
  }).then(async function (result) {
    if (!result.isConfirmed) return;
    const res = await tabunganApi('hapusTabunganMasal', { siswaIds: Array.from(tabunganSelected) });
    if (res && res.success) {
      tabunganToast(res.message);
      tabunganLoad();
    } else {
      tabunganToast((res && res.message) || 'Gagal menghapus');
    }
  });
}

function tabunganHapusSatu(siswaId, nama) {
  Swal.fire({
    title: 'Hapus Tabungan?',
    html: 'Tabungan <b>' + nama + '</b> dan riwayat transaksinya akan <b>dihapus permanen</b>.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '<i class="fas fa-trash"></i> Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    reverseButtons: true
  }).then(async function (result) {
    if (!result.isConfirmed) return;
    const res = await tabunganApi('hapusTabungan', { siswaId: siswaId });
    if (res && res.success) {
      tabunganToast(res.message);
      tabunganLoad();
    } else {
      tabunganToast((res && res.message) || 'Gagal menghapus');
    }
  });
}

// ---------- Riwayat per Siswa ----------
async function tabunganShowRiwayat(siswaId, nama) {
  const row = tabunganCache.find(function (t) { return String(t.siswaId) === String(siswaId); });
  if (row && !nama) {
    nama = row.namaSiswa;
  }
  if (!nama) nama = 'Siswa';

  const res = await tabunganApi('getTabunganRiwayat', { siswaId: siswaId });
  const list = (res && res.success) ? (res.data || []) : [];
  if (!res || !res.success) {
    tabunganToast((res && res.message) || 'Gagal memuat riwayat');
    return;
  }
  const rows = list.map(function (r, i) {
    const isSetor = r.tipe === 'setor';
    const badge = isSetor
      ? '<span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-md border border-emerald-200/60"><i class="fas fa-arrow-down text-[9px]"></i> Setor</span>'
      : '<span class="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-md border border-rose-200/60"><i class="fas fa-arrow-up text-[9px]"></i> Tarik</span>';
    const saldoAfter = (typeof r.saldo === 'number') ? tabunganRupiah(r.saldo) : '-';
    return '<tr class="border-b border-gray-100 last:border-b-0 hover:bg-[#f4f6fb]/60 transition-colors">' +
      '<td class="px-4 py-3 text-center text-gray-400 text-xs border-r border-gray-100">' + (i + 1) + '</td>' +
      '<td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap border-r border-gray-100 font-semibold">' + tabunganTgl(r.tanggal) + '</td>' +
      '<td class="px-4 py-3 border-r border-gray-100">' + badge + '</td>' +
      '<td class="px-4 py-3 text-right font-extrabold ' + (isSetor ? 'text-emerald-600' : 'text-rose-600') + ' text-sm whitespace-nowrap border-r border-gray-100">' + (isSetor ? '+' : '-') + tabunganRupiah(r.nominal) + '</td>' +
      '<td class="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap border-r border-gray-100">' + saldoAfter + '</td>' +
      '<td class="px-4 py-3 text-gray-600 text-xs">' + (r.keterangan || '-') + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="6" class="py-12 text-center text-[#8fa3c0] text-xs"><i class="fas fa-inbox text-lg block mb-2 text-gray-200"></i>Belum ada transaksi untuk siswa ini.</td></tr>';

  const saldo = list.length ? list[0].saldo : 0;
  const totalSetor = list.filter(r => r.tipe === 'setor').reduce((a, r) => a + (parseFloat(r.nominal) || 0), 0);
  const totalTarik = list.filter(r => r.tipe !== 'setor').reduce((a, r) => a + (parseFloat(r.nominal) || 0), 0);
  const fmtShort = v => v >= 1000000 ? 'Rp' + (v / 1000000).toFixed(1).replace('.', ',') + ' jt' : tabunganRupiah(v);
  const statCard = (label, val, icon, cls) =>
    '<div class="flex-1 min-w-[110px] bg-white border border-[#d0d8e8] rounded-xl px-3 py-2.5">' +
    '<div class="flex items-center gap-1.5 text-[9px] font-bold text-[#5b7aaa] uppercase tracking-wider"><i class="fas ' + icon + ' text-[9px]"></i> ' + label + '</div>' +
    '<p class="text-sm font-black ' + cls + ' mt-1 truncate">' + val + '</p></div>';

  showModal(`
    <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div class="px-6 py-4 bg-[#1b2a4a] flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-white/20"><i class="fas fa-clock-rotate-left text-white text-sm"></i></div>
          <div>
            <h3 class="text-sm font-bold text-white">Riwayat Tabungan</h3>
            <p class="text-[11px] text-[#a0b0cc]">${nama}</p>
          </div>
        </div>
        <button onclick="closeModal()" class="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"><i class="fas fa-times"></i></button>
      </div>
      <div class="p-5 bg-[#f4f6fb]/60 border-b border-[#d0d8e8]">
        <div class="flex flex-wrap gap-2.5">
          ${statCard('Saldo Saat Ini', tabunganRupiah(saldo), 'fa-piggy-bank', 'text-[#1b2a4a]')}
          ${statCard('Total Setor', fmtShort(totalSetor), 'fa-arrow-down', 'text-emerald-600')}
          ${statCard('Total Tarik', fmtShort(totalTarik), 'fa-arrow-up', 'text-rose-600')}
          ${statCard('Transaksi', list.length + 'x', 'fa-receipt', 'text-[#1b2a4a]')}
        </div>
      </div>
      <div class="overflow-x-auto max-h-[45vh] overflow-y-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-[#e8ecf4] text-[#3d5478] text-[10px] uppercase font-bold sticky top-0 z-10">
            <tr>
              <th class="p-3 text-center w-10 border-r border-[#d0d8e8]">No</th>
              <th class="p-3 border-r border-[#d0d8e8]">Tanggal</th>
              <th class="p-3 border-r border-[#d0d8e8]">Jenis</th>
              <th class="p-3 text-right border-r border-[#d0d8e8]">Nominal</th>
              <th class="p-3 text-right border-r border-[#d0d8e8]">Saldo</th>
              <th class="p-3">Keterangan</th>
            </tr>
          </thead>
          <tbody class="bg-white">${rows}</tbody>
        </table>
      </div>
      <div class="px-5 py-3 bg-[#f4f6fb]/60 border-t border-[#d0d8e8] flex items-center justify-between">
        <span class="text-[10px] font-semibold text-[#5b7aaa]"><i class="fas fa-user-shield mr-1"></i>Petugas terakhir: ${list.length ? (list[0].petugas || '-') : '-'}</span>
        <span class="text-[10px] font-semibold text-[#5b7aaa]">${list.length} transaksi</span>
      </div>
    </div>`, 'max-w-2xl');
}

// ---------- Modal Transaksi ----------
let tabunganModalState = { siswaId: '', saldo: 0, tipe: 'setor', isNew: false };

function tabunganOpenModal(siswaId, nama, kelas, saldo, tipe, isNew) {
  tabunganInjectViews();
  const pickWrap = document.getElementById('tabungan-modal-pilih');
  const sel = document.getElementById('tabungan-modal-siswa-select');
  const search = document.getElementById('tabungan-modal-siswa-search');
  const list = document.getElementById('tabungan-modal-siswa-list');

  // Flexible argument overload for shorthand calls e.g. tabunganOpenModal(siswaId, 'setor')
  if (typeof nama === 'string' && (nama === 'setor' || nama === 'tarik') && (kelas === undefined || typeof kelas === 'boolean')) {
    isNew = !!kelas;
    tipe = nama;
    nama = '';
    kelas = '';
    saldo = 0;
  }

  const row = tabunganCache.find(function (t) { return String(t.siswaId) === String(siswaId); });
  if (row) {
    if (!nama) nama = row.namaSiswa;
    if (!kelas) kelas = row.kelas;
    if (saldo === undefined || saldo === null || typeof saldo !== 'number' || saldo === 0) saldo = Number(row.saldo || 0);
  }

  tabunganModalState = {
    siswaId: String(siswaId || ''),
    saldo: Number(saldo || 0),
    tipe: tipe === 'tarik' ? 'tarik' : 'setor',
    isNew: !!isNew
  };

  // Semua transaksi dari tombol "Tambah Tabungan" wajib memilih siswa.
  // Siswa yang sudah punya tabungan tetap harus tersedia agar bisa ditarik.
  if (tabunganModalState.isNew) {
    pickWrap.classList.remove('hidden');
    sel.value = '';
    search.value = '';
    list.classList.add('hidden');
    // Jangan tampilkan daftar saat modal baru dibuka.
    list.innerHTML = '';
    list.classList.add('hidden');
    document.getElementById('tabungan-modal-siswa').textContent = 'Pilih siswa untuk setor atau tarik tabungan';
  } else {
    pickWrap.classList.add('hidden');
    sel.value = String(siswaId || '');
    search.value = nama || '';
    document.getElementById('tabungan-modal-siswa').textContent = (nama || 'Siswa') + ' — ' + (kelas || '-');
  }

  document.getElementById('tabungan-tipe-tarik').disabled = false;
  document.getElementById('tabungan-modal-title').textContent = tabunganModalState.tipe === 'tarik' ? 'Tarik Tabungan' : 'Setor Tabungan';
  document.getElementById('tabungan-modal-nominal').value = '';
  document.getElementById('tabungan-modal-ket').value = '';
  tabunganRenderModal();

  const modal = document.getElementById('modal-tabungan-trx');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (tabunganModalState.isNew) sel.focus();
  else document.getElementById('tabungan-modal-nominal').focus();
}

function tabunganCloseModal() {
  const modal = document.getElementById('modal-tabungan-trx');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// ---------- Combobox Siswa ----------
function tabunganSiswaListData() {
  return tabunganCache.slice();
}

function tabunganRenderSiswaList(query) {
  const list = document.getElementById('tabungan-modal-siswa-list');
  if (!list) return;
  const q = (query || '').trim().toLowerCase();

  // Dropdown hanya boleh muncul setelah pengguna mulai mengetik.
  if (!q) {
    list.innerHTML = '';
    list.classList.add('hidden');
    return;
  }

  const rows = tabunganSiswaListData().filter(function (t) {
    return (t.namaSiswa || '').toLowerCase().includes(q);
  });
  if (!rows.length) {
    list.innerHTML = '<div class="px-4 py-3 text-center text-[#8fa3c0] text-xs">Siswa tidak ditemukan</div>';
    list.classList.remove('hidden');
    return;
  }
  const visibleRows = rows.slice(0, 8);
  list.innerHTML = visibleRows.map(function (t) {
    const id = String(t.siswaId).replace(/'/g, "\\'");
    const nama = String(t.namaSiswa || 'Tanpa Nama').replace(/'/g, "\\'");
    const kelas = String(t.kelas || '-').replace(/'/g, "\\'");
    return '<button type="button" onclick="tabunganPilihSiswa(\'' + id + '\', \'' + nama + '\', \'' + kelas + '\')" class="w-full text-left px-4 py-3 hover:bg-[#e8ecf4] dark:hover:bg-slate-700 transition-colors flex items-center gap-3">' +
      '<div class="w-8 h-8 rounded-lg bg-[#1b2a4a] text-white flex items-center justify-center text-xs font-bold shrink-0">' + nama.charAt(0).toUpperCase() + '</div>' +
      '<div class="min-w-0 flex-1 text-sm font-bold text-[#152238] dark:text-slate-100 truncate">' + nama + '</div></button>';
  }).join('');
  if (rows.length > 8) {
    list.insertAdjacentHTML('beforeend', '<div class="px-4 py-2 text-center text-[10px] text-[#8fa3c0] border-t border-[#edf1f7] dark:border-slate-700">Ketik nama untuk mempersempit hasil</div>');
  }
  list.classList.remove('hidden');
}

if (!window.__tabunganComboBound) {
  window.__tabunganComboBound = true;
  document.addEventListener('click', function (ev) {
    const box = document.getElementById('tabungan-siswa-combobox');
    const list = document.getElementById('tabungan-modal-siswa-list');
    if (box && list && !box.contains(ev.target)) list.classList.add('hidden');
  });
}

function tabunganOpenSiswaList() {
  const el = document.getElementById('tabungan-modal-siswa-search');
  const value = el ? el.value : '';
  if (value.trim()) tabunganRenderSiswaList(value);
}

function tabunganHandleSiswaKey(ev) {
  if (ev.key === 'Escape') {
    const list = document.getElementById('tabungan-modal-siswa-list');
    if (list) list.classList.add('hidden');
  }
}

function tabunganFilterSiswaList(query) {
  tabunganRenderSiswaList(query);
}

function tabunganPilihSiswa(siswaId, nama, kelas) {
  const id = String(siswaId || '');
  const row = tabunganCache.find(function (t) { return String(t.siswaId) === id; });
  tabunganModalState.siswaId = id;
  tabunganModalState.saldo = row ? Number(row.saldo || 0) : 0;
  const sel = document.getElementById('tabungan-modal-siswa-select');
  if (sel) sel.value = id;
  const search = document.getElementById('tabungan-modal-siswa-search');
  if (search) search.value = (nama || (row && row.namaSiswa) || '');
  const list = document.getElementById('tabungan-modal-siswa-list');
  if (list) list.classList.add('hidden');
  document.getElementById('tabungan-modal-siswa').textContent = (nama || row && row.namaSiswa || 'Siswa') + ' — ' + (kelas || row && row.kelas || '-');
  tabunganRenderModal();
  document.getElementById('tabungan-modal-nominal').focus();
}

function tabunganOnSiswaChange(select) {
  const id = String(select && select.value || '');
  if (!id) {
    tabunganModalState.siswaId = '';
    tabunganModalState.saldo = 0;
    document.getElementById('tabungan-modal-siswa').textContent = 'Pilih siswa untuk setor atau tarik tabungan';
    tabunganRenderModal();
    return;
  }
  const row = tabunganCache.find(function (t) { return String(t.siswaId) === id; });
  tabunganModalState.siswaId = id;
  tabunganModalState.saldo = row ? Number(row.saldo || 0) : 0;
  document.getElementById('tabungan-modal-siswa').textContent = (row.namaSiswa || 'Siswa') + ' — ' + (row.kelas || '-');
  const search = document.getElementById('tabungan-modal-siswa-search');
  if (search) search.value = (row.namaSiswa || '');
  tabunganRenderModal();
}

function tabunganSetTipe(tipe) {
  tabunganModalState.tipe = tipe;
  tabunganRenderModal();
}

function tabunganRenderModal() {
  const isTarik = tabunganModalState.tipe === 'tarik';
  document.getElementById('tabungan-modal-title').textContent = isTarik ? 'Tarik Tabungan' : 'Setor Tabungan';
  document.getElementById('tabungan-tipe-setor').className = !isTarik
    ? 'p-3 border-2 border-[#1b2a4a] bg-[#e8ecf4] rounded-xl text-sm font-bold text-[#152238] transition-all'
    : 'p-3 border-2 border-transparent bg-white hover:border-[#d0d8e8] rounded-xl text-sm font-bold text-[#8fa3c0] transition-all';
  document.getElementById('tabungan-tipe-tarik').className = isTarik
    ? 'p-3 border-2 border-[#1b2a4a] bg-[#e8ecf4] rounded-xl text-sm font-bold text-[#152238] transition-all'
    : 'p-3 border-2 border-transparent bg-white hover:border-[#d0d8e8] rounded-xl text-sm font-bold text-[#8fa3c0] transition-all';
  document.getElementById('tabungan-modal-saldo').textContent = 'Saldo saat ini: ' + tabunganRupiah(tabunganModalState.saldo);
}

async function tabunganSubmit() {
  let siswaId = tabunganModalState.siswaId;
  if (tabunganModalState.isNew) {
    siswaId = document.getElementById('tabungan-modal-siswa-select').value;
    if (!siswaId) {
      tabunganToast('Pilih siswa terlebih dahulu');
      return;
    }
  }
  const nominal = parseFloat(document.getElementById('tabungan-modal-nominal').value);
  if (!nominal || nominal <= 0) {
    tabunganToast('Masukkan nominal yang valid');
    return;
  }
  if (tabunganModalState.tipe === 'tarik' && nominal > tabunganModalState.saldo) {
    tabunganToast('Saldo tidak mencukupi');
    return;
  }
  const ket = document.getElementById('tabungan-modal-ket').value.trim();
  const btn = document.querySelector('#modal-tabungan-trx .bg-\\[\\#1b2a4a\\]');
  if (btn) btn.disabled = true;
  const res = await tabunganApi('tabunganTransaksi', {
    siswaId: siswaId,
    tipe: tabunganModalState.tipe,
    nominal: nominal,
    keterangan: ket || (tabunganModalState.isNew ? 'Tabungan baru' : '')
  });
  if (btn) btn.disabled = false;
  if (res && res.success) {
    tabunganCloseModal();
    tabunganToast((tabunganModalState.tipe === 'tarik' ? 'Penarikan' : 'Setoran') + ' berhasil');
    tabunganLoad();
  } else {
    tabunganToast((res && res.message) || 'Gagal simpan transaksi');
  }
}

// ---------- Siswa: Tabungan Saya ----------
async function tabunganLoadSaya() {
  tabunganInjectViews();
  tabunganShow('view-tabungan-saya', 'Tabungan Saya');
  const saldoEl = document.getElementById('tabungan-saya-saldo');
  const body = document.getElementById('tabungan-saya-body');
  const mobile = document.getElementById('tabungan-saya-mobile-cards');
  saldoEl.innerHTML = '<div class="sikas-siswa-balance-card loading"><i class="fas fa-circle-notch fa-spin"></i></div>';
  body.innerHTML = '';
  if (mobile) mobile.innerHTML = '<div class="sikas-siswa-mobile-loading"><i class="fas fa-circle-notch fa-spin"></i><span>Memuat tabungan...</span></div>';
  const res = await tabunganApi('getTabunganSaya');
  if (!res || !res.success) {
    saldoEl.innerHTML = '<div class="sikas-siswa-balance-card error"><i class="fas fa-circle-exclamation"></i><span>' + ((res && res.message) || 'Gagal memuat data') + '</span></div>';
    if (mobile) mobile.innerHTML = '<div class="sikas-siswa-mobile-empty error"><i class="fas fa-circle-exclamation"></i><span>' + ((res && res.message) || 'Gagal memuat data') + '</span></div>';
    return;
  }
  saldoEl.innerHTML = '<div class="sikas-siswa-balance-card"><div><p>Saldo Tabungan</p><strong>' + tabunganRupiah(res.saldo) + '</strong><span>Saldo milik Anda</span></div><div class="sikas-siswa-balance-icon"><i class="fas fa-piggy-bank"></i></div></div>';
  const list = res.transaksi || [];
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="4" class="py-10 text-center text-[#8fa3c0]"><i class="fas fa-piggy-bank text-lg mb-2 block opacity-40"></i>Belum ada transaksi tabungan</td></tr>';
    if (mobile) mobile.innerHTML = '<div class="sikas-siswa-mobile-empty"><i class="fas fa-piggy-bank"></i><span>Belum ada transaksi tabungan.</span></div>';
    return;
  }
  body.innerHTML = list.map(function (t) {
    const isSetor = t.tipe === 'setor';
    return '<tr class="hover:bg-[#f4f6fb]/50 transition-colors"><td class="p-4 text-[#5b7aaa] text-xs">' + tabunganTgl(t.tanggal) + '</td><td class="p-4">' + (isSetor ? '<span class="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">Setor</span>' : '<span class="px-2.5 py-1 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold">Tarik</span>') + '</td><td class="p-4 text-right font-bold ' + (isSetor ? 'text-emerald-600' : 'text-rose-500') + '">' + (isSetor ? '+' : '-') + ' ' + tabunganRupiah(t.nominal) + '</td><td class="p-4 text-xs text-[#8fa3c0]">' + (t.keterangan || '-') + '</td></tr>';
  }).join('');
  if (mobile) mobile.innerHTML = list.map(function (t) {
    const isSetor = t.tipe === 'setor';
    return '<article class="sikas-siswa-card tabungan-siswa-card"><div class="sikas-siswa-card-head"><div class="sikas-siswa-card-title"><i class="fas fa-calendar-day mr-1.5 opacity-60"></i>' + tabunganTgl(t.tanggal) + '</div><span class="sikas-siswa-status ' + (isSetor ? 'paid' : 'withdraw') + '">' + (isSetor ? '<i class="fas fa-arrow-down"></i> Setor' : '<i class="fas fa-arrow-up"></i> Tarik') + '</span></div><div class="tabungan-siswa-card-row"><div class="sikas-siswa-card-amount ' + (isSetor ? 'positive' : 'negative') + '">' + (isSetor ? '+' : '-') + ' ' + tabunganRupiah(t.nominal) + '</div><div class="tabungan-siswa-card-ket"><span>Keterangan</span><b>' + (t.keterangan || '-') + '</b></div></div></article>';
  }).join('');
}