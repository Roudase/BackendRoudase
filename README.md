
# BackendRoudase — Лабораторна робота 1 (TypeScript / Express / Docker)

Цей проєкт реалізує базовий REST API з ендпоінтом `/healthcheck` на TypeScript замість Python, з Docker та можливістю деплою на Render.

## Технології

- Node.js
- TypeScript
- Express
- Docker / docker-compose

## Встановлення та запуск локально

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Запуск у режимі розробки

```bash
npm run dev
```

За замовчуванням сервер запускається на порту `8080`.

### 3. Перевірка healthcheck

```bash
curl http://localhost:8080/healthcheck
```

Приклад відповіді:

```json
{
  "date": "2025-12-09T12:00:00.000Z",
  "status": "ok"
}
```

---

## Збірка та запуск через Docker

### 1. Збірка образу

```bash
docker build -t backend-roudase:latest .
```

### 2. Запуск контейнера

```bash
docker run -it --rm -p 8080:8080 backend-roudase:latest
```

Після цього ендпоінт `/healthcheck` буде доступний за адресою:

```text
http://localhost:8080/healthcheck
```

---

## Запуск через docker-compose

```bash
docker-compose build
docker-compose up
```

---

## Деплой на Render

1. Завантажити цей репозиторій на GitHub.
2. Створити сервіс типу **Web Service** на [render.com](https://render.com/).
3. Обрати репозиторій, гілку та задати:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/server.js`
4. Після успішного деплою перевірити ендпоінт:

```text
https://backendroudase.onrender.com/healthcheck
```

---

## Структура проєкту

```text
src/
  app.ts        # Ініціалізація Express-застосунку
  routes.ts     # Маршрути, включно з /healthcheck
server.ts       # Точка входу, запуск сервера
Dockerfile      # Опис Docker-образу
docker-compose.yml # Конфігурація для локального запуску в контейнері
tsconfig.json   # Налаштування TypeScript
package.json    # Залежності та скрипти
.gitignore      # Ігноровані файли та папки
.dockerignore   # Ігноровані файли та папки для Docker
```
