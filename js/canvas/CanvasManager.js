/**
 * Менеджер Canvas - управление элементами canvas, перетаскиванием и взаимодействием
 * Содержит логику работы с холстом, зумом и позиционированием
 */

class CanvasManager {
    constructor() {
        this.canvasZoom = 1;
        this.cachedCanvasRect = null;
        this.pendingBlockPositions = new Map();
        this.blockPositionRaf = null;
        this.pendingConnectionUpdates = new Set();
        this.connectionUpdateRaf = null;
        this.blockDataUpdateTimeout = null;
        
        // Параметры перетаскивания холста
        this.isDraggingCanvas = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        
        this.initEventListeners();
    }

    // Инициализация обработчиков событий
    initEventListeners() {
        // Canvas drag and drop setup
        const canvas = document.getElementById('canvas');
        
        if (canvas) {
            canvas.addEventListener('dragover', (ev) => this.handleDragOver(ev));
            canvas.addEventListener('drop', (ev) => this.handleDrop(ev));
            canvas.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            
            // Перетаскивание холста
            canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
            canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
            canvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
            canvas.addEventListener('wheel', (e) => this.handleCanvasWheel(e));
        }

        // Обработчик изменения размера окна
        window.addEventListener('resize', () => this.handleWindowResize());
        
        // ResizeObserver для отслеживания изменений размера canvas
        if (canvas && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver((entries) => {
                // Используем debounce для избежания слишком частых обновлений
                if (this.observerDebounce) {
                    clearTimeout(this.observerDebounce);
                }
                this.observerDebounce = setTimeout(() => {
                    this.clearCanvasRectCache();
                    if (window.botBuilder && window.botBuilder.forceUpdateArrows) {
                        window.botBuilder.forceUpdateArrows();
                    } else if (window.updateArrows) {
                        window.updateArrows();
                    }
                }, 100);
            });
            this.resizeObserver.observe(canvas);
        }
    }

    // Обработка dragover события
    handleDragOver(ev) {
        ev.preventDefault();
        const canvas = ev.currentTarget;
        canvas.classList.add('drag-over');
    }

    // Обработка drop события для создания блоков
    handleDrop(ev) {
        ev.preventDefault();
        const canvas = ev.currentTarget;
        canvas.classList.remove('drag-over');
        
        const blockType = ev.dataTransfer.getData('text/plain');
        
        // Проверяем, что это валидный тип блока
        const validTypes = [
            'start', 'message', 'question', 'choice', 'condition', 'delay', 'variable', 'loop',
            // E-commerce блоки
            'image', 'inline_keyboard', 'calculation', 'cart', 'payment', 'database', 
            'catalog', 'order_form', 'notification', 'order_confirm',
            // Интеграции
            'chatgpt'
        ];
        
        if (!validTypes.includes(blockType)) {
            console.warn('Invalid block type dropped:', blockType);
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const x = (ev.clientX - rect.left - 125) / this.canvasZoom;
        const y = (ev.clientY - rect.top - 50) / this.canvasZoom;
        
        console.log('Creating block:', blockType, 'at', x, y);
        
        // Вызываем глобальную функцию создания блока
        if (window.createBlock) {
            window.createBlock(blockType, x, y);
        }
        
        if (window.hideEmptyMessage) {
            window.hideEmptyMessage();
        }
    }

    // Обработка dragleave события
    handleDragLeave(e) {
        const canvas = e.currentTarget;
        if (!canvas.contains(e.relatedTarget)) {
            canvas.classList.remove('drag-over');
        }
    }

    // Начало перетаскивания холста
    handleCanvasMouseDown(e) {
        // Проверяем, что клик не на блоке или элементе управления
        if (e.target.closest('.bot-block') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) {
            return;
        }
        
        this.isDraggingCanvas = true;
        this.dragStartX = e.clientX - this.canvasOffsetX;
        this.dragStartY = e.clientY - this.canvasOffsetY;
        
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    }

    // Перетаскивание холста
    handleCanvasMouseMove(e) {
        if (!this.isDraggingCanvas) return;
        
        this.canvasOffsetX = e.clientX - this.dragStartX;
        this.canvasOffsetY = e.clientY - this.dragStartY;
        
        const canvasContent = document.getElementById('canvas-content');
        if (canvasContent) {
            canvasContent.style.transform = `translate(${this.canvasOffsetX}px, ${this.canvasOffsetY}px) scale(${this.canvasZoom})`;
        }
        
        e.preventDefault();
    }

    // Окончание перетаскивания холста
    handleCanvasMouseUp() {
        if (this.isDraggingCanvas) {
            this.isDraggingCanvas = false;
            document.body.style.cursor = 'default';
            
            // Обновляем стрелочки после перетаскивания canvas
            setTimeout(() => {
                this.clearCanvasRectCache();
                if (window.botBuilder && window.botBuilder.forceUpdateArrows) {
                    window.botBuilder.forceUpdateArrows();
                } else if (window.updateArrows) {
                    window.updateArrows();
                }
            }, 50);
        }
    }

    // Обработка колеса мыши для зума
    handleCanvasWheel(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.setZoom(this.canvasZoom + delta);
        }
    }

