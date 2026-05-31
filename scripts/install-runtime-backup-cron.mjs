#!/usr/bin/env node
/** Cron на VPS: 0 3 * * * cd /var/www/kit20 && node scripts/backup-runtime-content.mjs */
import { writeFile } from 'node:fs/promises';

const root = process.cwd();
const cronLine = '0 3 * * * cd /var/www/kit20 && /usr/bin/node scripts/backup-runtime-content.mjs >> /var/log/kit20-runtime-backup.log 2>&1';
const marker = '# kit20-runtime-backup';

const crontabPath = '/etc/cron.d/kit20-runtime-backup';
const content = `SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
${cronLine} ${marker}
`;

try {
	await writeFile(crontabPath, content, 'utf8');
	console.log(`OK: wrote ${crontabPath}`);
} catch (e) {
	// fallback: append to user crontab hint
	console.warn('Could not write /etc/cron.d (need root). Add manually:');
	console.warn(cronLine);
	process.exit(0);
}
