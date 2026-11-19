/* NAVARRO 360 — Panel de reportes diarios V1
 * Complemento de SOLO LECTURA. Usa exclusivamente APIs locales ya existentes
 * de corte de tickets y arqueo. No es utilidad, contabilidad ni cierre fiscal.
 * Nunca modifica el carrito, el historial, la impresora, SIFO ni el arqueo.
 */
(function(){
'use strict';
if(window.NAVARRO_REPORTES_DIARIOS_V1)return;
const $=id=>document.getElementById(id);
const money=c=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(c/100);
const pad=n=>String(n).padStart(2,'0');
const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function dayDate(s){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))throw Error('Selecciona una fecha válida.');
 const [y,m,d]=s.split('-').map(Number),t=new Date(y,m-1,d);
 if(y<2020||y>2100||t.getFullYear()!==y||t.getMonth()!==m-1||t.getDate()!==d)
  throw Error('Fecha inválida.');
 return t;
}
function offsetDay(s,delta){const d=dayDate(s);d.setDate(d.getDate()+delta);return key(d)}
function tickets(){
 const api=window.NAVARRO_CORTE_CAJA_V1;
 if(typeof api?.consultar!=='function')throw Error('El historial de tickets no está listo.');
 const list=api.consultar();
 if(!Array.isArray(list))throw Error('No se puede leer el historial.');
 return list;
}
function report(day,list){
 dayDate(day);
 const records=Array.isArray(list)?list:tickets();
 const t={day,count:0,total:0,paid:0,credit:0,other:0,cash:0,card:0,transfer:0,unknownPaid:0};
 for(const r of records){
  if(!r||typeof r.at!=='string'||!Number.isSafeInteger(r.total)||r.total<0)continue;
  const at=new Date(r.at);
  if(!Number.isFinite(at.getTime())||key(at)!==day)continue;
  t.count++;t.total+=r.total;
  if(r.status==='pagado'){
   t.paid+=r.total;
   if(r.method==='cash')t.cash+=r.total;
   else if(r.method==='card')t.card+=r.total;
   else if(r.method==='transfer')t.transfer+=r.total;
   else t.unknownPaid+=r.total;
  }else if(r.status==='cobrar')t.credit+=r.total;
  else t.other+=r.total;
 }
 const caja=window.NAVARRO_ARQUEO_EFECTIVO_V1;
 if(typeof caja?.leerDia!=='function')throw Error('El arqueo de efectivo no está listo.');
 const saved=caja.leerDia(day);
 t.initial=saved.initial;t.counted=saved.counted;
 t.income=0;t.expenses=0;t.withdrawals=0;t.unclassifiedOut=0;
 t.movements=saved.moves.length;
 for(const m of saved.moves){
  if(m.kind==='in')t.income+=m.cents;
  else if(m.category==='expense')t.expenses+=m.cents;
  else if(m.category==='withdrawal')t.withdrawals+=m.cents;
  else t.unclassifiedOut+=m.cents;
 }
 t.outs=t.expenses+t.withdrawals+t.unclassifiedOut;
 t.expected=(t.initial??0)+t.cash+t.income-t.outs;
 t.difference=t.counted===null?null:t.counted-t.expected;
 return t;
}
function range(endDay,days=7){
 if(!Number.isInteger(days)||days<1||days>31)throw Error('Rango inválido.');
 const list=tickets(),out=[];
 for(let n=0;n<days;n++)out.push(report(offsetDay(endDay,-n),list));
 return out;
}
function csvCell(x){
 const raw=String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,200);
 const safe=/^[=+\-@]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function csv(data){
 const cols=['Fecha','Tickets recibidos','Total tickets','Marcados pagados','Por cobrar','Sin estado','Efectivo','Tarjeta','Transferencia','Pagados sin método','Fondo inicial','Entradas caja','Gastos','Retiros','Salidas sin clasificar','Efectivo esperado','Efectivo contado','Diferencia'];
 const lines=[cols.map(csvCell).join(',')];
 const peso=c=>c===null?'':(c/100).toFixed(2);
 for(const d of data){
  lines.push([d.day,d.count,peso(d.total),peso(d.paid),peso(d.credit),peso(d.other),
   peso(d.cash),peso(d.card),peso(d.transfer),peso(d.unknownPaid),peso(d.initial),peso(d.income),
   peso(d.expenses),peso(d.withdrawals),peso(d.unclassifiedOut),peso(d.expected),peso(d.counted),peso(d.difference)].map(csvCell).join(','));
 }
 return '\uFEFF'+lines.join('\r\n');
}
let modal=null,daysShown=[];
function setText(id,val){const e=$(id);if(e)e.textContent=val}
function row(label,amount,note){
 const box=document.createElement('div');box.className='nv-reporte-line';
 const main=document.createElement('span');main.textContent=label;
 const right=document.createElement('strong');right.textContent=amount;
 box.append(main,right);
 if(note){const detail=document.createElement('small');detail.textContent=note;box.appendChild(detail)}
 return box;
}
function render(){
 if(!modal||modal.hidden)return;
 const end=$('nv-reporte-day').value;
 let days;
 try{days=range(end,7)}catch(err){setText('nv-reporte-error',err.message);return}
 daysShown=days;setText('nv-reporte-error','');
 const today=days[0],before=days[1],delta=today.total-before.total;
 setText('nv-reporte-count',today.count+' tickets');
 setText('nv-reporte-today',money(today.total));
 setText('nv-reporte-yesterday',money(before.total));
 setText('nv-reporte-variation',(delta>0?'+':delta<0?'−':'')+money(Math.abs(delta)));
 setText('nv-reporte-paid',money(today.paid));
 setText('nv-reporte-credit',money(today.credit));
 setText('nv-reporte-cash',money(today.cash));
 setText('nv-reporte-card',money(today.card));
 setText('nv-reporte-transfer',money(today.transfer));
 setText('nv-reporte-unknown',money(today.unknownPaid));
 setText('nv-reporte-expenses',money(today.expenses));
 setText('nv-reporte-withdrawals',money(today.withdrawals));
 setText('nv-reporte-legacy',money(today.unclassifiedOut));
 setText('nv-reporte-income',money(today.income));
 setText('nv-reporte-expected',money(today.expected));
 setText('nv-reporte-counted',today.counted===null?'Pendiente':money(today.counted));
 setText('nv-reporte-difference',today.difference===null?'Sin conteo':(today.difference>0?'+':'')+money(today.difference));
 setText('nv-reporte-opening',today.initial===null?'Fondo inicial sin registrar: se considera $0.00.':'Fondo inicial registrado: '+money(today.initial));
 const list=$('nv-reporte-days');list.replaceChildren();
 const max=Math.max(1,...days.map(x=>x.total));
 for(const d of days){
  const block=document.createElement('div');block.className='nv-reporte-day-row';
  const top=document.createElement('div');top.className='nv-reporte-day-top';
  const date=document.createElement('strong');date.textContent=d.day;
  const total=document.createElement('strong');total.textContent=money(d.total);
  top.append(date,total);block.appendChild(top);
  const bar=document.createElement('div');bar.className='nv-reporte-bar';
  const fill=document.createElement('span');fill.style.width=Math.max(0,Math.min(100,100*d.total/max))+'%';
  bar.appendChild(fill);block.appendChild(bar);
  const foot=document.createElement('small');
  foot.textContent=d.count+' tickets · Efectivo '+money(d.cash)+' · Gastos '+money(d.expenses)+' · Retiros '+money(d.withdrawals);
  block.appendChild(foot);list.appendChild(block);
 }
 setText('nv-reporte-footer','Comparativo de 7 fechas locales hasta '+end+'. Tickets: solo los últimos 100 aceptados por Windows en este iPhone/navegador. Los importes NO son utilidades ni ventas completas. Gastos y retiros se registran manualmente en Arqueo.');
}
function summary(){
 const d=daysShown[0];if(!d)throw Error('Selecciona una fecha.');
 return [
 'NAVARRO 360 · Reporte local '+d.day,
 'Tickets en cola Windows: '+d.count+' · '+money(d.total),
 'Pagados (estado manual): '+money(d.paid),
 'Por cobrar: '+money(d.credit),
 'Efectivo: '+money(d.cash),
 'Tarjeta: '+money(d.card),
 'Transferencia: '+money(d.transfer),
 'Pagados sin clasificar: '+money(d.unknownPaid),
 'Entradas al cajón: '+money(d.income),
 'Gastos: '+money(d.expenses),
 'Retiros: '+money(d.withdrawals),
 'Salidas sin clasificar: '+money(d.unclassifiedOut),
 'Efectivo esperado: '+money(d.expected),
 'Efectivo contado: '+(d.counted===null?'Pendiente':money(d.counted)),
 'Diferencia: '+(d.difference===null?'Pendiente':money(d.difference)),
 'Advertencia: registros locales parciales, no verifican pagos ni representan utilidades.'
 ].join('\n');
}
async function copySummary(){
 try{
  if(!navigator.clipboard?.writeText)throw Error('Portapapeles no disponible');
  await navigator.clipboard.writeText(summary());
  setText('nv-reporte-message','✓ Resumen copiado para WhatsApp.');
 }catch(_){setText('nv-reporte-message','No se pudo copiar. Puedes exportar el CSV.')}
}
function exportCsv(){
 if(!daysShown.length)return;
 try{
  const blob=new Blob([csv(daysShown)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='NAVARRO_Reportes_7_dias_'+$('nv-reporte-day').value+'.csv';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  setText('nv-reporte-message','Archivo generado. Revisa Archivos o Descargas en el iPhone.');
 }catch(_){setText('nv-reporte-message','No se pudo exportar el CSV.')}
}
function openArqueo(){
 const button=$('nv-arq-open');if(!button)return;
 modal.hidden=true;button.click();
}
function mount(){
 if($('nv-reporte-open'))return true;
 const old=$('nv-arq-open');
 if(!old||!old.parentElement)return false;
 const btn=document.createElement('button');btn.type='button';btn.id='nv-reporte-open';
 btn.className='nv-reporte-open';btn.textContent='📈 Reportes y comparativos';
 old.parentElement.insertBefore(btn,old.nextSibling);
 modal=document.createElement('div');modal.id='nv-reporte-overlay';modal.hidden=true;
 modal.innerHTML=
 '<section class="nv-reporte-dialog" role="dialog" aria-modal="true" aria-labelledby="nv-reporte-title">'+
 '<div class="nv-reporte-heading"><h2 id="nv-reporte-title">📈 Reportes diarios</h2><button type="button" id="nv-reporte-close" aria-label="Cerrar">✕</button></div>'+
 '<p class="nv-reporte-help">Análisis local de tickets y movimientos de caja. No representa utilidad, contabilidad ni un cierre fiscal.</p>'+
 '<label class="nv-reporte-label">Fecha a comparar<input id="nv-reporte-day" type="date"></label>'+
 '<div class="nv-reporte-summary">'+
 '<div><small>Tickets de la fecha</small><strong id="nv-reporte-today">$0.00</strong><span id="nv-reporte-count">0 tickets</span></div>'+
 '<div><small>Día anterior</small><strong id="nv-reporte-yesterday">$0.00</strong></div>'+
 '<div><small>Diferencia en tickets</small><strong id="nv-reporte-variation">$0.00</strong></div>'+
 '<div><small>Marcados pagados</small><strong id="nv-reporte-paid">$0.00</strong></div>'+
 '<div><small>Por cobrar</small><strong id="nv-reporte-credit">$0.00</strong></div>'+
 '<div><small>💵 Efectivo</small><strong id="nv-reporte-cash">$0.00</strong></div>'+
 '<div><small>💳 Tarjeta</small><strong id="nv-reporte-card">$0.00</strong></div>'+
 '<div><small>🏦 Transferencia</small><strong id="nv-reporte-transfer">$0.00</strong></div>'+
 '<div><small>Pagados sin método</small><strong id="nv-reporte-unknown">$0.00</strong></div>'+
 '<div><small>Entradas manuales</small><strong id="nv-reporte-income">$0.00</strong></div>'+
 '<div><small>Gastos</small><strong id="nv-reporte-expenses">$0.00</strong></div>'+
 '<div><small>Retiros</small><strong id="nv-reporte-withdrawals">$0.00</strong></div>'+
 '<div><small>Otras salidas (anteriores)</small><strong id="nv-reporte-legacy">$0.00</strong></div>'+
 '<div><small>Efectivo esperado</small><strong id="nv-reporte-expected">$0.00</strong></div>'+
 '<div><small>Efectivo contado</small><strong id="nv-reporte-counted">—</strong></div>'+
 '<div><small>Diferencia de caja</small><strong id="nv-reporte-difference">—</strong></div>'+
 '</div>'+
 '<p id="nv-reporte-opening" class="nv-reporte-help"></p>'+
 '<button type="button" id="nv-reporte-arqueo">+ Registrar gasto o retiro en Arqueo</button>'+
 '<h3>Últimos 7 días hasta la fecha seleccionada</h3><div id="nv-reporte-days"></div>'+
 '<div class="nv-reporte-actions"><button type="button" id="nv-reporte-copy">Copiar resumen</button><button type="button" id="nv-reporte-export">Exportar CSV</button></div>'+
 '<p id="nv-reporte-message" role="status"></p><p id="nv-reporte-error" role="alert"></p>'+
 '<p id="nv-reporte-footer" class="nv-reporte-help"></p>'+
 '</section>';
 document.body.appendChild(modal);
 const st=document.createElement('style');
 st.textContent=
 '#nv-reporte-overlay[hidden]{display:none!important}'+
 '.nv-reporte-open{display:block;width:100%;min-height:48px;box-sizing:border-box;margin:5px 0 10px;border:1px solid #b5cbce;background:#edf6f8;color:#214b5e;border-radius:11px;font:800 14px system-ui;cursor:pointer}'+
 '#nv-reporte-overlay{box-sizing:border-box;position:fixed;inset:0;z-index:2147483450;background:#071926d8;padding:12px;display:flex;justify-content:center;align-items:center}'+
 '.nv-reporte-dialog{box-sizing:border-box;background:#fff;color:#203b2d;border-radius:16px;width:100%;max-width:570px;max-height:94dvh;overflow:auto;-webkit-overflow-scrolling:touch;padding:16px;font-family:system-ui}'+
 '.nv-reporte-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}.nv-reporte-heading h2{font-size:19px;margin:0}.nv-reporte-heading button{min-height:42px;min-width:42px;border:0;background:#eff3f0;color:#234;border-radius:10px;font-size:18px}'+
 '.nv-reporte-help{font:12px/1.5 system-ui;color:#617369;margin:10px 0}'+
 '.nv-reporte-label{display:block;font:800 13px system-ui}#nv-reporte-day{width:100%;box-sizing:border-box;margin-top:5px;min-height:44px;border:1px solid #abc7b3;border-radius:9px;font:16px system-ui;padding:8px;background:white;color:#203b2d}'+
 '.nv-reporte-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}'+
 '.nv-reporte-summary>div{min-width:0;background:#f1f6f3;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:5px}'+
 '.nv-reporte-summary small{font:11px system-ui;color:#526c5c}.nv-reporte-summary strong{font:850 17px system-ui;overflow-wrap:anywhere}.nv-reporte-summary span{font:11px system-ui;color:#587261}'+
 '.nv-reporte-dialog button{min-height:44px;border:0;border-radius:9px;padding:9px 11px;background:#226848;color:#fff;font:800 13px system-ui}'+
 '#nv-reporte-arqueo{width:100%;background:#e7f2e9;color:#1c5d36}'+
 '.nv-reporte-dialog h3{font-size:14px;margin:15px 0 9px}'+
 '.nv-reporte-day-row{border-top:1px solid #d9e5dc;padding:10px 0;display:flex;flex-direction:column;gap:6px}'+
 '.nv-reporte-day-top{display:flex;justify-content:space-between;gap:10px;font:13px system-ui}.nv-reporte-day-row small{font:11px system-ui;color:#637568}'+
 '.nv-reporte-bar{height:7px;background:#ebf2ed;border-radius:9px;overflow:hidden}.nv-reporte-bar span{display:block;height:100%;background:#2c7655;border-radius:9px}'+
 '.nv-reporte-actions{display:flex;gap:8px;margin-top:12px}.nv-reporte-actions button{flex:1}'+
 '#nv-reporte-error{font:800 12px system-ui;color:#b02c2c}#nv-reporte-message{font:800 12px system-ui;color:#25613d}';
 document.head.appendChild(st);
 $('nv-reporte-day').value=key(new Date());
 btn.addEventListener('click',()=>{modal.hidden=false;setText('nv-reporte-message','');render()});
 $('nv-reporte-close').addEventListener('click',()=>{modal.hidden=true});
 modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)modal.hidden=true});
 $('nv-reporte-day').addEventListener('change',render);
 $('nv-reporte-copy').addEventListener('click',copySummary);
 $('nv-reporte-export').addEventListener('click',exportCsv);
 $('nv-reporte-arqueo').addEventListener('click',openArqueo);
 return true;
}
function init(){
 if(mount())return;
 let tries=0;
 const timer=setInterval(()=>{tries++;if(mount()||tries>=20)clearInterval(timer)},250);
}
window.NAVARRO_REPORTES_DIARIOS_V1=Object.freeze({version:1,resumenDia:report,comparar7dias:range,formatoCSV:csv});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();