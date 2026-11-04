/* NAVARRO 360: escáner V8 CONTINUO. Cámara abierta, carrito directo, próximo código listo. */
(function(){
'use strict';
if(window.NAVARRO_ESCANER_INSTALADO)return;
window.NAVARRO_ESCANER_INSTALADO=true;
var CDN='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
var overlay=null,reader=null,loading=null,opening=false,busy=false,closed=true,unknown='',unknownAt=0;
var photoReader=null,photoStop=null,photoBusy=false;
var activeTrack=null,zoomCaps=null,torchOn=false,audioContext=null;
var session=0,lastCode='',lastProduct=null,sessionUnits=0,sessionCodes=new Set(),nextAllowedAt=0;
var altLoading=null,altTimer=null,altEpoch=0,altState='sin iniciar';
var altHits=0,altFrames=0,altCandidate='',altCandidateAt=0,altConfirmations=0,primaryHits=0,diagVisible=false;
const MIN_BETWEEN_PRODUCTS_MS=750;
var pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function createBarcodeReader(host,formats){
 // Safari iOS puede detectar mal las barras con BarcodeDetector nativo.
 const isiOS=/(iPhone|iPad|iPod)/i.test(navigator.userAgent) ||
  (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return new window.Html5Qrcode(host,{
  formatsToSupport:formats,verbose:false,useBarCodeDetectorIfSupported:!isiOS
 });
}
function setStatus(msg,error){
 var node=document.getElementById('nav-scan-status');
 if(node){node.textContent=msg;node.classList.toggle('error',!!error);}
}
function productFor(value){
 var code=String(value||'').trim().replace(/[\s-]/g,'');
 if(!/^[0-9]{5,}$/.test(code)||!Array.isArray(window.NAVARRO_DB))return null;
 var candidates=[code];
 if(code.length===13&&code.charAt(0)==='0')candidates.push(code.slice(1));
 if(code.length===12)candidates.push('0'+code);
 for(var candidate of candidates){
  var p=window.NAVARRO_DB.find(row=>String(row?.[0])===candidate);
  if(p)return {code:candidate,name:String(p[1]||'Producto')};
 }
 return null;
}
function searchInput(){
 var all=[...document.querySelectorAll('#search-mobile,#search,input[type="search"]')];
 return all.find(el=>el.getClientRects().length)||all[0]||null;
}
function searchCode(code){
 var options=[...document.querySelectorAll('#filters [data-cat], [data-category]')];
 var reset=options.find(el=>/^(todos?|todas?|general)$/i.test(String(el.dataset.cat||el.dataset.category||'').trim()));
 if(reset&&!reset.classList.contains('active'))reset.click();
 var primary=searchInput();if(!primary)return false;
 var inputs=[...new Set([document.getElementById('search'),document.getElementById('search-mobile'),primary].filter(Boolean))];
 var setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
 for(var input of inputs){
  if(setter)setter.call(input,code);else input.value=code;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 return true;
}
function findCard(code){
 var cards=[...document.querySelectorAll('#products [data-card],#search-results [data-card]')];
 return cards.find(el=>el.getAttribute('data-card')===code&&el.getClientRects().length)||
  cards.find(el=>el.getAttribute('data-card')===code)||null;
}
function quantityLabel(code){
 var card=findCard(code);
 var ctl=card?.querySelector('[data-dec="'+code+'"],[data-minus="'+code+'"],[data-inc="'+code+'"],[data-plus="'+code+'"]');
 return ctl?.parentElement?.textContent?.trim()||'';
}
function cartFingerprint(){
 var arr=[];
 try{
  for(var i=0;i<localStorage.length;i++){
   var key=localStorage.key(i);
   if(/cart|carrito|pedido|order|nav360/i.test(key))arr.push([key,localStorage.getItem(key)]);
  }
 }catch(_){}
 return JSON.stringify(arr);
}
async function addFound(p,token){
 if(closed||token!==session)return {ok:false,reason:'Lectura cancelada'};
 // El carrito real decide y persiste la cantidad. No fingir toques ni recargar.
 if(typeof window.NAVARRO_ESCANER_AGREGAR==='function'){
  try{
   const result=window.NAVARRO_ESCANER_AGREGAR(p.code);
   return result?.ok?{ok:true}:{ok:false,reason:result?.reason||'No se pudo verificar que el carrito aumentara'};
  }catch(_){return {ok:false,reason:'No se pudo actualizar el carrito. Revisa el pedido antes de reintentar'};}
 }
 // Fallback seguro para versiones previas de la tienda.
 if(!searchCode(p.code))return {ok:false,reason:'No se encontró la barra de búsqueda'};
 for(var i=0;i<16;i++){
  await pause(i===0?180:120);
  if(closed||token!==session)return {ok:false,reason:'Lectura cancelada'};
  var card=findCard(p.code);
  if(!card)continue;
  var control=card.querySelector('[data-inc="'+p.code+'"],[data-plus="'+p.code+'"],[data-add="'+p.code+'"]');
  var element=control||card;
  var before=cartFingerprint(),previous=quantityLabel(p.code);
  if(closed||token!==session)return {ok:false,reason:'Lectura cancelada'};
  element.click();
  await pause(280);
  var changed=before!==cartFingerprint()||previous!==quantityLabel(p.code);
  return {ok:changed,reason:changed?'':'Se encontró el producto, pero no se confirmó el aumento de cantidad. Comprueba el carrito antes de volver a sumarlo'};
 }
 return {ok:false,reason:'Se encontró el código en el catálogo, pero no apareció en el buscador'};
}
function ensureOverlay(){
 if(overlay)return;
 overlay=document.createElement('div');overlay.id='nav-scan-overlay';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Lector de código de barras');
 overlay.innerHTML='<div class="nav-scan-panel"><div class="nav-scan-head"><div><strong>📷 Escáner continuo · iPhone V8</strong><p>Centra las barras en la imagen, sin acercarte demasiado.</p></div><button id="nav-scan-close" type="button" aria-label="Finalizar y cerrar cámara">✕</button></div><div id="nav-scan-camera"></div><p id="nav-scan-status" role="status" aria-live="polite">Preparando cámara…</p><div id="nav-scan-summary" class="nav-scan-summary" aria-live="polite">0 unidades añadidas · 0 productos distintos · listo para escanear</div><button id="nav-scan-repeat" type="button" hidden disabled>+1 unidad del último producto</button><div class="nav-scan-pro-tools"><button id="nav-scan-torch" type="button" hidden>🔦 Linterna</button><label id="nav-scan-zoom-wrap" hidden>Zoom <input id="nav-scan-zoom" type="range" min="1" max="3" step="0.1" value="1" aria-label="Zoom de cámara"/></label><button id="nav-scan-sound" type="button" aria-pressed="true">🔊 Sonido</button></div><div class="nav-scan-tools"><button id="nav-scan-take-photo" type="button">📸 Fotografiar código</button><button id="nav-scan-reopen" type="button">↻ Reabrir cámara</button><button id="nav-scan-diagnose" type="button">🔎 Diagnóstico</button></div><p id="nav-scan-diagnostic" hidden></p><input id="nav-scan-photo" type="file" accept="image/*" capture="environment" class="nav-scan-file-input" aria-label="Elegir o tomar foto del código"/><div id="nav-scan-photo-reader" aria-hidden="true"></div><form id="nav-scan-manual"><input id="nav-scan-manual-code" inputmode="numeric" autocomplete="off" placeholder="Escanear o escribir código" aria-label="Escanear o escribir código de barras manual" maxlength="30"/><button type="submit">Agregar y seguir</button></form><p class="nav-scan-help">Si la cámara no reconoce las barras, usa una foto o escribe el código. Cada código válido suma una unidad. La cámara permanece abierta para el siguiente producto.</p></div>';
 document.body.appendChild(overlay);
 overlay.querySelector('#nav-scan-close').addEventListener('click',()=>void close());
 overlay.querySelector('#nav-scan-repeat').addEventListener('click',()=>void repeatLast());
 overlay.querySelector('#nav-scan-torch').addEventListener('click',()=>void toggleTorch());
 overlay.querySelector('#nav-scan-zoom').addEventListener('input',e=>void changeZoom(Number(e.target.value)));
 overlay.querySelector('#nav-scan-sound').addEventListener('click',e=>{const enabled=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(enabled));e.currentTarget.textContent=enabled?'🔊 Sonido':'🔇 Silencio';if(enabled)unlockAudio();});
 overlay.querySelector('#nav-scan-take-photo').addEventListener('click',()=>{if(closed||photoBusy)return;unlockAudio();photoStop=stop();setStatus('Cámara pausada. Toma una foto nítida del código.');overlay.querySelector('#nav-scan-photo').click();});
 overlay.querySelector('#nav-scan-photo').addEventListener('change',e=>{void scanPhoto(e.target.files&&e.target.files[0]);});
 overlay.querySelector('#nav-scan-reopen').addEventListener('click',async()=>{await close();await open();});
 overlay.querySelector('#nav-scan-diagnose').addEventListener('click',()=>{diagVisible=!diagVisible;showDiagnostic();});
 overlay.querySelector('#nav-scan-manual').addEventListener('submit',e=>{e.preventDefault();unlockAudio();const input=overlay.querySelector('#nav-scan-manual-code');const code=String(input.value||'').trim().replaceAll(' ','').replaceAll('-','');if(!/^[0-9]{5,}$/.test(code)){setStatus('Escribe un código numérico de al menos 5 dígitos.',true);return;}input.value='';void decoded(code,'manual');});
 overlay.addEventListener('click',e=>{if(e.target===overlay)void close()});
}
async function stop(){
 altEpoch++;if(altTimer){clearTimeout(altTimer);altTimer=null;}
 activeTrack=null;zoomCaps=null;torchOn=false;updateCameraControls();
 var prev=reader;reader=null;if(!prev)return;
 try{await prev.stop()}catch(_){}
 try{await prev.clear()}catch(_){}
}
async function close(){
 closed=true;session++;opening=false;busy=false;
 await stop();
 if(photoReader){try{await photoReader.clear()}catch(_){}photoReader=null;}
 if(overlay)overlay.hidden=true;
 document.body.classList.remove('nav-scan-open');
}
function loadLibrary(){
 if(window.Html5Qrcode)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  var s=document.createElement('script');
  s.src=CDN;s.async=true;s.crossOrigin='anonymous';
  s.onload=()=>window.Html5Qrcode?resolve():reject(new Error('No inició el lector'));
  s.onerror=()=>reject(new Error('No se pudo cargar el lector. Revisa la conexión.'));
  document.head.appendChild(s);
 }).catch(err=>{loading=null;throw err});
 return loading;
}
function toast(message){
 var el=document.getElementById('toast');
 if(el){el.textContent=message;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),3800);}
 else window.alert(message);
}
function updateProgress(){
 var node=document.getElementById('nav-scan-summary');
 if(node)node.textContent=sessionUnits+' '+(sessionUnits===1?'unidad añadida':'unidades añadidas')+' · '+sessionCodes.size+' '+(sessionCodes.size===1?'producto distinto':'productos distintos');
 var repeat=document.getElementById('nav-scan-repeat');
 if(repeat){
  repeat.hidden=!lastProduct;
  repeat.disabled=closed||busy||!lastProduct;
  if(lastProduct)repeat.textContent='+1 unidad: '+lastProduct.name;
 }
}
function confirmedAdd(p){
 sessionUnits++;sessionCodes.add(p.code);lastProduct=p;
 updateProgress();
 setStatus('✓ +1 '+p.name+' ('+p.code+'). ✓ Carrito actualizado · 📷 LISTO PARA EL SIGUIENTE CÓDIGO.');
 if(navigator.vibrate)try{navigator.vibrate(60)}catch(_){}
 playSuccessSound();
}
async function repeatLast(){
 if(closed||busy||!lastProduct)return;
 var p=lastProduct,token=session;
 busy=true;updateProgress();setStatus('Sumando otra unidad de '+p.name+'…');
 var result;
 try{result=await addFound(p,token)}catch(e){result={ok:false,reason:'No se pudo confirmar la cantidad'};}
 if(closed||token!==session)return;
 busy=false;
 if(result.ok)confirmedAdd(p);
 else setStatus(result.reason+'. Comprueba el carrito antes de reintentar.',true);
 updateProgress();
}
async function decoded(value,source='camera'){
 if(closed||busy||opening)return;
 var p=productFor(value);
 if(!p){
  var code=String(value||'').trim(),now=Date.now();
  if(unknown===code&&now-unknownAt<1800)return;
  unknown=code;unknownAt=now;
  setStatus('Código no registrado: '+code+'. No se agregó al carrito.',true);
  return;
 }
 // Una etiqueta inmóvil nunca suma dos veces. Para repetir el mismo SKU, pulsar +1.
 if(p.code===lastCode&&(source==='camera'||source==='alternative'))return;
 if(Date.now()<nextAllowedAt)return;
 var token=session;
 busy=true;lastCode=p.code;nextAllowedAt=Date.now()+MIN_BETWEEN_PRODUCTS_MS;
 updateProgress();setStatus('Encontrado: '+p.name+'. Añadiendo una unidad…');
 var result;
 try{result=await addFound(p,token)}catch(e){result={ok:false,reason:'No se pudo confirmar el producto'};}
 if(closed||token!==session)return;
 busy=false;
 if(result.ok){
  confirmedAdd(p);
  // El lector continúa activo: únicamente la captura manual devuelve el foco al campo.
  // No abrir teclado en Safari mientras la cámara está reconociendo códigos.
  if(source==='manual'){
   const input=overlay?.querySelector('#nav-scan-manual-code');
   if(input){input.value='';try{input.focus({preventScroll:true})}catch(_){input.focus()}}
  }
 }else{lastCode='';setStatus(result.reason+'. Código: '+p.code+'. Comprueba el carrito.',true);}
 updateProgress();
}
function unlockAudio(){
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return;
  if(!audioContext)audioContext=new C();
  if(audioContext.state==='suspended')void audioContext.resume().catch(()=>{});
 }catch(_){}
}
function playSuccessSound(){
 if(overlay?.querySelector('#nav-scan-sound')?.getAttribute('aria-pressed')!=='true')return;
 try{
  if(!audioContext||audioContext.state!=='running')return;
  const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
  osc.type='sine';osc.frequency.setValueAtTime(880,now);
  gain.gain.setValueAtTime(0.0001,now);gain.gain.exponentialRampToValueAtTime(0.12,now+0.015);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.12);
  osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+0.13);
 }catch(_){}
}
function updateCameraControls(){
 const torch=overlay?.querySelector('#nav-scan-torch');
 const zoom=overlay?.querySelector('#nav-scan-zoom-wrap');
 if(torch){torch.hidden=!activeTrack||!zoomCaps?.torch;torch.textContent=torchOn?'🔦 Apagar':'🔦 Linterna';torch.setAttribute('aria-pressed',String(torchOn));}
 if(zoom)zoom.hidden=!activeTrack||!zoomCaps?.zoom;
}
function setupCameraControls(){
 activeTrack=null;zoomCaps=null;torchOn=false;
 try{
  const video=overlay?.querySelector('#nav-scan-camera video');
  const track=video?.srcObject?.getVideoTracks?.()[0];
  if(track&&track.readyState==='live'){
   activeTrack=track;
   const caps=typeof track.getCapabilities==='function'?track.getCapabilities():{};
   zoomCaps={torch:!!caps.torch,zoom:caps.zoom||null};
   const range=overlay?.querySelector('#nav-scan-zoom');
   if(range&&caps.zoom){
    range.min=String(caps.zoom.min);range.max=String(caps.zoom.max);
    range.step=String(caps.zoom.step||0.1);
    const settings=track.getSettings?.()||{};
    range.value=String(Math.min(caps.zoom.max,Math.max(caps.zoom.min,settings.zoom||caps.zoom.min)));
   }
  }
 }catch(_){}
 updateCameraControls();
}
async function toggleTorch(){
 if(!activeTrack||!zoomCaps?.torch||closed)return;
 const track=activeTrack,next=!torchOn;
 try{
  await track.applyConstraints({advanced:[{torch:next}]});
  if(track!==activeTrack||closed)return;
  torchOn=next;updateCameraControls();
 }catch(_){setStatus('Este iPhone o Safari no permite controlar la linterna desde la página.',true);}
}
async function changeZoom(value){
 const track=activeTrack,caps=zoomCaps?.zoom;
 if(!track||!caps||closed||!Number.isFinite(value))return;
 const next=Math.min(caps.max,Math.max(caps.min,value));
 try{await track.applyConstraints({advanced:[{zoom:next}]});}
 catch(_){setStatus('Safari no permitió ajustar el zoom de esta cámara.',true);}
}

