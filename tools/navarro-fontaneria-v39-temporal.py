from pathlib import Path
import re,json,collections,hashlib
p=Path("navarro360-movil/index.html"); sw=Path("navarro360-movil/sw.js")
raw=p.read_bytes()
sha=lambda b:hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
assert sha(raw)=="964ffb5e869854ed58fcfb514eaa4b1c004ab369","V38 base changed"
s=raw.decode("utf-8")
a=s.index("window.NAVARRO_DB=")+len("window.NAVARRO_DB=")
db,_=json.JSONDecoder().raw_decode(s[a:])
patterns=[
("Llaves de paso y válvulas",r"\b(?:LLAVE(?:S)? (?:DE )?(?:PASO|ESFERA|NARIZ|JARDIN|LAVADORA|ANGULAR|CONTROL)|VALVULA (?:DE )?(?:ESFERA|PASO|RETENCION|COMPUERTA|ANGULAR)|VALVULA CHECK (?:ANTIRETORNO|DE (?:AGUA|PIE))|LLAVE ESFERA)\b"),
("Mezcladoras y grifos",r"\b(?:MEZCLADORA (?:PARA|DE) (?:LAVABO|FREGADERO|COCINA|REGADERA)|MONOMANDO|GRIFO (?:DE|PARA)|LLAVE (?:PARA|DE) (?:LAVABO|FREGADERO))\b"),
("Regaderas y accesorios",r"\b(?:REGADERA(?:S)?(?:\s|$)|BRAZO PARA REGADERA|CHAPETON PARA REGADERA|TELEFONO PARA REGADERA|MANGUERA PARA REGADERA)\b"),
("Céspoles y desagües",r"\b(?:CESPOL|CONTRACANASTA|CONTRA CANASTA|COLADERA|TUBO FLEXIBLE PARA LAVABO|DESAGUE PARA LAVABO)\b"),
("WC y sanitarios",r"\b(?:FLOTADOR (?:PARA|DE) WC|VALVULA (?:DE )?(?:DESCARGA|ADMISION)|SAPO PARA WC|HERRAJE PARA WC|TANQUE PARA WC|DESCARGA WC|ACCESORIOS PARA WC|BRIDA PARA WC|EMPAQUE PARA WC|MANIJA PARA WC|FLOTADOR COMPACTO|JUEGO (?:DE )?ACCESORIOS PARA WC)\b"),
("Tinacos y depósitos",r"\b(?:MULTICONECTOR .*TINACO|FLOTADOR (?:DE|PARA) TINACO|TAPA (?:DE )?.*TINACO|JARRO DE AIRE|VALVULA DE LLENADO .*TINACO|TINACO ROTOPLAS)\b"),
("Mangueras y flexibles",r"\b(?:ALIMENTADOR FLEXIBLE|MANGUERA (?:FLEXIBLE|PARA LAVABO|PARA FREGADERO|PARA WC|COFLEX)|CONECTOR FLEXIBLE|MANGUERA COFLEX|CONEXION FLEXIBLE)\b"),
("Reparación y sellado",r"\b(?:CINTA TEFLON|TEFLON|SELLADOR DE ROSCAS|EMPAQUE PARA LLAVE|ARANDELA PARA LLAVE|DESTAPACA[NÑ]OS|DESTAPADOR DE CA[NÑ]ERIA)\b")
]
existing=set(re.findall(r'\["(\d{5,})","(?:PVC|CPVC|Hidráulico|Polimex|PPR / Termofusión|Cobre|Galvanizado)"',s[s.index("const ROWS="):s.index("const MATERIALS=")]))
rows=[]; counts=collections.Counter()
for code,name,price,*_ in db:
 code=str(code); u=name.upper()
 if not re.fullmatch(r"\d{5,}",code) or code in existing:continue
 if re.search(r"\b(?:INYECTORES DE GRASA|FUMIGADOR|PINTURA|TALADRO|PARA COMPRESOR|PARA GAS|GAS LP|OXIGENO|MOTOBOMBA|HIDROLAVADORA|HIDRONEUMATICO|LUBRICACION)\b",u):continue
 for label,pat in patterns:
  if re.search(pat,u):
   if label=="Regaderas y accesorios":label="Regaderas" if u.startswith("REGADERA ") else "Accesorios para regadera"
   if label=="Mezcladoras y grifos":label="Monomandos" if u.startswith("MONOMANDO") else "Mezcladoras y grifos"
   rows.append([code,"Fontanería","General",label,""]);counts[label]+=1
   break
assert 600<len(rows)<900,(len(rows),counts)
assert max(counts.values())<=140,counts
add="\n// NAVARRO 360 V39: fontaneria clasificada desde catalogo real\nROWS.push(\n"+",\n".join("  "+json.dumps(x,ensure_ascii=False,separators=(",",":")) for x in rows)+"\n);\n"
def put(a,b,n=1):
 global s
 assert s.count(a)==n,(a[:70],s.count(a))
 s=s.replace(a,b)
put("const MATERIALS=['PVC','CPVC','Hidráulico','Polimex','PPR / Termofusión','Cobre','Galvanizado'];",add+"const MATERIALS=['PVC','CPVC','Hidráulico','Polimex','PPR / Termofusión','Cobre','Galvanizado','Fontanería'];")
put("'Galvanizado':'⚙️'","'Galvanizado':'⚙️','Fontanería':'🚰'")
tick=chr(96); dollar=chr(36)
new="   if(state.material==='Fontanería'){\n    const families=unique(ROWS.filter(r=>r[1]==='Fontanería'&&dictionary.has(String(r[0]))).map(r=>r[3])).sort((a,b)=>a.localeCompare(b,'es'));\n    body+=step(2,'Tipo de artículo',nodes('Producto',families,state.family,'family'),!!state.family);\n    if(state.family)body+="+tick+'<div class="pl-persist-summary" role="status"><strong>'+dollar+'{count(exact())} productos</strong> · '+dollar+'{textSafe(state.family)}</div>'+tick+";\n   }else if(!galvanized||state.section){"
put("   if(!galvanized||state.section){",new)
put("   if(key==='material'){state={material:v,section:'',size:'',family:'',length:''};}","   if(key==='material'){state={material:v,section:'',size:v==='Fontanería'?'General':'',family:'',length:''};}")
put("  if(!state.material||!state.size||(state.material==='Galvanizado'&&!state.section))return [];","  if(!state.material||!state.size||(state.material==='Galvanizado'&&!state.section)||(state.material==='Fontanería'&&!state.family))return [];")
put("if(!state.size)return 'Selecciona el diámetro';","if(state.material==='Fontanería'&&!state.family)return 'Selecciona el tipo de artículo';if(!state.size)return 'Selecciona el diámetro';")
put("const steps=['Plomería',state.material,state.section,state.size,state.family,state.length].filter(Boolean);","const steps=['Plomería',state.material,state.section,state.material==='Fontanería'?'':state.size,state.family,state.length].filter(Boolean);")
put("+(state.size?' · '+state.size:'')","+(state.size&&state.material!=='Fontanería'?' · '+state.size:'')")
put("sw.js?v=38","sw.js?v=39")
p.write_text(s)
w=sw.read_text()
assert w.count("navarro360-fullstore-v38-galvanizados")==1
sw.write_text(w.replace("navarro360-fullstore-v38-galvanizados","navarro360-fullstore-v39-fontaneria"))
start=s.index("/* NAVARRO 360 — Plomería supervisada.")
end=s.index("</script>",start)
Path("/tmp/navarro-font39.js").write_text(s[start:end])
print("V39 fontaneria",len(rows),dict(counts),"sha",sha(p.read_bytes()))
