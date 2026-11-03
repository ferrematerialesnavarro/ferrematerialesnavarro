/* NAVARRO 360 — BAÑOS Y ACCESORIOS V1 (03/NOV/2026)
 * 452 SKU seleccionados de 17,835 artículos. Carrito/escáner/SIFO intactos.
 * Los precios vienen de NAVARRO_DB, nunca se publican como sincronizados en vivo.
 * Ocho vínculos a fotos reales del fabricante validados por clave/modelo.
 */
(function(){'use strict';
if(window.NAVARRO_BANOS_INSTALADO)return;
window.NAVARRO_BANOS_INSTALADO=true;
const GROUPS=[["Regaderas y accesorios","🚿",["7506240608660","7502309734967","7506240608639","7506240649441","7506240649434","7502309734936","7502309734950","7502309734943","7506240608301","7518510363018","7506610231696","7506240694854","7506240694847","7506240611370","7506240611363","7506240694878","7506240694861","7506240629412","7506240625674","7506240699002","7506240699026","7506240699019","7506240633471","7506240633594","7506240633600","7506240633792","7506240633839","7506610223158","7506240633846","7506240600800","7506240691341","7506240607656","7506240691334","7506240607663","7506610233553","7506240651345","7506610203396","7506240651369","7501206697351","7506610203419","7506240651338","7501206697368","7506610233546","7506240611554","7506240625643","7506240611561","7506240611523","7506240625650","7506240630968","7506240630975","7506240625612","7506240611530","7506240625629","7506240611578","7506240630982","7506240630906","7506240630999","7506240633655","7506240633679","7506240633662"]],["Llaves y mezcladoras","🚰",["7502309732543","7502309732550","7506240609254","7506240652854","7518680013010","7506240606024","7506240652861","7506240683773","7506240683780","7506240652885","7506240652878","7506240613299","7506240618775","7506384001068","7506384001105","7506240686774","7506610234383","7506240686781","7506240608325","7506240688556","7506240693598","7506240688549","7506240688358","7501206697283","7501206697306","7506240612636","7506240693604","7506240603450","7506240649663","7501206697290","7506240649427","7506240612674","7506240612643","7506240693611","7506240612667","7506240688365","7506240612650","7506240688532","7502309732826","7506240644422","7502309732802","7506069015182","7506240606017","7506240652830","7190642014015","7506384002010","7506240609247","7506240652847","7506240606000","7506240652823","7506240644453","7506384001747","7190611804012","7506240683759","7506069044045","7506384002065","7506240618768","7501206697269","7506240611691","7501206687482","7501206687512","7506240637202","7501206687475","7506240689065","7501206687499","7501206687529","7506240688976","7506240688990","7506240612605","7506240689034","7506384003765","7506240683766","7506240695974","7506240696001","7506240637196","7502309739238","7506610221796","7506240696483","7506240696506","7506240696490","7506610222175","7501206684627","7506610203303","7506610226104","7506610226128","7506610226111","7506610203099","7506344146730","7506610227477","7506240628927","7506240633921","7506610224094","7506240633938","7506240629030","7506240634157","7506610224087","7506240634041","7506240634171","7506610224063","7506240634065"]],["Sanitarios y asientos","🚽",["7502309735575","7502309735582","7506240630531","7502309735568","7506610234673","7506610234680","7506240680963","7506240667131","7506240667124","7506610231153","7506240630548","7506240630555","7506240667155","7506240667148","7506240630562","7506240630579","7506610208964"]],["Reparación de sanitario","🔧",["7506610221673","7506240620037","7501206699263","7506610221260","7506610221277","7506610214811","7506240620044","7506610214804","7506240658443","7506610221666","7506240658436","7506325113751","7501206698969","7777000901","7506240673590","7506240691150","7506240623779","7506325113386","710631904010","7506240694076","7501605590840","7506240691228","7506325114246","7500051170903","7506610233508","7506610233515","7506610233539","7506240673248","7506610233522","7506240602927","7506610231986","7506240673255","7506240602934","7506240639633","7506240692430","7501206698921","7501206698938","7506240694083","7501206698945","7506240694090","7506240617778","7506240694038","7506610224278","7506610224513","7506240694069","7506610224292","7506610224285","7506610224520"]],["Céspoles y desagües","🛁",["7506240613602","7506610228238","7506325113034","7506610232129","7506610234871","7506610234857","7506610234840","7506240629474","7506240672753","7506610234864","7506240629481","7506240672760","7506325114277","7506240635727","7506240660118","7501206699614","7506240629337","7501206699607","7501206699591","7506325107408","8501728197703","7506325100812","7506325101062","7506325120391","7506240660125","7506610234017","7506240660132","7506610234000","7501206699621","7506240629320","7506325114505","7506240660149","7506610209008","7506610233836","7506240629351","7506610233850","7506610233874","7506610233898","7506610234062","7506610233881","7506610232556","7506610232563","7506610232570","7506610233379","7506610233386","7506240678625","7506610233393","7501206699010","8421152017111","7506240600701","7506240667681","7506610207516","7506610207523","7506240631408","7501206699003","7506240600718","7506240631415","7506240681342","7506610207530","7506240600725","7501206686270","7506240631422","7506240668107","7506610207547","7506610205741"]],["Mangueras de alimentación","🔗",["7502309736916","7502309736862","7506610232303","7501206697498","7502309736923","7506610232310","7502309736879","7502309736893","7502309736886","7502309736909","7506240634669","7506240634621","7506240611103","7501206698099","7506240634638","7506610203914","7506240636625","7501206698365","7506240634676","7506240605430","7506610203921","7506240634683","7506240605447","7506240634645","7506610205406","7506610205420","7506240611172","7506610205413","7506610205437","7506240634652","7506240636618","7501206698358","7506610203938","7501605507213","710631908292"]],["Accesorios para baño","🧼",["7501206697450","7506240617259","7506240692386","7506240680222","7506240692379","7506240680253","7506240692362","7501206684566","7502309739993","7503041324010","7503041324003","7506240620051","7506610224841","7506610224858","7506240620068","7506240617204","7503041324362","7503041324393","7503041324379","7503041324386","7506610200296","7506610200319","7506610200302","7506610224995","7506240620235","7506240642565","7506610225008","7506240617686","7506610225015","7506240617211","7503041324249","7503041324270","7506610200203","7503041324256","7506610200227","7503041324263","7506610200210","7506240642541","7506240620259","7506240617648","7506240620143","7506610225022","7506610225039","7503041324447","7503041324478","7503041324454","7503041324461","7506610200357","7506610200371","7506610200364","7506240642527","7506240617235","7503041324409","7503041324430","7506240617716","7503041324416","7503041324423","7506240617228","7503041324287","7503041324317","7506240689980","7503041324294","7503041324300","7506610200234","7506240642534","7506610200258","7506610200241","7506240620112","7506610224964","7506240620174","7506610224971","7506240636458","7506610203792"]],["Refacciones de baño","⚙️",["7506240634348","7506240634362","7502309735308","7506240634317","7506240634294","7506240634225","7506240644828","7502309735278","7502309735292","7506610224124","7502309735322","7506240600282","7506240600275","7506240600299","7501206697320","7501206697313","7503041324157","7506240644446","7506240644477","7506240613312","7506610204607","7501206687307","7501206684641","7506240634393","7506240634256","7506240614371","7506240634218","7506240644811","7506240634386","7506240673842","7506240608653"]],["Llaves de paso y alimentación","🚰",["7506610233720","7506610233737","7506240679066","7506240697749","7506240658498","7506610222106","7506610222113","7506610222120","7501206695944","7506240695189","7501973731302","7501206695951","7506240697732","7501206695968","7506240634515","7501206684078","7506240637219","7506240637226","7506240634522","7506240679042","7506240620778","7506344164505","7501973706591"]]];
const OFFICIAL={"7506240660118":"CE-237.jpg","7506240660125":"CE-294.jpg","7506240660149":"CE-295.jpg","7502309734936":"REGEL-6.jpg","7506240608639":"REGEL-4.jpg","7506240673590":"SA-008.jpg","7506240642534":"AQA-72.jpg","7506240630531":"AWC-35B.jpg"};
const HTML=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const N=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const pesos=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v);
function validFamily(f,n){
 if(/^Regaderas/.test(f))return /^(?:REGADERA |BRAZO .*REGADERA|MANGUERA .*REGADERA|CHAPETON.*REGADERA)/.test(n);
 if(/^Llaves y mezcladoras/.test(f))return /^(?:MONOMANDO |MEZCLADORA |LLAVE INDIVIDUAL )/.test(n)&&/LAVABO|FREGADERO|REGADERA|TINA/.test(n)&&!/ELECTRICA|[0-9]{3,4}W/.test(n);
 if(/^Sanitarios/.test(f))return /^(?:ASIENTO |SANITARIO )/.test(n)&&/WC|SANITARIO/.test(n);
 if(/^Reparación/.test(f))return /^(?:SAPO |PALANCA |BOTON |VALVULA |JUEGO .*ACCESORIOS.*WC|EMPAQUE UNION TANQUE|BOLSA CON .*WC|KIT DE INSTALACION PARA WC|BRIDA .*WC)/.test(n)&&!/FLOTADOR ELECTRICO|ASPERSOR/.test(n);
 if(/^Céspoles/.test(f))return /^(?:CESPOL |COLADERA |CONTRACANASTA |CONTRA PARA LAVABO |CASQUILLO .*CONTRACANASTA|CANASTILLA INOX.*CONTRACANASTA|JUEGO 2 TAPAS .*COLADERA|TAPA CIEGA .*COLADERA)/.test(n)&&!/FUMIGADORA|AZOTEA|EXHIBIDOR/.test(n);
 if(/^Mangueras/.test(f))return /^MANGUERA /.test(n)&&/PWC|PARA WC|LAVABO|FREGADERO/.test(n)&&!/GAS|JARDIN|RIEGO|REGADERA/.test(n);
 if(/^Accesorios/.test(f))return /^(?:TOALLERO |PORTARROLLO |JABONERA |PORTAVASO CEPILLERO|JUEGO .*ACCESORIOS PARA BANO|CEPILLO SANITARIO|BARRA ANGULAR CON JABONERA)/.test(n)&&!/COCINA/.test(n);
 if(/^Refacciones/.test(f))return /^(?:CARTUCHO CERAMICO |MANERAL |JUEGO.*MANERALES|AIREADOR |RESISTENCIA PARA REGADERA)/.test(n)&&!/RODILLO|PINTAR|GAS/.test(n);
 if(/^Llaves de paso/.test(f))return /^LLAVE (?:ANGULAR |DE PASO |DE EMPOTRAR |PARA EMPOTRAR |PARA LAVABO|PARA FREGADERO)/.test(n);
 return false;
}
function brand(n){
 return /\bFOSET\b/.test(n)?'Foset':
        /\bPRETUL\b/.test(n)?'Pretul':
        /\bTRUPER\b/.test(n)?'Truper':
        /\bBASIC\b/.test(n)?'Basic':
        /\bAQUA\b/.test(n)?'Aqua':
        'Otras marcas';
}
function typeOf(f,n){
 if(f==='Regaderas y accesorios')
  return /REGADERA ELECTRICA|BRAZO PLASTICO PARA REGADERA ELECTRICA/.test(n)?'Eléctricas':
   /^BRAZO |^CHAPETON/.test(n)?'Brazos y chapetones':
   /^MANGUERA /.test(n)?'Mangueras de regadera':
   /DE TELEFONO/.test(n)?'De teléfono':
   /PLATO/.test(n)?'Plato / lluvia':'Tradicionales';
 if(f==='Llaves y mezcladoras')
  return /FREGADERO/.test(n)?'Fregadero':/REGADERA|TINA/.test(n)?'Regadera / tina':'Lavabo';
 if(f==='Sanitarios y asientos')return /^ASIENTO/.test(n)?'Asientos WC':'Sanitarios';
 if(f==='Reparación de sanitario')
  return /^SAPO /.test(n)?'Sapos':/^PALANCA |^BOTON /.test(n)?'Palancas y botones':/^VALVULA /.test(n)?'Válvulas de sanitario':'Kits, empaques y fijaciones';
 if(f==='Céspoles y desagües')return /^CESPOL /.test(n)?'Céspoles':/COLADERA/.test(n)?'Coladeras':'Contras y casquillos';
 if(f==='Mangueras de alimentación')return /WC/.test(n)?'Para WC':/LAVABO/.test(n)?'Para lavabo':'Para fregadero';
 if(f==='Accesorios para baño')
  return /^JUEGO /.test(n)?'Juegos de baño':/^PORTARROLLO /.test(n)?'Portarrollos':/^TOALLERO /.test(n)?'Toalleros':
   /^JABONERA /.test(n)?'Jaboneras':/^PORTAVASO/.test(n)?'Cepilleros':'Otros accesorios';
 if(f==='Refacciones de baño')return /^CARTUCHO /.test(n)?'Cartuchos':/^MANERAL |^JUEGO/.test(n)?'Manerales':
   /^AIREADOR /.test(n)?'Aireadores':'Regaderas eléctricas';
 return /ANGULAR/.test(n)?'Llaves angulares':'Otras llaves';
}
function finish(n){
 return /NEGRO/.test(n)?'Negro':/CROMOORO|CROMO ORO/.test(n)?'Cromo-oro':
 /NIQUEL SATIN|SATINADO|SATIN\b/.test(n)?'Satinado':
 /CROMO|CROMADA/.test(n)?'Cromo':/BLANCO|BLANCA/.test(n)?'Blanco':
 /HUESO/.test(n)?'Hueso':/BEIGE/.test(n)?'Beige':
 /GRIS/.test(n)?'Gris':/AZUL/.test(n)?'Azul':'';
}
function sizeOf(f,n){
 if(f==='Mangueras de alimentación'){
  const cm=n.match(/\b(35|40|50|60|80|100)\s*CM\b/);
  const con=n.match(/\b(12)\s*X\s*(78|12)\b/);
  return [con?'½″ × '+(con[2]==='78'?'⅞″':'½″'):'',cm?cm[1]+' cm':''].filter(Boolean).join(' · ')||'';
 }
 if(f==='Sanitarios y asientos')return /ALARGADO/.test(n)?'Alargado':/REDONDO/.test(n)?'Redondo':'';
 if(f==='Reparación de sanitario'){
  const inch=n.match(/\b(?:SAPO|VALVULA DESCARGA|WC)\s*(2|3)\b/);
  return inch?inch[1]+'″':'';
 }
 if(f==='Regaderas y accesorios'){
  const electric=n.match(/\b(145|165)CM\b/);
  if(electric)return electric[1]==='145'?'14.5 cm':'16.5 cm';
  const sh=n.match(/\b(212|3|4|6|8|10|12)\s*(?:CON |SIN |PLATO |ABS |METALICA |GRIS|$)/);
  return sh?(sh[1]==='212'?'2½':sh[1])+'″':'';
 }
 if(f==='Céspoles y desagües'){
  const diam=n.match(/\b(114|112|312|212)\b/);
  if(diam)return {'114':'1¼″','112':'1½″','312':'3½″','212':'2½″'}[diam[1]];
  const col=n.match(/COLADERA\s*(5|4|3)\b/);
  return col?col[1]+'″':'';
 }
 if(f==='Llaves y mezcladoras'){
  const lav=n.match(/\b(?:LAVABO|FREGADERO|MEZCLADORA)\s*(4|8)\b/);
  if(lav)return lav[1]+'″';
  return '';
 }
 if(f==='Llaves de paso y alimentación')return /\b12\b/.test(n)?'½″':'';
 if(f==='Refacciones de baño'){
  const mm=n.match(/\b(25|35|40)\s*MM\b/);return mm?mm[1]+' mm':'';
 }
 return '';
}
function photoFor(p,atlas){
 const file=atlas?.byCode?.[p.id];
 const ix=atlas?.files?.[file];
 if(Number.isInteger(ix)){
  return '<span class="product-sprite" role="img" aria-label="Fotografía de catálogo" style="background-position:-'+((ix%atlas.columns)*atlas.size)+'px -'+(Math.floor(ix/atlas.columns)*atlas.size)+'px;background-size:'+(atlas.columns*atlas.size)+'px '+(atlas.rows*atlas.size)+'px"></span>';
 }
 const fallback='<span class="nav-bath-icon" role="img" aria-label="Imagen referencial, no fotografía exacta">'+p.icon+'</span>';
 const official=OFFICIAL[p.id];
 const photo=official?'https://www.truper.com/media/import/imagenes/'+official:window.NAVARRO_FOTOS_PAGINA?.[p.id];
 if(!photo||typeof photo!=='string')return fallback;
 if(!(/^https:\/\/www\.truper\.com\/media\/import\/imagenes\/[A-Za-z0-9_.-]+\.jpe?g$/i.test(photo)||/^navarro-[A-Za-z0-9_.-]+\.jpe?g$/i.test(photo)))return fallback;
 const src=/^https:/.test(photo)?photo:'./assets/'+photo;
 return fallback+'<img class="nav-bath-photo" alt="Fotografía del producto '+HTML(p.name)+'" loading="lazy" decoding="async" src="'+HTML(src)+'">';
}
function init(){
 const grid=document.getElementById('products'),filters=document.getElementById('filters'),title=document.getElementById('listing-title');
 if(!grid||!filters||!title||!Array.isArray(window.NAVARRO_DB))return;
 const table=new Map(window.NAVARRO_DB.map(r=>[String(r[0]),r]));
 const rows=[],rejected=[];
 for(const [family,icon,codes] of GROUPS){
  for(const id of codes){
   const r=table.get(id),n=N(r?.[1]),price=Number(r?.[2]);
   if(!r||!/^\d{5,}$/.test(id)||!Number.isFinite(price)||price<=0||!validFamily(family,n)){
    rejected.push(id);continue;
   }
   rows.push({id,name:String(r[1]),price,family,icon,type:typeOf(family,n),size:sizeOf(family,n),finish:finish(n),brand:brand(n)});
  }
 }
 const section=document.createElement('section');section.id='navarro-banos-panel';section.hidden=true;section.className='nav-bath-panel';
 grid.parentNode.insertBefore(section,grid);
 const css=document.createElement('style');css.id='nav-bath-styles';
 css.textContent='.nav-bath-panel[hidden]{display:none!important}.nav-bath-panel{padding:14px 12px;margin:12px 0 16px;background:#fff;border:1px solid #dfe5ed;border-radius:18px;box-shadow:0 6px 22px #071a3910;color:#15314c}.nav-bath-title{font-size:20px;color:#0b2c4e;font-weight:850;margin:0 0 5px}.nav-bath-intro{font-size:12px;line-height:1.55;color:#5d7184;margin:0 0 12px}.nav-bath-step{border-top:1px solid #e4eaf1;padding:11px 0}.nav-bath-step b{font-size:12px;display:block;margin-bottom:8px;color:#253e57}.nav-bath-options{display:flex;gap:7px;flex-wrap:wrap}.nav-bath-chip{min-height:42px;border:1px solid #d1ddea;background:#f8fafd;color:#263e59;border-radius:10px;padding:9px 10px;font-size:12px;font-weight:800;cursor:pointer;touch-action:manipulation}.nav-bath-chip[aria-pressed=true]{background:#102b54;border-color:#102b54;color:white}.nav-bath-sub{font-size:11px;color:#64788b;margin:8px 0;line-height:1.5}.nav-bath-brand{font-size:11px;font-weight:800;color:#286a7d}.nav-bath-icon{font-size:38px;display:grid;place-items:center;width:100%;height:100%;background:#eef5fa}.nav-bath-photo{width:100%;height:100%;max-height:150px;position:absolute;inset:0;object-fit:contain;background:white}.nav-bath-photo[hidden]{display:none!important}.nav-bath-more{display:block;width:100%;min-height:44px;border:0;color:#fff;background:#102b54;border-radius:12px;font-weight:800;margin:10px 0 16px}.nav-bath-empty{padding:25px 12px;text-align:center;background:white;border-radius:12px;color:#52647c}.nav-bath-counter{font-size:12px;font-weight:700;color:#587184;margin:10px 0 3px}';
 document.head.appendChild(css);
 let selection={family:'',type:'',size:'',finish:'',brand:''},sort='sugeridos',limit=48,queued=false;
 const uniq=(rs,k)=>[...new Set(rs.map(r=>r[k]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
 const valid=()=>rows.filter(r=>(!selection.family||r.family===selection.family)&&(!selection.type||r.type===selection.type)&&(!selection.size||r.size===selection.size)&&(!selection.finish||r.finish===selection.finish)&&(!selection.brand||r.brand===selection.brand));
 const byPrice=(a,b)=>a.price-b.price||a.name.localeCompare(b.name,'es',{numeric:true});
 function sorted(){
  const rs=valid().slice();
  if(sort==='precio')return rs.sort(byPrice);
  if(sort==='nombre')return rs.sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}));
  // Variedad por familia con artículos económicos primero, sin ocultar los costosos.
  const groups=GROUPS.map(([f])=>rs.filter(r=>r.family===f).sort(byPrice));
  const out=[];let more=true;while(more){more=false;for(const g of groups){if(g.length){out.push(g.shift());more=true}}}return out;
 }
 const chip=(k,v,label,active)=>'<button type="button" class="nav-bath-chip" data-bath-key="'+HTML(k)+'" data-bath-value="'+HTML(v)+'" aria-pressed="'+String(active)+'">'+HTML(label)+'</button>';
 const step=(label,key,values,all)=>'<div class="nav-bath-step"><b>'+HTML(label)+'</b><div class="nav-bath-options">'+chip(key,'',all,!selection[key])+values.map(x=>chip(key,x,x,selection[key]===x)).join('')+'</div></div>';
 function panel(){
  let html='<h3 class="nav-bath-title">🛁 Baños y accesorios</h3><p class="nav-bath-intro">Regaderas, mezcladoras, sanitarios, céspoles, mangueras y refacciones. Filtra por tipo, medida, acabado o marca. Cada artículo utiliza el mismo carrito de WhatsApp.</p>';
  html+=step('1 · Subcatálogo','family',GROUPS.filter(([f])=>rows.some(r=>r.family===f)).map(g=>g[0]),'Todos');
  const same=rows.filter(r=>!selection.family||r.family===selection.family);
  if(selection.family){
   const types=uniq(same,'type');
   if(types.length>1)html+=step('2 · Tipo de producto','type',types,'Todos');
   const typed=same.filter(r=>!selection.type||r.type===selection.type);
   const sizes=uniq(typed,'size');
   if(sizes.length>1)html+=step('3 · Medida','size',sizes,'Todas');
   const fit=typed.filter(r=>!selection.size||r.size===selection.size);
   const finishes=uniq(fit,'finish');if(finishes.length>1)html+=step('4 · Acabado / color','finish',finishes,'Todos');
  }
  const brands=uniq(same,'brand');if(brands.length>1)html+=step('Marca','brand',brands,'Todas');
  html+='<div class="nav-bath-step"><b>Orden de productos</b><div class="nav-bath-options">'+[
   ['sugeridos','Variedad económica'],['precio','Menor precio'],['nombre','Nombre A–Z']
  ].map(([k,l])=>'<button type="button" class="nav-bath-chip" data-bath-sort="'+k+'" aria-pressed="'+String(sort===k)+'">'+l+'</button>').join('')+'</div></div>';
  html+='<p class="nav-bath-counter">'+valid().length+' productos encontrados · '+rows.length+' productos seleccionados</p><p class="nav-bath-sub">Precios de la copia del catálogo, no sincronizados con SIFO. Las fotos del fabricante se muestran solo para modelos verificados. Las demás son referenciales cuando no existe una foto asignada.</p>';
  section.innerHTML=html;
 }
 function cart(){
  try{const c=JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}');return c&&typeof c==='object'&&!Array.isArray(c)?c:{}}catch{return {}}
 }
 function render(){
  const all=sorted(),part=all.slice(0,limit),qty=cart(),atlas=window.NAVARRO_ATLAS;
  const signature=[selection.family,selection.type,selection.size,selection.finish,selection.brand,sort,limit].join('|');
  panel();
  let html=part.map(p=>{
   const count=Math.max(0,Math.min(9999,Math.trunc(Number(qty[p.id])||0)));
   const controls=count?'<div class="card-qty"><button type="button" data-dec="'+p.id+'" aria-label="Quitar unidad">−</button><strong aria-live="polite">'+count+'</strong><button type="button" data-inc="'+p.id+'" aria-label="Agregar unidad">+</button></div>':'<span class="card-prompt">+ Toca para agregar</span>';
   return '<article class="product tap-product '+(count?'in-cart':'')+'" data-card="'+p.id+'" data-bath-render="'+HTML(signature)+'" tabindex="0" aria-label="'+HTML(p.name)+'; '+HTML(pesos(p.price))+'. Toca para agregar"><div class="product-visual">'+photoFor(p,atlas)+'<span class="product-cat">'+HTML(p.size||p.type)+'</span></div><div class="product-info"><span class="nav-bath-brand">'+HTML(p.brand)+'</span><h3>'+HTML(p.name)+'</h3><small class="product-code">Código '+p.id+' · '+HTML(p.type)+'</small><div class="product-bottom"><div><div class="price">'+HTML(pesos(p.price))+'</div><div class="price-note">Precio de catálogo · confirmar</div></div>'+controls+'</div></div></article>';
  }).join('');
  if(!part.length)html='<div class="nav-bath-empty" data-bath-render="'+HTML(signature)+'">No hay artículos con esta combinación. Cambia algún filtro.</div>';
  grid.innerHTML=html;
  if(all.length>part.length){
   const btn=document.createElement('button');btn.type='button';btn.className='nav-bath-more';btn.dataset.bathMore='1';btn.textContent='Mostrar más ('+(all.length-part.length)+' restantes)';grid.appendChild(btn);
  }
  title.textContent='Baños y accesorios';
  const info=document.getElementById('results-info');if(info)info.textContent='Mostrando '+part.length+' de '+all.length+' productos · catálogo de referencia';
  const none=document.getElementById('no-results');if(none)none.hidden=true;
 }
 function active(){
  const t=title.textContent.trim();
  return (t==='Baños'||t==='Baños y accesorios')&&!document.getElementById('search')?.value.trim()&&!document.getElementById('search-mobile')?.value.trim();
 }
 function ensureTab(){
  let button=filters.querySelector('[data-cat="Baños"]');
  if(!button){
   button=document.createElement('button');button.type='button';button.className='filter';button.dataset.cat='Baños';
   button.innerHTML='<span class="filter-icon" aria-hidden="true">🛁</span><span>Baños</span>';
   filters.insertBefore(button,filters.querySelector('[data-cat="Todos"]')||null);
  }
  button.classList.toggle('active',active());
 }
 function sync(){
  ensureTab();const showing=active();section.hidden=!showing;if(!showing)return;
  const signature=[selection.family,selection.type,selection.size,selection.finish,selection.brand,sort,limit].join('|');
  if(grid.firstElementChild?.getAttribute('data-bath-render')!==signature)render();
 }
 function schedule(){if(queued)return;queued=true;Promise.resolve().then(()=>{queued=false;sync()})}
 section.addEventListener('click',e=>{
  const b=e.target.closest('button[data-bath-key],button[data-bath-sort]');if(!b)return;
  if(b.dataset.bathSort){sort=b.dataset.bathSort;limit=48;render();return}
  const k=b.dataset.bathKey,v=b.dataset.bathValue||'';
  if(k==='family')selection={family:v,type:'',size:'',finish:'',brand:''};
  else if(k==='type'){selection.type=v;selection.size='';selection.finish=''}
  else if(k==='size'){selection.size=v;selection.finish=''}
  else if(k==='finish')selection.finish=v;
  else if(k==='brand'){selection.brand=v;selection.type='';selection.size='';selection.finish=''}
  limit=48;render();
 });
 grid.addEventListener('click',e=>{if(active()&&e.target.closest('[data-bath-more]')){limit+=48;render()}});
 grid.addEventListener('error',e=>{if(e.target?.classList?.contains('nav-bath-photo'))e.target.hidden=true},true);
 new MutationObserver(schedule).observe(filters,{childList:true,subtree:false});
 new MutationObserver(schedule).observe(grid,{childList:true,subtree:false});
 ['search','search-mobile'].forEach(id=>document.getElementById(id)?.addEventListener('input',schedule));
 sync();
 window.NAVARRO_BANOS_ESTADO=Object.freeze({
  version:1,source:window.NAVARRO_DB.length,curated:GROUPS.reduce((a,g)=>a+g[2].length,0),integrated:rows.length,rejected:Object.freeze(rejected),
  byCategory:GROUPS.map(([family])=>({family,total:rows.filter(r=>r.family===family).length})),photoLinks:8,cartUnchanged:true,scannerUnchanged:true
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();