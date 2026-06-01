import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const requiredBreakpoints = [368, 480, 550, 648, 768, 1024, 1280, 1536];
const requiredProductionViewportWidths = [320, 480, 768, 1024, 1200, 1536, 1920];
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
const shopStoreCss = readText('src/shop-store.css');
const refRoomSource = readText('src/RefRoom.jsx');
const refRoomApiSource = readText('../api/refroom.php');
const databaseSetupSource = readText('../api/includes/database-setup.php');
const lockerRoomCss = readText('src/locker-room.css');
const ipadVideoPlayerCss = readText('public/assets/video-player/rtb-ipad-player.css');
const rtboResumeSource = readText('src/RTBOResumePage.jsx');
const rtboResumeCss = readText('src/rtbo-resume-page.css');
const sourceCssFiles = walkFiles(path.join(frontendRoot, 'src')).filter(filePath => filePath.endsWith('.css'));
const sourceComponentFiles = walkFiles(path.join(frontendRoot, 'src')).filter(filePath => /\.(?:js|jsx)$/i.test(filePath));
const cssPaletteCorpus = [publicAppCss, styles, ...sourceCssFiles.map(filePath => fs.readFileSync(filePath, 'utf8'))].join('\n');
const carbonFiberDeclaration = publicAppCss.match(/--rtbo-carbon-fiber\s*:[\s\S]*?--rtbo-carbon-fiber-size/)?.[0] ?? '';

const taxCenterSource = readText('src/TaxCenter.jsx');
const taxCenterCss = readText('src/tax-center.css');
const contractGeneratorCss = readText('src/contract-generator.css');

[
  ['public/assets/css/app.css', publicAppCss],
  ['public/assets/video-player/rtb-ipad-player.css', ipadVideoPlayerCss],
  ...walkFiles(path.join(frontendRoot, 'public', 'assets', 'css'))
    .filter(filePath => filePath.endsWith('.css'))
    .map(filePath => [path.relative(frontendRoot, filePath), fs.readFileSync(filePath, 'utf8')]),
  ...sourceCssFiles.map(filePath => [path.relative(frontendRoot, filePath), fs.readFileSync(filePath, 'utf8')])
].forEach(([relativeName, css]) => {
  const goldHoverRules = findGoldHoverRules(css, relativeName);
  if (goldHoverRules.length) {
    failures.push(`Gold hover fills are not allowed site-wide. Gold is allowed only as an outline/border on hover. Remove filled hover/focus styling from: ${goldHoverRules.join(', ')}`);
  }
});

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

