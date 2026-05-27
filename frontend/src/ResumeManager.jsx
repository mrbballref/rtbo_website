import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultRtboResume,
  normalizeRtboResume,
  publishRtboResume,
  readStoredRtboResume
} from './rtbo-resume-data.js';
import './resume-manager.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function apiPostJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function textListToValue(items = []) {
  return Array.isArray(items) ? items.join('\n') : String(items || '');
}

function valueToTextList(value = '') {
  return String(value || '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

const blankItems = {
  services: { title: 'New Service', body: 'Describe this service.' },
  events: { date: '', event: 'New Event', location: '', highlight: false },
  standards: { title: 'New Standard', items: ['Add one standard or workflow expectation.'] },
  adminInfo: { label: 'New Field', value: 'Add resume information.' }
};

function SummaryCard({ label, value, detail }) {
  return (
    <article className="rtbo-resume-manager-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default function ResumeManager({ onStatus = () => {} }) {
  const formRef = useRef(null);
  const [resume, setResume] = useState(readStoredRtboResume);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const summary = useMemo(() => ({
    services: resume.services.length,
    events: resume.events.length,
    standards: resume.standards.length,
    adminRows: resume.adminInfo.length
  }), [resume]);

  useEffect(() => {
    let active = true;
    async function loadResume() {
      setLoading(true);
      try {
        const data = await apiGet('/resume.php?scope=admin');
        if (!active) return;
        const nextResume = publishRtboResume(data.resume || {});
        setResume(nextResume);
        setMessage('Resume loaded from production storage.');
      } catch (error) {
        if (!active) return;
        setResume(readStoredRtboResume());
        setMessage(error.status === 401 ? 'Admin sign-in is required to save production resume changes.' : 'Resume loaded from local fallback storage.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResume();
    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setResume(current => normalizeRtboResume({ ...current, [field]: value }));
  }

  function updateContact(field, value) {
    setResume(current => normalizeRtboResume({
      ...current,
      contact: { ...current.contact, [field]: value }
    }));
  }

  function updateFeaturedEvent(field, value) {
    setResume(current => normalizeRtboResume({
      ...current,
      featuredEvent: { ...current.featuredEvent, [field]: value }
    }));
  }

  function updateCollection(collection, index, field, value) {
    setResume(current => {
      const nextCollection = current[collection].map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (field === 'items') return { ...item, items: valueToTextList(value) };
        return { ...item, [field]: value };
      });
      return normalizeRtboResume({ ...current, [collection]: nextCollection });
    });
  }

  function addCollectionItem(collection) {
    setResume(current => normalizeRtboResume({
      ...current,
      [collection]: [...current[collection], { ...blankItems[collection] }]
    }));
  }

  function duplicateCollectionItem(collection, index) {
    setResume(current => {
      const item = current[collection][index];
      if (!item) return current;
      const copy = collection === 'standards'
        ? { ...item, title: `${item.title} Copy`, items: [...item.items] }
        : { ...item, title: item.title ? `${item.title} Copy` : item.title, event: item.event ? `${item.event} Copy` : item.event };
      const nextCollection = [...current[collection]];
      nextCollection.splice(index + 1, 0, copy);
      return normalizeRtboResume({ ...current, [collection]: nextCollection });
    });
  }

  function deleteCollectionItem(collection, index) {
    setResume(current => normalizeRtboResume({
      ...current,
      [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function moveCollectionItem(collection, index, direction) {
    setResume(current => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current[collection].length) return current;
      const nextCollection = [...current[collection]];
      const [item] = nextCollection.splice(index, 1);
      nextCollection.splice(nextIndex, 0, item);
      return normalizeRtboResume({ ...current, [collection]: nextCollection });
    });
  }

  async function saveResume(event) {
    event.preventDefault();
    const normalized = publishRtboResume(resume);
    setSaving(true);
    setMessage('Saving resume...');
    try {
      const data = await apiPostJson('/resume.php', { action: 'save', resume: normalized });
      const savedResume = publishRtboResume(data.resume || normalized);
      setResume(savedResume);
      setMessage('RTBO resume saved and published.');
      onStatus('RTBO resume saved and published.');
    } catch (error) {
      setMessage(error.message || 'Resume was saved locally, but production storage did not update.');
      onStatus(error.message || 'Resume was saved locally, but production storage did not update.');
    } finally {
      setSaving(false);
    }
  }

  function restoreStarterResume() {
    const nextResume = publishRtboResume(defaultRtboResume);
    setResume(nextResume);
    setMessage('Starter resume restored. Select Save Resume to publish it.');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCollectionControls(collection, index, length) {
    return (
      <div className="rtbo-resume-manager-row-actions">
        <button type="button" className="btn secondary dark-btn" onClick={() => moveCollectionItem(collection, index, -1)} disabled={index === 0}>Move Up</button>
        <button type="button" className="btn secondary dark-btn" onClick={() => moveCollectionItem(collection, index, 1)} disabled={index === length - 1}>Move Down</button>
        <button type="button" className="btn secondary dark-btn" onClick={() => duplicateCollectionItem(collection, index)}>Duplicate</button>
        <button type="button" className="btn secondary dark-btn danger" onClick={() => deleteCollectionItem(collection, index)}>Delete</button>
      </div>
    );
  }

  return (
    <section className="rtbo-dashboard-card rtbo-resume-manager-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Forms / RTBO Resume</p>
          <h3>Raising The Bar Officiating Resume Manager</h3>
          <p>Create, update, duplicate, reorder, and remove the content shown on the public Services resume page.</p>
        </div>
        <div className="button-row">
          <a className="btn secondary dark-btn" href="#resume" target="_blank" rel="noopener">View Public Resume</a>
          <button className="btn secondary dark-btn" type="button" onClick={restoreStarterResume}>Restore Starter Resume</button>
        </div>
      </div>

      <div className="rtbo-resume-manager-summary-grid">
        <SummaryCard label="Services" value={summary.services} detail="Public capability cards" />
        <SummaryCard label="Events" value={summary.events} detail="Documented resume dates" />
        <SummaryCard label="Standards" value={summary.standards} detail="Operating approach blocks" />
        <SummaryCard label="Admin Rows" value={summary.adminRows} detail="Contact and reference details" />
      </div>

      {message && <p className="rtbo-dashboard-status">{message}</p>}
      {loading && <p className="rtbo-empty-state">Loading resume management fields...</p>}

      <form className="rtbo-resume-manager-form" ref={formRef} onSubmit={saveResume}>
        <section className="rtbo-resume-manager-panel">
          <div className="rtbo-resume-manager-panel-head">
            <h4>Resume Header</h4>
            <p>This controls the public landing page hero, contact row, PDF download, and request officials link.</p>
          </div>
          <div className="rtbo-resume-manager-field-grid">
            <label>
              Organization *
              <input value={resume.organization} onChange={(event) => updateField('organization', event.target.value)} required />
            </label>
            <label>
              Kicker
              <input value={resume.kicker} onChange={(event) => updateField('kicker', event.target.value)} />
            </label>
            <label>
              Resume Title *
              <input value={resume.title} onChange={(event) => updateField('title', event.target.value)} required />
            </label>
            <label>
              Accent Text
              <input value={resume.accentTitle} onChange={(event) => updateField('accentTitle', event.target.value)} />
            </label>
            <label className="span-two">
              Subtitle *
              <textarea rows="3" value={resume.subtitle} onChange={(event) => updateField('subtitle', event.target.value)} required />
            </label>
            <label className="span-two">
              Professional Summary *
              <textarea rows="5" value={resume.summary} onChange={(event) => updateField('summary', event.target.value)} required />
            </label>
            <label>
              Logo URL
              <input value={resume.logoUrl} onChange={(event) => updateField('logoUrl', event.target.value)} />
            </label>
            <label>
              PDF Resume URL
              <input value={resume.pdfUrl} onChange={(event) => updateField('pdfUrl', event.target.value)} />
            </label>
            <label>
              Request Email Subject
              <input value={resume.requestSubject} onChange={(event) => updateField('requestSubject', event.target.value)} />
            </label>
          </div>
        </section>

        <section className="rtbo-resume-manager-panel">
          <div className="rtbo-resume-manager-panel-head">
            <h4>Contact Information</h4>
            <p>These details appear in the resume contact bar and administrative information section.</p>
          </div>
          <div className="rtbo-resume-manager-field-grid">
            <label>
              Primary Contact
              <input value={resume.contact.primary} onChange={(event) => updateContact('primary', event.target.value)} />
            </label>
            <label>
              Phone / Text
              <input value={resume.contact.phone} onChange={(event) => updateContact('phone', event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={resume.contact.email} onChange={(event) => updateContact('email', event.target.value)} />
            </label>
            <label>
              Website / Social
              <input value={resume.contact.website} onChange={(event) => updateContact('website', event.target.value)} />
            </label>
          </div>
        </section>

        <section className="rtbo-resume-manager-panel">
          <div className="rtbo-resume-manager-panel-head">
            <h4>Featured Event</h4>
            <p>This is the highlighted event card beside the professional profile.</p>
          </div>
          <div className="rtbo-resume-manager-field-grid">
            <label>
              Badge Label
              <input value={resume.featuredEvent.label} onChange={(event) => updateFeaturedEvent('label', event.target.value)} />
            </label>
            <label>
              Event Title
              <input value={resume.featuredEvent.title} onChange={(event) => updateFeaturedEvent('title', event.target.value)} />
            </label>
            <label>
              Date
              <input value={resume.featuredEvent.date} onChange={(event) => updateFeaturedEvent('date', event.target.value)} />
            </label>
            <label>
              Location
              <input value={resume.featuredEvent.location} onChange={(event) => updateFeaturedEvent('location', event.target.value)} />
            </label>
            <label className="span-two">
              Event Summary
              <textarea rows="3" value={resume.featuredEvent.body} onChange={(event) => updateFeaturedEvent('body', event.target.value)} />
            </label>
          </div>
        </section>

        <section className="rtbo-resume-manager-panel">
          <div className="rtbo-resume-manager-panel-head">
            <h4>Core Services</h4>
            <button className="btn" type="button" onClick={() => addCollectionItem('services')}>Add Service</button>
          </div>
          <div className="rtbo-resume-manager-list">
            {resume.services.map((service, index) => (
              <article className="rtbo-resume-manager-list-item" key={`${service.title}-${index}`}>
                <label>
                  Service Title
                  <input value={service.title} onChange={(event) => updateCollection('services', index, 'title', event.target.value)} />
                </label>
                <label>
                  Service Description
                  <textarea rows="3" value={service.body} onChange={(event) => updateCollection('services', index, 'body', event.target.value)} />
                </label>
                {renderCollectionControls('services', index, resume.services.length)}
              </article>
            ))}
          </div>
        </section>

        <section className="rtbo-resume-manager-panel">
          <div className="rtbo-resume-manager-panel-head">
            <h4>Event Experience</h4>
            <button className="btn" type="button" onClick={() => addCollectionItem('events')}>Add Event</button>
          </div>
          <div className="rtbo-resume-manager-list compact">
            {resume.events.map((eventItem, index) => (
              <article className="rtbo-resume-manager-list-item" key={`${eventItem.date}-${eventItem.event}-${index}`}>
                <div className="rtbo-resume-manager-field-grid three">
                  <label>
                    Date
                    <input value={eventItem.date} onChange={(event) => updateCollection('events', index, 'date', event.target.value)} />
                  </label>
                  <label>
                    Event / Partner
                    <input value={eventItem.event} onChange={(event) => updateCollection('events', index, 'event', event.target.value)} />
                  </label>
                  <label>
                    Location
                    <input value={eventItem.location} onChange={(event) => updateCollection('events', index, 'location', event.target.value)} />
                  </label>
                </div>
                <label className="rtbo-resume-manager-toggle">
                  <input type="checkbox" checked={eventItem.highlight} onChange={(event) => updateCollection('events', index, 'highlight', event.target.checked)} />
                  Highlight this event on the public resume
                </label>
                {renderCollectionControls('events', index, resume.events.length)}
              </article>
            ))}
          </div>
        </section>

        <section className="rtbo-resume-manager-panel">
          <div className="rtbo-resume-manager-panel-head">
            <h4>Standards and Workflow</h4>
            <button className="btn" type="button" onClick={() => addCollectionItem('standards')}>Add Standard Block</button>
          </div>
          <div className="rtbo-resume-manager-list">
            {resume.standards.map((standard, index) => (
              <article className="rtbo-resume-manager-list-item" key={`${standard.title}-${index}`}>
                <label>
                  Block Title
                  <input value={standard.title} onChange={(event) => updateCollection('standards', index, 'title', event.target.value)} />
                </label>
                <label>
                  Items
                  <textarea rows="5" value={textListToValue(standard.items)} onChange={(event) => updateCollection('standards', index, 'items', event.target.value)} />
                </label>
                {renderCollectionControls('standards', index, resume.standards.length)}
              </article>
            ))}
          </div>
        </section>

        <section className="rtbo-resume-manager-panel">
          <div className="rtbo-resume-manager-panel-head">
            <h4>Administrative Information</h4>
            <button className="btn" type="button" onClick={() => addCollectionItem('adminInfo')}>Add Info Row</button>
          </div>
          <div className="rtbo-resume-manager-list compact">
            {resume.adminInfo.map((row, index) => (
              <article className="rtbo-resume-manager-list-item" key={`${row.label}-${index}`}>
                <div className="rtbo-resume-manager-field-grid">
                  <label>
                    Label
                    <input value={row.label} onChange={(event) => updateCollection('adminInfo', index, 'label', event.target.value)} />
                  </label>
                  <label>
                    Value
                    <input value={row.value} onChange={(event) => updateCollection('adminInfo', index, 'value', event.target.value)} />
                  </label>
                </div>
                {renderCollectionControls('adminInfo', index, resume.adminInfo.length)}
              </article>
            ))}
          </div>
        </section>

        <div className="rtbo-resume-manager-submit-row">
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving Resume...' : 'Save Resume'}</button>
          <a className="btn secondary dark-btn" href={resume.pdfUrl} target="_blank" rel="noopener">Open Current PDF</a>
        </div>
      </form>
    </section>
  );
}
