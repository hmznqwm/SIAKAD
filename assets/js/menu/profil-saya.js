/* ============================================================
   profil-saya.js — Menu Profil Saya & Jadwal Mengajar (role guru)
   Desain flat & konsisten dengan halaman tabel lain.
   Dark mode otomatis via remap global di assets/css/style.css.
   ============================================================ */

function _profilSayaInjectViews() {
    const area = document.getElementById('mainContentArea');
    if (!area) return;
    if (!document.getElementById('view-profil-saya')) {
        const div = document.createElement('div');
        div.innerHTML = `<div id="view-profil-saya" class="view-section animate-fade-in hidden"></div>`;
        area.appendChild(div.firstElementChild);
    }
    if (!document.getElementById('view-jadwal-mengajar')) {
        const div = document.createElement('div');
        div.innerHTML = `<div id="view-jadwal-mengajar" class="view-section animate-fade-in hidden"></div>`;
        area.appendChild(div.firstElementChild);
    }
}

function _psRow(icon, label, value) {
    const kosong = (value === null || value === undefined || String(value).trim() === '');
    const v = kosong ? 'Belum diisi' : String(value);
    return `<div class="flex items-center gap-3 px-4 py-3">
        <span class="w-8 h-8 rounded-lg bg-[#e8ecf4] flex items-center justify-center shrink-0"><i class="fas ${icon} text-[#1b2a4a] text-xs"></i></span>
        <div class="min-w-0 flex-1">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">${label}</div>
            <div class="text-sm font-semibold ${kosong ? 'text-gray-300 italic' : 'text-gray-800'} break-words">${v}</div>
        </div>
    </div>`;
}

function _psSection(icon, title, body) {
    return `<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <i class="fas ${icon} text-[#1b2a4a] text-xs w-4 text-center"></i>
            <h3 class="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">${title}</h3>
        </div>
        <div class="divide-y divide-gray-100">${body}</div>
    </div>`;
}

function _psPageHeader(kicker, title, subtitleHtml, btnLabel, btnIcon, btnOnclick) {
    return `<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4 flex items-center gap-4">
        <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${kicker}</p>
            <h2 class="text-base font-bold text-gray-900 tracking-tight truncate mt-0.5">${title}</h2>
            <div class="mt-1.5 text-xs text-gray-500 flex items-center gap-2 flex-wrap">${subtitleHtml}</div>
        </div>
        <button onclick="${btnOnclick}" class="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-[#1b2a4a] text-gray-600 rounded-lg text-xs font-bold transition shrink-0">
            <i class="fas ${btnIcon} text-[#1b2a4a]"></i> ${btnLabel}
        </button>
    </div>`;
}

function _psChip(text) {
    return `<span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#e8ecf4] text-[#152238]">${text}</span>`;
}

function _psLoading(msg) {
    return '<div class="p-10 text-center text-gray-400 dark:text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>' + msg + '</div>';
}
function _psError(msg) {
    return '<div class="p-10 text-center text-red-500 dark:text-red-400">' + msg + '</div>';
}

