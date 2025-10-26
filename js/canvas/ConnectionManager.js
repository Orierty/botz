/**
 * Менеджер соединений между блоками
 * Управляет созданием, отображением и удалением связей между блоками
 */

class ConnectionManager {
    constructor() {
        this.connectMode = false;
        this.breakMode = false;
        this.firstSelectedBlock = null;
        this.selectedOutputPort = null;
        this.branchPickerElement = null;
        this.branchPickerBlockId = null;
        this.isCreatingConnection = false; // Флаг для предотвращения двойных соединений
        
        this.setupBranchPicker();
        this.setupRightClickHandler();
    }

    // Настройка обработчика правой кнопки мыши для отмены действий
    setupRightClickHandler() {
        document.addEventListener('contextmenu', (e) => {
            // Отменяем режим соединения
            if (this.connectMode) {
                e.preventDefault();
                this.toggleConnectMode();
                return;
            }
            
            // Отменяем режим разрыва
            if (this.breakMode) {
                e.preventDefault();
                this.toggleBreakMode();
                return;
            }
            
            // Сбрасываем выбор при частичном соединении
            if (this.firstSelectedBlock) {
                e.preventDefault();
                this.resetConnectionSelection();
                return;
            }
        });
    }

    // Настройка выбора ветки для блоков с множественными выходами
    setupBranchPicker() {
        // Branch picker будет создан динамически при необходимости
    }

