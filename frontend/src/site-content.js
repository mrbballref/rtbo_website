export const SITE_CONTENT_KEY = 'rtbo-site-content-records';
export const SITE_CONTENT_UPDATED_EVENT = 'rtbo-site-content-updated';

export const siteContentPages = [
  ['home', 'Home'],
  ['about', 'About'],
  ['events', 'Schools & Events'],
  ['livestream', 'Live Stream'],
  ['services', 'Services'],
  ['trainers', 'Training'],
  ['guests', 'Guests'],
  ['reviews', 'Reviews'],
  ['shop', 'Shop'],
  ['contact', 'Contact']
];

export const siteContentKinds = [
  ['section', 'Section'],
  ['feature', 'Feature'],
  ['card', 'Card'],
  ['image', 'Image'],
  ['page', 'Page']
];

export const siteContentTemplates = [
  ['section', 'Standard section'],
  ['band', 'Full-width band'],
  ['feature-grid', 'Feature grid'],
  ['card-grid', 'Card grid'],
  ['media-split', 'Media split'],
  ['image-feature', 'Image feature'],
  ['profile-grid', 'Profile grid']
];

export function siteContentSlug(value = 'managed-page') {
  return String(value || 'managed-page')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'managed-page';
}

function textValue(value = '', fallback = '') {
  return String(value ?? fallback).trim();
}

function arrayCards(value) {
  return Array.isArray(value) ? value : [];
}

export function parseSiteContentCards(cardsText = '') {
  return String(cardsText || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [title = '', body = '', image = '', ctaLabel = '', ctaTarget = ''] = line.split('|').map(part => part.trim());
      return normalizeSiteContentCard({ title, body, image, cta_label: ctaLabel, cta_target: ctaTarget }, index);
    })
    .filter(card => card.title);
}

export function serializeSiteContentCards(cards = []) {
  return arrayCards(cards)
    .map(card => [card.title, card.body, card.image, card.cta_label, card.cta_target].map(value => String(value || '').trim()).join(' | '))
    .join('\n');
}

export function normalizeSiteContentCard(card = {}, index = 0) {
  const title = textValue(card.title, `Card ${index + 1}`);
  return {
    id: siteContentSlug(card.id || title || `card-${index + 1}`),
    title,
    body: textValue(card.body),
    image: textValue(card.image),
    image_alt: textValue(card.image_alt, title),
    cta_label: textValue(card.cta_label),
    cta_target: textValue(card.cta_target)
  };
}

export function normalizeSiteContentRecord(record = {}, index = 0) {
  const kindIds = new Set(siteContentKinds.map(([id]) => id));
  const templateIds = new Set(siteContentTemplates.map(([id]) => id));
  const kind = kindIds.has(record.kind) ? record.kind : 'section';
  const title = textValue(record.title, `Website Content ${index + 1}`);
  const page = siteContentSlug(record.page || (kind === 'page' ? title : 'home'));
  const status = ['active', 'draft', 'hidden'].includes(record.status) ? record.status : 'active';
  const template = templateIds.has(record.template) ? record.template : (kind === 'image' ? 'image-feature' : 'section');

  return {
    id: siteContentSlug(record.id || `${page}-${kind}-${title}-${index + 1}`),
    kind,
    page,
    nav_label: textValue(record.nav_label),
    template,
    status,
    order: Number.isFinite(Number(record.order)) ? Math.round(Number(record.order)) : (index + 1) * 10,
    eyebrow: textValue(record.eyebrow),
    title,
    body: textValue(record.body),
    image: textValue(record.image),
    image_alt: textValue(record.image_alt, title),
    cta_label: textValue(record.cta_label),
    cta_target: textValue(record.cta_target),
    cards: arrayCards(record.cards).map((card, cardIndex) => normalizeSiteContentCard(card, cardIndex)).filter(card => card.title),
    updatedAt: record.updatedAt || record.updated_at || ''
  };
}

export function normalizeSiteContentRecords(records = []) {
  const seen = new Set();
  return (Array.isArray(records) ? records : [])
    .map((record, index) => normalizeSiteContentRecord(record, index))
    .filter((record) => {
      if (!record.id || seen.has(record.id)) return false;
      seen.add(record.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

export function activeManagedSitePages(records = []) {
  return normalizeSiteContentRecords(records)
    .filter(record => record.kind === 'page' && record.status === 'active')
    .map(record => [record.page, record.nav_label || record.title]);
}
