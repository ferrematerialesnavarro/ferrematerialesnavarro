/* NAVARRO 360: escáner de barras V1. Solo UI; el carrito lo gestiona la app original. */
(function(){
'use strict';
if(window.NAVARRO_ESCANER_INSTALADO)return;
window.NAVARRO_ESCANER_INSTALADO=true;
var CDN='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
var overlay=null,reader=null,loading=null,opening=false,busy=false,closed=true,unknown='',unknownAt=0;
var pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
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
async function addFound(p){
 if(!searchCode(p.code))return {ok:false,reason:'No se encontró la barra de búsqueda'};
 for(var i=0;i<16;i++){
  await pause(i===0?180:120);
  var card=findCard(p.code);
  if(!card)continue;
  var control=card.querySelector('[data-inc="'+p.code+'"],[data-plus="'+p.code+'"],[data-add="'+p.code+'"]');
  var element=control||card;
  var before=cartFingerprint(),previous=quantityLabel(p.code);
  element.click();
  await pause(280);
  var changed=before!==cartFingerprint()||previous!==quantityLabel(p.code);
  return {ok:changed,reason:changed?'':'Se encontró el producto, pero no se confirmó el aumento de cantidad'};
 }
 return {ok:false,reason:'Se encontró el código en el catálogo, pero no apareció en el buscador'};
}
function ensureOverlay(){
 if(overlay)return;
 overlay=document.createElement('div');overlay.id='nav-scan-overlay';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Lector de código de barras');
 overlay.innerHTML='<div class="nav-scan-panel"><div class="nav-scan-head"><div><strong>📷 Escanear producto</strong><p>Enfoca el código de barras para agregar una unidad al carrito.</p></div><button id="nav-scan-close" type="button" aria-label="Cerrar cámara">✕</button></div><div id="nav-scan-camera"></div><p id="nav-scan-status" role="status" aria-live="polite">Preparando cámara…</p><p class="nav-scan-help">Permite el acceso a la cámara. Utiliza buena iluminación.</p></div>';
 document.body.appendChild(overlay);
 overlay.querySelector('#nav-scan-close').addEventListener('click',()=>void close());
 overlay.addEventListener('click',e=>{if(e.target===overlay)void close()});
}
async function stop(){
 var prev=reader;reader=null;if(!prev)return;
 try{await prev.stop()}catch(_){}
 try{await prev.clear()}catch(_){}
}
async function close(){
 closed=true;opening=false;busy=false;
 await stop();
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
async function decoded(value){
 if(closed||busy)return;
 var p=productFor(value);
 if(!p){
  var code=String(value||'').trim(),now=Date.now();
  if(unknown===code&&now-unknownAt<1800)return;
  unknown=code;unknownAt=now;
  setStatus('Código no registrado: '+code+'. No se agregó al carrito.',true);
  return;
 }
 busy=true;setStatus('Producto encontrado: '+p.name+'. Agregando…');
 await stop();
 if(closed)return;
 var result=await addFound(p);
 await close();
 toast(result.ok?'✓ Agregada 1 unidad: '+p.name+' ('+p.code+')':result.reason+'. Código: '+p.code);
}
async function open(){
 if(opening||busy)return;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
  window.alert('Abre la tienda con HTTPS y permite el acceso a la cámara en Safari o Chrome.');
  return;
 }
 ensureOverlay();
 opening=true;closed=false;overlay.hidden=false;
 document.body.classList.add('nav-scan-open');setStatus('Preparando cámara…');
 try{
  await loadLibrary();if(closed)return;
  var F=window.Html5QrcodeSupportedFormats||{};
  var supported=[F.CODE_128,F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_39].filter(Number.isInteger);
  reader=new window.Html5Qrcode('nav-scan-camera',{formatsToSupport:supported,verbose:false});
  await reader.start({facingMode:'environment'},{
   fps:10,qrbox:(width,height)=>({width:Math.min(290,Math.max(135,Math.floor(width*.85))),height:Math.min(130,Math.max(75,Math.floor(height*.32)))}),
   aspectRatio:1.777778,disableFlip:true
  },code=>{void decoded(code)},()=>{});
  if(closed){await stop();return}
  setStatus('Cámara lista. Enfoca las líneas del código de barras.');
 }catch(err){
  var msg=String(err?.message||err||'');
  setStatus(/denied|NotAllowed|Permission/i.test(msg)?'Debes permitir el acceso a la cámara.':('No se pudo abrir la cámara: '+msg),true);
  await stop();
 }finally{opening=false}
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
  btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void open()});
  host.appendChild(btn);
 }
}
function install(){
 var style=document.createElement('style');
 style.textContent='.nav-scan-launch{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:44px;height:44px;z-index:8;border:0;border-radius:12px;background:#102b54;color:white;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation;box-shadow:0 2px 9px #071a3933}#nav-scan-overlay[hidden]{display:none!important}#nav-scan-overlay{position:fixed;inset:0;background:#071a39df;z-index:2147483000;display:flex;align-items:end;justify-content:center;box-sizing:border-box;padding:10px 8px max(14px,env(safe-area-inset-bottom))}.nav-scan-panel{max-width:570px;width:100%;background:white;border-radius:22px;padding:16px;box-sizing:border-box;box-shadow:0 12px 50px #0005}.nav-scan-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;color:#102b54;margin-bottom:10px}.nav-scan-head strong{font-size:18px}.nav-scan-head p{color:#66748a;font-size:12px;line-height:1.4;margin:5px 0}#nav-scan-close{width:44px;height:44px;border:0;border-radius:11px;background:#edf1f8;color:#102b54;font-size:20px;flex-shrink:0}#nav-scan-camera{background:#071a39;border-radius:12px;overflow:hidden;min-height:180px}#nav-scan-camera video{max-width:100%}#nav-scan-status{margin:14px 0 7px;text-align:center;font-size:14px;font-weight:700;color:#163859;overflow-wrap:anywhere}#nav-scan-status.error{color:#a52e2e}.nav-scan-help{color:#68788a;font-size:12px;text-align:center;line-height:1.4;margin:0}body.nav-scan-open{overflow:hidden}';
 document.head.appendChild(style);attach();
 new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.NAVARRO_ESCANER_PROBAR_CODIGO=decoded;
})();