// sikas/kasir.js
// Modul Kasir: pilih siswa & tagihan, proses pembayaran, cetak struk.
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

var sikasKasirStudent = null;
var sikasSelectedKasir = {};

function sikasInitKasir() {
  sikasSelectedKasir = {};
  sikasKasirStudent = null;
  document.getElementById('sikas-kasir-search').value = '';
  document.getElementById('sikas-kasir-dropdown').classList.add('hidden');
  document.getElementById('sikas-kasir-profile').classList.add('hidden');
  document.getElementById('sikas-kasir-bills').innerHTML = '<div class="px-8 py-12 text-center text-[#8fa3c0] text-sm">Silakan pilih siswa terlebih dahulu.</div>';
  document.getElementById('sikas-kasir-total').textContent = sikasRupiah(0);
  sikasLoadData();
}

function sikasFilterKasirDropdown() {
  const q = (document.getElementById('sikas-kasir-search').value || '').toLowerCase();
  const dd = document.getElementById('sikas-kasir-dropdown');
  const list = sikasStudents.filter(function (s) {
    return !q || (s.nama + ' ' + s.nisn + ' ' + s.kelas).toLowerCase().indexOf(q) !== -1;
  });
  if (list.length === 0) { dd.classList.add('hidden'); return; }
  let html = '';
  list.forEach(function (s) {
    html += '<div class="px-4 py-2.5 hover:bg-[#e8ecf4] cursor-pointer flex items-center gap-3 border-b border-gray-50" onclick="sikasSelectKasirStudent(\'' + s.id + '\')">' +
      '<div class="w-8 h-8 rounded-full bg-[#d0d8e8] flex items-center justify-center text-[#152238] font-bold text-xs shrink-0">' + s.initial + '</div>' +
      '<div class="min-w-0"><p class="text-xs font-bold text-[#1b2a4a] truncate">' + s.nama + '</p><p class="text-[10px] text-[#8fa3c0] truncate">' + s.nisn + ' • ' + s.kelas + '</p></div></div>';
  });
  dd.innerHTML = html;
  dd.classList.remove('hidden');
}

function sikasSelectKasirStudent(id) {
  const st = sikasStudents.find(function (s) { return s.id === id; });
  if (!st) return;
  sikasKasirStudent = st;
  sikasSelectedKasir = {};
  document.getElementById('sikas-kasir-search').value = st.nama;
  document.getElementById('sikas-kasir-dropdown').classList.add('hidden');
  document.getElementById('sikas-kasir-profile').classList.remove('hidden');
  document.getElementById('sikas-kasir-avatar').textContent = st.initial;
  document.getElementById('sikas-kasir-name').textContent = st.nama;
  document.getElementById('sikas-kasir-nisn').textContent = st.nisn;
  document.getElementById('sikas-kasir-class').textContent = st.kelas;
  sikasRenderKasirBills();
}

function sikasRenderKasirBills() {
  const container = document.getElementById('sikas-kasir-bills');
  if (!sikasKasirStudent) return;
  const bills = sikasBills.filter(function (b) { return b.siswaId === sikasKasirStudent.id && b.status === 'Belum Lunas'; });
  if (bills.length === 0) {
    container.innerHTML = '<div class="px-8 py-12 text-center text-[#8fa3c0] text-sm">Tidak ada tagihan belum lunas untuk siswa ini.</div>';
  } else {
    let html = '';
    bills.forEach(function (b) {
      const sel = sikasSelectedKasir[b.id];
      const overdue = sikasDaysOverdue(b.jatuhTempo);
      const badge = overdue > 0
        ? '<span class="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-bold">Terlambat ' + overdue + ' hari</span>'
        : '<span class="text-[10px] px-2 py-0.5 bg-[#e8ecf4] text-[#152238] rounded-full font-bold">Segera</span>';
      const borderClass = sel ? 'border-[#1b2a4a]' : 'border-[#1b2a4a]/30';
      const checkInner = sel ? '<div class="w-3 h-3 bg-[#1b2a4a] rounded-sm"></div>' : '';
      html += '<div class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f4f6fb] transition-colors cursor-pointer group border border-gray-100 mb-1" onclick="sikasToggleKasirBill(\'' + b.id + '\')">' +
        '<div class="w-5 h-5 rounded-md border-2 ' + borderClass + ' flex items-center justify-center group-hover:border-[#1b2a4a] transition-colors shrink-0">' + checkInner + '</div>' +
        '<div class="flex-1 min-w-0"><p class="text-xs font-bold text-[#1b2a4a] truncate">' + b.jenis + '</p><p class="text-[10px] text-[#8fa3c0] font-medium">Jatuh Tempo: ' + sikasDate(b.jatuhTempo) + ' • ' + (b.bulan || '') + '</p></div>' +
        '<div class="text-right shrink-0"><p class="font-bold text-xs text-[#1b2a4a]">' + sikasRupiah(b.nominal) + '</p>' + badge + '</div></div>';
    });
    container.innerHTML = html;
  }
  let total = 0, tunggakan = 0;
  Object.keys(sikasSelectedKasir).forEach(function (id) {
    const b = sikasBills.find(function (x) { return x.id === id; });
    if (b) total += b.nominal;
  });
  bills.forEach(function (b) { tunggakan += b.nominal; });
  document.getElementById('sikas-kasir-total').textContent = sikasRupiah(total);
  document.getElementById('sikas-kasir-tunggakan').textContent = sikasRupiah(tunggakan);
  document.getElementById('sikas-kasir-billcount').textContent = bills.length + ' tagihan';
}

