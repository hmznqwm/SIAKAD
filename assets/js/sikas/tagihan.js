// sikas/tagihan.js
// Modul Tagihan: daftar & detail tagihan siswa, toggle status, hapus tagihan,
// kirim pengingat WhatsApp (tunggal & massal).
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

var sikasStudents = [];
var sikasBills = [];
var sikasSelectedBills = {};
var sikasDetailStudent = null;

function sikasNormalizeStudent(row, idx) {
  return {
    id: String(row.ID || row.id || (idx + 1)),
    nama: row.Nama || row.nama || '',
    nisn: row.NISN || row.nisn || '',
    kelas: row.Kelas || row.kelas || '',
    status: row.Status || row.status || 'Aktif',
    email: row.Email || row.email || '',
    noHP: row['NoHP Ortu'] || row.noHP || row.no_hp || '',
    initial: (row.Nama || row.nama || '?').charAt(0).toUpperCase(),
    color: 'green'
  };
}
function sikasNormalizeBill(row, idx) {
  return {
    id: String(row.ID || row.id || (idx + 1)),
    siswaId: String(row.SiswaID || row.siswaId || ''),
    jenis: row.JenisTagihan || row.jenis || '',
    nominal: Number(row.Nominal || row.nominal || 0),
    jatuhTempo: String(row.JatuhTempo || row.jatuhTempo || ''),
    status: row.Status || row.status || 'Belum Lunas',
    bulan: row.Bulan || row.bulan || ''
  };
}

async function sikasLoadData() {
  const [students, bills] = await Promise.all([
    sikasApi('getStudents'),
    sikasApi('getBills')
  ]);
  sikasStudents = (Array.isArray(students) ? students : []).map(sikasNormalizeStudent);
  sikasBills = (Array.isArray(bills) ? bills : []).map(sikasNormalizeBill);
}

function sikasRenderTagihan() {
  // Sinkronkan dropdown Jenis Tagihan dgn Master Jenis Tagihan (menu "Tagihan")
  // setiap kali halaman ini dimuat, supaya jenis yang baru ditambah/diubah/
  // dihapus di sana langsung tercermin di sini.
  sikasPopulateJenisSelect('sikas-tagihan-jenis');
  sikasLoadData().then(function () {
    const jenisFilter = (document.getElementById('sikas-tagihan-jenis') || {}).value || '';
    const billsForStats = jenisFilter ? sikasBills.filter(function (b) { return b.jenis === jenisFilter; }) : sikasBills;
    const totalUnpaid = billsForStats.filter(function (b) { return b.status === 'Belum Lunas'; }).reduce(function (s, b) { return s + b.nominal; }, 0);
    const totalPaid = billsForStats.filter(function (b) { return b.status === 'Lunas'; }).reduce(function (s, b) { return s + b.nominal; }, 0);
    const statsEl = document.getElementById('sikas-tagihan-stats');
    if (statsEl) {
      statsEl.innerHTML =
        '<div class="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">' +
          '<div class="w-10 h-10 bg-[#e8ecf4] rounded-xl flex items-center justify-center shrink-0 border border-[#d0d8e8]"><i class="fas fa-wallet text-[#1b2a4a] text-sm"></i></div>' +
          '<div class="min-w-0"><p class="text-[10px] font-semibold text-[#8fa3c0] uppercase tracking-wider">Total Tagihan</p><h3 class="text-sm font-black text-gray-900 leading-none mt-1 truncate">' + sikasRupiah(totalUnpaid + totalPaid) + '</h3></div>' +
        '</div>' +
        '<div class="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">' +
          '<div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-100"><i class="fas fa-clock text-amber-500 text-sm"></i></div>' +
          '<div class="min-w-0"><p class="text-[10px] font-semibold text-[#8fa3c0] uppercase tracking-wider">Belum Lunas</p><h3 class="text-sm font-black text-amber-650 leading-none mt-1 truncate">' + sikasRupiah(totalUnpaid) + '</h3></div>' +
        '</div>' +
        '<div class="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">' +
          '<div class="w-10 h-10 bg-[#e8ecf4] rounded-xl flex items-center justify-center shrink-0 border border-[#d0d8e8]"><i class="fas fa-check-circle text-[#1b2a4a] text-sm"></i></div>' +
          '<div class="min-w-0"><p class="text-[10px] font-semibold text-[#8fa3c0] uppercase tracking-wider">Sudah Lunas</p><h3 class="text-sm font-black text-[#1b2a4a] leading-none mt-1 truncate">' + sikasRupiah(totalPaid) + '</h3></div>' +
        '</div>' +
        '<div class="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">' +
          '<div class="w-10 h-10 bg-[#e8ecf4] rounded-xl flex items-center justify-center shrink-0 border border-[#d0d8e8]"><i class="fas fa-user-graduate text-[#1b2a4a] text-sm"></i></div>' +
          '<div class="min-w-0"><p class="text-[10px] font-semibold text-[#8fa3c0] uppercase tracking-wider">Siswa Aktif</p><h3 class="text-sm font-black text-gray-900 leading-none mt-1 truncate">' + sikasStudents.length + '</h3></div>' +
        '</div>';
    }
    sikasRenderTagihanStudents();
  }).catch(function (err) {
    const el = document.getElementById('sikas-tagihan-students');
    if (el) el.innerHTML = '<div class="text-center py-10 text-red-500 text-sm">Gagal memuat data: ' + (err.message || err) + '</div>';
  });
}

