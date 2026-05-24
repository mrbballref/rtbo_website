import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SITE_CONTENT_KEY,
  SITE_CONTENT_UPDATED_EVENT,
  normalizeSiteContentRecord,
  normalizeSiteContentRecords,
  parseSiteContentCards,
  serializeSiteContentCards,
  siteContentKinds,
  siteContentPages,
  siteContentSlug,
  siteContentTemplates
} from './site-content.js';
import './site-content-manager.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function createSiteContentForm(record = {}) {
  return {
    id: record.id || '',
    kind: record.kind || 'section',
    page: record.page || 'home',
    nav_label: record.nav_label || '',
    template: record.template || 'section',
    status: record.status || 'active',
    order: String(record.order ?? 10),
    eyebrow: record.eyebrow || '',
    title: record.title || '',
    body: record.body || '',
    image: record.image || '',
    image_alt: record.image_alt || '',
    cta_label: record.cta_label || '',
    cta_target: record.cta_target || '',
    cardsText: serializeSiteContentCards(record.cards || [])
  };
}

function uniqueSiteContentId(baseId, records = []) {
  const existing = new Set(records.map(record => record.id));
  const base = siteContentSlug(baseId || 'website-content');
  if (!existing.has(base)) return base;

  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function upsertSiteContentRecord(records = [], record, editingId = '') {
  let found = false;
  const nextRecords = records.map(item => {
    if (item.id !== editingId && item.id !== record.id) return item;
    found = true;
    return record;
  });

  return normalizeSiteContentRecords(found ? nextRecords : [record, ...records]);
}

function formToRecord(form, records, editingId = '') {
  const title = form.title || 'Website Content';
  const page = siteContentSlug(form.page || (form.kind === 'page' ? title : 'home'));
  const id = editingId || form.id || uniqueSiteContentId(`${page}-${form.kind}-${title}`, records);
  return normalizeSiteContentRecord({
    id,
    kind: form.kind,
    page,
    nav_label: form.nav_label,
    template: form.template,
    status: form.status,
    order: form.order,
    eyebrow: form.eyebrow,
    title,
    body: form.body,
    image: form.image,
    image_alt: form.image_alt,
    cta_label: form.cta_label,
    cta_target: form.cta_target,
    cards: parseSiteContentCards(form.cardsText)
  });
}

function publishSiteContent(records) {
  const normalized = normalizeSiteContentRecords(records);
  try {
    localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(normalized));
  } catch {
    // Server persistence is still attempted when local storage is blocked.
  }
  window.dispatchEvent(new CustomEvent(SITE_CONTENT_UPDATED_EVENT, { detail: { records: normalized } }));
}

function readStoredSiteContent() {
  try {
    return normalizeSiteContentRecords(JSON.parse(safeLocalStorageGet(SITE_CONTENT_KEY) || '[]'));
  } catch {
    return [];
  }
}

