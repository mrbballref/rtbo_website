(function () {
  const API_URL = '/api';
  const KEY = 'rtbo-refzone-managed-courses';
  const EVENT = 'rtbo-refzone-courses-updated';
  const ASSET_VERSION = '2026-05-25-video-uploads';
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
  const visualOptions = [
    ['lecture', 'Lecture'],
    ['rules', 'Rules / Quiz'],
    ['court-lab', 'Court Lab'],
    ['film-lab', 'Video Test'],
    ['role-play', 'Video Quiz'],
    ['live-practicum', 'Live Practicum'],
    ['reflection', 'Reflection']
  ];

  window.rtboRefZoneCourseManagerVersion = ASSET_VERSION;

  const cssHref = `/refzone-course-manager.css?v=${ASSET_VERSION}`;
  const existingCss = document.querySelector('link[data-rtbo-refzone-course-manager-css]');
  if (existingCss) {
    existingCss.href = cssHref;
  } else {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    link.dataset.rtboRefzoneCourseManagerCss = ASSET_VERSION;
    document.head.appendChild(link);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function slug(value) {
    return String(value || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'course';
  }

  function status(value) {
    return ['active', 'draft', 'hidden'].includes(value) ? value : 'active';
  }

  function overviewThumbnailFor(course = {}) {
    const id = slug(course.id || course.title || '');
    const explicitThumbnail = String(course.overviewThumbnail || course.overview_thumbnail || '').trim();
    if (explicitThumbnail && !/\/course-covers\//i.test(explicitThumbnail)) return explicitThumbnail;
    return String(COURSE_OVERVIEW_THUMBNAILS[id] || explicitThumbnail || '').trim();
  }

  function lines(value) {
    return String(value || '').split(/\n+/).map(item => item.trim()).filter(Boolean);
  }

  function looksLikeMediaUrl(value = '') {
    return /^(https?:|\/|assets\/|videos\/|frontend\/public\/assets\/videos\/)/i.test(String(value || '').trim());
  }

  function normalizeVideoItem(item = {}, index = 0) {
    const raw = item && typeof item === 'object' ? item : { url: item };
    const url = String(raw.url || raw.href || raw.src || raw.path || raw.video || raw.videoUrl || raw.video_url || '').trim();
    if (!url) return null;
    const title = String(raw.title || raw.name || `Section Video ${index + 1}`).trim();
    const thumbnail = String(raw.thumbnail || raw.poster || raw.image || '').trim();
    const duration = String(raw.duration || raw.durationLabel || raw.duration_label || '').trim();
    const type = String(raw.type || raw.mime || 'video/mp4').trim();
    return {
      id: slug(raw.id || title || `section-video-${index + 1}`),
      title,
      url,
      thumbnail,
      duration,
      type
    };
  }

  function normalizeVideoList(items = []) {
    return (Array.isArray(items) ? items : []).map(normalizeVideoItem).filter(Boolean);
  }

  function splitVideoLine(line = '') {
    if (line.includes('|')) return line.split('|').map(item => item.trim());
    if (line.includes('\t')) return line.split('\t').map(item => item.trim());
    return line.split(',').map(item => item.trim());
  }

  function parseSectionVideoLines(value = '') {
    return String(value || '').split(/\n+/).map(item => item.trim()).filter(Boolean).map((line, index) => {
      const parts = splitVideoLine(line);
      let week = '1';
      let day = '1';
      let section = '1';
      let title = `Section Video ${index + 1}`;
      let url = '';
      let thumbnail = '';
      let duration = '';
      let type = 'video/mp4';

      if (parts.length >= 5) {
        [week, day, section, title, url, thumbnail = '', duration = '', type = 'video/mp4'] = parts;
      } else if (parts.length === 4) {
        [section, title, url, thumbnail = ''] = parts;
      } else if (parts.length === 3) {
        [title, url, thumbnail = ''] = parts;
      } else if (parts.length === 2 && looksLikeMediaUrl(parts[1])) {
        [title, url] = parts;
      } else {
        url = parts[0] || '';
        title = parts[1] || title;
      }

      const video = normalizeVideoItem({ title, url, thumbnail, duration, type }, index);
      if (!video) return null;
      return {
        week: String(week || '1').trim(),
        day: String(day || '1').trim(),
        section: String(section || '1').trim(),
        video
      };
    }).filter(Boolean);
  }

  function appendUploadedVideosToForm(form = {}, videos = []) {
    const week = String(form.videoUploadWeek || '1').trim() || '1';
    const day = String(form.videoUploadDay || '1').trim() || '1';
    const section = String(form.videoUploadSection || '1').trim() || '1';
    const rows = normalizeVideoList(videos).map(video => [
      week,
      day,
      section,
      video.title,
      video.url,
      video.thumbnail || '',
      video.duration || '',
      video.type || 'video/mp4'
    ].join(' | '));
    return {
      ...form,
      sectionVideos: [form.sectionVideos, ...rows].filter(Boolean).join('\n')
    };
  }

  function videoTargetMatches(target = '', actualNumber = 1, id = '', title = '', index = 0) {
    const value = String(target || '').trim().toLowerCase();
    if (!value || value === '*' || value === 'all') return true;
    if (/^\d+$/.test(value)) return Number(value) === Number(actualNumber || index + 1);
    return value === slug(id || '') || value === slug(title || '');
  }

  function videosForCoursePart(entries = [], week = {}, weekIndex = 0, day = {}, dayIndex = 0, section = {}, sectionIndex = 0) {
    return entries
      .filter(entry => (
        videoTargetMatches(entry.week, week.week || weekIndex + 1, week.id, week.title, weekIndex)
        && videoTargetMatches(entry.day, day.day || dayIndex + 1, day.id, day.title, dayIndex)
        && videoTargetMatches(entry.section, sectionIndex + 1, section.id, section.title, sectionIndex)
      ))
      .map(entry => entry.video);
  }

  function sectionVideoLinesFromCourse(course = {}) {
    const rows = [];
    (course.weeks || []).forEach((week, weekIndex) => {
      (week.days || []).forEach((day, dayIndex) => {
        (day.sections || []).forEach((section, sectionIndex) => {
          normalizeVideoList(section.videos).forEach(video => {
            rows.push([
              week.week || weekIndex + 1,
              day.day || dayIndex + 1,
              sectionIndex + 1,
              video.title,
              video.url,
              video.thumbnail || '',
              video.duration || '',
              video.type || 'video/mp4'
            ].join(' | '));
          });
        });
      });
    });
    return rows.join('\n');
  }

  function applySectionVideosToWeeks(weeks = [], form = {}) {
    const videoEntries = parseSectionVideoLines(form.sectionVideos);
    return (Array.isArray(weeks) ? weeks : []).map((week, weekIndex) => {
      const days = Array.isArray(week.days) ? week.days.map((day, dayIndex) => {
        const sections = Array.isArray(day.sections) ? day.sections.map((section, sectionIndex) => ({
          ...section,
          videos: videosForCoursePart(videoEntries, week, weekIndex, day, dayIndex, section, sectionIndex)
        })) : [];
        const firstVideo = sections.flatMap(section => section.videos || [])[0] || null;
        return {
          ...day,
          videoUrl: firstVideo?.url || '',
          videos: firstVideo ? [firstVideo] : [],
          sections
        };
      }) : week.days;
      return { ...week, days };
    });
  }

  function cleanAssessmentText(value = '') {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function officiatingAssessmentTopicFor(form = {}) {
    const rawTopic = cleanAssessmentText(form.moduleTitle || form.title || 'basketball officiating fundamentals');
    const courseTitle = form.title || 'RefZone Course';
    if (/orientation|professional identity|course welcome|baseline assessment/i.test(rawTopic)) {
      return `${courseTitle} basketball officiating professionalism, rule readiness, crew communication, game administration, and player safety`;
    }
    if (/professional development/i.test(rawTopic) && !/(officiat|official|crew|game|assignment|feedback|observer|communication|conduct|report)/i.test(rawTopic)) {
      return `${courseTitle} basketball officiating development, rule study, mechanics evidence, and assignment readiness`;
    }
    if (/(basketball|officiat|official|rule|case|mechanic|coverage|signal|whistle|ruling|penalt|restart|violation|foul|contact|throw|clock|game|crew|coach|player|table|score|bench|safety|communication|judgment|position)/i.test(rawTopic)) {
      return `${rawTopic} in ${courseTitle} basketball officiating`;
    }
    return `${rawTopic} as applied to ${courseTitle} basketball officiating`;
  }

  function dayAssessmentFocusFor(form = {}) {
    const title = cleanAssessmentText(form.lessonTitle || 'daily lesson');
    if (/professor lecture|socratic seminar|course welcome|baseline assessment|orientation/i.test(title)) {
      return 'the daily basketball officiating lesson';
    }
    return `${title} officiating work`;
  }

  function collegeFromForm(form) {
    const readings = lines(form.readings);
    const lectureNotes = lines(form.lectureNotes);
    const rubric = lines(form.rubric);
    const topic = officiatingAssessmentTopicFor(form);
    const focus = dayAssessmentFocusFor(form);
    return {
      minutes: Number(form.minutes || 90),
      objectives: [
        `Explain ${topic} using current rulebook, casebook, mechanics, and assignment standards.`,
        `Apply ${topic} to realistic game situations with visible evidence.`,
        'Produce a gradable artifact that proves the student can explain, perform, defend, and improve.'
      ],
      readings: readings.length ? readings : [
        `Read the current governing rulebook sections tied to ${topic}.`,
        'Read current case plays, interpretations, supervisor bulletins, and points of emphasis.',
        'Study current mechanics, coverage, communication, and reporting standards for the assignment level.'
      ],
      preparation: form.preparation || 'Bring rulebook notes, mechanics notebook, film journal, whistle, and the current worksheet.',
      media: 'Course visual, screenshot packet, presentation slide, worksheet frame, and instructor notes.',
      lectureNotes: lectureNotes.length ? lectureNotes : [
        `Frame ${topic} as a college-level officiating concept.`,
        'Model one correct explanation, one incorrect shortcut, and one supervisor-ready correction statement.'
      ],
      discussion: [
        'Where does this lesson break down in a live game?',
        'What evidence proves the official applied the reading instead of guessing?'
      ],
      lab: form.lab || `Complete the visual worksheet, court/film/role-play task, and mentor observation note for ${focus}.`,
      assignment: form.assignment || `Submit the daily journal entry, worksheet or lab artifact, and one mentor-ready evidence item tied to ${topic}.`,
      assessment: {
        type: form.assessmentType || 'Course Assessment',
        prompt: form.assessment,
        passingStandard: form.passingStandard || '85% or mentor approval is required before the next lesson unlocks.'
      },
      rubric: rubric.length ? rubric : [
        'Rule accuracy and philosophy: 20 points',
        'Mechanics, positioning, and coverage: 20 points',
        'Communication and professional language: 20 points',
        'Evidence quality and specificity: 20 points',
        'Reflection, correction plan, and mentor readiness: 20 points'
      ]
    };
  }

  function fallbackTestFromForm(form, id, weekNumber = 1, dayNumber = 1) {
    const dayId = `${id}-week-${weekNumber}-day-${dayNumber}`;
    const courseTitle = form.title || 'RefZone Course';
    const topic = officiatingAssessmentTopicFor(form);
    const focus = dayAssessmentFocusFor(form);
    const assessmentType = form.assessmentType || 'Course Assessment';
    const baseQuestions = [
      [`Before the basketball officiating assessment on ${topic}, which preparation best supports the course standard?`, [
        `Read the current governing material tied to ${topic}; identify rule language, case-play logic, mechanics, and evidence expectations.`,
        'Wait until after class to learn the rule.',
        'Rely only on personal game experience.',
        'Study signals without reading the rule or mechanics source.'
      ], 'a', 'RefZone lessons require current reading, rules reasoning, mechanics study, and evidence before advancement.'],
      [`What is required evidence for applying ${topic} in a game setting?`, [
        form.assignment || 'Submit the daily worksheet, lab artifact, and mentor-ready evidence item.',
        'Attendance only.',
        'A casual verbal statement.',
        'No evidence is required.'
      ], 'a', 'Course completion requires a gradable artifact, not a button click.'],
      [`What should the official connect when applying ${topic}?`, [
        'Rule language, case-play logic, mechanics, communication, and evidence quality.',
        'Only crowd reaction.',
        'Only the final score.',
        'Only personal preference.'
      ], 'a', 'The course standard is to explain, perform, defend, and improve using evidence.'],
      ['What is the best professional response to a challenge?', [
        'Give a short, accurate explanation tied to the rule source, crew responsibility, mechanic, and correction point.',
        'Argue until the decision is accepted.',
        'Ignore the concern.',
        'Change the decision only to avoid conflict.'
      ], 'a', 'Professional communication should be concise, accurate, and tied to the officiating standard.'],
      [`What happens if the student does not pass ${assessmentType}?`, [
        'The student repeats evidence, corrects missed concepts, and completes remediation before advancing.',
        'The next module still unlocks automatically.',
        'The course deletes the assessment.',
        'The mentor ignores the missed standard.'
      ], 'a', 'The module stays locked until the passing standard is met.']
    ];
    const generated = Array.from({ length: 20 }, (_, index) => {
      const number = index + 6;
      const prompts = [
        [`Question ${number}: Which reading action most directly supports officiating judgment on ${topic}?`, 'Identify exact rule language, exception, penalty, restart, and mechanic connected to the play.', 'Ignore exceptions and rely only on the common ruling.', 'Avoid written evidence until the test is complete.', 'Ask the coach which rule should apply.', 'Rule-source accuracy comes before judgment or mechanics.'],
        [`Question ${number}: What mechanics evidence best proves mastery?`, 'A diagram or note showing starting position, movement path, primary coverage, secondary awareness, signal, and reporting route.', 'A statement that the official was close to the play.', 'A score-only summary.', 'A generic note saying the crew worked hard.', 'Mechanics mastery must be visible and reviewable.'],
        [`Question ${number}: Which communication response best fits ${courseTitle}?`, 'Use brief, calm, rule-based language, then return focus to the game.', 'Keep explaining until the coach agrees.', 'Use sarcasm to end the conversation.', 'Refuse all communication regardless of the situation.', 'Professional communication is accurate, brief, composed, and game-centered.'],
        [`Question ${number}: What should a film or visual review identify for ${topic}?`, 'Primary coverage, open or closed angle, contact effect, crew help, and the correction point.', 'Only whether the call was popular.', 'Only the player who scored.', 'Only whether the official looked confident.', 'Film work must identify observable officiating factors.'],
        [`Question ${number}: Which portfolio evidence satisfies advancement?`, 'Corrected quiz results, written rule defense, lab artifact, mentor note, and a specific next-step correction plan.', 'A button click showing the lesson as passed.', 'A blank worksheet with no notes.', 'A promise to study later.', 'Advancement requires evidence that can be reviewed by faculty and mentors.']
      ][index % 5];
      return [prompts[0], prompts.slice(1, 5), 'a', prompts[5]];
    });
    const questions = [...baseQuestions, ...generated].map(([prompt, options, correct, explanation], index) => ({
      id: `${dayId}-q${index + 1}`,
      type: 'multiple-choice',
      prompt,
      options: options.map((text, optionIndex) => ({ id: String.fromCharCode(97 + optionIndex), text })),
      correctOptionId: correct,
      explanation
    }));
    return {
      id: `${dayId}-test`,
      title: `${courseTitle} Week ${weekNumber}, Day ${dayNumber} Basketball Officiating ${assessmentType}`,
      type: assessmentType,
      passingScore: 85,
      timeLimitMinutes: 45,
      instructions: `Complete this 25-question basketball officiating assessment. A minimum score of 85% is required before the next module unlocks.`,
      evidencePrompt: `In 3-5 sentences, cite the rule or mechanic connected to ${topic}, explain the official's game responsibility during ${focus}, and name one correction target.`,
      answerKeyVisibleInCommandCenter: true,
      questions,
      answerKey: questions.map(question => ({
        questionId: question.id,
        correctOptionId: question.correctOptionId,
        answer: question.options.find(option => option.id === question.correctOptionId)?.text || '',
        explanation: question.explanation
      }))
    };
  }

  function normalizeTest(raw, form, id, weekNumber = 1, dayNumber = 1) {
    const fallback = fallbackTestFromForm(form, id, weekNumber, dayNumber);
    if (!raw || typeof raw !== 'object') return fallback;
    const questions = Array.isArray(raw.questions) ? raw.questions.map((question, index) => {
      const options = Array.isArray(question.options) ? question.options.map((option, optionIndex) => ({
        id: String(option.id || String.fromCharCode(97 + optionIndex)).toLowerCase(),
        text: String(option.text || '').trim()
      })).filter(option => option.text) : [];
      return {
        id: String(question.id || `${fallback.id}-q${index + 1}`),
        type: question.type || 'multiple-choice',
        prompt: String(question.prompt || '').trim(),
        options,
        correctOptionId: String(question.correctOptionId || question.correct_option_id || '').toLowerCase(),
        explanation: String(question.explanation || '').trim()
      };
    }).filter(question => question.prompt && question.options.length >= 2 && question.correctOptionId) : [];
    return {
      ...fallback,
      ...raw,
      passingScore: 85,
      timeLimitMinutes: Number(raw.timeLimitMinutes || raw.time_limit_minutes || fallback.timeLimitMinutes),
      questions: questions.length >= 25 ? questions.slice(0, 25) : fallback.questions,
      answerKey: (questions.length >= 25 ? questions.slice(0, 25) : fallback.questions).map(question => ({
        questionId: question.id,
        correctOptionId: question.correctOptionId,
        answer: question.options.find(option => option.id === question.correctOptionId)?.text || '',
        explanation: question.explanation || ''
      }))
    };
  }

  function sectionSummary(kind, form, college) {
    if (kind === 'instruction') {
      return [
        form.description,
        '',
        '**Required Reading**',
        ...college.readings.map(item => `- ${item}`),
        '',
        '**Professor Lecture Notes**',
        ...college.lectureNotes.map(item => `- ${item}`)
      ].join('\n');
    }
    if (kind === 'student') {
      return [
        form.lessonTitle,
        '',
        '**Daily Lab and Assignment**',
        `- ${college.lab}`,
        `- ${college.assignment}`,
        `- Preparation: ${college.preparation}`
      ].join('\n');
    }
    return [
      form.assessment,
      '',
      '**Assessment**',
      `- Type: ${college.assessment.type}`,
      `- Prompt: ${college.assessment.prompt}`,
      `- Passing standard: ${college.assessment.passingStandard}`,
      '',
      '**Grading Rubric**',
      ...college.rubric.map(item => `- ${item}`)
    ].join('\n');
  }

  function normalizeCourses(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map((course, index) => {
      const title = String(course.title || `RefZone Course ${index + 1}`).trim();
      const id = slug(course.id || title);
      return {
        id,
        title,
        path: String(course.path || '').trim(),
        level: String(course.level || '').trim(),
        status: status(course.status),
        cover: String(course.cover || `/assets/images/refzone/course-covers/${id}.svg`).trim(),
        overviewThumbnail: overviewThumbnailFor({ ...course, id, title }),
        description: String(course.overview || course.description || course.lecture || '').trim(),
        weeks: Array.isArray(course.weeks) ? course.weeks : [],
        updated_at: course.updated_at || ''
      };
    }).filter(course => {
      if (!course.title || seen.has(course.id)) return false;
      seen.add(course.id);
      return true;
    });
  }

  function publishCourses(courses) {
    const normalized = normalizeCourses(courses);
    try {
      localStorage.setItem(KEY, JSON.stringify(normalized));
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { courses: normalized } }));
  }

  function formFromCourse(course) {
    const week = course?.weeks?.[0] || {};
    const day = week.days?.[0] || {};
    return {
      id: course?.id || '',
      title: course?.title || '',
      path: course?.path || '',
      level: course?.level || '',
      status: course?.status || 'active',
      cover: course?.cover || '',
      overviewThumbnail: course?.overviewThumbnail || '',
      description: course?.description || week.lecture || '',
      moduleTitle: week.title || '',
      lessonTitle: day.title || '',
      lessonType: day.visualType || 'lecture',
      minutes: day.college?.minutes || 90,
      readings: (day.college?.readings || []).join('\n'),
      lectureNotes: (day.college?.lectureNotes || []).join('\n'),
      preparation: day.college?.preparation || '',
      lab: day.college?.lab || '',
      assignment: day.college?.assignment || '',
      assessmentType: day.college?.assessment?.type || '',
      assessment: day.college?.assessment?.prompt || day.sections?.[2]?.summary || week.evidence || '',
      passingStandard: day.college?.assessment?.passingStandard || '',
      rubric: (day.college?.rubric || []).join('\n'),
      sectionVideos: sectionVideoLinesFromCourse(course || {}),
      testBank: JSON.stringify(normalizeTest(day.test, course || {}, course?.id || slug(course?.title || 'course'), week.week || 1, day.day || 1), null, 2)
    };
  }

  function firstCourseWeek(form, id) {
    const weekId = `${id}-week-1`;
    const dayId = `${weekId}-day-1`;
    const college = collegeFromForm(form);
    const test = normalizeTest(parseTestBank(form.testBank), form, id, 1, 1);
    return {
      id: weekId,
      month: 1,
      week: 1,
      title: form.moduleTitle || 'Course Orientation',
      lecture: form.description,
      evidence: form.assessment,
      days: [{
        id: dayId,
        day: 1,
        title: form.lessonTitle || 'Course Welcome and Baseline Assessment',
        visualType: form.lessonType,
        visualTitle: 'Course Visual',
        visual: `/assets/images/refzone/lesson-visuals/${form.lessonType}.svg`,
        screenshot: 'Learner screen, course visual, and assessment prompt.',
        presentation: `${form.title} opening lesson`,
        college,
        test,
        sections: [
          { id: `${dayId}-instruction`, title: 'Line Item 1 - Professor Explanation', materialType: 'instruction-slide', collegeRole: 'Professor-facing lecture, required reading, and discussion prompt.', summary: sectionSummary('instruction', form, college), visual: `/assets/images/refzone/lesson-visuals/${form.lessonType}.svg` },
          { id: `${dayId}-student`, title: 'Line Item 2 - What the Student Performs', materialType: 'student-activity', collegeRole: 'Student-facing lab action, assignment, and participation artifact.', summary: sectionSummary('student', form, college), visual: `/assets/images/refzone/lesson-visuals/${form.lessonType}.svg` },
          { id: `${dayId}-evidence`, title: 'Line Item 3 - Expected Outcome, Evidence, and Grading', materialType: 'assessment-evidence', collegeRole: 'Assessment-facing quiz/test item, rubric row, and evidence checkpoint.', summary: sectionSummary('evidence', form, college), visual: `/assets/images/refzone/lesson-visuals/${form.lessonType}.svg` }
        ]
      }]
    };
  }

  function updateFirstWeek(weeks, form) {
    if (!Array.isArray(weeks) || weeks.length === 0) return [firstCourseWeek(form, slug(form.id || form.title))];
    const college = collegeFromForm(form);
    const courseId = slug(form.id || form.title);
    const parsedTest = parseTestBank(form.testBank);
    return weeks.map((week, weekIndex) => {
      if (weekIndex !== 0) return week;
      const days = Array.isArray(week.days) ? week.days.map((day, dayIndex) => {
        if (dayIndex !== 0) return day;
        const test = normalizeTest(parsedTest || day.test, form, courseId, week.week || 1, day.day || 1);
        const sections = Array.isArray(day.sections) ? day.sections.map((section, sectionIndex) => (
          sectionIndex === 0 ? { ...section, summary: sectionSummary('instruction', form, college), collegeRole: section.collegeRole || 'Professor-facing lecture, required reading, and discussion prompt.' }
            : sectionIndex === 1 ? { ...section, summary: sectionSummary('student', form, college), collegeRole: section.collegeRole || 'Student-facing lab action, assignment, and participation artifact.' }
              : sectionIndex === 2 ? { ...section, summary: sectionSummary('evidence', form, college), collegeRole: section.collegeRole || 'Assessment-facing quiz/test item, rubric row, and evidence checkpoint.' }
                : section
        )) : day.sections;
        return { ...day, title: form.lessonTitle || day.title, visualType: form.lessonType, visual: `/assets/images/refzone/lesson-visuals/${form.lessonType}.svg`, college, test, sections };
      }) : week.days;
      return { ...week, title: form.moduleTitle || week.title, lecture: form.description || week.lecture, evidence: form.assessment || week.evidence, days };
    });
  }

  function formToCourse(form, existing) {
    const id = slug(form.id || form.title);
    return {
      ...(existing || {}),
      id,
      title: form.title,
      path: form.path,
      level: form.level,
      status: status(form.status),
      cover: form.cover || `/assets/images/refzone/course-covers/${id}.svg`,
      overviewThumbnail: form.overviewThumbnail || COURSE_OVERVIEW_THUMBNAILS[id] || '',
      description: form.description,
      weeks: applySectionVideosToWeeks(updateFirstWeek(existing?.weeks, form), form)
    };
  }

  function parseTestBank(value) {
    if (!String(value || '').trim()) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function testBankSummary(course) {
    const firstWeek = course?.weeks?.[0] || {};
    const firstDay = firstWeek.days?.[0] || {};
    const test = normalizeTest(firstDay.test, formFromCourse(course), course.id || slug(course.title), firstWeek.week || 1, firstDay.day || 1);
    return {
      title: test.title,
      questions: test.questions.length,
      passingScore: test.passingScore,
      answers: test.answerKey || []
    };
  }

  function courseTestBanks(course) {
    const form = formFromCourse(course);
    return (course?.weeks || []).flatMap((week, weekIndex) => (week.days || []).map((day, dayIndex) => {
      const test = normalizeTest(day.test, {
        ...form,
        moduleTitle: week.title,
        lessonTitle: day.title,
        assessmentType: day.college?.assessment?.type || form.assessmentType
      }, course.id || slug(course.title), week.week || weekIndex + 1, day.day || dayIndex + 1);
      return {
        week: week.week || weekIndex + 1,
        day: day.day || dayIndex + 1,
        lesson: day.title || `Lesson ${dayIndex + 1}`,
        title: test.title,
        questions: test.questions.length,
        passingScore: test.passingScore,
        answers: test.answerKey || []
      };
    }));
  }

  async function apiGet(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || 'Request failed.');
    return data;
  }

  async function apiPost(endpoint, payload) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || 'Request failed.');
    return data;
  }

  async function apiUpload(endpoint, payload) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: payload,
      credentials: 'include'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || 'Upload failed.');
    return data;
  }

  function render(root, state) {
    const needle = state.query.toLowerCase();
    const visible = state.courses.filter(course => !needle || [course.title, course.path, course.description, course.level, course.status].join(' ').toLowerCase().includes(needle));
    const active = state.courses.filter(course => course.status === 'active').length;
    const weeks = state.courses.reduce((sum, course) => sum + (course.weeks?.length || 0), 0);
    const days = state.courses.reduce((sum, course) => sum + (course.weeks || []).reduce((weekSum, week) => weekSum + (week.days?.length || 0), 0), 0);
    const f = state.form;
    const courseImage = f.cover || '';
    const selectedCourseId = state.editingId || '';
    const selectedCourse = state.courses.find(course => course.id === selectedCourseId) || null;
    const selectedTest = selectedCourse ? testBankSummary(selectedCourse) : null;
    const selectedCourseTests = selectedCourse ? courseTestBanks(selectedCourse) : [];
    root.innerHTML = `
      <div class="rtbo-education-crud-summary">
        <div class="rtbo-form-toolbar">
          <button class="btn secondary dark-btn" type="button" data-action="restore" ${state.saving || !state.starterCourses.length ? 'disabled' : ''}>Restore Starter Courses</button>
          <button class="btn" type="button" data-action="new" ${state.saving ? 'disabled' : ''}>Add Course</button>
        </div>
        <div class="rtbo-education-flow-grid">
          <article><b>Courses</b><strong>${state.courses.length}</strong><span>Total managed courses</span></article>
          <article><b>Active</b><strong>${active}</strong><span>Visible on the public page</span></article>
          <article><b>Modules</b><strong>${weeks}</strong><span>Course weeks/modules</span></article>
          <article><b>Lessons</b><strong>${days}</strong><span>Academic day lessons</span></article>
        </div>
      </div>
      <form class="rtbo-education-crud-form" data-refzone-form>
        <label><span>Course Title *</span><select name="courseSelect" data-action="course-select" required>
          <option value="">Select a course</option>
          <option value="__new__" ${selectedCourseId ? '' : 'selected'}>Create New Course</option>
          ${state.courses.map(course => `<option value="${escapeHtml(course.id)}" ${selectedCourseId === course.id ? 'selected' : ''}>${escapeHtml(course.title)}</option>`).join('')}
        </select></label>
        <label><span>Course Name *</span><input name="title" value="${escapeHtml(f.title)}" required></label>
        <label><span>Course ID</span><input name="id" value="${escapeHtml(f.id)}" ${state.editingId ? 'disabled' : ''}></label>
        <label><span>Academic Level</span><input name="level" value="${escapeHtml(f.level)}" placeholder="Bachelor Year 1"></label>
        <label><span>Status</span><select name="status">${['active', 'draft', 'hidden'].map(item => `<option value="${item}" ${f.status === item ? 'selected' : ''}>${item}</option>`).join('')}</select></label>
        <label class="wide"><span>Degree Path</span><input name="path" value="${escapeHtml(f.path)}" placeholder="Bachelor of Science in Basketball Officiating"></label>
        <label class="wide"><span>Course Cover</span><input name="cover" value="${escapeHtml(f.cover)}" placeholder="/assets/images/refzone/course-covers/njcaa-women.svg"></label>
        <div class="wide rtbo-education-image-upload">
          <span>Update Course Image</span>
          <div class="rtbo-education-image-upload-box">
            ${courseImage ? `<img class="rtbo-education-image-preview" src="${escapeHtml(courseImage)}" alt="" loading="lazy" decoding="async">` : '<div class="rtbo-education-image-empty">No image selected</div>'}
            <div>
              <button class="btn secondary dark-btn" type="button" data-action="choose-cover-image" ${state.saving || state.uploadingImage ? 'disabled' : ''}>${state.uploadingImage ? 'Uploading...' : 'Choose Course Image'}</button>
              <small>JPG, PNG, or WebP. Save the course after upload to publish the new image.</small>
            </div>
            <input class="rtbo-education-image-file" type="file" accept="image/jpeg,image/png,image/webp" data-action="cover-image-input">
          </div>
        </div>
        <label class="wide"><span>Course Overview Thumbnail</span><input name="overviewThumbnail" value="${escapeHtml(f.overviewThumbnail)}" placeholder="/assets/images/refzone/course-overviews/nfhs.jpg"></label>
        <div class="full rtbo-education-video-uploader">
          <span>Upload Videos to a Course Section</span>
          <div class="rtbo-education-video-upload-grid">
            <label><span>Week</span><input name="videoUploadWeek" value="${escapeHtml(f.videoUploadWeek || '1')}" placeholder="1 or *"></label>
            <label><span>Day</span><input name="videoUploadDay" value="${escapeHtml(f.videoUploadDay || '1')}" placeholder="1 or *"></label>
            <label><span>Section</span><input name="videoUploadSection" value="${escapeHtml(f.videoUploadSection || '1')}" placeholder="1, 2, 3, section id, or *"></label>
            <button class="btn secondary dark-btn" type="button" data-action="choose-course-videos" ${state.saving || state.uploadingVideo ? 'disabled' : ''}>${state.uploadingVideo ? 'Uploading Videos...' : 'Choose Video Files'}</button>
          </div>
          <small>Select one or multiple MP4, WebM, MOV, or M4V files. Uploaded files are automatically added to the Course Section Video URL(s) field below for the selected week, day, and section.</small>
          <input class="rtbo-education-video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v" multiple data-action="course-video-input">
        </div>
        <label class="full rtbo-education-video-field"><span>Course Section Video URL(s)</span><textarea name="sectionVideos" rows="8" placeholder="Week | Day | Section | Video title | Video URL | Thumbnail URL | Duration | MIME type">${escapeHtml(f.sectionVideos)}</textarea><small>One video per line. Example: 1 | 1 | 1 | Opening Lecture | /assets/videos/refzone/nfhs/nfhs-week-1-day-1.mp4 | /assets/images/refzone/course-overviews/nfhs.jpg | 12:30 | video/mp4. Use * to attach a video to every week, day, or section.</small></label>
        <label><span>First Module</span><input name="moduleTitle" value="${escapeHtml(f.moduleTitle)}" placeholder="Course Orientation"></label>
        <label><span>First Lesson</span><input name="lessonTitle" value="${escapeHtml(f.lessonTitle)}" placeholder="Course Welcome"></label>
        <label><span>Lesson Visual Type</span><select name="lessonType">${visualOptions.map(([value, label]) => `<option value="${value}" ${f.lessonType === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <label><span>Minutes</span><input name="minutes" type="number" min="15" max="480" value="${escapeHtml(f.minutes)}"></label>
        <label class="wide"><span>Course Description</span><textarea name="description" rows="3">${escapeHtml(f.description)}</textarea></label>
        <label class="wide"><span>Required Reading</span><textarea name="readings" rows="5" placeholder="One required reading per line. Include rulebook, casebook, mechanics, directives, and visual study.">${escapeHtml(f.readings)}</textarea></label>
        <label class="wide"><span>Lecture Notes</span><textarea name="lectureNotes" rows="4" placeholder="One professor lecture note per line.">${escapeHtml(f.lectureNotes)}</textarea></label>
        <label class="wide"><span>Preparation</span><textarea name="preparation" rows="2">${escapeHtml(f.preparation)}</textarea></label>
        <label class="wide"><span>Lab / Visual Activity</span><textarea name="lab" rows="3">${escapeHtml(f.lab)}</textarea></label>
        <label class="wide"><span>Daily Assignment</span><textarea name="assignment" rows="3">${escapeHtml(f.assignment)}</textarea></label>
        <label><span>Assessment Type</span><input name="assessmentType" value="${escapeHtml(f.assessmentType)}" placeholder="Rules Quiz, Video Test, Practical"></label>
        <label class="wide"><span>Test / Quiz / Video Assessment</span><textarea name="assessment" rows="3" placeholder="Passing score, quiz prompt, video test requirement, or grading evidence.">${escapeHtml(f.assessment)}</textarea></label>
        <label class="wide"><span>Passing Standard</span><textarea name="passingStandard" rows="2">${escapeHtml(f.passingStandard)}</textarea></label>
        <label class="wide"><span>Grading Rubric</span><textarea name="rubric" rows="5" placeholder="One rubric row per line.">${escapeHtml(f.rubric)}</textarea></label>
        <label class="full"><span>25-Question Test Bank and Answer Key JSON</span><textarea name="testBank" rows="12" placeholder="Questions, options, correct answers, and explanations. Passing score is locked at 85%.">${escapeHtml(f.testBank)}</textarea></label>
        <div class="rtbo-form-toolbar wide">
          <button class="btn" type="submit" ${state.saving ? 'disabled' : ''}>${state.saving ? 'Saving...' : state.editingId ? 'Update Course' : 'Create Course'}</button>
          <button class="btn secondary dark-btn" type="button" data-action="new" ${state.saving ? 'disabled' : ''}>Clear Form</button>
        </div>
      </form>
      ${selectedTest ? `
        <section class="rtbo-education-test-bank-panel">
          <div>
            <p class="eyebrow">Assessment Bank</p>
            <h4>${escapeHtml(selectedTest.title)}</h4>
            <p>${selectedCourseTests.length} lesson tests / 25 questions each / ${selectedTest.passingScore}% passing score. Correct answers are visible here for command-center review only.</p>
          </div>
          <details>
            <summary>View Course Test Answers</summary>
            <div class="rtbo-education-test-bank-list">
              ${selectedCourseTests.map(test => `
                <details>
                  <summary>Week ${test.week}, Day ${test.day}: ${escapeHtml(test.lesson)} (${test.questions} questions)</summary>
                  <ol>
                    ${test.answers.map((answer, index) => `<li><strong>Q${index + 1}: ${escapeHtml(String(answer.correctOptionId || '').toUpperCase())}</strong><span>${escapeHtml(answer.answer || '')}</span><small>${escapeHtml(answer.explanation || '')}</small></li>`).join('')}
                  </ol>
                </details>
              `).join('')}
            </div>
          </details>
        </section>
      ` : ''}
      ${state.message ? `<p class="form-message" role="status">${escapeHtml(state.message)}</p>` : ''}
      <label class="rtbo-education-crud-search"><span>Search Courses</span><input data-action="search" value="${escapeHtml(state.query)}" placeholder="Search title, path, level, or status"></label>
      <div class="rtbo-education-course-list">
        ${visible.length ? visible.map(course => `
          <article>
            <img src="${escapeHtml(course.overviewThumbnail || course.cover || `/assets/images/refzone/course-covers/${course.id}.svg`)}" alt="" loading="lazy" decoding="async">
            <div><span>${escapeHtml(course.status)}</span><strong>${escapeHtml(course.title)}</strong><p>${escapeHtml(course.description || course.path || 'RefZone University course')}</p><small>${course.weeks?.length || 0} modules</small></div>
            <div class="rtbo-form-toolbar">
              <button class="btn secondary dark-btn" type="button" data-action="edit" data-id="${escapeHtml(course.id)}">Edit</button>
              <button class="btn secondary dark-btn" type="button" data-action="duplicate" data-id="${escapeHtml(course.id)}">Duplicate</button>
              <button class="btn secondary dark-btn" type="button" data-action="delete" data-id="${escapeHtml(course.id)}" ${state.saving ? 'disabled' : ''}>Delete</button>
            </div>
          </article>
        `).join('') : '<p class="rtbo-empty-state">No courses match this search.</p>'}
      </div>
    `;
  }

  function readForm(root) {
    const data = new FormData(root.querySelector('[data-refzone-form]'));
    return Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value).trim()]));
  }

  window.rtboMountRefZoneCourseManager = function mount(root) {
    const state = {
      courses: [],
      starterCourses: [],
      form: formFromCourse({ status: 'active' }),
      editingId: '',
      query: '',
      message: '',
      saving: false,
      uploadingImage: false,
      uploadingVideo: false
    };

    async function uploadCourseImage(file) {
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        state.message = 'Course image must be a JPG, PNG, or WebP file.';
        render(root, state);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        state.message = 'Course image must be 5MB or smaller.';
        render(root, state);
        return;
      }
      state.form = { ...state.form, ...readForm(root) };
      state.uploadingImage = true;
      state.message = 'Uploading course image...';
      render(root, state);
      try {
        const payload = new FormData();
        payload.append('image', file);
        const data = await apiUpload('/refzone-course-image-upload.php', payload);
        state.form = { ...state.form, cover: data.url || state.form.cover };
        state.message = 'Course image uploaded. Save the course to publish the updated image.';
      } catch (error) {
        state.message = error.message;
      } finally {
        state.uploadingImage = false;
        render(root, state);
      }
    }

    async function uploadCourseVideos(fileList) {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      const invalid = files.find(file => !/^(video\/mp4|video\/webm|video\/quicktime|video\/x-m4v)$/i.test(file.type) && !/\.(mp4|webm|mov|m4v)$/i.test(file.name || ''));
      if (invalid) {
        state.message = 'Course videos must be MP4, WebM, MOV, or M4V files.';
        render(root, state);
        return;
      }
      state.form = { ...state.form, ...readForm(root) };
      state.uploadingVideo = true;
      state.message = `Uploading ${files.length} course video${files.length === 1 ? '' : 's'}...`;
      render(root, state);
      try {
        const payload = new FormData();
        files.forEach(file => payload.append('videos[]', file));
        const data = await apiUpload('/refzone-course-video-upload.php', payload);
        state.form = appendUploadedVideosToForm(state.form, data.videos || []);
        state.message = `${data.message || 'Course video uploaded.'} Save the course to publish the video URL(s).`;
      } catch (error) {
        state.message = error.message;
      } finally {
        state.uploadingVideo = false;
        render(root, state);
      }
    }

    async function saveAll(nextCourses, message) {
      state.saving = true;
      state.courses = normalizeCourses(nextCourses);
      state.message = message;
      publishCourses(state.courses);
      render(root, state);
      try {
        const data = await apiPost('/refzone-courses.php', { action: 'replace', courses: state.courses });
        state.courses = normalizeCourses(data.courses || state.courses);
        state.message = data.message || message;
        publishCourses(state.courses);
      } catch (error) {
        state.message = `${message} Server save failed: ${error.message}`;
      } finally {
        state.saving = false;
        render(root, state);
      }
    }

    root.onclick = event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const course = state.courses.find(item => item.id === button.dataset.id);
      if (action === 'choose-cover-image') {
        event.preventDefault();
        state.form = { ...state.form, ...readForm(root) };
        root.querySelector('[data-action="cover-image-input"]')?.click();
        return;
      }
      if (action === 'choose-course-videos') {
        event.preventDefault();
        state.form = { ...state.form, ...readForm(root) };
        root.querySelector('[data-action="course-video-input"]')?.click();
        return;
      }
      if (action === 'new') {
        state.editingId = '';
        state.form = formFromCourse({ status: 'active' });
        state.message = 'Create a new RefZone University course, then save it to publish it to the main course page.';
        render(root, state);
      }
      if (action === 'restore') saveAll(state.starterCourses, 'Starter RefZone University courses were restored and published.');
      if (action === 'edit' && course) {
        state.editingId = course.id;
        state.form = formFromCourse(course);
        state.message = `Editing ${course.title}.`;
        render(root, state);
      }
      if (action === 'duplicate' && course) {
        state.editingId = '';
        state.form = formFromCourse({ ...course, id: `${course.id}-copy`, title: `${course.title} Copy`, status: 'draft' });
        state.message = 'Duplicated as a draft. Save it to create the new course.';
        render(root, state);
      }
      if (action === 'delete' && course) saveAll(state.courses.filter(item => item.id !== course.id), `${course.title} was deleted from RefZone University.`);
    };

    root.onchange = event => {
      if (event.target.dataset.action === 'cover-image-input') {
        const file = event.target.files?.[0] || null;
        event.target.value = '';
        uploadCourseImage(file);
        return;
      }
      if (event.target.dataset.action === 'course-video-input') {
        const files = event.target.files || [];
        event.target.value = '';
        uploadCourseVideos(files);
        return;
      }
      if (event.target.dataset.action !== 'course-select') return;
      if (event.target.value === '__new__') {
        state.editingId = '';
        state.form = formFromCourse({ status: 'active' });
        state.message = 'Create a new RefZone University course, then save it to publish it to the main course page.';
        render(root, state);
        return;
      }
      const course = state.courses.find(item => item.id === event.target.value);
      if (!course) return;
      state.editingId = course.id;
      state.form = formFromCourse(course);
      state.message = `Loaded ${course.title}.`;
      render(root, state);
    };

    root.oninput = event => {
      if (event.target.dataset.action === 'search') {
        state.query = event.target.value;
        render(root, state);
        const search = root.querySelector('[data-action="search"]');
        if (search) {
          search.focus();
          search.setSelectionRange(search.value.length, search.value.length);
        }
      }
    };

    root.onsubmit = event => {
      event.preventDefault();
      const form = readForm(root);
      if (!form.title) {
        state.message = 'Course title is required.';
        render(root, state);
        return;
      }
      const existing = state.courses.find(course => course.id === state.editingId || course.id === slug(form.id || form.title));
      const course = formToCourse(form, existing);
      const targetId = state.editingId || course.id;
      const found = state.courses.some(item => item.id === targetId);
      state.editingId = course.id;
      state.form = formFromCourse(course);
      saveAll(found ? state.courses.map(item => item.id === targetId ? course : item) : [course, ...state.courses], `${course.title} was saved to RefZone University.`);
    };

    Promise.all([
      fetch('/refzone-course-materials.json').then(response => response.json()).catch(() => ({ courses: [] })),
      apiGet('/refzone-courses.php?scope=admin').catch(error => ({ error }))
    ]).then(([manifest, server]) => {
      state.starterCourses = normalizeCourses(manifest.courses || []);
      let stored = [];
      try {
        stored = normalizeCourses(JSON.parse(localStorage.getItem(KEY) || '[]'));
      } catch {}
      const managed = normalizeCourses(server.courses || []);
      state.courses = managed.length ? managed : stored.length ? stored : state.starterCourses;
      state.form = formFromCourse(state.courses[0] || {});
      state.editingId = state.courses[0]?.id || '';
      state.message = managed.length ? `Loaded ${managed.length} managed courses.` : 'Starter RefZone University courses loaded. Save changes to publish the managed course list.';
      publishCourses(state.courses);
      render(root, state);
    });

    render(root, state);
  };
})();
