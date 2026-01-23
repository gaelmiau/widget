# Guía de Comandos de Voz por Números

## Resumen

El widget ahora incluye una función avanzada de **Comandos de Voz por Números** que te permite interactuar con la página mediante reconocimiento de voz. Los elementos se enumeran automáticamente y puedes controlarlos diciéndolos los números en voz alta.

## Cómo Funciona

### 1. Activación del Modo

1. Abre el panel del widget (haz clic en el botón azul 🔔 en la esquina inferior derecha).
2. Desplázate hasta la sección **"Comandos por Voz"**.
3. Haz clic en **"Activar Comandos por Voz"**.

Verás que el botón cambia a **"Desactivar Comandos por Voz"** y pequeños números (badges) rojo/verde aparecen al lado de cada elemento.

### 2. Numeración de Elementos

- **Número 0**: El botón del widget (para abrir/cerrar el panel).
- **Números 1+**: Todos los elementos legibles e interactivos en la página (párrafos, títulos, botones, enlaces, etc.).

Los números se asignan en orden DOM, de arriba hacia abajo.

### 3. Comandos por Voz

#### Comandos de Números

Simplemente **di el número** en voz alta:

- **"Cero"** o **"0"**: Abre o cierra el panel del widget.
- **"Uno"** o **"1"**: Ejecuta la acción del elemento número 1.
- **"Dos"** o **"2"**: Ejecuta la acción del elemento número 2.
- Y así sucesivamente...

También puedes decir números en palabras:
- "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"
- "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"

#### Comportamiento por Tipo de Elemento

El widget automáticamente detecta qué tipo de elemento es y realiza la acción apropiada:

**Elementos de Lectura:**
- **Párrafos, Títulos, Encabezados (h1-h6)**: Se **leen en voz alta** (TTS) sin incluir el número del badge.
- **Imágenes**: Se **leen sus atributos alt**.
- **Tablas**: Se **leen estructuradamente** (filas y celdas).
- **Preguntas/Cuestionarios**: Se **leen con opciones** (si aplica).

**Elementos Interactivos Simples:**
- **Botones**: Se **hacen clic/activan** automáticamente con feedback de voz.
- **Enlaces**: Se **abren** automáticamente con feedback de voz.

**Elementos con Entrada de Datos:**
- **Inputs de Texto**: Se **enfocan** y entran en **modo edición** (puedes escribir directamente).
  - Presiona **Escape** para salir del modo edición.
  - Se lee el label, placeholder y valor actual.
  
- **Textareas**: Se **enfocan** y entran en **modo edición** (puedes escribir directamente).
  - Presiona **Escape** para salir del modo edición.

**Listas Desplegables (Selects):**
- **Abre la lista** en modo de navegación especial.
- Usa **Flecha Arriba/Abajo** para navegar opciones.
- Presiona **Enter** para seleccionar la opción actual.
- Presiona **Escape** para cancelar sin cambiar.
- Se lee automáticamente cada opción mientras navegas.

**Elementos Multimedia:**
- **Audio**: Se **reproduce/pausa** con feedback ("Reproduciendo" o "Pausado").
- **Video**: Se **reproduce/pausa** con feedback ("Reproduciendo" o "Pausado").
- Se leen atributos como duración y estado actual.

**Carruseles/Swipers:**
- Se **entra en modo de navegación** especial.
- Usa **Flecha Izquierda/Derecha** para navegar slides.
- Presiona **Enter** para interactuar con elementos dentro del slide actual.
- Presiona **Escape** para salir del modo slider.

**Fieldsets (Grupos de Formulario):**
- Se **leen completamente** con su leyenda.

#### Comandos Especiales

- **"Desactivar"**: Desactiva el modo de comandos por voz.
- **"Salir"**: Lo mismo que "desactivar".

## Flujo Completo de Ejemplo

### Caso 1: Llenar un Formulario

1. Di **"3"** → El widget detecta que es un `<input type="text">` con label "Nombre".
2. Entras en **modo edición** automáticamente (el input se resalta en rojo).
3. **Escribe tu nombre** usando el teclado.
4. Presiona **Escape** para salir del modo edición.
5. Se lee un resumen de lo que escribiste.
6. Di **"4"** → Si es un `<select>`, se abre el dropdown en modo navegación.
7. Usa **Flecha Arriba/Abajo** para navegar opciones (se leen automáticamente).
8. Presiona **Enter** para seleccionar.
9. Presiona **Escape** si quieres cancelar.

### Caso 2: Reproducir un Video

1. Di **"7"** → El widget detecta que es un `<video>`.
2. El video **comienza a reproducirse** automáticamente.
3. Se te informa: "Video: [Título]. Reproduciendo."
4. Para pausar, simplemente di **"7"** nuevamente.

### Caso 3: Navegar un Carrusel

1. Di **"12"** → El widget detecta que es un `.swiper` (carrusel).
2. Entras en **modo slider**.
3. Usa **Flecha Izquierda** o **Flecha Derecha** para navegar diapositivas.
4. Se **lee automáticamente** el contenido de cada slide (título, descripción, etc.).
5. Si hay un botón en el slide, presiona **Enter** para interactuar.
6. Presiona **Escape** para salir del modo slider.

