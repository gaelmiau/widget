# 🚀 Guía de Integración - Accessibility Widget v2.0

## ¡Empieza Aquí!

Esta es la forma **más simple** de integrar el widget mejorado en cualquier HTML.

---

## ⚡ Instalación Rápida (30 segundos)

### Paso 1: Copiar Archivos

```bash
# Copia estos dos archivos a tu proyecto
widget/
├── accessibility-widget.js
└── accessibility-widget.css
```

### Paso 2: Agregar a tu HTML

```html
<!DOCTYPE html>
<html lang="es-ES">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Página</title>
    
    <!-- 1. Cargar CSS del widget -->
    <link rel="stylesheet" href="path/to/accessibility-widget.css">
</head>
<body>
    <!-- Tu contenido aquí -->
    <h1>Bienvenido</h1>
    <p>Este es tu contenido...</p>
    
    <!-- 2. Cargar JS del widget (al final del body) -->
    <script src="path/to/accessibility-widget.js"></script>
</body>
</html>
```

### ¡Listo! 🎉

El widget ya está funcionando. No hay nada más que hacer.

---

## 📍 Ubicación de Archivos - Ejemplos

### Opción 1: En la Raíz del Proyecto
```
proyecto/
├── index.html
├── accessibility-widget.js
├── accessibility-widget.css
└── styles.css
```

```html
<link rel="stylesheet" href="accessibility-widget.css">
<script src="accessibility-widget.js"></script>
```

### Opción 2: En Carpeta Específica
```
proyecto/
├── index.html
├── lib/
│   ├── accessibility-widget.js
│   └── accessibility-widget.css
└── styles/
    └── main.css
```

```html
<link rel="stylesheet" href="lib/accessibility-widget.css">
<script src="lib/accessibility-widget.js"></script>
```

### Opción 3: Con CDN (Futuro)
```html
<!-- Próximamente disponible -->
<link rel="stylesheet" href="https://cdn.example.com/accessibility-widget.css">
<script src="https://cdn.example.com/accessibility-widget.js"></script>
```

---

## 🎨 Configuración Básica

### Configurar Idioma Global

```html
<!-- Opción A: Atributo data -->
<script src="accessibility-widget.js" data-lang="es-ES"></script>

<!-- Opción B: Variable global -->
<script>
    window.A11Y_WIDGET_CONFIG = {
        lang: 'es-ES'  // es-ES, en-US
    };
</script>
<script src="accessibility-widget.js"></script>

<!-- Opción C: En HTML -->
<html lang="es-ES">
    <!-- El widget detecta automáticamente -->
</html>
```

### Configurar por Elemento

```html
<!-- Específicar idioma para un elemento -->
<div data-a11y-lang="en-US">
    <p>This content is in English</p>
</div>

<div lang="fr-FR">
    <p>Ce contenu est en français</p>
</div>
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Blog Estático

```html
<!DOCTYPE html>
<html lang="es-ES">
<head>
    <title>Mi Blog</title>
    <link rel="stylesheet" href="accessibility-widget.css">
</head>
<body>
    <header>
        <h1>Mi Blog Personal</h1>
        <nav>
            <a href="/">Inicio</a>
            <a href="/posts">Posts</a>
            <a href="/about">Acerca de</a>
        </nav>
    </header>
    
    <main>
        <article>
            <h2>Artículo 1</h2>
            <p>Contenido del artículo...</p>
        </article>
    </main>
    
    <!-- El widget se carga automáticamente y numera todo -->
    <script src="accessibility-widget.js"></script>
</body>
</html>
```

**Resultado:** Badges en títulos, párrafos y enlaces. ✅

---

### Caso 2: Formulario

```html
<form id="contact-form">
    <div class="form-group">
        <label for="name">Nombre:</label>
        <input type="text" id="name" required>
    </div>
    
    <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" required>
    </div>
    
    <div class="form-group">
        <label for="country">País:</label>
        <select id="country">
            <option>Seleccionar...</option>
            <option>España</option>
            <option>México</option>
            <option>Argentina</option>
        </select>
    </div>
    
    <button type="submit">Enviar</button>
</form>

<script src="accessibility-widget.js"></script>
```

**Resultado:** 
- Inputs numerados
- Select numerado
- Botón numerado
- Puedes decir números para rellenar ✅

---

### Caso 3: Evaluación/Quiz

```html
<div class="quiz">
    <h2>Evaluación</h2>
    
    <div class="question">
        <p class="question-text">¿Cuál es la respuesta?</p>
        <label>
            <input type="radio" name="q1"> Opción A
        </label>
        <label>
            <input type="radio" name="q1"> Opción B
        </label>
        <label>
            <input type="radio" name="q1"> Opción C
        </label>
    </div>
    
    <button id="submit-quiz">Enviar Evaluación</button>
</div>

