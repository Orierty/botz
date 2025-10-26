/**
 * Главный файл приложения - новая модульная версия
 * Инициализирует все модули и запускает приложение
 */

// Глобальная переменная для основного экземпляра приложения
let botBuilder;

/**
 * Функция переключения темы
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Обновляем текст кнопки
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.textContent = newTheme === 'dark' ? '☀️ Тема' : '🌙 Тема';
    }
}

// Загрузка сохраненной темы при старте
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.textContent = savedTheme === 'dark' ? '☀️ Тема' : '🌙 Тема';
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing BotBuilder...');
    
    // Загружаем сохраненную тему
    loadSavedTheme();

    // Применяем сохраненные состояния панели и тулбара
    try {
        const sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === '1';
        const toolbarCollapsed = localStorage.getItem('toolbar_collapsed') === '1';
        const sidebar = document.querySelector('.sidebar');
        const mainArea = document.querySelector('.main-area');
        const sidebarBtn = document.getElementById('toggle-sidebar-btn');
        const toolbarBtn = document.getElementById('toggle-toolbar-btn');
        const edgeToolbar = document.getElementById('edge-open-toolbar');
        const edgeToggleSidebar = document.getElementById('edge-toggle-sidebar');
        if (sidebar && sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            if (sidebarBtn) sidebarBtn.textContent = 'показать панель';
            if (edgeToggleSidebar) edgeToggleSidebar.textContent = 'показать панель';
        }
        if (mainArea && toolbarCollapsed) {
            mainArea.classList.add('toolbar-collapsed');
            if (toolbarBtn) toolbarBtn.textContent = 'показать тулбар';
            if (edgeToolbar) edgeToolbar.classList.remove('hidden');
            if (edgeToggleSidebar) edgeToggleSidebar.classList.remove('hidden');
            // edge sidebar button label should reflect current sidebar state
            if (sidebar && sidebar.classList.contains('collapsed')) {
                edgeToggleSidebar.textContent = 'показать панель';
            } else {
                edgeToggleSidebar.textContent = 'скрыть панель';
            }
        }
    } catch (e) {
        console.warn('Failed to restore toggle states', e);
    }
    
    // Проверяем наличие всех необходимых классов
    if (typeof HistoryManager === 'undefined' ||
        typeof BlockGenerator === 'undefined' ||
        typeof CanvasManager === 'undefined' ||
        typeof ConnectionManager === 'undefined' ||
        typeof Utils === 'undefined' ||
        typeof BotBuilder === 'undefined') {
        console.error('Some modules are not loaded. Please check script loading order.');
        return;
    }
    
    // Создаем экземпляр основного приложения
    botBuilder = new BotBuilder();
    
    // Глобальная переменная для отладки
    window.botBuilder = botBuilder;
    
    // Автоматическая загрузка из хеша при старте
    setTimeout(() => {
        loadBotFromHash();
    }, 100);
    
    console.log('BotBuilder application started successfully');
});

// Обработка ошибок JavaScript
window.addEventListener('error', function(e) {
    if (e.error) {
        console.error('JavaScript error:', e.error);
        if (e.error.stack) {
            console.error('Stack:', e.error.stack);
        }
    }
});

// Предотвращение случайного закрытия страницы при наличии несохраненных изменений
window.addEventListener('beforeunload', function(e) {
    if (window.blocks && Object.keys(window.blocks).length > 0) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?';
        return e.returnValue;
    }
});

// Дополнительные функции для обратной совместимости и расширения функциональности

/**
 * Функции для работы с опциями выбора
 */
function updateChoiceOptions(blockId) {
    if (!window.blocks || !window.blocks[blockId]) return;
    
    const optionsContainer = document.getElementById(`${blockId}_options`);
    if (!optionsContainer) return;
    
    const inputs = optionsContainer.querySelectorAll('input[type="text"]');
    const options = Array.from(inputs).map(input => input.value);
    
    window.blocks[blockId].options = options;
    
    if (window.historyManager) {
        clearTimeout(window.choiceOptionsTimeout);
        window.choiceOptionsTimeout = setTimeout(() => {
            window.historyManager.createSnapshot();
        }, 1000);
    }
    
    if (window.updateHashInRealTime) {
        window.updateHashInRealTime();
    }
}

