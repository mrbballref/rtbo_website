import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicCssPath = path.join(frontendRoot, 'dist', 'assets', 'css', 'app.css');

if (fs.existsSync(publicCssPath)) {
  const css = fs.readFileSync(publicCssPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
  fs.writeFileSync(publicCssPath, `${css}\n`);
}
