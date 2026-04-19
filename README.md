# Сайт учебной группы (театр и кино)

Сайт на [Astro](https://astro.build/) в режиме **SSR** (адаптер **Node**): три публичные страницы — главная, класс (16 карточек с модалками и этюдами), посещаемость. Контент лежит в Markdown в `src/content/`.

## Встроенная админка

Интерфейс **того же вида**, что и сайт, но под префиксом **`/admin`**: главная, класс, посещаемость плюс формы редактирования и сохранение **напрямую в файлы** в репозитории.

Публичные страницы при каждом запросе читают актуальные `.md` с диска — пересборка после правок из админки **не обязательна**.

### Переменные окружения

| Переменная | Назначение |
|------------|------------|
| **`ADMIN_PASSWORD`** | Пароль входа в `/admin` (обязательно в продакшене) |
| **`ADMIN_SESSION_SECRET`** | Опционально: отдельный секрет для подписи cookie |
| **`HOST`** | Адрес привязки Node (по умолчанию в `start:public`: `0.0.0.0`) |
| **`PORT`** | Порт Node (по умолчанию `4321`) |

---

## Деплой: сайт и админка с любого устройства

Нужен **VPS или свой сервер** с публичным IP / доменом и **HTTPS**. Один и тот же процесс отдаёт и сайт (`/`), и админку (`/admin`).

### 1. На сервере (Linux)

1. Установите **Node.js ≥ 22.12** и **nginx** (или другой reverse proxy).
2. Склонируйте репозиторий в каталог, например `/var/www/kit20`.
3. Скопируйте `deploy/env.example` → `/etc/kit20.env`, задайте **`ADMIN_PASSWORD`**, при необходимости поправьте **`PORT`**:

   ```bash
   sudo cp deploy/env.example /etc/kit20.env
   sudo chmod 600 /etc/kit20.env
   sudo nano /etc/kit20.env
   ```

4. Установите зависимости и соберите проект:

   ```bash
   cd /var/www/kit20
   npm ci
   npm run build
   ```

5. Запуск с прослушиванием **всех интерфейсов** (чтобы nginx на этой же машине мог подключиться к `127.0.0.1`, а с интернета приходил трафик на 443):

   ```bash
   # вручную для проверки (из корня репозитория, после build):
   set -a && source /etc/kit20.env && set +a
   npm run start:public
   ```

   Скрипт `scripts/start-prod.mjs` выставляет **`HOST=0.0.0.0`** и **`PORT=4321`**, если они не заданы — так процесс доступен за прокси и в локальной сети.

6. **Права на запись** в `src/content/` (админка сохраняет `.md`): пользователь из `User=` в systemd должен иметь право записи, например `sudo chown -R www-data:www-data /var/www/kit20/src/content` (или весь каталог проекта под этим пользователем).

7. **systemd** (автозапуск): скопируйте `deploy/kit20.service.example` в `/etc/systemd/system/kit20.service`, исправьте `User`, `WorkingDirectory`, `ExecStart` при необходимости:

   ```bash
   sudo cp deploy/kit20.service.example /etc/systemd/system/kit20.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now kit20
   sudo systemctl status kit20
   ```

8. **nginx**: пример в `deploy/nginx-kit20.conf.example` — проксирование на `127.0.0.1:4321`, редирект HTTP→HTTPS. Получите сертификаты, например:

   ```bash
   sudo certbot --nginx -d kit20.ru -d www.kit20.ru
   ```

9. Откройте в браузере с телефона или ПК: **`https://ваш-домен/`** — сайт, **`https://ваш-домен/admin`** — вход паролем из `ADMIN_PASSWORD`.

### 2. Домашний ПК / локальная сеть (без VPS)

После `npm run build`:

```bash
set ADMIN_PASSWORD=ваш-пароль
npm run start:public
```

С другого устройства в той же Wi‑Fi сети откройте **`http://IP-вашего-ПК:4321/`** (узнайте IP через `ipconfig` / `ip a`). На роутере может понадобиться проброс порта; в интернет безопаснее выставлять только через **VPN** или **Cloudflare Tunnel**, а не голый порт.

Проверка сборки без продакшен-запуска:

```bash
npm run preview:public
```

(тот же `0.0.0.0:4321` для превью.)

### 3. Обновление после правок в репозитории

```bash
cd /var/www/kit20
git pull
npm ci
npm run build
sudo systemctl restart kit20
```

---

## Разработка

```bash
npm install
set ADMIN_PASSWORD=dev   # Windows; на Unix: export ADMIN_PASSWORD=dev
npm run dev
```

Откройте `/admin`, войдите с тем же паролём.

## Структура контента

| Путь | Назначение |
|------|------------|
| `src/content/home.md` | Главная (заголовок, подзаголовок, markdown-текст) |
| `src/content/students/*.md` | Карточки учеников, этюды, опционально фото |
| `src/content/attendance.md` | Список занятий и отметки посещаемости |

Слаг ученика (`slug` в frontmatter) должен совпадать с именем файла и с отметками в посещаемости; для двух «Катя» и двух «Юля»: `katya-1` / `katya-2`, `yulya-1` / `yulya-2`.

### Расписание на месяц

- В админке посещаемости в таблице отмечаются только **отсутствующие**; остальные считаются **«был»** (Б / Н).
- Массово добавить занятия на месяц (понедельник, среда, суббота):

  `npm run schedule:month -- 2026 5`

- Миграция старого формата (`records` → только отсутствующие): `npm run schedule:migrate`.

## Иллюстрации персонажей (Класс)

Используются **16 SVG-персонажей** из [`office_characters.html`](office_characters.html) в корне проекта. После правок в этом файле выполните `npm run extract:office-svgs` — обновятся фрагменты в `src/components/office-svgs/`.
