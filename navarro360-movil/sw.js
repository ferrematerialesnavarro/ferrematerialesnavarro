const VERSION='navarro360-fullstore-v48-truper-fotos-7772';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./electricidad-nav.js?v=7','./buscador-completo.js?v=3','./buscador-completo.js?v=4','./electricidad.css?v=6','./fotos-recuperadas.js?v=22','./fotos-recuperadas.js?v=9','./carrito-seguro.js?v=2','./fotos-plomeria-carrito-v47.js?v=47','./truper-fotos-catalogo-v48.js?v=48','./truper-fotos-integracion-v48.js?v=48','./carrito-fotos-v44.js?v=48','./materiales-fotos-1.js?v=1','./materiales-fotos-2.js?v=1','./materiales-fotos-3.js?v=1','./materiales-destacados-v2.js?v=3','./banos-nav.js?v=1','./herrajes-nav.js?v=1','./jardineria-nav.js?v=1','./tornilleria-nav.js?v=1','./escaner-barras.js?v=2','./escaner-barras.js?v=3','./escaner-barras.js?v=4','./escaner-barras.js?v=5','./escaner-barras.js?v=41','./lector-usb-v42.js?v=43','./escaner-barras.js?v=7','./pinturas-nav.js?v=1'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin || !url.pathname.includes('/navarro360-movil/'))return;
 // El buscador siempre consulta el archivo vigente, incluso si el HTML usa ?v=3.
 const liveReq=url.pathname.endsWith('/buscador-completo.js')?new Request(req,{cache:'reload'}):req;
 event.respondWith(fetch(liveReq).then(res=>{
   if(res.ok){const copy=res.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(req,copy)));}
   return res;
 }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html'))));
});