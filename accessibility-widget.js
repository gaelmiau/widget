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
            this.sectionReadingMode = false; // NUEVO: controla si el nav con flechas está activo
            this.numberedVoiceMode = false; // NUEVO: modo de comandos por voz con números
            this.readingRulerActive = false; // NUEVO: regleta de lectura
            this.highlightLinksActive = false; // NUEVO: resalto de hipervínculos

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

            // ========== Idioma ==========
            this.defaultLang = 'es-ES';

            this.init();
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
            linkElement.href = 'accessibility-widget.css';
            document.head.appendChild(linkElement);
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
                            title="Accesibilidad - Opciones para mejorar la experiencia"
                            data-tooltip="Abre el panel de opciones de accesibilidad">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="8" r="1.5" fill="currentColor"></circle>
                            <path d="M8 14h8M12 12v6"></path>
                        </svg>
                    </button>

                    <div id="a11y-panel" class="a11y-panel" role="dialog" aria-labelledby="a11y-title" aria-hidden="true">
                        <div class="a11y-panel-header">
                            <h2 id="a11y-title">Opciones de Accesibilidad</h2>
                            <button id="a11y-close-btn" class="a11y-close-btn"
                                    aria-label="Cerrar panel"
                                    title="Cierra el panel de accesibilidad"
                                    data-tooltip="Cierra este panel">×</button>
                        </div>

                        <div class="a11y-panel-content">
                            <!-- Tamaño de Texto -->
                            <section class="a11y-section">
                                <h3>Tamaño de Texto</h3>
                                <div class="a11y-button-group" role="group" aria-label="Opciones de tamaño de texto">
                                    <button class="a11y-btn" data-font-size="small" aria-label="Texto pequeño" title="Reduce el texto" data-tooltip="Texto pequeño">A</button>
                                    <button class="a11y-btn" data-font-size="medium" aria-label="Texto mediano" title="Tamaño por defecto" data-tooltip="Texto mediano">A</button>
                                    <button class="a11y-btn a11y-btn-large" data-font-size="large" aria-label="Texto grande" title="Aumenta el texto" data-tooltip="Texto grande">A</button>
                                    <button class="a11y-btn a11y-btn-xlarge" data-font-size="xlarge" aria-label="Texto extra grande" title="Texto extra grande" data-tooltip="Texto extra grande">A</button>
                                </div>
                            </section>

                            <!-- Tipografia Dyslexia -->
                            <section class="a11y-section">
                                <h3>Modo Dislexia</h3>
                                <p class="a11y-help-text">Activa esta función para usar la tipografía OpenDyslexic, diseñada para facilitar la lectura en personas con dislexia.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-dyslexia-toggle" class="a11y-btn-primary" aria-label="Activar modo dislexia" title="Activa la tipografía OpenDyslexic para personas con dislexia" data-tooltip="Modo dislexia">Activar Modo Dislexia</button>
                                </div>
                            </section>

                            <!-- Tipografia Bionic Reading -->
                            <section class="a11y-section">
                                <h3>Modo Bionic Reading</h3>
                                <p class="a11y-help-text">Activa esta función para resaltar el inicio de las palabras y facilitar la lectura rápida y la comprensión del texto.</p>
                                <button class="a11y-btn-primary" id="a11y-bionic-btn" title="Lectura Biónica" data-tooltip="Resalta el inicio de las palabras">
                                    Bionic Reading
                                </button>
                            </section>

                            <!-- Temas -->
                            <section class="a11y-section">
                                <h3>Temas</h3>
                                <div class="a11y-theme-group" role="group" aria-label="Opciones de tema">
                                    <button class="a11y-theme-btn" data-theme="default" aria-label="Tema predeterminado" title="Tema normal" data-tooltip="Tema normal"><span class="theme-preview theme-default"></span><span>Predeterminado</span></button>
                                    <button class="a11y-theme-btn" data-theme="dark" aria-label="Tema oscuro" title="Modo oscuro" data-tooltip="Modo oscuro"><span class="theme-preview theme-dark"></span><span>Oscuro</span></button>
                                    <button class="a11y-theme-btn" data-theme="high-contrast-yellow" aria-label="Alto contraste amarillo" title="Alto contraste amarillo" data-tooltip="Alto contraste amarillo"><span class="theme-preview theme-yellow"></span><span>Alto contraste amarillo</span></button>
                                    <button class="a11y-theme-btn" data-theme="high-contrast-white" aria-label="Alto contraste blanco" title="Alto contraste blanco" data-tooltip="Alto contraste blanco"><span class="theme-preview theme-white"></span><span>Alto contraste blanco</span></button>
                                </div>
                            </section>

                            <!-- Tamaño del Puntero -->
                            <section class="a11y-section">
                                <h3>Tamaño del Puntero</h3>
                                <div class="a11y-button-group" role="group" aria-label="Opciones de tamaño del puntero">
                                    <button class="a11y-btn" data-cursor-size="default" aria-label="Puntero normal" title="Puntero normal" data-tooltip="Puntero normal">Normal</button>
                                    <button class="a11y-btn" data-cursor-size="large" aria-label="Puntero grande" title="Puntero grande" data-tooltip="Puntero grande">Grande</button>
                                    <button class="a11y-btn" data-cursor-size="xlarge" aria-label="Puntero extra grande" title="Puntero extra grande" data-tooltip="Puntero extra grande">Extra</button>
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
                                <p class="a11y-help-text">Selecciona texto y pulsa "Leer Selección" o usa "Leer Página". Puedes marcar elementos con <code>data-a11y-lang</code> para que se lean en otro idioma.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-read-selection" class="a11y-btn-primary" aria-label="Leer texto seleccionado" title="Lee el texto seleccionado" data-tooltip="Lee tu selección">Leer Selección</button>
                                    <button id="a11y-read-page" class="a11y-btn-primary" aria-label="Leer toda la página" title="Lee toda la página" data-tooltip="Lee toda la página">Leer Página</button>
                                    <button id="a11y-stop-reading" class="a11y-btn-secondary" aria-label="Detener lectura" title="Detiene la lectura" data-tooltip="Detener" disabled>Detener</button>
                                </div>
                            </section>

                            <!-- Lectura por Secciones -->
                            <section class="a11y-section">
                                <h3>Lectura por Secciones</h3>
                                <p class="a11y-help-text">Activa este modo para navegar con las flechas del teclado y escuchar cada sección.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-section-reading-toggle" class="a11y-btn-primary" aria-label="Iniciar lectura por secciones" title="Activa modo de lectura por secciones con navegación por flechas" data-tooltip="Lectura por secciones">Iniciar Lectura por Secciones</button>
                                </div>
                            </section>

                            <!-- Comandos de Voz por Números -->
                            <section class="a11y-section">
                                <h3>Comandos por Voz</h3>
                                <p class="a11y-help-text">Activa este modo para numerar elementos y controlarlos por voz. Dice un número para leer o interactuar con ese elemento.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-numbered-voice-toggle" class="a11y-btn-primary" aria-label="Activar comandos de voz por números" title="Activa números en elementos para control por voz" data-tooltip="Comandos por voz">Activar Comandos por Voz</button>
                                </div>
                            </section>

                            <!-- Regleta de Lectura -->
                            <section class="a11y-section">
                                <h3>Herramientas de Lectura</h3>
                                <p class="a11y-help-text">Activar regleta de lectura para guiar tu vista durante la lectura.</p>
                                <div class="a11y-tts-controls">
                                    <button id="a11y-reading-ruler-toggle" class="a11y-btn-primary" aria-label="Activar regleta de lectura" title="Activa una regleta horizontal para facilitar la lectura" data-tooltip="Regleta de lectura">Activar Regleta de Lectura</button>
                                    <button id="a11y-highlight-links-toggle" class="a11y-btn-primary" aria-label="Resaltar hipervínculos" title="Resalta todos los hipervínculos de la página" data-tooltip="Resaltar enlaces">Resaltar Enlaces</button>
                                </div>
                            </section>

                            <!-- Reset -->
                            <section class="a11y-section">
                                <button id="a11y-reset" class="a11y-btn-reset" aria-label="Restablecer" title="Restablece opciones" data-tooltip="Restablecer">Restablecer Todo</button>
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
            const closeBtn = document.getElementById('a11y-close-btn');
            if (closeBtn) closeBtn.focus();
        }

        closePanel() {
            const panel = document.getElementById('a11y-panel');
            if (panel) panel.classList.remove('open');
            this.isOpen = false;
            const toggleBtn = document.getElementById('a11y-toggle-btn');
            if (toggleBtn) toggleBtn.focus();
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
            this.stopReading();
            
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
                const tag = el.tagName.toLowerCase();
                const text = el.textContent.trim();

                this.moveHighlightToElement(el);
                this.moveReadingLineToElement(el);
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
                this.buildReadableElementsList();
                this.createNumberedLabels();
                btn.textContent = 'Desactivar Comandos por Voz';
                btn.classList.add('active');
                this.startNumberedVoiceRecognition();
                this.autoClosePanel();
            } else {
                // Desactivar modo
                this.removeNumberedLabels();
                btn.textContent = 'Activar Comandos por Voz';
                btn.classList.remove('active');
                this.stopNumberedVoiceRecognition();
            }
        }

        createNumberedLabels() {
            // El 0 es el botón del widget
            const toggleBtn = document.getElementById('a11y-toggle-btn');
            if (toggleBtn) {
                const badge = document.createElement('div');
                badge.className = 'a11y-number-badge';
                badge.textContent = '0';
                badge.setAttribute('data-a11y-number', '0');
                toggleBtn.appendChild(badge);
            }

            // Enumerar elementos legibles
            let num = 1;
            this.readableElements.forEach(el => {
                if (!el.closest || !el.closest('#accessibility-widget')) {
                    const badge = document.createElement('div');
                    badge.className = 'a11y-number-badge';
                    badge.textContent = num;
                    badge.setAttribute('data-a11y-number', num);
                    el.style.position = 'relative';
                    el.appendChild(badge);
                    el.setAttribute('data-a11y-index', num);
                    num++;
                }
            });

            // Guardar el total de elementos
            this.totalNumberedElements = num;
        }

        removeNumberedLabels() {
            document.querySelectorAll('.a11y-number-badge').forEach(badge => {
                badge.remove();
            });
            document.querySelectorAll('[data-a11y-index]').forEach(el => {
                el.removeAttribute('data-a11y-index');
                el.style.position = '';
            });
        }

        startNumberedVoiceRecognition() {
            if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                alert('Tu navegador no soporta reconocimiento de voz.');
                return;
            }

            const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            try {
                this.numberedVoiceRecog = new Recognition();
                this.numberedVoiceRecog.lang = this.defaultLang || 'es-ES';
                this.numberedVoiceRecog.continuous = true;
                this.numberedVoiceRecog.interimResults = true;

                this.numberedVoiceRecog.onresult = (event) => {
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript.toLowerCase().trim();
                        
                        // Palabras clave para desactivar
                        if (transcript.includes('desactivar') || transcript.includes('salir')) {
                            this.toggleNumberedVoiceMode();
                            return;
                        }

                        // Buscar números pronunciados
                        const numberWords = {
                            'cero': 0, 'zero': 0,
                            'uno': 1, 'one': 1,
                            'dos': 2, 'two': 2,
                            'tres': 3, 'three': 3,
                            'cuatro': 4, 'four': 4,
                            'cinco': 5, 'five': 5,
                            'seis': 6, 'six': 6,
                            'siete': 7, 'seven': 7,
                            'ocho': 8, 'eight': 8,
                            'nueve': 9, 'nine': 9,
                            'diez': 10, 'ten': 10
                        };

                        // Buscar números directos (0-9)
                        for (let num = 0; num < this.totalNumberedElements; num++) {
                            if (transcript.includes(num.toString()) || transcript.includes(numberWords[num.toString()])) {
                                this.handleNumberedVoiceCommand(num);
                                return;
                            }
                        }

                        // Buscar palabras de números
                        for (const [word, num] of Object.entries(numberWords)) {
                            if (transcript.includes(word) && num < this.totalNumberedElements) {
                                this.handleNumberedVoiceCommand(num);
                                return;
                            }
                        }
                    }
                };

                this.numberedVoiceRecog.onerror = (e) => {
                    console.warn('Error STT numerado:', e.error);
                };

                this.numberedVoiceRecog.start();
            } catch (e) {
                console.warn('No se pudo iniciar reconocimiento numerado:', e);
            }
        }

        stopNumberedVoiceRecognition() {
            if (this.numberedVoiceRecog) {
                try {
                    this.numberedVoiceRecog.abort();
                } catch (e) { /* ignore */ }
            }
        }

        handleNumberedVoiceCommand(num) {
            if (num === 0) {
                // Número 0: alternar panel
                this.togglePanel();
                return;
            }

            // Buscar el elemento con ese índice
            const element = document.querySelector(`[data-a11y-index="${num}"]`);
            if (!element) return;

            const tag = element.tagName.toLowerCase();
            
            // Si es interactivo (botón, enlace), hacer click
            if (['button', 'a'].includes(tag) || element.getAttribute('role') === 'button' || element.onclick) {
                element.click();
                return;
            }

            // Si es un elemento input, select, etc
            if (['input', 'select', 'textarea'].includes(tag)) {
                element.focus();
                return;
            }

            // Si no es interactivo, leer su contenido
            const elemLang = element.dataset?.a11yLang || element.lang || this.findClosestLang(element) || this.defaultLang;
            const text = element.textContent.trim();
            if (text) {
                this.speak(text, elemLang);
            }
        }

        // ==================== NAVEGACIÓN ====================
        buildReadableElementsList() {
            const selector = 'p, li, h1, h2, h3, h4, h5, h6, button, a, img[alt], [data-a11y-readable]';
            this.readableElements = Array.from(document.querySelectorAll(selector))
                .filter(el => {
                    // No leer el propio widget
                    if (el.closest && el.closest('#accessibility-widget')) return false;
                    // Soporte para opt-out explícito
                    if (el.dataset && el.dataset.a11yRead === 'false') return false;
                    // aria-hidden o hidden en elemento o ancestros
                    if (el.hasAttribute && el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') return false;
                    if (el.hidden) return false;
                    let p = el.parentElement;
                    while (p) {
                        if (p.hasAttribute && p.hasAttribute('aria-hidden') && p.getAttribute('aria-hidden') === 'true') return false;
                        p = p.parentElement;
                    }
                    // Visibilidad visual
                    if (el.offsetParent === null) return false;
                    try {
                        const st = window.getComputedStyle(el);
                        if (st && (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0)) return false;
                    } catch (e) { /* ignore */ }
                    return true;
                });
        }

        enableKeyboardNavigation() {
            document.addEventListener('keydown', (e) => {
                const el = document.activeElement;

                // 1. Enter/Space en botones y enlaces
                if ((e.key === 'Enter' || e.key === ' ') && el &&
                    (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button')) {
                    if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        el.click();
                    }
                }

                // 2. Escape para cerrar panel
                if (e.key === 'Escape' && this.isOpen) {
                    this.closePanel();
                }

                // 3. FLECHAS: Solo funcionan si sectionReadingMode está ACTIVO
                if (!this.sectionReadingMode) return;

                if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    this.moveVirtualFocus(1);
                }

                if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
                    e.preventDefault();
                    this.moveVirtualFocus(-1);
                }
            });
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
            this.readElementContent(el);
        }

        readElementContent(el) {
            const elemLang = el.dataset?.a11yLang || el.lang || this.findClosestLang(el) || this.defaultLang;
            let text = '';
            const tag = el.tagName.toLowerCase();
            if (tag === 'img') text = el.alt ? `Imagen: ${el.alt}` : 'Imagen sin descripción';
            else if (/h[1-6]/.test(tag)) text = `Encabezado nivel ${tag[1]}. ${el.textContent.trim()}`;
            else text = el.textContent.trim();
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

        // ==================== LECTURA DE ELEMENTOS INTERACTIVOS ====================
        enableInteractiveElementReading() {
            const interactiveSelector = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
            const interactiveElements = document.querySelectorAll(interactiveSelector);
            interactiveElements.forEach(el => {
                if (el.closest && el.closest('#accessibility-widget')) return;
                if (this.shouldIgnoreElement && this.shouldIgnoreElement(el)) return;
                const speakElement = () => {
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
                const updateRulerPosition = (e) => {
                    ruler.style.top = e.clientY + 'px';
                };
                
                document.addEventListener('mousemove', updateRulerPosition);
                ruler.dataset.listenerFunction = updateRulerPosition;
                
                if (btn) {
                    btn.textContent = 'Desactivar Regleta de Lectura';
                    btn.classList.add('a11y-btn-active');
                }
            } else {
                // Remover regleta
                const ruler = document.getElementById('a11y-reading-ruler');
                if (ruler) {
                    if (ruler.dataset.listenerFunction) {
                        document.removeEventListener('mousemove', ruler.dataset.listenerFunction);
                    }
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