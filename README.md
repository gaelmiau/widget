# Widget de Accesibilidad — Instrucciones de Integración

Este README explica cómo integrar y usar el `AccessibilityWidget` en cualquier sitio HTML. Cubre desde la inclusión de los archivos hasta cómo controlar qué se lee con el motor TTS, idiomas por elemento, modos de lectura y buenas prácticas.

**Contenido**
- Introducción
- Integración rápida
- Configuración de idioma global y por elemento
- Qué lee y qué no lee el widget
- Controles de lectura (TTS)
- Modo lectura por secciones, Bionic y Dislexia
- Comandos de voz por números
- Preferencias y persistencia
- Compatibilidad y resolución de problemas

## Introducción

El widget añade un botón flotante en la esquina inferior derecha que abre un panel con opciones de accesibilidad: tamaño de texto, temas, cursor, lector de texto (TTS), modos de lectura por secciones, Bionic Reading y Modo Dislexia.

Los ficheros principales son:

- `accessibility-widget.js` — script principal
- `accessibility-widget.css` — estilos del widget

Coloca ambos en la carpeta de tu proyecto y sigue la integración rápida.

## Integración rápida

1) Copia `accessibility-widget.js` y `accessibility-widget.css` en tu proyecto (por ejemplo, en el mismo directorio que tu `index.html`).

2) Añade estas líneas justo antes de `</body>` en tu HTML:

```html
<!-- Widget de Accesibilidad -->
<link rel="stylesheet" href="accessibility-widget.css">
<script src="accessibility-widget.js" data-lang="es-ES"></script>
```

3) Opcional: si prefieres inicializar con configuración global desde tu propio script, define `window.A11Y_WIDGET_CONFIG` antes de cargar el archivo:

```html
<script>
  window.A11Y_WIDGET_CONFIG = { lang: 'en-US' };
</script>
<script src="accessibility-widget.js"></script>
```

El atributo `data-lang` en la etiqueta `<script>` y la propiedad `window.A11Y_WIDGET_CONFIG.lang` permiten establecer el idioma por defecto para la síntesis de voz.

## Configuración de idioma por elemento

Para forzar un idioma específico en un fragmento concreto de tu página, usa cualquiera de estos atributos en el elemento:

- `data-a11y-lang="en-US"` — especifica el idioma que el widget usará al leer ese elemento.
- `lang="fr"` — atributo HTML estándar que también será respetado.

Ejemplo:

```html
<p data-a11y-lang="en-US">This paragraph will be read in English.</p>
<p lang="fr">Ce paragraphe sera lu en français.</p>
```

El widget buscará primero `data-a11y-lang` y luego el atributo `lang` más cercano en el árbol DOM para decidir en qué voz/idioma leer.

## Qué lee y qué no lee el widget

Comportamiento general del extractor de texto:

- El algoritmo filtra automáticamente elementos no relevantes y técnicos (scripts, estilos, templates y elementos ocultos).
- Se intenta omitir el propio widget para evitar lecturas repetitivas.
- Prioriza contenido semántico: títulos (`h1`–`h6`), párrafos (`p`), listas (`ul`, `ol`, `li`), `article`, `section`, `main`, `figcaption`, etc.

Recomendaciones para controlar lectura de elementos específicos:

- Para evitar que un elemento se lea, marque el elemento como oculto para accesibilidad:
  - `aria-hidden="true"` — método estándar para excluir contenido del lector y de tecnologías de asistencia.
  - `hidden` — atributo HTML que oculta el elemento y normalmente lo excluye del árbol de lectura.

Ejemplo para excluir:

```html
<div aria-hidden="true">Contenido técnico que no debe leerse</div>
```

- Si necesitas forzar la lectura de un elemento que por defecto sería ignorado, asegúrate de que no tenga `aria-hidden` ni `hidden` y que sea semánticamente visible (usa etiquetas de bloque o `role="article"` / encabezados). El widget prioriza contenido visible y semántico.

Nota: el widget no proporciona (en esta versión) un atributo personalizado propietario para forzar inclusión/exclusión — se recomienda usar las prácticas estándar de ARIA y `lang`/`data-a11y-lang`.

## Controles de lectura (TTS)

Desde el panel del widget encontrarás controles principales de TTS:

- **Leer Selección**: lee el texto que el usuario haya seleccionado en la página.
- **Leer Página**: extrae y lee el contenido relevante de la página completa.
- **Detener**: interrumpe la lectura en curso.
- **Velocidad**: controla la velocidad de la voz con un slider (por ejemplo 0.5x–2x).

Cómo usarlo en práctica:

1. Selecciona texto con el ratón y pulsa "Leer Selección".
2. Para leer todo el contenido visible, pulsa "Leer Página".
3. Pulsa "Detener" para parar la lectura en cualquier momento.

El widget utiliza la Web Speech API del navegador (`speechSynthesis`). La disponibilidad y la calidad de voces (especialmente en español) dependen del navegador y del sistema operativo.

## Lectura por secciones, Bionic Reading y Modo Dislexia

- **Lectura por Secciones**: al activar este modo, el widget permite navegar por secciones/elementos seleccionables usando las flechas del teclado y reproducir cada sección por separado.
- **Bionic Reading**: activa un resaltado tipográfico que enfatiza el inicio de las palabras para facilitar la lectura rápida.
- **Modo Dislexia**: cambia la tipografía a OpenDyslexic, aumenta interletraje y line-height para mejorar la legibilidad.

