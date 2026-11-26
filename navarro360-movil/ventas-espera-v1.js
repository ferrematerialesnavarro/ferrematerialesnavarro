
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
let dialog,entry,status,list,saveSale,saveQuote,busy=false;
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
function save(kind){
 if(busy||!linked())return;
 busy=true;
 try{
  // snapshot() aplica la lógica de flete que utiliza la venta normal.
  const info=delivery()?.snapshot?.();if(!info)throw Error('No están listos los datos de entrega.');
  const snap=api().capture(),state=delivery().exportState(),before=load();
  if(!snap.rows.length)throw Error('Agrega productos al carrito.');
  if(before.length>=MAX)throw Error('Hay 30 documentos guardados. Recupera o elimina uno primero.');
  const client=String($('nv-ticket-client')?.value||'').trim().slice(0,100);
  const id=(kind==='presupuesto'?'P-':'NV-')+crypto.randomUUID().slice(0,12).toUpperCase();
  const d=makeDraft(kind,snap,info,state,client,id,Date.now());
  store([d,...before]);
  const cleared=api().restore({cart:{},clavos:{},importes:{},prices:{}});
  if(!cleared.ok){store(before);throw Error('No se pudo liberar el carrito. Se conservó la venta actual.');}
  resetMeta();render();
  say(kind==='presupuesto'?'Presupuesto guardado. No se registró una venta.':'Venta guardada. Carrito libre para otro cliente.');
  if(kind==='presupuesto')print(d);else dialog.close();
 }catch(e){say(e.message||'No se pudo guardar. Revisa el carrito.');}
 finally{busy=false;sync();}
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
   // Los presupuestos quedan disponibles para volver a imprimir. Una venta en espera se consume al recuperarla.
   if(d.kind!=='presupuesto')store(old.filter(x=>x.id!==d.id));
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
 if(!docs.length)make('p','No hay ventas ni presupuestos guardados.',list);
 for(const d of docs){
  const row=make('div',undefined,list);row.className='nv-draft-row';
  const quote=d.kind==='presupuesto';
  make('strong',(quote?'Presupuesto':'Venta guardada')+' · '+d.id,row);
  const total=Number.isSafeInteger(d.subtotal)?' · '+money(d.subtotal+(d.flete||0)):'';
  make('small',new Date(d.at).toLocaleString('es-MX')+' · '+Object.keys(d.cart).length+' productos'+total,row);
  const actions=make('div',undefined,row);
  button('Recuperar',actions,()=>recover(d));
  if(quote)button('Imprimir',actions,()=>{if(linked())print(d)});
  button('Eliminar',actions,()=>{if(!linked()||!confirm('¿Eliminar este documento guardado?'))return;try{store(load().filter(x=>x.id!==d.id));render();sync()}catch(e){say(e.message)}});
 }
}
function sync(){
 if(!entry)return;
 entry.hidden=!linked();
 let n=0;try{n=load().length}catch{}
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
 list=make('div',undefined,dialog);
 button('Cerrar',dialog,()=>dialog.close());
 entry.addEventListener('click',()=>{if(!linked())return;say('');render();sync();dialog.showModal()});
 new MutationObserver(sync).observe($('cart-items'),{childList:true});
 window.addEventListener('pageshow',sync);setInterval(sync,3000);sync();
 window.NAVARRO_VENTAS_ESPERA_V1=true;return true;
}
if(!mount()){let attempts=0;const t=setInterval(()=>{if(mount()||++attempts>40)clearInterval(t)},250)}
})();
