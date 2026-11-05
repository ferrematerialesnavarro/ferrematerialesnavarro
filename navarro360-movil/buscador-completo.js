/* NAVARRO 360 — Buscador completo V3, 04-nov-2026.
   Consulta solamente la copia de NAVARRO_DB; no altera precios, carrito, escáner ni SIFO.
   Por nombre: primero artículos ajenos al Grupo Truper, después artículos relacionados
   del Grupo Truper. Por código: mantiene la búsqueda exacta del sistema existente.
*/
(function () {
  'use strict';
  const STOP = new Set('DE DEL LA LAS EL LOS LO UN UNA UNO Y CON PARA POR EN AL A LAS LOS GRADO GRADOS PULGADA PULGADAS PULG CALIBRE GRANO NUMERO NO'.split(' '));
  const WORD_NUMBERS = {CERO:'0',UNO:'1',UNA:'1',UN:'1',DOS:'2',TRES:'3',CUATRO:'4',CINCO:'5',SEIS:'6',SIETE:'7',OCHO:'8',NUEVE:'9',DIEZ:'10',DOCE:'12',CATORCE:'14',DIECISEIS:'16',DIECIOCHO:'18',VEINTE:'20',VEINTIDOS:'22',VEINTICUATRO:'24',TREINTA:'30',CUARENTA:'40',NOVENTA:'90'};
  // Las fracciones se convierten antes de separar palabras y números.
  function normalize(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
      .replace(/½/g,' 1/2 ').replace(/¼/g,' 1/4 ').replace(/¾/g,' 3/4 ')
      .replace(/\b(?:TRES|3)\s+OCTAVOS\b/g,' 3/8 ')
      .replace(/\b(?:TRES|3)\s+CUARTOS\b/g,' 3/4 ')
      .replace(/\b(?:UNO|UN|UNA|1)\s+CUARTO\b/g,' 1/4 ')
      .replace(/\b(?:UNO|UN|UNA)\s+Y\s+MEDIA\b/g,' 1 1/2 ')
      .replace(/\bMEDIA\b/g,' 1/2 ')
      .replace(/\b(\d+)\s*\/\s*(\d+)\b/g,'$1/$2')
      .replace(/(\d)([A-Z])/g,'$1 $2').replace(/([A-Z])(\d)/g,'$1 $2')
      .replace(/[^A-Z0-9/]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function root(w) {
    w = WORD_NUMBERS[w] || w;
    if (w === 'FOSET') return 'FOSSET';
    if (w === 'DUPLES') return 'DUPLEX';
    if (/^[A-Z]{4,}S$/.test(w) && !/^(TRES|GRIS|PLUS)$/.test(w)) return w.slice(0,-1);
    return w;
  }
  function tokens(s) {
    return normalize(s).split(' ').filter(Boolean).filter(w => !STOP.has(w)).map(root);
  }
  const catalog = Array.isArray(window.NAVARRO_DB) ? window.NAVARRO_DB : [];
  const approved = window.NAVARRO_BUSCADOR_GENERICO;
  const verified = approved && approved.expected === 2189 && approved.loaded === 2189 && typeof approved.isApproved === 'function';
  const tokenIndex = new Map();
  const rows = [];
  for (const product of catalog) {
    const id=String(product[0]), name=String(product[1]);
    if (!/^\d{5,}$/.test(id)) continue;
    const tk=tokens(name), wordSet=new Set(tk), pos=rows.length;
    rows.push({id,name,tk,wordSet,normalized:normalize(name),generic:!!(verified&&approved.isApproved(id,name))});
    for (const token of wordSet) {
      let set=tokenIndex.get(token);
      if (!set) tokenIndex.set(token,set=new Set());
      set.add(pos);
    }
  }
  const vocabulary = [...tokenIndex.keys()];
  const prefixCache = new Map();
  function findToken(token) {
    if (prefixCache.has(token)) return prefixCache.get(token);
    const found = new Set(tokenIndex.get(token) || []);
    // Sólo abreviaturas de texto; jamás aproximar un número, calibre, medida o material corto.
    if (token.length >= 4 && !/\d/.test(token)) {
      for (const word of vocabulary) {
        if (word !== token && word.startsWith(token)) {
          for (const n of tokenIndex.get(word)) found.add(n);
        }
      }
    }
    if (prefixCache.size > 150) prefixCache.clear();
    prefixCache.set(token,found);
    return found;
  }
  function score(row,q) {
    let value=0;
    for (const token of q.tk) value+=row.wordSet.has(token)?18:4;
    const flat=row.tk.join(' '), phrase=q.tk.join(' ');
    if (flat===phrase) value+=250;
    else if (flat.startsWith(phrase+' '))value+=100;
    else if (flat.includes(phrase))value+=60;
    if (row.normalized===q.normalized)value+=90;
    if (row.generic)value+=3;
    value+=Math.max(0,18-Math.max(0,row.tk.length-q.tk.length));
    return value;
  }
  function searchByName(raw,dictionary,imgFor) {
    const normalized=normalize(raw);
    if (normalized.length<2 || /^\d+$/.test(normalized))return [];
    const tk=tokens(raw);
    if (!tk.length) return [];
    const groups=tk.map(findToken).sort((a,b)=>a.size-b.size);
    if (!groups.length||!groups[0].size)return [];
    let selected=[];
    for (const i of groups[0]) {
      if (groups.some(set=>!set.has(i)))continue;
      const row=rows[i];
      const current=dictionary.get(row.id);
      if (!current || current.name!==row.name)continue; // Evita reutilizar códigos cambiados.
      selected.push(row);
    }
    const q={tk,normalized};
    // No ocultar productos del Grupo Truper: mostrar todos los nombres relacionados.
    // La procedencia prevalece sobre la relevancia para que los genéricos siempre
    // aparezcan primero; dentro de cada grupo se ordena por coincidencia.
    selected.sort((a,b)=>
      Number(b.generic)-Number(a.generic) ||
      score(b,q)-score(a,q) ||
      a.name.localeCompare(b.name,'es',{numeric:true}) ||
      a.id.localeCompare(b.id)
    );
    return selected.map(x=>{
      const p=dictionary.get(x.id);
      return {...p,display:p.name,cat:'Catálogo general',sub:'',img:imgFor(x.id)};
    });
  }
  window.NAVARRO_BUSCADOR_COMPLETO = Object.freeze({
    version:'2026-11-04-v3-prioridad',
    total:rows.length,
    genericos:rows.filter(x=>x.generic).length,
    protegidos:rows.filter(x=>!x.generic).length,
    searchByName
  });
})();



/* NAVARRO_AUTOCOMPLETAR_V61: sugerencias en vivo sin tocar el motor, carrito, foto ni SIFO. */
;(function(){
'use strict';
if(window.NAVARRO_AUTOCOMPLETAR_V61)return;
const db=Array.isArray(window.NAVARRO_DB)?window.NAVARRO_DB:[];
const buscador=window.NAVARRO_BUSCADOR_COMPLETO;
const aprobados=window.NAVARRO_BUSCADOR_GENERICO;
if(!buscador||buscador.total!==db.length||buscador.genericos!==2189||
   !aprobados||aprobados.loaded!==2189||typeof aprobados.isApproved!=='function')return;
const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
 .replace(/½/g,' 1/2 ').replace(/¼/g,' 1/4 ').replace(/¾/g,' 3/4 ')
 .replace(/[^A-Z0-9/]+/g,' ').trim().replace(/\s+/g,' ');
const stop=new Set('DE DEL LA LAS EL LOS POR PARA CON EN AL UN UNA Y'.split(' '));
const aliases={DUPLES:'DUPLEX',DUPEX:'DUPLEX',HIDRAULICA:'HIDRAULICO',PULG:'PULGADA'};
const tokens=s=>norm(s).split(' ').filter(w=>w&&!stop.has(w)).map(w=>aliases[w]||w);
const rows=[], posting=new Map(), freq=new Map(), codeIndex=new Map();
for(const p of db){
 const id=String(p[0]??''),name=String(p[1]??'');
 if(!/^\d{5,}$/.test(id)||!name)continue;
 const tk=[...new Set(tokens(name))],i=rows.length,generic=!!aprobados.isApproved(id,name);
 rows.push({id,name,generic,tk,words:new Set(tk),normalized:norm(name)});
 codeIndex.set(id,i);
 for(const word of tk){
  if(!posting.has(word))posting.set(word,[]);
  posting.get(word).push(i);
  const f=freq.get(word)||{generic:0,total:0}; f.total++;if(generic)f.generic++;freq.set(word,f);
 }
}
const vocab=[...posting.keys()],cache=new Map();
function distance(a,b,max){
 if(Math.abs(a.length-b.length)>max)return max+1;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const next=[i];let minimum=i;
  for(let j=1;j<=b.length;j++){
   next[j]=Math.min(prev[j]+1,next[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
   minimum=Math.min(minimum,next[j]);
  }
  if(minimum>max)return max+1;
  prev=next;
 }
 return prev[b.length];
}
function expand(t){
 if(cache.has(t))return cache.get(t);
 const exact=posting.has(t)?[t]:[],prefix=[],fuzzy=[];
 if(t.length>=2&&!/\d/.test(t)){
  for(const word of vocab)if(word!==t&&word.startsWith(t))prefix.push(word);
  if(!exact.length&&!prefix.length&&/^[A-Z]{4,}$/.test(t)){
   const limit=t.length>=7?2:1;
   for(const word of vocab){
    if(!/^[A-Z]{4,}$/.test(word)||word[0]!==t[0]||
       Math.abs(word.length-t.length)>limit)continue;
    const d=distance(t,word,limit);if(d<=limit)fuzzy.push({word,d});
   }
   fuzzy.sort((a,b)=>a.d-b.d||(freq.get(b.word)?.generic||0)-(freq.get(a.word)?.generic||0)||
      (freq.get(b.word)?.total||0)-(freq.get(a.word)?.total||0));
  }
 }
 prefix.sort((a,b)=>(freq.get(b)?.generic||0)-(freq.get(a)?.generic||0)||
   (freq.get(b)?.total||0)-(freq.get(a)?.total||0)||a.length-b.length);
 const out={matches:[...exact,...prefix.slice(0,45),...fuzzy.slice(0,4).map(x=>x.word)],
  completing:[...prefix.slice(0,3),...fuzzy.slice(0,2).map(x=>x.word)],
  corrected:fuzzy.length>0};
 if(cache.size>100)cache.clear();cache.set(t,out);return out;
}
function suggest(raw){
 const normalized=norm(raw);
 if(normalized.length<2)return [];
 if(/^\d{5,}$/.test(normalized)){
  const pos=codeIndex.get(normalized);return pos==null?[]:[{type:'product',...rows[pos]}];
 }
 if(/^\d+$/.test(normalized))return [];
 const tk=tokens(raw);if(!tk.length)return [];
 const matches=tk.map(expand);if(matches.some(x=>!x.matches.length))return [];
 const sets=matches.map(m=>{
  const s=new Set();for(const w of m.matches.slice(0,45))for(const pos of (posting.get(w)||[]))s.add(pos);
  return s;
 }).sort((a,b)=>a.size-b.size);
 const items=[];
 for(const pos of sets[0]){
  if(sets.some(s=>!s.has(pos)))continue;
  const p=rows[pos];let score=0;
  for(const token of tk)score+=p.words.has(token)?24:p.tk.some(w=>w.startsWith(token))?14:3;
  if(p.normalized===normalized)score+=140;
  else if(p.normalized.startsWith(normalized))score+=90;
  else if(p.normalized.includes(normalized))score+=35;
  score+=Math.max(0,13-p.tk.length);
  items.push({p,score});
 }
 items.sort((a,b)=>Number(b.p.generic)-Number(a.p.generic)||b.score-a.score||
   a.p.name.localeCompare(b.p.name,'es',{numeric:true}));
 const out=[], last=matches[matches.length-1],lastWord=tk[tk.length-1];
 for(const word of last.completing){
  if(out.length>=2)break;
  if(word===lastWord)continue;
  const phrase=normalized.replace(/[^ ]+$/,word);
  if(phrase!==normalized&&!out.some(x=>x.text===phrase))
   out.push({type:'word',text:phrase,corrected:last.corrected});
 }
 for(const {p} of items.slice(0,6))out.push({type:'product',...p});
 return out.slice(0,7);
}
window.NAVARRO_AUTOCOMPLETAR_V61=Object.freeze({suggest,items:rows.length,version:'61'});
function init(){
 const inputs=[document.getElementById('search-mobile'),document.getElementById('search')].filter(Boolean);
 if(!inputs.length)return;
 const css=document.createElement('style');
 css.textContent='.nv61-panel{position:fixed;z-index:2147483000;box-sizing:border-box;max-height:min(45vh,350px);overflow-y:auto;-webkit-overflow-scrolling:touch;background:#fff;border:1px solid #d1d9e5;box-shadow:0 12px 30px #001a354f;border-radius:0 0 16px 16px;padding:5px;color:#162940;text-align:left;font:500 14px/1.3 system-ui,sans-serif}.nv61-panel[hidden]{display:none!important}.nv61-item{appearance:none;display:flex;align-items:center;width:100%;min-height:48px;border:0;border-bottom:1px solid #e9edf2;background:white;color:#152e45;text-align:left;padding:9px 11px;gap:9px;font:inherit;cursor:pointer;border-radius:7px}.nv61-item:last-child{border-bottom:0}.nv61-item:focus,.nv61-item[aria-selected=true]{outline:2px solid #b18c39;background:#fff9eb}.nv61-symbol{width:24px;flex:0 0 24px;text-align:center;font-size:18px}.nv61-main{min-width:0;flex:1}.nv61-name{display:block;font-weight:750;overflow-wrap:anywhere}.nv61-extra{display:block;color:#68788a;font-size:11px;margin-top:3px}#search,#search-mobile{font-size:16px}';
 document.head.appendChild(css);
 const popup=document.createElement('div');popup.id='nv61-sugerencias';
 popup.className='nv61-panel';popup.setAttribute('role','listbox');
 popup.setAttribute('aria-label','Sugerencias del catálogo');popup.hidden=true;document.body.appendChild(popup);
 let active=null,options=[],selected=-1,timer,composing=false;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function position(){
  if(!active||popup.hidden)return;
  const r=active.getBoundingClientRect();
  popup.style.left=Math.max(7,r.left)+'px';
  popup.style.width=Math.max(190,Math.min(r.width,innerWidth-14))+'px';
  popup.style.top=Math.max(0,r.bottom+2)+'px';
 }
 function hide(){
  clearTimeout(timer);popup.hidden=true;popup.textContent='';options=[];selected=-1;
  inputs.forEach(el=>el.setAttribute('aria-expanded','false'));
 }
 function choose(i){
  const choice=options[i];if(!choice)return;
  const value=choice.type==='product'?choice.id:choice.text;
  const field=active;hide();
  if(!field)return;
  field.value=value;
  field.dispatchEvent(new Event('input',{bubbles:true}));
  document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function show(){
  if(!active||document.activeElement!==active||composing){hide();return;}
  options=suggest(active.value);selected=-1;
  if(!options.length){hide();return;}
  popup.innerHTML=options.map((x,i)=>{
   const word=x.type==='word';
   const secondary=word?(x.corrected?'Posible corrección · Toca para buscar':'Completar palabra · Toca para buscar'):
     'Código '+esc(x.id)+(x.generic?' · Producto genérico':' · Catálogo');
   return '<button type="button" class="nv61-item" role="option" aria-selected="false" data-nv61="'+i+'">'+
    '<span class="nv61-symbol" aria-hidden="true">'+(word?'⌕':'▣')+'</span>'+
    '<span class="nv61-main"><span class="nv61-name">'+esc(word?x.text:x.name)+'</span>'+
    '<span class="nv61-extra">'+secondary+'</span></span></button>';
  }).join('');
  popup.hidden=false;active.setAttribute('aria-expanded','true');position();
 }
 function schedule(input){
  active=input;clearTimeout(timer);
  if(!input.value.trim()){hide();return;}
  timer=setTimeout(show,80);
 }
 inputs.forEach(el=>{
  el.setAttribute('aria-autocomplete','list');el.setAttribute('aria-controls',popup.id);
  el.setAttribute('aria-expanded','false');
  el.addEventListener('compositionstart',()=>{composing=true;});
  el.addEventListener('compositionend',()=>{composing=false;schedule(el);});
  el.addEventListener('focus',()=>schedule(el));
  el.addEventListener('input',()=>{if(!composing)schedule(el);});
  el.addEventListener('keydown',e=>{
   if(popup.hidden||!options.length)return;
   if(e.key==='Escape'){hide();return;}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    selected=(selected+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
    [...popup.querySelectorAll('[data-nv61]')].forEach((btn,i)=>{
     btn.setAttribute('aria-selected',String(i===selected));if(i===selected)btn.scrollIntoView({block:'nearest'});
    });
   }else if(e.key==='Enter'&&selected>=0){e.preventDefault();choose(selected);}
  });
 });
 popup.addEventListener('mousedown',e=>e.preventDefault());
 popup.addEventListener('click',e=>{const b=e.target.closest('[data-nv61]');if(b)choose(Number(b.dataset.nv61));});
 document.addEventListener('click',e=>{if(!popup.contains(e.target)&&!inputs.includes(e.target))hide();});
 window.addEventListener('scroll',position,{passive:true});
 window.addEventListener('resize',position,{passive:true});
 document.getElementById('clear-search')?.addEventListener('click',hide);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
