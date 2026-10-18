  <!-- INLINE QR CAMERA MODAL -->
  <div id="qrCameraModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;padding:16px;">
    <div style="background:#0f172a;border-radius:20px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.1);">
      <!-- Header -->
      <div style="background:#152238;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          <span style="color:white;font-weight:700;font-size:14px;letter-spacing:0.5px;">SCAN QR ABSENSI</span>
        </div>
        <button onclick="closeQRCameraModal()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
      </div>
      <!-- Scan Notif -->
      <div id="inlineScanNotif" style="display:none;padding:10px 16px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div id="inlineNIcon" style="font-size:20px;margin-bottom:2px;"></div>
        <div id="inlineNNama" style="color:white;font-weight:800;font-size:14px;"></div>
        <div id="inlineNDetail" style="color:rgba(255,255,255,0.8);font-size:11px;margin-top:2px;"></div>
      </div>
      <!-- Video -->
      <div style="position:relative;background:#000;margin:16px;border-radius:14px;overflow:hidden;">
        <video id="inlineQrVideo" autoplay playsinline muted style="width:100%;display:block;min-height:200px;object-fit:cover;"></video>
        <canvas id="inlineQrCanvas" style="display:none;"></canvas>
        <!-- Aim overlay -->
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <div id="inlineAimBox" style="width:200px;height:200px;position:relative;">
            <div style="position:absolute;top:0;left:0;width:28px;height:28px;border-top:4px solid #1b2a4a;border-left:4px solid #1b2a4a;border-radius:6px 0 0 0;"></div>
            <div style="position:absolute;top:0;right:0;width:28px;height:28px;border-top:4px solid #1b2a4a;border-right:4px solid #1b2a4a;border-radius:0 6px 0 0;"></div>
            <div style="position:absolute;bottom:0;left:0;width:28px;height:28px;border-bottom:4px solid #1b2a4a;border-left:4px solid #1b2a4a;border-radius:0 0 0 6px;"></div>
            <div style="position:absolute;bottom:0;right:0;width:28px;height:28px;border-bottom:4px solid #1b2a4a;border-right:4px solid #1b2a4a;border-radius:0 0 6px 0;"></div>
            <div id="inlineScanLine" style="position:absolute;left:4px;right:4px;height:3px;background:#1b2a4a;top:6px;border-radius:2px;animation:qrScanAnim 1.6s ease-in-out infinite;"></div>
          </div>
        </div>
        <!-- Loading overlay -->
        <div id="inlineCamLoading" style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
          <div style="width:36px;height:36px;border:3px solid #1e293b;border-top:3px solid #1b2a4a;border-radius:50%;animation:qrSpinAnim 0.8s linear infinite;"></div>
          <span style="color:#64748b;font-size:13px;">Memulai kamera...</span>
        </div>
      </div>
      <!-- Status -->
      <div id="inlineCamStatus" style="text-align:center;font-size:13px;color:#94a3b8;padding:0 16px 8px;min-height:32px;">Arahkan QR code ke kamera</div>
      <!-- Tip/Error -->
      <div id="inlineCamTip" style="display:none;margin:0 16px 12px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:10px 14px;font-size:11px;color:#94a3b8;line-height:1.6;"></div>
      <!-- Buttons -->
      <div style="display:flex;gap:8px;padding:0 16px 16px;flex-wrap:wrap;">
        <button onclick="inlineSwitchCam()" style="flex:1;min-width:90px;background:#1b2a4a;color:white;border:none;padding:10px 12px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#152238'" onmouseout="this.style.background='#1b2a4a'">⇄ Ganti Kamera</button>
        <button id="inlineTorchBtn" onclick="inlineToggleTorch()" style="display:none;flex:1;min-width:80px;background:#1e293b;color:white;border:1px solid #334155;padding:10px 12px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;">⚡ Senter</button>
        <button onclick="closeQRCameraModal()" style="flex:1;min-width:80px;background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:10px 12px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;">✕ Tutup</button>
      </div>
    </div>
  </div>
