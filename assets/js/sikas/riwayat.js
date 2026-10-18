// sikas/riwayat.js
// Modul Riwayat Transaksi: render & filter riwayat, cetak resi, hapus riwayat.
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

var _sikasRawTransactions = [];
var _sikasFilteredTransactions = [];
var _sikasRiwayatPage = 1;
var _sikasRiwayatLimit = 10;
// Set ID transaksi terpilih untuk hapus massal (samakan pola dgn menu Data Siswa:
// checkbox di desktop, tekan-tahan/long-press di HP -- lihat mobileSelectRegistry
// di ui-fixes.js utk registrasi type "riwayat").
var _sikasSelectedRiwayat = new Set();

async function sikasRenderRiwayat() {
  // Sinkronkan dropdown Jenis Tagihan dgn Master Jenis Tagihan (menu "Tagihan")
  // setiap kali halaman Riwayat dimuat.
  sikasPopulateJenisSelect('sikas-riwayat-jenis');
  const [trx, students] = await Promise.all([
    sikasApi('getTransactions'),
    sikasApi('getStudents')
  ]);
  _sikasRawTransactions = Array.isArray(trx) ? trx : [];
  sikasStudents = (Array.isArray(students) ? students : []).map(sikasNormalizeStudent);
  
  // Hitung stats
  const totalTrxCount = _sikasRawTransactions.length;
  const totalIncome = _sikasRawTransactions.reduce((acc, t) => acc + (Number(t.Nominal) || 0), 0);
  
  const todayStr = (typeof siakadTodayStr === 'function') ? siakadTodayStr() : new Date().toISOString().split('T')[0];
  const todayTrx = _sikasRawTransactions.filter(t => {
    if (!t.Tanggal) return false;
    const tDate = String(t.Tanggal).split('T')[0];
    return tDate === todayStr;
  });
  const todayIncome = todayTrx.reduce((acc, t) => acc + (Number(t.Nominal) || 0), 0);

  const statsContainer = document.getElementById('sikas-riwayat-stats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <span class="inline-flex items-center gap-2 bg-[#e8ecf4] border border-[#d0d8e8] rounded-full px-3.5 py-1.5 text-[11px]">
        <i class="fas fa-receipt text-[#1b2a4a] text-[10px]"></i>
        <b class="text-base text-[#152238] leading-none">${totalTrxCount}</b>
        <span class="font-bold text-[#1b2a4a] uppercase tracking-wider text-[10px]">Transaksi</span>
      </span>
      <span class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1.5 text-[11px]">
        <i class="fas fa-wallet text-emerald-600 text-[10px]"></i>
        <b class="text-base text-emerald-700 leading-none">${sikasRupiah(totalIncome)}</b>
        <span class="font-bold text-emerald-600 uppercase tracking-wider text-[10px]">Pemasukan</span>
      </span>
      <span class="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3.5 py-1.5 text-[11px]">
        <i class="fas fa-calendar-check text-amber-600 text-[10px]"></i>
        <b class="text-base text-amber-700 leading-none">${todayTrx.length} (${sikasRupiah(todayIncome)})</b>
        <span class="font-bold text-amber-600 uppercase tracking-wider text-[10px]">Hari Ini</span>
      </span>
    `;
  }
  
  _sikasRiwayatPage = 1;
  _sikasSelectedRiwayat.clear();
  sikasUpdateRiwayatBulkUI();
  sikasFilterRiwayatClient();
}

function sikasFilterRiwayatClient() {
  const searchQ = (document.getElementById('sikas-riwayat-search')?.value || '').toLowerCase();
  const startD = document.getElementById('sikas-riwayat-start')?.value || '';
  const endD = document.getElementById('sikas-riwayat-end')?.value || '';
  const filterMetode = document.getElementById('sikas-riwayat-metode')?.value || '';
  const filterJenis = document.getElementById('sikas-riwayat-jenis')?.value || '';
  
  _sikasFilteredTransactions = _sikasRawTransactions.filter(t => {
    const namaSiswa = (t.NamaSiswa || ('siswa #' + t.SiswaID)).toLowerCase();
    
    // Search
    if (searchQ && !namaSiswa.includes(searchQ)) return false;
    
    // Date
    if (t.Tanggal) {
      const tDate = String(t.Tanggal).split('T')[0];
      if (startD && tDate < startD) return false;
      if (endD && tDate > endD) return false;
    } else if (startD || endD) {
      return false;
    }
    
    // Method
    if (filterMetode && String(t.MetodeBayar || '').toLowerCase() !== filterMetode.toLowerCase()) return false;

    // Jenis Tagihan (satu transaksi bisa mencakup beberapa jenis sekaligus,
    // dipisah ", " di kolom Kategori -- lihat handlers-keuangan.php::getTransactions)
    if (filterJenis) {
      const kategoriList = String(t.Kategori || '').split(',').map(k => k.trim());
      if (!kategoriList.includes(filterJenis)) return false;
    }
    
    return true;
  });
  
  sikasRenderRiwayatPage();
}

function sikasRenderRiwayatPage() {
  const tbody = document.getElementById('sikas-riwayat-body');
  if (!tbody) return;
  
  const total = _sikasFilteredTransactions.length;
  const totalPages = Math.ceil(total / _sikasRiwayatLimit) || 1;
  if (_sikasRiwayatPage > totalPages) _sikasRiwayatPage = totalPages;
  if (_sikasRiwayatPage < 1) _sikasRiwayatPage = 1;
  
  const startIdx = (_sikasRiwayatPage - 1) * _sikasRiwayatLimit;
  const endIdx = startIdx + _sikasRiwayatLimit;
  const paged = _sikasFilteredTransactions.slice(startIdx, endIdx);
  
  let rows = '';
  paged.forEach(function (t) {
    const namaTampil = t.NamaSiswa || ('Siswa #' + t.SiswaID);
    const isAlumni = String(t.StatusSiswa || '').toLowerCase() === 'alumni';
    const alumniTag = isAlumni ? ' <span class="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-full font-bold align-middle">Alumni</span>' : '';

    let methodBadge = '';
    const mStr = String(t.MetodeBayar || 'Tunai').toLowerCase();
    if (mStr === 'tunai') {
      methodBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8ecf4] text-[#152238] border border-[#d0d8e8]"><i class="fas fa-money-bill-wave text-[10px] text-[#1b2a4a]"></i>Tunai</span>';
    } else if (mStr === 'transfer') {
      methodBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8ecf4] text-[#152238] border border-[#d0d8e8]"><i class="fas fa-credit-card text-[10px] text-[#1b2a4a]"></i>Transfer</span>';
    } else { // QRIS
      methodBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e8ecf4] text-[#152238] border border-[#d0d8e8]"><i class="fas fa-qrcode text-[10px] text-[#1b2a4a]"></i>QRIS</span>';
    }

    const rowId = String(t.ID);
    const isSelected = _sikasSelectedRiwayat.has(rowId);

    // Kolom checkbox/Metode/Resi disembunyikan di HP (lihat style.css "RESPONSIVE:
    // Tabel Riwayat & Cetak Resi (sikas-riwayat)") -- di HP tabel diubah jadi
    // tampilan kartu (setiap baris = 1 kartu) via CSS `content: attr(data-label)`,
    // makanya tiap <td> di bawah diberi atribut data-label. Hapus data di HP
    // dilakukan lewat tekan-tahan baris (sama seperti Data Siswa), lalu tombol
    // "Hapus" massal yang muncul di header.
    rows += '<tr class="hover:bg-[#f4f6fb]/50 transition-colors select-row-target ' + (isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent') + '" data-id="' + rowId + '" data-type="riwayat">' +
      '<td class="p-3 text-center riwayat-col-checkbox"><input type="checkbox" class="riwayat-check w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" value="' + rowId + '" ' + (isSelected ? 'checked' : '') + ' onchange="sikasToggleRiwayatRow(\'' + rowId + '\', this.checked)" autocomplete="off"></td>' +
      '<td class="p-4 text-[#5b7aaa]" data-label="Tanggal">' + sikasDate(t.Tanggal) + '</td>' +
      '<td class="p-4 font-semibold text-[#1b2a4a]" data-label="Siswa">' + namaTampil + alumniTag + '</td>' +
      '<td class="p-4 text-[#3d5478]" data-label="Kategori">' + (t.Kategori || '-') + '</td>' +
      '<td class="p-4 font-bold text-[#152238]" data-label="Nominal">' + sikasRupiah(t.Nominal) + '</td>' +
      '<td class="p-4 riwayat-col-metode" data-label="Metode">' + methodBadge + '</td>' +
      '<td class="p-4 riwayat-col-resi text-[#5b7aaa] font-mono text-xs" data-label="Resi">' + (t.NomorResi || '-') + '</td>' +
      '<td class="p-4 text-center whitespace-nowrap riwayat-col-aksi" data-label="Cetak">' +
        '<button onclick="sikasCetakResi(\'' + t.NomorResi + '\')" class="p-1.5 rounded-lg hover:bg-[#e8ecf4] text-[#1b2a4a] transition-colors text-sm inline-flex items-center justify-center w-7 h-7" title="Cetak"><i class="fas fa-print"></i></button>' +
      '</td>' +
      '</tr>';
  });
  
  tbody.innerHTML = rows || '<tr class="riwayat-empty-row"><td colspan="8" class="p-8 text-center text-[#8fa3c0] text-sm">Belum ada transaksi.</td></tr>';
  sikasUpdateRiwayatSelectAllHeader();
  
  // Update Pagination Info
  const info = document.getElementById('info-sikas-riwayat');
  if (info) {
    const showCount = paged.length;
    info.textContent = '';
  }
  
  const prevBtn = document.getElementById('btn-prev-sikas-riwayat');
  const nextBtn = document.getElementById('btn-next-sikas-riwayat');
  if (prevBtn) {
    prevBtn.disabled = _sikasRiwayatPage <= 1;
    prevBtn.onclick = function() {
      if (_sikasRiwayatPage > 1) {
        _sikasRiwayatPage--;
        sikasRenderRiwayatPage();
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = _sikasRiwayatPage >= totalPages;
    nextBtn.onclick = function() {
      if (_sikasRiwayatPage < totalPages) {
        _sikasRiwayatPage++;
        sikasRenderRiwayatPage();
      }
    };
  }
}

function sikasCetakResi(resi) {
  sikasApi('getTransactions').then(function (trx) {
    const t = (Array.isArray(trx) ? trx : []).find(function (x) { return x.NomorResi === resi; });
    if (!t) { sikasToast('Transaksi tidak ditemukan'); return; }
    const st = sikasStudents.find(function (s) { return s.id === String(t.SiswaID); });
    const trxData = {
      resi: t.NomorResi,
      tanggal: t.Tanggal,
      waktu: '',
      nisn: st ? st.nisn : '-',
      siswa: t.NamaSiswa || ('Siswa #' + t.SiswaID),
      kategori: t.Kategori || '-',
      metode: t.MetodeBayar || 'Tunai'
    };
    sikasShowReceipt(trxData, Number(t.Nominal));
  });
}

// ---------- Seleksi & Hapus Massal Riwayat (pola sama dgn menu Data Siswa) ----------
// Checkbox tampil di desktop (kolom .riwayat-col-checkbox), di HP kolom itu
// disembunyikan dan seleksi baris dilakukan lewat tekan-tahan (long press) --
// lihat mobileSelectRegistry di ui-fixes.js, terdaftar dgn type "riwayat".

function sikasUpdateRiwayatRowHighlight(id, checked) {
  const cb = document.querySelector('.riwayat-check[value="' + id + '"]');
  if (cb) cb.checked = checked;
  const tr = cb ? cb.closest('tr') : document.querySelector('.select-row-target[data-type="riwayat"][data-id="' + id + '"]');
  if (!tr) return;
  if (checked) {
    tr.classList.add('bg-blue-50/60', 'selected-row', 'border-l-4', 'border-l-[#1b2a4a]');
    tr.classList.remove('border-l-transparent');
  } else {
    tr.classList.remove('bg-blue-50/60', 'selected-row', 'border-l-4', 'border-l-[#1b2a4a]');
    tr.classList.add('border-l-transparent');
  }
}

function sikasUpdateRiwayatSelectAllHeader() {
  const rows = document.querySelectorAll('.riwayat-check');
  const header = document.getElementById('checkAllRiwayat');
  if (!header) return;
  header.checked = rows.length > 0 && Array.from(rows).every(function (cb) { return cb.checked; });
}

function sikasUpdateRiwayatBulkUI() {
  const btn = document.getElementById('btnBulkDeleteRiwayat');
  if (!btn) return;
  const countEl = btn.querySelector('.bulk-count');
  if (_sikasSelectedRiwayat.size > 0) {
    if (countEl) countEl.textContent = _sikasSelectedRiwayat.size;
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

// Checkbox "pilih semua" di header tabel (hanya memilih baris pada halaman aktif).
function sikasToggleSelectAllRiwayat(source) {
  document.querySelectorAll('.riwayat-check').forEach(function (cb) {
    cb.checked = source.checked;
    if (source.checked) _sikasSelectedRiwayat.add(String(cb.value));
    else _sikasSelectedRiwayat.delete(String(cb.value));
    sikasUpdateRiwayatRowHighlight(cb.value, source.checked);
  });
  sikasUpdateRiwayatBulkUI();
}

// Dipanggil oleh checkbox per-baris (desktop) & mode tekan-tahan (HP).
function sikasToggleRiwayatRow(id, checked) {
  if (checked) _sikasSelectedRiwayat.add(String(id));
  else _sikasSelectedRiwayat.delete(String(id));
  sikasUpdateRiwayatRowHighlight(id, checked);
  sikasUpdateRiwayatSelectAllHeader();
  sikasUpdateRiwayatBulkUI();
}

// Hapus massal transaksi terpilih. Backend belum punya endpoint hapus-banyak
// khusus transaksi, jadi dipanggil satu per satu lewat deleteTransaction yang
// sudah ada (sama seperti hapus tunggal sebelumnya), hanya UI-nya yang disamakan
// dengan pola pilih+hapus massal di menu Data Siswa.
async function sikasBulkDeleteRiwayat() {
  const ids = Array.from(_sikasSelectedRiwayat);
  if (ids.length === 0) return;

  if (typeof Swal !== 'undefined') {
    const r = await Swal.fire({
      title: 'Hapus ' + ids.length + ' transaksi?',
      html: 'Data riwayat yang dipilih akan dihapus permanen.<br>Status tagihan terkait dikembalikan ke <b>Belum Lunas</b>.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#3d5478',
      reverseButtons: true
    });
    if (!r.isConfirmed) return;
  } else if (!confirm('Hapus ' + ids.length + ' transaksi terpilih? Status tagihan akan dikembalikan ke Belum Lunas.')) return;

  showLoading();
  let failed = 0;
  for (const id of ids) {
    const res = await sikasApi('deleteTransaction', { id: id });
    if (res && res.success === false) failed++;
  }
  hideLoading();
  _sikasSelectedRiwayat.clear();
  sikasUpdateRiwayatBulkUI();
  sikasToast(failed > 0 ? (failed + ' transaksi gagal dihapus') : 'Transaksi terpilih berhasil dihapus');
  sikasRenderRiwayat();
}

// ---------- PENGATURAN ----------
