function loadMenuRekapBulanan() {
    stopAndBack(false);
    setActiveMenu('Rekap Bulanan');
    showView('view-rekap-bulanan');
    // ===== SINKRONISASI SUMBER DATA =====
    // Manajemen Jadwal = penentu hari/tanggal mapel; Kelola Absen = hari libur;
    // Daftar Hadir = input kehadiran harian. Cache jadwal & penugasan SELALU
    // di-refresh setiap menu ini dibuka supaya perubahan di menu-menu tersebut
    // langsung tercermin di kolom tanggal & isi rekap (tanpa perlu login ulang).
    // (Hari libur sendiri selalu dibaca ulang server saat memuat rekap.)
    window._guruMengajarList = null;
    window._jadwalMengajarSaya = null;
    window._jadwalFullRk = null;
    const isGuruOrWalikelas = currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas');
    const btnGuru    = document.getElementById('tabRekapBulananGuru');
    const panelGuru  = document.getElementById('panelRekapBulananGuru');
    const panelSiswa = document.getElementById('panelRekapBulananSiswa');
    const btnSiswa   = document.getElementById('tabRekapBulananSiswa');
    if (isGuruOrWalikelas) {
        if (btnGuru)    btnGuru.classList.add('hidden');
        if (panelGuru)  panelGuru.classList.add('hidden');
        if (panelSiswa) panelSiswa.classList.remove('hidden');
        if (btnSiswa)   btnSiswa.className = 'px-5 py-2.5 text-xs font-bold transition border-b-2 border-blue-600 text-[#1b2a4a] bg-white';
    } else {
        if (btnGuru) btnGuru.classList.remove('hidden');
    }
    // Reset tampilan tab ke Siswa setiap kali menu dibuka (hindari tab error/nyangkut)
    if (!isGuruOrWalikelas) switchRekapBulananTab('siswa');
    const selectTahun = document.getElementById('rekapTahun');
    const currentYear = new Date().getFullYear();
    // Tab Siswa dan tab Guru punya filter TERPISAH (bulan/tahun masing-masing)
    const isiSelectTahunRk = (id, onChange) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '';
        for(let i = 0; i < 5; i++) {
            let yr = currentYear - i;
            let opt = document.createElement('option');
            opt.value = yr;
            opt.text = yr;
            sel.appendChild(opt);
        }
        sel.onchange = onChange;
    };
    isiSelectTahunRk('rekapTahun', loadDataRekapBulanan);
    isiSelectTahunRk('rekapTahunGuru', loadDataRekapBulananGuru);
    const selectBulan = document.getElementById('rekapBulan');
    selectBulan.value = new Date().getMonth();
    selectBulan.onchange = loadDataRekapBulanan;
    const selectBulanGuru = document.getElementById('rekapBulanGuru');
    if (selectBulanGuru) {
        selectBulanGuru.value = new Date().getMonth();
        selectBulanGuru.onchange = loadDataRekapBulananGuru;
    }
    const wrapKelas = document.getElementById('wrapRekapKelas');
    if (wrapKelas && !document.getElementById('wrapRekapMapel')) {
        const wrapMapel = document.createElement('div');
        wrapMapel.id = 'wrapRekapMapel';
        wrapMapel.className = wrapKelas.className;
        wrapMapel.innerHTML = `
            <select id="rekapMapel" onchange="loadDataRekapBulanan()"
                class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg p-2 font-bold focus:ring-[#5b7aaa] shadow-sm cursor-pointer">
                <option value="">-- Pilih Mapel --</option>
            </select>`;
        wrapKelas.parentNode.insertBefore(wrapMapel, wrapKelas.nextSibling);
        // WAJIB: admin memilih mapel eksplisit â€” isi opsi dari master mapel
        siakadRun
            .withSuccessHandler(list => {
                const sel = document.getElementById('rekapMapel');
                if (!sel) return;
                (list || []).forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    sel.appendChild(opt);
                });
            })
            .withFailureHandler(() => {})
            .getDaftarMapel();
    }
    const selectKelas = document.getElementById('rekapKelas');
    const fillDropdown = () => {
        if (currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas') && currentUser.kelas) {
            const guruKelas = String(currentUser.kelas).split(',').map(k => k.trim()).filter(Boolean);
            selectKelas.innerHTML = '';
            guruKelas.forEach(kelas => {
                const option = document.createElement('option');
                option.value = kelas;
                option.textContent = kelas;
                selectKelas.appendChild(option);
            });
            if (guruKelas.length === 1) {
                selectKelas.value = guruKelas[0];
            }
        } else {
            // WAJIB: admin menentukan kelas & mapel sebelum tabel muncul
            selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
            if (existingClasses && existingClasses.length > 0) {
                existingClasses.forEach(kelas => {
                    const option = document.createElement('option');
                    option.value = kelas;
                    option.textContent = kelas;
                    selectKelas.appendChild(option);
                });
            }
        }
        // Mirror daftar kelas ke filter milik TAB GURU (filter terpisah)
        const fillKelasGuruRk = () => {
            const selG = document.getElementById('rekapKelasGuru');
            if (!selG) return;
            selG.innerHTML = '<option value="">-- Semua Kelas --</option>';
            Array.from(selectKelas.options).forEach(o => {
                if (!o.value) return;
                const opt = document.createElement('option');
                opt.value = o.value;
                opt.textContent = o.value;
                selG.appendChild(opt);
            });
        };
        fillKelasGuruRk();
        selectKelas.onchange = loadDataRekapBulanan;
        // Role guru/pengajar (dan wali kelas): rekap langsung tampil otomatis
        // sesuai kelas amanannya, tanpa perlu pilih filter dulu.
        if (currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas') && selectKelas.value) {
            loadDataRekapBulanan();
        } else {
            // OTOMATIS untuk admin & role lain: langsung pilih kelas pertama
            // (satu kelas, bukan semua) dan muat tabel umum — tidak menunggu
            // filter dipilih. Pindah kelas/mapel tetap lewat dropdown.
            let firstOptRk = null;
            Array.from(selectKelas.options).forEach(o => { if (!firstOptRk && o.value) firstOptRk = o.value; });
            if (firstOptRk) {
                selectKelas.value = firstOptRk;
                loadDataRekapBulanan();
                loadDataRekapBulananGuru();
            } else {
                resetRekapBulananView();
            }
        }
    };
    if (currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas') && currentUser.kelas) {
        // Pastikan daftar penugasan & jadwal mengajar guru sudah termuat.
        // _guruMengajarList -> hak edit rekap; _jadwalMengajarSaya -> hari ajar per
        // kelas+mapel, dipakai untuk membatasi kolom tanggal yang boleh dilihat.
        const muatJadwalRekap = (setelahItu) => {
            if (!Array.isArray(window._jadwalMengajarSaya)) {
                siakadRun
                    .withSuccessHandler(resJm => {
                        window._jadwalMengajarSaya = (resJm && resJm.success && Array.isArray(resJm.data)) ? resJm.data : [];
                        setelahItu();
                    })
                    .withFailureHandler(() => { window._jadwalMengajarSaya = []; setelahItu(); })
                    .getJadwalMengajarSaya(currentUser.token);
            } else {
                setelahItu();
            }
        };
        const lanjutRekap = () => muatJadwalRekap(fillDropdown);
        if (currentUser.role === 'guru' && !Array.isArray(window._guruMengajarList)) {
            siakadRun
                .withSuccessHandler(res => {
                    window._guruMengajarList = (res && res.success && Array.isArray(res.data)) ? res.data : [];
                    lanjutRekap();
                })
                .withFailureHandler(() => { window._guruMengajarList = []; lanjutRekap(); })
                .getGuruMengajarList(currentUser.token, currentUser.nip || currentUser.username || '');
        } else {
            lanjutRekap();
        }
    } else if (existingClasses && existingClasses.length > 0) {
        fillDropdown();
    } else {
        siakadRun
            .withSuccessHandler(result => {
                if (result.success) {
                    existingClasses = result.data;
                    fillDropdown();
                }
            })
            .withFailureHandler(err => {
                console.error('Gagal memuat daftar kelas:', err);
                resetRekapBulananView();
            })
            .getKelasList();
    }
}
// Shortcut: buka menu Rekap Bulanan langsung ke tab Guru (dipakai oleh
// tombol "Absensi Guru" di Aksi Cepat Admin, dsb).
function loadMenuRekapBulananGuru() {
    loadMenuRekapBulanan();
    switchRekapBulananTab('guru');
}
function resetRekapBulananView() {
    const placeholder = '<tr><td colspan="10" class="p-10 text-center text-gray-400"><i class="fas fa-filter mr-2"></i>Pilih kelas — rekap absensi otomatis tampil. Pilih mapel untuk tabel khusus per mapel.</td></tr>';
    ['thead-rekap-bulanan', 'thead-rekap-bulanan-guru'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    ['tbody-rekap-bulanan', 'tbody-rekap-bulanan-guru'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = placeholder;
    });
}
// Escape string untuk dipakai sebagai argumen string ('...') di dalam atribut
// onclick="..." (HTML). PENTING: &#39; TIDAK BOLEH dipakai di sini — browser
// men-decode entity HTML sebelum menjalankan JS di atribut onclick, jadi &#39;
// akan balik jadi karakter ' dan merusak sintaks JS (nama seperti "Nur'aini"/
// "Ma'ruf" bikin tombol edit/hapus mati total & console error "missing )
// after argument list"). Backslash-escape (\') aman karena tidak didecode
// sebagai entity HTML, sementara tanda kutip ganda tetap dikonversi ke &quot;
// karena atribut onclick dibungkus tanda kutip ganda.
function _rkEscJs(str) {
    return String(str === undefined || str === null ? '' : str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;');
}
// Konversi nama hari Indonesia -> angka getDay() JS (Minggu=0 .. Sabtu=6)
function _rkHariKeGetDay(hari) {
    const map = { minggu:0, ahad:0, senin:1, selasa:2, rabu:3, kamis:4, jumat:5, sabtu:6 };
    const h = String(hari || '').toLowerCase().replace(/['.\s]/g, '');
    return map.hasOwnProperty(h) ? map[h] : undefined;
}
// Role guru: himpunan tanggal (1..daysInMonth) yang boleh dilihat pada rekap
// kelas+mapel terpilih — hanya hari-hari yang dia mengajar sesuai jadwal.
// Selain hari tersebut guru tidak punya akses. null = tidak dibatasi
// (jadwal tidak ditemukan / role lain), supaya menu tidak mati total karena
// ketidakcocokan data jadwal.
function _rkTanggalBolehLihatGuru(daysInMonth) {
    const kelasSel = document.getElementById('rekapKelas');
    const mapelSel = document.getElementById('rekapMapel');
    const kelas = kelasSel ? kelasSel.value : '';
    const mapel = mapelSel ? mapelSel.value.trim() : '';
    const jd = Array.isArray(window._jadwalMengajarSaya) ? window._jadwalMengajarSaya : [];
    if (!kelas || jd.length === 0 || !daysInMonth) return null;
    const nk = s => String(s || '').toLowerCase().replace(/kelas\s*/g, '').trim();
    const nm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const hariKelasMapel = new Set();
    const hariKelasSemua = new Set();
    jd.forEach(j => {
        if (nk(j.kelas) !== nk(kelas)) return;
        const wd = _rkHariKeGetDay(j.hari);
        if (wd === undefined) return;
        hariKelasSemua.add(wd);
        if (mapel && nm(j.mapel || j.mata_pelajaran) === nm(mapel)) hariKelasMapel.add(wd);
    });
    // Utamakan hari untuk mapel terpilih; jika tak cocok, pakai hari kelas tsb;
    // jika sama sekali tidak ada → null (tidak dibatasi, jadwal kemungkinan beda format)
    if (hariKelasSemua.size === 0) { console.warn('[Rekap] Jadwal guru tidak cocok untuk kelas', kelas); return null; }
    const hariAktif = hariKelasMapel.size > 0 ? hariKelasMapel : hariKelasSemua;
    const set = new Set();
    const bulan = parseInt(document.getElementById('rekapBulan').value);
    const tahun = parseInt(document.getElementById('rekapTahun').value);
    for (let d = 1; d <= daysInMonth; d++) {
        if (hariAktif.has(new Date(tahun, bulan, d).getDay())) set.add(String(d));
    }
    return set;
}
// ADMIN/WALIKELAS + filter mapel: kolom tanggal dibatasi hanya hari JADWAL
// mapel tersebut di kelas itu (apa pun gurunya) — bentuk sama seperti tabel
// rekap guru. null = tampilkan semua tanggal.
function _rkTanggalDariJadwal(daysInMonth) {
    const kelasSel = document.getElementById('rekapKelas');
    const mapelSel = document.getElementById('rekapMapel');
    const kelas = kelasSel ? kelasSel.value : '';
    const mapel = mapelSel ? mapelSel.value.trim() : '';
    const jd = Array.isArray(window._jadwalFullRk) ? window._jadwalFullRk : [];
    if (!kelas || !mapel || jd.length === 0 || !daysInMonth) return null;
    const nk = s => String(s || '').toLowerCase().replace(/kelas\s*/g, '').trim();
    const nm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const hariSet = new Set();
    jd.forEach(j => {
        if (nk(j.kelas) !== nk(kelas)) return;
        if (nm(j.mapel || j.mata_pelajaran) !== nm(mapel)) return;
        const wd = _rkHariKeGetDay(j.hari);
        if (wd !== undefined) hariSet.add(wd);
    });
    if (hariSet.size === 0) return null;
    const set = new Set();
    const bulan = parseInt(document.getElementById('rekapBulan').value);
    const tahun = parseInt(document.getElementById('rekapTahun').value);
    for (let d = 1; d <= daysInMonth; d++) {
        if (hariSet.has(new Date(tahun, bulan, d).getDay())) set.add(String(d));
    }
    return set.size > 0 ? set : null;
}
function loadDataRekapBulanan() {
    const bulanEl = document.getElementById('rekapBulan');
    const tahunEl = document.getElementById('rekapTahun');
    const kelasEl = document.getElementById('rekapKelas');
    if (!bulanEl || !tahunEl || !kelasEl) return;
    const bulan = bulanEl.value;
    const tahun = tahunEl.value;
    const kelas = kelasEl.value;
    const tbody = document.getElementById('tbody-rekap-bulanan');
    const thead = document.getElementById('thead-rekap-bulanan');
    if (!tbody || !thead) return;
    // Filter mapel diproses di SERVER (payload ringan & anti-lag)
    const selectMapelEl = document.getElementById('rekapMapel');
    const mapelFilter = selectMapelEl ? selectMapelEl.value.trim() : '';
    if (!kelas && currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas')) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-yellow-600 font-semibold"><i class="fas fa-exclamation-triangle mr-2"></i>Silakan pilih kelas terlebih dahulu.</td></tr>';
        return;
    }
    // ADMIN & role lain: cukup pilih KELAS — rekap absensi kelas tersebut
    // langsung tampil OTOMATIS (satu kelas, bukan semua kelas sekaligus).
    // Filter mapel opsional: dipilih → tampil tabel khusus per-mapel.
    if (!(currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas')) && !kelas) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-12 text-center">
            <div class="flex flex-col items-center gap-2">
                <i class="fas fa-filter text-3xl text-gray-200"></i>
                <p class="text-sm text-gray-400 font-semibold">Pilih kelas terlebih dahulu</p>
                <p class="text-[10px] text-gray-400">Rekap gabungan otomatis tampil. Pilih mapel untuk membuka tabel khusus per mapel.</p>
            </div>
        </td></tr>`;
        return;
    }
    // Filter mapel aktif (admin & role selain guru): muat dulu JADWAL LENGKAP
    // agar kolom tanggal dibatasi sesuai jadwal mapel tersebut (bentuk tabel
    // seperti punya guru). Cache sekali per sesi lalu muat ulang.
    if (mapelFilter && !(currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas')) && !Array.isArray(window._jadwalFullRk)) {
        siakadRun
            .withSuccessHandler(resJf => {
                window._jadwalFullRk = (resJf && resJf.success && Array.isArray(resJf.data)) ? resJf.data : [];
                loadDataRekapBulanan();
            })
            .withFailureHandler(() => { window._jadwalFullRk = []; loadDataRekapBulanan(); })
            .getJadwalList();
        return;
    }
    tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center"><i class="fas fa-circle-notch fa-spin mr-2"></i>Mengambil data...</td></tr>';
    siakadRun
    .withFailureHandler(err => {
        const msg = `<tr><td colspan="10" class="p-8 text-center text-red-500"><i class="fas fa-times-circle mr-2"></i>Gagal mengambil data: ${err.message || err}</td></tr>`;
        tbody.innerHTML = msg;
        const tbodyGuruErr = document.getElementById('tbody-rekap-bulanan-guru');
        if (tbodyGuruErr) tbodyGuruErr.innerHTML = msg;
    })
    .withSuccessHandler(res => {
        if(!res.success) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-red-500">${res.message}</td></tr>`;
            return;
        }
        const data = res.data;
        if (selectMapelEl && data.mapelList) {
            const prevMapelVal = mapelFilter;
            // GURU: dropdown mapel hanya berisi mapel yang dia ampu
            let mapelListRk = data.mapelList;
            if (currentUser && currentUser.role === 'guru' && Array.isArray(window._guruMengajarList)) {
                const myMapels = [...new Set(window._guruMengajarList
                    .map(a => String(a.mata_pelajaran || a.mapel || '').trim())
                    .filter(Boolean))];
                const filtered = data.mapelList.filter(m => myMapels.some(x => x.toLowerCase() === String(m).toLowerCase()));
                mapelListRk = filtered.length > 0 ? filtered : myMapels;
            }
            selectMapelEl.innerHTML = '<option value="">-- Pilih Mapel --</option>';
            mapelListRk.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                if (m === prevMapelVal) opt.selected = true;
                selectMapelEl.appendChild(opt);
            });
            // GURU/WALIKELAS: mapel wajib â€” otomatis pilih mapel pertama
            // lalu muat ulang rekap dengan filter mapel tersebut.
            if ((currentUser && (currentUser.role === 'guru' || currentUser.role === 'walikelas')) && !prevMapelVal && mapelListRk.length > 0) {
                selectMapelEl.selectedIndex = 1;
                loadDataRekapBulanan();
                return;
            }
        }
        // ===== SATU BARIS PER SISWA (versi gabungan) =====
        // Data absensi per mapel yang disimpan para guru DIKUMPULKAN menjadi
        // satu baris per siswa. Kolom "Absensi Mapel" dihapus — mapel cukup
        // sebagai FILTER. Jika satu tanggal punya beberapa entri mapel, sel
        // menampilkan status prioritas terburuk: A > S > I > H.
        const students = data.students || [];
        const _rkMprio = { A: 3, S: 2, I: 1, H: 0 };
        function _rkMergeDaily(variants, daysInMonth) {
            const byDate = {};
            variants.forEach(v => (v.dailyCodes || []).forEach(d => {
                (byDate[d.date] = byDate[d.date] || []).push({
                    code: d.code,
                    isHoliday: d.isHoliday,
                    mp: v.mapel || '(umum)'
                });
            }));
            const out = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const arr = byDate[d] || [];
                let code = '', best = -1;
                arr.forEach(x => {
                    const p = _rkMprio[x.code];
                    if (p !== undefined && p > best) { best = p; code = x.code; }
                });
                // Rincian asal data: "Matematika: A • B.Indonesia: H"
                const validArr = arr.filter(x => _rkMprio[x.code] !== undefined);
                const detail = validArr
                    .map(x => `${x.mp}: ${x.code}`)
                    .join('  •  ');
                // Persentase kehadiran hari itu = jumlah mapel berstatus Hadir
                // dibagi total mapel yang tercatat pada tanggal tsb (dipakai
                // untuk tabel GABUNGAN/tanpa filter mapel).
                const totalMapelHari = validArr.length;
                const hadirMapelHari = validArr.filter(x => x.code === 'H').length;
                const persenHari = totalMapelHari > 0 ? Math.round((hadirMapelHari / totalMapelHari) * 100) : null;
                out.push({ date: d, code: code, isHoliday: arr.length ? !!arr[0].isHoliday : false, detail: detail, totalMapel: totalMapelHari, hadirMapel: hadirMapelHari, persen: persenHari });
            }
            return out;
        }
        const groupedRk = [];
        const byKeyRk = {};
        students.forEach(s => {
            const key = s.nisn || (s.nama + '_' + s.kelas);
            if (!byKeyRk[key]) { byKeyRk[key] = { siswa: s, variants: [] }; groupedRk.push(byKeyRk[key]); }
            byKeyRk[key].variants.push(s);
        });
        const isAdmin = currentUser && currentUser.role === 'admin';
        const isWaliRk = currentUser && currentUser.role === 'walikelas';
        const isGuruRk = currentUser && currentUser.role === 'guru';
        const mgRk = isGuruRk ? (window._guruMengajarList || []) : [];
        const normKlsRk = s => String(s || '').toLowerCase().replace(/kelas\s*/g, '').trim();
        // Hak edit per baris: admin semua; walikelas kelas walinya;
        // guru hanya baris kelas+mapel yang dia ampu (edit via rekap = selain monitoring)
        const barisBolehEdit = (siswa) => isAdmin || isWaliRk || (isGuruRk && mgRk.some(a =>
            normKlsRk(a.kelas) === normKlsRk(siswa.kelas) &&
            String(a.mata_pelajaran || a.mapel || '').toLowerCase().trim() === String(siswa.mapel || '').toLowerCase().trim()));
        const rekapBulanVal  = String(parseInt(document.getElementById('rekapBulan').value) + 1).padStart(2, '0');
        const rekapTahunVal  = document.getElementById('rekapTahun').value;
        // GURU: pembatasan akses kolom tanggal sesuai jadwal mengajarnya
        // (kelas+mapel terpilih). Kolom di luar daftar ini DIHAPUS dari tabel.
        // null = tanpa pembatasan.
        const tglBolehRk = isGuruRk ? _rkTanggalBolehLihatGuru(data.daysInMonth || 0) : null;
        // ADMIN/WALIKELAS + filter mapel: kolom dibatasi tanggal jadwal mapel tsb
        const tglMapelRk = (!isGuruRk && mapelFilter) ? _rkTanggalDariJadwal(data.daysInMonth || 0) : null;
        const kolomAktifRk = tglBolehRk || tglMapelRk;
        const jumlahKolomTglRk = kolomAktifRk ? kolomAktifRk.size : (data.daysInMonth || 0);
        // Mapel tujuan edit/hapus: jika filter mapel aktif pakai itu; jika tidak
        // (admin tanpa filter), dialog edit akan meminta memilih mapel dulu.
        const mapelAttr = mapelFilter || '';
        const subElRk = document.getElementById('rekapBulananSubtitle');
        if (subElRk) subElRk.textContent = tglBolehRk
            ? 'Hanya tanggal hari anda mengajar'
            : (mapelFilter
                ? `Tabel Mapel: ${mapelFilter} — ${kelas}`
                : 'Tabel Gabungan — kolom tanggal = % hadir/hari');
        let headerHTML = '<th style="position:sticky;left:0;z-index:30;min-width:48px;max-width:48px;width:48px;" class="p-3 text-center bg-gray-100 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">No</th>';
        headerHTML += '<th style="position:sticky;left:48px;z-index:30;min-width:160px;max-width:160px;width:160px;" class="p-3 bg-gray-100 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">Nama Siswa</th>';
        // Kalender hari-libur untuk pewarnaan kolom tanggal (dari data siswa pertama)
        const kalRk = (groupedRk.length && groupedRk[0].variants[0].dailyCodes) ? groupedRk[0].variants[0].dailyCodes : [];
        for(let d=1; d<=data.daysInMonth; d++) {
            // Kolom tanggal di luar hari aktif tidak dirender sama sekali
            if (kolomAktifRk && !kolomAktifRk.has(String(d))) continue;
            let wd = '';
            try { wd = new Date(parseInt(tahun), parseInt(bulan), d).toLocaleDateString('id-ID', { weekday: 'short' }); } catch(e) {}
            const infoRk = kalRk[d - 1];
            const holCls = (infoRk && infoRk.isHoliday)
                ? 'bg-red-50 dark:bg-red-500/20 text-red-500 dark:text-red-300'
                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400';
            headerHTML += `<th style="min-width:34px;" class="p-1 text-center text-[10px] border-l border-gray-200 dark:border-gray-700 ${holCls}"><div class="leading-none">${d}</div><div class="text-[7px] font-semibold opacity-75 mt-0.5 leading-none">${wd}</div></th>`;
        }
        headerHTML += '<th class="p-2 w-8 text-center bg-[#e8ecf4] dark:bg-blue-500/20 text-[#152238] dark:text-blue-300 border-l border-gray-200 dark:border-gray-700 font-bold" title="Hadir">H</th>';
        headerHTML += '<th class="p-2 w-8 text-center bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-l border-gray-200 dark:border-gray-700 font-bold" title="Sakit">S</th>';
        headerHTML += '<th class="p-2 w-8 text-center bg-[#e8ecf4] dark:bg-blue-500/20 text-[#152238] dark:text-blue-300 border-l border-gray-200 dark:border-gray-700 font-bold" title="Izin">I</th>';
        headerHTML += '<th class="p-2 w-8 text-center bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-l border-gray-200 dark:border-gray-700 font-bold" title="Alpa">A</th>';
        headerHTML += '<th class="p-2 w-12 text-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 font-bold">%</th>';
        thead.innerHTML = headerHTML;
        if(students.length === 0) {
            const colspan = 2 + jumlahKolomTglRk + 5;
            tbody.innerHTML = `<tr><td colspan="${colspan}" class="p-8 text-center text-gray-400">Tidak ada data siswa.</td></tr>`;
            return;
        }
        let rowsHTML = '';
        // Pre-compute gabungan harian tiap siswa
        groupedRk.forEach(g => { g.merged = _rkMergeDaily(g.variants, data.daysInMonth || 0); });
        groupedRk.forEach((g, idx) => {
            const siswa = g.siswa;
            // Gabungan harian sudah di-pre-compute di atas
            const mergedDaily = g.merged;
            // Statistik dihitung dari baris gabungan (hanya tanggal yang berhak
            // dilihat untuk role guru terbatas); hari libur tidak masuk pembagi.
            let vh = 0, vs = 0, vi = 0, va = 0, vEff = 0;
            mergedDaily.forEach(day => {
                if (kolomAktifRk && !kolomAktifRk.has(String(day.date))) return;
                if (day.isHoliday) return;
                vEff++;
                if (day.code === 'H')      vh++;
                else if (day.code === 'S') vs++;
                else if (day.code === 'I') vi++;
                else if (day.code === 'A') va++;
            });
            const statsView = { h: vh, s: vs, i: vi, a: va, percent: vEff > 0 ? Math.round((vh / vEff) * 100) : 0 };
            const rowBg = (idx % 2 === 1) ? 'bg-[#f4f6fb] dark:bg-[#1a2233]' : 'bg-white dark:bg-gray-800';
            let row = `<tr class="hover:bg-[#e8ecf4]/30 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 group transition-colors">`;
            row += `<td style="position:sticky;left:0;z-index:25;min-width:48px;max-width:48px;width:48px;" class="p-3 text-center text-gray-400 text-xs ${rowBg} border-r border-gray-100">${idx + 1}</td>`;
            row += `<td style="position:sticky;left:48px;z-index:25;min-width:160px;max-width:160px;width:160px;" class="p-3 font-bold text-gray-700 text-xs ${rowBg} border-r border-gray-100 truncate" title="${siswa.nama}">
                        ${siswa.nama}
                        <div class="text-[10px] font-normal text-gray-400">${siswa.kelas}</div>
                    </td>`;
            mergedDaily.forEach(day => {
                // Kolom tanggal di luar hari aktif sudah dihapus dari header —
                // baris juga tidak merender selnya.
                if (kolomAktifRk && !kolomAktifRk.has(String(day.date))) return;
                // Tabel GABUNGAN (tanpa filter mapel) menampilkan PERSEN kehadiran
                // hari itu (jumlah mapel Hadir / total mapel tercatat hari itu),
                // bukan lagi satu huruf H/A/S/I. Tabel per-mapel (mapelFilter aktif)
                // tetap memakai kode huruf seperti biasa.
                const modeGabunganRk = !mapelFilter;
                let colorClass = '';
                let bgClass = '';
                let cellText = '';
                if(day.isHoliday) {
                    bgClass = 'bg-red-50 dark:bg-red-500/10'; colorClass = 'text-red-300 dark:text-red-300/60';
                    cellText = '';
                } else if (modeGabunganRk) {
                    if (day.totalMapel > 0) {
                        const p = day.persen;
                        if (p >= 90)      { colorClass = 'text-[#1b2a4a] dark:text-blue-300 font-bold'; bgClass = 'bg-[#e8ecf4]/60 dark:bg-blue-500/20'; }
                        else if (p >= 70) { colorClass = 'text-yellow-600 dark:text-yellow-300 font-bold'; bgClass = 'bg-yellow-50 dark:bg-yellow-500/20'; }
                        else              { colorClass = 'text-red-600 dark:text-red-300 font-bold'; bgClass = 'bg-red-50 dark:bg-red-500/20'; }
                        cellText = p + '%';
                    }
                } else {
                    if(day.code === 'H') { colorClass = 'text-[#1b2a4a] dark:text-blue-300 font-bold'; bgClass = 'bg-[#e8ecf4]/60 dark:bg-blue-500/20'; }
                    else if(day.code === 'S') { colorClass = 'text-yellow-600 dark:text-yellow-300 font-bold'; bgClass = 'bg-yellow-50 dark:bg-yellow-500/20'; }
                    else if(day.code === 'I') { colorClass = 'text-[#1b2a4a] dark:text-blue-300 font-bold'; bgClass = 'bg-[#e8ecf4] dark:bg-blue-500/20'; }
                    else if(day.code === 'A') { colorClass = 'text-red-600 dark:text-red-300 font-bold'; bgClass = 'bg-red-50 dark:bg-red-500/20'; }
                    cellText = day.code || '';
                }
                // Tombol edit/hapus per sel HANYA untuk tabel per-mapel (H/S/I/A).
                // Tabel gabungan (mode persen "%") murni ringkasan, jadi tidak
                // boleh diubah/dihapus langsung dari situ.
                const bisa_aksi = !day.isHoliday && !modeGabunganRk && barisBolehEdit(siswa);
                const tglSel = `${rekapTahunVal}-${rekapBulanVal}-${String(day.date).padStart(2,'0')}`;
                const codeToStatus = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
                const statusPenuh = codeToStatus[day.code] || day.code || '';
                const hasEntry = modeGabunganRk ? (day.totalMapel > 0) : ['H','S','I','A'].includes(day.code);
                const editBtn = bisa_aksi ? `<button onclick="editStatusRekap('${_rkEscJs(siswa.nisn)}','${_rkEscJs(siswa.nama)}','${_rkEscJs(siswa.kelas)}','${_rkEscJs(tglSel)}','${_rkEscJs(mapelAttr)}','${_rkEscJs(statusPenuh)}')" class="text-blue-500 hover:text-[#152238] transition bg-white/80 rounded" title="${mapelAttr ? 'Edit / Input status (' + mapelAttr + ')' : 'Edit / Input status — pilih mapel'}"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` : '';
                const delBtn = (bisa_aksi && hasEntry) ? `<button onclick="hapusAbsensiRekap('${_rkEscJs(siswa.nisn)}','${_rkEscJs(siswa.nama)}','${_rkEscJs(tglSel)}','${_rkEscJs(mapelAttr)}')" class="text-red-400 hover:text-red-600 transition bg-white/80 rounded" title="Hapus entri"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : '';
                // Tombol aksi memakai posisi ABSOLUTE (overlay) supaya tidak
                // mengubah lebar sel tanggal â€” kolom tetap rata & tidak bergeser.
                const aksiBtn = (editBtn || delBtn) ? `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);gap:2px;align-items:center;background:white;border:1px solid #e5e7eb;border-radius:6px;padding:1px 3px;box-shadow:0 1px 4px rgba(0,0,0,0.12);white-space:nowrap;z-index:15;" class="hidden group-hover:flex rekap-aksi-overlay" onclick="event.stopPropagation()">${editBtn}${delBtn}</span>` : '';
                const cellTitle = day.detail
                    ? `Rincian mapel — ${day.detail.replace(/"/g, '&quot;')}${modeGabunganRk && day.totalMapel > 0 ? ` (${day.hadirMapel}/${day.totalMapel} hadir)` : ''}`
                    : '';
                row += `<td style="min-width:30px;position:relative;" class="p-1 text-center text-[10px] border-l border-gray-100 dark:border-gray-700 ${colorClass} ${bgClass}" ${cellTitle ? `title="${cellTitle}"` : ''}>${cellText}${aksiBtn}</td>`;
            });
            const pColor = statsView.percent < 70 ? 'text-red-600 dark:text-red-400' : (statsView.percent < 90 ? 'text-yellow-600 dark:text-yellow-400' : 'text-[#1b2a4a] dark:text-blue-300');
            row += `<td class="p-2 text-center text-xs font-bold text-[#152238] dark:text-blue-300 bg-[#e8ecf4]/30 dark:bg-blue-500/10 border-l border-gray-100 dark:border-gray-700">${statsView.h}</td>`;
            row += `<td class="p-2 text-center text-xs font-bold text-yellow-700 dark:text-yellow-300 bg-yellow-50/30 dark:bg-yellow-500/10 border-l border-gray-100 dark:border-gray-700">${statsView.s}</td>`;
            row += `<td class="p-2 text-center text-xs font-bold text-[#152238] dark:text-blue-300 bg-[#e8ecf4]/30 dark:bg-blue-500/10 border-l border-gray-100 dark:border-gray-700">${statsView.i}</td>`;
            row += `<td class="p-2 text-center text-xs font-bold text-red-700 dark:text-red-300 bg-red-50/30 dark:bg-red-500/10 border-l border-gray-100 dark:border-gray-700">${statsView.a}</td>`;
            row += `<td class="p-2 text-center text-xs font-bold ${pColor} bg-gray-50 dark:bg-gray-700/50 border-l border-gray-100 dark:border-gray-700">${statsView.percent}%</td>`;
            row += `</tr>`;
            rowsHTML += row;
        });
        tbody.innerHTML = rowsHTML;
        if (data.teachers && data.teachers.length > 0) {
            renderRekapBulananGuruTable(data);
        } else {
            const tbodyGuru = document.getElementById('tbody-rekap-bulanan-guru');
            const theadGuru = document.getElementById('thead-rekap-bulanan-guru');
            if (theadGuru) theadGuru.innerHTML = '';
            if (tbodyGuru) tbodyGuru.innerHTML = '<tr><td colspan="40" class="p-8 text-center text-gray-400">Tidak ada data guru untuk periode ini.</td></tr>';
        }
    }).getMonthlyReportData(currentUser ? currentUser.token : '', parseInt(bulan) + 1, parseInt(tahun), kelas, mapelFilter);
}
function editStatusRekap(nisn, nama, kelas, tanggal, mapel, statusSaat) {
    // ATURAN: setiap absensi wajib diikuti mapel â€” jika entri belum punya mapel, wajib dipilih
    let wajibPilihMapel = false;
    const mapelOptions = {};
    if (!mapel) {
        const rekapMapelSel = document.getElementById('rekapMapel');
        if (rekapMapelSel) {
            Array.from(rekapMapelSel.options).forEach(o => {
                if (o.value) mapelOptions[o.value] = o.value;
            });
        }
        wajibPilihMapel = Object.keys(mapelOptions).length > 0;
    }
    const mapelLabel = mapel ? ` <b>(${mapel})</b>` : '';
    const colorMap = {
        Hadir: 'bg-[#1b2a4a] text-white border-[#1b2a4a]',
        Sakit: 'bg-yellow-400 text-white border-yellow-400',
        Izin:  'bg-blue-500 text-white border-blue-500',
        Alpa:  'bg-red-500 text-white border-red-500'
    };
    let selectedStatus = statusSaat;
    const _btnClsRk = (active, val) => `swal-status-btn w-full px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition ${
        active ? colorMap[val] : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
    }`;
    Swal.fire({
        title: 'Edit Status Kehadiran',
        width: 420,
        customClass: { popup: 'edit-status-popup' },
        html: `
            <div class="text-left bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 mb-3">
                <div class="text-sm font-bold text-gray-800 break-words leading-snug">${nama}</div>
                <div class="text-[11px] text-gray-500 mt-1 break-words">${tanggal}${mapelLabel}</div>
            </div>
            ${wajibPilihMapel ? `<select id="swalMapelRekap" class="swal2-select mb-3" style="width:100%;max-width:100%;">
                    <option value="">-- Pilih Mata Pelajaran (wajib) --</option>
                    ${Object.keys(mapelOptions).map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>` : ''}
            <div class="grid grid-cols-2 gap-2" id="swal-status-btns">
              ${['Hadir','Sakit','Izin','Alpa'].map(s => `
                <button type="button" data-val="${s}" class="${_btnClsRk(s === statusSaat, s)}">${s}</button>`).join('')}
            </div>`,
        showConfirmButton: true,
        confirmButtonText: 'Simpan',
        confirmButtonColor: '#2563eb',
        showCancelButton: true,
        cancelButtonText: 'Batal',
        didOpen: () => {
            // Kunci scroll latar belakang (khususnya horizontal) selama dialog terbuka
            document.body.style.overflowX = 'hidden';
            document.querySelectorAll('.swal-status-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectedStatus = btn.dataset.val;
                    document.querySelectorAll('.swal-status-btn').forEach(b => {
                        b.className = _btnClsRk(b.dataset.val === selectedStatus, b.dataset.val);
                    });
                });
            });
        },
        willClose: () => { document.body.style.overflowX = ''; },
        preConfirm: () => {
            if (wajibPilihMapel) {
                const picked = document.getElementById('swalMapelRekap')?.value || '';
                if (!picked) {
                    Swal.showValidationMessage('Pilih mata pelajaran terlebih dahulu â€” absensi wajib diikuti mapel.');
                    return false;
                }
                return { status: selectedStatus, mapel: picked };
            }
            return { status: selectedStatus, mapel: mapel };
        }
    }).then(result => {
        if (!result.isConfirmed) return;
        const newStatus = result.value?.status;
        const mapelFinal = result.value?.mapel || mapel;
        if (!newStatus) return;
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                if (res.success) {
                    Swal.fire({ icon: 'success', title: 'Tersimpan!', text: res.message, timer: 1500, showConfirmButton: false });
                    loadDataRekapBulanan();
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
                }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                Swal.fire({ icon: 'error', title: 'Error Server', text: err.toString() });
            })
            .updateAbsensiEntryByDate(currentUser.token, nisn, nama, kelas, tanggal, mapelFinal, newStatus);
    });
}
function hapusAbsensiRekap(nisn, nama, tanggal, mapel) {
    const tanpaMapel = !mapel;
    const mapelLabel = mapel ? ` <b>(${mapel})</b>` : ' <b>(semua mata pelajaran)</b>';
    const peringatanUmum = tanpaMapel
        ? `<div class="text-[11px] text-gray-500 mb-1">Baris gabungan tanpa filter mapel — <b>seluruh entri berbagai mapel</b> pada tanggal ini akan terhapus.</div>`
        : '';
    Swal.fire({
        title: 'Hapus Data Absensi?',
        html: `${peringatanUmum}Entri absensi <b>${nama}</b><br>Tanggal: <b>${tanggal}</b>${mapelLabel}<br><br><span class="text-red-500 text-xs font-semibold">Data akan dihapus permanen dari sheet absensi.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Batal',
        confirmButtonText: 'Ya, Hapus'
    }).then(result => {
        if (!result.isConfirmed) return;
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                if (res.success) {
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: res.message, timer: 1800, showConfirmButton: false });
                    loadDataRekapBulanan();
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
                }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                Swal.fire({ icon: 'error', title: 'Error Server', text: err.toString() });
            })
            .deleteAbsensiEntry(currentUser.token, nisn, tanggal, mapel);
    });
}
function switchRekapBulananTab(tab) {
    const panelSiswa = document.getElementById('panelRekapBulananSiswa');
    const panelGuru  = document.getElementById('panelRekapBulananGuru');
    const btnSiswa   = document.getElementById('tabRekapBulananSiswa');
    const btnGuru    = document.getElementById('tabRekapBulananGuru');
    // Filter & tombol berada di HEADER (mepet kanan) — tampilkan yang sesuai tab
    const toolbarSiswaRk = document.getElementById('toolbarRekapSiswa');
    const toolbarGuruRk  = document.getElementById('toolbarRekapGuru');
    const activeClass   = 'px-5 py-2.5 text-xs font-bold transition border-b-2 border-blue-600 text-[#1b2a4a] bg-white';
    const inactiveClass = 'px-5 py-2.5 text-xs font-bold transition border-b-2 border-transparent text-gray-500 hover:text-[#1b2a4a]';
    if (tab === 'siswa') {
        panelSiswa.classList.remove('hidden');
        panelGuru.classList.add('hidden');
        btnSiswa.className = activeClass;
        btnGuru.className  = inactiveClass;
        if (toolbarSiswaRk) toolbarSiswaRk.classList.remove('hidden');
        if (toolbarGuruRk)  toolbarGuruRk.classList.add('hidden');
    } else {
        panelGuru.classList.remove('hidden');
        panelSiswa.classList.add('hidden');
        btnGuru.className  = activeClass;
        btnSiswa.className = inactiveClass;
        if (toolbarGuruRk)  toolbarGuruRk.classList.remove('hidden');
        if (toolbarSiswaRk) toolbarSiswaRk.classList.add('hidden');
        // Filter tab guru TERPISAH dari tab siswa: selalu muat ulang
        // sesuai pilihan (kelas/bulan/tahun) milik tab guru.
        loadDataRekapBulananGuru();
    }
}
// Loader khusus TAB GURU — memakai filter rekapKelasGuru/rekapBulanGuru/
// rekapTahunGuru, sama sekali tidak terpengaruh filter tab siswa.
function loadDataRekapBulananGuru() {
    const thead = document.getElementById('thead-rekap-bulanan-guru');
    const tbody = document.getElementById('tbody-rekap-bulanan-guru');
    if (!thead || !tbody) return;
    const bulanEl = document.getElementById('rekapBulanGuru');
    const tahunEl = document.getElementById('rekapTahunGuru');
    const kelasEl = document.getElementById('rekapKelasGuru');
    if (!bulanEl || !tahunEl || bulanEl.value === '') return;
    const bulan = bulanEl.value;
    const tahun = tahunEl.value;
    const kelas = kelasEl ? kelasEl.value : '';
    tbody.innerHTML = '<tr><td colspan="40" class="p-8 text-center"><i class="fas fa-circle-notch fa-spin mr-2"></i>Mengambil data...</td></tr>';
    siakadRun
    .withFailureHandler(err => {
        tbody.innerHTML = `<tr><td colspan="40" class="p-8 text-center text-red-500"><i class="fas fa-times-circle mr-2"></i>Gagal mengambil data: ${err.message || err}</td></tr>`;
    })
    .withSuccessHandler(res => {
        if (!res.success) {
            tbody.innerHTML = `<tr><td colspan="40" class="p-4 text-center text-red-500">${res.message}</td></tr>`;
            return;
        }
        renderRekapBulananGuruTable(res.data);
    }).getMonthlyReportData(currentUser ? currentUser.token : '', parseInt(bulan) + 1, parseInt(tahun), kelas, '', kelas);
}
function renderRekapBulananGuruTable(data) {
    const thead = document.getElementById('thead-rekap-bulanan-guru');
    const tbody = document.getElementById('tbody-rekap-bulanan-guru');
    if (!thead || !tbody) return;
    // Tabel guru memakai filter MILIKNYA (kelas/bulan/tahun tab guru) —
    // tidak lagi membaca dropdown mapel milik tab siswa.
    let teachers = data.teachers || [];
    const daysInMonth = data.daysInMonth;
    const sampleDaily = teachers.length > 0 ? teachers[0].dailyCodes : [];
    let headerHTML = '<th class="p-3 w-12 min-w-[48px] max-w-[48px] text-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 sticky left-0 z-20 border-r border-gray-200 dark:border-gray-700">No</th>';
    headerHTML += '<th class="p-3 w-40 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 sticky left-[48px] z-20 border-r border-gray-200 dark:border-gray-700">Nama Guru</th>';
    headerHTML += '<th class="p-3 w-28 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">Mapel</th>';
    for (let d = 1; d <= daysInMonth; d++) {
        const dayInfo   = sampleDaily[d - 1];
        const isHoliday = dayInfo ? dayInfo.isHoliday : false;
        const hClass    = isHoliday
            ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 border-red-100 dark:border-red-500/30 font-bold'
            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
        headerHTML += `<th class="p-1 w-8 text-center border-l ${hClass} text-[10px]">${d}</th>`;
    }
    headerHTML += '<th class="p-2 w-8 text-center bg-[#e8ecf4] dark:bg-blue-500/20 text-[#152238] dark:text-blue-300 border-l border-gray-200 dark:border-gray-700">H</th>';
    headerHTML += '<th class="p-2 w-8 text-center bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-l border-gray-200 dark:border-gray-700">S</th>';
    headerHTML += '<th class="p-2 w-8 text-center bg-[#e8ecf4] dark:bg-blue-500/20 text-[#152238] dark:text-blue-300 border-l border-gray-200 dark:border-gray-700">I</th>';
    headerHTML += '<th class="p-2 w-8 text-center bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-l border-gray-200 dark:border-gray-700">A</th>';
    headerHTML += '<th class="p-2 w-12 text-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700">%</th>';
    thead.innerHTML = headerHTML;
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="40" class="p-8 text-center text-gray-400">Tidak ada data guru.</td></tr>';
        return;
    }
    const isAdminOnly = currentUser && currentUser.role === 'admin';
    const _bulanGuruEl = document.getElementById('rekapBulanGuru') || document.getElementById('rekapBulan');
    const _tahunGuruEl = document.getElementById('rekapTahunGuru') || document.getElementById('rekapTahun');
    const rekapBulanVal  = String(parseInt(_bulanGuruEl.value) + 1).padStart(2, '0');
    const rekapTahunVal  = _tahunGuruEl.value;
    let rowsHTML = '';
    teachers.forEach((guru, idx) => {
        let dailyCells = '';
        guru.dailyCodes.forEach(day => {
            // Kolom tanggal yang guru ybs TIDAK ada jadwal mengajar (bukan hari
            // ajarnya) otomatis "dimatikan": abu-abu, tidak bisa edit/hapus/isi
            // Hadir. isTeachingDay === false artinya server sudah pastikan hari
            // itu bukan hari mengajarnya. undefined = jadwal tak ditemukan →
            // tidak dibatasi (biar menu tidak mati total kalau data jadwal kosong).
            const tanpaJadwalRk = day.isTeachingDay === false;
            let colorClass = '';
            let bgClass    = '';
            if (day.isHoliday) { bgClass = 'bg-red-50 dark:bg-red-500/10'; colorClass = 'text-red-300 dark:text-red-300/60'; }
            else if (tanpaJadwalRk) { bgClass = 'bg-gray-100 dark:bg-gray-700/40'; colorClass = 'text-gray-300 dark:text-gray-600'; }
            else if (day.code === 'H') { colorClass = 'text-[#1b2a4a] dark:text-blue-300 font-bold'; bgClass = 'bg-[#e8ecf4] dark:bg-blue-500/20'; }
            else if (day.code === 'S') { colorClass = 'text-yellow-600 dark:text-yellow-300 font-bold'; bgClass = 'bg-yellow-50 dark:bg-yellow-500/20'; }
            else if (day.code === 'I') { colorClass = 'text-[#1b2a4a] dark:text-blue-300 font-bold'; bgClass = 'bg-[#e8ecf4] dark:bg-blue-500/20'; }
            else if (day.code === 'A') { colorClass = 'text-red-600 dark:text-red-300 font-bold'; bgClass = 'bg-red-50 dark:bg-red-500/20'; }
            const bisa_aksi = isAdminOnly && !day.isHoliday && !tanpaJadwalRk;
            const tglSel = `${rekapTahunVal}-${rekapBulanVal}-${String(day.date).padStart(2,'0')}`;
            const codeToStatus = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
            const statusPenuh = codeToStatus[day.code] || day.code || '';
            const mapelAttr = guru.mapel || '';
            const hasEntry = ['H','S','I','A'].includes(day.code);
            const editBtn = bisa_aksi ? `<button onclick="editStatusRekapGuru('${_rkEscJs(guru.nip)}','${_rkEscJs(guru.nama)}','${_rkEscJs(tglSel)}','${_rkEscJs(mapelAttr)}','${_rkEscJs(statusPenuh)}')" class="text-blue-500 hover:text-[#152238] transition" title="Edit / Input status"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` : '';
            const delBtn = (bisa_aksi && hasEntry) ? `<button onclick="hapusAbsensiRekapGuru('${_rkEscJs(guru.nip)}','${_rkEscJs(guru.nama)}','${_rkEscJs(tglSel)}','${_rkEscJs(mapelAttr)}')" class="text-red-400 hover:text-red-600 transition" title="Hapus entri"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : '';
            const aksiBtn = (editBtn || delBtn) ? `<span class="hidden group-hover:inline-flex gap-0.5 ml-0.5 z-10">${editBtn}${delBtn}</span>` : '';
            const cellTitleRk = tanpaJadwalRk ? 'title="Tidak ada jadwal mengajar hari ini"' : '';
            dailyCells += `<td class="p-1 text-center text-[10px] border-l border-gray-100 ${colorClass} ${bgClass} relative" ${cellTitleRk}>${tanpaJadwalRk ? '—' : (day.code || '')}${aksiBtn}</td>`;
        });
        const s = guru.stats;
        const pColor = s.percent < 70 ? 'text-red-600 dark:text-red-400' : (s.percent < 90 ? 'text-yellow-600 dark:text-yellow-400' : 'text-[#1b2a4a] dark:text-blue-300');
        rowsHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 group transition-colors">
                <td class="p-3 text-center text-gray-500 dark:text-gray-400 text-xs sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-10 border-r border-gray-100 dark:border-gray-700 min-w-[48px] max-w-[48px]">${idx + 1}</td>
                <td class="p-3 font-bold text-gray-700 dark:text-gray-200 text-xs sticky left-[48px] bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-10 border-r border-gray-100 dark:border-gray-700 truncate max-w-[150px]" title="${guru.nama}">
                    ${guru.nama}
                    <div class="text-[10px] font-normal text-gray-400">${guru.nip || '-'}</div>
                </td>
                <td class="p-2 text-xs text-gray-500">${guru.mapel || '(mapel belum diisi)'}</td>
                ${dailyCells}
                <td class="p-2 text-center text-xs font-bold text-[#152238] dark:text-blue-300 bg-[#e8ecf4]/30 dark:bg-blue-500/10 border-l border-gray-100 dark:border-gray-700">${s.h}</td>
                <td class="p-2 text-center text-xs font-bold text-yellow-700 dark:text-yellow-300 bg-yellow-50/30 dark:bg-yellow-500/10 border-l border-gray-100 dark:border-gray-700">${s.s}</td>
                <td class="p-2 text-center text-xs font-bold text-[#152238] dark:text-blue-300 bg-[#e8ecf4]/30 dark:bg-blue-500/10 border-l border-gray-100 dark:border-gray-700">${s.i}</td>
                <td class="p-2 text-center text-xs font-bold text-red-700 dark:text-red-300 bg-red-50/30 dark:bg-red-500/10 border-l border-gray-100 dark:border-gray-700">${s.a}</td>
                <td class="p-2 text-center text-xs font-bold ${pColor} bg-gray-50 dark:bg-gray-700/50 border-l border-gray-100 dark:border-gray-700">${s.percent}%</td>
            </tr>`;
    });
    tbody.innerHTML = rowsHTML;
}
function editStatusRekapGuru(nip, nama, tanggal, mapel, statusSaat) {
    const mapelLabel = mapel ? ` <b>(${mapel})</b>` : '';
    const colorMap = {
        Hadir: 'bg-[#1b2a4a] text-white border-[#1b2a4a]',
        Sakit: 'bg-yellow-400 text-white border-yellow-400',
        Izin:  'bg-blue-500 text-white border-blue-500',
        Alpa:  'bg-red-500 text-white border-red-500'
    };
    let selectedStatus = statusSaat;
    const _btnClsRkG = (active, val) => `swal-status-btn w-full px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition ${
        active ? colorMap[val] : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
    }`;
    Swal.fire({
        title: 'Edit Status Kehadiran Guru',
        width: 420,
        customClass: { popup: 'edit-status-popup' },
        html: `
            <div class="text-left bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 mb-3">
                <div class="text-sm font-bold text-gray-800 break-words leading-snug">${nama}</div>
                <div class="text-[11px] text-gray-500 mt-1 break-words">${tanggal}${mapelLabel}</div>
            </div>
            <div class="grid grid-cols-2 gap-2" id="swal-status-btns">
              ${['Hadir','Sakit','Izin','Alpa'].map(s => `
                <button type="button" data-val="${s}" class="${_btnClsRkG(s === statusSaat, s)}">${s}</button>`).join('')}
            </div>`,
        showConfirmButton: true,
        confirmButtonText: 'Simpan',
        confirmButtonColor: '#2563eb',
        showCancelButton: true,
        cancelButtonText: 'Batal',
        didOpen: () => {
            // Kunci scroll latar belakang selama dialog terbuka
            document.body.style.overflowX = 'hidden';
            document.querySelectorAll('.swal-status-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectedStatus = btn.dataset.val;
                    document.querySelectorAll('.swal-status-btn').forEach(b => {
                        b.className = _btnClsRkG(b.dataset.val === selectedStatus, b.dataset.val);
                    });
                });
            });
        },
        willClose: () => { document.body.style.overflowX = ''; },
        preConfirm: () => selectedStatus
    }).then(result => {
        if (!result.isConfirmed) return;
        const newStatus = result.value;
        if (!newStatus) return;
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                if (res.success) {
                    Swal.fire({ icon: 'success', title: 'Tersimpan!', text: res.message, timer: 1500, showConfirmButton: false });
                    loadDataRekapBulananGuru();
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
                }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                Swal.fire({ icon: 'error', title: 'Error Server', text: err.toString() });
            })
            .updateAbsensiGuruEntryByDate(currentUser.token, nip, nama, tanggal, mapel, newStatus);
    });
}
function hapusAbsensiRekapGuru(nip, nama, tanggal, mapel) {
    const mapelLabel = mapel ? ` (${mapel})` : '';
    Swal.fire({
        title: 'Hapus Data Absensi Guru?',
        html: `Entri absensi <b>${nama}</b><br>Tanggal: <b>${tanggal}</b>${mapelLabel}<br><br><span class="text-red-500 text-xs font-semibold">Data akan dihapus permanen dari sheet absensi_guru.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Batal',
        confirmButtonText: 'Ya, Hapus'
    }).then(result => {
        if (!result.isConfirmed) return;
        showLoading();
        siakadRun
            .withSuccessHandler(function(res) {
                hideLoading();
                if (res.success) {
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: res.message, timer: 1800, showConfirmButton: false });
                    loadDataRekapBulananGuru();
                } else {
                    Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
                }
            })
            .withFailureHandler(function(err) {
                hideLoading();
                Swal.fire({ icon: 'error', title: 'Error Server', text: err.toString() });
            })
            .deleteAbsensiGuruEntry(currentUser.token, nip, tanggal, mapel);
    });
}
function renderRekapTable(result) {
    if (!result.success) {
        document.getElementById('tbody-rekap-bulanan').innerHTML = `<tr><td colspan="100%" class="p-8 text-center text-red-500">${result.message}</td></tr>`;
        return;
    }
    const { daysInMonth, students } = result.data;
    const thead = document.getElementById('thead-rekap-bulanan');
    const tbody = document.getElementById('tbody-rekap-bulanan');
    let headerHtml = `
        <th class="p-3 w-10 sticky left-0 bg-gray-100 z-20 border-r border-gray-200">No</th>
        <th class="p-3 w-64 sticky left-10 bg-gray-100 z-20 border-r border-gray-200 shadow-sm">Nama Siswa</th>
    `;
    const sampleDaily = students.length > 0 ? students[0].dailyCodes : [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dayInfo = sampleDaily[d-1]; 
        const isHoliday = dayInfo ? dayInfo.isHoliday : false;
        const headerClass = isHoliday 
            ? "bg-red-50 text-red-600 border-red-100 font-bold" 
            : "bg-gray-50 text-gray-600 border-gray-200";
        headerHtml += `<th class="p-1 w-8 text-center border-l ${headerClass} text-[10px]">${d}</th>`;
    }
    headerHtml += `
        <th class="p-2 w-10 text-center bg-[#e8ecf4] text-[#152238] border-l-2 border-gray-200">H</th>
        <th class="p-2 w-10 text-center bg-yellow-50 text-yellow-700">S</th>
        <th class="p-2 w-10 text-center bg-[#e8ecf4] text-[#152238]">I</th>
        <th class="p-2 w-10 text-center bg-red-50 text-red-700">A</th>
        <th class="p-2 w-16 text-center bg-[#e8ecf4] text-[#152238] font-bold">%</th>
    `;
    thead.innerHTML = headerHtml;
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100%" class="p-8 text-center text-gray-400">Tidak ada data siswa.</td></tr>';
        return;
    }
    let bodyHtml = '';
    students.forEach((siswa, index) => {
        let dailyCells = '';
        siswa.dailyCodes.forEach(day => {
            let bgClass = '';
            let textClass = 'text-gray-400';
            let content = day.code;
            if (day.isHoliday) {
                bgClass = 'bg-red-50 pattern-grid-lg'; 
                textClass = 'text-red-300 select-none'; 
                content = ''; 
            } else {
                if (day.code === 'H') { 
                    bgClass = 'bg-[#d0d8e8]'; 
                    textClass = 'text-[#152238] font-bold'; 
                }
                else if (day.code === 'S') { 
                    bgClass = 'bg-yellow-100'; 
                    textClass = 'text-yellow-700 font-bold'; 
                }
                else if (day.code === 'I') { 
                    bgClass = 'bg-[#d0d8e8]'; 
                    textClass = 'text-[#152238] font-bold'; 
                }
                else if (day.code === 'A') { 
                    bgClass = 'bg-red-100'; 
                    textClass = 'text-red-600 font-bold'; 
                }
                else { 
                    content = '-'; 
                }
            }
            const borderClass = day.isHoliday ? 'border-red-50' : 'border-gray-100';
            dailyCells += `<td class="p-1 text-center border ${borderClass} ${bgClass} ${textClass} text-[10px]">${content}</td>`;
        });
        const stats = siswa.stats;
        const percentColor = stats.percent < 70 ? 'text-red-600' : (stats.percent < 90 ? 'text-yellow-600' : 'text-[#1b2a4a]');
        bodyHtml += `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50">
                <td class="p-2 text-center border-r border-gray-200 sticky left-0 bg-white z-10 font-medium text-gray-500">${index + 1}</td>
                <td class="p-2 border-r border-gray-200 sticky left-10 bg-white z-10 shadow-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title="${siswa.nama}">
                    <div class="font-bold text-gray-700 text-xs">${siswa.nama}</div>
                    <div class="text-[10px] text-gray-400">${siswa.nisn}</div>
                </td>
                ${dailyCells}
                <td class="p-1 text-center font-bold text-[#1b2a4a] bg-[#e8ecf4]/30 border-l-2 border-gray-100">${stats.h}</td>
                <td class="p-1 text-center font-bold text-yellow-600 bg-yellow-50/30">${stats.s}</td>
                <td class="p-1 text-center font-bold text-[#1b2a4a] bg-[#e8ecf4]/30">${stats.i}</td>
                <td class="p-1 text-center font-bold text-red-600 bg-red-50/30">${stats.a}</td>
                <td class="p-1 text-center font-bold ${percentColor} bg-[#e8ecf4] border-l border-gray-200">${stats.percent}%</td>
            </tr>
        `;
    });
    tbody.innerHTML = bodyHtml;
}
async function exportRekapBulananExcel() {
    await ensureLib('xlsx');
    const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];
    // Export mengikuti filter TAB YANG SEDANG AKTIF (siswa / guru punya filter sendiri)
    const panelGuruX  = document.getElementById('panelRekapBulananGuru');
    const diTabGuruX  = panelGuruX && !panelGuruX.classList.contains('hidden');
    // Spinner/loading tampil di tombol Export milik tab yang diklik
    const btn = document.getElementById(diTabGuruX ? 'btnExportRekapGuru' : 'btnExportRekap') ||
                document.getElementById('btnExportRekap');
    const originalContent = btn.innerHTML;
    const sufTabX     = diTabGuruX ? 'Guru' : '';
    const bulanElEx   = document.getElementById('rekapBulan' + sufTabX);
    const tahunElEx   = document.getElementById('rekapTahun' + sufTabX);
    const kelasElEx   = document.getElementById('rekapKelas' + sufTabX);
    const bulanVal    = parseInt(bulanElEx ? bulanElEx.value : 0);
    const tahun       = tahunElEx ? tahunElEx.value : '';
    let kelas         = kelasElEx ? kelasElEx.value : '';
    if ((currentUser.role === 'guru' || currentUser.role === 'walikelas') && currentUser.kelas) {
        kelas = currentUser.kelas;
    }
    const namaBulan = NAMA_BULAN[bulanVal] || (bulanVal + 1);

    if (typeof XLSX === 'undefined') {
        showAlert('error', 'Library Excel (SheetJS) belum termuat. Coba refresh halaman.');
        return;
    }

    const theadSiswa = document.getElementById('thead-rekap-bulanan');
    const tbodySiswa = document.getElementById('tbody-rekap-bulanan');
    const theadGuru  = document.getElementById('thead-rekap-bulanan-guru');
    const tbodyGuru  = document.getElementById('tbody-rekap-bulanan-guru');

    const adaSiswaEx = theadSiswa && tbodySiswa && tbodySiswa.querySelectorAll('tr').length > 0;
    const adaGuruEx  = theadGuru && tbodyGuru && tbodyGuru.querySelectorAll('tr').length > 0 &&
                       !tbodyGuru.querySelector('.fa-circle-notch');

    if (!adaSiswaEx && !adaGuruEx) {
        showAlert('error', 'Tidak ada data untuk diekspor. Klik Tampilkan terlebih dahulu.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memproses...';

    try {
        const wb = XLSX.utils.book_new();

        // ---- Sheet Siswa ----
        if (adaSiswaEx) {
        const siswaAoA = [];
        siswaAoA.push(['REKAP ABSENSI SISWA - ' + (kelas ? kelas.toUpperCase() + ' - ' : '') + namaBulan + ' ' + tahun]);
        siswaAoA.push([]);

        const headerRow = [];
        theadSiswa.querySelectorAll('th').forEach(function(th) {
            headerRow.push(th.innerText.trim());
        });
        siswaAoA.push(headerRow);

        tbodySiswa.querySelectorAll('tr').forEach(function(tr) {
            const cells = tr.querySelectorAll('td');
            if (cells.length < 3) return;
            const row = [];
            cells.forEach(function(td) {
                const clone = td.cloneNode(true);
                clone.querySelectorAll('button, svg, span.hidden').forEach(function(el) { el.remove(); });
                row.push(clone.innerText.trim());
            });
            siswaAoA.push(row);
        });

        const wsSiswa = XLSX.utils.aoa_to_sheet(siswaAoA);
        wsSiswa['!cols'] = headerRow.map(function(h, i) {
            if (i === 0) return { wch: 5 };
            if (i === 1) return { wch: 25 };
            if (i > 1 && i <= headerRow.length - 6) return { wch: 4 };
            return { wch: 6 };
        });
        XLSX.utils.book_append_sheet(wb, wsSiswa, 'Rekap Siswa');
        }

        // ---- Sheet Guru (jika ada) ----
        if (adaGuruEx) {
            const guruAoA = [];
            guruAoA.push(['REKAP ABSENSI GURU - ' + namaBulan + ' ' + tahun]);
            guruAoA.push([]);
            const headerGuruRow = [];
            theadGuru.querySelectorAll('th').forEach(function(th) {
                headerGuruRow.push(th.innerText.trim());
            });
            guruAoA.push(headerGuruRow);
            tbodyGuru.querySelectorAll('tr').forEach(function(tr) {
                const cells = tr.querySelectorAll('td');
                if (cells.length < 3) return;
                const row = [];
                cells.forEach(function(td) {
                    const clone = td.cloneNode(true);
                    clone.querySelectorAll('button, svg, span.hidden').forEach(function(el) { el.remove(); });
                    row.push(clone.innerText.trim());
                });
                guruAoA.push(row);
            });
            const wsGuru = XLSX.utils.aoa_to_sheet(guruAoA);
            wsGuru['!cols'] = headerGuruRow.map(function(h, i) {
                if (i === 0) return { wch: 5 };
                if (i === 1) return { wch: 25 };
                if (i > 1 && i <= headerGuruRow.length - 6) return { wch: 4 };
                return { wch: 6 };
            });
            XLSX.utils.book_append_sheet(wb, wsGuru, 'Rekap Guru');
        }

        const namaFile = 'Rekap_Bulanan_' + (kelas ? kelas + '_' : '') + namaBulan + '_' + tahun + '.xlsx';
        XLSX.writeFile(wb, namaFile);
        btn.disabled = false;
        btn.innerHTML = originalContent;
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        console.error('Export error:', e);
        showAlert('error', 'Gagal mengekspor: ' + e.message);
    }
}