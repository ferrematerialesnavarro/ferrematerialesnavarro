/* NAVARRO V29. Inventario consultivo, historial local y detección de duplicados. Sin cambios a ventas. */
function inventoryCore(){
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const validCode=s=>/^\d{1,30}$/.test(String(s))&&String(s)!=='00';
 const num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
 function combine(base,extra,stock,oldStock){
  const map=new Map();
  for(const r of base)if(Array.isArray(r)&&validCode(r[0])){const code=String(r[0]);map.set(code,{code,name:String(r[1]),price:num(r[2]),origin:'base'});}
  for(const p of extra)if(p&&validCode(p.code)&&!map.has(String(p.code)))map.set(String(p.code),{code:String(p.code),name:String(p.name),price:num(p.price),origin:'alta'});
  for(const p of map.values()){const live=num(stock.get(p.code));const fallback=num(oldStock?.[p.code]?.[0]);p.stock=live??fallback;p.live=live!==null;}
  return [...map.values()];
 }
 function restock(rows,min,target){return rows.filter(p=>p.stock!==null&&p.stock<=min).map(p=>({...p,need:Math.max(0,Math.ceil((target-p.stock)*1000)/1000)})).sort((a,b)=>a.stock-b.stock||a.name.localeCompare(b.name));}
 function similar(rows,name,code){
  const q=norm(name);if(q.length<4&&String(code||'').length<5)return [];
  const words=new Set(q.split(' ').filter(Boolean));
  return rows.map(p=>{const n=norm(p.name),w=new Set(n.split(' ').filter(Boolean));const overlap=[...words].filter(x=>w.has(x)).length;const score=code&&p.code===code?2:n===q&&q?1:words.size>=2?overlap/(words.size+w.size-overlap):0;return {p,score};}).filter(x=>x.score>=.55).sort((a,b)=>b.score-a.score||a.p.name.localeCompare(b.p.name)).slice(0,6);
 }
 function changes(before,after,at){
  if(!before)return [];
  const a=new Map(before.map(p=>[p.code,p])),b=new Map(after.map(p=>[p.code,p])),out=[];
  for(const [code,p] of b){const prev=a.get(code);if(!prev)out.push({at,code,name:p.name,type:'Alta publicada'});else for(const field of ['name','price','cat','unit'])if(prev[field]!==p[field])out.push({at,code,name:p.name,type:'Cambio de '+({name:'nombre',price:'precio',cat:'categoría',unit:'unidad'}[field]),before:prev[field],after:p[field]});}
  for(const [code,p] of a)if(!b.has(code))out.push({at,code,name:p.name,type:'Ya no aparece en publicación'});
  return out;
 }
 return {norm,validCode,combine,restock,similar,changes};
}

