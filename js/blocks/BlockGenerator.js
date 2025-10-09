/**
 * Генератор HTML содержимого для различных типов блоков
 * Содержит всю логику создания форм и элементов управления блоков
 */

class BlockGenerator {
    // Основной метод для генерации содержимого блока
    static generateBlockContent(blockData) {
        switch(blockData.type) {
            case 'start':
                return this.generateStartBlock(blockData);
            case 'message':
                return this.generateMessageBlock(blockData);
            case 'condition':
                return this.generateConditionBlock(blockData);
            case 'question':
                return this.generateQuestionBlock(blockData);
            case 'choice':
                return this.generateChoiceBlock(blockData);
            case 'delay':
                return this.generateDelayBlock(blockData);
            case 'variable':
                return this.generateVariableBlock(blockData);
            case 'loop':
                return this.generateLoopBlock(blockData);
            case 'image':
                return this.generateImageBlock(blockData);
            case 'inline_keyboard':
                return this.generateInlineKeyboardBlock(blockData);
            case 'calculation':
                return this.generateCalculationBlock(blockData);
            case 'cart':
                return this.generateCartBlock(blockData);
            case 'payment':
                return this.generatePaymentBlock(blockData);
            case 'database':
                return this.generateDatabaseBlock(blockData);
            case 'catalog':
                return this.generateCatalogBlock(blockData);
            case 'order_form':
                return this.generateOrderFormBlock(blockData);
            case 'notification':
                return this.generateNotificationBlock(blockData);
            case 'order_confirm':
                return this.generateOrderConfirmBlock(blockData);
            case 'chatgpt':
                return this.generateChatGptBlock(blockData);
            default:
                return this.generateUnknownBlock(blockData);
        }
    }

    // Генерация базового заголовка блока
    static generateBlockHeader(title, badge, blockId) {
        return `
            <div class="block-header">
                <div class="block-title">${title}</div>
                <div class="block-type-badge">${badge}</div>
                <button class="delete-btn" onclick="deleteBlock('${blockId}')">&times;</button>
            </div>
        `;
    }

    // Генерация группы формы
    static generateFormGroup(label, content) {
        return `
            <div class="form-group">
                <label>${label}</label>
                ${content}
            </div>
        `;
    }

    // Блок старта
    static generateStartBlock(blockData) {
        const header = this.generateBlockHeader('Старт бота', 'START', blockData.id);
        const messageGroup = this.generateFormGroup(
            'Приветственное сообщение:',
            `<textarea placeholder="Привет! Я бот-помощник." onchange="updateBlockData('${blockData.id}', 'message', this.value)" oninput="updateBlockData('${blockData.id}', 'message', this.value)">${blockData.message || ''}</textarea>`
        );
        return header + messageGroup;
    }

    // Блок сообщения
    static generateMessageBlock(blockData) {
        const header = this.generateBlockHeader('Отправить сообщение', 'MESSAGE', blockData.id);
        const textGroup = this.generateFormGroup(
            'Текст сообщения:',
            `<textarea placeholder="Введите текст сообщения" onchange="updateBlockData('${blockData.id}', 'text', this.value)" oninput="updateBlockData('${blockData.id}', 'text', this.value)">${blockData.text || ''}</textarea>`
        );
        return header + textGroup;
    }

    // Блок условия
    static generateConditionBlock(blockData) {
        const header = this.generateBlockHeader('Условие', 'IF', blockData.id);
        
        const variableGroup = this.generateFormGroup(
            'Переменная:',
            `<input type="text" placeholder="user_name" onchange="updateBlockData('${blockData.id}', 'variable', this.value)" oninput="updateBlockData('${blockData.id}', 'variable', this.value)" value="${blockData.variable || ''}">`
        );
        
        const conditionSelect = `
            <select onchange="updateBlockData('${blockData.id}', 'condition', this.value)">
                <option value="equals" ${blockData.condition === 'equals' ? 'selected' : ''}>Равно</option>
                <option value="contains" ${blockData.condition === 'contains' ? 'selected' : ''}>Содержит</option>
                <option value="not_empty" ${blockData.condition === 'not_empty' ? 'selected' : ''}>Не пусто</option>
            </select>
        `;
        const conditionGroup = this.generateFormGroup('Условие:', conditionSelect);
        
        const valueGroup = this.generateFormGroup(
            'Значение:',
            `<input type="text" placeholder="значение" onchange="updateBlockData('${blockData.id}', 'value', this.value)" oninput="updateBlockData('${blockData.id}', 'value', this.value)" value="${blockData.value || ''}">`
        );
        
        return header + variableGroup + conditionGroup + valueGroup;
    }

