/* NAVARRO 360 V23: Alta de nuevos productos en la página, sólo cajas registradas en Windows. */
(()=>{'use strict';
 const PAIR_KEY='navarro360_print_bridge_pair_v1', DEVICE_KEY='navarro-inventario-device-v22';
 const BOXES=['Computadora','Pablo','Diana','Goli'];
 const CATS=['Construcción','Plomería','Electricidad','Herramientas','Pintura','Todos'];
 const RE_CODE=/^\d{5,30}$/, RE_TOKEN=/^[a-f0-9]{64}$/, RE_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 let busy=false,loading=false;
 function pair(){try{const p=JSON.parse(localStorage.getItem(PAIR_KEY)||'null');return p&&/^https:\/\/[a-z0-9-]+\.ngrok-free\.(?:dev|app)\/?$/.test(p.url)&&RE_TOKEN.test(p.token)?p:null;}catch{return null;}}
 function device(){try{const d=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null');return d&&RE_UUID.test(d.deviceId)&&RE_TOKEN.test(d.deviceToken)?d:null;}catch{return null;}}
 async function request(payload){
  const p=pair(),d=device();
  if(!p)throw Error('Esta aplicación no tiene vinculada la impresora de NAVARRO.');
  if(!d)throw Error('Falta reconocer esta caja en Inventario V22. Abre Ajustar stock para registrar tu caja.');
  const res=await fetch(p.url.replace(/\/$/,'')+'/productos',{
   method:'POST',credentials:'omit',redirect:'error',cache:'no-store',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+p.token,'ngrok-skip-browser-warning':'true'},
   body:JSON.stringify({...d,...payload}),signal:AbortSignal.timeout(20000)
  });
  let obj={};try{obj=await res.json()}catch{}
  if(!res.ok||obj.ok!==true){
   if(res.status===404)throw Error('PRODUCTOS V25 no está activo en Windows. Instala V25 y verifica el reinicio.');
   if(res.status===403)throw Error(obj.error||'Este dispositivo no pertenece a las cuatro cajas autorizadas.');
   throw Error(obj.error||'No se pudo guardar en Windows. Comprueba la conexión.');
  }
  return obj;
 }
 const style=document.createElement('style');
 style.textContent=[
  '#nv23-open{display:block;max-width:280px;margin:10px 6px;padding:12px 16px;border:1px solid #9ac8b0;border-radius:12px;background:#ecf8f0;color:#16593b;font:bold 14px system-ui;cursor:pointer}',
  '#nv23-open[hidden],#nv23-mask[hidden]{display:none!important}',
  '#nv23-mask{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;background:rgba(9,20,26,.76);padding:12px}',
  '#nv23-panel{box-sizing:border-box;background:#fff;color:#15352b;width:min(560px,100%);max-height:94vh;overflow:auto;border-radius:20px;padding:20px;box-shadow:0 20px 60px #0005;font:15px/1.4 system-ui}',
  '#nv23-panel h2{margin:0 0 7px;font-size:21px}',
  '#nv23-panel p{font-size:12px;color:#546c63;line-height:1.5}',
  '#nv23-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
  '#nv23-form label{display:flex;flex-direction:column;gap:5px;font-weight:700;font-size:12px}',
  '#nv23-form input,#nv23-form select{min-width:0;width:100%;box-sizing:border-box;background:#fff;color:#122b23;padding:11px;border:1px solid #bfcec5;border-radius:10px;font:15px system-ui}',
  '#nv23-form label.nv23-wide{grid-column:1/-1}',
  '#nv23-actions{display:flex;gap:10px;margin-top:14px;justify-content:flex-end}',
  '#nv23-actions button{border:0;border-radius:10px;padding:13px;font:bold 14px system-ui;cursor:pointer}',
  '#nv23-save{background:#176a45;color:white}#nv23-cancel{background:#e9f0ec;color:#234f37}',
  '#nv23-state{min-height:20px;font-size:13px;color:#7a3f20}',
  '@media(max-width:420px){#nv23-panel{padding:14px}#nv23-form{gap:8px}}'
 ].join('');
 document.head.appendChild(style);
 const button=document.createElement('button');
 button.type='button';button.id='nv23-open';button.textContent='＋ Agregar producto nuevo';
 const anchor=document.getElementById('filters')||document.getElementById('products');
 if(anchor?.parentElement)anchor.parentElement.insertBefore(button,anchor);
 else document.body.appendChild(button);
 const mask=document.createElement('div');
 mask.id='nv23-mask';mask.hidden=true;mask.setAttribute('role','dialog');mask.setAttribute('aria-modal','true');mask.setAttribute('aria-labelledby','nv23-title');
 mask.innerHTML=[
  '<div id="nv23-panel"><h2 id="nv23-title">＋ Nuevo producto</h2>',
  '<p>Solo cuatro cajas registradas. Se publican para clientes cuando GitHub está autorizado en Windows. SIFO requiere dar de alta el código por separado.</p>',
  '<form id="nv23-form">',
  '<label class="nv23-wide">Código de barras<input name="code" autocomplete="off" inputmode="numeric" pattern="[0-9]{5,30}" required maxlength="30" placeholder="Escanea o escribe el código"></label>',
  '<label class="nv23-wide">Nombre<input name="name" maxlength="110" minlength="3" required autocomplete="off" placeholder="Descripción y medida exacta"></label>',
  '<label>Precio de venta ($)<input name="price" type="number" min="0.01" max="100000000" step="0.01" required></label>',
  '<label>Existencia inicial<input name="stock" type="number" min="0" max="100000000" step="0.001" required value="0"></label>',
  '<label>Categoría<select name="cat">',
  CATS.map(c=>'<option value="'+c+'">'+c+'</option>').join(''),
  '</select></label>',
  '<label>Unidad de venta<select name="unit"><option value="pieza">Pieza</option><option value="metro">Metro</option><option value="kilo">Kilo</option><option value="litro">Litro</option></select></label>',
  '<label class="nv23-wide">Fotografía opcional<input name="image" type="file" accept="image/*"></label>',
  '<div id="nv23-actions" class="nv23-wide"><button id="nv23-cancel" type="button">Cancelar</button><button id="nv23-save" type="submit">Guardar producto</button></div>',
  '</form><p id="nv23-state" role="status" aria-live="polite"></p></div>'
 ].join('');
 document.body.appendChild(mask);
 const form=mask.querySelector('#nv23-form'),state=mask.querySelector('#nv23-state'),save=mask.querySelector('#nv23-save');

 /* Código interno EAN-13: se RESERVA en Windows y se valida al guardar.
    No es un GTIN comercial de fabricante y debe registrarse aparte en SIFO. */
 const codeField=form.elements.code;
 const actions=document.createElement('div');actions.className='nv23-wide';actions.id='nv24-barcode-controls';
 actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:1px 0 4px';
 actions.innerHTML='<button type="button" id="nv24-generate" style="border:1px solid #96c2a6;border-radius:9px;padding:10px;background:#e8f6ed;color:#155c39;font-weight:800">▥ Generar código de barras único</button>';
 codeField.closest('label').insertAdjacentElement('afterend',actions);
 const preview=document.createElement('div');preview.id='nv24-barcode-preview';preview.className='nv23-wide';preview.hidden=true;
 preview.style.cssText='padding:12px;border:1px solid #cfe1d7;border-radius:11px;background:white;color:#1f3d30;text-align:center';
 preview.innerHTML='<div id="nv24-barcode-image"></div><p style="font-size:12px">Código interno de la tienda · EAN-13. Dar de alta en SIFO antes de vender.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button type="button" id="nv24-copy" style="padding:9px;border-radius:9px">Copiar código</button><button type="button" id="nv24-print" style="padding:9px;border-radius:9px">Imprimir etiqueta</button></div>';
 actions.insertAdjacentElement('afterend',preview);
 let generated='',labelSvg='';
 function ean13Svg(code){
  if(!/^29\d{11}$/.test(code))throw Error('Código interno inválido');
  const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1110100','1000100','1110010'];
  const parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  let sum=0;for(let i=0;i<12;i++)sum+=Number(code[i])*(i%2===0?1:3);
  if(Number(code[12])!==(10-sum%10)%10)throw Error('Dígito de control inválido');
  const mode=parity[Number(code[0])];
  let bits='101';
  for(let i=0;i<6;i++){let n=Number(code[i+1]);bits+=(mode[i]==='L'?L:G)[n];}
  bits+='01010';
  for(let i=7;i<13;i++)bits+=R[Number(code[i])];
  bits+='101';
  if(bits.length!==95)throw Error('No se pudo representar el código de barras');
  let bars='';for(let i=0;i<bits.length;i++)if(bits[i]==='1')bars+='<rect x="'+(14+i)+'" y="4" width="1" height="'+(i<3||(i>=45&&i<50)||i>=92?36:32)+'"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="390" height="160" viewBox="0 0 123 51" role="img" aria-label="Código EAN 13 '+code+'" style="display:block;width:100%;max-width:390px;margin:auto;background:white"><rect width="123" height="51" fill="white"/><g fill="black">'+bars+'</g><text x="61.5" y="46.8" text-anchor="middle" font-family="monospace" font-size="6" font-weight="bold" letter-spacing="1.1">'+code+'</text></svg>';
 }
 const generateButton=actions.querySelector('#nv24-generate');
 generateButton.addEventListener('click',async()=>{
  if(busy)return;busy=true;generateButton.disabled=true;save.disabled=true;
  try{
   state.textContent='Comprobando códigos existentes y reservando uno nuevo en Windows…';
   const result=await request({action:'reserve'});
   if(!/^29\d{11}$/.test(result.code))throw Error('Windows no devolvió un código válido');
   labelSvg=ean13Svg(result.code);generated=result.code;
   codeField.value=generated;preview.querySelector('#nv24-barcode-image').innerHTML=labelSvg;preview.hidden=false;
   state.textContent='✓ Código único reservado para esta caja. Completa el producto y guarda. No corresponde a un código oficial de fabricante.';
  }catch(error){state.textContent=error.message||'No fue posible reservar el código';}
  finally{busy=false;generateButton.disabled=false;save.disabled=false;}
 });
 codeField.addEventListener('input',()=>{if(codeField.value!==generated){preview.hidden=true;generated='';labelSvg='';}});
 preview.querySelector('#nv24-copy').addEventListener('click',async()=>{
  if(!generated)return;
  try{await navigator.clipboard.writeText(generated);state.textContent='✓ Código copiado';}
  catch{codeField.focus();codeField.select();state.textContent='Selecciona el código y utiliza Copiar.';}
 });
 preview.querySelector('#nv24-print').addEventListener('click',()=>{
  if(!generated||!labelSvg)return;
  const w=window.open('','_blank','width=450,height=370');
  if(!w){state.textContent='Permite las ventanas emergentes para imprimir la etiqueta.';return;}
  w.document.open();
  w.document.write('<!doctype html><html><head><title>Etiqueta NAVARRO '+generated+'</title><style>body{font-family:Arial;text-align:center;margin:12px}svg{width:90mm;max-width:100%}p{font-size:12px}@media print{@page{size:100mm 55mm;margin:3mm}}</style></head><body><strong>NAVARRO · CÓDIGO INTERNO</strong>'+labelSvg+'<p>Registrar en SIFO antes de vender</p></body></html>');
  w.document.close();w.focus();w.print();
 });

 const status=message=>{state.textContent=message||'';};
 function visible(){button.hidden=!(pair()&&device());}
 function close(){if(busy)return;mask.hidden=true;form.reset();status('');}
 async function compress(file){
  if(!file)return '';
  if(file.size>8*1024*1024)throw Error('La fotografía es demasiado grande. Usa una imagen menor a 8 MB.');
  const objectUrl=URL.createObjectURL(file);
  try{
   const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No se pudo leer la fotografía.'));img.src=objectUrl;});
   const scale=Math.min(1,430/Math.max(img.naturalWidth||1,img.naturalHeight||1));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const context=canvas.getContext('2d');
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(img,0,0,canvas.width,canvas.height);
   for(const quality of [.75,.60,.45,.32]){
    const result=canvas.toDataURL('image/jpeg',quality);
    if(result.length<=70000)return result;
   }
   throw Error('La fotografía sigue siendo demasiado grande. Prueba otra más ligera.');
  }finally{URL.revokeObjectURL(objectUrl);}
 }
 async function load(){
  if(loading||!pair()||!device())return;
  loading=true;
  try{
   let cursor=null,rows=[],pages=0;
   do{
    const result=await request({action:'list',cursor});
    if(!Array.isArray(result.rows))throw Error('Lista de productos inválida.');
    rows.push(...result.rows);cursor=result.cursor;
    if(++pages>35)throw Error('Demasiados productos.');
   }while(cursor!==null&&cursor!==undefined);
   window.NAVARRO_NUEVOS_PRODUCTOS_V23?.apply(rows);
  }catch(e){/* Si Windows está desconectado, el catálogo anterior continúa funcionando. */}
  finally{loading=false;}
 }
 button.addEventListener('click',()=>{visible();if(button.hidden)return;mask.hidden=false;status('');form.elements.code.focus();});
 mask.querySelector('#nv23-cancel').addEventListener('click',close);
 mask.addEventListener('click',e=>{if(e.target===mask)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mask.hidden){e.stopPropagation();close();}});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const code=String(form.elements.code.value||'').trim();
  const name=String(form.elements.name.value||'').trim().replace(/\s+/g,' ');
  const price=Number(form.elements.price.value),stock=Number(form.elements.stock.value);
  const cat=form.elements.cat.value,unit=form.elements.unit.value;
  if(!RE_CODE.test(code)||name.length<3||!Number.isFinite(price)||price<=0||!Number.isFinite(stock)||stock<0){status('Revisa los datos del producto.');return;}
  if(window.NAVARRO_NUEVOS_PRODUCTOS_V23?.contains(code)){status('Ya existe ese código. Usa Ajustar stock.');return;}
  if(!confirm('Agregar '+name+' · Código '+code+' · $'+price.toFixed(2)+'\n\nSe publicará para clientes cuando GitHub esté autorizado. SIFO necesita alta por separado.'))return;
  busy=true;save.disabled=true;status('Guardando en Windows…');
  try{
   const photo=await compress(form.elements.image.files[0]);
   const result=await request({action:'create',code,name,price,stock,cat,unit,photo});
   window.NAVARRO_NUEVOS_PRODUCTOS_V23?.apply([result.product]);
   if(result.published){
    mask.hidden=true;form.reset();preview.hidden=true;generated='';labelSvg='';
    alert('Producto enviado al catálogo público. GitHub Pages puede tardar en mostrarlo.');
    window.NAVARRO_PUBLICOS_V25?.recargar();
   }else{
    state.textContent='Guardado en Windows, pero AÚN NO visible a clientes. '+(result.publishError||'Autoriza GitHub en Windows y pulsa Publicar pendientes.');
   }
   const search=document.getElementById('search');
   if(search){search.value=code;search.dispatchEvent(new Event('input',{bubbles:true}));}
   load().catch(()=>{});
  }catch(error){status(error.message||'No se pudo guardar el producto.');}
  finally{busy=false;save.disabled=false;}
 });
 visible();window.addEventListener('pageshow',visible);
 setTimeout(()=>{visible();load();},3500);
 setInterval(()=>{if(!document.hidden){visible();load();}},30000);
 window.NAVARRO_AGREGAR_PRODUCTOS_V25=Object.freeze({version:25,recargar:load});
})();
