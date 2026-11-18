# NAVARRO 360 — Condiciones para autenticar vendedores e integrar SIFO
Actualizado 17/nov/2026. Estado: DISEÑO / NO HABILITADO.

## Lo que YA está hecho en la caja de pruebas V16
- Buscar por nombre y código, sinónimos, medidas, correcciones leves, prioridad genérica.
- Cámara de iPhone con motor ZXing y respaldos, lectura repetida conservadora.
- Productos frecuentes verificados desde catálogo; lista adaptativa por frecuencia LOCAL.
- Lector USB/Bluetooth tipo teclado: números rápidos + Enter; sin capturar escritura humana lenta.
- Minicarrito, importes fraccionarios, PRODUCTOS VARIOS por pesos, ventas en espera y cálculo de cambio SIMULADO.
- Prevalidación del pedido antes de SIFO: cantidad/código, equivalente y diferencia. Pedidos con PRODUCTOS VARIOS no pasan como pedidos automáticos.
- Registro local de referencia de vendedor y cambios de precio, **sin autenticación**. No concede permisos.

## Bloqueos de seguridad hasta contar con bot actual y validación real
1. Esta web es pública y estática. No es posible asegurar permisos reales con PIN, contraseña o privilegios en JavaScript/localStorage. Crear un servicio privado o un puente seguro del bot en la PC con identidad y permisos validados del lado del servidor; nunca publicar tokens o credenciales en GitHub.
2. No insertar instrucciones SIFO directamente desde GitHub Pages: la PC con SIFO debe aceptar pedidos únicamente por canal autenticado, con lista blanca de usuarios, precios y códigos normalizados, y validación del lado del bot.
3. Guardar identificador único del pedido; rechazar duplicados; validar antes de capturar cada línea (código real, cantidad > 0, importes en centavos enteros, redondeos aceptables).
4. PRODUCTOS VARIOS (código 00000) debe conservar el flujo especial validado en el bot, nunca mezclarse de manera automática con un bloque numérico hasta superar pruebas de integración de SIFO y su precio fijo/fracciones.
5. Marcar "VENTA GUARDADA" exclusivamente tras verificar la respuesta real de SIFO, no tras abrir WhatsApp o simular cobro. Si falla, conservar pedido pendiente para reintento supervisado, sin duplicar cargos.
6. Registrar quién autorizó descuentos/cambios de precio y hora en sistema seguro central, no sólo en el teléfono.
7. Al generar ticket/reportes reales, confirmar folio si el flujo vigente lo entrega; respetar configuración actual SIN FOLIO si ésa es la aprobada. No presuponer folio.
8. Probar presencialmente con productos reales, lector iPhone, monto editable, fracciones, varios, flete, contado/por cobrar, stock negativo e impresión previa antes de cambiar producción.

## Archivos que se necesitan para completar la parte local
- Copia **actual** del bot en funcionamiento, especialmente `index.js`, `sifo_integracion.js`, módulos PRODUCTOS VARIOS y el flujo de confirmación de pagos.
- Resultado de la prueba real en SIFO de venta con cantidad fraccionaria y total editado; identificar respuesta de guardado y fallos.
- Configuración de vendedores/permisos aprobada por el dueño (no contraseñas en el repositorio).

## Política de activación
- El sitio público de clientes y el bot actual permanecen sin modificaciones.
- Integración nueva primero en ambiente de prueba/simulación.
- Despliegue real sólo después de validación del guardado en SIFO y aprobación explícita del encargado.
