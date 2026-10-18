function toggleDaftarTheme() {
    var isDark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('siakad_theme', isDark ? 'dark' : 'light'); } catch(e) {}
    var moon = document.getElementById('daftarIconMoon');
    var sun  = document.getElementById('daftarIconSun');
    if (moon) moon.style.display = isDark ? 'none' : '';
    if (sun)  sun.style.display  = isDark ? '' : 'none';
}
document.addEventListener('DOMContentLoaded', function() {
    var isDark = document.documentElement.classList.contains('dark');
    var moon = document.getElementById('daftarIconMoon');
    var sun  = document.getElementById('daftarIconSun');
    if (moon) moon.style.display = isDark ? 'none' : '';
    if (sun)  sun.style.display  = isDark ? '' : 'none';
});
// ─── TOAST ───
function showToast(type, title, msg, duration) {
    duration = duration || 4000;
    var icons = {
        success: '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
        error:   '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
        warn:    '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
        info:    '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>'
    };
    var container = document.getElementById('toastContainer');
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML =
        '<div class="toast-ico">' + icons[type] + '</div>' +
        '<div class="toast-body">' +
            '<div class="toast-title">' + title + '</div>' +
            (msg ? '<div class="toast-msg">' + msg + '</div>' : '') +
        '</div>' +
        '<button class="toast-close" onclick="removeToast(this.parentElement)" title="Tutup">✕</button>';
    container.appendChild(t);
    var timer = setTimeout(function() { removeToast(t); }, duration);
    t._timer = timer;
}
function removeToast(el) {
    if (!el || !el.parentElement) return;
    clearTimeout(el._timer);
    el.classList.add('removing');
    setTimeout(function() { if (el.parentElement) el.parentElement.removeChild(el); }, 280);
}

// ─── UPLOAD ───
var bekasFile = null;
var fileInput = document.getElementById('dBerkas');
var uploadZone = document.getElementById('uploadZone');

fileInput.addEventListener('change', function() {
    var f = fileInput.files[0];
    if (!f) return;
    var okExt = /\.(jpe?g|png|pdf)$/i.test(f.name);
    if (!okExt) {
        showToast('error', 'Format Tidak Didukung', 'Gunakan file JPG, PNG, atau PDF.');
        fileInput.value = ''; return;
    }
    if (f.size > 2 * 1024 * 1024) {
        showToast('error', 'File Terlalu Besar', 'Ukuran maksimal yang diizinkan adalah 2 MB.');
        fileInput.value = ''; return;
    }
    bekasFile = f;
    uploadZone.classList.add('has-file');
    uploadZone.classList.remove('invalid-file');
    document.getElementById('uploadIco').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>';
    document.getElementById('upName').textContent = f.name;
    document.getElementById('upHint').textContent = (f.size / 1024).toFixed(0) + ' KB — siap dikirim';
    document.querySelector('#dBerkas').closest('.field').classList.remove('invalid');
    showToast('success', 'Berkas Dipilih', f.name);
});

// drag & drop
uploadZone.addEventListener('dragover', function(e){ e.preventDefault(); uploadZone.style.borderColor='var(--accent)'; });
uploadZone.addEventListener('dragleave', function(){ uploadZone.style.borderColor=''; });
uploadZone.addEventListener('drop', function(e){
    e.preventDefault(); uploadZone.style.borderColor='';
    if(e.dataTransfer.files[0]){ fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change')); }
});

// ─── VALIDASI ───
var fields = [
    {id:'dNama', check: function(v){ return v.trim()!=''; }},
    {id:'dNisn', check: function(v){ return v.trim()!=''; }},
    {id:'dKelas', check: function(v){ return v!=''; }, isSelect:true},
    {id:'dJk', check: function(v){ return v!=''; }, isSelect:true},
    {id:'dAgama', check: function(v){ return v!=''; }, isSelect:true},
    {id:'dTempat', check: function(v){ return v.trim()!=''; }},
    {id:'dTgl', check: function(v){ return v!=''; }},
    {id:'dAyah', check: function(v){ return v.trim()!=''; }},
    {id:'dIbu', check: function(v){ return v.trim()!=''; }},
    {id:'dHp', check: function(v){ return v.trim()!=''; }},
    {id:'dEmail', check: function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }},
    {id:'dAlamat', check: function(v){ return v.trim()!=''; }, isTextarea:true}
];

// live cleanup
fields.forEach(function(f){
    var el = document.getElementById(f.id);
    el.addEventListener('input', function(){ el.closest('.field').classList.remove('invalid'); });
    el.addEventListener('change', function(){ el.closest('.field').classList.remove('invalid'); });
});

