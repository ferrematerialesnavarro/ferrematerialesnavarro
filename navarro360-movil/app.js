(function(){'use strict';
const raw=["7777001648|CEMENTO GRIS POR SACO|Construcción||Cementos","7777001647|CEMENTO GRIS POR KILO|Construcción||Cementos","7777001635|CEMENTO BLANCO SACO 25|Construcción||Cementos","7777001636|CEMENTO BLANCO POR KILO|Construcción||Cementos","7777000023|MORTERO|Construcción||Mortero","7777001051|ARENA DE RIO SIN CERNIR|Construcción||Agregados","7777001078|VARILLA 3 OCTAVOS|Construcción||Acero","7777001080|VARILLA MEDIA|Construcción||Acero","7777001054|BLOCK|Construcción||Block","7777001055|LADRILLO GRANDE|Construcción||Ladrillo","7777000628|CODO 90° PVC 1 Y MEDIA|PVC|1½”|Codos","7777000629|CODO 45° PVC 1 Y MEDIA|PVC|1½”|Codos","7777000631|COPLE PVC 1 Y MEDIA|PVC|1½”|Coples","7777000630|TEE PVC 1 Y MEDIA|PVC|1½”|Tees","7777000626|TUBO PVC 1 Y MEDIA PULGADA POR TRAMO|PVC|1½”|Tubos","7777001409|CODO 90° PVC DE 2 PULGADAS|PVC|2”|Codos","7777001405|CODO 45° PVC DE 2 PULGADAS|PVC|2”|Codos","7777001399|TEE PVC DE 2 PULGADAS|PVC|2”|Tees","7777001385|REDUCCION PVC DE 2 A 1 Y MEDIA|PVC|2”|Reducciones","7777001408|CODO 90° PVC DE 3 PULGADAS|PVC|3”|Codos","7777001407|CODO 90° PVC DE 4 PULGADAS|PVC|4”|Codos","7777001871|CRUZ PVC 4|PVC|Sin diámetro|Cruces","7777000489|CODO 90° CPVC DE 1 PULGADA|CPVC|1”|Codos","7777000500|COPLE CPVC DE 1 PULGADA|CPVC|1”|Coples","7777000501|TEE CPVC DE 1 PULGADA|CPVC|1”|Tees","7777000477|TUBO CREMA CPVC DE 1 PULGADA POR TRAMO|CPVC|1”|Tubos","7777000491|CODO CPVC DE MEDIA|CPVC|½”|Codos","7777000497|CODO OREJA CPVC DE MEDIA PLASTICO|CPVC|½”|Codos","7777000524|TAPON CPVC DE MEDIA|CPVC|½”|Tapones","7777000490|CODO 90° CPVC DE TRES CUARTOS|CPVC|¾”|Codos","7777000502|TEE CPVC DE TRES CUARTOS|CPVC|¾”|Tees","7777001242|CODO 45° HIDRAULICO 1 PULGADA UN CUARTO|Hidráulico|1¼”|Codos","7777001228|CONECTOR MACHO HIDRAULICO 1 PULGADA UN CUARTO|Hidráulico|1¼”|Adaptadores","7777001208|TEE HIDRAULICO 1 PULGADA UN CUARTO|Hidráulico|1¼”|Tees","7777001249|CODO 90° HIDRAULICO 1 PULGADA|Hidráulico|1”|Codos","7777001209|TEE HIDRAULICO DE 1 PULGADA|Hidráulico|1”|Tees","7777001210|TEE HIDRAULICO DE 3 CUARTOS|Hidráulico|¾”|Tees","7777001219|CRUZ HIDRAULICO DE MEDIA|Hidráulico|½”|Cruces","7777000387|CODO 90° POLIMEX ROJO DE 1 PULGADA|Polimex|1”|Codos","7777000433|COPLE POLIMEX ROJO DE 1 PULGADA|Polimex|1”|Coples","7777000432|TEE POLIMEX ROJO DE 1 PULGADA|Polimex|1”|Tees","7777000439|TAPON POLIMEX ROJO DE 1 PULGADA|Polimex|1”|Tapones","7777000468|CRUZ POLIMEX ROJO DE MEDIA|Polimex|½”|Cruces","7777000205|CODO 90° COBRE DE 1 PULGADA|Cobre|1”|Codos","7777000217|COPLE COBRE DE 1 PULGADA|Cobre|1”|Coples","7777000224|TEE COBRE DE 1 PULGADA|Cobre|1”|Tees","7777000243|TUBO M COBRE DE 1 PULGADA|Cobre|1”|Tubos","7777000237|YEE COBRE DE 1 PULGADA|Cobre|1”|Yees","7777000203|CODO 90° COBRE DE MEDIA|Cobre|½”|Codos","7777000227|TEE COBRE DE MEDIA|Cobre|½”|Tees","7777000204|CODO 90° COBRE DE TRES CUARTOS|Cobre|¾”|Codos","7777000064|CODO NIPLE GALVANIZADO DE 1 UN CUARTO|Galvanizado|1¼”|Codo niple","7777000047|CODO 90° GALVANIZADO DE 1 UN CUARTO|Galvanizado|1¼”|Codos 90°","7777000074|COPLE GALVANIZADO DE 1 UN CUARTO|Galvanizado|1¼”|Coples","7777000118|NIPLE ROSCA CORRIDA GALVANIZADO DE 1 PULGADA|Galvanizado|1”|Niples","7777000099|TEE GALVANIZADO DE 1 PULGADA|Galvanizado|1”|Tees","7777000054|CODO 45° GALVANIZADO DE 1 PULGADA|Galvanizado|1”|Codos 45°","7777000073|COPLE GALVANIZADO DE 1 PULGADA|Galvanizado|1”|Coples","7777000068|CODO RINCON GALVANIZADO DE 1 PULGADA|Galvanizado|1”|Codos rincón"];
const items=raw.map(function(s){var a=s.split('|');return {code:a[0],name:a[1],mat:a[2],measure:a[3],kind:a[4]};});
const byCode=new Map(items.map(function(x){return [x.code,x];}));
const materials=['PVC','CPVC','Hidráulico','Polimex','PPR','Cobre','Galvanizado'];
const matSymbol={'PVC':'⚪','CPVC':'🟡','Hidráulico':'🔵','Polimex':'🔴','PPR':'🟢','Cobre':'🟠','Galvanizado':'🔩','Construcción':'🧱'};
const $=function(s){return document.querySelector(s);};
const esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
const norm=function(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();};
const value=function(key,fb){try{return JSON.parse(localStorage.getItem(key))||fb;}catch(_){return fb;}};
let cart=value('nav360-demo-cart',{});let selected=value('nav360-demo-filters',{mat:'PVC',measure:'Todas',kind:'Todas'});let timer=null;
function save(){localStorage.setItem('nav360-demo-cart',JSON.stringify(cart));localStorage.setItem('nav360-demo-filters',JSON.stringify(selected));}
function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(timer);timer=setTimeout(function(){t.classList.remove('on');},2400);}
function tab(name){document.querySelectorAll('.screen').forEach(function(e){e.hidden=e.id!=='screen-'+name;});document.querySelectorAll('[data-nav]').forEach(function(e){e.classList.toggle('active',e.dataset.nav===name);});if(name==='plomeria')renderPlom();if(name==='buscar')renderSearch();if(name==='pedido')renderCart();window.scrollTo({top:0,behavior:'auto'});}
function chips(host,options,active,key){$(host).innerHTML=options.map(function(x){return '<button class="chip '+(active===x?'selected':'')+'" data-filter="'+key+'" data-value="'+esc(x)+'">'+esc(x)+'</button>';}).join('');}
function getQty(code){var n=Number(cart[code]);return Number.isFinite(n)?Math.max(0,Math.min(999,Math.trunc(n))):0;}
function pictureSymbol(p){
 var kind=norm(p.kind);
 if(/TUBOS|ACERO/.test(kind))return '▱';
 if(/CODOS/.test(kind))return '↳';
 if(/TEES/.test(kind))return '┬';
 if(/COPLE|UNION|NIPLES/.test(kind))return '═';
 if(/REDUCCIONES/.test(kind))return '⇥';
 if(/CRUCES/.test(kind))return '✚';
 if(/TAPONES/.test(kind))return '◉';
 if(/YEES/.test(kind))return 'Ｙ';
 return matSymbol[p.mat]||'◈';
}
function productControls(p){
 var qty=getQty(p.code);
 return qty>0?
 '<div class="product-quantity" aria-label="Cantidad de '+esc(p.name)+'"><button class="quantity-button" data-minus="'+esc(p.code)+'" aria-label="Quitar una unidad de '+esc(p.name)+'">−</button><span class="quantity-current" aria-live="polite">'+qty+'</span><button class="quantity-button" data-plus="'+esc(p.code)+'" aria-label="Agregar una unidad de '+esc(p.name)+'">+</button></div>':
 '<div class="product-tap-hint" aria-hidden="true"><span>＋</span> Toca para agregar</div>';
}
function products(container,arr){
 $(container).innerHTML=arr.length?arr.slice(0,80).map(function(p){
  var colour=norm(p.mat).toLowerCase();
  var qty=getQty(p.code);
  var label=qty>0?p.name+'. '+qty+' unidades. Toca para agregar otra unidad o usa los botones de cantidad.':p.name+'. Toca para agregar una unidad.';
  return '<article class="product product-tappable '+(qty>0?'is-selected':'')+'" data-card="'+esc(p.code)+'" tabindex="0" aria-label="'+esc(label)+'"><div class="product-art '+esc(colour)+'" role="img" aria-label="Ilustración de referencia, no fotografía exacta"><span class="picture-symbol" aria-hidden="true">'+pictureSymbol(p)+'</span><span class="art-type">'+esc(p.kind)+'</span><span class="art-notice">IMAGEN REFERENCIAL</span></div>'+
  '<div class="product-description"><span class="product-material">'+esc(p.mat)+'</span><b class="product-name">'+esc(p.name)+'</b><small class="product-code">Código: '+esc(p.code)+'</small><span class="product-price">Precio pendiente de sincronización</span></div>'+
  productControls(p)+'</article>';
 }).join(''):
 '<div class="empty">Sin artículos de muestra con esos filtros. La tienda completa sigue en la computadora; aquí aún estamos probando la aplicación móvil.</div>';
}
function renderPlom(){chips('#home-materials',materials,selected.mat,'material');chips('#plom-materials',materials,selected.mat,'material');var mat=items.filter(function(p){return p.mat===selected.mat;});var measure=['Todas'].concat([...new Set(mat.map(function(p){return p.measure||'Sin diámetro';}))]);if(measure.indexOf(selected.measure)<0)selected.measure='Todas';chips('#plom-measures',measure,selected.measure,'measure');var withMeasure=mat.filter(function(p){return selected.measure==='Todas'||(p.measure||'Sin diámetro')===selected.measure;});var kinds=['Todas'].concat([...new Set(withMeasure.map(function(p){return p.kind;}))]);if(kinds.indexOf(selected.kind)<0)selected.kind='Todas';chips('#plom-types',kinds,selected.kind,'kind');var final=withMeasure.filter(function(p){return selected.kind==='Todas'||p.kind===selected.kind;});$('#plom-count').textContent=final.length+' de muestra';products('#plom-results',final);save();}
function renderSearch(){
 var q=norm($('#search').value);
 var found=items.filter(function(p){
  if(!q)return true;
  if(/^[0-9]{5,}$/.test(q))return p.code===q;
  var words=q.split(/\s+/).filter(Boolean);
  var title=norm(p.name);
  return words.every(function(w){return title.includes(w);});
 });
 $('#search-count').textContent=found.length+' de muestra';
 $('#search-title').textContent=q?'Coincidencias':'Selección inicial';
 products('#search-results',found);
}
function renderCart(){
 var valid=Object.keys(cart).filter(function(code){return byCode.has(code)&&getQty(code)>0;});
 var total=valid.reduce(function(t,code){return t+getQty(code);},0);
 $('#cart-count').textContent=total;
 var bottom=document.getElementById('bottom-cart-count');
 if(bottom){bottom.textContent=total;bottom.hidden=!total;}
 $('#cart-summary').innerHTML=total?'<div class="cart-summary"><b>'+valid.length+' productos diferentes</b><span>'+total+' unidades en tu lista</span></div>':'';
 $('#copy-order').disabled=!total;
 var clear=document.getElementById('clear-cart');if(clear)clear.disabled=!total;
 $('#cart-items').innerHTML=valid.map(function(code){
  var p=byCode.get(code);
  return '<article class="cart-row"><div class="cart-row-heading"><strong>'+esc(p.name)+'</strong><button class="remove-item" data-remove="'+code+'" aria-label="Eliminar '+esc(p.name)+'">✕</button></div>'+
   '<small>'+esc(code)+' · '+esc(p.mat)+'</small><div class="cart-quantity-line"><span>Cantidad</span><div class="controls"><button data-minus="'+code+'" aria-label="Quitar unidad">−</button><span>'+getQty(code)+'</span><button data-plus="'+code+'" aria-label="Agregar unidad">+</button></div></div></article>';
 }).join('')||'<div class="empty"><span class="empty-illustration">🛒</span><b>Aún no tienes productos</b><p>Entra a Buscar o Plomería y toca la foto o cualquier parte de un producto para agregarlo.</p><button class="empty-action" data-nav="plomeria">Explorar plomería</button></div>';
}
function add(code,delta){
 if(!byCode.has(code))return;
 var next=Math.max(0,Math.min(999,getQty(code)+delta));
 if(next)cart[code]=next;else delete cart[code];
 save();renderPlom();renderSearch();renderCart();
 if(delta>0&&next===1)toast('Agregado a tu lista de prueba');
}
document.addEventListener('click',function(e){
 var btn=e.target.closest('button');
 if(btn){
  if(btn.dataset.nav){tab(btn.dataset.nav);return;}
  if(btn.dataset.filter){
   if(btn.dataset.filter==='material'){selected.mat=btn.dataset.value;selected.measure='Todas';selected.kind='Todas';tab('plomeria');return;}
   if(btn.dataset.filter==='measure'){selected.measure=btn.dataset.value;selected.kind='Todas';}
   if(btn.dataset.filter==='kind')selected.kind=btn.dataset.value;
   renderPlom();return;
  }
  // Los controles no propagan un segundo añadido a la tarjeta.
  if(btn.dataset.plus){add(btn.dataset.plus,1);return;}
  if(btn.dataset.minus){add(btn.dataset.minus,-1);return;}
  if(btn.dataset.remove){delete cart[btn.dataset.remove];save();renderPlom();renderSearch();renderCart();return;}
  return;
 }
 var card=e.target.closest('.product[data-card]');
 if(card){add(card.dataset.card,1);}
});
document.addEventListener('keydown',function(e){
 if(e.key!=='Enter' && e.key!==' ')return;
 var card=e.target.closest('.product[data-card]');
 if(!card||e.target!==card)return;
 e.preventDefault();add(card.dataset.card,1);
});
$('#header-cart').addEventListener('click',function(){tab('pedido');});
$('#clear-cart').addEventListener('click',function(){if(!Object.keys(cart).some(function(c){return getQty(c)>0;}))return;if(window.confirm('¿Vaciar toda la lista de prueba?')){cart={};save();renderPlom();renderSearch();renderCart();toast('Lista de prueba vaciada');}});
$('#search').addEventListener('input',renderSearch);
$('#clear-search').addEventListener('click',function(){$('#search').value='';renderSearch();});
$('#copy-order').addEventListener('click',function(){var txt=Object.keys(cart).filter(function(c){return byCode.has(c)&&cart[c]>0;}).map(function(c){return cart[c]+' '+c;}).join('\n');if(!txt)return;var done=function(){toast('Lista de prueba copiada (no enviada)');};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done).catch(function(){prompt('Copia esta lista de prueba:',txt);});}else prompt('Copia esta lista de prueba:',txt);});
renderPlom();renderSearch();renderCart();tab('inicio');
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){});});}
})();