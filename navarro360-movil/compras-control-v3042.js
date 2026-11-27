/* V30.4.2: planificación de compras local. No escribe inventario, ventas ni precios. */
function comprasCore(){
 const validCode=x=>typeof x==='string'&&/^\d{5,30}$/.test(x)&&!['00000','7777000010'].includes(x);
 const validCents=x=>Number.isSafeInteger(x)&&x>0&&x<=99999999;
 const nval=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100000000;
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 function plan(rows,settings,meta,sold){
  const out=[],unknown=[];
  for(const p of rows){
   if(!validCode(p.code))continue;
   if(!p.confirmed||!nval(p.stock)||p.negative){unknown.push(p);continue}
   const m=meta[p.code]||{},min=nval(m.min)?m.min:settings.min,target=nval(m.target)&&m.target>min?m.target:Math.max(settings.target,min+1);
   if(p.stock>min)continue;
   const need=Math.max(0,Math.ceil((target-p.stock)*1000)/1000),units=sold[p.code]||0;
   out.push({...p,min,target,need,units,supplier:m.supplier||'',cost:validCents(m.cost)?m.cost:null,estimate:validCents(m.cost)?Math.round(m.cost*need):null});
  }
  out.sort((a,b)=>Number(b.stock===0)-Number(a.stock===0)||b.units-a.units||a.stock-b.stock||a.name.localeCompare(b.name,'es'));
  return {out,unknown};
 }
 function sales(jobs,meta){
  const sold={},lines=[];let revenue=0,cost=0,missingRevenue=0,missing=0;
  for(const job of jobs)for(const r of job.rows||[]){
   if(!validCode(r.id)||!nval(r.qty)||r.qty<=0||!validCents(r.total))continue;
   sold[r.id]=(sold[r.id]||0)+r.qty;
   const c=meta[r.id]?.cost;
   if(!validCents(c)){missing++;missingRevenue+=r.total;continue}
   const expense=Math.round(c*r.qty);revenue+=r.total;cost+=expense;
   lines.push({name:r.name,code:r.id,qty:r.qty,revenue:r.total,cost:expense,margin:r.total-expense});
  }
  return {sold,lines,revenue,cost,margin:revenue-cost,missing,missingRevenue};
 }
 function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
 return {validCode,validCents,nval,norm,plan,sales,csvCell};
}
(()=>{
'use strict';
const sec=document.getElementById('nv27-compras');if(!sec)return;
const c=comprasCore(),$=id=>document.getElementById(id);
const boxes=['COMPUTADORA','PABLO','DIANA','GOLI'],prefix='navarro-compras-v3042:';
function box(){const a=window.NAVARRO_CENTRO_AMPLIADO_V27?.estado?.(),i=window.NAVARRO_INVENTARIO_V22?.estado?.();return a?.autorizado===true&&i?.reconocido&&a.caja===i.caja&&boxes.includes(a.caja)?a.caja:null}
const blank=()=>({suppliers:[],products:{},settings:{min:5,target:10},history:[]});
function load(b){try{const x=JSON.parse(localStorage.getItem(prefix+b)||'null');return x&&Array.isArray(x.suppliers)&&x.products&&x.settings&&Array.isArray(x.history)?x:blank()}catch{return blank()}}
function save(b,x){if(box()!==b)throw Error('La caja cambió. Vuelve a abrir Compras.');const raw=JSON.stringify(x);localStorage.setItem(prefix+b,raw);if(localStorage.getItem(prefix+b)!==raw)throw Error('No se pudo guardar.')}
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n/100);
const qty=n=>Number(n.toFixed(3)).toLocaleString('es-MX');
const el=(t,s,p)=>{const x=document.createElement(t);if(s!==undefined)x.textContent=s;if(p)p.append(x);return x};
const btn=(t,p,fn)=>{const b=el('button',t,p);b.type='button';b.className='nv27-btn';b.onclick=()=>{try{const x=fn();if(x?.catch)x.catch(e=>message(e.message))}catch(e){message(e.message)}};return b};
const field=(label,p,type='text')=>{const l=el('label',label,p);l.className='nv27-field';const x=el('input',undefined,l);x.type=type;x.className='nv27-input';return x};
const select=(label,items,p)=>{const l=el('label',label,p);l.className='nv27-field';const s=el('select',undefined,l);s.className='nv27-input';for(const [v,t] of items){const o=el('option',t,s);o.value=v}return s};
const status=el('p','',sec);status.setAttribute('role','status');
function message(t){status.textContent=t}
const host=el('div',undefined,sec),nav=el('div',undefined,host);nav.className='nv27-actions';
let mode='restock',term='',limit=30,busy=false,sectionBody=el('div',undefined,host),lastBox=null;
const labels=[['restock','Resurtido'],['suppliers','Proveedores y costos'],['profits','Ganancias estimadas'],['prices','Historial de precios']];
for(const [id,label] of labels)btn(label,nav,()=>{mode=id;term='';limit=30;render()});
function catalog(){
 const map=new Map();
 for(const r of window.NAVARRO_DB||[]){const code=String(r[0]);if(c.validCode(code))map.set(code,{code,name:String(r[1])})}
 for(const p of window.NAVARRO_PUBLICOS_V25?.listar?.()||[]){if(c.validCode(p.code))map.set(p.code,{code:p.code,name:p.name})}
 return map;
}
function jobs(days){
 const api=window.NAVARRO_HISTORIAL,cut=Date.now()-days*86400000,seen=new Set(),out=[];
 for(const r of api?.list?.()||[]){if(seen.has(r.jobId))continue;seen.add(r.jobId);const j=api.get(r.jobId);if(j&&['pagado','cobrar'].includes(j.state)&&Date.parse(j.at)>=cut&&Date.parse(j.at)<=Date.now())out.push(j)}
 return out;
}
function download(name,body,type){
 const uri=URL.createObjectURL(new Blob([body],{type})),a=el('a',undefined,document.body);a.href=uri;a.download=name;a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),3000);
}
function csv(name,rows){download(name,'\uFEFF'+rows.map(r=>r.map(c.csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8')}
function supplierName(d,id){return d.suppliers.find(x=>x.id===id)?.name||'Sin proveedor'}
function listRow(p,t,sub){const r=el('div',undefined,p);r.className='nv27-row';el('strong',t,r);if(sub)el('small',sub,r);return r}
function configProduct(b,d,code){
 if(!box()||box()!==b)throw Error('Caja no autorizada');
 const p=catalog().get(code);if(!p)throw Error('Código no encontrado en catálogo');
 const old=d.products[code]||{};
 const dlg=el('dialog',undefined,document.body);dlg.style.cssText='width:min(90vw,440px);border:1px solid #bad0c1;border-radius:14px;padding:16px;max-height:85dvh;overflow:auto;color:#183629;background:white';
 el('h3',p.name,dlg);el('p','Código '+code+' · Datos privados guardados en esta caja.',dlg);
 const cost=field('Costo de compra por unidad ($)',dlg,'number');cost.min='0.01';cost.step='0.01';cost.value=old.cost?String(old.cost/100):'';
 const supplier=select('Proveedor',[['','Sin asignar'],...d.suppliers.map(x=>[x.id,x.name])],dlg);supplier.value=old.supplier||'';
 const min=field('Existencia mínima (opcional)',dlg,'number');min.step='0.001';min.min='0';min.value=old.min??'';
 const target=field('Existencia objetivo (opcional)',dlg,'number');target.step='0.001';target.min='0';target.value=old.target??'';
 const msg=el('p','',dlg);const close=()=>{dlg.close();dlg.remove()};dlg.addEventListener('cancel',e=>{e.preventDefault();close()});
 btn('Guardar datos',dlg,()=>{
  const fresh=load(b),v=cost.value.trim()===''?null:Math.round(Number(cost.value)*100),m=min.value===''?null:Number(min.value),t=target.value===''?null:Number(target.value);
  if(v!==null&&!c.validCents(v)||m!==null&&!c.nval(m)||t!==null&&(!c.nval(t)||t<=(m??fresh.settings.min))){msg.textContent='Revisa costo, mínimo y objetivo; el objetivo debe superar el mínimo.';return}
  if(supplier.value&&!fresh.suppliers.some(x=>x.id===supplier.value)){msg.textContent='El proveedor cambió. Vuelve a abrir.';return}
  fresh.products[code]={cost:v,min:m,target:t,supplier:supplier.value};save(b,fresh);close();render();
 });btn('Cancelar',dlg,close);dlg.showModal();
}
function restock(b,d,p){
 const read=window.NAVARRO_INVENTARIO_V22?.lectorExistencias?.()||(()=>({stock:null,confirmed:false}));
 const rows=Array.from(catalog().values(),x=>({...x,...read(x.code)})),sold=c.sales(jobs(30),d.products).sold,plan=c.plan(rows,d.settings,d.products,sold);
 el('p','Prioridad: agotados confirmados, luego los de mayor salida según los últimos 100 tickets disponibles en este dispositivo. Existencias antiguas o negativas quedan fuera de la compra automática.',p);
 const min=field('Mínimo general',p,'number'),target=field('Objetivo general',p,'number');min.value=d.settings.min;target.value=d.settings.target;for(const f of [min,target]){f.min='0';f.step='0.001'}
 btn('Guardar niveles',p,()=>{const m=Number(min.value),t=Number(target.value);if(min.value===''||target.value===''||!c.nval(m)||!c.nval(t)||t<=m)throw Error('El objetivo debe ser mayor que el mínimo.');const x=load(b);x.settings={min:m,target:t};save(b,x);render()});
 btn('Actualizar existencias',p,async()=>{if(busy)return;busy=true;message('Consultando existencias…');try{await window.NAVARRO_INVENTARIO_V22?.recargarTodo?.();await window.NAVARRO_PUBLICOS_V25?.recargar?.()}finally{busy=false;render()}});
 const summary=el('div',undefined,p);summary.className='nv27-row';el('strong',plan.out.length+' por resurtir · '+plan.out.filter(x=>x.stock===0).length+' agotados',summary);el('small',plan.unknown.length+' por verificar · '+plan.out.filter(x=>x.cost===null).length+' sin costo de compra',summary);
 const budget=plan.out.reduce((a,x)=>a+(x.estimate||0),0);el('strong','Compra estimada con costos registrados: '+money(budget),summary);
 const q=field('Buscar por código, producto o proveedor',p,'search');q.value=term;const output=el('div',undefined,p),bar=el('div',undefined,p);
 function filtered(){const needle=c.norm(term);return plan.out.filter(x=>!needle||c.norm(x.name+' '+x.code+' '+supplierName(d,x.supplier)).includes(needle))}
 function draw(){output.replaceChildren();bar.replaceChildren();const a=filtered();if(!a.length)el('p','No hay productos confirmados que coincidan. Verifica la conexión y los niveles.',output);for(const x of a.slice(0,limit)){
  const row=listRow(output,x.name,x.code+' · '+(x.stock===0?'AGOTADO':'Stock '+qty(x.stock))+' · Comprar '+qty(x.need)+' · Salida local 30 días: '+qty(x.units));
  el('small',supplierName(d,x.supplier)+' · '+(x.estimate===null?'Costo sin registrar':money(x.estimate)+' estimado'),row);
  btn('Proveedor, costo y niveles',row,()=>configProduct(b,d,x.code));
 }
 if(a.length>limit)btn('Ver más ('+Math.min(limit,a.length)+' de '+a.length+')',bar,()=>{limit+=30;draw()})}
 q.oninput=()=>{term=q.value;limit=30;draw()};draw();
 btn('Descargar lista de compra CSV',p,()=>{if(box()!==b)throw Error('Caja no autorizada');csv('navarro-lista-compra.csv',[['Código','Producto','Existencia confirmada','Sugerencia','Proveedor','Costo unitario MXN','Estimado MXN'],...filtered().map(x=>[x.code,x.name,x.stock,x.need,supplierName(d,x.supplier),x.cost===null?'':(x.cost/100).toFixed(2),x.estimate===null?'':(x.estimate/100).toFixed(2)])])});
}
function suppliers(b,d,p){
 el('p','Directorio y costos privados de esta caja. Todavía no se comparten entre dispositivos. No registra deudas ni recepción de mercancía.',p);
 const name=field('Nombre del proveedor',p),phone=field('Teléfono (opcional)',p,'tel');
 btn('Agregar proveedor',p,()=>{const n=name.value.trim(),ph=phone.value.trim();if(n.length<2||n.length>100||ph.length>40)throw Error('Revisa el nombre y teléfono.');const x=load(b);if(x.suppliers.some(s=>c.norm(s.name)===c.norm(n)))throw Error('El proveedor ya está registrado.');x.suppliers.push({id:crypto.randomUUID(),name:n,phone:ph});save(b,x);render()});
 for(const s of d.suppliers){const count=Object.values(d.products).filter(x=>x.supplier===s.id).length;listRow(p,s.name,(s.phone||'Sin teléfono')+' · '+count+' productos asignados')}
 el('h4','Asignar producto y costo',p);
 const code=field('Código de barras o nombre',p,'search');const output=el('div',undefined,p),map=catalog();
 code.oninput=()=>{output.replaceChildren();const needle=c.norm(code.value.trim());if(needle.length<2)return;const matches=[...map.values()].filter(x=>x.code===needle||c.norm(x.name+' '+x.code).includes(needle)).slice(0,20);for(const x of matches){const row=listRow(output,x.name,x.code);btn('Asignar proveedor y costo',row,()=>configProduct(b,d,x.code))}};
 el('h4','Productos configurados',p);
 for(const [id,x] of Object.entries(d.products).slice(0,100)){
  const row=listRow(p,map.get(id)?.name||id,id+' · '+supplierName(d,x.supplier)+' · '+(c.validCents(x.cost)?money(x.cost):'Sin costo'));
  btn('Editar',row,()=>configProduct(b,d,id));
 }
 btn('Respaldar proveedores y costos JSON',p,()=>{if(box()!==b)throw Error('Caja no autorizada');download('navarro-compras-'+b+'.json',JSON.stringify(load(b),null,2),'application/json')});
}
function profits(b,d,p){
 el('p','Estimación de margen bruto con COSTOS ACTUALES, no utilidad contable histórica. Incluye ventas pagadas y por cobrar del historial de este dispositivo (máximo 100); no consolida cajas ni devoluciones. Excluye flete y productos varios.',p);
 const period=select('Periodo',[['7','Últimos 7 días'],['30','Últimos 30 días'],['90','Últimos 90 días']],p),out=el('div',undefined,p);period.value='30';
 const draw=()=>{out.replaceChildren();const js=jobs(Number(period.value)),v=c.sales(js,d.products);listRow(out,'Ingresos con costo conocido: '+money(v.revenue),'Costo estimado: '+money(v.cost));listRow(out,'Margen bruto estimado: '+money(v.margin),v.revenue?'Margen: '+(100*v.margin/v.revenue).toFixed(1)+'%':'Sin líneas con costo registrado');listRow(out,'Ventas sin costo: '+money(v.missingRevenue),v.missing+' líneas excluidas · '+js.length+' tickets consultados');for(const r of v.lines.slice(0,40))listRow(out,r.name,qty(r.qty)+' · Venta '+money(r.revenue)+' · Costo '+money(r.cost)+' · Margen '+money(r.margin))};period.onchange=draw;draw();
}
function history(b,d,p){
 el('p','Cambios oficiales confirmados desde esta caja a partir de V30.4.2. La auditoría completa de las cuatro cajas requerirá consultar la base de Windows.',p);
 const map=catalog();if(!d.history.length)el('p','Todavía no hay cambios confirmados registrados en esta caja.',p);
 for(const x of d.history.slice(0,100))listRow(p,map.get(x.code)?.name||x.code,x.code+' · '+money(x.before)+' → '+money(x.after)+' · '+x.box+' · '+new Date(x.at).toLocaleString('es-MX'));
 btn('Exportar historial local CSV',p,()=>{if(box()!==b)throw Error('Caja no autorizada');csv('navarro-precios-historial-'+b+'.csv',[['Código','Anterior MXN','Nuevo MXN','Caja','Fecha observada'],...load(b).history.map(x=>[x.code,x.before/100,x.after/100,x.box,x.at])])});
}
function render(){
 const b=box();host.hidden=!b;if(!b){sectionBody.replaceChildren();message('Comprueba la vinculación en Permisos para consultar las herramientas.');lastBox=null;return}
 if(lastBox!==b){lastBox=b;term='';limit=30}
 if(sec.dataset.v27Active!=='yes')return;
 message('Caja '+b+' · Planificación privada local. No modifica stock ni ventas.');sectionBody.replaceChildren();const d=load(b);
 ({restock,suppliers,profits,prices:history}[mode]||restock)(b,d,sectionBody);
}
window.addEventListener('navarro:precio-oficial-confirmado',e=>{
 const b=box(),x=e.detail;if(!b||!x||x.box!==b||!c.validCode(x.code)||!c.validCents(x.before)||!c.validCents(x.after)||x.before===x.after||typeof x.id!=='string')return;
 try{const d=load(b);if(d.history.some(r=>r.id===x.id))return;d.history=[x,...d.history].slice(0,500);save(b,d)}catch{message('Cambio de precio confirmado, pero no se pudo guardar el historial local.')}
});
window.NAVARRO_COMPRAS_V3042=Object.freeze({render});render();
setInterval(()=>{if(sec.dataset.v27Active==='yes'&&!$('nv26-sheet')?.hidden){const b=box();if(b!==lastBox)render()}},2000);
})();
