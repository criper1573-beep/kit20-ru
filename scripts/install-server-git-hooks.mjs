#!/usr/bin/env node
/**
 * Установить git hooks на сервере — post-merge восстанавливает runtime после git pull.
 */
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const gitDir = join(root, '.git');
if (!existsSync(gitDir)) {
	console.error('SKIP: не git-репозиторий');
	process.exit(0);
}

const hooksDir = join(gitDir, 'hooks');
await mkdir(hooksDir, { recursive: true });

const hookBody = `#!/bin/sh
# kit20: не затирать obshchak и прочий runtime после git pull
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 0
node scripts/preserve-runtime-on-deploy.mjs --phase=post-pull 2>&1 || true
`;

const hookPath = join(hooksDir, 'post-merge');
await writeFile(hookPath, hookBody, 'utf8');
await chmod(hookPath, 0o755);

// Первичный last-known-good с текущего obshchak
spawnSync(process.execPath, ['scripts/backup-runtime-content.mjs'], { cwd: root, stdio: 'inherit' });

console.log('OK: installed .git/hooks/post-merge');
