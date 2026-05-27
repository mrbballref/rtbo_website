import React, { useEffect, useMemo, useState } from 'react';
import {
  RTBO_RESUME_UPDATED_EVENT,
  normalizeRtboResume,
  readStoredRtboResume,
  publishRtboResume
} from './rtbo-resume-data.js';
import './rtbo-resume-page.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const REQUEST_OFFICIALS_INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  courts_used: '',
  event_days: '',
  games_per_floor: '',
  crew_type: '',
  game_fee_per_ref: '',
  payment_method: '',
  payment_timeline: '',
  branded_merch_required: '',
  branded_merch_provided: ''
};
const COURT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];
const CREW_OPTIONS = ['2-man', '3-man'];
const PAYMENT_OPTIONS = ['Cash', 'Direct Deposit', 'Check'];
const YES_NO_OPTIONS = ['Yes', 'No'];

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

async function apiPostJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
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

function Field({ label, children, required = true, className = '' }) {
  return (
    <label className={`rtob-official-request-field ${className}`.trim()}>
      <span>{label}{required && <sup aria-hidden="true">*</sup>}</span>
      {children}
    </label>
  );
}

function getResumeEventMark(eventName) {
  const label = String(eventName || '').trim();
  const normalized = label.toUpperCase();
  if (normalized.includes('UAPB')) return 'UAPB';
  if (normalized.includes('UALR')) return 'UALR';
  if (normalized.includes('UCA')) return 'UCA';
  if (normalized.includes('LYON')) return 'LYON';
  if (normalized.includes('HOP STEP')) return 'HSE';
  if (normalized.includes('BIG MILLER')) return 'BM';
  const words = label.replace(/[^a-z0-9\s]/gi, ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 3).map(word => word[0]).join('').toUpperCase() || 'RTBO';
}

