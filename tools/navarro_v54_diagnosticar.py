from pathlib import Path
import json,re,io,time,urllib.request,urllib.parse
from PIL import Image
import numpy as np
import mediapipe as mp
page=Path("navarro360-movil/index.html").read_text()
needles=['id="search"','id="search-mobile"','id="products"','function renderProducts(){','const dictionary=','<head>','</head>','id="cart-items"','function renderCart','const NAVARRO_ATLAS']
snippets={}
for needle in needles:
 pos=page.find(needle)
 snippets[needle]=page[max(0,pos-450):pos+1400] if pos>=0 else None
for path in ["navarro360-movil/buscador-completo.js","navarro360-movil/carrito-seguro.js"]:
 text=Path(path).read_text()
 snippets[path]=text[:2000]
report={"snippets":snippets,"test":[]}
modelurl='https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite'
with urllib.request.urlopen(modelurl,timeout=45) as r:
 raw=r.read()
Path("/tmp/mobile-v3-small.tflite").write_bytes(raw)
report["model_size"]=len(raw)
a=Path("navarro360-movil/truper-fotos-catalogo-v53.js").read_text().split("Object.freeze(",1)[1]
bank,_=json.JSONDecoder().raw_decode(a)
opts=mp.tasks.vision.ImageEmbedderOptions(
 base_options=mp.tasks.BaseOptions(model_asset_path="/tmp/mobile-v3-small.tflite"),
 running_mode=mp.tasks.vision.RunningMode.IMAGE,
 l2_normalize=True,
 quantize=False)
embedder=mp.tasks.vision.ImageEmbedder.create_from_options(opts)
for code,(clave,backup) in list(bank.items())[:70]:
 if len(report["test"])>=4:break
 url="https://www.truper.com/media/import/imagenes/"+urllib.parse.quote(clave,safe="")+".jpg"
 for actual in (url,backup):
  if not actual:continue
  try:
   with urllib.request.urlopen(urllib.request.Request(actual,headers={"User-Agent":"Mozilla/5.0"}),timeout=11) as r:raw=r.read(2000000)
   image=Image.open(io.BytesIO(raw)).convert("RGB")
   rr=embedder.embed(mp.Image(image_format=mp.ImageFormat.SRGB,data=np.array(image)))
   vec=rr.embeddings[0].embedding
   if vec is None:raise RuntimeError("No float embedding")
   report["test"].append({"sku":code,"clave":clave,"url":actual,"shape":list(image.size),"dimensions":len(vec),"norm":float(np.linalg.norm(vec)),"max":float(np.max(vec)),"min":float(np.min(vec))})
   break
  except Exception as e:
   if actual==backup:report["test"].append({"sku":code,"error":str(e)[:100]})
embedder.close()
Path("diagnostico-busqueda-foto-v54.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print("RESULT",json.dumps({"model_size":report["model_size"],"tested":report["test"]},ensure_ascii=False))
