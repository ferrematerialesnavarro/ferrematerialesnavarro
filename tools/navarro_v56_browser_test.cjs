const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const report={date:new Date().toISOString(),ok:false,checks:[],errors:[],samples:[]};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
 const page=await ctx.newPage();
 page.on('pageerror',err=>report.errors.push('pageerror: '+err.message));
 page.on('console',msg=>{if(msg.type()==='error'&&!/TensorFlow Lite XNNPACK delegate|INFO:/.test(msg.text()))report.errors.push('console: '+msg.text().slice(0,240))});
 async function pick(name){
  const picker=page.waitForEvent('filechooser',{timeout:10000});
  await page.locator('.nav-visual-trigger:visible').first().click();
  const choose=await picker;
  await choose.setFiles(path.resolve('navarro360-movil/assets',name));
  await page.locator('.nav-visual-family:visible').first().waitFor({timeout:90000});
  const groups=await page.locator('.nav-visual-family:visible').count();
  const allGroups=await page.locator('.nav-visual-family').count();
  const visibleCards=await page.locator('.nav-visual-item:visible').count();
  const buttons=await page.locator('.nav-visual-variants:visible').count();
  const first=await page.locator('.nav-visual-family:visible').first().textContent();
  const status=await page.locator('.nav-visual-status').textContent();
  const sample={name,groups,allGroups,visibleCards,buttons,first:first?.slice(0,240),status};
  report.samples.push(sample);
  if(groups>5||visibleCards>5)throw Error('Resultados sin agrupar: '+JSON.stringify(sample));
  if(groups<1)throw Error('Ninguna familia encontrada');
  if(!status.includes('tipos de productos'))throw Error('No aparece estado por familias: '+status);
  if(allGroups>5){
   const expand=page.locator('.nav-visual-more');
   if(!await expand.isVisible())throw Error('Falta botón para explorar otras familias');
   await expand.click();
   const moreCount=await page.locator('.nav-visual-family:visible').count();
   if(moreCount<=5)throw Error('Mostrar otras familias no desplegó los resultados');
   report.checks.push('Despliega otras familias si las primeras no son correctas');
   await expand.click();
  }
  if(buttons>0){
   const variant=page.locator('.nav-visual-variants:visible').first();
   await variant.click();
   const rows=await page.locator('.nav-visual-variant-list:not([hidden]) .nav-visual-item:visible').count();
   if(rows<1)throw Error('No se desplegaron medidas o modelos dentro de la familia');
   report.checks.push('Agrupa modelos y permite elegir variantes reales: '+rows);
   await variant.click();
  }
  return sample;
 }
 try{
  await page.goto('http://localhost:8111/test-foto-v56.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('.nav-visual-trigger:visible').first().waitFor({timeout:18000});
  const photo='navarro-publicada-038753323510.jpg';
  if(!fs.existsSync('navarro360-movil/assets/'+photo))throw Error('Falta foto de prueba');
  await pick(photo);
  report.checks.push('Coincidencias agrupadas y sin diez opciones arbitrarias');
  const firstCode=await page.locator('.nav-visual-family:visible .nav-visual-item:visible button[data-visual-show]').first().getAttribute('data-visual-show');
  if(!firstCode)throw Error('No se puede abrir producto');
  await page.locator('.nav-visual-family:visible .nav-visual-item:visible button[data-visual-show]').first().click();
  if(await page.locator('dialog.nav-visual-dialog').evaluate(d=>d.open))throw Error('No cerró diálogo al elegir producto');
  if(await page.locator('#search').inputValue()!==firstCode)throw Error('Producto no seleccionado correctamente');
  report.checks.push('Ver producto conserva búsqueda normal y código exacto');
  const other='navarro-publicada-7777000053.jpg';
  if(fs.existsSync('navarro360-movil/assets/'+other)){
   await pick(other);
   report.checks.push('Segunda familia distinta: plomería');
   const canvas=page.locator('.nav-visual-cropstage');
   const box=await canvas.boundingBox();
   if(!box||box.width<45)throw Error('No puede marcar recorte de imagen');
   await page.mouse.move(box.x+box.width*.14,box.y+box.height*.14);
   await page.mouse.down();await page.mouse.move(box.x+box.width*.85,box.y+box.height*.85,{steps:8});await page.mouse.up();
   const crop=page.locator('.nav-visual-cropactions button').first();
   if(await crop.isDisabled())throw Error('No se activa recorte');
   await crop.click();
   await page.waitForFunction(()=>document.querySelector('.nav-visual-status')?.textContent?.includes('tipos de productos'),null,{timeout:90000});
   if(await page.locator('.nav-visual-family:visible').count()<1)throw Error('No hay coincidencias después de recorte');
   report.checks.push('Recorte vuelve a buscar, conserva agrupación de resultados');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.nav-visual-trigger:visible').first().waitFor();
  const btnCount=await page.locator('.nav-visual-trigger:visible').count();
  if(btnCount!==1)throw Error('En móvil, cámara de fotos duplicada');
  report.checks.push('Control visible en móvil sin duplicados');
  report.ok=true;
 }catch(e){report.errors.push('TEST: '+String(e.message||e))}
 fs.writeFileSync('navarro-v56-browser-result.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await browser.close();
 if(!report.ok)process.exitCode=1;
})();