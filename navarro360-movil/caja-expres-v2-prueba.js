/* NAVARRO 360 — CAJA EXPRÉS V2 · MÓDULO DE PRUEBAS
 * SOLO cargado en caja-expres-v2-prueba.html.
 * No intercepta imprimir, WhatsApp ni SIFO, no guarda transacciones y
 * no cambia precios. Reutiliza el sistema oficial para agregar favoritos.
 */
(function(){
'use strict';
if(window.NAVARRO_CAJA_EXPRES_V2)return;
const $=id=>document.getElementById(id);
const CART='navarro_cart_v1', CLAVOS='navarro_clavos_importe_v1';
const IMPORTES='navarro_importes_cents_v1', PRECIOS='navarro360_precio_caja_activa_v1';
const FAVORITOS='navarro360_favoritos_caja_v2';
const pesos=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const money=cents=>pesos.format(cents/100);
let catalogRef=null,catalog=null,root=null,view=null,noticeTimer=null;
function mapCatalog(){
 const arr=window.NAVARRO_DB;
 if(!Array.isArray(arr))throw Error('El catálogo no está cargado.');
 if(arr!==catalogRef){
  catalogRef=arr;
  catalog=new Map(arr.filter(Array.isArray).map(x=>[String(x[0]),{name:String(x[1]||''),price:Number(x[2])}]));
 }
 return catalog;
}
function read(k){try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(_){return {}}}
function loadFavorites(){
 try{
  const v=JSON.parse(localStorage.getItem(FAVORITOS)||'[]');
  return Array.isArray(v)?[...new Set(v.filter(x=>/^\d{5,30}$/.test(String(x))&&x!=='00000'))].slice(0,8):[];
 }catch(_){return []}
}
function saveFavorites(arr){
 try{localStorage.setItem(FAVORITOS,JSON.stringify(arr));return true}
 catch(_){announce('No hay espacio para guardar favoritos. Tu carrito no cambió.',true);return false}
}
function countCurrent(){
 const ids=Object.keys(read(CART));
 return ids.filter(id=>id!=='00000'&&mapCatalog().has(id)).slice(0,100);
}
function quote(){
 const entries=Object.entries(read(CART)),db=mapCatalog();
 const cl=read(CLAVOS),im=read(IMPORTES),ov=read(PRECIOS);
 if(!entries.length)return {subtotal:0,flete:0,total:0,count:0};
 if(entries.length>100)throw Error('Revisa el carrito: tiene más de 100 productos.');
 let subtotal=0,hasFreight=false;
 for(const [id,value] of entries){
  const qty=Number(value),p=db.get(id)||(id==='00000'?{price:20,name:'PRODUCTOS VARIOS'}:null);
  if(!/^\d{5,30}$/.test(id)||!Number.isFinite(qty)||qty<=0||qty>9999||
     !p||!Number.isFinite(p.price)||p.price<=0)throw Error('Revisa el producto '+id+' y su cantidad.');
  const a=Number(cl[id]),b=Number(im[id]),c=Number(ov[id]);
  const special=Number.isSafeInteger(a)&&a>0?a:Number.isSafeInteger(b)&&b>0?b:0;
  const unit=Number.isSafeInteger(c)&&c>0?c:Math.round(p.price*100);
  const cost=special||Math.round(qty*unit);
  if(!Number.isSafeInteger(cost)||cost<=0)throw Error('Importe no válido del producto '+id);
  subtotal+=cost;
  if(id==='7777000010')hasFreight=true;
 }
 const billing=window.NAVARRO_COBRANZA_ENTREGA;
 if(typeof billing?.snapshot!=='function')throw Error('Abre el carrito y revisa el recuadro de domicilio.');
 let fee;
 try{fee=Number(billing.snapshot().flete)}catch(_){throw Error('Revisa los datos del domicilio o el flete.')}
 if(!Number.isSafeInteger(fee)||![0,5000].includes(fee))throw Error('Flete incorrecto. Revisa tu venta.');
 if(hasFreight)fee=0;
 const total=subtotal+fee;
 if(!Number.isSafeInteger(total)||total<=0)throw Error('Total de venta no válido.');
 return {subtotal,flete:fee,total,count:entries.length};
}
function parseMoney(v){
 const s=String(v||'').trim().replace(/^\$\s*/,'').replace(/\s/g,'');
 if(!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(s))return null;
 const [whole,dec='']=s.replace(',','.').split('.');
 const num=Number(whole)*100+Number((dec+'00').slice(0,2));
 return Number.isSafeInteger(num)&&num<=999999999?num:null;
}
function announce(s,bad){
 const msg=$('nv-ce-v2-alert');if(!msg)return;
 msg.textContent=s;
 msg.style.color=bad?'#ab2a2a':'#205939';
 clearTimeout(noticeTimer);
 noticeTimer=setTimeout(()=>{if(msg.textContent===s)msg.textContent=''},6500);
}
function renderFavorites(){
 const list=$('nv-ce-v2-favorites'),available=$('nv-ce-v2-current');
 if(!list||!available)return;
 const db=mapCatalog(), fav=loadFavorites();
 list.replaceChildren();
 if(!fav.length){
  const p=document.createElement('p');p.textContent='Todavía no tienes favoritos. Agrégalos desde tu carrito.';list.appendChild(p);
 }
 for(const id of fav){
  const item=db.get(id);if(!item)continue;
  const row=document.createElement('div');row.className='nv-ce-v2-fav-row';
  const name=document.createElement('span');name.textContent=item.name+' · '+money(Math.round(item.price*100));
  const add=document.createElement('button');add.type='button';add.textContent='+ Agregar';add.dataset.favoriteAdd=id;
  const remove=document.createElement('button');remove.type='button';remove.textContent='✕';remove.dataset.favoriteRemove=id;remove.setAttribute('aria-label','Quitar '+item.name+' de favoritos');
  row.append(name,add,remove);list.appendChild(row);
 }
 available.replaceChildren();
 const current=countCurrent().filter(id=>!fav.includes(id));
 for(const id of current.slice(0,8)){
  const p=db.get(id);
  const b=document.createElement('button');b.type='button';b.className='nv-ce-v2-fav-chip';
  b.textContent='☆ '+p.name.slice(0,55);
  b.dataset.favoriteSave=id;available.appendChild(b);
 }
 $('nv-ce-v2-favorites-hint').textContent=fav.length+'/8 favoritos guardados solo en este dispositivo.';
}
function render(){
 if(!root||!view||!root.open)return;
 let q;
 try{q=quote()}catch(e){
  $('nv-ce-v2-total').textContent='Revisar carrito';
  $('nv-ce-v2-split').textContent=e.message||'No se pudo calcular';
  $('nv-ce-v2-result').textContent='';
  $('nv-ce-v2-apply').disabled=true;
  renderFavorites();return;
 }
 $('nv-ce-v2-total').textContent=money(q.total);
 $('nv-ce-v2-split').textContent='Productos '+money(q.subtotal)+' · Envío adicional '+money(q.flete);
 const cash=$('nv-ce-v2-cash'),method=view.method.value;
 const amount=parseMoney(cash.value);
 const result=$('nv-ce-v2-result'),apply=$('nv-ce-v2-apply');
 const current=$('nv-ticket-status')?.value||'none';
 $('nv-ce-v2-ticket-state').textContent=current==='pagado'?'Estado actual del ticket: PAGADO':current==='cobrar'?'Estado actual del ticket: POR COBRAR':'Estado actual del ticket: sin especificar';
 $('nv-ce-v2-cash-section').hidden=method!=='cash';
 apply.disabled=!q.count;
 if(!q.count){result.textContent='Agrega un producto para calcular el cambio.';apply.textContent='Aplicar estado al ticket';}
 else if(method==='cash'){
  if(amount===null){result.textContent='Escribe cuánto efectivo entregó el cliente.';apply.disabled=true;}
  else if(amount<q.total){result.textContent='Faltan '+money(q.total-amount)+'.';apply.disabled=true;}
  else{result.textContent='Cambio a entregar: '+money(amount-q.total);apply.disabled=false;}
  apply.textContent='Marcar PAGADO (efectivo)';
 }else if(method==='transfer'){
  result.textContent='Verifica en tu cuenta que recibiste la transferencia antes de marcar PAGADO.';
  apply.textContent='Confirmar transferencia recibida';
 }else{
  result.textContent='Este método marcará el ticket POR COBRAR. No registra un abono ni una deuda en SIFO.';
  apply.textContent='Marcar POR COBRAR';
 }
 renderFavorites();
}
function applyPayment(){
 let q;try{q=quote()}catch(e){announce(e.message,true);return}
 if(!q.count){announce('Agrega productos antes de cambiar el estado del ticket.',true);return}
 const state=$('nv-ticket-status');if(!state){announce('No se encontró el estado original del ticket. No se cambió nada.',true);return}
 const method=view.method.value;
 if(method==='cash'){
  const amount=parseMoney($('nv-ce-v2-cash').value);
  if(amount===null||amount<q.total){announce('Falta efectivo o el monto no es válido. No se cambió el estado.',true);render();return}
 }else if(method==='transfer'){
  if(!window.confirm('¿Ya verificaste que la transferencia llegó a tu cuenta?')){
   announce('Transferencia sin confirmar. El ticket permanece igual.',true);return;
  }
 }
 state.value=method==='credit'?'cobrar':'pagado';
 state.dispatchEvent(new Event('input',{bubbles:true}));
 announce(method==='credit'?'Ticket marcado POR COBRAR.':'Estado del ticket actualizado a PAGADO. Imprime cuando estés listo.',false);
 render();
}
function onFavoritesClick(event){
 const b=event.target.closest('button[data-favorite-save],button[data-favorite-remove],button[data-favorite-add]');
 if(!b)return;
 const id=b.dataset.favoriteSave||b.dataset.favoriteRemove||b.dataset.favoriteAdd;
 const data=mapCatalog().get(id);if(!data){announce('Ese producto ya no está en el catálogo.',true);return}
 if(b.dataset.favoriteSave){
  const old=loadFavorites();if(old.includes(id))return;
  if(old.length>=8){announce('Límite de 8 favoritos. Quita uno para agregar otro.',true);return}
  if(saveFavorites([...old,id])){announce('☆ Favorito guardado: '+data.name,false);renderFavorites()}
  return;
 }
 if(b.dataset.favoriteRemove){
  if(saveFavorites(loadFavorites().filter(x=>x!==id))){announce('Producto quitado de favoritos.',false);renderFavorites()}
  return;
 }
 // No alterar cantidades directamente: reutilizar el mismo puente probado del escáner.
 const fn=window.NAVARRO_ESCANER_AGREGAR;
 if(typeof fn!=='function'){announce('El carrito todavía no está listo para agregar productos.',true);return}
 const result=fn(id);
 if(!result?.ok){announce(result?.reason||'No se agregó. Revisa el carrito.',true);return}
 announce('✓ Agregado mediante el carrito oficial: '+data.name,false);
 render();
}
function resetOnNewSale(){
 const input=$('nv-ce-v2-cash');if(input)input.value='';
 if(view?.method)view.method.value='cash';
 if(root?.open)render();
}
function mount(){
 if(root)return;
 const billing=$('nv-cobro-panel'),print=$('nv-print-ticket-button');
 if(!billing||!print||!print.parentElement)return false;
 const details=document.createElement('details');details.id='nv-ce-v2';
 details.innerHTML=
  '<summary>⚡ Caja Exprés V2 <span class="nv-ce-v2-mini">PRUEBA · tocar para abrir</span></summary>'+
  '<section class="nv-ce-v2-content">'+
   '<p class="nv-ce-v2-warning">Módulo opcional de prueba. No cobra, no imprime, no envía a SIFO ni modifica precios.</p>'+
   '<div class="nv-ce-v2-total"><span>Total actual</span><strong id="nv-ce-v2-total">$0.00</strong></div>'+
   '<p id="nv-ce-v2-split" class="nv-ce-v2-subtotal"></p>'+
   '<label for="nv-ce-v2-method">Forma de pago (solo auxiliar)</label>'+
   '<select id="nv-ce-v2-method"><option value="cash">💵 Efectivo</option><option value="transfer">🏦 Transferencia</option><option value="credit">🧾 Por cobrar</option></select>'+
   '<div id="nv-ce-v2-cash-section">'+
    '<label for="nv-ce-v2-cash">Efectivo entregado</label>'+
    '<input id="nv-ce-v2-cash" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej. 500.00" maxlength="12">'+
    '<div class="nv-ce-v2-quick"><button type="button" data-cash="exact">Exacto</button><button type="button" data-cash="200">200</button><button type="button" data-cash="500">500</button><button type="button" data-cash="1000">1,000</button></div>'+
   '</div>'+
   '<strong id="nv-ce-v2-result" role="status">Escribe el efectivo recibido.</strong>'+
   '<p id="nv-ce-v2-ticket-state" class="nv-ce-v2-state"></p>'+
   '<button type="button" id="nv-ce-v2-apply">Aplicar estado al ticket</button>'+
   '<p class="nv-ce-v2-warning">El ticket existente mostrará PAGADO o POR COBRAR. Aquí no se verifica un pago real ni se registra el método de pago.</p>'+
   '<div class="nv-ce-v2-favorites-title">☆ Productos favoritos</div>'+
   '<p id="nv-ce-v2-favorites-hint" class="nv-ce-v2-subtotal"></p>'+
   '<div id="nv-ce-v2-favorites"></div>'+
   '<p class="nv-ce-v2-subtotal">Guardar artículos que ya están en el carrito:</p>'+
   '<div id="nv-ce-v2-current" class="nv-ce-v2-quick"></div>'+
   '<p id="nv-ce-v2-alert" role="status"></p>'+
  '</section>';
 print.parentElement.insertBefore(details,print);
 root=details;view={method:$('nv-ce-v2-method')};
 const style=document.createElement('style');style.id='nv-ce-v2-styles';
 style.textContent=[
  '#nv-ce-v2{border:1px solid #b8d5c0;border-radius:12px;background:#f3faf4;margin:9px 0 12px;color:#153c29;font-family:system-ui}',
  '#nv-ce-v2>summary{cursor:pointer;padding:14px 12px;font:800 14px system-ui;list-style:revert;min-height:49px;box-sizing:border-box}',
  '#nv-ce-v2 .nv-ce-v2-mini{font-size:10px;font-weight:750;color:#4a7259;margin-left:4px}',
  '.nv-ce-v2-content{padding:0 12px 12px}.nv-ce-v2-warning{font:11px/1.45 system-ui;color:#5d6e61;margin:9px 0}',
  '.nv-ce-v2-total{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #c2dac8;padding:10px 0}',
  '.nv-ce-v2-total span{font-weight:800;font-size:13px}.nv-ce-v2-total strong{font:900 23px system-ui;color:#174b30}',
  '.nv-ce-v2-subtotal{font:12px/1.5 system-ui;color:#597062;margin:6px 0}',
  '#nv-ce-v2 label{display:block;font:800 13px system-ui;margin:13px 0 6px}',
  '#nv-ce-v2 select,#nv-ce-v2 input{width:100%;box-sizing:border-box;padding:11px;border:1px solid #abcbb5;background:white;color:#133e2b;border-radius:9px;font:16px system-ui;min-height:46px}',
  '#nv-ce-v2 .nv-ce-v2-quick{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0}',
  '#nv-ce-v2 button{min-height:42px;border:1px solid #b2cbb8;border-radius:9px;padding:8px 10px;background:#e8f5ea;color:#1c5235;font:800 12px system-ui;cursor:pointer}',
  '#nv-ce-v2 button:disabled{opacity:.45;cursor:not-allowed}',
  '#nv-ce-v2-result{display:block;padding:10px 0;font:900 15px system-ui;color:#1d6641}',
  '#nv-ce-v2 .nv-ce-v2-state{font:12px system-ui;color:#587462;margin:4px 0 8px}',
  '#nv-ce-v2-apply{width:100%;background:#196640!important;color:white!important;min-height:48px!important;font-size:14px!important}',
  '.nv-ce-v2-favorites-title{font:900 14px system-ui;border-top:1px solid #c5dcca;margin-top:13px;padding-top:12px}',
  '.nv-ce-v2-fav-row{display:flex;align-items:center;gap:6px;border-bottom:1px solid #d1e2d5;padding:5px 0}',
  '.nv-ce-v2-fav-row span{font:12px system-ui;flex:1;min-width:0;overflow-wrap:anywhere}',
  '.nv-ce-v2-fav-row button{flex-shrink:0}.nv-ce-v2-fav-row button:last-child{background:#fff4f3!important;color:#a32b2b!important}',
  '#nv-ce-v2 .nv-ce-v2-fav-chip{white-space:normal;text-align:left;min-height:39px}',
  '#nv-ce-v2-alert{font:800 12px/1.4 system-ui;margin:6px 0;color:#205939}'
 ].join('');
 document.head.appendChild(style);
 details.addEventListener('toggle',render);
 view.method.addEventListener('change',render);
 $('nv-ce-v2-cash').addEventListener('input',render);
 $('nv-ce-v2-apply').addEventListener('click',applyPayment);
 details.addEventListener('click',event=>{
  const b=event.target.closest('button[data-cash]');
  if(b){
   const amount=b.dataset.cash==='exact'?(()=>{try{return quote().total}catch(_){return 0}})():Number(b.dataset.cash)*100;
   $('nv-ce-v2-cash').value=(amount/100).toFixed(2);
   render();
  }else if(event.target.closest('button[data-favorite-save],button[data-favorite-remove],button[data-favorite-add]')){
   onFavoritesClick(event);
  }
 });
 const cart=$('cart-items');
 if(cart)new MutationObserver(()=>{if(root.open)render()}).observe(cart,{childList:true,subtree:false});
 document.addEventListener('change',e=>{if(root.open&&e.target?.id?.startsWith('nv-cobro-'))render()},true);
 document.addEventListener('input',e=>{if(root.open&&e.target?.id?.startsWith('nv-cobro-'))render()},true);
 document.addEventListener('click',e=>{
  if(e.target?.closest?.('#clear-cart')){
   setTimeout(resetOnNewSale,60);
  }
 },true);
 window.addEventListener('storage',e=>{if(root.open&&(!e.key||[CART,CLAVOS,IMPORTES,PRECIOS,FAVORITOS].includes(e.key)))render()});
 return true;
}
function init(){
 if(mount())return;
 let attempts=0;
 const timer=setInterval(()=>{if(mount()||++attempts>=20)clearInterval(timer)},350);
}
window.NAVARRO_CAJA_EXPRES_V2=Object.freeze({version:2,modo:'pruebas',calcular:quote,calcularDinero:parseMoney});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();