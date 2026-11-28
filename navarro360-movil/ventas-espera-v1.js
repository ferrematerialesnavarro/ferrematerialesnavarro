
/* NAVARRO 360 V29.7 — Reutiliza las ventas en espera V1 y su misma clave local.
   No carga sus antiguos editores de precios ni toca el cierre de ventas.
   Un presupuesto es un borrador imprimible; no se llama al puente /print ni a reportes. */
(function(){
'use strict';
if(window.NAVARRO_VENTAS_ESPERA_V1)return;
const KEY='navarro360_ventas_en_espera_v1',MAX=30,$=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n/100);
const api=()=>window.NAVARRO_BORRADOR_CARRITO;
const linked=()=>window.NAVARRO_PRINT_SILENCIOSA?.vinculado?.()===true;
const delivery=()=>window.NAVARRO_COBRANZA_ENTREGA;
const make=(tag,label,parent)=>{const x=document.createElement(tag);if(label!==undefined)x.textContent=label;if(parent)parent.append(x);return x};
const button=(label,parent,fn)=>{const b=make('button',label,parent);b.type='button';b.addEventListener('click',fn);return b};
function load(){
 const raw=localStorage.getItem(KEY);if(raw===null)return [];
 const list=JSON.parse(raw);
 if(!Array.isArray(list)||list.some(d=>!d||typeof d.id!=='string'||!d.cart||typeof d.cart!=='object'||Array.isArray(d.cart)))throw Error('No se pudo leer el historial guardado. No se modificará.');
 return list;
}
function store(list){const raw=JSON.stringify(list);localStorage.setItem(KEY,raw);if(localStorage.getItem(KEY)!==raw)throw Error('No se confirmó el guardado.');}

const SHARED='navarro-recuperador-v3044-activo',PENDING='navarro-recuperador-v3044-pendiente:';
let remoteDocs=[],remoteBox='',remoteOnline=false,remoteLoading=false;
function context(){
 const i=window.NAVARRO_INVENTARIO_V22?.estado?.();
 try{const p=JSON.parse(localStorage.getItem('navarro360_print_bridge_pair_v1')||'null'),d=JSON.parse(localStorage.getItem('navarro-inventario-device-v22')||'null');
 if(!i?.reconocido||!['COMPUTADORA','PABLO','DIANA','GOLI'].includes(i.caja)||!p||!d||!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(dev|app)\/?$/.test(p.url)||!/^[a-f0-9]{64}$/.test(p.token)||!/^[a-f0-9-]{36}$/i.test(d.deviceId)||!/^[a-f0-9]{64}$/.test(d.deviceToken))return null;
 return {box:i.caja,url:p.url.replace(/\/$/,''),token:p.token,deviceId:d.deviceId,deviceToken:d.deviceToken,key:i.caja+':'+d.deviceId};
 }catch{return null}
}
async function call(ctx,p){
 if(!ctx||context()?.key!==ctx.key)throw Error('Caja no reconocida. Comprueba la vinculación.');
 const r=await fetch(ctx.url+'/recuperador-v3044',{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+ctx.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},body:JSON.stringify({...p,deviceId:ctx.deviceId,deviceToken:ctx.deviceToken}),signal:AbortSignal.timeout(15000)});
 let x;try{x=await r.json()}catch{}
 if(context()?.key!==ctx.key)throw Error('Cambió la caja durante la operación.');
 if(!r.ok||x?.ok!==true||x.box!==ctx.box)throw Object.assign(Error(x?.error||'No se confirmó la operación en Windows.'),{status:r.status});
 return x;
}
async function sharedCheck(ctx){
 if(!ctx){if(localStorage.getItem(SHARED))throw Error('Comprueba la vinculación de la caja.');return false}
 try{const x=await call(ctx,{action:'check'});if(x.version!==3044)throw Error('Versión del recuperador incompatible.');localStorage.setItem(SHARED,'1');return true}
 catch(e){if(e.status===404&&!localStorage.getItem(SHARED))return false;throw e}
}
function pending(ctx,kind){const raw=localStorage.getItem(PENDING+ctx.key+':'+kind);return raw?JSON.parse(raw):null}
function journal(ctx,kind,value){const k=PENDING+ctx.key+':'+kind,raw=JSON.stringify(value);localStorage.setItem(k,raw);if(localStorage.getItem(k)!==raw)throw Error('No se pudo guardar la operación pendiente.')}
function unjournal(ctx,kind){localStorage.removeItem(PENDING+ctx.key+':'+kind)}
function currentSignature(){return JSON.stringify([api().capture(),delivery().exportState(),String($('nv-ticket-client')?.value||'').trim().slice(0,100)])}
async function refreshShared(){
 if(remoteLoading)return;remoteLoading=true;const ctx=context();
 try{if(!ctx||!await sharedCheck(ctx)){remoteOnline=false;remoteDocs=[];remoteBox='';return}
 const x=await call(ctx,{action:'list'});if(!Array.isArray(x.docs)||x.docs.length>300)throw Error('Lista de Windows inválida');
 remoteDocs=x.docs;remoteBox=ctx.key;remoteOnline=true;
 }catch(e){remoteOnline=false;if(remoteBox!==ctx?.key){remoteDocs=[];remoteBox=''}if(dialog?.open)say('Recuperador compartido: '+e.message)}
 finally{remoteLoading=false;if(dialog?.open&&!busy)render();sync()}
}
async function saveShared(kind,ctx,snap,info,state,client){
 if(pending(ctx,'take'))throw Error('Primero resuelve la recuperación pendiente.');
 const sig=JSON.stringify([snap,state,client]);let p=pending(ctx,'save');
 if(p&&(p.signature!==sig||p.doc.kind!==kind))throw Error('Hay un guardado pendiente. Conserva el carrito original y elige el mismo tipo de documento antes de repetir.');
 if(!p){
  const printer=window.NAVARRO_PRINT_SILENCIOSA,d=makeDraft(kind,snap,info,state,client,'',Date.now());
  say('Reservando folio compartido…');const r=await printer.reservarFolioBorrador(d);
  if(currentSignature()!==sig)throw Error('El carrito cambió. Revisa antes de guardar.');
  d.folio=r.folio;d.draftJobId=r.jobId;d.at=r.at;d.id=(kind==='presupuesto'?'P-':'NV-')+r.folio;
  // El carrito puede conservar precios temporales de renglones ya eliminados.
  for(const k of ['prices','clavos','importes'])d[k]=Object.fromEntries(Object.entries(d[k]||{}).filter(([id])=>Object.hasOwn(d.cart,id)));
  p={signature:sig,doc:d,reservation:r};journal(ctx,'save',p);
 }
 say('Guardando en la computadora principal…');const result=await call(ctx,{action:'save',doc:p.doc});
 if(result.state!=='guardado'||result.doc?.draftJobId!==p.doc.draftJobId)throw Error('El documento ya no está pendiente en Windows. Revisa su folio antes de repetir.');
 if(currentSignature()!==sig)throw Error('Documento guardado en Windows; el carrito cambió y se conservó. No lo dupliques.');
 const cleared=api().restore({cart:{},clavos:{},importes:{},prices:{}});
 if(!cleared.ok)throw Error('Documento guardado en Windows; no se pudo vaciar el carrito. No dupliques la venta.');
 resetMeta();
 try{await window.NAVARRO_PRINT_SILENCIOSA?.confirmarFolioBorrador?.(p.reservation)}catch{}
 unjournal(ctx,'save');
 say('Folio '+p.doc.folio+' guardado en las cuatro cajas. No se registró una venta.');
 remoteDocs=[{...p.doc,sourceBox:ctx.box},...remoteDocs.filter(x=>x.draftJobId!==p.doc.draftJobId)];remoteBox=ctx.key;remoteOnline=true;render();
 if(kind==='presupuesto')await print(p.doc);else dialog.close();
}
async function recoverShared(d){
 if(busy||!linked())return;busy=true;sync();const ctx=context();
 try{
  if(!ctx)throw Error('Caja no reconocida.');
  if(pending(ctx,'save'))throw Error('Primero resuelve el guardado pendiente.');
  if(Object.keys(api().capture().cart).length)throw Error('Primero termina o guarda el carrito actual.');
  let p=pending(ctx,'take');
  if(p&&p.job!==d.draftJobId)throw Error('Hay una recuperación pendiente. Reintenta ese folio primero.');
  if(!p){
   if(Array.isArray(d.rows)&&d.rows.some(r=>!window.NAVARRO_PRECIOS_CATALOGO?.get?.(r.id)))throw Error('Hay un producto aún no disponible en esta caja. Actualiza el catálogo antes de recuperar.');
   p={job:d.draftJobId,folio:d.folio,operation:crypto.randomUUID()};journal(ctx,'take',p)
  }
  const x=await call(ctx,{action:'take',job:p.job,operation:p.operation});
  if(x.state!=='recuperado'||x.doc?.draftJobId!==p.job)throw Error('Respuesta de recuperación inválida.');
  if(Object.keys(api().capture().cart).length)throw Error('La recuperación quedó reservada para esta caja. Vacía el carrito y reintenta el folio.');
  const doc=x.doc;
  // Mantener el precio del documento aunque otra caja haya actualizado el oficial.
  const restored={...doc,prices:{...doc.prices}};
  for(const row of doc.rows){const p=window.NAVARRO_PRECIOS_CATALOGO?.get?.(row.id);if(!p)throw Error('Falta el producto '+row.id+'. Actualiza el catálogo y reintenta el folio pendiente.');if(p.cents!==row.unit)restored.prices[row.id]=row.unit;}
  const result=api().restore(restored);if(!result.ok)throw Error(result.reason||'No se pudo restaurar. Reintenta el folio pendiente.');
  try{resetMeta();if(doc.delivery&&!delivery()?.restoreState?.(doc.delivery))throw Error('Datos de entrega no restaurados');if($('nv-ticket-client'))$('nv-ticket-client').value=String(doc.client||'').slice(0,100);unjournal(ctx,'take')}
  catch(e){const undo=api().restore({cart:{},clavos:{},importes:{},prices:{}});if(undo.ok)resetMeta();throw Error('Recuperación pendiente. '+(undo.ok?'Reintenta el mismo folio.':'Revisa el carrito antes de reintentar.'))}
  remoteDocs=remoteDocs.filter(x=>x.draftJobId!==p.job);dialog.close();
 }catch(e){if(e.status===409||e.status===404){try{unjournal(ctx,'take')}catch{}}say(e.message||'No se confirmó la recuperación. Reintenta el folio pendiente.');}
 finally{busy=false;sync();void refreshShared()}
}
async function deleteShared(d){
 if(busy||!confirm('¿Eliminar este documento de todas las cajas?'))return;busy=true;sync();const ctx=context();
 try{if(!ctx)throw Error('Caja no reconocida');const x=await call(ctx,{action:'delete',job:d.draftJobId,operation:crypto.randomUUID()});if(x.state!=='eliminado')throw Error('No se confirmó la eliminación');remoteDocs=remoteDocs.filter(x=>x.draftJobId!==d.draftJobId);}
 catch(e){say(e.message)}finally{busy=false;sync();void refreshShared()}
}

