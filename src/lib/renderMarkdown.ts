import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdownToHtml(md: string): string {
	const src = md.trim() ? md : '';
	return marked.parse(src, { async: false }) as string;
}
