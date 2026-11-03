/* NAVARRO 360 · CERRADURAS Y HERRAJES V1 · 2026-11-03
   Selección comercial desde NAVARRO_DB: códigos y precios ya existentes.
   No modifica catálogo, búsqueda genérica, carrito, WhatsApp, escáner o SIFO.
   Las fotografías se muestran exclusivamente si ya están asociadas a un SKU. */
(function(){'use strict';
if(window.NAVARRO_HERRAJES_INSTALADO)return;
window.NAVARRO_HERRAJES_INSTALADO=true;
const CATEGORIES=[
 ['Cerraduras y chapas','🚪',60],
 ['Candados','🔒',50],
 ['Bisagras','🔩',60],
 ['Pasadores y cerrojos','🗝️',35],
 ['Jaladeras y perillas','🚪',60],
 ['Correderas para cajón','📏',27],
 ['Rodajas para muebles','🛞',32],
 ['Accesorios de puerta','🧰',27],
 ['Instalación de cerraduras','🛠️',4]
];
const escapeHTML=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const cash=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
/* Banco oficial Truper: referencias contrastadas con nombre/modelo exacto. */
const VERIFIED_PHOTOS={"7501206609538":"https://www.truper.com/media/import/imagenes/BAL-CM-BP.jpg","7506240640363":"https://www.truper.com/media/import/imagenes/CH-20P.jpg","7501206692325":"https://www.truper.com/media/import/imagenes/BC-301PP.jpg","7501206624272":"https://www.truper.com/media/import/imagenes/KIT-3P.jpg","7506240677192":"https://www.truper.com/media/import/imagenes/KIT-4P.jpg"};

function classify(name){
 const n=normalized(name);
 if(/^JUEGO DE [34] PIEZAS PARA INSTALAR CERRADURAS\b/.test(n))
  return {family:'Instalación de cerraduras',kind:'Juegos para instalación',measure:'3–4 piezas'};
 if(/^CERRADURA\b|^COMBO CERRADURAS\b/.test(n)){
  let kind=/^COMBO/.test(n)?'Combos':
    /SOBREPONER/.test(n)?'Sobreponer':
    /MANIJA/.test(n)?'Con manija':
    /ESFERA/.test(n)?'De esfera':
    /MUEBLE/.test(n)?'Para muebles':
    /BARRA/.test(n)?'De barra':
    /PHILL?IPS/.test(n)?'Tipo Philips':'Otras cerraduras';
  let measure=/ENTRADA/.test(n)?'Entrada':/RECAMARA|PRECAMARA/.test(n)?'Recámara':/BANO|PBANO/.test(n)?'Baño':/IZQ|IZQUIERDA/.test(n)?'Izquierda':/DER|DERECHA/.test(n)?'Derecha':'';
  return {family:'Cerraduras y chapas',kind,measure};
 }
 if(/^CANDADO\b|^JUEGO DE \d+ CANDADOS\b/.test(n)){
  const kind=/^JUEGO/.test(n)?'Juegos de candados':/ANTIPALANCA/.test(n)?'Antipalanca':/LAMINADO/.test(n)?'Laminados':/LATON/.test(n)&&!/COLOR LATON/.test(n)?'De latón':'De hierro';
  const size=n.match(/\b(20|25|30|35|40|45|50|60|65|70|75|80|85|90)\s*MM\b/);
  return {family:'Candados',kind,measure:size?size[1]+' mm':''};
 }
 if(/^BISAGRA\b|^BOLSA(?: CON)? \d+ BISAGRAS\b|^\d+ BISAGRAS\b/.test(n)){
  const kind=/BIDIMENSIONAL/.test(n)?'Para muebles':
   /RECTANGULAR/.test(n)?'Rectangulares':
   /CUADRADA/.test(n)?'Cuadradas':
   /DOBLE ACCION|DE PISO/.test(n)?'Doble acción':
   /^BOLSA|^\d+ BISAGRAS/.test(n)?'En juego':'Otras bisagras';
  const mm=n.match(/\b(95|110|135|165)\b/);
  const inch=n.match(/\b(112|212|312|1|2|3|4)\s*(?:X|ACERO|LATON|CABEZA|\b)/);
  const measure=kind==='Para muebles'&&mm?mm[1]+'°':inch?({'112':'1½','212':'2½','312':'3½'}[inch[1]]||inch[1])+'″':'';
  return {family:'Bisagras',kind,measure};
 }
 if(/^PASADOR\b|^CERROJO\b|^PORTACANDADO\b/.test(n)){
  const kind=/^CERROJO/.test(n)?'Cerrojos':/^PORTACANDADO/.test(n)?'Portacandados':
   /CADENA/.test(n)?'Con cadena':/BARRIL/.test(n)?'De barril':
   /BARRA/.test(n)?'De barra':'Pasadores';
  const m=n.match(/\b(2|3|4|6)\b/);
  return {family:'Pasadores y cerrojos',kind,measure:m?m[1]+'″':''};
 }
 if((/^JALADERA\b|^DOBLE JALADERA\b|^PERILLA\b/.test(n))&&!/REPUESTO|PARA CEPILLO|PODADORA|FUMIGADOR|ARRANQUE/.test(n)){
  const kind=/^PERILLA/.test(n)?'Perillas para muebles':
    /DOBLE JALADERA/.test(n)?'Jaladeras dobles':
    /JALADERA Y PERILLA/.test(n)?'Jaladeras para puerta':'Jaladeras para muebles';
  const mm=n.match(/\b(\d{2,3})\s*MM\b/);
  return {family:'Jaladeras y perillas',kind,measure:mm?mm[1]+' mm':''};
 }
 if(/^BOLSA(?: CON)? \d+ CORREDERAS\b|^CORREDERAS\b/.test(n)){
  const m=n.match(/\b(25|30|35|40|45|50|55|60)\s*CM\b/);
  return {family:'Correderas para cajón',kind:/ANCHA|ANCHO 45/.test(n)?'Anchas':'Estándar',measure:m?m[1]+' cm':''};
 }
 if(/^RODAJA\b/.test(n)){
  const kind=/REPUESTO/.test(n)?'De repuesto':/YOYO/.test(n)?'Tipo yoyó':
   /ESFERICA/.test(n)?'Esféricas':/CON FRENO|\bFRENO\b/.test(n)?'Con freno':
   /GIRATORIA/.test(n)?'Giratorias':'Placa fija';
  const mm=n.match(/\b(40|50)\s*MM\b/),inch=n.match(/\b(2|3|4|5|6)\b/);
  return {family:'Rodajas para muebles',kind,measure:mm?mm[1]+' mm':inch?inch[1]+'″':''};
 }
 if((/^TOPE (?:TIPO |RECTO |PARA |CON )|^MIRILLA DE SEGURIDAD\b|^CIERRAPUERTAS\b|^SOPORTE .*TUBO .*CLOSET\b/.test(n))&&!/ESTACIONAMIENTO|FUMIGADOR|BOMBA|PANTALLA|ESMERILADORA/.test(n)){
  const kind=/^MIRILLA/.test(n)?'Mirillas':/^CIERRAPUERTAS/.test(n)?'Cierrapuertas':
    /^SOPORTE/.test(n)?'Soportes para clóset':'Topes de puerta';
  return {family:'Accesorios de puerta',kind,measure:''};
 }
 return null;
}
function brandOf(name){
 const n=normalized(name);
 return /\bHERMEX\b/.test(n)?(/\bBASIC\b/.test(n)?'Hermex Basic':'Hermex'):
        /\bPRETUL\b/.test(n)?'Pretul':
        /\bTRUPER\b/.test(n)?'Truper':
        /\bFIERO\b/.test(n)?'Fiero':
        /\bBASIC\b/.test(n)?'Básico (catálogo)':'Otras';
}
function finishOf(name){
 const n=normalized(name);
 return /NEGRO MATE|NEGRO/.test(n)?'Negro':
        /CROMO MATE|CROMO SATIN|NIQUEL SATIN/.test(n)?'Satinado':
        /CROMO/.test(n)?'Cromo':
        /LATON ANTIGUO/.test(n)?'Latón antiguo':
        /LATON BRILLANTE|LATONADO|COLOR LATON/.test(n)?'Latón':
        /INOXIDABLE|ACERO INOX/.test(n)?'Acero inoxidable':'';
}
function rank(item){
 let score=item.price;
 if(Object.prototype.hasOwnProperty.call(VERIFIED_PHOTOS,item.id))score-=900;
 if(item.brand==='Hermex Basic'||item.brand==='Básico (catálogo)')score-=17;
 if(item.brand==='Pretul')score-=20;
 if(item.brand==='Truper')score-=8;
 if(/REPUESTO/.test(normalized(item.name)))score+=115;
 if(item.family==='Rodajas para muebles'&&item.brand==='Pretul')score-=80;
 return score;
}
function curate(list,max){
 const buckets=new Map();
 for(const r of list){
  const bucket=r.kind;
  if(!buckets.has(bucket))buckets.set(bucket,[]);
  buckets.get(bucket).push(r);
 }
 for(const values of buckets.values())values.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name,'es',{numeric:true}));
 const kinds=[...buckets.keys()].sort((a,b)=>buckets.get(b).length-buckets.get(a).length);
 const chosen=[],used=new Set();
 // Diversidad de modelos antes de agotar una sola variante barata.
 while(chosen.length<max){
  let progress=false;
  for(const kind of kinds){
   const group=buckets.get(kind);
   if(group.length&&chosen.length<max){
    const next=group.shift();
    if(!used.has(next.id)){chosen.push(next);used.add(next.id);progress=true;}
   }
  }
  if(!progress)break;
 }
 // La sección de rodajas debe incluir las opciones PRETUL que sí existen en el catálogo.
 if(chosen.length&&chosen[0].family==='Rodajas para muebles'){
  const allPretul=list.filter(r=>r.brand==='Pretul'&&!used.has(r.id)).sort((a,b)=>a.price-b.price);
  for(const r of allPretul){
   if(chosen.length<max)chosen.push(r);
   else{
    const i=chosen.findLastIndex(x=>x.brand!=='Pretul'&&x.kind!=='Con freno');
    if(i<0)break;
    chosen[i]=r;
   }
   used.add(r.id);
  }
 }
 return chosen;
}
function init(){
 const products=document.getElementById('products'),filters=document.getElementById('filters'),title=document.getElementById('listing-title');
 if(!products||!filters||!title||!Array.isArray(window.NAVARRO_DB))return;
 const rowsAll=[],ids=new Set();
 for(const r of window.NAVARRO_DB){
  const id=String(r?.[0]||''),name=String(r?.[1]||''),price=Number(r?.[2]);
  if(!/^\d{5,}$/.test(id)||ids.has(id)||!Number.isFinite(price)||price<=0)continue;
  const cat=classify(name);if(!cat)continue;
  ids.add(id);
  rowsAll.push({id,name,price,brand:brandOf(name),finish:finishOf(name),...cat});
 }
 const rows=[];
 for(const [family,icon,max] of CATEGORIES){
  const options=curate(rowsAll.filter(r=>r.family===family),max);
  for(const row of options)rows.push({...row,icon});
 }
 const panel=document.createElement('section');
 panel.id='navarro-herrajes-panel';panel.className='navarro-herrajes-panel';panel.hidden=true;
 products.parentNode.insertBefore(panel,products);
 const style=document.createElement('style');
 style.textContent='.navarro-herrajes-panel[hidden]{display:none!important}.navarro-herrajes-panel{background:white;border:1px solid #d9e1eb;border-radius:17px;padding:14px 12px;margin:12px 0 16px;box-shadow:0 6px 18px #071a3910}.nh-title{font-weight:850;font-size:20px;color:#102b54;margin:0 0 4px}.nh-intro{font-size:12px;color:#637289;margin:0 0 11px;line-height:1.5}.nh-step{border-top:1px solid #e4eaf2;padding:11px 0 7px}.nh-step b{font-size:12px;display:block;margin-bottom:8px;color:#334761}.nh-choices{display:flex;flex-wrap:wrap;gap:7px}.nh-choice{border:1px solid #cad9e7;border-radius:10px;background:#f9fbfe;color:#253f5b;font-size:12px;min-height:42px;padding:9px 10px;font-weight:750;cursor:pointer}.nh-choice[aria-pressed=true]{background:#102b54;color:white;border-color:#102b54}.nh-counter{margin:8px 0 3px;font-size:12px;color:#58687a}.nh-foot{font-size:11px;color:#65798f;line-height:1.5;margin:10px 0 0}.nh-more{display:block;width:100%;border:0;background:#102b54;color:white;font-weight:800;font-size:13px;min-height:44px;margin:12px 0 16px;border-radius:12px}.nh-fallback{display:grid;place-items:center;font-size:35px;width:100%;height:100%;background:#f2f5f9}.nh-photo{width:100%;height:145px;object-fit:contain;position:absolute;inset:0;background:#fff}.nh-photo[hidden]{display:none}.nh-empty{text-align:center;padding:24px 10px;font-size:13px;color:#637389;background:white;border-radius:12px}.nh-brand{font-size:11px;color:#2e617b;font-weight:850}.nh-category{font-size:10px;color:#52637c}';
 document.head.appendChild(style);
 let selected={family:'',kind:'',measure:'',finish:'',brand:''},sort='variedad',limit=48,queued=false;
 const byPrice=(a,b)=>a.price-b.price||a.name.localeCompare(b.name,'es',{numeric:true});
 const uniq=(data,k)=>[...new Set(data.map(x=>x[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
 const chosen=()=>rows.filter(x=>(!selected.family||x.family===selected.family)&&(!selected.kind||x.kind===selected.kind)&&(!selected.measure||x.measure===selected.measure)&&(!selected.finish||x.finish===selected.finish)&&(!selected.brand||x.brand===selected.brand));
 function ordered(){
  const pool=chosen();
  if(sort==='precio')return pool.sort(byPrice);
  if(sort==='nombre')return pool.sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}));
  const pools=CATEGORIES.map(c=>pool.filter(p=>p.family===c[0]).sort((a,b)=>rank(a)-rank(b)||byPrice(a,b)));
  const out=[];let more=true;
  while(more){more=false;for(const p of pools){if(p.length){out.push(p.shift());more=true}}}
  return out;
 }
 const opt=(key,value,label,pressed)=>'<button type="button" class="nh-choice" data-nh-key="'+escapeHTML(key)+'" data-nh-value="'+escapeHTML(value)+'" aria-pressed="'+(pressed?'true':'false')+'">'+escapeHTML(label)+'</button>';
 function step(label,key,values,all){
  return '<div class="nh-step"><b>'+escapeHTML(label)+'</b><div class="nh-choices">'+opt(key,'',all,!selected[key])+values.map(v=>opt(key,v,v,selected[key]===v)).join('')+'</div></div>';
 }
 function panelHtml(){
  let s='<h3 class="nh-title">🚪 Cerraduras y herrajes</h3><p class="nh-intro">Selecciona chapas, candados, bisagras y accesorios por tipo, medida, acabado y marca. Se da prioridad a opciones económicas.</p>';
  const families=CATEGORIES.filter(c=>rows.some(x=>x.family===c[0])).map(c=>c[0]);
  s+=step('1 · Familia','family',families,'Todas las familias');
  if(selected.family){
   const base=rows.filter(x=>x.family===selected.family);
   s+=step('2 · Tipo de producto','kind',uniq(base,'kind'),'Todos los tipos');
   const typed=base.filter(x=>!selected.kind||x.kind===selected.kind);
   const sizes=uniq(typed,'measure');
   if(sizes.length)s+=step('3 · Medida o función','measure',sizes,'Todas las medidas');
   const measured=typed.filter(x=>!selected.measure||x.measure===selected.measure);
   const finishes=uniq(measured,'finish');
   if(finishes.length>1)s+=step('4 · Acabado','finish',finishes,'Todos los acabados');
  }
  const brands=uniq(rows.filter(x=>!selected.family||x.family===selected.family),'brand');
  s+=step('Marca','brand',brands,'Todas las marcas');
  s+='<div class="nh-step"><b>Ordenar productos</b><div class="nh-choices">'+[
   ['variedad','Destacados económicos'],['precio','Menor precio'],['nombre','Nombre A–Z']
  ].map(([v,l])=>'<button type="button" class="nh-choice" data-nh-sort="'+v+'" aria-pressed="'+(v===sort?'true':'false')+'">'+l+'</button>').join('')+'</div></div>';
  s+='<p class="nh-counter">'+chosen().length+' artículos · '+rows.length+' destacados seleccionados</p>';
  s+='<p class="nh-foot">Precios de referencia del catálogo móvil, sujetos a confirmación. Solo se muestran fotos ya vinculadas al código exacto; de lo contrario, imagen ilustrativa. Para buscar cualquier otra referencia, usa el buscador o escáner de barras.</p>';
  return s;
 }
 function cart(){
  try{const o=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch{return {}}
 }
 function photoTag(row,atlas){
  const saved=VERIFIED_PHOTOS[row.id]||window.NAVARRO_FOTOS_PAGINA?.[row.id];
  const lookup=atlas?.byCode?.[row.id];
  const file=saved||lookup;
  const spriteIndex=atlas?.files?.[file];
  if(Number.isInteger(spriteIndex)){
   return '<span class="product-sprite" role="img" aria-label="Imagen exacta del catálogo" style="background-position:-'+(spriteIndex%atlas.columns*atlas.size)+'px -'+(Math.floor(spriteIndex/atlas.columns)*atlas.size)+'px;background-size:'+(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px"></span>';
  }
  const fallback='<span class="nh-fallback" role="img" aria-label="Imagen ilustrativa">'+row.icon+'</span>';
  if(typeof saved!=='string'||!saved)return fallback;
  const safe=/^https:\/\/www\.truper\.com\/media\/import\/imagenes\/[A-Za-z0-9%+_.-]+\.jpe?g(?:\?.*)?$/i.test(saved)||
   /^navarro-[A-Za-z0-9_.-]+\.(?:jpg|png|webp)$/i.test(saved);
  if(!safe)return fallback;
  const src=/^https:/.test(saved)?saved:'./assets/'+saved;
  return fallback+'<img class="nh-photo" loading="lazy" decoding="async" alt="Fotografía exacta de '+escapeHTML(row.name)+'" src="'+escapeHTML(src)+'">';
 }
 function render(){
  const all=ordered(),subset=all.slice(0,limit),state=cart(),atlas=window.NAVARRO_ATLAS;
  const sig=[selected.family,selected.kind,selected.measure,selected.finish,selected.brand,sort,limit].join('|');
  panel.innerHTML=panelHtml();
  let markup=subset.map(row=>{
   const qty=Math.max(0,Math.min(9999,Math.trunc(Number(state[row.id])||0)));
   const controls=qty?'<div class="card-qty"><button type="button" data-dec="'+row.id+'" aria-label="Quitar una unidad">−</button><strong aria-live="polite">'+qty+'</strong><button type="button" data-inc="'+row.id+'" aria-label="Agregar una unidad">+</button></div>':
    '<span class="card-prompt">+ Toca para agregar</span>';
   return '<article class="product tap-product '+(qty?'in-cart':'')+'" tabindex="0" data-card="'+row.id+'" data-nh-render="'+escapeHTML(sig)+'" aria-label="'+escapeHTML(row.name)+'; '+escapeHTML(cash(row.price))+'. Toca para agregar"><div class="product-visual">'+photoTag(row,atlas)+'<span class="product-cat">'+escapeHTML(row.measure||row.kind)+'</span></div><div class="product-info"><span class="nh-brand">'+escapeHTML(row.brand)+'</span><h3>'+escapeHTML(row.name)+'</h3><small class="product-code">Código '+row.id+' · '+escapeHTML(row.kind)+'</small><div class="product-bottom"><div><div class="price">'+escapeHTML(cash(row.price))+'</div><div class="price-note">Precio del catálogo · confirmar</div></div>'+controls+'</div></div></article>';
  }).join('');
  if(!subset.length)markup='<div class="nh-empty" data-nh-render="'+escapeHTML(sig)+'">Sin artículos para esta combinación. Cambia algún filtro.</div>';
  products.innerHTML=markup;
  if(all.length>subset.length){
   const btn=document.createElement('button');btn.type='button';btn.className='nh-more';btn.dataset.nhMore='1';
   btn.textContent='Mostrar más ('+(all.length-subset.length)+' restantes)';products.appendChild(btn);
  }
  title.textContent='Cerraduras y herrajes';
  const info=document.getElementById('results-info');if(info)info.textContent='Mostrando '+subset.length+' de '+all.length+' artículos · catálogo de referencia';
  const empty=document.getElementById('no-results');if(empty)empty.hidden=true;
 }
 function active(){
  const t=title.textContent.trim();
  return (t==='Herrajes'||t==='Cerraduras y herrajes')&&!document.getElementById('search')?.value.trim()&&!document.getElementById('search-mobile')?.value.trim();
 }
 function ensureTab(){
  let tab=filters.querySelector('[data-cat="Herrajes"]');
  if(!tab){
   tab=document.createElement('button');tab.type='button';tab.className='filter';tab.dataset.cat='Herrajes';
   tab.innerHTML='<span class="filter-icon" aria-hidden="true">🚪</span><span>Herrajes</span>';
   filters.insertBefore(tab,filters.querySelector('[data-cat="Todos"]')||null);
  }
  tab.classList.toggle('active',active());
 }
 function sync(){
  ensureTab();
  const show=active();panel.hidden=!show;if(!show)return;
  const sig=[selected.family,selected.kind,selected.measure,selected.finish,selected.brand,sort,limit].join('|');
  if(products.firstElementChild?.getAttribute('data-nh-render')!==sig)render();
 }
 function schedule(){if(queued)return;queued=true;Promise.resolve().then(()=>{queued=false;sync()})}
 panel.addEventListener('click',e=>{
  const el=e.target.closest('button[data-nh-key],button[data-nh-sort]');if(!el)return;
  if(el.dataset.nhSort){sort=el.dataset.nhSort;limit=48;render();return}
  const k=el.dataset.nhKey,v=el.dataset.nhValue||'';
  if(k==='family')selected={family:v,kind:'',measure:'',finish:'',brand:''};
  else if(k==='kind'){selected.kind=v;selected.measure='';selected.finish=''}
  else if(k==='measure'){selected.measure=v;selected.finish=''}
  else if(k==='finish')selected.finish=v;
  else if(k==='brand'){selected.brand=v;selected.kind='';selected.measure='';selected.finish=''}
  limit=48;render();
 });
 products.addEventListener('click',e=>{if(active()&&e.target.closest('[data-nh-more]')){limit+=48;render()}});
 products.addEventListener('error',e=>{if(e.target?.classList?.contains('nh-photo'))e.target.hidden=true},true);
 new MutationObserver(schedule).observe(filters,{childList:true,subtree:false});
 new MutationObserver(schedule).observe(products,{childList:true,subtree:false});
 for(const id of ['search','search-mobile'])document.getElementById(id)?.addEventListener('input',schedule);
 sync();
 window.NAVARRO_HERRAJES_ESTADO=Object.freeze({
  version:1,source:window.NAVARRO_DB.length,eligible:rowsAll.length,selected:rows.length,
  categories:CATEGORIES.map(([name])=>({name,total:rows.filter(r=>r.family===name).length})),
  brands:[...new Set(rows.map(r=>r.brand))],
  cartUntouched:true,scannerUntouched:true,genericSearchUntouched:true
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();