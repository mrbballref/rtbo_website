(function () {
  const API_URL = '/api';
  const KEY = 'rtbo-refzone-managed-courses';
  const EVENT = 'rtbo-refzone-courses-updated';
  const visualOptions = [
    ['lecture', 'Lecture'],
    ['rules', 'Rules / Quiz'],
    ['court-lab', 'Court Lab'],
    ['film-lab', 'Video Test'],
    ['role-play', 'Video Quiz'],
    ['live-practicum', 'Live Practicum'],
    ['reflection', 'Reflection']
  ];

  if (!document.querySelector('link[href="/refzone-course-manager.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/refzone-course-manager.css';
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

  function lines(value) {
    return String(value || '').split(/\n+/).map(item => item.trim()).filter(Boolean);
  }

  function collegeFromForm(form) {
    const readings = lines(form.readings);
    const lectureNotes = lines(form.lectureNotes);
    const rubric = lines(form.rubric);
    return {
      minutes: Number(form.minutes || 90),
      objectives: [
        `Explain ${form.moduleTitle || form.title} using current rulebook, casebook, mechanics, and assignment standards.`,
        `Apply ${form.lessonTitle || 'the lesson'} to realistic game situations with visible evidence.`,
        'Produce a gradable artifact that proves the student can explain, perform, defend, and improve.'
      ],
      readings: readings.length ? readings : [
        `Read the current governing rulebook sections tied to ${form.moduleTitle || form.title}.`,
        'Read current case plays, interpretations, supervisor bulletins, and points of emphasis.',
        'Study current mechanics, coverage, communication, and reporting standards for the assignment level.'
      ],
      preparation: form.preparation || 'Bring rulebook notes, mechanics notebook, film journal, whistle, and the current worksheet.',
      media: 'Course visual, screenshot packet, presentation slide, worksheet frame, and instructor notes.',
      lectureNotes: lectureNotes.length ? lectureNotes : [
        `Frame ${form.moduleTitle || form.title} as a college-level officiating concept.`,
        'Model one correct explanation, one incorrect shortcut, and one supervisor-ready correction statement.'
      ],
      discussion: [
        'Where does this lesson break down in a live game?',
        'What evidence proves the official applied the reading instead of guessing?'
      ],
      lab: form.lab || `Complete the visual worksheet, court/film/role-play task, and mentor observation note for ${form.lessonTitle || 'this lesson'}.`,
      assignment: form.assignment || 'Submit the daily journal entry, worksheet or lab artifact, and one mentor-ready evidence item.',
      assessment: {
        type: form.assessmentType || 'Course Assessment',
        prompt: form.assessment,
        passingStandard: form.passingStandard || '80% or mentor approval is required before the next lesson unlocks.'
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
        overviewThumbnail: String(course.overviewThumbnail || course.overview_thumbnail || '').trim(),
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
      rubric: (day.college?.rubric || []).join('\n')
    };
  }

  function firstCourseWeek(form, id) {
    const weekId = `${id}-week-1`;
    const dayId = `${weekId}-day-1`;
    const college = collegeFromForm(form);
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
    return weeks.map((week, weekIndex) => {
      if (weekIndex !== 0) return week;
      const days = Array.isArray(week.days) ? week.days.map((day, dayIndex) => {
        if (dayIndex !== 0) return day;
        const sections = Array.isArray(day.sections) ? day.sections.map((section, sectionIndex) => (
          sectionIndex === 0 ? { ...section, summary: sectionSummary('instruction', form, college), collegeRole: section.collegeRole || 'Professor-facing lecture, required reading, and discussion prompt.' }
            : sectionIndex === 1 ? { ...section, summary: sectionSummary('student', form, college), collegeRole: section.collegeRole || 'Student-facing lab action, assignment, and participation artifact.' }
              : sectionIndex === 2 ? { ...section, summary: sectionSummary('evidence', form, college), collegeRole: section.collegeRole || 'Assessment-facing quiz/test item, rubric row, and evidence checkpoint.' }
                : section
        )) : day.sections;
        return { ...day, title: form.lessonTitle || day.title, visualType: form.lessonType, visual: `/assets/images/refzone/lesson-visuals/${form.lessonType}.svg`, college, sections };
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
      overviewThumbnail: form.overviewThumbnail,
      description: form.description,
      weeks: updateFirstWeek(existing?.weeks, form)
    };
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

  function render(root, state) {
    const needle = state.query.toLowerCase();
    const visible = state.courses.filter(course => !needle || [course.title, course.path, course.description, course.level, course.status].join(' ').toLowerCase().includes(needle));
    const active = state.courses.filter(course => course.status === 'active').length;
    const weeks = state.courses.reduce((sum, course) => sum + (course.weeks?.length || 0), 0);
    const days = state.courses.reduce((sum, course) => sum + (course.weeks || []).reduce((weekSum, week) => weekSum + (week.days?.length || 0), 0), 0);
    const f = state.form;
    const selectedCourseId = state.editingId || '';
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
        <label class="wide"><span>Course Overview Thumbnail</span><input name="overviewThumbnail" value="${escapeHtml(f.overviewThumbnail)}" placeholder="/assets/images/refzone/course-overviews/nfhs.png"></label>
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
        <div class="rtbo-form-toolbar wide">
          <button class="btn" type="submit" ${state.saving ? 'disabled' : ''}>${state.saving ? 'Saving...' : state.editingId ? 'Update Course' : 'Create Course'}</button>
          <button class="btn secondary dark-btn" type="button" data-action="new" ${state.saving ? 'disabled' : ''}>Clear Form</button>
        </div>
      </form>
      ${state.message ? `<p class="form-message" role="status">${escapeHtml(state.message)}</p>` : ''}
      <label class="rtbo-education-crud-search"><span>Search Courses</span><input data-action="search" value="${escapeHtml(state.query)}" placeholder="Search title, path, level, or status"></label>
      <div class="rtbo-education-course-list">
        ${visible.length ? visible.map(course => `
          <article>
            <img src="${escapeHtml(course.cover || `/assets/images/refzone/course-covers/${course.id}.svg`)}" alt="" loading="lazy" decoding="async">
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
      saving: false
    };

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
