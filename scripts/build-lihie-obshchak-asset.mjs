/**
 * PNG с прозрачным фоном: «ЛИХИЕ» (как на постере) + снизу «90-е».
 * Источник: public/lihie-poster-source.png
 * Результат: public/obshchak-lihie-90e.png
 */
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'public', 'lihie-poster-source.png');
const out = join(root, 'public', 'obshchak-lihie-90e.png');

function isRedBackdrop(r, g, b) {
	if (r + g + b < 35) return false;
	if (r < 75) return false;
	if (r > g + 18 && r > b + 18) return true;
	if (r > 130 && g < 95 && b < 95) return true;
	return false;
}

async function keyedPng(buf, crop) {
	const extracted = await sharp(buf).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const { data, info } = extracted;
	const w = info.width;
	const h = info.height;
	const ch = info.channels;
	const outBuf = Buffer.alloc(w * h * 4);
	for (let i = 0; i < w * h; i++) {
		const o = i * ch;
		const r = data[o] ?? 0;
		const g = data[o + 1] ?? 0;
		const b = data[o + 2] ?? 0;
		const a = data[o + 3] ?? 255;
		let na = a;
		if (isRedBackdrop(r, g, b)) na = 0;
		const p = i * 4;
		outBuf[p] = r;
		outBuf[p + 1] = g;
		outBuf[p + 2] = b;
		outBuf[p + 3] = na;
	}
	const tmp = await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
	return sharp(tmp).trim({ threshold: 12 }).png().toBuffer();
}

async function main() {
	const buf = await readFile(src);
	const meta = await sharp(buf).metadata();
	const w0 = meta.width ?? 0;
	const h0 = meta.height ?? 0;
	if (!w0 || !h0) throw new Error('no size');

	// Только крупное слово (без нижнего ряда «90-Е…»).
	const cropTitle = {
		left: Math.round(w0 * 0.025),
		top: Math.round(h0 * 0.27),
		width: Math.round(w0 * 0.95),
		height: Math.round(h0 * 0.33),
	};
	// Узкая полоса по центру: в основном «90-е.» (без длинного теглайна).
	const cropSub = {
		left: Math.round(w0 * 0.395),
		top: Math.round(h0 * 0.615),
		width: Math.round(w0 * 0.21),
		height: Math.round(h0 * 0.092),
	};

	const titlePng = await keyedPng(buf, cropTitle);
	const subPng = await keyedPng(buf, cropSub);

	const tMeta = await sharp(titlePng).metadata();
	const sMeta = await sharp(subPng).metadata();
	const tw = tMeta.width ?? 0;
	const th = tMeta.height ?? 0;
	const sw = sMeta.width ?? 0;
	const sh = sMeta.height ?? 0;
	const gap = Math.max(10, Math.round(h0 * 0.018));
	const W = Math.max(tw, sw);
	const H = th + gap + sh;

	await sharp({
		create: {
			width: W,
			height: H,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.composite([
			{ input: titlePng, left: Math.round((W - tw) / 2), top: 0 },
			{ input: subPng, left: Math.round((W - sw) / 2), top: th + gap },
		])
		.png()
		.toFile(out);

	console.log('OK', out, `canvas ${W}×${H}, title ${tw}×${th}, sub ${sw}×${sh}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
