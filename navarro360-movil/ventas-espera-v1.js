/* NAVARRO 360 — Ventas en espera y caja local V1 (10/11/2026).
   Se monta EN EL CARRITO existente. No cambia el catálogo, bot, mensajes WhatsApp ni SIFO.
   Los precios ajustados son sólo cálculos locales y NO se envían a SIFO.
*/
(function(){
'use strict';
if(window.NAVARRO_VENTAS_ESPERA_V1)return;
const KEY='navarro360_ventas_en_espera_v1';
const PRICE_KEY='navarro360_precio_caja_activa_v1';
const CLAVO_KEY='navarro_clavos_importe_v1';
const IMPORTE_KEY='navarro_importes_cents_v1';
const MAX_DRAFTS=30;
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
function addPriceEditors(){
 const cart=freshCart();if(!cart)return;
 const cl=readObj(CLAVO_KEY),imp=readObj(IMPORTE_KEY);
 const activeCodes=new Set(Object.keys(cart));
 if(Object.keys(prices).some(id=>!activeCodes.has(id))){
  prices=Object.fromEntries(Object.entries(prices).filter(([id])=>activeCodes.has(id)));safeStore(PRICE_KEY,prices);
 }
 for(const line of lines.querySelectorAll('.cart-line')){
  if(line.querySelector('.nv-caja-line'))continue;
  const id=line.querySelector('[data-dec]')?.dataset.dec;
  if(!id||!cart[id]||!catalog.has(id))continue;
  const p=catalog.get(id),special=Number(cl[id]||imp[id]||0);
  const field=document.createElement('div');field.className='nv-caja-line';
  if(special>0){
    const badge=document.createElement('small');
    badge.textContent='Venta por importe: '+money(special/100)+' · Para cambiarlo usa «✎ Importe»';
    field.appendChild(badge);
  }else{
    const label=document.createElement('label');label.textContent='Precio aplicado $ (esta venta)';
    const input=document.createElement('input');
    input.type='text';input.inputMode='decimal';input.setAttribute('aria-label','Precio aplicado de '+p.name);
    input.dataset.nvPrice=id;input.value=((prices[id]||Math.round(p.price*100))/100).toFixed(2);
    label.appendChild(input);field.appendChild(label);
    const total=document.createElement('span');total.className='nv-caja-line-total';
    total.textContent='Importe: '+money(((prices[id]||Math.round(p.price*100))*cart[id])/100);
    field.appendChild(total);
  }
  line.appendChild(field);
 }
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
  '.nv-caja-line{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:10px 0 1px;background:#f2f8f4;border-radius:9px;padding:8px;color:#244534;font-size:12px}'+
  '.nv-caja-line label{flex:1;min-width:160px;font-weight:700}'+
  '.nv-caja-line input{display:block;width:100%;min-height:37px;border:1px solid #a5c3b0;border-radius:8px;font-size:16px;padding:6px 8px;box-sizing:border-box;background:white;color:#122a1b}'+
  '.nv-caja-line-total{font-weight:800;color:#22633e}.nv-caja-line small{color:#6d5d39}'+
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
 lines.addEventListener('change',e=>{
  const input=e.target.closest('[data-nv-price]');if(!input)return;
  const id=input.dataset.nvPrice,cart=freshCart(),p=catalog.get(id);
  if(!cart?.[id]||!p)return;
  const n=cents(input.value);
  if(n===null){window.alert('Precio inválido. Escribe pesos con máximo dos decimales.');input.value=((prices[id]||Math.round(p.price*100))/100).toFixed(2);return}
  const next={...prices,[id]:n};
  if(!safeStore(PRICE_KEY,next)){window.alert('No se pudo conservar el precio aplicado.');return}
  prices=next;
  const total=input.closest('.nv-caja-line')?.querySelector('.nv-caja-line-total');
  if(total)total.textContent='Importe: '+money(n*cart[id]/100);
  // El importe calculado del producto se actualiza en su propio renglón.
 });
 new MutationObserver(schedule).observe(lines,{childList:true,subtree:true});
 document.addEventListener('click',e=>{
  if(e.target.closest('#clear-cart,#send-whatsapp,#mobile-whatsapp')){
    setTimeout(()=>{if(Object.keys(freshCart()||{}).length===0){prices={};safeStore(PRICE_KEY,prices);schedule()}},550);
  }
 },true);
 window.addEventListener('storage',e=>{if(e.key===KEY)renderWaiting();if(e.key===PRICE_KEY){prices=readObj(PRICE_KEY);schedule()}});
 try{if(sessionStorage.getItem('navarro360_espera_reabrir_v1')==='1'){sessionStorage.removeItem('navarro360_espera_reabrir_v1');setTimeout(()=>$('cart-top')?.click(),150)}}catch{}
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();