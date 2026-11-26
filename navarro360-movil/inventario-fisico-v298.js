/* NAVARRO V29.8: conteo por caja, sin operaciones de venta. */

function physicalCore(){
 const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100000000&&Math.abs(n*1000-Math.round(n*1000))<1e-5;
 const round=n=>Math.round(n*1000)/1000;
 function update(rows,code,name,amount,mode,ref){
  const old=rows[code];
  if(old&&old.done)throw Error('Este producto ya se cerró. Inicia otro conteo.');
  const qty=round(mode==='sum'?(old?.qty||0)+amount:amount);
  if(!valid(amount)||!valid(qty))throw Error('Cantidad no válida');
  return {...rows,[code]:{code,name,qty,reference:old?.reference||ref,done:false,at:new Date().toISOString()}};
 }
 function diff(r){return r.reference?.confirmed?round(r.qty-r.reference.stock):null}
 return {valid,update,diff};
}


function searchPhysical(raw,base,extras,engine){
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/½/g,' 1/2 ').replace(/¼/g,' 1/4 ').replace(/¾/g,' 3/4 ').replace(/\bMEDIA\b/g,' 1/2 ').replace(/(\d)\s*\/\s*(\d)/g,'$1/$2').replace(/[^A-Z0-9/]+/g,' ').trim();
 const query=norm(raw);
 if(query.length<2||/^\d+$/.test(query))return [];
 const dictionary=new Map();
 for(const p of base)if(Array.isArray(p)&&/^\d{5,30}$/.test(String(p[0]))&&String(p[0])!=='00000')dictionary.set(String(p[0]),{id:String(p[0]),name:String(p[1])});
 const stop=new Set(['DE','DEL','LA','EL','LOS','LAS','PARA','POR','CON','EN','Y']);
 const terms=query.split(/\s+/).filter(w=>!stop.has(w));
 if(!terms.length)return [];
 const matches=p=>{const words=norm(p.name).split(/\s+/);return terms.every(t=>words.some(w=>w===t||(!/\d/.test(t)&&t.length>=2&&w.startsWith(t))))};
 const fresh=extras.filter(p=>p&&/^\d{5,30}$/.test(String(p.code))&&String(p.code)!=='00000'&&!dictionary.has(String(p.code))&&typeof p.name==='string').map(p=>({id:String(p.code),name:p.name})).filter(matches);
 let original;
 if(typeof engine?.searchByName==='function')original=engine.searchByName(raw,dictionary,()=> '');
 else original=[...dictionary.values()].filter(matches);
 // El motor principal conserva medidas exactas y prioridad de genéricos.
 // Si una abreviatura de 2–3 letras no tiene coincidencias, usar prefijos de texto.
 if(!original.length&&terms.some(t=>/^[A-Z]{2,3}$/.test(t)))original=[...dictionary.values()].filter(matches);
 const unique=new Map();
 for(const p of [...original,...fresh])if(p&&p.id!=='00000'&&!unique.has(p.id))unique.set(p.id,{code:p.id,name:p.name});
 return [...unique.values()];
}

