/**
 * Запуск собранного SSR (dist/server/entry.mjs) с адресом по умолчанию 0.0.0.0,
 * чтобы сервер был доступен с других устройств в сети и за reverse proxy.
 * Переопределение: переменные окружения HOST и PORT.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

if (!process.env.HOST) process.env.HOST = '0.0.0.0';
if (!process.env.PORT) process.env.PORT = '4321';

await import(pathToFileURL(join(root, 'dist/server/entry.mjs')).href);
