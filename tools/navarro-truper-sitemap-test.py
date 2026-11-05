import re, json, unicodedata, urllib.request, urllib.parse, html, concurrent.futures, collections, pathlib
from html.parser import HTMLParser
from difflib import SequenceMatcher
P=pathlib.Path('navarro360-movil/index.html').read_text()
a=P.index('window.NAVARRO_DB=')+len('window.NAVARRO_DB=')
db,_=json.JSONDecoder().raw_decode(P[a:])
def get(url,limit=9000000):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (NAVARRO360; product photo indexing)','Accept':'text/html,application/xml,application/json'}),timeout=15) as r:
  return r.read(limit).decode('utf-8','replace')
site='https://ferreteriastrp.com/sitemap.xml'
xml=get(site)
urls=re.findall(r'<loc>(https://ferreteriastrp.com/productos/[^<]+)</loc>',xml)
def plain(t):
 t=unicodedata.normalize('NFKD',str(t or '').lower())
 t=''.join(x for x in t if not unicodedata.combining(x))
 return re.sub(r'[^a-z0-9]+','-',t).strip('-')
SLUG={plain(urllib.parse.unquote(u.rsplit('/',1)[-1])):u for u in urls}
# Do not guess product identity: candidate slug is only a lead. The detail page must confirm identical EAN.
tests=[]
for code,name,*_ in db:
 if len(tests)>=120:break
 key=plain(name)
 if key in SLUG:tests.append((str(code),name,SLUG[key],100))
 else:
  # Avoid fuzzy matching in the first trial, prove exact coverage
  if len(tests)<60:continue
def fetch(item):
 code,name,url,confidence=item
 result={'barcode':code,'name':name[:100],'source':url,'confidence':confidence}
 try:
  content=get(url,200000)
  cleaned=re.sub(r'<(?:script|style)[^>]*>.*?</(?:script|style)>',' ',content,flags=re.S|re.I)
  txt=html.unescape(re.sub(r'<[^>]+>',' ',cleaned))
  txt=re.sub(r'\s+',' ',txt)
  ean=re.search(r'\bEAN\s*:\s*(\d{12,13})\b',txt,re.I)
  clave=re.search(r'\bClave\s*:\s*([A-Z0-9+./-]{2,30})',txt,re.I)
  manufacturer=re.search(r'\bC[oó]digo\s*:\s*(\d{4,6})\b',txt,re.I)
  img=re.search(r'<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"',content,re.I)
  result.update(ean=ean.group(1) if ean else None,clave=clave.group(1) if clave else None,codigo=manufacturer.group(1) if manufacturer else None,img=html.unescape(img.group(1)) if img else None)
  result['match']=result['ean']==code
 except Exception as e:result['error']=str(e)[:150]
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
 checked=list(pool.map(fetch,tests[:60]))
report={'total_catalog':len(db),'sitemap_products':len(urls),'exact_slug_matches':sum(1 for r in db if plain(r[1]) in SLUG),'selected':len(tests),'verified_count':sum(x.get('match',False) for x in checked),'tested':checked[:60]}
pathlib.Path('truper-prueba-sitemap.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('DIAGNOSTICO:',report['total_catalog'],report['sitemap_products'],report['exact_slug_matches'],report['verified_count'])
