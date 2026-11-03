/* NAVARRO 360 | Recuperar fotografías de los catálogos originales del negocio.
   Se ejecuta en GitHub Actions. Solo genera assets y vista de fotos; no modifica
   códigos, precios, el carrito, WhatsApp, SIFO ni el buscador. */
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=process.cwd();
const MOBILE=path.join(ROOT,'navarro360-movil');
const PAGE=path.join(MOBILE,'index.html');
const FILES=[
 ['catalogo-polimex.pdf','Polimex'],
 ['catalogo-pvc-hidraulico.pdf','Hidráulico'],
 ['catalogo-galvanizado.pdf','Galvanizado'],
 ['catalago-conexiones-cpvc.pdf','CPVC'],
 ['catalogo-pvc.pdf','PVC'],
 ['catalogo-malla.pdf','Malla'],
 ['catalogo-mosquiteros.pdf','Mosquiteros']
];
const SKIP_CPVC=new Set(['7777000504','7777000505','7777000506','7777000507','7777000517','7777000519','7777000518','7777000516','7777000514','7777000515','7777000495','7777000496']);
function assert(x,msg){if(!x)throw new Error(msg)}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()}
function tokens(s){const stop=new Set(['DE','DEL','LA','EL','LOS','LAS','Y','A','UN','UNA','PARA','POR','CON','PULGADA','PULGADAS']);return new Set(normalize(s).split(' ').filter(x=>x.length>1&&!stop.has(x)))}
function sameProduct(a,b){
 if(normalize(a)===normalize(b))return true;
 const aa=tokens(a),bb=tokens(b);let shared=0;
 for(const x of aa)if(bb.has(x))shared++;
 return shared>=2&&shared/Math.max(1,aa.size,bb.size)>=0.61;
}
function decodeText(s){return s.replace(/\\([0-7]{1,3})/g,(_,v)=>String.fromCharCode(parseInt(v,8))).replace(/\\([nrtbf()\\])/g,(_,v)=>({'n':'\n','r':'\r','t':'\t','b':'\b','f':'\f','(':'(',')':')','\\':'\\'}[v]));}
function extractPDF(pdf){
 const buf=fs.readFileSync(pdf),all=buf.toString('latin1');
 assert(all.startsWith('%PDF-'),'PDF no válido: '+pdf);
 const starts=[...all.matchAll(/(?:^|\n)(\d+)\s+\d+\s+obj\s*\r?\n/g)],objs=new Map();
 for(let i=0;i<starts.length;i++){
  const m=starts[i],st=m.index+m[0].length,end=i+1<starts.length?starts[i+1].index:all.length;
  const section=all.slice(st,end),e=section.lastIndexOf('endobj');if(e<0)continue;
  const chunk=section.slice(0,e),sm=/\bstream\r?\n/.exec(chunk),dict=sm?chunk.slice(0,sm.index):chunk;
  let binary=null;
  if(sm){const start=st+sm.index+sm[0].length,len=Number(/\/Length\s+(\d+)/.exec(dict)?.[1]);if(!Number.isInteger(len)||len<=0||start+len>buf.length)continue;binary=buf.subarray(start,start+len);}
  objs.set(Number(m[1]),{dict,binary});
 }
 const matches=[];let pages=0,images=0;
 for(const entry of objs.values()){
  if(!/\/Type\s*\/Page\b/.test(entry.dict))continue;
  pages++;
  const cid=Number(/\/Contents\s+(\d+)\s+\d+\s+R/.exec(entry.dict)?.[1]),content=objs.get(cid);
  if(!content?.binary)continue;
  let stream;try{stream=(/\/FlateDecode/.test(content.dict)?zlib.inflateSync(content.binary):content.binary).toString('latin1');}catch{continue;}
  const ref=new Map();
  for(const m of entry.dict.matchAll(/\/img(\d+)\s+(\d+)\s+\d+\s+R/g))ref.set('img'+m[1],Number(m[2]));
  const events=[];
  for(const m of stream.matchAll(/\bBT\b([\s\S]*?)\bET\b/g)){
   const t=/1\s+0\s+0\s+1\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm/.exec(m[1]);if(!t)continue;
   const parts=[...m[1].matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(x=>decodeText(x[1]));
   if(parts.length)events.push({type:'text',idx:m.index,x:Number(t[1]),y:Number(t[2]),value:parts.join('').trim()});
  }
  for(const m of stream.matchAll(/\bq\s+(-?\d+(?:\.\d+)?)\s+0\s+0\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+cm\s+\/(img\d+)\s+Do\s+Q/g)){
   events.push({type:'image',idx:m.index,x:Number(m[3]),y:Number(m[4]),width:Number(m[1]),height:Number(m[2]),img:m[5]});
  }
  const texts=events.filter(x=>x.type==='text');
  const codes=texts.filter(x=>/^\d{5,14}$/.test(x.value)&&x.x>65&&x.x<300).map(x=>{
   const title=texts.filter(t=>t.idx<x.idx&&t.x<150&&t.y>x.y+7&&t.y<x.y+38&&t.value.length>8&&!/^\d/.test(t.value)).sort((a,b)=>b.idx-a.idx)[0];
   return {...x,title:title?.value||''};
  });
  for(const img of events.filter(x=>x.type==='image'&&ref.has(x.img))){
   images++;
   const best=codes.map(c=>({c,d:Math.abs(c.y-(img.y+img.height*.65))})).sort((a,b)=>a.d-b.d)[0];
   if(!best||best.d>48||!best.c.title)continue;
   const obj=objs.get(ref.get(img.img));if(!obj?.binary||!/\/DCTDecode/.test(obj.dict))continue;
   const jpg=obj.binary;
   if(jpg.length<550||jpg[0]!==255||jpg[1]!==216||jpg[jpg.length-2]!==255||jpg[jpg.length-1]!==217)continue;
   matches.push({code:best.c.value,title:best.c.title,bytes:jpg,page:pages});
  }
 }
 return {matches,pages,images};
}
function readDb(html){
 const m=/window\.NAVARRO_DB=(\[[\s\S]*?\]);/.exec(html);
 assert(m,'Catálogo incrustado no encontrado; sin cambios');
 return new Map(JSON.parse(m[1]).map(r=>[String(r[0]),String(r[1])]));
}
function photoScript(map){
 return "(function(){'use strict';\n"
 +"const photos="+JSON.stringify(map)+";\n"
 +"window.NAVARRO_FOTOS_PAGINA=photos;\n"
 +"const st=document.createElement('style');st.textContent='.navarro-photo-recuperada{width:128px;height:128px;max-width:100%;object-fit:contain;display:block;margin:auto;background:#fff;border-radius:10px}';document.head.appendChild(st);\n"
 +"function bind(){const grid=document.getElementById('products');if(!grid)return;const apply=()=>{for(const card of grid.querySelectorAll('[data-card]')){const code=card.getAttribute('data-card');if(card.dataset.navarroPhoto||!Object.prototype.hasOwnProperty.call(photos,code))continue;const visual=card.querySelector('.product-visual');if(!visual)continue;const old=visual.querySelector('.product-sprite,.product-symbol');if(!old)continue;const img=document.createElement('img');img.className='navarro-photo-recuperada';img.loading='lazy';img.decoding='async';img.alt='Fotografía del producto '+code;img.onerror=function(){img.remove();old.style.display='';};img.src='./assets/'+photos[code];old.style.display='none';visual.insertBefore(img,old);card.dataset.navarroPhoto=code;}};apply();new MutationObserver(apply).observe(grid,{childList:true,subtree:true});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();\n"
 +"})();\n";
}
function main(){
 let html=fs.readFileSync(PAGE,'utf8');
 assert(html.includes('function composeOrder()')&&html.includes('NAVARRO_CREATE_PLOMERIA'),'No coincide con la tienda móvil aprobada');
 const originalOrder=/function composeOrder\(\)\{[\s\S]*?\n\}/.exec(html)?.[0];
 assert(originalOrder&&originalOrder.includes("join('\\n')"),'Formato WhatsApp inesperado');
 const db=readDb(html),map={},files=[],report=[],counter={};
 for(const [pdf,group] of FILES){
  const p=path.join(ROOT,pdf);assert(fs.existsSync(p),'Falta catálogo original '+pdf);
  const out=extractPDF(p);let approved=0;
  for(const item of out.matches){
   if(!/^\d{5,14}$/.test(item.code)||SKIP_CPVC.has(item.code)||map[item.code]||!db.has(item.code)||!sameProduct(item.title,db.get(item.code)))continue;
   const name='navarro-publicada-'+item.code+'.jpg';
   map[item.code]=name;files.push({name,bytes:item.bytes});approved++;
  }
  counter[group]=approved;
  report.push(group+': '+approved+' fotografías verificadas de '+out.matches.length+' hallazgos, '+out.pages+' páginas, '+out.images+' imágenes');
 }
 const total=Object.keys(map).length;
 console.log('RESUMEN DE FOTOS RECUPERADAS\n'+report.join('\n')+'\nTOTAL: '+total);
 assert(counter.Polimex>=25&&counter['Hidráulico']>=35&&counter.Galvanizado>=80&&total>=170,'Faltan demasiadas fotos; se aborta sin cambios');
 const assetDir=path.join(MOBILE,'assets');fs.mkdirSync(assetDir,{recursive:true});
 for(const f of files){
  const dest=path.join(assetDir,f.name);
  if(fs.existsSync(dest)&&!fs.readFileSync(dest).equals(f.bytes))throw new Error('Colisión de foto distinta '+f.name);
 }
 const marker='<script src="./fotos-recuperadas.js?v=7"></script>';
 if(!html.includes(marker)){
  assert(html.includes('</body>'),'Estructura HTML incompatible');
  html=html.replace('</body>',marker+'</body>');
 }
 assert(originalOrder===/function composeOrder\(\)\{[\s\S]*?\n\}/.exec(html)?.[0],'Cambio no permitido en WhatsApp');
 for(const f of files){const dest=path.join(assetDir,f.name);if(!fs.existsSync(dest))fs.writeFileSync(dest,f.bytes);}
 fs.writeFileSync(path.join(MOBILE,'fotos-recuperadas.js'),photoScript(map),'utf8');
 fs.writeFileSync(PAGE,html,'utf8');
 fs.writeFileSync(path.join(MOBILE,'REPORTE_FOTOS_RECUPERADAS.txt'),[
  'NAVARRO 360 | FOTOGRAFÍAS DE CATÁLOGOS ORIGINALES',...report,'TOTAL: '+total,
  'La imagen se vincula únicamente si código y nombre coinciden.',
  'Se mantienen las ilustraciones ya existentes como respaldo de carga.',
  'No cambia catálogo, precios, carrito, WhatsApp, SIFO ni controles Truper.'
 ].join('\n')+'\n','utf8');
 const sw=path.join(MOBILE,'sw.js');
 let swText=fs.readFileSync(sw,'utf8');
 if(swText.includes('navarro360-fullstore-v6-electricidad')){
  swText=swText.replace('navarro360-fullstore-v6-electricidad','navarro360-fullstore-v7-fotos');
  swText=swText.replace("'./electricidad.css?v=6'","'./electricidad.css?v=6','./fotos-recuperadas.js?v=7'");
  fs.writeFileSync(sw,swText,'utf8');
 }
 console.log('FOTOS GUARDADAS EN ASSETS Y VINCULADAS A TARJETAS. WHATSAPP SIN CAMBIOS.');
}
main();
