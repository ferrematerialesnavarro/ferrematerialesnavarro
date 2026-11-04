/* NAVARRO 360 V44: miniaturas en carrito, solo si hay foto real disponible. */
(function(){'use strict';
if(window.NAVARRO_CARRITO_FOTOS_V44)return;window.NAVARRO_CARRITO_FOTOS_V44=true;
const personal=new Map();
function atlasFor(id){
 const atlas=window.NAVARRO_ATLAS;
 if(!atlas||!atlas.files)return null;
 const featured=Array.isArray(window.NAVARRO_DESTACADOS)?window.NAVARRO_DESTACADOS.find(p=>String(p.id)===id):null;
 const name=featured?.img||atlas.byCode?.[id]||window.NAVARRO_FOTOS_PAGINA?.[id]||'';
 const n=atlas.files[name];
 if(!Number.isInteger(n))return null;
 return {atlas,n};
}
function thumbFor(id){
 const local=personal.get(id);
 if(local){
  const wrap=document.createElement('span');wrap.className='nav-cart-thumb';
  const img=document.createElement('img');img.src=local;img.alt='Fotografía del producto';img.loading='lazy';wrap.append(img);return wrap;
 }
 const found=atlasFor(id);if(!found)return null;
 const {atlas,n}=found;
 const wrap=document.createElement('span');wrap.className='nav-cart-thumb';
 const sprite=document.createElement('span');sprite.className='product-sprite nav-cart-sprite';
 sprite.setAttribute('role','img');sprite.setAttribute('aria-label','Fotografía del catálogo');
 const x=(n%atlas.columns)*atlas.size,y=Math.floor(n/atlas.columns)*atlas.size;
 sprite.style.backgroundPosition='-'+x+'px -'+y+'px';
 sprite.style.backgroundSize=(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px';
 wrap.append(sprite);return wrap;
}
function sync(){
 const host=document.getElementById('cart-items');if(!host)return;
 for(const row of host.querySelectorAll('.cart-line')){
  const dec=row.querySelector('button[data-dec]');const id=dec?.dataset.dec;
  if(!/^\d{5,}$/.test(String(id||'')))continue;
  const photo=thumbFor(id);
  const current=row.querySelector('.nav-cart-thumb');
  if(!photo){if(current)current.remove();continue}
  if(current){
   const oldImg=current.querySelector('img'),newImg=photo.querySelector('img');
   const oldSprite=current.querySelector('.nav-cart-sprite'),newSprite=photo.querySelector('.nav-cart-sprite');
   if((oldImg&&newImg&&oldImg.src===newImg.src)||(oldSprite&&newSprite&&oldSprite.style.backgroundPosition===newSprite.style.backgroundPosition))continue;
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
 const css=document.createElement('style');css.textContent='.cart-line{display:flow-root}.nav-cart-thumb{float:left;width:58px;height:58px;overflow:hidden;border:1px solid #dce3ed;border-radius:9px;background:#fff;margin:1px 11px 8px 0;display:block;position:relative}.nav-cart-thumb img{display:block;width:100%;height:100%;object-fit:contain}.nav-cart-sprite{position:absolute;top:0;left:0;width:128px!important;height:128px!important;max-width:none!important;transform:scale(.445);transform-origin:top left}.cart-line .cart-controls{clear:both}';document.head.append(css);
 const host=document.getElementById('cart-items');
 if(!host)return;
 const observer=new MutationObserver(sync);observer.observe(host,{childList:true});
 sync();loadPhotos();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();