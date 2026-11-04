/* NAVARRO 360 V47: miniaturas por código exacto y mismas fuentes que las tarjetas. */
(function(){'use strict';
if(window.NAVARRO_CARRITO_FOTOS_V44)return;window.NAVARRO_CARRITO_FOTOS_V44=true;
const personal=new Map();
const cardPhoto=new Map();
// V45: ordenar fuentes como la tarjeta real: foto local, foto exacta por código,
// fotografía recuperada del mismo SKU y después atlas autorizado.
function sourceFor(id){
 const local=personal.get(id);
 if(local)return {kind:'url',src:local};
 const atlas=window.NAVARRO_ATLAS;
 // Los artículos de Plomería usan mapas privados del navegador que no estaban
 // conectados al carrito: PVC, CPVC y piezas especiales por SKU exacto.
 const plumbing=window.NAVARRO_FOTOS_PLOMERIA_V47?.[id];
 if(typeof plumbing==='string'&&plumbing){
  const index=atlas?.files?.[plumbing];
  if(Number.isInteger(index))return {kind:'atlas',atlas,index};
 }
 const codePhotos=window.NAVARRO_FOTOS_PAGINA||{};
 const byCode=Object.prototype.hasOwnProperty.call(codePhotos,id)?codePhotos[id]:'';
 const featured=Array.isArray(window.NAVARRO_DESTACADOS)
  ?window.NAVARRO_DESTACADOS.find(p=>String(p.id)===id):null;
 // Una fotografía que vive dentro del atlas NO es un archivo individual.
 // Verificar el atlas antes de construir './assets/nombre.webp'.
 // La foto explicitamente asociada al SKU prevalece sobre ilustraciones destacadas.
 if(typeof byCode==='string'&&byCode){
  const index=atlas?.files?.[byCode];
  if(Number.isInteger(index))return {kind:'atlas',atlas,index};
  if(/^https:\/\//.test(byCode))return {kind:'url',src:byCode};
  if(/^[a-z0-9][a-z0-9_.-]*\.(?:png|jpe?g|webp)$/i.test(byCode))
   return {kind:'url',src:'./assets/'+byCode};
 }
 for(const name of [featured?.img,atlas?.byCode?.[id]].filter(Boolean)){
  const index=atlas?.files?.[name];
  if(Number.isInteger(index))return {kind:'atlas',atlas,index};
 }
 // La imagen que ya aparece en la ficha es la mejor referencia cuando proviene
 // de un módulo independiente (materiales, fotos recuperadas, baño, etc.).
 const known=cardPhoto.get(id);
 if(known)return known;
 return null;
}
function thumbFor(id){
 const entry=sourceFor(id);if(!entry)return null;
 const wrap=document.createElement('span');
 wrap.className='nav-cart-thumb';
 wrap.dataset.navPhotoKey=entry.kind==='url'?entry.src:entry.kind==='strip'?'strip:'+entry.x+':'+entry.src.length:'atlas:'+entry.index;
 if(entry.kind==='strip'){
  const tile=document.createElement('span');
  tile.className='nav-cart-strip';
  tile.style.backgroundImage='url("'+entry.src+'")';
  tile.style.backgroundPosition=entry.x;
  wrap.append(tile);return wrap;
 }
 if(entry.kind==='url'){
  const img=document.createElement('img');
  img.src=entry.src;img.alt='Foto del producto '+id;img.loading='lazy';
  img.onerror=()=>{wrap.remove();};
  wrap.append(img);return wrap;
 }
 const {atlas,index}=entry;
 const sprite=document.createElement('span');
 sprite.className='product-sprite nav-cart-sprite';
 sprite.setAttribute('role','img');sprite.setAttribute('aria-label','Fotografía del catálogo');
 const x=index%atlas.columns*atlas.size,y=Math.floor(index/atlas.columns)*atlas.size;
 sprite.style.backgroundPosition='-'+x+'px -'+y+'px';
 sprite.style.backgroundSize=(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px';
 wrap.append(sprite);return wrap;
}
function rememberCardPhotos(){
 const host=document.getElementById('products');
 if(!host)return;
 for(const card of host.querySelectorAll('[data-card]')){
  const id=String(card.dataset.card||'');
  if(!/^\d{5,}$/.test(id))continue;
  const area=card.querySelector('.product-visual');if(!area)continue;
  const img=area.querySelector('img.navarro-photo-recuperada:not([hidden]),img.nav-bath-photo:not([hidden]),img:not(.nav-v40-photo)');
  if(img&&img.getAttribute('src')){
   const src=img.src;
   if(/^https?:|^blob:|^data:image\//.test(src))cardPhoto.set(id,{kind:'url',src});
   continue;
  }
  const strip=area.querySelector('.nav-material-photo[data-mat-strip]');
  if(strip){
   const stripId=Number(strip.dataset.matStrip),url=window.NAVARRO_MAT_STRIPS?.[stripId];
   if(typeof url==='string'&&url.startsWith('data:image/')){
    const part=strip.style.backgroundPosition||getComputedStyle(strip).backgroundPosition;
    const x=parseFloat(part);
    if(Number.isFinite(x))cardPhoto.set(id,{kind:'strip',src:url,x:part});
   }
  }
 }
}

function sync(){
 const host=document.getElementById('cart-items');if(!host)return;
 rememberCardPhotos();
 for(const row of host.querySelectorAll('.cart-line')){
  const dec=row.querySelector('button[data-dec]');const id=dec?.dataset.dec;
  if(!/^\d{5,}$/.test(String(id||'')))continue;
  const photo=thumbFor(id);
  const current=row.querySelector('.nav-cart-thumb');
  if(!photo){if(current)current.remove();continue}
  if(current){
   if(current.dataset.navPhotoKey===photo.dataset.navPhotoKey)continue;
   current.replaceWith(photo);
  }else row.prepend(photo);
 }
}
async function loadPhotos(){
 if(!('indexedDB' in window))return;
 try{
  const db=await new Promise((ok,no)=>{const r=indexedDB.open('navarro360-fotos-personales-v1',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
  await new Promise(resolve=>{
   if(!db.objectStoreNames.contains('photos'))return resolve();
   const tx=db.transaction('photos','readonly');
   const request=tx.objectStore('photos').openCursor();
   request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;const id=String(cursor.key);if(cursor.value instanceof Blob)personal.set(id,URL.createObjectURL(cursor.value));cursor.continue()};
   tx.oncomplete=resolve;tx.onerror=resolve;
  });db.close();sync();
 }catch(e){console.warn('Fotos personales del carrito no disponibles',e)}
}
function init(){
 const css=document.createElement('style');css.textContent='.cart-line{display:flow-root}.nav-cart-thumb{float:left;width:58px;height:58px;overflow:hidden;border:1px solid #dce3ed;border-radius:9px;background:#fff;margin:1px 11px 8px 0;display:block;position:relative}.nav-cart-thumb img{display:block;width:100%;height:100%;object-fit:contain}.nav-cart-sprite{position:absolute;top:0;left:0;width:128px!important;height:128px!important;max-width:none!important;transform:scale(.445);transform-origin:top left}.nav-cart-strip{display:block;width:58px;height:58px;background-size:300% 100%;background-repeat:no-repeat;background-color:white}.cart-line .cart-controls{clear:both}';document.head.append(css);
 const host=document.getElementById('cart-items');
 if(!host)return;
 const observer=new MutationObserver(sync);observer.observe(host,{childList:true});
 const productGrid=document.getElementById('products');
 if(productGrid)new MutationObserver(()=>{rememberCardPhotos();sync()}).observe(productGrid,{childList:true});
 sync();loadPhotos();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();