import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import idCardCatalog from './id-card-catalog.json';
import './id-card-selection.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

const categoryPriority = [
  'refzone-university-student-ids',
  'refzone-military-student-ids',
  'driver-license-style-ids',
  'general-sports-officiating-ids',
  'veteran-landscape-military-ids',
  'army-and-general-military-ids',
  'marine-corps-veteran-ids',
  'navy-veteran-ids',
  'air-force-veteran-ids',
  'coast-guard-veteran-ids',
];

function routePartsFromHash() {
  const route = String(window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return route.split('/').filter(Boolean).map(part => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
}

function readSelectionContext() {
  if (typeof window === 'undefined') {
    return { context: 'id-card', enrollmentId: '', courseId: '' };
  }
  const parts = routePartsFromHash();
  if (parts[0] === 'id-cards' && parts[1] === 'refzone') {
    return {
      context: 'refzone-student',
      enrollmentId: parts[2] || '',
      courseId: parts[3] || '',
    };
  }
  if (parts[0] === 'id-cards' && parts[1] === 'shop') {
    return { context: 'shop', enrollmentId: '', courseId: '' };
  }
  return { context: 'id-card', enrollmentId: '', courseId: '' };
}

async function readApiJson(response) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Request failed.' };
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  return readApiJson(response);
}

async function apiPostJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  return readApiJson(response);
}

function safeProfileFromUser(user) {
  if (!user) return null;
  const firstName = String(user.first_name || '').trim();
  const lastName = String(user.last_name || '').trim();
  const fullName = String(user.name || `${firstName} ${lastName}`).trim();
  const id = Number(user.id || 0);
  return {
    id,
    member_id: `RTBO-${String(Math.max(0, id)).padStart(5, '0')}`,
    full_name: fullName || 'RTBO Member',
    first_name: firstName,
    last_name: lastName,
    role_label: user.official_classification || user.member_title || 'Basketball Official',
    member_title: user.member_title || user.official_classification || 'Basketball Official',
    official_classification: user.official_classification || '',
    organization: user.organization || '',
    city: user.city || '',
    state: user.state || '',
    photo: user.photo || '',
  };
}

function sortedCategories() {
  return [...idCardCatalog.categories].sort((a, b) => {
    const aIndex = categoryPriority.indexOf(a.id);
    const bIndex = categoryPriority.indexOf(b.id);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    }
    return a.label.localeCompare(b.label);
  });
}

function cardMatchesSearch(card, search) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [card.title, card.categoryLabel, card.id].join(' ').toLowerCase().includes(term);
}

function QRCodeImage({ value, className = '', alt = 'RTBO check-in QR code' }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let isActive = true;
    if (!value) {
      setDataUrl('');
      return () => {
        isActive = false;
      };
    }

    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 168,
      color: {
        dark: '#101827',
        light: '#ffffff',
      },
    })
      .then(url => {
        if (isActive) setDataUrl(url);
      })
      .catch(() => {
        if (isActive) setDataUrl('');
      });

    return () => {
      isActive = false;
    };
  }, [value]);

  if (!value) return null;
  if (!dataUrl) return <span className={`id-card-qr-loading ${className}`}>QR</span>;
  return <img className={`id-card-qr ${className}`} src={dataUrl} alt={alt} loading="lazy" decoding="async" />;
}

function IDCardMemberLayer({ profile, selection, compact = false }) {
  const selected = Boolean(selection);
  const safeProfile = profile || {};
  const location = [safeProfile.city, safeProfile.state].filter(Boolean).join(', ');

  return (
    <div className={`id-card-member-layer${compact ? ' compact' : ''}${selected ? ' selected' : ''}`}>
      <div>
        <span>Member</span>
        <strong>{safeProfile.full_name || 'Sign in to personalize'}</strong>
        <small>{safeProfile.member_title || safeProfile.role_label || 'RTBO ID Card'}</small>
        <small>{safeProfile.member_id || 'Secure member ID pending'}</small>
        {location && <small>{location}</small>}
      </div>
      {selected ? (
        <QRCodeImage value={selection.checkin_url} />
      ) : (
        <em>Select to generate QR</em>
      )}
    </div>
  );
}

