import YAML from 'yaml';

/** Разбор `---\nfrontmatter\n---\nbody` */
export function parseMarkdownFile(raw: string): { data: unknown; body: string } {
	const text = raw.replace(/^\uFEFF/, '');
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!m) {
		if (text.startsWith('---')) {
			throw new Error('Некорректный frontmatter (ожидается закрывающий ---)');
		}
		return { data: {}, body: text };
	}
	const fmBlock = m[1];
	const body = m[2] ?? '';
	return { data: YAML.parse(fmBlock) ?? {}, body };
}

export function stringifyMarkdownFile(data: object, body: string): string {
	const fm = YAML.stringify(data, { lineWidth: 120 }).replace(/\n$/, '');
	const b = body.trimEnd();
	return `---\n${fm}\n---\n${b ? `${b}\n` : ''}`;
}
