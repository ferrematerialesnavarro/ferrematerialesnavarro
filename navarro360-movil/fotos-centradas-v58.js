/* NAVARRO 360 V58: escala del atlas y tiras de materiales por tamaño del marco. */
(function(){
 'use strict';
 if(window.NAVARRO_FOTOS_CENTRADAS_V58)return;
 window.NAVARRO_FOTOS_CENTRADAS_V58=true;
 let pending=false;
 function sync(){
  pending=false;
  const grid=document.getElementById('products');
  if(!grid)return;
  for(const visual of grid.querySelectorAll('article[data-card] > .product-visual')){
   if(!visual.querySelector(':scope > .product-sprite, :scope > .nav-material-photo, :scope > .nav-material-strip'))continue;
   const width=visual.clientWidth,height=visual.clientHeight;
   if(width<=0||height<=0)continue;
   const scale=Math.min(1,Math.max(.18,Math.min((width-12)/128,(height-12)/128)));
   const val=String(Math.round(scale*1000)/1000);
   if(visual.style.getPropertyValue('--nav-photo-scale')!==val)
    visual.style.setProperty('--nav-photo-scale',val);
  }
 }
 function queue(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(sync);
 }
 function start(){
  const grid=document.getElementById('products');
  if(!grid)return;
  new MutationObserver(queue).observe(grid,{childList:true,subtree:true});
  if(typeof ResizeObserver==='function')new ResizeObserver(queue).observe(grid);
  window.addEventListener('resize',queue,{passive:true});
  queue();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