function jsxOpeningTags(source, tagName) {
  const tags = [];
  const matcher = new RegExp(`<${tagName}\\b`, 'gi');
  let match;
  while ((match = matcher.exec(source)) !== null) {
    let quote = '';
    let braceDepth = 0;
    let index = matcher.lastIndex;
    while (index < source.length) {
      const char = source[index];
      if (quote) {
        if (char === '\\') {
          index += 2;
          continue;
        }
        if (char === quote) quote = '';
        index += 1;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        index += 1;
        continue;
      }
      if (char === '{') {
        braceDepth += 1;
        index += 1;
        continue;
      }
      if (char === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        index += 1;
        continue;
      }
      if (char === '>' && braceDepth === 0) {
        tags.push({ index: match.index, tag: source.slice(match.index, index + 1) });
        matcher.lastIndex = index + 1;
        break;
      }
      index += 1;
    }
  }
  return tags;
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function hasLiteralType(tag, type) {
  return new RegExp(`\\btype\\s*=\\s*(?:"${type}"|'${type}'|\\{\\s*(?:"${type}"|'${type}')\\s*\\})`, 'i').test(tag);
}

function isActionableButton(tag) {
  return /\bonClick\s*=/.test(tag)
    || /\bonPointer(?:Down|Up)\s*=/.test(tag)
    || /\bonMouse(?:Down|Up)\s*=/.test(tag)
    || /\bformAction\s*=/.test(tag)
    || hasLiteralType(tag, 'submit')
    || hasLiteralType(tag, 'reset');
}

assertCheck(
  /--rtbo-carbon-bg\s*:\s*#050505/i.test(publicAppCss)
    && /--rtbo-carbon-fiber\s*:/.test(publicAppCss)
    && /background-image\s*:\s*var\(--rtbo-carbon-fiber\)/.test(publicAppCss)
    && /:root\[data-theme="dark"\][\s\S]*background-image\s*:\s*var\(--rtbo-carbon-fiber\)/.test(styles)
    && /:root\[data-theme="light"\][\s\S]*background-image\s*:\s*none/.test(styles),
  'Dark mode must use the shared carbon-fiber background and light mode must remove carbon-fiber backgrounds.'
);

[
  [
    'mandatory site-wide visual polish guardrail block',
    styles.includes('Mandatory site-wide visual polish audit guardrails.')
  ],
  [
    'desktop horizontal overflow protection for public pages',
    /\.rtbo-public\s*\{[\s\S]*overflow-x\s*:\s*clip\s*!important/.test(styles)
  ],
  [
    'home hero carousel paint containment',
    /\.rtbo-public\s+\.hero-carousel\s*\{[\s\S]*contain\s*:\s*paint/.test(styles)
  ],
  [
    'balanced public heading typography',
    /\.rtbo-public\s+:is\(h1,\s*h2,\s*h3\)\s*\{[\s\S]*text-wrap\s*:\s*balance[\s\S]*white-space\s*:\s*normal\s*!important/.test(styles)
  ],
  [
    'site-wide label to field spacing',
    styles.includes('label:has(> :is(input:not([type="checkbox"]):not([type="radio"]), select, textarea))')
  ],
  [
    'site-wide polished file upload controls',
    /input\[type="file"\]::file-selector-button\s*\{[\s\S]*background\s*:\s*linear-gradient/.test(styles)
  ],
  [
    'summary card visual standard',
    /\.rtbo-summary-card[\s\S]*border-radius\s*:\s*8px/.test(styles)
  ],
  [
    'home About RTBO cards render as responsive single-row summary cards',
    /about-rtbo-section\s+\.about-icon-grid[\s\S]*grid-template-columns\s*:\s*1fr\s*!important/.test(styles)
  ],
  [
    'home About RTBO layout collapses before tablet widths',
    /@media\s*\(max-width:\s*1180px\)[\s\S]*about-rtbo-layout[\s\S]*grid-template-columns\s*:\s*1fr\s*!important/.test(styles)
  ],
  [
    'Services page cards render as responsive single-row summary cards',
    /services-unified-platform-cards\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
      && /services-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
      && /services-features-section\s+\.solution-grid\s*\{[\s\S]*grid-template-columns\s*:\s*1fr\s*!important/.test(styles)
      && /@media\s*\(max-width:\s*1180px\)[\s\S]*services-unified-overview[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
  ],
  [
    'home guest, testimonial, and livestream card grids stay responsive',
    /guest-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
      && /testimonial-grid\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*300px\),\s*1fr\)\)/.test(styles)
      && /livestream-channel-grid\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\)/.test(styles)
      && /@media\s*\(max-width:\s*1180px\)[\s\S]*guest-top-section[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
  ],
  [
    'public feature cards use mandatory one-card-per-row layout',
    /trainer-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
      && /results-top-points\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
      && /about-difference-grid\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
      && /platform-feature-grid\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/.test(styles)
  ],
  [
    'shop product grid and sidebar use production responsive rules',
    /rtbo-shop-products\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*230px\),\s*1fr\)\)/.test(shopStoreCss)
      && /@media\s*\(max-width:\s*1180px\)[\s\S]*rtbo-shop-layout[\s\S]*grid-template-columns\s*:\s*1fr/.test(shopStoreCss)
      && /rtbo-shop-category-list[\s\S]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*150px\),\s*1fr\)\)/.test(shopStoreCss)
  ],
  [
    'mobile header drawer uses single-column responsive navigation',
    /@media\s*\(max-width:\s*1280px\)[\s\S]*site-header\.rtbo-header\s+\.nav-link-group,\s*\n\s*\.site-header\.rtbo-header\s+\.nav-action-group\s*\{[\s\S]*display\s*:\s*flex\s*!important[\s\S]*flex-direction\s*:\s*column\s*!important[\s\S]*grid-template-columns\s*:\s*1fr\s*!important/.test(styles)
      && /site-header\.rtbo-header\s+\.nav-action-group\s+\.theme-toggle[\s\S]*align-self\s*:\s*flex-start\s*!important/.test(styles)
  ],
  [
    'mobile menu overlay closes the drawer and never receives button hover fills',
    /className=\{`nav-flyout-scrim[\s\S]*onPointerDown=\{\(event\)[\s\S]*closeMobileNav\(\)/.test(mainSource)
      && /site-header\.rtbo-header\s+\.nav-flyout-scrim,[\s\S]*nav-flyout-scrim:is\(:hover,\s*:focus,\s*:focus-visible,\s*:active\)[\s\S]*background\s*:\s*rgba\(0,\s*0,\s*0,\s*\.58\)\s*!important[\s\S]*background-image\s*:\s*none\s*!important[\s\S]*pointer-events\s*:\s*none/.test(styles)
      && /site-header\.rtbo-header\.nav-open\s+\.nav-flyout-scrim,[\s\S]*nav-flyout-scrim\.is-open[\s\S]*pointer-events\s*:\s*auto\s*!important/.test(styles)
  ],
  [
    'button hover uses gold outline without filled hover backgrounds',
    /Mandatory interaction standard[\s\S]*button:not\(:disabled\):not\(\.theme-toggle\)[\s\S]*outline\s*:\s*2px solid rgba\(212,\s*175,\s*55,\s*\.86\)\s*!important[\s\S]*background\s*:\s*transparent\s*!important[\s\S]*background-image\s*:\s*none\s*!important/.test(styles)
  ],
  [
    'theme switcher hover has no red or gold background fill',
    /\.theme-toggle,[\s\S]*theme-toggle:is\(:hover,\s*:focus,\s*:focus-visible,\s*:active\)[\s\S]*background\s*:\s*transparent\s*!important[\s\S]*background-image\s*:\s*none\s*!important[\s\S]*theme-toggle-track:is\(:hover,\s*:focus-visible\)[\s\S]*outline\s*:\s*2px solid rgba\(212,\s*175,\s*55,\s*\.72\)\s*!important/.test(styles)
  ],
  [
    'iPad video player hover guard excludes site-wide gold backgrounds',
    /body\s+\.rtb-ipad-player[\s\S]*rtb-control-btn[\s\S]*outline\s*:\s*2px solid rgba\(212,\s*175,\s*55,\s*\.86\)\s*!important[\s\S]*background\s*:\s*transparent\s*!important[\s\S]*background-image\s*:\s*none\s*!important/.test(ipadVideoPlayerCss)
  ],
  [
    'Locker Room iPad film library is inside the player and can be minimized',
    /locker-room-ipad-library[\s\S]*is-minimized/.test(lockerRoomCss)
      && /overlayContent=\{\([\s\S]*locker-room-ipad-library/.test(readText('src/LockerRoomPage.jsx'))
  ],
  [
    'RefRoom public meeting creation never falls back to browser-only state',
    /refroomApiPost\('\/refroom\.php',\s*\{\s*action:\s*'create_public'/.test(refRoomSource)
      && !/catch\s*\{[\s\S]*RefRoom meeting created\. Copy or email the invite link/.test(refRoomSource)
  ],
  [
    'RefRoom Create Room saves breakout rooms through the API and database',
    /action:\s*'create_breakout_room'/.test(refRoomSource)
      && /create_breakout_room/.test(refRoomApiSource)
      && /refroom_breakout_rooms/.test(refRoomApiSource)
      && /refroom_breakout_rooms/.test(databaseSetupSource)
  ],
  [
    'resume event summary cards open a production click modal',
    /selectedResumeEvent/.test(rtboResumeSource)
      && /role="button"[\s\S]*tabIndex=\{0\}[\s\S]*onClick=\{\(\)\s*=>\s*openResumeEventModal/.test(rtboResumeSource)
      && /handleResumeEventKeyDown/.test(rtboResumeSource)
      && /rtob-resume-event-modal/.test(rtboResumeSource)
      && /rtob-resume-event-modal-backdrop[\s\S]*onClick=\{\(\)\s*=>\s*setSelectedResumeEvent\(null\)\}/.test(rtboResumeSource)
      && !/onMouse(?:Enter|Over|Move)=/.test(rtboResumeSource)
      && !/\.rtob-resume-event-card(?::|[^{]*):hover/.test(rtboResumeCss)
      && /\.rtob-resume-event-modal[\s\S]*position\s*:\s*fixed/.test(rtboResumeCss)
      && /\.rtob-resume-event-preview-card[\s\S]*width\s*:\s*min\(760px,\s*calc\(100vw - 40px\)\)/.test(rtboResumeCss)
  ]
].forEach(([label, passed]) => {
  assertCheck(passed, `Mandatory visual polish audit failed: missing ${label}.`);
});

sourceComponentFiles.forEach(filePath => {
  const source = fs.readFileSync(filePath, 'utf8');
  const relativeName = path.relative(frontendRoot, filePath);
  jsxOpeningTags(source, 'button').forEach(({ index, tag }) => {
    if (/\bdata-audit-static-ok\b/.test(tag)) return;
    if (!isActionableButton(tag)) {
      failures.push(`${relativeName}:${lineNumber(source, index)} has a button without a click handler, form action, submit type, or reset type. Every button must perform a production action or be explicitly audited.`);
    }
  });
  jsxOpeningTags(source, 'a').forEach(({ index, tag }) => {
    if (!/\bclassName\s*=/.test(tag) || !/\bbtn\b/.test(tag)) return;
    if (/\bdata-audit-static-ok\b/.test(tag)) return;
    const hasDestination = /\bhref\s*=\s*(?:"(?!#")[^"]+"|'(?!#')[^']+'|\{[^}]+\})/.test(tag);
    if (!hasDestination && !/\bonClick\s*=/.test(tag)) {
      failures.push(`${relativeName}:${lineNumber(source, index)} has a button-styled link without a destination or click handler.`);
    }
  });
});

const saveInvoiceBody = mainSource.match(/async function saveInvoice\([\s\S]*?\n  async function saveInvoicePdf/)?.[0] || '';
const emailInvoiceBody = mainSource.match(/async function emailInvoice\([\s\S]*?\n  async function deleteInvoice/)?.[0] || '';
const printPreparedInvoiceBody = mainSource.match(/async function printPreparedInvoice\([\s\S]*?\n  function editCurrentInvoice/)?.[0] || '';
assertCheck(
  saveInvoiceBody !== '' && !/requestInvoicePdfSaveTarget/.test(saveInvoiceBody) && /persistInvoiceRecord/.test(saveInvoiceBody),
  'Invoice Save Invoice action must save the invoice record directly and must not be blocked by a local PDF picker.'
);
assertCheck(
  emailInvoiceBody !== '' && !/requestInvoicePdfSaveTarget/.test(emailInvoiceBody) && /action:\s*'email'/.test(emailInvoiceBody),
  'Invoice Email Invoice action must send through the API directly and must not be blocked by a local PDF picker.'
);
assertCheck(
  printPreparedInvoiceBody !== '' && !/requestInvoicePdfSaveTarget|action:\s*'pdf'/.test(printPreparedInvoiceBody) && /window\.print/.test(printPreparedInvoiceBody),
  'Invoice Print Invoice action must open the system print dialog directly from the preview.'
);
assertCheck(
  /invoiceFeeSelection/.test(mainSource) && /Add at least one billable invoice fee/.test(mainSource),
  'Invoice generator must validate that at least one billable fee line exists before save, PDF, email, or print actions.'
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

requiredProductionViewportWidths.forEach(width => {
  assertCheck(
    hasRequiredBreakpoint(styles, width),
    `src/styles.css is missing mandatory production viewport coverage for ${width}px. Every public, dashboard, course, and form section must remain responsive across the full RTBO device range.`
  );
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

function distAssetPathFromUrl(value = '') {
  const clean = String(value || '').split(/[?#]/)[0].replace(/^\/+/, '');
  if (!clean.startsWith('assets/')) return '';
  return path.join(frontendRoot, 'dist', clean);
}

function tagAttribute(tag = '', attribute = '') {
  const match = tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'));
  return match?.[1] || '';
}

const initialAssetPaths = new Set();
for (const match of distHtml.matchAll(/<(script|link)\b[^>]*>/gi)) {
  const tag = match[0];
  const isModuleScript = /^<script/i.test(tag) && /\btype=["']module["']/i.test(tag);
  const isInitialLink = /^<link/i.test(tag) && /\brel=["'](?:modulepreload|stylesheet)["']/i.test(tag);
  if (!isModuleScript && !isInitialLink) continue;

  const url = tagAttribute(tag, isModuleScript ? 'src' : 'href');
  const filePath = distAssetPathFromUrl(url);
  if (filePath) initialAssetPaths.add(filePath);
}

const routeChunkBudgets = {
  '.js': 150 * 1024,
  '.css': 96 * 1024
};
const initialJsBudget = 700 * 1024;
const initialCssBudget = 384 * 1024;
const initialBundleBudget = 1125 * 1024;
const fullBundleReviewTarget = 2048 * 1024;

let totalAssetBytes = 0;
let bundleAssetBytes = 0;
let initialJsBytes = 0;
let initialCssBytes = 0;
assetFiles.forEach(filePath => {
  const ext = path.extname(filePath).toLowerCase();
  const size = fs.statSync(filePath).size;
  totalAssetBytes += size;
  const routeBudget = routeChunkBudgets[ext];
  const relativeName = path.relative(frontendRoot, filePath);
  const isInitialAsset = initialAssetPaths.has(filePath);

  if (ext === '.js' || ext === '.css') {
    bundleAssetBytes += size;
  }

  if (isInitialAsset && ext === '.js') {
    initialJsBytes += size;
  } else if (isInitialAsset && ext === '.css') {
    initialCssBytes += size;
  }

  if (!isInitialAsset && routeBudget && size > routeBudget) {
    failures.push(`${relativeName} is ${formatKb(size)}, over the ${formatKb(routeBudget)} lazy route chunk budget. Split the route or move heavy data/assets out of JavaScript before adding more to this chunk.`);
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && size > 1536 * 1024) {
    warnings.push(`${relativeName} is ${formatKb(size)}, over the image optimization target. Optimize before launch when this asset is in active use.`);
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && size > 1024 * 1024) {
    warnings.push(`${relativeName} is ${formatKb(size)}. Keep watching image weight before launch.`);
  }
});

const initialBundleBytes = initialJsBytes + initialCssBytes;
assertCheck(initialAssetPaths.size > 0, 'Built HTML does not reference any initial script, modulepreload, or stylesheet assets.');
assertCheck(
  initialJsBytes <= initialJsBudget,
  `Initial JavaScript payload is ${formatKb(initialJsBytes)}, over the ${formatKb(initialJsBudget)} production budget.`
);
assertCheck(
  initialCssBytes <= initialCssBudget,
  `Initial CSS payload is ${formatKb(initialCssBytes)}, over the ${formatKb(initialCssBudget)} production budget.`
);
assertCheck(
  initialBundleBytes <= initialBundleBudget,
  `Initial JS/CSS payload is ${formatKb(initialBundleBytes)}, over the ${formatKb(initialBundleBudget)} production budget.`
);

if (bundleAssetBytes > fullBundleReviewTarget) {
  warnings.push(`All JS/CSS route assets total ${formatKb(bundleAssetBytes)}, over the ${formatKb(fullBundleReviewTarget)} full-site review target. This is not initial payload, but new route work should keep trending it down.`);
}

console.log('RTBO mandatory audit');
console.log(`Responsive breakpoints checked: ${requiredBreakpoints.map(width => `${width}px`).join(', ')}`);
console.log(`Production viewport coverage checked: ${requiredProductionViewportWidths.map(width => `${width}px`).join(', ')}`);
console.log(`Theme toggler compliance checked: ${sourceCssFiles.length} source CSS files`);
console.log('Visual polish guardrails checked: horizontal overflow, heading wrapping, field spacing, file inputs, and summary cards');
console.log(`Built assets checked: ${assetFiles.length} files, ${formatKb(totalAssetBytes)} total`);
console.log(`Initial JS budget checked: ${formatKb(initialJsBytes)} / ${formatKb(initialJsBudget)}`);
console.log(`Initial CSS budget checked: ${formatKb(initialCssBytes)} / ${formatKb(initialCssBudget)}`);
console.log(`Initial JS/CSS budget checked: ${formatKb(initialBundleBytes)} / ${formatKb(initialBundleBudget)}`);
console.log(`Full lazy-route JS/CSS review target checked: ${formatKb(bundleAssetBytes)} / ${formatKb(fullBundleReviewTarget)}`);

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
