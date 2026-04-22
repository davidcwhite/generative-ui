import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

// Always load server/.env regardless of process.cwd() (e.g. IDE / monorepo runners).
config({ path: resolve(dir, '..', '.env') });
