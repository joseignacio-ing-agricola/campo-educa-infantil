# Campo Educa Infantil

Web en español para familias, con perfil y aula virtual conectados al proyecto Supabase de Campo Educa.

## Publicación en Cloudflare Pages

- Rama: `main`.
- Directorio raíz: repositorio.
- Framework: ninguno.
- Comando de compilación: vacío.
- Directorio de salida: `dist`.

El sitio no requiere instalación ni compilación. Para desarrollo, servir `dist` por HTTP.

## Aula

Ingreso con cuentas habilitadas por el encargado, perfil, cambio de contraseña, administración de matrículas y avance por alumno. Los tres cursos infantiles tienen cuatro lecciones cada uno, actividades y práctica sin certificación oficial. El contenido completo de las lecciones se consulta desde Supabase tras verificar la matrícula. Las ilustraciones y los videos breves de introducción son recursos públicos del sitio.

`dist/config.js` contiene únicamente configuración pública. Nunca añadir claves secretas. El esquema adicional de materiales está en `backend/schema.sql` como referencia: ya está instalado en el proyecto existente y no reemplaza el esquema original.

## Verificación

Superadas comprobaciones de sintaxis, navegación del lector, respuestas y avance; además se comprobó el acceso al material con matrícula activa, sin matrícula y con matrícula vencida. Queda pendiente validar ingreso y administración con una cuenta real en el despliegue final, y la revisión pedagógica antes de comercializar el material.

## Videos e ilustraciones por paso

Doce introducciones ilustradas, una por lección, de aproximadamente 27 a 33 segundos; narración sintética en español de Broti, texto en pantalla y subtítulos WebVTT. Controles manuales, sin reproducción automática. Al cambiar de lección se detiene el video anterior. Cada actividad tiene tres pasos ilustrados (36 escenas en total).

La portada incluye un reel vertical de unos 35 segundos para descargar. No se ha publicado en redes sociales. Los MP4, subtítulos y portadas están en `dist/videos`; las láminas de pasos se encuentran en `dist/imagenes` y se muestran por celdas desde CSS.

## Mejoras del aula y del recorrido comercial

- Muestra completa y sin registro en `/clase-gratis.html`: solo la primera lección, con video, tres pasos, juego y pregunta. La prueba no crea una cuenta ni guarda avance académico.
- El avance pendiente se conserva en el almacenamiento de este navegador, separado por cuenta. Hay estados de guardado y reintentos de sincronización. El material privado sigue requiriendo conexión y matrícula activa; esto no es un aula completa sin conexión. Si el almacenamiento está bloqueado o lleno, el sitio avisa y mantiene los cambios solo en memoria.
- El guardado conserva cambios realizados mientras hay otra solicitud en curso y combina las lecciones completadas con el estado del servidor.
- Tarjetas con avance, vencimiento y botón Continuar mi aventura.
- Juegos de ordenar dibujos, operables con ratón, pantalla táctil y teclado, sin ranking. Broti tiene movimiento suave durante la reproducción, respetando movimiento reducido. Se conserva la narración sintética existente.
- Vista administrativa filtrada por matrículas infantiles y búsqueda puntual de cuentas existentes por correo. Se retiró la eliminación completa de cuentas de la interfaz infantil. La función del servidor rechaza desde este portal la eliminación global y las modificaciones de cursos no infantiles. La cuenta administradora sigue siendo compartida con Campo Educa.
- Registro comercial privado de cifras agregadas y manuales en `infantil_sales_metrics`: consultas calificadas y compradores por fecha, curso y canal. Un clic en WhatsApp no se considera una consulta. La tabla tiene RLS y solo permite registros a administradores; no se cargaron cifras de ejemplo.
- Ilustraciones activas en WebP: 1.310.445 a 868.756 bytes para las seis imágenes principales (33,7 % menos). Fuentes locales para evitar solicitudes a Google Fonts. Los videos mantienen carga manual.

Los precios y las condiciones definitivas de compra siguen pendientes de definición del propietario y se consultan por WhatsApp. No se han inventado importes, plazos comerciales nuevos ni certificaciones. Se mantiene pendiente la revisión pedagógica antes de comercializar el material.

### Pruebas

Ejecutar `npm test` sin instalar dependencias. Se verifican la recuperación del avance, aislamiento entre cuentas, concurrencia, fallos de almacenamiento, filtrado del panel y la muestra gratuita. También se ejecutaron pruebas de acceso a la tabla de métricas como administrador y alumno en una transacción revertida. No se realizó ingreso de navegador con las credenciales del propietario.
