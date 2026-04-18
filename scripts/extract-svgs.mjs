import fs from 'node:fs';
import path from 'node:path';

const outDir = 'src/components/office-svgs';
fs.mkdirSync(outDir, { recursive: true });

const html = fs.readFileSync('office_characters.html', 'utf8');
const re = /<svg[\s\S]*?<\/svg>/g;
const svgs = [...html.matchAll(re)].map((m) => m[0]);
console.log('SVG count:', svgs.length);
for (let i = 0; i < svgs.length; i++) {
	svgs[i] = svgs[i]
		.replace('<svg', '<svg class="office-char-svg" preserveAspectRatio="xMidYMax meet"')
		.replace(/\sclass="character-\d+"/, '');
	fs.writeFileSync(path.join(outDir, `${i}.snippet.html`), svgs[i], 'utf8');
}
