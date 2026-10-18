// data-master/core.js
// Helper bersama untuk semua sub-modul Data Master (modal generik, escaping, dsb).
// Dipecah dari assets/js/menu/data-master.js -- HARUS dimuat SEBELUM file
// sub-modul lain di folder ini (siswa.js, alumni.js, guru.js, dst),
// karena mereka memanggil showModal/closeModal/_esc/_modalRow/_modalSection/
// safeJsonAttr/getRoleBadgeInfo dari sini.

function showModal(content, widthClass) {
    const container = document.getElementById('modalContainer');
    // Backdrop dan modal content DIPISAH ke dua elemen berbeda.
    // Jika backdrop-filter diletakkan di elemen yang sama dengan modal content,
    // backdrop-filter membuat stacking context baru sehingga elemen position:fixed
    // (mis. dropdown mapel z-index:9999) ikut terkurung dan tertutup modal.
    // Dengan memisahkan keduanya, stacking context backdrop tidak mempengaruhi
    // elemen fixed yang di-append ke <body> di luar container ini.
    container.innerHTML = `
        <div style="position:fixed;inset:0;z-index:50;" onclick="closeModal()">
            <!-- Backdrop: elemen terpisah, hanya untuk background & blur -->
            <div style="position:absolute;inset:0;background:rgba(17,24,39,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);"></div>
            <!-- Modal content: posisi di atas backdrop, tanpa backdrop-filter sendiri -->
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="closeModal()">
                <div class="relative w-full ${widthClass || 'max-w-4xl'} bg-white dark:bg-gray-850 rounded-2xl shadow-2xl animate-fade-in flex flex-col" style="max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">
                    <div class="flex-shrink-0">${content}</div>
                </div>
            </div>
        </div>`;
}
function closeModal() { document.getElementById('modalContainer').innerHTML = ''; }

// Helper aman: escape HTML untuk value, handle null/undefined
function _esc(v) {
    if (v === null || v === undefined) return '-';
    const s = String(v).trim();
    return s === '' ? '-' : s
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}
function _modalRow(label, value) {
    const v = _esc(value);
    return `<div class="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">${_esc(label)}</span>
        <span class="text-xs font-bold text-gray-700 dark:text-gray-300 break-words text-right min-w-0">${v}</span>
    </div>`;
}
function _modalSection(icon, title, bodyRows) {
    return `<div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden min-w-0">
        <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1.5 shrink-0">
            <i class="fas ${icon} text-gray-500 dark:text-gray-400 text-[10px]"></i>
            <span class="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider truncate">${_esc(title)}</span>
        </div>
        <div>${bodyRows}</div>
    </div>`;
}

