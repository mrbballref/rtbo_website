import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { classificationConferenceOptions } from './classification-conferences.js';
import {
  livestreamChannels,
  livestreamDestinations,
  livestreamInitialChat,
  livestreamOverlays,
  livestreamProducerComments,
  livestreamRunOfShow,
  livestreamScenes,
  livestreamSchedule,
  livestreamStudioSources
} from './livestream-data.js';
import {
  aboutCards,
  aboutDifferenceCards,
  guests,
  navItems,
  paidEventCard,
  platformCards,
  platformFlow,
  pricingFeatures,
  pricingPlans,
  refZoneMembershipPackages,
  schoolCardSessions,
  seoMeta,
  sessions,
  testimonials,
  trainers
} from './site-data.js';
import './styles.css';

const RTBOBasketballAssigningContractGenerator = React.lazy(() => import('./ContractGenerator.jsx'));
const RTBOAcademy = React.lazy(() => import('./RTBOAcademy.jsx'));
const RefRoom = React.lazy(() => import('./RefRoom.jsx'));
const EducationLanding = React.lazy(() => import('./EducationLanding.jsx'));
const TestCenterPage = React.lazy(() => import('./TestCenterPage.jsx'));
const RTBONewsletterCenter = React.lazy(() => import('./RTBONewsletterCenter.jsx'));
const ContractSigningPage = React.lazy(() => import('./ContractSigningPage.jsx'));
const RTBOMailClient = React.lazy(() => import('./RTBOMailClient.jsx'));
const TaxCenter = React.lazy(() => import('./TaxCenter.jsx'));
const ShopStore = React.lazy(() => import('./ShopStore.jsx'));
const ShopInventoryManager = React.lazy(() => import('./ShopInventoryManager.jsx'));
const SiteContentManager = React.lazy(() => import('./SiteContentManager.jsx'));
const ManagedSiteContent = React.lazy(() => import('./ManagedSiteContent.jsx'));
const StateSelect = React.lazy(() => import('./StateSelect.jsx'));
const CountrySelect = React.lazy(() => import('./CountrySelect.jsx'));
const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const RTBO_AUTH_KEY = 'rtbo_admin_auth';
const RTBO_DASHBOARD_OPEN_KEY = 'rtbo-dashboard-open';
const RTBO_THEME_KEY = 'rtbo-theme';
const RTBO_REVIEW_STORAGE_KEY = 'rtbo-attendee-reviews';
const SITE_CONTENT_KEY = 'rtbo-site-content-records';
const SITE_CONTENT_UPDATED_EVENT = 'rtbo-site-content-updated';

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const optimizedImages = {
  'about_trng_1.png': 'about_trng_1.jpg',
  'allyn_richardson_trainer_card.png': 'allyn_richardson_trainer_card.jpg',
  'assigning-workflow-crew.png': 'assigning-workflow-crew.jpg',
  'denise_tyus_trainer_card.png': 'denise_tyus_trainer_card.jpg',
  'greg_small_trainer_card.png': 'greg_small_trainer_card.jpg',
  'jada_perry_test_card.png': 'jada_perry_test_card.jpg',
  'jbu_team_camp_card.png': 'jbu_team_camp_card.jpg',
  'latanya_martin_test_card.png': 'latanya_martin_test_card.jpg',
  'mary_day_trainer_card.png': 'mary_day_trainer_card.jpg',
  'melissa_mitchell_test_card.png': 'melissa_mitchell_test_card.jpg',
  'melissa_mitchell_trainer_card.png': 'melissa_mitchell_trainer_card.jpg',
  'montrel_simmons_trainer_card.png': 'montrel_simmons_trainer_card.jpg',
  'rieley_hooten_test_card.png': 'rieley_hooten_test_card.jpg',
  'steve_wiedower_test_coach.png': 'steve_wiedower_test_coach.jpg',
  'three-person-crew.png': 'three-person-crew.jpg',
  'training_img_1.png': 'training_img_1.jpg',
  'big_miller_event_team_card.png': 'big_miller_event_team_card.jpg',
  'uapb_team_camp_card.png': 'uapb_team_camp_card.jpg',
  'uca_team_camp_card.png': 'uca_team_camp_card.jpg',
  'ualr_team_camp_card.png': 'ualr_team_camp_card.jpg',
  'stacy_chambers_trainer_card.png': 'stacy_chambers_trainer_card.jpg',
  'stacy_moultrie_trainer_card.png': 'stacy_moultrie_trainer_card.jpg',
  'carey_smith_trainer_card.png': 'carey_smith_trainer_card.jpg',
  'herb_burl_trainer_card.png': 'herb_burl_trainer_card.jpg',
  'carousel_img_1.png': 'carousel_img_1.jpg',
  'carousel_img_2.png': 'carousel_img_2.jpg',
  'carousel_img_3.png': 'carousel_img_3.jpg',
  'carousel_img_4.png': 'carousel_img_4.jpg',
  'carousel_img_5.png': 'carousel_img_5.jpg',
  'feat_img_5.png': 'feat_img_5.jpg',
  'polo_blk_white.png': 'polo_blk_white.jpg',
  'u-got-nex-ref-platform.png': 'u-got-nex-ref-platform.jpg',
  'rtbo-product-page-template.png': 'rtbo-product-page-template.jpg'
};

const imageVersions = {
  'jada_perry_test_card.png': 'reviews-20260510',
  'rieley_hooten_test_card.png': 'reviews-20260510',
  'big_miller_event_team_card.png': 'events-20260516',
  'uca_team_camp_card.png': 'events-20260516',
  'ualr_team_camp_card.png': 'events-20260516',
  'guest_reliable_partnership.png': 'guests-20260510',
  'greg_small_trainer_card.png': 'guests-20260510',
  'mary_day_trainer_card.png': 'guests-20260510',
  'allyn_richardson_trainer_card.png': 'guests-20260510'
};

const sexOptions = [
  ['', 'Select sex'],
  ['male', 'Male'],
  ['female', 'Female'],
  ['prefer_not_to_say', 'Prefer not to say']
];

const raceOptions = [
  ['', 'Select race'],
  ['american_indian_alaska_native', 'American Indian or Alaska Native'],
  ['asian', 'Asian'],
  ['black_african_american', 'Black or African American'],
  ['hispanic_latino', 'Hispanic or Latino'],
  ['middle_eastern_north_african', 'Middle Eastern or North African'],
  ['native_hawaiian_pacific_islander', 'Native Hawaiian or Other Pacific Islander'],
  ['white', 'White'],
  ['two_or_more_races', 'Two or More Races'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say']
];

const officialClassificationOptions = 'High School|NJCAA|NAIA|NCAA DIII|NCAA DII|NCAA DI|Pro-Am'.split('|');

function profilePlaceholder(sex = '') {
  const value = String(sex || '').toLowerCase();
  if (value === 'female') return imageSafe('female_headshot_2.png');
  if (value === 'male') return imageSafe('male_frame_placeholder.png');
  return imageSafe('male_frame_placeholder.png');
}

function placeholderNeedsFrame(sex = '') {
  return String(sex || '').toLowerCase() === 'female';
}

function profileImageFor(person = {}) {
  return hasUploadedProfilePhoto(person) ? person.photo : profilePlaceholder(person.sex || person.gender);
}

function hasUploadedProfilePhoto(person = {}) {
  const photo = String(person.photo || '');
  return Boolean(photo) && !/(default-profile|headshot|placeholder|profile_pic_frame)/i.test(photo);
}

function ProfilePhoto({ person = {}, alt = 'Profile photo', className = '' }) {
  const customPhoto = hasUploadedProfilePhoto(person);
  const needsPlaceholderFrame = !customPhoto && placeholderNeedsFrame(person.sex || person.gender);
  return (
    <span className={`rtbo-framed-profile-photo ${customPhoto ? 'has-uploaded-photo' : 'uses-placeholder'} ${needsPlaceholderFrame ? 'composite-placeholder' : 'full-frame-placeholder'} ${className}`.trim()}>
      <img className="rtbo-framed-profile-photo-main" src={profileImageFor(person)} alt={alt} />
      {(customPhoto || needsPlaceholderFrame) && <img className="rtbo-framed-profile-photo-frame" src={imageSafe('profile_pic_frame.png')} alt="" aria-hidden="true" />}
    </span>
  );
}

function geoTrackingClassification(person = {}) {
  const value = String(person.sex || person.gender || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (value === 'female') return 'female';
  if (value === 'male') return 'male';
  return 'neutral';
}

function geoTrackingIconFor(person = {}) {
  const classification = geoTrackingClassification(person);
  if (classification === 'female') return imageSafe('female_geo_tracking_icon.png');
  if (classification === 'male') return imageSafe('male_geo_tracking_icon.png');
  return imageSafe('geo_tracking_icon.png');
}

function geoTrackingLabel(person = {}) {
  const classification = geoTrackingClassification(person);
  if (classification === 'female') return 'Female geo tracking icon';
  if (classification === 'male') return 'Male geo tracking icon';
  return 'Prefer not to say geo tracking icon';
}

function GeoTrackingIcon({ person = {}, alt, className = '' }) {
  const classification = geoTrackingClassification(person);
  return (
    <span className={`rtbo-geo-tracking-marker is-${classification} ${className}`.trim()} title={geoTrackingLabel(person)}>
      <img src={geoTrackingIconFor(person)} alt={alt || `${person.name || 'Official'} ${geoTrackingLabel(person)}`} loading="lazy" decoding="async" />
    </span>
  );
}

function splitName(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) };
}

function imageSafe(name) {
  const file = optimizedImages[name] || name;
  const version = imageVersions[name];
  return `/assets/images/${file}${version ? `?v=${version}` : ''}`;
}

const validPages = new Set([...navItems.map(([id]) => id), 'register', 'contact', 'contract-sign']);

function image(name) {
  return imageSafe(name);
}

function routeFromHash(hash = '') {
  return String(hash || '').replace(/^#\/?/, '').split('?')[0];
}

function pageFromRoute(route = '') {
  return String(route || '').split('/')[0] || 'home';
}

function isDashboardRouteHash(hash = '') {
  return routeFromHash(hash).startsWith('dashboard');
}

function readStoredAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(RTBO_AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

function readStoredDashboardOpen() {
  const storedUser = readStoredAuthUser();
  if (!storedUser) return false;
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (hash.startsWith('#contract-sign')) return false;
  return isDashboardRouteHash(hash);
}

function dashboardSectionStorageKey(user) {
  return `rtbo-dashboard-active-section:${String(user?.email || user?.id || user?.role || 'guest').toLowerCase()}`;
}

function readDashboardHashSection() {
  if (typeof window === 'undefined') return '';
  const route = routeFromHash(window.location.hash);
  if (!route.startsWith('dashboard')) return '';
  const section = route.split('/')[1] || '';
  return section ? decodeURIComponent(section) : '';
}

function readStoredDashboardSection(user, allowedSections, fallback) {
  try {
    const hashSection = readDashboardHashSection();
    if (allowedSections.includes(hashSection)) return hashSection;
    const saved = localStorage.getItem(dashboardSectionStorageKey(user));
    return allowedSections.includes(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

function readPasswordResetToken() {
  try {
    return new URLSearchParams(window.location.search).get('reset_token') || '';
  } catch {
    return '';
  }
}

function isSuperAdminUser(user) {
  return user?.role === 'super_admin';
}

function PageHero({ page, eyebrow, title, children }) {
  return (
    <section className={`page-hero page-hero-${page}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </section>
  );
}

function updatePageSeo(active) {
  const [title, description] = seoMeta[active] || seoMeta.home;
  document.title = title;
  const updates = [
    ['meta[name="description"]', description],
    ['meta[property="og:title"]', title],
    ['meta[property="og:description"]', description],
    ['meta[name="twitter:title"]', title],
    ['meta[name="twitter:description"]', description]
  ];

  for (const [selector, value] of updates) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute('content', value);
  }
  const robotsNode = document.querySelector('meta[name="robots"]');
  if (robotsNode) robotsNode.setAttribute('content', active === 'contract-sign' ? 'noindex, nofollow' : 'index, follow');
}

function formatPhoneNumber(value = '') {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isPhoneFieldName(name = '') {
  return String(name || '').toLowerCase().includes('phone');
}

function formatFormFieldValue(name = '', value = '') {
  return isPhoneFieldName(name) ? formatPhoneNumber(value) : value;
}

function formatPhoneFieldInput(event) {
  event.currentTarget.value = formatPhoneNumber(event.currentTarget.value);
}

function formatLabel(value = '') {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function formatGameDate(value = '') {
  if (!value) return 'Date pending';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatGameTime(value = '') {
  if (!value) return 'Time pending';
  const [hours = '0', minutes = '0'] = String(value).split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function splitList(value = '') {
  return String(value || '')
    .split(/,|\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function emptyLabel(value, fallback = 'Not entered yet') {
  return String(value || '').trim() || fallback;
}

function isInvalidDeclineReason(value = '') {
  const reason = String(value || '').trim();
  const normalized = reason.toLowerCase().replace(/[\s./_-]+/g, '');
  return reason === '' || ['na', 'notapplicable'].includes(normalized);
}

function formatMiles(value) {
  const miles = Number(value);
  if (!Number.isFinite(miles)) return '';
  return `${miles.toFixed(1)} miles`;
}

function formatGeoTimestamp(value = '') {
  if (!value) return 'Not shared yet';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatNotificationTimestamp(value = '') {
  if (!value) return 'Just now';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isMessageNotification(notification = {}) {
  const type = String(notification.type || '').toLowerCase();
  const relatedType = String(notification.related_type || '').toLowerCase();
  return type.includes('message') || relatedType === 'message';
}

async function apiPost(endpoint, formData) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
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

function readStoredSiteContentRecords() {
  try {
    return normalizePublicSiteContentRecords(JSON.parse(safeLocalStorageGet(SITE_CONTENT_KEY) || '[]'));
  } catch {
    return [];
  }
}

async function fetchSiteContentRecords() {
  const data = await apiGet('/site-content.php');
  return normalizePublicSiteContentRecords(data.records || []);
}

function updateManagedPageSeo(pageRecord) {
  const title = `${pageRecord.title} | Raising The Bar Officiating`;
  const description = pageRecord.body || `Raising The Bar Officiating ${pageRecord.title}`;
  document.title = title;
  [
    ['meta[name="description"]', description],
    ['meta[property="og:title"]', title],
    ['meta[property="og:description"]', description],
    ['meta[name="twitter:title"]', title],
    ['meta[name="twitter:description"]', description]
  ].forEach(([selector, value]) => {
    const node = document.querySelector(selector);
    if (node) node.setAttribute('content', value);
  });
  const robotsNode = document.querySelector('meta[name="robots"]');
  if (robotsNode) robotsNode.setAttribute('content', 'index, follow');
}

function siteContentPublicSlug(value = 'managed-page') {
  return String(value || 'managed-page').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'managed-page';
}

function normalizePublicSiteContentRecords(records = []) {
  const seen = new Set();
  return (Array.isArray(records) ? records : [])
    .map((record, index) => {
      const title = String(record?.title || `Website Content ${index + 1}`).trim();
      const kind = ['page', 'section', 'feature', 'card', 'image'].includes(record?.kind) ? record.kind : 'section';
      const page = siteContentPublicSlug(record?.page || (kind === 'page' ? title : 'home'));
      return {
        ...record,
        id: siteContentPublicSlug(record?.id || `${page}-${kind}-${title}-${index + 1}`),
        kind,
        page,
        status: ['active', 'draft', 'hidden'].includes(record?.status) ? record.status : 'active',
        title,
        body: String(record?.body || '').trim(),
        nav_label: String(record?.nav_label || '').trim(),
        order: Number.isFinite(Number(record?.order)) ? Math.round(Number(record.order)) : (index + 1) * 10,
        cards: Array.isArray(record?.cards) ? record.cards : []
      };
    })
    .filter((record) => {
      if (!record.id || seen.has(record.id)) return false;
      seen.add(record.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

function activePublicManagedPages(records = []) {
  return normalizePublicSiteContentRecords(records)
    .filter(record => record.kind === 'page' && record.status === 'active')
    .map(record => [record.page, record.nav_label || record.title]);
}

function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getRtboTheme);

  useEffect(() => {
    setTheme(applyRtboTheme(getRtboTheme()));
    const syncTheme = () => setTheme(getRtboTheme());
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('rtbo-theme-change', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener('rtbo-theme-change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(setRtboTheme(next));
  }

  return (
    <button className={`theme-toggle ${className}`.trim()} type="button" role="switch" aria-checked={theme === 'light'} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} data-theme-state={theme} onClick={changeTheme}>
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb"></span>
        <span className="theme-toggle-icon theme-toggle-icon-day">☀</span>
        <span className="theme-toggle-icon theme-toggle-icon-night">◐</span>
        <span className="theme-toggle-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </span>
    </button>
  );
}

function getRtboTheme() {
  const storedTheme = safeLocalStorageGet(RTBO_THEME_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
  const documentTheme = document.documentElement.dataset.theme;
  return documentTheme === 'light' ? 'light' : 'dark';
}

function applyRtboTheme(nextTheme) {
  const theme = nextTheme === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.dataset.theme = theme;
  root.dataset.themeMode = theme;
  root.style.colorScheme = theme;
  document.body?.setAttribute('data-theme', theme);
  document.body?.classList.toggle('rtbo-theme-dark', theme === 'dark');
  document.body?.classList.toggle('rtbo-theme-light', theme === 'light');
  document.body?.style.setProperty('color-scheme', theme);
  window.dispatchEvent(new CustomEvent('rtbo-theme-change', { detail: { theme } }));
  return theme;
}

function setRtboTheme(nextTheme) {
  const theme = nextTheme === 'light' ? 'light' : 'dark';
  try {
    localStorage.setItem(RTBO_THEME_KEY, theme);
  } catch {
    // Theme switching must continue even when storage is blocked.
  }
  return applyRtboTheme(theme);
}

function SidebarIcon({ id }) {
  return <span className="rtbo-sidebar-icon" data-sidebar-icon={id} aria-hidden="true"></span>;
}

function Header({ active, setActive, authUser, onOpenLogin, onOpenDashboard, onOpenRegister, navLinks = navItems }) {
  const [open, setOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const trainingNavLinks = navLinks.filter(([id]) => id === 'trainers' || id === 'refroom' || id === 'education');
  const primaryNavLinks = navLinks.filter(([id]) => id !== 'refroom' && id !== 'education');
  const trainingActive = trainingNavLinks.some(([id]) => id === active);

  function openNavPage(id) {
    setActive(id);
    setOpen(false);
    setTrainingOpen(false);
  }

  return (
    <header className={`site-header rtbo-header ${open ? 'nav-open' : ''}`}>
      <a
        className="brand-mark"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          openNavPage('home');
        }}
        aria-label="Raising The Bar Officiating home"
      >
        <img src={image('logo.png')} alt="Raising The Bar Officiating logo" />
      </a>
      <button
        className="nav-menu-toggle"
        type="button"
        aria-label={open ? 'Close menu panel' : 'Open navigation menu'}
        aria-expanded={open}
        onClick={() => setOpen((current) => {
          if (current) setTrainingOpen(false);
          return !current;
        })}
      >
        <span className="nav-menu-icon" aria-hidden="true"></span><span>Menu</span>
      </button>
      <button className={`nav-flyout-scrim ${open ? 'is-open' : ''}`} type="button" aria-label="Close navigation menu" onClick={() => { setOpen(false); setTrainingOpen(false); }}></button>
      <nav className={`site-nav ${open ? 'is-open' : ''}`}>
        <div className="nav-link-group">
          {primaryNavLinks.map(([id, label]) => id === 'trainers' ? (
            <div className={`nav-dropdown ${trainingOpen ? 'is-open' : ''}`} key={id}>
              <button
                className={`nav-dropdown-trigger ${trainingActive ? 'active' : ''}`}
                type="button"
                aria-expanded={trainingOpen}
                aria-haspopup="true"
                onClick={() => setTrainingOpen(current => !current)}
              >
                {label}<span className="nav-dropdown-caret" aria-hidden="true"></span>
              </button>
              <div className="nav-dropdown-menu" aria-label="Training navigation">
                {trainingNavLinks.map(([childId, childLabel]) => (
                  <button className={active === childId ? 'active' : ''} key={childId} type="button" onClick={() => openNavPage(childId)}>{childLabel}</button>
                ))}
              </div>
            </div>
          ) : <button className={active === id ? 'active' : ''} key={id} type="button" onClick={() => openNavPage(id)}>{label}</button>)}
        </div>
        <div className="nav-action-group">
          <button className="btn secondary dark-btn nav-chrome-btn" type="button" onClick={() => openNavPage('contact')}>Let's Talk</button>
          <button className="btn nav-chrome-btn" type="button" onClick={() => { onOpenRegister(); setOpen(false); setTrainingOpen(false); }}>Register</button>
          <button className="btn secondary dark-btn" type="button" onClick={() => { authUser ? onOpenDashboard() : onOpenLogin(); setOpen(false); setTrainingOpen(false); }}>{authUser ? 'Dashboard' : 'Sign In'}</button>
          <ThemeToggle className="nav-theme-toggle" />
        </div>
      </nav>
    </header>
  );
}

function Home({ setActive, onOpenRegister }) {
  const carouselImages = ['carousel_img_1.png', 'carousel_img_2.png', 'carousel_img_3.png', 'carousel_img_4.png', 'carousel_img_5.png'];
  return (
    <>
      <section className="rtbo-hero">
        <div className="rtbo-hero-copy">
          <p className="eyebrow">We Will Serve and Will Be of Service to the Game</p>
          <div className="hero-title-row"><h1><span>Raising The Bar</span><span>Officiating</span></h1></div>
          <p>Elite officiating assignments, professional training, and leadership development serving the game with integrity, precision, and purpose. We develop officials through advanced training, mentorship, real-game experience, rules knowledge, mechanics, and philosophy of the game.</p>
          <div className="button-row">
            <button className="btn" type="button" onClick={onOpenRegister}>Register for School</button>
            <button className="btn secondary dark-btn" type="button" onClick={() => setActive('events')}>View Sessions</button>
          </div>
        </div>
        <div className="hero-carousel" aria-label="RTBO officiating photo slider">
          <div className="hero-carousel-track carousel-content">
            {[...carouselImages, ...carouselImages].map((name, index) => <img key={`${name}-${index}`} src={image(name)} alt="RTBO officiating" />)}
          </div>
        </div>
        <div className="rtbo-stats">
          <article><strong>12+</strong><span>Years Pro-Am Experience</span></article>
          <article><strong>15+</strong><span>Years NCAA Experience</span></article>
          <article><strong>20+</strong><span>Years NFHS Experience</span></article>
        </div>
        <button
          type="button"
          className="hero-scroll-link"
          onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Scroll Down <span aria-hidden="true">↓</span>
        </button>
      </section>
      <HomeRefZoneUniversity setActive={setActive} />
      <HomeRefZoneMemberships setActive={setActive} />
      <AboutSummary setActive={setActive} />
      <HomeResultsFeature setActive={setActive} />
      <GotUNexRefSection />
      <Services />
      <Contact />
    </>
  );
}

function AboutSummary({ setActive }) {
  return (
    <section className="rtbo-band about-rtbo-section home-about-rtbo-section" id="about">
      <div><p className="eyebrow">About RTBO</p><h2>Service. Development. Innovation.</h2></div>
      <div className="about-rtbo-layout">
        <div className="image-frame compact about-rtbo-image-frame"><img src={image('polo_blk_white.png')} alt="RTBO officiating apparel and brand mark" /></div>
        <div className="about-rtbo-content">
          <div className="long-copy">
            <h3>Who We Are</h3>
            <p>Raising The Bar Officiating is a premier organization committed to elevating the standard of basketball officiating through professional assignments, elite training, and leadership development. Founded on the principle of service, we exist to support the game by preparing officials who demonstrate integrity, consistency, and confidence on every possession.</p>
            <p>We partner with leagues, schools, tournaments, and organizations to deliver dependable officiating solutions—while simultaneously developing the next generation of officials through structured education and real-game experience.</p>
            <p><strong>Core Philosophy:</strong><br />We Will Serve, And Will Be Of Service To The Game.</p>
            {setActive && <button className="btn about-learn-more-button" type="button" onClick={() => setActive('about')}>Learn More</button>}
          </div>
          <div className="about-icon-grid">
            {aboutCards.map(([icon, title, text]) => <article key={title}><img className="card-icon" src={image(icon)} alt="" /><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeRefZoneUniversity({ setActive }) {
  const featuredPackage = refZoneMembershipPackages[0];

  return (
    <section className="rtbo-section home-refzone-university">
      <div className="home-refzone-media">
        <img src={image('refzone/course-overview-thumbnail.png')} alt="RefZone University online officiating course workspace" loading="lazy" decoding="async" />
      </div>
      <div className="home-refzone-copy">
        <p className="eyebrow">RefZone University</p>
        <h2>Online officiating education built like a real college course.</h2>
        <p>RefZone University gives basketball officials structured readings, lecture notes, visual aids, discussion prompts, quizzes, tests, film labs, and daily assignments across NFHS, NJCAA, NAIA, NCAA, NBA, and WNBA learning tracks.</p>
        <div className="button-row">
          <button className="btn" type="button" onClick={() => setActive('education')}>Learn More</button>
          {featuredPackage && <span className="home-refzone-price">Memberships start at <b>{featuredPackage.price}</b> monthly.</span>}
        </div>
      </div>
    </section>
  );
}

function HomeRefZoneMemberships({ setActive }) {
  return (
    <section className="rtbo-section home-refzone-memberships" aria-labelledby="home-refzone-memberships-title">
      <div className="rtbo-section-head">
        <p className="eyebrow">Membership Packages</p>
        <h2 id="home-refzone-memberships-title">Choose the RefZone University membership that fits your development plan.</h2>
      </div>
      <div className="home-refzone-membership-grid">
        {refZoneMembershipPackages.map((membership) => (
          <article className={membership.badge ? 'featured' : ''} key={membership.id}>
            {membership.badge && <span className="refzone-package-badge">{membership.badge}</span>}
            <h3>{membership.name}</h3>
            <strong>{membership.price}<small> {membership.cadence}</small></strong>
            <p>{membership.summary}</p>
            <button className="btn secondary dark-btn" type="button" onClick={() => setActive('education')}>View Membership</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function HomeResultsFeature({ setActive }) {
  const points = [
    ['proven_results_icon.png', 'Proven Growth', 'Training is designed to help officials improve mechanics, judgment, confidence, and court presence.'],
    ['accountability_icon.png', 'Accountability', 'Officials are challenged to prepare, communicate, accept feedback, and serve the game with professionalism.'],
    ['committed_serving_icon.png', 'Service Mindset', 'Every result connects back to the RTBO standard: We Will Serve And Will Be Of Service To The Game.']
  ];
  const resultCards = [
    ['steve_wiedower_test_coach.png', 'Steve Wiedower', "UALR Women's Basketball Head Coach"],
    ['latanya_martin_test_card.png', 'Latanya Martin', 'NCAA Division I Official']
  ];

  return (
    <section className="rtbo-section home-results-section">
      <div className="results-top-copy">
        <p className="eyebrow">Real Results</p>
        <h2>Officials leave with stronger habits, clearer feedback, and a path forward.</h2>
        <p>The RTBO experience is built around measurable development. Officials receive practical teaching, real court reps, direct feedback, and leadership standards they can take into every assignment.</p>
        <div className="results-top-points">
          {points.map(([icon, title, text]) => (
            <article key={title}>
              <img className="card-icon" src={image(icon)} alt="" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <button className="btn results-home-btn" type="button" onClick={() => setActive('reviews')}>View Reviews</button>
      </div>
      <div className="results-top-cards">
        {resultCards.map(([img, name, title]) => (
          <figure key={name}>
            <img src={image(img)} alt={`${name} RTBO result card`} />
            <figcaption>
              <h3>{name}</h3>
              <p>{title}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function AboutDifference() {
  return (
    <section className="rtbo-section about-difference-section">
      <div className="about-difference-image">
        <img src={image('about_trng_1.png')} alt="Raising The Bar Officiating changes lives through mentorship and training" />
      </div>
      <div className="about-difference-content">
        <div className="rtbo-section-head">
          <p className="eyebrow">The Difference</p>
          <h2>Why Choose Us!</h2>
        </div>
        <div className="about-difference-grid">
          {aboutDifferenceCards.map(([icon, title, text]) => (
            <article key={`${title}-${icon}`}>
              <img src={image(icon)} alt="" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GotUNexRefSection() {
  return (
    <section className="rtbo-band dark platform-section" id="platform">
      <div>
        <p className="eyebrow">Platform</p>
        <h2>One system for the full assigning workflow.</h2>
      </div>
      <div className="platform-content rtbo-react-platform-content">
        <div className="platform-workflow-layout">
          <div className="platform-image-frame platform-workflow-image">
            <img src={image('u-got-nex-ref-platform.png')} alt="Got U Nex Ref platform logo" />
          </div>
          <div className="platform-feature-stack">
            <div className="platform-feature-grid platform-workflow-cards">
              {platformCards.map(([icon, title, text]) => (
                <article key={title}>
                  <img className="card-icon" src={image(icon)} alt="" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <a className="btn platform-services-button" href="#services">View Services</a>
          </div>
        </div>
        <div className="platform-flow-panel">
          <div>
            <p className="eyebrow">Game Flow</p>
            <h3>From schedule creation to final report.</h3>
          </div>
          <div className="platform-flow-grid">
            {platformFlow.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesPlatformWorkflow() {
  return (
    <section className="services-platform-section" aria-labelledby="services-platform-title">
      <div className="services-platform-head">
        <p className="eyebrow">Platform</p>
        <h2 id="services-platform-title">One system for the full assigning workflow.</h2>
      </div>
        <div className="platform-workflow-layout services-workflow-layout">
          <div className="platform-image-frame platform-workflow-image services-workflow-image">
          <img src={image('u-got-nex-ref-platform.png')} alt="Got U Nex Ref platform logo" />
        </div>
        <div className="platform-feature-grid platform-workflow-cards">
          {platformCards.map(([icon, title, text]) => (
            <article key={title}>
              <img className="card-icon" src={image(icon)} alt="" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="platform-flow-panel services-flow-panel">
        <div>
          <p className="eyebrow">Game Flow</p>
          <h3>From schedule creation to final report.</h3>
        </div>
        <div className="platform-flow-grid">
          {platformFlow.map((item, index) => (
            <article key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Director() {
  return (
    <section className="rtbo-section about-director-section director-home-section">
      <div className="about-director-image director-original-stack">
        <div className="image-frame compact"><img src={image('polo_blk_white.png')} alt="RTBO officiating apparel" /></div>
        <div className="director-photo-card"><img src={image('montrel_simmons_trainer_card.png')} alt="Montrel Simmons trainer card" /></div>
      </div>
      <div className="about-director-content">
        <p className="eyebrow">About The Director</p>
        <h2>Montrel Simmons</h2>
        <div className="director-card-grid">
          <article><img className="card-icon" src={image('vision_statement_icon.png')} alt="" /><h3>Our Vision</h3><p>To become a nationally respected leader in basketball officiating by developing highly skilled officials, advancing professionalism, embracing innovation, and serving the game with integrity, excellence, and purpose at every level of competition. This is bigger than officiating. This is about building a culture of professionalism, discipline, leadership, and service.</p></article>
          <article><img className="card-icon" src={image('mission_statement_icon.png')} alt="" /><h3>Mission Statement</h3><p>Raising The Bar Officiating Inc. is committed to elevating the standard of basketball officiating through elite training, mentorship, leadership, development, and professional assignment services. We strive to prepare officials to perform with confidence, consistency, and integrity while staying aligned with the game's evolving rules, mechanics, and philosophies. Through service, education, technology, and community engagement. We are dedicated to building leaders who positively impact the game both on and off the court. This philosophy represents our commitment to professionalism, preparation, leadership, and respect for the game of basketball and everyone connected to it.</p></article>
          <article><img className="card-icon" src={image('tech-driven_icon.png')} alt="" /><h3>Technology-Driven Development</h3><p>U Got Nex Ref integrates training, evaluation, and assigning into a professional, data-informed approach to officiating development.</p></article>
        </div>
      </div>
      <article className="director-bio-card">
        <h3>Founder & Director</h3>
        <p>Founded the Raising the Bar Officiating School in 2017, alongside his wife, Crystal Simmons, with whom he has been married for 25 years. His vision for the school was to provide training that had previously been unavailable to aspiring officials. Montrel aimed to create a comprehensive learning environment that would fill the knowledge gaps he had to seek out on his own, ensuring that new officials would have access to essential training and resources.</p>
        <p>In addition to training, Montrel wanted to offer opportunities for officials to be noticed by collegiate coordinators, paving the way for those aspiring to officiate at the collegiate level. With over 16 years of officiating experience, Montrel is a highly regarded official across all levels of basketball, including Pro-Am leagues and NCAA divisions I, II, and III, as well as the NAIA, NJCAA, and high school competitions. His credentials include 10 years of experience in Pro-Am games, 14 years at the collegiate level, and 11 years in NCAA Division I. He has dedicated 12 years to NCAA Division II, NCAA Division III, NAIA, and NJCAA, and has also officiated high school games for 16 years, constantly refining his craft.</p>
        <p>Montrel's accomplishments include officiating in various postseason tournaments: 4 years in Pro-Am postseason tournaments with The Basketball League, 1 Military Basketball Association National Championship Final, and 9 years in collegiate postseason national tournaments.</p>
      </article>
    </section>
  );
}

function EventsSummary({ onOpenRegister }) {
  return (
    <section className="rtbo-section events-pricing-page" id="training">
      <PaidEventInterestSection />
      <SchoolSessionCards onOpenRegister={onOpenRegister} />
      <PricingPlans onOpenRegister={onOpenRegister} />
      <MultiSessionCards onOpenRegister={onOpenRegister} />
      <EventsBenefitsSection />
    </section>
  );
}

function PaidEventInterestSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState('');

  async function submit(event) {
    event.preventDefault();
    setStatus('Submitting availability...');
    try {
      const data = await apiPost('/event-interest-submit.php', new FormData(event.currentTarget));
      setStatus(data.message || 'Your event interest form was sent.');
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error.message);
    }
  }

  function openModal() {
    setStatus('');
    setModalOpen(true);
  }

  return (
    <section className="paid-event-section" aria-labelledby="paid-event-title">
      <div className="rtbo-section-head">
        <p className="eyebrow">Paid Officiating Event</p>
        <h2 id="paid-event-title">Big Miller Event Team Camp.</h2>
        <p>Officials interested in working this paid team camp can review the event details and submit availability for Super Admin review.</p>
      </div>
      <article className="paid-event-card">
        <div className="paid-event-image-wrap">
          <img src={image(paidEventCard.image)} alt={`${paidEventCard.title} card`} />
        </div>
        <div className="paid-event-copy">
          <p className="eyebrow">{paidEventCard.title}</p>
          <h3>{paidEventCard.date}</h3>
          <p><strong>{paidEventCard.address}</strong></p>
          <div className="paid-event-facts" aria-label="Big Miller event details">
            <span>{paidEventCard.venue}</span>
            <span>{paidEventCard.courts}</span>
            <span>{paidEventCard.crews}</span>
            <span>{paidEventCard.gameFee}</span>
          </div>
          <button className="btn school-card-btn paid-event-learn-btn" type="button" onClick={openModal}>Learn More</button>
        </div>
      </article>
      {modalOpen && (
        <div className="rtbo-modal-scrim" onMouseDown={() => setModalOpen(false)}>
          <section className="paid-event-modal" role="dialog" aria-modal="true" aria-labelledby="paid-event-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="rtbo-modal-close" type="button" aria-label="Close event interest form" onClick={() => setModalOpen(false)}>×</button>
            <div className="paid-event-modal-layout">
              <img className="paid-event-modal-image" src={image(paidEventCard.image)} alt={`${paidEventCard.title} card`} />
              <div className="paid-event-modal-content">
                <p className="eyebrow">Official Availability</p>
                <h2 id="paid-event-modal-title">{paidEventCard.title}</h2>
                <p>This event will be held at the Summer Wood Sports Complex in Alexander, AR. There will be three courts, and RTBO will utilize 3-man crews. The game fee is $30.00 per game per referee.</p>
                <form className="form paid-event-interest-form" onSubmit={submit}>
                  <input type="hidden" name="event_name" defaultValue={paidEventCard.title} />
                  <input type="hidden" name="event_date" defaultValue={paidEventCard.date} />
                  <input type="hidden" name="event_address" defaultValue={paidEventCard.address} />
                  <div className="grid two">
                    <label>First Name<input name="first_name" autoComplete="given-name" required /></label>
                    <label>Last Name<input name="last_name" autoComplete="family-name" required /></label>
                  </div>
                  <div className="grid two">
                    <label>Email<input type="email" name="email" autoComplete="email" required /></label>
                    <label>Phone Number<input type="tel" name="phone" onInput={formatPhoneFieldInput} inputMode="tel" autoComplete="tel" maxLength="14" required /></label>
                  </div>
                  <label>Availability<textarea name="availability" rows="5" placeholder="Share the dates, times, and any constraints for June 8-9, 2026." required /></label>
                  <button className="btn" type="submit">Submit Availability</button>
                  {status && <p className="form-message">{status}</p>}
                </form>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function SchoolSessionCards({ onOpenRegister }) {
  return (
    <section className="school-session-cards" aria-labelledby="school-session-title">
      <div className="rtbo-section-head">
        <p className="eyebrow">2026 Schools & Events</p>
        <h2 id="school-session-title">Choose the school session that fits your development path.</h2>
        <p>Each session gives officials focused teaching, court work, feedback, and opportunities to grow in a professional RTBO training environment.</p>
      </div>
      <div className="school-grid">
        {schoolCardSessions.map(([img, icon, label, title, date]) => {
          const [eventDate, location = ''] = date.split('•').map((item) => item.trim());
          return (
            <article className={`school-session-card${label.includes('Little Rock') ? ' ualr-session-card' : ''}`} key={label}>
              <div className="school-session-image-wrap">
                <img src={image(img)} alt={`${title} RTBO team camp card`} />
                {label.includes('Little Rock') && <span className="school-session-image-date">July 21-22, 2026</span>}
              </div>
              <div className="school-session-content">
                <div className="school-session-title-row">
                  <img className="inline-icon" src={image(icon)} alt="" />
                  <div>
                    <span>{label}</span>
                    <h3>{title}</h3>
                  </div>
                </div>
                <div className="school-card-meta">
                  <p>{eventDate}<br /><strong>{location}</strong></p>
                  <button className="btn school-card-btn" type="button" onClick={onOpenRegister}>Register</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PricingPlans({ onOpenRegister }) {
  return (
    <section className="pricing-plans" aria-labelledby="pricing-plans-title">
      <div className="rtbo-section-head pricing-plans-head">
        <p className="eyebrow">Our Plans</p>
        <h2 id="pricing-plans-title">Choose your 2026 RTBO training session.</h2>
      </div>
      <div className="pricing-container">
        {pricingPlans.map((plan) => (
          <article className="pricing-card" key={plan.title}>
            <div className="pricing-card-top">
              <div className="pricing-title-lockup">
                <img src={image(plan.icon)} alt="" className="pricing-icon" />
                <div>
                  <span className="pricing-badge">{plan.badge}</span>
                  <h3 className="pricing-title">{plan.title}</h3>
                </div>
              </div>
              <div className="pricing-detail"><h2>{plan.price}</h2></div>
            </div>
            <p className="pricing-school">{plan.school}</p>
            <div className="pricing-meta">
              <span>{plan.date}</span>
              <span>{plan.location}</span>
              <span>{plan.venue}</span>
            </div>
            <p className="pricing-subtitle">Included with this session</p>
            <ul className="pricing-list">
              {pricingFeatures.map((feature) => <li className="pricing-item" key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}
            </ul>
            <button className="btn pricing-btn" type="button" onClick={onOpenRegister}>Join Now</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function MultiSessionCards({ onOpenRegister }) {
  const combos = [
    ['Two Sessions', 'From $350.00', 'Choose any two 2026 RTBO school sessions and receive the multi-session savings reflected at checkout.'],
    ['Three Sessions', '$550.00', 'Attend all three RTBO school sessions for the strongest training, evaluation, and exposure path.']
  ];
  return (
    <section className="multi-session-section" aria-labelledby="multi-session-title">
      <div className="rtbo-section-head compact">
        <p className="eyebrow">Multiple Sessions</p>
        <h2 id="multi-session-title">Bundle your development path.</h2>
      </div>
      <div className="multi-session-grid">
        {combos.map(([title, price, text]) => (
          <article key={title}>
            <img src={image('logo.png')} alt="" />
            <div>
              <h3>{title}</h3>
              <strong>{price}</strong>
              <p>{text}</p>
            </div>
            <button className="btn" type="button" onClick={onOpenRegister}>Join Now</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventsBenefitsSection() {
  return (
    <section className="events-benefits-section">
      <div>
        <p className="eyebrow">School Benefits</p>
        <h2>Invest in your growth.</h2>
      </div>
      <div className="events-benefits-image-frame">
        <img src={image('hero.png')} alt="RTBO referee instruction and Raising The Bar Officiating logo" />
      </div>
      <div className="service-list">
        {aboutCards.slice(0, 4).map(([icon, title, text]) => (
          <article key={title}>
            <img className="card-icon" src={image(icon)} alt="" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Services() {
  const items = [
    ['feat_img_1.png', 'Development', 'Officials receive structured growth plans, performance feedback, film review, and advancement guidance that help turn every assignment into a measurable step forward.'],
    ['feat_img_2.png', 'Mentorship', 'Experienced leaders walk with officials through preparation, live-game situations, postgame reflection, and professional habits that build confidence over time.'],
    ['feat_img_3.png', 'Training', 'Classroom instruction, court mechanics, rules knowledge, positioning, communication, and real-game repetitions work together to strengthen every official.'],
    ['feat_img_4.png', 'Leadership', 'Officials are challenged to model accountability, communicate clearly, serve crews well, and carry a standard of excellence on and off the court.']
  ];
  return (
    <section className="rtbo-band services-page-section" id="development">
      <div className="services-top-section">
        <div className="services-top-copy">
          <p className="eyebrow">Service Model</p>
          <h2>Officiating services under one standard.</h2>
          <div className="services-referee-copy">
            <h3>Complete Officiating Solutions</h3>
            <h4>Professional Referee Assignments</h4>
            <p>We provide highly qualified basketball officials for leagues, schools, tournaments, and special events. Every official is trained, evaluated, and prepared to perform with professionalism and consistency.</p>
          </div>
          <p>RTBO supports schools, events, officials, and organizations with a complete officiating model built around preparation, accountability, communication, and service to the game.</p>
          <div className="services-top-points">
            <article><img className="card-icon" src={image('accountability_icon.png')} alt="" /><h3>Event Assigning</h3><p>Organized assignment support for schools, events, and team camps with clear communication and professional standards.</p></article>
            <article><img className="card-icon" src={image('about_trng_icon.png')} alt="" /><h3>Official Development</h3><p>Training, court work, film review, feedback, and mentorship help officials grow beyond a single event.</p></article>
            <article><img className="card-icon" src={image('committed_serving_icon.png')} alt="" /><h3>Leadership Standards</h3><p>Every service is rooted in accountability, preparation, and a commitment to serving the game the right way.</p></article>
          </div>
        </div>
        <a className="services-top-image" href="#services" aria-label="View RTBO services">
          <img src={image('u-got-nex-ref-platform.png')} alt="Got U Nex Ref platform logo" />
        </a>
      </div>
      <div className="services-features-section">
        <div className="services-features-intro">
          <p className="eyebrow">Complete Officiating Solutions</p>
          <h2>Built for Performance, Precision, and Trust.</h2>
          <p>Raising The Bar Officiating delivers more than officials—we deliver confidence in every game. Our services are built to support organizations, develop officials, and ensure the highest standard of professionalism across all levels of basketball.</p>
        </div>
        <div className="solution-grid compact-solutions-grid">
          {items.map(([img, title, text]) => (
            <article key={title}>
              <img src={image(img)} alt={title} />
              <div className="solution-card-copy">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <ServicesPlatformWorkflow />
    </section>
  );
}

function Trainers() {
  return (
    <section className="rtbo-section trainers-section">
      <div className="trainer-top-section">
        <div className="trainer-top-copy">
          <p className="eyebrow">Trainers & Clinicians</p>
          <h2>Meet Our Trainers & Clinicians</h2>
          <p>Our training is led by experienced professionals who understand the game at every level. Each trainer brings a deep knowledge of officiating, a passion for teaching, and a commitment to developing officials who serve the game with excellence.</p>
          <p>At Raising The Bar Officiating, our clinicians don&apos;t just instruct-they mentor, evaluate, and prepare officials for real-game success.</p>
          <h3 className="trainer-philosophy-title">Our Training Philosophy</h3>
          <p>Our trainers are selected based on more than experience-they are chosen for their ability to teach, communicate, and develop officials with clarity and purpose.</p>
          <div className="trainer-top-points">
            <article><img className="card-icon" src={image('about_trng_icon.png')} alt="" /><h3>Foundational Mechanics</h3><p>Building strong foundational mechanics officials can rely on in live-game situations.</p></article>
            <article><img className="card-icon" src={image('about_mdn_tech_icon.png')} alt="" /><h3>Consistency & Accuracy</h3><p>Reinforcing consistency and accuracy in decision-making through teaching, evaluation, and feedback.</p></article>
            <article><img className="card-icon" src={image('reliable_partnership_icon.png')} alt="" /><h3>Confidence & Presence</h3><p>Developing confidence, communication, court presence, and the habits that earn trust.</p></article>
            <article><img className="card-icon" src={image('proven_results_icon.png')} alt="" /><h3>Advancement Ready</h3><p>Preparing officials for advancement at higher levels with clarity, purpose, and accountability.</p></article>
          </div>
        </div>
        <div className="trainer-top-image">
          <img src={image('training_img_1.png')} alt="RTBO training program with officiating development focus" />
        </div>
      </div>
      <div className="rtbo-section-head"><p className="eyebrow">Meet The Trainers</p><h2>Professional development team</h2></div>
      <div className="trainer-grid">
        {trainers.map(([img, name]) => (
          <article className="trainer-card" key={name}>
            <div className="trainer-card-frame">
              <img src={image(img)} alt={name} />
            </div>
            <h3>{name}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function Guests() {
  const [selected, setSelected] = useState(null);
  return (
    <section className="rtbo-section guests-section">
      <div className="guest-top-section">
        <div className="guest-top-image">
          <img src={image('guest_reliable_partnership.png')} alt="RTBO reliable partnership guest leadership artwork" />
        </div>
        <div className="guest-top-copy">
          <p className="eyebrow">Guest Leadership</p>
          <h2>Experienced voices supporting every official's growth.</h2>
          <p>RTBO guest instructors and coordinators bring perspective from the court, the classroom, and the leadership side of officiating. Their role is to help officials understand preparation, professionalism, communication, and what it takes to earn opportunities at higher levels.</p>
          <div className="guest-top-points">
            <article><img className="card-icon" src={image('reliable_partnership_icon.png')} alt="" /><h3>Guest Instruction</h3><p>Experienced leaders add focused teaching, practical examples, and real officiating perspective.</p></article>
            <article><img className="card-icon" src={image('accountability_icon.png')} alt="" /><h3>School Coordination</h3><p>Coordinators help organize the school experience, support officials, and keep the event moving professionally.</p></article>
            <article><img className="card-icon" src={image('proven_results_icon.png')} alt="" /><h3>Development Standards</h3><p>Guest voices reinforce the habits, accountability, and service mindset that RTBO expects.</p></article>
          </div>
        </div>
      </div>
      <div className="rtbo-section-head"><p className="eyebrow">Special Guests & Coordinators</p><h2>Leadership supporting the RTBO school experience.</h2></div>
      <div className="trainer-grid guest-grid">
        {guests.map(([img, name, role, bio]) => (
          <article key={name}>
            <button type="button" onClick={() => setSelected({ img, name, role, bio })}>
              <img src={image(img)} alt={name} />
            </button>
            <h3>{name}</h3>
            <p>{role}</p>
          </article>
        ))}
      </div>
      {selected && (
        <div className="guest-modal is-open" role="dialog" aria-modal="true" aria-label={`${selected.name} bio`}>
          <button className="guest-modal-backdrop" type="button" aria-label="Close guest bio" onClick={() => setSelected(null)}></button>
          <div className="guest-modal-panel">
            <img className="guest-modal-image" src={image(selected.img)} alt={selected.name} />
            <div className="guest-modal-content">
              <p className="eyebrow">Guest Bio</p>
              <h2>{selected.name}</h2>
              <p className="guest-modal-role">{selected.role}</p>
              <p className="guest-modal-bio">{selected.bio}</p>
              <button className="btn" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function isExternalUrl(url = '') {
  return /^https?:\/\//i.test(url);
}

function toYouTubeEmbed(url = '') {
  if (!url) return '';
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    if (hostname === 'youtu.be') return `https://www.youtube.com/embed/${parsedUrl.pathname.slice(1)}`;
    if (hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (parsedUrl.pathname.startsWith('/embed/')) return url;
      if (parsedUrl.pathname.startsWith('/live/')) return `https://www.youtube.com/embed/${parsedUrl.pathname.split('/').filter(Boolean).pop()}`;
    }
  } catch {
    return url;
  }
  return url;
}

function toFacebookEmbed(url = '') {
  if (!url) return '';
  if (url.includes('facebook.com/plugins/video.php')) return url;
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=1280`;
}

function loadEmbedScript(id, src, onload) {
  const existing = document.getElementById(id);
  if (existing) {
    onload?.();
    return;
  }
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  script.onload = onload;
  document.body.appendChild(script);
}

function formatLivestreamTime(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function LivestreamBroadcastOverlays({ studio, channel }) {
  if (!studio) return null;
  const hasOverlay = (id) => studio.activeOverlayIds.includes(id);

  return (
    <div className={`livestream-broadcast-overlays livestream-broadcast-scene-${studio.activeScene.id}`} aria-label="Active broadcast graphics">
      {hasOverlay('logo') && (
        <div className="livestream-overlay-logo">
          <img src={image('logo.png')} alt="" />
        </div>
      )}
      {hasOverlay('scorebug') && (
        <div className="livestream-overlay-scorebug">
          <span>{studio.activeScene.cue}</span>
          <strong>RTBO Training School</strong>
          <em>{channel.label}</em>
        </div>
      )}
      {hasOverlay('lowerThird') && (studio.lowerThird.name || studio.lowerThird.title) && (
        <div className="livestream-overlay-lower-third">
          <strong>{studio.lowerThird.name}</strong>
          <span>{studio.lowerThird.title}</span>
        </div>
      )}
      {hasOverlay('comment') && studio.spotlightComment && (
        <div className="livestream-overlay-comment">
          <strong>{studio.spotlightComment[0]}</strong>
          <span>{studio.spotlightComment[1]}</span>
        </div>
      )}
      {hasOverlay('countdown') && (
        <div className="livestream-overlay-countdown">
          <span>Starting Soon</span>
          <strong>{formatLivestreamTime(studio.countdownSeconds)}</strong>
        </div>
      )}
      {studio.studioMode === 'Live' && (
        <div className="livestream-overlay-scene-chip">
          <span>{studio.studioMode}</span>
          <strong>{studio.activeScene.name}</strong>
        </div>
      )}
      {studio.recording && <div className="livestream-overlay-recording">REC</div>}
    </div>
  );
}

function LivestreamStudio({ studio, actions, onClose }) {
  const enabledDestinations = studio.destinationIds.length;
  const liveButtonLabel = studio.studioMode === 'Live' ? 'End Live' : 'Go Live';

  return (
    <div className="livestream-studio">
      <div className="livestream-studio-head">
        <div>
          <p className="eyebrow">RTBO Live Studio</p>
          <h2>Production controls for scenes, graphics, comments, guests, and destinations.</h2>
        </div>
        <div className="livestream-studio-actions">
          <button type="button" onClick={actions.toggleLive}>{liveButtonLabel}</button>
          <button className={studio.recording ? 'active' : ''} type="button" onClick={actions.toggleRecording}>
            {studio.recording ? 'Stop Recording' : 'Record'}
          </button>
          <button type="button" onClick={actions.addMarker}>Marker {studio.markerCount}</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="livestream-program-grid">
        <article className="livestream-program-card is-program">
          <span>Program</span>
          <h3>{studio.activeScene.name}</h3>
          <p>{studio.activeScene.note}</p>
          <div>{studio.activeScene.sources.map(source => <strong key={source}>{source}</strong>)}</div>
        </article>
        <article className="livestream-program-card is-preview">
          <span>Preview</span>
          <h3>{studio.previewScene.name}</h3>
          <p>{studio.previewScene.note}</p>
          <button type="button" onClick={actions.takePreview}>Take Live</button>
        </article>
        <article className="livestream-program-card">
          <span>Output</span>
          <h3>{enabledDestinations} Destinations</h3>
          <p>{studio.transitionName} transition. Recording {studio.recording ? 'on' : 'off'}.</p>
          <select value={studio.transitionName} onChange={(event) => actions.setTransitionName(event.target.value)} aria-label="Scene transition">
            {['Live Motion', 'Cross Dissolve', 'Swipe', 'White Flash', 'Cut'].map(transition => (
              <option key={transition} value={transition}>{transition}</option>
            ))}
          </select>
        </article>
      </div>

      <div className="livestream-studio-grid">
        <section className="livestream-studio-panel livestream-scenes-panel" aria-label="Scenes">
          <div className="livestream-studio-panel-title">
            <h3>Scenes</h3>
            <button type="button" onClick={actions.takePreview}>Take</button>
          </div>
          <div className="livestream-scene-buttons">
            {livestreamScenes.map(scene => (
              <button
                className={`${studio.previewScene.id === scene.id ? 'is-preview' : ''} ${studio.activeScene.id === scene.id ? 'is-live' : ''}`}
                key={scene.id}
                type="button"
                onClick={() => actions.setPreviewSceneId(scene.id)}
              >
                <span>{scene.cue}</span>
                <strong>{scene.name}</strong>
                <em>{scene.layout}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="livestream-studio-panel" aria-label="Broadcast overlays">
          <div className="livestream-studio-panel-title">
            <h3>Overlays</h3>
            <button type="button" onClick={() => actions.resetOverlays()}>Reset</button>
          </div>
          <div className="livestream-overlay-toggles">
            {livestreamOverlays.map(([id, label]) => (
              <button className={studio.activeOverlayIds.includes(id) ? 'active' : ''} key={id} type="button" onClick={() => actions.toggleOverlay(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="livestream-lower-third-editor">
            <input value={studio.lowerThird.name} onChange={(event) => actions.setLowerThird({ ...studio.lowerThird, name: event.target.value })} aria-label="Lower third name" />
            <input value={studio.lowerThird.title} onChange={(event) => actions.setLowerThird({ ...studio.lowerThird, title: event.target.value })} aria-label="Lower third title" />
          </div>
          <div className="livestream-countdown-editor">
            <label>
              Countdown
              <input type="number" min="0" max="60" value={Math.ceil(studio.countdownSeconds / 60)} onChange={(event) => actions.setCountdownSeconds(Math.max(0, Number(event.target.value) || 0) * 60)} />
            </label>
            <button type="button" onClick={() => actions.toggleOverlay('countdown', true)}>Show Timer</button>
          </div>
        </section>

        <section className="livestream-studio-panel" aria-label="Comments and guests">
          <div className="livestream-studio-panel-title">
            <h3>Comments</h3>
            <button type="button" onClick={() => actions.toggleOverlay('comment', true)}>Add</button>
          </div>
          <div className="livestream-comment-cues">
            {livestreamProducerComments.map(comment => (
              <button className={studio.spotlightComment?.[0] === comment[0] ? 'active' : ''} key={comment[0]} type="button" onClick={() => actions.spotlightComment(comment)}>
                <strong>{comment[0]}</strong>
                <span>{comment[1]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="livestream-studio-panel" aria-label="Destinations">
          <div className="livestream-studio-panel-title">
            <h3>Destinations</h3>
            <span>{enabledDestinations} active</span>
          </div>
          <div className="livestream-destination-toggles">
            {livestreamDestinations.map(([id, label, status]) => (
              <button className={studio.destinationIds.includes(id) ? 'active' : ''} key={id} type="button" onClick={() => actions.toggleDestination(id)}>
                <strong>{label}</strong>
                <span>{status}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="livestream-studio-panel livestream-source-panel" aria-label="Sources and audio">
          <div className="livestream-studio-panel-title">
            <h3>Sources</h3>
            <button type="button" onClick={actions.captureSnapshot}>Snapshot {studio.snapshotCount}</button>
          </div>
          <div className="livestream-source-mixer">
            {livestreamStudioSources.map(([id, label, type]) => (
              <article className={studio.activeSourceIds.includes(id) ? 'active' : ''} key={id}>
                <button type="button" onClick={() => actions.toggleSource(id)}>
                  <span>{type}</span>
                  <strong>{label}</strong>
                </button>
                <input type="range" min="0" max="100" value={studio.sourceLevels[id] ?? 0} onChange={(event) => actions.setSourceLevel(id, Number(event.target.value))} aria-label={`${label} level`} />
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function LivestreamChatPanel({ channel }) {
  const [activePanel, setActivePanel] = useState('chat');
  const [messages, setMessages] = useState(livestreamInitialChat);
  const [message, setMessage] = useState('');

  function sendMessage(event) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    setMessages(currentMessages => [
      ...currentMessages,
      ['RTBO Viewer', trimmedMessage, new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })]
    ]);
    setMessage('');
  }

  return (
    <aside className="livestream-live-panel" aria-label="Livestream engagement panel">
      <div className="livestream-live-panel-tabs" role="tablist" aria-label="Livestream details">
        {[
          ['chat', 'Live Chat'],
          ['info', 'Info'],
          ['polls', 'Polls']
        ].map(([id, label]) => (
          <button className={activePanel === id ? 'active' : ''} key={id} type="button" role="tab" aria-selected={activePanel === id} onClick={() => setActivePanel(id)}>
            {label}
          </button>
        ))}
      </div>

      {activePanel === 'chat' && (
        <div className="livestream-chat-panel" role="tabpanel">
          <div className="livestream-chat-messages">
            {messages.length > 0 ? messages.map(([name, text, time], index) => (
              <article key={`${name}-${time}-${index}`}>
                <span>{name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{name}</strong>
                  <p>{text}</p>
                </div>
                <time>{time}</time>
              </article>
            )) : (
              <p className="livestream-empty-state">Live chat will appear here when the broadcast is active.</p>
            )}
          </div>
          <form className="livestream-chat-form" onSubmit={sendMessage}>
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Say something..." aria-label="Live chat message" />
            <button type="submit" aria-label="Send chat message">Send</button>
          </form>
        </div>
      )}

      {activePanel === 'info' && (
        <div className="livestream-info-panel" role="tabpanel">
          <dl>
            <div><dt>Platform</dt><dd>{channel.label}</dd></div>
            <div><dt>Status</dt><dd>Standby</dd></div>
            <div><dt>Game</dt><dd>Not configured</dd></div>
            <div><dt>Location</dt><dd>Not configured</dd></div>
          </dl>
        </div>
      )}

      {activePanel === 'polls' && (
        <div className="livestream-poll-panel" role="tabpanel">
          <h4>No poll is active.</h4>
          <p>Poll options will appear here when production starts one.</p>
        </div>
      )}
    </aside>
  );
}

function LivestreamControls({
  channel,
  canControlMedia,
  currentSeconds,
  durationSeconds,
  progress,
  playing,
  muted,
  volume,
  captionsOn,
  speed,
  settingsOpen,
  theaterMode,
  miniMode,
  recording,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  onRewind,
  onFastForward,
  onTogglePlay,
  onSkip,
  onSeek,
  onToggleMute,
  onVolume,
  onToggleCaptions,
  onSpeed,
  onToggleSettings,
  onOpenStudioPanel,
  onToggleRecording,
  onGoLive,
  onOpenExternal,
  onToggleTheater,
  onToggleMini,
  onFullscreen
}) {
  const playerOptions = channel.playerOptions || {};
  const hasPlayableSource = Boolean(channel.streamUrl || channel.embedUrl || channel.embedHtml);
  const controlsDisabled = Boolean(
    playerOptions.disableMediaControls ||
    (playerOptions.disableMediaControlsWithoutSource && !hasPlayableSource)
  );
  const controlNote = playerOptions.controlNote || (canControlMedia
    ? 'Controls are connected to the RTBO website stream.'
    : `${channel.label} uses its own platform player. These controls keep the RTBO viewing shell active.`);

  return (
    <div className="livestream-control-layer" aria-label="RTBO livestream controls">
      <div className="livestream-progress-row">
        <span>{formatLivestreamTime(currentSeconds)}</span>
        <input type="range" min="0" max="100" value={progress} onChange={(event) => onSeek(Number(event.target.value))} aria-label="Seek livestream timeline" disabled={controlsDisabled} />
        <span>{formatLivestreamTime(durationSeconds)}</span>
        <strong>Live</strong>
      </div>

      <div className="livestream-control-row">
        <button className="livestream-primary-control" type="button" onClick={onPlay} aria-label="Play livestream" disabled={controlsDisabled}>
          <span aria-hidden="true">Play</span>
        </button>
        <button type="button" onClick={onPause} aria-label="Pause livestream" disabled={controlsDisabled}>Pause</button>
        <button type="button" onClick={onStop} aria-label="Stop livestream" disabled={controlsDisabled}>Stop</button>
        <button type="button" onClick={onPrevious} aria-label="Previous livestream marker" disabled={controlsDisabled}>Prev</button>
        <button type="button" onClick={onRewind} aria-label="Rewind livestream" disabled={controlsDisabled}>Rewind</button>
        <button type="button" onClick={() => onSkip(-10)} aria-label="Skip back 10 seconds" disabled={controlsDisabled}>-10</button>
        <button type="button" onClick={() => onSkip(10)} aria-label="Skip forward 10 seconds" disabled={controlsDisabled}>+10</button>
        <button type="button" onClick={onFastForward} aria-label="Fast forward livestream" disabled={controlsDisabled}>Fast Fwd</button>
        <button type="button" onClick={onNext} aria-label="Next livestream marker" disabled={controlsDisabled}>Next</button>
        <button className={recording ? 'active livestream-record-control' : 'livestream-record-control'} type="button" onClick={onToggleRecording} aria-label={recording ? 'Stop recording livestream' : 'Record livestream'} disabled={controlsDisabled}>
          {recording ? 'Recording' : 'Record'}
        </button>
        <button type="button" onClick={onToggleMute} aria-label={muted ? 'Unmute livestream' : 'Mute livestream'} disabled={controlsDisabled}>{muted ? 'Muted' : 'Sound'}</button>
        <input className="livestream-volume" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => onVolume(Number(event.target.value))} aria-label="Livestream volume" disabled={controlsDisabled} />
        <button className={captionsOn ? 'active' : ''} type="button" onClick={onToggleCaptions} aria-label="Toggle captions">CC</button>
        <button type="button" onClick={onSpeed} aria-label="Change playback speed" disabled={controlsDisabled}>{speed.toFixed(1)}x</button>
        <button className={settingsOpen ? 'active' : ''} type="button" onClick={onToggleSettings} aria-label="Open livestream settings">Settings</button>
        {playerOptions.showStudioButton !== false && <button className="livestream-studio-control-button" type="button" onClick={onOpenStudioPanel} aria-label="Open production controls">Studio</button>}
        {playerOptions.showPopOutButton !== false && <button type="button" onClick={onOpenExternal} aria-label={`Open ${channel.label}`}>Pop Out</button>}
        <button className={theaterMode ? 'active' : ''} type="button" onClick={onToggleTheater} aria-label="Toggle theater mode">Theater</button>
        <button className={miniMode ? 'active' : ''} type="button" onClick={onToggleMini} aria-label="Toggle mini player">Mini</button>
        <button type="button" onClick={onFullscreen} aria-label="Fullscreen player">Full</button>
        {playerOptions.showGoLiveButton !== false && <button type="button" onClick={onGoLive} aria-label="Jump to live" disabled={controlsDisabled}>Go Live</button>}
      </div>

      {settingsOpen && (
        <div className="livestream-settings-menu">
          <p>{controlNote}</p>
          <button type="button" onClick={onToggleCaptions}>{captionsOn ? 'Turn captions off' : 'Turn captions on'}</button>
          <button type="button" onClick={onSpeed}>Playback speed: {speed.toFixed(1)}x</button>
          <button type="button" onClick={onToggleTheater}>{theaterMode ? 'Exit theater mode' : 'Enter theater mode'}</button>
          <button type="button" onClick={onToggleMini}>{miniMode ? 'Close mini player' : 'Open mini player'}</button>
          <button type="button" onClick={onToggleRecording}>{recording ? 'Stop recording' : 'Start recording'}</button>
          {playerOptions.showStudioButton !== false && <button type="button" onClick={onOpenStudioPanel}>Open production controls</button>}
        </div>
      )}
    </div>
  );
}

function LivestreamFollowLinks() {
  const links = [
    ['YouTube', 'https://www.youtube.com', '3d_youtube_livestream_icon.jpg'],
    ['Facebook', 'https://www.facebook.com', '3d_facebook_livestream_icon.jpg'],
    ['X', 'https://www.twitter.com', ''],
    ['Instagram', 'https://www.instagram.com', '3d_instagram_livestream_icon.jpg']
  ];

  return (
    <div className="livestream-follow-links" aria-label="Follow and subscribe links">
      <span>Follow & Subscribe</span>
      {links.map(([label, url, icon]) => (
        <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label}`}>
          {icon ? <img src={image(icon)} alt="" /> : label.slice(0, 1)}
        </a>
      ))}
    </div>
  );
}

function LivestreamScoreboard() {
  const possDots = ['', '', '', '', '', ''];

  return (
    <div className="livestream-scoreboard is-standby" aria-label="Standby scoreboard">
      <div className="livestream-score-icon" aria-hidden="true">
        <span></span>
      </div>
      <div className="livestream-score-team">
        <span>Home</span>
        <strong>--</strong>
      </div>
      <div className="livestream-score-center">
        <span>Period</span>
        <strong>--:--</strong>
        <em aria-hidden="true">Standby</em>
        <div className="livestream-possession-dots" aria-label="Possession indicator">
          <b>Poss</b>
          {possDots.map((state, index) => <i className={state} key={index}></i>)}
        </div>
      </div>
      <div className="livestream-score-team livestream-score-team-away">
        <strong>--</strong>
        <span>Away</span>
      </div>
      <div className="livestream-score-icon livestream-score-icon-away" aria-hidden="true">
        <span></span>
      </div>
    </div>
  );
}

function LivestreamScoreLowerThird({ score = {} }) {
  const details = {
    homeName: 'Home',
    awayName: 'Away',
    homeScore: '--',
    awayScore: '--',
    period: 'Period',
    clock: '--:--',
    status: 'Standby',
    ...score
  };

  return (
    <div className="livestream-score-lower-third" aria-label="Score lower third">
      <div className="livestream-score-lower-third-team">
        <span>{details.homeName}</span>
        <strong>{details.homeScore}</strong>
      </div>
      <div className="livestream-score-lower-third-center">
        <span>{details.period}</span>
        <strong>{details.clock}</strong>
        <em>{details.status}</em>
      </div>
      <div className="livestream-score-lower-third-team livestream-score-lower-third-away">
        <strong>{details.awayScore}</strong>
        <span>{details.awayName}</span>
      </div>
    </div>
  );
}

function LivestreamStreamInfo({ channel }) {
  return (
    <aside className="livestream-stream-info" aria-label="Stream information">
      <h4>Stream Info</h4>
      <dl>
        <div>
          <dt>Game</dt>
          <dd>Not configured</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{channel.label}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>Not configured</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Standby</dd>
        </div>
      </dl>
      <div className="livestream-info-whistle" aria-hidden="true"></div>
    </aside>
  );
}

function LivestreamPlayerShell({ channel, children, controls, studio }) {
  const playerOptions = channel.playerOptions || {};
  const shellClass = [
    'livestream-player-shell',
    playerOptions.className || '',
    controls.theaterMode ? 'is-theater-mode' : '',
    controls.miniMode ? 'is-mini-mode' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={shellClass} data-platform={channel.id} ref={controls.shellRef}>
      <div className="livestream-coded-frame">
        <header className="livestream-player-topbar">
          <div className="livestream-player-brand">
            <img src={image('logo.png')} alt="" />
            <div>
              <strong>{playerOptions.brandTitle || 'Raising The Bar Officiating'}</strong>
              <span>{playerOptions.brandSubtitle || 'Elevating officiating. Elevating the game.'}</span>
            </div>
          </div>
          <div className="livestream-player-header-tools">
            <div className="livestream-player-status">
              <span>{playerOptions.statusLabel || 'Live'}</span>
              <time>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
            </div>
            {playerOptions.showFollowLinks !== false && <LivestreamFollowLinks />}
          </div>
        </header>

        <div className="livestream-player-body">
          <div className="livestream-player-main">
            <div className={`livestream-player-viewport livestream-player-viewport-${channel.aspect}`}>
              {children}
              {playerOptions.showOverlays !== false && <LivestreamBroadcastOverlays studio={studio} channel={channel} />}
              {playerOptions.showScoreLowerThird && <LivestreamScoreLowerThird score={playerOptions.scoreLowerThird} />}
              {controls.captionsOn && (
                <div className="livestream-caption-strip" aria-live="polite">
                  {playerOptions.captionText || 'RTBO live captions enabled for this viewing session.'}
                </div>
              )}
            </div>
            {playerOptions.showScoreboard !== false && <LivestreamScoreboard />}
          </div>
          {playerOptions.showSidebar !== false && (
            <div className="livestream-player-sidebar">
              <LivestreamChatPanel channel={channel} />
              <LivestreamStreamInfo channel={channel} />
            </div>
          )}
        </div>

        <LivestreamControls channel={channel} {...controls} />
      </div>
    </div>
  );
}

function LivestreamFallback({ channel, playing, onStart, onOpenExternal }) {
  const playerOptions = channel.playerOptions || {};
  const canOpenPlatform = isExternalUrl(channel.watchUrl);
  const showActions = playerOptions.showFallbackActions !== false;

  return (
    <div className="livestream-placeholder">
      <img className="livestream-player-fallback-icon" src={image(channel.icon)} alt="" />
      <h3>{playerOptions.fallbackTitle || channel.title}</h3>
      <p>{playerOptions.fallbackDescription || channel.description}</p>
      {showActions && (
        <div className="livestream-placeholder-actions">
          <button className="btn" type="button" onClick={onStart}>
            {playing ? `${channel.label} Player Active` : `View ${channel.label} Livestream`}
          </button>
          {canOpenPlatform && (
            <button className="btn btn-outline livestream-external-link" type="button" onClick={onOpenExternal}>
              Open on {channel.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LivestreamPlayer({ channel, studio, activationKey, recording = false, onToggleRecording = () => {}, onOpenStudioPanel }) {
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const simulatedDuration = Math.max(0, Number(channel.playerOptions?.simulatedDurationSeconds ?? 45 * 60) || 0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(simulatedDuration);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.72);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [miniMode, setMiniMode] = useState(false);
  const embedUrl = channel.embedUrl ||
    (channel.id === 'youtube' ? toYouTubeEmbed(channel.streamUrl) : '') ||
    (channel.id === 'facebook' ? toFacebookEmbed(channel.streamUrl) : '');
  const canControlMedia = channel.id === 'website' && Boolean(channel.streamUrl) && !embedUrl && !channel.embedHtml;

  useEffect(() => {
    if (channel.id === 'tiktok' && channel.embedHtml) {
      loadEmbedScript('rtbo-tiktok-embed', 'https://www.tiktok.com/embed.js');
    }
    if (channel.id === 'instagram' && channel.embedHtml) {
      loadEmbedScript('rtbo-instagram-embed', 'https://www.instagram.com/embed.js', () => window.instgrm?.Embeds?.process());
      window.instgrm?.Embeds?.process();
    }
  }, [channel]);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentSeconds(0);
    setDurationSeconds(simulatedDuration);
    setSettingsOpen(false);
    setMiniMode(false);
  }, [channel.id, simulatedDuration]);

  useEffect(() => {
    if (!activationKey) return;
    startPlayer();
  }, [activationKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.volume = muted ? 0 : volume;
    video.playbackRate = speed;
  }, [muted, volume, speed, channel.id]);

  useEffect(() => {
    if (canControlMedia || !playing) return undefined;
    const timer = window.setInterval(() => {
      setCurrentSeconds(current => {
        if (simulatedDuration <= 0) {
          setProgress(0);
          return 0;
        }
        const next = current >= simulatedDuration ? simulatedDuration : current + speed;
        setProgress(Math.min(100, (next / simulatedDuration) * 100));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [canControlMedia, playing, simulatedDuration, speed]);

  function updateVideoProgress(video) {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : simulatedDuration;
    setDurationSeconds(duration);
    setCurrentSeconds(video.currentTime || 0);
    setProgress(duration > 0 ? Math.min(100, ((video.currentTime || 0) / duration) * 100) : 0);
  }

  async function togglePlay() {
    if (canControlMedia && videoRef.current) {
      try {
        if (videoRef.current.paused) {
          await videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      } catch {
        setPlaying(current => !current);
      }
      return;
    }
    setPlaying(current => !current);
  }

  async function startPlayer() {
    if (canControlMedia && videoRef.current) {
      try {
        await videoRef.current.play();
      } catch {
        setPlaying(true);
      }
      return;
    }
    setPlaying(true);
  }

  function pausePlayer() {
    if (canControlMedia && videoRef.current) {
      videoRef.current.pause?.();
    }
    setPlaying(false);
  }

  function stopPlayer() {
    if (canControlMedia && videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.currentTime = 0;
    }
    seekTo(0);
    setPlaying(false);
  }

  function seekTo(nextProgress) {
    if (durationSeconds <= 0) {
      setProgress(0);
      setCurrentSeconds(0);
      return;
    }
    const boundedProgress = Math.max(0, Math.min(100, nextProgress));
    const nextSeconds = (boundedProgress / 100) * durationSeconds;
    if (canControlMedia && videoRef.current && Number.isFinite(videoRef.current.duration)) {
      videoRef.current.currentTime = nextSeconds;
    }
    setProgress(boundedProgress);
    setCurrentSeconds(nextSeconds);
  }

  function seekToSeconds(nextSeconds) {
    const boundedSeconds = Math.max(0, Math.min(durationSeconds, nextSeconds));
    seekTo(durationSeconds > 0 ? (boundedSeconds / durationSeconds) * 100 : 0);
  }

  function skipBy(seconds) {
    if (durationSeconds <= 0) return;
    const nextSeconds = Math.max(0, Math.min(durationSeconds, currentSeconds + seconds));
    seekTo((nextSeconds / durationSeconds) * 100);
  }

  function previousMarker() {
    if (durationSeconds <= 0) return;
    const markers = [0, durationSeconds * 0.25, durationSeconds * 0.5, durationSeconds * 0.75, durationSeconds];
    const previous = [...markers].reverse().find(marker => marker < currentSeconds - 3) ?? 0;
    seekToSeconds(previous);
  }

  function nextMarker() {
    if (durationSeconds <= 0) return;
    const markers = [0, durationSeconds * 0.25, durationSeconds * 0.5, durationSeconds * 0.75, durationSeconds];
    const next = markers.find(marker => marker > currentSeconds + 3) ?? durationSeconds;
    seekToSeconds(next);
  }

  function changeVolume(nextVolume) {
    const boundedVolume = Math.max(0, Math.min(1, nextVolume));
    setVolume(boundedVolume);
    setMuted(boundedVolume === 0);
  }

  function changeSpeed() {
    setSpeed(currentSpeed => {
      const speeds = [1, 1.25, 1.5, 2, 0.75];
      return speeds[(speeds.indexOf(currentSpeed) + 1) % speeds.length] || 1;
    });
  }

  function goLive() {
    if (canControlMedia && videoRef.current) {
      const video = videoRef.current;
      if (video.seekable?.length) {
        video.currentTime = video.seekable.end(video.seekable.length - 1);
      } else if (Number.isFinite(video.duration)) {
        video.currentTime = Math.max(0, video.duration - 1);
      }
      video.play?.().catch(() => setPlaying(true));
    }
    if (durationSeconds <= 0) return;
    seekTo(100);
    setPlaying(true);
  }

  function openExternal() {
    const href = channel.watchUrl || '#livestream';
    if (isExternalUrl(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.hash = href;
    }
  }

  function toggleFullscreen() {
    const node = shellRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    node.requestFullscreen?.();
  }

  async function toggleMiniPlayer() {
    const video = videoRef.current;
    if (canControlMedia && video?.requestPictureInPicture) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          setMiniMode(false);
        } else {
          await video.requestPictureInPicture();
          setMiniMode(true);
        }
        return;
      } catch {
        setMiniMode(current => !current);
        return;
      }
    }
    setMiniMode(current => !current);
  }

  const controls = {
    shellRef,
    canControlMedia,
    currentSeconds,
    durationSeconds,
    progress,
    playing,
    muted,
    volume,
    captionsOn,
    speed,
    settingsOpen,
    theaterMode,
    miniMode,
    recording,
    onPlay: startPlayer,
    onPause: pausePlayer,
    onStop: stopPlayer,
    onPrevious: previousMarker,
    onNext: nextMarker,
    onRewind: () => skipBy(-30),
    onFastForward: () => skipBy(30),
    onTogglePlay: togglePlay,
    onSkip: skipBy,
    onSeek: seekTo,
    onToggleMute: () => setMuted(current => !current),
    onVolume: changeVolume,
    onToggleCaptions: () => setCaptionsOn(current => !current),
    onSpeed: changeSpeed,
    onToggleSettings: () => setSettingsOpen(current => !current),
    onOpenStudioPanel,
    onToggleRecording,
    onGoLive: goLive,
    onOpenExternal: openExternal,
    onToggleTheater: () => setTheaterMode(current => !current),
    onToggleMini: toggleMiniPlayer,
    onFullscreen: toggleFullscreen
  };

  if (channel.embedHtml) {
    return (
      <LivestreamPlayerShell channel={channel} controls={controls} studio={studio}>
        <div
          className={`livestream-player livestream-player-${channel.aspect}`}
          dangerouslySetInnerHTML={{ __html: channel.embedHtml }}
        />
      </LivestreamPlayerShell>
    );
  }

  if (embedUrl) {
    return (
      <LivestreamPlayerShell channel={channel} controls={controls} studio={studio}>
        <div className={`livestream-player livestream-player-${channel.aspect}`}>
          <iframe
            src={embedUrl}
            title={channel.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      </LivestreamPlayerShell>
    );
  }

  if (channel.id === 'website' && channel.streamUrl) {
    return (
      <LivestreamPlayerShell channel={channel} controls={controls} studio={studio}>
        <div className={`livestream-player livestream-player-${channel.aspect}`}>
          <video
            ref={videoRef}
            playsInline
            preload="metadata"
            poster={image('banner_3.jpg')}
            onLoadedMetadata={(event) => updateVideoProgress(event.currentTarget)}
            onTimeUpdate={(event) => updateVideoProgress(event.currentTarget)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={channel.streamUrl} />
            Your browser does not support this livestream player.
          </video>
        </div>
      </LivestreamPlayerShell>
    );
  }

  return (
    <LivestreamPlayerShell channel={channel} controls={controls} studio={studio}>
      <div className={`livestream-player livestream-player-${channel.aspect}`}>
        <LivestreamFallback channel={channel} playing={playing} onStart={startPlayer} onOpenExternal={openExternal} />
      </div>
    </LivestreamPlayerShell>
  );
}

function RefRoomLivestreamPlayer() {
  const [recording, setRecording] = useState(false);
  const refroomChannel = useMemo(() => ({
    id: 'refroom',
    label: 'RefRoom',
    mark: 'REF',
    status: 'Standby',
    title: 'RefRoom Live Stream Player',
    description: 'No active RefRoom live source is connected yet.',
    icon: '3d_rtbo_livestream_icon.jpg',
    streamUrl: '',
    embedUrl: '',
    embedHtml: '',
    watchUrl: '#refroom',
    aspect: 'wide',
    playerOptions: {
      className: 'refroom-livestream-player',
      brandTitle: 'RefRoom',
      brandSubtitle: 'RTBO live meeting and training broadcast player',
      statusLabel: 'Standby',
      showFollowLinks: false,
      showSidebar: false,
      showScoreboard: false,
      showScoreLowerThird: true,
      showOverlays: false,
      showFallbackActions: false,
      showStudioButton: true,
      showPopOutButton: false,
      showGoLiveButton: false,
      disableMediaControlsWithoutSource: true,
      simulatedDurationSeconds: 0,
      scoreLowerThird: {
        homeName: 'Home',
        awayName: 'Away',
        homeScore: '--',
        awayScore: '--',
        period: 'Period',
        clock: '--:--',
        status: 'Standby'
      },
      fallbackTitle: 'No RefRoom stream connected',
      fallbackDescription: 'When the production studio connects a live source, the RefRoom feed will play here using the same RTBO live stream player.',
      captionText: 'RefRoom captions will appear when the live source provides captions.',
      controlNote: 'RefRoom uses the RTBO live stream player. Connect a live source from the production studio to make playback available.'
    }
  }), []);
  const refroomScene = useMemo(() => ({
    id: 'refroom',
    name: 'RefRoom Player',
    cue: 'Standby',
    layout: 'Wide',
    sources: [],
    note: 'Public RefRoom player waiting for a live production source.'
  }), []);
  const studio = useMemo(() => ({
    activeScene: refroomScene,
    previewScene: refroomScene,
    activeOverlayIds: [],
    destinationIds: ['refroom'],
    activeSourceIds: [],
    sourceLevels: {},
    lowerThird: { name: '', title: '' },
    spotlightComment: null,
    countdownSeconds: 0,
    studioMode: 'Standby',
    recording,
    transitionName: '',
    markerCount: 0,
    snapshotCount: 0
  }), [recording, refroomScene]);

  function openRefRoomStudio() {
    window.location.hash = 'dashboard/refroom';
  }

  return (
    <section className="rtbo-section refroom-livestream-section">
      <LivestreamPlayer
        channel={refroomChannel}
        studio={studio}
        activationKey={0}
        recording={recording}
        onToggleRecording={() => setRecording(current => !current)}
        onOpenStudioPanel={openRefRoomStudio}
      />
    </section>
  );
}

function Livestream() {
  const playerRegionRef = useRef(null);
  const studioPanelRef = useRef(null);
  const [activeChannelId, setActiveChannelId] = useState('website');
  const [playerActivationKey, setPlayerActivationKey] = useState(0);
  const [studioPanelOpen, setStudioPanelOpen] = useState(false);
  const [studioSceneId, setStudioSceneId] = useState('court');
  const [previewSceneId, setPreviewSceneId] = useState('breakdown');
  const [activeOverlayIds, setActiveOverlayIds] = useState([]);
  const [destinationIds, setDestinationIds] = useState(livestreamDestinations.map(([id]) => id));
  const [activeSourceIds, setActiveSourceIds] = useState(livestreamStudioSources.map(([id]) => id));
  const [sourceLevels, setSourceLevels] = useState(() => Object.fromEntries(livestreamStudioSources.map(([id, , , level]) => [id, level])));
  const [lowerThird, setLowerThird] = useState({
    name: '',
    title: ''
  });
  const [spotlightComment, setSpotlightComment] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(5 * 60);
  const [studioMode, setStudioMode] = useState('Standby');
  const [recording, setRecording] = useState(false);
  const [transitionName, setTransitionName] = useState('Live Motion');
  const [markerCount, setMarkerCount] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const activeChannel = livestreamChannels.find(channel => channel.id === activeChannelId) || livestreamChannels[0];
  const activeScene = livestreamScenes.find(scene => scene.id === studioSceneId) || livestreamScenes[1];
  const previewScene = livestreamScenes.find(scene => scene.id === previewSceneId) || livestreamScenes[2];
  const studio = {
    activeScene,
    previewScene,
    activeOverlayIds,
    destinationIds,
    activeSourceIds,
    sourceLevels,
    lowerThird,
    spotlightComment,
    countdownSeconds,
    studioMode,
    recording,
    transitionName,
    markerCount,
    snapshotCount
  };

  useEffect(() => {
    if (studioMode !== 'Live' || !activeOverlayIds.includes('countdown')) return undefined;
    const timer = window.setInterval(() => {
      setCountdownSeconds(currentSeconds => Math.max(0, currentSeconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [studioMode, activeOverlayIds]);

  function toggleOverlay(id, forcedState) {
    setActiveOverlayIds(currentIds => {
      const shouldEnable = typeof forcedState === 'boolean' ? forcedState : !currentIds.includes(id);
      if (shouldEnable) return currentIds.includes(id) ? currentIds : [...currentIds, id];
      return currentIds.filter(currentId => currentId !== id);
    });
  }

  function toggleDestination(id) {
    setDestinationIds(currentIds => (
      currentIds.includes(id)
        ? currentIds.filter(currentId => currentId !== id)
        : [...currentIds, id]
    ));
  }

  function toggleSource(id) {
    setActiveSourceIds(currentIds => (
      currentIds.includes(id)
        ? currentIds.filter(currentId => currentId !== id)
        : [...currentIds, id]
    ));
  }

  function setSourceLevel(id, level) {
    setSourceLevels(currentLevels => ({
      ...currentLevels,
      [id]: Math.max(0, Math.min(100, level))
    }));
  }

  function activateLivestreamChannel(channelId, shouldScroll = true) {
    setActiveChannelId(channelId);
    setStudioMode('Live');
    setDestinationIds(currentIds => (
      currentIds.includes(channelId) ? currentIds : [...currentIds, channelId]
    ));
    setPlayerActivationKey(currentKey => currentKey + 1);

    if (shouldScroll && typeof window !== 'undefined') {
      window.setTimeout(() => {
        playerRegionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }

  function openStudioPanel() {
    if (typeof window !== 'undefined') {
      const studioUrl = `${window.location.origin}${window.location.pathname}?studio=1`;
      const studioWindow = window.open(
        studioUrl,
        'rtbo-live-studio',
        'popup=yes,width=1280,height=920,left=80,top=60,resizable=yes,scrollbars=yes'
      );
      if (studioWindow) {
        studioWindow.focus?.();
        return;
      }
    }
    setStudioPanelOpen(true);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        studioPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }

  const studioActions = {
    setPreviewSceneId,
    setTransitionName,
    setLowerThird,
    setCountdownSeconds,
    toggleOverlay,
    toggleDestination,
    toggleSource,
    setSourceLevel,
    spotlightComment: (comment) => {
      setSpotlightComment(comment);
      toggleOverlay('comment', true);
    },
    resetOverlays: () => setActiveOverlayIds([]),
    takePreview: () => setStudioSceneId(previewSceneId),
    toggleLive: () => setStudioMode(currentMode => (currentMode === 'Live' ? 'Standby' : 'Live')),
    toggleRecording: () => setRecording(current => !current),
    addMarker: () => setMarkerCount(current => current + 1),
    captureSnapshot: () => setSnapshotCount(current => current + 1)
  };

  return (
    <section className="rtbo-section livestream-page">
      <div className="livestream-intro">
        <div className="livestream-intro-copy">
          <p className="eyebrow">Live Training Broadcasts</p>
          <h2 className="livestream-intro-title">
            <span>Website and social streaming for every</span>
            <span>RTBO training school.</span>
          </h2>
          <p>Use this broadcast center during training schools for live instruction, rules teaching, court mechanics, film breakdowns, official interviews, and promotional coverage across RTBO&apos;s website, Facebook, YouTube, TikTok, and Instagram.</p>
        </div>
      </div>

      <div className="livestream-top-cards">
        <aside className="livestream-status-panel">
          <button
            className="livestream-studio-settings-button"
            type="button"
            onClick={openStudioPanel}
            aria-controls="livestream-studio-panel"
            aria-expanded={studioPanelOpen}
          >
            <img className="livestream-status-icon" src={image('3d_rtbo_livestream_icon.jpg')} alt="" />
            <span className="livestream-studio-settings-label">Open Production Controls</span>
          </button>
          <span>Standby</span>
          <h3>RTBO Training School Live</h3>
          <p>The broadcast window opens when a school session, film breakdown, or promotional segment goes live.</p>
        </aside>

        <aside className="livestream-feature-panel">
          <p className="eyebrow">Now Featured</p>
          <h3>{activeChannel.title}</h3>
          <p>{activeChannel.description}</p>
          <div className="livestream-feature-actions">
            <button className="btn livestream-platform-action" type="button" onClick={() => activateLivestreamChannel(activeChannel.id)}>
              View {activeChannel.label} Livestream
            </button>
            {isExternalUrl(activeChannel.watchUrl) && (
              <a className="btn btn-outline livestream-external-link" href={activeChannel.watchUrl} target="_blank" rel="noreferrer">
                Open on {activeChannel.label}
              </a>
            )}
          </div>
          <ul>
            <li>RTBO branded player shell frames every website and platform preview.</li>
            <li>Primary website player supports direct video streams and replays.</li>
            <li>YouTube, Facebook, TikTok, and Instagram tabs support embeds or external live links.</li>
          </ul>
        </aside>
      </div>

      <div className="livestream-watch-grid" id="livestream-player" ref={playerRegionRef}>
        <div className="livestream-watch-main">
          <div className="livestream-tabs" aria-label="Livestream channels">
            {livestreamChannels.map(channel => (
              <button
                className={channel.id === activeChannel.id ? 'active' : ''}
                key={channel.id}
                type="button"
                aria-pressed={channel.id === activeChannel.id}
                onClick={() => activateLivestreamChannel(channel.id)}
              >
                <img className="livestream-tab-icon" src={image(channel.icon)} alt="" />
                {channel.label}
              </button>
            ))}
          </div>
          <LivestreamPlayer
            channel={activeChannel}
            studio={studio}
            activationKey={playerActivationKey}
            recording={recording}
            onToggleRecording={studioActions.toggleRecording}
            onOpenStudioPanel={openStudioPanel}
          />
        </div>
      </div>

      {studioPanelOpen && (
        <div id="livestream-studio-panel" ref={studioPanelRef}>
          <LivestreamStudio studio={studio} actions={studioActions} onClose={() => setStudioPanelOpen(false)} />
        </div>
      )}

      <div className="livestream-platform-section">
        <div className="rtbo-section-head">
          <p className="eyebrow">Broadcast Channels</p>
          <h2>Website, Facebook, YouTube, TikTok, and Instagram.</h2>
          <p>Each platform has its own role, from full school broadcasts to vertical social moments and post-event promotional recaps.</p>
        </div>
        <div className="livestream-channel-grid">
          {livestreamChannels.map(channel => (
            <article key={channel.id}>
              <img className="livestream-card-icon" src={image(channel.icon)} alt={`${channel.label} livestream`} />
              <span>{channel.status}</span>
              <h3>{channel.label}</h3>
              <p>{channel.description}</p>
              <button type="button" onClick={() => activateLivestreamChannel(channel.id)}>View Livestream</button>
            </article>
          ))}
        </div>
      </div>

      <div className="livestream-production-grid">
        <div>
          <p className="eyebrow">Training & Promotion</p>
          <h2>One hub for training, replay, and audience growth.</h2>
          <p>RTBO can feature the main live training feed on the website while directing families, officials, schools, and promotional audiences to the social channel that best fits each moment.</p>
        </div>
        <div className="livestream-run-card">
          <h3>Broadcast Run Of Show</h3>
          <ol>
            {livestreamRunOfShow.map(item => <li key={item}>{item}</li>)}
          </ol>
        </div>
      </div>

      <div className="livestream-schedule-section">
        <div className="rtbo-section-head">
          <p className="eyebrow">Upcoming Schools</p>
          <h2>Livestream windows</h2>
        </div>
        <div className="livestream-schedule-grid">
          {livestreamSchedule.map(([date, location, focus]) => (
            <article key={location}>
              <span>{date}</span>
              <h3>{location}</h3>
              <p>{focus}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewRatingDisplay({ rating }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <span className="attendee-review-rating-display" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i className={index < value ? 'active' : ''} aria-hidden="true" key={index}>★</i>
      ))}
    </span>
  );
}

function Reviews() {
  const [submittedReviews, setSubmittedReviews] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RTBO_REVIEW_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewPhotoName, setReviewPhotoName] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const ratingOptions = ['1', '2', '3', '4', '5'];

  async function submitReview(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const reviewText = String(formData.get('review') || '').trim();

    if (reviewText.length < 20) {
      setReviewStatus('Please write at least 20 characters about your school or course experience.');
      return;
    }

    setReviewSubmitting(true);
    setReviewStatus('Submitting your review...');

    try {
      const data = await apiPost('/review-submit.php', formData);
      const nextReview = {
        id: `local-${Date.now()}`,
        name: String(formData.get('full_name') || '').trim(),
        experience: String(formData.get('experience_type') || '').trim(),
        schoolOrCourse: String(formData.get('school_or_course') || '').trim(),
        rating: String(formData.get('rating') || '').trim(),
        photoName: reviewPhotoName,
        review: reviewText,
        submittedAt: new Date().toISOString()
      };
      const nextReviews = [nextReview, ...submittedReviews].slice(0, 3);
      setSubmittedReviews(nextReviews);
      localStorage.setItem(RTBO_REVIEW_STORAGE_KEY, JSON.stringify(nextReviews));
      form.reset();
      setReviewPhotoName('');
      setReviewRating('5');
      setReviewStatus(data.message || 'Thank you. Your review was submitted for RTBO review.');
    } catch (error) {
      setReviewStatus(error.message || 'Your review could not be submitted right now.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <section className="rtbo-section testimonials-section">
      <div className="rtbo-section-head">
        <p className="eyebrow">Real Results</p>
        <h2>What Our Officials & Partners Are Saying</h2>
        <p>The true measure of our impact is reflected in the voices of those we serve. From developing officials to partnering organizations, our commitment to excellence continues to raise the standard across every level of the game.</p>
      </div>
      <div className="testimonial-grid" id="testimonials-list">
        {testimonials.map(([img, name, title, text]) => (
          <article key={name}>
            <div className="testimonial-card-media">
              <img src={image(img)} alt={`${name} testimonial card`} />
              <div className="testimonial-card-meta">
                <h3>{name}</h3>
                <p className="testimonial-title">{title}</p>
              </div>
            </div>
            <div className="testimonial-card-content">
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="attendee-review-section" id="leave-review">
        <div className="attendee-review-copy">
          <p className="eyebrow">Share Your Experience</p>
          <h3>Leave a review for RTBO training.</h3>
          <p>Officials who attended an in-person training school or enrolled in a RefZone University course can submit feedback about the instruction, course materials, clinicians, court work, and overall school experience.</p>
          <div className="attendee-review-paths" aria-label="Review categories">
            <span>In-person school</span>
            <span>RefZone University</span>
            <span>Both experiences</span>
          </div>
          {submittedReviews.length > 0 && (
            <div className="attendee-review-submitted-list" aria-label="Recently submitted reviews">
              {submittedReviews.map((review) => (
                <article key={review.id}>
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.schoolOrCourse}</span>
                  </div>
                  <ReviewRatingDisplay rating={review.rating} />
                  {review.photoName && <small>Picture uploaded: {review.photoName}</small>}
                  <p>{review.review}</p>
                </article>
              ))}
            </div>
          )}
        </div>
        <form className="form attendee-review-form" method="post" action={`${API_URL}/review-submit.php`} encType="multipart/form-data" onSubmit={submitReview}>
          <div className="grid two">
            <label>
              Full Name
              <input name="full_name" placeholder="Enter your name" required />
            </label>
            <label>
              Email Address
              <input type="email" name="email" placeholder="Enter your email" required />
            </label>
          </div>
          <div className="grid two">
            <label>
              Review Type
              <select name="experience_type" required defaultValue="">
                <option value="" disabled>Select review type</option>
                <option value="in_person_school">In-person training school</option>
                <option value="refzone_university">RefZone University course</option>
                <option value="both">Both experiences</option>
              </select>
            </label>
            <label>
              School or Course
              <input name="school_or_course" placeholder="Enter school or course name" required />
            </label>
          </div>
          <div className="grid two">
            <label>
              Your Role
              <select name="attendee_role" required defaultValue="">
                <option value="" disabled>Select role</option>
                <option>Official</option>
                <option>Evaluator</option>
                <option>Observer</option>
                <option>Coach</option>
                <option>Other</option>
              </select>
            </label>
            <fieldset className="attendee-review-rating">
              <legend>Rating</legend>
              <div className="attendee-review-star-options" role="radiogroup" aria-label="School experience rating">
                {ratingOptions.map((rating) => (
                  <label className={Number(reviewRating) >= Number(rating) ? 'selected' : ''} key={rating}>
                    <input
                      type="radio"
                      name="rating"
                      value={rating}
                      checked={reviewRating === rating}
                      onChange={() => setReviewRating(rating)}
                      required
                    />
                    <span aria-hidden="true">★</span>
                    <b>{rating}</b>
                  </label>
                ))}
              </div>
              <p>{reviewRating} star rating selected</p>
            </fieldset>
          </div>
          <label>
            Review
            <textarea name="review" rows="6" minLength="20" maxLength="1200" placeholder="Tell us about your school or course experience" required></textarea>
          </label>
          <label className="attendee-review-photo-upload" htmlFor="attendee-review-photo">
            <span>Upload Picture</span>
            <input
              id="attendee-review-photo"
              type="file"
              name="review_photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setReviewPhotoName(event.target.files?.[0]?.name || '')}
            />
            <b>{reviewPhotoName || 'No picture selected'}</b>
            <small>JPG, PNG, or WebP. Maximum 5MB.</small>
          </label>
          <label className="attendee-review-consent">
            <input type="checkbox" name="public_consent" value="yes" required />
            <span>I confirm this review reflects my experience and may be reviewed by RTBO before being published.</span>
          </label>
          <label className="attendee-review-consent">
            <input type="checkbox" name="contact_ok" value="yes" />
            <span>RTBO may contact me about this review.</span>
          </label>
          <button className="btn attendee-review-submit" type="submit" disabled={reviewSubmitting}>
            {reviewSubmitting ? 'Submitting Review...' : 'Submit Review'}
          </button>
          {reviewStatus && <p className={`form-message${reviewStatus.toLowerCase().includes('could not') || reviewStatus.toLowerCase().includes('please') ? ' error' : ''}`} role="status">{reviewStatus}</p>}
        </form>
      </div>
    </section>
  );
}

function Shop() {
  return (
    <React.Suspense fallback={<section className="rtbo-section"><p>Loading RTBO shop...</p></section>}>
      <ShopStore />
    </React.Suspense>
  );
}

function RegistrationOneTimePaymentField() {
  return (
    <fieldset className="registration-one-time-payment">
      <legend>Payment Type</legend>
      <label className="registration-one-time-option">
        <input type="radio" name="payment_type" value="one_time" defaultChecked required />
        <span>
          <strong>One-time Payment</strong>
          <small>RTBO school registration continues to one secure hosted checkout after this application is submitted.</small>
        </span>
      </label>
    </fieldset>
  );
}

function PaymentLogo({ brand, compact = false }) {
  const logoClass = `rtbo-payment-logo rtbo-payment-logo-${brand}${compact ? ' compact' : ''}`;
  if (brand === 'paypal') {
    return (
      <span className={logoClass} aria-label="PayPal">
        <svg viewBox="0 0 132 34" role="img" aria-hidden="true" focusable="false">
          <path fill="#003087" d="M11.4 4.3h13.1c4.4 0 7.2 2.3 6.6 6.8-.7 5.2-4.4 8.1-9.5 8.1h-4.1l-1.3 8.1H8.1L11.4 4.3Z" />
          <path fill="#009cde" d="M18.4 11.8h5.1c1.9 0 3 .9 2.7 2.7-.3 2.2-1.9 3.3-4 3.3h-4.6l.8-6Z" />
          <text x="39" y="23" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fontWeight="800">PayPal</text>
        </svg>
      </span>
    );
  }
  if (brand === 'visa') {
    return (
      <span className={logoClass} aria-label="Visa">
        <svg viewBox="0 0 96 34" role="img" aria-hidden="true" focusable="false">
          <rect width="96" height="34" rx="5" fill="#fff" />
          <text x="48" y="23" textAnchor="middle" fill="#1a1f71" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="18" fontStyle="italic" fontWeight="900">VISA</text>
        </svg>
      </span>
    );
  }
  if (brand === 'mastercard') {
    return (
      <span className={logoClass} aria-label="Mastercard">
        <svg viewBox="0 0 96 34" role="img" aria-hidden="true" focusable="false">
          <rect width="96" height="34" rx="5" fill="#fff" />
          <circle cx="39" cy="17" r="10" fill="#eb001b" />
          <circle cx="51" cy="17" r="10" fill="#f79e1b" opacity=".92" />
          <path fill="#ff5f00" d="M45 9.2a10 10 0 0 1 0 15.6 10 10 0 0 1 0-15.6Z" />
          <text x="48" y="30" textAnchor="middle" fill="#111827" fontFamily="Arial, Helvetica, sans-serif" fontSize="6.5" fontWeight="700">mastercard</text>
        </svg>
      </span>
    );
  }
  if (brand === 'amex') {
    return (
      <span className={logoClass} aria-label="American Express">
        <svg viewBox="0 0 96 34" role="img" aria-hidden="true" focusable="false">
          <rect width="96" height="34" rx="5" fill="#2e77bb" />
          <text x="48" y="15" textAnchor="middle" fill="#fff" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="9.8" fontWeight="900">AMERICAN</text>
          <text x="48" y="26" textAnchor="middle" fill="#fff" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="10.8" fontWeight="900">EXPRESS</text>
        </svg>
      </span>
    );
  }
  if (brand === 'discover') {
    return (
      <span className={logoClass} aria-label="Discover">
        <svg viewBox="0 0 108 34" role="img" aria-hidden="true" focusable="false">
          <rect width="108" height="34" rx="5" fill="#fff" />
          <circle cx="70" cy="17" r="12" fill="#f58220" opacity=".9" />
          <text x="54" y="22" textAnchor="middle" fill="#111827" fontFamily="Arial Black, Arial, Helvetica, sans-serif" fontSize="15" fontWeight="900">DISCOVER</text>
        </svg>
      </span>
    );
  }
  if (brand === 'apple-pay') {
    return (
      <span className={logoClass} aria-label="Apple Pay">
        <svg viewBox="0 0 108 34" role="img" aria-hidden="true" focusable="false">
          <rect width="108" height="34" rx="6" fill="#fff" />
          <path fill="#111" d="M26.6 9.4c.8-1 1.3-2.2 1.2-3.4-1.2.1-2.6.8-3.4 1.7-.8.9-1.4 2.1-1.3 3.3 1.3.1 2.7-.6 3.5-1.6Zm4.6 14.4c-.6 1.3-.9 1.8-1.7 3-1.1 1.6-2.6 3.6-4.5 3.6-1.7 0-2.1-1.1-4.4-1.1s-2.8 1.1-4.4 1.1c-1.9 0-3.4-1.8-4.5-3.4-3.1-4.6-3.4-10-.8-12.9 1.3-1.5 3-2.3 4.8-2.3 1.9 0 3 .9 4.5.9 1.4 0 2.3-.9 4.4-.9 1.6 0 3.3.9 4.5 2.4-3.9 2.1-3.3 7.6 1.6 9.6Z" />
          <text x="63" y="22.6" textAnchor="middle" fill="#111" fontFamily="Arial, Helvetica, sans-serif" fontSize="19" fontWeight="800">Pay</text>
        </svg>
      </span>
    );
  }
  if (brand === 'google-pay') {
    return (
      <span className={logoClass} aria-label="Google Pay">
        <svg viewBox="0 0 118 34" role="img" aria-hidden="true" focusable="false">
          <rect width="118" height="34" rx="6" fill="#fff" />
          <path fill="#4285f4" d="M26.5 17.4c0-.7-.1-1.3-.2-1.9H17v3.6h5.3c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 3-4.1 3-7Z" />
          <path fill="#34a853" d="M17 27c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-3.9H8.4v2.5A9.7 9.7 0 0 0 17 27Z" />
          <path fill="#fbbc04" d="M11.6 19.2a5.8 5.8 0 0 1 0-3.8v-2.5H8.4a9.8 9.8 0 0 0 0 8.8l3.2-2.5Z" />
          <path fill="#ea4335" d="M17 11.5c1.4 0 2.7.5 3.7 1.5l2.8-2.8A9.4 9.4 0 0 0 17 7.5a9.7 9.7 0 0 0-8.6 5.4l3.2 2.5c.8-2.2 2.9-3.9 5.4-3.9Z" />
          <text x="69" y="23" textAnchor="middle" fill="#202124" fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fontWeight="700">Pay</text>
        </svg>
      </span>
    );
  }
  return null;
}

const refZoneCourseTracks = [
  ['nfhs', 'NFHS High School Track', 'refzone/course-covers/nfhs.svg', 'Rules, case plays, two-person and three-person mechanics, game administration, and state-association readiness.'],
  ['njcaa', 'NJCAA Track', 'refzone/course-covers/njcaa-men.svg', 'College mechanics, primary coverage, crew communication, film study, and junior college advancement preparation.'],
  ['naia', 'NAIA Track', 'refzone/course-covers/naia-men.svg', 'College rules study, positioning labs, professionalism, game management, and supervisor-ready explanations.'],
  ['ncaa', 'NCAA Track', 'refzone/course-covers/ncaa-men.svg', 'Advanced officiating concepts, adjudication standards, play-calling philosophy, video review, and portfolio evidence.'],
  ['pro', 'NBA/WNBA Development Track', 'refzone/course-covers/nba.svg', 'Professional-level habits, precision mechanics, communication, film defense, and higher-level readiness.']
];

const refZoneCourseRouteLabels = {
  nfhs: 'NFHS Membership Course',
  'njcaa-men': 'NJCAA Men Course',
  'njcaa-women': 'NJCAA Women Course',
  'naia-men': 'NAIA Men Course',
  'naia-women': 'NAIA Women Course',
  'ncaa-men': 'NCAA Membership Course',
  'ncaa-women': 'NCAA Women Course',
  nba: 'Pro-Am Membership Course',
  wnba: 'WNBA Course'
};

function refZoneCourseRouteLabel(courseId = '') {
  const normalized = String(courseId || '').trim().toLowerCase();
  return refZoneCourseRouteLabels[normalized] || 'RefZone University Course';
}

const emptyRefZoneAccess = {
  loading: false,
  courseIds: [],
  enrollments: [],
  message: ''
};

function RefZoneCourseAccessGate({ courseId = '', onCreateAccount = () => {}, onSignIn = () => {} }) {
  return (
    <section className="refzone-course-access-section" aria-labelledby="refzone-course-access-title">
      <div className="refzone-account-required-card">
        <span>Account Required</span>
        <h2 id="refzone-course-access-title">{refZoneCourseRouteLabel(courseId)} Access</h2>
        <p>Sign in with the RTBO account you used for training school registration, or create an account first. After your account is active, you can enroll in a RefZone University membership package and access the course tied to that package.</p>
        <div className="refzone-account-actions">
          <button className="btn" type="button" onClick={onCreateAccount}>Create Account</button>
          <button className="btn secondary dark-btn" type="button" onClick={onSignIn}>Sign In</button>
        </div>
      </div>
    </section>
  );
}

function RefZoneMembershipGate({ courseId = '', loading = false, onEnroll = () => {} }) {
  return (
    <section className="refzone-course-access-section" aria-labelledby="refzone-membership-access-title">
      <div className="refzone-account-required-card">
        <span>{loading ? 'Checking Access' : 'Membership Required'}</span>
        <h2 id="refzone-membership-access-title">{loading ? 'Checking RefZone University access.' : `${refZoneCourseRouteLabel(courseId)} requires an active membership.`}</h2>
        <p>{loading ? 'Please wait while RTBO confirms your RefZone University membership.' : 'Enroll in a RefZone University package with this signed-in RTBO account. Once checkout is confirmed, you will be redirected to the course connected to that package.'}</p>
        {!loading && (
          <div className="refzone-account-actions">
            <button className="btn" type="button" onClick={onEnroll}>Choose Membership Package</button>
          </div>
        )}
      </div>
    </section>
  );
}

function RefZoneUniversityLanding({ user = null, onCreateAccount = () => {}, onSignIn = () => {} }) {
  const defaultPackage = refZoneMembershipPackages[0]?.id || 'fundamentals';
  const [selectedPackageId, setSelectedPackageId] = useState(defaultPackage);
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  const [status, setStatus] = useState('');
  const selectedPackage = refZoneMembershipPackages.find((membership) => membership.id === selectedPackageId) || refZoneMembershipPackages[0];
  const signedIn = Boolean(user?.email);
  const accountName = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const accountPhone = formatPhoneNumber(user?.phone || '');

  async function submitEnrollment(event) {
    event.preventDefault();
    if (!signedIn) {
      setStatus('Create an account or sign in before enrolling in RefZone University.');
      onCreateAccount();
      return;
    }
    setStatus('Creating secure membership checkout...');
    try {
      const data = await apiPost('/refzone-enrollment-submit.php', new FormData(event.currentTarget));
      const redirect = data.redirect || data.checkout_url;
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      setStatus(data.message || 'Enrollment received.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  function scrollToEnrollment() {
    document.getElementById('refzone-university-enrollment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="refzone-university-page" aria-labelledby="refzone-university-title">
      <div className="refzone-university-hero">
        <div className="refzone-university-hero-copy">
          <p className="eyebrow">RefZone University</p>
          <h1 id="refzone-university-title">A college-style officiating program for serious basketball officials.</h1>
          <p>RefZone University turns rules study, mechanics, film review, discussion, testing, and mentor feedback into a structured online learning experience. Every course includes required readings, lecture notes, visual aids, daily assignments, assessments, and advancement evidence.</p>
          <div className="refzone-university-actions">
            <button className="btn" type="button" onClick={scrollToEnrollment}>Enroll Now</button>
            <button className="btn secondary dark-btn" type="button" onClick={() => document.getElementById('refzone-university-packages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>View Packages</button>
          </div>
        </div>
        <figure className="refzone-university-hero-media">
          <img src={image('refzone/course-overview-thumbnail.png')} alt="RefZone University course overview" loading="eager" decoding="async" />
          <figcaption>
            <strong>9 course tracks</strong>
            <span>Daily college-style lessons, labs, quizzes, tests, and portfolio evidence.</span>
          </figcaption>
        </figure>
      </div>

      <div className="refzone-university-overview">
        {[
          ['Course Materials', 'Required readings, lecture notes, screenshots, visual aids, discussion questions, written assignments, and practical labs.'],
          ['Academic Structure', 'Weekly modules, daily sections, graded assessments, remediation rules, and completion standards that mirror a true course experience.'],
          ['Development Pathway', 'Officials can move from foundation study to film labs, live practicum preparation, mentor feedback, and advancement readiness.']
        ].map(([title, text]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <section className="refzone-university-track-section" aria-labelledby="refzone-track-title">
        <div className="rtbo-section-head">
          <p className="eyebrow">Course Tracks</p>
          <h2 id="refzone-track-title">Choose the officiating pathway that fits your next level.</h2>
        </div>
        <div className="refzone-track-grid">
          {refZoneCourseTracks.map(([id, title, asset, text]) => (
            <article key={id}>
              <img src={image(asset)} alt="" loading="lazy" decoding="async" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="refzone-membership-section" id="refzone-university-packages" aria-labelledby="refzone-membership-title">
        <div className="rtbo-section-head">
          <p className="eyebrow">Membership Packages</p>
          <h2 id="refzone-membership-title">Monthly memberships for every stage of development.</h2>
          <p>All packages are recurring monthly memberships and continue through secure Stripe or PayPal checkout.</p>
        </div>
        <div className="refzone-membership-grid">
          {refZoneMembershipPackages.map((membership) => (
            <article className={membership.badge ? 'featured' : ''} key={membership.id}>
              {membership.badge && <span className="refzone-package-badge">{membership.badge}</span>}
              <h3>{membership.name}</h3>
              <p>{membership.summary}</p>
              <strong>{membership.price}<small> {membership.cadence}</small></strong>
              <ul>
                {membership.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
              <button className="btn secondary dark-btn" type="button" onClick={() => { setSelectedPackageId(membership.id); scrollToEnrollment(); }}>Choose {membership.name.replace(' Membership', '')}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="refzone-enrollment-section" id="refzone-university-enrollment" aria-labelledby="refzone-enrollment-title">
        <div className="refzone-enrollment-head">
          <h2 id="refzone-enrollment-title">Start RefZone University with {selectedPackage?.name || 'a monthly membership'}.</h2>
          <p>{signedIn ? 'Complete the enrollment form, select a package, choose Stripe or PayPal, and continue to secure hosted checkout. Your membership access is tied to your signed-in RTBO account.' : 'Create an account or sign in first. Then you can enroll in a RefZone University membership package and access the course tied to that package.'}</p>
          {selectedPackage && (
            <div className="refzone-selected-package">
              <span>Select Package</span>
              <strong>{selectedPackage.name}</strong>
              <b>{selectedPackage.price} {selectedPackage.cadence}</b>
            </div>
          )}
        </div>
        {!signedIn ? (
          <div className="refzone-account-required-card">
            <span>Account Required</span>
            <h3>Create an account before enrolling.</h3>
            <p>Use the same RTBO login you created for training school registration. If you have not registered for a school before, create an account now, then return here to choose your membership package.</p>
            <div className="refzone-account-actions">
              <button className="btn" type="button" onClick={onCreateAccount}>Create Account</button>
              <button className="btn secondary dark-btn" type="button" onClick={onSignIn}>Sign In</button>
            </div>
            {status && <p className="form-message">{status}</p>}
          </div>
        ) : (
        <form className="form refzone-enrollment-form" method="post" action={`${API_URL}/refzone-enrollment-submit.php`} onSubmit={submitEnrollment}>
          <fieldset className="refzone-package-picker">
            <legend>Membership Package</legend>
            {refZoneMembershipPackages.map((membership) => (
              <label className={`refzone-summary-radio-card${selectedPackageId === membership.id ? ' selected' : ''}`} key={membership.id}>
                <input type="radio" name="package_id" value={membership.id} checked={selectedPackageId === membership.id} onChange={() => setSelectedPackageId(membership.id)} required />
                <span>
                  <strong>{membership.name}</strong>
                  <small>{membership.price} {membership.cadence}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="grid two">
            <label>Full Name<input name="full_name" defaultValue={accountName} autoComplete="name" required /></label>
            <label>Email Address<input type="email" name="email" defaultValue={user?.email || ''} autoComplete="email" readOnly required /></label>
          </div>
          <div className="grid two">
            <label>Phone Number<input type="tel" name="phone" defaultValue={accountPhone} inputMode="tel" autoComplete="tel" maxLength="14" onInput={formatPhoneFieldInput} required /></label>
            <label>Primary Course Track<select name="course_track" defaultValue="" required><option value="">Select course track</option>{refZoneCourseTracks.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
          </div>
          <div className="grid two">
            <label>Experience Level<select name="experience_level" defaultValue="" required><option value="">Select experience</option><option>New official</option><option>1-2 years</option><option>3-5 years</option><option>6-10 years</option><option>11+ years</option><option>College official</option></select></label>
            <label>Membership Goal<input name="membership_goal" placeholder="Example: Improve rules, advance levels, prepare for college" required /></label>
          </div>
          <label>What do you want RefZone University to help you improve?<textarea name="development_notes" rows="4" maxLength="1000" required></textarea></label>
          <fieldset className="rtbo-registration-payment refzone-payment-methods">
            <legend>Payment Method</legend>
            <small>Recurring monthly membership checkout</small>
            <label className={`refzone-summary-radio-card refzone-payment-card${paymentProvider === 'stripe' ? ' selected' : ''}`}>
              <input type="radio" name="payment_provider" value="stripe" checked={paymentProvider === 'stripe'} onChange={() => setPaymentProvider('stripe')} required />
              <span>Credit or Debit Card</span>
              <span className="rtbo-registration-payment-mini-logos" aria-label="Visa, Mastercard, American Express, and Discover"><PaymentLogo brand="visa" compact /><PaymentLogo brand="mastercard" compact /><PaymentLogo brand="amex" compact /><PaymentLogo brand="discover" compact /></span>
            </label>
            <label className={`refzone-summary-radio-card refzone-payment-card${paymentProvider === 'paypal' ? ' selected' : ''}`}>
              <input type="radio" name="payment_provider" value="paypal" checked={paymentProvider === 'paypal'} onChange={() => setPaymentProvider('paypal')} required />
              <PaymentLogo brand="paypal" />
            </label>
          </fieldset>
          <label className="refzone-terms-row">
            <input type="checkbox" name="membership_terms" value="Agree" required />
            <span>I understand this is a recurring monthly RefZone University membership and authorize secure checkout for the selected package.</span>
          </label>
          <button className="btn" type="submit">Continue to Membership Checkout</button>
          {status && <p className="form-message">{status}</p>}
        </form>
        )}
      </section>
    </section>
  );
}

function RegistrationGate({ onCreateAccount, onSignIn }) {
  return (
    <section className="rtbo-section rtbo-register-gate">
      <div className="rtbo-section-head">
        <p className="eyebrow">Account Required</p>
        <h2>Create an account before registering.</h2>
        <p>The RTBO school application is on its own secure page. Create an account or sign in first, then you can complete the application, upload your profile picture, generate the PDF, and continue to payment.</p>
      </div>
      <div className="button-row centered-actions">
        <button className="btn" type="button" onClick={onCreateAccount}>Create Account</button>
        <button className="btn secondary dark-btn" type="button" onClick={onSignIn}>Sign In</button>
      </div>
    </section>
  );
}

function RegistrationWaiverModal({ participantName = '', onClose }) {
  const waiverParticipantName = String(participantName || '').trim();

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="rtbo-modal-scrim rtbo-registration-waiver-scrim" role="presentation" onMouseDown={onClose}>
      <section className="rtbo-registration-waiver-modal" role="dialog" aria-modal="true" aria-labelledby="registration-waiver-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="rtbo-modal-close" type="button" aria-label="Close waiver form" onClick={onClose}>×</button>
        <div className="rtbo-registration-waiver-modal-head">
          <p className="eyebrow">Required Form</p>
          <h2 id="registration-waiver-title">Waiver & Indemnity</h2>
          <p>Review this required waiver before selecting the agreement option on the registration form.</p>
        </div>
        <div className="rtbo-registration-waiver-document">
          <section>
            <p>I <span className={`rtbo-registration-waiver-name${waiverParticipantName ? ' is-filled' : ''}`}>{waiverParticipantName || '_____________________'}</span>, the undersigned individual agree to obtain at my own expense and for my own benefit, disability, medical, hospitalization, and liability insurance coverage covering myself in such amount as I shall determine but in any event which shall be sufficient to cover and protect me from any and all injuries, damages, claims and losses which I might incur or for which I may be responsible during or as a result of my participation at the Raising the Bar Officiating Inc. School or Event, University of Arkansas at Pine Bluff, Central Arkansas University and University of Arkansas at Little Rock Team Camps no later than one week prior to the start of the school or event.</p>
            <p>I further hereby agree to hold harmless and indemnify Raising the Bar Officiating Inc., University of Arkansas at Pine Bluff, Central Arkansas University and University of Arkansas at Little Rock members, officers, employees, Conference Commissioners, Associate Conference Commissioners, Sports Information Directors, Athletic Directors, Assistant Athletic Directors, Head Coaches, Assistant Coaches, Athletic Trainers, The Arkansas Athletic Association, and the Arkansas Officials Association from any and all liability from any injuries, damages or loss sustained as a result of my action (or inactions) during or as a result of my participation at such school, camp, and in the performance of any officiating services, including without limitations, all claims for medical expenses which I may incur, or otherwise, due to my failure to obtain and/or maintain such appropriate insurance coverage.</p>
          </section>
        </div>
        <div className="rtbo-registration-waiver-modal-actions">
          <button className="btn" type="button" onClick={onClose}>Return to Registration</button>
        </div>
      </section>
    </div>
  );
}

function RegistrationWaiverRequiredModal({ onAccept, onClose }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="rtbo-modal-scrim rtbo-registration-waiver-scrim" role="presentation" onMouseDown={onClose}>
      <section className="rtbo-registration-waiver-modal rtbo-registration-waiver-required-modal" role="dialog" aria-modal="true" aria-labelledby="registration-waiver-required-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="rtbo-modal-close" type="button" aria-label="Close waiver notice" onClick={onClose}>×</button>
        <div className="rtbo-registration-waiver-modal-head">
          <p className="eyebrow">Waiver Required</p>
          <h2 id="registration-waiver-required-title">Acceptance Cannot Be Granted</h2>
          <p>Due to not accepting the terms and conditions of the waiver, your acceptance into the school cannot be granted.</p>
        </div>
        <div className="rtbo-registration-waiver-required-copy">
          <p>In order to enroll in the school you have selected, you must accept the terms and conditions of the waiver.</p>
        </div>
        <div className="rtbo-registration-waiver-modal-actions">
          <button className="btn secondary dark-btn" type="button" onClick={onClose}>Return to Form</button>
          <button className="btn" type="button" onClick={onAccept}>Accept Waiver</button>
        </div>
      </section>
    </div>
  );
}

function RegistrationForm({ user, active = 'register', setActive = () => {}, onOpenDashboard = () => {}, onOpenLogin = () => {} }) {
  const [status, setStatus] = useState('');
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [paymentProvider, setPaymentProvider] = useState('stripe');
  const [profilePhotoName, setProfilePhotoName] = useState('');
  const firstName = user?.first_name || splitName(user?.name).firstName;
  const lastName = user?.last_name || splitName(user?.name).lastName;
  const initialWaiverParticipantName = [firstName, lastName].filter(Boolean).join(' ');
  const registrationFormRef = useRef(null);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverRequiredModalOpen, setWaiverRequiredModalOpen] = useState(false);
  const [waiverAgreement, setWaiverAgreement] = useState('');
  const [waiverParticipantName, setWaiverParticipantName] = useState(initialWaiverParticipantName);
  const sessionChoices = sessions.map(([cardImage, icon, label, title, date, price]) => {
    const numericPrice = Number(String(price).replace(/[^0-9.]/g, '')) || 0;
    return {
      cardImage,
      icon,
      label,
      title,
      date,
      price,
      numericPrice,
      value: `${label}: ${title} - ${date}`
    };
  });
  const selectedSessionDetails = sessionChoices.filter(session => selectedSessions.includes(session.value));
  const selectedTotal = selectedSessionDetails.reduce((sum, session) => sum + session.numericPrice, 0);
  const registrationProcessingFee = selectedSessionDetails.length ? 9.5 : 0;
  const registrationGrandTotal = selectedTotal + registrationProcessingFee;
  const featuredSession = selectedSessionDetails[0] || sessionChoices[0];

  function navigateFromRegistration(page) {
    setActive(page);
  }

  function toggleSession(value) {
    setSelectedSessions(current => (
      current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
    ));
  }

  function readWaiverParticipantName() {
    const form = registrationFormRef.current;
    if (!form) return initialWaiverParticipantName;
    const formData = new FormData(form);
    const enteredName = [
      formData.get('first_name'),
      formData.get('last_name')
    ].map(value => String(value || '').trim()).filter(Boolean).join(' ');
    return enteredName || initialWaiverParticipantName;
  }

  function refreshWaiverParticipantName() {
    setWaiverParticipantName(readWaiverParticipantName());
  }

  function openWaiverModal() {
    setWaiverParticipantName(readWaiverParticipantName());
    setWaiverModalOpen(true);
  }

  function acceptWaiverFromModal() {
    setWaiverAgreement('agree');
    setWaiverRequiredModalOpen(false);
    setStatus('Waiver accepted. Continue completing your registration.');
    requestAnimationFrame(() => {
      document.querySelector('.rtbo-registration-waiver')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!selectedSessions.length) {
      setStatus('Please select at least one school session.');
      return;
    }
    if (waiverAgreement !== 'agree') {
      setStatus('');
      setWaiverRequiredModalOpen(true);
      return;
    }
    setStatus('Submitting application...');
    try {
      const data = await apiPost('/registration-submit.php', new FormData(event.currentTarget));
      if (data.redirect) window.location.href = data.redirect;
      setStatus(data.message || 'Application submitted.');
    } catch (error) {
      setStatus(error.message);
    }
  }
  return (
    <section className="rtbo-registration-page">
      <div className="rtbo-registration-shell-nav" aria-label="Registration page navigation">
        <button className="rtbo-registration-mini-brand" type="button" onClick={() => navigateFromRegistration('home')} aria-label="Raising The Bar Officiating home">
          <img src={image('logo.png')} alt="Raising The Bar Officiating logo" />
        </button>
        <nav>
          {navItems.map(([id, label]) => (
            <button className={(active === id || (active === 'register' && id === 'events')) ? 'active' : ''} key={id} type="button" onClick={() => navigateFromRegistration(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="rtbo-registration-nav-actions">
          <ThemeToggle className="registration-theme-toggle" />
          <button className="rtbo-registration-account-action" type="button" onClick={user ? onOpenDashboard : onOpenLogin}>{user ? 'Dashboard' : 'Login'}</button>
        </div>
      </div>
      <div className="rtbo-registration-hero">
        <div>
          <p className="eyebrow">Register For</p>
          <h1>Raising The Bar Officiating Training Schools</h1>
          <h2>Elite Officiating Training</h2>
          <p>Train with top clinicians, improve mechanics, enhance game management, and elevate your officiating career.</p>
          <div className="rtbo-registration-hero-points">
            <span>Elite clinicians</span>
            <span>Advance your career</span>
            <span>Network and grow</span>
          </div>
        </div>
        <img className="rtbo-registration-hero-logo" src={image('logo.png')} alt="Raising The Bar Officiating logo" />
        <aside className="rtbo-registration-spotlight">
          <img src={image(featuredSession.cardImage)} alt="" />
          <strong>{featuredSession.title}</strong>
          <small>{featuredSession.date}</small>
          <b>{featuredSession.price}</b>
          <span>{selectedSessionDetails.length ? 'Selected School' : 'Choose Your School'}</span>
        </aside>
      </div>
      <form className="form rtbo-registration-form" ref={registrationFormRef} onSubmit={submit}>
        <div className="rtbo-registration-steps" aria-label="Registration progress">
          {['Registration Info', 'Documents', 'Payment', 'Review & Confirm'].map((step, index) => (
            <span className={index === 0 ? 'active' : ''} key={step}><b>{index + 1}</b>{step}</span>
          ))}
        </div>
        <div className="rtbo-registration-layout">
          <div className="rtbo-registration-main">
            <section className="rtbo-registration-card">
              <h3>Personal Information</h3>
              <div className="grid three"><label>First Name<input name="first_name" defaultValue={firstName} onInput={refreshWaiverParticipantName} required /></label><label>Last Name<input name="last_name" defaultValue={lastName} onInput={refreshWaiverParticipantName} required /></label><label>Email Address<input type="email" name="email" defaultValue={user?.email || ''} required /></label></div>
              <div className="grid three"><label>Phone Number<input type="tel" name="phone" defaultValue={formatPhoneNumber(user?.phone || '')} onInput={formatPhoneFieldInput} inputMode="tel" autoComplete="tel" maxLength="14" required /></label><label>Address<input name="address_1" defaultValue={user?.address_line1 || ''} required /></label><label>Address Line 2<input name="address_2" defaultValue={user?.address_line2 || ''} /></label></div>
              <div className="grid four"><label>City<input name="city" defaultValue={user?.city || ''} required /></label><label>State<StateSelect defaultValue={user?.state || ''} required /></label><label>Zip Code<input name="zip" defaultValue={user?.zip || ''} required /></label><label>Date of Birth<input type="date" name="date_of_birth" /></label></div>
              <div className="grid two"><label>Sex<select name="sex" defaultValue={user?.sex || ''} required>{sexOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label><label>Race<select name="race" defaultValue={user?.race || ''}>{raceOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label></div>
            </section>
            <section className="rtbo-registration-card">
              <h3>Officiating Information</h3>
              <div className="grid three">
                <label>Years of Experience<select name="experience" defaultValue={user?.experience || ''} required><option value="">Select years</option><option>0-2 years</option><option>3-5 years</option><option>6-10 years</option><option>11+ years</option></select></label>
                <label>Current Certifications<select name="current_certifications" defaultValue=""><option value="">Select certifications</option><option>NFHS</option><option>NJCAA</option><option>NAIA</option><option>NCAA</option><option>Pro-Am</option></select></label>
                <label>Conferences Worked<select name="conference_select" defaultValue=""><option value="">Select conferences</option><option>High School</option><option>NJCAA</option><option>NAIA</option><option>NCAA DIII</option><option>NCAA DII</option><option>NCAA DI</option></select></label>
              </div>
              <div className="grid three">
                <label>Preferred Positions<select name="preferred_positions" defaultValue=""><option value="">Select positions</option><option>Referee</option><option>Umpire 1</option><option>Umpire 2</option><option>Any crew position</option></select></label>
                <label>Highest Level Worked<select name="highest_level_worked" defaultValue=""><option value="">Select level</option><option>High School</option><option>NJCAA</option><option>NAIA</option><option>NCAA DIII</option><option>NCAA DII</option><option>NCAA DI</option><option>Pro-Am</option></select></label>
                <label>Training School Goals<select name="training_school_goals" defaultValue=""><option value="">Select goals</option><option>Improve mechanics</option><option>Advance levels</option><option>Game management</option><option>Network with coordinators</option></select></label>
              </div>
              <fieldset className="rtbo-registration-levels"><legend>Level of Experience</legend>
                {['High School', 'NJCAA (JUCO)', 'NAIA (Women)', 'NAIA (Men)', 'NCAA DIII (Women)', 'NCAA DIII (Men)', 'NCAA DII (Women)', 'NCAA DII (Men)', 'NCAA DI (Women)', 'NCAA DI (Men)', 'Pro-Am (Women)', 'Pro-Am (Men)'].map((level) => <label key={level}><input type="checkbox" name="levels[]" value={level} /> {level}</label>)}
              </fieldset>
              <label>Conferences<textarea name="current_conferences" required /></label>
              <div className="grid two"><label>Recommended by anyone?<select name="referred"><option value="No">No</option><option value="Yes">Yes</option></select></label><label>Referral Name<input name="referral_name" /></label></div>
              <label>Goals<textarea name="goals" required /></label>
            </section>
            <section className="rtbo-registration-card">
              <h3>School Selection</h3>
              <div className="rtbo-registration-session-list">
                {sessionChoices.map(session => (
                  <label className={selectedSessions.includes(session.value) ? 'selected' : ''} key={session.value}>
                    <input type="checkbox" name="sessions[]" value={session.value} checked={selectedSessions.includes(session.value)} onChange={() => toggleSession(session.value)} />
                    <img src={image(session.icon)} alt="" />
                    <span><strong>{session.title}</strong><small>{session.date}</small></span>
                    <b>{session.price}</b>
                  </label>
                ))}
              </div>
            </section>
            <section className="rtbo-registration-card">
              <h3>Travel & Lodging Optional</h3>
              <div className="grid three"><label>Traveling From<input name="travel_from" placeholder="Enter city or airport" /></label><label>Arrival Date<input type="date" name="arrival_date" /></label><label>Departure Date<input type="date" name="departure_date" /></label></div>
              <div className="grid three"><label>Hotel Needed?<select name="hotel_needed" defaultValue=""><option value="">Select option</option><option>No</option><option>Yes</option></select></label><label>Roommate Request<input name="roommate_request" placeholder="Enter name or email" /></label><label>Special Requests<textarea name="special_requests" placeholder="Any special accommodations?" /></label></div>
            </section>
            <section className="rtbo-registration-card rtbo-registration-documents-card">
              <h3>Documents & Agreements</h3>
              <label className="rtbo-registration-upload-field">
                <span>Professional Profile Picture</span>
                <span className="rtbo-registration-upload-control">
                  <span className="rtbo-registration-upload-button">Upload Professional Profile Photo</span>
                  <span className="rtbo-registration-upload-name">{profilePhotoName || 'No profile photo selected'}</span>
                  <input className="rtbo-registration-file-input" type="file" name="profile_photo" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setProfilePhotoName(event.currentTarget.files?.[0]?.name || '')} />
                </span>
              </label>
              <RegistrationOneTimePaymentField />
              <fieldset className="rtbo-registration-waiver">
                <legend>Waiver Agreement</legend>
                <label className="rtbo-registration-waiver-option">
                  <input type="checkbox" name="waiver_agreement" value="Agree" checked={waiverAgreement === 'agree'} onChange={(event) => setWaiverAgreement(event.currentTarget.checked ? 'agree' : '')} aria-required="true" />
                  <span>I have read and DO agree with ALL the aforementioned items listed in the waiver.</span>
                </label>
                <label className="rtbo-registration-waiver-option">
                  <input
                    type="checkbox"
                    name="waiver_disagreement"
                    value="Disagree"
                    checked={waiverAgreement === 'disagree'}
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        setWaiverAgreement('disagree');
                        setWaiverRequiredModalOpen(true);
                      } else {
                        setWaiverAgreement('');
                      }
                    }}
                  />
                  <span>I have read and DO NOT agree with ALL the aforementioned items listed in the waiver.</span>
                </label>
                <button className="rtbo-registration-waiver-document-button" type="button" onClick={openWaiverModal}>View Required Waiver Form</button>
              </fieldset>
              <div className="grid two"><label>Official Printed Name<input name="printed_signature" required /></label><label>Actual Signature<input name="signature" required /></label></div>
            </section>
          </div>
          <aside className="rtbo-registration-summary">
            <h3>Registration Summary</h3>
            <div className="rtbo-registration-summary-school">
              <img src={image(featuredSession.cardImage)} alt="" />
              <span><strong>{featuredSession.title}</strong><small>{featuredSession.date}</small></span>
            </div>
            <dl>
              <div><dt>Registration Fee</dt><dd>${selectedTotal.toFixed(2)}</dd></div>
              <div><dt>Processing Fee</dt><dd>${registrationProcessingFee.toFixed(2)}</dd></div>
              <div className="total"><dt>Total</dt><dd>${registrationGrandTotal.toFixed(2)}</dd></div>
            </dl>
            <div className="rtbo-registration-secure-card">
              <span aria-hidden="true"></span>
              <div><strong>Secure Checkout</strong><small>Your payment information is encrypted and secure.</small></div>
            </div>
            <fieldset className="rtbo-registration-payment"><legend>Payment Methods</legend><small>We accept all major credit cards</small><label><input type="radio" name="payment_provider" value="stripe" checked={paymentProvider === 'stripe'} onChange={() => setPaymentProvider('stripe')} required /> <span>Credit or Debit Card</span><span className="rtbo-registration-payment-mini-logos" aria-label="Visa, Mastercard, American Express, and Discover"><PaymentLogo brand="visa" compact /><PaymentLogo brand="mastercard" compact /><PaymentLogo brand="amex" compact /><PaymentLogo brand="discover" compact /></span></label><label><input type="radio" name="payment_provider" value="paypal" checked={paymentProvider === 'paypal'} onChange={() => setPaymentProvider('paypal')} required /> <PaymentLogo brand="paypal" /></label></fieldset>
            <div className="rtbo-registration-payment-badges" aria-label="Supported checkout methods">
              <PaymentLogo brand="visa" />
              <PaymentLogo brand="mastercard" />
              <PaymentLogo brand="amex" />
              <PaymentLogo brand="discover" />
            </div>
            <div className="rtbo-registration-wallets" aria-label="Express checkout options">
              <button type="button" aria-label="Apple Pay"><PaymentLogo brand="apple-pay" /></button>
              <button type="button" aria-label="Google Pay"><PaymentLogo brand="google-pay" /></button>
            </div>
            <div className="rtbo-registration-card-divider"><span>Or pay with card</span></div>
            <div className="rtbo-registration-card-fields">
              <label>Card Number<input type="text" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" /></label>
              <div className="grid two"><label>Expiration Date<input type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" /></label><label>CVC<input type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" /></label></div>
              <label>Name on Card<input type="text" autoComplete="cc-name" placeholder="Enter name on card" /></label>
              <label>Country<select defaultValue="United States"><option>United States</option><option>Canada</option><option>Mexico</option></select></label>
              <label>Zip Code<input type="text" inputMode="numeric" autoComplete="postal-code" placeholder="12345" /></label>
              <div className="rtbo-registration-promo-row"><label>Promo Code<input type="text" placeholder="Enter promo code" /></label><button type="button">Apply Code</button></div>
            </div>
            <button className="btn registration-payment-button" type="submit">Continue to Payment</button>
            <p className="rtbo-registration-payment-note">You will be redirected to our secure payment processor.</p>
            {status && <p className="form-message">{status}</p>}
          </aside>
        </div>
        <div className="rtbo-registration-trust-row">
          {[
            ['Trusted by Thousands', 'Join 25,000+ officials nationwide.'],
            ['Top Level Training', 'NBA, NCAA, NFHS, and professional clinicians.'],
            ['Advance Your Career', 'Better training. Better opportunities.'],
            ['Secure & Reliable', 'Your data and payments are 100% secure.']
          ].map(([title, copy]) => (
            <article key={title}><span aria-hidden="true">+</span><strong>{title}</strong><small>{copy}</small></article>
          ))}
        </div>
        {waiverModalOpen && <RegistrationWaiverModal participantName={waiverParticipantName} onClose={() => setWaiverModalOpen(false)} />}
        {waiverRequiredModalOpen && (
          <RegistrationWaiverRequiredModal
            onAccept={acceptWaiverFromModal}
            onClose={() => setWaiverRequiredModalOpen(false)}
          />
        )}
      </form>
    </section>
  );
}

function ContactInfoIcon({ type }) {
  const icons = {
    home: (
      <path d="M4 11.2 12 4l8 7.2v8.1a.7.7 0 0 1-.7.7h-4.8v-5.8h-5V20H4.7a.7.7 0 0 1-.7-.7v-8.1Z" />
    ),
    mail: (
      <>
        <path d="M4 6.8h16v10.4H4z" />
        <path d="m4.5 7.3 7.5 6 7.5-6" />
      </>
    ),
    phone: (
      <path d="M7.3 4.8 10 7.5 8.6 9.4c.8 1.7 2.3 3.2 4 4l1.9-1.4 2.7 2.7-1.1 3.1c-.2.5-.7.8-1.2.7C9.6 17.7 6.3 14.4 5.5 9.1c-.1-.5.2-1 .7-1.2l1.1-3.1Z" />
    )
  };

  return (
    <span className="contact-info-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {icons[type]}
      </svg>
    </span>
  );
}

function Contact() {
  const [status, setStatus] = useState('');
  async function submit(event) {
    event.preventDefault();
    setStatus('Sending...');
    try {
      const data = await apiPost('/contact-submit.php', new FormData(event.currentTarget));
      setStatus(data.message || 'Message sent.');
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error.message);
    }
  }
  return (
    <section className="rtbo-section split contact-section">
      <div className="contact-info-panel">
        <p className="eyebrow">Let's Talk</p>
        <h2>Contact Us</h2>
        <p>Have questions about training schools, team camps, event assigning, registration, or Got U Nex Ref? Send a message and the RTBO team will follow up.</p>
        <div className="contact-info-list">
          <article>
            <ContactInfoIcon type="home" />
            <div>
              <span>Address</span>
              <strong>815 Technology Dr., Box 241445<br />Little Rock, AR</strong>
            </div>
          </article>
          <article>
            <ContactInfoIcon type="mail" />
            <div>
              <span>Email</span>
              <a href="mailto:admin@rtbofficiating.com">admin@rtbofficiating.com</a>
            </div>
          </article>
          <article>
            <ContactInfoIcon type="phone" />
            <div>
              <span>Phone</span>
              <a href="tel:+15012404961">(501) 240-4961</a>
            </div>
          </article>
        </div>
      </div>
      <form className="form contact-form panel pad" onSubmit={submit}>
        <div className="grid two"><label>First Name<input name="first_name" required /></label><label>Last Name<input name="last_name" required /></label></div>
        <div className="grid two"><label>Email<input type="email" name="email" required /></label><label>Phone<input type="tel" name="phone" onInput={formatPhoneFieldInput} inputMode="tel" autoComplete="tel" maxLength="14" required /></label></div>
        <label>Message<textarea name="message" required /></label>
        <button className="btn" type="submit">Send Message</button>
        {status && <p className="form-message">{status}</p>}
      </form>
    </section>
  );
}

function PasswordVisibilityIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.7 5.1c.4-.1.8-.1 1.3-.1 5.5 0 9 5.2 9 7 0 1-.9 2.5-2.4 3.8" />
          <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
          <path d="M6.5 6.8C4.3 8.3 3 10.8 3 12c0 1.8 3.5 7 9 7 1.6 0 3-.4 4.2-1" />
        </>
      ) : (
        <>
          <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function FieldError({ message }) {
  return message ? <small className="field-error" role="alert">{message}</small> : null;
}

function PasswordField({ label, className = '', error = '', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const fieldLabel = typeof label === 'string' ? label : 'password';

  return (
    <label className={`rtbo-password-field ${className}`.trim()}>
      {label}
      <span className="rtbo-password-input-wrap">
        <input {...inputProps} type={visible ? 'text' : 'password'} />
        <button
          className="rtbo-password-toggle"
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={`${visible ? 'Hide' : 'Show'} ${fieldLabel}`}
          aria-pressed={visible}
        >
          <PasswordVisibilityIcon visible={visible} />
        </button>
      </span>
      <FieldError message={error} />
    </label>
  );
}

const authAccountTypeOptions = [
  ['official', 'Official', 'Referees, umpires, and officials'],
  ['school_admin', 'School / League', 'Request officials and manage games'],
  ['vendor', 'Vendor', 'Provide services to schools and officials'],
  ['evaluator', 'Evaluator', 'Evaluate and develop game officials']
];

const authProviderOptions = [
  ['google', 'Google', 'G'],
  ['microsoft', 'Microsoft', 'M'],
  ['apple', 'Apple', 'A']
];

const authFeatureList = [
  ['Secure Platform', 'Protected account access for assignments, training, payments, and records.'],
  ['Real-Time Access', 'View schedule updates, messages, forms, and dashboard tools.'],
  ['Built For Officials', 'Everything needed to manage your officiating career in one place.']
];

const authRecoveryFeatureList = [
  ['Secure & Private', 'Your account recovery information stays encrypted and protected.'],
  ['Quick & Easy', 'Reset your password in a few clear steps.'],
  ['Need Help?', 'Support is available if your reset link does not arrive.']
];

function validateEmailAddress(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function validateAuthPassword(value = '') {
  const password = String(value || '');
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function base64UrlToArrayBuffer(value = '') {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function AuthShowcase({ activeMode }) {
  const isSignup = activeMode === 'signup';
  const isRecovery = activeMode === 'forgot' || activeMode === 'reset';
  const featureItems = isRecovery ? authRecoveryFeatureList : authFeatureList;
  const eyebrow = isSignup ? 'Create Your Access' : isRecovery ? 'Password Recovery' : 'Welcome Back';
  const heading = isSignup
    ? 'Join the RTBO officiating platform.'
    : isRecovery
      ? "We've got you. Let's get you back in."
      : 'Ready to elevate?';
  const copy = isSignup
    ? 'Create your account to access RTBO tools, training, messages, assignments, and services.'
    : isRecovery
      ? "No worries. Enter your email and we'll send you a secure link to reset your password."
      : 'Sign in to continue your officiating journey with the RTBO command center.';

  return (
    <aside className="rtbo-auth-showcase" aria-label="Raising The Bar Officiating account access">
      <div className="rtbo-auth-brand-lockup">
        <img src={image('logo.png')} alt="Raising The Bar Officiating logo" />
        <strong>We Will Serve, and Will Be Of Service To The Game.</strong>
      </div>
      <div className="rtbo-auth-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{heading}</h3>
        <p>{copy}</p>
      </div>
      <div className="rtbo-auth-feature-list">
        {featureItems.map(([title, copy]) => (
          <article key={title}>
            <span aria-hidden="true">{title.slice(0, 1)}</span>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="rtbo-auth-support">Need help? <a href="mailto:admin@rtbofficiating.com">Contact Support</a></p>
    </aside>
  );
}

function AccountModal({ mode = 'login', resetToken = '', onClose, onLogin, onResetTokenHandled = () => {} }) {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [account, setAccount] = useState({ role: 'official', first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '' });
  const [forgotPassword, setForgotPassword] = useState({ email: '' });
  const [resetPassword, setResetPassword] = useState({ new_password: '', confirm_password: '' });
  const [activeMode, setActiveMode] = useState(mode);
  const [status, setStatus] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActiveMode(mode);
    setStatus('');
    setFormErrors({});
  }, [mode]);

  function switchMode(nextMode) {
    if (activeMode === 'reset' && nextMode !== 'reset') {
      onResetTokenHandled();
    }
    if (nextMode === 'forgot') {
      setForgotPassword({ email: credentials.email });
    }
    setActiveMode(nextMode);
    setStatus('');
    setFormErrors({});
  }

  function update(event) {
    const { name, value } = event.target;
    setCredentials(current => ({ ...current, [name]: value }));
    if (formErrors[name]) setFormErrors(current => ({ ...current, [name]: '' }));
  }

  function updateAccount(event) {
    const { name, value } = event.target;
    setAccount(current => ({ ...current, [name]: formatFormFieldValue(name, value) }));
    if (formErrors[name]) setFormErrors(current => ({ ...current, [name]: '' }));
  }

  function updateForgotPassword(event) {
    const { name, value } = event.target;
    setForgotPassword(current => ({ ...current, [name]: value }));
    if (formErrors[name]) setFormErrors(current => ({ ...current, [name]: '' }));
  }

  function updateResetPassword(event) {
    const { name, value } = event.target;
    setResetPassword(current => ({ ...current, [name]: value }));
    if (formErrors[name]) setFormErrors(current => ({ ...current, [name]: '' }));
  }

  function chooseAccountRole(role) {
    setAccount(current => ({ ...current, role }));
    if (formErrors.role) setFormErrors(current => ({ ...current, role: '' }));
  }

  function validateLoginForm() {
    const errors = {};
    if (!validateEmailAddress(credentials.email)) errors.email = 'Enter a valid email address.';
    if (!credentials.password) errors.password = 'Enter your password.';
    return errors;
  }

  function validateSignupForm() {
    const errors = {};
    if (!account.role) errors.role = 'Select an account type.';
    if (!account.first_name.trim()) errors.first_name = 'Enter your first name.';
    if (!account.last_name.trim()) errors.last_name = 'Enter your last name.';
    if (!validateEmailAddress(account.email)) errors.email = 'Enter a valid email address.';
    if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(account.phone)) errors.phone = 'Enter a phone number as (xxx) xxx-xxxx.';
    if (!validateAuthPassword(account.password)) errors.password = 'Use at least 10 characters with uppercase, lowercase, number, and special character.';
    if (account.confirm_password !== account.password) errors.confirm_password = 'Passwords must match.';
    return errors;
  }

  function validateForgotForm() {
    return validateEmailAddress(forgotPassword.email) ? {} : { email: 'Enter a valid email address.' };
  }

  function validateResetForm() {
    const errors = {};
    if (!validateAuthPassword(resetPassword.new_password)) errors.new_password = 'Use at least 10 characters with uppercase, lowercase, number, and special character.';
    if (resetPassword.confirm_password !== resetPassword.new_password) errors.confirm_password = 'Passwords must match.';
    return errors;
  }

  function applyValidation(errors) {
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      setStatus('Please correct the highlighted fields.');
      return false;
    }
    setStatus('');
    return true;
  }

  async function submit(event) {
    event.preventDefault();
    if (!applyValidation(validateLoginForm())) return;
    const normalizedEmail = credentials.email.trim().toLowerCase();

    setStatus('Signing in...');
    setSubmitting(true);
    try {
      const data = await apiPostJson('/auth-login.php', {
        email: normalizedEmail,
        password: credentials.password,
        remember: rememberMe
      });
      onLogin(data.user);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreateAccount(event) {
    event.preventDefault();
    if (!applyValidation(validateSignupForm())) return;
    setStatus('Creating account...');
    setSubmitting(true);
    try {
      const data = await apiPostJson('/auth-register.php', {
        role: account.role,
        first_name: account.first_name.trim(),
        last_name: account.last_name.trim(),
        phone: account.phone,
        password: account.password,
        email: account.email.trim().toLowerCase()
      });
      onLogin(data.user);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendPasswordResetEmail(statusMessage = 'Sending reset instructions...') {
    if (!applyValidation(validateForgotForm())) return false;
    setStatus(statusMessage);
    setSubmitting(true);
    try {
      const data = await apiPostJson('/password-reset-request.php', {
        email: forgotPassword.email.trim().toLowerCase()
      });
      setStatus(data.message || 'If an account exists for that email, password reset instructions have been sent.');
      return true;
    } catch (error) {
      setStatus(error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForgotPassword(event) {
    event.preventDefault();
    await sendPasswordResetEmail();
  }

  async function resendResetEmail() {
    await sendPasswordResetEmail('Resending reset instructions...');
  }

  async function resetViaPhone() {
    if (!applyValidation(validateForgotForm())) return;
    setStatus('Sending phone reset instructions...');
    setSubmitting(true);
    try {
      const data = await apiPostJson('/password-reset-phone.php', {
        email: forgotPassword.email.trim().toLowerCase()
      });
      setStatus(data.message || 'If the account has a phone number, reset instructions have been sent by text.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function startProviderSignIn(provider) {
    const option = authProviderOptions.find(([value]) => value === provider);
    const providerLabel = option?.[1] || 'Provider';
    setStatus(`Opening ${providerLabel} sign in...`);
    setSubmitting(true);
    try {
      const data = await apiGet(`/auth-oauth-start.php?provider=${encodeURIComponent(provider)}`);
      if (data.authorization_url) {
        window.location.assign(data.authorization_url);
        return;
      }
      setStatus(data.message || `${providerLabel} sign in is not available right now.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function startPasskeySignIn() {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setStatus('Passkey sign-in is not supported by this browser.');
      return;
    }
    setStatus('Checking passkey availability...');
    setSubmitting(true);
    try {
      const data = await apiGet('/auth-passkey-options.php');
      const options = data.options || {};
      const allowCredentials = Array.isArray(options.allowCredentials)
        ? options.allowCredentials.map(item => ({
          ...item,
          id: base64UrlToArrayBuffer(item.id)
        }))
        : [];
      await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: base64UrlToArrayBuffer(options.challenge),
          allowCredentials
        }
      });
      setStatus('Passkey challenge completed. Server verification must be enabled before account access is granted.');
    } catch (error) {
      setStatus(error.message || 'Passkey sign-in was canceled.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitResetPassword(event) {
    event.preventDefault();
    if (!applyValidation(validateResetForm())) return;
    if (!resetToken) {
      setStatus('This password reset link is missing its secure token.');
      return;
    }
    setStatus('Resetting password...');
    setSubmitting(true);
    try {
      const data = await apiPostJson('/password-reset-complete.php', {
        token: resetToken,
        new_password: resetPassword.new_password,
        confirm_password: resetPassword.confirm_password
      });
      setResetPassword({ new_password: '', confirm_password: '' });
      onResetTokenHandled();
      setActiveMode('login');
      setStatus(data.message || 'Your password has been reset. You can sign in with your new password.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const modalTitle = activeMode === 'signup'
    ? 'Create Account'
    : activeMode === 'forgot'
      ? 'Reset Password'
      : activeMode === 'reset'
        ? 'Create New Password'
        : 'Sign In';
  const modalCopy = activeMode === 'signup'
    ? 'Create your RTBO account first. Then your registration form will open on its own secure page.'
    : activeMode === 'forgot'
      ? 'Enter your account email and we will send you a secure password reset link.'
      : activeMode === 'reset'
        ? 'Enter a new password for your RTBO account. Password reset links expire after 60 minutes.'
        : 'Sign in to continue to your dashboard or complete your RTBO school registration.';
  const showAccountTabs = ['signup', 'login'].includes(activeMode);
  const isSignup = activeMode === 'signup';
  const isRecovery = activeMode === 'forgot' || activeMode === 'reset';
  const stepLabels = isSignup
    ? ['Create Account', 'Verify Email', 'Profile Setup', 'Complete']
    : ['Request Reset', 'Verify Email', 'Reset Password', 'Complete'];
  const activeStepIndex = isRecovery && activeMode === 'reset' ? 2 : 0;
  const modalViewClass = isSignup ? 'signup-view' : isRecovery ? 'forgot-view' : 'signin-view';
  const passwordHelp = (
    <div className="rtbo-auth-password-rules" aria-label="Password requirements">
      <span className={account.password.length >= 10 ? 'met' : ''}>At least 10 characters</span>
      <span className={/[A-Z]/.test(account.password) ? 'met' : ''}>One uppercase letter</span>
      <span className={/\d/.test(account.password) ? 'met' : ''}>One number</span>
      <span className={/[^A-Za-z0-9]/.test(account.password) ? 'met' : ''}>One special character</span>
    </div>
  );

  return (
    <div className="rtbo-modal-scrim rtbo-auth-modal-scrim" onMouseDown={onClose}>
      <section className={`rtbo-account-modal ${modalViewClass}`} role="dialog" aria-modal="true" aria-labelledby="rtbo-login-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="rtbo-modal-close" type="button" aria-label="Close account modal" onClick={onClose}>x</button>
        <AuthShowcase activeMode={activeMode} />
        <div className="rtbo-auth-form-panel">
          {(isSignup || isRecovery) && (
            <div className="rtbo-auth-steps" aria-label={isSignup ? 'Create account progress' : 'Password reset progress'}>
              {stepLabels.map((step, index) => (
                <span className={index === activeStepIndex ? 'active' : ''} key={step}><b>{index + 1}</b>{step}</span>
              ))}
            </div>
          )}
          <div className="rtbo-auth-heading">
            <p className="eyebrow">Account Access</p>
            <h2 id="rtbo-login-title">{modalTitle}</h2>
            <p>{modalCopy}</p>
          </div>
          {showAccountTabs && (
            <div className="account-mode-tabs" role="tablist" aria-label="Account access options">
              <button className={activeMode === 'signup' ? 'active' : ''} type="button" onClick={() => switchMode('signup')}>Create Account</button>
              <button className={activeMode === 'login' ? 'active' : ''} type="button" onClick={() => switchMode('login')}>Sign In</button>
            </div>
          )}
          {activeMode === 'signup' ? (
            <form className="form rtbo-login-form rtbo-signup-form" onSubmit={submitCreateAccount} noValidate>
              <div className="rtbo-auth-role-wrap">
                <span>I am a:</span>
                <div className="rtbo-auth-role-grid" role="radiogroup" aria-label="Account type">
                  {authAccountTypeOptions.map(([value, title, copy]) => (
                    <button className={account.role === value ? 'active' : ''} type="button" role="radio" aria-checked={account.role === value} key={value} onClick={() => chooseAccountRole(value)}>
                      <strong>{title}</strong>
                      <small>{copy}</small>
                    </button>
                  ))}
                </div>
                <FieldError message={formErrors.role} />
              </div>
              <div className="grid two">
                <label>First Name<input name="first_name" value={account.first_name} onChange={updateAccount} autoComplete="given-name" aria-invalid={Boolean(formErrors.first_name)} required /><FieldError message={formErrors.first_name} /></label>
                <label>Last Name<input name="last_name" value={account.last_name} onChange={updateAccount} autoComplete="family-name" aria-invalid={Boolean(formErrors.last_name)} required /><FieldError message={formErrors.last_name} /></label>
              </div>
              <div className="grid two">
                <label>Email Address<input type="email" name="email" value={account.email} onChange={updateAccount} autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(formErrors.email)} required /><FieldError message={formErrors.email} /></label>
                <label>Phone Number<input type="tel" name="phone" value={account.phone} onChange={updateAccount} inputMode="tel" autoComplete="tel" maxLength="14" placeholder="(555) 123-4567" aria-invalid={Boolean(formErrors.phone)} required /><FieldError message={formErrors.phone} /></label>
              </div>
              <div className="grid two">
                <PasswordField label="Password" name="password" value={account.password} onChange={updateAccount} minLength="10" autoComplete="new-password" aria-invalid={Boolean(formErrors.password)} error={formErrors.password} required />
                <PasswordField label="Confirm Password" name="confirm_password" value={account.confirm_password} onChange={updateAccount} minLength="10" autoComplete="new-password" aria-invalid={Boolean(formErrors.confirm_password)} error={formErrors.confirm_password} required />
              </div>
              {passwordHelp}
              {status && <p className="form-message" role="status">{status}</p>}
              <div className="button-row">
                <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Creating Account...' : 'Create Account'}</button>
              </div>
              <p className="rtbo-auth-switch-copy">Already have an account? <button className="account-link-button" type="button" onClick={() => switchMode('login')}>Sign In</button></p>
            </form>
          ) : activeMode === 'forgot' ? (
            <form className="form rtbo-login-form" onSubmit={submitForgotPassword} noValidate>
              <p className="password-reset-note">Enter the email address associated with your account and we'll send you a link to reset your password.</p>
              <label>Email Address<input type="email" name="email" value={forgotPassword.email} onChange={updateForgotPassword} autoComplete="email" placeholder="Enter your email address" aria-invalid={Boolean(formErrors.email)} required /><FieldError message={formErrors.email} /></label>
              {status && <p className="form-message" role="status">{status}</p>}
              <div className="button-row">
                <button className="btn rtbo-auth-primary-btn" type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send Reset Link'}</button>
                <button className="btn secondary dark-btn" type="button" onClick={() => switchMode('login')}>Back to Sign In</button>
              </div>
              <div className="rtbo-auth-separator compact"><span>OR</span></div>
              <button className="rtbo-auth-phone-reset" type="button" onClick={resetViaPhone} disabled={submitting}>Reset via Phone Number</button>
              <div className="rtbo-auth-resend-card">
                <span aria-hidden="true">L</span>
                <div>
                  <strong>Didn't receive the email?</strong>
                  <small>Check your spam folder or try again.</small>
                </div>
                <button type="button" onClick={resendResetEmail} disabled={submitting}>Resend Email</button>
              </div>
            </form>
          ) : activeMode === 'reset' ? (
            <form className="form rtbo-login-form" onSubmit={submitResetPassword} noValidate>
              <PasswordField label="New Password" name="new_password" value={resetPassword.new_password} onChange={updateResetPassword} minLength="10" autoComplete="new-password" aria-invalid={Boolean(formErrors.new_password)} error={formErrors.new_password} required />
              <PasswordField label="Confirm New Password" name="confirm_password" value={resetPassword.confirm_password} onChange={updateResetPassword} minLength="10" autoComplete="new-password" aria-invalid={Boolean(formErrors.confirm_password)} error={formErrors.confirm_password} required />
              {status && <p className="form-message" role="status">{status}</p>}
              <div className="button-row">
                <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Resetting...' : 'Reset Password'}</button>
                <button className="btn secondary dark-btn" type="button" onClick={() => switchMode('login')}>Back to Sign In</button>
              </div>
            </form>
          ) : (
            <form className="form rtbo-login-form" onSubmit={submit} noValidate>
              <label>Email Address<input type="email" name="email" value={credentials.email} onChange={update} autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(formErrors.email)} required /><FieldError message={formErrors.email} /></label>
              <PasswordField label="Password" name="password" value={credentials.password} onChange={update} autoComplete="current-password" aria-invalid={Boolean(formErrors.password)} error={formErrors.password} required />
              <div className="account-helper-actions">
                <label className="rtbo-auth-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />Remember Me</label>
                <button className="account-link-button" type="button" onClick={() => switchMode('forgot')}>Forgot Password?</button>
              </div>
              {status && <p className="form-message" role="status">{status}</p>}
              <div className="button-row">
                <button className="btn rtbo-auth-primary-btn" type="submit" disabled={submitting}>{submitting ? 'Signing In...' : 'Sign In'}</button>
              </div>
              <div className="rtbo-auth-separator"><span>OR CONTINUE WITH</span></div>
              <div className="rtbo-auth-provider-grid" aria-label="Continue with another sign-in provider">
                {authProviderOptions.map(([provider, label, icon]) => (
                  <button type="button" key={provider} onClick={() => startProviderSignIn(provider)} disabled={submitting}>
                    <span className={`rtbo-auth-provider-icon ${provider}`} aria-hidden="true">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
              <button className="rtbo-passkey-card" type="button" onClick={startPasskeySignIn} disabled={submitting}>
                <span className="rtbo-passkey-icon" aria-hidden="true">P</span>
                <span>
                  <strong>Sign in with Passkey</strong>
                  <small>Use your device passkey for a faster and more secure sign in.</small>
                </span>
                <b aria-hidden="true">&gt;</b>
              </button>
              <p className="rtbo-auth-recaptcha">
                This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</a> apply.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function CrudPanel({ title, description, fields, records, onAdd, onUpdate, onDelete, readOnly = false }) {
  const emptyForm = () => Object.fromEntries(fields.map((field, index) => [`field${index}`, '']));
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing === null) await onAdd(form);
      else await onUpdate(editing, form);
      setForm(emptyForm());
      setEditing(null);
    } catch (caught) {
      setError(caught.message || 'This dashboard action could not be completed.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(index) {
    setForm(records[index]);
    setEditing(index);
  }

  function createNewForm() {
    setForm(emptyForm());
    setEditing(null);
  }

  async function deleteForm() {
    setSaving(true);
    setError('');
    try {
      if (editing !== null) {
        await onDelete(editing);
        setEditing(null);
      } else if (records.length) {
        await onDelete(records.length - 1);
      }
      setForm(emptyForm());
    } catch (caught) {
      setError(caught.message || 'This dashboard action could not be completed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rtbo-dashboard-card rtbo-crud-panel">
      <div className="rtbo-dashboard-card-head">
        <div><h3>{title}</h3><p>{description}</p></div>
        {!readOnly && <div className="rtbo-form-toolbar">
          <button className="btn" type="button" onClick={createNewForm} disabled={saving}>Create New Form</button>
          <button className="btn secondary dark-btn danger-action" type="button" onClick={deleteForm} disabled={saving}>Delete Form</button>
        </div>}
      </div>
      {!readOnly && <form className="rtbo-crud-form" onSubmit={submit}>
        {fields.map((field, index) => <label key={field}>{field}<input name={`field${index}`} value={form[`field${index}`] || ''} onChange={update} placeholder={field} /></label>)}
        <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : editing === null ? 'Save Form' : 'Update Form'}</button>
      </form>}
      {error && <p className="form-message error">{error}</p>}
      <div className="rtbo-crud-table">
        <div className="rtbo-crud-row head">{fields.map(field => <span key={field}>{field}</span>)}{!readOnly && <span>Actions</span>}</div>
        {records.map((record, index) => (
          <div className="rtbo-crud-row" key={`${title}-${index}`}>
            {fields.map((field, fieldIndex) => <span key={field}>{record[`field${fieldIndex}`] || '-'}</span>)}
            {!readOnly && <span className="rtbo-table-actions"><button type="button" onClick={() => startEdit(index)}>Edit</button><button type="button" onClick={() => onDelete(index)}>Delete</button></span>}
          </div>
        ))}
      </div>
    </article>
  );
}

const emptyCompletedForms = {
  officials: [],
  evaluators: [],
  observers: []
};

const completedFormsWidgets = [
  {
    key: 'officials',
    section: 'completedOfficialForms',
    eyebrow: 'Officials',
    title: 'Official Game Reports',
    description: 'Completed game reports submitted by officials.'
  },
  {
    key: 'evaluators',
    section: 'completedEvaluatorForms',
    eyebrow: 'Evaluators',
    title: 'Evaluator Evaluations',
    description: 'Completed evaluation forms submitted by evaluators.'
  },
  {
    key: 'observers',
    section: 'completedObserverForms',
    eyebrow: 'Observers',
    title: 'Observer Forms',
    description: 'Completed observer forms submitted by observers.'
  }
];

function normalizeCompletedFormsPayload(data = {}) {
  const forms = data.completed_forms || {};
  return {
    officials: Array.isArray(forms.officials) ? forms.officials : [],
    evaluators: Array.isArray(forms.evaluators) ? forms.evaluators : [],
    observers: Array.isArray(forms.observers) ? forms.observers : []
  };
}

function completedFormsLatestLabel(records = []) {
  const latest = records.find(record => record.created_at || record.game_date);
  if (!latest) {
    return 'No submissions yet';
  }
  if (latest.created_at) {
    return `Newest ${formatNotificationTimestamp(latest.created_at)}`;
  }

  return `Newest ${formatGameDate(latest.game_date)}`;
}

function completedFormDisplayDate(value = '') {
  return value ? formatGameDate(value) : 'Date pending';
}

function completedFormScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) {
    return '';
  }

  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function completedFormRows(type, record = {}) {
  if (type === 'officials') {
    return [
      ['Submitted By', emptyLabel(record.official_name, 'Official pending')],
      ['Game Date', completedFormDisplayDate(record.game_date)],
      ['Game Site', emptyLabel(record.game_site, 'Game site pending')],
      ['Level', emptyLabel(record.game_level, 'Level pending')],
      ['Matchup', emptyLabel(record.title, 'Matchup pending')],
      ['Final Score', emptyLabel(record.final_score, 'Score pending')],
      ['Rule Set', emptyLabel(record.rule_set, 'Rule set pending')],
      ['Table Performance', emptyLabel(record.table_performance, 'Not entered')],
      ['Dressing Room', emptyLabel(record.dressing_room_condition, 'Not entered')],
      ['Submitted', formatNotificationTimestamp(record.created_at)]
    ];
  }

  if (type === 'evaluators') {
    const score = completedFormScore(record.total_score);
    const percentage = completedFormScore(record.percentage_score);
    return [
      ['Evaluator', emptyLabel(record.evaluator_name, 'Evaluator pending')],
      ['Official', emptyLabel(record.official_name, 'Official pending')],
      ['Game Date', completedFormDisplayDate(record.game_date)],
      ['Location', emptyLabel(record.location, 'Location pending')],
      ['Matchup', emptyLabel([record.visiting_team, record.home_team].filter(Boolean).join(' at '), 'Matchup pending')],
      ['Level', emptyLabel(record.level, 'Level pending')],
      ['Type', formatLabel(record.evaluation_type || 'regular_season')],
      ['Game Type', record.game_type ? formatLabel(record.game_type) : 'Not selected'],
      ['Score', score && percentage ? `${score} / ${percentage}%` : emptyLabel(score || percentage, 'Score pending')],
      ['Ranking', emptyLabel(record.ranking_label, 'Ranking pending')],
      ['Submitted', formatNotificationTimestamp(record.created_at)]
    ];
  }

  const score = completedFormScore(record.final_score);
  return [
    ['Observer', emptyLabel(record.observer_name, 'Observer pending')],
    ['Observation Type', formatLabel(record.observation_type || 'live_game')],
    ['Game Date', completedFormDisplayDate(record.game_date)],
    ['Game Site', emptyLabel(record.game_site, 'Game site pending')],
    ['Level', emptyLabel(record.game_level, 'Level pending')],
    ['Matchup', emptyLabel(record.title, 'Matchup pending')],
    ['Crew Chief', emptyLabel(record.crew_chief, 'Crew chief pending')],
    ['Final Score', emptyLabel(score, 'Score pending')],
    ['Crew Ranking', emptyLabel(record.crew_ranking, 'Ranking pending')],
    ['Submitted', formatNotificationTimestamp(record.created_at)]
  ];
}

function completedFormNotes(type, record = {}) {
  if (type === 'officials') {
    const incidents = Array.isArray(record.incidents) ? record.incidents : [];
    return [
      ['Notes', record.notes],
      ['Incidents', incidents.length ? incidents.map(item => [item.type, item.player, item.team, item.time, item.description].filter(Boolean).join(' / ')).join('\n') : '']
    ].filter(([, value]) => String(value || '').trim() !== '');
  }

  if (type === 'evaluators') {
    return [
      ['Strengths', record.strengths],
      ['Areas For Improvement', record.improvements],
      ['Recommendation', record.recommendation],
      ['Comments For Admin', record.comments_to_admin],
      ['Comments For Official', record.comments_to_official]
    ].filter(([, value]) => String(value || '').trim() !== '');
  }

  return [
    ['Strengths', record.strengths],
    ['Concerns', record.concerns],
    ['Recommendations', record.recommendations],
    ['Follow Up', record.follow_up]
  ].filter(([, value]) => String(value || '').trim() !== '');
}

function FormsWorkspaceHome({ completedForms = emptyCompletedForms, loading = false, error = '', onOpen, onRefresh }) {
  return (
    <section className="rtbo-dashboard-card rtbo-forms-workspace-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Forms Workspace</p>
          <h3>Completed Forms</h3>
          <p>Open completed form submissions from officials, evaluators, and observers in this main workspace window.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Forms'}
          </button>
        </div>
      </div>

      {error && <p className="form-message error">{error}</p>}

      <div className="rtbo-completed-form-widget-grid" aria-label="Completed forms by submitter type">
        {completedFormsWidgets.map(widget => {
          const records = completedForms[widget.key] || [];
          return (
            <button
              className="rtbo-completed-form-widget"
              type="button"
              key={widget.key}
              onClick={() => onOpen(widget.section)}
              aria-label={`Open ${widget.title}`}
            >
              <span className="eyebrow">{widget.eyebrow}</span>
              <strong>{records.length}</strong>
              <span className="rtbo-completed-widget-title">{widget.title}</span>
              <small>{widget.description}</small>
              <b>{completedFormsLatestLabel(records)}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CompletedFormsView({ type, eyebrow, title, description, records = [], loading = false, error = '', onBack, onRefresh }) {
  return (
    <section className="rtbo-dashboard-card rtbo-completed-forms-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={onBack}>Back to Forms</button>
          <button className="btn" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="form-message error">{error}</p>}
      {loading && <p className="rtbo-empty-state">Loading completed forms...</p>}
      {!loading && records.length === 0 && <p className="rtbo-empty-state">No completed forms have been submitted for this group yet.</p>}

      <div className="rtbo-completed-form-list">
        {records.map((record, index) => {
          const notes = completedFormNotes(type, record);
          return (
            <article className="rtbo-completed-form-card" key={`${type}-${record.id || index}`}>
              <div className="rtbo-completed-form-card-head">
                <div>
                  <span>{record.created_at ? formatNotificationTimestamp(record.created_at) : completedFormDisplayDate(record.game_date)}</span>
                  <h4>{emptyLabel(record.title || record.official_name || record.observer_name, 'Completed form')}</h4>
                </div>
                <button className="btn secondary dark-btn" type="button" onClick={onBack}>Back to Forms</button>
              </div>

              <dl className="rtbo-completed-form-details">
                {completedFormRows(type, record).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              {notes.length > 0 && (
                <div className="rtbo-completed-form-notes">
                  {notes.map(([label, value]) => (
                    <section key={label}>
                      <h5>{label}</h5>
                      <p>{String(value || '').split('\n').map((line, lineIndex) => (
                        <Fragment key={`${label}-${lineIndex}`}>
                          {line}
                          {lineIndex < String(value || '').split('\n').length - 1 && <br />}
                        </Fragment>
                      ))}</p>
                    </section>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const paymentPayerTypeOptions = [
  ['school', 'School'],
  ['organization', 'Organization'],
  ['tournament_director', 'Tournament Director'],
  ['conference', 'Conference'],
  ['event_center', 'Event Center'],
  ['other', 'Other']
];

const paymentMethodOptions = [
  ['stripe_checkout', 'Card / ACH via Stripe Checkout'],
  ['ach_bank_transfer', 'ACH Bank Transfer'],
  ['check', 'Check'],
  ['wire', 'Wire Transfer'],
  ['cash', 'Cash'],
  ['other', 'Other']
];

const incomingPaymentStatusOptions = [
  ['pending', 'Pending'],
  ['sent', 'Sent'],
  ['paid', 'Paid'],
  ['failed', 'Failed'],
  ['void', 'Void']
];

const directDepositStatusOptions = [
  ['not_configured', 'Not Configured'],
  ['onboarding_needed', 'Onboarding Needed'],
  ['pending_verification', 'Pending Verification'],
  ['ready', 'Ready'],
  ['disabled', 'Disabled']
];

const officialPayoutStatusOptions = [
  ['queued', 'Queued'],
  ['approved', 'Approved'],
  ['paid', 'Paid'],
  ['void', 'Void']
];

function createIncomingPaymentForm() {
  return {
    payer_type: 'school',
    payer_name: '',
    contact_name: '',
    email: '',
    phone: '',
    description: '',
    amount: '',
    due_date: new Date().toISOString().slice(0, 10),
    payment_method: 'stripe_checkout',
    status: 'pending',
    create_checkout: true
  };
}

function createPaymentAccountForm() {
  return {
    official_id: '',
    direct_deposit_status: 'not_configured',
    payout_method: 'stripe_connect',
    stripe_account_id: '',
    bank_last4: '',
    routing_last4: '',
    notes: ''
  };
}

function createOfficialPayoutForm() {
  return {
    official_id: '',
    amount: '',
    service_date: new Date().toISOString().slice(0, 10),
    event_name: '',
    description: '',
    status: 'queued'
  };
}

function paymentAmount(cents = 0) {
  return money(Number(cents || 0) / 100);
}

function paymentFormAmount(value = '') {
  const amount = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function PaymentSystem({ user, onStatus = () => {} }) {
  const [paymentData, setPaymentData] = useState({
    incoming_payments: [],
    official_accounts: [],
    official_payouts: [],
    officials: [],
    summary: {},
    stripe_configured: false,
    direct_deposit_note: ''
  });
  const [incomingForm, setIncomingForm] = useState(createIncomingPaymentForm);
  const [accountForm, setAccountForm] = useState(createPaymentAccountForm);
  const [payoutForm, setPayoutForm] = useState(createOfficialPayoutForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  async function loadPayments(message = '') {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/admin-payments.php');
      setPaymentData({
        incoming_payments: data.incoming_payments || [],
        official_accounts: data.official_accounts || [],
        official_payouts: data.official_payouts || [],
        officials: data.officials || [],
        summary: data.summary || {},
        stripe_configured: Boolean(data.stripe_configured),
        direct_deposit_note: data.direct_deposit_note || ''
      });
      if (message) {
        setPaymentStatus(message);
      }
    } catch (caught) {
      const messageText = caught.message || 'Payment system could not be loaded.';
      setError(messageText);
      onStatus(messageText);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  function applyPaymentResponse(data, fallbackMessage) {
    setPaymentData({
      incoming_payments: data.incoming_payments || [],
      official_accounts: data.official_accounts || [],
      official_payouts: data.official_payouts || [],
      officials: data.officials || paymentData.officials || [],
      summary: data.summary || {},
      stripe_configured: Boolean(data.stripe_configured),
      direct_deposit_note: data.direct_deposit_note || paymentData.direct_deposit_note || ''
    });
    setPaymentStatus(data.message || fallbackMessage);
    onStatus(data.message || fallbackMessage);
  }

  async function runPaymentAction(payload, fallbackMessage) {
    setSaving(true);
    setError('');
    setPaymentStatus('');
    try {
      const data = await apiPostJson('/admin-payments.php', payload);
      applyPaymentResponse(data, fallbackMessage);
      return data;
    } catch (caught) {
      const messageText = caught.message || 'Payment action could not be completed.';
      setError(messageText);
      onStatus(messageText);
      return null;
    } finally {
      setSaving(false);
    }
  }

  function updateIncomingForm(event) {
    const { name, value, type, checked } = event.target;
    setIncomingForm(current => ({
      ...current,
      [name]: type === 'checkbox' ? checked : name === 'phone' ? formatPhoneNumber(value) : value,
      ...(name === 'payment_method' ? { create_checkout: value === 'stripe_checkout' ? current.create_checkout : false } : {})
    }));
  }

  function updateAccountForm(event) {
    const { name, value } = event.target;
    if (name === 'official_id') {
      const existing = paymentData.official_accounts.find(account => String(account.official_id) === String(value));
      setAccountForm(existing ? {
        official_id: String(existing.official_id || ''),
        direct_deposit_status: existing.direct_deposit_status || 'not_configured',
        payout_method: existing.payout_method || 'stripe_connect',
        stripe_account_id: existing.stripe_account_id || '',
        bank_last4: existing.bank_last4 || '',
        routing_last4: existing.routing_last4 || '',
        notes: existing.notes || ''
      } : { ...createPaymentAccountForm(), official_id: value });
      return;
    }
    setAccountForm(current => ({
      ...current,
      [name]: ['bank_last4', 'routing_last4'].includes(name) ? value.replace(/\D+/g, '').slice(0, 4) : value
    }));
  }

  function updatePayoutForm(event) {
    const { name, value } = event.target;
    setPayoutForm(current => ({ ...current, [name]: value }));
  }

  async function submitIncomingPayment(event) {
    event.preventDefault();
    const data = await runPaymentAction({
      action: 'create_incoming_payment',
      record: {
        ...incomingForm,
        amount: paymentFormAmount(incomingForm.amount)
      }
    }, 'Incoming payment saved.');
    if (data?.success) {
      setIncomingForm(createIncomingPaymentForm());
    }
  }

  async function submitPaymentAccount(event) {
    event.preventDefault();
    const data = await runPaymentAction({ action: 'save_official_payment_account', record: accountForm }, 'Official direct deposit setup saved.');
    if (data?.success) {
      setAccountForm(createPaymentAccountForm());
    }
  }

  async function submitOfficialPayout(event) {
    event.preventDefault();
    const data = await runPaymentAction({
      action: 'create_official_payout',
      record: {
        ...payoutForm,
        amount: paymentFormAmount(payoutForm.amount)
      }
    }, 'Official payout saved.');
    if (data?.success) {
      setPayoutForm(createOfficialPayoutForm());
    }
  }

  function updateIncomingStatus(id, status) {
    runPaymentAction({ action: 'update_incoming_status', id, status }, 'Incoming payment updated.');
  }

  function updatePayoutStatus(id, status) {
    runPaymentAction({ action: 'update_official_payout_status', id, status }, 'Official payout updated.');
  }

  function deleteIncomingPayment(id) {
    if (window.confirm('Delete this incoming payment record?')) {
      runPaymentAction({ action: 'delete_incoming_payment', id }, 'Incoming payment deleted.');
    }
  }

  function deleteOfficialPayout(id) {
    if (window.confirm('Delete this official payout record?')) {
      runPaymentAction({ action: 'delete_official_payout', id }, 'Official payout deleted.');
    }
  }

  function sendDirectDeposit(payout) {
    const amount = paymentAmount(payout.amount_cents);
    if (window.confirm(`Send ${amount} by direct deposit to ${payout.official_name}? This creates a Stripe Connect transfer.`)) {
      runPaymentAction({ action: 'send_direct_deposit', id: payout.id }, 'Direct deposit transfer sent.');
    }
  }

  function accountForOfficial(officialId) {
    return paymentData.official_accounts.find(account => String(account.official_id) === String(officialId)) || null;
  }

  const summary = paymentData.summary || {};
  const canSendDirectDeposit = isSuperAdminUser(user);

  return (
    <section className="rtbo-dashboard-card rtbo-payment-system-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Payment System</p>
          <h3>Payments</h3>
          <p>Receive payments from schools, organizations, tournament directors, and partners, then manage direct-deposit payouts for officials.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={() => loadPayments('Payment system refreshed.')} disabled={loading || saving}>
            {loading ? 'Refreshing...' : 'Refresh Payments'}
          </button>
        </div>
      </div>

      <div className="rtbo-payment-alert">
        <strong>Security Rule</strong>
        <span>{paymentData.direct_deposit_note || 'Use processor-hosted onboarding for bank details. Do not store full account or routing numbers in RTBO.'}</span>
      </div>

      {!paymentData.stripe_configured && (
        <p className="form-message error">Stripe is not configured yet. Add `STRIPE_SECRET_KEY` in `api/.env` before hosted checkout or direct deposit transfers can run.</p>
      )}
      {error && <p className="form-message error">{error}</p>}
      {paymentStatus && <p className="form-message">{paymentStatus}</p>}

      <div className="rtbo-payment-summary-grid">
        <article><span>Receivable Balance</span><strong>{paymentAmount(summary.receivable_cents)}</strong></article>
        <article><span>Collected</span><strong>{paymentAmount(summary.collected_cents)}</strong></article>
        <article><span>Queued Official Pay</span><strong>{paymentAmount(summary.queued_payout_cents)}</strong></article>
        <article><span>Direct Deposit Ready</span><strong>{summary.ready_direct_deposit_officials || 0}</strong></article>
      </div>

      <div className="rtbo-payment-workspace-grid">
        <form className="form rtbo-payment-panel" onSubmit={submitIncomingPayment}>
          <div className="rtbo-payment-panel-head">
            <div>
              <p className="eyebrow">Receive Payments</p>
              <h4>School / Organization Payment</h4>
            </div>
          </div>
          <div className="grid two">
            <label>Payer Type
              <select name="payer_type" value={incomingForm.payer_type} onChange={updateIncomingForm}>
                {paymentPayerTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>Payer Name<input name="payer_name" value={incomingForm.payer_name} onChange={updateIncomingForm} required /></label>
            <label>Contact Name<input name="contact_name" value={incomingForm.contact_name} onChange={updateIncomingForm} /></label>
            <label>Email<input type="email" name="email" value={incomingForm.email} onChange={updateIncomingForm} /></label>
            <label>Phone<input name="phone" value={incomingForm.phone} onChange={updateIncomingForm} placeholder="(xxx) xxx-xxxx" /></label>
            <label>Amount<input type="number" name="amount" min="0.5" step="0.01" value={incomingForm.amount} onChange={updateIncomingForm} required /></label>
            <label>Due Date<input type="date" name="due_date" value={incomingForm.due_date} onChange={updateIncomingForm} /></label>
            <label>Status
              <select name="status" value={incomingForm.status} onChange={updateIncomingForm}>
                {incomingPaymentStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="span-two">Payment Method
              <select name="payment_method" value={incomingForm.payment_method} onChange={updateIncomingForm}>
                {paymentMethodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="span-two">Description<textarea name="description" rows="3" value={incomingForm.description} onChange={updateIncomingForm} placeholder="Tournament fee, game fees, assigning services, camp payment, etc." /></label>
          </div>
          {incomingForm.payment_method === 'stripe_checkout' && (
            <label className="rtbo-payment-check-row">
              <input type="checkbox" name="create_checkout" checked={incomingForm.create_checkout} onChange={updateIncomingForm} />
              <span>Create hosted Stripe checkout link for this payment.</span>
            </label>
          )}
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Incoming Payment'}</button>
        </form>

        <form className="form rtbo-payment-panel" onSubmit={submitPaymentAccount}>
          <div className="rtbo-payment-panel-head">
            <div>
              <p className="eyebrow">Direct Deposit</p>
              <h4>Official Payout Setup</h4>
            </div>
          </div>
          <label>Official
            <select name="official_id" value={accountForm.official_id} onChange={updateAccountForm} required>
              <option value="">Select official</option>
              {paymentData.officials.map(official => <option key={official.id} value={official.id}>{official.name}{official.email ? ` - ${official.email}` : ''}</option>)}
            </select>
          </label>
          <div className="grid two">
            <label>Status
              <select name="direct_deposit_status" value={accountForm.direct_deposit_status} onChange={updateAccountForm}>
                {directDepositStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>Payout Method<input name="payout_method" value={accountForm.payout_method} onChange={updateAccountForm} /></label>
            <label className="span-two">Stripe Connected Account ID<input name="stripe_account_id" value={accountForm.stripe_account_id} onChange={updateAccountForm} placeholder="acct_..." /></label>
            <label>Bank Last 4<input name="bank_last4" inputMode="numeric" value={accountForm.bank_last4} onChange={updateAccountForm} maxLength="4" /></label>
            <label>Routing Last 4<input name="routing_last4" inputMode="numeric" value={accountForm.routing_last4} onChange={updateAccountForm} maxLength="4" /></label>
            <label className="span-two">Notes<textarea name="notes" rows="3" value={accountForm.notes} onChange={updateAccountForm} placeholder="Onboarding notes, verification reminders, processor details." /></label>
          </div>
          <small className="rtbo-payment-safe-note">Never enter full bank account or routing numbers here.</small>
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Direct Deposit Setup'}</button>
        </form>

        <form className="form rtbo-payment-panel" onSubmit={submitOfficialPayout}>
          <div className="rtbo-payment-panel-head">
            <div>
              <p className="eyebrow">Pay Officials</p>
              <h4>Official Payout Queue</h4>
            </div>
          </div>
          <label>Official
            <select name="official_id" value={payoutForm.official_id} onChange={updatePayoutForm} required>
              <option value="">Select official</option>
              {paymentData.officials.map(official => <option key={official.id} value={official.id}>{official.name}{official.email ? ` - ${official.email}` : ''}</option>)}
            </select>
          </label>
          <div className="grid two">
            <label>Amount<input type="number" name="amount" min="0.5" step="0.01" value={payoutForm.amount} onChange={updatePayoutForm} required /></label>
            <label>Service Date<input type="date" name="service_date" value={payoutForm.service_date} onChange={updatePayoutForm} /></label>
            <label>Status
              <select name="status" value={payoutForm.status} onChange={updatePayoutForm}>
                {officialPayoutStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>Event / Game<input name="event_name" value={payoutForm.event_name} onChange={updatePayoutForm} /></label>
            <label className="span-two">Description<textarea name="description" rows="3" value={payoutForm.description} onChange={updatePayoutForm} placeholder="Game fee, travel reimbursement, tournament payout, etc." /></label>
          </div>
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Official Payout'}</button>
        </form>
      </div>

      <div className="rtbo-payment-record-grid">
        <section className="rtbo-payment-record-panel">
          <div className="rtbo-payment-panel-head">
            <div>
              <p className="eyebrow">Accounts Receivable</p>
              <h4>Incoming Payments</h4>
            </div>
          </div>
          {loading && <p className="rtbo-empty-state">Loading incoming payments...</p>}
          {!loading && paymentData.incoming_payments.length === 0 && <p className="rtbo-empty-state">No incoming payment records yet.</p>}
          {paymentData.incoming_payments.map(payment => (
            <article className="rtbo-payment-record-card" key={`incoming-${payment.id}`}>
              <div>
                <strong>{payment.payer_name || 'Payer pending'}</strong>
                <span>{paymentAmount(payment.amount_cents)} / {formatLabel(payment.status)}</span>
              </div>
              <p>{[formatLabel(payment.payer_type), payment.description, payment.due_date && `Due ${formatGameDate(payment.due_date)}`].filter(Boolean).join(' / ')}</p>
              {payment.payment_url && <a className="btn secondary dark-btn" href={payment.payment_url} target="_blank" rel="noreferrer">Open Payment Link</a>}
              <div className="rtbo-payment-record-actions">
                <button type="button" onClick={() => updateIncomingStatus(payment.id, 'paid')}>Mark Paid</button>
                <button type="button" onClick={() => updateIncomingStatus(payment.id, 'pending')}>Mark Pending</button>
                <button type="button" onClick={() => deleteIncomingPayment(payment.id)}>Delete</button>
              </div>
            </article>
          ))}
        </section>

        <section className="rtbo-payment-record-panel">
          <div className="rtbo-payment-panel-head">
            <div>
              <p className="eyebrow">Official Pay</p>
              <h4>Payout Queue</h4>
            </div>
          </div>
          {loading && <p className="rtbo-empty-state">Loading official payouts...</p>}
          {!loading && paymentData.official_payouts.length === 0 && <p className="rtbo-empty-state">No official payouts have been created yet.</p>}
          {paymentData.official_payouts.map(payout => {
            const account = accountForOfficial(payout.official_id);
            const ready = account?.direct_deposit_status === 'ready' && account?.stripe_account_id;
            return (
              <article className="rtbo-payment-record-card" key={`payout-${payout.id}`}>
                <div>
                  <strong>{payout.official_name || 'Official pending'}</strong>
                  <span>{paymentAmount(payout.amount_cents)} / {formatLabel(payout.status)}</span>
                </div>
                <p>{[payout.event_name, payout.service_date && formatGameDate(payout.service_date), payout.description].filter(Boolean).join(' / ') || 'Payout details pending.'}</p>
                <small>{ready ? `Direct deposit ready: ${account.stripe_account_id}` : 'Direct deposit setup is not ready.'}</small>
                {payout.stripe_transfer_id && <small>Stripe Transfer: {payout.stripe_transfer_id}</small>}
                <div className="rtbo-payment-record-actions">
                  {canSendDirectDeposit && payout.status !== 'paid' && <button type="button" onClick={() => sendDirectDeposit(payout)} disabled={!ready || saving}>Send Direct Deposit</button>}
                  <button type="button" onClick={() => updatePayoutStatus(payout.id, 'paid')}>Mark Paid</button>
                  <button type="button" onClick={() => updatePayoutStatus(payout.id, 'queued')}>Queue</button>
                  <button type="button" onClick={() => deleteOfficialPayout(payout.id)}>Delete</button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rtbo-payment-record-panel">
          <div className="rtbo-payment-panel-head">
            <div>
              <p className="eyebrow">Direct Deposit</p>
              <h4>Official Accounts</h4>
            </div>
          </div>
          {loading && <p className="rtbo-empty-state">Loading direct deposit setup...</p>}
          {!loading && paymentData.official_accounts.length === 0 && <p className="rtbo-empty-state">No official direct deposit records yet.</p>}
          {paymentData.official_accounts.map(account => (
            <article className="rtbo-payment-record-card compact" key={`account-${account.id || account.official_id}`}>
              <div>
                <strong>{account.official_name || 'Official pending'}</strong>
                <span>{formatLabel(account.direct_deposit_status)}</span>
              </div>
              <p>{[account.official_email, account.stripe_account_id && `Stripe: ${account.stripe_account_id}`, account.bank_last4 && `Bank: ****${account.bank_last4}`].filter(Boolean).join(' / ') || 'Setup details pending.'}</p>
              {account.notes && <small>{account.notes}</small>}
              <div className="rtbo-payment-record-actions">
                <button type="button" onClick={() => setAccountForm({
                  official_id: String(account.official_id || ''),
                  direct_deposit_status: account.direct_deposit_status || 'not_configured',
                  payout_method: account.payout_method || 'stripe_connect',
                  stripe_account_id: account.stripe_account_id || '',
                  bank_last4: account.bank_last4 || '',
                  routing_last4: account.routing_last4 || '',
                  notes: account.notes || ''
                })}>Edit Setup</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}

function InvoicePreview({ invoice, onCreditCardPayment = () => {}, creditCardLoading = false }) {
  const totals = invoiceTotals(invoice);
  const lineItems = invoiceLineItems(invoice);
  const creditCardRequested = Boolean(invoice.creditCardRequested);
  const billToLines = invoiceCompletedLines(
    invoice.schoolName || 'School / Organization',
    invoice.contactName && `Attn: ${invoice.contactName}`,
    invoice.email && `Email: ${invoice.email}`,
    invoice.phone && `Phone: ${formatPhoneNumber(invoice.phone)}`,
    invoice.address || 'Billing Address'
  );
  const shipToLines = invoiceCompletedLines(
    invoice.schoolName || 'School / Organization',
    invoice.address || 'Shipping Address'
  );
  const detailRows = invoiceDetailRows(invoice);

  return (
    <section
      className="rtbo-invoice-preview rtbo-invoice-print-zone"
      aria-label={`Printable invoice preview for ${invoice.invoiceNumber}`}
    >
      <img className="rtbo-invoice-watermark" src={image('logo.png')} alt="" aria-hidden="true" />
      <header className="rtbo-invoice-preview-head">
        <h1>INVOICE</h1>
        <img src={image('logo.png')} alt="Raising The Bar Officiating Inc. logo" />
      </header>

      <div className="rtbo-invoice-preview-body">
        <div className="rtbo-invoice-preview-meta">
          <section className="rtbo-invoice-party-block">
            <div>
              <h4>Bill To:</h4>
              {billToLines.map((line, index) => <p key={`bill-${index}`}>{line}</p>)}
            </div>
            <div>
              <h4>Ship To:</h4>
              {shipToLines.map((line, index) => <p key={`ship-${index}`}>{line}</p>)}
            </div>
          </section>
          <section className="rtbo-invoice-detail-block">
            <dl>
              {detailRows.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <div className="rtbo-invoice-mail-to">
              <h4>Mail To:</h4>
              <div>
                {rtboInvoiceMailToLines.map((line, index) => <p key={`mail-${index}`}>{line}</p>)}
              </div>
            </div>
          </section>
        </div>

        {lineItems.length > 0 && (
          <div className="rtbo-invoice-table-wrap">
            <table className="rtbo-invoice-table">
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">Price</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map(item => (
                  <tr key={item.key}>
                    <td><span className="rtbo-invoice-selected-fee">{item.description}</span></td>
                    <td>{money(item.rate)}</td>
                    <td>{invoiceQuantityLabel(item.qty)}</td>
                    <td>{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lineItems.length > 0 && (
          <div className="rtbo-invoice-total-box">
            <p>Sub-total</p>
            <div><span>Total</span><strong>{money(totals.total)}</strong></div>
          </div>
        )}

        <section className="rtbo-invoice-payment-options" aria-label="Invoice payment options and terms">
          <h4>Terms &amp; Conditions</h4>
          <p>Payment is due within 14 days.</p>
          <p>You may pay by check by submitting it to Pay to the order of</p>
          <p>Montrel Simmons, DBA Raising The Bar Officiating Inc.</p>
          {String(invoice.notes || '').trim() && <p>{invoice.notes}</p>}
          <button
            className={`rtbo-invoice-credit-card-toggle${creditCardRequested ? ' active' : ''}`}
            type="button"
            onClick={onCreditCardPayment}
            disabled={creditCardLoading}
          >
            {creditCardLoading ? 'Opening Checkout...' : 'Pay by Credit Card'}
          </button>
          {creditCardRequested && <p className="rtbo-invoice-credit-card-status">Payee has indicated they would like to pay by credit card.</p>}
        </section>

        <div className="rtbo-invoice-closing">
          <p>We Will Serve, and Will Be Of Service To The Game!</p>
          <p>Thank you for your trust!</p>
        </div>

        <footer className="rtbo-invoice-footer">
          <div>
            <span><b aria-hidden="true">⌂</b>{rtboInvoiceContact.address}</span>
            <span><b aria-hidden="true">☎</b>{rtboInvoiceContact.phone.replace('Ph# ', '')}</span>
            <span><b aria-hidden="true">✉</b>{rtboInvoiceContact.email.replace('Email: ', '')}</span>
          </div>
          <strong>1/1</strong>
        </footer>
      </div>
    </section>
  );
}

function AdminInvoiceCreator({ user, onStatus = () => {} }) {
  const [invoices, setInvoices] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(() => createInvoiceForm());
  const [editingId, setEditingId] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [invoiceErrors, setInvoiceErrors] = useState({});
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creditCardLoading, setCreditCardLoading] = useState(false);
  const invoicePreviewRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionNode = document.querySelector('meta[name="description"]');
    const robotsNode = document.querySelector('meta[name="robots"]');
    const previousDescription = descriptionNode?.getAttribute('content') || '';
    const previousRobots = robotsNode?.getAttribute('content') || '';

    document.title = 'RTBO Invoice Creator | Super Admin Billing Workspace';
    descriptionNode?.setAttribute('content', 'Super Admin invoice creator for Raising The Bar Officiating Inc. with professional one-page PDF preview, save, email, edit, delete, reset, and print controls.');
    robotsNode?.setAttribute('content', 'noindex, nofollow');

    return () => {
      document.title = previousTitle;
      if (descriptionNode) descriptionNode.setAttribute('content', previousDescription);
      if (robotsNode) robotsNode.setAttribute('content', previousRobots);
      document.body.classList.remove('rtbo-printing-invoice');
    };
  }, []);

  useEffect(() => {
    if (!isSuperAdminUser(user)) {
      setLoading(false);
      setInvoiceStatus('Super Admin access is required to manage invoices.');
      return undefined;
    }

    let active = true;
    setLoading(true);
    apiGet('/admin-invoices.php')
      .then((data) => {
        if (!active) return;
        const normalized = (data.invoices || []).map(normalizeInvoiceRecord);
        setInvoices(normalized);
        setInvoiceForm(createInvoiceForm(normalized));
        setInvoiceStatus(normalized.length ? `${normalized.length} saved invoice${normalized.length === 1 ? '' : 's'} loaded.` : 'Invoice creator ready.');
      })
      .catch((error) => {
        if (!active) return;
        setInvoiceStatus(error.message || 'Invoices could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const cleanupPrintMode = () => document.body.classList.remove('rtbo-printing-invoice');
    window.addEventListener('afterprint', cleanupPrintMode);
    return () => window.removeEventListener('afterprint', cleanupPrintMode);
  }, []);

  function updateInvoiceForm(event) {
    const { name, value } = event.target;
    setInvoiceForm(current => ({ ...current, [name]: formatFormFieldValue(name, value) }));
    setPrintPreviewOpen(false);
    setInvoiceErrors(current => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function updateInvoiceFeeSelection(row, event) {
    const selectedDescriptions = Array.from(event.target.selectedOptions).map(option => option.value);
    setInvoiceForm(current => {
      const currentItems = invoiceCategoryItems(current, row);
      const nextItems = selectedDescriptions.map(description => (
        currentItems.find(item => item.description === description) || { description, qty: '1', rate: '' }
      ));
      return {
        ...current,
        [row.typeName]: selectedDescriptions,
        [row.itemsName]: nextItems
      };
    });
    setPrintPreviewOpen(false);
    setInvoiceErrors(current => {
      const next = { ...current };
      delete next.invoiceFeeSelection;
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${row.itemsName}-`)) delete next[key];
      });
      return next;
    });
  }

  function toggleInvoiceFeeOption(row, option) {
    setInvoiceForm(current => {
      const currentItems = invoiceCategoryItems(current, row);
      const currentDescriptions = currentItems.map(item => item.description);
      const selectedDescriptions = currentDescriptions.includes(option)
        ? currentDescriptions.filter(description => description !== option)
        : [...currentDescriptions, option];
      const nextItems = selectedDescriptions.map(description => (
        currentItems.find(item => item.description === description) || { description, qty: '1', rate: '' }
      ));
      return {
        ...current,
        [row.typeName]: selectedDescriptions,
        [row.itemsName]: nextItems
      };
    });
    setPrintPreviewOpen(false);
    setInvoiceErrors(current => {
      const next = { ...current };
      delete next.invoiceFeeSelection;
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${row.itemsName}-`)) delete next[key];
      });
      return next;
    });
  }

  function updateInvoiceFeeItem(row, description, field, value) {
    const errorName = invoiceItemErrorName(row, description, field);
    setInvoiceForm(current => {
      const currentItems = invoiceCategoryItems(current, row);
      const nextItems = currentItems.map(item => (
        item.description === description ? { ...item, [field]: value } : item
      ));
      return {
        ...current,
        [row.itemsName]: nextItems,
        [row.typeName]: nextItems.map(item => item.description)
      };
    });
    setPrintPreviewOpen(false);
    setInvoiceErrors(current => {
      if (!current[errorName]) return current;
      const next = { ...current };
      delete next[errorName];
      return next;
    });
  }

  function validateCurrentInvoice(actionLabel) {
    const errors = validateInvoiceForm(invoiceForm);
    setInvoiceErrors(errors);
    if (Object.keys(errors).length > 0) {
      setInvoiceStatus(`Complete all required invoice fields before ${actionLabel}.`);
      return false;
    }
    return true;
  }

  function resetInvoice() {
    setInvoiceForm(createInvoiceForm(invoices));
    setInvoiceErrors({});
    setEditingId(0);
    setPrintPreviewOpen(false);
    setInvoiceStatus('Invoice form reset. Preview is ready for new details.');
  }

  function createNewInvoice() {
    setInvoiceForm(createInvoiceForm(invoices));
    setInvoiceErrors({});
    setEditingId(0);
    setPrintPreviewOpen(false);
    setInvoiceStatus('New invoice started. Previous fields were cleared.');
    window.requestAnimationFrame(() => {
      document.querySelector('.rtbo-invoice-form input[name="schoolName"]')?.focus({ preventScroll: true });
    });
  }

  function editInvoice(invoice) {
    const normalized = normalizeInvoiceRecord(invoice);
    setInvoiceForm(normalized);
    setInvoiceErrors({});
    setEditingId(normalized.id);
    setPrintPreviewOpen(false);
    setInvoiceStatus(`Editing ${normalized.invoiceNumber}. Review the preview before printing.`);
  }

  function scrollInvoicePreviewIntoView() {
    window.requestAnimationFrame(() => {
      invoicePreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function focusInvoiceFormForEditing() {
    const firstField = document.querySelector('.rtbo-invoice-form input[name="invoiceNumber"]');
    firstField?.focus({ preventScroll: true });
    firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function storeSavedInvoice(invoice) {
    const saved = normalizeInvoiceRecord(invoice);
    setInvoices(current => {
      const exists = current.some(item => Number(item.id) === Number(saved.id));
      return exists
        ? current.map(item => Number(item.id) === Number(saved.id) ? saved : item)
        : [saved, ...current];
    });
    setInvoiceForm(saved);
    setEditingId(saved.id);
    return saved;
  }

  async function persistInvoiceRecord(invoicePayload) {
    const data = await apiPostJson('/admin-invoices.php', {
      action: 'save',
      invoice: { ...invoicePayload, id: editingId || invoiceForm.id || 0, status: invoiceForm.status || 'ready' }
    });
    return { saved: storeSavedInvoice(data.invoice), message: data.message || 'Invoice saved.' };
  }

  async function saveInvoice(event) {
    event?.preventDefault();
    if (!validateCurrentInvoice('saving')) {
      return;
    }

    const invoicePayload = invoiceWithComputedTotals(invoiceForm);
    setInvoiceStatus('Choose where to save the invoice PDF on this computer.');
    const localSaveTarget = await requestInvoicePdfSaveTarget(invoicePayload);
    setSaving(true);
    setInvoiceStatus('Saving invoice and creating PDF...');
    try {
      const { saved, message: savedMessage } = await persistInvoiceRecord(invoicePayload);
      setPrintPreviewOpen(false);
      let message = savedMessage;
      try {
        const pdfData = await apiPostJson('/admin-invoices.php', { action: 'pdf', invoice: saved });
        const localResult = await saveInvoicePdfToComputer(pdfData.pdf, localSaveTarget);
        message += ` ${invoicePdfSaveMessage(localResult)}`;
      } catch (localError) {
        message += ` PDF could not be saved: ${localError.message || 'browser file access was unavailable.'}`;
      }
      setInvoiceStatus(message);
      onStatus(`Invoice ${saved.invoiceNumber} saved.`);
    } catch (error) {
      setInvoiceStatus(error.message || 'Invoice could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function saveInvoicePdf() {
    if (!validateCurrentInvoice('saving the PDF')) {
      return;
    }

    const invoicePayload = invoiceWithComputedTotals(invoiceForm);
    setInvoiceStatus('Choose where to save the invoice PDF on this computer.');
    const localSaveTarget = await requestInvoicePdfSaveTarget(invoicePayload);
    setSaving(true);
    setInvoiceStatus('Creating invoice PDF...');
    try {
      const data = await apiPostJson('/admin-invoices.php', { action: 'pdf', invoice: invoicePayload });
      const localResult = await saveInvoicePdfToComputer(data.pdf, localSaveTarget);
      setInvoiceStatus(`Invoice PDF created. ${invoicePdfSaveMessage(localResult)}`);
      onStatus(`Invoice ${invoicePayload.invoiceNumber} PDF created.`);
    } catch (error) {
      setInvoiceStatus(error.message || 'Invoice PDF could not be created.');
    } finally {
      setSaving(false);
    }
  }

  async function emailInvoice() {
    if (!validateCurrentInvoice('emailing')) {
      return;
    }

    const invoicePayload = invoiceWithComputedTotals(invoiceForm);
    setInvoiceStatus('Choose where to save the emailed invoice PDF on this computer.');
    const localSaveTarget = await requestInvoicePdfSaveTarget(invoicePayload);
    if (localSaveTarget?.type === 'canceled') {
      setInvoiceStatus('PDF save was canceled. The invoice was not emailed.');
      return;
    }
    setSaving(true);
    setInvoiceStatus('Saving invoice and emailing PDF...');
    try {
      const { saved } = await persistInvoiceRecord(invoicePayload);
      const data = await apiPostJson('/admin-invoices.php', {
        action: 'email',
        invoice: saved,
        recipientEmail: saved.email
      });
      let message = data.message || `Invoice PDF emailed to ${saved.email}.`;
      try {
        const localResult = await saveInvoicePdfToComputer(data.pdf, localSaveTarget);
        message += ` ${invoicePdfSaveMessage(localResult)}`;
      } catch (localError) {
        message += ` PDF could not be saved locally: ${localError.message || 'browser file access was unavailable.'}`;
      }
      setPrintPreviewOpen(false);
      setInvoiceStatus(message);
      onStatus(`Invoice ${saved.invoiceNumber} emailed to ${saved.email}.`);
    } catch (error) {
      setInvoiceStatus(error.message || 'Invoice email could not be sent.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteInvoice(id = editingId) {
    if (!id) {
      resetInvoice();
      setInvoiceStatus('Unsaved invoice cleared.');
      return;
    }
    if (!window.confirm('Delete this saved invoice?')) {
      return;
    }

    setSaving(true);
    setInvoiceStatus('Deleting invoice...');
    try {
      const data = await apiPostJson('/admin-invoices.php', { action: 'delete', id });
      setInvoices(current => current.filter(invoice => Number(invoice.id) !== Number(id)));
      resetInvoice();
      setInvoiceStatus(data.message || 'Invoice deleted.');
      onStatus('Invoice deleted.');
    } catch (error) {
      setInvoiceStatus(error.message || 'Invoice could not be deleted.');
    } finally {
      setSaving(false);
    }
  }

  function printInvoice() {
    if (!validateCurrentInvoice('printing')) {
      return;
    }
    setPrintPreviewOpen(true);
    setInvoiceStatus('Invoice preview is ready. Review it, then click Print Invoice.');
    scrollInvoicePreviewIntoView();
  }

  async function printPreparedInvoice() {
    if (!validateCurrentInvoice('printing')) {
      return;
    }

    const invoicePayload = invoiceWithComputedTotals(invoiceForm);
    setInvoiceStatus('Choose where to save the invoice PDF before printing.');
    const localSaveTarget = await requestInvoicePdfSaveTarget(invoicePayload);
    if (localSaveTarget?.type === 'canceled') {
      setInvoiceStatus('PDF save was canceled. Printing was not started.');
      return;
    }
    setSaving(true);
    setInvoiceStatus('Creating and saving PDF before print...');
    try {
      const data = await apiPostJson('/admin-invoices.php', { action: 'pdf', invoice: invoicePayload });
      const localResult = await saveInvoicePdfToComputer(data.pdf, localSaveTarget);
      if (localResult.canceled) {
        setInvoiceStatus('PDF save was canceled. Printing was not started.');
        return;
      }
      if (typeof window.print !== 'function') {
        throw new Error('Printing is not available in this browser.');
      }
      const finishPrintMode = () => document.body.classList.remove('rtbo-printing-invoice');
      document.body.classList.add('rtbo-printing-invoice');
      document.body.offsetHeight;
      window.addEventListener('afterprint', finishPrintMode, { once: true });
      window.print();
      window.setTimeout(() => {
        window.removeEventListener('afterprint', finishPrintMode);
        finishPrintMode();
      }, 1500);
      setInvoiceStatus(`System print dialog opened. Choose the printer and confirm to finish printing. ${invoicePdfSaveMessage(localResult)}`);
      onStatus(`Invoice ${invoicePayload.invoiceNumber} is ready to print.`);
    } catch (error) {
      document.body.classList.remove('rtbo-printing-invoice');
      setInvoiceStatus(error.message || 'Invoice PDF could not be saved before printing.');
    } finally {
      setSaving(false);
    }
  }

  function editCurrentInvoice() {
    setPrintPreviewOpen(false);
    if (editingId || invoiceForm.id) {
      focusInvoiceFormForEditing();
      setInvoiceStatus(`Editing ${invoiceForm.invoiceNumber || 'current invoice'}.`);
      return;
    }
    if (invoices.length > 0) {
      editInvoice(invoices[0]);
      focusInvoiceFormForEditing();
      return;
    }
    focusInvoiceFormForEditing();
    setInvoiceStatus('Enter invoice details, then save or preview the invoice.');
  }

  async function requestCreditCardPayment() {
    if (!validateCurrentInvoice('opening Stripe checkout')) {
      return;
    }

    const checkoutWindow = window.open('', '_blank', 'noopener');
    const invoicePayload = invoiceWithComputedTotals({ ...invoiceForm, creditCardRequested: true });
    setCreditCardLoading(true);
    setInvoiceStatus('Opening Stripe checkout for this invoice...');
    try {
      const data = await apiPostJson('/admin-invoices.php', {
        action: 'checkout',
        invoice: invoicePayload
      });
      setInvoiceForm(current => ({ ...current, creditCardRequested: true }));
      const redirect = data.redirect || data.url || '';
      if (!redirect) {
        throw new Error('Stripe checkout did not return a payment URL.');
      }
      if (checkoutWindow) {
        checkoutWindow.location = redirect;
      } else {
        window.location.href = redirect;
      }
      setInvoiceStatus('Stripe checkout opened for this invoice.');
    } catch (error) {
      checkoutWindow?.close();
      setInvoiceStatus(error.message || 'Stripe checkout could not be opened.');
    } finally {
      setCreditCardLoading(false);
    }
  }

  const totals = invoiceTotals(invoiceForm);
  const hasInvoiceValidationErrors = Object.keys(invoiceErrors).length > 0;

  return (
    <article className="rtbo-dashboard-card rtbo-focused-page-card rtbo-invoice-creator-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Super Admin Forms</p>
          <h3>Invoice Creator</h3>
          <p>Create, preview, save, email, and print one-page PDF invoices for Raising The Bar Officiating Inc.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={createNewInvoice} disabled={saving || loading}>Create New Invoice</button>
          <button className="btn" type="button" onClick={saveInvoice} disabled={saving || loading}>{saving ? 'Saving...' : 'Save Invoice'}</button>
          <button className="btn secondary dark-btn" type="button" onClick={saveInvoicePdf} disabled={saving || loading}>Save PDF</button>
          <button className="btn secondary dark-btn" type="button" onClick={emailInvoice} disabled={saving || loading}>Email Invoice</button>
          <button className="btn secondary dark-btn" type="button" onClick={printInvoice} disabled={saving || loading}>Print Preview</button>
          <button className="btn secondary dark-btn" type="button" onClick={editCurrentInvoice} disabled={saving || loading}>Edit Invoice</button>
          <button className="btn secondary dark-btn" type="button" onClick={resetInvoice} disabled={saving}>Reset Invoice</button>
          <button className="btn secondary dark-btn danger-action" type="button" onClick={() => deleteInvoice()} disabled={saving}>Delete Invoice</button>
        </div>
      </div>

      {invoiceStatus && <p className={`form-message${hasInvoiceValidationErrors || invoiceStatus.toLowerCase().includes('required') || invoiceStatus.toLowerCase().includes('could not') ? ' error' : ''}`}>{invoiceStatus}</p>}

      <div className="rtbo-invoice-workspace">
        <form id="rtbo-invoice-form" className="form rtbo-invoice-form" onSubmit={saveInvoice} noValidate>
          <section className="rtbo-invoice-panel">
            <div>
              <p className="eyebrow">Invoice Information</p>
              <h4>Billing Details</h4>
            </div>
            <div className="grid two">
              <label>Invoice Number<input name="invoiceNumber" value={invoiceForm.invoiceNumber} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.invoiceNumber)} aria-describedby={invoiceErrors.invoiceNumber ? 'invoice-error-invoiceNumber' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="invoiceNumber" /></label>
              <label>Invoice Date<input type="date" name="invoiceDate" value={invoiceForm.invoiceDate} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.invoiceDate)} aria-describedby={invoiceErrors.invoiceDate ? 'invoice-error-invoiceDate' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="invoiceDate" /></label>
              <label>Due Date<input type="date" name="dueDate" value={invoiceForm.dueDate} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.dueDate)} aria-describedby={invoiceErrors.dueDate ? 'invoice-error-dueDate' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="dueDate" /></label>
              <label>School / Organization<input name="schoolName" value={invoiceForm.schoolName} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.schoolName)} aria-describedby={invoiceErrors.schoolName ? 'invoice-error-schoolName' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="schoolName" /></label>
              <label>Contact Person<input name="contactName" value={invoiceForm.contactName} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.contactName)} aria-describedby={invoiceErrors.contactName ? 'invoice-error-contactName' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="contactName" /></label>
              <label>Email Address<input type="email" name="email" value={invoiceForm.email} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.email)} aria-describedby={invoiceErrors.email ? 'invoice-error-email' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="email" /></label>
              <label>Phone Number<input type="tel" name="phone" value={invoiceForm.phone} onChange={updateInvoiceForm} inputMode="tel" autoComplete="tel" maxLength="14" required aria-invalid={Boolean(invoiceErrors.phone)} aria-describedby={invoiceErrors.phone ? 'invoice-error-phone' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="phone" /></label>
              <label>Billing Address<input name="address" value={invoiceForm.address} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.address)} aria-describedby={invoiceErrors.address ? 'invoice-error-address' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="address" /></label>
              <label>Event / Game Name<input name="eventName" value={invoiceForm.eventName} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.eventName)} aria-describedby={invoiceErrors.eventName ? 'invoice-error-eventName' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="eventName" /></label>
              <label>Game Level<input name="gameLevel" value={invoiceForm.gameLevel} onChange={updateInvoiceForm} required aria-invalid={Boolean(invoiceErrors.gameLevel)} aria-describedby={invoiceErrors.gameLevel ? 'invoice-error-gameLevel' : undefined} /><InvoiceFieldError errors={invoiceErrors} name="gameLevel" /></label>
            </div>
          </section>

          <section className="rtbo-invoice-panel rtbo-invoice-fee-panel">
            <div>
              <p className="eyebrow">Fee Breakdown</p>
              <h4>Invoice Amounts</h4>
            </div>
            <div className="rtbo-invoice-fee-grid">
              {invoiceFeeRows.map(row => {
                const selectedItems = invoiceCategoryItems(invoiceForm, row);
                const selectedDescriptions = selectedItems.map(item => item.description);
                return (
                  <details className={`rtbo-invoice-fee-row${selectedItems.length > 0 ? ' has-selected-items' : ''}`} key={row.key} defaultOpen={selectedItems.length > 0}>
                    <summary>
                      <span>{row.label}</span>
                      <small>{selectedItems.length ? `${selectedItems.length} selected` : 'Select fee descriptions'}</small>
                    </summary>
                    <div className="rtbo-invoice-fee-menu" role="group" aria-label={`${row.label} options`}>
                      {row.options.map(option => (
                        <label className="rtbo-invoice-fee-option" key={`${row.key}-${option}`}>
                          <input
                            type="checkbox"
                            checked={selectedDescriptions.includes(option)}
                            onChange={() => toggleInvoiceFeeOption(row, option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    {selectedItems.length > 0 && (
                      <div className="rtbo-invoice-selected-fee-items">
                        {selectedItems.map(item => {
                          const qtyError = invoiceItemErrorName(row, item.description, 'qty');
                          const rateError = invoiceItemErrorName(row, item.description, 'rate');
                          return (
                            <div className="rtbo-invoice-selected-fee-row" key={`${row.key}-${item.description}`}>
                              <span className="rtbo-invoice-selected-fee-name">{item.description}</span>
                              <label>Qty<input type="number" min="0" step="1" value={item.qty} onChange={(event) => updateInvoiceFeeItem(row, item.description, 'qty', event.target.value)} /><InvoiceFieldError errors={invoiceErrors} name={qtyError} /></label>
                              <label>Fee<input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateInvoiceFeeItem(row, item.description, 'rate', event.target.value)} /><InvoiceFieldError errors={invoiceErrors} name={rateError} /></label>
                              <div className="rtbo-invoice-line-total">
                                <span>Line Total</span>
                                <strong>{money(invoiceItemAmount(item))}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </details>
                );
              })}
            </div>
            {invoiceLineItems(invoiceForm).length > 0 && (
              <div className="rtbo-invoice-mini-total">
                <span>Live Total</span>
                <strong>{money(totals.total)}</strong>
              </div>
            )}
          </section>

          <section className="rtbo-invoice-panel rtbo-invoice-notes-panel">
            <div>
              <p className="eyebrow">Notes</p>
              <h4>Payment Instructions</h4>
            </div>
            <label>Additional Notes<textarea name="notes" value={invoiceForm.notes} onChange={updateInvoiceForm} rows="6" /></label>
            <button className="btn" type="submit" disabled={saving || loading}>{saving ? 'Saving...' : editingId ? 'Update Invoice' : 'Save Invoice'}</button>
          </section>
        </form>

        <aside className={`rtbo-invoice-preview-column${printPreviewOpen ? ' is-print-preview' : ''}`} aria-label="Invoice preview before printing" ref={invoicePreviewRef}>
          <div className="rtbo-invoice-preview-banner">{printPreviewOpen ? 'Print Preview Ready - Review Before Printing' : 'Live Invoice Preview - Review Before Printing'}</div>
          {printPreviewOpen && (
            <div className="rtbo-invoice-preview-actions" aria-live="polite">
              <span>Preview is ready.</span>
              <button className="btn" type="button" onClick={printPreparedInvoice} disabled={saving}>Print Invoice</button>
              <button className="btn secondary dark-btn" type="button" onClick={saveInvoicePdf} disabled={saving}>Save PDF</button>
              <button className="btn secondary dark-btn" type="button" onClick={emailInvoice} disabled={saving}>Email Invoice</button>
              <button className="btn secondary dark-btn" type="button" onClick={editCurrentInvoice} disabled={saving}>Make Changes</button>
              <button className="btn secondary dark-btn" type="button" onClick={() => setPrintPreviewOpen(false)} disabled={saving}>Close Preview</button>
            </div>
          )}
          <InvoicePreview invoice={invoiceForm} onCreditCardPayment={requestCreditCardPayment} creditCardLoading={creditCardLoading} />
        </aside>
      </div>

      <section className="rtbo-invoice-panel rtbo-invoice-history">
        <div className="rtbo-dashboard-card-head compact">
          <div>
            <p className="eyebrow">Saved Invoices</p>
            <h4>Invoice Library</h4>
          </div>
        </div>
        {invoices.length === 0 && <p className="rtbo-empty-state">{loading ? 'Loading invoices...' : 'No invoices have been saved yet.'}</p>}
        {invoices.length > 0 && (
          <div className="rtbo-invoice-list">
            {invoices.map(invoice => (
              <article key={`invoice-${invoice.id || invoice.invoiceNumber}`}>
                <div>
                  <strong>{invoice.invoiceNumber}</strong>
                  <span>{formatLabel(invoice.status || 'ready')}</span>
                </div>
                <p>{invoice.schoolName || 'School / Organization'} / {invoice.eventName || 'Event pending'} / {money(invoiceTotals(invoice).total)}</p>
                <small>{invoice.dueDate ? `Due ${formatGameDate(invoice.dueDate)}` : 'Due date pending'}</small>
                <div className="button-row">
                  <button className="btn secondary dark-btn" type="button" onClick={() => editInvoice(invoice)}>Edit</button>
                  <button className="btn secondary dark-btn danger-action" type="button" onClick={() => deleteInvoice(invoice.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

const advancedEvaluationCategories = [
  {
    id: 'professionalism',
    title: 'Professionalism & Presence',
    weight: 10,
    metrics: ['Appearance & Uniform', 'Punctuality', 'Professional Demeanor', 'Communication with Coaches', 'Communication with Players', 'Hustle & Court Presence']
  },
  {
    id: 'rules',
    title: 'Rules Knowledge & Judgment',
    weight: 20,
    metrics: ['Rules Understanding', 'Correct Rule Application', 'Advantage / Disadvantage Judgment', 'Consistency of Calls', 'Accuracy in Critical Situations']
  },
  {
    id: 'mechanics',
    title: 'Mechanics, Positioning & Coverage',
    weight: 20,
    metrics: ['Primary Coverage Area', 'Court Positioning', 'Angles & Spacing', 'Rotations', 'Transition Coverage', '2-Person / 3-Person Mechanics']
  },
  {
    id: 'management',
    title: 'Game Management',
    weight: 20,
    metrics: ['Control of Game Flow', 'Preventative Officiating', 'Handling Difficult Situations', 'Awareness of Matchups', 'Bench Management', 'Composure Under Pressure']
  },
  {
    id: 'communication',
    title: 'Signals & Communication',
    weight: 10,
    metrics: ['Clarity of Signals', 'Reporting Fouls', 'Whistle Presence', 'Crew Communication', 'Table Communication']
  },
  {
    id: 'crew',
    title: 'Crew Work',
    weight: 10,
    metrics: ['Crew Cohesion', 'Eye Contact & Communication', 'Trust Within Crew', 'Support During Dead Balls', 'Rotation Awareness']
  },
  {
    id: 'leadership',
    title: 'Leadership & Court Presence',
    weight: 10,
    metrics: ['Confidence', 'Presence on Court', 'Decision-Making', 'Leadership During Conflict', 'Professional Authority']
  }
];

const evaluationRankingScale = [
  ['4.75 - 5.00', 'Platinum Elite Official'],
  ['4.50 - 4.74', 'Elite Official'],
  ['4.00 - 4.49', 'Advanced Official'],
  ['3.50 - 3.99', 'Developing Official'],
  ['3.00 - 3.49', 'Standard Official'],
  ['Below 3.00', 'Improvement Required']
];

const evaluationTypeOptions = [
  ['school', 'School Evaluation'],
  ['regular_season', 'Regular Season Game']
];

const regularSeasonGameTypeOptions = [
  ['non_conference', 'Non-Conference Game'],
  ['conference', 'Conference Game'],
  ['tournament', 'Tournament Game'],
  ['tournament_final_four', 'Tournament Final Four Game'],
  ['final', 'Final Game']
];

function evaluationTypeLabel(value) {
  return evaluationTypeOptions.find(([id]) => id === value)?.[1] || formatLabel(value || 'evaluation');
}

function regularSeasonGameTypeLabel(value) {
  return regularSeasonGameTypeOptions.find(([id]) => id === value)?.[1] || formatLabel(value || '');
}

function createEvaluationScores() {
  return Object.fromEntries(advancedEvaluationCategories.map(category => [
    category.id,
    Object.fromEntries(category.metrics.map(metric => [metric, 3]))
  ]));
}

function evaluationRankLabel(score) {
  if (score >= 4.75) return 'Platinum Elite Official';
  if (score >= 4.5) return 'Elite Official';
  if (score >= 4) return 'Advanced Official';
  if (score >= 3.5) return 'Developing Official';
  if (score >= 3) return 'Standard Official';
  return 'Improvement Required';
}

function AdvancedOfficialsEvaluationForm({ user, onSaved }) {
  const [meta, setMeta] = useState({
    officialId: '',
    officialName: '',
    officialEmail: '',
    evaluatorName: user?.name || '',
    evaluationType: 'school',
    gameType: '',
    gameDate: new Date().toISOString().slice(0, 10),
    location: '',
    homeTeam: '',
    visitingTeam: '',
    level: '',
    crewPosition: ''
  });
  const [scores, setScores] = useState(createEvaluationScores);
  const [notes, setNotes] = useState({
    strengths: '',
    improvements: '',
    recommendation: '',
    commentsToAdmin: '',
    ratingVisible: true,
    strengthsVisible: true,
    improvementsVisible: true,
    recommendationVisible: true,
    adminCommentsVisible: false
  });
  const [submitStatus, setSubmitStatus] = useState('');
  const [officialOptions, setOfficialOptions] = useState([]);
  const canPersistEvaluation = ['super_admin', 'admin', 'evaluator', 'observer'].includes(user?.role);

  useEffect(() => {
    if (!canPersistEvaluation) return undefined;
    let active = true;
    apiGet('/evaluations.php')
      .then(data => {
        if (active) setOfficialOptions(Array.isArray(data.officials) ? data.officials : []);
      })
      .catch(() => {
        if (active) setOfficialOptions([]);
      });

    return () => {
      active = false;
    };
  }, [canPersistEvaluation]);

  const scoreSummary = useMemo(() => {
    const categoryScores = {};
    let weightedTotal = 0;
    let totalWeight = 0;

    advancedEvaluationCategories.forEach(category => {
      const values = Object.values(scores[category.id] || {}).map(Number);
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      categoryScores[category.id] = Number(average.toFixed(2));
      weightedTotal += average * category.weight;
      totalWeight += category.weight;
    });

    const weightedAverage = totalWeight ? weightedTotal / totalWeight : 0;
    return {
      categoryScores,
      weightedAverage: Number(weightedAverage.toFixed(2)),
      percentageScore: Number((weightedAverage * 20).toFixed(1)),
      ranking: evaluationRankLabel(weightedAverage)
    };
  }, [scores]);

  function updateMeta(event) {
    const { name, value } = event.target;
    setMeta(current => ({
      ...current,
      [name]: value,
      ...(name === 'evaluationType' && value === 'school' ? { gameType: '' } : {})
    }));
  }

  function selectOfficial(event) {
    const selected = officialOptions.find(option => String(option.id) === String(event.target.value));
    if (!selected) {
      setMeta(current => ({
        ...current,
        officialId: '',
        officialName: '',
        officialEmail: ''
      }));
      return;
    }
    setMeta(current => ({
      ...current,
      officialId: String(selected.id),
      officialName: selected.name || current.officialName,
      officialEmail: selected.email || current.officialEmail
    }));
  }

  function updateNotes(event) {
    const { name, type, checked, value } = event.target;
    setNotes(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function updateScore(categoryId, metric, value) {
    setScores(current => ({
      ...current,
      [categoryId]: {
        ...current[categoryId],
        [metric]: Number(value)
      }
    }));
  }

  async function submitEvaluation(event) {
    event.preventDefault();

    if (!String(meta.officialId || '').trim()) {
      setSubmitStatus('Select an official from the official database before submitting this evaluation.');
      return;
    }

    if (meta.evaluationType === 'regular_season' && !String(meta.gameType || '').trim()) {
      setSubmitStatus('Select the regular-season game type before submitting this evaluation.');
      return;
    }

    if (!canPersistEvaluation) {
      setSubmitStatus('Evaluation score calculated. Submit access is reserved for Super Admin, admins, evaluators, and observers.');
      return;
    }

    setSubmitStatus('Saving evaluation...');

    try {
      const data = await apiPostJson('/evaluations.php', {
        action: 'create',
        meta,
        notes,
        scores,
        summary: scoreSummary
      });
      setSubmitStatus(data.message || 'Evaluation saved.');
      onSaved?.(data.evaluation);
    } catch (error) {
      setSubmitStatus(error.message || 'Evaluation could not be saved.');
    }
  }

  return (
    <article className="rtbo-dashboard-card rtbo-advanced-evaluation-form">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Evaluation Form</p>
          <h3>Advanced Officials Evaluation</h3>
          <p>Score officials across professionalism, judgment, mechanics, game management, communication, crew work, and leadership.</p>
        </div>
        <div className="rtbo-eval-score-card">
          <span>Total Score</span>
          <strong>{scoreSummary.weightedAverage.toFixed(2)}</strong>
          <small>{scoreSummary.percentageScore.toFixed(1)} / 100</small>
        </div>
      </div>

      <form className="form rtbo-evaluation-entry-form" onSubmit={submitEvaluation}>
        <div className="rtbo-eval-form-grid">
          <label>Official Name
            <select name="officialId" value={meta.officialId} onChange={selectOfficial} required disabled={!officialOptions.length}>
              <option value="">{officialOptions.length ? 'Select official being evaluated' : 'No officials found in database'}</option>
              {officialOptions.map(official => (
                <option key={official.id} value={official.id}>{official.name}{official.email ? ` - ${official.email}` : ''}</option>
              ))}
            </select>
            {!officialOptions.length && <small>Add officials in the Members database before submitting evaluations.</small>}
          </label>
          <label>Official Email
            <input type="email" name="officialEmail" value={meta.officialEmail} readOnly placeholder="Auto-filled from selected official" />
          </label>
          <label>Evaluator / Observer
            <input name="evaluatorName" value={meta.evaluatorName} onChange={updateMeta} required />
          </label>
          <label>Evaluation Type
            <select name="evaluationType" value={meta.evaluationType} onChange={updateMeta} required>
              {evaluationTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {meta.evaluationType === 'regular_season' && (
            <label>Regular Season Game Type
              <select name="gameType" value={meta.gameType} onChange={updateMeta} required>
                <option value="">Select game type</option>
                {regularSeasonGameTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          )}
          <label>Game Date
            <input type="date" name="gameDate" value={meta.gameDate} onChange={updateMeta} required />
          </label>
          <label>Location
            <input name="location" value={meta.location} onChange={updateMeta} placeholder="Gym, arena, or school" />
          </label>
          <label>Game Level
            <select name="level" value={meta.level} onChange={updateMeta}>
              <option value="">Select level</option>
              <option>8th Grade Boys</option>
              <option>8th Grade Girls</option>
              <option>9th Grade Boys</option>
              <option>9th Grade Girls</option>
              <option>Junior Varsity Boys</option>
              <option>Junior Varsity Girls</option>
              <option>Varsity Boys</option>
              <option>Varsity Girls</option>
              <option>NJCAA</option>
              <option>NAIA</option>
              <option>NCAA DIII</option>
              <option>NCAA DII</option>
              <option>NCAA DI</option>
              <option>Pro-Am</option>
            </select>
          </label>
          <label>Home Team
            <input name="homeTeam" value={meta.homeTeam} onChange={updateMeta} />
          </label>
          <label>Visiting Team
            <input name="visitingTeam" value={meta.visitingTeam} onChange={updateMeta} />
          </label>
          <label>Crew Position
            <select name="crewPosition" value={meta.crewPosition} onChange={updateMeta}>
              <option value="">Select position</option>
              <option>Referee</option>
              <option>Umpire 1</option>
              <option>Umpire 2</option>
              <option>Alternate</option>
            </select>
          </label>
        </div>

        <div className="rtbo-eval-category-grid">
          {advancedEvaluationCategories.map(category => (
            <section className="rtbo-eval-category" key={category.id}>
              <div className="rtbo-eval-category-head">
                <div>
                  <p className="eyebrow">{category.weight}% Weight</p>
                  <h4>{category.title}</h4>
                </div>
                <strong>{scoreSummary.categoryScores[category.id].toFixed(2)}</strong>
              </div>
              <div className="rtbo-eval-score-list">
                {category.metrics.map(metric => (
                  <label className="rtbo-eval-score-row" key={metric}>
                    <span>{metric}</span>
                    <select value={scores[category.id][metric]} onChange={(event) => updateScore(category.id, metric, event.target.value)}>
                      {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="rtbo-eval-notes-grid">
          <label>Strengths
            <textarea name="strengths" value={notes.strengths} onChange={updateNotes} placeholder="What did the official do well?" />
          </label>
          <label>Areas For Improvement
            <textarea name="improvements" value={notes.improvements} onChange={updateNotes} placeholder="What should be developed next?" />
          </label>
          <label>Recommendation
            <textarea name="recommendation" value={notes.recommendation} onChange={updateNotes} placeholder="Next steps, ranking recommendation, or development plan." />
          </label>
          <label>Comments To Admin / Assignor
            <textarea name="commentsToAdmin" value={notes.commentsToAdmin} onChange={updateNotes} placeholder="Internal comments for Super Admin, assignor, or supervisor." />
          </label>
        </div>

        <div className="rtbo-eval-visibility-panel">
          <label>
            <input type="checkbox" name="strengthsVisible" checked={notes.strengthsVisible} onChange={updateNotes} />
            <span>Official can see strengths</span>
          </label>
          <label>
            <input type="checkbox" name="improvementsVisible" checked={notes.improvementsVisible} onChange={updateNotes} />
            <span>Official can see areas for improvement</span>
          </label>
          <label>
            <input type="checkbox" name="recommendationVisible" checked={notes.recommendationVisible} onChange={updateNotes} />
            <span>Official can see recommendations</span>
          </label>
          <label>
            <input type="checkbox" name="adminCommentsVisible" checked={notes.adminCommentsVisible} onChange={updateNotes} />
            <span>Official can see comments made to admin / assignor</span>
          </label>
          <label>
            <input type="checkbox" name="ratingVisible" checked={notes.ratingVisible} onChange={updateNotes} />
            <span>Official can see the rating</span>
          </label>
        </div>

        <div className="rtbo-eval-result-band">
          <div>
            <span>Ranking</span>
            <strong>{scoreSummary.ranking}</strong>
            <small>Weighted from all evaluation categories.</small>
          </div>
          <div className="rtbo-eval-scale-grid">
            {evaluationRankingScale.map(([range, label]) => (
              <span key={label}><b>{range}</b>{label}</span>
            ))}
          </div>
        </div>

        <div className="button-row rtbo-eval-actions">
          <button className="btn" type="submit">Submit Evaluation</button>
          <button className="btn secondary dark-btn" type="button" onClick={() => { setScores(createEvaluationScores()); setSubmitStatus('Scores reset to standard baseline.'); }}>Reset Scores</button>
        </div>
        {submitStatus && <p className={`form-message${submitStatus.toLowerCase().includes('could not') || submitStatus.toLowerCase().includes('required') ? ' error' : ''}`}>{submitStatus}</p>}
      </form>
    </article>
  );
}

const addMemberSections = [];

const settingsOfficialsSections = [
  { id: 'settingsAddOfficial', role: 'official', title: 'Add Official', group: 'Officials' },
  { id: 'settingsAddEvaluator', role: 'evaluator', title: 'Add Evaluator', group: 'Officials' },
  { id: 'settingsAddObserver', role: 'observer', title: 'Add Observer', group: 'Officials' }
];

const collegeClassificationGroups = [
  { id: 'Ncaadi', label: 'NCAA DI' },
  { id: 'Ncaadii', label: 'NCAA DII' },
  { id: 'Ncaaiii', label: 'NCAA DIII' },
  { id: 'Naia', label: 'NAIA' },
  { id: 'Njcaa', label: 'NJCAA' }
];

const collegeAdminTemplates = [
  { id: 'AddAthleticDirector', role: 'athletic_director', title: 'Add Athletic Director' },
  { id: 'AddAssistantAthleticDirector', role: 'assistant_athletic_director', title: 'Add Asst. Athletic Director' },
  { id: 'AddSid', role: 'sports_information_director', title: 'Add SID' },
  { id: 'AddGameDayAdmin', role: 'game_day_admin', title: 'Add Game Day Admin' }
];

const collegeCoachTemplates = [
  { id: 'AddHeadCoachMen', role: 'coach', title: 'Add Head Coach (Men)', memberTitle: 'Head Coach (Men)', lockMemberTitle: true },
  { id: 'AddHeadCoachWomen', role: 'coach', title: 'Add Head Coach (Women)', memberTitle: 'Head Coach (Women)', lockMemberTitle: true },
  { id: 'AddHeadCoachJvMen', role: 'coach', title: 'Add Head Coach (JV Men)', memberTitle: 'Head Coach (JV Men)', lockMemberTitle: true },
  { id: 'AddHeadCoachJvWomen', role: 'coach', title: 'Add Head Coach (JV Women)', memberTitle: 'Head Coach (JV Women)', lockMemberTitle: true }
];

const collegeCoachGroups = ['Men', 'Women'];

const settingsCollegeMemberSections = collegeClassificationGroups.flatMap(group => [
  ...collegeAdminTemplates.map(template => ({
    ...template,
    id: `settings${group.id}${template.id}`,
    group: group.label,
    subGroup: 'Administration'
  })),
  ...collegeCoachGroups.flatMap(coachGroup => collegeCoachTemplates.map(template => ({
    ...template,
    id: `settings${group.id}${coachGroup}${template.id}`,
    group: group.label,
    subGroup: coachGroup
  })))
]);

const settingsHighSchoolMemberSections = [
  { id: 'settingsHighSchoolAddAthleticDirector', role: 'athletic_director', title: 'Add Athletic Director', group: 'High School' },
  { id: 'settingsHighSchoolAddAssistantAthleticDirector', role: 'assistant_athletic_director', title: 'Add Asst. Athletic Director', group: 'High School' },
  { id: 'settingsHighSchoolAddHeadCoachBoysVarsity', role: 'coach', title: 'Add Head Coach (Boys Varsity)', memberTitle: 'Head Coach (Boys Varsity)', lockMemberTitle: true, group: 'High School' },
  { id: 'settingsHighSchoolAddHeadCoachGirlsVarsity', role: 'coach', title: 'Add Head Coach (Girls Varsity)', memberTitle: 'Head Coach (Girls Varsity)', lockMemberTitle: true, group: 'High School' },
  { id: 'settingsHighSchoolAddHeadCoachJvBoys', role: 'coach', title: 'Add Head Coach (JV Boys)', memberTitle: 'Head Coach (JV Boys)', lockMemberTitle: true, group: 'High School' },
  { id: 'settingsHighSchoolAddHeadCoachJvGirls', role: 'coach', title: 'Add Head Coach (JV Girls)', memberTitle: 'Head Coach (JV Girls)', lockMemberTitle: true, group: 'High School' },
  { id: 'settingsHighSchoolAddHeadCoachJrHighBoys', role: 'coach', title: 'Add Head Coach (Jr. High Boys)', memberTitle: 'Head Coach (Jr. High Boys)', lockMemberTitle: true, group: 'High School' },
  { id: 'settingsHighSchoolAddHeadCoachJrHighGirls', role: 'coach', title: 'Add Head Coach (Jr. Girls)', memberTitle: 'Head Coach (Jr. Girls)', lockMemberTitle: true, group: 'High School' },
  { id: 'settingsHighSchoolAddAssistantCoach', role: 'assistant_coach', title: 'Add Asst. Coach', group: 'High School' }
];

const settingsHighSchoolTeamSections = [
  { id: 'settingsHighSchoolAddTeamBoysVarsity', type: 'team', title: 'Add Team (Boys Varsity)', group: 'High School', teamNamePlaceholder: 'Team name' },
  { id: 'settingsHighSchoolAddTeamGirlsVarsity', type: 'team', title: 'Add Team (Girls Varsity)', group: 'High School', teamNamePlaceholder: 'Team name' },
  { id: 'settingsHighSchoolAddTeamJvBoys', type: 'team', title: 'Add Team (JV Boys)', group: 'High School', teamNamePlaceholder: 'Team name' },
  { id: 'settingsHighSchoolAddTeamJvGirls', type: 'team', title: 'Add Team (JV Girls)', group: 'High School', teamNamePlaceholder: 'Team name' },
  { id: 'settingsHighSchoolAddTeamJrHighBoys', type: 'team', title: 'Add Team (Jr. High Boys)', group: 'High School', teamNamePlaceholder: 'Team name' },
  { id: 'settingsHighSchoolAddTeamJrHighGirls', type: 'team', title: 'Add Team (Jr. High Girls)', group: 'High School', teamNamePlaceholder: 'Team name' }
];

const settingsSchoolFormSections = [
  { id: 'settingsAddSchool', type: 'school', title: 'Add School', group: 'School Form' },
  { id: 'settingsAddTeam', type: 'team', title: 'Add Team', group: 'School Form', teamNamePlaceholder: 'Team name' }
];

const settingsEventCenterSections = [
  { id: 'settingsAddEventCenter', type: 'event_center', title: 'Add Event Center', group: 'Event Center' }
];

const settingsMemberWorkflowSections = [
  ...settingsOfficialsSections,
  ...settingsCollegeMemberSections,
  ...settingsHighSchoolMemberSections
];

const settingsScheduleWorkflowSections = [
  ...settingsHighSchoolTeamSections,
  ...settingsSchoolFormSections,
  ...settingsEventCenterSections
];

const settingsWorkflowSections = [
  ...settingsMemberWorkflowSections,
  ...settingsScheduleWorkflowSections
];

const scheduleSetupSections = [
  { id: 'createGameAssignment', type: 'gameForm', label: 'Create Game Assignment', title: 'Create Game Assignment' },
  { id: 'masterSchedule', type: 'masterSchedule', label: 'Master Schedule', title: 'Master Schedule' },
  { id: 'liveMap', type: 'map', label: '2D / 3D Location Map', title: '2D / 3D Official Location Map' }
];

const educationSubSections = [
  { id: 'rtboAcademy', label: 'RTBO Academy', title: 'RTBO Academy' },
  { id: 'tests', label: 'Test Center', title: 'Test Center' }
];

const formsSubSections = [
  { id: 'evaluationForm', label: 'Evaluation Form', title: 'Evaluation Form', source: 'forms' },
  { id: 'contractGenerator', label: 'Contract Generator', title: 'Contract Generator', source: 'forms' }
];

const officialFormsSubSections = [
  { id: 'postgame', label: 'Game Report', title: 'Game Report', source: 'official_forms' }
];

const observerFormsSubSections = [
  { id: 'observerForm', label: 'Observer Form', title: 'Observer Form', source: 'observer_forms' }
];

const paymentSubSections = [
  { id: 'invoiceCreator', label: 'Invoice Creator', title: 'Invoice Creator', source: 'payment_tools', parent: 'payments' }
];

const allFormsSubSections = [
  ...formsSubSections,
  ...officialFormsSubSections,
  ...observerFormsSubSections
];

function uniqueFormSubSections(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const gameReportRuleSets = [
  ['NFHS', 'High School (NFHS)'],
  ['NCAAW', 'NCAA Women'],
  ['NCAAM', 'NCAA Men']
];

const gameReportIncidentOptions = {
  NFHS: [
    'Technical Foul',
    'Intentional Foul',
    'Flagrant Foul',
    'Bench Technical',
    'Disqualifying Foul',
    'Spectator Issue',
    'Game Management Concern'
  ],
  NCAAW: [
    'Technical Foul',
    'Flagrant 1',
    'Flagrant 2',
    'Bench Technical',
    'Fighting Situation',
    'Game Interruption'
  ],
  NCAAM: [
    'Class A Technical',
    'Class B Technical',
    'Flagrant 1',
    'Flagrant 2',
    'Bench Technical',
    'Administrative Technical'
  ]
};

const gameReportQualityOptions = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Poor'];
const dressingRoomConditionOptions = ['Excellent', 'Clean & Professional', 'Adequate', 'Needs Attention', 'Unsatisfactory', 'No Dressing Room Provided'];

const observerObservationCategories = [
  { id: 'pregame', title: 'Pre-Game Preparation', weight: 15 },
  { id: 'mechanics', title: 'Mechanics & Positioning', weight: 20 },
  { id: 'judgment', title: 'Judgment & Decision-Making', weight: 20 },
  { id: 'communication', title: 'Communication & Presence', weight: 15 },
  { id: 'management', title: 'Game Management', weight: 20 },
  { id: 'crew', title: 'Crew Dynamics', weight: 10 }
];

const observerObservationTypes = [
  ['live_game', 'Live Game'],
  ['livestream', 'Livestream'],
  ['film_review', 'Film Review']
];

function createGameReportIncident() {
  return {
    type: '',
    player: '',
    team: '',
    time: '',
    description: ''
  };
}

function createGameReportForm() {
  return {
    assignmentId: '',
    gameId: '',
    ruleSet: 'NFHS',
    tablePerformance: '',
    dressingRoomCondition: '',
    gameDate: new Date().toISOString().slice(0, 10),
    gameSite: '',
    gameLevel: '',
    homeTeam: '',
    visitingTeam: '',
    homeScore: '',
    visitingScore: '',
    finalScore: '',
    refereeName: '',
    umpire1Name: '',
    umpire2Name: '',
    crewChief: '',
    official2: '',
    official3: '',
    notes: '',
    certification: false
  };
}

function createObserverScores() {
  return Object.fromEntries(observerObservationCategories.map(category => [category.id, 3]));
}

function createObserverForm() {
  return {
    observationType: 'live_game',
    observerName: '',
    gameDate: new Date().toISOString().slice(0, 10),
    gameLevel: '',
    gameSite: '',
    homeTeam: '',
    visitingTeam: '',
    crewChief: '',
    official2: '',
    official3: '',
    videoUrl: '',
    strengths: '',
    concerns: '',
    recommendations: '',
    followUp: '',
    certification: false
  };
}

function observerCrewRanking(score) {
  if (score >= 4.75) return 'Elite Crew';
  if (score >= 4.25) return 'Advanced Crew';
  if (score >= 3.75) return 'Developing Crew';
  if (score >= 3) return 'Standard Crew';
  return 'Follow-Up Required';
}

function money(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const rtboInvoiceContact = {
  address: '815 Technology Dr., Box 241445. Little Rock, AR 72223',
  phone: 'Ph# (501) 240-4961',
  email: 'Email: admin@rtbofficiating.com',
  web: 'https://rtbofficiating.com'
};

const rtboInvoiceContactItems = [
  ['⌂', 'Address', rtboInvoiceContact.address],
  ['☎', 'Phone', rtboInvoiceContact.phone],
  ['✉', 'Email', rtboInvoiceContact.email],
  ['◎', 'Website', rtboInvoiceContact.web]
];

const rtboInvoiceBlindCopyEmail = 'mrbballref1775@yahoo.com';

const invoiceFeeRows = [
  {
    key: 'assigning',
    label: 'Assigning Fees',
    typeName: 'assigningFeeType',
    itemsName: 'assigningItems',
    qtyName: 'assigningQty',
    rateName: 'assigningRate',
    totalName: 'assigningFee',
    typeField: 'assigning_fee_type',
    itemsField: 'assigning_fee_items',
    qtyField: 'assigning_qty',
    rateField: 'assigning_rate',
    totalField: 'assigning_fee',
    options: ['Assigning Fees', 'Game Assigning Fee', 'Tournament Assigning Fee', 'Administrative Assigning Fee', 'Scheduling Service Fee']
  },
  {
    key: 'officials',
    label: 'Officials Fees',
    typeName: 'officialsFeeType',
    itemsName: 'officialsItems',
    qtyName: 'officialsQty',
    rateName: 'officialsRate',
    totalName: 'officialsFee',
    typeField: 'officials_fee_type',
    itemsField: 'officials_fee_items',
    qtyField: 'officials_qty',
    rateField: 'officials_rate',
    totalField: 'officials_fee',
    options: ['Officials Fees', 'Game Officials Fee', 'Crew Fee', 'Tournament Officials Fee', 'Observer / Evaluator Fee']
  },
  {
    key: 'travel',
    label: 'Travel Fees',
    typeName: 'travelFeeType',
    itemsName: 'travelItems',
    qtyName: 'travelQty',
    rateName: 'travelRate',
    totalName: 'travelFee',
    typeField: 'travel_fee_type',
    itemsField: 'travel_fee_items',
    qtyField: 'travel_qty',
    rateField: 'travel_rate',
    totalField: 'travel_fee',
    options: ['Travel Fees', 'Mileage Reimbursement', 'Lodging / Travel Fee', 'Per Diem', 'Parking / Toll Fee']
  },
  {
    key: 'additional',
    label: 'Additional Fees',
    typeName: 'additionalFeeType',
    itemsName: 'additionalItems',
    qtyName: 'additionalQty',
    rateName: 'additionalRate',
    totalName: 'additionalFee',
    typeField: 'additional_fee_type',
    itemsField: 'additional_fee_items',
    qtyField: 'additional_qty',
    rateField: 'additional_rate',
    totalField: 'additional_fee',
    options: ['Additional Fees', 'Rush Scheduling Fee', 'Game Change Fee', 'Late Payment Fee', 'Custom Additional Fee']
  }
];

function invoiceFeeDefaults() {
  return invoiceFeeRows.reduce((defaults, row) => ({
    ...defaults,
    [row.typeName]: [],
    [row.itemsName]: [],
    [row.qtyName]: '',
    [row.rateName]: '',
    [row.totalName]: ''
  }), {});
}

function invoiceNumberValue(value) {
  const amount = Number(String(value ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function invoiceLineAmount(invoice = {}, row) {
  return invoiceCategoryItems(invoice, row)
    .filter(isInvoiceLineItemComplete)
    .reduce((total, item) => total + invoiceItemAmount(item), 0);
}

function invoiceItemAmount(item = {}) {
  const qty = invoiceNumberValue(item.qty);
  const rate = invoiceNumberValue(item.rate);
  return Math.round(qty * rate * 100) / 100;
}

function isInvoiceLineItemComplete(item = {}) {
  return Boolean(String(item.description || '').trim())
    && invoiceNumberValue(item.qty) > 0
    && invoiceNumberValue(item.rate) > 0
    && invoiceItemAmount(item) > 0;
}

function invoiceQuantityLabel(value) {
  const qty = invoiceNumberValue(value);
  return qty.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function invoiceArrayValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return invoiceArrayValue(parsed);
    } catch {
      return trimmed.split(',').map(item => item.trim()).filter(Boolean);
    }
    return trimmed.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeInvoiceItems(value) {
  const source = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      })()
    : value;
  if (!Array.isArray(source)) return [];
  return source
    .map(item => ({
      description: String(item?.description || item?.label || '').trim(),
      qty: String(item?.qty ?? '1'),
      rate: String(item?.rate ?? '')
    }))
    .filter(item => item.description);
}

function invoiceCategoryItems(invoice = {}, row) {
  const savedItems = normalizeInvoiceItems(invoice[row.itemsName] ?? invoice[row.itemsField]);
  if (savedItems.length > 0) return savedItems;

  const selectedDescriptions = invoiceArrayValue(invoice[row.typeName] ?? invoice[row.typeField]);
  return selectedDescriptions.map(description => ({
    description,
    qty: String(invoice[row.qtyName] ?? invoice[row.qtyField] ?? '1'),
    rate: String(invoice[row.rateName] ?? invoice[row.rateField] ?? invoice[row.totalName] ?? invoice[row.totalField] ?? '')
  }));
}

function invoiceItemErrorName(row, description, field) {
  return `${row.itemsName}-${String(description || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${field}`;
}

function invoiceWithComputedTotals(invoice = {}) {
  const totals = invoiceTotals(invoice);
  return invoiceFeeRows.reduce((record, row) => {
    const completedItems = invoiceCategoryItems(invoice, row).filter(isInvoiceLineItemComplete);
    return {
      ...record,
      [row.typeName]: completedItems.map(item => item.description),
      [row.itemsName]: completedItems,
      [row.totalName]: totals[row.key].toFixed(2)
    };
  }, { ...invoice, blindCopyEmail: rtboInvoiceBlindCopyEmail });
}

function invoiceLineItems(invoice = {}) {
  return invoiceFeeRows.flatMap(row => invoiceCategoryItems(invoice, row)
    .filter(isInvoiceLineItemComplete)
    .map((item, index) => ({
      key: `${row.key}-${item.description}-${index}`,
      category: row.label,
      description: item.description,
      qty: item.qty || '0',
      rate: invoiceNumberValue(item.rate),
      amount: invoiceItemAmount(item)
    })));
}

function invoiceHtmlEscape(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function invoiceFileName(invoice = {}) {
  const source = invoice.invoiceNumber || invoice.invoice_number || 'RTBO-Invoice';
  const safeName = String(source).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return `${safeName || 'RTBO-Invoice'}.html`;
}

function invoicePdfFileName(invoice = {}) {
  const source = invoice.invoiceNumber || invoice.invoice_number || 'RTBO-Invoice';
  const safeName = String(source).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return `${safeName || 'RTBO-Invoice'}.pdf`;
}

function invoiceDisplayLines(value, fallback = '') {
  const lines = String(value || fallback || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.length ? lines : [fallback].filter(Boolean);
}

function invoiceCompletedLines(...values) {
  return values
    .flatMap(value => String(value || '').split(/\r?\n/))
    .map(line => line.trim())
    .filter(Boolean);
}

function invoiceShortDate(value) {
  if (!value) return 'Date Pending';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function invoiceDetailRows(invoice = {}) {
  const referenceValue = invoice.referenceNumber || invoice.reference || invoice.invoiceNumber || 'Reference Pending';
  return [
    ['Invoice #:', invoice.invoiceNumber || 'RTBO-0000-000'],
    ['Invoice Date:', invoiceShortDate(invoice.invoiceDate)],
    ['Reference #:', referenceValue],
    ['Due Date:', invoiceShortDate(invoice.dueDate)],
    ['Event:', invoice.eventName],
    ['Game Level:', invoice.gameLevel]
  ].filter(([, value]) => String(value || '').trim());
}

const rtboInvoiceMailToLines = [
  'Montrel Simmons, DBA',
  'Raising The Bar Officiating Inc.',
  '815 Technology Dr., Box 241445',
  'Little Rock, AR 72223'
];

function invoiceStandaloneDocument(invoice = {}) {
  const printableInvoice = invoiceWithComputedTotals(invoice);
  const totals = invoiceTotals(printableInvoice);
  const lineItems = invoiceLineItems(printableInvoice);
  const logoUrl = typeof window !== 'undefined'
    ? new URL(image('logo.png'), window.location.origin).href
    : image('logo.png');
  const billToLines = invoiceCompletedLines(
    printableInvoice.schoolName || 'School / Organization',
    printableInvoice.contactName && `Attn: ${printableInvoice.contactName}`,
    printableInvoice.email && `Email: ${printableInvoice.email}`,
    printableInvoice.phone && `Phone: ${formatPhoneNumber(printableInvoice.phone)}`,
    printableInvoice.address || 'Billing Address'
  );
  const shipToLines = invoiceCompletedLines(
    printableInvoice.schoolName || 'School / Organization',
    printableInvoice.address || 'Shipping Address'
  );
  const detailRows = invoiceDetailRows(printableInvoice);
  const htmlLines = (lines = []) => lines
    .map(line => `<p>${invoiceHtmlEscape(line)}</p>`)
    .join('');
  const detailRowsHtml = detailRows.map(([label, value]) => `
            <div><dt>${invoiceHtmlEscape(label)}</dt><dd>${invoiceHtmlEscape(value)}</dd></div>`).join('');
  const lineRows = lineItems.map(item => `
          <tr>
            <td>${invoiceHtmlEscape(item.description)}</td>
            <td>${invoiceHtmlEscape(money(item.rate))}</td>
            <td>${invoiceHtmlEscape(invoiceQuantityLabel(item.qty))}</td>
            <td>${invoiceHtmlEscape(money(item.amount))}</td>
          </tr>`).join('');
  const feeTable = lineItems.length > 0 ? `
      <table>
        <thead>
          <tr><th>Description</th><th>Price</th><th>Quantity</th><th>Amount</th></tr>
        </thead>
        <tbody>
          ${lineRows}
        </tbody>
      </table>
      <section class="totals">
        <p>Sub-total</p>
        <div><span>Total</span><strong>${invoiceHtmlEscape(money(totals.total))}</strong></div>
      </section>` : '';
  const notes = String(printableInvoice.notes || '').trim();
  const creditCardMessage = '';
  const notesBlock = notes ? `<p>${invoiceHtmlEscape(notes)}</p>` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${invoiceHtmlEscape(printableInvoice.invoiceNumber || 'RTBO Invoice')}</title>
  <style>
    @page { size: letter; margin: .32in; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #000; background: #fff; font-family: "Trebuchet MS", Arial, Helvetica, sans-serif; }
    .invoice { position: relative; width: 7.86in; min-height: 10.36in; margin: 0 auto; overflow: hidden; background: #fff; }
    .watermark { position: absolute; inset: 2.72in .4in 1.62in; z-index: 0; width: calc(100% - .8in); height: calc(100% - 4.34in); object-fit: contain; opacity: .15; pointer-events: none; user-select: none; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    header, main, footer { position: relative; z-index: 1; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: .24in; min-height: 1.18in; padding: .38in .44in .1in; background: #050505; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    h1 { margin: 0; color: #f58220; font-family: Arial, Helvetica, sans-serif; font-size: 40px; line-height: .95; }
    header img { width: .86in; height: .86in; object-fit: contain; }
    main { display: grid; grid-template-rows: auto auto 1fr auto auto; min-height: 8.78in; padding: .12in .44in .24in; }
    .meta { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(2.4in, .9fr); gap: .36in; }
    .parties { display: grid; gap: .18in; }
    h2 { margin: 0 0 4px; color: #000; font-size: 12px; font-weight: 900; text-decoration: underline; }
    p { margin: 0; color: #000; font-size: 12px; line-height: 1.25; }
    .details { display: grid; gap: .24in; justify-items: end; text-align: left; }
    dl { display: grid; gap: 3px; width: 2.95in; margin: 0; }
    dl div { display: grid; grid-template-columns: 1.18in minmax(0, 1fr); gap: .16in; align-items: baseline; }
    dt, dd { margin: 0; color: #000; font-size: 12px; line-height: 1.25; }
    dt { font-weight: 900; text-align: right; }
    dd { font-weight: 700; text-align: left; }
    .mail-to { display: grid; grid-template-columns: 1.18in minmax(0, 1fr); gap: .16in; width: 2.95in; }
    .mail-to h2 { margin: 0; text-align: right; }
    .mail-to div { text-align: left; }
    table { width: 100%; margin-top: .36in; border-collapse: collapse; }
    th, td { border: 0; padding: 8px 6px; color: #000; font-size: 12px; text-align: left; vertical-align: top; }
    th { border-right: 1px solid rgba(255, 255, 255, .25); color: #000; background: #f58220; font-weight: 900; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    th:last-child { border-right: 0; }
    th:nth-child(2), td:nth-child(2), th:nth-child(3), td:nth-child(3) { text-align: center; }
    th:last-child, td:last-child { text-align: right; }
    td:first-child { font-weight: 900; }
    .totals { display: grid; justify-self: end; gap: .2in; width: 2.76in; margin-top: .82in; margin-left: auto; margin-right: 0; }
    .totals p { font-weight: 700; }
    .totals div { display: grid; grid-template-columns: 1fr minmax(.92in, auto); gap: .18in; border-top: 1px solid #000; color: #000; background: transparent; }
    .totals span, .totals strong { display: block; padding: 7px 0; color: #000; font-size: 10px; line-height: 1.15; }
    .totals span { font-weight: 900; text-align: right; }
    .totals strong { text-align: right; }
    .terms { align-self: end; justify-self: start; width: min(100%, 4.2in); margin-top: .4in; }
    .terms h2 { text-decoration: none; }
    .credit-card { color: #000; font-weight: 900; }
    .closing { align-self: end; justify-self: center; display: grid; gap: 2px; margin: .18in 0 .36in; text-align: center; }
    .closing p { font-family: Georgia, "Times New Roman", serif; font-size: 14px; font-style: italic; font-weight: 800; line-height: 1.1; }
    footer { display: flex; justify-content: space-between; align-items: end; gap: .2in; padding: 0 .44in .08in; }
    footer div { display: grid; gap: 2px; }
    footer span, footer strong { color: #000; font-size: 11px; font-weight: 900; line-height: 1.2; }
    @media screen and (max-width: 620px) { .invoice { width: 100%; min-height: 0; } header, main, footer { padding-left: 20px; padding-right: 20px; } .meta { grid-template-columns: 1fr; } .details { justify-items: start; text-align: left; } dl, .mail-to { width: min(100%, 2.95in); } dl div, .mail-to { grid-template-columns: 1.05in minmax(0, 1fr); gap: .12in; } dd { text-align: left; } }
    @media print { body { background: #fff; } .invoice { width: 7.86in; min-height: 10.36in; page-break-inside: avoid; break-inside: avoid; } }
  </style>
</head>
<body>
  <article class="invoice">
    <img class="watermark" src="${invoiceHtmlEscape(logoUrl)}" alt="" aria-hidden="true">
    <header>
      <h1>INVOICE</h1>
      <img src="${invoiceHtmlEscape(logoUrl)}" alt="Raising The Bar Officiating Inc. logo">
    </header>
    <main>
      <section class="meta">
        <section class="parties">
          <div>
            <h2>Bill To:</h2>
            ${htmlLines(billToLines)}
          </div>
          <div>
            <h2>Ship To:</h2>
            ${htmlLines(shipToLines)}
          </div>
        </section>
        <section class="details">
          <dl>
            ${detailRowsHtml}
          </dl>
          <div class="mail-to">
            <h2>Mail To:</h2>
            <div>
              ${htmlLines(rtboInvoiceMailToLines)}
            </div>
          </div>
        </section>
      </section>
      ${feeTable}
      <section class="terms">
        <h2>Terms &amp; Conditions</h2>
        <p>Payment is due within 14 days.</p>
        <p>You may pay by check by submitting it to Pay to the order of</p>
        <p>Montrel Simmons, DBA Raising The Bar Officiating Inc.</p>
        ${notesBlock}
        ${creditCardMessage}
      </section>
      <div class="closing">
        <p>We Will Serve, and Will Be Of Service To The Game!</p>
        <p>Thank you for your trust!</p>
      </div>
    </main>
    <footer>
      <div>
        <span>Home: ${invoiceHtmlEscape(rtboInvoiceContact.address)}</span>
        <span>Phone: ${invoiceHtmlEscape(rtboInvoiceContact.phone.replace('Ph# ', ''))}</span>
        <span>Email: ${invoiceHtmlEscape(rtboInvoiceContact.email.replace('Email: ', ''))}</span>
      </div>
      <strong>1/1</strong>
    </footer>
  </article>
</body>
</html>`;
}

async function requestInvoiceSaveTarget(invoice = {}) {
  const suggestedName = invoiceFileName(invoice);
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Printable invoice HTML',
          accept: { 'text/html': ['.html'] }
        }]
      });
      return { type: 'file-picker', handle };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { type: 'canceled' };
      }
    }
  }

  return { type: 'download', suggestedName };
}

async function saveInvoiceToComputer(invoice = {}, target = { type: 'download' }) {
  if (target?.type === 'canceled') {
    return { saved: false, canceled: true };
  }

  const html = invoiceStandaloneDocument(invoice);
  const fileName = target?.suggestedName || invoiceFileName(invoice);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

  if (target?.type === 'file-picker' && target.handle) {
    const writable = await target.handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { saved: true, method: 'file-picker' };
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { saved: true, method: 'download' };
}

function invoicePdfBlob(pdf = {}) {
  const base64 = String(pdf.contentBase64 || '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: pdf.mimeType || 'application/pdf' });
}

async function requestInvoicePdfSaveTarget(invoice = {}) {
  const suggestedName = invoicePdfFileName(invoice);
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Printable invoice PDF',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
      return { type: 'file-picker', handle, suggestedName };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { type: 'canceled', suggestedName };
      }
    }
  }

  return { type: 'download', suggestedName };
}

async function saveInvoicePdfToComputer(pdf = {}, target = { type: 'download' }) {
  if (target?.type === 'canceled') {
    return { saved: false, canceled: true };
  }

  const blob = invoicePdfBlob(pdf);
  const fileName = target?.suggestedName || pdf.fileName || 'RTBO-Invoice.pdf';

  if (target?.type === 'file-picker' && target.handle) {
    const writable = await target.handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { saved: true, method: 'file-picker' };
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { saved: true, method: 'download' };
}

function invoicePdfSaveMessage(result = {}) {
  if (result.canceled) return 'PDF save was canceled.';
  if (result.method === 'file-picker') return 'PDF saved to the selected location.';
  if (result.method === 'download') return 'PDF downloaded by the browser.';
  return 'PDF is ready.';
}

const invoiceRequiredFields = [
  ['invoiceNumber', 'Invoice number is required.'],
  ['invoiceDate', 'Invoice date is required.'],
  ['dueDate', 'Due date is required.'],
  ['schoolName', 'School / organization is required.'],
  ['contactName', 'Contact person is required.'],
  ['email', 'Email address is required.'],
  ['phone', 'Phone number is required.'],
  ['address', 'Billing address is required.'],
  ['eventName', 'Event / game name is required.'],
  ['gameLevel', 'Game level is required.']
];

function validateInvoiceForm(invoice = {}) {
  const errors = {};
  invoiceRequiredFields.forEach(([name, message]) => {
    if (!String(invoice[name] || '').trim()) {
      errors[name] = message;
    }
  });

  if (String(invoice.email || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(invoice.email).trim())) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}

function InvoiceFieldError({ errors, name }) {
  if (!errors[name]) return null;
  return <span className="rtbo-invoice-field-error" id={`invoice-error-${name}`}>{errors[name]}</span>;
}

function invoiceNumberFromList(invoices = []) {
  const year = new Date().getFullYear();
  const prefix = `RTBO-${year}-`;
  const maxNumber = invoices.reduce((max, invoice) => {
    const value = String(invoice.invoiceNumber || invoice.invoice_number || '');
    if (!value.startsWith(prefix)) return max;
    const numeric = Number(value.slice(prefix.length));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;
}

function createInvoiceForm(invoices = []) {
  const today = new Date();
  const due = new Date(today);
  due.setDate(today.getDate() + 14);
  return {
    id: 0,
    invoiceNumber: invoiceNumberFromList(invoices),
    invoiceDate: today.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    schoolName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    eventName: '',
    gameLevel: '',
    ...invoiceFeeDefaults(),
    creditCardRequested: false,
    notes: '',
    status: 'ready'
  };
}

function normalizeInvoiceRecord(invoice = {}) {
  const normalized = {
    ...createInvoiceForm(),
    ...invoice,
    id: Number(invoice.id || 0),
    invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || '',
    invoiceDate: invoice.invoiceDate || invoice.invoice_date || '',
    dueDate: invoice.dueDate || invoice.due_date || '',
    schoolName: invoice.schoolName || invoice.school_name || '',
    contactName: invoice.contactName || invoice.contact_name || '',
    phone: formatPhoneNumber(invoice.phone || ''),
    eventName: invoice.eventName || invoice.event_name || '',
    gameLevel: invoice.gameLevel || invoice.game_level || '',
    creditCardRequested: Boolean(invoice.creditCardRequested ?? invoice.credit_card_requested ?? false),
    createdAt: invoice.createdAt || invoice.created_at || '',
    updatedAt: invoice.updatedAt || invoice.updated_at || ''
  };

  invoiceFeeRows.forEach(row => {
    const savedTotal = invoice[row.totalName] ?? invoice[row.totalField] ?? '';
    const savedQty = invoice[row.qtyName] ?? invoice[row.qtyField];
    const savedRate = invoice[row.rateName] ?? invoice[row.rateField];
    const savedItems = normalizeInvoiceItems(invoice[row.itemsName] ?? invoice[row.itemsField]);
    const selectedDescriptions = savedItems.length > 0
      ? savedItems.map(item => item.description)
      : invoiceArrayValue(invoice[row.typeName] ?? invoice[row.typeField]);
    const items = savedItems.length > 0
      ? savedItems
      : selectedDescriptions.map(description => ({
          description,
          qty: savedQty !== undefined && savedQty !== null && savedQty !== '' ? String(savedQty) : '1',
          rate: savedRate !== undefined && savedRate !== null && savedRate !== '' ? String(savedRate) : String(savedTotal || '')
        }));
    normalized[row.typeName] = items.map(item => item.description);
    normalized[row.itemsName] = items;
    normalized[row.qtyName] = items[0]?.qty || '';
    normalized[row.rateName] = items[0]?.rate || '';
    normalized[row.totalName] = invoiceLineAmount(normalized, row).toFixed(2);
  });

  return normalized;
}

function invoiceTotals(invoice = {}) {
  const assigning = invoiceLineAmount(invoice, invoiceFeeRows[0]);
  const officials = invoiceLineAmount(invoice, invoiceFeeRows[1]);
  const travel = invoiceLineAmount(invoice, invoiceFeeRows[2]);
  const additional = invoiceLineAmount(invoice, invoiceFeeRows[3]);
  const subtotal = assigning + officials + travel + additional;
  return { assigning, officials, travel, additional, subtotal, total: subtotal };
}

const memberRoleOptions = [
  ['official', 'Official'],
  ['coach', 'Coach'],
  ['assistant_coach', 'Assistant Coach'],
  ['athletic_director', 'Athletic Director'],
  ['assistant_athletic_director', 'Assistant Athletic Director'],
  ['sports_information_director', 'Sports Information Director'],
  ['conference_commissioner', 'Conference Commissioner'],
  ['game_day_admin', 'Game Day Admin'],
  ['assignor', 'Assignor'],
  ['observer', 'Observer'],
  ['evaluator', 'Evaluator'],
  ['admin', 'Admin']
];

const directoryScheduleRoleOptions = [
  ['school', 'School'],
  ['event_center', 'Event Center'],
  ['team', 'Team']
];

const coachAssignmentOptions = [
  ['', 'Select coaching assignment'],
  ['Head Coach Var Boys', 'Head Coach Var Boys'],
  ['Head Coach Var Girls', 'Head Coach Var Girls'],
  ['Head Coach Jr. Var Boys', 'Head Coach Jr. Var Boys'],
  ['Head Coach Jr. Var Girls', 'Head Coach Jr. Var Girls'],
  ['Head Coach (Men)', 'Head Coach (Men)'],
  ['Head Coach (Women)', 'Head Coach (Women)'],
  ['Head Coach (JV Men)', 'Head Coach (JV Men)'],
  ['Head Coach (JV Women)', 'Head Coach (JV Women)'],
  ['Head Coach (Boys Varsity)', 'Head Coach (Boys Varsity)'],
  ['Head Coach (Girls Varsity)', 'Head Coach (Girls Varsity)'],
  ['Head Coach (JV Boys)', 'Head Coach (JV Boys)'],
  ['Head Coach (JV Girls)', 'Head Coach (JV Girls)'],
  ['Head Coach (Jr. High Boys)', 'Head Coach (Jr. High Boys)'],
  ['Head Coach (Jr. Girls)', 'Head Coach (Jr. Girls)'],
  ['Head Coach 9th Boys', 'Head Coach 9th Boys'],
  ['Head Coach 9th Girls', 'Head Coach 9th Girls'],
  ['Head Coach 8th Boys', 'Head Coach 8th Boys'],
  ['Head Coach 8th Girls', 'Head Coach 8th Girls'],
  ['AAU Boys', 'AAU Boys'],
  ['AAU Girls', 'AAU Girls'],
  ['Showcase Boys', 'Showcase Boys'],
  ['Showcase Girls', 'Showcase Girls']
];

const gameAssignmentLevelOptions = [
  ['', 'Select game type'],
  ['High School Jr. High Girls', 'High School Jr. High Girls'],
  ['High School Jr. High Boys', 'High School Jr. High Boys'],
  ['High School Jr. Varsity Girls', 'High School Jr. Varsity Girls'],
  ['High School Jr. Varsity Boys', 'High School Jr. Varsity Boys'],
  ['8th Grade Girls', '8th Grade Girls'],
  ['8th Grade Boys', '8th Grade Boys'],
  ['Varsity Girls', 'Varsity Girls'],
  ['Varsity Boys', 'Varsity Boys'],
  ['NJCAA Women', 'NJCAA Women'],
  ['NJCAA Men', 'NJCAA Men'],
  ['NAIA Women', 'NAIA Women'],
  ['NAIA Men', 'NAIA Men'],
  ['NCAA DIII Women', 'NCAA DIII Women'],
  ['NCAA DIII Men', 'NCAA DIII Men'],
  ['NCAA DII Women', 'NCAA DII Women'],
  ['NCAA DII Men', 'NCAA DII Men'],
  ['NCAA DI Women', 'NCAA DI Women'],
  ['NCAA DI Men', 'NCAA DI Men'],
  ['Pro-Am Women', 'Pro-Am Women'],
  ['Pro-Am Men', 'Pro-Am Men']
];

const fallbackAssignmentPositions = [
  { id: 1, name: 'Referee', sort_order: 1 },
  { id: 2, name: 'Umpire 1', sort_order: 2 },
  { id: 3, name: 'Umpire 2', sort_order: 3 },
  { id: 4, name: 'Alternate', sort_order: 4 }
];

function sortedAssignmentPositions(positions = fallbackAssignmentPositions) {
  const source = Array.isArray(positions) && positions.length > 0 ? positions : fallbackAssignmentPositions;
  return [...source].sort((first, second) => Number(first.sort_order || 0) - Number(second.sort_order || 0));
}

function positionByName(positions = [], name = '') {
  const normalized = String(name || '').toLowerCase();
  return sortedAssignmentPositions(positions).find(position => String(position.name || '').toLowerCase() === normalized) || null;
}

function requiredPositionIdsForCrewSize(positions = [], size = 3) {
  const names = ['Referee', 'Umpire 1', 'Umpire 2'];
  if (Number(size) >= 4) names.push('Alternate');

  return names
    .map(name => positionByName(positions, name))
    .filter(Boolean)
    .map(position => String(position.id));
}

function requiredPositionsForGame(game = {}, positions = []) {
  const ids = Array.isArray(game.required_position_ids) && game.required_position_ids.length > 0
    ? game.required_position_ids.map(id => String(id))
    : requiredPositionIdsForCrewSize(positions, game.officials_required || 3);
  const orderedPositions = sortedAssignmentPositions(positions);

  return ids
    .map(id => orderedPositions.find(position => String(position.id) === String(id)))
    .filter(Boolean);
}

function buildCrewFormForGame(game = {}, positions = []) {
  const requiredPositions = requiredPositionsForGame(game, positions);
  const existingAssignments = Array.isArray(game.assignments) ? game.assignments : [];

  return requiredPositions.reduce((next, position) => {
    const currentAssignment = existingAssignments.find(assignment => String(assignment.position_id) === String(position.id));
    next[String(position.id)] = currentAssignment?.official_id ? String(currentAssignment.official_id) : '';
    return next;
  }, {});
}

function missingCrewPositions(game = {}, positions = []) {
  const assignments = Array.isArray(game.assignments) ? game.assignments : [];
  return requiredPositionsForGame(game, positions).filter(position => {
    const assignment = assignments.find(item => String(item.position_id) === String(position.id));
    return !assignment?.official_id || String(assignment.status || '').toLowerCase() === 'declined';
  });
}

function isCrewComplete(game = {}, positions = []) {
  return missingCrewPositions(game, positions).length === 0;
}

function officialUnavailableRecordForGame(official = {}, game = {}) {
  const gameDate = String(game.game_date || '');
  if (!gameDate) return null;
  const records = Array.isArray(official.availability) ? official.availability : [];
  return records.find(record => (
    String(record.date || '') === gameDate
    && String(record.status || '').toLowerCase().includes('unavailable')
  )) || null;
}

function officialContactRequiredRecordForGame(official = {}, game = {}) {
  const gameDate = String(game.game_date || '');
  if (!gameDate) return null;
  const records = Array.isArray(official.availability) ? official.availability : [];
  return records.find(record => (
    String(record.date || '') === gameDate
    && Boolean(record.contact_required)
    && String(record.status || '').toLowerCase().includes('available')
  )) || null;
}

function officialOptionLabel(official = {}) {
  const name = official.name || [official.first_name, official.last_name].filter(Boolean).join(' ') || official.email || 'Official';
  const location = [official.city, official.state].filter(Boolean).join(', ');
  return location ? `${name} - ${location}` : name;
}

const organizationSections = [
  { id: 'competitionClassification', target: 'organizations', label: 'Competition Classification', title: 'Competition Classification' }
];

function conferenceOptionsForClassification(record = {}) {
  const name = String(record.name || '').trim().toLowerCase();
  return Object.entries(classificationConferenceOptions)
    .find(([classification]) => classification.toLowerCase() === name)?.[1] || [];
}

function AddMemberForm({ role = 'official', title = 'Add Official', onStatus, memberTitle = '', lockMemberTitle = false, workflowGroup = 'Add Members' }) {
  const emptyMember = {
    first_name: '',
    last_name: '',
    role,
    email: '',
    phone: '',
    member_title: memberTitle,
    official_classification: '',
    sex: '',
    race: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    status: 'inactive',
    password: ''
  };
  const [form, setForm] = useState(emptyMember);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({ ...emptyMember, role });
    setError('');
  }, [role, memberTitle]);

  function updateMemberForm(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: formatFormFieldValue(name, value) }));
  }

  function resetForm() {
    setForm({ ...emptyMember, role });
    setError('');
  }

  async function saveMember(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const memberPayload = {
        ...form,
        role,
        organization: '',
        school_id: 0,
        official_rank: '',
        conferences: '',
        experience: ''
      };
      const data = await apiPostJson('/admin-members.php', {
        action: 'create',
        member: memberPayload
      });
      resetForm();
      onStatus?.(data.message || `${title.replace('Add ', '')} saved. The invitation email has been queued by the server.`);
    } catch (caught) {
      setError(caught.message || 'Member could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rtbo-dashboard-card rtbo-members-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">{workflowGroup}</p>
          <h3>{title}</h3>
          <p>Create this member profile, send the invitation email, and keep the account inactive until the user completes their own profile and uploads a profile picture.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={resetForm} disabled={saving}>Clear Form</button>
        </div>
      </div>

      <form className="rtbo-member-form" onSubmit={saveMember}>
        <div className="grid three">
          <label>First Name<input name="first_name" value={form.first_name} onChange={updateMemberForm} required /></label>
          <label>Last Name<input name="last_name" value={form.last_name} onChange={updateMemberForm} required /></label>
          <label>Email<input type="email" name="email" value={form.email} onChange={updateMemberForm} required /></label>
        </div>
        <div className="grid two">
          <label>Phone<input type="tel" name="phone" value={form.phone} onChange={updateMemberForm} inputMode="tel" autoComplete="tel" maxLength="14" placeholder="(xxx) xxx-xxxx" /></label>
          <PasswordField label="Temporary Password" name="password" value={form.password} onChange={updateMemberForm} autoComplete="new-password" required />
        </div>
        {role === 'official' && (
          <div className="grid one">
            <label>Official Classification
              <select name="official_classification" value={form.official_classification} onChange={updateMemberForm} required>
                <option value="">Select official classification</option>
                {officialClassificationOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
        )}
        {role === 'coach' && (
          <div className="grid one">
            <label>Coach Assignment
              <select name="member_title" value={form.member_title} onChange={updateMemberForm} required disabled={lockMemberTitle}>
                {memberTitle && !coachAssignmentOptions.some(([value]) => value === memberTitle) && <option value={memberTitle}>{memberTitle}</option>}
                {coachAssignmentOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="grid two">
          <label>Sex<select name="sex" value={form.sex} onChange={updateMemberForm} required>{sexOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label>
          <label>Race<select name="race" value={form.race} onChange={updateMemberForm}>{raceOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="grid two">
          <label>Address 1<input name="address_line1" value={form.address_line1} onChange={updateMemberForm} /></label>
          <label>Address 2<input name="address_line2" value={form.address_line2} onChange={updateMemberForm} /></label>
        </div>
        <div className="grid three">
          <label>City<input name="city" value={form.city} onChange={updateMemberForm} /></label>
          <label>State<StateSelect value={form.state} onChange={updateMemberForm} /></label>
          <label>Zip<input name="zip" value={form.zip} onChange={updateMemberForm} /></label>
        </div>
        <div className="rtbo-member-actions">
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : title}</button>
        </div>
        {error && <p className="form-message error">{error}</p>}
      </form>
    </section>
  );
}

function courtOptionsFromRecord(record = {}) {
  const labels = String(record.court_labels || '')
    .split(/,|\n/)
    .map(item => item.trim())
    .filter(Boolean);
  if (Array.isArray(record.court_options) && record.court_options.length > 0) {
    return record.court_options.map(option => String(option).trim()).filter(Boolean);
  }
  if (labels.length > 0) return labels;
  const count = Math.max(1, Number(record.courts || 1));
  if (count === 1) return [record.gym_name || 'Main'];
  return Array.from({ length: count }, (_, index) => `Court ${index + 1}`);
}

function teamOptionLabel(team = {}, schools = []) {
  const linkedSchool = schools.find(school => String(school.id) === String(team.school_id));
  const schoolName = team.school_name || linkedSchool?.name || '';
  return `${team.name || 'Team'}${schoolName ? ` - ${schoolName}` : ''}`;
}

function AddVenueForm({ onStatus, recordType = 'school', title = 'Add School', workflowGroup = 'Settings' }) {
  const isEventCenter = recordType === 'event_center';
  const entityLabel = isEventCenter ? 'Event Center' : 'School';
  const emptyVenue = {
    record_type: recordType,
    name: '',
    school_name: '',
    athletic_website_url: '',
    logo_url: '',
    gym_name: '',
    address_line1: '',
    city: '',
    state: '',
    zip: '',
    courts: 1,
    court_labels: '',
    status: 'active'
  };
  const [form, setForm] = useState(emptyVenue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateVenueForm(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: name === 'courts' ? Math.max(1, Number(value || 1)) : value }));
  }

  function resetForm() {
    setForm(emptyVenue);
    setError('');
  }

  async function saveVenue(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-schools.php', {
        action: 'create',
        record: form
      });
      resetForm();
      onStatus?.(data.message || `${entityLabel} saved.`);
    } catch (caught) {
      setError(caught.message || `${entityLabel} could not be saved.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rtbo-dashboard-card rtbo-members-page rtbo-schedule-setup-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">{workflowGroup}</p>
          <h3>{title}</h3>
          <p>{isEventCenter
            ? 'Create an event center record that can host games for any school-linked team in the schedule database.'
            : 'Create a school record that can own teams, host games, and provide court options for game assignments.'}</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={resetForm} disabled={saving}>Clear Form</button>
        </div>
      </div>
      <form className="rtbo-member-form" onSubmit={saveVenue}>
        <div className="grid three">
          <label>{entityLabel} Name<input name="name" value={form.name} onChange={updateVenueForm} required /></label>
          <label>{isEventCenter ? 'Event Center Organization' : 'School / District Name'}<input name="school_name" value={form.school_name} onChange={updateVenueForm} /></label>
          <label>Primary Gym / Arena Name<input name="gym_name" value={form.gym_name} onChange={updateVenueForm} placeholder={isEventCenter ? 'Main Arena' : 'High school gym name'} /></label>
        </div>
        <div className="grid three">
          <label>Address<input name="address_line1" value={form.address_line1} onChange={updateVenueForm} /></label>
          <label>City<input name="city" value={form.city} onChange={updateVenueForm} /></label>
          <label>State<StateSelect value={form.state} onChange={updateVenueForm} /></label>
        </div>
        <div className="grid three">
          <label>Zip<input name="zip" value={form.zip} onChange={updateVenueForm} /></label>
          <label>Number of Courts<input type="number" name="courts" min="1" value={form.courts} onChange={updateVenueForm} /></label>
          <label>Athletic / Venue Website URL<input type="url" name="athletic_website_url" value={form.athletic_website_url} onChange={updateVenueForm} placeholder="https://..." /></label>
        </div>
        <div className="grid two">
          <label>Logo URL<input type="url" name="logo_url" value={form.logo_url} onChange={updateVenueForm} placeholder="Leave blank to scrape from website" /></label>
          <label>Court Options<textarea name="court_labels" value={form.court_labels} onChange={updateVenueForm} placeholder="Main, Auxiliary 1, Auxiliary 2, Arena Name" /></label>
        </div>
        <div className="rtbo-member-actions">
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : title}</button>
        </div>
        {error && <p className="form-message error">{error}</p>}
      </form>
    </section>
  );
}

function AddTeamForm({ onStatus, title = 'Add Team', teamNamePlaceholder = 'Team name', workflowGroup = 'Settings' }) {
  const emptyTeam = {
    record_type: 'team',
    school_id: '',
    name: '',
    athletic_website_url: '',
    logo_url: '',
    head_coach_name: '',
    head_coach_email: '',
    head_coach_phone: '',
    status: 'active'
  };
  const [form, setForm] = useState(emptyTeam);
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadSchools() {
    setLoadingSchools(true);
    setError('');
    try {
      const data = await apiGet('/admin-schools.php');
      setSchools((data.records || []).filter(record => record.record_type === 'school' && record.status === 'active'));
    } catch (caught) {
      setError(caught.message || 'Schools could not be loaded for team linking.');
    } finally {
      setLoadingSchools(false);
    }
  }

  useEffect(() => {
    loadSchools();
  }, []);

  function updateTeamForm(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: formatFormFieldValue(name, value) }));
  }

  function resetForm() {
    setForm(emptyTeam);
    setError('');
  }

  async function saveTeam(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const linkedSchool = schools.find(school => String(school.id) === String(form.school_id));
      const data = await apiPostJson('/admin-schools.php', {
        action: 'create',
        record: {
          ...form,
          school_name: linkedSchool?.name || '',
          gym_name: linkedSchool?.gym_name || '',
          address_line1: linkedSchool?.address_line1 || '',
          city: linkedSchool?.city || '',
          state: linkedSchool?.state || '',
          zip: linkedSchool?.zip || ''
        }
      });
      resetForm();
      onStatus?.(data.message || 'Team saved.');
    } catch (caught) {
      setError(caught.message || 'Team could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rtbo-dashboard-card rtbo-members-page rtbo-schedule-setup-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">{workflowGroup}</p>
          <h3>{title}</h3>
          <p>Create a team record and link it to a school. These school-linked teams are used for both school games and event center games.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={resetForm} disabled={saving}>Clear Form</button>
          <button className="btn secondary dark-btn" type="button" onClick={loadSchools} disabled={loadingSchools || saving}>Refresh Schools</button>
        </div>
      </div>
      <form className="rtbo-member-form" onSubmit={saveTeam}>
        <div className="grid two">
          <label>Linked School
            <select name="school_id" value={form.school_id} onChange={updateTeamForm} required>
              <option value="">Select school</option>
              {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
          <label>Team Name<input name="name" value={form.name} onChange={updateTeamForm} required placeholder={teamNamePlaceholder} /></label>
        </div>
        <div className="grid three">
          <label>Head Coach Name<input name="head_coach_name" value={form.head_coach_name} onChange={updateTeamForm} /></label>
          <label>Head Coach Email<input type="email" name="head_coach_email" value={form.head_coach_email} onChange={updateTeamForm} /></label>
          <label>Head Coach Phone<input type="tel" name="head_coach_phone" value={form.head_coach_phone} onChange={updateTeamForm} inputMode="tel" autoComplete="tel" maxLength="14" placeholder="(xxx) xxx-xxxx" /></label>
        </div>
        <div className="grid two">
          <label>Athletic Website URL<input type="url" name="athletic_website_url" value={form.athletic_website_url} onChange={updateTeamForm} placeholder="https://..." /></label>
          <label>Team Logo URL<input type="url" name="logo_url" value={form.logo_url} onChange={updateTeamForm} placeholder="Leave blank to scrape from athletic website" /></label>
        </div>
        <div className="rtbo-member-actions">
          <button className="btn" type="submit" disabled={saving || loadingSchools || schools.length === 0}>{saving ? 'Saving...' : title}</button>
        </div>
        {!loadingSchools && schools.length === 0 && <p className="form-message error">Add a school before creating a team.</p>}
        {error && <p className="form-message error">{error}</p>}
      </form>
    </section>
  );
}

function SchedulesOverview({ onStatus, onOpenSection, onOpenMembers }) {
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadScheduleRecords() {
    setLoading(true);
    setError('');
    setRecords([]);
    setLoading(false);
    onStatus?.('Schedules is focused on game assignments, master schedule, and live map. Schools, teams, and event centers are managed from the Members Directory.');
  }

  useEffect(() => {
    loadScheduleRecords();
  }, []);

  const schoolRecords = records.filter(record => record.record_type === 'school');
  const eventCenterRecords = records.filter(record => record.record_type === 'event_center');
  const teamRecords = records.filter(record => record.record_type === 'team');

  function beginEditScheduleRecord(record) {
    setEditingRecord(record);
    setEditForm({
      ...record,
      school_id: record.school_id || '',
      courts: record.courts || 1,
      court_labels: record.court_labels || '',
      head_coach_phone: formatPhoneNumber(record.head_coach_phone || ''),
      status: record.status || 'active'
    });
    setError('');
    onStatus?.(`Editing ${record.name || record.type_label || 'schedule record'}.`);
  }

  function cancelEditScheduleRecord() {
    setEditingRecord(null);
    setEditForm(null);
    setError('');
  }

  function updateEditScheduleRecord(event) {
    const { name, value } = event.target;
    setEditForm(current => ({
      ...current,
      [name]: name === 'courts' ? Math.max(1, Number(value || 1)) : formatFormFieldValue(name, value)
    }));
  }

  async function saveEditScheduleRecord(event) {
    event.preventDefault();
    if (!editingRecord || !editForm) return;

    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-schools.php', {
        action: 'update',
        id: editingRecord.id,
        record: {
          ...editingRecord,
          ...editForm,
          record_type: editingRecord.record_type
        }
      });
      await loadScheduleRecords();
      setEditingRecord(null);
      setEditForm(null);
      onStatus?.(data.message || 'Schedule record updated.');
    } catch (caught) {
      const message = caught.message || 'Schedule record could not be updated.';
      setError(message);
      onStatus?.(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteScheduleRecord(record) {
    const entityLabel = record.record_type === 'team'
      ? 'team'
      : record.record_type === 'event_center'
      ? 'event center'
      : 'school';
    const name = record.name || entityLabel;
    const confirmed = window.confirm(`Delete ${name}? This removes it from scheduling dropdowns and directory filters.`);
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-schools.php', {
        action: 'delete',
        id: record.id
      });
      if (editingRecord && Number(editingRecord.id) === Number(record.id)) {
        setEditingRecord(null);
        setEditForm(null);
      }
      await loadScheduleRecords();
      onStatus?.(data.message || `${formatLabel(entityLabel)} removed.`);
    } catch (caught) {
      const message = caught.message || `${formatLabel(entityLabel)} could not be removed.`;
      setError(message);
      onStatus?.(message);
    } finally {
      setSaving(false);
    }
  }

  function renderScheduleEditForm(record) {
    if (!editingRecord || !editForm || Number(editingRecord.id) !== Number(record.id)) return null;
    const isTeam = record.record_type === 'team';
    const isEventCenter = record.record_type === 'event_center';
    const entityLabel = isTeam ? 'Team' : isEventCenter ? 'Event Center' : 'School';

    return (
      <form className="rtbo-schedule-record-edit-form" onSubmit={saveEditScheduleRecord}>
        {isTeam ? (
          <>
            <div className="grid two">
              <label>Linked School
                <select name="school_id" value={editForm.school_id || ''} onChange={updateEditScheduleRecord} required>
                  <option value="">Select school</option>
                  {schoolRecords.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
                </select>
              </label>
              <label>Team Name<input name="name" value={editForm.name || ''} onChange={updateEditScheduleRecord} required /></label>
            </div>
            <div className="grid three">
              <label>Head Coach Name<input name="head_coach_name" value={editForm.head_coach_name || ''} onChange={updateEditScheduleRecord} /></label>
              <label>Head Coach Email<input type="email" name="head_coach_email" value={editForm.head_coach_email || ''} onChange={updateEditScheduleRecord} /></label>
              <label>Head Coach Phone<input type="tel" name="head_coach_phone" value={editForm.head_coach_phone || ''} onChange={updateEditScheduleRecord} inputMode="tel" autoComplete="tel" maxLength="14" placeholder="(xxx) xxx-xxxx" /></label>
            </div>
            <div className="grid two">
              <label>Athletic Website URL<input type="url" name="athletic_website_url" value={editForm.athletic_website_url || ''} onChange={updateEditScheduleRecord} /></label>
              <label>Team Logo URL<input type="url" name="logo_url" value={editForm.logo_url || ''} onChange={updateEditScheduleRecord} /></label>
            </div>
          </>
        ) : (
          <>
            <div className="grid three">
              <label>{entityLabel} Name<input name="name" value={editForm.name || ''} onChange={updateEditScheduleRecord} required /></label>
              <label>{isEventCenter ? 'Event Center Organization' : 'School / District Name'}<input name="school_name" value={editForm.school_name || ''} onChange={updateEditScheduleRecord} /></label>
              <label>Primary Gym / Arena Name<input name="gym_name" value={editForm.gym_name || ''} onChange={updateEditScheduleRecord} /></label>
            </div>
            <div className="grid three">
              <label>Address<input name="address_line1" value={editForm.address_line1 || ''} onChange={updateEditScheduleRecord} /></label>
              <label>City<input name="city" value={editForm.city || ''} onChange={updateEditScheduleRecord} /></label>
              <label>State<StateSelect value={editForm.state || ''} onChange={updateEditScheduleRecord} /></label>
            </div>
            <div className="grid three">
              <label>Zip<input name="zip" value={editForm.zip || ''} onChange={updateEditScheduleRecord} /></label>
              <label>Number of Courts<input type="number" name="courts" min="1" value={editForm.courts || 1} onChange={updateEditScheduleRecord} /></label>
              <label>Athletic / Venue Website URL<input type="url" name="athletic_website_url" value={editForm.athletic_website_url || ''} onChange={updateEditScheduleRecord} /></label>
            </div>
            <div className="grid two">
              <label>Logo URL<input type="url" name="logo_url" value={editForm.logo_url || ''} onChange={updateEditScheduleRecord} /></label>
              <label>Court Options<textarea name="court_labels" value={editForm.court_labels || ''} onChange={updateEditScheduleRecord} placeholder="Main, Auxiliary 1, Auxiliary 2, Arena Name" /></label>
            </div>
          </>
        )}
        <div className="rtbo-member-actions">
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : `Save ${entityLabel}`}</button>
          <button className="btn secondary dark-btn" type="button" onClick={cancelEditScheduleRecord} disabled={saving}>Cancel</button>
        </div>
      </form>
    );
  }

  function renderScheduleRecord(record) {
    return (
      <article className="rtbo-schedule-overview-record" key={`${record.record_type}-${record.id}`}>
        <TeamLogo team={record} className="rtbo-team-directory-logo" />
        <div>
          <strong>{record.name || 'Name pending'}</strong>
          <span>{record.type_label || formatLabel(record.record_type || 'record')}</span>
          <p>{[
            record.gym_name,
            record.address_line1,
            record.city,
            record.state,
            record.zip
          ].filter(Boolean).join(', ') || record.school_name || 'Address or school details pending'}</p>
          <small>{record.record_type === 'team' ? `Linked School: ${record.school_name || 'Pending'}` : `${record.courts ? `${record.courts} court${Number(record.courts) === 1 ? '' : 's'}` : 'Court count pending'}`}{record.head_coach_name ? ` / Coach: ${record.head_coach_name}` : ''}</small>
          <div className="rtbo-record-actions">
            <button className="btn secondary dark-btn" type="button" onClick={() => beginEditScheduleRecord(record)} disabled={saving}>Edit</button>
            <button className="btn secondary dark-btn danger" type="button" onClick={() => deleteScheduleRecord(record)} disabled={saving}>Delete</button>
          </div>
        </div>
        {renderScheduleEditForm(record)}
      </article>
    );
  }

  return (
    <section className="rtbo-dashboard-card rtbo-schedules-overview">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Game Operations</p>
          <h3>Schedules</h3>
          <p>Create game assignments, publish schedules, and monitor live map coverage. School, team, and event center records now live in the Members Directory and are created from Settings.</p>
        </div>
        <div className="button-row">
          <button className="btn secondary dark-btn" type="button" onClick={() => onOpenSection?.('createGameAssignment')}>Create Game Assignment</button>
          <button className="btn" type="button" onClick={() => onOpenSection?.('masterSchedule')}>Master Schedule</button>
          <button className="btn secondary dark-btn" type="button" onClick={() => onOpenSection?.('liveMap')}>Open Live Map</button>
        </div>
      </div>

      {error && <p className="form-message error">{error}</p>}
      <div className="rtbo-schedule-overview-grid rtbo-schedule-ops-grid">
        <article className="rtbo-schedule-record-section">
          <p className="eyebrow">Assignments</p>
          <h4>Create Game Assignment</h4>
          <p>Build game records, select teams and venues from directory-backed school records, and prepare crews for publishing.</p>
          <button className="btn secondary dark-btn" type="button" onClick={() => onOpenSection?.('createGameAssignment')}>Create Game Assignment</button>
        </article>
        <article className="rtbo-schedule-record-section">
          <p className="eyebrow">Published Schedule</p>
          <h4>Master Schedule</h4>
          <p>Review created games, manage crew assignments, and monitor assignment acceptance status.</p>
          <button className="btn" type="button" onClick={() => onOpenSection?.('masterSchedule')}>Master Schedule</button>
        </article>
        <article className="rtbo-schedule-record-section">
          <p className="eyebrow">Live Coverage</p>
          <h4>2D / 3D Location Map</h4>
          <p>Track live official locations, verify arrivals, and find nearby officials when coverage changes.</p>
          <button className="btn secondary dark-btn" type="button" onClick={() => onOpenSection?.('liveMap')}>Open Live Map</button>
        </article>
        <article className="rtbo-schedule-record-section">
          <p className="eyebrow">Directory Records</p>
          <h4>Schools, Teams, Event Centers</h4>
          <p>These records now appear in Members Directory to keep people, schools, teams, and venues searchable from one place.</p>
          <button className="btn secondary dark-btn" type="button" onClick={onOpenMembers}>Open Members Directory</button>
        </article>
      </div>
    </section>
  );
}

function MasterSchedulePage({ onStatus, onOpenCreate }) {
  const [officials, setOfficials] = useState([]);
  const [positions, setPositions] = useState(fallbackAssignmentPositions);
  const [games, setGames] = useState([]);
  const [tbaRequests, setTbaRequests] = useState([]);
  const [assigningGameId, setAssigningGameId] = useState(null);
  const [assignByOfficialOpen, setAssignByOfficialOpen] = useState(false);
  const [assignByOfficialForm, setAssignByOfficialForm] = useState({ officialId: '', gameId: '', positionId: '' });
  const [crewAssignmentForm, setCrewAssignmentForm] = useState({});
  const [showUnavailableOfficials, setShowUnavailableOfficials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadMasterSchedule() {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/admin-games.php');
      setOfficials(data.officials || []);
      setPositions((data.positions && data.positions.length > 0) ? data.positions : fallbackAssignmentPositions);
      setGames(data.games || []);
      setTbaRequests(data.tba_requests || []);
      onStatus?.('Master Schedule loaded from created game assignments.');
    } catch (caught) {
      const message = caught.message || 'Master Schedule could not be loaded.';
      setError(message);
      onStatus?.(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMasterSchedule();
  }, []);

  const hasAssignableOfficials = officials.length > 0;
  const openTbaGames = games.filter(game => !game.published && !isCrewComplete(game, positions));
  const selectedAssignOfficial = officials.find(official => String(official.id) === String(assignByOfficialForm.officialId));
  const tbaRequestsByGame = tbaRequests.reduce((next, request) => {
    const gameId = String(request.game_id || request.game?.id || '');
    if (!gameId) return next;
    if (!next[gameId]) next[gameId] = [];
    next[gameId].push(request);
    return next;
  }, {});

  function officialAlreadyOnGame(officialId, game) {
    return (game.assignments || []).some(assignment => (
      String(assignment.official_id) === String(officialId)
      && String(assignment.status || '').toLowerCase() !== 'declined'
    ));
  }

  function officialHasTimeConflict(officialId, targetGame) {
    const targetDate = String(targetGame.game_date || '');
    const targetTime = String(targetGame.game_time || '').slice(0, 5);
    if (!officialId || !targetDate || !targetTime) return false;

    return games.some(game => (
      String(game.id) !== String(targetGame.id)
      && String(game.game_date || '') === targetDate
      && String(game.game_time || '').slice(0, 5) === targetTime
      && !['deleted', 'cancelled', 'canceled', 'postponed'].includes(String(game.status || '').toLowerCase())
      && officialAlreadyOnGame(officialId, game)
    ));
  }

  const assignByOfficialGames = selectedAssignOfficial
    ? games.filter(game => (
        missingCrewPositions(game, positions).length > 0
        && !officialAlreadyOnGame(selectedAssignOfficial.id, game)
        && !officialUnavailableRecordForGame(selectedAssignOfficial, game)
        && !officialHasTimeConflict(selectedAssignOfficial.id, game)
        && !['deleted', 'cancelled', 'canceled', 'postponed'].includes(String(game.status || '').toLowerCase())
      ))
    : [];
  const selectedAssignGame = assignByOfficialGames.find(game => String(game.id) === String(assignByOfficialForm.gameId));
  const selectedAssignGamePositions = selectedAssignGame ? missingCrewPositions(selectedAssignGame, positions) : [];

  function updateCrewAssignment(positionId, value) {
    setCrewAssignmentForm(current => ({ ...current, [String(positionId)]: value }));
  }

  function updateAssignByOfficial(field, value) {
    setAssignByOfficialForm(current => {
      const next = { ...current, [field]: value };
      if (field === 'officialId') {
        next.gameId = '';
        next.positionId = '';
      }
      if (field === 'gameId') {
        next.positionId = '';
      }
      return next;
    });
  }

  function startAssigning(game) {
    setAssigningGameId(current => (String(current) === String(game.id) ? null : game.id));
    setCrewAssignmentForm(buildCrewFormForGame(game, positions));
    setShowUnavailableOfficials(false);
    setError('');
  }

  async function togglePublished(game) {
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-games.php', {
        action: game.published ? 'unpublish' : 'publish',
        id: game.id
      });
      setGames(data.games || []);
      setTbaRequests(data.tba_requests || []);
      onStatus?.(data.message || 'Game assignment publish status updated.');
    } catch (caught) {
      const message = caught.message || 'Game assignment publish status could not be updated.';
      setError(message);
      onStatus?.(message);
    } finally {
      setSaving(false);
    }
  }

  async function saveCrewAssignments(event, game) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const requiredPositions = requiredPositionsForGame(game, positions);
      const assignments = requiredPositions.map(position => ({
        position_id: position.id,
        official_id: crewAssignmentForm[String(position.id)] || ''
      }));
      const missingPosition = assignments.find(assignment => !assignment.official_id);
      if (missingPosition) {
        const position = requiredPositions.find(item => String(item.id) === String(missingPosition.position_id));
        throw new Error(`Select an official for ${position?.name || 'each required position'} before saving this crew.`);
      }
      const selectedOfficialIds = assignments.map(assignment => String(assignment.official_id));
      if (new Set(selectedOfficialIds).size !== selectedOfficialIds.length) {
        throw new Error('Each required crew position must be assigned to a different official.');
      }

      const data = await apiPostJson('/admin-games.php', {
        action: 'assign_crew',
        id: game.id,
        assignments
      });
      setGames(data.games || []);
      setTbaRequests(data.tba_requests || []);
      setAssigningGameId(null);
      setCrewAssignmentForm({});
      setShowUnavailableOfficials(false);
      onStatus?.(data.message || 'Crew assignments saved.');
    } catch (caught) {
      const message = caught.message || 'Crew assignments could not be saved.';
      setError(message);
      onStatus?.(message);
    } finally {
      setSaving(false);
    }
  }

  async function sendTbaList() {
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-games.php', { action: 'send_tba_list' });
      setGames(data.games || []);
      setTbaRequests(data.tba_requests || []);
      onStatus?.(data.message || 'TBA list sent to officials.');
    } catch (caught) {
      const message = caught.message || 'TBA list could not be sent.';
      setError(message);
      onStatus?.(message);
    } finally {
      setSaving(false);
    }
  }

  async function assignSelectedOfficial(event) {
    event.preventDefault();
    if (!assignByOfficialForm.officialId || !assignByOfficialForm.gameId || !assignByOfficialForm.positionId) {
      setError('Select an official, game, and open position before assigning.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-games.php', {
        action: 'assign_official',
        id: assignByOfficialForm.gameId,
        assignment: {
          official_id: assignByOfficialForm.officialId,
          position_id: assignByOfficialForm.positionId
        }
      });
      setGames(data.games || []);
      setTbaRequests(data.tba_requests || []);
      setAssignByOfficialForm(current => ({ ...current, gameId: '', positionId: '' }));
      onStatus?.(data.message || 'Official assigned to selected game.');
    } catch (caught) {
      const message = caught.message || 'Official could not be assigned to this game.';
      setError(message);
      onStatus?.(message);
    } finally {
      setSaving(false);
    }
  }

  function openAssignFromRequest(request) {
    const game = games.find(item => String(item.id) === String(request.game_id || request.game?.id));
    if (!game) {
      onStatus?.('That requested game is no longer visible in the Master Schedule.');
      return;
    }
    setAssigningGameId(game.id);
    setCrewAssignmentForm(buildCrewFormForGame(game, positions));
    setShowUnavailableOfficials(false);
    onStatus?.('Select a crew position for the requesting official, then save the crew assignments.');
  }

  function renderTbaRequestPanel() {
    if (tbaRequests.length === 0) {
      return null;
    }

    return (
      <aside className="rtbo-tba-panel" aria-label="TBA official requests">
        <div className="rtbo-dashboard-card-head compact">
          <div>
            <p className="eyebrow">TBA Requests</p>
            <h4>Officials Requesting Open Games</h4>
          </div>
        </div>
        <div className="rtbo-tba-request-list">
          {tbaRequests.map((request) => {
            const game = request.game || {};
            const official = request.official || {};
            const officialName = official.name || [official.first_name, official.last_name].filter(Boolean).join(' ') || official.email || 'Official';
            return (
              <article className="rtbo-tba-request-card" key={`${request.id}-${request.game_id}-${request.official_id}`}>
                <ProfilePhoto person={official} alt={`${officialName} profile`} className="rtbo-tba-request-photo" />
                <div>
                  <strong>{officialName}</strong>
                  <span>{game.away_team || 'Visiting Team'} at {game.home_team || 'Home Team'}</span>
                  <small>{formatGameDate(game.game_date)} at {formatGameTime(game.game_time)} / {formatLabel(request.status || 'pending')}</small>
                </div>
                <button className="btn secondary dark-btn" type="button" onClick={() => openAssignFromRequest(request)}>Open Assign</button>
              </article>
            );
          })}
        </div>
      </aside>
    );
  }

  function renderAssignByOfficialPanel() {
    if (!assignByOfficialOpen) {
      return null;
    }

    return (
      <form className="rtbo-assign-by-official-panel" onSubmit={assignSelectedOfficial}>
        <div className="rtbo-assign-panel-head">
          <div>
            <strong>Assign By Official</strong>
            <span>Select an available official first, then choose one open game position. The server will block same date/time double-booking at different schools.</span>
          </div>
        </div>
        <div className="rtbo-crew-assignment-grid">
          <label>Available Official
            <select value={assignByOfficialForm.officialId} onChange={(event) => updateAssignByOfficial('officialId', event.target.value)} required>
              <option value="">Select active official</option>
              {officials.map(official => (
                <option key={official.id} value={official.id}>{officialOptionLabel(official)}</option>
              ))}
            </select>
          </label>
          <label>Open Game
            <select value={assignByOfficialForm.gameId} onChange={(event) => updateAssignByOfficial('gameId', event.target.value)} required disabled={!selectedAssignOfficial}>
              <option value="">{selectedAssignOfficial ? 'Select open game' : 'Select an official first'}</option>
              {assignByOfficialGames.map(game => (
                <option key={game.id} value={game.id}>
                  {formatGameDate(game.game_date)} {formatGameTime(game.game_time)} / {game.away_team || 'Visiting'} at {game.home_team || 'Home'} / {game.location_name || 'Location pending'}
                </option>
              ))}
            </select>
          </label>
          <label>Open Position
            <select value={assignByOfficialForm.positionId} onChange={(event) => updateAssignByOfficial('positionId', event.target.value)} required disabled={!selectedAssignGame}>
              <option value="">{selectedAssignGame ? 'Select position' : 'Select a game first'}</option>
              {selectedAssignGamePositions.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}
            </select>
          </label>
        </div>
        {selectedAssignOfficial && assignByOfficialGames.length === 0 && (
          <p className="form-message warning">No open games are available for this official without an availability or same-time assignment conflict.</p>
        )}
        <div className="rtbo-member-actions">
          <button className="btn" type="submit" disabled={saving || !assignByOfficialForm.officialId || !assignByOfficialForm.gameId || !assignByOfficialForm.positionId}>
            {saving ? 'Assigning...' : 'Assign Selected Official'}
          </button>
        </div>
      </form>
    );
  }

  function renderAssignedCrew(game) {
    const requiredPositions = requiredPositionsForGame(game, positions);
    const assignments = game.assignments || [];
    const missingPositions = missingCrewPositions(game, positions);
    if (assignments.length === 0) {
      return (
        <div className="rtbo-crew-status-block">
          <p className="rtbo-empty-state compact">No officials assigned yet.</p>
          <small>{requiredPositions.map(position => position.name).join(' / ')} required</small>
        </div>
      );
    }

    return (
      <div className="rtbo-crew-status-block">
        <div className="rtbo-game-assigned-crew" aria-label="Assigned officials">
          {requiredPositions.map((position) => {
            const assignment = assignments.find(item => String(item.position_id) === String(position.id));
            if (!assignment) {
              return (
                <div className="rtbo-game-crew-member missing" key={`missing-${position.id}`}>
                  <span className="rtbo-game-crew-photo placeholder">TBA</span>
                  <div>
                    <strong>Unassigned</strong>
                    <span>{position.name}</span>
                    <small>Required</small>
                  </div>
                </div>
              );
            }
            const official = assignment.official || {};
            const officialName = official.name || [official.first_name, official.last_name].filter(Boolean).join(' ') || 'Official';
            return (
              <div className="rtbo-game-crew-member" key={`${assignment.assignment_id || assignment.id}-${assignment.position_id}`}>
                <ProfilePhoto person={official} alt={`${officialName} profile`} className="rtbo-game-crew-photo" />
                <div>
                  <strong>{officialName}</strong>
                  <span>{assignment.position_name || assignment.position || position.name}</span>
                  <small>{formatLabel(assignment.status || 'pending')}</small>
                </div>
              </div>
            );
          })}
        </div>
        <small className={missingPositions.length ? 'rtbo-crew-completion warning' : 'rtbo-crew-completion ready'}>
          {missingPositions.length ? `Missing: ${missingPositions.map(position => position.name).join(', ')}` : 'Crew complete'}
        </small>
      </div>
    );
  }

  function renderCrewAssignmentPanel(game) {
    const requiredPositions = requiredPositionsForGame(game, positions);
    const availableOfficials = officials.filter(official => !officialUnavailableRecordForGame(official, game));
    const unavailableOfficials = officials.filter(official => officialUnavailableRecordForGame(official, game));
    const selectableOfficials = showUnavailableOfficials ? unavailableOfficials : availableOfficials;
    const contactRequiredOfficials = availableOfficials.filter(official => officialContactRequiredRecordForGame(official, game));

    return (
      <form className="rtbo-assign-official-panel" onSubmit={(event) => saveCrewAssignments(event, game)}>
        <div className="rtbo-assign-panel-head">
          <div>
            <strong>Assign Required Crew</strong>
            <span>{requiredPositions.map(position => position.name).join(' / ')} must be filled before this game can be published.</span>
          </div>
          <button className="btn secondary dark-btn" type="button" onClick={() => setShowUnavailableOfficials(current => !current)}>
            {showUnavailableOfficials ? 'View Available Officials' : `View Unavailable Officials (${unavailableOfficials.length})`}
          </button>
        </div>
        {showUnavailableOfficials && (
          <p className="form-message warning">Override mode: these officials are marked unavailable for this game date. You can still assign them as Super Admin.</p>
        )}
        {!showUnavailableOfficials && contactRequiredOfficials.length > 0 && (
          <p className="form-message warning">{contactRequiredOfficials.length} available {contactRequiredOfficials.length === 1 ? 'official has' : 'officials have'} a contact-before-assignment note for this date.</p>
        )}
        <div className="rtbo-crew-assignment-grid">
          {requiredPositions.map(position => (
            <label key={position.id}>{position.name}
              <select value={crewAssignmentForm[String(position.id)] || ''} onChange={(event) => updateCrewAssignment(position.id, event.target.value)} required>
                <option value="">{showUnavailableOfficials ? 'Select unavailable official' : 'Select available official'}</option>
                {selectableOfficials.map(official => {
                  const unavailableRecord = officialUnavailableRecordForGame(official, game);
                  const contactRequiredRecord = officialContactRequiredRecordForGame(official, game);
                  return (
                    <option key={official.id} value={official.id}>
                      {officialOptionLabel(official)}{unavailableRecord ? ` / ${formatLabel(unavailableRecord.reason || unavailableRecord.status || 'Unavailable')}` : ''}{contactRequiredRecord ? ' / Contact before assignment' : ''}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
        </div>
        {!showUnavailableOfficials && availableOfficials.length === 0 && <p className="form-message error">No available officials are currently listed for this date. Use “View Unavailable Officials” if you need to override.</p>}
        {showUnavailableOfficials && unavailableOfficials.length === 0 && <p className="form-message error">No unavailable officials are marked for this date.</p>}
        <div className="rtbo-member-actions">
          <button className="btn" type="submit" disabled={saving || selectableOfficials.length === 0}>{saving ? 'Saving Crew...' : 'Save Crew Assignments'}</button>
        </div>
      </form>
    );
  }

  return (
    <section className="rtbo-dashboard-card rtbo-members-page rtbo-game-assignment-page rtbo-master-schedule-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Schedules</p>
          <h3>Master Schedule</h3>
          <p>This page pulls saved game assignments from the game assignment database. Use it to review created games, assign active officials, and publish or unpublish games for assigned officials.</p>
        </div>
        <div className="rtbo-form-toolbar">
          {onOpenCreate && <button className="btn secondary dark-btn" type="button" onClick={onOpenCreate}>Create Game Assignment</button>}
          <button className="btn secondary dark-btn" type="button" onClick={() => setAssignByOfficialOpen(current => !current)} disabled={loading || saving || !hasAssignableOfficials}>
            {assignByOfficialOpen ? 'Close Assign By Official' : 'Assign By Official'}
          </button>
          <button className="btn secondary dark-btn" type="button" onClick={sendTbaList} disabled={loading || saving || openTbaGames.length === 0}>
            Send TBA List to Officials
          </button>
          <button className="btn secondary dark-btn" type="button" onClick={loadMasterSchedule} disabled={loading || saving}>Refresh Schedule</button>
        </div>
      </div>

      <div className="rtbo-tba-summary">
        <strong>{openTbaGames.length}</strong>
        <span>unassigned game{openTbaGames.length === 1 ? '' : 's'} available for the next TBA list</span>
        <small>Officials can request these games, but only the Super Admin can assign them to a crew.</small>
      </div>
      {renderAssignByOfficialPanel()}

      <div className="rtbo-game-assignment-list" aria-label="Created game assignments">
        <div className="rtbo-dashboard-card-head compact">
          <div>
            <p className="eyebrow">Created Games</p>
            <h4>Game Assignment Records</h4>
          </div>
        </div>
        {loading && <p className="rtbo-empty-state">Loading game assignments...</p>}
        {!loading && games.length === 0 && (
          <p className="rtbo-empty-state">No game assignments have been created yet. Create a game assignment first, then return here to assign officials and publish the game.</p>
        )}
        {!loading && games.map(game => (
          <article className="rtbo-game-assignment-record" key={game.id}>
            <div className="rtbo-game-assignment-matchup">
              <span className={game.published ? 'rtbo-status-pill published' : 'rtbo-status-pill'}>{game.published ? 'Published' : 'Unpublished'}</span>
              {game.tba_visible && !game.published && <span className="rtbo-status-pill tba">TBA sent</span>}
              <strong>{game.away_team || 'Visiting Team'} at {game.home_team || 'Home Team'}</strong>
              <small>{formatGameDate(game.game_date)} at {formatGameTime(game.game_time)} / {game.level || 'Game type pending'}</small>
              {(game.tba_request_count || tbaRequestsByGame[String(game.id)]?.length) > 0 && (
                <small className="rtbo-tba-request-count">{game.tba_request_count || tbaRequestsByGame[String(game.id)]?.length} official request{Number(game.tba_request_count || tbaRequestsByGame[String(game.id)]?.length) === 1 ? '' : 's'}</small>
              )}
            </div>
            <div className="rtbo-game-assignment-meta">
              <span>{game.location_name || 'Location pending'}</span>
              <span>{game.location_address || 'Address pending'}</span>
              <span>{game.court_label || `Court ${game.court_number || 1}`} / {game.games_per_night || 1} game{Number(game.games_per_night || 1) === 1 ? '' : 's'}</span>
            </div>
            <div className="rtbo-game-assignment-crew-wrap">
              {renderAssignedCrew(game)}
            </div>
            <div className="rtbo-table-actions rtbo-game-record-actions">
              <button type="button" onClick={() => startAssigning(game)} disabled={saving || !hasAssignableOfficials}>{String(assigningGameId) === String(game.id) ? 'Close Assign' : 'Assign Officials'}</button>
              <button
                className="rtbo-publish-officials-btn"
                type="button"
                onClick={() => togglePublished(game)}
                disabled={saving || (!game.published && !isCrewComplete(game, positions))}
              >
                {game.published ? 'Unpublish from assigned officials' : 'Publish immediately to assigned officials'}
              </button>
              {!game.published && !isCrewComplete(game, positions) && (
                <small className="rtbo-publish-helper">Complete all required crew positions before publishing to officials.</small>
              )}
            </div>
            {String(assigningGameId) === String(game.id) && renderCrewAssignmentPanel(game)}
          </article>
        ))}
        {error && <p className="form-message error">{error}</p>}
      </div>
      {renderTbaRequestPanel()}
    </section>
  );
}

function GameAssignmentForm({ mode = 'create', onStatus }) {
  const isMasterSchedule = mode === 'master';
  const isCreateForm = !isMasterSchedule;
  const emptyGame = {
    game_date: '',
    game_time: '',
    level: '',
    school_event_center_id: '',
    home_team_id: '',
    away_team_id: '',
    court_number: '1',
    court_label: '',
    games_per_night: '1',
    officials_required: '3',
    fee_per_official: '',
    published: false,
    notes: ''
  };
  const [form, setForm] = useState(emptyGame);
  const [venues, setVenues] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teams, setTeams] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [positions, setPositions] = useState(fallbackAssignmentPositions);
  const [games, setGames] = useState([]);
  const [assigningGameId, setAssigningGameId] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    official_id: '',
    position_id: String(fallbackAssignmentPositions[0]?.id || ''),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadGameAssignmentData() {
    setLoading(true);
    setError('');
    try {
      const [gameData, scheduleData] = await Promise.all([
        apiGet('/admin-games.php'),
        apiGet('/admin-schools.php')
      ]);
      const scheduleRecords = scheduleData.records || [];
      const activeScheduleRecords = scheduleRecords.filter(record => (record.status || 'active') === 'active');
      const schoolRecords = scheduleData.schools || activeScheduleRecords.filter(record => record.record_type === 'school');
      const eventCenterRecords = scheduleData.event_centers || activeScheduleRecords.filter(record => record.record_type === 'event_center');
      const venueRecords = scheduleData.venues || [...schoolRecords, ...eventCenterRecords];
      const teamRecords = scheduleData.teams || activeScheduleRecords.filter(record => record.record_type === 'team');
      setVenues(venueRecords);
      setSchools(schoolRecords);
      setTeams(teamRecords);
      setOfficials(gameData.officials || []);
      setPositions((gameData.positions && gameData.positions.length > 0) ? gameData.positions : fallbackAssignmentPositions);
      setGames(gameData.games || []);
      onStatus?.(`Loaded ${venueRecords.length} school/event center record${venueRecords.length === 1 ? '' : 's'} from the scheduling database.`);
    } catch (caught) {
      setError(caught.message || 'Game assignment records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGameAssignmentData();
  }, []);

  const selectedVenue = venues.find(record => String(record.id) === String(form.school_event_center_id));
  const courtOptions = selectedVenue ? courtOptionsFromRecord(selectedVenue) : [];
  const hasReferenceData = venues.length > 0 && teams.length >= 2;
  const hasAssignableOfficials = officials.length > 0;
  const selectedRequiredPositions = requiredPositionsForGame({
    officials_required: form.officials_required,
    required_position_ids: requiredPositionIdsForCrewSize(positions, form.officials_required)
  }, positions);
  const teamOptions = [...teams].sort((first, second) => {
    if (selectedVenue?.record_type !== 'school') return teamOptionLabel(first, schools).localeCompare(teamOptionLabel(second, schools));
    const firstLinked = String(first.school_id) === String(selectedVenue.id) ? 0 : 1;
    const secondLinked = String(second.school_id) === String(selectedVenue.id) ? 0 : 1;
    return firstLinked - secondLinked || teamOptionLabel(first, schools).localeCompare(teamOptionLabel(second, schools));
  });

  function updateGameForm(event) {
    const { name, value, checked, type } = event.target;
    setForm(current => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'school_event_center_id') {
        const venue = venues.find(record => String(record.id) === String(value));
        const options = venue ? courtOptionsFromRecord(venue) : [];
        next.court_number = '1';
        next.court_label = options[0] || '';
      }
      return next;
    });
  }

  function resetGameForm() {
    setForm(emptyGame);
    setError('');
  }

  function updateAssignmentForm(event) {
    const { name, value } = event.target;
    setAssignmentForm(current => ({ ...current, [name]: value }));
  }

  function startAssigning(game) {
    setAssigningGameId(current => (String(current) === String(game.id) ? null : game.id));
    setAssignmentForm({
      official_id: '',
      position_id: String(positions[0]?.id || fallbackAssignmentPositions[0]?.id || ''),
    });
    setError('');
  }

  async function saveGameAssignment(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (form.home_team_id && form.home_team_id === form.away_team_id) {
        throw new Error('Home team and visiting team must be different teams.');
      }

      const gamePayload = {
        ...form,
        officials_required: Number(form.officials_required || 3),
        required_position_ids: requiredPositionIdsForCrewSize(positions, form.officials_required)
      };

      const data = await apiPostJson('/admin-games.php', {
        action: 'create',
        game: gamePayload
      });
      setGames(data.games || []);
      resetGameForm();
      onStatus?.(data.message || 'Game assignment created.');
    } catch (caught) {
      setError(caught.message || 'Game assignment could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(game) {
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-games.php', {
        action: game.published ? 'unpublish' : 'publish',
        id: game.id
      });
      setGames(data.games || []);
      onStatus?.(data.message || 'Game assignment updated.');
    } catch (caught) {
      setError(caught.message || 'Game assignment publish status could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  async function assignOfficialToGame(event, game) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!assignmentForm.official_id) {
        throw new Error('Select an active official before assigning this game.');
      }
      if (!assignmentForm.position_id) {
        throw new Error('Select the officiating position for this assignment.');
      }

      const data = await apiPostJson('/admin-games.php', {
        action: 'assign_official',
        id: game.id,
        assignment: assignmentForm
      });
      setGames(data.games || []);
      setAssigningGameId(null);
      setAssignmentForm({
        official_id: '',
        position_id: String(positions[0]?.id || fallbackAssignmentPositions[0]?.id || ''),
      });
      onStatus?.(data.message || 'Official assigned to game.');
    } catch (caught) {
      setError(caught.message || 'Official could not be assigned.');
    } finally {
      setSaving(false);
    }
  }

  function renderAssignedCrew(game) {
    const assignments = game.assignments || [];
    if (assignments.length === 0) {
      return <p className="rtbo-empty-state compact">No officials assigned yet.</p>;
    }

    return (
      <div className="rtbo-game-assigned-crew" aria-label="Assigned officials">
        {assignments.map((assignment) => {
          const official = assignment.official || {};
          const officialName = official.name || [official.first_name, official.last_name].filter(Boolean).join(' ') || 'Official';
          return (
            <div className="rtbo-game-crew-member" key={`${assignment.assignment_id || assignment.id}-${assignment.position_id}`}>
              <ProfilePhoto person={official} alt={`${officialName} profile`} className="rtbo-game-crew-photo" />
              <div>
                <strong>{officialName}</strong>
                <span>{assignment.position_name || assignment.position || 'Position pending'}</span>
                <small>{formatLabel(assignment.status || 'pending')}</small>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="rtbo-dashboard-card rtbo-members-page rtbo-game-assignment-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Schedules</p>
          <h3>{isMasterSchedule ? 'Master Schedule' : 'Create Game Assignment'}</h3>
          <p>{isMasterSchedule
            ? 'Review game assignments created from the scheduling form, assign active officials, and publish or unpublish games for assigned officials.'
            : 'Create games from the school, event center, and school-linked team databases. The Master Schedule will pull these saved games for assigning, publishing, and schedule review.'}</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={loadGameAssignmentData} disabled={loading || saving}>Refresh</button>
          {isCreateForm && <button className="btn secondary dark-btn" type="button" onClick={resetGameForm} disabled={saving}>Clear Form</button>}
        </div>
      </div>

      {isCreateForm && (
        <form className="rtbo-member-form rtbo-game-assignment-form" onSubmit={saveGameAssignment}>
          <div className="grid three">
            <label>Game Date<input type="date" name="game_date" value={form.game_date} onChange={updateGameForm} required /></label>
            <label>Game Time<input type="time" name="game_time" value={form.game_time} onChange={updateGameForm} required /></label>
            <label>Game Type
              <select name="level" value={form.level} onChange={updateGameForm} required>
                {gameAssignmentLevelOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="rtbo-required-crew-panel">
            <label>Required Officials / Positions
              <select name="officials_required" value={form.officials_required} onChange={updateGameForm} required>
                <option value="3">Referee, Umpire 1, Umpire 2</option>
                <option value="4">Referee, Umpire 1, Umpire 2, Alternate</option>
              </select>
            </label>
            <div className="rtbo-required-crew-list" aria-label="Required crew positions">
              {selectedRequiredPositions.map(position => <span key={position.id}>{position.name}</span>)}
            </div>
            <p>These positions define the crew needed for this game. The Master Schedule will require each position to be filled before the game can be published to officials.</p>
          </div>
          <div className="grid three">
            <label>Venue: School / Event Center
              <select name="school_event_center_id" value={form.school_event_center_id} onChange={updateGameForm} required>
                <option value="">Select school or event center</option>
                {venues.map(venue => <option key={`${venue.record_type}-${venue.id}`} value={venue.id}>{venue.name}{venue.gym_name ? ` - ${venue.gym_name}` : ''} ({venue.record_type === 'event_center' ? 'Event Center' : 'School'})</option>)}
              </select>
            </label>
            <label>Court
              <select name="court_label" value={form.court_label} onChange={updateGameForm} disabled={!selectedVenue}>
                {!selectedVenue && <option value="">Select venue first</option>}
                {courtOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>Games This Night<input type="number" min="1" name="games_per_night" value={form.games_per_night} onChange={updateGameForm} /></label>
          </div>
          <div className="rtbo-team-role-grid">
            <div className="rtbo-team-role-row">
              <label>Team Name
                <select name="home_team_id" value={form.home_team_id} onChange={updateGameForm} required>
                  <option value="">Select team</option>
                  {teamOptions.map(team => <option key={team.id} value={team.id}>{teamOptionLabel(team, schools)}</option>)}
                </select>
              </label>
              <label>Designation
                <span className="rtbo-readonly-designation" aria-label="Home team designation">Home Team</span>
              </label>
            </div>
            <div className="rtbo-team-role-row">
              <label>Team Name
                <select name="away_team_id" value={form.away_team_id} onChange={updateGameForm} required>
                  <option value="">Select team</option>
                  {teamOptions.map(team => <option key={team.id} value={team.id}>{teamOptionLabel(team, schools)}</option>)}
                </select>
              </label>
              <label>Designation
                <span className="rtbo-readonly-designation" aria-label="Visiting team designation">Visiting Team</span>
              </label>
            </div>
          </div>
          <div className="grid one">
            <label>Fee Per Official<input type="number" min="0" step="0.01" name="fee_per_official" value={form.fee_per_official} onChange={updateGameForm} placeholder="Fee amount" /></label>
          </div>
          {selectedVenue && (
            <div className="rtbo-game-venue-preview">
              <strong>{selectedVenue.gym_name || selectedVenue.name}</strong>
              <span>{[selectedVenue.address_line1, selectedVenue.city, selectedVenue.state, selectedVenue.zip].filter(Boolean).join(', ')}</span>
              <span>{courtOptions.length} court option{courtOptions.length === 1 ? '' : 's'} available: {courtOptions.join(', ')}</span>
            </div>
          )}
          <label>Assignment Notes<textarea name="notes" value={form.notes} onChange={updateGameForm} placeholder="Internal notes for scheduling, crew needs, or court usage." /></label>
          <div className="rtbo-member-actions">
            <button className="btn" type="submit" disabled={saving || loading || !hasReferenceData}>{saving ? 'Saving...' : 'Create Game Assignment'}</button>
          </div>
          {!loading && !hasReferenceData && <p className="form-message error">Add at least one school or event center and two school-linked teams before creating a game assignment.</p>}
          {error && <p className="form-message error">{error}</p>}
        </form>
      )}

      {isMasterSchedule && <div className="rtbo-game-assignment-list" aria-label="Created game assignments">
        <div className="rtbo-dashboard-card-head compact">
          <div>
            <p className="eyebrow">Created Games</p>
            <h4>Game Assignment Records</h4>
          </div>
        </div>
        {loading && <p className="rtbo-empty-state">Loading game assignments...</p>}
        {!loading && games.length === 0 && <p className="rtbo-empty-state">No game assignments have been created yet.</p>}
        {!loading && games.map(game => (
          <article className="rtbo-game-assignment-record" key={game.id}>
            <div className="rtbo-game-assignment-matchup">
              <span className={game.published ? 'rtbo-status-pill published' : 'rtbo-status-pill'}>{game.published ? 'Published' : 'Unpublished'}</span>
              <strong>{game.away_team || 'Visiting Team'} at {game.home_team || 'Home Team'}</strong>
              <small>{formatGameDate(game.game_date)} at {formatGameTime(game.game_time)} / {game.level || 'Game type pending'}</small>
            </div>
            <div className="rtbo-game-assignment-meta">
              <span>{game.location_name || 'Location pending'}</span>
              <span>{game.location_address || 'Address pending'}</span>
              <span>{game.court_label || `Court ${game.court_number || 1}`} / {game.games_per_night || 1} game{Number(game.games_per_night || 1) === 1 ? '' : 's'}</span>
            </div>
            <div className="rtbo-game-assignment-crew-wrap">
              {renderAssignedCrew(game)}
            </div>
            <div className="rtbo-table-actions rtbo-game-record-actions">
              <button type="button" onClick={() => startAssigning(game)} disabled={saving || !hasAssignableOfficials}>{String(assigningGameId) === String(game.id) ? 'Close Assign' : 'Assign Officials'}</button>
              <button className="rtbo-publish-officials-btn" type="button" onClick={() => togglePublished(game)} disabled={saving}>{game.published ? 'Unpublish from assigned officials' : 'Publish immediately to assigned officials'}</button>
            </div>
            {String(assigningGameId) === String(game.id) && (
              <form className="rtbo-assign-official-panel" onSubmit={(event) => assignOfficialToGame(event, game)}>
                <label>Available Official
                  <select name="official_id" value={assignmentForm.official_id} onChange={updateAssignmentForm} required>
                    <option value="">Select active official</option>
                    {officials.map(official => (
                      <option key={official.id} value={official.id}>
                        {official.name || [official.first_name, official.last_name].filter(Boolean).join(' ') || official.email}{official.city || official.state ? ` - ${[official.city, official.state].filter(Boolean).join(', ')}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Position
                  <select name="position_id" value={assignmentForm.position_id} onChange={updateAssignmentForm} required>
                    {positions.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}
                  </select>
                </label>
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Assigning...' : 'Save Assignment'}</button>
              </form>
            )}
          </article>
        ))}
        {error && <p className="form-message error">{error}</p>}
      </div>}
    </section>
  );
}

function teamInitials(team = {}) {
  const source = team.name || team.school_name || team.team_name || 'Team';
  const words = String(source)
    .replace(/high school|university|college|academy|the/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return (words.length > 1 ? words.map(word => word[0]).slice(0, 3).join('') : String(source).slice(0, 3)).toUpperCase();
}

function TeamLogo({ team = {}, className = '' }) {
  const logo = team.logo || team.logo_url || '';
  return (
    <span className={`rtbo-team-logo ${logo ? 'has-logo' : 'uses-team-fallback'} ${className}`.trim()} aria-hidden="true">
      {logo && (
        <img
          src={logo}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            event.currentTarget.parentElement?.classList.add('logo-load-failed');
          }}
        />
      )}
      <strong className="rtbo-team-logo-fallback">{teamInitials(team)}</strong>
    </span>
  );
}

function CrewMemberBadge({ member = {}, index = 0, onProfileOpen }) {
  const name = member.name || [member.first_name, member.last_name].filter(Boolean).join(' ') || `Official ${index + 1}`;
  const position = member.position || member.position_name || 'Position pending';
  const modalProfile = {
    ...member,
    name,
    address: member.address || [member.address_line1, member.address_line2].filter(Boolean).join(', '),
    city: member.city || '',
    state: member.state || '',
    zip: member.zip || '',
    phone: formatPhoneNumber(member.phone || ''),
    email: member.email || ''
  };
  const photo = <ProfilePhoto person={modalProfile} alt={`${name} profile`} className="rtbo-crew-photo" />;

  return (
    <div className="rtbo-crew-member">
      {onProfileOpen ? (
        <button
          className="rtbo-crew-photo-button"
          type="button"
          onClick={() => onProfileOpen(modalProfile)}
          aria-label={`View ${name} profile details`}
        >
          {photo}
        </button>
      ) : photo}
      <span>
        <strong>{name}</strong>
        <small>{position}</small>
      </span>
    </div>
  );
}

function AssignmentCrewStrip({ crew = [], onProfileOpen }) {
  const visibleCrew = Array.isArray(crew) ? crew.filter(Boolean) : [];
  if (!visibleCrew.length) return null;

  return (
    <div className="rtbo-schedule-crew" aria-label="Assigned crew">
      {visibleCrew.map((member, index) => (
        <CrewMemberBadge
          member={member}
          index={index}
          onProfileOpen={onProfileOpen}
          key={`${member.id || member.email || member.name || 'crew'}-${member.position || index}`}
        />
      ))}
    </div>
  );
}

function assignmentKey(game = {}) {
  return String(game.assignment_id || game.id || `${game.home_team || game.home?.name || 'game'}-${game.position || ''}`);
}

function assignmentStatus(game = {}) {
  return String(game.assignment_status || game.status || 'pending').trim().toLowerCase();
}

function isPendingAssignment(game = {}) {
  return ['pending', 'assigned', 'sent', 'published', 'response required', 'response_required', 'awaiting response', 'awaiting_response'].includes(assignmentStatus(game));
}

function isAcceptedAssignment(game = {}) {
  return assignmentStatus(game) === 'accepted';
}

function AssignmentMileage({ game = {} }) {
  if (!isAcceptedAssignment(game)) return null;
  const mileage = formatMiles(game.distance_miles);

  return (
    <div className="rtbo-assignment-mileage">
      <strong>{mileage || 'Mileage pending'}</strong>
      <span>{mileage ? 'from your last shared location to this gym.' : 'Turn on live location sharing and add game-site coordinates to calculate mileage.'}</span>
    </div>
  );
}

function AssignmentCoachContacts({ game = {} }) {
  const coaches = [
    ['Home Head Coach', game.home_team_coach || game.homeCoach || game.home_coach || null],
    ['Visiting Head Coach', game.away_team_coach || game.awayCoach || game.away_coach || null]
  ];

  return (
    <div className="rtbo-assignment-coach-contacts">
      {coaches.map(([label, coach]) => {
        const name = coach?.name || '';
        const email = coach?.email || '';
        const phone = formatPhoneNumber(coach?.phone || '');
        const hasContact = Boolean(name || email || phone);
        return (
          <article className="rtbo-assignment-coach-card" key={label}>
            <strong>{label}</strong>
            <span>{name || 'Head coach pending'}</span>
            <small>
              {hasContact
                ? [email, phone].filter(Boolean).join(' / ') || 'Contact details pending'
                : 'Add coach details to the team or school record.'}
            </small>
          </article>
        );
      })}
    </div>
  );
}

function AssignmentResponsePanel({ game, reason = '', saving = false, onReasonChange, onAccept, onDecline }) {
  if (!isPendingAssignment(game)) return null;

  return (
    <div className="rtbo-assignment-response-panel">
      <div>
        <strong>Response Required</strong>
        <span>This published assignment is waiting on the official to accept or decline.</span>
      </div>
      <div className="rtbo-assignment-response-actions">
        <button className="btn" type="button" disabled={saving} onClick={onAccept}>{saving ? 'Saving...' : 'Accept Assignment'}</button>
        <button className="btn secondary dark-btn" type="button" disabled={saving} onClick={onDecline}>Decline Assignment</button>
      </div>
      <label className="rtbo-decline-reason-field">
        Decline Reason <span>Required to decline. N/A is not accepted.</span>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange?.(event.target.value)}
          placeholder="Reason for declining the assignment."
        />
      </label>
    </div>
  );
}

function OfficialProfileModal({ profile, onClose }) {
  if (!profile) return null;
  const name = profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Official';
  const address = profile.address || [profile.address_line1, profile.address_line2].filter(Boolean).join(', ');

  return (
    <div className="rtbo-modal-scrim" role="presentation" onClick={onClose}>
      <section className="rtbo-official-profile-modal" role="dialog" aria-modal="true" aria-label={`${name} profile`} onClick={(event) => event.stopPropagation()}>
        <button className="rtbo-modal-close" type="button" onClick={onClose}>×</button>
        <ProfilePhoto person={profile} alt={`${name} profile`} className="rtbo-profile-modal-photo" />
        <div>
          <p className="eyebrow">{formatLabel(profile.position || profile.role || 'Official')} Profile</p>
          <h3>{name}</h3>
          <dl>
            <div><dt>Address</dt><dd>{address || 'Address not listed'}</dd></div>
            <div><dt>City</dt><dd>{profile.city || 'City not listed'}</dd></div>
            <div><dt>State</dt><dd>{profile.state || 'State not listed'}</dd></div>
            <div><dt>Zip</dt><dd>{profile.zip || 'Zip not listed'}</dd></div>
            <div><dt>Email</dt><dd>{profile.email || 'Email not listed'}</dd></div>
            <div><dt>Phone</dt><dd>{formatPhoneNumber(profile.phone || '') || 'Phone not listed'}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function MemberProfilePage({ member, classifications = [], profileData = null, profileLoading = false, onBack, onEdit }) {
  const [crewProfileModal, setCrewProfileModal] = useState(null);
  const fullAddress = [
    member.address_line1,
    member.address_line2,
    member.city,
    member.state,
    member.zip
  ].filter(Boolean).join(', ');
  const location = [member.city, member.state].filter(Boolean).join(', ');
  const isOfficial = member.role === 'official';
  const active = member.status === 'active';
  const memberNameParts = splitName(member.name || '');
  const memberFirstName = member.first_name || memberNameParts.firstName;
  const memberLastName = member.last_name || memberNameParts.lastName;
  const memberRoleLabel = member.role_label || formatLabel(member.role || 'member');
  const memberTitleLabel = member.member_title || '';
  const memberPhone = formatPhoneNumber(member.phone || '');
  const memberStatusLabel = active ? 'Active - Ready For Assignments' : 'Inactive - Profile Update Required';
  const conferences = String(member.conferences || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const memberAssignments = Array.isArray(profileData?.assignments) ? profileData.assignments : [];
  const memberReports = Array.isArray(profileData?.gameReports) ? profileData.gameReports : [];
  const memberFilm = Array.isArray(profileData?.filmClips) ? profileData.filmClips : [];
  const memberEvaluations = Array.isArray(profileData?.evaluations) ? profileData.evaluations : [];

  return (
    <section className="rtbo-official-profile-page rtbo-member-profile-page">
      <div className="rtbo-form-toolbar">
        <button className="btn secondary dark-btn" type="button" onClick={onBack}>Back To Members</button>
        <button className="btn" type="button" onClick={() => onEdit(member)}>Edit Profile</button>
      </div>
      {profileLoading && <p className="rtbo-dashboard-status">Loading live profile records...</p>}

      <article className="rtbo-dashboard-card rtbo-member-personal-profile">
        <div className="rtbo-profile-preview rtbo-member-profile-banner">
          <ProfilePhoto person={member} alt={`${member.name || 'Member'} profile`} />
          <div>
            <p className="eyebrow">{isOfficial ? 'Official Profile' : 'Member Profile'}</p>
            <h3>{member.name || 'Name Not Entered'}</h3>
            <strong className="rtbo-profile-status-title">Status:</strong>
            <p><b>{memberStatusLabel}</b></p>
            <p>{emptyLabel(member.email, 'Email not entered')} • {emptyLabel(memberPhone, 'Phone not entered')}</p>
            {memberTitleLabel && <p>{memberTitleLabel}</p>}
            <p>{emptyLabel(fullAddress || location, 'Address not entered')}</p>
            <p>{conferences.length ? conferences.join(', ') : 'Conferences not entered'}</p>
          </div>
        </div>
        <div className="form rtbo-profile-form rtbo-member-readonly-form">
          <div className="grid two">
            <label>First Name<input value={memberFirstName} readOnly /></label>
            <label>Last Name<input value={memberLastName} readOnly /></label>
          </div>
          <div className="grid two">
            <label>Email<input value={member.email || ''} readOnly /></label>
            <label>Phone<input type="tel" value={memberPhone} readOnly /></label>
          </div>
          <div className="grid two">
            <label>Sex<select value={member.sex || ''} disabled onChange={() => {}}>{sexOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label>
            <label>Race<select value={member.race || ''} disabled onChange={() => {}}>{raceOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="grid two">
            <label>Address 1<input value={member.address_line1 || ''} readOnly /></label>
            <label>Address 2<input value={member.address_line2 || ''} readOnly /></label>
          </div>
          <div className="grid three">
            <label>City<input value={member.city || ''} readOnly /></label>
            <label>State<StateSelect value={member.state || ''} disabled /></label>
            <label>Zip<input value={member.zip || ''} readOnly /></label>
          </div>
          <label>High School / College Conferences Worked<textarea value={member.conferences || ''} readOnly placeholder="Conferences will appear here." /></label>
          <label>Level of Experience / Notes<textarea value={member.experience || ''} readOnly placeholder={`${memberRoleLabel}${isOfficial && active && member.official_rank ? ` / Rank #${member.official_rank}` : ''}`} /></label>
          {member.role === 'coach' && <label>Coach Assignment<input value={memberTitleLabel} readOnly placeholder="Coach assignment not entered" /></label>}
          <label>Competition Classification<textarea value={classifications.join(', ')} readOnly placeholder="Competition classifications will appear here." /></label>
          <label>Profile Picture<input type="file" disabled /></label>
          <div className="button-row">
            <button className="btn" type="button" onClick={() => onEdit(member)}>Edit Profile</button>
            <button className="btn secondary dark-btn" type="button" onClick={onBack}>Back To Members</button>
          </div>
        </div>
      </article>

      <section className="rtbo-official-work-grid">
        <article className="rtbo-dashboard-card rtbo-work-schedule">
          <div className="rtbo-dashboard-card-head">
            <div>
              <p className="eyebrow">Published Schedule</p>
              <h3>Assigned Games</h3>
              <p>Games will appear here only after they are created, assigned, and published.</p>
            </div>
          </div>
          <div className="rtbo-official-schedule-list">
            {!profileLoading && memberAssignments.length === 0 && <p className="rtbo-empty-state">No published assignments are available for this member yet.</p>}
            {memberAssignments.map((game) => (
              <article className="rtbo-official-schedule-card" key={`${game.id}-${game.assignment_id || game.position}`}>
                <div className="rtbo-schedule-matchup">
                  <div className="rtbo-schedule-team"><TeamLogo team={{ logo: game.home_team_logo }} /><strong>{game.home_team || 'Home Team'}</strong></div>
                  <span className="rtbo-schedule-vs">vs</span>
                  <div className="rtbo-schedule-team"><TeamLogo team={{ logo: game.away_team_logo }} /><strong>{game.away_team || 'Visiting Team'}</strong></div>
                  <small>{formatGameDate(game.game_date)} at {formatGameTime(game.game_time)}</small>
                </div>
                <div><span>{game.location_name || 'Gym pending'}</span><small>{game.location_address || 'Gym address pending'}</small></div>
                <div><mark>{game.position || 'Position pending'}</mark><small>{formatLabel(game.assignment_status || 'pending')}</small></div>
                <AssignmentCoachContacts game={game} />
                <AssignmentMileage game={game} />
                <AssignmentCrewStrip crew={game.crew} onProfileOpen={setCrewProfileModal} />
              </article>
            ))}
          </div>
        </article>
        <article className="rtbo-dashboard-card rtbo-work-postgame">
          <div className="rtbo-dashboard-card-head">
            <div>
              <p className="eyebrow">Post Game</p>
              <h3>Game Reports</h3>
              <p>Completed game reports submitted by this member will appear here.</p>
            </div>
          </div>
          <div className="rtbo-official-record-list">
            {!profileLoading && memberReports.length === 0 && <p className="rtbo-empty-state">No game reports are available for this member yet.</p>}
            {memberReports.map(report => (
              <article key={report.id}>
                <div><strong>{report.title || `${report.away_team || 'Visiting Team'} at ${report.home_team || 'Home Team'}`}</strong><span>{formatLabel(report.status || 'submitted')}</span></div>
                <p>{report.detail || report.notes || 'Report details will appear here after submission.'}</p>
                <small>{formatGameDate(report.created_at || report.game_date || report.date)}</small>
              </article>
            ))}
          </div>
        </article>
        <article className="rtbo-dashboard-card rtbo-work-evaluation">
          <div className="rtbo-dashboard-card-head">
            <div>
              <p className="eyebrow">Evaluation</p>
              <h3>Rankings & Feedback</h3>
              <p>Approved evaluations and rankings controlled by the Super Admin will appear here.</p>
            </div>
          </div>
          <div className="rtbo-official-record-list rtbo-official-evaluation-list">
            {!profileLoading && memberEvaluations.length === 0 && <p className="rtbo-empty-state">No approved evaluations are available for this member yet.</p>}
            {memberEvaluations.map(evaluation => (
              <article key={evaluation.id}>
                <div><strong>Total Score: {evaluation.total || evaluation.total_score || 'Pending'}</strong><span>{formatGameDate(evaluation.created_at || evaluation.date)}</span></div>
                {evaluation.scores && (
                  <div className="rtbo-score-grid">
                    {Object.entries(evaluation.scores).map(([label, score]) => <span key={label}>{label}: <b>{score}</b></span>)}
                  </div>
                )}
                <p>{evaluation.comments || evaluation.comments_to_official || 'Evaluation comments will appear after release.'}</p>
              </article>
            ))}
          </div>
        </article>
        <article className="rtbo-dashboard-card rtbo-work-education">
          <div className="rtbo-dashboard-card-head">
            <div>
              <p className="eyebrow">Education</p>
              <h3>Film & Clips</h3>
              <p>Assigned film, clips, and education links will appear on this profile.</p>
            </div>
          </div>
          <div className="rtbo-official-record-list">
            {!profileLoading && memberFilm.length === 0 && <p className="rtbo-empty-state">No game film or education clips are available for this member yet.</p>}
            {memberFilm.map(clip => (
              <article key={clip.id}>
                <div><strong>{clip.title || 'Game Film'}</strong><span>{formatGameDate(clip.created_at || clip.date)}</span></div>
                <p>{clip.detail || clip.notes || 'Assigned film details will appear here.'}</p>
                {clip.file_url && <a href={clip.file_url}>Open Film</a>}
              </article>
            ))}
          </div>
        </article>
      </section>
      <OfficialProfileModal profile={crewProfileModal} onClose={() => setCrewProfileModal(null)} />
    </section>
  );
}

function projectMapPosition(official = {}, target = null, index = 0, total = 1) {
  const location = official.location || {};
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  if (target && Number.isFinite(lat) && Number.isFinite(lng)) {
    const targetLat = Number(target.latitude);
    const targetLng = Number(target.longitude);
    if (Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
      const x = Math.max(8, Math.min(92, 50 + ((lng - targetLng) * 3500)));
      const y = Math.max(8, Math.min(92, 50 - ((lat - targetLat) * 3500)));
      return { left: `${x}%`, top: `${y}%` };
    }
  }

  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return {
    left: `${50 + Math.cos(angle) * 34}%`,
    top: `${50 + Math.sin(angle) * 28}%`
  };
}

function getValidMapPoint(point = null) {
  if (!point) return null;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    label: point.label || point.location_name || point.name || 'Map Center'
  };
}

function getMapCenter(target = null, officials = []) {
  const targetPoint = getValidMapPoint(target);
  if (targetPoint) return targetPoint;

  const officialPoint = officials
    .map(official => getValidMapPoint({ ...(official.location || {}), label: official.name }))
    .find(Boolean);

  return officialPoint || {
    latitude: 34.7465,
    longitude: -92.2896,
    label: 'Little Rock, AR'
  };
}

function googleEarthImageryUrl(center = null) {
  const mapCenter = getValidMapPoint(center);
  const address = String(center?.location_address || center?.address || '').trim();
  const label = String(center?.label || center?.location_name || center?.name || '').trim();
  if (!mapCenter && !address && !label) return '';
  const query = mapCenter
    ? `${mapCenter.latitude.toFixed(6)},${mapCenter.longitude.toFixed(6)}`
    : address || label;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&t=k&output=embed`;
}

function GoogleEarthImageryLayer({ center, compact = false }) {
  const mapUrl = googleEarthImageryUrl(center);

  return (
    <div className={`rtbo-google-earth-layer ${compact ? 'compact' : ''}`}>
      {mapUrl ? (
        <iframe
          title={`Google Earth imagery preview centered on ${center?.label || 'official location'}`}
          src={mapUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="rtbo-google-earth-fallback">
          <strong>Imagery Pending</strong>
          <span>Add game-site or official coordinates to show Google Earth imagery.</span>
        </div>
      )}
      <span className="rtbo-map-imagery-badge">Google Earth imagery</span>
    </div>
  );
}

function arrivalLabel(status = null) {
  if (!status) return 'Not assigned to selected game';
  if (status.arrival_verified_at) return `Arrived ${formatGeoTimestamp(status.arrival_verified_at)}`;
  if (status.inside_radius) return 'Inside arrival radius';
  if (status.current_distance_miles !== null && status.current_distance_miles !== undefined) {
    return `${formatMiles(status.current_distance_miles)} away`;
  }
  return formatLabel(status.assignment_status || 'Assignment pending');
}

function LiveGeoTracker({ onStatus }) {
  const [officials, setOfficials] = useState([]);
  const [games, setGames] = useState([]);
  const [venues, setVenues] = useState([]);
  const [targetGame, setTargetGame] = useState(null);
  const [targetVenue, setTargetVenue] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [refreshedAt, setRefreshedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapMode, setMapMode] = useState('3d');
  const [error, setError] = useState('');

  async function loadLiveLocations() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedGameId) {
        params.set('game_id', selectedGameId);
      } else if (selectedVenueId) {
        params.set('venue_id', selectedVenueId);
      }
      const data = await apiGet(`/admin-geo-locations.php${params.toString() ? `?${params.toString()}` : ''}`);
      setOfficials(data.officials || []);
      setGames(data.games || []);
      setVenues(data.venues || []);
      setTargetGame(data.target_game || null);
      setTargetVenue(data.target_venue || null);
      setRefreshedAt(data.refreshed_at || '');
      onStatus?.('Live map refreshed from current official location records.');
    } catch (requestError) {
      const message = requestError.message || 'Live map could not be loaded.';
      setError(message);
      onStatus?.(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLiveLocations();
  }, [selectedGameId, selectedVenueId]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(loadLiveLocations, 5000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, selectedGameId, selectedVenueId]);

  const target = targetGame
    ? { latitude: targetGame.latitude, longitude: targetGame.longitude, label: targetGame.label || targetGame.location_name || 'Game Site' }
    : targetVenue
      ? {
          latitude: targetVenue.latitude,
          longitude: targetVenue.longitude,
          label: targetVenue.label || targetVenue.location_name || 'Selected Venue',
          location_name: targetVenue.location_name || targetVenue.label || '',
          location_address: targetVenue.location_address || ''
        }
      : null;
  const trackedOfficials = officials.filter(official => official.location?.consent_enabled && official.location?.latitude !== null && official.location?.longitude !== null);
  const closestOfficial = trackedOfficials.find(official => official.distance_miles !== null && official.distance_miles !== undefined);
  const mapCenter = getMapCenter(target, trackedOfficials);
  const projectionTarget = target || mapCenter;
  const selectedTargetNeedsCoordinates = target && !getValidMapPoint(target);

  return (
    <section className="rtbo-dashboard-card rtbo-live-geo-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Live Game-Site Coverage</p>
          <h3>2D / 3D Official Location Map</h3>
          <p>Use this screen to find the closest available official and verify arrival timestamps for accepted game assignments.</p>
        </div>
        <div className="button-row">
          <button className={`btn secondary dark-btn ${mapMode === '2d' ? 'active' : ''}`} type="button" onClick={() => setMapMode('2d')}>2D</button>
          <button className={`btn secondary dark-btn ${mapMode === '3d' ? 'active' : ''}`} type="button" onClick={() => setMapMode('3d')}>3D</button>
          <button className="btn" type="button" onClick={loadLiveLocations} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh Live'}</button>
        </div>
      </div>

      <div className="rtbo-live-geo-controls">
        <label>Game Site
          <select value={selectedGameId} onChange={(event) => { setSelectedGameId(event.target.value); if (event.target.value) setSelectedVenueId(''); }}>
            <option value="">No game selected</option>
            {games.map(game => (
              <option key={game.id} value={game.id}>
                {game.away_team || 'Away'} at {game.home_team || 'Home'} - {game.location_name || 'Location pending'}{game.location_lat === null ? ' (needs coordinates)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>School / Event Center
          <select value={selectedVenueId} onChange={(event) => { setSelectedVenueId(event.target.value); if (event.target.value) setSelectedGameId(''); }}>
            <option value="">Select school or event center</option>
            {venues.map(venue => (
              <option key={`${venue.record_type}-${venue.id}`} value={venue.id}>
                {venue.name}{venue.gym_name ? ` - ${venue.gym_name}` : ''} ({venue.record_type === 'event_center' ? 'Event Center' : 'School'})
              </option>
            ))}
          </select>
        </label>
        <label className="rtbo-live-toggle"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /> Live refresh every 5 seconds</label>
      </div>

      {error && <p className="form-message error">{error}</p>}
      {selectedGameId && !targetGame && <p className="rtbo-dashboard-status">This selected game needs latitude and longitude before distance and arrival verification can be calculated.</p>}
      {selectedVenueId && selectedTargetNeedsCoordinates && <p className="rtbo-dashboard-status">This selected school or event center is loaded from the database. Google imagery can use the saved address, but distance ranking and arrival verification require saved coordinates for that venue.</p>}

      <div className={`rtbo-live-map ${mapMode === '3d' ? 'is-3d' : 'is-2d'}`}>
        <GoogleEarthImageryLayer center={target || mapCenter} />
        <div className="rtbo-live-map-grid" aria-hidden="true" />
        {target && (
          <div className="rtbo-map-target" style={{ left: '50%', top: '50%' }}>
            <span>Game Site</span>
            <strong>{target.label || 'Choose a target'}</strong>
          </div>
        )}
        {trackedOfficials.map((official, index) => {
          const position = projectMapPosition(official, projectionTarget, index, trackedOfficials.length);
          return (
            <div
              className={`rtbo-map-official ${official.arrival_status?.arrival_verified_at ? 'arrived' : ''}`}
              style={position}
              key={official.id}
              title={`${official.name} - ${arrivalLabel(official.arrival_status)}`}
            >
              <GeoTrackingIcon person={official} alt={`${official.name} live geo tracking marker`} />
              <span>{official.name}</span>
            </div>
          );
        })}
      </div>

      <section className="rtbo-live-geo-summary">
        <article>
          <span>Tracked Officials</span>
          <strong>{trackedOfficials.length}</strong>
          <small>{officials.length - trackedOfficials.length} without live location sharing.</small>
        </article>
        <article>
          <span>Closest Official</span>
          <strong>{closestOfficial ? formatMiles(closestOfficial.distance_miles) : 'Pending'}</strong>
          <small>{closestOfficial?.name || 'Choose a game-site target with coordinates.'}</small>
        </article>
        <article>
          <span>Last Refresh</span>
          <strong>{formatGeoTimestamp(refreshedAt)}</strong>
          <small>Auto-refresh is {autoRefresh ? 'on' : 'off'}.</small>
        </article>
      </section>

      <div className="rtbo-live-official-list">
        <div className="rtbo-dashboard-card-head">
          <div>
            <p className="eyebrow">Closest To Farthest</p>
            <h3>Officials Near The Game Site</h3>
          </div>
        </div>
        {officials.length === 0 && <p className="rtbo-empty-state">No officials have been added yet.</p>}
        {officials.map((official, index) => (
          <article className="rtbo-live-official-row" key={official.id}>
            <strong>#{index + 1}</strong>
            <ProfilePhoto person={official} alt={`${official.name} profile`} />
            <div>
              <h4>{official.name || 'Official'}</h4>
              <p>{[official.city, official.state].filter(Boolean).join(', ') || 'Location profile pending'} / {emptyLabel(formatPhoneNumber(official.phone || ''), 'Phone pending')}</p>
              <small>Last shared: {formatGeoTimestamp(official.location?.updated_at)}</small>
            </div>
            <div>
              <span>{official.distance_miles !== null && official.distance_miles !== undefined ? formatMiles(official.distance_miles) : 'Distance pending'}</span>
              <small>{arrivalLabel(official.arrival_status)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const emptyOverviewData = {
  counts: {
    unaccepted_assignments: 0,
    todays_games: 0,
    scheduled_events: 0,
    upcoming_events: 0,
    tracked_officials: 0
  },
  unaccepted_assignments: [],
  todays_games: [],
  scheduled_events: [],
  upcoming_events: [],
  geo: {
    target_game: null,
    tracked_count: 0,
    untracked_count: 0,
    closest_officials: [],
    refreshed_at: ''
  }
};

function overviewGameTitle(item = {}) {
  const matchup = [item.away_team, item.home_team].filter(Boolean).join(' at ');
  return matchup || item.level || item.location_name || 'Game details pending';
}

function OverviewAlertList({ title, count, items = [], type = 'game' }) {
  return (
    <article className="rtbo-overview-alert-group">
      <div className="rtbo-overview-alert-title">
        <h4>{title}</h4>
        <span>{count}</span>
      </div>
      {items.length === 0 && <p className="rtbo-empty-state">No records to show.</p>}
      {items.slice(0, 5).map((item, index) => (
        <div className="rtbo-overview-alert-item" key={`${title}-${item.assignment_id || item.id || index}`}>
          <strong>{type === 'assignment' ? emptyLabel(item.official_name, 'Official pending') : overviewGameTitle(item)}</strong>
          {type === 'assignment' && <span>{overviewGameTitle(item)} / {item.position || 'Position pending'}</span>}
          <small>
            {formatGameDate(item.game_date)} at {formatGameTime(item.game_time)}
            {item.location_name ? ` / ${item.location_name}` : ''}
            {item.published ? ' / Published' : ' / Unpublished'}
          </small>
        </div>
      ))}
    </article>
  );
}

function OverviewAlertsWidget({ overview = emptyOverviewData }) {
  const counts = overview.counts || emptyOverviewData.counts;

  return (
    <article className="rtbo-dashboard-card rtbo-overview-widget rtbo-overview-alerts">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Alerts</p>
          <h3>Game-Day Watch List</h3>
          <p>Track officials who still need to accept games, today's schedule, scheduled events, and upcoming events.</p>
        </div>
      </div>
      <div className="rtbo-overview-alert-grid">
        <OverviewAlertList
          title="Officials Not Accepted Games"
          count={counts.unaccepted_assignments || 0}
          items={overview.unaccepted_assignments || []}
          type="assignment"
        />
        <OverviewAlertList
          title="Today's Games"
          count={counts.todays_games || 0}
          items={overview.todays_games || []}
        />
        <OverviewAlertList
          title="Scheduled Events"
          count={counts.scheduled_events || 0}
          items={overview.scheduled_events || []}
        />
        <OverviewAlertList
          title="Upcoming Events"
          count={counts.upcoming_events || 0}
          items={overview.upcoming_events || []}
        />
      </div>
    </article>
  );
}

function NotificationCenter({
  notifications = [],
  unreadCount = 0,
  onMarkRead = () => {},
  onMarkAllRead = () => {},
  eyebrow = 'Notifications',
  title = 'Notification Center',
  description = 'Alerts are stored by the server and shown to the roles or members who need to act on them.',
  canReleaseMessages = false,
  releaseMessage = { audience: 'everyone', title: '', body: '' },
  releaseMessageStatus = '',
  onReleaseMessageChange = () => {},
  onReleaseMessageSubmit = () => {},
  compact = false
}) {
  return (
    <article className={`rtbo-dashboard-card rtbo-notification-center${compact ? ' compact' : ''}`}>
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="rtbo-notification-actions">
          <span className="rtbo-notification-badge">{unreadCount} unread</span>
          <button className="btn secondary dark-btn" type="button" onClick={onMarkAllRead} disabled={!unreadCount}>Mark All as Read</button>
        </div>
      </div>

      {canReleaseMessages && (
        <form className="rtbo-notification-release form" onSubmit={onReleaseMessageSubmit}>
          <div className="grid three">
            <label>Audience
              <select name="audience" value={releaseMessage.audience} onChange={onReleaseMessageChange}>
                <option value="everyone">Everyone</option>
                <option value="officials">Officials</option>
                <option value="coaches">Coaches</option>
                <option value="school_admins">School Admins / AD / SID / Commissioners</option>
                <option value="admins">Admins</option>
              </select>
            </label>
            <label>Message Title<input name="title" value={releaseMessage.title} onChange={onReleaseMessageChange} placeholder="Message title" /></label>
            <div className="rtbo-notification-release-action">
              <button className="btn" type="submit">Release Message</button>
            </div>
          </div>
          <label>Message
            <textarea name="body" value={releaseMessage.body} onChange={onReleaseMessageChange} placeholder="Write the notification details members should receive." />
          </label>
          {releaseMessageStatus && <p className="form-message">{releaseMessageStatus}</p>}
        </form>
      )}

      <div className="rtbo-notification-list">
        {notifications.length === 0 && <p className="rtbo-empty-state">No active notifications are available. Read notifications are archived automatically.</p>}
        {notifications.map(notification => (
          <div className={`rtbo-notification-item${notification.is_read ? '' : ' unread'}`} key={notification.id}>
            <div>
              <strong>{notification.title || 'Notification'}</strong>
              <p>{notification.body || 'No details provided.'}</p>
              <small>
                {formatNotificationTimestamp(notification.created_at)}
                {notification.actor_name ? ` / ${notification.actor_name}` : ''}
                {notification.type ? ` / ${formatLabel(notification.type)}` : ''}
              </small>
            </div>
            {!notification.is_read && (
              <button className="btn secondary dark-btn" type="button" onClick={() => onMarkRead(notification.id)}>Mark as Read</button>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}


function OverviewGeoWidget({ geo = emptyOverviewData.geo, onOpenLiveMap }) {
  const [mapMode, setMapMode] = useState('3d');
  const closestOfficials = geo.closest_officials || [];
  const trackedOfficials = closestOfficials.filter(official => official.location?.consent_enabled && official.location?.latitude !== null && official.location?.longitude !== null);
  const target = geo.target_game
    ? {
        latitude: geo.target_game.latitude,
        longitude: geo.target_game.longitude,
        label: geo.target_game.label || geo.target_game.location_name || 'Next Game Site'
      }
    : null;
  const mapCenter = getMapCenter(target, trackedOfficials);
  const projectionTarget = target || mapCenter;

  return (
    <article className="rtbo-dashboard-card rtbo-overview-widget rtbo-overview-geo">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Geo Tracking</p>
          <h3>Closest Officials</h3>
          <p>Live location records help verify arrival times and locate nearby officials when coverage changes quickly.</p>
        </div>
        <div className="button-row rtbo-map-mode-controls">
          <button className={`btn secondary dark-btn ${mapMode === '2d' ? 'active' : ''}`} type="button" onClick={() => setMapMode('2d')}>2D</button>
          <button className={`btn secondary dark-btn ${mapMode === '3d' ? 'active' : ''}`} type="button" onClick={() => setMapMode('3d')}>3D</button>
          <button className="btn secondary dark-btn" type="button" onClick={onOpenLiveMap}>Open Map</button>
        </div>
      </div>
      <div className={`rtbo-overview-mini-map ${mapMode === '3d' ? 'is-3d' : 'is-2d'}`}>
        <GoogleEarthImageryLayer center={mapCenter} compact />
        <div className="rtbo-live-map-grid" aria-hidden="true" />
        {target && (
          <div className="rtbo-map-target" style={{ left: '50%', top: '50%' }}>
            <span>Game Site</span>
            <strong>{target.label || 'No game coordinates yet'}</strong>
          </div>
        )}
        {trackedOfficials.slice(0, 4).map((official, index) => (
          <div
            className={`rtbo-map-official ${official.arrival_status?.arrival_verified_at ? 'arrived' : ''}`}
            style={projectMapPosition(official, projectionTarget, index, trackedOfficials.length)}
            key={official.id}
            title={`${official.name} - ${arrivalLabel(official.arrival_status)}`}
          >
            <GeoTrackingIcon person={official} alt={`${official.name} live geo tracking marker`} />
            <span>{official.name}</span>
          </div>
        ))}
      </div>
      <section className="rtbo-live-geo-summary rtbo-overview-geo-summary">
        <article>
          <span>Tracking</span>
          <strong>{geo.tracked_count || 0}</strong>
          <small>{geo.untracked_count || 0} officials not sharing live location.</small>
        </article>
        <article>
          <span>Target</span>
          <strong>{target?.label || 'Pending'}</strong>
          <small>{geo.target_game?.location_name || 'Add coordinates to games for distance ranking.'}</small>
        </article>
        <article>
          <span>Refresh</span>
          <strong>{formatGeoTimestamp(geo.refreshed_at)}</strong>
          <small>Overview data loads from the server.</small>
        </article>
      </section>
      <div className="rtbo-overview-nearby-list">
        {closestOfficials.slice(0, 4).map(official => (
          <div className="rtbo-overview-nearby-row" key={official.id}>
            <GeoTrackingIcon person={official} alt={`${official.name} live geo tracking marker`} className="compact" />
            <div>
              <strong>{official.name || 'Official'}</strong>
              <small>{official.distance_miles !== null && official.distance_miles !== undefined ? formatMiles(official.distance_miles) : 'Distance pending'} / {arrivalLabel(official.arrival_status)}</small>
            </div>
          </div>
        ))}
        {closestOfficials.length === 0 && <p className="rtbo-empty-state">No official location records are available yet.</p>}
      </div>
    </article>
  );
}

function directoryItemKey(item = {}) {
  if (item.directory_key) return item.directory_key;
  return `member-${item.id}`;
}

function scheduleDirectoryEntry(record = {}) {
  const recordType = record.record_type || 'school';
  const typeLabel = record.type_label || formatLabel(recordType);
  const isTeam = recordType === 'team';
  const title = isTeam
    ? [record.school_name, record.head_coach_name ? `Coach: ${record.head_coach_name}` : ''].filter(Boolean).join(' / ')
    : [record.gym_name, record.courts ? `${record.courts} court${Number(record.courts) === 1 ? '' : 's'}` : ''].filter(Boolean).join(' / ');

  return {
    ...record,
    directory_key: `schedule-${recordType}-${record.id}`,
    directory_source: 'schedule_record',
    is_schedule_entity: true,
    source_id: record.id,
    role: recordType,
    role_label: typeLabel,
    member_title: title || typeLabel,
    email: record.head_coach_email || '',
    phone: formatPhoneNumber(record.head_coach_phone || ''),
    status: record.status || 'active',
    organization: isTeam ? (record.school_name || 'Linked school pending') : (record.gym_name || record.school_name || ''),
    classifications: [typeLabel, isTeam ? record.school_name : record.gym_name].filter(Boolean).join(', ')
  };
}

function MemberDirectory({ onStatus }) {
  const [members, setMembers] = useState([]);
  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [classificationMap, setClassificationMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [directoryProfileModal, setDirectoryProfileModal] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editingScheduleRecord, setEditingScheduleRecord] = useState(null);
  const [scheduleEditForm, setScheduleEditForm] = useState(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState('');

  async function loadMembers() {
    setLoading(true);
    setError('');
    try {
      const [memberData, organizationData, scheduleData] = await Promise.all([
        apiGet('/admin-members.php'),
        apiGet('/admin-organizations.php'),
        apiGet('/admin-schools.php')
      ]);
      const loadedMembers = memberData.members || [];
      const loadedScheduleRecords = scheduleData.records || [];
      const recordsById = new Map((organizationData.records || []).map(record => [Number(record.id), record.name]));
      const linkedClassifications = {};
      Object.entries(organizationData.official_links || {}).forEach(([officialId, classificationIds]) => {
        linkedClassifications[officialId] = (classificationIds || [])
          .map(classificationId => recordsById.get(Number(classificationId)))
          .filter(Boolean)
          .join(', ');
      });
      setMembers(loadedMembers);
      setScheduleRecords(loadedScheduleRecords);
      setClassificationMap(linkedClassifications);
      onStatus?.('Members directory loaded from the server.');
    } catch (caught) {
      setError(caught.message || 'Members could not be loaded.');
      onStatus?.('Members directory could not load. Check the admin session and database connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function removeMember(member) {
    if (member.is_schedule_entity) {
      removeScheduleRecord(member);
      return;
    }
    if (!window.confirm(`Remove ${member.name || member.email} from the members directory?`)) return;
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-members.php', {
        action: 'delete',
        id: member.id
      });
      setMembers(current => current.filter(item => directoryItemKey(item) !== directoryItemKey(member)));
      setDirectoryProfileModal(current => directoryItemKey(current || {}) === directoryItemKey(member) ? null : current);
      onStatus?.(data.message || 'Member removed.');
    } catch (caught) {
      setError(caught.message || 'Member could not be removed.');
    } finally {
      setSaving(false);
    }
  }

  async function removeScheduleRecord(record) {
    const entityLabel = record.record_type === 'team'
      ? 'team'
      : record.record_type === 'event_center'
      ? 'event center'
      : 'school';
    const name = record.name || entityLabel;
    if (!window.confirm(`Remove ${name} from the members directory and scheduling dropdowns?`)) return;

    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-schools.php', {
        action: 'delete',
        id: record.source_id || record.id
      });
      setScheduleRecords(current => current.filter(item => Number(item.id) !== Number(record.source_id || record.id)));
      if (Number(editingScheduleRecord?.id || editingScheduleRecord?.source_id || 0) === Number(record.source_id || record.id)) {
        setEditingScheduleRecord(null);
        setScheduleEditForm(null);
      }
      onStatus?.(data.message || `${formatLabel(entityLabel)} removed from the Members Directory.`);
    } catch (caught) {
      setError(caught.message || `${formatLabel(entityLabel)} could not be removed.`);
    } finally {
      setSaving(false);
    }
  }

  function classificationItems(member) {
    if (member.is_schedule_entity) {
      return String(member.classifications || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
    const value = member.role === 'official'
      ? (classificationMap[member.id] || member.official_classification)
      : member.organization;
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  function beginEditMember(member) {
    setDirectoryProfileModal(null);
    setEditingScheduleRecord(null);
    setScheduleEditForm(null);
    setEditingMember(member);
    setEditForm({
      ...member,
      first_name: member.first_name || splitName(member.name).firstName,
      last_name: member.last_name || splitName(member.name).lastName,
      phone: formatPhoneNumber(member.phone || ''),
      member_title: member.member_title || '',
      sex: member.sex || '',
      race: member.race || '',
      address_line1: member.address_line1 || '',
      address_line2: member.address_line2 || '',
      city: member.city || '',
      state: member.state || '',
      zip: member.zip || '',
      official_classification: member.official_classification || '',
      official_rank: member.official_rank ?? '',
      status: member.status === 'active' ? 'active' : 'inactive',
      password: ''
    });
    setError('');
  }

  function beginEditScheduleRecord(record) {
    setDirectoryProfileModal(null);
    setEditingMember(null);
    setEditForm(null);
    setEditingScheduleRecord(record);
    setScheduleEditForm({
      ...record,
      id: record.source_id || record.id,
      school_id: record.school_id || '',
      courts: record.courts || 1,
      court_labels: record.court_labels || '',
      head_coach_phone: formatPhoneNumber(record.head_coach_phone || record.phone || ''),
      status: record.status || 'active'
    });
    setError('');
    onStatus?.(`Editing ${record.name || record.type_label || 'directory record'}.`);
  }

  function cancelEditScheduleRecord() {
    setEditingScheduleRecord(null);
    setScheduleEditForm(null);
    setError('');
  }

  async function openDirectoryProfile(member) {
    if (member.is_schedule_entity) {
      beginEditScheduleRecord(member);
      return;
    }

    setDirectoryProfileModal(member);
    onStatus?.(`Opened ${member.name || member.email} quick profile details.`);
  }

  function updateEditMember(event) {
    const { name, value } = event.target;
    setEditForm(current => ({
      ...current,
      [name]: formatFormFieldValue(name, value)
    }));
  }

  function updateScheduleEditRecord(event) {
    const { name, value } = event.target;
    setScheduleEditForm(current => ({
      ...current,
      [name]: name === 'courts' ? Math.max(1, Number(value || 1)) : formatFormFieldValue(name, value)
    }));
  }

  async function saveScheduleEditRecord(event) {
    event.preventDefault();
    if (!editingScheduleRecord || !scheduleEditForm) return;

    setSaving(true);
    setError('');
    try {
      const recordId = editingScheduleRecord.source_id || editingScheduleRecord.id;
      const linkedSchool = editingScheduleRecord.record_type === 'team'
        ? activeSchoolRecords.find(school => String(school.id) === String(scheduleEditForm.school_id))
        : null;
      const recordPayload = {
        ...editingScheduleRecord,
        ...scheduleEditForm,
        id: recordId,
        record_type: editingScheduleRecord.record_type
      };
      if (linkedSchool) {
        recordPayload.school_name = linkedSchool.name || '';
        recordPayload.gym_name = linkedSchool.gym_name || '';
        recordPayload.address_line1 = linkedSchool.address_line1 || '';
        recordPayload.city = linkedSchool.city || '';
        recordPayload.state = linkedSchool.state || '';
        recordPayload.zip = linkedSchool.zip || '';
      }
      const data = await apiPostJson('/admin-schools.php', {
        action: 'update',
        id: recordId,
        record: recordPayload
      });
      const saved = data.record || { ...editingScheduleRecord, ...scheduleEditForm, id: recordId };
      setScheduleRecords(current => current.map(record => Number(record.id) === Number(recordId) ? saved : record));
      setEditingScheduleRecord(null);
      setScheduleEditForm(null);
      onStatus?.(data.message || `${saved.type_label || formatLabel(saved.record_type || 'record')} updated in the Members Directory.`);
    } catch (caught) {
      setError(caught.message || 'Directory record could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  async function saveEditMember(event) {
    event.preventDefault();
    if (!editingMember || !editForm) return;

    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-members.php', {
        action: 'update',
        id: editingMember.id,
        member: {
          ...editingMember,
          ...editForm,
          official_rank: editForm.official_rank === '' ? '' : Number(editForm.official_rank)
        }
      });
      setMembers(current => current.map(member => member.id === editingMember.id ? data.member : member));
      setDirectoryProfileModal(current => current?.id === editingMember.id ? data.member : current);
      setEditingMember(null);
      setEditForm(null);
      onStatus?.(data.message || 'Member updated.');
    } catch (caught) {
      setError(caught.message || 'Member could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  const directoryRows = useMemo(
    () => [
      ...members,
      ...scheduleRecords
        .filter(record => ['school', 'event_center', 'team'].includes(record.record_type))
        .map(scheduleDirectoryEntry)
    ],
    [members, scheduleRecords]
  );

  const filteredMembers = directoryRows.filter(member => {
    const haystack = [
      member.name,
      member.role_label,
      member.member_title,
      member.email,
      member.phone,
      member.address_line1,
      member.city,
      member.state,
      member.zip,
      member.is_schedule_entity ? '' : classificationMap[member.id],
      member.school_name,
      member.gym_name,
      member.head_coach_name,
      classificationItems(member).join(' ')
    ].join(' ').toLowerCase();
    const matchesSearch = haystack.includes(query.trim().toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  const roleFilterOptions = [
    ['all', 'All Member Types'],
    ...memberRoleOptions,
    ...(members.some(member => member.role === 'super_admin') ? [['super_admin', 'Super Admin']] : []),
    ...directoryScheduleRoleOptions
  ];
  const activeSchoolRecords = scheduleRecords.filter(record => record.record_type === 'school' && record.status === 'active');

  return (
    <section className="rtbo-dashboard-card rtbo-members-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Member Profiles</p>
          <h3>Members Directory</h3>
          <p>View platform members plus school, team, and event center records in one searchable directory. Edit or remove directory records from this page.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={loadMembers} disabled={loading || saving}>Refresh</button>
        </div>
      </div>

      <div className="rtbo-member-filters">
        <label>Search Members<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, role, email, phone, city, classification" /></label>
        <label>Member Type
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {roleFilterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="form-message error">{error}</p>}

      <div className="rtbo-members-table" aria-live="polite">
        <div className="rtbo-members-row rtbo-directory-row head"><span>Member</span><span>Contact</span><span>Address</span><span>Classification</span><span>Status</span><span>Actions</span></div>
        {loading && <p className="rtbo-empty-state">Loading members...</p>}
        {!loading && filteredMembers.length === 0 && <p className="rtbo-empty-state">No members match your search. Use the Settings workspace to create member profiles.</p>}
        {filteredMembers.map(member => (
          <div className="rtbo-members-row rtbo-directory-row" key={directoryItemKey(member)}>
            <span className="rtbo-member-identity">
              <button
                className="rtbo-member-avatar-button"
                type="button"
                onClick={() => openDirectoryProfile(member)}
                aria-label={member.is_schedule_entity ? `Edit ${member.name || 'directory record'}` : `Open ${member.name || member.email || 'member'} quick profile`}
              >
                {member.is_schedule_entity
                  ? <TeamLogo team={member} className="rtbo-team-directory-logo" />
                  : <ProfilePhoto person={member} alt={`${member.name || 'Member'} profile`} className="rtbo-member-avatar" />}
              </button>
              <span><strong>{member.name || 'Name not entered'}</strong><small>{[member.role_label || member.role, member.member_title, member.sex ? member.sex.replaceAll('_', ' ') : ''].filter(Boolean).join(' / ')}</small></span>
            </span>
            <span><b>{member.email || member.school_name || 'Contact not entered'}</b><small>{formatPhoneNumber(member.phone || '') || member.gym_name || 'Phone not entered'}</small></span>
            <span>{[member.address_line1, member.city, member.state, member.zip].filter(Boolean).join(', ') || 'Address not entered'}</span>
            <span>
              <select className="rtbo-directory-select" defaultValue="" aria-label={`Classifications for ${member.name || member.email}`}>
                <option value="">{classificationItems(member).length ? `${classificationItems(member).length} linked` : member.role === 'official' ? 'Not classified' : 'Not linked yet'}</option>
                {classificationItems(member).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </span>
            <span><mark className={member.status === 'active' ? 'active-status' : 'inactive-status'}>{member.status === 'active' ? 'Active' : 'Inactive'}</mark></span>
            <span className="rtbo-table-actions">
              {member.is_schedule_entity ? (
                <>
                  <button type="button" onClick={() => beginEditScheduleRecord(member)} disabled={saving}>Edit</button>
                  <button type="button" onClick={() => removeScheduleRecord(member)} disabled={saving}>Remove</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => beginEditMember(member)} disabled={saving}>Edit</button>
                  <button type="button" onClick={() => removeMember(member)} disabled={saving}>Remove</button>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      {editingMember && editForm && (
        <div className="rtbo-modal-scrim" role="presentation" onClick={() => { setEditingMember(null); setEditForm(null); }}>
          <section className="rtbo-member-edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${editingMember.name || editingMember.email}`} onClick={(event) => event.stopPropagation()}>
            <button className="rtbo-modal-close" type="button" onClick={() => { setEditingMember(null); setEditForm(null); }}>×</button>
            <div className="rtbo-dashboard-card-head">
              <div>
                <p className="eyebrow">Edit Member</p>
                <h3>{editingMember.name || editingMember.email}</h3>
                <p>Update this member profile. These changes save to the server and appear in the directory immediately.</p>
              </div>
            </div>
            <form className="rtbo-member-form" onSubmit={saveEditMember}>
              <div className="grid three">
                <label>Role<select name="role" value={editForm.role || 'official'} onChange={updateEditMember} disabled={editForm.role === 'super_admin'}>{editForm.role === 'super_admin' && <option value="super_admin">Super Admin</option>}{memberRoleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Status<select name="status" value={editForm.status || 'inactive'} onChange={updateEditMember} disabled={editForm.role === 'super_admin'}><option value="inactive">Inactive</option><option value="active">Active</option></select></label>
                <label>Official Rank<input type="number" min="1" max="100" name="official_rank" value={editForm.official_rank || ''} onChange={updateEditMember} disabled={editForm.role !== 'official' || editForm.status !== 'active'} /></label>
              </div>
              {editForm.role === 'coach' && (
                <div className="grid one">
                  <label>Coach Assignment
                    <select name="member_title" value={editForm.member_title || ''} onChange={updateEditMember} required>
                      {coachAssignmentOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <div className="grid three">
                <label>First Name<input name="first_name" value={editForm.first_name || ''} onChange={updateEditMember} required /></label>
                <label>Last Name<input name="last_name" value={editForm.last_name || ''} onChange={updateEditMember} required /></label>
                <label>Email<input type="email" name="email" value={editForm.email || ''} onChange={updateEditMember} required /></label>
              </div>
              <div className="grid three">
                <label>Phone<input type="tel" name="phone" value={editForm.phone || ''} onChange={updateEditMember} inputMode="tel" autoComplete="tel" maxLength="14" placeholder="(xxx) xxx-xxxx" /></label>
                <label>Sex<select name="sex" value={editForm.sex || ''} onChange={updateEditMember}>{sexOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label>
                <label>Race<select name="race" value={editForm.race || ''} onChange={updateEditMember}>{raceOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label>
              </div>
              <div className="grid two">
                <label>Address 1<input name="address_line1" value={editForm.address_line1 || ''} onChange={updateEditMember} /></label>
                <label>Address 2<input name="address_line2" value={editForm.address_line2 || ''} onChange={updateEditMember} /></label>
              </div>
              <div className="grid three">
                <label>City<input name="city" value={editForm.city || ''} onChange={updateEditMember} /></label>
                <label>State<StateSelect value={editForm.state || ''} onChange={updateEditMember} /></label>
                <label>Zip<input name="zip" value={editForm.zip || ''} onChange={updateEditMember} /></label>
              </div>
              <PasswordField label="Temporary Password" name="password" value={editForm.password || ''} onChange={updateEditMember} placeholder="Leave blank to keep current password" autoComplete="new-password" />
              <div className="rtbo-member-actions">
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button className="btn secondary dark-btn" type="button" onClick={() => { setEditingMember(null); setEditForm(null); }} disabled={saving}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {editingScheduleRecord && scheduleEditForm && (
        <div className="rtbo-modal-scrim" role="presentation" onClick={cancelEditScheduleRecord}>
          <section className="rtbo-member-edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${editingScheduleRecord.name || editingScheduleRecord.type_label || 'directory record'}`} onClick={(event) => event.stopPropagation()}>
            <button className="rtbo-modal-close" type="button" onClick={cancelEditScheduleRecord}>×</button>
            <div className="rtbo-dashboard-card-head">
              <div>
                <p className="eyebrow">Edit Directory Record</p>
                <h3>{editingScheduleRecord.name || editingScheduleRecord.type_label || 'Directory Record'}</h3>
                <p>Update this {formatLabel(editingScheduleRecord.record_type || 'record')} record. These changes save to the server and remain available for scheduling dropdowns.</p>
              </div>
            </div>
            <form className="rtbo-member-form" onSubmit={saveScheduleEditRecord}>
              {editingScheduleRecord.record_type === 'team' ? (
                <>
                  <div className="grid two">
                    <label>Linked School
                      <select name="school_id" value={scheduleEditForm.school_id || ''} onChange={updateScheduleEditRecord} required>
                        <option value="">Select school</option>
                        {activeSchoolRecords.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
                      </select>
                    </label>
                    <label>Team Name<input name="name" value={scheduleEditForm.name || ''} onChange={updateScheduleEditRecord} required /></label>
                  </div>
                  <div className="grid three">
                    <label>Head Coach Name<input name="head_coach_name" value={scheduleEditForm.head_coach_name || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>Head Coach Email<input type="email" name="head_coach_email" value={scheduleEditForm.head_coach_email || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>Head Coach Phone<input type="tel" name="head_coach_phone" value={scheduleEditForm.head_coach_phone || ''} onChange={updateScheduleEditRecord} inputMode="tel" autoComplete="tel" maxLength="14" placeholder="(xxx) xxx-xxxx" /></label>
                  </div>
                  <div className="grid two">
                    <label>Athletic Website URL<input type="url" name="athletic_website_url" value={scheduleEditForm.athletic_website_url || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>Team Logo URL<input type="url" name="logo_url" value={scheduleEditForm.logo_url || ''} onChange={updateScheduleEditRecord} /></label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid three">
                    <label>{editingScheduleRecord.record_type === 'event_center' ? 'Event Center' : 'School'} Name<input name="name" value={scheduleEditForm.name || ''} onChange={updateScheduleEditRecord} required /></label>
                    <label>{editingScheduleRecord.record_type === 'event_center' ? 'Event Center Organization' : 'School / District Name'}<input name="school_name" value={scheduleEditForm.school_name || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>Primary Gym / Arena Name<input name="gym_name" value={scheduleEditForm.gym_name || ''} onChange={updateScheduleEditRecord} /></label>
                  </div>
                  <div className="grid three">
                    <label>Address<input name="address_line1" value={scheduleEditForm.address_line1 || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>City<input name="city" value={scheduleEditForm.city || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>State<StateSelect value={scheduleEditForm.state || ''} onChange={updateScheduleEditRecord} /></label>
                  </div>
                  <div className="grid three">
                    <label>Zip<input name="zip" value={scheduleEditForm.zip || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>Number of Courts<input type="number" name="courts" min="1" value={scheduleEditForm.courts || 1} onChange={updateScheduleEditRecord} /></label>
                    <label>Athletic / Venue Website URL<input type="url" name="athletic_website_url" value={scheduleEditForm.athletic_website_url || ''} onChange={updateScheduleEditRecord} /></label>
                  </div>
                  <div className="grid two">
                    <label>Logo URL<input type="url" name="logo_url" value={scheduleEditForm.logo_url || ''} onChange={updateScheduleEditRecord} /></label>
                    <label>Court Options<textarea name="court_labels" value={scheduleEditForm.court_labels || ''} onChange={updateScheduleEditRecord} placeholder="Main, Auxiliary 1, Auxiliary 2, Arena Name" /></label>
                  </div>
                </>
              )}
              <div className="grid two">
                <label>Status<select name="status" value={scheduleEditForm.status || 'active'} onChange={updateScheduleEditRecord}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              </div>
              <div className="rtbo-member-actions">
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Directory Record'}</button>
                <button className="btn secondary dark-btn" type="button" onClick={cancelEditScheduleRecord} disabled={saving}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
      <OfficialProfileModal profile={directoryProfileModal} onClose={() => setDirectoryProfileModal(null)} />
    </section>
  );
}

function OrganizationClassifications({ onStatus }) {
  const emptyForm = { name: '' };
  const [records, setRecords] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [entityGroups, setEntityGroups] = useState([]);
  const [officialLinks, setOfficialLinks] = useState({});
  const [officialLinkConferences, setOfficialLinkConferences] = useState({});
  const [selectedEntityType, setSelectedEntityType] = useState('officials');
  const [selectedOfficialId, setSelectedOfficialId] = useState('');
  const [selectedClassificationIds, setSelectedClassificationIds] = useState([]);
  const [selectedClassificationConferences, setSelectedClassificationConferences] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function loadOrganizations() {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/admin-organizations.php');
      setRecords(data.records || []);
      setOfficials(data.officials || []);
      const groups = data.entity_groups || [];
      setEntityGroups(groups);
      const links = data.official_links || {};
      const linkConferences = data.official_link_conferences || {};
      setOfficialLinks(links);
      setOfficialLinkConferences(linkConferences);
      const officialGroup = groups.find(group => group.key === 'officials');
      const officialItems = cleanEntityItems(officialGroup || {}, data.officials || []);
      const firstOfficial = officialItems[0] || {};
      const firstOfficialId = String(firstOfficial.id || '');
      setSelectedOfficialId(current => current || firstOfficialId);
      if (!selectedOfficialId && firstOfficialId) {
        setSelectedClassificationIds((links[firstOfficialId] || []).map(String));
        setSelectedClassificationConferences(linkConferences[firstOfficialId] || {});
      }
      onStatus?.('Organizations page loaded.');
    } catch (caught) {
      setError(caught.message || 'Organization classifications could not be loaded.');
      onStatus?.('Organizations page could not load. Check the admin session and database connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  function competitionGroup(name = '') {
    const lowered = name.toLowerCase();
    if (lowered.includes('ncaa') || lowered.includes('naia') || lowered.includes('njcaa')) return 'College';
    if (lowered.includes('pro-am')) return 'Pro-Am';
    return 'High School';
  }

  function cleanEntityItems(group = {}, fallbackItems = []) {
    const items = group.key === 'officials' && Array.isArray(fallbackItems) && fallbackItems.length
      ? fallbackItems
      : (group.items || []);
    return items.filter(item => {
      const name = String(item.name || '').trim().toLowerCase();
      const label = String(group.label || '').trim().toLowerCase();
      return item.id && name && name !== label;
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  function clearClassificationSelection() {
    setSelectedClassificationIds([]);
    setSelectedClassificationConferences({});
    onStatus?.('Classification checkboxes cleared.');
  }

  function editRecord(record) {
    setEditingId(record.id);
    setForm({ name: record.name || '' });
    onStatus?.(`Editing ${record.name}.`);
  }

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-organizations.php', {
        action: editingId ? 'update' : 'create',
        id: editingId,
        record: form
      });
      const saved = data.record;
      setRecords(current => editingId
        ? current.map(record => record.id === saved.id ? saved : record)
        : [saved, ...current]);
      if (data.official_links) setOfficialLinks(data.official_links);
      resetForm();
      onStatus?.(data.message || 'Classification saved.');
    } catch (caught) {
      setError(caught.message || 'Classification could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord(record) {
    if (!window.confirm(`Remove ${record.name} from organization classifications?`)) return;
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-organizations.php', {
        action: 'delete',
        id: record.id
      });
      setRecords(current => current.filter(item => item.id !== record.id));
      setOfficialLinks(current => Object.fromEntries(Object.entries(current).map(([officialId, classificationIds]) => [
        officialId,
        classificationIds.filter(classificationId => Number(classificationId) !== Number(record.id))
      ])));
      setOfficialLinkConferences(current => Object.fromEntries(Object.entries(current).map(([officialId, conferences]) => {
        const next = { ...(conferences || {}) };
        delete next[String(record.id)];
        return [officialId, next];
      })));
      setSelectedClassificationIds(current => current.filter(classificationId => Number(classificationId) !== Number(record.id)));
      setSelectedClassificationConferences(current => {
        const next = { ...current };
        delete next[String(record.id)];
        return next;
      });
      if (editingId === record.id) resetForm();
      onStatus?.(data.message || 'Classification removed.');
    } catch (caught) {
      setError(caught.message || 'Classification could not be removed.');
    } finally {
      setSaving(false);
    }
  }

  function changeSelectedEntityType(event) {
    const nextType = event.target.value;
    const nextGroup = entityGroups.find(group => group.key === nextType);
    const nextItems = cleanEntityItems(nextGroup || {}, officials);
    const nextItem = nextItems[0] || {};
    const nextId = String(nextItem.id || '');
    setSelectedEntityType(nextType);
    setSelectedOfficialId(nextId);
    setSelectedClassificationIds(nextType === 'officials' && nextId ? (officialLinks[nextId] || []).map(String) : []);
    setSelectedClassificationConferences(nextType === 'officials' && nextId ? (officialLinkConferences[nextId] || {}) : {});
  }

  function changeSelectedOfficial(event) {
    const officialId = event.target.value;
    setSelectedOfficialId(officialId);
    setSelectedClassificationIds(selectedEntityType === 'officials' ? (officialLinks[officialId] || []).map(String) : []);
    setSelectedClassificationConferences(selectedEntityType === 'officials' ? (officialLinkConferences[officialId] || {}) : {});
  }

  function toggleSelectedClassification(record) {
    const value = String(record.id);
    setSelectedClassificationIds(current => current.includes(value)
      ? current.filter(id => id !== value)
      : [...current, value]);
    if (conferenceOptionsForClassification(record).length > 0 && selectedClassificationIds.includes(value)) {
      setSelectedClassificationConferences(current => {
        const next = { ...current };
        delete next[value];
        return next;
      });
    }
  }

  function updateSelectedClassificationConference(classificationId, conference) {
    const value = String(classificationId);
    setSelectedClassificationConferences(current => {
      const next = { ...current };
      if (conference) {
        next[value] = conference;
      } else {
        delete next[value];
      }
      return next;
    });
    if (!selectedClassificationIds.includes(value)) {
      setSelectedClassificationIds(current => current.includes(value) ? current : [...current, value]);
    }
  }

  async function saveOfficialClassificationLinks(event) {
    event.preventDefault();
    if (!selectedOfficialId) {
      setError('Choose an official before saving classification links.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (selectedEntityType !== 'officials') {
        throw new Error('This category is ready in the dropdown, but its dedicated database workflow has not been connected yet. We will finish those member pages next.');
      }
      const data = await apiPostJson('/admin-organizations.php', {
        action: 'save_official_classifications',
        official_id: Number(selectedOfficialId),
        classification_ids: selectedClassificationIds.map(Number),
        classification_conferences: selectedClassificationConferences
      });
      setOfficialLinks(data.official_links || { ...officialLinks, [selectedOfficialId]: selectedClassificationIds.map(Number) });
      setOfficialLinkConferences(data.official_link_conferences || { ...officialLinkConferences, [selectedOfficialId]: selectedClassificationConferences });
      setSelectedClassificationIds((data.classification_ids || selectedClassificationIds).map(String));
      setSelectedClassificationConferences((data.classification_conferences || selectedClassificationConferences));
      onStatus?.(data.message || 'Official classification links saved.');
    } catch (caught) {
      setError(caught.message || 'Official classifications could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = records.filter(record => record.name.toLowerCase().includes(query.trim().toLowerCase()));
  const activeClassifications = records;
  const selectedGroup = entityGroups.find(group => group.key === selectedEntityType) || { items: [] };
  const selectedGroupItems = cleanEntityItems(selectedGroup, officials);
  const selectedOfficial = selectedGroupItems.find(item => String(item.id) === String(selectedOfficialId));
  const selectedGroupSingular = selectedEntityType === 'officials' ? 'official' : 'record';

  return (
    <section className="rtbo-dashboard-card rtbo-organizations-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Organizations</p>
          <h3>Competition Classification</h3>
          <p>Manage the levels and divisions used for teams, published schedules, assignments, reports, and official assignment filtering.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={loadOrganizations} disabled={loading || saving}>Refresh</button>
        </div>
      </div>

      <form className="rtbo-official-level-linker" onSubmit={saveOfficialClassificationLinks}>
        <div>
          <p className="eyebrow">Official Assignment Filters</p>
          <h4>Link Members To Competition Levels</h4>
          <p>Choose which levels an active member or school/team belongs to. Officials can be linked now; the other member categories are included so their dedicated pages can connect cleanly next.</p>
        </div>
        <div className="grid two">
          <label>Member Type
            <select value={selectedEntityType} onChange={changeSelectedEntityType}>
              {entityGroups.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}
            </select>
          </label>
          <label>{selectedGroup.label || 'Member'}
          <select value={selectedOfficialId} onChange={changeSelectedOfficial}>
            <option value="">Choose {selectedGroupSingular}</option>
            {selectedGroupItems.map(item => <option key={item.id} value={item.id}>{item.name}{item.email ? ` - ${item.email}` : ''}</option>)}
          </select>
          {selectedEntityType === 'officials' && selectedGroupItems.length === 0 && <small>No officials have been added to the officials database yet.</small>}
          </label>
        </div>
        <div className="rtbo-classification-checklist" aria-label={`Competition levels for ${selectedOfficial?.name || 'selected official'}`}>
          {activeClassifications.map(record => {
            const classificationId = String(record.id);
            const selected = selectedClassificationIds.includes(classificationId);
            const conferenceOptions = conferenceOptionsForClassification(record);
            const hasConferenceDropdown = conferenceOptions.length > 0;
            return (
              <div className={hasConferenceDropdown ? 'rtbo-classification-choice has-conference' : 'rtbo-classification-choice'} key={record.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelectedClassification(record)}
                  />
                  <span>{record.name}</span>
                  <small>{competitionGroup(record.name)}</small>
                </label>
                {hasConferenceDropdown && (
                  <select
                    className="rtbo-classification-conference-select"
                    value={selectedClassificationConferences[classificationId] || ''}
                    onChange={(event) => updateSelectedClassificationConference(classificationId, event.target.value)}
                    disabled={selectedEntityType !== 'officials'}
                    aria-label={`${record.name} conference`}
                  >
                    <option value="">Select conference</option>
                    {conferenceOptions.map(conference => (
                      <option key={`${record.id}-${conference}`} value={conference}>{conference}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
          {!activeClassifications.length && <p className="rtbo-empty-state">Create active classifications before linking officials.</p>}
        </div>
        <div className="rtbo-member-actions">
          <button className="btn" type="submit" disabled={saving || !selectedOfficialId}>{saving ? 'Saving...' : 'Save Classification Links'}</button>
          <button className="btn secondary dark-btn" type="button" onClick={clearClassificationSelection} disabled={saving}>Clear Checked Boxes</button>
        </div>
        {error && <p className="form-message error">{error}</p>}
      </form>

    </section>
  );
}

function AdminDashboard({ user, onLogout, onHome = () => {} }) {
  const canUseAdminDashboard = ['super_admin', 'admin'].includes(user.role);
  const canUseTaxCenter = canUseAdminDashboard || [
    'school_admin',
    'athletic_director',
    'assistant_athletic_director',
    'sports_information_director',
    'conference_commissioner',
    'game_day_admin',
    'coach',
    'assistant_coach'
  ].includes(user.role);
  const geoWatchIdRef = useRef(null);
  const profilePhotoPreviewUrlRef = useRef('');
  const adminStoredSectionIds = [
    'overview',
    'members',
    'schedules',
    'rtbomail',
    'newsletterCenter',
    'refroom',
    'notifications',
    'payments',
    'shopInventory',
    'taxCenter',
    'education',
    'profile',
    'reports',
    'completedOfficialForms',
    'completedEvaluatorForms',
    'completedObserverForms',
    'organizations',
    'settings',
    'dashboardControls',
    ...addMemberSections.map(item => item.id),
    ...settingsWorkflowSections.map(item => item.id),
    ...scheduleSetupSections.map(item => item.id),
    ...organizationSections.map(item => item.target),
    ...educationSubSections.map(item => item.id),
    ...allFormsSubSections.map(item => item.id),
    ...paymentSubSections.map(item => item.id)
  ];
  const portalStoredSectionIds = [
    'profile',
    'publishedGames',
    'liveLocation',
    'rtbomail',
    'refroom',
    'notifications',
    'messages',
    'tbaList',
    'availabilityCalendar',
    'evaluation',
    ...(canUseTaxCenter ? ['taxCenter'] : []),
    'education',
    ...(user.role === 'official' ? ['reports', 'postgame'] : []),
    ...(user.role === 'observer' ? ['reports', 'observerForm'] : [])
  ];
  const [activeSection, setActiveSection] = useState(() => readStoredDashboardSection(
    user,
    canUseAdminDashboard ? adminStoredSectionIds : portalStoredSectionIds,
    canUseAdminDashboard ? 'overview' : 'profile'
  ));
  const [membersMenuOpen, setMembersMenuOpen] = useState(false);
  const [schedulesMenuOpen, setSchedulesMenuOpen] = useState(false);
  const [organizationsMenuOpen, setOrganizationsMenuOpen] = useState(false);
  const [educationMenuOpen, setEducationMenuOpen] = useState(false);
  const [formsMenuOpen, setFormsMenuOpen] = useState(false);
  const [paymentsMenuOpen, setPaymentsMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [hiddenSections, setHiddenSections] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rtbo-hidden-dashboard-sections') || '[]');
    } catch {
      return [];
    }
  });
  const [hiddenMemberItems, setHiddenMemberItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rtbo-hidden-member-menu-items') || '[]');
    } catch {
      return [];
    }
  });
  const [hiddenScheduleItems, setHiddenScheduleItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rtbo-hidden-schedule-menu-items') || '[]');
    } catch {
      return [];
    }
  });
  const [hiddenOrganizationItems, setHiddenOrganizationItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rtbo-hidden-organization-menu-items') || '[]');
    } catch {
      return [];
    }
  });
  const [hiddenEducationItems, setHiddenEducationItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rtbo-hidden-education-menu-items') || '[]');
    } catch {
      return [];
    }
  });
  const [hiddenFormsItems, setHiddenFormsItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rtbo-hidden-forms-menu-items') || '[]');
    } catch {
      return [];
    }
  });
  const [hiddenPaymentItems, setHiddenPaymentItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rtbo-hidden-payment-menu-items') || '[]');
    } catch {
      return [];
    }
  });
  const [settingsOpenMenus, setSettingsOpenMenus] = useState({ schedules: true, organizations: true, payments: true, education: true, reports: true });
  const [status, setStatus] = useState(canUseAdminDashboard ? 'Dashboard ready. Server records load after admin sign-in.' : 'Complete your profile to activate your account for game assignments.');
  const [officialProfileModal, setOfficialProfileModal] = useState(null);
  const [profile, setProfile] = useState(() => ({
    firstName: user.first_name || splitName(user.name).firstName,
    lastName: user.last_name || splitName(user.name).lastName,
    name: user.name,
    email: user.email,
    phone: formatPhoneNumber(user.phone || ''),
    sex: user.sex || '',
    race: user.race || '',
    address: user.address || user.address_line1 || '',
    addressLine1: user.address_line1 || user.address || '',
    addressLine2: user.address_line2 || '',
    city: user.city || '',
    state: user.state || '',
    zip: user.zip || '',
    conferences: user.conferences || '',
    experience: user.experience || '',
    photo: user.photo,
    status: user.status || 'inactive'
  }));
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoSaving, setProfilePhotoSaving] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [geoSharing, setGeoSharing] = useState(false);
  const [geoStatus, setGeoStatus] = useState('');
  const [assignmentResponseState, setAssignmentResponseState] = useState({});
  const [assignmentDeclineReasons, setAssignmentDeclineReasons] = useState({});
  const [passwordStatus, setPasswordStatus] = useState('');
  const [records, setRecords] = useState({
    registrations: [],
    contacts: [],
    reviews: [],
    payments: [],
    education: [],
    reports: []
  });
  const [completedForms, setCompletedForms] = useState(emptyCompletedForms);
  const [completedFormsLoading, setCompletedFormsLoading] = useState(false);
  const [completedFormsError, setCompletedFormsError] = useState('');
  const [overviewData, setOverviewData] = useState(emptyOverviewData);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [releaseMessage, setReleaseMessage] = useState({ audience: 'everyone', title: '', body: '' });
  const [releaseMessageStatus, setReleaseMessageStatus] = useState('');
  const [officialProfileLoading, setOfficialProfileLoading] = useState(!canUseAdminDashboard);
  const [officialProfileData, setOfficialProfileData] = useState({
    assignments: [],
    tbaGames: [],
    availability: [],
    gameReports: [],
    observerForms: [],
    filmClips: [],
    evaluations: [],
    schoolRanking: null,
    geoLocation: null,
    arrivalStatuses: {}
  });
  const releasedTbaGamesAvailable = (officialProfileData.tbaGames || []).length > 0;
  const [availabilityForm, setAvailabilityForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mode: 'unavailable',
    status: 'unavailable',
    reason: 'personal',
    game_location: '',
    game_school: '',
    game_time: '',
    supervisor: '',
    notes: ''
  });
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [availabilitySaveStatus, setAvailabilitySaveStatus] = useState('');
  const [gameReportForm, setGameReportForm] = useState(createGameReportForm);
  const [gameReportIncidents, setGameReportIncidents] = useState(() => [createGameReportIncident()]);
  const [gameReportStatus, setGameReportStatus] = useState('');
  const [observerForm, setObserverForm] = useState(() => ({ ...createObserverForm(), observerName: user?.name || '' }));
  const [observerScores, setObserverScores] = useState(createObserverScores);
  const [observerFormStatus, setObserverFormStatus] = useState('');
  const [observerFormHistory, setObserverFormHistory] = useState([]);

  useEffect(() => () => {
    if (geoWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
    }
    if (profilePhotoPreviewUrlRef.current) {
      URL.revokeObjectURL(profilePhotoPreviewUrlRef.current);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(dashboardSectionStorageKey(user), activeSection);
    const nextHash = `#dashboard/${encodeURIComponent(activeSection)}`;
    if (typeof window !== 'undefined' && window.location.hash !== nextHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [activeSection, user]);

  function updateNotificationState(data = {}) {
    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    setNotificationUnreadCount(Number(data.notification_unread_count || 0));
  }

  function loadCompletedForms() {
    if (!canUseAdminDashboard) {
      return Promise.resolve();
    }

    setCompletedFormsLoading(true);
    setCompletedFormsError('');
    return apiGet('/admin-completed-forms.php')
      .then((data) => {
        setCompletedForms(normalizeCompletedFormsPayload(data));
      })
      .catch((error) => {
        if (error.status === 401) {
          setStatus('Your admin session expired. Please sign in again.');
          onLogout();
          return;
        }
        setCompletedFormsError(error.message || 'Completed forms could not be loaded.');
      })
      .finally(() => {
        setCompletedFormsLoading(false);
      });
  }

  useEffect(() => {
    if (canUseAdminDashboard) {
      loadCompletedForms();
    }
  }, [canUseAdminDashboard]);

  useEffect(() => {
    if (!canUseAdminDashboard) {
      return undefined;
    }

    let active = true;

    apiGet('/dashboard-data.php')
      .then((data) => {
        if (!active) return;

        if (data.user) {
          setProfile(current => ({
            ...current,
            firstName: data.user.first_name || splitName(data.user.name).firstName,
            lastName: data.user.last_name || splitName(data.user.name).lastName,
            name: data.user.name,
            email: data.user.email,
            phone: formatPhoneNumber(data.user.phone || ''),
            sex: data.user.sex || '',
            race: data.user.race || '',
            address: data.user.address || data.user.address_line1 || '',
            addressLine1: data.user.address_line1 || data.user.address || '',
            addressLine2: data.user.address_line2 || '',
            city: data.user.city || '',
            state: data.user.state || '',
            zip: data.user.zip || '',
            conferences: data.user.conferences || '',
            experience: data.user.experience || '',
            photo: data.user.photo || current.photo,
            status: data.user.status || current.status
          }));
        }

        setRecords(current => {
          const next = {
            ...current,
            registrations: (data.registrations || []).length
            ? data.registrations.map(registration => ({
                id: registration.id,
                source: 'school_registrations',
                field0: registration.full_name || `${registration.first_name || ''} ${registration.last_name || ''}`.trim(),
                field1: registration.sessions || '',
                field2: `${registration.payment_provider || 'Payment'} ${registration.payment_status || ''}`.trim(),
                field3: registration.pdf_path ? 'PDF Generated' : 'PDF Pending',
                field4: registration.got_u_nex_ref_sync_status || 'Queued'
              }))
            : [],
            contacts: (data.contacts || []).length
            ? data.contacts.map(contact => ({
                id: contact.id,
                source: 'contact_messages',
                field0: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                field1: contact.email || '',
                field2: formatPhoneNumber(contact.phone || ''),
                field3: contact.status || 'new',
                field4: contact.message || ''
              }))
            : [],
            reviews: (data.reviews || []).length
            ? data.reviews.map(review => ({
                id: review.review_id || review.id,
                source: 'attendee_reviews',
                field0: review.full_name || review.email || 'Reviewer',
                field1: review.school_or_course || review.experience_label || review.experience_type || '',
                field2: `${review.rating || '-'} Star${String(review.rating || '') === '1' ? '' : 's'}`,
                field3: review.status || 'pending',
                field4: (review.photo_path || review.photoPath) ? 'Picture uploaded' : 'No picture'
              }))
            : [],
            payments: (data.registrations || []).length
            ? data.registrations.map(registration => ({
                id: registration.id,
                source: 'school_registrations',
                field0: registration.full_name || registration.email || 'Applicant',
                field1: `$${((Number(registration.amount_cents || 0)) / 100).toFixed(2)}`,
                field2: registration.payment_provider || '',
                field3: registration.payment_status || '',
                field4: registration.sessions || ''
              }))
            : []
          };

          for (const section of persistentCrudSections) {
            const stored = (data.adminRecords?.[section] || []).map(normalizeDashboardRecord);
            if (stored.length) {
              next[section] = stored;
            }
          }

          return next;
        });
        setOverviewData(data.overview && !Array.isArray(data.overview) ? data.overview : emptyOverviewData);
        updateNotificationState(data);

        setStatus('Dashboard loaded the latest registration, review, contact, newsletter, and payment records from the server database.');
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          setStatus('Your admin session expired. Please sign in again.');
          onLogout();
          return;
        }
        setStatus('Dashboard data could not be loaded. Confirm your database connection and admin session before launch.');
      });

    return () => {
      active = false;
    };
  }, [canUseAdminDashboard]);

  useEffect(() => {
    if (canUseAdminDashboard) {
      return undefined;
    }

    let active = true;
    setOfficialProfileLoading(true);

    apiGet('/official-profile.php')
      .then((data) => {
        if (!active) return;
        if (data.user) {
          setProfile(current => ({
            ...current,
            firstName: data.user.first_name || splitName(data.user.name).firstName,
            lastName: data.user.last_name || splitName(data.user.name).lastName,
            name: data.user.name,
            email: data.user.email,
            phone: formatPhoneNumber(data.user.phone || ''),
            sex: data.user.sex || '',
            race: data.user.race || '',
            address: data.user.address || data.user.address_line1 || '',
            addressLine1: data.user.address_line1 || data.user.address || '',
            addressLine2: data.user.address_line2 || '',
            city: data.user.city || '',
            state: data.user.state || '',
            zip: data.user.zip || '',
            conferences: data.user.conferences || '',
            experience: data.user.experience || '',
            photo: data.user.photo || current.photo,
            status: data.user.status || current.status
          }));
        }
        setOfficialProfileData({
          assignments: data.assignments || [],
          tbaGames: data.tba_games || [],
          availability: data.availability || [],
          gameReports: data.game_reports || [],
          observerForms: data.observer_forms || [],
          filmClips: data.film_clips || [],
          evaluations: data.evaluations || [],
          schoolRanking: data.school_ranking || null,
          geoLocation: data.geo_location || null,
          arrivalStatuses: data.arrival_statuses || {}
        });
        updateNotificationState(data);
        setStatus('Official profile loaded from the server.');
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          setStatus('Please sign in again to view your official profile.');
          onLogout();
          return;
        }
        setStatus(error.message || 'Official profile data could not be loaded.');
      })
      .finally(() => {
        if (active) setOfficialProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canUseAdminDashboard]);

  useEffect(() => {
    if (canUseAdminDashboard || officialProfileLoading || activeSection !== 'tbaList' || releasedTbaGamesAvailable) {
      return;
    }

    setActiveSection('profile');
    setStatus('TBA List is hidden until the Super Admin releases TBA games.');
  }, [activeSection, canUseAdminDashboard, officialProfileLoading, releasedTbaGamesAvailable]);

  const adminSections = [
    ['overview', 'Overview'],
    ['members', 'Members'],
    ['schedules', 'Schedules'],
    ['rtbomail', 'Rtbomail'],
    ['newsletterCenter', 'Newsletter'],
    ['refroom', 'RefRoom'],
    ['notifications', 'Notifications'],
    ['payments', 'Payments'],
    ['shopInventory', 'Inventory'],
    ['siteContent', 'Website'],
    ['taxCenter', 'Tax Center'],
    ['education', 'Education'],
    ['reports', 'Forms'],
    ['reviews', 'Reviews'],
    ['organizations', 'Organizations']
  ];
  const officialPortalSections = [
    ...(user.role === 'observer' ? [['reports', 'Forms']] : []),
    ['profile', 'My Profile'],
    ['publishedGames', 'Game Schedule'],
    ['liveLocation', 'Live Location'],
    ['rtbomail', 'Rtbomail'],
    ['refroom', 'RefRoom'],
    ['notifications', 'Notifications'],
    ...(canUseTaxCenter ? [['taxCenter', 'Tax Center']] : []),
    ...(releasedTbaGamesAvailable ? [['tbaList', 'TBA List']] : []),
    ['availabilityCalendar', 'Availability Calendar'],
    ...(user.role === 'official' ? [['reports', 'Forms']] : []),
    ['evaluation', 'Evaluations'],
    ['education', 'Education']
  ];
  const allowedDashboardSidebarIds = new Set(['overview', 'members', 'schedules', 'rtbomail', 'newsletterCenter', 'refroom', 'notifications', 'payments', 'shopInventory', 'siteContent', 'taxCenter', 'education', 'profile', 'reports', 'reviews', 'organizations']);
  const visibleAdminSections = adminSections.filter(([id]) => allowedDashboardSidebarIds.has(id) && !hiddenSections.includes(id));
  const visibleAddMemberSections = addMemberSections.filter(item => !hiddenMemberItems.includes(item.id));
  const visibleScheduleSetupSections = scheduleSetupSections.filter(item => !hiddenScheduleItems.includes(item.id));
  const visibleOrganizationSections = organizationSections.filter(item => !hiddenOrganizationItems.includes(item.id));
  const visibleEducationSubSections = educationSubSections.filter(item => !hiddenEducationItems.includes(item.id));
  const visibleFormsSubSections = allFormsSubSections.filter(item => !hiddenFormsItems.includes(item.id));
  const visiblePaymentSubSections = paymentSubSections.filter(item => !hiddenPaymentItems.includes(item.id));
  const visibleOfficialFormsSubSections = officialFormsSubSections.filter(item => !hiddenFormsItems.includes(item.id));
  const visibleObserverFormsSubSections = observerFormsSubSections.filter(item => !hiddenFormsItems.includes(item.id));
  const visibleAdminFormsSubSections = visibleFormsSubSections;
  const activePaymentSubSections = canUseAdminDashboard && user.role === 'super_admin' ? visiblePaymentSubSections : [];
  const activeFormsSubSections = canUseAdminDashboard
    ? visibleAdminFormsSubSections
    : user.role === 'observer'
      ? uniqueFormSubSections([...visibleObserverFormsSubSections, ...observerFormsSubSections])
      : user.role === 'official'
        ? uniqueFormSubSections([...visibleOfficialFormsSubSections, ...officialFormsSubSections])
        : [];
  const completedFormsSectionIds = completedFormsWidgets.map(widget => widget.section);
  const primaryAdminOrder = ['overview', 'members', 'schedules', 'rtbomail', 'newsletterCenter', 'refroom', 'notifications', 'payments', 'shopInventory', 'siteContent', 'taxCenter', 'education'];
  const secondaryAdminOrder = ['reports', 'reviews', 'organizations'];
  const sections = canUseAdminDashboard
    ? [
        ...visibleAdminSections.filter(([id]) => primaryAdminOrder.includes(id)),
        ['profile', 'My Profile'],
        ...visibleAdminSections.filter(([id]) => secondaryAdminOrder.includes(id))
      ].filter(([id]) => allowedDashboardSidebarIds.has(id))
    : officialPortalSections;
  const sectionLabels = new Map([
    ...adminSections,
    ...officialPortalSections,
    ['profile', 'My Profile'],
    ['settings', 'Settings'],
    ['dashboardControls', 'Dashboard Controls'],
    ['registrations', 'Registrations'],
    ['contacts', 'Contacts'],
    ['reviews', 'Reviews'],
    ['payments', 'Payments'],
    ['completedOfficialForms', 'Completed Official Game Reports'],
    ['completedEvaluatorForms', 'Completed Evaluator Evaluations'],
    ['completedObserverForms', 'Completed Observer Forms'],
    ...addMemberSections.map(item => [item.id, item.title]),
    ...settingsWorkflowSections.map(item => [item.id, item.title]),
    ...scheduleSetupSections.map(item => [item.id, item.title]),
    ...organizationSections.map(item => [item.id, item.title]),
    ...educationSubSections.map(item => [item.id, item.title]),
    ...allFormsSubSections.map(item => [item.id, item.title]),
    ...officialFormsSubSections.map(item => [item.id, item.title]),
    ...observerFormsSubSections.map(item => [item.id, item.title]),
    ...paymentSubSections.map(item => [item.id, item.title])
  ]);
  const settingsMenuItems = adminSections.map(([id, label]) => ({
    id,
    label,
    subItems: id === 'members'
      ? []
      : id === 'schedules'
        ? scheduleSetupSections.map(item => ({ id: item.id, label: item.title, parent: 'schedules' }))
      : id === 'education'
        ? educationSubSections.map(item => ({ id: item.id, label: item.title, parent: 'education' }))
      : id === 'payments'
        ? (user.role === 'super_admin' ? paymentSubSections : []).map(item => ({ id: item.id, label: item.title, parent: 'payments' }))
      : id === 'reports'
        ? allFormsSubSections.map(item => ({ id: item.id, label: item.title, parent: 'reports' }))
      : id === 'organizations'
        ? organizationSections.map(item => ({ id: item.id, label: item.title, parent: 'organizations' }))
        : []
  }));
  const dashboardControlColumns = [
    ['overview', 'payments', 'shopInventory', 'siteContent', 'taxCenter', 'education'],
    ['members', 'reports', 'reviews', 'rtbomail', 'newsletterCenter'],
    ['schedules', 'organizations', 'notifications', 'refroom']
  ].map(column => column.map(id => settingsMenuItems.find(item => item.id === id)).filter(Boolean));
  const settingsWorkflowById = new Map(settingsWorkflowSections.map(item => [item.id, item]));

  const configs = {
    registrations: ['Applicant', 'Session(s)', 'Payment Status', 'PDF Status', 'Profile Status'],
    contacts: ['Name', 'Email', 'Subject', 'Status', 'Notes'],
    reviews: ['Reviewer', 'School / Course', 'Rating', 'Status', 'Picture'],
    payments: ['Item', 'Amount', 'Provider', 'Status', 'Notes'],
    education: ['Module', 'Level', 'Type', 'Status', 'Audience'],
    reports: ['Form', 'Count', 'Format', 'Date Range', 'Status']
  };
  const persistentCrudSections = new Set(['payments', 'education', 'reports']);

  function normalizeDashboardRecord(record = {}) {
    return {
      id: record.id,
      source: record.source || 'dashboard_records',
      field0: record.field0 || '',
      field1: record.field1 || '',
      field2: record.field2 || '',
      field3: record.field3 || '',
      field4: record.field4 || ''
    };
  }

  function showSection(section) {
    setActiveSection(section);
    const isSettingsRoute = section === 'settings' || section === 'dashboardControls' || settingsWorkflowById.has(section);
    if (section !== 'members' && !visibleAddMemberSections.some(item => item.id === section)) {
      setMembersMenuOpen(false);
    }
    if (section !== 'schedules' && !visibleScheduleSetupSections.some(item => item.id === section)) {
      setSchedulesMenuOpen(false);
    }
    if (section !== 'organizations' && !visibleOrganizationSections.some(item => item.target === section)) {
      setOrganizationsMenuOpen(false);
    }
    if (section !== 'education' && !visibleEducationSubSections.some(item => item.id === section)) {
      setEducationMenuOpen(false);
    }
    if (section !== 'reports' && !activeFormsSubSections.some(item => item.id === section)) {
      setFormsMenuOpen(false);
    }
    if (section !== 'payments' && !activePaymentSubSections.some(item => item.id === section)) {
      setPaymentsMenuOpen(false);
    }
    if (!isSettingsRoute) {
      setSettingsMenuOpen(false);
    }
    setStatus(`Opened ${sectionLabels.get(section) || 'section'}.`);
  }

  function openMembersSection() {
    setActiveSection('members');
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get('members') || 'Members'}.`);
  }

  function openAddMemberSection(section) {
    setActiveSection(section);
    setMembersMenuOpen(true);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get(section) || 'section'}.`);
  }

  function openSchedulesSection() {
    setActiveSection('schedules');
    setSchedulesMenuOpen(current => !current);
    setMembersMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get('schedules') || 'Schedules'}.`);
  }

  function openScheduleSetupSection(section) {
    setActiveSection(section);
    setSchedulesMenuOpen(true);
    setMembersMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get(section) || 'schedule setup'}.`);
  }

  function openOrganizationsSection(section = 'organizations') {
    setActiveSection(section);
    setOrganizationsMenuOpen(current => !current);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get('organizations') || 'Organizations'}.`);
  }

  function openOrganizationSubItem(item) {
    setActiveSection(item.target);
    setOrganizationsMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${item.title}.`);
  }

  function openEducationSection() {
    setActiveSection('education');
    setEducationMenuOpen(current => !current);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get('education') || 'Education'}.`);
  }

  function openEducationSubSection(section) {
    setActiveSection(section);
    setEducationMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get(section) || 'education tool'}.`);
  }

  function openFormsSection() {
    const targetSection = canUseAdminDashboard ? 'reports' : (activeFormsSubSections[0]?.id || 'reports');
    setActiveSection(targetSection);
    setFormsMenuOpen(current => canUseAdminDashboard ? !current : true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get('reports') || 'Forms'}.`);
  }

  function openFormsSubSection(section) {
    setActiveSection(section);
    setFormsMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get(section) || 'form'}.`);
  }

  function openCompletedFormsSection(section) {
    setActiveSection(section);
    setFormsMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get(section) || 'completed forms'}.`);
  }

  function backToFormsWorkspace() {
    setActiveSection('reports');
    setFormsMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus('Opened Forms.');
  }

  function openPaymentsSection() {
    setActiveSection('payments');
    setPaymentsMenuOpen(current => !current);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get('payments') || 'Payments'}.`);
  }

  function openPaymentSubSection(section) {
    setActiveSection(section);
    setPaymentsMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setSettingsMenuOpen(false);
    setStatus(`Opened ${sectionLabels.get(section) || 'payment tool'}.`);
  }

  function openSettingsSection() {
    setActiveSection('settings');
    setSettingsMenuOpen(current => !current);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setStatus('Opened Settings.');
  }

  function openDashboardControls() {
    setActiveSection('dashboardControls');
    setSettingsMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setStatus('Opened Dashboard Controls.');
  }

  function openSettingsWorkflow(section) {
    const item = settingsWorkflowById.get(section);
    setActiveSection(section);
    setSettingsMenuOpen(true);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setEducationMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setStatus(`Opened ${item?.title || sectionLabels.get(section) || 'settings workflow'}.`);
  }

  function toggleDashboardSection(sectionId) {
    setHiddenSections(current => {
      const next = current.includes(sectionId)
        ? current.filter(id => id !== sectionId)
        : [...current, sectionId];
      localStorage.setItem('rtbo-hidden-dashboard-sections', JSON.stringify(next));
      if (next.includes(activeSection)) {
        setActiveSection(next.includes('overview') ? 'profile' : 'overview');
      }
      return next;
    });
  }

  function toggleMemberMenuItem(sectionId) {
    setHiddenMemberItems(current => {
      const next = current.includes(sectionId)
        ? current.filter(id => id !== sectionId)
        : [...current, sectionId];
      localStorage.setItem('rtbo-hidden-member-menu-items', JSON.stringify(next));
      if (next.includes(activeSection)) {
        setActiveSection('members');
      }
      return next;
    });
  }

  function toggleScheduleMenuItem(sectionId) {
    setHiddenScheduleItems(current => {
      const next = current.includes(sectionId)
        ? current.filter(id => id !== sectionId)
        : [...current, sectionId];
      localStorage.setItem('rtbo-hidden-schedule-menu-items', JSON.stringify(next));
      if (next.includes(activeSection)) {
        setActiveSection('schedules');
      }
      return next;
    });
  }

  function toggleOrganizationMenuItem(sectionId) {
    setHiddenOrganizationItems(current => {
      const next = current.includes(sectionId)
        ? current.filter(id => id !== sectionId)
        : [...current, sectionId];
      localStorage.setItem('rtbo-hidden-organization-menu-items', JSON.stringify(next));
      return next;
    });
  }

  function toggleEducationMenuItem(sectionId) {
    setHiddenEducationItems(current => {
      const next = current.includes(sectionId)
        ? current.filter(id => id !== sectionId)
        : [...current, sectionId];
      localStorage.setItem('rtbo-hidden-education-menu-items', JSON.stringify(next));
      if (next.includes(activeSection)) {
        setActiveSection('education');
      }
      return next;
    });
  }

  function toggleFormsMenuItem(sectionId) {
    setHiddenFormsItems(current => {
      const next = current.includes(sectionId)
        ? current.filter(id => id !== sectionId)
        : [...current, sectionId];
      localStorage.setItem('rtbo-hidden-forms-menu-items', JSON.stringify(next));
      if (next.includes(activeSection)) {
        setActiveSection('reports');
      }
      return next;
    });
  }

  function togglePaymentMenuItem(sectionId) {
    setHiddenPaymentItems(current => {
      const next = current.includes(sectionId)
        ? current.filter(id => id !== sectionId)
        : [...current, sectionId];
      localStorage.setItem('rtbo-hidden-payment-menu-items', JSON.stringify(next));
      if (next.includes(activeSection)) {
        setActiveSection('payments');
      }
      return next;
    });
  }

  function toggleSettingsMenu(menuId) {
    setSettingsOpenMenus(current => ({ ...current, [menuId]: !current[menuId] }));
  }

  function restoreDashboardSections() {
    setHiddenSections([]);
    setHiddenMemberItems([]);
    setHiddenScheduleItems([]);
    setHiddenOrganizationItems([]);
    setHiddenEducationItems([]);
    setHiddenFormsItems([]);
    setHiddenPaymentItems([]);
    localStorage.removeItem('rtbo-hidden-dashboard-sections');
    localStorage.removeItem('rtbo-hidden-member-menu-items');
    localStorage.removeItem('rtbo-hidden-schedule-menu-items');
    localStorage.removeItem('rtbo-hidden-organization-menu-items');
    localStorage.removeItem('rtbo-hidden-education-menu-items');
    localStorage.removeItem('rtbo-hidden-forms-menu-items');
    localStorage.removeItem('rtbo-hidden-payment-menu-items');
    setStatus('All dashboard sections and submenu items restored.');
  }

  async function refreshNotifications() {
    try {
      const data = await apiGet('/notifications.php');
      updateNotificationState(data);
      return data;
    } catch (error) {
      setStatus(error.message || 'Notifications could not be refreshed.');
      return null;
    }
  }

  async function markNotificationRead(notificationId) {
    try {
      const data = await apiPostJson('/notifications.php', {
        action: 'mark_read',
        id: notificationId
      });
      updateNotificationState(data);
      setStatus(data.message || 'Notification marked as read.');
    } catch (error) {
      setStatus(error.message || 'Notification could not be marked as read.');
    }
  }

  async function markAllNotificationsRead() {
    try {
      const data = await apiPostJson('/notifications.php', {
        action: 'mark_all_read'
      });
      updateNotificationState(data);
      setStatus(data.message || 'Notifications marked as read.');
    } catch (error) {
      setStatus(error.message || 'Notifications could not be marked as read.');
    }
  }

  async function markMessageNotificationsRead() {
    const unreadMessages = notifications.filter(notification => isMessageNotification(notification) && !notification.is_read);
    if (!unreadMessages.length) return;
    try {
      await Promise.all(unreadMessages.map(notification => apiPostJson('/notifications.php', {
        action: 'mark_read',
        id: notification.id
      })));
      const data = await refreshNotifications();
      if (data) setStatus(`${unreadMessages.length} message${unreadMessages.length === 1 ? '' : 's'} marked as read.`);
    } catch (error) {
      setStatus(error.message || 'Messages could not be marked as read.');
    }
  }

  async function markStandardNotificationsRead() {
    const unreadNotifications = notifications.filter(notification => !isMessageNotification(notification) && !notification.is_read);
    if (!unreadNotifications.length) return;
    try {
      await Promise.all(unreadNotifications.map(notification => apiPostJson('/notifications.php', {
        action: 'mark_read',
        id: notification.id
      })));
      const data = await refreshNotifications();
      if (data) setStatus(`${unreadNotifications.length} notification${unreadNotifications.length === 1 ? '' : 's'} marked as read.`);
    } catch (error) {
      setStatus(error.message || 'Notifications could not be marked as read.');
    }
  }

  function updateReleaseMessage(event) {
    const { name, value } = event.target;
    setReleaseMessage(current => ({ ...current, [name]: value }));
  }

  async function submitReleaseMessage(event) {
    event.preventDefault();
    setReleaseMessageStatus('');
    try {
      const data = await apiPostJson('/notifications.php', {
        action: 'release_message',
        ...releaseMessage
      });
      updateNotificationState(data);
      setReleaseMessage(current => ({ ...current, title: '', body: '' }));
      setReleaseMessageStatus(data.message || 'Message released.');
      setStatus(data.message || 'Message notification released.');
    } catch (error) {
      setReleaseMessageStatus(error.message || 'Message notification could not be released.');
    }
  }

  async function sendRtbomailMessage(message) {
    const title = String(message.subject || '').trim();
    const body = String(message.body || '').trim();
    if (!title || !body) {
      throw new Error('Subject and message body are required.');
    }
    const recipientEmails = Array.isArray(message.recipientEmails) ? message.recipientEmails : [];
    if (recipientEmails.length > 0) {
      const delivery = await apiPostJson('/rtbomail.php', {
        action: 'send_distribution_email',
        subject: title,
        body,
        recipients: recipientEmails,
        attachments: Array.isArray(message.attachments) ? message.attachments : []
      });
      const refreshed = await refreshNotifications();
      if (refreshed) updateNotificationState(refreshed);
      setStatus(delivery.message || 'RTBOMAIL distribution email sent.');
      return delivery;
    }
    const data = await apiPostJson('/notifications.php', {
      action: 'release_message',
      audience: message.audience || 'admins',
      title,
      body,
      metadata: {
        priority: message.priority || 'Normal',
        sensitivity: message.sensitivity || 'Normal',
        category: message.category || 'General Announcement',
        send_method: message.sendMethod || 'Bulk Queue Delivery',
        selected_recipients: Number(message.selectedRecipients || 0),
        distribution_list_name: message.distributionListName || '',
        distribution_recipient_count: Number(message.distributionRecipientCount || 0),
        follow_up_flag: Boolean(message.followUpFlag),
        focused_inbox: Boolean(message.focusedInbox),
        encrypted_requested: Boolean(message.encryptMessage)
      }
    });
    updateNotificationState(data);
    setStatus(data.message || 'RTBO Mail message sent.');
    return data;
  }

  async function addRecord(key, record) {
    if (persistentCrudSections.has(key)) {
      const data = await apiPostJson('/admin-records.php', {
        action: 'create',
        section: key,
        record
      });
      setRecords(current => ({ ...current, [key]: [normalizeDashboardRecord(data.record), ...current[key]] }));
      refreshNotifications();
      setStatus(data.message || `${key} record saved to the database.`);
      return;
    }

    setRecords(current => ({ ...current, [key]: [...current[key], record] }));
    setStatus(`${key} record added for review. This section still needs a dedicated production workflow before launch.`);
  }

  async function updateRecord(key, index, record) {
    const existing = records[key][index] || {};
    if (persistentCrudSections.has(key)) {
      if (existing.id && existing.source === 'dashboard_records') {
        const data = await apiPostJson('/admin-records.php', {
          action: 'update',
          section: key,
          id: existing.id,
          record
        });
        setRecords(current => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? normalizeDashboardRecord(data.record) : item) }));
        refreshNotifications();
        setStatus(data.message || `${key} record updated in the database.`);
        return;
      }

      const data = await apiPostJson('/admin-records.php', {
        action: 'create',
        section: key,
        record
      });
      setRecords(current => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? normalizeDashboardRecord(data.record) : item) }));
      refreshNotifications();
      setStatus(`${key} record converted into a database-backed record.`);
      return;
    }

    setRecords(current => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...existing, ...record } : item) }));
    setStatus(`${key} record updated for review. This section still needs a dedicated production workflow before launch.`);
  }

  async function deleteRecord(key, index) {
    const existing = records[key][index] || {};
    if (persistentCrudSections.has(key) && existing.id && existing.source === 'dashboard_records') {
      const data = await apiPostJson('/admin-records.php', {
        action: 'delete',
        section: key,
        id: existing.id
      });
      setRecords(current => ({ ...current, [key]: current[key].filter((item, itemIndex) => itemIndex !== index) }));
      setStatus(data.message || `${key} record deleted from the database.`);
      return;
    }

    setRecords(current => ({ ...current, [key]: current[key].filter((item, itemIndex) => itemIndex !== index) }));
    setStatus(`${key} record removed from this dashboard view. This section still needs dedicated database delete rules before launch.`);
  }

  function updateProfile(event) {
    const { name, value, files } = event.target;
    if (name === 'photo' && files?.[0]) {
      previewProfilePhoto(files[0]);
      setStatus('Profile photo preview updated.');
      return;
    }
    setProfile(current => {
      const next = { ...current, [name]: formatFormFieldValue(name, value) };
      if (name === 'firstName' || name === 'lastName') {
        next.name = `${next.firstName || ''} ${next.lastName || ''}`.trim();
      }
      if (name === 'addressLine1' || name === 'addressLine2') {
        next.address = `${next.addressLine1 || ''} ${next.addressLine2 || ''}`.trim();
      }
      return next;
    });
  }

  function previewProfilePhoto(file) {
    if (profilePhotoPreviewUrlRef.current) {
      URL.revokeObjectURL(profilePhotoPreviewUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    profilePhotoPreviewUrlRef.current = previewUrl;
    setProfile(current => ({ ...current, photo: previewUrl }));
    setProfilePhotoFile(file);
  }

  function profilePayload(photoFile = profilePhotoFile) {
    const payload = new FormData();
    payload.set('first_name', profile.firstName || splitName(profile.name).firstName);
    payload.set('last_name', profile.lastName || splitName(profile.name).lastName);
    payload.set('email', profile.email);
    payload.set('phone', profile.phone || '');
    payload.set('sex', profile.sex || '');
    payload.set('race', profile.race || '');
    payload.set('address_line1', profile.addressLine1 || profile.address || '');
    payload.set('address_line2', profile.addressLine2 || '');
    payload.set('city', profile.city || '');
    payload.set('state', profile.state || '');
    payload.set('zip', profile.zip || '');
    payload.set('conferences', profile.conferences || '');
    payload.set('experience', profile.experience || '');
    if (photoFile) {
      payload.set('profile_photo', photoFile);
    }

    return payload;
  }

  function applySavedProfile(dataUser) {
    if (!dataUser) return;
    setProfile(current => ({
      ...current,
      firstName: dataUser.first_name || splitName(dataUser.name).firstName,
      lastName: dataUser.last_name || splitName(dataUser.name).lastName,
      name: dataUser.name,
      email: dataUser.email,
      phone: formatPhoneNumber(dataUser.phone || ''),
      sex: dataUser.sex || '',
      race: dataUser.race || '',
      address: dataUser.address || dataUser.address_line1 || '',
      addressLine1: dataUser.address_line1 || dataUser.address || '',
      addressLine2: dataUser.address_line2 || '',
      city: dataUser.city || '',
      state: dataUser.state || '',
      zip: dataUser.zip || '',
      conferences: dataUser.conferences || '',
      experience: dataUser.experience || '',
      photo: dataUser.photo || current.photo,
      status: dataUser.status || current.status
    }));
  }

  async function uploadProfilePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previousPhoto = profile.photo;

    previewProfilePhoto(file);
    setProfilePhotoSaving(true);
    setStatus('Uploading profile picture...');

    try {
      const data = await apiPost('/profile-update.php', profilePayload(file));
      applySavedProfile(data.user);
      setProfilePhotoFile(null);
      setStatus(data.message || 'Profile picture updated.');
    } catch (error) {
      setProfile(current => ({ ...current, photo: previousPhoto }));
      setProfilePhotoFile(null);
      setStatus(error.message || 'Profile picture could not be updated.');
    } finally {
      setProfilePhotoSaving(false);
      event.target.value = '';
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const data = await apiPost('/profile-update.php', profilePayload());
      applySavedProfile(data.user);
      setProfilePhotoFile(null);
      setProfileEditorOpen(false);
      setStatus(data.message || 'Profile updated.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  function runProfileTest() {
    const missing = [
      ['email', profile.email],
      ['phone', profile.phone],
      ['address', profile.addressLine1 || profile.address],
      ['city', profile.city]
    ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);
    setStatus(missing.length
      ? `Profile readiness check needs ${missing.join(', ')}.`
      : 'Profile readiness check passed with live profile details.');
  }

  function updateAssignmentDeclineReason(game, value) {
    setAssignmentDeclineReasons(current => ({ ...current, [assignmentKey(game)]: value }));
  }

  async function respondToAssignment(game, action) {
    const key = assignmentKey(game);
    const declineReason = String(assignmentDeclineReasons[key] || '').trim();

    if (!game.assignment_id) {
      setStatus('This assignment does not have a database assignment ID yet, so it cannot be updated.');
      return;
    }

    if (action === 'decline' && isInvalidDeclineReason(declineReason)) {
      setStatus('Please enter a specific decline reason before declining the assignment. N/A is not accepted.');
      return;
    }

    setAssignmentResponseState(current => ({ ...current, [key]: 'saving' }));
    try {
      const data = await apiPostJson('/official-assignment-response.php', {
        assignment_id: game.assignment_id,
        action,
        decline_reason: declineReason
      });
      const nextAssignment = data.assignment || {};
      setOfficialProfileData(current => ({
        ...current,
        assignments: current.assignments.map(item => (
          Number(item.assignment_id) === Number(game.assignment_id)
            ? {
                ...item,
                assignment_status: nextAssignment.status || (action === 'accept' ? 'accepted' : 'declined'),
                decline_reason: nextAssignment.decline_reason || '',
                responded_at: nextAssignment.responded_at || ''
              }
            : item
        ))
      }));
      if (action === 'accept') {
        setAssignmentDeclineReasons(current => ({ ...current, [key]: '' }));
      }
      refreshNotifications();
      setStatus(data.message || `Assignment ${action === 'accept' ? 'accepted' : 'declined'}.`);
    } catch (error) {
      setStatus(error.message || 'Assignment response could not be saved.');
    } finally {
      setAssignmentResponseState(current => ({ ...current, [key]: '' }));
    }
  }

  async function requestTbaGame(game) {
    const key = `tba-${game.id}`;
    setAssignmentResponseState(current => ({ ...current, [key]: 'saving' }));
    try {
      const data = await apiPostJson('/official-tba-request.php', {
        game_id: game.id
      });
      setOfficialProfileData(current => ({
        ...current,
        tbaGames: data.tba_games || current.tbaGames.map(item => (
          Number(item.id) === Number(game.id)
            ? { ...item, tba_request_status: 'pending', request: data.request || item.request }
            : item
        ))
      }));
      refreshNotifications();
      setStatus(data.message || 'TBA request sent to the Super Admin.');
    } catch (error) {
      setStatus(error.message || 'TBA request could not be sent.');
    } finally {
      setAssignmentResponseState(current => ({ ...current, [key]: '' }));
    }
  }

  function updateGameReportForm(event) {
    const { name, type, checked, value } = event.target;
    setGameReportForm(current => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'homeScore' || name === 'visitingScore') {
        const home = name === 'homeScore' ? value : next.homeScore;
        const visitor = name === 'visitingScore' ? value : next.visitingScore;
        next.finalScore = home !== '' && visitor !== '' ? `${home}-${visitor}` : '';
      }
      return next;
    });
  }

  function officialNameForPosition(game, position) {
    const match = (game?.crew || []).find(member => String(member.position || '').toLowerCase() === position.toLowerCase());
    return match?.name || '';
  }

  function selectGameReportAssignment(event) {
    const assignmentId = event.target.value;
    const game = officialAssignments.find(item => String(item.assignment_id) === String(assignmentId));
    if (!game) {
      setGameReportForm(current => ({ ...createGameReportForm(), ruleSet: current.ruleSet }));
      setGameReportIncidents([createGameReportIncident()]);
      setGameReportStatus('');
      return;
    }

    const refereeName = officialNameForPosition(game, 'Referee');
    const umpire1Name = officialNameForPosition(game, 'Umpire 1');
    const umpire2Name = officialNameForPosition(game, 'Umpire 2');
    setGameReportForm(current => ({
      ...current,
      assignmentId: String(game.assignment_id || ''),
      gameId: String(game.id || ''),
      gameDate: String(game.game_date || current.gameDate || ''),
      gameSite: game.location_name || game.location_address || '',
      gameLevel: game.level || '',
      homeTeam: game.home_team || '',
      visitingTeam: game.away_team || '',
      refereeName,
      umpire1Name,
      umpire2Name,
      crewChief: refereeName || profile.name || '',
      official2: umpire1Name,
      official3: umpire2Name
    }));
    setGameReportStatus('');
  }

  function addGameReportIncident() {
    setGameReportIncidents(current => [...current, createGameReportIncident()]);
  }

  function removeGameReportIncident(index) {
    setGameReportIncidents(current => current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateGameReportIncident(index, field, value) {
    setGameReportIncidents(current => current.map((incident, itemIndex) => (
      itemIndex === index ? { ...incident, [field]: value } : incident
    )));
  }

  async function saveGameReport(status = 'submitted') {
    if (status === 'submitted' && !gameReportForm.certification) {
      setGameReportStatus('Certify the game report before submitting it.');
      return;
    }

    setGameReportStatus(status === 'draft' ? 'Saving draft...' : 'Submitting game report...');
    try {
      const data = await apiPostJson('/official-game-report.php', {
        status,
        report: gameReportForm,
        incidents: gameReportIncidents
      });
      setOfficialProfileData(current => ({
        ...current,
        gameReports: [data.report, ...(current.gameReports || [])]
      }));
      if (status === 'submitted') {
        setGameReportForm(createGameReportForm());
        setGameReportIncidents([createGameReportIncident()]);
        refreshNotifications();
      }
      setGameReportStatus(data.message || (status === 'draft' ? 'Game report draft saved.' : 'Game report submitted.'));
    } catch (error) {
      setGameReportStatus(error.message || 'Game report could not be saved.');
    }
  }

  function submitGameReport(event) {
    event.preventDefault();
    saveGameReport('submitted');
  }

  function updateObserverForm(event) {
    const { name, type, checked, value } = event.target;
    setObserverForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function updateObserverScore(categoryId, value) {
    setObserverScores(current => ({ ...current, [categoryId]: Number(value) }));
  }

  const observerScoreSummary = useMemo(() => {
    const totalWeight = observerObservationCategories.reduce((sum, category) => sum + category.weight, 0) || 100;
    const weightedScore = observerObservationCategories.reduce((sum, category) => {
      const score = Number(observerScores[category.id] || 0);
      return sum + (score * (category.weight / totalWeight));
    }, 0);
    const finalScore = Number(weightedScore.toFixed(2));
    return {
      finalScore,
      crewRanking: observerCrewRanking(finalScore),
      categorySummaries: observerObservationCategories.map(category => ({
        ...category,
        score: Number(observerScores[category.id] || 0)
      }))
    };
  }, [observerScores]);

  async function saveObserverForm(status = 'submitted') {
    if (user.role !== 'observer') {
      setObserverFormStatus('Only observers can submit observer forms.');
      return;
    }
    if (status === 'submitted' && !observerForm.certification) {
      setObserverFormStatus('Certify the observer form before submitting it.');
      return;
    }

    setObserverFormStatus(status === 'draft' ? 'Saving draft...' : 'Submitting observer form...');
    try {
      const data = await apiPostJson('/observer-form.php', {
        status,
        form: observerForm,
        scores: observerScores,
        summary: observerScoreSummary
      });
      if (data.observer_form) {
        setObserverFormHistory(current => [data.observer_form, ...current]);
        setOfficialProfileData(current => ({
          ...current,
          observerForms: [data.observer_form, ...(current.observerForms || [])]
        }));
      }
      if (status === 'submitted') {
        setObserverForm({ ...createObserverForm(), observerName: profile.name || user.name || '' });
        setObserverScores(createObserverScores());
        refreshNotifications();
      }
      setObserverFormStatus(data.message || (status === 'draft' ? 'Observer form draft saved.' : 'Observer form submitted.'));
    } catch (error) {
      setObserverFormStatus(error.message || 'Observer form could not be saved.');
    }
  }

  function submitObserverForm(event) {
    event.preventDefault();
    saveObserverForm('submitted');
  }

  function updateAvailabilityForm(event) {
    const { name, value } = event.target;
    setAvailabilityForm(current => {
      const next = { ...current, [name]: value };
      if (name === 'mode') {
        next.status = value === 'comment' ? 'available' : 'unavailable';
        next.reason = value === 'comment' ? 'contact_required' : 'personal';
        next.game_location = '';
        next.game_school = '';
        next.game_time = '';
        next.supervisor = '';
      }
      if (name === 'reason' && value !== 'game') {
        next.game_location = '';
        next.game_school = '';
        next.game_time = '';
        next.supervisor = '';
      }
      if (name === 'status' && value === 'available') {
        next.reason = 'personal';
        next.game_location = '';
        next.game_school = '';
        next.game_time = '';
        next.supervisor = '';
      }
      return next;
    });
  }

  function openAvailabilityModal(day) {
    const record = day?.record || null;
    setAvailabilityForm(current => ({
      ...current,
      date: day?.date || current.date || new Date().toISOString().slice(0, 10),
      mode: record?.contact_required ? 'comment' : 'unavailable',
      status: record?.contact_required ? 'available' : (record?.status || 'unavailable'),
      reason: record?.contact_required ? 'contact_required' : (record?.reason || 'personal'),
      game_location: record?.game_location || record?.game_city || '',
      game_school: record?.game_school || '',
      game_time: record?.game_time || '',
      supervisor: record?.supervisor || '',
      notes: record?.notes || ''
    }));
    setAvailabilitySaveStatus('');
    setAvailabilityModalOpen(true);
  }

  async function submitAvailability(event) {
    event.preventDefault();
    const isCommentMode = availabilityForm.mode === 'comment';
    const isGameConflict = availabilityForm.mode === 'unavailable' && availabilityForm.reason === 'game';
    if (isCommentMode && !String(availabilityForm.notes || '').trim()) {
      setAvailabilitySaveStatus('Enter a comment so the Super Admin knows to contact you before assigning this date.');
      return;
    }
    if (isGameConflict) {
      const missingGameField = ['game_location', 'game_school', 'game_time', 'supervisor'].some(field => !String(availabilityForm[field] || '').trim());
      if (missingGameField) {
        setAvailabilitySaveStatus('Game conflicts require the game location, school name, supervisor, and game time.');
        return;
      }
    }
    setAvailabilitySaveStatus('Saving availability...');
    try {
      const payload = {
        ...availabilityForm,
        status: isCommentMode ? 'available' : 'unavailable',
        contact_required: isCommentMode
      };
      const data = await apiPostJson('/official-availability.php', payload);
      setOfficialProfileData(current => ({
        ...current,
        availability: data.availability || current.availability
      }));
      setAvailabilitySaveStatus(data.message || 'Availability calendar updated.');
      setStatus(data.message || 'Availability calendar updated.');
      setAvailabilityModalOpen(false);
    } catch (error) {
      setAvailabilitySaveStatus(error.message || 'Availability could not be saved.');
      setStatus(error.message || 'Availability could not be saved.');
    }
  }

  async function saveLivePosition(position) {
    const coords = position.coords || {};
    try {
      const data = await apiPostJson('/geo-location.php', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: coords.accuracy,
        heading: coords.heading,
        speed_mps: coords.speed,
        source: 'browser-watch'
      });
      setOfficialProfileData(current => {
        const arrivalStatuses = data.arrival_statuses || current.arrivalStatuses || {};
        return {
          ...current,
          geoLocation: data.location || current.geoLocation,
          arrivalStatuses,
          assignments: current.assignments.map(assignment => {
            const status = arrivalStatuses[assignment.assignment_id] || assignment.arrival_status;
            return status
              ? { ...assignment, arrival_status: status, distance_miles: status.current_distance_miles ?? assignment.distance_miles }
              : assignment;
          })
        };
      });
      setGeoStatus(`Live location updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Arrival verification refreshes automatically when an accepted assignment has game-site coordinates.`);
    } catch (error) {
      setGeoStatus(error.message || 'Live location could not be saved.');
    }
  }

  function startGeoSharing() {
    if (!navigator.geolocation) {
      setGeoStatus('This browser does not support live geolocation.');
      return;
    }

    if (geoWatchIdRef.current !== null) {
      setGeoStatus('Live location sharing is already running.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      saveLivePosition,
      (error) => {
        setGeoSharing(false);
        setGeoStatus(error.message || 'Location permission was denied or unavailable.');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    geoWatchIdRef.current = watchId;
    setGeoSharing(true);
    setGeoStatus('Live location sharing started. Keep this page or the mobile app open while testing real-time movement.');
  }

  async function stopGeoSharing() {
    if (geoWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
    }
    geoWatchIdRef.current = null;
    setGeoSharing(false);
    try {
      const data = await apiPostJson('/geo-location.php', { action: 'stop' });
      setOfficialProfileData(current => ({ ...current, geoLocation: data.location || current.geoLocation }));
      setGeoStatus(data.message || 'Live location sharing stopped.');
    } catch (error) {
      setGeoStatus(error.message || 'Live location sharing stopped locally.');
    }
  }

  function openProfileEditor() {
    setProfileEditorOpen(true);
    window.requestAnimationFrame(() => {
      const editor = document.getElementById('rtbo-profile-editor');
      editor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      editor?.querySelector('input[name="firstName"]')?.focus({ preventScroll: true });
    });
    setStatus('Profile editor opened. Update your personal information, then click Save Profile.');
  }

  function updatePasswordField(event) {
    const { name, value } = event.target;
    setPasswordForm(current => ({ ...current, [name]: value }));
  }

  async function changePassword(event) {
    event.preventDefault();
    try {
      const data = await apiPostJson('/password-change.php', passwordForm);
      setPasswordStatus(data.message || 'Password changed.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setPasswordStatus(error.message);
    }
  }

  function exportCsv(name, rows) {
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`${name} CSV exported.`);
  }

  const dashboardReadinessChecks = useMemo(() => {
    const counts = overviewData.counts || emptyOverviewData.counts;
    const hasProfileContact = Boolean(profile.email && (profile.phone || profile.addressLine1 || profile.city));
    const formsToolsVisible = !hiddenFormsItems.includes('evaluationForm');
    const hasRegistrationRecords = records.registrations.length > 0;
    const hasFormRecords = records.reports.length > 0;
    const hasScheduledEvents = Number(counts.scheduled_events || 0) > 0;
    const hasUnacceptedAssignments = Number(counts.unaccepted_assignments || 0) > 0;
    const hasTrackedOfficials = Number(counts.tracked_officials || 0) > 0;

    return [
      {
        group: 'Access',
        label: 'Admin Session',
        status: canUseAdminDashboard ? 'Passed' : 'Review',
        detail: canUseAdminDashboard ? 'Current account can open the admin command center.' : 'This account is using the official portal, not the admin dashboard.',
        actionSection: 'profile',
        actionLabel: 'Profile'
      },
      {
        group: 'Records',
        label: 'Registration Pipeline',
        status: hasRegistrationRecords ? 'Passed' : 'Ready',
        detail: hasRegistrationRecords ? 'Live registration records are loaded for review.' : 'No live registration records are loaded in this session.',
        actionSection: 'registrations',
        actionLabel: 'Registrations'
      },
      {
        group: 'Members',
        label: 'Member Management',
        status: settingsMemberWorkflowSections.length > 0 ? 'Passed' : 'Review',
        detail: 'Member creation tools are managed from Settings. Members stays directory-only.',
        actionSection: 'settings',
        actionLabel: 'Settings'
      },
      {
        group: 'Schedules',
        label: 'Schedule Coverage',
        status: hasScheduledEvents ? 'Passed' : 'Ready',
        detail: hasScheduledEvents ? 'Live schedule records are available from the master schedule.' : 'No live schedule records are loaded in this session.',
        actionSection: 'masterSchedule',
        actionLabel: 'Master Schedule'
      },
      {
        group: 'Schedules',
        label: 'Crew Responses',
        status: hasUnacceptedAssignments ? 'Review' : 'Passed',
        detail: hasUnacceptedAssignments ? 'Live assignments are waiting on official response.' : 'No live assignment response issues are loaded in this session.',
        actionSection: 'masterSchedule',
        actionLabel: 'Assignments'
      },
      {
        group: 'Live Ops',
        label: 'Location Tracking',
        status: hasTrackedOfficials ? 'Passed' : 'Ready',
        detail: hasTrackedOfficials ? 'Live location sharing is active for one or more officials.' : 'No live location-sharing records are loaded in this session.',
        actionSection: 'liveMap',
        actionLabel: 'Live Map'
      },
      {
        group: 'Messaging',
        label: 'Notifications',
        status: notificationUnreadCount > 0 ? 'Review' : 'Passed',
        detail: notificationUnreadCount > 0 ? 'Unread dashboard notifications need review.' : 'No unread dashboard notifications are waiting.',
        actionSection: 'overview',
        actionLabel: 'Notifications'
      },
      {
        group: 'Forms',
        label: 'Evaluation Tools',
        status: formsToolsVisible ? 'Passed' : 'Review',
        detail: formsToolsVisible ? 'Evaluation form is visible under Forms.' : 'Evaluation form is hidden in Settings.',
        actionSection: 'evaluationForm',
        actionLabel: 'Evaluation Form'
      },
      {
        group: 'Profile',
        label: 'Profile Readiness',
        status: hasProfileContact ? 'Passed' : 'Review',
        detail: hasProfileContact ? 'Profile has contact details available for dashboard records.' : 'Add phone, address, or city details before launch testing.',
        actionSection: 'profile',
        actionLabel: 'My Profile'
      },
      {
        group: 'Forms',
        label: 'Forms Workspace',
        status: hasFormRecords ? 'Passed' : 'Ready',
        detail: hasFormRecords ? 'Live form records are available for review.' : 'No live form records are loaded in this session.',
        actionSection: 'reports',
        actionLabel: 'Forms'
      }
    ];
  }, [
    canUseAdminDashboard,
    hiddenEducationItems,
    hiddenFormsItems,
    notificationUnreadCount,
    overviewData,
    profile.addressLine1,
    profile.city,
    profile.email,
    profile.phone,
    records.registrations.length,
    records.reports.length,
    user.email,
    user.name,
    settingsMemberWorkflowSections.length
  ]);

  const dashboardReadinessSummary = {
    passed: dashboardReadinessChecks.filter(check => check.status === 'Passed').length,
    ready: dashboardReadinessChecks.filter(check => check.status === 'Ready').length,
    review: dashboardReadinessChecks.filter(check => check.status === 'Review').length
  };

  function openReadinessTarget(section) {
    if (!section) return;
    if (section === 'members') {
      openMembersSection();
      return;
    }
    if (section === 'schedules') {
      openSchedulesSection();
      return;
    }
    if (section === 'organizations') {
      openOrganizationsSection();
      return;
    }
    if (section === 'settings') {
      openSettingsSection();
      return;
    }
    if (section === 'dashboardControls') {
      openDashboardControls();
      return;
    }
    if (settingsWorkflowById.has(section)) {
      openSettingsWorkflow(section);
      return;
    }
    if (section === 'education' || visibleEducationSubSections.some(item => item.id === section)) {
      openEducationSubSection(section === 'education' ? 'education' : section);
      return;
    }
    if (section === 'reports' || activeFormsSubSections.some(item => item.id === section)) {
      openFormsSubSection(section);
      return;
    }
    if (scheduleSetupSections.some(item => item.id === section)) {
      openScheduleSetupSection(section);
      return;
    }
    showSection(section);
  }

  function runDashboardTest() {
    setActiveSection('dashboardControls');
    setEducationMenuOpen(false);
    setMembersMenuOpen(false);
    setSchedulesMenuOpen(false);
    setOrganizationsMenuOpen(false);
    setFormsMenuOpen(false);
    setPaymentsMenuOpen(false);
    setSettingsMenuOpen(true);
    setStatus(`Full RTBO dashboard test completed. ${dashboardReadinessSummary.review} item${dashboardReadinessSummary.review === 1 ? '' : 's'} need review in Dashboard Controls.`);
  }

  const profileFullAddress = [
    profile.addressLine1,
    profile.addressLine2,
    [profile.city, profile.state, profile.zip].filter(Boolean).join(', ')
  ].filter(Boolean).join(' / ');
  const profileLocation = [profile.city, profile.state].filter(Boolean).join(', ');
  const profileConferences = splitList(profile.conferences);
  const officialAssignments = officialProfileData.assignments || [];
  const officialTbaGames = officialProfileData.tbaGames || [];
  const officialAvailability = officialProfileData.availability || [];
  const officialReports = officialProfileData.gameReports || [];
  const savedObserverForms = useMemo(() => {
    const merged = [...observerFormHistory, ...(officialProfileData.observerForms || [])];
    const seen = new Set();
    return merged.filter(form => {
      const key = form.id ? `id-${form.id}` : `${form.created_at || ''}-${form.game_date || ''}-${form.crew_ranking || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [observerFormHistory, officialProfileData.observerForms]);
  const officialEvaluations = officialProfileData.evaluations || [];
  const officialSchoolRanking = officialProfileData.schoolRanking || null;
  const unavailableDates = officialAvailability.filter(item => String(item.status || '').toLowerCase().includes('unavailable'));
  const availabilityByDate = useMemo(() => {
    const map = new Map();
    officialAvailability.forEach(item => {
      if (item.date) map.set(item.date, item);
    });
    return map;
  }, [officialAvailability]);
  const selectedAvailabilityMonth = availabilityForm.date || new Date().toISOString().slice(0, 10);
  const availabilityMonthDate = new Date(`${selectedAvailabilityMonth.slice(0, 7)}-01T12:00:00`);
  const calendarYear = Number.isNaN(availabilityMonthDate.getTime()) ? new Date().getFullYear() : availabilityMonthDate.getFullYear();
  const calendarMonth = Number.isNaN(availabilityMonthDate.getTime()) ? new Date().getMonth() : availabilityMonthDate.getMonth();
  const availabilityCalendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    return [
      ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, blank: true })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { key: date, date, day, record: availabilityByDate.get(date) || null };
      })
    ];
  }, [availabilityByDate, calendarMonth, calendarYear]);
  const availabilityMonthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
  const publishedGamesCard = (context = 'publishedGames') => (
        <article className="rtbo-dashboard-card rtbo-work-availability rtbo-focused-page-card rtbo-profile-published-games">
          <div className="rtbo-dashboard-card-head">
            <div>
              <p className="eyebrow">Published Schedule</p>
              <h3>Assigned Games</h3>
              <p>{context === 'profile' ? 'Published games assigned to you remain visible on your main profile screen.' : 'Only games published by the Super Admin should appear here.'}</p>
            </div>
          </div>
          {officialProfileLoading && <p className="rtbo-empty-state">Loading official schedule...</p>}
          {!officialProfileLoading && officialAssignments.length === 0 && <p className="rtbo-empty-state">No published assignments are available yet.</p>}
          {officialAssignments.length > 0 && (
            <div className="rtbo-official-schedule-list">
              {officialAssignments.map(game => (
                <article className="rtbo-official-schedule-card" key={`${game.id}-${game.position}`}>
                  <div className="rtbo-schedule-matchup">
                    <div className="rtbo-schedule-team"><TeamLogo team={{ logo: game.home_team_logo }} /><strong>{game.home_team || 'Home Team'}</strong></div>
                    <span className="rtbo-schedule-vs">vs</span>
                    <div className="rtbo-schedule-team"><TeamLogo team={{ logo: game.away_team_logo }} /><strong>{game.away_team || 'Visiting Team'}</strong></div>
                    <small>{formatGameDate(game.game_date)} at {formatGameTime(game.game_time)}</small>
                  </div>
                  <div><span>{game.location_name || 'Gym pending'}</span><small>{game.location_address || 'Gym address pending'}</small></div>
                  <div><mark>{game.position || 'Position pending'}</mark><small>{formatLabel(game.assignment_status || 'pending')}</small></div>
                  <AssignmentCoachContacts game={game} />
                  <AssignmentMileage game={game} />
                  {game.arrival_status && (
                    <div className="rtbo-arrival-status">
                      <strong>{game.arrival_status.arrival_verified_at ? 'Arrival Verified' : 'Arrival Pending'}</strong>
                      <span>{arrivalLabel(game.arrival_status)}</span>
                    </div>
                  )}
                  <AssignmentResponsePanel
                    game={game}
                    reason={assignmentDeclineReasons[assignmentKey(game)] || ''}
                    saving={assignmentResponseState[assignmentKey(game)] === 'saving'}
                    onReasonChange={(value) => updateAssignmentDeclineReason(game, value)}
                    onAccept={() => respondToAssignment(game, 'accept')}
                    onDecline={() => respondToAssignment(game, 'decline')}
                  />
                  <AssignmentCrewStrip crew={game.crew} onProfileOpen={setOfficialProfileModal} />
                </article>
              ))}
            </div>
          )}
        </article>
  );
  const profileForm = (
    <form className="form rtbo-profile-form" onSubmit={saveProfile}>
      <div className="grid two"><label>First Name<input name="firstName" value={profile.firstName} onChange={updateProfile} /></label><label>Last Name<input name="lastName" value={profile.lastName} onChange={updateProfile} /></label></div>
      <div className="grid two"><label>Email<input type="email" name="email" value={profile.email} onChange={updateProfile} /></label><label>Phone<input type="tel" name="phone" value={profile.phone} onChange={updateProfile} inputMode="tel" autoComplete="tel" maxLength="14" placeholder="(xxx) xxx-xxxx" /></label></div>
      <div className="grid two"><label>Sex<select name="sex" value={profile.sex} onChange={updateProfile}>{sexOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label><label>Race<select name="race" value={profile.race} onChange={updateProfile}>{raceOptions.map(([value, label]) => <option key={value || 'empty'} value={value}>{label}</option>)}</select></label></div>
      <div className="grid two"><label>Address 1<input name="addressLine1" value={profile.addressLine1} onChange={updateProfile} /></label><label>Address 2<input name="addressLine2" value={profile.addressLine2} onChange={updateProfile} /></label></div>
      <div className="grid three"><label>City<input name="city" value={profile.city} onChange={updateProfile} /></label><label>State<StateSelect value={profile.state} onChange={updateProfile} /></label><label>Zip<input name="zip" value={profile.zip} onChange={updateProfile} /></label></div>
      <label>High School / College Conferences Worked<textarea name="conferences" value={profile.conferences} onChange={updateProfile} placeholder="Enter conferences worked" /></label>
      <label>Level of Experience / Notes<textarea name="experience" value={profile.experience} onChange={updateProfile} placeholder="High School, NJCAA, NAIA, NCAA DIII, NCAA DII, NCAA DI, Pro-Am" /></label>
      <label>Profile Picture<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={updateProfile} /></label>
      <div className="button-row"><button className="btn" type="submit">Save Profile</button><button className="btn secondary dark-btn" type="button" onClick={runProfileTest}>Run Profile Test</button></div>
    </form>
  );

  const passwordFormBlock = (
    <form className="form rtbo-password-form" onSubmit={changePassword}>
      <div className="grid three">
        <PasswordField label="Current Password" name="current_password" value={passwordForm.current_password} onChange={updatePasswordField} autoComplete="current-password" />
        <PasswordField label="New Password" name="new_password" value={passwordForm.new_password} onChange={updatePasswordField} autoComplete="new-password" />
        <PasswordField label="Confirm Password" name="confirm_password" value={passwordForm.confirm_password} onChange={updatePasswordField} autoComplete="new-password" />
      </div>
      <div className="button-row"><button className="btn" type="submit">Change Password</button></div>
      {passwordStatus && <p className="form-message">{passwordStatus}</p>}
    </form>
  );

  const adminProfileBlock = (
    <section className="rtbo-dashboard-card">
      <div className="rtbo-profile-preview">
        <button className="rtbo-profile-photo-button" type="button" onClick={() => setOfficialProfileModal(profile)} aria-label={`View ${profile.name} profile`}>
          <ProfilePhoto person={profile} alt={`${profile.name} profile`} />
        </button>
        <div>
          <p className="eyebrow">Super Admin Profile</p>
          <h3>{profile.name}</h3>
          <p><strong>Status:</strong> {profile.status === 'active' ? 'Active - Ready For Assignments' : 'Inactive - Complete Your Profile'}</p>
          <p>{profile.email} • {emptyLabel(profile.phone, 'Phone not entered')}</p>
          <p>{emptyLabel(profileFullAddress, 'Address not entered')}</p>
          <p>{emptyLabel(profile.conferences, 'Conferences not entered')}</p>
        </div>
      </div>
      {profileForm}
      {passwordFormBlock}
    </section>
  );

  const officialProfileSummaryPage = (
    <>
      <article id="rtbo-profile-editor" className={`rtbo-dashboard-card rtbo-member-personal-profile${profileEditorOpen ? ' rtbo-profile-editor-active' : ''}`}>
        <div className="rtbo-profile-preview rtbo-member-profile-banner">
          <div className="rtbo-profile-photo-stack">
            <button className="rtbo-profile-photo-button" type="button" onClick={() => setOfficialProfileModal(profile)} aria-label={`View ${profile.name} profile`}>
              <ProfilePhoto person={profile} alt={`${profile.name} profile`} />
            </button>
            <label className={`rtbo-profile-photo-upload${profilePhotoSaving ? ' is-saving' : ''}`}>
              <span>{profilePhotoSaving ? 'Uploading...' : 'Update Picture'}</span>
              <input type="file" name="profile_photo_quick" accept="image/jpeg,image/png,image/webp" onChange={uploadProfilePhoto} disabled={profilePhotoSaving} />
            </label>
          </div>
          <div>
            <p className="eyebrow">{formatLabel(user.role || 'official')} Profile</p>
            <h3>{emptyLabel(profile.name, 'Official Name')}</h3>
            <strong className="rtbo-profile-status-title">Status:</strong>
            <p><b>{profile.status === 'active' ? 'Active - Ready For Assignments' : 'Inactive - Profile Update Required'}</b></p>
            <p>{emptyLabel(profile.email, 'Email not entered')} • {emptyLabel(profile.phone, 'Phone not entered')}</p>
            <p>{emptyLabel(profileFullAddress || profileLocation, 'Address not entered')}</p>
            <p>{profileConferences.length ? profileConferences.join(', ') : 'Conferences not entered'}</p>
          </div>
        </div>
        <div className="button-row rtbo-profile-hero-actions">
          <button className="btn" type="button" onClick={openProfileEditor}>{profileEditorOpen ? 'Editing Profile' : 'Edit Profile'}</button>
          {profileEditorOpen && <button className="btn secondary dark-btn" type="button" onClick={() => setProfileEditorOpen(false)}>Close Editor</button>}
        </div>
        {profileEditorOpen && (
          <div className="rtbo-profile-editor-panel">
            {profileForm}
            {passwordFormBlock}
          </div>
        )}
      </article>
      <article className="rtbo-dashboard-card rtbo-school-ranking-widget">
        <div>
          <p className="eyebrow">School Ranking</p>
          <h3>{officialSchoolRanking?.rank ? `#${officialSchoolRanking.rank}` : 'Not Released'}</h3>
          <p>{officialSchoolRanking?.rank ? `Ranked ${officialSchoolRanking.rank} of ${officialSchoolRanking.total_officials || 1} officials during school.` : 'School evaluation ranking will appear after a released school evaluation is saved.'}</p>
        </div>
        {officialSchoolRanking?.rank ? (
          <div className="rtbo-school-ranking-stats">
            <span><b>{Number(officialSchoolRanking.average_score || 0).toFixed(2)}</b>Average Score</span>
            <span><b>{officialSchoolRanking.evaluation_count || 0}</b>School Evaluations</span>
            <span><b>{officialSchoolRanking.ranking_label || 'Ranking Pending'}</b>Current Tier</span>
          </div>
        ) : (
          <div className="rtbo-school-ranking-stats muted">
            <span><b>-</b>Average Score</span>
            <span><b>-</b>School Evaluations</span>
            <span><b>Regular Season Excluded</b>School Only</span>
          </div>
        )}
      </article>
      {publishedGamesCard('profile')}
    </>
  );

  const officialLiveLocationPage = (
      <article className="rtbo-dashboard-card rtbo-geo-share-card">
        <div>
          <p className="eyebrow">Live Location</p>
          <h3>Game-Site Arrival Verification</h3>
          <p>Turn this on before travel or game day so the Super Admin can see the closest officials and verify arrival times for accepted assignments.</p>
          <small>Last shared: {formatGeoTimestamp(officialProfileData.geoLocation?.updated_at)}{officialProfileData.geoLocation?.accuracy_meters ? ` / Accuracy ${Math.round(officialProfileData.geoLocation.accuracy_meters)}m` : ''}</small>
        </div>
        <div className="button-row">
          <button className="btn" type="button" onClick={startGeoSharing} disabled={geoSharing}>Start Live Sharing</button>
          <button className="btn secondary dark-btn" type="button" onClick={stopGeoSharing} disabled={!geoSharing}>Stop Sharing</button>
        </div>
        {geoStatus && <p className="form-message">{geoStatus}</p>}
      </article>
  );

  const rtbomailMessages = notifications.filter(isMessageNotification);
  const rtbomailUnreadCount = rtbomailMessages.filter(notification => !notification.is_read).length;
  const standardNotifications = notifications.filter(notification => !isMessageNotification(notification));
  const activeNotifications = notifications.filter(notification => !notification.is_read);
  const activeStandardNotifications = standardNotifications.filter(notification => !notification.is_read);
  const standardUnreadNotificationCount = activeStandardNotifications.length;

  const officialNotificationsPage = (
      <NotificationCenter
        notifications={activeStandardNotifications}
        unreadCount={standardUnreadNotificationCount}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markStandardNotificationsRead}
        title="Notifications"
        description="Assignment alerts, profile updates, evaluation alerts, and system notices appear here until they are read."
        compact
      />
  );

  const officialRtbomailPage = (
      <RTBOMailClient
        user={user}
        messages={rtbomailMessages}
        unreadCount={rtbomailUnreadCount}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markMessageNotificationsRead}
        onSendMessage={sendRtbomailMessage}
      />
  );

  const refRoomPage = (
    <React.Suspense fallback={<section className="rtbo-dashboard-card rtbo-focused-page-card"><p className="rtbo-empty-state">Loading RefRoom...</p></section>}>
      <RefRoom user={user} onStatus={setStatus} canManageMeetings={canUseAdminDashboard} mode={canUseAdminDashboard ? 'production' : 'player'} />
    </React.Suspense>
  );

  const officialTbaListPage = (
        <article className="rtbo-dashboard-card rtbo-work-tba rtbo-focused-page-card">
          <div className="rtbo-dashboard-card-head">
            <div>
              <p className="eyebrow">TBA List</p>
              <h3>Open Games You Can Request</h3>
              <p>These are unassigned games released by the Super Admin. Requesting a game does not assign you to it; the Super Admin still approves and places officials on the crew.</p>
            </div>
          </div>
          {officialProfileLoading && <p className="rtbo-empty-state">Loading TBA games...</p>}
          {!officialProfileLoading && officialTbaGames.length === 0 && <p className="rtbo-empty-state">No TBA games are available right now.</p>}
          {officialTbaGames.length > 0 && (
            <div className="rtbo-official-tba-list">
              {officialTbaGames.map(game => {
                const requested = Boolean(game.request || game.tba_request_status);
                return (
                  <article className="rtbo-official-tba-card" key={`tba-${game.id}`}>
                    <div>
                      <strong>{game.away_team || 'Visiting Team'} at {game.home_team || 'Home Team'}</strong>
                      <span>{formatGameDate(game.game_date)} at {formatGameTime(game.game_time)} / {game.level || 'Game type pending'}</span>
                      <small>{game.location_name || 'Gym pending'} / {game.location_address || 'Gym address pending'}</small>
                    </div>
                    <div>
                      <span className="rtbo-status-pill tba">{requested ? formatLabel(game.tba_request_status || game.request?.status || 'requested') : 'TBA open'}</span>
                      <button
                        className="btn secondary dark-btn"
                        type="button"
                        onClick={() => requestTbaGame(game)}
                        disabled={requested || assignmentResponseState[`tba-${game.id}`] === 'saving'}
                      >
                        {requested ? 'Request Sent' : assignmentResponseState[`tba-${game.id}`] === 'saving' ? 'Sending...' : 'Request This Game'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>
  );

  const officialPublishedGamesPage = publishedGamesCard();

  const officialAvailabilityPage = (
        <article className="rtbo-dashboard-card rtbo-work-availability-history rtbo-focused-page-card">
          <div className="rtbo-dashboard-card-head">
            <div>
              <p className="eyebrow">Availability</p>
              <h3>Availability History</h3>
              <p>Availability records entered by the official or saved by the platform will appear here.</p>
            </div>
          </div>
          {officialAvailability.length === 0 && <p className="rtbo-empty-state">No availability records are available yet.</p>}
          {officialAvailability.length > 0 && (
            <div className="rtbo-official-record-list rtbo-schedule-record-list">
              {officialAvailability.map(item => (
                <article key={`availability-${item.id || item.date}`}>
                  <div><strong>{formatGameDate(item.date)}</strong><span>{formatLabel(item.status || 'availability')}</span></div>
                  <p>{item.reason || item.notes || 'No reason entered.'}</p>
                </article>
              ))}
            </div>
          )}
        </article>
  );

  const officialAvailabilityCalendarPage = (
    <article className="rtbo-dashboard-card rtbo-focused-page-card rtbo-official-calendar-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Availability Calendar</p>
          <h3>Available & Unavailable Dates</h3>
          <p>Select a date to close availability or leave a contact note. Game conflicts require location, school, supervisor, and game time.</p>
        </div>
      </div>

      <div className="rtbo-availability-calendar-head">
        <h4>{availabilityMonthLabel}</h4>
        <div className="rtbo-calendar-legend">
          <span><b className="available"></b> Available</span>
          <span><b className="unavailable"></b> Unavailable</span>
          <span><b className="contact-required"></b> Contact First</span>
          <span><b></b> No record</span>
        </div>
      </div>
      <div className="rtbo-availability-weekdays" aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="rtbo-availability-month-grid">
        {availabilityCalendarDays.map(day => (
          day.blank
            ? <span className="rtbo-calendar-day blank" key={day.key}></span>
            : (
              <button
                className={`rtbo-calendar-day ${day.record?.contact_required ? 'contact-required' : (day.record ? String(day.record.status || '').toLowerCase() : 'open')}${availabilityForm.date === day.date ? ' selected' : ''}`}
                type="button"
                key={day.key}
                onClick={() => openAvailabilityModal(day)}
              >
                <strong>{day.day}</strong>
                <span className={`rtbo-calendar-status-badge ${day.record?.contact_required ? 'contact-required' : (day.record ? String(day.record.status || '').toLowerCase() : 'open')}`}>
                  {day.record?.contact_required ? 'Contact first' : (day.record ? formatLabel(day.record.status) : 'Open')}
                </span>
                {day.record?.reason && !day.record?.contact_required && (
                  <small className="rtbo-calendar-reason-badge unavailable">{formatLabel(day.record.reason)}</small>
                )}
                {day.record?.contact_required && (
                  <small className="rtbo-calendar-reason-badge contact-required">{day.record.notes || 'Contact before assigning'}</small>
                )}
              </button>
            )
        ))}
      </div>

      {availabilityModalOpen && (
        <div className="rtbo-modal-scrim rtbo-availability-modal-scrim" role="presentation" onClick={() => setAvailabilityModalOpen(false)}>
          <form className="form rtbo-availability-modal" onSubmit={submitAvailability} onClick={event => event.stopPropagation()}>
            <button className="rtbo-modal-close" type="button" onClick={() => setAvailabilityModalOpen(false)}>×</button>
            <p className="eyebrow">Availability Date</p>
            <h3>{formatGameDate(availabilityForm.date)}</h3>
            <p className="rtbo-muted-small">Close the date when you cannot work, or leave a comment while staying available so the Super Admin contacts you first.</p>

            <label>Calendar Action
              <select name="mode" value={availabilityForm.mode} onChange={updateAvailabilityForm}>
                <option value="unavailable">Close availability for this date</option>
                <option value="comment">Leave available with contact note</option>
              </select>
            </label>

            {availabilityForm.mode === 'unavailable' && (
              <label>Reason
                <select name="reason" value={availabilityForm.reason} onChange={updateAvailabilityForm} required>
                  <option value="game">Game</option>
                  <option value="personal">Personal</option>
                  <option value="work">Work</option>
                  <option value="schedule_conflict">Schedule Conflict</option>
                </select>
              </label>
            )}

            {availabilityForm.mode === 'unavailable' && availabilityForm.reason === 'game' && (
              <div className="grid two">
                <label>Game Location
                  <input name="game_location" value={availabilityForm.game_location} onChange={updateAvailabilityForm} placeholder="Gym or city/location" required />
                </label>
                <label>School Name
                  <input name="game_school" value={availabilityForm.game_school} onChange={updateAvailabilityForm} placeholder="School name" required />
                </label>
                <label>Supervisor
                  <input name="supervisor" value={availabilityForm.supervisor} onChange={updateAvailabilityForm} placeholder="Supervisor name" required />
                </label>
                <label>Game Time
                  <input type="time" name="game_time" value={availabilityForm.game_time} onChange={updateAvailabilityForm} required />
                </label>
              </div>
            )}

            <label>{availabilityForm.mode === 'comment' ? 'Comment For Super Admin' : 'Optional Notes'}
              <textarea
                name="notes"
                value={availabilityForm.notes}
                onChange={updateAvailabilityForm}
                placeholder={availabilityForm.mode === 'comment' ? 'Availability comment' : 'Optional notes for the assignor'}
                rows="4"
                required={availabilityForm.mode === 'comment'}
              />
            </label>

            <div className="button-row">
              <button className="btn" type="submit">Save Calendar Date</button>
              <button className="btn secondary dark-btn" type="button" onClick={() => setAvailabilityModalOpen(false)}>Cancel</button>
            </div>
            {availabilitySaveStatus && <p className="form-message">{availabilitySaveStatus}</p>}
          </form>
        </div>
      )}

      {officialAvailability.length === 0 && <p className="rtbo-empty-state">No availability dates have been saved yet.</p>}
      {officialAvailability.length > 0 && (
        <div className="rtbo-availability-calendar-grid">
          {officialAvailability.map(item => (
            <article className={`rtbo-calendar-date-card ${item.contact_required ? 'contact-required' : (String(item.status || '').toLowerCase().includes('unavailable') ? 'unavailable' : 'available')}`} key={`calendar-${item.id || item.date}`}>
              <span>{item.contact_required ? 'Contact before assignment' : formatLabel(item.status || 'available')}</span>
              <strong>{formatGameDate(item.date)}</strong>
              <p>
                {item.contact_required && <em className="rtbo-calendar-reason-badge contact-required">{item.notes || 'Contact before assigning'}</em>}
                {!item.contact_required && item.reason && <em className="rtbo-calendar-reason-badge unavailable">{formatLabel(item.reason)}</em>}
                <span>{[item.game_school, item.game_location || item.game_city, item.game_time && formatGameTime(item.game_time), item.supervisor && `Supervisor: ${item.supervisor}`, !item.contact_required && item.notes].filter(Boolean).join(' / ') || (item.contact_required ? '' : 'No notes entered.')}</span>
              </p>
            </article>
          ))}
        </div>
      )}
      {unavailableDates.length > 0 && <p className="form-message">{unavailableDates.length} unavailable {unavailableDates.length === 1 ? 'date is' : 'dates are'} currently on file.</p>}
    </article>
  );

  const officialPostgamePage = (
    <article className="rtbo-dashboard-card rtbo-official-widget-page rtbo-work-postgame rtbo-focused-page-card rtbo-game-report-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Official Forms</p>
          <h3>Advanced Game Report</h3>
          <p>Submit NFHS, NCAA Women, or NCAA Men game reports with incidents, crew details, game conditions, and final score.</p>
        </div>
      </div>

      <div className="rtbo-game-report-summary">
        <article><span>Reports Submitted</span><strong>{officialReports.length}</strong></article>
        <article><span>Incidents Logged</span><strong>{officialReports.reduce((count, report) => count + (Array.isArray(report.incidents) ? report.incidents.length : 0), 0)}</strong></article>
        <article><span>Rule Set</span><strong>{gameReportForm.ruleSet}</strong></article>
        <article><span>Live Sync</span><strong>Active</strong></article>
      </div>

      <form className="form rtbo-game-report-form" onSubmit={submitGameReport}>
        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Rule Set</p>
              <h4>Report Standard</h4>
            </div>
            <div className="rtbo-game-report-rule-buttons">
              {gameReportRuleSets.map(([value, label]) => (
                <button
                  className={gameReportForm.ruleSet === value ? 'active' : ''}
                  type="button"
                  key={value}
                  onClick={() => setGameReportForm(current => ({ ...current, ruleSet: value }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid three">
            <label>Assigned Game
              <select name="assignmentId" value={gameReportForm.assignmentId} onChange={selectGameReportAssignment}>
                <option value="">Manual report / select assigned game</option>
                {officialAssignments.map(game => (
                  <option key={`report-game-${game.assignment_id || game.id}`} value={game.assignment_id || ''}>
                    {[game.away_team, game.home_team && `at ${game.home_team}`, formatGameDate(game.game_date)].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>Table Performance
              <select name="tablePerformance" value={gameReportForm.tablePerformance} onChange={updateGameReportForm}>
                <option value="">Select table performance</option>
                {gameReportQualityOptions.map(option => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Dressing Room Condition
              <select name="dressingRoomCondition" value={gameReportForm.dressingRoomCondition} onChange={updateGameReportForm}>
                <option value="">Select condition</option>
                {dressingRoomConditionOptions.map(option => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Game Information</p>
              <h4>Game Details</h4>
            </div>
          </div>
          <div className="grid three">
            <label>Game Date<input type="date" name="gameDate" value={gameReportForm.gameDate} onChange={updateGameReportForm} required /></label>
            <label>Game Site<input name="gameSite" value={gameReportForm.gameSite} onChange={updateGameReportForm} placeholder="Gym, arena, or school" required /></label>
            <label>Game Level<input name="gameLevel" value={gameReportForm.gameLevel} onChange={updateGameReportForm} placeholder="Varsity, NCAA DII, etc." /></label>
            <label>Home Team<input name="homeTeam" value={gameReportForm.homeTeam} onChange={updateGameReportForm} required /></label>
            <label>Visiting Team<input name="visitingTeam" value={gameReportForm.visitingTeam} onChange={updateGameReportForm} required /></label>
            <label>Final Score<input name="finalScore" value={gameReportForm.finalScore} onChange={updateGameReportForm} placeholder="Auto-filled from scores" /></label>
            <label>Home Score<select name="homeScore" value={gameReportForm.homeScore} onChange={updateGameReportForm}><option value="">Home score</option>{Array.from({ length: 201 }, (_, score) => <option key={`home-${score}`} value={score}>{score}</option>)}</select></label>
            <label>Visiting Score<select name="visitingScore" value={gameReportForm.visitingScore} onChange={updateGameReportForm}><option value="">Visiting score</option>{Array.from({ length: 201 }, (_, score) => <option key={`visitor-${score}`} value={score}>{score}</option>)}</select></label>
            <label>Crew Chief<input name="crewChief" value={gameReportForm.crewChief} onChange={updateGameReportForm} placeholder="Crew chief name" /></label>
            <label>Referee Name<input name="refereeName" value={gameReportForm.refereeName} onChange={updateGameReportForm} /></label>
            <label>Umpire 1 Name<input name="umpire1Name" value={gameReportForm.umpire1Name} onChange={updateGameReportForm} /></label>
            <label>Umpire 2 Name<input name="umpire2Name" value={gameReportForm.umpire2Name} onChange={updateGameReportForm} /></label>
          </div>
        </section>

        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Incident Reporting</p>
              <h4>Game Incidents</h4>
            </div>
            <button className="btn secondary dark-btn" type="button" onClick={addGameReportIncident}>Add Incident</button>
          </div>
          <div className="rtbo-game-report-incident-list">
            {gameReportIncidents.map((incident, index) => (
              <article className="rtbo-game-report-incident" key={`incident-${index}`}>
                <div className="grid four">
                  <label>Incident Type
                    <select value={incident.type} onChange={(event) => updateGameReportIncident(index, 'type', event.target.value)}>
                      <option value="">Select incident type</option>
                      {(gameReportIncidentOptions[gameReportForm.ruleSet] || gameReportIncidentOptions.NFHS).map(option => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label>Player / Coach<input value={incident.player} onChange={(event) => updateGameReportIncident(index, 'player', event.target.value)} /></label>
                  <label>Team<input value={incident.team} onChange={(event) => updateGameReportIncident(index, 'team', event.target.value)} /></label>
                  <label>Game Time / Quarter<input value={incident.time} onChange={(event) => updateGameReportIncident(index, 'time', event.target.value)} /></label>
                </div>
                <label>Detailed Incident Description
                  <textarea rows="4" value={incident.description} onChange={(event) => updateGameReportIncident(index, 'description', event.target.value)} />
                </label>
                {gameReportIncidents.length > 1 && <button className="btn secondary dark-btn" type="button" onClick={() => removeGameReportIncident(index)}>Remove Incident</button>}
              </article>
            ))}
          </div>
        </section>

        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Certification</p>
              <h4>Submit Report</h4>
            </div>
          </div>
          <label>Additional Notes<textarea name="notes" value={gameReportForm.notes} onChange={updateGameReportForm} rows="4" placeholder="Supervisor notes, game management details, crew follow-up, or supporting context." /></label>
          <label className="rtbo-game-report-certification">
            <input type="checkbox" name="certification" checked={gameReportForm.certification} onChange={updateGameReportForm} />
            <span>I certify that this game report is accurate and complies with the applicable reporting standard.</span>
          </label>
          <div className="button-row">
            <button className="btn" type="submit">Submit Official Report</button>
            <button className="btn secondary dark-btn" type="button" onClick={() => saveGameReport('draft')}>Save Draft</button>
          </div>
          {gameReportStatus && <p className={`form-message${gameReportStatus.toLowerCase().includes('could not') || gameReportStatus.toLowerCase().includes('complete') || gameReportStatus.toLowerCase().includes('certify') ? ' error' : ''}`}>{gameReportStatus}</p>}
        </section>
      </form>

      <section className="rtbo-game-report-history">
        <div className="rtbo-dashboard-card-head compact">
          <div>
            <p className="eyebrow">Report History</p>
            <h4>Submitted Game Reports</h4>
          </div>
        </div>
        {officialReports.length === 0 && <p className="rtbo-empty-state">No game reports have been submitted yet.</p>}
        {officialReports.length > 0 && (
          <div className="rtbo-official-record-list">
            {officialReports.map(report => (
              <article key={`report-${report.id || report.created_at}`}>
                <div>
                  <strong>{[report.visiting_team || 'Visiting Team', report.home_team && `at ${report.home_team}`].filter(Boolean).join(' ')}</strong>
                  <span>{formatLabel(report.status || 'submitted')}</span>
                </div>
                <p>{[report.rule_set, report.final_score && `Final: ${report.final_score}`, report.table_performance && `Table: ${report.table_performance}`].filter(Boolean).join(' / ') || 'Game report details pending.'}</p>
                {Array.isArray(report.incidents) && report.incidents.length > 0 && <small>{report.incidents.length} incident{report.incidents.length === 1 ? '' : 's'} logged</small>}
                {report.notes && <p>{report.notes}</p>}
                <small>{formatGameDate(String(report.game_date || report.created_at).slice(0, 10))}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );

  const observerFormPage = (
    <article className="rtbo-dashboard-card rtbo-official-widget-page rtbo-work-observer-form rtbo-focused-page-card rtbo-game-report-page rtbo-observer-form-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Observer Forms</p>
          <h3>RTBO Advanced Observer Form</h3>
          <p>Live game, livestream, and film review observations for basketball officiating crews.</p>
        </div>
      </div>

      <div className="rtbo-game-report-summary rtbo-observer-summary">
        <article><span>Observation Type</span><strong>{observerObservationTypes.find(([value]) => value === observerForm.observationType)?.[1] || 'Live Game'}</strong></article>
        <article><span>Crew Rating</span><strong>{observerScoreSummary.finalScore.toFixed(2)}</strong></article>
        <article><span>Game Level</span><strong>{observerForm.gameLevel || 'Pending'}</strong></article>
        <article><span>Observer Status</span><strong>{formatLabel(profile.status || 'active')}</strong></article>
      </div>

      <form className="form rtbo-game-report-form rtbo-observer-form" onSubmit={submitObserverForm}>
        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Observation Format</p>
              <h4>Game Source</h4>
            </div>
            <div className="rtbo-game-report-rule-buttons">
              {observerObservationTypes.map(([value, label]) => (
                <button
                  className={observerForm.observationType === value ? 'active' : ''}
                  type="button"
                  key={value}
                  onClick={() => setObserverForm(current => ({ ...current, observationType: value }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid three">
            <label>Observer Name<input name="observerName" value={observerForm.observerName} onChange={updateObserverForm} required /></label>
            <label>Game Date<input type="date" name="gameDate" value={observerForm.gameDate} onChange={updateObserverForm} required /></label>
            <label>Game Level<input name="gameLevel" value={observerForm.gameLevel} onChange={updateObserverForm} placeholder="Varsity, college, tournament, etc." required /></label>
            <label>Game Site<input name="gameSite" value={observerForm.gameSite} onChange={updateObserverForm} placeholder="Gym, arena, or livestream source" required /></label>
            <label>Home Team<input name="homeTeam" value={observerForm.homeTeam} onChange={updateObserverForm} /></label>
            <label>Visiting Team<input name="visitingTeam" value={observerForm.visitingTeam} onChange={updateObserverForm} /></label>
          </div>
        </section>

        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Crew</p>
              <h4>Officials Observed</h4>
            </div>
          </div>
          <div className="grid three">
            <label>Crew Chief<input name="crewChief" value={observerForm.crewChief} onChange={updateObserverForm} /></label>
            <label>Official #2<input name="official2" value={observerForm.official2} onChange={updateObserverForm} /></label>
            <label>Official #3<input name="official3" value={observerForm.official3} onChange={updateObserverForm} /></label>
            <label className="span-three">Livestream / Film Link<input type="url" name="videoUrl" value={observerForm.videoUrl} onChange={updateObserverForm} placeholder="https://..." /></label>
          </div>
        </section>

        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Scoring</p>
              <h4>Observer Evaluation Categories</h4>
            </div>
          </div>
          <div className="rtbo-observer-score-grid">
            {observerScoreSummary.categorySummaries.map(category => (
              <article className="rtbo-observer-score-card" key={category.id}>
                <div>
                  <span>{category.weight}% Weight</span>
                  <strong>{category.title}</strong>
                </div>
                <label>
                  Category Score
                  <select value={category.score} onChange={(event) => updateObserverScore(category.id, event.target.value)}>
                    {[1, 2, 3, 4, 5].map(score => <option key={`${category.id}-${score}`} value={score}>{score}</option>)}
                  </select>
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="rtbo-game-report-panel">
          <div className="rtbo-game-report-panel-head">
            <div>
              <p className="eyebrow">Observation Notes</p>
              <h4>Development Feedback</h4>
            </div>
          </div>
          <div className="grid two">
            <label>Strengths<textarea name="strengths" value={observerForm.strengths} onChange={updateObserverForm} rows="5" /></label>
            <label>Areas For Improvement<textarea name="concerns" value={observerForm.concerns} onChange={updateObserverForm} rows="5" /></label>
            <label>Recommendations<textarea name="recommendations" value={observerForm.recommendations} onChange={updateObserverForm} rows="5" /></label>
            <label>Follow-Up<textarea name="followUp" value={observerForm.followUp} onChange={updateObserverForm} rows="5" /></label>
          </div>
        </section>

        <section className="rtbo-game-report-panel">
          <div className="rtbo-observer-result-grid">
            <article>
              <span>Final Observation Score</span>
              <strong>{observerScoreSummary.finalScore.toFixed(2)}</strong>
              <p>Weighted observation score generated from category ratings.</p>
            </article>
            <article className="highlight">
              <span>Crew Ranking</span>
              <strong>{observerScoreSummary.crewRanking}</strong>
              <p>Generated from live observer scoring.</p>
            </article>
          </div>
          <label className="rtbo-game-report-certification">
            <input type="checkbox" name="certification" checked={observerForm.certification} onChange={updateObserverForm} />
            <span>I certify that this observer form is accurate and ready for RTBO review.</span>
          </label>
          <div className="button-row">
            <button className="btn" type="submit">Submit Observer Form</button>
            <button className="btn secondary dark-btn" type="button" onClick={() => saveObserverForm('draft')}>Save Draft</button>
          </div>
          {observerFormStatus && <p className={`form-message${observerFormStatus.toLowerCase().includes('could not') || observerFormStatus.toLowerCase().includes('complete') || observerFormStatus.toLowerCase().includes('certify') || observerFormStatus.toLowerCase().includes('only observers') ? ' error' : ''}`}>{observerFormStatus}</p>}
        </section>
      </form>

      <section className="rtbo-game-report-history">
        <div className="rtbo-dashboard-card-head compact">
          <div>
            <p className="eyebrow">Observer Form History</p>
            <h4>Saved Observer Forms</h4>
          </div>
        </div>
        {savedObserverForms.length === 0 && <p className="rtbo-empty-state">No observer forms have been saved yet.</p>}
        {savedObserverForms.length > 0 && (
          <div className="rtbo-official-record-list">
            {savedObserverForms.map(record => (
              <article key={`observer-form-${record.id || record.created_at}`}>
                <div>
                  <strong>{[record.visiting_team || 'Visiting Team', record.home_team && `at ${record.home_team}`].filter(Boolean).join(' ')}</strong>
                  <span>{formatLabel(record.status || 'submitted')}</span>
                </div>
                <p>{[record.observation_type && formatLabel(record.observation_type), record.game_level, record.crew_ranking, record.final_score && `Score: ${Number(record.final_score).toFixed(2)}`].filter(Boolean).join(' / ') || 'Observer form details pending.'}</p>
                <small>{formatGameDate(String(record.game_date || record.created_at).slice(0, 10))}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </article>
  );

  const officialEvaluationPage = (
    <>
      {['evaluator', 'observer'].includes(user.role) && <AdvancedOfficialsEvaluationForm user={user} />}
          <article className="rtbo-dashboard-card rtbo-official-widget-page rtbo-work-evaluation rtbo-focused-page-card">
            <div className="rtbo-dashboard-card-head">
              <div>
                <p className="eyebrow">Evaluation</p>
                <h3>Rankings & Feedback</h3>
                <p>View released evaluations, ratings, rankings, and official development feedback.</p>
              </div>
            </div>
            {officialEvaluations.length === 0 && <p className="rtbo-empty-state">No approved evaluations are visible yet.</p>}
            {officialEvaluations.length > 0 && (
              <div className="rtbo-official-record-list rtbo-official-evaluation-list">
                {officialEvaluations.map((evaluation, index) => (
                  <article key={`${evaluation.created_at}-${index}`}>
                    <div>
                      <strong>{evaluation.total_score ? `Total Score: ${evaluation.total_score}` : 'Released Evaluation'}</strong>
                      <span>{formatGameDate(String(evaluation.game_date || evaluation.created_at).slice(0, 10))}</span>
                    </div>
                    <small>
                      {[evaluationTypeLabel(evaluation.evaluation_type), evaluation.game_type && regularSeasonGameTypeLabel(evaluation.game_type), evaluation.ranking_label].filter(Boolean).join(' / ')}
                    </small>
                    {evaluation.scores && (
                      <div className="rtbo-score-grid">
                        {Object.entries(evaluation.scores).map(([label, score]) => <span key={label}>{label}: <b>{score ?? '-'}</b></span>)}
                      </div>
                    )}
                    {evaluation.strengths && <p><b>Strengths:</b> {evaluation.strengths}</p>}
                    {evaluation.improvements && <p><b>Areas For Improvement:</b> {evaluation.improvements}</p>}
                    {evaluation.recommendation && <p><b>Recommendation:</b> {evaluation.recommendation}</p>}
                    {evaluation.comments_to_admin && <p><b>Admin / Assignor:</b> {evaluation.comments_to_admin}</p>}
                    {!evaluation.strengths && !evaluation.improvements && !evaluation.recommendation && !evaluation.comments_to_admin && (
                      <p>{evaluation.comments_to_official || 'No released comments.'}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </article>
    </>
  );

  const officialEducationPage = (
    <React.Suspense fallback={null}>
      <EducationLanding
        canUseAdminDashboard={canUseAdminDashboard}
        onOpenAcademy={() => openEducationSubSection('rtboAcademy')}
        onOpenTests={() => openEducationSubSection('tests')}
      />
    </React.Suspense>
  );

  const officialPortalPages = {
    profile: officialProfileSummaryPage,
    publishedGames: officialPublishedGamesPage,
    liveLocation: officialLiveLocationPage,
    notifications: officialNotificationsPage,
    rtbomail: officialRtbomailPage,
    refroom: refRoomPage,
    messages: officialRtbomailPage,
    tbaList: officialTbaListPage,
    availability: officialAvailabilityPage,
    availabilityCalendar: officialAvailabilityCalendarPage,
    reports: user.role === 'observer' ? observerFormPage : officialPostgamePage,
    ...(user.role === 'official' ? { postgame: officialPostgamePage } : {}),
    ...(user.role === 'observer' ? { observerForm: observerFormPage } : {}),
    evaluation: officialEvaluationPage,
    education: officialEducationPage
  };

  const officialPortalPage = (
    <section className="rtbo-official-profile-page rtbo-official-portal-page">
      {officialPortalPages[activeSection] || officialPortalPages.profile}
    </section>
  );

  function renderSettingsWorkflowSelect(label, items, placeholder = 'Select form') {
    return (
      <label className="rtbo-settings-workflow-select" key={label}>
        <span>{label}</span>
        <select
          value=""
          onChange={(event) => {
            const section = event.target.value;
            if (section) openSettingsWorkflow(section);
          }}
        >
          <option value="">{placeholder}</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
    );
  }

  function renderDashboardControlCard(item) {
    const hasSubItems = item.subItems.length > 0;
    const isExpanded = settingsOpenMenus[item.id] ?? false;
    const isHidden = hiddenSections.includes(item.id);
    const visibilityText = isHidden ? 'Hidden from sidebar' : 'Visible in sidebar';

    return (
      <article className="rtbo-settings-widget rtbo-dashboard-control-card" key={item.id}>
        <div className="rtbo-dashboard-control-summary">
          <span>
            <strong>{item.label}</strong>
            <small>{hasSubItems ? 'Sidebar category and sub-items' : 'Sidebar category'}</small>
          </span>
          {hasSubItems ? (
            <button
              className="rtbo-settings-expand"
              type="button"
              onClick={() => toggleSettingsMenu(item.id)}
              aria-expanded={isExpanded}
              aria-controls={`settings-submenu-${item.id}`}
            >
              {isExpanded ? '-' : '+'}
            </button>
          ) : <span className="rtbo-settings-expand ghost" aria-hidden="true" />}
        </div>
        <div className="rtbo-dashboard-control-body">
          <label className="rtbo-settings-workflow-select rtbo-dashboard-control-field">
            <span>Sidebar Visibility</span>
            <span className="rtbo-dashboard-control-toggle">
              <input
                type="checkbox"
                checked={!isHidden}
                onChange={() => toggleDashboardSection(item.id)}
              />
              <span>
                <strong>{isHidden ? 'Hidden' : 'Visible'}</strong>
                <small>{visibilityText}</small>
              </span>
            </span>
          </label>
          {hasSubItems && isExpanded && (
            <div className="rtbo-dashboard-control-subitems" id={`settings-submenu-${item.id}`}>
              <span>Submenu Items</span>
              {item.subItems.map(subItem => {
                const subItemHidden = subItem.parent === 'members'
                  ? hiddenMemberItems.includes(subItem.id)
                  : subItem.parent === 'schedules'
                    ? hiddenScheduleItems.includes(subItem.id)
                    : subItem.parent === 'education'
                      ? hiddenEducationItems.includes(subItem.id)
                      : subItem.parent === 'reports'
                        ? hiddenFormsItems.includes(subItem.id)
                        : subItem.parent === 'payments'
                          ? hiddenPaymentItems.includes(subItem.id)
                          : hiddenOrganizationItems.includes(subItem.id);
                const toggleSubItem = subItem.parent === 'members'
                  ? toggleMemberMenuItem
                  : subItem.parent === 'schedules'
                    ? toggleScheduleMenuItem
                    : subItem.parent === 'education'
                      ? toggleEducationMenuItem
                      : subItem.parent === 'reports'
                        ? toggleFormsMenuItem
                        : subItem.parent === 'payments'
                          ? togglePaymentMenuItem
                          : toggleOrganizationMenuItem;
                return (
                  <label className="rtbo-dashboard-control-toggle child" key={subItem.id}>
                    <input
                      type="checkbox"
                      checked={!subItemHidden}
                      onChange={() => toggleSubItem(subItem.id)}
                    />
                    <span>
                      <strong>{subItem.label}</strong>
                      <small>{subItemHidden ? `Hidden from ${item.label} submenu` : `Visible under ${item.label}`}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </article>
    );
  }

  function renderCollegeClassificationGroup(group) {
    const adminItems = settingsCollegeMemberSections.filter(item => item.group === group.label && item.subGroup === 'Administration');
    const menItems = settingsCollegeMemberSections.filter(item => item.group === group.label && item.subGroup === 'Men');
    const womenItems = settingsCollegeMemberSections.filter(item => item.group === group.label && item.subGroup === 'Women');

    return (
      <details className="rtbo-settings-widget rtbo-settings-classification-widget" key={group.id} open>
        <summary>
          <span>{group.label}</span>
          <small>Administration, Men, Women</small>
        </summary>
        <div className="rtbo-settings-dropdown-grid">
          {renderSettingsWorkflowSelect('Administration', adminItems, 'Select administrator form')}
          {renderSettingsWorkflowSelect('Men', menItems, 'Select men coach form')}
          {renderSettingsWorkflowSelect('Women', womenItems, 'Select women coach form')}
        </div>
      </details>
    );
  }

  function renderCollegeClassificationByLabel(label) {
    const group = collegeClassificationGroups.find(item => item.label === label);
    return group ? renderCollegeClassificationGroup(group) : null;
  }

  const profileBlock = canUseAdminDashboard ? adminProfileBlock : officialPortalPage;

  return (
    <main className="rtbo-dashboard-shell">
      <aside className="rtbo-dashboard-sidebar">
        <a className="rtbo-dashboard-home-link" href="#" onClick={(event) => { event.preventDefault(); onHome(); }} aria-label="Raising The Bar Officiating home">
          <img src={image('logo.png')} alt="RTBO logo" />
        </a>
        <p className="eyebrow">{canUseAdminDashboard ? 'Admin Dashboard' : 'Official Portal'}</p>
        {sections.map(([id, label]) => {
          const sidebarBadgeCount = id === 'rtbomail' || id === 'messages'
            ? rtbomailUnreadCount
            : id === 'notifications'
              ? standardUnreadNotificationCount
              : 0;
          const sectionActive = activeSection === id
            || (id === 'rtbomail' && activeSection === 'messages')
            || (id === 'payments' && activePaymentSubSections.some(item => item.id === activeSection))
            || (id === 'education' && visibleEducationSubSections.some(item => item.id === activeSection))
            || (id === 'reports' && (activeFormsSubSections.some(item => item.id === activeSection) || completedFormsSectionIds.includes(activeSection)));
          return (
          <Fragment key={id}>
            <button className={sectionActive ? 'active' : ''} type="button" data-sidebar-id={id} onClick={() => id === 'members' ? openMembersSection() : id === 'schedules' ? openSchedulesSection() : id === 'organizations' ? openOrganizationsSection() : id === 'education' ? openEducationSection() : id === 'reports' ? openFormsSection() : id === 'payments' ? openPaymentsSection() : showSection(id)}>
              <SidebarIcon id={id} />
              <span className="rtbo-sidebar-button-label">{label}</span>
              {sidebarBadgeCount > 0 && <span className="rtbo-sidebar-count" aria-label={`${sidebarBadgeCount} unread ${id === 'notifications' ? 'notifications' : 'messages'}`}>{sidebarBadgeCount > 99 ? '99+' : sidebarBadgeCount}</span>}
            </button>
            {id === 'payments' && canUseAdminDashboard && paymentsMenuOpen && activePaymentSubSections.length > 0 && (
              <div className="rtbo-sidebar-submenu open" aria-label="Payments submenu">
                {activePaymentSubSections.map(item => (
                  <button
                    className={activeSection === item.id ? 'active' : ''}
                    type="button"
                    key={`${item.source || 'payments'}-${item.id}`}
                    onClick={() => openPaymentSubSection(item.id)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
            {id === 'schedules' && canUseAdminDashboard && schedulesMenuOpen && (
              <div className="rtbo-sidebar-submenu open" aria-label="Schedule setup submenu">
                {visibleScheduleSetupSections.map(item => (
                  <button
                    className={activeSection === item.id ? 'active' : ''}
                    type="button"
                    key={item.id}
                    onClick={() => openScheduleSetupSection(item.id)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
            {id === 'organizations' && canUseAdminDashboard && organizationsMenuOpen && visibleOrganizationSections.length > 0 && (
              <div className="rtbo-sidebar-submenu open" aria-label="Organizations submenu">
                {visibleOrganizationSections.map(item => (
                  <button
                    className={activeSection === item.target ? 'active' : ''}
                    type="button"
                    key={item.id}
                    onClick={() => openOrganizationSubItem(item)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
            {id === 'reports' && (formsMenuOpen || !canUseAdminDashboard) && activeFormsSubSections.length > 0 && (
              <div className="rtbo-sidebar-submenu open" aria-label="Forms submenu">
                {activeFormsSubSections.map(item => (
                  <button
                    className={activeSection === item.id ? 'active' : ''}
                    type="button"
                    key={`${item.source || 'forms'}-${item.id}`}
                    onClick={() => openFormsSubSection(item.id)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
            {id === 'education' && canUseAdminDashboard && educationMenuOpen && visibleEducationSubSections.length > 0 && (
              <div className="rtbo-sidebar-submenu open" aria-label="Education submenu">
                {visibleEducationSubSections.map(item => (
                  <button
                    className={activeSection === item.id ? 'active' : ''}
                    type="button"
                    key={item.id}
                    onClick={() => openEducationSubSection(item.id)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </Fragment>
          );
        })}
        {canUseAdminDashboard && (
          <Fragment>
            <button className={activeSection === 'settings' || activeSection === 'dashboardControls' || settingsWorkflowById.has(activeSection) ? 'active' : ''} type="button" data-sidebar-id="settings" onClick={openSettingsSection}>
              <SidebarIcon id="settings" />
              <span className="rtbo-sidebar-button-label">Settings</span>
            </button>
            {settingsMenuOpen && (
              <div className="rtbo-sidebar-submenu open" aria-label="Settings submenu">
                <button
                  className={activeSection === 'dashboardControls' ? 'active' : ''}
                  type="button"
                  onClick={openDashboardControls}
                >
                  Dashboard Controls
                </button>
              </div>
            )}
          </Fragment>
        )}
        <div className="rtbo-sidebar-help-card">
          <span className="rtbo-sidebar-help-icon" aria-hidden="true">?</span>
          <div>
            <strong>Need Help?</strong>
            <p>Visit our Help Center for step-by-step guides.</p>
          </div>
          <button
            className="rtbo-sidebar-help-action"
            type="button"
            onClick={() => {
              if (canUseAdminDashboard) {
                openSettingsSection();
              } else {
                showSection('profile');
              }
              setStatus('Help Center guidance opened.');
            }}
          >
            View Help Center
          </button>
        </div>
        <button className="btn secondary dark-btn" type="button" onClick={onLogout}>Logout</button>
      </aside>
      <section className="rtbo-dashboard-main">
        <div className="rtbo-dashboard-topbar">
          <div><p className="eyebrow">Raising The Bar Officiating</p><h1>{canUseAdminDashboard ? 'Super Admin Command Center' : 'Official Portal'}</h1><span>{user.name} / {formatLabel(user.role)}</span></div>
          <div className="button-row rtbo-dashboard-actions">
            {canUseAdminDashboard && activeSection !== 'overview' && <button className="btn secondary dark-btn rtbo-back-overview-button" type="button" onClick={() => showSection('overview')}>Back to Overview</button>}
            {canUseAdminDashboard && <button className="btn" type="button" onClick={runDashboardTest}>Run Dashboard Test</button>}
            {activeSection !== 'profile' && <button className="btn secondary dark-btn" type="button" onClick={() => showSection('profile')}>My Profile</button>}
            <ThemeToggle className="dashboard-theme-toggle" />
          </div>
        </div>
        {status && <p className="rtbo-dashboard-status">{status}</p>}

        {activeSection === 'overview' && (
          <section className="rtbo-dashboard-grid">
            {[
              ['Registrations', records.registrations.length, 'Applications in queue'],
              ['Reviews', records.reviews.length, 'Attendee reviews pending'],
              ['Unaccepted Games', overviewData.counts?.unaccepted_assignments || 0, 'Officials still need to respond'],
              ['Today’s Games', overviewData.counts?.todays_games || 0, 'Games scheduled today'],
              ['Live Tracking', overviewData.counts?.tracked_officials || 0, 'Officials sharing live location']
            ].map(([title, value, detail]) => <article className="rtbo-dashboard-card" key={title}><span>{title}</span><strong>{value}</strong><p>{detail}</p></article>)}
            <article className="rtbo-dashboard-card quick-actions">
              <h3>Quick Actions</h3>
              <div className="quick-actions-row">
                <button className="btn" type="button" onClick={() => openMembersSection()}>Open Members</button>
                <button className="btn" type="button" onClick={() => openScheduleSetupSection('createGameAssignment')}>Create Game</button>
                <button className="btn" type="button" onClick={() => openScheduleSetupSection('liveMap')}>Open Live Map</button>
                <button className="btn" type="button" onClick={() => exportCsv('rtbo-overview-report', [['Section', 'Count'], ['Registrations', records.registrations.length], ['Payments', records.payments.length]])}>Generate Report</button>
              </div>
            </article>
            <div className="rtbo-overview-widgets">
              <OverviewGeoWidget geo={overviewData.geo} onOpenLiveMap={() => openScheduleSetupSection('liveMap')} />
              <OverviewAlertsWidget overview={overviewData} />
              <NotificationCenter
                notifications={activeNotifications}
                unreadCount={notificationUnreadCount}
                onMarkRead={markNotificationRead}
                onMarkAllRead={markAllNotificationsRead}
                canReleaseMessages={canUseAdminDashboard}
                releaseMessage={releaseMessage}
                releaseMessageStatus={releaseMessageStatus}
                onReleaseMessageChange={updateReleaseMessage}
                onReleaseMessageSubmit={submitReleaseMessage}
              />
            </div>
          </section>
        )}

        {activeSection === 'members' && <MemberDirectory onStatus={setStatus} />}

        {activeSection === 'schedules' && <SchedulesOverview onStatus={setStatus} onOpenSection={openScheduleSetupSection} onOpenMembers={openMembersSection} />}

        {canUseAdminDashboard && activeSection === 'rtbomail' && (
          <RTBOMailClient
            user={user}
            messages={rtbomailMessages}
            unreadCount={rtbomailUnreadCount}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markMessageNotificationsRead}
            onSendMessage={sendRtbomailMessage}
            canManageAdminUsers={isSuperAdminUser(user)}
          />
        )}

        {canUseAdminDashboard && activeSection === 'newsletterCenter' && (
          <React.Suspense fallback={<section className="rtbo-dashboard-card rtbo-focused-page-card"><p className="rtbo-empty-state">Loading Newsletter Center...</p></section>}>
            <RTBONewsletterCenter onStatus={setStatus} />
          </React.Suspense>
        )}

        {canUseAdminDashboard && activeSection === 'refroom' && refRoomPage}

        {canUseAdminDashboard && activeSection === 'notifications' && (
          <NotificationCenter
            notifications={activeStandardNotifications}
            unreadCount={standardUnreadNotificationCount}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markStandardNotificationsRead}
            title="Notifications"
            description="Dashboard alerts, assignment activity, profile updates, evaluations, and system notices stay here until they are read or marked as read."
            canReleaseMessages={canUseAdminDashboard}
            releaseMessage={releaseMessage}
            releaseMessageStatus={releaseMessageStatus}
            onReleaseMessageChange={updateReleaseMessage}
            onReleaseMessageSubmit={submitReleaseMessage}
          />
        )}

        {activeSection === 'liveMap' && <LiveGeoTracker onStatus={setStatus} />}

        {addMemberSections.map(item => (
          activeSection === item.id && (
            <AddMemberForm key={item.id} role={item.role} title={item.title} onStatus={setStatus} />
          )
        ))}

        {settingsMemberWorkflowSections.map(item => (
          activeSection === item.id && (
            <AddMemberForm
              key={item.id}
              role={item.role}
              title={item.title}
              memberTitle={item.memberTitle || ''}
              lockMemberTitle={Boolean(item.lockMemberTitle)}
              workflowGroup={item.group || 'Settings'}
              onStatus={setStatus}
            />
          )
        ))}

        {settingsScheduleWorkflowSections.map(item => (
          activeSection === item.id && (
            item.type === 'team'
              ? <AddTeamForm key={item.id} title={item.title} teamNamePlaceholder={item.teamNamePlaceholder} workflowGroup={item.group || 'Settings'} onStatus={setStatus} />
              : <AddVenueForm key={item.id} recordType={item.type} title={item.title} workflowGroup={item.group || 'Settings'} onStatus={setStatus} />
          )
        ))}

        {scheduleSetupSections.filter(item => item.type !== 'map').map(item => (
          activeSection === item.id && (
            item.type === 'gameForm'
              ? <GameAssignmentForm key={item.id} mode="create" onStatus={setStatus} />
              : item.type === 'masterSchedule'
              ? <MasterSchedulePage key={item.id} onStatus={setStatus} onOpenCreate={() => openScheduleSetupSection('createGameAssignment')} />
              : item.type === 'team'
              ? <AddTeamForm key={item.id} title={item.title} onStatus={setStatus} />
              : <AddVenueForm key={item.id} recordType={item.type} title={item.title} onStatus={setStatus} />
          )
        ))}

        {activeSection === 'organizations' && <OrganizationClassifications onStatus={setStatus} />}

        {canUseAdminDashboard && activeSection === 'education' && (
          <React.Suspense fallback={null}>
            <EducationLanding
              canUseAdminDashboard={canUseAdminDashboard}
              onOpenAcademy={() => openEducationSubSection('rtboAcademy')}
              onOpenTests={() => openEducationSubSection('tests')}
            />
          </React.Suspense>
        )}

        {canUseAdminDashboard && ['registrations', 'contacts', 'reviews'].includes(activeSection) && (
          <CrudPanel
            title={sectionLabels.get(activeSection)}
            description={activeSection === 'reviews' ? 'Review attendee school and RefZone University submissions loaded from production storage.' : 'Review server-loaded records and use local planning actions for launch testing.'}
            fields={configs[activeSection]}
            records={records[activeSection]}
            onAdd={(record) => addRecord(activeSection, record)}
            onUpdate={(index, record) => updateRecord(activeSection, index, record)}
            onDelete={(index) => deleteRecord(activeSection, index)}
            readOnly={activeSection === 'reviews'}
          />
        )}

        {canUseAdminDashboard && activeSection === 'payments' && (
          <PaymentSystem user={user} onStatus={setStatus} />
        )}

        {canUseAdminDashboard && activeSection === 'shopInventory' && (
          <React.Suspense fallback={<section className="rtbo-dashboard-card rtbo-focused-page-card"><p className="rtbo-empty-state">Loading shop inventory...</p></section>}>
            <ShopInventoryManager onStatus={setStatus} />
          </React.Suspense>
        )}

        {canUseAdminDashboard && activeSection === 'siteContent' && (
          <React.Suspense fallback={<section className="rtbo-dashboard-card rtbo-focused-page-card"><p className="rtbo-empty-state">Loading Website Manager...</p></section>}>
            <SiteContentManager onStatus={setStatus} />
          </React.Suspense>
        )}

        {canUseTaxCenter && activeSection === 'taxCenter' && (
          <React.Suspense fallback={<section className="rtbo-dashboard-card rtbo-focused-page-card"><p className="rtbo-empty-state">Loading Tax Center...</p></section>}>
            <TaxCenter user={user} canManageTaxForms={canUseAdminDashboard} onStatus={setStatus} />
          </React.Suspense>
        )}

        {activeSection === 'rtboAcademy' && (
          <React.Suspense fallback={null}>
            <RTBOAcademy user={user} onStatus={setStatus} />
          </React.Suspense>
        )}

        {canUseAdminDashboard && activeSection === 'reports' && (
          <FormsWorkspaceHome
            completedForms={completedForms}
            loading={completedFormsLoading}
            error={completedFormsError}
            onOpen={openCompletedFormsSection}
            onRefresh={loadCompletedForms}
          />
        )}

        {canUseAdminDashboard && activeSection === 'completedOfficialForms' && (
          <CompletedFormsView
            type="officials"
            eyebrow="Officials"
            title="Completed Official Game Reports"
            description="Game reports submitted by officials are listed here for Super Admin review."
            records={completedForms.officials}
            loading={completedFormsLoading}
            error={completedFormsError}
            onBack={backToFormsWorkspace}
            onRefresh={loadCompletedForms}
          />
        )}

        {canUseAdminDashboard && activeSection === 'completedEvaluatorForms' && (
          <CompletedFormsView
            type="evaluators"
            eyebrow="Evaluators"
            title="Completed Evaluator Evaluations"
            description="Evaluation forms submitted by evaluators are listed here for Super Admin review."
            records={completedForms.evaluators}
            loading={completedFormsLoading}
            error={completedFormsError}
            onBack={backToFormsWorkspace}
            onRefresh={loadCompletedForms}
          />
        )}

        {canUseAdminDashboard && activeSection === 'completedObserverForms' && (
          <CompletedFormsView
            type="observers"
            eyebrow="Observers"
            title="Completed Observer Forms"
            description="Observer form submissions are listed here for Super Admin review."
            records={completedForms.observers}
            loading={completedFormsLoading}
            error={completedFormsError}
            onBack={backToFormsWorkspace}
            onRefresh={loadCompletedForms}
          />
        )}

        {canUseAdminDashboard && activeSection === 'profile' && profileBlock}
        {!canUseAdminDashboard && activeSection !== 'rtboAcademy' && activeSection !== 'taxCenter' && profileBlock}

        {activeSection === 'tests' && (
          <React.Suspense fallback={null}>
            <TestCenterPage
              onOpenAcademy={() => openEducationSubSection('rtboAcademy')}
            />
          </React.Suspense>
        )}

        {activeSection === 'evaluationForm' && <AdvancedOfficialsEvaluationForm user={user} />}

        {canUseAdminDashboard && activeSection === 'contractGenerator' && (
          <React.Suspense fallback={<section className="rtbo-dashboard-card rtbo-focused-page-card"><p className="rtbo-empty-state">Loading contract generator...</p></section>}>
            <RTBOBasketballAssigningContractGenerator user={user} onStatus={setStatus} />
          </React.Suspense>
        )}

        {canUseAdminDashboard && activeSection === 'postgame' && officialPostgamePage}

        {canUseAdminDashboard && activeSection === 'observerForm' && observerFormPage}

        {canUseAdminDashboard && activeSection === 'invoiceCreator' && (
          isSuperAdminUser(user)
            ? <AdminInvoiceCreator user={user} onStatus={setStatus} />
            : (
              <section className="rtbo-dashboard-card rtbo-focused-page-card">
                <div className="rtbo-dashboard-card-head">
                  <div>
                    <p className="eyebrow">Super Admin Form</p>
                    <h3>Invoice Creator</h3>
                    <p>The Invoice Creator is available to the Super Admin for billing and printable invoice management.</p>
                  </div>
                </div>
                <p className="rtbo-empty-state">Use a Super Admin account to create and manage invoices.</p>
              </section>
            )
        )}

        {activeSection === 'settings' && (
          <section className="rtbo-dashboard-card rtbo-settings-page rtbo-settings-workspace-page">
            <div className="rtbo-dashboard-card-head">
              <div>
                <p className="eyebrow">Settings Workspace</p>
                <h3>Settings</h3>
                <p>Create officials, member roles, schools, teams, and event centers from the Settings workspace. Saved members, schools, teams, and event centers can be edited or removed from the Members Directory.</p>
              </div>
              <div className="rtbo-form-toolbar">
                <button className="btn secondary dark-btn" type="button" onClick={openDashboardControls}>Dashboard Controls</button>
              </div>
            </div>

            <div className="rtbo-settings-workspace-grid" aria-label="Settings creation workspace">
              <div className="rtbo-settings-workspace-column">
                <details className="rtbo-settings-widget" open>
                  <summary>
                    <span>Officials</span>
                    <small>Add official accounts</small>
                  </summary>
                  <div className="rtbo-settings-dropdown-grid">
                    {renderSettingsWorkflowSelect('Official Forms', settingsOfficialsSections, 'Select official form')}
                  </div>
                </details>
                {renderCollegeClassificationByLabel('NCAA DIII')}
                <details className="rtbo-settings-widget rtbo-settings-classification-widget" open>
                  <summary>
                    <span>High School</span>
                    <small>Members and teams</small>
                  </summary>
                  <div className="rtbo-settings-dropdown-grid">
                    {renderSettingsWorkflowSelect('Member Forms', settingsHighSchoolMemberSections, 'Select member form')}
                    {renderSettingsWorkflowSelect('Team Forms', settingsHighSchoolTeamSections, 'Select team form')}
                  </div>
                </details>
              </div>

              <div className="rtbo-settings-workspace-column">
                {renderCollegeClassificationByLabel('NCAA DI')}
                {renderCollegeClassificationByLabel('NAIA')}
                <details className="rtbo-settings-widget" open>
                  <summary>
                    <span>School Form</span>
                    <small>Add school and team records</small>
                  </summary>
                  <div className="rtbo-settings-dropdown-grid">
                    {renderSettingsWorkflowSelect('School Forms', settingsSchoolFormSections, 'Select school form')}
                  </div>
                </details>
              </div>

              <div className="rtbo-settings-workspace-column">
                {renderCollegeClassificationByLabel('NCAA DII')}
                {renderCollegeClassificationByLabel('NJCAA')}
                <details className="rtbo-settings-widget" open>
                  <summary>
                    <span>Event Center</span>
                    <small>Add event center records</small>
                  </summary>
                  <div className="rtbo-settings-dropdown-grid">
                    {renderSettingsWorkflowSelect('Event Center Forms', settingsEventCenterSections, 'Select event center form')}
                  </div>
                </details>
              </div>
            </div>

          </section>
        )}

        {activeSection === 'dashboardControls' && (
          <section className="rtbo-dashboard-card rtbo-settings-page rtbo-dashboard-controls-page">
            <div className="rtbo-dashboard-card-head">
              <div>
                <p className="eyebrow">Settings Submenu</p>
                <h3>Dashboard Controls</h3>
                <p>Remove or restore sidebar categories and the submenu items that belong under each category without deleting the data behind them.</p>
              </div>
              <div className="rtbo-form-toolbar">
                <button className="btn secondary dark-btn" type="button" onClick={restoreDashboardSections}>Restore All</button>
              </div>
            </div>
            <section className="rtbo-settings-readiness-panel" aria-label="Dashboard readiness checks">
              <div className="rtbo-dashboard-card-head">
                <div>
                  <p className="eyebrow">Launch Readiness</p>
                  <h3>Dashboard Readiness Checks</h3>
                  <p>Review dashboard checks from Dashboard Controls and open the exact area that needs attention.</p>
                </div>
                <div className="rtbo-form-toolbar">
                  <button className="btn secondary dark-btn" type="button" onClick={runDashboardTest}>Run Dashboard Test</button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => exportCsv('rtbo-launch-readiness', [
                    ['Check', 'Status', 'Detail'],
                    ...dashboardReadinessChecks.map(check => [check.label, check.status, check.detail])
                  ])}>Export CSV</button>
                </div>
              </div>
              <div className="rtbo-settings-readiness-summary">
                <article><span>Passed</span><strong>{dashboardReadinessSummary.passed}</strong></article>
                <article><span>Ready</span><strong>{dashboardReadinessSummary.ready}</strong></article>
                <article><span>Review</span><strong>{dashboardReadinessSummary.review}</strong></article>
              </div>
              <div className="rtbo-settings-readiness-grid">
                {dashboardReadinessChecks.map(result => (
                  <article className={`rtbo-settings-readiness-card status-${String(result.status || 'ready').toLowerCase().replace(/\s+/g, '-')}`} key={result.label}>
                    <div className="rtbo-settings-readiness-card-head">
                      <span>{result.group || 'Dashboard'}</span>
                      <b>{result.status}</b>
                    </div>
                    <strong>{result.label}</strong>
                    <small>{result.detail}</small>
                    {result.actionSection && (
                      <button className="btn secondary dark-btn" type="button" onClick={() => openReadinessTarget(result.actionSection)}>
                        Open {result.actionLabel || sectionLabels.get(result.actionSection) || 'Section'}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
            <div className="rtbo-settings-workspace-grid rtbo-dashboard-controls-grid" aria-label="Dashboard menu settings">
              {dashboardControlColumns.map((column, index) => (
                <div className="rtbo-settings-workspace-column" key={`dashboard-controls-column-${index}`}>
                  {column.map(renderDashboardControlCard)}
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
      <OfficialProfileModal profile={officialProfileModal} onClose={() => setOfficialProfileModal(null)} />
    </main>
  );
}

function Footer({ setActive, navLinks = navItems }) {
  return <footer className="site-footer rtbo-footer original-footer"><div className="footer-inner"><div className="footer-container grid"><div className="footer-brand"><img className="footer-logo" src={image('logo.png')} alt="RTBO logo" /><p className="footer-desc">We Will Serve, And Will Be Of Service To The Game!</p></div><div><p className="footer-title">Navigation</p><ul className="footer-links grid">{navLinks.map(([id, label]) => <li key={id}><button className="footer-link" type="button" onClick={() => setActive(id)}>{label}</button></li>)}</ul></div><div><p className="footer-title">School & Events</p><ul className="footer-timings grid"><li className="footer-timing"><span>UAPB :</span> June 9-10, 2026</li><li className="footer-ruler"></li><li className="footer-timing"><span>UCA :</span> June 19, 2026</li><li className="footer-ruler"></li><li className="footer-timing"><span>UALR :</span> July 21-22, 2026</li></ul></div></div><div className="footer-bottom"><p className="footer-copy">&copy; 2026 <span>Raising The Bar Officiating Inc.</span> All rights reserved.</p><a href="#top" className="scroll-up"><span className="scroll-up-icon">↑</span> Back To Top</a></div></div></footer>;
}

function StandaloneLivestreamStudio() {
  const [studioSceneId, setStudioSceneId] = useState('court');
  const [previewSceneId, setPreviewSceneId] = useState('breakdown');
  const [activeOverlayIds, setActiveOverlayIds] = useState([]);
  const [destinationIds, setDestinationIds] = useState(livestreamDestinations.map(([id]) => id));
  const [activeSourceIds, setActiveSourceIds] = useState(livestreamStudioSources.map(([id]) => id));
  const [sourceLevels, setSourceLevels] = useState(() => Object.fromEntries(livestreamStudioSources.map(([id, , , level]) => [id, level])));
  const [lowerThird, setLowerThird] = useState({ name: '', title: '' });
  const [spotlightComment, setSpotlightComment] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(5 * 60);
  const [studioMode, setStudioMode] = useState('Standby');
  const [recording, setRecording] = useState(false);
  const [transitionName, setTransitionName] = useState('Live Motion');
  const [markerCount, setMarkerCount] = useState(0);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const activeScene = livestreamScenes.find(scene => scene.id === studioSceneId) || livestreamScenes[1];
  const previewScene = livestreamScenes.find(scene => scene.id === previewSceneId) || livestreamScenes[2];
  const studio = {
    activeScene,
    previewScene,
    activeOverlayIds,
    destinationIds,
    activeSourceIds,
    sourceLevels,
    lowerThird,
    spotlightComment,
    countdownSeconds,
    studioMode,
    recording,
    transitionName,
    markerCount,
    snapshotCount
  };

  useEffect(() => {
    document.title = 'RTBO Live Studio';
  }, []);

  useEffect(() => {
    if (studioMode !== 'Live' || !activeOverlayIds.includes('countdown')) return undefined;
    const timer = window.setInterval(() => {
      setCountdownSeconds(currentSeconds => Math.max(0, currentSeconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [studioMode, activeOverlayIds]);

  function toggleOverlay(id, forcedState) {
    setActiveOverlayIds(currentIds => {
      const shouldEnable = typeof forcedState === 'boolean' ? forcedState : !currentIds.includes(id);
      if (shouldEnable) return currentIds.includes(id) ? currentIds : [...currentIds, id];
      return currentIds.filter(currentId => currentId !== id);
    });
  }

  const studioActions = {
    setPreviewSceneId,
    setTransitionName,
    setLowerThird,
    setCountdownSeconds,
    toggleOverlay,
    toggleDestination: (id) => setDestinationIds(currentIds => (
      currentIds.includes(id) ? currentIds.filter(currentId => currentId !== id) : [...currentIds, id]
    )),
    toggleSource: (id) => setActiveSourceIds(currentIds => (
      currentIds.includes(id) ? currentIds.filter(currentId => currentId !== id) : [...currentIds, id]
    )),
    setSourceLevel: (id, level) => setSourceLevels(currentLevels => ({
      ...currentLevels,
      [id]: Math.max(0, Math.min(100, level))
    })),
    spotlightComment: (comment) => {
      setSpotlightComment(comment);
      toggleOverlay('comment', true);
    },
    resetOverlays: () => setActiveOverlayIds([]),
    takePreview: () => setStudioSceneId(previewSceneId),
    toggleLive: () => setStudioMode(currentMode => (currentMode === 'Live' ? 'Standby' : 'Live')),
    toggleRecording: () => setRecording(current => !current),
    addMarker: () => setMarkerCount(current => current + 1),
    captureSnapshot: () => setSnapshotCount(current => current + 1)
  };

  return (
    <section className="rtbo-section livestream-page livestream-studio-window-page">
      <LivestreamStudio
        studio={studio}
        actions={studioActions}
        onClose={() => {
          if (window.opener) {
            window.close();
            return;
          }
          window.location.href = `${window.location.origin}${window.location.pathname}#livestream`;
        }}
      />
    </section>
  );
}

function App() {
  const studioWindowMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('studio') === '1';
  if (studioWindowMode) {
    return <main className="rtbo-public rtbo-studio-window"><StandaloneLivestreamStudio /></main>;
  }

  const [siteContentRecords, setSiteContentRecords] = useState(readStoredSiteContentRecords);
  const managedNavItems = useMemo(() => activePublicManagedPages(siteContentRecords).filter(([id]) => !validPages.has(id)), [siteContentRecords]);
  const managedPageIds = useMemo(() => new Set(managedNavItems.map(([id]) => id)), [managedNavItems]);
  const publicNavItems = useMemo(() => [...navItems, ...managedNavItems], [managedNavItems]);

  const readCurrentRoute = () => routeFromHash(window.location.hash);
  const readRoute = () => {
    const route = readCurrentRoute();
    const page = pageFromRoute(route);
    return validPages.has(page) || managedPageIds.has(page) ? page : 'home';
  };
  const [currentRoute, setCurrentRoute] = useState(readCurrentRoute);
  const [active, setActive] = useState(readRoute);
  const activeManagedPage = useMemo(
    () => siteContentRecords.find(record => record.kind === 'page' && record.status === 'active' && record.page === active) || null,
    [active, siteContentRecords]
  );
  const [authUser, setAuthUser] = useState(readStoredAuthUser);
  const [refZoneAccess, setRefZoneAccess] = useState(emptyRefZoneAccess);
  const [passwordResetToken, setPasswordResetToken] = useState(readPasswordResetToken);
  const [accountModal, setAccountModal] = useState(() => readPasswordResetToken() ? 'reset' : null);
  const [postLoginTarget, setPostLoginTarget] = useState(null);
  const [dashboardOpen, setDashboardOpen] = useState(readStoredDashboardOpen);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (activeManagedPage) {
      updateManagedPageSeo(activeManagedPage);
      return;
    }
    updatePageSeo(active);
  }, [active, activeManagedPage]);

  useEffect(() => {
    let isActive = true;
    async function refreshSiteContent(event) {
      try {
        const eventRecords = Array.isArray(event?.detail?.records) ? normalizePublicSiteContentRecords(event.detail.records) : null;
        const nextRecords = eventRecords || await fetchSiteContentRecords();
        if (isActive) setSiteContentRecords(nextRecords);
      } catch {
        if (isActive) setSiteContentRecords(readStoredSiteContentRecords());
      }
    }

    function syncStoredSiteContent(event) {
      if (event.key !== SITE_CONTENT_KEY) return;
      setSiteContentRecords(readStoredSiteContentRecords());
    }

    refreshSiteContent();
    window.addEventListener(SITE_CONTENT_UPDATED_EVENT, refreshSiteContent);
    window.addEventListener('storage', syncStoredSiteContent);
    return () => {
      isActive = false;
      window.removeEventListener(SITE_CONTENT_UPDATED_EVENT, refreshSiteContent);
      window.removeEventListener('storage', syncStoredSiteContent);
    };
  }, []);

  useEffect(() => {
    const routePage = pageFromRoute(routeFromHash(window.location.hash));
    if (managedPageIds.has(routePage) && active !== routePage) {
      setActive(routePage);
    }
  }, [active, managedPageIds]);

  useEffect(() => {
    if (authUser && dashboardOpen) {
      localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'true');
    } else {
      localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'false');
    }
  }, [authUser, dashboardOpen]);

  useEffect(() => {
    let isActive = true;
    if (!authUser) {
      setRefZoneAccess(emptyRefZoneAccess);
      return () => {
        isActive = false;
      };
    }

    setRefZoneAccess(current => ({ ...current, loading: true, message: '' }));
    apiGet('/refzone-access.php')
      .then(data => {
        if (!isActive) return;
        setRefZoneAccess({
          loading: false,
          courseIds: Array.isArray(data.course_ids) ? data.course_ids : [],
          enrollments: Array.isArray(data.enrollments) ? data.enrollments : [],
          message: ''
        });
      })
      .catch(error => {
        if (!isActive) return;
        setRefZoneAccess({
          loading: false,
          courseIds: [],
          enrollments: [],
          message: error.message || 'RefZone University access could not be verified.'
        });
      });

    return () => {
      isActive = false;
    };
  }, [authUser]);

  useEffect(() => {
    const onRouteChange = () => {
      const nextRoute = readCurrentRoute();
      setCurrentRoute(nextRoute);
      if (window.location.hash.startsWith('#dashboard')) {
        const storedUser = readStoredAuthUser();
        if (storedUser) {
          setAuthUser(storedUser);
          setDashboardOpen(true);
          localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'true');
          return;
        }
      }
      setDashboardOpen(false);
      setActive(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onRouteChange);
    return () => window.removeEventListener('hashchange', onRouteChange);
  }, [managedPageIds]);

  function goTo(page) {
    const next = validPages.has(page) || managedPageIds.has(page) ? page : 'home';
    const nextRoute = next === 'home' ? '' : next;
    setDashboardOpen(false);
    localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'false');
    setActive(next);
    setCurrentRoute(nextRoute);
    const nextHash = next === 'home' ? '#' : `#${next}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      window.scrollTo(0, 0);
    }
  }

  function openDashboard() {
    if (!authUser) {
      openLogin();
      return;
    }

    localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'true');
    setDashboardOpen(true);
    if (!isDashboardRouteHash(window.location.hash)) {
      const savedSection = localStorage.getItem(dashboardSectionStorageKey(authUser)) || '';
      const nextSection = savedSection ? `/${encodeURIComponent(savedSection)}` : '';
      window.location.hash = `#dashboard${nextSection}`;
    }
  }

  function clearPasswordResetToken() {
    if (!passwordResetToken) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('reset_token');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    setPasswordResetToken('');
  }

  function closeAccountModal() {
    if (accountModal === 'reset') {
      clearPasswordResetToken();
    }
    setAccountModal(null);
  }

  function login(user) {
    localStorage.setItem(RTBO_AUTH_KEY, JSON.stringify(user));
    setAuthUser(user);
    setAccountModal(null);
    if (isSuperAdminUser(user)) {
      setPostLoginTarget(null);
      localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'true');
      setDashboardOpen(true);
      const savedSection = localStorage.getItem(dashboardSectionStorageKey(user)) || '';
      const nextSection = savedSection ? `/${encodeURIComponent(savedSection)}` : '';
      window.location.hash = `#dashboard${nextSection}`;
      return;
    }
    if (postLoginTarget === 'register') {
      goTo('register');
      setDashboardOpen(false);
    } else if (postLoginTarget === 'education') {
      localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'false');
      setDashboardOpen(false);
      setActive('education');
      if (!routeFromHash(window.location.hash).startsWith('education')) {
        window.location.hash = '#education';
        setCurrentRoute('education');
      }
      requestAnimationFrame(() => {
        const currentEducationRoute = routeFromHash(window.location.hash);
        const target = currentEducationRoute.startsWith('education/course/')
          ? document.querySelector('.rtbo-academy-page')
          : document.getElementById('refzone-university-enrollment');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      localStorage.setItem(RTBO_DASHBOARD_OPEN_KEY, 'true');
      setDashboardOpen(true);
      const savedSection = localStorage.getItem(dashboardSectionStorageKey(user)) || '';
      const nextSection = savedSection ? `/${encodeURIComponent(savedSection)}` : '';
      window.location.hash = `#dashboard${nextSection}`;
    }
    setPostLoginTarget(null);
  }

  function openLogin() {
    setPostLoginTarget(null);
    setAccountModal('login');
  }

  function openRegister() {
    if (authUser) {
      goTo('register');
      setDashboardOpen(false);
      return;
    }
    setPostLoginTarget('register');
    setAccountModal('signup');
  }

  function openRegisterSignIn() {
    setPostLoginTarget('register');
    setAccountModal('login');
  }

  function openRefZoneCreateAccount() {
    if (authUser) {
      scrollToRefZoneEnrollment();
      return;
    }
    setPostLoginTarget('education');
    setAccountModal('signup');
  }

  function openRefZoneSignIn() {
    setPostLoginTarget('education');
    setAccountModal('login');
  }

  function scrollToRefZoneEnrollment() {
    setActive('education');
    setDashboardOpen(false);
    if (!routeFromHash(window.location.hash).startsWith('education')) {
      window.location.hash = '#education';
      setCurrentRoute('education');
    }
    requestAnimationFrame(() => {
      document.getElementById('refzone-university-enrollment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function logout() {
    try {
      await apiPostJson('/auth-logout.php', {});
    } catch {
      // Clear local dashboard state even if the network request fails.
    }
    localStorage.removeItem(RTBO_AUTH_KEY);
    localStorage.removeItem(RTBO_DASHBOARD_OPEN_KEY);
    setAuthUser(null);
    setDashboardOpen(false);
    goTo('home');
  }

  const managedSections = page => (
    <React.Suspense fallback={null}>
      <ManagedSiteContent page={page} records={siteContentRecords} />
    </React.Suspense>
  );

  const content = useMemo(() => {
    if (active === 'home') return <><Home setActive={goTo} onOpenRegister={openRegister} />{managedSections('home')}</>;
    if (active === 'about') return <><PageHero page="about" eyebrow="About RTBO" title="Raising The Standard">Built on service, training, mentorship, and professional development for basketball officials.</PageHero><AboutSummary /><Director /><AboutDifference /><GotUNexRefSection />{managedSections('about')}</>;
    if (active === 'events') return <><EventsSummary onOpenRegister={openRegister} />{managedSections('events')}</>;
    if (active === 'livestream') return <><PageHero page="livestream" eyebrow="Live Training Broadcasts" title="RTBO Livestream">Watch training school coverage, court mechanics, film breakdowns, guest instruction, and promotional moments from one broadcast hub.</PageHero><Livestream />{managedSections('livestream')}</>;
    if (active === 'refroom') {
      return (
        <>
          <PageHero page="refroom" eyebrow="RefRoom" title="RefRoom Video Player">Watch the public RefRoom program feed for officiating meetings, film study, training sessions, and live production broadcasts.</PageHero>
          <RefRoomLivestreamPlayer />
          <React.Suspense fallback={<section className="rtbo-section"><p className="rtbo-empty-state">Loading RefRoom player...</p></section>}>
            <RefRoom user={authUser || { name: 'Guest Viewer', role: 'viewer' }} mode="player" meetingToolsOnly />
          </React.Suspense>
          {managedSections('refroom')}
        </>
      );
    }
    if (active === 'services') return <><PageHero page="services" eyebrow="Services" title="Complete Officiating Solutions">Event assigning, development, mentorship, evaluations, and leadership standards for the game.</PageHero><Services />{managedSections('services')}</>;
    if (active === 'education') {
      const educationCourseId = currentRoute.startsWith('education/course/')
        ? decodeURIComponent(currentRoute.split('/')[2] || '')
        : '';
      const accessibleCourseIds = Array.isArray(refZoneAccess.courseIds) ? refZoneAccess.courseIds : [];
      const requestedCourseAllowed = educationCourseId === '' || accessibleCourseIds.includes(educationCourseId);
      const academyInitialCourseId = requestedCourseAllowed ? (educationCourseId || accessibleCourseIds[0] || '') : '';
      const hasCourseAccess = accessibleCourseIds.length > 0 && requestedCourseAllowed;
      return (
        <>
          <RefZoneUniversityLanding user={authUser} onCreateAccount={openRefZoneCreateAccount} onSignIn={openRefZoneSignIn} />
          {authUser && refZoneAccess.loading ? (
            <RefZoneMembershipGate courseId={educationCourseId} loading onEnroll={scrollToRefZoneEnrollment} />
          ) : authUser && hasCourseAccess ? (
            <React.Suspense fallback={<section className="rtbo-section"><p className="rtbo-empty-state">Loading RTBO Education...</p></section>}>
              <RTBOAcademy user={authUser} publicMode brandName="RefZone University" initialTrackId={academyInitialCourseId} />
            </React.Suspense>
          ) : authUser ? (
            <RefZoneMembershipGate courseId={educationCourseId || accessibleCourseIds[0] || ''} onEnroll={scrollToRefZoneEnrollment} />
          ) : (
            <RefZoneCourseAccessGate courseId={educationCourseId} onCreateAccount={openRefZoneCreateAccount} onSignIn={openRefZoneSignIn} />
          )}
          {managedSections('education')}
        </>
      );
    }
    if (active === 'trainers') return <><PageHero page="trainers" eyebrow="Trainers" title="Professional Development Team">Meet the trainers helping officials sharpen mechanics, judgment, communication, and leadership.</PageHero><Trainers />{managedSections('trainers')}</>;
    if (active === 'guests') return <><PageHero page="guests" eyebrow="Special Guests & Coordinators" title="RTBO Leadership Network">Guest instructors and coordinators supporting the RTBO school experience.</PageHero><Guests />{managedSections('guests')}</>;
    if (active === 'shop') return <><Shop />{managedSections('shop')}</>;
    if (active === 'reviews') return <><PageHero page="reviews" eyebrow="Real Results" title="Testimonials">Officials and coaches sharing the impact of RTBO training, development, and leadership.</PageHero><Reviews />{managedSections('reviews')}</>;
    if (active === 'register') return authUser ? <RegistrationForm user={authUser} active={active} setActive={goTo} onOpenDashboard={openDashboard} onOpenLogin={openLogin} /> : <RegistrationGate onCreateAccount={openRegister} onSignIn={openRegisterSignIn} />;
    if (active === 'contract-sign') {
      return (
        <React.Suspense fallback={null}>
          <ContractSigningPage />
        </React.Suspense>
      );
    }
    if (active === 'contact') return <><PageHero page="contact" eyebrow="Let's Talk" title="Contact RTBO">Reach out about schools, events, training, assigning, and Got U Nex Ref platform questions.</PageHero><Contact />{managedSections('contact')}</>;
    if (activeManagedPage) {
      return (
        <React.Suspense fallback={null}>
          <ManagedSiteContent page={active} records={siteContentRecords} mode="page" pageRecord={activeManagedPage} />
        </React.Suspense>
      );
    }
    return <Home setActive={goTo} />;
  }, [active, activeManagedPage, authUser, currentRoute, refZoneAccess, siteContentRecords]);

  if (dashboardOpen && authUser) {
    return (
      <React.Suspense fallback={null}>
        <AdminDashboard user={authUser} onLogout={logout} onHome={() => goTo('home')} />
      </React.Suspense>
    );
  }

  const fullScreenRegistration = active === 'register' && authUser;

  return (
    <React.Suspense fallback={null}>
      {!fullScreenRegistration && <Header active={active} setActive={goTo} authUser={authUser} onOpenLogin={openLogin} onOpenDashboard={openDashboard} onOpenRegister={openRegister} navLinks={publicNavItems} />}
      <main className={`rtbo-public ${fullScreenRegistration ? 'rtbo-registration-public' : ''}`.trim()}>{content}</main>
      {!fullScreenRegistration && <Footer setActive={goTo} navLinks={publicNavItems} />}
      {accountModal && <AccountModal mode={accountModal} resetToken={passwordResetToken} onClose={closeAccountModal} onLogin={login} onResetTokenHandled={clearPasswordResetToken} />}
    </React.Suspense>
  );
}

createRoot(document.getElementById('root')).render(<App />);
