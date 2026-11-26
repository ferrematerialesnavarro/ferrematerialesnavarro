/* NAVARRO 360 V27 - Centro ampliado. Permanente en ?admin=panel; también compatible con la prueba.
   Se agrega sobre V26.2; NO altera carrito, impresión, SIFO, catálogo maestro
   ni ventas. Cambios al catálogo maestro son SOLO PROPUESTAS LOCALES.
   La autorización de Windows es obligatoria para generar propuestas privadas. */
(function(){
'use strict';
if(!['panel','prueba'].includes(new URLSearchParams(location.search).get('admin')))return;
if(window.NAVARRO_CENTRO_AMPLIADO_V27)return;
const $=id=>document.getElementById(id);
const panel=$('nv26-panel'),entry=$('nv26-entry');
if(!panel||!entry)return;
const DB=Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[];
const PRICE=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const ORIGINAL=new Map(DB.filter(r=>Array.isArray(r)&&/^\d{5,30}$/.test(String(r[0]))).map(r=>[String(r[0]),{code:String(r[0]),name:String(r[1]),price:Number(r[2]),origin:'base'}]));
const DRAFT_KEY='navarro360-admin-propuestas-v27';
const PAIR_KEY='navarro360_print_bridge_pair_v1';
const DEVICE_KEY='navarro-inventario-device-v22';
const NAMES=new Set(['COMPUTADORA','PABLO','DIANA','GOLI']);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const value=x=>Number.isFinite(Number(x))?Number(x):null;
let allowed=false,box='',reason='',tab='resumen',term='',filter='all',external=[],lastPublic=null,editCode='',busy=false;
const CSS=document.createElement('style');
CSS.textContent=[
'#nv26-panel [data-v27-section]:not([data-v27-active="yes"]){display:none!important}',
'#nv27-navigation{display:flex;gap:7px;overflow:auto;margin:9px 0 16px;padding:3px 0;scrollbar-width:thin}',
'.nv27-tab{flex:0 0 auto;padding:10px 12px;min-width:79px;border-radius:999px;border:1px solid #ccd9e1;background:#ecf2f6;color:#274a63;font:750 12px system-ui;cursor:pointer}',
'.nv27-tab[aria-selected="true"]{background:#176143;color:#fff;border-color:#176143}',
'.nv27-input{width:100%;box-sizing:border-box;border:1px solid #b8ccd7;border-radius:11px;padding:12px;font:15px system-ui;color:#17354c;background:#fff}',
'.nv27-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}',
'.nv27-btn{border:1px solid #bfd4c8;border-radius:9px;padding:9px 10px;background:#e9f5ee;color:#175e3c;font:750 12px system-ui;min-height:39px;cursor:pointer}',
'.nv27-btn:disabled{opacity:.5;cursor:not-allowed}',
'.nv27-row{background:#f9fcff;border:1px solid #e0e8ef;border-radius:12px;padding:11px;margin:8px 0}',
'.nv27-row strong{display:block;font:750 13px/1.4 system-ui;overflow-wrap:anywhere}',
'.nv27-row small{display:block;color:#647786;font:12px/1.5 system-ui;margin:4px 0;overflow-wrap:anywhere}',
'.nv27-field{display:block;font:750 13px system-ui;margin:9px 0}',
'.nv27-field input,.nv27-field select{display:block;margin-top:5px;box-sizing:border-box;width:100%;border:1px solid #b7cad3;border-radius:10px;padding:11px;font:15px system-ui;color:#193e56}',
'#nv27-modal[hidden]{display:none!important}',
'#nv27-modal{position:fixed;inset:0;z-index:2147483646;background:#061629c9;display:grid;place-items:center;padding:12px}',
'#nv27-form{background:#fff;color:#153447;border-radius:16px;width:min(500px,100%);max-height:95dvh;overflow:auto;padding:18px;box-sizing:border-box}',
'#nv27-form h3{margin:0 0 8px;font-size:18px}',
'#nv27-form p{font-size:12px;color:#567080}',
'.nv27-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:8px 0 16px}',
'.nv27-kpi{border:1px solid #e2ebec;background:#fff;padding:10px;border-radius:11px}',
'.nv27-kpi small{display:block;font-size:11px;color:#607687}',
'.nv27-kpi b{font-size:17px;overflow-wrap:anywhere}',
'#nv27-result-count{font:12px system-ui;color:#637d88}',
'#nv27-auth-status{overflow-wrap:anywhere;font:12px/1.5 system-ui;color:#4d6877}'
].join('');
document.head.appendChild(CSS);
const sections=panel.querySelectorAll(':scope > .nv26-section');
const originalStats=panel.querySelector(':scope > .nv26-stats');
if(originalStats)originalStats.dataset.v27Section='resumen';
if(sections[0])sections[0].dataset.v27Section='resumen';
if(sections[1])sections[1].dataset.v27Section='publicacion';
if(sections[2])sections[2].dataset.v27Section='publicacion';
const menu=document.createElement('nav');menu.id='nv27-navigation';menu.setAttribute('aria-label','Secciones del Centro');
const tabNames=[['resumen','Resumen'],['catalogo','Catálogo'],['inventario','Inventario'],['publicacion','Publicación'],['ventas','Ventas'],['clientes','Clientes'],['permisos','Permisos']];
for(const [key,label] of tabNames){
 const btn=document.createElement('button');btn.type='button';btn.className='nv27-tab';btn.dataset.v27Tab=key;btn.setAttribute('aria-selected',String(key===tab));btn.textContent=label;
 btn.addEventListener('click',()=>selectTab(key));menu.appendChild(btn);
}
const sub=$('nv26-sub');
if(sub)sub.after(menu);else panel.prepend(menu);
function section(id,title){
 const sec=document.createElement('section');sec.className='nv26-section';sec.id=id;sec.dataset.v27Section=id.replace('nv27-','');
 const h=document.createElement('h3');h.textContent=title;sec.appendChild(h);panel.appendChild(sec);return sec;
}
const catalog=section('nv27-catalogo','Buscar y administrar todo el catálogo');
catalog.innerHTML+='<p class="nv26-status">Incluye artículos originales y altas públicas. Las correcciones al catálogo original se guardan como propuestas en este celular: no se aplican automáticamente a los clientes ni a SIFO.</p><input id="nv27-find" class="nv27-input" type="search" placeholder="Código, nombre, medida o material"><div class="nv27-actions"><label style="font-size:12px">Ver <select id="nv27-filter"><option value="all">Todos</option><option value="base">Solo originales</option><option value="new">Solo nuevos</option><option value="zero">Con existencia 0</option><option value="low">Existencia menor que 5</option></select></label><span id="nv27-result-count"></span></div><div id="nv27-results"></div>';
const draftsBox=document.createElement('div');draftsBox.className='nv26-section';draftsBox.dataset.v27Section='catalogo';
draftsBox.innerHTML='<h3>Correcciones propuestas</h3><p class="nv26-status">No alteran precios de venta, fotos ni códigos originales. La publicación y migración de códigos deben validarse antes.</p><div class="nv27-actions"><button class="nv27-btn" id="nv27-export" type="button">Exportar propuestas JSON</button><span id="nv27-drafts-count" class="nv26-status"></span></div><div id="nv27-draft-list"></div>';
panel.appendChild(draftsBox);
const inventory=section('nv27-inventario','Resumen del inventario');
inventory.innerHTML+='<p class="nv26-status">Existencias de la misma fuente que la ficha de tienda; los indicadores cuentan únicamente datos recientes confirmados. Para guardar un conteo debes utilizar Ajustar stock V22 en una caja autorizada.</p><div class="nv27-kpis"><div class="nv27-kpi"><small>Productos con existencia conocida</small><b id="nv27-stock-known">—</b></div><div class="nv27-kpi"><small>Productos en cero</small><b id="nv27-stock-zero">—</b></div><div class="nv27-kpi"><small>Menos de 5 unidades</small><b id="nv27-stock-low">—</b></div><div class="nv27-kpi"><small>Sin registro local</small><b id="nv27-stock-missing">—</b></div></div><div class="nv27-actions"><button type="button" id="nv27-search-stock" class="nv27-btn">Buscar para ajustar stock</button><button type="button" id="nv27-list-low" class="nv27-btn">Ver artículos con menos de 5</button></div><p class="nv26-status">La existencia puede variar entre cajas y clientes si no hay sincronización activa. Este resumen no representa un conteo en tiempo real.</p>';
const sales=section('nv27-ventas','Ventas y reportes del móvil');
sales.innerHTML+='<p class="nv26-status">Estos datos proceden únicamente del historial guardado en ESTE navegador (hasta los últimos 100 tickets aceptados por Windows). No representan todas las sucursales ni confirman cobro bancario.</p><div class="nv27-kpis"><div class="nv27-kpi"><small>Tickets de hoy</small><b id="nv27-tickets">—</b></div><div class="nv27-kpi"><small>Marcado pagado hoy</small><b id="nv27-paid">—</b></div><div class="nv27-kpi"><small>Por cobrar hoy</small><b id="nv27-credit">—</b></div><div class="nv27-kpi"><small>Total de tickets hoy</small><b id="nv27-sales-total">—</b></div></div><div class="nv27-actions"><button id="nv27-sales-refresh" class="nv27-btn" type="button">Actualizar resumen</button><button id="nv27-reports-open" class="nv27-btn" type="button">Abrir Panel de Reportes Móvil</button></div><p id="nv27-sales-note" class="nv26-status"></p>';
const clientes=section('nv27-clientes','Clientes y créditos');
const perms=section('nv27-permisos','Dispositivos y permisos');
perms.innerHTML+='<p class="nv26-status">Cajas previstas: Computadora, Pablo, Diana y Goli. El servidor debe reconocer la identidad registrada; solo escribir el nombre de una caja no concede permisos.</p><div class="nv27-kpis"><div class="nv27-kpi"><small>Dispositivo</small><b id="nv27-device">Sin confirmar</b></div><div class="nv27-kpi"><small>Permiso para editar</small><b id="nv27-access">Bloqueado</b></div></div><p id="nv27-auth-status" role="status"></p><div class="nv27-actions"><button class="nv27-btn" id="nv27-verify" type="button">Comprobar vinculación</button></div><p class="nv26-status">Dar de alta o revocar dispositivos requiere una herramienta administrativa segura en Windows. Esta página no modifica el registro de permisos.</p>';
const modal=document.createElement('div');modal.id='nv27-modal';modal.hidden=true;
modal.innerHTML='<form id="nv27-form"><h3>✎ Preparar corrección</h3><p>Solo se guarda una propuesta local. Cambiar el código real requiere revisar SIFO, códigos de barras e inventario antes de publicar.</p><label class="nv27-field">Código actual<input name="oldCode" readonly></label><label class="nv27-field">Código correcto propuesto<input name="code" inputmode="numeric" pattern="[0-9]{5,30}" maxlength="30" required></label><label class="nv27-field">Nombre correcto<input name="name" maxlength="110" minlength="3" required></label><label class="nv27-field">Precio correcto ($)<input name="price" type="number" step="0.01" min="0.01" max="100000000" required></label><p role="status" id="nv27-editor-status"></p><button class="nv27-btn" type="button" id="nv27-cancel">Cancelar</button><button class="nv27-btn" type="submit">Guardar propuesta en este teléfono</button></form>';
document.body.appendChild(modal);
function selectTab(next){
 tab=next;
 for(const el of panel.querySelectorAll('[data-v27-section]'))el.dataset.v27Active=el.dataset.v27Section===tab?'yes':'no';
 for(const b of menu.querySelectorAll('[data-v27-tab]'))b.setAttribute('aria-selected',String(b.dataset.v27Tab===tab));
 if(next==='catalogo'){renderCatalog();renderDrafts();}
 if(next==='inventario')renderStock();
 if(next==='ventas')renderSales();
 if(next==='clientes')window.NAVARRO_CLIENTES_V299?.renderAdmin?.();
 if(next==='permisos')renderPermissions();
}
function snapshotCredentials(){
 try{
  const p=JSON.parse(localStorage.getItem(PAIR_KEY)||'null'),d=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null');
  if(!p||!d||!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(?:dev|app)\/?$/.test(String(p.url))||!/^[a-f0-9]{64}$/.test(String(p.token))||!/^[a-f0-9]{64}$/.test(String(d.deviceToken))||!/^[0-9a-f-]{36}$/i.test(String(d.deviceId)))return null;
  return {p,d};
 }catch{return null}
}
async function authorize(){
 const c=snapshotCredentials();
 allowed=false;box='';
 if(!c){reason='Este navegador no tiene una identidad de impresora e Inventario V22 vinculadas.';renderPermissions();return false;}
 try{
  const res=await fetch(c.p.url.replace(/\/$/,'')+'/inventario',{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+c.p.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},body:JSON.stringify({...c.d,action:'check'}),signal:AbortSignal.timeout(12000)});
  const data=await res.json();
  const name=String(data.box||'').toUpperCase();
  if(!res.ok||data.ok!==true||!NAMES.has(name))throw Error(res.status===403?'El servidor no reconoce este teléfono entre las cuatro cajas.':data.error||'No se pudo validar la caja.');
  allowed=true;box=name;reason='Caja confirmada por Inventario V22 de Windows. Los cambios del catálogo original siguen en modo propuesta.';
 }catch(e){reason='Sin autorización: '+String(e.message||'No se pudo contactar Windows').slice(0,220);}
 renderPermissions();renderCatalog();return allowed;
}
function rows(){
 const base=Array.from(ORIGINAL.values());
 const published=Array.isArray(external)?external.filter(x=>x&&/^\d{5,30}$/.test(String(x.code||''))&&typeof x.name==='string').map(x=>({code:String(x.code),name:x.name,price:Number(x.price),stock:Number(x.stock),origin:'alta',uid:x.uid||''})):[];
 return base.concat(published);
}
let stockRead=()=>({stock:null,confirmed:false});
function updateStockReader(){stockRead=window.NAVARRO_INVENTARIO_V22?.lectorExistencias?.()||(()=>({stock:null,confirmed:false}));}
function stockOf(r){return stockRead(r.code).stock;}
function text(parent,tag,value,klass){
 const el=document.createElement(tag);el.textContent=value;if(klass)el.className=klass;parent.appendChild(el);return el;
}
function btn(parent,label,callback){
 const b=document.createElement('button');b.type='button';b.className='nv27-btn';b.textContent=label;b.addEventListener('click',callback);parent.appendChild(b);return b;
}
function searchStore(code){
 const query=$('search'),mobile=$('search-mobile');
 if(query){query.value=code;query.dispatchEvent(new Event('input',{bubbles:true}));}
 else if(mobile){mobile.value=code;mobile.dispatchEvent(new Event('input',{bubbles:true}));}
 $('nv26-close')?.click();
 $('products')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderCatalog(){
 updateStockReader();
 const box=$('nv27-results');box.replaceChildren();
 const q=norm(term),words=q.split(' ').filter(Boolean);
 const listed=rows();
 const found=[];
 for(const p of listed){
  const qty=stockOf(p);
  if(filter==='base'&&p.origin!=='base')continue;
  if(filter==='new'&&p.origin!=='alta')continue;
  if(filter==='zero'&&(qty!==0||!stockRead(p.code).confirmed))continue;
  if(filter==='low'&&(qty===null||qty>=5||!stockRead(p.code).confirmed))continue;
  if(words.length&&!words.every(w=>norm(p.name+' '+p.code).includes(w)))continue;
  found.push(p);if(found.length>=120)break;
 }
 $('nv27-result-count').textContent=found.length>=120?'120 primeros (filtra más)':'Resultados: '+found.length;
 for(const p of found.slice(0,55)){
  const row=document.createElement('div');row.className='nv27-row';
  text(row,'strong',p.name);
  const qty=stockOf(p);
  text(row,'small',p.code+' · '+(Number.isFinite(p.price)?PRICE.format(p.price):'Precio sin confirmar')+' · '+(qty===null?'Existencia sin dato':(stockRead(p.code).confirmed?'Disponible: ':'Última existencia: ')+qty)+' · '+(p.origin==='base'?'Catálogo original':'Alta nueva'));
  const actions=document.createElement('div');actions.className='nv27-actions';
  btn(actions,'Ver en tienda',()=>searchStore(p.code));
  if(p.origin==='base'){
   const b=btn(actions,'✎ Proponer corrección',()=>openEditor(p.code));b.disabled=!allowed;b.title=allowed?'Guardar una propuesta sin afectar ventas':'Requiere vinculación real de caja';
  }else if(allowed&&window.NAVARRO_EDITOR_V25?.editar){
   btn(actions,'✎ Editar alta nueva',()=>{ $('nv26-close')?.click();window.NAVARRO_EDITOR_V25.editar(p.code); });
  }
  row.appendChild(actions);box.appendChild(row);
 }
 if(!found.length)text(box,'p','No se encontraron productos con estos filtros.','nv26-status');
 if(found.length>55)text(box,'p','Mostrando 55 artículos; escribe un nombre más específico para encontrar otros.','nv26-status');
}
function readDrafts(){
 try{const x=JSON.parse(localStorage.getItem(DRAFT_KEY)||'[]');return Array.isArray(x)?x.filter(p=>p&&ORIGINAL.has(String(p.originalCode))).slice(0,300):[]}catch{return []}
}
function saveDrafts(items){
 if(items.length>300)throw Error('Solo se permiten 300 propuestas en este dispositivo.');
 const raw=JSON.stringify(items);if(raw.length>220000)throw Error('Exporta propuestas antes de continuar.');
 localStorage.setItem(DRAFT_KEY,raw);
}
function renderDrafts(){
 const all=readDrafts(),out=$('nv27-draft-list');out.replaceChildren();
 $('nv27-drafts-count').textContent=all.length+' propuesta(s) en este teléfono';
 if(!all.length){text(out,'p','Todavía no hay correcciones propuestas.','nv26-status');return;}
 for(const d of all.slice().reverse().slice(0,40)){
  const div=document.createElement('div');div.className='nv27-row';
  text(div,'strong',d.name);
  text(div,'small',d.originalCode+(d.code===d.originalCode?'':' → '+d.code)+' · '+PRICE.format(d.price)+' · Sin publicar');
  const bar=document.createElement('div');bar.className='nv27-actions';
  const edit=btn(bar,'Editar propuesta',()=>openEditor(d.originalCode));edit.disabled=!allowed;
  const remove=btn(bar,'Descartar',()=>{
   if(!allowed||!confirm('¿Descartar la propuesta de '+d.originalCode+'?'))return;
   saveDrafts(readDrafts().filter(x=>x.originalCode!==d.originalCode));renderDrafts();
  });remove.disabled=!allowed;
  div.appendChild(bar);out.appendChild(div);
 }
}
function openEditor(code){
 if(!allowed)return alert('La caja debe estar autorizada por Windows antes de guardar correcciones.');
 const original=ORIGINAL.get(code);if(!original)return;
 editCode=code;const draft=readDrafts().find(x=>x.originalCode===code);
 const form=$('nv27-form');form.reset();form.elements.oldCode.value=code;
 form.elements.code.value=draft?.code||code;form.elements.name.value=draft?.name||original.name;
 form.elements.price.value=draft?.price??original.price;
 $('nv27-editor-status').textContent='Propuesta local: sin cambios para compradores ni SIFO.';
 modal.hidden=false;
}
$('nv27-form').addEventListener('submit',e=>{
 e.preventDefault();if(!allowed||!editCode)return;
 const f=e.currentTarget,code=f.elements.code.value.trim(),name=f.elements.name.value.trim().replace(/\s+/g,' '),price=Number(f.elements.price.value);
 if(!/^\d{5,30}$/.test(code)||name.length<3||name.length>110||!Number.isFinite(price)||price<=0||Math.round(price*100)!==price*100&&Math.abs(Math.round(price*100)-price*100)>.00001)return $('nv27-editor-status').textContent='Revisa código, nombre y precio a centavos.';
 if(code!==editCode&&(ORIGINAL.has(code)||external.some(x=>String(x.code)===code)))return $('nv27-editor-status').textContent='Ese código ya existe en el catálogo actual.';
 try{
  const draft={originalCode:editCode,originalName:ORIGINAL.get(editCode).name,originalPrice:ORIGINAL.get(editCode).price,code,name,price,at:new Date().toISOString(),status:'propuesta-local'};
  const next=readDrafts().filter(x=>x.originalCode!==editCode);next.push(draft);
  saveDrafts(next);modal.hidden=true;editCode='';renderDrafts();renderCatalog();
 }catch(err){$('nv27-editor-status').textContent=err.message||'No se pudo guardar la propuesta.';}
});
$('nv27-cancel').addEventListener('click',()=>{modal.hidden=true;editCode='';});
modal.addEventListener('click',e=>{if(e.target===modal){modal.hidden=true;editCode='';}});
$('nv27-export').addEventListener('click',()=>{
 const records=readDrafts();
 if(!records.length)return alert('Primero registra una propuesta de corrección.');
 const json=JSON.stringify({schema:'navarro360-correcciones-propuestas-v27',generatedAt:new Date().toISOString(),records},null,2);
 const uri=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=uri;a.download='NAVARRO_PROPUESTAS_CATALOGO_'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),3000);
});
function renderStock(){
 updateStockReader();
 let known=0,zero=0,low=0;
 for(const p of ORIGINAL.values()){
  const qty=stockOf(p);
  if(qty===null||!stockRead(p.code).confirmed)continue;known++;if(qty===0)zero++;if(qty<5)low++;
 }
 $('nv27-stock-known').textContent=known.toLocaleString('es-MX');
 $('nv27-stock-zero').textContent=zero.toLocaleString('es-MX');
 $('nv27-stock-low').textContent=low.toLocaleString('es-MX');
 $('nv27-stock-missing').textContent=(ORIGINAL.size-known).toLocaleString('es-MX');
}
function renderSales(){
 const api=window.NAVARRO_CORTE_CAJA_V1;
 let list=[];try{if(typeof api?.consultar==='function')list=api.consultar();}catch{}
 if(!Array.isArray(list))list=[];
 const now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 const same=list.filter(x=>{const d=new Date(x.at);return Number.isFinite(d.getTime())&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()});
 const add=arr=>PRICE.format(arr.reduce((sum,x)=>sum+(Number.isSafeInteger(x.total)?x.total:0),0)/100);
 $('nv27-tickets').textContent=same.length;
 $('nv27-paid').textContent=add(same.filter(x=>x.status==='pagado'));
 $('nv27-credit').textContent=add(same.filter(x=>x.status==='cobrar'));
 $('nv27-sales-total').textContent=add(same);
 $('nv27-sales-note').textContent='Fecha local '+today+' · '+list.length+' tickets disponibles en este navegador. Para estadísticas globales utiliza Panel de Reportes Móvil.';
}
function renderPermissions(){
 $('nv27-device').textContent=box||'Sin confirmar';
 $('nv27-access').textContent=allowed?'Autorizado':'Solo consulta';
 $('nv27-auth-status').textContent=reason||'El servidor de Windows debe confirmar esta caja. No se publican claves ni tokens.';
}
async function refreshPublic(){
 try{
  const r=await fetch('./altas-publicas-v25/catalogo.json?adminV27='+Date.now(),{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Publicación pública no disponible');
  const data=await r.json();
  if(data.version!==25||!Array.isArray(data.products))throw Error('Formato público inválido');
  external=data.products;lastPublic=data.updatedAt||null;
 }catch{external=[];lastPublic=null;}
 renderCatalog();
}
function beginReview(){
 const c=window.NAVARRO_INVENTARIO_V22?.estado?.();
 if(!c?.impresora)reason='Sin impresora registrada en este navegador. Abre la aplicación desde el mismo icono donde está vinculada.';
 authorize().then(()=>{if(tab==='catalogo')renderCatalog();});
 refreshPublic();
 window.NAVARRO_INVENTARIO_V22?.recargarTodo?.();
 renderSales();renderStock();renderPermissions();renderDrafts();
}
$('nv27-find').addEventListener('input',e=>{term=e.target.value.trim();renderCatalog();});
$('nv27-filter').addEventListener('change',e=>{filter=e.target.value;renderCatalog();});
$('nv27-search-stock').addEventListener('click',()=>{selectTab('catalogo');$('nv27-find').focus();});
$('nv27-list-low').addEventListener('click',()=>{selectTab('catalogo');$('nv27-filter').value='low';filter='low';renderCatalog();});
$('nv27-sales-refresh').addEventListener('click',renderSales);
$('nv27-reports-open').addEventListener('click',()=>window.open('https://navarro-reportes-movil.lushalder16.chatgpt.site/','_blank','noopener,noreferrer'));
$('nv27-verify').addEventListener('click',authorize);
entry.addEventListener('click',()=>{beginReview();selectTab(tab);});
window.addEventListener('pageshow',()=>{if(!$('nv26-sheet').hidden){beginReview();selectTab(tab);}});
window.addEventListener('navarro:stock-refresh',()=>{if(!$('nv26-sheet').hidden){if(tab==='inventario')renderStock();if(tab==='catalogo')renderCatalog();}});
selectTab('resumen');
window.NAVARRO_CENTRO_AMPLIADO_V27=Object.freeze({version:'27.1',refresh:beginReview,estado:()=>({autorizado:allowed,caja:box||null,originales:ORIGINAL.size,publicados:external.length,propuestas:readDrafts().length})});
})();