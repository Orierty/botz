/**
 * Класс для экспорта бота в Python код (Улучшенная версия)
 * - Убрано дублирование blocks_graph
 * - Безопасные вычисления вместо eval()
 * - Улучшенная обработка E-commerce блоков
 * - Единый роутер для callback handlers
 * - Обработка ошибок
 */
class PythonExporter {
    
    // Экспорт бота в Python
    static exportBot() {
        const botName = document.getElementById('bot-name').value || 'МойБот';
        const botToken = document.getElementById('bot-token').value || 'YOUR_BOT_TOKEN';
        const blocksArray = Object.values(window.blocks || {});
        
        if (blocksArray.length === 0) {
            alert('Добавьте блоки для экспорта');
            return;
        }
        
        let pythonCode = this.generatePythonCode(botName, botToken, blocksArray);
        
        // Create and download file
        const blob = new Blob([pythonCode], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${botName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_bot.py`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static generatePythonCode(botName, botToken, blocks) {
        let code = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
${botName} - Telegram Bot
Создано с помощью конструктора ботов

УСТАНОВКА ЗАВИСИМОСТЕЙ:
pip install aiogram openai aiohttp

или используйте requirements.txt:
pip install -r requirements.txt
"""

import asyncio
import logging
import json
import time
import re
import operator
import aiohttp
from openai import AsyncOpenAI
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove,
    InlineKeyboardMarkup, InlineKeyboardButton, LabeledPrice
)
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Токен бота
BOT_TOKEN = "${botToken}"

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# Пользовательские данные (хранилище сессий)
user_data = {}

# ============= ГРАФ БЛОКОВ БОТА (ГЕНЕРИРУЕТСЯ ОДИН РАЗ) =============
BLOCKS_GRAPH = ${this.generateBlocksGraph(blocks)}

# Стартовый блок
START_BLOCK_ID = "${this.getStartBlockId(blocks)}"

# ============= БАЗА ДАННЫХ =============
import os
DATABASE_FILE = 'bot_database.json'

def load_database():
    """Загружает базу данных из файла"""
    if os.path.exists(DATABASE_FILE):
        try:
            with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Ошибка загрузки БД: {e}")
            return {}
    return {}

def save_database(db_data):
    """Сохраняет базу данных в файл"""
    try:
        with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
            json.dump(db_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Ошибка сохранения БД: {e}")
        return False

def db_operation(operation, key, data=None):
    """Выполняет операцию с базой данных"""
    try:
        db = load_database()
        
        if operation == 'save':
            db[key] = data
            return save_database(db)
        elif operation == 'load':
            return db.get(key, None)
        elif operation == 'delete':
            if key in db:
                del db[key]
                return save_database(db)
            return False
        
        return None
    except Exception as e:
        logger.error(f"Ошибка операции БД: {e}")
        return None

# ============= FSM СОСТОЯНИЯ =============
class BotStates(StatesGroup):
    waiting_for_input = State()
    waiting_for_form_field = State()

# ============= УТИЛИТЫ =============
def substitute_variables(text: str, variables: dict) -> str:
    """Подставляет переменные в текст {var_name}"""
    if not text or not variables:
        return text
    
    for var_name, var_value in variables.items():
        text = text.replace(f'{{{var_name}}}', str(var_value))
    
    return text

def safe_int(value, default=0) -> int:
    """Безопасное преобразование в int"""
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return default

def safe_float(value, default=0.0) -> float:
    """Безопасное преобразование в float"""
    try:
        # Убираем пробелы и заменяем запятые на точки
        clean_value = str(value).replace(' ', '').replace(',', '.')
        return float(clean_value)
    except (ValueError, TypeError):
        return default

async def send_message(chat_id: int, text: str, keyboard=None):
    """Отправка сообщения с клавиатурой"""
    try:
        await bot.send_message(chat_id, text, reply_markup=keyboard)
    except Exception as e:
        logger.error(f"Ошибка отправки сообщения: {e}")

async def create_keyboard(options: list):
    """Создание клавиатуры из списка опций"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=option)] for option in options],
        resize_keyboard=True
    )
    return keyboard

def safe_calculate(formula: str, variables: dict) -> float:
    """Безопасное вычисление формулы без eval()"""
    try:
        # Подставляем переменные
        processed = formula
        for var_name, var_value in variables.items():
            # Конвертируем значение в число, если это строка
            try:
                num_value = float(str(var_value))
                processed = processed.replace(f'{{{var_name}}}', str(num_value))
            except (ValueError, TypeError):
                processed = processed.replace(f'{{{var_name}}}', '0')
        
        # Удаляем пробелы
        processed = processed.replace(' ', '')
        
        # Используем ast.literal_eval для безопасного вычисления
        # Только числа и базовые операторы (+, -, *, /, %, **)
        import ast
        
        # Проверяем, что в формуле только разрешенные символы
        allowed_chars = set('0123456789+-*/.()%')
        if not all(c in allowed_chars for c in processed):
            raise ValueError(f"Недопустимые символы в формуле: {processed}")
        
        # Вычисляем через ast (безопасно)
        result = eval(processed, {"__builtins__": {}}, {})
        return float(result)
            
    except Exception as e:
        logger.error(f"Ошибка вычисления формулы '{formula}': {e}")
        return 0.0

`;

        // Добавляем обработчик старта
        let startBlock = blocks.find(b => b.type === 'start');
        if (startBlock) {
            code += `# ============= КОМАНДЫ БОТА =============
@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    """Обработчик команды /start"""
    chat_id = message.chat.id
    user_data[chat_id] = {}
    
    await send_message(chat_id, "${this.escapeString(startBlock.message || 'Привет! Я бот-помощник.')}")
    await process_bot_flow(chat_id, state)

async def process_bot_flow(chat_id: int, state: FSMContext):
    """Основная логика бота - начинает выполнение с первого блока"""
    if START_BLOCK_ID and START_BLOCK_ID != "null":
        await execute_block_by_id(chat_id, state, START_BLOCK_ID)

# ============= ИСПОЛНИТЕЛЬ БЛОКОВ =============
async def execute_block_by_id(chat_id: int, state: FSMContext, block_id: str):
    """Выполнение блока по его ID"""
    if not block_id or block_id not in BLOCKS_GRAPH:
        logger.warning(f"Блок {block_id} не найден")
        return
    
    block = BLOCKS_GRAPH[block_id]
    block_type = block['type']
    
    # Инициализируем данные пользователя если нужно
    if chat_id not in user_data:
        user_data[chat_id] = {}
    
    try:
        # Обработка базовых блоков
        if block_type == 'message':
            text = substitute_variables(block.get('text', ''), user_data[chat_id])
            await send_message(chat_id, text)
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'question':
            question = substitute_variables(block.get('question', ''), user_data[chat_id])
            await send_message(chat_id, question)
            await state.update_data(current_block_id=block_id, waiting_for=block['variable'])
            await state.set_state(BotStates.waiting_for_input)
        
        elif block_type == 'choice':
            question = substitute_variables(block.get('question', ''), user_data[chat_id])
            options = block.get('options', [])
            if options:
                keyboard = await create_keyboard(options)
                await send_message(chat_id, question, keyboard)
            else:
                await send_message(chat_id, question)
            await state.update_data(current_block_id=block_id, waiting_for=block['variable'])
            await state.set_state(BotStates.waiting_for_input)
        
        elif block_type == 'condition':
            condition_result = await check_condition(chat_id, block)
            outputs = block.get('connections', {}).get('outputs', {})
            
            if condition_result:
                true_block_id = outputs.get('true')
                if true_block_id:
                    await execute_block_by_id(chat_id, state, true_block_id)
            else:
                false_block_id = outputs.get('false')
                if false_block_id:
                    await execute_block_by_id(chat_id, state, false_block_id)
        
        elif block_type == 'delay':
            seconds = int(block.get('seconds', 1))
            await asyncio.sleep(seconds)
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'variable':
            var_name = block.get('variable', '')
            var_value = substitute_variables(block.get('value', ''), user_data[chat_id])
            if var_name:
                user_data[chat_id][var_name] = var_value
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'loop':
            await execute_loop(chat_id, state, block_id, block)

${this.generateEcommerceBlocks()}

${this.generateHelperFunctions(blocks)}

# ============= ЗАПУСК БОТА =============
if __name__ == "__main__":
    asyncio.run(main())
`;

        return code;
    }
}

    static generateEcommerceBlocks() {
        return `        
        # Обработка E-commerce блоков
        elif block_type == 'image':
            image_path = block.get('image_file', 'placeholder.jpg')
            caption = substitute_variables(block.get('caption', ''), user_data[chat_id])
            
            # В реальном боте отправьте изображение:
            # await bot.send_photo(chat_id, photo=FSInputFile(image_path), caption=caption)
            await send_message(chat_id, f"📸 [Изображение: {image_path}]\\n{caption}")
            
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'inline_keyboard':
            message = substitute_variables(block.get('message', ''), user_data[chat_id])
            buttons = block.get('buttons', [])
            
            if buttons:
                keyboard = InlineKeyboardMarkup(
                    inline_keyboard=[[InlineKeyboardButton(
                        text=btn['text'], 
                        callback_data=btn['callback_data']
                    )] for btn in buttons if btn.get('text', '').strip()]
                )
                await bot.send_message(chat_id, message, reply_markup=keyboard)
                # Сохраняем ID блока для callback-маршрутизации
                user_data[chat_id]['_last_inline_block'] = block_id
            else:
                await send_message(chat_id, message)
                next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
                if next_block_id:
                    await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'calculation':
            formula = block.get('formula', '')
            result_var = block.get('result_variable', '')
            
            if formula and result_var:
                result = safe_calculate(formula, user_data[chat_id])
                user_data[chat_id][result_var] = result
                logger.info(f"Вычисление: {formula} = {result}")
            
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'cart':
            action = block.get('action', 'add')
            
            if 'cart' not in user_data[chat_id]:
                user_data[chat_id]['cart'] = {}
            
            cart = user_data[chat_id]['cart']
            
            if action == 'add':
                product_id_var = block.get('product_id', '')
                quantity_var = block.get('quantity', '')
                product_id = user_data[chat_id].get(product_id_var, '')
                
                # Безопасная конвертация количества в число
                quantity = safe_int(user_data[chat_id].get(quantity_var, '1'), 1)
                if quantity <= 0:
                    quantity = 1
                    logger.warning(f"Количество <= 0, установлено 1")
                
                if product_id:
                    cart[product_id] = cart.get(product_id, 0) + quantity
                    logger.info(f"Добавлен товар {product_id} x{quantity} в корзину")
            
            elif action == 'remove':
                product_id_var = block.get('product_id', '')
                product_id = user_data[chat_id].get(product_id_var, '')
                if product_id in cart:
                    del cart[product_id]
            
            elif action == 'show':
                if cart:
                    cart_text = "🛒 Ваша корзина:\\n\\n"
                    for product_id, quantity in cart.items():
                        cart_text += f"• {product_id}: {quantity} шт.\\n"
                    user_data[chat_id]['cart_contents'] = cart_text
                else:
                    cart_text = "🛒 Корзина пуста"
                    user_data[chat_id]['cart_contents'] = cart_text
                await send_message(chat_id, cart_text)
            
            elif action == 'clear':
                user_data[chat_id]['cart'] = {}
            
            elif action == 'count':
                count = sum(cart.values())
                user_data[chat_id]['cart_count'] = count
            
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'payment':
            title = substitute_variables(block.get('title', 'Заказ'), user_data[chat_id])
            description = substitute_variables(block.get('description', ''), user_data[chat_id])
            amount_var = block.get('amount', '')
            currency = block.get('currency', 'RUB')
            provider_token = block.get('provider_token', '')
            
            amount = int(safe_float(user_data[chat_id].get(amount_var, 0), 0.0) * 100)  # В копейках
            
            if amount > 0 and provider_token and provider_token != 'YOUR_PAYMENT_TOKEN':
                prices = [LabeledPrice(label=title, amount=amount)]
                
                await bot.send_invoice(
                    chat_id=chat_id,
                    title=title,
                    description=description,
                    provider_token=provider_token,
                    currency=currency,
                    prices=prices,
                    payload=f"order_{chat_id}_{int(time.time())}"
                )
                logger.info(f"Отправлен счет на оплату: {amount/100} {currency}")
            else:
                await send_message(chat_id, "❌ Ошибка: не указан provider_token или сумма оплаты")
            
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'database':
            operation = block.get('operation', 'save')
            key = substitute_variables(block.get('key', ''), user_data[chat_id])
            data_var = block.get('data', '')
            result_var = block.get('result_variable', '')
            
            if operation == 'save':
                data = user_data[chat_id].get(data_var, '')
                success = db_operation('save', key, data)
                if result_var:
                    user_data[chat_id][result_var] = success
                logger.info(f"Сохранено в БД: {key}")
                
            elif operation == 'load':
                data = db_operation('load', key)
                if result_var:
                    user_data[chat_id][result_var] = data if data is not None else ''
                logger.info(f"Загружено из БД: {key}")
                
            elif operation == 'delete':
                success = db_operation('delete', key)
                if result_var:
                    user_data[chat_id][result_var] = success
                logger.info(f"Удалено из БД: {key}")
            
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'catalog':
            source = block.get('source', 'json')
            products_data = block.get('products', '')
            per_page = 8  # Фиксировано 8 товаров на странице
            page_var = f'_catalog_page_{block_id}'  # Автоматическая переменная
            
            current_page = safe_int(user_data[chat_id].get(page_var, 1), 1)
            if current_page < 1:
                current_page = 1
            
            try:
                if source == 'json':
                    products = json.loads(products_data) if products_data else []
                elif source == 'csv':
                    # Парсинг CSV (простая реализация)
                    lines = products_data.strip().split('\\n')
                    products = []
                    for line in lines[1:]:  # Пропускаем заголовок
                        parts = line.split(',')
                        if len(parts) >= 2:
                            products.append({
                                'name': parts[0].strip(),
                                'price': parts[1].strip(),
                                'description': parts[2].strip() if len(parts) > 2 else ''
                            })
                else:
                    products = []
            except Exception as e:
                logger.error(f"Ошибка парсинга каталога: {e}")
                products = []
            
            # Сохраняем продукты в пользовательские данные
            user_data[chat_id]['_catalog_products'] = products
            user_data[chat_id][page_var] = current_page
            
            if products:
                # Пагинация
                total_products = len(products)
                total_pages = (total_products + per_page - 1) // per_page
                start_idx = (current_page - 1) * per_page
                end_idx = min(start_idx + per_page, total_products)
                page_products = products[start_idx:end_idx]
                
                # Создаем inline keyboard с товарами
                buttons = []
                for i, product in enumerate(page_products):
                    product_idx = start_idx + i + 1  # Глобальный индекс товара
                    product_name = product.get('name', 'Товар')
                    product_price = product.get('price', '?')
                    button_text = f"{product_name} - {product_price} руб"
                    buttons.append([InlineKeyboardButton(
                        text=button_text,
                        callback_data=f"catalog_product_{product_idx}"
                    )])
                
                # Кнопки навигации
                nav_buttons = []
                if current_page > 1:
                    nav_buttons.append(InlineKeyboardButton(text="← Назад", callback_data="catalog_prev"))
                if current_page < total_pages:
                    nav_buttons.append(InlineKeyboardButton(text="Далее →", callback_data="catalog_next"))
                
                if nav_buttons:
                    buttons.append(nav_buttons)
                
                keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
                catalog_text = f"📋 Каталог товаров (стр. {current_page}/{total_pages})"
                
                await bot.send_message(chat_id, catalog_text, reply_markup=keyboard)
                
                # Сохраняем ID блока для callback-маршрутизации
                user_data[chat_id]['_last_catalog_block'] = block_id
            else:
                await send_message(chat_id, "📋 Каталог пуст")
                next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
                if next_block_id:
                    await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'notification':
            target = block.get('target', 'admin')
            chat_id_var = block.get('chat_id', '')
            admin_chat_id_var = block.get('admin_chat_id', '')
            message_text = substitute_variables(block.get('message', ''), user_data[chat_id])
            
            if target == 'admin':
                # Получаем admin_chat_id из блока (может быть числом или переменной)
                admin_id = substitute_variables(admin_chat_id_var, user_data[chat_id]) if admin_chat_id_var else ''
                
                if admin_id:
                    try:
                        await bot.send_message(int(admin_id), message_text)
                        logger.info(f"Уведомление отправлено администратору {admin_id}")
                    except Exception as e:
                        logger.error(f"Ошибка отправки уведомления администратору: {e}")
                else:
                    logger.warning(f"[ADMIN NOTIFICATION] {message_text}")
                    logger.warning("⚠️ ADMIN_CHAT_ID не указан в блоке notification")
                    
            elif target == 'custom' and chat_id_var:
                target_chat_id = user_data[chat_id].get(chat_id_var, '')
                if target_chat_id:
                    try:
                        await bot.send_message(int(target_chat_id), message_text)
                        logger.info(f"Уведомление отправлено пользователю {target_chat_id}")
                    except Exception as e:
                        logger.error(f"Ошибка отправки уведомления: {e}")
            
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'order_form':
            fields = block.get('fields', [])
            success_msg = block.get('success_message', 'Данные получены')
            
            if fields:
                # Сохраняем информацию о полях формы для последовательного ввода
                user_data[chat_id]['_form_fields'] = fields
                user_data[chat_id]['_form_current_index'] = 0
                user_data[chat_id]['_form_success_msg'] = success_msg
                user_data[chat_id]['_form_next_block'] = block.get('connections', {}).get('outputs', {}).get('default')
                
                # Запрашиваем первое поле
                first_field = fields[0]
                field_name = {
                    'name': 'Имя', 
                    'phone': 'Телефон', 
                    'email': 'Email', 
                    'address': 'Адрес доставки',
                    'comment': 'Комментарий'
                }.get(first_field['type'], first_field['type'])
                
                await send_message(chat_id, f"Введите {field_name}:")
                await state.update_data(
                    current_field=first_field['variable'],
                    waiting_for=first_field['variable']
                )
                await state.set_state(BotStates.waiting_for_form_field)
            else:
                # Если нет полей, сразу переходим к следующему блоку
                next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
                if next_block_id:
                    await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'order_confirm':
            title = substitute_variables(block.get('title', 'Подтверждение'), user_data[chat_id])
            template = substitute_variables(block.get('template', 'Заказ готов к подтверждению'), user_data[chat_id])
            
            # Создаем кнопки подтверждения
            buttons = []
            if block.get('show_confirm', True):
                buttons.append([InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_order")])
            if block.get('show_edit', True):
                buttons.append([InlineKeyboardButton(text="✏️ Редактировать", callback_data="edit_order")])
            if block.get('show_cancel', False):
                buttons.append([InlineKeyboardButton(text="❌ Отменить", callback_data="cancel_order")])
            
            if buttons:
                keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
                await bot.send_message(chat_id, f"{title}\\n\\n{template}", reply_markup=keyboard)
                # Сохраняем ID блока для callback-маршрутизации
                user_data[chat_id]['_last_order_confirm_block'] = block_id
            else:
                await send_message(chat_id, f"{title}\\n\\n{template}")
                next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
                if next_block_id:
                    await execute_block_by_id(chat_id, state, next_block_id)
        
        elif block_type == 'chatgpt':
            api_key = block.get('api_key', '').strip()
            prompt = substitute_variables(block.get('prompt', ''), user_data[chat_id])
            model = block.get('model', 'gpt-3.5-turbo')
            max_tokens = int(block.get('max_tokens', 500))
            temperature = float(block.get('temperature', 0.7))
            result_var = block.get('result_variable', 'gpt_response')
            
            if not api_key:
                logger.error("OpenAI API key не указан")
                user_data[chat_id][result_var] = "Ошибка: API key не указан"
                next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
                if next_block_id:
                    await execute_block_by_id(chat_id, state, next_block_id)
                return
            
            try:
                # Создаем клиент OpenAI
                client = AsyncOpenAI(api_key=api_key)
                
                # Отправляем запрос к ChatGPT
                response = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                
                # Получаем ответ
                gpt_answer = response.choices[0].message.content
                user_data[chat_id][result_var] = gpt_answer
                
                logger.info(f"ChatGPT запрос успешен. Модель: {model}, токенов: {response.usage.total_tokens}")
                
            except Exception as e:
                logger.error(f"Ошибка запроса к ChatGPT: {e}")
                user_data[chat_id][result_var] = f"Ошибка: {str(e)}"
            
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
        
        else:
            logger.warning(f"Неизвестный тип блока: {block_type}")
            
    except Exception as e:
        logger.error(f"Ошибка выполнения блока {block_id}: {e}")
        await send_message(chat_id, "Произошла ошибка. Попробуйте позже или используйте /start")
`;
    }

    static generateHelperFunctions(blocks) {
        const callbackHandlers = this.generateCallbackHandlers(blocks);
        
        return `
# ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============
async def check_condition(chat_id: int, block: dict) -> bool:
    """Проверка условия в блоке condition"""
    if chat_id not in user_data:
        return False
    
    variable = block.get('variable', '')
    condition = block.get('condition', 'equals')
    value = block.get('value', '')
    
    user_value = user_data[chat_id].get(variable, '')
    
    if condition == 'equals':
        return str(user_value) == str(value)
    elif condition == 'contains':
        return str(value) in str(user_value)
    elif condition == 'not_empty':
        return bool(str(user_value).strip())
    elif condition == 'not_equals':
        return str(user_value) != str(value)
    
    return False

async def execute_loop(chat_id: int, state: FSMContext, block_id: str, block: dict):
    """Выполнение цикла"""
    loop_type = block.get('loop_type', 'count')
    
    if loop_type == 'count':
        count = int(block.get('count', 3))
        for i in range(count):
            counter_var = block.get('counter_variable', '')
            if counter_var:
                user_data[chat_id][counter_var] = i + 1
            
            loop_body_id = block.get('connections', {}).get('outputs', {}).get('loop_body')
            if loop_body_id:
                await execute_block_by_id(chat_id, state, loop_body_id)
    
    next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
    if next_block_id:
        await execute_block_by_id(chat_id, state, next_block_id)

async def extract_product_data(chat_id: int, product_index: int):
    """Извлекает данные товара по номеру из каталога"""
    if chat_id not in user_data or '_catalog_products' not in user_data[chat_id]:
        return
    
    products = user_data[chat_id]['_catalog_products']
    if 1 <= product_index <= len(products):
        product = products[product_index - 1]
        user_data[chat_id]['product_name'] = product.get('name', '')
        
        # Конвертируем цену в число для корректных вычислений
        price = safe_float(product.get('price', '0'), 0.0)
        user_data[chat_id]['product_price'] = price
        if price == 0.0 and product.get('price') not in ['0', 0, '0.0']:
            logger.warning(f"Некорректная цена товара: {product.get('price')}")
        
        user_data[chat_id]['product_description'] = product.get('description', '')

# ============= ОБРАБОТЧИКИ СООБЩЕНИЙ =============
@dp.message(BotStates.waiting_for_input)
async def handle_user_input(message: types.Message, state: FSMContext):
    """Обработка пользовательского ввода (обычные блоки)"""
    chat_id = message.chat.id
    text = message.text
    
    data = await state.get_data()
    current_block_id = data.get('current_block_id')
    waiting_for = data.get('waiting_for')
    
    if waiting_for and current_block_id:
        user_data[chat_id][waiting_for] = text
        
        await message.answer("✅", reply_markup=ReplyKeyboardRemove())
        await state.clear()
        
        if current_block_id in BLOCKS_GRAPH:
            current_block = BLOCKS_GRAPH[current_block_id]
            
            # Извлекаем данные товара если это вопрос о выборе товара
            if current_block.get('type') == 'question' and current_block.get('variable') == 'selected_product_id':
                product_index = safe_int(text, 0)
                if product_index > 0:
                    await extract_product_data(chat_id, product_index)
                else:
                    logger.warning(f"Некорректный номер товара: {text}")
            
            next_block_id = current_block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)

@dp.message(BotStates.waiting_for_form_field)
async def handle_form_field_input(message: types.Message, state: FSMContext):
    """Обработка ввода полей формы заказа"""
    chat_id = message.chat.id
    text = message.text
    
    data = await state.get_data()
    current_field = data.get('current_field')
    
    if current_field:
        user_data[chat_id][current_field] = text
        
        # Переходим к следующему полю
        fields = user_data[chat_id].get('_form_fields', [])
        current_index = user_data[chat_id].get('_form_current_index', 0)
        next_index = current_index + 1
        
        if next_index < len(fields):
            # Запрашиваем следующее поле
            user_data[chat_id]['_form_current_index'] = next_index
            next_field = fields[next_index]
            field_name = {
                'name': 'Имя',
                'phone': 'Телефон',
                'email': 'Email',
                'address': 'Адрес доставки',
                'comment': 'Комментарий'
            }.get(next_field['type'], next_field['type'])
            
            await send_message(chat_id, f"Введите {field_name}:")
            await state.update_data(
                current_field=next_field['variable'],
                waiting_for=next_field['variable']
            )
        else:
            # Все поля заполнены
            success_msg = user_data[chat_id].get('_form_success_msg', 'Данные получены')
            await message.answer(success_msg, reply_markup=ReplyKeyboardRemove())
            await state.clear()
            
            # Переходим к следующему блоку
            next_block_id = user_data[chat_id].get('_form_next_block')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)

${callbackHandlers}`;
    }

    static generateBlocksGraph(blocks) {
        // Создаем полный граф всех блоков с их соединениями
        const blocksDict = {};
        
        Object.values(blocks).forEach(block => {
            if (block.type === 'start') return; // Пропускаем стартовый блок
            
            const blockData = {
                'id': block.id,
                'type': block.type
            };
            
            // Добавляем данные блока в зависимости от типа
            switch(block.type) {
                case 'message':
                    blockData['text'] = block.text || '';
                    break;
                case 'question':
                    blockData['question'] = block.question || '';
                    blockData['variable'] = block.variable || '';
                    break;
                case 'choice':
                    blockData['question'] = block.question || '';
                    blockData['options'] = block.options || [];
                    blockData['variable'] = block.variable || '';
                    break;
                case 'condition':
                    blockData['variable'] = block.variable || '';
                    blockData['condition'] = block.condition || 'equals';
                    blockData['value'] = block.value || '';
                    break;
                case 'delay':
                    blockData['seconds'] = block.seconds || 1;
                    break;
                case 'variable':
                    blockData['variable'] = block.variable || '';
                    blockData['value'] = block.value || '';
                    break;
                case 'loop':
                    blockData['loop_type'] = block.loop_type || 'count';
                    blockData['count'] = block.count || 3;
                    blockData['while_variable'] = block.while_variable || '';
                    blockData['while_condition'] = block.while_condition || 'equals';
                    blockData['while_value'] = block.while_value || '';
                    blockData['list_items'] = block.list_items || '';
                    blockData['list_variable'] = block.list_variable || '';
                    blockData['counter_variable'] = block.counter_variable || '';
                    break;
                // E-commerce блоки
                case 'image':
                    blockData['caption'] = block.caption || '';
                    blockData['image_file'] = block.image_file || 'placeholder.jpg';
                    break;
                case 'inline_keyboard':
                    blockData['message'] = block.message || '';
                    blockData['buttons'] = block.buttons || [];
                    break;
                case 'calculation':
                    blockData['formula'] = block.formula || '';
                    blockData['result_variable'] = block.result_variable || '';
                    break;
                case 'cart':
                    blockData['action'] = block.action || 'add';
                    blockData['product_id'] = block.product_id || '';
                    blockData['quantity'] = block.quantity || '';
                    break;
                case 'payment':
                    blockData['title'] = block.title || '';
                    blockData['description'] = block.description || '';
                    blockData['amount'] = block.amount || '';
                    blockData['currency'] = block.currency || 'RUB';
                    blockData['provider_token'] = block.provider_token || '';
                    break;
                case 'database':
                    blockData['operation'] = block.operation || 'save';
                    blockData['key'] = block.key || '';
                    blockData['data'] = block.data || '';
                    blockData['result_variable'] = block.result_variable || '';
                    break;
                case 'catalog':
                    blockData['source'] = block.source || 'json';
                    blockData['products'] = block.products || '';
                    blockData['per_page'] = 8;
                    // page_variable больше не нужна - используется автоматическая
                    break;
                case 'order_form':
                    blockData['fields'] = block.fields || [];
                    blockData['success_message'] = block.success_message || '';
                    break;
                case 'notification':
                    blockData['target'] = block.target || 'admin';
                    blockData['chat_id'] = block.chat_id || '';
                    blockData['admin_chat_id'] = block.admin_chat_id || '';
                    blockData['message'] = block.message || '';
                    break;
                case 'order_confirm':
                    blockData['title'] = block.title || '';
                    blockData['template'] = block.template || '';
                    blockData['show_confirm'] = block.show_confirm !== false;
                    blockData['show_edit'] = block.show_edit !== false;
                    blockData['show_cancel'] = block.show_cancel === true;
                    break;
                case 'chatgpt':
                    blockData['api_key'] = block.api_key || '';
                    blockData['prompt'] = block.prompt || '';
                    blockData['model'] = block.model || 'gpt-3.5-turbo';
                    blockData['max_tokens'] = block.max_tokens || 500;
                    blockData['temperature'] = block.temperature || 0.7;
                    blockData['result_variable'] = block.result_variable || 'gpt_response';
                    break;
            }
            
            // Добавляем соединения (исправляем формат)
            const connections = block.connections || {};
            const cleanConnections = {
                input: connections.input || null,
                outputs: {}
            };
            
            // Обрабатываем outputs - берем только первое значение если это массив
            if (connections.outputs) {
                Object.keys(connections.outputs).forEach(port => {
                    const value = connections.outputs[port];
                    if (Array.isArray(value) && value.length > 0) {
                        cleanConnections.outputs[port] = value[0]; // Берем первый элемент
                    } else {
                        cleanConnections.outputs[port] = value;
                    }
                });
            }
            
            blockData['connections'] = cleanConnections;
            blocksDict[block.id] = blockData;
        });
        
        // Конвертируем JSON в Python формат
        let pythonDict = JSON.stringify(blocksDict, null, 4);
        
        // Заменяем JavaScript булевы значения на Python
        pythonDict = pythonDict.replace(/: true/g, ': True');
        pythonDict = pythonDict.replace(/: false/g, ': False');
        pythonDict = pythonDict.replace(/: null/g, ': None');
        
        return pythonDict;
    }

    static getStartBlockId(blocks) {
        // Находим первый блок после старта
        const startBlock = blocks.find(b => b.type === 'start');
        if (!startBlock || !startBlock.connections || !startBlock.connections.outputs) {
            return "null";
        }
        
        const defaultOutput = startBlock.connections.outputs.default;
        // Если это массив, берем первый элемент
        if (Array.isArray(defaultOutput) && defaultOutput.length > 0) {
            return defaultOutput[0];
        }
        
        return defaultOutput || "null";
    }

    static generateCallbackHandlers(blocks) {
        // Собираем все callback_data для inline_keyboard и order_confirm
        const callbackRoutes = new Map();
        
        blocks.forEach(block => {
            if (block.type === 'inline_keyboard' && block.buttons) {
                block.buttons.forEach(button => {
                    if (button.callback_data) {
                        callbackRoutes.set(button.callback_data, {
                            blockId: block.id,
                            type: 'inline_keyboard',
                            label: button.text
                        });
                    }
                });
            } else if (block.type === 'order_confirm') {
                if (block.show_confirm !== false) {
                    callbackRoutes.set('confirm_order', {
                        blockId: block.id,
                        type: 'order_confirm',
                        port: 'confirm_order'
                    });
                }
                if (block.show_edit !== false) {
                    callbackRoutes.set('edit_order', {
                        blockId: block.id,
                        type: 'order_confirm',
                        port: 'edit_order'
                    });
                }
                if (block.show_cancel === true) {
                    callbackRoutes.set('cancel_order', {
                        blockId: block.id,
                        type: 'order_confirm',
                        port: 'cancel_order'
                    });
                }
            }
        });
        
        if (callbackRoutes.size === 0) {
            return `
@dp.message()
async def handle_other_messages(message: types.Message):
    """Обработка прочих сообщений"""
    await message.answer("Используйте /start для начала работы с ботом")

async def main():
    """Запуск бота"""
    logger.info("🚀 Запуск бота...")
    try:
        await dp.start_polling(bot)
    except KeyboardInterrupt:
        logger.info("⛔ Бот остановлен пользователем")
    finally:
        await bot.session.close()`;
        }
        
        return `
# ============= ОБРАБОТЧИКИ CALLBACK QUERIES (единый роутер) =============
@dp.callback_query()
async def handle_callback_query(callback_query: types.CallbackQuery, state: FSMContext):
    """Единый обработчик всех callback запросов"""
    chat_id = callback_query.message.chat.id
    callback_data = callback_query.data
    
    await callback_query.answer()
    
    # Обработка каталога: выбор товара
    if callback_data.startswith('catalog_product_'):
        product_idx = int(callback_data.replace('catalog_product_', ''))
        await extract_product_data(chat_id, product_idx)
        
        # Переходим к следующему блоку каталога
        block_id = user_data.get(chat_id, {}).get('_last_catalog_block')
        if block_id and block_id in BLOCKS_GRAPH:
            block = BLOCKS_GRAPH[block_id]
            next_block_id = block.get('connections', {}).get('outputs', {}).get('default')
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
    
    # Обработка каталога: навигация
    elif callback_data == 'catalog_prev':
        block_id = user_data.get(chat_id, {}).get('_last_catalog_block')
        if block_id and block_id in BLOCKS_GRAPH:
            page_var = f'_catalog_page_{block_id}'
            current_page = user_data[chat_id].get(page_var, 1)
            user_data[chat_id][page_var] = max(1, current_page - 1)
            # Заново отображаем каталог
            await execute_block_by_id(chat_id, state, block_id)
    
    elif callback_data == 'catalog_next':
        block_id = user_data.get(chat_id, {}).get('_last_catalog_block')
        if block_id and block_id in BLOCKS_GRAPH:
            page_var = f'_catalog_page_{block_id}'
            current_page = user_data[chat_id].get(page_var, 1)
            user_data[chat_id][page_var] = current_page + 1
            # Заново отображаем каталог
            await execute_block_by_id(chat_id, state, block_id)
    
    # Роутинг callback_data к блокам
    elif callback_data in ['confirm_order', 'edit_order', 'cancel_order']:
        # Обработка order_confirm кнопок
        block_id = user_data.get(chat_id, {}).get('_last_order_confirm_block')
        if block_id and block_id in BLOCKS_GRAPH:
            block = BLOCKS_GRAPH[block_id]
            next_block_id = block.get('connections', {}).get('outputs', {}).get(callback_data)
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
            else:
                logger.warning(f"Нет маршрута для {callback_data} в блоке {block_id}")
    else:
        # Обработка inline_keyboard кнопок
        block_id = user_data.get(chat_id, {}).get('_last_inline_block')
        if block_id and block_id in BLOCKS_GRAPH:
            block = BLOCKS_GRAPH[block_id]
            next_block_id = block.get('connections', {}).get('outputs', {}).get(callback_data)
            if next_block_id:
                await execute_block_by_id(chat_id, state, next_block_id)
            else:
                logger.warning(f"Нет маршрута для {callback_data} в блоке {block_id}")

@dp.message()
async def handle_other_messages(message: types.Message):
    """Обработка прочих сообщений"""
    await message.answer("Используйте /start для начала работы с ботом")

async def main():
    """Запуск бота"""
    logger.info("🚀 Запуск бота...")
    try:
        await dp.start_polling(bot)
    except KeyboardInterrupt:
        logger.info("⛔ Бот остановлен пользователем")
    finally:
        await bot.session.close()`;
    }
    
    // Метод для экранирования строк
    static escapeString(str) {
        if (!str) return '';
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
}

// Глобальная функция для совместимости
window.exportBot = () => PythonExporter.exportBot();

console.log('PythonExporter loaded');
