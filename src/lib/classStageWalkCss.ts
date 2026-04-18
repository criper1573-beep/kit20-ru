/** Ключевые кадры для «прогулки» актёров по сцене — детерминированно, без runtime. */

const clamp = (n: number) => Math.round(n);

/** Десктоп: умеренная амплитуда (коэффициент < 1). */
export function buildClassStageWalkerCss(): string {
	const amp = 0.58;
	return Array.from({ length: 16 }, (_, i) => {
		const dur = 15 + (i % 6) * 2.4;
		const delay = -(i * 0.68);
		const x1 = clamp((26 + (i % 5) * 7) * amp);
		const y1 = clamp((-16 - (i % 4) * 5) * amp);
		const x2 = clamp((-20 + (i % 4) * 9) * amp);
		const y2 = clamp((14 + (i % 3) * 5) * amp);
		return `@keyframes class-stage-roam-${i} {
  0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
  33% { transform: translate(-50%, -50%) translate(${x1}px, ${y1}px); }
  66% { transform: translate(-50%, -50%) translate(${x2}px, ${y2}px); }
}
.class-stage-walker-${i} {
  animation: class-stage-roam-${i} ${dur}s ease-in-out infinite;
  animation-delay: ${delay}s;
}`;
	}).join('\n');
}

/** Мобильная сцена: меньший шаг, почти одинаковый темп по фигурам. */
export function buildClassStageWalkerMobileCss(): string {
	const amp = 0.3;
	return Array.from({ length: 16 }, (_, i) => {
		const dur = 19.5 + (i % 5) * 0.12;
		const delay = -(i * 0.62);
		const x1 = clamp((26 + (i % 5) * 7) * amp);
		const y1 = clamp((-16 - (i % 4) * 5) * amp);
		const x2 = clamp((-20 + (i % 4) * 9) * amp);
		const y2 = clamp((14 + (i % 3) * 5) * amp);
		return `@keyframes class-stage-roam-m-${i} {
  0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
  33% { transform: translate(-50%, -50%) translate(${x1}px, ${y1}px); }
  66% { transform: translate(-50%, -50%) translate(${x2}px, ${y2}px); }
}
.class-stage-walker-m-${i} {
  animation: class-stage-roam-m-${i} ${dur}s ease-in-out infinite;
  animation-delay: ${delay}s;
}`;
	}).join('\n');
}
