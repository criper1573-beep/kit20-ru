import {
	birthdayInYearNoon,
	dialAngleDegFromTop,
	dialRotationSvgDeg,
	dayOfYearInYear,
	parseBirthdayDmy,
} from './birthdayUtils';
import type { BirthdayLabelOverride } from './birthdayDialLayoutFile';

export type BdRow = { displayName: string; m: number; d: number; birthday: string; slug: string };

type Parts = { day: number; month: number; year: number };
type WithParts = { r: BdRow; parts: Parts };

function normAngleDeg(a: number): number {
	return ((a % 360) + 360) % 360;
}

export function polarFromTopDeg(deg: number, r: number, cx: number, cy: number) {
	const rad = (deg * Math.PI) / 180;
	return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function shortLabel(name: string): string {
	const t = name.trim();
	if (t.length <= 9) return t;
	return `${t.slice(0, 8)}…`;
}

function isLateMayEarlyJuneMonthDay(month: number, day: number): boolean {
	if (month === 5) return day >= 20;
	if (month === 6) return day <= 12;
	return false;
}

function tangentialNudgeInCluster(
	aInits: number[],
	clusterDeg: number,
	stepDeg: number,
	opts?: { clusterWantsWideStep?: (from: number, to: number) => boolean; wideStepDeg?: number },
): number[] {
	const n = aInits.length;
	const o = new Array(n).fill(0);
	const wide = opts?.wideStepDeg ?? stepDeg;
	let k = 0;
	while (k < n) {
		let j = k;
		while (j + 1 < n && aInits[j + 1]! - aInits[j]! < clusterDeg) j += 1;
		if (j > k) {
			const m = (k + j) / 2;
			const useWide = opts?.clusterWantsWideStep?.(k, j) === true;
			const step = useWide ? wide : stepDeg;
			for (let t = k; t <= j; t++) o[t] = (t - m) * step;
		}
		k = j + 1;
	}
	return o;
}

export type BdPlaced = {
	slug: string;
	displayName: string;
	birthday: string;
	nameShown: string;
	dotX: number;
	dotY: number;
	labelX: number;
	labelY: number;
	labelRot: number;
	/** true, если взяли координаты из сохранённого файла (для сброса/подсказок) */
	fromOverride: boolean;
};

const R_DIAL = 90;
const R_DOT_BASE = 81;
const R_DOT_STEP = 1.6;
const TAN_STEP_DEG = 4.5;
const TAN_STEP_SAME_DAY_MAY_JUN = 6.4;
const TAN_NUDGE_WIDE = 3.2;
const R_NAME_BASE = 99;
const R_NAME_RADIAL_STEP = 2.1;
const fontNm = 5.5;
const innerClear = 2.2;
const wEst = 0.58;
const hEst = 0.5;
const hCoeff = 0.35;
const rNameStepScale = 0.4;

/**
 * Считает положения точек и подписей; подписи подменяются из `overrides` по `slug` (x, y, rot в тех же единицах, что viewBox циферблата).
 */
export function computeBirthdayDialPlacements(
	rows: BdRow[],
	year: number,
	yearLength: number,
	overrides: Record<string, BirthdayLabelOverride> | null | undefined,
): BdPlaced[] {
	const withParts: WithParts[] = rows
		.map((r) => ({ r, parts: parseBirthdayDmy(r.birthday) }))
		.filter((x) => x.parts != null) as WithParts[];
	const ovr = overrides ?? {};
	const by = new Map<string, WithParts[]>();
	const key = (m: number, d: number) => `${m}-${d}`;
	for (const { r, parts } of withParts) {
		const k = key(parts.month, parts.day);
		if (!by.has(k)) by.set(k, []);
		by.get(k)!.push({ r, parts });
	}
	for (const [, group] of by) {
		group.sort((a, b) => a.r.displayName.localeCompare(b.r.displayName, 'ru'));
	}
	type BdW = {
		item: WithParts;
		/** угол «середины дня» на циферблате, без сдвига внутри суток */
		a0: number;
		/** сколько дней рождения в эту дату; при >1 все делят одну отметку в (a0, R_DOT_BASE) */
		nInDay: number;
		/** сдвиг вдоль дуги (подписи) */
		aInit: number;
		/** зарезервировано для n=1; при общей точке rDot в расчёте кружка не используется */
		rDot: number;
		rNameBase: number;
	};
	const work: BdW[] = [];
	for (const gr of by.values()) {
		const n = gr.length;
		gr.forEach((item, idx) => {
			const p = item.parts;
			const doy = dayOfYearInYear(birthdayInYearNoon(year, p.month, p.day));
			const a0 = dialAngleDegFromTop(doy, yearLength);
			const inMayJun = isLateMayEarlyJuneMonthDay(p.month, p.day);
			const tStep = inMayJun ? TAN_STEP_SAME_DAY_MAY_JUN : TAN_STEP_DEG;
			const tOff = n === 1 ? 0 : (idx - (n - 1) / 2) * tStep;
			const aInit = a0 + tOff;
			const rDot = R_DOT_BASE - idx * R_DOT_STEP;
			const rNameBase = R_NAME_BASE + idx * R_NAME_RADIAL_STEP;
			work.push({ item, a0, nInDay: n, aInit, rDot, rNameBase });
		});
	}
	work.sort((wa, wb) => {
		const pa = wa.item.parts;
		const pb = wb.item.parts;
		const da = dayOfYearInYear(birthdayInYearNoon(year, pa.month, pa.day));
		const db = dayOfYearInYear(birthdayInYearNoon(year, pb.month, pb.day));
		if (da !== db) return da - db;
		return wa.item.r.displayName.localeCompare(wb.item.r.displayName, 'ru');
	});
	/**
	 * Касательные кластеры должны идти по **возрастанию угла** вдоль круга. Порядок work — по дню года и
	 * имени, но сдвиг «в один день» может переставить угол «31.05» **после** «1.06» в градусах, тогда
	 * соседние aInits[j+1]-aInits[j] становятся отрицательными и сдвиги (и подписи) путаются с соседями.
	 */
	const order = work.map((_, i) => i).sort((ia, ib) => work[ia]!.aInit - work[ib]!.aInit);
	const aInitsByAngle = order.map((i) => work[i]!.aInit);
	const tNudgedByAngle = tangentialNudgeInCluster(aInitsByAngle, 5.5, 1.8, {
		wideStepDeg: TAN_NUDGE_WIDE,
		clusterWantsWideStep: (fr, to) => {
			for (let t = fr; t <= to; t++) {
				const wi = order[t]!;
				const p = work[wi]!.item.parts;
				if (isLateMayEarlyJuneMonthDay(p.month, p.day)) return true;
			}
			return false;
		},
	});
	const tNudges: number[] = new Array(work.length);
	for (let s = 0; s < order.length; s++) {
		tNudges[order[s]!] = tNudgedByAngle[s] ?? 0;
	}
	const out: BdPlaced[] = [];
	for (let k = 0; k < work.length; k++) {
		const w = work[k]!;
		/** одна общая кружок на дату; подписи по-прежнему с раздвижкой aInit + кластер */
		const useSharedDayDot = w.nInDay > 1;
		const aDot = useSharedDayDot ? w.a0 : w.aInit;
		const rDot = useSharedDayDot ? R_DOT_BASE : w.rDot;
		const aText = normAngleDeg(w.aInit + (tNudges[k] ?? 0));
		const { x: dotX, y: dotY } = polarFromTopDeg(aDot, rDot, 100, 100);
		const nameShown = shortLabel(w.item.r.displayName);
		const estHalfW = (nameShown.length * fontNm * wEst) * 0.5;
		const estHalfH = fontNm * hEst;
		let rName =
			R_DIAL + innerClear + estHalfW + hCoeff * estHalfH + (w.rNameBase - 99) * rNameStepScale;
		const tpos = polarFromTopDeg(aText, rName, 100, 100);
		const labelRotDefault = dialRotationSvgDeg(aText);
		const slug = w.item.r.slug;
		const u = ovr[slug];
		const fromOverride = Boolean(
			u && Number.isFinite(u.x) && Number.isFinite(u.y) && Number.isFinite(u.rot),
		);
		const labelX = fromOverride ? u!.x : tpos.x;
		const labelY = fromOverride ? u!.y : tpos.y;
		const labelRot = fromOverride ? u!.rot : labelRotDefault;
		out.push({
			slug,
			displayName: w.item.r.displayName,
			birthday: w.item.r.birthday,
			nameShown,
			dotX,
			dotY,
			labelX,
			labelY,
			labelRot,
			fromOverride,
		});
	}
	return out;
}
