// data-master/guru.js
// Sub-modul Data Master: Akun Guru (kelola akses login guru & wali kelas).
// Dipecah dari assets/js/menu/data-master.js -- butuh core.js dimuat lebih dulu.

function loadDataGuru() {
        stopAndBack(false);
        setActiveMenu('User');
        showView('view-data-guru');
        // Jangan reset pilihan saat render/menu dipanggil ulang; pilihan harus stabil selama sesi.
        updateBulkDeleteUI('guru');
        const checkAllGuruEl = document.getElementById('checkAllGuru');
        if (checkAllGuruEl) checkAllGuruEl.checked = false;
        // Reset role filter UI ke "Semua Role" saat menu dibuka ulang
        const roleDropdown = document.getElementById('filterRoleGuru');
        if (roleDropdown && !tableState.guru.roleFilter) {
            roleDropdown.value = '';
        }
        if (tableState.guru.fullData.length > 0) {
            processTableData('guru');
        } else {
            document.getElementById('tbody-guru').innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat data guru...</td></tr>';
            const token = currentUser.token;
            siakadRun.withSuccessHandler(result => {
                if (result.success) {
                    tableState.guru.fullData = result.data;
                    processTableData('guru');
                } else {
                    document.getElementById('tbody-guru').innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500 font-bold"><i class="fas fa-exclamation-triangle mr-2"></i>${result.message}</td></tr>`;
                    showAlert('error', result.message);
                }
            })
            .withFailureHandler(error => {
                document.getElementById('tbody-guru').innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500">Gagal koneksi: ${error}</td></tr>`;
            })
            .getGuruList(token); 
        }
    }
