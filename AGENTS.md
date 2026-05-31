# Инструкции для AI-агентов (Cursor)

Перед деплоем или SSH на VPS прочитай **[DEPLOY.md](./DEPLOY.md)**.

Правило `.cursor/rules/kit20-deploy-runtime-data.mdc` всегда активно.

Кратко:
- деплой → `scripts/remote-refresh-site.ps1`
- `obshchak.json` не коммитить
- восстановление → `/admin/logs`, `storage/last-known-good/`, `storage/runtime-backups/`
