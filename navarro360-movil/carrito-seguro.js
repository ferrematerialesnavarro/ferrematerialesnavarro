/* NAVARRO 360 · CARRITO SEGURO V1 (noviembre 2026)
 * Complemento para el carrito original, sin sustituir su lógica.
 * X: eliminar todas las unidades de un SKU.
 * WhatsApp: solo vaciar al confirmar que el mensaje realmente fue enviado.
 * Los pedidos conservan el formato n código; bot y SIFO sin cambios.
 */
(function(){'use strict';
if(window.NAVARRO_CARRITO_SEGURO_INSTALADO)return;
window.NAVARRO_CARRITO_SEGURO_INSTALADO=true;
const CART_KEY='navarro_cart_v1';
const PENDING_KEY='navarro_whatsapp_pendiente_v1';
const RESTORE_KEY='navarro_cart_reabrir_v1';
const MAX_NATIVE_DECREMENTS=24;
let pending=null, leftForWhatsApp=false, panel=null, ready=false;
const el=id=>document.getElementById(id);
function readCart(){
 try{
  const value=JSON.parse(localStorage.getItem(CART_KEY)||'{}');
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const clean={};
  for(const [id,v] of Object.entries(value)){
   const n=Number(v);
   if(/^\d{5,}$/.test(id)&&Number.isInteger(n)&&n>0&&n<=9999)clean[id]=n;
  }
  return clean;
 }catch{return {}}
}
function setCart(cart){
 try{localStorage.setItem(CART_KEY,JSON.stringify(cart));return true}
 catch{return false}
}
function readSession(key){
 try{return sessionStorage.getItem(key)}catch{return null}
}
function writeSession(key,value){
 try{sessionStorage.setItem(key,value)}catch{}
}
function dropSession(key){
 try{sessionStorage.removeItem(key)}catch{}
}
function equalCarts(a,b){
 const ka=Object.keys(a).filter(k=>a[k]>0).sort();
 const kb=Object.keys(b).filter(k=>b[k]>0).sort();
 return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&a[k]===b[k]);
}
function restoreUi(){
 const raw=readSession(RESTORE_KEY);
 if(!raw)return;
 dropSession(RESTORE_KEY);
 let state;
 try{state=JSON.parse(raw)}catch{return}
 if(!state||Date.now()-state.at>60000)return;
 const input=el('search')||el('search-mobile');
 if(input&&state.search){
  input.value=state.search;
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 if(state.open){
  const button=el('cart-top')||el('mobile-cart-open');
  if(button)button.click();
 }
 // Mantener la posición previa para que no parezca una nueva página.
 if(Number.isFinite(state.scroll)&&state.scroll>=0)requestAnimationFrame(()=>window.scrollTo(0,state.scroll));
}
function reloadWithCart(next){
 if(!setCart(next))return false;
 writeSession(RESTORE_KEY,JSON.stringify({
  at:Date.now(),
  open:!!el('drawer')?.classList.contains('open'),
  search:el('search')?.value||el('search-mobile')?.value||'',
  scroll:window.scrollY||0
 }));
 window.location.reload();
 return true;
}
function removeWholeSku(id){
 const before=readCart(),qty=before[id];
 if(!qty)return;
 // Para pocas unidades, usar el botón − original conserva estado y UI sin recargar.
 if(qty<=MAX_NATIVE_DECREMENTS){
  for(let i=0;i<qty;i++){
   const dec=[...el('cart-items').querySelectorAll('button[data-dec]')].find(x=>x.dataset.dec===id);
   if(!dec)break;
   dec.click();
  }
  if(!readCart()[id])return;
 }
 // Para cantidades altas, no repetir miles de renderizados de catálogo.
 const next=readCart();delete next[id];
 if(!reloadWithCart(next)){
  const dec=[...el('cart-items').querySelectorAll('button[data-dec]')].find(x=>x.dataset.dec===id);
  if(dec){dec.click();window.alert('No se pudo guardar la eliminación completa; comprueba el carrito antes de continuar.')}
 }
}
function insertRemoveButtons(){
 const items=el('cart-items');
 if(!items)return;
 const lines=items.querySelectorAll('.cart-line');
 for(const line of lines){
  if(line.querySelector('[data-nav-remove]'))continue;
  const dec=line.querySelector('button[data-dec]');
  const code=dec?.dataset.dec;
  if(!code||!/^\d{5,}$/.test(code))continue;
  const name=line.querySelector('strong')?.textContent?.trim()||'producto';
  const b=document.createElement('button');
  b.type='button';
  b.className='nav-cart-remove';
  b.dataset.navRemove=code;
  b.setAttribute('aria-label','Eliminar por completo '+name+' del carrito');
  b.setAttribute('title','Eliminar todas las unidades');
  b.textContent='×';
  line.appendChild(b);
 }
}
function clearPending(){
 pending=null;leftForWhatsApp=false;dropSession(PENDING_KEY);
 if(panel)panel.hidden=true;
 const note=el('nav-wa-pending-note');if(note)note.hidden=true;
}
function ensurePanel(){
 if(panel)return panel;
 panel=document.createElement('div');
 panel.id='nav-wa-complete';
 panel.hidden=true;
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-labelledby','nav-wa-title');
 panel.innerHTML='<div class="nav-wa-complete-card">'+
  '<div class="nav-wa-complete-icon" aria-hidden="true">✅</div>'+
  '<h3 id="nav-wa-title">¿Ya enviaste el pedido por WhatsApp?</h3>'+
  '<p>La tienda no puede comprobar el envío. Si ya pulsaste <strong>Enviar</strong> en WhatsApp, limpiaremos los artículos de ese pedido para comenzar el siguiente.</p>'+
  '<button type="button" id="nav-wa-confirm" class="nav-wa-confirm">Sí, ya lo envié · Limpiar carrito</button>'+
  '<button type="button" id="nav-wa-keep" class="nav-wa-keep">No lo envié · Conservar carrito</button>'+
  '</div>';
 document.body.appendChild(panel);
 el('nav-wa-confirm').addEventListener('click',confirmSent);
 el('nav-wa-keep').addEventListener('click',clearPending);
 return panel;
}
function ensureNote(){
 const target=el('send-whatsapp');
 if(!target||el('nav-wa-pending-note'))return;
 const note=document.createElement('p');
 note.id='nav-wa-pending-note';
 note.className='nav-wa-note';
 note.hidden=!pending;
 note.innerHTML='Pedido abierto en WhatsApp. <button type="button" id="nav-wa-review">Confirmar si ya se envió</button>';
 target.insertAdjacentElement('afterend',note);
 el('nav-wa-review').addEventListener('click',showPanel);
}
function showPanel(){
 if(!pending||!Object.keys(pending.cart).length)return;
 ensurePanel().hidden=false;
 el('nav-wa-confirm')?.focus();
}
function confirmSent(){
 if(!pending)return;
 const snapshot=pending.cart;
 const current=readCart();
 const rest={};
 for(const [id,n] of Object.entries(current)){
  const remain=n-(snapshot[id]||0);
  if(remain>0)rest[id]=remain;
 }
 clearPending();
 // Si el carrito no cambió, usar el botón original de vaciado:
 // actualiza también la variable cerrada del carrito y los contadores.
 if(equalCarts(current,snapshot)){
  const clear=el('clear-cart');
  if(clear&&typeof clear.click==='function'){
   clear.click();
   return;
  }
 }
 // Si durante WhatsApp se agregaron otros productos, conservarlos.
 if(!reloadWithCart(rest)){
  window.alert('No se pudo actualizar el carrito. No se eliminó nada; comprueba las cantidades.');
 }
}
function captureSending(e){
 const trigger=e.target.closest('#send-whatsapp,#mobile-whatsapp');
 if(!trigger||trigger.disabled)return;
 const snapshot=readCart();
 if(!Object.keys(snapshot).length)return; // El acceso directo a WhatsApp sin pedido no se limpia.
 pending={at:Date.now(),cart:snapshot};
 leftForWhatsApp=false;
 writeSession(PENDING_KEY,JSON.stringify(pending));
 ensureNote();el('nav-wa-pending-note').hidden=false;
 // Si WhatsApp se abre en otra pestaña o aplicación, mostramos el diálogo al regresar.
 // Si el navegador bloqueó la ventana, también puede elegir conservar el carrito.
 setTimeout(()=>{if(pending&&!document.hidden&&!leftForWhatsApp)showPanel()},1800);
}
function readPending(){
 const raw=readSession(PENDING_KEY);
 if(!raw)return;
 try{
  const p=JSON.parse(raw);
  if(p&&p.cart&&typeof p.cart==='object'&&Date.now()-p.at<12*60*60*1000){
   pending={at:p.at,cart:p.cart};leftForWhatsApp=true;
  }else dropSession(PENDING_KEY);
 }catch{dropSession(PENDING_KEY)}
}
function init(){
 if(ready)return;
 const items=el('cart-items');
 if(!items||!el('send-whatsapp')||!el('clear-cart'))return;
 ready=true;
 const css=document.createElement('style');
 css.id='navarro-carrito-seguro-style';
 css.textContent='.cart-line{position:relative;padding-right:42px!important}.nav-cart-remove{position:absolute;right:0;top:12px;width:36px;height:36px;border:1px solid #f3c7c7;background:#fff5f5;color:#b32929;border-radius:10px;font-size:28px;font-weight:500;display:flex;align-items:center;justify-content:center;line-height:1;cursor:pointer;z-index:2}.nav-cart-remove:active{background:#ffe0e0}.nav-cart-remove:focus-visible{outline:3px solid #e88888;outline-offset:2px}.nav-wa-note{font-size:12px;color:#294d43;margin:9px 0;text-align:center;background:#eaf8ef;padding:10px;border-radius:9px}.nav-wa-note[hidden],#nav-wa-complete[hidden]{display:none!important}.nav-wa-note button{background:none;border:0;text-decoration:underline;font:inherit;font-weight:800;color:#126b42;cursor:pointer}#nav-wa-complete{position:fixed;inset:0;z-index:2147483000;background:#061a34b8;display:grid;place-items:center;padding:22px}.nav-wa-complete-card{width:100%;max-width:390px;background:white;border-radius:20px;padding:25px 22px;box-shadow:0 18px 60px #0004;text-align:center;color:#193149}.nav-wa-complete-icon{font-size:36px}.nav-wa-complete-card h3{font-size:19px;line-height:1.3;margin:9px 0}.nav-wa-complete-card p{font-size:13px;line-height:1.6;margin:10px 0 18px;color:#4d6275}.nav-wa-confirm,.nav-wa-keep{display:block;width:100%;min-height:47px;border-radius:11px;padding:11px;border:0;font-size:13px;font-weight:850;cursor:pointer}.nav-wa-confirm{background:#118349;color:#fff}.nav-wa-keep{margin-top:9px;background:#edf1f6;color:#253e58}';
 document.head.appendChild(css);
 readPending();ensurePanel();ensureNote();
 items.addEventListener('click',e=>{
  const b=e.target.closest('button[data-nav-remove]');
  if(!b)return;
  e.preventDefault();e.stopPropagation();
  removeWholeSku(b.dataset.navRemove);
 },true);
 new MutationObserver(insertRemoveButtons).observe(items,{childList:true,subtree:true});
 insertRemoveButtons();
 document.addEventListener('click',captureSending,true);
 document.addEventListener('visibilitychange',()=>{
  if(!pending)return;
  if(document.hidden)leftForWhatsApp=true;
  else if(leftForWhatsApp)showPanel();
 });
 window.addEventListener('blur',()=>{if(pending)leftForWhatsApp=true});
 window.addEventListener('focus',()=>{if(pending&&leftForWhatsApp)showPanel()});
 window.addEventListener('pageshow',()=>{if(pending&&leftForWhatsApp)showPanel()});
 restoreUi();
 window.NAVARRO_CARRITO_SEGURO_ESTADO=Object.freeze({
  version:1, nativeCartPreserved:true,removeAllQuantities:true,
  whatsappNeedsConfirmation:true,whatsappFormatUntouched:true,sifoUntouched:true
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();