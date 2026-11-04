/* NAVARRO 360 V42 — lector USB/HID en la barra de búsqueda. */
(function(){
'use strict';
if(window.NAVARRO_LECTOR_USB_V42)return;
window.NAVARRO_LECTOR_USB_V42=true;
const SELECTOR='#search,#search-mobile';
const MIN=5,MAX=20,FAST_MS=95,QUIET_MS=180;
let trace={el:null,last:0,count:0},timer=0,busy=false,lastAdd={code:'',at:0};
function lookup(raw){
 const code=String(raw||'').trim().replace(/[\s-]/g,'');
 if(!/^\d{5,20}$/.test(code)||!Array.isArray(window.NAVARRO_DB))return null;
 const candidates=[code];
 if(code.length===13&&code[0]==='0')candidates.push(code.slice(1));
 if(code.length===12)candidates.push('0'+code);
 for(const id of candidates){
  const row=window.NAVARRO_DB.find(x=>String(x&&x[0])===id);
  if(row)return {code:id,name:String(row[1]||'Producto')};
 }
 return null;
}
function announce(message,error){
 let node=document.getElementById('nav-usb-feedback');
 if(!node){node=document.createElement('div');node.id='nav-usb-feedback';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.style.cssText='font-size:13px;font-weight:700;min-height:22px;margin:6px 0;color:#166534';
  const host=document.querySelector('#search')?.closest('.search-wrap');if(host)host.after(node);
 }
 if(node){node.textContent=message;node.style.color=error?'#a52a2a':'#166534';}
}
function reset(el){
 clearTimeout(timer);timer=0;
 trace={el:null,last:0,count:0};
 if(!el)return;
 el.value='';
 el.dispatchEvent(new Event('input',{bubbles:true}));
 try{el.focus({preventScroll:true})}catch(_){el.focus()}
}
function finish(el,byEnter){
 clearTimeout(timer);timer=0;
 if(busy||!el)return;
 const raw=el.value.trim();
 const speed=trace.el===el&&trace.count>=MIN;
 const isScan=byEnter||speed;
 if(!isScan||!/^\d{5,20}$/.test(raw.replace(/[\s-]/g,'')))return;
 const product=lookup(raw);
 if(!product){announce('Código no registrado: '+raw+'. No se agregó.',true);reset(el);return}
 if(typeof window.NAVARRO_ESCANER_AGREGAR!=='function'){announce('El carrito aún no está listo para recibir el escaneo.',true);reset(el);return}
 if(lastAdd.code===product.code&&Date.now()-lastAdd.at<380){reset(el);return}
 busy=true;
 const before=(()=>{try{return JSON.parse(localStorage.getItem('navarro_cart_v1')||'{}')[product.code]||0}catch(_){return 0}})();
 let result;
 try{result=window.NAVARRO_ESCANER_AGREGAR(product.code)}catch(e){result={ok:false,reason:'Error al agregar al carrito'}}
 if(result&&result.ok){
  lastAdd={code:product.code,at:Date.now()};
  announce('✓ '+product.name+' agregado. Listo para escanear otro código.',false);
 }else{announce((result&&result.reason)||'No se pudo confirmar el carrito. Revisa antes de repetir.',true)}
 busy=false;reset(el);
}
document.addEventListener('keydown',e=>{
 const el=e.target.closest?.(SELECTOR);if(!el||e.isComposing)return;
 if(e.key==='Enter'||e.key==='Tab'){
  const code=el.value.trim();
  if(/^\d{5,20}$/.test(code.replace(/[\s-]/g,''))){e.preventDefault();e.stopImmediatePropagation();finish(el,true)}
 }
},true);
document.addEventListener('input',e=>{
 const el=e.target.closest?.(SELECTOR);if(!el||busy||e.isComposing)return;
 const v=el.value;
 if(!/^\d{1,20}$/.test(v)){trace={el:null,last:0,count:0};clearTimeout(timer);return}
 const now=Date.now();
 if(trace.el!==el||now-trace.last>FAST_MS)trace={el,last:now,count:1};
 else{trace.last=now;trace.count++}
 clearTimeout(timer);
 if(v.length>=MIN&&trace.count>=MIN&&v.length===trace.count){
  timer=setTimeout(()=>finish(el,false),QUIET_MS);
 }
},true);
})();