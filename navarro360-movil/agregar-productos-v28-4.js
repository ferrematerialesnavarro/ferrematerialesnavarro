/* NAVARRO 360 V28.4: Alta de productos con recomendación de fotografías libres, cámara y galería. Protege el guardado V25. */
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
  '#nv28-image{grid-column:1/-1;background:#f7faf7;border:1px solid #cdded5;border-radius:14px;padding:12px}',
  '#nv28-image h3{margin:0 0 6px;font:800 15px system-ui;color:#184832}',
  '#nv28-image .nv28-actions{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0}',
  '#nv28-image .nv28-actions button{border:1px solid #adc7ba;border-radius:10px;padding:10px;background:#fff;color:#174c37;font:750 12px system-ui;cursor:pointer;flex:1 1 135px}',
  '#nv28-image .nv28-actions button:first-child{background:#1b6448;color:#fff;border-color:#1b6448;flex:1 1 100%}',
  '#nv28-image .nv28-actions button:disabled{opacity:.6}',
  '#nv28-image .nv28-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}',
  '#nv28-image .nv28-option{overflow:hidden;display:block;text-align:left;border:1px solid #c8d9d1;border-radius:12px;background:white;padding:6px;cursor:pointer;color:#163d30;font:700 12px system-ui}',
  '#nv28-image .nv28-option img{display:block;width:100%;height:110px;object-fit:contain;background:#f4f7f5;border-radius:8px}',
  '#nv28-image .nv28-option span{display:block;white-space:normal;font-size:11px;padding:5px 2px;line-height:1.4}',
  '#nv28-image .nv28-note{font:12px/1.5 system-ui;color:#4e6b5d;margin:5px 0}',
  '#nv28-selected[hidden],#nv28-results[hidden]{display:none!important}',
  '#nv28-selected{display:flex;gap:10px;align-items:center;padding:9px;border:1px solid #abcdb8;background:#ebf8ef;border-radius:11px}',
  '#nv28-selected img{height:90px;width:90px;object-fit:contain;background:white;border-radius:7px}',
  '#nv28-selected div{min-width:0;font-size:12px;flex:1;overflow-wrap:anywhere}',
  '@media(min-width:510px){#nv28-image .nv28-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
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
  '<section id="nv28-image" class="nv23-wide" aria-label="Fotografía del producto"><h3>📷 Fotografía del producto</h3>',
  '<p class="nv28-note">Primero buscamos imágenes de uso libre que puedan coincidir con tu producto. Confirma la presentación y medida antes de elegir.</p>',
  '<div class="nv28-actions">',
   '<button type="button" id="nv28-search">🔎 Recomendar fotos por nombre</button>',
   '<button type="button" id="nv28-camera-button">📷 Tomar foto</button>',
   '<button type="button" id="nv28-gallery-button">🖼️ Elegir de galería</button>',
  '</div>',
  '<input type="file" id="nv28-camera" accept="image/*" capture="environment" hidden aria-label="Tomar foto con la cámara">',
  '<input type="file" id="nv28-gallery" name="image" accept="image/*" hidden aria-label="Elegir foto de la galería">',
  '<p id="nv28-photo-message" class="nv28-note" role="status" aria-live="polite">Escribe el nombre del producto para recibir recomendaciones.</p>',
  '<div id="nv28-results" class="nv28-grid" hidden></div>',
  '<div id="nv28-selected" hidden><img alt="Vista previa de la foto seleccionada"><div><strong>Foto seleccionada</strong><p id="nv28-selected-source"></p><button type="button" id="nv28-clear" style="padding:7px;border:1px solid #adc7ba;border-radius:8px;background:white;color:#234">Cambiar foto</button></div></div>',
  '<p class="nv28-note">La recomendación puede no corresponder al producto exacto. Se muestran solo resultados CC0 o de dominio público; la imagen no se guarda hasta que confirmes el alta.</p>',
  '</section>',
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


 /* V28 — fotografías recomendadas de Openverse (CC0 / dominio público).
    Openverse requiere internet. Se selecciona una foto y se convierte localmente
    a JPEG comprimido antes de usar el endpoint V25. Sin imágenes externas persistentes.
    NO modifica permisos de altas ni la política de publicación. */
 const nv28Search=mask.querySelector('#nv28-search');
 const nv28Gallery=mask.querySelector('#nv28-gallery');
 const nv28Camera=mask.querySelector('#nv28-camera');
 const nv28Results=mask.querySelector('#nv28-results');
 const nv28Info=mask.querySelector('#nv28-photo-message');
 const nv28Selected=mask.querySelector('#nv28-selected');
 let nv28Data='',nv28Source='',nv28SearchKey='',nv28Searching=false,nv28Seq=0;
 const nv28Word=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const nv28Stop=new Set(['de','del','la','el','y','con','para','por','pieza','piezas','kg','mm','cm','mt','mts','marca','color','modelo','tipo','un','una','al','los','las']);
 const nv28Translate={codo:'elbow',tubo:'pipe',cemento:'cement',varilla:'rebar',tornillo:'screw',clavo:'nail',manguera:'hose',valvula:'valve',llave:'faucet',pintura:'paint',cable:'wire',ladrillo:'brick',azulejo:'tile',lavabo:'sink',tarja:'sink',martillo:'hammer',pegamento:'glue'};
 const nv28Tokens=s=>nv28Word(s).split(' ').filter(w=>w.length>2&&!nv28Stop.has(w));
 const nv28BrandNames=['cemex','truper','pretul','foset','hermex','volteck','fiero','polimex','calidra','bajaj'];
 function nv28SafeUrl(value){
  try{
   const u=new URL(String(value||''));
   if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||u.hostname.endsWith('.local'))return '';
   if(/^(?:\d+\.){3}\d+$/.test(u.hostname)||u.hostname.includes(':'))return '';
   return u.href;
  }catch{return '';}
 }
 function nv28Notice(s){nv28Info.textContent=String(s||'');}
 function nv28Preview(data,source){
  nv28Data=data;nv28Source=source;
  nv28Selected.hidden=!data;
  const img=nv28Selected.querySelector('img');
  if(data){img.src=data;mask.querySelector('#nv28-selected-source').textContent=source||'Foto lista para guardar';}
  else{img.removeAttribute('src');mask.querySelector('#nv28-selected-source').textContent='';}
 }
 function nv28Reset(){
  ++nv28Seq;nv28Preview('','');nv28Results.replaceChildren();nv28Results.hidden=true;nv28LocalGrid.replaceChildren();nv28Local.hidden=true;
  nv28SearchKey='';nv28Gallery.value='';nv28Camera.value='';
  nv28Notice('Escribe el nombre del producto para recibir recomendaciones.');
 }
 function nv28PhotoScore(photo,rawName){
  const wordlist=nv28Tokens(rawName).filter(w=>!/^\d+$/.test(w));
  const other=nv28Tokens(String(photo.title||'')+' '+(Array.isArray(photo.tags)?photo.tags.map(t=>t.name||'').join(' '):''));
  const syn={flexo:['flexometro','tape','measure','cinta'],flexometro:['flexo','measure','tape','cinta'],
   llavero:['keychain','keyring'],cinta:['tape','measure','flexometro'],candado:['padlock','lock'],
   combinacion:['combination'],lija:['sandpaper'],broca:['drill'],tubo:['pipe'],cemento:['cement'],
   manguera:['hose'],clavo:['nail'],valvula:['valve'],tornillo:['screw'],foco:['light','bulb'],
   lampara:['lamp'],pintura:['paint'],pegamento:['glue'],alambre:['wire'],cable:['wire'],
   llave:['faucet','tap'],codo:['elbow'],martillo:['hammer']};
  let score=0,core=0;
  const brand=new Set(['cemex','truper','pretul','foset','hermex','volteck','fiero','polimex','calidra','master']);
  for(const word of wordlist){
   const variants=[word,nv28Translate[word],...(syn[word]||[])].filter(Boolean);
   const matched=other.some(t=>variants.some(v=>t===v||v.length>=4&&t.startsWith(v)||t.length>=4&&v.startsWith(t)));
   if(matched){score+=brand.has(word)?1:2;if(!brand.has(word))core++;}
  }
  return core?score:0;
 }
 function nv28ChooseFile(input,source){
  const file=input.files?.[0];if(!file)return;
  nv28Results.hidden=true;nv28Local.hidden=true;
  nv28Notice('Preparando fotografía...');
  compress(file).then(photo=>{
   if(!photo)return;
   nv28Preview(photo,source);
   nv28Notice('✓ Fotografía lista. Se guardará junto con el producto.');
  }).catch(e=>nv28Notice('No se pudo preparar la foto: '+e.message));
 }
 mask.querySelector('#nv28-camera-button').addEventListener('click',()=>nv28Camera.click());
 mask.querySelector('#nv28-gallery-button').addEventListener('click',()=>nv28Gallery.click());
 nv28Camera.addEventListener('change',()=>nv28ChooseFile(nv28Camera,'Tomada con la cámara'));
 nv28Gallery.addEventListener('change',()=>nv28ChooseFile(nv28Gallery,'Seleccionada de la galería'));
 mask.querySelector('#nv28-clear').addEventListener('click',()=>{
  nv28Preview('','');nv28Gallery.value='';nv28Camera.value='';
  nv28Notice('Foto descartada; puedes elegir otra o continuar sin foto.');
 });
 async function nv28FromWeb(url){
  const source=nv28SafeUrl(url);if(!source)throw Error('Dirección de imagen no válida');
  const image=new Image();
  image.crossOrigin='anonymous';image.referrerPolicy='no-referrer';
  await new Promise((ok,fail)=>{
   const timer=setTimeout(()=>{image.onload=null;image.onerror=null;fail(Error('La imagen tardó demasiado'))},12000);
   image.onload=()=>{clearTimeout(timer);ok();};
   image.onerror=()=>{clearTimeout(timer);fail(Error('La imagen no permite guardarse desde esta web'))};
   image.src=source;
  });
  const w=image.naturalWidth,h=image.naturalHeight;
  if(!w||!h||w>12000||h>12000||w*h>32000000)throw Error('Imagen demasiado grande o inválida');
  const scale=Math.min(1,430/Math.max(w,h));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('No está disponible el editor de imágenes');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.78,.65,.5,.38,.28]){
   const jpeg=canvas.toDataURL('image/jpeg',quality);
   if(jpeg.length<=70000)return jpeg;
  }
  throw Error('No fue posible comprimir la imagen');
 }
 async function nv28Pick(p){
  if(busy)return;
  const remote=[p.thumbnail,p.url].map(nv28SafeUrl).filter(Boolean);
  if(!remote.length)return nv28Notice('No hay una fotografía válida. Elige cámara o galería.');
  if(p.source==='navarro'&&!confirm('Es una foto de otro artículo: '+p.title+'. ¿Es realmente igual al producto que estás agregando?'))return;
  nv28Notice('Preparando la foto seleccionada...');
  for(const u of remote){
   try{
    const jpeg=await nv28FromWeb(u);
    nv28Preview(jpeg,(p.source==='navarro'?'Catálogo NAVARRO · '+p.code:p.source==='commons'?'Wikimedia Commons':'Openverse')+' · '+String(p.title||'Imagen libre').slice(0,80)+' · '+String(p.license||'').toUpperCase());
    nv28Results.hidden=true;
    nv28Notice('✓ Fotografía recomendada seleccionada. Comprueba que coincida con tu producto antes de guardar.');
    return;
   }catch(_){}
  }
  nv28Notice('La fuente no permite importar esta imagen al iPhone. Prueba otra recomendación o usa Tomar foto / Galería.');
 }
 function nv28RenderPhotos(list,name){
  nv28Results.replaceChildren();nv28Results.hidden=!list.length;
  for(const [i,p] of list.entries()){
   const card=document.createElement('button');card.type='button';card.className='nv28-option';
   const thumb=document.createElement('img');thumb.alt='Posible foto: '+String(p.title||'Producto');
   thumb.loading='lazy';thumb.referrerPolicy='no-referrer';thumb.src=nv28SafeUrl(p.thumbnail)||nv28SafeUrl(p.url);
   card.appendChild(thumb);
   const label=document.createElement('span');
   label.textContent=(i===0?'⭐ Recomendada (comprueba coincidencia) · ':'')+
    String(p.title||'Fotografía sin título').slice(0,75)+' · '+String(p.license||'').toUpperCase();
   card.appendChild(label);card.addEventListener('click',()=>nv28Pick(p));nv28Results.appendChild(card);
  }
 }


 /* Respaldo confiable con fotos publicadas anteriormente por NAVARRO.
    Solo se reutilizan si la caja confirma que representan el mismo producto. */
 const nv28Local=document.createElement('section');
 nv28Local.id='nv28-fotos-similares';nv28Local.hidden=true;
 nv28Local.style.cssText='grid-column:1/-1;margin:10px 0;padding-top:8px;border-top:1px solid #d2e1d8';
 nv28Local.innerHTML='<h4 style="font:800 13px system-ui;margin:4px 0">📦 Fotografías similares de NAVARRO</h4><p class="nv28-note">Son fotos que ya están en nuestro catálogo. Verifica marca, presentación y medida antes de usar una.</p><div id="nv28-local-grid" class="nv28-grid"></div>';
 nv28Results.insertAdjacentElement('afterend',nv28Local);
 const nv28LocalGrid=nv28Local.querySelector('#nv28-local-grid');
 const nv28ExternalLink=document.createElement('a');
 nv28ExternalLink.target='_blank';nv28ExternalLink.rel='noopener noreferrer';
 nv28ExternalLink.href='https://openverse.org/';
 nv28ExternalLink.textContent='Ver más fotografías de uso libre en Openverse';
 nv28ExternalLink.style.cssText='display:block;font:700 12px system-ui;color:#166546;margin:10px 0;text-decoration:underline';
 nv28Local.insertAdjacentElement('afterend',nv28ExternalLink);
 function nv28ExistingPhotos(name){
  const db=Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[];
  const pics=window.NAVARRO_FOTOS_PAGINA||{};
  const featured=new Map((window.NAVARRO_DESTACADOS||[]).map(x=>[String(x.id||''),String(x.img||'')]));
  const out=[],used=new Set();
  for(const row of db){
   if(!Array.isArray(row))continue;
   const code=String(row[0]),productName=String(row[1]||'');
   const image=String(pics[code]||featured.get(code)||'');
   if(!/^[A-Za-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(image)||used.has(image))continue;
   const score=nv28PhotoScore({title:productName},name);
   if(score<2)continue;
   used.add(image);
   const url=new URL('./assets/'+image,location.href);
   if(url.origin!==location.origin)continue;
   out.push({source:'navarro',code,title:productName,url:url.href,thumbnail:url.href,license:'fotografía del catálogo',score});
  }
  out.sort((a,b)=>b.score-a.score);
  return out.slice(0,6);
 }
 function nv28ShowLocal(name){
  const list=nv28ExistingPhotos(name);
  nv28LocalGrid.replaceChildren();nv28Local.hidden=!list.length;
  for(const p of list){
   const card=document.createElement('button');card.type='button';card.className='nv28-option';
   const picture=document.createElement('img');
   picture.src=p.thumbnail;picture.loading='lazy';picture.alt=p.title;
   picture.onerror=()=>card.remove();
   const title=document.createElement('span');
   title.textContent=p.title.slice(0,70)+' · '+p.code+' · Similar';
   card.append(picture,title);card.addEventListener('click',()=>nv28Pick(p));nv28LocalGrid.appendChild(card);
  }
  return list.length;
 }
 function nv28Variants(name){
  const stop=new Set(['de','del','en','por','para','con','marca','grados','metro','pulg','pieza','mod','modelo']);
  const words=nv28Tokens(name).filter(w=>!stop.has(w)&&!/^\d+$/.test(w));
  const generic=words.filter(w=>!nv28BrandNames.includes(w)&&w!=='master');
  const translated=generic.map(w=>nv28Translate[w]||({flexo:'tape measure',flexometro:'tape measure',cinta:'tape',llavero:'keychain',candado:'padlock',combinacion:'combination',lija:'sandpaper',broca:'drill'}[w])||w);
  return [...new Set([String(name).slice(0,75),translated.slice(0,3).join(' '),generic.slice(0,4).join(' ')].filter(q=>q.length>=3))].slice(0,3);
 }
 async function nv28SearchOpenverse(term){
  const query=new URL('https://api.openverse.org/v1/images/');
  query.searchParams.set('q',term);
  query.searchParams.set('license','cc0,pdm');
  query.searchParams.set('page_size','20');
  const r=await fetch(query.href,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(7200)});
  if(!r.ok)throw Error('Openverse: '+r.status);
  const json=await r.json();if(!Array.isArray(json.results))throw Error('Respuesta inválida de Openverse');
  return json.results;
 }

 /* Fuente alternativa cuando Openverse no encuentra resultados o se desconecta.
    Solo se aceptan archivos de Wikimedia Commons marcados CC0/dominio público. */
 async function nv28Commons(name){
  const u=new URL('https://commons.wikimedia.org/w/api.php');
  for(const [k,v] of Object.entries({
   action:'query',format:'json',formatversion:'2',generator:'search',
   gsrsearch:String(name).slice(0,90),gsrnamespace:'6',gsrlimit:'20',
   prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'400',origin:'*'
  }))u.searchParams.set(k,v);
  const res=await fetch(u.href,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(9500)});
  if(!res.ok)throw Error('Wikimedia Commons no respondió');
  const json=await res.json(),pages=Array.isArray(json?.query?.pages)?json.query.pages:[];
  return pages.map(page=>{
   const item=page.imageinfo?.[0];if(!item)return null;
   const file=String(page.title||'').replace(/^File:/i,'');
   if(!/\.(?:jpe?g|png|webp)$/i.test(file))return null;
   const meta=item.extmetadata||{};
   const terms=String(meta.LicenseShortName?.value||meta.UsageTerms?.value||'');
   const license=/\bcc0\b/i.test(terms)?'cc0':
    /\bpublic\s+domain\b|\bPD(?:[-\s]|$)/i.test(terms)?'pdm':'';
   if(!license)return null;
   return {title:file,license,url:item.url,thumbnail:item.thumburl||item.url,tags:[]};
  }).filter(Boolean);
 }
 function nv28Best(list,name){
  return list.filter(p=>p&&['cc0','pdm'].includes(String(p.license||'').toLowerCase())&&
   p.mature!==true&&(nv28SafeUrl(p.thumbnail)||nv28SafeUrl(p.url)))
   .map(p=>({p,score:nv28PhotoScore(p,name)}))
   .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.p);
 }

 async function nv28FindImages(manual){
  const name=form.elements.name.value.trim();
  if(name.length<4){if(manual)nv28Notice('Escribe al menos cuatro letras del producto.');return;}
  const key=nv28Word(name);
  if(nv28Searching&&key===nv28SearchKey)return;
  if(!manual&&key===nv28SearchKey)return;
  nv28SearchKey=key;
  const seq=++nv28Seq;
  nv28Searching=true;
  const localCount=nv28ShowLocal(name);
  nv28ExternalLink.href='https://openverse.org/search/image?q='+encodeURIComponent(name);
  nv28Results.hidden=true;nv28Results.replaceChildren();
  nv28Notice((localCount?'✓ '+localCount+' fotos similares disponibles. ':'')+'Buscando imágenes libres en internet…');
  let found=[],errors=0;
  for(const query of nv28Variants(name).slice(0,3)){
   if(seq!==nv28Seq||mask.hidden)return;
   const attempts=await Promise.allSettled([nv28SearchOpenverse(query),nv28Commons(query)]);
   if(seq!==nv28Seq||mask.hidden)return;
   for(const result of attempts){
    if(result.status==='fulfilled'){
     const matches=nv28Best(result.value,name);
     if(matches.length){found=matches;break;}
    }else{errors++;}
   }
   if(found.length)break;
  }
  if(seq!==nv28Seq||mask.hidden)return;
  if(found.length){
   nv28RenderPhotos(found,name);
   nv28Notice('✓ '+found.length+' fotos libres de internet'+(localCount?' y '+localCount+' similares del catálogo':'')+'. Compara marca y presentación.');
  }else{
   nv28Notice((errors?'No respondió alguna fuente de imágenes. ':'No encontramos fotos de dominio público con ese nombre. ')+
    (localCount?'Puedes elegir una de las fotos similares que aparecen debajo.':
     'Puedes tomar una foto, usar tu galería o consultar el enlace externo.'));
  }
  nv28Searching=false;
  nv28Search.disabled=false;
 }
 nv28Search.addEventListener('click',()=>nv28FindImages(true));
 form.elements.name.addEventListener('blur',()=>{
  if(!mask.hidden&&!nv28Data)nv28FindImages(false);
 });
 form.addEventListener('reset',()=>{
  nv28Reset();
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
   const photo=nv28Data||await compress(form.elements.image.files[0]);
   const result=await request({action:'create',code,name,price,stock,cat,unit,photo});
   window.dispatchEvent(new CustomEvent('navarro:v29:confirmed',{detail:{type:'Alta aceptada por Windows',code,name,after:price}}));
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
 window.NAVARRO_AGREGAR_PRODUCTOS_V25=Object.freeze({version:28,recargar:load});
})();
