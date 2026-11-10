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
// V66: conservar cantidades fraccionarias ya registradas, sin convertirlas a enteros.
const validQty=n=>Number.isFinite(n)&&n>0&&n<=MAX;
const roundQty=n=>Math.round((n+Number.EPSILON)*1000000)/1000000;
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
   if(validId(id)&&validQty(n))out[id]=n;
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
 // V66: actualizar el carrito real sin recargar; usar respaldo si falta el puente.
 const live=window.NAVARRO_CARRITO_EN_VIVO_V66;
 if(live?.version===66 && typeof live.replace==='function'){
  const result=live.replace(next);
  if(!result?.ok){window.alert(result?.reason||'No se pudo modificar el carrito.');return false;}
  return true;
 }
 preserveUi();
 if(!writeCart(next)){dropSession(RESTORE_KEY);return false}
 window.location.reload();
 return true;
}
function updateQuantity(id,n){
 if(!validId(id)||!Number.isFinite(n)||n<0||n>MAX)return false;
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
 if(window.NAVARRO_CARRITO_EN_VIVO_V66?.version===66){
  const next={...cart};delete next[id];
  reloadWithCart(next);
  return;
 }
 const container=el('cart-items');
 if(Number.isInteger(qty)&&qty<=MAX_NATIVE_DECREMENTS&&container){
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
  '<input id="nav-quantity-input" type="text" inputmode="text" autocomplete="off" maxlength="12" required>'+
  '<small>50 fija la cantidad, +5 suma y -3 resta. Los decimales solo se permiten por kilo, metro o litro.</small>'+
  '<p id="nav-quantity-error" role="alert" hidden></p>'+
  '<div class="nav-quantity-actions"><button type="button" id="nav-quantity-cancel">Cancelar</button>'+
  '<button type="submit" id="nav-quantity-save">Guardar cantidad</button></div></form>';
 document.body.appendChild(editDialog);
 el('nav-quantity-cancel').addEventListener('click',closeEdit);
 editDialog.addEventListener('click',e=>{if(e.target===editDialog)closeEdit()});
 el('nav-quantity-form').addEventListener('submit',e=>{
  e.preventDefault();
  const input=el('nav-quantity-input');
  const raw=String(input.value||'').trim().replace(',','.'),error=el('nav-quantity-error');
  // Sin signo: sustituye el total. Con + o -: modifica lo existente.
  if(!/^[+-]?(?:\d{1,4}(?:\.\d{1,3})?|\.\d{1,3})$/.test(raw)){
   error.textContent='Escribe 50, +5, -3 o 0.66 (si se vende por kilo, metro o litro).';
   error.hidden=false;input.focus();return;
  }
  const id=editId;
  if(!id)return;
  const number=Number(raw);
  const previous=readCart()[id]||0;
  const target=roundQty(/^[+-]/.test(raw)?previous+number:number);
  const canFractional=window.NAVARRO_CARRITO_EN_VIVO_V66?.canFractional?.(id)===true;
  if(!Number.isFinite(target)||target>MAX||(!canFractional&&!Number.isInteger(target))){
   error.textContent=canFractional?'La cantidad máxima es 9,999 y permite hasta 3 decimales.':'Este producto se vende por unidad entera.';
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
 const fraction=window.NAVARRO_CARRITO_EN_VIVO_V66?.canFractional?.(id)===true;
 const help=el('nav-quantity-form')?.querySelector('small');
 if(help)help.textContent=fraction
  ? 'Acepta 0.66, 1.5, +0.25 o -0.5 (hasta 3 decimales). Los importes editados se recalculan.'
  : 'Solo unidades enteras. Escribe 50 para fijar cantidad, +5 para sumar o -3 para restar.';
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
   const n=Number(v);
    if(validId(k)&&validQty(n))cleaned[k]=n;
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
   restored[id]=roundQty(Math.min(MAX,(restored[id]||0)+q));
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
  const rest=roundQty(qty-(snapshot[id]||0));
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
 }else if(window.NAVARRO_CARRITO_EN_VIVO_V66?.version===66)showUndo();
}
function priceOverridesInOrder(cart){
 let overrides,clavos,importes;
 try{
  overrides=JSON.parse(localStorage.getItem('navarro360_precio_caja_activa_v1')||'{}');
  clavos=JSON.parse(localStorage.getItem('navarro_clavos_importe_v1')||'{}');
  importes=JSON.parse(localStorage.getItem('navarro_importes_cents_v1')||'{}');
 }catch{return []}
 if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))return [];
 const ids=new Set(Object.keys(cart)),bases=new Map();
 for(const row of Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[])
  if(Array.isArray(row)&&ids.has(String(row[0])))bases.set(String(row[0]),Number(row[2]));
 const out=[];
 for(const [id,q] of Object.entries(cart)){
  if(!Number.isFinite(q)||q<=0||Number(clavos?.[id]||importes?.[id]||0)>0)continue;
  const p=bases.get(id),n=Number(overrides[id]);
  if(Number.isFinite(p)&&Number.isSafeInteger(n)&&n>0&&n!==Math.round(p*100))
   out.push({id,old:Math.round(p*100),newPrice:n});
 }
 return out;
}
/* NAVARRO VARIOS GUIADO V1: reproduce la solicitud real de PRODUCTOS VARIOS.
   El modulo SIFO del bot exige $20 base, dos decimales y múltiplos de $0.20.
   No se envía nunca "0.75 00000" como comando de WhatsApp.
   No se presupone que WhatsApp haya enviado ningún mensaje. */
function evaluarAjusteVarios(cart){
 const changes=priceOverridesInOrder(cart);
 if(!changes.length)return {status:'none',changes};
 let cents=0;
 for(const change of changes){
  const units=Number(cart[change.id]||0);
  if(!Number.isFinite(units)||units<=0)return {status:'invalid',reason:'Cantidad de producto incorrecta'};
  cents+=Math.round((change.newPrice-change.old)*units);
 }
 if(!Number.isSafeInteger(cents))return {status:'invalid',reason:'Importe demasiado grande'};
 if(cents===0)return {status:'zero',changes,reason:'Los precios editados se compensan; SIFO conservaría los precios originales'};
 if(cents<0)return {status:'discount',changes,cents,reason:'PRODUCTOS VARIOS no admite un ajuste negativo'};
 if(cents%20!==0)return {status:'fraction',changes,cents,reason:'PRODUCTOS VARIOS necesita un importe múltiplo de $0.20'};
 if(cents>100000000)return {status:'invalid',changes,cents,reason:'Importe fuera de rango'};
 const quantity=cents/2000;
 if(quantity<=0||quantity>10000000)return {status:'invalid',changes,cents,reason:'Cantidad SIFO fuera de rango'};
 return {status:'ready',changes,cents,quantitySifo:quantity.toFixed(2),amountText:'$'+(cents/100).toFixed(2)};
}
const NAV_VARIOS_STAGE='navarro360_varios_whatsapp_etapas_v1';
const NAV_WA_DESTINO='525639129040'; // mismo WhatsApp comercial configurado en index.html
function guiaVariosOpen(cart,plan){
 let modal=el('nv-varios-guia');
 if(modal)modal.remove();
 const signature=JSON.stringify({cart,changes:plan.changes,cents:plan.cents});
 let stage=0;
 try{
  const prev=JSON.parse(sessionStorage.getItem(NAV_VARIOS_STAGE)||'null');
  if(prev?.signature===signature&&Date.now()-prev.at<7200000&&Number.isInteger(prev.stage)){
   stage=Math.min(3,Math.max(0,prev.stage));
  }
 }catch(_){}
 const persist=()=>{try{sessionStorage.setItem(NAV_VARIOS_STAGE,JSON.stringify({signature,stage,at:Date.now()}))}catch(_){}};
 const fresh=()=>{
  const now=readCart(),status=evaluarAjusteVarios(now);
  return JSON.stringify({cart:now,changes:status.changes,cents:status.cents})===signature && status.status==='ready';
 };
 modal=document.createElement('div');modal.id='nv-varios-guia';
 modal.style.cssText='position:fixed;inset:0;z-index:2147483100;background:#081b30bd;display:flex;justify-content:center;align-items:center;overflow-y:auto;padding:14px;box-sizing:border-box';
 const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-label','Enviar ajuste por PRODUCTOS VARIOS');
 panel.style.cssText='width:100%;max-width:445px;max-height:90vh;max-height:90dvh;overflow-y:auto;background:#fff;color:#152c22;border-radius:16px;padding:18px;box-sizing:border-box;box-shadow:0 20px 55px #0018;font:14px/1.45 system-ui';
 const title=document.createElement('h3');title.textContent='Ajuste por PRODUCTOS VARIOS';
 title.style.cssText='margin:0 0 7px;font:800 18px/1.35 system-ui';
 const summary=document.createElement('p');
 summary.textContent='Diferencia: '+plan.amountText+' · SIFO equivaldría a '+plan.quantitySifo+' de $20.00.\nLos productos mantienen sus cantidades originales.';
 summary.style.cssText='white-space:pre-wrap;margin:0 0 12px;font-size:13px';
 const note=document.createElement('p');
 note.textContent='Envía cada mensaje desde WhatsApp y espera la respuesta del bot ANTES del paso siguiente. Abrir WhatsApp no envía el mensaje por sí mismo.';
 note.style.cssText='font-size:12px;background:#fff5dd;color:#704d18;border-radius:9px;padding:10px;margin:0 0 12px';
 const status=document.createElement('p');status.setAttribute('role','status');
 status.style.cssText='margin:10px 0;color:#28603e;font-size:12px;font-weight:700';
 const actions=document.createElement('div');actions.style.cssText='display:grid;gap:8px';
 const buttons=[];
 function addStep(label,run){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.style.cssText='border:0;border-radius:10px;background:#21583a;color:white;padding:11px;text-align:left;font:750 13px/1.4 system-ui;min-height:45px';
  b.addEventListener('click',()=>{
   if(!fresh()){window.alert('El carrito o el precio cambió. Cierra esta guía y vuelve a empezar.');return}
   try{run()}catch(err){window.alert('No se pudo abrir WhatsApp. Inténtalo de nuevo.');return}
   stage=Math.max(stage,buttons.indexOf(b)+1);persist();refresh();
  });
  actions.appendChild(b);buttons.push(b);return b;
 }
 addStep('1. Enviar productos del carrito',()=>{
  const native=el('send-whatsapp');
  if(!native||typeof native.onclick!=='function')throw Error('Envio de productos no disponible');
  native.onclick(); // invoca envío original, sin generar evento clic ni vaciar el carrito
 });
 function openText(message){
  window.open('https://wa.me/'+NAV_WA_DESTINO+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
 }
 addStep('2. Enviar 00000',()=>openText('00000'));
 addStep('3. Enviar '+plan.amountText,()=>openText(plan.amountText));
 const finishText=document.createElement('p');
 finishText.style.cssText='font-size:12px;line-height:1.5;margin:12px 0;color:#4c5b4f';
 finishText.textContent='Cuando el bot confirme PRODUCTOS VARIOS por el importe indicado, responde OK en WhatsApp y sigue el pago y entrega normales. Si el bot no lo reconoce, NO confirmes la venta; conserva el carrito.';
 const reset=document.createElement('button');reset.type='button';reset.textContent='Reiniciar pasos si no se enviaron';
 reset.style.cssText='margin-top:10px;width:100%;min-height:38px;border:1px solid #d5d9dd;background:#fafafa;color:#58615b;border-radius:9px;font:600 12px system-ui';
 reset.addEventListener('click',()=>{
  if(!window.confirm('Reinicia sólo si NO enviaste los mensajes anteriores o el bot rechazó la operación. Si los duplicas podría haber ventas repetidas. ¿Reiniciar?'))return;
  stage=0;persist();refresh();
 });
 const close=document.createElement('button');close.type='button';close.textContent='Cerrar y conservar carrito';
 close.style.cssText='margin-top:8px;width:100%;min-height:42px;border-radius:10px;border:1px solid #bacfc0;background:#f4faf5;color:#275338;font:750 13px system-ui';
 close.addEventListener('click',()=>modal.remove());
 function refresh(){
  buttons.forEach((b,i)=>{b.disabled=i!==stage||stage>=3;b.style.opacity=b.disabled?'.4':'1'});
  status.textContent=stage===0?'Comienza por el paso 1.':stage===1?'Abre WhatsApp, envía el pedido y espera el resumen antes del paso 2.':stage===2?'Espera que el bot pregunte el importe antes del paso 3.':'Espera confirmación del importe; después responde OK en WhatsApp.';
 }
 panel.append(title,summary,note,actions,status,finishText,reset,close);modal.appendChild(panel);
 document.body.appendChild(modal);refresh();close.focus();
}
function captureSending(e){
 const trigger=e.target.closest('#send-whatsapp,#mobile-whatsapp');
 if(!trigger||trigger.disabled)return;
 const snapshot=readCart();
 if(!Object.keys(snapshot).length)return;
 const changed=priceOverridesInOrder(snapshot);
 if(changed.length){
  e.preventDefault();e.stopImmediatePropagation();
  const plan=evaluarAjusteVarios(snapshot);
  if(plan.status!=='ready'){
   window.alert('No se envió el pedido.\n'+(plan.reason||'No se puede representar el importe')+
    '\nLos cambios deben sumar un importe positivo, múltiplo de $0.20. Revisa los precios.');
   return;
  }
  guiaVariosOpen(snapshot,plan);
  return;
 }
 // Pedidos sin precios editados: se conservan el envío y la limpieza originales.
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
 const next=roundQty(Math.min(MAX,Math.max(0,(cart[id]||0)+amount)));
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
  version:66,removeWholeSku:true,writeQuantity:true,editWithoutReload:true,doubleTapMilliseconds:DOUBLE_MS,
  whatsappAutoClearOnOpening:true,whatsappUndoBackup:true,
  whatsappSendConfirmationAvailable:false,whatsappFormatUnchanged:true,sifoUntouched:true
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

/* NAVARRO 360: Ventas en espera dentro del carrito, módulo independiente. */
(function(){
 if(window.NAVARRO_ESPERA_LOADER_V1)return;
 window.NAVARRO_ESPERA_LOADER_V1=true;
 var s=document.createElement('script');s.src='./ventas-espera-v1.js?v=4';s.async=true;
 s.onerror=function(){console.warn('NAVARRO 360: módulo de ventas en espera no disponible; carrito original intacto');};
 document.head.appendChild(s);
})();
