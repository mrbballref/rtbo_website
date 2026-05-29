import React, { useEffect, useMemo, useRef, useState } from 'react';
import RTBIPadVideoPlayer from './RTBIPadVideoPlayer.jsx';
import {
  clientSpotlightSlug,
  defaultClientSpotlightShow,
  normalizeClientSpotlightLibrary,
  normalizeClientSpotlightVideo,
  publishClientSpotlightLibrary,
  readStoredClientSpotlightLibrary,
  visibleClientSpotlightVideos
} from './client-spotlight-data.js';
import './podcast-builder.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const SPOTLIGHT_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v';
const SPOTLIGHT_CATEGORIES = [
  'Coach Conversation',
  'Player Conversation',
  'Official Conversation',
  'Training School Highlight',
  'Promotional Video',
  'Partner Spotlight'
];

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

function createVideoForm(video = {}) {
  return {
    id: video.id || '',
    slug: video.slug || '',
    title: video.title || '',
    subtitle: video.subtitle || '',
    description: video.description || '',
    status: video.status || 'draft',
    category: video.category || SPOTLIGHT_CATEGORIES[0],
    featuredPerson: video.featuredPerson || '',
    role: video.role || '',
    affiliation: video.affiliation || '',
    eventName: video.eventName || '',
    eventDate: video.eventDate || '',
    publishedAt: video.publishedAt || '',
    runtime: video.runtime || '',
    videoUrl: video.videoUrl || '',
    posterUrl: video.posterUrl || '',
    transcript: video.transcript || ''
  };
}

