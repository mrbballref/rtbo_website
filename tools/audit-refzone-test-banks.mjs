import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
const manifestPath = path.join(repoRoot, 'frontend', 'public', 'refzone-course-materials.json');
const testCenterPath = path.join(repoRoot, 'frontend', 'src', 'TestCenterPage.jsx');
const failures = [];
const stats = {
  courses: 0,
  weeks: 0,
  days: 0,
  tests: 0,
  questions: 0,
  answerKeys: 0
};
const answerKeyCache = new Map();

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function manifestAnswerKeyPath(value = '') {
  const clean = String(value || '').split('#')[0].replace(/^\/+/, '');
  if (!clean) return '';
  return clean.startsWith('docs/') ? path.join(repoRoot, clean) : path.join(repoRoot, clean);
}

function answerKeyText(filePath) {
  if (!answerKeyCache.has(filePath)) {
    answerKeyCache.set(filePath, fs.existsSync(filePath) ? readText(filePath) : '');
  }
  return answerKeyCache.get(filePath);
}

function sectionMatch(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] || '';
}

function fail(context, message) {
  failures.push(`${context}: ${message}`);
}

function assessmentContentFor(dayText = '') {
  return dayText
    .split('\n')
    .filter(line => /^- Test:|^- Evidence prompt:|^\d+\.\s|^\s+- [A-D]\.|^\s+- Explanation:/.test(line))
    .join('\n');
}

function auditAssessmentFocus(dayContext, test = {}, dayText = '') {
  const content = [
    test.title || '',
    test.evidencePrompt || '',
    assessmentContentFor(dayText)
  ].join('\n');
  [
    ['delivery-only lecture title', /\bProfessor Lecture\b/i],
    ['delivery-only seminar title', /\bSocratic Seminar\b/i],
    ['generic orientation title', /\bOrientation and Professional Identity\b/i],
    ['generic course welcome title', /\bCourse Welcome\b/i],
    ['generic baseline title', /\bBaseline Assessment\b/i]
  ].forEach(([label, pattern]) => {
    if (pattern.test(content)) {
      fail(dayContext, `test content references ${label}; assessments must target basketball officiating material.`);
    }
  });
  if (!/(basketball|officiat|official|rule|case|mechanic|coverage|signal|whistle|ruling|penalt|restart|violation|foul|contact|game|crew|coach|player|table|bench|communication|judgment|position)/i.test(content)) {
    fail(dayContext, 'test content must explicitly assess basketball officiating material.');
  }
}

if (!fs.existsSync(manifestPath)) {
  fail('RefZone manifest', 'frontend/public/refzone-course-materials.json is missing.');
} else {
  const manifest = JSON.parse(readText(manifestPath));
  const courses = Array.isArray(manifest.courses) ? manifest.courses : [];
  stats.courses = courses.length;

  courses.forEach(course => {
    const courseContext = `${course.title || course.id || 'Unknown course'}`;
    if (!course.id || !course.title) fail(courseContext, 'course id and title are required.');
    if (!Array.isArray(course.weeks) || course.weeks.length === 0) fail(courseContext, 'course has no weeks.');

    course.weeks?.forEach(week => {
      stats.weeks += 1;
      const weekContext = `${courseContext} / Week ${week.week || '?'}`;
      if (!Array.isArray(week.days) || week.days.length === 0) fail(weekContext, 'week has no days.');

      week.days?.forEach(day => {
        stats.days += 1;
        const dayContext = `${weekContext} / Day ${day.day || '?'}`;
        const test = day.test || {};
        const questionCount = Number(test.questionCount || test.questions?.length || 0);
        const answerKeyCount = Number(test.answerKeyCount || test.answerKey?.length || 0);
        const answerKeyPath = manifestAnswerKeyPath(test.answerKeyPath);
        stats.tests += test.id ? 1 : 0;
        stats.questions += questionCount;
        stats.answerKeys += answerKeyCount;

        if (!test.id || !test.title || !test.type) fail(dayContext, 'test id, title, and type are required.');
        if (Number(test.passingScore || 0) !== 85) fail(dayContext, 'test passing score must be 85.');
        if (questionCount !== 25) fail(dayContext, `test must declare 25 questions, found ${questionCount}.`);
        if (answerKeyCount !== 25) fail(dayContext, `answer key must declare 25 answers, found ${answerKeyCount}.`);
        if (!answerKeyPath || !fs.existsSync(answerKeyPath)) {
          fail(dayContext, `answer key file is missing: ${test.answerKeyPath || '(none)'}`);
          return;
        }

        const keyText = answerKeyText(answerKeyPath);
        const weekText = sectionMatch(keyText, new RegExp(`##\\s+Week\\s+${week.week}:([\\s\\S]*?)(?=\\n##\\s+Week\\s+\\d+:|$)`));
        const dayText = weekText ? sectionMatch(weekText, new RegExp(`###\\s+Day\\s+${day.day}:([\\s\\S]*?)(?=\\n###\\s+Day\\s+\\d+:|$)`)) : '';
        if (!weekText) {
          fail(dayContext, `answer key file does not include a Week ${week.week} section.`);
        }
        if (!dayText) {
          fail(dayContext, `answer key file does not include a Day ${day.day} section inside Week ${week.week}.`);
        }
        const correctEntries = (dayText.match(/\*\*Correct\*\*/g) || []).length;
        if (correctEntries < 25) {
          fail(dayContext, `answer key day section must include 25 correct-answer markers, found ${correctEntries}.`);
        }
        auditAssessmentFocus(dayContext, test, dayText);
      });
    });
  });
}

if (!fs.existsSync(testCenterPath)) {
  fail('Test Center', 'frontend/src/TestCenterPage.jsx is missing.');
} else {
  const testCenterSource = readText(testCenterPath);
  [
    ['visible answer-key page title', /Test Center & Answer Keys/],
    ['real course test row builder', /function\s+courseTestRows\s*\(/],
    ['on-demand answer-key builder', /function\s+answerKeyForQuestions\s*\(/],
    ['test workflow button', /Open Test & Answer Key/],
    ['25-question fallback generator', /Array\.from\(\{\s*length:\s*20\s*\}/]
  ].forEach(([label, pattern]) => {
    if (!pattern.test(testCenterSource)) fail('Test Center', `missing ${label}.`);
  });
}

console.log('RefZone test bank audit');
console.log(`Courses: ${stats.courses}`);
console.log(`Weeks: ${stats.weeks}`);
console.log(`Days: ${stats.days}`);
console.log(`Tests: ${stats.tests}`);
console.log(`Declared questions: ${stats.questions}`);
console.log(`Declared answer keys: ${stats.answerKeys}`);

if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('RefZone test bank audit passed.');
