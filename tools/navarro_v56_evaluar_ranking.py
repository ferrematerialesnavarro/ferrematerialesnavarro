from pathlib import Path
from urllib.request import urlopen
from PIL import Image,ImageEnhance,ImageFilter,ImageOps
import numpy as np,mediapipe as mp,io,gzip,json,base64,re,random,collections,time
APP=Path('navarro360-movil')
data=json.loads(gzip.decompress((APP/'buscar-foto-indice-v55.json.gz').read_bytes()))
codes=data['codes']
ref=np.frombuffer(base64.b64decode(data['vectors']),dtype=np.int8).reshape(-1,1024).astype(np.float32)/512
catalog=json.JSONDecoder().raw_decode((APP/'index.html').read_text().split('window.NAVARRO_DB=',1)[1])[0]
names={str(r[0]):str(r[1]) for r in catalog}
files={p.stem.rsplit('-',1)[-1]:p for p in (APP/'assets').glob('navarro-publicada-*.jpg')}
options=[c for c in files if c in codes]
random.Random(113).shuffle(options)
options=options[:70]
assert len(options)==70
with urlopen('https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite',timeout=50) as f:
 Path('/tmp/nav-eval-v56.tflite').write_bytes(f.read())
opts=mp.tasks.vision.ImageEmbedderOptions(base_options=mp.tasks.BaseOptions(model_asset_path='/tmp/nav-eval-v56.tflite'),running_mode=mp.tasks.vision.RunningMode.IMAGE,l2_normalize=True,quantize=False)
model=mp.tasks.vision.ImageEmbedder.create_from_options(opts)
def emb(img):
 a=np.asarray(img.convert('RGB').resize((min(img.width,640),min(img.height,640))))
 q=model.embed(mp.Image(image_format=mp.ImageFormat.SRGB,data=a)).embeddings[0].embedding
 return np.asarray(q,dtype=np.float32)
def top(q):
 sims=ref @ q
 ix=np.argpartition(sims,-160)[-160:]
 ix=ix[np.argsort(-sims[ix])]
 return sims,ix
def mutate(im,mode):
 im=ImageOps.exif_transpose(im).convert('RGB')
 im.thumbnail((460,460),Image.Resampling.LANCZOS)
 if mode=='original':return im
 if mode=='small-white':
  side=640;bg=Image.new('RGB',(side,side),(250,250,250))
  factor=min(1,280/max(im.size));im=im.resize((int(im.width*factor),int(im.height*factor)))
  bg.paste(im,((side-im.width)//2,(side-im.height)//2));return bg
 if mode=='small-clutter':
  rand=random.Random(239+im.width)
  bg=Image.new('RGB',(640,640),(175,161,145))
  from PIL import ImageDraw
  draw=ImageDraw.Draw(bg)
  for _ in range(13):
   x=rand.randrange(640);y=rand.randrange(640)
   color=(rand.randrange(70,200),rand.randrange(70,200),rand.randrange(70,200))
   draw.rectangle((x,y,min(640,x+rand.randrange(24,120)),min(640,y+rand.randrange(28,170))),fill=color)
  factor=min(1,350/max(im.size));im=im.resize((int(im.width*factor),int(im.height*factor)))
  rotated=im.rotate(18,expand=True,resample=Image.Resampling.BICUBIC,fillcolor=(240,239,236))
  bg.paste(rotated,((640-rotated.width)//2,(640-rotated.height)//2))
  return bg
 if mode=='crop-central':
  w,h=im.size;return im.crop((round(.12*w),round(.12*h),round(.88*w),round(.88*h)))
def cropcenter(im,frac=.72):
 w,h=im.size
 return im.crop(((1-frac)*w/2,(1-frac)*h/2,(1+frac)*w/2,(1+frac)*h/2))
rows=[]
for num,code in enumerate(options):
 source=Image.open(files[code])
 for mode in ('original','small-white','small-clutter','crop-central'):
  img=mutate(source,mode)
  q=emb(img)
  sims,ix=top(q)
  rank={codes[i]:pos+1 for pos,i in enumerate(ix)}
  correct=rank.get(code,161)
  best=float(sims[ix[0]])
  own=float(sims[codes.index(code)])
  second=float(sims[ix[1]])
  crop_q=emb(cropcenter(img))
  crop_sims,cix=top(crop_q)
  hybrid=np.maximum(sims,crop_sims-.03)
  hix=np.argpartition(hybrid,-160)[-160:]
  hix=hix[np.argsort(-hybrid[hix])]
  hrank={codes[i]:pos+1 for pos,i in enumerate(hix)}
  row=dict(code=code,name=names[code],mode=mode,rank=correct,hybrid_rank=hrank.get(code,161),
           best=round(best,3),own=round(own,3),gap=round(best-own,3),
           top10=[{"code":codes[i],"name":names.get(codes[i],""),"score":round(float(sims[i]),3)} for i in ix[:10]],
           most_related=[names.get(codes[i],"") for i in ix[:8]],
           top10hybrid=[names.get(codes[i],"") for i in hix[:10]])
  rows.append(row)
 if num%14==0:print('Tested',num+1,'of',len(options),flush=True)
model.close()
summary={}
for mode in ['original','small-white','small-clutter','crop-central']:
 subset=[x for x in rows if x['mode']==mode]
 summary[mode]={
  'samples':len(subset),
  'top1_baseline':sum(x['rank']==1 for x in subset),
  'top3_baseline':sum(x['rank']<=3 for x in subset),
  'top10_baseline':sum(x['rank']<=10 for x in subset),
  'top1_hybrid':sum(x['hybrid_rank']==1 for x in subset),
  'top3_hybrid':sum(x['hybrid_rank']<=3 for x in subset),
  'top10_hybrid':sum(x['hybrid_rank']<=10 for x in subset),
  'best_scores':[round(float(x),3) for x in np.percentile([r['best'] for r in subset],[0,10,25,50,75,90,100])],
  'own_scores':[round(float(x),3) for x in np.percentile([r['own'] for r in subset],[0,10,25,50,75,90,100])],
  'rank_7_or_later':[{"code":r['code'],"rank":r['rank'],"hybrid":r['hybrid_rank'],"best":r['best'],"own":r['own'],"title":r['name']} for r in subset if r['rank']>=7][:15]
 }
report={'summary':summary,'rows':rows,'notes':'Test uses augmented catalog photos, not independent user photo. Lower-quality real-world photographs may be harder.'}
Path('navarro-v56-evaluacion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('EVAL',json.dumps(summary,ensure_ascii=False),flush=True)
