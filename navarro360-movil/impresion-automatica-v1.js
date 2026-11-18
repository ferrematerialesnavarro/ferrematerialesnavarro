/* NAVARRO 360 — impresión automática NGROK gratuito autorizado V3
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
function receivePair(){
 const hash=location.hash||'';
 if(!hash.startsWith('#navprint='))return;
 try{
  const t=hash.slice(10);
  if(!/^[A-Za-z0-9_-]{40,2000}$/.test(t))throw Error('Código de vinculación inválido');
  const bin=atob(t.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(t.length/4)*4,'='));
  const raw=Uint8Array.from(bin,c=>c.charCodeAt(0));
  const p=JSON.parse(new TextDecoder().decode(raw));
  if(!validPair(p))throw Error('Datos inválidos');
  localStorage.setItem(STORAGE,JSON.stringify(p));pair=p;
  history.replaceState(null,'',location.pathname+location.search);
  setTimeout(()=>status('✓ Impresora vinculada. Ya puedes imprimir con un toque.',false),200);
 }catch(err){status('No se pudo vincular la impresora: '+(err.message||'vuelve a abrir el enlace'),true)}
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
 const address=String($('nv70-address')?.value||'').trim().slice(0,260);
 const hasFreight=rows.some(r=>r.id==='7777000010');
 const flete=(!hasFreight&&$('nv-ticket-flete')?.checked)?5000:0;
 return {v:1,jobId:crypto.randomUUID(),at:new Date().toISOString(),
   rows,subtotal,flete,state:payment,client:String($('nv-ticket-client')?.value||'').trim().slice(0,100),address};
}
async function autoPrint(event){
 if(!pair||busy)return;
 event.preventDefault();event.stopImmediatePropagation();
 const button=$('nv-print-ticket-button');
 let job;
 try{job=buildTicket()}catch(err){status(err.message||'Carrito no válido',true);return}
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
  status('✓ Ticket enviado a la cola POS-58-Series',false);
 }catch(err){
  status('No se pudo imprimir: '+(err.name==='AbortError'?'conexión agotada':err.message||'revisa el puente en Windows')+'. El carrito se conservó.',true);
 }finally{clearTimeout(timeout);busy=false;button.disabled=false;button.textContent=label}
}
function init(){
 receivePair();
 const button=$('nv-print-ticket-button');
 if(!button)return;
 if(pair){
  button.textContent='🖨 Imprimir';
  button.setAttribute('aria-label','Imprimir inmediatamente en POS-58-Series sin abrir menús');
  button.addEventListener('click',autoPrint,true);
  button.style.background='#146f3e';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();