// ---------- PROFIL SAYA ----------
function loadProfilSaya() {
    stopAndBack(false);
    setActiveMenu('Profil Saya');
    _profilSayaInjectViews();
    showView('view-profil-saya');
    const el = document.getElementById('view-profil-saya');
    el.innerHTML = _psLoading('Memuat profil...');

    const token = currentUser ? currentUser.token : '';
    siakadRun.withSuccessHandler(function(res) {
        if (!res || !res.success) {
            el.innerHTML = _psError((res && res.message) || 'Gagal memuat profil');
            return;
        }
        const d = res.data;
        const initial = (d.nama || '-').charAt(0).toUpperCase();
        let chips = _psChip(d.jabatan || 'Guru');
        if (d.kelasWali) chips += ' ' + _psChip('Wali Kelas ' + d.kelasWali);
        if (d.mapel) chips += ' ' + _psChip(d.mapel);

        let html = `
        <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4 flex items-center gap-4">
                <div class="w-14 h-14 rounded-xl bg-[#e8ecf4] border border-[#d0d8e8] flex items-center justify-center text-xl font-black text-[#1b2a4a] shrink-0">${initial}</div>
                <div class="min-w-0 flex-1">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Profil Saya</p>
                    <h2 class="text-base font-bold text-gray-900 tracking-tight truncate mt-0.5">${d.nama || '-'}</h2>
                    <div class="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span class="text-[11px] font-semibold text-gray-500 font-mono">NIP ${d.nip || '-'}</span>
                        ${chips}
                    </div>
                </div>
                <button onclick="loadJadwalMengajar()" class="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-[#1b2a4a] text-gray-600 rounded-lg text-xs font-bold transition shrink-0">
                    <i class="far fa-calendar text-[#1b2a4a]"></i> Jadwal Mengajar
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${_psSection('fa-briefcase', 'Data Kepegawaian', `
                    ${_psRow('fa-id-card', 'NIP', d.nip)}
                    ${_psRow('fa-user', 'Nama Lengkap', d.nama)}
                    ${_psRow('fa-user-tie', 'Jabatan', d.jabatan)}
                    ${_psRow('fa-stamp', 'Status Kepegawaian', d.statusKepegawaian)}
                    ${_psRow('fa-book', 'Mata Pelajaran', d.mapel)}
                    ${_psRow('fa-users', 'Kelas Wali', d.kelasWali)}
                `)}
                ${_psSection('fa-user-circle', 'Data Pribadi', `
                    ${_psRow('fa-venus-mars', 'Jenis Kelamin', d.jenisKelamin)}
                    ${_psRow('fa-cake-candles', 'Tanggal Lahir', d.tanggalLahir)}
                    ${_psRow('fa-mosque', 'Agama', d.agama)}
                    ${_psRow('fa-location-dot', 'Alamat', d.alamat)}
                `)}
            </div>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                ${_psSection('fa-address-book', 'Kontak', `
                    ${_psRow('fa-phone', 'No. Handphone', d.noHp)}
                    ${_psRow('fa-envelope', 'Email', d.email)}
                `)}
                ${_psSection('fa-shield-halved', 'Akun', `
                    ${_psRow('fa-user-shield', 'Username', d.username)}
                    ${_psRow('fa-tag', 'Role', (d.role || '').toUpperCase())}
                `)}
            </div>
            <div class="mt-4" id="psMengajarWrap"></div>
        </div>`;

        // Penugasan kelas+mapel
        siakadRun.withSuccessHandler(function(res2) {
            const wrap = document.getElementById('psMengajarWrap');
            if (!wrap) return;
            const list = (res2 && res2.success && Array.isArray(res2.data)) ? res2.data : [];
            const rows = list.length
                ? list.map(function(m, i) {
                    return `<tr class="border-b border-gray-100 last:border-0 hover:bg-[#f4f6fb] transition">
                        <td class="px-4 py-2.5 text-xs text-gray-400 w-12">${i + 1}</td>
                        <td class="px-4 py-2.5"><span class="text-xs font-bold bg-[#e8ecf4] text-[#152238] px-2 py-0.5 rounded-md">${m.kelas || 'Belum diisi'}</span></td>
                        <td class="px-4 py-2.5 text-sm font-semibold text-gray-800">${m.mata_pelajaran || '<span class="text-gray-300 italic">Belum diisi</span>'}</td>
                    </tr>`;
                }).join('')
                : '<tr><td colspan="3" class="px-4 py-6 text-center text-sm text-gray-300 italic">Belum ada penugasan mengajar.</td></tr>';
            wrap.innerHTML = _psSection('fa-clipboard-list', 'Penugasan Mengajar', `
                <table class="w-full">
                    <thead><tr class="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100">
                        <th class="px-4 py-2 text-left w-12">No</th>
                        <th class="px-4 py-2 text-left">Kelas</th>
                        <th class="px-4 py-2 text-left">Mata Pelajaran</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `);
        }).withFailureHandler(function() {}).getGuruMengajarList(token, d.nip || d.username || '');
        el.innerHTML = html;
    })
    .withFailureHandler(function(err) {
        el.innerHTML = _psError('Gagal koneksi: ' + err);
    })
    .getProfilSaya(token);
}

