  (function(){
    var _inlineStream=null, _inlineFacing='environment', _inlineScanLoop=null;
    var _inlineTorchOn=false, _inlineTorchTrack=null;
    var _inlineCtx=null, _inlineCtx2=null, _inlineCanvas2=document.createElement('canvas');
    // Cooldown per-KODE (bukan cooldown global) supaya QR guru & siswa yang
    // berbeda bisa langsung terbaca berturut-turut. Reader ZXing dibuat sekali
    // saja (bukan tiap tick) biar loop scan lebih ringan & responsif.
    var _inlineRecentCodes={}, _inlineDupWindow=3500;
    var _inlineZxReader=null, _inlineZxHints=null;

    window.openQRCameraModal = function() {
      var modal = document.getElementById('qrCameraModal');
      modal.style.display='flex';
      _inlineRecentCodes={}; // reset cooldown tiap kali modal dibuka
      _inlineStartCam('environment');
    };
    window.closeQRCameraModal = function() {
      _inlineStop();
      document.getElementById('qrCameraModal').style.display='none';
      document.getElementById('inlineScanNotif').style.display='none';
    };
    window.inlineSwitchCam = function(){
      _inlineFacing = _inlineFacing==='environment'?'user':'environment';
      _inlineStartCam(_inlineFacing);
    };
    window.inlineToggleTorch = function(){
      if(!_inlineTorchTrack)return;
      _inlineTorchOn=!_inlineTorchOn;
      _inlineTorchTrack.applyConstraints({advanced:[{torch:_inlineTorchOn}]}).catch(function(){_inlineTorchOn=!_inlineTorchOn;});
      var btn=document.getElementById('inlineTorchBtn');
      if(btn) btn.textContent=_inlineTorchOn?'⚡ ON':'⚡ Senter';
    };

    function _inlineStop(){
      if(_inlineScanLoop){clearInterval(_inlineScanLoop);_inlineScanLoop=null;}
      if(_inlineStream){_inlineStream.getTracks().forEach(function(t){t.stop();});_inlineStream=null;}
      _inlineZxReader=null; // reset biar reader baru dipakai untuk stream kamera yg baru
    }

    function _inlineStartCam(facing){
      _inlineStop();
      var video=document.getElementById('inlineQrVideo');
      var loading=document.getElementById('inlineCamLoading');
      var status=document.getElementById('inlineCamStatus');
      var tip=document.getElementById('inlineCamTip');
      if(loading) loading.style.display='flex';
      if(status){status.style.color='#94a3b8';status.textContent='Memulai kamera...';}
      if(tip) tip.style.display='none';
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
        if(loading) loading.style.display='none';
        if(status){status.style.color='#f87171';status.textContent='Browser tidak mendukung kamera. Gunakan Chrome/Safari terbaru.';}
        return;
      }
      var constraints={video:{facingMode:facing==='environment'?{ideal:'environment'}:'user',width:{ideal:1280},height:{ideal:720}}};
      var timeoutId=setTimeout(function(){
        if(loading) loading.style.display='none';
        if(status){status.style.color='#f87171';status.textContent='Kamera timeout. Coba lagi.';}
      },12000);
      navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
        clearTimeout(timeoutId);
        _inlineStream=stream;
        _inlineTorchTrack=stream.getVideoTracks()[0];
        if(_inlineTorchTrack){
          var caps=_inlineTorchTrack.getCapabilities?_inlineTorchTrack.getCapabilities():{};
          var torchBtn=document.getElementById('inlineTorchBtn');
          if(caps.torch&&torchBtn) torchBtn.style.display='';
        }
        var _started=false;
        function _onReady(){
          if(_started)return; _started=true;
          video.play().then(function(){
            if(loading) loading.style.display='none';
            if(status){status.style.color='#94a3b8';status.textContent='Arahkan QR ke kamera';}
            _inlineBeginScan();
          }).catch(function(e){
            clearTimeout(timeoutId);
            if(loading) loading.style.display='none';
            if(status){status.style.color='#f87171';status.textContent='Gagal memutar video: '+e.message;}
          });
        }
        video.onloadedmetadata=_onReady;
        video.oncanplay=_onReady;
        video.srcObject=stream;
        // If already ready (stream attached before events fire)
        if(video.readyState>=video.HAVE_METADATA) _onReady();
      }).catch(function(e){
        clearTimeout(timeoutId);
        if(loading) loading.style.display='none';
        if(status){status.style.color='#f87171';status.textContent='Kamera gagal: '+(e.name||'Error');}
        var tips='';
        if(e.name==='NotAllowedError'||e.name==='PermissionDeniedError')
          tips='Izin kamera ditolak. Klik ikon kunci di address bar → Izinkan Kamera → Refresh.';
        else if(e.name==='NotFoundError')
          tips='Kamera tidak ditemukan di perangkat ini.';
        else if(e.name==='NotReadableError')
          tips='Kamera sedang dipakai aplikasi lain. Tutup dulu lalu coba lagi.';
        if(tips&&tip){tip.textContent='⚠️ '+tips;tip.style.display='block';}
      });
    }

    function _inlineBeginScan(){
      var video=document.getElementById('inlineQrVideo');
      var canvas=document.getElementById('inlineQrCanvas');
      if(!_inlineCtx) _inlineCtx=canvas.getContext('2d',{willReadFrequently:true});
      var ctx2=_inlineCanvas2.getContext('2d',{willReadFrequently:true});

      function _getZxReader(){
        // Dibuat SEKALI dan dipakai ulang tiap tick — bikin reader baru tiap
        // 120ms itu berat & bikin scan kartu berikutnya jadi lambat/nge-lag.
        if(!_inlineZxReader && typeof ZXing!=='undefined'){
          _inlineZxHints=new Map();
          _inlineZxHints.set(ZXing.DecodeHintType.TRY_HARDER,true);
          _inlineZxHints.set(ZXing.DecodeHintType.ALSO_INVERTED,true);
          _inlineZxReader=new ZXing.BrowserQRCodeReader(_inlineZxHints);
        }
        return _inlineZxReader;
      }

      function tryDecode(){
        if(!video||video.readyState<video.HAVE_ENOUGH_DATA)return;
        var W=video.videoWidth,H=video.videoHeight;
        if(!W||!H)return;
        canvas.width=W;canvas.height=H;
        _inlineCtx.drawImage(video,0,0,W,H);
        // Try ZXing first
        var reader=_getZxReader();
        if(reader){
          try{
            var lum=new ZXing.HTMLCanvasElementLuminanceSource(canvas);
            var bmp=new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(lum));
            var result=reader.decodeBitmap(bmp);
            if(result&&result.getText()){_inlineOnDetected(result.getText());return;}
          }catch(e){}
          // try contrast filter
          try{
            _inlineCanvas2.width=W;_inlineCanvas2.height=H;
            ctx2.filter='contrast(2) brightness(1.15)';ctx2.drawImage(video,0,0,W,H);ctx2.filter='none';
            var lum2=new ZXing.HTMLCanvasElementLuminanceSource(_inlineCanvas2);
            var bmp2=new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(lum2));
            var r2=reader.decodeBitmap(bmp2);
            if(r2&&r2.getText()){_inlineOnDetected(r2.getText());return;}
          }catch(e){}
        }
        // Fallback jsQR
        if(typeof jsQR!=='undefined'){
          var d=_inlineCtx.getImageData(0,0,W,H);
          var r=jsQR(d.data,W,H,{inversionAttempts:'attemptBoth'});
          if(r&&r.data){_inlineOnDetected(r.data);}
        }
      }

      function loadLibsAndScan(){
        if(typeof ZXing!=='undefined'||typeof jsQR!=='undefined'){
          _inlineScanLoop=setInterval(tryDecode,100);return;
        }
        var s=document.createElement('script');
        s.src='https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
        s.onload=function(){_inlineScanLoop=setInterval(tryDecode,100);};
        s.onerror=function(){
          var s2=document.createElement('script');
          s2.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
          s2.onload=function(){_inlineScanLoop=setInterval(tryDecode,100);};
          s2.onerror=function(){
            var st=document.getElementById('inlineCamStatus');
            if(st){st.style.color='#f87171';st.textContent='Gagal memuat library scanner. Cek koneksi internet.';}
          };
          document.head.appendChild(s2);
        };
        document.head.appendChild(s);
      }
      loadLibsAndScan();
    }

    function _inlineOnDetected(text){
      var t=String(text).trim();
      if(!t)return;
      var now=Date.now();
      // Kode yang SAMA ditahan sebentar (anti double-scan tak sengaja).
      // Kode yang BEDA (siswa/guru lain) langsung diproses — tidak ada lagi
      // jeda global yang bikin antrian scan jadi lambat.
      var last=_inlineRecentCodes[t];
      if(last && (now-last)<_inlineDupWindow) return;
      _inlineRecentCodes[t]=now;
      for(var k in _inlineRecentCodes){ if(now-_inlineRecentCodes[k]>_inlineDupWindow) delete _inlineRecentCodes[k]; }
      // Animate aim box
      var aim=document.getElementById('inlineAimBox');
      if(aim){
        var corners=aim.querySelectorAll('div[style*="border"]');
        corners.forEach(function(c){c.style.borderColor='#f59e0b';});
        setTimeout(function(){corners.forEach(function(c){c.style.borderColor='#6366f1';});},400);
      }
      _inlineHandleResult(t);
    }

    function _inlineHandleResult(text){
      if(!text||!text.trim())return;
      var status=document.getElementById('inlineCamStatus');
      if(status){status.style.color='#f59e0b';status.textContent='Terdeteksi! Memproses...';}
      // Hanya gunakan postMessage — listener di script.js akan route ke onScanRouted
      // Ini mencegah double-processing. Kamera TIDAK dihentikan, jadi kartu
      // berikutnya (guru/siswa lain) langsung kebaca tanpa nunggu.
      try{window.postMessage({type:'QR_SCAN_RESULT',nisn:text.trim(),ts:Date.now()},'*');}catch(e){}
      setTimeout(function(){
        if(status){status.style.color='#94a3b8';status.textContent='Siap scan berikutnya...';}
      },700);
    }

    // Show scan notif inside modal
    var _origShowScanNotif = null;
    document.addEventListener('DOMContentLoaded', function(){
      // Intercept scan result feedback into modal
    });

    // Listen for feedback from app
    window.addEventListener('message', function(ev){
      var modal=document.getElementById('qrCameraModal');
      if(!modal||modal.style.display==='none')return;
      if(!ev.data)return;
      var notif=document.getElementById('inlineScanNotif');
      var icon=document.getElementById('inlineNIcon');
      var nama=document.getElementById('inlineNNama');
      var detail=document.getElementById('inlineNDetail');
      if(!notif)return;
      if(ev.data.type==='SCAN_SUCCESS'){
        notif.style.background='#0f1d35';
        if(icon) icon.textContent='✔';
        if(nama) nama.textContent=ev.data.nama||'';
        if(detail) detail.textContent=(ev.data.kelas||'')+' • Berhasil ditambahkan';
        notif.style.display='block';
      } else if(ev.data.type==='SCAN_DUPLICATE'){
        notif.style.background='#78350f';
        if(icon) icon.textContent='⚠';
        if(nama) nama.textContent=ev.data.nama||'Sudah terscan';
        if(detail) detail.textContent=(ev.data.kelas?ev.data.kelas+' • ':'')+'Sudah ada di antrian';
        notif.style.display='block';
      } else if(ev.data.type==='SCAN_ERROR'){
        notif.style.background='#7f1d1d';
        if(icon) icon.textContent='✕';
        if(nama) nama.textContent=ev.data.nama||'Id Tidak Dikenal';
        if(detail) detail.textContent=ev.data.kelas||ev.data.message||'Tidak ditemukan';
        notif.style.display='block';
      }
    });
  })();
