import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const requiredBreakpoints = [368, 480, 550, 648, 768, 1024, 1280, 1536];
const failures = [];
const warnings = [];

function readText(relativePath) {
  const filePath = path.join(frontendRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertCheck(condition, message) {
  if (!condition) failures.push(message);
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const sourceHtml = readText('index.html');
const distHtml = readText('dist/index.html');
const styles = readText('src/styles.css');
const sourceCssFiles = walkFiles(path.join(frontendRoot, 'src')).filter(filePath => filePath.endsWith('.css'));

requiredBreakpoints.forEach(width => {
  const pattern = new RegExp(`@media\\s*[^{}]*\\(\\s*max-width\\s*:\\s*${width}px\\s*\\)`, 'i');
  assertCheck(pattern.test(styles), `Missing mandatory responsive breakpoint: ${width}px`);
});

const themeLockRules = [
  ['fixed #333 text with !important', /(?:^|[;\s])(?:color|-webkit-text-fill-color)\s*:\s*#333\s*!important/i],
  ['fixed white background with !important', /(?:^|[;\s])background(?:-color)?\s*:\s*#fff\s*!important/i]
];

sourceCssFiles.forEach(filePath => {
  const css = fs.readFileSync(filePath, 'utf8');
  const relativeName = path.relative(frontendRoot, filePath);
  for (const block of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    const selector = block[1].trim();
    const body = block[2];
    if (!/\.rtbo-|body\.rtbo-/.test(selector)) continue;
    if (/data-theme|option|@page|rtbo-printing|print-zone|autofill/i.test(selector)) continue;

    themeLockRules.forEach(([label, pattern]) => {
      if (pattern.test(body)) {
        const line = css.slice(0, block.index).split(/\r?\n/).length;
        failures.push(`${relativeName}:${line} locks RTBO UI away from the light/dark toggler (${label}). Use theme variables or scoped data-theme rules.`);
      }
    });
  }
});

assertCheck(
  /<meta\s+name=["']viewport["'][^>]+width=device-width[^>]+initial-scale=1\.0/i.test(sourceHtml),
  'Source HTML is missing the required responsive viewport meta tag.'
);

[
  ['meta description', /<meta\s+name=["']description["'][^>]+content=["'][^"']{50,}["']/i],
  ['robots directive', /<meta\s+name=["']robots["'][^>]+index,\s*follow/i],
  ['canonical URL', /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/rtbofficiating\.com\/["']/i],
  ['Open Graph title', /<meta\s+property=["']og:title["'][^>]+content=/i],
  ['Open Graph description', /<meta\s+property=["']og:description["'][^>]+content=/i],
  ['Twitter card', /<meta\s+name=["']twitter:card["'][^>]+summary_large_image/i],
  ['structured data', /<script\s+type=["']application\/ld\+json["']>/i]
].forEach(([label, pattern]) => {
  assertCheck(pattern.test(distHtml), `Built HTML is missing required SEO metadata: ${label}`);
});

const jsonLdMatches = [...distHtml.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
assertCheck(jsonLdMatches.length > 0, 'Built HTML is missing JSON-LD structured data.');
jsonLdMatches.forEach((match, index) => {
  try {
    JSON.parse(match[1]);
  } catch (error) {
    failures.push(`JSON-LD block ${index + 1} is not valid JSON: ${error.message}`);
  }
});

const assetRoot = path.join(frontendRoot, 'dist', 'assets');
const assetFiles = walkFiles(assetRoot);
assertCheck(assetFiles.length > 0, 'No built assets found. Run npm run build before npm run audit.');

const budgets = {
  '.js': 420 * 1024,
  '.css': 320 * 1024
};

let totalAssetBytes = 0;
let bundleAssetBytes = 0;
assetFiles.forEach(filePath => {
  const ext = path.extname(filePath).toLowerCase();
  const size = fs.statSync(filePath).size;
  totalAssetBytes += size;
  const budget = budgets[ext];
  const relativeName = path.relative(frontendRoot, filePath);

  if (ext === '.js' || ext === '.css') {
    bundleAssetBytes += size;
  }

  if (budget && size > budget) {
    failures.push(`${relativeName} is ${formatKb(size)}, over the ${formatKb(budget)} optimization budget.`);
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && size > 1536 * 1024) {
    warnings.push(`${relativeName} is ${formatKb(size)}, over the image optimization target. Optimize before launch when this asset is in active use.`);
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && size > 1024 * 1024) {
    warnings.push(`${relativeName} is ${formatKb(size)}. Keep watching image weight before launch.`);
  }
});

const bundleBudget = 1536 * 1024;
assertCheck(
  bundleAssetBytes <= bundleBudget,
  `JS/CSS bundle assets total ${formatKb(bundleAssetBytes)}, over the ${formatKb(bundleBudget)} optimization budget.`
);

console.log('RTBO mandatory audit');
console.log(`Responsive breakpoints checked: ${requiredBreakpoints.map(width => `${width}px`).join(', ')}`);
console.log(`Theme toggler compliance checked: ${sourceCssFiles.length} source CSS files`);
console.log(`Built assets checked: ${assetFiles.length} files, ${formatKb(totalAssetBytes)} total`);
console.log(`JS/CSS bundle budget checked: ${formatKb(bundleAssetBytes)} / ${formatKb(bundleBudget)}`);

if (warnings.length) {
  console.warn('\nWarnings:');
  warnings.forEach(warning => console.warn(`- ${warning}`));
}

if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Mandatory responsive, theme, SEO, and optimization audit passed.');
