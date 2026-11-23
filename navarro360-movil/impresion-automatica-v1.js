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
 // La validación del domicilio puede quitar FLETE del carrito al alcanzar $1,000.
 // Debe ejecutarse ANTES de fotografiar las líneas que se imprimen.
 const info=window.NAVARRO_COBRANZA_ENTREGA?.snapshot?.()||null;
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
 const payment=!pair?'cobrar':['pagado','cobrar'].includes(state)?state:'none';
 const nota=window.NAVARRO_CAJA_EXPRES_V3?.notaPedido?.()||'';
 const address=String(info?.address??$('nv70-address')?.value??'').trim().slice(0,260);
 const phone=String(info?.phone||'').trim().slice(0,30);
 const hasFreight=rows.some(r=>r.id==='7777000010');
 const flete=hasFreight?0:(info?Number(info.flete)||0:($('nv-ticket-flete')?.checked?5000:0));
 if(flete!==0&&flete!==5000)throw Error('El flete no es válido');
 return {v:1,jobId:crypto.randomUUID(),at:new Date().toISOString(),
   rows,subtotal,flete,state:payment,...(payment==='cobrar'?{reference:[nota,String($('nv-credit-ref')?.value||'').trim()].filter(Boolean).join(' · ').slice(0,100)}:{}),client:String($('nv-ticket-client')?.value||'').trim().slice(0,100),address,phone};
}
const SALE_KEYS=['navarro_cart_v1','navarro_clavos_importe_v1','navarro_importes_cents_v1','navarro360_precio_caja_activa_v1'];
function saleVersion(){return SALE_KEYS.map(k=>{try{return localStorage.getItem(k)||''}catch(_){return ''}}).join('|')}
function resetPrintedSale(job,version,printed=true){
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
 try{window.NAVARRO_CAJA_EXPRES_V3?.limpiarMetodo?.()}catch(_){}
 for(const id of ['nv-ticket-client','nv-ticket-status','nv-ticket-flete','nv-credit-ref']){
  const field=$(id);if(!field)continue;
  if(field.type==='checkbox')field.checked=false;
  else field.value=id==='nv-ticket-status'?'none':'';
 }
 status(printed?'✓ Ticket enviado a Windows. Carrito limpio para nueva venta.':'Venta finalizada sin imprimir. Carrito limpio para nueva venta.',false);
}