function sikasGroupBills(jenisFilter) {
  const groups = {};
  sikasBills.forEach(function (b) {
    // Terapkan filter Jenis Tagihan (disinkronkan dgn Master Jenis Tagihan)
    if (jenisFilter && b.jenis !== jenisFilter) return;
    // Lewati tagihan milik siswa yang sudah dihapus (tidak ada di daftar siswa aktif)
    const siswaAda = sikasStudents.find(function (s) { return s.id === b.siswaId; });
    if (!siswaAda) return;
    if (!groups[b.siswaId]) groups[b.siswaId] = { siswaId: b.siswaId, bills: [], totalUnpaid: 0, unpaidCount: 0 };
    groups[b.siswaId].bills.push(b);
    if (b.status === 'Belum Lunas') { groups[b.siswaId].totalUnpaid += b.nominal; groups[b.siswaId].unpaidCount++; }
  });
  const list = [];
  Object.keys(groups).forEach(function (sid) {
    const g = groups[sid];
    const st = sikasStudents.find(function (s) { return s.id === sid; });
    if (!st) return; // Pastikan tidak tampil jika siswa tidak ditemukan
    list.push({ student: st, bills: g.bills, totalUnpaid: g.totalUnpaid, unpaidCount: g.unpaidCount });
  });
  list.sort(function (a, b) { return (a.student.nama || '').localeCompare(b.student.nama || ''); });
  return list;
}

