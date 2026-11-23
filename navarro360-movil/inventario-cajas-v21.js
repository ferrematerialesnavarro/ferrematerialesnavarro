(() => {
 'use strict';
 const endpoint='https://navarro-recepcion-pedidos.ferrematerialesnavar.chatgpt.site/inventario';
 const storage='navarro-inventario-caja-v1';
 let overrides=new Map(),loading=null;
 const paired=()=>window.NAVARRO_PRINT_SILENCIOSA?.vinculado?.()===true;
 const BOXES=new Set(['COMPUTADORA','PABLO','DIANA','GOLI']);
 let bridge=null;
 function savedBridge(){
  if(!paired())return null;
  try{
   const item=JSON.parse(localStorage.getItem('navarro-ventas-equipo')||'null');
   if(!item||!BOXES.has(item.caja)||!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(?:dev|app)$/.test(item.url)||!/^[a-f0-9]{64}$/.test(item.token))return null;
   return item;
  }catch{return null;}
 }
 function hasOldDevice(){
  try{const item=JSON.parse(localStorage.getItem(storage)||'null');return !!(item&&BOXES.has(item.box)&&typeof item.key==='string'&&item.key.length>0);}catch{return false;}
 }
 async function probeBridge(){
  const candidate=savedBridge();
  if(!candidate){bridge=null;return false;}
  try{
   const res=await fetch(candidate.url+'/inventario',{
    method:'POST',credentials:'omit',redirect:'error',cache:'no-store',
    headers:{'Authorization':'Bearer '+candidate.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},
    body:JSON.stringify({action:'check'}),signal:AbortSignal.timeout(8000)
   });
   const json=res.ok?await res.json():null;
   if(res.ok&&json?.ok&&json.box===candidate.caja){bridge=candidate;return true;}
  }catch{}
  bridge=null;return false;
 }
 async function request(body){
  const usingBridge=!!bridge;
  const device=usingBridge?savedBridge():null;
  if(usingBridge&&(!device||device.token!==bridge.token))throw Error('Se perdió la vinculación de la caja. Recarga NAVARRO 360.');
  const url=usingBridge?device.url+'/inventario':endpoint;
  const headers={'Content-Type':'application/json'};
  if(usingBridge){headers.Authorization='Bearer '+device.token;headers['ngrok-skip-browser-warning']='true';}
  const r=await fetch(url,{method:'POST',credentials:'omit',redirect:'error',cache:'no-store',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!r.ok){
   const error=new Error(r.status===409?'Otra caja modificó esta existencia. Consulta el dato actualizado.':
    r.status===403?'Tu caja no está habilitada por el servidor de inventario.':
    r.status===404?'El módulo Inventario V20 todavía no está instalado en Windows.':
    'No se pudo conectar con inventario. No se guardó ningún cambio.');
   error.status=r.status;throw error;
  }
  return r.json();
 }
 function paint(){
  document.querySelectorAll('[data-inventory-code]').forEach(el=>{
   const row=overrides.get(el.dataset.inventoryCode);
   if(row)el.textContent='Disponible: '+row[1].toLocaleString('es-MX')+' · '+new Date(row[3]).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'});
   else{
    const amount=window.NAVARRO_EXISTENCIAS?.[el.dataset.inventoryCode]?.[0];
    el.textContent=Number.isFinite(amount)?'Disponible: '+Math.max(0,amount).toLocaleString('es-MX',{maximumFractionDigits:6})+' · 23 nov 2026':'Existencia por confirmar';
   }
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
  if(!paired())throw Error('Para ajustar inventario, vincula primero la impresora en esta misma app.');
  if(!bridge)await probeBridge();
  if(bridge)return {box:bridge.caja};
  let device=null;
  try{device=JSON.parse(localStorage.getItem(storage)||'null');}catch{}
  if(device&&BOXES.has(device.box)&&typeof device.key==='string'){
   await request({...device,action:'check'});
   return device;
  }
  if(!savedBridge())throw Error('La impresora está vinculada, pero esta app no tiene registrada su caja individual de ventas automáticas. Sin esa identidad, Windows no puede distinguir COMPUTADORA, PABLO, DIANA o GOLI. Revisa la vinculación de ventas de esta misma app.');
  throw Error('La impresora está vinculada, pero Windows todavía no confirma el módulo de inventario para esta caja. Revisa el puente de Windows y reinícialo si es necesario.');
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
 paint();
 window.addEventListener('pageshow',paint);
 window.addEventListener('load',paint,{once:true});
 probeBridge().then(()=>{overrides=new Map();paint();return refresh();}).catch(()=>{});
 setInterval(async()=>{
  if(document.hidden)return;
  const previous=bridge?.token||null;
  await probeBridge();
  if((bridge?.token||null)!==previous){overrides=new Map();paint();}
  refresh().catch(()=>{});
 },30000);
})();
