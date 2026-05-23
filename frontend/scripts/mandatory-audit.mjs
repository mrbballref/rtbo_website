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
const robotsText = readText('public/robots.txt');
const sitemapText = readText('public/sitemap.xml');
const styles = readText('src/styles.css');
const publicAppCss = readText('public/assets/css/app.css');
const mainSource = readText('src/main.jsx');
const shopStoreSource = readText('src/ShopStore.jsx');
const sourceCssFiles = walkFiles(path.join(frontendRoot, 'src')).filter(filePath => filePath.endsWith('.css'));
const cssPaletteCorpus = [publicAppCss, styles, ...sourceCssFiles.map(filePath => fs.readFileSync(filePath, 'utf8'))].join('\n');
const carbonFiberDeclaration = publicAppCss.match(/--rtbo-carbon-fiber\s*:[\s\S]*?--rtbo-carbon-fiber-size/)?.[0] ?? '';

const taxCenterSource = readText('src/TaxCenter.jsx');
const taxCenterCss = readText('src/tax-center.css');
const contractGeneratorCss = readText('src/contract-generator.css');

function hasRequiredBreakpoint(css, width) {
  return new RegExp(`@media\\s*[^{}]*\\(\\s*max-width\\s*:\\s*${width}px\\s*\\)`, 'i').test(css);
}

assertCheck(
  /--rtbo-carbon-bg\s*:\s*#050505/i.test(publicAppCss)
    && /--rtbo-carbon-fiber\s*:/.test(publicAppCss)
    && /background-image\s*:\s*var\(--rtbo-carbon-fiber\)/.test(publicAppCss)
    && /:root\[data-theme="dark"\][\s\S]*background-image\s*:\s*var\(--rtbo-carbon-fiber\)/.test(styles)
    && /:root\[data-theme="light"\][\s\S]*background-image\s*:\s*none/.test(styles),
  'Dark mode must use the shared carbon-fiber background and light mode must remove carbon-fiber backgrounds.'
);

assertCheck(
  /\.rtbo-dashboard-shell\s*\{[\s\S]*background-image\s*:\s*var\(--rtbo-carbon-fiber\)/.test(styles)
    && /\.rtbo-dashboard-topbar,\s*[\s\S]*?\.rtbo-dashboard-status\s*\{[\s\S]*background-image\s*:\s*var\(--rtbo-carbon-fiber\)/.test(styles)
    && /\.rtbo-dashboard-shell :is\([^)]*quick-actions[^)]*\)[\s\S]*background-image\s*:\s*var\(--rtbo-carbon-fiber\)/.test(styles),
  'Dashboard sections must use the shared pure black carbon-fiber background.'
);

assertCheck(
  /OR CONTINUE WITH/.test(mainSource)
    && /Sign in with Passkey/.test(mainSource)
    && /Reset via Phone Number/.test(mainSource)
    && /auth-oauth-start\.php/.test(mainSource)
    && /password-reset-phone\.php/.test(mainSource)
    && fs.existsSync(path.join(frontendRoot, '..', 'api', 'auth-oauth-callback.php')),
  'Auth modals must include provider sign-in, passkey sign-in, and full forgot-password recovery actions.'
);

