/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	readonly ADMIN_PASSWORD: string;
	readonly ADMIN_SESSION_SECRET?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
