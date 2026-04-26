import type { BdPlaced } from './birthdayDialGeometry';

export type BirthdayDialItemNodes = {
	g: SVGGElement;
	gLabel: SVGGElement;
	line: SVGLineElement;
	circle: SVGCircleElement;
	text: SVGTextElement;
	slug: string;
};

const NS = 'http://www.w3.org/2000/svg';

const fontNm = 5.5;

export function createBirthdayDialItem(
	p: BdPlaced,
	opts?: { interactive?: boolean },
): BirthdayDialItemNodes {
	const g = document.createElementNS(NS, 'g');
	g.setAttribute('data-birthday-slug', p.slug);
	if (opts?.interactive) {
		g.setAttribute('tabindex', '0');
		g.setAttribute('role', 'button');
		g.setAttribute('aria-label', `Карточка: ${p.displayName}, ${p.birthday}`);
	}
	g.setAttribute('class', 'text-ink');

	const c = document.createElementNS(NS, 'circle');
	c.setAttribute('cx', String(p.dotX));
	c.setAttribute('cy', String(p.dotY));
	c.setAttribute('r', '2.4');
	c.setAttribute('fill', 'currentColor');
	c.setAttribute('class', 'text-accent');
	c.setAttribute('pointer-events', 'all');

	const l = document.createElementNS(NS, 'line');
	l.setAttribute('x1', String(p.dotX));
	l.setAttribute('y1', String(p.dotY));
	l.setAttribute('x2', String(p.labelX));
	l.setAttribute('y2', String(p.labelY));
	l.setAttribute('stroke', 'currentColor');
	l.setAttribute('stroke-width', '0.3');
	l.setAttribute('pointer-events', 'none');
	l.setAttribute('opacity', '0.28');

	const gLabel = document.createElementNS(NS, 'g');
	gLabel.setAttribute('class', 'bd-birthday-label-wrap');
	gLabel.setAttribute('transform', `translate(${p.labelX},${p.labelY}) rotate(${p.labelRot})`);

	const t = document.createElementNS(NS, 'text');
	t.setAttribute('x', '0');
	t.setAttribute('y', '0');
	t.setAttribute('text-anchor', 'middle');
	t.setAttribute('dominant-baseline', 'middle');
	t.setAttribute('font-size', String(fontNm));
	t.setAttribute('font-weight', '600');
	t.setAttribute('class', 'font-sans bd-birthday-label text-ink');
	t.setAttribute('pointer-events', 'all');
	t.setAttribute('style', 'letter-spacing:0.01em;');
	t.textContent = p.nameShown;
	t.setAttribute('title', `${p.displayName} — ${p.birthday}`);

	g.appendChild(l);
	g.appendChild(c);
	gLabel.appendChild(t);
	g.appendChild(gLabel);
	return { g, gLabel, line: l, circle: c, text: t, slug: p.slug };
}

/** Обновить положение подписи и линию (точка на месте) */
export function setBirthdayDialItemPosition(
	nodes: BirthdayDialItemNodes,
	labelX: number,
	labelY: number,
	labelRot: number,
): void {
	nodes.gLabel.setAttribute('transform', `translate(${labelX},${labelY}) rotate(${labelRot})`);
	nodes.line.setAttribute('x2', String(labelX));
	nodes.line.setAttribute('y2', String(labelY));
}
