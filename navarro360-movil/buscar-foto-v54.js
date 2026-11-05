/* NAVARRO 360 V54: búsqueda por fotografía de producto, IA local, sin subir la imagen.
   Resultados son similitudes visuales, no identificaciones confirmadas.
   El cliente elige antes de ver o añadir. No modifica lector USB, catálogo ni SIFO. */
(function(){
'use strict';
if(window.NAVARRO_BUSCAR_POR_FOTO_V54)return;
window.NAVARRO_BUSCAR_POR_FOTO_V54=true;
const MODEL_URL='https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite';
const WASM_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const MODULE_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm';
const INDEX_URL='./buscar-foto-indice-v54.json.gz?v=54';
const PILOT_INDEX_URL='./buscar-foto-indice-piloto-v54.json.gz?v=54';
const DIM=1024;
let embedderPromise=null,indexPromise=null,dlg=null,chooser=null,previewURL='',busy=false;
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
 return {src:'',backup:''};
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
   }else img.remove();
  };
  img.onload=()=>{fallback.hidden=true};
  img.src=photo.src;
  place.append(img);
 }
 root.append(place);
}
function renderResults(ranked,eligible){
 const host=dlg.querySelector('.nav-visual-results');
 host.replaceChildren();
 if(!ranked.length){
  host.append(el('p','','No se encontraron imágenes comparables. Prueba con otra foto, fondo limpio y buena iluminación.'));
  return;
 }
 const note=el('p','nav-visual-note','Son productos visualmente parecidos, no una identificación exacta. Confirma medida, material, marca y presentación antes de agregarlos.');
 host.append(note);
 const list=el('div','nav-visual-grid');
 for(const [position,hit] of ranked.entries()){
  const item=catalog.get(hit.code);
  if(!item)continue;
  const card=el('article','nav-visual-item');
  showPic(card,hit.code);
  const body=el('div','nav-visual-body');
  body.append(el('span','nav-visual-rank','Opción '+(position+1)));
  body.append(el('strong','nav-visual-product-name',item.name));
  body.append(el('small','nav-visual-code','Código: '+hit.code));
  if(Number.isFinite(item.price)&&item.price>=0){
   body.append(el('div','nav-visual-price',new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(item.price)));
  }
  const actions=el('div','nav-visual-actions');
  const see=el('button','nav-visual-see','Ver producto');
  see.type='button';see.dataset.visualShow=hit.code;actions.append(see);
  if(typeof window.NAVARRO_ESCANER_AGREGAR==='function'){
   const add=el('button','nav-visual-add','+1 al carrito');
   add.type='button';add.dataset.visualAdd=hit.code;actions.append(add);
  }
  body.append(actions);card.append(body);list.append(card);
 }
 host.append(list);
 status('Comparé tu fotografía con '+eligible.toLocaleString('es-MX')+' imágenes del catálogo. Selecciona el producto que corresponda.');
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
  '.nav-visual-note{color:#725c2d;background:#fff8df;border-radius:10px;padding:10px 12px;margin:8px 0 14px;font-size:13px}'
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
  const prev=dlg.querySelector('.nav-visual-query-image');
  prev.src=previewURL;prev.hidden=false;
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
  ].join('\\n');
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
function prepareCanvas(file){
 return new Promise((resolve,reject)=>{
  const src=URL.createObjectURL(file),image=new Image();
  image.onload=()=>{
   try{
    const ratio=Math.min(1,640/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('No se pudo abrir la fotografía');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    URL.revokeObjectURL(src);
    resolve(canvas);
   }catch(e){URL.revokeObjectURL(src);reject(e)}
  };
  image.onerror=()=>{URL.revokeObjectURL(src);reject(Error('No se pudo leer la foto. Prueba usando JPG o PNG.'))};
  image.src=src;
 });
}
async function rankVectors(query,index){
 const {codes,vectors,count}=index;
 const ranked=[];
 const q=query;
 const validCode=c=>catalog.has(c);
 const chunksize=650;
 for(let i=0;i<count;i++){
  const code=codes[i];
  if(!validCode(code))continue;
  const base=i*DIM;
  let dot=0;
  for(let j=0;j<DIM;j++)dot+=q[j]*vectors[base+j];
  // All reference embeddings are l2-normalized, scaled to int8 by 512.
  const score=dot/512;
  if(!Number.isFinite(score))continue;
  const h={code,score};
  if(ranked.length<14){ranked.push(h);ranked.sort((a,b)=>b.score-a.score);}
  else if(score>ranked[ranked.length-1].score){ranked.pop();ranked.push(h);ranked.sort((a,b)=>b.score-a.score);}
  if(i>0&&i%chunksize===0){
   if(i%3900===0)status('Comparando productos ('+Math.round(i/count*100)+' %)...');
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 return ranked.slice(0,10);
}
async function searchPhoto(file){
 if(busy){status('Finalizando el análisis anterior...');return}
 busy=true;
 try{
  status('Cargando inteligencia visual y referencias del catálogo...');
  const canvas=await prepareCanvas(file);
  const [model,index]=await Promise.all([loadEmbedder(),loadIndex()]);
  status('Analizando la forma y apariencia del producto...');
  await new Promise(r=>setTimeout(r,30));
  const embedding=model.embed(canvas).embeddings[0]?.floatEmbedding;
  if(!embedding||embedding.length!==DIM)throw Error('El modelo no pudo interpretar esta fotografía.');
  status('Buscando artículos visualmente parecidos...');
  const results=await rankVectors(embedding,index);
  renderResults(results,index.count);
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
