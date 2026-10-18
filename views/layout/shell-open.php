  <div id="dashboardContainer" class="hidden flex h-screen overflow-hidden bg-gray-50">
      <aside id="sidebar" class="fixed inset-y-0 left-0 z-40 w-64 bg-white transform -translate-x-full md:translate-x-0 transition-all duration-300 ease-in-out flex flex-col h-full shadow-sm">
          <div id="sidebarHeader" class="h-16 flex items-center justify-start px-4 overflow-hidden transition-all duration-300 shrink-0">
              <div id="sidebarBrand" class="flex items-center space-x-3 w-full transition-all duration-300">
                  <img src="assets/img/logo.png" alt="Logo" class="w-10 h-10 object-contain shrink-0">
                  <div class="sidebar-label whitespace-nowrap transition-all duration-300">
                      <h1 class="font-extrabold text-base tracking-tight text-gray-900 leading-none">SIAKAD</h1>
                      <span class="block text-[9px] font-semibold tracking-[0.22em] text-[#5b7aaa] uppercase mt-1">SMAITA Asy-Syadzili</span>
                  </div>
              </div>
          </div>
          <div class="hidden" aria-hidden="true">
              <div id="userProfileCard">
                  <div id="navUserInitial"></div>
                  <div id="userInfo">
                      <p id="navUserName"></p>
                      <span id="navUserRole"></span>
                  </div>
              </div>
          </div>
          <nav id="sidebarMenu" class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-0.5 scrollbar-hide text-sm"></nav>
          <div class="p-3 shrink-0 space-y-1" id="sidebarBottomActions">
              <button onclick="showModalGantiPassword()" id="btnGantiPasswordSidebar" class="flex items-center space-x-3 text-gray-400 hover:text-[#1b2a4a] hover:bg-blue-50 w-full px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap justify-start">
                  <i class="fas fa-lock w-5 text-center shrink-0 text-sm transition-transform group-hover:scale-110"></i>
                  <span class="sidebar-label font-medium text-xs transition-all duration-300">Ganti Password</span>
              </button>
              <button onclick="logout()" id="btnLogout" class="flex items-center space-x-3 text-gray-400 hover:text-red-600 hover:bg-red-50 w-full px-3 py-2.5 rounded-xl transition-all duration-200 group overflow-hidden whitespace-nowrap justify-start">
                  <i class="fas fa-sign-out-alt w-5 text-center shrink-0 text-sm transition-transform group-hover:scale-110"></i>
                  <span class="sidebar-label font-medium text-xs transition-all duration-300">Keluar Aplikasi</span>
              </button>
          </div>
      </aside>
      <div id="mobileOverlay" onclick="toggleSidebar()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 hidden transition-opacity duration-300 opacity-0"></div>
      <main id="mainContent" class="flex-1 flex flex-col md:ml-64 h-screen relative transition-all duration-300 overflow-hidden bg-gray-50">
          <header class="h-14 bg-white sticky top-0 z-20 flex items-center justify-between px-5 border-b border-gray-100 shadow-none">
              <div class="flex items-center gap-2">
                  <button onclick="toggleSidebar()" class="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors focus:outline-none"><i class="fas fa-bars text-sm"></i></button>
                  <h2 id="pageTitle" class="text-sm font-bold text-gray-800 tracking-tight">Dashboard</h2>
              </div>
              <div class="flex items-center gap-3">
                  <p class="text-xs text-gray-400 hidden md:block" id="currentDateDisplay">Senin, 1 Jan 2026</p>
                  <button type="button" id="themeToggleBtn" onclick="toggleSiakadTheme()" title="Ganti tampilan gelap/terang" aria-label="Ganti tampilan gelap/terang" class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none">
                      <i class="fas fa-moon text-sm" id="themeToggleIconMoon"></i>
                      <i class="fas fa-sun text-sm hidden" id="themeToggleIconSun"></i>
                  </button>
              </div>
          </header>
          <div id="mainContentArea" class="flex-1 overflow-y-auto px-4 md:px-6 pt-3 pb-6 scroll-smooth">
