
function creditCore(){
 const moneyOk=n=>Number.isSafeInteger(n)&&n>0&&n<=10000000000;
 const validId=v=>typeof v==='string'&&/^[0-9a-z-]{8,80}$/i.test(v);
 const clean=(v,max)=>String(v??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
 const day=v=>{const d=new Date(v);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 function amount(s){s=String(s??'').trim().replace(',','.');if(!/^\d{1,8}(?:\.\d{1,2})?$/.test(s))return null;const [a,b='']=s.split('.');const n=Number(a)*100+Number((b+'00').slice(0,2));return moneyOk(n)?n:null}
 function balances(sales,payments,id){
  const own=sales.filter(x=>x.customer===id),paid=payments.filter(x=>x.customer===id);
  const total=own.reduce((n,x)=>n+x.cents,0),abonos=paid.reduce((n,x)=>n+x.cents,0);
  return {total,abonos,saldo:total-abonos,sales:own,payments:paid};
 }
 function paymentAllowed(n,saldo,method){return moneyOk(n)&&n<=saldo&&['cash','card','transfer'].includes(method)}
 return {moneyOk,validId,clean,day,amount,balances,paymentAllowed};
}

(function(){
'use strict';
if(window.NAVARRO_CLIENTES_V299)return;
const c=creditCore(),$=id=>document.getElementById(id);
const prefix='navarro360-creditos-v299:';
const boxes=['COMPUTADORA','PABLO','DIANA','GOLI'];
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n/100);
const methodName=m=>({cash:'Efectivo',card:'Tarjeta',transfer:'Transferencia'})[m]||m;
function caja(){
 const i=window.NAVARRO_INVENTARIO_V22?.estado?.(),a=window.NAVARRO_CENTRO_AMPLIADO_V27?.estado?.();
 const id=String(a?.autorizado?a.caja:i?.reconocido?i.caja:'').toUpperCase();
 return window.NAVARRO_PRINT_SILENCIOSA?.vinculado?.()&&boxes.includes(id)?id:null;
}
function base(box){if(!boxes.includes(box))throw Error('Caja no autorizada');return prefix+box+':'}
function list(box,type){
 const p=base(box)+type+':',out=[];
 for(const k of Object.keys(localStorage)){if(!k.startsWith(p))continue;const r=JSON.parse(localStorage.getItem(k));if(!r||!c.validId(r.id)||k!==p+r.id||r.box!==box)throw Error('Registro local inválido. No se modificó.');
 if(type==='cliente'){if(typeof r.name!=='string'||!r.name.trim())throw Error('Cliente inválido');}
 else if(!c.validId(r.customer)||!c.moneyOk(r.cents)||!Number.isFinite(Date.parse(r.at))||(type==='abono'&&!['cash','card','transfer'].includes(r.method)))throw Error('Movimiento inválido');
 out.push(r)}
 return out;
}
function put(box,type,r){if(caja()!==box)throw Error('Caja sin autorización');const k=base(box)+type+':'+r.id,old=localStorage.getItem(k);if(old!==null)return false;const raw=JSON.stringify(r);localStorage.setItem(k,raw);if(localStorage.getItem(k)!==raw)throw Error('No se confirmó el guardado local');return true}

 // La base en Windows es la autoridad. Los registros de esta caja se conservan
 // en local y se reenvían con el mismo ID; ningún dato privado se publica.
 let remote=null,remoteKey='',syncing=null,lastError='',lastSync=0,syncTimer=null,failedPayment='';
 const pendingKey=box=>base(box)+'abono-pendiente';
 function context(){
  const box=caja();if(!box)return null;
  try{
   const p=JSON.parse(localStorage.getItem('navarro360_print_bridge_pair_v1')||'null'),d=JSON.parse(localStorage.getItem('navarro-inventario-device-v22')||'null');
   if(!p||!d||!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(dev|app)\/?$/.test(p.url)||!/^[a-f0-9]{64}$/i.test(p.token)||!/^[a-f0-9-]{36}$/i.test(d.deviceId)||!/^[a-f0-9]{64}$/i.test(d.deviceToken))return null;
   return {box,url:p.url.replace(/\/$/,''),token:p.token,deviceId:d.deviceId,deviceToken:d.deviceToken,key:box+'|'+p.url+'|'+d.deviceId+'|'+p.token+'|'+d.deviceToken};
  }catch{return null}
 }
 function current(ctx){if(!ctx||context()?.key!==ctx.key)throw Error('Cambió la caja o la vinculación.');}
 async function request(ctx,body){
  current(ctx);
  const res=await fetch(ctx.url+'/creditos-v30',{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+ctx.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},body:JSON.stringify({...body,deviceId:ctx.deviceId,deviceToken:ctx.deviceToken}),signal:AbortSignal.timeout(15000)});
  let x;try{x=await res.json()}catch{}
  current(ctx);
  if(!res.ok||x?.ok!==true||x.box!==ctx.box)throw Object.assign(Error(res.status===404?'El puente aún no tiene el módulo de créditos V30.':x?.error||'No se confirmó la comunicación con Windows.'),{status:res.status});
  return x;
 }
 async function readAll(ctx,kind){
  let cursor=null,out=[],seen=new Set();
  do{
   const r=await request(ctx,{action:'list',kind,cursor});
   if(!Array.isArray(r.rows)||r.rows.length>500)throw Error('Respuesta de créditos inválida.');
   for(const row of r.rows){if(!c.validId(row.id)||seen.has(row.id))throw Error('Folio inválido en Windows.');seen.add(row.id);out.push(row)}
   if(r.cursor!==null&&(!c.validId(r.cursor)||r.cursor===cursor||!seen.has(r.cursor)))throw Error('Paginación inválida.');
   cursor=r.cursor;
  }while(cursor!==null);
  return out;
 }
 function transform(customers,events){
  const ids=new Set(customers.map(x=>x.id));
  const clientes=customers.map(x=>({id:x.id,name:x.nombre,phone:x.telefono,box:x.caja,at:x.creado}));
  const moves=events.map(x=>({id:x.id,customer:x.cliente,box:x.caja,cents:x.centavos,at:x.fecha,kind:x.tipo,method:x.metodo,ticket:x.ticket}));
  if(clientes.some(x=>!boxes.includes(x.box)||typeof x.name!=='string')||moves.some(x=>!ids.has(x.customer)||!boxes.includes(x.box)||!c.moneyOk(x.cents)||!Number.isFinite(Date.parse(x.at))||!['venta','abono'].includes(x.kind)))throw Error('Datos de Windows no válidos.');
  return {cliente:clientes,venta:moves.filter(x=>x.kind==='venta'),abono:moves.filter(x=>x.kind==='abono')};
 }
 async function snapshot(ctx){const clientes=await readAll(ctx,'clientes'),moves=await readAll(ctx,'movimientos');return transform(clientes,moves)}
 function merged(box,type){
  const ctx=context(),known=ctx&&ctx.key===remoteKey&&remote?remote[type]:[],map=new Map(known.map(x=>[x.id,x]));
  for(const r of list(box,type))if(!map.has(r.id))map.set(r.id,r);
  return [...map.values()];
 }
 function sameRecord(a,b,type){return a.box===b.box&&(type==='cliente'?a.name===b.name&&a.phone===b.phone:a.customer===b.customer&&a.cents===b.cents&&(type==='venta'||a.method===b.method)&&new Date(a.at).toISOString()===new Date(b.at).toISOString())}
 function moveBody(r,type){return {action:'movimiento',record:{id:r.id,customer:r.customer,kind:type,cents:r.cents,method:type==='venta'?'credit':r.method,ticket:type==='venta'?r.id:null,at:r.at}}}
 function fresh(){const ctx=context();return !!(ctx&&ctx.key===remoteKey&&remote&&Date.now()-lastSync<30000&&!lastError)}
 function refreshNotice(){
  const e=$('nv30-sync-status');if(!e)return;
  const connected=fresh();
  e.textContent=(syncing?'Sincronizando con Windows…':connected?'✓ Base compartida conectada':lastError?'Sin conexión o pendiente de revisión: '+lastError:'Esperando conexión con Windows.')+(failedPayment?' · '+failedPayment:'');
  e.style.color=connected?'#205e40':'#9a4c12';
 }
 async function sync(){
  const ctx=context();
  if(!ctx){remote=null;remoteKey='';lastSync=0;lastError='Caja o dispositivo sin reconocimiento.';refreshNotice();return false}
  if(remoteKey!==ctx.key){remote=null;remoteKey=ctx.key;lastSync=0;}
  if(syncing)return syncing;
  syncing=(async()=>{
   const check=await request(ctx,{action:'check'});if(check.version!==30)throw Error('Versión de puente no compatible.');
   // Primero registrar los clientes de esta caja; no fusionar homónimos.
   let data=await snapshot(ctx);current(ctx);
   // Recuperar tickets locales asociados a clientes de otras cajas tras reconectar.
   const prior=remote;remote=data;remoteKey=ctx.key;recover(ctx.box);
   for(const type of ['cliente','venta','abono']){
    const known=new Map(data[type].map(x=>[x.id,x]));
    for(const r of list(ctx.box,type).sort((a,b)=>String(a.at).localeCompare(String(b.at)))){
     const old=known.get(r.id);
     if(old){if(!sameRecord(r,old,type))throw Error('Conflicto de folio '+r.id+'. Conservamos el registro local.');continue;}
     if(type==='cliente')await request(ctx,{action:'cliente',record:{id:r.id,name:r.name,phone:r.phone||''}});
     else await request(ctx,moveBody(r,type));
    }
   }
   const pending=localStorage.getItem(pendingKey(ctx.box));
   if(pending){
    const r=JSON.parse(pending);
    if(!r||r.box!==ctx.box||!c.validId(r.id)||!c.validId(r.customer)||!c.paymentAllowed(r.cents,Number.MAX_SAFE_INTEGER,r.method))throw Error('Abono pendiente inválido. No se borró.');
    try{
     const result=await request(ctx,moveBody(r,'abono'));
     if(result.id!==r.id)throw Error('Respuesta de abono incorrecta.');
     put(ctx.box,'abono',r);if(localStorage.getItem(pendingKey(ctx.box))===pending)localStorage.removeItem(pendingKey(ctx.box));
     failedPayment='Abono confirmado por Windows.';
    }catch(e){
     if(e.status===409&&e.message==='El abono supera el saldo actual'){if(localStorage.getItem(pendingKey(ctx.box))===pending)localStorage.removeItem(pendingKey(ctx.box));failedPayment='Abono rechazado: el saldo cambió. No se registró.';}
     else throw e;
    }
   }
   data=await snapshot(ctx);current(ctx);
   const changed=JSON.stringify(data)!==JSON.stringify(prior);
   remote=data;remoteKey=ctx.key;lastSync=Date.now();lastError='';
   if(changed&&area?.dataset.v27Active==='yes'&&!working&&!area.contains(document.activeElement))renderAdmin();
   return true;
  })().catch(e=>{lastError=e.message||'No se pudo sincronizar.';lastSync=0;return false}).finally(()=>{syncing=null;refreshNotice();onCreditSync()});
  refreshNotice();return syncing;
 }
 function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{void sync()},150)}

