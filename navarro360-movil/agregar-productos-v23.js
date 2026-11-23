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
   if(res.status===404)throw Error('El módulo PRODUCTOS V23 todavía no está activo en Windows. Instálalo y reinicia el puente.');
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
  '<p>Solo para las cuatro cajas. No se modifica ningún producto anterior. Las altas se comparten en Windows; para aparecer en la página pública o en SIFO necesitan publicación o registro adicional.</p>',
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
 const status=message=>{state.textContent=message||'';};
 function visible(){button.hidden=!pair();}
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
  if(!confirm('Agregar '+name+' · Código '+code+' · $'+price.toFixed(2)+'\n\nSe compartirá en las cuatro cajas, pero no se publicará todavía a clientes ni se dará de alta automáticamente en SIFO.'))return;
  busy=true;save.disabled=true;status('Guardando en Windows…');
  try{
   const photo=await compress(form.elements.image.files[0]);
   const result=await request({action:'create',code,name,price,stock,cat,unit,photo});
   window.NAVARRO_NUEVOS_PRODUCTOS_V23?.apply([result.product]);
   mask.hidden=true;form.reset();
   const search=document.getElementById('search');
   if(search){search.value=code;search.dispatchEvent(new Event('input',{bubbles:true}));}
   load().catch(()=>{});
  }catch(error){status(error.message||'No se pudo guardar el producto.');}
  finally{busy=false;save.disabled=false;}
 });
 visible();window.addEventListener('pageshow',visible);
 setTimeout(()=>{visible();load();},3500);
 setInterval(()=>{if(!document.hidden){visible();load();}},30000);
 window.NAVARRO_AGREGAR_PRODUCTOS_V23=Object.freeze({version:23,recargar:load});
})();