function IDCardPreview({ card, profile, selection, selected, onOpen, onToggle, saving }) {
  return (
    <article className={`id-card-summary${selected ? ' is-selected' : ''}`}>
      <button className="id-card-preview-button" type="button" onClick={() => onOpen(card)}>
        <span className="id-card-image-frame">
          <img src={card.image} alt={`${card.title} front`} loading="lazy" decoding="async" />
          <IDCardMemberLayer profile={profile} selection={selection} compact />
        </span>
      </button>
      <div className="id-card-summary-body">
        <p>{card.categoryLabel}</p>
        <h3>{card.title}</h3>
        <label className="id-card-check-row">
          <input
            type="checkbox"
            checked={selected}
            disabled={saving}
            onChange={event => onToggle(card, event.currentTarget.checked)}
          />
          <span>ID Card</span>
        </label>
      </div>
    </article>
  );
}

function IDCardModal({ card, profile, selection, selected, onClose, onToggle, saving }) {
  if (!card) return null;
  return (
    <div className="id-card-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="id-card-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${card.title} ID Card preview`}
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="id-card-modal-head">
          <div>
            <p className="eyebrow">{card.categoryLabel}</p>
            <h2>{card.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close ID Card preview">Close</button>
        </header>
        <div className={`id-card-modal-grid${card.backImage ? ' has-back' : ''}`}>
          <figure>
            <img src={card.image} alt={`${card.title} front`} />
            <IDCardMemberLayer profile={profile} selection={selection} />
            <figcaption>Front</figcaption>
          </figure>
          {card.backImage && (
            <figure>
              <img src={card.backImage} alt={`${card.title} back`} />
              <figcaption>Back</figcaption>
            </figure>
          )}
        </div>
        <footer className="id-card-modal-actions">
          <label className="id-card-check-row large">
            <input
              type="checkbox"
              checked={selected}
              disabled={saving}
              onChange={event => onToggle(card, event.currentTarget.checked)}
            />
            <span>ID Card</span>
          </label>
          {selection?.checkin_url && (
            <a href={selection.checkin_url} target="_blank" rel="noreferrer">Open check-in link</a>
          )}
        </footer>
      </section>
    </div>
  );
}

export default function IDCardSelectionPage({ user, onCreateAccount, onSignIn }) {
  const [routeContext, setRouteContext] = useState(readSelectionContext);
  const [activeCategory, setActiveCategory] = useState(() => (
    readSelectionContext().context === 'refzone-student' ? 'refzone-university-student-ids' : 'all'
  ));
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState(() => safeProfileFromUser(user));
  const [selections, setSelections] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [modalCard, setModalCard] = useState(null);

  const categories = useMemo(() => sortedCategories(), []);
  const categoryTabs = useMemo(() => [
    { id: 'all', label: 'All ID Cards', count: idCardCatalog.totalCards },
    ...categories,
  ], [categories]);

  useEffect(() => {
    function syncContext() {
      const next = readSelectionContext();
      setRouteContext(next);
      if (next.context === 'refzone-student') {
        setActiveCategory(current => current === 'all' ? 'refzone-university-student-ids' : current);
      }
    }

    syncContext();
    window.addEventListener('hashchange', syncContext);
    return () => window.removeEventListener('hashchange', syncContext);
  }, []);

  useEffect(() => {
    let isActive = true;
    setProfile(safeProfileFromUser(user));
    setError('');
    setStatus('');

    if (!user) {
      setLoading(false);
      setSelections([]);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    apiGet('/id-card-selections.php')
      .then(data => {
        if (!isActive) return;
        setProfile(data.profile || safeProfileFromUser(user));
        setSelections(Array.isArray(data.selections) ? data.selections : []);
      })
      .catch(fetchError => {
        if (!isActive) return;
        setError(fetchError.message || 'ID Card selections could not be loaded.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [user]);

  const contextSelections = useMemo(() => selections.filter(selection => (
    String(selection.context || 'id-card') === routeContext.context
    && String(selection.enrollment_id || '') === routeContext.enrollmentId
  )), [selections, routeContext]);

  const selectedIds = useMemo(() => new Set(contextSelections.map(selection => selection.card_id)), [contextSelections]);
  const selectionByCardId = useMemo(() => contextSelections.reduce((acc, selection) => {
    acc[selection.card_id] = selection;
    return acc;
  }, {}), [contextSelections]);

  const visibleCards = useMemo(() => {
    return idCardCatalog.cards
      .filter(card => activeCategory === 'all' || card.categoryId === activeCategory)
      .filter(card => cardMatchesSearch(card, search));
  }, [activeCategory, search]);

  async function persistSelection(nextSelectedIds) {
    if (!user) {
      onSignIn?.();
      return;
    }

    const cards = idCardCatalog.cards.filter(card => nextSelectedIds.has(card.id));
    setSaving(true);
    setError('');
    setStatus('Saving selected ID Cards...');
    try {
      const data = await apiPostJson('/id-card-selections.php', {
        context: routeContext.context,
        enrollment_id: routeContext.enrollmentId,
        cards,
      });
      setProfile(data.profile || profile);
      setSelections(Array.isArray(data.selections) ? data.selections : []);
      setStatus(cards.length === 0 ? 'No ID Cards are selected for this flow.' : 'Selected ID Cards saved and QR codes generated.');
    } catch (saveError) {
      setError(saveError.message || 'Selected ID Cards could not be saved.');
      setStatus('');
    } finally {
      setSaving(false);
    }
  }

  function toggleCard(card, checked) {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(card.id);
    } else {
      next.delete(card.id);
    }
    persistSelection(next);
  }

  const contextLabel = routeContext.context === 'refzone-student'
    ? 'RefZone Student ID selection'
    : routeContext.context === 'shop'
      ? 'Shop ID Card selection'
      : 'RTBO ID Card selection';
  const continueHref = routeContext.context === 'refzone-student'
    ? `#education${routeContext.courseId ? `/course/${encodeURIComponent(routeContext.courseId)}` : ''}`
    : '#shop';

  return (
    <section className="id-card-page" aria-labelledby="id-card-title">
      <div className="id-card-shell">
        <header className="id-card-hero">
          <div>
            <p className="eyebrow">Member Credentials</p>
            <h1 id="id-card-title">Select your RTBO ID Card design.</h1>
            <p>
              Choose one or more official card designs. Selected cards are personalized from your profile with safe public
              identity fields only, then paired with a QR arrival check-in link for RTBO event assignments.
            </p>
          </div>
          <aside>
            <span>{contextLabel}</span>
            <strong>{idCardCatalog.totalCards}</strong>
            <small>available designs</small>
            {routeContext.context === 'refzone-student' && (
              <a href={continueHref}>Continue after selection</a>
            )}
          </aside>
        </header>

        {!user && (
          <div className="id-card-auth-panel">
            <div>
              <p className="eyebrow">Account Required</p>
              <h2>Sign in to personalize, save, and generate QR-enabled ID Cards.</h2>
              <p>No sensitive profile data is printed on the card preview.</p>
            </div>
            <div>
              <button type="button" onClick={onSignIn}>Sign In</button>
              <button type="button" className="secondary" onClick={onCreateAccount}>Create Account</button>
            </div>
          </div>
        )}

        <nav className="id-card-tabs" aria-label="ID Card categories">
          {categoryTabs.map(category => (
            <button
              key={category.id}
              className={activeCategory === category.id ? 'active' : ''}
              type="button"
              onClick={() => setActiveCategory(category.id)}
            >
              <span>{category.label}</span>
              <small>{category.count}</small>
            </button>
          ))}
        </nav>

        <div className="id-card-gallery-panel">
          <div className="id-card-toolbar">
            <label>
              <span>Search designs</span>
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search card name or category" />
            </label>
            <div>
              <strong>{contextSelections.length}</strong>
              <span>selected</span>
            </div>
          </div>

          {(status || error || loading) && (
            <div className={`id-card-status${error ? ' is-error' : ''}`}>
              {loading ? 'Loading your saved ID Card selections...' : error || status}
            </div>
          )}

          <div className="id-card-grid" aria-live="polite">
            {visibleCards.map(card => (
              <IDCardPreview
                key={card.id}
                card={card}
                profile={profile}
                selection={selectionByCardId[card.id]}
                selected={selectedIds.has(card.id)}
                saving={saving}
                onOpen={setModalCard}
                onToggle={toggleCard}
              />
            ))}
          </div>

          {visibleCards.length === 0 && (
            <div className="id-card-empty">
              <h2>No ID Card designs match that search.</h2>
              <p>Clear the search or choose another category tab.</p>
            </div>
          )}
        </div>
      </div>

      <IDCardModal
        card={modalCard}
        profile={profile}
        selection={modalCard ? selectionByCardId[modalCard.id] : null}
        selected={modalCard ? selectedIds.has(modalCard.id) : false}
        saving={saving}
        onClose={() => setModalCard(null)}
        onToggle={toggleCard}
      />
    </section>
  );
}
