/* NAVARRO 360 — ARQUEO DE EFECTIVO V1
 * Complemento local del corte: guarda apertura, entradas, salidas y conteo.
 * No altera carrito, POS/SIFO, impresora, WhatsApp, historial ni cobros.
 * Los tickets de efectivo indican recepción en cola Windows, no depósito
 * bancario ni comprobación del dinero físico.
 */
(function(){
'use strict';
if(window.NAVARRO_ARQUEO_EFECTIVO_V1)return;
const KEY='navarro360_arqueo_efectivo_v1';
const $=id=>document.getElementById(id);
const money=c=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(c/100);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
function validDay(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day)))return false;
 const [y,m,d]=day.split('-').map(Number);
 if(y<2020||y>2100)return false;
 const t=new Date(y,m-1,d);
 return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d;
}
function parsePesos(raw,allowZero=true){
 const x=String(raw??'').trim().replace(/^\$\s*/,'');
 if(!/^\d{1,8}([.,]\d{1,2})?$/.test(x))return null;
 const [w,dec='']=x.replace(',','.').split('.');
 const cents=Number(w)*100+Number((dec+'00').slice(0,2));
 return Number.isSafeInteger(cents)&&cents>=0&&cents<=9999999999&&(allowZero||cents>0)?cents:null;
}
function pesosInput(c){return c===null||c===undefined?'':(c/100).toFixed(2)}
function readDb(){
 const raw=localStorage.getItem(KEY);
 if(!raw)return {};
 let data;
 try{data=JSON.parse(raw)}catch(_){throw Error('Los datos guardados del arqueo están dañados. No se sobrescribirán.')}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Los datos guardados tienen un formato incorrecto. No se sobrescribirán.');
 return data;
}
function defaultDay(){return {initial:null,counted:null,moves:[]}}
function getDay(day){
 if(!validDay(day))throw Error('Elige una fecha válida.');
 const raw=readDb()[day];
 if(raw===undefined)return defaultDay();
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    !Array.isArray(raw.moves)||raw.moves.length>250||
    (raw.initial!==null&&(!Number.isSafeInteger(raw.initial)||raw.initial<0))||
    (raw.counted!==null&&(!Number.isSafeInteger(raw.counted)||raw.counted<0)))
   throw Error('El registro de ese día necesita revisión. No se modificará.');
 for(const m of raw.moves){
  if(!m||typeof m!=='object'||typeof m.id!=='string'||m.id.length>120||
    !['in','out'].includes(m.kind)||!Number.isSafeInteger(m.cents)||
    m.cents<=0||m.cents>9999999999||typeof m.at!=='string')throw Error('Hay movimientos no válidos. No se modificarán.');
 }
 return {initial:raw.initial,counted:raw.counted,moves:raw.moves.map(m=>({...m}))};
}
function saveDay(day,record){
 if(!validDay(day))throw Error('Fecha inválida.');
 const db=readDb();
 db[day]=record;
 try{localStorage.setItem(KEY,JSON.stringify(db))}
 catch(_){throw Error('No se pudo guardar en este iPhone. No se cambió la información anterior.')}
}
function cashTickets(day){
 const api=window.NAVARRO_CORTE_CAJA_V1;
 if(typeof api?.consultar!=='function')throw Error('Abre de nuevo NAVARRO 360 para cargar el corte de caja.');
 const items=api.consultar();
 if(!Array.isArray(items))throw Error('No fue posible leer los tickets de este dispositivo.');
 let cents=0,count=0;
 for(const ticket of items){
  const t=new Date(ticket.at);
  if(!Number.isFinite(t.getTime()))continue;
  const local=t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());
  if(local!==day||ticket.status!=='pagado'||ticket.method!=='cash')continue;
  if(!Number.isSafeInteger(ticket.total)||ticket.total<0)continue;
  cents+=ticket.total;count++;
 }
 return {cents,count};
}
function calculate(day){
 const record=getDay(day),cash=cashTickets(day);
 let ins=0,outs=0;
 for(const m of record.moves){if(m.kind==='in')ins+=m.cents;else outs+=m.cents}
 const opening=record.initial??0;
 const expected=opening+cash.cents+ins-outs;
 const difference=record.counted===null?null:record.counted-expected;
 return {day,initial:record.initial,counted:record.counted,moves:record.moves,
  cash:cash.cents,tickets:cash.count,income:ins,expense:outs,expected,difference};
}
let modal=null,loadedDay='';
function msg(s,bad=false){
 const e=$('nv-arq-status');if(!e)return;
 e.textContent=s;e.style.color=bad?'#a32929':'#205b3c';
}
function render(){
 if(!modal||modal.hidden)return;
 const day=$('nv-arq-day').value;
 if(!validDay(day)){msg('Selecciona una fecha válida.',true);return}
 let r;
 try{r=calculate(day)}catch(e){msg(e.message,true);return}
 if(loadedDay!==day){
  $('nv-arq-initial').value=pesosInput(r.initial);
  $('nv-arq-counted').value=pesosInput(r.counted);
  $('nv-arq-move-amount').value='';
  $('nv-arq-move-reason').value='';
  loadedDay=day;
 }
 $('nv-arq-opening').textContent=r.initial===null?'Sin registrar':money(r.initial);
 $('nv-arq-tickets').textContent=money(r.cash)+' · '+r.tickets+' tickets';
 $('nv-arq-ins').textContent=money(r.income);
 $('nv-arq-outs').textContent=money(r.expense);
 $('nv-arq-expected').textContent=money(r.expected);
 $('nv-arq-counted-saved').textContent=r.counted===null?'Pendiente de contar':money(r.counted);
 const diff=$('nv-arq-difference');
 diff.textContent=r.difference===null?'Pendiente':(r.difference===0?'Cuadra: $0.00':(r.difference>0?'Sobrante: ':'Faltante: ')+money(Math.abs(r.difference)));
 diff.style.color=r.difference===null?'#65756b':r.difference===0?'#205b3c':'#9b2929';
 const list=$('nv-arq-moves');list.replaceChildren();
 for(const m of r.moves.slice().reverse()){
  const row=document.createElement('div');row.className='nv-arq-move';
  const content=document.createElement('div');content.className='nv-arq-move-info';
  const title=document.createElement('strong');
  const label=m.kind==='in'?'Entrada':m.category==='expense'?'Gasto':m.category==='withdrawal'?'Retiro':'Salida sin clasificar';
  title.textContent=label+(m.kind==='in'?' · +':' · −')+money(m.cents);
  const reason=document.createElement('small');reason.textContent=String(m.reason||'Sin concepto').slice(0,100);
  content.append(title,reason);
  const del=document.createElement('button');del.type='button';del.textContent='Eliminar';del.dataset.moveId=m.id;
  del.setAttribute('aria-label','Eliminar movimiento de '+money(m.cents));
  row.append(content,del);list.appendChild(row);
 }
 if(!r.moves.length){
  const p=document.createElement('p');p.textContent='Sin entradas ni salidas registradas para esta fecha.';
  list.appendChild(p);
 }
 $('nv-arq-move-count').textContent=r.moves.length+' movimiento(s) manual(es)';
 $('nv-arq-warning').textContent='Estimación local: solo '+r.tickets+' tickets marcados PAGADO en efectivo y recibidos en la cola Windows. Gastos y retiros son salidas de efectivo, ambas restan del cajón. Las salidas antiguas quedan sin clasificar. No incluye otras cajas ni pagos sin ticket; máximo 100 tickets recientes.';
}
function saveOpening(){
 const day=$('nv-arq-day').value,v=parsePesos($('nv-arq-initial').value);
 if(v===null){msg('Escribe un fondo inicial válido, por ejemplo 500.00.',true);return}
 try{
  const rec=getDay(day);
  if(rec.initial!==null&&rec.initial!==v&&!window.confirm('¿Cambiar el fondo inicial que ya estaba guardado para este día?'))return;
  rec.initial=v;saveDay(day,rec);msg('✓ Fondo inicial guardado.');render();
 }catch(e){msg(e.message,true)}
}
function saveCounted(){
 const day=$('nv-arq-day').value,v=parsePesos($('nv-arq-counted').value);
 if(v===null){msg('Escribe el dinero físico que contaste, por ejemplo 850.50.',true);return}
 try{
  const rec=getDay(day);
  if(rec.counted!==null&&rec.counted!==v&&!window.confirm('¿Reemplazar el conteo de efectivo que ya guardaste?'))return;
  rec.counted=v;saveDay(day,rec);msg('✓ Conteo guardado. Comprueba la diferencia.');render();
 }catch(e){msg(e.message,true)}
}
function addMovement(){
 const day=$('nv-arq-day').value;
 const selected=$('nv-arq-kind').value,cents=parsePesos($('nv-arq-move-amount').value,false);
 const kind=selected==='in'?'in':'out';
 const category=selected==='expense'?'expense':selected==='withdrawal'?'withdrawal':null;
 const reason=String($('nv-arq-move-reason').value||'').trim().slice(0,100);
 if(!['in','expense','withdrawal','out'].includes(selected)||cents===null){msg('Indica una entrada o salida con importe mayor que cero.',true);return}
 if(!reason){msg('Indica el motivo del movimiento para identificarlo después.',true);return}
 try{
  const rec=getDay(day);
  if(rec.moves.length>=250){msg('Límite de 250 movimientos por día. No se modificaron datos.',true);return}
  const prev=rec.moves[rec.moves.length-1];
  if(prev&&prev.kind===kind&&(prev.category||null)===category&&prev.cents===cents&&prev.reason===reason&&
     Date.now()-new Date(prev.at).getTime()<15000){
   msg('Movimiento idéntico recién guardado. Evitamos duplicarlo por doble toque.',true);return;
  }
  const id=typeof crypto?.randomUUID==='function'?crypto.randomUUID():'ARQ-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
  rec.moves.push({id,kind,...(category?{category}:{}),cents,reason,at:new Date().toISOString()});
  saveDay(day,rec);
  $('nv-arq-move-amount').value='';$('nv-arq-move-reason').value='';
  msg('✓ Movimiento registrado para el día '+day+'.');render();
 }catch(e){msg(e.message,true)}
}
function removeMovement(id){
 const day=$('nv-arq-day').value;
 try{
  const rec=getDay(day),m=rec.moves.find(x=>x.id===id);if(!m)return;
  if(!window.confirm('¿Eliminar '+(m.kind==='in'?'esta entrada':'esta salida')+' de '+money(m.cents)+'?'))return;
  rec.moves=rec.moves.filter(x=>x.id!==id);saveDay(day,rec);
  msg('Movimiento eliminado.');render();
 }catch(e){msg(e.message,true)}
}
function copySummary(){
 try{
  const r=calculate($('nv-arq-day').value);
  const summary='NAVARRO 360 · ARQUEO LOCAL '+r.day+'\n'+
   'Fondo inicial: '+(r.initial===null?'No registrado':money(r.initial))+'\n'+
   'Tickets en efectivo (cola Windows): '+money(r.cash)+' · '+r.tickets+'\n'+
   'Entradas de caja: +'+money(r.income)+'\nSalidas de caja: -'+money(r.expense)+'\n'+
   'Efectivo esperado: '+money(r.expected)+'\n'+
   'Contado físicamente: '+(r.counted===null?'Pendiente':money(r.counted))+'\n'+
   'Diferencia: '+(r.difference===null?'Pendiente':money(r.difference))+'\n'+
   'Estimación local, no certifica ventas ni pagos.';
  if(!navigator.clipboard?.writeText){msg('Portapapeles no disponible en esta aplicación.',true);return}
  navigator.clipboard.writeText(summary).then(()=>msg('✓ Resumen copiado, puedes pegarlo en WhatsApp.'),()=>msg('No se pudo copiar el resumen.',true));
 }catch(e){msg(e.message,true)}
}
function mount(){
 if($('nv-arq-open'))return true;
 const corte=$('nv-corte-open');
 if(!corte||!corte.parentElement)return false;
 const button=document.createElement('button');button.id='nv-arq-open';button.type='button';
 button.textContent='💵 Arqueo de efectivo';button.className='nv-arq-open';
 corte.parentElement.insertBefore(button,corte.nextSibling);
 modal=document.createElement('div');modal.id='nv-arq-overlay';modal.hidden=true;
 modal.innerHTML=
 '<section class="nv-arq-dialog" role="dialog" aria-modal="true" aria-labelledby="nv-arq-title">'+
  '<div class="nv-arq-heading"><h2 id="nv-arq-title">💵 Arqueo de efectivo</h2><button type="button" id="nv-arq-close" aria-label="Cerrar">✕</button></div>'+
  '<p class="nv-arq-help">Cierre local del cajón: registra el fondo, movimientos de efectivo y cuenta el dinero real. No afecta tickets, pagos ni SIFO.</p>'+
  '<label>Fecha de caja<input type="date" id="nv-arq-day"></label>'+
  '<div class="nv-arq-stats">'+
   '<div><small>Fondo inicial</small><strong id="nv-arq-opening">—</strong></div>'+
   '<div><small>Tickets en efectivo</small><strong id="nv-arq-tickets">—</strong></div>'+
   '<div><small>Entradas manuales</small><strong id="nv-arq-ins">—</strong></div>'+
   '<div><small>Salidas manuales</small><strong id="nv-arq-outs">—</strong></div>'+
   '<div><small>Esperado en el cajón</small><strong id="nv-arq-expected">—</strong></div>'+
   '<div><small>Efectivo contado</small><strong id="nv-arq-counted-saved">—</strong></div>'+
  '</div>'+
  '<div class="nv-arq-balance"><span>Diferencia de caja</span><strong id="nv-arq-difference">Pendiente</strong></div>'+
  '<p id="nv-arq-warning" class="nv-arq-help"></p>'+
  '<div class="nv-arq-edit"><label>Fondo inicial ($)<input id="nv-arq-initial" type="text" inputmode="decimal" placeholder="Ej. 500.00" maxlength="12"></label><button type="button" id="nv-arq-save-initial">Guardar fondo</button></div>'+
  '<h3>Movimientos de efectivo</h3>'+
  '<div class="nv-arq-grid"><label>Tipo<select id="nv-arq-kind"><option value="in">Entrada de efectivo</option><option value="expense">Gasto del negocio</option><option value="withdrawal">Retiro de efectivo</option><option value="out">Otra salida (sin clasificar)</option></select></label><label>Importe ($)<input id="nv-arq-move-amount" type="text" inputmode="decimal" maxlength="12" placeholder="Ej. 100.00"></label></div>'+
  '<label>Motivo<input id="nv-arq-move-reason" type="text" maxlength="100" placeholder="Ej. Pago de material, retiro para banco, caja"></label>'+
  '<button type="button" id="nv-arq-add">+ Registrar entrada o salida</button>'+
  '<p id="nv-arq-move-count" class="nv-arq-help"></p><div id="nv-arq-moves"></div>'+
  '<h3>Cierre y diferencia</h3>'+
  '<div class="nv-arq-edit"><label>Efectivo contado ($)<input id="nv-arq-counted" type="text" inputmode="decimal" maxlength="12" placeholder="Cuenta los billetes y monedas"></label><button type="button" id="nv-arq-save-counted">Guardar conteo</button></div>'+
  '<button type="button" id="nv-arq-copy">Copiar resumen del arqueo</button>'+
  '<p id="nv-arq-status" role="status"></p>'+
 '</section>';
 document.body.appendChild(modal);
 const css=document.createElement('style');css.textContent=
 '#nv-arq-overlay[hidden]{display:none!important}'+
 '.nv-arq-open{display:block;box-sizing:border-box;width:100%;min-height:48px;margin:5px 0 10px;border:1px solid #a7cbb7;border-radius:11px;background:#eff8f1;color:#1b5e37;font:800 14px system-ui;cursor:pointer}'+
 '#nv-arq-overlay{box-sizing:border-box;position:fixed;inset:0;z-index:2147483440;background:#081d25d9;display:flex;align-items:center;justify-content:center;padding:12px}'+
 '.nv-arq-dialog{box-sizing:border-box;width:100%;max-width:540px;max-height:94dvh;overflow:auto;-webkit-overflow-scrolling:touch;border-radius:15px;background:#fff;color:#163b26;padding:16px;font:14px/1.4 system-ui}'+
 '.nv-arq-heading{display:flex;align-items:center;justify-content:space-between}.nv-arq-heading h2{font-size:20px;margin:0}.nv-arq-heading button{font:20px system-ui;min-width:44px;border:0;background:#eef3ee;border-radius:9px}'+
 '.nv-arq-help{color:#63756a;font:12px/1.5 system-ui;margin:8px 0 12px}'+
 '.nv-arq-dialog label{display:block;font:750 13px system-ui;margin:9px 0}'+
 '.nv-arq-dialog input,.nv-arq-dialog select{box-sizing:border-box;display:block;width:100%;min-height:44px;padding:9px;border:1px solid #bad0c0;border-radius:9px;background:#fff;color:#18392a;font:16px system-ui;margin-top:5px}'+
 '.nv-arq-dialog button{min-height:44px;padding:9px 12px;border:0;border-radius:9px;background:#226b44;color:#fff;font:800 13px system-ui}'+
 '.nv-arq-dialog button:disabled{opacity:.5}'+
 '.nv-arq-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}'+
 '.nv-arq-stats>div{border:1px solid #e0e9e2;border-radius:10px;padding:11px;display:flex;flex-direction:column;gap:6px;min-width:0}'+
 '.nv-arq-stats small{font:12px system-ui;color:#587363}.nv-arq-stats strong{font:850 16px system-ui;overflow-wrap:anywhere}'+
 '.nv-arq-balance{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #cbd9cf;border-bottom:1px solid #cbd9cf;padding:12px 0;font:800 15px system-ui}'+
 '.nv-arq-dialog h3{font-size:15px;margin:16px 0 8px}.nv-arq-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}'+
 '.nv-arq-edit{display:grid;grid-template-columns:1fr auto;align-items:end;gap:8px}.nv-arq-edit button{margin-bottom:9px}'+
 '#nv-arq-add,#nv-arq-copy{width:100%;margin:6px 0}'+
 '.nv-arq-move{border-top:1px solid #e1ebe2;display:flex;gap:8px;align-items:center;padding:8px 0}'+
 '.nv-arq-move-info{flex:1;min-width:0;display:flex;flex-direction:column}.nv-arq-move-info small{font:12px system-ui;color:#66766b;overflow-wrap:anywhere}'+
 '.nv-arq-move button{background:#f9e6e6;color:#902c2c}'+
 '#nv-arq-status{font:800 13px/1.5 system-ui;min-height:16px}'+
 '@media(max-width:375px){.nv-arq-edit{grid-template-columns:1fr}.nv-arq-edit button{margin-bottom:0}}';
 document.head.appendChild(css);
 $('nv-arq-day').value=today();
 button.addEventListener('click',()=>{loadedDay='';modal.hidden=false;msg('');render()});
 $('nv-arq-close').addEventListener('click',()=>{modal.hidden=true});
 modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)modal.hidden=true});
 $('nv-arq-day').addEventListener('change',()=>{loadedDay='';msg('');render()});
 $('nv-arq-save-initial').addEventListener('click',saveOpening);
 $('nv-arq-save-counted').addEventListener('click',saveCounted);
 $('nv-arq-add').addEventListener('click',addMovement);
 $('nv-arq-moves').addEventListener('click',e=>{const b=e.target.closest('button[data-move-id]');if(b)removeMovement(b.dataset.moveId)});
 $('nv-arq-copy').addEventListener('click',copySummary);
 return true;
}
function init(){
 if(mount())return;
 let attempts=0;
 const timer=setInterval(()=>{if(mount()||++attempts>=20)clearInterval(timer)},300);
}
window.NAVARRO_ARQUEO_EFECTIVO_V1=Object.freeze({version:2,calcular:calculate,leerDia:getDay,leerMonto:parsePesos,fechaHoy:today});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();