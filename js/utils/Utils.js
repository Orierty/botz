/**
 * Утилиты и вспомогательные функции
 * Содержит общие функции для работы с DOM, данными и валидации
 */

class Utils {
    // Генерация уникального ID для блоков
    static generateBlockId() {
        return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Генерация уникального ID для соединений
    static generateConnectionId() {
        return 'connection_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Глубокое клонирование объекта
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Проверка валидности типа блока
    static isValidBlockType(type) {
        const validTypes = [
            'start', 'message', 'question', 'choice', 'condition', 'delay', 'variable', 'loop',
            // E-commerce блоки
            'image', 'inline_keyboard', 'calculation', 'cart', 'payment', 'database', 
            'catalog', 'order_form', 'notification', 'order_confirm',
            // Интеграции
            'chatgpt'
        ];
        return validTypes.includes(type);
    }

    // Создание начальных соединений для блока
    static createInitialConnections(type) {
        if (type === 'condition') {
            return {
                input: null,
                outputs: {
                    true: null,
                    false: null
                }
            };
        }

        if (type === 'inline_keyboard') {
            return {
                input: null,
                outputs: {} // Будет заполнено динамически на основе кнопок
            };
        }

        if (type === 'order_confirm') {
            return {
                input: null,
                outputs: {
                    confirm_order: null,
                    edit_order: null,
                    cancel_order: null
                }
            };
        }

        return {
            input: null,
            outputs: {
                default: null
            }
        };
    }

    // Нормализация соединений блока
    static normalizeBlockConnections(blockData) {
        if (!blockData) {
            return;
        }

        const existing = blockData.connections || {};
        const normalized = this.createInitialConnections(blockData.type);

        if (typeof existing.input !== 'undefined') {
            normalized.input = existing.input;
        }

        const outputs = existing.outputs || {};

        if (blockData.type === 'condition') {
            normalized.outputs.true = outputs.true ?? existing.trueOutput ?? existing.output ?? null;
            normalized.outputs.false = outputs.false ?? existing.falseOutput ?? null;
        } else if (blockData.type === 'inline_keyboard') {
            // Для inline_keyboard соединения основаны на кнопках
            if (blockData.buttons) {
                blockData.buttons.forEach(button => {
                    if (button.callback_data) {
                        normalized.outputs[button.callback_data] = outputs[button.callback_data] || null;
                    }
                });
            }
        } else if (blockData.type === 'order_confirm') {
            normalized.outputs.confirm_order = outputs.confirm_order || null;
            normalized.outputs.edit_order = outputs.edit_order || null;
            normalized.outputs.cancel_order = outputs.cancel_order || null;
        } else {
            normalized.outputs.default = outputs.default ?? existing.output ?? null;
        }

        blockData.connections = normalized;
    }

    // Получение выходных соединений блока
    static getBlockOutputs(blockId) {
        if (!window.blocks || !window.blocks[blockId]) return {};
        const blockData = window.blocks[blockId];
        return (blockData && blockData.connections && blockData.connections.outputs) ? blockData.connections.outputs : {};
    }

    // Безопасное обновление данных блока
    static updateBlockData(blockId, field, value) {
        if (!window.blocks || !window.blocks[blockId]) return;
        
        window.blocks[blockId][field] = value;
        
        // Для inline_keyboard блоков обновляем соединения при изменении кнопок
        if (field === 'buttons' && window.blocks[blockId].type === 'inline_keyboard') {
            this.normalizeBlockConnections(window.blocks[blockId]);
        }
        
        // Создаем снимок для истории
        if (window.historyManager) {
            // Небольшая задержка для группировки изменений
            clearTimeout(this.updateTimeout);
            this.updateTimeout = setTimeout(() => {
                window.historyManager.createSnapshot();
            }, 1000);
        }
        
        // Обновляем хеш
        if (window.updateHashInRealTime) {
            window.updateHashInRealTime();
        }
    }

    // Валидация данных блока
    static validateBlockData(blockData) {
        if (!blockData || !blockData.type) {
            return { valid: false, errors: ['Отсутствует тип блока'] };
        }

        if (!this.isValidBlockType(blockData.type)) {
            return { valid: false, errors: [`Неизвестный тип блока: ${blockData.type}`] };
        }

        const errors = [];

        // Специфичные проверки для разных типов блоков
        switch (blockData.type) {
            case 'start':
                if (!blockData.message?.trim()) {
                    errors.push('Отсутствует приветственное сообщение');
                }
                break;
            
            case 'message':
                if (!blockData.text?.trim()) {
                    errors.push('Отсутствует текст сообщения');
                }
                break;
            
            case 'condition':
                if (!blockData.variable?.trim()) {
                    errors.push('Не указана переменная для проверки');
                }
                if (!blockData.condition) {
                    errors.push('Не выбрано условие');
                }
                break;
            
            case 'question':
                if (!blockData.question?.trim()) {
                    errors.push('Отсутствует текст вопроса');
                }
                if (!blockData.variable?.trim()) {
                    errors.push('Не указана переменная для сохранения ответа');
                }
                break;
            
            case 'choice':
                if (!blockData.question?.trim()) {
                    errors.push('Отсутствует текст вопроса');
                }
                if (!blockData.options || blockData.options.length === 0 || blockData.options.every(opt => !opt.trim())) {
                    errors.push('Не указаны варианты ответов');
                }
                break;
            
            case 'delay':
                const seconds = parseInt(blockData.seconds);
                if (!seconds || seconds < 1) {
                    errors.push('Некорректное значение задержки');
                }
                break;
        }

        return { valid: errors.length === 0, errors };
    }

    // Поиск блока по координатам
    static findBlockAtPosition(x, y) {
        const elements = document.elementsFromPoint(x, y);
        return elements.find(el => el.classList.contains('bot-block'));
    }

    // Вычисление центра блока
    static getBlockCenter(blockElement) {
        const rect = blockElement.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    // Вычисление расстояния между двумя точками
    static distance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Ограничение числа в пределах диапазона
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Дебаунс функции
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Троттлинг функции
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Форматирование размера файла
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Экранирование HTML
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Копирование текста в буфер обмена
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                return result;
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }

    // Получение текста из буфера обмена
    static async getFromClipboard() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                return await navigator.clipboard.readText();
            } else {
                // Fallback: просим пользователя вставить данные вручную
                return prompt('Вставьте хеш бота из буфера обмена:');
            }
        } catch (err) {
            console.warn('Clipboard API недоступен, используем prompt:', err);
            // Если API недоступен, просим пользователя вставить вручную
            return prompt('Вставьте хеш бота из буфера обмена:');
        }
    }

    // Проверка поддержки локального хранилища
    static isLocalStorageSupported() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Сохранение данных в localStorage с обработкой ошибок
    static saveToLocalStorage(key, data) {
        if (!this.isLocalStorageSupported()) {
            return false;
        }
        
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    }

    // Загрузка данных из localStorage
    static loadFromLocalStorage(key) {
        if (!this.isLocalStorageSupported()) {
            return null;
        }
        
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    }
}

// Экспортируем класс для использования в других модулях
window.Utils = Utils;