function addOption(blockId) {
    const optionsContainer = document.getElementById(`${blockId}_options`);
    if (!optionsContainer) return;
    
    const optionCount = optionsContainer.querySelectorAll('.option-item').length;
    const newOption = document.createElement('div');
    newOption.className = 'option-item';
    newOption.innerHTML = `
        <input type="text" placeholder="Вариант ${optionCount + 1}" onchange="updateChoiceOptions('${blockId}')" oninput="updateChoiceOptions('${blockId}')" value="">
        <button class="remove-option" onclick="removeOption(this)">&times;</button>
    `;
    
    optionsContainer.appendChild(newOption);
    updateChoiceOptions(blockId);
}

function removeOption(button) {
    const optionItem = button.closest('.option-item');
    const optionsContainer = optionItem.closest('[id$="_options"]');
    const blockId = optionsContainer.id.replace('_options', '');
    
    if (optionsContainer.querySelectorAll('.option-item').length > 1) {
        optionItem.remove();
        updateChoiceOptions(blockId);
    }
}

/**
 * Функции для работы с inline кнопками
 */
function updateInlineButtons(blockId) {
    if (!window.blocks || !window.blocks[blockId]) return;
    
    const buttonsContainer = document.getElementById(`${blockId}_buttons`);
    if (!buttonsContainer) return;
    
    const buttonItems = buttonsContainer.querySelectorAll('.button-item');
    const buttons = Array.from(buttonItems).map(item => {
        const inputs = item.querySelectorAll('input[type="text"]');
        return {
            text: inputs[0]?.value || '',
            callback_data: inputs[1]?.value || ''
        };
    });
    
    window.blocks[blockId].buttons = buttons;
    
    // Обновляем соединения для inline_keyboard
    if (window.blocks[blockId].type === 'inline_keyboard') {
        Utils.normalizeBlockConnections(window.blocks[blockId]);
    }
    
    if (window.historyManager) {
        clearTimeout(window.inlineButtonsTimeout);
        window.inlineButtonsTimeout = setTimeout(() => {
            window.historyManager.createSnapshot();
        }, 1000);
    }
    
    if (window.updateHashInRealTime) {
        window.updateHashInRealTime();
    }
}

function addInlineButton(blockId) {
    const buttonsContainer = document.getElementById(`${blockId}_buttons`);
    if (!buttonsContainer) return;
    
    const newButton = document.createElement('div');
    newButton.className = 'button-item';
    newButton.innerHTML = `
        <input type="text" placeholder="Текст кнопки" onchange="updateInlineButtons('${blockId}')" oninput="updateInlineButtons('${blockId}')" value="">
        <input type="text" placeholder="callback_data" onchange="updateInlineButtons('${blockId}')" oninput="updateInlineButtons('${blockId}')" value="">
        <button class="remove-button" onclick="removeInlineButton(this)">&times;</button>
    `;
    
    buttonsContainer.appendChild(newButton);
    updateInlineButtons(blockId);
}

function removeInlineButton(button) {
    const buttonItem = button.closest('.button-item');
    const buttonsContainer = buttonItem.closest('[id$="_buttons"]');
    const blockId = buttonsContainer.id.replace('_buttons', '');
    
    if (buttonsContainer.querySelectorAll('.button-item').length > 1) {
        buttonItem.remove();
        updateInlineButtons(blockId);
    }
}

/**
 * Функции для работы с полями формы заказа
 */