function uniqueVideoId(baseId, videos = []) {
  const existing = new Set(videos.map(video => video.id));
  const base = clientSpotlightSlug(baseId || 'client-spotlight-video');
  if (!existing.has(base)) return base;

  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function formToVideo(form, videos, editingId = '') {
  const title = form.title.trim();
  const id = editingId || form.id || uniqueVideoId(title, videos);
  return normalizeClientSpotlightVideo({
    ...form,
    id,
    slug: form.slug || id
  });
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="podcast-builder-summary-card client-spotlight-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default function ClientSpotlightStudio({ onStatus = () => {} }) {
  const formRef = useRef(null);
  const videoInputRef = useRef(null);
  const [library, setLibrary] = useState(readStoredClientSpotlightLibrary);
  const [videoForm, setVideoForm] = useState(createVideoForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [videoUploadNote, setVideoUploadNote] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewId, setPreviewId] = useState('');

  const summary = useMemo(() => ({
    total: library.videos.length,
    published: visibleClientSpotlightVideos(library.videos).length,
    drafts: library.videos.filter(video => video.status === 'draft').length,
    hidden: library.videos.filter(video => video.status === 'hidden').length
  }), [library.videos]);

  const previewVideos = useMemo(() => visibleClientSpotlightVideos(library.videos), [library.videos]);
  const previewPlaylist = useMemo(() => previewVideos.map(video => ({
    id: video.id,
    title: video.title,
    poster: video.posterUrl || library.show.logoCard || defaultClientSpotlightShow.logoCard,
    sources: [{ src: video.videoUrl }],
    transcript: video.transcript
  })), [library.show.logoCard, previewVideos]);

  const visibleVideos = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return library.videos.filter(video => {
      const statusMatch = statusFilter === 'all' || video.status === statusFilter;
      const queryMatch = !needle || [
        video.title,
        video.subtitle,
        video.description,
        video.category,
        video.featuredPerson,
        video.affiliation,
        video.eventName,
        video.videoUrl
      ].join(' ').toLowerCase().includes(needle);
      return statusMatch && queryMatch;
    });
  }, [library.videos, query, statusFilter]);

  useEffect(() => {
    let active = true;
    async function loadClientSpotlight() {
      setLoading(true);
      try {
        const data = await apiGet('/client-spotlight.php?scope=admin');
        if (!active) return;
        const nextLibrary = publishClientSpotlightLibrary({ show: data.show, videos: data.videos, updatedAt: data.updated_at });
        setLibrary(nextLibrary);
        setMessage('Client Spotlight Studio loaded from production storage.');
      } catch (error) {
        if (!active) return;
        setLibrary(readStoredClientSpotlightLibrary());
        setMessage(error.status === 401 ? 'Admin sign-in is required to save Client Spotlight changes.' : 'Client Spotlight Studio loaded from local fallback storage.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClientSpotlight();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!previewPlaylist.length) {
      setPreviewId('');
      return;
    }
    if (!previewPlaylist.some(item => item.id === previewId)) {
      setPreviewId(previewPlaylist[0].id);
    }
  }, [previewId, previewPlaylist]);

  function updateShow(field, value) {
    setLibrary(current => normalizeClientSpotlightLibrary({
      ...current,
      show: { ...current.show, [field]: value }
    }));
  }

  function updateVideoForm(event) {
    const { name, value } = event.target;
    setVideoForm(current => ({ ...current, [name]: value }));
  }

  function clearSelectedVideoFile() {
    setSelectedVideoFile(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  }

  function chooseSpotlightVideo(event) {
    const file = event.target.files?.[0] || null;
    setSelectedVideoFile(file);
    setVideoUploadNote(file ? `${file.name} selected (${formatFileSize(file.size)})` : '');
  }

  async function uploadSpotlightVideoFile(file) {
    const payload = new FormData();
    payload.append('video', file);
    const data = await apiPostForm('/client-spotlight-video-upload.php', payload);
    if (!data.video?.url) {
      throw new Error('The server did not return a playable Client Spotlight video URL.');
    }
    return data.video;
  }

  function applyUploadedVideo(video) {
    setVideoForm(current => createVideoForm({
      ...current,
      title: current.title.trim() ? current.title : video.title,
      videoUrl: video.url
    }));
    clearSelectedVideoFile();
    setVideoUploadNote(`Uploaded ${video.title} and filled the Video URL field.`);
  }

  async function uploadSelectedVideo() {
    if (!selectedVideoFile) {
      setVideoUploadNote('Choose a Client Spotlight video file before uploading.');
      return null;
    }

    setUploadingVideo(true);
    setMessage('Uploading Client Spotlight video...');
    try {
      const video = await uploadSpotlightVideoFile(selectedVideoFile);
      applyUploadedVideo(video);
      setMessage('Client Spotlight video uploaded. Review the URL, then save the record.');
      onStatus('Client Spotlight video uploaded.');
      return video;
    } catch (error) {
      setVideoUploadNote(error.message || 'Client Spotlight video upload failed.');
      setMessage(error.message || 'Client Spotlight video upload failed.');
      onStatus(error.message || 'Client Spotlight video upload failed.');
      return null;
    } finally {
      setUploadingVideo(false);
    }
  }

  async function saveShow() {
    setSaving(true);
    setMessage('Saving Client Spotlight settings...');
    const nextLibrary = publishClientSpotlightLibrary(library);
    try {
      const data = await apiPostJson('/client-spotlight.php', { action: 'save_show', show: nextLibrary.show });
      const savedLibrary = publishClientSpotlightLibrary({ show: data.show, videos: data.videos, updatedAt: data.updated_at });
      setLibrary(savedLibrary);
      setMessage('Client Spotlight settings saved.');
      onStatus('Client Spotlight settings saved.');
    } catch (error) {
      setMessage(error.message || 'Client Spotlight settings were saved locally, but production storage did not update.');
      onStatus(error.message || 'Client Spotlight settings were saved locally.');
    } finally {
      setSaving(false);
    }
  }

  async function saveVideo(event) {
    event.preventDefault();
    if (!videoForm.title.trim() && !selectedVideoFile) {
      setMessage('A Client Spotlight video title is required.');
      return;
    }

    let formForSave = videoForm;
    setSaving(true);
    if (selectedVideoFile) {
      setMessage('Uploading Client Spotlight video...');
      try {
        const video = await uploadSpotlightVideoFile(selectedVideoFile);
        formForSave = createVideoForm({
          ...formForSave,
          title: formForSave.title.trim() ? formForSave.title : video.title,
          videoUrl: video.url
        });
        applyUploadedVideo(video);
      } catch (error) {
        setSaving(false);
        setVideoUploadNote(error.message || 'Client Spotlight video upload failed.');
        setMessage(error.message || 'Client Spotlight video upload failed.');
        onStatus(error.message || 'Client Spotlight video upload failed.');
        return;
      }
    }

    if (!formForSave.title.trim()) {
      setSaving(false);
      setMessage('A Client Spotlight video title is required.');
      return;
    }
    if (formForSave.status === 'published' && !formForSave.videoUrl.trim()) {
      setSaving(false);
      setMessage('Upload a Client Spotlight video or paste a real video URL before publishing.');
      return;
    }

    const savedVideo = formToVideo(formForSave, library.videos, editingId);
    setMessage('Saving Client Spotlight video...');

    const nextVideos = library.videos.some(video => video.id === savedVideo.id)
      ? library.videos.map(video => video.id === savedVideo.id ? savedVideo : video)
      : [savedVideo, ...library.videos];
    const localLibrary = publishClientSpotlightLibrary({ ...library, videos: nextVideos });
    setLibrary(localLibrary);

    try {
      const data = await apiPostJson('/client-spotlight.php', { action: 'save_video', video: savedVideo });
      const nextLibrary = publishClientSpotlightLibrary({ show: data.show, videos: data.videos, updatedAt: data.updated_at });
      setLibrary(nextLibrary);
      setVideoForm(createVideoForm({ status: 'draft' }));
      setEditingId('');
      setMessage('Client Spotlight video saved.');
      onStatus('Client Spotlight video saved.');
    } catch (error) {
      setMessage(error.message || 'Client Spotlight video was saved locally, but production storage did not update.');
      onStatus(error.message || 'Client Spotlight video was saved locally.');
    } finally {
      setSaving(false);
    }
  }

  function editVideo(video) {
    setEditingId(video.id);
    setVideoForm(createVideoForm(video));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function duplicateVideo(video) {
    const copy = normalizeClientSpotlightVideo({
      ...video,
      id: uniqueVideoId(`${video.id}-copy`, library.videos),
      slug: '',
      title: `${video.title} Copy`,
      status: 'draft'
    });
    setLibrary(current => publishClientSpotlightLibrary({ ...current, videos: [copy, ...current.videos] }));
    setEditingId(copy.id);
    setVideoForm(createVideoForm(copy));
    setMessage('Client Spotlight video duplicated as a draft. Select Save Spotlight Video to publish the change.');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteVideo(video) {
    const nextVideos = library.videos.filter(item => item.id !== video.id);
    setLibrary(current => publishClientSpotlightLibrary({ ...current, videos: nextVideos }));
    if (editingId === video.id) {
      setEditingId('');
      setVideoForm(createVideoForm({ status: 'draft' }));
    }
    setMessage('Removing Client Spotlight video...');
    try {
      const data = await apiPostJson('/client-spotlight.php', { action: 'delete_video', id: video.id });
      setLibrary(publishClientSpotlightLibrary({ show: data.show, videos: data.videos, updatedAt: data.updated_at }));
      setMessage('Client Spotlight video removed.');
      onStatus('Client Spotlight video removed.');
    } catch (error) {
      setMessage(error.message || 'Client Spotlight video was removed locally, but production storage did not update.');
      onStatus(error.message || 'Client Spotlight video was removed locally.');
    }
  }

  function clearForm() {
    setEditingId('');
    setVideoForm(createVideoForm({ status: 'draft' }));
    clearSelectedVideoFile();
    setVideoUploadNote('');
    setMessage('Client Spotlight video form cleared.');
  }

  return (
    <section className="rtbo-dashboard-card podcast-builder-page client-spotlight-studio-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Production Studio</p>
          <h3>Client Spotlight Studio</h3>
          <p>Create, upload, publish, hide, or remove the real videos shown in the Client Spotlight section on the home page. Drafts stay private until they are published with a playable video URL.</p>
        </div>
        <div className="button-row">
          <a className="btn secondary dark-btn" href="#home" target="_blank" rel="noopener">View Home Spotlight</a>
          <button className="btn secondary dark-btn" type="button" onClick={() => setLibrary(current => publishClientSpotlightLibrary({ ...current, show: defaultClientSpotlightShow }))}>Restore Brand Settings</button>
        </div>
      </div>

      <div className="podcast-builder-summary-grid">
        <SummaryCard label="Videos" value={summary.total} detail="Total managed records" />
        <SummaryCard label="Published" value={summary.published} detail="Visible on the home page" />
        <SummaryCard label="Drafts" value={summary.drafts} detail="Private in the studio" />
        <SummaryCard label="Hidden" value={summary.hidden} detail="Archived or not visible" />
      </div>

      {message && <p className="rtbo-dashboard-status">{message}</p>}
      {loading && <p className="rtbo-empty-state">Loading Client Spotlight Studio...</p>}

      <section className="client-spotlight-preview-panel">
        <div>
          <p className="eyebrow">Home Page Preview</p>
          <h4>Published videos appear in this iPad player.</h4>
          <p>Only published records with real video URLs are sent to the public Client Spotlight section.</p>
        </div>
        <RTBIPadVideoPlayer
          className="client-spotlight-studio-player"
          brand={library.show.shortName || defaultClientSpotlightShow.shortName}
          title={library.show.name || defaultClientSpotlightShow.name}
          logoSrc={library.show.logoMark || library.show.logo || defaultClientSpotlightShow.logo}
          status={previewPlaylist.length ? 'Client Spotlight' : 'Standby'}
          playlist={previewPlaylist}
          selectedId={previewId}
          onSelect={setPreviewId}
          emptyTitle="No published Client Spotlight videos yet"
          emptyMessage="Upload a real video, set it to Published, and save it to preview it here and on the home page."
          settingsNote="The public Client Spotlight player only loads published videos with playable video URLs."
        />
      </section>

      <section className="podcast-builder-panel">
        <div className="podcast-builder-panel-head">
          <div>
            <h4>Spotlight Settings</h4>
            <p>These fields control the public Client Spotlight section and the iPad player brand area.</p>
          </div>
          <button className="btn" type="button" onClick={saveShow} disabled={saving}>{saving ? 'Saving...' : 'Save Spotlight Settings'}</button>
        </div>
        <div className="podcast-builder-field-grid">
          <label>Section Name<input value={library.show.name} onChange={(event) => updateShow('name', event.target.value)} /></label>
          <label>Short Name<input value={library.show.shortName} onChange={(event) => updateShow('shortName', event.target.value)} /></label>
          <label className="span-two">Tagline<input value={library.show.tagline} onChange={(event) => updateShow('tagline', event.target.value)} /></label>
          <label>Brand Line<input value={library.show.brandLine} onChange={(event) => updateShow('brandLine', event.target.value)} /></label>
          <label>Logo URL<input value={library.show.logo} onChange={(event) => updateShow('logo', event.target.value)} /></label>
          <label>Card Logo URL<input value={library.show.logoCard} onChange={(event) => updateShow('logoCard', event.target.value)} /></label>
          <label>Logo Mark URL<input value={library.show.logoMark} onChange={(event) => updateShow('logoMark', event.target.value)} /></label>
          <label className="span-two">Mission<textarea rows="4" value={library.show.mission} onChange={(event) => updateShow('mission', event.target.value)} /></label>
        </div>
      </section>

      <form className="podcast-builder-panel" ref={formRef} onSubmit={saveVideo}>
        <div className="podcast-builder-panel-head">
          <div>
            <h4>{editingId ? 'Update Client Spotlight Video' : 'Add Client Spotlight Video'}</h4>
            <p>Upload an actual video file or paste a real direct video URL that the browser can play.</p>
          </div>
          <div className="button-row">
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Spotlight Video'}</button>
            <button className="btn secondary dark-btn" type="button" onClick={clearForm}>Clear Form</button>
          </div>
        </div>
        <div className="podcast-builder-field-grid">
          <label>Title *<input name="title" value={videoForm.title} onChange={updateVideoForm} required /></label>
          <label>Status<select name="status" value={videoForm.status} onChange={updateVideoForm}><option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select></label>
          <label>Category<select name="category" value={videoForm.category} onChange={updateVideoForm}>{SPOTLIGHT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
          <label>Slug<input name="slug" value={videoForm.slug} onChange={updateVideoForm} placeholder="Auto-generated from title" /></label>
          <label>Featured Person<input name="featuredPerson" value={videoForm.featuredPerson} onChange={updateVideoForm} placeholder="Coach, player, official, or guest" /></label>
          <label>Role<input name="role" value={videoForm.role} onChange={updateVideoForm} placeholder="Head Coach, Official, Player..." /></label>
          <label>Affiliation<input name="affiliation" value={videoForm.affiliation} onChange={updateVideoForm} placeholder="School, event, or organization" /></label>
          <label>Event Name<input name="eventName" value={videoForm.eventName} onChange={updateVideoForm} /></label>
          <label>Event Date<input name="eventDate" type="date" value={videoForm.eventDate} onChange={updateVideoForm} /></label>
          <label>Publish Date<input name="publishedAt" type="date" value={videoForm.publishedAt} onChange={updateVideoForm} /></label>
          <label>Runtime<input name="runtime" value={videoForm.runtime} onChange={updateVideoForm} placeholder="8 min" /></label>
          <label className="span-two">Subtitle<input name="subtitle" value={videoForm.subtitle} onChange={updateVideoForm} /></label>
          <label className="span-two">Description<textarea name="description" rows="4" value={videoForm.description} onChange={updateVideoForm} /></label>
          <div className="span-two podcast-builder-upload-field client-spotlight-upload-field">
            <span className="client-spotlight-field-label">Actual Video Upload</span>
            <div className="podcast-builder-upload-control client-spotlight-upload-control">
              <input ref={videoInputRef} id="client-spotlight-video-upload" className="client-spotlight-hidden-file" type="file" accept={SPOTLIGHT_VIDEO_ACCEPT} onChange={chooseSpotlightVideo} />
              <label className="btn" htmlFor="client-spotlight-video-upload">Choose Spotlight Video</label>
              <div>
                <strong>{selectedVideoFile ? selectedVideoFile.name : 'MP4, WebM, MOV, or M4V video'}</strong>
                <small>{videoUploadNote || 'Upload a real interview, school highlight, or promotional video. Files must be 700MB or smaller.'}</small>
              </div>
              <button className="btn secondary dark-btn" type="button" onClick={uploadSelectedVideo} disabled={saving || uploadingVideo || !selectedVideoFile}>
                {uploadingVideo ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </div>
          <label className="span-two">Video URL {videoForm.status === 'published' ? '*' : ''}<input name="videoUrl" type="url" value={videoForm.videoUrl} onChange={updateVideoForm} required={videoForm.status === 'published'} placeholder="https://.../spotlight.mp4 or /api/client-spotlight-video.php?file=..." /></label>
          <label className="span-two">Poster Image URL<input name="posterUrl" type="url" value={videoForm.posterUrl} onChange={updateVideoForm} placeholder="/assets/images/clients/..." /></label>
          <label className="span-two">Transcript / Captions Text<textarea name="transcript" rows="5" value={videoForm.transcript} onChange={updateVideoForm} /></label>
        </div>
      </form>

      <section className="podcast-builder-panel">
        <div className="podcast-builder-panel-head">
          <div>
            <h4>Client Spotlight Library</h4>
            <p>Search, edit, duplicate, or remove managed spotlight videos.</p>
          </div>
          <div className="podcast-builder-filters">
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search spotlight videos" aria-label="Search Client Spotlight videos" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter Client Spotlight videos by status">
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>

        {visibleVideos.length === 0 ? (
          <p className="rtbo-empty-state">No Client Spotlight videos are managed yet. Add a real video source above to start the library.</p>
        ) : (
          <div className="podcast-builder-table">
            {visibleVideos.map(video => (
              <article key={video.id}>
                <img src={video.posterUrl || library.show.logoCard || defaultClientSpotlightShow.logoCard} alt="" />
                <div>
                  <span>{video.status}</span>
                  <strong>{video.title}</strong>
                  <small>{[video.category, video.featuredPerson, video.affiliation, video.publishedAt || video.eventDate, video.runtime].filter(Boolean).join(' / ') || 'No spotlight details set'}</small>
                  <p>{video.videoUrl || 'No video URL assigned yet.'}</p>
                </div>
                <div className="podcast-builder-row-actions">
                  <button className="btn secondary dark-btn" type="button" onClick={() => editVideo(video)}>Edit</button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => duplicateVideo(video)}>Duplicate</button>
                  <button className="btn secondary dark-btn danger" type="button" onClick={() => deleteVideo(video)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
