/* NAVARRO 360 — Ticket directo local V1 · 18/11/2026
   Imprime desde el navegador. No usa WhatsApp, SIFO, ni envía datos.
   Lee el carrito existente y sus mismos ajustes monetarios.
*/
(function(){
'use strict';
if(window.NAVARRO_TICKET_DIRECTO_V1)return;
window.NAVARRO_TICKET_DIRECTO_V1=true;
const $=id=>document.getElementById(id);
const keys={
 cart:'navarro_cart_v1',
 clavos:'navarro_clavos_importe_v1',
 importes:'navarro_importes_cents_v1',
 precios:'navarro360_precio_caja_activa_v1'
};
const shopUrl='https://ferrematerialesnavarro.github.io/ferrematerialesnavarro/navarro360-movil/index.html';
const qrBits='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP4oX8u/gEE6JjgQQC63H/LLoBddk5aV0Aus97Q66AQWomXhBAP6qqqq/gABXF9UAAC+FsLlPgB2mR6l3cAF7Hu+JgAbh6b3MZAI92yv2GgBbm0gvcwDi4sucQgBIThKYGoAD1vBf9aAckEd195APdEqhgMAGr/BJiWABCeLcUBwB4sE6V/cAIsSkmAwAePzH2H5ALYMymQDgFo9LJS+wAOuS524QAIsQcB6oAZvNCd0aAVMU2T/TAJOONERyAEz5DkT6ACGh1Dl+wAAaD63xMA/ifM8a4AQWf35cbALqonCL6AF1bHYWrAC6ly42egBBOeIF9oA/rsi7RoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
const pesos=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const dateFormat=new Intl.DateTimeFormat('es-MX',{dateStyle:'short',timeStyle:'short',hour12:true});
const qtyFormat=new Intl.NumberFormat('es-MX',{maximumFractionDigits:3});
let catalog=null,catalogRef=null,qrCache='',createdAt=null;
function readMap(key){
 try{
  const obj=JSON.parse(localStorage.getItem(key)||'{}');
  return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{};
 }catch(_){return {}}
}
function escapeHTML(text){
 return String(text==null?'':text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function money(cents){return pesos.format(cents/100)}
function indexedCatalog(){
 const db=window.NAVARRO_DB;
 if(!Array.isArray(db))return null;
 if(catalogRef!==db){
  catalogRef=db;
  catalog=new Map(db.filter(Array.isArray).map(p=>[String(p[0]),{name:String(p[1]||'Producto'),base:Number(p[2])}]));
  if(!catalog.has('00000'))catalog.set('00000',{name:'PRODUCTOS VARIOS',base:20});
 }
 return catalog;
}
function collect(){
 const items=readMap(keys.cart),clavos=readMap(keys.clavos),importes=readMap(keys.importes),precios=readMap(keys.precios);
 const db=indexedCatalog();
 if(!db)return {error:'El catálogo no terminó de cargar. Vuelve a abrir el carrito.'};
 const rows=[];let subtotal=0;
 for(const [id,q] of Object.entries(items)){
  const qty=Number(q),p=db.get(id);
  if(!/^\d{5,}$/.test(id)||!Number.isFinite(qty)||qty<=0||qty>9999)
   return {error:'Existe una cantidad incorrecta en el carrito. Revísala antes de imprimir.'};
  if(!p||!Number.isFinite(p.base)||p.base<=0)
   return {error:'Falta un precio válido para el código '+id+'. El ticket no se imprimirá incompleto.'};
  const cl=Number(clavos[id]),imp=Number(importes[id]);
  const special=Number.isSafeInteger(cl)&&cl>0?cl:(Number.isSafeInteger(imp)&&imp>0?imp:0);
  const modified=Number(precios[id]);
  const unit=Number.isSafeInteger(modified)&&modified>0?modified:Math.round(p.base*100);
  const total=special>0?special:Math.round(qty*unit);
  if(!Number.isSafeInteger(unit)||unit<=0||!Number.isSafeInteger(total)||total<=0)
   return {error:'No se pudo calcular correctamente el importe de '+id+'.'};
  rows.push({id,name:p.name,qty,unit,total,special:special>0});
  subtotal+=total;
 }
 if(!rows.length)return {error:'Agrega productos al carrito antes de imprimir un ticket.'};
 if(!Number.isSafeInteger(subtotal)||subtotal<=0)return {error:'El total del carrito no es válido.'};
 return {rows,subtotal,hasFreight:rows.some(p=>p.id==='7777000010')};
}
function qrSvg(){
 if(qrCache)return qrCache;
 const bits=atob(qrBits),path=[];
 for(let y=0;y<49;y++){
  for(let x=0;x<49;x++){
   const i=y*49+x;
   if(bits.charCodeAt(i>>3)&(128>>(i&7)))path.push('M'+x+' '+y+'h1v1h-1z');
  }
 }
 qrCache='<svg xmlns="http://www.w3.org/2000/svg" aria-label="Código QR para abrir NAVARRO 360" viewBox="0 0 49 49" width="150" height="150"><path fill="#000" d="'+path.join('')+'"/></svg>';
 return qrCache;
}
function preview(){
 const data=collect();
 if(data.error){window.alert(data.error);return false}
 const paper=$('nv-ticket-paper');
 const client=String($('nv-ticket-client').value||'').trim().slice(0,100);
 const state=$('nv-ticket-status').value;
 const label=state==='pagado'?'PAGADO':state==='cobrar'?'POR COBRAR':'SIN ESPECIFICAR';
 const flete=$('nv-ticket-flete').checked&&!data.hasFreight?5000:0;
 const address=String($('nv70-address')?.value||'').trim().slice(0,260);
 const stamp=createdAt||new Date();
 const items=data.rows.map(p=>{
  const price=p.special?'Por importe':qtyFormat.format(p.qty)+' × '+money(p.unit);
  return '<div class="nv-ticket-item"><div class="nv-ticket-name">'+escapeHTML(p.name)+'</div>'+
   '<div class="nv-ticket-code">'+escapeHTML(p.id)+'</div>'+
   '<div class="nv-ticket-row"><span>'+escapeHTML(price)+'</span><strong>'+money(p.total)+'</strong></div></div>';
 }).join('');
 paper.innerHTML=
  '<header class="nv-ticket-brand"><div class="nv-ticket-namebrand">FERREMATERIALES<br><b>NAVARRO</b></div>'+
  '<div class="nv-ticket-contact">María Guadalupe Martínez de Hernández Loza 3386<br>WhatsApp: +52 56 3912 9040</div></header>'+
  '<div class="nv-ticket-rule"></div>'+
  '<div class="nv-ticket-center"><b>TICKET DE VENTA LOCAL</b></div>'+
  '<div class="nv-ticket-meta">Fecha: '+escapeHTML(dateFormat.format(stamp))+'</div>'+
  (client?'<div class="nv-ticket-meta">Cliente: '+escapeHTML(client)+'</div>':'')+
  (state!=='none'?'<div class="nv-ticket-meta">Estado: <b>'+label+'</b></div>':'')+
  '<div class="nv-ticket-rule"></div>'+
  '<div class="nv-ticket-items">'+items+'</div>'+
  '<div class="nv-ticket-rule"></div>'+
  '<div class="nv-ticket-row"><span>Subtotal</span><strong>'+money(data.subtotal)+'</strong></div>'+
  (flete?'<div class="nv-ticket-row"><span>Envío a domicilio</span><strong>'+money(flete)+'</strong></div>':'')+
  '<div class="nv-ticket-total"><span>TOTAL</span><b>'+money(data.subtotal+flete)+'</b></div>'+
  (address?'<div class="nv-ticket-address"><b>Dirección de entrega</b><p>'+escapeHTML(address)+'</p></div>':'')+
  '<div class="nv-ticket-rule"></div>'+
  '<div class="nv-ticket-center nv-ticket-thanks">¡Gracias por su compra!<br>Haz tu pedido escaneando este QR.</div>'+
  '<div class="nv-ticket-qr">'+qrSvg()+'</div>'+
  '<div class="nv-ticket-center nv-ticket-url">NAVARRO 360 · Catálogo digital</div>'+
  '<div class="nv-ticket-center nv-ticket-small">Comprobante local no fiscal. No es factura.</div>';
 const paperChoice=$('nv-ticket-paper-size').value;
 paper.dataset.paper=paperChoice==='58'?'58':'80';
 return true;
}
function printTicket(){
 if(!preview())return;
 try{
  window.print();
 }catch(_){
  window.alert('Tu navegador no pudo abrir la impresión. Abre el enlace en Safari y utiliza Compartir > Imprimir.');
 }
}
function closeTicket(){
 const screen=$('nv-ticket-screen');
 if(screen){screen.hidden=true;screen.setAttribute('aria-hidden','true')}
}
function openTicket(){
 createdAt=new Date();
 if(!preview())return;
 const screen=$('nv-ticket-screen');
 screen.hidden=false;screen.setAttribute('aria-hidden','false');
 $('nv-ticket-print').focus();
}
function mount(){
 const drawer=$('drawer'),send=$('send-whatsapp'),bottom=send?.parentElement;
 if(!drawer||!send||!bottom)return;
 const button=document.createElement('button');
 button.id='nv-print-ticket-button';button.type='button';
 button.textContent='🖨 Imprimir ticket directo';
 button.setAttribute('aria-label','Imprimir ticket sin WhatsApp ni SIFO');
 button.addEventListener('click',openTicket);
 bottom.insertBefore(button,send);
 const style=document.createElement('style');style.id='nv-ticket-directo-style';
 style.textContent=[
  '#nv-print-ticket-button{display:block;width:100%;min-height:53px;margin:10px 0 9px;border:0;border-radius:12px;background:#205e40;color:white;font:850 15px system-ui;cursor:pointer;box-shadow:0 2px 6px #163d2928}',
  '#nv-print-ticket-button:active{transform:scale(.99)}',
  '#nv-ticket-screen[hidden]{display:none!important}',
  '#nv-ticket-screen{position:fixed;inset:0;z-index:2147483010;overflow-y:auto;background:#0b1e31db;display:flex;justify-content:center;align-items:flex-start;overscroll-behavior:contain;padding:12px 12px calc(24px + env(safe-area-inset-bottom,0px));box-sizing:border-box;-webkit-overflow-scrolling:touch}',
  '#nv-ticket-panel{width:100%;max-width:440px;background:#e9edeb;border-radius:15px;padding:13px;box-shadow:0 15px 45px #0006;box-sizing:border-box}',
  '.nv-ticket-toolbar{font:14px system-ui;color:#20362b}',
  '.nv-ticket-toolbar h2{font:850 20px system-ui;margin:2px 0 5px}',
  '.nv-ticket-toolbar p{font-size:12px;line-height:1.4;margin:2px 0 10px;color:#54685b}',
  '.nv-ticket-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}',
  '.nv-ticket-controls label{font:750 11px system-ui;display:flex;flex-direction:column;gap:4px}',
  '.nv-ticket-controls input,.nv-ticket-controls select{min-width:0;width:100%;height:41px;border:1px solid #b7c6be;border-radius:9px;padding:7px;background:#fff;color:#193529;font:14px system-ui;box-sizing:border-box}',
  '.nv-ticket-check{display:flex;align-items:center;gap:8px;margin:6px 0 12px;font-size:12px;font-weight:700}',
  '.nv-ticket-check input{width:18px;height:18px}',
  '.nv-ticket-actions{display:flex;gap:8px;margin:12px 0 2px}',
  '.nv-ticket-actions button{flex:1;min-height:47px;border-radius:10px;border:1px solid #b7cabc;background:white;color:#234a33;font:800 13px system-ui}',
  '#nv-ticket-print{background:#17683c;color:#fff;border-color:#17683c}',
  '#nv-ticket-paper{box-sizing:border-box;margin:0 auto;padding:11px 9px;width:76mm;max-width:100%;background:white;color:#111;box-shadow:0 2px 7px #0002;font:12px/1.32 Arial,sans-serif;overflow-wrap:anywhere}',
  '#nv-ticket-paper[data-paper="58"]{width:54mm;font-size:10px;padding:7px 5px}',
  '.nv-ticket-brand{text-align:center}.nv-ticket-namebrand{font:bold 19px/1.06 Arial,sans-serif;letter-spacing:.2px}.nv-ticket-namebrand b{font-size:24px}',
  '#nv-ticket-paper[data-paper="58"] .nv-ticket-namebrand{font-size:14px}#nv-ticket-paper[data-paper="58"] .nv-ticket-namebrand b{font-size:18px}',
  '.nv-ticket-contact{font-size:10px;line-height:1.35;margin-top:7px}',
  '.nv-ticket-rule{border-top:1px dashed #444;margin:8px 0}',
  '.nv-ticket-center{text-align:center}.nv-ticket-meta{margin:3px 0;font-size:11px}',
  '.nv-ticket-item{padding:5px 0}.nv-ticket-name{font-weight:bold;font-size:11px}.nv-ticket-code{font-size:9px;color:#555}',
  '.nv-ticket-row{display:flex;justify-content:space-between;gap:8px;margin:3px 0}.nv-ticket-row strong{white-space:nowrap}',
  '.nv-ticket-total{display:flex;justify-content:space-between;gap:6px;border-top:1px solid #111;margin:8px 0;padding:7px 0;font-weight:bold;font-size:17px}',
  '.nv-ticket-total b{white-space:nowrap}.nv-ticket-address{border:1px dashed #777;padding:6px;font-size:10px}.nv-ticket-address p{margin:4px 0 0}',
  '.nv-ticket-thanks{font-weight:bold;margin-top:9px}.nv-ticket-qr{text-align:center;margin:9px auto 4px}.nv-ticket-qr svg{width:32mm;height:32mm;max-width:100%}',
  '.nv-ticket-url{font-size:10px}.nv-ticket-small{font-size:9px;color:#555;margin-top:8px}',
  '@media(max-width:390px){.nv-ticket-controls{grid-template-columns:1fr}.nv-ticket-namebrand{font-size:17px}}',
  '@media print{',
  '  @page{margin:0}',
  '  html,body{margin:0!important;padding:0!important;overflow:visible!important;height:auto!important;background:#fff!important}',
  '  body>*:not(#nv-ticket-screen){display:none!important}',
  '  #nv-ticket-screen{display:block!important;position:static!important;inset:auto!important;overflow:visible!important;z-index:auto!important;padding:0!important;margin:0!important;background:white!important;max-height:none!important}',
  '  #nv-ticket-panel{width:auto!important;max-width:none!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;background:white!important}',
  '  #nv-ticket-panel .nv-ticket-toolbar,.nv-ticket-actions{display:none!important}',
  '  #nv-ticket-paper{box-shadow:none!important;border:0!important;margin:0!important;padding:2mm!important;max-width:none!important;break-inside:auto!important;color:#000!important}',
  '  #nv-ticket-paper[data-paper="58"]{padding:1.5mm!important}',
  '  .nv-ticket-item{break-inside:avoid!important}',
  '}'
 ].join('\n');
 document.head.appendChild(style);
 const screen=document.createElement('div');
 screen.id='nv-ticket-screen';screen.hidden=true;screen.setAttribute('aria-hidden','true');
 screen.innerHTML=
  '<div id="nv-ticket-panel"><div class="nv-ticket-toolbar"><h2>🖨️ Ticket directo</h2>'+
  '<p>Se imprime desde este dispositivo. No se envía a WhatsApp ni SIFO y no se vacía el carrito.</p>'+
  '<div class="nv-ticket-controls"><label>Cliente (opcional)<input id="nv-ticket-client" maxlength="100" placeholder="Mostrador"></label>'+
  '<label>Estado de pago<select id="nv-ticket-status"><option value="none">Sin especificar</option><option value="pagado">Pagado</option><option value="cobrar">Por cobrar</option></select></label>'+
  '<label>Tamaño de papel<select id="nv-ticket-paper-size"><option value="80">80 mm (ticket)</option><option value="58">58 mm (ticket)</option></select></label></div>'+
  '<label class="nv-ticket-check"><input type="checkbox" id="nv-ticket-flete"> Incluir envío de $50 (si no está en el carrito)</label>'+
  '</div><article id="nv-ticket-paper" data-paper="80"></article>'+
  '<div class="nv-ticket-actions"><button id="nv-ticket-close" type="button">Volver al carrito</button>'+
  '<button id="nv-ticket-print" type="button">🖨 Imprimir ahora</button></div></div>';
 document.body.appendChild(screen);
 $('nv-ticket-close').addEventListener('click',closeTicket);
 $('nv-ticket-print').addEventListener('click',printTicket);
 screen.addEventListener('click',e=>{if(e.target===screen)closeTicket()});
 ['nv-ticket-client','nv-ticket-status','nv-ticket-paper-size','nv-ticket-flete'].forEach(id=>
  $(id).addEventListener('input',preview));
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!screen.hidden){e.preventDefault();e.stopImmediatePropagation();closeTicket()}
 },true);
 window.NAVARRO_TICKET_DIRECTO_ESTADO=Object.freeze({version:1,independienteDeWhatsApp:true,independienteDeSifo:true,borraCarrito:false,moneda:'MXN'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();