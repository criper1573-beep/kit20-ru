#!/usr/bin/env node
/** Восстановить storage/birthday-dial-labels.json из .bak (без slug yulya-2). */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const bakPath = join(root, 'storage', 'birthday-dial-labels.json.bak');
const outPath = join(root, 'storage', 'birthday-dial-labels.json');

const raw = await readFile(bakPath, 'utf8');
const o = JSON.parse(raw);
delete o['yulya-2'];
await writeFile(outPath, JSON.stringify(o, null, '\t') + '\n', 'utf8');
console.log('OK: restored', outPath, 'from .bak');
