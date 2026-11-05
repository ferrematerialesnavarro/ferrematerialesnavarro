from pathlib import Path
import re,json
app=Path('navarro360-movil')
src=(app/'index.html').read_text(encoding='utf8')
selectors=['.product','.product-visual','.product-info','.product-sprite','.product-symbol','.product-cat','.product-price','.product-code','.tap-product','.product-grid','.nav-v40-photo','.nav-truper-verified-photo','.navarro-photo-recuperada','.nav-bath-photo','.card-qty']
css=[]
for sel in selectors:
 items=[]
 for variant in [sel+'{',sel+' {']:
  startpos=0
  while len(items)<40:
   p=src.find(variant,startpos)
   if p<0:break
   end=src.find('}',p)
   if end<0:break
   items.append(src[max(0,p-110):min(end+1,p+1000)])
   startpos=p+len(variant)
 css.append({'selector':sel,'rules':items,'count':len(items)})
keys=['function renderProducts(){','function renderCart(){','function photoFor','window.NAVARRO_ATLAS=','const publicList=','<head>','</head>','<link','<script defer src="./truper-fotos','<script defer src="./fotos-recuperadas']
chunks={}
for key in keys:
 pos=src.find(key)
 chunks[key]={'offset':pos,'source':src[max(0,pos-250):pos+1800] if pos>=0 else ''}
rest=[]
for i,s in enumerate(rest):
 print('Inline style',i,'length',len(s))
head=src[:min(len(src),8000)]
report={'html_size':len(src),'css':css,'chunks':chunks,'styleBlocks':[{'index':i,'length':len(s),'start':s[:280]} for i,s in enumerate(rest)],'head_links':re.findall(r'<link[^>]+>',head)[:25],'script_srcs':re.findall(r'<script[^>]*src=["\']([^"\']+)',src)[-40:]}
Path('navarro-v58-css-auditoria.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('CSS report saved',len(report['css']),'head links',report['head_links'][:9])
