# NAVARRO 360. Association by unique normalized catalog title, no guessing across variants.
# Sources: NAVARRO_DB active and public Group Truper distributor catalogue.
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.parse import urljoin, quote, unquote
from html import unescape
import re, json, unicodedata, math, time, collections
START=time.monotonic()
BASE='https://ferreteriastrp.com'
HTML=Path('navarro360-movil/index.html').read_text()
start=HTML.index('window.NAVARRO_DB=')+len('window.NAVARRO_DB=')
catalog,_=json.JSONDecoder().raw_decode(HTML[start:])
def key(s):
 s=unicodedata.normalize('NFKD',str(s or '').lower())
 s=''.join(c for c in s if not unicodedata.combining(c))
 return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def get(url):
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (NAVARRO360 Catalogue photos)','Accept':'text/html'}),timeout=25) as response:
  assert response.status==200
  return response.read(250000).decode('utf-8','replace')
def parse(i):
 url=BASE+'/productos?orden=catalogo&pagina='+str(i)
 try:
  body=get(url)
  cards=re.findall(r'<article\b[^>]*\bclass="[^"]*\bbento-catalog-product\b[^"]*"[^>]*>(.*?)</article>',body,re.I|re.S)
  found=[]
  for card in cards:
   ref=re.search(r'href="([^"]*/productos/[^"]+)"',card,re.I)
   picture=re.search(r'<img\b[^>]*\bsrc="([^"]+)"',card,re.I)
   if not ref or not picture:continue
   ref=unescape(ref.group(1)).split('?',1)[0]
   slug=key(unquote(ref.rsplit('/',1)[-1]))
   photo=urljoin(BASE,unescape(picture.group(1)))
   if not re.match(r'https://ferreteriastrp\.com/public/mnt/wtrp/images/productos/.*\.(?:webp|jpe?g|png)(?:\?.*)?$',photo,re.I):continue
   txt=unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',card)))
   candidate=re.search(r'(?:TRUPER|PRETUL|EXPERT|VOLTECK|FOS[EÉ]T|HERMEX|FIERO|KLINTEK|ULTRACRAFT)?\s*/\s*([A-Z0-9+./-]{2,35})\s*/\s*(\d{4,6})',txt,re.I)
   if not candidate:
    candidate=re.search(r'/\s*([A-Z0-9+./-]{2,35})\s*/\s*(\d{4,6})',txt,re.I)
   clave,codigo=(candidate.group(1),candidate.group(2)) if candidate else ('','')
   found.append((slug,clave,codigo,photo))
  return i,found,''
 except Exception as e:return i,[],str(e)[:160]
# Site publishes 60 per page and 15,735 products; last page may have fewer.
pages=math.ceil(15735/60)
rows=[];errors=[]
with ThreadPoolExecutor(max_workers=12) as pool:
 for i,product,error in pool.map(parse,range(1,pages+1)):
  rows.extend(product)
  if error:errors.append((i,error))
unique={}
collision=set()
for slug,clave,codigo,photo in rows:
 if slug in unique and unique[slug]!=(clave,codigo,photo):collision.add(slug)
 else:unique[slug]=(clave,codigo,photo)
for s in collision:unique.pop(s,None)
nav=collections.defaultdict(list)
for record in catalog:nav[key(record[1])].append(record)
verified={}
fail=[]
for name,products in nav.items():
 if len(products)!=1 or name not in unique:continue
 code,product,_=products[0]
 code=str(code)
 clave,manufacturer,photo=unique[name]
 if not re.fullmatch(r'\d{5,13}',code) or not clave:continue
 # Numeric internal code can be checked directly; UPC comparisons are covered by a separate EAN verification audit.
 if len(code)<12 and code!=manufacturer:continue
 if not re.fullmatch(r'[A-Z0-9+./-]{2,35}',clave,re.I):continue
 verified[code]=[clave,photo]
assert len(rows)>14000,(len(rows),errors[:4])
assert len(verified)>6500,(len(verified),len(unique),len(nav),errors[:8])
out=Path('navarro360-movil/truper-fotos-catalogo-v48.js')
out.write_text("/* NAVARRO 360 V48: asociaciones de catálogo de Grupo Truper (título único). Fotos Truper por clave con respaldo de distribuidor. */\nwindow.NAVARRO_FOTOS_TRUPER_V48=Object.freeze("+json.dumps(verified,ensure_ascii=False,separators=(',',':'))+");\n")
report={
 'catalog_nav':len(catalog),'catalog_supplier_expected':15735,'supplier_pages':pages,
 'supplier_rows_read':len(rows),'supplier_unique_titles':len(unique),
 'nombres_unicos_estrictos':len(verified),'source':'https://ferreteriastrp.com/productos',
 'matching_rule':'nombre normalizado único en ambos catálogos; claves del distribuidor; EAN pendiente de validación individual',
 'elapsed_seconds':round(time.monotonic()-START,1),
 'errors':errors[:25],'sample':list(verified.items())[:12]
}
Path('truper-v48-informe.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(report)