// ---------- JADWAL MENGAJAR ----------
function loadJadwalMengajar() {
    stopAndBack(false);
    setActiveMenu('Jadwal Mengajar');
    _profilSayaInjectViews();
    showView('view-jadwal-mengajar');
    const el = document.getElementById('view-jadwal-mengajar');
    el.innerHTML = _psLoading('Memuat jadwal...');

    const token = currentUser ? currentUser.token : '';
    siakadRun.withSuccessHandler(function(res) {
        if (!res || !res.success) {
            el.innerHTML = _psError((res && res.message) || 'Gagal memuat jadwal');
            return;
        }
        const list = res.data || [];
        const hariOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        let hariIni = '';
        try { hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long' }).toLowerCase(); } catch(e) {}
        const byHari = {};
        list.forEach(function(j) {
            const h = j.hari || '-';
            if (!byHari[h]) byHari[h] = [];
            byHari[h].push(j);
        });
        const sub = `<span>Total <b class="text-[#1b2a4a]">${list.length}</b> jam pelajaran per pekan</span>`;
        let html = `<div class="max-w-4xl mx-auto">` +
            _psPageHeader('Agenda', 'Jadwal Mengajar', sub, 'Profil Saya', 'fa-user', 'loadProfilSaya()');

        if (list.length === 0) {
            html += `<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <i class="far fa-calendar-xmark text-3xl block mb-3 text-gray-300"></i>
                <p class="text-sm text-gray-400 font-semibold">Belum ada jadwal mengajar yang terdaftar.</p>
                <p class="text-xs text-gray-400 mt-1">Jadwal diatur oleh admin di menu Manajemen Kelas &amp; Jadwal.</p>
            </div>`;
        } else {
            hariOrder.forEach(function(h) {
                if (!byHari[h]) return;
                const isToday = hariIni === h.toLowerCase();
                const rows = byHari[h].map(function(j) {
                    return `<tr class="hover:bg-[#f4f6fb] transition border-b border-gray-100 last:border-0">
                        <td class="px-4 py-2.5 text-center w-16"><span class="inline-flex w-7 h-7 items-center justify-center rounded-md bg-[#e8ecf4] text-[10px] font-black text-[#152238]">${j.jam_ke || '-'}</span></td>
                        <td class="px-4 py-2.5 text-xs font-mono text-gray-600 whitespace-nowrap">${j.jam_mulai || '-'} - ${j.jam_selesai || '-'}</td>
                        <td class="px-4 py-2.5 text-sm font-semibold text-gray-800">${j.mapel || '-'}</td>
                        <td class="px-4 py-2.5"><span class="px-2 py-0.5 bg-[#e8ecf4] text-[#1b2a4a] rounded-md text-xs font-bold">${j.kelas || '-'}</span></td>
                    </tr>`;
                }).join('');
                html += `<div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
                    <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <i class="far fa-calendar text-[#1b2a4a] text-xs"></i>
                        <h3 class="text-xs font-extrabold text-gray-700 uppercase tracking-wider">${h}</h3>
                        ${isToday ? '<span class="text-[9px] font-extrabold uppercase tracking-wider bg-[#1b2a4a] dark:bg-blue-600 text-white px-2 py-0.5 rounded-full">Hari Ini</span>' : ''}
                        <span class="ml-auto text-[10px] font-bold bg-[#e8ecf4] text-[#152238] px-2 py-0.5 rounded-full">${byHari[h].length} jam</span>
                    </div>
                    <table class="w-full">
                        <thead><tr class="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100">
                            <th class="px-4 py-2 text-center w-16">Jam ke</th>
                            <th class="px-4 py-2 text-left">Waktu</th>
                            <th class="px-4 py-2 text-left">Mata Pelajaran</th>
                            <th class="px-4 py-2 text-left">Kelas</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
            });
        }
        html += '</div>';
        el.innerHTML = html;
    })
    .withFailureHandler(function(err) {
        el.innerHTML = _psError('Gagal koneksi: ' + err);
    })
    .getJadwalMengajarSaya(token);
}
