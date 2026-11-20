/* NAVARRO 360 - Identificador de caja V12, local por navegador/PWA.
   NO autentica personal ni modifica pagos, precios, carrito, SIFO o impresion.
*/
(function(){
 'use strict';
 if(window.NAVARRO_CAJA_IDENTIDAD)return;
 const KEY='navarro360_codigo_caja_v1';
 const normal=s=>String(s||'').trim().toUpperCase();
 const valid=s=>/^[A-Z0-9_-]{2,30}$/.test(s);
 let caja='';
 try{const c=normal(localStorage.getItem(KEY));if(valid(c))caja=c;}catch(_){ }
 window.NAVARRO_CAJA_IDENTIDAD=Object.freeze({version:1,codigo:()=>caja});
 function init(){
  const print=document.getElementById('nv-print-ticket-button');
  if(!print||!print.parentElement)return;
  const btn=document.createElement('button');
  btn.type='button';btn.id='nv-caja-configurar';
  btn.style.cssText='width:100%;min-height:42px;margin:4px 0 8px;border:1px solid #b8d1bf;border-radius:11px;background:#f1f7f2;color:#235a3b;font:800 13px system-ui';
  const refresh=()=>btn.textContent=caja?'🏪 Caja activa: '+caja+' · Cambiar':'🏪 Asignar caja a este telefono';
  refresh();
  btn.addEventListener('click',()=>{
   const raw=window.prompt('Identificador de caja para este telefono (ejemplo CAJA_01). Se guarda solamente en este navegador.',caja||'CAJA_01');
   if(raw===null)return;
   const next=normal(raw);
   if(!valid(next)){window.alert('Identificador invalido. Usa 2 a 30 letras, numeros, guiones o guion bajo.');return;}
   try{localStorage.setItem(KEY,next);caja=next;refresh();}
   catch(_){window.alert('Este navegador no pudo guardar la caja. Revisa espacio o permisos.');}
  });
  print.parentElement.insertBefore(btn,print);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
