// core/script/ui-fixes.js
// Perbaikan UI responsif: re-check sesi saat tab aktif kembali, penyesuaian grid/table
// di layar kecil, observer perubahan view.
// Dipecah dari assets/js/script.js -- urutan file HARUS tetap seperti di scripts.php
// (core-api, state, table-state, navigation, auth, dashboard, ui-fixes, account-modal)
// karena beberapa bagian saling bergantung dan file ini TIDAK dibungkus IIFE (scope global).

(function initSessionSafe() {
      function tryCheckSession(attempt) {
        var stored = null;
        try { stored = localStorage.getItem('absensiAppSession'); } catch(e) {}
        if (stored) {
          checkSession();
        } else if (attempt < 3) {
          setTimeout(function() { tryCheckSession(attempt + 1); }, 120);
        } else {
          checkSession();
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { tryCheckSession(0); });
      } else {
        requestAnimationFrame(function() { tryCheckSession(0); });
      }
    })();

    // Re-check saat user kembali ke tab (mobile background -> foreground)
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && !currentUser) {
        checkSession();
      }
    });
    // Handle iOS Safari bfcache restore
    window.addEventListener('pageshow', function(e) {
      if (e.persisted && !currentUser) {
        checkSession();
      }
    });
    // ===== END PERBAIKAN =====

  document.addEventListener('click', function(e) {
    if (window.innerWidth >= 768) return;
    const menuLink = e.target.closest('#sidebarMenu a');
    if (menuLink) {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('mobileOverlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) { overlay.style.opacity = '0'; setTimeout(() => overlay.classList.add('hidden'), 300); }
    }
  });
  function _fixPerizinanGrids() {
    if (window.innerWidth > 480) return;
    const targets = [
      document.getElementById('statPerizinanWrap'),
      document.getElementById('statPzSiswaWrap'),
      document.getElementById('statPzSiswaGuruWrap'),
    ];
    targets.forEach(el => {
      if (el) el.style.gridTemplateColumns = 'repeat(2,1fr)';
    });
    document.querySelectorAll('[style*="grid-template-columns:repeat(3,1fr)"]').forEach(el => {
      el.style.gridTemplateColumns = 'repeat(2,1fr)';
    });
  }
  (function observeViewChanges() {
    const area = document.getElementById('mainContentArea');
    if (!area) return;
    const mo = new MutationObserver(function() {
      _fixPerizinanGrids();
      _fixInlineTableWidths();
    });
    mo.observe(area, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  })();
  function _fixInlineTableWidths() {
    if (window.innerWidth >= 768) return;
    const inlineTables = document.querySelectorAll(
      '#tbody-perizinan-siswa-guru table, #view-perizinan-guru table, #view-perizinan-siswa-guru table, #view-perizinan-siswa table'
    );
    inlineTables.forEach(t => {
      if (!t.style.minWidth) t.style.minWidth = '580px';
    });
  }
  window.addEventListener('resize', function() {
    _fixPerizinanGrids();
    _fixInlineTableWidths();
    if (window.innerWidth >= 768) {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('mobileOverlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.add('hidden');
    }
  }, { passive: true });
  window.addEventListener('DOMContentLoaded', function() {
    _fixPerizinanGrids();
    _fixInlineTableWidths();
  });

// Gmail-like Selection Mode via Long Press for Mobile
(function initMobileTableSelection() {
  let touchTimer = null;
  let startX = 0;
  let startY = 0;
  let activeRow = null;
  let longPressed = false;

  // Daftar tabel yang mendukung mode-pilih via tekan-tahan (long press) di HP.
  // Untuk menambah tabel baru: cukup tambahkan entri di sini + beri baris
  // <tr> pada tabel tersebut class="select-row-target" data-type="..." data-id="...".
  var mobileSelectRegistry = {
    siswa:      { getSet: function() { return selectedSiswaIds; },      toggle: function(id, c) { toggleSiswaRow(id, c); } },
    guru:       { getSet: function() { return selectedGuruIds; },       toggle: function(id, c) { toggleGuruRow(id, c); } },
    alumni:     { getSet: function() { return selectedAlumniIds; },     toggle: function(id, c) { toggleAlumniRow(id, c); } },
    guruprofil: { getSet: function() { return selectedProfilGuruIds; }, toggle: function(id, c) { toggleProfilGuruRow(id, c); } },
    prestasi:   { getSet: function() { return selectedPrestasiIds; },   toggle: function(id, c) { togglePrestasiRow(id, c); } },
    inventaris: { getSet: function() { return selectedInventarisIds; }, toggle: function(id, c) { toggleInventarisRow(id, c); } },
    nilai:      { getSet: function() { return selectedNilaiIds; },      toggle: function(id, c) { toggleNilaiRow(id, c); } },
    jadwal:     { getSet: function() { return (typeof selectedJadwalRows !== 'undefined') ? selectedJadwalRows : new Set(); }, toggle: function(id, c) { if (typeof toggleJadwalRow === 'function') toggleJadwalRow(parseInt(id, 10), c); } },
    pendaftar:  { getSet: function() { return (typeof pendaftarSelected !== 'undefined') ? pendaftarSelected : new Set(); }, toggle: function(id, c) { if (typeof togglePendaftarRow === 'function') togglePendaftarRow(id, c); } },
    tabungan:   { getSet: function() { return (typeof tabunganSelected !== 'undefined') ? tabunganSelected : new Set(); }, toggle: function(id, c) { if (typeof toggleTabunganRow === 'function') toggleTabunganRow(id, c); } },
    riwayat:    { getSet: function() { return (typeof _sikasSelectedRiwayat !== 'undefined') ? _sikasSelectedRiwayat : new Set(); }, toggle: function(id, c) { if (typeof sikasToggleRiwayatRow === 'function') sikasToggleRiwayatRow(id, c); } }
  };

  function getSelectionSet(type) {
    var entry = mobileSelectRegistry[type];
    return entry ? entry.getSet() : null;
  }

  function getToggleFn(type) {
    var entry = mobileSelectRegistry[type];
    return entry ? entry.toggle : null;
  }

  function handleStart(e, isTouch) {
    if (window.innerWidth >= 768) return;
    // Jangan sabotase elemen interaktif (checkbox, tombol aksi, link) --
    // biarkan perilaku bawaannya jalan normal, jangan dianggap gestur pilih-baris.
    if (e.target.closest('input, button, a, .btn-aksi-tabel, .btn-aksi-siswa')) return;
    const tr = e.target.closest('.select-row-target');
    if (!tr) return;
    activeRow = tr;
    longPressed = false;
    
    const touch = isTouch ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;

    if (touchTimer) clearTimeout(touchTimer);
    touchTimer = setTimeout(() => {
      const type = tr.dataset.type;
      const id = tr.dataset.id;
      const set = getSelectionSet(type);
      const toggle = getToggleFn(type);
      if (set && toggle) {
        longPressed = true;
        const currentlySelected = set.has(String(id));
        toggle(id, !currentlySelected);
        if (isTouch && e.cancelable) {
          e.preventDefault();
        }
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }, 500);
  }

  function handleMove(e, isTouch) {
    if (!activeRow) return;
    const touch = isTouch ? e.touches[0] : e;
    const diffX = Math.abs(touch.clientX - startX);
    const diffY = Math.abs(touch.clientY - startY);
    if (diffX > 8 || diffY > 8) {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      activeRow = null;
    }
  }

  function handleEnd(e) {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
    if (activeRow) {
      const tr = activeRow;
      activeRow = null;
      
      if (longPressed) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const type = tr.dataset.type;
      const id = tr.dataset.id;
      const set = getSelectionSet(type);
      const toggle = getToggleFn(type);
      
      if (set && set.size > 0 && toggle) {
        e.preventDefault();
        e.stopPropagation();
        const currentlySelected = set.has(String(id));
        toggle(id, !currentlySelected);
      }
    }
  }

  document.addEventListener('touchstart', (e) => handleStart(e, true), { passive: false });
  document.addEventListener('touchmove', (e) => handleMove(e, true), { passive: true });
  document.addEventListener('touchend', handleEnd, { passive: false });

  document.addEventListener('mousedown', (e) => handleStart(e, false));
  document.addEventListener('mousemove', (e) => handleMove(e, false));
  document.addEventListener('mouseup', handleEnd);
})();

// =====================================================
// GANTI PASSWORD - Siswa & Guru/Pengajar
// =====================================================