function clients(box){return merged(box,'cliente').sort((a,b)=>a.name.localeCompare(b.name,'es'))}
function getClient(box,id){return clients(box).find(x=>x.id===id)}
function newClient(box){
 const raw=prompt('Nombre del cliente','');if(raw===null)return null;
 const name=c.clean(raw,100);if(name.length<2)throw Error('Escribe el nombre del cliente.');
 const p=prompt('Teléfono (opcional)','');if(p===null)return null;const phone=c.clean(p,30);
 if(phone&&!/^[+\d()\s.-]{5,30}$/.test(phone))throw Error('Teléfono no válido');
 const same=clients(box).filter(x=>x.name.toLocaleLowerCase('es-MX')===name.toLocaleLowerCase('es-MX')&&x.phone===phone);
 if(same.length){if(confirm('Ya existe '+name+'. ¿Usar ese expediente?'))return same[0];return null}
 const r={id:crypto.randomUUID(),box,name,phone,at:new Date().toISOString()};put(box,'cliente',r);scheduleSync();return r;
}

let selected=null,checkoutBox=null,wrap=null,notice=null,selectedLabel=null,assignButton=null,newButton=null,picker=null,query=null,choices=null,newForm=null,nameField=null,phoneField=null,moreButton=null;
let choiceSignature='',limit=40,assignedName='',lastMode='',lastChoiceError='';
const normSearch=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-MX').trim();
function visible(node,show){if(node&&node.hidden===show)node.hidden=!show}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
function node(tag,txt,parent){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(parent)parent.appendChild(e);return e}
function action(txt,parent,fn){const e=node('button',txt,parent);e.type='button';e.addEventListener('click',ev=>{ev.preventDefault();try{fn()}catch(err){setText(notice,err.message||'No se pudo completar la acción.')}});return e}
function clearAssignedName(){const field=$('nv-ticket-client');if(assignedName&&field?.value===assignedName)field.value='';assignedName=''}
function closePanels(){visible(picker,false);visible(newForm,false);choiceSignature='';if(query)query.value='';limit=40}
function clear(){
 selected=null;checkoutBox=null;lastChoiceError='';clearAssignedName();closePanels();
 setText(selectedLabel,'Sin cliente asignado');setText(notice,'');setText(assignButton,'Asignar cliente');
}
function pick(r,box){
 if(caja()!==box||!r||!c.validId(r.id))throw Error('La caja cambió. Vuelve a seleccionar el cliente.');
 selected={id:r.id,name:r.name,phone:r.phone||''};checkoutBox=box;
 clearAssignedName();closePanels();showBalance();
}
function showBalance(){
 if(!notice)return;
 setText(selectedLabel,selected?selected.name:'Sin cliente asignado');
 setText(assignButton,selected?'Cambiar cliente':'Asignar cliente');
 visible($('nv30-remove-client'),!!selected);
 if(!selected){setText(notice,lastChoiceError||'Puedes elegir un cliente existente o registrar uno nuevo.');return;}
 try{const b=balance(checkoutBox,selected.id);setText(notice,(fresh()?'Saldo compartido: ':'Saldo por verificar: ')+money(b.saldo));}
 catch(e){setText(notice,'Cliente seleccionado. Saldo por verificar.');}
}
function refreshChoices(box,force=false){
 if(!picker||picker.hidden||!box||checkoutBox!==box)return;
 const arr=clients(box),q=normSearch(query.value),filtered=arr.filter(r=>!q||normSearch(r.name+' '+(r.phone||'')).includes(q));
 const shown=filtered.slice(0,limit),sig=JSON.stringify([q,filtered.length,shown.map(r=>[r.id,r.name,r.phone])]);
 if(!force&&sig===choiceSignature)return;
 choiceSignature=sig;
 const fragment=document.createDocumentFragment();
 if(!shown.length)node('p',fresh()?'No hay clientes que coincidan.':'No hay resultados disponibles. Comprueba la sincronización.',fragment);
 for(const r of shown){
  const item=action(r.name,fragment,()=>pick(r,box));item.className='nv30-client-option';
  if(r.phone)node('small',r.phone,item);
 }
 choices.replaceChildren(fragment);
 visible(moreButton,filtered.length>shown.length);
}
function balance(box,id){return c.balances(merged(box,'venta'),merged(box,'abono'),id)}
function openPicker(){
 const box=caja();if(!box)throw Error('Caja no reconocida.');
 if(checkoutBox!==box){clear();checkoutBox=box}
 if(!picker.hidden){closePanels();return}
 visible(newForm,false);visible(picker,true);query.value='';limit=40;choiceSignature='';
 refreshChoices(box);scheduleSync();
 // No enfocar automáticamente: en iPhone no abrir teclado ni mover el carrito.
}
function openNew(){
 const box=caja();if(!box)throw Error('Caja no reconocida.');
 if(checkoutBox!==box){clear();checkoutBox=box}
 if(!newForm.hidden){closePanels();return}
 visible(picker,false);visible(newForm,true);nameField.value='';phoneField.value='';
}
function createFromFields(){
 const box=caja();if(!box||checkoutBox!==box)throw Error('Caja no reconocida.');
 const name=c.clean(nameField.value,100),phone=c.clean(phoneField.value,30);
 if(name.length<2)throw Error('Escribe el nombre del cliente.');
 if(phone&&!/^[+\d()\s.-]{5,30}$/.test(phone))throw Error('Teléfono no válido.');
 const same=clients(box).filter(r=>normSearch(r.name)===normSearch(name)&&(r.phone||'')===phone);
 if(same.length===1){pick(same[0],box);return}
 if(same.length>1){openPicker();query.value=name;refreshChoices(box,true);throw Error('Hay varios clientes con ese nombre. Selecciona el expediente correcto.')}
 const r={id:crypto.randomUUID(),box,name,phone,at:new Date().toISOString()};put(box,'cliente',r);pick(r,box);scheduleSync();
}
function ensureCheckout(){
 const method=$('nv-ce-v2-method');if(!method)return false;if(wrap?.isConnected)return true;
 wrap=node('div');wrap.id='nv299-credit-client';wrap.hidden=true;
 wrap.style.cssText='margin:8px 0;padding:10px;border:1px solid #b8d5c0;border-radius:10px;background:#fff;min-width:0';
 node('strong','Cliente del crédito',wrap);
 selectedLabel=node('p','Sin cliente asignado',wrap);selectedLabel.style.cssText='margin:5px 0;font-weight:750;overflow-wrap:anywhere';
 const actions=node('div',undefined,wrap);actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 assignButton=action('Asignar cliente',actions,openPicker);
 newButton=action('Cliente nuevo',actions,openNew);
 for(const e of [assignButton,newButton])e.style.cssText='flex:1 1 120px;background:#205e40;color:white;min-height:44px;font-size:14px';
 const remove=action('Quitar cliente',wrap,()=>{const box=caja();clear();checkoutBox=box;showBalance()});remove.id='nv30-remove-client';remove.hidden=true;remove.style.cssText='margin-top:6px';
 picker=node('section',undefined,wrap);picker.hidden=true;picker.style.marginTop='10px';
 query=node('input',undefined,picker);query.type='search';query.autocomplete='off';query.placeholder='Buscar cliente por nombre o teléfono';query.setAttribute('aria-label','Buscar cliente');
 choices=node('div',undefined,picker);choices.style.cssText='max-height:260px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;margin:5px 0';
 query.addEventListener('input',()=>{try{limit=40;refreshChoices(caja(),true)}catch(e){setText(notice,e.message)}});
 query.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();refreshChoices(caja(),true)}});
 moreButton=action('Mostrar más clientes',picker,()=>{limit+=40;refreshChoices(caja(),true)});moreButton.hidden=true;
 action('Cerrar lista',picker,closePanels);
 newForm=node('section',undefined,wrap);newForm.hidden=true;newForm.style.marginTop='10px';
 const nl=node('label','Nombre del cliente',newForm);nameField=node('input',undefined,nl);nameField.maxLength=100;nameField.autocomplete='off';
 const pl=node('label','Teléfono (opcional)',newForm);phoneField=node('input',undefined,pl);phoneField.type='tel';phoneField.maxLength=30;phoneField.autocomplete='off';
 action('Guardar y asignar',newForm,createFromFields).style.cssText='width:100%;background:#205e40;color:white;margin:7px 0';
 action('Cancelar',newForm,closePanels);
 for(const e of [nameField,phoneField])e.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();if(e===nameField)phoneField.focus();else try{createFromFields()}catch(err){setText(notice,err.message)}}});
 notice=node('small','',wrap);notice.setAttribute('role','status');notice.style.cssText='display:block;margin-top:7px;overflow-wrap:anywhere';
 const css=node('style',undefined,document.head);css.textContent='#nv299-credit-client [hidden]{display:none!important}#nv299-credit-client .nv30-client-option{display:block;text-align:left;width:100%;margin:4px 0;min-height:44px;font-size:14px;white-space:normal}#nv299-credit-client .nv30-client-option small{display:block;font-weight:400}';
 method.after(wrap);return true;
}
function renderCheckout(method){
 // No recrear controles ni consultar el almacenamiento en cada intervalo.
 if(method!=='credit'){if(wrap&&!wrap.hidden){clear();visible(wrap,false)}lastMode=method;return}
 const box=caja();if(!box){if(wrap&&!wrap.hidden){clear();visible(wrap,false)}lastMode='';return}
 if(!ensureCheckout())return;
 const changed=checkoutBox!==box||lastMode!=='credit';
 if(checkoutBox!==box){clear();checkoutBox=box}
 visible(wrap,true);lastMode='credit';
 if(changed){showBalance();scheduleSync()}
}
function onCreditSync(){
 if(!wrap||wrap.hidden||lastMode!=='credit')return;
 const box=caja();if(!box||checkoutBox!==box)return;
 try{showBalance();refreshChoices(box)}catch(e){setText(notice,e.message)}
}
function bindCheckout(method){
 if(method!=='credit'){clear();return}
 if(!selected)return;
 const box=caja();if(!box||checkoutBox!==box)throw Error('La caja del cliente cambió. Selecciona nuevamente el expediente.');
 const field=$('nv-ticket-client');if(!field)throw Error('No se encontró el nombre del cliente en el ticket.');
 field.value=selected.name;assignedName=selected.name;
}
function selection(state){
 if(state!=='cobrar'||!selected)return null;
 const box=caja();if(!box||box!==checkoutBox)throw Error('La caja del cliente cambió. Selecciona nuevamente el expediente.');
 if(String($('nv-ticket-client')?.value||'').trim()!==selected.name)throw Error('Revisa el cliente asignado antes de finalizar.');
 return {id:selected.id,box};
}
function record(job){
 if(!job||job.state!=='cobrar'||!job.creditClientId||!c.validId(job.jobId))return true;
 const box=caja();if(!box||job.creditBox!==box||!c.validId(job.creditClientId))return false;
 const total=job.subtotal+job.flete;if(!c.moneyOk(total)||!Number.isFinite(Date.parse(job.at)))return false;
 const item={id:job.jobId,customer:job.creditClientId,box,cents:total,at:new Date(job.at).toISOString()};
 const k=base(box)+'venta:'+item.id,old=localStorage.getItem(k);
 if(old!==null){const v=JSON.parse(old);return v.customer===item.customer&&v.cents===item.cents}
 put(box,'venta',item);scheduleSync();return true;
}
function totalsDay(day,box=caja()){
 const out={cash:0,card:0,transfer:0,total:0,count:0};
 if(!box)return out;
 for(const p of merged(box,'abono'))if(p.box===box&&c.day(p.at)===day){out[p.method]+=p.cents;out.total+=p.cents;out.count++}
 return out;
}
function recover(box){
 const h=window.NAVARRO_HISTORIAL;
 for(const x of h?.list?.()||[]){const j=h.get(x.jobId);if(j?.creditClientId&&j.creditBox===box)record(j)}
}
let area=null,term=null,rows=null,status=null,chosen=null,working=false;
const el=(tag,txt,parent)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;if(parent)parent.append(x);return x};
const button=(t,p,fn)=>{const b=el('button',t,p);b.type='button';b.className='nv27-btn';b.addEventListener('click',fn);return b};
function say(s){if(status)status.textContent=s}