(function(){
'use strict';
const core=inventoryCore(),$=id=>document.getElementById(id);
const KEY='navarro360-v29-observaciones',SET='navarro360-v29-resurtido';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const persist=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const allowed=()=>{const a=window.NAVARRO_CENTRO_AMPLIADO_V27?.estado?.(),i=window.NAVARRO_INVENTARIO_V22?.estado?.();return a?.autorizado===true&&i?.impresora===true&&['COMPUTADORA','PABLO','DIANA','GOLI'].includes(String(a.caja).toUpperCase())};
const el=(tag,text,parent)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(parent)parent.append(x);return x};
const button=(text,parent,fn)=>{const x=el('button',text,parent);x.type='button';x.className='nv27-btn';x.addEventListener('click',fn);return x};
const base=()=>Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[];
let publicRows=[],publicAt=null,publicFresh=false,all=[],busy=false,publicError='',limit=60;
const sec=$('nv27-inventario'),form=$('nv23-form');
if(!sec&&!form)return;
function rebuild(){
 const api=window.NAVARRO_INVENTARIO_V22;
 const snap=api?.consultaPublica?.();
 const stock=new Map(snap?.rows||[]);
 all=core.combine(base(),publicRows,stock,window.NAVARRO_EXISTENCIAS);
 return snap;
}
function recordPublic(next,at){
 if(!allowed())return;
 const old=read(KEY,{last:null,history:[]});
 const prev=Array.isArray(old.last)?old.last:null;
 const history=Array.isArray(old.history)?old.history:[];
 const stamp=Date.parse(at);if(prev&&(!Number.isFinite(stamp)||stamp<=Date.parse(old.at)))return;
 const delta=core.changes(prev,next,at);
 if(!persist(KEY,{last:next,at,history:[...delta.reverse(),...history].slice(0,500)}))publicError='No se pudo guardar el historial en este navegador.';
}
function observed(e){
 const inv=window.NAVARRO_INVENTARIO_V22?.estado?.();if(!allowed()&&!(inv?.impresora&&inv?.reconocido))return;
 const d=e.detail;if(!d||!core.validCode(d.code)||!['Alta aceptada por Windows','Corrección aceptada por Windows','Conteo aceptado por Windows'].includes(d.type))return;
 const old=read(KEY,{last:null,history:[]}),h=Array.isArray(old.history)?old.history:[];
 const event={at:new Date().toISOString(),code:String(d.code),name:String(d.name||d.code).slice(0,120),type:d.type,before:d.before,after:d.after,box:String(d.box||window.NAVARRO_CENTRO_AMPLIADO_V27?.estado?.().caja||inv?.caja||'Sin identificar')};
 if(!persist(KEY,{...old,history:[event,...h].slice(0,500)}))publicError='No se pudo guardar el historial en este navegador.';
}
window.addEventListener('navarro:v29:confirmed',observed);
async function refresh(){
 if(busy)return;busy=true;publicFresh=false;render();
 try{
 const api=window.NAVARRO_PUBLICOS_V25;
 if(!api||!await api.recargar())throw Error(api?.estado?.().error||'No se pudo consultar el catálogo de altas');
 const state=api.estado();const list=api.listar?.();
 if(!Array.isArray(list))throw Error('No hay lista pública disponible');
 const next=list.map(p=>({code:String(p.code),name:String(p.name),price:p.price,cat:p.cat,unit:p.unit}));
 publicRows=next;publicAt=state.actualizado;publicFresh=true;publicError='';
 recordPublic(next,publicAt||state.ultimaConsulta);
 }catch(e){publicError=String(e.message||'Sin conexión');}
 try{await window.NAVARRO_INVENTARIO_V22?.recargarPublico?.()}catch{}
 finally{busy=false;rebuild();render();showSimilar();}
}
let area,status,stats,minField,targetField,search,filter,results,historyBox,more,actions;
function settings(){const min=Number(minField?.value),target=Number(targetField?.value);return Number.isFinite(min)&&Number.isFinite(target)&&min>=0&&target>min&&target<=100000000&&minField?.value!==''&&targetField?.value!==''?{min,target}:null}
function render(){
 if(!area)return;
 const ok=allowed();actions.hidden=!ok;status.textContent=ok?'Caja autorizada · '+(busy?'Consultando…':publicError||('Altas públicas: '+(publicFresh?'consulta correcta':'sin verificar')+' · '+(publicAt||'sin fecha'))):'Verifica la vinculación en Permisos para usar las herramientas.';
 if(!ok){stats.textContent='';results.replaceChildren();historyBox.replaceChildren();return;}
 const snap=rebuild(),fresh=!!snap?.at&&!snap.error&&Date.now()-Date.parse(snap.at)<=600000;
 const cfg=settings();const low=cfg?core.restock(all,cfg.min,cfg.target):[];
 const unknown=all.filter(p=>p.stock===null).length;
 stats.textContent=all.length.toLocaleString('es-MX')+' productos · '+all.filter(p=>p.stock===0).length+' agotados · '+low.length+' en nivel bajo o agotados · '+unknown+' sin existencia confirmada. '+(fresh?'Fuente pública consultada: '+new Date(snap.at).toLocaleString('es-MX'):'Existencias anteriores o sin conexión; verificar antes de comprar.')+' Los productos sin dato público usan el catálogo cargado.';
 const q=core.norm(search.value);let list=filter.value==='low'?low:filter.value==='zero'?all.filter(p=>p.stock===0):filter.value==='unknown'?all.filter(p=>p.stock===null):all;
 if(q)list=list.filter(p=>core.norm(p.name+' '+p.code).includes(q));
 results.replaceChildren();if(!cfg)el('p','Introduce un mínimo válido y un objetivo mayor al mínimo.',results);
 for(const p of list.slice(0,limit)){
  const r=el('div',undefined,results);r.style.cssText='padding:10px 0;border-bottom:1px solid #dce5ec';
  el('strong',p.name+' · '+p.code,r);
  el('p',(p.stock===null?'Existencia por confirmar':'Existencia: '+p.stock)+(p.live&&fresh?' · fuente pública reciente':' · verificar')+(p.need!==undefined?' · sugerido: '+p.need:''),r).style.margin='4px 0';
  button('Buscar para ajustar stock',r,()=>{if(!allowed())return;$('nv26-close')?.click();const input=$('search')||$('search-mobile');if(input){input.value=p.code;input.dispatchEvent(new Event('input',{bubbles:true}));$('products')?.scrollIntoView({block:'start'});}});
 }
 more.hidden=list.length<=limit;more.textContent='Ver más ('+Math.min(limit,list.length)+' de '+list.length+')';
 historyBox.replaceChildren();
 const h=read(KEY,{history:[]}).history;
 if(!Array.isArray(h)||!h.length)el('p','Aún no hay cambios observados en esta caja. La primera consulta establece la referencia.',historyBox);
 else for(const x of h.slice(0,40)){const r=el('p',undefined,historyBox);r.textContent=new Date(x.at).toLocaleString('es-MX')+' · '+x.type+' · '+x.code+' '+x.name+(x.before!==undefined?' · '+x.before+' → '+x.after:'')+(x.box?' · '+x.box:'');}
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
if(sec){
 area=el('section',undefined,sec);area.id='nv29-inventory';area.style.cssText='margin-top:16px;padding:12px;border:1px solid #b7d9c8;border-radius:12px;background:#fff';
 el('h3','Inventario inteligente · V29',area);
 status=el('p','',area);status.setAttribute('role','status');
 stats=el('p','',area);
 actions=el('div',undefined,area);actions.hidden=true;
 el('p','Alertas y lista de resurtido son sugerencias, no órdenes de compra. Ajustes de stock siguen en el módulo autorizado.',actions);
 const saved=read(SET,{min:5,target:10});
 const field=(label,value)=>{const l=el('label',label,actions);const f=el('input',undefined,l);f.type='number';f.min='0';f.step='0.001';f.max='100000000';f.value=value;f.className='nv27-input';return f};
 minField=field('Alertar con existencia igual o menor a',saved.min??5);targetField=field('Objetivo de resurtido',saved.target??10);
 for(const f of [minField,targetField])f.addEventListener('change',()=>{if(!allowed())return;const x=settings();if(x&&!persist(SET,x))publicError='No se pudieron guardar los niveles.';limit=60;render()});
 button('Actualizar existencias y catálogo',actions,refresh);
 button('Descargar lista de resurtido CSV',actions,()=>{if(!allowed())return;const cfg=settings();if(!cfg)return;const snap=rebuild();const fresh=snap?.at&&!snap.error&&Date.now()-Date.parse(snap.at)<=600000;const lines=[['Código','Producto','Existencia','Cantidad sugerida','Fuente'],...core.restock(all,cfg.min,cfg.target).map(p=>[p.code,p.name,p.stock,p.need,p.live&&fresh?'Pública reciente':'Verificar existencia'])];download('navarro-resurtido.csv','\uFEFF'+lines.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8')});
 search=el('input',undefined,actions);search.type='search';search.placeholder='Buscar código o nombre';search.className='nv27-input';search.setAttribute('aria-label','Buscar inventario');
 filter=el('select',undefined,actions);filter.className='nv27-input';filter.setAttribute('aria-label','Filtrar inventario');for(const [v,label] of [['low','Por resurtir'],['zero','Agotados'],['unknown','Por confirmar'],['all','Todos']]){const o=el('option',label,filter);o.value=v;}
 for(const f of [search,filter])f.addEventListener('input',()=>{limit=60;render()});
 results=el('div',undefined,actions);more=button('Ver más',actions,()=>{limit+=60;render()});
 el('h3','Historial de cambios observados',actions);
 el('p','Registro local de esta caja (hasta 500 eventos). Incluye cambios publicados observados y operaciones aceptadas registradas en esta sesión; no es auditoría central ni recupera cambios anteriores.',actions);
 historyBox=el('div',undefined,actions);
 button('Exportar historial JSON',actions,()=>{if(allowed())download('navarro-historial-local.json',JSON.stringify(read(KEY,{history:[]}).history||[],null,2),'application/json')});
 $('nv26-entry')?.addEventListener('click',()=>{render();refresh()});
 $('nv27-navigation')?.addEventListener('click',e=>{if(e.target.closest('[data-v27-tab="inventario"]')){render();refresh()}});
 $('nv27-verify')?.addEventListener('click',()=>setTimeout(render,1500));
 setInterval(()=>{if(!document.hidden&&!$('nv26-sheet')?.hidden){if(allowed()&&publicFresh)recordPublic(publicRows,publicAt||window.NAVARRO_PUBLICOS_V25?.estado?.().ultimaConsulta);render()}},5000);
 window.addEventListener('online',()=>{if(!$('nv26-sheet')?.hidden)refresh()});
}
let similarBox,timer;
function showSimilar(){
 if(!form||!similarBox||$('nv23-mask')?.hidden)return;
 rebuild();const name=form.elements.name.value,code=form.elements.code.value.trim();similarBox.replaceChildren();
 const matches=core.similar(all,name,code);
 const existing=code&&window.NAVARRO_NUEVOS_PRODUCTOS_V23?.contains(code);
 similarBox.hidden=!matches.length&&!existing;if(similarBox.hidden)return;
 el('strong',existing?'Código ya registrado; no crees otro producto con ese código.':'Revisa posibles productos similares antes de dar de alta.',similarBox);
 for(const {p,score} of matches)el('p',p.name+' · '+p.code+(score===2?' · código exacto':''),similarBox);
}
if(form){
 similarBox=el('div');similarBox.hidden=true;similarBox.className='nv23-wide';similarBox.style.cssText='padding:10px;border:1px solid #d4b36b;border-radius:9px;background:#fff8e7;color:#473711';
 form.elements.name.closest('label')?.after(similarBox);
 const change=()=>{clearTimeout(timer);timer=setTimeout(showSimilar,220)};
 for(const field of [form.elements.name,form.elements.code])field.addEventListener('input',change);
 $('nv23-open')?.addEventListener('click',()=>{change();if(!publicFresh)refresh()});
}
window.NAVARRO_INVENTARIO_V29=Object.freeze({version:29,refresh});
render();
})();
