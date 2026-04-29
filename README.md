# OKTIQ School

Онлайн-школа на Django + React с дизайном.

## Стек

- Backend: Django, Django REST Framework, PostgreSQL
- Frontend: React, Vite
- Фоновые задачи: Celery + Redis
- Локальный запуск: Docker Compose

## Основные модули

- Вход по номеру телефона и коду
- Онбординг с тарифом и договором
- Главная страница
- Профиль ученика
- Расписание
- Репетиторы и запись на урок
- Отзывы
- Баланс и оплата
- Уведомления и документы

## Быстрый старт

1. Создайте `.env` по примеру `.env.example`.
2. Запустите `docker compose up --build`.
3. Откройте:
   - frontend: `http://localhost:5173`
   - backend API: `http://localhost:8000/api`

## Дополнительно

- `worker` сервис запускает Celery worker
- Django admin доступен на `http://localhost:8000/admin`
