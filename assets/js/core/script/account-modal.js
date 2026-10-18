// core/script/account-modal.js
// Modal ganti password akun & fitur terkait (email Google), plus shortcut keyboard (Esc).
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

function gantiPasswordStrength(v) {
  const meter = document.getElementById('gantiPassMeter');
  const label = document.getElementById('gantiPassLabel');
  if (!meter || !label) return;
  let score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const levels = [
    { color: '#ef4444', text: 'Lemah',       cls: 'text-red-500' },
    { color: '#f59e0b', text: 'Sedang',      cls: 'text-amber-500' },
    { color: '#3b82f6', text: 'Kuat',        cls: 'text-blue-500' },
    { color: '#10b981', text: 'Sangat Kuat', cls: 'text-emerald-600' }
  ];
  const bars = meter.children;
  for (let i = 0; i < bars.length; i++) {
    bars[i].style.background = i < score ? levels[Math.max(0, score - 1)].color : '#e5e7eb';
  }
  if (v.length === 0) {
    label.textContent = 'Kekuatan password';
    label.className = 'text-[11px] font-semibold mt-1 block text-gray-400 transition-colors duration-300';
  } else {
    const lv = levels[Math.max(0, score - 1)];
    label.textContent = lv.text;
    label.className = `text-[11px] font-semibold mt-1 block transition-colors duration-300 ${lv.cls}`;
  }
}

function showModalGantiPassword() {
  const modal = document.getElementById('modalGantiPassword');
  if (!modal) return;

  // Reset form
  ['inputPasswordLama', 'inputPasswordBaru', 'inputPasswordKonfirmasi'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Reset indikator kekuatan
  gantiPasswordStrength('');

  const alert = document.getElementById('gantiPasswordAlert');
  if (alert) { alert.className = 'hidden mb-4 px-4 py-3 rounded-xl text-sm font-medium'; alert.textContent = ''; }

  // Tampilkan hint untuk siswa: password default = tanggal lahir
  const hintEl = document.getElementById('hintPasswordLama');
  if (hintEl) {
    const user = typeof currentUser !== 'undefined' ? currentUser : null;
    if (user && user.role === 'siswa') {
      hintEl.textContent = 'Password lama default: tanggal lahir format DDMMYYYY (contoh: 15082010) atau NISN Anda.';
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
    }
  }

  // Bagian Email Google khusus role admin saja (guru/staff lain & siswa/alumni tidak menampilkannya)
  const gSection = document.getElementById('sectionGoogleEmail');
  if (gSection) {
    const isStaff = currentUser && currentUser.role === 'admin';
    if (isStaff) {
      gSection.classList.remove('hidden');
      loadGoogleEmail();
    } else {
      gSection.classList.add('hidden');
    }
  }

  modal.classList.remove('hidden');
  setTimeout(() => { const el = document.getElementById('inputPasswordLama'); if (el) el.focus(); }, 100);

  // Indikator scroll (fade di dasar area modal): sembunyikan begitu konten
  // sudah mentok bawah / muat semua tanpa perlu scroll sama sekali.
  const scrollBody = document.getElementById('gantiPasswordScrollBody');
  if (scrollBody) {
    const syncScrollFade = () => {
      const atBottom = (scrollBody.scrollHeight - scrollBody.scrollTop - scrollBody.clientHeight) < 4;
      scrollBody.classList.toggle('is-at-bottom', atBottom);
    };
    scrollBody.removeEventListener('scroll', scrollBody._gpScrollHandler || (() => {}));
    scrollBody._gpScrollHandler = syncScrollFade;
    scrollBody.addEventListener('scroll', syncScrollFade);
    setTimeout(syncScrollFade, 150);
  }
}

async function loadGoogleEmail() {
  try {
    const token = localStorage.getItem('siakad_token') || '';
    const res = await (await fetch('api.php?action=myGoogleEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'myGoogleEmail', token })
    })).json();
    if (res.success && res.email) {
      const el = document.getElementById('inputGoogleEmail');
      if (el) el.value = res.email;
    }
  } catch (err) {}
}

async function submitGoogleEmail() {
  const email = (document.getElementById('inputGoogleEmail')?.value || '').trim();
  const alertEl = document.getElementById('googleEmailAlert');
  function showMsg(msg, isError = true) {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `mt-2 text-[11px] font-medium ${isError ? 'text-red-600' : 'text-green-600'}`;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMsg('Masukkan alamat email yang valid.'); return; }

  const btn = document.getElementById('btnSubmitGoogleEmail');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>'; }
  try {
    const token = localStorage.getItem('siakad_token') || '';
    const res = await (await fetch('api.php?action=myGoogleEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'myGoogleEmail', token, emailGoogle: email })
    })).json();
    showMsg(res.message || (res.success ? 'Tersimpan.' : 'Gagal menyimpan.'), !res.success);
  } catch (err) {
    showMsg('Gagal terhubung ke server. Coba lagi.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-link"></i> Ikat'; }
  }
}

function closeModalGantiPassword() {
  const modal = document.getElementById('modalGantiPassword');
  if (modal) modal.classList.add('hidden');
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPassword ? 'fas fa-eye-slash text-sm' : 'fas fa-eye text-sm';
  }
}

async function submitGantiPassword() {
  const passwordLama = (document.getElementById('inputPasswordLama')?.value || '').trim();
  const passwordBaru = (document.getElementById('inputPasswordBaru')?.value || '').trim();
  const passwordKonfirmasi = (document.getElementById('inputPasswordKonfirmasi')?.value || '').trim();

  const alertEl = document.getElementById('gantiPasswordAlert');
  function showAlert(msg, isError = true) {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `mb-4 px-4 py-3 rounded-xl text-sm font-medium ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`;
  }

  if (!passwordLama) { showAlert('Masukkan password lama terlebih dahulu.'); return; }
  if (!passwordBaru) { showAlert('Masukkan password baru.'); return; }
  if (passwordBaru.length < 6) { showAlert('Password baru minimal 6 karakter.'); return; }
  if (passwordBaru !== passwordKonfirmasi) { showAlert('Konfirmasi password tidak cocok.'); return; }

  const btn = document.getElementById('btnSubmitGantiPassword');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...'; }

  try {
    const token = localStorage.getItem('siakad_token') || '';
    const response = await fetch('api.php?action=gantiPassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'gantiPassword', token, passwordLama, passwordBaru })
    });
    const res = await response.json();

    if (res.success) {
      showAlert(res.message || 'Password berhasil diubah!', false);
      if (res.forceLogout) {
        // Password berganti → sesi sudah dicabut server, tendang ke halaman login
        setTimeout(() => {
          try { localStorage.removeItem('absensiAppSession'); localStorage.removeItem('siakad_token'); } catch(e) {}
          if (typeof currentUser !== 'undefined') { try { currentUser = null; } catch(e) {} }
          closeModalGantiPassword();
          showLoginPage();
        }, 1500);
      } else {
        setTimeout(() => closeModalGantiPassword(), 1800);
      }
    } else {
      showAlert(res.message || 'Gagal mengubah password.');
    }
  } catch (err) {
    showAlert('Gagal terhubung ke server. Coba lagi.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan'; }
  }
}

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (document.getElementById('modalGantiPassword') && !document.getElementById('modalGantiPassword').classList.contains('hidden')) {
      closeModalGantiPassword();
    }
  }
});
