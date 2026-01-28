(function () {
    'use strict';

    /**
     * AccessibilityWidget
     * - Integrable en cualquier HTML.
     * - Configuración de idioma: pasar `data-lang` en la etiqueta <script> o definir
     *   `window.A11Y_WIDGET_CONFIG = { lang: 'en-US' }` antes de cargar el script.
     * - Por elemento: usar `data-a11y-lang="en-US"` o atributo `lang` en el elemento.
     *
     * Nota: el widget intenta detectar voces en el navegador; la disponibilidad depende del SO/navegador.
     */
    class AccessibilityWidget {
        constructor() {
            // ========== Estado del Widget ==========
            this.isOpen = false;
            this.isSpeaking = false;
            this.sectionReadingMode = false; // Controla si el nav con flechas está activo
            this.numberedVoiceMode = false; // Modo de comandos por voz con números
            this.readingRulerActive = false; // Regleta de lectura
            this.highlightLinksActive = false; // Resalto de hipervínculos
            this.inputEditMode = false; // Modo de edición en inputs
            this.selectOpenMode = false; // Modo de navegación en select abierto
            this.currentSelectElement = null; // Elemento select actualmente abierto
            this.currentOptionIndex = -1; // Índice de la opción actualmente resaltada
            this.sliderOpenMode = false; // Modo de navegación en slider abierto
            this.currentSliderElement = null; // Elemento slider actualmente navegado

            // ========== Gestión de Modales y Menú ==========
            this.savedVirtualFocusIndex = -1; // Guardar índice antes de abrir modal
            this.isModalOpen = false; // Flag para saber si hay modal abierto
            this.modalCheckInterval = null; // Intervalo para detectar cierre de modal
            this.savedParentIndexMap = null; // Guardar mapeo del padre cuando abre modal/menú
            this.currentModalIndexMap = null; // Mapeo actual de elementos del modal/menú

            // ========== Preferencias ==========
            this.currentTheme = 'default';
            this.currentFontSize = 'medium';
            this.currentCursorSize = 'default';
            this.currentReadingRate = 1;
            this.dyslexiaMode = false;

            // ========== TTS (Text-to-Speech) ==========
            this.speechSynthesis = window.speechSynthesis;
            this.currentUtterance = null;

            // ========== Lectura y Navegación ==========
            this.originalFontSize = null;
            this.virtualFocusIndex = -1;
            this.readableElements = [];
            this.flowReadingActive = false;

            // ========== Elementos Visuales ==========
            this.highlightEl = null;
            this.readingLineElement = null;

            // ========== Regleta de Lectura ==========
            this.readingRulerListener = null; // Guardar referencia al listener

            // ========== Foco y Trap ==========
            this.focusTrapHandler = null;
            this.previouslyFocusedEl = null;

            // ========== Idioma ==========
            this.defaultLang = 'es-ES';

            lucide.createIcons();

            this.init();
        }

        // Mostrar badges temporales para las opciones de un select (cuando se activa por voz)
        showSelectOptionBadges(selectEl) {
            if (!selectEl) return;
            // limpiar previas
            this.removeTempSelectBadges();
            this.tempSelectBadges = [];
            // encontrar las entradas correspondientes
            const options = (this.numberedIndexMap || []).filter(e => e.type === 'select-option' && e.parentSelect === selectEl);
            if (!options || !options.length) return;
            const pr = selectEl.getBoundingClientRect();
            options.forEach((optEntry, i) => {
                try {
                    const badge = document.createElement('div');
                    badge.className = 'a11y-number-badge a11y-temp-option-badge';
                    badge.textContent = optEntry.number;
                    badge.setAttribute('data-a11y-number', optEntry.number);
                    badge.setAttribute('aria-hidden', 'true');
                    Object.assign(badge.style, {
                        position: 'absolute',
                        top: `${pr.bottom + window.scrollY + (i * 22)}px`,
                        left: `${pr.right + window.scrollX + 6}px`,
                        zIndex: 99999,
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        pointerEvents: 'none'
                    });
                    document.body.appendChild(badge);
                    this.tempSelectBadges.push(badge);
                } catch (e) { /* ignore */ }
            });
            // Auto-remover después de 12s si el usuario no selecciona
            if (this._selectOptionAutoRemoveTimer) clearTimeout(this._selectOptionAutoRemoveTimer);
            this._selectOptionAutoRemoveTimer = setTimeout(() => { this.removeTempSelectBadges(); }, 12000);
        }

        removeTempSelectBadges() {
            if (this._selectOptionAutoRemoveTimer) { clearTimeout(this._selectOptionAutoRemoveTimer); this._selectOptionAutoRemoveTimer = null; }
            if (this.tempSelectBadges && this.tempSelectBadges.length) {
                this.tempSelectBadges.forEach(b => { try { b.remove(); } catch (e) {} });
            }
            this.tempSelectBadges = [];
        }

        // ==================== INICIALIZACIÓN ====================
        init() {
            this.loadIntegrationConfig();
            this.captureOriginalFontSize();
            this.injectStyles();
            this.createWidget();
            this.createReadingLine();
            this.createReadingHighlight();
            this.attachEventListeners();
            this.loadPreferences();
            this.buildReadableElementsList();
            this.enableKeyboardNavigation();
            this.enableVoiceCommands();
            this.enableInteractiveElementReading();
        }

        // Detecta idioma pedido por la integración
        loadIntegrationConfig() {
            try {
                // 1) global config object
                if (window.A11Y_WIDGET_CONFIG && window.A11Y_WIDGET_CONFIG.lang) {
                    this.defaultLang = window.A11Y_WIDGET_CONFIG.lang;
                    return;
                }

                // 2) buscar <script src="...accessibility-widget.js" data-lang="...">
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                const scriptTag = scripts.find(s => s.src && s.src.includes('accessibility-widget.js'));
                if (scriptTag && scriptTag.dataset && scriptTag.dataset.lang) {
                    this.defaultLang = scriptTag.dataset.lang;
                    return;
                }

                // 3) fallback al atributo lang del documento
                const htmlLang = document.documentElement.lang;
                if (htmlLang) this.defaultLang = htmlLang;
            } catch (e) { /* no bloquear si algo falla */ }
        }

        // ==================== ESTILOS ====================
        injectStyles() {
            const linkElement = document.createElement('link');
            linkElement.rel = 'stylesheet';
            // Obtener la ruta del script actual para cargar CSS desde la misma carpeta
            const scriptTag = document.querySelector('script[src*="accessibility-widget.js"]');
            let cssPath = 'accessibility-widget.css';
            if (scriptTag) {
                const scriptSrc = scriptTag.src;
                const scriptDir = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);
                cssPath = scriptDir + 'accessibility-widget.css';
            }
            linkElement.href = cssPath;
            document.head.appendChild(linkElement);

            // Inyectar estilos CSS inline para modo edición
            const style = document.createElement('style');
            style.textContent = `
                input.a11y-input-edit-mode,
                textarea.a11y-input-edit-mode,
                select.a11y-input-edit-mode {
                    border: 3px solid #FF6B6B !important;
                    outline: 2px solid #FF6B6B !important;
                    background-color: #FFF8F8 !important;
                    box-shadow: 0 0 8px rgba(255, 107, 107, 0.3) !important;
                }
                
                input.a11y-input-edit-mode::placeholder,
                textarea.a11y-input-edit-mode::placeholder {
                    color: #FF6B6B;
                }
            `;
            document.head.appendChild(style);
        }

        captureOriginalFontSize() {
            const computedStyle = window.getComputedStyle(document.documentElement);
            this.originalFontSize = computedStyle.fontSize;
        }

        // ==================== CREACIÓN DEL DOM ====================
        createWidget() {
            const widgetHTML = `
                <div id="accessibility-widget" class="a11y-widget">
                    <button id="a11y-toggle-btn" class="a11y-toggle-btn"
                            aria-label="Abrir panel de accesibilidad"
                            title="Activa las funciones de accesibilidad para mejorar tu experiencia.">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-person-standing">
                        <circle cx="12" cy="5" r="1"/>
                        <path d="m9 20 3-6 3 6"/>
                        <path d="m6 8 6 2 6-2"/>
                        <path d="M12 10v4"/>
                    </svg>
                    </button>

                    <div id="a11y-panel" class="a11y-panel" role="dialog" aria-labelledby="a11y-title" aria-hidden="true">
                        <div class="a11y-panel-header">
                            <h2 id="a11y-title">Opciones de Accesibilidad</h2>
                            <button id="a11y-close-btn" class="a11y-close-btn"
                                    aria-label="Cerrar panel"
                                    title="Cierra el panel de accesibilidad"
                                    >×</button>
                        </div>

                        <div class="a11y-panel-content">
                            <!-- Tamaño de Texto -->
                            <section class="a11y-section">
                                <h3>Tamaño de Texto</h3>
                                <div class="a11y-button-group" role="group" aria-label="Opciones de tamaño de texto">
                                    <button class="a11y-btn" data-font-size="small" aria-label="Texto pequeño" title="Reduce el texto">A</button>
                                    <button class="a11y-btn" data-font-size="medium" aria-label="Texto mediano" title="Tamaño por defecto">A</button>
                                    <button class="a11y-btn a11y-btn-large" data-font-size="large" aria-label="Texto grande" title="Aumenta el texto">A</button>
                                    <button class="a11y-btn a11y-btn-xlarge" data-font-size="xlarge" aria-label="Texto extra grande" title="Texto extra grande">A</button>
                                </div>
                            </section>

                            <!-- Temas -->
                            <section class="a11y-section">
                                <h3>Temas</h3>
                                <div class="a11y-theme-group" role="group" aria-label="Opciones de tema">
                                    <button class="a11y-theme-btn" data-theme="default" aria-label="Tema predeterminado" title="Tema normal"><span class="theme-preview theme-default"></span><span>Predeterminado</span></button>
                                    <button class="a11y-theme-btn" data-theme="dark" aria-label="Tema oscuro" title="Modo oscuro"><span class="theme-preview theme-dark"></span><span>Oscuro</span></button>
                                    <button class="a11y-theme-btn" data-theme="high-contrast-yellow" aria-label="Alto contraste amarillo" title="Alto contraste amarillo"><span class="theme-preview theme-yellow"></span><span>Alto contraste amarillo</span></button>
                                    <button class="a11y-theme-btn" data-theme="high-contrast-white" aria-label="Alto contraste blanco" title="Alto contraste blanco"><span class="theme-preview theme-white"></span><span>Alto contraste blanco</span></button>
                                </div>
                            </section>

                            <!-- Tamaño del Puntero -->
                            <section class="a11y-section">
                                <h3>Tamaño del Puntero</h3>
                                <div class="a11y-button-group" role="group" aria-label="Opciones de tamaño del puntero">
                                    <button class="a11y-btn" data-cursor-size="default" aria-label="Puntero normal" title="Puntero normal">Normal</button>
                                    <button class="a11y-btn" data-cursor-size="large" aria-label="Puntero grande" title="Puntero grande">Grande</button>
                                    <button class="a11y-btn" data-cursor-size="xlarge" aria-label="Puntero extra grande" title="Puntero extra grande">Extra</button>
                                </div>
                            </section>

                            <!-- Tipografia Dyslexia -->
                            <section class="a11y-section">
                                <h3>Modo Dislexia</h3>
                                <p class="a11y-help-text">Activa esta función para usar la tipografía OpenDyslexic, diseñada para facilitar la lectura en personas con dislexia.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-dyslexia-toggle" class="a11y-btn-primary" aria-label="Activar modo dislexia" title="Activa la tipografía OpenDyslexic para personas con dislexia">Activar Modo Dislexia</button>
                                </div>
                            </section>

                            <!-- Tipografia Bionic Reading -->
                            <section class="a11y-section">
                                <h3>Modo Bionic Reading</h3>
                                <p class="a11y-help-text">Activa esta función para resaltar el inicio de las palabras y facilitar la lectura rápida y la comprensión del texto.</p>
                                <button class="a11y-btn-primary" id="a11y-bionic-btn" title="Lectura Biónica">
                                    Bionic Reading
                                </button>
                            </section>

                            <!-- Regleta de Lectura -->
                            <section class="a11y-section">
                                <h3>Herramientas de Lectura</h3>
                                <p class="a11y-help-text">Activar regleta de lectura para guiar tu vista durante la lectura.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-reading-ruler-toggle" class="a11y-btn-primary" aria-label="Activar regleta de lectura" title="Activa una regleta horizontal para facilitar la lectura">Activar Regleta de Lectura</button>
                                    <button id="a11y-highlight-links-toggle" class="a11y-btn-primary" aria-label="Resaltar hipervínculos" title="Resalta todos los hipervínculos de la página">Resaltar Enlaces</button>
                                </div>
                            </section>

                            <!-- Velocidad de Lectura -->
                            <section class="a11y-section">
                                <h3>Velocidad de Lectura</h3>
                                <div class="a11y-rate-control">
                                    <input type="range" id="a11y-rate-slider" min="0.5" max="2" step="0.1" value="1" aria-label="Ajustar velocidad de voz">
                                    <span id="a11y-rate-value">1.0x</span>
                                </div>
                            </section>

                            <!-- Lector de Texto (TTS) -->
                            <section class="a11y-section">
                                <h3>Lector de Texto (TTS)</h3>
                                <p class="a11y-help-text">Selecciona texto y pulsa "Leer Selección" o usa "Leer Página". Puedes seleccionar "Detener" cuando estés listo para detener la lectura.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-read-selection" class="a11y-btn-primary" aria-label="Leer texto seleccionado" title="Lee el texto seleccionado">Leer Selección</button>
                                    <button id="a11y-read-page" class="a11y-btn-primary" aria-label="Leer toda la página" title="Lee toda la página">Leer Página</button>
                                    <button id="a11y-stop-reading" class="a11y-btn-secondary" aria-label="Detener lectura" title="Detiene la lectura" disabled>Detener</button>
                                </div>
                            </section>

                            <!-- Lectura por Secciones -->
                            <section class="a11y-section">
                                <h3>Lectura por Secciones</h3>
                                <p class="a11y-help-text">Activa este modo para navegar con las flechas del teclado y escuchar cada sección.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-section-reading-toggle" class="a11y-btn-primary" aria-label="Iniciar lectura por secciones" title="Activa modo de lectura por secciones con navegación por flechas">Iniciar Lectura por Secciones</button>
                                </div>
                            </section>

                            <!-- Comandos de Voz por Números -->
                            <section class="a11y-section">
                                <h3>Comandos por Voz</h3>
                                <p class="a11y-help-text">Activa este modo para numerar elementos y controlarlos por voz. Dice un número para leer o interactuar con ese elemento.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-numbered-voice-toggle" class="a11y-btn-primary" aria-label="Activar comandos de voz por números" title="Activa números en elementos para control por voz">Activar Comandos por Voz</button>
                                </div>
                            </section>

                            <!-- Reset -->
                            <section class="a11y-section">
                                <button id="a11y-reset" class="a11y-btn-reset" aria-label="Restablecer" title="Restablece opciones">Restablecer Todo</button>
                            </section>
                        </div>
                    </div>
                </div>
            `;

            const container = document.createElement('div');
            container.innerHTML = widgetHTML;
            document.body.appendChild(container.firstElementChild);
        }

        // ==================== LÍNEA Y HIGHLIGHT ====================
        createReadingHighlight() {
            this.highlightEl = document.createElement('div');
            this.highlightEl.id = 'a11y-reading-highlight';
            this.highlightEl.style.display = 'none';
            document.body.appendChild(this.highlightEl);
        }

        createReadingLine() {
            this.readingLineElement = document.createElement('div');
            this.readingLineElement.id = 'a11y-reading-line';
            this.readingLineElement.style.display = 'none';
            document.body.appendChild(this.readingLineElement);
        }

        moveHighlightToElement(el) {
            if (!el || !this.highlightEl) return;
            const rect = el.getBoundingClientRect();
            Object.assign(this.highlightEl.style, {
                display: 'block',
                top: `${rect.top + window.scrollY - 4}px`,
                left: `${rect.left + window.scrollX - 4}px`,
                width: `${rect.width + 8}px`,
                height: `${rect.height + 8}px`
            });
        }

        moveReadingLineToElement(el) {
            if (!el || !this.readingLineElement) return;
            const rect = el.getBoundingClientRect();
            Object.assign(this.readingLineElement.style, {
                display: 'block',
                top: `${rect.top + window.scrollY + rect.height - 4}px`,
                left: `${rect.left + window.scrollX}px`,
                width: `${rect.width}px`,
                height: '4px'
            });
        }

        hideHighlight() {
            if (this.highlightEl) this.highlightEl.style.display = 'none';
        }

        hideReadingLine() {
            if (this.readingLineElement) this.readingLineElement.style.display = 'none';
        }

        // ==================== EVENT LISTENERS ====================
        attachEventListeners() {
            const toggleBtn = document.getElementById('a11y-toggle-btn');
            const closeBtn = document.getElementById('a11y-close-btn');

            if (toggleBtn) toggleBtn.addEventListener('click', () => this.togglePanel());
            if (closeBtn) closeBtn.addEventListener('click', () => this.closePanel());

            // Escape para cerrar panel
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) this.closePanel();
            });

            // Tamaño de texto
            document.querySelectorAll('[data-font-size]').forEach(btn => btn.addEventListener('click', (e) => {
                this.setFontSize(e.currentTarget.dataset.fontSize);
            }));

            // Temas
            document.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', (e) => {
                this.setTheme(e.currentTarget.dataset.theme);
            }));

            // Tamaño del cursor
            document.querySelectorAll('[data-cursor-size]').forEach(btn => btn.addEventListener('click', (e) => {
                this.setCursorSize(e.currentTarget.dataset.cursorSize);
            }));

            // Botones TTS
            const readSel = document.getElementById('a11y-read-selection');
            const readPage = document.getElementById('a11y-read-page');
            const stopBtn = document.getElementById('a11y-stop-reading');
            const sectionReadingToggle = document.getElementById('a11y-section-reading-toggle');
            const numberedVoiceToggle = document.getElementById('a11y-numbered-voice-toggle');
            const readingRulerToggle = document.getElementById('a11y-reading-ruler-toggle');
            const highlightLinksToggle = document.getElementById('a11y-highlight-links-toggle');
            const resetBtn = document.getElementById('a11y-reset');
            const dyslexiaToggle = document.getElementById('a11y-dyslexia-toggle');
            if (dyslexiaToggle) dyslexiaToggle.addEventListener('click', () => this.toggleDyslexiaMode());

            if (readSel) readSel.addEventListener('click', () => this.readSelection());
            if (readPage) readPage.addEventListener('click', () => this.readPage());
            if (stopBtn) stopBtn.addEventListener('click', () => this.stopReading());
            if (sectionReadingToggle) sectionReadingToggle.addEventListener('click', () => this.toggleSectionReading());
            if (numberedVoiceToggle) numberedVoiceToggle.addEventListener('click', () => this.toggleNumberedVoiceMode());
            if (readingRulerToggle) readingRulerToggle.addEventListener('click', () => this.toggleReadingRuler());
            if (highlightLinksToggle) highlightLinksToggle.addEventListener('click', () => this.toggleHighlightLinks());
            if (resetBtn) resetBtn.addEventListener('click', () => this.resetAll());

            // Slider de velocidad
            const rateSlider = document.getElementById('a11y-rate-slider');
            if (rateSlider) {
                rateSlider.addEventListener('input', (e) => {
                    this.setReadingRate(e.target.value);
                });
            }

            // Botón Bionic Reading
            const bionicBtn = document.getElementById('a11y-bionic-btn');
            if (bionicBtn) bionicBtn.addEventListener('click', () => this.toggleBionicReading());
        }

        // ==================== PANEL CONTROL ====================
        togglePanel() { this.isOpen ? this.closePanel() : this.openPanel(); }

        openPanel() {
            const panel = document.getElementById('a11y-panel');
            if (panel) panel.classList.add('open');
            this.isOpen = true;
            // Guardar elemento previamente enfocado para restaurarlo al cerrar
            this.previouslyFocusedEl = document.activeElement;

            const closeBtn = document.getElementById('a11y-close-btn');
            if (closeBtn) closeBtn.focus();

            // Instalar trap de foco dentro del panel
            if (panel) {
                const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
                const focusable = Array.from(panel.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null);
                const firstEl = focusable[0];
                const lastEl = focusable[focusable.length - 1];

                this.focusTrapHandler = (e) => {
                    if (e.key !== 'Tab') return;
                    const active = document.activeElement;
                    if (e.shiftKey) {
                        // Shift + Tab
                        if (active === firstEl || active === panel) {
                            e.preventDefault();
                            if (lastEl) lastEl.focus();
                        }
                    } else {
                        // Tab
                        if (active === lastEl) {
                            e.preventDefault();
                            if (firstEl) firstEl.focus();
                        }
                    }
                };

                document.addEventListener('keydown', this.focusTrapHandler);
            }
        }

        closePanel() {
            const panel = document.getElementById('a11y-panel');
            if (panel) panel.classList.remove('open');
            this.isOpen = false;
            const toggleBtn = document.getElementById('a11y-toggle-btn');
            if (toggleBtn) toggleBtn.focus();

            // Remover trap de foco si existe
            if (this.focusTrapHandler) {
                try { document.removeEventListener('keydown', this.focusTrapHandler); } catch (e) { }
                this.focusTrapHandler = null;
            }

            // Restaurar foco previo si existía y sigue en el DOM
            try {
                if (this.previouslyFocusedEl && this.previouslyFocusedEl.focus) this.previouslyFocusedEl.focus();
            } catch (e) { }
        }

        autoClosePanel() {
            if (this.isOpen) this.closePanel();
        }

        // ==================== LECTURA POR SECCIONES ====================
        toggleSectionReading() {
            this.sectionReadingMode = !this.sectionReadingMode;
            const btn = document.getElementById('a11y-section-reading-toggle');

            if (this.sectionReadingMode) {
                // Activar modo
                this.buildReadableElementsList();
                this.virtualFocusIndex = -1;
                btn.textContent = 'Detener Lectura por Secciones';
                btn.classList.add('active');
                // Opcional: cerrar el panel automáticamente
                this.autoClosePanel();
            } else {
                // Desactivar modo
                this.stopReading();
                btn.textContent = 'Iniciar Lectura por Secciones';
                btn.classList.remove('active');
                this.hideHighlight();
                this.hideReadingLine();
            }
        }

        // ==================== MODO DISLEXIA ====================
        toggleDyslexiaMode() {
            this.dyslexiaMode = !this.dyslexiaMode;
            const btn = document.getElementById('a11y-dyslexia-toggle');

            if (this.dyslexiaMode) {
                // Activar modo dislexia
                document.body.classList.add('a11y-dyslexia-mode');
                btn.textContent = 'Desactivar Modo Dislexia';
                btn.classList.add('active');
            } else {
                // Desactivar modo dislexia
                document.body.classList.remove('a11y-dyslexia-mode');
                btn.textContent = 'Activar Modo Dislexia';
                btn.classList.remove('active');
            }
            this.savePreferences();
        }

        // ==================== MODO BIONICO ====================
        toggleBionicReading() {
            const isActive = document.body.classList.toggle('a11y-bionic-mode');
            const btn = document.getElementById('a11y-bionic-btn');
            if (btn) btn.classList.toggle('active', isActive);

            if (isActive) {
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                            const parent = node.parentElement;
                            if (!parent) return NodeFilter.FILTER_REJECT;
                            if (parent.closest && parent.closest('#accessibility-widget')) return NodeFilter.FILTER_REJECT;
                            const tag = parent.nodeName.toLowerCase();
                            if (['script', 'style', 'textarea', 'input', 'select'].includes(tag)) return NodeFilter.FILTER_REJECT;
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    },
                    false
                );

                const textNodes = [];
                while (walker.nextNode()) textNodes.push(walker.currentNode);

                textNodes.forEach(textNode => {
                    const original = textNode.nodeValue;
                    const wrapper = document.createElement('span');
                    wrapper.className = 'a11y-bionic-wrap';
                    wrapper.dataset.a11yOriginal = original;

                    const parts = original.split(/(\s+)/);
                    parts.forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) {
                            wrapper.appendChild(document.createTextNode(part));
                        } else {
                            const len = part.length;
                            const boldLen = Math.max(1, Math.round(len * 0.4));
                            const boldPart = part.slice(0, boldLen);
                            const rest = part.slice(boldLen);
                            const b = document.createElement('b');
                            b.textContent = boldPart;
                            wrapper.appendChild(b);
                            if (rest) wrapper.appendChild(document.createTextNode(rest));
                        }
                    });

                    textNode.parentNode.replaceChild(wrapper, textNode);
                });
            } else {
                document.querySelectorAll('span.a11y-bionic-wrap').forEach(span => {
                    const original = span.dataset.a11yOriginal || span.textContent;
                    span.parentNode.replaceChild(document.createTextNode(original), span);
                });
            }

            if (typeof this.savePreferences === 'function') {
                try { this.savePreferences(); } catch (e) { /* no-op */ }
            }
        }

        // ==================== PREFERENCIAS ====================
        setFontSize(size) {
            const scales = { small: 0.875, medium: 1, large: 1.25, xlarge: 1.5 };
            if (!this.originalFontSize) this.captureOriginalFontSize();
            const newSize = parseFloat(this.originalFontSize) * (scales[size] || 1);
            document.documentElement.style.fontSize = `${newSize}px`;
            this.currentFontSize = size;
            this.savePreferences();
            this.updateActiveButton('[data-font-size]', size);
        }

        setTheme(theme) {
            document.body.classList.remove('a11y-theme-default', 'a11y-theme-dark', 'a11y-theme-high-contrast-yellow', 'a11y-theme-high-contrast-white');
            document.body.classList.add(`a11y-theme-${theme}`);
            this.currentTheme = theme;
            this.savePreferences();
            this.updateActiveButton('[data-theme]', theme);
        }

        setCursorSize(size) {
            document.body.classList.remove('a11y-cursor-default', 'a11y-cursor-large', 'a11y-cursor-xlarge');
            document.body.classList.add(`a11y-cursor-${size}`);
            this.currentCursorSize = size;
            this.savePreferences();
            this.updateActiveButton('[data-cursor-size]', size);
        }

        setReadingRate(rate) {
            this.currentReadingRate = parseFloat(rate);
            const rateValueDisplay = document.getElementById('a11y-rate-value');
            if (rateValueDisplay) rateValueDisplay.textContent = `${this.currentReadingRate.toFixed(1)}x`;
            this.savePreferences();
        }

        updateActiveButton(selector, value) {
            document.querySelectorAll(selector).forEach(btn => {
                const btnValue = btn.dataset.fontSize || btn.dataset.theme || btn.dataset.cursorSize;
                btn.classList.toggle('active', btnValue === value);
                btn.setAttribute('aria-pressed', btnValue === value ? 'true' : 'false');
            });
        }

        savePreferences() {
            localStorage.setItem('a11y-preferences', JSON.stringify({
                fontSize: this.currentFontSize,
                theme: this.currentTheme,
                cursorSize: this.currentCursorSize,
                readingRate: this.currentReadingRate,
                dyslexiaMode: this.dyslexiaMode
            }));
        }

        loadPreferences() {
            const saved = localStorage.getItem('a11y-preferences');
            if (!saved) return;
            try {
                const prefs = JSON.parse(saved);
                if (prefs.fontSize) this.setFontSize(prefs.fontSize);
                if (prefs.theme) this.setTheme(prefs.theme);
                if (prefs.cursorSize) this.setCursorSize(prefs.cursorSize);
                if (prefs.readingRate) {
                    this.currentReadingRate = parseFloat(prefs.readingRate);
                    const slider = document.getElementById('a11y-rate-slider');
                    if (slider) slider.value = prefs.readingRate;
                    const display = document.getElementById('a11y-rate-value');
                    if (display) display.textContent = `${parseFloat(prefs.readingRate).toFixed(1)}x`;
                    if (prefs.dyslexiaMode) this.toggleDyslexiaMode();
                }
            } catch (e) { /* ignore */ }
        }

        // ==================== LECTURA (SELECCIÓN / PÁGINA) ====================
        readSelection() {
            const selection = window.getSelection();
            const text = selection ? selection.toString().trim() : '';
            if (!text) return alert('Por favor, selecciona algún texto.');
            const node = selection.anchorNode && selection.anchorNode.parentElement ? selection.anchorNode.parentElement : null;
            if (node && this.shouldIgnoreElement && this.shouldIgnoreElement(node)) return alert('El texto seleccionado está marcado para no leerse.');
            const elemLang = node ? (node.dataset?.a11yLang || node.lang || this.findClosestLang(node)) : null;
            const lang = elemLang || this.defaultLang;
            this.autoClosePanel();
            this.speak(text, lang);
        }

        readPage() {
            this.buildReadableElementsList();
            if (!this.readableElements.length) return alert('No se encontró texto para leer.');
            this.autoClosePanel();
            // Se abrirán automáticamente los modales/diálogos si el usuario interactúa
            this.startFlowReading();
        }

        extractPageText() {
            const exclude = ['script', 'style', 'noscript', '#accessibility-widget', '.a11y-widget'];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                    let parent = node.parentElement;
                    while (parent) {
                        try {
                            if (exclude.some(sel => parent.matches?.(sel))) return NodeFilter.FILTER_REJECT;
                        } catch (e) {
                            // ignore match errors
                        }
                        // Excluir elementos marcados para no lectura
                        if (parent.hasAttribute && parent.hasAttribute('aria-hidden') && parent.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
                        if (parent.hidden) return NodeFilter.FILTER_REJECT;
                        try {
                            const st = window.getComputedStyle(parent);
                            if (st && (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0)) return NodeFilter.FILTER_REJECT;
                        } catch (e) { /* ignore */ }
                        parent = parent.parentElement;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            let texts = [], node;
            while (node = walker.nextNode()) texts.push(node.textContent.trim());
            return texts.join(' ').replace(/\s+/g, ' ').trim();
        }

        speak(text, lang) {
            if (!this.speechSynthesis) return alert('Tu navegador no soporta TTS.');
            this.stopReading();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = lang || this.defaultLang;
            const voices = this.speechSynthesis.getVoices();
            const voice = voices.find(v => (utter.lang && v.lang.startsWith(utter.lang.split('-')[0]))) || voices.find(v => v.lang.startsWith(utter.lang?.split('-')[0])) || voices[0];
            if (voice) utter.voice = voice;
            utter.rate = this.currentReadingRate;
            utter.pitch = 1;
            utter.onstart = () => {
                this.isSpeaking = true;
                const stopBtn = document.getElementById('a11y-stop-reading');
                if (stopBtn) stopBtn.disabled = false;
            };
            utter.onend = () => {
                this.isSpeaking = false;
                const stopBtn = document.getElementById('a11y-stop-reading');
                if (stopBtn) stopBtn.disabled = true;
                // Reiniciar reconocimiento de voz si el modo numerado está activo (escucha continua)
                if (this.numberedVoiceMode && this.numberedVoiceRecog) {
                    try {
                        this.numberedVoiceRecog.start();
                    } catch (e) {
                        // Si no se puede reiniciar, iniciar uno nuevo
                        if (this.numberedVoiceMode) this.startNumberedVoiceRecognition();
                    }
                }
            };
            this.currentUtterance = utter;
            this.speechSynthesis.cancel();
            setTimeout(() => this.speechSynthesis.speak(utter), 100);
        }

        stopReading() {
            if (this.speechSynthesis) {
                this.speechSynthesis.cancel();
                this.isSpeaking = false;
                this.flowReadingActive = false;
                const stopBtn = document.getElementById('a11y-stop-reading');
                if (stopBtn) stopBtn.disabled = true;
                this.hideHighlight();
                this.hideReadingLine();
            }
        }

        resetAll() {
            this.setFontSize('medium');
            this.setTheme('default');
            this.setCursorSize('default');
            this.setReadingRate(1);
            this.sectionReadingMode = false;
            this.numberedVoiceMode = false;
            this.readingRulerActive = false;
            this.highlightLinksActive = false;
            this.inputEditMode = false;
            this.selectOpenMode = false;
            this.currentSelectElement = null;
            this.currentOptionIndex = -1;
            this.stopReading();

            // Remover clase de modo edición si existe
            document.querySelectorAll('.a11y-input-edit-mode').forEach(el => {
                el.classList.remove('a11y-input-edit-mode');
            });

            // Regleta de lectura
            if (this.readingRulerActive) this.toggleReadingRuler();
            const rulerBtn = document.getElementById('a11y-reading-ruler-toggle');
            if (rulerBtn) {
                rulerBtn.textContent = 'Activar Regleta de Lectura';
                rulerBtn.classList.remove('a11y-btn-active');
            }

            // Resalte de enlaces
            if (this.highlightLinksActive) this.toggleHighlightLinks();
            const linksBtn = document.getElementById('a11y-highlight-links-toggle');
            if (linksBtn) {
                linksBtn.textContent = 'Resaltar Enlaces';
                linksBtn.classList.remove('a11y-btn-active');
            }

            const btn = document.getElementById('a11y-section-reading-toggle');
            if (btn) {
                btn.textContent = 'Iniciar Lectura por Secciones';
                btn.classList.remove('active');
            }
            const numBtn = document.getElementById('a11y-numbered-voice-toggle');
            if (numBtn) {
                numBtn.textContent = 'Activar Comandos por Voz';
                numBtn.classList.remove('active');
                this.removeNumberedLabels();
            }
            localStorage.removeItem('a11y-preferences');
            alert('Configuración restablecida.');

            this.dyslexiaMode = false;
            document.body.classList.remove('a11y-dyslexia-mode');
            const dyslexiaBtn = document.getElementById('a11y-dyslexia-toggle');
            if (dyslexiaBtn) {
                dyslexiaBtn.textContent = 'Activar Modo Dislexia';
                dyslexiaBtn.classList.remove('active');
            }
        }

        // ==================== LECTURA DE FLUJO ====================
        startFlowReading() {
            this.flowReadingActive = true;
            this.virtualFocusIndex = 0;
            this.speechSynthesis.cancel();

            const stopBtn = document.getElementById('a11y-stop-reading');
            if (stopBtn) stopBtn.disabled = false;
            this.isSpeaking = true;

            const readNext = () => {
                if (!this.flowReadingActive) return;
                if (this.virtualFocusIndex >= this.readableElements.length) {
                    this.stopFlowReading();
                    return;
                }
                const el = this.readableElements[this.virtualFocusIndex];
                const elemLang = el.dataset?.a11yLang || el.lang || this.findClosestLang(el) || this.defaultLang;

                // Usar la función que extrae el texto inteligentemente
                const text = this.getElementReadableText(el);

                this.moveHighlightToElement(el);
                this.moveReadingLineToElement(el);
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Si no hay texto para leer, pasar al siguiente
                if (!text) {
                    this.virtualFocusIndex++;
                    readNext();
                    return;
                }

                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = elemLang;
                utter.rate = this.currentReadingRate;

                const voices = this.speechSynthesis.getVoices();
                const voice = voices.find(v => v.lang.startsWith(elemLang.split('-')[0])) || voices[0];
                if (voice) utter.voice = voice;

                utter.onstart = () => {
                    this.isSpeaking = true;
                    if (stopBtn) stopBtn.disabled = false;
                };

                utter.onend = () => {
                    this.virtualFocusIndex++;
                    readNext();
                };

                this.speechSynthesis.speak(utter);
            };

            readNext();
        }

        stopFlowReading() {
            this.flowReadingActive = false;
            this.speechSynthesis.cancel();
            this.isSpeaking = false;
            const stopBtn = document.getElementById('a11y-stop-reading');
            if (stopBtn) stopBtn.disabled = true;
            this.hideHighlight();
            this.hideReadingLine();
        }

        // ==================== COMANDOS DE VOZ POR NÚMEROS ====================
        toggleNumberedVoiceMode() {
            this.numberedVoiceMode = !this.numberedVoiceMode;
            const btn = document.getElementById('a11y-numbered-voice-toggle');

            if (this.numberedVoiceMode) {
                // Activar modo
                // CRÍTICO: Usar la MISMA buildReadableElementsList que "Leer Página" y "Lectura por Secciones"
                // Así se numeran TODOS los componentes de la misma forma
                this.buildReadableElementsList();
                this.createNumberedLabels();
                btn.textContent = 'Desactivar Comandos por Voz';
                btn.classList.add('active');
                
                // Feedback al usuario con instrucciones claras
                const totalElements = (this.numberedIndexMap || []).length;
                const feedbackText = totalElements > 0
                    ? `Comandos de voz activados. Se han detectado ${totalElements} elementos interactivos en esta página. Di un número para leer o interactuar con ese elemento. Por ejemplo, di "uno" para el primer elemento, o "cero" para abrir el panel de opciones.`
                    : `Comandos de voz activados. No se detectaron elementos interactivos en esta página. Intenta navegar a una página con más contenido o botones.`;
                this.speak(feedbackText, this.defaultLang);
                
                this.autoClosePanel();
                this.startNumberedVoiceRecognition();
            } else {
                // Desactivar modo
                this.stopNumberedVoiceRecognition();
                this.removeNumberedLabels();
                btn.textContent = 'Activar Comandos por Voz';
                btn.classList.remove('active');
                
                // Feedback
                this.speak('Comandos de voz desactivados.', this.defaultLang);
            }
        }

        createNumberedLabels() {
            console.log('[A11Y-DEBUG] createNumberedLabels: Iniciando creación de badges numerados');
            
            // Limpiar badges previos
            this.removeNumberedLabels();
            this.numberedBadgeEls = [];

            // PASO 1: Badge del botón toggle (número 0)
            const toggleBtn = document.getElementById('a11y-toggle-btn');
            if (toggleBtn) {
                const badge0 = this.createBadgeElement('0', toggleBtn, false);
                if (badge0) this.numberedBadgeEls.push(badge0);
            }

            // PASO 2: Detectar si hay modal abierto
            const openedModal = this.findOpenedModal();
            let elementsToNumber = [];

            if (openedModal) {
                console.log('[A11Y-DEBUG] Modal detectado, usando elementos del modal');
                elementsToNumber = this.buildReadableElementsInModal(openedModal);
                this.currentModalIndexMap = elementsToNumber;
                // Guardar estado anterior para restaurar después
                if (!this.savedParentIndexMap) {
                    this.savedParentIndexMap = this.numberedIndexMap || [];
                }
            } else {
                console.log('[A11Y-DEBUG] Sin modal, usando elementos globales');
                // Asegurar que tenemos el mapeo
                if (!this.numberedIndexMap || !this.numberedIndexMap.length) {
                    this.buildReadableElementsList();
                }
                elementsToNumber = this.numberedIndexMap || [];
                this.currentModalIndexMap = null;
                this.savedParentIndexMap = null;
            }

            // PASO 3: Crear badges para cada elemento
            elementsToNumber.forEach((entry) => {
                if (entry.type !== 'element') return; // Solo elementos, no opciones de select
                
                const el = entry.el;
                const isInMenu = openedModal && openedModal.id === 'menu-item';
                const badge = this.createBadgeElement(entry.number, el, isInMenu);
                
                if (badge) {
                    this.numberedBadgeEls.push(badge);
                    // Marcar elemento con su número para referencia
                    try { el.setAttribute('data-a11y-number', entry.number); } catch (e) {}
                }
            });

            // PASO 4: Actualizar total de elementos
            this.totalNumberedElements = elementsToNumber.length + 1; // +1 para el 0
            console.log(`[A11Y-DEBUG] Total de elementos detectados: ${this.totalNumberedElements}`);
            
            // PASO 5: Configurar listener de scroll para actualizar posiciones
            this.setupBadgeScrollListener();
        }

        /**
         * Crear un elemento badge para un elemento del DOM
         */
        createBadgeElement(number, targetEl, isInMenu = false) {
            try {
                const r = targetEl.getBoundingClientRect();
                
                // Si el elemento no es visible, no crear badge
                if (r.width <= 0 || r.height <= 0) {
                    return null;
                }

                const badge = document.createElement('div');
                badge.className = 'a11y-number-badge';
                badge.textContent = number;
                badge.setAttribute('data-a11y-number', number);
                badge.setAttribute('aria-hidden', 'true');

                // Calcular posición centrada respecto al elemento
                const badgeSize = 24;
                const offsetFromElement = 8;
                
                const topPosition = isInMenu 
                    ? Math.max(4, r.top + (r.height / 2) - (badgeSize / 2))
                    : Math.max(4, r.top + window.scrollY + (r.height / 2) - (badgeSize / 2));
                
                const leftPosition = isInMenu
                    ? Math.round(r.right + offsetFromElement)
                    : Math.round(r.right + window.scrollX + offsetFromElement);

                // Aplicar estilos mejorados
                Object.assign(badge.style, {
                    position: isInMenu ? 'fixed' : 'absolute',
                    top: `${Math.round(topPosition)}px`,
                    left: `${Math.round(leftPosition)}px`,
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FF6B35',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '12px',
                    fontWeight: '700',
                    fontFamily: 'Arial, sans-serif',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    zIndex: '99999',
                    pointerEvents: 'none',
                    border: '2px solid white',
                    boxSizing: 'border-box',
                    margin: '0',
                    padding: '0'
                });

                // Guardar referencias para actualización posterior
                badge._targetElement = targetEl;
                badge._isInMenu = isInMenu;

                document.body.appendChild(badge);
                return badge;
            } catch (e) {
                console.warn('[A11Y-DEBUG] Error al crear badge:', e);
                return null;
            }
        }

        /**
         * Configurar listener de scroll para actualizar posiciones de badges
         */
        setupBadgeScrollListener() {
            // Remover listener anterior si existe
            if (this._badgeScrollListener) {
                window.removeEventListener('scroll', this._badgeScrollListener);
            }

            if (!this.numberedBadgeEls || this.numberedBadgeEls.length === 0) {
                return;
            }

            // Usar requestAnimationFrame para mejor performance
            this._badgeScrollListener = () => {
                requestAnimationFrame(() => this.updateBadgePositions());
            };

            window.addEventListener('scroll', this._badgeScrollListener);
        }

        removeNumberedLabels() {
            // Remove badges we added
            (this.numberedBadgeEls || []).forEach(b => { try { b.remove(); } catch (e) {} });
            this.numberedBadgeEls = [];
            // Also remove any temporary select option badges
            if (this.tempSelectBadges) { this.tempSelectBadges.forEach(b => { try { b.remove(); } catch (e) {} }); this.tempSelectBadges = []; }
            // Also remove any leftover badges in the DOM (safety)
            document.querySelectorAll('.a11y-number-badge').forEach(b => { try { b.remove(); } catch (e) {} });
            // Cleanup data attributes
            document.querySelectorAll('[data-a11y-index]').forEach(el => { el.removeAttribute('data-a11y-index'); });
            
            // Limpiar listener de scroll
            if (this._badgeScrollListener) {
                window.removeEventListener('scroll', this._badgeScrollListener);
                this._badgeScrollListener = null;
            }
        }

        // Actualizar posiciones de badges cuando hay scroll
        updateBadgePositions() {
            if (!this.numberedBadgeEls || !this.numberedBadgeEls.length) return;
            
            this.numberedBadgeEls.forEach(badge => {
                try {
                    const targetEl = badge._targetElement;
                    const isInMenu = badge._isInMenu;
                    
                    // Si el elemento ya no existe en el DOM o es null, omitir
                    if (!targetEl || !document.contains(targetEl)) {
                        badge.style.display = 'none';
                        return;
                    }
                    
                    const r = targetEl.getBoundingClientRect();

                    // Mantener el badge centrado verticalmente respecto al elemento
                    const badgeSize = 22;
                    const offset = 6;
                    const centeredTopViewport = Math.max(4, r.top + (r.height / 2) - (badgeSize / 2));
                    const centeredTopDocument = Math.max(4, r.top + window.scrollY + (r.height / 2) - (badgeSize / 2));

                    // Actualizar posición respetando el tipo original del badge
                    badge.style.display = 'block';
                    if (isInMenu) {
                        // Elementos del menú: fixed, sin scroll compensation
                        badge.style.top = `${Math.round(centeredTopViewport)}px`;
                        badge.style.left = `${Math.round(r.right + offset)}px`;
                    } else {
                        // Elementos de la página: absolute, con scroll compensation
                        badge.style.top = `${Math.round(centeredTopDocument)}px`;
                        badge.style.left = `${Math.round(r.right + window.scrollX + offset)}px`;
                    }
                } catch (e) { /* ignore */ }
            });
        }

        startNumberedVoiceRecognition() {
            if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                alert('Tu navegador no soporta reconocimiento de voz.');
                return;
            }

            // GUARD: Si ya tenemos un reconocedor activo, no iniciar otro
            if (this.numberedVoiceRecog && this.numberedVoiceRecog._isRunning) {
                console.log('[A11Y-DEBUG] Speech recognition already running, skipping start');
                return;
            }

            const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            try {
                this.numberedVoiceRecog = new Recognition();
                this.numberedVoiceRecog.lang = this.defaultLang || 'es-ES';
                this.numberedVoiceRecog.continuous = true;
                this.numberedVoiceRecog.interimResults = false;
                this.numberedVoiceRecog.maxAlternatives = 1;

                this.numberedVoiceRecog.onstart = () => {
                    this.numberedVoiceRecog._isRunning = true;
                    console.log('[A11Y-DEBUG] Reconocimiento de voz iniciado - esperando comando');
                };

                this.numberedVoiceRecog.onresult = (event) => {
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        // Solo procesar resultados finales
                        if (!event.results[i].isFinal) continue;

                        const transcript = event.results[i][0].transcript.toLowerCase().trim();
                        console.log(`[A11Y-DEBUG] Transcript detectado: "${transcript}"`);

                        // Palabras clave para desactivar
                        if (/desactivar|salir|cancelar/.test(transcript)) {
                            console.log('[A11Y-DEBUG] Comando de desactivación detectado');
                            this.toggleNumberedVoiceMode();
                            return;
                        }

                        // Palabras clave para cerrar panel
                        if (/cerrar|close/.test(transcript)) {
                            if (this.isOpen) {
                                console.log('[A11Y-DEBUG] Cerrando panel');
                                this.closePanel();
                            }
                            return;
                        }

                        // Mapa de números soportados (español e inglés)
                        const numberWords = {
                            'cero': 0, 'zero': 0, '0': 0,
                            'uno': 1, 'one': 1, '1': 1,
                            'dos': 2, 'two': 2, '2': 2,
                            'tres': 3, 'three': 3, '3': 3,
                            'cuatro': 4, 'four': 4, '4': 4,
                            'cinco': 5, 'five': 5, '5': 5,
                            'seis': 6, 'six': 6, '6': 6,
                            'siete': 7, 'seven': 7, '7': 7,
                            'ocho': 8, 'eight': 8, '8': 8,
                            'nueve': 9, 'nine': 9, '9': 9,
                            'diez': 10, 'ten': 10, '10': 10
                        };

                        // Extraer número del transcript
                        const extractedNum = this.extractNumberFromTranscript(
                            transcript, 
                            numberWords, 
                            this.totalNumberedElements
                        );

                        if (extractedNum !== null && extractedNum < this.totalNumberedElements) {
                            console.log(`[A11Y-DEBUG] Número extraído: ${extractedNum}`);
                            this.handleNumberedVoiceCommand(extractedNum);
                            return;
                        } else {
                            console.log(`[A11Y-DEBUG] Número no válido o fuera de rango: ${extractedNum}`);
                        }
                    }
                };

                this.numberedVoiceRecog.onerror = (e) => {
                    console.warn(`[A11Y-DEBUG] Error STT: ${e.error}`);
                    // Continuar escuchando; no detener en errores como 'no-speech'
                };

                this.numberedVoiceRecog.onend = () => {
                    this.numberedVoiceRecog._isRunning = false;
                    console.log('[A11Y-DEBUG] Reconocimiento terminado');
                    
                    // Reiniciar si el modo sigue activo
                    if (this.numberedVoiceMode && this.numberedVoiceRecog) {
                        try {
                            setTimeout(() => {
                                if (this.numberedVoiceMode && this.numberedVoiceRecog && !this.numberedVoiceRecog._isRunning) {
                                    console.log('[A11Y-DEBUG] Reiniciando reconocimiento...');
                                    this.numberedVoiceRecog.start();
                                }
                            }, 100);
                        } catch (e) { 
                            console.log('[A11Y-DEBUG] Error al reiniciar:', e); 
                        }
                    }
                };

                this.numberedVoiceRecog.start();
                console.log('[A11Y-DEBUG] Reconocimiento iniciado');

                // Monitorear cambios en modales mientras el modo de voz está activo
                this.startModalMonitoringForVoiceMode();
            } catch (e) {
                console.warn('[A11Y-DEBUG] Error al iniciar reconocimiento:', e);
                if (this.numberedVoiceRecog) {
                    this.numberedVoiceRecog._isRunning = false;
                }
            }
        }

        // Monitorear cambios en estado de modales para recalcular badges
        startModalMonitoringForVoiceMode() {
            if (this._voiceModalCheckInterval) clearInterval(this._voiceModalCheckInterval);
            if (this._menuMutationObserver) {
                try { this._menuMutationObserver.disconnect(); } catch (e) { }
                this._menuMutationObserver = null;
            }

            let lastModalState = null;

            // OBSERVADOR CRÍTICO: detectar cambios en la clase del menú (#menu-item)
            try {
                const sidebar = document.getElementById('menu-item');
                if (sidebar) {
                    this._menuMutationObserver = new MutationObserver(() => {
                        if (!this.numberedVoiceMode) return;
                        const currentModal = this.findOpenedModal();
                        const currentModalState = currentModal ? currentModal.className : null;
                        
                        if (currentModalState !== lastModalState) {
                            this.createNumberedLabels();
                            lastModalState = currentModalState;
                        }
                    });
                    
                    this._menuMutationObserver.observe(sidebar, { 
                        attributes: true, 
                        attributeFilter: ['class']
                    });
                }
            } catch (e) { /* ignore */ }

            // INTERVALO de monitoreo como respaldo (más rápido para detectar cambios)
            this._voiceModalCheckInterval = setInterval(() => {
                if (!this.numberedVoiceMode) {
                    // Si el modo se desactivó, limpiar
                    clearInterval(this._voiceModalCheckInterval);
                    this._voiceModalCheckInterval = null;
                    if (this._menuMutationObserver) {
                        try { this._menuMutationObserver.disconnect(); } catch (e) { }
                        this._menuMutationObserver = null;
                    }
                    return;
                }

                const currentModal = this.findOpenedModal();
                const currentModalState = currentModal ? currentModal.id || currentModal.className : 'CLOSED';
                
                console.log('[A11Y-DEBUG] modalCheckInterval: currentModalState =', currentModalState, 'lastModalState =', lastModalState);

                // Si el estado cambió (se abrió o se cerró un modal/menú), recalcular badges
                if (currentModalState !== lastModalState) {
                    console.log('[A11Y-DEBUG] modalCheckInterval: State changed! Recalculating badges');
                    this.createNumberedLabels();
                    lastModalState = currentModalState;
                }
            }, 250); // Chequear cada 250ms (más rápido que antes)
        }

        stopNumberedVoiceRecognition() {
            if (this.numberedVoiceRecog) {
                try {
                    this.numberedVoiceRecog.abort();
                } catch (e) { /* ignore */ }
            }
            // Limpiar intervalo de monitoreo de modales/menú
            if (this._voiceModalCheckInterval) {
                clearInterval(this._voiceModalCheckInterval);
                this._voiceModalCheckInterval = null;
            }
            // Limpiar observador del menú
            if (this._menuMutationObserver) {
                try { this._menuMutationObserver.disconnect(); } catch (e) { }
                this._menuMutationObserver = null;
            }
        }

        extractNumberFromTranscript(transcript, numberWords, maxNum = 100) {
            // Primero busca palabras numéricas exactas (cero, uno, dos, etc.) como palabras completas
            for (const [word, num] of Object.entries(numberWords)) {
                // Busca la palabra como límite de palabra completa, no substring
                const regex = new RegExp(`\\b${word}\\b`);
                if (regex.test(transcript)) {
                    return num;
                }
            }

            // Si no encontró palabra, busca un número dígito aislado como palabra completa
            // Busca desde 0 hasta maxNum (que es totalNumberedElements o 100 por defecto)
            for (let num = 0; num < maxNum; num++) {
                const regex = new RegExp(`\\b${num}\\b`);
                if (regex.test(transcript)) {
                    return num;
                }
            }

            return null;
        }

        handleNumberedVoiceCommand(num) {
            if (num === 0) {
                // Número 0: alternar panel
                this.togglePanel();
                return;
            }

            // MEJORADO: Detectar si hay modal abierto y usar su mapeo
            const openedModal = this.findOpenedModal();
            let indexMap = this.numberedIndexMap;
            
            if (openedModal && this.currentModalIndexMap) {
                // Si hay modal, usar el mapeo del modal
                indexMap = this.currentModalIndexMap;
            }

            // Buscar en el mapeo numerado (global o del modal)
            const entry = (indexMap || []).find(e => e.number === num);
            if (!entry) {
                const msg = `Elemento número ${num} no encontrado.`;
                this.speak(msg, this.defaultLang);
                return;
            }

            const elemLang = (entry.el && (entry.el.dataset?.a11yLang || entry.el.lang)) || this.defaultLang;

            // Manejo por tipo de entrada en el mapeo
            if (entry.type === 'element') {
                const element = entry.el;
                const tag = element.tagName.toLowerCase();
                const type = element.type || '';
                const role = element.getAttribute && element.getAttribute('role');

                // Botones
                if (tag === 'button' || role === 'button' || element.onclick) {
                    const btnText = this.getElementTextWithoutBadge(element);
                    const feedbackText = `Activando: ${btnText}`;
                    this.speak(feedbackText, elemLang);
                    try { element.click(); } catch (e) { element.dispatchEvent(new Event('click')); }
                    return;
                }

                // Enlaces
                if ((tag === 'a' && element.href) || role === 'link') {
                    const linkText = this.getElementTextWithoutBadge(element);
                    const feedbackText = `Abriendo enlace: ${linkText}`;
                    this.speak(feedbackText, elemLang);
                    try { element.click(); } catch (e) { window.location.href = element.href || '#'; }
                    return;
                }

                // Inputs y textarea -> entrar en modo edición silenciosamente
                if ((tag === 'input' && ['text', 'email', 'password', 'search', 'number', 'tel'].includes(type)) || tag === 'textarea') {
                    // Si el input tiene placeholder útil, mencionarlo; sino, silencio
                    const placeholder = element.placeholder ? ` ${element.placeholder}` : '';
                    this.enterInputEditMode(element);
                    this.speak('Modo edición' + placeholder, elemLang);
                    return;
                }

                // Select -> abrir select en modo navegación (similar a Lectura por Secciones)
                if (tag === 'select') {
                    try { this.openSelectMode(element); } catch (e) {}
                    const currentOption = element.options[element.selectedIndex];
                    const currentText = currentOption ? currentOption.text : 'Sin selección';
                    this.speak(`Lista: ${entry.text || 'opciones'}. Opción actual: ${currentText}. Usa flechas para navegar y Enter para seleccionar.`, elemLang);
                    // NO mostrar badges de opciones; el usuario navega con flechas
                    return;
                }

                // Media
                if (tag === 'audio' || tag === 'video') {
                    this.toggleMediaPlayback(element);
                    this.speak('Reproduciendo/pausando', elemLang);
                    return;
                }

                // Slider
                if (element.classList && (element.classList.contains('swiper') || element.classList.contains('carousel')) || (element.getAttribute && element.getAttribute('role') === 'region' && element.getAttribute('aria-roledescription') === 'carousel')) {
                    this.enterSliderMode(element);
                    this.speak('Entrando en modo slider', elemLang);
                    return;
                }

                // Tablas, fieldsets, images y genéricos: leer con extractor
                if (tag === 'table') { this.speak(this.readTable(element), elemLang); return; }
                if (tag === 'fieldset') { this.speak(this.readFieldset(element), elemLang); return; }
                if (tag === 'img' && element.alt) { this.speak(`Imagen: ${element.alt}`, elemLang); return; }
                const text = this.getElementReadableText(element);
                if (text) { this.speak(text, elemLang); return; }

                this.speak(`Elemento ${num}: Sin contenido legible.`, elemLang);
                return;
            }

            // fallback
            this.speak('Acción no soportada para este número', this.defaultLang);
        }

        // ==================== NAVEGACIÓN ====================
        // Construir lista de elementos SOLO dentro de un modal y retornar mapeo numerado
        buildReadableElementsInModal(modal) {
            if (!modal) return [];
            
            const baseSelector = 'p, li, h1, h2, h3, h4, h5, h6, button, a, img[alt], [data-a11y-readable]';
            const formSelector = 'input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="number"], textarea, select';
            const educationSelector = 'table, fieldset, legend, label, .question, .quiz, .form-group, [data-a11y-form]';
            
            const fullSelector = `${baseSelector}, ${formSelector}, ${educationSelector}`;
            
            this.readableElements = Array.from(modal.querySelectorAll(fullSelector))
                .filter(el => {
                    if (el.dataset && el.dataset.a11yRead === 'false') return false;
                    if (el.hasAttribute && el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') return false;
                    if (el.hidden) return false;
                    let p = el.parentElement;
                    // CRÍTICO: parar en el modal para evitar while infinito
                    while (p && p !== modal) {
                        if (p.hasAttribute && p.hasAttribute('aria-hidden') && p.getAttribute('aria-hidden') === 'true') return false;
                        p = p.parentElement;
                    }
                    // IMPORTANTE: Para el menú, NO verificar offsetParent (está fixed y será null)
                    // Para otros modales, sí verificar que el modal sea visible
                    const isMenu = modal.id === 'menu-item';
                    if (!isMenu && modal.offsetParent === null) return false;
                    
                    try {
                        const st = window.getComputedStyle(el);
                        if (st && (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0)) return false;
                    } catch (e) { }
                    return true;
                });

            // MEJORADO: Crear mapeo numerado para elementos del modal
            const modalIndexMap = [];
            const seen = new Set();
            let counter = 1;

            this.readableElements.forEach(el => {
                if (seen.has(el)) return;

                const tag = el.tagName.toLowerCase();
                let elementText = this.getElementTextWithoutBadge(el) || el.innerText || el.alt || '';

                // Para inputs/textareas: buscar contenido descriptivo real
                if ((tag === 'input' || tag === 'textarea') && !elementText) {
                    if (el.id) {
                        const label = modal.querySelector(`label[for="${el.id}"]`);
                        if (label) elementText = label.textContent.trim();
                    }
                    if (!elementText) {
                        // Buscar en elementos cercanos dentro del modal
                        let parent = el.parentElement;
                        let depth = 0;
                        while (parent && depth < 3 && parent !== modal) {
                            const nearbyText = parent.querySelector('p:not(.sr-only), span:not(.sr-only), label');
                            if (nearbyText && nearbyText !== el) {
                                elementText = nearbyText.textContent.trim();
                                if (elementText) break;
                            }
                            parent = parent.parentElement;
                            depth++;
                        }
                    }
                    if (!elementText) return; // Skip si no tiene contenido
                }

                seen.add(el);
                modalIndexMap.push({ number: counter++, type: 'element', el, text: elementText });
            });

            return modalIndexMap;
        }
        
        /**
         * Agrupar elementos de texto consecutivos bajo un solo badge (optimizado tipo Annyang)
         * VERSIÓN AGRESIVA: Ignora elementos menores (span, b, i, etc.) y agrupa sin límite de caracteres
         * Idea: h1 + p + p + span + p = 1 badge (ignora span), ul + lis = 1 badge, etc.
         */
        groupConsecutiveTextElements(elements) {
            const groups = [];
            const processed = new Set();

            // Elementos que SIEMPRE tienen badge individual (no se agrupan)
            const alwaysIndividual = [
                'button', 'input', 'textarea', 'select', 
                'audio', 'video', 'a', 'table', 'img'
            ];

            // Elementos "menores" que se IGNORAN (no rompen agrupación, no se procesan como elementos)
            const ignoreElements = [
                'span', 'b', 'i', 'strong', 'em', 'br', 'hr',
                'small', 'mark', 'code', 'kbd', 'samp', 'var',
                'sub', 'sup', 'ins', 'del', 'u', 's'
            ];

            elements.forEach((el, idx) => {
                if (processed.has(el)) return;

                const tag = el.tagName.toLowerCase();
                
                // Si es un elemento que se ignora, saltarlo (no procesarlo)
                if (ignoreElements.includes(tag)) {
                    return;
                }

                // Si es elemento individual obligatorio
                if (alwaysIndividual.includes(tag)) {
                    groups.push({
                        type: 'single',
                        elements: [el],
                        representative: el
                    });
                    processed.add(el);
                    return;
                }

                // Para headings, agrupar AGRESIVAMENTE con elementos siguientes
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                    const group = [el];
                    processed.add(el);

                    // Buscar elementos de texto que sigan al heading - SIN LÍMITE DE CARACTERES
                    let currentIdx = idx + 1;
                    while (currentIdx < elements.length) {
                        const nextEl = elements[currentIdx];
                        
                        // Si ya fue procesado, parar
                        if (processed.has(nextEl)) break;

                        const nextTag = nextEl.tagName.toLowerCase();
                        
                        // Ignorar elementos menores (no agregarlos al grupo, solo saltarlos)
                        if (ignoreElements.includes(nextTag)) {
                            currentIdx++;
                            continue;
                        }
                        
                        // Si es otro heading diferente, parar aquí
                        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(nextTag)) {
                            break;
                        }

                        // Incluir p, li, ul, ol, div, label, fieldset que sigan al heading
                        // SIN LÍMITE DE CARACTERES - agrupa todo
                        if (['p', 'li', 'ul', 'ol', 'div', 'label', 'fieldset'].includes(nextTag)) {
                            group.push(nextEl);
                            processed.add(nextEl);
                            currentIdx++;
                        } else if (alwaysIndividual.includes(nextTag)) {
                            // Si encontramos un botón/input, parar aquí
                            break;
                        } else {
                            // Otro elemento desconocido, parar
                            break;
                        }
                    }

                    groups.push({
                        type: 'group',
                        elements: group,
                        representative: el // usar el heading como representante
                    });
                    return;
                }

                // Para ul/ol, agrupar todos sus lis internos
                if (['ul', 'ol'].includes(tag)) {
                    const listItems = Array.from(el.querySelectorAll(':scope > li'))
                        .filter(li => !processed.has(li));
                    
                    const group = [el, ...listItems];
                    group.forEach(e => processed.add(e));

                    groups.push({
                        type: 'group',
                        elements: group,
                        representative: el
                    });
                    return;
                }

                // Para párrafos y divs sueltos que no fueron agrupados
                if (['p', 'div'].includes(tag)) {
                    groups.push({
                        type: 'single',
                        elements: [el],
                        representative: el
                    });
                    processed.add(el);
                    return;
                }

                // Para otros elementos (fallback)
                groups.push({
                    type: 'single',
                    elements: [el],
                    representative: el
                });
                processed.add(el);
            });

            return groups;
        }

        // MEJORADO: buildReadableElementsList() - Versión optimizada con agrupación AGRESIVA
        // Captura todos los elementos interactivos y legibles de la página
        // Ignora elementos menores (span, b, i) que no rompen agrupación
        buildReadableElementsList() {
            // ESTRATEGIA INTELIGENTE: SOLO headings + elementos interactivos
            // Los párrafos/contenido se IGNORAN (no son badges)
            // Esto replica el patrón de Annyang donde solo headings y botones tienen badges
            const selectors = [
                // HEADINGS - SIEMPRE tienen badge
                'h1, h2, h3, h4, h5, h6',
                
                // ELEMENTOS INTERACTIVOS - SIEMPRE tienen badge
                'button, a[href]',
                'input[type="button"], input[type="submit"], input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="number"], input[type="tel"]',
                'textarea, select',
                '[role="button"], [role="link"], [role="tab"]',
                
                // MEDIA
                'audio, video',
                
                // TABLAS
                'table',
                
                // ELEMENTOS ESTRUCTURALES ESPECIALES
                'fieldset',
                
                // CONTENIDO SOLO SI TIENE ATRIBUTO ESPECIAL
                '[data-a11y-readable], [data-interactive="true"]'
            ];

            const fullSelector = selectors.join(', ');

            // Mantener readableElements para otras funcionalidades (array de elementos DOM)
            this.readableElements = Array.from(document.querySelectorAll(fullSelector))
                .filter(el => {
                    // Excluir elementos del widget mismo
                    if (el.closest && el.closest('#accessibility-widget')) return false;
                    
                    // Excluir elementos del menú
                    if (el.closest && el.closest('#menu-item')) return false;
                    
                    // Respetar atributo data-a11y-read="false"
                    if (el.dataset && el.dataset.a11yRead === 'false') return false;
                    
                    // Excluir aria-hidden
                    if (el.hasAttribute && el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') return false;
                    
                    // Excluir hidden
                    if (el.hidden) return false;
                    
                    // Excluir elementos dentro de aria-hidden
                    let p = el.parentElement;
                    while (p) {
                        if (p.hasAttribute && p.hasAttribute('aria-hidden') && p.getAttribute('aria-hidden') === 'true') return false;
                        p = p.parentElement;
                    }
                    
                    // Excluir elementos no renderizados
                    if (el.offsetParent === null) return false;
                    
                    // Excluir elementos con display:none, visibility:hidden, opacity:0
                    try {
                        const st = window.getComputedStyle(el);
                        if (st && (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0)) {
                            return false;
                        }
                    } catch (e) { /* ignore */ }
                    
                    return true;
                });

            // Construir mapeo numerado directamente (sin agrupación, ya hemos sido selectivos)
            this.numberedIndexMap = [];
            let counter = 1; // empezamos en 1 (0 reservado para el widget toggle)
            const seen = new WeakSet();

            this.readableElements.forEach(el => {
                const tag = el.tagName.toLowerCase();

                // Evitar duplicados
                if (seen.has(el)) return;

                // Obtener texto del elemento
                let elementText = this.getElementTextWithoutBadge(el) || el.innerText || el.alt || el.title || '';
                elementText = elementText.trim();

                // IMPORTANTE: Para inputs/textareas, intentar encontrar label asociado
                if ((tag === 'input' || tag === 'textarea') && !elementText) {
                    // Buscar label por id
                    if (el.id) {
                        const label = document.querySelector(`label[for="${el.id}"]`);
                        if (label) {
                            elementText = label.textContent.trim();
                        }
                    }

                    // Si aún no hay texto, buscar en elemento padre
                    if (!elementText && el.parentElement) {
                        const parentText = el.parentElement.innerText;
                        if (parentText && parentText.length < 200) {
                            elementText = parentText.replace(el.value || '', '').trim();
                        }
                    }

                    // Si NO tiene contenido legible, IGNORAR
                    if (!elementText) {
                        return;
                    }
                }

                // IMPORTANTE: Excluir elementos sin texto legible (excepto img/audio/video)
                if (!elementText && tag !== 'img' && tag !== 'audio' && tag !== 'video') {
                    return;
                }

                // Marcar como visto
                seen.add(el);

                // Agregar al mapeo
                this.numberedIndexMap.push({
                    number: counter++,
                    type: 'element',
                    el: el,
                    text: elementText,
                    groupType: 'single',
                    groupElements: [el]
                });
            });

            console.log(`[A11Y-DEBUG] buildReadableElementsList: ${this.numberedIndexMap.length} elementos detectados (ESTRATEGIA SELECTIVA: solo headings + interactivos)`);
        }
        
        // Encontrar label asociado a un input
        findAssociatedLabel(input) {
            if (!input) return null;
            const inputId = input.id;
            if (inputId) {
                const label = document.querySelector(`label[for="${inputId}"]`);
                if (label) return label;
            }
            // Buscar label padre
            let parent = input.parentElement;
            while (parent) {
                if (parent.tagName === 'LABEL') return parent;
                parent = parent.parentElement;
            }
            return null;
        }

        enableKeyboardNavigation() {
            document.addEventListener('keydown', (e) => {
                const el = document.activeElement;

                // 0. PRIORITARIO: Manejo de selectOpenMode (dropdown abierto)
                if (this.selectOpenMode) {
                    if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
                        e.preventDefault();
                        this.navigateSelectOption('up');
                        return;
                    }
                    if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                        this.navigateSelectOption('down');
                        return;
                    }
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.confirmSelectOption();
                        return;
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this.closeSelectMode();
                        return;
                    }
                    // No permitir otras keys en selectOpenMode
                    return;
                }

                // 1. Manejo de modo edición en inputs
                if (this.inputEditMode) {
                    // En modo edición, Escape sale
                    if (e.key === 'Escape') {
                        this.exitInputEditMode(el);
                        e.preventDefault();
                        return;
                    }
                    // En modo edición, permitir escritura normal
                    return;
                }

                // 2. FLECHAS: Solo funcionan si sectionReadingMode está ACTIVO
                if (!this.sectionReadingMode) {
                    // Si no estamos en modo lectura por secciones, no procesar flechas
                    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
                        return;
                    }
                }

                // 2.5 MANEJO DE SLIDERS - Si estamos en modo de navegación de slider
                if (this.sliderOpenMode && this.currentSliderElement) {
                    // Navegar slides con flechas
                    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
                        e.preventDefault();
                        this.navigateSlider(this.currentSliderElement, 'next');
                        return;
                    }
                    if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
                        e.preventDefault();
                        this.navigateSlider(this.currentSliderElement, 'prev');
                        return;
                    }
                    // Escape para salir del modo slider
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this.exitSliderMode();
                        return;
                    }
                    // Enter para interactuar con contenido del slide
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.interactWithSlideContent();
                        return;
                    }
                    // Tab para salir del slider
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        this.exitSliderMode();
                        // Mover al siguiente elemento
                        this.moveVirtualFocus(1);
                        return;
                    }
                    // No permitir otras acciones en modo slider
                    return;
                }

                // Navegar con flechas si sectionReadingMode está activo
                if (this.sectionReadingMode && ['ArrowDown', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    this.moveVirtualFocus(1);
                    return;
                }

                if (this.sectionReadingMode && ['ArrowUp', 'ArrowLeft'].includes(e.key)) {
                    e.preventDefault();
                    this.moveVirtualFocus(-1);
                    return;
                }

                // 3. Enter en modo lectura por secciones: Activar elementos
                if (e.key === 'Enter' && this.sectionReadingMode && this.virtualFocusIndex >= 0) {
                    e.preventDefault();
                    const currentEl = this.readableElements[this.virtualFocusIndex];
                    if (!currentEl) return;

                    const tag = currentEl.tagName.toLowerCase();
                    const type = currentEl.type || '';

                    // Botones y enlaces
                    if (tag === 'button' || tag === 'a' || currentEl.getAttribute('role') === 'button') {
                        currentEl.click();
                        
                        // Esperar a que se abra el modal/contenido (si lo hay)
                        setTimeout(() => {
                            const openedModal = this.findOpenedModal();

                            if (openedModal) {
                                // Guardar posición actual antes de entrar en modal
                                this.savedVirtualFocusIndex = this.virtualFocusIndex;
                                this.isModalOpen = true;
                                
                                // Reconstruir lista de elementos SOLO del modal
                                this.buildReadableElementsInModal(openedModal);
                                this.virtualFocusIndex = 0; // Resetear índice al modal
                                
                                // Leer el título o encabezado del modal si existe
                                const modalTitle = openedModal.querySelector('h1, h2, h3, [role="heading"], .modal-title, .title');
                                let titleText = '';

                                if (modalTitle && !this.shouldIgnoreElement(modalTitle)) {
                                    titleText = modalTitle.textContent.trim();
                                    if (titleText) titleText += '. ';
                                }

                                // Leer el contenido principal del modal
                                const contentText = openedModal.textContent.trim();
                                if (contentText) {
                                    const fullText = titleText + contentText;
                                    this.speak(fullText, this.defaultLang);
                                }
                                
                                // Empezar a monitorear el cierre del modal
                                this.startMonitoringModalClosure();
                            } else {
                                // Reconstruir lista general si no hay modal
                                this.buildReadableElementsList();
                            }
                        }, 300);
                    }
                    // Inputs editables
                    else if ((tag === 'input' && ['text', 'email', 'password', 'search', 'number', 'tel'].includes(type)) || tag === 'textarea') {
                        this.enterInputEditMode(currentEl);
                    }
                    // Selects - MEJORADO: Abrir en modo select en lugar de solo click
                    else if (tag === 'select') {
                        this.openSelectMode(currentEl);
                    }
                    // Audios y videos - Reproducir/Pausar
                    else if (tag === 'audio' || tag === 'video') {
                        this.toggleMediaPlayback(currentEl);
                    }
                    // Swipers/Sliders - MEJORADO: Entrar en modo slider en lugar de solo navegar
                    else if (currentEl.classList.contains('swiper') || currentEl.classList.contains('carousel') || currentEl.getAttribute('role') === 'region') {
                        this.enterSliderMode(currentEl);
                    }
                    return;
                }

                // 4. Escape para cerrar panel O cerrar modal si hay uno abierto
                if (e.key === 'Escape') {
                    // Primero chequear si estamos en modo slider
                    if (this.sliderOpenMode && this.currentSliderElement) {
                        e.preventDefault();
                        this.exitSliderMode();
                        return;
                    }
                    
                    const openedModal = this.findOpenedModal();
                    if (openedModal && this.sectionReadingMode) {
                        // Si hay modal abierto y estamos en modo de secciones, cerrarlo
                        const closeBtn = openedModal.querySelector('[data-dismiss="modal"], .close, .btn-close, [aria-label*="Cerrar"], [aria-label*="Close"]');
                        if (closeBtn) {
                            closeBtn.click();
                            // Esperar a que se cierre y restaurar posición
                            setTimeout(() => {
                                this.handleModalClosure();
                            }, 300);
                            return;
                        }
                    }
                    if (this.isOpen) {
                        this.closePanel();
                    }
                }

                // 5. Enter/Space en botones (solo fuera de modo lectura por secciones)
                if (!this.sectionReadingMode && (e.key === 'Enter' || e.key === ' ') && el &&
                    (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button')) {
                    // Solo permitir si es el botón toggle del widget
                    if (el.id === 'a11y-toggle-btn') {
                        e.preventDefault();
                        this.togglePanel();
                    }
                }
            });
        }

        // Entrar en modo edición de input
        enterInputEditMode(inputEl) {
            if (!inputEl) return;
            this.inputEditMode = true;
            inputEl.classList.add('a11y-input-edit-mode');
            inputEl.focus();

            const tag = inputEl.tagName.toLowerCase();
            const label = this.findAssociatedLabel(inputEl);
            const labelText = label ? label.textContent.trim() : '';
            const placeholder = inputEl.placeholder || '';
            const value = inputEl.value || '';

            let feedbackText = '';
            if (tag === 'input') {
                const type = inputEl.type || 'texto';
                feedbackText = `Modo edición activado. ${labelText ? labelText + '.' : ''} Entrada de ${type}. ${value ? 'Contiene: ' + value : placeholder ? 'Pista: ' + placeholder : 'Vacío'}. Presiona Escape para salir.`;
            } else if (tag === 'textarea') {
                feedbackText = `Modo edición activado. ${labelText ? labelText + '.' : ''} Área de texto. ${value ? 'Contiene: ' + value : 'Vacío'}. Presiona Escape para salir.`;
            }

            if (feedbackText) {
                this.speak(feedbackText, this.findClosestLang(inputEl) || this.defaultLang);
            }
        }

        // Salir de modo edición de input
        exitInputEditMode(inputEl) {
            if (!inputEl) return;
            this.inputEditMode = false;
            inputEl.classList.remove('a11y-input-edit-mode');
            // Remover el focus completamente para evitar que siga escribiendo
            inputEl.blur();

            const finalValue = inputEl.value || '';
            const feedbackText = `Modo edición cerrado. ${finalValue ? 'Valor guardado: ' + finalValue : 'Sin cambios'}. Regresando a navegación.`;
            this.speak(feedbackText, this.findClosestLang(inputEl) || this.defaultLang);
        }

        // ===== MANEJO DE SELECT (LISTAS DESPLEGABLES) =====
        // Abrir un select en modo navegación
        openSelectMode(selectEl) {
            if (!selectEl || selectEl.tagName !== 'SELECT') return;
            
            this.selectOpenMode = true;
            this.currentSelectElement = selectEl;
            selectEl.classList.add('a11y-input-edit-mode');
            
            // Usar selectEl.options en lugar de querySelectorAll para acceso correcto
            const options = selectEl.options;
            if (options.length === 0) {
                const lang = this.findClosestLang(selectEl) || this.defaultLang;
                this.speak('Lista desplegable vacía.', lang);
                return;
            }
            
            // Encontrar la opción seleccionada actualmente
            // selectedIndex es la propiedad correcta para select
            let currentIndex = selectEl.selectedIndex;
            if (currentIndex === -1) currentIndex = 0;
            
            this.currentOptionIndex = currentIndex;
            
            // Dar retroalimentación al usuario
            const totalOptions = options.length;
            const currentOption = options[currentIndex];
            const label = this.findAssociatedLabel(selectEl);
            const labelText = label ? label.textContent.trim() + '. ' : '';
            const lang = this.findClosestLang(selectEl) || this.defaultLang;
            
            const feedbackText = `${labelText}Lista desplegable abierta. Opción ${currentIndex + 1} de ${totalOptions}. ${currentOption.textContent.trim()}. Usa las flechas arriba y abajo para navegar, Enter para seleccionar, Escape para cancelar.`;
            this.speak(feedbackText, lang);
        }

        // Cerrar select sin cambiar la selección
        closeSelectMode() {
            if (!this.selectOpenMode || !this.currentSelectElement) return;
            
            const selectEl = this.currentSelectElement;
            const lang = this.findClosestLang(selectEl) || this.defaultLang;
            
            this.selectOpenMode = false;
            selectEl.classList.remove('a11y-input-edit-mode');
            selectEl.blur(); // Remover focus completamente
            this.currentSelectElement = null;
            this.currentOptionIndex = -1;
            
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            const feedbackText = `Lista desplegable cerrada. ${selectedOption ? 'Seleccionada: ' + selectedOption.textContent.trim() : 'Sin selección'}`;
            this.speak(feedbackText, lang);
        }

        // Navegar opciones con flechas
        navigateSelectOption(direction) {
            if (!this.selectOpenMode || !this.currentSelectElement) return;
            
            const selectEl = this.currentSelectElement;
            const options = selectEl.options;
            
            if (options.length === 0) return;
            
            // Mover el índice
            if (direction === 'down' || direction === 'right') {
                this.currentOptionIndex = (this.currentOptionIndex + 1) % options.length;
            } else if (direction === 'up' || direction === 'left') {
                this.currentOptionIndex = (this.currentOptionIndex - 1 + options.length) % options.length;
            }
            
            // Leer la opción actual
            const currentOption = options[this.currentOptionIndex];
            const lang = this.findClosestLang(selectEl) || this.defaultLang;
            const feedbackText = `Opción ${this.currentOptionIndex + 1} de ${options.length}. ${currentOption.textContent.trim()}`;
            this.speak(feedbackText, lang);
        }

        // Confirmar selección en select
        confirmSelectOption() {
            if (!this.selectOpenMode || !this.currentSelectElement) return;
            
            const selectEl = this.currentSelectElement;
            const options = selectEl.options;
            
            if (this.currentOptionIndex >= 0 && this.currentOptionIndex < options.length) {
                const selectedOption = options[this.currentOptionIndex];
                selectEl.value = selectedOption.value;
                
                const lang = this.findClosestLang(selectEl) || this.defaultLang;
                const feedbackText = `Opción seleccionada: ${selectedOption.textContent.trim()}`;
                this.speak(feedbackText, lang);
            }
            
            this.closeSelectMode();
        }

        // ===== MANEJO DE AUDIOS Y VIDEOS =====
        // Reproducir/Pausar un audio o video
        toggleMediaPlayback(mediaEl) {
            if (!mediaEl || !['audio', 'video'].includes(mediaEl.tagName.toLowerCase())) return;
            
            const lang = this.findClosestLang(mediaEl) || this.defaultLang;
            const type = mediaEl.tagName.toLowerCase();
            const typeLabel = type === 'audio' ? 'Audio' : 'Video';
            const title = mediaEl.title || mediaEl.getAttribute('aria-label') || 'Archivo multimedia';
            
            try {
                if (mediaEl.paused) {
                    // Reproducir
                    mediaEl.play();
                    const feedbackText = `${typeLabel} reproduciendo: ${title}`;
                    this.speak(feedbackText, lang);
                } else {
                    // Pausar
                    mediaEl.pause();
                    const feedbackText = `${typeLabel} pausado: ${title}`;
                    this.speak(feedbackText, lang);
                }
            } catch (error) {
                const errorText = `No se pudo reproducir ${typeLabel.toLowerCase()}: ${title}`;
                this.speak(errorText, lang);
            }
        }

        // ===== MANEJO DE SWIPERS/SLIDERS =====
        // Entrar en modo de navegación de slider
        enterSliderMode(sliderEl) {
            this.sliderOpenMode = true;
            this.currentSliderElement = sliderEl;
            
            // Reproducir sonido/feedback que se entró en modo slider
            const lang = this.findClosestLang(sliderEl) || this.defaultLang;
            this.speak('Modo de navegación de diapositivas activado. Use flechas para navegar, Enter para interactuar, Escape para salir.', lang);
            
            // Leer el contenido del slide actual
            setTimeout(() => {
                this.readSliderContent(sliderEl, lang);
            }, 500);
        }

        // Salir del modo de navegación de slider
        exitSliderMode() {
            if (this.sliderOpenMode) {
                this.sliderOpenMode = false;
                this.currentSliderElement = null;
                const lang = this.defaultLang;
                this.speak('Saliste del modo de navegación de diapositivas.', lang);
            }
        }

        // Interactuar con el contenido del slide actual
        interactWithSlideContent() {
            if (!this.currentSliderElement) return;

            const wrapper = this.currentSliderElement.querySelector('.swiper-wrapper');
            if (!wrapper) return;

            const activeSlide = wrapper.querySelector('.swiper-slide-active');
            if (!activeSlide) return;

            // Buscar elementos interactivos en el slide: botones, enlaces, inputs
            const interactiveElements = activeSlide.querySelectorAll(
                'button, a, input[type="text"], input[type="radio"], input[type="checkbox"], textarea, select'
            );

            if (interactiveElements.length === 0) {
                this.speak('No hay elementos interactivos en esta diapositiva.', this.defaultLang);
                return;
            }

            // Si hay un solo elemento, activarlo
            if (interactiveElements.length === 1) {
                const el = interactiveElements[0];
                const tag = el.tagName.toLowerCase();
                const type = el.type || '';

                if (tag === 'button' || tag === 'a') {
                    el.click();
                } else if (tag === 'input' && ['radio', 'checkbox'].includes(type)) {
                    el.click();
                } else if ((tag === 'input' && ['text', 'email', 'password', 'search', 'number', 'tel'].includes(type)) || tag === 'textarea') {
                    // Salir del modo slider para entrar en modo edición
                    this.exitSliderMode();
                    this.enterInputEditMode(el);
                } else if (tag === 'select') {
                    this.exitSliderMode();
                    this.openSelectMode(el);
                }
            } else {
                // Si hay múltiples elementos, avisar al usuario
                this.speak(`Hay ${interactiveElements.length} elementos interactivos en esta diapositiva. Use Tab para navegar entre ellos.`, this.defaultLang);
            }
        }

        // Navegar slides en un swiper/carousel
        navigateSlider(sliderEl, direction) {
            if (!sliderEl) return;
            
            const lang = this.findClosestLang(sliderEl) || this.defaultLang;
            
            // Detectar si es un Swiper
            if (sliderEl.classList.contains('swiper')) {
                // Buscar los botones de navegación - pueden estar dentro del swiper o cerca de él
                let nextBtn = sliderEl.querySelector('.swiper-button-next');
                let prevBtn = sliderEl.querySelector('.swiper-button-prev');
                
                // Si no encuentra los botones adentro, buscarlos en el contenedor padre
                if (!nextBtn || !prevBtn) {
                    const parent = sliderEl.parentElement;
                    if (parent) {
                        if (!nextBtn) nextBtn = parent.querySelector('.swiper-button-next');
                        if (!prevBtn) prevBtn = parent.querySelector('.swiper-button-prev');
                    }
                }
                
                if (direction === 'next' && nextBtn && !nextBtn.classList.contains('swiper-button-disabled')) {
                    nextBtn.click();
                    setTimeout(() => {
                        this.readSliderContent(sliderEl, lang);
                    }, 300);
                } else if (direction === 'prev' && prevBtn && !prevBtn.classList.contains('swiper-button-disabled')) {
                    prevBtn.click();
                    setTimeout(() => {
                        this.readSliderContent(sliderEl, lang);
                    }, 300);
                }
            }
        }

        // Leer el contenido del slide actual - MEJORADO
        readSliderContent(sliderEl, lang) {
            const wrapper = sliderEl.querySelector('.swiper-wrapper');
            if (!wrapper) return;
            
            // Encontrar el slide activo
            const activeSlide = wrapper.querySelector('.swiper-slide-active');
            if (!activeSlide) return;
            
            // Obtener índice del slide
            const allSlides = wrapper.querySelectorAll('.swiper-slide');
            let currentIndex = 0;
            allSlides.forEach((slide, index) => {
                if (slide === activeSlide) currentIndex = index + 1;
            });
            
            const totalSlides = allSlides.length;
            const positionText = `Diapositiva ${currentIndex} de ${totalSlides}`;
            
            // Estrategia mejorada para extraer contenido:
            // 1. Buscar contenido etiquetado con clases específicas
            let content = activeSlide.querySelector('.swiper-content, .content_swip2, .content_slide');
            
            // 2. Si no hay contenedor específico, buscar el contenedor principal
            if (!content) {
                content = activeSlide.querySelector('.container-section-content') || activeSlide;
            }
            
            // 3. Extraer texto de manera inteligente
            let textContent = '';
            if (content) {
                // Obtener texto de elementos de texto visible (no audios, no scripts)
                const exclude = ['script', 'style', 'audio', 'video', '.sr-only', '[aria-hidden="true"]'];
                
                const textElements = content.querySelectorAll(
                    'p, h1, h2, h3, h4, h5, h6, li, td, span, .titulo, .titulo-modulo, label, div[role="heading"]'
                );
                
                const textParts = [];
                textElements.forEach(el => {
                    // Saltar elementos ocultos
                    if (el.classList.contains('sr-only') || el.getAttribute('aria-hidden') === 'true') {
                        return;
                    }
                    
                    let text = '';
                    // Para párrafos e encabezados, obtener solo el texto directo
                    if (el.children.length === 0) {
                        text = el.textContent.trim();
                    } else {
                        // Para elementos con hijos, obtener texto de nodos de texto directos
                        text = Array.from(el.childNodes)
                            .filter(node => node.nodeType === Node.TEXT_NODE)
                            .map(node => node.textContent.trim())
                            .join(' ');
                    }
                    
                    if (text && text.length > 0) {
                        textParts.push(text);
                    }
                });
                
                textContent = textParts.join('. ');
            }
            
            // 4. Construir mensaje final
            let feedbackText = positionText;
            if (textContent) {
                // Limitar a 300 caracteres para no hablar demasiado
                const shortText = textContent.substring(0, 300);
                feedbackText += `. ${shortText}${textContent.length > 300 ? '...' : ''}`;
            }
            
            this.speak(feedbackText, lang);
        }

        moveVirtualFocus(step) {
            if (!this.readableElements.length) {
                this.buildReadableElementsList();
            }

            this.virtualFocusIndex += step;

            // Ciclar índice
            if (this.virtualFocusIndex >= this.readableElements.length) this.virtualFocusIndex = 0;
            if (this.virtualFocusIndex < 0) this.virtualFocusIndex = this.readableElements.length - 1;

            const el = this.readableElements[this.virtualFocusIndex];
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.moveHighlightToElement(el);
            this.moveReadingLineToElement(el);
            
            // Leer con contexto (si es input, incluir label)
            this.readElementContentWithContext(el);
        }
        
        // Leer elemento con su contexto (ej: label + input)
        readElementContentWithContext(el) {
            // Usar la lógica mejorada de readElementContent que ya incluye contexto
            this.readElementContent(el);
        }

        // Obtener texto del elemento sin incluir badge de voz
        getElementTextWithoutBadge(el) {
            // Clonar el elemento para no modificar el original
            const cloned = el.cloneNode(true);
            // Remover badge numérico si existe
            const badge = cloned.querySelector('.a11y-number-badge');
            if (badge) badge.remove();
            return cloned.textContent.trim();
        }

        // Extraer texto legible de un elemento (sin hablar)
        // Usado por tanto "Lectura por Secciones" como "Leer Página"
        getElementReadableText(el) {
            let text = '';
            const tag = el.tagName.toLowerCase();
            const type = el.type || '';

            // Manejo especial para elementos complejos
            if (tag === 'table') {
                text = this.readTable(el);
            } else if (tag === 'fieldset') {
                text = this.readFieldset(el);
            } else if (tag === 'input' && ['text', 'email', 'password', 'search', 'number', 'tel'].includes(type)) {
                // Input de texto/email/password/etc
                const label = this.findAssociatedLabel(el);
                const labelText = label ? label.textContent.trim() : '';
                const placeholder = el.placeholder || '';
                const value = el.value || '';
                const required = el.required ? ' requerido' : '';
                text = `Entrada de ${type}: ${labelText}. ${value ? 'Valor actual: ' + value : placeholder ? 'Pista: ' + placeholder : 'Vacío'}${required}`;
            } else if (tag === 'textarea') {
                // Textarea
                const label = this.findAssociatedLabel(el);
                const labelText = label ? label.textContent.trim() : '';
                const placeholder = el.placeholder || '';
                const value = el.value || '';
                const required = el.required ? ' requerido' : '';
                text = `Área de texto: ${labelText}. ${value ? 'Valor actual: ' + value : placeholder ? 'Pista: ' + placeholder : 'Vacío'}${required}`;
            } else if (tag === 'select') {
                // Select / combo box
                const label = this.findAssociatedLabel(el);
                const labelText = label ? label.textContent.trim() : '';
                const selectedOption = el.options[el.selectedIndex];
                const selectedText = selectedOption ? selectedOption.textContent.trim() : 'Sin selección';
                const required = el.required ? ' requerido' : '';
                const optionCount = el.options.length;
                text = `Selector: ${labelText}. Seleccionado: ${selectedText}. ${optionCount} opciones disponibles${required}`;
            } else if (tag === 'button') {
                // Botón - SIN incluir el badge numérico
                const buttonText = this.getElementTextWithoutBadge(el);
                text = `Botón: ${buttonText}`;
            } else if (tag === 'a' && el.href) {
                // Enlace - SIN incluir el badge numérico
                const href = el.href || '';
                const isExternal = href && !href.startsWith(window.location.origin);
                const external = isExternal ? ' Enlace externo.' : '';
                const linkText = this.getElementTextWithoutBadge(el);
                text = `Enlace: ${linkText}.${external}`;
            } else if (tag === 'img' && el.alt) {
                // Imagen con alt
                text = `Imagen: ${el.alt}`;
            } else if (tag === 'label') {
                text = this.readLabel(el);
            } else if (el.classList.contains('question') || el.classList.contains('quiz')) {
                text = this.readQuestion(el);
            } else if (tag === 'audio' || tag === 'video') {
                text = this.readMedia(el);
            } else if (el.getAttribute('role') === 'button') {
                // Botón con role attribute - SIN incluir el badge numérico
                const buttonText = this.getElementTextWithoutBadge(el);
                text = `Botón: ${buttonText}`;
            } else if (el.getAttribute('role') === 'link') {
                // Link con role attribute - SIN incluir el badge numérico
                const linkText = this.getElementTextWithoutBadge(el);
                text = `Enlace: ${linkText}`;
            } else if (el.hasAttribute('aria-label')) {
                text = el.getAttribute('aria-label');
            } else if (el.hasAttribute('aria-describedby')) {
                const descId = el.getAttribute('aria-describedby');
                const descEl = document.getElementById(descId);
                if (descEl) text = descEl.textContent.trim();
            } else if (/h[1-6]/.test(tag)) {
                // Encabezado - SIN incluir el badge numérico
                const headingText = this.getElementTextWithoutBadge(el);
                text = `Encabezado nivel ${tag[1]}. ${headingText}`;
            } else {
                // Texto genérico - SIN incluir el badge numérico
                const textContent = this.getElementTextWithoutBadge(el);
                if (textContent) {
                    text = textContent;
                }
            }

            return text;
        }

        readElementContent(el) {
            const elemLang = el.dataset?.a11yLang || el.lang || this.findClosestLang(el) || this.defaultLang;
            const text = this.getElementReadableText(el);

            if (!text) return;

            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = elemLang;
            utter.rate = this.currentReadingRate;
            const voices = this.speechSynthesis.getVoices();
            const voice = voices.find(v => v.lang.startsWith(elemLang.split('-')[0])) || voices[0];
            if (voice) utter.voice = voice;

            this.speechSynthesis.cancel();
            this.speechSynthesis.speak(utter);
        }
        
        // Leer tabla
        readTable(table) {
            let result = 'Tabla. ';
            const rows = table.querySelectorAll('tr');
            let rowCount = 0;
            
            rows.forEach((row, idx) => {
                const cells = row.querySelectorAll('th, td');
                const rowText = Array.from(cells).map(cell => cell.textContent.trim()).join(', ');
                if (rowText.trim()) {
                    if (idx === 0) {
                        result += `Encabezados: ${rowText}. `;
                    } else {
                        result += `Fila ${rowCount + 1}: ${rowText}. `;
                        rowCount++;
                    }
                }
            });
            return result || 'Tabla vacía';
        }
        
        // Leer fieldset (grupo de formulario)
        readFieldset(fieldset) {
            const legend = fieldset.querySelector('legend');
            let result = legend ? `Grupo de formulario: ${legend.textContent.trim()}. ` : 'Grupo de formulario. ';
            return result;
        }
        
        // Leer label
        readLabel(label) {
            const forId = label.getAttribute('for');
            let result = label.textContent.trim();
            if (forId) {
                const input = document.getElementById(forId);
                if (input) {
                    result += `. ${this.readFormElement(input, true)}`;
                }
            }
            return result;
        }
        
        // Leer elemento de formulario
        readFormElement(input, skipText = false) {
            let result = '';
            const label = this.findAssociatedLabel(input);
            const type = input.type || 'texto';
            const placeholder = input.placeholder || '';
            const value = input.value || '';
            const required = input.required ? ' requerido' : '';
            
            if (label && !skipText) {
                result = `${label.textContent.trim()}. `;
            }
            
            if (input.tagName === 'SELECT') {
                result += `Lista desplegable${required}. `;
                const options = input.querySelectorAll('option');
                if (options.length > 0) {
                    result += `Opciones: ${Array.from(options).map(o => o.textContent.trim()).join(', ')}`;
                }
            } else if (input.tagName === 'TEXTAREA') {
                result += `Área de texto${required}. ${placeholder ? `Sugerencia: ${placeholder}. ` : ''}${value ? `Contenido actual: ${value}` : 'Vacío'}`;
            } else {
                result += `Entrada de tipo ${type}${required}. ${placeholder ? `Sugerencia: ${placeholder}` : 'Sin sugerencia'}`;
            }
            
            return result.trim();
        }
        
        // Leer pregunta (para cuestionarios)
        readQuestion(question) {
            const questionText = question.textContent.trim();
            const options = question.querySelectorAll('input[type="radio"], input[type="checkbox"], .option, [data-option]');
            
            let result = `Pregunta: ${questionText}. `;
            if (options.length > 0) {
                result += `Opciones: ${Array.from(options).map((opt, idx) => {
                    const label = opt.closest('label') ? opt.closest('label').textContent.trim() : opt.textContent.trim();
                    return label || `Opción ${idx + 1}`;
                }).join(', ')}`;
            }
            return result;
        }
        
        // Leer media (audio/video)
        readMedia(media) {
            const src = media.src || media.querySelector('source')?.src || '';
            const title = media.title || media.getAttribute('aria-label') || 'Archivo multimedia';
            const type = media.tagName.toLowerCase();
            const isAudio = type === 'audio';
            
            // Obtener duración si está disponible
            let durationText = '';
            if (media.duration && media.duration !== Infinity) {
                const minutes = Math.floor(media.duration / 60);
                const seconds = Math.floor(media.duration % 60);
                durationText = ` Duración: ${minutes}:${seconds.toString().padStart(2, '0')}.`;
            }
            
            // Obtener estado de reproducción
            let statusText = '';
            if (media.paused) {
                statusText = ' Pausado.';
            } else {
                statusText = ' Reproduciéndose.';
            }
            
            const typeLabel = isAudio ? 'Audio' : 'Video';
            const instruction = ` Presiona Enter para ${media.paused ? 'reproducir' : 'pausar'}.`;
            
            return `${typeLabel}: ${title}.${durationText}${statusText}${instruction}`;
        }
        // ==================== HELPERS PARA DETECTAR CONTENIDO ABIERTO ====================
        findOpenedModal() {
            // ORDEN DE PRIORIDAD IMPORTANTE:
            // 1. Modales Bootstrap (.modal.show)
            // 2. Collapses abiertos (.collapse.show)
            // 3. Menú Sidebar (#menu-item.active)
            // 4. Otros diálogos semánticos
            
            // PRIMERO: Detectar MODAL DIALOGS de Bootstrap (máxima prioridad)
            try {
                const bootstrapModals = document.querySelectorAll('.modal.show');
                for (const modal of bootstrapModals) {
                    if (modal && modal.offsetHeight > 0 && modal.offsetParent !== null) {
                        const style = window.getComputedStyle(modal);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) !== 0) {
                            return modal;
                        }
                    }
                }
            } catch (e) { /* ignore */ }
            
            // SEGUNDO: Detectar COLLAPSES/ACCORDIONS abiertos
            try {
                const openCollapses = document.querySelectorAll('.collapse.show');
                for (const collapse of openCollapses) {
                    if (collapse && collapse.offsetHeight > 0 && collapse.offsetParent !== null) {
                        const style = window.getComputedStyle(collapse);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) !== 0) {
                            return collapse;
                        }
                    }
                }
            } catch (e) { /* ignore */ }
            
            // TERCERO: Detectar MENÚ SIDEBAR (#menu-item.active)
            // Este es el patrón que usan todas las páginas HTML
            try {
                const sidebar = document.getElementById('menu-item');
                console.log('[A11Y-DEBUG] findOpenedModal: Checking sidebar element:', sidebar);
                if (sidebar) {
                    // Para el menú, SOLO verificar que tenga clase 'active'
                    // (el menú existe siempre en el DOM pero solo está "abierto" cuando tiene active)
                    const hasActive = sidebar.classList.contains('active');
                    console.log('[A11Y-DEBUG] findOpenedModal: Sidebar - hasActive:', hasActive);
                    
                    if (hasActive) {
                        console.log('[A11Y-DEBUG] findOpenedModal: RETURNING SIDEBAR AS OPENED MODAL');
                        return sidebar;
                    }
                }
            } catch (e) { console.log('[A11Y-DEBUG] findOpenedModal: Error checking sidebar:', e); }
            
            // CUARTO: Detectar otros diálogos semánticos y modales genéricos
            const otherSelectors = [
                '[role="dialog"]:not([style*="display: none"])',
                '[role="alertdialog"]:not([style*="display: none"])',
                '[aria-modal="true"]',
                'dialog[open]',
                '.modal-content:not([style*="display: none"])',
                '.modal:not([style*="display: none"])',
                '[data-a11y-modal]'
            ];
            
            for (const selector of otherSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        if (element && element.offsetHeight > 0 && element.offsetParent !== null) {
                            const style = window.getComputedStyle(element);
                            if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) !== 0) {
                                return element;
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            }
            
            return null;
        }

        // Empezar a monitorear el cierre del modal
        startMonitoringModalClosure() {
            if (this.modalCheckInterval) clearInterval(this.modalCheckInterval);
            
            // Chequear cada 500ms si el modal se cerró
            this.modalCheckInterval = setInterval(() => {
                const openedModal = this.findOpenedModal();
                
                if (!openedModal && this.isModalOpen) {
                    // El modal se cerró
                    clearInterval(this.modalCheckInterval);
                    this.modalCheckInterval = null;
                    this.handleModalClosure();
                }
            }, 500);
        }

        // Manejar el cierre del modal y restaurar posición
        handleModalClosure() {
            if (!this.isModalOpen) return;
            
            this.isModalOpen = false;
            
            // Restaurar la lista de elementos general
            this.buildReadableElementsList();
            
            // Restaurar el índice guardado
            if (this.savedVirtualFocusIndex >= 0 && this.savedVirtualFocusIndex < this.readableElements.length) {
                this.virtualFocusIndex = this.savedVirtualFocusIndex;
                const restoredEl = this.readableElements[this.virtualFocusIndex];
                
                if (restoredEl) {
                    // Mover highlight al elemento restaurado
                    restoredEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.moveHighlightToElement(restoredEl);
                    this.moveReadingLineToElement(restoredEl);
                    
                    // Leer el elemento restaurado para confirmar
                    this.readElementContentWithContext(restoredEl);
                }
            } else {
                // Si no hay índice guardado válido, leer el primer elemento
                if (this.readableElements.length > 0) {
                    this.virtualFocusIndex = 0;
                    this.readElementContentWithContext(this.readableElements[0]);
                }
            }
            
            // Limpiar estado
            this.savedVirtualFocusIndex = -1;
        }

        // ==================== LECTURA DE ELEMENTOS INTERACTIVOS ====================
        enableInteractiveElementReading() {
            const interactiveSelector = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
            const interactiveElements = document.querySelectorAll(interactiveSelector);
            interactiveElements.forEach(el => {
                if (el.closest && el.closest('#accessibility-widget')) return;
                if (this.shouldIgnoreElement && this.shouldIgnoreElement(el)) return;
                // Sólo hablar si la lectura está activada explícitamente (Lectura por Secciones o Leer Página)
                const speakElement = () => {
                    if (!this.sectionReadingMode && !this.flowReadingActive) return;
                    let label = el.getAttribute('aria-label') || el.innerText || el.value || el.title || el.alt || 'Elemento interactivo';
                    const type = el.tagName.toLowerCase();
                    if (type === 'button') label = `Botón: ${label}`;
                    if (type === 'a') label = `Enlace: ${label}`;
                    if (type === 'input') label = `Entrada: ${label}`;
                    if (type === 'select') label = `Lista desplegable: ${label}`;
                    const elemLang = el.dataset?.a11yLang || el.lang || this.findClosestLang(el) || this.defaultLang;
                    this.speak(label, elemLang);
                };

                el.addEventListener('focus', () => speakElement());
                el.addEventListener('mouseenter', () => speakElement());
                el.addEventListener('click', () => speakElement());
                el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') speakElement(); });
            });
        }

        // ==================== COMANDOS DE VOZ ====================
        enableVoiceCommands() {
            if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                console.warn('El navegador no soporta comandos de voz.');
                return;
            }
            const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            try {
                this.recog = new Recognition();
                this.recog.lang = this.defaultLang || 'es-ES';
                this.recog.continuous = true;
                this.recog.onresult = (event) => {
                    const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
                    if (text.includes('leer página')) this.readPage();
                    if (text.includes('detener')) this.stopReading();
                    if (text.includes('siguiente')) this.moveVirtualFocus(1);
                    if (text.includes('anterior')) this.moveVirtualFocus(-1);
                    if (text.includes('abrir accesibilidad')) this.openPanel();
                    if (text.includes('cerrar accesibilidad')) this.closePanel();
                    if (text.includes('aumentar texto')) this.setFontSize('large');
                    if (text.includes('disminuir texto')) this.setFontSize('small');
                };
                this.recog.onerror = (e) => console.warn('Error STT:', e);
                this.recog.start();
            } catch (e) { console.warn('No se pudo iniciar reconocimiento de voz:', e); }
        }

        // ==================== HELPERS ====================
        findClosestLang(node) {
            let parent = node;
            while (parent && parent !== document.documentElement) {
                if (parent.lang) return parent.lang;
                if (parent.dataset && parent.dataset.a11yLang) return parent.dataset.a11yLang;
                parent = parent.parentElement;
            }
            return null;
        }

        // Devuelve true si el elemento o alguno de sus ancestros deben ser ignorados
        shouldIgnoreElement(el) {
            if (!el) return true;
            try {
                if (el.closest && el.closest('#accessibility-widget')) return true;
                if (el.dataset && el.dataset.a11yRead === 'false') return true;
                if (el.hasAttribute && el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') return true;
                if (el.hidden) return true;
                let p = el.parentElement;
                while (p) {
                    if (p.hasAttribute && p.hasAttribute('aria-hidden') && p.getAttribute('aria-hidden') === 'true') return true;
                    p = p.parentElement;
                }
                const st = window.getComputedStyle(el);
                if (st && (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0)) return true;
            } catch (e) { /* ignore errors */ }
            return false;
        }

        // ==================== REGLETA DE LECTURA ====================
        toggleReadingRuler() {
            this.readingRulerActive = !this.readingRulerActive;
            const btn = document.getElementById('a11y-reading-ruler-toggle');

            if (this.readingRulerActive) {
                // Crear regleta
                let ruler = document.getElementById('a11y-reading-ruler');
                if (!ruler) {
                    ruler = document.createElement('div');
                    ruler.id = 'a11y-reading-ruler';
                    document.body.insertBefore(ruler, document.body.firstChild);
                }

                // Rastrear movimiento del mouse para posicionar la regleta
                // Guardar la función en la clase para poder removerla después
                this.readingRulerListener = (e) => {
                    ruler.style.top = e.clientY + 'px';
                };

                document.addEventListener('mousemove', this.readingRulerListener);

                if (btn) {
                    btn.textContent = 'Desactivar Regleta de Lectura';
                    btn.classList.add('a11y-btn-active');
                }
            } else {
                // Remover regleta
                const ruler = document.getElementById('a11y-reading-ruler');

                // Remover el listener usando la referencia guardada en la clase
                if (this.readingRulerListener) {
                    document.removeEventListener('mousemove', this.readingRulerListener);
                    this.readingRulerListener = null;
                }

                if (ruler) {
                    ruler.remove();
                }

                if (btn) {
                    btn.textContent = 'Activar Regleta de Lectura';
                    btn.classList.remove('a11y-btn-active');
                }
            }
        }

        // ==================== RESALTAR HIPERVÍNCULOS ====================
        toggleHighlightLinks() {
            this.highlightLinksActive = !this.highlightLinksActive;
            const btn = document.getElementById('a11y-highlight-links-toggle');

            if (this.highlightLinksActive) {
                // Encontrar todos los links (excepto los del widget)
                const links = document.querySelectorAll('a:not(#accessibility-widget a)');

                links.forEach(link => {
                    if (!link.classList.contains('a11y-link-highlighted')) {
                        link.classList.add('a11y-link-highlighted');
                        // Guardar estilo original si es necesario
                        link.dataset.a11yOriginalStyle = link.getAttribute('style') || '';
                    }
                });

                if (btn) {
                    btn.textContent = 'Desactivar Resalte de Enlaces';
                    btn.classList.add('a11y-btn-active');
                }
            } else {
                // Remover resalte de todos los links
                const links = document.querySelectorAll('a.a11y-link-highlighted');

                links.forEach(link => {
                    link.classList.remove('a11y-link-highlighted');
                });

                if (btn) {
                    btn.textContent = 'Resaltar Enlaces';
                    btn.classList.remove('a11y-btn-active');
                }
            }
        }
    }

    // Inicialización automática
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new AccessibilityWidget());
    } else {
        new AccessibilityWidget();
    }
})();