# Сайт учебной группы (театр и кино)

Статический сайт на [Astro](https://astro.build/) с тремя страницами: главная, класс (16 карточек с модальными профилями и этюдами), посещаемость. Редактирование контента — **Decap CMS** по адресу **https://kit20.ru/admin/** с бэкендом **GitHub** (репозиторий указан в `public/admin/config.yml`).

## Разработка

```bash
npm install
npm run dev
```

Сборка: `npm run build`, превью: `npm run preview`.

## Редактирование без Netlify (локально)

1. Установите [Netlify CLI](https://docs.netlify.com/cli/get-started/).
2. В корне репозитория временно добавьте в `public/admin/config.yml` строку `local_backend: true` под `backend` (не коммитьте в общий репозиторий, если не хотите) **или** задайте переменную окружения согласно [документации Decap](https://decapcms.org/docs/working-with-a-local-git-repository/).
3. В одном терминале: `npx decap-server`
4. В другом: `netlify dev` или `npm run dev` и в браузере перейдите на маршрут `/admin/` локального сайта.

## Публикация на kit20.ru и админка через GitHub

Репозиторий с исходниками сайта (по умолчанию в конфиге CMS: **`criper1573-beep/kit20-ru`**, ветка **`master`**). Если имя репозитория другое — поправьте `repo` в `public/admin/config.yml`.

1. Создайте на GitHub пустой репозиторий **`kit20-ru`** (без README, если не хотите лишний merge), залейте этот проект: `git remote add origin …`, `git push -u origin master`.
2. **OAuth-приложение GitHub** для входа в Decap: [Developer settings → OAuth Apps → New](https://github.com/settings/applications/new).
   - **Homepage URL:** `https://kit20.ru`
   - **Authorization callback URL:** `https://kit20.ru/callback`
3. Скопируйте **Client ID** и сгенерируйте **Client secret**. Вставьте их в `КонтентЗавод\.env` в переменные **`KIT20_GITHUB_OAUTH_CLIENT_ID`** и **`KIT20_GITHUB_OAUTH_CLIENT_SECRET`** (блок уже добавлен в файл).
4. На VPS поднимается Docker-контейнер с OAuth-прокси; nginx на `kit20.ru` проксирует пути **`/auth`** и **`/callback`** на этот сервис. Запуск с вашего ПК (после шага 3):

   `powershell -ExecutionPolicy Bypass -File scripts\deploy-kit20-oauth.ps1`

5. Откройте **https://kit20.ru/admin/** → **Login with GitHub**. Учётная запись GitHub должна иметь **право push** в репозиторий с контентом (владелец или collaborator).

После входа правки из CMS сохраняются **коммитами в GitHub**. Чтобы изменения появились на сайте, нужен процесс **сборки и выкладки** `dist` на сервер (вручную или CI по push в `master`).

### Netlify (по желанию)

В `netlify.toml` по-прежнему можно подключить Netlify Identity + Git Gateway вместо шагов выше; тогда в `config.yml` снова укажите `git-gateway` и настройки Netlify.

### Медиа

Загруженные в CMS файлы попадают в `public/uploads/` (в репозитории). В поле «Фото» у ученика укажите путь вида `/uploads/имя-файла.jpg`.

## Иллюстрации персонажей (Класс)

Используются **16 SVG-персонажей** из [`office_characters.html`](office_characters.html) в корне проекта. После правок в этом файле выполните `npm run extract:office-svgs` — обновятся фрагменты в `src/components/office-svgs/`.

## Структура контента

| Путь | Назначение |
|------|------------|
| `src/content/home.md` | Главная (заголовок, подзаголовок, markdown-текст) |
| `src/content/students/*.md` | Карточки учеников, этюды, опционально фото |
| `src/content/attendance.md` | Список занятий и отметки посещаемости |

Слаг ученика (`slug` в frontmatter) должен совпадать с выбором в графике посещаемости; для двух «Катя» и двух «Юля» используются разные slug: `katya-1` / `katya-2`, `yulya-1` / `yulya-2`.
