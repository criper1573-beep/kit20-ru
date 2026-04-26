/**
 * Убирает вшитую «шахматку» (светлый нейтральный фон) → настоящий альфа-канал WebP.
 * Файл: public/obshchak-lihie-90e.webp
 */
import sharp from 'sharp';
import { copyFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = join(root, 'public', 'obshchak-lihie-90e.webp');

function shouldBeTransparent(r, g, b) {
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const sat = max - min;
	const y = 0.299 * r + 0.587 * g + 0.114 * b;
	if (sat < 42 && y > 108) return true;
	if (sat < 22 && y > 85 && y < 195) return true;
	return false;
}

const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const buf = Buffer.from(data);
for (let i = 0; i < w * h; i++) {
	const o = i * 4;
	const r = buf[o] ?? 0;
	const g = buf[o + 1] ?? 0;
	const b = buf[o + 2] ?? 0;
	if (shouldBeTransparent(r, g, b)) buf[o + 3] = 0;
}
const tmp = join(tmpdir(), `obshchak-lihie-${Date.now()}.webp`);
await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
	.webp({ quality: 88, alphaQuality: 100 })
	.toFile(tmp);
copyFileSync(tmp, p);
unlinkSync(tmp);
console.log('OK', p, `${w}×${h}`);
