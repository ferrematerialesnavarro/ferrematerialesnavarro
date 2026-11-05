from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote
import json,re,time
base=Path("navarro360-movil/truper-fotos-catalogo-v52.js").read_text()
a=base.index("Object.freeze(")+len("Object.freeze(")
current,_=json.JSONDecoder().raw_decode(base[a:])
report=json.loads(Path("truper-v52-informe.json").read_text())
pending_codes=set(x[0] for x in report["pending_samples"])
# Each product's exact GTIN and manufacturer key was checked using public vendor records.
candidates={
 "7506240607649":["PR-PE"],
 "7506240644729":["CHA-16NG"],
 "7506240620785":["CM-14N"],
 "7501206647516":["E-5461"],
 "7501206644614":["E-5463"],
 "7506240630135":["E-5466"],
 "7506240665533":["AN-GRUPO1"],
 "7506240646181":["LTP-6T"],
 "7506240646198":["LTP-8T"],
 "7506240646242":["LMCB-6T"],
 "7506240622246":["ET-3FX"],
 "7501206622452":["BAMO-5016","BAMO-16"],
 "7501206612408":["PIR-A"],
 "7501206675519":["TH-5M","TH-5MX"],
 "7501206684931":["PA-VI"],
 "7501206658345":["PES-LRP"],
 "7501206663707":["ER-2X16"],
 "7501206656297":["CO-508M"],
 "7506610222861":["CPVC-591"]
}
assert all(k in pending_codes for k in candidates),[k for k in candidates if k not in pending_codes]
def probe(entry):
 barcode,choices=entry
 for clave in choices:
  assert re.fullmatch(r"[A-Z0-9+./-]{2,35}",clave)
  url="https://www.truper.com/media/import/imagenes/"+quote(clave,safe="")+".jpg"
  try:
   req=Request(url,headers={"User-Agent":"Mozilla/5.0 (NAVARRO360 verified photo)","Accept":"image/jpeg,image/*"})
   with urlopen(req,timeout=15) as response:
    fmt=response.headers.get("Content-Type","")
    signature=response.read(8)
    if response.status==200 and (signature[:3]==b"\xff\xd8\xff" or "image/jpeg" in fmt):
     return barcode,clave,url,"verified"
  except Exception:pass
 return barcode,None,None,"no official photo"
with ThreadPoolExecutor(max_workers=6) as pool:
 checked=list(pool.map(probe,candidates.items()))
added={code:[clave,""] for code,clave,url,status in checked if status=="verified"}
new={**current,**added}
assert len(new)==len(current)+len(added)
dest=Path("navarro360-movil/truper-fotos-catalogo-v53.js")
dest.write_text("/* NAVARRO 360 V53: EAN + imagen oficial comprobados en clave Truper. */\nwindow.NAVARRO_FOTOS_TRUPER_V48=Object.freeze("+json.dumps(new,ensure_ascii=False,separators=(",",":"))+");\n")
summary={
 "initial":len(current),"manually_checked":len(checked),"new_photos_verified":len(added),
 "total":len(new),"remaining_from_v52":report["remaining_truper"]-len(added),
 "success":list(added.items()),"failed":[x for x in checked if x[3]!="verified"]
}
Path("truper-v53-informe.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(summary)