    // Блок вопроса
    static generateQuestionBlock(blockData) {
        const header = this.generateBlockHeader('Задать вопрос', 'QUESTION', blockData.id);
        
        const questionGroup = this.generateFormGroup(
            'Вопрос:',
            `<textarea placeholder="Как дела?" onchange="updateBlockData('${blockData.id}', 'question', this.value)" oninput="updateBlockData('${blockData.id}', 'question', this.value)">${blockData.question || ''}</textarea>`
        );
        
        const variableGroup = this.generateFormGroup(
            'Сохранить ответ в переменную:',
            `<input type="text" placeholder="user_name" onchange="updateBlockData('${blockData.id}', 'variable', this.value)" oninput="updateBlockData('${blockData.id}', 'variable', this.value)" value="${blockData.variable || ''}">`
        );
        
        return header + questionGroup + variableGroup;
    }

    // Блок выбора
    static generateChoiceBlock(blockData) {
        const header = this.generateBlockHeader('Выбор из вариантов', 'CHOICE', blockData.id);
        
        const questionGroup = this.generateFormGroup(
            'Вопрос:',
            `<textarea placeholder="Выберите опцию:" onchange="updateBlockData('${blockData.id}', 'question', this.value)" oninput="updateBlockData('${blockData.id}', 'question', this.value)">${blockData.question || ''}</textarea>`
        );
        
        const options = (blockData.options || ['']).map((option, index) => `
            <div class="option-item">
                <input type="text" placeholder="Вариант ${index + 1}" onchange="updateChoiceOptions('${blockData.id}')" oninput="updateChoiceOptions('${blockData.id}')" value="${option}">
                <button class="remove-option" onclick="removeOption(this)">&times;</button>
            </div>
        `).join('');
        
        const optionsContent = `
            <div id="${blockData.id}_options">
                ${options}
            </div>
            <button class="add-option" onclick="addOption('${blockData.id}')">+ Добавить вариант</button>
        `;
        const optionsGroup = this.generateFormGroup('Варианты ответов:', optionsContent);
        
        const variableGroup = this.generateFormGroup(
            'Сохранить выбор в переменную:',
            `<input type="text" placeholder="user_choice" onchange="updateBlockData('${blockData.id}', 'variable', this.value)" oninput="updateBlockData('${blockData.id}', 'variable', this.value)" value="${blockData.variable || ''}">`
        );
        
        return header + questionGroup + optionsGroup + variableGroup;
    }

    // Блок задержки
    static generateDelayBlock(blockData) {
        const header = this.generateBlockHeader('Задержка', 'DELAY', blockData.id);
        const secondsGroup = this.generateFormGroup(
            'Задержка (секунды):',
            `<input type="number" value="${blockData.seconds || 1}" min="1" onchange="updateBlockData('${blockData.id}', 'seconds', this.value)" oninput="updateBlockData('${blockData.id}', 'seconds', this.value)">`
        );
        return header + secondsGroup;
    }

    // Блок переменной
    static generateVariableBlock(blockData) {
        const header = this.generateBlockHeader('Установить переменную', 'VAR', blockData.id);
        
        const variableGroup = this.generateFormGroup(
            'Имя переменной:',
            `<input type="text" placeholder="my_var" onchange="updateBlockData('${blockData.id}', 'variable', this.value)" oninput="updateBlockData('${blockData.id}', 'variable', this.value)" value="${blockData.variable || ''}">`
        );
        
        const valueGroup = this.generateFormGroup(
            'Значение:',
            `<input type="text" placeholder="значение" onchange="updateBlockData('${blockData.id}', 'value', this.value)" oninput="updateBlockData('${blockData.id}', 'value', this.value)" value="${blockData.value || ''}">`
        );
        
        return header + variableGroup + valueGroup;
    }

