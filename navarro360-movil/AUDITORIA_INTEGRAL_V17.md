# NAVARRO 360 — Auditoría integral de experiencia, desempeño y operación
Fecha: 17 de noviembre de 2026. Alcance: archivos disponibles en el repositorio; no es una prueba física de venta ni una auditoría de SIFO en Windows.

## Resumen
La tienda pública `navarro360-movil/index.html` ocupa aproximadamente **2.1 MB**, además de módulos de fotos de más de 2 MB y un índice opcional de búsqueda por foto de unos **11 MB comprimidos**. La página de pruebas de vendedores `precios-vendedor-prueba.html` es un flujo separado. Muchos módulos tienen versiones históricas preservadas; hay riesgo de servir archivos antiguos por caché o integrar dos implementaciones distintas.

El sistema todavía carece de confirmación bidireccional desde SIFO y la web pública no puede verificar por sí misma un mensaje efectivamente enviado desde WhatsApp. Un PIN guardado sólo en localStorage no constituye autorización segura de empleados. El catálogo publicado no demuestra sincronización instantánea de stock ni precios del POS.

## Correcciones aplicadas con esta auditoría
- `sw.js` pasó a **V69**: instala de manera tolerante a fallos; no sirve una página HTML como archivo JavaScript; no elimina cachés ajenas; evita caché ilimitada de índices fotográficos; red primero en navegaciones (no presentar precios antiguos por pérdida de conexión).
- `offline.html`: pantalla de desconexión con advertencia sobre vigencia de precios y sin intentar procesar pedidos.
- `carrito-seguro.js`: copia local adicional del carrito recuperable durante 12 horas al preparar WhatsApp. No cambia formato de pedido, inventario, precios ni bot.

## Prioridad P0 — seguridad de cobranza y pedidos
1. **Identificador único por pedido y confirmación en SIFO**: estados preparar / pendiente / procesando / venta guardada / error, con idempotencia desde el bot. No confundir abrir WhatsApp con venta confirmada.
2. **Autorización real de vendedores**: servidor o bot con roles, permisos y auditoría; los PIN locales son solamente demostrativos.
3. **Precios e inventario confiables**: fecha de última sincronización, alertas de stock y control de diferencias antes de mandar ventas. Nunca presentar disponibilidad garantizada sin SIFO.
4. **Carrito resistente a interrupciones**: auto-guardado verificable, recuperación, no duplicar pedido si cliente vuelve desde WhatsApp, registro de errores.

## Prioridad P1 — velocidad, facilidad y claridad de la tienda completa
5. **Reducir peso inicial**: sacar catálogo de >2 MB del HTML a datos versionados, indexación compacta en memoria, cargar módulos de categorías sólo cuando se visiten; mantener caché estable para activos pequeños. Medir tiempo de arranque en iPhone real.
6. **Fotos consistentes y sin asociaciones incorrectas**: auditoría código→foto→nombre→precio, imagen correcta y centrada, placeholder coherente. El índice visual V57 registra 15,953 imágenes de referencia; no asumir que eso cubre exactamente cada SKU.
7. **Buscador único**: utilizar una sola política de resultados, autocompletado, códigos exactos, medidas y sinónimos en todas las categorías, con productos genéricos primero y Truper después según las reglas aprobadas.
8. **Página inicial simplificada**: buscador principal visible de inmediato, categorías fáciles de identificar, productos frecuentes, botón persistente para revisar carrito y precios completos.
9. **Carrito por importe y fracciones**: importe en pesos para kilo/metro/litro, precio editado visible, cálculos de centavos explícitos, advertencias si SIFO redondea.
10. **Contacto y entregas**: costo de envío y umbral de envío gratis, datos mínimos de domicilio, confirmación comprensible del flujo de WhatsApp y expectativa de respuesta.
11. **Accesibilidad y móviles**: controles con al menos 44 px de área táctil, texto de formularios >=16px en iPhone, navegación por teclado, etiquetas para lectores de pantalla, fotos lazy-load, soporte 375/390/430 px y escritorio.

## Prioridad P2 — operación y continuidad
12. **Catálogo de consulta desconectada (sólo lectura)**: modo explícito 'precios por verificar', sin enviar ventas mientras no se valide conexión; versionado de catálogo.
13. **Ventas frecuentes y clientes**: repetir carrito de una venta previa con precios recalculados actuales; conservar referencia sin datos sensibles innecesarios.
14. **Análisis operativo real**: seguimiento por folio/estado confirmado SIFO, ventas por vendedor real y diferencias conciliadas; separar claramente simulaciones locales.
15. **Pruebas automáticas**: conjunto de casos para cemento gris/blanco, varilla tramo, CPVC/PVC, clavos por importe, fracciones, código EAN/UPC, doble escaneo, 10 productos, cambio de precios, envío, cancelaciones y stock negativo.

## Criterios de aceptación propuestos (objetivos, NO resultados medidos)
- Carga inicial de pantalla usable en iPhone: objetivo <=3s con red móvil de prueba, midiendo p50/p95.
- Búsqueda por nombre: objetivo de respuesta <=150ms tras escritura, p95 con catálogo completo.
- 100% de códigos aceptados en cobro deben corresponder a un producto real y precio definido en catálogo vigente.
- 0 pedidos duplicados en reintentos a bot/SIFO y 0 confirmaciones de 'venta guardada' sin confirmación real del POS.
- Recuperación íntegra del carrito después de cerrar/reabrir Safari en 10/10 pruebas.
- 100% de cambios de precio autorizados de forma segura antes del registro real.

## Control de producción
No desplegar integración real de vendedores ni modificar `index.js`/SIFO sin archivo actual del bot, pruebas de decimales, confirmación de venta guardada y aprobación del encargado. La tienda pública sigue usando su flujo de WhatsApp; los cambios de V69 se limitan a caché/desconexión y a la copia de recuperación de carrito.
