/* NAVARRO 360 V56: búsqueda por fotografía de producto, IA local, sin subir la imagen.
   Resultados son similitudes visuales, no identificaciones confirmadas.
   El cliente elige antes de ver o añadir. No modifica lector USB, catálogo ni SIFO. */
(function(){
'use strict';
if(window.NAVARRO_BUSCAR_POR_FOTO_V54)return;
window.NAVARRO_BUSCAR_POR_FOTO_V54=true;
// El modelo y WebAssembly están en NAVARRO 360; la foto no sale del dispositivo.
const MODEL_URL=new URL('./vendor/mediapipe/mobilenet_v3_small.tflite',location.href).href;
const WASM_URL=new URL('./vendor/mediapipe/wasm',location.href).href;
const MODULE_URL=new URL('./vendor/mediapipe/vision_bundle.mjs',location.href).href;
const INDEX_URL='./buscar-foto-indice-v55.json.gz?v=55';
const V54_INDEX_URL='./buscar-foto-indice-v54.json.gz?v=54';
const PILOT_INDEX_URL='./buscar-foto-indice-piloto-v54.json.gz?v=54';
const DIM=1024;
let embedderPromise=null,indexPromise=null,dlg=null,chooser=null,previewURL='',busy=false;
let selectedFile=null,cropRect=null;
const catalog=new Map((Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[]).map(p=>[String(p[0]),{name:String(p[1]),price:Number(p[2])}]));
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!=null)node.textContent=text;
 return node;
}
function status(message){
 const node=dlg&&dlg.querySelector('.nav-visual-status');
 if(node)node.textContent=message;
}
function atlasPhoto(code){
 const atlas=window.NAVARRO_ATLAS;
 const filename=window.NAVARRO_FOTOS_PLOMERIA_V47?.[code]||atlas?.byCode?.[code];
 const index=atlas?.files?.[filename];
 return Number.isInteger(index)?{atlas,index}:null;
}
function imageFor(code){
 const truper=window.NAVARRO_FOTOS_TRUPER_V48?.[code];
 if(Array.isArray(truper)&&truper[0]){
  return {
   src:'https://www.truper.com/media/import/imagenes/'+encodeURIComponent(truper[0])+'.jpg',
   backup:String(truper[1]||'')
  };
 }
 const file=window.NAVARRO_FOTOS_PAGINA?.[code];
 if(typeof file==='string'&&file){
  if(/^https:\/\//.test(file))return {src:file,backup:''};
  if(/^navarro-publicada-\d+\.jpg$/.test(file))return {src:'./assets/'+file,backup:''};
 }
 return {src:'',backup:'',sprite:atlasPhoto(code)};
}
function showPic(root,code){
 const photo=imageFor(code);
 const place=el('div','nav-visual-photo');
 const fallback=el('span','nav-visual-placeholder','📦');
 place.append(fallback);
 if(photo.src){
  const img=el('img','');
  img.loading='lazy';img.decoding='async';img.alt='Fotografía de referencia';
  img.onerror=()=>{
   if(photo.backup&&img.dataset.retry!=='1'){
    img.dataset.retry='1';img.src=photo.backup;
   }else{
    img.remove();
    const sprite=atlasPhoto(code);
    if(sprite)showAtlasSprite(place,sprite,fallback);
   }
  };
  img.onload=()=>{fallback.hidden=true};
  img.src=photo.src;
  place.append(img);
 }
 if(!photo.src&&photo.sprite)showAtlasSprite(place,photo.sprite,fallback);
 root.append(place);
}
function showAtlasSprite(place,source,fallback){
 if(place.querySelector('.nav-visual-sprite'))return;
 const {atlas,index}=source;
 const sprite=el('span','product-sprite nav-visual-sprite');
 sprite.setAttribute('role','img');sprite.setAttribute('aria-label','Fotografía del catálogo');
 sprite.style.backgroundPosition='-'+(index%atlas.columns*atlas.size)+'px -'+(Math.floor(index/atlas.columns)*atlas.size)+'px';
 sprite.style.backgroundSize=(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px';
 place.append(sprite);if(fallback)fallback.hidden=true;
}
const FAMILY_IGNORE=new Set(['TRUPER','PRETUL','VOLTECK','HERMEX','FIERO','FOSET','KLINTEK','EXPERT','ULTRACRAFT','MARCA','TIPO','DE','DEL','LA','EL','LAS','LOS','PARA','CON','POR','JUEGO','SET','KIT','PAQUETE','PACK','BOLSA','CAJA','BLISTER','SOBRE','PIEZA','PZ','PZS']);
const FAMILY_MATERIAL=['CPVC','PVC','PPR','POLIMEX','GALVANIZADO','HIDRAULICO','COBRE','ALUMINIO','INOXIDABLE','ACERO','MADERA','CERAMICA','CONCRETO'];
function familyOf(name){
 const text=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const words=(text.match(/[A-Z0-9]+/g)||[]).filter(x=>x.length>1&&!FAMILY_IGNORE.has(x));
 const root=words[0]||'PRODUCTO';
 const material=FAMILY_MATERIAL.find(m=>words.includes(m))||'';
 let detail='';
 if(root==='CODO'){
  detail=words.includes('OREJA')?'OREJA':words.includes('NIPLE')?'NIPLE':words.includes('45')?'45°':words.includes('90')?'90°':'';
 }else if(root==='REDUCCION'){
  detail=words.includes('BUSHING')?'BUSHING':words.includes('CAMPANA')?'CAMPANA':'';
 }else if(root==='CABLE'){
  detail=words.includes('DUPLEX')?'DÚPLEX':words.includes('TRIPLEX')?'TRÍPLEX':words.includes('POLOS')?'POLOS':'';
 }else if(root==='LIJA'){
  detail=words.includes('AGUA')?'AGUA':words.includes('MADERA')?'MADERA':'';
 }else if(root==='TAPON'){
  detail=words.includes('HEMBRA')?'HEMBRA':words.includes('MACHO')?'MACHO':'';
 }else if(root==='TUBO'&&words.includes('CONDUIT'))detail='CONDUIT';
 else if(root==='BROCA'){
  detail=words.includes('CONCRETO')?'CONCRETO':words.includes('METAL')?'METAL':'';
 }
 const key=[root,detail,material].filter(Boolean).join('|');
 const label=[root,detail,material].filter(Boolean).join(' ').toLowerCase();
 return {key,label:label.charAt(0).toUpperCase()+label.slice(1)};
}
function groupCandidates(ranked){
 const top=ranked[0]?.score||0;
 const pool=ranked.slice(0,85).filter(hit=>hit.exact||hit.score>=Math.max(.22,top-.2));
 const groups=new Map();
 for(const hit of pool){
  const product=catalog.get(hit.code);
  if(!product)continue;
  const family=familyOf(product.name);
  if(!groups.has(family.key))groups.set(family.key,{family,items:[],score:0,exact:false});
  const g=groups.get(family.key);
  g.items.push(hit);
  g.exact ||= !!hit.exact;
 }
 for(const g of groups.values()){
  g.items.sort((a,b)=>(b.exact?1:0)-(a.exact?1:0)||b.score-a.score);
  const best=g.items[0].score;
  const supporting=g.items.filter(i=>i.score>=top-.08).length;
  g.score=g.exact?2:best+.014*Math.min(3,Math.log2(1+supporting));
 }
 return [...groups.values()].sort((a,b)=>b.score-a.score);
}
function renderResults(ranked,eligible,exactSku){
 const host=dlg.querySelector('.nav-visual-results');
 host.replaceChildren();
 if(!ranked.length){
  host.append(el('p','','No encontré una coincidencia visual clara. Acerca el producto, recorta la imagen y vuelve a intentar.'));
  return;
 }
 const note=el('p','nav-visual-note',
  'Las fotos no siempre permiten distinguir tamaños o modelos. Agrupé las piezas por tipo: abre «Ver variantes» para comparar medidas. Los resultados son orientativos, no identificaciones confirmadas.');
 host.append(note);
 const groups=groupCandidates(ranked);
 if(!groups.length){
  host.append(el('p','','No encontré productos compatibles con la imagen. Puedes marcar solo el artículo con el dedo y volver a buscar.'));
  status('No hay coincidencias visuales suficientes. Prueba recortar el producto o tomar otra foto.');
  return;
 }
 const list=el('div','nav-visual-group-list');
 function makeCard(hit,number){
  const product=catalog.get(hit.code);
  const card=el('article','nav-visual-item');
  showPic(card,hit.code);
  const body=el('div','nav-visual-body');
  body.append(el('span','nav-visual-rank',hit.exact?'✓ Código reconocido en la foto':number?'Coincidencia visual '+number:'Variante parecida'));
  body.append(el('strong','nav-visual-product-name',product.name));
  body.append(el('small','nav-visual-code','Código: '+hit.code));
  if(Number.isFinite(product.price)&&product.price>=0)
   body.append(el('div','nav-visual-price',new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(product.price)));
  const actions=el('div','nav-visual-actions');
  const see=el('button','nav-visual-see','Ver producto');
  see.type='button';see.dataset.visualShow=hit.code;actions.append(see);
  if(typeof window.NAVARRO_ESCANER_AGREGAR==='function'){
   const add=el('button','nav-visual-add','+1 al carrito');
   add.type='button';add.dataset.visualAdd=hit.code;actions.append(add);
  }
  body.append(actions);card.append(body);
  return card;
 }
 groups.forEach((group,i)=>{
  const section=el('section','nav-visual-family');
  const heading=el('div','nav-visual-family-heading');
  heading.append(el('strong','',group.family.label));
  heading.append(el('span','nav-visual-family-count',group.items.length===1?'1 coincidencia':group.items.length+' variantes'));
  section.append(heading);
  section.append(makeCard(group.items[0],i+1));
  if(group.items.length>1){
   const toggle=el('button','nav-visual-variants','Ver variantes y medidas ('+(group.items.length-1)+')');
   toggle.type='button';
   const more=el('div','nav-visual-variant-list');more.hidden=true;
   let shown=0;
   const batch=()=>{
    for(const hit of group.items.slice(shown,shown+20))more.append(makeCard(hit));
    shown=Math.min(group.items.length,shown+20);
    if(shown<group.items.length){
     const remaining=el('button','nav-visual-variants','Mostrar otras '+(group.items.length-shown)+' variantes');
     remaining.type='button';remaining.onclick=()=>{remaining.remove();batch()};more.append(remaining);
    }
   };
   toggle.onclick=()=>{
    more.hidden=!more.hidden;
    if(!more.hidden&&more.childElementCount===0){shown=1;batch()}
    toggle.textContent=more.hidden?'Ver variantes y medidas ('+(group.items.length-1)+')':'Ocultar variantes';
   };
   section.append(toggle,more);
  }
  if(i>=5)section.hidden=true;
  list.append(section);
 });
 host.append(list);
 if(groups.length>5){
  const moreGroups=el('button','nav-visual-more','No veo mi producto · Ver otras '+(groups.length-5)+' familias');
  moreGroups.type='button';
  let expanded=false;
  moreGroups.onclick=()=>{
   expanded=!expanded;
   for(const group of [...list.children].slice(5))group.hidden=!expanded;
   moreGroups.textContent=expanded?'Ocultar otras familias':'No veo mi producto · Ver otras '+(groups.length-5)+' familias';
  };
  host.append(moreGroups);
 }
 status((exactSku?'✓ Se reconoció un código de barras. ':'')+
  'Comparé la foto con '+eligible.toLocaleString('es-MX')+' imágenes. Encontré '+groups.length+' tipos de productos visualmente parecidos. Revisa las variantes antes de elegir.');
}

function getSearch(){
 return document.getElementById('search')||document.getElementById('search-mobile');
}
function showProduct(code){
 if(!catalog.has(code))return;
 const target=document.getElementById('search'),mobile=document.getElementById('search-mobile');
 for(const input of [target,mobile]){
  if(!input)continue;
  input.value=code;
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 closeDialog();
 const catalogSection=document.getElementById('catalogo')||target;
 catalogSection?.scrollIntoView({behavior:'smooth',block:'start'});
 try{target?.focus({preventScroll:true})}catch(_){}
}
function addToCart(code,button){
 if(!catalog.has(code)||typeof window.NAVARRO_ESCANER_AGREGAR!=='function')return;
 let response;
 try{response=window.NAVARRO_ESCANER_AGREGAR(code)}catch(e){response={ok:false,reason:String(e.message||e)}}
 if(response&&response.ok){
  button.textContent='✓ Agregado';
  status('✓ Agregado al carrito: '+catalog.get(code).name+'. Puedes elegir otro producto o cerrar.');
  setTimeout(()=>{if(button.isConnected)button.textContent='+1 al carrito'},800);
 }else status('No se pudo confirmar el carrito: '+String(response?.reason||'revisa tu pedido antes de repetir.'));
}
function closeDialog(){
 if(dlg?.open)dlg.close();
 if(previewURL){URL.revokeObjectURL(previewURL);previewURL=''}
}
function ensureUI(){
 if(dlg)return;
 const style=el('style');
 style.textContent=[
  '.nav-visual-trigger{display:inline-flex!important;align-items:center;justify-content:center;visibility:visible!important;flex:none;border:1px solid #b8ccda;background:#fff;border-radius:11px;padding:4px 8px;color:#154f78;font-size:20px;min-width:38px;min-height:38px;cursor:pointer;position:relative;z-index:2}',
  '.nav-visual-trigger:focus-visible,.nav-visual-add:focus-visible,.nav-visual-see:focus-visible{outline:3px solid #528bc8;outline-offset:1px}',
  '.nav-visual-dialog{border:0;border-radius:17px;box-shadow:0 25px 90px #0a23346b;background:#fff;color:#192a3b;width:min(94vw,850px);max-height:92dvh;max-height:92vh;padding:0;overflow:auto}',
  '.nav-visual-dialog::backdrop{background:#102338ae}',
  '.nav-visual-dialog header{display:flex;align-items:center;justify-content:space-between;gap:14px;position:sticky;top:0;background:white;z-index:3;border-bottom:1px solid #e1e9f2;padding:15px 17px}',
  '.nav-visual-dialog h3{margin:0;font-size:19px;color:#173758}',
  '.nav-visual-close{border:1px solid #dae3e9;background:white;border-radius:9px;width:38px;height:38px;font-size:24px;cursor:pointer}',
  '.nav-visual-content{padding:14px 17px 22px}',
  '.nav-visual-query{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:12px}',
  '.nav-visual-query img{width:90px;height:90px;border:1px solid #d8e3ef;border-radius:10px;object-fit:contain;background:#fff}',
  '.nav-visual-new{border:1px solid #c1d2e5;border-radius:10px;color:#174969;background:#f6fbff;padding:9px 12px;cursor:pointer;font-weight:700}',
  '.nav-visual-croparea{margin:8px 0 12px;padding:10px;border:1px solid #dce7f3;border-radius:13px;background:#f9fcff}',
  '.nav-visual-crophelp{font-size:12px;color:#365a76;margin:2px 0 9px;line-height:1.4}',
  '.nav-visual-cropstage{position:relative;display:inline-block;max-width:100%;touch-action:none;line-height:0;cursor:crosshair}',
  '.nav-visual-cropstage img{display:block;max-width:100%;max-height:250px;width:auto;height:auto;object-fit:contain;user-select:none;pointer-events:none}',
  '.nav-visual-cropselect{position:absolute;border:2px dashed #facc15;background:#2563eb33;pointer-events:none;box-sizing:border-box}',
  '.nav-visual-cropactions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}',
  '.nav-visual-cropactions button{border:1px solid #aac4e6;border-radius:9px;background:#fff;color:#16466d;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer}',
  '.nav-visual-cropactions button:disabled{opacity:.45;cursor:default}',
  '.nav-visual-sprite{position:absolute;left:0;top:0;width:128px!important;height:128px!important;max-width:none!important;transform:scale(.5625);transform-origin:top left}',
  '.nav-visual-status{font-size:14px;color:#395570;min-height:20px;margin:7px 0 13px}',
  '.nav-visual-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:11px}',
  '.nav-visual-item{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #e1e7ef;border-radius:12px;padding:10px;min-width:0}',
  '.nav-visual-photo{width:72px;height:76px;flex:0 0 72px;display:grid;place-items:center;position:relative;border:1px solid #e3e9ef;background:#fbfcfd;border-radius:8px;overflow:hidden}',
  '.nav-visual-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:white}',
  '.nav-visual-placeholder{font-size:32px}',
  '.nav-visual-body{min-width:0;display:flex;flex-direction:column;gap:4px;flex:1;font-size:13px;overflow-wrap:anywhere}',
  '.nav-visual-rank{color:#49799a;font-size:11px;font-weight:700}',
  '.nav-visual-product-name{color:#193551;line-height:1.3}',
  '.nav-visual-code{color:#556b7d}',
  '.nav-visual-price{font-weight:800;font-size:14px}',
  '.nav-visual-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}',
  '.nav-visual-see,.nav-visual-add{border:1px solid #1772a9;border-radius:8px;background:#fff;color:#135c83;padding:7px 9px;font-size:12px;font-weight:700;cursor:pointer}',
  '.nav-visual-add{background:#176b96;color:#fff}',
  '.nav-visual-note{color:#725c2d;background:#fff8df;border-radius:10px;padding:10px 12px;margin:8px 0 14px;font-size:13px}',
  '.nav-visual-group-list{display:grid;gap:12px}',
  '.nav-visual-family{border:1px solid #d8e6ef;background:#f8fbff;border-radius:13px;padding:10px;min-width:0}',
  '.nav-visual-family[hidden],.nav-visual-variant-list[hidden]{display:none!important}',
  '.nav-visual-family-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 1px 9px;color:#17375c;font-size:14px}',
  '.nav-visual-family-count{font-size:12px;color:#54738e;white-space:nowrap}',
  '.nav-visual-family .nav-visual-item{background:white}',
  '.nav-visual-variants,.nav-visual-more{border:1px solid #b2cbe1;border-radius:9px;background:#fff;color:#174b72;padding:9px 11px;margin-top:8px;font-weight:700;font-size:13px;cursor:pointer}',
  '.nav-visual-more{width:100%;background:#f8fbff;margin-top:14px}',
  '.nav-visual-variant-list{display:grid;gap:7px;margin-top:9px;padding-left:10px;border-left:3px solid #cbddec}'
 ].join('\n');
 document.head.append(style);
 dlg=el('dialog','nav-visual-dialog');
 const header=el('header');
 header.append(el('h3','','📷 Buscar producto por foto'));
 const close=el('button','nav-visual-close','×');close.type='button';close.setAttribute('aria-label','Cerrar búsqueda visual');close.onclick=closeDialog;header.append(close);
 dlg.append(header);
 const container=el('div','nav-visual-content');
 const row=el('div','nav-visual-query');
 const thumb=el('img','');thumb.className='nav-visual-query-image';thumb.alt='Fotografía que quieres buscar';thumb.hidden=true;row.append(thumb);
 const change=el('button','nav-visual-new','📷 Tomar otra foto');change.type='button';change.onclick=()=>chooser.click();row.append(change);
 container.append(row);
 const cropArea=el('div','nav-visual-croparea');
 cropArea.hidden=true;
 cropArea.append(el('p','nav-visual-crophelp','Si la foto tiene fondo, varias piezas o el producto sale pequeño, marca el artículo con el dedo o el mouse y busca solo esa parte.'));
 const stage=el('div','nav-visual-cropstage');
 const cropImg=el('img','nav-visual-crop-image');
 cropImg.draggable=false;cropImg.alt='Marca el producto que quieres identificar';
 const selection=el('div','nav-visual-cropselect');selection.hidden=true;
 stage.append(cropImg,selection);
 cropArea.append(stage);
 const actions=el('div','nav-visual-cropactions');
 const cropButton=el('button','','🔎 Buscar solo el recorte');
 cropButton.type='button';cropButton.disabled=true;
 cropButton.onclick=()=>{if(selectedFile&&cropRect)searchPhoto(selectedFile,cropRect)};
 const fullButton=el('button','','Ver imagen completa');
 fullButton.type='button';
 fullButton.onclick=()=>{cropRect=null;selection.hidden=true;cropButton.disabled=true;if(selectedFile)searchPhoto(selectedFile)};
 actions.append(cropButton,fullButton);cropArea.append(actions);container.append(cropArea);
 let origin=null;
 const clamp=(v)=>Math.min(1,Math.max(0,v));
 const pointerPos=e=>{const r=stage.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width),y:clamp((e.clientY-r.top)/r.height)}};
 const paint=(a,b)=>{selection.hidden=false;selection.style.left=(Math.min(a.x,b.x)*100)+'%';selection.style.top=(Math.min(a.y,b.y)*100)+'%';selection.style.width=(Math.abs(b.x-a.x)*100)+'%';selection.style.height=(Math.abs(b.y-a.y)*100)+'%'};
 stage.addEventListener('pointerdown',e=>{if(busy||!selectedFile)return;origin=pointerPos(e);try{stage.setPointerCapture(e.pointerId)}catch(_){}paint(origin,origin);e.preventDefault()});
 stage.addEventListener('pointermove',e=>{if(!origin)return;paint(origin,pointerPos(e));e.preventDefault()});
 const finishCrop=e=>{if(!origin)return;const b=pointerPos(e),a=origin;origin=null;
  const rect={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};
  if(rect.w<.08||rect.h<.08){cropRect=null;selection.hidden=true;cropButton.disabled=true;return}
  cropRect=rect;cropButton.disabled=false;paint(a,b);status('Recorte marcado. Pulsa «Buscar solo el recorte» para comparar esta pieza.');e.preventDefault();
 };
 stage.addEventListener('pointerup',finishCrop);
 stage.addEventListener('pointercancel',()=>{origin=null});
 const message=el('p','nav-visual-status','Elige un producto para buscarlo visualmente.');
 message.setAttribute('role','status');message.setAttribute('aria-live','polite');container.append(message);
 const results=el('div','nav-visual-results');
 container.append(results);dlg.append(container);
 dlg.addEventListener('click',event=>{
  const button=event.target.closest('button[data-visual-show],button[data-visual-add]');
  if(!button)return;
  if(button.dataset.visualShow)showProduct(button.dataset.visualShow);
  else if(button.dataset.visualAdd)addToCart(button.dataset.visualAdd,button);
 });
 dlg.addEventListener('close',()=>{if(previewURL){URL.revokeObjectURL(previewURL);previewURL=''}});
 document.body.append(dlg);
 chooser=el('input');chooser.type='file';chooser.accept='image/*';chooser.hidden=true;chooser.setAttribute('aria-label','Tomar foto o elegir de la galería');
 document.body.append(chooser);
 chooser.addEventListener('change',async()=>{
  const file=chooser.files?.[0];chooser.value='';
  if(!file)return;
  if(!file.type.startsWith('image/')&& !/\.(?:heic|heif|jpe?g|png|webp)$/i.test(file.name)){
   alert('Selecciona una fotografía.');return;
  }
  if(file.size>22*1024*1024){alert('La fotografía es muy grande. Usa una imagen menor de 22 MB.');return;}
  if(!dlg.open)dlg.showModal();
  if(previewURL)URL.revokeObjectURL(previewURL);
  previewURL=URL.createObjectURL(file);
  selectedFile=file;cropRect=null;
  const prev=dlg.querySelector('.nav-visual-query-image');
  prev.src=previewURL;prev.hidden=false;
  const area=dlg.querySelector('.nav-visual-croparea');
  area.hidden=false;area.querySelector('.nav-visual-crop-image').src=previewURL;
  area.querySelector('.nav-visual-cropselect').hidden=true;
  area.querySelector('.nav-visual-cropactions button').disabled=true;
  dlg.querySelector('.nav-visual-results').replaceChildren();
  await searchPhoto(file);
 });
}
function installButtons(){
 // El lector de barras usa un botón absoluto a la derecha del buscador.
 // Reservar DOS espacios independientes dentro de la barra: foto a la izquierda,
 // escáner a la derecha. Nunca usar el botón de foto como elemento flex adicional.
 if(!document.getElementById('nav-visual-search-layout-v541')){
  const layout=el('style');layout.id='nav-visual-search-layout-v541';
  layout.textContent=[
   '.mobile-search-wrap,.search-wrap{position:relative;min-width:0}',
   '.mobile-search-wrap>.nav-visual-trigger,.search-wrap>.nav-visual-trigger{position:absolute;right:57px;top:50%;transform:translateY(-50%);z-index:9;display:flex;align-items:center;justify-content:center;width:44px;height:44px;min-width:44px;min-height:44px;margin:0;padding:0;border:1px solid #d9bd79;border-radius:12px;background:#fff9e9;color:#11365b;font-size:23px;line-height:1;box-shadow:0 2px 6px #0a204426;flex:none;touch-action:manipulation}',
   '.mobile-search-wrap>.nav-scan-launch,.search-wrap>.nav-scan-launch{right:5px}',
   '.mobile-search-wrap>#search-mobile,.search-wrap>#search{min-width:0;padding-right:119px!important;box-sizing:border-box}',
   '@media(max-width:360px){.mobile-search-wrap>.nav-visual-trigger{right:55px}.mobile-search-wrap>#search-mobile{padding-right:113px!important}}'
  ].join('');
  document.head.append(layout);
 }
 for(const node of [document.getElementById('search'),document.getElementById('search-mobile')]){
  if(!node||!node.parentElement||node.parentElement.querySelector('.nav-visual-trigger'))continue;
  const button=el('button','nav-visual-trigger','🖼️');
  button.type='button';button.title='Buscar producto mediante una fotografía';
  button.setAttribute('aria-label','Tomar o elegir fotografía para buscar productos parecidos');
  button.onclick=()=>{ensureUI();chooser.click()};
  node.parentElement.append(button);
 }
}
async function loadEmbedder(){
 if(!embedderPromise){
  embedderPromise=(async()=>{
   const lib=await import(MODULE_URL);
   const files=await lib.FilesetResolver.forVisionTasks(WASM_URL);
   return await lib.ImageEmbedder.createFromOptions(files,{
    baseOptions:{modelAssetPath:MODEL_URL},
    runningMode:'IMAGE',l2Normalize:true,quantize:false
   });
  })().catch(e=>{embedderPromise=null;throw e});
 }
 return embedderPromise;
}
async function loadIndex(){
 if(!indexPromise){
  indexPromise=(async()=>{
   let response=await fetch(INDEX_URL,{cache:'force-cache'});
   if(!response.ok)response=await fetch(V54_INDEX_URL,{cache:'force-cache'});
   if(!response.ok)response=await fetch(PILOT_INDEX_URL,{cache:'force-cache'});
   if(!response.ok)throw Error('No se encontró el índice de fotografías del catálogo (HTTP '+response.status+')');
   let bytes=new Uint8Array(await response.arrayBuffer());
   if(bytes[0]===31&&bytes[1]===139){
    if(typeof DecompressionStream!=='function')throw Error('Tu navegador no puede abrir el índice comprimido. Actualiza Safari o Chrome.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text=await new Response(stream).text();
    bytes=null;
    return decodeIndex(JSON.parse(text));
   }
   return decodeIndex(JSON.parse(new TextDecoder().decode(bytes)));
  })().catch(e=>{indexPromise=null;throw e});
 }
 return indexPromise;
}
function decodeIndex(payload){
 if(payload.version!==54||payload.dim!==DIM||!Array.isArray(payload.codes)||typeof payload.vectors!=='string')throw Error('Índice fotográfico incompatible');
 const binary=atob(payload.vectors);
 if(binary.length!==payload.codes.length*DIM)throw Error('Índice fotográfico incompleto');
 const vectors=new Int8Array(binary.length);
 for(let i=0;i<binary.length;i++){
  const b=binary.charCodeAt(i);
  vectors[i]=b>127?b-256:b;
 }
 return {codes:payload.codes,vectors,count:payload.codes.length};
}
function prepareCanvas(file,region=null){
 return new Promise((resolve,reject)=>{
  const src=URL.createObjectURL(file),image=new Image();
  image.onload=()=>{
   try{
    const left=region?Math.round(region.x*image.naturalWidth):0;
    const top=region?Math.round(region.y*image.naturalHeight):0;
    const width=region?Math.max(2,Math.round(region.w*image.naturalWidth)):image.naturalWidth;
    const height=region?Math.max(2,Math.round(region.h*image.naturalHeight)):image.naturalHeight;
    const ratio=Math.min(1,640/Math.max(width,height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*ratio));
    canvas.height=Math.max(1,Math.round(height*ratio));
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('No se pudo abrir la fotografía');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,left,top,width,height,0,0,canvas.width,canvas.height);
    URL.revokeObjectURL(src);
    resolve(canvas);
   }catch(e){URL.revokeObjectURL(src);reject(e)}
  };
  image.onerror=()=>{URL.revokeObjectURL(src);reject(Error('No se pudo leer la foto. Prueba usando JPG o PNG.'))};
  image.src=src;
 });
}
function centerCrop(canvas,amount=.74){
 if(canvas.width<75||canvas.height<75)return null;
 const w=canvas.width,h=canvas.height;
 const crop=document.createElement('canvas');
 crop.width=Math.max(1,Math.round(w*amount));
 crop.height=Math.max(1,Math.round(h*amount));
 const ctx=crop.getContext('2d');
 if(!ctx)return null;
 ctx.drawImage(canvas,Math.round((w-crop.width)/2),Math.round((h-crop.height)/2),crop.width,crop.height,0,0,crop.width,crop.height);
 return crop;
}
async function rankVectors(query,index,focusedQuery=null){
 const {codes,vectors,count}=index,ranked=[];
 const topLimit=140;
 for(let i=0;i<count;i++){
  const code=codes[i];
  if(!catalog.has(code))continue;
  const base=i*DIM;
  let dotFull=0,dotFocus=0;
  if(focusedQuery){
   for(let j=0;j<DIM;j++){
    const r=vectors[base+j];
    dotFull+=query[j]*r;dotFocus+=focusedQuery[j]*r;
   }
  }else{
   for(let j=0;j<DIM;j++)dotFull+=query[j]*vectors[base+j];
  }
  const full=dotFull/512,focus=focusedQuery?dotFocus/512:-1;
  const score=Math.max(full,focus-.03);
  if(!Number.isFinite(score))continue;
  if(ranked.length>=topLimit&&score<=ranked[ranked.length-1].score)continue;
  const hit={code,score,full,focus};
  ranked.push(hit);
  ranked.sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code));
  if(ranked.length>topLimit)ranked.pop();
  if(i>0&&i%500===0){
   if(i%4000===0)status('Buscando coincidencias por producto ('+Math.round(i/count*100)+' %)...');
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 return ranked;
}

async function detectExactCode(canvas){
 if(typeof window.BarcodeDetector!=='function')return null;
 try{
  const d=new window.BarcodeDetector({formats:['ean_13','ean_8','upc_a','code_128']});
  const found=await d.detect(canvas);
  for(const item of found){
   const code=String(item.rawValue||'').replace(/[^0-9]/g,'');
   if(catalog.has(code))return code;
   if(code.length===13&&code[0]==='0'&&catalog.has(code.slice(1)))return code.slice(1);
   if(code.length===12&&catalog.has('0'+code))return '0'+code;
  }
 }catch(e){console.debug('Detección de código en fotografía no disponible',e)}
 return null;
}
async function searchPhoto(file,region=null){
 if(busy){status('Finalizando el análisis anterior...');return}
 busy=true;
 try{
  status('Cargando inteligencia visual y referencias del catálogo...');
  const canvas=await prepareCanvas(file,region);
  const exactSku=await detectExactCode(canvas);
  const [model,index]=await Promise.all([loadEmbedder(),loadIndex()]);
  status('Analizando la forma y apariencia del producto...');
  await new Promise(r=>setTimeout(r,30));
  const embedding=model.embed(canvas).embeddings[0]?.floatEmbedding;
  if(!embedding||embedding.length!==DIM)throw Error('El modelo no pudo interpretar esta fotografía.');
  // Una foto de mostrador o tomada de lejos puede contener mucho fondo;
  // comparar además el centro mejora las sugerencias sin descartar la foto completa.
  let focusEmbedding=null;
  const focusedCanvas=centerCrop(canvas,.74);
  if(focusedCanvas){
   try{focusEmbedding=model.embed(focusedCanvas).embeddings[0]?.floatEmbedding||null}catch(_){}
  }
  status('Comparando producto completo y zona central...');
  const results=await rankVectors(embedding,index,focusEmbedding);
  if(exactSku){
   const j=results.findIndex(r=>r.code===exactSku);
   if(j>=0)results.splice(j,1);
   results.unshift({code:exactSku,score:1,exact:true});
   results.length=Math.min(140,results.length);
  }
  renderResults(results,index.count,exactSku);
 }catch(error){
  console.error('NAVARRO 360 búsqueda visual:',error);
  status('No se pudo completar la búsqueda por foto: '+String(error?.message||error)+'. Comprueba tu conexión y vuelve a intentarlo.');
 }finally{busy=false}
}
function init(){
 installButtons();
 // La foto se elige desde la barra. No interferir con el teclado ni lector USB.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
