/* NAVARRO 360 — UX integral V70: navegación por material, fotos y entrega.
   Conserva códigos, precios, carrito, WhatsApp y SIFO sin cambios.
*/
(function(){
'use strict';
if(window.NAVARRO_UX_INTEGRAL_V70)return;
window.NAVARRO_UX_INTEGRAL_V70=true;
const $=id=>document.getElementById(id);
const mx=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const chips=[
 ['CPVC','CPVC','#f0bf56'],['PVC','PVC','#dee1e9'],
 ['Hidráulico','HIDRAULICO','#a6d8f5'],['Galvanizado','GALVANIZADO','#b9c5d0'],
 ['Cobre','COBRE','#e9ad88'],['PPR','PPR','#99d6ab'],
 ['Electricidad','CABLE','#f4da78'],['Tornillería','TORNILLO','#d2d9e4'],
 ['Pinturas','PINTURA','#e9c0e6'],['Jardinería','MANGUERA','#aad8a7']
];
let map=null,source=null,deliveryTimer=0,photoPending=false,photoListening=false,cartListening=false;
let selectedMaterial='',selectedDiameter='',selectedType='';
const DIAMETERS=['1/2','3/4','1','1 1/4','1 1/2','2','2 1/2','3','4'];
const TYPES=['CODO','TEE','COPLE','REDUCCION','TUBO','TAPON','CONECTOR','VALVULA'];
const PLUMBING=new Set(['CPVC','PVC','HIDRAULICO','GALVANIZADO','COBRE','PPR']);
function css(){
 if($('nv70-style'))return;
 const s=document.createElement('style');s.id='nv70-style';
 s.textContent=[
 '#nv70-materials{background:#f6f9f7;border:1px solid #d9e8de;border-radius:16px;padding:12px;margin:10px 0 15px}',
 '#nv70-materials h3{font:850 15px system-ui;color:#1a4231;margin:0 0 9px}',
 '.nv70-scroll{display:flex;gap:7px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:2px 0 8px;scrollbar-width:thin}',
 '.nv70-chip{display:flex;align-items:center;gap:7px;white-space:nowrap;min-height:45px;padding:8px 12px;border:1px solid #d2e0d5;background:#fff;border-radius:11px;font:750 12px system-ui;color:#1d4733;flex-shrink:0}',
 '.nv70-dot{width:16px;height:16px;border:1px solid #8f9c9455;border-radius:5px;display:inline-block}',
 '.nv70-facets{border-top:1px solid #dce9df;padding-top:9px;margin-top:6px}.nv70-facets[hidden]{display:none!important}.nv70-facets b{display:block;font:800 12px system-ui;margin:7px 0;color:#335a43}.nv70-facets .nv70-scroll button{min-height:35px;padding:7px 9px;font-size:11px;background:#fff;color:#264d34;border:1px solid #bed5c7;border-radius:9px;flex-shrink:0}.nv70-facets .nv70-scroll button[aria-pressed=true]{background:#207348;color:white;border-color:#207348}',
 '#nv70-delivery{margin:11px 0;background:#fff;border:1px solid #d4e5da;border-radius:15px;padding:13px;color:#1d4733;font:13px/1.45 system-ui}',
 '#nv70-delivery h3{margin:0 0 8px;color:#1b4931;font-size:15px}',
 '.nv70-pair{display:flex;justify-content:space-between;gap:12px;margin:7px 0}',
 '.nv70-pair strong{font-variant-numeric:tabular-nums;text-align:right}',
 '.nv70-track{height:8px;background:#e2eee6;border-radius:8px;overflow:hidden;margin:9px 0}',
 '.nv70-track span{height:100%;background:#259366;display:block}',
 '.nv70-info{font-size:11px;color:#657a6d;line-height:1.55;margin:8px 0 2px}',
 '.nv70-address{margin-top:10px;padding-top:10px;border-top:1px solid #e1ede5}.nv70-address label{display:block;font-size:12px;font-weight:800;margin-bottom:6px}.nv70-address textarea{width:100%;max-width:100%;box-sizing:border-box;border:1px solid #bfcec4;border-radius:9px;padding:9px;font:16px system-ui;resize:vertical;min-height:72px}.nv70-address button{min-height:43px;border:0;border-radius:9px;background:#1b6847;color:#fff;font:800 12px system-ui;padding:10px 12px;margin:7px 0}',
 '.nv70-warning{background:#fff5df;color:#755523;border-radius:9px;padding:8px;font-size:11px;margin:8px 0}',
 '.nv70-steps{display:flex;flex-wrap:wrap;gap:6px;margin:11px 0}',
 '.nv70-steps span{border:1px solid #cadccf;border-radius:8px;background:#f3f8f4;padding:5px;font-size:10px;color:#567361}',
 '.nv70-steps .active{background:#e0f3e7;color:#185f3b;border-color:#a6d4b7;font-weight:800}',
 '@media(max-width:460px){#nv70-materials{margin-inline:5px}#nv70-delivery{padding:11px}}'
 ].join('');
 document.head.appendChild(s);
}
function searchField(){
 const inputs=[$('search-mobile'),$('search')].filter(Boolean);
 return inputs.find(el=>{try{return el.getClientRects().length>0}catch(_){return false}})||inputs[0]||null;
}
function searchMaterial(query){
 const input=searchField();
 if(!input)return;
 input.value=query;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 try{input.scrollIntoView({block:'center',behavior:'smooth'})}catch(_){}
 try{input.focus({preventScroll:true})}catch(_){input.focus()}
}
function facetQuery(){
 return [selectedType,selectedMaterial,selectedDiameter].filter(Boolean).join(' ');
}
function setFacetOptions(){
 const panel=$('nv70-facets');
 if(!panel)return;
 panel.hidden=!PLUMBING.has(selectedMaterial);
 if(panel.hidden)return;
 for(const b of panel.querySelectorAll('button[data-size]'))
  b.setAttribute('aria-pressed',String(b.dataset.size===selectedDiameter));
 for(const b of panel.querySelectorAll('button[data-type]'))
  b.setAttribute('aria-pressed',String(b.dataset.type===selectedType));
}
function nav(){
 if($('nv70-materials'))return true;
 const target=$('filters')||$('products');
 if(!target)return false;
 const box=document.createElement('section');box.id='nv70-materials';
 box.setAttribute('aria-label','Accesos rápidos por material y medida');
 const h=document.createElement('h3');h.textContent='🎨 Encuentra rápido tu material';
 const row=document.createElement('div');row.className='nv70-scroll';
 chips.forEach(([name,query,color])=>{
  const btn=document.createElement('button');btn.type='button';btn.className='nv70-chip';btn.dataset.query=query;
  const dot=document.createElement('span');dot.className='nv70-dot';dot.style.background=color;
  const title=document.createElement('span');title.textContent=name;btn.append(dot,title);row.appendChild(btn);
 });
 const facets=document.createElement('div');facets.id='nv70-facets';facets.className='nv70-facets';facets.hidden=true;
 function rowFor(title,choices,key){
  const caption=document.createElement('b');caption.textContent=title;
  const strip=document.createElement('div');strip.className='nv70-scroll';
  for(const val of choices){
   const button=document.createElement('button');button.type='button';
   button.dataset[key]=val;button.setAttribute('aria-pressed','false');button.textContent=val;
   strip.appendChild(button);
  }
  facets.append(caption,strip);
 }
 rowFor('Filtrar por conexión o artículo',TYPES,'type');
 rowFor('Filtrar por diámetro (pulgadas)',DIAMETERS,'size');
 const clear=document.createElement('button');clear.type='button';clear.textContent='↻ Mostrar todas las medidas';clear.dataset.clear='1';
 facets.appendChild(clear);
 box.append(h,row,facets);target.insertAdjacentElement('beforebegin',box);
 box.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.query){
   selectedMaterial=button.dataset.query;selectedDiameter='';selectedType='';
  }else if(button.dataset.size){
   selectedDiameter=selectedDiameter===button.dataset.size?'':button.dataset.size;
  }else if(button.dataset.type){
   selectedType=selectedType===button.dataset.type?'':button.dataset.type;
  }else if(button.dataset.clear==='1'){
   selectedDiameter='';selectedType='';
  }else return;
  setFacetOptions();
  searchMaterial(facetQuery());
 });
 return true;
}
function products(){
 const data=window.NAVARRO_DB;
 if(!Array.isArray(data))return null;
 if(data!==source){
  map=new Map();source=data;
  for(const row of data){
   if(!Array.isArray(row)||row.length<3)continue;
   const code=String(row[0]),amount=Number(row[2]);
   if(/^\d{5,30}$/.test(code)&&Number.isFinite(amount)&&amount>0)map.set(code,Math.round(amount*100));
  }
 }
 return map;
}
function object(key){
 try{
  const value=JSON.parse(localStorage.getItem(key)||'{}');
  return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 }catch(_){return {}}
}
function estimation(){
 const catalog=products(),cart=object('navarro_cart_v1');
 const changed=object('navarro360_precio_caja_activa_v1');
 const clavos=object('navarro_clavos_importe_v1'),imports=object('navarro_importes_cents_v1');
 let subtotal=0,units=0,unknown=0,hasFreight=false;
 for(const [code,value] of Object.entries(cart)){
  const qty=Number(value);if(!Number.isFinite(qty)||qty<=0||qty>9999)continue;
  const base=catalog?.get(code);
  if(!Number.isSafeInteger(base)||base<1){unknown++;continue}
  units++;
  if(code==='7777000010'){hasFreight=true;continue}
  const amount=Number(clavos[code]||imports[code]);
  const price=Number(changed[code]);
  const total=Number.isSafeInteger(amount)&&amount>0?amount:
   Math.round(qty*(Number.isSafeInteger(price)&&price>0?price:base));
  if(!Number.isSafeInteger(total)||total<1){unknown++;continue}
  subtotal+=total;
 }
 const eligible=subtotal>=100000;
 return {units,subtotal,unknown,eligible,hasFreight,
  shipping:hasFreight||eligible?0:5000,freeRemaining:Math.max(0,100000-subtotal)};
}
function pair(host,name,value){
 const row=document.createElement('div');row.className='nv70-pair';
 const label=document.createElement('span');label.textContent=name;
 const amount=document.createElement('strong');amount.textContent=value;
 row.append(label,amount);host.appendChild(row);
}
function line(host,tag,text){
 const el=document.createElement(tag);el.textContent=text;host.appendChild(el);return el;
}
function renderDelivery(){
 deliveryTimer=0;const host=$('nv70-delivery');if(!host)return;
 const quote=estimation();host.replaceChildren();
 line(host,'h3','🚚 Entrega y estado del pedido');
 if(!quote.units){const p=line(host,'p','Agrega productos para ver la estimación de envío.');p.className='nv70-info';return}
 pair(host,'Productos diferentes',String(quote.units));
 pair(host,'Subtotal estimado',mx.format(quote.subtotal/100));
 pair(host,'Envío a domicilio',quote.hasFreight?'Flete ya incluido en el carrito':quote.eligible?'Gratis':mx.format(50));
 if(!quote.hasFreight)pair(host,'Total aproximado con envío',mx.format((quote.subtotal+quote.shipping)/100));
 if(!quote.eligible&&!quote.hasFreight){
  const p=line(host,'p','Faltan '+mx.format(quote.freeRemaining/100)+' en productos para obtener envío gratis (desde $1,000).');
  p.className='nv70-info';
 }
 const track=document.createElement('div');track.className='nv70-track';const fill=document.createElement('span');
 fill.style.width=Math.max(0,Math.min(100,quote.subtotal/1000))+'%';track.appendChild(fill);host.appendChild(track);
 if(quote.unknown){
  const warn=line(host,'p','Hay '+quote.unknown+' código(s) sin precio comprobable. No utilices este total como definitivo.');
  warn.className='nv70-warning';
 }
 let sent=null;try{sent=JSON.parse(sessionStorage.getItem('nv70-wa-intento')||'null')}catch(_){}
 const attempted=sent&&Date.now()-Number(sent.at)<12*3600000;
 const steps=document.createElement('div');steps.className='nv70-steps';
 [['Carrito',true],['WhatsApp',!!attempted],['Bot confirma',false],['Guardada en SIFO',false]]
 .forEach(([name,done])=>{const el=document.createElement('span');el.textContent=name;el.className=done?'active':'';steps.appendChild(el)});
 host.appendChild(steps);
 if(attempted){const p=line(host,'p','Se intentó abrir WhatsApp. No podemos comprobar que el mensaje se envió ni que SIFO guardó una venta.');p.className='nv70-warning'}
 const address=document.createElement('section');address.className='nv70-address';
 const label=document.createElement('label');label.htmlFor='nv70-address';label.textContent='📍 Dirección para domicilio (opcional)';
 const input=document.createElement('textarea');input.id='nv70-address';input.maxLength=260;
 input.placeholder='Calle, número, colonia y referencias';
 try{input.value=sessionStorage.getItem('nv70-address')||''}catch(_){}
 input.addEventListener('input',()=>{try{sessionStorage.setItem('nv70-address',input.value.slice(0,260))}catch(_){}});
 const copy=document.createElement('button');copy.type='button';copy.textContent='📋 Copiar dirección para WhatsApp';
 copy.addEventListener('click',async()=>{
  const text=input.value.trim();
  if(text.length<8){input.focus();return}
  try{await navigator.clipboard.writeText(text);copy.textContent='✓ Dirección copiada'}
  catch(_){input.focus();copy.textContent='Selecciona y copia el texto manualmente'}
 });
 const hint=document.createElement('p');hint.className='nv70-info';
 hint.textContent='Se conserva sólo en esta pestaña. NO se envía automáticamente con los códigos; pégala en WhatsApp cuando el bot la solicite.';
 address.append(label,input,copy,hint);host.appendChild(address);
 const note=line(host,'p','Estimación informativa. El flete NO se añade a este carrito. El bot confirmará dirección, importe y condiciones al recibir el pedido.');
 note.className='nv70-info';
}
function queueDelivery(){if(!deliveryTimer)deliveryTimer=setTimeout(renderDelivery,100)}
function delivery(){
 if($('nv70-delivery'))return true;
 const cart=$('cart-items');if(!cart)return false;
 const panel=document.createElement('section');panel.id='nv70-delivery';
 panel.setAttribute('aria-label','Información de entrega, envío y estado del pedido');
 cart.insertAdjacentElement('afterend',panel);
 if(!cartListening){
  cartListening=true;
  new MutationObserver(queueDelivery).observe(cart,{subtree:true,childList:true});
  window.addEventListener('storage',e=>{if(!e.key||e.key==='navarro_cart_v1'||e.key.includes('precio'))queueDelivery()});
  window.addEventListener('click',e=>{
   const trigger=e.target.closest('#send-whatsapp,#mobile-whatsapp');
   if(!trigger||trigger.disabled||!estimation().units)return;
   try{sessionStorage.setItem('nv70-wa-intento',JSON.stringify({at:Date.now()}))}catch(_){}
   queueDelivery();
  },true);
 }
 renderDelivery();return true;
}
function imageOptimization(root){
 if(!root)return;
 let count=0;
 for(const card of root.querySelectorAll('article[data-card]')){
  for(const image of card.querySelectorAll('img')){
   if(image.decoding!=='async')image.decoding='async';
   if(count<3){
    if(image.loading!=='eager')image.loading='eager';
    try{image.fetchPriority='high'}catch(_){}
   }else{
    if(image.loading!=='lazy')image.loading='lazy';
    try{image.fetchPriority='low'}catch(_){}
   }
  }
  count++;
 }
}
function photos(){
 const grid=$('products');if(!grid)return false;
 if(photoListening)return true;
 photoListening=true;
 function run(){photoPending=false;imageOptimization(grid)}
 function schedule(){
  if(photoPending)return;
  photoPending=true;
  if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:350});
  else setTimeout(run,30);
 }
 new MutationObserver(schedule).observe(grid,{subtree:true,childList:true});
 schedule();return true;
}
function start(){
 css();
 nav();delivery();photos();
 let tries=0;
 const retry=setInterval(()=>{
  nav();delivery();photos();
  if(++tries>=12||($('nv70-materials')&&$('nv70-delivery')&&photoListening))clearInterval(retry);
 },600);
}
window.NAVARRO_UX_ESTADO_V70=()=>({version:70,catalogo:window.NAVARRO_DB?.length||0,barra:!!$('nv70-materials'),envios:!!$('nv70-delivery'),sifoConectado:false,estimacion:estimation()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();