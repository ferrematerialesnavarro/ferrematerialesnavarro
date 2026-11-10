const VERSION='navarro360-fullstore-v68-caja-precios';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./electricidad-nav.js?v=7','./buscador-completo.js?v=3','./buscador-completo.js?v=4','./electricidad.css?v=6','./fotos-recuperadas.js?v=22','./fotos-recuperadas.js?v=9','./carrito-seguro.js?v=67','./ventas-espera-v1.js?v=8','./fotos-plomeria-carrito-v47.js?v=47','./truper-fotos-catalogo-v53.js?v=53','./truper-fotos-integracion-v48.js?v=52','./carrito-fotos-v44.js?v=52','./buscar-foto-v57.js?v=57','./fotos-centradas-v58.css?v=58','./tarjetas-movil-v59.css?v=59','./tarjetas-boceto-v60.css?v=60','./fotos-centradas-v58.js?v=58','./materiales-fotos-1.js?v=1','./materiales-fotos-2.js?v=1','./materiales-fotos-3.js?v=1','./materiales-destacados-v2.js?v=3','./banos-nav.js?v=1','./herrajes-nav.js?v=1','./jardineria-nav.js?v=1','./tornilleria-nav.js?v=1','./escaner-barras.js?v=2','./escaner-barras.js?v=3','./escaner-barras.js?v=4','./escaner-barras.js?v=5','./escaner-barras.js?v=41','./lector-usb-v42.js?v=43','./escaner-barras.js?v=7','./pinturas-nav.js?v=1'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin || !url.pathname.includes('/navarro360-movil/'))return;
 // El buscador siempre consulta el archivo vigente, incluso si el HTML usa ?v=3.
 const liveReq=/\/(?:buscador-completo|carrito-seguro|ventas-espera-v1)\.js$/.test(url.pathname)?new Request(req,{cache:'reload'}):req;
 event.respondWith(fetch(liveReq).then(res=>{
   if(res.ok){const copy=res.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(req,copy)));}
   return res;
 }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html'))));
});