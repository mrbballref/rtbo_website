import React, { useEffect, useMemo, useState } from 'react';
import './rtbo-academy.css';

const MANUAL_URL = '/course-manual.md';
const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const noopStatus = () => {};
const COURSE_OVERVIEW_THUMBNAIL = '/assets/images/refzone/course-overview-thumbnail.png';
const ACADEMY_COURSE_IMAGES = [
  'three-person-crew.jpg',
  'training_img_1.jpg',
  'assigning-workflow-crew.jpg',
  'u-got-nex-ref-platform.jpg',
  'uapb_team_camp_card.jpg',
  'uca_team_camp_card.jpg',
  'ualr_team_camp_card.jpg',
  'rtbo_web_banner.jpg'
];
const ACADEMY_DAY_VISUALS = [
  ['lecture', /lecture|seminar/i, 'Professor Lecture', 'Concept map, classroom screenshot, and instructor talking points.'],
  ['rules', /rules|case/i, 'Rules and Case Plays', 'Rulebook panel, case-play decision tree, and written-answer template.'],
  ['court-lab', /court|mechanics/i, 'Court Mechanics Lab', 'Half-court positioning diagram, rotation arrows, and visual-angle checkpoints.'],
  ['film-lab', /film|self-scout/i, 'Film Laboratory', 'Clip screenshot frame, freeze-frame callout, and primary-coverage tags.'],
  ['role-play', /role|oral|communication/i, 'Role-Play and Oral Defense', 'Scenario card, dialogue rubric, and supervisor-defense slide.'],
  ['live-practicum', /live|scrimmage|practicum|livestream/i, 'Live Practicum', 'Game-flow screenshot, observer checklist, and performance evidence panel.'],
  ['reflection', /reflection|remediation|mentor|advancement/i, 'Reflection and Mentor Review', 'Journal prompt, remediation tracker, and mentor sign-off card.']
];
const COURSE_OVERVIEW_THUMBNAILS = {
  nfhs: '/assets/images/refzone/course-overviews/nfhs.jpg',
  'njcaa-women': '/assets/images/refzone/course-overviews/njcaa-women.jpg',
  'njcaa-men': '/assets/images/refzone/course-overviews/njcaa-men.jpg',
  'naia-women': '/assets/images/refzone/course-overviews/naia-women.jpg',
  'naia-men': '/assets/images/refzone/course-overviews/naia-men.jpg',
  'ncaa-women': '/assets/images/refzone/course-overviews/ncaa-women.jpg',
  'ncaa-men': '/assets/images/refzone/course-overviews/ncaa-men.jpg',
  wnba: '/assets/images/refzone/course-overviews/wnba.jpg',
  nba: '/assets/images/refzone/course-overviews/nba.jpg',
  njcaa: '/assets/images/refzone/course-overviews/njcaa-men.jpg',
  naia: '/assets/images/refzone/course-overviews/naia-men.jpg',
  ncaa: '/assets/images/refzone/course-overviews/ncaa-men.jpg',
  pro: '/assets/images/refzone/course-overviews/nba.jpg'
};
const STORAGE_KEYS = {
  completed: 'rtbo_academy_completed_days',
  notes: 'rtbo_academy_student_notes',
  bookmarks: 'rtbo_academy_bookmarks',
  videos: 'rtbo_academy_video_plan',
  tests: 'rtbo_academy_passed_tests',
  testResults: 'rtbo_academy_test_results',
  courses: 'rtbo-refzone-managed-courses'
};
const REFZONE_COURSES_EVENT = 'rtbo-refzone-courses-updated';

