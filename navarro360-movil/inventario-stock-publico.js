(() => {
 'use strict';
 /* Inventario V22: comparte la vinculacion YA existente de impresora,
    registra una clave distinta por dispositivo (maximo cuatro en Windows)
    y requiere ambas credenciales para cada conteo. No altera ventas ni fotos. */
 const PUBLIC_URL='https://navarro-recepcion-pedidos.ferrematerialesnavar.chatgpt.site/existencias';
 const STOCK_DATE='23 nov 2026';
 let publicStock=null, publicLoading=null, publicFailed=false;
 async function refreshPublic(){
  if(publicLoading)return publicLoading;
  publicLoading=(async()=>{
   try{
    const response=await fetch(PUBLIC_URL,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Existencias no disponibles');
    const data=await response.json();
    if(!Array.isArray(data.rows))throw Error('Existencias inválidas');
    if(data.at&&Number.isFinite(Date.parse(data.at)))publicStock={at:data.at,rows:new Map(data.rows)};
    publicFailed=false;
   }catch{publicFailed=true;}
   finally{publicLoading=null;paint();}
  })();
  return publicLoading;
 }
 const PAIR_KEY='navarro360_print_bridge_pair_v1';
 const DEVICE_KEY='navarro-inventario-device-v22';
 const BOXES=['COMPUTADORA','PABLO','DIANA','GOLI'];
 let overrides=new Map(),loading=null,verified=false,verifiedUrl='',box='';
 const codeRE=/^\d{5,30}$/;
 const uuidRE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const hexRE=/^[a-f0-9]{64}$/;
 function printer(){
  try{
   const p=JSON.parse(localStorage.getItem(PAIR_KEY)||'null');
   return p&&typeof p.url==='string'&&/^https:\/\/[a-z0-9-]+\.ngrok-free\.(?:dev|app)\/?$/.test(p.url)&&hexRE.test(p.token)?p:null;
  }catch{return null;}
 }
 function newToken(){
  const a=crypto.getRandomValues(new Uint8Array(32));
  return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
 }
 function hint(){
  try{
   const sales=JSON.parse(localStorage.getItem('navarro-ventas-equipo')||'null');
   if(BOXES.includes(sales?.caja))return sales.caja;
   const id=String(window.NAVARRO_CAJA_IDENTIDAD?.codigo?.()||'').trim().toUpperCase();
   return BOXES.includes(id)?id:'';
  }catch{return '';}
 }
 function device(){
  const current=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null');
  if(current&&uuidRE.test(current.deviceId)&&hexRE.test(current.deviceToken))return current;
  const data={deviceId:crypto.randomUUID(),deviceToken:newToken()};
  localStorage.setItem(DEVICE_KEY,JSON.stringify(data));
  return data;
 }
 async function post(input){
  const p=printer();
  if(!p)throw Error('Vincula la impresora en esta misma aplicación para ajustar inventario.');
  const d=device();
  const res=await fetch(p.url.replace(/\/$/,'')+'/inventario',{
   method:'POST',credentials:'omit',cache:'no-store',redirect:'error',
   headers:{'Authorization':'Bearer '+p.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},
   body:JSON.stringify({...d,...input}),signal:AbortSignal.timeout(15000)
  });
  let result={};try{result=await res.json()}catch{}
  if(!res.ok||result?.ok!==true){
   const message=res.status===404?'El módulo Inventario V22 todavía no funciona en Windows. Instálalo y reinicia el puente de impresión.':
    res.status===409?'El inventario fue cambiado por otra caja. Actualiza la existencia y vuelve a intentarlo.':
    result.error||'Windows no reconoció este dispositivo para inventario.';
   const error=Error(message);error.status=res.status;throw error;
  }
  return result;
 }
 async function ensure(){
  const p=printer();
  if(!p)throw Error('No hay impresora vinculada en esta aplicación.');
  if(verified&&verifiedUrl===p.url)return box;
  verified=false;
  try{
   const result=await post({action:'check'});box=result.box;verifiedUrl=p.url;verified=true;return box;
  }catch(error){
   if(error.status!==403)throw error;
  }
  const result=await post({action:'enroll',box:hint()});
  box=result.box;verified=true;verifiedUrl=p.url;
  return box;
 }
 function paint(){
  const eligible=!!printer();
  const cached=publicStock&&Date.now()-Date.parse(publicStock.at)>600000;
  const stockDate=publicStock?new Date(publicStock.at).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short',timeZone:'America/Mexico_City'}):STOCK_DATE;
  document.querySelectorAll('[data-inventory-code]').forEach(el=>{
   const code=el.dataset.inventoryCode,row=eligible?overrides.get(code):null;
   const amount=row?.[1]??publicStock?.rows.get(code)??window.NAVARRO_EXISTENCIAS?.[code]?.[0];
   if(!Number.isFinite(amount)){el.textContent='Existencia por confirmar';return;}
   const value=Math.max(0,amount).toLocaleString('es-MX',{maximumFractionDigits:6});
   if(row){
    el.textContent='Disponible: '+value+' · '+new Date(row[3]).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'});
   }else{
    const prefix=publicStock&&!cached&&!publicFailed?'Disponible: ':'Última existencia registrada: ';
    el.textContent=prefix+value+' · '+stockDate;
   }
  });
  document.querySelectorAll('[data-inventory-edit]').forEach(el=>{el.hidden=!eligible;});
 }
 async function refresh(){
  if(loading)return loading;
  loading=(async()=>{
   await ensure();
   let cursor=null;const incoming=new Map();
   do{
    const page=await post({action:'list',cursor});
    if(!Array.isArray(page.rows))throw Error('Windows devolvió un inventario inválido.');
    for(const row of page.rows)if(Array.isArray(row)&&codeRE.test(row[0])&&Number.isFinite(row[1]))incoming.set(row[0],row);
    cursor=page.cursor;
   }while(cursor!==null&&cursor!==undefined);
   overrides=incoming;paint();
  })().finally(()=>{loading=null;});
  return loading;
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-inventory-edit]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(button.disabled)return;
  button.disabled=true;
  try{
   await ensure();await refresh();
   const code=button.dataset.inventoryEdit;
   if(!codeRE.test(code))throw Error('Código del producto no válido.');
   const row=overrides.get(code);
   const before=row?.[1]??window.NAVARRO_EXISTENCIAS?.[code]?.[0]??null;
   const name=button.closest('[data-card]')?.querySelector('h3')?.textContent||code;
   const raw=prompt(name+' · '+code+'\nExistencia registrada: '+(before??'Sin dato')+'\nCantidad física contada:');
   if(raw===null)return;
   const value=raw.trim().replace(',','.');
   if(!/^\d+(\.\d{1,3})?$/.test(value)||Number(value)>100000000)throw Error('Escribe una existencia mayor o igual a cero, hasta tres decimales.');
   const qty=Number(value);
   if(!confirm(name+'\n'+(before??'Sin dato')+' → '+qty+'\n¿Guardar el conteo de '+box+'?'))return;
   const version=crypto.randomUUID();
   await post({action:'count',code,qty,previous:row?.[2]??null,version});
   await refresh();alert('Existencia guardada en Windows y disponible para las cuatro cajas.');
  }catch(e){alert(e.message||'No se pudo guardar el conteo.');refresh().catch(()=>{});}
  finally{button.disabled=false;}
 },true);
 const products=document.querySelector('#products');
 if(products)new MutationObserver(paint).observe(products,{childList:true});
 window.addEventListener('pageshow',()=>{paint();refreshPublic();if(printer())refresh().catch(()=>{});});
 paint();
 refreshPublic();
 if(printer())refresh().catch(()=>{});
 setInterval(()=>{if(document.hidden)return;refreshPublic();if(printer())refresh().catch(()=>{});},30000);
 window.NAVARRO_INVENTARIO_V22=Object.freeze({version:22,estado:()=>({impresora:!!printer(),reconocido:verified,caja:box||null})});
})();