// V7: motor 1D alternativo sobre imágenes de la MISMA cámara.
function showDiagnostic(){
 const el=overlay?.querySelector('#nav-scan-diagnostic');
 if(!el)return;
 el.hidden=!diagVisible;
 if(!diagVisible)return;
 const video=overlay.querySelector('#nav-scan-camera video');
 const track=video?.srcObject?.getVideoTracks?.()[0];
 const catalog=Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB.length:'no cargado';
 el.textContent='Video '+(video?.videoWidth||0)+'×'+(video?.videoHeight||0)+
  ' · Cámara '+(track?.readyState||'no disponible')+
  ' · Catálogo '+catalog+' · Motor 1: '+primaryHits+
  ' lecturas · Motor 2: '+altState+' ('+altHits+' lecturas)';
}
function loadAlternative(){
 if(window.Quagga)return Promise.resolve();
 if(altLoading)return altLoading;
 altState='cargando';showDiagnostic();
 const urls=['https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.12.1/dist/quagga.min.js',
             'https://unpkg.com/@ericblade/quagga2@1.12.1/dist/quagga.min.js'];
 altLoading=new Promise((resolve,reject)=>{
  let index=0;
  function next(){
   if(index>=urls.length){reject(new Error('Motor alternativo no disponible'));return;}
   const script=document.createElement('script');
   script.src=urls[index++];script.async=true;script.crossOrigin='anonymous';
   script.onload=()=>window.Quagga?resolve():next();
   script.onerror=next;document.head.appendChild(script);
  }
  next();
 }).then(()=>{altState='listo';showDiagnostic();})
   .catch(err=>{altLoading=null;altState='sin conexión';showDiagnostic();throw err;});
 return altLoading;
}
function decodeAlternative(src,size){
 return new Promise(resolve=>{
  if(!window.Quagga){resolve('');return;}
  let done=false;
  const timer=setTimeout(()=>{if(!done){done=true;resolve('');}},4800);
  try{
   window.Quagga.decodeSingle({
    src:src,numOfWorkers:0,locate:true,inputStream:{size:size||1200},
    decoder:{readers:['code_128_reader','ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_39_reader','i2of5_reader']}
   },result=>{
    if(done)return;done=true;clearTimeout(timer);
    const code=String(result?.codeResult?.code||'').replaceAll(' ','').replaceAll('-','');
    resolve(/^[0-9]{5,}$/.test(code)?code:'');
   });
  }catch(_){if(!done){done=true;clearTimeout(timer);resolve('');}}
 });
}
function cameraSnapshot(){
 const video=overlay?.querySelector('#nav-scan-camera video');
 if(!video||video.readyState<2||!video.videoWidth||!video.videoHeight)return '';
 const w=video.videoWidth,h=video.videoHeight,crop=++altFrames%2===0;
 const cw=crop?w*.78:w,ch=crop?h*.78:h,scale=Math.min(1,1280/cw);
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(cw*scale));canvas.height=Math.max(1,Math.round(ch*scale));
 const ctx=canvas.getContext('2d');if(!ctx)return '';
 ctx.drawImage(video,(w-cw)/2,(h-ch)/2,cw,ch,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',.92);
}
function scheduleAlternative(token,epoch,ms){
 if(closed||token!==session||epoch!==altEpoch)return;
 altTimer=setTimeout(()=>{void alternativeFrame(token,epoch)},ms);
}
async function alternativeFrame(token,epoch){
 if(closed||token!==session||epoch!==altEpoch)return;
 if(opening||busy||photoBusy||!reader){scheduleAlternative(token,epoch,950);return;}
 try{
  const frame=cameraSnapshot();
  if(frame){
   const code=await decodeAlternative(frame,1200);
   if(closed||token!==session||epoch!==altEpoch)return;
   if(code){
    altHits++;showDiagnostic();
    const now=Date.now();
    if(code===altCandidate&&now-altCandidateAt<7000)altConfirmations++;
    else{altCandidate=code;altConfirmations=1;}
    altCandidateAt=now;
    // Aceptar solamente 2 lecturas coincidentes para evitar falsos positivos.
    if(altConfirmations>=2){altCandidate='';altConfirmations=0;await decoded(code,'alternative');}
   }
  }
  altState='activo';showDiagnostic();
 }catch(_){altState='error de imagen';showDiagnostic();}
 scheduleAlternative(token,epoch,1100);
}
async function startAlternative(token){
 const epoch=++altEpoch;
 await pause(3000);
 if(closed||token!==session||epoch!==altEpoch)return;
 try{
  await loadAlternative();
  if(closed||token!==session||epoch!==altEpoch)return;
  altState='activo';showDiagnostic();scheduleAlternative(token,epoch,250);
 }catch(_){
  if(!closed&&token===session&&epoch===altEpoch){
   altState='no disponible (motor 1 y foto continúan)';showDiagnostic();
  }
 }
}
function readPhoto(file){
 return new Promise((resolve,reject)=>{
  const fr=new FileReader();
  fr.onload=()=>resolve(String(fr.result||''));
  fr.onerror=()=>reject(new Error('No se pudo abrir la foto'));
  fr.readAsDataURL(file);
 });
}
async function alternativePhoto(file){
 await loadAlternative();
 return await decodeAlternative(await readPhoto(file),1600);
}

