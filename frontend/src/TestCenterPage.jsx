import React, { useEffect, useMemo, useState } from 'react';
import './education-workspace.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

function slug(value = '') {
  return String(value || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'course';
}

function optionId(index) {
  return String.fromCharCode(97 + index);
}

function normalizeCourses(items = []) {
  return (Array.isArray(items) ? items : []).map((course, courseIndex) => {
    const courseId = slug(course.id || course.title || `course-${courseIndex + 1}`);
    return {
      id: courseId,
      title: course.title || `RefZone Course ${courseIndex + 1}`,
      path: course.path || course.overview || course.description || '',
      level: course.level || 'RefZone University',
      status: course.status || 'active',
      weeks: (Array.isArray(course.weeks) ? course.weeks : []).map((week, weekIndex) => ({
        id: week.id || `${courseId}-week-${weekIndex + 1}`,
        week: Number(week.week || weekIndex + 1),
        title: week.title || `Module ${weekIndex + 1}`,
        days: (Array.isArray(week.days) ? week.days : []).map((day, dayIndex) => ({
          id: day.id || `${courseId}-week-${weekIndex + 1}-day-${dayIndex + 1}`,
          week: Number(week.week || weekIndex + 1),
          day: Number(day.day || dayIndex + 1),
          title: day.title || `Lesson ${dayIndex + 1}`,
          college: day.college || {},
          test: day.test || null
        }))
      }))
    };
  }).filter(course => course.title && course.weeks.length);
}

function normalizeQuestions(rawQuestions = []) {
  return (Array.isArray(rawQuestions) ? rawQuestions : []).map((question, questionIndex) => {
    const options = (Array.isArray(question.options) ? question.options : []).map((option, optionIndex) => ({
      id: String(option.id || optionId(optionIndex)).toLowerCase(),
      text: String(option.text || '').trim()
    })).filter(option => option.text);
    return {
      id: String(question.id || `q${questionIndex + 1}`),
      type: question.type || 'multiple-choice',
      prompt: String(question.prompt || '').trim(),
      options,
      correctOptionId: String(question.correctOptionId || question.correct_option_id || '').toLowerCase(),
      explanation: String(question.explanation || '').trim()
    };
  }).filter(question => question.prompt && question.options.length >= 2 && question.correctOptionId);
}

function answerKeyForQuestions(questions = []) {
  return questions.map(question => ({
    questionId: question.id,
    correctOptionId: question.correctOptionId,
    answer: question.options.find(option => option.id === question.correctOptionId)?.text || '',
    explanation: question.explanation || ''
  }));
}

function normalizeTestBank(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  const questions = normalizeQuestions(raw.questions);
  return {
    id: String(raw.id || 'course-test'),
    title: String(raw.title || 'Course Assessment'),
    type: String(raw.type || 'Course Assessment'),
    passingScore: 85,
    timeLimitMinutes: Number(raw.timeLimitMinutes || raw.time_limit_minutes || 45),
    instructions: String(raw.instructions || '').trim(),
    evidencePrompt: String(raw.evidencePrompt || raw.evidence_prompt || '').trim(),
    questions,
    answerKey: answerKeyForQuestions(questions)
  };
}

function collegeForDay(week = {}, day = {}) {
  const college = day.college || {};
  return {
    assessment: {
      type: college.assessment?.type || 'Course Assessment',
      prompt: college.assessment?.prompt || week.evidence || '',
      passingStandard: college.assessment?.passingStandard || '85% is required before the next module unlocks.'
    },
    readings: Array.isArray(college.readings) ? college.readings : [],
    assignment: college.assignment || 'Submit the daily worksheet, lab artifact, and mentor-ready evidence item.'
  };
}

function fallbackTestForDay(course = {}, week = {}, day = {}) {
  const college = collegeForDay(week, day);
  const courseTitle = course.title || 'RefZone Course';
  const weekTitle = week.title || 'this module';
  const dayTitle = day.title || 'this lesson';
  const type = college.assessment.type || 'Course Assessment';
  const baseQuestions = [
    {
      prompt: `Before ${dayTitle}, which preparation best supports ${weekTitle}?`,
      options: [
        college.readings[0] || `Read the current governing material tied to ${weekTitle}.`,
        'Wait until after class to learn the rule.',
        'Rely only on personal game experience.',
        'Study signals without reading the rule or mechanics source.'
      ],
      correct: 'a',
      explanation: 'RefZone lessons require current reading, rules reasoning, mechanics study, and evidence before advancement.'
    },
    {
      prompt: `What is required evidence for ${dayTitle}?`,
      options: [
        'Attendance only.',
        college.assignment,
        'A casual verbal statement.',
        'No evidence is required.'
      ],
      correct: 'b',
      explanation: 'Course completion requires a gradable artifact, not a button click.'
    },
    {
      prompt: `What should the official connect when applying ${weekTitle}?`,
      options: [
        'Only crowd reaction.',
        'Rule language, case-play logic, mechanics, communication, and evidence quality.',
        'Only the final score.',
        'Only personal preference.'
      ],
      correct: 'b',
      explanation: 'The course standard is to explain, perform, defend, and improve using evidence.'
    },
    {
      prompt: `What is the best professional response when challenged during ${courseTitle} play?`,
      options: [
        'Argue until the decision is accepted.',
        'Ignore the concern.',
        'Give a short, accurate explanation tied to the rule source, crew responsibility, mechanic, and correction point.',
        'Change the decision only to avoid conflict.'
      ],
      correct: 'c',
      explanation: 'Professional communication should be concise, accurate, and tied to the officiating standard.'
    },
    {
      prompt: `What happens if the student does not pass this ${type}?`,
      options: [
        'The next module still unlocks automatically.',
        'The student repeats evidence, corrects missed concepts, and completes remediation before advancing.',
        'The course deletes the assessment.',
        'The mentor ignores the missed standard.'
      ],
      correct: 'b',
      explanation: college.assessment.passingStandard
    }
  ];
  const patternQuestions = Array.from({ length: 20 }, (_, index) => {
    const number = index + 6;
    const patterns = [
      {
        prompt: `Question ${number}: Which reading action most directly supports ${weekTitle}?`,
        options: [
          'Identify exact rule language, exception, penalty, restart, and mechanic connected to the play.',
          'Ignore exceptions and rely only on the common ruling.',
          'Avoid written evidence until the test is complete.',
          'Ask the coach which rule should apply.'
        ],
        explanation: 'Rule-source accuracy comes before judgment or mechanics.'
      },
      {
        prompt: `Question ${number}: What mechanics evidence best proves mastery of ${weekTitle}?`,
        options: [
          'A diagram or note showing starting position, movement path, primary coverage, secondary awareness, signal, and reporting route.',
          'A statement that the official was close to the play.',
          'A score-only summary.',
          'A generic note saying the crew worked hard.'
        ],
        explanation: 'Mechanics mastery must be visible and reviewable.'
      },
      {
        prompt: `Question ${number}: Which communication response best fits ${courseTitle}?`,
        options: [
          'Use brief, calm, rule-based language, then return focus to the game.',
          'Keep explaining until the coach agrees.',
          'Use sarcasm to end the conversation.',
          'Refuse all communication regardless of the situation.'
        ],
        explanation: 'Professional communication is accurate, brief, composed, and game-centered.'
      },
      {
        prompt: `Question ${number}: What should a film or visual review identify for ${dayTitle}?`,
        options: [
          'Primary coverage, open or closed angle, contact effect, crew help, and the correction point.',
          'Only whether the call was popular.',
          'Only the player who scored.',
          'Only whether the official looked confident.'
        ],
        explanation: 'Film work must identify observable officiating factors.'
      },
      {
        prompt: `Question ${number}: Which portfolio evidence satisfies advancement?`,
        options: [
          'Corrected quiz results, written rule defense, lab artifact, mentor note, and a specific next-step correction plan.',
          'A button click showing the lesson as passed.',
          'A blank worksheet with no notes.',
          'A promise to study later.'
        ],
        explanation: 'Advancement requires evidence that can be reviewed by faculty and mentors.'
      }
    ];
    return { ...patterns[index % patterns.length], correct: 'a' };
  });
  const questions = [...baseQuestions, ...patternQuestions].map((question, index) => ({
    id: `${day.id || 'day'}-q${index + 1}`,
    type: 'multiple-choice',
    prompt: question.prompt,
    options: question.options.map((text, optionIndex) => ({ id: optionId(optionIndex), text })),
    correctOptionId: question.correct,
    explanation: question.explanation
  }));

  return {
    id: `${day.id || 'day'}-test`,
    title: `${courseTitle} Week ${week.week || day.week || 1}, Day ${day.day || 1} ${type}`,
    type,
    passingScore: 85,
    timeLimitMinutes: 45,
    instructions: `Complete this 25-question scored assessment after studying ${weekTitle}. A minimum score of 85% is required before the next module unlocks.`,
    evidencePrompt: `In 3-5 sentences, cite the rule or mechanic connected to ${weekTitle}, explain the official's responsibility during ${dayTitle}, and name one correction target.`,
    questions,
    answerKey: answerKeyForQuestions(questions)
  };
}

function testForDay(course = {}, week = {}, day = {}) {
  const fallback = fallbackTestForDay(course, week, day);
  const saved = normalizeTestBank(day.test);
  const questions = saved?.questions?.length >= 25 ? saved.questions.slice(0, 25) : fallback.questions;
  return {
    ...fallback,
    ...(saved || {}),
    passingScore: 85,
    questions,
    answerKey: answerKeyForQuestions(questions)
  };
}

function courseTestRows(courses = []) {
  return courses.flatMap(course => course.weeks.flatMap(week => week.days.map(day => {
    const test = testForDay(course, week, day);
    return {
      key: `${course.id}-${week.id}-${day.id}`,
      course,
      week,
      day,
      test
    };
  })));
}

function TestCenterPage({
  onOpenAcademy = () => {}
}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedWeekId, setSelectedWeekId] = useState('all');
  const [selectedTestKey, setSelectedTestKey] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/refzone-courses.php?scope=admin`, { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.message || 'Course API failed.');
        const normalized = normalizeCourses(data.courses || []);
        if (cancelled) return;
        setCourses(normalized);
        setSelectedCourseId(normalized[0]?.id || '');
        setMessage(`Loaded ${normalized.length} RefZone course test banks from the command-center course source.`);
      } catch (error) {
        try {
          const response = await fetch('/refzone-course-materials.json');
          const data = await response.json();
          const normalized = normalizeCourses(data.courses || []);
          if (cancelled) return;
          setCourses(normalized);
          setSelectedCourseId(normalized[0]?.id || '');
          setMessage('Loaded starter RefZone course test banks from the course manifest.');
        } catch {
          if (!cancelled) setMessage(`Tests could not be loaded: ${error.message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => courseTestRows(courses), [courses]);
  const selectedCourse = courses.find(course => course.id === selectedCourseId) || courses[0] || null;
  const selectedCourseRows = rows.filter(row => row.course.id === selectedCourse?.id);
  const selectedWeeks = selectedCourse?.weeks || [];
  const needle = query.trim().toLowerCase();
  const visibleRows = selectedCourseRows.filter(row => (
    (selectedWeekId === 'all' || row.week.id === selectedWeekId)
    && (!needle || [row.course.title, row.week.title, row.day.title, row.test.title, row.test.type].join(' ').toLowerCase().includes(needle))
  ));
  const selectedRow = visibleRows.find(row => row.key === selectedTestKey)
    || selectedCourseRows.find(row => row.key === selectedTestKey)
    || visibleRows[0]
    || rows[0]
    || null;
  const totalQuestions = rows.reduce((sum, row) => sum + row.test.questions.length, 0);

  function chooseCourse(courseId) {
    setSelectedCourseId(courseId);
    setSelectedWeekId('all');
    setSelectedTestKey('');
  }

  return (
    <section className="rtbo-dashboard-card rtbo-test-center-page">
      <section className="rtbo-academy-test-center-panel">
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">RefZone University</p>
            <h3>Test Center & Answer Keys</h3>
            <p>Every RefZone course day has a 25-question assessment, 85% passing standard, evidence prompt, and command-center answer key.</p>
          </div>
          <button className="btn secondary dark-btn" type="button" onClick={onOpenAcademy}>Open RefZone University</button>
        </div>

        <div className="rtbo-test-center-summary-grid">
          <article><span>Courses</span><strong>{courses.length}</strong><small>Loaded test banks</small></article>
          <article><span>Tests</span><strong>{rows.length}</strong><small>Every course day</small></article>
          <article><span>Questions</span><strong>{totalQuestions}</strong><small>25 per assessment</small></article>
          <article><span>Passing</span><strong>85%</strong><small>Required to advance</small></article>
        </div>

        <div className="rtbo-test-center-toolbar">
          <label>Course
            <select value={selectedCourse?.id || ''} onChange={(event) => chooseCourse(event.target.value)}>
              {courses.map(course => <option value={course.id} key={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label>Week
            <select value={selectedWeekId} onChange={(event) => { setSelectedWeekId(event.target.value); setSelectedTestKey(''); }}>
              <option value="all">All weeks</option>
              {selectedWeeks.map(week => <option value={week.id} key={week.id}>Week {week.week}: {week.title}</option>)}
            </select>
          </label>
          <label>Search Tests
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, module, day, or type" />
          </label>
        </div>

        {loading && <p className="rtbo-empty-state">Loading RefZone tests and answer keys...</p>}
        {!loading && message && <p className="form-message" role="status">{message}</p>}

        {!loading && (
          <div className="rtbo-test-center-layout">
            <div className="rtbo-test-center-list" aria-label="RefZone course tests">
              {visibleRows.length ? visibleRows.map(row => (
                <article className={`rtbo-test-workflow-card ${selectedRow?.key === row.key ? 'active' : ''}`.trim()} key={row.key}>
                  <div>
                    <span>Week {row.week.week} / Day {row.day.day}</span>
                    <strong>{row.day.title}</strong>
                    <small>{row.week.title}</small>
                  </div>
                  <p>{row.test.type} / {row.test.questions.length} questions / {row.test.passingScore}% passing</p>
                  <button className="btn secondary dark-btn" type="button" onClick={() => setSelectedTestKey(row.key)}>Open Test & Answer Key</button>
                </article>
              )) : <p className="rtbo-empty-state">No tests match this filter.</p>}
            </div>

            {selectedRow && (
              <section className="rtbo-test-answer-key-panel">
                <div className="rtbo-dashboard-card-head">
                  <div>
                    <p className="eyebrow">{selectedRow.course.title} / Week {selectedRow.week.week} / Day {selectedRow.day.day}</p>
                    <h3>{selectedRow.test.title}</h3>
                    <p>{selectedRow.test.instructions}</p>
                  </div>
                </div>
                <div className="rtbo-test-center-summary-grid compact">
                  <article><span>Type</span><strong>{selectedRow.test.type}</strong></article>
                  <article><span>Questions</span><strong>{selectedRow.test.questions.length}</strong></article>
                  <article><span>Passing</span><strong>{selectedRow.test.passingScore}%</strong></article>
                  <article><span>Time</span><strong>{selectedRow.test.timeLimitMinutes} min</strong></article>
                </div>
                <article className="rtbo-test-evidence-card">
                  <span>Evidence Prompt</span>
                  <p>{selectedRow.test.evidencePrompt}</p>
                </article>
                <ol className="rtbo-test-answer-list">
                  {selectedRow.test.questions.map((question, questionIndex) => {
                    const answer = selectedRow.test.answerKey[questionIndex] || {};
                    return (
                      <li key={question.id}>
                        <div className="rtbo-test-question-head">
                          <strong>Q{questionIndex + 1}</strong>
                          <p>{question.prompt}</p>
                        </div>
                        <div className="rtbo-test-option-list">
                          {question.options.map(option => (
                            <span className={option.id === question.correctOptionId ? 'correct' : ''} key={option.id}>
                              <b>{option.id.toUpperCase()}.</b> {option.text}
                            </span>
                          ))}
                        </div>
                        <footer>
                          <b>Answer: {String(answer.correctOptionId || question.correctOptionId).toUpperCase()}</b>
                          <span>{answer.answer}</span>
                          {answer.explanation && <small>{answer.explanation}</small>}
                        </footer>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

export default TestCenterPage;
