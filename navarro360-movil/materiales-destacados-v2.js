/* NAVARRO 360 · MATERIALES DESTACADOS V2 — 03/nov/2026
 * Completa y ordena la sección EXISTENTE Construcción / Materiales.
 * No crea otra categoría, no reescribe catálogo, carrito, WhatsApp, escáner ni SIFO.
 * Conserva las 42 tarjetas destacadas ya publicadas y sus fotografías.
 */
(function(){'use strict';
if(window.NAVARRO_MATERIALES_V2_INSTALADO)return;
window.NAVARRO_MATERIALES_V2_INSTALADO=true;
const GROUPS=[
 'Cementos y morteros',
 'Arenas y agregados',
 'Ladrillos y paneles',
 'Acero y estructuras',
 'Pegapisos y acabados'
];
const EXTRA=[
 ['7777001058','Ladrillos y paneles'],          // LADRILLO AZOTEA
 ['7777000880','Ladrillos y paneles'],          // BLOCK MILLAR (su propia presentación)
 ['7777000225','Cementos y morteros'],         // CAL POR KILO
 ['7777001165','Pegapisos y acabados'],        // PEGA AZULEJO POR KILO
 ['7777000020','Acero y estructuras'],         // ALAMBRE RECOCIDO POR KILO
 ['7777000848','Acero y estructuras'],         // ALAMBRON POR KILO
 ['7777000550','Acero y estructuras'],         // MALLA YESERA POR METRO
 ['7777001662','Acero y estructuras'],         // MALLA DE POLLO
 ['7777001678','Pegapisos y acabados']         // CINTA MALLA
];
const RANK={
 'Cementos y morteros':['7777001648','7777001647','7777000023','7777001635','7777001636','7777001661','7777000225','7777000019','7777000875'],
 'Arenas y agregados':['7777001629','7777001051','7777001053','7777001052','7777001049'],
 'Ladrillos y paneles':['7777001058','7777001055','7777001057','7777001054','7777000880','7777001079','7777001633','7777001059','7777001060','7777000040','7777001072'],
 'Acero y estructuras':['7777001078','7777001080','7777000020','7777000848','7777000720','7777000957','7777000958','7777000959','7777000726','7777000961','7777000550','7777001662','7777000551'],
 'Pegapisos y acabados':['7777000031','7777000029','7777000027','7777000032','7777000034','7777001165','7777000253','7777001678']
};
const LABELS={
 'Cementos y morteros':'Cementos, cal y mortero',
 'Arenas y agregados':'Arenas y agregados',
 'Ladrillos y paneles':'Ladrillos, block y paneles',
 'Acero y estructuras':'Varilla, acero y mallas',
 'Pegapisos y acabados':'Adhesivos y acabados'
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
function checked(code,name){
 const s=norm(name);
 const rule={
 '7777001058':/^LADRILLO AZOTEA$/,
 '7777000880':/^BLOCK MILLAR$/,
 '7777000225':/^CAL POR KILO$/,
 '7777001165':/^PEGA AZULEJO POR KILO$/,
 '7777000020':/^ALAMBRE RECOCIDO POR KILO$/,
 '7777000848':/^ALAMBRON POR KILO$/,
 '7777000550':/^MALLA YESERA\s*-\s*PLAFONERA\s*\(POR METRO\)$/,
 '7777001662':/^MALLA DE POLLO DE 1 METRO$/,
 '7777001678':/^CINTA MALLA$/
 }[code];
 return !!rule?.test(s);
}
function start(){
 const grid=document.getElementById('products'),filters=document.getElementById('filters');
 const tabs=document.getElementById('subfilters'),info=document.getElementById('results-info');
 if(!grid||!filters||!tabs||!Array.isArray(window.NAVARRO_DB))return;
 const dictionary=new Map(window.NAVARRO_DB.map(r=>[String(r[0]),r]));
 const WITHOUT_SUB={
  '7777001647':'Cementos y morteros',  // Cemento gris por kilo
  '7777001636':'Cementos y morteros',  // Cemento blanco por kilo
  '7777000596':'Pegapisos y acabados' // Yeso por kilo
 };
 const highlights=new Map((window.NAVARRO_DESTACADOS||[]).filter(p=>p.cat==='Construcción')
  .map(p=>[String(p.id),p.sub||WITHOUT_SUB[String(p.id)]||'Otros materiales']));
 const extras=new Map();
 const rejected=[];
 for(const [code,group] of EXTRA){
  if(highlights.has(code))continue;
  const row=dictionary.get(code),price=Number(row?.[2]);
  if(!row||!/^\d{5,}$/.test(code)||!Number.isFinite(price)||price<=0||!checked(code,row[1])){rejected.push(code);continue}
  extras.set(code,{id:code,group,name:String(row[1]),price});
 }
 const names=new Map([...highlights,...[...extras.values()].map(v=>[v.id,v.group])]);
 const priority=new Map();
 for(const [group,ids] of Object.entries(RANK))ids.forEach((id,i)=>priority.set(id,i));
 const orderOf=group=>GROUPS.indexOf(group)===-1?99:GROUPS.indexOf(group);
 const currentGroup=()=>tabs.querySelector('button[data-sub].active')?.dataset.sub||'Todos';
 const noSearch=()=>!document.getElementById('search')?.value.trim()&&!document.getElementById('search-mobile')?.value.trim();
 const active=()=>!!filters.querySelector('button[data-cat="Construcción"].active')&&noSearch();
 const cart=()=>{try{const c=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');return c&&typeof c==='object'&&!Array.isArray(c)?c:{}}catch{return {}}};
 function extraCard(p,qty){
  const article=document.createElement('article');
  const quantity=Math.max(0,Math.min(9999,Math.trunc(Number(qty)||0)));
  article.className='product tap-product'+(quantity?' in-cart':'');
  article.dataset.card=p.id;article.dataset.materialAdicional='1';
  article.tabIndex=0;
  article.setAttribute('aria-label',p.name+'; '+money(p.price)+'. Tocar para agregar');
  const controls=quantity?
    '<div class="card-qty"><button type="button" data-dec="'+p.id+'" aria-label="Quitar una unidad">−</button><strong aria-live="polite">'+quantity+'</strong><button type="button" data-inc="'+p.id+'" aria-label="Agregar una unidad">+</button></div>':
    '<span class="card-prompt">+ Toca para agregar</span>';
  // Imagen neutra en vez de reutilizar una fotografía de un ladrillo distinto.
  const emoji=p.id==='7777001058'?'🧱':p.group==='Acero y estructuras'?'🔩':p.group==='Pegapisos y acabados'?'🪣':'🏗️';
  article.innerHTML='<div class="product-visual"><span class="product-symbol" role="img" aria-label="Imagen referencial">'+emoji+'</span>'+
   '<span class="product-cat">'+esc(p.group)+'</span></div>'+
   '<div class="product-info"><h3>'+esc(p.name)+'</h3><span class="product-code">Código '+p.id+'</span>'+
   '<div class="product-bottom"><div><div class="price">'+money(p.price)+'</div>'+
   '<div class="price-note">Precio de copia · confirmar</div></div>'+controls+'</div></div>';
  return article;
 }
 function orderTabs(){
  const buttons=[...tabs.querySelectorAll('button[data-sub]')];
  if(buttons.length<2)return;
  const order=['Todos',...GROUPS];
  const arranged=buttons.slice().sort((a,b)=>order.indexOf(a.dataset.sub)-order.indexOf(b.dataset.sub));
  if(buttons.some((b,i)=>b!==arranged[i])){
   const frag=document.createDocumentFragment();arranged.forEach(b=>frag.appendChild(b));
   tabs.appendChild(frag);
  }
 }
 function apply(){
  if(!active())return;
  orderTabs();
  const group=currentGroup(),quantities=cart();
  // El núcleo ya muestra los destacados existentes: solo agregamos SKU ausentes.
  const cards=[...grid.querySelectorAll(':scope > .product[data-card]')];
  const byCode=new Map(cards.map(el=>[el.getAttribute('data-card'),el]));
  for(const p of extras.values()){
   if(group!=='Todos'&&group!==p.group)continue;
   if(!byCode.has(p.id))byCode.set(p.id,extraCard(p,quantities[p.id]));
  }
  const ordered=[...byCode.values()].sort((a,b)=>{
   const ca=a.getAttribute('data-card'),cb=b.getAttribute('data-card');
   const ga=names.get(ca)||'Otros materiales',gb=names.get(cb)||'Otros materiales';
   return orderOf(ga)-orderOf(gb)||
    (priority.has(ca)?priority.get(ca):999)-(priority.has(cb)?priority.get(cb):999)||
    (dictionary.get(ca)?.[1]||'').localeCompare(dictionary.get(cb)?.[1]||'','es',{numeric:true});
  });
  // Conservar las mismas tarjetas y fotos existentes; no volver a crear su contenido.
  const oldHeadings=new Map([...grid.querySelectorAll(':scope > .nav-material-heading')].map(el=>[el.dataset.group,el]));
  const desired=[];
  let previous=null;
  for(const card of ordered){
   const family=names.get(card.getAttribute('data-card'))||'Otros materiales';
   if(group==='Todos'&&family!==previous){
    let heading=oldHeadings.get(family);
    if(!heading){
     heading=document.createElement('h3');heading.className='nav-material-heading';heading.dataset.group=family;
     heading.textContent=LABELS[family]||family;
    }
    desired.push(heading);
    previous=family;
   }
   desired.push(card);
  }
  const existing=[...grid.children];
  if(existing.length!==desired.length||existing.some((el,i)=>el!==desired[i])){
   grid.replaceChildren(...desired);
  }
  if(info)info.textContent=ordered.length+' materiales disponibles · Catálogo de referencia';
  const none=document.getElementById('no-results');
  if(none&&ordered.length)none.hidden=true;
 }
 let scheduled=false;
 function schedule(){
  if(scheduled)return;scheduled=true;
  Promise.resolve().then(()=>{scheduled=false;apply()});
 }
 const style=document.createElement('style');style.id='navarro-materiales-v2-style';
 style.textContent='.nav-material-heading{grid-column:1/-1;display:block;width:100%;padding:11px 12px 10px;margin:14px 0 3px;border-left:4px solid #d4aa52;border-radius:5px;background:linear-gradient(90deg,#eaf0f7,#f7f9fc);font-size:14px;line-height:1.35;font-weight:850;letter-spacing:-.015em;color:#0c294b}.nav-material-heading:first-child{margin-top:0}';
 document.head.appendChild(style);
 new MutationObserver(schedule).observe(grid,{childList:true,subtree:false});
 new MutationObserver(schedule).observe(tabs,{childList:true,subtree:false});
 new MutationObserver(schedule).observe(filters,{childList:true,subtree:false});
 ['search','search-mobile'].forEach(id=>document.getElementById(id)?.addEventListener('input',schedule));
 schedule();
 window.NAVARRO_MATERIALES_V2_ESTADO=Object.freeze({
  version:2,catalogSize:window.NAVARRO_DB.length,existing:highlights.size,
  appended:extras.size,rejected:Object.freeze(rejected),
  total:highlights.size+extras.size,
  subcategories:Object.freeze([...GROUPS]),
  cartModified:false,searchModified:false,sifoModified:false
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();