function renderGuruRows(data, startIdx) {
    const tbody = document.getElementById('tbody-guru');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">Data tidak ditemukan.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((guru, i) => {
        const kelasBadges = guru.kelas
            ? String(guru.kelas).split(',').map(k => k.trim()).filter(Boolean)
                .map(k => `<span class="bg-[#d0d8e8] text-[#152238] px-2 py-0.5 rounded text-xs font-bold">${k}</span>`)
                .join(' ')
            : '<span class="text-gray-400 italic text-xs">Semua Akses</span>';
        const roleInfo = getRoleBadgeInfo(guru.role);
        const isSelected = selectedGuruIds.has(String(guru.username));
        return `
    <tr class="hover:bg-gray-50 transition border-b border-gray-50 group select-row-target ${isSelected ? 'bg-blue-50/60 selected-row border-l-4 border-l-[#1b2a4a]' : 'border-l-4 border-l-transparent'}" data-id="${guru.username}" data-type="guru">
        <td class="guru-col-checkbox p-1.5 md:p-3 text-center hidden md:table-cell">
            <input type="checkbox" class="chk-guru w-3.5 h-3.5 rounded border-gray-300 cursor-pointer accent-[#1b2a4a]" value="${guru.username}" ${isSelected ? 'checked' : ''} onchange="toggleGuruRow('${guru.username}', this.checked)">
        </td>
        <td class="p-1.5 md:p-3 text-center text-gray-500 text-[10px] md:text-sm">${startIdx + i + 1}</td>
        <td class="p-1.5 md:p-3 font-bold text-xs md:text-sm text-gray-800">
            <div class="flex items-center">
                <div class="relative mr-2 shrink-0 avatar-badge-slot">
                    <div class="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-150 ${isSelected ? 'bg-[#1b2a4a] text-white' : 'bg-[#d0d8e8] text-[#1b2a4a]'}" data-initial="${(guru.username || '?').charAt(0).toUpperCase()}">
                        ${isSelected ? '<i class="fas fa-check text-[10px]"></i>' : (guru.username || '?').charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="min-w-0">
                    <span class="truncate block text-xs">${guru.username}</span>
                </div>
            </div>
        </td>
        <td class="guru-col-role p-1.5 md:p-3 text-xs md:text-sm">
            <span class="px-2 py-1 rounded text-xs font-bold ${roleInfo.color}">${roleInfo.label}</span>
        </td>
        <td class="guru-col-walikelas p-1.5 md:p-3 text-xs md:text-sm">
            <div class="flex flex-wrap gap-1">${kelasBadges}</div>
        </td>
        <td class="guru-col-password p-1.5 md:p-3 text-sm text-gray-400 font-mono">&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</td>
        <td class="p-1.5 md:p-3 text-center">
            <div class="flex justify-center space-x-2 opacity-80 group-hover:opacity-100">
                ${(currentUser.role === 'admin') ? `<button onclick='editGuru(${safeJsonAttr(guru)})' class="btn-aksi-tabel aksi-edit text-[10px] md:text-xs" title="Edit Akun"><i class="fas fa-edit"></i></button>` : ''}
            </div>
        </td>
    </tr>`}).join('');
    updateSelectAllHeaderState('guru');
}
    function showAddGuruModal() { showModal(createGuruModal(), 'max-w-md'); initGuruMengajarRows(null); }
    function editGuru(guruData) { showModal(createGuruModal(guruData), 'max-w-md'); initGuruMengajarRows(guruData); }

    // Muat opsi kelas/mapel + penugasan yang sudah ada ke dalam modal Tambah/Edit User
    function initGuruMengajarRows(guru) {
        Promise.all([
            new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve([])).getDaftarKelas()),
            new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve([])).getDaftarMapel())
        ]).then(([kelasList, mapelList]) => {
            window._mengajarKelasOptions = kelasList || [];
            window._mengajarMapelOptions = mapelList || [];
            const container = document.getElementById('guruMengajarRows');
            if (!container) return;
            container.innerHTML = '';
            const nipKey = (guru && (guru.nip || guru.username)) || '';
            if (nipKey) {
                siakadRun
                    .withSuccessHandler(res => {
                        const rows = (res && res.success && Array.isArray(res.data)) ? res.data : [];
                        if (!document.getElementById('guruMengajarRows')) return;
                        if (rows.length === 0) addMengajarRow('', '', 'guruMengajarRows');
                        else rows.forEach(r => addMengajarRow(r.kelas, r.mata_pelajaran, 'guruMengajarRows'));
                    })
                    .withFailureHandler(() => { if (document.getElementById('guruMengajarRows')) addMengajarRow('', '', 'guruMengajarRows'); })
                    .getGuruMengajarList(currentUser ? currentUser.token : null, nipKey);
            } else {
                addMengajarRow('', '', 'guruMengajarRows');
            }
        });
    }
    function createGuruModal(guru = null) {
        const isEdit = guru !== null;
        const inputClass = "w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 transition-all mb-4";
        const currentKelasWali = guru?.kelasWali || guru?.kelas_wali || '';
        let kelasWaliOptions = '<option value="">- Bukan Wali Kelas -</option>';
        if (existingClasses && existingClasses.length > 0) {
            kelasWaliOptions += existingClasses.map(k =>
                `<option value="${k}" ${currentKelasWali === k ? 'selected' : ''}>${k}</option>`
            ).join('');
        }
        const currentRole = guru?.role || 'guru';
        const roleOptions = [
            { value: 'guru',      label: 'Guru Pengajar' },
            { value: 'walikelas', label: 'Wali Kelas' },
            { value: 'kepsek',    label: 'Kepala Madrasah' },
            { value: 'wakel',     label: 'Wakil Kepala Madrasah' },
            { value: 'pencatat',  label: 'Pencatat Barang & Prestasi' },
            { value: 'bendahara', label: 'Bendahara' },
            { value: 'siswa',     label: 'Siswa' },
            { value: 'alumni',    label: 'Alumni' }
        ].map(r => `<option value="${r.value}" ${currentRole === r.value ? 'selected' : ''}>${r.label}</option>`).join('');
        return `
        <div style="display:flex;flex-direction:column;max-height:85vh;">
            <!-- Header (tetap di atas, tidak ikut scroll) -->
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 bg-[#d0d8e8] text-[#1b2a4a] rounded-xl flex items-center justify-center text-base shadow-sm"><i class="fas fa-chalkboard-teacher"></i></div>
                    <h3 class="font-bold text-base text-gray-800">${isEdit ? 'Edit User' : 'Tambah User'}</h3>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition shrink-0"><i class="fas fa-times text-sm"></i></button>
            </div>
            <form onsubmit="saveGuru(event, ${isEdit})" style="display:flex;flex-direction:column;min-height:0;" class="flex-1">
                <!-- Area isian (satu-satunya yang scroll) -->
                <div class="px-6 py-4 space-y-3 overflow-y-auto flex-1" style="min-height:0;">
                <!-- Role -->
                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Role</label>
                    <select name="role" id="roleGuruSelect" onchange="toggleWaliKelasSection(this.value)"
                        class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 transition-all">
                        ${roleOptions}
                    </select>
                    <p class="text-[10px] text-gray-400 mt-1">"Wali Kelas" tetap bisa sekaligus mengajar mapel di kelas lain — atur lewat "Kelola Kelas & Mapel" di bawah.</p>
                </div>
                <!-- Username & Password (2 kolom) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Username</label>
                        <input name="username" value="${guru?.username || ''}" placeholder="Otomatis dari NIP"
                            class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 transition-all">
                    </div>
                    <div>
                        <label class="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
                        <input name="password" value="${guru?.password || ''}" placeholder="Otomatis dari NIP"
                            class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 transition-all">
                    </div>
                </div>
                <!-- NIP -->
                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide">NIP/NUPTK <span class="normal-case font-normal text-gray-400">(opsional)</span></label>
                    <input name="nip" value="${guru?.nip || ''}" placeholder="Kosongkan jika akun bersama"
                        class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 transition-all">
                    <p class="text-[10px] text-gray-400 mt-1">Jika diisi, Username &amp; Password yang dikosongkan otomatis memakai NIP.</p>
                </div>
                <!-- Wali Kelas (homeroom) -->
                <div id="waliKelasSection" class="${currentRole === 'walikelas' ? '' : 'hidden'}">
                    <label class="block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Kelas yang Diwalikan</label>
                    <select name="kelasWali" class="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 transition-all">
                        ${kelasWaliOptions}
                    </select>
                </div>
                <!-- Kelas & Mapel yang diajar (WAJIB untuk Guru Pengajar) -->
                <div class="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <label class="block mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">Kelas &amp; Mapel yang Diampu <span class="normal-case font-normal text-gray-400">(wajib untuk Guru Pengajar)</span></label>
                    <div id="guruMengajarRows" class="space-y-2 mb-2"></div>
                    <button type="button" onclick="addMengajarRow('', '', 'guruMengajarRows')" class="w-full border border-dashed border-blue-300 bg-white/60 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-white transition">
                        <i class="fas fa-plus mr-1"></i> Tambah Kelas + Mapel
                    </button>
                </div>
                ${isEdit ? `<input type="hidden" name="oldUsername" value="${guru.username}">` : ''}
                </div>
                <!-- Footer tombol (tetap di bawah, tidak ikut scroll) -->
                <div class="shrink-0 flex gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
                    <button type="button" onclick="closeModal()" class="flex-1 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition">Batal</button>
                    <button type="submit" class="flex-1 bg-[#1b2a4a] hover:bg-[#152238] text-white py-2.5 rounded-xl text-sm font-bold shadow transition active:scale-95">Simpan</button>
                </div>
            </form>
        </div>`;
    }
    function toggleWaliKelasSection(role) {
        const section = document.getElementById('waliKelasSection');
        if (!section) return;
        if (role === 'walikelas') {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    }

    // ==========================================
    // KELOLA KELAS & MATA PELAJARAN GURU (multi kelas, multi mapel)
    // ==========================================
    function openMengajarModal(nip, namaGuru) {
        showModal(`
        <div>
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                <div>
                    <h3 class="font-bold text-base text-gray-800">Kelas & Mata Pelajaran</h3>
                    <p class="text-xs text-gray-500">${namaGuru || nip}</p>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"><i class="fas fa-times text-sm"></i></button>
            </div>
            <div class="px-6 py-4">
                <div id="mengajarRows" class="space-y-2 mb-3" style="max-height:320px; overflow-y:auto;">
                    <p class="text-xs text-gray-400 text-center py-4"><i class="fas fa-circle-notch fa-spin mr-1"></i> Memuat data...</p>
                </div>
                <button type="button" onclick="addMengajarRow()" class="w-full border border-dashed border-gray-300 text-gray-500 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition mb-4">
                    <i class="fas fa-plus mr-1"></i> Tambah Baris Kelas + Mapel
                </button>
                <div class="flex gap-2">
                    <button type="button" onclick="closeModal()" class="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition">Batal</button>
                    <button type="button" id="btnSaveMengajar" onclick="saveMengajarRows('${nip}')" class="flex-1 bg-[#1b2a4a] hover:bg-[#152238] text-white py-2.5 rounded-xl text-sm font-bold shadow transition active:scale-95">Simpan</button>
                </div>
            </div>
        </div>`, 'max-w-md');

        // Ambil daftar kelas & mapel master, lalu data assignment yang sudah ada
        Promise.all([
            new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve([])).getDaftarKelas()),
            new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve([])).getDaftarMapel()),
            new Promise(resolve => siakadRun.withSuccessHandler(resolve).withFailureHandler(() => resolve({ data: [] })).getGuruMengajarList(currentUser ? currentUser.token : null, nip))
        ]).then(([kelasList, mapelList, mengajarRes]) => {
            window._mengajarKelasOptions = kelasList || [];
            window._mengajarMapelOptions = mapelList || [];
            const rows = (mengajarRes && mengajarRes.data) ? mengajarRes.data : [];
            const container = document.getElementById('mengajarRows');
            if (!container) return;
            container.innerHTML = '';
            if (rows.length === 0) {
                addMengajarRow();
            } else {
                rows.forEach(r => addMengajarRow(r.kelas, r.mata_pelajaran));
            }
        });
    }

    function addMengajarRow(selectedKelas = '', selectedMapel = '', containerId = 'mengajarRows') {
        const container = document.getElementById(containerId);
        if (!container) return;
        const kelasOpts = (window._mengajarKelasOptions || []).map(k =>
            `<option value="${k}" ${k === selectedKelas ? 'selected' : ''}>${k}</option>`).join('');
        const rowId = 'mrow_' + Math.random().toString(36).slice(2, 9);
        const row = document.createElement('div');
        row.id = rowId;
        row.className = 'flex gap-2 items-center';
        row.innerHTML = `
            <select class="mengajar-kelas flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg p-2">
                <option value="">- Pilih Kelas -</option>
                ${kelasOpts}
            </select>
            <div class="flex-1 relative min-w-0">
                <input type="text" class="mengajar-mapel w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg p-2 pr-6"
                    placeholder="Ketik atau pilih mapel..." autocomplete="off" value="${selectedMapel}">
                <i class="fas fa-chevron-down text-[9px] text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-400 hover:text-red-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition">
                <i class="fas fa-trash-alt text-xs"></i>
            </button>`;
        container.appendChild(row);
        // Dropdown mapel dibuat mengambang (position:fixed, appended ke <body>)
        // lewat setupMapelCombobox di core.js, supaya tidak ikut kepotong oleh
        // overflow-y:auto di container baris / body modal.
        setupMapelCombobox(row.querySelector('.mengajar-mapel'), () => window._mengajarMapelOptions || []);
    }

    // Sinkron mapel yang diketik manual (belum ada di daftar) ke mapel_master
    // lewat endpoint addMapel, supaya mapel baru langsung tersimpan sebagai
    // data master (bukan cuma tersimpan di penugasan guru ini saja).
    // mengajarList: array of { kelas, mata_pelajaran }
    function syncMapelBaruKeMaster(mengajarList) {
        const known = (window._mengajarMapelOptions || []).map(m => m.toLowerCase());
        const baru = [];
        (mengajarList || []).forEach(item => {
            const nama = (item.mata_pelajaran || '').trim();
            if (nama && !known.includes(nama.toLowerCase()) && !baru.some(b => b.toLowerCase() === nama.toLowerCase())) {
                baru.push(nama);
            }
        });
        if (baru.length === 0) return Promise.resolve();
        return Promise.all(baru.map(nama => new Promise(resolve => {
            siakadRun.withSuccessHandler(() => resolve()).withFailureHandler(() => resolve()).addMapel(nama);
        }))).then(() => {
            window._mengajarMapelOptions = [...(window._mengajarMapelOptions || []), ...baru].sort();
            if (typeof invalidateNilaiMapelCache === 'function') invalidateNilaiMapelCache();
        });
    }

    function saveMengajarRows(nip) {
        const container = document.getElementById('mengajarRows');
        const btn = document.getElementById('btnSaveMengajar');
        if (!container) return;
        const assignments = [];
        container.querySelectorAll('.mengajar-kelas').forEach(sel => {
            const row = sel.closest('div');
            const kelas = sel.value;
            const mapel = row.querySelector('.mengajar-mapel')?.value || '';
            if (kelas && mapel) assignments.push({ kelas: kelas, mata_pelajaran: mapel });
        });
        if (assignments.length === 0) {
            showAlert('error', 'Isi minimal satu baris kelas + mata pelajaran, atau hapus semua baris kosong.');
            return;
        }
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Menyimpan...'; }
        syncMapelBaruKeMaster(assignments).then(() => {
            siakadRun
                .withSuccessHandler(r => {
                    if (r && r.success) {
                        closeModal();
                        tableState.guru.fullData = [];
                        if (typeof loadDataGuru === 'function') loadDataGuru();
                        showAlert('success', 'Kelas & mata pelajaran guru berhasil disimpan');
                    } else {
                        if (btn) { btn.disabled = false; btn.innerHTML = 'Simpan'; }
                        showAlert('error', r ? r.message : 'Gagal menyimpan');
                    }
                })
                .withFailureHandler(err => {
                    if (btn) { btn.disabled = false; btn.innerHTML = 'Simpan'; }
                    showAlert('error', 'Gagal koneksi server: ' + err);
                })
                .setGuruMengajarList(currentUser ? currentUser.token : null, nip, assignments);
        });
    }

