
  <!-- Modal Lupa Password -->
  <div id="resetPasswordModal" class="fixed inset-0 z-[80] hidden items-center justify-center p-4">
    <div class="absolute inset-0 bg-[#0f172a]/50 backdrop-blur-sm" onclick="closeResetPasswordModal()"></div>
    <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        <div class="h-1.5 bg-gradient-to-r from-[#1b2a4a] via-[#5b7aaa] to-[#1b2a4a]"></div>
        <div class="p-7">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="font-extrabold text-[#152238]">Reset Password</h3>
                    <p class="text-xs text-[#5b7aaa]" id="resetModalStepLabel">Langkah 1 dari 3</p>
                </div>
                <button onclick="closeResetPasswordModal()" class="p-2 hover:bg-[#f4f6fb] rounded-xl text-[#8fa3c0]"><i class="fas fa-times"></i></button>
            </div>

            <!-- Step 1: Identitas -->
            <div id="resetStep1">
                <p class="text-xs text-gray-500 mb-4">Kode OTP akan dikirim ke email tersebut.</p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">NISN / Username</label>
                        <div class="relative">
                            <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input id="resetIdentifier" type="text" placeholder="Masukkan NISN atau username"
                                class="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-[#5b7aaa]/20 focus:border-[#1b2a4a] focus:bg-white transition-all" autocomplete="off">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Email Terdaftar</label>
                        <div class="relative">
                            <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input id="resetEmail" type="email" placeholder="nama@email.com"
                                class="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-[#5b7aaa]/20 focus:border-[#1b2a4a] focus:bg-white transition-all" autocomplete="off">
                        </div>
                    </div>
                </div>
                <button onclick="resetRequestOtp()" class="w-full mt-5 py-3 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm">
                    <i class="fas fa-paper-plane mr-2"></i> Kirim Kode OTP
                </button>
            </div>

            <!-- Step 2: OTP -->
            <div id="resetStep2" class="hidden">
                <p class="text-xs text-gray-500 mb-4">Masukkan kode OTP 6 digit yang dikirim ke email Anda.</p>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Kode OTP</label>
                    <div class="relative">
                        <i class="fas fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input id="resetOtp" type="text" maxlength="6" inputmode="numeric" placeholder="••••••"
                            class="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm tracking-[0.3em] font-bold text-center focus:ring-4 focus:ring-[#5b7aaa]/20 focus:border-[#1b2a4a] focus:bg-white transition-all" autocomplete="off">
                    </div>
                </div>
                <button onclick="resetVerifyOtp()" class="w-full mt-5 py-3 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm">
                    <i class="fas fa-check-circle mr-2"></i> Verifikasi Kode
                </button>
                <button onclick="resetRequestOtp()" class="w-full mt-2 py-2.5 text-xs font-bold text-[#5b7aaa] hover:text-[#1b2a4a] transition-colors">
                    <i class="fas fa-redo mr-1"></i> Kirim ulang OTP
                </button>
            </div>

            <!-- Step 3: Password baru -->
            <div id="resetStep3" class="hidden">
                <p class="text-xs text-gray-500 mb-4">OTP valid! Buat password baru untuk akun Anda.</p>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Password Baru</label>
                    <div class="relative">
                        <input id="resetNewPassword" type="password" minlength="6" placeholder="Minimal 6 karakter"
                            oninput="updateResetPasswordStrength()"
                            class="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-[#5b7aaa]/20 focus:border-[#1b2a4a] focus:bg-white transition-all" autocomplete="off">
                        <button type="button" onclick="toggleResetPasswordView()"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1b2a4a] transition p-1">
                            <i id="resetPassEye" class="fas fa-eye text-sm"></i>
                        </button>
                    </div>
                    <!-- Strength meter -->
                    <div class="mt-2.5 flex gap-1.5" id="resetPassMeter">
                        <div class="h-1.5 flex-1 rounded-full bg-gray-200 transition-colors duration-300"></div>
                        <div class="h-1.5 flex-1 rounded-full bg-gray-200 transition-colors duration-300"></div>
                        <div class="h-1.5 flex-1 rounded-full bg-gray-200 transition-colors duration-300"></div>
                        <div class="h-1.5 flex-1 rounded-full bg-gray-200 transition-colors duration-300"></div>
                    </div>
                    <p id="resetPassLabel" class="text-[11px] font-semibold mt-1.5 ml-1 text-gray-400 transition-colors duration-300">Kekuatan password</p>
                </div>
                <button onclick="resetSetPassword()" class="w-full mt-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm">
                    <i class="fas fa-check mr-2"></i> Simpan Password Baru
                </button>
            </div>

            <p id="resetError" class="mt-4 hidden text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center"></p>
        </div>
    </div>
  </div>
