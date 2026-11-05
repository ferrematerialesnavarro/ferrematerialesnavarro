const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const outcomes=[];
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [320,390,430,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
   await page.goto('http://localhost:8111/index.html',{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('.nav-visual-trigger').first().waitFor({state:'attached',timeout:20000});
   await page.locator('.nav-scan-launch').first().waitFor({state:'attached',timeout:20000});
   const results=await page.evaluate(()=>{
    const items=[];
    for(const id of ['search-mobile','search']){
     const inp=document.getElementById(id);if(!inp)continue;
     const host=inp.parentElement,photo=host.querySelector('.nav-visual-trigger'),scan=host.querySelector('.nav-scan-launch');
     if(!photo||!scan)throw Error('Faltan botones en '+id);
     const r=x=>{const p=x.getBoundingClientRect();return {x:p.left,y:p.top,right:p.right,bottom:p.bottom,w:p.width,h:p.height}};
     const p=r(photo),s=r(scan),h=r(host),i=r(inp);
     const intersect=Math.max(0,Math.min(p.right,s.right)-Math.max(p.x,s.x))*Math.max(0,Math.min(p.bottom,s.bottom)-Math.max(p.y,s.y));
     items.push({id,visible:!!host.getClientRects().length&&getComputedStyle(host).display!=='none',photo:p,scanner:s,host:h,input:i,overlap:intersect,inputPadding:getComputedStyle(inp).paddingRight,photoStyle:getComputedStyle(photo).position,scannerStyle:getComputedStyle(scan).position,inHost:p.x>=h.x-1&&p.right<=h.right+1&&(s.w===0||(s.x>=h.x-1&&s.right<=h.right+1))});
    }
    return items;
   });
   const visible=results.filter(x=>x.visible);
   for(const x of visible)if(x.overlap>0||!x.inHost||x.photoStyle!=='absolute')errors.push('Bad button layout '+x.id+JSON.stringify(x));
   outcomes.push({width,visible:visible.map(x=>x.id),results,errors,passed:errors.length===0});
   await page.close();
  }
 }catch(e){outcomes.push({error:String(e),passed:false})}
 finally{await browser.close()}
 fs.writeFileSync('navarro-v541-layout-report.json',JSON.stringify(outcomes,null,2));
 console.log(JSON.stringify(outcomes.map(x=>({width:x.width,passed:x.passed,visible:x.visible,error:x.error||x.errors?.join(';'),boxes:x.results?.map(b=>({id:b.id,overlap:b.overlap,inHost:b.inHost,photo:b.photo.x,scanner:b.scanner.x,inputPadding:b.inputPadding}))})),null,2));
 if(outcomes.some(x=>!x.passed))process.exit(1);
})();