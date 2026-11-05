const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const report={date:new Date().toISOString(),ok:false,checks:[],cases:[],errors:[],screenshot:''};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>report.errors.push('JS: '+e.message));
 try{
  await page.goto('http://localhost:8111/test-movil-v59.html',{waitUntil:'domcontentloaded',timeout:75000});
  await page.locator('#products article[data-card]').first().waitFor({timeout:25000});
  for(const width of [375,390,430,860]){
   await page.setViewportSize({width,height:844});
   await page.waitForTimeout(200);
   for(const id of ['7506610231696','7506610224100','7506240611363','7506240611370']){
    await page.evaluate(code=>{
     for(const input of ['search','search-mobile'].map(x=>document.getElementById(x)).filter(Boolean)){
      input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}));
     }
    },id);
    const item=page.locator('#products article[data-card="'+id+'"]').first();
    await item.waitFor({state:'visible',timeout:10000});
    await page.waitForTimeout(230);
    const record=await item.evaluate(card=>{
     const photo=card.querySelector(':scope > .product-visual');
     const info=card.querySelector(':scope > .product-info');
     const img=photo?.querySelector(':scope > img:not([hidden])')||photo?.querySelector(':scope > .product-sprite');
     const cb=card.getBoundingClientRect(),pb=photo?.getBoundingClientRect(),ib=info?.getBoundingClientRect(),mb=img?.getBoundingClientRect();
     const crop=img?getComputedStyle(img):null;
     const grid=getComputedStyle(card.parentElement);
     const price=card.querySelector('.price');
     const action=card.querySelector('.card-prompt,.card-qty');
     const pr=price?.getBoundingClientRect(),ar=action?.getBoundingClientRect();
     return {
      id:card.dataset.card,
      card:{x:cb.x,width:cb.width,height:cb.height,display:getComputedStyle(card).display},
      photo:pb?{x:pb.x,y:pb.y,width:pb.width,height:pb.height}:null,
      info:ib?{x:ib.x,y:ib.y,width:ib.width,height:ib.height}:null,
      media:mb?{x:mb.x,y:mb.y,width:mb.width,height:mb.height,center:Math.abs(mb.x+mb.width/2-pb.x-pb.width/2),fit:crop?.objectFit,loaded:img.tagName==='IMG'?img.naturalWidth>0:true}:null,
      grid: grid.gridTemplateColumns,
      title:card.querySelector('h3')?.textContent?.slice(0,120),
      price:price?.textContent?.trim(),
      priceY:pr?.y,
      actionY:ar?.y
     };
    });
    report.cases.push({width,...record});
    if(!record.photo||!record.info||!record.media)throw Error('Faltan foto o datos en la tarjeta '+id+' '+width);
    if(width<=560){
     if(record.card.display!=='flex')throw Error('Sigue la división interna de dos columnas: '+id);
     if(record.photo.width<120||record.photo.width<record.card.width*.82)throw Error('Foto todavía angosta: '+JSON.stringify(record));
     if(record.info.y<record.photo.y+record.photo.height-2)throw Error('Información superpuesta sobre la fotografía: '+JSON.stringify(record));
     if(record.media.center>3||record.media.fit!=='contain')throw Error('Imagen no centrada: '+JSON.stringify(record));
     if(record.card.height>520)throw Error('Tarjeta demasiado alta: '+record.card.height);
    }else if(record.card.display!=='flex')throw Error('Diseño en escritorio no se conserva');
   }
   report.checks.push('Tarjetas de 4 regaderas: foto amplia y datos debajo a '+width+' px');
  }
  // Print actual HTML card dimensions on an iPhone-sized viewport for objective verification.
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const q=document.getElementById('search');if(q){q.value='REGADERA';q.dispatchEvent(new Event('input',{bubbles:true}))}});
  await page.waitForTimeout(750);
  const cards=page.locator('#products article[data-card]');
  if(await cards.count()<2)throw Error('No aparecen suficientes tarjetas para probar la cuadrícula');
  await cards.first().scrollIntoViewIfNeeded();
  const screenshot=await page.screenshot({type:'jpeg',quality:52,animations:'disabled'});
  report.screenshot=screenshot.toString('base64');
  report.checks.push('Cuadrícula móvil de dos columnas con fotografías encima de cada producto');
  const count=await page.locator('#cart-items').count();
  if(count!==1)throw Error('El carrito dejó de existir');
  if(await page.locator('.nav-visual-trigger:visible').count()<1)throw Error('Se perdió la cámara del buscador');
  report.checks.push('Carrito y cámara conservan controles');
  if(report.errors.length)throw Error(report.errors.slice(0,3).join(' / '));
  report.ok=true;
 }catch(e){report.errors.push(String(e))}
 fs.writeFileSync('navarro-v59-mobile-test.json',JSON.stringify(report));
 console.log(JSON.stringify({...report,screenshot:report.screenshot?'capturada':null},null,2));
 await browser.close();
 if(!report.ok)process.exitCode=1;
})();