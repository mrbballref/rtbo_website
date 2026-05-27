import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultPodcastShow,
  normalizePodcastEpisode,
  normalizePodcastLibrary,
  podcastSlug,
  publishPodcastLibrary,
  readStoredPodcastLibrary,
  visiblePodcastEpisodes
} from './podcast-data.js';
import './podcast-builder.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const PODCAST_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v';

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

async function apiPostForm(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: payload,
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

function formatFileSize(size = 0) {
  const bytes = Number(size) || 0;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function createEpisodeForm(episode = {}) {
  return {
    id: episode.id || '',
    slug: episode.slug || '',
    title: episode.title || '',
    subtitle: episode.subtitle || '',
    description: episode.description || '',
    status: episode.status || 'draft',
    season: String(episode.season ?? ''),
    episode: String(episode.episode ?? ''),
    publishedAt: episode.publishedAt || '',
    runtime: episode.runtime || '',
    category: episode.category || '',
    guests: episode.guests || '',
    videoUrl: episode.videoUrl || '',
    posterUrl: episode.posterUrl || '',
    transcript: episode.transcript || ''
  };
}

function uniqueEpisodeId(baseId, episodes = []) {
  const existing = new Set(episodes.map(episode => episode.id));
  const base = podcastSlug(baseId || 'podcast-video');
  if (!existing.has(base)) return base;

  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function formToEpisode(form, episodes, editingId = '') {
  const title = form.title.trim();
  const id = editingId || form.id || uniqueEpisodeId(title, episodes);
  return normalizePodcastEpisode({
    ...form,
    id,
    slug: form.slug || id,
    season: form.season,
    episode: form.episode
  });
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="podcast-builder-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default function PodcastBuilder({ onStatus = () => {} }) {
  const formRef = useRef(null);
  const videoInputRef = useRef(null);
  const [library, setLibrary] = useState(readStoredPodcastLibrary);
  const [episodeForm, setEpisodeForm] = useState(createEpisodeForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [videoUploadNote, setVideoUploadNote] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const summary = useMemo(() => ({
    total: library.episodes.length,
    published: visiblePodcastEpisodes(library.episodes).length,
    drafts: library.episodes.filter(episode => episode.status === 'draft').length,
    hidden: library.episodes.filter(episode => episode.status === 'hidden').length
  }), [library.episodes]);

  const visibleEpisodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return library.episodes.filter(episode => {
      const statusMatch = statusFilter === 'all' || episode.status === statusFilter;
      const queryMatch = !needle || [episode.title, episode.subtitle, episode.description, episode.category, episode.guests, episode.videoUrl]
        .join(' ')
        .toLowerCase()
        .includes(needle);
      return statusMatch && queryMatch;
    });
  }, [library.episodes, query, statusFilter]);

  useEffect(() => {
    let active = true;
    async function loadPodcast() {
      setLoading(true);
      try {
        const data = await apiGet('/podcast.php?scope=admin');
        if (!active) return;
        const nextLibrary = publishPodcastLibrary({ show: data.show, episodes: data.episodes, updatedAt: data.updated_at });
        setLibrary(nextLibrary);
        setMessage('Podcast Builder loaded from production storage.');
      } catch (error) {
        if (!active) return;
        setLibrary(readStoredPodcastLibrary());
        setMessage(error.status === 401 ? 'Admin sign-in is required to save podcast changes.' : 'Podcast Builder loaded from local fallback storage.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPodcast();
    return () => {
      active = false;
    };
  }, []);

  function updateShow(field, value) {
    setLibrary(current => normalizePodcastLibrary({
      ...current,
      show: { ...current.show, [field]: value }
    }));
  }

  function updateEpisodeForm(event) {
    const { name, value } = event.target;
    setEpisodeForm(current => ({ ...current, [name]: value }));
  }

  function clearSelectedVideoFile() {
    setSelectedVideoFile(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  }

  function choosePodcastVideo(event) {
    const file = event.target.files?.[0] || null;
    setSelectedVideoFile(file);
    setVideoUploadNote(file ? `${file.name} selected (${formatFileSize(file.size)})` : '');
  }

  async function uploadPodcastVideoFile(file) {
    const payload = new FormData();
    payload.append('video', file);
    const data = await apiPostForm('/podcast-video-upload.php', payload);
    if (!data.video?.url) {
      throw new Error('The server did not return a playable podcast video URL.');
    }
    return data.video;
  }

  function applyUploadedVideo(video) {
    setEpisodeForm(current => createEpisodeForm({
      ...current,
      title: current.title.trim() ? current.title : video.title,
      videoUrl: video.url
    }));
    clearSelectedVideoFile();
    setVideoUploadNote(`Uploaded ${video.title} and filled the Video URL field.`);
  }

  async function uploadSelectedVideo() {
    if (!selectedVideoFile) {
      setVideoUploadNote('Choose a podcast video file before uploading.');
      return null;
    }

    setUploadingVideo(true);
    setMessage('Uploading podcast video...');
    try {
      const video = await uploadPodcastVideoFile(selectedVideoFile);
      applyUploadedVideo(video);
      setMessage('Podcast video uploaded. Review the URL, then save the podcast video.');
      onStatus('Podcast video uploaded.');
      return video;
    } catch (error) {
      setVideoUploadNote(error.message || 'Podcast video upload failed.');
      setMessage(error.message || 'Podcast video upload failed.');
      onStatus(error.message || 'Podcast video upload failed.');
      return null;
    } finally {
      setUploadingVideo(false);
    }
  }

  async function saveShow() {
    setSaving(true);
    setMessage('Saving podcast show settings...');
    const nextLibrary = publishPodcastLibrary(library);
    try {
      const data = await apiPostJson('/podcast.php', { action: 'save_show', show: nextLibrary.show });
      const savedLibrary = publishPodcastLibrary({ show: data.show, episodes: data.episodes, updatedAt: data.updated_at });
      setLibrary(savedLibrary);
      setMessage('Podcast show settings saved.');
      onStatus('Podcast show settings saved.');
    } catch (error) {
      setMessage(error.message || 'Podcast show settings were saved locally, but production storage did not update.');
      onStatus(error.message || 'Podcast show settings were saved locally.');
    } finally {
      setSaving(false);
    }
  }

  async function saveEpisode(event) {
    event.preventDefault();
    if (!episodeForm.title.trim() && !selectedVideoFile) {
      setMessage('A podcast video title is required.');
      return;
    }

    let formForSave = episodeForm;
    setSaving(true);
    if (selectedVideoFile) {
      setMessage('Uploading podcast video...');
      try {
        const video = await uploadPodcastVideoFile(selectedVideoFile);
        formForSave = createEpisodeForm({
          ...formForSave,
          title: formForSave.title.trim() ? formForSave.title : video.title,
          videoUrl: video.url
        });
        applyUploadedVideo(video);
      } catch (error) {
        setSaving(false);
        setVideoUploadNote(error.message || 'Podcast video upload failed.');
        setMessage(error.message || 'Podcast video upload failed.');
        onStatus(error.message || 'Podcast video upload failed.');
        return;
      }
    }

    if (!formForSave.title.trim()) {
      setSaving(false);
      setMessage('A podcast video title is required.');
      return;
    }
    if (formForSave.status === 'published' && !formForSave.videoUrl.trim()) {
      setSaving(false);
      setMessage('Upload a podcast video or paste a real video URL before publishing.');
      return;
    }

    const savedEpisode = formToEpisode(formForSave, library.episodes, editingId);
    setMessage('Saving podcast video...');

    const nextEpisodes = library.episodes.some(episode => episode.id === savedEpisode.id)
      ? library.episodes.map(episode => episode.id === savedEpisode.id ? savedEpisode : episode)
      : [savedEpisode, ...library.episodes];
    const localLibrary = publishPodcastLibrary({ ...library, episodes: nextEpisodes });
    setLibrary(localLibrary);

    try {
      const data = await apiPostJson('/podcast.php', { action: 'save_episode', episode: savedEpisode });
      const nextLibrary = publishPodcastLibrary({ show: data.show, episodes: data.episodes, updatedAt: data.updated_at });
      setLibrary(nextLibrary);
      setEpisodeForm(createEpisodeForm({ status: 'draft' }));
      setEditingId('');
      setMessage('Podcast video saved.');
      onStatus('Podcast video saved.');
    } catch (error) {
      setMessage(error.message || 'Podcast video was saved locally, but production storage did not update.');
      onStatus(error.message || 'Podcast video was saved locally.');
    } finally {
      setSaving(false);
    }
  }

  function editEpisode(episode) {
    setEditingId(episode.id);
    setEpisodeForm(createEpisodeForm(episode));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function duplicateEpisode(episode) {
    const copy = normalizePodcastEpisode({
      ...episode,
      id: uniqueEpisodeId(`${episode.id}-copy`, library.episodes),
      slug: '',
      title: `${episode.title} Copy`,
      status: 'draft'
    });
    setLibrary(current => publishPodcastLibrary({ ...current, episodes: [copy, ...current.episodes] }));
    setEditingId(copy.id);
    setEpisodeForm(createEpisodeForm(copy));
    setMessage('Podcast video duplicated as a draft. Select Save Podcast Video to publish the change.');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteEpisode(episode) {
    const nextEpisodes = library.episodes.filter(item => item.id !== episode.id);
    setLibrary(current => publishPodcastLibrary({ ...current, episodes: nextEpisodes }));
    if (editingId === episode.id) {
      setEditingId('');
      setEpisodeForm(createEpisodeForm({ status: 'draft' }));
    }
    setMessage('Removing podcast video...');
    try {
      const data = await apiPostJson('/podcast.php', { action: 'delete_episode', id: episode.id });
      setLibrary(publishPodcastLibrary({ show: data.show, episodes: data.episodes, updatedAt: data.updated_at }));
      setMessage('Podcast video removed.');
      onStatus('Podcast video removed.');
    } catch (error) {
      setMessage(error.message || 'Podcast video was removed locally, but production storage did not update.');
      onStatus(error.message || 'Podcast video was removed locally.');
    }
  }

  function clearForm() {
    setEditingId('');
    setEpisodeForm(createEpisodeForm({ status: 'draft' }));
    clearSelectedVideoFile();
    setVideoUploadNote('');
    setMessage('Podcast video form cleared.');
  }

  return (
    <section className="rtbo-dashboard-card podcast-builder-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Podcast Builder</p>
          <h3>The Jammed Up Bar! Podcast</h3>
          <p>Create and manage the real video sources shown on the public podcast page. Drafts stay private until they are published with a real video URL.</p>
        </div>
        <div className="button-row">
          <a className="btn secondary dark-btn" href="#podcast" target="_blank" rel="noopener">View Public Podcast</a>
          <button className="btn secondary dark-btn" type="button" onClick={() => setLibrary(current => publishPodcastLibrary({ ...current, show: defaultPodcastShow }))}>Restore Brand Settings</button>
        </div>
      </div>

      <div className="podcast-builder-summary-grid">
        <SummaryCard label="Videos" value={summary.total} detail="Total managed records" />
        <SummaryCard label="Published" value={summary.published} detail="Visible with real video URLs" />
        <SummaryCard label="Drafts" value={summary.drafts} detail="Private in the builder" />
        <SummaryCard label="Hidden" value={summary.hidden} detail="Archived or not visible" />
      </div>

      {message && <p className="rtbo-dashboard-status">{message}</p>}
      {loading && <p className="rtbo-empty-state">Loading Podcast Builder...</p>}

      <section className="podcast-builder-panel">
        <div className="podcast-builder-panel-head">
          <div>
            <h4>Show Settings</h4>
            <p>These fields control the public podcast landing page and the chrome player brand area.</p>
          </div>
          <button className="btn" type="button" onClick={saveShow} disabled={saving}>{saving ? 'Saving...' : 'Save Show Settings'}</button>
        </div>
        <div className="podcast-builder-field-grid">
          <label>Show Name<input value={library.show.name} onChange={(event) => updateShow('name', event.target.value)} /></label>
          <label>Short Name<input value={library.show.shortName} onChange={(event) => updateShow('shortName', event.target.value)} /></label>
          <label>Tagline<input value={library.show.tagline} onChange={(event) => updateShow('tagline', event.target.value)} /></label>
          <label>Brand Line<input value={library.show.brandLine} onChange={(event) => updateShow('brandLine', event.target.value)} /></label>
          <label className="span-two">Mission<textarea rows="4" value={library.show.mission} onChange={(event) => updateShow('mission', event.target.value)} /></label>
          <label className="span-two">Brand Meaning<textarea rows="3" value={library.show.brandMeaning} onChange={(event) => updateShow('brandMeaning', event.target.value)} /></label>
          <label>Audience<input value={library.show.audience} onChange={(event) => updateShow('audience', event.target.value)} /></label>
          <label>Release Schedule<input value={library.show.releaseSchedule} onChange={(event) => updateShow('releaseSchedule', event.target.value)} /></label>
          <label>Logo URL<input value={library.show.logo} onChange={(event) => updateShow('logo', event.target.value)} /></label>
          <label>Card Logo URL<input value={library.show.logoCard} onChange={(event) => updateShow('logoCard', event.target.value)} /></label>
          <label>Logo Mark URL<input value={library.show.logoMark} onChange={(event) => updateShow('logoMark', event.target.value)} /></label>
          <label>Social Card URL<input value={library.show.socialCard} onChange={(event) => updateShow('socialCard', event.target.value)} /></label>
        </div>
      </section>

      <form className="podcast-builder-panel" ref={formRef} onSubmit={saveEpisode}>
        <div className="podcast-builder-panel-head">
          <div>
            <h4>{editingId ? 'Update Podcast Video' : 'Add Podcast Video'}</h4>
            <p>Upload an actual video file or paste a real direct video URL that the browser can play.</p>
          </div>
          <div className="button-row">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Podcast Video'}</button>
            <button className="btn secondary dark-btn" type="button" onClick={clearForm}>Clear Form</button>
          </div>
        </div>
        <div className="podcast-builder-field-grid">
          <label>Title *<input name="title" value={episodeForm.title} onChange={updateEpisodeForm} required /></label>
          <label>Status<select name="status" value={episodeForm.status} onChange={updateEpisodeForm}><option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select></label>
          <label>Slug<input name="slug" value={episodeForm.slug} onChange={updateEpisodeForm} placeholder="Auto-generated from title" /></label>
          <label>Category<input name="category" value={episodeForm.category} onChange={updateEpisodeForm} placeholder="Interview, training, spotlight..." /></label>
          <label>Season<input name="season" inputMode="numeric" value={episodeForm.season} onChange={updateEpisodeForm} /></label>
          <label>Episode<input name="episode" inputMode="numeric" value={episodeForm.episode} onChange={updateEpisodeForm} /></label>
          <label>Publish Date<input name="publishedAt" type="date" value={episodeForm.publishedAt} onChange={updateEpisodeForm} /></label>
          <label>Runtime<input name="runtime" value={episodeForm.runtime} onChange={updateEpisodeForm} placeholder="42 min" /></label>
          <label className="span-two">Subtitle<input name="subtitle" value={episodeForm.subtitle} onChange={updateEpisodeForm} /></label>
          <label className="span-two">Description<textarea name="description" rows="4" value={episodeForm.description} onChange={updateEpisodeForm} /></label>
          <div className="span-two podcast-builder-upload-field">
            <label htmlFor="podcast-video-upload">Actual Video Upload</label>
            <div className="podcast-builder-upload-control">
              <input ref={videoInputRef} id="podcast-video-upload" type="file" accept={PODCAST_VIDEO_ACCEPT} onChange={choosePodcastVideo} />
              <div>
                <strong>{selectedVideoFile ? selectedVideoFile.name : 'Choose MP4, WebM, MOV, or M4V video'}</strong>
                <small>{videoUploadNote || 'Upload a video to generate the playable URL automatically. Files must be 700MB or smaller.'}</small>
              </div>
              <button className="btn secondary dark-btn" type="button" onClick={uploadSelectedVideo} disabled={saving || uploadingVideo || !selectedVideoFile}>
                {uploadingVideo ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </div>
          <label className="span-two">Video URL {episodeForm.status === 'published' ? '*' : ''}<input name="videoUrl" type="url" value={episodeForm.videoUrl} onChange={updateEpisodeForm} required={episodeForm.status === 'published'} placeholder="https://.../episode.mp4 or /api/podcast-video.php?file=..." /></label>
          <label className="span-two">Poster Image URL<input name="posterUrl" type="url" value={episodeForm.posterUrl} onChange={updateEpisodeForm} placeholder="/assets/podcast/..." /></label>
          <label className="span-two">Guests<input name="guests" value={episodeForm.guests} onChange={updateEpisodeForm} /></label>
          <label className="span-two">Transcript / Captions Text<textarea name="transcript" rows="5" value={episodeForm.transcript} onChange={updateEpisodeForm} /></label>
        </div>
      </form>

      <section className="podcast-builder-panel">
        <div className="podcast-builder-panel-head">
          <div>
            <h4>Podcast Video Library</h4>
            <p>Search, edit, duplicate, or remove managed podcast videos.</p>
          </div>
          <div className="podcast-builder-filters">
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search podcast videos" aria-label="Search podcast videos" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter podcast videos by status">
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>

        {visibleEpisodes.length === 0 ? (
          <p className="rtbo-empty-state">No podcast videos are managed yet. Add a real video source above to start the library.</p>
        ) : (
          <div className="podcast-builder-table">
            {visibleEpisodes.map(episode => (
              <article key={episode.id}>
                <img src={episode.posterUrl || library.show.logoCard || defaultPodcastShow.logoCard} alt="" />
                <div>
                  <span>{episode.status}</span>
                  <strong>{episode.title}</strong>
                  <small>{[episode.category, episode.publishedAt, episode.runtime].filter(Boolean).join(' / ') || 'No episode details set'}</small>
                  <p>{episode.videoUrl || 'No video URL assigned yet.'}</p>
                </div>
                <div className="podcast-builder-row-actions">
                  <button className="btn secondary dark-btn" type="button" onClick={() => editEpisode(episode)}>Edit</button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => duplicateEpisode(episode)}>Duplicate</button>
                  <button className="btn secondary dark-btn danger" type="button" onClick={() => deleteEpisode(episode)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