async function pay(box,id,amountField,methodField){
 if(working||caja()!==box)return;
 if(!navigator.locks?.request){say('Este navegador no admite el bloqueo seguro de abonos. Usa Safari o Chrome actualizado.');return}
 const cents=c.amount(amountField.value),method=methodField.value;
 if(!c.paymentAllowed(cents,Number.MAX_SAFE_INTEGER,method)){say('Importe inválido.');return}
 working=true;
 try{await navigator.locks.request(base(box)+'abonos',async()=>{
  if(caja()!==box)throw Error('Cambió la caja.');
  const oldPending=!!localStorage.getItem(pendingKey(box));
  if(!await sync())throw Error('No se confirmó el saldo en Windows. No se registró otro abono.');
  if(oldPending)throw Error('Se revisó el abono pendiente. Consulta el historial antes de registrar otro.');
  if(localStorage.getItem(pendingKey(box)))throw Error('Hay un abono pendiente de confirmar. Pulsa Sincronizar.');
  const b=balance(box,id);if(!c.paymentAllowed(cents,b.saldo,method))throw Error('El importe supera el saldo compartido.');
  if(!confirm('¿Registrar abono recibido de '+money(cents)+' por '+methodName(method)+'? No es una venta nueva.'))return;
  const r={id:crypto.randomUUID(),customer:id,box,cents,method,at:new Date().toISOString()};
  const raw=JSON.stringify(r);localStorage.setItem(pendingKey(box),raw);
  if(localStorage.getItem(pendingKey(box))!==raw)throw Error('No se pudo guardar el folio del abono.');
  failedPayment='';
  const ok=await sync();
  if(!ok||localStorage.getItem(pendingKey(box)))throw Error('Abono pendiente de respuesta. No lo captures otra vez. Pulsa Sincronizar.');
  if(!merged(box,'abono').some(x=>x.id===r.id))throw Error(failedPayment||'El abono no fue registrado.');
  say('Abono registrado. Saldo compartido: '+money(balance(box,id).saldo));
 });}catch(e){say(e.message)}finally{working=false;renderAdmin();refreshNotice()}
}
function renderAdmin(){
 if(!area)return;
 const box=caja();area.querySelector('#nv299-private').hidden=!box;
 if(!box){rows.replaceChildren();say('Disponible únicamente en cajas reconocidas.');return}
 try{
  recover(box);
  const all=clients(box),sales=merged(box,'venta'),payments=merged(box,'abono');
  const total=sales.reduce((n,x)=>n+x.cents,0)-payments.reduce((n,x)=>n+x.cents,0);
  const today=totalsDay(c.day(Date.now()),box);
  area.querySelector('#nv299-summary').textContent='Saldo '+(fresh()?'compartido':'por verificar')+': '+money(total)+' · '+all.length+' clientes';
  area.querySelector('#nv299-incoming').textContent='Abonos de hoy: '+money(today.total)+' · Efectivo '+money(today.cash)+' · Tarjeta '+money(today.card)+' · Transferencia '+money(today.transfer);
  rows.replaceChildren();
  const q=term.value.trim().toLocaleLowerCase('es-MX');
  for(const r of all.filter(x=>!q||[x.name,x.phone].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(q)))){
   const b=c.balances(sales,payments,r.id),card=el('div',undefined,rows);card.className='nv27-row';
   el('strong',r.name,card);el('small',r.phone||'Sin teléfono',card);
   el('p','Créditos: '+money(b.total)+' · Abonos: '+money(b.abonos)+' · Saldo: '+money(b.saldo),card);
   button(chosen===r.id?'Cerrar expediente':'Ver expediente',card,()=>{chosen=chosen===r.id?null:r.id;renderAdmin()});
   if(chosen!==r.id)continue;
   if(b.saldo>0){const label=el('label','Importe recibido',card);label.className='nv27-field';
    const amount=el('input',undefined,label);amount.type='text';amount.inputMode='decimal';amount.placeholder='0.00';
    const method=el('select',undefined,card);method.className='nv27-input';for(const m of ['cash','transfer','card']){const o=el('option',methodName(m),method);o.value=m}
    const p=button('Registrar abono',card,()=>pay(box,r.id,amount,method));p.disabled=working;p.style.cssText='background:#205e40;color:white;border:0;width:100%;margin-top:6px';}
   const history=el('div',undefined,card);el('strong','Movimientos',history);
   const events=[...b.sales.map(x=>({...x,label:'Venta a crédito'})),...b.payments.map(x=>({...x,label:'Abono · '+methodName(x.method)}))].sort((a,b)=>b.at.localeCompare(a.at));
   for(const e of events)el('small',new Date(e.at).toLocaleString('es-MX')+' · '+e.box+' · '+e.label+' · '+money(e.cents)+' · '+e.id.slice(0,8),history);
  }
 }catch(e){say(e.message)}
}
function mountAdmin(){
 if(area)return;
 area=$('nv27-clientes');if(!area)return;
 el('p','Clientes compartidos. Los abonos se confirman en la computadora principal. El dinero recibido se atribuye a la caja que lo cobró.',area);
 el('p','Esperando conexión con Windows.',area).id='nv30-sync-status';
 button('Sincronizar ahora',area,async()=>{const ok=await sync();if(ok)renderAdmin();refreshNotice()});
 status=el('p','',area);status.setAttribute('role','status');
 const priv=el('div',undefined,area);priv.id='nv299-private';priv.hidden=true;
 el('strong','',priv).id='nv299-summary';
 el('p','',priv).id='nv299-incoming';
 term=el('input',undefined,priv);term.type='text';term.className='nv27-input';term.placeholder='Buscar cliente por nombre o teléfono';term.addEventListener('input',renderAdmin);
 button('+ Nuevo cliente',priv,()=>{try{const box=caja();if(!box)return;const r=newClient(box);if(r){chosen=r.id;renderAdmin()}}catch(e){say(e.message)}});
 button('Exportar respaldo de créditos',priv,()=>{try{const box=caja();if(!box)return;const doc={version:299,box,clientes:clients(box),ventas:list(box,'venta'),abonos:list(box,'abono')};const uri=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));const a=el('a',undefined,document.body);a.href=uri;a.download='NAVARRO-creditos-'+box+'.json';a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),2000);say('Respaldo privado exportado. No compartas datos de clientes.')}catch(e){say(e.message)}});
 rows=el('div',undefined,priv);renderAdmin();refreshNotice();
}
window.NAVARRO_CLIENTES_V299=Object.freeze({renderCheckout,bindCheckout,selection,clear,record,totalsDay,renderAdmin});
let lastActive=false,lastBox=null;
setInterval(()=>{mountAdmin();const box=caja(),isActive=!!area&&area.dataset.v27Active==='yes'&&!$('nv26-sheet')?.hidden;if(isActive&&(!lastActive||box!==lastBox)){renderAdmin();scheduleSync();}if(!box){remote=null;remoteKey='';lastSync=0;if(area){area.querySelector('#nv299-private').hidden=true;rows.replaceChildren();refreshNotice()}}lastActive=isActive;lastBox=box;if($('nv-ce-v2')&&!$('nv-ce-v2').hidden)renderCheckout($('nv-ce-v2-method')?.value);else if(wrap&&!wrap.hidden){clear();visible(wrap,false);lastMode=''}},600);
window.addEventListener('storage',e=>{if(e.key?.startsWith(prefix)){scheduleSync();if(area?.dataset.v27Active==='yes'&&!working&&!area.contains(document.activeElement))renderAdmin()}});
setInterval(()=>{if(!document.hidden&&context())void sync()},15000);
window.addEventListener('online',scheduleSync);setTimeout(scheduleSync,1200);
})();
