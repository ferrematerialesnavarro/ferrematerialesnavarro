from pathlib import Path
from collections import Counter
import json,re,unicodedata
html=Path("navarro360-movil/index.html").read_text()
idx=html.index("window.NAVARRO_DB=")+len("window.NAVARRO_DB=")
db,_=json.JSONDecoder().raw_decode(html[idx:])
txt=Path("navarro360-movil/truper-fotos-catalogo-v51.js").read_text()
idx=txt.index("Object.freeze(")+len("Object.freeze(")
known,_=json.JSONDecoder().raw_decode(txt[idx:])
missing=[(str(x[0]),str(x[1])) for x in db if str(x[0]) not in known]
groups=Counter()
for code,name in missing:
 if code.startswith('750'):groups['750...']+=1
 elif code.startswith('77'):groups['77...']+=1
 elif code.startswith('10'):groups['10...']+=1
 else:groups['Otros']+=1
priority=[]
brands=r"\b(TRUPER|PRETUL|FOS[EÉ]T|VOLTECK|HERMEX|FIERO|KLINTEK|EXPERT|ULTRACRAFT)\b"
for code,name in missing:
 if re.search(brands,name,re.I) or code.startswith(('750624','750120','750661','750230')):
  priority.append([code,name])
report={"total_catalog":len(db),"photos_indexed":len(known),"missing_total":len(missing),"likely_truper_missing":len(priority),"missing_prefixes":dict(groups),"missing_examples":missing[:130],"priority_sample":priority[:180],"likely_truper":priority}
Path("navarro-truper-faltantes-v51.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print("Missing",len(missing),"potential Grupo Truper",len(priority),"PREFIXES",dict(groups))
