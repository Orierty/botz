/**
 * Основной класс конструктора ботов
 * Управляет общим состоянием приложения и координирует работу модулей
 */

class BotBuilder {
    constructor() {
        // Основные данные
        this.blocks = {};
        this.connections = [];
        this.blockCounter = 0;
        this.selectedBlock = null;
        this.copiedBlock = null; // Для копирования блоков
        
        // Менеджеры
        this.historyManager = null;
        this.canvasManager = null;
        this.connectionManager = null;
        
        // Таймеры и состояние
        this.hashUpdateTimeout = null;
        
        // Инициализация
        this.init();
    }

    // Инициализация приложения
    init() {
        // Создаем менеджеры
        this.historyManager = new HistoryManager();
        this.canvasManager = new CanvasManager();
        this.connectionManager = new ConnectionManager();
        
        // Настраиваем зависимости для historyManager
        this.historyManager.init({
            blocks: this.blocks,
            connections: this.connections,
            blockCounter: this.blockCounter,
            updateHashInRealTime: () => this.updateHashInRealTime(),
            showEmptyMessage: () => this.canvasManager.showEmptyMessage(),
            makeBlockDraggable: (element) => this.makeBlockDraggable(element),
            getCanvasContentElement: () => this.canvasManager.getCanvasContentElement(),
            drawArrow: (connection) => this.drawArrow(connection)
        });

        // Глобальные переменные для совместимости со старым кодом
        window.blocks = this.blocks;
        window.connections = this.connections;
        window.historyManager = this.historyManager;
        
        // Глобальные функции для совместимости
        this.setupGlobalFunctions();
        
        // Настройка drag and drop
        this.setupDragAndDrop();
        
        // Настройка горячих клавиш
        this.setupKeyboardShortcuts();
        
        // Настройка правой кнопки мыши для снятия выделения
        this.setupRightClickForBlocks();
        
        // Создаем начальный снимок
        setTimeout(() => {
            this.historyManager.createSnapshot();
            this.historyManager.updateButtons();
        }, 100);
        
        console.log('BotBuilder initialized');
    }

    // Настройка глобальных функций для обратной совместимости
    setupGlobalFunctions() {
        window.createBlock = (type, x, y) => this.createBlock(type, x, y);
        window.deleteBlock = (blockId) => this.deleteBlock(blockId);
        window.selectBlock = (blockId) => this.selectBlock(blockId);
        window.updateBlockData = (blockId, field, value) => this.updateBlockData(blockId, field, value);
        window.toggleNotificationFields = (blockId) => this.toggleNotificationFields(blockId);
        window.clearCanvas = () => this.clearCanvas();
        window.hideEmptyMessage = () => this.canvasManager.hideEmptyMessage();
        window.showEmptyMessage = () => this.canvasManager.showEmptyMessage();
        window.toggleConnectMode = () => this.connectionManager.toggleConnectMode();
        window.toggleBreakMode = () => this.connectionManager.toggleBreakMode();
        window.createConnection = (from, to, options) => this.createConnection(from, to, options);
        window.updateHashInRealTime = () => this.updateHashInRealTime();
        window.drawArrow = (connection, canvasRect) => this.drawArrow(connection, canvasRect);
        window.updateArrows = () => this.updateArrows();
        window.forceUpdateArrows = () => this.forceUpdateArrows();
        window.updateHashInRealTime = () => this.updateHashInRealTime();
        window.makeBlockDraggable = (element) => this.makeBlockDraggable(element);
        
        // Экспорт и предпросмотр функции
        window.exportBot = () => this.exportBot();
        window.previewBot = () => this.previewBot();
        window.loadFromClipboard = () => this.loadFromClipboard();
        window.copyHashToClipboard = () => this.copyHashToClipboard();
        
        // Функции для работы с файлами
        window.saveToFile = () => this.saveToFile();
        window.loadFromFile = () => this.loadFromFile();
        
        // Функция центрирования canvas
        window.centerCanvas = () => this.centerCanvas();
        
        // Функции для работы с вариантами выбора и кнопками
        // Эти функции импортируются из app_new.js
        // window.updateChoiceOptions, window.addOption, window.removeOption
        // window.updateInlineButtons, window.addInlineButton, window.removeInlineButton
        // window.updateOrderFields, window.addOrderField, window.removeOrderField
        // window.updateCatalogProducts, window.addProduct, window.removeProduct
    }

    // Настройка drag and drop
    setupDragAndDrop() {
        document.querySelectorAll('.block-type').forEach(block => {
            block.addEventListener('dragstart', (e) => {
                console.log('Drag started for:', e.currentTarget.dataset.type);
                e.dataTransfer.setData('text/plain', e.currentTarget.dataset.type);
            });
        });
    }

    // Настройка горячих клавиш
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isInputFocused = document.activeElement.tagName === 'INPUT' || 
                                  document.activeElement.tagName === 'TEXTAREA' ||
                                  document.activeElement.contentEditable === 'true';
            
            if (isInputFocused) return;
            
