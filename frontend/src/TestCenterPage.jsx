import React from 'react';
import { ACADEMY_TEST_CENTER_WIDGETS } from './academyTestWidgets.js';
import './education-workspace.css';

function TestCenterPage({
  testResults = [],
  dashboardReadinessChecks = [],
  dashboardReadinessSummary = {},
  runDashboardTest = () => {},
  runProfileTest = () => {},
  exportCsv = () => {},
  openReadinessTarget = () => {},
  sectionLabels = new Map(),
  onOpenAcademy = () => {}
}) {
  const visibleResults = testResults.length ? testResults : dashboardReadinessChecks;

  return (
    <section className="rtbo-dashboard-card rtbo-test-center-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Dashboard QA</p>
          <h3>RTBO Launch Test Center</h3>
          <p>Run readiness checks before going live, then use the Academy test widgets to manage official development assessments.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn" type="button" onClick={runDashboardTest}>Run Full Dashboard Test</button>
          <button className="btn secondary dark-btn" type="button" onClick={runProfileTest}>Run Profile Test</button>
          <button className="btn secondary dark-btn" type="button" onClick={() => exportCsv('rtbo-launch-readiness', [
            ['Check', 'Status', 'Detail'],
            ...dashboardReadinessChecks.map(check => [check.label, check.status, check.detail])
          ])}>Export CSV</button>
        </div>
      </div>

      <div className="rtbo-test-summary">
        <article><span>Passed</span><strong>{dashboardReadinessSummary.passed || 0}</strong><small>Live checks already in good shape.</small></article>
        <article><span>Ready</span><strong>{dashboardReadinessSummary.ready || 0}</strong><small>Available but waiting on more records.</small></article>
        <article><span>Review</span><strong>{dashboardReadinessSummary.review || 0}</strong><small>Needs admin attention before launch.</small></article>
      </div>

      <section className="rtbo-academy-test-center-panel">
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">RTBO Academy</p>
            <h3>Academy Tests</h3>
            <p>Every Academy assessment is listed here as a test widget so the Education workflow and launch QA stay connected.</p>
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

      <div className="rtbo-test-grid">
        {visibleResults.map(result => (
          <article className={`status-${String(result.status || 'ready').toLowerCase().replace(/\s+/g, '-')}`} key={result.label}>
            <div className="rtbo-test-card-head">
              <span>{result.group || 'Dashboard'}</span>
              <b>{result.status}</b>
            </div>
            <strong>{result.label}</strong>
            <span>{result.detail}</span>
            {result.actionSection && (
              <button className="btn secondary dark-btn" type="button" onClick={() => openReadinessTarget(result.actionSection)}>
                Open {result.actionLabel || sectionLabels.get(result.actionSection) || 'Section'}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default TestCenterPage;
