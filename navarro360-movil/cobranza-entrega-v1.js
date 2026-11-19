/* NAVARRO 360 · COBRANZA Y ENTREGA V3 (19-11-2026)
   Flete automatico $50 para entrega bajo $1,000; opcion manual;
   telefono y direccion del cliente por venta. Sin SIFO ni WhatsApp.
*/
(function(){
'use strict';
if(window.NAVARRO_COBRANZA_ENTREGA)return;
const $=id=>document.getElementById(id);
const SALE_KEY='navarro360_cobranza_entrega_v1';
const ADDRESS_KEY='nv70-address';
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n/100);
function getObject(key){try{const o=JSON.parse(localStorage.getItem(key)||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch(_){return {}}}
function getSale(){try{const s=JSON.parse(sessionStorage.getItem(SALE_KEY)||'{}');return s&&typeof s==='object'&&!Array.isArray(s)?s:{}}catch(_){return {}}}
function saveSale(p){try{sessionStorage.setItem(SALE_KEY,JSON.stringify(p))}catch(_){}}
function saveAddress(address){
 try{sessionStorage.setItem(ADDRESS_KEY,address)}catch(_){}
 const old=$('nv70-address');
 if(old&&old.value!==address){old.value=address;old.dispatchEvent(new Event('input',{bubbles:true}))}
}
let cachedCatalog=null,cachedMap=null;
function pricesMap(){
 const raw=window.NAVARRO_DB;
 if(raw===cachedCatalog&&cachedMap)return cachedMap;
 cachedCatalog=raw;
 cachedMap=new Map((Array.isArray(raw)?raw:[]).filter(Array.isArray).map(p=>[String(p[0]),Number(p[2])]));
 if(!cachedMap.has('00000'))cachedMap.set('00000',20);
 return cachedMap;
}
function quote(){
 const cart=getObject('navarro_cart_v1'),clavos=getObject('navarro_clavos_importe_v1');
 const amounts=getObject('navarro_importes_cents_v1'),prices=getObject('navarro360_precio_caja_activa_v1');
 const map=pricesMap();
 let subtotal=0,subtotalProductos=0,valid=true,hasFreight=false,hasItems=false;
 for(const [id,q] of Object.entries(cart)){
  const qty=Number(q),base=map.get(id);hasItems=true;
  if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(base)||base<=0){valid=false;continue}
  const c=Number(clavos[id]),v=Number(amounts[id]),override=Number(prices[id]);
  const special=Number.isSafeInteger(c)&&c>0?c:(Number.isSafeInteger(v)&&v>0?v:0);
  const unit=Number.isSafeInteger(override)&&override>0?override:Math.round(base*100);
  const itemTotal=special||Math.round(qty*unit);
  if(!Number.isSafeInteger(itemTotal)||itemTotal<=0){valid=false;continue}
  subtotal+=itemTotal;
  if(id==='7777000010')hasFreight=true;
  else subtotalProductos+=itemTotal;
 }
 return {subtotal,subtotalProductos,valid,hasFreight,hasItems};
}
let mounted=false;
let manualOverride=null,removingFreight=false;
function ensureFreeShipping(q){
 // Pedidos de $1,000 o más: retirar también el artículo FLETE si alguien
 // lo agregó al carrito. Reutilizamos el puente oficial sin tocar precios.
 if(!q.valid||q.subtotalProductos<100000||!q.hasFreight||removingFreight)return q;
 const cart=getObject('navarro_cart_v1');
 const bridge=window.NAVARRO_CARRITO_EN_VIVO_V66;
 if(!Object.hasOwn(cart,'7777000010')||typeof bridge?.replace!=='function')return q;
 const next={...cart};delete next['7777000010'];
 removingFreight=true;
 try{
  const result=bridge.replace(next);
  if(result?.ok&&!Object.hasOwn(getObject('navarro_cart_v1'),'7777000010'))return quote();
 }catch(_){}
 finally{removingFreight=false}
 return q;
}
function saveSettings(){
 const s={delivery:!!$('nv-cobro-domicilio')?.checked,phone:String($('nv-cobro-phone')?.value||'').slice(0,30),
   override:manualOverride,address:String($('nv-cobro-address')?.value||'').trim().slice(0,260)};
 saveSale(s);
}
function update(){
 const address=$('nv-cobro-address'),delivery=$('nv-cobro-domicilio'),phone=$('nv-cobro-phone');
 const fee=$('nv-cobro-flete'),msg=$('nv-cobro-flete-info'),total=$('nv-cobro-total');
 if(!fee||!address||!delivery||!total)return;
 const q=ensureFreeShipping(quote()),needsDelivery=delivery.checked||!!address.value.trim();
 const free=q.valid&&q.subtotalProductos>=100000;
 // El envío gratis siempre prevalece sobre un flete activado manualmente.
 if(free)manualOverride=null;
 const auto=needsDelivery&&!free;
 if(free){
  fee.checked=false;fee.disabled=true;
  if(msg)msg.textContent=q.hasFreight?
   'Envío gratis desde $1,000. Retira FLETE del carrito antes de imprimir.':
   '✓ Envío gratis: los productos suman $1,000 o más. Flete eliminado automáticamente.';
 }else if(q.hasFreight){
  fee.checked=false;fee.disabled=true;
  if(msg)msg.textContent='El flete ya está como producto en el carrito. No se cobra dos veces.';
 }else{
  fee.disabled=false;
  fee.checked=manualOverride==='cobrar'?true:manualOverride==='gratis'?false:auto;
  if(msg)msg.textContent=manualOverride==='cobrar'?'Flete activado manualmente.':
   manualOverride==='gratis'?'✓ Flete eliminado por cortesía. Puedes volver a activarlo.':
   auto?'Flete automático de $50. Puedes desactivarlo por cortesía.':
   'Sin domicilio: flete opcional.';
 }
 const amount=free||q.hasFreight?0:(fee.checked?5000:0);
 if(!q.valid){total.textContent='Revisa los precios del carrito antes de cobrar.'}
 else if(free&&q.hasFreight)total.textContent='Hay un flete existente en el carrito. Quítalo para aplicar el envío gratis.';
 else total.textContent='Productos: '+money(q.subtotal)+' · Flete adicional: '+money(amount)+' · TOTAL: '+money(q.subtotal+amount);
 const preview=$('nv-cobro-phone-preview');
 if(preview){
  const value=String(phone?.value||'').trim();
  preview.textContent=value?'Saldrá en ticket: Tel. cliente: '+value:'El teléfono aparecerá en el ticket cuando lo escribas.';
  preview.style.color=value&& !/^[+()\d\s.\-]{5,30}$/.test(value)?'#a42b2b':'#526857';
 }
 saveSettings();
}
function snapshot(){
 update();
 const q=quote();
 if(!q.valid)throw Error('Hay productos con precios incorrectos. Revisa el carrito.');
 if(q.subtotalProductos>=100000&&q.hasFreight)
  throw Error('El envío es gratis a partir de $1,000. Quita el producto FLETE antes de imprimir.');
 const address=String($('nv-cobro-address')?.value||$('nv70-address')?.value||'').trim().slice(0,260);
 const phone=String($('nv-cobro-phone')?.value||'').trim().slice(0,30);
 if(phone&&!/^[+()\d\s.\-]{5,30}$/.test(phone))
  throw Error('Escribe un teléfono válido para incluirlo en el ticket (5 a 30 caracteres).');
 const flete=q.subtotalProductos>=100000||q.hasFreight?0:($('nv-cobro-flete')?.checked?5000:0);
 return {address,phone,flete,delivery:!!$('nv-cobro-domicilio')?.checked||!!address,subTotalSinFlete:q.subtotalProductos,hasFreight:q.hasFreight};
}
function exportState(){
 saveSettings();
 const s=getSale();
 return {delivery:!!s.delivery,address:String(s.address||'').slice(0,260),
   phone:String(s.phone||'').slice(0,30),
   override:['cobrar','gratis'].includes(s.override)?s.override:null};
}
function restoreState(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const a=$('nv-cobro-address'),p=$('nv-cobro-phone'),d=$('nv-cobro-domicilio');
 if(!a||!p||!d)return false;
 a.value=String(data.address||'').slice(0,260);
 p.value=String(data.phone||'').slice(0,30);
 d.checked=!!data.delivery||!!a.value.trim();
 manualOverride=['cobrar','gratis'].includes(data.override)?data.override:null;
 saveAddress(a.value);
 update();
 return true;
}
function reset(){
 manualOverride=null;
 const ids=['nv-cobro-address','nv-cobro-phone'];
 for(const id of ids){const el=$(id);if(el)el.value=''}
 const d=$('nv-cobro-domicilio');if(d)d.checked=false;
 const f=$('nv-cobro-flete');if(f){f.checked=false;f.disabled=false}
 const old=$('nv70-address');if(old)old.value='';
 try{sessionStorage.removeItem(SALE_KEY);sessionStorage.removeItem(ADDRESS_KEY)}catch(_){}
 update();
}
function mount(){
 if(mounted)return;
 const bottom=$('send-whatsapp')?.parentElement,print=$('nv-print-ticket-button');
 if(!bottom||!print)return;
 mounted=true;
 const last=getSale(),addressFromSession=(()=>{try{return sessionStorage.getItem(ADDRESS_KEY)||''}catch(_){return ''}})();
 const section=document.createElement('section');section.id='nv-cobro-panel';
 section.setAttribute('aria-label','Datos de cobro, entrega y teléfono');
 section.innerHTML=
  '<div class="nv-cobro-title">🚚 Entrega y datos del cliente</div>'+
  '<label class="nv-cobro-check"><input type="checkbox" id="nv-cobro-domicilio"> Entrega a domicilio</label>'+
  '<label class="nv-cobro-label" for="nv-cobro-address">Dirección de entrega</label>'+
  '<textarea id="nv-cobro-address" rows="2" maxlength="260" placeholder="Calle, número, colonia y referencias"></textarea>'+
  '<label class="nv-cobro-label" for="nv-cobro-phone">Teléfono del cliente (opcional)</label>'+
  '<input id="nv-cobro-phone" type="tel" inputmode="tel" autocomplete="off" maxlength="30" placeholder="Ej. 33 1234 5678">'+
  '<p id="nv-cobro-phone-preview" role="status" aria-live="polite" style="font:12px/1.4 system-ui;margin:5px 0">El teléfono aparecerá en el ticket cuando lo escribas.</p>'+
  '<label class="nv-cobro-check nv-cobro-shipping"><input type="checkbox" id="nv-cobro-flete"> Cobrar flete de $50</label>'+
  '<p id="nv-cobro-flete-info"></p>'+
  '<strong id="nv-cobro-total" role="status"></strong>';
 bottom.insertBefore(section,print);
 const style=document.createElement('style');style.id='nv-cobro-style';
 style.textContent=
  '#nv-cobro-panel{background:#f1f7f2;border:1px solid #b5d2bd;border-radius:13px;padding:12px;margin:12px 0;color:#193b2a;box-sizing:border-box;font-family:system-ui}'+
  '#nv-cobro-panel .nv-cobro-title{font-size:15px;font-weight:900;margin-bottom:9px}'+
  '#nv-cobro-panel .nv-cobro-label{display:block;font-size:12px;font-weight:800;margin:10px 0 5px}'+
  '#nv-cobro-panel input[type=tel],#nv-cobro-panel textarea{display:block;width:100%;box-sizing:border-box;border:1px solid #b8cabc;border-radius:9px;padding:10px;font:16px system-ui;background:white;color:#152f24}'+
  '#nv-cobro-panel .nv-cobro-check{display:flex;gap:9px;align-items:center;font-size:13px;font-weight:850;margin:7px 0}'+
  '#nv-cobro-panel input[type=checkbox]{height:21px;width:21px;flex:0 0 21px;accent-color:#186c41}'+
  '#nv-cobro-panel .nv-cobro-shipping{border-top:1px solid #c5d8c9;margin-top:12px;padding-top:10px}'+
  '#nv-cobro-flete-info{font:12px/1.4 system-ui;margin:3px 0 8px;color:#526857}'+
  '#nv-cobro-total{display:block;padding:9px 0;border-top:1px dashed #9fb7a6;font:800 12px/1.5 system-ui}'+
  '#nv70-delivery .nv70-address{display:none!important}';
 document.head.appendChild(style);
 $('nv-cobro-address').value=String(last.address||addressFromSession).slice(0,260);
 $('nv-cobro-phone').value=String(last.phone||'').slice(0,30);
 $('nv-cobro-domicilio').checked=!!last.delivery||!!$('nv-cobro-address').value.trim();
 manualOverride=last.override==='cobrar'||last.override==='gratis'?last.override:null;
 $('nv-cobro-address').addEventListener('input',()=>{
  if($('nv-cobro-address').value.trim())$('nv-cobro-domicilio').checked=true;
  saveAddress($('nv-cobro-address').value.slice(0,260));update();
 });
 $('nv-cobro-phone').addEventListener('input',update);
 $('nv-cobro-domicilio').addEventListener('change',()=>{
  if(!$('nv-cobro-domicilio').checked){$('nv-cobro-address').value='';saveAddress('')}
  manualOverride=null;update();
 });
 $('nv-cobro-flete').addEventListener('change',()=>{manualOverride=$('nv-cobro-flete').checked?'cobrar':'gratis';update()});
 document.addEventListener('input',e=>{
  if(e.target?.id==='nv70-address'&&e.target.value!==$('nv-cobro-address').value){
   $('nv-cobro-address').value=String(e.target.value||'').slice(0,260);
   if(e.target.value.trim())$('nv-cobro-domicilio').checked=true;
   update();
  }
 },true);
 const cart=$('cart-items');
 if(cart)new MutationObserver(update).observe(cart,{childList:true,subtree:true,characterData:true});
 window.addEventListener('storage',e=>{if(!e.key||e.key==='navarro_cart_v1'||e.key.includes('precio')||e.key.includes('importe'))update()});
 update();
}
window.NAVARRO_COBRANZA_ENTREGA=Object.freeze({version:3,snapshot,exportState,restoreState,reset,update});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();