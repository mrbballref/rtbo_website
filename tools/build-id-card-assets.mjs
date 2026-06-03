import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const zipPath = process.argv[2];
const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDir = join(repoRoot, 'frontend/public/assets/id-cards/cards');
const catalogPath = join(repoRoot, 'frontend/src/id-card-catalog.json');

if (!zipPath || !existsSync(zipPath)) {
  console.error('Usage: node tools/build-id-card-assets.mjs /absolute/path/to/id_cards.zip');
  process.exit(1);
}

const categoryLabels = {
  RefZone_University_ID_Cards_Named: 'RefZone University Student IDs',
  RefZone_University_Military_Hologram_ID_Cards_Named_10_Pack: 'RefZone Military Student IDs',
  RTBO_01_LRPD_Driver_License_Style_ID_Cards: 'Driver License Style IDs',
  RTBO_02_Veteran_Landscape_Military_ID_Cards: 'Veteran Landscape Military IDs',
  RTBO_03_Marine_Corps_Veteran_ID_Cards: 'Marine Corps Veteran IDs',
  RTBO_04_Army_and_General_Military_Veteran_ID_Cards: 'Army & General Military IDs',
  RTBO_05_Navy_Veteran_ID_Cards: 'Navy Veteran IDs',
  RTBO_06_Air_Force_Veteran_ID_Cards: 'Air Force Veteran IDs',
  RTBO_07_Coast_Guard_Veteran_ID_Cards: 'Coast Guard Veteran IDs',
  RTBO_08_General_Sports_Officiating_ID_Cards: 'General Sports Officiating IDs',
};

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'item';
}

function titleFromFile(file) {
  return basename(file, '.png')
    .replace(/^\d+_/, '')
    .replace(/_/g, ' ')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bId\b/g, 'ID')
    .replace(/\bRtbo\b/g, 'RTBO')
    .replace(/\bLrpd\b/g, 'LRPD')
    .replace(/\bUs\b/g, 'US')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardGroupTitle(file) {
  return titleFromFile(file)
    .replace(/\s+Front\s+and\s+Back$/i, '')
    .replace(/\s+Front$/i, '')
    .replace(/\s+Back$/i, '')
    .trim();
}

function sideForFile(file) {
  const title = titleFromFile(file);
  if (/\bBack$/i.test(title)) return 'back';
  return 'front';
}

function parseSipsDimensions(path) {
  const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], { encoding: 'utf8' });
  const width = Number((output.match(/pixelWidth:\s*(\d+)/) || [])[1] || 0);
  const height = Number((output.match(/pixelHeight:\s*(\d+)/) || [])[1] || 0);
  return { width, height };
}

function convertHalfSize(zipEntry, outputName) {
  const tempSource = join(tmpdir(), `rtbo-id-card-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  const outputPath = join(outputDir, outputName);
  const sourceBuffer = execFileSync('unzip', ['-p', zipPath, zipEntry], { maxBuffer: 60 * 1024 * 1024 });
  writeFileSync(tempSource, sourceBuffer);
  const original = parseSipsDimensions(tempSource);
  const width = Math.max(1, Math.round(original.width / 2));
  const height = Math.max(1, Math.round(original.height / 2));
  execFileSync('sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', '82',
    '-z', String(height), String(width),
    tempSource,
    '--out', outputPath,
  ], { stdio: 'ignore' });
  rmSync(tempSource, { force: true });
  return {
    path: `/assets/id-cards/cards/${outputName}`,
    originalWidth: original.width,
    originalHeight: original.height,
    width,
    height,
  };
}

const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .filter(file => file.toLowerCase().endsWith('.png'))
  .filter(file => !file.startsWith('__MACOSX/'))
  .filter(file => !file.includes('/Assets/'))
  .filter(file => !file.includes('/Reference_Assets/'))
  .filter(file => !file.includes('RTBO_09_Reference_Collage_and_Mockup_ID_Sheets'))
  .filter(file => !/qr[_\s-]*code|logo[_\s-]*source/i.test(file));

mkdirSync(outputDir, { recursive: true });

const grouped = new Map();
for (const entry of entries) {
  const parts = entry.split('/');
  const categoryRoot = parts[0];
  const categoryLabel = categoryLabels[categoryRoot] || categoryRoot.replace(/_/g, ' ');
  const categoryId = slug(categoryLabel);
  const title = cardGroupTitle(entry);
  const key = `${categoryId}:${parts.slice(0, -1).join('/')}:${slug(title)}`;
  const side = sideForFile(entry);
  const group = grouped.get(key) || {
    categoryId,
    categoryLabel,
    title,
    sourceFiles: [],
    frontSource: '',
    backSource: '',
  };
  group.sourceFiles.push(entry);
  if (side === 'back') {
    group.backSource = entry;
  } else {
    group.frontSource = entry;
  }
  grouped.set(key, group);
}

const cards = [];
const idCounts = new Map();
for (const group of [...grouped.values()].sort((a, b) => {
  const categoryCompare = a.categoryLabel.localeCompare(b.categoryLabel);
  return categoryCompare || a.title.localeCompare(b.title);
})) {
  const baseSlug = slug(`${group.categoryLabel}-${group.title}`);
  const nextCount = (idCounts.get(baseSlug) || 0) + 1;
  idCounts.set(baseSlug, nextCount);
  const id = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`;
  const frontSource = group.frontSource || group.backSource;
  const front = convertHalfSize(frontSource, `${id}-front.jpg`);
  const back = group.backSource && group.backSource !== frontSource
    ? convertHalfSize(group.backSource, `${id}-back.jpg`)
    : null;

  cards.push({
    id,
    categoryId: group.categoryId,
    categoryLabel: group.categoryLabel,
    title: group.title,
    image: front.path,
    backImage: back?.path || '',
    originalWidth: front.originalWidth,
    originalHeight: front.originalHeight,
    width: front.width,
    height: front.height,
    sourceFiles: group.sourceFiles.sort(),
  });
}

const categories = Object.values(cards.reduce((acc, card) => {
  acc[card.categoryId] ??= {
    id: card.categoryId,
    label: card.categoryLabel,
    count: 0,
  };
  acc[card.categoryId].count += 1;
  return acc;
}, {}));

writeFileSync(catalogPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: basename(zipPath),
  totalCards: cards.length,
  categories,
  cards,
}, null, 2));

console.log(`Generated ${cards.length} ID card designs from ${relative(process.cwd(), zipPath)}.`);
console.log(`Images: ${relative(process.cwd(), outputDir)}`);
console.log(`Catalog: ${relative(process.cwd(), catalogPath)}`);
