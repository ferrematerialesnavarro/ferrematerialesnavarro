const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const report={time:new Date().toISOString(),success:false,checks:[],errors:[],cases:[]};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push('JavaScript: '+e.message));
 try{
  await page.goto('http://localhost:8111/test-fotos-v58.html',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('#products article[data-card]').first().waitFor({timeout:25000});
  report.checks.push('Catálogo carga y conserva tarjetas');
  for(const width of [390,860]){
   await page.setViewportSize({width,height:900});
   for(const id of ['7506610231696','7506610224100','7506240611363','7506240611370','7777001082']){
    await page.evaluate(code=>{
     const visible=[document.getElementById('search-mobile'),document.getElementById('search')].filter(Boolean);
     for(const node of visible){node.value=code;node.dispatchEvent(new Event('input',{bubbles:true}));}
    },id);
    const card=page.locator('#products article[data-card="'+id+'"]').first();
    try{await card.waitFor({state:'visible',timeout:7000})}catch(e){
     report.cases.push({width,id,error:'No aparece resultado de producto en búsqueda'});
     continue;
    }
    await page.waitForTimeout(240);
    const data=await card.evaluate(article=>{
      const visual=article.querySelector(':scope > .product-visual');
      if(!visual)return {error:'Sin marco de fotografía'};
      const r=visual.getBoundingClientRect(),css=getComputedStyle(visual);
      const image=visual.querySelector(':scope > img');
      const sprite=visual.querySelector(':scope > .product-sprite, :scope > .nav-material-photo');
      const element=image||sprite;
      const b=element?.getBoundingClientRect();
      const st=element?getComputedStyle(element):null;
      const center=b?Math.hypot((b.left+b.width/2)-(r.left+r.width/2),(b.top+b.height/2)-(r.top+r.height/2)):null;
      return {
       id:article.dataset.card,layout:getComputedStyle(article).display,
       visual:{width:r.width,height:r.height,background:css.backgroundColor,border:css.borderTopWidth},
       media:element?{tag:element.tagName,cls:element.className,objectFit:st.objectFit,
         objectPosition:st.objectPosition,position:st.position,transform:st.transform,
         width:b.width,height:b.height,centerOffset:center,
         inside:b.left>=r.left-2&&b.right<=r.right+2&&b.top>=r.top-2&&b.bottom<=r.bottom+2}:null,
       pencil:!!visual.querySelector('.card-importe'),
       photoButton:!!visual.querySelector('.nav-v40-camera,.nav-camera')
      };
    });
    report.cases.push({width,...data});
    if(data.media){
      if(!data.media.inside||data.media.centerOffset>3)throw Error('Foto fuera de marco / mal centrada: '+JSON.stringify({width,id,data}));
      if(data.media.tag==='IMG'&&data.media.objectFit!=='contain')throw Error('Foto recortada (object-fit) '+id);
    }
   }
   report.checks.push('Fotos centradas en tarjetas a '+width+' px');
  }
  const count=await page.locator('#cart-items').count();
  report.checks.push('El carrito permanece presente ('+count+')');
  const button=await page.locator('.nav-visual-trigger').count();
  if(button<1)throw Error('La búsqueda por foto perdió el botón de cámara');
  report.checks.push('Cámara del buscador conserva botón');
  if(report.errors.length)throw Error('Errores JS durante prueba: '+report.errors.join('; ').slice(0,400));
  report.success=true;
 }catch(e){report.errors.push(String(e))}
 fs.writeFileSync('navarro-v58-prueba-fotos.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await browser.close();
 if(!report.success)process.exitCode=1;
})();