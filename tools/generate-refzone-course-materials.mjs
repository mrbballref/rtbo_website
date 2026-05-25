#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manualPath = path.join(repoRoot, 'frontend', 'public', 'course-manual.md');
const publicRoot = path.join(repoRoot, 'frontend', 'public');
const coverDir = path.join(publicRoot, 'assets', 'images', 'refzone', 'course-covers');
const overviewDir = path.join(publicRoot, 'assets', 'images', 'refzone', 'course-overviews');
const visualDir = path.join(publicRoot, 'assets', 'images', 'refzone', 'lesson-visuals');
const screenshotDir = path.join(publicRoot, 'assets', 'images', 'refzone', 'course-screenshots');
const dailyVisualAidDir = path.join(publicRoot, 'assets', 'images', 'refzone', 'course-visual-aids');
const docsRoot = path.join(repoRoot, 'docs', 'refzone-university');
const publicMaterialsRoot = path.join(publicRoot, 'refzone-university');
const visualDocsDir = path.join(docsRoot, 'visual-materials');
const presentationDir = path.join(docsRoot, 'presentation-outlines');
const coursePacketDir = path.join(docsRoot, 'course-packets');
const learnerSlidesDir = path.join(docsRoot, 'learner-slides');
const instructorPresentationDir = path.join(docsRoot, 'presentations');
const worksheetDir = path.join(docsRoot, 'worksheets');
const assessmentEvidenceDir = path.join(docsRoot, 'assessment-evidence');
const publicCoursePacketDir = path.join(publicMaterialsRoot, 'course-packets');
const publicLearnerSlidesDir = path.join(publicMaterialsRoot, 'learner-slides');
const publicInstructorPresentationDir = path.join(publicMaterialsRoot, 'presentations');
const publicWorksheetDir = path.join(publicMaterialsRoot, 'worksheets');
const publicAssessmentEvidenceDir = path.join(publicMaterialsRoot, 'assessment-evidence');
const manifestPath = path.join(publicRoot, 'refzone-course-materials.json');

const dayVisuals = [
  {
    key: 'lecture',
    match: /lecture|seminar/i,
    title: 'Professor Lecture',
    proof: 'Concept map, classroom screenshot, instructor talking points',
    icon: 'LECTURE'
  },
  {
    key: 'rules',
    match: /rules|case/i,
    title: 'Rules and Case Plays',
    proof: 'Rulebook excerpt panel, case-play decision tree, written-answer template',
    icon: 'RULE'
  },
  {
    key: 'court-lab',
    match: /court|mechanics/i,
    title: 'Court Mechanics Lab',
    proof: 'Half-court positioning diagram, rotation arrows, visual-angle checkpoints',
    icon: 'COURT'
  },
  {
    key: 'film-lab',
    match: /film|self-scout/i,
    title: 'Film Laboratory',
    proof: 'Clip screenshot frame, freeze-frame callout, primary-coverage tags',
    icon: 'FILM'
  },
  {
    key: 'role-play',
    match: /role|oral|communication/i,
    title: 'Role-Play and Oral Defense',
    proof: 'Scenario card, dialogue rubric, supervisor-defense slide',
    icon: 'VOICE'
  },
  {
    key: 'live-practicum',
    match: /live|scrimmage|practicum|livestream/i,
    title: 'Live Practicum',
    proof: 'Game-flow screenshot, observer checklist, live-performance evidence panel',
    icon: 'LIVE'
  },
  {
    key: 'reflection',
    match: /reflection|remediation|mentor|advancement/i,
    title: 'Reflection and Mentor Review',
    proof: 'Journal prompt, remediation tracker, mentor sign-off card',
    icon: 'REVIEW'
  }
];

const nfhsWeekTopics = [
  'Orientation and Professional Identity',
  'NFHS Rules Architecture and Definitions',
  'Pre-Game Duties and Crew Preparation',
  'Game Administration, Equipment, Uniforms, and Court Standards',
  'Live Ball, Dead Ball, Timing, and Clock Awareness',
  'Player Control, Team Control, Frontcourt, and Backcourt',
  'Throw-ins, Boundary Lines, Spots, and Designated Spot Administration',
  'Free Throws, Lane Spaces, Violations, and Substitutions',
  'Alternating Possession, Jump Ball, and Held Ball Administration',
  'Primary Coverage and Court Positioning',
  'Two-Person Mechanics Foundations',
  'Three-Person Mechanics Foundations',
  'Lead Official Positioning and Paint Coverage',
  'Trail Official Responsibilities and Perimeter Coverage',
  'Center Official Coverage and Rotation Discipline',
  'Rotations, Switches, and Transition Coverage',
  'Signals, Whistle Discipline, and Table Reporting',
  'Contact Principles and Incidental Contact',
  'Legal Guarding Position and Block/Charge Judgment',
  'Screening, Freedom of Movement, and Off-Ball Contact',
  'Verticality, Rebounding, and Post Play',
  'Shooting Fouls, Continuation, and Try/Act of Shooting',
  'Common Fouls, Intentional Fouls, Technical Fouls, and Flagrant Conduct',
  'Bench Decorum, Head Coach Communication, and Game Management',
  'Unsporting Conduct, Ejections, and Incident Reports',
  'Traveling, Pivot Foot, Gather Awareness, and Footwork Judgment',
  'Dribbling, Palming, Double Dribble, and Ball-Handling Violations',
  'Three Seconds, Ten Seconds, Backcourt, and Closely Guarded Counts',
  'Goaltending, Basket Interference, and Scoring Administration',
  'Substitutions, Timeouts, Correctable Errors, and Administrative Rulings',
  'End-of-Period, Last-Second Shot, and Timing Crew Cooperation',
  'Press Coverage, Traps, and Full-Court Responsibilities',
  'Transition, Fast Breaks, and Secondary Defender Plays',
  'Out-of-Bounds, Loose Ball, and Rebounding Scrums',
  'Advantage/Disadvantage Philosophy and Patient Whistle',
  'Crew Communication, Pregame, Halftime, and Postgame',
  'Table Crew, Scorer, Timer, and Shot Clock if Applicable',
  'Conflict Resolution and Coach/Player Dialogue',
  'Facility, Spectator, Security, Weather, and Emergency Administration',
  'Youth/Scholastic Environment, Student-Athlete Safety, and Education-Based Athletics',
  'Film Study Methodology and Self-Scout',
  'Play-Calling Accuracy, Position Adjustment, and Correction Planning',
  'Partner Feedback, Observer Feedback, and Professional Development',
  'Game Reports, Incident Documentation, and Supervisor Communication',
  'Tournament Readiness and Postseason Expectations',
  'Physical Conditioning, Signals, Voice, and Professional Presence',
  'Bias Awareness, Consistency, and Fairness',
  'Assignment Preparation, Travel, Availability, and Conduct',
  'Advanced Case Plays and Unusual Situations',
  'Mock Game Practicum and Full-Crew Evaluation',
  'Final Written Exam, Oral Defense, and Video Test',
  'Capstone Portfolio, Advancement Board, and Season Development Plan'
];

