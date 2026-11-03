const VERSION='navarro360-fullstore-v5';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg'];
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