    // Блок цикла
    static generateLoopBlock(blockData) {
        const header = this.generateBlockHeader('Цикл', 'LOOP', blockData.id);
        
        const loopTypeSelect = `
            <select onchange="updateBlockData('${blockData.id}', 'loop_type', this.value)">
                <option value="count" ${blockData.loop_type === 'count' || !blockData.loop_type ? 'selected' : ''}>Повторить N раз</option>
                <option value="while" ${blockData.loop_type === 'while' ? 'selected' : ''}>Пока условие истинно</option>
                <option value="list" ${blockData.loop_type === 'list' ? 'selected' : ''}>По списку элементов</option>
            </select>
        `;
        const loopTypeGroup = this.generateFormGroup('Тип цикла:', loopTypeSelect);
        
        const countSettings = `
            <div class="form-group" id="${blockData.id}_count_settings" style="display: ${blockData.loop_type === 'count' || !blockData.loop_type ? 'block' : 'none'};">
                <label>Количество повторений:</label>
                <input type="number" value="${blockData.count || 3}" min="1" onchange="updateBlockData('${blockData.id}', 'count', this.value)" oninput="updateBlockData('${blockData.id}', 'count', this.value)">
            </div>
        `;
        
        const whileSettings = `
            <div class="form-group" id="${blockData.id}_while_settings" style="display: ${blockData.loop_type === 'while' ? 'block' : 'none'};">
                <label>Переменная для проверки:</label>
                <input type="text" placeholder="user_choice" onchange="updateBlockData('${blockData.id}', 'while_variable', this.value)" oninput="updateBlockData('${blockData.id}', 'while_variable', this.value)" value="${blockData.while_variable || ''}">
                <label>Условие:</label>
                <select onchange="updateBlockData('${blockData.id}', 'while_condition', this.value)">
                    <option value="equals" ${blockData.while_condition === 'equals' ? 'selected' : ''}>Равно</option>
                    <option value="not_equals" ${blockData.while_condition === 'not_equals' ? 'selected' : ''}>Не равно</option>
                    <option value="contains" ${blockData.while_condition === 'contains' ? 'selected' : ''}>Содержит</option>
                    <option value="not_empty" ${blockData.while_condition === 'not_empty' ? 'selected' : ''}>Не пусто</option>
                </select>
                <label>Значение:</label>
                <input type="text" placeholder="значение" onchange="updateBlockData('${blockData.id}', 'while_value', this.value)" oninput="updateBlockData('${blockData.id}', 'while_value', this.value)" value="${blockData.while_value || ''}">
            </div>
        `;
        
        const listSettings = `
            <div class="form-group" id="${blockData.id}_list_settings" style="display: ${blockData.loop_type === 'list' ? 'block' : 'none'};">
                <label>Список элементов (через запятую):</label>
                <textarea placeholder="элемент1, элемент2, элемент3" onchange="updateBlockData('${blockData.id}', 'list_items', this.value)" oninput="updateBlockData('${blockData.id}', 'list_items', this.value)">${blockData.list_items || ''}</textarea>
                <label>Переменная для текущего элемента:</label>
                <input type="text" placeholder="current_item" onchange="updateBlockData('${blockData.id}', 'list_variable', this.value)" oninput="updateBlockData('${blockData.id}', 'list_variable', this.value)" value="${blockData.list_variable || ''}">
            </div>
        `;
        
        const counterGroup = this.generateFormGroup(
            'Счетчик цикла в переменную:',
            `<input type="text" placeholder="loop_counter" onchange="updateBlockData('${blockData.id}', 'counter_variable', this.value)" oninput="updateBlockData('${blockData.id}', 'counter_variable', this.value)" value="${blockData.counter_variable || ''}">`
        );
        
        return header + loopTypeGroup + countSettings + whileSettings + listSettings + counterGroup;
    }

    // E-commerce блоки далее...
    static generateImageBlock(blockData) {
        const header = this.generateBlockHeader('Отправить изображение', 'IMAGE', blockData.id);
        const captionGroup = this.generateFormGroup(
            'Подпись к изображению:',
            `<textarea placeholder="Описание товара, цена, характеристики..." onchange="updateBlockData('${blockData.id}', 'caption', this.value)" oninput="updateBlockData('${blockData.id}', 'caption', this.value)">${blockData.caption || ''}</textarea>`
        );
        return header + captionGroup;
    }