export default function RTBOResumePage() {
  const [resume, setResume] = useState(readStoredRtboResume);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState(REQUEST_OFFICIALS_INITIAL_FORM);
  const [requestStatus, setRequestStatus] = useState({ type: '', message: '' });
  const [requestSubmitting, setRequestSubmitting] = useState(false);

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

  useEffect(() => {
    if (!requestModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setRequestModalOpen(false);
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [requestModalOpen]);

  const contactItems = useMemo(() => ([
    ['Primary Contact', resume.contact.primary],
    ['Phone / Text', resume.contact.phone],
    ['Email', resume.contact.email],
    ['Website / Social', resume.contact.website]
  ]), [resume.contact]);

  const updateRequestField = (field, value) => {
    setRequestForm(current => ({
      ...current,
      [field]: value
    }));
    if (requestStatus.type === 'error') {
      setRequestStatus({ type: '', message: '' });
    }
  };

  const openRequestModal = () => {
    setRequestStatus({ type: '', message: '' });
    setRequestModalOpen(true);
  };

  const closeRequestModal = () => {
    if (requestSubmitting) return;
    setRequestModalOpen(false);
  };

  const submitOfficialRequest = async (event) => {
    event.preventDefault();
    setRequestSubmitting(true);
    setRequestStatus({ type: 'info', message: 'Creating the official request PDF and sending it to RTBO...' });
    try {
      const data = await apiPostJson('/resume-official-request.php', requestForm);
      setRequestForm(REQUEST_OFFICIALS_INITIAL_FORM);
      setRequestStatus({
        type: 'success',
        message: data.message || 'Your official request was sent to RTBO successfully.'
      });
    } catch (error) {
      setRequestStatus({
        type: 'error',
        message: error.message || 'Your official request could not be sent right now.'
      });
    } finally {
      setRequestSubmitting(false);
    }
  };

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
                <button className="btn secondary dark-btn" type="button" onClick={openRequestModal}>Request Officials</button>
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

        <section className="rtob-resume-card rtob-resume-events-card">
          <h3>Documented Dates and Event Experience</h3>
          <p>Event history provided for RTBO, organized by date, event partner or host, and location.</p>
          <div className="rtob-resume-event-card-grid">
            {resume.events.map((eventItem, index) => (
              <article className={`rtob-resume-event-card ${eventItem.highlight ? 'is-highlighted' : ''}`.trim()} key={`${eventItem.date}-${eventItem.event}-${index}`}>
                <div className="rtob-resume-event-card-top">
                  <span className="rtob-resume-event-date">{eventItem.date}</span>
                  <span className="rtob-resume-event-mark" aria-hidden="true">{getResumeEventMark(eventItem.event)}</span>
                </div>
                <div className="rtob-resume-event-card-body">
                  <h4>{eventItem.event}</h4>
                </div>
                <p className="rtob-resume-event-location">{eventItem.location}</p>
              </article>
            ))}
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

      {requestModalOpen && (
        <div className="rtob-official-request-modal" role="presentation">
          <button className="rtob-official-request-backdrop" type="button" aria-label="Close request officials form" onClick={closeRequestModal} />
          <form className="rtob-official-request-dialog" role="dialog" aria-modal="true" aria-labelledby="rtob-official-request-title" onSubmit={submitOfficialRequest}>
            <div className="rtob-official-request-head">
              <div>
                <p className="rtob-resume-kicker">Staffing Request</p>
                <h3 id="rtob-official-request-title">Request Officials</h3>
                <p>Submit event staffing details and RTBO will receive a branded PDF copy for review.</p>
              </div>
              <button className="rtob-official-request-close" type="button" aria-label="Close request officials form" onClick={closeRequestModal} disabled={requestSubmitting}>X</button>
            </div>

            <div className="rtob-official-request-grid">
              <Field label="First Name">
                <input value={requestForm.first_name} onChange={(event) => updateRequestField('first_name', event.target.value)} autoComplete="given-name" autoFocus required />
              </Field>
              <Field label="Last Name">
                <input value={requestForm.last_name} onChange={(event) => updateRequestField('last_name', event.target.value)} autoComplete="family-name" required />
              </Field>
              <Field label="Email Address">
                <input type="email" value={requestForm.email} onChange={(event) => updateRequestField('email', event.target.value)} autoComplete="email" required />
              </Field>
              <Field label="Phone Number">
                <input type="tel" value={requestForm.phone} onChange={(event) => updateRequestField('phone', event.target.value)} autoComplete="tel" required />
              </Field>
              <Field label="How many courts will be used?">
                <select value={requestForm.courts_used} onChange={(event) => updateRequestField('courts_used', event.target.value)} required>
                  <option value="">Select courts</option>
                  {COURT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="How many days of event?">
                <input type="number" min="1" step="1" value={requestForm.event_days} onChange={(event) => updateRequestField('event_days', event.target.value)} required />
              </Field>
              <Field label="How many games per floor?">
                <input type="number" min="1" step="1" value={requestForm.games_per_floor} onChange={(event) => updateRequestField('games_per_floor', event.target.value)} required />
              </Field>
              <Field label="Crew system">
                <select value={requestForm.crew_type} onChange={(event) => updateRequestField('crew_type', event.target.value)} required>
                  <option value="">Select crew</option>
                  {CREW_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Current game fee per ref">
                <input inputMode="decimal" placeholder="$30.00" value={requestForm.game_fee_per_ref} onChange={(event) => updateRequestField('game_fee_per_ref', event.target.value)} required />
              </Field>
              <Field label="Payment method">
                <select value={requestForm.payment_method} onChange={(event) => updateRequestField('payment_method', event.target.value)} required>
                  <option value="">Select payment method</option>
                  {PAYMENT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="When should officials expect payment?" required={requestForm.payment_method === 'Check' || requestForm.payment_method === 'Direct Deposit'} className="span-two">
                <input
                  placeholder="Example: Within 7 business days after the event"
                  value={requestForm.payment_timeline}
                  onChange={(event) => updateRequestField('payment_timeline', event.target.value)}
                  required={requestForm.payment_method === 'Check' || requestForm.payment_method === 'Direct Deposit'}
                />
              </Field>
              <Field label="Will officials be required to wear branded merchandise?">
                <select value={requestForm.branded_merch_required} onChange={(event) => updateRequestField('branded_merch_required', event.target.value)} required>
                  <option value="">Select answer</option>
                  {YES_NO_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Will branded merchandise be provided to officials?">
                <select value={requestForm.branded_merch_provided} onChange={(event) => updateRequestField('branded_merch_provided', event.target.value)} required>
                  <option value="">Select answer</option>
                  {YES_NO_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
            </div>

            {requestStatus.message && (
              <p className={`rtob-official-request-status ${requestStatus.type}`.trim()} role={requestStatus.type === 'error' ? 'alert' : 'status'}>
                {requestStatus.message}
              </p>
            )}

            <div className="rtob-official-request-actions">
              <button className="btn secondary dark-btn" type="button" onClick={closeRequestModal} disabled={requestSubmitting}>Cancel</button>
              <button className="btn" type="submit" disabled={requestSubmitting}>{requestSubmitting ? 'Sending Request...' : 'Send Official Request'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
