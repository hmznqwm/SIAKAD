// sikas/dashboard.js
// Dashboard SIKAS: switch antar-view, render ringkasan dashboard, loader tiap tab.
// Dipecah dari assets/js/sikas.js -- urutan file HARUS tetap seperti di scripts.php
// (util, views-template, dashboard, tagihan, kasir, riwayat, pengaturan, init)
// karena saling bergantung & TIDAK dibungkus IIFE (scope global).

function sikasShow(viewId, title) {
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

// ---------- Dashboard Bendahara ----------
function sikasDashboard() {
  sikasInjectViews();
  sikasShow('view-sikas-dashboard', 'Dashboard');
  // Isi tanggal
  const dateEl = document.getElementById('sikas-dash-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  sikasRenderDashboard();
}

async function sikasRenderDashboard() {
  await ensureLib('chartjs');
  const sel = document.getElementById('sikas-dash-filter');
  const jenis = sel ? sel.value : '';
  const fmtRp = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

  // Reset stat cards
  ['sikas-dash-lunas','sikas-dash-belum','sikas-dash-bulan','sikas-dash-overdue-count'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });
  const tbody = document.getElementById('sikas-dash-overdue-body');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-[#8fa3c0]"><i class="fas fa-circle-notch fa-spin mr-2 text-[#1b2a4a]"></i>Memuat data...</td></tr>';

  sikasApi('getDashboardStats', { jenis: jenis }).then(function(stats) {
    if (!stats || stats.success === false) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-rose-400">Gagal memuat data.</td></tr>';
      return;
    }

    // Sinkronkan opsi filter Jenis Tagihan dgn Master Jenis Tagihan setiap kali
    // data dashboard dimuat/di-refresh (bukan hanya sekali), supaya jenis yang
    // baru ditambah/diubah/dihapus di menu "Tagihan" langsung tercermin di sini.
    if (sel && Array.isArray(stats.jenisTagihanOptions)) {
      const currentVal = sel.value;
      let optHtml = '<option value="">Semua Jenis Tagihan</option>';
      stats.jenisTagihanOptions.forEach(function (j) {
        optHtml += '<option value="' + String(j).replace(/"/g, '&quot;') + '">' + j + '</option>';
      });
      sel.innerHTML = optHtml;
      if (currentVal && stats.jenisTagihanOptions.includes(currentVal)) sel.value = currentVal;
    }

    // Stat cards
    const lunasEl = document.getElementById('sikas-dash-lunas');
    const belumEl = document.getElementById('sikas-dash-belum');
    const bulanEl = document.getElementById('sikas-dash-bulan');
    const overEl  = document.getElementById('sikas-dash-overdue-count');
    const lunasSubEl = document.getElementById('sikas-dash-lunas-sub');
    const belumSubEl = document.getElementById('sikas-dash-belum-sub');
    const bulanSubEl = document.getElementById('sikas-dash-bulan-sub');

    if (lunasEl) lunasEl.textContent = fmtRp(stats.totalTerbayar);
    if (belumEl) belumEl.textContent = fmtRp(stats.totalBelumLunas);
    if (bulanEl) bulanEl.textContent = fmtRp(stats.trxBulanIni);
    if (overEl)  overEl.textContent  = (stats.overdueStudents || []).length;
    if (lunasSubEl) lunasSubEl.textContent = (stats.siswaSudahBayarCount || 0) + ' siswa sudah bayar';
    if (belumSubEl) belumSubEl.textContent = (stats.siswaBelumBayar || 0) + ' siswa belum bayar';
    if (bulanSubEl) bulanSubEl.textContent = (stats.trxCountBulanIni || 0) + ' transaksi bulan ini';

    // Chart donut
    const ctx = document.getElementById('sikas-dash-chart');
    if (ctx) {
      if (window._sikasDashChart) { window._sikasDashChart.destroy(); }
      const lunas = Number(stats.totalTerbayar || 0);
      const belum = Number(stats.totalBelumLunas || 0);
      const total = lunas + belum;
      const pct = v => total > 0 ? Math.round((v / total) * 100) + '%' : '0%';
      window._sikasDashChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sudah Dibayar', 'Belum Lunas'],
          datasets: [{ data: [lunas, belum], backgroundColor: ['#1b2a4a','#F59E0B'], borderColor: '#ffffff', borderWidth: 3, hoverOffset: 8 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmtRp(c.parsed) + ' (' + pct(c.parsed) + ')' } },
            datalabels: {
              color: '#fff',
              font: { weight: 'bold', size: 11 },
              formatter: (val) => val > 0 ? pct(val) : '',
              textAlign: 'center'
            }
          }
        },
        plugins: [{
          id: 'sikasCenter',
          afterDraw(chart) {
            if (!chart.ctx) return;
            const w = chart.width, h = chart.height;
            chart.ctx.save();
            chart.ctx.textAlign = 'center'; chart.ctx.textBaseline = 'middle';
            chart.ctx.font = '800 20px Inter, sans-serif';
            chart.ctx.fillStyle = '#1b2a4a';
            chart.ctx.fillText(pct(lunas), w/2, h/2 - 4);
            chart.ctx.font = '500 10px Inter, sans-serif';
            chart.ctx.fillStyle = '#9CA3AF';
            chart.ctx.fillText('Terkumpul', w/2, h/2 + 16);
            chart.ctx.restore();
          }
        }]
      });
    }

    // Overdue table
    const overdue = stats.overdueStudents || [];
    if (tbody) {
      if (overdue.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-[#8fa3c0]"><i class="fas fa-check-circle text-[#5b7aaa] mr-2"></i>Tidak ada tunggakan &gt; 7 hari</td></tr>';
      } else {
        tbody.innerHTML = overdue.map(function(s) {
          return `<tr class="border-b border-gray-50 hover:bg-[#f4f6fb] transition">
            <td class="py-2 pr-2 font-medium text-[#1b2a4a] text-xs">${s.nama || '-'}</td>
            <td class="py-2 pr-2 text-[#5b7aaa] text-xs">${s.kelas || '-'}</td>
            <td class="py-2 pr-2 text-[#3d5478] text-xs">${s.jenis || '-'}</td>
            <td class="py-2 pr-2 text-right font-semibold text-amber-600 text-xs">${fmtRp(s.nominal)}</td>
            <td class="py-2 text-right text-xs"><span class="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">${s.terlambat}h</span></td>
          </tr>`;
        }).join('');
      }
    }
  });
}

