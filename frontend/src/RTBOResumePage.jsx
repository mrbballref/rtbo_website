import React, { useEffect, useMemo, useState } from 'react';
import {
  RTBO_RESUME_UPDATED_EVENT,
  normalizeRtboResume,
  readStoredRtboResume,
  publishRtboResume
} from './rtbo-resume-data.js';
import './rtbo-resume-page.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function ResumeTitle({ title, accentTitle }) {
  const accent = String(accentTitle || '').trim();
  if (!accent || !String(title || '').includes(accent)) {
    return <>{title}</>;
  }
  const [before, after] = String(title).split(accent);
  return <>{before}<span>{accent}</span>{after}</>;
}

function mailtoHref(email, subject) {
  const cleanEmail = String(email || '').trim() || 'admin@rtbofficiating.com';
  const cleanSubject = encodeURIComponent(String(subject || 'RTBO Officiating Request').trim());
  return `mailto:${cleanEmail}?subject=${cleanSubject}`;
}

export default function RTBOResumePage() {
  const [resume, setResume] = useState(readStoredRtboResume);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiGet('/resume.php')
      .then(data => {
        if (!active) return;
        const nextResume = publishRtboResume(data.resume || {});
        setResume(nextResume);
      })
      .catch(() => {
        if (active) setResume(readStoredRtboResume());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    function syncResume(event) {
      const nextResume = event?.detail?.resume ? normalizeRtboResume(event.detail.resume) : readStoredRtboResume();
      setResume(nextResume);
    }

    function syncStoredResume(event) {
      if (event.key !== 'rtbo-digital-resume') return;
      setResume(readStoredRtboResume());
    }

    window.addEventListener(RTBO_RESUME_UPDATED_EVENT, syncResume);
    window.addEventListener('storage', syncStoredResume);
    return () => {
      active = false;
      window.removeEventListener(RTBO_RESUME_UPDATED_EVENT, syncResume);
      window.removeEventListener('storage', syncStoredResume);
    };
  }, []);

  const contactItems = useMemo(() => ([
    ['Primary Contact', resume.contact.primary],
    ['Phone / Text', resume.contact.phone],
    ['Email', resume.contact.email],
    ['Website / Social', resume.contact.website]
  ]), [resume.contact]);

  return (
    <section className="rtob-resume-page" id="rtob-digital-resume" aria-labelledby="rtob-resume-title">
      <div className="rtob-resume-wrap">
        <header className="rtob-resume-hero">
          <div className="rtob-resume-hero-inner">
            <div className="rtob-resume-logo-card">
              <img src={resume.logoUrl} alt={`${resume.organization} logo`} loading="eager" decoding="async" />
            </div>

            <div className="rtob-resume-hero-copy">
              <p className="rtob-resume-kicker">{resume.kicker}</p>
              <h2 className="rtob-resume-title" id="rtob-resume-title">
                <ResumeTitle title={resume.title} accentTitle={resume.accentTitle} />
              </h2>
              <p>{resume.subtitle}</p>
              <div className="rtob-resume-action-row" aria-label="Resume actions">
                <a className="btn" href={resume.pdfUrl} target="_blank" rel="noopener">Download Digital Resume</a>
                <a className="btn secondary dark-btn" href={mailtoHref(resume.contact.email, resume.requestSubject)}>Request Officials</a>
              </div>
            </div>
          </div>

          <div className="rtob-resume-info-bar" aria-label="Contact information">
            {contactItems.map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </header>

        <div className="rtob-resume-card-grid">
          <article className="rtob-resume-card">
            <h3>Professional Profile</h3>
            <p>{resume.summary}</p>
          </article>

          <aside className="rtob-resume-card rtob-resume-featured">
            <span>{resume.featuredEvent.label}</span>
            <h3>{resume.featuredEvent.title}</h3>
            <p><strong>{resume.featuredEvent.date}</strong> | {resume.featuredEvent.location} | {resume.featuredEvent.body}</p>
          </aside>
        </div>

        <section className="rtob-resume-card">
          <h3>Core Services and Capabilities</h3>
          <div className="rtob-resume-services">
            {resume.services.map((service, index) => (
              <article key={`${service.title}-${index}`}>
                <h4>{service.title}</h4>
                <p>{service.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rtob-resume-card">
          <h3>Documented Dates and Event Experience</h3>
          <p>Event history provided for RTBO, organized by date, event partner or host, and location.</p>
          <div className="rtob-resume-table-wrap">
            <table className="rtob-resume-events-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Event / Partner</th>
                  <th scope="col">Location</th>
                </tr>
              </thead>
              <tbody>
                {resume.events.map((eventItem, index) => (
                  <tr className={eventItem.highlight ? 'is-highlighted' : ''} key={`${eventItem.date}-${eventItem.event}-${index}`}>
                    <td>{eventItem.date}</td>
                    <td>{eventItem.event}</td>
                    <td>{eventItem.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rtob-resume-card">
          <h3>Professional Standards and Operating Approach</h3>
          <div className="rtob-resume-standard-grid">
            {resume.standards.map((standard, index) => (
              <article key={`${standard.title}-${index}`}>
                <h4>{standard.title}</h4>
                <ul>
                  {standard.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="rtob-resume-card">
          <h3>Administrative Information</h3>
          <dl className="rtob-resume-admin-list">
            {resume.adminInfo.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {loading && <p className="rtbo-empty-state">Loading the latest RTBO resume...</p>}
      </div>
    </section>
  );
}
