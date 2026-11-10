/* NAVARRO 360 — Ventas en espera y caja local V1 (10/11/2026).
   Se monta EN EL CARRITO existente. No cambia el catálogo, bot, mensajes WhatsApp ni SIFO.
   Los precios ajustados se convierten en cantidades equivalentes al abrir WhatsApp; SIFO debe validarlas.
*/
(function(){
'use strict';
if(window.NAVARRO_VENTAS_ESPERA_V1)return;
const KEY='navarro360_ventas_en_espera_v1';
const PRICE_KEY='navarro360_precio_caja_activa_v1';
const CLAVO_KEY='navarro_clavos_importe_v1';
const IMPORTE_KEY='navarro_importes_cents_v1';
const MAX_DRAFTS=30;
const STAFF_KEY='navarro360_caja_pin_local_v1';
let unlockedUntil=0,pinBusy=false;
const $=id=>document.getElementById(id);
const format=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const money=n=>format.format(n);
const catalog=new Map((Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[])
 .filter(r=>Array.isArray(r)&&/^\d{5,}$/.test(String(r[0]))&&Number.isFinite(Number(r[2])))
 .map(r=>[String(r[0]),{name:String(r[1]),price:Number(r[2])}]));
const bridge=()=>window.NAVARRO_CARRITO_EN_VIVO_V66;
const readObj=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}};
const readDrafts=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(d)?d.filter(x=>x&&typeof x.id==='string'&&x.cart&&typeof x.cart==='object'&&!Array.isArray(x.cart)).slice(0,MAX_DRAFTS):[]}catch{return []}};
const clone=x=>JSON.parse(JSON.stringify(x));
const qtyValid=(id,q)=>catalog.has(id)&&typeof q==='number'&&Number.isFinite(q)&&q>0&&q<=9999&&Math.abs(q*1000-Math.round(q*1000))<1e-6&&(bridge()?.canFractional?.(id)||Number.isInteger(q));
const cartValid=cart=>cart&&typeof cart==='object'&&!Array.isArray(cart)&&Object.keys(cart).length<=300&&Object.keys(cart).every(id=>qtyValid(id,cart[id]));
const freshCart=()=>{try{const x=bridge()?.snapshot?.();return cartValid(x)?x:null}catch{return null}};
const cents=s=>{const str=String(s).trim().replace(',','.');if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(str))return null;const [a,b='']=str.split('.');const n=Number(a)*100+Number((b+'00').slice(0,2));return Number.isSafeInteger(n)&&n>0&&n<=100000000?n:null};
const safeStore=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}};
const draftMoney=(snap)=>{
 const c=snap.cart||{},cl=snap.clavos||{},imp=snap.importes||{},prices=snap.prices||{};
 let total=0;
 for(const [id,q] of Object.entries(c)){
   const p=catalog.get(id);if(!p)continue;
   const special=Number(cl[id]||imp[id]||0);
   const override=Number(prices[id]||0);
   const price=(special>0?special:override>0?Math.round(override*q):Math.round(p.price*100*q));
   total+=price;
 }
 return total/100;
};
const cleanMap=(map,cart,limit)=>Object.fromEntries(Object.entries(map||{}).filter(([id,n])=>cart[id]&&Number.isSafeInteger(n)&&n>0&&n<=limit));
let prices=cleanMap(readObj(PRICE_KEY),readObj('navarro_cart_v1'),100000000);
let panel,lines,quote,amountInput,receivedInput,status,waitingList,waitingCount,waitingVisible=false,refreshTimer=0,waitingPopup,noticeTimeout;
function statusMsg(msg){
 if(!status)return;
 clearTimeout(noticeTimeout);
 status.textContent=msg;status.hidden=!msg;
 if(msg)noticeTimeout=setTimeout(()=>{status.hidden=true;status.textContent=''},3200);
}
function compute(cart){
 const cl=readObj(CLAVO_KEY),imp=readObj(IMPORTE_KEY);
 let base=0,applied=0,custom=0;
 for(const [id,q] of Object.entries(cart)){
  const prod=catalog.get(id);if(!prod)continue;
  const special=Number(cl[id]||imp[id]||0);
  const official=special>0?special:Math.round(prod.price*q*100);
  base+=official;
  const local=Number(prices[id]||0);
  const display=special>0?official:(local>0?Math.round(local*q):official);
  if(local>0&&special<=0&&display!==official)custom++;
  applied+=display;
 }
 return {base:base/100,applied:applied/100,custom};
}
function readCash(){const s=String(receivedInput?.value||'').trim();if(!s)return null;const n=cents(s);return n===null?null:n/100}
function renderQuote(){
 if(!quote)return;
 const cart=freshCart();if(!cart)return;
 const data=compute(cart),cash=readCash();
 quote.textContent=money(data.applied);
 const original=$('nv-caja-catalogo');if(original)original.textContent=money(data.base);
 const notice=$('nv-caja-notice');
 if(notice)notice.hidden=data.custom===0;
 const change=$('nv-caja-change');
 if(change)change.textContent=cash===null?'Introduce efectivo recibido':cash>=data.applied?'Cambio: '+money(cash-data.applied):'Faltan: '+money(data.applied-cash);
}

