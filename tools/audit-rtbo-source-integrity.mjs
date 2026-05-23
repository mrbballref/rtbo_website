import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
const requiredBreakpoints = [368, 480, 550, 648, 768, 1024, 1280, 1536];
const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function listTrackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], {
      cwd: repoRoot,
      encoding: 'utf8'
    }).split(/\r?\n/).filter(Boolean);
  } catch (error) {
    warnings.push(`Could not read tracked files from git: ${error.message}`);
    return [];
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function hasRequiredBreakpoint(css, width) {
  return new RegExp(`@media\\s*[^{}]*\\(\\s*max-width\\s*:\\s*${width}px\\s*\\)`, 'i').test(css);
}

function assertFile(relativePath) {
  if (!exists(relativePath) || !fs.statSync(path.join(repoRoot, relativePath)).isFile()) {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

function assertDirectory(relativePath) {
  if (!exists(relativePath) || !fs.statSync(path.join(repoRoot, relativePath)).isDirectory()) {
    failures.push(`Missing required directory: ${relativePath}`);
  }
}

[
  'README.md',
  'RTBO_GO_LIVE_GUIDE.md',
  'RTBO_PRODUCTION_ASSESSMENT.md',
  'database.sql',
  'local-router.php',
  'api/.env.example',
  'api/storage/.htaccess',
  'frontend/index.html',
  'frontend/package.json',
  'frontend/package-lock.json',
  'frontend/scripts/mandatory-audit.mjs'
].forEach(assertFile);

[
  'api/includes',
  'docs/screenshots',
  'frontend/public/assets/images',
  'frontend/src'
].forEach(assertDirectory);

const trackedFiles = listTrackedFiles();
const allowedEnvExamples = new Set(['api/.env.example', 'frontend/.env.example']);

trackedFiles.forEach(filePath => {
  if (/(^|\/)\.env($|\.)/.test(filePath) && !allowedEnvExamples.has(filePath)) {
    failures.push(`Tracked environment file is not allowed: ${filePath}`);
  }

  if (filePath.startsWith('frontend/dist/')) {
    failures.push(`Build output must stay untracked: ${filePath}`);
  }

  if (filePath.startsWith('frontend/node_modules/')) {
    failures.push(`Dependencies must stay untracked: ${filePath}`);
  }

  if (filePath.startsWith('api/storage/') && filePath !== 'api/storage/.htaccess') {
    failures.push(`Runtime storage file must stay untracked: ${filePath}`);
  }
});

if (exists('frontend/package.json')) {
  const frontendPackage = JSON.parse(read('frontend/package.json'));
  ['dev', 'build', 'audit', 'preview'].forEach(scriptName => {
    if (!frontendPackage.scripts?.[scriptName]) {
      failures.push(`frontend/package.json is missing the ${scriptName} script.`);
    }
  });
}

if (exists('frontend/index.html')) {
  const html = read('frontend/index.html');
  [
    ['responsive viewport meta tag', /<meta\s+name=["']viewport["'][^>]+width=device-width[^>]+initial-scale=1\.0/i],
    ['canonical production URL', /<link[^>]+rel=["']canonical["'][^>]+https:\/\/rtbofficiating\.com\//i],
    ['meta description', /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{50,}/i],
    ['robots directive', /<meta\s+name=["']robots["'][^>]+index,\s*follow/i],
    ['Open Graph URL', /<meta\s+property=["']og:url["'][^>]+content=["']https:\/\/rtbofficiating\.com\/["']/i],
    ['Open Graph title', /<meta\s+property=["']og:title["'][^>]+content=/i],
    ['Open Graph description', /<meta\s+property=["']og:description["'][^>]+content=/i],
    ['Open Graph image', /<meta\s+property=["']og:image["'][^>]+content=["']https:\/\/rtbofficiating\.com\/assets\//i],
    ['Twitter card', /<meta\s+name=["']twitter:card["'][^>]+summary_large_image/i],
    ['Twitter title', /<meta\s+name=["']twitter:title["'][^>]+content=/i],
    ['Twitter description', /<meta\s+name=["']twitter:description["'][^>]+content=/i],
    ['Twitter image', /<meta\s+name=["']twitter:image["'][^>]+content=["']https:\/\/rtbofficiating\.com\/assets\//i],
    ['JSON-LD structured data', /<script\s+type=["']application\/ld\+json["']>/i],
    ['root mount node', /<div\s+id=["']root["']><\/div>/i]
  ].forEach(([label, pattern]) => {
    if (!pattern.test(html)) failures.push(`frontend/index.html is missing ${label}.`);
  });
}

if (exists('frontend/src/main.jsx')) {
  const mainSource = read('frontend/src/main.jsx');
  const shopStoreSource = exists('frontend/src/ShopStore.jsx') ? read('frontend/src/ShopStore.jsx') : '';
  const dashboardOpenBody = mainSource.match(/function\s+readStoredDashboardOpen\s*\(\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  const refreshRouteRulesPresent = /function\s+routeFromHash\s*\(/.test(mainSource)
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

  if (!refreshRouteRulesPresent) {
    failures.push('Mandatory refresh route rule is missing: nested URL hashes such as dashboard sections and shop product pages must stay on the same page after reload.');
  }
}

if (exists('frontend/src')) {
  walkFiles(path.join(repoRoot, 'frontend/src'))
    .filter(filePath => filePath.endsWith('.css'))
    .forEach(filePath => {
      const css = fs.readFileSync(filePath, 'utf8');
      const relativeName = path.relative(repoRoot, filePath);
      requiredBreakpoints.forEach(width => {
        if (!hasRequiredBreakpoint(css, width)) {
          failures.push(`${relativeName} is missing mandatory responsive breakpoint: ${width}px`);
        }
      });
    });
}

if (!exists('frontend/public/robots.txt')) {
  failures.push('frontend/public/robots.txt is missing.');
} else {
  const robotsText = read('frontend/public/robots.txt');
  if (!/User-agent:\s*\*/i.test(robotsText) || !/Allow:\s*\//i.test(robotsText) || !/Sitemap:\s*https:\/\/rtbofficiating\.com\/sitemap\.xml/i.test(robotsText)) {
    failures.push('frontend/public/robots.txt must allow crawling and point to the production sitemap.');
  }
}

if (!exists('frontend/public/sitemap.xml')) {
  failures.push('frontend/public/sitemap.xml is missing.');
} else {
  const sitemapText = read('frontend/public/sitemap.xml');
  if (!/<urlset[^>]+sitemaps\.org\/schemas\/sitemap\/0\.9/i.test(sitemapText) || !/<loc>https:\/\/rtbofficiating\.com\/<\/loc>/i.test(sitemapText)) {
    failures.push('frontend/public/sitemap.xml must use the sitemap protocol and include the production home URL.');
  }
}

console.log('RTBO source integrity audit');
console.log(`Tracked files checked: ${trackedFiles.length}`);

if (warnings.length) {
  console.warn('\nWarnings:');
  warnings.forEach(warning => console.warn(`- ${warning}`));
}

if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Source integrity audit passed.');