// ---------- Detail Alumni ----------
function getRoleBadgeInfo(role) {
    const map = {
        guru:      { label: 'Guru Pengajar',              color: 'bg-[#d0d8e8] text-[#152238]' },
        walikelas: { label: 'Wali Kelas',                 color: 'bg-[#d0d8e8] text-[#152238]' },
        kepsek:    { label: 'Kepala Madrasah',             color: 'bg-purple-100 text-purple-700' },
        wakel:     { label: 'Wakil Kepala Madrasah',       color: 'bg-[#d0d8e8] text-[#152238]' },
        pencatat:  { label: 'Pencatat Barang & Prestasi', color: 'bg-amber-100 text-amber-700' },
        bendahara: { label: 'Bendahara',                  color: 'bg-[#d0d8e8] text-[#152238]' },
        admin:     { label: 'Admin',                      color: 'bg-rose-100 text-rose-700' },
        siswa:     { label: 'Siswa',                      color: 'bg-green-100 text-green-700' },
        alumni:    { label: 'Alumni',                     color: 'bg-teal-100 text-teal-700' }
    };
    return map[role] || { label: role || '-', color: 'bg-gray-100 text-gray-600' };
}
function safeJsonAttr(obj) {
    return JSON.stringify(obj).replace(/'/g, '&#39;').replace(/</g, '&lt;');
}

// ---------- Combobox mapel (mengambang di <body>, tidak ikut kepotong scroll) ----------
// Dipakai di modal "User" (guru.js) dan "Data Guru" (profil-guru.js) untuk field
// "Ketik atau pilih mapel...". Sebelumnya dropdown-nya adalah <div> anak dari baris
// kelas+mapel dengan position:absolute -- karena baris itu ada di dalam container
// yang overflow-y:auto (daftar baris & modal itu sendiri), dropdown-nya kepotong/
// tersembunyi oleh area scroll sehingga terlihat seperti tidak berfungsi.
// Solusi: dropdown dibuat sebagai satu elemen mengambang (position:fixed, appended
// ke <body>), diposisikan lewat getBoundingClientRect() input, sehingga selalu
// tampil di atas apa pun tanpa terpotong container manapun.
function setupMapelCombobox(input, getOptions) {
    if (!input) return;
    let dropdown = null;

    function positionDropdown() {
        if (!dropdown) return;
        const r = input.getBoundingClientRect();
        const dropH = Math.min(180, dropdown.scrollHeight || 180);
        const spaceBelow = window.innerHeight - r.bottom - 4;
        const spaceAbove = r.top - 4;
        dropdown.style.left = r.left + 'px';
        dropdown.style.width = r.width + 'px';
        // Flip ke atas jika ruang bawah kurang dan atas lebih lega
        if (spaceBelow < dropH && spaceAbove > spaceBelow) {
            dropdown.style.top = (r.top - dropH - 2) + 'px';
        } else {
            dropdown.style.top = (r.bottom + 2) + 'px';
        }
    }
    function onScrollOrResize() { positionDropdown(); }
    function closeDropdown() {
        if (dropdown) { dropdown.remove(); dropdown = null; }
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize, true);
    }
    function renderList(query) {
        const q = (query || '').trim().toLowerCase();
        const options = (typeof getOptions === 'function' ? getOptions() : getOptions) || [];
        const filtered = q ? options.filter(m => m.toLowerCase().includes(q)) : options;

        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'mapel-dropdown-list';
            dropdown.style.cssText = 'position:fixed;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.18);max-height:180px;overflow-y:auto;z-index:10000;';
            document.body.appendChild(dropdown);
            window.addEventListener('scroll', onScrollOrResize, true);
            window.addEventListener('resize', onScrollOrResize, true);
        }
        positionDropdown();

        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="px-3 py-2 text-xs text-gray-400">Tidak ada mapel cocok — lanjut ketik untuk buat mapel baru</div>';
        } else {
            dropdown.innerHTML = filtered.map(m => {
                const label = q
                    ? m.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<strong class="text-[#1b2a4a]">$1</strong>')
                    : m;
                return `<div class="mapel-dd-item px-3 py-2 text-xs text-gray-700 cursor-pointer hover:bg-[#e8ecf4]" data-nama="${m.replace(/"/g, '&quot;')}">${label}</div>`;
            }).join('');
            dropdown.querySelectorAll('.mapel-dd-item').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    input.value = item.getAttribute('data-nama');
                    closeDropdown();
                });
            });
        }
    }
    input.addEventListener('focus', () => renderList(input.value));
    input.addEventListener('input', () => renderList(input.value));
    input.addEventListener('blur', () => setTimeout(closeDropdown, 150));
}

// ---------- Validasi baris "Kelas & Mapel" yang cuma terisi separuh ----------
// Baris kelas+mapel HARUS dua-duanya terisi untuk tersimpan (satu baris =
// satu kombinasi kelas+mapel). Sebelumnya baris yang cuma terisi salah satu
// (mis. mapel sudah DIKETIK tapi kelasnya masih "- Pilih Kelas -") DIBUANG
// begitu saja secara diam-diam saat disimpan -- mapel yang baru diketik jadi
// terasa "hilang"/tidak tersimpan padahal penyebabnya baris itu tidak valid.
// Dipanggil sebelum submit supaya pengguna diberi tahu jelas, bukan didiamkan.
function findIncompleteMengajarRows(containerId, kelasClass, mapelClass) {
    const container = document.getElementById(containerId);
    if (!container) return 0;
    let count = 0;
    container.querySelectorAll('.' + kelasClass).forEach(sel => {
        const row = sel.closest('div');
        const kelas = (sel.value || '').trim();
        const mapel = (row.querySelector('.' + mapelClass)?.value || '').trim();
        if ((kelas && !mapel) || (!kelas && mapel)) count++;
    });
    return count;
}