  function kaTab(tab) {
    document.getElementById('ka-panel-waktu').classList.toggle('hidden', tab !== 'waktu');
    document.getElementById('ka-panel-libur').classList.toggle('hidden', tab !== 'libur');
    const tw = document.getElementById('ka-tab-waktu');
    const tl = document.getElementById('ka-tab-libur');
    const activeCls = 'flex-1 sm:flex-none text-center px-4 py-2 text-xs font-bold rounded-lg bg-[#1b2a4a] text-white shadow transition-all whitespace-nowrap';
    const inactiveCls = 'flex-1 sm:flex-none text-center px-4 py-2 text-xs font-bold rounded-lg text-gray-500 hover:text-gray-700 transition-all whitespace-nowrap';
    if (tab === 'waktu') {
      tw.className = activeCls;
      tl.className = inactiveCls;
    } else {
      tl.className = activeCls;
      tw.className = inactiveCls;
    }
  }
    function loadKelolaAbsen() {
        stopAndBack(false);
        setActiveMenu('Kelola Absen');
        showView('view-kelola-absen');
        document.getElementById('tbody-libur').innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data...</td></tr>';
        siakadRun.withSuccessHandler(result => {
            if (result.success) {
                tableState.libur.fullData = result.data;
                processTableData('libur');
            } else {
                document.getElementById('tbody-libur').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">Gagal memuat data.</td></tr>';
            }
        }).getHariLibur();
        loadGlobalConfig();
    }
    const HARI_NAMES = { '1':'Senin', '2':'Selasa', '3':'Rabu', '4':'Kamis', '5':'Jumat', '6':'Sabtu', '7':'Minggu' };
    const HARI_COLORS = { '1':'blue', '2':'blue', '3':'blue', '4':'blue', '5':'blue', '6':'orange', '7':'red' };
    let _jadwalHarian = null;
    function renderJadwalHarian(jadwal) {
        _jadwalHarian = jadwal;
        const container = document.getElementById('jadwal-hari-container');
        if (!container) return;
        let html = '';
        for (let d = 1; d <= 7; d++) {
            const key = String(d);
            const hari = jadwal[key] || { libur: d===7, libur_rutinan: true, masuk_mulai:'06:00', masuk_akhir:'07:15', ket_libur:'' };
            const isLibur = !!hari.libur;
            const isRutinan = hari.libur_rutinan !== false;
            const ketLibur = hari.ket_libur || '';
            const col = HARI_COLORS[key];
            const cardBg = isLibur ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200';
            const badgeClass = isLibur
                ? (isRutinan ? 'bg-[#e8ecf4] text-[#1b2a4a]' : 'bg-red-100 text-red-600')
                : 'bg-[#d0d8e8] text-[#1b2a4a]';
            const badgeText = isLibur
                ? (isRutinan ? '<i class="fas fa-redo mr-1"></i>Libur Rutin' : '<i class="fas fa-star mr-1"></i>Libur Khusus')
                : '<i class="fas fa-check-circle mr-1"></i>Masuk';
            html += `
            <div class="rounded-xl border ${cardBg} overflow-hidden transition-all duration-200" id="card-hari-${key}">
              <!-- Row utama -->
              <div class="flex items-center gap-3 px-3 py-2.5">
                <div class="w-7 h-7 rounded-lg bg-${col}-50 flex items-center justify-center shrink-0">
                  <i class="fas fa-calendar-day text-${col}-500 text-xs"></i>
                </div>
                <span class="text-xs font-bold text-gray-700 flex-1">${HARI_NAMES[key]}</span>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${badgeClass}" id="badge-${key}">${badgeText}</span>
                <label class="relative inline-flex items-center cursor-pointer shrink-0" onclick="event.stopPropagation()">
                  <input type="checkbox" class="sr-only peer" id="toggle-libur-${key}" ${isLibur ? '' : 'checked'}
                     onchange="onToggleMasuk('${key}', this.checked)">
                  <div class="w-8 h-4 bg-red-300 peer-checked:bg-[#1b2a4a] rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                </label>
              </div>
              <!-- Detail jam (jika masuk) -->
              <div id="detail-hari-${key}" class="${isLibur ? 'hidden' : ''} px-3 pb-2.5 border-t border-gray-100">
                <div class="flex gap-2 mt-2">
                  <div class="flex-1">
                    <label class="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Buka</label>
                    <input type="time" id="h${key}_masuk_mulai" value="${hari.masuk_mulai||'06:00'}"
                      onchange="autoSaveGlobalConfig()"
                      class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#a0b0cc] outline-none transition">
                  </div>
                  <div class="flex-1">
                    <label class="text-[9px] font-bold text-orange-500 uppercase mb-1 block">Batas</label>
                    <input type="time" id="h${key}_masuk_akhir" value="${hari.masuk_akhir||'07:15'}"
                      onchange="autoSaveGlobalConfig()"
                      class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#a0b0cc] outline-none transition">
                  </div>
                </div>
              </div>
              <!-- Detail libur -->
              <div id="ket-libur-wrap-${key}" class="${isLibur ? '' : 'hidden'} px-3 pb-2.5 border-t border-red-100">
                <div class="flex gap-2 mt-2">
                  <label class="flex-1 flex items-center gap-1.5 cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold transition
                    ${isRutinan ? 'bg-[#e8ecf4] border-[#a0b0cc] text-[#1b2a4a]' : 'bg-white border-gray-200 text-gray-400'}"
                    id="label-rutinan-${key}" onclick="event.stopPropagation()">
                    <input type="radio" name="jenis-libur-${key}" id="radio-rutinan-${key}" value="rutinan"
                      ${isRutinan ? 'checked' : ''} onchange="onJenisLiburChange('${key}','rutinan')" class="accent-[#1b2a4a]">
                    <i class="fas fa-redo text-[9px]"></i> Rutin
                  </label>
                  <label class="flex-1 flex items-center gap-1.5 cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold transition
                    ${!isRutinan ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white border-gray-200 text-gray-400'}"
                    id="label-khusus-${key}" onclick="event.stopPropagation()">
                    <input type="radio" name="jenis-libur-${key}" id="radio-khusus-${key}" value="khusus"
                      ${!isRutinan ? 'checked' : ''} onchange="onJenisLiburChange('${key}','khusus')" class="accent-red-600">
                    <i class="fas fa-star text-[9px]"></i> Khusus
                  </label>
                </div>
                <div id="ket-khusus-wrap-${key}" class="${!isRutinan ? '' : 'hidden'} mt-2">
                  <input type="text" id="h${key}_ket_libur" value="${ketLibur}"
                    placeholder="cth: Libur semester..."
                    class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#a0b0cc] outline-none transition"
                    onclick="event.stopPropagation()"
                    oninput="autoSaveGlobalConfig()">
                </div>
                <p id="ket-rutinan-info-${key}" class="text-[9px] text-[#1b2a4a] font-semibold mt-1.5 ${isRutinan ? '' : 'hidden'}">
                  <i class="fas fa-info-circle mr-1"></i>Libur rutin tidak dicatat di list hari libur
                </p>
              </div>
            </div>`;
        }
        container.innerHTML = html;
    }
    function onToggleMasuk(key, isChecked) {
        const isLibur = !isChecked;
        const detail = document.getElementById('detail-hari-' + key);
        const badge = document.getElementById('badge-' + key);
        const card = document.getElementById('card-hari-' + key);
        const ketWrap = document.getElementById('ket-libur-wrap-' + key);
        if (isLibur) {
            detail.classList.add('hidden');
            if (ketWrap) ketWrap.classList.remove('hidden');
            card.className = card.className.replace('bg-white border-gray-200','bg-red-50 border-red-200');
            const radioRutinan = document.getElementById('radio-rutinan-' + key);
            if (radioRutinan && !radioRutinan.checked && !document.getElementById('radio-khusus-'+key).checked) {
                radioRutinan.checked = true;
            }
            _updateBadgeLibur(key);
        } else {
            detail.classList.remove('hidden');
            if (ketWrap) ketWrap.classList.add('hidden');
            badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#d0d8e8] text-[#1b2a4a]';
            badge.innerHTML = '<i class="fas fa-check-circle mr-1"></i>Masuk';
            card.className = card.className.replace('bg-red-50 border-red-200','bg-white border-gray-200');
        }
        if (_jadwalHarian) _jadwalHarian[key].libur = isLibur;
        autoSaveGlobalConfig();
    }
    function onJenisLiburChange(key, jenis) {
        const isRutinan = (jenis === 'rutinan');
        const ketWrap = document.getElementById('ket-khusus-wrap-' + key);
        const infoRutinan = document.getElementById('ket-rutinan-info-' + key);
        const labelRutinan = document.getElementById('label-rutinan-' + key);
        const labelKhusus = document.getElementById('label-khusus-' + key);
        if (isRutinan) {
            if (ketWrap) ketWrap.classList.add('hidden');
            if (infoRutinan) infoRutinan.classList.remove('hidden');
            if (labelRutinan) labelRutinan.className = labelRutinan.className
                .replace('bg-white border-gray-200 text-gray-400','bg-[#e8ecf4] border-[#a0b0cc] text-[#1b2a4a]');
            if (labelKhusus) labelKhusus.className = labelKhusus.className
                .replace('bg-red-50 border-red-300 text-red-600','bg-white border-gray-200 text-gray-400');
        } else {
            if (ketWrap) ketWrap.classList.remove('hidden');
            if (infoRutinan) infoRutinan.classList.add('hidden');
            if (labelKhusus) labelKhusus.className = labelKhusus.className
                .replace('bg-white border-gray-200 text-gray-400','bg-red-50 border-red-300 text-red-600');
            if (labelRutinan) labelRutinan.className = labelRutinan.className
                .replace('bg-[#e8ecf4] border-[#a0b0cc] text-[#1b2a4a]','bg-white border-gray-200 text-gray-400');
            setTimeout(() => {
                const inp = document.getElementById('h' + key + '_ket_libur');
                if (inp) inp.focus();
            }, 50);
        }
        _updateBadgeLibur(key);
        autoSaveGlobalConfig();
    }
    function _updateBadgeLibur(key) {
        const badge = document.getElementById('badge-' + key);
        const radioRutinan = document.getElementById('radio-rutinan-' + key);
        const isRutinan = radioRutinan ? radioRutinan.checked : true;
        if (isRutinan) {
            badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#e8ecf4] text-[#1b2a4a]';
            badge.innerHTML = '<i class="fas fa-redo mr-1"></i>Libur Rutin';
        } else {
            badge.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600';
            badge.innerHTML = '<i class="fas fa-star mr-1"></i>Libur Khusus';
        }
    }
    function toggleHariExpand(key) {
        const toggle = document.getElementById('toggle-libur-' + key);
        if (!toggle.checked) return; 
        const detail = document.getElementById('detail-hari-' + key);
        detail.classList.toggle('hidden');
    }
    function loadGlobalConfig() {
        const container = document.getElementById('jadwal-hari-container');
        if (container) container.innerHTML = '<div class="text-center py-6 text-gray-400 text-xs"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat jadwal...</div>';
        siakadRun.withSuccessHandler(res => {
            if(res.success) {
                const conf = res.data;
                const defaultHari = {libur:false, masuk_mulai:'06:00', masuk_akhir:'07:15'};
                const jadwal = conf.jadwal_harian || {};
                for(let d=1;d<=7;d++){
                    if(!jadwal[String(d)]) jadwal[String(d)] = {...defaultHari, libur: d===7};
                }
                renderJadwalHarian(jadwal);
            } else {
                if(container) container.innerHTML = '<div class="text-center py-4 text-red-400 text-xs">Gagal memuat konfigurasi.</div>';
            }
        }).withFailureHandler(err => {
            if(container) container.innerHTML = '<div class="text-center py-4 text-red-400 text-xs">Error: ' + err + '</div>';
        }).getAppConfig();
    }
    let _autoSaveConfigTimer = null;
    let _autoSaveConfigInFlight = false;
    let _autoSaveConfigPending = false;
    function _setAutosaveStatus(state) {
        const el = document.getElementById('autosaveStatusConfig');
        if (!el) return;
        if (state === 'saving') {
            el.classList.remove('opacity-0');
            el.innerHTML = '<i class="fas fa-circle-notch fa-spin text-gray-400"></i> Menyimpan...';
        } else if (state === 'saved') {
            el.classList.remove('opacity-0');
            el.innerHTML = '<i class="fas fa-check-circle text-green-500"></i> Tersimpan';
            clearTimeout(_setAutosaveStatus._hideTimer);
            _setAutosaveStatus._hideTimer = setTimeout(() => el.classList.add('opacity-0'), 2000);
        } else if (state === 'error') {
            el.classList.remove('opacity-0');
            el.innerHTML = '<i class="fas fa-exclamation-circle text-red-500"></i> Gagal menyimpan';
        }
    }
    // Auto-save dengan debounce: menunggu jeda singkat setelah perubahan terakhir
    // sebelum mengirim ke server, supaya tidak spam request saat user mengubah beberapa field.
    function autoSaveGlobalConfig() {
        clearTimeout(_autoSaveConfigTimer);
        _autoSaveConfigTimer = setTimeout(_doSaveGlobalConfig, 500);
    }
    function _doSaveGlobalConfig() {
        if (_autoSaveConfigInFlight) { _autoSaveConfigPending = true; return; }
        const container = document.getElementById('jadwal-hari-container');
        if (!container || !document.getElementById('card-hari-1')) return; // belum ter-render
        _autoSaveConfigInFlight = true;
        _setAutosaveStatus('saving');
        const jadwal = {};
        for (let d = 1; d <= 7; d++) {
            const key = String(d);
            const toggle = document.getElementById('toggle-libur-' + key);
            const isLibur = toggle ? !toggle.checked : (d === 7);
            jadwal[key] = {
                libur: isLibur,
                masuk_mulai:  (document.getElementById('h'+key+'_masuk_mulai')  || {value:'06:00'}).value || '06:00',
                masuk_akhir:  (document.getElementById('h'+key+'_masuk_akhir')  || {value:'07:15'}).value || '07:15',
                libur_rutinan: (() => {
                    const r = document.getElementById('radio-rutinan-'+key);
                    if (!isLibur) return true;
                    return r ? r.checked : true;
                })(),
                ket_libur:    (document.getElementById('h'+key+'_ket_libur')    || {value:''}).value.trim() || '',
            };
        }
        const refDay = Object.values(jadwal).find(h => !h.libur) || jadwal['1'];
        const newConfig = {
            jam_masuk_mulai:  refDay.masuk_mulai,
            jam_masuk_akhir:  refDay.masuk_akhir,
            jadwal_harian: jadwal
        };
        siakadRun.withSuccessHandler(res => {
            _autoSaveConfigInFlight = false;
            if(res.success) {
                _setAutosaveStatus('saved');
            } else {
                _setAutosaveStatus('error');
                showAlert('error', res.message);
            }
            if (_autoSaveConfigPending) { _autoSaveConfigPending = false; _doSaveGlobalConfig(); }
        }).withFailureHandler(err => {
            _autoSaveConfigInFlight = false;
            _setAutosaveStatus('error');
            showAlert('error', 'Gagal koneksi: ' + err);
            if (_autoSaveConfigPending) { _autoSaveConfigPending = false; _doSaveGlobalConfig(); }
        }).saveAppConfig(newConfig);
    }
    function renderLiburRows(data, startIdx) {
            const tbody = document.getElementById('tbody-libur');
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400 italic">Tidak ada jadwal libur.</td></tr>';
                return;
            }
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const optionsShort = { year: 'numeric', month: 'short', day: 'numeric' };
            tbody.innerHTML = data.map((item, i) => `
                <tr class="hover:bg-gray-50 border-b border-gray-50 transition group">
                    <td class="px-2 sm:px-4 py-3 sm:py-4 text-center text-gray-500">${startIdx + i + 1}</td>
                    <td class="px-2 sm:px-4 py-3 sm:py-4 font-mono font-medium text-[#152238] text-xs sm:text-sm whitespace-nowrap">
                        <span class="hidden sm:inline">${new Date(item.tanggal).toLocaleDateString('id-ID', options)}</span>
                        <span class="sm:hidden">${new Date(item.tanggal).toLocaleDateString('id-ID', optionsShort)}</span>
                    </td>
                    <td class="px-2 sm:px-4 py-3 sm:py-4 font-bold text-gray-700 text-xs sm:text-sm break-words">${item.keterangan}</td>
                    <td class="px-2 sm:px-4 py-3 sm:py-4 text-center">
                        <div class="flex justify-center space-x-1.5 sm:space-x-2 opacity-80 group-hover:opacity-100">
                            <button onclick="editLibur('${item.tanggal}', '${item.keterangan}')" class="btn-aksi-tabel aksi-edit" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteLiburConfirm('${item.tanggal}')" class="btn-aksi-tabel aksi-hapus" title="Hapus">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
      function editLibur(tgl, ket) {
          showModal(createLiburModal({ tanggal: tgl, keterangan: ket }));
      }
      function createLiburModal(data) {
              const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all mb-4";
              return `
              <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative overflow-hidden animate-fade-in">
                  <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <i class="fas fa-times"></i>
                  </button>
                  <div class="text-center mb-6">
                      <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl shadow-sm">
                          <i class="fas fa-calendar-day"></i>
                      </div>
                      <h3 class="font-bold text-base text-gray-800">Edit Hari Libur</h3>
                      <p class="text-xs text-gray-500 mt-1">Perbarui tanggal atau keterangan</p>
                  </div>
                  <form onsubmit="saveUpdateLibur(event)">
                      <input type="hidden" name="oldDate" value="${data.tanggal}">
                      <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Tanggal</label>
                      <input type="date" name="newDate" value="${data.tanggal}" required class="${inputClass}">
                      <label class="block mb-1 text-xs font-bold text-gray-500 uppercase">Keterangan</label>
                      <input type="text" name="newKeterangan" value="${data.keterangan}" required placeholder="Contoh: Cuti Bersama" class="${inputClass}">
                      <div class="flex gap-3 mt-4">
                          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                              Batal
                          </button>
                          <button type="submit" id="btnSaveLibur" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
                              Simpan Perubahan
                          </button>
                      </div>
                  </form>
              </div>`;
          }
      function saveUpdateLibur(e) {
        e.preventDefault();
        const btn = document.getElementById('btnSaveLibur');
        const originalText = btn.innerHTML; 
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
        btn.classList.add('opacity-75', 'cursor-not-allowed'); 
        showLoading(); 
        const fd = new FormData(e.target);
        const oldDate = fd.get('oldDate');
        const newDate = fd.get('newDate');
        const newKet = fd.get('newKeterangan');
        siakadRun.withSuccessHandler(res => {
            hideLoading(); 
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            if (res.success) {
                closeModal();
                loadKelolaAbsen(); 
                showAlert('success', res.message);
            } else {
                showAlert('error', res.message);
            }
        })
        .withFailureHandler(error => {
            hideLoading();
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            showAlert('error', 'Gagal menghubungi server: ' + error);
        })
        .updateHariLibur(oldDate, newDate, newKet);
    }
    function updatePreviewLibur() {
        const mulai = document.getElementById('input-libur-mulai').value;
        const akhir = document.getElementById('input-libur-akhir').value;
        const preview = document.getElementById('preview-libur');
        const previewText = document.getElementById('preview-libur-text');
        if (!mulai || !akhir) { preview.classList.add('hidden'); return; }
        const dMulai = new Date(mulai + 'T00:00:00');
        const dAkhir = new Date(akhir + 'T00:00:00');
        if (dAkhir < dMulai) {
            previewText.textContent = 'Tanggal akhir tidak boleh sebelum tanggal mulai.';
            preview.classList.remove('hidden');
            preview.className = preview.className.replace('bg-amber-50 border-amber-200 text-amber-700','bg-red-50 border-red-200 text-red-600');
            return;
        }
        preview.className = 'bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 flex items-center gap-2';
        const selisih = Math.round((dAkhir - dMulai) / (1000*60*60*24)) + 1;
        const fmtOpt = { day: 'numeric', month: 'long', year: 'numeric' };
        if (selisih === 1) {
            previewText.textContent = '1 hari: ' + dMulai.toLocaleDateString('id-ID', fmtOpt);
        } else {
            previewText.textContent = selisih + ' hari: ' + dMulai.toLocaleDateString('id-ID', fmtOpt) + ' s/d ' + dAkhir.toLocaleDateString('id-ID', fmtOpt);
        }
        preview.classList.remove('hidden');
    }
    function handleAddLibur(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const tglMulai = fd.get('tanggal_mulai');
        const tglAkhir = fd.get('tanggal_akhir');
        const ket = fd.get('keterangan');
        if (tglAkhir < tglMulai) {
            showAlert('error', 'Tanggal akhir tidak boleh sebelum tanggal mulai.');
            return;
        }
        showLoading();
        siakadRun.withSuccessHandler(res => {
            hideLoading();
            if (res.success) {
                e.target.reset();
                document.getElementById('preview-libur').classList.add('hidden');
                loadKelolaAbsen();
                showAlert('success', res.message);
            } else {
                showAlert('error', res.message);
            }
        }).withFailureHandler(err => {
            hideLoading();
            showAlert('error', 'Gagal: ' + err);
        }).addHariLiburRange(tglMulai, tglAkhir, ket);
    }
    function deleteLiburConfirm(tgl) {
        if (confirm('Hapus hari libur ini? Siswa akan bisa absen kembali pada tanggal tersebut.')) {
            showLoading();
            siakadRun.withSuccessHandler(res => {
                hideLoading();
                loadKelolaAbsen();
                showAlert('success', 'Jadwal libur dihapus');
            }).deleteHariLibur(tgl);
        }
    }
    function triggerImportLibur() {
        document.getElementById('fileInputLibur').click();
    }
async function handleFileImportLibur(input) {
        const file = input.files[0];
        if (!file) return;
        showLoading(); 
        await ensureLib('xlsx');
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            if (jsonData.length === 0) {
                hideLoading();
                showAlert('error', 'File Excel kosong atau format salah.');
                input.value = ''; 
                return;
            }
            const firstRow = jsonData[0];
            const hasTanggal = firstRow.hasOwnProperty('Tanggal');
            const hasKet = firstRow.hasOwnProperty('Keterangan');
            if (!hasTanggal || !hasKet) {
                hideLoading();
                showAlert('error', 'Format Excel salah! Pastikan ada kolom header: Tanggal dan Keterangan.');
                input.value = '';
                return;
            }
            processImportLibur(jsonData, input);
        };
        reader.onerror = function() {
            hideLoading();
            showAlert('error', 'Gagal membaca file.');
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
function processImportLibur(data, inputElement) {
        const formatDateCorrectly = (dateInput) => {
            if (!dateInput) return "";
            if (dateInput instanceof Date) {
                const year = dateInput.getFullYear();
                const month = String(dateInput.getMonth() + 1).padStart(2, '0');
                const day = String(dateInput.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            return String(dateInput).trim();
        };
        const formattedData = data.map(row => {
            const clean = (val) => (val ? String(val).trim() : '');
            let rawTanggal = row['Tanggal'];
            let fixedTanggal = formatDateCorrectly(rawTanggal);
            return {
                tanggal: fixedTanggal, 
                keterangan: clean(row['Keterangan'])
            };
        });
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                inputElement.value = ''; 
                if (res.success) {
                    loadKelolaAbsen(); 
                    let msg = `Berhasil: ${res.added}, Gagal/Duplikat: ${res.skipped}`;
                    showAlert('success', 'Import Hari Libur Selesai! ' + msg);
                } else {
                    showAlert('error', res.message);
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                inputElement.value = '';
                showAlert('error', 'Error Server: ' + err);
            })
            .importHariLiburBulk(formattedData);
    }