function slug(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function plainText(lines = []) {
  return lines.join('\n').replace(/^#+\s*/gm, '').trim();
}

function cleanAssessmentText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function competitionLabelForTrack(track = {}) {
  const source = `${track.title || ''} ${track.path || ''} ${track.level || ''}`.toLowerCase();
  if (source.includes('nfhs') || source.includes('high school')) return 'high-school basketball';
  if (source.includes('njcaa')) return 'junior-college basketball';
  if (source.includes('naia')) return 'NAIA basketball';
  if (source.includes('ncaa men')) return 'NCAA men\'s basketball';
  if (source.includes('ncaa women')) return 'NCAA women\'s basketball';
  if (source.includes('wnba')) return 'WNBA basketball';
  if (source.includes('nba')) return 'NBA basketball';
  return `${track.title || 'basketball'} basketball`;
}

function officiatingAssessmentTopicFor(track = {}, week = {}, day = {}) {
  const rawTopic = cleanAssessmentText(week.title || day.title || 'basketball officiating fundamentals');
  const competition = competitionLabelForTrack(track);
  if (/orientation|professional identity|course welcome|baseline assessment/i.test(rawTopic)) {
    return `${competition} officiating professionalism, rule readiness, crew communication, game administration, and player safety`;
  }
  if (/professional development/i.test(rawTopic) && !/(officiat|official|crew|game|assignment|feedback|observer|communication|conduct|report)/i.test(rawTopic)) {
    return `${competition} officiating development, rule study, mechanics evidence, and assignment readiness`;
  }
  if (/(basketball|officiat|official|rule|case|mechanic|coverage|signal|whistle|ruling|penalt|restart|violation|foul|contact|throw|clock|game|crew|coach|player|table|score|bench|safety|communication|judgment|position)/i.test(rawTopic)) {
    return `${rawTopic} in ${competition} officiating`;
  }
  return `${rawTopic} as applied to ${competition} officiating`;
}

function dayAssessmentFocusFor(day = {}) {
  const title = cleanAssessmentText(day.title || 'daily lesson');
  if (/professor lecture|socratic seminar|course welcome|baseline assessment|orientation/i.test(title)) {
    return 'the daily basketball officiating lesson';
  }
  return `${title} officiating work`;
}

function courseImageFor(track = {}, index = 0) {
  if (track.id === 'overview') return COURSE_OVERVIEW_THUMBNAIL;
  const explicitThumbnail = String(track.overviewThumbnail || '').trim();
  if (explicitThumbnail && !/\/course-covers\//i.test(explicitThumbnail)) return explicitThumbnail;
  const overviewThumbnail = COURSE_OVERVIEW_THUMBNAILS[slug(track.id || track.title || '')];
  if (overviewThumbnail) return overviewThumbnail;
  if (explicitThumbnail) return explicitThumbnail;
  if (track.cover) return track.cover;
  if (track.id) return `refzone/course-covers/${track.id}.svg`;
  const value = `${track.id || ''} ${track.title || ''} ${track.level || ''}`.toLowerCase();
  if (value.includes('nfhs') || value.includes('high school')) return 'three-person-crew.jpg';
  if (value.includes('ncaa') || value.includes('college')) return 'assigning-workflow-crew.jpg';
  if (value.includes('video') || value.includes('film')) return '3d_rtbo_livestream_player.jpg';
  if (value.includes('technology') || value.includes('platform')) return 'u-got-nex-ref-platform.jpg';
  return ACADEMY_COURSE_IMAGES[index % ACADEMY_COURSE_IMAGES.length];
}

function courseImageSrcFor(track = {}, index = 0) {
  const image = courseImageFor(track, index);
  return image.startsWith('/') ? image : `/assets/images/${image}`;
}

function courseLessonRowsFor(track = {}) {
  return (track.weeks || []).flatMap((week, weekIndex) => (
    (week.days || []).map((day, dayIndex) => ({
      track,
      week,
      day,
      weekIndex,
      dayIndex,
      material: collegeMaterialForDay(track, week, day)
    }))
  ));
}

function courseProgressFor(track = {}, completed = {}, passedTests = {}) {
  const lessons = courseLessonRowsFor(track);
  const completedLessons = lessons.filter(row => completed[row.day.id]).length;
  const passedAssessments = lessons.filter(row => passedTests[row.day.id]).length;
  const percent = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;
  const totalMinutes = lessons.reduce((total, row) => total + Number(row.material?.minutes || 90), 0);
  return {
    lessons,
    completedLessons,
    passedAssessments,
    percent,
    totalMinutes,
    hours: Math.max(1, Math.round(totalMinutes / 60))
  };
}

function lessonStatusFor(day = {}, completed = {}, passedTests = {}) {
  if (completed[day.id] && passedTests[day.id]) return 'Complete';
  if (passedTests[day.id]) return 'Assessment passed';
  if (completed[day.id]) return 'Marked complete';
  return 'Not started';
}

function lessonKindFor(day = {}, material = {}) {
  const source = `${day.title || ''} ${material.assessment?.type || ''}`.toLowerCase();
  if (/test|assessment|quiz|exam/.test(source)) return 'Quiz';
  if (/reading|rules|case|syllabus|manual/.test(source)) return 'Reading';
  if (/discussion|seminar|dialogue|role/.test(source)) return 'Dialogue';
  if (/lab|mechanics|film|court/.test(source)) return 'Lab';
  return 'Video';
}

function normalizeTestBank(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  const questions = Array.isArray(raw.questions) ? raw.questions.map((question, index) => {
    const options = Array.isArray(question.options) ? question.options.map((option, optionIndex) => ({
      id: String(option.id || String.fromCharCode(97 + optionIndex)).toLowerCase(),
      text: String(option.text || '').trim()
    })).filter(option => option.text) : [];
    return {
      id: String(question.id || `q${index + 1}`),
      type: question.type || 'multiple-choice',
      prompt: String(question.prompt || '').trim(),
      options,
      correctOptionId: String(question.correctOptionId || question.correct_option_id || '').toLowerCase(),
      explanation: String(question.explanation || '').trim()
    };
  }).filter(question => question.prompt && question.options.length >= 2 && question.correctOptionId) : [];

  return {
    id: String(raw.id || 'course-test'),
    title: String(raw.title || 'Course Assessment'),
    type: String(raw.type || 'Course Assessment'),
    passingScore: Number(raw.passingScore || raw.passing_score || 85),
    timeLimitMinutes: Number(raw.timeLimitMinutes || raw.time_limit_minutes || 45),
    instructions: String(raw.instructions || '').trim(),
    evidencePrompt: String(raw.evidencePrompt || raw.evidence_prompt || '').trim(),
    questions
  };
}

function dayVisualFor(day = {}) {
  if (day.visual) {
    return {
      key: day.visualType || 'lecture',
      title: day.visualTitle || 'Course Visual Aid',
      proof: day.screenshot ? 'Lesson visual aid, learner screenshot, presentation slide, and worksheet frame.' : 'Lesson visual aid and course packet.',
      image: imageSourceFor(day.visual)
    };
  }
  const match = ACADEMY_DAY_VISUALS.find(([, pattern]) => pattern.test(day.title || '')) || ACADEMY_DAY_VISUALS[0];
  return {
    key: match[0],
    title: match[2],
    proof: match[3],
    image: `/assets/images/refzone/lesson-visuals/${match[0]}.svg`
  };
}

function textList(items, fallback = []) {
  return Array.isArray(items) && items.length ? items.filter(Boolean) : fallback;
}

function rubricItemFromText(item = '') {
  const text = String(item || '').trim();
  const trailingPoints = text.match(/^(.*?):\s*(\d+)\s*points?$/i);
  if (trailingPoints) {
    return {
      label: trailingPoints[1].trim(),
      points: Number(trailingPoints[2])
    };
  }

  const leadingPoints = text.match(/^(\d+)\s*points?\s*[-:]\s*(.*)$/i);
  if (leadingPoints) {
    return {
      label: leadingPoints[2].trim(),
      points: Number(leadingPoints[1])
    };
  }

  return {
    label: text,
    points: null
  };
}

function fallbackCollegeMaterial(track = {}, week = {}, day = {}) {
  const visual = dayVisualFor(day);
  const trackTitle = track.title || 'Course';
  const topic = officiatingAssessmentTopicFor(track, week, day);
  const focus = dayAssessmentFocusFor(day);
  return {
    minutes: 90,
    objectives: [
      `Explain ${topic} using the current rulebook, case book, mechanics manual, and governing directives.`,
      `Apply ${topic} to realistic ${trackTitle} game situations with judgment, positioning, communication, and evidence.`,
      'Produce a gradable artifact that proves preparation, performance, reflection, and mentor readiness.'
    ],
    readings: [
      `Read current rulebook sections connected to ${topic}; mark definitions, penalties, exceptions, and restart language.`,
      `Read case plays and interpretations connected to ${topic}; write the ruling, reason, crew responsibility, and supervisor explanation.`,
      `Study mechanics-manual coverage for ${topic}; draw starting position, movement path, primary area, secondary awareness, and reporting route.`,
      'Review professional communication, bench decorum, reporting, and sportsmanship expectations for the applicable level.',
      `Study the ${visual.title.toLowerCase()} visual aid and attach one film, court, or written example that proves learning transfer.`
    ],
    preparation: `Arrive prepared to cite the reading, explain the ruling, perform the mechanic, and submit evidence for ${topic}.`,
    media: `${visual.title} visual aid, screenshot packet, lecture slide, worksheet frame, and instructor talking points.`,
    lectureNotes: [
      `Frame ${topic} as a college-level officiating discipline, not a clinic tip.`,
      `Connect rule language, philosophy, mechanics, and communication to ${trackTitle} game pressure.`,
      'Model one correct explanation, one incorrect shortcut, and one supervisor-ready correction statement.'
    ],
    discussion: [
      `Where does ${topic} most often break down in live games?`,
      'What evidence proves the official applied the reading instead of guessing?',
      'How should the official communicate once, professionally, and then stop?'
    ],
    lab: `${visual.title}: complete the visual worksheet, screenshot annotation, court/film/role-play task, and mentor observation note for ${focus}.`,
    assignment: `Submit the daily journal entry, worksheet/lab artifact, and one mentor-ready evidence item tied to ${topic}.`,
    assessment: {
      type: 'Module Assessment',
      prompt: `Defend the ruling, mechanic, communication choice, and evidence connected to ${topic}.`,
      passingStandard: `85% or mentor approval is required before the next module unlocks.`
    },
    rubric: collegeCourseDefaults.gradingScale.map(([label, value]) => `${label}: ${value}`)
  };
}

function collegeMaterialForDay(track = {}, week = {}, day = {}) {
  return {
    ...fallbackCollegeMaterial(track, week, day),
    ...(day.college || {}),
    assessment: {
      ...fallbackCollegeMaterial(track, week, day).assessment,
      ...(day.college?.assessment || {})
    }
  };
}

function fallbackTestForDay(track = {}, week = {}, day = {}) {
  const material = collegeMaterialForDay(track, week, day);
  const testType = material.assessment?.type || 'Course Assessment';
  const courseTitle = track.title || 'Course';
  const topic = officiatingAssessmentTopicFor(track, week, day);
  const focus = dayAssessmentFocusFor(day);
  const scenario = `A live ${courseTitle} game presents a judgment, mechanics, or communication problem tied to ${topic}.`;
  const baseQuestions = [
    {
      id: `${day.id || 'day'}-q1`,
      type: 'multiple-choice',
      prompt: `Before the basketball officiating assessment on ${topic}, which preparation best supports the course standard?`,
      options: [
        { id: 'a', text: material.readings?.[0] || `Read the current governing basketball officiating material tied to ${topic}.` },
        { id: 'b', text: 'Wait until after class to learn the rule.' },
        { id: 'c', text: 'Rely only on personal game experience.' },
        { id: 'd', text: 'Study signals without reading the rule or mechanics source.' }
      ],
      correctOptionId: 'a',
      explanation: 'RefZone lessons require current reading, rules reasoning, mechanics study, and evidence before advancement.'
    },
    {
      id: `${day.id || 'day'}-q2`,
      type: 'multiple-choice',
      prompt: `What is required evidence for applying ${topic} in a game setting?`,
      options: [
        { id: 'a', text: 'Attendance only.' },
        { id: 'b', text: material.assignment || 'Submit the daily worksheet, lab artifact, and mentor-ready evidence item.' },
        { id: 'c', text: 'A casual verbal statement.' },
        { id: 'd', text: 'No evidence is required.' }
      ],
      correctOptionId: 'b',
      explanation: 'Course completion requires a gradable artifact, not a button click.'
    },
    {
      id: `${day.id || 'day'}-q3`,
      type: 'multiple-choice',
      prompt: `What should the official connect when applying ${topic}?`,
      options: [
        { id: 'a', text: 'Only crowd reaction.' },
        { id: 'b', text: 'Rule language, case-play logic, mechanics, communication, and evidence quality.' },
        { id: 'c', text: 'Only the final score.' },
        { id: 'd', text: 'Only personal preference.' }
      ],
      correctOptionId: 'b',
      explanation: 'The course standard is to explain, perform, defend, and improve using evidence.'
    },
    {
      id: `${day.id || 'day'}-q4`,
      type: 'multiple-choice',
      prompt: `Scenario: ${scenario} What is the best first response?`,
      options: [
        { id: 'a', text: 'Argue until the decision is accepted.' },
        { id: 'b', text: 'Ignore the concern.' },
        { id: 'c', text: 'Give a short, accurate explanation tied to the rule source, crew responsibility, mechanic, and correction point.' },
        { id: 'd', text: 'Change the decision only to avoid conflict.' }
      ],
      correctOptionId: 'c',
      explanation: 'Professional communication should be concise, accurate, and tied to the officiating standard.'
    },
    {
      id: `${day.id || 'day'}-q5`,
      type: 'multiple-choice',
      prompt: `What happens if the student does not pass ${testType}?`,
      options: [
        { id: 'a', text: 'The next module still unlocks automatically.' },
        { id: 'b', text: 'The student repeats evidence, corrects missed concepts, and completes remediation before advancing.' },
        { id: 'c', text: 'The course deletes the assessment.' },
        { id: 'd', text: 'The mentor ignores the missed standard.' }
      ],
      correctOptionId: 'b',
      explanation: material.assessment?.passingStandard || '85% or mentor approval is required before advancement.'
    }
  ];
  const patternQuestions = Array.from({ length: 20 }, (_, index) => {
    const number = index + 6;
    const group = index % 5;
    if (group === 0) {
      return {
        id: `${day.id || 'day'}-q${number}`,
        type: 'multiple-choice',
        prompt: `Question ${number}: Which reading action most directly supports officiating judgment on ${topic}?`,
        options: [
          { id: 'a', text: 'Identify the exact rule language, exception, penalty, restart, and mechanic connected to the play.' },
          { id: 'b', text: 'Ignore exceptions and rely only on the most common ruling.' },
          { id: 'c', text: 'Avoid written evidence until the test is complete.' },
          { id: 'd', text: 'Ask the coach which rule should apply.' }
        ],
        correctOptionId: 'a',
        explanation: 'The course expects rule-source accuracy before applying judgment or mechanics.'
      };
    }
    if (group === 1) {
      return {
        id: `${day.id || 'day'}-q${number}`,
        type: 'multiple-choice',
        prompt: `Question ${number}: What mechanics evidence best proves mastery of ${topic}?`,
        options: [
          { id: 'a', text: 'A diagram or note showing starting position, movement path, primary coverage, secondary awareness, signal, and reporting route.' },
          { id: 'b', text: 'A statement that the official was close to the play.' },
          { id: 'c', text: 'A score-only summary.' },
          { id: 'd', text: 'A generic note saying the crew worked hard.' }
        ],
        correctOptionId: 'a',
        explanation: 'Mechanics mastery must be visible and reviewable through specific positioning and coverage evidence.'
      };
    }
    if (group === 2) {
      return {
        id: `${day.id || 'day'}-q${number}`,
        type: 'multiple-choice',
        prompt: `Question ${number}: Which communication response best fits a ${courseTitle} official challenged on ${topic}?`,
        options: [
          { id: 'a', text: 'Use brief, calm, rule-based language, then return focus to the game.' },
          { id: 'b', text: 'Keep explaining until the coach agrees.' },
          { id: 'c', text: 'Use sarcasm to end the conversation.' },
          { id: 'd', text: 'Refuse all communication regardless of the situation.' }
        ],
        correctOptionId: 'a',
        explanation: 'Professional communication is accurate, brief, composed, and game-centered.'
      };
    }
    if (group === 3) {
      return {
        id: `${day.id || 'day'}-q${number}`,
        type: 'multiple-choice',
        prompt: `Question ${number}: What should a film or visual review identify for ${topic}?`,
        options: [
          { id: 'a', text: 'Primary coverage, open or closed angle, contact effect, crew help, and the correction point.' },
          { id: 'b', text: 'Only whether the call was popular.' },
          { id: 'c', text: 'Only the player who scored.' },
          { id: 'd', text: 'Only whether the official looked confident.' }
        ],
        correctOptionId: 'a',
        explanation: 'Film and visual work must identify the observable officiating factors behind the decision.'
      };
    }
    return {
      id: `${day.id || 'day'}-q${number}`,
      type: 'multiple-choice',
      prompt: `Question ${number}: Which portfolio evidence would satisfy the advancement standard for ${topic}?`,
      options: [
        { id: 'a', text: 'Corrected quiz results, written rule defense, lab artifact, mentor note, and a specific next-step correction plan.' },
        { id: 'b', text: 'A button click showing the lesson as passed.' },
        { id: 'c', text: 'A blank worksheet with no notes.' },
        { id: 'd', text: 'A promise to study later.' }
      ],
      correctOptionId: 'a',
      explanation: 'Advancement requires evidence that can be reviewed by faculty, mentors, and the advancement board.'
    };
  });
  const questions = [...baseQuestions, ...patternQuestions];

  return {
    id: `${day.id || 'day'}-test`,
    title: `${courseTitle} Week ${week.week || 1}, Day ${day.day || 1} Basketball Officiating ${testType}`,
    type: testType,
    passingScore: 85,
    timeLimitMinutes: 45,
    instructions: `Complete this 25-question scored assessment after studying the basketball officiating material for ${topic}. You must earn at least 85% before the next module unlocks.`,
    evidencePrompt: `In 3-5 sentences, cite the rule or mechanic connected to ${topic}, explain the official's game responsibility during ${focus}, and name one correction target for the next assignment.`,
    questions
  };
}

function testForDay(track = {}, week = {}, day = {}) {
  const fallback = fallbackTestForDay(track, week, day);
  const test = normalizeTestBank(day.test) || {};
  const savedQuestions = Array.isArray(test.questions) ? test.questions : [];
  const questions = savedQuestions.length >= 25 ? savedQuestions.slice(0, 25) : fallback.questions;
  return {
    ...fallback,
    ...test,
    passingScore: 85,
    questions
  };
}

function imageSourceFor(value = '') {
  if (!value) return '';
  return value.startsWith('/') ? value : `/assets/images/${value}`;
}

function sectionVisualsFor(section = {}, day = {}, index = 0) {
  const visual = dayVisualFor(day);
  return {
    visual: imageSourceFor(section.visual) || visual.image,
    screenshot: imageSourceFor(section.screenshot) || imageSourceFor(day.screenshot),
    label: section.materialType || section.collegeRole || `Section ${index + 1} Material`
  };
}

function managedCourseToTrack(course = {}, index = 0) {
  const id = slug(course.id || course.title || `managed-course-${index + 1}`);
  const weeks = Array.isArray(course.weeks) && course.weeks.length ? course.weeks : [{
    id: `${id}-week-1`,
    month: 1,
    week: 1,
    title: 'Course Orientation',
    lecture: course.description || '',
    evidence: '',
    days: [{
      id: `${id}-week-1-day-1`,
      day: 1,
      title: 'Course Welcome and Baseline Assessment',
      visualType: 'lecture',
      sections: []
    }]
  }];
  return {
    id,
    title: course.title || `Managed Course ${index + 1}`,
    path: course.overview || course.description || course.path || 'RefZone University course',
    level: course.level || 'Managed Course',
    cover: course.cover || `/assets/images/refzone/course-covers/${id}.svg`,
    overviewThumbnail: course.overviewThumbnail || course.overview_thumbnail || '',
    overview: course.overview || course.description || '',
    identity: course.identity || '',
    graduation: Array.isArray(course.graduation) ? course.graduation : [],
    raw: [],
    weeks: weeks.map((week, weekIndex) => ({
      id: week.id || `${id}-week-${weekIndex + 1}`,
      month: Number(week.month || Math.ceil((weekIndex + 1) / 4)),
      week: Number(week.week || weekIndex + 1),
      title: week.title || `Module ${weekIndex + 1}`,
      lecture: week.lecture || '',
      evidence: week.evidence || '',
      presentation: week.presentation || '',
      screenshot: week.screenshot || '',
      content: [week.lecture, week.evidence].filter(Boolean),
      days: (week.days || []).map((day, dayIndex) => ({
        id: day.id || `${id}-week-${weekIndex + 1}-day-${dayIndex + 1}`,
        week: Number(week.week || weekIndex + 1),
        day: Number(day.day || dayIndex + 1),
        title: day.title || `Lesson ${dayIndex + 1}`,
        visualType: day.visualType || day.visual_type || '',
        visualTitle: day.visualTitle || day.visual_title || '',
        visual: day.visual || '',
        screenshot: day.screenshot || '',
        presentation: day.presentation || '',
        college: day.college || null,
        test: day.test || null,
        content: [day.presentation && `Presentation: ${day.presentation}`, day.screenshot && `Screenshot packet: ${day.screenshot}`].filter(Boolean),
        sections: (day.sections || []).map((section, sectionIndex) => ({
          id: section.id || `${id}-week-${weekIndex + 1}-day-${dayIndex + 1}-section-${sectionIndex + 1}`,
          title: section.title || `Line Item ${sectionIndex + 1}`,
          summary: section.summary || '',
          materialType: section.materialType || section.material_type || '',
          visual: section.visual || '',
          screenshot: section.screenshot || '',
          presentation: section.presentation || '',
          collegeRole: section.collegeRole || section.college_role || '',
          content: [section.summary].filter(Boolean)
        }))
      }))
    }))
  };
}

function splitCourse(markdown = '') {
  const lines = markdown.split(/\r?\n/);
  const tracks = [];
  let currentTrack = null;
  let currentWeek = null;
  let currentDay = null;
  let currentSection = null;

  function ensureTrack() {
    if (!currentTrack) {
      currentTrack = { id: 'overview', title: 'Course Overview', path: 'General', level: 'All Levels', weeks: [], raw: [] };
      tracks.push(currentTrack);
    }
  }

  function addLine(line) {
    if (currentSection) currentSection.content.push(line);
    else if (currentDay) currentDay.content.push(line);
    else if (currentWeek) currentWeek.content.push(line);
    else {
      ensureTrack();
      currentTrack.raw.push(line);
    }
  }

  for (const line of lines) {
    const trackMatch = line.match(/^# SCHOOL \/ TRACK:\s*(.+)$/);
    const degreeMatch = line.match(/^## Degree Path:\s*(.+)$/);
    const levelMatch = line.match(/^## Academic Level:\s*(.+)$/);
    const weekMatch = line.match(/^## Month\s+(\d+),\s+Week\s+(\d+):\s*(.+)$/);
    const dayMatch = line.match(/^### Week\s+(\d+),\s+Day\s+(\d+)\s+-\s+(.+)$/);
    const sectionMatch = line.match(/^####\s+(.+)$/);

    if (trackMatch) {
      currentTrack = { id: slug(trackMatch[1]), title: trackMatch[1], path: '', level: '', weeks: [], raw: [] };
      tracks.push(currentTrack);
      currentWeek = null;
      currentDay = null;
      currentSection = null;
      continue;
    }
    if (degreeMatch && currentTrack) {
      currentTrack.path = degreeMatch[1];
      continue;
    }
    if (levelMatch && currentTrack) {
      currentTrack.level = levelMatch[1];
      continue;
    }
    if (weekMatch) {
      ensureTrack();
      currentWeek = {
        id: `${currentTrack.id}-week-${weekMatch[2]}`,
        month: Number(weekMatch[1]),
        week: Number(weekMatch[2]),
        title: weekMatch[3],
        days: [],
        content: []
      };
      currentTrack.weeks.push(currentWeek);
      currentDay = null;
      currentSection = null;
      continue;
    }
    if (dayMatch) {
      if (!currentWeek) {
        ensureTrack();
        currentWeek = { id: `${currentTrack.id}-week-${dayMatch[1]}`, month: Math.ceil(Number(dayMatch[1]) / 4), week: Number(dayMatch[1]), title: `Week ${dayMatch[1]}`, days: [], content: [] };
        currentTrack.weeks.push(currentWeek);
      }
      currentDay = { id: `${currentWeek.id}-day-${dayMatch[2]}`, week: Number(dayMatch[1]), day: Number(dayMatch[2]), title: dayMatch[3], sections: [], content: [] };
      currentWeek.days.push(currentDay);
      currentSection = null;
      continue;
    }
    if (sectionMatch && currentDay) {
      currentSection = { title: sectionMatch[1], content: [] };
      currentDay.sections.push(currentSection);
      continue;
    }
    if (currentWeek && line.startsWith('### Weekly Professor')) {
      currentSection = null;
      currentDay = null;
    }
    addLine(line);
  }

  const parsedTracks = tracks.filter(track => track.weeks.length || track.raw.length);
  const overviewTracks = parsedTracks.filter(track => track.id === 'overview');
  const courseTracks = parsedTracks.filter(track => track.id !== 'overview');
  return [...overviewTracks, ...courseTracks];
}

function useLocalJson(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function inlineText(text = '') {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part);
}

function MarkdownBlock({ text = '' }) {
  const blocks = text.split(/\n{2,}/).filter(Boolean);
  return blocks.map((block, index) => {
    const value = block.trim();
    if (value.startsWith('- ')) {
      return (
        <ul className="rtbo-academy-md-list" key={index}>
          {value.split('\n').map(item => <li key={item}>{inlineText(item.replace(/^- /, '').trim())}</li>)}
        </ul>
      );
    }
    const heading = value.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const Tag = `h${Math.min(heading[1].length + 1, 6)}`;
      return <Tag key={index}>{inlineText(heading[2])}</Tag>;
    }
    return <p key={index}>{inlineText(value)}</p>;
  });
}

const filmTasks = [
  ['Primary Coverage Identification', 'Identify which official owns the play and explain whether the official had an open look.'],
  ['Call / No-Call Analysis', 'Determine whether contact affected rhythm, speed, balance, quickness, or freedom of movement.'],
  ['Positioning Audit', 'Tag open angles, closed angles, straight-lined views, and late rotations.'],
  ['Crew Communication Review', 'Evaluate eye contact, dead-ball discussion, double whistles, and report communication.'],
  ['Full-Game Self-Scout', 'Complete a full-game review with strengths, weaknesses, patterns, and development targets.']
];

const courtTasks = [
  ['Lead Positioning', 'Work baseline movement, close-down, post coverage, rotations, and rebounding coverage.'],
  ['Center Discipline', 'Practice weak-side awareness, primary coverage, off-ball contact, and rotation timing.'],
  ['Trail Coverage', 'Work transition depth, perimeter contact, rebounding support, and table-side responsibilities.'],
  ['Free Throw Administration', 'Practice lane coverage, shooter responsibility, substitutions, and violation sequence.'],
  ['End-of-Game Mechanics', 'Simulate last-second shots, clock awareness, timeouts, fouls, and crew conferences.']
];

const rolePlayTasks = [
  ['Coach Communication', 'Respond to coach questions with short, professional, calm explanations.'],
  ['Player Frustration', 'Manage frustrated players without over-talking or escalating.'],
  ['Partner Disagreement', 'Resolve double whistles and conflicting rulings professionally.'],
  ['Table Crew Error', 'Correct scoring and timing issues without embarrassing table personnel.'],
  ['Supervisor Oral Defense', 'Defend a ruling, mechanics choice, or report decision before an evaluator.']
];

const videoProductionStages = [
  ['Professor Lecture', 'Record the weekly thesis, rule foundation, philosophy, and expected outcomes.'],
  ['Rules and Case Plays', 'Create board work and case-play walkthroughs with answer defense.'],
  ['Court Demonstration', 'Capture on-court mechanics, angles, rotations, signals, and crew coverage.'],
  ['Film Laboratory', 'Attach clips, freeze frames, self-scout prompts, and evaluator notes.'],
  ['Role Play', 'Record coach, player, table crew, partner, and supervisor communication scenarios.'],
  ['Assessment', 'Record the assignment instructions, evidence checklist, and remediation expectations.']
];

const collegeCourseDefaults = {
  creditHours: '3 credit-hour equivalent / 90 minutes per class meeting',
  professor: 'RTBO Faculty, mentor evaluator, and advancement board',
  officeHours: 'Weekly virtual office hours, mentor conference, and remediation appointment by request',
  prerequisites: 'Active or prospective basketball official, rules-study commitment, court shoes, whistle, uniform readiness, and video-review access',
  textbooks: [
    'Current governing basketball rules book for this track',
    'Current case book, interpretations, and points of emphasis',
    'Current officials manual, mechanics manual, state association or conference directives',
    'RefZone University course packet, visual aids, worksheets, quizzes, film labs, and portfolio templates'
  ],
  gradingScale: [
    ['Daily preparation and attendance', '10%'],
    ['Reading notes and case-play worksheets', '15%'],
    ['Court mechanics labs and visual worksheets', '20%'],
    ['Film labs, video quizzes, and self-scout evidence', '20%'],
    ['Role-play, oral defense, and communication performance', '15%'],
    ['Final portfolio, mentor review, and advancement board', '20%']
  ],
  policies: [
    'Every module requires reading, visible performance evidence, and a passing assessment before the next module unlocks.',
    'Students who miss the passing standard complete remediation and repeat the lesson evidence before advancing.',
    'Portfolio work must be original student work with clear notes, clips, diagrams, reflection, and mentor feedback.',
    'Course references point students to current official publications; RefZone does not replace official rulebooks or state/conference directives.'
  ]
};

function AcademyMetric({ label, value, detail }) {
  return (
    <article className="rtbo-academy-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function LabView({ title, rows }) {
  return (
    <section className="rtbo-academy-panel">
      <div className="rtbo-academy-section-head">
        <p className="eyebrow">Training Lab</p>
        <h3>{title}</h3>
      </div>
      <div className="rtbo-academy-card-grid">
        {rows.map(([name, description]) => (
          <article className="rtbo-academy-task-card" key={name}>
            <strong>{name}</strong>
            <p>{description}</p>
            <div className="rtbo-academy-rubric">
              <span>Preparation</span>
              <span>Performance</span>
              <span>Reflection</span>
              <span>Mentor Review</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CourseSyllabus({ track = {} }) {
  const weeks = track.weeks || [];
  const days = weeks.flatMap(week => week.days || []);
  const graduation = textList(track.graduation, [
    'Complete every module, assignment, assessment, lab, and mentor evidence checkpoint.',
    'Pass all written, video, mechanics, oral-defense, and portfolio assessments.',
    'Defend the completed portfolio before the advancement board.'
  ]);

  return (
    <section className="rtbo-academy-panel rtbo-academy-syllabus">
      <div className="rtbo-academy-section-head">
        <p className="eyebrow">College Course Syllabus</p>
        <h3>{track.title || 'Course Syllabus'}</h3>
        <p>{track.identity || track.overview || track.path || 'Structured college-style officiating course.'}</p>
      </div>

      <div className="rtbo-academy-syllabus-grid">
        {[
          ['Course Level', track.level || 'Academic Track'],
          ['Credit / Contact Hours', collegeCourseDefaults.creditHours],
          ['Instructor / Faculty', collegeCourseDefaults.professor],
          ['Office Hours', collegeCourseDefaults.officeHours],
          ['Prerequisites', collegeCourseDefaults.prerequisites],
          ['Course Length', `${weeks.length} weeks / ${days.length} academic class days`]
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="rtbo-academy-college-grid">
        <article className="rtbo-academy-college-card">
          <h4>Required Materials</h4>
          <ul>{collegeCourseDefaults.textbooks.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="rtbo-academy-college-card">
          <h4>Learning Outcomes</h4>
          <ul>{graduation.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="rtbo-academy-college-card">
          <h4>Grading Scale</h4>
          <div className="rtbo-academy-gradebook">
            {collegeCourseDefaults.gradingScale.map(([label, value]) => <span key={label}><b>{value}</b>{label}</span>)}
          </div>
        </article>
        <article className="rtbo-academy-college-card">
          <h4>Academic Policies</h4>
          <ul>{collegeCourseDefaults.policies.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>

      <div className="rtbo-academy-course-map">
        {weeks.slice(0, 12).map(week => (
          <article key={week.id}>
            <span>Week {week.week}</span>
            <strong>{week.title}</strong>
            <small>{(week.days || []).length} class meetings / lecture, reading, lab, assessment, and evidence work</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function CourseMaterialPacket({ track = {}, week = {}, day = {} }) {
  if (!day?.id) return null;
  const material = collegeMaterialForDay(track, week, day);
  const visual = dayVisualFor(day);
  const screenshot = imageSourceFor(day.screenshot);
  const objectives = textList(material.objectives);
  const readings = textList(material.readings);
  const lectureNotes = textList(material.lectureNotes);
  const discussion = textList(material.discussion);
  const rubric = textList(material.rubric);
  const sections = day.sections || [];

  return (
    <section className="rtbo-academy-college-packet">
      <div className="rtbo-academy-section-head">
        <p className="eyebrow">Study Materials and Visual Aids</p>
        <h3>College Course Packet</h3>
        <p>{material.preparation}</p>
      </div>

      <div className="rtbo-academy-session-strip">
        {[
          ['Class Meeting', `${material.minutes || 90} minutes`],
          ['Visual Type', visual.title],
          ['Assessment', material.assessment?.type || 'Module Assessment'],
          ['Passing Standard', material.assessment?.passingStandard || '85% or mentor approval']
        ].map(([label, value]) => (
          <article key={label}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </div>

      <div className="rtbo-academy-visual-aid-grid">
        <article>
          <span>Visual Aid</span>
          <img src={visual.image} alt={`${visual.title} visual aid`} loading="lazy" decoding="async" />
          <strong>{visual.title}</strong>
          <p>{visual.proof}</p>
        </article>
        {screenshot && (
          <article>
            <span>Learner Screenshot / Slide</span>
            <img src={screenshot} alt={`${day.title} learner screenshot and slide packet`} loading="lazy" decoding="async" />
            <strong>{day.presentation || `${track.title} / Week ${week.week} / Day ${day.day}`}</strong>
            <p>Screenshot packet for the lecture, worksheet, activity frame, and assessment evidence.</p>
          </article>
        )}
      </div>

      <div className="rtbo-academy-college-grid">
        <article className="rtbo-academy-college-card">
          <h4>Learning Objectives</h4>
          <ul>{objectives.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="rtbo-academy-college-card">
          <h4>Required Reading</h4>
          <ul>{readings.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="rtbo-academy-college-card">
          <h4>Professor Lecture Notes</h4>
          <ul>{lectureNotes.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="rtbo-academy-college-card">
          <h4>Class Discussion</h4>
          <ul>{discussion.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>

      <div className="rtbo-academy-assignment-grid">
        <article>
          <span>Lab</span>
          <p>{material.lab}</p>
        </article>
        <article>
          <span>Assignment</span>
          <p>{material.assignment}</p>
        </article>
        <article>
          <span>{material.assessment?.type || 'Assessment'}</span>
          <p>{material.assessment?.prompt}</p>
          <small>{material.assessment?.passingStandard}</small>
        </article>
      </div>

      <RubricSummary rubric={rubric} />

      <div className="rtbo-academy-line-item-grid">
        {sections.map((section, index) => {
          const sectionVisuals = sectionVisualsFor(section, day, index);
          return (
          <article key={section.id || section.title}>
            <span>{section.collegeRole || section.materialType || 'Course Material'}</span>
            <div className="rtbo-academy-section-asset-row">
              {sectionVisuals.visual && <img src={sectionVisuals.visual} alt={`${section.title} visual aid`} loading="lazy" decoding="async" />}
              {sectionVisuals.screenshot && <img src={sectionVisuals.screenshot} alt={`${section.title} screenshot packet`} loading="lazy" decoding="async" />}
            </div>
            <strong>{section.title}</strong>
            {section.presentation && <small>{section.presentation}</small>}
            <MarkdownBlock text={section.summary || section.content?.join('\n') || ''} />
          </article>
          );
        })}
      </div>
    </section>
  );
}

function RubricSummary({ rubric = [] }) {
  const items = textList(rubric).map(rubricItemFromText).filter(item => item.label);
  if (!items.length) return null;

  const totalPoints = items.reduce((total, item) => total + (Number(item.points) || 0), 0);

  return (
    <article className="rtbo-academy-rubric-summary">
      <div className="rtbo-academy-rubric-summary-head">
        <div>
          <span>Rubric</span>
          <strong>Assessment Standards</strong>
        </div>
        {totalPoints > 0 && <b>{totalPoints} points</b>}
      </div>
      <div className="rtbo-academy-rubric-summary-grid">
        {items.map((item, index) => (
          <section className="rtbo-academy-rubric-summary-item" key={`${item.label}-${index}`}>
            <div className="rtbo-academy-rubric-points">
              {item.points ? (
                <>
                  <strong>{item.points}</strong>
                  <small>points</small>
                </>
              ) : (
                <strong>Required</strong>
              )}
            </div>
            <p>{item.label}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

function CourseTestPanel({
  track = {},
  week = {},
  day = {},
  test = {},
  result = null,
  draft = {},
  onAnswer = () => {},
  onSubmit = () => {},
  onClose = () => {}
}) {
  const questions = Array.isArray(test.questions) ? test.questions : [];
  const passed = Boolean(result?.passed);

  return (
    <section className="rtbo-academy-live-test" aria-live="polite">
      <div className="rtbo-academy-reader-head">
        <div>
          <p className="eyebrow">Scored Assessment</p>
          <h3>{test.title || `${track.title} Week ${week.week}, Day ${day.day} Test`}</h3>
          <p>{test.instructions || 'Complete the course test. Passing is required before the next module unlocks.'}</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={onClose}>Close Test</button>
        </div>
      </div>

      <div className="rtbo-academy-session-strip">
        <article><span>Type</span><strong>{test.type || 'Course Assessment'}</strong></article>
        <article><span>Questions</span><strong>{questions.length}</strong></article>
        <article><span>Passing Score</span><strong>{test.passingScore || 85}%</strong></article>
        <article><span>Time Limit</span><strong>{test.timeLimitMinutes || 45} min</strong></article>
      </div>

      {result && (
        <article className={`rtbo-academy-test-result ${passed ? 'passed' : 'needs-review'}`}>
          <span>{passed ? 'Passed' : 'Needs Remediation'}</span>
          <strong>{result.score}%</strong>
          <p>{passed ? 'The next module is unlocked.' : 'Review the missed concepts, correct your evidence, and retake the test before advancing.'}</p>
        </article>
      )}

      <form className="rtbo-academy-test-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        {questions.map((question, questionIndex) => {
          const selected = draft[question.id] || '';
          const missed = result?.missed?.some(item => item.questionId === question.id);
          return (
            <fieldset className={missed ? 'is-missed' : ''} key={question.id}>
              <legend>{questionIndex + 1}. {question.prompt}</legend>
              <div className="rtbo-academy-answer-list">
                {(question.options || []).map(option => {
                  const isSelected = selected === option.id;
                  const isCorrect = result && option.id === question.correctOptionId;
                  return (
                    <label className={`${isSelected ? 'is-selected' : ''} ${isCorrect ? 'is-correct' : ''}`.trim()} key={option.id}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => onAnswer(question.id, option.id)}
                        required
                      />
                      <span>{option.id.toUpperCase()}.</span>
                      <b>{option.text}</b>
                    </label>
                  );
                })}
              </div>
              {result && question.explanation && <small>{question.explanation}</small>}
            </fieldset>
          );
        })}

        <label className="rtbo-academy-evidence-response">
          <span>Required Evidence Statement</span>
          <textarea
            value={draft.evidence || ''}
            onChange={(event) => onAnswer('evidence', event.target.value)}
            placeholder={test.evidencePrompt || 'Write the rule source, mechanic, communication choice, and correction target.'}
            required
            minLength={30}
          />
        </label>

        <div className="rtbo-form-toolbar">
          <button className="btn" type="submit">{result?.passed ? 'Retake Test' : result ? 'Submit Retake' : 'Submit Test'}</button>
          {result && <span className="rtbo-academy-test-timestamp">Last submitted {new Date(result.submittedAt).toLocaleString()}</span>}
        </div>
      </form>
    </section>
  );
}

function RTBOAcademy({ user = {}, onStatus = noopStatus, publicMode = false, brandName = 'RTBO Academy', initialTrackId = '' }) {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [query, setQuery] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [overviewTrackId, setOverviewTrackId] = useState('');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [completed, setCompleted] = useLocalJson(STORAGE_KEYS.completed, {});
  const [notes, setNotes] = useLocalJson(STORAGE_KEYS.notes, {});
  const [bookmarks, setBookmarks] = useLocalJson(STORAGE_KEYS.bookmarks, {});
  const [videoPlans, setVideoPlans] = useLocalJson(STORAGE_KEYS.videos, {});
  const [passedTests, setPassedTests] = useLocalJson(STORAGE_KEYS.tests, {});
  const [testResults, setTestResults] = useLocalJson(STORAGE_KEYS.testResults, {});
  const [testDrafts, setTestDrafts] = useState({});
  const [openTestId, setOpenTestId] = useState('');
  const [managedCourses, setManagedCourses] = useState([]);

  useEffect(() => {
    document.title = publicMode ? `${brandName} | RTBO Education` : 'RTBO Academy | Education Workspace';
    fetch(MANUAL_URL)
      .then(response => response.ok ? response.text() : Promise.reject(new Error('Manual unavailable')))
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        onStatus('RTBO Academy course manual could not be loaded.');
      });
  }, [brandName, onStatus, publicMode]);

  useEffect(() => {
    let active = true;
    async function loadManagedCourses(event) {
      if (Array.isArray(event?.detail?.courses)) {
        setManagedCourses(event.detail.courses);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/refzone-courses.php`, { credentials: 'include' });
        const data = await response.json();
        if (active && data?.managed && Array.isArray(data.courses)) setManagedCourses(data.courses);
      } catch {
        if (active && publicMode) {
          setManagedCourses([]);
          onStatus('Sign in and enroll in a RefZone University membership to access course materials.');
          return;
        }
        try {
          const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.courses) || '[]');
          if (active && Array.isArray(stored) && stored.length) {
            setManagedCourses(stored);
            return;
          }
          const starter = await fetch('/refzone-course-materials.json').then(response => response.json());
          if (active && Array.isArray(starter.courses)) setManagedCourses(starter.courses);
        } catch {
          if (active) setManagedCourses([]);
        }
      }
    }
    loadManagedCourses();
    window.addEventListener(REFZONE_COURSES_EVENT, loadManagedCourses);
    window.addEventListener('storage', loadManagedCourses);
    return () => {
      active = false;
      window.removeEventListener(REFZONE_COURSES_EVENT, loadManagedCourses);
      window.removeEventListener('storage', loadManagedCourses);
    };
  }, [onStatus, publicMode]);

  const tracks = useMemo(() => {
    const managedTracks = managedCourses.filter(course => (course.status || 'active') === 'active').map(managedCourseToTrack);
    const rows = publicMode ? managedTracks : (managedTracks.length ? managedTracks : splitCourse(markdown));
    return [...rows].sort((a, b) => {
      if (a.id === 'overview') return -1;
      if (b.id === 'overview') return 1;
      if (a.id === 'nfhs') return -1;
      if (b.id === 'nfhs') return 1;
      return 0;
    });
  }, [managedCourses, markdown, publicMode]);
  const defaultTrack = useMemo(() => tracks.find(track => track.weeks?.length) || tracks[0], [tracks]);
  const selectedTrack = useMemo(() => tracks.find(track => track.id === selectedTrackId) || defaultTrack, [defaultTrack, tracks, selectedTrackId]);
  const overviewTrack = useMemo(() => tracks.find(track => track.id === overviewTrackId) || selectedTrack, [overviewTrackId, selectedTrack, tracks]);
  const selectedWeek = selectedTrack?.weeks?.[selectedWeekIndex] || selectedTrack?.weeks?.[0];
  const selectedDay = selectedWeek?.days?.[selectedDayIndex] || selectedWeek?.days?.[0];
  const requestedTrackId = String(initialTrackId || '').trim();

  useEffect(() => {
    if ((!selectedTrackId || !tracks.some(track => track.id === selectedTrackId)) && defaultTrack) setSelectedTrackId(defaultTrack.id);
  }, [defaultTrack, tracks, selectedTrackId]);

  useEffect(() => {
    if (!requestedTrackId || !tracks.some(track => track.id === requestedTrackId)) return;
    setSelectedTrackId(requestedTrackId);
    setSelectedWeekIndex(0);
    setSelectedDayIndex(0);
    setOpenTestId('');
    setActiveView('course');
  }, [requestedTrackId, tracks]);

  const allDays = useMemo(() => {
    const rows = [];
    tracks.forEach(track => track.weeks.forEach(week => week.days.forEach(day => {
      const material = collegeMaterialForDay(track, week, day);
      rows.push({
        track,
        week,
        day,
        text: [
          track.title,
          week.title,
          day.title,
          material.preparation,
          material.media,
          ...textList(material.objectives),
          ...textList(material.readings),
          ...textList(material.lectureNotes),
          ...textList(material.discussion),
          material.lab,
          material.assignment,
          material.assessment?.prompt,
          ...textList(material.rubric),
          day.test?.title,
          day.test?.instructions,
          day.test?.evidencePrompt,
          ...(day.test?.questions || []).flatMap(question => [
            question.prompt,
            ...(question.options || []).map(option => option.text)
          ]),
          ...day.content,
          ...day.sections.flatMap(section => [
            section.title,
            section.summary,
            section.materialType,
            section.collegeRole,
            section.presentation,
            ...section.content
          ])
        ].filter(Boolean).join(' ')
      });
    })));
    return rows;
  }, [tracks]);

  const searchResults = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    return allDays.filter(row => row.text.toLowerCase().includes(value)).slice(0, 80);
  }, [query, allDays]);

  const stats = useMemo(() => {
    const totalWeeks = tracks.reduce((sum, track) => sum + track.weeks.length, 0);
    const completedDays = Object.keys(completed).filter(id => completed[id]).length;
    const percent = allDays.length ? Math.round((completedDays / allDays.length) * 100) : 0;
    return { tracks: tracks.length, weeks: totalWeeks, days: allDays.length, completedDays, percent };
  }, [tracks, allDays, completed]);

  const academyViewTabs = [
    ['dashboard', 'Dashboard'],
    ['syllabus', 'Syllabus'],
    ['course', 'Course Home'],
    ['materials', 'Study Materials'],
    ['search', 'Search Manual'],
    ['assignments', 'Assignments'],
    ['videos', 'Video Plan'],
    ['film', 'Film Lab'],
    ['court', 'Court Lab'],
    ['roleplay', 'Role Play'],
    ['certifications', 'Certifications'],
    ...(!publicMode ? [['admin', 'Admin Controls']] : [])
  ];

  const dayText = selectedDay ? [
    ...selectedDay.content,
    ...selectedDay.sections.flatMap(section => [`#### ${section.title}`, ...section.content])
  ].join('\n') : plainText(selectedTrack?.raw || []) || 'Select a day to begin.';
  const selectedDayVisual = selectedDay ? dayVisualFor(selectedDay) : null;
  const selectedTest = selectedDay ? testForDay(selectedTrack, selectedWeek, selectedDay) : null;
  const selectedTestResult = selectedDay ? testResults[selectedDay.id] : null;
  const selectedTestDraft = selectedDay ? (testDrafts[selectedDay.id] || selectedTestResult?.answers || {}) : {};
  const selectedTestOpen = Boolean(selectedDay && openTestId === selectedDay.id);
  const selectedMaterial = selectedDay ? collegeMaterialForDay(selectedTrack, selectedWeek, selectedDay) : null;
  const selectedTrackProgress = useMemo(() => courseProgressFor(selectedTrack, completed, passedTests), [selectedTrack, completed, passedTests]);
  const selectedTrackLessons = selectedTrackProgress.lessons;
  const selectedLessonNumber = selectedTrackLessons.findIndex(row => row.day.id === selectedDay?.id) + 1;
  const followingCourseLesson = selectedTrackLessons[selectedLessonNumber] || null;
  const nextCourseLesson = selectedTrackLessons.find(row => !completed[row.day.id] || !passedTests[row.day.id]) || selectedTrackLessons[0] || null;

  function dayTestPassed(dayId) {
    return Boolean(passedTests[dayId]);
  }

  function academyDayGate(track, dayId) {
    if (!track?.weeks?.length || !dayId) return { open: true, previousDay: null };
    const days = track.weeks.flatMap(week => week.days);
    const index = days.findIndex(day => day.id === dayId);
    if (index <= 0) return { open: true, previousDay: null };
    const previousDay = days[index - 1];
    return { open: dayTestPassed(previousDay.id), previousDay };
  }

  function openAcademyDay(track, weekIndex, dayIndex) {
    const targetWeek = track?.weeks?.[weekIndex];
    const targetDay = targetWeek?.days?.[dayIndex];
    const gate = academyDayGate(track, targetDay?.id);
    if (!gate.open) {
      onStatus(`Pass the test for ${gate.previousDay.title} before moving to the next module or section.`);
      return;
    }
    setSelectedWeekIndex(weekIndex);
    setSelectedDayIndex(dayIndex);
    setOpenTestId('');
  }

  function openAcademyWeek(track, weekIndex) {
    const targetWeek = track?.weeks?.[weekIndex];
    const firstDay = targetWeek?.days?.[0];
    const gate = academyDayGate(track, firstDay?.id);
    if (!gate.open) {
      onStatus(`Pass the test for ${gate.previousDay.title} before moving to the next module.`);
      return;
    }
    setSelectedWeekIndex(weekIndex);
    setSelectedDayIndex(0);
    setOpenTestId('');
  }

  function openCourseOverview(track) {
    setOverviewTrackId(track.id);
    setActiveView('overview');
  }

  function proceedToCourse(track) {
    setSelectedTrackId(track.id);
    setSelectedWeekIndex(0);
    setSelectedDayIndex(0);
    setOpenTestId('');
    setActiveView('course');
  }

  function markDay(dayId, value) {
    if (value && !dayTestPassed(dayId)) {
      onStatus('Take and pass this Academy test before marking the module complete.');
      return;
    }
    setCompleted(current => ({ ...current, [dayId]: value }));
    onStatus(value ? 'Academy day marked complete.' : 'Academy day marked incomplete.');
  }

  function openDayTest(dayId) {
    setOpenTestId(dayId);
    onStatus('Complete the 25-question assessment. An 85% score is required before the next module unlocks.');
  }

  function updateTestDraft(dayId, key, value) {
    setTestDrafts(current => ({
      ...current,
      [dayId]: {
        ...(current[dayId] || testResults[dayId]?.answers || {}),
        [key]: value
      }
    }));
  }

  function submitDayTest(day, test) {
    const questions = Array.isArray(test?.questions) ? test.questions : [];
    const answers = testDrafts[day.id] || testResults[day.id]?.answers || {};
    const evidence = String(answers.evidence || '').trim();
    const unanswered = questions.filter(question => !answers[question.id]);
    if (unanswered.length) {
      onStatus(`Answer all ${questions.length} questions before submitting this test.`);
      return;
    }
    if (evidence.length < 30) {
      onStatus('Add the required evidence statement before submitting this test.');
      return;
    }
    const missed = questions
      .filter(question => answers[question.id] !== question.correctOptionId)
      .map(question => ({
        questionId: question.id,
        prompt: question.prompt,
        selectedOptionId: answers[question.id],
        correctOptionId: question.correctOptionId,
        explanation: question.explanation || ''
      }));
    const correctCount = questions.length - missed.length;
    const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    const passingScore = Number(test.passingScore || 85);
    const passed = score >= passingScore;
    const result = {
      testId: test.id,
      score,
      correctCount,
      questionCount: questions.length,
      passingScore,
      passed,
      missed,
      evidence,
      answers,
      submittedAt: new Date().toISOString()
    };
    setTestResults(current => ({ ...current, [day.id]: result }));
    setPassedTests(current => ({ ...current, [day.id]: passed }));
    if (!passed) {
      setCompleted(current => ({ ...current, [day.id]: false }));
    }
    onStatus(passed ? `Assessment passed with ${score}%. The next module is unlocked.` : `Assessment score: ${score}%. You need ${passingScore}% to pass.`);
  }

  function resetCourseProgress(track) {
    const dayIds = new Set((track?.weeks || []).flatMap(week => (week.days || []).map(day => day.id)));
    setCompleted(current => Object.fromEntries(Object.entries(current).filter(([id]) => !dayIds.has(id))));
    setPassedTests(current => Object.fromEntries(Object.entries(current).filter(([id]) => !dayIds.has(id))));
    setTestResults(current => Object.fromEntries(Object.entries(current).filter(([id]) => !dayIds.has(id))));
    setTestDrafts(current => Object.fromEntries(Object.entries(current).filter(([id]) => !dayIds.has(id))));
    onStatus(`${track?.title || 'Course'} test progress was reset.`);
  }

  function toggleBookmark(dayId) {
    setBookmarks(current => ({ ...current, [dayId]: !current[dayId] }));
  }

  function updateVideoPlan(dayId, value) {
    setVideoPlans(current => ({ ...current, [dayId]: value }));
  }

  function openResult(row) {
    const gate = academyDayGate(row.track, row.day.id);
    if (!gate.open) {
      onStatus(`Pass the test for ${gate.previousDay.title} before opening this module or section.`);
      return;
    }
    setSelectedTrackId(row.track.id);
    setSelectedWeekIndex(row.track.weeks.findIndex(week => week.id === row.week.id));
    setSelectedDayIndex(row.week.days.findIndex(day => day.id === row.day.id));
    setActiveView('course');
  }

  if (loading) {
    return (
      <section className={`${publicMode ? 'rtbo-public-academy-shell' : 'rtbo-dashboard-card'} rtbo-academy-page`}>
        <p className="rtbo-empty-state">Loading {brandName} course manual...</p>
      </section>
    );
  }

  if (!tracks.length) {
    return (
      <section className={`${publicMode ? 'rtbo-public-academy-shell' : 'rtbo-dashboard-card'} rtbo-academy-page`}>
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">Education</p>
            <h3>{brandName}</h3>
            <p>The Academy manual did not load. Confirm that course-manual.md is available in the frontend public folder.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${publicMode ? 'rtbo-public-academy-shell' : 'rtbo-dashboard-card'} rtbo-academy-page`}>
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">{publicMode ? 'RefZone University' : 'Education Workspace'}</p>
          <h3>{brandName}</h3>
          <p>{publicMode ? 'A Coursera-style officiating course with modules, video planning, lessons, tests, quizzes, notes, progress tracking, and certification readiness.' : 'College-style training paths with daily coursework, evidence, labs, video planning, and advancement tracking.'}</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={() => window.print()}>Print View</button>
          <a className="btn secondary dark-btn" href={MANUAL_URL} download>Download Manual</a>
          {selectedTrack && <button className="btn secondary dark-btn" type="button" onClick={() => resetCourseProgress(selectedTrack)}>Reset Test Progress</button>}
        </div>
      </div>

      <div className="rtbo-academy-topbar">
        {academyViewTabs.map(([id, label]) => (
          <button className={activeView === id ? 'active' : ''} type="button" key={id} onClick={() => setActiveView(id)}>{label}</button>
        ))}
      </div>

      {activeView === 'dashboard' && (
        <div className="rtbo-academy-dashboard">
          <section className="rtbo-academy-hero">
            <div>
              <p className="eyebrow">Raising The Bar Officiating</p>
              <h3>{publicMode ? brandName : 'RTBO Academy University'}</h3>
              <p>A full official-development course flow for tracks, weekly modules, daily performance tasks, lab evidence, film study, mentor review, and advancement board readiness.</p>
              <span className="rtbo-academy-track-media rtbo-academy-overview-media">
                <img src={COURSE_OVERVIEW_THUMBNAIL} alt="RefZone University complete college course manual overview thumbnail" loading="lazy" decoding="async" />
              </span>
              <button className="btn" type="button" onClick={() => openCourseOverview(defaultTrack)}>Open Course Browser</button>
            </div>
            <article>
              <span>Overall Progress</span>
              <strong>{stats.percent}%</strong>
              <div className="rtbo-academy-progress"><span style={{ width: `${stats.percent}%` }} /></div>
              <small>{stats.completedDays} of {stats.days} academic days complete</small>
            </article>
          </section>

          <div className="rtbo-academy-metrics">
            <AcademyMetric label="Tracks" value={stats.tracks} detail="Degree pathways loaded" />
            <AcademyMetric label="Weeks" value={stats.weeks} detail="Academic modules" />
            <AcademyMetric label="Academic Days" value={stats.days} detail="Daily lessons" />
            <AcademyMetric label="Completed" value={stats.completedDays} detail="Student progress" />
          </div>

          <section className="rtbo-academy-panel">
            <div className="rtbo-academy-section-head">
              <p className="eyebrow">Schools and Tracks</p>
              <h3>Degree Pathways</h3>
            </div>
            <div className="rtbo-academy-track-grid">
              {tracks.map((track, index) => {
                const days = track.weeks.flatMap(week => week.days);
                const done = days.filter(day => completed[day.id]).length;
                const passed = days.filter(day => passedTests[day.id]).length;
                const pct = days.length ? Math.round((done / days.length) * 100) : 0;
                const courseImage = courseImageFor(track, index);
                const courseImageSrc = courseImage.startsWith('/') ? courseImage : `/assets/images/${courseImage}`;
                return (
                  <button className="rtbo-academy-track-card" type="button" key={track.id} onClick={() => openCourseOverview(track)}>
                    <span className="rtbo-academy-track-media">
                      <img src={courseImageSrc} alt={`${track.title} course preview`} loading="lazy" decoding="async" />
                    </span>
                    <span>{track.level || 'Academic Track'}</span>
                    <strong>{track.title}</strong>
                    <small>{track.path || 'College-style officiating pathway'}</small>
                    <div className="rtbo-academy-progress"><span style={{ width: `${pct}%` }} /></div>
                    <b>{done} / {days.length} days complete / {passed} tests passed</b>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeView === 'overview' && overviewTrack && (
        <>
          <section className="rtbo-academy-panel">
            <div className="rtbo-academy-section-head">
              <p className="eyebrow">Course Overview</p>
              <h3>{overviewTrack.title}</h3>
              <p>{overviewTrack.path || 'RefZone University course overview'}</p>
            </div>
            <span className="rtbo-academy-track-media rtbo-academy-overview-media">
              <img src={(courseImageFor(overviewTrack, 0).startsWith('/') ? courseImageFor(overviewTrack, 0) : `/assets/images/${courseImageFor(overviewTrack, 0)}`)} alt={`${overviewTrack.title} course overview thumbnail`} loading="lazy" decoding="async" />
            </span>
            <div className="rtbo-academy-card-grid">
              <article className="rtbo-academy-task-card"><strong>{overviewTrack.weeks.length} Weeks</strong><p>Daily lectures, readings, quizzes, video tests, mechanics labs, role-play, practicum, and mentor review.</p></article>
              <article className="rtbo-academy-task-card"><strong>{overviewTrack.weeks.reduce((sum, week) => sum + week.days.length, 0)} Academic Days</strong><p>Each day includes required reading, visual aids, assignments, evidence, and a passing standard.</p></article>
              <article className="rtbo-academy-task-card"><strong>Completion Rule</strong><p>Each module requires a 25-question test with an 85% passing score before the next module or section unlocks.</p></article>
            </div>
            <button className="btn" type="button" onClick={() => proceedToCourse(overviewTrack)}>Proceed to Course</button>
          </section>
          <CourseSyllabus track={overviewTrack} />
        </>
      )}

      {activeView === 'syllabus' && selectedTrack && (
        <CourseSyllabus track={selectedTrack} />
      )}

      {activeView === 'course' && selectedTrack && (
        <div className="rtbo-coursera-course rtbo-coursera-course-shell">
          <section className="rtbo-coursera-topbar" aria-label="Course player controls">
            <div className="rtbo-coursera-brand">
              <strong>RefZone University</strong>
              <span>RTBO</span>
            </div>
            <div className="rtbo-coursera-top-progress">
              <span>{selectedTrackProgress.completedLessons}/{selectedTrackLessons.length} learning items</span>
              <div className="rtbo-academy-progress"><span style={{ width: `${selectedTrackProgress.percent}%` }} /></div>
            </div>
            <div className="rtbo-coursera-top-actions">
              <button className="btn secondary dark-btn" type="button" onClick={() => setActiveView('dashboard')}>Course Dashboard</button>
            </div>
          </section>

          <div className="rtbo-coursera-layout rtbo-coursera-workspace">
            <aside className="rtbo-coursera-sidebar" aria-label="Course content">
              <div className="rtbo-coursera-course-title">
                <strong>{selectedTrack.title}</strong>
                <button type="button" aria-label="Close course player" onClick={() => setActiveView('dashboard')}>x</button>
              </div>
              <label className="rtbo-coursera-track-select">Course Path
                <select
                  value={selectedTrack.id}
                  onChange={(event) => {
                    setSelectedTrackId(event.target.value);
                    setSelectedWeekIndex(0);
                    setSelectedDayIndex(0);
                    setOpenTestId('');
                  }}
                >
                  {tracks.map(track => <option key={track.id} value={track.id}>{track.title}</option>)}
                </select>
              </label>
              <div className="rtbo-coursera-module-list">
                {selectedTrack.weeks.map((week, weekIndex) => {
                  const weekRows = selectedTrackLessons.filter(row => row.week.id === week.id);
                  const weekDone = weekRows.filter(row => completed[row.day.id] && passedTests[row.day.id]).length;
                  const weekGate = academyDayGate(selectedTrack, week.days[0]?.id);
                  return (
                    <section className={`${weekIndex === selectedWeekIndex ? 'is-active' : ''} ${weekGate.open ? '' : 'is-locked'}`.trim()} key={week.id}>
                      <button
                        className="rtbo-coursera-module-head"
                        type="button"
                        disabled={!weekGate.open}
                        onClick={() => openAcademyWeek(selectedTrack, weekIndex)}
                      >
                        <span>Module {week.week}</span>
                        <strong>{week.title}</strong>
                        <small>{weekGate.open ? `${weekDone} / ${weekRows.length} completed` : `Locked until ${weekGate.previousDay?.title || 'previous test'} is passed`}</small>
                      </button>
                      <div className="rtbo-coursera-lesson-list">
                        {week.days.map((day, dayIndex) => {
                          const gate = academyDayGate(selectedTrack, day.id);
                          const isActive = weekIndex === selectedWeekIndex && dayIndex === selectedDayIndex;
                          const isComplete = completed[day.id] && passedTests[day.id];
                          const material = collegeMaterialForDay(selectedTrack, week, day);
                          const lessonKind = lessonKindFor(day, material);
                          return (
                            <button
                              className={`${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''} ${gate.open ? '' : 'is-locked'}`.trim()}
                              type="button"
                              key={day.id}
                              disabled={!gate.open}
                              title={gate.open ? day.title : `Pass ${gate.previousDay?.title || 'the previous test'} first`}
                              onClick={() => openAcademyDay(selectedTrack, weekIndex, dayIndex)}
                            >
                              <i aria-hidden="true" />
                              <span>{gate.open ? day.title : 'Complete the previous assessment'}</span>
                              <small>{gate.open ? `${lessonKind} / ${material.minutes || 90} min` : 'Locked'}</small>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </aside>

            <main className="rtbo-coursera-main rtbo-coursera-stage">
              {selectedDay && (
                <>
                  <section className="rtbo-coursera-player">
                    <div className="rtbo-coursera-player-media" role="img" aria-label={`${selectedDayVisual.title} lesson player`}>
                      <img src={selectedDayVisual.image} alt={`${selectedDayVisual.title} lesson visual`} loading="lazy" decoding="async" />
                      <button type="button" className="rtbo-coursera-play-button" onClick={() => openDayTest(selectedDay.id)} aria-label="Open lesson assessment">
                        <span aria-hidden="true" />
                      </button>
                    </div>
                  </section>

                  <section className="rtbo-coursera-content-band">
                    <div className="rtbo-coursera-lesson-head">
                      <div>
                        <p className="eyebrow">Module {selectedWeek?.week} / Day {selectedDay.day}</p>
                        <h3>{selectedDay.title}</h3>
                      </div>
                      <button className="btn secondary dark-btn" type="button" onClick={() => toggleBookmark(selectedDay.id)}>
                        {bookmarks[selectedDay.id] ? 'Note Saved' : 'Save Note'}
                      </button>
                    </div>

                    <article className="rtbo-coursera-ai-card">
                      <div className="rtbo-coursera-ai-card-head">
                        <span aria-hidden="true">*</span>
                        <strong>Dive deeper on this topic</strong>
                        <button type="button" aria-label="Collapse topic prompts">^</button>
                      </div>
                      <div className="rtbo-coursera-ai-actions">
                        <button type="button">Give me practice questions</button>
                        <button type="button">Explain this topic in simple terms</button>
                        <button type="button">Give me a summary</button>
                        <button type="button">Give me real-life examples</button>
                      </div>
                    </article>

                    <div className="rtbo-coursera-action-row">
                      <button className="btn secondary dark-btn" type="button" onClick={() => openDayTest(selectedDay.id)}>
                        {dayTestPassed(selectedDay.id) ? `Passed ${selectedTestResult?.score || 0}%` : 'Take Assessment'}
                      </button>
                      <button className="btn secondary dark-btn" type="button" onClick={() => markDay(selectedDay.id, !completed[selectedDay.id])}>
                        {completed[selectedDay.id] ? 'Mark Incomplete' : 'Mark Complete'}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        disabled={!followingCourseLesson}
                        onClick={() => followingCourseLesson && openAcademyDay(selectedTrack, followingCourseLesson.weekIndex, followingCourseLesson.dayIndex)}
                      >
                        Go to next item -&gt;
                      </button>
                    </div>
                  </section>

                  <section className="rtbo-coursera-resource-grid" aria-label="Lesson materials">
                    <article>
                      <span>Required Reading</span>
                      <ul>{textList(selectedMaterial?.readings).slice(0, 3).map(item => <li key={item}>{item}</li>)}</ul>
                    </article>
                    <article>
                      <span>Lecture Notes</span>
                      <ul>{textList(selectedMaterial?.lectureNotes).slice(0, 3).map(item => <li key={item}>{item}</li>)}</ul>
                    </article>
                    <article>
                      <span>Discussion</span>
                      <ul>{textList(selectedMaterial?.discussion).slice(0, 3).map(item => <li key={item}>{item}</li>)}</ul>
                    </article>
                    <article>
                      <span>Lab and Assignment</span>
                      <p>{selectedMaterial?.lab}</p>
                      <p>{selectedMaterial?.assignment}</p>
                    </article>
                  </section>

                  <section className="rtbo-coursera-content-band">
                    <div className="rtbo-coursera-section-title">
                      <p className="eyebrow">Lesson Overview</p>
                      <h4>What you will learn</h4>
                    </div>
                    <div className="rtbo-coursera-objectives">
                      {textList(selectedMaterial?.objectives).slice(0, 4).map(item => <span key={item}>{item}</span>)}
                    </div>
                    <div className="rtbo-academy-markdown"><MarkdownBlock text={dayText} /></div>
                  </section>

                  <section className="rtbo-coursera-assessment-card">
                    <div>
                      <p className="eyebrow">Assessment</p>
                      <h4>Required 25-Question Module Test</h4>
                      <p>Score at least 85% before the next module or section unlocks. The existing advancement rule remains in force.</p>
                      {selectedTestResult && <small>Latest score: {selectedTestResult.score}% / {selectedTestResult.correctCount} of {selectedTestResult.questionCount} correct</small>}
                    </div>
                    <button className="btn" type="button" onClick={() => openDayTest(selectedDay.id)}>
                      {dayTestPassed(selectedDay.id) ? 'Review / Retake Test' : 'Open Test'}
                    </button>
                  </section>

                  {selectedTestOpen && selectedTest && (
                    <CourseTestPanel
                      track={selectedTrack}
                      week={selectedWeek}
                      day={selectedDay}
                      test={selectedTest}
                      result={selectedTestResult}
                      draft={selectedTestDraft}
                      onAnswer={(key, value) => updateTestDraft(selectedDay.id, key, value)}
                      onSubmit={() => submitDayTest(selectedDay, selectedTest)}
                      onClose={() => setOpenTestId('')}
                    />
                  )}

                  <section className="rtbo-coursera-notes-card">
                    <h4>Student Notes, Evidence, and Mentor Feedback</h4>
                    <textarea
                      value={notes[selectedDay.id] || ''}
                      onChange={(event) => setNotes(current => ({ ...current, [selectedDay.id]: event.target.value }))}
                      placeholder="Record film notes, mechanics corrections, professor feedback, mentor notes, role-play performance, and completion evidence."
                    />
                  </section>
                </>
              )}
            </main>

            <aside className="rtbo-coursera-aside rtbo-coursera-tool-rail" aria-label="Course tools">
              <button type="button" onClick={() => setActiveView('materials')}><span aria-hidden="true">T</span>Transcript</button>
              <button type="button" disabled={!selectedDay} onClick={() => selectedDay && toggleBookmark(selectedDay.id)}><span aria-hidden="true">N</span>Notes</button>
              <button type="button" onClick={() => setActiveView('materials')}><span aria-hidden="true">F</span>Files</button>
            </aside>
          </div>
        </div>
      )}

      {activeView === 'materials' && selectedTrack && selectedWeek && selectedDay && (
        <CourseMaterialPacket track={selectedTrack} week={selectedWeek} day={selectedDay} />
      )}

      {activeView === 'search' && (
        <section className="rtbo-academy-panel">
          <div className="rtbo-academy-section-head">
            <p className="eyebrow">Search</p>
            <h3>Find Course Content</h3>
          </div>
          <label className="rtbo-academy-search">Search Manual
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by rule, mechanics, film lab, role-play, or track" />
          </label>
          <div className="rtbo-academy-result-list">
            {searchResults.map(row => (
              <button className="rtbo-academy-result-card" type="button" key={row.day.id} onClick={() => openResult(row)}>
                <span>{row.track.title} / Week {row.week.week}</span>
                <strong>{row.day.title}</strong>
                <small>{row.text.slice(0, 260)}...</small>
              </button>
            ))}
            {query && !searchResults.length && <p className="rtbo-empty-state">No results found.</p>}
          </div>
        </section>
      )}

      {activeView === 'assignments' && (
        <section className="rtbo-academy-panel">
          <div className="rtbo-academy-section-head">
            <p className="eyebrow">Academic Work</p>
            <h3>Assignments and Evidence Requirements</h3>
          </div>
          <div className="rtbo-academy-card-grid">
            {[
              ['Daily Journal', 'Write rule, mechanics, communication, and reflection evidence for each day.'],
              ['Film Lab Worksheet', 'Identify primary coverage, positioning, call/no-call logic, and teaching points.'],
              ['Court Lab Rubric', 'Grade movement, visual angle, whistle, signal, mechanics, and crew communication.'],
              ['Role-Play Score', 'Perform coach, player, partner, and supervisor communication under pressure.'],
              ['Mentor Conference', 'Record readiness, remediation, and advancement recommendation.'],
              ['Portfolio Defense', 'Defend completed work before the RTBO advancement board.']
            ].map(([title, body]) => <article className="rtbo-academy-task-card" key={title}><strong>{title}</strong><p>{body}</p></article>)}
          </div>
        </section>
      )}

      {activeView === 'videos' && (
        <section className="rtbo-academy-panel">
          <div className="rtbo-academy-section-head">
            <p className="eyebrow">Production Plan</p>
            <h3>Training Video Workflow</h3>
            <p>Each module is ready for video planning, upload links, and production tracking. Source footage or recorded instruction will be needed to create the final videos.</p>
          </div>
          <div className="rtbo-academy-video-grid">
            {videoProductionStages.map(([title, body]) => <article className="rtbo-academy-task-card" key={title}><strong>{title}</strong><p>{body}</p><span>Planned</span></article>)}
          </div>
          <div className="rtbo-academy-video-list">
            {selectedWeek?.days.map(day => (
              <label key={day.id}>
                <span>Week {selectedWeek.week}, Day {day.day}: {day.title}</span>
                <input value={videoPlans[day.id] || ''} onChange={(event) => updateVideoPlan(day.id, event.target.value)} placeholder="Training video URL, script location, or production note" />
              </label>
            ))}
          </div>
        </section>
      )}

      {activeView === 'film' && <LabView title="Film Laboratory" rows={filmTasks} />}
      {activeView === 'court' && <LabView title="Court Mechanics Laboratory" rows={courtTasks} />}
      {activeView === 'roleplay' && <LabView title="Role-Play and Oral Defense Laboratory" rows={rolePlayTasks} />}

      {activeView === 'certifications' && (
        <section className="rtbo-academy-panel">
          <div className="rtbo-academy-section-head">
            <p className="eyebrow">Graduation Path</p>
            <h3>Certifications and Advancement Board</h3>
          </div>
          <div className="rtbo-academy-timeline">
            {tracks.map(track => {
              const days = track.weeks.flatMap(week => week.days);
              const pct = days.length ? Math.round((days.filter(day => completed[day.id] && passedTests[day.id]).length / days.length) * 100) : 0;
              return (
                <article key={track.id}>
                  <strong>{track.title}</strong>
                  <p>{track.path}</p>
                  <div className="rtbo-academy-progress"><span style={{ width: `${pct}%` }} /></div>
                  <small>{pct}% complete with passed tests / advancement board unlocks at 100%</small>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!publicMode && activeView === 'admin' && (
        <section className="rtbo-academy-panel">
          <div className="rtbo-academy-section-head">
            <p className="eyebrow">Super Admin</p>
            <h3>Course Administration Controls</h3>
          </div>
          <div className="rtbo-academy-card-grid">
            {[
              ['Assign Tracks', 'Place officials into NJCAA, NAIA, NCAA, WNBA, NBA, mentor, or observer pathways.'],
              ['Unlock Modules', 'Control access by role, ranking, score, assignment level, or mentor approval.'],
              ['Review Evidence', 'Review journals, film worksheets, role-play scores, court rubrics, and evaluator notes.'],
              ['Manage Faculty', 'Add instructors, mentors, observers, evaluators, and advancement board members.'],
              ['Certification Rules', 'Set graduation requirements and advancement board thresholds.'],
              ['Export Reports', 'Generate student progress reports, certificates, transcripts, and assignment readiness lists.']
            ].map(([title, body]) => <article className="rtbo-academy-task-card" key={title}><strong>{title}</strong><p>{body}</p></article>)}
          </div>
          {!['super_admin', 'admin'].includes(user.role) && <p className="rtbo-empty-state">Admin controls are visible here as the course workflow plan. Production editing should be restricted to Admin and Super Admin accounts.</p>}
        </section>
      )}
    </section>
  );
}

export default RTBOAcademy;
