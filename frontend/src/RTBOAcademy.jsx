import React, { useEffect, useMemo, useState } from 'react';
import './rtbo-academy.css';

const MANUAL_URL = '/course-manual.md';
const STORAGE_KEYS = {
  completed: 'rtbo_academy_completed_days',
  notes: 'rtbo_academy_student_notes',
  bookmarks: 'rtbo_academy_bookmarks',
  videos: 'rtbo_academy_video_plan',
  tests: 'rtbo_academy_passed_tests'
};

function slug(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function plainText(lines = []) {
  return lines.join('\n').replace(/^#+\s*/gm, '').trim();
}

const NFHS_WEEK_TOPICS = [
  'Orientation and Professional Identity',
  'NFHS Rules Architecture and Definitions',
  'Pre-Game Duties and Crew Preparation',
  'Primary Coverage and Court Positioning',
  'Freedom of Movement and Contact Judgment',
  'Fouls, Penalties, Signals, and Reporting',
  'Game Administration, Timing, and Substitutions',
  'Coach, Player, and Table Communication',
  'Two-Person Mechanics Laboratory',
  'Three-Person Mechanics Laboratory',
  'Film Study and Live Practicum Evaluation',
  'Postseason Readiness and Capstone Board'
];

const NFHS_DAILY_FLOW = [
  ['Professor Lecture and Socratic Seminar', 'Study the rule foundation, officiating philosophy, and professional expectations for the weekly NFHS topic.'],
  ['Rules, Case Plays, and Written Reasoning', 'Complete written case plays and defend the ruling, restart, penalty, signal, and crew responsibility.'],
  ['Court Laboratory and Mechanics Performance', 'Demonstrate positioning, coverage, signals, rotation discipline, and table reporting on the floor.'],
  ['Film Laboratory and Self-Scout Analysis', 'Review video clips, identify primary coverage, explain judgment, and write correction points.'],
  ['Role-Play, Communication, and Oral Defense', 'Practice coach, player, partner, scorer, timer, and administrator communication under pressure.'],
  ['Live Practicum, Scrimmage, or Livestream Observation', 'Apply the weekly topic in a live or simulated environment with evaluator notes.'],
  ['Reflection, Remediation, Mentor Conference, and Advancement Record', 'Submit the weekly journal, mentor review, remediation plan, and advancement evidence.']
];

function buildNfhsTrack() {
  return {
    id: 'nfhs',
    title: 'NFHS',
    path: 'Certificate in High School Basketball Officiating - NFHS Track',
    level: 'High School Foundation / NFHS Rules',
    raw: [],
    weeks: NFHS_WEEK_TOPICS.map((topic, topicIndex) => {
      const week = topicIndex + 1;
      return {
        id: `nfhs-week-${week}`,
        month: Math.ceil(week / 4),
        week,
        title: topic,
        content: [
          `NFHS Week ${week} builds high school basketball officiating skill through classroom teaching, written testing, mechanics performance, film review, role-play, live practicum, and mentor feedback.`,
          `Students must connect ${topic} to safety, fairness, pace of play, game administration, professional communication, and assignment readiness.`
        ],
        days: NFHS_DAILY_FLOW.map(([title, description], dayIndex) => {
          const day = dayIndex + 1;
          return {
            id: `nfhs-week-${week}-day-${day}`,
            week,
            day,
            title,
            content: [
              description,
              `The official must apply ${topic} using NFHS rule language, high school mechanics, correct signals, clear reporting, and calm game management.`
            ],
            sections: [
              {
                title: 'Student Performance Requirement',
                content: [
                  `Complete the assigned NFHS task for ${topic}, submit written evidence, and show improvement through a measurable score, rubric, film note, or mentor approval.`
                ]
              },
              {
                title: 'Assessment Standard',
                content: [
                  'Passing work must identify the correct rule or mechanic, explain the decision professionally, and describe the expected restart, penalty, report, or crew adjustment when applicable.'
                ]
              }
            ]
          };
        })
      };
    })
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
  const orderedCourseTracks = courseTracks.some(track => track.id === 'nfhs') ? courseTracks : [buildNfhsTrack(), ...courseTracks];
  return [...overviewTracks, ...orderedCourseTracks];
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

function RTBOAcademy({ user = {}, onStatus = () => {} }) {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [query, setQuery] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [completed, setCompleted] = useLocalJson(STORAGE_KEYS.completed, {});
  const [notes, setNotes] = useLocalJson(STORAGE_KEYS.notes, {});
  const [bookmarks, setBookmarks] = useLocalJson(STORAGE_KEYS.bookmarks, {});
  const [videoPlans, setVideoPlans] = useLocalJson(STORAGE_KEYS.videos, {});
  const [passedTests, setPassedTests] = useLocalJson(STORAGE_KEYS.tests, {});

  useEffect(() => {
    document.title = 'RTBO Academy | Education Workspace';
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
  }, [onStatus]);

  const tracks = useMemo(() => splitCourse(markdown), [markdown]);
  const selectedTrack = useMemo(() => tracks.find(track => track.id === selectedTrackId) || tracks[0], [tracks, selectedTrackId]);
  const selectedWeek = selectedTrack?.weeks?.[selectedWeekIndex] || selectedTrack?.weeks?.[0];
  const selectedDay = selectedWeek?.days?.[selectedDayIndex] || selectedWeek?.days?.[0];

  useEffect(() => {
    if (!selectedTrackId && tracks[0]) setSelectedTrackId(tracks[0].id);
  }, [tracks, selectedTrackId]);

  const allDays = useMemo(() => {
    const rows = [];
    tracks.forEach(track => track.weeks.forEach(week => week.days.forEach(day => {
      rows.push({
        track,
        week,
        day,
        text: [track.title, week.title, day.title, ...day.content, ...day.sections.flatMap(section => [section.title, ...section.content])].join(' ')
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

  const dayText = selectedDay ? [
    ...selectedDay.content,
    ...selectedDay.sections.flatMap(section => [`#### ${section.title}`, ...section.content])
  ].join('\n') : plainText(selectedTrack?.raw || []) || 'Select a day to begin.';

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
  }

  function markDay(dayId, value) {
    if (value && !dayTestPassed(dayId)) {
      onStatus('Take and pass this Academy test before marking the module complete.');
      return;
    }
    setCompleted(current => ({ ...current, [dayId]: value }));
    onStatus(value ? 'Academy day marked complete.' : 'Academy day marked incomplete.');
  }

  function passDayTest(dayId) {
    setPassedTests(current => ({ ...current, [dayId]: true }));
    onStatus('Academy test passed. The next module or section is unlocked.');
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
      <section className="rtbo-dashboard-card rtbo-academy-page">
        <p className="rtbo-empty-state">Loading RTBO Academy course manual...</p>
      </section>
    );
  }

  if (!tracks.length) {
    return (
      <section className="rtbo-dashboard-card rtbo-academy-page">
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">Education</p>
            <h3>RTBO Academy</h3>
            <p>The Academy manual did not load. Confirm that course-manual.md is available in the frontend public folder.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rtbo-dashboard-card rtbo-academy-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Education Workspace</p>
          <h3>RTBO Academy</h3>
          <p>College-style training paths with daily coursework, evidence, labs, video planning, and advancement tracking.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={() => window.print()}>Print View</button>
          <a className="btn secondary dark-btn" href={MANUAL_URL} download>Download Manual</a>
        </div>
      </div>

      <div className="rtbo-academy-topbar">
        {[
          ['dashboard', 'Dashboard'],
          ['course', 'Course Browser'],
          ['search', 'Search Manual'],
          ['assignments', 'Assignments'],
          ['videos', 'Video Plan'],
          ['film', 'Film Lab'],
          ['court', 'Court Lab'],
          ['roleplay', 'Role Play'],
          ['certifications', 'Certifications'],
          ['admin', 'Admin Controls']
        ].map(([id, label]) => (
          <button className={activeView === id ? 'active' : ''} type="button" key={id} onClick={() => setActiveView(id)}>{label}</button>
        ))}
      </div>

      {activeView === 'dashboard' && (
        <div className="rtbo-academy-dashboard">
          <section className="rtbo-academy-hero">
            <div>
              <p className="eyebrow">Raising The Bar Officiating</p>
              <h3>RTBO Academy University</h3>
              <p>A full official-development course flow for tracks, weekly modules, daily performance tasks, lab evidence, film study, mentor review, and advancement board readiness.</p>
              <button className="btn" type="button" onClick={() => setActiveView('course')}>Open Course Browser</button>
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
              {tracks.map(track => {
                const days = track.weeks.flatMap(week => week.days);
                const done = days.filter(day => completed[day.id]).length;
                const passed = days.filter(day => passedTests[day.id]).length;
                const pct = days.length ? Math.round((done / days.length) * 100) : 0;
                return (
                  <button className="rtbo-academy-track-card" type="button" key={track.id} onClick={() => { setSelectedTrackId(track.id); setSelectedWeekIndex(0); setSelectedDayIndex(0); setActiveView('course'); }}>
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

      {activeView === 'course' && selectedTrack && (
        <div className="rtbo-academy-course-layout">
          <aside className="rtbo-academy-course-panel">
            <label>Track
              <select value={selectedTrack.id} onChange={(event) => { setSelectedTrackId(event.target.value); setSelectedWeekIndex(0); setSelectedDayIndex(0); }}>
                {tracks.map(track => <option key={track.id} value={track.id}>{track.title}</option>)}
              </select>
            </label>
            <div className="rtbo-academy-week-list">
              {selectedTrack.weeks.map((week, index) => {
                const gate = academyDayGate(selectedTrack, week.days[0]?.id);
                return (
                  <button className={`${index === selectedWeekIndex ? 'active' : ''} ${gate.open ? '' : 'is-locked'}`.trim()} type="button" key={week.id} disabled={!gate.open} onClick={() => openAcademyWeek(selectedTrack, index)}>
                    <span>Week {week.week}</span>
                    <small>{gate.open ? week.title : `Locked until ${gate.previousDay?.title || 'previous test'} is passed`}</small>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rtbo-academy-reader">
            <div className="rtbo-academy-reader-head">
              <div>
                <p className="eyebrow">{selectedTrack.title}</p>
                <h3>{selectedWeek?.title}</h3>
                <p>{selectedTrack.path}</p>
              </div>
              {selectedDay && (
                <div className="rtbo-form-toolbar">
                  <button className="btn secondary dark-btn" type="button" onClick={() => passDayTest(selectedDay.id)}>
                    {dayTestPassed(selectedDay.id) ? 'Test Passed' : 'Take Test'}
                  </button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => markDay(selectedDay.id, !completed[selectedDay.id])}>
                    {completed[selectedDay.id] ? 'Completed' : 'Mark Complete'}
                  </button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => toggleBookmark(selectedDay.id)}>
                    {bookmarks[selectedDay.id] ? 'Bookmarked' : 'Bookmark'}
                  </button>
                </div>
              )}
            </div>

            <div className="rtbo-academy-day-tabs">
              {selectedWeek?.days.map((day, index) => {
                const gate = academyDayGate(selectedTrack, day.id);
                return (
                  <button className={`${index === selectedDayIndex ? 'active' : ''} ${gate.open ? '' : 'is-locked'}`.trim()} type="button" key={day.id} disabled={!gate.open} title={gate.open ? day.title : `Pass ${gate.previousDay?.title || 'the previous test'} first`} onClick={() => openAcademyDay(selectedTrack, selectedWeekIndex, index)}>
                    Day {day.day}: {gate.open ? day.title : 'Locked'}
                  </button>
                );
              })}
            </div>

            <article className="rtbo-academy-content-card">
              <h4>{selectedDay ? `Day ${selectedDay.day} - ${selectedDay.title}` : selectedTrack.title}</h4>
              <div className="rtbo-academy-markdown"><MarkdownBlock text={dayText} /></div>
            </article>

            {selectedDay && (
              <>
                <section className="rtbo-academy-test-rule-card">
                  <div>
                    <h4>Required Module Test</h4>
                    <p>Rule: this test must be taken and passed before the next module or section unlocks.</p>
                  </div>
                  <button className="btn secondary dark-btn" type="button" onClick={() => passDayTest(selectedDay.id)}>
                    {dayTestPassed(selectedDay.id) ? 'Passed' : 'Take and Pass Test'}
                  </button>
                </section>
                <section className="rtbo-academy-notes-card">
                  <h4>Student Notes, Evidence, and Mentor Feedback</h4>
                  <textarea
                    value={notes[selectedDay.id] || ''}
                    onChange={(event) => setNotes(current => ({ ...current, [selectedDay.id]: event.target.value }))}
                    placeholder="Record film notes, mechanics corrections, professor feedback, mentor notes, role-play performance, and completion evidence."
                  />
                </section>
              </>
            )}
          </section>
        </div>
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

      {activeView === 'admin' && (
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
