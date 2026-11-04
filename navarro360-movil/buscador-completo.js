/* NAVARRO 360 — Buscador completo V2, 04-nov-2026.
   Consulta solamente la copia de NAVARRO_DB; no altera precios, carrito, escáner ni SIFO.
   No expone Grupo Truper en búsquedas genéricas: código exacto o descripción específica.
*/
(function () {
  'use strict';
  const STOP = new Set('DE DEL LA LAS EL LOS LO UN UNA UNO Y CON PARA POR EN AL A LAS LOS GRADO GRADOS PULGADA PULGADAS PULG CALIBRE GRANO NUMERO NO'.split(' '));
  const BRAND = new Set('TRUPER PRETUL FOSET FOSSET HERMEX HEXMEX VOLTECK FIERO KLINTEK EXPERT ULTRACRAFT'.split(' '));
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
  const isNumber=t=>/\d/.test(t);
  function specificEnough(query,row,totalProtected) {
    const q=query.tk;
    if (q.length < 3) return false;
    // La frase completa, o con preposiciones omitidas, identifica un SKU concreto.
    if (q.join(' ')===row.tk.join(' ')) return true;
    const branded=q.some(x=>BRAND.has(x));
    const informative=q.filter(x=>!BRAND.has(x));
    const hasNumber=informative.some(isNumber);
    if (branded && informative.length>=3 && (hasNumber || informative.length>=4)) return true;
    if (informative.length>=5 && hasNumber) return true;
    // Un producto de medida muy definida, sin recomendar toda la familia.
    if (informative.length>=3 && hasNumber && totalProtected<=3) return true;
    return false;
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
    const protectedMatches=selected.filter(x=>!x.generic).length;
    const q={tk,normalized};
    selected=selected.filter(x=>x.generic||specificEnough(q,x,protectedMatches));
    selected.sort((a,b)=>score(b,q)-score(a,q)||a.name.localeCompare(b.name,'es',{numeric:true})||a.id.localeCompare(b.id));
    return selected.map(x=>{
      const p=dictionary.get(x.id);
      return {...p,display:p.name,cat:'Catálogo general',sub:'',img:imgFor(x.id)};
    });
  }
  window.NAVARRO_BUSCADOR_COMPLETO = Object.freeze({
    version:'2026-11-04-v2',
    total:rows.length,
    genericos:rows.filter(x=>x.generic).length,
    protegidos:rows.filter(x=>!x.generic).length,
    searchByName
  });
})();
