/* NAVARRO 360 — ESCANER CAJA V13: iPhone ZXing, cuenta de venta y confirmación instantánea.
   Prueba aislada, sin modificar la tienda de clientes, WhatsApp ni SIFO. */
(function(){
'use strict';
if(window.NAVARRO_CAJA_ESCANER_V13)return;window.NAVARRO_CAJA_ESCANER_V13=true;
const $=id=>document.getElementById(id),BRIDGE=()=>window.NAVARRO_CAJA_TEST_BRIDGE;
const zxingUrls=['https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js','https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js'];
const quaggaUrls=['https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.12.1/dist/quagga.min.js','https://unpkg.com/@ericblade/quagga2@1.12.1/dist/quagga.min.js'];
const html5Urls=['https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js','https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'];
const readers=['code_128_reader','ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_39_reader','i2of5_reader'];
let overlay=null,video=null,controls=null,html5=null,engine='',active=false,opening=false,seq=0;
let lastCode='',lastItem=null,scanned=0,skus=new Set(),busy=false,minNext=0;
let scannerCycle=0,timer=null,altBusy=false,altCode='',altAt=0,altHits=0,frames=0;
let focusStage=0,lastRead=0,sound=null,problems=[],counts={zxing:0,html5:0,quagga:0,native:0};
let successTimer=null;const pesos=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const pause=n=>new Promise(ok=>setTimeout(ok,n));
function css(){
 if($('n12-style'))return;
 const s=document.createElement('style');s.id='n12-style';
 s.textContent='#n12[hidden]{display:none!important}#n12{position:fixed;inset:0;background:#071a13e9;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box}#n12 *{box-sizing:border-box}'+
 '.n12-card{background:#fff;color:#153d2a;width:min(100%,570px);border-radius:20px;max-height:calc(100dvh - 20px);overflow-y:auto;padding:15px;font:14px/1.5 system-ui,sans-serif}.n12-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.n12-head strong{font-size:19px}.n12-head small{display:block;color:#60796a;font-size:12px}.n12-card button{border:0;min-height:45px;border-radius:12px;padding:10px 12px;cursor:pointer;font:700 14px system-ui,sans-serif}'+
 '#n12-close{background:#eef3ef;color:#214b31}.n12-camera{position:relative;margin:13px 0;border-radius:17px;overflow:hidden;background:#13281c;min-height:200px}.n12-camera video{display:block;width:100%!important;height:270px!important;object-fit:cover!important}.n12-camera #n12-html5 video{width:100%!important}.n12-camera #n12-html5{width:100%}#n12-video[hidden],#n12-html5[hidden]{display:none!important}.n12-frame{pointer-events:none;position:absolute;inset:18% 8%;border:2px solid #80e4ae;border-radius:13px;box-shadow:0 0 0 1000px #001a101b}.n12-frame:after{content:"";position:absolute;top:50%;left:7%;right:7%;height:2px;background:#9af4c5;box-shadow:0 0 11px #88ebb5}'+
 '.n13-summary{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}.n13-metric{background:#eaf5ed;border:1px solid #cce5d3;border-radius:13px;padding:11px}.n13-metric small{display:block;font-size:11px;color:#476a56;font-weight:750;margin-bottom:3px}.n13-metric strong{font-size:20px;line-height:1.2;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.n13-success{position:absolute;z-index:4;left:11px;right:11px;bottom:12px;background:#0e8048f0;color:white;border-radius:13px;padding:10px 13px;font-weight:800;box-shadow:0 5px 20px #002c154f;line-height:1.4;overflow-wrap:anywhere}.n13-success small{display:block;font-size:12px;font-weight:650;opacity:.93}.n13-success[hidden]{display:none!important}.n12-camera:has(.n13-success:not([hidden])) .n12-frame{border-color:#b3ffda}'+
 '#n12-status{padding:11px;background:#e9f6ea;color:#194f35;border-radius:11px;font-size:13px;font-weight:700;min-height:42px}#n12-progress{text-align:center;margin:9px 0;font-weight:700;color:#476850;font-size:13px}.n12-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.n12-actions button{background:#146f43;color:white}.n12-actions button:nth-child(2){background:#e8f3eb;color:#18583a}#n12-repeat[hidden]{display:none}#n12-manual{margin-top:13px;padding-top:10px;border-top:1px solid #dfebe0}#n12-manual summary{font-size:12px;color:#62776b;cursor:pointer}.n12-code{display:flex;gap:8px;margin-top:9px}.n12-code input{min-width:0;flex:1;border-radius:10px;border:1px solid #bbd2c2;font-size:16px;padding:11px}.n12-code button{background:#217145;color:white}.n12-foot{font-size:11px;color:#657970;margin:9px 0 0}@media(max-height:690px){.n12-camera video{height:185px!important}.n12-card{padding:10px}}';
 document.head.appendChild(s);
}
function ui(){
 if(overlay)return;
 css();overlay=document.createElement('div');overlay.id='n12';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Escanear productos');
 overlay.innerHTML='<section class="n12-card"><div class="n12-head"><div><strong>📷 Escanear productos</strong><small>Cámara automática · NAVARRO 360</small></div><button type="button" id="n12-close">Cerrar ✕</button></div>'+
 '<div class="n12-camera"><video playsinline autoplay muted id="n12-video"></video><div hidden id="n12-html5"></div><div class="n12-frame"></div><div id="n13-success" class="n13-success" hidden aria-live="polite"></div></div>'+
 '<div class="n13-summary" aria-label="Resumen de venta en curso"><div class="n13-metric"><small>ARTÍCULOS EN CARRITO</small><strong id="n13-articles">0</strong></div><div class="n13-metric"><small>TOTAL DEL CARRITO</small><strong id="n13-total">$0.00</strong></div></div>'+
 '<div id="n12-status" role="status">Abriendo cámara…</div><div id="n12-progress">0 productos agregados en esta sesión</div>'+
 '<div class="n12-actions"><button type="button" id="n12-repeat" hidden>+1 del último</button><button type="button" id="n12-finish">✓ Terminar</button></div>'+
 '<details id="n12-manual"><summary>¿No reconoce las barras? Escribir el código</summary><div class="n12-code"><input id="n12-input" inputmode="numeric" autocomplete="off" placeholder="Código de barras"><button type="button" id="n12-add">Agregar</button></div></details>'+
 '<p class="n12-foot">Solo apunta a las barras completas dentro del recuadro. No es necesario mover el zoom.</p></section>';
 document.body.appendChild(overlay);video=$('n12-video');
 $('n12-close').addEventListener('click',close);$('n12-finish').addEventListener('click',close);
 $('n12-repeat').addEventListener('click',()=>{if(lastItem)void add(lastItem,'repeat')});
 $('n12-add').addEventListener('click',manual);
 $('n12-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();manual()}});
 overlay.addEventListener('click',e=>{if(e.target===overlay)void close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)void close()});
}
function status(s){if($('n12-status'))$('n12-status').textContent=s}
function displayCount(){
 $('n12-progress').textContent=scanned+' '+(scanned===1?'unidad agregada':'unidades agregadas')+' en esta sesión · '+skus.size+' productos distintos';
 updateTotals();
}
function updateTotals(){
 const b=BRIDGE();if(!b)return;
 try{
  const items=b.getItems(),summary=b.getSummary();
  const units=items.reduce((sum,item)=>sum+(item.special?1:Math.max(0,Number(item.qty)||0)),0);
  const articles=$('n13-articles'),total=$('n13-total');
  if(articles)articles.textContent=new Intl.NumberFormat('es-MX',{maximumFractionDigits:3}).format(units);
  if(total&&Number.isSafeInteger(summary.desired))total.textContent=pesos.format(summary.desired/100);
 }catch(e){log('totales',e)}
}
function showSuccess(product){
 const box=$('n13-success');if(!box)return;
 clearTimeout(successTimer);
 box.textContent='';
 const title=document.createElement('strong');title.textContent='✓ '+product.name;
 const hint=document.createElement('small');hint.textContent='Agregado al carrito · '+($('n13-total')?.textContent||'');
 box.append(title,hint);box.hidden=false;
 successTimer=setTimeout(()=>{box.hidden=true;},1450);
}
function log(t,e){problems.push(t+': '+String(e&&e.message||e).slice(0,100));if(problems.length>10)problems.shift()}
function normal(v){return String(v||'').replace(/[\s-]/g,'')}
function lookup(v){
 const b=BRIDGE(),code=normal(v);if(!b||!/^\d{5,30}$/.test(code)||code==='00000')return null;
 const options=[code];if(code.length===13&&code[0]==='0')options.push(code.slice(1));if(code.length===12)options.push('0'+code);
 for(const id of options){const p=b.getProduct(id);if(p&&p.id!=='00000')return {code:id,name:p.name||id}}
 return null;
}
function addCart(p){
 const b=BRIDGE();if(!b)return false;
 const existing=b.getItems(),found=existing.find(q=>q.code===p.code);
 if(!found)return b.addCode(p.code);
 const cart={};
 for(const x of existing)cart[x.code]={qty:x.special?1:x.qty,cents:x.priceCents};
 const qty=Math.round((Number(found.qty)+1)*1000)/1000;if(qty>9999)return false;
 cart[p.code].qty=qty;return b.replace(cart);
}
function prepareSound(){
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  sound=sound||new Audio();
  if(sound.state==='suspended')void sound.resume().catch(()=>{});
 }catch(_){}
}
function beep(){
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  sound=sound||new Audio();if(sound.state==='suspended')void sound.resume();
  const o=sound.createOscillator(),gain=sound.createGain(),t=sound.currentTime;
  o.frequency.value=880;gain.gain.setValueAtTime(.045,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.12);
  o.connect(gain);gain.connect(sound.destination);o.start(t);o.stop(t+.13);
 }catch(_){}
}
async function add(raw,reason){
 if(!active||busy)return false;
 const p=raw&&typeof raw==='object'?raw:lookup(raw);
 if(!p){if(reason==='manual')status('Código no encontrado en el catálogo.');return false}
 const now=Date.now();
 if(reason!=='manual'&&reason!=='repeat'&&p.code===lastCode)return false;
 if(reason!=='manual'&&reason!=='repeat'&&now<minNext)return false;
 busy=true;minNext=now+650;
 try{
  if(!addCart(p)){status('No se pudo agregar el producto al carrito.');return false}
  lastItem=p;lastCode=p.code;lastRead=Date.now();scanned++;skus.add(p.code);
  displayCount();showSuccess(p);
  $('n12-repeat').hidden=false;$('n12-repeat').textContent='+1 '+p.name.slice(0,22);
  status('✓ Agregado. Escanea el siguiente código.');
  if(navigator.vibrate)try{navigator.vibrate(50)}catch(_){}
  beep();return true;
 }catch(e){log('carrito',e);status('Error al actualizar el carrito.');return false}
 finally{busy=false}
}
function recognized(code,source){
 if(!active||opening)return;
 counts[source]=(counts[source]||0)+1;
 const p=lookup(code);
 if(!p){status('Detecté un código que no está en el catálogo: '+normal(code));return}
 void add(p,'camera');
}
function manual(){const e=$('n12-input'),v=e.value;void add(v,'manual').then(ok=>{if(ok){e.value='';e.focus()}})}
function loadScript(url,key,max=8500){
 if(window[key])return Promise.resolve(window[key]);
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');let done=false;
  const timeout=setTimeout(()=>finish(Error('Sin respuesta')),max);
  function finish(e){if(done)return;done=true;clearTimeout(timeout);if(e)reject(e);else if(window[key])resolve(window[key]);else reject(Error('Falta biblioteca'))}
  script.async=true;script.crossOrigin='anonymous';script.src=url;script.onload=()=>finish();script.onerror=()=>finish(Error('Sin conexión'));
  document.head.appendChild(script);
 });
}
async function loadAny(urls,key){
 if(window[key])return window[key];let err;
 for(const url of urls){try{return await loadScript(url,key)}catch(e){err=e}}
 throw err||Error('Motor no disponible');
}
function liveVideo(){return engine==='ZXing'?video:$('n12-html5')?.querySelector('video')}
function videoTrack(){return liveVideo()?.srcObject?.getVideoTracks?.()[0]||null}
function snapZoom(cap,value){
 if(!cap||!Number.isFinite(cap.min)||!Number.isFinite(cap.max))return null;
 let z=Math.max(cap.min,Math.min(cap.max,value));const step=Number(cap.step);
 if(Number.isFinite(step)&&step>0)z=cap.min+Math.round((z-cap.min)/step)*step;
 return Number(Math.max(cap.min,Math.min(cap.max,z)).toFixed(3));
}
async function tuneCamera(token,step){
 if(!active||token!==seq)return;
 const t=videoTrack();if(!t||t.readyState!=='live')return;
 try{
  const cap=t.getCapabilities?.()||{};
  if(step===0&&cap.focusMode?.includes('continuous'))try{await t.applyConstraints({advanced:[{focusMode:'continuous'}]})}catch(_){}
  if(!active||token!==seq)return;
  if(cap.zoom){
   const z=snapZoom(cap.zoom,cap.zoom.min+[.65,.95,1.15][Math.min(step,2)]);
   await t.applyConstraints({advanced:[{zoom:z}]});
  }else if(step===1&&engine==='ZXing'){
   await t.applyConstraints({width:{ideal:1280},height:{ideal:720}});
  }
 }catch(e){log('enfoque',e)}
}
function frame(crop){
 const v=liveVideo();if(!v||v.readyState<2||!v.videoWidth||!v.videoHeight)return '';
 const w=v.videoWidth,h=v.videoHeight,cw=crop?Math.round(w*.78):w,ch=crop?Math.round(h*.73):h;
 const ratio=Math.min(1,1600/cw),can=document.createElement('canvas');
 can.width=Math.max(1,Math.round(cw*ratio));can.height=Math.max(1,Math.round(ch*ratio));
 const ctx=can.getContext('2d',{willReadFrequently:true});if(!ctx)return '';
 ctx.drawImage(v,(w-cw)/2,(h-ch)/2,cw,ch,0,0,can.width,can.height);
 return can.toDataURL('image/jpeg',.94);
}
function quaggaDecode(src){
 return new Promise(resolve=>{
  if(!window.Quagga){resolve('');return}
  let settled=false;const to=setTimeout(()=>finish(''),4300);
  function finish(code){if(settled)return;settled=true;clearTimeout(to);resolve(code)}
  try{
   window.Quagga.decodeSingle({src,numOfWorkers:0,locate:true,locator:{halfSample:false,patchSize:'medium'},
    inputStream:{size:1600},decoder:{readers:readers}
   },r=>finish(normal(r?.codeResult?.code)));
  }catch(_){finish('')}
 });
}
function helpers(token){
 const loop=++scannerCycle;
 function tick(ms,fn){setTimeout(()=>{if(active&&token===seq&&scannerCycle===loop)void fn()},ms)}
 async function adjust(){
  if(!active||token!==seq||scannerCycle!==loop)return;
  if(!opening&&!busy&&focusStage<3&&Date.now()-lastRead>=4400){
   await tuneCamera(token,focusStage++);
  }
  tick(focusStage<3?4400:11500,adjust);
 }
 tick(850,adjust);
 void (async function native(){
  if(typeof window.BarcodeDetector!=='function')return;
  try{
   const all=await window.BarcodeDetector.getSupportedFormats(),formats=['code_128','code_39','ean_13','ean_8','upc_a','upc_e','itf'].filter(x=>all.includes(x));
   if(!formats.length)return;
   const det=new window.BarcodeDetector({formats});
   async function run(){
    if(!active||token!==seq||scannerCycle!==loop)return;
    const v=liveVideo();
    if(v?.readyState>=2&&!busy)try{for(const r of await det.detect(v))if(r.rawValue)recognized(r.rawValue,'native')}catch(_){}
    tick(1100,run);
   }
   tick(1000,run);
  }catch(_){}
 })();
 void (async function quagga(){
  await pause(2400);if(!active||token!==seq||scannerCycle!==loop)return;
  try{await loadAny(quaggaUrls,'Quagga')}catch(e){log('respaldo',e);return}
  async function run(){
   if(!active||token!==seq||scannerCycle!==loop)return;
   if(!altBusy&&!busy){
    altBusy=true;
    try{
     const src=frame((++frames)%2===0),code=src?await quaggaDecode(src):'';
     if(active&&token===seq&&scannerCycle===loop&&lookup(code)){
      const now=Date.now();
      if(code===altCode&&now-altAt<6500)altHits++;
      else{altCode=code;altHits=1}
      altAt=now;
      if(altHits>=2){altHits=0;altCode='';recognized(code,'quagga')}
     }
    }catch(e){log('imagen',e)}finally{altBusy=false}
   }
   tick(1200,run);
  }
  void run();
 })();
}
async function zxing(token){
 await loadAny(zxingUrls,'ZXingBrowser');if(!active||token!==seq)return;
 const ctor=window.ZXingBrowser.BrowserMultiFormatOneDReader||window.ZXingBrowser.BrowserMultiFormatReader;
 if(!ctor)throw Error('ZXing incompleto');
 const decoder=new ctor(undefined,{delayBetweenScanAttempts:130,delayBetweenScanSuccess:600});
 video.hidden=false;$('n12-html5').hidden=true;
 controls=await decoder.decodeFromConstraints(
  {audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}},
  video,(res)=>{if(res&&active&&token===seq)recognized(typeof res.getText==='function'?res.getText():res.text,'zxing')}
 );
 if(!active||token!==seq){try{controls.stop()}catch(_){}return}
 engine='ZXing';status('📷 Lista para escanear. Solo apunta a las barras.');helpers(token);
}
async function html(token){
 await loadAny(html5Urls,'Html5Qrcode');if(!active||token!==seq)return;
 const f=window.Html5QrcodeSupportedFormats||{};
 const fs=[f.CODE_128,f.EAN_13,f.EAN_8,f.UPC_A,f.UPC_E,f.CODE_39,f.ITF].filter(Number.isInteger);
 video.hidden=true;$('n12-html5').hidden=false;
 html5=new window.Html5Qrcode('n12-html5',{formatsToSupport:fs,verbose:false,useBarCodeDetectorIfSupported:false});
 await html5.start({facingMode:'environment'},{fps:12,disableFlip:true},
  code=>{if(active&&token===seq)recognized(code,'html5')},()=>{});
 if(!active||token!==seq){try{await html5.stop()}catch(_){}try{await html5.clear()}catch(_){}return}
 engine='html5';status('📷 Lista para escanear. Solo apunta a las barras.');helpers(token);
}
async function stopCamera(){
 scannerCycle++;if(timer)clearTimeout(timer);
 const c=controls;controls=null;
 const h=html5;html5=null;
 if(c)try{c.stop()}catch(_){}
 if(h){try{await h.stop()}catch(_){}try{await h.clear()}catch(_){}}
 if(video?.srcObject)try{video.srcObject.getTracks().forEach(t=>t.stop())}catch(_){}
 if(video)video.srcObject=null;engine='';
}
async function start(token){
 try{await zxing(token)}
 catch(e){
  log('ZXing',e);if(!active||token!==seq)return;
  await stopCamera();
  try{await html(token)}
  catch(ex){log('html5',ex);if(active&&token===seq)status('No pude abrir la cámara. Permite el acceso en Safari o usa la captura manual.')}
 }
}
async function open(){
 if(active||opening)return;
 if(!BRIDGE()||typeof BRIDGE().getItems!=='function'){alert('El catálogo aún no termina de cargar.');return}
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){alert('Abre la página mediante HTTPS en Safari y permite la cámara.');return}
 ui();prepareSound();active=true;opening=true;const token=++seq;scannerCycle++;
 lastCode='';lastItem=null;scanned=0;skus=new Set();busy=false;minNext=0;focusStage=0;lastRead=0;altCode='';altAt=0;altHits=0;counts={zxing:0,html5:0,quagga:0,native:0};problems=[];
 $('n12-repeat').hidden=true;const success=$('n13-success');if(success){success.hidden=true;clearTimeout(successTimer)}
 displayCount();
 overlay.hidden=false;document.body.style.overflow='hidden';status('Preparando la cámara…');
 try{await start(token)}finally{if(token===seq)opening=false}
}
async function close(){
 if(!active&&!opening)return;
 active=false;opening=false;seq++;scannerCycle++;
 if(overlay)overlay.hidden=true;document.body.style.overflow='';
 clearTimeout(successTimer);
 await stopCamera();
}
window.NAVARRO_CAJA_ESCANER_ABRIR_V13=open;
window.NAVARRO_CAJA_ESCANER_PROBAR_V13=code=>add(code,'manual');
window.NAVARRO_CAJA_ESCANER_ESTADO_V13=()=>({activo:active,motor:engine,unidades:scanned,productos:skus.size,detectores:counts,errores:problems.slice()});
})();