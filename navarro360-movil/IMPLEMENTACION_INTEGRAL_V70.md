# NAVARRO 360 — Implementación integral V70

Fecha: 18 de noviembre de 2026.

## Incorporado a la tienda pública
1. **Navegación rápida de materiales**: accesos con colores para CPVC, PVC, hidráulico, galvanizado, cobre, PPR, electricidad, tornillería, pinturas y jardinería. Para materiales de plomería, filtros opcionales por tipo de conexión y diámetro (pulgadas); el cliente debe escoger la variante específica.
2. **Carrito más rápido**: el módulo `carrito-seguro.js` reutiliza mapas de nombres y precios del catálogo en lugar de recorrer los productos de nuevo cada vez.
3. **Fotografías más ligeras**: las primeras tarjetas reciben prioridad de carga; imágenes posteriores usan decodificación asíncrona y carga diferida.
4. **Entrega a domicilio**: vista estimada del subtotal, flete de referencia ($50 si no alcanza $1,000; gratis a partir de $1,000), progreso para llegar a gratis y campo opcional de dirección para copiar a WhatsApp cuando el bot la solicite. **No añade flete automáticamente ni cambia mensajes del bot**.
5. **Estado del pedido**: se distingue entre un intento de abrir WhatsApp y la confirmación real del bot/SIFO. La web no puede verificar un envío ni un guardado SIFO.
6. **Auditoría de fotos**: sólo con `?auditoria=1`, cuenta imágenes y sprites visibles, carga fallida, posibles imágenes reutilizadas; deja marcar por código y exportar CSV local. No sustituye una inspección visual ni publica fotos.
7. **Caché y conexión**: el service worker V70 pide versiones recientes de scripts críticos, conserva respaldo de archivos pequeños por URL exacta y muestra página de desconexión sin confundir HTML con JS.

Archivos principales: `experiencia-integral-v70.js`, `auditoria-fotos-v70.js`, `carrito-seguro.js` (carga opcional), `sw.js` y `offline.html`.

## Preparado, pero NO activado para ventas reales
8. `backend/sifo-contrato-seguro-v70.cjs`: valida códigos y cantidades <=4 decimales, precios del servidor, totales y evidencia real del POS. Rechaza PRODUCTOS VARIOS y precios cambiados sin permiso del servidor. NO se conecta a SIFO.
9. `backend/sifo-idempotencia-v70.sql`: diseño de registros únicos de solicitud para rechazar duplicados tras su instalación privada; acceso del navegador público denegado. NO está ejecutado ni desplegado.

## Pruebas por código realizadas
- Estimación de flete por debajo y encima de $1,000, con y sin flete incluido, y precio editado: 5 casos correctos.
- Recuperación de producto por nombre y precio mediante índices reutilizados: correcta.
- Carga condicional: tienda normal carga el complemento V70; `?auditoria=1` carga además auditoría fotográfica: correcto.
- Auditoría por SKU: imagen visible, sprite, ausencia detectable, URL compartida y reporte manual: correcto.
- Contrato SIFO: acepta solicitud válida, rechaza PRODUCTOS VARIOS, qty cero, precio cambiado sin autorización, y no confirma WhatsApp como guardado SIFO: correcto.
- Sintaxis de todos los módulos modificados: correcta.

## Pendientes que requieren más información, pruebas en dispositivos o backend privado
- **Extraer el catálogo de 2.1 MB del HTML principal**: todavía NO hecho. Requiere refactor seguro del archivo `index.html` grande para preservar orden de inicialización, imágenes y productos. La presente V70 acelera accesos, fotos y cálculo del carrito, no elimina el peso principal.
- **Asignar fotografías reales faltantes o corregir imágenes equivocadas**: auditoría lista, correcciones aún requieren fotos verificadas y revisión por código.
- **Stock y precios EN TIEMPO REAL desde SIFO**: no conectados. Se necesita el bot Windows vigente, adaptador de POS, autorización de empleados y pruebas de guardado.
- **Sincronización de historial de ventas entre equipos**: actualmente permanecen datos locales de prueba. El esquema Supabase existente es preliminar y no está configurado.
- **Pruebas de iPhone**: verificar navegación, carga inicial, fotografías, cantidades fraccionarias, flete, WhatsApp, retorno y recuperación del carrito.

## Política de seguridad
No marcar una venta como guardada en SIFO sólo porque se abrió WhatsApp. No publicar tokens/secretos en GitHub Pages. No cobrar automáticamente PRODUCTOS VARIOS ni conceder permisos por PIN en localStorage. La tienda de clientes conserva sus mensajes numéricos y el bot/SIFO existentes permanecen sin modificaciones.
