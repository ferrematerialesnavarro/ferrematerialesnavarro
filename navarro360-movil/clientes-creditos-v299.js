
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
function clients(box){return list(box,'cliente').sort((a,b)=>a.name.localeCompare(b.name,'es'))}
function getClient(box,id){return clients(box).find(x=>x.id===id)}
function newClient(box){
 const raw=prompt('Nombre del cliente','');if(raw===null)return null;
 const name=c.clean(raw,100);if(name.length<2)throw Error('Escribe el nombre del cliente.');
 const p=prompt('Teléfono (opcional)','');if(p===null)return null;const phone=c.clean(p,30);
 if(phone&&!/^[+\d()\s.-]{5,30}$/.test(phone))throw Error('Teléfono no válido');
 const same=clients(box).filter(x=>x.name.toLocaleLowerCase('es-MX')===name.toLocaleLowerCase('es-MX')&&x.phone===phone);
 if(same.length){if(confirm('Ya existe '+name+'. ¿Usar ese expediente?'))return same[0];return null}
 const r={id:crypto.randomUUID(),box,name,phone,at:new Date().toISOString()};put(box,'cliente',r);return r;
}
let selected=null,checkoutBox=null,wrap=null,select=null,notice=null;
function clear(){selected=null;checkoutBox=null;if(select)select.value='';}
function ensureCheckout(){
 const method=$('nv-ce-v2-method');if(!method)return false;if(wrap)return true;
 wrap=document.createElement('div');wrap.id='nv299-credit-client';wrap.hidden=true;wrap.style.cssText='margin:8px 0;padding:8px;border:1px solid #b8d5c0;border-radius:9px;background:#fff';
 const label=document.createElement('label');label.textContent='Cliente del crédito (opcional)';label.htmlFor='nv299-client-select';wrap.append(label);
 select=document.createElement('select');select.id='nv299-client-select';wrap.append(select);
 const btn=document.createElement('button');btn.type='button';btn.textContent='+ Nuevo cliente';btn.style.marginTop='6px';wrap.append(btn);
 notice=document.createElement('small');notice.style.display='block';wrap.append(notice);
 select.addEventListener('change',()=>{selected=select.value||null;showBalance()});
 btn.addEventListener('click',()=>{try{const box=caja();if(!box)return;const r=newClient(box);if(r){selected=r.id;checkoutBox=box;refreshChoices(box);showBalance()}}catch(e){notice.textContent=e.message}});
 method.after(wrap);return true;
}
function refreshChoices(box){
 const arr=clients(box),sig=JSON.stringify(arr.map(x=>[x.id,x.name,x.phone]));
 if(select.dataset.sig!==sig){select.replaceChildren();const o=document.createElement('option');o.value='';o.textContent='Sin cliente asignado';select.append(o);for(const r of arr){const o=document.createElement('option');o.value=r.id;o.textContent=r.name+(r.phone?' · '+r.phone:'');select.append(o)}select.dataset.sig=sig}
 select.value=selected||'';
}
function balance(box,id){return c.balances(list(box,'venta'),list(box,'abono'),id)}
function showBalance(){if(!notice)return;try{notice.textContent=selected&&checkoutBox?'Saldo actual: '+money(balance(checkoutBox,selected).saldo):'La venta normal por cobrar sigue disponible sin expediente.'}catch(e){notice.textContent=e.message}}
function renderCheckout(method){
 if(!ensureCheckout())return;
 const box=caja();wrap.hidden=method!=='credit'||!box;
 if(wrap.hidden)return;
 try{if(checkoutBox!==box){selected=null;checkoutBox=box}refreshChoices(box);showBalance()}catch(e){notice.textContent=e.message}
}
function bindCheckout(method){
 if(method!=='credit'){clear();return}
 const box=caja();if(!selected||!box||checkoutBox!==box)return;
 const r=getClient(box,selected);if(!r)throw Error('El cliente seleccionado ya no existe.');
 const field=$('nv-ticket-client');if(field)field.value=r.name;
}
// Solo entregar metadatos de un cliente elegido de forma expresa en Por cobrar.
function selection(state){
 const box=caja();if(state!=='cobrar'||!box||box!==checkoutBox||!selected)return null;
 const r=getClient(box,selected);if(!r||String($('nv-ticket-client')?.value||'').trim()!==r.name)return null;
 return {id:r.id,box};
}
function record(job){
 if(!job||job.state!=='cobrar'||!job.creditClientId||!c.validId(job.jobId))return true;
 const box=caja();if(!box||job.creditBox!==box)return false;
 const r=getClient(box,job.creditClientId);const total=job.subtotal+job.flete;
 if(!r||!c.moneyOk(total))return false;
 const item={id:job.jobId,customer:r.id,box,cents:total,at:new Date(job.at).toISOString()};
 const k=base(box)+'venta:'+item.id,old=localStorage.getItem(k);
 if(old!==null){const v=JSON.parse(old);return v.customer===item.customer&&v.cents===item.cents}
 put(box,'venta',item);return true;
}
function totalsDay(day,box=caja()){
 const out={cash:0,card:0,transfer:0,total:0,count:0};
 if(!box)return out;
 for(const p of list(box,'abono'))if(c.day(p.at)===day){out[p.method]+=p.cents;out.total+=p.cents;out.count++}
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
 const cents=c.amount(amountField.value),method=methodField.value;
 if(!c.paymentAllowed(cents,balance(box,id).saldo,method)){say('Importe inválido o mayor al saldo pendiente.');return}
 if(!navigator.locks?.request){say('Este navegador no admite el bloqueo seguro de abonos. Usa Safari o Chrome actualizado.');return}
 if(!confirm('¿Registrar abono recibido de '+money(cents)+' por '+methodName(method)+'? No es una venta nueva.'))return;
 working=true;const paymentId=crypto.randomUUID();
 try{await navigator.locks.request(base(box)+'abonos',async()=>{
  if(caja()!==box)throw Error('Cambió la caja');
  const b=balance(box,id);if(!c.paymentAllowed(cents,b.saldo,method))throw Error('El saldo cambió. Revisa el importe.');
  put(box,'abono',{id:paymentId,customer:id,box,cents,method,at:new Date().toISOString()});
 });say('Abono registrado. Saldo pendiente: '+money(balance(box,id).saldo));}
 catch(e){say(e.message)}finally{working=false;renderAdmin()}
}
function renderAdmin(){
 if(!area)return;
 const box=caja();area.querySelector('#nv299-private').hidden=!box;
 if(!box){rows.replaceChildren();say('Disponible únicamente en cajas reconocidas.');return}
 try{
  recover(box);
  const all=clients(box),sales=list(box,'venta'),payments=list(box,'abono');
  const total=sales.reduce((n,x)=>n+x.cents,0)-payments.reduce((n,x)=>n+x.cents,0);
  area.querySelector('#nv299-summary').textContent='Saldo pendiente: '+money(total)+' · '+all.length+' clientes · Abonos de hoy: '+money(totalsDay(c.day(Date.now()),box).total);
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
   for(const e of events)el('small',new Date(e.at).toLocaleString('es-MX')+' · '+e.label+' · '+money(e.cents)+' · '+e.id.slice(0,8),history);
  }
 }catch(e){say(e.message)}
}
function mountAdmin(){
 if(area)return;
 area=$('nv27-clientes');if(!area)return;
 el('p','Expedientes y abonos de esta caja. No se comparten todavía con otras cajas.',area);
 status=el('p','',area);status.setAttribute('role','status');
 const priv=el('div',undefined,area);priv.id='nv299-private';priv.hidden=true;
 el('strong','',priv).id='nv299-summary';
 term=el('input',undefined,priv);term.type='text';term.className='nv27-input';term.placeholder='Buscar cliente por nombre o teléfono';term.addEventListener('input',renderAdmin);
 button('+ Nuevo cliente',priv,()=>{try{const box=caja();if(!box)return;const r=newClient(box);if(r){chosen=r.id;renderAdmin()}}catch(e){say(e.message)}});
 button('Exportar respaldo de créditos',priv,()=>{try{const box=caja();if(!box)return;const doc={version:299,box,clientes:clients(box),ventas:list(box,'venta'),abonos:list(box,'abono')};const uri=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));const a=el('a',undefined,document.body);a.href=uri;a.download='NAVARRO-creditos-'+box+'.json';a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),2000);say('Respaldo privado exportado. No compartas datos de clientes.')}catch(e){say(e.message)}});
 rows=el('div',undefined,priv);renderAdmin();
}
window.NAVARRO_CLIENTES_V299=Object.freeze({renderCheckout,bindCheckout,selection,clear,record,totalsDay,renderAdmin});
let lastActive=false,lastBox=null;
setInterval(()=>{mountAdmin();const box=caja(),isActive=!!area&&area.dataset.v27Active==='yes'&&!$('nv26-sheet')?.hidden;if(isActive&&(!lastActive||box!==lastBox))renderAdmin();if(!box&&area){area.querySelector('#nv299-private').hidden=true;rows.replaceChildren()}lastActive=isActive;lastBox=box;if($('nv-ce-v2')?.open)renderCheckout($('nv-ce-v2-method')?.value)},600);
window.addEventListener('storage',e=>{if(e.key?.startsWith(prefix)&&area?.dataset.v27Active==='yes')renderAdmin()});
})();