function validateAll() {
    var ok = true;
    var firstInvalid = null;
    fields.forEach(function(f) {
        var el = document.getElementById(f.id);
        var val = el.value;
        var valid = f.check(val);
        el.closest('.field').classList.toggle('invalid', !valid);
        if (!valid && !firstInvalid) firstInvalid = el;
        if (!valid) ok = false;
    });
    // berkas
    var berkasField = document.getElementById('dBerkas').closest('.field');
    var berkasOk = !!bekasFile;
    berkasField.classList.toggle('invalid', !berkasOk);
    if (!berkasOk) ok = false;

    if (!ok) {
        if (firstInvalid) {
            firstInvalid.scrollIntoView({behavior:'smooth', block:'center'});
            setTimeout(function(){ firstInvalid.focus(); }, 300);
        }
        showToast('warn', 'Data Belum Lengkap', 'Lengkapi semua kolom yang ditandai merah.');
    }
    return ok;
}

function g(id){ return document.getElementById(id).value.trim(); }

// ─── SUBMIT FLOW ───
function handleSubmit() {
    if (!validateAll()) return;
    // isi modal summary
    var rows = [
        ['Nama', g('dNama')],
        ['NISN', g('dNisn')],
        ['Jurusan', g('dKelas')],
        ['Email', g('dEmail')],
        ['No. HP', g('dHp')],
        ['Berkas', bekasFile ? bekasFile.name : '-']
    ];
    var html = rows.map(function(r){
        return '<div class="modal-row"><span class="lbl">'+r[0]+'</span><span class="val">'+r[1]+'</span></div>';
    }).join('');
    document.getElementById('modalSummary').innerHTML = html;
    bukaModal();
}

function bukaModal(){ document.getElementById('modalBackdrop').classList.add('show'); }
function tutupModal(){ document.getElementById('modalBackdrop').classList.remove('show'); }

// tutup modal klik backdrop
document.getElementById('modalBackdrop').addEventListener('click', function(e){
    if(e.target === this) tutupModal();
});

async function kirimPendaftaran() {
    var btn = document.getElementById('btnYakin');
    btn.disabled = true;
    btn.innerHTML = '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Mengirim…';

    var berkasB64 = '', berkasNama = '';
    if (bekasFile) {
        berkasNama = bekasFile.name;
        berkasB64 = await new Promise(function(res) {
            var r = new FileReader();
            r.onload = function(){ res(String(r.result).split(',')[1]||''); };
            r.onerror = function(){ res(''); };
            r.readAsDataURL(bekasFile);
        });
    }

    var payload = {
        nama: g('dNama'),
        nisn: g('dNisn'),
        kelasMinat: g('dKelas'),
        jenisKelamin: document.getElementById('dJk').value,
        tempatLahir: g('dTempat'),
        tanggalLahir: document.getElementById('dTgl').value,
        agama: document.getElementById('dAgama').value,
        namaAyah: g('dAyah'),
        namaIbu: g('dIbu'),
        noHp: g('dHp'),
        email: g('dEmail'),
        alamat: document.getElementById('dAlamat').value.trim(),
        berkasNama: berkasNama,
        berkasB64: berkasB64
    };

    try {
        var res = await fetch('api.php?action=submitPendaftaran', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        tutupModal();
        if (json && json.success) {
            // tampilkan sukses screen
            document.getElementById('formShell').style.display = 'none';
            var s = document.getElementById('sukses-screen');
            s.classList.add('show');
            document.getElementById('suksesMsg').textContent =
                (json.message||'') + ' Admin sekolah akan segera memverifikasi pendaftaran Anda.';
            document.getElementById('suksesSummary').innerHTML =
                '<div class="sukses-row"><span class="lbl">Nama</span><span class="val">'+ g('dNama') +'</span></div>'+
                '<div class="sukses-row"><span class="lbl">NISN</span><span class="val">'+ g('dNisn') +'</span></div>'+
                '<div class="sukses-row"><span class="lbl">Jurusan</span><span class="val">'+ g('dKelas') +'</span></div>'+
                '<div class="sukses-row"><span class="lbl">Kontak</span><span class="val">'+ g('dHp') +'</span></div>';
            window.scrollTo({top:0, behavior:'smooth'});
            showToast('success', 'Pendaftaran Berhasil!', 'Silakan tunggu konfirmasi dari sekolah.', 6000);
        } else {
            showToast('error', 'Gagal Mengirim', (json && json.message) || 'Terjadi kesalahan. Coba lagi.');
        }
    } catch(err) {
        tutupModal();
        showToast('error', 'Koneksi Bermasalah', 'Tidak dapat terhubung ke server. Periksa jaringan Anda lalu coba lagi.');
    }
    btn.disabled = false;
    btn.innerHTML = '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Ya, Kirim!';
}

// spin animation untuk loading
var style = document.createElement('style');
style.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
document.head.appendChild(style);
