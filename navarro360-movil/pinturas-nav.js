/* NAVARRO 360 PINTURA V1. Catálogo supervisado: 186 códigos verificados en 2/nov/2026.
 * Módulo aditivo: no modifica catálogo, carrito, búsquedas ni automatización SIFO. */
(function(){'use strict';
const GROUPS=[["Pinturas vinílicas","🎨",["7777000015","7777000807","7777000808","7777000809","7777000812","7777000813","7777000814","7777000815","7777000884","7777000885","7777000886","7777000970","7777000971","7777001173","7777001739","7777001876"]],["Esmaltes","🪣",["7777000301","7777000559","7777000560","7777000561","7777000562","7777000563","7777000838","7777000839","7777000840","7777000906","7777000907","7777000908","7777000909","7777000910","7777001087"]],["Aerosoles","🌈",["7501781200038","7501781213526","7501781200250","7501781200014","7501781200021","7501781213564","7501781200168","7501781213571","7501781214660","7501781200120","7501781200069","7501781200052","7501781213656","7501781214585","7501781200175","7501781213502","7501781200151","7501781218316","7501781200045","7501781200144","7501781213632","7501781200113","7501781200083","7501781213519","7501781213618","7501781213809","7501781214677","7501781200076","7501781200243","7501781200205","7501781200328","7501781200182","7501781213380","7501781213373","7501781214592","7501781200106","7501781213366","7501781200236","7501781218330","7501781213397","7501781200229","7501781200212"]],["Brochas","🖌️",["7777000016","7503005496272","7503005496265","7503005496234","7503005496227","7777000614","7500112193179","7500112193162","7777000876","7503005496241","7500112842541","7500112193148","7500112193131","7500112842442","7500112842480","7500112193292","7500112193124","7500112842565","7500112842534","7500112842527"]],["Rodillos y accesorios","🧰",["7777000017","7501030803188","7777000615","660731233582"]],["Impermeabilizantes","🏠",["7777000977","7777001113","7777001114","7777001595","7777001596","7777001597","7777001598","7777001599","7777001600"]],["Selladores y resanes","🧱",["709081098042","7777001081","7777000253","7777000565","7777000638","7777000646","7777000648","7777000718","7777000889","7777000892","7777001034","7501028811782"]],["Lijas","📃",["7777000022","799592000542","799592000535","799592000528","7777001036","799592000511","799592000559","799592000375","799592000382","799592000412","799592000443","799592000405","799592000429","799592141047","799592055252","799592000481","799592000498","799592109658","799592761450","799592007787","7777001358","7777001360","7777001361","7777001362","7777001363","7777001364","7777001365","7777001366","7777001367","7777001368","7777001369","7777001370","7777001371","799592000856","799592000863","799592000849","7777001618","7777001834"]],["Cintas para pintar","📏",["721672005994","721672001125","721672001118","721672001095","721672001101","721672001958","721672000524","721672000531","021200395062"]],["Barnices","🪵",["7777000841","7777000842","7777000843","7777000844","7777000845","7777000846"]],["Siliconas y acrílicos","🧴",["7501316111402","7898472263091","7501316111013","7501316111303","7501316111075","7501316111112","7501377320492","7501040305214","070798340718","7501316125454","7777000422","7501315603205","094922901255"]],["Diluyentes y removedores","💧",["7777001063","7777001867"]]];
const NAME_RULES=[
 /^PINTURA(?!.*AEROSOL)|^UN CUARTO DE PINTURA|^CUBETA PINTURA/,
 /^ESMALTE |^GALON ESMALTE/,
 /^SPRAY GENERAL /,
 /^BROCHA /,
 /^RODILLO |^EXTENCION .*PINTAR|^CEPILLO PARA PINTAR/,
 /^IMPERMEABILIZANTE |^CEPILLO PARA IMPERMEABILIZAR|^MEMBRANA PARA IMPERMEABILIZANTE/,
 /^SELLADOR (?!.*ROSCAS)|^CUBETA DE SELLADOR|^RESANADOR |^RESANACRETO |^ESTUCOBRA$|^DECO PASTA /,
 /^LIJA (?:DE AGUA |PARA MURO |DE ESMERIL |DE MADERA |3M |POR METRO)/,
 /^CINTA MASKING /,
 /^BARNIZ /,
 /^SILICON (?:BLANCO ACRIL|NEGRO ACRIL|ACRILICO|BRONCE ACRIL|BEIGE ACRIL|CHAMPAGNE ACRIL|TRANSPARENTE ACRIL|BLANCO HI BOND|BLANCO MULTIFLEX)/,
 /^AGUARRAS POR LITRO|^REMOVEDOR DE PINTURA POR LITRO/
];
function init(){
 const products=document.getElementById('products'),filters=document.getElementById('filters');
 if(!products||!filters||!Array.isArray(window.NAVARRO_DB))return;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const map=new Map(window.NAVARRO_DB.map(r=>[String(r[0]),r]));
 const data=GROUPS.map(([name,icon,ids],gi)=>({name,icon,rows:ids.map(id=>{
  const r=map.get(id);
  if(!r||!/^\d{5,}$/.test(id)||!NAME_RULES[gi].test(normalize(r[1]))||!Number.isFinite(Number(r[2]))||Number(r[2])<=0)return null;
  return {id,name:String(r[1]),price:Number(r[2]),group:name,icon};
 }).filter(Boolean)}));
 const total=data.reduce((n,g)=>n+g.rows.length,0);
 const panel=document.createElement('section');
 panel.id='navarro-pinturas-panel';panel.className='navarro-pinturas-panel';panel.hidden=true;
 panel.setAttribute('aria-label','Subcategorías de pinturas y accesorios');products.parentNode.insertBefore(panel,products);
 const style=document.createElement('style');style.id='navarro-pinturas-style';
 style.textContent='.navarro-pinturas-panel[hidden]{display:none!important}.navarro-pinturas-panel{padding:14px 12px 12px;margin:13px 0 17px;border-radius:19px;background:#fff;border:1px solid #dde5ef;box-shadow:0 5px 22px #071a3910}.navarro-pinturas-title{font-size:20px;font-weight:850;color:#112a4c;margin:0 0 5px}.navarro-pinturas-note{font-size:12px;line-height:1.5;color:#596d85;margin:0 0 13px}.navarro-pinturas-options{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;padding:2px 0 11px;-webkit-overflow-scrolling:touch}.navarro-pinturas-chip{white-space:nowrap;border:1px solid #cdd9e8;background:#f8fafd;color:#203b5c;border-radius:13px;padding:10px 11px;cursor:pointer;font-weight:750;font-size:12px;min-height:44px;scroll-snap-align:start}.navarro-pinturas-chip[aria-pressed=true]{background:#071a39;border-color:#071a39;color:#fff}.navarro-pinturas-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#596d85;font-size:12px}.navarro-pinturas-more{background:#0b2d57;border:0;color:#fff;border-radius:12px;padding:11px 15px;font-weight:750;cursor:pointer;margin:7px 0 17px;min-height:44px;width:100%}';
 document.head.appendChild(style);
 let selected='',page=1,scheduled=false;
 const shortlist=()=>{
  if(selected)return data.find(g=>g.name===selected)?.rows.slice().sort((a,b)=>a.price-b.price||a.name.localeCompare(b.name,'es'))||[];
  const buckets=data.map(g=>g.rows.slice().sort((a,b)=>a.price-b.price||a.name.localeCompare(b.name,'es')));
  const all=[];let change=true;while(change){change=false;for(const bucket of buckets){if(bucket.length){all.push(bucket.shift());change=true}}}
  return all;
 };
 function cart(){try{const x=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}}
 function render(){
  const all=shortlist(),shown=all.slice(0,page*48),quantities=cart(),atlas=window.NAVARRO_ATLAS;
  const sig=selected+'|'+page;
  const choice=(name,icon,n,active)=>'<button type="button" class="navarro-pinturas-chip" data-paint-group="'+esc(name)+'" aria-pressed="'+String(active)+'">'+icon+' '+esc(name)+' · '+n+'</button>';
  panel.innerHTML='<h3 class="navarro-pinturas-title">🎨 Pinturas y accesorios</h3><p class="navarro-pinturas-note">Productos del catálogo general, organizados por tipo. Precios de referencia de la copia, sujetos a confirmación. Toca una tarjeta para agregar al carrito.</p><div class="navarro-pinturas-options" role="group" aria-label="Seleccionar subcategoría">'+choice('Todas','⭐',total,!selected)+data.filter(g=>g.rows.length).map(g=>choice(g.name,g.icon,g.rows.length,g.name===selected)).join('')+'</div><div class="navarro-pinturas-foot"><span>'+all.length+' artículos en '+(selected||'12 subcategorías')+'</span><span>Mostrando '+shown.length+'</span></div>';
  const html=shown.map(p=>{
   const quantity=Math.max(0,Math.min(9999,Math.trunc(Number(quantities[p.id])||0)));
   const photo=window.NAVARRO_FOTOS_PAGINA?.[p.id]||atlas?.byCode?.[p.id]||'';
   const ix=atlas?.files?.[photo],hasSprite=Number.isInteger(ix);
   const pic=hasSprite?'<span class="product-sprite" role="img" aria-label="Imagen del catálogo" style="background-position:-'+((ix%atlas.columns)*atlas.size)+'px -'+(Math.floor(ix/atlas.columns)*atlas.size)+'px;background-size:'+(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px"></span>':'<span class="product-symbol" aria-hidden="true">'+p.icon+'</span>';
   const qty=quantity?'<div class="card-qty"><button type="button" data-dec="'+esc(p.id)+'" aria-label="Quitar una unidad">−</button><strong aria-live="polite">'+quantity+'</strong><button type="button" data-inc="'+esc(p.id)+'" aria-label="Agregar una unidad">+</button></div>':'<span class="card-prompt">+ Toca para agregar</span>';
   return '<article class="product tap-product '+(quantity?'in-cart':'')+'" data-card="'+esc(p.id)+'" data-navarro-pintura="'+esc(sig)+'" tabindex="0" aria-label="'+esc(p.name)+'; '+esc(fmt(p.price))+'. Tocar para agregar"><div class="product-visual">'+pic+'<span class="product-cat">'+esc(p.group)+'</span></div><div class="product-info"><h3>'+esc(p.name)+'</h3><span class="product-code">Código '+esc(p.id)+'</span><div class="product-bottom"><div><div class="price">'+esc(fmt(p.price))+'</div><div class="price-note">Precio de copia · confirmar</div></div>'+qty+'</div></div></article>';
  }).join('');
  products.innerHTML=html||'<p class="no-results">No hay productos confirmados en esta subcategoría.</p>';
  if(!shown.length&&products.firstElementChild)products.firstElementChild.setAttribute('data-navarro-pintura',sig);
  if(shown.length<all.length){
   const more=document.createElement('button');more.type='button';more.className='navarro-pinturas-more';more.textContent='Mostrar más productos ('+(all.length-shown.length)+' restantes)';more.setAttribute('data-paint-more','');products.appendChild(more);
  }
  const heading=document.getElementById('listing-title'),info=document.getElementById('results-info'),none=document.getElementById('no-results');
  if(heading)heading.textContent=selected?'Pintura · '+selected:'Pinturas y accesorios destacados';
  if(info)info.textContent=shown.length+' de '+all.length+' productos · Catálogo de referencia';
  if(none)none.hidden=true;
 }
 function active(){
  return !!filters.querySelector('[data-cat="Pintura"].active')&&!document.getElementById('search')?.value.trim()&&!document.getElementById('search-mobile')?.value.trim();
 }
 function sync(){
  panel.hidden=!active();if(panel.hidden)return;
  const sig=selected+'|'+page;
  if(products.firstElementChild?.getAttribute('data-navarro-pintura')!==sig)render();
 }
 function schedule(){if(scheduled)return;scheduled=true;Promise.resolve().then(()=>{scheduled=false;sync()})}
 panel.addEventListener('click',e=>{const b=e.target.closest('button[data-paint-group]');if(!b)return;selected=b.dataset.paintGroup==='Todas'?'':b.dataset.paintGroup;page=1;render()});
 products.addEventListener('click',e=>{if(e.target.closest('[data-paint-more]')){page++;render();}},true);
 new MutationObserver(schedule).observe(products,{childList:true});
 new MutationObserver(schedule).observe(filters,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 filters.addEventListener('click',schedule);
 for(const id of ['search','search-mobile','clear-search'])document.getElementById(id)?.addEventListener('input',schedule);
 sync();
 window.NAVARRO_PINTURAS_ESTADO=Object.freeze({version:1,confirmed:total,subcategories:data.map(g=>({name:g.name,count:g.rows.length})),protectedSearchUnchanged:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();