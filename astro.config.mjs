// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://kit20.ru',
	output: 'server',
	// За nginx без этого SSR-запрос имеет origin localhost — редиректы уходили на 127.0.0.1.
	security: {
		allowedDomains: [
			{ hostname: 'kit20.ru', protocol: 'https' },
			{ hostname: 'www.kit20.ru', protocol: 'https' },
		],
	},
	adapter: node({ mode: 'standalone' }),
	vite: {
		plugins: [tailwindcss()],
	},
});
