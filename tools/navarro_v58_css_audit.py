from pathlib import Path
import re,json
app=Path('navarro360-movil')
src=(app/'index.html').read_text(encoding='utf8')
selectors=['.product','.product-visual','.product-info','.product-sprite','.product-symbol','.product-cat','.product-price','.product-code','.tap-product','.product-grid','.nav-v40-photo','.nav-truper-verified-photo','.navarro-photo-recuperada','.nav-bath-photo','.card-qty']
css=[]
for sel in selectors:
 exp=re.compile(r'(?:^|[},\n])\s*([^{}]*'+re.escape(sel)+r'[^{}]*\{[^{}]*\})',re.I)
 items=[m.group(1).strip() for m in exp.finditer(src) if '<script' not in m.group(1) and len(m.group(1))<1300]
 css.append({'selector':sel,'rules':items[:45],'count':len(items)})
keys=['function renderProducts(){','function renderCart(){','function photoFor','window.NAVARRO_ATLAS=','const publicList=','<head>','</head>','<link','<script defer src="./truper-fotos','<script defer src="./fotos-recuperadas']
chunks={}
for key in keys:
 pos=src.find(key)
 chunks[key]={'offset':pos,'source':src[max(0,pos-250):pos+1800] if pos>=0 else ''}
rest=re.findall(r'(?s)<style[^>]*>(.*?)</style>',src)
for i,s in enumerate(rest):
 print('Inline style',i,'length',len(s))
head=src[:min(len(src),8000)]
report={'html_size':len(src),'css':css,'chunks':chunks,'styleBlocks':[{'index':i,'length':len(s),'start':s[:280]} for i,s in enumerate(rest)[:35]],'head_links':re.findall(r'<link[^>]+>',head)[:25],'script_srcs':re.findall(r'<script[^>]*src=["\']([^"\']+)',src)[-40:]}
Path('navarro-v58-css-auditoria.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('CSS report saved',len(report['css']),'head links',report['head_links'][:9])