    // Установка зума
    setZoom(newZoom) {
        this.canvasZoom = Math.max(0.1, Math.min(3, newZoom));
        
        const canvasContent = document.getElementById('canvas-content');
        if (canvasContent) {
            canvasContent.style.transform = `translate(${this.canvasOffsetX}px, ${this.canvasOffsetY}px) scale(${this.canvasZoom})`;
        }
        
        // Обновляем индикатор зума
        this.updateZoomIndicator();
        
        // Очищаем кеш прямоугольника canvas
        this.clearCanvasRectCache();
        
        // Принудительно обновляем стрелочки после изменения зума несколько раз
        const updateArrows = () => {
            if (window.botBuilder && window.botBuilder.forceUpdateArrows) {
                window.botBuilder.forceUpdateArrows();
            } else if (window.updateArrows) {
                window.updateArrows();
            }
        };
        
        // Первое обновление сразу
        updateArrows();
        
        // Второе обновление через небольшую задержку
        setTimeout(() => {
            this.clearCanvasRectCache();
            updateArrows();
        }, 50);
        
        // Третье обновление для надежности
        setTimeout(() => {
            this.clearCanvasRectCache();
            updateArrows();
        }, 150);
    }

    // Обновление индикатора зума
    updateZoomIndicator() {
        const indicator = document.getElementById('zoom-indicator');
        if (indicator) {
            indicator.textContent = Math.round(this.canvasZoom * 100) + '%';
            indicator.classList.remove('hidden');
            
            // Скрываем индикатор через 2 секунды
            clearTimeout(this.zoomIndicatorTimeout);
            this.zoomIndicatorTimeout = setTimeout(() => {
                indicator.classList.add('hidden');
            }, 2000);
        }
    }

    // Сброс зума
    resetZoom() {
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        this.setZoom(1);
    }

    // Обработка изменения размера окна
    handleWindowResize() {
        if (this.resizeRaf) {
            cancelAnimationFrame(this.resizeRaf);
        }
        
        // Сразу обновляем кеш
        this.clearCanvasRectCache();
        
        this.resizeRaf = requestAnimationFrame(() => {
            this.resizeRaf = null;
            
            // Принудительно обновляем стрелочки несколько раз для надежности
            const updateArrows = () => {
                if (window.botBuilder && window.botBuilder.forceUpdateArrows) {
                    window.botBuilder.forceUpdateArrows();
                } else if (window.updateArrows) {
                    window.updateArrows();
                }
            };
            
            // Первое обновление сразу
            updateArrows();
            
            // Второе обновление через небольшую задержку для надежности
            setTimeout(() => {
                this.clearCanvasRectCache();
                updateArrows();
            }, 50);
            
            // Третье обновление через большую задержку (на случай медленной отрисовки)
            setTimeout(() => {
                this.clearCanvasRectCache();
                updateArrows();
            }, 200);
        });
    }

