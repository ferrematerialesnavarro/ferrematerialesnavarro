# NAVARRO 360 — Multi-caja con separación real de permisos

**Estado: base técnica preparada, NO activada en producción.** El sitio actual continúa funcionando con su carrito, escáner, impresora POS-58-Series/ngrok, WhatsApp/SIFO, historial, arqueo y respaldo local. **No introducir credenciales en GitHub Pages.**

## Decisión comercial aprobada

- Cada vendedor utiliza **un usuario de acceso independiente y una caja asignada únicamente a él**.
- El vendedor consulta solo sus tickets, movimientos y totales.
- El administrador autorizado puede consultar **todas las cajas** y el total consolidado.
- El administrador mantiene los perfiles y las asignaciones desde herramientas privadas del servidor, nunca editando variables de un navegador.
- Cualquier venta generada en NAVARRO 360 sigue enviándose a WhatsApp/SIFO e imprimiéndose mediante el flujo actual hasta finalizar pruebas reales. No sustituir ni interrumpir ese flujo.

## Por qué GitHub Pages no basta

GitHub Pages es estático. Ocultar un botón "Administración" con JavaScript, usar el PIN local del vendedor o poner un password en el código HTML **no protege** tickets ajenos. La seguridad debe implementarse en un servidor con cuentas autenticadas y políticas obligatorias **Row Level Security (RLS)**.

Elegimos **Supabase como implementación de referencia, pendiente de que el propietario autorice y configure su proyecto**; la migración `001_esquema_seguro.sql` no se ha ejecutado contra ningún proyecto. No se han creado empleados, contraseñas ni cuentas reales.

Documentación de referencia:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/getting-started/api-keys

## Esquema propuesto

| Tabla | Qué guarda | Vendedor | Administrador |
|---|---|---|---|
| `nv360_staff` | Usuario de Supabase Auth, nombre, perfil y estado | Ver su propia ficha | Ver todas las fichas |
| `nv360_registers` | Identificación y estado de cajas | Ver su caja | Ver todas |
| `nv360_assignments` | Relación uno a uno entre vendedor y caja | Ver su asignación | Ver todas |
| `nv360_sales` | Ticket, fecha, importes en centavos, estado, método de pago y cantidad de líneas | Leer e insertar solo de su caja | Leer todas |
| `nv360_cash_events` | Movimientos append-only por caja y fecha: fondo inicial, conteo, entrada, gasto y retiro | Leer e insertar de su caja | Leer todos |

**No se envían teléfonos, domicilios, nombres de clientes, PIN, tokens ni números de tarjeta al servidor en la primera etapa.**

Las políticas RLS verifican el usuario autenticado contra `auth.uid()` y la asignación activa en el servidor. La columna `seller_id` del navegador **nunca** decide por sí misma la autorización.

El servidor asigna `received_at`; cada `source_job_id` y `source_event_id` es único por vendedor para evitar duplicados. No hay permisos de UPDATE ni DELETE para el historial. Si algo cambia, se registra otro evento con trazabilidad.

**ATENCIÓN:** `nv360_sales` contiene únicamente tickets aceptados en la cola Windows. No prueba que el papel salió, el banco acreditó la tarjeta o SIFO completó la venta; no debe presentarse como contabilidad fiscal ni como inventario sincronizado.

## Pasos para habilitar sin arriesgar ventas

1. El propietario crea o autoriza un **proyecto Supabase propio**. No compartir claves secretas aquí, en capturas ni en archivos del repositorio.
2. En el proyecto, configurar **Supabase Auth**: invitar usuarios individualmente, impedir registros abiertos si la plataforma es interna y exigir verificación del correo. Cada empleado tendrá una cuenta distinta; no compartir sesiones.
3. Ejecutar `001_esquema_seguro.sql` **una vez** desde el SQL Editor administrador. Antes de usar datos reales, revisar los privilegios de las políticas y de la función SECURITY DEFINER.
4. Crear por invitación el usuario de administrador en Supabase Auth. **Solo después**, asignar el rol admin a su UUID con una instrucción SQL ejecutada manualmente desde el SQL Editor (ejemplo de abajo). No habilitar que el navegador escriba roles.
5. Invitar vendedores, crear una caja por vendedor y asignarla. Probar con mínimo dos cuentas vendedor distintas y una de administrador.
6. Habilitar un **cliente de sincronización opt-in** en entorno de pruebas, no en la página principal. El dispositivo conserva el carrito, los tickets y arqueos originales. El envío requiere cuenta autenticada, confirmación de recepción y cola local de reintento idempotente; el servidor marca tiempos reales.
7. Validar aislamiento, desconexión de internet, conflictos, cuentas desactivadas y permisos globales del administrador. Solo después integrar el panel central a la página principal sin modificar el flujo del ticket.

