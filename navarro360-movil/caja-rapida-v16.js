/* NAVARRO 360 V16: caja rapida sobre escaner V16.
   No valida identidades, permisos ni ventas SIFO. Funciona solo en pagina de pruebas. */
(function(){
'use strict';
if(window.NAVARRO_CAJA_RAPIDA_V16)return;
window.NAVARRO_CAJA_RAPIDA_V16=true;
const $=id=>document.getElementById(id),B=()=>window.NAVARRO_CAJA_TEST_BRIDGE;
const API=()=>window.NAVARRO_CAJA_MODULO;
const PESOS=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const USAGE='navarro360_v16_productos_frecuentes',OPERATOR='navarro360_v16_vendedor_referencia',AUDIT='navarro360_v16_precio_auditoria_prueba';
const CATEGORIES=[
 {label:'🏗️ Cemento gris',code:'7777001648'},
 {label:'⬜ Cemento blanco',code:'7777001635'},
 {label:'🟡 CPVC',term:'codo cpvc'},
 {label:'🔵 PVC',term:'codo pvc'},
 {label:'🔩 Varilla',term:'varilla'},
 {label:'📌 Clavos',term:'clavo'},
 {label:'🧴 Pegamento',term:'pegamento'},
 {label:'🚰 Hidráulico',term:'hidraulico'}
];
let attached=false,lastCart={},prevSuccess='',readerBuf='',readerFirst=0,readerPrev=0;
let observer=null,noticeTimer=null;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(_){return fallback}};
const save=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));return true}catch(_){return false}};
const friendly=s=>String(s||'').trim().slice(0,44);
function status(s){
 const element=$('n12-status');
 if(element&&!$('n12')?.hidden)element.textContent=s;
 else{
  let toast=$('nv16-toast');
  if(!toast){
   toast=document.createElement('div');toast.id='nv16-toast';
   toast.style.cssText='position:fixed;z-index:2147483500;bottom:calc(16px + env(safe-area-inset-bottom));left:12px;right:12px;max-width:550px;margin:auto;background:#174d32;color:white;border-radius:12px;padding:13px 15px;text-align:center;font:700 13px system-ui;box-shadow:0 4px 28px #001b0a66';
   document.body.appendChild(toast);
  }
  toast.textContent=s;toast.hidden=false;clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>toast.hidden=true,2300);
 }
}
function recordRecent(code){
 if(!/^\d{5,30}$/.test(code)||!B()?.getProduct(code))return;
 const used=read(USAGE,{});
 used[code]={count:Math.min(99999,(Number(used[code]?.count)||0)+1),at:Date.now()};
 const entries=Object.entries(used).sort((a,b)=>(b[1]?.at||0)-(a[1]?.at||0)).slice(0,50);
 save(USAGE,Object.fromEntries(entries));
}
function fingerprint(){
 const rows=B()?.getItems()||[],o={};
 for(const row of rows)o[row.code]={qty:row.qty,cents:row.priceCents,special:row.special};
 return o;
}
function noticeCartChange(){
 const latest=fingerprint();
 for(const [code,next] of Object.entries(latest)){
  const prev=lastCart[code];
  if((!prev||Number(next.qty)>Number(prev.qty))&&code!=='00000'){recordRecent(code);break}
 }
 lastCart=latest;renderQuick();
}
function renderQuick(){
 const area=$('nv16-quick');if(!area)return;
 area.replaceChildren();
 const used=read(USAGE,{});
 const popular=Object.entries(used).filter(([code])=>!!B()?.getProduct(code))
  .sort((a,b)=>(b[1]?.count||0)-(a[1]?.count||0)).slice(0,4)
  .map(([code])=>({code,label:'⭐ '+friendly(B().getProduct(code).name).slice(0,20)}));
 const all=popular.concat(CATEGORIES);
 for(const item of all){
  if(item.code&&!B()?.getProduct(item.code))continue;
  const btn=document.createElement('button');btn.type='button';
  btn.className='nv16-chip';btn.textContent=item.label;
  if(item.code)btn.dataset.nv16Code=item.code;
  else btn.dataset.nv16Term=item.term;
  area.appendChild(btn);
 }
}
async function onQuick(e){
 const btn=e.target.closest('button');
 if(!btn)return;
 const code=btn.dataset.nv16Code,term=btn.dataset.nv16Term;
 if(code){
  const add=window.NAVARRO_CAJA_ESCANER_PROBAR_V16;
  if(typeof add!=='function')return;
  const ok=await add(code);
  if(!ok)status('No fue posible agregar ese código al carrito.');
  return;
 }
 if(term){
  const input=$('n14-query');if(!input)return;
  input.value=term;input.dispatchEvent(new Event('input',{bubbles:true}));
  status('Elige la medida o presentación que necesitas.');
 }
}
function preflight(){
 const r=B()?.getSummary();
 if(!r?.valid)return {ready:false,title:'Carrito incompleto',message:'Agrega productos válidos antes de preparar la venta.'};
 if(r.hasSpecial)return {ready:false,title:'Requiere revisión manual',message:'PRODUCTOS VARIOS no se procesa como un código numérico mixto en el bot. Este pedido no se puede enviar automáticamente a SIFO.'};
 const diff=(Number(r.estimated)||0)-(Number(r.desired)||0);
 return {
  ready:Array.isArray(r.lines)&&r.lines.length>0,
  title:Math.abs(diff)>1||r.warnings?'Revisar diferencia antes de SIFO':'Códigos listos para revisar',
  message:'Total a cobrar '+PESOS.format(r.desired/100)+' · Equivalencia estimada SIFO '+PESOS.format(r.estimated/100)+
    ' · Diferencia '+PESOS.format(diff/100)+'. No equivale a venta guardada.',
  codes:(r.lines||[]).slice()
 };
}
function showPreflight(){
 const host=$('nv16-sifo');if(!host)return;
 host.hidden=!host.hidden;
 if(host.hidden)return;
 host.replaceChildren();
 const s=preflight(),heading=document.createElement('strong'),p=document.createElement('p');
 heading.textContent=s.title;p.textContent=s.message;
 host.append(heading,p);
 if(s.ready&&s.codes?.length){
  const copy=document.createElement('button');copy.type='button';copy.id='nv16-copy';
  copy.textContent='📋 Copiar códigos sin enviar';
  host.appendChild(copy);
 }
 const warn=document.createElement('p');warn.className='nv16-warning';
 warn.textContent='La caja de pruebas no registra ventas ni autoriza vendedores en SIFO.';
 host.appendChild(warn);
}
async function onPreflightClick(e){
 if(e.target.id!=='nv16-copy')return;
 const f=preflight();if(!f.ready)return;
 try{
  await navigator.clipboard.writeText(f.codes.join('\n'));
  status('Pedido copiado, no enviado a WhatsApp ni registrado en SIFO.');
 }catch(_){status('Safari no permitió copiar. Utiliza la vista previa del carrito.')}
}
function operatorName(){return friendly(read(OPERATOR,''))||'Sin identificar (pruebas)'}
function auditPrice(code,previous,next){
 if(!Number.isFinite(previous)||!Number.isFinite(next)||previous===next)return;
 const all=read(AUDIT,[]);
 all.unshift({at:Date.now(),code:String(code),anterior:previous,nuevo:next,vendedorReferencia:operatorName(),autorizado:false});
 save(AUDIT,all.slice(0,100));refreshAudit();
}
function refreshAudit(){
 const out=$('nv16-audit');
 if(out)out.textContent=read(AUDIT,[]).length+' cambios de precio anotados en este navegador (no verificados)';
}
function attach(){
 const root=$('n12')?.querySelector('.n12-card');if(!root)return;
 if(attached){lastCart=fingerprint();renderQuick();return}
 attached=true;
 const style=document.createElement('style');
 style.id='nv16-style';
 style.textContent='.nv16-fast{margin:8px 0 10px}.nv16-fast strong{font-size:12px;color:#295c41}.nv16-strip{display:flex;overflow-x:auto;gap:7px;padding:7px 0;scrollbar-width:thin;-webkit-overflow-scrolling:touch}.nv16-chip{flex:0 0 auto;white-space:nowrap;border:1px solid #b9d9c4!important;background:#e8f5ec!important;color:#145436!important;border-radius:999px!important;font:750 12px system-ui!important;min-height:40px!important;padding:7px 11px!important}.nv16-help{font-size:11px;color:#55705e;margin:0 0 5px}.nv16-check{background:#e9f3ec!important;color:#145a38!important;border:1px solid #c9e2d1!important;width:100%;border-radius:10px!important;min-height:44px!important;margin:8px 0 0;font-weight:800!important}.nv16-sifo{border:1px solid #d2e4d9;border-radius:11px;background:#f5fbf6;padding:11px;margin:8px 0;font-size:12px;color:#28553b}.nv16-sifo[hidden]{display:none!important}.nv16-sifo p{margin:6px 0}.nv16-sifo button{background:#ddeee3!important;color:#135637!important;font-size:12px!important;min-height:40px!important}.nv16-warning{color:#8c5d29;font-size:11px!important}.nv16-operator{margin:12px 0;border-top:1px solid #e1eee3;padding-top:7px}.nv16-operator summary{font-size:12px;font-weight:750;color:#35664b}.nv16-operator input{width:100%;font-size:16px;padding:9px;border-radius:9px;border:1px solid #c5d9cb;margin:6px 0}.nv16-operator p{font-size:11px;color:#6c7f71;margin:5px 0}';
 document.head.appendChild(style);
 const fast=document.createElement('section');fast.className='nv16-fast';
 fast.innerHTML='<strong>⚡ Productos frecuentes y más utilizados</strong><div class="nv16-strip" id="nv16-quick"></div>'+
  '<p class="nv16-help">Toca un producto frecuente o una categoría para elegir su medida. Los códigos provienen del catálogo cargado.</p>';
 const camera=root.querySelector('.n12-camera');if(camera)root.insertBefore(fast,camera);
 $('nv16-quick').addEventListener('click',onQuick);
 const panel=document.createElement('section');
 panel.innerHTML='<button id="nv16-check" type="button" class="nv16-check">🧮 Revisar equivalencia para SIFO</button>'+
  '<div id="nv16-sifo" class="nv16-sifo" hidden></div>'+
  '<details class="nv16-operator"><summary>👤 Vendedor de prueba y registro de cambios (sin autenticación)</summary>'+
  '<input id="nv16-operator-input" maxlength="44" autocomplete="off" placeholder="Referencia del empleado"><p>Este nombre NO autoriza modificar precios ni valida la identidad. Los cambios se anotan sólo en este navegador.</p>'+
  '<p id="nv16-audit"></p></details>';
 const pay=$('n14-pay');if(pay)root.insertBefore(panel,pay);
 $('nv16-check').addEventListener('click',showPreflight);
 $('nv16-sifo').addEventListener('click',onPreflightClick);
 const input=$('nv16-operator-input');input.value=operatorName()==='Sin identificar (pruebas)'?'':operatorName();
 input.addEventListener('change',()=>save(OPERATOR,friendly(input.value)));
 const cart=$('n15-cartlist');
 if(cart){
  cart.addEventListener('focusin',e=>{
   const el=e.target.closest('input[data-n15-edit="price"]');
   if(el)el.dataset.nv16Before=String((B()?.getItems()||[]).find(x=>x.code===el.dataset.n15Code)?.priceCents||'');
  });
  cart.addEventListener('change',e=>{
   const el=e.target.closest('input[data-n15-edit="price"]');
   if(!el)return;
   const previous=Number(el.dataset.nv16Before);
   const next=Number((B()?.getItems()||[]).find(x=>x.code===el.dataset.n15Code)?.priceCents);
   if(previous>0&&Number.isFinite(next))auditPrice(el.dataset.n15Code,previous,next);
  });
 }
 const progress=$('n12-progress');
 if(progress){
  observer=new MutationObserver(()=>noticeCartChange());
  observer.observe(progress,{childList:true,subtree:true,characterData:true});
 }
 const searchInput=$('n14-query');
 if(searchInput){
  searchInput.addEventListener('keydown',async function(e){
   if(e.key!=='Enter')return;
   const code=String(this.value||'').trim();
   if(!/^\d{5,30}$/.test(code)||!B()?.getProduct(code)||code==='00000')return;
   e.preventDefault();e.stopPropagation();
   const scan=window.NAVARRO_CAJA_ESCANER_PROBAR_V16;
   const ok=typeof scan==='function'?await scan(code):false;
   if(ok){this.value='';this.dispatchEvent(new Event('input',{bubbles:true}));this.blur()}
  });
 }
 lastCart=fingerprint();renderQuick();refreshAudit();
}
function addReaderCode(code){
 const b=B(),p=b?.getProduct(code);
 if(!p||code==='00000')return false;
 const overlay=$('n12');
 if(overlay&&!overlay.hidden&&typeof window.NAVARRO_CAJA_ESCANER_PROBAR_V16==='function'){
  void window.NAVARRO_CAJA_ESCANER_PROBAR_V16(code);
  return true;
 }
 const rows=b.getItems(),hit=rows.find(x=>x.code===code);
 let ok=false;
 if(!hit)ok=b.addCode(code);
 else{
  const cart={};for(const row of rows)cart[row.code]={qty:row.special?1:row.qty,cents:row.priceCents};
  const qty=Number(hit.qty)+1;if(qty>9999)return false;
  cart[code].qty=Math.round(qty*1000)/1000;
  ok=b.replace(cart);
 }
 if(ok){recordRecent(code);status('✓ '+p.name+' agregado con lector físico.');}
 return ok;
}
function onPhysicalKey(e){
 if(e.defaultPrevented||e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
 const el=e.target;
 if(el?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(el?.tagName)){
  // Cuando el lector está conectado al buscador, Enter agrega el código.
  if(e.key==='Enter'&&el.id==='search'){
   const code=String(el.value||'').trim();
   if(/^\d{5,30}$/.test(code)&&B()?.getProduct(code)){
    e.preventDefault();e.stopPropagation();if(addReaderCode(code)){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}))}
   }
  }
  readerBuf='';return;
 }
 const now=Date.now();
 if(/^\d$/.test(e.key)){
  if(now-readerPrev>130||now-readerFirst>1600){readerBuf='';readerFirst=now}
  readerBuf+=e.key;readerPrev=now;
  if(readerBuf.length>30){readerBuf='';readerFirst=0}
  return;
 }
 if(e.key==='Enter'||e.key==='Tab'){
  const code=readerBuf,duration=now-readerFirst;
  readerBuf='';readerFirst=0;
  // Requiere un lector que escriba rápidamente y termine con Enter/Tab.
  if(code.length>=6&&code.length<=30&&duration>=0&&duration<=1700&&
     duration/Math.max(1,code.length-1)<=105&&B()?.getProduct(code)){
   e.preventDefault();e.stopPropagation();addReaderCode(code);
  }
 }else if(e.key!=='Shift')readerBuf='';
}
const open=window.NAVARRO_CAJA_ESCANER_ABRIR_V16;
if(typeof open==='function'){
 window.NAVARRO_CAJA_ESCANER_ABRIR_V16=function(){
  const result=open();attach();return result;
 };
}
document.addEventListener('keydown',onPhysicalKey,true);
window.NAVARRO_CAJA_V16_ESTADO=function(){return {
 favoritos:Object.keys(read(USAGE,{})).length,
 cambiosDePrecioNoAutorizados:read(AUDIT,[]).length,
 vendedorReferencia:operatorName(),
 sifo:preflight()
}};
})();