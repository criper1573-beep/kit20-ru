# KIT20 — деплой и runtime-данные

## Критично: не затирать obshchak.json

`src/content/obshchak.json` — **только на сервере**, правится через админку `/admin/obschak`.
В git **нет** актуальных цифр (только `obshchak.json.example`).

### Деплой на VPS — ТОЛЬКО так

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/remote-refresh-site.ps1
```

**Никогда** не делать на сервере голый `git pull` / `git reset --hard` без бэкапа.

Скрипт деплоя автоматически:
1. бэкапит runtime в `storage/deploy-backups/`
2. `git pull`
3. восстанавливает obshchak, если pull подставил пустой шаблон
4. `npm run verify:obshchak` — падает, если математика или траты потеряны
5. ставит `post-merge` git hook (защита даже при ручном pull)

### Где лежат копии obshchak

| Путь | Когда |
|------|--------|
| `storage/admin-change-log/snapshots/` | каждое сохранение в админке |
| `storage/last-known-good/obshchak.json` | каждое сохранение + nightly backup |
| `storage/deploy-backups/YYYYMMDD-HHMMSS/` | каждый деплой |
| `storage/runtime-backups/YYYY-MM-DD/` | cron 03:00 UTC на VPS |

Откат: `/admin/logs` → rollback по записи `obshchak`.

### Локальная правка obshchak на сервере

```powershell
powershell -File scripts/upload-obshchak-json.ps1 -JsonPath "путь\к\файлу.json"
```

После правок — `node scripts/verify-obshchak.mjs`.

### Другие runtime-файлы (не в git / осторожно при pull)

- `src/content/home.md` — главная (фото, прогресс семестров)
- `src/content/attendance.md` — посещаемость (в git шаблон, на сервере живые занятия)
- `src/content/students/*.md` — карточки учеников после правок в админке
- `storage/uploads/` — загруженные фото
- `storage/birthday-dial-labels.json`

Их сохраняет `preserve-runtime-on-deploy.mjs`. **Никогда** `git stash -u` на сервере.
