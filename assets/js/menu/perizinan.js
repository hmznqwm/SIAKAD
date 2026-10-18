function _getAuthToken() {
    try {
      const s = localStorage.getItem('absensiAppSession');
      return s ? (JSON.parse(s).token || null) : null;
    } catch(e) { return null; }
  }
  function _getCurrentUser() {
    try {
      const s = localStorage.getItem('absensiAppSession');
      return s ? JSON.parse(s) : {};
    } catch(e) { return {}; }
  }
  function _namaHariID(dateObj) {
    return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][dateObj.getDay()];
  }
  // Format tanggal singkat & konsisten (contoh: "30 Agu 2026") -- dipakai untuk
  // menampilkan pilihan tanggal di form Ajukan Izin (siswa & guru), supaya TIDAK
  // bergantung pada format tanggal bawaan OS/browser yang di sebagian device bisa
  // sangat panjang (mis. "Minggu, 30 Agustus 2026") dan meluber dari kotaknya.
  function _fmtTglSingkat(ymd) {
    if (!ymd) return '-';
    const d = new Date(ymd + 'T00:00:00');
    if (isNaN(d.getTime())) return ymd;
    const bulanShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${String(d.getDate()).padStart(2,'0')} ${bulanShort[d.getMonth()]} ${d.getFullYear()}`;
  }
  function _updateIzinTanggalDisplay(inputId, displayId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (input && display) display.textContent = _fmtTglSingkat(input.value);
  }
  function _refreshOpsiMapelIzin(tanggalStr, kelas, selectEl, hariInfoEl) {
    if (!selectEl) return;
    const d = new Date(tanggalStr + 'T00:00');
    const namaHari = _namaHariID(d);
    if (hariInfoEl) hariInfoEl.textContent = namaHari;
    selectEl.innerHTML = '<option value="">⏳ Memuat jadwal...</option>';
    selectEl.disabled = true;
    siakadRun
      .withSuccessHandler(function(res) {
        selectEl.disabled = false;
        const jadwal = (res && res.success && res.data) ? res.data : [];
        let opsiMapel = '';
        if (jadwal.length > 0) {
          jadwal.forEach(j => {
            opsiMapel += `<option value="${j.mapel}">${j.mapel}${j.pengajar ? ' — ' + j.pengajar : ''}${j.jam_mulai ? ' ('+j.jam_mulai+'–'+j.jam_selesai+')' : ''}</option>`;
          });
        } else {
          opsiMapel = `<option value="Umum">Umum (tidak ada jadwal ${namaHari})</option>`;
        }
        selectEl.innerHTML = opsiMapel;
        if (hariInfoEl) hariInfoEl.textContent = namaHari;
      })
      .withFailureHandler(function() {
        selectEl.disabled = false;
        selectEl.innerHTML = '<option value="Umum">Umum (gagal memuat jadwal)</option>';
      })
      .getJadwalByHari(kelas, namaHari);
  }
  function openModalAjukanIzinSiswa() {
    const token = _getAuthToken();
    const currentUser = _getCurrentUser();
    const kelas = currentUser.kelas || '';
    const today = (typeof siakadTodayStr === 'function') ? siakadTodayStr() : new Date().toISOString().split('T')[0];
    const namaHariDefault = _namaHariID(new Date());
    const html = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden max-w-[460px] w-full shadow-lg flex flex-col max-h-[90vh] text-left">
          <div class="bg-[#152238] dark:bg-gray-900 px-4 py-3.5 flex items-center gap-2.5 shrink-0">
            <div class="w-[34px] h-[34px] bg-white/20 rounded-[10px] flex items-center justify-center shrink-0">
              <i class="fas fa-hand-paper text-white text-sm"></i>
            </div>
            <div class="min-w-0">
              <h3 class="text-[15px] font-extrabold text-white m-0 whitespace-nowrap">Ajukan Izin / Sakit</h3>
              <p class="text-[10px] text-white/75 m-0 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">Pengajuan ke guru mata pelajaran</p>
            </div>
            <button onclick="Swal.close()" class="ml-auto bg-white/20 hover:bg-white/30 border-none text-white w-[30px] h-[30px] rounded-lg cursor-pointer text-base flex items-center justify-center shrink-0 transition">&times;</button>
          </div>
          <div class="p-4 flex flex-col gap-3 overflow-y-auto" style="-webkit-overflow-scrolling:touch;">
            <div>
              <label class="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Tanggal Izin</label>
              <div class="relative">
                <div id="izinSiswaTanggalDisplay" class="w-full bg-gray-50 dark:bg-gray-700 border-[1.5px] border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-[13px] font-semibold rounded-[10px] px-3 py-2.5 box-border flex items-center justify-between gap-2 whitespace-nowrap overflow-hidden">
                  <span id="izinSiswaTanggalText" class="overflow-hidden text-ellipsis">-</span>
                  <i class="fas fa-chevron-down text-[10px] text-gray-400 dark:text-gray-500 shrink-0"></i>
                </div>
                <input type="date" id="izinSiswaTanggal" value="${today}" max="${today}"
                  onchange="_refreshOpsiMapelIzin(this.value,'${kelas}',document.getElementById('izinSiswaMapel'),document.getElementById('izinSiswaHariInfo')); _updateIzinTanggalDisplay('izinSiswaTanggal','izinSiswaTanggalText')"
                  class="absolute inset-0 opacity-0 w-full h-full cursor-pointer box-border" autocomplete="off">
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Mata Pelajaran / Guru
                <span id="izinSiswaHariInfo" class="font-normal normal-case text-gray-400 dark:text-gray-500 ml-1">(${namaHariDefault})</span>
              </label>
              <select id="izinSiswaMapel" class="w-full bg-gray-50 dark:bg-gray-700 border-[1.5px] border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-[13px] rounded-[10px] px-3 py-2 outline-none cursor-pointer box-border">
                <option value="">⏳ Memuat jadwal...</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Jenis</label>
              <div class="grid grid-cols-2 gap-2">
                <label id="lblIzinSiswaIzin" class="flex items-center gap-2 bg-[#e8ecf4] dark:bg-blue-500/10 border-[1.5px] border-[#1b2a4a] dark:border-blue-400 rounded-[10px] px-3 py-2.5 cursor-pointer transition-all">
                  <input type="radio" name="izinSiswaJenis" value="Izin" checked onchange="hlIzinLabel()" class="accent-[#1b2a4a] dark:accent-blue-400 shrink-0" autocomplete="off">
                  <span class="text-[13px] font-bold text-gray-700 dark:text-gray-200">Izin</span>
                </label>
                <label id="lblIzinSiswaSakit" class="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border-[1.5px] border-gray-200 dark:border-gray-600 rounded-[10px] px-3 py-2.5 cursor-pointer transition-all">
                  <input type="radio" name="izinSiswaJenis" value="Sakit" onchange="hlIzinLabel()" class="accent-[#1b2a4a] dark:accent-blue-400 shrink-0" autocomplete="off">
                  <span class="text-[13px] font-bold text-gray-700 dark:text-gray-200">Sakit</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Keterangan <span class="text-gray-400 dark:text-gray-500 font-normal normal-case">(opsional)</span></label>
              <textarea id="izinSiswaKeterangan" rows="2" placeholder="Tulis alasan izin atau kondisi sakit..." class="w-full bg-gray-50 dark:bg-gray-700 border-[1.5px] border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-[13px] rounded-[10px] px-3 py-2 outline-none resize-none box-border placeholder:text-gray-400 dark:placeholder:text-gray-500"></textarea>
            </div>
            <button onclick="submitAjukanIzinSiswa()" class="w-full bg-[#152238] dark:bg-blue-600 hover:opacity-90 dark:hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl border-none cursor-pointer shrink-0 transition">
              Kirim Pengajuan
            </button>
          </div>
        </div>`;
      Swal.fire({ html: html, showConfirmButton: false, background: 'transparent', customClass: { popup: 'siakad-plain-popup' }, showClass: { popup: 'animate__animated animate__fadeInDown animate__faster' } });
      setTimeout(function() {
        _refreshOpsiMapelIzin(today, kelas, document.getElementById('izinSiswaMapel'), document.getElementById('izinSiswaHariInfo'));
        _updateIzinTanggalDisplay('izinSiswaTanggal', 'izinSiswaTanggalText');
      }, 150);
  }
  function hlIzinLabel() {
    const val = document.querySelector('input[name="izinSiswaJenis"]:checked')?.value;
    const lblI = document.getElementById('lblIzinSiswaIzin');
    const lblS = document.getElementById('lblIzinSiswaSakit');
    if (!lblI || !lblS) return;
    const ACTIVE = ['bg-[#e8ecf4]','dark:bg-blue-500/10','border-[#1b2a4a]','dark:border-blue-400'];
    const INACTIVE = ['bg-gray-50','dark:bg-gray-700','border-gray-200','dark:border-gray-600'];
    function setActive(el, active) {
      el.classList.remove(...ACTIVE, ...INACTIVE);
      el.classList.add(...(active ? ACTIVE : INACTIVE));
    }
    setActive(lblI, val === 'Izin');
    setActive(lblS, val === 'Sakit');
  }
  function submitAjukanIzinSiswa() {
    const token = _getAuthToken();
    const tanggal = document.getElementById('izinSiswaTanggal')?.value;
    const mapel = document.getElementById('izinSiswaMapel')?.value;
    const jenis = document.querySelector('input[name="izinSiswaJenis"]:checked')?.value;
    const keterangan = document.getElementById('izinSiswaKeterangan')?.value || '';
    if (!tanggal || !mapel || !jenis) {
      Swal.showValidationMessage('Lengkapi semua kolom yang wajib diisi.');
      return;
    }
    siakadRun
      .withSuccessHandler(function(res) {
        if (res && res.success) {
          Swal.fire({ icon: 'success', title: 'Berhasil!', text: res.message, timer: 2500, showConfirmButton: false });
          loadPerizinanSiswaMilikSaya();
        } else {
          Swal.fire({ icon: 'error', title: 'Gagal', text: (res && res.message) || 'Terjadi kesalahan.' });
        }
      })
      .withFailureHandler(function(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Terjadi kesalahan server.' });
      })
      .ajukanIzinSiswa(token, tanggal, jenis, keterangan, mapel);
  }
  function loadPerizinanSiswaMilikSaya() {
    const token = _getAuthToken();
    if (!token) return;
    const bulanEl = document.getElementById('filterPzSiswaBulan');
    if (bulanEl && !bulanEl.value) {
      const now = new Date();
      bulanEl.value = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    }
    const bulan = bulanEl?.value || '';
    const status = document.getElementById('filterPzSiswaStatus')?.value || '';
    const tbody = document.getElementById('tbody-perizinan-siswa');
    const emptyDiv = document.getElementById('perizinan-siswa-empty');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:#9ca3af;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Memuat...</td></tr>';
    if (emptyDiv) emptyDiv.classList.add('hidden');
    siakadRun
      .withSuccessHandler(function(res) {
        if (!res || !res.success) {
          if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:30px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-circle" style="margin-right:6px;"></i>${(res && res.message) || 'Gagal memuat data.'}</td></tr>`;
          return;
        }
        const allData = res.allData || res.data || [];
        document.getElementById('statPzSiswaMenunggu').textContent  = allData.filter(r=>r.status==='Menunggu').length;
        document.getElementById('statPzSiswaDisetujui').textContent = allData.filter(r=>r.status==='Disetujui').length;
        document.getElementById('statPzSiswaDitolak').textContent   = allData.filter(r=>r.status==='Ditolak').length;
        let rows = res.data || [];
        if (status) rows = rows.filter(r => r.status === status);
        if (rows.length === 0) {
          if (tbody) tbody.innerHTML = '';
          if (emptyDiv) emptyDiv.classList.remove('hidden');
          return;
        }
        if (emptyDiv) emptyDiv.classList.add('hidden');
        const statusBadge = {
          'Menunggu':  `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/50"><i class="fas fa-hourglass-half text-[10px]"></i> Menunggu</span>`,
          'Disetujui': `<span class="inline-flex items-center gap-1 bg-[#e8ecf4] text-[#152238] text-xs font-bold px-2.5 py-1 rounded-full border border-[#b8c4d8]/50"><i class="fas fa-check text-[10px]"></i> Disetujui</span>`,
          'Ditolak':   `<span class="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200/50"><i class="fas fa-times text-[10px]"></i> Ditolak</span>`
        };
        if (tbody) tbody.innerHTML = rows.map((r, idx) => `
          <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition hidden md:table-row">
            <td class="px-4 py-3 text-center text-gray-400 text-xs font-medium">${idx+1}</td>
            <td class="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">${r.tanggalIzin}</td>
            <td class="px-4 py-3 text-gray-700">${r.mapel || '-'}</td>
            <td class="px-4 py-3">
              ${r.jenis === 'Sakit'
                ? '<span class="inline-flex items-center bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/50">Sakit</span>'
                : '<span class="inline-flex items-center bg-[#e8ecf4] text-[#152238] text-xs font-bold px-2.5 py-1 rounded-full border border-[#b8c4d8]/50">Izin</span>'}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title="${r.keterangan || ''}">${r.keterangan || '<span class="text-gray-300">—</span>'}</td>
            <td class="px-4 py-3">${statusBadge[r.status] || r.status}</td>
            <td class="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title="${r.catatanGuru || ''}">${r.catatanGuru || '<span class="text-gray-300">—</span>'}</td>
          </tr>
          <div class="pz-siswa-card md:hidden block">
            <div class="pz-card-head">
              <span class="pz-card-title">${r.mapel || 'Mata Pelajaran'}</span>
              ${statusBadge[r.status] || r.status}
            </div>
            <div class="pz-card-body">
              <div class="pz-card-row"><span class="pz-card-label">Tgl:</span> <span class="pz-card-value">${r.tanggalIzin}</span></div>
              <div class="pz-card-row"><span class="pz-card-label">Jenis:</span> <span class="pz-card-value">${r.jenis}</span></div>
              <div class="mt-1"><span class="pz-card-label">Ket:</span> ${r.keterangan || '-'}</div>
              ${r.catatanGuru ? `<div class="pz-card-note"><span>Catatan:</span> ${r.catatanGuru}</div>` : ''}
            </div>
          </div>`).join('');
      })
      .withFailureHandler(function(err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500"><i class="fas fa-exclamation-circle mr-1"></i>${(err && err.message) || 'Terjadi kesalahan server.'}</td></tr>`;
      })
      .getPerizinanSiswaMilikSaya(token, bulan);
  }
  function loadPerizinanSiswaUntukGuru() {
    const token = _getAuthToken();
    if (!token) return;
    const bulanSGEl = document.getElementById('filterPzSGBulan');
    if (bulanSGEl && !bulanSGEl.value) {
      const now = new Date();
      bulanSGEl.value = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    }
    const bulan  = bulanSGEl?.value || '';
    const status = document.getElementById('filterPzSGStatus')?.value || '';
    const kelas  = document.getElementById('filterPzSGKelas')?.value || '';
    const tbody  = document.getElementById('tbody-perizinan-siswa-guru');
    const emptyDiv = document.getElementById('perizinan-siswa-guru-empty');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="p-10 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat...</td></tr>';
    if (emptyDiv) emptyDiv.classList.add('hidden');
    siakadRun
      .withSuccessHandler(function(res) {
        if (!res || !res.success) {
          if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-red-500">${(res && res.message) || 'Gagal memuat data.'}</td></tr>`;
          return;
        }
        const all = res.allData || res.data || [];
        const menungguCount = all.filter(r=>r.status==='Menunggu').length;
        document.getElementById('statPzSGMenunggu').textContent  = menungguCount;
        document.getElementById('statPzSGDisetujui').textContent = all.filter(r=>r.status==='Disetujui').length;
        document.getElementById('statPzSGDitolak').textContent   = all.filter(r=>r.status==='Ditolak').length;
        const badge = document.getElementById('badge-izin-siswa');
        if (badge) {
          if (menungguCount > 0) { badge.textContent = menungguCount > 99 ? '99+' : menungguCount; badge.style.display = 'inline-flex'; }
          else { badge.style.display = 'none'; }
        }
        let rows = res.data || [];
        // Auto-hide HANYA untuk admin: yang sudah Disetujui & tanggalnya terlewat.
        // Role guru/walikelas tetap melihat riwayat perizinan siswa.
        if (_getCurrentUser().role === 'admin' && !status) {
          const _now = new Date();
          const _today = _now.getFullYear() + '-' + String(_now.getMonth()+1).padStart(2,'0') + '-' + String(_now.getDate()).padStart(2,'0');
          rows = rows.filter(r => !(r.status === 'Disetujui' && String(r.tanggalIzin || '') < _today));
        }
        if (rows.length === 0) {
          if (tbody) tbody.innerHTML = '';
          if (emptyDiv) emptyDiv.classList.remove('hidden');
          return;
        }
        if (emptyDiv) emptyDiv.classList.add('hidden');
        const statusBadge = {
          'Menunggu':  `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/50"><i class="fas fa-hourglass-half text-[10px]"></i> Menunggu</span>`,
          'Disetujui': `<span class="inline-flex items-center gap-1 bg-[#e8ecf4] text-[#152238] text-xs font-bold px-2.5 py-1 rounded-full border border-[#b8c4d8]/50"><i class="fas fa-check text-[10px]"></i> Disetujui</span>`,
          'Ditolak':   `<span class="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200/50"><i class="fas fa-times text-[10px]"></i> Ditolak</span>`
        };
        if (tbody) tbody.innerHTML = rows.map((r, idx) => `
          <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition">
            <td class="px-4 py-3 text-center text-gray-400 text-xs font-medium">${idx+1}</td>
            <td class="px-4 py-3 text-xs font-bold text-gray-800 whitespace-nowrap">${r.tanggalIzin}</td>
            <td class="px-4 py-3 font-bold text-[13px] text-[#0f1d35]">${r.namaSiswa}</td>
            <td class="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">${r.kelas}</td>
            <td class="px-4 py-3 text-xs text-gray-700">${r.mapel || '-'}</td>
            <td class="px-4 py-3">
              ${r.jenis === 'Sakit'
                ? '<span class="inline-flex items-center bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/50">Sakit</span>'
                : '<span class="inline-flex items-center bg-[#e8ecf4] text-[#152238] text-xs font-bold px-2.5 py-1 rounded-full border border-[#b8c4d8]/50">Izin</span>'}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs max-w-[220px] truncate" title="${r.keterangan || ''}">${r.keterangan || '<span class="text-gray-300">—</span>'}</td>
            <td class="px-4 py-3">${statusBadge[r.status] || r.status}</td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1.5 flex-nowrap">
                ${r.status === 'Menunggu' ? `
                  <button onclick="updatePzSiswa(${r.rowId},'Disetujui')" title="Setujui" class="w-7 h-7 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm shrink-0"><i class="fas fa-check text-[11px]"></i></button>
                  <button onclick="updatePzSiswa(${r.rowId},'Ditolak')" title="Tolak" class="w-7 h-7 inline-flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-sm shrink-0"><i class="fas fa-times text-[11px]"></i></button>
                ` : ''}
                ${_getCurrentUser().role === 'admin' ? `
                  <button onclick="hapusPzSiswa(${r.rowId},'${(r.namaSiswa||'').replace(/'/g,"\'")}')" class="w-7 h-7 inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition shrink-0" title="Hapus riwayat izin ini"><i class="fas fa-trash text-[11px]"></i></button>
                ` : ''}
              </div>
            </td>
          </tr>`).join('');
      })
      .withFailureHandler(function(err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="padding:30px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-circle" style="margin-right:6px;"></i>${(err && err.message) || 'Terjadi kesalahan server.'}</td></tr>`;
      })
      .getPerizinanSiswaList(token, status, bulan, kelas);
  }
  // ── Guru setujui / tolak perizinan siswa ──
  function updatePzSiswa(rowId, status) {
    const token = _getAuthToken();
    Swal.fire({
      title: status === 'Disetujui' ? 'Setujui Perizinan?' : 'Tolak Perizinan?',
      html: `<div style="margin-bottom:10px;font-size:13px;color:#6b7280;">Tambahkan catatan (opsional):</div>
             <textarea id="pzSiswaCatatan" rows="2" placeholder="Catatan untuk siswa..." style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px 12px;font-size:13px;resize:vertical;outline:none;box-sizing:border-box;"></textarea>`,
      showCancelButton: true,
      confirmButtonText: status === 'Disetujui' ? '<i class="fas fa-check"></i> Ya, Setujui' : '<i class="fas fa-times"></i> Ya, Tolak',
      cancelButtonText: 'Batal',
      confirmButtonColor: status === 'Disetujui' ? '#1b2a4a' : '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;
      const catatan = document.getElementById('pzSiswaCatatan')?.value || '';
_pzShowLoading();
      siakadRun
        .withSuccessHandler(function(res) {
_pzHideLoading();
          if (res && res.success) {
            Swal.fire({ icon: 'success', title: 'Berhasil!', text: res.message, timer: 2000, showConfirmButton: false });
            loadPerizinanSiswaUntukGuru();
          } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: (res && res.message) || 'Terjadi kesalahan.' });
          }
        })
        .withFailureHandler(function(err) {
_pzHideLoading();
          Swal.fire({ icon: 'error', title: 'Error', text: (err && err.message) || 'Terjadi kesalahan.' });
        })
        .updateStatusPerizinanSiswa(token, rowId, status, catatan);
    });
  }
  // ── Admin: hapus riwayat perizinan siswa ──
  function hapusPzSiswa(rowId, namaSiswa) {
    const token = _getAuthToken();
    Swal.fire({
      title: 'Hapus Riwayat Izin?',
      html: `Riwayat izin <b>${namaSiswa}</b> akan dihapus permanen.<br><span style="font-size:12px;color:#6b7280;">Data absensi terkait tidak ikut terhapus.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-trash"></i> Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;
_pzShowLoading();
      siakadRun
        .withSuccessHandler(function(res) {
_pzHideLoading();
          if (res && res.success) {
            Swal.fire({ icon: 'success', title: 'Terhapus!', text: res.message, timer: 1800, showConfirmButton: false });
            loadPerizinanSiswaUntukGuru();
          } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: (res && res.message) || 'Terjadi kesalahan.' });
          }
        })
        .withFailureHandler(function(err) {
_pzHideLoading();
          Swal.fire({ icon: 'error', title: 'Error', text: (err && err.message) || 'Terjadi kesalahan.' });
        })
        .deletePerizinanSiswa(token, rowId);
    });
  }
  // ── Loader helper (wrapper — gunakan fungsi global dari JavaScript.html jika sudah ada) ──
  function _pzShowLoading() { if (typeof showLoading === 'function') { showLoading(); return; } const el = document.getElementById('loadingOverlay'); if (el) el.classList.remove('hidden'); }
  function _pzHideLoading() { if (typeof hideLoading === 'function') { hideLoading(); return; } const el = document.getElementById('loadingOverlay'); if (el) el.classList.add('hidden'); }
function openAjukanIzinGuruModal() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayVal = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    showModal(`
    <div style="display:flex;flex-direction:column;max-height:90vh;">
        <button onclick="closeModal()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10"><i class="fas fa-times"></i></button>
        <div class="text-center pt-5 pb-3 shrink-0">
            <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-lg shadow-sm"><i class="fas fa-hand-paper"></i></div>
            <h3 class="font-bold text-base text-gray-800">Ajukan Izin</h3>
            <p class="text-xs text-gray-400 mt-0.5">Pilih tanggal dan jenis izin Anda.</p>
        </div>
        <form id="formAjukanIzinGuru" onsubmit="submitAjukanIzinGuru(event)" style="display:flex;flex-direction:column;min-height:0;" class="flex-1">
            <div class="px-5 overflow-y-auto" style="min-height:0;-webkit-overflow-scrolling:touch;">
                <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Tanggal Izin</label>
                <div class="relative mb-3">
                    <span class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-amber-500 z-10"><i class="fas fa-calendar-day"></i></span>
                    <div id="izinGuruTanggalDisplay" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm font-semibold rounded-xl pl-9 pr-3 py-2.5 flex items-center justify-between gap-2 overflow-hidden whitespace-nowrap box-border">
                        <span id="izinGuruTanggalText" class="overflow-hidden text-ellipsis">-</span>
                        <i class="fas fa-chevron-down text-[10px] text-gray-400 shrink-0"></i>
                    </div>
                    <input type="date" name="tanggalIzin" id="izinGuruTanggal" value="${todayVal}" required
                        onchange="_updateIzinTanggalDisplay('izinGuruTanggal','izinGuruTanggalText')"
                        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer box-border">
                </div>
                <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Jenis</label>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <label class="flex items-center justify-center gap-2 border-2 border-gray-200 rounded-xl py-2.5 px-2 cursor-pointer has-[:checked]:border-yellow-400 has-[:checked]:bg-yellow-50 transition">
                        <input type="radio" name="jenisIzin" value="Sakit" required class="accent-yellow-500">
                        <span class="text-sm font-bold text-gray-700"><i class="fas fa-procedures mr-1 text-yellow-500"></i> Sakit</span>
                    </label>
                    <label class="flex items-center justify-center gap-2 border-2 border-gray-200 rounded-xl py-2.5 px-2 cursor-pointer has-[:checked]:border-blue-400 has-[:checked]:bg-[#e8ecf4] transition">
                        <input type="radio" name="jenisIzin" value="Izin" required class="accent-blue-500">
                        <span class="text-sm font-bold text-gray-700"><i class="fas fa-envelope-open-text mr-1 text-blue-500"></i> Izin</span>
                    </label>
                </div>
                <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Keterangan (opsional)</label>
                <textarea name="keterangan" rows="2" placeholder="Contoh: Demam sejak semalam" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 transition-all mb-3" style="resize:none;"></textarea>
            </div>
            <div class="shrink-0 flex gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
                <button type="button" onclick="closeModal()" class="flex-1 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition text-sm">Batal</button>
                <button type="submit" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-bold shadow-lg transition transform active:scale-95 text-sm">Kirim</button>
            </div>
        </form>
    </div>`, 'max-w-sm');
}
function submitAjukanIzinGuru(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    const fd = new FormData(form);
    const tanggal = fd.get('tanggalIzin');
    const jenis = fd.get('jenisIzin');
    const keterangan = fd.get('keterangan') || '';
    if (!tanggal) { showAlert('error', 'Pilih tanggal izin terlebih dahulu'); return; }
    if (!jenis) { showAlert('error', 'Pilih jenis izin terlebih dahulu (Sakit/Izin)'); return; }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Mengirim...';
    const token = currentUser ? currentUser.token : null;
    siakadRun
        .withSuccessHandler(r => {
            if (r && r.success) {
                closeModal();
                showAlert('success', r.message);
                loadGuruDashboard();
            } else {
                btn.disabled = false; btn.innerHTML = originalText;
                showAlert('error', r ? r.message : 'Terjadi kesalahan tidak diketahui');
            }
        })
        .withFailureHandler(error => {
            btn.disabled = false; btn.innerHTML = originalText;
            showAlert('error', 'Gagal koneksi server: ' + error);
        })
        .ajukanIzinGuru(token, jenis, keterangan, tanggal);
}
    async function renderGuruChart(hadir, sakit, izin, alpa, belumAbsen, libur) {
        const ctx = document.getElementById('guruAttendanceChart');
        if (!ctx) return;
        await ensureLib('chartjs');
        if (guruChartInstance) {
            guruChartInstance.destroy();
        }
        if (typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); }
        guruChartInstance = new Chart(ctx, {
            type: 'bar', 
            data: {
                labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Absen', 'Libur'],
                datasets: [{
                    label: 'Jumlah Siswa',
                    data: [hadir, sakit, izin, alpa, belumAbsen, libur || 0],
                    backgroundColor: [
                        '#3b82f6', 
                        '#F59E0B', 
                        '#3b82f6', 
                        '#EF4444', 
                        '#9CA3AF',
                        '#d0d8e8'
                    ],
                    borderRadius: 6,
                    barPercentage: 0.6,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, 
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value > 0 ? value : '', 
                        font: { weight: 'bold', size: 11 },
                        color: _siakadChartColors().datalabelSoft
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [2, 4], color: _siakadChartColors().gridFaint },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        if(!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
    function loadSiswaDashboard() {
        stopAndBack(false);
        setActiveMenu('Dashboard');
        showView('view-siswa-dashboard');
        // Grafik rekap nilai di dashboard
        try {
            siakadRun
                .withSuccessHandler(function(res) {
                    if (res && res.success) {
                        nilaiDataFull = Array.isArray(res.data) ? res.data : [];
                        renderNilaiChart(nilaiDataFull);
                    }
                })
                .withFailureHandler(function() {})
                .getNilaiList(currentUser ? currentUser.token : '', '', '');
        } catch (e) {}
        try {
            const safeSetText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };
            if (currentUser) {
                const firstName = currentUser.nama ? currentUser.nama.split(' ')[0] : 'Siswa';
                safeSetText('dashGreeting', firstName);
                safeSetText('profileNameSidebar', currentUser.nama);
                safeSetText('profileNisnSidebar', currentUser.nisn);
                // Alumni: tampilkan tahun lulus di kolom Kelas, ubah status
                if (currentUser.role === 'alumni') {
                    const tahunLulus = currentUser.tahunLulus || currentUser.tahun_lulus || '';
                    safeSetText('profileKelasSidebar', tahunLulus ? 'Lulus ' + tahunLulus : 'Alumni');
                    const elStatus = document.getElementById('profileStatusSidebar');
                    if (elStatus) {
                        elStatus.className = 'sd-pf-val';
                        elStatus.style.color = '#6b7280';
                        elStatus.textContent = 'Alumni';
                    }
                    const elKelasLabel = document.querySelector('#view-siswa-dashboard .sd-pf-item:first-child .sd-pf-label');
                    if (elKelasLabel) elKelasLabel.textContent = 'Tahun Lulus';
                } else {
                    safeSetText('profileKelasSidebar', currentUser.kelas);
                    const elStatus = document.getElementById('profileStatusSidebar');
                    if (elStatus) {
                        elStatus.className = 'sd-pf-val val-active';
                        elStatus.style.color = '';
                        elStatus.textContent = 'Aktif';
                    }
                    const elKelasLabel = document.querySelector('#view-siswa-dashboard .sd-pf-item:first-child .sd-pf-label');
                    if (elKelasLabel) elKelasLabel.textContent = 'Kelas';
                }
            }
            const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            safeSetText('dashDate', today);
        } catch (e) {}
        // Alumni tidak memiliki jadwal/absensi aktif  sembunyikan section terkait
        if (currentUser && currentUser.role === 'alumni') {
            const elBadge = document.getElementById('dashStatusBadge');
            const elAlert = document.getElementById('alertBelumAbsen');
            const elScheduleWrap = document.querySelector('#view-siswa-dashboard .sd-schedule-wrap');
            if (elBadge) {
                elBadge.className = "sd-badge badge-done";
                elBadge.innerHTML = `<i class="fas fa-graduation-cap"></i> Alumni`;
            }
            if (elAlert) { elAlert.classList.add('hidden'); elAlert.classList.remove('flex'); }
            if (elScheduleWrap) elScheduleWrap.style.display = 'none';
            return;
        }
        // Tampilkan kembali schedule wrap jika role bukan alumni
        const elScheduleWrapSiswa = document.querySelector('#view-siswa-dashboard .sd-schedule-wrap');
        if (elScheduleWrapSiswa) elScheduleWrapSiswa.style.display = '';
        loadJadwalSiswaDashboard();
        siakadRun.withSuccessHandler(result => {
            hideLoading();
            try {
                const absensi = result && result.success ? result.data : null;
                const isLibur = result.isLibur; 
                const infoLibur = result.keteranganLibur;
                const elHero = document.getElementById('heroCard');
                const elBadge = document.getElementById('dashStatusBadge');
                const elValMasuk = document.getElementById('valMasuk');
                const elValPulang = document.getElementById('valPulang');
                const elAlert = document.getElementById('alertBelumAbsen');
                // heroCard stays dark always - no class swap needed
                if (isLibur) {
                    if (elBadge) {
                        elBadge.className = "sd-badge badge-holiday";
                        elBadge.innerHTML = `<i class="fas fa-umbrella-beach"></i> Hari Libur`;
                    }
                    if (elAlert) { elAlert.classList.add('hidden'); elAlert.classList.remove('flex'); }
                    return;
                }
                if (!absensi) {
                    if (elBadge) {
                        elBadge.className = "sd-badge badge-absent";
                        elBadge.innerHTML = `<i class="fas fa-circle" style="font-size:7px;"></i> Belum Absen`;
                    }
                    if (elAlert) { elAlert.classList.remove('hidden'); elAlert.classList.add('flex'); }
                } else {
                    if (elAlert) { elAlert.classList.add('hidden'); elAlert.classList.remove('flex'); }
                    if (!absensi.jamPulang) {
                        if (elBadge) {
                            elBadge.className = "sd-badge";
                            elBadge.innerHTML = `<i class="fas fa-clock"></i> Berlangsung`;
                        }
                    } else {
                        if (elBadge) {
                            elBadge.className = "sd-badge badge-done";
                            elBadge.innerHTML = `<i class="fas fa-check-circle"></i> Selesai`;
                        }
                    }
                }
            } catch (err) { console.error("Error rendering dashboard:", err); }
        }).withFailureHandler(error => { hideLoading(); }).getAbsensiToday(currentUser.nisn);
    }
    function loadJadwalSiswaDashboard() {
        const listEl = document.getElementById('jadwalSiswaList');
        const labelEl = document.getElementById('jadwalHariLabel');
        const countEl = document.getElementById('jadwalHariCount');
        if (!listEl) return;
        listEl.innerHTML = `<div style="padding:24px 0;text-align:center;color:#64748b;">
            <i class="fas fa-circle-notch fa-spin" style="font-size:14px;display:block;margin-bottom:6px;"></i>
            <span style="font-size:11px;">Memuat jadwal…</span>
        </div>`;
        const myKelas = currentUser ? (currentUser.kelas || '') : '';
        siakadRun
            .withSuccessHandler(res => {
                const hari = res.hari || '';
                if (labelEl) labelEl.textContent = `${hari} · ${myKelas || 'Kelas tidak diketahui'}`;
                renderJadwalSiswaDashboard(res.data || [], hari, countEl, listEl);
            })
            .withFailureHandler(() => {
                if (listEl) listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#f87171;font-size:11px;"><i class="fas fa-exclamation-circle" style="margin-right:4px;"></i>Gagal memuat jadwal.</div>`;
            })
            .getJadwalHariIni(myKelas || null);
    }
    function renderJadwalSiswaDashboard(data, hari, countEl, listEl) {
        if (!listEl) return;
        if (!data || data.length === 0) {
            if (countEl) { countEl.textContent = ''; }
            listEl.innerHTML = `<div style="padding:28px 20px;text-align:center;color:#64748b;">
                <i class="fas fa-calendar-times" style="font-size:18px;display:block;margin-bottom:8px;opacity:.4;"></i>
                <p style="font-size:12px;font-weight:700;color:#94a3b8;">Tidak ada jadwal hari ${hari}</p>
                <p style="font-size:10px;color:#64748b;margin-top:3px;">Jadwal akan muncul jika sudah diinput oleh admin.</p>
            </div>`;
            return;
        }
        if (countEl) countEl.textContent = `${data.length} Pelajaran`;
        const nowStr = new Date().toTimeString().slice(0, 5);
        listEl.innerHTML = data.map((m, i) => {
            const sudahSelesai = m.jam_selesai && nowStr > m.jam_selesai;
            const sedangBerlangsung = m.jam_mulai && m.jam_selesai && nowStr >= m.jam_mulai && nowStr <= m.jam_selesai;
            let chip = '';
            let rowClass = 'sched-row';
            if (sedangBerlangsung) {
                chip = `<span class="sched-chip chip-live"><i class="fas fa-circle" style="font-size:5px;margin-right:4px;"></i>Berlangsung</span>`;
                rowClass = 'sched-row sched-active';
            } else if (sudahSelesai) {
                chip = `<span class="sched-chip chip-done">Selesai</span>`;
                rowClass = 'sched-row sched-done';
            }
            return `
            <div class="${rowClass}">
                <div class="sched-num">${i + 1}</div>
                <div class="sched-info">
                    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
                        <span class="sched-mapel">${m.mapel}</span>
                        ${chip}
                    </div>
                    <div class="sched-meta">
                        <span style="font-family:monospace;font-weight:600;">${m.jam_mulai || '--:--'} - ${m.jam_selesai || '--:--'}</span>
                        ${m.pengajar ? `<span style="margin-left:8px;"><i class="fas fa-user-tie" style="font-size:8px;margin-right:3px;"></i>${m.pengajar}</span>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    }
function loadPerizinanGuru() {
    setActiveMenu('Perizinan Guru');
    if (!document.getElementById('view-perizinan-guru')) {
        const div = document.createElement('div');
        div.id = 'view-perizinan-guru';
        div.className = 'view-section';
        div.style.display = 'none';
        div.innerHTML = `
        <style>

            #view-perizinan-guru .pz-filter-wrap {
                background: #fff;
                border: 1px solid #d0d8e8;
                border-radius: 16px;
                padding: 16px 20px;
            }
            #view-perizinan-guru .pz-table-wrap {
                background: #fff;
                border: 1px solid #d0d8e8;
                border-radius: 18px;
                overflow: hidden;
                box-shadow: 0 2px 12px rgba(0,0,0,0.04);
            }
            #view-perizinan-guru table thead tr {
                background: #1b2a4a;
            }
            #view-perizinan-guru table thead th {
                padding: 13px 16px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                color: rgba(255,255,255,0.92);
                white-space: nowrap;
            }
            #view-perizinan-guru table tbody tr {
                border-bottom: 1px solid #eef0f6;
                transition: background 0.15s;
            }
            #view-perizinan-guru table tbody tr:last-child { border-bottom: none; }
            #view-perizinan-guru table tbody tr:hover { background: #f4f6fb; }
            #view-perizinan-guru table tbody td {
                padding: 13px 16px;
                vertical-align: middle;
            }
            #view-perizinan-guru .no-col {
                color: #8fa3c0;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
                width: 42px;
            }
            #view-perizinan-guru .btn-proses {
                display: inline-flex; align-items: center; gap: 5px;
                background: #ecfdf5; color: #1d4ed8;
                border: 1px solid #a7f3d0;
                font-size: 11px; font-weight: 700;
                padding: 5px 12px; border-radius: 8px;
                cursor: pointer; transition: all 0.15s;
                white-space: nowrap;
            }
            #view-perizinan-guru .btn-proses:hover { background: #d1fae5; border-color: #6ee7b7; }
            #view-perizinan-guru .btn-hapus {
                display: inline-flex; align-items: center; justify-content: center;
                background: #fff1f2; color: #dc2626;
                border: 1px solid #fecaca;
                width: 30px; height: 30px; border-radius: 8px;
                cursor: pointer; transition: all 0.15s; font-size: 12px;
            }
            #view-perizinan-guru .btn-hapus:hover { background: #fee2e2; border-color: #fca5a5; }
            #view-perizinan-guru .pz-input {
                width: 100%;
                background: #f4f6fb;
                border: 1px solid #d0d8e8;
                color: #1f2937;
                font-size: 13px;
                border-radius: 10px;
                padding: 8px 12px;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            #view-perizinan-guru .pz-input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
            }
        </style>
        <div style="padding:12px 16px 20px;display:flex;flex-direction:column;gap:12px;" class="animate-fade-in">
            <!-- HEADER BANNER -->
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:14px 18px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div>
                    <h3 style="font-size:15px;font-weight:800;color:#111827;margin:0;line-height:1.2;">Perizinan Guru</h3>
                    <p style="font-size:12px;color:#9ca3af;margin:3px 0 0 0;">Kelola pengajuan izin &amp; sakit dari guru</p>
                </div>
                <!-- STATISTIK KOMPAK -->
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-left:auto;" id="statPerizinanWrap">
                    <span style="display:inline-flex;align-items:center;gap:7px;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:6px 14px;font-size:11px;">
                        <i class="fas fa-hourglass-half" style="color:#d97706;font-size:10px;"></i>
                        <b style="font-size:15px;color:#b45309;line-height:1;" id="statPzMenunggu">-</b>
                        <span style="font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.4px;font-size:10px;">Menunggu</span>
                    </span>
                    <span style="display:inline-flex;align-items:center;gap:7px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:6px 14px;font-size:11px;">
                        <i class="fas fa-check-circle" style="color:#16a34a;font-size:10px;"></i>
                        <b style="font-size:15px;color:#15803d;line-height:1;" id="statPzDisetujui">-</b>
                        <span style="font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.4px;font-size:10px;">Disetujui</span>
                    </span>
                    <span style="display:inline-flex;align-items:center;gap:7px;background:#fff1f2;border:1px solid #fecdd3;border-radius:999px;padding:6px 14px;font-size:11px;">
                        <i class="fas fa-times-circle" style="color:#dc2626;font-size:10px;"></i>
                        <b style="font-size:15px;color:#dc2626;line-height:1;" id="statPzDitolak">-</b>
                        <span style="font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.4px;font-size:10px;">Ditolak</span>
                    </span>
                </div>
            </div>
            <!-- FILTER BAR -->
            <div class="pz-filter-wrap">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
                    <div style="flex:1;min-width:140px;">
                        <label style="display:block;font-size:11px;font-weight:700;color:#5b7aaa;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.4px;">
                            <i class="fas fa-calendar-alt" style="color:#3b82f6;margin-right:4px;"></i>Bulan
                        </label>
                        <input type="month" id="filterPerizinanBulan" class="pz-input">
                    </div>
                    <div style="flex:1;min-width:130px;">
                        <label style="display:block;font-size:11px;font-weight:700;color:#5b7aaa;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.4px;">
                            <i class="fas fa-tag" style="color:#3b82f6;margin-right:4px;"></i>Status
                        </label>
                        <select id="filterPerizinanStatus" class="pz-input" style="cursor:pointer;">
                            <option value="">Semua Status</option>
                            <option value="Menunggu" selected>Menunggu</option>
                            <option value="Disetujui">Disetujui</option>
                            <option value="Ditolak">Ditolak</option>
                        </select>
                    </div>
                    <button onclick="filterAndLoadPerizinan()"
                        style="display:inline-flex;align-items:center;gap:7px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;padding:9px 20px;border-radius:10px;border:none;cursor:pointer;transition:background 0.2s;box-shadow:0 2px 8px rgba(37,99,235,0.25);white-space:nowrap;"
                        onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                        <i class="fas fa-search"></i> Tampilkan
                    </button>
                </div>
            </div>
            <!-- TABEL -->
            <div class="pz-table-wrap">
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead>
                            <tr>
                                <th class="no-col" style="padding:13px 8px 13px 16px;color:rgba(255,255,255,0.8);">#</th>
                                <th style="padding:13px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.92);">Tanggal Izin</th>
                                <th style="padding:13px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.92);">Nama Guru</th>
                                <th style="padding:13px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.92);">Jenis</th>
                                <th style="padding:13px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.92);">Keterangan</th>
                                <th style="padding:13px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.92);">Status</th>
                                <th style="padding:13px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.92);">Catatan Admin</th>
                                <th style="padding:13px 16px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:rgba(255,255,255,0.92);" id="thAksiPerizinan">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-perizinan">
                            <tr><td colspan="8" style="padding:40px;text-align:center;color:#8fa3c0;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Memuat data perizinan...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="perizinan-empty" class="hidden" style="padding:56px 20px;text-align:center;color:#8fa3c0;">
                    <div style="width:64px;height:64px;background:#e8ecf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px;color:#b8c4d8;">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <p style="font-size:15px;font-weight:700;color:#1e2d4a;margin:0 0 4px;">Belum ada data perizinan</p>
                    <p style="font-size:12px;color:#8fa3c0;margin:0;">Perizinan akan muncul saat guru mengajukan izin</p>
                </div>
            </div>
        </div>`;
        const mainContent = document.getElementById('mainContent') || document.querySelector('main') || document.body;
        mainContent.appendChild(div);
    }
    showView('view-perizinan-guru');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const bulanIni = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
    const inputBulan = document.getElementById('filterPerizinanBulan');
    if (inputBulan && !inputBulan.value) inputBulan.value = bulanIni;
    filterAndLoadPerizinan();
}
function filterAndLoadPerizinan(reset) {
    const status = document.getElementById('filterPerizinanStatus')?.value || '';
    const bulan  = document.getElementById('filterPerizinanBulan')?.value  || '';
    const tbody  = document.getElementById('tbody-perizinan');
    if (!tbody) return;
    const thAksi = document.getElementById('thAksiPerizinan');
    tbody.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:#8fa3c0;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Memuat data perizinan...</td></tr>';
    siakadRun
        .withSuccessHandler(function(res) {
            if (!res.success) {
                tbody.innerHTML = `<tr><td colspan="8" style="padding:40px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i>${res.message}</td></tr>`;
                return;
            }
            const isAdmin = !!res.canSeeAll;
            if (thAksi) thAksi.style.display = isAdmin ? '' : 'none';
            let data = res.data || [];
            const allData = res.allData || data;
            // Auto-hide HANYA untuk admin: yang sudah Disetujui & tanggalnya terlewat.
            // Role guru tetap melihat riwayat izinnya sendiri.
            if (isAdmin && !status) {
                const _today = (() => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0'); })();
                data = data.filter(d => !(d.status === 'Disetujui' && String(d.tanggalIzin || '') < _today));
            }
            document.getElementById('statPzMenunggu').textContent  = allData.filter(d => d.status === 'Menunggu').length;
            document.getElementById('statPzDisetujui').textContent = allData.filter(d => d.status === 'Disetujui').length;
            document.getElementById('statPzDitolak').textContent   = allData.filter(d => d.status === 'Ditolak').length;
            if (typeof _setBadgeCount === 'function') {
                _setBadgeCount('badge-perizinan-guru', allData.filter(d => d.status === 'Menunggu').length);
            }
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="padding:48px;text-align:center;color:#8fa3c0;"><i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:10px;"></i>Tidak ada data perizinan.</td></tr>';
                return;
            }
            const statusBadge = (s) => {
                if (s === 'Disetujui') return `<span class="inline-flex items-center gap-1 bg-[#e8ecf4] text-[#152238] text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200/50"><i class="fas fa-check-circle text-[10px]"></i> ${s}</span>`;
                if (s === 'Ditolak')   return `<span class="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200/50"><i class="fas fa-times-circle text-[10px]"></i> ${s}</span>`;
                return `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/50"><i class="fas fa-hourglass-half text-[10px]"></i> ${s}</span>`;
            };
            const jenisBadge = (j) => {
                if (j === 'Sakit') return `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/50">Sakit</span>`;
                return `<span class="inline-flex items-center gap-1 bg-[#e8ecf4] text-[#152238] text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200/50">Izin</span>`;
            };
            const fmtTgl = (s) => {
                if (!s) return '-';
                try { return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' }); }
                catch(e) { return s; }
            };
            tbody.innerHTML = data.map((d, idx) => `
                <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition">
                    <td class="px-4 py-3 text-center text-gray-400 text-xs font-medium">${idx + 1}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="text-xs font-bold text-gray-800">${fmtTgl(d.tanggalIzin)}</span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="font-bold text-gray-800 text-[13px]">${d.nama || '-'}</div>
                        <div class="text-[11px] text-gray-400 mt-0.5">${d.jabatan || d.nip || ''}</div>
                    </td>
                    <td class="px-4 py-3">${jenisBadge(d.jenis)}</td>
                    <td class="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title="${d.keterangan || ''}">${d.keterangan || '<span class="text-gray-300">-</span>'}</td>
                    <td class="px-4 py-3">${statusBadge(d.status)}</td>
                    <td class="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title="${d.catatanAdmin || ''}">${d.catatanAdmin || '<span class="text-gray-300">-</span>'}</td>
                    <td class="px-4 py-3 text-center"${!isAdmin ? ' class="hidden"' : ''}>
                        ${isAdmin ? `
                        <div class="flex items-center justify-center gap-1.5 flex-nowrap">
                            <button class="inline-flex items-center gap-1 bg-[#1b2a4a] hover:bg-[#152238] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition shadow-sm whitespace-nowrap" onclick="bukaPerizinanApproval(${d.rowId}, '${(d.nama||'').replace(/'/g,"&#39;")}', '${d.tanggalIzin}', '${d.jenis}', '${d.status}', '${(d.catatanAdmin||'').replace(/'/g,"&#39;")}')">
                                <i class="fas fa-pen text-[10px]"></i> Proses
                            </button>
                            <button class="inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 w-7 h-7 rounded-lg transition shrink-0" onclick="hapusPerizinan(${d.rowId}, '${(d.nama||'').replace(/'/g,"&#39;")}')" title="Hapus">
                                <i class="fas fa-trash-alt text-[11px]"></i>
                            </button>
                        </div>` : ''}
                    </td>
                </tr>`).join('');
        })
        .withFailureHandler(function(err) {
            const tbody = document.getElementById('tbody-perizinan');
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding:40px;text-align:center;color:#ef4444;">Gagal koneksi: ${err}</td></tr>`;
        })
        .getPerizinanList(currentUser.token, status, bulan);
}
function bukaPerizinanApproval(rowId, nama, tanggalIzin, jenis, statusSaatIni, catatanLama) {
    const fmtTgl = (s) => {
        if (!s) return '-';
        try { return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
        catch(e) { return s; }
    };
    showModal(`
    <div style="background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.18);padding:20px;width:100%;margin:0 auto;position:relative;">
        <button onclick="closeModal()" style="position:absolute;top:14px;right:14px;background:#e8ecf4;border:none;width:28px;height:28px;border-radius:8px;cursor:pointer;color:#5b7aaa;font-size:13px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#d0d8e8'" onmouseout="this.style.background='#e8ecf4'"><i class="fas fa-times"></i></button>
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="width:36px;height:36px;background:#e8ecf4;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas fa-file-signature" style="color:#1b2a4a;font-size:15px;"></i>
            </div>
            <div>
                <div style="font-size:14px;font-weight:800;color:#1f2937;">Proses Perizinan</div>
                <div style="font-size:11px;color:#8fa3c0;">Atur keputusan izin guru</div>
            </div>
        </div>
        <!-- Info ringkas -->
        <div style="background:#f4f6fb;border:1px solid #d0d8e8;border-radius:12px;padding:12px 14px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
                <span style="font-size:11px;color:#5b7aaa;font-weight:600;">Guru</span>
                <span style="font-size:13px;font-weight:700;color:#111827;">${nama}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
                <span style="font-size:11px;color:#5b7aaa;font-weight:600;">Tanggal</span>
                <span style="font-size:12px;font-weight:600;color:#1e2d4a;">${fmtTgl(tanggalIzin)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:11px;color:#5b7aaa;font-weight:600;">Jenis</span>
                <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:999px;${jenis==='Sakit'?'background:#fffbeb;color:#b45309;border:1px solid #fde68a;':'background:#e8ecf4;color:#152238;border:1px solid #d0d8e8;'}">${jenis}</span>
            </div>
        </div>
        <!-- Keputusan -->
        <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:#5b7aaa;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Keputusan</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <label id="pzOptMenunggu" onclick="pzPickStatus(this,'Menunggu')" style="display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid ${statusSaatIni==='Menunggu'?'#fbbf24':'#d0d8e8'};background:${statusSaatIni==='Menunggu'?'#fffbeb':'#fff'};border-radius:11px;padding:10px 6px;cursor:pointer;transition:all 0.15s;">
                    <input type="radio" name="statusPz" value="Menunggu" style="display:none;" ${statusSaatIni==='Menunggu'?'checked':''}>
                    <i class="fas fa-hourglass-half" style="color:#d97706;font-size:15px;"></i>
                    <span style="font-size:10px;font-weight:700;color:#1e2d4a;">Menunggu</span>
                </label>
                <label id="pzOptDisetujui" onclick="pzPickStatus(this,'Disetujui')" style="display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid ${statusSaatIni==='Disetujui'?'#22c55e':'#d0d8e8'};background:${statusSaatIni==='Disetujui'?'#f0fdf4':'#fff'};border-radius:11px;padding:10px 6px;cursor:pointer;transition:all 0.15s;">
                    <input type="radio" name="statusPz" value="Disetujui" style="display:none;" ${statusSaatIni==='Disetujui'?'checked':''}>
                    <i class="fas fa-check-circle" style="color:#16a34a;font-size:15px;"></i>
                    <span style="font-size:10px;font-weight:700;color:#1e2d4a;">Setujui</span>
                </label>
                <label id="pzOptDitolak" onclick="pzPickStatus(this,'Ditolak')" style="display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid ${statusSaatIni==='Ditolak'?'#ef4444':'#d0d8e8'};background:${statusSaatIni==='Ditolak'?'#fff1f2':'#fff'};border-radius:11px;padding:10px 6px;cursor:pointer;transition:all 0.15s;">
                    <input type="radio" name="statusPz" value="Ditolak" style="display:none;" ${statusSaatIni==='Ditolak'?'checked':''}>
                    <i class="fas fa-times-circle" style="color:#dc2626;font-size:15px;"></i>
                    <span style="font-size:10px;font-weight:700;color:#1e2d4a;">Tolak</span>
                </label>
            </div>
        </div>
        <!-- Catatan -->
        <div style="margin-bottom:16px;">
            <label style="display:block;font-size:11px;font-weight:700;color:#5b7aaa;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Catatan Admin <span style="font-weight:400;text-transform:none;">(opsional)</span></label>
            <textarea id="inputCatatanPz" rows="2" placeholder="Misal: Harap lampirkan surat dokter" style="width:100%;background:#f4f6fb;border:1px solid #d0d8e8;color:#1f2937;font-size:13px;border-radius:10px;padding:9px 12px;resize:none;outline:none;box-sizing:border-box;transition:border-color 0.2s;" onfocus="this.style.borderColor='#1b2a4a'" onblur="this.style.borderColor='#d0d8e8'">${catatanLama}</textarea>
        </div>
        <!-- Tombol -->
        <div style="display:flex;gap:10px;">
            <button onclick="closeModal()" style="flex:1;background:#e8ecf4;color:#1e2d4a;padding:10px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;" onmouseover="this.style.background='#d0d8e8'" onmouseout="this.style.background='#e8ecf4'">Batal</button>
            <button onclick="simpanStatusPerizinan(${rowId})" style="flex:1;background:#2563eb;color:#fff;padding:10px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.3);" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">Simpan</button>
        </div>
    </div>`, 'max-w-sm');
    setTimeout(function() {
        _updateIzinTanggalDisplay('izinGuruTanggal', 'izinGuruTanggalText');
    }, 50);
}
function pzPickStatus(el, status) {
    const radio = el.querySelector('input[name="statusPz"]');
    if (radio) radio.checked = true;
    const styles = {
        'Menunggu':  { border: '#fbbf24', bg: '#fffbeb', id: 'pzOptMenunggu' },
        'Disetujui': { border: '#22c55e', bg: '#f0fdf4', id: 'pzOptDisetujui' },
        'Ditolak':   { border: '#ef4444', bg: '#fff1f2', id: 'pzOptDitolak' }
    };
    Object.keys(styles).forEach(function (key) {
        const box = document.getElementById(styles[key].id);
        if (!box) return;
        const aktif = key === status;
        box.style.border = '2px solid ' + (aktif ? styles[key].border : '#d0d8e8');
        box.style.background = aktif ? styles[key].bg : '#fff';
    });
}
function simpanStatusPerizinan(rowId) {
    const radio = document.querySelector('input[name="statusPz"]:checked');
    if (!radio) { showAlert('error', 'Pilih keputusan terlebih dahulu.'); return; }
    const status = radio.value;
    const catatan = document.getElementById('inputCatatanPz')?.value || '';
    showLoading();
    siakadRun
        .withSuccessHandler(function(res) {
            hideLoading();
            if (res.success) {
                closeModal();
                showAlert('success', res.message);
                filterAndLoadPerizinan();
            } else {
                showAlert('error', res.message);
            }
        })
        .withFailureHandler(function(err) {
            hideLoading();
            showAlert('error', 'Gagal koneksi: ' + err);
        })
        .updateStatusPerizinan(currentUser.token, rowId, status, catatan);
}
function hapusPerizinan(rowId, nama) {
    Swal.fire({
        title: 'Hapus Perizinan?',
        html: `Data perizinan <b>${nama}</b> akan dihapus permanen.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Batal',
        confirmButtonText: 'Ya, Hapus'
    }).then(result => {
        if (result.isConfirmed) {
            showLoading();
            siakadRun
                .withSuccessHandler(function(res) {
                    hideLoading();
                    if (res.success) {
                        Swal.fire({ icon:'success', title:'Terhapus!', timer:1200, showConfirmButton:false });
                        filterAndLoadPerizinan();
                    } else {
                        Swal.fire({ icon:'error', title:'Gagal', text: res.message });
                    }
                })
                .withFailureHandler(function(err) {
                    hideLoading();
                    Swal.fire({ icon:'error', title:'Error', text: err.toString() });
                })
                .deletePerizinan(currentUser.token, rowId);
        }
    });
}