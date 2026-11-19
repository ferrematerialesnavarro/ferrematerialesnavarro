/* NAVARRO 360 — RESPALDO LOCAL V1 (19/11/2026)
 * Guarda/recupera SOLO tickets, arqueos, ventas en espera y favoritos.
 * NO copia tokens, PIN, vinculación, carrito en curso ni credenciales.
 * Importación de archivo local EXPLÍCITA, valida estructura y fusiona
 * conservando registros existentes. No accede a red, impresora o SIFO.
 */
(function(){
'use strict';
if(window.NAVARRO_RESPALDO_DATOS_V1)return;
const HIST='navarro360_historial_tickets_v1';
const ARQ='navarro360_arqueo_efectivo_v1';
const WAIT='navarro360_ventas_en_espera_v1';
const FAV='navarro360_favoritos_caja_v2';
const SOURCES=[['tickets',HIST,[]],['arqueos',ARQ,{}],['espera',WAIT,[]],['favoritos',FAV,[]]];
const MAGIC='NAVARRO360_DATOS_V1',MAX_BYTES=4_000_000;
const $=id=>document.getElementById(id);
function error(text){throw Error(text)}
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const isNum=v=>Number.isSafeInteger(v)&&v>=0&&v<=9999999999;
const str=(v,n)=>typeof v==='string'&&v.length<=n;
const text=(v,n)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const validIso=d=>typeof d==='string'&&d.length<=40&&Number.isFinite(new Date(d).getTime());
const digits=id=>/^\d{5,30}$/.test(String(id));
function validDay(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const [y,m,d]=day.split('-').map(Number),date=new Date(y,m-1,d);
 return y>=2020&&y<=2100&&date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d;
}
function sanitizeTickets(input){
 if(!Array.isArray(input)||input.length>100)error('Historial de tickets no válido (máximo 100).');
 const ids=new Set(),result=[];
 for(const item of input){
  const j=item?.job;
  if(!isObj(item)||!isObj(j)||!str(j.jobId,80)||!/^[a-z0-9-]{8,80}$/i.test(j.jobId)||
      !Array.isArray(j.rows)||j.rows.length<1||j.rows.length>100||!isNum(j.subtotal)||
      ![0,5000].includes(j.flete)||!['none','pagado','cobrar'].includes(j.state)||!validIso(j.at))
   error('Un ticket no tiene datos válidos; se canceló la operación.');
  if(ids.has(j.jobId))error('El archivo contiene folios repetidos.');
  ids.add(j.jobId);
  let subtotal=0;const rows=[];
  for(const r of j.rows){
   if(!isObj(r)||!digits(r.id)||!str(r.name,200)||!Number.isFinite(r.qty)||r.qty<=0||r.qty>9999||
       !isNum(r.unit)||r.unit===0||r.unit>100000000||!isNum(r.total)||
       r.total===0||r.total>100000000)
     error('El archivo contiene un producto inválido en el historial.');
   subtotal+=r.total;
   rows.push({id:String(r.id),name:r.name,qty:r.qty,unit:r.unit,total:r.total,special:!!r.special});
  }
  if(subtotal!==j.subtotal)error('Un ticket tiene un subtotal que no coincide con sus productos.');
  if(item.copies!==undefined&&(!isNum(item.copies)||item.copies>10000))error('Número de reimpresiones no válido.');
  const at=validIso(item.receivedAt)?item.receivedAt:j.at;
  const state=j.state;
  const method=state==='cobrar'?'credit':state==='pagado'&&['cash','card','transfer'].includes(item.paymentMethod)?item.paymentMethod:'unknown';
  result.push({job:{v:1,jobId:j.jobId,at:j.at,rows,subtotal:j.subtotal,flete:j.flete,state,
       client:text(j.client,100),phone:text(j.phone,30),address:text(j.address,260)},
    paymentMethod:method,receivedAt:at,copies:item.copies||0,source:'cola_windows',
    ...(validIso(item.lastCopyAt)?{lastCopyAt:item.lastCopyAt}:{})});
 }
 return result;
}
function sanitizeArqueos(input){
 if(!isObj(input)||Object.keys(input).length>3660)error('Registro de arqueos no válido.');
 const result=Object.create(null);
 for(const [day,record] of Object.entries(input)){
  if(!validDay(day)||!isObj(record)||!Array.isArray(record.moves)||record.moves.length>250||
     !(record.initial===null||isNum(record.initial))||
     !(record.counted===null||isNum(record.counted)))
    error('Un día del arqueo contiene información inválida.');
  const moves=[],ids=new Set();
  for(const m of record.moves){
   if(!isObj(m)||!str(m.id,120)||!m.id||ids.has(m.id)||
      !['in','out'].includes(m.kind)||!isNum(m.cents)||m.cents===0||
      !validIso(m.at)||!str(m.reason??'',100)||
      (m.category!==undefined&&!['expense','withdrawal'].includes(m.category))||
      (m.kind==='in'&&m.category!==undefined))
    error('Se detectó un movimiento de caja inválido.');
   ids.add(m.id);
   moves.push({id:m.id,kind:m.kind,cents:m.cents,reason:text(m.reason,100),at:m.at,
     ...(m.category?{category:m.category}:{})});
  }
  result[day]={initial:record.initial,counted:record.counted,moves};
 }
 return result;
}
function sanitizeEspera(input){
 if(!Array.isArray(input)||input.length>30)error('Ventas en espera inválidas (máximo 30).');
 const ids=new Set(),result=[];
 for(const d of input){
  if(!isObj(d)||!str(d.id,100)||d.id.length<5||ids.has(d.id)||
    !isNum(d.at)||!isObj(d.cart)||Object.keys(d.cart).length<1||Object.keys(d.cart).length>300)
   error('Una venta en espera está incompleta o duplicada.');
  ids.add(d.id);
  const cart=Object.create(null);
  for(const [id,qty]of Object.entries(d.cart)){
   if(!digits(id)||!Number.isFinite(qty)||qty<=0||qty>9999||
      Math.abs(qty*1000-Math.round(qty*1000))>1e-6)
    error('Una venta en espera tiene un código o cantidad inválida.');
   cart[id]=qty;
  }
  const maps={};
  for(const k of ['clavos','importes','prices']){
   if(d[k]!==undefined&&!isObj(d[k]))error('Mapa de importes incorrecto.');
   maps[k]=Object.create(null);
   for(const [id,amount]of Object.entries(d[k]||{})){
    if(!Object.hasOwn(cart,id)||!isNum(amount)||amount===0||amount>100000000)
      error('Una venta en espera tiene precios inválidos.');
    maps[k][id]=amount;
   }
  }
  const delivery=d.delivery;
  if(delivery!==undefined&&delivery!==null&&(!isObj(delivery)||
       typeof delivery.delivery!=='boolean'||!str(delivery.address??'',260)||
       !str(delivery.phone??'',30)||![null,'gratis','cobrar',undefined].includes(delivery.override)))
   error('Una venta en espera tiene datos de entrega inválidos.');
  const payment=['none','pagado','cobrar'].includes(d.payment)?d.payment:'none';
  result.push({id:d.id,at:d.at,cart,clavos:maps.clavos,importes:maps.importes,prices:maps.prices,
    ...(delivery?{delivery:{delivery:delivery.delivery,address:text(delivery.address,260),
       phone:text(delivery.phone,30),override:delivery.override??null}}:{}),
    client:text(d.client,100),payment});
 }
 return result;
}
function sanitizeFavoritos(input){
 if(!Array.isArray(input)||input.length>8)error('Lista de favoritos no válida.');
 const unique=new Set();
 for(const id of input){if(!digits(id)||String(id)==='00000'||unique.has(String(id)))error('Favorito incorrecto o repetido.');unique.add(String(id))}
 return [...unique];
}
function normalizeData(raw){
 if(!isObj(raw))error('El respaldo no tiene un formato válido.');
 return {
  tickets:sanitizeTickets(raw.tickets),
  arqueos:sanitizeArqueos(raw.arqueos),
  espera:sanitizeEspera(raw.espera),
  favoritos:sanitizeFavoritos(raw.favoritos)
 };
}
function localData(){
 const raw={};
 for(const [kind,key,fallback]of SOURCES){
  const value=localStorage.getItem(key);
  if(value===null){raw[kind]=fallback;continue}
  try{raw[kind]=JSON.parse(value)}catch(_){error('Los datos actuales de '+kind+' están dañados. No se sobrescribirán.')}
 }
 return normalizeData(raw);
}
function createArchive(){
 const data=localData();
 return {format:MAGIC,version:1,createdAt:new Date().toISOString(),containsPersonalData:true,data};
}
function readArchive(obj){
 if(!isObj(obj)||obj.format!==MAGIC||obj.version!==1||!validIso(obj.createdAt)||!isObj(obj.data))
  error('Este archivo no es un respaldo compatible de NAVARRO 360.');
 return normalizeData(obj.data);
}
function countArqueoDays(data){return Object.keys(data).length}
function mergeData(base,coming){
 const added={tickets:0,arqueos:0,movimientos:0,espera:0,favoritos:0,omitidos:0};
 // Los tickets existentes tienen prioridad: no se reemplazan ni se duplican.
 const ticketIds=new Set(base.tickets.map(x=>x.job.jobId)),tickets=base.tickets.slice();
 for(const entry of coming.tickets){
  if(ticketIds.has(entry.job.jobId))continue;
  if(tickets.length>=100){added.omitidos++;continue}
  tickets.push(entry);ticketIds.add(entry.job.jobId);added.tickets++;
 }
 tickets.sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt));
 // Conservar fondo y conteo locales. Agregar solo movimientos no existentes.
 const arqueos=Object.create(null);
 for(const [day,old]of Object.entries(base.arqueos))arqueos[day]={...old,moves:old.moves.slice()};
 for(const [day,inc]of Object.entries(coming.arqueos)){
  if(!Object.hasOwn(arqueos,day)){
   if(Object.keys(arqueos).length>=3660){added.omitidos++;continue}
   arqueos[day]={initial:inc.initial,counted:inc.counted,moves:inc.moves.slice()};
   added.arqueos++;added.movimientos+=inc.moves.length;
   continue;
  }
  const record=arqueos[day];
  if(record.initial===null&&inc.initial!==null)record.initial=inc.initial;
  if(record.counted===null&&inc.counted!==null)record.counted=inc.counted;
  const ids=new Set(record.moves.map(x=>x.id));
  for(const m of inc.moves){
   if(ids.has(m.id))continue;
   if(record.moves.length>=250){added.omitidos++;continue}
   record.moves.push(m);ids.add(m.id);added.movimientos++;
  }
 }
 const espera=base.espera.slice(),waitIds=new Set(espera.map(x=>x.id));
 for(const draft of coming.espera){
  if(waitIds.has(draft.id))continue;
  if(espera.length>=30){added.omitidos++;continue}
  espera.push(draft);waitIds.add(draft.id);added.espera++;
 }
 const favoritos=base.favoritos.slice(),favoriteIds=new Set(favoritos);
 for(const id of coming.favoritos){
  if(favoriteIds.has(id))continue;
  if(favoritos.length>=8){added.omitidos++;continue}
  favoritos.push(id);favoriteIds.add(id);added.favoritos++;
 }
 // Normalize one more time before writing; no untrusted extra keys go to localStorage.
 const merged=normalizeData({tickets,arqueos,espera,favoritos});
 const change=Object.entries(added).some(([k,v])=>k!=='omitidos'&&v>0)||
   JSON.stringify(base.arqueos)!==JSON.stringify(merged.arqueos);
 return {data:merged,added,change};
}
function currentRaw(){
 return Object.fromEntries(SOURCES.map(([kind,key])=>[kind,localStorage.getItem(key)]));
}
function counts(data){
 return {tickets:data.tickets.length,arqueos:countArqueoDays(data.arqueos),espera:data.espera.length,favoritos:data.favoritos.length};
}
function commitMerge(input,expectedSnapshot){
 const old=currentRaw();
 if(expectedSnapshot&&SOURCES.some(([name])=>old[name]!==expectedSnapshot[name]))
  error('Los datos cambiaron mientras revisabas el archivo. Vuelve a elegirlo para evitar perder información.');
 const existing=localData(),merge=mergeData(existing,input);
 if(!merge.change)return {merged:merge,unchanged:true};
 // Cuatro escrituras. Si alguna falla, deshacer las anteriores.
 const written=[];
 try{
  for(const [name,key] of SOURCES){
   const before=JSON.stringify(existing[name]),after=JSON.stringify(merge.data[name]);
   if(before===after)continue;
   localStorage.setItem(key,after);written.push([key,old[name]]);
  }
 }catch(e){
  let rollbackOK=true;
  for(const [key,previous]of written.reverse()){
   try{previous===null?localStorage.removeItem(key):localStorage.setItem(key,previous)}
   catch(_){rollbackOK=false}
  }
  error(rollbackOK?'No hubo espacio para restaurar los datos. Se revirtió el intento.':'Falló el almacenamiento y no se pudo revertir todo. NO borres nada: revisa este navegador y conserva el archivo.');
 }
 return {merged:merge,unchanged:false};
}
function nameFile(){const d=new Date(),two=n=>String(n).padStart(2,'0');return 'NAVARRO360_RESPALDO_'+d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate())+'.json'}
function exportBlob(){
 const pack=createArchive();
 const blob=new Blob([JSON.stringify(pack)],{type:'application/json;charset=utf-8'});
 if(blob.size>MAX_BYTES)error('El respaldo es demasiado grande para esta versión.');
 return {pack,blob,name:nameFile()};
}
function download(){
 try{
  const {blob,name}=exportBlob(),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  notice('Archivo preparado. Guárdalo en Archivos, iCloud Drive o una carpeta privada.');
 }catch(e){notice(e.message,true)}
}
async function share(){
 try{
  const {blob,name}=exportBlob();
  if(typeof File==='undefined'||!navigator.share){notice('Compartir no está disponible. Usa Descargar respaldo.',true);return}
  const file=new File([blob],name,{type:'application/json'});
  if(navigator.canShare&&!navigator.canShare({files:[file]})){notice('Tu navegador no permite compartir este archivo. Usa Descargar.',true);return}
  await navigator.share({files:[file],title:'Respaldo privado NAVARRO 360'});
  notice('Compartir finalizado. Comprueba que el archivo quedó guardado.');
 }catch(e){notice(e?.name==='AbortError'?'Se canceló el menú Compartir.':String(e?.message||'No se pudo compartir'),e?.name!=='AbortError')}
}
let modal=null,candidate=null,candidateSnapshot=null;
function notice(message,bad=false){
 const el=$('nv-backup-status');if(!el)return;
 el.textContent=message;el.style.color=bad?'#a52b2b':'#225d40';
}
function showCounts(){
 if(!modal||modal.hidden)return;
 try{
  const c=counts(localData());
  $('nv-backup-count').textContent=c.tickets+' tickets · '+c.arqueos+' días de caja · '+c.espera+' ventas en espera · '+c.favoritos+' favoritos';
 }catch(e){notice(e.message,true)}
}
function clearCandidate(){
 candidate=null;candidateSnapshot=null;
 const btn=$('nv-backup-restore');if(btn)btn.disabled=true;
 const info=$('nv-backup-preview');if(info)info.textContent='Selecciona un archivo .json para comprobarlo antes de recuperar.';
}
async function chosenFile(event){
 clearCandidate();
 const file=event.target?.files?.[0];
 if(!file)return;
 if(file.size>MAX_BYTES||file.size<2){notice('Archivo vacío o demasiado grande. No se modificaron datos.',true);return}
 try{
  const raw=await file.text();
  if(raw.length>MAX_BYTES)error('Archivo demasiado grande.');
  const data=readArchive(JSON.parse(raw));
  const snap=currentRaw(),existing=localData(),merged=mergeData(existing,data);
  candidate=data;candidateSnapshot=snap;
  const inCounts=counts(data),a=merged.added;
  $('nv-backup-preview').textContent='El respaldo contiene: '+inCounts.tickets+' tickets, '+
   inCounts.arqueos+' días de caja, '+inCounts.espera+' ventas en espera y '+inCounts.favoritos+' favoritos. '+
   'Se agregarían: '+a.tickets+' tickets, '+a.arqueos+' días ('+a.movimientos+' movimientos), '+
   a.espera+' ventas en espera, '+a.favoritos+' favoritos. '+
   (a.omitidos?'Se omitirían '+a.omitidos+' registros por límites de almacenamiento. ':'')+
   'Los registros actuales tendrán prioridad; las fechas coincidentes no reemplazarán el fondo ni el conteo.';
  $('nv-backup-restore').disabled=!merged.change;
  notice(merged.change?'Archivo revisado. Comprueba el resumen y confirma si quieres fusionarlo.':'Sin datos nuevos que importar.');
 }catch(e){clearCandidate();notice('No se pudo revisar: '+(e?.message||'archivo inválido'),true)}
}
function restore(){
 if(!candidate)return;
 let merged;try{merged=mergeData(localData(),candidate)}catch(e){notice(e.message,true);return}
 if(!merged.change){clearCandidate();notice('No había información adicional que recuperar.');return}
 if(!window.confirm('¿FUSIONAR el respaldo con este dispositivo? Se agregarán registros sin borrar los actuales. No incluye la impresora ni el carrito activo.'))return;
 try{
  const out=commitMerge(candidate,candidateSnapshot);
  clearCandidate();showCounts();
  notice(out.unchanged?'No había información nueva.':'✓ Datos fusionados. Cierra y vuelve a abrir NAVARRO 360 para actualizar los contadores.');
 }catch(e){notice(e.message,true)}
}
function mount(){
 if($('nv-backup-open'))return true;
 const report=$('nv-reporte-open'),arq=$('nv-arq-open'),anchor=report||arq;
 if(!anchor?.parentElement)return false;
 const btn=document.createElement('button');btn.type='button';btn.id='nv-backup-open';
 btn.className='nv-backup-open';btn.textContent='🛡️ Respaldar y recuperar datos';
 anchor.parentElement.insertBefore(btn,anchor.nextSibling);
 modal=document.createElement('div');modal.id='nv-backup-overlay';modal.hidden=true;
 modal.innerHTML=
  '<section class="nv-backup-dialog" role="dialog" aria-modal="true" aria-labelledby="nv-backup-title">'+
  '<div class="nv-backup-head"><h2 id="nv-backup-title">🛡️ Respaldo NAVARRO 360</h2><button id="nv-backup-close" type="button" aria-label="Cerrar">✕</button></div>'+
  '<p class="nv-backup-warn">Tus tickets pueden contener nombres, domicilios y teléfonos. Guarda la copia en un lugar privado. El archivo NO está cifrado, y no se sube a ningún servidor.</p>'+
  '<strong id="nv-backup-count">Leyendo datos…</strong>'+
  '<h3>Crear copia segura</h3>'+
  '<p>Incluye los tickets recientes, arqueos, ventas en espera y favoritos. NO incluye claves, token de impresora, PIN ni carrito activo.</p>'+
  '<div class="nv-backup-actions"><button type="button" id="nv-backup-download">Descargar respaldo (.json)</button>'+
  '<button type="button" id="nv-backup-share">Compartir / Guardar en Archivos</button></div>'+
  '<h3>Recuperar en otro iPhone o navegador</h3>'+
  '<p>No reemplaza datos actuales: agrega tickets y ventas faltantes, conserva arqueos y evita duplicados. Requiere confirmación.</p>'+
  '<label for="nv-backup-file">Elegir respaldo (.json)</label>'+
  '<input id="nv-backup-file" type="file" accept=".json,application/json">'+
  '<p id="nv-backup-preview">Selecciona un archivo .json para comprobarlo antes de recuperar.</p>'+
  '<button type="button" id="nv-backup-restore" disabled>Fusionar datos revisados</button>'+
  '<p id="nv-backup-status" role="status"></p>'+
  '<p class="nv-backup-warn">La página de inicio y Safari pueden guardar datos por separado. Conserva el archivo antes de borrar o reinstalar la aplicación.</p>'+
  '</section>';
 document.body.appendChild(modal);
 const st=document.createElement('style');st.textContent=
  '.nv-backup-open{display:block;box-sizing:border-box;width:100%;min-height:48px;margin:5px 0 10px;border:1px solid #c9bca4;background:#f8f5eb;color:#5d4626;border-radius:11px;font:800 14px system-ui;cursor:pointer}'+
  '#nv-backup-overlay[hidden]{display:none!important}#nv-backup-overlay{position:fixed;inset:0;z-index:2147483460;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:#0a172bd9}'+
  '.nv-backup-dialog{box-sizing:border-box;width:100%;max-width:530px;max-height:94dvh;overflow:auto;-webkit-overflow-scrolling:touch;background:#fff;color:#203b2d;border-radius:16px;padding:16px;font:13px/1.45 system-ui}'+
  '.nv-backup-head{display:flex;align-items:center;justify-content:space-between;gap:9px}.nv-backup-head h2{font:800 19px system-ui;margin:0}.nv-backup-head button{background:#e8efe9!important;color:#233c2b!important;min-width:44px}'+
  '.nv-backup-dialog h3{font:800 15px system-ui;margin:19px 0 6px}.nv-backup-dialog p{margin:7px 0 11px}'+
  '.nv-backup-warn{font:12px/1.5 system-ui;color:#7b603f}.nv-backup-dialog label{display:block;font:800 13px system-ui;margin:8px 0}'+
  '#nv-backup-count{display:block;background:#f3f6f4;padding:11px;border-radius:9px}'+
  '.nv-backup-dialog input{display:block;width:100%;box-sizing:border-box;min-height:46px;font:14px system-ui}'+
  '.nv-backup-dialog button{min-height:45px;border:0;border-radius:9px;background:#20633d;color:#fff;padding:9px 11px;font:800 13px system-ui}'+
  '.nv-backup-dialog button:disabled{opacity:.5}.nv-backup-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:11px 0}'+
  '#nv-backup-restore{width:100%;margin-top:9px}#nv-backup-preview{background:#f4f8f5;border-radius:9px;padding:10px;font:12px/1.55 system-ui}'+
  '#nv-backup-status{font:800 12px/1.45 system-ui;min-height:24px}';
 document.head.appendChild(st);
 btn.addEventListener('click',()=>{modal.hidden=false;clearCandidate();showCounts();notice('')});
 $('nv-backup-close').addEventListener('click',()=>{modal.hidden=true;clearCandidate()});
 modal.addEventListener('click',e=>{if(e.target===modal){modal.hidden=true;clearCandidate()}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden){modal.hidden=true;clearCandidate()}});
 $('nv-backup-download').addEventListener('click',download);
 $('nv-backup-share').addEventListener('click',share);
 $('nv-backup-file').addEventListener('change',chosenFile);
 $('nv-backup-restore').addEventListener('click',restore);
 return true;
}
function init(){
 if(mount())return;
 let tries=0;
 const timer=setInterval(()=>{if(mount()||++tries>=25)clearInterval(timer)},250);
}
window.NAVARRO_RESPALDO_DATOS_V1=Object.freeze({
 version:1,crear:createArchive,validar:readArchive,preparar:mergeData,aplicar:commitMerge,
 contar:counts,leer:localData});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();