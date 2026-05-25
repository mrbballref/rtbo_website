import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'frontend/public');
const jobsPath = path.join(publicRoot, 'refzone-course-video-jobs.json');
const entryPoint = path.join(__dirname, 'src/index.jsx');

function argValue(name, fallback = '') {
  const exact = process.argv.find(item => item.startsWith(`--${name}=`));
  if (exact) return exact.split('=').slice(1).join('=');
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] || fallback) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function toPublicFile(publicPath = '') {
  return path.join(publicRoot, String(publicPath).replace(/^\//, ''));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function secondsFromAlignment(alignment, fallback) {
  const ends = alignment?.character_end_times_seconds || [];
  const last = Number(ends[ends.length - 1]);
  return Number.isFinite(last) && last > 0 ? Math.ceil(last + 1) : fallback;
}

function formatTime(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = String(totalMs % 1000).padStart(3, '0');
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = String(totalSeconds % 60).padStart(2, '0');
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = String(totalMinutes % 60).padStart(2, '0');
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function captionsFromAlignment(alignment) {
  const chars = alignment?.characters || [];
  const starts = alignment?.character_start_times_seconds || [];
  const ends = alignment?.character_end_times_seconds || [];
  const cues = [];
  let text = '';
  let start = 0;

  chars.forEach((char, index) => {
    if (!text) start = starts[index] || 0;
    text += char;
    const sentenceEnd = /[.!?]/.test(char);
    const longEnough = text.length >= 88;
    if ((sentenceEnd && text.length >= 42) || longEnough || index === chars.length - 1) {
      const clean = text.replace(/\s+/g, ' ').trim();
      if (clean) cues.push({ start, end: ends[index] || start + 3, text: clean });
      text = '';
    }
  });

  return ['WEBVTT', '', ...cues.flatMap((cue, index) => [
    String(index + 1),
    `${formatTime(cue.start)} --> ${formatTime(Math.max(cue.end, cue.start + 1.2))}`,
    cue.text,
    ''
  ])].join('\n');
}

async function createVoiceover(job) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID before rendering RefZone course videos.');
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${job.productionVoice?.outputFormat || 'mp3_44100_128'}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text: job.voiceoverScript,
      model_id: job.productionVoice?.model || 'eleven_multilingual_v2',
      voice_settings: job.productionVoice?.settings || {
        stability: 0.44,
        similarity_boost: 0.82,
        style: 0.32,
        use_speaker_boost: true
      },
      apply_text_normalization: 'auto'
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs voiceover failed for ${job.id}: ${response.status} ${body}`);
  }

  const payload = await response.json();
  const audioFile = toPublicFile(job.voiceoverPath);
  const captionsFile = toPublicFile(job.captionsPath);
  const transcriptFile = toPublicFile(job.transcriptPath);
  ensureDir(audioFile);
  ensureDir(captionsFile);
  ensureDir(transcriptFile);
  fs.writeFileSync(audioFile, Buffer.from(payload.audio_base64, 'base64'));
  fs.writeFileSync(captionsFile, captionsFromAlignment(payload.normalized_alignment || payload.alignment || {}));
  fs.writeFileSync(transcriptFile, JSON.stringify({
    jobId: job.id,
    generatedAt: new Date().toISOString(),
    alignment: payload.normalized_alignment || payload.alignment || null,
    script: job.voiceoverScript
  }, null, 2));
  return secondsFromAlignment(payload.normalized_alignment || payload.alignment || {}, job.estimatedDurationSeconds || 240);
}

function selectedJobs(allJobs) {
  const course = argValue('course');
  const day = argValue('day');
  const id = argValue('id');
  const limit = Number(argValue('limit', hasFlag('all') ? String(allJobs.length) : '1'));
  return allJobs
    .filter(job => !course || job.trackId === course)
    .filter(job => !day || job.dayId === day)
    .filter(job => !id || job.id === id)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 1);
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
  const jobs = selectedJobs(manifest.jobs || []);
  if (!jobs.length) throw new Error('No RefZone video jobs matched the requested filters.');
  const force = hasFlag('force');
  if (hasFlag('dry-run')) {
    jobs.forEach(job => {
      console.log(`${job.id}: ${job.renderer} + ${job.voiceover} -> ${job.videoPath}`);
      console.log(`  scenes=${job.scenePlan?.length || 0} files=${job.readingFiles?.length || 0} script=${job.voiceoverScript?.length || 0} chars`);
    });
    return;
  }
  const serveUrl = await bundle({
    entryPoint,
    publicDir: publicRoot
  });

  for (const job of jobs) {
    const videoFile = toPublicFile(job.videoPath);
    const audioFile = toPublicFile(job.voiceoverPath);
    let durationSeconds = job.estimatedDurationSeconds || 240;
    const forceVoiceover = force || hasFlag('force-voiceover');
    const forceVideo = force || hasFlag('force-video');
    if (forceVoiceover || !fs.existsSync(audioFile)) {
      console.log(`Creating ElevenLabs voiceover for ${job.trackId} / ${job.dayId}`);
      durationSeconds = await createVoiceover(job);
    }

    if (forceVideo || !fs.existsSync(videoFile)) {
      console.log(`Rendering Remotion MP4 for ${job.trackId} / ${job.dayId}`);
      ensureDir(videoFile);
      const inputProps = { ...job, durationSeconds };
      const composition = await selectComposition({
        serveUrl,
        id: 'RefZoneLessonVideo',
        inputProps
      });
      await renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        audioCodec: 'aac',
        outputLocation: videoFile,
        inputProps,
        videoBitrate: '2200k',
        audioBitrate: '128k',
        scale: 0.6667,
        overwrite: true,
        onProgress: ({ progress }) => {
          process.stdout.write(`\r${job.dayId}: ${Math.round(progress * 100)}%`);
        }
      });
      process.stdout.write('\n');
    }
  }

  console.log('Regenerating RefZone video job manifest with published asset flags.');
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'tools/generate-refzone-course-video-jobs.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
