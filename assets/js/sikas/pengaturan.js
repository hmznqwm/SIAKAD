// sikas/pengaturan.js
// Modul Pengaturan: generate tagihan massal & kelola data master SPP.
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

async function sikasRenderPengaturan() {
  const [masters, students] = await Promise.all([
    sikasApi('getMasterTagihan'),
    sikasApi('getStudents')
  ]);
  const list = Array.isArray(masters) ? masters : [];
  sikasStudents = (Array.isArray(students) ? students : []).map(sikasNormalizeStudent);
  const tbody = document.getElementById('sikas-master-list');
  let rows = '';
  list.forEach(function (m) {
    rows += '<tr>' +
      '<td class="px-3 py-2 font-semibold text-[#1b2a4a] truncate max-w-[160px]">' + (m.NamaTagihan || '-') + '</td>' +
      '<td class="px-3 py-2 text-[#5b7aaa] whitespace-nowrap">' + (m.TipeTagihan || '-') + '</td>' +
      '<td class="px-3 py-2 text-right font-bold text-[#1b2a4a] whitespace-nowrap">' + sikasRupiah(m.NominalDefault) + '</td>' +
      '<td class="px-3 py-2 text-center whitespace-nowrap"><button onclick="sikasEditMaster(\'' + m.ID + '\')" class="text-[#1b2a4a] hover:text-[#0f1d35] text-xs font-bold mr-2"><i class="fas fa-edit"></i></button><button onclick="sikasDeleteMaster(\'' + m.ID + '\')" class="text-red-500 hover:text-red-700 text-xs font-bold"><i class="fas fa-trash"></i></button></td>' +
      '</tr>';
  });
  tbody.innerHTML = rows || '<tr><td colspan="4" class="text-center py-8 text-[#8fa3c0] italic text-xs">Belum ada master tagihan.</td></tr>';

  const input = document.getElementById('sikas-bulk-target-input');
  const targetSel = document.getElementById('sikas-bulk-target');
  const dd = document.getElementById('sikas-bulk-target-dd');
  if (input) input.value = '';
  if (targetSel) targetSel.value = 'Semua Siswa';
  if (dd) dd.innerHTML = '';

  const jenisSel = document.getElementById('sikas-bulk-jenis');
  let jopt = '<option value="" disabled selected>-- Pilih Tagihan --</option>';
  list.forEach(function (m) {
    jopt += '<option value="' + m.NamaTagihan + '" data-nominal="' + m.NominalDefault + '">' + m.NamaTagihan + ' (' + sikasRupiah(m.NominalDefault) + ')</option>';
  });
  jenisSel.innerHTML = jopt;
}

function sikasBulkTargetShow() {
  const input = document.getElementById('sikas-bulk-target-input');
  const dd = document.getElementById('sikas-bulk-target-dd');
  if (!input || !dd) return;
  const q = (input.value || '').toLowerCase();
  let html = '<div class="px-3 py-2 hover:bg-[#e8ecf4] cursor-pointer flex items-center gap-2 border-b border-gray-50" onclick="sikasBulkTargetPick(\'\', \'Semua Siswa (Aktif)\')">' +
    '<i class="fas fa-users text-xs text-[#1b2a4a]"></i><span class="text-xs font-bold text-[#1b2a4a]">Semua Siswa (Aktif)</span></div>';
  sikasStudents.forEach(function (s) {
    if (q && (s.nama + ' ' + s.kelas + ' ' + s.nisn).toLowerCase().indexOf(q) === -1) return;
    html += '<div class="px-3 py-2 hover:bg-[#e8ecf4] cursor-pointer flex items-center gap-2 border-b border-gray-50" onclick="sikasBulkTargetPick(\'' + s.id + '\', \'' + String(s.nama).replace(/'/g, "\\'") + '\')">' +
      '<div class="w-6 h-6 rounded-full bg-[#d0d8e8] text-[#152238] flex items-center justify-center text-[10px] font-bold shrink-0">' + s.initial + '</div>' +
      '<span class="text-xs font-semibold text-[#152238] truncate">' + s.nama + ' (' + s.kelas + ')</span></div>';
  });
  dd.innerHTML = html;
  dd.classList.remove('hidden');
}

function sikasBulkTargetPick(id, label) {
  const input = document.getElementById('sikas-bulk-target-input');
  const targetSel = document.getElementById('sikas-bulk-target');
  if (input) input.value = label;
  if (targetSel) targetSel.value = id || 'Semua Siswa';
  document.getElementById('sikas-bulk-target-dd').classList.add('hidden');
}

function sikasAutoFillNominal() {
  const sel = document.getElementById('sikas-bulk-jenis');
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.getAttribute('data-nominal')) {
    document.getElementById('sikas-bulk-nominal').value = opt.getAttribute('data-nominal');
  }
}

