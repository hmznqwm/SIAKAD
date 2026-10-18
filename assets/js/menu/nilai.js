let nilaiDataFull = [];
    /**
     * Menentukan apakah sebuah tabel nilai butuh scroll horizontal atau tidak,
     * berdasarkan lebar RIIL kontainernya (bukan tebakan breakpoint mobile/desktop).
     * Dengan begini perilakunya otomatis benar di laptop maupun HP: kalau kolom
     * datanya sedikit dan muat di lebar layar yang tersedia, tidak akan ada
     * scroll sama sekali; kalau kolomnya banyak dan memang tidak muat, baru
     * scroll horizontal diaktifkan (dengan kolom No & Nama tetap "nempel").
     */
    function applyNilaiScrollFit(wrapEl, tableEl, requiredWidth) {
        if (!wrapEl || !tableEl) return false;
        const available = wrapEl.clientWidth || (wrapEl.parentElement ? wrapEl.parentElement.clientWidth : 0);
        // Kalau kontainer belum punya lebar (mis. view masih tersembunyi saat render),
        // jangan paksa mode scroll — biarkan default (tidak scroll) lalu akan
        // dikoreksi ulang oleh listener resize/observer di bawah.
        const needsScroll = available > 0 && requiredWidth > available;
        wrapEl.style.overflowX = needsScroll ? 'auto' : 'visible';
        wrapEl.classList.toggle('nilai-scroll-active', needsScroll);
        tableEl.classList.toggle('nilai-scroll-active', needsScroll);
        if (needsScroll) {
            tableEl.style.width = 'max-content';
            tableEl.style.minWidth = requiredWidth + 'px';
        } else {
            tableEl.style.width = '100%';
            tableEl.style.minWidth = '0';
        }
        return needsScroll;
    }
    // Hitung ulang semua tabel nilai yang sedang tampil (dipanggil saat resize/orientasi berubah)
    let _nilaiRefitTimer = null;
    function refitNilaiTables() {
        if (_nilaiRefitTimer) clearTimeout(_nilaiRefitTimer);
        _nilaiRefitTimer = setTimeout(function() {
            document.querySelectorAll('#view-nilai-siswa [data-nilai-required]').forEach(function(wrap) {
                const req = parseInt(wrap.getAttribute('data-nilai-required'), 10) || 0;
                const table = wrap.querySelector('table') || (wrap.tagName === 'TABLE' ? wrap : null);
                if (!table || !req) return;
                applyNilaiScrollFit(wrap, table, req);
            });
        }, 150);
    }
    window.addEventListener('resize', refitNilaiTables);
    function loadGuruMengajarNilai(cb) {
        const nip = currentUser.nip || currentUser.username || '';
        siakadRun
            .withSuccessHandler(function(res) {
                cb(res && res.success && Array.isArray(res.data) ? res.data : []);
            })
            .withFailureHandler(function() { cb([]); })
            .getGuruMengajarList(currentUser.token, nip);
    }
    function loadDataNilai() {
        const token = currentUser ? currentUser.token : '';
        populateNilaiKelasFilter();
        const filterKelas = document.getElementById('filterNilaiKelas')?.value || '';
        const filterSemester = document.getElementById('filterNilaiSemester')?.value || '';
        const tbody = document.getElementById('tbody-nilai');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat data nilai...</td></tr>';
        
        const thAksi = document.getElementById('thAksiNilai');
        const btnWrap = document.getElementById('btnTambahNilaiWrap');

        const headingEl = document.querySelector('#view-nilai-siswa h2');
        const descEl = document.querySelector('#view-nilai-siswa p');
        const filterKelasParent = document.getElementById('filterNilaiKelas')?.parentElement;
        const searchNilaiParent = document.getElementById('searchNilai')?.parentElement;

        if (currentUser && (currentUser.role === 'siswa' || currentUser.role === 'alumni')) {
            if (thAksi) thAksi.style.display = 'none';
            if (btnWrap) btnWrap.style.display = 'none';
            if (headingEl) headingEl.textContent = 'Nilai Saya';
            if (descEl) descEl.textContent = 'Lihat rekapitulasi nilai mata pelajaran Anda';
            if (filterKelasParent) filterKelasParent.classList.add('hidden');
            if (searchNilaiParent) searchNilaiParent.classList.add('hidden');
        } else {
            if (thAksi) thAksi.style.display = '';
            if (btnWrap) btnWrap.style.display = '';
            if (headingEl) headingEl.textContent = 'Nilai Siswa';
            if (descEl) descEl.textContent = 'Input dan kelola data nilai per mata pelajaran';
            if (filterKelasParent) filterKelasParent.classList.remove('hidden');
            if (searchNilaiParent) searchNilaiParent.classList.remove('hidden');
        }
        siakadRun
            .withSuccessHandler(function(result) {
                if (result && result.success) {
                    nilaiDataFull = Array.isArray(result.data) ? result.data : [];
                    const afterKolom = function(kolomList) {
                        nilaiKolomCustom = Array.isArray(kolomList) ? kolomList : [];
                        filterNilaiTable();
                        renderNilaiChart(nilaiDataFull);
                    };
                    if (currentUser && currentUser.role === 'guru') {
                        // Muat penugasan guru untuk menentukan petak mana yang boleh diedit
                        loadGuruMengajarNilai(function(list) {
                            window._guruMengajarList = Array.isArray(list) ? list : [];
                            loadNilaiKolom(afterKolom);
                        });
                    } else {
                        window._guruMengajarList = [];
                        loadNilaiKolom(afterKolom);
                    }
                } else {
                    tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>${(result && result.message) || 'Gagal mengambil data nilai'}</td></tr>`;
                }
            })
            .withFailureHandler(function(err) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-red-500">Gagal koneksi: ${err}</td></tr>`;
            })
            .getNilaiList(token, filterKelas, filterSemester);
    }
    let siswaNilaiChartInstance = null;
    function nisnMatch(a, b) {
        const x = String(a || '').trim().toLowerCase();
        const y = String(b || '').trim().toLowerCase();
        if (!x || !y) return false;
        if (x === y) return true;
        // Toleransi data lama: bandingkan sebagai angka (nol depan / notasi Excel)
        const nx = parseFloat(x), ny = parseFloat(y);
        return !isNaN(nx) && !isNaN(ny) && nx > 0 && ny > 0 && Math.round(nx) === Math.round(ny);
    }
    async function renderNilaiChart(dataSource) {
        const wrap = document.getElementById('nilaiChartWrap');
        const canvas = document.getElementById('siswaNilaiChart');
        if (!wrap || !canvas) return;
        const isSiswa = currentUser && (currentUser.role === 'siswa' || currentUser.role === 'alumni');
        if (!isSiswa) { wrap.classList.add('hidden'); return; }
        const src = Array.isArray(dataSource) ? dataSource : nilaiDataFull;
        // Data nilai milik siswa/alumni ini saja  sync dengan tabel (filter aktif berlaku)
        const siswaNisn = String(currentUser.nisn || currentUser.username || '').trim().toLowerCase();
        const myNilai = src.filter(n => nisnMatch(n.nisn, siswaNisn));
        // Rata-rata per mapel
        const map = {};
        myNilai.forEach(n => {
            const mapel = String(n.mapel || n.mataPelajaran || 'Tanpa Mapel');
            const v = parseFloat(n.nilai);
            if (isNaN(v)) return;
            if (!map[mapel]) map[mapel] = { sum: 0, count: 0 };
            map[mapel].sum += v;
            map[mapel].count++;
        });
        const labels = Object.keys(map);
        const values = labels.map(l => Math.round((map[l].sum / map[l].count) * 10) / 10);
        if (labels.length === 0) { wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const avgEl = document.getElementById('nilaiChartAvg');
        if (avgEl) avgEl.textContent = 'Rata-rata ' + avg.toFixed(1);
        await ensureLib('chartjs');
        if (typeof Chart === 'undefined') return;
        if (siswaNilaiChartInstance) siswaNilaiChartInstance.destroy();
        siswaNilaiChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rata-rata Nilai',
                    data: values,
                    backgroundColor: '#1b2a4a',
                    hoverBackgroundColor: '#31456b',
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 36
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleFont: { size: 11, weight: '600' },
                        bodyFont: { size: 12, weight: '700' },
                        padding: 8,
                        cornerRadius: 6,
                        displayColors: false,
                        callbacks: {
                            label: ctx => 'Rata-rata: ' + ctx.parsed.y
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 100,
                        grid: { color: _siakadChartColors().gridSoft, drawTicks: false },
                        border: { display: false },
                        ticks: { stepSize: 25, color: _siakadChartColors().tickSoft, font: { size: 10 }, padding: 6 }
                    },
                    x: {
                        grid: { display: false },
                        border: { color: _siakadChartColors().gridSoft },
                        ticks: { color: _siakadChartColors().tick, font: { size: 10, weight: '600' }, maxRotation: 45, minRotation: 0, autoSkip: true, autoSkipPadding: 6 }
                    }
                }
            }
        });
    }
    function populateNilaiKelasFilter() {
        const sel = document.getElementById('filterNilaiKelas');
        if (!sel) return;
        const current = sel.value;
        const isGuru = currentUser && currentUser.role === 'guru';
        const isSiswa = currentUser && currentUser.role === 'siswa';
        const guruKelas = isGuru && currentUser.kelas
            ? String(currentUser.kelas).split(',').map(k => k.trim()).filter(Boolean)
            : [];
        
        if (isSiswa) {
            sel.innerHTML = `<option value="${currentUser.kelas || ''}">${currentUser.kelas || 'Kelas Saya'}</option>`;
            sel.disabled = true;
            return;
        }

        sel.disabled = false;
        // Build option list: include "Semua Kelas", plus assigned guru classes (if any) or all existing classes
        const classList = (isGuru && guruKelas.length > 0) ? guruKelas : (existingClasses && existingClasses.length > 0 ? existingClasses : ['1A', '1B', '2A', '2B', '3A', '3B']);
        
        sel.innerHTML = '<option value="">Semua Kelas</option>';
        classList.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            if (k === current) opt.selected = true;
            sel.appendChild(opt);
        });
    }
    function filterNilaiTable() {
        const keyword = (document.getElementById('searchNilai')?.value || '').toLowerCase().trim();
        const filterKet = document.getElementById('filterNilaiKeterangan')?.value || '';
        const selectedKelas = document.getElementById('filterNilaiKelas')?.value || '';
        
        const isSiswa = currentUser && currentUser.role === 'siswa';
        const siswaNisn = isSiswa ? String(currentUser.nisn || currentUser.username || '').trim().toLowerCase() : '';

        const cleanStr = s => String(s || '').toLowerCase().replace(/kelas\s*/g, '').trim();

        const filtered = nilaiDataFull.filter(n => {
            const nNisn = String(n.nisn || '').trim().toLowerCase();
            const nNama = String(n.namaSiswa || n.nama || '').toLowerCase();
            const nMapel = String(n.mapel || n.mataPelajaran || '').toLowerCase();
            const nKelasRaw = n.kelas || '';
            const nKelas = String(nKelasRaw || (currentUser && currentUser.kelas ? currentUser.kelas : '')).trim();
            const cleanNKelas = cleanStr(nKelas);

            // 1. Check role siswa
            if (isSiswa && siswaNisn) {
                if (!nisnMatch(nNisn, siswaNisn) && !nNama.includes(siswaNisn)) {
                    return false;
                }
            }

            // 2. Check selected kelas dropdown
            if (selectedKelas && selectedKelas !== '') {
                const cleanSelKelas = cleanStr(selectedKelas);
                if (nKelas.toLowerCase() !== selectedKelas.toLowerCase() && cleanNKelas !== cleanSelKelas) {
                    return false;
                }
            }

            // 3. Check search keyword
            const matchSearch = !keyword || nNama.includes(keyword) || nNisn.includes(keyword) || nMapel.includes(keyword) || nKelas.toLowerCase().includes(keyword);
            
            // 4. Check keterangan filter
            const matchKet = !filterKet || String(n.keterangan || '') === filterKet;

            return matchSearch && matchKet;
        });

        renderNilaiRows(filtered);
        renderNilaiChart(filtered);
    }
    let nilaiKolomCustom = [];
    function loadNilaiKolom(cb) {
        const token = currentUser ? currentUser.token : '';
        fetch('api.php?action=getNilaiKolom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getNilaiKolom', token: token })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) { cb(res && res.success && Array.isArray(res.data) ? res.data : []); })
        .catch(function() { cb([]); });
    }
    function normalizeNilaiSem(s) {
        s = String(s || '').trim().toLowerCase();
        if (s === '1' || s.includes('ganjil')) return '1';
        if (s === '2' || s.includes('genap')) return '2';
        return String(s || '').trim();
    }
    function escJs(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
    function kolomMatchPetak(k, g) {
        return String(k.mapel || '').trim().toLowerCase() === String(g.mapel || '').trim().toLowerCase()
            && String(k.kelas || '').trim().toLowerCase() === String(g.kelas || '').trim().toLowerCase()
            && normalizeNilaiSem(k.semester) === normalizeNilaiSem(g.sem);
    }
    function tambahNilaiPetakKolom(gi) {
        const g = (window._nilaiGroups || [])[gi];
        if (!g) return;
        const html = `
        <div style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)" onclick="if(event.target===this)closeModal()">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div class="bg-[#1b2a4a] p-5 text-white rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 class="font-bold text-base">Tambah Kolom Nilai</h3>
                <p class="text-blue-100 text-xs mt-0.5">${g.mapel} &middot; Kelas ${g.kelas} &middot; Semester ${g.sem}</p>
              </div>
              <button onclick="closeModal()" class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition">
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>
            <form onsubmit="submitNilaiPetakKolom(event, ${gi})" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nama Kolom <span class="text-red-500">*</span></label>
                <input type="text" name="namaKolom" id="inputNamaKolomNilai" required maxlength="100"
                  placeholder="mis. Ulangan 2, Praktik, Keterampilan..."
                  class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">Batal</button>
                <button type="submit" class="px-5 py-2 text-sm font-bold text-white bg-[#1b2a4a] dark:bg-blue-600 rounded-xl hover:bg-[#152238] dark:hover:bg-blue-700 transition shadow">
                  <i class="fas fa-plus mr-1"></i> Tambah
                </button>
              </div>
            </form>
          </div>
        </div>`;
        showModal(html);
        setTimeout(function() { const el = document.getElementById('inputNamaKolomNilai'); if (el) el.focus(); }, 50);
    }
    function submitNilaiPetakKolom(ev, gi) {
        ev.preventDefault();
        const g = (window._nilaiGroups || [])[gi];
        if (!g) return;
        const nama = (new FormData(ev.target).get('namaKolom') || '').toString().trim();
        if (!nama) return;
        closeModal();
        showLoading();
        const token = currentUser ? currentUser.token : '';
        fetch('api.php?action=addNilaiKolom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addNilaiKolom', token: token, mapel: g.mapel, kelas: g.kelas, semester: g.sem, namaKolom: nama.trim() })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            hideLoading();
            if (typeof Swal !== 'undefined') Swal.fire((res && res.success) ? 'Berhasil' : 'Gagal', (res && res.message) || 'Kolom ditambahkan', (res && res.success) ? 'success' : 'error');
            loadDataNilai();
        })
        .catch(function() { hideLoading(); loadDataNilai(); });
    }
    function hapusNilaiPetakKolom(gi, ket) {
        const g = (window._nilaiGroups || [])[gi];
        if (!g) return;
        if (typeof Swal === 'undefined') { if (!confirm('Hapus kolom "' + ket + '" beserta seluruh nilainya pada petak ini?')) return; }
        else {
            Swal.fire({
                title: 'Hapus kolom ini?',
                html: 'Kolom <b>' + ket + '</b> beserta seluruh nilainya pada petak ini akan dihapus.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Hapus',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280'
            }).then(function(res) { if (res.isConfirmed) doDeleteNilaiPetakKolom(gi, ket); });
            return;
        }
        doDeleteNilaiPetakKolom(gi, ket);
    }
    function doDeleteNilaiPetakKolom(gi, ket) {
        const g = (window._nilaiGroups || [])[gi];
        if (!g) return;
        showLoading();
        const token = currentUser ? currentUser.token : '';
        fetch('api.php?action=deleteNilaiKolom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteNilaiKolom', token: token, mapel: g.mapel, kelas: g.kelas, semester: g.sem, namaKolom: ket })
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            hideLoading();
            if (typeof Swal !== 'undefined') Swal.fire((res && res.success) ? 'Berhasil' : 'Gagal', (res && res.message) || 'Kolom dihapus', (res && res.success) ? 'success' : 'error');
            loadDataNilai();
        })
        .catch(function() { hideLoading(); loadDataNilai(); });
    }
    function editNilaiPrefill(p) {
        getNilaiMapelList(function(mapelList) {
            showModal(createNilaiModal(null, mapelList, p));
        });
    }
    function isiNilaiCepat(p) {
        const safeJson = obj => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/'/g, '&#39;');
        const html = `
        <div style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)" onclick="if(event.target===this)closeModal()">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs animate-fade-in">
            <div class="bg-[#1b2a4a] p-4 text-white rounded-t-2xl flex justify-between items-center">
              <div class="min-w-0">
                <h3 class="font-bold text-sm truncate">Isi Nilai – ${p.keterangan}</h3>
                <p class="text-blue-100 text-[11px] mt-0.5 truncate">${p.namaSiswa} &middot; ${p.mapel} &middot; Sem ${p.semester}</p>
              </div>
              <button onclick="closeModal()" class="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition shrink-0 ml-2">
                <i class="fas fa-times text-xs"></i>
              </button>
            </div>
            <form onsubmit='submitNilaiCepat(event, ${safeJson(p)})' class="p-4 space-y-3">
              <div>
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nilai <span class="text-red-500">*</span></label>
                <input type="number" name="nilai" id="inputNilaiCepat" required min="0" max="100" placeholder="0 - 100"
                  class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 text-lg font-bold text-center focus:ring-2 focus:ring-blue-400 outline-none">
              </div>
              <div class="flex justify-end gap-2 pt-1">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">Batal</button>
                <button type="submit" class="px-5 py-2 text-sm font-bold text-white bg-[#1b2a4a] dark:bg-blue-600 rounded-xl hover:bg-[#152238] dark:hover:bg-blue-700 transition shadow">
                  <i class="fas fa-save mr-1"></i> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>`;
        showModal(html);
        setTimeout(function() { const el = document.getElementById('inputNilaiCepat'); if (el) el.focus(); }, 50);
    }
    function submitNilaiCepat(ev, p) {
        ev.preventDefault();
        const nilai = (new FormData(ev.target).get('nilai') || '').toString();
        if (nilai === '') return;
        closeModal();
        const token = currentUser ? currentUser.token : '';
        fetch('api.php?action=addNilai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addNilai', token: token,
                nilaiData: {
                    nisn: p.nisn, namaSiswa: p.namaSiswa, kelas: p.kelas,
                    mapel: p.mapel, semester: p.semester,
                    nilai: nilai, keterangan: p.keterangan
                }
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(result) {
            if (result && result.success) {
                loadDataNilai();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: (result && result.message) ? result.message : 'Gagal menyimpan nilai' });
            }
        })
        .catch(function(err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err ? err.toString() : 'Terjadi kesalahan jaringan' });
        });
    }
    function toggleNilaiPetak(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden');
        const chev = document.getElementById('chev-' + id);
        if (chev) {
            chev.classList.toggle('fa-chevron-down');
            chev.classList.toggle('fa-chevron-up');
        }
        // Petak yang baru dibuka bisa saja belum sempat terukur lebarnya
        // (saat masih tersembunyi, clientWidth-nya 0), jadi ukur ulang sekarang.
        if (!el.classList.contains('hidden') && typeof refitNilaiTables === 'function') {
            refitNilaiTables();
        }
    }
    function renderNilaiRows(data) {
        const tbody = document.getElementById('tbody-nilai');
        if (!tbody) return;
        const isSiswa = currentUser && (currentUser.role === 'siswa' || currentUser.role === 'alumni');

        const theadEl = tbody.closest('table')?.querySelector('thead');

        // Role siswa/alumni: matriks mapel x keterangan
        if (isSiswa) {
            const ketOrderS = ['Tugas', 'Ulangan', 'Ujian Harian', 'UTS', 'UAS'];
            const ketShortS = { 'Ujian Harian': 'UH' };
            const ketRank = k => { const i = ketOrderS.indexOf(k); return i === -1 ? 99 : i; };

            if (!data || data.length === 0) {
                const tableElEmpty = theadEl && theadEl.closest('table');
                if (tableElEmpty) {
                    const oldCgEmpty = tableElEmpty.querySelector('colgroup');
                    if (oldCgEmpty) oldCgEmpty.remove();
                    tableElEmpty.style.minWidth = '';
                    tableElEmpty.style.width = '100%';
                    tableElEmpty.classList.remove('nilai-scroll-active');
                    const wrapElEmpty = document.getElementById('nilaiOuterWrap') || tableElEmpty.parentElement;
                    if (wrapElEmpty) {
                        wrapElEmpty.style.overflowX = 'visible';
                        wrapElEmpty.classList.remove('nilai-scroll-active');
                        wrapElEmpty.removeAttribute('data-nilai-required');
                    }
                }
                if (theadEl) { theadEl.style.display = 'none'; theadEl.innerHTML = ''; }
                tbody.innerHTML = '<tr><td colspan="100" style="width:100%" class="p-10 text-center text-gray-400"><div class="flex flex-col items-center gap-2"><i class="fas fa-inbox text-4xl"></i><span>Belum ada data nilai.</span></div></td></tr>';
                return;
            }

            // Kelompokkan per mapel, kumpulkan semua keterangan
            const byMapel = {};
            const allKets = [];
            data.forEach(n => {
                const mapel = String(n.mapel || n.mataPelajaran || 'Tanpa Mapel').trim() || 'Tanpa Mapel';
                const ket = String(n.keterangan || '').trim() || '-';
                if (!byMapel[mapel]) byMapel[mapel] = {};
                if (!byMapel[mapel][ket]) byMapel[mapel][ket] = [];
                byMapel[mapel][ket].push(parseFloat(n.nilai));
                if (!allKets.includes(ket)) allKets.push(ket);
            });
            allKets.sort((a, b) => ketRank(a) - ketRank(b));

            if (theadEl) {
                const tableEl = theadEl.closest('table');
                if (tableEl) {
                    const totalCols = allKets.length;
                    const isMobile = window.innerWidth < 640;
                    // control both inner wrap and outer wrap
                    const wrapEl = document.getElementById('nilaiOuterWrap') || tableEl.parentElement;
                    const oldCg = tableEl.querySelector('colgroup');
                    if (oldCg) oldCg.remove();
                    // Lebar minimum yang benar-benar dibutuhkan supaya tiap kolom terbaca:
                    // No(~40px) + Mapel(~150px) + tiap kolom nilai (~68px)
                    const requiredWidth = 44 + 150 + totalCols * 68;
                    if (wrapEl) wrapEl.setAttribute('data-nilai-required', requiredWidth);
                    const needsScroll = applyNilaiScrollFit(wrapEl, tableEl, requiredWidth);
                    tableEl.style.tableLayout = needsScroll ? 'auto' : 'fixed';
                    if (!needsScroll) {
                        // Muat penuh tanpa scroll: bagi lebar kolom secara proporsional
                        const cg = document.createElement('colgroup');
                        const noPct = isMobile ? 8 : 10;
                        const mapelPct = isMobile ? (totalCols > 1 ? 42 : 52) : 34;
                        const ketPct = totalCols ? (100 - noPct - mapelPct) / totalCols : 0;
                        cg.innerHTML = `<col style="width:${noPct}%"><col style="width:${mapelPct}%">` +
                            allKets.map(() => `<col style="width:${ketPct}%">`).join('');
                        tableEl.prepend(cg);
                    }
                }
                theadEl.style.display = '';
                theadEl.innerHTML = `
                  <tr class="bg-[#e8ecf4] border-b border-gray-300">
<th class="p-1.5 py-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-b border-gray-200 dark:border-gray-700">No</th>
<th class="p-1.5 py-2 sm:p-3 text-left text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-b border-gray-200 dark:border-gray-700 truncate">Mata Pelajaran</th>
${allKets.map(k => `<th class="p-1.5 py-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-r border-b border-gray-200 dark:border-gray-700 truncate">${ketShortS[k] || k}</th>`).join('')}
                  </tr>`;
            }

            const mapels = Object.keys(byMapel).sort((a, b) => a.localeCompare(b, 'id'));
            tbody.innerHTML = mapels.map((mapel, i) => {
                const tds = allKets.map(k => {
                    const vals = byMapel[mapel][k];
                    let displayVal = '&ndash;';
                    if (vals && vals.length) {
                        const valid = vals.filter(v => !isNaN(v));
                        displayVal = valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(valid.every(v => Number.isInteger(v)) ? 0 : 1) : '-';
                    }
                    return `<td class="p-1.5 py-2 sm:p-3 text-center text-xs sm:text-sm font-bold text-[#1b2a4a] dark:text-blue-300 border-r border-gray-200 dark:border-gray-700">${displayVal}</td>`;
                }).join('');
                return `
                <tr class="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-[#f4f6fb] dark:hover:bg-gray-700/50 transition">
                    <td class="p-1.5 py-2 sm:p-3 text-center text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs border-r border-gray-200 dark:border-gray-700">${i + 1}</td>
                    <td class="p-1.5 py-2 sm:p-3 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 truncate" title="${mapel}">${mapel}</td>
                    ${tds}
                </tr>`;
            }).join('');
            return;
        }

        // Hak edit per petak: admin/walikelas bebas, guru hanya kelas+mapel yang diajarnya
        const isGuruRole = currentUser && currentUser.role === 'guru';
        const mgList = window._guruMengajarList || [];
        const normKls = s => String(s || '').toLowerCase().replace(/kelas\s*/g, '').trim();
        const petakCanEdit = g => {
            if (isSiswa) return false;
            if (!isGuruRole) return true;
            return mgList.some(a =>
                normKls(a.kelas) === normKls(g.kelas) &&
                String(a.mata_pelajaran || a.mapel || '').toLowerCase().trim() === String(g.mapel || '').toLowerCase().trim());
        };

        // Tampilan petak: header tabel luar disembunyikan
        if (theadEl) theadEl.style.display = 'none';

        if (!data || data.length === 0) {
            // GURU PENGAJAR: tetap tampilkan petak dari penugasannya (kelas+mapel)
            // meski belum ada satu pun nilai – sel kosong bisa langsung diklik untuk isi nilai.
            if (isGuruRole && mgList.length > 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="p-10 text-center text-gray-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Menyiapkan petak nilai dari penugasan Anda...</td></tr>';
                const uniqA = {};
                mgList.forEach(a => {
                    const key = normKls(a.kelas) + '|' + String(a.mata_pelajaran || a.mapel || '').toLowerCase().trim();
                    if (String(a.mata_pelajaran || a.mapel || '').trim() === '') return;
                    uniqA[key] = { kelas: a.kelas, mapel: String(a.mata_pelajaran || a.mapel).trim() };
                });
                const arrA = Object.values(uniqA);
                Promise.all(arrA.map(a => new Promise(res => {
                    siakadRun
                        .withSuccessHandler(r => res({ a, students: r || [] }))
                        .withFailureHandler(() => res({ a, students: [] }))
                        .getSiswaByKelas(a.kelas);
                }))).then(pairs => {
                    let htmlKosong = '';
                    let giIdx = 0;
                    pairs.forEach(({ a, students }) => {
                        if (!students.length) return;
                        students.sort((x, y) => String(x.nama || '').localeCompare(String(y.nama || ''), 'id'));
                        const pid = 'nilaiPetakKosong' + giIdx;
                        const openCls = giIdx === 0 ? '' : 'hidden';
                        const chevCls = giIdx === 0 ? 'fa-chevron-up' : 'fa-chevron-down';
                        const rowsKosong = students.map((s, si) => {
                            const prefill = { nisn: s.nisn, namaSiswa: s.nama, kelas: a.kelas, semester: '1', mapel: a.mapel, keterangan: 'Tugas' };
                            return `<tr class="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                <td class="p-1.5 py-2 sm:p-3 text-center text-gray-400 dark:text-gray-500 text-xs align-top">${si + 1}</td>
                                <td class="p-1.5 py-2 sm:p-3 align-middle">
                                    <div class="font-semibold text-gray-800 dark:text-gray-200 text-xs sm:text-sm leading-tight">${s.nama}</div>
                                    ${s.nisn ? `<div class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">NISN ${s.nisn}</div>` : ''}
                                </td>
                                <td class="p-1.5 sm:p-2 text-center border-l border-gray-100 dark:border-gray-700"><button onclick='isiNilaiCepat(${safeJsonAttr(prefill)})' class="text-gray-300 dark:text-gray-600 hover:text-[#1b2a4a] dark:hover:text-blue-300 transition cursor-pointer" title="Isi nilai Tugas untuk ${s.nama}">&ndash;</button></td>
                            </tr>`;
                        }).join('');
                        htmlKosong += `
                        <tr><td colspan="10" class="p-0">
                          <div class="m-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                          <div class="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-[#f0f3f9] to-white dark:from-gray-700/60 dark:to-gray-800 hover:from-[#e8ecf4] dark:hover:from-gray-700 transition text-left cursor-pointer select-none" onclick="toggleNilaiPetak('${pid}')">
                              <div class="flex items-center gap-3 min-w-0 flex-1">
                                <span class="w-9 h-9 bg-[#1b2a4a] dark:bg-blue-600 rounded-lg flex items-center justify-center shrink-0"><i class="fas fa-book text-white text-sm"></i></span>
                                <div class="min-w-0">
                                  <div class="font-bold text-sm text-[#1b2a4a] dark:text-blue-300 truncate">${a.mapel}</div>
                                  <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">Kelas ${a.kelas} &middot; Semester 1 &middot; ${students.length} siswa &middot; klik tanda &ndash; untuk mengisi nilai</div>
                                </div>
                              </div>
                              <i id="chev-${pid}" class="fas ${chevCls} text-gray-400 shrink-0"></i>
                          </div>
                            <div id="${pid}" class="${openCls}">
                              <div class="nilai-petak-wrap" data-nilai-required="286" style="overflow-x:auto">
                                <table class="w-full text-sm">
                                  <thead><tr class="bg-gray-50 dark:bg-gray-700/50 border-y border-gray-100 dark:border-gray-700">
                                    <th class="p-1.5 py-2 sm:p-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase w-8 sm:w-10 whitespace-nowrap">No</th>
                                    <th class="p-1.5 py-2 sm:p-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Nama Siswa</th>
                                    <th class="p-1.5 py-2 sm:p-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase border-l border-gray-100 dark:border-gray-700 whitespace-nowrap">Tugas</th>
                                  </tr></thead>
                                  <tbody>${rowsKosong}</tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td></tr>`;
                        giIdx++;
                    });
                    tbody.innerHTML = htmlKosong || '<tr><td colspan="10" class="p-10 text-center text-gray-400"><div class="flex flex-col items-center gap-2"><i class="fas fa-inbox text-4xl"></i><span>Belum ada data nilai.</span></div></td></tr>';
                    refitNilaiTables();
                });
                return;
            }
            tbody.innerHTML = '<tr><td colspan="10" class="p-10 text-center text-gray-400"><div class="flex flex-col items-center gap-2"><i class="fas fa-inbox text-4xl"></i><span>Belum ada data nilai.</span></div></td></tr>';
            return;
        }

        const ketOrder = ['Tugas', 'Ulangan', 'Ujian Harian', 'UTS', 'UAS'];
        const ketShort = { 'Tugas': 'Tugas', 'Ulangan': 'Ulangan', 'Ujian Harian': 'UH', 'UTS': 'UTS', 'UAS': 'UAS' };

        // Kelompokkan per mapel + kelas + semester  satu petak per kelompok
        const groups = [];
        const groupMap = {};
        data.forEach(n => {
            const mapel = String(n.mapel || n.mataPelajaran || 'Tanpa Mapel').trim() || 'Tanpa Mapel';
            const kelas = String(n.kelas || '-').trim() || '-';
            const sem = String(n.semester || '-').trim() || '-';
            const key = mapel + '|' + kelas + '|' + sem;
            if (!groupMap[key]) { groupMap[key] = { mapel, kelas, sem, kets: [], stuMap: {} }; groups.push(groupMap[key]); }
            const g = groupMap[key];
            const ket = String(n.keterangan || '').trim() || '-';
            if (!g.kets.includes(ket)) g.kets.push(ket);
            const skey = String(n.nisn || n.namaSiswa || n.nama || '').trim().toLowerCase();
            if (!g.stuMap[skey]) g.stuMap[skey] = { nama: n.namaSiswa || n.nama || '-', nisn: n.nisn || '', cells: {} };
            g.stuMap[skey].cells[ket] = n;
        });

        groups.sort((a, b) => a.mapel.localeCompare(b.mapel, 'id') || a.kelas.localeCompare(b.kelas, 'id'));
        window._nilaiGroups = groups;

        let html = '';
        groups.forEach((g, gi) => {
            g.kets.sort((a, b) => {
                const ia = ketOrder.indexOf(a), ib = ketOrder.indexOf(b);
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
            });
            // Kolom kustom per petak yang belum ada datanya
            const extraKets = (nilaiKolomCustom || [])
                .filter(k => kolomMatchPetak(k, g))
                .map(k => String(k.namaKolom || '').trim())
                .filter(k => k && !g.kets.includes(k));
            const allKets = g.kets.concat(extraKets);
            const pid = 'nilaiPetak' + gi;
            const students = Object.values(g.stuMap).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
            const colsHead = allKets.map(k => {
                const isCustom = extraKets.includes(k);
                const delBtn = (petakCanEdit(g) && isCustom)
                    ? `<button type="button" onclick="hapusNilaiPetakKolom(${gi},'${escJs(k)}')" class="ml-1 text-gray-300 hover:text-red-500 transition" title="Hapus kolom"><i class="fas fa-times text-[9px]"></i></button>`
                    : '';
                return `<th class="p-1.5 py-2 sm:p-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase border-l border-gray-100 dark:border-gray-700 whitespace-nowrap">${tableState.nilai ? (ketShort[k] || k) : (ketShort[k] || k)}${delBtn}</th>`;
            }).join('');
            const mobileCardsHtml = students.map((s, si) => {
                const scoreItems = allKets.map(k => {
                    const n = s.cells[k];
                    if (!n) {
                        if (!petakCanEdit(g)) return `<div class="nilai-mobile-score"><span class="nilai-mobile-score-label">${ketShort[k] || k}</span><span class="text-gray-300 dark:text-gray-600">&ndash;</span></div>`;
                        const prefill = { nisn: s.nisn, namaSiswa: s.nama, kelas: g.kelas, semester: g.sem, mapel: g.mapel, keterangan: k };
                        return `<div class="nilai-mobile-score"><span class="nilai-mobile-score-label">${ketShort[k] || k}</span><button type="button" onclick='isiNilaiCepat(${safeJsonAttr(prefill)})' class="nilai-mobile-empty-btn" title="Isi nilai">&ndash;</button></div>`;
                    }
                    const val = parseFloat(n.nilai);
                    let cls = 'bg-[#e8ecf4] text-[#1b2a4a] dark:bg-blue-500/20 dark:text-blue-300';
                    if (!isNaN(val)) {
                        if (val < 70) cls = 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
                        else if (val < 80) cls = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
                    }
                    const displayVal = !isNaN(val) ? val : (n.nilai || '-');
                    if (isSiswa || !petakCanEdit(g)) return `<div class="nilai-mobile-score"><span class="nilai-mobile-score-label">${ketShort[k] || k}</span><span class="nilai-mobile-score-value ${cls}">${displayVal}</span></div>`;
                    return `<div class="nilai-mobile-score"><span class="nilai-mobile-score-label">${ketShort[k] || k}</span><div class="flex items-center gap-1"><button type="button" onclick='editNilai(${safeJsonAttr(n)})' class="nilai-mobile-score-value ${cls}" title="Edit nilai">${displayVal}</button><button type="button" onclick='deleteNilaiConfirm(${n.id},"${escJs(s.nama)}","${escJs(g.mapel)}")' class="nilai-mobile-delete" title="Hapus"><i class="fas fa-times"></i></button></div></div>`;
                }).join('');
                return `<div class="nilai-mobile-student-card"><div class="nilai-mobile-student-head"><div class="nilai-mobile-student-no">${si+1}</div><div class="min-w-0 flex-1"><div class="nilai-mobile-student-name">${s.nama}</div>${s.nisn ? `<div class="nilai-mobile-student-nisn">NISN ${s.nisn}</div>` : ''}</div></div><div class="nilai-mobile-scores">${scoreItems}</div></div>`;
            }).join('');

            const rowsHtml = students.map((s, si) => {
                const tds = allKets.map(k => {
                    const n = s.cells[k];
                    if (!n) {
                        if (!petakCanEdit(g)) return '<td class="p-1 sm:p-2 text-center border-l border-gray-100 dark:border-gray-700"><span class="text-gray-300 dark:text-gray-600">&ndash;</span></td>';
                        const prefill = { nisn: s.nisn, namaSiswa: s.nama, kelas: g.kelas, semester: g.sem, mapel: g.mapel, keterangan: k };
                        return `<td class="p-1 sm:p-2 text-center border-l border-gray-100 dark:border-gray-700"><button onclick='isiNilaiCepat(${safeJsonAttr(prefill)})' class="text-gray-300 dark:text-gray-600 hover:text-[#1b2a4a] dark:hover:text-blue-300 transition cursor-pointer" title="Isi nilai ${ketShort[k] || k} untuk ${s.nama}">&ndash;</button></td>`;
                    }
                    const val = parseFloat(n.nilai);
                    let cls = 'bg-[#e8ecf4] text-[#1b2a4a] dark:bg-blue-500/20 dark:text-blue-300';
                    if (!isNaN(val)) {
                        if (val < 70) cls = 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
                        else if (val < 80) cls = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
                    }
                    const displayVal = !isNaN(val) ? val : (n.nilai || '-');
                    const inner = (isSiswa || !petakCanEdit(g))
                        ? `<span class="inline-block px-1.5 py-0.5 sm:px-2.5 rounded-full text-xs font-bold ${cls}">${displayVal}</span>`
                        : `<span class="inline-flex items-center gap-1 group">
                            <button onclick='editNilai(${safeJsonAttr(n)})' class="inline-block px-1.5 py-0.5 sm:px-2.5 rounded-full text-xs font-bold ${cls} hover:ring-2 hover:ring-[#1b2a4a]/30 dark:hover:ring-blue-300/40 transition cursor-pointer" title="${g.mapel} \u2014 ${k}: klik untuk edit">${displayVal}</button>
                            <button onclick='deleteNilaiConfirm(${n.id},"${escJs(s.nama)}","${escJs(g.mapel)}")' class="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition" title="Hapus nilai ini"><i class="fas fa-times text-[9px]"></i></button>
                           </span>`;
                    return `<td class="p-1 sm:p-2 text-center border-l border-gray-100 dark:border-gray-700">${inner}</td>`;
                }).join('');
                return `
                <tr class="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td class="p-1.5 py-2 sm:p-3 text-center text-gray-400 dark:text-gray-500 text-xs align-top">${si + 1}</td>
                    <td class="p-1.5 py-2 sm:p-3 align-middle">
                        <div class="font-semibold text-gray-800 dark:text-gray-200 text-xs sm:text-sm leading-tight">${s.nama}</div>
                        ${(!isSiswa && s.nisn) ? `<div class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">NISN ${s.nisn}</div>` : ''}
                    </td>
                    ${tds}
                </tr>`;
            }).join('');
            const openCls = gi === 0 ? '' : 'hidden';
            const chevCls = gi === 0 ? 'fa-chevron-up' : 'fa-chevron-down';
            html += `
            <tr><td colspan="10" class="p-0">
              <div class="m-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div class="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-[#f0f3f9] to-white dark:from-gray-700/60 dark:to-gray-800 hover:from-[#e8ecf4] dark:hover:from-gray-700 transition text-left cursor-pointer select-none" onclick="toggleNilaiPetak('${pid}')">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-9 h-9 bg-[#1b2a4a] dark:bg-blue-600 rounded-lg flex items-center justify-center shrink-0"><i class="fas fa-book text-white text-sm"></i></span>
                    <div class="min-w-0">
                      <div class="font-bold text-sm text-[#1b2a4a] dark:text-blue-300 truncate">${g.mapel}</div>
                      <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">Kelas ${g.kelas} &middot; Semester ${g.sem} &middot; ${students.length} siswa &middot; ${allKets.length} kolom nilai</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    ${petakCanEdit(g) ? `<span role="button" onclick="event.stopPropagation();tambahNilaiPetakKolom(${gi})" class="w-7 h-7 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-[#1b2a4a] dark:hover:text-blue-300 hover:border-[#1b2a4a]/40 transition shrink-0" title="Tambah kolom nilai"><i class="fas fa-plus text-xs"></i></span>` : ''}
                    <i id="chev-${pid}" class="fas ${chevCls} text-gray-400"></i>
                  </div>
              </div>
                <div id="${pid}" class="${openCls}">
                  <div class="nilai-petak-wrap" data-nilai-required="${44 + 170 + allKets.length * 68}" style="overflow-x:auto">
                    <div class="nilai-mobile-cards">${mobileCardsHtml}</div>
                    <div class="nilai-desktop-table">
                    <table class="w-full text-sm">
                      <thead><tr class="bg-gray-50 dark:bg-gray-700/50 border-y border-gray-100 dark:border-gray-700">
                        <th class="p-1.5 py-2 sm:p-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase w-8 sm:w-10 whitespace-nowrap">No</th>
                        <th class="p-1.5 py-2 sm:p-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Nama Siswa</th>
                        ${colsHead}
                      </tr></thead>
                      <tbody>${rowsHtml}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </td></tr>`;
        });
        tbody.innerHTML = html;
        refitNilaiTables();
    }
    var _nilaiMapelCache = null;
    var _nilaiMapelCacheTime = 0;
    var NILAI_MAPEL_CACHE_TTL = 60000;
    function getNilaiMapelList(callback) {
        var now = Date.now();
        if (_nilaiMapelCache && (now - _nilaiMapelCacheTime) < NILAI_MAPEL_CACHE_TTL) {
            callback(_nilaiMapelCache);
            return;
        }
        var token = currentUser ? currentUser.token : null;
        siakadRun
            .withSuccessHandler(function(list) {
                if (Array.isArray(list) && list.length > 0) {
                    _nilaiMapelCache = list;
                    _nilaiMapelCacheTime = Date.now();
                    if (typeof mmAllMapel !== 'undefined') {
                        mmAllMapel = list.map(function(nama, i) {
                            return { rowIndex: i + 2, nama: nama };
                        });
                    }
                    callback(list);
                } else {
                    _nilaiMapelCache = [];
                    callback([]);
                }
            })
            .withFailureHandler(function(err) {
                console.error('getNilaiMapelList error:', err);
                if (typeof mmAllMapel !== 'undefined' && mmAllMapel.length > 0) {
                    callback(mmAllMapel.map(function(m) { return m.nama; }));
                } else {
                    callback([]);
                }
            })
            .getMapelDariGuru(token);
    }
    function invalidateNilaiMapelCache() {
        _nilaiMapelCache = null;
        _nilaiMapelCacheTime = 0;
    }
    function showAddNilaiModal() {
        getNilaiMapelList(function(mapelList) {
            showModal(createNilaiModal(null, mapelList));
        });
    }
    function editNilai(n) {
        getNilaiMapelList(function(mapelList) {
            showModal(createNilaiModal(n, mapelList));
        });
    }
    function createNilaiModal(n = null, mapelList = [], prefill = null) {
        const isEdit = n !== null;
        if (n === null && prefill) n = prefill;
        const title = isEdit ? 'Edit Nilai' : 'Tambah Nilai';
        let mapelOptions = mapelList.length > 0
            ? mapelList.map(m =>
                `<option value="${m}" ${isEdit && n.mapel === m ? 'selected' : ''}>${m}</option>`
              ).join('')
            : `<option value="" disabled>Belum ada mapel – tambahkan di Manajemen Mapel</option>`;
        if (isEdit && n.mapel && !mapelList.includes(n.mapel)) {
            mapelOptions += `<option value="${n.mapel}" selected>${n.mapel}</option>`;
        }
        const stdKets = ['Tugas', 'Ulangan', 'Ujian Harian', 'UTS', 'UAS'];
        const ketCustomOpt = (isEdit && n.keterangan && !stdKets.includes(n.keterangan))
            ? `<option value="${n.keterangan}" selected>${n.keterangan}</option>`
            : '';
        return `
        <div style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)" onclick="if(event.target===this)closeModal()">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div class="bg-[#1b2a4a] p-5 text-white rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 class="font-bold text-base">${title}</h3>
                <p class="text-blue-100 text-xs mt-0.5">Data nilai siswa</p>
              </div>
              <button onclick="closeModal()" class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition">
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>
            <form onsubmit="saveNilai(event, ${isEdit}, ${isEdit ? n.id : 'null'})" class="p-5 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">NISN Siswa <span class="text-red-500">*</span></label>
                  <div class="flex gap-2">
                    <input type="text" name="nisn" id="inputNilaiNisn" required placeholder="Masukkan NISN..."
                      value="${isEdit ? (n.nisn||'') : ''}"
                      class="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      oninput="autoFillNamaSiswaFromNisn(this.value)">
                    <button type="button" onclick="autoFillNamaSiswaFromNisn(document.getElementById('inputNilaiNisn').value)"
                      class="px-3 py-2 bg-[#e8ecf4] text-[#1b2a4a] rounded-xl text-xs font-bold hover:bg-[#d0d8e8] transition whitespace-nowrap">
                      <i class="fas fa-search"></i>
                    </button>
                  </div>
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nama Siswa</label>
                  <input type="text" name="namaSiswa" id="inputNilaiNama" readonly placeholder="Otomatis dari NISN"
                    value="${isEdit ? (n.namaSiswa||'') : ''}"
                    class="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2 text-sm outline-none text-gray-600 dark:text-gray-400">
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Kelas</label>
                  <input type="text" name="kelas" id="inputNilaiKelas" readonly placeholder="Otomatis dari NISN"
                    value="${isEdit ? (n.kelas||'') : ''}"
                    class="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2 text-sm outline-none text-gray-600 dark:text-gray-400">
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Semester <span class="text-red-500">*</span></label>
                  <select name="semester" required class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                    <option value="">Pilih</option>
                    <option value="1" ${isEdit && (String(n.semester)==='1'||n.semester==='Ganjil') ? 'selected' : ''}>Semester 1</option>
                    <option value="2" ${isEdit && (String(n.semester)==='2'||n.semester==='Genap') ? 'selected' : ''}>Semester 2</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Mata Pelajaran <span class="text-red-500">*</span></label>
                  <select name="mapel" required class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                    <option value="">Pilih Mapel</option>
                    ${mapelOptions}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nilai <span class="text-red-500">*</span></label>
                  <input type="number" name="nilai" required min="0" max="100" placeholder="0 - 100"
                    value="${isEdit ? (n.nilai??'') : ''}"
                    class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Keterangan <span class="text-red-500">*</span></label>
                  <select name="keterangan" required class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                    <option value="">Pilih Jenis Penilaian</option>
                    <option value="Tugas" ${isEdit && n.keterangan==='Tugas' ? 'selected' : ''}>Tugas</option>
                    <option value="Ulangan" ${isEdit && n.keterangan==='Ulangan' ? 'selected' : ''}>Ulangan</option>
                    <option value="Ujian Harian" ${isEdit && n.keterangan==='Ujian Harian' ? 'selected' : ''}>Ujian Harian</option>
                    <option value="UTS" ${isEdit && n.keterangan==='UTS' ? 'selected' : ''}>UTS</option>
                    <option value="UAS" ${isEdit && n.keterangan==='UAS' ? 'selected' : ''}>UAS</option>
                    ${ketCustomOpt}
                  </select>
                </div>
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">Batal</button>
                <button type="submit" class="px-5 py-2 text-sm font-bold text-white bg-[#1b2a4a] dark:bg-blue-600 rounded-xl hover:bg-[#152238] dark:hover:bg-blue-700 transition shadow">
                  <i class="fas fa-save mr-1"></i> ${isEdit ? 'Perbarui' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>`;
    }
    function autoFillNamaSiswaFromNisn(nisn) {
        if (!nisn || String(nisn).length < 4) return;
        fetch('api.php?action=getSiswaByNisn&nisn=' + encodeURIComponent(nisn), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(function(r) { return r.json(); })
        .then(function(result) {
            if (result && result.success && result.data) {
                const namaEl = document.getElementById('inputNilaiNama');
                if (namaEl) namaEl.value = result.data.nama || '';
                const kelasEl = document.getElementById('inputNilaiKelas');
                if (kelasEl && result.data.kelas) kelasEl.value = result.data.kelas;
            }
        })
        .catch(function(err) { console.error('autoFillNamaSiswa error:', err); });
    }
    function saveNilai(e, isEdit, rowId) {
        e.preventDefault();
        showLoading();
        const fd = new FormData(e.target);
        const namaEl = document.getElementById('inputNilaiNama');
        const nilaiData = {
            nisn: fd.get('nisn'),
            namaSiswa: fd.get('namaSiswa') || (namaEl ? namaEl.value : ''),
            kelas: fd.get('kelas'),
            mapel: fd.get('mapel'),
            semester: fd.get('semester'),
            nilai: fd.get('nilai'),
            keterangan: fd.get('keterangan') || ''
        };
        const token = currentUser ? currentUser.token : '';
        const action = isEdit ? 'updateNilai' : 'addNilai';
        fetch('api.php?action=' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, token: token, nilaiData: nilaiData, id: rowId })
        })
        .then(function(r) { return r.json(); })
        .then(function(result) {
            hideLoading();
            closeModal();
            if (result && result.success) {
                const selKelas = document.getElementById('filterNilaiKelas');
                const selSem = document.getElementById('filterNilaiSemester');
                const selKet = document.getElementById('filterNilaiKeterangan');
                const searchInp = document.getElementById('searchNilai');

                if (selKelas && !selKelas.disabled) selKelas.value = '';
                if (selSem) selSem.value = '';
                if (selKet) selKet.value = '';
                if (searchInp) searchInp.value = '';

                Swal.fire({ icon: 'success', title: 'Berhasil!', text: result.message, timer: 1500, showConfirmButton: false });
                loadDataNilai();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: (result && result.message) ? result.message : 'Gagal menyimpan nilai' });
            }
        })
        .catch(function(err) {
            hideLoading();
            Swal.fire({ icon: 'error', title: 'Error', text: err ? err.toString() : 'Terjadi kesalahan jaringan' });
        });
    }
    function triggerImportNilai() {
        document.getElementById('fileInputNilai').click();
    }
    async function downloadTemplateNilai() {
        await ensureLib('xlsx');
        if (typeof XLSX === 'undefined') {
            showAlert('error', 'Library Excel (SheetJS) belum termuat. Coba refresh halaman.');
            return;
        }
        const wb = XLSX.utils.book_new();
        // Kolom HARUS sesuai persis dengan yang dicek handleFileImportNilai
        // Keterangan valid: Tugas, Ujian Harian, UTS, UAS
        const headers = ['NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Semester', 'Nilai', 'Keterangan'];
        const contoh = [
            ['1234567890', 'Budi Santoso', 'X-A', 'Matematika', 'Ganjil', 85, 'Tugas'],
            ['1234567890', 'Budi Santoso', 'X-A', 'Matematika', 'Ganjil', 78, 'UTS'],
            ['1234567890', 'Budi Santoso', 'X-A', 'Matematika', 'Ganjil', 90, 'UAS'],
            ['0987654321', 'Siti Rahayu', 'X-A', 'Bahasa Indonesia', 'Ganjil', 88, 'Tugas'],
            ['0987654321', 'Siti Rahayu', 'X-A', 'Bahasa Indonesia', 'Genap', 92, 'UAS'],
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers, ...contoh]);
        ws['!cols'] = [
            { wch: 15 }, { wch: 25 }, { wch: 10 },
            { wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 16 }
        ];
        // Tambahkan sheet petunjuk
        const petunjukHeaders = ['Kolom', 'Keterangan', 'Nilai Valid'];
        const petunjuk = [
            ['NISN', 'Nomor Induk Siswa Nasional (wajib)', ''],
            ['Nama Siswa', 'Nama lengkap siswa (wajib)', ''],
            ['Kelas', 'Kelas siswa, misal: X-A (wajib)', ''],
            ['Mata Pelajaran', 'Nama mata pelajaran (wajib)', ''],
            ['Semester', 'Semester penilaian (wajib)', '1/Ganjil atau 2/Genap'],
            ['Nilai', 'Angka 0-100 (wajib)', '0 sampai 100'],
            ['Keterangan', 'Jenis penilaian (wajib)', 'Tugas | Ulangan | Ujian Harian | UTS | UAS | nama kolom kustom'],
        ];
        const wsPetunjuk = XLSX.utils.aoa_to_sheet([petunjukHeaders, ...petunjuk]);
        wsPetunjuk['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');
        XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
        XLSX.writeFile(wb, 'Template_Import_Nilai.xlsx');
        showAlert('success', 'Template nilai berhasil diunduh!');
    }
    async function handleFileImportNilai(input) {
        const file = input.files[0];
        if (!file) return;
        showLoading();
        await ensureLib('xlsx');
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const ws = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
                if (jsonData.length === 0) {
                    hideLoading();
                    Swal.fire({ icon: 'error', title: 'File Kosong', text: 'File Excel kosong atau format tidak sesuai template.' });
                    input.value = '';
                    return;
                }
                const firstRow = jsonData[0];
                const required = ['NISN', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Semester', 'Nilai', 'Keterangan'];
                const missing = required.filter(k => !firstRow.hasOwnProperty(k));
                if (missing.length > 0) {
                    hideLoading();
                    Swal.fire({ icon: 'error', title: 'Format Salah', text: `Kolom tidak ditemukan: ${missing.join(', ')}. Gunakan template yang disediakan.` });
                    input.value = '';
                    return;
                }
                const validKet = ['Tugas', 'Ulangan', 'Ujian Harian', 'UTS', 'UAS'];
                // Kunci duplikat: NISN + mapel + semester + keterangan harus unik.
                // UH 1, UH 2, UH 3 tetap boleh karena keterangannya berbeda.
                const dupKey = (n, m, s, k) => [String(n || '').trim().toLowerCase(), String(m || '').trim().toLowerCase(),
                    normalizeNilaiSem(s), String(k || '').trim().toLowerCase()].join('|');
                const existingKeys = new Set((nilaiDataFull || []).map(x =>
                    dupKey(x.nisn, x.mapel || x.mataPelajaran, x.semester, x.keterangan)));
                const formattedData = [];
                const errors = [];
                jsonData.forEach((row, idx) => {
                    const clean = importField;
                    const nisn = clean(row, ['NISN'], false).replace(/'/g, '');
                    const nama = clean(row, ['Nama Siswa'], false);
                    const kelas = clean(row, ['Kelas'], false);
                    const mapel = clean(row, ['Mata Pelajaran'], false);
                    const semesterRaw = clean(row, ['Semester'], false);
                    const nilai = clean(row, ['Nilai'], false);
                    const ket = clean(row, ['Keterangan'], false);
                    // Normalisasi semester agar sinkron dengan aplikasi (1/2, bukan Ganjil/Genap)
                    const semester = normalizeNilaiSem(semesterRaw);
                    const baris = idx + 2;
                    if (!nisn || !nama || !kelas || !mapel || !semester || !nilai) {
                        errors.push(`Baris ${baris}: Ada kolom wajib yang kosong.`);
                        return;
                    }
                    const nilaiNum = parseFloat(nilai);
                    if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
                        errors.push(`Baris ${baris}: Nilai harus angka 0-100.`);
                        return;
                    }
                    // Keterangan valid: standar + kolom kustom milik petak (mapel+kelas+semester) ini
                    const ketCustomOk = (nilaiKolomCustom || []).some(k =>
                        kolomMatchPetak(k, { mapel: mapel, kelas: kelas, sem: semester }) &&
                        String(k.namaKolom || '').trim().toLowerCase() === ket.trim().toLowerCase());
                    if (!validKet.includes(ket) && !ketCustomOk) {
                        errors.push(`Baris ${baris}: Keterangan "${ket}" tidak valid. Gunakan: ${validKet.join(', ')} atau nama kolom kustom.`);
                        return;
                    }
                    const key = dupKey(nisn, mapel, semester, ket);
                    if (existingKeys.has(key)) {
                        errors.push(`Baris ${baris}: Ditolak – data ${ket} semester ${semester} untuk NISN ${nisn} (${mapel}) sudah ada. Gunakan nama keterangan berbeda (mis. UH 1, UH 2).`);
                        return;
                    }
                    existingKeys.add(key);
                    formattedData.push({ nisn, namaSiswa: nama, kelas, mapel, semester, nilai: nilaiNum, keterangan: ket });
                });
                if (formattedData.length === 0) {
                    hideLoading();
                    Swal.fire({
                        icon: 'error',
                        title: `Tidak Ada Data Valid`,
                        html: `<div class="text-left text-xs max-h-48 overflow-y-auto space-y-1">${errors.map(e => `<p>&#8226; ${e}</p>`).join('')}</div>`,
                        confirmButtonText: 'Oke'
                    });
                    input.value = '';
                    return;
                }
                if (errors.length > 0) {
                    // Baris salah/duplikat ditolak, baris valid tetap bisa diimpor
                    hideLoading();
                    Swal.fire({
                        icon: 'warning',
                        title: `${errors.length} Baris Ditolak`,
                        html: `<div class="text-left text-xs max-h-48 overflow-y-auto space-y-1">${errors.map(e => `<p>&#8226; ${e}</p>`).join('')}</div>`,
                        showCancelButton: true,
                        confirmButtonText: `Import ${formattedData.length} Baris Valid`,
                        cancelButtonText: 'Batal',
                        confirmButtonColor: '#2563eb'
                    }).then(res => {
                        if (res.isConfirmed) doImportNilai(formattedData, input);
                        else input.value = '';
                    });
                    return;
                }
                hideLoading();
                Swal.fire({
                    icon: 'question',
                    title: 'Konfirmasi Import',
                    text: `${formattedData.length} baris nilai siap diimpor. Lanjutkan?`,
                    showCancelButton: true,
                    confirmButtonText: 'Ya, Import',
                    cancelButtonText: 'Batal',
                    confirmButtonColor: '#2563eb'
                }).then(result => {
                    if (!result.isConfirmed) { input.value = ''; return; }
                    doImportNilai(formattedData, input);
                });
            } catch (err) {
                hideLoading();
                Swal.fire({ icon: 'error', title: 'Gagal Membaca File', text: err.toString() });
                input.value = '';
            }
        };
        reader.onerror = function() {
            hideLoading();
            Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal membaca file.' });
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
    function doImportNilai(formattedData, input) {
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                input.value = '';
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Import Selesai!',
                        text: `Berhasil: ${res.added} data. Dilewati: ${res.skipped} data.`,
                        timer: 2500,
                        showConfirmButton: false
                    });
                    loadDataNilai();
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
                }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                input.value = '';
                Swal.fire({ icon: 'error', title: 'Error Server', text: err.toString() });
            })
            .importNilaiBulk(currentUser.token, formattedData);
    }
    function deleteNilaiConfirm(rowId, namaSiswa, mapel) {
        Swal.fire({
            title: 'Hapus Nilai?',
            html: `Nilai <b>${mapel}</b> milik <b>${namaSiswa}</b> akan dihapus permanen.`,
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
                            Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1200, showConfirmButton: false });
                            loadDataNilai();
                        } else {
                            Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
                        }
                    })
                    .withFailureHandler(function(err) {
                        hideLoading();
                        Swal.fire({ icon: 'error', title: 'Error', text: err.toString() });
                    })
                    .deleteNilai(currentUser.token, rowId);
            }
        });
    }
    function bulkDeleteNilai() { /* removed */ }