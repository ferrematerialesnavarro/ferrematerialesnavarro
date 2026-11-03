/* NAVARRO 360 • TORNILLERÍA Y FIJACIONES V1
 * Solo SKU preferentes verificados en el catálogo de 17,835 (03/nov/2026).
 * No cambia catálogo, buscador, carrito, SIFO, WhatsApp ni otras categorías.
 * Grupo Truper protegido: localizable únicamente por código exacto mediante el buscador original. */
(function(){'use strict';
if(window.NAVARRO_FIJACIONES_INSTALADO)return;
window.NAVARRO_FIJACIONES_INSTALADO=true;
const CURADOS=new Set("7777000024,7777000611,7777000643,7777000819,7777000835,7777000882,7777000938,7777000964,7501575372835,7777001009,7777001090,7777001089,7777001091,7777001092,7777001093,7777001094,7777001095,7777001096,7777001097,7777001098,7777001100,7777001101,7777001109,7777001123,7777001428,7777001429,7777001430,7777001431,7777001432,7777001433,7777001434,7777001435,7777001436,7777001437,7777001438,7777001439,7777001440,7777001443,7777001454,7777001455,7777001456,7777001457,7777001459,7777001460,7777001624,7777001671,7777001672,7777001687,7777001690,7777001703,7777001716,7777001749,7777001775,7777001838,7777001848,7777001849,7506356301004,7777001857,7777001858,7777001859,7777001861,7777001863,7777001864,7506356300960,7506356300984,7777001865,7777001866,7777001873,7777001880".split(','));
const FAMILIAS=[
 ['Pijas y tornillos','🔩'],
 ['Taquetes y anclas','🧱'],
 ['Clavos y grapas','📌'],
 ['Tuercas y rondanas','⚙️'],
 ['Espárragos y roscados','📏'],
 ['Alcayatas y armellas','🪝']
];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const frac=(a,b)=>({'1/2':'½','1/4':'¼','3/4':'¾','3/8':'⅜','5/8':'⅝','7/8':'⅞','3/16':'3/16','5/16':'5/16','7/16':'7/16'}[a+'/'+b]||a+'/'+b);
function lengthFor(input){
 const n=norm(input).replace(/[´′’']/g,'');
 let m=n.match(/\b(\d+)\s+Y\s+(\d+)[-\/](\d+)/);
 if(m)return m[1]+frac(m[2],m[3])+'″';
 m=n.match(/\b(\d+)\s+(?:Y\s+)?(?:UN\s+)?CUARTO\b/);
 if(m)return m[1]+'¼″';
 if(/\b(?:UN CUARTO|CUARTO)\b/.test(n))return '¼″';
 m=n.match(/\b(\d+)\s+(?:Y\s+)?MEDIA\b/);
 if(m)return m[1]+'½″';
 if(/\bMEDIA\b/.test(n))return '½″';
 m=n.match(/\b(\d+)[-\/](\d+)\b/);
 if(m)return frac(m[1],m[2])+'″';
 m=n.match(/\b(\d+)\.(\d+)\b/);
 if(m)return m[2]==='5'?m[1]+'½″':m[0]+'″';
 m=n.match(/\b(\d+)\s*PULGADA/);
 if(m)return m[1]+'″';
 if(/\b1[´″"]{1,2}\b/.test(n)||/\b1[´″"]{1,2}(?:\s|$)/.test(n))return '1″';
 m=n.match(/\b(\d+)\s*$/);
 return m?m[1]+'″':'';
}
function classify(name){
 const n=norm(name).trim();
 if(/\b(TRUPER|PRETUL|FIERO|FOSET|HERMEX|VOLTECK|KLINTEK|ULTRACRAFT)\b/.test(n))return null;
 let family='',type='',size='',pres='';
 if(/^PIJA\b/.test(n)){
  family='Pijas y tornillos';
  type=/^PIJA Y TAQUETE/.test(n)?'Kits pija y taquete':
       /PUNTA BROCA/.test(n)?'Pijas punta broca':
       /NEGRA RAPIDA|PIJA RAPIDA/.test(n)?'Pijas rápidas':
       /TABLARR?OCA/.test(n)?'Pijas para tablaroca':
       /GALVANIZADA/.test(n)?'Pijas galvanizadas':'Pijas varias';
  const mm=n.match(/\b(8|14)\s*X\s*(.+?)(?:\s+EL CIENTO|$)/);
  size=mm?'#'+mm[1]+' × '+(lengthFor(mm[2])||mm[2]):lengthFor(n);
 }else if(/^TORNILLO\b|^TORNILLOS\b|^BIRLOS\b/.test(n)){
  family='Pijas y tornillos';
  type=/BIRLOS/.test(n)?'Birlos':/SANITARIO|WC/.test(n)?'Tornillos sanitarios':'Tornillos y accesorios';
  size=lengthFor(n);
 }else if(/^TAQUETE\b/.test(n)){
  family='Taquetes y anclas';type=/TABLARR?OCA/.test(n)?'Taquetes para tablaroca':'Taquetes';size=lengthFor(n);
 }else if(/^CLAVOS?\b/.test(n)){
  family='Clavos y grapas';type=/CONCRETO/.test(n)?'Clavos para concreto':/ALFILER/.test(n)?'Clavos alfiler':'Clavos generales';size=lengthFor(n);
 }else if(/^GRAPA\b|^CAJA GRAPAS\b/.test(n)){
  family='Clavos y grapas';type=/PUAS/.test(n)?'Grapas para cercas':/CABLE/.test(n)?'Grapas para cable':'Grapas';size=lengthFor(n);
 }else if(/^TUERCA (?:\d|1[-\/])/.test(n)||/^RONDANA\b/.test(n)){
  family='Tuercas y rondanas';type=/^RONDANA/.test(n)?'Rondanas':'Tuercas';
  const m=n.match(/^TUERCA (\d+)\s+(\d+)(?:\s|$)/);
  size=m?frac(m[1],m[2])+'″':lengthFor(n);
 }else if(/^ESPARRAGO\b/.test(n)){
  family='Espárragos y roscados';type='Espárragos';size=lengthFor(n);
 }else if(/^ALCAYATA\b|^ARMELLA\b/.test(n)){
  family='Alcayatas y armellas';type=/^ALCAYATA/.test(n)?'Alcayatas':'Armellas';size=lengthFor(n);
 }else return null;
 if(!size)size='Medida no indicada';
 pres=/EL CIENTO/.test(n)?'Por ciento':/POR KILO/.test(n)?'Por kilo':/\bBOLSA\b/.test(n)?'Bolsa':/\bPAQUETE\b/.test(n)?'Paquete':/^CAJA\b/.test(n)?'Caja':'No indicada';
 return {family,type,size,pres};
}
function init(){
 const products=document.getElementById('products'),filters=document.getElementById('filters'),title=document.getElementById('listing-title');
 if(!products||!filters||!title||!Array.isArray(window.NAVARRO_DB))return;
 const verified=window.NAVARRO_BUSCADOR_GENERICO?.expected===2189 && window.NAVARRO_BUSCADOR_GENERICO?.loaded===2189;
 const base=new Map(window.NAVARRO_DB.map(r=>[String(r[0]),r]));
 const rows=[];
 if(verified)for(const code of CURADOS){
  if(!/^\d{5,}$/.test(code))continue;
  const r=base.get(code);
  if(!r||!Number.isFinite(Number(r[2]))||Number(r[2])<=0)continue;
  const att=classify(r[1]);
  if(!att)continue;
  rows.push({id:code,name:String(r[1]),price:Number(r[2]),...att});
 }
 const section=document.createElement('section');
 section.id='navarro-fijaciones-panel';section.className='navarro-fijaciones-panel';section.hidden=true;
 products.parentNode.insertBefore(section,products);
 const style=document.createElement('style');
 style.textContent='.navarro-fijaciones-panel[hidden]{display:none!important}.navarro-fijaciones-panel{padding:14px 12px;margin:12px 0 15px;background:white;border:1px solid #d9e1eb;border-radius:17px;color:#172c49}.nav-fix-title{font-size:19px;font-weight:850;margin:1px 0 5px;color:#102b52}.nav-fix-caption{font-size:12px;line-height:1.5;color:#5a6b7c;margin:0 0 13px}.nav-fix-step{border-top:1px solid #e5ebf2;padding:12px 0 6px}.nav-fix-label{display:block;font-size:12px;font-weight:850;color:#263d58;margin-bottom:9px}.nav-fix-chips{display:flex;gap:7px;flex-wrap:wrap}.nav-fix-chip{font-size:12px;font-weight:750;padding:9px 10px;border-radius:10px;border:1px solid #cfdbe8;background:#f9fbfe;color:#213b58;min-height:41px;cursor:pointer}.nav-fix-chip[aria-pressed=true]{background:#0c2e55;border-color:#0c2e55;color:white}.nav-fix-note{font-size:11px;color:#65758a;margin:12px 0 0;line-height:1.45}.nav-fix-more{display:block;width:100%;border:0;background:#0c2e55;border-radius:12px;color:white;font-weight:800;font-size:13px;min-height:44px;margin:12px 0 16px}.nav-fix-visual{font-size:35px;display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f1f4f8}.nav-fix-top{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:8px 0 5px;font-size:11px;color:#53647b}.nav-fix-tab{border-color:#d0b47f!important}.nav-fix-tab.active{background:linear-gradient(135deg,#ffe191,#d9a243)!important;color:#071a31!important}.nav-fix-empty{padding:24px;text-align:center;background:#fff;border-radius:11px;color:#576980;font-size:13px}';
 document.head.appendChild(style);
 let selected={family:'',type:'',size:'',pres:''},limit=48,sort='relevantes',scheduled=false;
 const cmp=(a,b)=>a.price-b.price||a.name.localeCompare(b.name,'es',{numeric:true});
 const filtered=()=>rows.filter(r=>(!selected.family||r.family===selected.family)&&(!selected.type||r.type===selected.type)&&(!selected.size||r.size===selected.size)&&(!selected.pres||r.pres===selected.pres));
 function getList(){
  let v=filtered().slice();
  if(sort==='baratos')return v.sort(cmp);
  if(sort==='nombre')return v.sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}));
  const rank=new Map(FAMILIAS.map((r,i)=>[r[0],i]));
  const buckets=FAMILIAS.map(([f])=>v.filter(r=>r.family===f).sort(cmp));
  const mixed=[];let has=true;
  while(has){has=false;for(const b of buckets){if(b.length){mixed.push(b.shift());has=true}}}
  return mixed;
 }
 const unique=(data,key)=>[...new Set(data.map(v=>v[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
 const chip=(key,value,label,active)=>'<button class="nav-fix-chip" type="button" data-fix-key="'+key+'" data-fix-val="'+esc(value)+'" aria-pressed="'+(active?'true':'false')+'">'+esc(label)+'</button>';
 function rowStep(label,key,values,allLabel){
  return '<div class="nav-fix-step"><span class="nav-fix-label">'+esc(label)+'</span><div class="nav-fix-chips">'+chip(key,'',allLabel,!selected[key])+values.map(v=>chip(key,v,v,selected[key]===v)).join('')+'</div></div>';
 }
 function presentation(){
  const subset=rows.filter(r=>!selected.family||r.family===selected.family);
  let html='<h3 class="nav-fix-title">🔩 Tornillería y fijaciones</h3><p class="nav-fix-caption">Busca por tipo, medida y presentación. Usa el carrito normal para agregar artículos. Precios de referencia del catálogo, sujetos a confirmación.</p>';
  if(!verified)return html+'<p class="nav-fix-note">No se pudo verificar la lista preferente. Por seguridad no se muestran artículos protegidos.</p>';
  html+=rowStep('1 · Familia','family',FAMILIAS.map(x=>x[0]).filter(f=>rows.some(r=>r.family===f)),'Todas las familias');
  if(selected.family){
   html+=rowStep('2 · Tipo de fijación','type',unique(subset,'type'),'Todos los tipos');
   const typed=subset.filter(r=>!selected.type||r.type===selected.type);
   html+=rowStep('3 · Medida','size',unique(typed,'size'),'Todas las medidas');
   const measured=typed.filter(r=>!selected.size||r.size===selected.size);
   if(unique(measured,'pres').length>1)html+=rowStep('4 · Presentación','pres',unique(measured,'pres'),'Todas las presentaciones');
  }
  html+='<div class="nav-fix-step"><span class="nav-fix-label">Ordenar productos</span><div class="nav-fix-chips">'+
   ['relevantes','baratos','nombre'].map(k=>'<button class="nav-fix-chip" type="button" data-fix-sort="'+k+'" aria-pressed="'+(sort===k?'true':'false')+'">'+(k==='relevantes'?'Variedad destacada':k==='baratos'?'Menor precio':'Nombre A–Z')+'</button>').join('')+'</div></div>';
  html+='<p class="nav-fix-note">Grupo Truper: productos disponibles solo con código exacto o escáner, conforme a las reglas actuales. Presentación «No indicada» significa que no aparece en la descripción del catálogo.</p>';
  return html;
 }
 function cart(){try{const o=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch{return {}}}
 function renderCards(){
  const all=getList(),page=all.slice(0,limit),cartNow=cart(),atlas=window.NAVARRO_ATLAS;
  const key=[selected.family,selected.type,selected.size,selected.pres,limit,sort].join('|');
  section.innerHTML=presentation();
  let html=page.map(p=>{
   const qty=Math.max(0,Math.min(9999,Math.trunc(Number(cartNow[p.id])||0)));
   const file=window.NAVARRO_FOTOS_PAGINA?.[p.id]||atlas?.byCode?.[p.id]||'';
   const index=atlas?.files?.[file],hasImage=Number.isInteger(index);
   const posX=hasImage?(index%atlas.columns)*atlas.size:0,posY=hasImage?Math.floor(index/atlas.columns)*atlas.size:0;
   const picture=hasImage?'<span class="product-sprite" role="img" aria-label="Fotografía de catálogo" style="background-position:-'+posX+'px -'+posY+'px;background-size:'+(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px"></span>':'<span class="nav-fix-visual" aria-label="Sin fotografía exacta">🔩</span>';
   const q=qty?'<div class="card-qty"><button type="button" data-dec="'+esc(p.id)+'" aria-label="Quitar una unidad">−</button><strong aria-live="polite">'+qty+'</strong><button type="button" data-inc="'+esc(p.id)+'" aria-label="Agregar una unidad">+</button></div>':'<span class="card-prompt">+ Toca para agregar</span>';
   return '<article class="product tap-product '+(qty?'in-cart':'')+'" data-card="'+esc(p.id)+'" data-fix-render="'+esc(key)+'" tabindex="0" aria-label="'+esc(p.name)+'; '+money(p.price)+'. Tocar para agregar"><div class="product-visual">'+picture+'<span class="product-cat">'+esc(p.size)+'</span></div><div class="product-info"><h3>'+esc(p.name)+'</h3><small class="product-code">Código '+esc(p.id)+' · '+esc(p.pres)+'</small><div class="product-bottom"><div><div class="price">'+money(p.price)+'</div><div class="price-note">Precio de copia · confirmar</div></div>'+q+'</div></div></article>';
  }).join('');
  if(!page.length)html='<div class="nav-fix-empty" data-fix-render="'+esc(key)+'">No hay productos de la lista preferente con esta combinación. Restablece algún filtro.</div>';
  products.innerHTML=html;
  if(all.length>page.length){
   const b=document.createElement('button');b.type='button';b.className='nav-fix-more';b.dataset.fixMore='1';
   b.textContent='Mostrar más productos ('+(all.length-page.length)+' restantes)';products.appendChild(b);
  }
  title.textContent='Tornillería y fijaciones';
  const info=document.getElementById('results-info');
  if(info)info.textContent='Mostrando '+page.length+' de '+all.length+' productos preferentes · catálogo de referencia';
  const empty=document.getElementById('no-results');if(empty)empty.hidden=true;
 }
 function active(){
  const t=title.textContent.trim();
  if(t!=='Tornillería'&&t!=='Tornillería y fijaciones')return false;
  return !document.getElementById('search')?.value.trim()&&!document.getElementById('search-mobile')?.value.trim();
 }
 function ensureTab(){
  let button=filters.querySelector('[data-cat="Tornillería"]');
  if(!button){
   button=document.createElement('button');button.type='button';button.className='filter nav-fix-tab';
   button.dataset.cat='Tornillería';button.innerHTML='<span class="filter-icon" aria-hidden="true">🔩</span><span>Fijaciones</span>';
   const all=filters.querySelector('[data-cat="Todos"]');
   filters.insertBefore(button,all||null);
  }
  button.classList.toggle('active',active());
 }
 function refresh(){
  ensureTab();const enabled=active();section.hidden=!enabled;if(!enabled)return;
  const key=[selected.family,selected.type,selected.size,selected.pres,limit,sort].join('|');
  const first=products.firstElementChild;
  if(!first||first.getAttribute('data-fix-render')!==key)renderCards();
 }
 function schedule(){if(scheduled)return;scheduled=true;Promise.resolve().then(()=>{scheduled=false;refresh()})}
 section.addEventListener('click',e=>{
  const chip=e.target.closest('[data-fix-key]'),order=e.target.closest('[data-fix-sort]');
  if(chip){
   const key=chip.dataset.fixKey,value=chip.dataset.fixVal;
   if(key==='family')selected={family:value,type:'',size:'',pres:''};
   else if(key==='type'){selected.type=value;selected.size='';selected.pres=''}
   else if(key==='size'){selected.size=value;selected.pres=''}
   else if(key==='pres')selected.pres=value;
   limit=48;renderCards();
  }else if(order){sort=order.dataset.fixSort;limit=48;renderCards()}
 });
 products.addEventListener('click',e=>{if(e.target.closest('[data-fix-more]')&&active()){limit+=48;renderCards()}});
 new MutationObserver(schedule).observe(filters,{childList:true,subtree:false});
 new MutationObserver(schedule).observe(products,{childList:true,subtree:false});
 for(const id of ['search','search-mobile'])document.getElementById(id)?.addEventListener('input',schedule);
 refresh();
 window.NAVARRO_FIJACIONES_ESTADO=Object.freeze({version:1,source:window.NAVARRO_DB.length,approvedCatalogReady:verified,curatedCodes:CURADOS.size,integrated:rows.length,byFamily:FAMILIAS.map(x=>({name:x[0],total:rows.filter(r=>r.family===x[0]).length})),nativeCartUnchanged:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();