/* NAVARRO 360 — Corte de caja local V1 · 19 nov 2026
 * SOLO LECTURA del historial del navegador. No cobra, no imprime,
 * no modifica el carrito, no altera SIFO ni el puente ngrok.
 * Cada registro significa ticket aceptado en cola Windows, no venta
 * confirmada en SIFO, banco o impresora física.
 */
(function(){
'use strict';
if(window.NAVARRO_CORTE_CAJA_V1)return;
const KEY='navarro360_historial_tickets_v1',MAX=100;
const $=id=>document.getElementById(id);
const money=c=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(c/100);
const formatter=new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const integer=x=>Number.isSafeInteger(x)&&x>=0;
function methodFor(state,stored){
 if(state==='cobrar')return 'credit';
 if(state==='pagado'&&['cash','card','transfer'].includes(stored))return stored;
 return 'unknown';
}
const methodText=method=>({cash:'Efectivo',card:'Tarjeta',transfer:'Transferencia',credit:'Por cobrar',unknown:'Sin clasificar'})[method]||'Sin clasificar';
const pad=n=>String(n).padStart(2,'0');
function dayKey(value){
 const d=value instanceof Date?value:new Date(value);
 if(Number.isNaN(d.getTime()))return '';
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function parseRecords(){
 let raw=[];try{raw=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){}
 if(!Array.isArray(raw))return [];
 const out=[];
 for(const item of raw.slice(0,MAX)){
  const j=item?.job;
  if(!j||typeof j!=='object'||typeof j.jobId!=='string'||!/^[0-9A-Za-z-]{8,80}$/.test(j.jobId)||!Array.isArray(j.rows)||!j.rows.length||j.rows.length>100)continue;
  if(!integer(j.subtotal)||![0,5000].includes(Number(j.flete||0)))continue;
  let sum=0,good=true;
  for(const row of j.rows){
   const q=Number(row.qty),amount=Number(row.total);
   if(!/^\d{5,30}$/.test(String(row.id||''))||!Number.isFinite(q)||q<=0||q>9999||!integer(amount)||amount===0){good=false;break}
   sum+=amount;
  }
  if(!good||sum!==j.subtotal||!Number.isSafeInteger(sum))continue;
  const at=new Date(item.receivedAt||j.at);
  if(Number.isNaN(at.getTime()))continue;
  out.push({id:j.jobId,at,day:dayKey(at),subtotal:j.subtotal,flete:Number(j.flete||0),
   total:j.subtotal+Number(j.flete||0),
   status:j.state==='pagado'?'pagado':j.state==='cobrar'?'cobrar':'none',
   method:methodFor(j.state,item.paymentMethod),
   client:String(j.client||'').slice(0,100),phone:String(j.phone||'').slice(0,30),
   codes:j.rows.map(r=>String(r.id)),products:j.rows.length,copies:Math.max(0,Number(item.copies)||0)});
 }
 return out.sort((a,b)=>b.at-a.at);
}
function periodMatch(record,period,selected){
 const today=new Date(),key=dayKey(today);
 if(period==='today')return record.day===key;
 const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
 if(period==='yesterday')return record.day===dayKey(yesterday);
 if(period==='week'){
  const start=new Date(today);start.setHours(0,0,0,0);start.setDate(start.getDate()-6);
  return record.at>=start&&record.at<=today;
 }
 return record.day===selected;
}
function filtered(records,period,selected,status,needle,method='all'){
 const s=String(needle||'').toLocaleLowerCase('es-MX').trim();
 return records.filter(r=>periodMatch(r,period,selected)&&
   (status==='all'||r.status===status)&&
   (method==='all'||r.method===method)&&
   (!s||[r.id,r.client,r.phone,...r.codes].some(x=>String(x).toLocaleLowerCase('es-MX').includes(s))));
}
function totals(rows){
 const t={count:rows.length,total:0,paid:0,credit:0,other:0,paidCount:0,creditCount:0,otherCount:0,
  cash:0,card:0,transfer:0,unknownPaid:0,cashCount:0,cardCount:0,transferCount:0,unknownPaidCount:0};
 for(const r of rows){
  t.total+=r.total;
  if(r.status==='pagado'){
   t.paid+=r.total;t.paidCount++;
   const key=['cash','card','transfer'].includes(r.method)?r.method:'unknownPaid';
   t[key]+=r.total;t[key+'Count']++;
  }else if(r.status==='cobrar'){t.credit+=r.total;t.creditCount++}
  else{t.other+=r.total;t.otherCount++}
 }
 return t;
}
function csvCell(s){
 const x=String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,200);
 const safe=/^[=+\-@]/.test(x)?"'"+x:x;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function csv(rows){
 const header=['Fecha','Hora','ID ticket','Estado en ticket','Método confirmado','Articulos','Subtotal','Flete adicional','Total','Reimpresiones','Cliente'];
 const data=[header.map(csvCell).join(',')];
 for(const r of rows){
  const label=r.status==='pagado'?'Pagado':r.status==='cobrar'?'Por cobrar':'Sin especificar';
  const d=r.at;
  data.push([r.day,pad(d.getHours())+':'+pad(d.getMinutes()),r.id,label,methodText(r.method),r.products,
    (r.subtotal/100).toFixed(2),(r.flete/100).toFixed(2),(r.total/100).toFixed(2),r.copies,r.client].map(csvCell).join(','));
 }
 return '\uFEFF'+data.join('\r\n');
}
let overlay,rowsShown=[];
function setText(id,text){const el=$(id);if(el)el.textContent=text}
function refresh(){
 if(!overlay||overlay.hidden)return;
 const p=$('nv-corte-period').value,status=$('nv-corte-status').value,search=$('nv-corte-search').value;
 const date=$('nv-corte-date').value,method=$('nv-corte-method').value;
 const all=parseRecords();rowsShown=filtered(all,p,date,status,search,method);
 const t=totals(rowsShown);
 setText('nv-corte-total',money(t.total));
 setText('nv-corte-count',t.count+' tickets');
 setText('nv-corte-paid',money(t.paid)+' · '+t.paidCount);
 setText('nv-corte-credit',money(t.credit)+' · '+t.creditCount);
 setText('nv-corte-other',money(t.other)+' · '+t.otherCount);
 for(const key of ['cash','card','transfer','unknownPaid'])
  setText('nv-corte-'+key,money(t[key])+' · '+t[key+'Count']);
 const list=$('nv-corte-list');list.replaceChildren();
 if(!rowsShown.length){
  const p=document.createElement('p');p.className='nv-corte-empty';
  p.textContent=all.length?'No hay tickets que coincidan con estos filtros.':'Todavía no hay tickets guardados en este navegador.';
  list.appendChild(p);
 }else{
  for(const r of rowsShown.slice(0,100)){
   const el=document.createElement('div');el.className='nv-corte-record';
   const top=document.createElement('div');top.className='nv-corte-record-top';
   const time=document.createElement('strong');time.textContent=formatter.format(r.at);
   const amount=document.createElement('strong');amount.textContent=money(r.total);
   top.append(time,amount);el.appendChild(top);
   const meta=document.createElement('div');meta.className='nv-corte-meta';
   const statusLabel=r.status==='pagado'?'Pagado (seleccionado)':r.status==='cobrar'?'Por cobrar':'Sin especificar';
   meta.textContent=statusLabel+' · '+methodText(r.method)+' · '+r.products+' artículos'+(r.copies?' · '+r.copies+' reimpresiones':'');
   el.appendChild(meta);
   if(r.client||r.phone){const customer=document.createElement('div');customer.className='nv-corte-meta';customer.textContent=[r.client,r.phone].filter(Boolean).join(' · ');el.appendChild(customer)}
   list.appendChild(el);
  }
 }
 setText('nv-corte-limit','Máximo 100 tickets recientes de esta app. Los filtros y el CSV solo incluyen registros de aquí; una reimpresión no se vuelve a contar.');
 $('nv-corte-export').disabled=!rowsShown.length;
 $('nv-corte-copy').disabled=!rowsShown.length;
}
function summary(){
 const t=totals(rowsShown);
 return 'NAVARRO 360 · Resumen local de tickets\n'+
  'Periodo: '+$('nv-corte-period').selectedOptions[0].textContent+
  ($('nv-corte-period').value==='day'?' ('+$('nv-corte-date').value+')':'')+'\n'+
  'Tickets: '+t.count+'\n'+
  'Total enviado a cola: '+money(t.total)+'\n'+
  'Marcados PAGADO: '+money(t.paid)+' ('+t.paidCount+')\n'+
  'Efectivo confirmado en caja: '+money(t.cash)+' ('+t.cashCount+')\n'+
  'Tarjeta confirmada manualmente: '+money(t.card)+' ('+t.cardCount+')\n'+
  'Transferencia confirmada manualmente: '+money(t.transfer)+' ('+t.transferCount+')\n'+
  'Pagados sin método: '+money(t.unknownPaid)+' ('+t.unknownPaidCount+')\n'+
  'Marcados POR COBRAR: '+money(t.credit)+' ('+t.creditCount+')\n'+
  'Sin especificar: '+money(t.other)+' ('+t.otherCount+')\n'+
  'Nota: NO valida pagos, salida física de papel ni registro en SIFO.';
}
async function copySummary(){
 try{
  if(!navigator.clipboard?.writeText)throw Error('Portapapeles no disponible');
  await navigator.clipboard.writeText(summary());
  setText('nv-corte-message','✓ Resumen copiado. Puedes pegarlo en WhatsApp.');
 }catch(_){setText('nv-corte-message','No se pudo copiar automáticamente. Usa Exportar CSV.')}
}
function exportCsv(){
 if(!rowsShown.length)return;
 try{
  const blob=new Blob([csv(rowsShown)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='NAVARRO_Corte_local_'+($('nv-corte-period').value==='day'?$('nv-corte-date').value:dayKey(new Date()))+'.csv';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  setText('nv-corte-message','CSV preparado. En iPhone revisa Descargas o Archivos.');
 }catch(_){setText('nv-corte-message','No se pudo exportar el CSV desde este navegador.')}
}
function close(){if(overlay)overlay.hidden=true}
function mount(){
 if($('nv-corte-open'))return true;
 const history=$('nv-history-open'),print=$('nv-print-ticket-button'),parent=history?.parentElement||print?.parentElement;
 if(!parent||!print)return false;
 const open=document.createElement('button');open.id='nv-corte-open';open.type='button';
 open.className='nv-corte-open';open.textContent='📊 Corte de caja local';
 parent.insertBefore(open,history?history.nextSibling:print);
 overlay=document.createElement('div');overlay.id='nv-corte-overlay';overlay.hidden=true;
 overlay.innerHTML=
  '<section class="nv-corte-modal" role="dialog" aria-modal="true" aria-labelledby="nv-corte-title">'+
  '<div class="nv-corte-head"><h2 id="nv-corte-title">📊 Resumen de tickets</h2><button type="button" id="nv-corte-close" aria-label="Cerrar">✕</button></div>'+
  '<p class="nv-corte-warning">Resumen LOCAL de tickets recibidos en la cola de Windows. El estado PAGADO se selecciona manualmente: no verifica el banco, la impresión física ni SIFO. No es un corte fiscal.</p>'+
  '<div class="nv-corte-filters">'+
  '<label>Periodo<select id="nv-corte-period"><option value="today">Hoy</option><option value="yesterday">Ayer</option><option value="week">Últimos 7 días</option><option value="day">Elegir fecha</option></select></label>'+
  '<label>Estado<select id="nv-corte-status"><option value="all">Todos</option><option value="pagado">Pagado</option><option value="cobrar">Por cobrar</option><option value="none">Sin especificar</option></select></label>'+
  '<label>Método<select id="nv-corte-method"><option value="all">Todos</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="credit">Por cobrar</option><option value="unknown">Sin clasificar</option></select></label>'+
  '<label id="nv-corte-date-label" hidden>Fecha<input type="date" id="nv-corte-date"></label>'+
  '</div>'+
  '<label class="nv-corte-search-label" for="nv-corte-search">Buscar ticket, cliente, teléfono o código de producto</label>'+
  '<input id="nv-corte-search" type="search" autocomplete="off" placeholder="Nombre, número o código…">'+
  '<div class="nv-corte-summary">'+
  '<div><small>Total seleccionado</small><strong id="nv-corte-total">$0.00</strong><span id="nv-corte-count">0 tickets</span></div>'+
  '<div><small>Marcados PAGADO</small><strong id="nv-corte-paid">$0.00</strong></div>'+
  '<div><small>Marcados POR COBRAR</small><strong id="nv-corte-credit">$0.00</strong></div>'+
  '<div><small>Sin estado</small><strong id="nv-corte-other">$0.00</strong></div>'+
  '<div><small>💵 Efectivo</small><strong id="nv-corte-cash">$0.00</strong></div>'+
  '<div><small>💳 Tarjeta</small><strong id="nv-corte-card">$0.00</strong></div>'+
  '<div><small>🏦 Transferencia</small><strong id="nv-corte-transfer">$0.00</strong></div>'+
  '<div><small>Pagados sin clasificar</small><strong id="nv-corte-unknownPaid">$0.00</strong></div></div>'+
  '<div class="nv-corte-actions"><button type="button" id="nv-corte-copy">Copiar resumen</button>'+
  '<button type="button" id="nv-corte-export">Exportar CSV</button></div>'+
  '<p id="nv-corte-message" role="status"></p>'+
  '<h3 class="nv-corte-subtitle">Tickets del periodo</h3><div id="nv-corte-list"></div>'+
  '<p id="nv-corte-limit" class="nv-corte-warning"></p>'+
  '</section>';
 document.body.appendChild(overlay);
 const style=document.createElement('style');style.id='nv-corte-style';
 style.textContent=
  '#nv-corte-overlay[hidden],#nv-corte-date-label[hidden]{display:none!important}'+
  '.nv-corte-open{box-sizing:border-box;width:100%;min-height:47px;margin:5px 0 10px;border:1px solid #b4c8e6;border-radius:11px;background:#eff4fc;color:#17365d;font:800 14px system-ui;cursor:pointer}'+
  '#nv-corte-overlay{box-sizing:border-box;position:fixed;inset:0;z-index:2147483400;background:#06182acc;padding:12px;display:flex;align-items:center;justify-content:center}'+
  '.nv-corte-modal{box-sizing:border-box;background:#fff;color:#142d23;width:100%;max-width:570px;max-height:94vh;max-height:94dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:16px;padding:15px;font-family:system-ui}'+
  '.nv-corte-head{display:flex;align-items:center;justify-content:space-between;gap:9px}.nv-corte-head h2{font-size:19px;margin:0}.nv-corte-head button{background:#e5ece7;border:0;border-radius:10px;min-width:42px;min-height:42px;font:20px system-ui}'+
  '.nv-corte-warning{font:12px/1.45 system-ui;color:#5b6c62;margin:9px 0 13px}'+
  '.nv-corte-filters{display:grid;grid-template-columns:1fr 1fr;gap:9px}.nv-corte-filters label,.nv-corte-search-label{display:block;font:800 12px/1.5 system-ui;color:#263f31}'+
  '.nv-corte-modal select,.nv-corte-modal input{box-sizing:border-box;display:block;width:100%;font:16px system-ui;min-height:44px;padding:8px 9px;background:#fff;color:#142d23;border:1px solid #b6cdc0;border-radius:9px;margin-top:5px}'+
  '#nv-corte-date-label{grid-column:1/-1}.nv-corte-search-label{margin:11px 0 3px}'+
  '.nv-corte-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}'+
  '.nv-corte-summary>div{box-sizing:border-box;border-radius:11px;background:#f1f6f3;padding:12px;min-width:0;display:flex;flex-direction:column;gap:5px}'+
  '.nv-corte-summary small{font:11px system-ui;color:#5b7464}.nv-corte-summary strong{font:850 18px system-ui;overflow-wrap:anywhere}.nv-corte-summary span{font:11px system-ui;color:#67816f}'+
  '.nv-corte-actions{display:flex;gap:8px}.nv-corte-actions button{flex:1;min-height:46px;font:800 13px system-ui;background:#205f40;color:#fff;border:0;border-radius:10px}.nv-corte-actions button:disabled{opacity:.5}'+
  '#nv-corte-message{min-height:14px;font:12px/1.4 system-ui;color:#205d3b;margin:6px 0}'+
  '.nv-corte-subtitle{font:800 14px system-ui;margin:13px 0 5px}'+
  '.nv-corte-record{border-top:1px solid #dce7dd;padding:10px 1px}.nv-corte-record-top{display:flex;align-items:center;justify-content:space-between;gap:6px;font:13px system-ui}'+
  '.nv-corte-meta{font:12px/1.6 system-ui;color:#526a5a;overflow-wrap:anywhere}.nv-corte-empty{font:13px/1.5 system-ui;color:#536b5a}';
 document.head.appendChild(style);
 $('nv-corte-date').value=dayKey(new Date());
 open.addEventListener('click',()=>{overlay.hidden=false;setText('nv-corte-message','');refresh()});
 $('nv-corte-close').addEventListener('click',close);
 overlay.addEventListener('click',ev=>{if(ev.target===overlay)close()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!overlay.hidden)close()});
 $('nv-corte-period').addEventListener('change',()=>{$('nv-corte-date-label').hidden=$('nv-corte-period').value!=='day';refresh()});
 for(const id of ['nv-corte-date','nv-corte-status','nv-corte-method','nv-corte-search'])$(id).addEventListener('input',refresh);
 $('nv-corte-copy').addEventListener('click',copySummary);
 $('nv-corte-export').addEventListener('click',exportCsv);
 return true;
}
function init(){
 if(mount())return;
 let tries=0;
 const timer=setInterval(()=>{tries++;if(mount()||tries>=15)clearInterval(timer)},250);
}
window.NAVARRO_CORTE_CAJA_V1=Object.freeze({version:2,consultar:()=>parseRecords().map(r=>({at:r.at.toISOString(),total:r.total,status:r.status,method:r.method,copies:r.copies})),resumir:totals,filtrar:filtered,formatoCSV:csv});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();