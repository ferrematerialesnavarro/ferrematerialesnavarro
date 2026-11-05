from pathlib import Path
import json,re,collections,os
app=Path("navarro360-movil")
txt=(app/"index.html").read_text()
cat=json.JSONDecoder().raw_decode(txt.split("window.NAVARRO_DB=",1)[1])[0]
sku=set(str(x[0]) for x in cat)
t=(app/"truper-fotos-catalogo-v53.js").read_text()
mapTruper=json.JSONDecoder().raw_decode(t.split("Object.freeze(",1)[1])[0]
photos=(app/"fotos-recuperadas.js").read_text()
allPhotos=json.loads(re.search(r'const photos=(\{[^;]+\});',photos).group(1))
m=re.search(r'window.NAVARRO_ATLAS=(\{[^;]+\});',txt)
atlas=json.loads(m.group(1)) if m else None
m2=re.search(r'window.NAVARRO_FOTOS_PLOMERIA_V47=Object.freeze\((\{[^;]+\})\);',(app/"fotos-plomeria-carrito-v47.js").read_text())
plumbing=json.loads(m2.group(1)) if m2 else {}
img_ref=(app/"buscar-foto-indice-info-v54.json")
known={"truper":set(mapTruper)&sku,"photos":set(allPhotos)&sku,"plumbing":set(plumbing)&sku}
out={"catalog":len(cat),"atlas":None if not atlas else {"keys":list(atlas),"numberFiles":len(atlas.get("files",{})),"codes":len(atlas.get("byCode",{})),"size":atlas.get("size"),"columns":atlas.get("columns"),"rows":atlas.get("rows"),"atlasFile":atlas.get("image",""),"sample":list(atlas.get("byCode",{}).items())[:15]},"source_counts":{x:len(v) for x,v in known.items()},"source_overlap":{k:len(v-set(mapTruper)) for k,v in known.items()},"photo_misc":collections.Counter(Path(x).suffix for x in allPhotos.values()),"types":{},"photo_groups":{}}
for path in app.glob("*.js"):
 if path.stat().st_size>4*1024*1024:continue
 s=path.read_text()
 ks=[m.group(0) for m in re.finditer(r'.{0,80}(?:NAVARRO_MAT_STRIPS|NAVARRO_ATLAS|NAVARRO_PVC_FOTOS|NAVARRO_CPVC_FOTOS|\\.img\\b|\\.jpg|\\.webp|\\.png).{0,80}',s,re.I)]
 out["photo_groups"][path.name]=ks[:7]
out["catalog_missing_photo"]=[{"id":c,"name":name} for c,name,*_ in cat if str(c) not in known["truper"]|known["photos"]|known["plumbing"]][:130]
out["assets_count"]=len(list((app/"assets").iterdir()))
out["sprite_analysis"]={
 "sprite_mentions":[txt[max(0,m.start()-250):m.start()+450] for m in list(re.finditer(r'product-sprite|atlas-sprite|NAVARRO_ATLAS',txt,re.I))[:22]],
 "base64_image_matches":[{"position":m.start(),"mime":m.group(1),"payloadLen":len(m.group(2)),"context":txt[max(0,m.start()-220):m.start()+85]} for m in list(re.finditer(r'data:image/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)',txt,re.I)) if len(m.group(2))>30000][:12],
 "styles":[x[:700] for x in re.findall(r'.{0,150}background(?:Image|[-]image)\s*[:=].{0,250}',txt,re.I)[:20]]
}

Path("navarro-v55-photo-audit.json").write_text(json.dumps(out,ensure_ascii=False,indent=2))
print("AUDIT",json.dumps({k:v for k,v in out.items() if k!="photo_groups" and k!="catalog_missing_photo"},ensure_ascii=False))
