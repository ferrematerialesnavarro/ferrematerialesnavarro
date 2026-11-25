/* NAVARRO V25: Corrección de productos NUEVOS y reintentos de publicación.
   No se muestran controles al público y Windows valida identidad en cada operación. */
(()=>{'use strict';
 const P='navarro360_print_bridge_pair_v1',D='navarro-inventario-device-v22';
 const RE_TOKEN=/^[a-f0-9]{64}$/,RE_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 function credentials(){
  try{
   const p=JSON.parse(localStorage.getItem(P)||'null'),d=JSON.parse(localStorage.getItem(D)||'null');
   if(!p||!d||!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(?:dev|app)\/?$/.test(p.url)||!RE_TOKEN.test(p.token)||!RE_UUID.test(d.deviceId)||!RE_TOKEN.test(d.deviceToken))return null;
   return {p,d};
  }catch{return null;}
 }
 async function post(input){
  const creds=credentials();
  if(!creds)throw Error('Este dispositivo no tiene registrada la impresora y su caja de Inventario V22.');
  const r=await fetch(creds.p.url.replace(/\/$/,'')+'/productos',{
   method:'POST',credentials:'omit',cache:'no-store',redirect:'error',
   headers:{Authorization:'Bearer '+creds.p.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},
   body:JSON.stringify({...creds.d,...input}),signal:AbortSignal.timeout(20000)
  });
  let data={};try{data=await r.json()}catch{}
  if(!r.ok||data.ok!==true)throw Error(data.error||'No se pudo guardar la corrección en Windows.');
  return data;
 }
 const button=document.createElement('button');button.type='button';button.id='nv25-publicar-pendientes';
 button.textContent='↻ Publicar productos pendientes';button.style.cssText='margin:8px;padding:10px 14px;border:1px solid #abd2b9;border-radius:10px;background:#ecf7f0;color:#195c3b;font:700 13px system-ui';
 const anchor=document.getElementById('nv23-open')||document.getElementById('filters');
 if(anchor)anchor.after(button);else document.body.appendChild(button);
 const status=document.createElement('div');status.setAttribute('role','status');status.style.cssText='font:12px system-ui;color:#805c24;margin:3px 7px';
 button.after(status);
 const verify=document.createElement('button');verify.type='button';verify.id='nv285-verificar-publico';verify.hidden=true;verify.textContent='Comprobar catálogo público';verify.style.cssText=button.style.cssText;button.after(verify);
 verify.addEventListener('click',async()=>{
  if(!credentials()||verify.disabled)return;
  verify.disabled=true;status.textContent='Consultando la misma fuente pública de los clientes…';
  try{
   const api=window.NAVARRO_PUBLICOS_V25;if(!api||!await api.recargar())throw Error(api?.estado()?.error||'No se pudo consultar');
   const info=api.estado();const code=String(document.getElementById('search')?.value||'').trim();
   const p=/^\d{5,30}$/.test(code)?api.verificar(code):null;
   const when=Date.parse(info.ultimaConsulta);const hora=Number.isFinite(when)?new Date(when).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}):'';
   const details=p?' · '+p.code+' '+p.name+' · '+p.price.toLocaleString('es-MX',{style:'currency',currency:'MXN'}):(/^\d{5,30}$/.test(code)?' · Código no encontrado en las altas públicas (puede pertenecer al catálogo original).':'');
   status.textContent='Consulta pública correcta · '+info.total+' altas publicadas · '+hora+details;
  }catch(e){status.textContent='No se pudo verificar la publicación: '+(e.message||'sin conexión');}
  finally{verify.disabled=false;}
 });
 const dialog=document.createElement('div');dialog.id='nv25-edit-mask';dialog.hidden=true;
 dialog.style.cssText='position:fixed;inset:0;background:#000b;z-index:2147483644;display:grid;place-items:center;padding:12px';
 const css=document.createElement('style');css.textContent='#nv25-edit-mask[hidden]{display:none!important}#nv25-edit-form{background:#fff;color:#183629;padding:18px;border-radius:15px;width:min(490px,100%);max-height:94vh;overflow:auto;font:14px system-ui}#nv25-edit-form label{display:block;margin:9px 0;font-weight:700}#nv25-edit-form input,#nv25-edit-form select{display:block;box-sizing:border-box;width:100%;padding:10px;border:1px solid #b9d2c6;border-radius:8px;font:15px system-ui;margin-top:5px}#nv25-edit-form button{padding:11px;border-radius:8px;border:1px solid #a8cbb8;font-weight:bold;margin:4px;color:#175b3d;background:#edf7f0}';
 document.head.appendChild(css);
 dialog.innerHTML='<form id="nv25-edit-form"><h2 style="margin:0">✎ Corregir producto nuevo</h2><p style="font-size:12px">Solo las fichas nuevas. Si cambias el código, el anterior queda reservado y se conserva el inventario. No modifica productos originales.</p><label>Código de barras<input name="code" inputmode="numeric" pattern="[0-9]{5,30}" maxlength="30" required></label><button type="button" data-generate>▥ Generar otro código interno</button><label>Nombre y descripción<input name="name" required maxlength="110" minlength="3"></label><label>Precio de venta ($)<input name="price" type="number" min=".01" step=".01" required></label><label>Existencia actual (se modifica en Ajustar stock)<input name="stock" type="number" disabled></label><label>Categoría<select name="cat"><option>Construcción</option><option>Plomería</option><option>Electricidad</option><option>Herramientas</option><option>Pintura</option><option>Todos</option></select></label><label>Venta por<select name="unit"><option value="pieza">Pieza</option><option value="metro">Metro</option><option value="kilo">Kilo</option><option value="litro">Litro</option></select></label><label>Reemplazar foto del producto nuevo (opcional)<input name="photo" type="file" accept="image/*"></label><p data-message style="font-size:12px;color:#835121" role="status"></p><button type="button" data-cancel>Cancelar</button><button type="submit" data-save style="background:#176a45;color:white">Guardar corrección</button></form>';
 document.body.appendChild(dialog);
 const form=dialog.querySelector('form'),msg=dialog.querySelector('[data-message]');let editing=null,busy=false;
 const store=()=>window.NAVARRO_NUEVOS_PRODUCTOS_V23;
 const statusText=t=>{msg.textContent=t;};
 async function photo(file){
  if(!file)return '';
  if(file.size>8*1024*1024)throw Error('Fotografía mayor que 8 MB');
  const uri=URL.createObjectURL(file);try{
   const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se pudo abrir la imagen'));img.src=uri;});
   const ratio=Math.min(1,430/Math.max(img.naturalWidth,img.naturalHeight));
   const cv=document.createElement('canvas');cv.width=Math.round(img.naturalWidth*ratio);cv.height=Math.round(img.naturalHeight*ratio);
   const ctx=cv.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(img,0,0,cv.width,cv.height);
   for(const quality of [.75,.6,.45,.32]){const src=cv.toDataURL('image/jpeg',quality);if(src.length<=70000)return src;}
   throw Error('La imagen no pudo comprimirse lo suficiente');
  }finally{URL.revokeObjectURL(uri);}
 }
 function openEdit(code){
  if(!credentials())return;
  const p=store()?.get(String(code));
  if(!p||!p.uid||!p.updatedAt)return;
  editing={code:p.id,version:p.updatedAt};
  form.reset();form.elements.code.value=p.id;form.elements.name.value=p.name;
  form.elements.price.value=p.price;form.elements.stock.value=window.NAVARRO_EXISTENCIAS?.[p.id]?.[0]??0;
  form.elements.cat.value=p.cat;form.elements.unit.value=p.unit;
  statusText('Solo se pueden corregir productos añadidos con este módulo.');
  dialog.hidden=false;form.elements.name.focus();
 }
 function close(){if(busy)return;dialog.hidden=true;editing=null;form.reset();statusText('');}
 dialog.querySelector('[data-cancel]').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden)close();});
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;button.disabled=true;
  try{
   status.textContent='Sincronizando productos públicos…';
   const result=await post({action:'publish'});
   status.textContent=result.published?'✓ Catálogo enviado a GitHub. El despliegue público puede tardar.':'Guardado solamente en Windows: '+(result.publishError||'autoriza GitHub');
   if(result.published)window.NAVARRO_PUBLICOS_V25?.recargar();
  }catch(e){status.textContent=e.message;}finally{busy=false;button.disabled=false;}
 });
 function editButtons(){
  button.hidden=!credentials();verify.hidden=button.hidden;
  if(button.hidden)return;
  document.querySelectorAll('[data-card]').forEach(card=>{
   const code=card.dataset.card,p=store()?.get(code);
   const existing=card.querySelector('[data-nv25-edit]');
   if(existing){existing.hidden=!p?.uid;return;}
   if(!p?.uid)return;
   const b=document.createElement('button');b.type='button';b.dataset.nv25Edit=code;b.textContent='✎ Editar ficha';
   b.style.cssText='border:1px solid #bdd9cb;border-radius:9px;background:#f0f9f3;color:#19623e;font:bold 12px system-ui;padding:7px;margin:5px 0';
   (card.querySelector('.product-info')||card).appendChild(b);
  });
 }
 const productList=document.getElementById('products');
 if(productList)new MutationObserver(editButtons).observe(productList,{childList:true});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-nv25-edit]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openEdit(b.dataset.nv25Edit);},true);
 dialog.querySelector('[data-generate]').addEventListener('click',async()=>{
  if(busy)return;busy=true;try{
   statusText('Reservando código único en Windows…');
   const result=await post({action:'reserve'});
   form.elements.code.value=result.code;statusText('✓ Código reservado: '+result.code);
  }catch(e){statusText(e.message);}finally{busy=false;}
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!editing)return;
  const code=form.elements.code.value.trim(),name=form.elements.name.value.trim().replace(/\s+/g,' ');
  const price=Number(form.elements.price.value),cat=form.elements.cat.value,unit=form.elements.unit.value;
  const stock=Number(form.elements.stock.value);
  if(!/^\d{5,30}$/.test(code)||name.length<3||!Number.isFinite(price)||price<=0)return statusText('Código, nombre o precio no válidos.');
  if(code!==editing.code&&store()?.contains(code))return statusText('El código ya existe.');
  if(!confirm('Guardar corrección de '+editing.code+' a '+code+' y publicarla para los clientes. ¿Continuar?'))return;
  busy=true;form.querySelector('[data-save]').disabled=true;
  try{
   const image=await photo(form.elements.photo.files[0]);
   const result=await post({action:'edit',oldCode:editing.code,expectedVersion:editing.version,code,name,price,stock,cat,unit,photo:image});
   window.dispatchEvent(new CustomEvent('navarro:v29:confirmed',{detail:{type:'Corrección aceptada por Windows',code,name,before:editing.code,after:code}}));
   // El código anterior queda como alias y el carrito migra al nuevo código.
   store()?.apply([result.product]);
   if(editing.code!==code)store()?.migrate(editing.code,code);
   if(result.published){dialog.hidden=true;editing=null;window.NAVARRO_PUBLICOS_V25?.recargar();alert('Corrección guardada y enviada a la página pública. El cambio puede tardar en mostrarse.');}
   else{
    editing={code,version:result.product.updatedAt};
    statusText('Guardado en Windows, aún no público: '+(result.publishError||'Autoriza GitHub y pulsa Publicar cambios pendientes.'));
   }
  }catch(error){statusText(error.message||'No se guardó la corrección.');}
  finally{busy=false;form.querySelector('[data-save]').disabled=false;}
 });
 editButtons();setInterval(()=>{if(!document.hidden)editButtons();},3000);
 window.NAVARRO_EDITOR_V25=Object.freeze({version:25,editar:openEdit});
})();