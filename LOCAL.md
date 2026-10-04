# KIT20 — local preview on the box

Fast UI iteration copy. **Not production.** Deploy to prod is a separate step (see `DEPLOY.md` / `scripts/remote-refresh-site.ps1`). Do not treat this as the live site.

## Open

- URL: http://127.0.0.1:4322/
- From parent / computerUse: open the box browser to that URL (dev listens on `0.0.0.0:4322`).

## Paths

- Code + runtime: `/workspace/kit20-local`
- Branch: `cursor/class-etude-topics-3b08` (edit here first, then one prod deploy when ready)
- Live-ish content synced from prod: `src/content/students`, `attendance.md`, `home.md`, `obshchak.json`, `etude-topics.json`, `storage/uploads`

## Restart

```bash
cd /workspace/kit20-local
# stop old (if any)
pkill -f "astro dev.*4322" || true
# start
npm run dev -- --host 0.0.0.0 --port 4322
```

Background (same as initial setup):

```bash
cd /workspace/kit20-local
npm run dev -- --host 0.0.0.0 --port 4322
# then curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4322/
```

Node: 22+. Env: `.env` (`HOST`, `PORT=4322`, local `ADMIN_PASSWORD`).

## Re-sync runtime from prod (optional)

Only content/uploads — does not change git code. Use when prod data drifted and you want fresher photos/students for preview.
