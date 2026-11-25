/* NAVARRO 360 — Acceso administrativo multidispositivo V27.2
   Las cuatro cajas usan el MISMO sitio y cada una mantiene su propio enlace de impresora.
   El enlace se muestra con la impresora emparejada, sin esperar al reconocimiento V22.
   Mostrar un enlace nunca otorga permisos: Windows valida las operaciones protegidas.
   No modifica carrito, precios, pedidos, fotos ni impresiones.
*/
(function(){
 'use strict';
 if(new URLSearchParams(location.search).has('admin'))return;
 if(window.NAVARRO_ACCESO_ADMIN_V272)return;
 const DEST='./administracion.html?v=272';
 const STORAGE='navarro360_print_bridge_pair_v1';
 const NAMES=new Set(['COMPUTADORA','PABLO','DIANA','GOLI']);
 const RE_TOKEN=/^[a-f0-9]{64}$/;
 const RE_URL=/^https:\/\/[a-z0-9-]+\.ngrok-free\.(?:dev|app)\/?$/;
 let listLink=null,menuLink=null,lastMode='';
 function hasPrinterPair(){
  try{
   const p=JSON.parse(localStorage.getItem(STORAGE)||'null');
   return !!(p&&RE_TOKEN.test(p.token)&&RE_URL.test(p.url));
  }catch{return false;}
 }
 function recognizedBox(){
  try{
   const state=window.NAVARRO_INVENTARIO_V22?.estado?.();
   const name=String(state?.caja||'').trim().toUpperCase();
   return state?.impresora&&state?.reconocido&&NAMES.has(name)?name:'';
  }catch{return '';}
 }
 function linked(){
  const box=recognizedBox();
  // Comprobar un enlace válido NO sustituye la autorización del servidor.
  return {visible:!!(box||hasPrinterPair()),box};
 }
 function makeShortcut(box){
  const link=document.createElement('a');
  link.id='nv-admin-shortcut-v272';link.href=DEST;link.textContent='⚙️ Centro de administración';
  link.style.cssText='display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;margin:10px 12px 12px;padding:9px 16px;box-sizing:border-box;border:1px solid #acd0bd;border-radius:12px;background:#e8f6ed;color:#145a3b;text-decoration:none;font:750 14px system-ui;box-shadow:0 3px 12px #0b372215;';
  link.setAttribute('aria-label','Abrir el Centro de administración de Ferremateriales Navarro');
  if(box)link.title='Caja '+box+' registrada; Windows confirmará cada cambio';
  else link.title='Impresora vinculada; Windows debe autorizar esta caja para editar';
  const mobile=document.querySelector('.mobile-search-wrap');
  const desktop=document.getElementById('filters');
  if(mobile?.parentElement)mobile.insertAdjacentElement('afterend',link);
  else if(desktop?.parentElement)desktop.parentElement.insertBefore(link,desktop);
  else document.body.appendChild(link);
  return link;
 }
 function makeMenu(){
  const menu=document.getElementById('mobile-menu-panel');
  if(!menu)return null;
  const a=document.createElement('a');
  a.id='nv-admin-mobile-menu-v272';a.href=DEST;a.textContent='⚙️ Centro de administración';
  menu.appendChild(a);return a;
 }
 function check(){
  const {visible,box}=linked();
  const mode=visible?(box?'confirmada':'impresora'):'invitado';
  if(visible){
   if(!listLink||!listLink.isConnected)listLink=makeShortcut(box);
   if(!menuLink||!menuLink.isConnected)menuLink=makeMenu();
   if(mode!==lastMode&&listLink)listLink.title=box?'Caja '+box+' reconocida por Windows':'Impresora vinculada. Windows debe validar la caja para guardar cambios';
  }else{
   listLink?.remove();menuLink?.remove();listLink=null;menuLink=null;
  }
  lastMode=mode;
 }
 window.NAVARRO_ACCESO_ADMIN_V272=Object.freeze({version:'27.2',revisar:check,estado:()=>({visible:linked().visible,caja:linked().box||null})});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
 window.addEventListener('pageshow',check);
 window.addEventListener('focus',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
 window.addEventListener('storage',e=>{if(e.key===STORAGE)check();});
 setInterval(()=>{if(!document.hidden)check();},12000);
})();