## Coherencia con Otras Funciones

Los **Comandos de Voz por Números** ahora detectan y numeran **exactamente los mismos elementos** que:
- ✅ **"Lectura por Secciones"** (navegación con flechas)
- ✅ **"Leer Página"** (lectura automática)

Esto significa:
- Consistencia total: todos los modos leen/interactúan de la misma forma inteligente.
- Diferencia solamente en **cómo navegas**: números de voz vs. flechas vs. automático.

### 4. Desactivación del Modo

Tienes 3 opciones:

1. **Por voz**: Di **"desactivar"** o **"salir"**.
2. **Por botón**: Haz clic en **"Desactivar Comandos por Voz"** en el panel.
3. **Por Restablecer**: Usa el botón **"Restablecer Todo"** (esto también restablece todas las preferencias).

Los números desaparecerán cuando desactives el modo.

## Ejemplos Prácticos

### Ejemplo 1: Leer un Párrafo

1. Activa "Comandos por Voz".
2. Ves un número "3" al lado de un párrafo.
3. Di **"tres"**.
4. El widget lee el párrafo en voz alta.

### Ejemplo 2: Activar un Botón

1. Activa "Comandos por Voz".
2. Ves un número "5" al lado de un botón.
3. Di **"cinco"**.
4. El botón se activa automáticamente (como si hubieras hecho clic).

### Ejemplo 3: Abrir/Cerrar el Panel

1. El widget está cerrado.
2. Di **"cero"**.
3. El panel se abre.
4. Di **"cero"** nuevamente.
5. El panel se cierra.

## Reglas y Limitaciones

### Qué se Enumera

Solo se enumeran elementos:
- **Visibles** (no ocultos con `display: none`, `visibility: hidden`, etc.).
- **No marcados con `aria-hidden="true"`** o atributo `hidden`.
- **No dentro del widget** mismo.
- **Semánticamente relevantes** (párrafos, títulos, botones, enlaces, etc.).

### Qué NO se Enumera

- Scripts, estilos, comentarios.
- Elementos dentro de `<script>` o `<style>`.
- Elementos con `aria-hidden="true"`.
- Elementos con atributo `hidden`.
- Cualquier cosa dentro del widget de accesibilidad.

### Compatibilidad

- **Navegadores Soportados**: Chrome, Edge, Firefox, Safari (versiones recientes).
- **Requisito**: El navegador debe soportar Web Speech API Recognition.
- **Idioma**: El reconocimiento funciona en el idioma configurado del widget (por defecto: español).

### Precisión del Reconocimiento

La precisión depende de:
- La **calidad del micrófono**.
- El **ruido ambiental**.
- La **claridad del acento** del usuario.
- El **idioma** del navegador y del sistema operativo.

Consejos para mejor reconocimiento:
- Habla claramente.
- Usa un micrófono de buena calidad.
- Reduce el ruido de fondo.
- Asegúrate de estar en el idioma correcto (español para las palabras en español).

## Integración en Tu HTML

Los "Comandos por Voz por Números" funcionan automáticamente con cualquier contenido HTML. No necesitas marcar nada especial.

Si quieres **excluir** un elemento de la enumeración:

```html
<!-- Opción 1: aria-hidden -->
<div aria-hidden="true">
  No se enumerará
</div>

<!-- Opción 2: hidden -->
<div hidden>
  No se enumerará
</div>

<!-- Opción 3: data-a11y-read="false" -->
<p data-a11y-read="false">
  No se enumerará
</p>
```

## Solución de Problemas

### "No funciona el reconocimiento de voz"

- Verifica que tu navegador soporta Web Speech API.
- Comprueba que has dado permiso de micrófono al navegador.
- Prueba con Chrome o Edge (mejor soporte).

### "Los números no aparecen"

- Asegúrate de que el modo esté realmente activado (el botón debe decir "Desactivar").
- Recarga la página y prueba nuevamente.
- Verifica que los elementos no tengan `aria-hidden="true"` o `hidden`.

### "Lee elementos que no quiero"

- Marca esos elementos con `aria-hidden="true"` o `hidden`.
- O agrega `data-a11y-read="false"`.

### "El reconocimiento lee mal mi voz"

- Habla más claramente.
- Usa un micrófono de mejor calidad.
- Reduce el ruido ambiental.
- Comprueba que el idioma del navegador sea el correcto.

## Casos de Uso

- **Navegación sin manos**: Personas con discapacidades motrices.
- **Mayor accesibilidad**: Personas con baja visión.
- **Manos ocupadas**: Situaciones donde no puedes usar las manos.
- **Aprendizaje**: Mejorar la comprensión mediante lectura en voz alta.

## Notas Técnicas

El sistema:
1. Enumera elementos con `querySelectorAll()` basado en selectores CSS.
2. Filtra elementos por visibilidad y atributos ARIA.
3. Crea badges con `data-a11y-index` para rastrear números.
4. Usa `SpeechRecognition` API para capturar voz.
5. Ejecuta la acción apropiada según el tipo de elemento.

---

¿Preguntas? Consulta el [README.md](README.md) principal o el código fuente de `accessibility-widget.js`.