    // Создание и отображение выбора ветки
    ensureBranchPicker() {
        if (this.branchPickerElement) {
            return this.branchPickerElement;
        }

        const picker = document.createElement('div');
        picker.className = 'branch-picker hidden';
        picker.innerHTML = `
            <div class="branch-picker-title">Выберите ветку</div>
            <div class="branch-picker-buttons">
                <button type="button" data-branch="true">Да</button>
                <button type="button" data-branch="false">Нет</button>
            </div>
        `;

        picker.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleBranchPickerSelection(e.currentTarget.getAttribute('data-branch'));
            });
        });

        document.body.appendChild(picker);
        this.branchPickerElement = picker;
        return this.branchPickerElement;
    }

    // Отображение выбора ветки
    showBranchPicker(blockId) {
        const blockElement = document.getElementById(blockId);
        const blockData = window.blocks && window.blocks[blockId];

        if (!blockElement || !blockData) {
            return;
        }

        const picker = this.ensureBranchPicker();
        this.branchPickerBlockId = blockId;
        this.updateBranchPickerButtons(blockId);

        const rect = blockElement.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;

        picker.style.top = `${rect.top + scrollY + rect.height / 2}px`;
        picker.style.left = `${rect.right + scrollX + 12}px`;
        picker.classList.remove('hidden');
    }

    // Скрытие выбора ветки
    hideBranchPicker() {
        if (this.branchPickerElement) {
            this.branchPickerElement.classList.add('hidden');
        }
        this.branchPickerBlockId = null;
    }

    // Обновление кнопок выбора ветки
    updateBranchPickerButtons(blockId) {
        const blockData = window.blocks && window.blocks[blockId];
        if (!blockData || !this.branchPickerElement) {
            return;
        }
        
        const available = this.getAvailableOutputs(blockId);
        const buttonsContainer = this.branchPickerElement.querySelector('.branch-picker-buttons');
        if (!buttonsContainer) return;
        
        // Очищаем существующие кнопки
        buttonsContainer.innerHTML = '';
        
        // Создаем кнопки для доступных портов
        available.forEach(port => {
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('data-branch', port);
            
            // Определяем текст кнопки в зависимости от типа блока и порта
            if (blockData.type === 'condition') {
                button.textContent = port === 'true' ? 'Да' : 'Нет';
            } else if (blockData.type === 'inline_keyboard') {
                const buttonData = blockData.buttons?.find(b => b.callback_data === port);
                button.textContent = buttonData ? buttonData.text : port;
            } else if (blockData.type === 'order_confirm') {
                const portLabels = {
                    'confirm_order': '✅ Подтвердить',
                    'edit_order': '✏️ Редактировать', 
                    'cancel_order': '❌ Отменить'
                };
                button.textContent = portLabels[port] || port;
            } else {
                button.textContent = port;
            }
            
            button.addEventListener('click', (e) => {
                this.handleBranchPickerSelection(e.currentTarget.getAttribute('data-branch'));
            });
            
            buttonsContainer.appendChild(button);
        });
    }

    // Обработка выбора ветки
    handleBranchPickerSelection(branch) {
        if (!this.branchPickerBlockId) {
            return;
        }

        const blockData = window.blocks && window.blocks[this.branchPickerBlockId];
        if (!blockData) {
            return;
        }

        const outputs = blockData.connections?.outputs || {};
        if (outputs[branch]) {
            alert('Эта ветка уже соединена. Разорвите существующее соединение, чтобы выбрать другую ветку.');
            return;
        }

        this.selectedOutputPort = branch;
        this.highlightAvailableTargetBlocks(this.branchPickerBlockId);
        this.hideBranchPicker();
    }

    // Получение доступных выходов блока
    getAvailableOutputs(blockId) {
        const blockData = window.blocks && window.blocks[blockId];
        if (!blockData) return [];
        
        // Для inline_keyboard блоков возвращаем все порты кнопок
        if (blockData.type === 'inline_keyboard' && blockData.buttons) {
            return blockData.buttons.map(button => button.callback_data);
        }
        
        // Для condition блоков
        if (blockData.type === 'condition') {
            return ['true', 'false'];
        }
        
        // Для order_confirm блоков
        if (blockData.type === 'order_confirm') {
            const ports = [];
            if (blockData.show_confirm !== false) ports.push('confirm_order');
            if (blockData.show_edit !== false) ports.push('edit_order');
            if (blockData.show_cancel === true) ports.push('cancel_order');
            return ports.length > 0 ? ports : ['default'];
        }
        
        // Для всех остальных блоков - порт default
        return ['default'];
    }

    // Подсветка доступных целевых блоков
    highlightAvailableTargetBlocks(sourceBlockId) {
        document.querySelectorAll('.bot-block').forEach(block => {
            if (block.id !== sourceBlockId) {
                block.classList.add('block-available-for-connection');
            }
        });
    }

    // Очистка подсветки соединений
    clearConnectionHighlights() {
        document.querySelectorAll('.bot-block').forEach(block => {
            block.classList.remove('block-selected-for-connection', 'block-available-for-connection');
        });
    }

    // Сброс выбора соединения
    resetConnectionSelection() {
        this.clearConnectionHighlights();
        this.hideBranchPicker();
        this.firstSelectedBlock = null;
        this.selectedOutputPort = null;
        this.branchPickerBlockId = null;
    }

    // Начало создания соединения от блока
    startConnectionFromBlock(blockId) {
        const blockData = window.blocks && window.blocks[blockId];
        if (!blockData) {
            return;
        }

        this.clearConnectionHighlights();

        const blockElement = document.getElementById(blockId);
        if (blockElement) {
            blockElement.classList.add('block-selected-for-connection');
        }

        this.firstSelectedBlock = blockId;
        this.selectedOutputPort = null;

        const available = this.getAvailableOutputs(blockId);
        
        if (available.length === 0) {
            alert('У этого блока нет доступных выходов.');
            this.resetConnectionSelection();
            return;
        }
        
        // Для блоков с множественными портами показываем выбор
        if (blockData.type === 'condition' || blockData.type === 'inline_keyboard' || blockData.type === 'order_confirm') {
            this.showBranchPicker(blockId);
        } else {
            // Для обычных блоков используем порт по умолчанию
            this.selectedOutputPort = available.includes('default') ? 'default' : available[0];
            this.highlightAvailableTargetBlocks(blockId);
        }
    }

    // Проверка возможности подключения входа к блоку
    canBlockAcceptInput(blockId) {
        const blockData = window.blocks && window.blocks[blockId];
        if (!blockData) {
            return false;
        }
        return !blockData.connections || !blockData.connections.input;
    }

    // Завершение создания соединения
    finishConnection(targetBlockId) {
        if (!this.firstSelectedBlock || !this.selectedOutputPort) {
            return;
        }

        // Защита от двойного создания соединения
        if (this.isCreatingConnection) {
            console.log('Connection creation already in progress, ignoring');
            return;
        }

        if (!this.canBlockAcceptInput(targetBlockId)) {
            alert('Целевой блок уже имеет входящее соединение. Сначала разорвите его.');
            return;
        }

        // Проверяем, не существует ли уже такое соединение
        if (this.connectionExists(this.firstSelectedBlock, targetBlockId, this.selectedOutputPort)) {
            alert('Это соединение уже существует.');
            this.resetConnectionSelection();
            return;
        }

        // Устанавливаем флаг
        this.isCreatingConnection = true;

        if (window.createConnection) {
            window.createConnection(this.firstSelectedBlock, targetBlockId, { fromPort: this.selectedOutputPort });
        }
        
        // Сбрасываем флаг через небольшую задержку
        setTimeout(() => {
            this.isCreatingConnection = false;
        }, 100);

        this.resetConnectionSelection();
    }

    // Проверка существования соединения
    connectionExists(fromBlockId, toBlockId, fromPort) {
        if (!window.connections) return false;
        
        return window.connections.some(conn => 
            conn.from === fromBlockId && 
            conn.to === toBlockId && 
            conn.fromPort === fromPort
        );
    }

    // Переключение режима соединения
    toggleConnectMode() {
        if (this.breakMode) {
            this.toggleBreakMode(); // Отключаем режим разрыва
        }
        
        this.connectMode = !this.connectMode;
        const connectBtn = document.getElementById('connect-btn');
        
        if (this.connectMode) {
            connectBtn.classList.add('connect-mode');
            connectBtn.textContent = '❌ Отменить';
            document.body.style.cursor = 'crosshair';
            
            // Создаем bound функцию для правильного удаления обработчика
            this.boundBlockClickHandler = (e) => this.handleBlockClick(e);
            
            // Добавляем обработчики кликов для блоков
            document.querySelectorAll('.bot-block').forEach(block => {
                // Удаляем старый обработчик если был
                block.removeEventListener('click', this.boundBlockClickHandler);
                // Добавляем новый
                block.addEventListener('click', this.boundBlockClickHandler);
            });
        } else {
            connectBtn.classList.remove('connect-mode');
            connectBtn.textContent = '🔗 Соединить';
            document.body.style.cursor = 'default';
            
            // Убираем обработчики и подсветку
            if (this.boundBlockClickHandler) {
                document.querySelectorAll('.bot-block').forEach(block => {
                    block.removeEventListener('click', this.boundBlockClickHandler);
                });
            }

            this.resetConnectionSelection();
        }
    }

    // Переключение режима разрыва соединений
    toggleBreakMode() {
        if (this.connectMode) {
            this.toggleConnectMode(); // Отключаем режим соединения
        }
        
        this.breakMode = !this.breakMode;
        const breakBtn = document.getElementById('break-btn');
        const arrowSvg = document.getElementById('arrow-svg');
        
        if (this.breakMode) {
            breakBtn.classList.add('connect-mode');
            breakBtn.textContent = '❌ Отменить';
            document.body.style.cursor = 'crosshair';
            
            // Активируем режим разрыва для SVG контейнера
            if (arrowSvg) {
                arrowSvg.classList.add('break-mode-active');
            }
            
            // Создаем bound функцию для правильного удаления обработчика
            this.boundArrowClickHandler = (e) => this.handleArrowClick(e);
            
            // Добавляем обработчики кликов для стрелочек
            document.querySelectorAll('.connection-arrow').forEach(arrow => {
                // Удаляем старый обработчик если был
                arrow.removeEventListener('click', this.boundArrowClickHandler);
                // Добавляем новый
                arrow.addEventListener('click', this.boundArrowClickHandler);
            });
        } else {
            breakBtn.classList.remove('connect-mode');
            breakBtn.textContent = '✂️ Разорвать';
            document.body.style.cursor = 'default';
            
            // Деактивируем режим разрыва для SVG контейнера
            if (arrowSvg) {
                arrowSvg.classList.remove('break-mode-active');
            }
            
            // Убираем обработчики и анимацию
            if (this.boundArrowClickHandler) {
                document.querySelectorAll('.connection-arrow').forEach(arrow => {
                    arrow.removeEventListener('click', this.boundArrowClickHandler);
                    arrow.classList.remove('breaking');
                });
            }
        }
    }

    // Обработка клика по стрелочке для разрыва
    handleArrowClick(e) {
        if (!this.breakMode) return;
        
        e.stopPropagation();
        const connectionId = e.target.getAttribute('data-connection-id');
        
        if (confirm('Разорвать это соединение?')) {
            this.breakConnection(connectionId);
        }
    }

    // Разрыв соединения
    breakConnection(connectionId) {
        if (!window.connections) return;
        
        // Находим и удаляем соединение
        const connectionIndex = window.connections.findIndex(conn => conn.id === connectionId);
        if (connectionIndex === -1) return;
        
        const connection = window.connections[connectionIndex];

        // Обновляем данные блоков
        if (window.blocks) {
            const fromBlock = window.blocks[connection.from];
            if (fromBlock && fromBlock.connections && fromBlock.connections.outputs) {
                fromBlock.connections.outputs[connection.fromPort] = null;
            }

            const toBlock = window.blocks[connection.to];
            if (toBlock && toBlock.connections) {
                toBlock.connections.input = null;
            }
        }

        // Удаляем соединение из массива
        const [removedConnection] = window.connections.splice(connectionIndex, 1);

        // Удаляем стрелочку
        if (removedConnection && removedConnection.pathElement && removedConnection.pathElement.parentNode) {
            removedConnection.pathElement.remove();
        }
        
        // Создаем снимок для undo/redo
        if (window.historyManager) {
            window.historyManager.createSnapshot();
        }
        
        // Автоматически обновляем хеш при разрыве соединения
        if (window.updateHashInRealTime) {
            window.updateHashInRealTime();
        }
    }

    // Обработка клика по блоку в режиме соединения
    handleBlockClick(e) {
        if (!this.connectMode) return;
        
        e.stopPropagation();
        const blockId = e.currentTarget.id;
        
        if (!this.firstSelectedBlock) {
            this.startConnectionFromBlock(blockId);
        } else if (blockId !== this.firstSelectedBlock) {
            if (!this.selectedOutputPort) {
                // Поведение по умолчанию для блоков с одним выходом
                const defaultOutputs = this.getAvailableOutputs(this.firstSelectedBlock);
                if (defaultOutputs.length === 0) {
                    alert('У выбранного блока нет доступных выходов.');
                    this.resetConnectionSelection();
                    return;
                }
                this.selectedOutputPort = defaultOutputs[0];
            }
            this.finishConnection(blockId);
        }
    }
}

// Экспортируем класс для использования в других модулях
window.ConnectionManager = ConnectionManager;
