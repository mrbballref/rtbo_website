export const RTBO_RESUME_KEY = 'rtbo-digital-resume';
export const RTBO_RESUME_UPDATED_EVENT = 'rtbo-digital-resume-updated';

export const defaultRtboResume = {
  organization: 'Raising The Bar Officiating',
  kicker: 'Basketball Officiating Resume',
  title: 'Raising The Bar Officiating',
  accentTitle: 'The Bar',
  subtitle: 'Event staffing and tournament coverage profile for athletic programs, tournament directors, camps, showcases, elite girls basketball events, and youth or scholastic competition.',
  summary: 'Raising The Bar Officiating is a basketball officiating organization supporting tournament directors, athletic programs, camps, showcases, collegiate-hosted events, elite girls basketball, and youth or scholastic competition. RTBO emphasizes dependable coverage, organized pre-event communication, professional crew coordination, availability confirmation, and consistent event-day support.',
  logoUrl: '/assets/resume/rtob-logo.png',
  pdfUrl: '/assets/resume/RTOB_Digital_Resume.pdf',
  requestSubject: 'RTBO Officiating Request',
  contact: {
    primary: 'Montrel Simmons / Raising The Bar Officiating',
    phone: '(501) 240-4961',
    email: 'admin@rtbofficiating.com',
    website: 'www.rtbofficiating.com'
  },
  featuredEvent: {
    label: 'Featured 2026 Event',
    title: 'Big Miller / RTBO Official-Sponsored Elite Girls Tournament',
    date: 'June 8-9, 2026',
    location: 'Little Rock, AR',
    body: 'Basketball officiating support and tournament coverage for an elite girls basketball event.'
  },
  services: [
    {
      title: 'Tournament Coverage',
      body: 'Multi-court weekend events, elite girls tournaments, exposure events, camps, showcases, and seasonal play.'
    },
    {
      title: 'Officials Assignment Support',
      body: 'Availability tracking, assignment confirmation, conflict notes, crew needs, and reporting instructions.'
    },
    {
      title: 'Event Communication',
      body: 'Timely updates with tournament directors, site leads, table personnel, coaches, and assigned officials.'
    },
    {
      title: 'Game Management',
      body: 'Calm court presence, respectful communication, rules knowledge, mechanics, and crew teamwork.'
    },
    {
      title: 'Development Mindset',
      body: 'Professional growth, feedback-centered officiating, mentorship, and consistent mechanics standards.'
    },
    {
      title: 'Partner Reliability',
      body: 'Organized follow-up, punctuality, appearance expectations, and service-minded support for every event.'
    }
  ],
  events: [
    { date: 'June 2017', event: 'UCA', location: 'Conway, AR' },
    { date: 'June 2018', event: 'UCA', location: 'Conway, AR' },
    { date: 'June 2018', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'July 2018', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'June 2019', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'July 2019', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'June 2021', event: 'Lyon College', location: 'Batesville, AR' },
    { date: 'July 2021', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'June 2022', event: 'UAPB Men', location: 'Pine Bluff, AR' },
    { date: 'July 2022', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'June 2023', event: 'UAPB Women', location: 'Pine Bluff, AR' },
    { date: 'July 2023', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'June 2024', event: 'UAPB Men', location: 'Pine Bluff, AR' },
    { date: 'July 2024', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'July 2025', event: 'UALR', location: 'Little Rock, AR' },
    { date: 'April 2026', event: 'Hop Step Sporting Events', location: 'Benton, AR' },
    { date: 'May 2026', event: 'Hop Step Sporting Events', location: 'Benton, AR' },
    { date: 'June 2026', event: 'UAPB Men', location: 'Pine Bluff, AR' },
    { date: 'June 2026', event: 'UAPB Women', location: 'Pine Bluff, AR' },
    { date: 'June 8-9, 2026', event: 'Big Miller / RTBO Official-Sponsored Elite Girls Tournament', location: 'Little Rock, AR', highlight: true },
    { date: 'July 2026', event: 'UALR', location: 'Little Rock, AR' }
  ],
  standards: [
    {
      title: 'Professional Standards',
      items: [
        'Prompt communication and reliable confirmations',
        'Prepared, punctual, and professional officials',
        'Rules knowledge, mechanics consistency, and crew teamwork',
        'Respectful coach, table, and site-director communication'
      ]
    },
    {
      title: 'Event-Day Workflow',
      items: [
        'Availability collection and conflict tracking',
        'Reporting-time and uniform expectation communication',
        'Coverage support for schedule changes and multi-court flow',
        'Post-event follow-up and continuous improvement'
      ]
    }
  ],
  adminInfo: [
    { label: 'Organization', value: 'Raising The Bar Officiating (RTBO)' },
    { label: 'Primary Contact', value: 'Montrel Simmons / Raising The Bar Officiating' },
    { label: 'Phone / Text', value: '(501) 240-4961' },
    { label: 'Email', value: 'admin@rtbofficiating.com' },
    { label: 'Website / Social', value: 'www.rtbofficiating.com' },
    { label: 'Event Partners / Hosts', value: 'UCA, UALR, Lyon College, UAPB, Big Miller, Hop Step Sporting Events' },
    { label: 'References', value: 'Available upon request.' }
  ],
  updatedAt: ''
};

