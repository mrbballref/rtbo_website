import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const materialsPath = path.join(repoRoot, 'frontend/public/refzone-course-materials.json');
const outputPath = path.join(repoRoot, 'frontend/public/refzone-course-video-jobs.json');
const publicRoot = path.join(repoRoot, 'frontend/public');

function slug(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function textList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(item => String(item).trim()).filter(Boolean) : [];
}

function compactText(value = '', maxLength = 5600) {
  const text = String(value || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}.`;
}

function imagePath(value = '') {
  const source = String(value || '').trim();
  if (!source) return '';
  return source.startsWith('/') ? source : `/assets/images/${source}`;
}

function publicPathExists(value = '') {
  const source = String(value || '').trim();
  if (!source || /^https?:\/\//i.test(source)) return false;
  return fs.existsSync(path.join(publicRoot, source.replace(/^\//, '')));
}

function courseFileHref(courseId, dayId, type, index = '') {
  const params = new URLSearchParams({ course: courseId, day: dayId, type });
  if (index !== '') params.set('index', String(index));
  return `/refzone-course-file.php?${params.toString()}`;
}

function narrationScriptFor(course = {}, week = {}, day = {}) {
  const college = day.college || {};
  const readings = textList(college.readings);
  const notes = textList(college.lectureNotes);
  const objectives = textList(college.objectives);
  const discussion = textList(college.discussion);
  return compactText([
    `Welcome to ${course.title || 'RefZone University'}, week ${week.week || day.week || 1}, day ${day.day || 1}. Today we are working through ${day.title || 'this basketball officiating lesson'}.`,
    college.preparation,
    objectives.length ? 'By the end of this lesson, you should be able to do the following.' : '',
    ...objectives.map((item, index) => `Objective ${index + 1}. ${item}`),
    readings.length ? 'Required reading. Read this material before the assessment and use it while completing the lesson evidence.' : '',
    ...readings.map((item, index) => `Reading ${index + 1}. ${item}`),
    notes.length ? 'Professor lecture.' : '',
    ...notes.map((item, index) => `Point ${index + 1}. ${item}`),
    college.lab ? `On-court or visual lab. ${college.lab}` : '',
    college.assignment ? `Daily assignment. ${college.assignment}` : '',
    discussion.length ? `Discussion question. ${discussion[0]}` : '',
    college.assessment?.prompt ? `Assessment standard. ${college.assessment.prompt}` : ''
  ].filter(Boolean).join(' '));
}

function scenePlanFor(course = {}, week = {}, day = {}, visuals = []) {
  const college = day.college || {};
  const fallbackVisual = visuals[0]?.src || imagePath(day.visual || day.screenshot || course.overviewThumbnail || course.cover);
  const rows = [
    {
      id: 'intro',
      title: day.title || 'Course Lesson',
      kind: 'Opening',
      text: college.preparation || course.description || course.overview || '',
      visual: visuals[0]?.src || fallbackVisual
    },
    {
      id: 'objectives',
      title: 'Learning Objectives',
      kind: 'Objectives',
      text: textList(college.objectives).join(' '),
      visual: visuals[1]?.src || fallbackVisual
    },
    {
      id: 'readings',
      title: 'Required Reading',
      kind: 'Reading',
      text: textList(college.readings).join(' '),
      visual: visuals[2]?.src || fallbackVisual
    },
    {
      id: 'lecture',
      title: 'Professor Lecture',
      kind: 'Lecture',
      text: textList(college.lectureNotes).join(' '),
      visual: visuals[3]?.src || fallbackVisual
    },
    {
      id: 'lab',
      title: 'Visual Lab',
      kind: 'Lab',
      text: college.lab || '',
      visual: visuals[4]?.src || fallbackVisual
    },
    {
      id: 'assignment',
      title: 'Daily Evidence',
      kind: 'Assignment',
      text: college.assignment || college.assessment?.prompt || '',
      visual: visuals[5]?.src || fallbackVisual
    }
  ];
  return rows
    .filter(row => row.text || row.visual)
    .map((row, index) => ({ ...row, order: index + 1, text: compactText(row.text, 520) }));
}

function readingFilesFor(course = {}, week = {}, day = {}, trackId = '') {
  const dayId = day.id || slug(`${trackId}-week-${week.week || 1}-day-${day.day || 1}`);
  const courseId = course.id || trackId;
  const college = day.college || {};
  const files = [{
    kind: 'Lesson Packet',
    title: `${day.title || 'Lesson'} Packet`,
    description: 'Complete downloadable packet with objectives, required readings, lecture notes, lab, assignment, assessment, and rubric.',
    href: courseFileHref(courseId, dayId, 'packet')
  }];
  textList(college.readings).forEach((item, index) => {
    files.push({
      kind: 'Required Reading',
      title: `Required Reading ${index + 1}`,
      description: item,
      href: courseFileHref(courseId, dayId, 'reading', index)
    });
  });
  if (textList(college.lectureNotes).length) {
    files.push({
      kind: 'Lecture Notes',
      title: 'Professor Lecture Notes',
      description: 'Download the professor lecture notes for this lesson.',
      href: courseFileHref(courseId, dayId, 'lecture-notes')
    });
  }
  if (college.lab) files.push({ kind: 'Lab', title: 'Lab / Visual Activity', description: college.lab, href: courseFileHref(courseId, dayId, 'lab') });
  if (college.assignment) files.push({ kind: 'Assignment', title: 'Daily Assignment', description: college.assignment, href: courseFileHref(courseId, dayId, 'assignment') });
  if (college.assessment?.prompt) files.push({ kind: 'Assessment', title: college.assessment.type || 'Assessment Prompt', description: college.assessment.prompt, href: courseFileHref(courseId, dayId, 'assessment') });
  return files;
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
        src,
        description: index === 0 ? (day.college?.preparation || day.title || '') : 'Course visual aid generated from the command-center material.'
      }));
      const videoPath = `/assets/videos/refzone/${trackId}/${dayId}.mp4`;
      const captionsPath = `/assets/videos/refzone/${trackId}/${dayId}.vtt`;
      const voiceoverPath = `/assets/audio/refzone/${trackId}/${dayId}.mp3`;
      const transcriptPath = `/assets/videos/refzone/${trackId}/${dayId}.json`;
      const voiceoverScript = narrationScriptFor(course, week, day);
      const estimatedDurationSeconds = Math.max(150, Math.min(780, Math.ceil(voiceoverScript.length / 12)));

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
        published: publicPathExists(videoPath),
        voiceoverReady: publicPathExists(voiceoverPath),
        captionsReady: publicPathExists(captionsPath),
        videoPath,
        captionsPath,
        voiceoverPath,
        transcriptPath,
        poster,
        visuals: uniqueVisuals,
        scenePlan: scenePlanFor(course, week, day, uniqueVisuals),
        readingFiles: readingFilesFor(course, week, day, trackId),
        voiceoverScript,
        estimatedDurationSeconds,
        productionVoice: {
          provider: 'ElevenLabs',
          model: 'eleven_multilingual_v2',
          voiceIdEnv: 'ELEVENLABS_VOICE_ID',
          outputFormat: 'mp3_44100_128',
          settings: {
            stability: 0.44,
            similarity_boost: 0.82,
            style: 0.32,
            use_speaker_boost: true
          },
          direction: 'Warm, confident basketball officiating clinician. Natural phrasing, varied pacing, and clear emphasis on rules language.'
        },
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
    notes: 'The public course player uses published MP4 videos when available. During production, it can use ElevenLabs voiceover audio with synchronized visual sequences and VTT captions. Browser speech synthesis is not used for production narration.'
  },
  counts: {
    courses: (materials.courses || []).length,
    jobs: jobs.length,
    publishedVideos: jobs.filter(job => job.published).length,
    publishedVoiceovers: jobs.filter(job => job.voiceoverReady).length,
    captionFiles: jobs.filter(job => job.captionsReady).length
  },
  jobs
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${jobs.length} RefZone course video jobs at ${path.relative(repoRoot, outputPath)}`);