function sikasRenderTagihanStudents() {
  const filter = document.getElementById('sikas-tagihan-filter').value;
  const jenisEl = document.getElementById('sikas-tagihan-jenis');
  const jenisFilter = jenisEl ? jenisEl.value : '';
  const searchEl = document.getElementById('sikas-tagihan-search');
  const searchQ = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const el = document.getElementById('sikas-tagihan-students');
  const groups = sikasGroupBills(jenisFilter);
  // Pastikan semua siswa tampil (termasuk yang tidak punya tagihan) -- hanya
  // saat tidak ada filter Jenis Tagihan aktif, supaya daftar tidak dipenuhi
  // siswa yang memang tidak punya tagihan dari jenis yang sedang difilter.
  if (!jenisFilter) {
    sikasStudents.forEach(function (s) {
      if (!groups.find(function (g) { return g.student.id === s.id; })) {
        groups.push({ student: s, bills: [], totalUnpaid: 0, unpaidCount: 0 });
      }
    });
  }
  groups.sort(function (a, b) { return (a.student.nama || '').localeCompare(b.student.nama || ''); });
  let rows = '';
  groups.forEach(function (g) {
    if (filter === 'Belum Lunas' && g.unpaidCount === 0) return;
    if (filter === 'Lunas' && g.unpaidCount > 0) return;
    if (searchQ) {
      const nama = (g.student.nama || '').toLowerCase();
      const nisn = (g.student.nisn || '').toLowerCase();
      const kelas = (g.student.kelas || '').toLowerCase();
      if (!nama.includes(searchQ) && !nisn.includes(searchQ) && !kelas.includes(searchQ)) return;
    }
    const isEmpty = g.bills.length === 0;
    rows += '<div class="flex items-center justify-between p-3 rounded-xl hover:bg-[#f4f6fb] transition-colors cursor-pointer border border-gray-100 mb-2" onclick="sikasOpenTagihanDetail(\'' + g.student.id + '\')">' +
      '<div class="flex items-center gap-3 min-w-0">' +
        '<div class="w-10 h-10 rounded-full bg-[#e8ecf4] flex items-center justify-center text-[#152238] font-bold text-sm shrink-0 border border-[#d0d8e8]">' + g.student.initial + '</div>' +
        '<div class="min-w-0"><p class="text-sm font-bold text-[#1b2a4a] truncate">' + g.student.nama + '</p><p class="text-xs text-[#5b7aaa] truncate">' + g.student.nisn + ' • ' + g.student.kelas + '</p></div>' +
      '</div>' +
      '<div class="text-right shrink-0">' +
        '<p class="text-base font-black ' + (isEmpty ? 'text-[#8fa3c0]' : (g.unpaidCount > 0 ? 'text-amber-700' : 'text-[#0f1d35]')) + '">' + (isEmpty ? 'Tidak ada tagihan' : sikasRupiah(g.totalUnpaid)) + '</p>' +
        '<p class="text-xs text-[#5b7aaa] font-medium">' + (isEmpty ? '0 belum lunas' : g.unpaidCount + ' belum lunas') + '</p>' +
      '</div></div>';
  });
  if (!rows) {
    const searchEl2 = document.getElementById('sikas-tagihan-search');
    const sq = searchEl2 ? searchEl2.value.trim() : '';
    el.innerHTML = sq
      ? '<div class="text-center py-10 text-[#8fa3c0] text-sm"><i class="fas fa-search text-lg mb-2 block text-[#1b2a4a]"></i>Tidak ada siswa yang cocok dengan "<b class=\"text-[#1b2a4a]\">' + sq + '</b>".</div>'
      : '<div class="text-center py-10 text-[#8fa3c0] text-sm">Belum ada data siswa.</div>';
  } else {
    el.innerHTML = rows;
  }
}

function sikasFilterTagihanStudents() { sikasRenderTagihanStudents(); }

function sikasOpenTagihanDetail(siswaId) {
  sikasDetailStudent = sikasStudents.find(function (s) { return s.id === siswaId; });
  if (!sikasDetailStudent) return;
  document.getElementById('sikas-tagihan-students').closest('.bg-white').classList.add('hidden');
  document.getElementById('sikas-tagihan-detail').classList.remove('hidden');
  document.getElementById('sikas-tagihan-detail-avatar').textContent = sikasDetailStudent.initial;
  document.getElementById('sikas-tagihan-detail-name').textContent = sikasDetailStudent.nama;
  document.getElementById('sikas-tagihan-detail-info').textContent = sikasDetailStudent.nisn + ' • ' + sikasDetailStudent.kelas;
  sikasRenderDetailBills();
}

function sikasBackToTagihanList() {
  sikasSelectedBills = {};
  document.getElementById('sikas-tagihan-detail').classList.add('hidden');
  document.getElementById('sikas-tagihan-students').closest('.bg-white').classList.remove('hidden');
  sikasRenderTagihanStudents();
}

