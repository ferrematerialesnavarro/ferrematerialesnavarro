/* NAVARRO 360 V28.2 — Lector de barras exclusivo para ALTA NUEVA.
 * Reutiliza el mismo motor html5-qrcode del escáner de ventas, pero jamás
 * llama al carrito. Cámara iPhone/Android, teclado HID en PC y entrada manual.
 * Escritura de productos: exclusivamente el módulo V28 + servidor Windows.
 */
(function(){
 'use strict';
 if(window.NAVARRO_ALTA_ESCANER_V282)return;
 const form=document.getElementById('nv23-form');
 const mask=document.getElementById('nv23-mask');
 const controls=document.getElementById('nv24-barcode-controls');
 if(!form||!mask||!controls||!form.elements.code)return;
 const field=form.elements.code;
 const CDN='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
 const valid=/^[0-9]{5,30}$/;
 let scanner=null,launching=null,stopping=null,library=null,epoch=0,accepted=false;
 const $=id=>document.getElementById(id);
 const styles=document.createElement('style');
 styles.id='nv28-2-scanner-styles';
 styles.textContent=[
  '#nv28-2-launch{border:1px solid #92bca8;border-radius:9px;padding:10px 13px;min-height:43px;background:#123f65;color:white;font:800 13px system-ui;cursor:pointer;flex:1 1 180px}',
  '#nv28-2-launch:disabled{opacity:.6}',
  '#nv28-2-remark{grid-column:1/-1;font:12px/1.45 system-ui;color:#4f6659;min-height:18px;margin:0 0 4px}',
  '#nv28-2-overlay[hidden]{display:none!important}',
  '#nv28-2-overlay{position:fixed;inset:0;z-index:2147483645;display:flex;align-items:center;justify-content:center;background:#081629e8;box-sizing:border-box;padding:12px;padding-bottom:calc(12px + env(safe-area-inset-bottom));}',
  '#nv28-2-sheet{box-sizing:border-box;width:min(550px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:#fff;color:#173552;border-radius:19px;padding:16px;box-shadow:0 12px 46px #0005;font:14px/1.5 system-ui}',
  '#nv28-2-sheet h2{margin:0 0 5px;font:800 19px system-ui}',
  '#nv28-2-sheet p{font:13px/1.5 system-ui;margin:6px 0;color:#48667e}',
  '#nv28-2-reader{background:#08192f;border-radius:12px;overflow:hidden;min-height:180px;margin-top:12px}',
  '#nv28-2-reader video{max-width:100%;min-height:185px;object-fit:contain}',
  '#nv28-2-status{color:#194d6b!important;font-weight:750!important;margin:12px 0!important}',
  '#nv28-2-close{min-height:44px;min-width:95px;border:0;border-radius:10px;background:#e6ecf3;color:#173d59;font:800 14px system-ui;cursor:pointer}',
  '#nv28-2-header{display:flex;justify-content:space-between;align-items:start;gap:12px}',
  '#nv28-2-reader div{max-width:100%}',
  '#nv28-2-manual{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}',
  '#nv28-2-manual button{background:#e5f2e8;color:#225837;border-radius:9px;border:1px solid #b2cfbc;padding:9px 11px;font:750 12px system-ui;cursor:pointer}'
 ].join('');
 document.head.appendChild(styles);
 const launch=document.createElement('button');
 launch.type='button';launch.id='nv28-2-launch';
 launch.textContent='📷 Escanear código de barras';
 launch.setAttribute('aria-label','Escanear código de barras para dar de alta un producto');
 controls.appendChild(launch);
 const remark=document.createElement('p');
 remark.id='nv28-2-remark';
 remark.textContent='Escanea el empaque con la cámara, usa tu lector USB o escribe el código. No se agrega al carrito.';
 controls.insertAdjacentElement('afterend',remark);
 const overlay=document.createElement('div');
 overlay.id='nv28-2-overlay';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','nv28-2-heading');
 overlay.innerHTML=[
  '<section id="nv28-2-sheet">',
   '<header id="nv28-2-header"><div><h2 id="nv28-2-heading">📷 Escanear código del producto</h2>',
    '<p>Coloca las barras dentro de la cámara. Se copiará el código en el alta, sin añadir productos al carrito.</p></div>',
    '<button type="button" id="nv28-2-close" aria-label="Cerrar escáner">Cerrar ✕</button></header>',
   '<div id="nv28-2-reader"></div>',
   '<p id="nv28-2-status" role="status" aria-live="polite">Preparando cámara…</p>',
   '<div id="nv28-2-manual"><button type="button" id="nv28-2-keyboard">⌨️ Usar código manual o lector USB</button></div>',
   '<p>Se admiten códigos numéricos EAN, UPC y CODE 128. No necesitas generar un código si el producto ya trae uno.</p>',
  '</section>'
 ].join('');
 document.body.appendChild(overlay);
 const readerHost=$('nv28-2-reader'),status=$('nv28-2-status');
 function notify(message){remark.textContent=String(message||'');}
 function readStatus(message){status.textContent=String(message||'');}
 function loadMotor(){
  if(window.Html5Qrcode)return Promise.resolve();
  if(library)return library;
  library=new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[data-nv28-2-motor]');
   if(existing?.dataset.state==='error')existing.remove();
   const el=document.createElement('script');
   el.src=CDN;el.async=true;el.crossOrigin='anonymous';el.dataset.nv282Motor='1';
   const timer=setTimeout(()=>{el.onload=null;el.onerror=null;reject(Error('El lector no cargó. Comprueba internet.'))},14000);
   el.onload=()=>{clearTimeout(timer);if(window.Html5Qrcode)resolve();else reject(Error('No se pudo iniciar el motor de cámara.'));};
   el.onerror=()=>{clearTimeout(timer);el.dataset.state='error';reject(Error('No se pudo descargar el lector de barras.'));};
   document.head.appendChild(el);
  }).catch(e=>{library=null;throw e});
  return library;
 }
 function createReader(){
  const f=window.Html5QrcodeSupportedFormats||{};
  const fmt=[f.CODE_128,f.EAN_13,f.EAN_8,f.UPC_A,f.UPC_E,f.CODE_39,f.ITF].filter(Number.isInteger);
  const iOS=/(iPhone|iPad|iPod)/i.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  return new window.Html5Qrcode('nv28-2-reader',{
   formatsToSupport:fmt,verbose:false,useBarCodeDetectorIfSupported:!iOS
  });
 }
 async function clearScanner(){
  const current=scanner;scanner=null;
  if(!current)return;
  try{await current.stop()}catch(_){}
  try{await current.clear()}catch(_){}
 }
 async function close(){
  if(stopping)return stopping;
  ++epoch;overlay.hidden=true;
  stopping=(async()=>{
   try{if(launching)await launching;}catch(_){}
   await clearScanner();
  })().finally(()=>{stopping=null;launch.disabled=false});
  return stopping;
 }
 function accept(raw){
  const code=String(raw||'').trim().replace(/[\s-]+/g,'');
  if(!valid.test(code)){
   readStatus('El lector detectó un código no numérico o inválido. Prueba de nuevo.');
   return false;
  }
  if(accepted)return true;
  accepted=true;
  field.value=code;
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
  const exists=window.NAVARRO_NUEVOS_PRODUCTOS_V23?.contains?.(code);
  notify(exists?'⚠️ El código '+code+' ya existe en el catálogo. Revisa el artículo antes de crear otro.':
   '✓ Código capturado: '+code+'. Completa el nombre, precio y demás datos para guardarlo.');
  void close().then(()=>{
   if(!mask.hidden){
    try{form.elements.name.focus({preventScroll:true});}catch(_){form.elements.name.focus();}
   }
  });
  return true;
 }
 async function open(){
  if(!mask||mask.hidden||!overlay.hidden||launching||stopping)return;
  if(document.body.classList.contains('nav-scan-open')){
   notify('Cierra primero el escáner de ventas para usar el lector de altas.');
   return;
  }
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
   notify('La cámara requiere HTTPS y autorización en Safari. Puedes usar el lector físico o escribir el código.');
   return;
  }
  overlay.hidden=false;
  accepted=false;
  const token=++epoch;
  launch.disabled=true;
  readStatus('Preparando cámara trasera…');
  launching=(async()=>{
   try{
    await loadMotor();
    if(token!==epoch)return;
    let current=createReader();scanner=current;
    const found=value=>{
     if(token!==epoch||overlay.hidden||accepted)return;
     accept(value);
    };
    try{
     await current.start({facingMode:'environment'},{
      fps:12,disableFlip:true,
      videoConstraints:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}
     },found,()=>{});
    }catch(e){
     if(token!==epoch)return;
     try{await current.stop()}catch(_){}
     try{await current.clear()}catch(_){}
     if(scanner===current)scanner=null;
     current=createReader();scanner=current;
     await current.start({facingMode:'environment'},{
      fps:10,disableFlip:true
     },found,()=>{});
    }
    if(token!==epoch){
     await clearScanner();return;
    }
    readStatus('Apunta al código de barras. Al reconocerlo, el lector se cerrará automáticamente.');
   }catch(e){
    if(token!==epoch)return;
    const msg=String(e?.message||e||'No se pudo abrir la cámara');
    readStatus(/Permission|NotAllowed|denied|permiso/i.test(msg)?
     'Permite el uso de la cámara para este sitio en Safari y vuelve a intentarlo.':
     'No se pudo iniciar el escáner: '+msg+'. Puedes usar tu lector USB o introducir el código.');
    await clearScanner();
    launch.disabled=false;
   }
  })();
  try{await launching;}finally{launching=null;if(overlay.hidden)launch.disabled=false;}
 }
 launch.addEventListener('click',()=>{void open()});
 $('nv28-2-close').addEventListener('click',()=>{void close()});
 $('nv28-2-keyboard').addEventListener('click',()=>{
  void close().then(()=>{
   field.focus();notify('Escanea con el lector físico o escribe el código y presiona Enter.');
  });
 });
 overlay.addEventListener('click',event=>{if(event.target===overlay)void close()});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!overlay.hidden){
   event.preventDefault();event.stopImmediatePropagation();void close();
  }
 },true);
 // Un lector USB suele añadir Enter al terminar: no debe guardar el producto.
 field.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||mask.hidden)return;
  event.preventDefault();event.stopPropagation();
  const code=String(field.value||'').trim();
  notify(valid.test(code)?'✓ Código capturado: '+code+'. Continúa con el nombre del producto.':
   'El código debe tener entre 5 y 30 dígitos.');
  if(valid.test(code)){
   try{form.elements.name.focus({preventScroll:true});}catch(_){form.elements.name.focus();}
  }
 });
 // No bloquear la navegación ni conservar la cámara si se cambia de pantalla.
 window.addEventListener('pagehide',()=>{void close()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!overlay.hidden)void close()});
 window.NAVARRO_ALTA_ESCANER_V282=Object.freeze({
  version:'28.2',abrir:open,cerrar:close
 });
})();