<script src="accessibility-widget.js"></script>
```

**Resultado:** Preguntas y opciones numeradas. Puedes decir números para responder. ✅

---

### Caso 4: Página Dinámica (React/Vue/Angular)

```jsx
// React Example
import AccessibilityWidget from './AccessibilityWidget';

function App() {
    return (
        <div>
            <h1>Mi App</h1>
            <p>Contenido dinámico</p>
            
            {/* El widget se actualiza automáticamente cuando el DOM cambia */}
            <AccessibilityWidget lang="es-ES" />
        </div>
    );
}
```

O simplemente en `index.html`:

```html
<!-- index.html -->
<body>
    <div id="root"></div>
    
    <!-- Widget se carga antes de tu app -->
    <script src="accessibility-widget.js" data-lang="es-ES"></script>
    <script src="app.js"></script> <!-- Tu app de React/Vue -->
</body>
```

**Nota:** El widget detecta cambios en el DOM automáticamente. ✅

---

## 🎙️ Activar Comandos de Voz Programáticamente

### Iniciar Automáticamente

```javascript
// Esperar a que el widget esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Acceder al widget
    if (window.accessibilityWidget) {
        // Activar comandos de voz automáticamente
        window.accessibilityWidget.toggleNumberedVoiceMode();
    }
});
```

### Crear Botón Personalizado

```html
<button id="custom-voice-btn">
    Activar Comandos por Voz
</button>

<script>
    document.getElementById('custom-voice-btn').addEventListener('click', function() {
        if (window.accessibilityWidget) {
            window.accessibilityWidget.toggleNumberedVoiceMode();
        }
    });
    
    // Cargar widget
    document.addEventListener('DOMContentLoaded', function() {
        const script = document.createElement('script');
        script.src = 'accessibility-widget.js';
        document.body.appendChild(script);
    });
</script>
```

---

## 🚫 Excluir Elementos

### Opción 1: Atributo data

```html
<!-- Este elemento NO será numerado ni leído -->
<div data-a11y-read="false">
    Este contenido será ignorado
</div>
```

### Opción 2: aria-hidden

```html
<!-- ARIA estándar para ocultar del lector de pantalla -->
<div aria-hidden="true">
    Este contenido será ignorado
</div>
```

### Opción 3: Clase CSS

```html
<!-- Si necesitas control personalizado -->
<div style="display: none;">
    Elemento invisible = automáticamente ignorado
</div>
```

---

## 🌍 Soporte Multiidioma

### Idiomas Disponibles

```javascript
// Español (recomendado)
window.A11Y_WIDGET_CONFIG = { lang: 'es-ES' };

// English
window.A11Y_WIDGET_CONFIG = { lang: 'en-US' };

// Auto-detectar del navegador (futuro)
window.A11Y_WIDGET_CONFIG = { lang: 'auto' };
```

### Mezclar Idiomas en Misma Página

```html
<div data-a11y-lang="es-ES">
    <h1>En español</h1>
    <p>Este contenido se lee en español</p>
</div>

<div data-a11y-lang="en-US">
    <h1>In English</h1>
    <p>This content is read in English</p>
</div>
```

---

## ✅ Validación y Testing

### Checklist Rápido

- [ ] Archivos CSS y JS cargados correctamente
- [ ] Widget aparece en esquina inferior derecha
- [ ] Botón del widget es clickeable
- [ ] Panel se abre/cierra
- [ ] Puedes activar comandos de voz
- [ ] Los badges aparecen al activar voz
- [ ] Puedes decir números
- [ ] Los comandos funcionan

### Testing en Navegador

```javascript
// Abre la consola (F12) y verifica:

// 1. ¿Widget existe?
console.log(window.accessibilityWidget); // Debe mostrar objeto

// 2. ¿Modo de voz funciona?
window.accessibilityWidget.toggleNumberedVoiceMode();
// Debe activar y mostrar badges

// 3. ¿Elementos detectados?
console.log(window.accessibilityWidget.readableElements);
// Debe mostrar array de elementos

// 4. ¿Mapeo de números?
console.log(window.accessibilityWidget.numberedIndexMap);
// Debe mostrar array de elementos numerados
```

---

## 🐛 Resolución de Problemas

### Widget no aparece

```javascript
// Verificar en consola:
console.log(document.getElementById('accessibility-widget'));
// Si devuelve null, el script no se cargó correctamente

// Soluciones:
// 1. Verifica la ruta del archivo
// 2. Asegúrate de que está en <body>, no en <head>
// 3. Intenta recargar la página
```

### CSS no se aplica

```html
<!-- Asegúrate de que el CSS está ANTES del JS -->
<head>
    <link rel="stylesheet" href="accessibility-widget.css">
</head>
<body>
    ...
    <script src="accessibility-widget.js"></script>
</body>
```

### Comandos de voz no funcionan

```javascript
// 1. Verifica permisos de micrófono
// Deberías ver un aviso del navegador

// 2. Verifica que es HTTPS (requerido en algunos navegadores)
// http:// puede no funcionar

