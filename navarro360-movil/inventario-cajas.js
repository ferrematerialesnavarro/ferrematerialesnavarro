(() => {
 'use strict';
 const endpoint='https://navarro-recepcion-pedidos.ferrematerialesnavar.chatgpt.site/inventario';
 const storage='navarro-inventario-caja-v1';
 let overrides=new Map(),loading=null;
 const paired=()=>window.NAVARRO_PRINT_SILENCIOSA?.vinculado?.()===true;
 async function request(body){
  const r=await fetch(endpoint,{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!r.ok){const error=new Error(r.status===409?'Otro conteo cambió la existencia. Revisa el dato actualizado.':r.status===403?'Se necesita autorización del panel para esta caja.':'No se pudo confirmar la conexión con inventario.');error.status=r.status;throw error;}
  return r.json();
 }
 function paint(){
  document.querySelectorAll('[data-inventory-code]').forEach(el=>{
   const row=overrides.get(el.dataset.inventoryCode);
   if(row)el.textContent='Disponible: '+row[1].toLocaleString('es-MX')+' · '+new Date(row[3]).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'});
  });
  document.querySelectorAll('[data-inventory-edit]').forEach(el=>{el.hidden=!paired();});
 }
 function refresh(){
  if(loading)return loading;
  loading=(async()=>{
   let cursor=null;const next=new Map();
   do{const page=await request({action:'list',cursor});for(const row of page.rows)next.set(row[0],row);cursor=page.cursor;}while(cursor);
   overrides=next;paint();
  })().finally(()=>{loading=null;});
  return loading;
 }
 async function authorize(){
  let device=JSON.parse(localStorage.getItem(storage)||'null');
  if(device){
   try{await request({...device,action:'check'});return device;}catch(e){if(e.status!==403)throw e;}
  }
  const box=prompt('Nombre de tu caja: COMPUTADORA, PABLO, DIANA o GOLI')?.trim().toUpperCase();
  if(!box)return;
  if(!['COMPUTADORA','PABLO','DIANA','GOLI'].includes(box))throw Error('Selecciona una de las cuatro cajas.');
  const activation=prompt('Pega el código de un solo uso que generaste para '+box+' en Inventario de las cajas del panel privado.')?.trim();
  if(!activation)return;
  device={box,key:crypto.randomUUID()};
  localStorage.setItem(storage,JSON.stringify(device));
  await request({...device,action:'activate',activation});return device;
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-inventory-edit]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();if(!paired()||button.disabled)return;
  button.disabled=true;
  try{
   const device=await authorize();if(!device)return;
   await refresh();const code=button.dataset.inventoryEdit,row=overrides.get(code);
   const before=row?.[1]??window.NAVARRO_EXISTENCIAS?.[code]?.[0]??null;
   const name=button.closest('[data-card]')?.querySelector('h3')?.textContent||code;
   const raw=prompt(name+' · '+code+'\nExistencia registrada: '+(before??'Sin dato')+'\nCantidad física contada (hasta 3 decimales):');
   if(raw===null)return;
   const value=raw.trim().replace(',','.');
   if(!/^\d+(\.\d{1,3})?$/.test(value)||Number(value)>100000000)throw Error('Captura un conteo de cero o más, con hasta tres decimales.');
   const qty=Number(value);
   if(!confirm(name+'\n'+(before??'Sin dato')+' → '+qty+(before===null?'':' · Diferencia: '+Number((qty-before).toFixed(3)))+'\n¿Guardar el conteo de '+device.box+'?'))return;
   await request({...device,action:'count',code,qty,previous:row?.[2]||null,version:crypto.randomUUID()});
   await refresh();alert('Conteo guardado.');
  }catch(e){alert(e.message);refresh().catch(()=>{});}finally{button.disabled=false;}
 },true);
 const products=document.querySelector('#products');
 if(products)new MutationObserver(paint).observe(products,{childList:true});
 paint();refresh().catch(()=>{});
 setInterval(()=>{if(!document.hidden)refresh().catch(()=>{});},30000);
})();
