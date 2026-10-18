<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Scan QR - SIAKAD</title>
<link rel="icon" type="image/png" href="../assets/img/logo.png">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0f172a;color:white;font-family:'Segoe UI',system-ui,sans-serif;
  display:flex;flex-direction:column;align-items:center;
  min-height:100vh;padding:16px;gap:12px;overflow-x:hidden;}
h2{font-size:14px;font-weight:700;color:#e2e8f0;letter-spacing:1px;margin-top:4px;}

#scanNotif{display:none;position:fixed;top:0;left:0;right:0;z-index:999;
  padding:11px 18px 13px;text-align:center;
  border-bottom:1px solid rgba(255,255,255,.1);
  box-shadow:0 4px 20px rgba(0,0,0,.5);}
#scanNotif.ok {background:linear-gradient(135deg,#065f46,#047857);display:block;}
#scanNotif.dup{background:linear-gradient(135deg,#78350f,#b45309);display:block;}
#scanNotif.err{background:linear-gradient(135deg,#7f1d1d,#b91c1c);display:block;}
#scanNotif.pop{animation:popIn .3s cubic-bezier(.4,0,.2,1);}
@keyframes popIn{0%{transform:translateY(-30px);opacity:0}100%{transform:translateY(0);opacity:1}}
.n-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:.5;color:#fff;margin-bottom:3px;}
.n-icon{display:flex;align-items:center;justify-content:center;margin-bottom:2px;color:#fff;}
.n-icon svg{width:22px;height:22px;}
.n-nama{font-size:15px;font-weight:800;color:#fff;}
.n-detail{font-size:11px;margin-top:2px;opacity:.85;color:#fff;}

#flashOverlay{display:none;position:fixed;inset:0;z-index:998;pointer-events:none;border:5px solid transparent;}
#flashOverlay.ok {display:block;border-color:#10b981;animation:ff .5s ease forwards;}
#flashOverlay.err{display:block;border-color:#ef4444;animation:ff .5s ease forwards;}
@keyframes ff{0%{opacity:1}100%{opacity:0}}

#videoWrap{position:relative;width:100%;max-width:440px;}
video{width:100%;border-radius:14px;display:block;background:#000;min-height:220px;object-fit:cover;}
canvas{display:none;}
.overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}
.box{width:220px;height:220px;position:relative;}
.corner{position:absolute;width:28px;height:28px;border-color:#6366f1;border-style:solid;}
.tl{top:0;left:0;border-width:4px 0 0 4px;border-radius:6px 0 0 0;}
.tr{top:0;right:0;border-width:4px 4px 0 0;border-radius:0 6px 0 0;}
.bl{bottom:0;left:0;border-width:0 0 4px 4px;border-radius:0 0 0 6px;}
.br{bottom:0;right:0;border-width:0 4px 4px 0;border-radius:0 0 6px 0;}
.scanline{position:absolute;left:4px;right:4px;height:3px;
  background:linear-gradient(90deg,transparent,#818cf8,#6366f1,#818cf8,transparent);
  top:10px;border-radius:2px;animation:scan 1.6s ease-in-out infinite;}
@keyframes scan{0%{top:6px;opacity:1}100%{top:214px;opacity:.2}}
.box.found .corner{border-color:#4ade80;}
.box.found .scanline{background:linear-gradient(90deg,transparent,#4ade80,transparent);}

#status{font-size:13px;color:#94a3b8;text-align:center;max-width:360px;min-height:36px;line-height:1.6;padding:0 8px;}
#status.ok{color:#4ade80;font-weight:700;font-size:15px;}
#status.err{color:#f87171;}

#loading{color:#64748b;font-size:13px;text-align:center;}
.spinner{width:34px;height:34px;border:3px solid #1e293b;border-top:3px solid #6366f1;
  border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px;}
@keyframes spin{to{transform:rotate(360deg);}}
#loadingText{display:none;margin-top:8px;font-size:12px;color:#64748b;}

.btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%;max-width:440px;}
.btn{flex:1;min-width:100px;background:#4f46e5;color:white;border:none;
  padding:11px 14px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;transition:background .2s;}
.btn:hover{background:#4338ca;}
.btn.sec{background:#1e293b;border:1px solid #334155;}
.btn.sec:hover{background:#334155;}
.btn.retry{background:#059669;}
.btn.retry:hover{background:#047857;}
.btn.torch-on{background:#ca8a04!important;}

#tipBox{background:#1e293b;border:1px solid #334155;border-radius:10px;
  padding:10px 14px;font-size:11px;color:#94a3b8;max-width:400px;line-height:1.6;display:none;}
</style>
</head>
<body>

<div id="scanNotif">
  <div class="n-label">Terakhir Di-scan</div>
  <span class="n-icon" id="nIcon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  </span>
  <div class="n-nama" id="nNama"></div>
  <div class="n-detail" id="nDetail"></div>
</div>

<div id="flashOverlay"></div>

<h2>
  <span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
    SCAN QR ABSENSI
  </span>
</h2>

<div id="loading">
  <div class="spinner" id="spinnerEl"></div>
  <div id="loadingText">Memulai kamera...</div>
</div>

<div id="videoWrap" style="display:none">
  <video id="video" autoplay playsinline muted></video>
  <canvas id="canvas"></canvas>
  <div class="overlay">
    <div class="box" id="aimBox">
      <div class="corner tl"></div><div class="corner tr"></div>
      <div class="corner bl"></div><div class="corner br"></div>
      <div class="scanline"></div>
    </div>
  </div>
</div>

<div id="status">Memulai kamera...</div>
<div id="tipBox"></div>

<div class="btns" id="btns">
  <button class="btn" onclick="switchCam()">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;">
      <path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>Ganti Kamera
  </button>
  <button class="btn sec" id="torchBtn" onclick="toggleTorch()" style="display:none">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"></path>
    </svg>Senter
  </button>
  <button class="btn sec" onclick="window.close()">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;">
      <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>Tutup
  </button>
</div>

<script>
// Cek autentikasi — scanner hanya bisa dibuka setelah login
(function checkAuth() {
  var token = localStorage.getItem('siakad_token');
  if (!token) {
    document.body.style.display = 'flex';
    document.body.innerHTML = '<div style="color:#f87171;text-align:center;margin:auto;padding:40px;font-family:sans-serif"><p style="font-size:16px;font-weight:700">⛔ Sesi tidak valid</p><p style="font-size:13px;margin-top:8px;opacity:.7">Silakan login terlebih dahulu.</p></div>';
    setTimeout(function(){ if(window.opener) window.close(); }, 2500);
    throw new Error('Unauthorized');
  }
})();

var SCANNER_ORIGIN = window.location.origin; // dipakai untuk postMessage yang aman
var LS_KEY = 'siakad_qr_result';
var stream = null, facing = 'environment', scanLoop = null, isSendingResult = false;
// Cooldown per-KODE (bukan cooldown global) supaya guru & siswa yang beda kartu QR
// bisa langsung terbaca berturut-turut tanpa nunggu jeda. Kode yg SAMA tetap
// ditahan sebentar biar tidak ke-double-scan tanpa sengaja.
var recentCodes = {};
var DUPLICATE_WINDOW = 3500;
var torchOn = false, torchTrack = null;
var retryCount = 0, retryTimer = null;

var video    = document.getElementById('video');
var canvas   = document.getElementById('canvas');
var ctx      = canvas.getContext('2d', {willReadFrequently:true});
var statusEl = document.getElementById('status');
var loading  = document.getElementById('loading');
var loadText = document.getElementById('loadingText');
var wrap     = document.getElementById('videoWrap');
var tipBox   = document.getElementById('tipBox');
var aimBox   = document.getElementById('aimBox');
var canvas2  = document.createElement('canvas');
var ctx2     = canvas2.getContext('2d', {willReadFrequently:true});

function showTip(m){tipBox.style.display='block';tipBox.innerHTML=m;}
function hideTip(){tipBox.style.display='none';}

function resetBtns(){
  document.getElementById('btns').innerHTML=
    '<button class="btn" onclick="switchCam()">'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>Ganti Kamera</button>'+
    '<button class="btn sec" id="torchBtn" onclick="toggleTorch()" style="display:none">'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"></path></svg>Senter</button>'+
    '<button class="btn sec" onclick="window.close()">'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Tutup</button>';
}

async function startCam(f){
  try{
    if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
    if(stream) stream.getTracks().forEach(t=>t.stop());
    if(scanLoop){clearInterval(scanLoop);scanLoop=null;}
    loading.style.display='block'; wrap.style.display='none';
    document.getElementById('spinnerEl').style.display='block';
    if(loadText) loadText.style.display='block';
    statusEl.className=''; statusEl.textContent='Memulai kamera...';
    hideTip();

    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
      throw {name:'NotSupportedError',message:'Browser tidak mendukung akses kamera. Gunakan Chrome/Edge/Brave terbaru.'};
    }

    // Try progressively relaxed constraints
    var constraintsList=[
      {video:{facingMode:f==='environment'?{ideal:'environment'}:'user',width:{ideal:1280},height:{ideal:720}}},
      {video:{facingMode:f==='environment'?{ideal:'environment'}:'user'}},
      {video:true}
    ];

    var lastErr=null;
    for(var ci=0;ci<constraintsList.length;ci++){
      try{
        stream=await Promise.race([
          navigator.mediaDevices.getUserMedia(constraintsList[ci]),
          new Promise((_,reject)=>setTimeout(()=>reject({name:'TimeoutError',message:'Kamera timeout'}),10000))
        ]);
        break;
      }catch(e){
        lastErr=e;
        if(e.name==='NotAllowedError'||e.name==='PermissionDeniedError'||e.name==='NotFoundError') throw e;
      }
    }
    if(!stream) throw lastErr;

    torchTrack=stream.getVideoTracks()[0];
    if(torchTrack){
      var caps=torchTrack.getCapabilities?torchTrack.getCapabilities():{};
      var torchBtnEl=document.getElementById('torchBtn');
      if(caps.torch&&torchBtnEl) torchBtnEl.style.display='';
    }
    video.srcObject=stream;
    await new Promise((res,rej)=>{
      var _done=false;
      function _tryPlay(){if(_done)return;_done=true;video.play().then(res).catch(rej);}
      video.onloadedmetadata=_tryPlay;
      video.oncanplay=_tryPlay;
      if(video.readyState>=video.HAVE_METADATA)_tryPlay();
      setTimeout(()=>{if(!_done){_done=true;rej(new Error('Video timeout'));}},8000);
    });
    retryCount=0;
    loading.style.display='none'; wrap.style.display='block';
    statusEl.textContent='Arahkan QR ke kamera';
    resetBtns();
    beginScan();
  }catch(e){
    loading.style.display='none';
    statusEl.className='err';

    // Auto-retry for transient errors (not permanent denials or no-device)
    var isPermanent=(e.name==='NotAllowedError'||e.name==='PermissionDeniedError'||e.name==='NotFoundError'||e.name==='DevicesNotFoundError'||e.name==='NotSupportedError');

    if(!isPermanent && retryCount<5){
      retryCount++;
      var delay=retryCount*1000;
      statusEl.textContent='Kamera gagal, mencoba ulang ('+(delay/1000)+'s)...';
      retryTimer=setTimeout(()=>startCam(facing),delay);
      return;
    }

    statusEl.innerHTML='Kamera gagal: '+(e.name||'Error')+'<br><small>'+(e.message||'')+'</small>';
    var tips='';
    if(e.name==='NotAllowedError'||e.name==='PermissionDeniedError')
      tips='Izin kamera ditolak. Klik ikon kunci/info di address bar → Izinkan kamera → Refresh halaman ini.';
    else if(e.name==='NotFoundError'||e.name==='DevicesNotFoundError')
      tips='Kamera tidak ditemukan di perangkat ini.';
    else if(e.name==='NotReadableError')
      tips='Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lain lalu coba lagi.';
    else if(e.name==='TimeoutError')
      tips=e.message||'Kamera timeout.';
    if(tips) showTip('⚠️ '+tips);

    document.getElementById('btns').innerHTML=
      '<button class="btn retry" onclick="retryCount=0;startCam(facing)">Coba Lagi</button>'+
      '<button class="btn" onclick="switchCam()">Ganti Kamera</button>'+
      '<button class="btn sec" onclick="window.close()">Tutup</button>';
  }
}

function switchCam(){facing=facing==='environment'?'user':'environment';retryCount=0;startCam(facing);}

async function toggleTorch(){
  if(!torchTrack)return;
  torchOn=!torchOn;
  try{
    await torchTrack.applyConstraints({advanced:[{torch:torchOn}]});
    var btn=document.getElementById('torchBtn');
    var svg='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"></path></svg>';
    btn.innerHTML=svg+(torchOn?'Senter ON':'Senter');
    btn.className=torchOn?'btn torch-on':'btn sec';
  }catch(e){torchOn=!torchOn;}
}

function beginScan(){
  if(typeof ZXing!=='undefined'){runWithZXing();}
  else{
    var s=document.createElement('script');
    s.src='https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
    s.onload=function(){runWithZXing();};
    s.onerror=function(){loadJsQR();};
    document.head.appendChild(s);
  }
}

function loadJsQR(){
  if(typeof jsQR!=='undefined'){runWithJsQR();return;}
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  s.onload=function(){runWithJsQR();};
  s.onerror=function(){
    statusEl.className='err';
    statusEl.textContent='Gagal memuat library scanner. Cek koneksi internet.';
  };
  document.head.appendChild(s);
}

function runWithZXing(){
  try{
    var hints=new Map();
    hints.set(ZXing.DecodeHintType.TRY_HARDER,true);
    hints.set(ZXing.DecodeHintType.ALSO_INVERTED,true);
    var reader=new ZXing.BrowserQRCodeReader(hints);
    scanLoop=setInterval(function(){
      // Loop kamera TIDAK boleh berhenti hanya karena hasil scan sebelumnya
      // masih diproses — supaya kartu QR berikutnya (guru/siswa lain) bisa
      // langsung kebaca tanpa jeda.
      if(video.readyState<video.HAVE_ENOUGH_DATA)return;
      var W=video.videoWidth,H=video.videoHeight;
      if(!W||!H)return;
      canvas.width=W;canvas.height=H;
      ctx.drawImage(video,0,0,W,H);
      tryZXing(reader,canvas,W,H)||
      tryZXingFilter(reader,W,H,'contrast(2) brightness(1.15)')||
      tryZXingCrop(reader,W,H);
    },100);
  }catch(e){loadJsQR();}
}

function tryZXing(reader,cvs,W,H){
  try{
    var lum=new ZXing.HTMLCanvasElementLuminanceSource(cvs);
    var bmp=new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(lum));
    var result=reader.decodeBitmap(bmp);
    if(result&&result.getText()){onDetected(result.getText());return true;}
  }catch(e){}
  return false;
}

function tryZXingFilter(reader,W,H,filter){
  try{
    canvas2.width=W;canvas2.height=H;
    ctx2.filter=filter;ctx2.drawImage(video,0,0,W,H);ctx2.filter='none';
    return tryZXing(reader,canvas2,W,H);
  }catch(e){return false;}
}

function tryZXingCrop(reader,W,H){
  try{
    var cw=Math.round(W*0.65),ch=Math.round(H*0.65);
    var cx=Math.round((W-cw)/2),cy=Math.round((H-ch)/2);
    canvas2.width=cw;canvas2.height=ch;
    ctx2.filter='none';ctx2.drawImage(video,cx,cy,cw,ch,0,0,cw,ch);
    return tryZXing(reader,canvas2,cw,ch);
  }catch(e){return false;}
}

function runWithJsQR(){
  scanLoop=setInterval(function(){
    if(video.readyState<video.HAVE_ENOUGH_DATA)return;
    var W=video.videoWidth,H=video.videoHeight;
    if(!W||!H)return;
    canvas.width=W;canvas.height=H;
    ctx.drawImage(video,0,0,W,H);
    var d=ctx.getImageData(0,0,W,H);
    var r=jsQR(d.data,W,H,{inversionAttempts:'attemptBoth'});
    if(r&&r.data) onDetected(r.data);
  },100);
}

function onDetected(text){
  var t=String(text).trim();
  if(!t)return;
  var now=Date.now();
  // Kode yang SAMA baru boleh diproses lagi setelah DUPLICATE_WINDOW.
  // Kode yang BEDA (siswa/guru lain) selalu langsung diproses — inilah
  // yang bikin scan berturut-turut jadi cepat.
  var last=recentCodes[t];
  if(last && (now-last)<DUPLICATE_WINDOW) return;
  recentCodes[t]=now;
  // Beresin cache biar tidak numpuk terus
  for(var k in recentCodes){ if(now-recentCodes[k]>DUPLICATE_WINDOW) delete recentCodes[k]; }
  aimBox.classList.add('found');
  setTimeout(()=>aimBox.classList.remove('found'),400);
  handleResult(t);
}

function handleResult(text){
  if(!text||text.trim()==='')return;
  isSendingResult=true;
  statusEl.className='ok';
  statusEl.textContent='Terdeteksi! Mengirim...';
  var payload={nisn:text.trim(),ts:Date.now()};
  try{
    if(window.opener&&!window.opener.closed)
      window.opener.postMessage({type:'QR_SCAN_RESULT',nisn:text.trim(),ts:Date.now()}, SCANNER_ORIGIN);
  }catch(e){}
  try{localStorage.setItem(LS_KEY,JSON.stringify(payload));}catch(e){}
  // Delay ini cuma buat teks status di layar, TIDAK menghentikan kamera —
  // kamera tetap scan terus di background jadi kartu berikutnya instan kebaca.
  setTimeout(function(){
    statusEl.className='';
    statusEl.textContent='Siap scan berikutnya...';
    isSendingResult=false;
  },500);
}

window.addEventListener('message',function(ev){
  if(!ev.data)return;
  if(ev.data.type==='SCAN_SUCCESS')
    showScanNotif('ok',ev.data.nama,(ev.data.kelas||'')+' \u2022 Berhasil ditambahkan');
  else if(ev.data.type==='SCAN_DUPLICATE')
    showScanNotif('dup',ev.data.nama||'Sudah terscan',(ev.data.kelas?ev.data.kelas+' \u2022 ':'')+'Sudah ada di antrian');
  else if(ev.data.type==='SCAN_ERROR')
    showScanNotif('err','Id Tidak Dikenal',ev.data.message||'Tidak ditemukan');
});

function iconSVG(type){
  if(type==='ok') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  if(type==='dup') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
}

function showScanNotif(type,nama,detail){
  var n=document.getElementById('scanNotif');
  var f=document.getElementById('flashOverlay');
  if(!n)return;
  document.getElementById('nIcon').innerHTML=iconSVG(type);
  document.getElementById('nNama').textContent=nama;
  document.getElementById('nDetail').textContent=detail;
  n.className='';void n.offsetWidth;n.className=type+' pop';
  if(f){f.className='';void f.offsetWidth;f.className=type==='ok'?'ok':'err';setTimeout(()=>f.className='',550);}
}

// Langsung nyalakan kamera tanpa perlu klik apapun
startCam(facing);
</script>
</body>
</html>