async function scanPhoto(file){
 if(!file||closed||photoBusy)return;
 const token=session;photoBusy=true;
 try{
  if(photoStop)await photoStop;
  await stop();
  if(closed||token!==session)return;
  if(!String(file.type||'').startsWith('image/'))throw new Error('Selecciona una fotografía');
  await loadLibrary();
  setStatus('Analizando la fotografía…');
  const F=window.Html5QrcodeSupportedFormats||{};
  const formats=[F.CODE_128,F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_39,F.ITF].filter(Number.isInteger);
  photoReader=createBarcodeReader('nav-scan-photo-reader',formats);
  let code='';
  try{code=await photoReader.scanFile(file,false);}
  catch(_){
   setStatus('Probando motor alternativo en la fotografía…');
   code=await alternativePhoto(file);
  }
  if(closed||token!==session)return;
  if(!code)throw new Error('Ningún motor identificó las barras');
  await decoded(code,'photo');
 }catch(e){
  if(!closed&&token===session)setStatus('No se pudo leer la foto. Intenta con más luz, el código completo y sin reflejos. '+String(e?.message||''),true);
 }finally{
  if(photoReader){try{await photoReader.clear()}catch(_){}photoReader=null}
  photoBusy=false;photoStop=null;
  const input=overlay?.querySelector('#nav-scan-photo');if(input)input.value='';
 }
}
async function open(){
 if(opening||busy||!closed)return;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
  window.alert('Abre la tienda con HTTPS y permite el acceso a la cámara en Safari o Chrome.');
  return;
 }
 ensureOverlay();
 var token=++session;
 opening=true;closed=false;lastCode='';lastProduct=null;sessionUnits=0;sessionCodes=new Set();
 primaryHits=0;altHits=0;altFrames=0;altCandidate='';altConfirmations=0;altState='esperando';diagVisible=false;
 nextAllowedAt=0;unknown='';unknownAt=0;overlay.hidden=false;
 document.body.classList.add('nav-scan-open');setStatus('Preparando cámara…');updateProgress();
 try{
  await loadLibrary();if(closed||token!==session)return;
  var F=window.Html5QrcodeSupportedFormats||{};
  var supported=[F.CODE_128,F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_39,F.ITF].filter(Number.isInteger);
  reader=createBarcodeReader('nav-scan-camera',supported);
  // En iPhone, escanear toda la imagen evita recortar barras largas fuera del cuadro.
  // Safari puede ignorar la resolución ideal. Si la rechaza, volver al arranque básico.
  const onFound=code=>{primaryHits++;showDiagnostic();void decoded(code)};
  try{
   await reader.start({facingMode:'environment'},{fps:12,disableFlip:true,videoConstraints:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}},onFound,()=>{});
  }catch(_hdError){
   try{await reader.stop()}catch(_){}
   try{await reader.clear()}catch(_){}
   reader=createBarcodeReader('nav-scan-camera',supported);
   await reader.start({facingMode:'environment'},{fps:10,disableFlip:true},onFound,()=>{});
  }
  if(closed||token!==session){await stop();return}
  // Algunos iPhone (iOS 26) necesitan reconfigurar el track de video
  // despues de iniciar la camara para que ZXing procese los fotogramas.
  if(/(iPhone|iPad|iPod)/i.test(navigator.userAgent)){
   try{
    await pause(180);
    if(!closed&&token===session){
     await reader.applyVideoConstraints({width:{ideal:1280},height:{ideal:720}});
    }
   }catch(_){}
  }
  if(closed||token!==session){await stop();return}
  setupCameraControls();showDiagnostic();void startAlternative(token);
  setStatus('📷 Lector continuo V8 activo. Escanea un código; se agregará al carrito y la cámara seguirá lista para el siguiente.');
 }catch(err){
  if(closed||token!==session)return;
  var msg=String(err?.message||err||'');
  setStatus(/denied|NotAllowed|Permission/i.test(msg)?'Debes permitir el acceso a la cámara.':('No se pudo abrir la cámara: '+msg),true);
  await stop();
 }finally{if(token===session)opening=false}
}
function attach(){
 var inputs=[...new Set([...document.querySelectorAll('#search,#search-mobile,input[type="search"]')])];
 for(var input of inputs){
  if(input.dataset.navarroScanAttached)continue;
  var host=input.parentElement;if(!host)continue;
  input.dataset.navarroScanAttached='1';
  host.style.position='relative';
  var padding=parseFloat(getComputedStyle(input).paddingRight)||0;
  input.style.paddingRight=Math.max(padding,58)+'px';
  var btn=document.createElement('button');
  btn.type='button';btn.className='nav-scan-launch';btn.dataset.navarroScanLaunch='1';
  btn.textContent='📷';btn.title='Escanear código de barras';
  btn.setAttribute('aria-label','Abrir escáner de código de barras');
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();unlockAudio();void open()});
  host.appendChild(btn);
 }
}
function install(){
 var style=document.createElement('style');
 style.textContent='.nav-scan-launch{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:44px;height:44px;z-index:8;border:0;border-radius:12px;background:#102b54;color:white;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation;box-shadow:0 2px 9px #071a3933}#nav-scan-overlay[hidden]{display:none!important}#nav-scan-overlay{position:fixed;inset:0;background:#071a39df;z-index:2147483000;display:flex;align-items:end;justify-content:center;box-sizing:border-box;padding:10px 8px max(14px,env(safe-area-inset-bottom))} .nav-scan-panel{max-width:570px;max-height:calc(100dvh - 24px);overflow-y:auto;width:100%;background:white;border-radius:22px;padding:16px;box-sizing:border-box;box-shadow:0 12px 50px #0005}.nav-scan-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;color:#102b54;margin-bottom:10px}.nav-scan-head strong{font-size:18px}.nav-scan-head p{color:#66748a;font-size:12px;line-height:1.4;margin:5px 0}#nav-scan-close{width:44px;height:44px;border:0;border-radius:11px;background:#edf1f8;color:#102b54;font-size:20px;flex-shrink:0}#nav-scan-camera{background:#071a39;border-radius:12px;overflow:hidden;min-height:180px}#nav-scan-camera video{max-width:100%}#nav-scan-status{margin:14px 0 7px;text-align:center;font-size:14px;font-weight:700;color:#163859;overflow-wrap:anywhere}#nav-scan-status.error{color:#a52e2e}.nav-scan-help{color:#68788a;font-size:12px;text-align:center;line-height:1.4;margin:0}body.nav-scan-open{overflow:hidden}.nav-scan-pro-tools{display:flex;align-items:center;gap:8px;margin:7px 0;flex-wrap:wrap}.nav-scan-pro-tools button{border:0;border-radius:9px;background:#eaf0fa;color:#173453;padding:9px 10px;min-height:40px;font-weight:750}.nav-scan-pro-tools button[hidden],.nav-scan-pro-tools label[hidden]{display:none!important}.nav-scan-pro-tools label{display:flex;align-items:center;gap:5px;font-size:12px;color:#173453;font-weight:700;flex:1;min-width:140px}.nav-scan-pro-tools input{min-width:70px;width:100%;accent-color:#102b54}.nav-scan-tools{display:flex;gap:8px;margin:9px 0}.nav-scan-tools button{flex:1;background:#102b54;color:#fff;border:0;border-radius:10px;min-height:44px;font-weight:750;font-size:12px}.nav-scan-file-input{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}#nav-scan-photo-reader{position:absolute;left:-10000px;top:0;width:320px;height:240px;opacity:0;pointer-events:none}#nav-scan-manual{display:flex;gap:7px;margin:7px 0 10px}#nav-scan-manual input{min-width:0;flex:1;min-height:43px;border:1px solid #ccd6e6;border-radius:10px;font-size:16px;padding:0 10px}#nav-scan-manual button{border:0;border-radius:10px;background:#e7b549;color:#142842;min-height:43px;padding:0 10px;font-size:12px;font-weight:800}#nav-scan-camera video{min-height:210px;object-fit:contain}#nav-scan-diagnostic{font-size:11px;line-height:1.5;background:#eff4f9;border:1px solid #c9d8e9;border-radius:9px;color:#30485f;padding:8px;margin:4px 0 8px;overflow-wrap:anywhere}#nav-scan-diagnostic[hidden]{display:none!important}.nav-scan-summary{background:#edf4fd;border:1px solid #d3e4f7;color:#122f52;border-radius:11px;padding:11px;font-weight:800;font-size:13px;text-align:center;margin:8px 0}#nav-scan-repeat{border:0;border-radius:12px;background:#e7b549;color:#142842;font-size:13px;font-weight:850;min-height:44px;padding:10px 12px;width:100%;margin-bottom:9px;white-space:normal;overflow-wrap:anywhere}#nav-scan-repeat[hidden]{display:none!important}#nav-scan-repeat:disabled{opacity:.6}';
 document.head.appendChild(style);attach();
 new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.NAVARRO_ESCANER_PROBAR_CODIGO=decoded;
})();