function sikasRenderDetailBills() {
  // Tagihan yang sudah Lunas tidak ditampilkan di Manajemen Tagihan
  const allBills = sikasBills.filter(function (b) { return b.siswaId === sikasDetailStudent.id; });
  const bills = allBills.filter(function (b) { return b.status !== 'Lunas'; });
  const tbody = document.getElementById('sikas-tagihan-detail-bills');
  let rows = '';
  bills.forEach(function (b) {
    const checked = sikasSelectedBills[b.id] ? 'checked' : '';
    const statusHtml = b.status === 'Lunas'
      ? '<span class="text-xs px-2.5 py-1 bg-[#e8ecf4] text-[#0f1d35] rounded-full font-bold border border-[#d0d8e8]">✓ Lunas</span>'
      : '<span class="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full font-bold border border-amber-200">Belum Lunas</span>';
    const overdue = b.status === 'Belum Lunas' ? sikasDaysOverdue(b.jatuhTempo) : 0;
    rows += '<tr>' +
      '<td class="px-4 py-2.5 text-center"><input type="checkbox" class="sikas-detail-cb w-3.5 h-3.5 rounded accent-[#1b2a4a]" data-id="' + b.id + '" ' + checked + ' onchange="sikasToggleDetailBill(this)"></td>' +
      '<td class="px-4 py-2.5 text-sm font-semibold text-[#0f1d35]">' + b.jenis + (overdue > 0 ? ' <span class="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full font-bold">Telat ' + overdue + ' hari</span>' : '') + '</td>' +
      '<td class="px-4 py-2.5 text-sm font-bold text-[#0f1d35]">' + sikasRupiah(b.nominal) + '</td>' +
      '<td class="px-4 py-2.5 text-sm text-[#3d5478]">' + sikasDate(b.jatuhTempo) + '</td>' +
      '<td class="px-4 py-2.5">' + statusHtml + '</td>' +
      '<td class="px-4 py-2.5 text-center"><button onclick="sikasDeleteBill(\'' + b.id + '\')" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors text-sm font-bold" title="Hapus tagihan"><i class="fas fa-trash"></i></button></td>' +
      '</tr>';
  });
  tbody.innerHTML = rows || (allBills.length > 0
    ? '<tr><td colspan="6" class="p-8 text-center text-[#8fa3c0] text-sm"><i class="fas fa-circle-check text-green-500 mb-2 block text-lg"></i>Semua tagihan siswa ini sudah lunas.</td></tr>'
    : '<tr><td colspan="6" class="p-8 text-center text-[#8fa3c0] text-sm">Tidak ada tagihan untuk siswa ini.</td></tr>');
  const totalUnpaid = bills.reduce(function (s, b) { return s + b.nominal; }, 0);
  const selCount = Object.keys(sikasSelectedBills).length;
  document.getElementById('sikas-tagihan-detail-summary').innerHTML =
    '<span>Tagihan aktif: <b>' + bills.length + '</b> — Belum lunas: <b>' + sikasRupiah(totalUnpaid) + '</b></span>' +
    '<span>Dipilih: <b id="sikas-sel-count">' + selCount + '</b></span>';
  const ca = document.getElementById('sikas-tagihan-check-all');
  if (ca) ca.checked = bills.length > 0 && bills.every(function (b) { return !!sikasSelectedBills[b.id]; });
}

function sikasToggleDetailBill(cb) {
  const id = cb.getAttribute('data-id');
  if (cb.checked) sikasSelectedBills[id] = true; else delete sikasSelectedBills[id];
  const cnt = document.getElementById('sikas-sel-count');
  if (cnt) cnt.textContent = Object.keys(sikasSelectedBills).length;
}

function sikasToggleAllDetailBills(cb) {
  const bills = sikasBills.filter(function (b) { return b.siswaId === sikasDetailStudent.id && b.status !== 'Lunas'; });
  bills.forEach(function (b) {
    if (cb.checked) sikasSelectedBills[b.id] = true; else delete sikasSelectedBills[b.id];
  });
  document.querySelectorAll('.sikas-detail-cb').forEach(function (c) { c.checked = cb.checked; });
  const cnt = document.getElementById('sikas-sel-count');
  if (cnt) cnt.textContent = Object.keys(sikasSelectedBills).length;
}

async function sikasToggleBillStatus(billId) {
  const bill = sikasBills.find(function (b) { return b.id === billId; });
  if (!bill) return;
  const newStatus = bill.status === 'Lunas' ? 'Belum Lunas' : 'Lunas';
  const res = await sikasApi('updateBillStatus', { id: billId, status: newStatus });
  if (res.success === false) { sikasToast('Gagal: ' + (res.error || 'Unknown')); return; }
  sikasToast('Status diubah ke ' + newStatus);
  await sikasLoadData();
  sikasRenderDetailBills();
}

function sikasDeleteBill(billId) {
  const bill = sikasBills.find(function (b) { return b.id === billId; });
  if (!bill) return;
  if (typeof Swal === 'undefined') { sikasDoDeleteBill(billId); return; }
  Swal.fire({
    title: 'Hapus tagihan ini?',
    html: '<b>' + bill.jenis + '</b> — ' + sikasRupiah(bill.nominal),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc2626',
    reverseButtons: true
  }).then(function (res) {
    if (res.isConfirmed) sikasDoDeleteBill(billId);
  });
}

