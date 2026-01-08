# Nueva Funcionalidad: Interacción con Botones en Lectura por Secciones

## ¿Qué es lo nuevo?

Se ha agregado la capacidad de **interactuar con botones y enlaces durante la lectura por secciones** (navegación con flechas). Ahora puedes:

1. **Navegar** con las flechas arriba/abajo entre elementos
2. **Activar botones** presionando **Enter** cuando estés en uno
3. **Abrir modales/diálogos** que se abrirán automáticamente
4. **Leer automáticamente** el contenido que se abrió en el modal

## Cómo Funciona

### Paso 1: Activar Lectura por Secciones
```
1. Abre el panel del widget (botón azul)
2. Busca "Lectura por Secciones"
3. Haz clic en "Iniciar Lectura por Secciones"
```

### Paso 2: Navegar con las Flechas
```
- Flecha Arriba / Flecha Izquierda → Elemento anterior
- Flecha Abajo / Flecha Derecha → Elemento siguiente
```

El widget lee automáticamente cada elemento cuando lo seleccionas.

### Paso 3: Interactuar con Botones
Cuando navegues a un botón o enlace:
- El widget te dirá: **"Botón: [Nombre del botón]. Presiona Enter para activar."**
- Presiona **Enter** para activar ese botón

### Paso 4: Leer Contenido que se Abre
Si el botón abre un modal o diálogo:
- El modal se abrirá automáticamente
- El widget leerá automáticamente el contenido del modal (título + contenido)
- Podrás continuar navegando dentro del modal si es necesario

## Ejemplos Prácticos

### Ejemplo 1: Abrir un Modal
```html
<!-- Navegas hasta este botón -->
<button onclick="document.getElementById('myModal').style.display='block'">
  Ver Más Información
</button>

<!-- Esto es lo que pasará:
1. Te dirá: "Botón: Ver Más Información. Presiona Enter para activar."
2. Presionas Enter
3. Se abre el modal
4. Te lee automáticamente el contenido del modal
-->
```

### Ejemplo 2: Abrir un Diálogo
```html
<button onclick="abrirDialogo()">
  Términos y Condiciones
</button>

<!-- El widget detectará automáticamente:
- [role="dialog"]
- <dialog open>
- .modal
- .overlay
- Y leerá el contenido que se abrió
-->
```

### Ejemplo 3: Expandir Contenido Oculto
```html
<button onclick="expandirSeccion()">
  Más Detalles
</button>

<!-- Si el botón expande un div oculto:
1. El widget presiona el botón automáticamente
2. Detecta el elemento que se hizo visible
3. Te lo lee
-->
```

## Selectores de Modal Detectados

El widget detecta automáticamente estos elementos como "modales":

- `[role="dialog"]` - Diálogos semánticos
- `[role="alertdialog"]` - Diálogos de alerta
- `<dialog open>` - HTML5 dialog abierto
- `.modal` - Clases comunes
- `.modal-content`
- `.overlay`
- `.popup`
- `.drawer`
- `[data-modal]` - Elementos con atributo data-modal

## Cómo Leer la Sección o Página Completa

### Para Leer una Sección Específica
```
1. Navega hasta la sección con flechas
2. Se leerá automáticamente cada elemento
3. Si hay un botón que abre más contenido, presiona Enter
```

### Para Leer la Página Completa
```
1. En el panel, busca "Lector de Texto a Voz"
2. Haz clic en "Leer Página"
3. El widget leerá todo secuencialmente
4. Si encuentras un botón que quieras activar durante la lectura, 
   activa primero "Lectura por Secciones" para mayor control
```

## Mejoras Incluidas

✅ **Detección Automática de Modales**
- Detecta 10+ selectores de modal diferentes
- Verifica visibilidad antes de leer

✅ **Lectura Inteligente de Contenido**
- Busca títulos en el modal
- Lee el contenido completo
- Preserva el idioma configurado

✅ **Integración Fluida**
- No interrumpe el flujo de lectura
- Reconstruye la lista de elementos después de abrir modal
- Permite continuar navegando

✅ **Compatibilidad**
- Funciona con cualquier estructura HTML de modal
- Compatible con librerías populares (Bootstrap, Material Design, etc.)

## Casos de Uso

### Caso 1: Formulario con Validación
```
1. Navegas a "Enviar"
2. Presionas Enter
3. Se abre modal de error
4. Widget lee el mensaje de error automáticamente
5. Puedes continuar para corregir los campos
```

### Caso 2: Galería de Imágenes
```
1. Navegas a una imagen
2. Presionas Enter
3. Se abre lightbox/modal
4. Widget lee la descripción de la imagen
```

### Caso 3: Menú Desplegable
```
1. Navegas a "Opciones"
2. Presionas Enter
3. Se expande el menú
4. Widget lee todas las opciones disponibles
```

## Notas Técnicas

- **Timeout de Espera**: 300ms para permitir que el modal se renderice
- **Detección de Visibilidad**: Verifica `offsetHeight`, `offsetParent` y `display`
- **Manejo de Idiomas**: Preserva el idioma de cada elemento
- **Exclusión de Contenido**: Respeta `aria-hidden` y `hidden`

## Solución de Problemas

### El modal no se abre o no se lee
- Asegúrate de que el modal tiene uno de los selectores mencionados
- Verifica que el modal no esté oculto con `display: none`
- Intenta aumentar el timeout si el modal tarda en renderizar

### El contenido del modal se lee incompleto
- Usa `aria-label` para complementar información importante
- Asegúrate de que todo el contenido sea accesible en el DOM

### Se lee contenido duplicado
- Usa `aria-hidden="true"` en elementos que no quieras que se lean

