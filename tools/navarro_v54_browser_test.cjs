const { chromium }=require('playwright');
const fs=require('fs');
const path=require('path');
(async()=>{
 const result={date:new Date().toISOString(),errors:[],console:[],steps:[]};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1250,height:900},acceptDownloads:true});
 const page=await context.newPage();
 page.on('pageerror',e=>result.errors.push('pageerror: '+String(e)));
 page.on('console',m=>{if(m.type()==='error')result.errors.push('console: '+m.text().slice(0,350))});
 page.on('requestfailed',r=>{if(/mediapipe|mobilenet_v3|buscar-foto/.test(r.url()))result.errors.push('request failed: '+r.url()+' '+r.failure()?.errorText)});
 try{
  await page.goto('http://localhost:8111/index.html',{waitUntil:'domcontentloaded',timeout:90000});
  result.visibility=await page.evaluate(()=>[...document.querySelectorAll('.nav-visual-trigger')].map(e=>{
    const cs=getComputedStyle(e),p=getComputedStyle(e.parentElement);
    const box=e.getBoundingClientRect();
    return {parent:e.parentElement.className,id:e.parentElement.querySelector('input')?.id,
      display:cs.display,visibility:cs.visibility,opacity:cs.opacity,client:box.toJSON(),
      parentDisplay:p.display,parentVisibility:p.visibility,outer:e.parentElement.outerHTML.slice(0,500)};
   }));
  console.log('Photo button visibility',JSON.stringify(result.visibility));
  await page.locator('#search').evaluate(e=>e.scrollIntoView({block:'center'}));
  await page.waitForTimeout(300);
  await page.locator('.nav-visual-trigger:visible').first().waitFor({timeout:6000});
  const n=await page.locator('.nav-visual-trigger').count();
  result.steps.push('botones de foto visibles: '+n);
  if(n!==2)throw Error('Se esperaban 2 botones de foto');
  const chooserPromise=page.waitForEvent('filechooser',{timeout:12000});
  await page.locator('.nav-visual-trigger:visible').first().click();
  const chooser=await chooserPromise;
  const files=fs.readdirSync('navarro360-movil/assets').filter(f=>/^navarro-publicada-\d+\.jpg$/.test(f));
  if(!files.length)throw Error('No hay foto local para prueba');
  const photo=path.resolve('navarro360-movil/assets',files[0]);
  result.test_photo=files[0];
  await chooser.setFiles(photo);
  await page.locator('dialog.nav-visual-dialog[open]').waitFor({timeout:15000});
  result.steps.push('diálogo de búsqueda abierto');
  try{
   await page.locator('.nav-visual-item').first().waitFor({timeout:120000});
   result.steps.push('coincidencias visuales: '+await page.locator('.nav-visual-item').count());
   const status=await page.locator('.nav-visual-status').textContent();
   result.status=status;
   result.first_result=await page.locator('.nav-visual-item').first().textContent();
  }catch(e){
   result.status=await page.locator('.nav-visual-status').textContent();
   throw Error('Sin resultados visuales: '+result.status+' '+String(e).slice(0,100));
  }
  const show=page.locator('.nav-visual-item button[data-visual-show]').first();
  await show.click();
  const searchValue=await page.locator('#search').inputValue();
  if(!/^\d{5,}$/.test(searchValue))throw Error('Ver producto no actualizó buscador: '+searchValue);
  result.steps.push('selección devuelve código al buscador: '+searchValue);
  result.ok=true;
 }catch(e){result.ok=false;result.errors.push(String(e));}
 fs.writeFileSync('test-browser-foto-v54.json',JSON.stringify(result,null,2));
 await browser.close();
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exit(1);
})();