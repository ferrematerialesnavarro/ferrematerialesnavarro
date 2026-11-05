from pathlib import Path
import json,gzip,base64,struct,time
src=Path('navarro360-movil/buscar-foto-indice-v55.json.gz')
data=json.loads(gzip.decompress(src.read_bytes()))
codes=data['codes']
vectors=base64.b64decode(data['vectors'])
dim=int(data['dim'])
assert len(codes)==15953 and dim==1024
assert len(vectors)==len(codes)*dim
titles=json.dumps(codes,ensure_ascii=False,separators=(',',':')).encode('utf8')
# NAV57BIN | version, dimensions, number_of_codes, code_list_byte_length | JSON codes | raw signed-int8 rows
body=b'NAV57BIN'+struct.pack('<IIII',57,dim,len(codes),len(titles))+titles+vectors
out=Path('navarro360-movil/buscar-foto-indice-v57.bin.gz')
out.write_bytes(gzip.compress(body,compresslevel=7,mtime=0))
check=gzip.decompress(out.read_bytes())
assert check[:8]==b'NAV57BIN'
v,di,n,ln=struct.unpack_from('<IIII',check,8)
assert (v,di,n,ln)==(57,1024,len(codes),len(titles))
assert check[24:24+ln]==titles
assert check[24+ln:]==vectors
report={'version':57,'codes':len(codes),'source_gzip_bytes':src.stat().st_size,'binary_gzip_bytes':out.stat().st_size,'binary_decompressed_bytes':len(body),'size_reduction_percent':round((1-out.stat().st_size/src.stat().st_size)*100,1),'note':'Mismos vectores y SKU exactos, sin pérdida de precisión; decodificación sin base64.'}
Path('navarro360-movil/buscar-foto-indice-info-v57.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('NAVARRO V57 BINARY',json.dumps(report,ensure_ascii=False))
