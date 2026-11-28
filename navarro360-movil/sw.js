/* NAVARRO 360 — SW V69, tolerancia a fallos y control de espacio en iPhone.
   Pedidos, precios y SIFO NO se autorizan ni se alteran desde este worker. */
'use strict';
const PREFIX='navarro360-fullstore-';
const VERSION=PREFIX+'v3046-estabilidad';
const OFFLINE='./offline.html';
const SHELL=[OFFLINE,'./icon.svg','./manifest.webmanifest'];
const MAX_CACHE_ENTRIES=85;
const MAX_ASSET_BYTES=380000;
const SCOPE_PATH=new URL('./',self.location.href).pathname;
function withinScope(url){
 return url.origin===self.location.origin&&url.pathname.startsWith(SCOPE_PATH);
}
function isStaticAsset(url){
 if(!/\.(?:css|js|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname))return false;
 // Evitar almacenar los índices de fotografía, modelos y mapas grandes.
 if(/(?:truper-fotos-catalogo|buscar-foto-indice|\.tflite|\.wasm|\.gz)(?:\.|$)/i.test(url.pathname))return false;
 return true;
}
async function storeSmall(request,response){
 if(!response||!response.ok||response.type!=='basic'||!isStaticAsset(new URL(request.url)))return;
 const declared=Number(response.headers.get('content-length'));
 if(!Number.isFinite(declared)||declared<=0||declared>MAX_ASSET_BYTES)return;
 const cache=await caches.open(VERSION);
 // Consultas distintas (?v=N) son versiones distintas: nunca servir otra versión por error.
 await cache.put(request,response.clone());
 const keys=await cache.keys();
 if(keys.length>MAX_CACHE_ENTRIES){
  const removable=keys.filter(req=>!SHELL.some(s=>new URL(s,self.location.href).pathname===new URL(req.url).pathname));
  for(const key of removable.slice(0,Math.max(0,keys.length-MAX_CACHE_ENTRIES)))await cache.delete(key);
 }
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  // Precargar sólo la pantalla de desconexión y recursos muy pequeños;
  // fallar en una imagen NO debe dejar sin instalar el servicio.
  await Promise.allSettled(SHELL.map(async asset=>{
   const request=new Request(new URL(asset,self.location.href),{cache:'reload'});
   const response=await fetch(request);
   if(response.ok)await cache.put(request,response);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  // No eliminar cachés de otras aplicaciones alojadas en el mismo origen.
  await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==VERSION).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(!withinScope(url))return;
 if(request.mode==='navigate'){
  // Catálogo y precios: la navegación siempre intenta la red; no usar copias antiguas.
  event.respondWith((async()=>{
   try{
    const response=await fetch(new Request(request,{cache:'reload'}));
    if(response.ok)return response;
    // Las respuestas del servidor se respetan (404, 500, etc.).
    return response;
   }catch(_){
    const cache=await caches.open(VERSION);
    return await cache.match(new URL(OFFLINE,self.location.href).href)||
     new Response('<h1>Sin conexión</h1><p>Reconecta Internet para consultar precios actuales.</p>',
      {status:503,headers:{'content-type':'text/html; charset=utf-8'}});
   }
  })());
  return;
 }
 // Archivos de JS y CSS nunca deben recibir index.html como respuesta por error.
 event.respondWith((async()=>{
  try{
   // Scripts críticos y sus precios deben pedir siempre una versión nueva;
   // si no hay red, podrán usar la última copia EXACTA del mismo URL.
   const critical=/\/(?:carrito-seguro|buscador-completo|ventas-espera-v1|experiencia-integral-v70|auditoria-fotos-v70|tienda-app-v25|caja-expres-v3|impresion-automatica-v1|cobranza-entrega-v1|ticket-directo-v1|precios-oficiales-v3039|inventario-stock-publico|historial-tickets-v1|clientes-creditos-v299)\.js$/.test(url.pathname);
   const live=critical?new Request(request,{cache:'reload'}):request;
   const response=await fetch(live);
   if(isStaticAsset(url)&&response.ok){
    const clone=response.clone();
    event.waitUntil(storeSmall(request,clone).catch(()=>{}));
   }
   return response;
  }catch(_){
   if(isStaticAsset(url)){
    const cache=await caches.open(VERSION);
    const cached=await cache.match(request);
    if(cached)return cached;
   }
   return Response.error();
  }
 })());
});