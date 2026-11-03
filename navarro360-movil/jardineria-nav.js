/* NAVARRO 360 · JARDINERÍA Y RIEGO V1 (03/nov/2026)
 * Selección auditada: 217 códigos exactos de catálogo móvil (17,835 SKU).
 * Incluye lonas azules Pretul/Truper, grises Truper y riego de jardín.
 * Complemento visual aislado: no altera catálogo, caja, carrito, WhatsApp,
 * escáner, política de búsqueda genérica del Grupo Truper ni SIFO.
 */
(function(){'use strict';
if(window.NAVARRO_JARDINERIA_INSTALADO)return;
window.NAVARRO_JARDINERIA_INSTALADO=true;
const GROUPS=[["Mangueras de jardín","💧",["7506610218123","7506610218130","7506610218147","7506610218154","7506610218161","7506610218178","7506610218215","7506610218222","7506610218239","7502309730426","7502309730433","7502309730440","7501206653340","7501206653357","7501206656204","7501206656211","7501206656228","7501206691892","7501206691939","7506610218185","7506610218192","7506610218208"]],["Lonas azules","🟦",["7502309733724","7502309733731","7502309733779","7502309733793","7502309733809","7502309733816","7501206691618","7501206691656","7501206691670","7501206691687","7501206691694","7501206691700","7501206691717","7501206638989","7501206639009","7501206639016","7501206639023","7501206639030","7501206639047","7506240615446","7506240615453","7506240615460","7506240615484","7506240615507","7506240615521","7506240615538","7506240615545","7502309733748","7502309733762","7502309733786","7501206691649","7501206638996","7506240615477","7506240615491","7506240615514"]],["Lonas grises","◻️",["7506240615330","7506240615347","7506240615354","7506240615378","7506240615392","7506240615408","7506240615415","7506240615422","7501206638897","7501206638910","7501206638927","7501206638934","7501206638941","7501206638958","7501206638965","7506240615361","7506240615385","7506240615439","7501206638903"]],["Aspersores y pistolas","💦",["7501206655320","7501206636060","7501206654057","7501206652091","7501206602904","7501206652084","7501206653432","7506240606697","7501206652169","7501206652183","7501206652190","7501206652572","7506240600558","7501206671849","7501206671764","7501206671788","7501206653104","7501206602409","7501206602416","7501206695678","7501206695692","7506240606659","7501206652473","7501206654323","7501206602898","7501206655306","7506240606673","7506240606680","7501206653852","7501206652626","7501206655313","7501206695685","7501206652107","7501206655252","7501206653845"]],["Conexiones de riego","🔗",["7506240679950","7501206655405","7501206636077","7501206655412","7501206656709","7506240630470","7501206695739","7501206695753","7501206695760","7501206695784","7501206695791","7506240606314","7506240606321","7506240606338","7506240606345","7501206652022","7501206653876","7501206652411","7501206652428","7501206652435","7501206652442","7501206652459","7501206652497","7506240608004"]],["Herramientas de jardín","🌿",["7506240678632","7506240696438","7506240698227","7506240698234","7506240699989","7506610219038","7506610219045","7506610228153","7501206652220","7506240652793","7506240655022","7506240655039","7506240656036","7501206653180","7501206653173","7501206653166","7501206653197","7501206653128","7501206653142","7501206653135","7501206653111","7501206614211","7501206609347","7501206610107","7501206630501","7501206610114","7501206630518","7501206613184","7501206610121","7501206630525","7501206612415","7501206632192","7501206635582","7501206650769","7501206650752","7501206685754","7501206650301","7501206630211","7501206652015","7501206650400","7501206610206","7501206612958","7501206652343","7501206652350","7501206652374","7501206601914","7506240620624","7506240646136","7506240646143","7506240646150","7506240646167","7506240646174","7501206654651","7506240656241","7501206665411","7501206613030","7501206633380","7501206613047","7501206634387","7501206676554","7501206650394","7501206653067","7501206653531","7506240646129","7501206687291","7506240619314","7506240677161","7506240647423","7501206650028","7501206610152","7501206650486","7506240683933","7501206635858"]],["Fumigadores","🧴",["7501206663165","7506240652939","7506240652946","7506240652953","7506240652007","7506240616351","7506240616368","7506240616375"]],["Insumos de jardín","🌱",["7777001646"]]];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
function brandOf(n){
 if(/\bPRETUL\b/.test(n))return 'Pretul';
 if(/\bTRUPER\b/.test(n))return 'Truper';
 if(/\bFOSET\b/.test(n))return 'Foset';
 return 'Otras';
}
function isValidFor(group,n){
 const branded=/\b(?:TRUPER|PRETUL)\b/.test(n);
 switch(group){
 case 'Mangueras de jardín':return branded && (
  /^MANGUERA DE JARDIN\b/.test(n)||
  /^MANGUERA\b/.test(n)&&/PRETUL\b/.test(n)&&/(?:3 CAPAS|CONEXIONES)/.test(n)&&!/GAS|COMPRESOR|HIDRONEUMATIC/.test(n));
 case 'Lonas azules':return /^LONA DE POLIETILENO\b/.test(n)&&/\bAZUL\b/.test(n)&&branded;
 case 'Lonas grises':return /^LONA DE POLIETILENO\b/.test(n)&&/\bGRIS\b/.test(n)&&/\bTRUPER\b/.test(n);
 case 'Aspersores y pistolas':return branded&&(/^ASPERSOR\b/.test(n)||/^PISTOLA\b/.test(n)&&/\bRIEGO\b/.test(n));
 case 'Conexiones de riego':return /^(?:CONECTOR|REPARADOR|LLAVE P|LLAVE PARA MANGUERA)\b/.test(n)&&/\bMANGUERA\b/.test(n)&&/\b(?:TRUPER|PRETUL|FOSET)\b/.test(n);
 case 'Herramientas de jardín':return branded&&/^(?:CUCHARA PARA JARDIN|TRASPLANTADOR PARA JARDIN|CULTIVADOR PARA JARDIN|AZADON PARA JARDIN|RASTRILLO JARDINERO|RASTRILLO RECTO|ESCOBA (?:METALICA|PLASTICA).*JARDIN|TIJERA (?:PARA PODA|PODA|PARA RAMAS)|PALA (?:CUADRADA|REDONDA)|COA |BIELDO PARA JARDIN)/.test(n);
 case 'Fumigadores':return /^FUMIGADOR\b/.test(n)&&branded;
 case 'Insumos de jardín':return n==='ABONO';
 default:return false;
 }
}
function subtype(group,n){
 if(/^LONAS/.test(group))return /110\s*GM2/.test(n)?'Económica · 110 g/m²':'Reforzada · 180 g/m²';
 if(group==='Mangueras de jardín'){
  if(/SIN CONEXIONES/.test(n))return 'Sin conexiones';
  if(/CONEXIONES\s+(?:DE\s+)?METAL/.test(n))return 'Con conexiones metálicas';
  if(/CONEXIONES\s+PLAST/.test(n))return 'Con conexiones plásticas';
  return 'Mangueras para riego';
 }
 if(group==='Aspersores y pistolas')return /^ASPERSOR/.test(n)?'Aspersores':'Pistolas de riego';
 if(group==='Conexiones de riego')return /^CONECTOR/.test(n)?'Conectores':/^REPARADOR/.test(n)?'Reparadores':'Llaves para manguera';
 if(group==='Fumigadores')return /MOCHILA/.test(n)?'De mochila':/DOMESTICO/.test(n)?'Domésticos':'Jardineros';
 if(group==='Herramientas de jardín'){
  if(/^TIJERA/.test(n))return 'Tijeras de poda';
  if(/^PALA/.test(n))return 'Palas';
  if(/^RASTRILLO/.test(n))return 'Rastrillos';
  if(/^ESCOBA/.test(n))return 'Escobas de jardín';
  if(/^AZADON/.test(n))return 'Azadones';
  if(/^COA /.test(n))return 'Coas';
  if(/^BIELDO/.test(n))return 'Bieldos';
  return 'Herramientas pequeñas';
 }
 return 'Abono';
}
function sizeOf(group,n){
 if(/^Lonas/.test(group)){
  const m=n.match(/\b(\d+(?:\.\d+)?)\s*X\s*(\d+(?:\.\d+)?)\s*M\b/);
  if(!m||Number(m[1])>=13)return 'Medida por confirmar';
  return m[1]+' × '+m[2]+' m';
 }
 if(group==='Mangueras de jardín'){
  const d=n.match(/^MANGUERA (?:DE JARDIN |VERDE |AZUL )?(12|34|58|1)\b/);
  const length=n.match(/\b(\d+)\s*M\b/);
  const diameter=d?({'12':'½″','34':'¾″','58':'⅝″','1':'1″'}[d[1]]||''):'';
  return [diameter,length?length[1]+' m':''].filter(Boolean).join(' · ')||'Longitud por confirmar';
 }
 if(group==='Fumigadores'){
  const m=n.match(/\b(\d+)\s*(?:LITROS?|L)\b/);return m?m[1]+' L':'Capacidad por confirmar';
 }
 if(group==='Herramientas de jardín'){
  const m=n.match(/\b(\d+)\s*DIENTES\b/);return m?m[1]+' dientes':'';
 }
 return '';
}
function init(){
 const products=document.getElementById('products');
 const filters=document.getElementById('filters');
 const title=document.getElementById('listing-title');
 if(!products||!filters||!title||!Array.isArray(window.NAVARRO_DB))return;
 const dictionary=new Map(window.NAVARRO_DB.map(row=>[String(row[0]),row]));
 const rows=[];
 const rejected=[];
 GROUPS.forEach(([group,icon,codes])=>{
  codes.forEach(id=>{
   const item=dictionary.get(id),n=norm(item?.[1]);
   if(!item||!/^\d{5,}$/.test(id)||!isValidFor(group,n)||!Number.isFinite(Number(item[2]))||Number(item[2])<=0){
    rejected.push(id);return;
   }
   rows.push({id,name:String(item[1]),price:Number(item[2]),group,icon,brand:brandOf(n),type:subtype(group,n),size:sizeOf(group,n)});
  });
 });
 const section=document.createElement('section');
 section.id='navarro-garden-panel';section.className='navarro-garden-panel';section.hidden=true;
 products.parentNode.insertBefore(section,products);
 const st=document.createElement('style');
 st.id='navarro-garden-style';
 st.textContent='.navarro-garden-panel[hidden]{display:none!important}.navarro-garden-panel{padding:15px 12px;margin:12px 0 16px;border-radius:18px;background:white;border:1px solid #dce6e2;color:#173847;box-shadow:0 6px 20px #071a3910}.garden-head h3{font-size:20px;margin:0 0 5px;color:#0b3b36}.garden-head p{font-size:12px;line-height:1.45;color:#5b6e78;margin:0 0 13px}.garden-step{padding:12px 0;border-top:1px solid #e4eceb}.garden-step strong{display:block;font-size:12px;color:#254a50;margin-bottom:9px}.garden-chips{display:flex;flex-wrap:wrap;gap:7px}.garden-chip{border:1px solid #d0dfd9;background:#f8fbfa;color:#244850;padding:9px 10px;font-size:12px;min-height:42px;border-radius:10px;font-weight:750;cursor:pointer;touch-action:manipulation}.garden-chip[aria-pressed=true]{background:#0a4c45;color:white;border-color:#0a4c45}.garden-count{font-size:12px;color:#526a71;line-height:1.4;margin:9px 0 3px}.garden-note{font-size:11px;color:#6a7a84;line-height:1.45;margin:12px 0 0}.garden-more{border:0;color:white;background:#0a4c45;border-radius:12px;width:100%;min-height:44px;font-size:13px;font-weight:800;margin:10px 0 16px}.garden-visual{display:grid;place-items:center;width:100%;height:100%;font-size:34px;background:#f0f7f4}.garden-visual.garden-blue{background:#d5e8ff}.garden-visual.garden-gray{background:#e3e6e9}.garden-empty{background:white;padding:22px 12px;border-radius:13px;text-align:center;color:#5b6977;font-size:13px}.garden-photo{width:100%;height:100%;object-fit:contain;max-height:150px;background:white}.garden-badge{font-size:10px;color:#526b70;font-weight:800}.garden-brand{font-weight:850;font-size:11px;color:#0b5c52}.garden-filter.active{border-color:#63988a!important}';
 document.head.appendChild(st);
 let selected={group:'',brand:'',type:'',size:''},sort='destacados',limit=48,scheduled=false;
 const unique=(a,k)=>[...new Set(a.map(x=>x[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
 const chosen=()=>rows.filter(x=>(!selected.group||x.group===selected.group)&&(!selected.brand||x.brand===selected.brand)&&(!selected.type||x.type===selected.type)&&(!selected.size||x.size===selected.size));
 const cmp=(a,b)=>a.price-b.price||a.name.localeCompare(b.name,'es',{numeric:true});
 function results(){
  const pool=chosen().slice();
  if(sort==='baratos')return pool.sort(cmp);
  if(sort==='nombre')return pool.sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}));
  const buckets=GROUPS.map(([g])=>pool.filter(x=>x.group===g).sort((a,b)=>
   (a.brand==='Pretul'?-1:a.brand==='Truper'?0:1)-(b.brand==='Pretul'?-1:b.brand==='Truper'?0:1)||cmp(a,b)));
  const out=[];let more=true;
  while(more){more=false;for(const bucket of buckets){if(bucket.length){out.push(bucket.shift());more=true}}}
  return out;
 }
 const chip=(key,v,label,active)=>'<button type="button" class="garden-chip" data-garden-key="'+esc(key)+'" data-garden-value="'+esc(v)+'" aria-pressed="'+String(active)+'">'+esc(label)+'</button>';
 const options=(k,vals,all,sel)=>'<div class="garden-step"><strong>'+esc(k==='group'?'1 · Subcategoría':k==='brand'?'2 · Marca':k==='type'?'3 · Tipo':'4 · Medida')+'</strong><div class="garden-chips">'+chip(k,'',all,!sel)+vals.map(v=>chip(k,v,v,sel===v)).join('')+'</div></div>';
 function renderPanel(){
  let html='<div class="garden-head"><h3>🌿 Jardinería, riego y lonas</h3><p>Mangueras, lonas azules y grises, aspersores y herramientas económicas. Todos los artículos usan el carrito de NAVARRO 360.</p></div>';
  const groupNames=GROUPS.filter(([g])=>rows.some(x=>x.group===g)).map(x=>x[0]);
  html+=options('group',groupNames,'Todas las familias',selected.group);
  const sameGroup=rows.filter(x=>!selected.group||x.group===selected.group);
  html+=options('brand',unique(sameGroup,'brand'),'Todas las marcas',selected.brand);
  if(selected.group){
   const withBrand=sameGroup.filter(x=>!selected.brand||x.brand===selected.brand);
   if(unique(withBrand,'type').length>1)html+=options('type',unique(withBrand,'type'),'Todos los tipos',selected.type);
   const withType=withBrand.filter(x=>!selected.type||x.type===selected.type);
   if(unique(withType,'size').length>1)html+=options('size',unique(withType,'size'),'Todas las medidas',selected.size);
  }
  html+='<div class="garden-step"><strong>Orden de productos</strong><div class="garden-chips">'+
   [['destacados','Variedad económica'],['baratos','Menor precio'],['nombre','Nombre A–Z']].map(([k,v])=>'<button type="button" class="garden-chip" data-garden-sort="'+k+'" aria-pressed="'+String(sort===k)+'">'+esc(v)+'</button>').join('')+'</div></div>';
  html+='<p class="garden-count">'+chosen().length+' productos de esta selección · '+rows.length+' referencias integradas</p>';
  html+='<p class="garden-note">Los precios son de la copia del catálogo, no de SIFO en vivo. Las medidas ambiguas se señalan para confirmar. Las lonas azules Pretul son de 110 g/m² y las grises Truper de 180 g/m², según su descripción de catálogo.</p>';
  section.innerHTML=html;
 }
 function readCart(){
  try{const x=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}
 }
 function render(){
  const all=results(),subset=all.slice(0,limit),cart=readCart(),atlas=window.NAVARRO_ATLAS;
  const sig=[selected.group,selected.brand,selected.type,selected.size,sort,limit].join('|');
  renderPanel();
  let html=subset.map(p=>{
   const qty=Math.max(0,Math.min(9999,Math.trunc(Number(cart[p.id])||0)));
   const file=atlas?.byCode?.[p.id]||'';
   const ix=atlas?.files?.[file],sprite=Number.isInteger(ix);
   const posX=sprite?(ix%atlas.columns)*atlas.size:0,posY=sprite?Math.floor(ix/atlas.columns)*atlas.size:0;
   const cls=p.group==='Lonas azules'?'garden-blue':p.group==='Lonas grises'?'garden-gray':'';
   const picture=sprite?'<span class="product-sprite" role="img" aria-label="Fotografía de producto" style="background-position:-'+posX+'px -'+posY+'px;background-size:'+(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px"></span>':
    '<span class="product-symbol garden-visual '+cls+'" role="img" aria-label="Imagen referencial, no fotografía exacta">'+esc(p.icon)+'</span>';
   const controls=qty?'<div class="card-qty"><button type="button" data-dec="'+esc(p.id)+'" aria-label="Quitar una unidad">−</button><strong aria-live="polite">'+qty+'</strong><button type="button" data-inc="'+esc(p.id)+'" aria-label="Agregar una unidad">+</button></div>':
   '<span class="card-prompt">+ Toca para agregar</span>';
   return '<article class="product tap-product '+(qty?'in-cart':'')+'" data-card="'+esc(p.id)+'" data-garden-render="'+esc(sig)+'" tabindex="0" aria-label="'+esc(p.name)+'; '+esc(money(p.price))+'. Toca para agregar una unidad"><div class="product-visual">'+picture+'<span class="product-cat">'+esc(p.size||p.type)+'</span></div><div class="product-info"><span class="garden-brand">'+esc(p.brand)+'</span><h3>'+esc(p.name)+'</h3><small class="product-code">Código '+esc(p.id)+' · '+esc(p.type)+'</small><div class="product-bottom"><div><div class="price">'+esc(money(p.price))+'</div><div class="price-note">Precio de copia · confirmar</div></div>'+controls+'</div></div></article>';
  }).join('');
  if(!subset.length)html='<div class="garden-empty" data-garden-render="'+esc(sig)+'">Sin productos para esta combinación. Cambia la marca o medida.</div>';
  products.innerHTML=html;
  if(all.length>subset.length){const button=document.createElement('button');button.type='button';button.className='garden-more';button.dataset.gardenMore='1';button.textContent='Mostrar más ('+(all.length-subset.length)+' productos)';products.appendChild(button)}
  title.textContent='Jardinería y riego';
  const info=document.getElementById('results-info');if(info)info.textContent='Mostrando '+subset.length+' de '+all.length+' productos · catálogo de referencia';
  const noResults=document.getElementById('no-results');if(noResults)noResults.hidden=true;
 }
 function active(){
  const t=title.textContent.trim();
  return (t==='Jardinería'||t==='Jardinería y riego')&&!document.getElementById('search')?.value.trim()&&!document.getElementById('search-mobile')?.value.trim();
 }
 function ensureTab(){
  let tab=filters.querySelector('[data-cat="Jardinería"]');
  if(!tab){
   tab=document.createElement('button');tab.type='button';tab.className='filter garden-filter';tab.dataset.cat='Jardinería';
   tab.innerHTML='<span class="filter-icon" aria-hidden="true">🌿</span><span>Jardinería</span>';
   const last=filters.querySelector('[data-cat="Todos"]');
   filters.insertBefore(tab,last||null);
  }
  tab.classList.toggle('active',active());
 }
 function refresh(){
  ensureTab();const shown=active();section.hidden=!shown;if(!shown)return;
  const sig=[selected.group,selected.brand,selected.type,selected.size,sort,limit].join('|');
  if(products.firstElementChild?.getAttribute('data-garden-render')!==sig)render();
 }
 function schedule(){
  if(scheduled)return;scheduled=true;Promise.resolve().then(()=>{scheduled=false;refresh()});
 }
 section.addEventListener('click',e=>{
  const b=e.target.closest('button[data-garden-key],button[data-garden-sort]');
  if(!b)return;
  if(b.dataset.gardenSort){sort=b.dataset.gardenSort;limit=48;render();return}
  const k=b.dataset.gardenKey,v=b.dataset.gardenValue||'';
  if(k==='group')selected={group:v,brand:'',type:'',size:''};
  else if(k==='brand'){selected.brand=v;selected.type='';selected.size=''}
  else if(k==='type'){selected.type=v;selected.size=''}
  else if(k==='size')selected.size=v;
  limit=48;render();
 });
 products.addEventListener('click',e=>{if(active()&&e.target.closest('[data-garden-more]')){limit+=48;render()}});
 new MutationObserver(schedule).observe(filters,{childList:true,subtree:false});
 new MutationObserver(schedule).observe(products,{childList:true,subtree:false});
 ['search','search-mobile'].forEach(id=>document.getElementById(id)?.addEventListener('input',schedule));
 refresh();
 window.NAVARRO_JARDINERIA_ESTADO=Object.freeze({version:1,catalogLength:window.NAVARRO_DB.length,curated:GROUPS.reduce((a,g)=>a+g[2].length,0),integrated:rows.length,rejected:Object.freeze(rejected),byGroup:Object.freeze(GROUPS.map(([name])=>Object.freeze({name,count:rows.filter(p=>p.group===name).length}))),cartUntouched:true,genericSearchUntouched:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();