assertCheck(
  (() => {
    const dashboardOpenBody = mainSource.match(/function\s+readStoredDashboardOpen\s*\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
    return /function\s+routeFromHash\s*\(/.test(mainSource)
      && /function\s+pageFromRoute\s*\(/.test(mainSource)
      && /const\s+page\s*=\s*pageFromRoute\(route\);/.test(mainSource)
      && /function\s+isDashboardRouteHash\s*\(/.test(mainSource)
      && dashboardOpenBody.includes('return isDashboardRouteHash(hash);')
      && !dashboardOpenBody.includes('RTBO_DASHBOARD_OPEN_KEY')
      && !dashboardOpenBody.includes('isSuperAdminUser(storedUser)')
      && /window\.location\.hash\s*=\s*`#dashboard/.test(mainSource)
      && /#dashboard\/\$\{encodeURIComponent\(activeSection\)\}/.test(mainSource)
      && /function\s+readShopRouteProduct\s*\(/.test(shopStoreSource)
      && /function\s+shopProductHash\s*\(/.test(shopStoreSource)
      && /#shop\/product\/\$\{encodeURIComponent\(product\.sku\)\}/.test(shopStoreSource)
      && /useState\(Boolean\(initialRouteProduct\)\)/.test(shopStoreSource);
  })(),
  'Refresh preservation is mandatory: nested URL hashes such as dashboard sections and shop product pages must stay on the same page after reload.'
);

assertCheck(
  /--rtbo-carbon-fiber\s*:[\s\S]*repeating-linear-gradient/i.test(publicAppCss)
    && !/rgba\(\s*(?:249,\s*115,\s*22|194,\s*65,\s*12|154,\s*52,\s*18|124,\s*45,\s*18)/i.test(carbonFiberDeclaration),
  'Shared carbon-fiber background must be pure black/charcoal with no warm orange or brown layers.'
);

assertCheck(
  !/(#(?:11100f|151311|3a332d|1b1815|201d1a|4a4038|3a281d|c9beb4|302b27|241a13|100f0e|f4eee8|fff7ef|fff7ed|ffedd5|fed7aa|fff3e6|fffaf5|fffaf7|faf9f8|fff2d3|ffd8a8|b94b06|9a3412|92400e|7c2d12|431407)|rgba\(\s*(?:255,\s*247,\s*237|255,\s*237,\s*213|254,\s*215,\s*170|255,\s*243,\s*230|255,\s*250,\s*245|255,\s*242,\s*211|255,\s*216,\s*168|185,\s*75,\s*6|154,\s*52,\s*18|146,\s*64,\s*14|124,\s*45,\s*18|67,\s*20,\s*7|27,\s*6,\s*8|52,\s*10,\s*14))/i.test(cssPaletteCorpus),
  'Brown, espresso, and tan background values are not allowed; use carbon black, charcoal, and RTBO orange accents.'
);

[
  ['official W-9 PDF template', 'assets/forms/fw9-2024.pdf'],
  ['official W-9 preview image', 'assets/forms/fw9-2024-page-1.png'],
  ['official W-9 PDF background image', 'assets/forms/fw9-2024-page-1.jpg']
].forEach(([label, relativePath]) => {
  assertCheck(fs.existsSync(path.join(frontendRoot, 'public', relativePath)), `Missing mandatory exact form template asset: ${label} (${relativePath}).`);
});

assertCheck(
  /fw9-2024-page-1\.png/.test(taxCenterSource) && /rtbo-w9-exact-page/.test(taxCenterSource),
  'Tax Center W-9 preview must use the exact official W-9 template image with completed-field overlays.'
);

assertCheck(
  /\.rtbo-w9-preview-shell[\s\S]*overflow\s*:\s*auto[\s\S]*overscroll-behavior\s*:\s*contain/.test(taxCenterCss),
  'Tax Center W-9 preview must scroll inside the preview window only.'
);

assertCheck(
  /\.rtbo-contract-preview[\s\S]*max-height\s*:[\s\S]*overflow\s*:\s*auto[\s\S]*overscroll-behavior\s*:\s*contain/.test(contractGeneratorCss),
  'Contract previews must scroll inside the preview window only.'
);

assertCheck(
  /\.rtbo-invoice-preview[\s\S]*max-height\s*:[\s\S]*overflow\s*:\s*auto[\s\S]*overscroll-behavior\s*:\s*contain/.test(styles),
  'Invoice previews must scroll inside the preview window only.'
);

sourceCssFiles.forEach(filePath => {
  const css = fs.readFileSync(filePath, 'utf8');
  const relativeName = path.relative(frontendRoot, filePath);
  requiredBreakpoints.forEach(width => {
    assertCheck(hasRequiredBreakpoint(css, width), `${relativeName} is missing mandatory responsive breakpoint: ${width}px`);
  });
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
  ['Open Graph URL', /<meta\s+property=["']og:url["'][^>]+content=["']https:\/\/rtbofficiating\.com\/["']/i],
  ['Open Graph title', /<meta\s+property=["']og:title["'][^>]+content=/i],
  ['Open Graph description', /<meta\s+property=["']og:description["'][^>]+content=/i],
  ['Open Graph image', /<meta\s+property=["']og:image["'][^>]+content=["']https:\/\/rtbofficiating\.com\/assets\//i],
  ['Twitter card', /<meta\s+name=["']twitter:card["'][^>]+summary_large_image/i],
  ['Twitter title', /<meta\s+name=["']twitter:title["'][^>]+content=/i],
  ['Twitter description', /<meta\s+name=["']twitter:description["'][^>]+content=/i],
  ['Twitter image', /<meta\s+name=["']twitter:image["'][^>]+content=["']https:\/\/rtbofficiating\.com\/assets\//i],
  ['structured data', /<script\s+type=["']application\/ld\+json["']>/i]
].forEach(([label, pattern]) => {
  assertCheck(pattern.test(sourceHtml), `Source HTML is missing required SEO metadata: ${label}`);
  assertCheck(pattern.test(distHtml), `Built HTML is missing required SEO metadata: ${label}`);
});

assertCheck(/User-agent:\s*\*/i.test(robotsText) && /Allow:\s*\//i.test(robotsText) && /Sitemap:\s*https:\/\/rtbofficiating\.com\/sitemap\.xml/i.test(robotsText), 'robots.txt must allow crawling and point to the production sitemap.');
assertCheck(/<urlset[^>]+sitemaps\.org\/schemas\/sitemap\/0\.9/i.test(sitemapText) && /<loc>https:\/\/rtbofficiating\.com\/<\/loc>/i.test(sitemapText), 'sitemap.xml must use the sitemap protocol and include the production home URL.');

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
const mainAppShellBudget = 400 * 1024;

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

  if (ext === '.js' && path.basename(filePath).startsWith('index-') && size > mainAppShellBudget) {
    failures.push(`${relativeName} is ${formatKb(size)}, over the ${formatKb(mainAppShellBudget)} main app shell budget. Move dashboard-only or feature-heavy code into lazy-loaded modules before adding more to the public shell.`);
  } else if (budget && size > budget) {
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
