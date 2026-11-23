
(()=>{'use strict';
/* NAVARRO 360: PRODUCTOS VARIOS 00000, ficha especial con importe libre. */
if(Array.isArray(window.NAVARRO_DESTACADOS) && !window.NAVARRO_DESTACADOS.some(p=>String(p.id)==='00000'))
 window.NAVARRO_DESTACADOS.unshift({id:'00000',cat:'Todos',img:'',sub:'Importe libre'});
const WHATSAPP='525639129040';
const LIST=Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[];
const HIGHLIGHTS=Array.isArray(window.NAVARRO_DESTACADOS)?window.NAVARRO_DESTACADOS:[];
const dictionary=new Map(LIST.map(p=>[String(p[0]),{id:String(p[0]),name:String(p[1]),price:Number(p[2])}]));
// Producto especial visible sin alterar el catálogo maestro de 17 mil productos.
dictionary.set('00000',{id:'00000',name:'PRODUCTOS VARIOS',price:20});
// Sólo clavos sueltos: no modifica empaques y blísteres.
dictionary.set('00000',{id:'00000',name:'PRODUCTOS VARIOS',price:20});
const CLAVO_IDS=new Set(["7777000024","7777000611","7777000835","7777001109","7777001848","7777001849","7777001857","7777001858","7777001859"]);
const CLAVO_KEY='navarro_clavos_importe_v1';
const esClavo=id=>CLAVO_IDS.has(String(id));
let clavoCents={};
try{const old=JSON.parse(localStorage.getItem(CLAVO_KEY)||'{}');if(old&&typeof old==='object'&&!Array.isArray(old))for(const [id,n] of Object.entries(old))if(esClavo(id)&&Number.isInteger(n)&&n>0&&n<=99999999)clavoCents[id]=n}catch{}
const clavoImporte=id=>(clavoCents[id]||0)/100;
const tieneClavos=()=>Object.keys(cart).some(esClavo);
const displayNames={
 '7777001648':'CEMEX Tolteca Cemento Gris 25 kg',
 '7777001635':'CEMEX Cemento Blanco 25 kg',
 '7777000875':'CEMEX Cemento Antihumedad 25 kg',
 '7777000023':'Mortero CEMEX Tolteca 25 kg',
 '7777000019':'Multiplast CEMEX 25 kg',
 '7777000031':'Pegapiso Cali 20 kg',
 '7777001629':'Arena de río cernida',
 '7777001051':'Arena de río sin cernir'
};
const publicList=HIGHLIGHTS.map(x=>{const p=dictionary.get(String(x.id));return p?{...p,display:displayNames[p.id]||p.name,cat:x.cat,img:x.img,sub:x.sub||"",public:true}:null}).filter(Boolean);
if(!publicList.some(p=>p.id==='00000'))publicList.unshift({id:'00000',name:'PRODUCTOS VARIOS',price:20,display:'PRODUCTOS VARIOS',cat:'Todos',sub:'Por importe',img:'',public:true});
const publicCodes=new Set(publicList.map(x=>x.id));
/* V23: catálogo adicional almacenado por el servidor privado de Windows.
   No modifica LIST ni el índice original, protegiendo las búsquedas verificadas. */
const nv23Products=new Map();
const categories=['Construcción','Plomería','Electricidad','Herramientas','Pintura','Todos'];
const subs=['Todos','Cementos y morteros','Pegapisos y acabados','Arenas y agregados','Acero y estructuras','Ladrillos y paneles'];
const toolSubs=['Todos',...new Set(publicList.filter(p=>p.cat==='Herramientas').map(p=>p.sub).filter(Boolean))];
const q=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// NAVARRO 360 DECIMALES WHATS V2: cantidad decimal visible y con cero inicial.
function formatearCantidad(n){return String(Number(Number(n).toFixed(3)));}
function leerCantidad(raw){
 const s=String(raw??'').trim().replace(',', '.');
 if(!/^(?:\d{1,4}(?:\.\d{1,3})?|\.\d{1,3})$/.test(s))return null;
 const n=Number(s);
 return Number.isFinite(n)&&n>0&&n<=9999?Number(n.toFixed(3)):null;
}
// NAVARRO 360 UNIDADES DE VENTA V2: el importe solo aplica a kilos, metros, litros
// y a los clavos sueltos ya confirmados. No usar la medida del empaque como unidad de venta.
function unidadVenta(id){
 const p=dictionary.get(String(id));
 if(!p||!Number.isFinite(p.price)||p.price<=0)return '';
 if(esClavo(id))return 'kg';
 if(p.unit==='kilo')return 'kg';
 if(p.unit==='metro')return 'm';
 if(p.unit==='litro')return 'L';
 const name=norm(p.name);
 // Unidad real: "POR KILO", "KILO DE", "METRO DE", "LITRO DE".
 // No deducir venta fraccionada solo por tamaños de envase ("BOLSA CON 1 KG", "1 LITRO").
 const m=name.match(/\b(?:POR|AL)\s+(KILOGRAMOS?|KILOS?|KG|METROS?|MTS?|LITROS?|LTS?)\b/)
       ||name.match(/^(KILOGRAMOS?|KILOS?|KG|METROS?|MTS?|LITROS?|LTS?)\s+DE\b/);
 // El catálogo también tiene presentaciones explícitas "METRO CABLE..." y "METRO CUERDA..."
 // sin "DE": son venta por metro, NO rollos/cajas por longitud nominal.
 if(!m){
  if(/^METRO\s+(?:CABLE|CUERDA)\b/.test(name))return 'm';
  return '';
 }
 return /^(?:KILO|KILOGRAMO|KG)/.test(m[1])?'kg':/^(?:METRO|MT)/.test(m[1])?'m':'L';
}
function esImporte(id){return unidadVenta(id)!=='';}
const IMPORTE_KEY='navarro_importes_cents_v1';
const icons={'Herramientas':'🛠️','Construcción':'🧱','Plomería':'🚰','Electricidad':'⚡','Pintura':'🎨','Por código':'📦'};
const toolIcons={'Desarmadores':'🪛','Martillos y marros':'🔨','Taladros y rotomartillos':'🔩','Esmeriladoras':'⚙️','Cortadoras de piso y azulejo':'🪚','Serruchos y sierras':'🪚','Palas, picos y coas':'⛏️','Bombas de agua':'💧','Escaleras de tijera':'🪜','Pinzas y alicates':'🗜️','Llaves y dados':'🔧','Medición y niveles':'📏','Albañilería':'🧱','Brocas y discos':'⚙️','Otras herramientas':'🛠️'};
let category='Construcción',subcat='Todos',search='',lastFocus=null;
const LIMIT=140;
 let nameLimit=LIMIT, nameMatches=0;
// NAVARRO_PLOMERIA_V1: módulo de navegación independiente.
const plomeria=(typeof window.NAVARRO_CREATE_PLOMERIA==='function')?window.NAVARRO_CREATE_PLOMERIA({dictionary,panel:q('#plumbing-panel'),onChange:()=>renderProducts()}):null;
const electricidad=(typeof window.NAVARRO_CREATE_ELECTRICIDAD==='function')?window.NAVARRO_CREATE_ELECTRICIDAD({dictionary,panel:q('#electric-panel'),isApproved:window.NAVARRO_BUSCADOR_GENERICO?.isApproved,onChange:()=>renderProducts()}):null;
let pendingExtraCart={};let cart={}; try{const v=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');if(v&&typeof v==='object'&&!Array.isArray(v)){for(const [k,n] of Object.entries(v)){if(Number.isFinite(n)&&n>0&&n<=9999&&Math.abs(n*1000-Math.round(n*1000))<1e-7){if(dictionary.has(k))cart[k]=n;else if(/^\d{5,30}$/.test(k))pendingExtraCart[k]=n;}}}}catch{}
let importesCents={};
try{
 const old=JSON.parse(localStorage.getItem(IMPORTE_KEY)||'{}');
 if(old && typeof old==='object' && !Array.isArray(old)){
  for(const [id,n] of Object.entries(old))if(dictionary.has(id)&&(id==='00000'||esImporte(id))&&!esClavo(id)&&Number.isSafeInteger(n)&&n>0&&n<=99999999)importesCents[id]=n;
 }
}catch{}
const importeFinal=id=>esClavo(id)?clavoImporte(id):((importesCents[id]||0)/100);
const PRICE_KEY='navarro360_precio_caja_activa_v1';
function salePrices(){try{return JSON.parse(localStorage.getItem(PRICE_KEY)||'{}')||{}}catch{return {}}}
function assignedRegister(){
 return window.NAVARRO_PRINT_SILENCIOSA?.vinculado?.()===true;
}
function unitCents(id,prices){return Number.isSafeInteger(prices[id])&&prices[id]>0?prices[id]:Math.round((dictionary.get(id)?.price||0)*100)}
function lineAmount(id,qty,prices){return importeFinal(id)||Math.round(qty*unitCents(id,prices))/100}
function editSalePrice(id){
 if(!assignedRegister()||!cart[id])return;
 const prices=salePrices();
 const raw=prompt('Precio por unidad para esta venta: '+dictionary.get(id).name,(unitCents(id,prices)/100).toFixed(2));
 if(raw===null)return;
 const value=raw.trim().replace(',','.');
 if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(value)||Number(value)<=0){alert('Escribe un precio mayor a cero con hasta dos decimales.');return}
 prices[id]=Math.round(Number(value)*100);
 try{localStorage.setItem(PRICE_KEY,JSON.stringify(prices))}catch{alert('No se pudo guardar el precio.');return}
 delete clavoCents[id];delete importesCents[id];
 save();renderCart();renderProducts();
}
function cantidadDesdeImporte(id,importePesos){
 const p=dictionary.get(String(id));
 if(!p||!Number.isFinite(p.price)||p.price<=0||!Number.isFinite(importePesos)||importePesos<=0)return null;
 const price=unitCents(id,salePrices())/100;
 const cantidad=leerCantidad((importePesos/price).toFixed(3));
 if(cantidad===null)return null;
 return {cantidad,real:cantidad*price,diferencia:Math.abs(cantidad*price-importePesos)};
}
const count=()=>Math.round(Object.entries(cart).reduce((s,[id,n])=>s+(id==='00000'?1:n),0)*1000)/1000, subtotal=()=>{const prices=salePrices();return Object.entries(cart).reduce((s,[id,n])=>s+lineAmount(id,n,prices),0)};
function save(){try{const prices=salePrices();const removed=Object.keys(prices).filter(id=>!cart[id]);if(removed.length){for(const id of removed)delete prices[id];localStorage.setItem(PRICE_KEY,JSON.stringify(prices))}localStorage.setItem('navarro_cart_v1',JSON.stringify({...pendingExtraCart,...cart}));localStorage.setItem(CLAVO_KEY,JSON.stringify(clavoCents));localStorage.setItem(IMPORTE_KEY,JSON.stringify(importesCents))}catch{}q('#cart-top-n').textContent=count();q('#floating-n').textContent=count()===1?'1 artículo':formatearCantidad(count())+' unidades';q('#floating-cart').hidden=count()===0;if(q('#mobile-count'))q('#mobile-count').textContent='('+count()+')';if(q('#mobile-total'))q('#mobile-total').textContent=money(subtotal());
 const thumbs=q('#mobile-thumbnails'); if(thumbs){thumbs.textContent=count()?count()+' unidades':'';}
} 
function toast(msg){let t=document.querySelector('.toast');if(t)t.remove();t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.append(t);setTimeout(()=>t.remove(),2400)}
function productResults(){
  // Búsqueda por código siempre exacta, en los 17,835 artículos disponibles.
  const entered=String(search||'').trim();
  const code=entered==='00'?'00000':entered.replace(/\s+/g,'');
  const photoFor=id=>publicList.find(x=>x.id===id)?.img||window.NAVARRO_FOTOS_PAGINA?.[id]||'';
  if (/^\d{5,}$/.test(code)) {
    nameMatches=0;
    const item=dictionary.get(code);
    if (!item)return [];
    const feat=publicList.find(x=>x.id===code);
    return [{...item,display:displayNames[item.id]||item.name,cat:feat?.cat||'Por código',sub:feat?.sub||'',img:photoFor(item.id),photo:feat?.photo||''}];
  }
  if (/^\d+$/.test(code)) {nameMatches=0;return [];} // Código incompleto: nunca adivinar.
  const matchVarios=norm(entered);
  if(matchVarios==='VARIOS'||matchVarios.startsWith('PRODUCTOS VAR')||matchVarios.startsWith('PRODUCTO VAR')){
    nameMatches=1;
    const item=dictionary.get('00000');
    return [{...item,cat:'Todos',sub:'Importe libre',img:''}];
  }
  if(norm(entered)==='PRODUCTOS VARIOS'||norm(entered)==='VARIOS'){
    nameMatches=1;return publicList.filter(p=>p.id==='00000');
  }
  if (!entered) {
    nameMatches=0;
    if(category==='Plomería'&&plomeria)return plomeria.products();
    if(category==='Electricidad'&&electricidad)return electricidad.products();
    return publicList.filter(p=>(category==='Todos'||p.cat===category)&&(!['Construcción','Herramientas'].includes(category)||subcat==='Todos'||p.sub===subcat)).slice(0,LIMIT);
  }
  const engine=window.NAVARRO_BUSCADOR_COMPLETO;
  // Si hay una inconsistencia de versión, no mostrar productos incorrectos.
  if(!engine||engine.total!==LIST.length||engine.genericos!==2189){nameMatches=0;return [];}
  const normalized=norm(entered);
  const manual=Array.from(nv23Products.values()).filter(p=>{
   const value=norm(p.name),needle=normalized;
   return needle.length>=2&&value.includes(needle);
  });
  const found=engine.searchByName(entered,dictionary,photoFor);
  const combined=[...manual,...found];
  nameMatches=combined.length;
  return combined.slice(0,nameLimit);
}
function renderFilters(){
 const visualIcons={"Construcción": "<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path d=\"M5 14h12v9H5zM19 14h12v9H19zM12 25h12v9H12zM26 25h12v9H26zM5 36h12v7H5zM19 36h12v7H19zM33 14h10v9H33z\"/></svg>", "Plomería": "<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path d=\"M8 15h28v9H8zM20 9h9v6h-9zM29 19h10v11H29zM25 31c0 5-4 8-8 8s-8-3-8-8c0-4 8-14 8-14s8 10 8 14z\"/></svg>", "Electricidad": "<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path d=\"M28 3L8 27h14l-4 18 23-27H27l1-15z\"/></svg>", "Herramientas": "<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path d=\"M9 7l7 7 4-4-7-7 9 1 5 9-5 7 16 15-6 6-16-16-6 5-6-5 6-6 5 4 4-4-7-6-3-6z\"/></svg>", "Pintura": "<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path d=\"M6 9h34v10H6zM21 19h5v8h-5zM23 27h2v13h-2zM14 42h20v3H14z\"/></svg>", "Todos": "<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path d=\"M8 8h12v12H8zM28 8h12v12H28zM8 28h12v12H8zM28 28h12v12H28z\"/></svg>"};
 q('#filters').innerHTML=categories.map(c=>`<button type="button" class="filter ${c===category?'active':''}" data-cat="${esc(c)}"><span class="filter-icon" aria-hidden="true">${visualIcons[c]||visualIcons.Todos}</span><span>${esc(c==='Construcción'?'Materiales':c)}</span></button>`).join('');
 const hasSubs=category==='Construcción'||category==='Herramientas';
 q('#subfilters').hidden=!hasSubs;
 const toggle=q('#subfilters-toggle');if(toggle)toggle.hidden=!hasSubs;
 const options=category==='Construcción'?subs:category==='Herramientas'?toolSubs:[];
 q('#subfilters').innerHTML=options.map(c=>`<button type="button" class="subfilter ${c===subcat?'active':''}" data-sub="${esc(c)}">${esc(c==='Todos'?(category==='Herramientas'?'Todas las herramientas':'Todos los materiales'):c)}</button>`).join('');
}
function renderProducts(){
 const plActive=category==='Plomería'&&!search.trim();
 const elActive=category==='Electricidad'&&!search.trim();
 if(plomeria)plomeria.render(plActive);
 if(electricidad)electricidad.render(elActive);
 const results=productResults();q('#listing-title').textContent=elActive&&electricidad?electricidad.title():plActive&&plomeria?plomeria.title():search?'Resultados de búsqueda':category==='Todos'?'Productos destacados':category==='Construcción'?(subcat==='Todos'?'Materiales para construcción':subcat):category==='Herramientas'&&subcat!=='Todos'?subcat:category;
 q('#results-info').textContent=search.trim()&&nameMatches>results.length?('Mostrando '+results.length+' de '+nameMatches+' productos · Refina la búsqueda o muestra más'):results.length+' producto'+(results.length===1?'':'s')+' · Consulta el catálogo';q('#no-results').hidden=results.length>0||plActive||elActive; if(plActive&&plomeria)q('#results-info').textContent=plomeria.intro();if(elActive&&electricidad)q('#results-info').textContent=electricidad.intro();q('#search-more-wrap').hidden=!(search.trim()&&nameMatches>results.length);
 q('#products').innerHTML=results.map(p=>{
 const n=cart[p.id]||0;
 const photoName=p.img||window.NAVARRO_ATLAS?.byCode?.[p.id]||'';
 const atlas=window.NAVARRO_ATLAS;
 const ix=atlas?.files?.[photoName];
 const hasPic=Number.isInteger(ix);
 const posX=hasPic?(ix%atlas.columns)*atlas.size:0;
 const posY=hasPic?Math.floor(ix/atlas.columns)*atlas.size:0;
 const pic=(p.photo&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photo))?
   `<img src="${p.photo}" alt="${esc(p.name)}" loading="lazy" style="max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;border-radius:12px">`:
   hasPic?`<span class="product-sprite" role="img" aria-label="Imagen del catálogo" style="background-position:-${posX}px -${posY}px;background-size:${atlas.columns*atlas.size}px ${atlas.rows*atlas.size}px"></span>`:
   `<span class="product-symbol" aria-hidden="true">${p.cat==='Herramientas'?(toolIcons[p.sub]||'🛠️'):(icons[p.cat]||'📦')}</span>`;
 const qty=p.id==='00000'?'<span class="card-prompt">Ingresar importe</span>':n?`<div class="card-qty"><button type="button" data-dec="${esc(p.id)}" aria-label="Quitar una unidad">−</button><strong aria-live="polite">${formatearCantidad(n)}</strong><button type="button" data-inc="${esc(p.id)}" aria-label="Agregar una unidad">+</button></div>`:'<span class="card-prompt">+ Toca para agregar</span>';
 const pencil=esImporte(p.id)?`<button type="button" class="card-importe" data-importe-edit="${esc(p.id)}" aria-label="Ingresar importe en pesos para ${esc(p.display||p.name)}" title="Ingresar importe en pesos">✏️</button>`:'';
 const stock=window.NAVARRO_EXISTENCIAS?.[p.id]?.[0];
 const stockLabel=Number.isFinite(stock)?'Disponible: '+Math.max(0,stock).toLocaleString('es-MX',{maximumFractionDigits:6})+' · 23 nov 2026':'Existencia por confirmar';
 return `<article class="product tap-product ${n?'in-cart':''}" data-card="${esc(p.id)}" tabindex="0" aria-label="${esc(p.display||p.name)}; precio base ${money(p.price)}. Tocar para sumar una unidad"><div class="product-visual">${pic}${pencil}<span class="product-cat">${esc(p.sub||p.cat)}</span></div><div class="product-info"><h3>${esc(p.display||p.name)}</h3><span class="product-code">Código ${esc(p.id)}</span>${p.id==='00000'?'':'<div class="price-note" data-inventory-code="'+esc(p.id)+'">'+stockLabel+'</div><button type="button" data-inventory-edit="'+esc(p.id)+'" hidden>Ajustar stock</button>'}<div class="product-bottom"><div><div class="price">${p.id==='00000'?'Importe libre':money(p.price)}</div><div class="price-note">${p.id==='00000'?'Base en SIFO: $20.00 · Indica el importe en WhatsApp':'Precio base'+(esImporte(p.id)?' por '+unidadVenta(p.id):'')}</div>${importeFinal(p.id)>0?'<div class="price-note">Importe del carrito: '+money(importeFinal(p.id))+'</div>':''}</div>${qty}</div>${esImporte(p.id)?`<button type="button" class="card-importe-inline" data-importe-edit="${esc(p.id)}" aria-label="Comprar por importe en pesos: ${esc(p.display||p.name)}">✏️ Comprar por importe</button>`:''}</div></article>`;
 }).join('');
}
function openCart(){lastFocus=document.activeElement;q('#overlay').hidden=false;q('#drawer').classList.add('open');q('#drawer').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';renderCart();q('#cart-close').focus()}
function closeCart(){q('#drawer').classList.remove('open');q('#drawer').setAttribute('aria-hidden','true');q('#overlay').hidden=true;document.body.style.overflow='';lastFocus?.focus?.()}
function renderCart(){
 const entries=Object.entries(cart),prices=salePrices(),canEdit=assignedRegister();
 q('#cart-items').innerHTML=entries.length?entries.map(([id,num])=>{
 const p=dictionary.get(id),imp=importeFinal(id),total=lineAmount(id,num,prices);
 if(id==='00000')return `<div class="cart-line"><strong>${esc(p.name)}</strong><small>00 · Cantidad: 1</small><div class="cart-controls"><button type="button" data-varios-edit>✎ Importe</button><button type="button" data-remove="00000">Eliminar</button><span class="line-total">${money(total)}</span></div></div>`;
 return `<div class="cart-line"><strong>${esc(p.name)}</strong><small>${esc(id)} · Precio unitario ${money(unitCents(id,prices)/100)}${imp>0?' · Importe solicitado: '+money(imp):''}</small><div class="cart-controls"><div class="quant"><button type="button" data-dec="${esc(id)}" aria-label="Restar una unidad">−</button><span>${formatearCantidad(num)}</span><button type="button" data-inc="${esc(id)}" aria-label="Sumar una unidad">+</button></div>${canEdit?`<button type="button" data-price-edit="${esc(id)}">✎ Precio</button>`:""}<button type="button" data-qty-edit="${esc(id)}" aria-label="Escribir cantidad">Cantidad</button>${esImporte(id)?`<button type="button" data-importe-edit="${esc(id)}" aria-label="Ingresar importe en pesos">✎ Importe</button>`:''}<button type="button" data-remove="${esc(id)}">Eliminar</button><span class="line-total">${money(total)}</span></div></div>`;
 }).join(''):'<div class="empty-cart"><span style="font-size:50px">🛒</span><b>Tu carrito está vacío</b><p>Busca materiales y agrega lo que necesitas.</p></div>';
 q('#cart-total').textContent=money(subtotal());renderOrderPreview();q('#send-whatsapp').disabled=!entries.length;q('#clear-cart').hidden=!entries.length;
}
function agregarVarios(reemplazar=false){
 const id='00000';
 const prices=salePrices(),unit=unitCents(id,prices);
 const actual=cart[id]?Math.round(lineAmount(id,cart[id],prices)*100):0;
 const raw=reemplazar?window.prompt('Productos varios · Nuevo importe total en pesos',(actual/100).toFixed(2)):window.prompt('Productos varios · Importe a agregar en pesos','');
 if(raw===null)return false;
 const value=raw.trim().replace(',','.');
 if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(value)||Number(value)<=0){window.alert('Escribe un importe mayor a cero con hasta dos decimales.');return false}
 const cents=(reemplazar?0:actual)+Math.round(Number(value)*100);
 const qty=Math.round(cents/unit*1000)/1000;
 if(qty<=0||qty>9999||cents>99999999){window.alert('El importe está fuera del rango del carrito.');return false}
 cart[id]=qty;importesCents[id]=cents;
 save();renderCart();renderProducts();return true;
}
function editarClavo(id){return editarImporte(id);}
function editarImporte(id){
 if(!dictionary.has(id))return false;
 if(!esImporte(id)){window.alert('Este artículo se vende por unidad completa y no admite importe fraccionado.');return false;}
 const p=dictionary.get(id);
 if(!Number.isFinite(p.price)||p.price<=0){window.alert('No es posible convertir importes porque este artículo no tiene precio base positivo.');return false;}
 const previo=importeFinal(id)||(p.price*(cart[id]||0));
 const entrada=window.prompt('Importe en PESOS de '+p.name+' (ejemplo: 10 o 25.50). Precio base: '+money(p.price),previo?previo.toFixed(2):'');
 if(entrada===null)return false;
 const val=String(entrada).trim().replace(/\s/g,'').replace(/^\$/,'').replace(',','.');
 if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(val)||Number(val)<=0){window.alert('Importe inválido. Escribe pesos con máximo 2 decimales.');return false;}
 const cents=Math.round(Number(val)*100);
 if(!Number.isSafeInteger(cents)||cents<1||cents>99999999){window.alert('Importe fuera del límite.');return false;}
 const calc=cantidadDesdeImporte(id,cents/100);
 if(!calc){window.alert('No es posible convertir este importe a una cantidad válida de hasta 3 decimales.');return false;}
 // La diferencia por redondeo de centavos es aceptada por el administrador.
 // WhatsApp conserva la cantidad en hasta 3 decimales; SIFO se ajusta manualmente si hace falta.
 cart[id]=calc.cantidad;
 if(esClavo(id))clavoCents[id]=cents;
 else importesCents[id]=cents;
 save();renderCart();renderProducts();toast(calc.diferencia>=0.005-1e-8?'✓ '+money(cents/100)+' · Según precio base: '+money(calc.real):'✓ Importe: '+money(cents/100));
 return true;
}
function editarCantidad(id){
 if(!dictionary.has(id))return false;
 
 const p=dictionary.get(id);
 const actual=formatearCantidad(cart[id]||1);
 const entrada=window.prompt('Cantidad de '+p.name+(esImporte(id)?' (ejemplos: 0.66, 0.12, 1.25):':' (solo unidades enteras):'),actual);
 if(entrada===null)return false;
 const n=leerCantidad(entrada);
 if(n===null||(!esImporte(id)&&!Number.isInteger(n))){window.alert(esImporte(id)?'Cantidad inválida. Escribe entre 0.001 y 9999, con hasta 3 decimales.':'Este artículo se vende por unidad completa. Escribe una cantidad entera entre 1 y 9999.');return false;}
 cart[id]=n;delete clavoCents[id];delete importesCents[id];save();renderCart();renderProducts();toast('✓ Cantidad actualizada: '+formatearCantidad(n));
 return true;
}
function change(id,amount){
 if(id==='00000'&&amount>0){agregarVarios();return}
 if(!dictionary.has(id))return;
 delete clavoCents[id];delete importesCents[id];
 const n=Math.max(0,Math.min(9999,Math.round(((cart[id]||0)+amount)*1000)/1000));
 if(n)cart[id]=n;else delete cart[id];
 save();renderCart();renderProducts();
}


