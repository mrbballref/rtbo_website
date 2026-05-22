import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
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
    ['canonical production URL', /<link[^>]+rel=["']canonical["'][^>]+https:\/\/rtbofficiating\.com\//i],
    ['meta description', /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{50,}/i],
    ['JSON-LD structured data', /<script\s+type=["']application\/ld\+json["']>/i],
    ['root mount node', /<div\s+id=["']root["']><\/div>/i]
  ].forEach(([label, pattern]) => {
    if (!pattern.test(html)) failures.push(`frontend/index.html is missing ${label}.`);
  });
}

if (!exists('frontend/public/robots.txt')) {
  warnings.push('frontend/public/robots.txt is missing.');
}

if (!exists('frontend/public/sitemap.xml')) {
  warnings.push('frontend/public/sitemap.xml is missing.');
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
