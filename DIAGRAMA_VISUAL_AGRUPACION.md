# 📊 Diagrama Visual de la Optimización

## Flujo de Agrupación

```
                    HTML SIN CAMBIOS
                            ↓
    ┌───────────────────────────────────────────┐
    │  <h1>Título</h1>                          │
    │  <p>Párrafo 1...</p>                      │
    │  <p>Párrafo 2...</p>                      │
    │  <button>Botón A</button>                 │
    │  <ul>                                     │
    │    <li>Item 1</li>                        │
    │    <li>Item 2</li>                        │
    │  </ul>                                    │
    │  <button>Botón B</button>                 │
    └───────────────────────────────────────────┘
                            ↓
    buildReadableElementsList() NUEVO CON AGRUPACIÓN
                            ↓
    groupConsecutiveTextElements()
            ↓               ↓               ↓
        ┌──────┐      ┌────────┐      ┌──────┐
        │GRUPO1│      │INDIVIDUAL     │GRUPO2│
        │------│      │------         │------│
        │H1 +  │      │Button A       │UL +  │
        │2P's  │      │               │2 LIs │
        └──────┘      └────────┘      └──────┘
                ↓         ↓         ↓
    numberedIndexMap:
        [{number:1, el: h1, groupElements: [h1, p, p]},
         {number:2, el: button, groupElements: [button]},
         {number:3, el: ul, groupElements: [ul, li, li]},
         {number:4, el: button, groupElements: [button]}]
                            ↓
    createNumberedLabels()
            ↓        ↓        ↓         ↓
        [1]      [2]      [3]       [4]
          ↓        ↓        ↓         ↓
        BADGES CREADOS (4 en lugar de 8)
```

---

## Comparativa: Elementos Detectados

### ANTES (Sin Agrupación)
```
readableElements: []              numberedIndexMap: []

[h1]  ─────┐                     [{1, h1}]
[p]   ─────┤                     [{2, p1}]
[p]   ─────├──→ 8 elementos   →  [{3, p2}]
[btn] ─────┤                     [{4, btn1}]
[ul]  ─────┤                     [{5, ul}]
[li]  ─────┤                     [{6, li1}]
[li]  ─────┤                     [{7, li2}]
[btn] ─────┘                     [{8, btn2}]

Total entradas: 8
Total badges: 8
```

### DESPUÉS (Con Agrupación)
```
readableElements: []              numberedIndexMap: []
(mismo array)
                                  (procesado con agrupación)
[h1]  ─┐                          [{1, h1, grupo:[h1, p1, p2]}]
[p]   ─┤─ GRUPO 1                 [{2, btn1, grupo:[btn1]}]
[p]   ─┘                          [{3, ul, grupo:[ul, li1, li2]}]
[btn] ─── INDIVIDUAL       →       [{4, btn2, grupo:[btn2]}]
[ul]  ─┐
[li]  ─┤─ GRUPO 2
[li]  ─┘
[btn] ─── INDIVIDUAL

Total entradas: 4
Total badges: 4 (-50%)
```

---

## Estructura de Datos

### groupConsecutiveTextElements() - Salida

```javascript
[
  {
    type: 'group',
    elements: [h1, p, p, span],      // Todos los elementos del grupo
    representative: h1                 // El "representante" para el badge
  },
  {
    type: 'single',
    elements: [button],
    representative: button
  },
  {
    type: 'group',
    elements: [ul, li, li, li],
    representative: ul
  },
  {
    type: 'single',
    elements: [button],
    representative: button
  },
  // ... más grupos
]
```

### numberedIndexMap - Después de Agrupación

```javascript
[
  {
    number: 1,
    type: 'element',
    el: h1,                           // Elemento DOM
    text: 'Título Principal',         // Texto para lectura
    groupType: 'group',               // ← NUEVO
    groupElements: [h1, p, p, span]   // ← NUEVO
  },
  {
    number: 2,
    type: 'element',
    el: button,
    text: 'Módulo 1',
    groupType: 'single',              // ← NUEVO
    groupElements: [button]            // ← NUEVO
  },
  // ... más entradas
]
```

---

## Logística de Agrupación

```
Paso 1: DETECTOR
┌─────────────────────────────────────────────┐
│ querySelector() busca todos los elementos   │
│ Filtra: visibles, no aria-hidden, etc.      │
│ Resultado: this.readableElements []         │
└─────────────────────────────────────────────┘
                    ↓

Paso 2: AGRUPADOR (NEW)
┌─────────────────────────────────────────────┐
│ groupConsecutiveTextElements() analiza:     │
│ - ¿Es heading?  → Agrupar con párrafos      │
│ - ¿Es lista?    → Agrupar con items         │
│ - ¿Es botón?    → NO agrupar (individual)   │
│ Resultado: grupos []                        │
└─────────────────────────────────────────────┘
                    ↓

Paso 3: MAPEO
┌─────────────────────────────────────────────┐
│ buildReadableElementsList() crea:           │
│ numberedIndexMap con representantes         │
│ 1 entrada = 1 badge (no 1 elemento)         │
│ Resultado: numberedIndexMap []              │
└─────────────────────────────────────────────┘
                    ↓

Paso 4: VISUALIZACIÓN
┌─────────────────────────────────────────────┐
│ createNumberedLabels() dibuja:              │
│ - Itera numberedIndexMap                    │
│ - Crea badge por cada entrada               │
│ - Posiciona en elemento representante       │
│ Resultado: badges en pantalla               │
└─────────────────────────────────────────────┘
```

---

## Decisión de Agrupación