// 3. Intenta en Chrome (mejor soporte)

// 4. Verifica idioma en consola:
console.log(window.accessibilityWidget.defaultLang);
```

---

## 🎯 Mejores Prácticas

### ✅ Haz Esto

1. **Carga el widget al final del body**
   ```html
   <body>
       <!-- Contenido -->
       <script src="accessibility-widget.js"></script>
   </body>
   ```

2. **Usa semántica HTML correcta**
   ```html
   <button>Clic aquí</button>  <!-- ✅ Mejor -->
   <div onclick="...">Clic aquí</div>  <!-- ❌ Evitar -->
   ```

3. **Proporciona labels para inputs**
   ```html
   <label for="name">Nombre:</label>
   <input id="name" type="text">
   ```

4. **Usa alt text para imágenes**
   ```html
   <img src="photo.jpg" alt="Descripción clara">
   ```

### ❌ Evita Esto

1. **No ocultes contenido importantes**
   ```html
   <!-- ❌ Malo -->
   <div style="display: none;">Contenido importante</div>
   ```

2. **No uses onclick en divs**
   ```html
   <!-- ❌ Malo -->
   <div onclick="doSomething()">Click me</div>
   
   <!-- ✅ Mejor -->
   <button onclick="doSomething()">Click me</button>
   ```

3. **No mezcles lenguajes sin especificar**
   ```html
   <!-- ❌ Malo (confuso para widget) -->
   <p>English text con español mezclado</p>
   
   <!-- ✅ Mejor -->
   <p lang="en">English text</p>
   <p lang="es">Texto en español</p>
   ```

---

## 📊 Ejemplos Completos

### Ejemplo 1: Página Estática Simple

**Archivo: index.html**
```html
<!DOCTYPE html>
<html lang="es-ES">
<head>
    <meta charset="UTF-8">
    <title>Mi Página Accesible</title>
    <link rel="stylesheet" href="accessibility-widget.css">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Bienvenido</h1>
    <p>Esta página es totalmente accesible con comandos de voz.</p>
    
    <button onclick="alert('¡Hola!')">Saludar</button>
    <a href="https://example.com">Ir a ejemplo</a>
    
    <script src="accessibility-widget.js"></script>
</body>
</html>
```

**Para usar:**
1. Abre `index.html`
2. Abre el panel del widget
3. Haz clic en "Activar Comandos por Voz"
4. Verás badges (números) junto a los elementos
5. ¡Comienza diciendo números!

---

### Ejemplo 2: Aplicación de Formulario

**Archivo: form.html**
```html
<!DOCTYPE html>
<html lang="es-ES">
<head>
    <meta charset="UTF-8">
    <title>Formulario Accesible</title>
    <link rel="stylesheet" href="accessibility-widget.css">
</head>
<body>
    <h1>Formulario de Registro</h1>
    
    <form id="signup">
        <div>
            <label for="name">Nombre Completo:</label>
            <input type="text" id="name" required>
        </div>
        
        <div>
            <label for="email">Correo Electrónico:</label>
            <input type="email" id="email" required>
        </div>
        
        <div>
            <label for="country">País:</label>
            <select id="country" required>
                <option>Seleccionar país</option>
                <option>España</option>
                <option>México</option>
                <option>Argentina</option>
                <option>Colombia</option>
            </select>
        </div>
        
        <button type="submit">Registrarse</button>
    </form>
    
    <script src="accessibility-widget.js"></script>
</body>
</html>
```

**Uso con voz:**
1. Activa comandos de voz
2. Di "1" → Entra en campo Nombre
3. Escribe tu nombre
4. Di "2" → Entra en campo Email
5. Escribe tu email
6. Di "3" → Abre selector de País
7. Usa flechas para navegar
8. Di "4" → Hace clic en Registrarse

---

## 🚀 Siguiente Paso

1. ✅ **Descarga los archivos** del widget
2. ✅ **Copia a tu proyecto**
3. ✅ **Agrega 2 líneas de código** (CSS + JS)
4. ✅ **¡Listo!** Ya está funcionando

---

## 📞 Soporte

Para preguntas o problemas:

1. Revisa **COMANDOS_VOZ_GUIA.md** para usuario
2. Revisa **MEJORAS_COMANDOS_VOZ.md** para técnico
3. Abre la consola (F12) para ver errores
4. Verifica que el navegador soporte Web Speech API

---

## 📚 Recursos Relacionados

- 📖 COMANDOS_VOZ_GUIA.md - Guía de usuario
- 📋 MEJORAS_COMANDOS_VOZ.md - Cambios técnicos
- 🔄 COMPARACION_CARPETA_VS_WIDGET.md - Análisis comparativo

---

**¡Felicidades!** Tu sitio web ahora es completamente accesible con comandos de voz. 🎉

**Última actualización:** Enero 2026  
**Versión:** 2.0