### Ejemplo de alta de perfiles — SOLO SQL Editor de un proyecto real

Sustituir los UUID **en el SQL Editor**, nunca en el código público. Los UUID deben corresponder a usuarios reales creados en Supabase Auth:

```sql
-- EJEMPLO. NO EJECUTAR CON ESTOS VALORES DE EJEMPLO.
insert into public.nv360_staff (user_id, display_name, role, active)
values ('00000000-0000-0000-0000-000000000001', 'Administrador', 'admin', true);

insert into public.nv360_staff (user_id, display_name, role, active)
values ('00000000-0000-0000-0000-000000000002', 'Vendedor A', 'seller', true);

insert into public.nv360_registers (code, name)
values ('CAJA_01', 'Caja vendedor A');

insert into public.nv360_assignments (seller_id, register_id)
select '00000000-0000-0000-0000-000000000002', id
from public.nv360_registers where code = 'CAJA_01';
```

## Protocolo de sincronización a implementar después de Auth

- El navegador registra su ticket local **primero** mediante el flujo ya probado.
- Cuando esté conectado y el usuario tenga sesión, envía a `nv360_sales` **solo**: `seller_id` autenticado, caja asignada, `source_job_id`, fecha del ticket, subtotal, flete, número de líneas, estado y método.
- Los tickets duplicados por reconexión se reconocen por `(seller_id, source_job_id)`. **Jamás generar otro ID al reintentar**, y no utilizar reimpresiones como ventas nuevas.
- Las aperturas/cierres y gastos/retiros se registran en `nv360_cash_events`. Para una corrección se genera un evento nuevo, no se sobreescribe la evidencia anterior.
- El administrador recupera registros agregados, agrupados por `register_id` y por la **fecha del servidor en hora local de México**, indicando si son tickets en cola o ventas verificadas por otro sistema.
- Nunca respaldar ni sincronizar la contraseña del usuario, token de impresora, clave privada de Supabase, PIN local ni datos de tarjeta.
- Una clave **publishable** de Supabase puede estar en el cliente **solo si** las tablas tienen RLS correctamente verificada; claves **secret** o service-role se quedan exclusivamente en infraestructura privada.

## Pruebas de seguridad obligatorias

1. **Sin iniciar sesión:** no se puede consultar ni insertar ninguna tabla.
2. **Vendedor A:** ve su caja y sus registros; al intentar leer registros de B recibe cero filas. Insertar con `seller_id` de B o `register_id` de B debe fallar.
3. **Vendedor B:** simétrico a A. No puede asignarse un rol admin ni cambiar de caja desde REST.
4. **Administrador activo:** puede leer A y B, sin poder reescribir ni borrar tickets.
5. **Cuenta desactivada:** no puede insertar ventas/movimientos nuevos. La revocación debe funcionar sin reabrir sesión.
6. **Reintento:** el mismo ID no genera otro ticket, y una copia reimpresa tampoco genera otro registro.
7. **Sin internet:** el carro, impresión local y pedidos siguen funcionando; la cola de sincronización conserva pendientes y evita borrados sin confirmación.
8. **Cambio de dispositivo o vendedor:** los reportes dejan de mezclar cajas y nunca se transfieren sesiones ni claves.
9. **Validación del corte:** verificar que tarjeta/transferencia/efectivo se clasifican por la elección original, sin afirmar verificación bancaria.
10. **Prueba física en iPhone y Windows:** imprescindible antes de activar esta función en caja real.

## Alcance pendiente

No está creada ni conectada una cuenta Supabase. No existe todavía un panel del administrador con datos reales ni hay sincronización entre equipos. Este commit es un **respaldo de arquitectura y migración preparada**, sin alterar los scripts activos de NAVARRO 360.

La configuración inicial necesita la intervención del propietario en Supabase para crear y autorizar el proyecto y las cuentas de acceso.
