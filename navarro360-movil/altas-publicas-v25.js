/* NAVARRO 360 V25: cualquier cliente puede leer las ALTAS publicadas en GitHub Pages.
   NO ofrece operaciones de escritura ni lee la identidad de la impresora. */
(()=>{'use strict';
 const URL_PUBLIC='./altas-publicas-v25/catalogo.json';
 let loading=null,lastTime='',ready=false,lastSuccess=null,lastError=null,publicRows=new Map();
 async function update(){
  if(loading)return loading;
  loading=(async()=>{
  try{
   const res=await fetch(URL_PUBLIC+'?updated='+Date.now(),{cache:'no-store',credentials:'omit'});
   if(!res.ok)throw Error('No se pudo descargar el catálogo público');
   const data=await res.json();
   if(!data||data.version!==25||!Array.isArray(data.products)||data.products.length>1000||
     !data.aliases||typeof data.aliases!=='object'||Array.isArray(data.aliases))
     throw Error('Catálogo público inválido');
   // Solo datos de catálogo, nunca scripts, imágenes externas ni metadatos privados.
   const rows=data.products.filter(p=>p&&/^\d{5,30}$/.test(p.code)&&
      typeof p.name==='string'&&p.name.length>=3&&
      Number.isFinite(p.price)&&p.price>0&&
      Number.isFinite(p.stock)&&p.stock>=0&&
      ['Construcción','Plomería','Electricidad','Herramientas','Pintura','Todos'].includes(p.cat)&&
      ['pieza','metro','kilo','litro'].includes(p.unit));
   if(rows.length!==data.products.length)throw Error('Hay fichas públicas inválidas; se conserva el catálogo anterior.');
   const nextRows=new Map(rows.map(p=>[p.code,p]));
   if(nextRows.size!==rows.length)throw Error('Hay códigos públicos duplicados; se conserva el catálogo anterior.');
   if(typeof window.NAVARRO_NUEVOS_PRODUCTOS_V23?.replacePublished!=='function')throw Error('Catálogo principal aún no disponible.');
   window.NAVARRO_NUEVOS_PRODUCTOS_V23.replacePublished(rows,data.aliases);
   publicRows=nextRows;lastTime=String(data.updatedAt||'');ready=true;lastSuccess=new Date().toISOString();lastError=null;
   return true;
  }catch(err){lastError=err?.message||'Sin conexión';return false;}
  })().finally(()=>{loading=null;});
  return loading;
 }
 update();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 window.addEventListener('online',update);
 window.addEventListener('pageshow',update);
 setInterval(()=>{if(!document.hidden)update();},60000);
 window.NAVARRO_PUBLICOS_V25=Object.freeze({version:25,recargar:update,estado:()=>({listo:ready,actualizado:lastTime,ultimaConsulta:lastSuccess,error:lastError,consultando:!!loading,total:publicRows.size}),listar:()=>Array.from(publicRows.values(),p=>({...p})),verificar:(code)=>{const p=publicRows.get(String(code));return p?{code:p.code,name:p.name,price:p.price,stock:p.stock}:null;}});
})();