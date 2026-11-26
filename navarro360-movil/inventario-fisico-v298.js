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

(function(){
'use strict';
const core=physicalCore(),$=id=>document.getElementById(id),api=()=>window.NAVARRO_INVENTARIO_V22;
const area=$('nv29-inventory');if(!area)return;
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
const panel=el('details',undefined,area);panel.id='nv298-physical';panel.hidden=true;
panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #b7d9c8;border-radius:10px;background:#f4faf6';
el('summary','Inventario físico con escáner',panel).style.fontWeight='800';
const status=el('p','Abre para cargar el conteo.',panel);status.setAttribute('role','status');
const controls=el('div',undefined,panel);controls.hidden=true;
btn('Escanear materiales',controls,()=>{if(active())window.NAVARRO_ESCANER_CONTEO?.()});
const form=el('form',undefined,controls);const field=el('input',undefined,form);field.type='text';field.inputMode='numeric';field.placeholder='Código o lector USB';field.className='nv27-input';field.setAttribute('aria-label','Código para conteo');
const submit=el('button','Sumar 1',form);submit.type='submit';submit.className='nv27-btn';
form.addEventListener('submit',e=>{e.preventDefault();try{record(field.value,1,'sum');field.value='';field.focus();say('Unidad guardada en el borrador.')}catch(err){say(err.message)}});
const stats=el('p','',controls);
const filter=el('select',undefined,controls);filter.className='nv27-input';filter.setAttribute('aria-label','Filtrar conteo');
for(const [v,t] of [['all','Todos'],['pending','Pendientes'],['diff','Diferencias'],['missing','Faltantes'],['extra','Sobrantes']]){const o=el('option',t,filter);o.value=v;}
filter.addEventListener('change',render);
btn('Nuevo conteo',controls,()=>{if(!active())return;if(Object.values(doc.rows).some(r=>!r.done)){say('Confirma o quita los productos pendientes antes de iniciar otro conteo.');return;}if(!confirm('¿Archivar este conteo e iniciar otro?'))return;try{const k=key(box)+'-historial',raw=localStorage.getItem(k),old=raw?JSON.parse(raw):[];if(!Array.isArray(old))throw Error('Historial no válido');localStorage.setItem(k,JSON.stringify([doc,...old].slice(0,30)));store({id:crypto.randomUUID(),at:new Date().toISOString(),rows:{}});render();say('Nuevo conteo iniciado.')}catch(e){say(e.message)}});
btn('Exportar historial y conteo',controls,()=>{if(!active())return;try{const raw=localStorage.getItem(key(box)+'-historial');const history=raw?JSON.parse(raw):[];const url=URL.createObjectURL(new Blob([JSON.stringify({box,actual:doc,historial:history},null,2)],{type:'application/json'}));const a=el('a',undefined,document.body);a.href=url;a.download='navarro-conteo-'+box+'.json';a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){say(e.message)}});
const results=el('div',undefined,controls);
panel.addEventListener('toggle',()=>{if(panel.open)start();else ready=false});
setInterval(()=>{const b=activeBox();panel.hidden=!b;if(box&&b!==box){ready=false;doc=null;box=null;panel.open=false;render()}},1500);
window.NAVARRO_CONTEO_FISICO=Object.freeze({activo:active,buscar:product,sumar:code=>record(code,1,'sum')});
render();
})();