    static generateInlineKeyboardBlock(blockData) {
        const header = this.generateBlockHeader('Inline-клавиатура', 'KEYBOARD', blockData.id);
        
        const messageGroup = this.generateFormGroup(
            'Текст сообщения:',
            `<textarea placeholder="Выберите действие:" onchange="updateBlockData('${blockData.id}', 'message', this.value)" oninput="updateBlockData('${blockData.id}', 'message', this.value)">${blockData.message || ''}</textarea>`
        );
        
        const buttons = (blockData.buttons || [{ text: '', callback_data: '' }]).map((button, index) => `
            <div class="button-item">
                <input type="text" placeholder="Текст кнопки" onchange="updateInlineButtons('${blockData.id}')" oninput="updateInlineButtons('${blockData.id}')" value="${button.text}">
                <input type="text" placeholder="callback_data" onchange="updateInlineButtons('${blockData.id}')" oninput="updateInlineButtons('${blockData.id}')" value="${button.callback_data}">
                <button class="remove-button" onclick="removeInlineButton(this)">&times;</button>
            </div>
        `).join('');
        
        const buttonsContent = `
            <div id="${blockData.id}_buttons">
                ${buttons}
            </div>
            <button class="add-button" onclick="addInlineButton('${blockData.id}')">+ Добавить кнопку</button>
        `;
        const buttonsGroup = this.generateFormGroup('Кнопки:', buttonsContent);
        
        return header + messageGroup + buttonsGroup;
    }

    // Остальные E-commerce блоки (сокращенная версия для экономии места)
    static generateCalculationBlock(blockData) {
        const header = this.generateBlockHeader('Вычисления', 'CALC', blockData.id);
        const formulaGroup = this.generateFormGroup(
            'Формула:',
            `<input type="text" placeholder="{price} * {quantity}" onchange="updateBlockData('${blockData.id}', 'formula', this.value)" oninput="updateBlockData('${blockData.id}', 'formula', this.value)" value="${blockData.formula || ''}">`
        );
        const resultGroup = this.generateFormGroup(
            'Результат в переменную:',
            `<input type="text" placeholder="total_price" onchange="updateBlockData('${blockData.id}', 'result_variable', this.value)" oninput="updateBlockData('${blockData.id}', 'result_variable', this.value)" value="${blockData.result_variable || ''}">`
        );
        return header + formulaGroup + resultGroup;
    }

    static generateCartBlock(blockData) {
        const header = this.generateBlockHeader('Корзина', 'CART', blockData.id);
        const actionSelect = `
            <select onchange="updateBlockData('${blockData.id}', 'action', this.value)">
                <option value="add" ${blockData.action === 'add' ? 'selected' : ''}>Добавить товар</option>
                <option value="remove" ${blockData.action === 'remove' ? 'selected' : ''}>Удалить товар</option>
                <option value="show" ${blockData.action === 'show' ? 'selected' : ''}>Показать корзину</option>
                <option value="clear" ${blockData.action === 'clear' ? 'selected' : ''}>Очистить корзину</option>
                <option value="count" ${blockData.action === 'count' ? 'selected' : ''}>Количество товаров</option>
            </select>
        `;
        return header + this.generateFormGroup('Действие:', actionSelect);
    }

    // Продолжение других блоков...
    static generatePaymentBlock(blockData) {
        const header = this.generateBlockHeader('Оплата', 'PAY', blockData.id);
        return header + this.generateFormGroup('Заголовок:', `<input type="text" placeholder="Оплата заказа" value="${blockData.title || ''}">`);
    }

    static generateDatabaseBlock(blockData) {
        const header = this.generateBlockHeader('База данных', 'DB', blockData.id);
        return header + this.generateFormGroup('Операция:', `<select><option>Сохранить</option><option>Загрузить</option></select>`);
    }

    static generateCatalogBlock(blockData) {
        const header = this.generateBlockHeader('Каталог товаров', 'CATALOG', blockData.id);
        
        // Парсим товары из JSON
        let products = [];
        try {
            products = JSON.parse(blockData.products || '[]');
        } catch (e) {
            products = [];
        }
        
        const productsHTML = products.map((product, index) => `
            <div class="product-item">
                <input type="text" placeholder="Название товара" oninput="updateCatalogProducts('${blockData.id}')" class="product-name" value="${product.name || ''}">
                <input type="text" placeholder="Цена" oninput="updateCatalogProducts('${blockData.id}')" class="product-price" value="${product.price || ''}">
                <input type="text" placeholder="Описание (опционально)" oninput="updateCatalogProducts('${blockData.id}')" class="product-desc" value="${product.description || ''}">
                <button class="remove-product" onclick="removeProduct(this, '${blockData.id}')">&times;</button>
            </div>
        `).join('');
        
        const productsListHTML = productsHTML || `
            <div class="product-item">
                <input type="text" placeholder="Название товара" oninput="updateCatalogProducts('${blockData.id}')" class="product-name">
                <input type="text" placeholder="Цена" oninput="updateCatalogProducts('${blockData.id}')" class="product-price">
                <input type="text" placeholder="Описание (опционально)" oninput="updateCatalogProducts('${blockData.id}')" class="product-desc">
                <button class="remove-product" onclick="removeProduct(this, '${blockData.id}')">&times;</button>
            </div>
        `;
        
        return header + `
            <div class="form-group">
                <label>Товары:</label>
                <div id="${blockData.id}_products" class="products-list">
                    ${productsListHTML}
                </div>
                <button class="add-field" onclick="addProduct('${blockData.id}')">+ Добавить товар</button>
                <small style="display: block; margin-top: 8px; color: #666;">По 8 товаров на странице, автоматическая пагинация</small>
            </div>
        `;
    }

