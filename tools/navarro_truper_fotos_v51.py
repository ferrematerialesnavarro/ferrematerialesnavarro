# NAVARRO 360 V51. Coincidencias pendientes: modelo interno único o EAN exacto.
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen,Request
from urllib.parse import unquote,urljoin
from html import unescape
from collections import defaultdict,Counter
from rapidfuzz import fuzz, process
import json,re,unicodedata,math,time
start_time=time.monotonic()
base='https://ferreteriastrp.com'
s=Path('navarro360-movil/index.html').read_text()
a=s.index('window.NAVARRO_DB=')+len('window.NAVARRO_DB=')
db,_=json.JSONDecoder().raw_decode(s[a:])
m=Path('navarro360-movil/truper-fotos-catalogo-v50.js').read_text()
a=m.index('Object.freeze(')+len('Object.freeze(')
existing,_=json.JSONDecoder().raw_decode(m[a:])
def norm(t):
 s=unicodedata.normalize('NFKD',str(t).lower())
 s=''.join(c for c in s if not unicodedata.combining(c))
 return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def read(url,limit=160000):
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (NAVARRO360)','Accept':'text/html'}),timeout=18) as r:
  return r.read(limit).decode('utf-8','replace')
def parse_page(page):
 try:
  doc=read(f'{base}/productos?orden=catalogo&pagina={page}',180000)
  cards=re.findall(r'<article\b[^>]*\bclass="[^"]*\bbento-catalog-product\b[^"]*"[^>]*>(.*?)</article>',doc,re.S|re.I)
  out=[]
  for card in cards:
   match_link=re.search(r'href="([^"]*/productos/[^"]+)"',card,re.I)
   match_img=re.search(r'<img\b[^>]*src="([^"]+)"',card,re.I)
   if not match_link or not match_img:continue
   slug=norm(unquote(unescape(match_link.group(1)).split('?',1)[0].rsplit('/',1)[-1]))
   photo=urljoin(base,unescape(match_img.group(1)))
   if not re.fullmatch(r'https://ferreteriastrp\.com/public/mnt/wtrp/images/productos/[a-z0-9%_.-]+\.(?:webp|png|jpe?g)(?:\?[^"]*)?',photo,re.I):continue
   name=unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',card)))
   found=re.search(r'/\s*([A-Z0-9+./-]{2,35})\s*/\s*(\d{4,6})',name,re.I)
   if not found:continue
   out.append((slug,found.group(1),found.group(2),photo,base+'/productos/'+slug))
  return out
 except Exception as exc:
  return []
with ThreadPoolExecutor(max_workers=14) as pool:
 products=[x for chunk in pool.map(parse_page,range(1,264)) for x in chunk]
by_slug={}
duplicates=set()
by_internal=defaultdict(list)
for rec in products:
 if rec[0] in by_slug and by_slug[rec[0]]!=rec:duplicates.add(rec[0])
 else:by_slug[rec[0]]=rec
 by_internal[rec[2]].append(rec)
for key in duplicates:by_slug.pop(key,None)
missing=[(str(r[0]),str(r[1])) for r in db if str(r[0]) not in existing and re.fullmatch(r'\d{5,13}',str(r[0]))]
result={}
internal_found=0
for code,title in missing:
 if len(code)>6:continue
 candidates=by_internal.get(code,[])
 unique_by_id={r[0]:r for r in candidates}
 if len(unique_by_id)==1:
  prod=next(iter(unique_by_id.values()))
  result[code]=[prod[1],prod[3]]
  internal_found+=1
remaining=[(code,title) for code,title in missing if code not in result]
names=list(by_slug)
target_urls=defaultdict(set)
for code,title in remaining:
 label=norm(title)
 if len(label)<8:continue
 matches=process.extract(label,names,scorer=fuzz.WRatio,score_cutoff=74,limit=4)
 for label,score,ix in matches:
  if score>=74:
   target_urls[by_slug[label][4]].add(code)
def fetch_detail(item):
 url,codes=item
 try:
  data=read(url,200000)
  data=re.sub(r'<(?:script|style)[^>]*>.*?</(?:script|style)>',' ',data,flags=re.I|re.S)
  plain=unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',data)))
  e=re.search(r'\bEAN\s*:\s*(\d{12,13})\b',plain,re.I)
  i=re.search(r'\bC[oó]digo\s*:\s*(\d{4,6})\b',plain,re.I)
  return url,e.group(1) if e else '',i.group(1) if i else ''
 except Exception:return url,'',''
url_items=list(target_urls.items())
with ThreadPoolExecutor(max_workers=26) as pool:
 details=list(pool.map(fetch_detail,url_items))
lookup={r[4]:r for r in by_slug.values()}
barcode_found=0
for url,ean,internal in details:
 if not ean and not internal:continue
 rec=lookup.get(url)
 if not rec:continue
 codes=target_urls[url]
 for code in codes:
  if code in result:continue
  match_ean=ean==code or (len(code)==12 and ean=='0'+code)
  match_internal=(len(code)<=6 and code==internal)
  if match_ean or match_internal:
   result[code]=[rec[1],rec[3]]
   barcode_found+=1
out=dict(existing)
out.update(result)
Path('navarro360-movil/truper-fotos-catalogo-v51.js').write_text(
 '/* NAVARRO 360 V51: banco ampliado por modelo único o código de barras exacto; sin asignaciones aproximadas. */\n'
 +'window.NAVARRO_FOTOS_TRUPER_V48=Object.freeze('+json.dumps(out,ensure_ascii=False,separators=(',',':'))+');\n')
report={
 'base':len(existing),'unmatched_catalog':len(missing),'supplier_rows':len(products),
 'checked_unique_pages':len(target_urls),'verified_new':len(result),
 'matched_internal':internal_found,'matched_barcode':barcode_found,
 'total':len(out),'elapsed':round(time.monotonic()-start_time,1),
 'sample':list(result.items())[:15]
}
Path('truper-v51-informe.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(report)
