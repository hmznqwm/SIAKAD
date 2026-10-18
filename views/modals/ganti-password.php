
  <!-- ===== MODAL GANTI PASSWORD ===== -->
  <div id="modalGantiPassword" class="fixed inset-0 z-[9999] flex items-center justify-center hidden" aria-modal="true" role="dialog">
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeModalGantiPassword()"></div>
    <div id="gantiPasswordScrollBody" class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5 sm:p-6 animate-fade-in max-h-[92vh] overflow-y-auto modal-scroll modal-scroll-wrap">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 bg-[#1b2a4a] rounded-xl flex items-center justify-center shrink-0">
            <i class="fas fa-lock text-white text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="font-bold text-gray-800 text-base truncate">Ganti Password</h3>
            <p class="text-xs text-gray-400 truncate">Ubah kata sandi akun Anda</p>
          </div>
        </div>
        <button onclick="closeModalGantiPassword()" class="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100 shrink-0">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <div id="gantiPasswordAlert" class="hidden mb-4 px-4 py-3 rounded-xl text-sm font-medium"></div>

      <!-- ===== EMAIL LOGIN GOOGLE (khusus role admin) ===== -->
      <div id="sectionGoogleEmail" class="hidden mb-5 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.85c2.15-1.99 3.74-4.96 3.74-8.67z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L2.18 7.07C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.68-2.85c-1.02.68-2.25 1.08-3.6 1.08-2.86 0-5.29-1.93-6.16-4.53l-3.66 2.84C3.99 20.53 7.7 23 12 23z"/></svg>
          <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wide">Email Login Google</h4>
        </div>
        <p class="text-[11px] text-gray-500 mb-2">Daftarkan akun Google Anda di sini agar bisa login dengan tombol "Masuk dengan Google".</p>
        <div class="flex gap-2">
          <input type="email" id="inputGoogleEmail" placeholder="nama@gmail.com"
            class="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1b2a4a]/30 focus:border-[#1b2a4a] outline-none transition bg-white" autocomplete="off">
          <button type="button" onclick="submitGoogleEmail()" id="btnSubmitGoogleEmail"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition flex items-center gap-2 shrink-0">
            <i class="fas fa-link"></i> Ikat
          </button>
        </div>
        <p id="googleEmailAlert" class="hidden mt-2 text-[11px] font-medium"></p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Password Lama</label>
          <div class="relative">
            <input type="password" id="inputPasswordLama" placeholder="Masukkan password saat ini"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1b2a4a]/30 focus:border-[#1b2a4a] outline-none pr-10 transition" autocomplete="off">
            <button type="button" onclick="togglePasswordVisibility('inputPasswordLama', this)"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              <i class="fas fa-eye text-sm"></i>
            </button>
          </div>
          <p id="hintPasswordLama" class="text-[11px] text-gray-400 mt-1 hidden"></p>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Password Baru</label>
          <div class="relative">
            <input type="password" id="inputPasswordBaru" placeholder="Minimal 6 karakter"
              oninput="gantiPasswordStrength(this.value)"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1b2a4a]/30 focus:border-[#1b2a4a] outline-none pr-10 transition" autocomplete="off">
            <button type="button" onclick="togglePasswordVisibility('inputPasswordBaru', this)"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              <i class="fas fa-eye text-sm"></i>
            </button>
          </div>
          <!-- Indikator kekuatan password -->
          <div class="mt-2 px-0.5">
            <div id="gantiPassMeter" class="flex gap-1 h-1.5">
              <div class="flex-1 rounded-full bg-gray-200 transition-all duration-300"></div>
              <div class="flex-1 rounded-full bg-gray-200 transition-all duration-300"></div>
              <div class="flex-1 rounded-full bg-gray-200 transition-all duration-300"></div>
              <div class="flex-1 rounded-full bg-gray-200 transition-all duration-300"></div>
            </div>
            <span id="gantiPassLabel" class="text-[11px] font-semibold mt-1 block text-gray-400 transition-colors duration-300">Kekuatan password</span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Konfirmasi Password Baru</label>
          <div class="relative">
            <input type="password" id="inputPasswordKonfirmasi" placeholder="Ulangi password baru"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1b2a4a]/30 focus:border-[#1b2a4a] outline-none pr-10 transition" autocomplete="off">
            <button type="button" onclick="togglePasswordVisibility('inputPasswordKonfirmasi', this)"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              <i class="fas fa-eye text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button onclick="closeModalGantiPassword()" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition">
          Batal
        </button>
        <button onclick="submitGantiPassword()" id="btnSubmitGantiPassword"
          class="flex-1 bg-[#1b2a4a] hover:bg-[#152238] text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    </div>
  </div>
  <!-- ===== END MODAL GANTI PASSWORD ===== -->
