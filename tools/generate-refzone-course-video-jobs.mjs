import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const materialsPath = path.join(repoRoot, 'frontend/public/refzone-course-materials.json');
const outputPath = path.join(repoRoot, 'frontend/public/refzone-course-video-jobs.json');

function slug(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function imagePath(value = '') {
  const source = String(value || '').trim();
  if (!source) return '';
  return source.startsWith('/') ? source : `/assets/images/${source}`;
}

const materials = JSON.parse(fs.readFileSync(materialsPath, 'utf8'));
const jobs = [];

for (const course of materials.courses || []) {
  const trackId = slug(course.id || course.title);
  for (const week of course.weeks || []) {
    for (const day of week.days || []) {
      const dayId = slug(day.id || `${trackId}-week-${week.week}-day-${day.day}`);
      const poster = imagePath(day.screenshot || day.visual || course.overviewThumbnail || course.cover);
      const visualSources = [
        day.visual,
        day.screenshot,
        ...(day.sections || []).flatMap(section => [section.visual, section.screenshot])
      ].map(imagePath).filter(Boolean);
      const uniqueVisuals = [...new Set(visualSources)].slice(0, 8).map((src, index) => ({
        title: index === 0 ? (day.visualTitle || 'Lesson visual aid') : `Visual asset ${index + 1}`,
        src
      }));

      jobs.push({
        id: `${dayId}-video-job`,
        trackId,
        trackTitle: course.title || trackId,
        week: Number(week.week || day.week || 1),
        day: Number(day.day || 1),
        dayId: day.id || dayId,
        lessonTitle: day.title || `Week ${week.week || 1}, Day ${day.day || 1}`,
        renderer: 'Remotion',
        voiceover: 'ElevenLabs',
        published: false,
        videoPath: `/assets/videos/refzone/${trackId}/${dayId}.mp4`,
        captionsPath: `/assets/videos/refzone/${trackId}/${dayId}.vtt`,
        voiceoverPath: `/assets/audio/refzone/${trackId}/${dayId}.mp3`,
        poster,
        visuals: uniqueVisuals,
        sourceMaterial: {
          courseId: course.id || trackId,
          weekId: week.id || `${trackId}-week-${week.week || 1}`,
          dayId: day.id || dayId
        }
      });
    }
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  source: '/refzone-course-materials.json',
  productionStack: {
    renderer: 'Remotion',
    voiceover: 'ElevenLabs',
    notes: 'The public course player uses these published video paths when rendered files exist. Until then, it plays generated lesson video from the same course data, visual aids, transcript, and browser voiceover.'
  },
  counts: {
    courses: (materials.courses || []).length,
    jobs: jobs.length
  },
  jobs
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${jobs.length} RefZone course video jobs at ${path.relative(repoRoot, outputPath)}`);
