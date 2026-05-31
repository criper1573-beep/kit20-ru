#!/usr/bin/env node
/**
 * Восстановить storage/uploads из git stash (untracked parent ^3).
 * node scripts/restore-uploads-from-stashes.mjs
 */
import { cp, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const uploadsDir = join(root, 'storage', 'uploads');

function run(cmd, args) {
	const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
	return (r.stdout || '').trim();
}

await mkdir(uploadsDir, { recursive: true });

const list = run('git', ['stash', 'list']).split('\n').filter(Boolean);
let restored = 0;

for (let i = 0; i < list.length; i++) {
	const untracked = run('git', ['rev-parse', '--verify', `stash@{${i}}^3`]);
	if (!untracked) continue;
	const files = run('git', ['ls-tree', '-r', '--name-only', `stash@{${i}}^3`, 'storage/uploads']).split('\n').filter(Boolean);
	for (const rel of files) {
		const name = rel.split('/').pop();
		if (!name) continue;
		const dest = join(uploadsDir, name);
		if (existsSync(dest)) continue;
		spawnSync('git', ['checkout', `stash@{${i}}^3`, '--', rel], { cwd: root, stdio: 'inherit' });
		restored++;
	}
}

const total = (await readdir(uploadsDir)).filter((f) => !f.startsWith('.')).length;
console.error(`OK: uploads restored +${restored}, total ${total} files`);