async function sikasDoDeleteBill(billId) {
  const res = await sikasApi('deleteBill', { id: billId });
  if (res.success === false) { sikasToast('Gagal: ' + (res.error || 'Unknown')); return; }
  delete sikasSelectedBills[billId];
  sikasToast('Tagihan dihapus');
  await sikasLoadData();
  sikasRenderDetailBills();
}

function sikasBuildWaMessage(st, bills) {
  const total = bills.reduce(function (s, b) { return s + b.nominal; }, 0);
  const msgLines = [
    'Assalamu\'alaikum warahmatullahi wabarakatuh.',
    '',
    'Kepada Yth. Bapak/Ibu Wali Murid',
    'Ananda *' + st.nama + '*' + (st.kelas ? ' — Kelas ' + st.kelas : '') + (st.nisn ? ' (NISN ' + st.nisn + ')' : ''),
    '',
    'Melalui pesan ini kami mengingatkan bahwa terdapat tagihan sekolah berikut yang belum terselesaikan:',
    ''
  ];
  bills.forEach(function (b, i) {
    msgLines.push((i + 1) + '. ' + b.jenis + ': *' + sikasRupiah(b.nominal) + '*' + (b.jatuhTempo ? ' (jatuh tempo ' + sikasDate(b.jatuhTempo) + ')' : ''));
  });
  msgLines.push('');
  msgLines.push('*Total tagihan: ' + sikasRupiah(total) + '*');
  msgLines.push('');
  msgLines.push('Besarnya kami mohon kesediaan Bapak/Ibu untuk menyelesaikan pembayaran melalui Bendahara Sekolah. Apabila tagihan tersebut telah dibayarkan, mohon abaikan pesan ini.');
  msgLines.push('');
  msgLines.push('Demikian informasi kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.');
  msgLines.push('');
  msgLines.push('Hormat kami,');
  msgLines.push('*SMAITA Asy-Syadzili*');
  msgLines.push('Bendahara Sekolah');
  return msgLines.join('\n');
}

function sikasOpenWa(st, bills) {
  const phone = (st.noHP || '').replace(/^0/, '62');
  if (!phone) { sikasToast('Nomor HP orang tua ' + st.nama + ' belum diisi'); return false; }
  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(sikasBuildWaMessage(st, bills)), '_blank');
  return true;
}

async function sikasSendBulkWhatsApp() {
  const selected = [];
  Object.keys(sikasSelectedBills).forEach(function (id) {
    const b = sikasBills.find(function (x) { return x.id === id; });
    if (b) selected.push(b);
  });
  if (selected.length === 0) { sikasToast('Pilih tagihan dulu'); return; }
  if (sikasOpenWa(sikasDetailStudent, selected)) sikasToast('WhatsApp dibuka untuk ' + sikasDetailStudent.nama);
}

async function sikasSendMassWhatsApp() {
  // Kirim pengingat ke SEMUA siswa pada daftar yang tampil (mengikuti filter & pencarian)
  // yang masih memiliki tagihan belum lunas.
  const filterEl = document.getElementById('sikas-tagihan-filter');
  const searchEl = document.getElementById('sikas-tagihan-search');
  const filter = filterEl ? filterEl.value : '';
  const searchQ = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const groups = sikasGroupBills();
  const targets = groups.filter(function (g) {
    if (g.unpaidCount === 0) return false;
    if (filter === 'Lunas') return false;
    if (searchQ) {
      const nama = (g.student.nama || '').toLowerCase();
      const nisn = (g.student.nisn || '').toLowerCase();
      const kelas = (g.student.kelas || '').toLowerCase();
      if (!nama.includes(searchQ) && !nisn.includes(searchQ) && !kelas.includes(searchQ)) return false;
    }
    return true;
  });
  if (targets.length === 0) { sikasToast('Tidak ada siswa dengan tagihan aktif untuk dikirim'); return; }
  let sent = 0;
  for (let i = 0; i < targets.length; i++) {
    const g = targets[i];
    const unpaid = g.bills.filter(function (b) { return b.status !== 'Lunas'; });
    if (sikasOpenWa(g.student, unpaid)) sent++;
    await new Promise(function (r) { setTimeout(r, 400); });
  }
  sikasToast('WhatsApp dibuka untuk ' + sent + ' siswa');
}

// ---------- KASIR ----------
