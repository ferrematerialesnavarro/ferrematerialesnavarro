const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const report={date:new Date().toISOString(),success:false,checks:[],errors:[],cases:[],preview:null};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:1120},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>report.errors.push('JS: '+e.message));
 try{
  await page.goto('http://localhost:8111/test-v60.html',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('#products article[data-card]').first().waitFor({timeout:28000});
  report.checks.push('Catálogo de productos carga en móvil');
  for(const width of [375,390,430,820]){
   await page.setViewportSize({width,height:1120});
   for(const id of ['7506610231696','7506610224100','7506240611363','7506240611370','7777001082']){
    await page.evaluate(code=>{
     for(const input of ['search','search-mobile'].map(x=>document.getElementById(x)).filter(Boolean)){
      input.value=code; input.dispatchEvent(new Event('input',{bubbles:true}));
     }
    },id);
    const card=page.locator('#products article[data-card="'+id+'"]').first();
    await card.waitFor({state:'visible',timeout:14000});
    await page.waitForTimeout(180);
    const snapshot=await card.evaluate(el=>{
     const photo=el.querySelector(':scope > .product-visual');
     const info=el.querySelector(':scope > .product-info');
     const pic=photo?.querySelector(':scope > img:not([hidden]), :scope > .product-sprite');
     const button=el.querySelector('.product-bottom button,.card-prompt');
     const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
     const cr=rect(el),pr=rect(photo),ir=rect(info),mr=rect(pic),br=rect(button);
     return {sku:el.dataset.card,screenWidth:innerWidth,card:cr,photo:pr,info:ir,media:mr,button:br,cols:getComputedStyle(el).gridTemplateColumns,
      display:getComputedStyle(el).display,gridCols:getComputedStyle(el.parentElement).gridTemplateColumns,
      objectFit:pic?.tagName==='IMG'?getComputedStyle(pic).objectFit:'',
      mediaCenterOffset:mr&&pr?Math.hypot(mr.x+mr.w/2-pr.x-pr.w/2,mr.y+mr.h/2-pr.y-pr.h/2):null,
      title:el.querySelector('h3')?.textContent?.slice(0,60),
      price:el.querySelector('.price')?.textContent?.trim(),
      hasPhoto:!!pic,hasButton:!!button};
    });
    report.cases.push({width,...snapshot});
    if(!snapshot.hasPhoto||!snapshot.hasButton)throw Error('Foto o botón ausente: '+id);
    if(width<=600){
     if(snapshot.display!=='grid')throw Error('Tarjeta no tiene diseño lateral: '+width+' '+snapshot.display);
     if(snapshot.photo.w<120)throw Error('Foto demasiado angosta: '+width+' '+snapshot.photo.w);
     if(snapshot.info.x<snapshot.photo.x+snapshot.photo.w-2)throw Error('Texto no está a la derecha de la foto');
     if(snapshot.card.w<width*.82)throw Error('Tarjeta demasiado estrecha para ser legible: '+snapshot.card.w);
     if(snapshot.mediaCenterOffset!==null&&snapshot.mediaCenterOffset>3)throw Error('Foto no centrada');
     if(snapshot.objectFit&&snapshot.objectFit!=='contain')throw Error('Imagen recortada');
     if(snapshot.button.y<snapshot.info.y)throw Error('Botón fuera de ficha');
    } else if(snapshot.photo.w<105)throw Error('Fotografía incorrecta en tablet');
   }
   report.checks.push('Fotos laterales, texto y botones: '+width+'px');
  }
  await page.setViewportSize({width:390,height:1120});
  await page.evaluate(()=>{
   for(const input of ['search','search-mobile'].map(x=>document.getElementById(x)).filter(Boolean)){
    input.value='REGADERA';input.dispatchEvent(new Event('input',{bubbles:true}));
   }
  });
  await page.waitForTimeout(750);
  const first=page.locator('#products article[data-card]').first();
  await first.scrollIntoViewIfNeeded();
  const firstBox=await first.boundingBox();
  const screenshot=await page.screenshot({type:'jpeg',quality:58,animations:'disabled',clip:{
   x:0,y:Math.max(0,Math.min(firstBox.y-10,320)),width:390,height:800
  }});
  report.preview=screenshot.toString('base64');
  report.checks.push('Vista real del iPhone capturada para inspección visual');
  if(await page.locator('.nav-visual-trigger').count()<1)throw Error('Se perdió la cámara de búsqueda');
  if(await page.locator('#cart-items').count()!==1)throw Error('Falta carrito');
  report.checks.push('Buscador por foto y carrito permanecen disponibles');
  if(report.errors.length)throw Error(report.errors.slice(0,2).join(' / '));
  report.success=true;
 }catch(e){report.errors.push(String(e))}
 fs.writeFileSync('navarro-v60-mobile-test.json',JSON.stringify(report));
 console.log(JSON.stringify({...report,preview:report.preview?'JPEG '+report.preview.length+' chars':null},null,2).slice(0,17000));
 await browser.close();
 if(!report.success)process.exitCode=1;
})();