            // Ctrl+Z или Ctrl+Я - Undo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я') && !e.shiftKey) {
                e.preventDefault();
                this.historyManager.undo();
            }
            // Ctrl+Y или Ctrl+Н или Ctrl+Shift+Z/Я - Redo
            else if ((e.ctrlKey || e.metaKey) && 
                     (e.key === 'y' || e.key === 'н' || 
                      ((e.key === 'z' || e.key === 'я') && e.shiftKey))) {
                e.preventDefault();
                this.historyManager.redo();
            }
            // Ctrl+C или Ctrl+С - Копировать блок
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'с')) {
                e.preventDefault();
                this.copyBlock();
            }
            // Ctrl+V или Ctrl+М - Вставить блок
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'м')) {
                e.preventDefault();
                this.pasteBlock();
            }
            // Delete или Backspace - Удалить выбранный блок
            else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedBlock) {
                e.preventDefault();
                if (confirm('Удалить выбранный блок?')) {
                    this.deleteBlock(this.selectedBlock);
                }
            }
        });
    }

    // Настройка правой кнопки мыши для снятия выделения с блоков
    setupRightClickForBlocks() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        // Обработчик правой кнопки мыши
        canvas.addEventListener('contextmenu', (e) => {
            // Снимаем выделение только если клик не на блоке и не на input/textarea
            const isBlock = e.target.closest('.bot-block');
            const isInput = e.target.tagName === 'INPUT' || 
                           e.target.tagName === 'TEXTAREA' || 
                           e.target.tagName === 'SELECT' ||
                           e.target.tagName === 'BUTTON';
            
            if (!isBlock && !isInput && this.selectedBlock) {
                e.preventDefault();
                
                // Снимаем выделение с блока
                const prevElement = document.getElementById(this.selectedBlock);
                if (prevElement) {
                    prevElement.classList.remove('selected');
                }
                this.selectedBlock = null;
                
                // Обновляем стрелки (убираем цветовое выделение)
                this.updateArrows();
            }
        });

        // Обработчик обычного клика - снимаем фокус с input при клике вне блока
        canvas.addEventListener('mousedown', (e) => {
            const isBlock = e.target.closest('.bot-block');
            const isInput = e.target.tagName === 'INPUT' || 
                           e.target.tagName === 'TEXTAREA' || 
                           e.target.tagName === 'SELECT' ||
                           e.target.tagName === 'BUTTON';
            
            // Если клик не на блоке и не на элементе ввода - снимаем фокус
            if (!isBlock && !isInput && document.activeElement) {
                const activeIsInput = document.activeElement.tagName === 'INPUT' ||
                                     document.activeElement.tagName === 'TEXTAREA' ||
                                     document.activeElement.tagName === 'SELECT';
                
                if (activeIsInput) {
                    document.activeElement.blur();
                }
            }
        });
    }

    // Создание нового блока
    createBlock(type, x, y) {
        if (!Utils.isValidBlockType(type)) {
            console.error('Invalid block type:', type);
            return;
        }

        this.blockCounter++;
        const blockId = `block_${this.blockCounter}`;
        
        // Создаем данные блока
        const blockData = {
            id: blockId,
            type: type,
            x: Math.round(x),
            y: Math.round(y),
            connections: Utils.createInitialConnections(type)
        };

        // Устанавливаем значения по умолчанию для разных типов блоков
        this.setDefaultBlockValues(blockData);
        
        this.blocks[blockId] = blockData;
        
        // Обновляем глобальную переменную для совместимости
        window.blocks = this.blocks;
        
        // Создаем DOM элемент
        this.createBlockElement(blockData);
        
        // Создаем снимок для истории
        this.historyManager.createSnapshot();
        
        // Обновляем хеш
        this.updateHashInRealTime();
        
        console.log('Block created:', blockId, blockData);
        
        return blockId;
    }

    // Установка значений по умолчанию для блоков
    setDefaultBlockValues(blockData) {
        switch(blockData.type) {
            case 'start':
                blockData.message = '';
                break;
            case 'message':
                blockData.text = '';
                break;
            case 'question':
                blockData.question = '';
                blockData.variable = '';
                break;
            case 'choice':
                blockData.question = '';
                blockData.options = [''];
                blockData.variable = '';
                break;
            case 'condition':
                blockData.variable = '';
                blockData.condition = 'equals';
                blockData.value = '';
                break;
            case 'delay':
                blockData.seconds = 1;
                break;
            case 'variable':
                blockData.variable = '';
                blockData.value = '';
                break;
            case 'loop':
                blockData.loop_type = 'count';
                blockData.count = 3;
                break;
            case 'inline_keyboard':
                blockData.message = '';
                blockData.buttons = [{ text: '', callback_data: '' }];
                break;
            case 'image':
                blockData.caption = '';
                break;
            case 'calculation':
                blockData.formula = '';
                blockData.result_variable = '';
                break;
            case 'cart':
                blockData.action = 'add';
                break;
            case 'payment':
                blockData.title = '';
                blockData.description = '';
                blockData.amount = '';
                blockData.currency = 'RUB';
                break;
            case 'order_form':
                blockData.fields = [{ type: 'name', variable: '' }];
                blockData.success_message = '';
                break;
            case 'chatgpt':
                blockData.api_key = '';
                blockData.prompt = '';
                blockData.model = 'gpt-3.5-turbo';
                blockData.max_tokens = 500;
                blockData.temperature = 0.7;
                blockData.result_variable = 'gpt_response';
                break;
            case 'notification':
                blockData.target = 'admin';
                blockData.chat_id = '';
                blockData.admin_chat_id = '';
                blockData.message = '';
                break;
        }
    }

    // Создание DOM элемента блока
    createBlockElement(blockData) {
        const blockElement = document.createElement('div');
        blockElement.className = 'bot-block';
        blockElement.id = blockData.id;
        blockElement.style.left = blockData.x + 'px';
        blockElement.style.top = blockData.y + 'px';
        
        // Генерируем содержимое блока
        blockElement.innerHTML = BlockGenerator.generateBlockContent(blockData);
        
        // Добавляем обработчик клика
        blockElement.addEventListener('click', () => this.selectBlock(blockData.id));
        
        // Делаем блок перетаскиваемым
        this.makeBlockDraggable(blockElement);
        
        // Добавляем на canvas
        const canvasContent = this.canvasManager.getCanvasContentElement();
        canvasContent.appendChild(blockElement);
    }

    // Удаление блока
    deleteBlock(blockId) {
        if (!this.blocks[blockId]) return;
        
        // Удаляем все соединения связанные с блоком
        const connectionsToRemove = this.connections.filter(conn => 
            conn.from === blockId || conn.to === blockId
        );
        
        connectionsToRemove.forEach(conn => {
            this.connectionManager.breakConnection(conn.id);
        });
        
        // Удаляем блок из данных
        delete this.blocks[blockId];
        
        // Удаляем DOM элемент
        const blockElement = document.getElementById(blockId);
        if (blockElement) {
            blockElement.remove();
        }
        
        // Показываем пустое сообщение если нужно
        if (Object.keys(this.blocks).length === 0) {
            this.canvasManager.showEmptyMessage();
        }
        
        // Создаем снимок для истории
        this.historyManager.createSnapshot();
        
        // Обновляем хеш
        this.updateHashInRealTime();
    }

    // Выбор блока
    selectBlock(blockId) {
        // Убираем выделение с предыдущего блока
        if (this.selectedBlock) {
            const prevElement = document.getElementById(this.selectedBlock);
            if (prevElement) {
                prevElement.classList.remove('selected');
            }
        }
        
        // Выделяем новый блок
        this.selectedBlock = blockId;
        const blockElement = document.getElementById(blockId);
        if (blockElement) {
            blockElement.classList.add('selected');
        }
    }

    // Копирование блока (Ctrl+C)
    copyBlock() {
        if (!this.selectedBlock) {
            console.log('No block selected to copy');
            return;
        }

        const blockData = this.blocks[this.selectedBlock];
        if (!blockData) {
            console.log('Selected block not found in blocks');
            return;
        }

        // Создаем глубокую копию данных блока (без соединений)
        this.copiedBlock = Utils.deepClone(blockData);
        
        // Очищаем соединения у скопированного блока
        this.copiedBlock.connections = Utils.createInitialConnections(this.copiedBlock.type);
        
        // Визуальная обратная связь
        this.showNotification('Блок скопирован! Нажмите Ctrl+V для вставки', 'info');
        
        console.log('Block copied:', this.copiedBlock.type);
    }

    // Вставка блока (Ctrl+V)
    pasteBlock() {
        if (!this.copiedBlock) {
            console.log('No block copied');
            this.showNotification('Сначала скопируйте блок (Ctrl+C)', 'info');
            return;
        }

        // Получаем позицию для нового блока (со смещением)
        const originalElement = document.getElementById(this.selectedBlock);
        let offsetX = 50;
        let offsetY = 50;
        
        if (originalElement) {
            const originalX = parseInt(originalElement.style.left) || 0;
            const originalY = parseInt(originalElement.style.top) || 0;
            offsetX = originalX + 50;
            offsetY = originalY + 50;
        } else {
            // Если нет выбранного блока, вставляем в центр видимой области
            const canvas = document.getElementById('canvas');
            if (canvas) {
                offsetX = canvas.scrollLeft + 200;
                offsetY = canvas.scrollTop + 200;
            }
        }

        // Создаем новый блок на основе скопированного
        const newBlockId = this.createBlock(this.copiedBlock.type, offsetX, offsetY);
        
        if (!newBlockId) {
            console.error('Failed to create new block');
            return;
        }

        const newBlock = this.blocks[newBlockId];
        if (!newBlock) {
            console.error('New block not found after creation');
            return;
        }

        // Копируем все данные кроме id, позиции и соединений
        Object.keys(this.copiedBlock).forEach(key => {
            if (key !== 'id' && key !== 'x' && key !== 'y' && key !== 'connections') {
                newBlock[key] = Utils.deepClone(this.copiedBlock[key]);
            }
        });

        // Обновляем DOM элемент с новыми данными
        const newBlockElement = document.getElementById(newBlockId);
        if (newBlockElement) {
            newBlockElement.innerHTML = BlockGenerator.generateBlockContent(newBlock);
        }

        // Выбираем новый блок
        this.selectBlock(newBlockId);

        // Обновляем хеш и создаем снимок
        this.historyManager.createSnapshot();
        this.updateHashInRealTime();

        // Визуальная обратная связь
        this.showNotification('Блок вставлен!', 'success');
        
        console.log('Block pasted:', newBlockId);
    }

    // Обновление данных блока
    updateBlockData(blockId, field, value) {
        if (!this.blocks[blockId]) return;
        
        this.blocks[blockId][field] = value;
        
        // Специальная обработка для inline_keyboard блоков
        if (field === 'buttons' && this.blocks[blockId].type === 'inline_keyboard') {
            Utils.normalizeBlockConnections(this.blocks[blockId]);
        }
        
        // Создаем снимок для истории с задержкой
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.historyManager.createSnapshot();
        }, 1000);
        
        // Обновляем хеш
        this.updateHashInRealTime();
    }

    // Переключение полей уведомления
    toggleNotificationFields(blockId) {
        const block = this.blocks[blockId];
        if (!block || block.type !== 'notification') return;
        
        const adminChatIdField = document.getElementById(`${blockId}_admin_chat_id`);
        const customChatIdField = document.getElementById(`${blockId}_chat_id`);
        
        if (block.target === 'admin') {
            if (adminChatIdField) adminChatIdField.style.display = 'block';
            if (customChatIdField) customChatIdField.style.display = 'none';
        } else {
            if (adminChatIdField) adminChatIdField.style.display = 'none';
            if (customChatIdField) customChatIdField.style.display = 'block';
        }
    }

    // Очистка canvas
    clearCanvas() {
        if (confirm('Удалить все блоки? Это действие нельзя отменить.')) {
            // Очищаем данные
            this.blocks = {};
            this.connections = [];
            this.blockCounter = 0;
            this.selectedBlock = null;
            
            // Обновляем глобальные ссылки
            window.blocks = {};
            window.connections = [];
            
            // Очищаем DOM
            const canvasContent = this.canvasManager.getCanvasContentElement();
            if (canvasContent) {
                canvasContent.querySelectorAll('.bot-block').forEach(block => block.remove());
            }
            
            // Очищаем SVG стрелок
            const svg = this.canvasManager.getArrowSvgElement();
            if (svg) {
                svg.innerHTML = svg.innerHTML.replace(/<path[^>]*>/g, '');
            }
            
            // Показываем пустое сообщение
            this.canvasManager.showEmptyMessage();
            
            // Очищаем историю и создаем новый снимок
            this.historyManager.clear();
            this.historyManager.createSnapshot();
            
            // Обновляем хеш
            this.updateHashInRealTime();
        }
    }

    // Создание соединения между блоками
    createConnection(fromBlockId, toBlockId, options = {}) {
        if (!this.blocks[fromBlockId] || !this.blocks[toBlockId]) {
            console.error('Invalid block IDs for connection');
            return null;
        }

        const fromPort = options.fromPort || 'default';
        const connectionId = options.connectionId || Utils.generateConnectionId();

        const connection = {
            id: connectionId,
            from: fromBlockId,
            to: toBlockId,
            fromPort: fromPort
        };

        // Обновляем данные блоков
        const fromBlock = this.blocks[fromBlockId];
        const toBlock = this.blocks[toBlockId];

        if (!fromBlock.connections.outputs[fromPort]) {
            fromBlock.connections.outputs[fromPort] = toBlockId;
        } else {
            console.warn('Output port already connected');
            return null;
        }

        if (!toBlock.connections.input) {
            toBlock.connections.input = fromBlockId;
        } else {
            console.warn('Input already connected');
            return null;
        }

        // Добавляем соединение в массив
        this.connections.push(connection);
        
        // Обновляем глобальную переменную для совместимости
        window.connections = this.connections;
        
        console.log('Connection created and added. Total connections:', this.connections.length);
        console.log('New connection:', connection);

        // Рисуем стрелочку
        this.drawArrow(connection);

        // Создаем снимок для истории и обновляем хеш только если не пропускаем
        if (!options.skipHashUpdate) {
            this.historyManager.createSnapshot();
            
            // Обновляем хеш
            console.log('About to call updateHashInRealTime after connection creation');
            this.updateHashInRealTime();
        }

        return connectionId;
    }

    // Умная система определения точек подключения
    getOptimalConnectionPoints(fromElement, toElement) {
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Возможные точки подключения для блоков
        const fromPoints = {
            right: { x: fromRect.right, y: fromRect.top + fromRect.height / 2, side: 'right' },
            left: { x: fromRect.left, y: fromRect.top + fromRect.height / 2, side: 'left' },
            bottom: { x: fromRect.left + fromRect.width / 2, y: fromRect.bottom, side: 'bottom' },
            top: { x: fromRect.left + fromRect.width / 2, y: fromRect.top, side: 'top' }
        };
        
        const toPoints = {
            left: { x: toRect.left, y: toRect.top + toRect.height / 2, side: 'left' },
            right: { x: toRect.right, y: toRect.top + toRect.height / 2, side: 'right' },
            top: { x: toRect.left + toRect.width / 2, y: toRect.top, side: 'top' },
            bottom: { x: toRect.left + toRect.width / 2, y: toRect.bottom, side: 'bottom' }
        };
        
        // Находим оптимальную пару точек с минимальным расстоянием и лучшим направлением
        let bestDistance = Infinity;
        let bestFromPoint = fromPoints.right;
        let bestToPoint = toPoints.left;
        
        // Проверяем все комбинации точек
        Object.values(fromPoints).forEach(fromPoint => {
            Object.values(toPoints).forEach(toPoint => {
                // Вычисляем расстояние
                const dx = toPoint.x - fromPoint.x;
                const dy = toPoint.y - fromPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Добавляем бонусы за логичное направление соединения
                let directionBonus = 0;
                
                // Предпочитаем горизонтальные соединения слева направо
                if (fromPoint.side === 'right' && toPoint.side === 'left' && dx > 0) {
                    directionBonus = -50;
                }
                // Вертикальные соединения сверху вниз
                else if (fromPoint.side === 'bottom' && toPoint.side === 'top' && dy > 0) {
                    directionBonus = -30;
                }
                // Штраф за "неестественные" соединения
                else if (fromPoint.side === 'left' && toPoint.side === 'right') {
                    directionBonus = 100; // Соединение справа налево менее предпочтительно
                }
                else if (fromPoint.side === 'top' && toPoint.side === 'bottom') {
                    directionBonus = 50; // Соединение снизу вверх менее предпочтительно
                }
                
                const adjustedDistance = distance + directionBonus;
                
                if (adjustedDistance < bestDistance) {
                    bestDistance = adjustedDistance;
                    bestFromPoint = fromPoint;
                    bestToPoint = toPoint;
                }
            });
        });
        
        return { from: bestFromPoint, to: bestToPoint };
    }

    // Создание контрольных точек для кривой Безье
    getControlPoints(fromPoint, toPoint) {
        const dx = toPoint.x - fromPoint.x;
        const dy = toPoint.y - fromPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Определяем силу изгиба на основе расстояния
        const curveStrength = Math.min(100, distance * 0.3);
        
        let cp1x, cp1y, cp2x, cp2y;
        
        // Определяем направления контрольных точек в зависимости от сторон подключения
        switch (fromPoint.side) {
            case 'right':
                cp1x = fromPoint.x + curveStrength;
                cp1y = fromPoint.y;
                break;
            case 'left':
                cp1x = fromPoint.x - curveStrength;
                cp1y = fromPoint.y;
                break;
            case 'bottom':
                cp1x = fromPoint.x;
                cp1y = fromPoint.y + curveStrength;
                break;
            case 'top':
                cp1x = fromPoint.x;
                cp1y = fromPoint.y - curveStrength;
                break;
            default:
                cp1x = fromPoint.x + curveStrength;
                cp1y = fromPoint.y;
        }
        
        switch (toPoint.side) {
            case 'left':
                cp2x = toPoint.x - curveStrength;
                cp2y = toPoint.y;
                break;
            case 'right':
                cp2x = toPoint.x + curveStrength;
                cp2y = toPoint.y;
                break;
            case 'top':
                cp2x = toPoint.x;
                cp2y = toPoint.y - curveStrength;
                break;
            case 'bottom':
                cp2x = toPoint.x;
                cp2y = toPoint.y + curveStrength;
                break;
            default:
                cp2x = toPoint.x - curveStrength;
                cp2y = toPoint.y;
        }
        
        return { cp1x, cp1y, cp2x, cp2y };
    }

    // Отрисовка стрелочки соединения с умными точками подключения
    drawArrow(connection, canvasRect = null) {
        if (!connection || !this.blocks[connection.from] || !this.blocks[connection.to]) {
            return;
        }

        const svg = this.canvasManager.getArrowSvgElement();
        if (!svg) return;

        const fromElement = document.getElementById(connection.from);
        const toElement = document.getElementById(connection.to);

        if (!fromElement || !toElement) return;

        // Удаляем существующую стрелочку если есть
        if (connection.pathElement && connection.pathElement.remove) {
            connection.pathElement.remove();
        }

        // Получаем оптимальные точки подключения
        const optimalPoints = this.getOptimalConnectionPoints(fromElement, toElement);
        const svgRect = svg.getBoundingClientRect();
        
        // Преобразуем координаты в систему координат SVG с учетом масштаба
        const fromX = (optimalPoints.from.x - svgRect.left) / this.canvasManager.canvasZoom;
        const fromY = (optimalPoints.from.y - svgRect.top) / this.canvasManager.canvasZoom;
        const toX = (optimalPoints.to.x - svgRect.left) / this.canvasManager.canvasZoom;
        const toY = (optimalPoints.to.y - svgRect.top) / this.canvasManager.canvasZoom;

        // Получаем контрольные точки для плавной кривой
        const svgFromPoint = { x: fromX, y: fromY, side: optimalPoints.from.side };
        const svgToPoint = { x: toX, y: toY, side: optimalPoints.to.side };
        const controlPoints = this.getControlPoints(svgFromPoint, svgToPoint);

        // Создаем путь кривой Безье
        const pathData = `M ${fromX} ${fromY} C ${controlPoints.cp1x} ${controlPoints.cp1y} ${controlPoints.cp2x} ${controlPoints.cp2y} ${toX} ${toY}`;

        // Создаем элемент path
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', pathData);
        pathElement.setAttribute('stroke', '#00b894');
        pathElement.setAttribute('stroke-width', '2');
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('marker-end', 'url(#arrowhead)');
        pathElement.setAttribute('class', 'connection-arrow');
        pathElement.setAttribute('data-connection-id', connection.id);

        // Добавляем небольшую анимацию для новых соединений
        if (!connection.pathElement) {
            pathElement.style.strokeDasharray = '5,5';
            pathElement.style.strokeDashoffset = '10';
            pathElement.style.animation = 'dash 0.5s ease-in-out forwards';
        }

        // Добавляем в SVG
        svg.appendChild(pathElement);
        connection.pathElement = pathElement;
    }

    // Обновление всех стрелочек
    updateArrows() {
        // Очищаем кеш для точных вычислений
        this.canvasManager.clearCanvasRectCache();
        
        // Принудительно пересчитываем layout
        this.canvasManager.flushPendingUpdates();
        
        // Перерисовываем все соединения
        this.connections.forEach(connection => {
            this.drawArrow(connection);
        });
    }

    // Принудительное обновление стрелочек с задержкой (для проблемных случаев)
    forceUpdateArrows() {
        // Используем requestAnimationFrame для гарантии что DOM обновился
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.updateArrows();
            });
        });
    }

    // Функция для получения полного состояния бота (как в оригинале)
    getBotState() {
        // Используем глобальные переменные напрямую как в backup версии
        const blocksData = {};
        
        // Проверяем, что глобальные переменные инициализированы
        if (!window.blocks) window.blocks = this.blocks;
        if (!window.connections) window.connections = this.connections;
        
        Object.keys(window.blocks).forEach(blockId => {
            const block = window.blocks[blockId];
            Utils.normalizeBlockConnections(block);
            
            const blockElement = document.getElementById(blockId);
            if (blockElement) {
                // Обновляем позицию из DOM
                block.x = parseInt(blockElement.style.left) || 0;
                block.y = parseInt(blockElement.style.top) || 0;
                
                // Собираем актуальные данные из формы
                this.updateBlockDataFromDOM(blockElement, block);
            }
            
            blocksData[blockId] = { ...block };
        });

        // Используем глобальную переменную connections напрямую как в backup
        const connections = (window.connections || []).map(conn => ({
            from: conn.from,
            fromPort: conn.fromPort || 'default',
            to: conn.to,
            id: conn.id
        }));

        console.log('getBotState: using global variables - blocks:', Object.keys(window.blocks).length, 'connections:', window.connections.length);
        
        const result = { 
            blocks: blocksData, 
            connections: connections,
            blockCounter: this.blockCounter
        };
        
        return result;
    }

    // Обновление данных блока из DOM элементов
    updateBlockDataFromDOM(blockElement, block) {
        switch(block.type) {
            case 'start':
                const messageTextarea = blockElement.querySelector('textarea[placeholder*="Привет"]');
                if (messageTextarea) {
                    block.message = messageTextarea.value || '';
                }
                break;
            case 'message':
                const textTextarea = blockElement.querySelector('textarea[placeholder*="сообщения"]');
                if (textTextarea) {
                    block.text = textTextarea.value || '';
                }
                break;
            case 'question':
                const questionTextarea = blockElement.querySelector('textarea[placeholder*="дела"]');
                if (questionTextarea) {
                    block.question = questionTextarea.value || '';
                }
                const questionVariable = blockElement.querySelector('input[placeholder*="user_name"]');
                if (questionVariable) {
                    block.variable = questionVariable.value || '';
                }
                break;
            case 'inline_keyboard':
                const keyboardMessage = blockElement.querySelector('textarea[placeholder*="сообщение"]');
                if (keyboardMessage) {
                    block.message = keyboardMessage.value || '';
                }
                // Обновляем кнопки
                const buttonsContainer = blockElement.querySelector(`div[id*="_buttons"]`);
                if (buttonsContainer) {
                    const buttonRows = buttonsContainer.querySelectorAll('.button-row');
                    block.buttons = Array.from(buttonRows).map(row => {
                        const inputs = row.querySelectorAll('input');
                        return {
                            text: inputs[0]?.value || '',
                            callback_data: inputs[1]?.value || ''
                        };
                    });
                }
                break;
            case 'catalog':
                // Данные товаров обновляются через updateCatalogProducts()
                // Здесь ничего делать не нужно, так как данные уже в block.products
                break;
            case 'image':
                const captionTextarea = blockElement.querySelector('textarea[placeholder*="подпись"]');
                if (captionTextarea) {
                    block.caption = captionTextarea.value || '';
                }
                break;
            case 'calculation':
                const formulaInput = blockElement.querySelector('input[placeholder*="формула"]');
                if (formulaInput) {
                    block.formula = formulaInput.value || '';
                }
                const resultVarInput = blockElement.querySelector('input[placeholder*="переменная"]');
                if (resultVarInput) {
                    block.result_variable = resultVarInput.value || '';
                }
                break;
            case 'cart':
                const actionSelect = blockElement.querySelector('select');
                if (actionSelect) {
                    block.action = actionSelect.value || 'add';
                }
                break;
            case 'order_form':
                const fieldsContainer = blockElement.querySelector(`div[id*="_fields"]`);
                if (fieldsContainer) {
                    const fieldRows = fieldsContainer.querySelectorAll('.field-row');
                    block.fields = Array.from(fieldRows).map(row => {
                        const select = row.querySelector('select');
                        const input = row.querySelector('input');
                        return {
                            type: select?.value || 'name',
                            variable: input?.value || ''
                        };
                    });
                }
                break;
            // Добавляем другие типы блоков при необходимости
        }
    }

    // Автоматическое обновление хеша в реальном времени с debounce
    updateHashInRealTime() {
        console.log('updateHashInRealTime called');
        // Очищаем предыдущий таймаут
        if (this.hashUpdateTimeout) {
            clearTimeout(this.hashUpdateTimeout);
        }
        
        // Устанавливаем новый таймаут для обновления хеша
        this.hashUpdateTimeout = setTimeout(() => {
            const state = this.getBotState();
            const json = JSON.stringify(state);
            
            console.log('updateHashInRealTime: Blocks count:', Object.keys(state.blocks).length, 'Connections count:', state.connections.length);
            console.log('updateHashInRealTime: JSON length:', json.length, 'Sample:', json.substring(0, 200) + '...');
            
            // Используем encodeURIComponent для корректного кодирования кириллицы
            const encoded = btoa(unescape(encodeURIComponent(json)));
            window.location.hash = "bot=" + encoded;
            const hashField = document.getElementById("bot-hash");
            if (hashField) {
                hashField.value = encoded;
            }
            
            console.log('Hash updated successfully. Hash length:', encoded.length);
        }, 300); // Debounce 300мс
    }

    // Загрузка состояния бота из объекта
    loadFromState(state) {
        if (!state || !state.blocks) {
            console.warn('Invalid state object');
            return;
        }

        console.log('Loading state. Blocks:', Object.keys(state.blocks).length, 'Connections:', (state.connections || []).length);
        console.log('loadFromState: incoming state structure:', {
            blocksKeys: Object.keys(state.blocks),
            connectionsCount: (state.connections || []).length,
            blockCounter: state.blockCounter,
            sampleBlock: Object.values(state.blocks)[0],
            sampleConnection: (state.connections || [])[0]
        });

        // Очищаем текущее состояние
        this.blocks = {};
        this.connections = [];
        this.blockCounter = state.blockCounter || 0;

        // Очищаем canvas
        this.canvasManager.clearCanvas();

        // Загружаем блоки
        Object.values(state.blocks).forEach(blockData => {
            Utils.normalizeBlockConnections(blockData);
            this.createBlockElementFromData(blockData);
        });

        // Восстанавливаем соединения после создания всех блоков
        (state.connections || []).forEach(connection => {
            this.createConnection(connection.from, connection.to, {
                fromPort: connection.fromPort || 'default',
                connectionId: connection.id,
                skipHashUpdate: true
            });
        });
        
        // Принудительно обновляем все стрелки после загрузки через больший интервал
        setTimeout(() => {
            this.canvasManager.clearCanvasRectCache();
            this.updateArrows();
            
            // Дополнительное обновление для надежности
            setTimeout(() => {
                this.forceUpdateArrows();
            }, 100);
        }, 100);

        // Обновляем глобальные переменные для совместимости
        window.blocks = this.blocks;
        window.connections = this.connections;

        // Скрываем пустое сообщение
        this.canvasManager.hideEmptyMessage();

        // Создаем новый снимок истории
        this.historyManager.createSnapshot();

        console.log('State loaded successfully');
    }

    // Создание перетаскиваемого блока
    makeBlockDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left) || 0;
            initialY = parseInt(element.style.top) || 0;
            
            element.style.zIndex = '1000';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = (e.clientX - startX) / this.canvasManager.canvasZoom;
            const deltaY = (e.clientY - startY) / this.canvasManager.canvasZoom;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;

            this.canvasManager.requestBlockPositionUpdate(element.id, element, newX, newY);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = '';
                document.body.style.userSelect = '';
                this.canvasManager.flushPendingUpdates();
                
                // Принудительно обновляем стрелочки после перетаскивания
                setTimeout(() => {
                    this.forceUpdateArrows();
                }, 100);
            }
        });
    }

    // Обновление хеша бота
    updateHashInRealTime() {
        clearTimeout(this.hashUpdateTimeout);
        this.hashUpdateTimeout = setTimeout(() => {
            const botData = {
                blocks: this.blocks,
                connections: this.connections,
                settings: {
                    botName: document.getElementById('bot-name')?.value || 'МойБот',
                    botToken: document.getElementById('bot-token')?.value || ''
                }
            };
            
            const hashInput = document.getElementById('bot-hash');
            if (hashInput) {
                // Используем более надежную кодировку для русских символов
                const jsonString = JSON.stringify(botData);
                try {
                    // Пробуем сначала простое base64 кодирование
                    hashInput.value = btoa(unescape(encodeURIComponent(jsonString)));
                } catch (e) {
                    // Fallback для случаев с проблемными символами
                    hashInput.value = btoa(encodeURIComponent(jsonString));
                }
            }
        }, 500);
    }

    // Копирование хеша в буфер обмена
    async copyHashToClipboard() {
        const hashInput = document.getElementById('bot-hash');
        if (hashInput && hashInput.value) {
            const success = await Utils.copyToClipboard(hashInput.value);
            if (success) {
                // Показываем уведомление
                const notification = document.createElement('div');
                notification.textContent = 'Хеш скопирован в буфер обмена!';
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #00b894;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    z-index: 10000;
                    font-family: Arial, sans-serif;
                `;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            } else {
                alert('Не удалось скопировать хеш');
            }
        }
    }

    // Загрузка из буфера обмена
    async loadFromClipboard() {
        try {
            const clipboardText = await Utils.getFromClipboard();
            if (!clipboardText) {
                alert('Буфер обмена пуст или недоступен');
                return;
            }

            // Пытаемся распарсить данные
            let botData;
            try {
                // Сначала пробуем декодировать base64 (новый формат)
                const decodedText = decodeURIComponent(escape(atob(clipboardText.trim())));
                botData = JSON.parse(decodedText);
            } catch (e) {
                try {
                    // Пробуем старый формат с decodeURIComponent
                    const decodedText = decodeURIComponent(atob(clipboardText.trim()));
                    botData = JSON.parse(decodedText);
                } catch (e2) {
                    try {
                        // Простое base64 декодирование
                        const decodedText = atob(clipboardText.trim());
                        botData = JSON.parse(decodedText);
                    } catch (e3) {
                        try {
                            // Если и это не получилось, пробуем парсить как обычный JSON
                            botData = JSON.parse(clipboardText);
                        } catch (e4) {
                            alert('Данные в буфере обмена не являются корректным хешем бота');
                            console.error('Parse errors:', e, e2, e3, e4);
                            return;
                        }
                    }
                }
            }

            // Валидируем структуру данных
            if (!botData.blocks || !botData.connections) {
                alert('Некорректная структура данных бота');
                return;
            }

            // Подтверждение загрузки
            if (Object.keys(this.blocks).length > 0) {
                if (!confirm('Это заменит текущий проект. Продолжить?')) {
                    return;
                }
            }

            // Очищаем текущие данные
            this.clearCanvasForLoad();

            // Загружаем новые данные
            this.blocks = botData.blocks || {};
            this.connections = botData.connections || [];
            this.blockCounter = Math.max(...Object.values(this.blocks).map(b => 
                parseInt(b.id.replace('block_', '')) || 0), 0);

            // Обновляем глобальные ссылки
            window.blocks = this.blocks;
            window.connections = this.connections;

            // Восстанавливаем настройки бота
            if (botData.settings) {
                const nameInput = document.getElementById('bot-name');
                const tokenInput = document.getElementById('bot-token');
                if (nameInput && botData.settings.botName) {
                    nameInput.value = botData.settings.botName;
                }
                if (tokenInput && botData.settings.botToken) {
                    tokenInput.value = botData.settings.botToken;
                }
            }

            // Восстанавливаем блоки на canvas
            Object.values(this.blocks).forEach(blockData => {
                Utils.normalizeBlockConnections(blockData);
                this.createBlockElementFromData(blockData);
            });

            // Восстанавливаем соединения после создания всех блоков
            (this.connections || []).forEach(connection => {
                this.createConnection(connection.from, connection.to, {
                    fromPort: connection.fromPort || 'default',
                    connectionId: connection.id,
                    skipHashUpdate: true
                });
            });
            
            // Принудительно обновляем все стрелки после загрузки через больший интервал
            setTimeout(() => {
                this.canvasManager.clearCanvasRectCache();
                this.updateArrows();
                
                // Дополнительное обновление для надежности
                setTimeout(() => {
                    this.forceUpdateArrows();
                }, 100);
            }, 100);

            // Скрываем пустое сообщение
            this.canvasManager.hideEmptyMessage();

            // Создаем новый снимок истории
            this.historyManager.clear();
            this.historyManager.createSnapshot();

            // Обновляем хеш
            this.updateHashInRealTime();

            // Показываем уведомление об успехе
            this.showNotification('Проект успешно загружен из буфера обмена!', 'success');

        } catch (error) {
            console.error('Error loading from clipboard:', error);
            alert('Произошла ошибка при загрузке данных из буфера обмена');
        }
    }

    // Очистка canvas без подтверждения (для загрузки)
    clearCanvasForLoad() {
        // Очищаем данные
        this.blocks = {};
        this.connections = [];
        this.selectedBlock = null;

        // Очищаем DOM
        const canvasContent = this.canvasManager.getCanvasContentElement();
        if (canvasContent) {
            canvasContent.querySelectorAll('.bot-block').forEach(block => block.remove());
        }

        // Очищаем SVG стрелок
        const svg = this.canvasManager.getArrowSvgElement();
        if (svg) {
            svg.innerHTML = svg.innerHTML.replace(/<path[^>]*>/g, '');
        }
    }

    // Создание блока из загруженных данных
    createBlockElementFromData(blockData) {
        const blockElement = document.createElement('div');
        blockElement.className = 'bot-block';
        blockElement.id = blockData.id;
        blockElement.style.left = blockData.x + 'px';
        blockElement.style.top = blockData.y + 'px';
        
        // Генерируем содержимое блока
        blockElement.innerHTML = BlockGenerator.generateBlockContent(blockData);
        
        // Добавляем обработчик клика
        blockElement.addEventListener('click', () => this.selectBlock(blockData.id));
        
        // Делаем блок перетаскиваемым
        this.makeBlockDraggable(blockElement);
        
        // Добавляем на canvas
        const canvasContent = this.canvasManager.getCanvasContentElement();
        canvasContent.appendChild(blockElement);
    }

    // Показ уведомлений
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00b894' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 300px;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    // Сохранение бота в файл
    saveToFile() {
        if (Object.keys(this.blocks).length === 0) {
            alert('Нет блоков для сохранения');
            return;
        }

        try {
            // Получаем данные бота
            const botData = {
                blocks: this.blocks,
                connections: this.connections,
                blockCounter: this.blockCounter,
                settings: {
                    botName: document.getElementById('bot-name')?.value || 'МойБот',
                    botToken: document.getElementById('bot-token')?.value || ''
                },
                version: '1.0',
                created: new Date().toISOString()
            };

            // Конвертируем в JSON
            const jsonString = JSON.stringify(botData, null, 2);
            
            // Создаем Blob
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Создаем ссылку для скачивания
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Формируем имя файла
            const botName = botData.settings.botName.replace(/[^a-zа-яё0-9]/gi, '_');
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `${botName}_${timestamp}.bot`;
            
            // Скачиваем файл
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Освобождаем URL
            URL.revokeObjectURL(url);
            
            this.showNotification('Файл успешно сохранен!', 'success');
        } catch (error) {
            console.error('Error saving to file:', error);
            alert('Произошла ошибка при сохранении файла');
        }
    }

    // Загрузка бота из файла
    loadFromFile() {
        const fileInput = document.getElementById('file-input');
        if (!fileInput) {
            alert('Элемент загрузки файла не найден');
            return;
        }

        // Очищаем старое значение и клонируем input для полной очистки обработчиков
        fileInput.value = '';
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);

        // Создаем обработчик для загрузки файла (один раз)
        const handleFileLoad = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Проверяем расширение файла
            if (!file.name.endsWith('.bot') && !file.name.endsWith('.json')) {
                alert('Пожалуйста, выберите файл с расширением .bot или .json');
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const botData = JSON.parse(content);

                    // Валидируем структуру данных
                    if (!botData.blocks || !botData.connections) {
                        alert('Некорректная структура файла бота');
                        return;
                    }

                    // Подтверждение загрузки
                    if (Object.keys(this.blocks).length > 0) {
                        if (!confirm('Это заменит текущий проект. Продолжить?')) {
                            fileInput.value = '';
                            return;
                        }
                    }

                    // Очищаем текущие данные
                    this.clearCanvasForLoad();

                    // Загружаем новые данные
                    this.blocks = botData.blocks || {};
                    this.connections = botData.connections || [];
                    this.blockCounter = botData.blockCounter || Math.max(
                        ...Object.values(this.blocks).map(b => 
                            parseInt(b.id.replace('block_', '')) || 0
                        ), 0
                    );

                    // Обновляем глобальные ссылки
                    window.blocks = this.blocks;
                    window.connections = this.connections;

                    // Восстанавливаем настройки бота
                    if (botData.settings) {
                        const nameInput = document.getElementById('bot-name');
                        const tokenInput = document.getElementById('bot-token');
                        if (nameInput && botData.settings.botName) {
                            nameInput.value = botData.settings.botName;
                        }
                        if (tokenInput && botData.settings.botToken) {
                            tokenInput.value = botData.settings.botToken;
                        }
                    }

                    // Восстанавливаем блоки на canvas
                    Object.values(this.blocks).forEach(blockData => {
                        Utils.normalizeBlockConnections(blockData);
                        this.createBlockElementFromData(blockData);
                    });

                    // Восстанавливаем соединения после создания всех блоков
                    (this.connections || []).forEach(connection => {
                        this.createConnection(connection.from, connection.to, {
                            fromPort: connection.fromPort || 'default',
                            connectionId: connection.id,
                            skipHashUpdate: true
                        });
                    });
                    
                    // Принудительно обновляем все стрелки после загрузки
                    setTimeout(() => {
                        this.canvasManager.clearCanvasRectCache();
                        this.updateArrows();
                        
                        setTimeout(() => {
                            this.forceUpdateArrows();
                        }, 100);
                    }, 100);

                    // Скрываем пустое сообщение
                    this.canvasManager.hideEmptyMessage();

                    // Создаем новый снимок истории
                    this.historyManager.clear();
                    this.historyManager.createSnapshot();

                    // Обновляем хеш
                    this.updateHashInRealTime();

                    // Показываем уведомление об успехе
                    this.showNotification(`Проект "${file.name}" успешно загружен!`, 'success');

                } catch (error) {
                    console.error('Error parsing file:', error);
                    alert('Ошибка при чтении файла. Проверьте корректность данных.');
                } finally {
                    // Очищаем input для возможности повторной загрузки того же файла
                    fileInput.value = '';
                }
            };

            reader.onerror = () => {
                alert('Ошибка при чтении файла');
                fileInput.value = '';
            };

            reader.readAsText(file);
        };

        // Добавляем обработчик с опцией once: true (автоматически удаляется после первого срабатывания)
        newFileInput.addEventListener('change', handleFileLoad, { once: true });

        // Открываем диалог выбора файла
        newFileInput.click();
    }

    // Экспорт бота в Python код
    exportBot() {
        if (typeof PythonExporter !== 'undefined') {
            PythonExporter.exportBot();
        } else {
            alert('Модуль экспорта не загружен');
        }
    }

    previewBot() {
        if (Object.keys(this.blocks).length === 0) {
            alert('Добавьте блоки для предпросмотра');
            return;
        }

        // Создаем экземпляр симулятора
        const simulator = new BotSimulator(this.blocks, this.connections);
        window.currentSimulator = simulator; // Сохраняем для глобального доступа
        simulator.start();
    }

    // Центрирование canvas на блоках и сброс зума
    centerCanvas() {
        const blockIds = Object.keys(this.blocks);
        
        // Если блоков нет - просто сбрасываем зум и позицию
        if (blockIds.length === 0) {
            this.canvasManager.resetZoom();
            this.showNotification('Canvas сброшен', 'info');
            return;
        }

        // Находим границы всех блоков
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        blockIds.forEach(blockId => {
            const block = this.blocks[blockId];
            const blockElement = document.getElementById(blockId);
            
            if (blockElement) {
                const blockWidth = blockElement.offsetWidth || 250;
                const blockHeight = blockElement.offsetHeight || 100;
                
                minX = Math.min(minX, block.x);
                minY = Math.min(minY, block.y);
                maxX = Math.max(maxX, block.x + blockWidth);
                maxY = Math.max(maxY, block.y + blockHeight);
            }
        });

        // Находим центр всех блоков
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Получаем размер видимой области canvas
        const canvas = document.getElementById('canvas');
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;

        // Вычисляем смещение чтобы центр блоков оказался в центре экрана
        const offsetX = (canvasWidth / 2) - centerX;
        const offsetY = (canvasHeight / 2) - centerY;

        // Применяем центрирование
        this.canvasManager.canvasOffsetX = offsetX;
        this.canvasManager.canvasOffsetY = offsetY;
        this.canvasManager.setZoom(1); // Сброс зума на 100%

        this.showNotification('Canvas центрирован', 'success');
    }
}

// Экспортируем класс
window.BotBuilder = BotBuilder;