function saveGuru(e, isEdit) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML; 
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Menyimpan...';
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    const fd = new FormData(form);
    const username = fd.get('username'); 
    const password = fd.get('password');
    const nip = fd.get('nip') || '';
    const role = fd.get('role') || 'guru';
    const kelasWali = role === 'walikelas' ? (fd.get('kelasWali') || '') : '';
    const token = currentUser ? currentUser.token : null;

    // Kumpulkan penugasan kelas+mapel — WAJIB untuk role Guru Pengajar
    const mengajar = [];
    document.querySelectorAll('#guruMengajarRows > div').forEach(function (row) {
        const k = (row.querySelector('.mengajar-kelas')?.value || '').trim();
        const m = (row.querySelector('.mengajar-mapel')?.value || '').trim();
        if (k && m) mengajar.push({ kelas: k, mata_pelajaran: m });
    });
    if (role === 'guru' && mengajar.length === 0) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        showAlert('error', 'Akun Guru Pengajar wajib memiliki minimal 1 penugasan Kelas + Mapel. Klik "Tambah Kelas + Mapel" untuk mengisi.');
        return;
    }
    const onComplete = (r) => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (r && r.success) {
            closeModal();
            tableState.guru.fullData = [];
            loadDataGuru();
            showAlert('success', isEdit ? 'Data user berhasil diperbarui' : 'Akun user berhasil dibuat');
        } else {
            showAlert('error', r ? r.message : 'Terjadi kesalahan tidak diketahui');
        }
    };
    const onFailure = (error) => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        showAlert('error', String(error && error.message ? error.message : error).replace(/^Error:\s*/, ''));
    };
    if (isEdit) {
        const oldUsername = fd.get('oldUsername');
        syncMapelBaruKeMaster(mengajar).then(() => {
            siakadRun
                .withSuccessHandler(onComplete)
                .withFailureHandler(onFailure)
                .updateGuru(token, oldUsername, username, password, '', nip, role, kelasWali, mengajar);
        });
    } else {
        syncMapelBaruKeMaster(mengajar).then(() => {
            siakadRun
                .withSuccessHandler(onComplete)
                .withFailureHandler(onFailure)
                .addGuru(token, username, password, '', nip, role, kelasWali, mengajar);
        });
    }
}
    function triggerImportGuru() {
        document.getElementById('fileInputGuru').click();
    }
    async function handleFileImportGuru(input) {
        const file = input.files[0];
        if (!file) return;
        showLoading(); 
        await ensureLib('xlsx');
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
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
            const hasUser = firstRow.hasOwnProperty('Username');
            const hasPass = firstRow.hasOwnProperty('Password');
            if (!hasUser || !hasPass) {
                hideLoading();
                showAlert('error', 'Format Excel salah! Pastikan ada kolom header: Username dan Password.');
                input.value = '';
                return;
            }
            processImportGuru(jsonData, input);
        };
        reader.onerror = function() {
            hideLoading();
            showAlert('error', 'Gagal membaca file.');
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
    function processImportGuru(data, inputElement) {
        const formattedData = data.map(row => {
            const clean = importField;
            return {
                nama: clean(row, ['Nama', 'Nama Guru'], false),
                nip: clean(row, ['NIP', 'Nip'], false),
                username: clean(row, ['Username'], false),
                password: clean(row, ['Password'], false),
                role: clean(row, ['Role', 'role'], false) || 'guru',
                kelas: clean(row, ['Kelas', 'Wali Kelas'], false)
            };
        });
        siakadRun
            .withSuccessHandler(res => {
                hideLoading();
                inputElement.value = ''; 
                if (res.success) {
                    tableState.guru.fullData = []; 
                    loadDataGuru(); 
                    let msg = `Berhasil: ${res.added}, Gagal/Duplikat: ${res.skipped}`;
                    showAlert('success', 'Import Guru Selesai! ' + msg);
                } else {
                    showAlert('error', res.message);
                }
            })
            .withFailureHandler(err => {
                hideLoading();
                inputElement.value = '';
                showAlert('error', 'Error Server: ' + err);
            })
            .importGuruBulk(formattedData);
    }
    function syncGuruRoles() {
        Swal.fire({
            title: 'Sinkronisasi Role Guru?',
            html: `Role akun guru akan disesuaikan otomatis:<br><br>
                   <ul class="text-left text-sm text-gray-700 space-y-1 mx-4">
                     <li><i class="fas fa-chalkboard-teacher text-blue-500 mr-1"></i> <b>Wali Kelas</b> — dari data Manajemen Kelas</li>
                     <li><i class="fas fa-book-open text-green-500 mr-1"></i> <b>Guru Pengajar</b> — dari data Jadwal Pelajaran</li>
                   </ul>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sinkron Sekarang',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#1b2a4a',
            cancelButtonColor: '#6b7280',
            reverseButtons: true
        }).then(res => {
            if (!res.isConfirmed) return;
            showLoading();
            const token = currentUser ? currentUser.token : null;
            siakadRun
                .withSuccessHandler(r => {
                    hideLoading();
                    if (r && r.success) {
                        tableState.guru.fullData = [];
                        loadDataGuru();
                        showAlert('success', 'Sinkronisasi role selesai. Role guru telah diperbarui.');
                    } else {
                        showAlert('error', r ? r.message : 'Sinkronisasi gagal.');
                    }
                })
                .withFailureHandler(err => {
                    hideLoading();
                    showAlert('error', 'Gagal koneksi: ' + err);
                })
                .syncGuruRoles(token);
        });
    }
    function deleteGuruConfirm(username) {
        if (confirm(`Hapus akses untuk guru: ${username}?`)) {
            showLoading(); 
            const token = currentUser ? currentUser.token : null;
            siakadRun.withSuccessHandler(r => {
                hideLoading();
                if (r.success) {
                    tableState.guru.fullData = []; 
                    loadDataGuru();
                    showAlert('success', 'Akun guru berhasil dihapus');
                } else {
                    showAlert('error', r.message);
                }
            })
            .withFailureHandler(error => {
                hideLoading();
                showAlert('error', 'Gagal menghapus: ' + error);
            })
            .deleteGuru(token, username); 
        }
    }