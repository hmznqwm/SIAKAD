// core/script/auth.js
// Autentikasi & sesi: checkSession, login (termasuk Google), reset password, logout.
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

function _setSiakadCookie(token) {
    if (token) {
        var secure = location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = "siakad_token=" + encodeURIComponent(token) + "; path=/; max-age=86400; SameSite=Lax" + secure;
    }
}
function _clearSiakadCookie() {
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = "siakad_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax" + secure;
}

function checkSession() {
        const VALID_ROLES = ['admin', 'guru', 'walikelas', 'kepsek', 'wakel', 'pencatat', 'bendahara', 'siswa', 'alumni'];
        let restored = false;
        const storedSession = localStorage.getItem('absensiAppSession');
        if (storedSession) {
            try {
                const sessionData = JSON.parse(storedSession);
                // Validate: must have success flag, a token, and a recognised role
                if (
                    sessionData &&
                    sessionData.success === true &&
                    sessionData.token &&
                    typeof sessionData.role === 'string' &&
                    VALID_ROLES.includes(sessionData.role)
                ) {
                    currentUser = sessionData;
                    localStorage.setItem('siakad_token', sessionData.token);
                    _setSiakadCookie(sessionData.token);

                    var dc = document.getElementById('dashboardContainer');
                    if (!dc) {
                        // Tampilan dashboard belum dirender server-side, reload halaman dengan cookie
                        window.location.reload();
                        return true;
                    }

                    showDashboardPage();
                    if (window.innerWidth < 768) {
                        var sb = document.getElementById('sidebar');
                        if (sb) sb.classList.remove('open');
                    }
                    restored = true;
                    initDashboard();
                } else {
                    // Invalid or tampered session wipe everything
                    localStorage.removeItem('absensiAppSession');
                    localStorage.removeItem('siakad_token');
                    _clearSiakadCookie();
                }
            } catch(e) {
                localStorage.removeItem('absensiAppSession');
                localStorage.removeItem('siakad_token');
                _clearSiakadCookie();
            }
        }
        // Jika tidak ada session tersimpan, pastikan halaman login tampil
        if (!restored) {
            _clearSiakadCookie();
            var dc2 = document.getElementById('dashboardContainer');
            if (dc2) {
                window.location.reload();
                return false;
            }
            showLoginPage();
        }
        return restored;
    }
    function switchLoginTab(tab) {
        // Tab dihapus  form login sudah disatukan, fungsi ini dibiarkan kosong.
        const errEl = document.getElementById('loginError');
        if (errEl) errEl.classList.add('hidden');
    }
    function handleLogin(event) {
        event.preventDefault();
        showLoading();
        const identifier = document.getElementById('username').value.trim();
        const password   = document.getElementById('password').value.trim();
        // Kirim identifier sebagai username DAN nisn sekaligus;
        // backend akan cek tabel siswa dulu (jika cocok NISN), lalu tabel users.
        siakadRun
            .withSuccessHandler(onLoginSuccess)
            .withFailureHandler(onLoginFailure)
            .login(identifier, password, identifier);
    }
    function saveLoginCreds(identifier, password) {
        try {
            if (!identifier || !password) return;
            var key = 'siakad_saved_creds';
            var creds = JSON.parse(localStorage.getItem(key) || '{}');
            creds[String(identifier).toLowerCase()] = { u: identifier, p: btoa(unescape(encodeURIComponent(password))) };
            localStorage.setItem(key, JSON.stringify(creds));
        } catch (e) {}
    }
    function onLoginSuccess(result) {
        const VALID_ROLES = ['admin', 'guru', 'walikelas', 'kepsek', 'wakel', 'pencatat', 'bendahara', 'siswa', 'alumni'];
        hideLoading();
        if (
            result &&
            result.success === true &&
            result.token &&
            typeof result.role === 'string' &&
            VALID_ROLES.includes(result.role)
        ) {
            currentUser = result;
            localStorage.setItem('absensiAppSession', JSON.stringify(result));
            localStorage.setItem('siakad_token', result.token);
            _setSiakadCookie(result.token);
            var _id = document.getElementById('username')?.value?.trim() || result.username || '';
            var _pw = document.getElementById('password')?.value || '';
            if (_id && _pw) saveLoginCreds(_id, _pw);
            if (typeof window._saveLoginHistory === 'function') {
                window._saveLoginHistory(_id);
            }
            initDashboard._isNewLogin = true;

            var dc = document.getElementById('dashboardContainer');
            if (!dc) {
                window.location.reload();
                return;
            }

            showDashboardPage();
            // PERBAIKAN MOBILE: pastikan sidebar tertutup & overlay tidak menghalangi klik
            (function() {
                const sb = document.getElementById('sidebar');
                const ov = document.getElementById('mobileOverlay');
                if (sb) { sb.classList.remove('open'); sb.removeAttribute('data-mobile-open'); }
                if (ov) { ov.classList.add('hidden'); ov.style.opacity = '0'; ov.style.pointerEvents = 'none'; }
            })();
            initDashboard();
        } else {
            // Either login failed or server returned unknown/invalid role
            const msg = (result && result.message) ? result.message : 'Login gagal. Periksa kembali data Anda.';
            showLoginError(msg);
        }
    }
    function showLoginError(msg) {
        const errorDiv = document.getElementById('loginError');
        if (!errorDiv) return;
        const textEl = document.getElementById('errorText');
        if (textEl) textEl.textContent = msg;
        const passEl = document.getElementById('password');
        if (passEl) passEl.value = '';
        errorDiv.classList.remove('hidden');
        errorDiv.classList.add('shake-anim');
        // restart animasi progress bar supaya selalu full 5 detik setiap kali muncul
        var bar = errorDiv.querySelector('.h-1');
        if (bar) {
            bar.style.animation = 'none';
            void bar.offsetWidth; // paksa reflow agar restart terdeteksi browser
            bar.style.animation = 'loginErrorBar 5s linear forwards';
        }
        // hilangkan animasi shake biar bisa diulang
        setTimeout(() => errorDiv.classList.remove('shake-anim'), 600);
        // sembunyikan otomatis setelah 5 detik
        clearTimeout(errorDiv._hideTimer);
        errorDiv._hideTimer = setTimeout(() => errorDiv.classList.add('hidden'), 5000);
    }
    function onLoginFailure(error) {
        hideLoading();
        const msg = (error && error.message) ? error.message : 'Gagal terhubung ke server';
        showLoginError(msg);
    }
    // ===== GOOGLE IDENTITY SERVICES (Cross-Browser & ITP/FedCM Compatible) =====
    let _gsiInitialized = false;

    function initGoogleAuth() {
        if (!window._googleClientId) return;
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
            return;
        }
        try {
            if (!_gsiInitialized) {
                google.accounts.id.initialize({
                    client_id: window._googleClientId,
                    callback: handleGoogleCredential,
                    ux_mode: 'popup',
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    itp_support: true,            // Safari ITP (Intelligent Tracking Prevention)
                    use_fedcm_for_prompt: true    // Chrome FedCM standard
                });
                _gsiInitialized = true;
            }

            const btnContainer = document.getElementById('googleBtnContainer');
            if (btnContainer && !btnContainer._rendered) {
                btnContainer.innerHTML = '';
                const parentW = btnContainer.parentElement ? btnContainer.parentElement.clientWidth : 320;
                const targetW = Math.min(Math.max(parentW || 320, 240), 320);
                const isDark = document.documentElement.classList.contains('dark');

                google.accounts.id.renderButton(btnContainer, {
                    type: 'standard',
                    theme: isDark ? 'filled_black' : 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    width: targetW,
                    locale: 'id'
                });
                btnContainer._rendered = true;
            }
        } catch (e) {
            console.warn('[GoogleAuth] Init warning:', e);
        }
    }

    // Auto-retry inisialisasi tombol jika library Google dimuat secara asynchronous
    (function startGoogleAuthPolling() {
        let attempts = 0;
        const interval = setInterval(function() {
            attempts++;
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                initGoogleAuth();
                clearInterval(interval);
            } else if (attempts > 25) {
                clearInterval(interval);
            }
        }, 200);
    })();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGoogleAuth);
    } else {
        initGoogleAuth();
    }
    window.addEventListener('load', initGoogleAuth);


    function handleGoogleLogin() {
        if (!window._googleClientId) {
            showLoginError('Google Login belum dikonfigurasi (Client ID kosong). Hubungi administrator.');
            return;
        }
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
            showLoginError('Library Google belum selesai dimuat. Periksa koneksi internet Anda, lalu coba lagi.');
            return;
        }

        initGoogleAuth();

        // Coba klik tombol yang dirender di dalam container terlebih dahulu
        const container = document.getElementById('googleBtnContainer');
        const renderedBtn = container ? container.querySelector('div[role="button"], button, iframe') : null;
        if (renderedBtn) {
            renderedBtn.click();
            return;
        }

        // Fallback panggil prompt
        try {
            google.accounts.id.prompt(function(notif) {
                if (notif.isNotDisplayed()) {
                    var reason = notif.getNotDisplayedReason ? notif.getNotDisplayedReason() : '';
                    showLoginError('Pemilih akun Google tidak dapat ditampilkan (' + (reason || 'browser restriction') + '). Silakan klik tombol Google resmi atau izinkan popup.');
                } else if (notif.isSkippedMoment()) {
                    var reason2 = notif.getSkippedReason ? notif.getSkippedReason() : '';
                    showLoginError('Pemilihan akun Google dilewati (' + (reason2 || 'skipped') + '). Silakan coba lagi.');
                }
            });
        } catch (e) {
            showLoginError('Google Login error: ' + (e.message || e));
        }
    }

    async function handleGoogleCredential(response) {
        const idToken = response && response.credential;
        if (!idToken) {
            showLoginError('Kredensial Google kosong.');
            return;
        }
        showLoading();
        try {
            const res = await fetch('api.php?action=loginGoogle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: idToken })
            });
            const result = await res.json();
            hideLoading();
            const VALID_ROLES = ['admin', 'guru', 'walikelas', 'kepsek', 'wakel', 'pencatat', 'bendahara', 'siswa', 'alumni'];
            if (result && result.success && result.token && VALID_ROLES.includes(result.role)) {
                currentUser = result;
                localStorage.setItem('absensiAppSession', JSON.stringify(result));
                localStorage.setItem('siakad_token', result.token);
                _setSiakadCookie(result.token);
                if (typeof window._saveLoginHistory === 'function') {
                    window._saveLoginHistory(document.getElementById('username')?.value?.trim() || result.username || '');
                }
                initDashboard._isNewLogin = true;

                var dc = document.getElementById('dashboardContainer');
                if (!dc) {
                    window.location.reload();
                    return;
                }

                showDashboardPage();
                // PERBAIKAN MOBILE: tutup sidebar saat login Google
                (function() {
                    const sb = document.getElementById('sidebar');
                    const ov = document.getElementById('mobileOverlay');
                    if (sb) { sb.classList.remove('open'); sb.removeAttribute('data-mobile-open'); }
                    if (ov) { ov.classList.add('hidden'); ov.style.opacity = '0'; ov.style.pointerEvents = 'none'; }
                })();
                initDashboard();
            } else {
                showLoginError((result && result.message) || 'Akun Google tidak terdaftar di SIAKAD.');
            }
        } catch (err) {
            hideLoading();
            showLoginError('Gagal terhubung ke server');
        }
    }

    window.initGoogleAuth = initGoogleAuth;
    window.handleGoogleLogin = handleGoogleLogin;


    // ===== LUPA PASSWORD (OTP via Email) =====
    let resetState = { identifier: '', email: '', otp: '' };
    function resetError(msg) {
        const el = document.getElementById('resetError');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 5000);
    }
    function resetShowStep(n) {
        ['resetStep1', 'resetStep2', 'resetStep3'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', i !== n - 1);
        });
        const lbl = document.getElementById('resetModalStepLabel');
        if (lbl) lbl.textContent = 'Langkah ' + n + ' dari 3';
    }
    function showResetPasswordModal() {
        resetState = { identifier: '', email: '', otp: '' };
        const m = document.getElementById('resetPasswordModal');
        if (!m) return;
        ['resetIdentifier', 'resetEmail', 'resetOtp', 'resetNewPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const err = document.getElementById('resetError');
        if (err) err.classList.add('hidden');
        resetShowStep(1);
        m.classList.remove('hidden');
        m.classList.add('flex');
        setTimeout(() => document.getElementById('resetIdentifier')?.focus(), 100);
    }
    function closeResetPasswordModal() {
        const m = document.getElementById('resetPasswordModal');
        if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    }
    async function resetRequestOtp() {
        const identifier = (document.getElementById('resetIdentifier')?.value || '').trim();
        const email = (document.getElementById('resetEmail')?.value || '').trim();
        const btn = document.querySelector('#resetStep1 button[onclick="resetRequestOtp()"], #resetStep2 button[onclick="resetRequestOtp()"]');
        if (!identifier || !email) { resetError('NISN/Username dan email wajib diisi'); return; }
        resetState.identifier = identifier;
        resetState.email = email;
        if (btn) { btn.disabled = true; btn.dataset.originalHtml = btn.innerHTML; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Mengirim...'; }
        try {
            const res = await fetch('api.php?action=requestResetPassword', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ identifier, email }), credentials: 'same-origin' });
            const raw = await res.text();
            let json = null;
            try { json = raw ? JSON.parse(raw) : null; } catch (_) {}
            if (!res.ok || !json) throw new Error((json && json.message) || `Server mengembalikan HTTP ${res.status}.`);
            if (json.success) { resetShowStep(2); resetError(json.message || 'Kode OTP berhasil dikirim. Silakan cek email Anda.'); }
            else resetError(json.message || 'Gagal mengirim OTP');
        } catch (e) {
            console.error('[Reset Password] request OTP:', e);
            resetError(e?.message || 'Gagal menghubungi server. Coba lagi.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML; }
        }
    }

    async function resetVerifyOtp() {
        const otp = (document.getElementById('resetOtp')?.value || '').trim();
        const btn = document.querySelector('#resetStep2 button[onclick="resetVerifyOtp()"]');
        if (!otp) { resetError('Masukkan kode OTP'); return; }
        if (!/^\d{6}$/.test(otp)) { resetError('Kode OTP harus 6 digit'); return; }
        resetState.otp = otp;
        if (btn) { btn.disabled = true; btn.dataset.originalHtml = btn.innerHTML; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Memverifikasi...'; }
        try {
            const res = await fetch('api.php?action=verifyResetOtp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ identifier: resetState.identifier, otp }), credentials: 'same-origin' });
            const raw = await res.text();
            let json = null;
            try { json = raw ? JSON.parse(raw) : null; } catch (_) {}
            if (!res.ok || !json) throw new Error((json && json.message) || `Server mengembalikan HTTP ${res.status}.`);
            if (json.success) { resetShowStep(3); setTimeout(() => document.getElementById('resetNewPassword')?.focus(), 100); }
            else resetError(json.message || 'Kode OTP salah');
        } catch (e) {
            console.error('[Reset Password] verify OTP:', e);
            resetError(e?.message || 'Gagal menghubungi server. Coba lagi.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML; }
        }
    }

    function updateResetPasswordStrength() {
        const input = document.getElementById('resetNewPassword');
        const meter = document.getElementById('resetPassMeter');
        const label = document.getElementById('resetPassLabel');
        if (!input || !meter || !label) return;
        const v = input.value || '';
        // Skor 0-4: panjang, huruf besar, huruf kecil, angka, simbol
        let score = 0;
        if (v.length >= 8) score++;
        if (/[A-Z]/.test(v)) score++;
        if (/[0-9]/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;
        const bars = meter.children;
        const levels = [
            { color: '#ef4444', text: 'Lemah', c: 'text-red-500' },
            { color: '#f59e0b', text: 'Cukup', c: 'text-amber-500' },
            { color: '#3b82f6', text: 'Kuat', c: 'text-blue-500' },
            { color: '#10b981', text: 'Sangat kuat', c: 'text-emerald-600' }
        ];
        for (let i = 0; i < bars.length; i++) {
            bars[i].style.background = i < score ? levels[score - 1].color : '#e5e7eb';
        }
        if (v.length === 0) {
            label.textContent = 'Kekuatan password';
            label.className = 'text-[11px] font-semibold mt-1.5 ml-1 text-gray-400 transition-colors duration-300';
        } else {
            const lv = levels[Math.max(0, score - 1)];
            label.textContent = lv.text;
            label.className = 'text-[11px] font-semibold mt-1.5 ml-1 transition-colors duration-300 ' + lv.c;
        }
    }
    function toggleResetPasswordView() {
        const input = document.getElementById('resetNewPassword');
        const eye = document.getElementById('resetPassEye');
        if (!input || !eye) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        eye.className = 'fas ' + (show ? 'fa-eye-slash' : 'fa-eye') + ' text-sm';
    }
    window.updateResetPasswordStrength = updateResetPasswordStrength;
    window.toggleResetPasswordView = toggleResetPasswordView;

    async function resetSetPassword() {
        const newPass = (document.getElementById('resetNewPassword')?.value || '').trim();
        const btn = document.querySelector('#resetStep3 button[onclick="resetSetPassword()"]');
        if (newPass.length < 6) { resetError('Password minimal 6 karakter'); return; }
        if (!resetState.identifier || !resetState.otp) { resetError('Sesi reset tidak lengkap. Silakan ulangi dari awal.'); return; }
        if (btn) { btn.disabled = true; btn.dataset.originalHtml = btn.innerHTML; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Menyimpan...'; }
        try {
            const res = await fetch('api.php?action=setNewPassword', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ identifier: resetState.identifier, otp: resetState.otp, newPassword: newPass }), credentials: 'same-origin' });
            const raw = await res.text();
            let json = null;
            try { json = raw ? JSON.parse(raw) : null; } catch (_) {}
            if (!res.ok || !json) throw new Error((json && json.message) || `Server mengembalikan HTTP ${res.status}.`);
            if (json.success) {
                const id = resetState.identifier;
                closeResetPasswordModal();
                showLoginError(json.message || 'Password berhasil diubah. Silakan login kembali.');
                const username = document.getElementById('username');
                if (username) username.value = id;
                resetState = { identifier: '', email: '', otp: '' };
            } else resetError(json.message || 'Gagal mengubah password');
        } catch (e) {
            console.error('[Reset Password] set password:', e);
            resetError(e?.message || 'Gagal menghubungi server. Coba lagi.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML; }
        }
    }
    window.showResetPasswordModal = showResetPasswordModal;
    window.closeResetPasswordModal = closeResetPasswordModal;
    function logout() {
        Swal.fire({
            title: 'Keluar dari akun?',
            text: 'Anda akan logout dari aplikasi ini.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Logout',
            cancelButtonText: 'Tidak',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#3d5478',
            reverseButtons: true
        }).then(res => {
            if (!res.isConfirmed) return;
            doLogout();
        });
    }
    function doLogout() {
        // Kirim token ke server untuk dihapus dari DB (cegah session replay attack)
        try {
            const token = localStorage.getItem('siakad_token') || '';
            if (token) {
                // Fire-and-forget  jangan tunggu response agar UI responsif
                fetch('api.php?action=logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout', token: token }),
                    keepalive: true  // Pastikan request selesai meski halaman berpindah
                }).catch(() => {});
            }
        } catch(e) {}

        // Bersihkan state & storage DULU sebelum manipulasi DOM
        try { stopAndBack(false); } catch(e) {}
        try { if (typeof _notifBadgeTimer !== 'undefined' && _notifBadgeTimer) { clearInterval(_notifBadgeTimer); _notifBadgeTimer = null; } } catch(e) {}
        _clearSiakadCookie();
        try { localStorage.removeItem('absensiAppSession'); } catch(e) {}
        try { localStorage.removeItem('siakad_token'); } catch(e) {}
        try { localStorage.removeItem(LAST_MENU_KEY); } catch(e) {}
        try { localStorage.removeItem('siakadSidebarScroll'); } catch(e) {}
        currentUser = null;
        try { appCache = { siswa: null, guru: null }; } catch(e) {}

        window.location.reload();
    }