    // Получение прямоугольника canvas с кешированием
    getCanvasRect(force = false) {
        if (force || !this.cachedCanvasRect) {
            const canvas = document.getElementById('canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                this.cachedCanvasRect = {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height,
                    scale: this.canvasZoom
                };
            } else {
                this.cachedCanvasRect = null;
            }
        }
        return this.cachedCanvasRect;
    }

    // Очистка кеша прямоугольника canvas
    clearCanvasRectCache() {
        this.cachedCanvasRect = null;
    }

    // Планирование обновления позиции блока
    requestBlockPositionUpdate(blockId, element, x, y) {
        this.pendingBlockPositions.set(blockId, {
            element,
            x: Math.max(0, x),
            y: Math.max(0, y)
        });

        if (!this.blockPositionRaf) {
            this.blockPositionRaf = requestAnimationFrame(() => this.processBlockPositionUpdates());
        }
    }

    // Обработка обновлений позиций блоков
    processBlockPositionUpdates() {
        this.blockPositionRaf = null;
        let positionChanged = false;
        
        this.pendingBlockPositions.forEach((data, blockId) => {
            const { element, x, y } = data;

            element.style.left = x + 'px';
            element.style.top = y + 'px';

            if (window.blocks && window.blocks[blockId]) {
                // Проверяем, изменилась ли позиция
                if (window.blocks[blockId].x !== x || window.blocks[blockId].y !== y) {
                    window.blocks[blockId].x = x;
                    window.blocks[blockId].y = y;
                    positionChanged = true;
                }
            }

            this.scheduleConnectionsUpdateForBlock(blockId);
        });

        this.pendingBlockPositions.clear();
        
        // Создаем снимок только если позиция действительно изменилась
        if (positionChanged && window.historyManager) {
            // Добавляем небольшую задержку для debounce перетаскивания
            if (this.blockDataUpdateTimeout) {
                clearTimeout(this.blockDataUpdateTimeout);
            }
            this.blockDataUpdateTimeout = setTimeout(() => {
                window.historyManager.createSnapshot();
                this.blockDataUpdateTimeout = null;
            }, 300);
        }
    }

    // Планирование обновления соединений для блока
    scheduleConnectionsUpdateForBlock(blockId) {
        this.pendingConnectionUpdates.add(blockId);

        if (!this.connectionUpdateRaf) {
            this.connectionUpdateRaf = requestAnimationFrame(() => this.processConnectionUpdates());
        }
    }

    // Обработка обновлений соединений
    processConnectionUpdates() {
        this.connectionUpdateRaf = null;
        const canvasRect = this.getCanvasRect(true);

        this.pendingConnectionUpdates.forEach(blockId => {
            if (window.connections) {
                window.connections.forEach(connection => {
                    if (connection.from === blockId || connection.to === blockId) {
                        if (window.drawArrow) {
                            window.drawArrow(connection, canvasRect);
                        }
                    }
                });
            }
        });

        this.pendingConnectionUpdates.clear();
    }

    // Принудительное обновление всех отложенных изменений
    flushPendingUpdates() {
        if (this.blockPositionRaf) {
            cancelAnimationFrame(this.blockPositionRaf);
            this.processBlockPositionUpdates();
        }

        if (this.connectionUpdateRaf) {
            cancelAnimationFrame(this.connectionUpdateRaf);
            this.processConnectionUpdates();
        }
    }

    // Получение элементов DOM
    getCanvasElement() {
        return document.getElementById('canvas');
    }

    getCanvasContentElement() {
        return document.getElementById('canvas-content');
    }

    getArrowSvgElement() {
        return document.getElementById('arrow-svg');
    }

    // Показ/скрытие пустого сообщения
    showEmptyMessage() {
        const emptyMsg = document.querySelector('.empty-canvas');
        if (emptyMsg && window.blocks && Object.keys(window.blocks).length === 0) {
            emptyMsg.style.display = 'block';
        }
    }

    hideEmptyMessage() {
        const emptyMsg = document.querySelector('.empty-canvas');
        if (emptyMsg) {
            emptyMsg.style.display = 'none';
        }
    }
}

// Экспортируем класс для использования в других модулях
window.CanvasManager = CanvasManager;