function sikasToggleKasirBill(id) {
  if (sikasSelectedKasir[id]) delete sikasSelectedKasir[id]; else sikasSelectedKasir[id] = true;
  sikasRenderKasirBills();
}

function sikasSelectAllKasirBills() {
  const bills = sikasBills.filter(function (b) { return b.siswaId === sikasKasirStudent.id && b.status === 'Belum Lunas'; });
  const allSelected = bills.length > 0 && bills.every(function (b) { return !!sikasSelectedKasir[b.id]; });
  bills.forEach(function (b) { if (allSelected) delete sikasSelectedKasir[b.id]; else sikasSelectedKasir[b.id] = true; });
  sikasRenderKasirBills();
}

async function sikasProcessPayment() {
  if (!sikasKasirStudent) { sikasToast('Pilih siswa terlebih dahulu'); return; }
  const billIds = Object.keys(sikasSelectedKasir);
  if (billIds.length === 0) { sikasToast('Pilih tagihan yang ingin dibayar'); return; }
  const activeBtn = document.querySelector('.sikas-pay-method.active');
  const metode = activeBtn ? activeBtn.getAttribute('data-method') : 'Tunai';
  const total = billIds.reduce(function (s, id) {
    const b = sikasBills.find(function (x) { return x.id === id; });
    return s + (b ? b.nominal : 0);
  }, 0);

  const res = await sikasApi('processPayment', {
    studentData: { id: sikasKasirStudent.id, nama: sikasKasirStudent.nama, nisn: sikasKasirStudent.nisn },
    billIds: billIds,
    metode: metode,
    total: total
  });
  if (!res.success) { sikasToast('Gagal: ' + (res.error || 'Unknown error')); return; }
  const trx = { resi: res.resi, tanggal: res.tanggal, waktu: res.waktu, nisn: sikasKasirStudent.nisn, siswa: sikasKasirStudent.nama, kategori: res.kategori, metode: metode };
  sikasShowReceipt(trx, total);
  sikasSelectedKasir = {};
  await sikasLoadData();
  sikasRenderKasirBills();
}

// ---------- RECEIPT ----------
function sikasShowReceipt(trx, total) {
  const m = document.getElementById('sikas-receipt-modal');
  document.getElementById('sikas-receipt-resi').textContent = trx.resi;
  document.getElementById('sikas-receipt-tanggal').textContent = sikasDate(trx.tanggal) + ' ' + trx.waktu;
  document.getElementById('sikas-receipt-nisn').textContent = trx.nisn;
  document.getElementById('sikas-receipt-nama').textContent = (trx.siswa || '').toUpperCase();
  document.getElementById('sikas-receipt-kategori').textContent = trx.kategori || '-';
  document.getElementById('sikas-receipt-nominal').textContent = Number(total).toLocaleString('id-ID');
  document.getElementById('sikas-receipt-total').textContent = sikasRupiah(total);
  document.getElementById('sikas-receipt-bayar').textContent = sikasRupiah(total);
  document.getElementById('sikas-receipt-kembali').textContent = sikasRupiah(0);
  document.getElementById('sikas-receipt-metode').textContent = (trx.metode || 'Tunai').toUpperCase();
  m.classList.remove('hidden');
  m.classList.add('flex');
}

function sikasCloseReceipt() {
  const m = document.getElementById('sikas-receipt-modal');
  m.classList.add('hidden');
  m.classList.remove('flex');
}

function sikasPrintReceipt(format) {
  document.body.classList.add(format === 'thermal' ? 'print-thermal' : 'print-a6');
  window.print();
  document.body.classList.remove('print-thermal');
  document.body.classList.remove('print-a6');
}

// Variable global helper untuk filter dan pagination riwayat