Todos estos modos se activan/desactivan desde el panel y están diseñados para ser accesibles por teclado.

## Comandos de voz por números

Este modo enumera todos los elementos de la página que pueden leerse y permite controlarlos por voz:

**Cómo funciona:**

1. Activa "Activar Comandos por Voz" desde el panel.
2. Se mostrarán pequeños números (badges) al lado de cada elemento legible/interactivo.
3. El número **0** corresponde al botón del widget (para abrir/cerrar el panel).
4. Dice el número en voz alta y el widget:
   - **Leerá el contenido** si es un párrafo, título, etc.
   - **Activará un botón/enlace** si es un elemento interactivo.
   - **Abrirá/cerrará modales** o elementos interactivos.

**Comandos disponibles:**

- **Números (0-9, diez, once, etc.)**: Ejecuta la acción del elemento numerado.
- **"Desactivar"** o **"Salir"**: Desactiva el modo de comandos por voz.

**Ejemplo en HTML:**

```html
<h2>Mi Sección</h2>
<p>Este párrafo se podrá leer diciendo el número que aparezca a su lado.</p>
<button>Aceptar</button>

<!-- Al activar "Comandos por Voz", verás:
  0 - Botón del widget
  1 - h2: Mi Sección
  2 - p: Contenido del párrafo
  3 - button: Aceptar
-->
```

**Notas importantes:**

- Los números se actualizan cada vez que activas el modo.
- Los números respetan las reglas de exclusión (`aria-hidden`, `hidden`, etc.).
- Funciona en navegadores con soporte para Web Speech API.

## Preferencias y persistencia

El widget guarda las preferencias del usuario (tema, tamaño de texto, velocidad, etc.) en el almacenamiento local del navegador, por lo que las opciones suelen persistir entre sesiones.

También existe un botón `Restablecer Todo` para volver a las configuraciones por defecto.

## Accesibilidad y navegación por teclado

- El panel y todos sus controles son navegables por teclado (Tab / Shift+Tab, Enter para activar botones).
- Presionar `Esc` cierra el panel si está abierto.
- En modo lectura por secciones, las flechas del teclado permiten moverse entre secciones y activar lectura en cada una.

## Compatibilidad y notas sobre voces

- El widget usa la Web Speech API nativa: funciona en navegadores modernos (Chrome, Edge, Firefox y Safari), pero la disponibilidad de voces varía.
- En Windows la disponibilidad de voces en español depende de las voces instaladas en el sistema. En macOS/iOS suele haber varias voces en español por defecto.
- Si no hay voces en el idioma solicitado, el motor usará la voz por defecto del navegador o sistema, lo que puede cambiar la pronunciación.

### Recomendaciones

- Para la mejor experiencia en español en Windows, instala paquetes de voz en la configuración de voz del sistema operativo.
- Prueba `Leer Selección` con un párrafo corto para verificar qué voces están disponibles.

## Ejemplos rápidos

Incluir el widget (español por defecto):

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Mi sitio accesible</title>
  </head>
  <body>
    <h1>Bienvenido</h1>
    <p lang="es">Este es un ejemplo en español.</p>
    <p data-a11y-lang="en-US">This paragraph will be read in English.</p>

    <!-- Widget -->
    <link rel="stylesheet" href="accessibility-widget.css">
    <script src="accessibility-widget.js" data-lang="es-ES"></script>
  </body>
</html>
```

Excluir contenido técnico:

```html
<script aria-hidden="true">/* script interno que no debe leerse */</script>
<div hidden>Contenido oculto</div>
```

## Herramientas de Lectura

El widget incluye dos herramientas visuales para mejorar la experiencia de lectura:

### Regleta de Lectura

Activa una línea horizontal que sigue el movimiento del ratón, funcionando como guía visual durante la lectura. Esto ayuda a mantener el enfoque en una línea específica del texto y es especialmente útil para personas con dislexia o dificultades de seguimiento visual.

**Características:**
- Responsive: funciona en cualquier tamaño de pantalla
- Seguimiento de ratón: se posiciona según el cursor
- Compatible con todos los temas (cambia color según el tema activo)
- Se puede desactivar en cualquier momento

### Resalte de Hipervínculos

Destaca todos los hipervínculos de la página con un color brillante y contraste elevado, facilitando su identificación y navegación.

**Características:**
- Resalta automáticamente todos los enlaces excepto los del widget
- Efecto visual mejorado con hover animado
- Compatible con todos los temas (colores adaptativos)
- Incluye estilos para alto contraste
- Se puede activar/desactivar libremente

**Nota:** Ambas características se desactivan automáticamente al hacer clic en "Restablecer Todo".

## Resolución de problemas

- Si el botón del widget no aparece, confirma que `accessibility-widget.css` y `accessibility-widget.js` están en la ruta correcta y que el script se carga después del `DOM`.
- Si no se oyen voces en español, revisa la disponibilidad de voces en el navegador y en el sistema operativo.
- Para depurar, abre la consola del navegador y busca errores relacionados con `speechSynthesis` o la carga de los recursos.
- Si la regleta de lectura no se posiciona correctamente, asegúrate de que los elementos de la página no tienen `z-index` muy altos que la bloqueen.
- Si los enlaces resaltados no son visibles, intenta cambiar de tema para encontrar mejor contraste.

---