const nfhsDayFlow = [
  ['Professor Lecture and Socratic Seminar', 'The professor introduces the weekly NFHS thesis, explains the rule and philosophy foundation, questions students orally, and connects the lesson to real high-school game behavior.'],
  ['Rules, Case Plays, and Written Reasoning', 'Students work through rule language, case-play logic, penalty administration, restart language, and written ruling defense.'],
  ['Court Laboratory and Mechanics Performance', 'Students perform the mechanic on the floor through positioning, coverage, whistle, signal, table report, rotation, and crew-communication laboratories.'],
  ['Film Laboratory and Self-Scout Analysis', 'Students study clips, freeze frames, primary coverage, positioning, contact effect, and supervisor-style film notes.'],
  ['Role-Play, Communication, and Oral Defense', 'Students practice coach, player, partner, scorer, timer, administrator, and observer communication under pressure.'],
  ['Live Practicum, Scrimmage, or Livestream Observation', 'Students apply the weekly topic in a live, scrimmage, simulated, or livestream-observation setting and submit evaluator notes.'],
  ['Reflection, Remediation, Mentor Conference, and Advancement Record', 'Students submit the weekly journal, mentor review, remediation plan, and advancement evidence before the next week unlocks.']
];

function slug(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function shortText(value = '', max = 220) {
  const text = cleanText(value);
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function mdAnchor(value = '') {
  return slug(value).replace(/^-+|-+$/g, '') || 'section';
}

function dayAnchor(week, day) {
  return `week-${week.week}-day-${day.day}`;
}

function weekAnchor(week) {
  return `week-${week.week}`;
}

function materialPathsFor(course, week, day) {
  const anchor = dayAnchor(week, day);
  return {
    required: true,
    standard: 'Mandatory RefZone University course material bundle',
    visualAid: `/assets/images/refzone/course-visual-aids/${course.id}-week-${week.week}-day-${day.day}.svg`,
    learnerSlides: `/refzone-university/learner-slides/${course.id}-learner-slides.md#${anchor}`,
    instructorPresentation: `/refzone-university/presentations/${course.id}-instructor-presentation.md#${anchor}`,
    worksheet: `/refzone-university/worksheets/${course.id}-worksheets.md#${anchor}`,
    assessmentEvidence: `/refzone-university/assessment-evidence/${course.id}-assessment-evidence.md#${anchor}`,
    coursePacket: `/refzone-university/course-packets/${course.id}-course-packet.md#${anchor}`,
    presentationOutline: `/docs/refzone-university/presentation-outlines/${course.id}-presentation.md#week-${week.week}`
  };
}

function courseMaterialBundleFor(course) {
  return {
    required: true,
    standard: 'Every active course must include visual aids, learner slides, instructor presentation notes, worksheets, assessment evidence, rubrics, and a course packet before it is publishable.',
    coursePacket: `/refzone-university/course-packets/${course.id}-course-packet.md`,
    learnerSlides: `/refzone-university/learner-slides/${course.id}-learner-slides.md`,
    instructorPresentation: `/refzone-university/presentations/${course.id}-instructor-presentation.md`,
    worksheets: `/refzone-university/worksheets/${course.id}-worksheets.md`,
    assessmentEvidence: `/refzone-university/assessment-evidence/${course.id}-assessment-evidence.md`,
    presentationOutline: `/docs/refzone-university/presentation-outlines/${course.id}-presentation.md`
  };
}

function weekMaterialPathsFor(course, week) {
  const anchor = weekAnchor(week);
  return {
    required: true,
    standard: 'Mandatory weekly RefZone University material bundle',
    learnerSlides: `/refzone-university/learner-slides/${course.id}-learner-slides.md#${anchor}`,
    instructorPresentation: `/refzone-university/presentations/${course.id}-instructor-presentation.md#${anchor}`,
    worksheets: `/refzone-university/worksheets/${course.id}-worksheets.md#${anchor}`,
    assessmentEvidence: `/refzone-university/assessment-evidence/${course.id}-assessment-evidence.md#${anchor}`,
    coursePacket: `/refzone-university/course-packets/${course.id}-course-packet.md#${anchor}`,
    presentationOutline: `/docs/refzone-university/presentation-outlines/${course.id}-presentation.md#week-${week.week}`
  };
}

function svgTspans(value = '', x = 0, y = 0, width = 54, lineHeight = 28, maxLines = 3) {
  const words = cleanText(value).split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) visible[visible.length - 1] = `${visible[visible.length - 1].replace(/\.+$/, '')}...`;
  return visible.map((line, index) => `<tspan x="${x}" y="${y + (index * lineHeight)}">${escapeHtml(line)}</tspan>`).join('');
}

function materialScenarioFor(course, week, day, visual) {
  const track = course.title || 'this track';
  const topic = week.title || 'the weekly topic';
  const scenarios = {
    lecture: `A crew enters a ${track} assignment with two competing interpretations of ${topic}; the student must teach the rule, philosophy, mechanics impact, and evidence standard in one coherent explanation.`,
    rules: `During a close ${track} game, ${topic} creates a disputed ruling. The student must cite the rule source, administer the penalty or restart, identify crew responsibility, and write the supervisor defense.`,
    'court-lab': `The crew must demonstrate the mechanic connected to ${topic}; the student diagrams starting position, movement path, primary coverage, secondary awareness, signal, and reporting route.`,
    'film-lab': `A freeze frame from a ${track} game shows a judgment problem tied to ${topic}; the student tags primary coverage, open angle, contact effect, crew help, and correction point.`,
    'role-play': `A coach, player, partner, table crew member, or supervisor challenges a ${topic} decision; the student must answer once with calm, accurate, professional language.`,
    'live-practicum': `A live or simulated ${track} assignment requires the student to apply ${topic}, collect observer evidence, and identify one correction target before leaving the floor.`,
    reflection: `The student reviews evidence from ${topic}, identifies a pattern, writes a remediation plan, and prepares a mentor-ready advancement record.`
  };
  return scenarios[visual.key] || scenarios.lecture;
}

function courseOverviewFor(course) {
  if (course.identity) return cleanText(course.identity);
  const level = course.level || 'RefZone University';
  const path = course.path || 'basketball officiating education';
  const firstTopics = (course.weeks || []).slice(0, 4).map(week => week.title).filter(Boolean).join(', ');
  const capstone = (course.weeks || []).at(-1)?.title || 'capstone evaluation';
  return `${course.title} is a ${level} course in ${path}. Students move through weekly lecture, required reading, case-play reasoning, court mechanics, film study, role-play, live practicum, reflection, and mentor review. The course begins with ${firstTopics || 'officiating foundations'} and concludes with ${capstone}.`;
}

function courseImageBriefFor(course) {
  const briefs = {
    'nfhs': {
      scene: 'education-based high-school basketball gym with a polished court, state-association rulebook, whistle, striped official shirt, coach communication card, and student-athlete safety checklist',
      emphasis: 'rules accuracy, student-athlete safety, sportsmanship, mechanics, and state association readiness',
      title: 'NFHS'
    },
    'njcaa-women': {
      scene: 'junior-college women\'s basketball gym with developing collegiate athletes in motion, perimeter freedom-of-movement coverage, mentor clipboard, whistle, and two-person/three-person mechanics diagram',
      emphasis: 'fairness, safety, disciplined communication, quick roster turnover, and junior-college women\'s game management',
      title: 'NJCAA WOMEN'
    },
    'njcaa-men': {
      scene: 'junior-college men\'s basketball court with fast transition action, physical post play, official in strong position, bench management cue card, whistle, and film-review tablet',
      emphasis: 'pace, physicality, game flow, player safety, and emotional bench behavior',
      title: 'NJCAA MEN'
    },
    'naia-women': {
      scene: 'small-college women\'s basketball championship environment with travel bag, national tournament bracket, court-coverage board, whistle, and supervisor film-review screen',
      emphasis: 'championship composure, advanced crew communication, travel professionalism, and supervisor-ready review',
      title: 'NAIA WOMEN'
    },
    'naia-men': {
      scene: 'small-college men\'s basketball arena with intense post play, national tournament lighting, official coverage angle diagram, game-flow card, whistle, and replay-style film notes',
      emphasis: 'controlled physicality, mature game management, championship pressure, and safety standards',
      title: 'NAIA MEN'
    },
    'ncaa-women': {
      scene: 'NCAA women\'s basketball court with national-standard mechanics board, freedom-of-movement perimeter action, replay monitor, F1/F2 decision card, whistle, and supervisor evaluation sheet',
      emphasis: 'national consistency, advanced mechanics, freedom of movement, replay awareness, and supervisor accountability',
      title: 'NCAA WOMEN'
    },
    'ncaa-men': {
      scene: 'NCAA men\'s basketball arena with high-speed transition, Class A/B technical foul reference, F1/F2 review panel, coach communication lane, official crew huddle, and film-analysis screen',
      emphasis: 'high-pressure communication, advanced physicality, monitor awareness, and supervisor-evaluated performance',
      title: 'NCAA MEN'
    },
    'wnba': {
      scene: 'professional women\'s basketball arena with broadcast lighting, elite player communication moment, replay culture screen, national media backdrop, whistle, and professional crew assignment card',
      emphasis: 'elite accuracy, communication, replay discipline, public scrutiny, and professional women\'s basketball standards',
      title: 'WNBA'
    },
    'nba': {
      scene: 'elite professional basketball arena with national broadcast lights, Replay Center monitor wall, coach challenge signal card, professional crew hierarchy board, analytics dashboard, whistle, and polished hardwood',
      emphasis: 'NBA-style rule administration, replay interaction, coach challenge procedures, analytics, and elite professional preparation',
      title: 'NBA'
    }
  };
  const item = briefs[course.id] || {
    scene: 'basketball officiating classroom, court, whistle, rulebook, film screen, and mentor review board',
    emphasis: 'lecture, rules, mechanics, film study, role-play, practicum, and mentor review',
    title: course.title
  };
  return {
    titleText: item.title,
    overview: courseOverviewFor(course),
    visualElements: item.scene,
    visualEmphasis: item.emphasis,
    palette: 'RefZone University black, metallic silver, white, and orange with a polished college-course card style.',
    prompt: `Create a RefZone University course-card image for ${item.title}: ${item.scene}. Emphasize ${item.emphasis}. Use a premium basketball officiating education style with black, metallic silver, white, and orange accents, clean readable course title text, dramatic court lighting, and professional academic training energy. Avoid real school logos, real league logos, and recognizable real people.`,
    altText: `${item.title} RefZone University course image showing ${item.emphasis}.`
  };
}

function visualForDay(title = '') {
  return dayVisuals.find(item => item.match.test(title)) || dayVisuals[0];
}

function readingSourcesFor(course) {
  const title = `${course.title || ''} ${course.path || ''}`.toLowerCase();
  if (title.includes('nfhs') || title.includes('high school')) {
    return {
      rules: 'current NFHS Basketball Rules Book',
      cases: 'current NFHS Basketball Case Book, interpretations, and state association bulletins',
      mechanics: 'current NFHS Basketball Officials Manual, two-person and three-person mechanics, and state association mechanics directives',
      conduct: 'education-based athletics sportsmanship, bench decorum, facility, game administration, and state association reporting procedures'
    };
  }
  if (title.includes('nba')) {
    return {
      rules: 'current NBA official rules and officiating points of emphasis',
      cases: 'NBA game reports, replay examples, and approved training clips',
      mechanics: 'professional mechanics, coverage, replay, and communication directives',
      conduct: 'league professionalism, bench control, altercation, and public-pressure standards'
    };
  }
  if (title.includes('wnba')) {
    return {
      rules: 'current WNBA official rules and officiating points of emphasis',
      cases: 'WNBA game reports, replay examples, and approved training clips',
      mechanics: 'professional mechanics, coverage, replay, and communication directives',
      conduct: 'league professionalism, bench control, player safety, and public-pressure standards'
    };
  }
  if (title.includes('ncaa men')) {
    return {
      rules: 'current NCAA Men\'s Basketball Rules Book',
      cases: 'current NCAA case plays, interpretations, and approved bulletins',
      mechanics: 'current collegiate men\'s mechanics manual and conference directives',
      conduct: 'sportsmanship, bench decorum, monitor/replay, and postgame-report procedures'
    };
  }
  if (title.includes('ncaa women')) {
    return {
      rules: 'current NCAA Women\'s Basketball Rules Book',
      cases: 'current NCAA case plays, interpretations, and approved bulletins',
      mechanics: 'current collegiate women\'s mechanics manual and conference directives',
      conduct: 'sportsmanship, bench decorum, monitor/replay, and postgame-report procedures'
    };
  }
  if (title.includes('njcaa')) {
    return {
      rules: 'current NJCAA-adopted college basketball rulebook for this track',
      cases: 'current governing case plays, interpretations, and conference bulletins',
      mechanics: 'current two-person and three-person mechanics manual used by the assigning body',
      conduct: 'junior-college sportsmanship, bench decorum, facility, and game-report procedures'
    };
  }
  if (title.includes('naia')) {
    return {
      rules: 'current NAIA-adopted college basketball rulebook for this track',
      cases: 'current governing case plays, interpretations, and conference bulletins',
      mechanics: 'current collegiate mechanics manual and local conference directives',
      conduct: 'NAIA sportsmanship, bench decorum, game management, and postgame-report procedures'
    };
  }
  return {
    rules: 'current governing rulebook for the assignment level',
    cases: 'current casebook, interpretations, supervisor bulletins, and points of emphasis',
    mechanics: 'current mechanics manual, coverage standards, and local assigning directives',
    conduct: 'professionalism, communication, bench decorum, reporting, and advancement standards'
  };
}

function readingTasksFor(course, week, day, visual) {
  const sources = readingSourcesFor(course);
  return [
    `Read the ${sources.rules} sections tied to ${week.title}; mark definitions, penalties, exceptions, and restart language that affect ${day.title}.`,
    `Read the ${sources.cases} connected to ${week.title}; write the ruling, the reason, the crew responsibility, and the best supervisor explanation.`,
    `Study the ${sources.mechanics} for the day's coverage problem; draw the official's starting position, movement path, primary area, secondary awareness, and reporting route.`,
    `Review ${sources.conduct}; identify the correct professional response when a coach, player, partner, table crew, observer, or supervisor challenges the ruling.`,
    `Study the ${visual.title.toLowerCase()} visual aid and screenshot packet; bring one film, court, or written example that proves how the reading changes game behavior.`
  ];
}

function collegeAssessmentFor(visual, course, week, day) {
  const prompts = {
    lecture: ['Written Knowledge Check', `Write a 250-word professional explanation of how ${week.title} changes judgment, positioning, communication, and assignment readiness in the ${course.title} pathway.`],
    rules: ['Rules Quiz', `Complete a scored rule/case-play quiz on ${week.title}; defend the ruling, restart, penalty, signal, and crew responsibility in writing.`],
    'court-lab': ['Mechanics Practical', `Perform the court mechanic tied to ${week.title}; submit a rubric score for positioning, coverage, signal, table report, and crew communication.`],
    'film-lab': ['Video Test', `Analyze a clip or freeze frame connected to ${week.title}; tag primary coverage, call/no-call logic, contact effect, and the correction point.`],
    'role-play': ['Video Quiz', `Record or perform a communication scenario for ${week.title}; answer the supervisor follow-up and stop before over-explaining.`],
    'live-practicum': ['Live Performance Evaluation', `Apply ${week.title} in a live, scrimmage, or simulated setting; submit evaluator notes and one correction target.`],
    reflection: ['Portfolio Evidence Check', `Submit a reflection, remediation plan, mentor note, and advancement record proving growth in ${week.title}.`]
  };
  const [type, prompt] = prompts[visual.key] || prompts.lecture;
  return {
    type,
    prompt,
    passingStandard: `80% or mentor approval is required before Day ${day.day + 1} unlocks.`
  };
}

function collegeMaterialFor(course, week, day) {
  const visual = visualForDay(day.title);
  return {
    minutes: 90,
    objectives: [
      `Explain ${week.title} using current rulebook, casebook, mechanics-manual, and conference/directive language.`,
      `Apply ${day.title} to realistic ${course.title} game situations with visible judgment, positioning, communication, and evidence.`,
      'Produce a gradable artifact that proves the student can explain, perform, defend, and improve.'
    ],
    readings: readingTasksFor(course, week, day, visual),
    preparation: `Read the current governing rulebook, casebook, mechanics manual, points of emphasis, and local conference or league directives tied to ${week.title}.`,
    media: `${visual.title} visual aid, learner screenshot, presentation slide, worksheet frame, and instructor talking points.`,
    lectureNotes: [
      `Frame ${week.title} as a college-level officiating concept, not a clinic tip.`,
      `Connect the rule language, philosophy, mechanics, and communication standard to ${course.title} game pressure.`,
      `Model one correct explanation, one incorrect shortcut, and one supervisor-ready correction statement.`
    ],
    discussion: [
      `Where does ${week.title} most often break down in a live ${course.title} game?`,
      'What evidence would prove the official applied the reading instead of guessing?',
      'How should the official communicate once, professionally, and then stop?'
    ],
    lab: `${visual.title}: complete the visual worksheet, screenshot annotation, court/film/role-play task, and mentor observation note for ${day.title}.`,
    assignment: `Submit the daily journal entry, worksheet or lab artifact, and one mentor-ready evidence item for ${day.title}.`,
    assessment: collegeAssessmentFor(visual, course, week, day),
    rubric: [
      'Rule accuracy and philosophy: 20 points',
      'Mechanics, positioning, and coverage: 20 points',
      'Communication and professional language: 20 points',
      'Evidence quality and specificity: 20 points',
      'Reflection, correction plan, and mentor readiness: 20 points'
    ]
  };
}

function sectionCollegeSummary(section, course, week, day, visual) {
  const material = day.college || collegeMaterialFor(course, week, day);
  const summary = section.summary || `${section.title} for ${day.title}.`;
  if (section.materialType === 'instruction-slide') {
    return [
      summary,
      '',
      '**Required Reading**',
      ...material.readings.map(item => `- ${item}`),
      '',
      '**Professor Lecture Notes**',
      ...material.lectureNotes.map(item => `- ${item}`),
      '',
      '**Class Discussion**',
      ...material.discussion.map(item => `- ${item}`)
    ].join('\n');
  }
  if (section.materialType === 'student-activity') {
    return [
      summary,
      '',
      '**Daily Lab and Assignment**',
      `- Visual/lab packet: ${material.lab}`,
      `- Written assignment: ${material.assignment}`,
      `- Media: ${material.media}`,
      `- Preparation check: ${material.preparation}`,
      '',
      '**Student Deliverables**',
      '- Annotated rule/case-play notes from the required reading.',
      '- Completed worksheet, film tag, court diagram, role-play script, or practicum evidence for the day type.',
      '- One professional explanation that can be delivered to a coach, partner, observer, or supervisor.'
    ].join('\n');
  }
  return [
    summary,
    '',
    '**Assessment**',
    `- Type: ${material.assessment.type}`,
    `- Prompt: ${material.assessment.prompt}`,
    `- Passing standard: ${material.assessment.passingStandard}`,
    '',
    '**Grading Rubric**',
    ...material.rubric.map(item => `- ${item}`),
    '',
    '**Remediation Rule**',
    '- A student who cannot cite the reading, explain the ruling, perform the mechanic, and produce evidence repeats the lesson before advancing.'
  ].join('\n');
}

function parseCourseManual(markdown = '') {
  const lines = markdown.split(/\r?\n/);
  const courses = [];
  let course = null;
  let week = null;
  let day = null;
  let section = null;
  let capture = '';

  function pushCourse(title) {
    course = {
      id: slug(title),
      title,
      path: '',
      level: '',
      identity: '',
      graduation: [],
      weeks: []
    };
    courses.push(course);
    week = null;
    day = null;
    section = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const courseMatch = line.match(/^# SCHOOL \/ TRACK:\s*(.+)$/);
    const degreeMatch = line.match(/^## Degree Path:\s*(.+)$/);
    const levelMatch = line.match(/^## Academic Level:\s*(.+)$/);
    const weekMatch = line.match(/^## Month\s+(\d+),\s+Week\s+(\d+):\s*(.+)$/);
    const dayMatch = line.match(/^### Week\s+(\d+),\s+Day\s+(\d+)\s+-\s+(.+)$/);
    const sectionMatch = line.match(/^####\s+(.+)$/);

    if (courseMatch) {
      pushCourse(courseMatch[1]);
      continue;
    }
    if (!course) continue;
    if (line === '### Track Identity') {
      capture = 'identity';
      continue;
    }
    if (line.startsWith('### Graduation Requirements')) {
      capture = 'graduation';
      continue;
    }
    if (degreeMatch) {
      course.path = degreeMatch[1];
      capture = '';
      continue;
    }
    if (levelMatch) {
      course.level = levelMatch[1];
      capture = '';
      continue;
    }
    if (weekMatch) {
      capture = '';
      week = {
        id: `${course.id}-week-${weekMatch[2]}`,
        month: Number(weekMatch[1]),
        week: Number(weekMatch[2]),
        title: weekMatch[3],
        lecture: '',
        evidence: '',
        closing: '',
        days: []
      };
      course.weeks.push(week);
      day = null;
      section = null;
      continue;
    }
    if (capture === 'identity' && line) {
      course.identity = cleanText(`${course.identity} ${line}`);
      continue;
    }
    if (capture === 'graduation' && line.startsWith('-')) {
      course.graduation.push(cleanText(line.replace(/^-\s*/, '')));
      continue;
    }
    if (dayMatch && week) {
      const visual = visualForDay(dayMatch[3]);
      day = {
        id: `${week.id}-day-${dayMatch[2]}`,
        week: Number(dayMatch[1]),
        day: Number(dayMatch[2]),
        title: dayMatch[3],
        visualType: visual.key,
        visualTitle: visual.title,
        visual: `/assets/images/refzone/lesson-visuals/${visual.key}.svg`,
        screenshot: `${visual.title} screenshot: ${visual.proof}.`,
        presentation: `${course.title} / Week ${week.week} / Day ${dayMatch[2]} ${visual.title}`,
        sections: []
      };
      week.days.push(day);
      section = null;
      continue;
    }
    if (sectionMatch && day) {
      section = {
        id: `${day.id}-${slug(sectionMatch[1])}`,
        title: sectionMatch[1],
        materialType: sectionMatch[1].includes('Professor') ? 'instruction-slide' : sectionMatch[1].includes('Student') ? 'student-activity' : 'assessment-evidence',
        visual: `/assets/images/refzone/lesson-visuals/${day.visualType}.svg`,
        screenshot: day.screenshot,
        presentation: day.presentation,
        summary: ''
      };
      day.sections.push(section);
      continue;
    }
    if (line && section && !section.summary) {
      section.summary = shortText(line);
      continue;
    }
    if (line && week && !day) {
      if (rawLine.startsWith('This week')) week.lecture = shortText(line, 320);
      if (rawLine.startsWith('Students must')) week.evidence = shortText(line, 320);
    }
  }

  return courses;
}

function buildNfhsCourse() {
  const course = {
    id: 'nfhs',
    title: 'NFHS',
    path: 'Certificate in High School Basketball Officiating - NFHS Track',
    level: 'High School Foundation / NFHS Rules',
    identity: 'The NFHS track prepares high-school basketball officials to serve education-based athletics with rules accuracy, professional communication, strong mechanics, student-athlete safety, and state-association readiness.',
    graduation: [
      'Complete all 52 weeks of daily academic work.',
      'Pass written NFHS rules and case-play examinations.',
      'Complete mechanics labs in two-person and three-person systems.',
      'Submit film-lab worksheets, role-play scores, mentor notes, and live-practicum evidence.',
      'Defend the final NFHS portfolio before the RefZone University advancement board.'
    ],
    weeks: []
  };

  course.weeks = nfhsWeekTopics.map((topic, topicIndex) => {
    const weekNumber = topicIndex + 1;
    const week = {
      id: `${course.id}-week-${weekNumber}`,
      month: Math.ceil(weekNumber / 4),
      week: weekNumber,
      title: topic,
      lecture: `This week in the NFHS program is devoted to ${topic}. The professor frames the topic as a college-level study of high-school basketball officiating, education-based athletics, student-athlete safety, mechanics, communication, and state-association readiness.`,
      evidence: `Students must produce a written journal entry, NFHS rule/case-play worksheet, mechanics-lab rubric, film note, role-play score, and mentor note showing how ${topic} affects high-school game administration.`,
      closing: `Week ${weekNumber} is complete only when the student can cite the NFHS rule source, perform the mechanic, communicate professionally, and submit evidence that can be reviewed by a mentor or assigner.`,
      days: []
    };

    week.days = nfhsDayFlow.map(([dayTitle, performance], dayIndex) => {
      const dayNumber = dayIndex + 1;
      const dayId = `${week.id}-day-${dayNumber}`;
      return {
        id: dayId,
        week: weekNumber,
        day: dayNumber,
        title: dayTitle,
        visualType: visualForDay(dayTitle).key,
        sections: [
          {
            id: `${dayId}-professor-explanation`,
            title: 'Line Item 1 - Professor Explanation',
            materialType: 'instruction-slide',
            summary: `The instructional line for NFHS Week ${weekNumber}, Day ${dayNumber} is that ${topic} must be studied as a professional high-school officiating discipline. The professor connects current NFHS rule language, case-play reasoning, mechanics, game administration, state-association expectations, and education-based athletics values to the student-official's visible behavior.`
          },
          {
            id: `${dayId}-student-performance`,
            title: 'Line Item 2 - What the Student Performs',
            materialType: 'student-activity',
            summary: `The student performance task is active work, not passive attendance. ${performance} The student writes notes, identifies three game situations, prepares one professional explanation, and produces a court, film, written, role-play, or practicum artifact tied to ${topic}.`
          },
          {
            id: `${dayId}-expected-outcome`,
            title: 'Line Item 3 - Expected Outcome, Evidence, and Grading',
            materialType: 'assessment-evidence',
            summary: `By the end of Day ${dayNumber}, the student must demonstrate measurable growth in NFHS rule knowledge, judgment, positioning, communication, reporting, and game management connected to ${topic}. Passing work requires evidence, mentor review, and a corrected explanation when remediation is assigned.`
          }
        ]
      };
    });

    return week;
  });

  return course;
}

function withGeneratedCourses(courses) {
  const ids = new Set(courses.map(course => course.id));
  const generated = ids.has('nfhs') ? [] : [buildNfhsCourse()];
  const ordered = [...generated, ...courses];

  return ordered.sort((a, b) => {
    if (a.id === 'nfhs') return -1;
    if (b.id === 'nfhs') return 1;
    return 0;
  });
}

function enrichCourses(courses) {
  return courses.map(course => ({
    ...course,
    weeks: course.weeks.map(week => ({
      ...week,
      days: week.days.map(day => {
        const visual = visualForDay(day.title);
        const screenshot = `/assets/images/refzone/course-screenshots/${course.id}-${visual.key}.svg`;
        const college = collegeMaterialFor(course, week, day);
        const enrichedDay = {
          ...day,
          college
        };
        return {
          ...day,
          visualType: visual.key,
          visualTitle: visual.title,
          visual: `/assets/images/refzone/lesson-visuals/${visual.key}.svg`,
          screenshot,
          college,
          sections: day.sections.map(section => ({
            ...section,
            visual: `/assets/images/refzone/lesson-visuals/${visual.key}.svg`,
            screenshot,
            summary: sectionCollegeSummary(section, course, week, enrichedDay, visual),
            collegeRole: section.materialType === 'instruction-slide'
              ? 'Professor-facing lecture slide, visual aid, and discussion prompt.'
              : section.materialType === 'student-activity'
                ? 'Student-facing worksheet, lab action, and participation artifact.'
                : 'Assessment-facing quiz/test item, rubric row, and evidence checkpoint.'
          }))
        };
      })
    }))
  }));
}

function courseCoverSvg(course, index) {
  const colors = [
    ['#0b0f14', '#f58220'],
    ['#111827', '#2563eb'],
    ['#0f172a', '#14b8a6'],
    ['#18181b', '#ef4444'],
    ['#07111f', '#a855f7'],
    ['#101820', '#22c55e'],
    ['#17120d', '#fbbf24'],
    ['#0b1014', '#38bdf8']
  ][index % 8];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">${escapeHtml(course.title)} course cover</title>
  <desc id="desc">RefZone University visual course cover for ${escapeHtml(course.title)}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${colors[0]}"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" x2="1">
      <stop offset="0" stop-color="${colors[1]}"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="56" y="48" width="1168" height="624" rx="34" fill="none" stroke="${colors[1]}" stroke-width="4" opacity=".8"/>
  <path d="M640 96v528M218 360h844M330 170h620v380H330zM480 250h320v220H480z" fill="none" stroke="#ffffff" stroke-width="5" opacity=".18"/>
  <circle cx="640" cy="360" r="78" fill="none" stroke="#ffffff" stroke-width="5" opacity=".18"/>
  <circle cx="640" cy="360" r="18" fill="${colors[1]}" opacity=".95"/>
  <text x="88" y="128" fill="${colors[1]}" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="900" letter-spacing="2">REFZONE UNIVERSITY</text>
  <text x="88" y="242" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="80" font-weight="900">${escapeHtml(course.title)}</text>
  <text x="92" y="304" fill="#dbeafe" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">${escapeHtml(course.level || 'Academic Track')}</text>
  <rect x="88" y="548" width="430" height="64" rx="32" fill="url(#accent)" opacity=".94"/>
  <text x="124" y="590" fill="#061016" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900">${course.weeks.length} WEEK COURSE PATH</text>
  <text x="850" y="610" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800">COURSE VISUAL PACK</text>
</svg>
`;
}

function lessonVisualSvg(item) {
  const isCourt = item.key === 'court-lab' || item.key === 'live-practicum';
  const isFilm = item.key === 'film-lab';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">${escapeHtml(item.title)} visual</title>
  <desc id="desc">${escapeHtml(item.proof)}</desc>
  <rect width="1280" height="720" fill="#0b0f14"/>
  <rect x="54" y="46" width="1172" height="628" rx="30" fill="#101820" stroke="#f58220" stroke-width="4"/>
  <text x="88" y="120" fill="#f58220" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900">${escapeHtml(item.icon)}</text>
  <text x="88" y="190" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${escapeHtml(item.title)}</text>
  <text x="88" y="242" fill="#dbeafe" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700">${escapeHtml(item.proof)}</text>
  ${isCourt ? '<path d="M690 132h420v456H690zM690 360h420M900 132v456M792 224h216v272H792z" fill="none" stroke="#f58220" stroke-width="8" opacity=".9"/><circle cx="900" cy="360" r="72" fill="none" stroke="#ffffff" stroke-width="5" opacity=".7"/><path d="M810 520c60-70 160-80 240-28" fill="none" stroke="#22c55e" stroke-width="10" stroke-linecap="round"/>' : ''}
  ${isFilm ? '<rect x="705" y="154" width="386" height="252" rx="14" fill="#020617" stroke="#ffffff" stroke-width="5"/><path d="M735 197h326M735 252h326M735 307h326M735 362h326" stroke="#f58220" stroke-width="6" opacity=".72"/><rect x="705" y="438" width="386" height="104" rx="12" fill="#ffffff" opacity=".88"/><text x="732" y="500" fill="#0b0f14" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900">FREEZE FRAME + TAGS</text>' : ''}
  ${!isCourt && !isFilm ? '<circle cx="872" cy="340" r="168" fill="none" stroke="#f58220" stroke-width="8"/><path d="M782 340h180M872 250v180" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/><rect x="688" y="530" width="368" height="56" rx="28" fill="#f58220"/><text x="738" y="568" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900">SECTION VISUAL READY</text>' : ''}
  <rect x="88" y="444" width="448" height="56" rx="10" fill="#ffffff" opacity=".08"/>
  <rect x="88" y="520" width="368" height="56" rx="10" fill="#ffffff" opacity=".08"/>
  <rect x="88" y="596" width="512" height="28" rx="8" fill="#f58220" opacity=".82"/>
</svg>
`;
}

function courseScreenshotSvg(course, item, index) {
  const accent = ['#f58220', '#2563eb', '#14b8a6', '#ef4444', '#a855f7', '#22c55e', '#fbbf24', '#38bdf8'][index % 8];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeHtml(course.title)} ${escapeHtml(item.title)} learner screen</title>
  <desc id="desc">Screenshot-style RefZone University learner screen showing reading, lecture, assignment, assessment, and visual aid areas.</desc>
  <rect width="1440" height="900" fill="#f5f7fb"/>
  <rect x="0" y="0" width="1440" height="72" fill="#101820"/>
  <text x="46" y="46" fill="${accent}" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900">REFZONE UNIVERSITY</text>
  <text x="1120" y="45" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">Course Browser</text>
  <rect x="32" y="104" width="304" height="736" rx="18" fill="#ffffff" stroke="#d6dee8"/>
  <text x="60" y="152" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900">${escapeHtml(course.title)}</text>
  <rect x="60" y="186" width="226" height="42" rx="9" fill="${accent}" opacity=".18"/>
  <rect x="60" y="252" width="226" height="18" rx="5" fill="#cbd5e1"/>
  <rect x="60" y="294" width="196" height="18" rx="5" fill="#cbd5e1"/>
  <rect x="60" y="336" width="236" height="18" rx="5" fill="#cbd5e1"/>
  <rect x="370" y="104" width="1018" height="736" rx="18" fill="#ffffff" stroke="#d6dee8"/>
  <text x="410" y="158" fill="${accent}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900">${escapeHtml(item.icon)} VISUAL AID</text>
  <text x="410" y="210" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="900">${escapeHtml(item.title)}</text>
  <rect x="410" y="250" width="420" height="250" rx="18" fill="#0b0f14"/>
  <path d="M470 438h284M470 392h210M470 346h284M470 300h240" stroke="${accent}" stroke-width="13" stroke-linecap="round"/>
  <circle cx="758" cy="372" r="62" fill="none" stroke="#ffffff" stroke-width="7" opacity=".75"/>
  <rect x="872" y="252" width="436" height="64" rx="12" fill="#e0f2fe"/>
  <text x="902" y="292" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="900">Required Reading</text>
  <rect x="872" y="338" width="436" height="64" rx="12" fill="#fef3c7"/>
  <text x="902" y="378" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="900">Lecture Notes</text>
  <rect x="872" y="424" width="436" height="64" rx="12" fill="#dcfce7"/>
  <text x="902" y="464" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="900">Lab Assignment</text>
  <rect x="410" y="548" width="898" height="80" rx="14" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="440" y="598" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="900">Assessment: quiz, video test, practical, or portfolio evidence before advancement</text>
  <rect x="410" y="660" width="248" height="62" rx="31" fill="${accent}"/>
  <text x="455" y="700" fill="#07111f" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900">Take Test</text>
  <rect x="688" y="660" width="248" height="62" rx="31" fill="#101820"/>
  <text x="733" y="700" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900">Submit Work</text>
  <rect x="966" y="660" width="248" height="62" rx="31" fill="#ffffff" stroke="#101820" stroke-width="3"/>
  <text x="1014" y="700" fill="#101820" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900">Mentor Review</text>
</svg>
`;
}

async function writePublicAssets(courses) {
  await fs.mkdir(coverDir, { recursive: true });
  await fs.mkdir(overviewDir, { recursive: true });
  await fs.mkdir(visualDir, { recursive: true });
  await fs.mkdir(screenshotDir, { recursive: true });
  await Promise.all(dayVisuals.map(item => fs.writeFile(path.join(visualDir, `${item.key}.svg`), lessonVisualSvg(item), 'utf8')));
  await Promise.all(courses.map((course, index) => fs.writeFile(path.join(coverDir, `${course.id}.svg`), courseCoverSvg(course, index), 'utf8')));
  await Promise.all(courses.flatMap((course, index) => dayVisuals.map(item => fs.writeFile(path.join(screenshotDir, `${course.id}-${item.key}.svg`), courseScreenshotSvg(course, item, index), 'utf8'))));
}

function overviewThumbnailFor(course) {
  const thumbnails = {
    nfhs: '/assets/images/refzone/course-overviews/nfhs.jpg',
    'njcaa-women': '/assets/images/refzone/course-overviews/njcaa-women.jpg',
    'njcaa-men': '/assets/images/refzone/course-overviews/njcaa-men.jpg',
    'naia-women': '/assets/images/refzone/course-overviews/naia-women.jpg',
    'naia-men': '/assets/images/refzone/course-overviews/naia-men.jpg',
    'ncaa-women': '/assets/images/refzone/course-overviews/ncaa-women.jpg',
    'ncaa-men': '/assets/images/refzone/course-overviews/ncaa-men.jpg',
    wnba: '/assets/images/refzone/course-overviews/wnba.jpg',
    nba: '/assets/images/refzone/course-overviews/nba.jpg'
  };
  return thumbnails[course.id] || `/assets/images/refzone/course-covers/${course.id}.svg`;
}

function courseManifest(course) {
  const overview = courseOverviewFor(course);
  const imageBrief = courseImageBriefFor(course);
  return {
    id: course.id,
    title: course.title,
    path: course.path,
    level: course.level,
    overview,
    identity: course.identity,
    description: overview,
    imageBrief,
    graduation: course.graduation,
    cover: `/assets/images/refzone/course-covers/${course.id}.svg`,
    overviewThumbnail: overviewThumbnailFor(course),
    weeks: course.weeks.map(week => ({
      id: week.id,
      month: week.month,
      week: week.week,
      title: week.title,
      lecture: week.lecture,
      evidence: week.evidence,
      presentation: `/docs/refzone-university/presentation-outlines/${course.id}-presentation.md#week-${week.week}`,
      screenshot: `${course.title} Week ${week.week} learner screen and section visual set.`,
      days: week.days.map(day => ({
        id: day.id,
        week: day.week,
        day: day.day,
        title: day.title,
        visualType: day.visualType,
        visualTitle: day.visualTitle,
        visual: day.visual,
        screenshot: day.screenshot,
        presentation: day.presentation,
        college: day.college,
        sections: day.sections.map(section => ({
          id: section.id,
          title: section.title,
          materialType: section.materialType,
          visual: section.visual,
          screenshot: section.screenshot,
          presentation: section.presentation,
          collegeRole: section.collegeRole,
          summary: section.summary
        }))
      }))
    }))
  };
}

function writeIndexMarkdown(courses, counts) {
  const lines = [
    '# RefZone University Visual Materials Index',
    '',
    'Generated from `frontend/public/course-manual.md`.',
    '',
    `- Courses: ${counts.courses}`,
    `- Weeks: ${counts.weeks}`,
    `- Academic days: ${counts.days}`,
    `- Line-item sections: ${counts.sections}`,
    '',
    '## Generated Visual System',
    '',
    '- Course covers live in `frontend/public/assets/images/refzone/course-covers/`.',
    '- Lesson visuals live in `frontend/public/assets/images/refzone/lesson-visuals/`.',
    '- Screenshot-style course screens live in `frontend/public/assets/images/refzone/course-screenshots/`.',
    '- The public material manifest lives at `frontend/public/refzone-course-materials.json`.',
    '- Course image briefs live in `docs/refzone-university/course-overviews.md`.',
    '- Presentation outlines live in `docs/refzone-university/presentation-outlines/`.',
    '- Every academic day now includes required reading, lecture notes, lab work, assignment evidence, assessment, grading rubric, and remediation rule.',
    '',
    '## Courses',
    '',
    ...courses.map(course => `- [${course.title}](./${course.id}.md) - ${course.weeks.length} weeks, ${course.weeks.reduce((sum, week) => sum + week.days.length, 0)} days`)
  ];
  return `${lines.join('\n')}\n`;
}

function writeCourseOverviewsMarkdown(courses) {
  const lines = [
    '# RefZone University Course Overviews and Image Briefs',
    '',
    'Use these overviews and image prompts to create a distinct course image for every RefZone University track.',
    '',
    '## Course Image Style Rules',
    '',
    '- Use the RefZone University black, metallic silver, white, and orange visual language.',
    '- Make the course title readable in the first viewport of the image.',
    '- Show basketball officiating education: court, rulebook, whistle, film, mechanics, mentor review, and assessment cues.',
    '- Avoid real school logos, real league logos, and recognizable real people.',
    ''
  ];

  courses.forEach(course => {
    const brief = courseImageBriefFor(course);
    lines.push(`## ${course.title}`);
    lines.push('');
    lines.push(`**Course Overview:** ${brief.overview}`);
    lines.push('');
    lines.push(`**Overview Thumbnail:** ${overviewThumbnailFor(course)}`);
    lines.push('');
    lines.push(`**Visual Elements:** ${brief.visualElements}`);
    lines.push('');
    lines.push(`**Visual Emphasis:** ${brief.visualEmphasis}`);
    lines.push('');
    lines.push(`**Image Prompt:** ${brief.prompt}`);
    lines.push('');
    lines.push(`**Alt Text:** ${brief.altText}`);
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

function writeCourseMarkdown(course) {
  const imageBrief = courseImageBriefFor(course);
  const lines = [
    `# ${course.title} Visual Materials`,
    '',
    `**Degree Path:** ${course.path}`,
    `**Academic Level:** ${course.level}`,
    `**Course Cover:** \`frontend/public/assets/images/refzone/course-covers/${course.id}.svg\``,
    '',
    '## Course Overview',
    '',
    courseOverviewFor(course),
    '',
    '## Course Image Brief',
    '',
    `**Visual Elements:** ${imageBrief.visualElements}`,
    `**Visual Emphasis:** ${imageBrief.visualEmphasis}`,
    `**Image Prompt:** ${imageBrief.prompt}`,
    '',
    '## Graduation Requirements',
    '',
    ...(course.graduation?.length ? course.graduation.map(item => `- ${item}`) : [
      '- Complete the full weekly and daily academic course sequence.',
      '- Pass the required written, video, practical, and portfolio assessments.',
      '- Submit required evidence, mentor feedback, and advancement artifacts.'
    ]),
    '',
    '## Weekly Materials',
    ''
  ];

  course.weeks.forEach(week => {
    lines.push(`### Week ${week.week}: ${week.title}`);
    lines.push('');
    lines.push(`- Screenshot package: learner screen, week overview, active lesson view, and progress state.`);
    lines.push(`- Presentation source: \`docs/refzone-university/presentation-outlines/${course.id}-presentation.md#week-${week.week}\`.`);
    lines.push(`- Required evidence: ${week.evidence || 'Journal, lab rubric, role-play score, film worksheet, and mentor note.'}`);
    week.days.forEach(day => {
      lines.push(`- Day ${day.day}: ${day.title} - ${day.visualTitle}; visual \`${day.visual}\`.`);
      lines.push(`  - Screenshot: \`${day.screenshot}\`.`);
      lines.push(`  - Required reading: ${day.college.readings.join(' ')}`);
      lines.push(`  - Assignment: ${day.college.assignment}`);
      lines.push(`  - Assessment: ${day.college.assessment.type} - ${day.college.assessment.passingStandard}`);
      day.sections.forEach(section => {
        lines.push(`  - ${section.title}: ${section.materialType}; ${section.collegeRole}`);
      });
    });
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

function writePresentationOutline(course) {
  const lines = [
    `# ${course.title} RefZone University Presentation`,
    '',
    `## Slide 1: ${course.title}`,
    `- Claim: ${course.title} gives officials a structured RefZone University path from weekly concept to visible game behavior.`,
    `- Overview: ${courseOverviewFor(course)}`,
    `- Visual: \`frontend/public/assets/images/refzone/course-covers/${course.id}.svg\``,
    '',
    '## Slide 2: Course Architecture',
    `- Degree Path: ${course.path}`,
    `- Academic Level: ${course.level}`,
    `- Proof object: 52-week course progression, seven academic day types, required evidence trail.`,
    '',
    '## Slide 3: Evidence Loop',
    '- Lecture -> rules reasoning -> court lab -> film lab -> role-play -> live practicum -> mentor reflection.',
    '- Visual: seven lesson visual templates from `frontend/public/assets/images/refzone/lesson-visuals/`.',
    ''
  ];

  course.weeks.forEach(week => {
    lines.push(`## Week ${week.week}: ${week.title}`);
    lines.push(`- Claim: officials must make ${week.title} visible through judgment, mechanics, communication, and written evidence.`);
    lines.push(`- Lecture screenshot: ${week.lecture || 'Week overview and professor framing slide.'}`);
    lines.push(`- Required evidence: ${week.evidence || 'Journal, film worksheet, court rubric, role-play score, and mentor note.'}`);
    week.days.forEach(day => {
      lines.push(`- Day ${day.day}: ${day.title} - use ${day.visualTitle} visual, screenshot prompt, and three line-item section cards.`);
      lines.push(`  - Reading: ${day.college.readings[0]}`);
      lines.push(`  - Assignment: ${day.college.assignment}`);
      lines.push(`  - Assessment: ${day.college.assessment.type}; ${day.college.assessment.passingStandard}`);
    });
    lines.push('');
  });

  lines.push('## Closing Slide: Advancement Board Readiness');
  lines.push('- Claim: completion evidence should prove the official can explain, perform, defend, and improve.');
  lines.push('- Visual: certification progress, mentor sign-off, film evidence, and assignment-readiness record.');
  return `${lines.join('\n')}\n`;
}

async function writeDocs(courses, counts) {
  await fs.mkdir(visualDocsDir, { recursive: true });
  await fs.mkdir(presentationDir, { recursive: true });
  await fs.writeFile(path.join(docsRoot, 'course-overviews.md'), writeCourseOverviewsMarkdown(courses), 'utf8');
  await fs.writeFile(path.join(visualDocsDir, 'refzone-materials-index.md'), writeIndexMarkdown(courses, counts), 'utf8');
  await Promise.all(courses.map(course => fs.writeFile(path.join(visualDocsDir, `${course.id}.md`), writeCourseMarkdown(course), 'utf8')));
  await Promise.all(courses.map(course => fs.writeFile(path.join(presentationDir, `${course.id}-presentation.md`), writePresentationOutline(course), 'utf8')));
}

async function main() {
  const manual = await fs.readFile(manualPath, 'utf8');
  const courses = enrichCourses(withGeneratedCourses(parseCourseManual(manual)));
  const counts = {
    courses: courses.length,
    weeks: courses.reduce((sum, course) => sum + course.weeks.length, 0),
    days: courses.reduce((sum, course) => sum + course.weeks.reduce((weekSum, week) => weekSum + week.days.length, 0), 0),
    sections: courses.reduce((sum, course) => sum + course.weeks.reduce((weekSum, week) => weekSum + week.days.reduce((daySum, day) => daySum + day.sections.length, 0), 0), 0)
  };
  await writePublicAssets(courses);
  await writeDocs(courses, counts);
  await fs.writeFile(manifestPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'frontend/public/course-manual.md plus generated NFHS track',
    brand: 'RefZone University',
    counts,
    visualTypes: dayVisuals.map(({ key, title, proof }) => ({ key, title, proof, asset: `/assets/images/refzone/lesson-visuals/${key}.svg` })),
    courses: courses.map(courseManifest)
  }, null, 2)}\n`, 'utf8');
  console.log(`Generated RefZone University visual materials for ${counts.courses} courses, ${counts.weeks} weeks, ${counts.days} days, and ${counts.sections} sections.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
