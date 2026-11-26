/* NAVARRO 360 — CAJA EXPRÉS V3 · COMPLEMENTO OPCIONAL DEL CARRITO
 * No intercepta imprimir/WhatsApp/SIFO ni cobra tarjetas ni modifica precios.
 * Para añadir favoritos reutiliza el escáner oficial.
 */
(function(){
'use strict';
if(window.NAVARRO_CAJA_EXPRES_V3)return;
const $=id=>document.getElementById(id);
const CART='navarro_cart_v1', CLAVOS='navarro_clavos_importe_v1';
const IMPORTES='navarro_importes_cents_v1', PRECIOS='navarro360_precio_caja_activa_v1';
const FAVORITOS='navarro360_favoritos_caja_v2';
const pesos=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const money=cents=>pesos.format(cents/100);
let catalogRef=null,catalog=null,root=null,view=null,noticeTimer=null;
let paymentConfirmation=null,cashAuto=true;
// Solo clasificar el método confirmado para la venta actual.
function fingerprint(){
 const keys=[CART,CLAVOS,IMPORTES,PRECIOS];
 const stored=keys.map(k=>{try{return localStorage.getItem(k)||''}catch(_){return ''}});
 const billing=window.NAVARRO_COBRANZA_ENTREGA?.snapshot?.();
 const q=quote();
 return JSON.stringify({stored,total:q.total,fee:q.flete,
  address:String(billing?.address||''),phone:String(billing?.phone||''),
  client:String($('nv-ticket-client')?.value||'').trim(),
  state:String($('nv-ticket-status')?.value||'none')});
}
function esInvitado(){return window.NAVARRO_PRINT_SILENCIOSA?.vinculado?.()!==true}
function notaPedido(){
 if(!esInvitado()||!paymentConfirmation)return '';
 try{if(paymentConfirmation.tag!==fingerprint())return ''}catch{return ''}
 return {card:'IMPORTANTE: llevar terminal para el cobro.',transfer:'Transferencia pendiente de verificar.',cash:'Cobrar en efectivo al entregar.'}[paymentConfirmation.requested]||'';
}
function clearPayment(){paymentConfirmation=null;cashAuto=true;window.NAVARRO_CLIENTES_V299?.clear?.();if(view?.method)view.method.value='cash';const cash=$('nv-ce-v2-cash');if(cash)cash.value='';}
function confirmedMethodForTicket(job){
 if(!paymentConfirmation||!job)return null;
 try{
  const method=paymentConfirmation.method;
  const validStatus=method==='credit'?job.state==='cobrar':job.state==='pagado';
  if(!validStatus||paymentConfirmation.tag!==fingerprint()||
     Number(job.subtotal)+Number(job.flete)!==quote().total)return null;
  return method;
 }catch(_){return null}
}
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
 // La gratuidad puede retirar el producto FLETE. Primero aplicar la regla,
 // despues tomar el carrito actual para calcular cambio exacto.
 const billing=window.NAVARRO_COBRANZA_ENTREGA;
 if(typeof billing?.snapshot!=='function')throw Error('Abre el carrito y revisa el recuadro de domicilio.');
 let delivery,fee;try{delivery=billing.snapshot();fee=Number(delivery.flete)}catch(_){throw Error('Revisa los datos del domicilio o el flete.')}
 if(!Number.isSafeInteger(fee)||![0,5000].includes(fee))throw Error('Flete incorrecto. Revisa tu venta.');
 const entries=Object.entries(read(CART)),db=mapCatalog();
 const cl=read(CLAVOS),im=read(IMPORTES),ov=read(PRECIOS);
 if(!entries.length)return {subtotal:0,flete:0,total:0,count:0};
 if(entries.length>100)throw Error('Revisa el carrito: tiene más de 100 productos.');
 const rows=[];
 let subtotal=0,hasFreight=false;
 for(const [id,value] of entries){
  const qty=Number(value),p=db.get(id)||window.NAVARRO_NUEVOS_PRODUCTOS_V23?.get?.(id)||(id==='00000'?{price:20,name:'PRODUCTOS VARIOS'}:null);
  if(!/^\d{5,30}$/.test(id)||!Number.isFinite(qty)||qty<=0||qty>9999||
     !p||!Number.isFinite(p.price)||p.price<=0)throw Error('Revisa el producto '+id+' y su cantidad.');
  const a=Number(cl[id]),b=Number(im[id]),c=Number(ov[id]);
  const special=Number.isSafeInteger(a)&&a>0?a:Number.isSafeInteger(b)&&b>0?b:0;
  const unit=Number.isSafeInteger(c)&&c>0?c:Math.round(p.price*100);
  const cost=special||Math.round(qty*unit);
  if(!Number.isSafeInteger(cost)||cost<=0)throw Error('Importe no válido del producto '+id);
  rows.push({id,name:p.name,qty:id==='00000'?1:qty,unit:id==='00000'?cost:unit,cost});
  subtotal+=cost;
  if(id==='7777000010')hasFreight=true;
 }
 if(hasFreight)fee=0;
 const total=subtotal+fee;
 if(!Number.isSafeInteger(total)||total<=0)throw Error('Total de venta no válido.');
 return {subtotal,flete:fee,total,count:entries.length,rows,delivery};
}
function enviarDomicilio(method){return ['cash','card','transfer','credit'].includes(method) && $('nv-cobro-domicilio')?.checked}
function textoPedido(q,method='transfer'){
 const lines=['🏗️ *FERREMATERIALES NAVARRO*',q.delivery.delivery?'🚚 *PEDIDO A DOMICILIO*':'🛒 *PEDIDO*','','🛒 *TABLA DE PRODUCTOS*','```'+'PRODUCTO'.padEnd(21)+'CANT'.padStart(6)+'IMPORTE'.padStart(12),'-'.repeat(39)];
 for(const row of q.rows){
  const words=String(row.name).replace(/`/g,"'").trim().split(/\s+/);
  const parts=[''];
  for(const word of words){
   for(const chunk of word.match(/.{1,20}/gu)||[]){
    const last=parts.length-1;
    const next=(parts[last]+' '+chunk).trim();
    if(next.length<=20)parts[last]=next;else parts.push(chunk);
   }
  }
  lines.push(parts[0].padEnd(21)+String(row.qty).padStart(6)+money(row.cost).padStart(12),...parts.slice(1));
 }
 lines[lines.length-1]+='```';
 lines.push('','💰 *Subtotal de productos: '+money(q.subtotal)+'*');
 if(q.delivery.delivery||q.flete)lines.push('🚚 *Flete: '+(q.flete?money(q.flete):q.rows.some(r=>r.id==='7777000010')?'Incluido en productos':'GRATIS')+'*');
 lines.push('💵 *TOTAL: '+money(q.total)+'*');
 if(q.delivery.delivery){
  lines.push('','📍 *DATOS DE ENTREGA*');
  if(q.delivery.address)lines.push('🏠 Dirección: '+q.delivery.address);
  if(q.delivery.phone)lines.push('📱 Teléfono: '+q.delivery.phone);
 }
 const cash=method==='cash',card=method==='card';
 const paid=!esInvitado()&&method!=='credit';
 lines.push('',cash?'💵 *Método de pago: EFECTIVO*':card?'💳 *Método de pago: TARJETA*':method==='credit'?'Método de pago: POR DEFINIR':'💳 *Método de pago: TRANSFERENCIA*',paid?'✅ *ESTADO: PAGADO*':'⏳ *ESTADO: POR COBRAR*',paid?'🚚 *ENTREGAR SIN COBRAR*':cash?'🚚 *COBRAR AL ENTREGAR*':card?'🚚 *IMPORTANTE: LLEVAR TERMINAL PARA COBRAR AL ENTREGAR*':method==='credit'?'Cobro pendiente.':'Depósito por verificar.');
 return lines.join('\n');
}
function parseMoney(v){
 const s=String(v||'').trim().replace(/^\$\s*/,'').replace(/\s/g,'');
 if(!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(s))return null;
 const [whole,dec='']=s.replace(',','.').split('.');
 const num=Number(whole)*100+Number((dec+'00').slice(0,2));
 return Number.isSafeInteger(num)&&num<=999999999?num:null;
}

function resolvePayment(method,guest,total,raw){
 if(!['cash','card','transfer','credit'].includes(method))method='cash';
 if(!Number.isSafeInteger(total)||total<=0)throw Error('Agrega productos antes de finalizar.');
 let received=null,change=null;
 if(!guest&&method==='cash'){
  received=String(raw??'').trim()===''?total:parseMoney(raw);
  if(received===null)throw Error('Revisa el efectivo recibido.');
  if(received<total)throw Error('El efectivo recibido es menor al total de la venta.');
  change=received-total;
 }
 return {method:guest?'credit':method,requested:method,state:guest||method==='credit'?'cobrar':'pagado',received,change};
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
 if(!root||!view||root.hidden)return;
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
 if(!esInvitado()&&method==='cash'&&cashAuto)cash.value=q.count?(q.total/100).toFixed(2):'';
 const amount=parseMoney(cash.value);
 const result=$('nv-ce-v2-result'),apply=$('nv-ce-v2-apply');
 const guest=esInvitado();
 window.NAVARRO_CLIENTES_V299?.renderCheckout?.(method);
 const enviarPorWhatsApp=enviarDomicilio(method);
 $('nv-aviso-enviar').hidden=!enviarPorWhatsApp;
 apply.hidden=!enviarPorWhatsApp&&!guest;
 apply.textContent=enviarPorWhatsApp?'Confirmar pedido y abrir WhatsApp':'Continuar';
 const current=guest||method==='credit'?'cobrar':'pagado';
 $('nv-ce-v2-ticket-state').textContent=current==='pagado'?'Al finalizar: PAGADO':current==='cobrar'?'Al finalizar: POR COBRAR':'Estado actual del ticket: sin especificar';
 $('nv-ce-v2-cash-section').hidden=guest||method!=='cash';
 $('nv-guest-transfer').hidden=method!=='transfer';
 $('nv-transfer-instructions').hidden=!guest;
 $('nv-proof-link').hidden=enviarPorWhatsApp;
 $('nv-share-order').hidden=enviarPorWhatsApp;
 if(guest && method==='transfer' && q.count){
  const message=encodeURIComponent(textoPedido(q));
  $('nv-proof-link').href='https://wa.me/525639129040?text='+message;
  $('nv-share-order').href='https://wa.me/?text='+message;
 }
 apply.disabled=!q.count || (!guest && method==='cash' && cash.value.trim()!=='' && (amount===null || amount<q.total));
 result.textContent=guest&&method==='card'?'IMPORTANTE: llevar terminal para el cobro.':guest&&method==='cash'?'Pago en efectivo al recibir.':'';
 if(!guest && method==='cash' && cash.value.trim()!==''){
  result.textContent=amount===null?'Revisa el importe.':amount<q.total?'Faltan '+money(q.total-amount):'Cambio: '+money(amount-q.total);
 }
}

function prepareFinalPayment(){
 if(!root||!view)throw Error('La forma de pago todavía no está lista. Recarga NAVARRO 360.');
 const q=quote(),state=$('nv-ticket-status'),cash=$('nv-ce-v2-cash');
 if(!state)throw Error('No se encontró el estado del ticket.');
 const method=view.method.value||'cash';
 const result=resolvePayment(method,esInvitado(),q.total,cashAuto?'':cash.value);
 window.NAVARRO_CLIENTES_V299?.bindCheckout?.(method);
 if(result.received!==null)cash.value=(result.received/100).toFixed(2);
 state.value=result.state;
 state.dispatchEvent(new Event('input',{bubbles:true}));
 paymentConfirmation={method:result.method,requested:result.requested,tag:fingerprint(),received:result.received,change:result.change};
 return result;
}
function applyPayment(){
 try{
  const result=prepareFinalPayment();
  announce(result.state==='cobrar'?'Ticket marcado POR COBRAR.':'Pago seleccionado. Finaliza cuando estés listo.',false);
  return true;
 }catch(e){announce(e.message,true);return false}
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
 clearPayment();
 const input=$('nv-ce-v2-cash');if(input)input.value='';
 if(view?.method)view.method.value='cash';
 if(root)render();
}
function mount(){
 if(root)return;
 const billing=$('nv-cobro-panel'),print=$('nv-print-ticket-button');
 if(!billing||!print||!print.parentElement)return false;
 const details=document.createElement('section');details.id='nv-ce-v2';details.hidden=true;details.setAttribute('aria-labelledby','nv-payment-title');
 details.innerHTML=
  '<h2 id="nv-payment-title">Forma de pago</h2>'+
  '<section class="nv-ce-v2-content">'+

   '<div class="nv-ce-v2-total"><span>Total actual</span><strong id="nv-ce-v2-total">$0.00</strong></div>'+
   '<p id="nv-ce-v2-split" class="nv-ce-v2-subtotal"></p>'+
   '<label for="nv-ce-v2-method">Método</label>'+
   '<select id="nv-ce-v2-method"><option value="cash">💵 Efectivo</option><option value="transfer">🏦 Transferencia</option><option value="card">💳 Tarjeta de débito o crédito</option><option value="credit">🧾 Por cobrar</option></select>'+
   '<div id="nv-guest-transfer" hidden><dl><dt>Banco</dt><dd>Banamex</dd><dt>CLABE interbancaria</dt><dd><input readonly aria-label="CLABE interbancaria" value="002320701431657931"></dd><dt>Nombre del beneficiario</dt><dd>Diana Navarro</dd></dl><div id="nv-transfer-instructions" hidden><p>Cuando termines la transferencia, toca el botón y adjunta tu comprobante en el chat de Ferremateriales Navarro.</p><p><a id="nv-proof-link" target="_blank" rel="noopener noreferrer">Enviar pedido y comprobante por WhatsApp</a></p><p><a id="nv-share-order" target="_blank" rel="noopener noreferrer">Compartir pedido en otro chat</a></p><p>Tu pedido queda por cobrar hasta que confirmemos el depósito.</p></div></div>'+
   '<div id="nv-ce-v2-cash-section">'+
    '<label for="nv-ce-v2-cash">Efectivo recibido (exacto por defecto)</label>'+
    '<input id="nv-ce-v2-cash" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej. 500.00" maxlength="12">'+
    '<div class="nv-ce-v2-quick"><button type="button" data-cash="exact">Exacto</button><button type="button" data-cash="200">200</button><button type="button" data-cash="500">500</button><button type="button" data-cash="1000">1,000</button></div>'+
   '</div>'+
   '<strong id="nv-ce-v2-result" role="status">Escribe el efectivo recibido.</strong>'+
   '<p id="nv-ce-v2-ticket-state" class="nv-ce-v2-state"></p>'+
   '<p id="nv-aviso-enviar" hidden>Envía el ticket por WhatsApp para avisar al negocio y que prepare tu pedido. Si eres de caja, elige el grupo Pedidos.</p>'+
   '<button type="button" id="nv-ce-v2-apply">Continuar</button>'+

   '<p id="nv-ce-v2-alert" role="status"></p>'+
  '</section>';
 const first=$('nv-credit-ref-label')||$('nv-no-print')||print;
 print.parentElement.insertBefore(details,first.parentElement===print.parentElement?first:print);
 root=details;view={method:$('nv-ce-v2-method')};
 const style=document.createElement('style');style.id='nv-ce-v2-styles';
 style.textContent=[
  '#nv-confirmar-carrito{display:none!important}#nv-ce-v2[hidden],#nv-ce-v2 [hidden]{display:none!important}',
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
  ,'#nv-ce-v2{position:static;width:100%;box-sizing:border-box;padding:10px 0;overflow:visible}#nv-payment-title{font-size:17px;margin:2px 12px}'
  ,'#nv-proof-link{display:block;text-align:center;padding:12px;border-radius:9px;background:#205b3b;color:white;font-weight:750;text-decoration:none}#nv-guest-transfer dl{margin:12px 0;padding:14px;border:1px solid #b8d5c0;border-radius:10px;background:white}#nv-guest-transfer dt{font-size:13px;font-weight:700;color:#526857}#nv-guest-transfer dd{margin:2px 0 12px;font-weight:750}#nv-guest-transfer dd:last-child{margin-bottom:0}'
 ].join('');
 document.head.appendChild(style);
 view.method.addEventListener('change',()=>{paymentConfirmation=null;if(view.method.value!=='credit')window.NAVARRO_CLIENTES_V299?.clear?.();render()});
 const cashInput=$('nv-ce-v2-cash');
 const continueButton=$('nv-ce-v2-apply');
 details.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||event.isComposing)return;
  if(event.repeat){event.preventDefault();return}
  if(event.target===view.method && !esInvitado() && view.method.value==='cash'){
   event.preventDefault();cashInput.focus();cashInput.select();
  }else if(event.target===cashInput){
   event.preventDefault();render();
   const next=!continueButton.hidden&&!continueButton.disabled?continueButton:[$('nv-no-print'),$('nv-print-ticket-button')].find(b=>b&&!b.disabled&&b.getClientRects().length);next?.focus();
  }else if(event.target===continueButton && !continueButton.disabled){
   event.preventDefault();continueButton.click();
  }
 });
 $('nv-ce-v2-cash').addEventListener('input',()=>{cashAuto=!cashInput.value.trim();paymentConfirmation=null;if(!cashAuto)render();else $('nv-ce-v2-result').textContent='Se tomará el importe exacto.';});
 cashInput.addEventListener('blur',()=>{if(!cashInput.value.trim()){cashAuto=true;render()}});
 let submitting=false;
 continueButton.addEventListener('click',async()=>{
  if(submitting)return;
  render();
  if(continueButton.disabled)return;
  try{window.NAVARRO_CLIENTES_V299?.bindCheckout?.(view.method.value)}catch(e){announce(e.message,true);return;}
  if(enviarDomicilio(view.method.value)){
   const message=textoPedido(quote(),view.method.value);
   submitting=true;continueButton.disabled=true;details.inert=true;
   try{
    const resultado=await window.NAVARRO_CONFIRMAR_PEDIDO(view.method.value);
    // La sección permanece en el carrito; se oculta al quedar vacío.
    const invitado=esInvitado();
    const folio=resultado.folio||resultado;
    const estado=resultado.pendiente?'Ticket guardado en este dispositivo. Pendiente de sincronizar con el panel.':'Ticket recibido por el panel.';
    window.alert(estado+' '+(invitado?'Envía el ticket al WhatsApp del negocio.':'Elige el grupo Pedidos en WhatsApp y toca Enviar.'));
    location.href=(invitado?'https://wa.me/525639129040?text=':'https://wa.me/?text=')+encodeURIComponent(message+'\nFolio: '+folio);
   }catch(error){announce(error.message||'No se pudo confirmar la recepción del pedido.',true)}
   finally{submitting=false;details.inert=false;render()}
   return;
  }
  if(!applyPayment())return;
  const finalAction=[$('nv-no-print'),$('nv-print-ticket-button')].find(button=>button&&!button.disabled&&button.getClientRects().length);
  finalAction?.focus();
 });
 details.addEventListener('click',event=>{
  const b=event.target.closest('button[data-cash]');
  if(b){
   const amount=b.dataset.cash==='exact'?(()=>{try{return quote().total}catch(_){return 0}})():Number(b.dataset.cash)*100;
   cashAuto=b.dataset.cash==='exact';paymentConfirmation=null;
   $('nv-ce-v2-cash').value=(amount/100).toFixed(2);
   render();
  }else if(event.target.closest('button[data-favorite-save],button[data-favorite-remove],button[data-favorite-add]')){
   onFavoritesClick(event);
  }
 });
 const cart=$('cart-items');
 const confirmCart=$('nv-confirmar-carrito');
 const deliveryPanel=$('nv-cobro-panel');
 if(confirmCart && deliveryPanel)deliveryPanel.after(confirmCart);

 if(confirmCart)confirmCart.hidden=true;
 function syncConfirmCart(){
  const has=Object.values(read(CART)).some(qty=>Number(qty)>0);
  details.hidden=!has;
  if(!has){resetOnNewSale();return}
  render();
 }
 syncConfirmCart();
 if(cart)new MutationObserver(()=>{
  syncConfirmCart();
 }).observe(cart,{childList:true,subtree:false});
 document.addEventListener('change',e=>{if(!root.hidden&&e.target?.id?.startsWith('nv-cobro-'))render()},true);
 document.addEventListener('input',e=>{if(!root.hidden&&e.target?.id?.startsWith('nv-cobro-'))render()},true);
 document.addEventListener('click',e=>{
  if(e.target?.closest?.('#clear-cart'))setTimeout(()=>{if(!Object.keys(read(CART)).length){resetOnNewSale();syncConfirmCart()}},60);
 },true);
 window.addEventListener('storage',e=>{if(!e.key||[CART,CLAVOS,IMPORTES,PRECIOS].includes(e.key))syncConfirmCart()});
 window.addEventListener('pageshow',syncConfirmCart);
 let lastSaleSignature='';
 setInterval(()=>{if(details.hidden)return;const now=[...([CART,CLAVOS,IMPORTES,PRECIOS].map(k=>localStorage.getItem(k)||'')),$('nv-cobro-flete')?.checked,$('nv-cobro-domicilio')?.checked,esInvitado()].join('|');if(now!==lastSaleSignature){lastSaleSignature=now;render()}},750);
 return true;
}
function init(){
 if(mount())return;
 let attempts=0;
 const timer=setInterval(()=>{if(mount()||++attempts>=20)clearInterval(timer)},350);
}
window.NAVARRO_CAJA_EXPRES_V3=Object.freeze({version:5,modo:'carrito-visible',prepararFinalizacion:prepareFinalPayment,calcular:quote,calcularDinero:parseMoney,notaPedido,metodoConfirmado:confirmedMethodForTicket,limpiarMetodo:clearPayment});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();