/* NAVARRO 360 V66: puente seguro del carrito real, sin recargar.
   No modifica precios, búsqueda, escáner, WhatsApp ni SIFO. */
window.NAVARRO_CARRITO_EN_VIVO_V66=Object.freeze({
 version:66,
 snapshot:()=>({...cart}),
 canFractional:id=>dictionary.has(String(id))&&esImporte(String(id)),
 replace:function(entrada){
  if(!entrada||typeof entrada!=='object'||Array.isArray(entrada))
   return {ok:false,reason:'Carrito inválido'};
  const nuevo={};
  for(const [id,valor] of Object.entries(entrada)){
   if(!dictionary.has(id)||typeof valor!=='number'||!Number.isFinite(valor)||
      valor<=0||valor>9999||
      Math.abs(valor*1000-Math.round(valor*1000))>1e-7||
      (!esImporte(id)&&!Number.isInteger(valor)))
     return {ok:false,reason:'Cantidad o presentación inválida para el código '+id};
   nuevo[id]=Math.round(valor*1000)/1000;
  }
  const anterior=cart,clavosAnteriores=clavoCents,importesAnteriores=importesCents;
  const clavosNuevos={...clavoCents},importesNuevos={...importesCents};
  for(const id of new Set([...Object.keys(cart),...Object.keys(nuevo)])){
   if((cart[id]||0)!==(nuevo[id]||0)){
    delete clavosNuevos[id];
    delete importesNuevos[id];
   }
  }
  try{
   cart=nuevo;clavoCents=clavosNuevos;importesCents=importesNuevos;
   save();
   const guardado=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');
   const claves=Object.keys(nuevo);
   if(!guardado||Object.keys(guardado).length!==claves.length||
      claves.some(id=>guardado[id]!==nuevo[id]))throw Error('No se pudo guardar el carrito');
   renderCart();renderProducts();
   return {ok:true,items:claves.length};
  }catch(error){
   cart=anterior;clavoCents=clavosAnteriores;importesCents=importesAnteriores;
   try{save();renderCart();renderProducts()}catch(_){}
   return {ok:false,reason:'No se aplicó el cambio; el carrito anterior se conservó'};
  }
 }
});