function updateOrderFields(blockId) {
    if (!window.blocks || !window.blocks[blockId]) return;
    
    const fieldsContainer = document.getElementById(`${blockId}_fields`);
    if (!fieldsContainer) return;
    
    const fieldItems = fieldsContainer.querySelectorAll('.field-item');
    const fields = Array.from(fieldItems).map(item => {
        const select = item.querySelector('select');
        const input = item.querySelector('input[type="text"]');
        return {
            type: select?.value || 'name',
            variable: input?.value || ''
        };
    });
    
    window.blocks[blockId].fields = fields;
    
    if (window.historyManager) {
        clearTimeout(window.orderFieldsTimeout);
        window.orderFieldsTimeout = setTimeout(() => {
            window.historyManager.createSnapshot();
        }, 1000);
    }
    
    if (window.updateHashInRealTime) {
        window.updateHashInRealTime();
    }
}

function addOrderField(blockId) {
    const fieldsContainer = document.getElementById(`${blockId}_fields`);
    if (!fieldsContainer) return;
    
    const newField = document.createElement('div');
    newField.className = 'field-item';
    newField.innerHTML = `
        <select onchange="updateOrderFields('${blockId}')">
            <option value="name">Имя</option>
            <option value="phone">Телефон</option>
            <option value="email">Email</option>
            <option value="address">Адрес</option>
            <option value="comment">Комментарий</option>
        </select>
        <input type="text" placeholder="Переменная" onchange="updateOrderFields('${blockId}')" oninput="updateOrderFields('${blockId}')" value="">
        <button class="remove-field" onclick="removeOrderField(this)">&times;</button>
    `;
    
    fieldsContainer.appendChild(newField);
    updateOrderFields(blockId);
}

function removeOrderField(button) {
    const fieldItem = button.closest('.field-item');
    const fieldsContainer = fieldItem.closest('[id$="_fields"]');
    const blockId = fieldsContainer.id.replace('_fields', '');
    
    if (fieldsContainer.querySelectorAll('.field-item').length > 1) {
        fieldItem.remove();
        updateOrderFields(blockId);
    }
}

/**
 * Функции для работы с товарами каталога
 */
function updateCatalogProducts(blockId) {
    if (!window.blocks || !window.blocks[blockId]) return;
    
    const productsContainer = document.getElementById(`${blockId}_products`);
    if (!productsContainer) return;
    
    const productItems = productsContainer.querySelectorAll('.product-item');
    const products = [];
    
    productItems.forEach(item => {
        const name = item.querySelector('.product-name')?.value.trim() || '';
        const price = item.querySelector('.product-price')?.value.trim() || '';
        const desc = item.querySelector('.product-desc')?.value.trim() || '';
        
        if (name && price) {
            products.push({
                name: name,
                price: price,
                description: desc
            });
        }
    });
    
    window.blocks[blockId].products = JSON.stringify(products);
    window.blocks[blockId].source = 'json';
    window.blocks[blockId].per_page = 8;
    // page_variable больше не используется - автоматическая
    
    if (window.historyManager) {
        clearTimeout(window.catalogProductsTimeout);
        window.catalogProductsTimeout = setTimeout(() => {
            window.historyManager.createSnapshot();
        }, 1000);
    }
    
    if (window.updateHashInRealTime) {
        window.updateHashInRealTime();
    }
}

function addProduct(blockId) {
    const productsContainer = document.getElementById(`${blockId}_products`);
    if (!productsContainer) return;
    
    const newProduct = document.createElement('div');
    newProduct.className = 'product-item';
    newProduct.innerHTML = `
        <input type="text" placeholder="Название товара" oninput="updateCatalogProducts('${blockId}')" class="product-name">
        <input type="text" placeholder="Цена" oninput="updateCatalogProducts('${blockId}')" class="product-price">
        <input type="text" placeholder="Описание (опционально)" oninput="updateCatalogProducts('${blockId}')" class="product-desc">
        <button class="remove-product" onclick="removeProduct(this, '${blockId}')">&times;</button>
    `;
    
    productsContainer.appendChild(newProduct);
    updateCatalogProducts(blockId);
}

