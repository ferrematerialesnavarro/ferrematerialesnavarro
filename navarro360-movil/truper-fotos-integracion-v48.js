/* NAVARRO 360 V48: fotos de Grupo Truper con clave y respaldo de catálogo.
   Respeta fotografías personales, catálogo, precios, carrito, SIFO y WhatsApp. */
(function(){
'use strict';
if(window.NAVARRO_TRUPER_IMAGENES_INSTALADAS)return;
window.NAVARRO_TRUPER_IMAGENES_INSTALADAS=true;
const bank=window.NAVARRO_FOTOS_TRUPER_V48||{};
function imagePaths(id){
 const record=bank[String(id)];
 if(!Array.isArray(record)||record.length!==2)return null;
 const clave=String(record[0]||'');
 const backup=String(record[1]||'');
 if(!/^[A-Za-z0-9+./-]{2,35}$/.test(clave))return null;
 if(!/^https:\/\/ferreteriastrp\.com\/public\/mnt\/wtrp\/images\/productos\/[a-z0-9%_.-]+\.webp(?:\?[^"'<>]*)?$/i.test(backup))return null;
 return {
  primary:'https://www.truper.com/media/import/imagenes/'+encodeURIComponent(clave)+'.jpg',
  backup
 };
}
function syncCards(){
 const grid=document.getElementById('products');
 if(!grid)return;
 for(const card of grid.querySelectorAll('article[data-card]')){
  const id=String(card.dataset.card||'');
  const source=imagePaths(id);
  if(!source)continue;
  const visual=card.querySelector('.product-visual');
  if(!visual||visual.querySelector('img.nav-v40-photo,img.nav-user-photo'))continue;
  let img=visual.querySelector('img.nav-truper-verified-photo');
  if(img&&img.dataset.sku===id)continue;
  if(img)img.remove();
  img=document.createElement('img');
  img.className='nav-truper-verified-photo';
  img.alt='Fotografía del producto '+id;
  img.loading='lazy';img.decoding='async';img.dataset.sku=id;
  img.onerror=()=>{
   if(img.dataset.backupTried!=='1'&&img.src!==source.backup){
    img.dataset.backupTried='1';img.src=source.backup;
   }else{img.remove()}
  };
  img.src=source.primary;
  visual.prepend(img);
 }
}
function init(){
 const style=document.createElement('style');
 style.textContent='.product-visual{position:relative}.nav-truper-verified-photo{position:absolute;inset:0;width:100%;height:100%;max-width:100%;object-fit:contain;background:#fff;z-index:2;pointer-events:none;border-radius:9px}.product-visual .product-cat{z-index:3;position:relative}.product-visual .nav-camera,.product-visual .nav-v40-camera,.product-visual .card-importe{z-index:9}';
 document.head.append(style);
 const grid=document.getElementById('products');
 if(grid)new MutationObserver(syncCards).observe(grid,{childList:true});
 syncCards();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();