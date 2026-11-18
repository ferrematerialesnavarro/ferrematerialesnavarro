/* NAVARRO 360 — Contrato PRIVADO para bot/SIFO V70.
 * Sólo valida solicitudes. NO llama a SIFO, NO marca pedidos como guardados.
 * Importar en Node 18+ del servidor/bot después de validar su flujo real.
 */
'use strict';
const crypto=require('node:crypto');
const MAX_ITEMS=300,MAX_QTY=9999,MAX_AGE_MS=5*60*1000;
const CODE=/^\d{5,30}$/,ID=/^[A-Za-z0-9][A-Za-z0-9_-]{11,95}$/;
const AUTH_ROLES=new Set(['admin','vendedor']);
function validQty(value){
 const s=String(value??'');
 if(!/^(?:[1-9]\d{0,3}|0)(?:\.\d{1,4})?$/.test(s))return null;
 const n=Number(s);
 return Number.isFinite(n)&&n>0&&n<=MAX_QTY?n:null;
}
function parseOrder(data,productByCode){
 if(!data||typeof data!=='object'||Array.isArray(data))return {ok:false,reason:'FORMATO_INVALIDO'};
 if(!ID.test(String(data.requestId||'')))return {ok:false,reason:'REFERENCIA_INVALIDA'};
 if(!Array.isArray(data.items)||data.items.length<1||data.items.length>MAX_ITEMS)
  return {ok:false,reason:'ARTICULOS_INVALIDOS'};
 if(typeof productByCode!=='function')return {ok:false,reason:'SIN_CATALOGO_AUTORIZADO'};
 const seen=new Set(),items=[],totals=[];
 for(const entry of data.items){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))return {ok:false,reason:'LINEA_INVALIDA'};
  const code=String(entry.code||''),qty=validQty(entry.qty);
  if(!CODE.test(code)||qty===null)return {ok:false,reason:'CODIGO_O_CANTIDAD_INVALIDA'};
  if(code==='00000')return {ok:false,reason:'VARIOS_REQUIERE_FLUJO_VALIDADO'};
  if(seen.has(code))return {ok:false,reason:'CODIGO_DUPLICADO'};
  seen.add(code);
  const reference=productByCode(code);
  const priceCents=Number(reference?.priceCents);
  if(!reference||!Number.isSafeInteger(priceCents)||priceCents<1||priceCents>999999999)
   return {ok:false,reason:'PRODUCTO_O_PRECIO_NO_AUTORIZADO'};
  // Los precios del cliente NUNCA sustituyen el precio vigente del POS.
  if(entry.priceCents!==undefined&&entry.priceCents!==priceCents)
   return {ok:false,reason:'CAMBIO_PRECIO_REQUIERE_AUTORIZACION_SERVIDOR'};
  items.push({code,qty,priceCents});
  totals.push(Math.round(priceCents*qty));
 }
 const estimatedCents=totals.reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(estimatedCents)||estimatedCents<1)return {ok:false,reason:'TOTAL_INVALIDO'};
 if(data.expectedTotalCents!==undefined){
  if(!Number.isSafeInteger(data.expectedTotalCents)||Math.abs(data.expectedTotalCents-estimatedCents)>1)
   return {ok:false,reason:'DIFERENCIA_TOTAL',estimatedCents};
 }
 return {ok:true,pedido:{requestId:data.requestId,items,estimatedCents,status:'PENDIENTE_VALIDACION_SIFO',sifoConfirmed:false}};
}
function verifyRequest(rawBody,headers,secret,now=Date.now()){
 if(typeof secret!=='string'||secret.length<32)return false;
 if(!Buffer.isBuffer(rawBody)||rawBody.length>131072)return false;
 const timestamp=Number(headers?.['x-navarro-timestamp']),signature=String(headers?.['x-navarro-signature']||'');
 if(!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp)>MAX_AGE_MS||!/^[0-9a-f]{64}$/i.test(signature))return false;
 const expected=crypto.createHmac('sha256',secret).update(String(timestamp)).update('.').update(rawBody).digest();
 const supplied=Buffer.from(signature,'hex');
 return supplied.length===expected.length&&crypto.timingSafeEqual(expected,supplied);
}
function markConfirmed(pedido,confirmation){
 if(!pedido||pedido.status!=='PENDIENTE_VALIDACION_SIFO'||pedido.sifoConfirmed)return {ok:false,reason:'PEDIDO_NO_PENDIENTE'};
 if(!confirmation||confirmation.confirmed!==true||typeof confirmation.origin!=='string'||confirmation.origin!=='SIFO')
  return {ok:false,reason:'SIN_CONFIRMACION_REAL_DEL_POS'};
 const evidence=String(confirmation.evidenceId||'');
 if(evidence.length<8||evidence.length>120)return {ok:false,reason:'EVIDENCIA_INSUFICIENTE'};
 // Folio NO obligatorio: las instalaciones con modo SIN FOLIO deben conservarlo.
 return {ok:true,pedido:{...pedido,status:'GUARDADA_EN_SIFO',sifoConfirmed:true,sifoEvidenceId:evidence,sifoConfirmedAt:new Date().toISOString()}};
}
module.exports={validQty,parseOrder,verifyRequest,markConfirmed};
