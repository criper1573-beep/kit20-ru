/** Траектории в пределах видимой области: translate только в vmin, небольшая амплитуда. */

const s = (n: number) => n.toFixed(2);

/** Целые смещения примерно в [-6, 6] vmin — детерминированно от индекса */
function wobble(i: number, salt: number): number {
	return (((i * 17 + salt * 11) % 13) - 6);
}

export function buildClassStageWalkerCss(): string {
	return Array.from({ length: 16 }, (_, i) => {
		const dur = 40 + (i % 9) * 3.8;
		const delay = -(i * 1.2);

		const x1 = wobble(i, 1);
		const y1 = wobble(i, 2);
		const x2 = wobble(i, 3);
		const y2 = wobble(i, 4);
		const x3 = wobble(i, 5);
		const y3 = wobble(i, 6);
		const x4 = wobble(i, 7);
		const y4 = wobble(i, 8);

		return `@keyframes class-stage-roam-${i} {
  0%, 100% { transform: translate(-50%, -50%) translate(0vmin, 0vmin); }
  20% { transform: translate(-50%, -50%) translate(${s(x1)}vmin, ${s(y1)}vmin); }
  40% { transform: translate(-50%, -50%) translate(${s(x2)}vmin, ${s(y2)}vmin); }
  60% { transform: translate(-50%, -50%) translate(${s(x3)}vmin, ${s(y3)}vmin); }
  80% { transform: translate(-50%, -50%) translate(${s(x4)}vmin, ${s(y4)}vmin); }
}
.class-stage-walker-${i} {
  animation: class-stage-roam-${i} ${dur}s ease-in-out infinite;
  animation-delay: ${delay}s;
}`;
	}).join('\n');
}
