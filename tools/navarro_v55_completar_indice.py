# NAVARRO V55 — completar índice de fotos reales con el atlas publicado en la tienda.
# Sólo se agregan imágenes cuyo código de barras coincide con la clave exacta del catálogo.
from pathlib import Path
import json,re,io,base64,gzip,os,hashlib
from PIL import Image
import numpy as np
import mediapipe as mp
from urllib.request import urlopen
APP=Path('navarro360-movil')
html=(APP/'index.html').read_text()
m=re.search(r'\.product-sprite\{[^}]*background-image:url\(\x27data:image/webp;base64,([A-Za-z0-9+/=]+)\x27\)',html,re.S)
assert m, 'No se encontró el atlas fotográfico de las tarjetas'
atlas_image=Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert('RGB')
a=html.index('window.NAVARRO_ATLAS=')+len('window.NAVARRO_ATLAS=')
atlas,_=json.JSONDecoder().raw_decode(html[a:])
a=html.index('window.NAVARRO_DB=')+len('window.NAVARRO_DB=')
db,_=json.JSONDecoder().raw_decode(html[a:])
all_skus=set(str(x[0]) for x in db)
assert atlas_image.size==(atlas['columns']*atlas['size'],atlas['rows']*atlas['size']),atlas_image.size
pl=(APP/'fotos-plomeria-carrito-v47.js').read_text()
a=pl.index('Object.freeze(')+len('Object.freeze(')
plumbers,_=json.JSONDecoder().raw_decode(pl[a:])
start=json.loads(gzip.decompress((APP/'buscar-foto-indice-v54.json.gz').read_bytes()))
assert start['dim']==1024 and len(start['codes'])>=15000
used=set(start['codes'])
candidates={}
for code,filename in atlas['byCode'].items():
 if code in all_skus and filename in atlas['files']:
  candidates[code]=filename
for code,filename in plumbers.items():
 if code in all_skus and filename in atlas['files'] and code not in candidates:
  candidates[code]=filename
fresh=[(code,f) for code,f in candidates.items() if code not in used]
print('ATLAS:',atlas_image.size,'byCode:',len(atlas['byCode']),'plumbing:',len(plumbers),'uniques:',len(candidates),'to index:',len(fresh),flush=True)
with urlopen('https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite',timeout=45) as r:
 b=r.read()
Path('/tmp/nav55.tflite').write_bytes(b)
opts=mp.tasks.vision.ImageEmbedderOptions(base_options=mp.tasks.BaseOptions(model_asset_path='/tmp/nav55.tflite'),running_mode=mp.tasks.vision.RunningMode.IMAGE,l2_normalize=True,quantize=False)
model=mp.tasks.vision.ImageEmbedder.create_from_options(opts)
new_vectors=bytearray()
added=[]
for code,filename in fresh:
 idx=atlas['files'][filename]
 x=(idx%atlas['columns'])*atlas['size'];y=(idx//atlas['columns'])*atlas['size']
 img=atlas_image.crop((x,y,x+atlas['size'],y+atlas['size']))
 data=np.asarray(img)
 result=model.embed(mp.Image(image_format=mp.ImageFormat.SRGB,data=data))
 vector=np.asarray(result.embeddings[0].embedding,dtype=np.float32)
 assert vector.shape==(1024,) and np.isfinite(vector).all()
 rounded=np.clip(np.rint(vector*512),-128,127).astype(np.int8)
 new_vectors.extend(rounded.tobytes())
 added.append(code)
model.close()
all_codes=start['codes']+added
vectors=base64.b64decode(start['vectors'])+bytes(new_vectors)
assert len(vectors)==len(all_codes)*1024
assert len(set(all_codes))==len(all_codes)
manifest={'version':54,'dim':1024,'codes':all_codes,'vectors':base64.b64encode(vectors).decode('ascii')}
raw=json.dumps(manifest,separators=(',',':')).encode()
outfile=APP/'buscar-foto-indice-v55.json.gz'
outfile.write_bytes(gzip.compress(raw,compresslevel=7,mtime=0))
stats={'total_catalog':len(all_skus),'base_visual':len(start['codes']),'atlas_codes':len(atlas['byCode']),'plumbing_links':len(plumbers),
       'atlas_unique':len(candidates),'added':len(added),'visual_index_total':len(all_codes),'still_no_embedding':len(all_skus)-len(all_codes),
       'index_bytes':outfile.stat().st_size,'example_codes':added[:25],
       'important':'No se inventaron fotos. El índice incluye únicamente fotografías realmente disponibles vinculadas por SKU.'}
(APP/'buscar-foto-indice-info-v55.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
print('NAVARRO VISUAL V55',json.dumps(stats,ensure_ascii=False),flush=True)