(function(){
'use strict';
const core=physicalCore(),$=id=>document.getElementById(id),api=()=>window.NAVARRO_INVENTARIO_V22;
const area=$('nv27-inventario');if(!area)return;
const boxes=['COMPUTADORA','PABLO','DIANA','GOLI'];
const activeBox=()=>{const a=window.NAVARRO_CENTRO_AMPLIADO_V27?.estado?.(),i=api()?.estado?.();return a?.autorizado&&i?.impresora&&boxes.includes(a.caja)?a.caja:null};
const key=b=>'navarro360-conteo-fisico-v298-'+b;
const el=(tag,txt,parent)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;if(parent)parent.append(x);return x};
const btn=(txt,parent,fn)=>{const b=el('button',txt,parent);b.type='button';b.className='nv27-btn';b.addEventListener('click',fn);return b};
let doc=null,box=null,busy=false,ready=false,selected=null;
function say(s){status.textContent=s}
function read(b){const raw=localStorage.getItem(key(b));if(raw===null)return {id:crypto.randomUUID(),at:new Date().toISOString(),rows:{}};const d=JSON.parse(raw);if(!d||!d.rows||typeof d.rows!=='object'||Array.isArray(d.rows))throw Error('Borrador inválido; se conservó sin cambios');return d;}
function store(next){if(!box||activeBox()!==box)throw Error('Caja no autorizada');const raw=JSON.stringify(next);localStorage.setItem(key(box),raw);if(localStorage.getItem(key(box))!==raw)throw Error('No se confirmó el guardado');doc=next;}
function product(raw){
 const code=String(raw||'').trim().replace(/[\s-]/g,'');
 if(!/^\d{5,30}$/.test(code)||code==='00000')return null;
 const options=[code];if(code.length===13&&code.startsWith('0'))options.push(code.slice(1));if(code.length===12)options.push('0'+code);
 for(const c of options){const r=window.NAVARRO_NUEVOS_PRODUCTOS_V23?.get?.(c);if(r)return {code:c,name:r.name};const p=window.NAVARRO_DB?.find(x=>String(x[0])===c);if(p)return {code:c,name:String(p[1])};}
 return null;
}
function active(){return ready&&!busy&&!!doc&&activeBox()===box&&panel.open&&!$('nv26-sheet')?.hidden}
function record(code,n,mode){if(!active())throw Error('Abre el conteo en una caja autorizada');const p=product(code);if(!p)throw Error('Código no registrado');const ref=api().referenciaConteo(p.code);const rows=core.update(doc.rows,p.code,p.name,n,mode,ref);store({...doc,rows});selected=p.code;render();return {ok:true};}
async function start(){
 ready=false;const b=activeBox();if(!b){say('Verifica los permisos de tu caja.');render();return;}
 busy=true;render();
 try{await api().recargarTodo();if(activeBox()!==b)throw Error('Cambió la caja');box=b;doc=read(b);ready=true;say('Conteo local de '+b+'. Los ajustes solo se aplican al confirmar.');}
 catch(e){say(e.message)}finally{busy=false;render()}
}
async function apply(r){
 if(!active()||r.done)return;
 if(!r.reference?.confirmed){say('No hay referencia confirmada. Actualiza y vuelve a contar este producto.');return;}
 const delta=core.diff(r);
 if(!confirm(r.name+'\nRegistrado: '+r.reference.stock+'\nFísico: '+r.qty+'\nDiferencia: '+delta+'\n¿Confirmar este conteo?'))return;
 busy=true;render();
 try{
  const result=await api().aplicarConteo(r.code,r.qty,r.reference,r.name);
  if(!result?.ok)throw Error('No se confirmó el ajuste');
  store({...doc,rows:{...doc.rows,[r.code]:{...r,done:true,appliedAt:new Date().toISOString(),box:result.box}}});
  say(result.unchanged?'Conteo confirmado, sin ajuste.':'Ajuste aceptado por Windows.');
 }catch(e){say(e.message||'Revisa el stock antes de repetir.');}
 finally{busy=false;render()}
}
async function recount(r){
 if(!active()||r.done||!confirm('¿Actualizar referencia y volver a contar '+r.name+'?'))return;
 busy=true;render();
 try{await api().recargarTodo();const ref=api().referenciaConteo(r.code);if(!ref.confirmed)throw Error('La existencia sigue sin confirmar');const raw=prompt('Cantidad física contada nuevamente de '+r.name,'');if(raw===null)return;const qty=parse(raw);if(qty===null)throw Error('Cantidad inválida');store({...doc,rows:{...doc.rows,[r.code]:{...r,qty,reference:ref,at:new Date().toISOString()}}});say('Referencia y conteo actualizados.');}
 catch(e){say(e.message)}finally{busy=false;render()}
}
function parse(raw){const s=String(raw).trim().replace(',','.');if(!/^\d+(?:\.\d{1,3})?$/.test(s))return null;const n=Number(s);return core.valid(n)?n:null;}
function render(){
 const allowed=!!activeBox();panel.hidden=!allowed;if(!allowed||!doc||!ready){controls.hidden=true;results.replaceChildren();return;}
 controls.hidden=false;for(const b of controls.querySelectorAll('button,input,select'))b.disabled=busy;
 const rows=Object.values(doc.rows),open=rows.filter(r=>!r.done);
 stats.textContent=rows.length+' productos · '+open.length+' pendientes · '+(rows.length-open.length)+' confirmados · '+open.filter(r=>core.diff(r)!==null&&core.diff(r)!==0).length+' con diferencia';
 results.replaceChildren();
 let list=rows.filter(r=>filter.value==='all'||filter.value==='pending'&&!r.done||filter.value==='diff'&&!r.done&&core.diff(r)!==null&&core.diff(r)!==0||filter.value==='missing'&&!r.done&&core.diff(r)<0&&core.diff(r)!==null||filter.value==='extra'&&!r.done&&core.diff(r)>0);
 list.sort((a,b)=>Number(a.done)-Number(b.done)||String(b.at).localeCompare(a.at));
 for(const r of list){
  const row=el('div',undefined,results);row.style.cssText='padding:10px 0;border-bottom:1px solid #dce5ec';
  el('strong',r.name+' · '+r.code,row);
  const delta=core.diff(r);
  el('p','Registrado: '+(r.reference?.stock??'Sin dato')+' · Físico: '+r.qty+' · Diferencia: '+(delta===null?'Por verificar':(delta>0?'+':'')+delta)+(r.done?' · Confirmado':''),row).style.margin='4px 0';
  if(!r.done){
   const edit=btn('Cantidad',row,()=>{if(!active())return;const raw=prompt('Cantidad física de '+r.name,String(r.qty));if(raw===null)return;const n=parse(raw);if(n===null){say('Cantidad inválida');return;}try{record(r.code,n,'set')}catch(e){say(e.message)}});edit.disabled=busy;
   const applyBtn=btn('Confirmar ajuste',row,()=>apply(r));applyBtn.disabled=busy||!r.reference?.confirmed;
   const retry=btn('Volver a contar',row,()=>recount(r));retry.disabled=busy;
   const remove=btn('Quitar',row,()=>{if(!active()||!confirm('¿Quitar del borrador? No cambia el stock.'))return;try{const rows={...doc.rows};delete rows[r.code];store({...doc,rows});render()}catch(e){say(e.message)}});remove.disabled=busy;
  }
 }
}
const panel=el('details');panel.id='nv298-physical';panel.hidden=true;
// Primer acceso de Inventario, antes del resumen y los listados.
area.prepend(panel);
panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #b7d9c8;border-radius:10px;background:#f4faf6';
el('summary','Inventario físico con escáner',panel).style.fontWeight='800';
const status=el('p','Abre para cargar el conteo.',panel);status.setAttribute('role','status');
const controls=el('div',undefined,panel);controls.hidden=true;
btn('Escanear materiales',controls,()=>{if(active())window.NAVARRO_ESCANER_CONTEO?.()});
const form=el('form',undefined,controls);const field=el('input',undefined,form);field.type='text';field.inputMode='search';field.autocomplete='off';field.placeholder='Nombre, medida o código de barras';field.className='nv27-input';field.setAttribute('aria-label','Buscar material para conteo por nombre o código');
const submit=el('button','Buscar / sumar código',form);submit.type='submit';submit.className='nv27-btn';
const suggestions=el('div',undefined,controls);suggestions.setAttribute('aria-label','Coincidencias de materiales');suggestions.style.cssText='max-height:320px;overflow:auto';
let searchTimer=0,searchLimit=15;
function clearLookup(){clearTimeout(searchTimer);field.value='';suggestions.replaceChildren();searchLimit=15;}
function extrasForSearch(){return window.NAVARRO_PUBLICOS_V25?.listar?.()||[]}
function lookup(){
 clearTimeout(searchTimer);suggestions.replaceChildren();
 if(!active())return;
 const raw=field.value.trim();if(raw.length<2)return;
 const compact=raw.replace(/[\s-]/g,'');
 const exact=/^\d{5,30}$/.test(compact)?product(compact):null;
 const matches=exact?[exact]:searchPhysical(raw,window.NAVARRO_DB||[],extrasForSearch(),window.NAVARRO_BUSCADOR_COMPLETO);
 if(!matches.length){el('p','Sin coincidencias. Escribe más letras, una medida o el código completo.',suggestions);return}
 el('small',matches.length+' coincidencias · Selecciona el material para capturar la cantidad.',suggestions);
 for(const p of matches.slice(0,searchLimit)){
  const row=el('div',undefined,suggestions);row.style.cssText='border-bottom:1px solid #dce5ec;padding:7px 0';
  const ref=api().referenciaConteo(p.code),existing=doc.rows[p.code];
  const b=btn(p.name,row,()=>{
   if(!active())return;
   if(doc.rows[p.code]?.done){say('Este producto ya está confirmado. Inicia otro conteo para modificarlo.');return}
   const raw=prompt(p.name+'\nCódigo: '+p.code+'\nEscribe la cantidad física total (incluye 0 si no hay existencia).',String(doc.rows[p.code]?.qty??''));
   if(raw===null)return;
   const qty=parse(raw);if(qty===null){say('Cantidad inválida. Usa hasta tres decimales.');return}
   try{record(p.code,qty,'set');clearLookup();say('Cantidad guardada en el borrador. Busca otro material.')}catch(e){say(e.message)}
  });
  b.style.cssText='display:block;text-align:left;width:100%;white-space:normal;overflow-wrap:anywhere';
  el('small',p.code+' · '+(ref.confirmed?'Registrado: '+ref.stock:'Existencia por verificar')+(existing?' · Físico: '+existing.qty+(existing.done?' · Confirmado':'') :''),row);
 }
 if(matches.length>searchLimit)btn('Mostrar más ('+Math.min(searchLimit,matches.length)+' de '+matches.length+')',suggestions,()=>{searchLimit+=15;lookup()});
}
field.addEventListener('input',()=>{searchLimit=15;clearTimeout(searchTimer);suggestions.replaceChildren();searchTimer=setTimeout(lookup,130)});
form.addEventListener('submit',e=>{
 e.preventDefault();const raw=field.value.trim();
 if(!/^\d{5,30}$/.test(raw.replace(/[\s-]/g,''))){lookup();return}
 try{record(raw,1,'sum');clearLookup();field.focus();say('Unidad guardada en el borrador.')}catch(err){say(err.message)}
});
const stats=el('p','',controls);
const filter=el('select',undefined,controls);filter.className='nv27-input';filter.setAttribute('aria-label','Filtrar conteo');
for(const [v,t] of [['all','Todos'],['pending','Pendientes'],['diff','Diferencias'],['missing','Faltantes'],['extra','Sobrantes']]){const o=el('option',t,filter);o.value=v;}
filter.addEventListener('change',render);
btn('Nuevo conteo',controls,()=>{if(!active())return;if(Object.values(doc.rows).some(r=>!r.done)){say('Confirma o quita los productos pendientes antes de iniciar otro conteo.');return;}if(!confirm('¿Archivar este conteo e iniciar otro?'))return;try{const k=key(box)+'-historial',raw=localStorage.getItem(k),old=raw?JSON.parse(raw):[];if(!Array.isArray(old))throw Error('Historial no válido');localStorage.setItem(k,JSON.stringify([doc,...old].slice(0,30)));store({id:crypto.randomUUID(),at:new Date().toISOString(),rows:{}});render();say('Nuevo conteo iniciado.')}catch(e){say(e.message)}});
btn('Exportar historial y conteo',controls,()=>{if(!active())return;try{const raw=localStorage.getItem(key(box)+'-historial');const history=raw?JSON.parse(raw):[];const url=URL.createObjectURL(new Blob([JSON.stringify({box,actual:doc,historial:history},null,2)],{type:'application/json'}));const a=el('a',undefined,document.body);a.href=url;a.download='navarro-conteo-'+box+'.json';a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){say(e.message)}});
const results=el('div',undefined,controls);
panel.addEventListener('toggle',()=>{if(panel.open)start();else{ready=false;clearLookup()}});
setInterval(()=>{const b=activeBox();panel.hidden=!b;if(box&&b!==box){ready=false;doc=null;box=null;clearLookup();panel.open=false;render()}},1500);
window.NAVARRO_CONTEO_FISICO=Object.freeze({activo:active,buscar:product,sumar:code=>record(code,1,'sum')});
render();
})();
