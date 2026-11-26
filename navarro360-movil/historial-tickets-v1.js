/* NAVARRO 360 — historial de tickets locales V1
   Registra solo respuestas aceptadas por el puente Windows. NO confirma salida
   física, pago ni registro SIFO. La información pertenece a este navegador/PWA.
*/
(function(){
'use strict';
if(window.NAVARRO_HISTORIAL)return;
const KEY='navarro360_historial_tickets_v1',MAX=100;
const $=id=>document.getElementById(id);
const pesos=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
const money=c=>pesos.format(c/100);
const clean=(s,limit)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,limit);
function normalizeMethod(state,method){
 if(state==='cobrar')return 'credit';
 if(state==='pagado'&&['cash','card','transfer'].includes(method))return method;
 return 'unknown';
}
const methodLabel=m=>({cash:'Efectivo',card:'Tarjeta',transfer:'Transferencia',credit:'Por cobrar',unknown:'Sin clasificar'})[m]||'Sin clasificar';
function validJob(job){
 if(!job||typeof job!=='object'||!Array.isArray(job.rows)||job.rows.length<1||job.rows.length>100)return null;
 if(typeof job.jobId!=='string'||!/^[0-9a-z-]{8,80}$/i.test(job.jobId))return null;
 let subtotal=0,rows=[];
 for(const row of job.rows){
  const id=String(row.id||''),qty=Number(row.qty),unit=Number(row.unit),total=Number(row.total);
  if(!/^\d{5,30}$/.test(id)||!Number.isFinite(qty)||qty<=0||qty>9999||
    !Number.isSafeInteger(unit)||unit<=0||unit>100000000||
    !Number.isSafeInteger(total)||total<=0||total>100000000)return null;
  subtotal+=total;
  rows.push({id,name:clean(row.name,200),qty,unit,total,special:!!row.special});
 }
 if(!Number.isSafeInteger(subtotal)||subtotal!==job.subtotal)return null;
 const flete=Number(job.flete||0);
 if(flete!==0&&flete!==5000)return null;
 const date=new Date(job.at||Date.now());
 return {v:1,jobId:job.jobId,...(typeof job.folio==='string'&&/^[0-9]{4,12}$/.test(job.folio)&&Number(job.folio)>0?{folio:job.folio}:{}),at:isNaN(date.getTime())?new Date().toISOString():date.toISOString(),
   rows,subtotal,flete,state:['pagado','cobrar'].includes(job.state)?job.state:'none',
   client:clean(job.client,100),phone:clean(job.phone,30),address:clean(job.address,260),...(job.state==='cobrar'&&typeof job.creditClientId==='string'&&/^[0-9a-z-]{8,80}$/i.test(job.creditClientId)&&['COMPUTADORA','PABLO','DIANA','GOLI'].includes(job.creditBox)?{creditClientId:job.creditClientId,creditBox:job.creditBox}:{})};
}
function load(){
 try{
  const data=JSON.parse(localStorage.getItem(KEY)||'[]');
  return Array.isArray(data)?data.filter(x=>x&&x.job&&validJob(x.job)).slice(0,MAX):[];
 }catch(_){return []}
}
function persist(arr){
 try{localStorage.setItem(KEY,JSON.stringify(arr));return true}catch(_){return false}
}
function record(job,paymentMethod){
 const fixed=validJob(job);if(!fixed)return false;
 if(fixed.creditClientId){try{if(window.NAVARRO_CLIENTES_V299?.record?.(fixed)!==true)throw Error('registro pendiente');}catch(e){window.alert('Venta recibida. No se pudo asociar el crédito ahora; conserva el ticket y revisa Clientes antes de registrar abonos.');}}
 const all=load();if(all.some(x=>x.job.jobId===fixed.jobId))return true;
 const entry={job:fixed,paymentMethod:normalizeMethod(fixed.state,paymentMethod),receivedAt:new Date().toISOString(),copies:0,source:'cola_windows'};
 const next=[entry,...all].slice(0,MAX);
 if(persist(next)){refreshCount();return true}
 // Safari puede llenar su almacenamiento: conservar por lo menos 1 ticket.
 for(const limit of [50,20,10,1]){
  if(persist(next.slice(0,limit))){refreshCount();return true}
 }
 return false;
}
function get(id){
 const item=load().find(x=>x.job.jobId===id);
 return item?JSON.parse(JSON.stringify(item.job)):null;
}
function markReprint(id){
 const all=load(),item=all.find(x=>x.job.jobId===id);
 if(!item)return false;
 item.copies=Math.max(0,Number(item.copies)||0)+1;
 item.lastCopyAt=new Date().toISOString();
 const ok=persist(all);if(ok)render();return ok;
}
function refreshCount(){
 const el=$('nv-history-open');if(el)el.textContent='🧾 Tickets recientes ('+load().length+')';
}
let overlay,items,status;
function setMessage(message,failed){
 if(!status)return;
 status.textContent=message;status.style.color=failed?'#b02c2c':'#226341';
}
function makeRow(entry){
 const job=entry.job;
 const wrap=document.createElement('div');wrap.className='nv-history-item';
 const heading=document.createElement('div');heading.className='nv-history-heading';
 const left=document.createElement('strong');
 const d=new Date(entry.receivedAt||job.at);
 left.textContent=(job.folio?'Folio '+job.folio+' · ':'')+(isNaN(d.getTime())?'Ticket':d.toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}));
 const right=document.createElement('strong');right.textContent=money(job.subtotal+job.flete);
 heading.append(left,right);wrap.appendChild(heading);
 const text=document.createElement('p');
 const details=[job.rows.length+' artículos','Cola Windows'];
 if(job.client)details.push(job.client);
 details.push(methodLabel(normalizeMethod(job.state,entry.paymentMethod)));
 if(entry.copies)details.push(entry.copies+' reimpresión(es)');
 text.textContent=details.join(' · ');
 wrap.appendChild(text);
 const actions=document.createElement('div');actions.className='nv-history-actions';
 const copy=document.createElement('button');copy.type='button';copy.textContent='🖨 Reimprimir';
 copy.addEventListener('click',async()=>{
  const printer=window.NAVARRO_PRINT_SILENCIOSA;
  if(!printer?.vinculado?.()){setMessage('Primero vincula la impresora en este navegador.',true);return}
  if(!window.confirm('¿Enviar nuevamente este ticket a la impresora? Se imprimirá otra copia y el carrito actual NO cambiará.'))return;
  copy.disabled=true;copy.textContent='Enviando…';
  try{
   const result=await printer.reimprimir(job.jobId);
   if(result?.ok){setMessage('✓ Copia enviada a la cola Windows. Confirma que salió el papel.',false);render()}
   else setMessage(result?.error||'No se recibió confirmación de Windows. No se reintentó automáticamente.',true);
  }catch(_){setMessage('No se confirmó la reimpresión. Revisa la impresora antes de repetirla.',true)}
  finally{copy.disabled=false;copy.textContent='🖨 Reimprimir'}
 });
 actions.appendChild(copy);
 const detailsButton=document.createElement('button');detailsButton.type='button';detailsButton.textContent='Ver artículos';
 detailsButton.addEventListener('click',()=>{
  let detailsNode=wrap.querySelector('.nv-history-details');
  if(detailsNode){detailsNode.remove();return}
  detailsNode=document.createElement('div');detailsNode.className='nv-history-details';
  for(const r of job.rows){
   const line=document.createElement('div');
   line.textContent=r.name+' · '+r.qty+' pza/u × '+money(r.unit)+' · '+money(r.total);
   detailsNode.appendChild(line);
  }
  if(job.flete){const line=document.createElement('div');line.textContent='Flete adicional · '+money(job.flete);detailsNode.appendChild(line)}
  if(job.phone){const line=document.createElement('div');line.textContent='Teléfono: '+job.phone;detailsNode.appendChild(line)}
  if(job.address){const line=document.createElement('div');line.textContent='Entrega: '+job.address;detailsNode.appendChild(line)}
  wrap.appendChild(detailsNode);
 });
 actions.appendChild(detailsButton);wrap.appendChild(actions);
 return wrap;
}
function render(){
 if(!items)return;
 items.replaceChildren();
 const all=load();refreshCount();
 if(!all.length){
  const empty=document.createElement('p');empty.textContent='Aún no hay tickets registrados en este dispositivo. Los nuevos aparecerán aquí cuando Windows los acepte.';items.appendChild(empty);return;
 }
 for(const item of all)items.appendChild(makeRow(item));
}
function close(){if(overlay){overlay.hidden=true;setMessage('',false)}}
function mount(){
 const print=$('nv-print-ticket-button'),bottom=print?.parentElement;
 if(!print||!bottom)return;
 const button=document.createElement('button');button.id='nv-history-open';button.type='button';
 button.textContent='🧾 Tickets recientes (0)';button.className='nv-history-open';
 bottom.insertBefore(button,print.nextSibling);
 overlay=document.createElement('div');overlay.id='nv-history-overlay';overlay.hidden=true;
 overlay.innerHTML='<section class="nv-history-box" role="dialog" aria-modal="true" aria-labelledby="nv-history-title">'+
  '<div class="nv-history-top"><h2 id="nv-history-title">🧾 Tickets recientes</h2><button type="button" id="nv-history-close" aria-label="Cerrar historial">✕</button></div>'+
  '<p class="nv-history-warning">Guardados solo en este iPhone o navegador. «En cola Windows» no confirma impresión física ni registro en SIFO. No se comparten entre equipos.</p>'+
  '<div id="nv-history-list"></div><p id="nv-history-status" role="status"></p></section>';
 document.body.appendChild(overlay);
 items=$('nv-history-list');status=$('nv-history-status');
 const style=document.createElement('style');
 style.textContent=
  '#nv-history-overlay[hidden]{display:none!important}'+
  '.nv-history-open{display:block;width:100%;min-height:47px;margin:4px 0 8px;border:1px solid #acc9b3;border-radius:11px;background:#f1f7f2;color:#1c5d39;font:800 14px system-ui;cursor:pointer}'+
  '#nv-history-overlay{position:fixed;inset:0;z-index:2147483250;background:#071b2bdc;display:flex;align-items:center;justify-content:center;padding:13px;box-sizing:border-box}'+
  '.nv-history-box{width:100%;max-width:530px;max-height:90dvh;overflow:auto;border-radius:16px;background:white;padding:15px;box-sizing:border-box;color:#193529;font-family:system-ui}'+
  '.nv-history-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.nv-history-top h2{font-size:20px;margin:0}'+
  '.nv-history-top button{border:0;border-radius:10px;padding:9px 14px;background:#e8f0ed;font-size:18px}'+
  '.nv-history-warning{font:12px/1.5 system-ui;color:#67796d}'+
  '.nv-history-item{border:1px solid #d4e3d7;border-radius:12px;padding:11px;margin:8px 0}'+
  '.nv-history-heading{display:flex;justify-content:space-between;gap:10px;font:14px system-ui}.nv-history-item p{font:12px system-ui;color:#5c7160;margin:6px 0 9px}'+
  '.nv-history-actions{display:flex;gap:8px}.nv-history-actions button{flex:1;min-height:43px;border:0;border-radius:9px;background:#1a6944;color:white;font:800 13px system-ui}'+
  '.nv-history-actions button+button{background:#e6f1e9;color:#215c38}.nv-history-actions button:disabled{opacity:.5}'+
  '.nv-history-details{font:12px/1.7 system-ui;border-top:1px dashed #cbd8ce;margin-top:9px;padding-top:8px;overflow-wrap:anywhere}'+
  '#nv-history-status{font:800 12px/1.5 system-ui}';
 document.head.appendChild(style);
 button.addEventListener('click',()=>{render();overlay.hidden=false});
 $('nv-history-close').addEventListener('click',close);
 overlay.addEventListener('click',ev=>{if(ev.target===overlay)close()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!overlay.hidden)close()});
 refreshCount();
}
window.NAVARRO_HISTORIAL=Object.freeze({version:2,record,get,markReprint,list:()=>load().map(x=>({jobId:x.job.jobId,folio:x.job.folio||null,at:x.receivedAt,total:x.job.subtotal+x.job.flete,copies:x.copies,method:normalizeMethod(x.job.state,x.paymentMethod)}))});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();