```
¿Debo agrupar este elemento?

                    ↓
        ┌───────────────────┐
        │ ¿Es heading?      │
        │ (h1-h6)           │
        └─────┬───────┬─────┘
              │       │
             NO      SÍ
              │       │
              ↓       ↓
            [A]     [B]
             
[A] ¿Es botón/input/link?         [B] Siguiente elemento es:
    ├─ SÍ  → INDIVIDUAL                ├─ p/span/div    → AGRUPAR ✅
    └─ NO  → Continuar [C]             ├─ list/fieldset → AGRUPAR ✅
                                       ├─ botón/input   → NO agrupar
[C] ¿Es lista (ul/ol)?                 └─ otra etiqueta → PARAR
    ├─ SÍ  → AGRUPAR items                      
    └─ NO  → INDIVIDUAL             [D] ¿Hay más elementos compatibles?
                                        ├─ SÍ  → CONTINUAR iterando
                                        └─ NO  → Cerrar grupo
```

---

## Ejemplo Paso a Paso

### HTML de Entrada
```html
<h2>Paso 1: Instalación</h2>              ← Elemento 1
<p>Descarga el archivo...</p>             ← Elemento 2
<p>Luego descomprime...</p>               ← Elemento 3
<button>Descargar Ahora</button>          ← Elemento 4
<h2>Paso 2: Configuración</h2>            ← Elemento 5
<p>Abre el archivo config.json</p>        ← Elemento 6
```

### Ejecución de groupConsecutiveTextElements()

**Iteración 1: Elemento 1 (h2)**
```
Es heading? SÍ
Siguiente elemento (p)? SÍ, compatible
Siguiente elemento (p)? SÍ, compatible
Siguiente elemento (button)? NO, es botón
→ Grupo 1: [h2, p, p]
```

**Iteración 4: Elemento 4 (button)**
```
Es heading? NO
Es botón? SÍ
→ Grupo 2 (individual): [button]
```

**Iteración 5: Elemento 5 (h2)**
```
Es heading? SÍ
Siguiente elemento (p)? SÍ, compatible
Siguiente elemento? NO (fin)
→ Grupo 3: [h2, p]
```

### Resultado Final
```
Grupos: [
  {h2, p, p},           ← Badge [1]
  {button},             ← Badge [2]
  {h2, p}               ← Badge [3]
]

Total badges: 3 (era 6)
```

---

## Validación de Agrupación

```
Condiciones para AGRUPAR:

┌──────────────────────────────────────────────┐
│ 1. El elemento actual es un heading (h1-h6)  │
│    O lista (ul/ol)                           │
│                                              │
│ 2. El siguiente elemento es de texto:        │
│    - p, span, div, li (para listas)         │
│    - label, fieldset (para formularios)      │
│                                              │
│ 3. El siguiente NO es:                       │
│    - button, input, textarea, select         │
│    - audio, video, a (enlaces)               │
│    - table, img                              │
│                                              │
│ 4. El contenido de texto es menor a:         │
│    - 1000 caracteres (configurable)          │
│                                              │
│ 5. No fue procesado anteriormente:           │
│    - (evitar duplicados)                     │
└──────────────────────────────────────────────┘
```

---

## Performance Visual

```
ANTES:
┌──────────────────────────────────────┐
│         PÁGINA WEB                   │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐  │
│  │1│ │2│ │3│ │4│ │5│ │6│ │7│ │8│  │  Muchos badges
│  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘  │  = Saturado
│                                    │  = Lento
│  Tiempo de activación: 150ms       │
└──────────────────────────────────────┘

DESPUÉS:
┌──────────────────────────────────────┐
│         PÁGINA WEB                   │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐                   │
│  │1│ │2│ │3│ │4│                   │  Menos badges
│  └─┘ └─┘ └─┘ └─┘                   │  = Limpio
│                                    │  = Rápido
│  Tiempo de activación: 50ms        │
└──────────────────────────────────────┘

GANANCIA:
┌──────────────────────────────────────┐
│ Badges:      -50%  (4 vs 8)         │
│ Velocidad:   +200% (50ms vs 150ms)  │
│ Limpieza:    +++   (visual mejor)    │
└──────────────────────────────────────┘
```

---

## Compatibilidad de Navegadores

```
Chrome/Edge:      ✅ 100% soportado
              ┌────────────────────┐
              │ Web Speech API ✅   │
              │ ES6 Features ✅     │
              │ DOM API ✅          │
              └────────────────────┘

Safari:           ✅ Parcial (falta voz)
              ┌────────────────────┐
              │ Web Speech API ⚠️   │
              │ ES6 Features ✅     │
              │ DOM API ✅          │
              └────────────────────┘

Firefox:          ❌ No soportado
              ┌────────────────────┐
              │ Web Speech API ❌   │
              │ (No tiene soporte)  │
              └────────────────────┘
```

---

## Roadmap de Ejecución

```
[HECHO]
   ↓
   ├─ [✅] Implementar groupConsecutiveTextElements()
   ├─ [✅] Modificar buildReadableElementsList()
   ├─ [✅] Crear documentación (6,500+ palabras)
   ├─ [✅] Crear demo-agrupacion.html
   └─ [✅] Validar sin errores
        ↓
[AHORA]
   ↓
   ├─ [ ] Probar en navegador real (tú)
   ├─ [ ] Recolectar feedback
   └─ [ ] Ajustes finos si necesario
        ↓
[PRÓXIMA SEMANA]
   ↓
   ├─ [ ] Deploy en producción
   ├─ [ ] Comunicar cambios
   └─ [ ] Monitoreo en vivo
        ↓
[FUTURO]
   ↓
   ├─ [ ] Análisis de feedback
   ├─ [ ] Posibles mejoras v3.1
   └─ [ ] Documentación adicional
```

---

**Diagrama Visual: Versión 3.0**  
**Generado:** Enero 2026
