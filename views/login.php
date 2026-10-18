<div id="loginPage" class="relative min-h-screen lg:h-screen flex items-center justify-center bg-gradient-to-tr from-[#e8ecf4] via-[#f1f5f9] to-[#e2e8f0] dark:from-[#0f172a] dark:to-[#1e293b] bg-[length:220%_220%] animate-gradient-x login-bg-slow overflow-y-auto lg:overflow-hidden animate-fade-in p-4 sm:p-6 lg:p-8">
    <!-- Kartu login: form kiri, panel biru kanan -->
    <div class="w-full max-w-[980px] min-h-[540px] bg-white dark:bg-slate-800 rounded-[36px] shadow-2xl shadow-slate-300/70 dark:shadow-black/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col lg:flex-row overflow-hidden relative">

        <!-- KIRI: form login -->
        <div class="w-full lg:w-[54%] order-1 lg:order-2 flex items-center justify-center px-7 sm:px-12 py-6 lg:py-8">
            <div class="w-full max-w-[320px] relative">
                <div class="text-center mb-4">
                    <h2 class="login-stagger text-2xl xl:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Masuk Akun</h2>
                    <p class="login-stagger text-xs text-slate-400 dark:text-slate-500 mt-1.5">Masuk untuk mengakses dashboard SIAKAD</p>
                </div>

                <!-- Notifikasi gagal login -->
                <div id="loginError" class="z-50 w-full mb-4 hidden rounded-xl overflow-hidden border border-red-200 dark:border-red-900/50 bg-red-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg shadow-red-500/10 animate-fade-in" role="alert">
                    <div class="flex items-start gap-2.5 p-3">
                        <div class="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400 shrink-0">
                            <i class="fas fa-exclamation-triangle text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 id="loginErrorTitle" class="text-sm font-bold text-red-700 dark:text-red-400">Login Gagal</h4>
                            <p id="errorText" class="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">Username atau password salah.</p>
                        </div>
                        <button type="button" onclick="document.getElementById('loginError').classList.add('hidden')" class="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors shrink-0 mt-0.5" aria-label="Tutup">
                            <i class="fas fa-times text-sm"></i>
                        </button>
                    </div>
                    <div class="h-1 bg-gradient-to-r from-red-500 via-red-400 to-transparent" style="animation: loginErrorBar 5s linear forwards;"></div>
                </div>

                <form onsubmit="handleLogin(event)" method="POST" id="loginForm" class="login-stagger space-y-3">
                    <input type="text" id="username" name="username" autocomplete="username" class="block w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/60 border border-transparent rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#1b2a4a]/20 focus:border-[#1b2a4a] transition-all placeholder-slate-400 outline-none" placeholder="Username / NISN">
                    <div class="relative">
                        <input type="text" id="password" name="password" autocomplete="off" autocapitalize="off" spellcheck="false" style="-webkit-text-security:disc" class="block w-full px-4 pr-11 py-3 bg-slate-100/80 dark:bg-slate-900/60 border border-transparent rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#1b2a4a]/20 focus:border-[#1b2a4a] transition-all placeholder-slate-400 outline-none" placeholder="Password">
                        <div class="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-slate-400 hover:text-[#1b2a4a] transition-colors" onclick="togglePassword()">
                            <i class="fas fa-eye text-sm" id="togglePasswordIcon"></i>
                        </div>
                    </div>
                    <div class="flex justify-start mt-1 ml-2">
                        <button type="button" onclick="showResetPasswordModal()" class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Lupa Password?
                        </button>
                    </div>
                    <button type="submit" class="group relative w-full overflow-hidden mt-5 py-3.5 px-8 bg-gradient-to-r from-[#1b2a4a] to-[#23365e] hover:from-[#152238] hover:to-[#1b2a4a] text-white font-bold rounded-xl shadow-lg shadow-[#1b2a4a]/25 hover:shadow-xl hover:shadow-[#1b2a4a]/35 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 text-xs tracking-[0.2em] uppercase">
                        <span class="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out"></span>
                        <span class="relative z-10">Masuk</span>
                    </button>
                </form>

                <!-- Pemisah "ATAU" dengan garis ultra-thin & sangat samar (Tidak mencolok, persis UI modern) -->
                <div class="login-stagger flex items-center gap-3" style="margin-top: 18px; margin-bottom: 18px;" aria-hidden="true">
                    <span class="h-px flex-1 divider-line-subtle"></span>
                    <span class="text-[10px] font-medium text-slate-400/70 dark:text-slate-500/70 uppercase tracking-[0.25em] px-1">atau</span>
                    <span class="h-px flex-1 divider-line-subtle"></span>
                </div>

                <style>
                /* Garis pemisah ultra-tipis & halus */
                .divider-line-subtle {
                    height: 1px;
                    background-color: rgba(148, 163, 184, 0.25);
                }
                .dark .divider-line-subtle {
                    background-color: rgba(255, 255, 255, 0.08) !important;
                }

                /* Tombol Google Custom SIAKAD - 100% Identik Tombol MASUK (Support Dark & Light mode) */
                .btn-google-custom {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    width: 100%;
                    padding: 14px 24px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                    background-color: #ffffff;
                    color: #334155;
                    cursor: pointer;
                }
                .btn-google-custom:hover {
                    background-color: #f8fafc;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
                }
                .btn-google-custom:active {
                    transform: scale(0.98);
                }
                /* Mode Gelap (Persis gambar referensi user) */
                .dark .btn-google-custom {
                    background-color: #1e293b !important;
                    border-color: #334155 !important;
                    color: #ffffff !important;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35) !important;
                }
                .dark .btn-google-custom:hover {
                    background-color: #182234 !important;
                    border-color: #475569 !important;
                }
                /* Invisible overlay untuk memicu Google Identity Services popup secara aman */
                .google-overlay-container {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.001;
                    cursor: pointer;
                    overflow: hidden;
                    border-radius: 12px;
                    z-index: 20;
                }
                .google-overlay-container iframe {
                    width: 100% !important;
                    height: 100% !important;
                    cursor: pointer !important;
                }
                </style>

                <!-- Google Sign-In: Custom Design (Langsung di bawah tombol Masuk dengan spasi proporsional) -->
                <div id="googleBtnWrapper" class="login-stagger relative w-full group mt-0">
                    <!-- Tombol Visual Custom SIAKAD (Persis Gambar Referensi User) -->
                    <button type="button" id="btnCustomGoogleVisual" class="btn-google-custom" onclick="handleGoogleLogin()">
                        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Masuk dengan Google</span>
                    </button>

                    <!-- Invisible Google Iframe overlay: Menangkap klik dan memicu Google popup resmi -->
                    <div id="googleBtnContainer" class="google-overlay-container" title="Masuk dengan Google"></div>
                </div>

                <p class="lg:hidden text-center text-xs text-slate-400 mt-3">
                    Belum punya akun?
                    <a href="daftar.php" class="font-bold text-[#1b2a4a] dark:text-blue-300 hover:underline">Daftar siswa baru</a>
                </p>

                <datalist id="usernameHistory"></datalist>
            </div>
        </div>

        <!-- KANAN: panel biru (blob) -->
        <div class="blob-panel hidden lg:flex lg:w-[46%] order-2 lg:order-1 relative overflow-hidden items-center justify-center text-white" style="background:linear-gradient(135deg,#23365e 0%,#1b2a4a 55%,#152238 100%);border-radius:0 160px 160px 0;">
            <div class="dot-grid absolute inset-0 opacity-[0.08]" style="background-image: radial-gradient(circle at 1px 1px, white 1.5px, transparent 0); background-size: 22px 22px;"></div>
            <div class="blob-float absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#5b7aaa]/25 blur-3xl"></div>
            <div class="blob-float-alt absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-[#3e5c8f]/30 blur-3xl"></div>

            <div class="relative z-10 px-10 xl:px-16">
                <div class="blob-stagger blob-stagger-1 flex items-center gap-3 mb-12 relative -left-1">
                    <img src="assets/img/logo.png" alt="Logo Sekolah" class="w-14 h-14 object-contain shrink-0 drop-shadow">
                    <div class="flex flex-col items-start leading-tight text-left">
                        <span class="font-black tracking-[0.3em] text-sm text-white">SIAKAD</span>
                        <span class="text-[10px] font-semibold tracking-[0.18em] text-[#c3cee3] uppercase mt-1">SMAITA Asy-Syadzili</span>
                    </div>
                </div>

                <div class="blob-stagger blob-stagger-2 mb-8 text-left max-w-[300px] relative -left-2">
                    <h2 class="text-2xl xl:text-[28px] font-extrabold drop-shadow-sm leading-snug tracking-tight">
                        Selamat Datang di
                        <br>
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#9fc0ec] via-white to-[#9fc0ec] bg-[length:200%_auto] animate-gradient-x">SIAKAD SMAITA</span>
                    </h2>
                    <p class="mt-3 text-xs font-semibold tracking-[0.22em] uppercase text-[#a9bede]">Asy-Syadzili</p>
                </div>

                <div class="blob-stagger blob-stagger-3 text-left max-w-[270px] ml-auto">
                    <p class="text-[#d0d8e8] text-[13px] leading-relaxed mb-7">
                        Satu portal untuk seluruh kebutuhan akademik.
                        <span class="text-white font-semibold">Belum punya akun?</span> Daftar sekarang!
                    </p>

                    <a href="daftar.php" class="group inline-flex items-center justify-center gap-2.5 border-2 border-white/80 hover:bg-white hover:border-white text-white hover:text-[#1b2a4a] font-bold text-xs tracking-[0.2em] uppercase px-9 py-3 rounded-lg transition-all duration-300 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100">
                        Daftar Sekarang
                        <i class="fas fa-arrow-right text-[10px] transition-transform duration-200 group-hover:translate-x-1"></i>
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
