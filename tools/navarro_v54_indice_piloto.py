# NAVARRO 360 V54. Generate image-search embeddings for catalog photos (not photos themselves).
# Model and preprocessing are the same MediaPipe MobileNet V3 Image Embedder as on the website.
from pathlib import Path
from PIL import Image, ImageOps
from urllib.request import urlopen, Request
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
import io, json, base64, gzip, time, re, os
import numpy as np
import mediapipe as mp
start=time.monotonic()
app=Path('navarro360-movil')
html=(app/'index.html').read_text()
a=html.index('window.NAVARRO_DB=')+len('window.NAVARRO_DB=')
products,_=json.JSONDecoder().raw_decode(html[a:])
catalog={str(row[0]):str(row[1]) for row in products}
bank=(app/'truper-fotos-catalogo-v53.js').read_text()
a=bank.index('Object.freeze(')+len('Object.freeze(')
truper,_=json.JSONDecoder().raw_decode(bank[a:])
photo_js=(app/'fotos-recuperadas.js').read_text()
m=re.search(r'const photos=(\{[^;]+\});',photo_js)
photos=json.loads(m.group(1)) if m else {}
targets=[]
for code,entry in truper.items():
 if code not in catalog:continue
 key,backup=entry
 if not re.fullmatch(r'[A-Za-z0-9+./-]{2,35}',str(key)):continue
 src="https://www.truper.com/media/import/imagenes/"+quote(str(key),safe='')+".jpg"
 choices=[src]
 if backup.startswith('https://') and ('ferreteriastrp.com/' in backup or 'ferrexmayorista.com/' in backup):choices.append(backup)
 targets.append((code,choices))
for code,filename in photos.items():
 if code in truper or code not in catalog:continue
 if re.fullmatch(r'navarro-publicada-[0-9]{5,13}\.jpg',str(filename)):
  path=app/'assets'/filename
  if path.is_file():targets.append((code,[str(path)]))
assert len(targets)>15000,(len(targets),len(photos),len(truper))
# Pilot index: diverse real Truper and generic photos, before full index finishes.
targets=targets[:2100]+targets[-480:]
# Download model only on build worker. The website will use the same small public model.
model='https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite'
with urlopen(model,timeout=50) as f:
 model_bytes=f.read()
assert 3000000<len(model_bytes)<7000000
Path('/tmp/navarro-embedder-v54.tflite').write_bytes(model_bytes)
options=mp.tasks.vision.ImageEmbedderOptions(
 base_options=mp.tasks.BaseOptions(model_asset_path='/tmp/navarro-embedder-v54.tflite'),
 running_mode=mp.tasks.vision.RunningMode.IMAGE,
 l2_normalize=True,quantize=False)
embedder=mp.tasks.vision.ImageEmbedder.create_from_options(options)
def load_photo(item):
 code,links=item
 for link in links:
  try:
   if link.startswith('https://'):
    req=Request(link,headers={'User-Agent':'Mozilla/5.0 (NAVARRO360 image embeddings)','Accept':'image/jpeg,image/webp,image/png'})
    with urlopen(req,timeout=12) as res:
     raw=res.read(1700000)
   else:raw=Path(link).read_bytes()
   im=Image.open(io.BytesIO(raw))
   im=ImageOps.exif_transpose(im).convert('RGB')
   im.thumbnail((500,500),Image.Resampling.LANCZOS)
   return code,np.asarray(im).copy(),None
  except Exception as ex:reason=str(ex)[:80]
 return code,None,reason
codes=[]
vectors=bytearray()
failures=Counter()
stride=1024
with ThreadPoolExecutor(max_workers=18) as pool:
 for block in range(0,len(targets),72):
  for code,arr,error in pool.map(load_photo,targets[block:block+72]):
   if arr is None:
    failures[error]+=1
    continue
   try:
    result=embedder.embed(mp.Image(image_format=mp.ImageFormat.SRGB,data=arr))
    vector=np.asarray(result.embeddings[0].embedding,dtype=np.float32)
    if vector.shape!=(stride,) or not np.isfinite(vector).all():raise ValueError('bad vector')
    values=np.clip(np.rint(vector*512),-128,127).astype(np.int8)
    vectors.extend(values.tobytes())
    codes.append(code)
   except Exception as exc:failures['embed:'+str(exc)[:70]]+=1
  if block%1008==0:
   print('Processed',min(len(targets),block+72),'of',len(targets),'indexed',len(codes),flush=True)
embedder.close()
assert len(codes)>=1000,(len(codes),len(targets),failures.most_common(6))
payload={"version":54,"dim":stride,"codes":codes,"vectors":base64.b64encode(vectors).decode('ascii')}
raw=json.dumps(payload,separators=(',',':')).encode()
compressed=gzip.compress(raw,compresslevel=7,mtime=0)
(app/'buscar-foto-indice-piloto-v54.json.gz').write_bytes(compressed)
report={"targeted":len(targets),"indexed":len(codes),"catalog_count":len(catalog),
        "missing_image":len(targets)-len(codes),"raw_bytes":len(raw),"compressed_bytes":len(compressed),
        "dim":stride,"scale":512,"model_size":len(model_bytes),"elapsed_seconds":round(time.monotonic()-start,1),
        "top_failures":failures.most_common(12),"sample_codes":codes[:20]}
(app/'buscar-foto-indice-piloto-info-v54.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print("VISUAL INDEX",report,flush=True)
