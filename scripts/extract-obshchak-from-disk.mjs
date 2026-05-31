#!/usr/bin/env node
/**
 * Извлечь obshchak.json из сырых блоков диска (после grep -aob contributedKopeks).
 * node scripts/extract-obshchak-from-disk.mjs /dev/vda1 [offset...]
 */
import fs from 'node:fs';

const dev = process.argv[2] || '/dev/vda1';
const offsets = process.argv.slice(3).map(Number).filter(Number.isFinite);
const defaultOffsets = [1282223846, 1282233135, 1282233187, 1759872250, 1759875189];

function extractJsonAround(buf, needlePos) {
	const startSearch = Math.max(0, needlePos - 4000);
	const slice = buf.subarray(startSearch, Math.min(buf.length, needlePos + 12000));
	const text = slice.toString('utf8', 0, slice.length);
	const needle = text.indexOf('contributedKopeks');
	if (needle < 0) return null;

	let open = -1;
	for (let i = needle; i >= 0; i--) {
		if (text[i] === '{') {
			open = i;
			break;
		}
	}
	if (open < 0) return null;

	let depth = 0;
	for (let i = open; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}') {
			depth--;
			if (depth === 0) {
				const raw = text.slice(open, i + 1);
				try {
					const j = JSON.parse(raw);
					if (j && typeof j === 'object' && 'contributedKopeks' in j) return j;
				} catch {}
				return null;
			}
		}
	}
	return null;
}

const fd = fs.openSync(dev, 'r');
const wins = [];

for (const off of offsets.length ? offsets : defaultOffsets) {
	const start = Math.max(0, off - 4096);
	const len = 20000;
	const buf = Buffer.alloc(len);
	fs.readSync(fd, buf, 0, len, start);
	const needlePos = buf.indexOf('contributedKopeks');
	if (needlePos < 0) continue;
	const j = extractJsonAround(buf, needlePos);
	if (j) {
		const keys = Object.keys(j.contributedKopeks || {}).length;
		const exp = (j.expenses || []).length;
		wins.push({ off, keys, exp, j });
		console.error(`candidate off=${off} keys=${keys} expenses=${exp}`);
	}
}
fs.closeSync(fd);

if (!wins.length) {
	console.error('Ничего не найдено');
	process.exit(1);
}

wins.sort((a, b) => b.keys + b.exp * 10 - (a.keys + a.exp * 10));
const best = wins[0].j;
process.stdout.write(JSON.stringify(best, null, 2) + '\n');
console.error('OK best:', wins[0].off, 'keys', wins[0].keys, 'expenses', wins[0].exp);
