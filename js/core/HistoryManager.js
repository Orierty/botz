/**
 * Система Undo/Redo для конструктора ботов
 * Управляет историей изменений и восстановлением состояний
 */

class HistoryManager {
    constructor(maxHistorySize = 50) {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = maxHistorySize;
        this.isRestoring = false;
        
        // Импортируем внешние зависимости
        this.blocks = null;
        this.connections = null;
        this.blockCounter = null;
        this.updateHashInRealTime = null;
        this.showEmptyMessage = null;
        this.makeBlockDraggable = null;
        this.getCanvasContentElement = null;
        this.drawArrow = null;
    }
    
    // Инициализация зависимостей
    init(dependencies) {
        this.blocks = dependencies.blocks;
        this.connections = dependencies.connections;
        this.blockCounter = dependencies.blockCounter;
        this.updateHashInRealTime = dependencies.updateHashInRealTime;
        this.showEmptyMessage = dependencies.showEmptyMessage;
        this.makeBlockDraggable = dependencies.makeBlockDraggable;
        this.getCanvasContentElement = dependencies.getCanvasContentElement;
        this.drawArrow = dependencies.drawArrow;
    }
    
    // Создает снимок текущего состояния
    createSnapshot() {
        if (this.isRestoring) return; // Не сохраняем во время восстановления
        
        const snapshot = {
            blocks: JSON.parse(JSON.stringify(this.blocks)),
            connections: JSON.parse(JSON.stringify(this.connections)),
            blockCounter: this.blockCounter,
            timestamp: Date.now()
        };
        
        // Проверяем, отличается ли от предыдущего снимка
        if (this.history.length > 0) {
            const lastSnapshot = this.history[this.currentIndex];
            if (this.snapshotsEqual(snapshot, lastSnapshot)) {
                return; // Не добавляем дубликат
            }
        }
        
        // Удаляем все состояния после текущего (если делали undo)
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Добавляем новый снимок
        this.history.push(snapshot);
        this.currentIndex++;
        
        // Ограничиваем размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }
        
        this.updateButtons();
    }
    
    // Проверяет равенство двух снимков
    snapshotsEqual(snapshot1, snapshot2) {
        return JSON.stringify(snapshot1.blocks) === JSON.stringify(snapshot2.blocks) &&
               JSON.stringify(snapshot1.connections) === JSON.stringify(snapshot2.connections) &&
               snapshot1.blockCounter === snapshot2.blockCounter;
    }
    
