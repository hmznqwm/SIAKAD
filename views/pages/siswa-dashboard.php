<div id="view-siswa-dashboard" class="view-section animate-fade-in min-h-full">

  <div class="sd-wrap">
    <!-- ── MAIN COLUMN ── -->
    <div>
      <!-- Top bar (greeting + status) -->
      <div id="heroCard" class="sd-topbar">
        <div class="sd-topbar-left">
          <p id="dashDate" class="sd-date">…</p>
          <h2 class="sd-greeting">Selamat datang, <span id="dashGreeting">Siswa</span></h2>
          <p class="sd-sub">Semangat belajar hari ini!</p>
        </div>

        <!-- status badge (top-right) -->
        <div id="dashStatusBadge" class="sd-badge">
          <i class="fas fa-circle-notch fa-spin" style="font-size:9px;"></i> Memuat…
        </div>
      </div>

      <!-- jadwal card -->
      <div class="sd-schedule-wrap">
        <div class="sd-schedule-hdr">
          <div class="sd-schedule-hdr-left">
            <i class="fas fa-calendar-day" style="color:#64748b;font-size:12px;"></i>
            <span class="sd-schedule-title">Jadwal Hari Ini</span>
            <span id="jadwalHariLabel" class="sd-schedule-sub"></span>
          </div>
          <span id="jadwalHariCount" class="sd-schedule-count"></span>
        </div>
        <div id="jadwalSiswaList">
          <div style="padding:24px 0;text-align:center;color:#64748b;">
            <i class="fas fa-circle-notch fa-spin" style="font-size:14px;display:block;margin-bottom:6px;"></i>
            <span style="font-size:11px;">Memuat jadwal…</span>
          </div>
        </div>
      </div>

      <!-- Alert belum absen -->
      <div id="alertBelumAbsen" class="hidden">
        <div class="alert-icon"><i class="fas fa-exclamation"></i></div>
        <div>
          <p class="alert-title">Belum absen hari ini</p>
          <p class="alert-body">Anda belum melakukan scan absensi. Harap segera lakukan absensi masuk.</p>
        </div>
      </div>

      <!-- Grafik nilai -->
      <div id="nilaiChartWrap" class="hidden" style="background:var(--white);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-top:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <h3 style="font-size:13px;font-weight:700;color:var(--ink2);">Rekap Nilai</h3>
            <p style="font-size:11px;color:var(--ink3);margin-top:2px;">Rata-rata nilai per mata pelajaran</p>
          </div>
          <span id="nilaiChartAvg" style="font-size:12px;font-weight:800;color:var(--ink);"></span>
        </div>
        <div style="position:relative;width:100%;height:200px;min-width:0;" class="sm:!h-[220px]">
          <canvas id="siswaNilaiChart"></canvas>
        </div>
      </div>
    </div>

    <!-- ── SIDEBAR ── -->
    <div class="sd-sidebar">
      <!-- Profile -->
      <div class="sd-profile">
        <div class="sd-profile-band"></div>
        <div class="sd-profile-body">
          <div class="sd-avatar"><i class="fas fa-user"></i></div>
          <div class="sd-profile-info">
            <div id="profileNameSidebar" class="sd-profile-name">Nama Siswa</div>
            <span id="profileNisnSidebar" class="sd-profile-nisn">1234567890</span>
          </div>
        </div>
        <div class="sd-profile-footer">
          <div class="sd-pf-item">
            <div class="sd-pf-label">Kelas</div>
            <div id="profileKelasSidebar" class="sd-pf-val">—</div>
          </div>
          <div class="sd-pf-item">
            <div class="sd-pf-label">Status</div>
            <div id="profileStatusSidebar" class="sd-pf-val val-active">Aktif</div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <button onclick="showModalGantiPassword()" class="sd-action-btn">
        <div class="sd-action-icon"><i class="fas fa-key"></i></div>
        <span class="sd-action-label">Ganti Password</span>
      </button>

      <button onclick="loadQRCodeSiswa()" class="sd-action-btn qr-btn">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="sd-action-icon"><i class="fas fa-qrcode"></i></div>
          <div>
            <div class="sd-action-label">Kartu Digital</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:1px;">Tampilkan QR Code</div>
          </div>
        </div>
        <i class="fas fa-chevron-right qr-arrow"></i>
      </button>
    </div>
  </div>
</div>