async function reconcileSave(){
 if(busy)return;busy=true;sync();
 const ctx=context();
 try{
  if(!ctx)throw Error('Caja no reconocida.');
  const p=pending(ctx,'save');if(!p)return;
  if(Object.keys(api().capture().cart).length&&currentSignature()===p.signature)throw Error('El carrito original sigue abierto. Pulsa el mismo botón Guardar venta o Guardar e imprimir presupuesto.');
  const r=await call(ctx,{action:'save',doc:p.doc});
  if(!['guardado','recuperado','eliminado'].includes(r.state)||r.doc?.draftJobId!==p.doc.draftJobId)throw Error('No se confirmó el documento.');
  if(!confirm('Folio '+p.doc.folio+' confirmado en Windows ('+r.state+'). ¿Quitar solamente el aviso pendiente y conservar el carrito actual?'))return;
  try{await window.NAVARRO_PRINT_SILENCIOSA?.confirmarFolioBorrador?.(p.reservation)}catch{}
  unjournal(ctx,'save');say('Guardado verificado. El carrito actual no se modificó.');
 }catch(e){say(e.message)}finally{busy=false;sync();void refreshShared()}
}
function makeDraft(kind,snap,info,state,client,id,at){
 if(!['venta','presupuesto'].includes(kind)||!snap.rows.length||!Number.isSafeInteger(snap.subtotal)||snap.subtotal<=0||![0,5000].includes(info.flete))throw Error('Revisa el carrito y sus importes.');
 return {id,at,kind,...snap,delivery:state,client,payment:'none',flete:info.flete};
}
function resetMeta(){
 delivery()?.reset?.();window.NAVARRO_CAJA_EXPRES_V3?.limpiarMetodo?.();
 for(const id of ['nv-ticket-client','nv-credit-ref','nv-ce-v2-cash'])if($(id))$(id).value='';
 if($('nv-ticket-status'))$('nv-ticket-status').value='none';
 if($('nv-ticket-flete'))$('nv-ticket-flete').checked=false;
}
let dialog,entry,status,list,search,saveSale,saveQuote,busy=false;
function say(s){status.textContent=s;}
let printingBudget=false;
async function print(d){
 if(printingBudget)return;
 printingBudget=true;say('Enviando presupuesto a la impresora térmica…');
 try{
  const result=await window.NAVARRO_PRINT_SILENCIOSA?.imprimirPresupuesto?.(d);
  if(!result?.ok){say((result?.error||'Impresión directa no disponible.')+' El presupuesto sigue guardado.');return;}
  say('Presupuesto enviado a la cola de Windows. No se registró como venta.');
 }catch(e){say('No se pudo confirmar la impresión. El presupuesto sigue guardado.');}
 finally{printingBudget=false;}
}
async function save(kind){
 if(busy||!linked())return;
 busy=true;
 try{
  // snapshot() aplica la lógica de flete que utiliza la venta normal.
  const info=delivery()?.snapshot?.();if(!info)throw Error('No están listos los datos de entrega.');
  const snap=api().capture(),state=delivery().exportState(),before=load();
  if(!snap.rows.length)throw Error('Agrega productos al carrito.');
  const client=String($('nv-ticket-client')?.value||'').trim().slice(0,100);
  const ctx=context();
  if(await sharedCheck(ctx)){await saveShared(kind,ctx,snap,info,state,client);return;}
  if(before.length>=MAX)throw Error('Hay 30 documentos guardados. Recupera o elimina uno primero.');
  const d=makeDraft(kind,snap,info,state,client,'',Date.now());
  const signature=JSON.stringify([snap,state,client]);
  const printer=window.NAVARRO_PRINT_SILENCIOSA;
  if(typeof printer?.reservarFolioBorrador!=='function')throw Error('Recarga NAVARRO 360 para guardar con folio.');
  say('Asignando folio compartido…');sync();
  const r=await printer.reservarFolioBorrador(d);
  if(JSON.stringify([api().capture(),delivery().exportState(),String($('nv-ticket-client')?.value||'').trim().slice(0,100)])!==signature)throw Error('El carrito cambió mientras se asignaba el folio. Revisa antes de guardar.');
  const current=load();
  if(current.length>=MAX)throw Error('Hay 30 documentos guardados. Recupera o elimina uno primero.');
  d.folio=r.folio;d.draftJobId=r.jobId;d.at=r.at;d.id=(kind==='presupuesto'?'P-':'NV-')+r.folio;
  if(current.some(x=>x.id===d.id||x.draftJobId===d.draftJobId))throw Error('Este documento ya está guardado. Búscalo por su folio.');
  store([d,...current]);
  const cleared=api().restore({cart:{},clavos:{},importes:{},prices:{}});
  if(!cleared.ok){store(current);throw Error('No se pudo liberar el carrito. Se conservó la venta actual.');}
  resetMeta();if(search)search.value='';render();
  try{await printer.confirmarFolioBorrador(r)}catch(e){say('Folio '+d.folio+' guardado localmente. Revisa la conexión con Windows.');return;}
  say('Folio '+d.folio+' · '+(kind==='presupuesto'?'Presupuesto guardado. No se registró una venta.':'Venta guardada. Carrito libre para otro cliente.'));
  if(kind==='presupuesto')await print(d);else dialog.close();
 }catch(e){say(e.message||'No se pudo guardar. Revisa el carrito.');}
 finally{busy=false;sync();if(dialog?.open)void refreshShared();}
}
function recover(d){
 if(busy||!linked())return;
 busy=true;
 try{
  if(Object.keys(api().capture().cart).length)throw Error('Primero guarda o termina el carrito actual.');
  const old=load();if(!old.some(x=>x.id===d.id))throw Error('Ya no está guardado.');
  const result=api().restore(d);if(!result.ok)throw Error(result.reason);
  try{
   resetMeta();
   if(d.delivery&&!delivery()?.restoreState?.(d.delivery))throw Error('No se recuperaron los datos de entrega.');
   if($('nv-ticket-client'))$('nv-ticket-client').value=String(d.client||'').slice(0,100);
   // Solo eliminar tras restaurar carrito, entrega y nombre correctamente.
   store(old.filter(x=>x.id!==d.id));
  }catch(e){
   const undo=api().restore({cart:{},clavos:{},importes:{},prices:{}});
   if(undo.ok)resetMeta();
   throw Error('No se completó la recuperación; el documento sigue guardado. '+(undo.ok?'':'Revisa el carrito antes de repetir.'));
  }
  dialog.close();
 }catch(e){say(e.message||'No se pudo recuperar.');}
 finally{busy=false;sync();}
}
function render(){
 list.replaceChildren();
 let docs;try{docs=load()}catch(e){say(e.message);return}
 const ctx=context(),shared=ctx&&remoteBox===ctx.key?remoteDocs:[];
 make('p',remoteOnline?'Base compartida conectada · '+shared.length+' documentos':'Documentos locales · conexión compartida sin confirmar',list);
 if(ctx){try{const pendingSave=pending(ctx,'save');if(pendingSave){const r=make('div',undefined,list);make('strong','Guardado pendiente · Folio '+pendingSave.doc.folio,r);button('Verificar guardado',r,reconcileSave);}const p=pending(ctx,'take');if(p){const row=make('div',undefined,list);make('strong','Recuperación pendiente · Folio '+p.folio,row);button('Reintentar recuperación',row,()=>recoverShared({draftJobId:p.job,folio:p.folio}));}}catch(e){say(e.message)}}
 docs=[...shared.map(d=>({...d,shared:true})),...docs];
 const q=String(search?.value||'').trim().toLocaleLowerCase('es-MX');
 const filtered=docs.filter(d=>!q||[d.folio,d.id,d.client].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(q)));
 if(!filtered.length)make('p',docs.length?'No hay coincidencias con ese folio o cliente.':'No hay ventas ni presupuestos guardados.',list);
 for(const d of filtered){
  const row=make('div',undefined,list);row.className='nv-draft-row';
  const quote=d.kind==='presupuesto';
  make('strong',(quote?'Presupuesto':'Venta guardada')+' · Folio '+(d.folio||d.id),row);
  const total=Number.isSafeInteger(d.subtotal)?' · '+money(d.subtotal+(d.flete||0)):'';
  make('small',(d.shared?'Caja '+d.sourceBox+' · Compartido · ':'Guardado en este dispositivo · ')+new Date(d.at).toLocaleString('es-MX')+' · '+Object.keys(d.cart).length+' productos'+total,row);
  const actions=make('div',undefined,row);
  button('Recuperar',actions,()=>d.shared?recoverShared(d):recover(d));
  if(quote)button('Imprimir',actions,()=>{if(linked()&&!busy)print(d)});
  button('Eliminar',actions,()=>{if(d.shared){void deleteShared(d);return}if(busy||!linked()||!confirm('¿Eliminar este documento guardado?'))return;try{store(load().filter(x=>x.id!==d.id));render();sync()}catch(e){say(e.message)}});
 }
}
function sync(){
 if(!entry)return;
 entry.hidden=!linked();
 let n=0;try{const ctx=context();n=load().length+(ctx&&remoteBox===ctx.key?remoteDocs.length:0)}catch{}
 entry.textContent='Guardar / recuperar'+(n?' ('+n+')':'');
 const has=Object.keys(window.NAVARRO_CARRITO_EN_VIVO_V66?.snapshot?.()||{}).length>0;
 saveSale.disabled=saveQuote.disabled=!has||busy||!linked();
}
function mount(){
 if(entry)return true;
 const print=$('nv-print-ticket-button');if(!print||!api()||!delivery()?.snapshot)return false;
 entry=make('button','Guardar / recuperar');entry.type='button';entry.id='nv-draft-entry';entry.hidden=true;
 print.after(entry);
 const style=make('style',undefined,document.head);
 style.textContent='#nv-draft-entry{display:block;width:100%;min-height:53px;margin:10px 0 9px;border:0;border-radius:12px;background:#205e40;color:white;font:850 15px system-ui;cursor:pointer;box-shadow:0 2px 6px #163d2928}#nv-draft-entry[hidden]{display:none!important}#nv-draft-dialog{position:fixed;inset:0;margin:auto;width:min(90vw,420px);max-height:82dvh;overflow:auto;border:1px solid #c5d9ca;border-radius:14px;padding:15px;background:white;color:#183b29;font:14px system-ui}#nv-draft-dialog::backdrop{background:#132a2280}#nv-draft-dialog h3{margin:6px 0 10px}#nv-draft-dialog button{min-height:42px;border:1px solid #c6d9ce;border-radius:9px;background:#edf5ef;color:#20563b;font:750 13px system-ui;padding:7px 10px;margin:3px}#nv-draft-dialog button:disabled{opacity:.45}#nv-draft-dialog .nv-draft-primary{background:#205e40;color:white;width:calc(100% - 6px)}.nv-draft-row{padding:9px 0;border-top:1px solid #dce6de}.nv-draft-row small{display:block;margin:4px 0;color:#53675c}';
 dialog=make('dialog',undefined,document.body);dialog.id='nv-draft-dialog';
 make('h3','Ventas guardadas y presupuestos',dialog);
 saveSale=button('Guardar venta',dialog,()=>save('venta'));saveSale.className='nv-draft-primary';
 saveQuote=button('Guardar e imprimir presupuesto',dialog,()=>save('presupuesto'));saveQuote.className='nv-draft-primary';
 status=make('p','',dialog);status.setAttribute('role','status');
 search=make('input',undefined,dialog);search.type='search';search.placeholder='Buscar por folio o cliente';search.setAttribute('aria-label','Buscar por folio o cliente');search.style.cssText='width:100%;box-sizing:border-box;min-height:44px;border:1px solid #b8d5c0;border-radius:9px;padding:9px;font:16px system-ui;margin:8px 0';search.addEventListener('input',render);
 list=make('div',undefined,dialog);
 button('Cerrar',dialog,()=>dialog.close());
 entry.addEventListener('click',()=>{if(!linked())return;say('');search.value='';render();sync();dialog.showModal();void refreshShared()});
 new MutationObserver(sync).observe($('cart-items'),{childList:true});
 window.addEventListener('pageshow',sync);setInterval(sync,3000);setInterval(()=>{if(dialog.open&&!busy&&!document.hidden)void refreshShared()},15000);sync();
 window.NAVARRO_VENTAS_ESPERA_V1=true;return true;
}
if(!mount()){let attempts=0;const t=setInterval(()=>{if(mount()||++attempts>40)clearInterval(t)},250)}
})();
