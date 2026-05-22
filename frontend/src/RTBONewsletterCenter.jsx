import React, { useEffect, useMemo, useState } from 'react';
import './newsletter-center.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

const emptyPayload = {
  sources: [],
  articles: [],
  issues: [],
  latest_issue: null,
  subscribers: [],
  campaigns: [],
  counts: {
    sources: 0,
    active_sources: 0,
    articles: 0,
    review_articles: 0,
    approved_articles: 0,
    issues: 0,
    subscribers: 0
  }
};

const complianceRules = [
  'Use official APIs, RSS feeds, public press pages, and approved content feeds first.',
  'Respect robots.txt, source terms, crawl delays, copyright, attribution, and publication rights.',
  'Store titles, source links, summaries, and editorial notes. Do not republish full third-party articles.',
  'Require admin review before scraped or summarized content becomes part of a weekly issue.',
  'Email only opted-in subscribers and keep unsubscribe compliance in the newsletter footer.'
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePayload(data = {}) {
  return {
    ...emptyPayload,
    ...data,
    sources: Array.isArray(data.sources) ? data.sources : [],
    articles: Array.isArray(data.articles) ? data.articles : [],
    issues: Array.isArray(data.issues) ? data.issues : [],
    latest_issue: data.latest_issue || null,
    subscribers: Array.isArray(data.subscribers) ? data.subscribers : [],
    campaigns: Array.isArray(data.campaigns) ? data.campaigns : [],
    counts: { ...emptyPayload.counts, ...(data.counts || {}) }
  };
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

async function apiPostForm(endpoint, formData) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function formatDate(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`rtbo-newsletter-pill is-${tone}`}>{children}</span>;
}

function StatCard({ label, value, detail }) {
  return (
    <article className="rtbo-newsletter-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function EmptyState({ title, children, action }) {
  return (
    <div className="rtbo-newsletter-empty">
      <strong>{title}</strong>
      <p>{children}</p>
      {action}
    </div>
  );
}

function MagazineIssuePreview({ issue }) {
  if (!issue) {
    return (
      <section className="rtbo-newsletter-magazine is-empty">
        <div className="rtbo-newsletter-magazine-cover">
          <p className="eyebrow">Weekly Magazine</p>
          <h3>No Weekly Issue Created Yet</h3>
          <p>Add approved sources, run the scraper, review articles, and create this week&apos;s magazine newsletter.</p>
        </div>
      </section>
    );
  }

  const sections = Array.isArray(issue.sections) ? issue.sections : [];

  return (
    <section className="rtbo-newsletter-magazine">
      <div className="rtbo-newsletter-magazine-cover">
        <p className="eyebrow">Raising The Bar Officiating Magazine</p>
        <h3>{issue.title || 'Weekly Whistle'}</h3>
        <p>{issue.subtitle || 'Basketball officiating news, rules, training, and development.'}</p>
        <div className="rtbo-newsletter-cover-meta">
          <StatusPill tone={issue.status === 'sent' ? 'green' : 'orange'}>{issue.status || 'draft'}</StatusPill>
          <span>{formatDate(issue.issue_date)}</span>
        </div>
      </div>
      <div className="rtbo-newsletter-magazine-body">
        <p className="eyebrow">Cover Story</p>
        <h4>{issue.cover_headline || 'Weekly Officiating Briefing'}</h4>
        <p>{issue.intro_text || 'This issue is ready for editorial review.'}</p>
        <div className="rtbo-newsletter-section-list">
          {sections.length === 0 && <p className="rtbo-newsletter-muted">No sections have been added to this issue yet.</p>}
          {sections.slice(0, 5).map((section, index) => (
            <article key={`${section.headline || 'section'}-${index}`}>
              <span>{section.section || 'Officiating News'}</span>
              <strong>{section.headline}</strong>
              <p>{section.text}</p>
              {section.link && <a href={section.link} target="_blank" rel="noreferrer">Read source</a>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function RTBONewsletterCenter({ onStatus = () => {} }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [payload, setPayload] = useState(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [autoDiscoveryAttempted, setAutoDiscoveryAttempted] = useState(false);
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [sourceForm, setSourceForm] = useState({
    name: '',
    url: '',
    source_type: 'Officiating News',
    method: 'rss',
    compliance_status: 'Pending Review'
  });
  const [subscriberForm, setSubscriberForm] = useState({ first_name: '', last_name: '', email: '' });
  const [issueForm, setIssueForm] = useState({
    title: 'Weekly Whistle',
    subtitle: 'Basketball officiating news, rules, training, and development.',
    issue_date: todayDate(),
    cover_headline: 'The Weekly Whistle',
    intro_text: 'A clean weekly briefing for officials, observers, assignors, and basketball leaders.'
  });

  const approvedArticles = useMemo(
    () => payload.articles.filter(article => article.status === 'approved'),
    [payload.articles]
  );
  const reviewArticles = useMemo(
    () => payload.articles.filter(article => article.status !== 'rejected'),
    [payload.articles]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'RTBO Weekly Whistle Newsletter Center';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const previousDescription = meta.getAttribute('content') || '';
    meta.setAttribute('content', 'Raising The Bar Officiating weekly sports magazine newsletter builder, source scraper, editorial review desk, subscriber database, and email campaign center.');
    return () => {
      document.title = previousTitle;
      meta.setAttribute('content', previousDescription);
    };
  }, []);

  useEffect(() => {
    loadNewsletter();
  }, []);

  useEffect(() => {
    if (loading || saving || autoDiscoveryAttempted || Number(payload.counts.sources || 0) > 0) {
      return;
    }

    setAutoDiscoveryAttempted(true);
    runAction('discover_sources');
  }, [autoDiscoveryAttempted, loading, payload.counts.sources, saving]);

  async function loadNewsletter() {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/admin-newsletter.php');
      setPayload(normalizePayload(data));
      setMessage('');
    } catch (loadError) {
      setError(loadError.message || 'Newsletter data could not be loaded.');
      onStatus(loadError.message || 'Newsletter data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action, body = {}) {
    setSaving(true);
    setError('');
    try {
      const data = await apiPostJson('/admin-newsletter.php', { action, ...body });
      setPayload(normalizePayload(data));
      setMessage(data.message || 'Newsletter action completed.');
      onStatus(data.message || 'Newsletter action completed.');
      return data;
    } catch (actionError) {
      setError(actionError.message || 'Newsletter action failed.');
      onStatus(actionError.message || 'Newsletter action failed.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  function updateSourceForm(event) {
    const { name, value } = event.target;
    setSourceForm(current => ({ ...current, [name]: value }));
  }

  function updateIssueForm(event) {
    const { name, value } = event.target;
    setIssueForm(current => ({ ...current, [name]: value }));
  }

  function updateSubscriberForm(event) {
    const { name, value } = event.target;
    setSubscriberForm(current => ({ ...current, [name]: value }));
  }

  async function submitSource(event) {
    event.preventDefault();
    const data = await runAction('add_source', { source: sourceForm });
    if (data) {
      setSourceForm({
        name: '',
        url: '',
        source_type: 'Officiating News',
        method: 'rss',
        compliance_status: 'Pending Review'
      });
    }
  }

  async function addSubscriber(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const formData = new FormData();
    formData.set('first_name', subscriberForm.first_name);
    formData.set('last_name', subscriberForm.last_name);
    formData.set('email', subscriberForm.email);
    try {
      const data = await apiPostForm('/subscribe.php', formData);
      setMessage(data.message || 'Subscriber added.');
      setSubscriberForm({ first_name: '', last_name: '', email: '' });
      await loadNewsletter();
      onStatus(data.message || 'Subscriber added.');
    } catch (subscriberError) {
      setError(subscriberError.message || 'Subscriber could not be added.');
      onStatus(subscriberError.message || 'Subscriber could not be added.');
    } finally {
      setSaving(false);
    }
  }

  function toggleArticleSelection(articleId) {
    setSelectedArticleIds(current => current.includes(articleId)
      ? current.filter(id => id !== articleId)
      : [...current, articleId]);
  }

  async function createIssue(event) {
    event.preventDefault();
    const data = await runAction('create_issue', {
      issue: {
        ...issueForm,
        article_ids: selectedArticleIds
      }
    });
    if (data?.issue) {
      setSelectedArticleIds([]);
      setActiveView('dashboard');
    }
  }

  async function sendLatestIssue() {
    if (!payload.latest_issue?.id) {
      setError('Create a weekly issue before sending.');
      return;
    }
    await runAction('send_issue', { id: payload.latest_issue.id });
  }

  const navItems = [
    ['dashboard', 'Weekly Issue'],
    ['sources', 'Sources'],
    ['review', 'Review Desk'],
    ['builder', 'Builder'],
    ['preview', 'Magazine Preview'],
    ['subscribers', 'Subscribers'],
    ['campaigns', 'Campaigns'],
    ['compliance', 'Compliance']
  ];

  return (
    <section className="rtbo-newsletter-center" aria-labelledby="newsletter-center-title">
      <header className="rtbo-newsletter-hero">
        <div>
          <p className="eyebrow">Newsletter Workspace</p>
          <h2 id="newsletter-center-title">RTBO Weekly Whistle</h2>
          <p>Sports-style magazine newsletter builder with automatic source discovery, web scraping, editorial review, subscriber lists, and weekly email delivery.</p>
        </div>
        <div className="rtbo-newsletter-actions">
          <button className="btn" type="button" onClick={() => runAction('discover_sources')} disabled={saving || loading}>
            {saving ? 'Working...' : 'Discover Sources'}
          </button>
          <button className="btn secondary dark-btn" type="button" onClick={() => runAction('run_scraper')} disabled={saving || loading}>
            {saving ? 'Working...' : 'Run Scraper'}
          </button>
          <button className="btn secondary dark-btn" type="button" onClick={() => setActiveView('builder')}>Create Issue</button>
          <button className="btn secondary dark-btn" type="button" onClick={sendLatestIssue} disabled={saving || !payload.latest_issue}>
            Send Weekly Email
          </button>
          <button className="btn secondary dark-btn" type="button" onClick={loadNewsletter} disabled={loading}>Refresh</button>
        </div>
      </header>

      <nav className="rtbo-newsletter-tabs" aria-label="Newsletter workspace">
        {navItems.map(([id, label]) => (
          <button className={activeView === id ? 'active' : ''} key={id} type="button" onClick={() => setActiveView(id)}>
            {label}
          </button>
        ))}
      </nav>

      {message && <p className="rtbo-newsletter-status">{message}</p>}
      {error && <p className="rtbo-newsletter-status error">{error}</p>}
      {loading && <p className="rtbo-newsletter-status">Loading newsletter database...</p>}

      {activeView === 'dashboard' && (
        <div className="rtbo-newsletter-dashboard">
          <div className="rtbo-newsletter-stat-grid">
            <StatCard label="Sources" value={payload.counts.active_sources} detail={`${payload.counts.sources} total source record(s)`} />
            <StatCard label="Review Queue" value={payload.counts.review_articles} detail="Collected article summaries awaiting approval" />
            <StatCard label="Approved" value={payload.counts.approved_articles} detail="Ready for the weekly issue" />
            <StatCard label="Subscribers" value={payload.counts.subscribers} detail="Active newsletter database recipients" />
          </div>
          <MagazineIssuePreview issue={payload.latest_issue} />
        </div>
      )}

      {activeView === 'sources' && (
        <div className="rtbo-newsletter-workspace-grid">
          <form className="rtbo-newsletter-panel" onSubmit={submitSource}>
            <div className="rtbo-newsletter-panel-head">
              <div>
                <p className="eyebrow">Optional Manual Source</p>
                <h3>Add Specific Source</h3>
              </div>
            </div>
            <label>
              <span>Source Name (optional)</span>
              <input name="name" value={sourceForm.name} onChange={updateSourceForm} placeholder="Auto-filled from URL when blank" />
            </label>
            <label>
              <span>Source URL</span>
              <input name="url" type="url" value={sourceForm.url} onChange={updateSourceForm} required placeholder="https://example.com/feed.xml" />
            </label>
            <div className="rtbo-newsletter-form-row">
              <label>
                <span>Source Type</span>
                <input name="source_type" value={sourceForm.source_type} onChange={updateSourceForm} />
              </label>
              <label>
                <span>Collection Method</span>
                <select name="method" value={sourceForm.method} onChange={updateSourceForm}>
                  <option value="rss">RSS / Atom Feed</option>
                  <option value="html">Public Web Page</option>
                  <option value="manual">Manual Review Only</option>
                </select>
              </label>
            </div>
            <label>
              <span>Compliance Status</span>
              <select name="compliance_status" value={sourceForm.compliance_status} onChange={updateSourceForm}>
                <option>Pending Review</option>
                <option>Approved Source</option>
                <option>Robots / Terms Review Required</option>
                <option>Manual Review Only</option>
              </select>
            </label>
            <button className="btn" type="submit" disabled={saving}>Save Manual Source</button>
          </form>

          <section className="rtbo-newsletter-panel">
            <div className="rtbo-newsletter-panel-head">
              <div>
                <p className="eyebrow">Source Database</p>
                <h3>Monitored Sources</h3>
              </div>
              <div className="rtbo-newsletter-actions compact">
                <button className="btn secondary dark-btn" type="button" onClick={() => runAction('discover_sources')} disabled={saving}>Discover Sources</button>
                <button className="btn secondary dark-btn" type="button" onClick={() => runAction('run_scraper')} disabled={saving}>Scan Active</button>
              </div>
            </div>
            <div className="rtbo-newsletter-list">
              {payload.sources.length === 0 && <EmptyState title="Finding sources">The newsletter center automatically discovers basketball, officiating, rules, and training sources. You can also add a manual source when you want a specific site included.</EmptyState>}
              {payload.sources.map(source => (
                <article key={source.id} className="rtbo-newsletter-record">
                  <div>
                    <strong>{source.name}</strong>
                    <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a>
                    <p>{source.source_type} / {source.method} / {source.compliance_status}</p>
                    {source.last_error && <p className="rtbo-newsletter-error-text">{source.last_error}</p>}
                  </div>
                  <div className="rtbo-newsletter-record-actions">
                    <StatusPill tone={source.status === 'active' ? 'green' : 'neutral'}>{source.status}</StatusPill>
                    <button className="btn secondary dark-btn" type="button" onClick={() => runAction('update_source_status', { id: source.id, status: source.status === 'active' ? 'paused' : 'active' })}>
                      {source.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeView === 'review' && (
        <section className="rtbo-newsletter-panel">
          <div className="rtbo-newsletter-panel-head">
            <div>
              <p className="eyebrow">Editorial Desk</p>
              <h3>Collected Article Summaries</h3>
            </div>
            <button className="btn secondary dark-btn" type="button" onClick={() => runAction('run_scraper')} disabled={saving}>Refresh Queue</button>
          </div>
          <div className="rtbo-newsletter-article-grid">
            {reviewArticles.length === 0 && <EmptyState title="No collected articles">Run the scraper after adding sources, then approve the summaries that should be used in the weekly issue.</EmptyState>}
            {reviewArticles.map(article => (
              <article className="rtbo-newsletter-article" key={article.id}>
                <div className="rtbo-newsletter-article-head">
                  <StatusPill tone={article.status === 'approved' ? 'green' : 'orange'}>{article.status}</StatusPill>
                  <span>{article.quality_score}% quality</span>
                </div>
                <p className="eyebrow">{article.category}</p>
                <h4>{article.title}</h4>
                <p>{article.summary || 'No summary was collected. Open the source and add editorial notes before approval.'}</p>
                <a href={article.source_link} target="_blank" rel="noreferrer">{article.source_name}</a>
                <div className="rtbo-newsletter-card-actions">
                  <button className="btn" type="button" onClick={() => runAction('update_article_status', { id: article.id, status: 'approved' })}>Approve</button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => runAction('update_article_status', { id: article.id, status: 'review' })}>Review</button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => runAction('update_article_status', { id: article.id, status: 'rejected' })}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeView === 'builder' && (
        <div className="rtbo-newsletter-workspace-grid">
          <form className="rtbo-newsletter-panel" onSubmit={createIssue}>
            <div className="rtbo-newsletter-panel-head">
              <div>
                <p className="eyebrow">Issue Builder</p>
                <h3>Create Weekly Magazine</h3>
              </div>
            </div>
            <label>
              <span>Newsletter Title</span>
              <input name="title" value={issueForm.title} onChange={updateIssueForm} required />
            </label>
            <label>
              <span>Subtitle</span>
              <input name="subtitle" value={issueForm.subtitle} onChange={updateIssueForm} required />
            </label>
            <div className="rtbo-newsletter-form-row">
              <label>
                <span>Issue Date</span>
                <input name="issue_date" type="date" value={issueForm.issue_date} onChange={updateIssueForm} required />
              </label>
              <label>
                <span>Cover Headline</span>
                <input name="cover_headline" value={issueForm.cover_headline} onChange={updateIssueForm} required />
              </label>
            </div>
            <label>
              <span>Intro Text</span>
              <textarea name="intro_text" rows="5" value={issueForm.intro_text} onChange={updateIssueForm} required />
            </label>
            <button className="btn" type="submit" disabled={saving || approvedArticles.length === 0}>Create Weekly Issue</button>
          </form>

          <section className="rtbo-newsletter-panel">
            <div className="rtbo-newsletter-panel-head">
              <div>
                <p className="eyebrow">Approved Content</p>
                <h3>Select Articles</h3>
              </div>
            </div>
            <div className="rtbo-newsletter-checkbox-list">
              {approvedArticles.length === 0 && <EmptyState title="No approved articles">Approve article summaries in the Review Desk before creating an issue.</EmptyState>}
              {approvedArticles.map(article => (
                <label key={article.id} className="rtbo-newsletter-checkbox-card">
                  <input type="checkbox" checked={selectedArticleIds.includes(article.id)} onChange={() => toggleArticleSelection(article.id)} />
                  <span>
                    <strong>{article.title}</strong>
                    <small>{article.category} / {article.source_name}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeView === 'preview' && <MagazineIssuePreview issue={payload.latest_issue} />}

      {activeView === 'subscribers' && (
        <div className="rtbo-newsletter-workspace-grid">
          <form className="rtbo-newsletter-panel" onSubmit={addSubscriber}>
            <div className="rtbo-newsletter-panel-head">
              <div>
                <p className="eyebrow">Subscriber Database</p>
                <h3>Add Subscriber</h3>
              </div>
            </div>
            <div className="rtbo-newsletter-form-row">
              <label>
                <span>First Name</span>
                <input name="first_name" value={subscriberForm.first_name} onChange={updateSubscriberForm} />
              </label>
              <label>
                <span>Last Name</span>
                <input name="last_name" value={subscriberForm.last_name} onChange={updateSubscriberForm} />
              </label>
            </div>
            <label>
              <span>Email Address</span>
              <input name="email" type="email" value={subscriberForm.email} onChange={updateSubscriberForm} required />
            </label>
            <button className="btn" type="submit" disabled={saving}>Add Subscriber</button>
          </form>
          <section className="rtbo-newsletter-panel">
            <div className="rtbo-newsletter-panel-head">
              <div>
                <p className="eyebrow">Active Subscribers</p>
                <h3>{payload.counts.subscribers} Recipient(s)</h3>
              </div>
            </div>
            <div className="rtbo-newsletter-list">
              {payload.subscribers.length === 0 && <EmptyState title="No subscribers yet">Subscribers will appear here after they opt in through the website or are added by an admin.</EmptyState>}
              {payload.subscribers.map((subscriber, index) => (
                <article className="rtbo-newsletter-record compact" key={`${subscriber.email}-${index}`}>
                  <div>
                    <strong>{`${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim() || subscriber.email}</strong>
                    <p>{subscriber.email}</p>
                  </div>
                  <span>{formatDate(subscriber.subscribed_at)}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeView === 'campaigns' && (
        <section className="rtbo-newsletter-panel">
          <div className="rtbo-newsletter-panel-head">
            <div>
              <p className="eyebrow">Campaign History</p>
              <h3>Email Sends</h3>
            </div>
            <button className="btn secondary dark-btn" type="button" onClick={sendLatestIssue} disabled={saving || !payload.latest_issue}>Send Current Issue</button>
          </div>
          <div className="rtbo-newsletter-list">
            {payload.campaigns.length === 0 && <EmptyState title="No sent campaigns">When a weekly issue is emailed, delivery totals will appear here from the newsletter database.</EmptyState>}
            {payload.campaigns.map((campaign, index) => (
              <article className="rtbo-newsletter-record compact" key={`${campaign.subject}-${index}`}>
                <div>
                  <strong>{campaign.subject}</strong>
                  <p>{campaign.preheader || 'No preheader saved.'}</p>
                </div>
                <div className="rtbo-newsletter-campaign-stats">
                  <span>{campaign.sent_count || 0} sent</span>
                  <span>{campaign.failed_count || 0} failed</span>
                  <span>{formatDate(campaign.sent_at || campaign.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeView === 'compliance' && (
        <section className="rtbo-newsletter-panel">
          <div className="rtbo-newsletter-panel-head">
            <div>
              <p className="eyebrow">Compliance First</p>
              <h3>Scraping & Email Rules</h3>
            </div>
          </div>
          <div className="rtbo-newsletter-compliance-grid">
            {complianceRules.map(rule => (
              <article key={rule}>
                <span></span>
                <p>{rule}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
