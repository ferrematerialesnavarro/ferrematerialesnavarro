const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const report={date:new Date().toISOString(),success:false,checks:[],times:{},errors:[],sourceIndex:'V57 15953'};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1240,height:900},acceptDownloads:true});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push('JavaScript: '+e.message));
 page.on('requestfailed',r=>{if(/foto|mediapipe|mobilenet/i.test(r.url()))report.errors.push('Network: '+r.url()+' '+r.failure()?.errorText)});
 const photo=path.resolve('navarro360-movil/assets/navarro-publicada-7777000053.jpg');
 async function search(){
  const choosePromise=page.waitForEvent('filechooser',{timeout:15000});
  await page.locator('.nav-visual-trigger:visible').first().click();
  const choose=await choosePromise;
  const start=Date.now();
  await choose.setFiles(photo);
  await page.waitForFunction(()=>{
   const msg=document.querySelector('.nav-visual-status')?.textContent||'';
   return msg.includes('tipos de productos')||msg.includes('No se pudo completar la búsqueda');
  },null,{timeout:120000});
  const elapsed=Date.now()-start;
  const status=await page.locator('.nav-visual-status').textContent();
  if(!status.includes('tipos de productos'))throw Error('Visual search not complete: '+status);
  return elapsed;
 }
 try{
  if(!fs.existsSync(photo))throw Error('Falta imagen de prueba');
  await page.goto('http://localhost:8111/test-foto-v57.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('.nav-visual-trigger:visible').first().waitFor({timeout:20000});
  report.checks.push('El botón de cámara aparece en buscador');
  report.times.coldMs=await search();
  const displayed=await page.locator('.nav-visual-item:visible').count();
  if(displayed<1)throw Error('Sin resultados de catálogo');
  const count=await page.locator('.nav-visual-family:visible').count();
  if(count>5)throw Error('Hay más de 5 grupos visibles');
  report.checks.push('Nuevo índice binario respondió y filtró familias ('+count+')');
  let chosen='';
  const variants=page.locator('.nav-visual-variants:visible');
  if(await variants.count()>0){
   await variants.first().click();
   const pick=page.locator('.nav-visual-variant-list:not([hidden]) .nav-visual-item button[data-visual-show]').first();
   await pick.waitFor({timeout:10000});
   chosen=await pick.getAttribute('data-visual-show');
   await pick.click();
  }else{
   const groups=page.locator('.nav-visual-family');
   if(await groups.count()>1){
    const more=page.locator('.nav-visual-more');
    if(await more.count())await more.click();
    const pick=groups.nth(1).locator('button[data-visual-show]').first();
    chosen=await pick.getAttribute('data-visual-show');
    await pick.click();
   }else throw Error('No hay variantes para probar el aprendizaje visual');
  }
  if(!chosen||!(await page.locator('#search').inputValue()).includes(chosen))throw Error('No seleccionó producto');
  const learnedStored=await page.evaluate(()=>JSON.parse(localStorage.getItem('navarro360-photo-feedback-v57')||'[]'));
  if(!learnedStored.some(x=>x.code===chosen))throw Error('La elección no se guardó localmente');
  report.checks.push('La selección de una variante guardó su vector visual localmente: '+chosen);
  report.times.warmMs=await search();
  const first=await page.locator('.nav-visual-family:visible .nav-visual-item:visible button[data-visual-show]').first().getAttribute('data-visual-show');
  const firstText=await page.locator('.nav-visual-family:visible').first().textContent();
  report.chosen=chosen;report.firstAfterLearning=first;report.firstText=firstText?.slice(0,270);
  if(first!==chosen)throw Error('La siguiente búsqueda similar no priorizó el código elegido: '+chosen+' vs '+first);
  if(!firstText.includes('Seleccionado antes'))throw Error('No se identificó el aprendizaje visual en la interfaz');
  report.checks.push('El artículo elegido asciende a primera opción al repetir fotografía');
  await page.locator('.nav-visual-forget').click();
  const saved=await page.evaluate(()=>localStorage.getItem('navarro360-photo-feedback-v57'));
  if(saved)throw Error('El botón de borrar aprendizaje no limpió las elecciones');
  report.checks.push('Permite borrar el aprendizaje local sin afectar carrito');
  await page.setViewportSize({width:390,height:844});
  const mobile=page.locator('.nav-visual-trigger:visible');
  if(await mobile.count()!==1)throw Error('Iconos de cámara duplicados en móvil');
  report.checks.push('Botón único y visible en móvil');
  if(report.errors.length)throw Error(report.errors.join(' / '));
  report.success=true;
 }catch(e){report.errors.push('TEST: '+String(e.message||e))}
 fs.writeFileSync('navarro-v57-browser-result.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await browser.close();
 if(!report.success)process.exitCode=1;
})();