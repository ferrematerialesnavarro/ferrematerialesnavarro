/* NAVARRO 360 V25: cualquier cliente puede leer las ALTAS publicadas en GitHub Pages.
   NO ofrece operaciones de escritura ni lee la identidad de la impresora. */
(()=>{'use strict';
 const URL_PUBLIC='./altas-publicas-v25/catalogo.json';
 let loading=false,lastTime='',ready=false;
 async function update(){
  if(loading)return;loading=true;
  try{
   const res=await fetch(URL_PUBLIC+'?updated='+Math.floor(Date.now()/60000),{cache:'no-store',credentials:'omit'});
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
   window.NAVARRO_NUEVOS_PRODUCTOS_V23?.replacePublished(rows,data.aliases);
   lastTime=String(data.updatedAt||'');ready=true;
  }catch(err){/* No se inutiliza el catálogo principal si falta la red. */}
  finally{loading=false;}
 }
 update();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 setInterval(()=>{if(!document.hidden)update();},60000);
 window.NAVARRO_PUBLICOS_V25=Object.freeze({version:25,recargar:update,estado:()=>({listo:ready,actualizado:lastTime})});
})();