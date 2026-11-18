/* NAVARRO 360 V70 — auditoría fotográfica por códigos.
   Se habilita únicamente cuando la dirección lleva ?auditoria=1.
   No modifica ninguna fotografía publicada ni recoge datos remotos.
*/
(function(){
'use strict';
if(window.NAVARRO_AUDITORIA_FOTOS_V70)return;
window.NAVARRO_AUDITORIA_FOTOS_V70=true;
const $=id=>document.getElementById(id);
const ISSUES='navarro360_v70_fotos_por_revisar';
const issues=()=>{try{const x=JSON.parse(localStorage.getItem(ISSUES)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(_){return {}}};
const remember=x=>{try{localStorage.setItem(ISSUES,JSON.stringify(x));return true}catch(_){return false}};
const bad=new Map();
const date=x=>new Date(x).toLocaleString('es-MX');
function productId(img){
 const card=img?.closest?.('article[data-card]')||null;
 return card&&/^\d{5,30}$/.test(card.dataset.card)?card.dataset.card:'';
}
function snapshot(){
 const grid=$('products'),cards=[...grid?.querySelectorAll('article[data-card]')||[]];
 const bank=window.NAVARRO_FOTOS_TRUPER_V48||{};
 let visibleWithImg=0,withSprite=0,withoutMedia=0;
 const possible=[];
 const seenSources=new Map();
 const duplicates=[];
 for(const card of cards){
  const code=String(card.dataset.card||'');
  const img=card.querySelector('.product-visual img');
  const sprite=card.querySelector('.product-visual .product-sprite,.product-visual .nav-material-photo,.product-visual .nav-material-strip,.product-visual .product-photo');
  if(img){
   visibleWithImg++;
   const src=img.currentSrc||img.src||'';
   if(src&&seenSources.has(src)&&seenSources.get(src)!==code)duplicates.push([code,seenSources.get(src)]);
   else if(src)seenSources.set(src,code);
  }else if(sprite)withSprite++;
  else if(/^\d{5,30}$/.test(code)){withoutMedia++;possible.push(code)}
 }
 const items=Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB.length:0;
 return {
  catalogo:items,
  fotosTruperAsignadas:Object.keys(bank).length,
  tarjetasRenderizadas:cards.length,
  tarjetasConImagen:visibleWithImg,
  tarjetasConSprite:withSprite,
  tarjetasSinMedioDetectable:withoutMedia,
  codigosSinMedioDetectable:possible,
  imagenesConError:[...bad.entries()].map(([code,detail])=>({code,...detail})),
  posiblesImagenesReutilizadas:duplicates,
  reportesManuales:Object.entries(issues()).map(([code,x])=>({code,at:x.at,reason:x.reason}))
 };
}
function csvValue(x){return '"'+String(x==null?'':x).replace(/"/g,'""').replace(/[\r\n]+/g,' ')+'"'}
function exportCSV(){
 const data=snapshot(),lines=[['tipo','codigo','detalle','fecha'].map(csvValue).join(',')];
 for(const code of data.codigosSinMedioDetectable)lines.push(['sin_medio_detectable',code,'Revisar tarjeta visible',''].map(csvValue).join(','));
 for(const x of data.imagenesConError)lines.push(['error_carga',x.code,x.src,x.at?date(x.at):''].map(csvValue).join(','));
 for(const pair of data.posiblesImagenesReutilizadas)lines.push(['imagen_compartida',pair[0],'Mismo origen que '+pair[1]+'; puede ser legítimo',''].map(csvValue).join(','));
 for(const x of data.reportesManuales)lines.push(['reportado_por_vendedor',x.code,x.reason,x.at?date(x.at):''].map(csvValue).join(','));
 const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='NAVARRO_FOTOS_AUDITORIA_'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function render(){
 const root=$('nv70-photo-audit');if(!root)return;
 const d=snapshot();
 const stats=$('nv70-photo-stats');
 stats.textContent='Catálogo: '+d.catalogo+' · Fotos Truper asignadas: '+d.fotosTruperAsignadas+
  ' · Tarjetas visibles: '+d.tarjetasRenderizadas+' · Con imagen: '+d.tarjetasConImagen+
  ' · Con sprite: '+d.tarjetasConSprite+' · Sin medio detectable: '+d.tarjetasSinMedioDetectable+
  ' · Intentos de imagen fallidos: '+d.imagenesConError.length+
  ' · Reportes manuales: '+d.reportesManuales.length+'.';
 const list=$('nv70-photo-list');list.replaceChildren();
 const shown=new Set();
 for(const card of $('products')?.querySelectorAll('article[data-card]')||[]){
  const code=String(card.dataset.card||'');if(!/^\d{5,30}$/.test(code)||shown.has(code))continue;
  if(shown.size>=45)break;
  shown.add(code);
  const item=document.createElement('div');item.className='nv70-photo-item';
  const title=document.createElement('span');
  title.textContent=code+' · '+String(card.querySelector('.product-name')?.textContent||card.textContent||'Producto').trim().slice(0,58);
  const button=document.createElement('button');button.type='button';button.dataset.code=code;
  button.textContent=issues()[code]?'✓ Reportada':'⚑ Reportar foto';
  item.append(title,button);list.appendChild(item);
 }
 const note=$('nv70-photo-note');
 note.textContent='Los totales corresponden a las tarjetas visibles actualmente, no a una validación visual de las 17 mil fotos. Una imagen compartida no es necesariamente un error. Este reporte queda solo en tu dispositivo hasta exportarlo.';
}
function openPanel(){
 if($('nv70-photo-audit'))return;
 const style=document.createElement('style');style.id='nv70-photo-style';
 style.textContent='#nv70-photo-audit{position:fixed;inset:8px;z-index:2147483002;overflow:auto;background:#fff;border:2px solid #b9d2c3;border-radius:16px;padding:16px;color:#173a2c;font:14px/1.5 system-ui;box-shadow:0 8px 50px #0005}#nv70-photo-audit h2{margin:0 0 12px;font-size:20px}#nv70-photo-audit button{border:1px solid #c2dfcc;background:#ebf6ef;color:#17563a;border-radius:9px;padding:9px;min-height:42px;font-weight:750}#nv70-photo-audit .nv70-photo-actions{display:flex;flex-wrap:wrap;gap:8px}#nv70-photo-list{max-height:55vh;overflow:auto;margin:12px 0}.nv70-photo-item{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #e3ede5}.nv70-photo-item span{font-size:12px}.nv70-photo-item button{flex:0 0 auto;font-size:11px}#nv70-photo-stats{background:#f2f8f4;border-radius:10px;padding:10px;font-size:12px}#nv70-photo-note{font-size:11px;color:#597365}';
 document.head.append(style);
 const modal=document.createElement('section');modal.id='nv70-photo-audit';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML='<h2>📷 Auditoría de fotos NAVARRO 360</h2><div class="nv70-photo-actions"><button type="button" id="nv70-photo-close">Cerrar</button><button type="button" id="nv70-photo-refresh">Actualizar</button><button type="button" id="nv70-photo-export">⬇ Descargar CSV</button></div><p id="nv70-photo-stats"></p><p id="nv70-photo-note"></p><div id="nv70-photo-list"></div>';
 document.body.appendChild(modal);
 $('nv70-photo-close').addEventListener('click',()=>modal.remove());
 $('nv70-photo-refresh').addEventListener('click',render);
 $('nv70-photo-export').addEventListener('click',exportCSV);
 $('nv70-photo-list').addEventListener('click',e=>{
  const b=e.target.closest('button[data-code]');if(!b)return;
  const all=issues();
  if(all[b.dataset.code])delete all[b.dataset.code];
  else all[b.dataset.code]={at:Date.now(),reason:'Revisar imagen asociada al código'};
  remember(all);render();
 });
 render();
}
document.addEventListener('error',e=>{
 const img=e.target;if(img?.tagName!=='IMG')return;
 const code=productId(img);if(!code)return;
 bad.set(code,{src:(img.currentSrc||img.src||'').slice(0,400),at:Date.now()});
},true);
window.NAVARRO_AUDITORIA_FOTOS_ESTADO_V70=Object.freeze({version:70,snapshot,exportCSV,openPanel});
function init(){
 if(new URLSearchParams(location.search).get('auditoria')!=='1')return;
 const btn=document.createElement('button');btn.type='button';btn.textContent='📷 Auditar fotografías';
 btn.style.cssText='position:fixed;left:12px;bottom:calc(80px + env(safe-area-inset-bottom));z-index:2147482901;background:#154b35;color:white;border:0;border-radius:13px;padding:12px;font:800 13px system-ui;box-shadow:0 4px 18px #0004';
 document.body.appendChild(btn);btn.addEventListener('click',openPanel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();