function sikasLoadTagihan() {
  sikasInjectViews();
  sikasShow('view-sikas-tagihan', 'Manajemen Tagihan');
  sikasRenderTagihan();
}

function sikasLoadKasir() {
  sikasInjectViews();
  sikasShow('view-sikas-kasir', 'Kasir Pembayaran');
  sikasInitKasir();
}

function sikasLoadRiwayat() {
  sikasInjectViews();
  sikasShow('view-sikas-riwayat', 'Riwayat & Cetak Resi');
  sikasRenderRiwayat();
}

function sikasLoadPengaturan() {
  sikasInjectViews();
  sikasShow('view-sikas-pengaturan', 'Tagihan');
  sikasRenderPengaturan();
}

// ---------- TAGIHAN SAYA (Siswa) ----------
function sikasLoadTagihanSaya() {
  sikasInjectViews();
  sikasShow('view-sikas-tagihan-saya', 'Tagihan Saya');
  sikasRenderTagihanSaya();
}

function sikasRenderTagihanSaya() {
  const body = document.getElementById('sikas-tagihan-saya-body');
  const stats = document.getElementById('sikas-tagihan-saya-stats');
  const mobile = document.getElementById('sikas-tagihan-saya-mobile-cards');
  if (!body || !stats) return;
  body.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-[#8fa3c0]"><i class="fas fa-circle-notch fa-spin mr-2 text-[#1b2a4a]"></i>Memuat tagihan...</td></tr>';
  if (mobile) mobile.innerHTML = '<div class="sikas-siswa-mobile-loading"><i class="fas fa-circle-notch fa-spin"></i><span>Memuat tagihan...</span></div>';
  const nisn = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.nisn || '') : '';
  sikasApi('getBills', { nisn: nisn }).then(function (bills) {
    const list = Array.isArray(bills) ? bills : [];
    const belum = list.filter(function (b) { return String(b.Status || '').toLowerCase() === 'belum lunas'; });
    const lunas = list.filter(function (b) { return String(b.Status || '').toLowerCase() === 'lunas'; });
    const totalBelum = belum.reduce(function (s, b) { return s + (Number(b.Nominal) || 0); }, 0);
    const totalLunas = lunas.reduce(function (s, b) { return s + (Number(b.Nominal) || 0); }, 0);
    stats.innerHTML =
      '<span class="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3.5 py-1.5 text-[11px]"><i class="fas fa-clock text-amber-600 text-[10px]"></i><b class="text-base text-amber-700 leading-none">' + belum.length + '</b><span class="font-bold text-amber-700 uppercase tracking-wider text-xs">Belum Lunas (' + sikasRupiah(totalBelum) + ')</span></span>' +
      '<span class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1.5 text-[11px]"><i class="fas fa-check-circle text-emerald-600 text-[10px]"></i><b class="text-base text-emerald-700 leading-none">' + lunas.length + '</b><span class="font-bold text-emerald-700 uppercase tracking-wider text-xs">Lunas</span></span>' +
      '<span class="inline-flex items-center gap-2 bg-[#e8ecf4] border border-[#d0d8e8] rounded-full px-3.5 py-1.5 text-[11px]"><i class="fas fa-wallet text-[#1b2a4a] text-[10px]"></i><b class="text-base text-[#152238] leading-none">' + sikasRupiah(totalBelum + totalLunas) + '</b><span class="font-bold text-[#0f1d35] uppercase tracking-wider text-xs">Total</span></span>';
    if (list.length === 0) {
      body.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-[#8fa3c0]"><i class="fas fa-inbox text-lg mb-2 block text-[#1b2a4a]"></i>Tidak ada tagihan untuk Anda.</td></tr>';
      if (mobile) mobile.innerHTML = '<div class="sikas-siswa-mobile-empty"><i class="fas fa-inbox"></i><span>Tidak ada tagihan untuk Anda.</span></div>';
      return;
    }
    const esc = function(v){ return String(v == null ? '-' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
    body.innerHTML = list.map(function (b) {
      const isLunas = String(b.Status || '').toLowerCase() === 'lunas';
      const overdue = !isLunas ? sikasDaysOverdue(b.JatuhTempo) : 0;
      const badge = isLunas
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e8ecf4] text-[#0f1d35] rounded-full text-xs font-bold border border-[#d0d8e8]"><i class="fas fa-check-circle text-xs text-[#1b2a4a]"></i>Lunas</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200"><i class="fas fa-hourglass-half text-xs text-amber-600"></i>Belum Lunas</span>';
      const overdueBadge = overdue > 0 ? ' <span class="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-650 rounded-full font-bold border border-red-100 inline-block align-middle ml-1">Telat ' + overdue + ' hari</span>' : '';
      return '<tr class="hover:bg-[#f4f6fb]/50 transition-colors"><td class="p-4 text-sm font-semibold text-[#0f1d35]">' + esc(b.JenisTagihan) + overdueBadge + '</td><td class="p-4 text-sm text-[#3d5478]">' + esc(b.Bulan) + '</td><td class="p-4 text-sm text-[#3d5478]">' + esc(sikasDate(b.JatuhTempo)) + '</td><td class="p-4 text-sm text-right font-bold text-[#0f1d35]">' + sikasRupiah(Number(b.Nominal) || 0) + '</td><td class="p-4 text-center">' + badge + '</td></tr>';
    }).join('');
    if (mobile) mobile.innerHTML = list.map(function (b) {
      const isLunas = String(b.Status || '').toLowerCase() === 'lunas';
      const overdue = !isLunas ? sikasDaysOverdue(b.JatuhTempo) : 0;
      const status = isLunas ? '<span class="sikas-siswa-status paid"><i class="fas fa-check-circle"></i>Lunas</span>' : '<span class="sikas-siswa-status unpaid"><i class="fas fa-clock"></i>Belum Lunas</span>';
      return '<article class="sikas-siswa-card">' +
        '<div class="sikas-siswa-card-head"><div class="sikas-siswa-card-title">' + esc(b.JenisTagihan) + '</div>' + status + '</div>' +
        '<div class="sikas-siswa-card-amount">' + sikasRupiah(Number(b.Nominal) || 0) + '</div>' +
        '<div class="sikas-siswa-card-grid"><div><span>Bulan</span><b>' + esc(b.Bulan) + '</b></div><div><span>Jatuh Tempo</span><b>' + esc(sikasDate(b.JatuhTempo)) + '</b></div></div>' +
        (overdue > 0 ? '<div class="sikas-siswa-overdue"><i class="fas fa-triangle-exclamation"></i> Telat ' + overdue + ' hari</div>' : '') +
      '</article>';
    }).join('');
  }).catch(function () {
    body.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-400">Gagal memuat tagihan.</td></tr>';
    if (mobile) mobile.innerHTML = '<div class="sikas-siswa-mobile-empty error"><i class="fas fa-circle-exclamation"></i><span>Gagal memuat tagihan.</span></div>';
  });
}

// ---------- TAGIHAN ----------
