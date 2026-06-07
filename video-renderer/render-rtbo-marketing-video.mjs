import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'frontend/public');
const entryPoint = path.join(__dirname, 'src/index.jsx');
const outputLocation = path.join(publicRoot, 'assets/videos/rtbo-marketing-video.mp4');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function main() {
  ensureDir(outputLocation);

  const serveUrl = await bundle({
    entryPoint,
    publicDir: publicRoot
  });
  const inputProps = {};
  const composition = await selectComposition({
    serveUrl,
    id: 'RTBOMarketingVideo',
    inputProps
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    audioCodec: 'aac',
    outputLocation,
    inputProps,
    videoBitrate: '4500k',
    audioBitrate: '192k',
    overwrite: true,
    onProgress: ({ progress }) => {
      process.stdout.write(`\rRTBO marketing video: ${Math.round(progress * 100)}%`);
    }
  });

  process.stdout.write('\n');
  console.log(`Rendered ${outputLocation}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
