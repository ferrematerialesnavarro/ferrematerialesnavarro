/* NAVARRO 360 — Caja profesional móvil V1, laboratorio aislado.
 * Funciona sobre precios-vendedor-prueba.html mediante su puente; NO autoriza
 * empleados ni cambia SIFO, el bot o el catálogo oficial. Historial de
 * simulaciones y ventas en espera viven SÓLO en este navegador.
 */
(function(){
'use strict';
if(window.NAVARRO_CAJA_MODULO)return;
var HOLD='navarro360_caja_prueba_espera_v1';
var HISTORY='navarro360_caja_prueba_historial_v1';
var MAX_HOLD=30,MAX_HISTORY=300;
var B=()=>window.NAVARRO_CAJA_TEST_BRIDGE;
var $=id=>document.getElementById(id);
var mx=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
var money=n=>mx.format(Number(n||0)/100);
var safe=s=>String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]});
var stored=k=>{try{var o=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(o)?o:[]}catch(_){return []}};
var persist=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){alert('No hay espacio para guardar el registro en este navegador. No se realizaron cambios.');return false}};
var dateLabel=v=>{var d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('es-MX'):'Sin fecha'};
var countItems=items=>items.reduce(function(t,p){return t+(p.special?1:Number(p.qty)||0)},0);
var capText=v=>String(v||'').trim().slice(0,80);
var hasStarted=false,ready=false;
var videoReader=null,scannerOpen=false,scanStarting=false,scanLastCode='',scanLastAt=0,scanCount=0;
var pendingScript=null;
var scannerSession=0;
function css(){
 var style=document.createElement('style');style.id='navarro-caja-profesional-style-v1';
 style.textContent=[
 '.nv-pro-menu{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}',
 '.nv-pro-menu button{background:#eaf4ec;color:#184b34;border:1px solid #c8e0d0;font-size:13px;padding:9px 5px}',
 '.nv-pro-menu button span{display:block;font-size:20px;margin:1px 0 4px}',
 '.nv-pro-panel{background:white;border:1px solid #d9e7de;border-radius:16px;padding:15px;margin:14px 0}',
 '.nv-pro-panel h2{margin:0 0 10px}.nv-pro-panel .muted{margin-top:5px}',
 '.nv-pro-panel[hidden]{display:none!important}',
 '.nv-pro-h-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:11px}',
 '.nv-pro-h-row button{background:#ecf2ed;color:#205640;font-size:12px}',
 '.nv-pro-item{border-top:1px solid #e9f0e9;padding:12px 0;display:flex;align-items:start;justify-content:space-between;gap:8px}',
 '.nv-pro-item:first-of-type{border-top:0}',
 '.nv-pro-item strong{font-size:14px;display:block}.nv-pro-item small{font-size:12px;color:#5d7164;display:block;margin:4px 0}',
 '.nv-pro-actions{display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:end}',
 '.nv-pro-actions button{font-size:12px;min-height:39px;padding:7px 10px}',
 '.nv-pro-quiet{background:#e8f2ec;color:#19593e}',
 '.nv-pro-danger{background:#fff0eb;color:#9e4036}',
 '.nv-pro-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}',
 '.nv-pro-kpi{background:#f3f8f4;border-radius:12px;padding:12px}',
 '.nv-pro-kpi small{display:block;font-size:11px;color:#64776c}',
 '.nv-pro-kpi b{display:block;font-size:20px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;margin-top:4px}',
 '.nv-pro-scan-overlay[hidden]{display:none!important}',
 '.nv-pro-scan-overlay{position:fixed;inset:0;background:#02120ae3;z-index:99999;display:flex;justify-content:center;align-items:center;padding:9px}',
 '.nv-pro-scan-box{border-radius:18px;background:#fff;width:min(100%,540px);max-height:calc(100dvh - 20px);overflow:auto;padding:16px;color:#173e2a}',
 '.nv-pro-scan-box h2{margin:0;font-size:18px}.nv-pro-scan-video{width:100%;min-height:180px;background:#18251e;border-radius:13px;overflow:hidden;margin:11px 0}',
 '.nv-pro-scan-video video{width:100%!important;max-height:42vh;object-fit:contain}',
 '.nv-pro-scan-status{padding:11px;background:#eaf4ec;border-radius:11px;font-size:13px;line-height:1.45;margin:9px 0}',
 '.nv-pro-scan-actions{display:flex;flex-wrap:wrap;gap:7px}.nv-pro-scan-actions button{flex:1;min-width:100px}',
 '.nv-pro-tag{font-size:11px;color:#826221;background:#fff5dd;padding:4px 6px;border-radius:6px}',
 '.nv-pro-input-row{display:flex;gap:7px}.nv-pro-input-row input{min-width:0;flex:1}.nv-pro-input-row button{min-width:95px}',
 '.nv-pro-bottom-info{margin-top:8px;color:#6f7b71;font-size:11px;line-height:1.45}',
 '.nv-pro-simplebtn{width:100%;background:#eaf4ec;color:#18573c}',
 '.nv-pro-note{background:#fff6e3;border:1px solid #ead5a8;border-radius:10px;padding:10px;color:#735923;font-size:12px;line-height:1.55}',
 '#nv-pro-top{margin-top:12px}#nv-pro-top .nv-pro-menu{margin:8px 0 0}',
 '.nv-pro-toast{position:fixed;bottom:calc(93px + env(safe-area-inset-bottom));left:13px;right:13px;background:#153d2c;color:white;border-radius:12px;padding:12px;z-index:8999;font-size:13px;max-width:530px;margin:auto;text-align:center;box-shadow:0 6px 26px #001b0a44}',
 '@media(max-width:430px){.nv-pro-item{flex-wrap:wrap}.nv-pro-actions{width:100%;justify-content:flex-start}.nv-pro-panel{padding:12px}.nv-pro-menu button{font-size:12px}.nv-pro-scan-video{min-height:140px}}'
 ].join('');
 document.head.appendChild(style);
}
function toast(t){
 var node=$('nv-pro-toast');
 if(!node){node=document.createElement('div');node.id='nv-pro-toast';node.className='nv-pro-toast';document.body.appendChild(node)}
 node.textContent=t;node.hidden=false;
 clearTimeout(toast.t);toast.t=setTimeout(function(){node.hidden=true},2800);
}
function scaffold(){
 if($('nv-pro-top'))return;
 var host=document.createElement('div');host.id='nv-pro-top';
 host.innerHTML='<div class="nv-pro-menu">'+
 '<button type="button" data-nvnav="scan"><span>📷</span>Escanear</button>'+
 '<button type="button" data-nvnav="hold"><span>🕒</span>En espera</button>'+
 '<button type="button" data-nvnav="reports"><span>📊</span>Reportes</button>'+
 '</div><div class="nv-pro-note">🛡️ <b>Modo vendedor de PRUEBAS:</b> esta página pública todavía no tiene autenticación de empleados. El acceso real deberá validarse en un servidor o en el bot; ningún PIN guardado en el navegador se considera una autorización segura.</div>';
 var search=$('search');
 var parent=search&&search.closest('section');
 if(parent)parent.insertBefore(host,parent.firstElementChild?parent.firstElementChild.nextSibling:null);
 var after=document.createElement('div');after.id='nv-pro-panels';
 after.innerHTML=
 '<section class="nv-pro-panel" id="nv-pro-hold" hidden><div class="nv-pro-h-row"><h2>🕒 Ventas en espera</h2><button data-nvclose="hold">Cerrar</button></div>'+
 '<p class="muted">Guarda el carrito de prueba completo con sus cantidades y precios editados; recupéralo más tarde en este mismo navegador.</p>'+
 '<label for="nv-pro-hold-label">Referencia del cliente (opcional)</label><input id="nv-pro-hold-label" placeholder="Ej. Cliente de mostrador 1" maxlength="70" autocomplete="off">'+
 '<div class="nv-pro-actions" style="margin:12px 0"><button id="nv-pro-save-hold">💾 Guardar y liberar carrito</button></div>'+
 '<p id="nv-pro-hold-count" class="muted"></p><div id="nv-pro-hold-list"></div></section>'+
 '<section class="nv-pro-panel" id="nv-pro-reports" hidden><div class="nv-pro-h-row"><h2>📊 Historial y reportes</h2><button data-nvclose="reports">Cerrar</button></div>'+
 '<div class="nv-pro-note">Estos reportes son ÚNICAMENTE de ventas simuladas que terminaste en esta página y se guardan en este dispositivo. No son registros de SIFO, ni de WhatsApp, ni ingresos confirmados.</div>'+
 '<div id="nv-pro-kpis" class="nv-pro-kpis" style="margin:12px 0"></div>'+
 '<div class="nv-pro-actions"><button id="nv-pro-export" class="nv-pro-quiet">⬇ Exportar CSV</button><button id="nv-pro-clear-hist" class="nv-pro-danger">Borrar historial de pruebas</button></div>'+
 '<h3 style="font-size:15px">Últimas simulaciones</h3><div id="nv-pro-hist-list"></div></section>';
 if(parent)parent.insertAdjacentElement('afterend',after);
 var scan=document.createElement('div');scan.id='nv-pro-scan';scan.className='nv-pro-scan-overlay';scan.hidden=true;scan.setAttribute('role','dialog');scan.setAttribute('aria-modal','true');scan.setAttribute('aria-label','Escáner de códigos de barras');
 scan.innerHTML='<div class="nv-pro-scan-box">'+
 '<div class="nv-pro-h-row"><h2>📷 Escáner continuo · iPhone</h2><button id="nv-pro-scan-close" type="button" class="nv-pro-quiet">Cerrar ✕</button></div>'+
 '<p class="muted">Escanea productos consecutivamente para agregarlos al carrito, sin duplicar las líneas. La cámara no realiza cobros.</p>'+
 '<div id="nv-pro-scan-video" class="nv-pro-scan-video"></div>'+
 '<div id="nv-pro-scan-status" class="nv-pro-scan-status" role="status">Cámara sin iniciar.</div>'+
 '<div class="nv-pro-scan-actions"><button id="nv-pro-scan-start">Iniciar cámara</button><button id="nv-pro-scan-stop" class="nv-pro-quiet">Pausar</button><button id="nv-pro-scan-photo" class="nv-pro-quiet">📸 Leer foto</button></div>'+
 '<input id="nv-pro-file" type="file" accept="image/*" capture="environment" hidden><div id="nv-pro-photo-reader" style="position:absolute;left:-9999px;top:0;width:320px;height:240px;overflow:hidden" aria-hidden="true"></div>'+
 '<label for="nv-pro-manual">Lectura manual o escáner físico</label>'+
 '<div class="nv-pro-input-row"><input id="nv-pro-manual" type="text" inputmode="numeric" placeholder="Código de barras" autocomplete="off"><button id="nv-pro-manual-add">Agregar</button></div>'+
 '<p class="nv-pro-bottom-info">En iPhone es necesario autorizar la cámara. Si el lector no reconoce el código, puedes escribirlo o usar un lector Bluetooth. Se evitarán repeticiones de la misma lectura por unos segundos.</p></div>';
 document.body.appendChild(scan);
 document.addEventListener('click',function(e){
  var open=e.target.closest('[data-nvnav]'),close=e.target.closest('[data-nvclose]');
  if(open){var type=open.dataset.nvnav;if(type==='scan')openScanner();else showPanel(type)}
  if(close)hidePanel(close.dataset.nvclose);
 });
 $('nv-pro-save-hold').addEventListener('click',saveHold);
 $('nv-pro-hold-list').addEventListener('click',handleHold);
 $('nv-pro-export').addEventListener('click',exportCSV);
 $('nv-pro-clear-hist').addEventListener('click',clearHistory);
 $('nv-pro-scan-close').addEventListener('click',closeScanner);
 $('nv-pro-scan-start').addEventListener('click',startScanner);
 $('nv-pro-scan-stop').addEventListener('click',stopScanner);
 $('nv-pro-scan-photo').addEventListener('click',function(){$('nv-pro-file').click()});
 $('nv-pro-file').addEventListener('change',function(e){readPhoto(e.target.files&&e.target.files[0])});
 $('nv-pro-manual-add').addEventListener('click',manualScan);
 $('nv-pro-manual').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();manualScan()}});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('nv-pro-scan').hidden)closeScanner()});
 updateHolds();updateReports();
}
function showPanel(type){
 var hold=type==='hold';
 $('nv-pro-hold').hidden=!hold;$('nv-pro-reports').hidden=hold;
 if(hold)updateHolds();else updateReports();
 $(hold?'nv-pro-hold':'nv-pro-reports').scrollIntoView({behavior:'smooth',block:'start'});
}
function hidePanel(type){$(type==='hold'?'nv-pro-hold':'nv-pro-reports').hidden=true}
function toCart(items){
 var cart={};
 for(var p of items){
  if(!p||!B().getProduct(p.code)||!Number.isFinite(p.qty)||p.qty<=0||!Number.isSafeInteger(p.priceCents)||p.priceCents<=0)return null;
  cart[p.code]={qty:p.special?1:p.qty,cents:p.priceCents};
 }
 return cart;
}
function updateHolds(){
 if(!$('nv-pro-hold-list'))return;
 var list=stored(HOLD).slice(0,MAX_HOLD);
 $('nv-pro-hold-count').textContent=list.length+' de '+MAX_HOLD+' ventas guardadas en este celular.';
 $('nv-pro-hold-list').innerHTML=list.length?list.map(function(v){
  var count=Array.isArray(v.items)?v.items.length:0;
  return '<div class="nv-pro-item"><div><strong>'+safe(v.label||'Venta sin nombre')+'</strong><small>'+dateLabel(v.at)+' · '+count+' productos · '+money(v.totalCents)+'</small></div>'+
  '<div class="nv-pro-actions"><button type="button" data-hold-action="restore" data-id="'+safe(v.id)+'">Recuperar</button>'+
  '<button type="button" class="nv-pro-danger" data-hold-action="delete" data-id="'+safe(v.id)+'">Eliminar</button></div></div>';
 }).join(''):'<p class="muted">No hay ventas en espera.</p>';
}
function saveHold(){
 if(!ready){toast('Catálogo cargando.');return}
 var products=B().getItems();
 if(!products.length){alert('El carrito está vacío. Agrega productos antes de guardar.');return}
 var list=stored(HOLD);
 if(list.length>=MAX_HOLD){alert('Llegaste al máximo de 30 ventas en espera. Recupera o elimina alguna.');return}
 var d={id:'H'+Date.now()+'-'+Math.floor(Math.random()*100000),at:Date.now(),
 label:capText($('nv-pro-hold-label').value)||'Mostrador',items:products,totalCents:B().getSummary().desired};
 if(!persist(HOLD,[d].concat(list)))return;
 if(!B().replace({})){
  persist(HOLD,list);alert('No se pudo liberar el carrito, así que no se guardó la venta en espera.');return;
 }
 $('nv-pro-hold-label').value='';
 updateHolds();toast('Venta guardada. Carrito liberado para el siguiente cliente.');
}
function handleHold(e){
 var btn=e.target.closest('[data-hold-action]');if(!btn)return;
 var list=stored(HOLD),idx=list.findIndex(function(x){return x.id===btn.dataset.id});if(idx<0)return;
 var one=list[idx],action=btn.dataset.holdAction;
 if(action==='delete'){
  if(!confirm('¿Eliminar la venta en espera "'+capText(one.label)+'"?'))return;
  list.splice(idx,1);if(persist(HOLD,list))updateHolds();return;
 }
 var current=B().getItems();
 if(current.length&&!confirm('Tienes '+current.length+' artículos en el carrito actual. Recuperar esta venta lo REEMPLAZARÁ. Guarda primero el carrito actual si lo necesitas. ¿Continuar?'))return;
 var next=toCart(one.items||[]);
 if(!next){alert('La venta guardada contiene productos ausentes o datos incorrectos. No modificamos el carrito.');return}
 if(!B().replace(next)){alert('No se pudo recuperar la venta. Tu carrito no cambió.');return}
 list.splice(idx,1);if(!persist(HOLD,list))toast('Venta recuperada, pero no se pudo actualizar el registro de espera.');
 updateHolds();toast('Carrito recuperado: '+(one.label||'venta')+'.');
}
function registrarVenta(v){
 if(!v||!Number.isSafeInteger(v.totalCents)||v.totalCents<=0||!Array.isArray(v.items)||!v.items.length)return;
 var hist=stored(HISTORY),entry={
  id:'SIM-'+Date.now()+'-'+Math.floor(Math.random()*100000),at:Date.now(),
  totalCents:v.totalCents,estimatedCents:v.estimatedCents,
  method:v.method,status:v.status,changeCents:v.changeCents,receivedCents:v.receivedCents,
  items:v.items.slice(0,250)
 };
 if(persist(HISTORY,[entry].concat(hist).slice(0,MAX_HISTORY))){updateReports();toast('Simulación registrada en el historial local.')}
}
function historyTotals(hist){
 var total=0,paid=0,credit=0,byMethod={},products=new Map();
 hist.forEach(function(h){
  if(!Number.isSafeInteger(h.totalCents)||h.totalCents<0)return;
  total+=h.totalCents;
  byMethod[h.method]=(byMethod[h.method]||0)+1;
  if(h.method==='credit')credit++;else paid++;
  (Array.isArray(h.items)?h.items:[]).forEach(function(p){
   var row=products.get(p.code)||{name:p.name||p.code,amount:0,qty:0};
   row.amount+=Number(p.amountCents)||0;row.qty+=Number(p.quantity)||0;products.set(p.code,row);
  });
 });
 var top=[...products.entries()].sort(function(a,b){return b[1].amount-a[1].amount}).slice(0,5);
 return {total:total,paid:paid,credit:credit,byMethod:byMethod,top:top};
}
function updateReports(){
 if(!$('nv-pro-kpis'))return;
 var hist=stored(HISTORY).slice(0,MAX_HISTORY),t=historyTotals(hist);
 var blocks=[
  ['Simulaciones',String(hist.length)],['Monto simulado',money(t.total)],
  ['Promedio',hist.length?money(Math.round(t.total/hist.length)):'$0.00'],
  ['Por cobrar (demo)',String(t.credit)]
 ];
 $('nv-pro-kpis').innerHTML=blocks.map(function(v){return '<div class="nv-pro-kpi"><small>'+safe(v[0])+'</small><b>'+safe(v[1])+'</b></div>'}).join('');
 var methodNames={cash:'Efectivo',transfer:'Transferencia',credit:'Por cobrar'};
 var counts=Object.keys(t.byMethod).map(function(k){return (methodNames[k]||k)+': '+t.byMethod[k]}).join(' · ');
 var headline='<p class="muted">'+safe(counts||'Aún no hay simulaciones.')+'</p>';
 if(t.top.length){
  headline+='<p class="muted"><b>Productos con mayor importe simulado</b></p>';
  headline+=t.top.map(function(x){return '<div class="pair"><span>'+safe(x[1].name)+'</span><strong>'+money(x[1].amount)+'</strong></div>'}).join('');
 }
 $('nv-pro-hist-list').innerHTML=headline+hist.slice(0,20).map(function(h){
  return '<div class="nv-pro-item"><div><strong>'+money(h.totalCents)+' <span class="nv-pro-tag">SIMULACIÓN</span></strong>'+
   '<small>'+dateLabel(h.at)+' · '+safe(methodNames[h.method]||h.method)+' · '+(Array.isArray(h.items)?h.items.length:0)+' productos</small></div></div>';
 }).join('');
}
function csvValue(v){
 var value=String(v==null?'':v);
 return '"'+value.replace(/"/g,'""').replace(/^[=+\-@\t\r]/,'')+'"';
}
function exportCSV(){
 var hist=stored(HISTORY);
 if(!hist.length){alert('No hay simulaciones registradas.');return}
 var rows=[['ID','FECHA','METODO','ESTADO_DEMO','TOTAL_SIMULADO','ESTIMADO_SIFO','CAMBIO_SIMULADO','ARTICULOS'].join(',')];
 hist.forEach(function(h){
  rows.push([h.id,dateLabel(h.at),h.method,h.status,(h.totalCents/100).toFixed(2),
   (Number(h.estimatedCents||0)/100).toFixed(2),(Number(h.changeCents||0)/100).toFixed(2),
   Array.isArray(h.items)?h.items.map(function(i){return i.code+' '+i.name}).join(' | '):''].map(csvValue).join(','));
 });
 var blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
 var uri=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=uri;link.download='NAVARRO360_HISTORIAL_SIMULADO.csv';document.body.appendChild(link);link.click();link.remove();
 setTimeout(function(){URL.revokeObjectURL(uri)},4000);
}
function clearHistory(){
 if(!confirm('¿Eliminar el historial de simulaciones de ESTE dispositivo? Esta acción no toca ventas ni datos de SIFO.'))return;
 if(persist(HISTORY,[]))updateReports();
}
function scriptLoader(){
 if(window.Html5Qrcode)return Promise.resolve();
 if(pendingScript)return pendingScript;
 pendingScript=new Promise(function(resolve,reject){
  var script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  script.async=true;
  script.onload=function(){window.Html5Qrcode?resolve():reject(Error('Biblioteca de lectura no disponible'))};
  script.onerror=function(){reject(Error('Sin conexión con el lector de códigos'))};
  document.head.appendChild(script);
 }).catch(function(e){pendingScript=null;throw e});
 return pendingScript;
}
function scannerStatus(msg){if($('nv-pro-scan-status'))$('nv-pro-scan-status').textContent=msg}
function acceptCode(value,manual){
 if(!ready){scannerStatus('El catálogo no terminó de cargar.');return false}
 var code=String(value||'').trim().replace(/\s/g,'');
 if(!/^\d{5,30}$/.test(code)){scannerStatus('Código no válido. Debe ser numérico.');return false}
 if(code==='00000'){scannerStatus('Para PRODUCTOS VARIOS usa el botón de importe libre del catálogo.');return false}
 var p=B().getProduct(code);
 if(!p){scannerStatus('No encuentro '+code+' en el catálogo de esta versión. Puedes buscarlo manualmente.');return false}
 var now=Date.now();
 if(code===scanLastCode&&!manual&&now-scanLastAt<1700)return false;
 scanLastCode=code;scanLastAt=now;
 var items=B().getItems(),exists=items.find(function(x){return x.code===code});
 if(exists){
  var next=toCart(items);
  if(!next){scannerStatus('Carrito inválido. Revisa los productos antes de escanear.');return false}
  var n=Number(next[code].qty)+1;
  if(n>9999){scannerStatus('Cantidad máxima alcanzada.');return false}
  next[code].qty=Math.round(n*1000)/1000;
  if(!B().replace(next)){scannerStatus('No se pudo actualizar el carrito.');return false}
 }else if(!B().addCode(code)){scannerStatus('No se pudo agregar el artículo.');return false}
 scanCount++;
 scannerStatus('✓ '+p.name+' · Código '+code+' · '+scanCount+' lecturas agregadas. Puedes seguir escaneando.');
 return true;
}
function manualScan(){
 var el=$('nv-pro-manual'),code=el.value;
 if(acceptCode(code,true)){el.value='';el.focus();}
}
async function openScanner(){
 if(typeof window.NAVARRO_CAJA_ESCANER_ABRIR_V14==='function'){
  // El lector V9 abre la cámara al tocar Escanear y usa dos motores de códigos de barras.
  return window.NAVARRO_CAJA_ESCANER_ABRIR_V14();
 }
 scaffold();scannerOpen=true;scanCount=0;scanLastCode='';scanLastAt=0;
 $('nv-pro-scan').hidden=false;document.body.style.overflow='hidden';scannerStatus('Pulsa Iniciar cámara. También puedes capturar un código manualmente.');
 $('nv-pro-manual').value='';
}
async function readPhoto(file){
 if(!file)return;
 scannerStatus('Analizando foto del código de barras…');
 try{
  await stopScanner();
  await scriptLoader();
  var F=window.Html5QrcodeSupportedFormats||{};
  var photoFormats=[F.CODE_128,F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_39,F.ITF].filter(Number.isInteger);
  var photoReader=new window.Html5Qrcode('nv-pro-photo-reader',{formatsToSupport:photoFormats.length?photoFormats:undefined,verbose:false,useBarCodeDetectorIfSupported:false});
  try{
   var result=await photoReader.scanFile(file,false);
   acceptCode(result,true);
  }finally{try{await photoReader.clear()}catch(_){}}
 }catch(e){scannerStatus('No se reconoció el código en la foto. Prueba acercándote o escribe el número manualmente.')}
 finally{$('nv-pro-file').value=''}
}
async function startScanner(){
 if(scanStarting||videoReader)return;
 if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
  scannerStatus('La cámara requiere HTTPS y permiso de Safari. Puedes usar el campo manual.');return;
 }
 scanStarting=true;
 var session=++scannerSession;
 scannerStatus('Preparando la cámara del iPhone…');
 try{
  await scriptLoader();
  if(!scannerOpen||session!==scannerSession){scanStarting=false;return}
  var formats=window.Html5QrcodeSupportedFormats;
  var oneD=formats?[formats.CODE_128,formats.CODE_39,formats.EAN_13,formats.EAN_8,formats.UPC_A,formats.UPC_E,formats.ITF].filter(function(x){return x!=null}):undefined;
  var isiOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
  var reader=new window.Html5Qrcode('nv-pro-scan-video',{
   formatsToSupport:oneD&&oneD.length?oneD:undefined,
   verbose:false,useBarCodeDetectorIfSupported:!isiOS
  });
  videoReader=reader;
  await reader.start({facingMode:'environment'},{
   fps:11,aspectRatio:1.777778
  },function(code){if(scannerOpen)acceptCode(code,false)},function(){});
  if(!scannerOpen||session!==scannerSession){
   try{await reader.stop()}catch(_){}
   try{await reader.clear()}catch(_){}
   if(videoReader===reader)videoReader=null;
   return;
  }
  scannerStatus('📷 Cámara activa. Escanea códigos de uno en uno; seguirá abierta para el siguiente.');
 }catch(e){
  scannerStatus('No se pudo iniciar el lector: '+String(e&&e.message||e)+'. Comprueba permisos de cámara o captura el código manualmente.');
  try{await stopScanner()}catch(_){}
 }finally{scanStarting=false}
}
async function stopScanner(){
 ++scannerSession;
 var r=videoReader;videoReader=null;
 if(r){try{await r.stop()}catch(_){}try{await r.clear()}catch(_){}}
 var host=$('nv-pro-scan-video');
 if(host&&host.querySelector('video')){
  host.querySelectorAll('video').forEach(function(v){if(v.srcObject){v.srcObject.getTracks().forEach(function(t){t.stop()})}});
 }
 if(scannerOpen)scannerStatus('Cámara pausada. Puedes escribir un código o iniciarla otra vez.');
}
async function closeScanner(){
 scannerOpen=false;$('nv-pro-scan').hidden=true;document.body.style.overflow='';
 await stopScanner();
}
window.NAVARRO_CAJA_MODULO=Object.freeze({
 version:1,registrarVenta:registrarVenta,
 scanCode:function(code){return acceptCode(code,true)},
 diagnostics:function(){return {ready:ready,holds:stored(HOLD).length,simulations:stored(HISTORY).length,cameraActive:!!videoReader}}
});
function init(){
 if(hasStarted)return;
 hasStarted=true;
 css();scaffold();
 if(B()&&B().getProduct('7777001648')){ready=true;toast('Caja profesional de pruebas lista.')}
 document.addEventListener('navarro-caja-ready',function(){ready=true;updateHolds();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();