async function sikasSubmitBulkGeneration() {
  const payload = {
    targetSiswa: document.getElementById('sikas-bulk-target').value || 'Semua Siswa',
    jenisTagihan: document.getElementById('sikas-bulk-jenis').value,
    nominal: document.getElementById('sikas-bulk-nominal').value,
    durasiBulan: document.getElementById('sikas-bulk-durasi').value,
    jatuhTempoAwal: document.getElementById('sikas-bulk-jatuh').value
  };
  if (!payload.jenisTagihan) { sikasToast('Pilih jenis tagihan terlebih dahulu'); return; }
  if (!(Number(payload.nominal) > 0)) { sikasToast('Nominal tagihan harus lebih dari 0'); return; }
  if (!(Number(payload.durasiBulan) > 0)) { sikasToast('Durasi tagihan tidak valid'); return; }
  if (!payload.jatuhTempoAwal) { sikasToast('Tanggal jatuh tempo wajib diisi'); return; }
  const res = await sikasApi('generateBulkBills', payload);
  if (!res || res.success === false) { sikasToast('Gagal: ' + ((res && (res.error || res.message)) || 'Tidak dapat membuat tagihan')); return; }
  await sikasRefreshAfterMutation();
  sikasToast('Berhasil membuat ' + (res.count || 0) + ' tagihan' + ((res.skipped || 0) > 0 ? ' — ' + res.skipped + ' tagihan ganda dilewati' : ''));

}

function sikasOpenMasterModal() {
  document.getElementById('sikas-master-title').textContent = 'Tambah Master Tagihan';
  document.getElementById('sikas-master-id').value = '';
  document.getElementById('sikas-master-nama').value = '';
  document.getElementById('sikas-master-tipe').value = 'Bulanan';
  document.getElementById('sikas-master-nominal').value = '';
  const m = document.getElementById('sikas-master-modal');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

function sikasEditMaster(id) {
  sikasApi('getMasterTagihan').then(function (masters) {
    const m = (Array.isArray(masters) ? masters : []).find(function (x) { return String(x.ID) === String(id); });
    if (!m) return;
    document.getElementById('sikas-master-title').textContent = 'Edit Master Tagihan';
    document.getElementById('sikas-master-id').value = m.ID;
    document.getElementById('sikas-master-nama').value = m.NamaTagihan;
    document.getElementById('sikas-master-tipe').value = m.TipeTagihan;
    document.getElementById('sikas-master-nominal').value = m.NominalDefault;
    const el = document.getElementById('sikas-master-modal');
    el.classList.remove('hidden');
    el.classList.add('flex');
  });
}

function sikasCloseMasterModal() {
  const m = document.getElementById('sikas-master-modal');
  m.classList.add('hidden');
  m.classList.remove('flex');
}

async function sikasSaveMaster() {
  const id = document.getElementById('sikas-master-id').value;
  const data = {
    NamaTagihan: document.getElementById('sikas-master-nama').value.trim(),
    TipeTagihan: document.getElementById('sikas-master-tipe').value,
    NominalDefault: Number(document.getElementById('sikas-master-nominal').value || 0)
  };
  if (!data.NamaTagihan) { sikasToast('Nama tagihan wajib diisi'); return; }
  const res = id
    ? await sikasApi('updateMasterTagihan', { id: id, data: data })
    : await sikasApi('addMasterTagihan', { data: data });
  if (res.success === false) { sikasToast('Gagal: ' + (res.error || res.message || 'Unknown')); return; }
  sikasCloseMasterModal();
  await sikasRefreshAfterMutation();
  sikasToast(!id
    ? 'Master tagihan disimpan — jalankan Generate Tagihan Massal untuk membuat tagihan siswa'
    : 'Master tagihan disimpan');
  sikasRenderPengaturan();
}

async function sikasDeleteMaster(id) {
  if (typeof Swal !== 'undefined') {
    const r = await Swal.fire({ title: 'Hapus master tagihan?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626', reverseButtons: true });
    if (!r.isConfirmed) return;
  } else if (!confirm('Hapus master tagihan ini?')) return;
  const res = await sikasApi('deleteMasterTagihan', { id: id });
  if (res.success === false) { sikasToast('Gagal: ' + (res.error || 'Unknown')); return; }
  await sikasRefreshAfterMutation();
  sikasToast('Master tagihan dihapus');
  sikasRenderPengaturan();
}

// ---------- Register global hooks ----------
