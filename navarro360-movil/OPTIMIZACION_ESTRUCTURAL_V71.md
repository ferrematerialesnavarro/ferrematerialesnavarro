# NAVARRO 360 — Optimización estructural V71

Fecha: 18 de noviembre de 2026.

## Resultado publicado
Se extrajeron literalmente los bloques estáticos que antes estaban dentro de `navarro360-movil/index.html`, sin cambiar su contenido ni el orden en que se ejecutan.

| Recurso nuevo | Tamaño de texto |
|---|---:|
| `catalogo-navarro-v71.js` | 1,252,412 bytes |
| `tienda-estilos-v71.css` | 442,341 bytes |
| `destacados-navarro-v71.js` | 13,333 bytes |
| `plomeria-base-v71.js` | 89,543 bytes |
| `genericos-verificados-v71.js` | 32,181 bytes |
| `atlas-fotos-v71.js` | 17,743 bytes |
| `tienda-app-v71.js` | 27,922 bytes |

Antes: **2,135,792 bytes de HTML**. Ahora: **260,608 bytes de HTML**. Reducción del tamaño de la página HTML: **87.8%**.

**Importante:** estos bytes se trasladan a archivos separados, no desaparecen. En la primera visita se siguen necesitando datos, fotos y estilos. La mejora prevista proviene del documento inicial más corto y del aprovechamiento de la caché del navegador para visitas posteriores. El ahorro exacto en tiempo de carga debe medirse en iPhone, con una visita fría y otra repetida.

## Preservación y pruebas
- Catálogo de **17,835 códigos numéricos únicos**, ningún código duplicado, precios numéricos.
- `CEMENTO GRIS POR SACO` código `7777001648` $160; `CEMENTO BLANCO SACO 25` `7777001635` $280.
- 167 productos destacados, 2,189 genéricos aprobados, 234 archivos en atlas de fotos; módulo de plomería cargable.
- Los 7 recursos externos obtenidos del repositorio coinciden exactamente, carácter por carácter, con los bloques originales.
- Se reconstruyó el HTML anterior desde el nuevo sustituyendo los 7 archivos y revirtiendo la precarga y las versiones de caché: **coincidencia exacta de los 2,135,792 caracteres originales**.
- Se conserva el orden de carga de catálogo, destacados, plomería, genéricos, atlas, electricidad, buscador y aplicación.
- `carrito-seguro.js?v=71` y el registro `sw.js?v=71` fuerzan una revisión de sus versiones actualizadas.
- Se añadió `verificar-catalogo-v71.mjs` para repetir las comprobaciones en una copia local del repositorio.

## Recuperación
Rama de respaldo: `respaldo-navarro-v70-antes-catalogo-v71-20261118`. El archivo original también permanece recuperable por su blob SHA `a7ac37a32b690a78ce77878ab321804d58dbca0c`.

## Límites
No se ha cronometrado la carga en un iPhone real ni confirmado una venta por WhatsApp. No se cambió ni se probó el bot Windows o SIFO. Los inventarios y los precios oficiales de SIFO no se sincronizan automáticamente por esta optimización. La aplicación sigue usando el catálogo publicado de 17,835 códigos y no se sustituye por el Excel maestro de 17,837 sin revisión.
