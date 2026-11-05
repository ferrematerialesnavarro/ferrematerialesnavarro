# NAVARRO 360 V52 — second verified source; map EAN -> Truper official key/photo.
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urljoin,unquote
from html import unescape
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict,Counter
from rapidfuzz import process,fuzz
import re,json,unicodedata,time
start=time.monotonic()
html=Path("navarro360-movil/index.html").read_text()
p=html.index("window.NAVARRO_DB=")+len("window.NAVARRO_DB=")
catalog,_=json.JSONDecoder().raw_decode(html[p:])
manifest=Path("navarro360-movil/truper-fotos-catalogo-v51.js").read_text()
p=manifest.index("Object.freeze(")+len("Object.freeze(")
prior,_=json.JSONDecoder().raw_decode(manifest[p:])
audit=json.loads(Path("navarro-truper-faltantes-v51.json").read_text())
missing=[(str(code),name) for code,name in audit["likely_truper"] if str(code) not in prior]
BASE="https://ferrexmayorista.com"
def norm(s):
 s=unicodedata.normalize("NFKD",str(s or "").lower())
 s="".join(ch for ch in s if not unicodedata.combining(ch))
 return re.sub(r"[^a-z0-9]+","",s)
def normwords(s):
 s=unicodedata.normalize("NFKD",str(s or "").lower())
 s="".join(ch for ch in s if not unicodedata.combining(ch))
 return re.sub(r"[^a-z0-9]+","-",s).strip("-")
def get(url,max_bytes=180000):
 with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (NAVARRO360 product image verifier)","Accept":"text/html,application/xml"}),timeout=18) as r:
  return r.read(max_bytes).decode("utf-8","replace")
doc=get(BASE+"/sitemap.xml",4500000)
product_urls=re.findall(r"<loc>(https://ferrexmayorista.com/tienda/producto/(\d+)/[^<]+)</loc>",doc)
assert 15000<len(product_urls)<20000,len(product_urls)
rows=[]
compact=defaultdict(list)
for url,site_id in product_urls:
 slug=unquote(url.rstrip("/").rsplit("/",1)[-1])
 name=normwords(slug)
 if name:rows.append((name,norm(slug),url,site_id))
for name,compact_name,url,site_id in rows:
 compact[compact_name].append((name,url,site_id))
names=list({r[0] for r in rows})
lookup=defaultdict(list)
for a,b,c,d in rows:lookup[a].append((b,c,d))
candidates=defaultdict(set)
exact_sources=0
for code,title in missing:
 compact_name=norm(title)
 if len(compact_name)<6:continue
 found=compact.get(compact_name,[])
 if found:
  exact_sources+=1
  for name,url,sid in found:candidates[url].add(code)
 else:
  name=normwords(title)
  # Fuzzy is only for FINDING a product page; EAN validation is required to assign photos.
  for selected,score,_ in process.extract(name,names,scorer=fuzz.WRatio,score_cutoff=67,limit=5):
   for comp,url,sid in lookup[selected]:candidates[url].add(code)
def verify(item):
 url,code_set=item
 site_id=re.search(r"/tienda/producto/(\d+)/",url)
 if not site_id:return None
 site_id=site_id.group(1)
 try:
  src=get(url,150000)
  block=re.search(r'<div class=["\\x27]product-codes["\\x27][^>]*>(.*?)</div>',src,re.I|re.S)
  if not block:return None
  plain=unescape(re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",block.group(1)))).strip()
  ean=re.search(r"\bEAN\s*:\s*(\d{12,13})\b",plain,re.I)
  code=re.search(r"\bC[oó]digo\s*:\s*(\d{4,6})\b",plain,re.I)
  clave=re.search(r"\bClave\s*:\s*([A-Z0-9+./-]{2,35})",plain,re.I)
  if not clave or not (ean or code):return None
  manufacturer=code.group(1) if code else ""
  ean=ean.group(1) if ean else ""
  valid={ean,manufacturer}
  if len(ean)==13 and ean[0]=="0":valid.add(ean[1:])
  matched=[candidate for candidate in code_set if candidate in valid]
  if not matched:return None
  # The page's own product-image URL, not a related item image.
  allsrc=re.findall(r'(?:src|data-src|href|content)\s*=\s*["\\x27]([^"\\x27]+)["\\x27]',src,re.I)
  photo=""
  for entry in allsrc:
   if re.search(r"/productos/productos/"+re.escape(site_id)+r"/imagenes/",entry) and re.search(r"\.(?:jpe?g|webp|png)(?:/|\?|$)",entry,re.I):
    photo=urljoin(BASE,unescape(entry));break
  # If product image unavailable, use the official Truper photo only.
  if not photo:photo=""
  return [(sku,[clave.group(1).upper(),photo],manufacturer,ean) for sku in matched]
 except Exception:return None
candidate_items=list(candidates.items())
with ThreadPoolExecutor(max_workers=18) as ex:
 results=[rec for group in ex.map(verify,candidate_items) if group for rec in group]
new={}
checks=[]
for sku,record,internal,ean in results:
 if sku in new and new[sku]!=record:
  checks.append(sku) # Duplicate EAN conflicting sources: exclude
 else:new[sku]=record
for sku in checks:new.pop(sku,None)
out={**prior,**new}
Path("navarro360-movil/truper-fotos-catalogo-v52.js").write_text(
 "/* NAVARRO 360 V52: ampliación de Truper validada por código de barras contra segunda fuente. */\n"
 "window.NAVARRO_FOTOS_TRUPER_V48=Object.freeze("+json.dumps(out,ensure_ascii=False,separators=(",",":"))+");\n")
report={
 "previous":len(prior),"missing_truper_before":len(missing),
 "pages_in_source":len(product_urls),"exact_compact_title_matches":exact_sources,
 "candidate_pages_checked":len(candidate_items),"verified_extra":len(new),
 "total_indexed":len(out),"remaining_truper":len(missing)-len(new),
 "errors_conflicting_sku":checks[:12],
 "with_image_fallback":sum(1 for val in new.values() if val[1]),
 "elapsed_seconds":round(time.monotonic()-start,1),
 "sample_new":list(new.items())[:30],
 "pending_samples":[[code,title] for code,title in missing if code not in new][:100]
}
Path("truper-v52-informe.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print({k:v for k,v in report.items() if not k.startswith("sample") and not k.startswith("pending")})
assert len(new)>0,"No se encontraron nuevas asociaciones verificables."