const REPORTS_ORIGIN='https://navarro-reportes-movil.ferrematerialesnavar.chatgpt.site';
const REPORTS_CHANNEL='navarro-web-sales-v1';
const REPORT_PREFIX='navarro-report-pending:';
let reportsWindow=null,reportsReady=false,lastReady=0,reportDelivery=null,reportLabel=null,reportsTimer=null;
function pendingReportKeys(){
 return Object.keys(localStorage).filter(key=>key.startsWith(REPORT_PREFIX));
}
let automatic=null,sendingAuto=false;
try{automatic=JSON.parse(localStorage.getItem('navarro-ventas-equipo'));}catch{}
async function enrollAutomatic(){
 if(!location.hash.startsWith('#navventas='))return;
 const fragment=location.hash.slice("#navventas=".length);
 history.replaceState(null,'',location.pathname+location.search);
 try{
  const {url,code}=JSON.parse(atob(fragment.replace(/-/g,'+').replace(/_/g,'/')));
  if(!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(dev|app)$/.test(url)||!/^[a-f0-9]{64}$/.test(code))throw Error();
  const r=await fetch(url+'/ventas/alta',{method:'POST',headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},body:JSON.stringify({code}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error();
  const {token,caja}=await r.json();
  if(!/^[a-f0-9]{64}$/.test(token)||!/^[A-Z0-9_-]{2,30}$/.test(caja))throw Error();
  localStorage.setItem('navarro-ventas-equipo',JSON.stringify({url,token,caja}));location.reload();
 }catch{alert('No se pudo vincular la caja. Genera otro QR en Windows.');}
}
async function bridgePost(input){
 const r=await fetch(automatic.url+'/ventas/recibir',{method:'POST',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+automatic.token,'content-type':'application/json','ngrok-skip-browser-warning':'true'},body:JSON.stringify(input),signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error();return r.json();
}
async function automaticFlush(){
 if(sendingAuto)return;
 sendingAuto=true;
 try{
  const keys=pendingReportKeys(),own=keys.filter(k=>JSON.parse(localStorage.getItem(k)).caja===automatic.caja);
  sendAudit(own);
  for(const key of own.slice(0,10)){
   const sale=JSON.parse(localStorage.getItem(key));if(!sale)continue;
   const ack=await bridgePost(sale);if(!ack.ok||ack.id!==sale.id)throw Error();
   rememberSale(sale);localStorage.removeItem(key);
  }
  if(reportLabel)reportLabel.textContent='Caja '+automatic.caja+' · Pendientes en este dispositivo: '+pendingReportKeys().length;
 }catch{if(reportLabel)reportLabel.textContent='Envío pendiente. Reintentaremos automáticamente.';}
 finally{sendingAuto=false;}
}
queueMicrotask(enrollAutomatic);
setInterval(()=>{if(automatic)automaticFlush();},5000);
window.addEventListener('online',()=>{if(automatic)automaticFlush();});
function reportMessage(message){
 if(automatic&&message.type==='audit'){if(message.audit.caja===automatic.caja)bridgePost({...message.audit,operation:'estadoCaja'}).catch(()=>{});return;}
 if(reportsWindow&&!reportsWindow.closed)reportsWindow.postMessage({channel:REPORTS_CHANNEL,...message},REPORTS_ORIGIN);
}
const JOURNAL='navarro-report-audit:';
const localDay=at=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
let lastAudit=0;
function rememberSale(sale){
 const key=JOURNAL+localDay(sale.at)+':'+sale.id;
 if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({id:sale.id,caja:sale.caja,amount:sale.subtotal+sale.flete}));
}
function sendAudit(pending){
 if((!automatic&&!reportsReady)||Date.now()-lastAudit<15000)return;
 const date=localDay(Date.now()), prefix=JOURNAL+date+':';
 let device=localStorage.getItem('navarro-audit-device');
 if(!device){device=crypto.randomUUID();localStorage.setItem('navarro-audit-device',device);}
 const queue=pending.map(k=>JSON.parse(localStorage.getItem(k)));
 queue.forEach(rememberSale);
 const keys=Object.keys(localStorage).filter(k=>k.startsWith(JOURNAL));
 const cutoff=localDay(Date.now()-7*86400000);
 for(const k of keys)if(k.slice(JOURNAL.length,JOURNAL.length+10)<cutoff)localStorage.removeItem(k);
 const rows=keys.filter(k=>k.startsWith(prefix)).map(k=>JSON.parse(localStorage.getItem(k)));
 const boxes=new Set([automatic?.caja||window.NAVARRO_CAJA_IDENTIDAD?.codigo?.()||'SIN_ASIGNAR',...rows.map(r=>r.caja),...queue.map(r=>r.caja)]);
 for(const caja of boxes){
  const sales=rows.filter(r=>r.caja===caja);
  reportMessage({type:'audit',audit:{device,date,caja,pending:queue.filter(r=>r.caja===caja).length,complete:sales.length<=1000,sales:sales.slice(0,1000).map(({id,amount})=>({id,amount}))}});
 }
 lastAudit=Date.now();
}
function flushReport(){
 if(automatic){automaticFlush();return;}
 if(!reportsWindow||reportsWindow.closed||Date.now()-lastReady>10000)reportsReady=false;
 if(reportsWindow&&!reportsWindow.closed)reportMessage({type:'hello'});
 try{
  const pending=pendingReportKeys();
  try{sendAudit(pending);}catch(_){/* La cola de ventas sigue disponible. */}
  const receipt=JSON.parse(localStorage.getItem('navarro-report-receipt')||'null');
  const first=pending.length?JSON.parse(localStorage.getItem(pending[0])):null;
  const counts=new Map();
  for(const key of pending){const {caja}=JSON.parse(localStorage.getItem(key));counts.set(caja,(counts.get(caja)||0)+1);}
  const byBox=[...counts].map(([box,n])=>box+': '+n).join(' · ');
  const label=record=>' · '+record.id.slice(-8)+' · '+new Date(record.at).toLocaleTimeString('es-MX');
  if(reportLabel)reportLabel.textContent=[first?'Pendiente de enviar'+label(first)+' · '+pending.length+' pendiente(s) · '+byBox:'',receipt?'Guardado en reportes'+label(receipt):''].filter(Boolean).join(' | ')||(reportsReady?'Reportes conectados.':'Abre Panel Navarro para sincronizar.');
  const retry=$('nv-report-retry');
  if(retry)retry.hidden=!first;
  if(!reportsReady||!pending.length) return;
  if(reportDelivery&&Date.now()-reportDelivery.sentAt<18000)return;
  const sale=JSON.parse(localStorage.getItem(pending[0]));
  if(!sale)return;
  reportDelivery={id:sale.id,sentAt:Date.now()};
  reportMessage({type:'sale',sale});
 }catch(_){if(reportLabel)reportLabel.textContent='No se pudo leer la cola de reportes en este navegador.';}
}
window.addEventListener('message',event=>{
 const message=event.data;
 if(event.origin!==REPORTS_ORIGIN||event.source!==reportsWindow||message?.channel!==REPORTS_CHANNEL)return;
 if(message.type==='ready'){
  lastReady=Date.now();
  reportsReady=true;
  return;
 }
 if(message.type==='saved'&&message.id===reportDelivery?.id){
  try{localStorage.setItem('navarro-report-receipt',JSON.stringify({id:message.id,at:new Date().toISOString()}));const saved=JSON.parse(localStorage.getItem(REPORT_PREFIX+message.id));if(saved)rememberSale(saved);localStorage.removeItem(REPORT_PREFIX+message.id);lastAudit=0;}catch(_){}
  reportDelivery=null;
  flushReport();
 }
});
function assignedBox(){return automatic?.caja||window.NAVARRO_CAJA_IDENTIDAD?.codigo?.()||'';}
function reportSeller(){
 const caja=assignedBox();
 return caja && caja!=='SIN_ASIGNAR' ? caja : 'Invitado';
}
const REVIEW_PREFIX='navarro-revision-pendiente:';
let reviewing=false,reviewUrl=null;
async function postReview(raw,id){
  if(!reviewUrl){
   const config=await fetch(new URL('ventas-publicas.json',document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!config.ok)throw Error();
   const {url}=await config.json();
   if(!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(dev|app)$/.test(url))throw Error();
   reviewUrl=url;
  }
   const r=await fetch(reviewUrl+'/ventas/por-confirmar',{method:'POST',headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},body:raw,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw Error();const ack=await r.json();if(!ack.ok||ack.id!==id)throw Error();

}
async function confirmGuestOrder(method){
 if(busy||!$('nv-cobro-domicilio')?.checked)throw Error('Revisa el pedido antes de confirmar.');
 busy=true;
 try{
  const job=buildTicket(),version=saleVersion();
  const labels={cash:'Efectivo al entregar',card:'Llevar terminal para cobrar',transfer:'Transferencia por verificar',credit:'Método por definir'};
  if(!labels[method])throw Error('Selecciona una forma de pago.');
  const record={caja:assignedBox()||'SIN_ASIGNAR',vendedor:reportSeller(),estado:'cobrar',metodo:'credit',reference:labels[method],address:job.address,phone:job.phone,subtotal:job.subtotal,flete:job.flete,rows:job.rows.map(({id,name,qty,unit,total})=>({id,name,qty,unit,total}))};
  if(pair)record.pagoMostrador=method;
  const key='navarro-pedido-invitado-pendiente',signature=JSON.stringify([record,job.address,job.phone]);
  let pending=JSON.parse(localStorage.getItem(key)||'null');
  if(pending?.signature!==signature){
   record.id=job.jobId;record.at=job.at;
   pending={signature,record};localStorage.setItem(key,JSON.stringify(pending));
  }
  const raw=JSON.stringify(pending.record);
  let response;
  try{
   response=await fetch('https://navarro-recepcion-pedidos.ferrematerialesnavar.chatgpt.site/pedidos',{
    method:'POST',headers:{'Content-Type':'application/json'},body:raw,
    credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)
   });
   if(!response.ok)throw Error();
   const receipt=await response.json();
   if(!receipt.ok||receipt.id!==pending.record.id)throw Error();
  }catch{
   throw Error(response?.status===409?'El folio ya existe con datos distintos. Conservamos tu carrito para revisarlo.':'No recibimos confirmación del panel. Conservamos tu carrito y su folio para reintentar.');
  }
  job.jobId=pending.record.id;
  job.at=pending.record.at;
  job.state=pair&&method!=='credit'?'pagado':'cobrar';
  job.reference=job.state==='pagado'?'Pagado en mostrador. Entregar sin cobrar.':labels[method];
  if(!window.NAVARRO_HISTORIAL?.record(job,method))throw Error('Pedido recibido. Conservamos el carrito para guardar su ticket en este dispositivo.');
  resetPrintedSale(job,version,false);
  if(!Object.keys(read('navarro_cart_v1')).length)localStorage.removeItem(key);
  return {folio:job.jobId};
 }finally{busy=false}
}
window.NAVARRO_CONFIRMAR_PEDIDO=confirmGuestOrder;
async function sendReviews(){
 if(reviewing)return;
 reviewing=true;
 try{
  const keys=Object.keys(localStorage).filter(k=>k.startsWith(REVIEW_PREFIX));
  if(!keys.length)return;
  for(const key of keys.slice(0,10)){
   const raw=localStorage.getItem(key);if(!raw)continue;
   const sale=JSON.parse(raw);
   await postReview(raw,sale.id);
   localStorage.removeItem(key);
   if(reportLabel&&!automatic)reportLabel.textContent='Ticket recibido por el panel · Por confirmar · '+sale.id.slice(-8);
  }
 }catch{reviewUrl=null;if(reportLabel&&!automatic)reportLabel.textContent='Ticket guardado en este dispositivo. Pendiente de enviar para revisión.';}
 finally{reviewing=false;}
}
setInterval(sendReviews,15000);
window.addEventListener('online',sendReviews);
queueMicrotask(sendReviews);
function queueReport(job,meta){
 try{
  const record={id:job.jobId,at:new Date().toISOString(),caja:meta.caja,vendedor:meta.vendedor,
   estado:job.state||'none',...(job.state==='cobrar'&&job.reference?{reference:job.reference}:{}),metodo:meta.paymentMethod,subtotal:job.subtotal,flete:job.flete,
   rows:job.rows.map(({id,name,qty,unit,total})=>({id:String(id),name,qty,unit,total}))};
  if(!automatic&&!reportsReady){
   localStorage.setItem(REVIEW_PREFIX+record.id,JSON.stringify(record));sendReviews();return true;
  }
  localStorage.setItem(REPORT_PREFIX+record.id,JSON.stringify(record));
  try{rememberSale(record);}catch(_){} lastAudit=0;
  flushReport();
  return true;
 }catch(_){return false;}
}
function finishWithoutPrint(){
 if(busy)return;
 busy=true;
 try{
  const job=buildTicket(), version=saleVersion();
  if(job.state==='none')throw Error('Elige PAGADO o POR COBRAR antes de finalizar.');
  const guard='navarro-finalizada-sin-impresion';
  if(localStorage.getItem(guard)===version)throw Error('Esta venta ya se finalizó. Vacía el carrito antes de iniciar otra.');
  if(!window.confirm('¿Finalizar esta venta por '+new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format((job.subtotal+job.flete)/100)+' sin imprimir?'))return;
  const method=window.NAVARRO_CAJA_EXPRES_V3?.metodoConfirmado?.(job)||'unknown';
  const meta={caja:automatic?.caja||window.NAVARRO_CAJA_IDENTIDAD?.codigo?.()||'SIN_ASIGNAR',vendedor:reportSeller(),paymentMethod:method};
  localStorage.setItem(guard,version);
  if(!queueReport(job,meta)){localStorage.removeItem(guard);throw Error('No se pudo guardar la venta en este navegador.');}
  try{window.NAVARRO_HISTORIAL?.record?.(job,method);}catch(_){}
  resetPrintedSale(job,version,false);
  if(!Object.keys(read('navarro_cart_v1')).length)localStorage.removeItem(guard);
 }catch(err){status(err.message,true);}finally{busy=false;}
}
function setupReports(button){
 const controls=document.createElement('div');
 controls.style.cssText='margin:0 0 12px;font:13px system-ui;color:#195233';
 controls.innerHTML='<button type="button" hidden>Conectar reportes</button> <button type="button" id="nv-report-retry" hidden>Reintentar envío</button> <button type="button" id="nv-no-print">Finalizar venta sin imprimir</button><div role="status"></div>';
 const refLabel=document.createElement('label');
 refLabel.textContent='Nombre o referencia de cobranza (opcional) ';
 const ref=document.createElement('input');
 ref.id='nv-credit-ref';ref.maxLength=100;ref.autocomplete='off';
 const collections=document.createElement('a');
 collections.href=REPORTS_ORIGIN+'/?vista=cobranza';
 collections.target='_blank';collections.rel='noopener';
 collections.textContent='Consultar pendientes y abonar';
 controls.appendChild(collections);
 refLabel.appendChild(ref);
 controls.appendChild(refLabel);
 const syncRef=()=>{refLabel.hidden=$('nv-ticket-status')?.value!=='cobrar';};
 document.addEventListener('change',syncRef);
 document.addEventListener('input',syncRef);
 syncRef();
 if(automatic){controls.querySelector('button').hidden=true;collections.hidden=true;}
 reportLabel=controls.querySelector('[role="status"]');
 controls.querySelector('button').addEventListener('click',()=>{
  reportsWindow=window.open(REPORTS_ORIGIN+'/','navarro-reportes');
  if(!reportsWindow){reportLabel.textContent='Permite abrir Panel Navarro en otra pestaña para sincronizar.';return;}
  reportsReady=false;
  lastReady=0;
  reportDelivery=null;
  clearInterval(reportsTimer);
  reportsTimer=setInterval(flushReport,4000);
  flushReport();
 });
 controls.querySelector('#nv-no-print').addEventListener('click',finishWithoutPrint);
 controls.querySelector('#nv-report-retry').addEventListener('click',()=>{
  if(!reportsWindow||reportsWindow.closed||!reportsReady){controls.querySelector('button').click();return;}
  reportDelivery=null;flushReport();
 });
 button.parentElement.insertBefore(controls,button.nextSibling);
 flushReport();
}

async function autoPrint(event){
 if(automatic&&!pair){event.preventDefault();event.stopImmediatePropagation();status('Vincula la impresora para imprimir o elige Finalizar venta sin imprimir.',true);return;}
 if(!pair)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(busy)return;
 const button=$('nv-print-ticket-button');
 let job;
 try{job=buildTicket()}catch(err){status(err.message||'Carrito no válido',true);return}
 const version=saleVersion();
 // La forma de pago se toma ANTES del envío; NO se añade al trabajo
 // de Windows para conservar el protocolo de la POS-58-Series.
 let confirmedMethod=null;
 try{confirmedMethod=window.NAVARRO_CAJA_EXPRES_V3?.metodoConfirmado?.(job)||null}catch(_){}
 // Metadatos opcionales para el resumen local de cajas V12. No alteran el ticket ni SIFO.
 const reportVendor=reportSeller();
 const saleMeta={caja:automatic?.caja||window.NAVARRO_CAJA_IDENTIDAD?.codigo?.()||'SIN_ASIGNAR',paymentMethod:confirmedMethod||'unknown'};
 busy=true;button.disabled=true;const label=button.textContent;button.textContent='⏳ Enviando a impresora…';
 const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),20000);
 try{
  const response=await fetch(pair.url.replace(/\/$/,'')+'/print',{
   method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+pair.token,'ngrok-skip-browser-warning':'true'},
   body:JSON.stringify({...job,saleMeta}),signal:ctrl.signal
  });
  let result={};try{result=await response.json()}catch(_){}
  if(!response.ok||!result.ok)throw Error(result.error||'No se pudo enviar el ticket a Windows');
  const queued=queueReport(job,{...saleMeta,vendedor:reportVendor});
  const history=window.NAVARRO_HISTORIAL;
  let saved=true;
  if(history&&typeof history.record==='function'){
   try{saved=history.record(job,confirmedMethod)===true}catch(_){saved=false}
  }
  if(!saved){
   // No perder el detalle de una venta que ya se aceptó pero no pudo guardarse.
   status('Ticket recibido por Windows, pero no se pudo guardar el historial. Conservamos el carrito para que revises la venta.',true);
   return;
  }
  resetPrintedSale(job,version);
  if(!queued)status('Ticket recibido, pero no se pudo guardar el envío al panel. Revisa el almacenamiento del navegador.',true);
  else if(result.recorded===false)status('⚠ Ticket aceptado por Windows, pero NO se guardó en el panel de cajas. Revisa el registro en la computadora.',true);
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
 setupReports(button);
 refreshPairUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();