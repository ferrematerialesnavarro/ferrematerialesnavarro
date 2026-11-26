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
    const at=Date.parse(data.at);
    if(!Number.isFinite(at)||at>Date.now()+300000)throw Error('Fecha de existencias inválida');
    const rows=new Map();
    for(const row of data.rows){if(Array.isArray(row)&&typeof row[0]==='string'&&row[0]&&Number.isFinite(row[1]))rows.set(row[0],row[1]);}
    if(data.rows.length&&!rows.size)throw Error('Existencias inválidas');
    if(publicStock&&at<Date.parse(publicStock.at))throw Error('Existencias anteriores a la última consulta');
    publicStock={at:data.at,rows};
    publicFailed=false;
   }catch{publicFailed=true;}
   finally{publicLoading=null;paint();notifyStock();}
  })();
  return publicLoading;
 }
 const PAIR_KEY='navarro360_print_bridge_pair_v1';
 const DEVICE_KEY='navarro-inventario-device-v22';
 const BOXES=['COMPUTADORA','PABLO','DIANA','GOLI'];
 let overrides=new Map(),loading=null,verified=false,verifiedUrl='',box='',windowsAt=null,windowsFailed=true,windowsUrl='';
 function selectStock(code,privateRows,publicRows,base,meta){
 const row=privateRows.get(code),pub=publicRows.get(code),fallback=base?.[code]?.[0];
 const valid=x=>typeof x==='number'&&Number.isFinite(x);
 const source=valid(row?.[1])?'windows':valid(pub)?'publico':valid(fallback)?'catalogo':'sin-dato';
 const raw=source==='windows'?row[1]:source==='publico'?pub:source==='catalogo'?fallback:null;
 const recent=source==='windows'?meta.windowsFresh:source==='publico'?meta.publicFresh:false;
 return {stock:raw===null?null:Math.max(0,raw),source,confirmed:!!recent&&raw!==null&&raw>=0,negative:raw!==null&&raw<0,at:source==='windows'?row[3]||meta.windowsAt:source==='publico'?meta.publicAt:null,publicStock:valid(pub)?Math.max(0,pub):null,publicFresh:!!meta.publicFresh};
}
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

 function stockReader(){
  const p=printer(),now=Date.now(),rows=p&&verified&&windowsUrl===p.url?overrides:new Map();
  const meta={windowsAt,windowsFresh:!!windowsAt&&!windowsFailed&&now-Date.parse(windowsAt)<=120000,publicAt:publicStock?.at??null,publicFresh:!!publicStock&&!publicFailed&&now-Date.parse(publicStock.at)<=600000};
  const pub=publicStock?.rows||new Map(),base=window.NAVARRO_EXISTENCIAS;
  return code=>selectStock(String(code),rows,pub,base,meta);
 }
 function paint(){
  const eligible=!!printer(),read=stockReader();
  document.querySelectorAll('[data-inventory-code]').forEach(el=>{
   const p=read(el.dataset.inventoryCode);
   if(p.stock===null){el.textContent='Existencia por confirmar';return;}
   const value=p.stock.toLocaleString('es-MX',{maximumFractionDigits:6});
   const date=p.at&&Number.isFinite(Date.parse(p.at))?new Date(p.at).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'}):STOCK_DATE;
   el.textContent=(p.confirmed?'Disponible: ':'Última existencia registrada: ')+value+' · '+date+(p.negative?' · verificar':'');
  });
  document.querySelectorAll('[data-inventory-edit]').forEach(el=>{el.hidden=!eligible;});
 }
 function notifyStock(){window.dispatchEvent(new Event('navarro:stock-refresh'));}
 async function refresh(){
  if(loading)return loading;
  loading=(async()=>{
   await ensure();
   const url=printer()?.url;
   let cursor=null;const incoming=new Map();
   do{
    const page=await post({action:'list',cursor});
    if(!Array.isArray(page.rows))throw Error('Windows devolvió un inventario inválido.');
    for(const row of page.rows)if(Array.isArray(row)&&codeRE.test(row[0])&&Number.isFinite(row[1]))incoming.set(row[0],row);
    cursor=page.cursor;
   }while(cursor!==null&&cursor!==undefined);
   if(!url||printer()?.url!==url)throw Error('Cambió la vinculación');
   overrides=incoming;windowsAt=new Date().toISOString();windowsUrl=url;windowsFailed=false;
  })().catch(error=>{windowsFailed=true;throw error;}).finally(()=>{loading=null;paint();notifyStock();});
  return loading;
 }

 function countReference(code){
  code=String(code);
  const data=stockReader()(code),row=overrides.get(code);
  return {stock:data.stock,confirmed:data.confirmed,source:data.source,version:data.source==='windows'?row?.[2]??null:null};
 }
 function sameReference(a,b){
  return !!a&&!!b&&a.confirmed===true&&b.confirmed===true&&a.stock===b.stock&&a.version===b.version&&a.source===b.source;
 }
 let counting=false;
 async function applyPhysical(code,qty,reference,name){
  if(counting)throw Error('Hay otro ajuste en curso');
  if(!codeRE.test(code)||code==='00000'||typeof qty!=='number'||!Number.isFinite(qty)||qty<0||qty>100000000||Math.abs(qty*1000-Math.round(qty*1000))>1e-5)throw Error('Cantidad de conteo inválida');
  counting=true;
  try{
   await refresh();await refreshPublic();
   const admin=window.NAVARRO_CENTRO_AMPLIADO_V27?.estado?.();
   if(!admin?.autorizado||admin.caja!==box||!BOXES.includes(box))throw Error('Caja sin autorización');
   const current=countReference(code);
   if(!sameReference(reference,current))throw Error('La existencia o su versión cambió. Vuelve a contar el producto con la referencia actual.');
   if(current.stock===qty)return {ok:true,unchanged:true,box};
   const version=crypto.randomUUID();
   try{await post({action:'count',code,qty,previous:current.version,version});}
   catch(e){if(!e.status)throw Error('No se confirmó el ajuste. Consulta el stock antes de repetir; el conteo se conserva.');throw e;}
   window.dispatchEvent(new CustomEvent('navarro:v29:confirmed',{detail:{type:'Conteo aceptado por Windows',code,name:String(name||code),before:current.stock,after:qty,box}}));
   try{await refresh()}catch{}
   return {ok:true,box};
  }finally{counting=false;}
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
   const before=row?.[1]??publicStock?.rows.get(code)??window.NAVARRO_EXISTENCIAS?.[code]?.[0]??null;
   const name=button.closest('[data-card]')?.querySelector('h3')?.textContent||code;
   const raw=prompt(name+' · '+code+'\nExistencia registrada: '+(before??'Sin dato')+'\nCantidad física contada:');
   if(raw===null)return;
   const value=raw.trim().replace(',','.');
   if(!/^\d+(\.\d{1,3})?$/.test(value)||Number(value)>100000000)throw Error('Escribe una existencia mayor o igual a cero, hasta tres decimales.');
   const qty=Number(value);
   if(!confirm(name+'\n'+(before??'Sin dato')+' → '+qty+'\n¿Guardar el conteo de '+box+'?'))return;
   const version=crypto.randomUUID();
   await post({action:'count',code,qty,previous:row?.[2]??null,version});
   window.dispatchEvent(new CustomEvent('navarro:v29:confirmed',{detail:{type:'Conteo aceptado por Windows',code,name,before,after:qty,box}}));
   await refresh();alert('Existencia guardada en Windows y disponible para las cuatro cajas.');
  }catch(e){alert(e.message||'No se pudo guardar el conteo.');refresh().catch(()=>{});}
  finally{button.disabled=false;}
 },true);
 const products=document.querySelector('#products');
 if(products)new MutationObserver(paint).observe(products,{childList:true});
 window.addEventListener('pageshow',()=>{paint();refreshPublic();if(printer())refresh().catch(()=>{});});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshPublic();if(printer())refresh().catch(()=>{});}});
 window.addEventListener('online',()=>{refreshPublic();if(printer())refresh().catch(()=>{});});
 paint();
 refreshPublic();
 if(printer())refresh().catch(()=>{});
 setInterval(()=>{if(document.hidden)return;refreshPublic();if(printer())refresh().catch(()=>{});},30000);
 window.NAVARRO_INVENTARIO_V22=Object.freeze({version:22,referenciaConteo:countReference,aplicarConteo:applyPhysical,lectorExistencias:stockReader,recargarTodo:()=>Promise.allSettled([refreshPublic(),...(printer()?[refresh()]:[])]),recargarPublico:refreshPublic,consultaPublica:()=>({at:publicStock?.at??null,error:publicFailed,rows:Array.from(publicStock?.rows||[])}),estado:()=>({impresora:!!printer(),reconocido:verified,caja:box||null,publico:{actualizado:publicStock?.at??null,error:publicFailed,consultando:!!publicLoading}})});
})();
