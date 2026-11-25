/* NAVARRO 360 V28.3 — Escáner profesional exclusivo para ALTAS.
 * Reutiliza el mismo motor html5-qrcode del escáner de ventas, pero jamás
 * llama al carrito. Cámara iPhone/Android, teclado HID en PC y entrada manual.
 * Escritura de productos: exclusivamente el módulo V28 + servidor Windows.
 */
(function(){
 'use strict';
 if(window.NAVARRO_ALTA_ESCANER_V283)return;
 const form=document.getElementById('nv23-form');
 const mask=document.getElementById('nv23-mask');
 const controls=document.getElementById('nv24-barcode-controls');
 if(!form||!mask||!controls||!form.elements.code)return;
 const field=form.elements.code;
 const CDN='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
 const valid=/^[0-9]{5,30}$/;
 let scanner=null,launching=null,stopping=null,library=null,epoch=0,accepted=false;
 let track=null,caps=null,torch=false,hardwareZoom=false,zoomValue=1;
 let selectedFacing='environment',restarting=false,photoBusy=false,quaggaLoading=null;
 let alternateTimer=0,alternateEpoch=0,alternateWorking=false,alternateState='Inactivo';
 let firstRead='',firstReadTime=0,firstReadCount=0,lastAlt='',lastAltTime=0,lastAltCount=0;
 const QUAGGA=['https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.12.1/dist/quagga.min.js',
               'https://unpkg.com/@ericblade/quagga2@1.12.1/dist/quagga.min.js'];
 const $=id=>document.getElementById(id);
 const styles=document.createElement('style');
 styles.id='nv28-2-scanner-styles';
 styles.textContent=[
  '#nv28-2-launch{border:1px solid #92bca8;border-radius:9px;padding:10px 13px;min-height:43px;background:#123f65;color:white;font:800 13px system-ui;cursor:pointer;flex:1 1 180px}',
  '#nv28-2-launch:disabled{opacity:.6}',
  '#nv28-2-remark{grid-column:1/-1;font:12px/1.45 system-ui;color:#4f6659;min-height:18px;margin:0 0 4px}',
  '#nv28-2-overlay[hidden]{display:none!important}',
  '#nv28-2-overlay{position:fixed;inset:0;z-index:2147483645;display:flex;align-items:center;justify-content:center;background:#081629e8;box-sizing:border-box;padding:12px;padding-bottom:calc(12px + env(safe-area-inset-bottom));}',
  '#nv28-2-sheet{box-sizing:border-box;width:min(550px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:#fff;color:#173552;border-radius:19px;padding:16px;box-shadow:0 12px 46px #0005;font:14px/1.5 system-ui}',
  '#nv28-2-sheet h2{margin:0 0 5px;font:800 19px system-ui}',
  '#nv28-2-sheet p{font:13px/1.5 system-ui;margin:6px 0;color:#48667e}',
  '#nv28-2-reader{background:#08192f;border-radius:12px;overflow:hidden;min-height:180px;margin-top:12px}',
  '#nv28-2-reader video{max-width:100%;min-height:185px;object-fit:contain}',
  '#nv28-2-status{color:#194d6b!important;font-weight:750!important;margin:12px 0!important}',
  '#nv28-2-close{min-height:44px;min-width:95px;border:0;border-radius:10px;background:#e6ecf3;color:#173d59;font:800 14px system-ui;cursor:pointer}',
  '#nv28-2-header{display:flex;justify-content:space-between;align-items:start;gap:12px}',
  '#nv28-2-reader div{max-width:100%}',
  '#nv28-2-manual{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}',
  '#nv28-2-manual button{background:#e5f2e8;color:#225837;border-radius:9px;border:1px solid #b2cfbc;padding:9px 11px;font:750 12px system-ui;cursor:pointer}',
  '#nv28-3-guide{pointer-events:none;position:absolute;inset:26% 8%;border:2px solid #8de5b5;border-radius:9px;box-shadow:0 0 0 200vmax #00000020}',
  '#nv28-2-reader{position:relative;isolation:isolate}',
  '#nv28-2-reader video{transform-origin:50% 50%}',
  '#nv28-3-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}',
  '#nv28-3-controls button,#nv28-3-photos button{background:#e8f1f8;color:#183c59;border:1px solid #ccd9e2;border-radius:9px;min-height:40px;padding:9px 10px;font:750 12px system-ui;cursor:pointer;flex:1 1 130px}',
  '#nv28-3-controls button[hidden],#nv28-3-controls label[hidden]{display:none!important}',
  '#nv28-3-controls button:disabled{opacity:.45;cursor:not-allowed}',
  '#nv28-3-zoom-box{display:flex;flex:1 1 100%;align-items:center;gap:9px;padding:7px 4px;font:700 12px system-ui}',
  '#nv28-3-zoom-box input{flex:1;min-width:95px;accent-color:#155f43}',
  '#nv28-3-zoom-value{min-width:42px;text-align:right}',
  '#nv28-3-photos{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
  '#nv28-3-photos input{position:absolute;left:-10000px;opacity:0;width:1px;height:1px}',
  '#nv28-3-diagnostic{background:#f0f6fa;border:1px solid #d4e2e9;border-radius:9px;font:11px/1.45 system-ui;color:#425e71;padding:8px;margin:8px 0;overflow-wrap:anywhere}',
  '#nv28-3-diagnostic[hidden]{display:none!important}',
  '#nv28-3-helper{color:#526e7e;font-size:12px;line-height:1.4;margin:8px 0}',
  '#nv28-3-result{color:#185b38;font-weight:750}'
 ].join('');
 document.head.appendChild(styles);
 const launch=document.createElement('button');
 launch.type='button';launch.id='nv28-2-launch';
 launch.textContent='📷 Escanear código de barras';
 launch.setAttribute('aria-label','Escanear código de barras para dar de alta un producto');
 controls.appendChild(launch);
 const remark=document.createElement('p');
 remark.id='nv28-2-remark';
 remark.textContent='Escanea el empaque con la cámara, usa tu lector USB o escribe el código. No se agrega al carrito.';
 controls.insertAdjacentElement('afterend',remark);
 const overlay=document.createElement('div');
 overlay.id='nv28-2-overlay';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','nv28-2-heading');
 overlay.innerHTML=[
  '<section id="nv28-2-sheet">',
   '<header id="nv28-2-header"><div><h2 id="nv28-2-heading">📷 Escanear código del producto</h2>',
    '<p>Coloca las barras dentro de la cámara. Se copiará el código en el alta, sin añadir productos al carrito.</p></div>',
    '<button type="button" id="nv28-2-close" aria-label="Cerrar escáner">Cerrar ✕</button></header>',
   '<div id="nv28-2-reader"></div>',
   '<div id="nv28-3-controls">',
    '<label id="nv28-3-zoom-box">Zoom <input id="nv28-3-zoom" type="range" min="1" max="3" step="0.1" value="1" aria-label="Acercar código de barras"><span id="nv28-3-zoom-value">1.0×</span></label>',
    '<button type="button" id="nv28-3-torch">🔦 Linterna</button>',
    '<button type="button" id="nv28-3-focus">🎯 Reenfocar</button>',
    '<button type="button" id="nv28-3-switch">🔄 Cambiar cámara</button>',
    '<button type="button" id="nv28-3-restart">↻ Reiniciar lectura</button>',
   '</div>',
   '<p id="nv28-3-helper">Sujeta el teléfono firme a 10–20 cm del código, evita reflejos y aumenta el zoom si las barras se ven pequeñas.</p>',
   '<div id="nv28-3-photos">',
    '<button type="button" id="nv28-3-snap">📷 Tomar foto del código</button>',
    '<button type="button" id="nv28-3-library">🖼️ Leer foto de galería</button>',
    '<input id="nv28-3-snap-file" type="file" accept="image/*" capture="environment" aria-label="Fotografiar código de barras">',
    '<input id="nv28-3-gallery-file" type="file" accept="image/*" aria-label="Cargar fotografía del código">',
   '</div>',
   '<p id="nv28-3-diagnostic" role="status">Motor principal: preparado · Segundo motor: espera</p>',
   '<p id="nv28-2-status" role="status" aria-live="polite">Preparando cámara…</p>',
   '<div id="nv28-2-manual"><button type="button" id="nv28-2-keyboard">⌨️ Usar código manual o lector USB</button></div>',
   '<p>Se admiten códigos numéricos EAN, UPC y CODE 128. No necesitas generar un código si el producto ya trae uno.</p>',
  '</section>'
 ].join('');
 document.body.appendChild(overlay);
 const readerHost=$('nv28-2-reader'),status=$('nv28-2-status');
 function notify(message){remark.textContent=String(message||'');}
 function readStatus(message){status.textContent=String(message||'');}
 function loadMotor(){
  if(window.Html5Qrcode)return Promise.resolve();
  if(library)return library;
  const urls=[
   'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
   'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
  ];
  library=new Promise((resolve,reject)=>{
   let index=0,finished=false;
   const next=()=>{
    if(finished)return;
    if(window.Html5Qrcode){finished=true;resolve();return;}
    if(index>=urls.length){finished=true;reject(Error('No fue posible cargar ninguno de los dos motores principales. Verifica internet y vuelve a intentarlo.'));return;}
    const script=document.createElement('script');
    script.src=urls[index++];script.async=true;script.crossOrigin='anonymous';
    let ended=false;
    const timer=setTimeout(()=>{if(ended)return;ended=true;script.onload=null;script.onerror=null;next();},10500);
    script.onload=()=>{
     if(ended)return;ended=true;clearTimeout(timer);
     if(window.Html5Qrcode){finished=true;resolve();}else next();
    };
    script.onerror=()=>{if(ended)return;ended=true;clearTimeout(timer);next();};
    document.head.appendChild(script);
   };
   next();
  }).catch(e=>{library=null;throw e});
  return library;
 }
 function createReader(){
  const f=window.Html5QrcodeSupportedFormats||{};
  const fmt=[f.CODE_128,f.EAN_13,f.EAN_8,f.UPC_A,f.UPC_E,f.CODE_39,f.ITF].filter(Number.isInteger);
  const iOS=/(iPhone|iPad|iPod)/i.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  return new window.Html5Qrcode('nv28-2-reader',{
   formatsToSupport:fmt,verbose:false,useBarCodeDetectorIfSupported:!iOS
  });
 }

 function writeDiag(extra=''){
  const diag=$('nv28-3-diagnostic');
  if(!diag)return;
  const video=readerHost.querySelector('video');
  const live=video?.srcObject?.getVideoTracks?.()?.[0];
  diag.textContent='Cámara: '+(live?.readyState||'sin señal')+
   ' · Video: '+(video?.videoWidth||0)+'×'+(video?.videoHeight||0)+
   ' · Zoom: '+(hardwareZoom?'físico':'digital de respaldo')+
   ' · Motor 2: '+alternateState+(extra?' · '+extra:'');
 }
 function syncCameraControls(){
  track=null;caps=null;torch=false;hardwareZoom=false;
  const video=readerHost.querySelector('video');
  track=video?.srcObject?.getVideoTracks?.()?.[0]||null;
  if(track?.readyState==='live'){
   try{caps=track.getCapabilities?.()||scanner?.getRunningTrackCapabilities?.()||{};}catch(_){caps={};}
  }
  const slider=$('nv28-3-zoom');
  hardwareZoom=!!(track&&caps?.zoom&&Number.isFinite(caps.zoom.min)&&Number.isFinite(caps.zoom.max));
  if(hardwareZoom){
   slider.min=String(caps.zoom.min);slider.max=String(caps.zoom.max);
   slider.step=String(caps.zoom.step||0.1);
   const set=Number(track.getSettings?.()?.zoom||caps.zoom.min);
   zoomValue=Math.min(caps.zoom.max,Math.max(caps.zoom.min,set));
  }else{
   slider.min='1';slider.max='3';slider.step='0.1';zoomValue=1;
  }
  slider.value=String(zoomValue);
  $('nv28-3-zoom-value').textContent=zoomValue.toFixed(1)+'×';
  $('nv28-3-torch').disabled=!(track&&caps?.torch);
  $('nv28-3-torch').textContent=caps?.torch?'🔦 Linterna':'🔦 Sin linterna';
  if(video)video.style.transform='';
  writeDiag();
 }
 async function setZoom(value){
  if(!Number.isFinite(value))return;
  const slider=$('nv28-3-zoom');
  zoomValue=Math.min(Number(slider.max),Math.max(Number(slider.min),value));
  $('nv28-3-zoom-value').textContent=zoomValue.toFixed(1)+'×';
  if(track?.readyState==='live'&&hardwareZoom){
   try{
    await track.applyConstraints({advanced:[{zoom:zoomValue}]});
    readStatus('Zoom de cámara: '+zoomValue.toFixed(1)+'×. Centra el código y espera la lectura.');
   }catch(_){
    hardwareZoom=false;slider.min='1';slider.max='3';zoomValue=Math.max(1,Math.min(3,zoomValue));
    slider.value=String(zoomValue);readStatus('Zoom digital activado; el navegador no permite zoom físico.');
   }
  }
  if(!hardwareZoom){
   const video=readerHost.querySelector('video');
   if(video)video.style.transform='scale('+zoomValue.toFixed(2)+')';
  }
  writeDiag();
 }
 async function toggleTorch(){
  if(!track||!caps?.torch)return;
  try{
   await track.applyConstraints({advanced:[{torch:!torch}]});
   torch=!torch;
   $('nv28-3-torch').textContent=torch?'🔦 Apagar':'🔦 Linterna';
  }catch(_){readStatus('Safari no permite controlar la linterna de esta cámara.');}
 }
 async function tryFocus(){
  const target=track;
  if(!target)return;
  const modes=Array.isArray(caps?.focusMode)?caps.focusMode:[];
  if(modes.includes('continuous')){
   try{await target.applyConstraints({advanced:[{focusMode:'continuous'}]});readStatus('Enfoque automático activo. Mantén las barras centradas.');return;}catch(_){}
  }
  readStatus('Reiniciando cámara para mejorar el enfoque…');
  await restart();
 }
 async function loadQuagga(){
  if(window.Quagga)return;
  if(quaggaLoading)return quaggaLoading;
  quaggaLoading=new Promise((resolve,reject)=>{
   let cursor=0,settled=false;
   const next=()=>{
    if(window.Quagga){settled=true;resolve();return;}
    if(cursor>=QUAGGA.length){settled=true;reject(Error('Segundo motor no disponible'));return;}
    const script=document.createElement('script');
    script.async=true;script.crossOrigin='anonymous';script.src=QUAGGA[cursor++];
    const timer=setTimeout(()=>{script.onload=null;script.onerror=null;next()},10500);
    script.onload=()=>{clearTimeout(timer);if(window.Quagga){settled=true;resolve();}else next();};
    script.onerror=()=>{clearTimeout(timer);next();};
    document.head.appendChild(script);
   };
   next();
  }).catch(e=>{quaggaLoading=null;throw e});
  return quaggaLoading;
 }
 function decodeQuagga(image,dimension=1200){
  return new Promise(resolve=>{
   if(!window.Quagga){resolve('');return;}
   let done=false;
   const complete=val=>{if(done)return;done=true;clearTimeout(timer);resolve(val);};
   const timer=setTimeout(()=>complete(''),4200);
   try{
    window.Quagga.decodeSingle({
     src:image,numOfWorkers:0,locate:true,inputStream:{size:dimension},
     decoder:{readers:['code_128_reader','ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_39_reader','i2of5_reader']}
    },result=>{
     const value=String(result?.codeResult?.code||'').replace(/[\s-]/g,'');
     complete(valid.test(value)?value:'');
    });
   }catch(_){complete('');}
  });
 }
 function takeFrame(){
  const video=readerHost.querySelector('video');
  if(!video||video.readyState<2||!video.videoWidth||!video.videoHeight)return '';
  const w=video.videoWidth,h=video.videoHeight;
  const zoom=!hardwareZoom?Math.max(1,zoomValue):1;
  const cropW=w/zoom,cropH=h/zoom;
  const out=document.createElement('canvas');
  const scale=Math.min(1,1250/cropW);
  out.width=Math.round(cropW*scale);out.height=Math.round(cropH*scale);
  if(!out.width||!out.height)return '';
  const ctx=out.getContext('2d');if(!ctx)return '';
  ctx.drawImage(video,(w-cropW)/2,(h-cropH)/2,cropW,cropH,0,0,out.width,out.height);
  return out.toDataURL('image/jpeg',0.9);
 }
 function confirmCode(value,engine){
  const code=String(value||'').replace(/[\s-]/g,'');
  if(!valid.test(code))return;
  const time=Date.now();
  if(engine==='primary'){
   if(firstRead!==code||time-firstReadTime>5500){firstRead=code;firstReadCount=1;}
   else firstReadCount++;
   firstReadTime=time;
   if(firstReadCount>=2)accept(code);
   else readStatus('Código detectado: '+code+' · Confirmando lectura…');
  }else{
   if(lastAlt!==code||time-lastAltTime>7000){lastAlt=code;lastAltCount=1;}
   else lastAltCount++;
   lastAltTime=time;
   if(lastAltCount>=2)accept(code);
   else readStatus('Motor mejorado detectó '+code+' · Verificando…');
  }
 }
 function stopAlternative(){
  ++alternateEpoch;
  if(alternateTimer){clearTimeout(alternateTimer);alternateTimer=0;}
  alternateWorking=false;
  alternateState='Detenido';
 }
 async function alternateCycle(token,which){
  if(token!==epoch||which!==alternateEpoch||overlay.hidden||accepted||photoBusy)return;
  if(alternateWorking){
   alternateTimer=setTimeout(()=>alternateCycle(token,which),1000);return;
  }
  alternateWorking=true;
  try{
   const frame=takeFrame();
   if(frame){
    const code=await decodeQuagga(frame);
    if(token!==epoch||which!==alternateEpoch||overlay.hidden||accepted)return;
    if(code)confirmCode(code,'alternative');
   }
   alternateState='Analizando fotogramas';
  }catch(_){alternateState='Imagen no disponible';}
  finally{
   alternateWorking=false;writeDiag();
   if(token===epoch&&which===alternateEpoch&&!overlay.hidden&&!accepted&&!photoBusy){
    alternateTimer=setTimeout(()=>alternateCycle(token,which),1350);
   }
  }
 }
 async function startAlternative(token){
  const which=++alternateEpoch;
  alternateState='Preparando';writeDiag();
  await new Promise(ok=>setTimeout(ok,1600));
  if(token!==epoch||which!==alternateEpoch||overlay.hidden||accepted)return;
  try{
   await loadQuagga();
   if(token!==epoch||which!==alternateEpoch||overlay.hidden||accepted)return;
   alternateState='Activo';writeDiag();
   alternateTimer=setTimeout(()=>alternateCycle(token,which),250);
  }catch(_){
   alternateState='No disponible';writeDiag('Puedes leer una foto o usar la cámara principal.');
  }
 }
 function readFile(file){
  return new Promise((resolve,reject)=>{
   const fr=new FileReader();
   fr.onload=()=>resolve(String(fr.result||''));
   fr.onerror=()=>reject(Error('No se pudo leer la fotografía'));
   fr.readAsDataURL(file);
  });
 }
 async function scanPhoto(file){
  if(!file||photoBusy||overlay.hidden)return;
  if(!file.type.startsWith('image/')||file.size>15*1024*1024){
   readStatus('Elige una foto de imagen válida menor de 15 MB.');return;
  }
  photoBusy=true;
  const stamp=++epoch;
  stopAlternative();
  try{
   readStatus('Analizando foto del código…');
   if(launching)await launching;
   await clearScanner();
   await loadMotor();
   if(stamp!==epoch||overlay.hidden)return;
   const still=createReader();
   let code='';
   try{code=await still.scanFile(file,false);}catch(_){}
   try{await still.clear();}catch(_){}
   if(!valid.test(String(code||'').replace(/[\s-]/g,''))){
    readStatus('Probando un segundo método para leer la fotografía…');
    try{await loadQuagga();code=await decodeQuagga(await readFile(file),1600);}catch(_){}
   }
   if(stamp!==epoch||overlay.hidden)return;
   if(valid.test(String(code||'').replace(/[\s-]/g,''))){
    accept(code);return;
   }
   readStatus('No fue posible leer esta fotografía. Intenta con buena luz, sin reflejos, o pulsa Reiniciar lectura.');
  }catch(e){
   if(stamp===epoch&&!overlay.hidden)readStatus('No se pudo analizar la imagen: '+String(e?.message||e||'error'));
  }finally{
   photoBusy=false;
   $('nv28-3-snap-file').value='';
   $('nv28-3-gallery-file').value='';
  }
 }
 async function restart(){
  if(restarting||overlay.hidden||photoBusy)return;
  restarting=true;
  ++epoch;stopAlternative();
  try{
   await clearScanner();
   overlay.hidden=true;accepted=false;firstRead='';firstReadCount=0;lastAlt='';lastAltCount=0;
  }finally{
   restarting=false;
   void open();
  }
 }

 async function clearScanner(){
  const current=scanner;scanner=null;
  if(!current)return;
  try{await current.stop()}catch(_){}
  try{await current.clear()}catch(_){}
 }
 async function close(){
  if(stopping)return stopping;
  ++epoch;overlay.hidden=true;stopAlternative();track=null;caps=null;torch=false;
  stopping=(async()=>{
   try{if(launching)await launching;}catch(_){}
   await clearScanner();
  })().finally(()=>{stopping=null;launch.disabled=false});
  return stopping;
 }
 function accept(raw){
  const code=String(raw||'').trim().replace(/[\s-]+/g,'');
  if(!valid.test(code)){
   readStatus('El lector detectó un código no numérico o inválido. Prueba de nuevo.');
   return false;
  }
  if(accepted)return true;
  accepted=true;
  field.value=code;
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
  const exists=window.NAVARRO_NUEVOS_PRODUCTOS_V23?.contains?.(code);
  notify(exists?'⚠️ El código '+code+' ya existe en el catálogo. Revisa el artículo antes de crear otro.':
   '✓ Código capturado: '+code+'. Completa el nombre, precio y demás datos para guardarlo.');
  void close().then(()=>{
   if(!mask.hidden){
    try{form.elements.name.focus({preventScroll:true});}catch(_){form.elements.name.focus();}
   }
  });
  return true;
 }
 async function open(){
  if(!mask||mask.hidden||!overlay.hidden||launching||stopping)return;
  if(document.body.classList.contains('nav-scan-open')){
   notify('Cierra primero el escáner de ventas para usar el lector de altas.');
   return;
  }
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
   notify('La cámara requiere HTTPS y autorización en Safari. Puedes usar el lector físico o escribir el código.');
   return;
  }
  overlay.hidden=false;
  accepted=false;firstRead='';firstReadCount=0;lastAlt='';lastAltCount=0;
  const token=++epoch;
  launch.disabled=true;
  readStatus('Preparando cámara trasera…');
  launching=(async()=>{
   try{
    await loadMotor();
    if(token!==epoch)return;
    let current=createReader();scanner=current;
    const found=value=>{
     if(token!==epoch||overlay.hidden||accepted)return;
     confirmCode(value,'primary');
    };
    try{
     await current.start({facingMode:selectedFacing},{
      fps:12,disableFlip:true,
      videoConstraints:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}
     },found,()=>{});
    }catch(e){
     if(token!==epoch)return;
     try{await current.stop()}catch(_){}
     try{await current.clear()}catch(_){}
     if(scanner===current)scanner=null;
     current=createReader();scanner=current;
     await current.start({facingMode:selectedFacing},{
      fps:10,disableFlip:true
     },found,()=>{});
    }
    if(token!==epoch){
     await clearScanner();return;
    }
    // Safari iOS puede beneficiarse de solicitar resolución después de iniciar la cámara.
    if(/(iPhone|iPad|iPod)/i.test(navigator.userAgent)){
     try{await scanner.applyVideoConstraints({width:{ideal:1280},height:{ideal:720}});}catch(_){}
    }
    if(token!==epoch||overlay.hidden)return;
    // Guía visual, añadida únicamente después de iniciar la transmisión.
    let guide=$('nv28-3-guide');
    if(!guide){guide=document.createElement('div');guide.id='nv28-3-guide';guide.setAttribute('aria-hidden','true');readerHost.appendChild(guide);}
    syncCameraControls();writeDiag();
    void startAlternative(token);
    readStatus('Lector avanzado activo. Centra las barras; puedes usar zoom, linterna o fotografía.');
   }catch(e){
    if(token!==epoch)return;
    const msg=String(e?.message||e||'No se pudo abrir la cámara');
    readStatus(/Permission|NotAllowed|denied|permiso/i.test(msg)?
     'Permite el uso de la cámara para este sitio en Safari y vuelve a intentarlo.':
     'No se pudo iniciar el escáner: '+msg+'. Puedes usar tu lector USB o introducir el código.');
    stopAlternative();await clearScanner();
    launch.disabled=false;
   }
  })();
  try{await launching;}finally{launching=null;if(overlay.hidden)launch.disabled=false;}
 }
 $('nv28-3-zoom').addEventListener('input',event=>{void setZoom(Number(event.target.value));});
 $('nv28-3-torch').addEventListener('click',()=>{void toggleTorch();});
 $('nv28-3-focus').addEventListener('click',()=>{void tryFocus();});
 $('nv28-3-switch').addEventListener('click',()=>{
  selectedFacing=selectedFacing==='environment'?'user':'environment';
  void restart();
 });
 $('nv28-3-restart').addEventListener('click',()=>{void restart();});
 $('nv28-3-snap').addEventListener('click',()=>$('nv28-3-snap-file').click());
 $('nv28-3-library').addEventListener('click',()=>$('nv28-3-gallery-file').click());
 $('nv28-3-snap-file').addEventListener('change',event=>{void scanPhoto(event.target.files?.[0]);});
 $('nv28-3-gallery-file').addEventListener('change',event=>{void scanPhoto(event.target.files?.[0]);});
 launch.addEventListener('click',()=>{void open()});
 $('nv28-2-close').addEventListener('click',()=>{void close()});
 $('nv28-2-keyboard').addEventListener('click',()=>{
  void close().then(()=>{
   field.focus();notify('Escanea con el lector físico o escribe el código y presiona Enter.');
  });
 });
 overlay.addEventListener('click',event=>{if(event.target===overlay)void close()});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!overlay.hidden){
   event.preventDefault();event.stopImmediatePropagation();void close();
  }
 },true);
 // Un lector USB suele añadir Enter al terminar: no debe guardar el producto.
 field.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||mask.hidden)return;
  event.preventDefault();event.stopPropagation();
  const code=String(field.value||'').trim();
  notify(valid.test(code)?'✓ Código capturado: '+code+'. Continúa con el nombre del producto.':
   'El código debe tener entre 5 y 30 dígitos.');
  if(valid.test(code)){
   try{form.elements.name.focus({preventScroll:true});}catch(_){form.elements.name.focus();}
  }
 });
 // No bloquear la navegación ni conservar la cámara si se cambia de pantalla.
 window.addEventListener('pagehide',()=>{void close()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!overlay.hidden)void close()});
 window.NAVARRO_ALTA_ESCANER_V283=Object.freeze({
  version:'28.3',abrir:open,cerrar:close
 });
})();