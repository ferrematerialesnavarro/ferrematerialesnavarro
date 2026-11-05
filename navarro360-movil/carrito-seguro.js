/* NAVARRO 360 · CARRITO SEGURO V2 · 03/11/2026
 * Complemento aislado: conserva la lógica del carrito original y el formato
 *  CANTIDAD CÓDIGO para WhatsApp, sin tocar bot, SIFO ni catálogo.
 * - X elimina el producto entero.
 * - ✎ edita la cantidad total desde el carrito.
 * - Doble toque rápido en la misma tarjeta o + permite escribir cantidad.
 * - Al pulsar WhatsApp, vacía el carrito después de abrir el enlace,
 *   con una copia recuperable si no se terminó de enviar el mensaje.
 * La web NO puede verificar si el cliente realmente pulsó Enviar en WhatsApp.
 */
(function(){'use strict';
if(window.NAVARRO_CARRITO_SEGURO_INSTALADO)return;
window.NAVARRO_CARRITO_SEGURO_INSTALADO=true;
const CART_KEY='navarro_cart_v1';
const RESTORE_KEY='navarro_cart_reabrir_v1';
const UNDO_KEY='navarro_whatsapp_recuperar_v2';
const LEGACY_PENDING_KEY='navarro_whatsapp_pendiente_v1';
const MAX=9999;
const DOUBLE_MS=420;
const MAX_NATIVE_DECREMENTS=24;
const UNDO_EXPIRY=12*60*60*1000;
const el=id=>document.getElementById(id);
let initialized=false,editDialog=null,editId='',undoToast=null,undoSnapshot=null;
let lastTap={code:'',at:0},lastClickWasDouble=false,pendingSend=null,sendTimer=null;
const validId=id=>/^\d{5,}$/.test(String(id||''));
const nameFor=id=>{
 const row=Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB.find(x=>String(x?.[0])===id):null;
 return String(row?.[1]||'Producto '+id);
};
function readCart(){
 try{
  const c=JSON.parse(localStorage.getItem(CART_KEY)||'{}');
  if(!c||typeof c!=='object'||Array.isArray(c))return {};
  const out={};
  for(const [id,value] of Object.entries(c)){
   const n=Number(value);
   if(validId(id)&&Number.isInteger(n)&&n>0&&n<=MAX)out[id]=n;
  }
  return out;
 }catch{return {}}
}
function writeCart(next){try{localStorage.setItem(CART_KEY,JSON.stringify(next));return true}catch{return false}}
function readSession(key){try{return sessionStorage.getItem(key)}catch{return null}}
function writeSession(key,value){try{sessionStorage.setItem(key,value);return true}catch{return false}}
function dropSession(key){try{sessionStorage.removeItem(key)}catch{}}
function equalCarts(a,b){
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
 return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&a[k]===b[k]);
}
function preserveUi(){
 writeSession(RESTORE_KEY,JSON.stringify({
  at:Date.now(),open:!!el('drawer')?.classList.contains('open'),
  search:el('search')?.value||el('search-mobile')?.value||'',
  category:el('filters')?.querySelector('button[data-cat].active')?.dataset.cat||'',
  subcategory:el('subfilters')?.querySelector('button[data-sub].active')?.dataset.sub||'',
  scroll:window.scrollY||0
 }));
}
function restoreUi(){
 const raw=readSession(RESTORE_KEY);if(!raw)return;
 dropSession(RESTORE_KEY);
 let state;try{state=JSON.parse(raw)}catch{return}
 if(!state||Date.now()-state.at>60000)return;
 const input=el('search')||el('search-mobile');
 if(input&&state.search){
  input.value=state.search;
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 if(state.category){
  const restoreCategory=()=>{
   const buttons=[...el('filters')?.querySelectorAll('button[data-cat]')||[]];
   const button=buttons.find(b=>b.dataset.cat===state.category);
   if(!button)return false;
   if(!button.classList.contains('active'))button.click();
   if(state.subcategory){
    const subs=[...el('subfilters')?.querySelectorAll('button[data-sub]')||[]];
    const sub=subs.find(b=>b.dataset.sub===state.subcategory);
    if(sub&&!sub.classList.contains('active'))sub.click();
   }
   return true;
  };
  if(!restoreCategory())setTimeout(restoreCategory,900);
 }
 if(state.open){const b=el('cart-top')||el('mobile-cart-open');if(b)b.click()}
 if(Number.isFinite(state.scroll)&&state.scroll>=0){
  requestAnimationFrame(()=>window.scrollTo(0,state.scroll));
 }
}
function reloadWithCart(next){
 preserveUi();
 if(!writeCart(next)){dropSession(RESTORE_KEY);return false}
 window.location.reload();
 return true;
}
function updateQuantity(id,n){
 if(!validId(id)||!Number.isInteger(n)||n<0||n>MAX)return false;
 const current=readCart();
 if(n>0)current[id]=n;else delete current[id];
 if(!reloadWithCart(current)){
  window.alert('No se pudo guardar la cantidad. Tu carrito continúa sin cambios.');
  return false;
 }
 return true;
}
function removeWholeSku(id){
 const cart=readCart(),qty=cart[id];
 if(!qty)return;
 const container=el('cart-items');
 if(qty<=MAX_NATIVE_DECREMENTS&&container){
  for(let i=0;i<qty;i++){
   const minus=[...container.querySelectorAll('button[data-dec]')].find(b=>b.dataset.dec===id);
   if(!minus)break;
   minus.click();
  }
  if(!readCart()[id])return;
 }
 const next=readCart();delete next[id];
 if(!reloadWithCart(next))window.alert('No se pudo eliminar el artículo. Comprueba el carrito.');
}
function ensureEditDialog(){
 if(editDialog)return editDialog;
 editDialog=document.createElement('div');
 editDialog.id='nav-cart-quantity-overlay';
 editDialog.hidden=true;
 editDialog.setAttribute('role','dialog');
 editDialog.setAttribute('aria-modal','true');
 editDialog.setAttribute('aria-labelledby','nav-quantity-title');
 editDialog.innerHTML='<form id="nav-quantity-form" class="nav-quantity-form">'+
  '<h3 id="nav-quantity-title">Escribir cantidad</h3>'+
  '<p id="nav-quantity-product"></p>'+
  '<label for="nav-quantity-input">Cantidad o ajuste (+ / −)</label>'+
  '<input id="nav-quantity-input" type="text" inputmode="text" autocomplete="off" maxlength="6" required>'+
  '<small>+5 suma 5 unidades, -3 resta 3 unidades y 50 establece el total en 50. Nunca se permite un saldo negativo.</small>'+
  '<p id="nav-quantity-error" role="alert" hidden></p>'+
  '<div class="nav-quantity-actions"><button type="button" id="nav-quantity-cancel">Cancelar</button>'+
  '<button type="submit" id="nav-quantity-save">Guardar cantidad</button></div></form>';
 document.body.appendChild(editDialog);
 el('nav-quantity-cancel').addEventListener('click',closeEdit);
 editDialog.addEventListener('click',e=>{if(e.target===editDialog)closeEdit()});
 el('nav-quantity-form').addEventListener('submit',e=>{
  e.preventDefault();
  const input=el('nav-quantity-input');
  const raw=String(input.value||'').trim(),error=el('nav-quantity-error');
  // Sin signo: sustituye el total. Con + o -: modifica lo existente.
  if(!/^[+-]?\d{1,4}$/.test(raw)){
   error.textContent='Escribe 50 para fijar el total, +5 para sumar o -3 para restar.';
   error.hidden=false;input.focus();return;
  }
  const id=editId;
  if(!id)return;
  const number=Number(raw);
  const previous=readCart()[id]||0;
  const target=/^[+-]/.test(raw)?previous+number:number;
  if(!Number.isInteger(target)||target>MAX){
   error.textContent='La cantidad máxima es 9,999 unidades.';
   error.hidden=false;input.focus();return;
  }
  editDialog.hidden=true;editId='';
  updateQuantity(id,Math.max(0,target));
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&editDialog&&!editDialog.hidden){e.preventDefault();e.stopImmediatePropagation();closeEdit()}},true);
 return editDialog;
}
function openEdit(id){
 if(!validId(id))return;
 const dialog=ensureEditDialog();
 editId=id;
 el('nav-quantity-product').textContent=nameFor(id)+' · Código '+id;
 el('nav-quantity-input').value=String(readCart()[id]||0);
 el('nav-quantity-error').hidden=true;
 dialog.hidden=false;
 setTimeout(()=>{if(!dialog.hidden){const input=el('nav-quantity-input');input.focus();input.select()}},60);
}
function closeEdit(){
 if(!editDialog)return;
 editDialog.hidden=true;editId='';lastTap={code:'',at:0};
}
function insertCartButtons(){
 const container=el('cart-items');if(!container)return;
 for(const line of container.querySelectorAll('.cart-line')){
  const dec=line.querySelector('button[data-dec]'),id=dec?.dataset.dec;
  if(!validId(id))continue;
  if(!line.querySelector('[data-nav-remove]')){
   const name=line.querySelector('strong')?.textContent?.trim()||'producto';
   const b=document.createElement('button');
   b.type='button';b.className='nav-cart-remove';b.dataset.navRemove=id;
   b.title='Eliminar producto completo';
   b.setAttribute('aria-label','Eliminar todas las unidades de '+name);
   b.textContent='×';line.appendChild(b);
  }
  if(!line.querySelector('[data-nav-edit]')){
   const b=document.createElement('button');
   b.type='button';b.className='nav-cart-edit';b.dataset.navEdit=id;
   b.textContent='✎ Cantidad';b.title='Escribir cantidad exacta';
   b.setAttribute('aria-label','Editar cantidad total de '+id);
   const controls=line.querySelector('.cart-controls')||line;
   controls.appendChild(b);
  }
 }
}
function readUndo(){
 const raw=readSession(UNDO_KEY);
 if(!raw)return null;
 try{
  const o=JSON.parse(raw);
  if(!o||!o.cart||typeof o.cart!=='object'||Date.now()-o.at>UNDO_EXPIRY){
   dropSession(UNDO_KEY);return null;
  }
  const cleaned={};
  for(const [k,v] of Object.entries(o.cart)){
   if(validId(k)&&Number.isInteger(v)&&v>0&&v<=MAX)cleaned[k]=v;
  }
  return Object.keys(cleaned).length?{at:o.at,cart:cleaned}:null;
 }catch{dropSession(UNDO_KEY);return null}
}
function hideUndo(){
 undoSnapshot=null;dropSession(UNDO_KEY);
 if(undoToast)undoToast.hidden=true;
}
function ensureUndo(){
 if(undoToast)return undoToast;
 undoToast=document.createElement('div');undoToast.id='nav-wa-undo-banner';undoToast.hidden=true;
 undoToast.setAttribute('role','status');
 undoToast.innerHTML='<span>Pedido preparado en WhatsApp. Carrito vacío.</span>'+
  '<button type="button" id="nav-wa-recover">Recuperar carrito</button>'+
  '<button type="button" class="nav-wa-dismiss" id="nav-wa-dismiss" aria-label="Cerrar aviso">×</button>';
 document.body.appendChild(undoToast);
 el('nav-wa-recover').addEventListener('click',()=>{
  const backed=readUndo();if(!backed){hideUndo();return}
  const current=readCart(),restored={...current};
  for(const [id,q] of Object.entries(backed.cart)){
   restored[id]=Math.min(MAX,(restored[id]||0)+q);
  }
  if(reloadWithCart(restored))hideUndo();
 });
 el('nav-wa-dismiss').addEventListener('click',()=>{undoToast.hidden=true});
 return undoToast;
}
function showUndo(){
 undoSnapshot=readUndo();
 if(undoSnapshot)ensureUndo().hidden=false;
}
function clearAfterWhatsApp(snapshot){
 if(!snapshot||!Object.keys(snapshot).length)return;
 const current=readCart();
 // Guardar copia recuperable antes de cualquier cambio de carrito.
 const saved=writeSession(UNDO_KEY,JSON.stringify({at:Date.now(),cart:snapshot}));
 if(!saved){window.alert('No se pudo guardar una copia de recuperación. Conservamos tu carrito.');return}
 const remaining={};
 for(const [id,qty] of Object.entries(current)){
  const rest=qty-(snapshot[id]||0);
  if(rest>0)remaining[id]=rest;
 }
 if(equalCarts(current,snapshot)){
  const clear=el('clear-cart');
  if(clear&&typeof clear.click==='function'){
   clear.click();
   if(!Object.keys(readCart()).length){showUndo();return}
  }
 }
 if(!reloadWithCart(remaining)){
  dropSession(UNDO_KEY);
  window.alert('No se pudo limpiar el carrito después de abrir WhatsApp; se conserva tu pedido.');
 }
}
function captureSending(e){
 const trigger=e.target.closest('#send-whatsapp,#mobile-whatsapp');
 if(!trigger||trigger.disabled)return;
 const snapshot=readCart();
 if(!Object.keys(snapshot).length)return;
 // El onclick nativo abre https://wa.me/… con el formato exacto CANTIDAD CÓDIGO.
 // La limpieza ocurre después del onclick y permite recuperar el pedido anterior.
 const ticket={at:Date.now(),cart:snapshot};
 pendingSend=ticket;
 if(sendTimer)clearTimeout(sendTimer);
 sendTimer=setTimeout(()=>{
  if(pendingSend!==ticket)return;
  pendingSend=null;sendTimer=null;clearAfterWhatsApp(ticket.cart);
 },360);
}
function captureQuantityClicks(e){
 if(editDialog&&!editDialog.hidden)return;
 // Los clics .click() del escáner y teclado tienen detail=0 y no deben abrir este diálogo.
 if(e.detail===0||e.isTrusted===false)return;
 const target=e.target,remove=target.closest?.('[data-nav-remove]');
 if(remove)return;
 const edit=target.closest?.('button[data-nav-edit]');
 if(edit){
  e.preventDefault();e.stopImmediatePropagation();
  lastTap={code:'',at:0};openEdit(edit.dataset.navEdit);
  return;
 }
 const container=target.closest?.('#products');
 if(!container)return;
 const card=target.closest?.('[data-card]');
 if(!card)return;
 const id=card.getAttribute('data-card');
 if(!validId(id))return;
 if(target.closest?.('button[data-dec]')){lastTap={code:'',at:0};return}
 // Botones de otras funciones dentro de las tarjetas no deben disparar edición.
 const button=target.closest?.('button');
 if(button&&!button.matches('[data-inc],[data-plus],[data-add]'))return;
 const now=Date.now();
 if(lastTap.code===id&&now-lastTap.at>0&&now-lastTap.at<=DOUBLE_MS){
  e.preventDefault();e.stopImmediatePropagation();
  lastTap={code:'',at:0};
  openEdit(id);return;
 }
 lastTap={code:id,at:now};
}
/* Comandos rápidos del BUSCADOR sobre el último artículo añadido. */
const QUICK_LAST_KEY='navarro_ultimo_producto_v1';
const QUICK_NOTICE_KEY='navarro_ajuste_busqueda_aviso_v1';
function rememberLastAdded(before,preferred){
 const after=readCart();
 const increased=Object.keys(after).filter(id=>(after[id]||0)>(before[id]||0));
 const chosen=increased.includes(preferred)?preferred:increased.length===1?increased[0]:null;
 if(chosen)try{sessionStorage.setItem(QUICK_LAST_KEY,chosen)}catch{}
}
function captureLastAddedClick(e){
 // Se escucha antes de que el carrito original procese la pulsación.
 const target=e.target;
 const card=target.closest?.('[data-card]');
 const increment=target.closest?.('button[data-inc],button[data-add],button[data-plus]');
 const preferred=String(card?.dataset.card||increment?.dataset.inc||increment?.dataset.add||increment?.dataset.plus||'');
 if(!validId(preferred))return;
 // No tomar como último agregado las pulsaciones de menos, eliminar, foto o lápiz.
 if(target.closest?.('button[data-dec],button[data-minus],button[data-nav-edit],button[data-nav-remove],button.nav-v40-camera'))return;
 const before=readCart();
 setTimeout(()=>rememberLastAdded(before,preferred),0);
}
function quickTarget(cart){
 let last='';try{last=sessionStorage.getItem(QUICK_LAST_KEY)||''}catch{}
 if(validId(last)&&cart[last]>0)return last;
 // Respaldo tras recargar: la última clave del carrito suele ser la última añadida.
 const available=Object.keys(cart);
 return available.length?available[available.length-1]:null;
}
function applySearchCommand(e){
 if(e.key!=='Enter'||e.isComposing)return;
 const input=e.target;
 if(!input||!['search','search-mobile'].includes(input.id))return;
 const typed=String(input.value||'').trim();
 if(!/^[+-]\s*\d{1,4}$/.test(typed))return;
 e.preventDefault();e.stopImmediatePropagation();
 const cart=readCart(),id=quickTarget(cart);
 if(!id){
  window.alert('Primero agrega un producto al carrito. Después podrás escribir +5 o -3 en el buscador.');
  return;
 }
 const amount=Number(typed.replace(/\s/g,''));
 const next=Math.min(MAX,Math.max(0,(cart[id]||0)+amount));
 try{
  sessionStorage.setItem(QUICK_LAST_KEY,id);
  sessionStorage.setItem(QUICK_NOTICE_KEY,(amount>=0?'+':'')+amount+' → '+next+' unidades: '+nameFor(id));
 }catch{}
 // Borrar la orden antes de preserveUi para que la búsqueda no se restaure con "+5".
 input.value='';
 input.dispatchEvent(new Event('input',{bubbles:true}));
 updateQuantity(id,next);
}
function showQuickNotice(){
 let msg=null;try{msg=sessionStorage.getItem(QUICK_NOTICE_KEY);sessionStorage.removeItem(QUICK_NOTICE_KEY)}catch{}
 if(!msg)return;
 const notice=document.createElement('div');
 notice.setAttribute('role','status');
 notice.textContent=msg;
 notice.style.cssText='position:fixed;bottom:calc(16px + env(safe-area-inset-bottom));left:12px;right:12px;max-width:460px;margin:auto;background:#173b63;color:white;padding:14px 16px;border-radius:12px;z-index:2147482990;text-align:center;box-shadow:0 8px 30px #0004;font:700 14px/1.4 system-ui';
 document.body.appendChild(notice);
 setTimeout(()=>notice.remove(),3200);
}
function init(){
 if(initialized)return;
 const items=el('cart-items');
 if(!items||!el('send-whatsapp')||!el('clear-cart'))return;
 initialized=true;
 document.addEventListener('click',captureLastAddedClick,true);
 document.addEventListener('keydown',applySearchCommand,true);
 showQuickNotice();
 dropSession(LEGACY_PENDING_KEY); // Antiguo diálogo de confirmación ya no se usa.
 const css=document.createElement('style');css.id='navarro-carrito-seguro-style-v2';
 css.textContent=
  '.cart-line{position:relative;padding-right:42px!important}.nav-cart-remove{position:absolute;right:0;top:11px;width:36px;height:36px;border:1px solid #f3c7c7;background:#fff5f5;color:#b32929;border-radius:10px;font-size:26px;display:grid;place-items:center;cursor:pointer;z-index:2}.cart-controls{flex-wrap:wrap;column-gap:9px;row-gap:8px}.nav-cart-edit{margin-left:auto;order:3;border:1px solid #c2d3e6;background:#f2f7fd;color:#173f6e;border-radius:9px;padding:7px 9px;min-height:36px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}.nav-cart-remove:focus-visible,.nav-cart-edit:focus-visible{outline:3px solid #4b89cd;outline-offset:2}#products [data-card]{touch-action:manipulation}#nav-cart-quantity-overlay[hidden],#nav-wa-undo-banner[hidden]{display:none!important}#nav-cart-quantity-overlay{position:fixed;inset:0;background:#061a34d4;z-index:2147483001;display:grid;place-items:center;padding:18px;box-sizing:border-box}.nav-quantity-form{width:100%;max-width:410px;padding:22px;border-radius:18px;background:#fff;color:#193149;box-sizing:border-box;box-shadow:0 16px 50px #0004}.nav-quantity-form h3{font-size:21px;margin:0 0 6px}.nav-quantity-form p{font-size:13px;color:#55667b;line-height:1.4;margin:0 0 18px}.nav-quantity-form label{display:block;font-size:13px;font-weight:800;margin-bottom:8px}.nav-quantity-form input{width:100%;box-sizing:border-box;font-size:24px;font-weight:800;text-align:center;padding:12px;border:2px solid #b5c5d7;border-radius:12px;min-height:54px}.nav-quantity-form small{display:block;margin-top:10px;color:#63758a;font-size:12px;line-height:1.5}.nav-quantity-form [role=alert]{color:#b32929;margin:8px 0}.nav-quantity-actions{display:flex;gap:10px;margin-top:18px}.nav-quantity-actions button{flex:1;padding:11px 8px;min-height:46px;border:0;border-radius:11px;background:#e8edf3;color:#1b3555;font-weight:800;font-size:13px}.nav-quantity-actions button[type=submit]{background:#102b54;color:#fff}#nav-wa-undo-banner{position:fixed;bottom:max(15px,env(safe-area-inset-bottom));left:12px;right:12px;max-width:540px;margin:0 auto;z-index:2147482900;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;background:#edf8ef;color:#16533a;border:1px solid #a7d1b4;border-radius:13px;box-shadow:0 6px 25px #0003;padding:11px;box-sizing:border-box;font-size:12px;font-weight:750}#nav-wa-recover{background:#107547;color:white;border:0;border-radius:8px;padding:9px 12px;min-height:40px;font-weight:800;font-size:12px}#nav-wa-dismiss{background:transparent;border:0;color:#315f50;font-size:24px;line-height:1;width:32px;height:40px;cursor:pointer}';
 document.head.appendChild(css);
 ensureEditDialog();ensureUndo();showUndo();
 items.addEventListener('click',e=>{
  const b=e.target.closest('button[data-nav-remove]');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  removeWholeSku(b.dataset.navRemove);
 },true);
 new MutationObserver(insertCartButtons).observe(items,{childList:true,subtree:true});
 insertCartButtons();
 // Captura en document antes que los listeners del código original del carrito.
 document.addEventListener('click',captureQuantityClicks,true);
 document.addEventListener('click',captureSending,true);
 restoreUi();
 window.NAVARRO_CARRITO_SEGURO_ESTADO=Object.freeze({
  version:2,removeWholeSku:true,writeQuantity:true,doubleTapMilliseconds:DOUBLE_MS,
  whatsappAutoClearOnOpening:true,whatsappUndoBackup:true,
  whatsappSendConfirmationAvailable:false,whatsappFormatUnchanged:true,sifoUntouched:true
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();


/* NAVARRO_VENDEDOR_RAPIDO_V1 — Independiente y reversible.
   Activa el modo vendedor sin reemplazar buscador, catálogo, imágenes,
   facturación, formato WhatsApp ni el flujo SIFO. */
;(function(){
'use strict';
if(window.NAVARRO_VENDEDOR_RAPIDO_V1)return;
window.NAVARRO_VENDEDOR_RAPIDO_V1=true;
const KEY='navarro_cart_v1',MAX=9999;
const norm=x=>String(x==null?'':x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/\s+/g,' ');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let panel=null,search=null,results=null,message=null,count=null,items=[],timer=0,active=false;
const catalogue=()=>Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[];
function readCart(){
 try{const c=JSON.parse(localStorage.getItem(KEY)||'{}');return c&&!Array.isArray(c)&&typeof c==='object'?c:{}}
 catch{return {}}
}
function cartCount(){
 const c=readCart();return Object.keys(c).filter(x=>Number(c[x])>0).length;
}
function notify(text,problem=false){
 if(!message)return;message.textContent=text;message.style.color=problem?'#b91c1c':'#13623c';
}
function findProducts(raw){
 const q=norm(raw),db=catalogue();
 if(q.length<2)return [];
 const terms=q.split(/\s+/);
 const approved=window.NAVARRO_BUSCADOR_GENERICO;
 const filtered=[];
 for(const p of db){
  const id=String(p?.[0]??''),name=String(p?.[1]??'');
  if(!/^\d{5,}$/.test(id))continue;
  const title=norm(name),exact=id===q;
  if(!exact && !terms.every(t=>title.includes(t)))continue;
  const generic=!!(approved?.isApproved?.(id,name));
  filtered.push({id,name,generic,score:exact?10000:title===q?1000:title.startsWith(q)?500:title.includes(q)?200:0});
 }
 filtered.sort((a,b)=>b.score-a.score||Number(b.generic)-Number(a.generic)||a.name.localeCompare(b.name,'es'));
 return filtered.slice(0,30);
}
function updateResults(){
 if(!results)return;
 const q=search.value.trim();
 items=findProducts(q);
 if(!q){results.innerHTML='<p class="nv-vendedor-empty">Escribe un nombre o código para localizar productos del catálogo.</p>';return;}
 if(q.length<2){results.innerHTML='<p class="nv-vendedor-empty">Escribe al menos dos caracteres.</p>';return;}
 if(!items.length){results.innerHTML='<p class="nv-vendedor-empty">No se encontraron coincidencias. Prueba con otro nombre o código.</p>';return;}
 results.innerHTML=items.map((p,i)=>'<div class="nv-vendedor-item">'+
 '<div class="nv-vendedor-desc"><b>'+esc(p.name)+'</b><small>Código '+esc(p.id)+(p.generic?' · Genérico':'')+'</small></div>'+
 '<label class="nv-vendedor-qty">Cantidad<input aria-label="Cantidad de '+esc(p.name)+'" data-nv-qty="'+i+'" type="number" min="1" max="9999" step="1" inputmode="numeric" value="1"></label>'+
 '<button type="button" data-nv-add="'+i+'" aria-label="Agregar '+esc(p.name)+'">Agregar</button></div>').join('');
}
function add(i,button){
 const p=items[i];if(!p)return;
 const field=results.querySelector('input[data-nv-qty="'+i+'"]');
 const raw=String(field?.value??'').trim(),n=Number(raw);
 if(!/^\d{1,4}$/.test(raw)||!Number.isInteger(n)||n<1||n>MAX){
  notify('Escribe una cantidad entera entre 1 y 9,999.',true);field?.focus();return;
 }
 const c=readCart(),previous=Number(c[p.id])||0;
 if(!Number.isFinite(previous)||previous<0||previous+n>MAX){
  notify('La cantidad acumulada supera el máximo permitido.',true);return;
 }
 c[p.id]=Number((previous+n).toFixed(4));
 try{
  localStorage.setItem(KEY,JSON.stringify(c));
  sessionStorage.setItem('navarro_ultimo_producto_v1',p.id);
 }catch{notify('No fue posible guardar el carrito. No se agregó el artículo.',true);return;}
 notify('Agregado: '+n+' × '+p.name+'. Ya tienes '+c[p.id]+' en el carrito.');
 count.textContent=cartCount()+' productos distintos en el carrito';
 button.textContent='✓ Agregado';
 setTimeout(()=>{if(button.isConnected)button.textContent='Agregar'},950);
}
function close(){if(panel){panel.hidden=true;active=false;document.body.style.removeProperty('overflow');}}
function open(){
 if(!panel)return;
 panel.hidden=false;active=true;
 document.body.style.overflow='hidden';
 count.textContent=cartCount()+' productos distintos en el carrito';
 notify('Busca, escribe la cantidad y agrega sin salir de esta pantalla.');
 search.focus();
}
function init(){
 if(document.getElementById('nv-vendedor-btn'))return;
 const style=document.createElement('style');
 style.textContent='#nv-vendedor-panel[hidden]{display:none!important}#nv-vendedor-panel{position:fixed;inset:0;z-index:2147483003;background:#071a39dc;display:grid;place-items:center;padding:12px;box-sizing:border-box}#nv-vendedor-window{width:100%;max-width:680px;max-height:94dvh;display:flex;flex-direction:column;background:#fff;color:#19334f;border-radius:17px;padding:16px;box-sizing:border-box;box-shadow:0 20px 70px #0006;font:14px system-ui}#nv-vendedor-header{display:flex;align-items:center;justify-content:space-between;gap:10px}#nv-vendedor-header h2{margin:0;font-size:20px}#nv-vendedor-header button{width:42px;height:42px;border:0;border-radius:9px;background:#eef2f7;font-size:24px;color:#213957}#nv-vendedor-query{width:100%;box-sizing:border-box;min-height:48px;padding:12px;border:1px solid #bacde1;border-radius:10px;margin-top:12px;font:16px system-ui}#nv-vendedor-results{overflow:auto;min-height:90px;margin-top:8px;flex:1}#nv-vendedor-panel .nv-vendedor-item{border-bottom:1px solid #e5ecf3;padding:11px 3px;display:flex;align-items:center;gap:9px}#nv-vendedor-panel .nv-vendedor-desc{min-width:0;flex:1}#nv-vendedor-panel .nv-vendedor-desc b{display:block;font-size:13px;overflow-wrap:anywhere}#nv-vendedor-panel .nv-vendedor-desc small{display:block;color:#66778a;margin-top:4px}#nv-vendedor-panel .nv-vendedor-qty{font-size:10px;color:#4d647a;text-align:center}#nv-vendedor-panel .nv-vendedor-qty input{display:block;width:60px;max-width:18vw;box-sizing:border-box;min-height:39px;font-size:16px;text-align:center;border:1px solid #c0d1e2;border-radius:8px}#nv-vendedor-panel button[data-nv-add]{background:#123e70;border:0;border-radius:9px;color:#fff;min-height:42px;padding:9px 11px;font-weight:750;font-size:12px}#nv-vendedor-panel .nv-vendedor-empty{padding:20px;color:#64758b;text-align:center}#nv-vendedor-status{font-size:12px;margin:9px 0;min-height:17px}#nv-vendedor-bottom{border-top:1px solid #e3ebf4;padding-top:10px;display:flex;justify-content:space-between;align-items:center;gap:10px}#nv-vendedor-count{font-size:12px;color:#51647b}#nv-vendedor-cart{background:#e8f0f9;color:#15385f;border:1px solid #b6cde4;border-radius:9px;padding:10px;font-weight:750}#nv-vendedor-btn{min-height:38px;background:#133b68;border:1px solid #315e8b;color:#fff;border-radius:10px;padding:7px 12px;font:750 13px system-ui;cursor:pointer;margin:7px 0}';
 document.head.appendChild(style);
 const button=document.createElement('button');button.id='nv-vendedor-btn';button.type='button';button.textContent='⚡ Vendedor rápido';button.setAttribute('aria-label','Abrir modo vendedor rápido');
 const base=document.getElementById('search-mobile')||document.getElementById('search');
 if(base?.parentElement)base.parentElement.insertAdjacentElement('afterend',button);
 else document.body.appendChild(button);
 panel=document.createElement('div');panel.id='nv-vendedor-panel';panel.hidden=true;
 panel.innerHTML='<section id="nv-vendedor-window" role="dialog" aria-modal="true" aria-labelledby="nv-vendedor-title">'+
 '<div id="nv-vendedor-header"><h2 id="nv-vendedor-title">⚡ Modo vendedor rápido</h2><button type="button" id="nv-vendedor-close" aria-label="Cerrar">×</button></div>'+
 '<input type="search" id="nv-vendedor-query" placeholder="Buscar producto por nombre o código" autocomplete="off" aria-label="Buscar catálogo">'+
 '<div id="nv-vendedor-results"></div><p id="nv-vendedor-status" role="status"></p>'+
 '<div id="nv-vendedor-bottom"><span id="nv-vendedor-count"></span><button type="button" id="nv-vendedor-cart">Ver carrito</button></div></section>';
 document.body.appendChild(panel);
 search=document.getElementById('nv-vendedor-query');
 results=document.getElementById('nv-vendedor-results');
 message=document.getElementById('nv-vendedor-status');
 count=document.getElementById('nv-vendedor-count');
 updateResults();
 button.addEventListener('click',open);
 document.getElementById('nv-vendedor-close').addEventListener('click',close);
 panel.addEventListener('click',e=>{if(e.target===panel)close();const b=e.target.closest('button[data-nv-add]');if(b)add(Number(b.dataset.nvAdd),b)});
 search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(updateResults,110)});
 document.getElementById('nv-vendedor-cart').addEventListener('click',()=>{
  close();
  // La página principal vuelve a dibujar el carrito a partir de localStorage.
  window.location.reload();
 });
 document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.preventDefault();close()}},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
