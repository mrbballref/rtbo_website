import React, { useEffect, useRef } from 'react';
import './education-workspace.css';

function EducationLanding({
  canUseAdminDashboard = false,
  onOpenAcademy = () => {},
  onOpenTests = () => {}
}) {
  const managerRef = useRef(null);

  useEffect(() => {
    if (!canUseAdminDashboard || !managerRef.current) return undefined;
    let cancelled = false;

    function mountManager() {
      if (cancelled || !managerRef.current || !window.rtboMountRefZoneCourseManager) return;
      window.rtboMountRefZoneCourseManager(managerRef.current);
    }

    if (window.rtboMountRefZoneCourseManager) {
      mountManager();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = '/refzone-course-manager.js';
    script.async = true;
    script.onload = mountManager;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [canUseAdminDashboard]);

  if (canUseAdminDashboard) {
    return (
      <section className="rtbo-dashboard-card rtbo-education-landing-page rtbo-education-crud-page">
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">RefZone University CRUD</p>
            <h3>Education Course Management</h3>
            <p>Create, update, duplicate, publish, hide, or delete current and new courses. Active courses publish to the main RefZone University page.</p>
          </div>
        </div>
        <div ref={managerRef} className="rtbo-refzone-manager-shell">
          <p className="rtbo-empty-state">Loading RefZone University course manager...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rtbo-dashboard-card rtbo-education-landing-page">
      <div className="rtbo-education-hero">
        <div>
          <p className="eyebrow">RefZone University</p>
          <h3>Course Workspace</h3>
          <p>Train, test, certify, and advance through structured officiating courses, video lessons, quizzes, written tests, film labs, and mentor review.</p>
          <div className="rtbo-form-toolbar">
            <button className="btn" type="button" onClick={onOpenAcademy}>Open RefZone University</button>
            <button className="btn secondary dark-btn" type="button" onClick={onOpenTests}>Open Test Center</button>
          </div>
        </div>
        <article>
          <span>Primary Flow</span>
          <strong>Course to Certification</strong>
          <small>Lessons, visuals, tests, and evidence stay connected.</small>
        </article>
      </div>
    </section>
  );
}

export default EducationLanding;
