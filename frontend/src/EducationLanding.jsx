import React from 'react';
import './education-workspace.css';

function EducationLanding({
  canUseAdminDashboard = false,
  onOpenAcademy = () => {},
  onOpenTests = () => {}
}) {
  const workflowCards = [
    ['1', 'Enroll', 'Place officials into NFHS, NJCAA, NAIA, NCAA, WNBA, or NBA learning paths.'],
    ['2', 'Train', 'Use daily lessons, video plans, film labs, court labs, and communication role-play.'],
    ['3', 'Test', 'Validate knowledge through written exams, case plays, mechanics, film, and oral defense.'],
    ['4', 'Advance', 'Use mentor review, evidence, and capstone boards to move officials into assignment tiers.']
  ];
  const widgets = [
    {
      title: 'RTBO Academy',
      detail: 'Course tracks, daily modules, labs, progress, notes, video planning, and certification flow.',
      action: onOpenAcademy,
      label: 'Open Academy'
    },
    {
      title: 'Test Center',
      detail: 'Dashboard readiness checks plus every Academy assessment as launch-ready testing widgets.',
      action: onOpenTests,
      label: 'Open Test Center'
    },
    {
      title: 'Video Curriculum',
      detail: 'Plan professor lectures, rules reviews, court demos, film labs, role-play, and assessments.',
      action: onOpenAcademy,
      label: 'Plan Videos'
    },
    {
      title: 'Certification Board',
      detail: 'Track journals, rubrics, film worksheets, mentor notes, oral defenses, and advancement decisions.',
      action: onOpenAcademy,
      label: 'Review Path'
    }
  ];

  return (
    <section className="rtbo-dashboard-card rtbo-education-landing-page">
      <div className="rtbo-education-hero">
        <div>
          <p className="eyebrow">Education</p>
          <h3>RTBO Education Workspace</h3>
          <p>Train, test, certify, and advance officials through a structured basketball officiating academy built around classroom work, court performance, film study, live evaluation, and mentor review.</p>
          <div className="rtbo-form-toolbar">
            <button className="btn" type="button" onClick={onOpenAcademy}>Open RTBO Academy</button>
            <button className="btn secondary dark-btn" type="button" onClick={onOpenTests}>Open Test Center</button>
          </div>
        </div>
        <article>
          <span>Primary Flow</span>
          <strong>Academy to Assignment</strong>
          <small>{canUseAdminDashboard ? 'Super Admins can review curriculum, testing, and advancement readiness.' : 'Officials can train, complete coursework, and track readiness.'}</small>
        </article>
      </div>

      <div className="rtbo-education-widget-grid">
        {widgets.map(widget => (
          <button className="rtbo-education-widget" type="button" key={widget.title} onClick={widget.action}>
            <span>{widget.title}</span>
            <strong>{widget.label}</strong>
            <small>{widget.detail}</small>
          </button>
        ))}
      </div>

      <section className="rtbo-education-workflow">
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">Course Flow</p>
            <h3>Recommended Education Workflow</h3>
            <p>Use the Academy as the instruction center and the Test Center as the assessment control room.</p>
          </div>
        </div>
        <div className="rtbo-education-flow-grid">
          {workflowCards.map(([step, title, detail]) => (
            <article key={title}>
              <b>{step}</b>
              <strong>{title}</strong>
              <span>{detail}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default EducationLanding;
