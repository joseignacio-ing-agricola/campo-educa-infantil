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
