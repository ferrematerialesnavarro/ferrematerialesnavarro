/* NAVARRO 360 — impresión automática NGROK gratuito autorizado V6 · historial de tickets
 * Un toque -> POS-58-Series por HTTPS, sin AirPrint, sin WhatsApp, sin SIFO.
 * Solo se activa si este navegador está vinculado por un enlace privado.
 * No borra el carrito; la respuesta confirma cola Windows, no salida física.
 */
(function(){
'use strict';
if(window.NAVARRO_PRINT_BRIDGE_V1)return;
window.NAVARRO_PRINT_BRIDGE_V1=true;
const STORAGE='navarro360_print_bridge_pair_v1';
const $=id=>document.getElementById(id);
const read=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(_){return {}}};
const validPair=p=>!!(p&&typeof p.url==='string'&&/^https:\/\/[a-z0-9-]+\.ngrok-free\.(?:dev|app)\/?$/.test(p.url)&&/^[0-9a-f]{64}$/.test(p.token||''));
let pair=null,busy=false;
try{const p=JSON.parse(localStorage.getItem(STORAGE)||'null');if(validPair(p))pair=p}catch(_){}
let alertTimer;
function status(message,bad){
 let box=$('nv-print-bridge-status');
 if(!box){box=document.createElement('div');box.id='nv-print-bridge-status';
 box.style.cssText='position:fixed;bottom:calc(97px + env(safe-area-inset-bottom));left:10px;right:10px;max-width:420px;margin:auto;padding:13px 15px;border-radius:12px;background:#165b3c;color:white;box-shadow:0 8px 30px #1115;z-index:2147483009;font:800 13px/1.4 system-ui;text-align:center';
 document.body.appendChild(box)}
 box.textContent=message;box.style.background=bad?'#a12929':'#165b3c';box.hidden=false;
 clearTimeout(alertTimer);alertTimer=setTimeout(()=>box.hidden=true,bad?5500:3300);
}
// Copiar la vinculación de Safari y pegarla en la app instalada:
 // iOS mantiene separados los datos locales de cada aplicación web.
function parsePairInput(input){
 const raw=String(input||'').trim();
 if(raw.length>4000)throw Error('El enlace es demasiado largo');
 let fragment=raw;
 if(/^https:\/\//i.test(raw)){
  const u=new URL(raw);
  if(u.origin!==location.origin||!u.pathname.startsWith('/ferrematerialesnavarro/navarro360-movil/'))
   throw Error('Utiliza un enlace de vinculación de NAVARRO 360');
  fragment=u.hash;
 }else if(raw.startsWith('navprint='))fragment='#'+raw;
 if(!fragment.startsWith('#navprint='))throw Error('Pega el enlace privado completo de vinculación');
 const code=fragment.slice(10);
 if(!/^[A-Za-z0-9_-]{40,2000}$/.test(code))throw Error('Código de vinculación inválido');
 const bin=atob(code.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(code.length/4)*4,'='));
 const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
 const p=JSON.parse(new TextDecoder().decode(bytes));
 if(!validPair(p))throw Error('El enlace no corresponde a la impresora configurada');
 return p;
}
function pairingUrl(p){
 if(!validPair(p))throw Error('Impresora sin vincular');
 const bytes=new TextEncoder().encode(JSON.stringify({url:p.url,token:p.token}));
 let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const code=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 return location.origin+location.pathname+'#navprint='+code;
}
function applyPair(p){
 if(!validPair(p))throw Error('Vinculación incorrecta');
 localStorage.setItem(STORAGE,JSON.stringify({url:p.url,token:p.token}));
 pair={url:p.url,token:p.token};
 refreshPairUI();
}
function receivePair(){
 if(!location.hash.startsWith('#navprint='))return;
 try{
  applyPair(parsePairInput(location.hash));
  history.replaceState(null,'',location.pathname+location.search);
  setTimeout(()=>status('✓ Impresora vinculada. Ya puedes imprimir con un toque.',false),200);
 }catch(err){status('No se pudo vincular la impresora: '+(err.message||'vuelve a abrir el enlace'),true)}
}
function refreshPairUI(){
 const button=$('nv-print-ticket-button');
 if(button&&pair){
  button.textContent='🖨 Imprimir';
  button.setAttribute('aria-label','Imprimir directamente en POS-58-Series sin menús');
  button.style.background='#146f3e';
 }
 const settings=$('nv-printer-settings');
 if(settings){
  settings.textContent=pair?'✓ Impresora vinculada · Configurar':'🔗 Vincular impresora para la app';
  settings.setAttribute('aria-label',pair?'Consultar o copiar vinculación de impresora':'Vincular la impresora con este dispositivo');
 }
 const desc=$('nv-printer-pair-desc');
 if(desc)desc.textContent=pair?
  'Impresora conectada en ESTE navegador o app. Puedes copiar su vinculación para instalar NAVARRO 360 en otra aplicación del mismo iPhone.':
  'Esta app todavía no tiene la vinculación guardada. Copia el enlace privado desde Safari y pégalo aquí una sola vez.';
 const copy=$('nv-printer-copy');
 if(copy)copy.hidden=!pair;
}
function setupPairUI(button){
 const settings=document.createElement('button');
 settings.type='button';settings.id='nv-printer-settings';
 settings.style.cssText='width:100%;min-height:45px;margin:4px 0 12px;border:1px solid #a9c5b1;border-radius:11px;background:#eff7f0;color:#195233;font:800 13px system-ui;cursor:pointer';
 button.parentElement.insertBefore(settings,button.nextSibling);
 const overlay=document.createElement('div');overlay.id='nv-printer-pair-overlay';overlay.hidden=true;
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483200;background:#082719df;display:flex;align-items:center;justify-content:center;padding:15px;box-sizing:border-box;overflow-y:auto';
 const modalCss=document.createElement('style');
 modalCss.textContent='#nv-printer-pair-overlay[hidden]{display:none!important}';
 document.head.appendChild(modalCss);
 overlay.innerHTML=
  '<section role="dialog" aria-modal="true" aria-labelledby="nv-printer-pair-title" style="background:#fff;color:#153b2a;max-width:460px;width:100%;padding:18px;border-radius:17px;box-sizing:border-box;box-shadow:0 15px 50px #0005;font-family:system-ui">'+
  '<h2 id="nv-printer-pair-title" style="font-size:20px;margin:0 0 9px">🖨 Vincular impresora</h2>'+
  '<p id="nv-printer-pair-desc" style="font:14px/1.45 system-ui;margin:0 0 14px"></p>'+
  '<label for="nv-printer-paste" style="display:block;font-size:13px;font-weight:800;margin-bottom:6px">Enlace privado de la impresora</label>'+
  '<textarea id="nv-printer-paste" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Pega aquí el enlace de vinculación de NAVARRO 360" style="box-sizing:border-box;width:100%;border:1px solid #9fb9a8;border-radius:9px;padding:10px;font:16px/1.3 system-ui;background:white;color:#163d28;resize:vertical"></textarea>'+
  '<p style="font:12px/1.45 system-ui;color:#55665c">En Safari, abre NAVARRO 360 → Carrito → Impresora vinculada → Copiar vinculación. Regresa a la app de inicio, pega y guarda. No compartas este enlace.</p>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0">'+
  '<button type="button" id="nv-printer-import" style="min-height:47px;border:0;background:#176641;color:#fff;border-radius:10px;font:800 13px system-ui">✓ Guardar vínculo</button>'+
  '<button type="button" id="nv-printer-copy" style="min-height:47px;border:1px solid #b8ceb9;background:#eef5f0;color:#205439;border-radius:10px;font:800 13px system-ui">Copiar vinculación</button>'+
  '<button type="button" id="nv-printer-paste-clipboard" style="min-height:44px;border:1px solid #b8ceb9;background:white;color:#205439;border-radius:10px;font:800 12px system-ui">Pegar desde portapapeles</button>'+
  '<button type="button" id="nv-printer-close" style="min-height:44px;border:1px solid #b8ceb9;background:white;color:#205439;border-radius:10px;font:800 12px system-ui">Cerrar</button></div>'+
  '<p id="nv-printer-pair-error" role="status" style="font:12px/1.4 system-ui;color:#9b2626;margin:0"></p>'+
  '</section>';
 document.body.appendChild(overlay);
 const err=$('nv-printer-pair-error'),field=$('nv-printer-paste');
 const close=()=>{field.value='';err.textContent='';overlay.hidden=true};
 settings.addEventListener('click',()=>{err.textContent='';err.style.color='#9b2626';overlay.hidden=false;refreshPairUI();field.focus()});
 $('nv-printer-close').addEventListener('click',close);
 $('nv-printer-import').addEventListener('click',()=>{
  try{applyPair(parsePairInput(field.value));close();status('✓ App vinculada. Ahora imprime con un solo toque.',false)}
  catch(ex){err.style.color='#9b2626';err.textContent=ex.message||'Enlace inválido'}
 });
 $('nv-printer-copy').addEventListener('click',async()=>{
  try{
   const link=pairingUrl(pair);
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
   else{field.value=link;field.focus();field.select();err.textContent='Selecciona y copia el enlace mostrado.';return}
   err.style.color='#1e7045';err.textContent='✓ Vinculación copiada. Pégala dentro de la app instalada.';
  }catch(ex){err.style.color='#9b2626';err.textContent='No se pudo copiar. Intenta desde Safari.'}
 });
 $('nv-printer-paste-clipboard').addEventListener('click',async()=>{
  try{field.value=await navigator.clipboard.readText();err.textContent='Ahora toca «Guardar vínculo».'}
  catch(_){field.focus();err.textContent='Mantén presionado el campo y selecciona Pegar.'}
 });
 overlay.addEventListener('click',ev=>{if(ev.target===overlay)close()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!overlay.hidden)close()});
 refreshPairUI();
}
function buildTicket(){
 const cart=read('navarro_cart_v1'),cl=read('navarro_clavos_importe_v1');
 const imp=read('navarro_importes_cents_v1'),over=read('navarro360_precio_caja_activa_v1');
 const db=window.NAVARRO_DB;
 if(!Array.isArray(db))throw Error('El catálogo todavía no está cargado');
 const catalog=new Map(db.filter(Array.isArray).map(x=>[String(x[0]),{name:String(x[1]||''),price:Number(x[2])}]));
 catalog.set('00000',{name:'PRODUCTOS VARIOS',price:20});
 let subtotal=0,rows=[];
 for(const [id,value] of Object.entries(cart)){
  const qty=Number(value),p=catalog.get(id);
  if(!/^\d{5,30}$/.test(id)||!Number.isFinite(qty)||qty<=0||qty>9999||!p||!Number.isFinite(p.price)||p.price<=0)
   throw Error('Revisa el producto '+id+'. Tiene cantidad o precio incorrecto');
  const x=Number(cl[id]),y=Number(imp[id]),z=Number(over[id]);
  const special=Number.isSafeInteger(x)&&x>0?x:(Number.isSafeInteger(y)&&y>0?y:0);
  const unit=Number.isSafeInteger(z)&&z>0?z:Math.round(p.price*100);
  const total=special||Math.round(qty*unit);
  if(!Number.isSafeInteger(total)||total<=0)throw Error('El importe no es válido para '+id);
  rows.push({id,name:p.name.slice(0,200),qty,unit,total,special:special>0});
  subtotal+=total;
 }
 if(!rows.length)throw Error('Agrega al menos un producto antes de imprimir');
 if(rows.length>100)throw Error('Máximo 100 productos por ticket');
 const state=$('nv-ticket-status')?.value||'none';
 const payment=['pagado','cobrar'].includes(state)?state:'none';
 const info=window.NAVARRO_COBRANZA_ENTREGA?.snapshot?.()||null;
 const address=String(info?.address??$('nv70-address')?.value??'').trim().slice(0,260);
 const phone=String(info?.phone||'').trim().slice(0,30);
 const hasFreight=rows.some(r=>r.id==='7777000010');
 const flete=hasFreight?0:(info?Number(info.flete)||0:($('nv-ticket-flete')?.checked?5000:0));
 if(flete!==0&&flete!==5000)throw Error('El flete no es válido');
 return {v:1,jobId:crypto.randomUUID(),at:new Date().toISOString(),
   rows,subtotal,flete,state:payment,client:String($('nv-ticket-client')?.value||'').trim().slice(0,100),address,phone};
}
const SALE_KEYS=['navarro_cart_v1','navarro_clavos_importe_v1','navarro_importes_cents_v1','navarro360_precio_caja_activa_v1'];
function saleVersion(){return SALE_KEYS.map(k=>{try{return localStorage.getItem(k)||''}catch(_){return ''}}).join('|')}
function resetPrintedSale(job,version){
 // Solo vaciar una venta si sus productos, importes y datos NO cambiaron
 // mientras Windows confirmaba la cola. Evita borrar una venta nueva.
 let current=null;
 try{current=window.NAVARRO_COBRANZA_ENTREGA?.snapshot?.()||null}catch(_){
  status('✓ Ticket enviado. Se conservó el carrito porque sus datos cambiaron.',false);
  return;
 }
 if(version!==saleVersion()||
   (current&&(current.address!==job.address||current.phone!==job.phone||current.flete!==job.flete))){
  status('✓ Ticket recibido. El carrito cambió durante la impresión y se conservó.',false);
  return;
 }
 const clear=$('clear-cart');
 if(!clear||typeof clear.click!=='function'){
  status('✓ Ticket recibido, pero no se pudo vaciar el carrito. Usa Vaciar carrito.',true);
  return;
 }
 try{clear.click()}catch(_){
  status('✓ Ticket recibido, pero no se pudo vaciar el carrito. Usa Vaciar carrito.',true);return;
 }
 // Método oficial: sincroniza carrito, buscador y precio en memoria.
 if(Object.keys(read('navarro_cart_v1')).length){
  status('✓ Ticket recibido, pero el carrito no se vació. Revísalo antes de la siguiente venta.',true);
  return;
 }
 try{window.NAVARRO_COBRANZA_ENTREGA?.reset?.()}catch(_){}
 for(const id of ['nv-ticket-client','nv-ticket-status','nv-ticket-flete']){
  const field=$(id);if(!field)continue;
  if(field.type==='checkbox')field.checked=false;
  else field.value=id==='nv-ticket-status'?'none':'';
 }
 status('✓ Ticket enviado. Carrito limpio, listo para nueva venta.',false);
}
async function autoPrint(event){
 if(!pair)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(busy)return;
 const button=$('nv-print-ticket-button');
 let job;
 try{job=buildTicket()}catch(err){status(err.message||'Carrito no válido',true);return}
 const version=saleVersion();
 busy=true;button.disabled=true;const label=button.textContent;button.textContent='⏳ Enviando a impresora…';
 const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),20000);
 try{
  const response=await fetch(pair.url.replace(/\/$/,'')+'/print',{
   method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+pair.token,'ngrok-skip-browser-warning':'true'},
   body:JSON.stringify(job),signal:ctrl.signal
  });
  let result={};try{result=await response.json()}catch(_){}
  if(!response.ok||!result.ok)throw Error(result.error||'No se pudo enviar el ticket a Windows');
  const history=window.NAVARRO_HISTORIAL;
  let saved=true;
  if(history&&typeof history.record==='function'){
   try{saved=history.record(job)===true}catch(_){saved=false}
  }
  if(!saved){
   // No perder el detalle de una venta que ya se aceptó pero no pudo guardarse.
   status('Ticket recibido por Windows, pero no se pudo guardar el historial. Conservamos el carrito para que revises la venta.',true);
   return;
  }
  resetPrintedSale(job,version);
 }catch(err){
  status('No se pudo imprimir: '+(err.name==='AbortError'?'conexión agotada':err.message||'revisa el puente en Windows')+'. El carrito se conservó.',true);
 }finally{clearTimeout(timeout);busy=false;button.disabled=false;button.textContent=label}
}
// Reimpresión explícita desde historial. Siempre crea un ID nuevo para que
// Windows pueda aceptar otra copia; nunca toca el carrito ni el pago actuales.
async function reimprimir(id){
 if(!pair)return {ok:false,error:'Esta app no tiene impresora vinculada.'};
 if(busy)return {ok:false,error:'Ya existe un trabajo en curso; evita imprimir dos veces.'};
 const old=window.NAVARRO_HISTORIAL?.get?.(id);
 if(!old||!Array.isArray(old.rows)||!old.rows.length)return {ok:false,error:'Ticket no encontrado en este dispositivo.'};
 busy=true;
 const button=$('nv-print-ticket-button');
 if(button)button.disabled=true;
 const ctrl=new AbortController();
 const timeout=setTimeout(()=>ctrl.abort(),20000);
 try{
  const job={...old,jobId:crypto.randomUUID(),reprintOf:old.jobId};
  const response=await fetch(pair.url.replace(/\/$/,'')+'/print',{
   method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+pair.token,'ngrok-skip-browser-warning':'true'},
   body:JSON.stringify(job),signal:ctrl.signal
  });
  let result={};try{result=await response.json()}catch(_){}
  if(!response.ok||!result.ok)return {ok:false,error:result.error||'Windows no confirmó el ticket.'};
  try{window.NAVARRO_HISTORIAL?.markReprint?.(id)}catch(_){}
  return {ok:true,queued:true};
 }catch(err){
  return {ok:false,error:err?.name==='AbortError'?'No se confirmó el envío en 20 segundos. Revisa si se imprimió antes de repetir.':'Falló la comunicación con la impresora; comprueba la conexión.'};
 }finally{clearTimeout(timeout);busy=false;if(button)button.disabled=false}
}
window.NAVARRO_PRINT_SILENCIOSA=Object.freeze({version:6,vinculado:()=>!!pair,reimprimir});
function init(){
 receivePair();
 const button=$('nv-print-ticket-button');
 if(!button)return;
 // Registrarlo siempre para que la nueva vinculación funcione sin recargar.
 button.addEventListener('click',autoPrint,true);
 setupPairUI(button);
 refreshPairUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();