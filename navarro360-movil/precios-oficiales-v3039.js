/* V30.3.9: precios oficiales separados de precios temporales y por importe. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),api=()=>window.NAVARRO_PRECIOS_CATALOGO;
const PUBLIC='https://attentive-mystified-trustee.ngrok-free.dev/precios-v3039';
const CACHE='navarro-precios-oficiales-v3039',QUEUE='navarro-decision-precios-v3039:';
const codeOK=id=>/^\d{5,30}$/.test(id)&&!['00000','7777000010'].includes(id);
const money=c=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(c/100);
function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
function creds(){const p=read('navarro360_print_bridge_pair_v1'),d=read('navarro-inventario-device-v22'),i=window.NAVARRO_INVENTARIO_V22?.estado?.();if(!p||!d||!i?.reconocido||!['COMPUTADORA','PABLO','DIANA','GOLI'].includes(i.caja)||!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(dev|app)\/?$/.test(p.url)||!/^[a-f0-9]{64}$/.test(p.token||'')||!/^[a-f0-9-]{36}$/i.test(d.deviceId||'')||!/^[a-f0-9]{64}$/.test(d.deviceToken||''))return null;return {p,d,box:i.caja}}
function valid(x){return !!(x&&x.version===3039&&Number.isSafeInteger(x.revision)&&x.revision>=0&&Array.isArray(x.rows)&&x.rows.length<=30000&&new Set(x.rows.map(r=>r[0])).size===x.rows.length&&x.rows.every(r=>Array.isArray(r)&&codeOK(r[0])&&Number.isSafeInteger(r[1])&&r[1]>0&&r[1]<=99999999&&Number.isSafeInteger(r[2])&&r[2]>0&&r[2]<=x.revision))}
let latest=read(CACHE);if(!valid(latest))latest={version:3039,revision:0,rows:[]};
let applied=-1,reading=false,working=false,shownKey='',remoteOK=false,mirrorRevision=-1;
const cartEmpty=()=>!Object.keys(window.NAVARRO_CARRITO_EN_VIVO_V66?.snapshot?.()||{}).length;
function accept(x){if(!valid(x)||x.revision<latest.revision)return false;if(x.revision===latest.revision&&JSON.stringify(x.rows)!==JSON.stringify(latest.rows))return false;latest={version:x.version,revision:x.revision,rows:x.rows};try{localStorage.setItem(CACHE,JSON.stringify(latest))}catch{}return true}
function apply(force=false){if(!api()||(!force&&!cartEmpty())||applied===latest.revision)return;api().apply(latest.rows);applied=latest.revision;}
async function get(url){const r=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',headers:url.startsWith('https:')?{'ngrok-skip-browser-warning':'true'}:{},signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Sin conexión');return r.json()}
async function refresh(){if(reading)return;reading=true;try{const c=creds(),url=c?c.p.url.replace(/\/$/,'')+'/precios-v3039':PUBLIC;const [a,b]=await Promise.allSettled([get(url),get('./precios-oficiales-v3039.json?v='+Date.now())]);remoteOK=a.status==='fulfilled'&&valid(a.value);if(remoteOK)accept(a.value);if(b.status==='fulfilled'&&valid(b.value)){mirrorRevision=b.value.revision;accept(b.value)}apply();}finally{reading=false;buttons();showNext()}}
async function post(c,body){const r=await fetch(c.p.url.replace(/\/$/,'')+'/precios-v3039',{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+c.p.token,'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},body:JSON.stringify({...c.d,...body}),signal:AbortSignal.timeout(12000)});let x;try{x=await r.json()}catch{}if(!r.ok||x?.ok!==true||x.box!==c.box||!valid(x))throw Object.assign(Error(x?.error||'No se confirmó el precio. Instala el módulo V30.3.9 y reinicia el puente.'),{status:r.status});const now=creds();if(!now||now.box!==c.box||now.d.deviceId!==c.d.deviceId||now.p.token!==c.p.token)throw Error('Cambió la caja.');return x}
const version=id=>latest.rows.find(r=>r[0]===id)?.[2]||0;
const current=id=>latest.rows.find(r=>r[0]===id)?.[1]??api()?.get(id)?.cents;
async function setPrice(id,cents,request){
 const c=creds();if(!c)throw Error('Solo una caja reconocida puede cambiar el precio oficial.');
 if(!codeOK(id)||!Number.isSafeInteger(cents)||cents<1||cents>99999999)throw Error('Precio inválido.');
 const result=await post(c,{action:'set',code:id,cents,expected:request.expected,id:request.id});accept(result);apply(true);return result;
}
function afterSale(job,prices){
 const c=creds();if(!c||!job?.jobId)return;
 for(const row of job.rows||[]){const n=prices[row.id];if(!codeOK(row.id)||!Number.isSafeInteger(n)||n<1||n!==row.unit||n===current(row.id))continue;
 const k=QUEUE+c.box+':'+job.jobId+':'+row.id;if(localStorage.getItem(k)!==null)continue;
 localStorage.setItem(k,JSON.stringify({code:row.id,name:row.name,cents:n,old:current(row.id),box:c.box,job:job.jobId,request:null}));
 }
 setTimeout(showNext,400);
}
let dlg,description,notice,keep,revert;
function initDialog(){
 if(dlg)return;
 dlg=document.createElement('dialog');dlg.id='nv3039-decision';dlg.style.cssText='width:min(90vw,440px);border:1px solid #bcd1c1;border-radius:16px;padding:18px;color:#18382a;font:16px system-ui;background:white';
 const title=document.createElement('h3');title.textContent='¿Conservar o revertir el precio?';dlg.append(title);
 description=document.createElement('p');notice=document.createElement('p');notice.setAttribute('role','status');dlg.append(description,notice);
 keep=document.createElement('button');keep.type='button';keep.textContent='Conservar precio oficial';keep.style.cssText='width:100%;background:#205e40;color:white;padding:13px;margin:5px 0;border-radius:9px;border:0;font-weight:800';
 revert=document.createElement('button');revert.type='button';revert.textContent='Revertir al precio oficial';revert.style.cssText='width:100%;padding:13px;margin:5px 0;border-radius:9px;border:1px solid #adc5b5;font-weight:800';
 dlg.append(keep,revert);document.body.append(dlg);
 dlg.addEventListener('cancel',e=>e.preventDefault());keep.onclick=()=>decide(true);revert.onclick=()=>decide(false);
}
function showNext(){
 if(working||dlg?.open||!cartEmpty())return;const c=creds();if(!c)return;
 const key=Object.keys(localStorage).find(k=>k.startsWith(QUEUE+c.box+':'));if(!key)return;const p=read(key);if(!p||!codeOK(p.code))return;
 initDialog();shownKey=key;description.textContent=p.name+' · Precio oficial actual: '+money(current(p.code))+' · Precio cobrado: '+money(p.cents)+'. El ticket finalizado no cambiará.';notice.textContent='';revert.disabled=!!p.request;dlg.showModal();
}
async function decide(save){
 if(working)return;const p=read(shownKey);if(!p)return;
 if(!save&&p.request){notice.textContent='Primero confirma el resultado del cambio pendiente.';return}
 working=true;keep.disabled=revert.disabled=true;
 try{
  if(save){
   const c=creds();if(!c||c.box!==p.box)throw Error('La caja cambió.');
   if(!p.request){const x=await post(c,{action:'check'});accept(x);if(current(p.code)!==p.old&&current(p.code)!==p.cents){p.old=current(p.code);localStorage.setItem(shownKey,JSON.stringify(p));description.textContent=p.name+' · Otra caja cambió el precio a '+money(p.old)+'. ¿Conservar '+money(p.cents)+'?';return}p.request={id:crypto.randomUUID(),expected:version(p.code)};localStorage.setItem(shownKey,JSON.stringify(p))}
   try{await setPrice(p.code,p.cents,p.request)}catch(e){if(e.status===409){p.request=null;localStorage.setItem(shownKey,JSON.stringify(p));}throw e}
  }
  localStorage.removeItem(shownKey);dlg.close();shownKey='';
 }catch(e){notice.textContent=e.message+' Reintenta sin duplicar el cambio.'}
 finally{working=false;keep.disabled=false;revert.disabled=!!read(shownKey)?.request;setTimeout(showNext,80)}
}
async function editCard(id,b){
 if(working||!creds()||!codeOK(id))return;working=true;b.disabled=true;
 try{const c=creds(),x=await post(c,{action:'check'});accept(x);const p=api()?.get(id);if(!p)throw Error('Producto no disponible.');
 const old=current(id),raw=prompt('Precio OFICIAL de '+p.name+' (se aplica a todas las cajas y clientes)',(old/100).toFixed(2));if(raw===null)return;
 const v=raw.trim().replace(',','.');if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(v)||Number(v)<=0)throw Error('Precio inválido');
 const cents=Math.round(Number(v)*100);if(cents===old)return;
 if(!confirm('¿Cambiar precio oficial de '+money(old)+' a '+money(cents)+' para todos los clientes?'))return;
 await setPrice(id,cents,{id:crypto.randomUUID(),expected:version(id)});alert('Precio guardado en Windows. Se sincronizará con las demás cajas y clientes.');
 }catch(e){alert(e.message)}finally{working=false;b.disabled=false;showNext()}
}
function buttons(){const eligible=!!creds();document.querySelectorAll('#products article[data-card]').forEach(card=>{const id=card.dataset.card;if(!codeOK(id))return;let b=card.querySelector('[data-nv3039-price]');if(!b&&eligible){b=document.createElement('button');b.type='button';b.dataset.nv3039Price=id;b.textContent='✎ Precio oficial';b.style.cssText='width:100%;padding:7px;min-height:38px;border:1px solid #a9cbb2;border-radius:8px;background:#edf7ef;color:#205e40;font:750 13px system-ui';(card.querySelector('.product-info')||card).append(b)}if(b)b.hidden=!eligible;});}
document.addEventListener('click',e=>{const b=e.target.closest('[data-nv3039-price]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();void editCard(b.dataset.nv3039Price,b)},true);
const root=$('products');if(root)new MutationObserver(buttons).observe(root,{childList:true});
window.NAVARRO_PRECIOS_OFICIALES=Object.freeze({afterSale,refresh,estado:()=>({revision:latest.revision,puente:remoteOK,publicado:mirrorRevision>=latest.revision})});
apply();buttons();void refresh();setInterval(()=>{if(!document.hidden){apply();buttons();showNext()}},1500);setInterval(()=>{if(!document.hidden)void refresh()},20000);window.addEventListener('online',refresh);window.addEventListener('pageshow',refresh);
})();