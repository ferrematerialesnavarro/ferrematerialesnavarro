# NAVARRO 360 V50: continue remaining product photos, accept only exact EAN or Truper internal code.
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin, unquote
from html import unescape
from concurrent.futures import ThreadPoolExecutor
import re,json,unicodedata,math,time,collections
from rapidfuzz import fuzz,process
BASE='https://ferreteriastrp.com'
t0=time.monotonic()
s=Path('navarro360-movil/index.html').read_text()
a=s.index('window.NAVARRO_DB=')+len('window.NAVARRO_DB=')
catalog,_=json.JSONDecoder().raw_decode(s[a:])
m=Path('navarro360-movil/truper-fotos-catalogo-v50.js').read_text()
a=m.index('Object.freeze(')+len('Object.freeze(')
existing,_=json.JSONDecoder().raw_decode(m[a:])
def norm(value):
 raw=unicodedata.normalize('NFKD',str(value or '').lower())
 raw=''.join(c for c in raw if not unicodedata.combining(c))
 return re.sub(r'[^a-z0-9]+','-',raw).strip('-')
def get(url,lim=140000):
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (NAVARRO360 image catalog)','Accept':'text/html'}),timeout=15) as resp:
  return resp.read(lim).decode('utf-8','replace')
def parse(page):
 url=f'{BASE}/productos?orden=catalogo&pagina={page}'
 try:
  text=get(url,180000)
  cards=re.findall(r'<article\b[^>]*class="[^"]*\bbento-catalog-product\b[^"]*"[^>]*>(.*?)</article>',text,re.S|re.I)
  found=[]
  for card in cards:
   link=re.search(r'href="([^"]*/productos/[^"]+)"',card,re.I)
   im=re.search(r'<img\b[^>]*src="([^"]+)"',card,re.I)
   if not link or not im:continue
   slug=norm(unquote(unescape(link.group(1)).split('?',1)[0].rsplit('/',1)[-1]))
   urlPic=urljoin(BASE,unescape(im.group(1)))
   if not urlPic.startswith(BASE+'/public/mnt/wtrp/images/productos/'):continue
   short=unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',card)))
   foundCode=re.search(r'/\s*([A-Z0-9+./-]{2,35})\s*/\s*(\d{4,6})',short,re.I)
   if not foundCode:continue
   clave=foundCode.group(1)
   internal=foundCode.group(2)
   urlProduct=BASE+'/productos/'+slug
   found.append((slug,clave,internal,urlPic,urlProduct))
  return found
 except Exception:return []
with ThreadPoolExecutor(max_workers=12) as pool:
 rows=[item for sub in pool.map(parse,range(1,264)) for item in sub]
byName={}
dup=set()
for r in rows:
 if r[0] in byName and byName[r[0]]!=r:dup.add(r[0])
 else:byName[r[0]]=r
for n in dup:byName.pop(n,None)
names=list(byName)
unknown=[(str(r[0]),str(r[1])) for r in catalog if str(r[0]) not in existing and len(str(r[0]))>=5 and len(str(r[0]))<=13]
# A fuzzy title is only used as a lead. Product details must confirm EAN or internal Truper code.
candidates=[]
for code,title in unknown:
 name=norm(title)
 if not name or len(name)<9:continue
 matches=process.extract(name,names,scorer=fuzz.WRatio,score_cutoff=79,limit=1)
 if not matches:continue
 winner,score,_=matches[0]
 row=byName[winner]
 if score>=79:candidates.append((float(score),code,title,row))
candidates.sort(key=lambda x:-x[0])
LIMIT=8000
chosen=candidates[:LIMIT]
def verify(item):
 score,code,title,row=item
 slug,clave,internal,photo,url=row
 try:
  text=get(url,140000)
  clean=re.sub(r'<(?:script|style)[^>]*>.*?</(?:script|style)>',' ',text,flags=re.S|re.I)
  txt=unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',clean)))
  ean=re.search(r'\bEAN\s*:\s*(\d{12,13})\b',txt,re.I)
  mcode=re.search(r'\bC[oó]digo\s*:\s*(\d{4,6})\b',txt,re.I)
  actualEan=ean.group(1) if ean else ''
  actualCode=mcode.group(1) if mcode else internal
  if code in (actualEan,actualCode) and re.fullmatch(r'[A-Z0-9+./-]{2,35}',clave,re.I):
   return (code,[clave,photo],score,'')
  return (code,None,score,'different EAN '+actualEan)
 except Exception as err:return (code,None,score,str(err)[:100])
with ThreadPoolExecutor(max_workers=24) as pool:
 checked=list(pool.map(verify,chosen))
new={code:data for code,data,_,_ in checked if data}
result={**existing,**new}
assert len(result)>len(existing)
Path('navarro360-movil/truper-fotos-catalogo-v49.js').write_text('/* NAVARRO 360 V50: nombres únicos y ampliación verificada individualmente por EAN/código Truper. */\nwindow.NAVARRO_FOTOS_TRUPER_V48=Object.freeze('+json.dumps(result,ensure_ascii=False,separators=(',',':'))+');\n')
report={
 'existing':len(existing),'supplier_products':len(rows),'catalog_unmatched':len(unknown),
 'candidate_count':len(candidates),'tested_detail':len(checked),
 'verified_extra':len(new),'total_map':len(result),
 'elapsed_seconds':round(time.monotonic()-t0,1),
 'sample_new':list(new.items())[:18],
 'failed_samples':[{'sku':c,'score':score,'reason':error} for c,d,score,error in checked if d is None][:25]
}
Path('truper-v50-informe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(report)
