/* NAVARRO 360 V27.1 — acceso al Centro únicamente si Inventario V22
   ya confirmó la caja con Windows. En la tienda pública nunca muestra
   controles de administración. El servidor vuelve a autorizar cada acción. */
(function(){'use strict';
 if(new URLSearchParams(location.search).has('admin'))return;
 const validBoxes=new Set(['COMPUTADORA','PABLO','DIANA','GOLI']);
 const destination='./administracion.html';
 let link=null,menuLink=null;
 const check=()=>{
  let s=null;try{s=window.NAVARRO_INVENTARIO_V22?.estado?.()}catch{}
  const accepted=!!(s?.reconocido&&validBoxes.has(String(s?.caja||'').toUpperCase())&&s?.impresora);
  if(accepted){
   if(!link){
    link=document.createElement('a');
    link.id='nv-admin-shortcut-v27';
    link.href=destination;
    link.textContent='⚙️ Centro de administración';
    link.style.cssText='display:inline-flex;align-items:center;gap:8px;margin:9px 6px 12px;padding:12px 16px;border:1px solid #b0cfc0;border-radius:12px;background:#eaf6ef;color:#176345;font:750 14px system-ui;text-decoration:none;';
    const anchor=document.getElementById('nv23-open')||document.getElementById('filters');
    if(anchor?.parentElement)anchor.parentElement.insertBefore(link,anchor);else document.body.appendChild(link);
   }
   const menu=document.getElementById('mobile-menu-panel');
   if(menu&&!menuLink){
    menuLink=document.createElement('a');menuLink.href=destination;menuLink.textContent='⚙️ Administración';menuLink.id='nv-admin-mobile-menu-v27';
    menu.appendChild(menuLink);
   }
  }else{
   link?.remove();link=null;
   menuLink?.remove();menuLink=null;
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
 let checks=0;const timer=setInterval(()=>{check();if(++checks>=15)clearInterval(timer)},2000);
 window.addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
})();