/* Escáner: no multiplica clavos, solicita importe. */
window.NAVARRO_ESCANER_AGREGAR=function(rawCode){
 const code=String(rawCode||'').trim();
 if(code==='00'||code==='00000')return {ok:agregarVarios(),especial:'PRODUCTOS VARIOS'};
 if(!/^\d{5,}$/.test(code)||!dictionary.has(code))return {ok:false,reason:'Código no disponible en el catálogo'};
 if(esClavo(code))return editarClavo(code)?{ok:true,quantity:1,importe:clavoImporte(code)}:{ok:false,reason:'Falta confirmar el importe de clavos'};
 const before=cart[code]||0;
 if(before>=9999)return {ok:false,reason:'Este producto alcanzó el máximo de 9,999 unidades'};
 change(code,1);
 try{const saved=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');if(cart[code]===before+1&&saved?.[code]===before+1)return {ok:true,quantity:cart[code]}}catch(_){}
 return {ok:false,reason:'No se confirmó el guardado del carrito. Comprueba las cantidades antes de reintentar'};
};

function composeOrder(){
 const lines=[];
 for(const [id,n] of Object.entries(cart)){
  const p=dictionary.get(id);
  if(!p||!Number.isFinite(n)||n<=0)continue;
  // No enviar como fracción artículos empaquetados o vendidos por pieza.
  if(!esImporte(id)&&!Number.isInteger(n))return '';
  let cantidad=n;
  if(esImporte(id)){
   const importe=importeFinal(id);
   
   if(importe){
    const calc=cantidadDesdeImporte(id,importe);
    if(!calc)return '';
    cantidad=calc.cantidad;
   }
  }
  lines.push(formatearCantidad(cantidad)+' '+id);
 }
 return lines.join('\n');
}
function renderOrderPreview(){
 const target=q('#order-message-preview');if(!target)return;
 const msg=composeOrder();
 target.textContent=msg|| (Object.keys(cart).length?'Revisa cantidades e importes del carrito antes del envío.':'Agrega productos al carrito para preparar el mensaje.');
}
function send(){
 const msg=composeOrder();
 if(!msg){window.alert('Revisa el carrito: los artículos por pieza, caja, saco o tramo requieren cantidades enteras. Los importes por kilo, metro y litro deben convertirse a cantidades válidas.');return;}
 window.open('https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
}
async function copyOrder(){
 const msg=composeOrder();
 if(!msg){window.alert('Revisa las cantidades e importes antes de copiar el pedido.');return;}
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(msg);toast('✓ Pedido copiado');}
 catch{const t=q('#order-message-preview');q('#order-verify').open=true;renderOrderPreview();if(t){const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(t);selection.removeAllRanges();selection.addRange(range);toast('Selecciona el texto para copiarlo')}}
}
/* V23: permite agregar artículos del servidor privado sin alterar ni uno del catálogo base. */
window.NAVARRO_NUEVOS_PRODUCTOS_V23=Object.freeze({
 version:23,
 contains:code=>dictionary.has(String(code)),
 apply:rows=>{
  if(!Array.isArray(rows))return 0;
  let changed=0;
  for(const p of rows){
   if(!p||typeof p!=='object')continue;
   const id=String(p.code||''),name=String(p.name||'').trim();
   const price=Number(p.price),stock=Number(p.stock);
   if(!/^\d{5,30}$/.test(id)||name.length<3||!Number.isFinite(price)||price<=0||!Number.isFinite(stock)||stock<0)continue;
   if(dictionary.has(id)&&!nv23Products.has(id))continue;
   const cat=categories.includes(p.cat)?p.cat:'Todos';
   const unit=['pieza','metro','kilo','litro'].includes(p.unit)?p.unit:'pieza';
   const photo=typeof p.photo==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photo)&&p.photo.length<=70000?p.photo:'';
   const row={id,name,display:name,price,cat,unit,img:'',sub:unit==='pieza'?'':'Venta por '+unit,photo,public:true};
   const prior=nv23Products.get(id);
   if(!prior||JSON.stringify(prior)!==JSON.stringify(row))changed++;
   nv23Products.set(id,row);
   dictionary.set(id,{id,name,price,unit});
   if(Object.hasOwn(pendingExtraCart,id)){cart[id]=pendingExtraCart[id];delete pendingExtraCart[id];}
   if(!publicCodes.has(id)){publicList.unshift(row);publicCodes.add(id);}
   else{const idx=publicList.findIndex(x=>x.id===id);if(idx>=0)publicList[idx]=row;}
   if(!window.NAVARRO_EXISTENCIAS)window.NAVARRO_EXISTENCIAS={};
   if(!window.NAVARRO_EXISTENCIAS[id])window.NAVARRO_EXISTENCIAS[id]=[stock,0];
  }
  if(changed){save();renderProducts();renderCart();}
  return changed;
 }
});
q('#year').textContent=new Date().getFullYear();renderFilters();renderProducts();save();
q('#filters').addEventListener('click',e=>{const btn=e.target.closest('[data-cat]');if(!btn)return;category=btn.dataset.cat;subcat='Todos';renderFilters();q('#subfilters').classList.toggle('expanded',category==='Herramientas');if(category==='Herramientas')q('#subfilters-toggle').setAttribute('aria-expanded','true');renderProducts()});
q('#subfilters-toggle').addEventListener('click',()=>{const open=q('#subfilters').classList.toggle('expanded');q('#subfilters-toggle').setAttribute('aria-expanded',String(open))});
q('#subfilters').addEventListener('click',e=>{const btn=e.target.closest('[data-sub]');if(!btn)return;subcat=btn.dataset.sub;renderFilters();renderProducts()});
q('#search').addEventListener('input',e=>{nameLimit=LIMIT;search=e.target.value;q('#search-mobile').value=search;q('#clear-search').style.display=search?'block':'none';renderProducts()});
q('#clear-search').addEventListener('click',()=>{nameLimit=LIMIT;q('#search').value='';q('#search-mobile').value='';search='';renderProducts();q('#search').focus();q('#clear-search').style.display='none'});
q('#search-more').addEventListener('click',()=>{nameLimit+=LIMIT;renderProducts()});
q('#products').addEventListener('click',e=>{
const especiales=e.target.closest('[data-card="00000"]');
if(especiales){agregarVarios();return}
const btn=e.target.closest('button');if(btn){if(btn.dataset.importeEdit)editarImporte(btn.dataset.importeEdit);else if(btn.dataset.inc)change(btn.dataset.inc,1);else if(btn.dataset.dec)change(btn.dataset.dec,-1);else if(btn.dataset.qtyEdit)editarCantidad(btn.dataset.qtyEdit);return;}const card=e.target.closest('[data-card]');if(!card||!dictionary.has(card.dataset.card))return;if(card.dataset.card==='00000'){agregarVarios();return;}change(card.dataset.card,1);toast('✓ Una unidad agregada al carrito')});
q('#products').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const card=e.target.closest('[data-card]');if(card&&card===e.target){e.preventDefault();if(card.dataset.card==='00000')agregarVarios();else change(card.dataset.card,1)}});
q('#cart-items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-varios-edit')){agregarVarios(true);return;}if(b.dataset.priceEdit){editSalePrice(b.dataset.priceEdit);return;}if(b.dataset.importeEdit){editarImporte(b.dataset.importeEdit);return;}if(b.dataset.remove){const id=b.dataset.remove;delete cart[id];delete clavoCents[id];delete importesCents[id];save();renderCart();renderProducts();return;}if(b.dataset.inc)change(b.dataset.inc,1);if(b.dataset.dec)change(b.dataset.dec,-1);if(b.dataset.qtyEdit)editarCantidad(b.dataset.qtyEdit)});
q('#mobile-cart-open').onclick=openCart;q('#mobile-whatsapp').onclick=()=>{if(count()>0)send();else window.open('https://wa.me/'+WHATSAPP,'_blank','noopener,noreferrer')};q('#search-mobile').addEventListener('input',e=>{nameLimit=LIMIT;search=e.target.value;q('#search').value=search;renderProducts()});q('#cart-top').onclick=openCart;q('#floating-cart').onclick=openCart;q('#cart-close').onclick=closeCart;q('#overlay').onclick=closeCart;
const menuToggle=q('#mobile-nav-toggle'),menuPanel=q('#mobile-menu-panel');if(menuToggle&&menuPanel){menuToggle.addEventListener('click',()=>{const expanded=menuToggle.getAttribute('aria-expanded')==='true';menuPanel.hidden=expanded;menuToggle.setAttribute('aria-expanded',String(!expanded))});menuPanel.addEventListener('click',e=>{if(e.target.closest('a')){menuPanel.hidden=true;menuToggle.setAttribute('aria-expanded','false')}})}
q('#send-whatsapp').onclick=send;q('#copy-order').onclick=copyOrder;q('#clear-cart').onclick=()=>{cart={};clavoCents={};importesCents={};save();renderCart();renderProducts()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&q('#drawer').classList.contains('open'))closeCart()});
})();