    // Отмена последнего действия
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            this.restoreSnapshot(this.history[this.currentIndex]);
            this.updateButtons();
        }
    }
    
    // Повтор отмененного действия
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            this.restoreSnapshot(this.history[this.currentIndex]);
            this.updateButtons();
        }
    }
    
    // Проверяет возможность отмены
    canUndo() {
        return this.currentIndex > 0;
    }
    
    // Проверяет возможность повтора
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }
    
    // Восстанавливает состояние из снимка
    restoreSnapshot(snapshot) {
        this.isRestoring = true;
        
        try {
            // Очищаем текущее состояние
            this.clearCanvas();
            
            // Восстанавливаем состояние
            Object.assign(this.blocks, JSON.parse(JSON.stringify(snapshot.blocks)));
            this.connections.length = 0;
            this.connections.push(...JSON.parse(JSON.stringify(snapshot.connections)));
            this.blockCounter = snapshot.blockCounter;
            
            // Восстанавливаем блоки на canvas
            Object.values(this.blocks).forEach(blockData => {
                this.createBlockFromSnapshot(blockData);
            });
            
            // Даем время для рендеринга перед восстановлением соединений
            setTimeout(() => {
                this.connections.forEach(connection => {
                    this.createConnectionFromSnapshot(connection);
                });
                
                // Дополнительное обновление для надежности
                if (window.botBuilder && window.botBuilder.forceUpdateArrows) {
                    window.botBuilder.forceUpdateArrows();
                }
            }, 50);
            
            // Обновляем хеш
            if (this.updateHashInRealTime) {
                this.updateHashInRealTime();
            }
            
        } finally {
            this.isRestoring = false;
        }
    }
    
    // Очищает canvas без создания снимка
    clearCanvas() {
        const canvas = document.getElementById('canvas');
        if (canvas) {
            // Удаляем все блоки
            canvas.querySelectorAll('.bot-block').forEach(block => {
                block.remove();
            });
            
            // Очищаем SVG стрелок
            const svg = document.getElementById('arrow-svg');
            if (svg) {
                svg.innerHTML = svg.innerHTML.replace(/<path[^>]*>/g, '');
            }
            
            // Показываем пустое сообщение если нужно
            if (Object.keys(this.blocks).length === 0) {
                if (this.showEmptyMessage) {
                    this.showEmptyMessage();
                }
            }
        }
    }
    
    // Создает блок из снимка
    createBlockFromSnapshot(blockData) {
        const blockId = blockData.id;
        const blockElement = document.createElement('div');
        blockElement.className = 'bot-block';
        blockElement.id = blockId;
        blockElement.style.left = blockData.x + 'px';
        blockElement.style.top = blockData.y + 'px';
        
        // Генерируем содержимое блока
        blockElement.innerHTML = this.generateBlockContent(blockData);
        blockElement.addEventListener('click', () => window.selectBlock && window.selectBlock(blockId));
        
        // Добавляем обработчики для цикла
        if (blockData.type === 'loop') {
            this.setupLoopHandlers(blockElement, blockId);
        }
        
        // Делаем блок перетаскиваемым
        if (this.makeBlockDraggable) {
            this.makeBlockDraggable(blockElement);
        }
        
        // Добавляем на canvas-content
        if (this.getCanvasContentElement) {
            const canvasContent = this.getCanvasContentElement();
            canvasContent.appendChild(blockElement);
        }
    }
    
    // Создает соединение из снимка
    createConnectionFromSnapshot(connection) {
        if (this.drawArrow) {
            this.drawArrow(connection);
        }
    }
    
    // Генерирует HTML содержимое блока
    generateBlockContent(blockData) {
        // Используем внешний генератор блоков если доступен
        if (window.BlockGenerator && window.BlockGenerator.generateBlockContent) {
            return window.BlockGenerator.generateBlockContent(blockData);
        }
        
        // Fallback - упрощенная генерация
        return `
            <div class="block-header">
                <div class="block-title">${this.getBlockTitle(blockData.type)}</div>
                <div class="block-type-badge">${blockData.type.toUpperCase()}</div>
                <button class="delete-btn" onclick="deleteBlock('${blockData.id}')">&times;</button>
            </div>
        `;
    }
    
    // Возвращает заголовок блока по типу
    getBlockTitle(type) {
        const titles = {
            'start': 'Старт бота',
            'message': 'Отправить сообщение',
            'question': 'Задать вопрос',
            'choice': 'Выбор из вариантов',
            'condition': 'Условие',
            'delay': 'Задержка',
            'variable': 'Установить переменную',
            'loop': 'Цикл',
            'image': 'Отправить изображение',
            'inline_keyboard': 'Inline-клавиатура',
            'calculation': 'Вычисления',
            'cart': 'Корзина',
            'payment': 'Оплата',
            'database': 'База данных',
            'catalog': 'Каталог товаров',
            'order_form': 'Форма заказа',
            'notification': 'Уведомления',
            'order_confirm': 'Подтверждение заказа'
        };
        return titles[type] || type;
    }
    
    // Настраивает обработчики для блока цикла
    setupLoopHandlers(blockElement, blockId) {
        const loopTypeSelect = blockElement.querySelector('select');
        if (loopTypeSelect) {
            loopTypeSelect.addEventListener('change', function() {
                const countSettings = document.getElementById(`${blockId}_count_settings`);
                const whileSettings = document.getElementById(`${blockId}_while_settings`);
                const listSettings = document.getElementById(`${blockId}_list_settings`);
                
                if (countSettings) countSettings.style.display = 'none';
                if (whileSettings) whileSettings.style.display = 'none';
                if (listSettings) listSettings.style.display = 'none';
                
                if (this.value === 'count' && countSettings) {
                    countSettings.style.display = 'block';
                } else if (this.value === 'while' && whileSettings) {
                    whileSettings.style.display = 'block';
                } else if (this.value === 'list' && listSettings) {
                    listSettings.style.display = 'block';
                }
            });
        }
    }
    
    // Обновляет состояние кнопок undo/redo
    updateButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.title = this.canUndo() ? 'Отменить (Ctrl+Z / Ctrl+Я)' : 'Нечего отменять';
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
            redoBtn.title = this.canRedo() ? 'Повторить (Ctrl+Y / Ctrl+Н)' : 'Нечего повторять';
        }
    }
    
    // Очищает всю историю
    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.updateButtons();
    }
}

// Экспортируем класс для использования в других модулях
window.HistoryManager = HistoryManager;