export default function SiteContentManager({ onStatus = () => {} }) {
  const formRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(() => createSiteContentForm({}));
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [pageFilter, setPageFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const summary = useMemo(() => ({
    total: records.length,
    active: records.filter(record => record.status === 'active').length,
    pages: records.filter(record => record.kind === 'page').length,
    media: records.filter(record => record.image).length
  }), [records]);

  const visibleRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter(record => {
      const pageMatch = pageFilter === 'all' || record.page === pageFilter;
      const kindMatch = kindFilter === 'all' || record.kind === kindFilter;
      const queryMatch = !needle || [record.id, record.page, record.kind, record.title, record.body, record.eyebrow]
        .join(' ')
        .toLowerCase()
        .includes(needle);
      return pageMatch && kindMatch && queryMatch;
    });
  }, [kindFilter, pageFilter, query, records]);

  const pageOptions = useMemo(() => {
    const fromRecords = records.map(record => [record.page, record.page]).filter(([id]) => id);
    const unique = new Map([...siteContentPages, ...fromRecords]);
    return [...unique.entries()];
  }, [records]);

  useEffect(() => {
    let active = true;
    async function loadContent() {
      setLoading(true);
      try {
        const data = await apiGet('/site-content.php?scope=admin');
        if (!active) return;
        const nextRecords = normalizeSiteContentRecords(data.records || []);
        setRecords(nextRecords);
        publishSiteContent(nextRecords);
        if (nextRecords[0]) {
          setForm(createSiteContentForm(nextRecords[0]));
          setEditingId(nextRecords[0].id);
        }
        setMessage(nextRecords.length ? `Loaded ${nextRecords.length} website content items.` : 'Website manager is ready.');
        onStatus('Website manager loaded.');
      } catch (error) {
        if (!active) return;
        const stored = readStoredSiteContent();
        setRecords(stored);
        if (stored[0]) {
          setForm(createSiteContentForm(stored[0]));
          setEditingId(stored[0].id);
        }
        setMessage(error.message || 'Website manager is using local content until the server is available.');
        onStatus(error.message || 'Website content API could not be reached.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadContent();
    return () => {
      active = false;
    };
  }, [onStatus]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm(current => {
      const next = { ...current, [name]: value };
      if (name === 'kind' && value === 'page' && !next.nav_label) {
        next.nav_label = next.title;
      }
      if (name === 'title' && current.kind === 'page' && !current.nav_label) {
        next.nav_label = value;
        next.page = siteContentSlug(value);
      }
      return next;
    });
  }

  function focusForm() {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      formRef.current?.querySelector('input[name="title"]')?.focus();
    });
  }

  function startNew(kind = 'section') {
    setEditingId('');
    setForm(createSiteContentForm({
      kind,
      page: kind === 'page' ? 'new-page' : 'home',
      template: kind === 'feature' ? 'feature-grid' : kind === 'image' ? 'image-feature' : 'section',
      order: (records.length + 1) * 10
    }));
    setMessage(kind === 'page' ? 'Create a page and publish it to add it to site navigation.' : 'Create website content and publish it to the selected page.');
    focusForm();
  }

  function startEdit(record) {
    setEditingId(record.id);
    setForm(createSiteContentForm(record));
    setMessage(`Editing ${record.title}.`);
    focusForm();
  }

  function duplicateRecord(record) {
    const copy = {
      ...record,
      id: uniqueSiteContentId(`${record.id}-copy`, records),
      title: `${record.title} Copy`,
      status: 'draft',
      order: Number(record.order || 10) + 1
    };
    setEditingId('');
    setForm(createSiteContentForm(copy));
    setMessage('Duplicated as a draft. Update the content, then publish it.');
    focusForm();
  }

  function loadImageFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(current => ({
        ...current,
        image: String(reader.result || ''),
        image_alt: current.image_alt || file.name.replace(/\.[^.]+$/, '').replaceAll('-', ' ')
      }));
      setMessage(`${file.name} added to this content item.`);
    };
    reader.readAsDataURL(file);
  }

  async function saveRecord(event) {
    event.preventDefault();
    const record = formToRecord(form, records, editingId);
    if (!record.title || !record.page) {
      setMessage('Title and page are required.');
      return;
    }

    setSaving(true);
    const nextLocalRecords = upsertSiteContentRecord(records, record, editingId);
    setRecords(nextLocalRecords);
    publishSiteContent(nextLocalRecords);
    try {
      const data = await apiPostJson('/site-content.php', { action: 'replace', records: nextLocalRecords });
      const nextRecords = normalizeSiteContentRecords(data.records || nextLocalRecords);
      setRecords(nextRecords);
      publishSiteContent(nextRecords);
      setEditingId(record.id);
      setForm(createSiteContentForm(record));
      setMessage(data.message || `${record.title} was saved.`);
      onStatus(`${record.title} was saved to Website Manager.`);
    } catch (error) {
      setEditingId(record.id);
      setMessage(`${record.title} was saved locally. Server save failed: ${error.message}`);
      onStatus('Website content saved locally because the API was unavailable.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    setSaving(true);
    const nextLocalRecords = records.filter(item => item.id !== record.id);
    setRecords(nextLocalRecords);
    publishSiteContent(nextLocalRecords);
    if (editingId === record.id) {
      setEditingId('');
      setForm(createSiteContentForm({}));
    }
    try {
      const data = await apiPostJson('/site-content.php', { action: 'replace', records: nextLocalRecords });
      const nextRecords = normalizeSiteContentRecords(data.records || nextLocalRecords);
      setRecords(nextRecords);
      publishSiteContent(nextRecords);
      setMessage(data.message || `${record.title} was removed.`);
      onStatus(`${record.title} was removed from Website Manager.`);
    } catch (error) {
      setMessage(`${record.title} was removed locally. Server delete failed: ${error.message}`);
      onStatus('Website content delete used the local fallback because the API was unavailable.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rtbo-dashboard-card rtbo-site-manager-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Website Command Center</p>
          <h3>Website Manager</h3>
          <p>Add, update, hide, duplicate, or remove pages, sections, feature cards, and images. Published items render through the current RTBO page and card styles.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={() => startNew('page')} disabled={saving}>Add Page</button>
          <button className="btn" type="button" onClick={() => startNew('section')} disabled={saving}>Add Content</button>
        </div>
      </div>

      <div className="rtbo-site-manager-summary">
        <article><span>Total Items</span><strong>{summary.total}</strong></article>
        <article><span>Active</span><strong>{summary.active}</strong></article>
        <article><span>Pages</span><strong>{summary.pages}</strong></article>
        <article><span>Images</span><strong>{summary.media}</strong></article>
      </div>

      <form className="rtbo-site-manager-form" ref={formRef} onSubmit={saveRecord}>
        <label>
          <span>Content Type *</span>
          <select name="kind" value={form.kind} onChange={updateForm} required>
            {siteContentKinds.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Page *</span>
          <input name="page" list="rtbo-site-content-pages" value={form.page} onChange={updateForm} placeholder="home" required />
          <datalist id="rtbo-site-content-pages">
            {pageOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </datalist>
        </label>
        <label>
          <span>Template *</span>
          <select name="template" value={form.template} onChange={updateForm} required>
            {siteContentTemplates.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="status" value={form.status} onChange={updateForm}>
            <option value="active">Active on site</option>
            <option value="draft">Draft</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label>
          <span>Order</span>
          <input name="order" value={form.order} onChange={updateForm} inputMode="numeric" placeholder="10" />
        </label>
        <label>
          <span>Item ID</span>
          <input name="id" value={form.id} onChange={updateForm} placeholder="auto-generated" disabled={Boolean(editingId)} />
        </label>
        <label>
          <span>Navigation Label</span>
          <input name="nav_label" value={form.nav_label} onChange={updateForm} placeholder="Shown for managed pages" />
        </label>
        <label>
          <span>Eyebrow</span>
          <input name="eyebrow" value={form.eyebrow} onChange={updateForm} placeholder="Website Update" />
        </label>
        <label className="wide">
          <span>Title *</span>
          <input name="title" value={form.title} onChange={updateForm} placeholder="New RTBO section title" required />
        </label>
        <label className="wide">
          <span>Image URL, Asset Path, or Uploaded Image</span>
          <input name="image" value={form.image} onChange={updateForm} placeholder="/assets/images/training_img_1.jpg" />
        </label>
        <label>
          <span>Upload Image</span>
          <input type="file" accept="image/*" onChange={loadImageFile} />
        </label>
        <label>
          <span>Image Alt Text</span>
          <input name="image_alt" value={form.image_alt} onChange={updateForm} placeholder="Describe the image" />
        </label>
        <label>
          <span>Button Label</span>
          <input name="cta_label" value={form.cta_label} onChange={updateForm} placeholder="Learn More" />
        </label>
        <label>
          <span>Button Link</span>
          <input name="cta_target" value={form.cta_target} onChange={updateForm} placeholder="#services" />
        </label>
        <label className="wide full">
          <span>Body</span>
          <textarea name="body" value={form.body} onChange={updateForm} rows="4" placeholder="Write the public website copy." />
        </label>
        <label className="wide full">
          <span>Cards</span>
          <textarea name="cardsText" value={form.cardsText} onChange={updateForm} rows="5" placeholder="Title | Body | Image path | Button label | Link" />
        </label>
        <div className="rtbo-site-manager-actions">
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Content' : 'Create Content'}</button>
          <button className="btn secondary dark-btn" type="button" onClick={() => startNew('section')} disabled={saving}>Clear Form</button>
        </div>
      </form>

      {message && <p className="form-message" role="status">{message}</p>}

      <div className="rtbo-site-manager-toolbar">
        <label>
          <span>Search Content</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, page, type, copy" />
        </label>
        <label>
          <span>Page</span>
          <select value={pageFilter} onChange={event => setPageFilter(event.target.value)}>
            <option value="all">All pages</option>
            {pageOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select value={kindFilter} onChange={event => setKindFilter(event.target.value)}>
            <option value="all">All types</option>
            {siteContentKinds.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="rtbo-site-manager-list" aria-live="polite">
        {loading ? <p className="rtbo-empty-state">Loading website content...</p> : null}
        {!loading && visibleRecords.length === 0 ? <p className="rtbo-empty-state">No website content matches this filter.</p> : null}
        {visibleRecords.map(record => (
          <article className={`rtbo-site-manager-item status-${record.status}`} key={record.id}>
            {record.image ? <img src={record.image} alt="" loading="lazy" decoding="async" /> : <div className="rtbo-site-manager-placeholder" aria-hidden="true">{record.kind.slice(0, 1).toUpperCase()}</div>}
            <div>
              <span>{record.page} / {record.kind} / {record.template}</span>
              <strong>{record.title}</strong>
              <p>{record.body || record.eyebrow || 'No body copy added yet.'}</p>
              <small>{record.status} / order {record.order} / {record.cards.length} card{record.cards.length === 1 ? '' : 's'}</small>
            </div>
            <div className="rtbo-site-manager-item-actions">
              <button className="btn secondary dark-btn" type="button" onClick={() => startEdit(record)}>Edit</button>
              <button className="btn secondary dark-btn" type="button" onClick={() => duplicateRecord(record)}>Duplicate</button>
              <button className="btn secondary dark-btn danger-action" type="button" onClick={() => deleteRecord(record)} disabled={saving}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