function removeProduct(button, blockId) {
    const productItem = button.closest('.product-item');
    const productsContainer = productItem.closest('[id$="_products"]');
    
    if (productsContainer.querySelectorAll('.product-item').length > 1) {
        productItem.remove();
        updateCatalogProducts(blockId);
    }
}

/**
 * Функция загрузки бота из хеша
 */
function loadBotFromHash() {
    try {
        const hash = window.location.hash;
        if (!hash.startsWith('#bot=')) {
            return;
        }
        
        const encoded = hash.substring(5);
        const json = decodeURIComponent(escape(atob(encoded)));
        const state = JSON.parse(json);
        
        console.log('Loading bot from hash. Blocks:', Object.keys(state.blocks || {}).length, 'Connections:', (state.connections || []).length);
        
        // Загружаем состояние через BotBuilder
        if (window.botBuilder) {
            window.botBuilder.loadFromState(state);
        }
        
        // Обновляем поле хеша
        const hashField = document.getElementById('bot-hash');
        if (hashField) {
            hashField.value = encoded;
        }
        
    } catch (e) {
        console.error('Ошибка загрузки бота из хеша:', e);
    }
}

// Глобальные функции для обратной совместимости
window.toggleTheme = toggleTheme;
// Переключатели UI
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const btn = document.getElementById('toggle-sidebar-btn');
    if (!sidebar) return;
    const collapsed = sidebar.classList.toggle('collapsed');
    try { localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0'); } catch (e) {}
    if (btn) btn.textContent = collapsed ? 'показать панель' : 'скрыть панель';
    const edgeToggleSidebar = document.getElementById('edge-toggle-sidebar');
    const mainArea = document.querySelector('.main-area');
    if (edgeToggleSidebar) {
        // Edge sidebar button is visible only when toolbar is collapsed
        const toolbarIsCollapsed = mainArea?.classList.contains('toolbar-collapsed');
        edgeToggleSidebar.classList.toggle('hidden', !toolbarIsCollapsed);
        edgeToggleSidebar.textContent = collapsed ? 'показать панель' : 'скрыть панель';
    }
}

function toggleToolbar() {
    const mainArea = document.querySelector('.main-area');
    const btn = document.getElementById('toggle-toolbar-btn');
    const edgeBtn = document.getElementById('edge-open-toolbar');
    const edgeToggleSidebar = document.getElementById('edge-toggle-sidebar');
    if (!mainArea) return;
    const collapsed = mainArea.classList.toggle('toolbar-collapsed');
    try { localStorage.setItem('toolbar_collapsed', collapsed ? '1' : '0'); } catch (e) {}
    if (btn) btn.textContent = collapsed ? 'показать тулбар' : 'скрыть тулбар';
    if (edgeBtn) edgeBtn.classList.toggle('hidden', !collapsed);
    if (edgeToggleSidebar) {
        // When toolbar collapses, we also show the sidebar toggle near the edge
        edgeToggleSidebar.classList.toggle('hidden', !collapsed);
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('collapsed')) {
            edgeToggleSidebar.textContent = 'показать панель';
        } else {
            edgeToggleSidebar.textContent = 'скрыть панель';
        }
    }
}

window.toggleSidebar = toggleSidebar;
window.toggleToolbar = toggleToolbar;
window.updateChoiceOptions = updateChoiceOptions;
window.addOption = addOption;
window.removeOption = removeOption;
window.updateInlineButtons = updateInlineButtons;
window.addInlineButton = addInlineButton;
window.removeInlineButton = removeInlineButton;
window.updateOrderFields = updateOrderFields;
window.addOrderField = addOrderField;
window.removeOrderField = removeOrderField;
window.updateCatalogProducts = updateCatalogProducts;
window.addProduct = addProduct;
window.removeProduct = removeProduct;
window.loadBotFromHash = loadBotFromHash;

console.log('App.js loaded - modular version');
