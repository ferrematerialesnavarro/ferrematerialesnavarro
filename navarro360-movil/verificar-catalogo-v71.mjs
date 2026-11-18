/**
 * NAVARRO 360 · Verificador local V71
 * Ejecutar en una copia del repositorio: node navarro360-movil/verificar-catalogo-v71.mjs
 * No modifica el catálogo, la web, los pedidos, WhatsApp ni SIFO.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const html=read('index.html');
const stylesheet=read('tienda-estilos-v71.css');
const modules=[
  'catalogo-navarro-v71.js','destacados-navarro-v71.js','plomeria-base-v71.js',
  'genericos-verificados-v71.js','atlas-fotos-v71.js',
  'electricidad-nav.js?v=7','buscador-completo.js?v=61','tienda-app-v71.js'
];
const externalFiles=modules.map(x=>x.split('?')[0]);
const positions=modules.map((x,i)=>{
  const tag='<script src="./'+x+'"></script>';
  const pos=html.indexOf(tag);
  assert.ok(pos>=0,'Falta enlace al módulo '+x);
  return pos;
});
assert.ok(positions.every((x,i)=>i===0||x>positions[i-1]),'Cambió el orden del catálogo y su aplicación.');
assert.ok(html.includes('<link rel="stylesheet" href="./tienda-estilos-v71.css">'),'No está conectado el CSS externo.');
assert.ok(html.includes('rel="preload" as="script" href="./catalogo-navarro-v71.js"'),'Falta precarga del catálogo.');
assert.ok(html.includes('carrito-seguro.js?v=71'),'Verifica la versión actual del carrito.');
assert.ok(html.length<500000,'El HTML dejó de ser ligero.');
assert.ok(stylesheet.length>400000,'Los estilos base están incompletos.');
for(const name of externalFiles)vm.createScript(read(name),{filename:name});
const state={window:{}};
vm.createContext(state);
for(const name of externalFiles.slice(0,5)){
  vm.runInContext(read(name),state,{filename:name,timeout:12000});
}
const data=state.window.NAVARRO_DB;
assert.ok(Array.isArray(data),'No hay catálogo NAVARRO_DB.');
assert.equal(data.length,17835,'El conteo de SKU cambió; valida la nueva versión antes de publicarla.');
const codes=new Set();
for(const row of data){
  assert.ok(Array.isArray(row)&&row.length>=3,'Fila incompleta.');
  const code=String(row[0]),price=Number(row[2]);
  assert.match(code,/^\d{5,30}$/,'Código no numérico '+code);
  assert.ok(!codes.has(code),'Código duplicado '+code);
  assert.ok(Number.isFinite(price),'Precio inválido '+code);
  codes.add(code);
}
assert.equal(state.window.NAVARRO_DESTACADOS.length,167,'Lista de destacados diferente.');
assert.equal(state.window.NAVARRO_BUSCADOR_GENERICO.loaded,2189,'Grupo genérico desalineado.');
assert.equal(typeof state.window.NAVARRO_CREATE_PLOMERIA,'function','Plomería no disponible.');
assert.equal(Object.keys(state.window.NAVARRO_ATLAS.files).length,234,'Atlas de imágenes incompleto.');
console.log('NAVARRO 360 V71 · VERIFICACIÓN EXITOSA');
console.log('HTML:',Buffer.byteLength(html,'utf8'),'bytes');
console.log('Catálogo:',data.length,'códigos únicos y precios válidos');
console.log('Destacados:',state.window.NAVARRO_DESTACADOS.length);
console.log('Genéricos:',state.window.NAVARRO_BUSCADOR_GENERICO.loaded);
console.log('Orden, scripts, estilos, plomería y atlas: OK');
