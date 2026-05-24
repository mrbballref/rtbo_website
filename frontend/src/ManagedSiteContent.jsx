import React from 'react';
import { normalizeSiteContentRecords } from './site-content.js';
import './managed-site-content.css';

function managedImage(src = '') {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^(data:|https?:\/\/|\/)/i.test(value)) return value;
  return `/assets/images/${value}`;
}

function managedHref(target = '') {
  const value = String(target || '').trim();
  if (!value) return '';
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(value)) return value;
  return `#${value.replace(/^#/, '')}`;
}

function ManagedButton({ label, target }) {
  const href = managedHref(target);
  if (!label || !href) return null;
  return <a className="btn managed-site-cta" href={href}>{label}</a>;
}

function ManagedCards({ record, variant = 'card-grid' }) {
  const cards = record.cards.length
    ? record.cards
    : [{ id: record.id, title: record.title, body: record.body, image: record.image, image_alt: record.image_alt, cta_label: record.cta_label, cta_target: record.cta_target }];

  const className = variant === 'profile-grid'
    ? 'trainer-grid managed-site-profile-grid'
    : variant === 'feature-grid'
      ? 'solution-grid compact-solutions-grid managed-site-feature-grid'
      : 'about-icon-grid managed-site-card-grid';

  return (
    <div className={className}>
      {cards.map(card => (
        <article key={card.id || card.title}>
          {card.image ? <img className="card-icon managed-site-card-image" src={managedImage(card.image)} alt={card.image_alt || card.title} loading="lazy" decoding="async" /> : null}
          <div className="managed-site-card-copy">
            <h3>{card.title}</h3>
            {card.body ? <p>{card.body}</p> : null}
            <ManagedButton label={card.cta_label} target={card.cta_target} />
          </div>
        </article>
      ))}
    </div>
  );
}

function ManagedRecord({ record }) {
  const hasImage = Boolean(record.image);
  const sectionClass = record.template === 'band' ? 'rtbo-band' : 'rtbo-section';
  const className = `${sectionClass} managed-site-section managed-site-${record.template} managed-site-kind-${record.kind}`;

  if (record.template === 'media-split') {
    return (
      <section className={className}>
        <div className="services-top-section managed-site-media-layout">
          <div className="services-top-copy managed-site-copy">
            {record.eyebrow ? <p className="eyebrow">{record.eyebrow}</p> : null}
            <h2>{record.title}</h2>
            {record.body ? <p>{record.body}</p> : null}
            <ManagedButton label={record.cta_label} target={record.cta_target} />
          </div>
          {hasImage ? (
            <div className="services-top-image managed-site-media">
              <img src={managedImage(record.image)} alt={record.image_alt || record.title} loading="lazy" decoding="async" />
            </div>
          ) : null}
        </div>
        {record.cards.length ? <ManagedCards record={record} variant="feature-grid" /> : null}
      </section>
    );
  }

  if (record.template === 'image-feature') {
    return (
      <section className={className}>
        <div className="managed-site-image-feature">
          {hasImage ? <img src={managedImage(record.image)} alt={record.image_alt || record.title} loading="lazy" decoding="async" /> : null}
          <div className="managed-site-copy">
            {record.eyebrow ? <p className="eyebrow">{record.eyebrow}</p> : null}
            <h2>{record.title}</h2>
            {record.body ? <p>{record.body}</p> : null}
            <ManagedButton label={record.cta_label} target={record.cta_target} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="rtbo-section-head managed-site-head">
        {record.eyebrow ? <p className="eyebrow">{record.eyebrow}</p> : null}
        <h2>{record.title}</h2>
        {record.body ? <p>{record.body}</p> : null}
        <ManagedButton label={record.cta_label} target={record.cta_target} />
      </div>
      {(record.cards.length || ['feature', 'card'].includes(record.kind)) ? (
        <ManagedCards record={record} variant={record.template} />
      ) : hasImage ? (
        <div className="image-frame managed-site-single-image">
          <img src={managedImage(record.image)} alt={record.image_alt || record.title} loading="lazy" decoding="async" />
        </div>
      ) : null}
    </section>
  );
}

export default function ManagedSiteContent({ page, records = [], mode = 'sections', pageRecord = null }) {
  const normalized = normalizeSiteContentRecords(records);
  const activeRecords = normalized.filter(record => record.status === 'active' && record.page === page);
  const pageItem = pageRecord || activeRecords.find(record => record.kind === 'page');
  const sections = activeRecords.filter(record => mode === 'sections' || record.kind !== 'page');

  if (mode === 'page') {
    return (
      <>
        {pageItem ? (
          <section className="page-hero managed-site-page-hero">
            {pageItem.eyebrow ? <p className="eyebrow">{pageItem.eyebrow}</p> : null}
            <h1>{pageItem.title}</h1>
            {pageItem.body ? <p>{pageItem.body}</p> : null}
            <ManagedButton label={pageItem.cta_label} target={pageItem.cta_target} />
          </section>
        ) : null}
        {sections.map(record => <ManagedRecord key={record.id} record={record} />)}
      </>
    );
  }

  if (!sections.length) return null;
  return <>{sections.map(record => <ManagedRecord key={record.id} record={record} />)}</>;
}
