/* NAVARRO 360 — Centro de administración móvil V26 (prueba).
   Módulo aditivo: NO cambia carrito, precios, búsqueda, imágenes, impresión,
   SIFO, cobros ni reportes. Solo se activa con ?admin=prueba.
   Toda operación de escritura permanece en los módulos existentes y Windows.
*/
(function(){
 'use strict';
 if(new URLSearchParams(location.search).get('admin')!=='prueba')return;
 if(window.NAVARRO_ADMIN_MOBILE_V26)return;
 const PRINTER_KEY='navarro360_print_bridge_pair_v1';
 const DEVICE_KEY='navarro-inventario-device-v22';
 const VALID_TOKEN=/^[0-9a-f]{64}$/;
 const VALID_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const BOXES=new Set(['COMPUTADORA','PABLO','DIANA','GOLI']);
 const PUBLIC_URL='./altas-publicas-v25/catalogo.json';
 const MAX_PAGES=35,MAX_RECORDS=1400;
 const money=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
 let access=false,box='',checking=false,loading=false,rows=[],publicData=null,publicError='',serverError='',lastReview=null;
 let opened=false,searchText='',onlyPending=false;
 function credentials(){
  try{
   const p=JSON.parse(localStorage.getItem(PRINTER_KEY)||'null');
   const d=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null');
   if(!p||!d||typeof p.url!=='string'||!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(dev|app)\/?$/.test(p.url))return null;
   if(!VALID_TOKEN.test(p.token)||!VALID_ID.test(d.deviceId)||!VALID_TOKEN.test(d.deviceToken))return null;
   return {p,d};
  }catch{return null;}
 }
 async function bridge(action,endpoint,creds){
  const session=creds||credentials();
  if(!session)throw Error('Este dispositivo no tiene la impresora y la identidad V22 registradas.');
  const r=await fetch(session.p.url.replace(/\/$/,'')+endpoint,{
   method:'POST',credentials:'omit',redirect:'error',cache:'no-store',
   headers:{'Authorization':'Bearer '+session.p.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},
   body:JSON.stringify(Object.assign({},session.d,action)),signal:AbortSignal.timeout(16000)
  });
  let answer={};try{answer=await r.json()}catch{}
  if(!r.ok||answer.ok!==true){
   const detail=typeof answer.error==='string'?answer.error:'Windows no pudo confirmar la operación.';
   const err=Error(r.status===404?'El módulo correspondiente no está activo en Windows.':detail);
   err.status=r.status;throw err;
  }
  return answer;
 }
 const style=document.createElement('style');
 style.id='nv26-style';
 style.textContent=[
  '#nv26-entry[hidden],#nv26-sheet[hidden],#nv26-note[hidden]{display:none!important}',
  '#nv26-entry{display:flex;align-items:center;gap:9px;margin:10px 6px 12px;padding:13px 16px;border:1px solid #afc2d7;border-radius:13px;background:#0e3155;color:#fff;font:750 14px system-ui;cursor:pointer;box-shadow:0 6px 17px #06182b20}',
  '#nv26-entry span{font-weight:400;font-size:12px;color:#c5d8e9}',
  '#nv26-note{margin:8px 6px;font:12px/1.4 system-ui;color:#51677a}',
  '#nv26-sheet{position:fixed;inset:0;z-index:2147483643;display:flex;justify-content:center;align-items:flex-end;background:#071525bc;padding:0}',
  '#nv26-panel{box-sizing:border-box;background:#f5f8fb;color:#172e45;width:min(760px,100%);max-height:calc(100dvh - 12px);overflow:auto;overscroll-behavior:contain;border-radius:22px 22px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -12px 50px #0006;font:14px/1.4 system-ui}',
  '#nv26-head{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:6px}',
  '#nv26-head h2{margin:0;font-size:19px;letter-spacing:-.3px}',
  '#nv26-sub{color:#526d80;font-size:12px;margin:0 0 14px}',
  '#nv26-close{padding:7px 11px;background:#e3eaf1;border:0;border-radius:11px;font:700 19px system-ui;color:#213c55;cursor:pointer}',
  '.nv26-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:11px 0 16px}',
  '.nv26-stat{background:#fff;border:1px solid #e0e7ed;border-radius:13px;padding:12px;min-width:0}',
  '.nv26-label{color:#617786;font:12px/1.2 system-ui;display:block}',
  '.nv26-number{font:750 18px/1.3 system-ui;display:block;margin-top:4px;overflow-wrap:anywhere}',
  '.nv26-section{border-radius:15px;background:#fff;border:1px solid #e0e7ed;padding:13px;margin-bottom:12px}',
  '.nv26-section h3{margin:0 0 10px;font:750 15px system-ui}',
  '.nv26-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
  '.nv26-btn{background:#ecf3f7;color:#173f56;border:1px solid #c7d6df;border-radius:10px;padding:10px;text-align:center;font:700 12px/1.3 system-ui;cursor:pointer;min-height:46px}',
  '.nv26-primary{background:#166345;color:#fff;border-color:#166345}',
  '.nv26-btn:disabled{opacity:.5;cursor:not-allowed}',
  '#nv26-find{box-sizing:border-box;width:100%;font:15px system-ui;border:1px solid #bdcad5;border-radius:11px;padding:12px;background:#fff;color:#18374e}',
  '.nv26-list{display:grid;gap:9px;margin-top:9px;max-height:330px;overflow:auto}',
  '.nv26-item{border-radius:11px;padding:11px;border:1px solid #e1e8eb;background:#f9fcff;min-width:0}',
  '.nv26-title{font:700 13px system-ui;overflow-wrap:anywhere}',
  '.nv26-meta{font:12px/1.45 system-ui;color:#5d7482;overflow-wrap:anywhere;margin:4px 0}',
  '.nv26-item-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}',
  '.nv26-sm{font:700 12px system-ui;border-radius:9px;border:1px solid #c4d8cf;background:#e9f5ed;color:#185e3a;padding:8px 10px;cursor:pointer}',
  '.nv26-status{font:12px/1.4 system-ui;margin:5px 0;color:#725419}',
  '#nv26-errors{color:#895324;white-space:pre-wrap;font:12px/1.4 system-ui;overflow-wrap:anywhere}',
  '#nv26-pending{accent-color:#166345}',
  '@media(min-width:650px){#nv26-panel{border-radius:22px;max-height:94vh;margin-bottom:3vh;padding:22px}.nv26-stats{grid-template-columns:repeat(4,minmax(0,1fr))}}'
 ].join('');
 document.head.appendChild(style);
 const entry=document.createElement('button');
 entry.id='nv26-entry';entry.type='button';entry.hidden=true;
 entry.innerHTML='⚙️ Centro de administración <span id="nv26-box"></span>';
 const anchor=document.getElementById('filters')||document.getElementById('products');
 if(anchor?.parentElement)anchor.parentElement.insertBefore(entry,anchor);
 else document.body.appendChild(entry);
 const note=document.createElement('p');
 note.id='nv26-note';note.hidden=true;
 entry.after(note);
 const sheet=document.createElement('section');
 sheet.id='nv26-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
 sheet.setAttribute('aria-labelledby','nv26-heading');
 sheet.innerHTML=[
  '<div id="nv26-panel">',
   '<div id="nv26-head"><h2 id="nv26-heading">⚙️ Administración NAVARRO 360</h2><button id="nv26-close" type="button" aria-label="Cerrar administración">×</button></div>',
   '<p id="nv26-sub">Funciones de personal · Sin cambios en el sistema de cobro</p>',
   '<div class="nv26-stats">',
    '<div class="nv26-stat"><span class="nv26-label">Caja autorizada</span><strong class="nv26-number" id="nv26-caja">—</strong></div>',
    '<div class="nv26-stat"><span class="nv26-label">Altas en Windows</span><strong class="nv26-number" id="nv26-local-count">—</strong></div>',
    '<div class="nv26-stat"><span class="nv26-label">Altas públicas</span><strong class="nv26-number" id="nv26-public-count">—</strong></div>',
    '<div class="nv26-stat"><span class="nv26-label">Pendientes de publicar</span><strong class="nv26-number" id="nv26-pending-count">—</strong></div>',
   '</div>',
   '<div class="nv26-section"><h3>Acciones rápidas</h3><div class="nv26-actions">',
    '<button class="nv26-btn nv26-primary" data-nv26="add" type="button">＋ Agregar producto</button>',
    '<button class="nv26-btn" data-nv26="generate" type="button">▥ Generar código</button>',
    '<button class="nv26-btn" data-nv26="stock" type="button">📦 Ajustar existencia</button>',
    '<button class="nv26-btn" data-nv26="publish" type="button">↻ Publicar pendientes</button>',
    '<button class="nv26-btn" data-nv26="reports" type="button">📈 Ver reportes</button>',
    '<button class="nv26-btn" data-nv26="refresh" type="button">⟳ Revisar sincronización</button>',
   '</div><p class="nv26-status" id="nv26-info">El botón de agregar y el editor reutilizan los módulos V25 existentes.</p></div>',
   '<div class="nv26-section"><h3>Productos añadidos por nuestras cajas</h3>',
    '<input type="search" id="nv26-find" placeholder="Filtrar por nombre o código" aria-label="Buscar productos nuevos">',
    '<label style="display:flex;align-items:center;gap:8px;margin:10px 0;font-size:12px"><input type="checkbox" id="nv26-pending"> Mostrar solo pendientes de publicación</label>',
    '<div class="nv26-list" id="nv26-list"></div>',
    '<p class="nv26-status">Los productos originales siguen protegidos. Sus nombres y códigos no se pueden corregir desde este panel.</p>',
   '</div>',
   '<div class="nv26-section"><h3>Estado de sincronización</h3><p id="nv26-updated" class="nv26-status">Consultando publicación…</p><p id="nv26-errors"></p></div>',
  '</div>'
 ].join('');
 document.body.appendChild(sheet);
 const $=id=>document.getElementById(id);
 function show(t){$('nv26-info').textContent=t||'';}
 function numeric(id,val){$(id).textContent=val===null||val===undefined?'—':String(val);}
 function isPublished(row,published){
  if(!published)return null;
  const remote=published.get(String(row.code));
  if(!remote)return false;
  return String(remote.name||'').trim()===String(row.name||'').trim()&&
   Number(remote.price)===Number(row.price)&&
   String(remote.cat||'')===String(row.cat||'')&&String(remote.unit||'')===String(row.unit||'');
 }
 async function verify(){
  if(checking)return access;
  checking=true;
  try{
   const candidate=credentials();
   if(!candidate)throw Error('Caja no vinculada');
   const result=await bridge({action:'check'},'/inventario',candidate);
   const name=String(result.box||'').toUpperCase();
   if(!BOXES.has(name))throw Error('Caja no permitida');
   access=true;box=name;entry.hidden=false;note.hidden=true;
   $('nv26-box').textContent='· '+name;
   numeric('nv26-caja',name);
   return true;
  }catch(e){
   access=false;box='';entry.hidden=true;sheet.hidden=true;opened=false;
   note.hidden=false;
   note.textContent='Centro de administración en prueba: esta sesión todavía no está reconocida por el inventario de Windows. No se modificó ningún dato.';
   return false;
  }finally{checking=false;}
 }
 async function fetchPublic(){
  const response=await fetch(PUBLIC_URL+'?adminCheck='+Date.now(),{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('GitHub Pages no respondió al consultar el catálogo público.');
  const json=await response.json();
  if(!json||json.version!==25||!Array.isArray(json.products))throw Error('El catálogo público tiene un formato inesperado.');
  return json;
 }
 async function listWindows(){
  const data=[],candidate=credentials();let cursor=null,n=0;
  if(!candidate)throw Error('Esta caja perdió su vinculación.');
  do{
   const r=await bridge({action:'list',cursor},'/productos',candidate);
   if(!Array.isArray(r.rows))throw Error('El listado de productos de Windows no es válido.');
   data.push(...r.rows);
   if(data.length>MAX_RECORDS)throw Error('Demasiados resultados para el Centro móvil.');
   cursor=r.cursor;
   if(++n>MAX_PAGES)throw Error('La consulta devolvió demasiadas páginas.');
  }while(cursor!==null&&cursor!==undefined);
  return data.filter(p=>p&&typeof p==='object'&&/^\d{5,30}$/.test(String(p.code))&&typeof p.name==='string');
 }
 function buildRow(p,status){
  const el=document.createElement('div');el.className='nv26-item';
  const title=document.createElement('div');title.className='nv26-title';title.textContent=p.name;el.appendChild(title);
  const meta=document.createElement('div');meta.className='nv26-meta';
  const price=Number(p.price);const shownPrice=Number.isFinite(price)?money.format(price):'Precio no disponible';
  const state=status===null?'Publicación no comprobada':status?'Publicado':'Pendiente';
  meta.textContent='Código '+p.code+' · '+shownPrice+' · '+state;el.appendChild(meta);
  const actions=document.createElement('div');actions.className='nv26-item-actions';
  const go=document.createElement('button');go.className='nv26-sm';go.type='button';go.textContent='Ver producto';go.addEventListener('click',()=>goToProduct(p.code));actions.appendChild(go);
  if(p.uid&&p.updatedAt&&window.NAVARRO_EDITOR_V25?.editar){
   const edit=document.createElement('button');edit.className='nv26-sm';edit.type='button';edit.textContent='✎ Editar ficha';
   edit.addEventListener('click',()=>{close();window.NAVARRO_EDITOR_V25.editar(p.code);});
   actions.appendChild(edit);
  }
  el.appendChild(actions);return el;
 }
 function render(){
  numeric('nv26-caja',box||null);
  numeric('nv26-local-count',serverError?null:rows.length);
  const pubMap=publicData?new Map(publicData.products.filter(x=>x&&x.code).map(x=>[String(x.code),x])):null;
  numeric('nv26-public-count',publicData?publicData.products.length:null);
  const pending=pubMap?rows.filter(p=>isPublished(p,pubMap)===false):null;
  numeric('nv26-pending-count',pending?pending.length:null);
  const list=$('nv26-list');list.replaceChildren();
  if(serverError){
   const p=document.createElement('p');p.className='nv26-status';p.textContent='No se pudo leer la lista de Windows. No afecta el catálogo público.';list.appendChild(p);
  }else{
   const query=searchText.toUpperCase();
   const matched=rows.filter(p=>(!query||(String(p.code)+' '+p.name).toUpperCase().includes(query))&&(!onlyPending||!pubMap||isPublished(p,pubMap)===false));
   for(const p of matched.slice(0,80))list.appendChild(buildRow(p,isPublished(p,pubMap)));
   const count=document.createElement('p');count.className='nv26-status';
   count.textContent=matched.length===0?'No hay productos que coincidan.':matched.length>80?'Mostrando 80 de '+matched.length+'; filtra por nombre o código.':'Mostrando '+matched.length+' producto(s).';
   list.appendChild(count);
  }
  const when=publicData?.updatedAt?new Date(publicData.updatedAt):null;
  $('nv26-updated').textContent=publicData?
   'Catálogo público: '+publicData.products.length+' altas · '+(when&&!isNaN(when.getTime())?'Último cambio: '+when.toLocaleString('es-MX',{timeZone:'America/Mexico_City'}):'Sin fecha de publicación'):'No fue posible verificar el catálogo público.';
  $('nv26-errors').textContent=[serverError&&'Windows: '+serverError,publicError&&'Catálogo público: '+publicError].filter(Boolean).join('\n');
 }
 async function review(){
  if(loading)return;
  if(!await verify())return;
  loading=true;serverError='';publicError='';show('Consultando Windows y la publicación pública…');
  const [server,pub]=await Promise.allSettled([listWindows(),fetchPublic()]);
  if(server.status==='fulfilled')rows=server.value;
  else{rows=[];serverError=server.reason?.message||'Sin conexión';}
  if(pub.status==='fulfilled')publicData=pub.value;
  else{publicData=null;publicError=pub.reason?.message||'Sin conexión';}
  lastReview=Date.now();loading=false;render();
  show(serverError||publicError?'Revisión parcial. Revisa los errores de sincronización.':'Revisión completada. Los pendientes se calculan sin modificar datos.');
 }
 function close(){sheet.hidden=true;opened=false;}
 function goToProduct(code){
  close();
  const input=$('search'),mobile=$('search-mobile');
  if(input){input.value=String(code);input.dispatchEvent(new Event('input',{bubbles:true}));}
  else if(mobile){mobile.value=String(code);mobile.dispatchEvent(new Event('input',{bubbles:true}));}
  const section=$('products');section?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 entry.addEventListener('click',async()=>{
  if(!await verify())return;
  sheet.hidden=false;opened=true;
  show('Centro de administración abierto en modo prueba.');
  if(!lastReview||Date.now()-lastReview>120000)await review();
  else render();
 });
 $('nv26-close').addEventListener('click',close);
 sheet.addEventListener('click',e=>{if(e.target===sheet)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.stopPropagation();close();}});
 $('nv26-find').addEventListener('input',e=>{searchText=e.target.value.trim();render();});
 $('nv26-pending').addEventListener('change',e=>{onlyPending=e.target.checked;render();});
 sheet.addEventListener('click',e=>{
  const button=e.target.closest('[data-nv26]');if(!button)return;
  const action=button.dataset.nv26;
  if(!access)return;
  if(action==='refresh'){review();return;}
  if(action==='reports'){window.open('https://navarro-reportes-movil.ferrematerialesnavar.chatgpt.site/','_blank','noopener,noreferrer');return;}
  if(action==='stock'){
   const code=prompt('Código del producto al que quieres ajustar existencia:');
   if(code===null)return;
   if(!/^\d{5,30}$/.test(code.trim()))return show('Introduce un código de producto válido.');
   goToProduct(code.trim());return;
  }
  if(action==='add'||action==='generate'){
   const btn=$('nv23-open');
   if(!btn||btn.hidden)return show('El módulo de altas V25 no está disponible para esta caja.');
   close();btn.click();
   if(action==='generate'){
    const b=$('nv24-generate');
    if(b)b.click();
   }
   return;
  }
  if(action==='publish'){
   const publish=$('nv25-publicar-pendientes');
   if(!publish||publish.hidden)return show('La función para publicar no está disponible en el módulo V25.');
   close();publish.click();return;
  }
 });
 window.addEventListener('pageshow',()=>{if(opened)review();else verify();});
 verify();
 window.NAVARRO_ADMIN_MOBILE_V26=Object.freeze({version:26,mode:'prueba',refresh:review});
})();