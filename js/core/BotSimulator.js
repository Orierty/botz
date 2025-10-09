/**
 * Симулятор бота для предпросмотра
 * Исполняет логику бота прямо в браузере
 */

class BotSimulator {
    constructor(blocks, connections) {
        this.blocks = blocks;
        this.connections = connections;
        this.userData = {};
        this.currentBlockId = null;
        this.waitingForInput = false;
        this.waitingForCallback = false;
        this.messagesContainer = null;
        this.inputArea = null;
        this.modal = null;
    }

    // Запуск симулятора
    start() {
        this.modal = document.getElementById('preview-modal');
        this.messagesContainer = document.getElementById('preview-messages');
        this.inputArea = document.getElementById('preview-input-area');
        
        // Очищаем предыдущие сообщения
        this.messagesContainer.innerHTML = '';
        this.userData = {};
        
        // Скрываем поле ввода по умолчанию
        this.inputArea.style.display = 'none';
        
        // Показываем модальное окно
        this.modal.classList.remove('hidden');
        
        // Находим стартовый блок
        const startBlock = Object.values(this.blocks).find(b => b.type === 'start');
        if (!startBlock) {
            this.addBotMessage('❌ Ошибка: не найден стартовый блок');
            return;
        }
        
        // Показываем стартовое сообщение
        if (startBlock.message) {
            this.addBotMessage(startBlock.message);
        }
        
        // Переходим к следующему блоку
        setTimeout(() => {
            const nextBlockId = this.getNextBlock(startBlock);
            if (nextBlockId) {
                this.executeBlock(nextBlockId);
            }
        }, 500);
    }

    // Получение следующего блока
    getNextBlock(block) {
        if (!block.connections || !block.connections.outputs) {
            return null;
        }
        
        const defaultOutput = block.connections.outputs.default;
        if (Array.isArray(defaultOutput)) {
            return defaultOutput[0];
        }
        return defaultOutput;
    }

    // Выполнение блока
    executeBlock(blockId) {
        if (!blockId) return;
        
        const block = this.blocks[blockId];
        if (!block) {
            console.error('Block not found:', blockId);
            return;
        }
        
        this.currentBlockId = blockId;
        
        switch(block.type) {
            case 'message':
                this.handleMessageBlock(block);
                break;
            case 'question':
                this.handleQuestionBlock(block);
                break;
            case 'choice':
                this.handleChoiceBlock(block);
                break;
            case 'inline_keyboard':
                this.handleInlineKeyboardBlock(block);
                break;
            case 'condition':
                this.handleConditionBlock(block);
                break;
            case 'delay':
                this.handleDelayBlock(block);
                break;
            case 'variable':
                this.handleVariableBlock(block);
                break;
            case 'chatgpt':
                this.handleChatGptBlock(block);
                break;
            case 'image':
                this.handleImageBlock(block);
                break;
            case 'calculation':
                this.handleCalculationBlock(block);
                break;
            case 'cart':
                this.handleCartBlock(block);
                break;
            case 'catalog':
                this.handleCatalogBlock(block);
                break;
            case 'order_form':
                this.handleOrderFormBlock(block);
                break;
            case 'order_confirm':
                this.handleOrderConfirmBlock(block);
                break;
            case 'payment':
                this.handlePaymentBlock(block);
                break;
            case 'database':
                this.handleDatabaseBlock(block);
                break;
            case 'notification':
                this.handleNotificationBlock(block);
                break;
            case 'loop':
                this.handleLoopBlock(block);
                break;
            default:
                this.addBotMessage(`⚠️ Блок типа "${block.type}" не поддерживается в предпросмотре`);
                const nextBlockId = this.getNextBlock(block);
                if (nextBlockId) {
                    setTimeout(() => this.executeBlock(nextBlockId), 300);
                }
        }
    }

