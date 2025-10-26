# 🤖 Botz - Визуальный Конструктор Ботов

Мощный Python-фреймворк для создания Telegram-ботов с использованием визуального блочного подхода. Создавайте сложные сценарии ботов без написания кода, соединяя функциональные блоки.

## 📋 Содержание

- [Возможности](#возможности)
- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Типы блоков](#типы-блоков)

## ✨ Возможности

- **19+ типов блоков**: От простых сообщений до AI-интеграции
- **Визуальный конструктор**: Соединяйте блоки для создания диалогов
- **Система переменных**: Динамический контент с подстановкой `{переменная}`
- **Управление состояниями**: FSM-управление состоянием пользователя
- **E-commerce готовность**: Встроенные блоки корзины, оплаты и каталога
- **AI интеграция**: Встроенная поддержка ChatGPT
- **Операции с БД**: Простое хранение данных на основе JSON
- **Сохранение в хэше**: Сохранение в хэше

## 🚀 Установка

```bash
# Клонируйте репозиторий
git clone https://github.com/Orierty/botz.git
# Запустите idex.html
```

## 🎯 Быстрый старт

```python
# Скачайте бота
# Установите зависимости
# Запустите
```

## 📦 Типы блоков

### Основные блоки

#### 1. **Блок Start (Старт)**
Точка входа в диалог с ботом.

```python
@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    await send_message(chat_id, "Привет! Я бот-помощник.")
```

**Параметры:**
- `message`: Объект сообщения команды /start
- `state`: FSM-состояние для управления контекстом

**Действие:**
- Инициализирует пустое хранилище данных пользователя
- Отправляет приветственное сообщение
- Запускает выполнение графа блоков

---

#### 2. **Блок Message (Сообщение)**
Отправка текстовых сообщений с подстановкой переменных.

```python
if block_type == 'message':
    text = substitute_variables(block.get('text', ''), user_data[chat_id])
    await send_message(chat_id, text)
```

**Параметры:**
- `text`: Текст сообщения с поддержкой синтаксиса `{переменная}`

**Пример:**
```
Здравствуйте, {name}! Ваш заказ #{order_id} готов к получению.
```

**Действие:**
- Подставляет значения переменных из `user_data`
- Отправляет сообщение без ожидания ответа
- Автоматически переходит к следующему блоку

---

#### 3. **Блок Question (Вопрос)**
Ожидание пользовательского ввода с сохранением в переменную.

```python
elif block_type == 'question':
    question = substitute_variables(block.get('question', ''), user_data[chat_id])
    await state.update_data(current_block_id=block_id, waiting_for=block['variable'])
    await state.set_state(BotStates.waiting_for_input)
```

**Параметры:**
- `question`: Текст вопроса с поддержкой переменных
- `variable`: Имя переменной для сохранения ответа

**Действие:**
- Устанавливает состояние `waiting_for_input`
- Сохраняет ID текущего блока и имя переменной
- Ожидает ответа через обработчик `handle_user_input`

---

#### 4. **Блок Choice (Выбор)**
Предоставление вариантов выбора с клавиатурой.

```python
elif block_type == 'choice':
    options = block.get('options', [])
    keyboard = await create_keyboard(options)
    await send_message(chat_id, question, keyboard)
```

**Параметры:**
- `options`: Список вариантов выбора
- `variable`: Переменная для сохранения выбранного варианта

**Действие:**
- Создает клавиатуру с кнопками
- Ожидает выбора пользователя
- Результат сохраняется в `user_data[chat_id][variable]`

---

### Логические блоки

#### 5. **Блок Condition (Условие)**
Ветвление выполнения на основе условий.

```python
elif block_type == 'condition':
    condition_result = await check_condition(chat_id, block)
    if condition_result:
        await execute_block_by_id(chat_id, state, true_block_id)
    else:
        await execute_block_by_id(chat_id, state, false_block_id)
```

**Параметры:**
- `variable`: Переменная для проверки
- `condition`: Тип условия (equals/greater/contains/и др.)
- `value`: Значение для сравнения

**Поддерживаемые условия:**
- `equals` - Точное совпадение
- `greater` - Больше чем
- `contains` - Содержит строку
- И другие...

**Действие:**
- Проверяет условие
- Переходит к соответствующему выходному блоку (true/false)

---

#### 6. **Блок Loop (Цикл)**
Многократное выполнение блоков.

```python
elif block_type == 'loop':
    count = int(block.get('count', 3))
    for i in range(count):
        counter_var = block.get('counter_variable', '')
        user_data[chat_id][counter_var] = i + 1
```

**Параметры:**
- `count`: Количество итераций
- `counter_variable`: Переменная, хранящая номер текущей итерации

**Действие:**
- Выполняет тело цикла указанное число раз
- Обновляет переменную-счетчик на каждой итерации

---

#### 7. **Блок Calculation (Вычисление)**
Выполнение безопасных математических операций.

```python
elif block_type == 'calculation':
    result = safe_calculate(formula, user_data[chat_id])
    user_data[chat_id][result_var] = result
```

**Параметры:**
- `formula`: Математическое выражение с переменными
- `result_variable`: Переменная для хранения результата

**Пример:**
```
{price} * {quantity} + {shipping}
```

**Действие:**
- Безопасно вычисляет выражение
- Сохраняет результат в указанную переменную

---

### Утилиты

#### 8. **Блок Delay (Задержка)**
Пауза выполнения на указанное время.

```python
elif block_type == 'delay':
    seconds = int(block.get('seconds', 1))
    await asyncio.sleep(seconds)
```

**Параметры:**
- `seconds`: Длительность задержки в секундах

**Действие:**
- Приостанавливает выполнение на указанное время
- Автоматически переходит к следующему блоку

---

#### 9. **Блок Variable (Переменная)**
Сохранение или обновление переменных.

```python
elif block_type == 'variable':
    var_value = substitute_variables(block.get('value', ''), user_data[chat_id])
    user_data[chat_id][var_name] = var_value
```

**Параметры:**
- `var_name`: Имя переменной
- `value`: Значение переменной (с поддержкой подстановки)

**Действие:**
- Записывает значение в `user_data[chat_id]`
- Полезен для промежуточных вычислений и временных данных

---

### Медиа-блоки

#### 10. **Блок Image (Изображение)**
Отправка изображений с подписями.

```python
elif block_type == 'image':
    await send_message(chat_id, f"📸 [Изображение: {image_path}]\n{caption}")
```

**Параметры:**
- `image_file`: Путь к файлу изображения
- `caption`: Подпись к изображению с поддержкой переменных

**Действие:**
- Отправляет изображение пользователю
- Применяет подстановку переменных в подпись

---

#### 11. **Блок Inline Keyboard (Инлайн-клавиатура)**
Создание интерактивных инлайн-кнопок.

```python
elif block_type == 'inline_keyboard':
    buttons = block.get('buttons', [])
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(...)]])
```

**Параметры:**
- `message`: Текст сообщения с кнопками
- `buttons`: Список кнопок с callback_data

**Действие:**
- Создает инлайн-клавиатуру с кнопками
- Обработка нажатий через `handle_callback_query`

---

### E-commerce блоки

#### 12. **Блок Cart (Корзина)**
Управление операциями с корзиной покупок.

```python
elif block_type == 'cart':
    if action == 'add':
        cart[product_id] = cart.get(product_id, 0) + quantity
```

**Доступные действия:**
- `add` - Добавить товар в корзину
- `remove` - Удалить товар из корзины
- `show` - Показать содержимое корзины
- `clear` - Очистить корзину
- `count` - Получить общее количество товаров

**Параметры:**
- `action`: Тип операции
- `product_id`: Идентификатор товара
- `quantity`: Количество товара

**Действие:**
- Управляет состоянием корзины пользователя
- Сохраняет данные в `user_data[chat_id]['cart']`

---

#### 13. **Блок Catalog (Каталог)**
Отображение каталога товаров с пагинацией.

```python
elif block_type == 'catalog':
    products = json.loads(products_data)
    await send_paginated_catalog(chat_id, products)
```

**Параметры:**
- `source`: Источник данных (json/csv)
- `products`: Данные о товарах
- `per_page`: Количество товаров на странице

**Действие:**
- Реализует постраничную навигацию
- Отправляет товары с кнопками выбора
- Обрабатывает переключение страниц

---

#### 14. **Блок Payment (Оплата)**
Обработка платежей через Telegram Payments.

```python
elif block_type == 'payment':
    await bot.send_invoice(chat_id, title, description, provider_token, prices)
```

**Параметры:**
- `title`: Название заказа
- `amount`: Сумма платежа (с поддержкой переменных)
- `provider_token`: Токен платежного провайдера

**Действие:**
- Отправляет счет на оплату через Telegram API
- Обрабатывает успешную оплату
- Сохраняет информацию о транзакции

---

#### 15. **Блок Order Form (Форма заказа)(не работает)**
Сбор информации о заказе.

```python
elif block_type == 'order_form':
    fields = block.get('fields', [])
    await request_first_field(chat_id, fields[0])
```

**Параметры:**
- `fields`: Список обязательных полей (name/phone/email/address)
- `success_message`: Сообщение после успешного заполнения

**Поддерживаемые поля:**
- `name` - Имя
- `phone` - Телефон
- `email` - Email
- `address` - Адрес доставки

**Действие:**
- Последовательно запрашивает поля формы
- Валидирует введенные данные
- Сохраняет данные в `user_data`

---

#### 16. **Блок Order Confirm (Подтверждение заказа)(не работает)**
Отображение подтверждения заказа с действиями.

```python
elif block_type == 'order_confirm':
    buttons = []
    if show_confirm: buttons.append(InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_order"))
```

**Параметры:**
- `template`: Шаблон сообщения с переменными
- `show_confirm`: Показать кнопку подтверждения
- `show_edit`: Показать кнопку редактирования
- `show_cancel`: Показать кнопку отмены

**Действие:**
- Отображает итоговую информацию о заказе
- Предоставляет кнопки для действий
- Обрабатывает подтверждение/отмену через callback

---

### Интеграционные блоки

#### 17. **Блок Database (База данных)**
Сохранение и получение данных из JSON-базы.

```python
elif block_type == 'database':
    db_operation('save', key, data)
```

**Операции:**
- `save` - Сохранить данные
- `load` - Загрузить данные
- `delete` - Удалить данные

**Параметры:**
- `operation`: Тип операции
- `key`: Ключ в базе данных
- `data`: Данные для сохранения/получения

**Хранилище:** `bot_database.json`

**Действие:**
- Работает с локальной JSON-базой данных
- Поддерживает операции CRUD
- Данные персистентны между сеансами

---

#### 18. **Блок Notification (Уведомление)**
Отправка уведомлений пользователям или администраторам.

```python
elif block_type == 'notification':
    if target == 'admin':
        await bot.send_message(int(admin_id), message_text)
```

**Параметры:**
- `target`: Тип получателя (admin/custom)
- `chat_id`: Переменная с ID получателя
- `message`: Текст уведомления

**Действие:**
- Отправляет сообщение указанному получателю
- Поддерживает отправку администратору
- Применяет подстановку переменных

---

#### 19. **Блок ChatGPT**
AI-ответы через OpenAI API.

```python
elif block_type == 'chatgpt':
    response = await client.chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}])
```

**Параметры:**
- `api_key`: Ключ API OpenAI
- `prompt`: Запрос к AI (с поддержкой переменных)
- `model`: Модель GPT (по умолчанию: gpt-3.5-turbo)
- `response_variable`: Переменная для хранения ответа AI

**Действие:**
- Выполняет запрос к ChatGPT
- Сохраняет ответ в указанную переменную
- Поддерживает контекст через переменные

---

## 💡 Примеры использования

