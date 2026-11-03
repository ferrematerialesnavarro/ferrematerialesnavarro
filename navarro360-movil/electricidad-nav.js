/* NAVARRO 360 ELECTRICIDAD V6: clasificador basado en el catalogo recuperado. Sin precios duplicados. */
(function(){'use strict';
function normElec(name){return String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();}
function classifyElec(name){
 const n=normElec(name);
 if(/\bCABLE\b/.test(n)&&/\bELECTRODO\b|\bACERADO\b/.test(n))return null;
 let family="",type="",size="",presentation="Por pieza";
 if(/\bCHALUPA\b|GRAPAS PARA CABLE|FAJILLO PARA CABLE|TAPA PARA EXTERIOR PARA CONTACTO/.test(n)){
  family="Cajas y accesorios";
  type=/CHALUPA/.test(n)?"Chalupas":/TAPA/.test(n)?"Tapas":"Sujeción de cable";
 }else if(/\bCABLE\b|CORDON ELECTRIC/.test(n)){
  family="Cables y conductores";
  type=/DUPLEX/.test(n)?"Cable dúplex":/1 POLO/.test(n)?"Cable unipolar":/USO RUDO DEL 3 X/.test(n)?"Cable 3 polos (uso rudo)":/USO RUDO DEL 2 X/.test(n)?"Cable 2 polos (uso rudo)":/USO RUDO/.test(n)?"Cable uso rudo":/TELEFONO|ANTENA|BOCINA|GRABADORA/.test(n)?"Telefonía y señal":"Otros cables";
  const mx=n.match(/USO RUDO DEL (\d+) X (\d+)/),g=n.match(/\b(?:DEL|CALIBRE)\s+(\d{1,2})\b/);
  if(mx)size=mx[1]+" × "+mx[2];else if(g)size="Cal. "+g[1];
 }else if(/CONDUIT|POLIDUCTO/.test(n)){
  family="Canalización y conduit";
  type=/POLIDUCTO/.test(n)?"Poliducto":/TUBO CONDUIT/.test(n)?(/METAL/.test(n)?"Tubo metálico":"Tubo plástico"):/CURVA/.test(n)?"Curvas":/COPLE/.test(n)?"Coples":/REDUCCION/.test(n)?"Reducciones":/CONECTOR/.test(n)?"Conectores":"Otros accesorios";
  size=/\b(?:DE )?MEDIA\b/.test(n)?"½”":/\b(?:3|TRES) CUARTOS\b/.test(n)?"¾”":/\b1(?: UN)? CUARTO\b/.test(n)?"1¼”":/\b1 PULGADA\b/.test(n)?"1”":"";
 }else if(/\bCONTACTO\b|\bAPAGADOR\b|\bTIMBRE\b|\bPLACA\b/.test(n)){
  family="Contactos y apagadores";
  type=/TIMBRE/.test(n)?"Timbres":/PLACA/.test(n)?"Placas y combinados":/APAGADOR/.test(n)&&/CONTACTO/.test(n)?"Combinados":/APAGADOR/.test(n)?"Apagadores":"Contactos";
 }else if(/\bFOCO\b|\bLAMPARA\b|\bREFLECTOR\b|\bSOCKET\b|\bSOQUET\b|\bLUMINARIA\b/.test(n)){
  family="Iluminación";
  type=/REFLECTOR/.test(n)?"Reflectores":/FOCO/.test(n)?"Focos":/SOCKET|SOQUET/.test(n)?"Sockets y soquetes":/LUMINARIA/.test(n)?"Luminarias":"Lámparas";
  const m=n.match(/(\d+)\s*W\b/);if(m)size=m[1]+" W";
 }else if(/CENTRO DE CARGA|PASTILLA.*(?:LUZ|SQURDY)|FUSIBLE CASA|BASE PARA MEDIDOR|ZAPATAS PARA MEDIDOR|CONECTOR DE VARILLA DE TIERRA/.test(n)){
  family="Protección y tableros";
  type=/CENTRO DE CARGA/.test(n)?"Centros de carga":/PASTILLA/.test(n)?"Pastillas eléctricas":/FUSIBLE/.test(n)?"Fusibles":"Medidor y tierra física";
  const m=n.match(/(\d+)\s*(?:AMPERES|A)\b/);if(m)size=m[1]+" A";
 }else if(/\bCLAVIJA\b|ADAPTADOR TRIPLE CLAVIJA|ADAPTADOR UNIVERSAL DE CA/.test(n)){
  family="Clavijas y adaptadores";
  type=/CLAVIJA/.test(n)&&!/ADAPTADOR/.test(n)?"Clavijas":"Adaptadores";
 }else if(/CINTA AISLANTE|CINTA DE AISLAR|CINTA ELECTRICA/.test(n)){
  family="Cintas aislantes";type="Cintas de aislamiento";
 }else if(/FLOTADOR ELECTRICO|RESISTENCIA PARA (?:REGALDERA|REGADERA) ELECTRICA|CONECTOR ZAPA$/.test(n)){
  family="Otros eléctricos";type=/FLOTADOR/.test(n)?"Controles":/RESISTENCIA/.test(n)?"Resistencias":"Conectores";
 }else return null;
 if(/POR METRO\b/.test(n))presentation="Por metro";
 else if(/POR CAJA\b/.test(n))presentation="Por caja";
 else if(/POR ROLLO\b/.test(n))presentation="Por rollo";
 else if(/POR TRAMO\b/.test(n))presentation="Por tramo";
 if(family==="Canalización y conduit"&&!size){
  if(/\b(?:DE )?1(?: UN)? CUARTO\b/.test(n))size="1¼”";
  else if(/\b(?:DE )?1 PULGADA\b/.test(n))size="1”";
 }
 return {family,type,size,presentation};
}

const FAMILIES=[['Cables y conductores','🔌'],['Canalización y conduit','〰️'],['Contactos y apagadores','🔘'],['Iluminación','💡'],['Protección y tableros','⚡'],['Clavijas y adaptadores','🔋'],['Cajas y accesorios','📦'],['Cintas aislantes','🧷'],['Otros eléctricos','🔧']];
const escapeHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function create({dictionary,panel,onChange,isApproved}){
 if(!dictionary || !panel || typeof onChange!=='function')return null;
 const ready=typeof isApproved==='function'&&window.NAVARRO_BUSCADOR_GENERICO?.expected===2189&&window.NAVARRO_BUSCADOR_GENERICO?.loaded===2189;
 const rows=[];
 if(ready){for(const [id,p] of dictionary.entries()){
  if(!isApproved(id,p.name))continue;
  const attributes=classifyElec(p.name);
  if(attributes)rows.push({...attributes,id,record:p});
 }}
 rows.sort((a,b)=>FAMILIES.findIndex(x=>x[0]===a.family)-FAMILIES.findIndex(x=>x[0]===b.family)||a.record.name.localeCompare(b.record.name,'es',{numeric:true}));
 let state={family:'',type:'',size:'',presentation:''};
 const count=family=>rows.filter(r=>r.family===family).length;
 const unique=(base,key)=>[...new Set(base.map(x=>x[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
 const shortlist=()=>rows.filter(p=>(!state.family||p.family===state.family)&&(!state.type||p.type===state.type)&&(!state.size||p.size===state.size)&&(!state.presentation||p.presentation===state.presentation));
 const choice=(label,key,val,active,extra)=>'<button type="button" class="el-chip'+(active?' el-active':'')+'" data-el-key="'+key+'" data-el-value="'+escapeHtml(val)+'" aria-pressed="'+(active?'true':'false')+'">'+(extra||'')+'<span>'+escapeHtml(label)+'</span></button>';
 function step(num,label,buttons){return '<section class="el-step"><div class="el-step-title"><span class="el-index">'+num+'</span><strong>'+escapeHtml(label)+'</strong></div><div class="el-options">'+buttons+'</div></section>';}
 function render(active){
  panel.hidden=!active;if(!active)return;
  let html='<div class="el-header"><div><span class="el-eyebrow">NAVARRO 360 · ELECTRICIDAD</span><h3>Encuentra lo necesario para tu instalación</h3><p>Selecciona la familia, el tipo, el calibre o medida y la presentación. Puedes cambiar cualquier filtro sin empezar de nuevo.</p></div><button type="button" class="el-reset" data-el-key="reset" data-el-value="">Restablecer</button></div>';
  html+='<p class="el-safety">Productos de catálogo general. Los de Grupo Truper se consultan por código de barras exacto en el buscador.</p>';
  const first=FAMILIES.filter(f=>count(f[0])>0).map(([name,symbol])=>choice(name,'family',name,state.family===name,'<span class="el-symbol" aria-hidden="true">'+symbol+'</span><small>'+count(name)+'</small>')).join('');
  html+=step(1,'Subcatálogo',first);
  if(state.family){
   const familyRows=rows.filter(r=>r.family===state.family);
   const types=unique(familyRows,'type');
   html+=step(2,'Tipo de producto',choice('Todos los tipos','type','',!state.type)+types.map(v=>choice(v,'type',v,state.type===v)).join(''));
   const withType=familyRows.filter(r=>!state.type||r.type===state.type);
   const sizes=unique(withType,'size');
   if(sizes.length){
    const sizeLabel=state.family==='Cables y conductores'?'Calibre / configuración':state.family==='Iluminación'?'Potencia':state.family==='Protección y tableros'?'Amperaje':'Medida';
    html+=step(3,sizeLabel,choice('Todas las medidas','size','',!state.size)+sizes.map(v=>choice(v,'size',v,state.size===v)).join(''));
   }
   const withSize=withType.filter(r=>!state.size||r.size===state.size);
   const presentations=unique(withSize,'presentation');
   if(presentations.length>1){
    html+=step(sizes.length?4:3,'Presentación',choice('Todas','presentation','',!state.presentation)+presentations.map(v=>choice(v,'presentation',v,state.presentation===v)).join(''));
   }
   const picked=shortlist();
   html+='<div class="el-summary"><strong>'+picked.length+' productos</strong><span>'+escapeHtml([state.family,state.type,state.size,state.presentation].filter(Boolean).join(' · '))+'</span></div>';
  }else{
   html+='<div class="el-invite">👆 Elige un subcatálogo para mostrar sus productos. Encontramos '+rows.length+' referencias de electricidad en el catálogo general.</div>';
  }
  panel.innerHTML=html;
 }
 panel.addEventListener('click',e=>{
  const button=e.target.closest('button[data-el-key]');if(!button)return;
  const key=button.getAttribute('data-el-key'),val=button.getAttribute('data-el-value')||'';
  if(key==='reset'){state={family:'',type:'',size:'',presentation:''};}
  else if(key==='family'){state={family:val,type:'',size:'',presentation:''};}
  else if(key==='type'){state.type=val;state.size='';state.presentation='';}
  else if(key==='size'){state.size=val;state.presentation='';}
  else if(key==='presentation'){state.presentation=val;}
  else return;
  onChange();
 });
 function products(){
  if(!state.family)return [];
  return shortlist().slice(0,140).map(r=>({
   ...r.record,
   display:r.record.name,
   cat:'Electricidad',
   sub:[r.family,r.type,r.size,r.presentation].filter(Boolean).join(' · '),
   img:(window.NAVARRO_FOTOS_PAGINA&&window.NAVARRO_FOTOS_PAGINA[r.id])||''
  }));
 }
 function title(){return state.family?'Electricidad · '+state.family:'Electricidad · Selecciona un subcatálogo';}
 function intro(){return state.family?shortlist().length+' productos · '+[state.type,state.size,state.presentation].filter(Boolean).join(' · '):rows.length+' artículos eléctricos disponibles por subcatálogo';}
 return {render,products,title,intro,stats:()=>({available:rows.length,families:FAMILIES.map(([name])=>({name,total:count(name)}))})};
}
window.NAVARRO_CREATE_ELECTRICIDAD=create;
})();