    // Обработка блока сообщения
    handleMessageBlock(block) {
        const text = this.substituteVariables(block.text || '');
        this.addBotMessage(text);
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 500);
        }
    }

    // Обработка блока вопроса
    handleQuestionBlock(block) {
        const question = this.substituteVariables(block.question || '');
        this.addBotMessage(question);
        this.waitForUserInput(block.variable);
    }

    // Обработка блока выбора
    handleChoiceBlock(block) {
        const question = this.substituteVariables(block.question || '');
        const options = block.options || [];
        
        this.addBotMessage(question);
        
        if (options.length > 0) {
            this.addButtons(options, (option) => {
                this.userData[block.variable] = option;
                this.addUserMessage(option);
                
                const nextBlockId = this.getNextBlock(block);
                if (nextBlockId) {
                    setTimeout(() => this.executeBlock(nextBlockId), 300);
                }
            });
        }
    }

    // Обработка inline клавиатуры
    handleInlineKeyboardBlock(block) {
        const message = this.substituteVariables(block.message || '');
        const buttons = block.buttons || [];
        
        this.addBotMessage(message);
        
        if (buttons.length > 0) {
            this.addButtons(buttons.map(b => b.text), (text, index) => {
                const button = buttons[index];
                this.addUserMessage(text);
                
                // Находим следующий блок по callback_data
                const callbackData = button.callback_data;
                const nextBlockId = block.connections?.outputs?.[callbackData];
                
                if (nextBlockId) {
                    setTimeout(() => this.executeBlock(nextBlockId), 300);
                } else {
                    this.addBotMessage('❌ Не настроен переход для этой кнопки');
                }
            });
        }
    }

    // Обработка условия
    handleConditionBlock(block) {
        const variable = block.variable || '';
        const condition = block.condition || 'equals';
        const value = block.value || '';
        
        const userValue = this.userData[variable] || '';
        let result = false;
        
        switch(condition) {
            case 'equals':
                result = String(userValue) === String(value);
                break;
            case 'contains':
                result = String(userValue).includes(String(value));
                break;
            case 'not_empty':
                result = Boolean(String(userValue).trim());
                break;
            case 'not_equals':
                result = String(userValue) !== String(value);
                break;
        }
        
        const nextBlockId = result 
            ? block.connections?.outputs?.true 
            : block.connections?.outputs?.false;
            
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 200);
        }
    }

    // Обработка задержки
    handleDelayBlock(block) {
        const seconds = parseInt(block.seconds) || 1;
        this.showTyping();
        
        setTimeout(() => {
            this.hideTyping();
            const nextBlockId = this.getNextBlock(block);
            if (nextBlockId) {
                this.executeBlock(nextBlockId);
            }
        }, seconds * 1000);
    }

    // Обработка переменной
    handleVariableBlock(block) {
        const varName = block.variable || '';
        const varValue = this.substituteVariables(block.value || '');
        
        if (varName) {
            this.userData[varName] = varValue;
        }
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 100);
        }
    }

    // Обработка ChatGPT блока
    handleChatGptBlock(block) {
        const prompt = this.substituteVariables(block.prompt || '');
        this.addBotMessage(`🤖 ChatGPT обрабатывает: "${prompt}"`);
        this.showTyping();
        
        // Симуляция ответа ChatGPT
        setTimeout(() => {
            this.hideTyping();
            const mockResponse = 'Это симуляция ответа ChatGPT. В реальном боте здесь будет настоящий ответ от API.';
            this.userData[block.result_variable || 'gpt_response'] = mockResponse;
            
            const nextBlockId = this.getNextBlock(block);
            if (nextBlockId) {
                this.executeBlock(nextBlockId);
            }
        }, 2000);
    }

    // Обработка блока изображения
    handleImageBlock(block) {
        const caption = this.substituteVariables(block.caption || '');
        const imagePath = block.image_file || 'placeholder.jpg';
        this.addBotMessage(`📸 [Изображение: ${imagePath}]\n\n${caption}`);
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 500);
        }
    }

    // Обработка блока вычислений
    handleCalculationBlock(block) {
        const formula = block.formula || '';
        const resultVar = block.result_variable || '';
        
        try {
            // Подставляем переменные в формулу
            let processedFormula = this.substituteVariables(formula);
            
            // Безопасное вычисление (только числа и операторы)
            const allowedChars = /^[0-9+\-*/.() ]+$/;
            if (allowedChars.test(processedFormula)) {
                const result = eval(processedFormula);
                this.userData[resultVar] = result;
            } else {
                this.userData[resultVar] = 0;
            }
        } catch (e) {
            this.userData[resultVar] = 0;
        }
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 200);
        }
    }

    // Обработка блока корзины
    handleCartBlock(block) {
        const action = block.action || 'add';
        
        if (!this.userData._cart) {
            this.userData._cart = {};
        }
        
        switch(action) {
            case 'add':
                const productId = this.userData[block.product_id] || 'товар';
                const quantity = parseInt(this.userData[block.quantity]) || 1;
                this.userData._cart[productId] = (this.userData._cart[productId] || 0) + quantity;
                this.addBotMessage(`✅ Добавлено в корзину: ${productId} (${quantity} шт.)`);
                break;
            case 'show':
                if (Object.keys(this.userData._cart).length === 0) {
                    this.addBotMessage('🛒 Корзина пуста');
                } else {
                    let cartText = '🛒 Ваша корзина:\n\n';
                    for (const [product, qty] of Object.entries(this.userData._cart)) {
                        cartText += `• ${product}: ${qty} шт.\n`;
                    }
                    this.addBotMessage(cartText);
                }
                break;
            case 'clear':
                this.userData._cart = {};
                this.addBotMessage('🗑️ Корзина очищена');
                break;
            case 'remove':
                const removeProductId = this.userData[block.product_id];
                if (this.userData._cart[removeProductId]) {
                    delete this.userData._cart[removeProductId];
                    this.addBotMessage(`🗑️ Удалено из корзины: ${removeProductId}`);
                }
                break;
        }
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 500);
        }
    }

    // Обработка блока каталога
    handleCatalogBlock(block) {
        try {
            const productsData = block.products || '[]';
            const products = JSON.parse(productsData);
            
            if (products.length === 0) {
                this.addBotMessage('📋 Каталог пуст');
                const nextBlockId = this.getNextBlock(block);
                if (nextBlockId) {
                    setTimeout(() => this.executeBlock(nextBlockId), 500);
                }
            } else {
                // Сохраняем продукты для возможного выбора
                this.userData._catalog_products = products;
                
                // Показываем заголовок каталога
                this.addBotMessage('📋 Каталог товаров:\n\nВыберите товар:');
                
                // Создаем inline кнопки для каждого товара
                const buttonTexts = products.map(product => `${product.name} - ${product.price} руб`);
                
                this.addButtons(buttonTexts, (text, index) => {
                    const product = products[index];
                    
                    // Сохраняем данные выбранного товара в переменные
                    this.userData.product_name = product.name;
                    this.userData.product_price = product.price;
                    this.userData.product_description = product.description || '';
                    this.userData.selected_product_number = index + 1;
                    
                    // Добавляем сообщение пользователя о выборе
                    this.addUserMessage(text);
                    
                    // Переходим к следующему блоку
                    const nextBlockId = this.getNextBlock(block);
                    if (nextBlockId) {
                        setTimeout(() => this.executeBlock(nextBlockId), 300);
                    }
                });
            }
        } catch (e) {
            console.error('Catalog error:', e);
            this.addBotMessage('❌ Ошибка загрузки каталога');
            const nextBlockId = this.getNextBlock(block);
            if (nextBlockId) {
                setTimeout(() => this.executeBlock(nextBlockId), 500);
            }
        }
    }

    // Обработка блока формы заказа
    handleOrderFormBlock(block) {
        const fields = block.fields || [];
        
        if (fields.length === 0) {
            const nextBlockId = this.getNextBlock(block);
            if (nextBlockId) {
                this.executeBlock(nextBlockId);
            }
            return;
        }
        
        // Обрабатываем поля последовательно
        this.processFormFields(block, fields, 0);
    }

    // Обработка полей формы
    processFormFields(block, fields, currentIndex) {
        if (currentIndex >= fields.length) {
            // Все поля заполнены
            const successMsg = block.success_message || 'Данные получены';
            this.addBotMessage(successMsg);
            
            const nextBlockId = this.getNextBlock(block);
            if (nextBlockId) {
                setTimeout(() => this.executeBlock(nextBlockId), 500);
            }
            return;
        }
        
        const field = fields[currentIndex];
        const fieldNames = {
            'name': 'Имя',
            'phone': 'Телефон',
            'email': 'Email',
            'address': 'Адрес доставки',
            'comment': 'Комментарий'
        };
        
        const fieldName = fieldNames[field.type] || field.type;
        this.addBotMessage(`Введите ${fieldName}:`);
        
        // Сохраняем контекст для продолжения
        this.formContext = {
            block: block,
            fields: fields,
            currentIndex: currentIndex,
            variable: field.variable
        };
        
        this.waitForUserInput(field.variable);
    }

    // Обработка блока подтверждения заказа
    handleOrderConfirmBlock(block) {
        const title = this.substituteVariables(block.title || 'Подтверждение');
        const template = this.substituteVariables(block.template || 'Заказ готов к подтверждению');
        
        this.addBotMessage(`${title}\n\n${template}`);
        
        const buttons = [];
        const buttonCallbacks = {};
        
        if (block.show_confirm !== false) {
            buttons.push('✅ Подтвердить');
            buttonCallbacks['✅ Подтвердить'] = 'confirm_order';
        }
        if (block.show_edit !== false) {
            buttons.push('✏️ Редактировать');
            buttonCallbacks['✏️ Редактировать'] = 'edit_order';
        }
        if (block.show_cancel === true) {
            buttons.push('❌ Отменить');
            buttonCallbacks['❌ Отменить'] = 'cancel_order';
        }
        
        if (buttons.length > 0) {
            this.addButtons(buttons, (text) => {
                this.addUserMessage(text);
                const callbackData = buttonCallbacks[text];
                const nextBlockId = block.connections?.outputs?.[callbackData];
                
                if (nextBlockId) {
                    setTimeout(() => this.executeBlock(nextBlockId), 300);
                }
            });
        }
    }

    // Обработка блока оплаты
    handlePaymentBlock(block) {
        const title = this.substituteVariables(block.title || 'Оплата');
        const description = this.substituteVariables(block.description || '');
        const amountVar = block.amount || '';
        const currency = block.currency || 'RUB';
        
        const amount = this.userData[amountVar] || 0;
        
        this.addBotMessage(`💳 ${title}\n\n${description}\n\n💰 Сумма: ${amount} ${currency}\n\n[В реальном боте здесь будет кнопка оплаты]`);
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 1000);
        }
    }

    // Обработка блока базы данных
    handleDatabaseBlock(block) {
        const operation = block.operation || 'save';
        const key = this.substituteVariables(block.key || '');
        
        if (!this.userData._database) {
            this.userData._database = {};
        }
        
        switch(operation) {
            case 'save':
                const dataVar = block.data || '';
                const data = this.userData[dataVar];
                this.userData._database[key] = data;
                break;
            case 'load':
                const resultVar = block.result_variable || '';
                this.userData[resultVar] = this.userData._database[key] || '';
                break;
            case 'delete':
                delete this.userData._database[key];
                break;
        }
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 200);
        }
    }

    // Обработка блока уведомлений
    handleNotificationBlock(block) {
        const message = this.substituteVariables(block.message || '');
        const target = block.target || 'admin';
        
        if (target === 'admin') {
            this.addBotMessage(`🔔 [Уведомление для администратора]\n\n${message}`);
        } else {
            this.addBotMessage(`🔔 [Уведомление отправлено]`);
        }
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 500);
        }
    }

    // Обработка блока цикла
    handleLoopBlock(block) {
        const loopType = block.loop_type || 'count';
        
        if (loopType === 'count') {
            const count = parseInt(block.count) || 3;
            const counterVar = block.counter_variable || '';
            
            // В предпросмотре просто показываем что цикл выполнится
            this.addBotMessage(`🔄 Цикл будет выполнен ${count} раз`);
            
            // Для простоты выполняем только первую итерацию
            if (counterVar) {
                this.userData[counterVar] = 1;
            }
        }
        
        const nextBlockId = this.getNextBlock(block);
        if (nextBlockId) {
            setTimeout(() => this.executeBlock(nextBlockId), 300);
        }
    }

    // Подстановка переменных
    substituteVariables(text) {
        if (!text) return '';
        
        let result = text;
        Object.keys(this.userData).forEach(key => {
            const value = this.userData[key];
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        });
        
        return result;
    }

    // Добавление сообщения от бота
    addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'preview-message bot';
        messageDiv.textContent = text;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    // Добавление сообщения от пользователя
    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'preview-message user';
        messageDiv.textContent = text;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    // Добавление кнопок
    addButtons(buttonTexts, callback) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'preview-buttons';
        
        buttonTexts.forEach((text, index) => {
            const button = document.createElement('button');
            button.className = 'preview-button';
            button.textContent = text;
            button.onclick = () => {
                callback(text, index);
                buttonsDiv.remove();
            };
            buttonsDiv.appendChild(button);
        });
        
        this.messagesContainer.appendChild(buttonsDiv);
        this.scrollToBottom();
    }

    // Ожидание ввода пользователя
    waitForUserInput(variable) {
        this.waitingForInput = true;
        this.inputArea.style.display = 'flex';
        
        const input = document.getElementById('preview-input');
        input.value = '';
        input.focus();
        
        // Сохраняем переменную для ввода
        this.inputVariable = variable;
    }

    // Отправка пользовательского сообщения
    sendMessage(text) {
        if (!this.waitingForInput) return;
        
        this.userData[this.inputVariable] = text;
        this.addUserMessage(text);
        
        this.waitingForInput = false;
        this.inputArea.style.display = 'none';
        
        // Проверяем, есть ли контекст формы
        if (this.formContext) {
            const { block, fields, currentIndex } = this.formContext;
            this.formContext = null;
            // Переходим к следующему полю формы
            setTimeout(() => this.processFormFields(block, fields, currentIndex + 1), 300);
        } else {
            const block = this.blocks[this.currentBlockId];
            const nextBlockId = this.getNextBlock(block);
            
            if (nextBlockId) {
                setTimeout(() => this.executeBlock(nextBlockId), 300);
            }
        }
    }

    // Показать индикатор печати
    showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'preview-message bot preview-loading';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    // Скрыть индикатор печати
    hideTyping() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    // Прокрутка вниз
    scrollToBottom() {
        const chat = document.getElementById('preview-chat');
        if (chat) {
            chat.scrollTop = chat.scrollHeight;
        }
    }
}

// Глобальная функция для отправки сообщения
function sendPreviewMessage() {
    const input = document.getElementById('preview-input');
    const text = input.value.trim();
    
    if (text && window.currentSimulator) {
        window.currentSimulator.sendMessage(text);
        input.value = '';
    }
}

// Глобальная функция для закрытия предпросмотра
function closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    window.currentSimulator = null;
}

// Обработка Enter в поле ввода
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('preview-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendPreviewMessage();
            }
        });
    }
});

// Экспортируем класс
window.BotSimulator = BotSimulator;
window.sendPreviewMessage = sendPreviewMessage;
window.closePreview = closePreview;
