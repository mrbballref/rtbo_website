import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
const requiredBreakpoints = [368, 480, 550, 648, 768, 1024, 1280, 1536];
const requiredProductionViewportWidths = [320, 480, 768, 1024, 1200, 1536, 1920];
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

function findGoldHoverRules(css, relativeName) {
  const goldPattern = /var\(--rtbo-gold|--rtbo-gold-hover|#d4af37|#f3d675|rgba?\(\s*212\s*,\s*175\s*,\s*55/i;
  const filledPropertyPattern = /(?:background(?:-color|-image)?|box-shadow|text-shadow)\s*:[^;}]*?(?:var\(--rtbo-gold|--rtbo-gold-hover|#d4af37|#f3d675|rgba?\(\s*212\s*,\s*175\s*,\s*55)/i;
  const hoverRulePattern = /[^{}]*(?::hover|:focus-visible|:focus-within)[^{]*\{[^{}]*\}/gi;
  const matches = [];
  let match;
  while ((match = hoverRulePattern.exec(css)) !== null) {
    if (goldPattern.test(match[0]) && filledPropertyPattern.test(match[0])) {
      const line = css.slice(0, match.index).split(/\r?\n/).length;
      matches.push(`${relativeName}:${line}`);
    }
  }
  return matches;
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

if (exists('frontend/src/styles.css')) {
  const globalStyles = read('frontend/src/styles.css');
  requiredProductionViewportWidths.forEach(width => {
    if (!hasRequiredBreakpoint(globalStyles, width)) {
      failures.push(`frontend/src/styles.css is missing mandatory production viewport coverage for ${width}px.`);
    }
  });

  [
    ['guest card single-row summary layout', /guest-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/],
    ['about card single-row summary layout', /about-rtbo-section\s+\.about-icon-grid[\s\S]*grid-template-columns\s*:\s*1fr\s*!important/],
    ['services card single-row summary layout', /services-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr[\s\S]*services-unified-platform-cards\s*\{[\s\S]*grid-template-columns\s*:\s*1fr[\s\S]*services-features-section\s+\.solution-grid\s*\{[\s\S]*grid-template-columns\s*:\s*1fr\s*!important/],
    ['public feature card single-row summary layout', /trainer-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr[\s\S]*results-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr[\s\S]*platform-feature-grid\s*\{[\s\S]*grid-template-columns\s*:\s*1fr[\s\S]*about-difference-grid\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/],
    ['testimonial card grid', /testimonial-grid\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*300px\),\s*1fr\)\)/],
    ['livestream channel card grid', /livestream-channel-grid\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\)/],
    ['guest top section tablet collapse', /@media\s*\(max-width:\s*1180px\)[\s\S]*guest-top-section[\s\S]*grid-template-columns\s*:\s*1fr/],
    ['mobile header single-column drawer', /@media\s*\(max-width:\s*1280px\)[\s\S]*site-header\.rtbo-header\s+\.nav-link-group,\s*\n\s*\.site-header\.rtbo-header\s+\.nav-action-group\s*\{[\s\S]*display\s*:\s*flex\s*!important[\s\S]*flex-direction\s*:\s*column\s*!important[\s\S]*grid-template-columns\s*:\s*1fr\s*!important/],
    ['mobile menu overlay closes without button hover fills', /site-header\.rtbo-header\s+\.nav-flyout-scrim,[\s\S]*nav-flyout-scrim:is\(:hover,\s*:focus,\s*:focus-visible,\s*:active\)[\s\S]*background\s*:\s*rgba\(0,\s*0,\s*0,\s*\.58\)\s*!important[\s\S]*background-image\s*:\s*none\s*!important[\s\S]*pointer-events\s*:\s*none/],
    ['button hover gold outline without filled panel', /Mandatory interaction standard[\s\S]*button:not\(:disabled\):not\(\.theme-toggle\)[\s\S]*outline\s*:\s*2px solid rgba\(212,\s*175,\s*55,\s*\.86\)\s*!important[\s\S]*background\s*:\s*transparent\s*!important[\s\S]*background-image\s*:\s*none\s*!important/],
    ['theme switcher hover transparent with outline only', /\.theme-toggle,[\s\S]*theme-toggle:is\(:hover,\s*:focus,\s*:focus-visible,\s*:active\)[\s\S]*background\s*:\s*transparent\s*!important[\s\S]*background-image\s*:\s*none\s*!important[\s\S]*theme-toggle-track:is\(:hover,\s*:focus-visible\)[\s\S]*outline\s*:\s*2px solid rgba\(212,\s*175,\s*55,\s*\.72\)\s*!important/]
  ].forEach(([label, pattern]) => {
    if (!pattern.test(globalStyles)) {
      failures.push(`frontend/src/styles.css is missing mandatory responsive production rule: ${label}.`);
    }
  });
}

if (exists('frontend/src/main.jsx')) {
  const mainSource = read('frontend/src/main.jsx');
  if (!/className=\{`nav-flyout-scrim[\s\S]*onPointerDown=\{\(event\)[\s\S]*closeMobileNav\(\)/.test(mainSource)) {
    failures.push('frontend/src/main.jsx is missing the mandatory mobile menu overlay pointer dismissal handler.');
  }
}

[
  ...walkFiles(path.join(repoRoot, 'frontend', 'public', 'assets', 'css'))
    .filter(filePath => filePath.endsWith('.css')),
  path.join(repoRoot, 'frontend', 'public', 'assets', 'video-player', 'rtb-ipad-player.css'),
  ...walkFiles(path.join(repoRoot, 'frontend', 'src')).filter(filePath => filePath.endsWith('.css'))
]
  .filter(filePath => fs.existsSync(filePath))
  .forEach(filePath => {
    const relativeName = path.relative(repoRoot, filePath);
    const goldHoverRules = findGoldHoverRules(fs.readFileSync(filePath, 'utf8'), relativeName);
    if (goldHoverRules.length) {
      failures.push(`Gold hover fills are not allowed site-wide. Gold is allowed only as an outline/border on hover. Remove filled hover/focus styling from: ${goldHoverRules.join(', ')}`);
    }
  });

if (exists('frontend/public/assets/video-player/rtb-ipad-player.css')) {
  const ipadCss = read('frontend/public/assets/video-player/rtb-ipad-player.css');
  if (!/body\s+\.rtb-ipad-player[\s\S]*rtb-control-btn[\s\S]*outline\s*:\s*2px solid rgba\(212,\s*175,\s*55,\s*\.86\)\s*!important[\s\S]*background\s*:\s*transparent\s*!important[\s\S]*background-image\s*:\s*none\s*!important/.test(ipadCss)) {
    failures.push('frontend/public/assets/video-player/rtb-ipad-player.css is missing the mandatory gold-outline-only hover rule for iPad player buttons.');
  }
}

if (!exists('tools/verify-github-remote.mjs')) {
  failures.push('Missing mandatory GitHub remote verification script: tools/verify-github-remote.mjs.');
} else {
  const githubRemoteGuard = read('tools/verify-github-remote.mjs');
  if (!/mrbballref\/rtbo_website/.test(githubRemoteGuard) || !/remote', 'get-url', '--push', 'origin'/.test(githubRemoteGuard)) {
    failures.push('GitHub remote verification must block pushes unless origin fetch and push URLs target mrbballref/rtbo_website.');
  }
}

if (!exists('.githooks/pre-push')) {
  failures.push('Missing mandatory pre-push hook for GitHub remote verification.');
} else {
  const prePushHook = read('.githooks/pre-push');
  if (!/npm run verify:github-remote/.test(prePushHook)) {
    failures.push('The pre-push hook must run npm run verify:github-remote before every push.');
  }
}

if (exists('package.json')) {
  const rootPackage = read('package.json');
  if (!/"verify:github-remote"\s*:\s*"node tools\/verify-github-remote\.mjs"/.test(rootPackage)) {
    failures.push('package.json must expose npm run verify:github-remote for mandatory push verification.');
  }
}

if (exists('frontend/src/shop-store.css')) {
  const shopStyles = read('frontend/src/shop-store.css');
  [
    ['shop product fluid grid', /rtbo-shop-products\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*230px\),\s*1fr\)\)/],
    ['shop tablet layout collapse', /@media\s*\(max-width:\s*1180px\)[\s\S]*rtbo-shop-layout[\s\S]*grid-template-columns\s*:\s*1fr/],
    ['shop category fluid grid', /rtbo-shop-category-list[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*150px\),\s*1fr\)\)/]
  ].forEach(([label, pattern]) => {
    if (!pattern.test(shopStyles)) {
      failures.push(`frontend/src/shop-store.css is missing mandatory responsive production rule: ${label}.`);
    }
  });
}

if (exists('frontend/src/RTBOResumePage.jsx') && exists('frontend/src/rtbo-resume-page.css')) {
  const resumeSource = read('frontend/src/RTBOResumePage.jsx');
  const resumeStyles = read('frontend/src/rtbo-resume-page.css');
  [
    ['resume event click state', /selectedResumeEvent/.test(resumeSource) && /onClick=\{\(\)\s*=>\s*openResumeEventModal/.test(resumeSource)],
    ['resume event keyboard preview state', /handleResumeEventKeyDown/.test(resumeSource) && /Escape/.test(resumeSource)],
    ['resume event modal markup', /rtob-resume-event-modal/.test(resumeSource)],
    ['resume event modal overlay close', /rtob-resume-event-modal-backdrop[\s\S]*onClick=\{\(\)\s*=>\s*setSelectedResumeEvent\(null\)\}/.test(resumeSource)],
    ['resume event hover preview removed', !/onMouse(?:Enter|Over|Move)=/.test(resumeSource) && !/\.rtob-resume-event-card(?::|[^{]*):hover/.test(resumeStyles)],
    ['resume event modal CSS', /\.rtob-resume-event-modal[\s\S]*position\s*:\s*fixed/.test(resumeStyles)],
    ['resume event preview card responsive sizing', /\.rtob-resume-event-preview-card[\s\S]*width\s*:\s*min\(760px,\s*calc\(100vw - 40px\)\)/.test(resumeStyles)]
  ].forEach(([label, passed]) => {
    if (!passed) {
      failures.push(`Resume page production click modal is missing mandatory support: ${label}.`);
    }
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
