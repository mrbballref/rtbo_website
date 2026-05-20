import React from 'react';
import { ACADEMY_TEST_CENTER_WIDGETS } from './academyTestWidgets.js';
import './education-workspace.css';

function TestCenterPage({
  onOpenAcademy = () => {}
}) {
  return (
    <section className="rtbo-dashboard-card rtbo-test-center-page">
      <section className="rtbo-academy-test-center-panel">
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">RTBO Academy</p>
            <h3>Academy Tests</h3>
            <p>Every Academy assessment is listed here as a test widget for official development, course completion, certification, and advancement readiness.</p>
          </div>
          <button className="btn secondary dark-btn" type="button" onClick={onOpenAcademy}>Open RTBO Academy</button>
        </div>
        <div className="rtbo-academy-test-widget-grid">
          {ACADEMY_TEST_CENTER_WIDGETS.map(test => (
            <article className="rtbo-academy-test-widget" key={test.label}>
              <div className="rtbo-test-card-head">
                <span>{test.group}</span>
                <b>{test.status}</b>
              </div>
              <strong>{test.label}</strong>
              <span>{test.detail}</span>
              <small>{test.evidence}</small>
              <button className="btn secondary dark-btn" type="button" onClick={onOpenAcademy}>Open Test Workflow</button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default TestCenterPage;