function textValue(value = '', fallback = '') {
  return String(value ?? fallback).trim();
}

function normalizeTextList(value = []) {
  if (Array.isArray(value)) {
    return value.map(item => textValue(item)).filter(Boolean);
  }
  return String(value || '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeServices(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.map((item, index) => ({
    title: textValue(item?.title, `Service ${index + 1}`),
    body: textValue(item?.body)
  })).filter(item => item.title || item.body);
}

function normalizeEvents(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.map(item => ({
    date: textValue(item?.date),
    event: textValue(item?.event || item?.title),
    location: textValue(item?.location),
    highlight: Boolean(item?.highlight)
  })).filter(item => item.date || item.event || item.location);
}

function normalizeStandardBlocks(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.map((item, index) => ({
    title: textValue(item?.title, `Standard ${index + 1}`),
    items: normalizeTextList(item?.items)
  })).filter(item => item.title || item.items.length);
}

function normalizeInfoRows(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.map(item => ({
    label: textValue(item?.label),
    value: textValue(item?.value)
  })).filter(item => item.label || item.value);
}

export function normalizeRtboResume(resume = {}) {
  const base = defaultRtboResume;
  const contact = resume.contact && typeof resume.contact === 'object' ? resume.contact : {};
  const featuredEvent = resume.featuredEvent && typeof resume.featuredEvent === 'object' ? resume.featuredEvent : {};

  return {
    organization: textValue(resume.organization, base.organization),
    kicker: textValue(resume.kicker, base.kicker),
    title: textValue(resume.title, base.title),
    accentTitle: textValue(resume.accentTitle, base.accentTitle),
    subtitle: textValue(resume.subtitle, base.subtitle),
    summary: textValue(resume.summary, base.summary),
    logoUrl: textValue(resume.logoUrl, base.logoUrl),
    pdfUrl: textValue(resume.pdfUrl, base.pdfUrl),
    requestSubject: textValue(resume.requestSubject, base.requestSubject),
    contact: {
      primary: textValue(contact.primary, base.contact.primary),
      phone: textValue(contact.phone, base.contact.phone),
      email: textValue(contact.email, base.contact.email),
      website: textValue(contact.website, base.contact.website)
    },
    featuredEvent: {
      label: textValue(featuredEvent.label, base.featuredEvent.label),
      title: textValue(featuredEvent.title, base.featuredEvent.title),
      date: textValue(featuredEvent.date, base.featuredEvent.date),
      location: textValue(featuredEvent.location, base.featuredEvent.location),
      body: textValue(featuredEvent.body, base.featuredEvent.body)
    },
    services: normalizeServices(resume.services).length ? normalizeServices(resume.services) : base.services,
    events: normalizeEvents(resume.events).length ? normalizeEvents(resume.events) : base.events,
    standards: normalizeStandardBlocks(resume.standards).length ? normalizeStandardBlocks(resume.standards) : base.standards,
    adminInfo: normalizeInfoRows(resume.adminInfo).length ? normalizeInfoRows(resume.adminInfo) : base.adminInfo,
    updatedAt: textValue(resume.updatedAt || resume.updated_at)
  };
}

export function readStoredRtboResume() {
  try {
    return normalizeRtboResume(JSON.parse(localStorage.getItem(RTBO_RESUME_KEY) || '{}'));
  } catch {
    return normalizeRtboResume(defaultRtboResume);
  }
}

export function publishRtboResume(resume) {
  const normalized = normalizeRtboResume(resume);
  try {
    localStorage.setItem(RTBO_RESUME_KEY, JSON.stringify(normalized));
  } catch {
    // The live page still works from server/default data when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(RTBO_RESUME_UPDATED_EVENT, { detail: { resume: normalized } }));
  return normalized;
}
