# NAVARRO 360 V30 LOCAL — decisión revisada
**Preparación de esquema SQLite. No instalado ni activo.** La opción Supabase queda como alternativa archivada y no se requiere para este plan. V29.9.3 se conserva sin cambios.
 
## Almacenamiento y puente
- Base SQLite privada en `%LOCALAPPDATA%\\NAVARRO360_PRINT\\creditos-v30.sqlite` en Windows. Nunca en GitHub Pages ni en una carpeta pública. Node 24 dispone de node:sqlite; verificar versión efectiva del puente antes de instalar.
- Incorporar una ruta privada al puente de impresión existente. Verificar el token de vinculación **y** las credenciales de dispositivo contra el módulo Inventario V22 con su acción check. El servidor obtiene la caja autenticada, nunca confiar en un nombre de caja enviado por el navegador. No compartir ni publicar tokens.
- El archivo se abre con WAL, foreign_keys=ON, busy_timeout, synchronous=FULL. Escrituras parametrizadas, transacción BEGIN IMMEDIATE. El saldo y la escritura de abono se resuelven en la misma transacción; el trigger también impide sobregiro.
- Id de cliente estable; folio de venta y de abono únicos; reintentos comparan el contenido original antes de devolver éxito. No reinsertar reimpresiones. Los movimientos son inmutables; correcciones requieren un procedimiento específico y trazable.
- Los clientes autorizados comparten expedientes y saldo; otros reportes de ventas siguen separados por caja. El arqueo atribuye cada abono a la caja real y fecha del movimiento sin generar una segunda venta ni descuento de inventario.
- Copia de seguridad diaria consistente usando la API de respaldo SQLite (no copiar un archivo WAL activo por separado). Guardar copia adicional fuera del disco, cifrada si se usa almacenamiento externo. Verificar restauración en una base de prueba.
 
## Activación pendiente
1. Revisar versión actual instalada del puente y autenticación Inventario V22. Preparar módulo Node, instalación con respaldo, detección de ruta y reinicio específico del puente. No sustituir el servidor ni tocar sus otros endpoints.
2. Implementar cliente de sincronización opt-in; consultar saldo, crear clientes, registrar venta a crédito al finalizar y abonos separados. Si no hay red, los créditos pendientes quedan en cola persistente; no confirmar abonos con saldo obsoleto. Distinguir pendiente de confirmado. No cambiar el comportamiento de invitado.
3. Exportar respaldos locales de las cuatro cajas, importar clientes primero y movimientos ordenados; conservar sus UUID y folios. Revisar homónimos y duplicados antes de unir. Conciliar totales, sin borrar datos locales.
4. Prueba con dos cajas: sesión válida/ inválida, venta y abono, carrera de abonos, reintentos, reinicio del puente, reconexión, recuperación y respaldo. Después habilitar en las cuatro cajas y el panel administrador.
 
## Limitación
La sincronización depende de Windows encendido, puente activo y conexión. La base es local; ngrok solo transporta solicitudes autenticadas. No se ha creado la base real, instalado un servidor ni integrado la página pública.