    static generateOrderFormBlock(blockData) {
        const header = this.generateBlockHeader('Форма заказа', 'FORM', blockData.id);
        return header + this.generateFormGroup('Поля:', `<div>Настройка полей формы</div>`);
    }

    static generateNotificationBlock(blockData) {
        const header = this.generateBlockHeader('Уведомления', 'NOTIFY', blockData.id);
        return header + this.generateFormGroup('Кому отправить:', `<select><option>Администратору</option></select>`);
    }

    static generateOrderConfirmBlock(blockData) {
        const header = this.generateBlockHeader('Подтверждение заказа', 'CONFIRM', blockData.id);
        return header + this.generateFormGroup('Заголовок:', `<input type="text" placeholder="Подтверждение заказа" value="${blockData.title || ''}">`);
    }

    static generateChatGptBlock(blockData) {
        const header = this.generateBlockHeader('ChatGPT', 'GPT', blockData.id);
        
        const apiKeyGroup = this.generateFormGroup(
            'OpenAI API Key:',
            `<input type="password" placeholder="sk-..." onchange="updateBlockData('${blockData.id}', 'api_key', this.value)" oninput="updateBlockData('${blockData.id}', 'api_key', this.value)" value="${blockData.api_key || ''}">`
        );
        
        const promptGroup = this.generateFormGroup(
            'Промпт (можно использовать переменные):',
            `<textarea placeholder="Ответь на вопрос пользователя: {user_question}" onchange="updateBlockData('${blockData.id}', 'prompt', this.value)" oninput="updateBlockData('${blockData.id}', 'prompt', this.value)">${blockData.prompt || ''}</textarea>`
        );
        
        const modelGroup = this.generateFormGroup(
            'Модель:',
            `<select onchange="updateBlockData('${blockData.id}', 'model', this.value)">
                <option value="gpt-3.5-turbo" ${blockData.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                <option value="gpt-4" ${blockData.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                <option value="gpt-4-turbo" ${blockData.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
                <option value="gpt-4o" ${blockData.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o</option>
            </select>`
        );
        
        const maxTokensGroup = this.generateFormGroup(
            'Макс. токенов:',
            `<input type="number" min="10" max="4000" placeholder="500" onchange="updateBlockData('${blockData.id}', 'max_tokens', this.value)" oninput="updateBlockData('${blockData.id}', 'max_tokens', this.value)" value="${blockData.max_tokens || 500}">`
        );
        
        const temperatureGroup = this.generateFormGroup(
            'Temperature (0-2):',
            `<input type="number" min="0" max="2" step="0.1" placeholder="0.7" onchange="updateBlockData('${blockData.id}', 'temperature', this.value)" oninput="updateBlockData('${blockData.id}', 'temperature', this.value)" value="${blockData.temperature || 0.7}">`
        );
        
        const resultVarGroup = this.generateFormGroup(
            'Переменная для ответа:',
            `<input type="text" placeholder="gpt_response" onchange="updateBlockData('${blockData.id}', 'result_variable', this.value)" oninput="updateBlockData('${blockData.id}', 'result_variable', this.value)" value="${blockData.result_variable || 'gpt_response'}">`
        );
        
        return header + apiKeyGroup + promptGroup + modelGroup + maxTokensGroup + temperatureGroup + resultVarGroup;
    }

    static generateUnknownBlock(blockData) {
        return `
            <div class="block-header">
                <div class="block-title">Неизвестный тип: ${blockData.type}</div>
                <button class="delete-btn" onclick="deleteBlock('${blockData.id}')">&times;</button>
            </div>
        `;
    }
}

// Экспортируем класс для использования в других модулях
window.BlockGenerator = BlockGenerator;
