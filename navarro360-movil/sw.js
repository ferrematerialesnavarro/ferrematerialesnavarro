const VERSION='navarro360-fullstore-v19-materiales-51';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./electricidad-nav.js?v=7','./electricidad.css?v=6','./fotos-recuperadas.js?v=19','./materiales-destacados-v2.js?v=2','./banos-nav.js?v=1','./herrajes-nav.js?v=1','./jardineria-nav.js?v=1','./tornilleria-nav.js?v=1','./escaner-barras.js?v=2','./pinturas-nav.js?v=1'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin || !url.pathname.includes('/navarro360-movil/'))return;
 event.respondWith(fetch(req).then(res=>{
   if(res.ok){const copy=res.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(req,copy)));}
   return res;
 }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html'))));
});