/* PIN sólo en el navegador usado por el vendedor; no sustituye autenticación remota. */
function hex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')}
function fromHex(s){if(!/^[0-9a-f]+$/i.test(s)||s.length%2)return null;return new Uint8Array(s.match(/../g).map(x=>parseInt(x,16)))}
async function pinDigest(pin,salt){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:125000,hash:'SHA-256'},key,256);
 return hex(new Uint8Array(bits));
}
function readStaff(){
 try{const p=JSON.parse(localStorage.getItem(STAFF_KEY)||'null');return p&&p.salt&&p.hash?p:null}catch{return null}
}
async function setupStaffPin(){
 if(readStaff())return true;
 if(!window.crypto?.subtle||!window.crypto?.getRandomValues){
  window.alert('Este dispositivo no permite proteger precios. Necesitas HTTPS y un navegador actualizado.');return false;
 }
 const first=window.prompt('Activar caja para vendedores en este dispositivo. Crea un PIN de 6 dígitos. No utilices tu NIP bancario:');
 if(first===null)return false;
 if(!/^\d{6}$/.test(first)){window.alert('El PIN debe tener exactamente 6 dígitos.');return false}
 const again=window.prompt('Repite tu PIN de vendedor:');
 if(again===null||again!==first){window.alert('Los PIN no coinciden. No se activó la edición.');return false}
 try{
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const record={salt:hex(salt),hash:await pinDigest(first,salt),version:1};
  if(!safeStore(STAFF_KEY,record)){window.alert('No se pudo registrar este dispositivo.');return false}
  unlockedUntil=Date.now()+60000;return true;
 }catch{window.alert('No se pudo configurar la clave de vendedor.');return false}
}
async function staffAllowed(){
 const current=readStaff();
 if(!current)return false; // Teléfono público: precio fijo, sin edición.
 if(Date.now()<unlockedUntil)return true;
 if(!window.crypto?.subtle)return false;
 const pin=window.prompt('PIN de vendedor para cambiar el precio:');
 if(pin===null)return false;
 if(!/^\d{6}$/.test(pin)){window.alert('PIN incorrecto.');return false}
 try{
  if((await pinDigest(pin,fromHex(current.salt)))!==current.hash){
   window.alert('PIN incorrecto. El precio no cambió.');return false;
  }
  unlockedUntil=Date.now()+60000;return true;
 }catch{window.alert('No se pudo verificar el PIN.');return false}
}
async function askPrice(id){
 if(pinBusy)return;
 const p=catalog.get(id),cart=freshCart();
 if(!p||!cart?.[id])return;
 // Los productos por importe mantienen su método de captura fraccionaria existente.
 if(Number(readObj(CLAVO_KEY)[id]||readObj(IMPORTE_KEY)[id]||0)>0){
  window.alert('Para este producto utiliza el botón Importe que ya tiene el carrito.');return;
 }
 pinBusy=true;
 try{
  if(!(await staffAllowed()))return;
  const before=Number(prices[id]||Math.round(p.price*100));
  const typed=window.prompt('Precio para '+p.name+' ($). Solo se aplica a esta venta:',(before/100).toFixed(2));
  if(typed===null)return;
  const n=cents(typed);
  if(n===null){window.alert('Precio inválido. Máximo dos decimales.');return}
  const next={...prices};if(n===Math.round(p.price*100))delete next[id];else next[id]=n;
  if(!safeStore(PRICE_KEY,next)){window.alert('No se pudo guardar este precio.');return}
  prices=next;refresh();
 }finally{pinBusy=false}
}
function addPriceEditors(){
 const cart=freshCart();if(!cart)return;
 const cl=readObj(CLAVO_KEY),imp=readObj(IMPORTE_KEY);
 const activeCodes=new Set(Object.keys(cart));
 if(Object.keys(prices).some(id=>!activeCodes.has(id))){
  prices=Object.fromEntries(Object.entries(prices).filter(([id])=>activeCodes.has(id)));safeStore(PRICE_KEY,prices);
 }
 for(const line of lines.querySelectorAll('.cart-line')){
  const id=line.querySelector('[data-dec]')?.dataset.dec;
  if(!id||!cart[id]||!catalog.has(id))continue;
  // El precio se muestra donde ya estaba el precio base, sin editor agregado.
  const oldField=line.querySelector('.nv-caja-line');
  if(oldField)oldField.remove();
  const p=catalog.get(id),special=Number(cl[id]||imp[id]||0);
  const small=line.querySelector(':scope > small');
  if(!small)continue;
  let button=small.querySelector('.nv-caja-price');
  if(!button){
   const rawText=small.textContent||'';
   const prefix=rawText.includes(' · Precio base')?rawText.split(' · Precio base')[0]:id;
   small.textContent=prefix+' · Precio ';
   button=document.createElement('button');button.type='button';
   button.className='nv-caja-price';button.dataset.nvPrice=id;
   button.setAttribute('aria-label','Precio de '+p.name);
   small.appendChild(button);
  }
  const centsPrice=Number(prices[id]||Math.round(p.price*100));
  const shown=special>0?p.price:centsPrice/100;
  const txt=money(shown);
  if(button.textContent!==txt)button.textContent=txt;
  button.disabled=special>0||!readStaff();
  const sum=line.querySelector('.line-total');
  const lineTotal=special>0?money(special/100):money(centsPrice*cart[id]/100);
  if(sum&&sum.textContent!==lineTotal)sum.textContent=lineTotal;
 }
 const total=$('cart-total'),localTotal=compute(cart);
 const label=total?.parentElement?.querySelector('span');
 // El precio enviado a SIFO sigue siendo del catálogo. El total visual es únicamente referencia de esta venta.
 if(localTotal.custom>0){
  if(label&&label.textContent!=='Total de caja (referencia)')label.textContent='Total de caja (referencia)';
  if(total&&total.textContent!==money(localTotal.applied))total.textContent=money(localTotal.applied);
 }else{
  if(label&&label.textContent!=='Subtotal estimado')label.textContent='Subtotal estimado';
  if(total&&total.textContent!==money(localTotal.base))total.textContent=money(localTotal.base);
 }
 let notice=$('nv-caja-precio-alerta');
 if(!notice){
  const foot=$('drawer')?.querySelector('.drawer-bottom');
  if(foot){
    notice=document.createElement('p');notice.id='nv-caja-precio-alerta';
    notice.style.cssText='font-size:11px;color:#986218;line-height:1.4;margin:4px 0 8px';
    notice.textContent='Precio editado: se enviará como cantidad fraccionaria del producto; verifica el importe que confirme SIFO.';
    foot.insertBefore(notice,foot.querySelector('.cart-note'));
  }
 }
 if(notice)notice.hidden=localTotal.custom===0;
}
function renderWaiting(){
 if(!waitingList)return;
 const drafts=readDrafts();
 waitingCount.textContent=String(drafts.length);
 waitingList.hidden=!waitingVisible;
 if(waitingPopup)waitingPopup.hidden=!waitingVisible;
 waitingList.replaceChildren();
 if(!waitingVisible)return;
 if(!drafts.length){const p=document.createElement('p');p.textContent='No hay ventas en espera.';waitingList.appendChild(p);return;}
 for(const d of drafts){
  const row=document.createElement('div');row.className='nv-caja-saved-row';
  const info=document.createElement('div');
  const date=new Date(d.at);const time=Number.isNaN(date.getTime())?'':date.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  const count=Object.keys(d.cart).length;
  const name=document.createElement('strong');name.textContent='Venta de '+time;
  const details=document.createElement('small');details.textContent=count+' productos · '+money(draftMoney(d));
  info.append(name,details);
  const controls=document.createElement('div');controls.className='nv-caja-row-buttons';
  const recover=document.createElement('button');recover.type='button';recover.textContent='Recuperar';recover.dataset.nvLoad=d.id;
  const del=document.createElement('button');del.type='button';del.className='nv-caja-danger';del.textContent='Eliminar';del.dataset.nvDelete=d.id;
  controls.append(recover,del);row.append(info,controls);waitingList.appendChild(row);
 }
}
function refresh(){
 refreshTimer=0;
 if(!panel)return;
 addPriceEditors();renderWaiting();
}
function schedule(){if(refreshTimer)return;refreshTimer=setTimeout(refresh,40);}
function capture(){
 const cart=freshCart();
 if(!cart||!Object.keys(cart).length)return null;
 const cl=cleanMap(readObj(CLAVO_KEY),cart,99999999);
 const imp=cleanMap(readObj(IMPORTE_KEY),cart,99999999);
 return {cart:clone(cart),clavos:cl,importes:imp,prices:cleanMap(prices,cart,100000000)};
}
function saveWaiting(){
 const snap=capture();if(!snap){window.alert('El carrito está vacío o tiene una cantidad inválida.');return}
 const before=readDrafts();
 if(before.length>=MAX_DRAFTS){window.alert('Ya hay 30 ventas en espera. Recupera o elimina una primero.');return}
 const id='NV-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const next=[{id,at:Date.now(),...snap},...before];
 if(!safeStore(KEY,next)){window.alert('No se pudo guardar: el carrito quedó intacto.');return}
 const result=bridge()?.replace?.({});
 if(!result?.ok){
  safeStore(KEY,before);
  window.alert('No se pudo liberar el carrito. No se modificó la venta.');
  return;
 }
 prices={};safeStore(PRICE_KEY,prices);
 if(receivedInput)receivedInput.value='';
 statusMsg('✓ Venta guardada. Carrito libre para atender otro cliente.');
 waitingVisible=false;schedule();
}
function restore(id){
 const all=readDrafts(),d=all.find(x=>x.id===id);
 if(!d)return;
 const live=freshCart();
 if(!live){window.alert('El carrito no está listo para recuperar.');return}
 if(Object.keys(live).length){window.alert('Primero guarda o vacía la venta actual para recuperar otra.');return}
 if(!cartValid(d.cart)){window.alert('Esta venta contiene productos o cantidades no compatibles con el catálogo actual. Se conservó en espera.');return}
 if(!bridge()?.replace){window.alert('No está disponible la actualización del carrito.');return}
 const prevCl=localStorage.getItem(CLAVO_KEY),prevImp=localStorage.getItem(IMPORTE_KEY),prevPrice=localStorage.getItem(PRICE_KEY);
 const result=bridge().replace(clone(d.cart));
 if(!result?.ok){window.alert(result?.reason||'No se pudo recuperar la venta.');return}
 const special=Object.keys(d.clavos||{}).length||Object.keys(d.importes||{}).length;
 const p=cleanMap(d.prices||{},d.cart,100000000);
 try{
  localStorage.setItem(CLAVO_KEY,JSON.stringify(cleanMap(d.clavos||{},d.cart,99999999)));
  localStorage.setItem(IMPORTE_KEY,JSON.stringify(cleanMap(d.importes||{},d.cart,99999999)));
  localStorage.setItem(PRICE_KEY,JSON.stringify(p));
 }catch{
  try{if(prevCl!==null)localStorage.setItem(CLAVO_KEY,prevCl);if(prevImp!==null)localStorage.setItem(IMPORTE_KEY,prevImp);if(prevPrice!==null)localStorage.setItem(PRICE_KEY,prevPrice)}catch{}
  bridge().replace({});
  window.alert('No se pudieron recuperar todos los importes. La venta se mantiene guardada.');
  return;
 }
 prices=p;
 if(!safeStore(KEY,all.filter(x=>x.id!==id))){
  window.alert('La venta se recuperó, pero no se pudo quitar de la lista. Evita recuperarla dos veces.');
  return;
 }
 waitingVisible=false;
 if(receivedInput)receivedInput.value='';
 statusMsg('✓ Venta recuperada. Continúa agregando artículos.');
 if(special){
  try{sessionStorage.setItem('navarro360_espera_reabrir_v1','1')}catch{}
  window.location.reload();
 }else schedule();
}
function makeButton(text,className){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=className||'';return b}
function init(){
 lines=$('cart-items');const drawer=$('drawer');const bottom=drawer?.querySelector('.drawer-bottom');
 if(!lines||!bottom||!bridge()?.replace)return;
 window.NAVARRO_VENTAS_ESPERA_V1=true;
 const css=document.createElement('style');css.id='navarro360-ventas-espera-style-v2';
 css.textContent=
  '#drawer .drawer-bottom{max-height:52vh;max-height:52dvh;min-height:0;overflow-y:auto;overscroll-behavior:contain;flex-shrink:1}'+
  '#drawer .cart-items{min-height:80px}'+
  '#nv-caja-bar{box-sizing:border-box;display:flex;gap:8px;flex:none;padding:9px 14px calc(10px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid #dbe5dc;box-shadow:0 -4px 14px #172a1912;z-index:6}'+
  '#nv-caja-bar button{min-width:0;flex:1;border:0;border-radius:12px;padding:9px 7px;min-height:48px;color:#fff;background:#205a38;font:750 13px/1.2 system-ui;cursor:pointer;white-space:normal;overflow-wrap:break-word}'+
  '#nv-caja-bar button.nv-caja-secondary{color:#1d4530;background:#e6f0e8}'+
  '#nv-caja-bar button:focus-visible,#nv-caja-popup button:focus-visible{outline:3px solid #4c8b6c;outline-offset:2px}'+
  '#nv-caja-popup{box-sizing:border-box;position:absolute;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));max-height:min(360px,54vh);max-height:min(360px,54dvh);overflow:auto;overscroll-behavior:contain;border:1px solid #c2d9c8;border-radius:15px;background:#fff;box-shadow:0 12px 50px #0c241f33;z-index:7;padding:12px;color:#193323;font:13px/1.4 system-ui}'+
  '#nv-caja-popup[hidden],#nv-caja-notification[hidden],#nv-caja-saved-list[hidden]{display:none!important}'+
  '#nv-caja-popup-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}'+
  '#nv-caja-popup-head strong{font-size:15px}'+
  '#nv-caja-popup button{border:0;border-radius:9px;min-height:38px;padding:8px 11px;background:#e7efe9;color:#1f4c30;font-weight:750;font-size:12px;cursor:pointer}'+
  '#nv-caja-popup button.nv-caja-danger{background:#fce7e7;color:#9a2929}'+
  '#nv-caja-popup .nv-caja-saved-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 0;border-top:1px solid #e4ebe5}'+
  '#nv-caja-popup .nv-caja-saved-row small{display:block;color:#65776b;margin-top:4px}'+
  '#nv-caja-popup .nv-caja-row-buttons{display:flex;gap:5px;flex-shrink:0}'+
  '#nv-caja-notification{position:absolute;left:14px;right:14px;bottom:calc(82px + env(safe-area-inset-bottom,0px));padding:12px 14px;border-radius:11px;background:#e5f6e9;border:1px solid #a2cfaf;color:#1d6234;font:750 12px/1.4 system-ui;z-index:8;box-shadow:0 4px 14px #1235212e}'+
  '.nv-caja-price{appearance:none!important;border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;margin:0!important;display:inline!important;min-height:0!important;color:inherit!important;font:inherit!important;font-size:inherit!important;line-height:inherit!important;vertical-align:baseline!important;cursor:pointer!important;text-decoration:none!important}'+
  '.nv-caja-price:disabled{opacity:1!important;cursor:default!important}'+
  '.nv-caja-price:focus-visible{outline:2px solid #2b7950!important;outline-offset:2px!important}'+
  '@media(max-width:400px){#nv-caja-popup .nv-caja-saved-row{align-items:flex-start;flex-direction:column}#nv-caja-popup .nv-caja-row-buttons{align-self:stretch}#nv-caja-popup .nv-caja-row-buttons button{flex:1}}';
 document.head.appendChild(css);
 panel=document.createElement('div');panel.id='nv-caja-bar';panel.setAttribute('aria-label','Guardar y recuperar ventas');
 const save=makeButton('💾 Guardar venta','nv-caja-primary');
 const show=makeButton('📂 Ventas guardadas (0)','nv-caja-secondary');
 panel.append(save,show);
 // Barra fija al pie del carrito: NO se superpone al subtotal ni a WhatsApp.
 drawer.appendChild(panel);
 waitingPopup=document.createElement('div');waitingPopup.id='nv-caja-popup';waitingPopup.hidden=true;
 waitingPopup.setAttribute('aria-label','Ventas guardadas en este dispositivo');
 const header=document.createElement('div');header.id='nv-caja-popup-head';
 const heading=document.createElement('strong');heading.textContent='Ventas en espera';
 const close=makeButton('✕ Cerrar','nv-caja-secondary');
 header.append(heading,close);
 const savedList=document.createElement('div');savedList.id='nv-caja-saved-list';savedList.hidden=true;waitingList=savedList;
 const foot=document.createElement('p');foot.textContent='Guardadas en este navegador; no se envían a SIFO.';
 foot.style.cssText='font-size:11px;color:#687c6a;margin:9px 0 2px';
 waitingPopup.append(header,savedList,foot);
 drawer.appendChild(waitingPopup);
 status=document.createElement('div');status.id='nv-caja-notification';status.hidden=true;
 status.setAttribute('role','status');drawer.appendChild(status);
 close.addEventListener('click',()=>{waitingVisible=false;renderWaiting();show.focus()});
 waitingCount={set textContent(n){show.textContent='📂 Ventas guardadas ('+n+')'}};
 save.addEventListener('click',saveWaiting);
 show.addEventListener('click',()=>{waitingVisible=!waitingVisible;renderWaiting();if(waitingVisible)waitingPopup.scrollTop=0});
 waitingList.addEventListener('click',e=>{
  const load=e.target.closest('[data-nv-load]'),del=e.target.closest('[data-nv-delete]');
  if(load)restore(load.dataset.nvLoad);
  if(del){
   if(!window.confirm('¿Eliminar esta venta en espera?'))return;
   const old=readDrafts();
   if(safeStore(KEY,old.filter(x=>x.id!==del.dataset.nvDelete)))renderWaiting();
   else window.alert('No se pudo eliminar la venta.');
  }
 });
 lines.addEventListener('click',e=>{
  const target=e.target.closest('button[data-nv-price]');
  if(!target)return;
  e.preventDefault();e.stopPropagation();
  askPrice(target.dataset.nvPrice);
 });
 document.addEventListener('click',e=>{
   if(e.target.closest('#cart-close,#overlay'))unlockedUntil=0;
 },true);
 new MutationObserver(schedule).observe(lines,{childList:true,subtree:true});
 document.addEventListener('click',e=>{
  if(e.target.closest('#clear-cart,#send-whatsapp,#mobile-whatsapp')){
    setTimeout(()=>{if(Object.keys(freshCart()||{}).length===0){prices={};safeStore(PRICE_KEY,prices);schedule()}},550);
  }
 },true);
 window.addEventListener('storage',e=>{if(e.key===KEY)renderWaiting();if(e.key===PRICE_KEY){prices=readObj(PRICE_KEY);schedule()}});
 try{if(sessionStorage.getItem('navarro360_espera_reabrir_v1')==='1'){sessionStorage.removeItem('navarro360_espera_reabrir_v1');setTimeout(()=>$('cart-top')?.click(),150)}}catch{}
 refresh();
 // La activación de vendedor se abre sólo desde el enlace de configuración
 // de este mismo sitio. No se muestra un control de configuración en el carrito.
 if(!readStaff() && /(?:^|[?&])activar_caja=1(?:&|$)/.test(window.location?.search||'')){
   setupStaffPin().then(ok=>{
     if(ok){
       refresh();
       try{window.history?.replaceState(null,'',window.location.pathname+window.location.hash)}catch{}
       statusMsg('Acceso de vendedor preparado en este dispositivo.');
     }
   });
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();