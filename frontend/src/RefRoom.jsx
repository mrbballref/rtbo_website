import React, { useEffect, useMemo, useRef, useState } from 'react';
import './refroom.css';

const REFROOM_PANELS = ['Studio', 'Meetings', 'Breakouts', 'Surveys', 'Participants', 'Chat', 'Production', 'Recordings', 'Settings'];
const PLAYER_PANELS = ['Studio'];
const PRODUCTION_PANELS = ['Production'];
const REFROOM_LAYOUTS = ['Speaker View', 'Gallery View', 'Film Study', 'Screen Share', 'Broadcast Desk'];
const REACTIONS = ['Applause', 'Agree', 'Question', 'Slow Down', 'Rule Check'];
const EMOJI_REACTIONS = ['👍', '👏', '✅', '❓', '🔥', '🎥', '🏀', '🙌', '💬', '⭐'];
const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';
const PARTICIPANT_ROLES = ['attendee', 'presenter', 'co_host', 'host'];
const SURVEY_TYPES = ['Single Choice', 'Multiple Choice', 'Short Answer', 'Rating'];
const LOGO_SRC = '/assets/images/logo.png';
const PUBLIC_PLAYER_POSTER = '/assets/images/3d_rtbo_livestream_player.jpg';
const VIRTUAL_BACKGROUNDS = [
  { id: 'rtbo-logo', label: 'RTBO Logo', value: LOGO_SRC },
  { id: 'court', label: 'Court', value: '/assets/images/three-person-crew.jpg' },
  { id: 'training', label: 'Training', value: '/assets/images/rtbo_web_banner.jpg' },
  { id: 'studio', label: 'Studio', value: '/assets/images/3d_rtbo_livestream_player.jpg' }
];

const DEFAULT_SETTINGS = {
  roomTitle: 'RefRoom',
  passcode: '',
  waitingRoom: true,
  captions: true,
  liveTranscript: true,
  chat: true,
  participantsPanel: true,
  autoRecord: false,
  saveAllRecordings: true,
  saveMeetingChats: true,
  allowScreenShare: true,
  selectedLayout: 'Speaker View',
  recordingQuality: '1080p',
  meetingMode: 'Meeting + Training Studio'
};

const EMPTY_ROOM_FORM = {
  title: '',
  date: '',
  time: '',
  purpose: '',
  passcode: '',
  invited_member_ids: [],
  invited_emails: '',
  sendInvitations: false
};

const EMPTY_SURVEY_FORM = {
  title: '',
  question: '',
  type: 'Single Choice',
  options: 'Yes\nNo',
  anonymous: true
};

const DEFAULT_PRODUCTION = {
  lowerThird: true,
  brandOverlay: true,
  backgroundBlur: false,
  backgroundMode: 'rtbo-logo',
  backgroundImage: LOGO_SRC,
  customBackground: '',
  cleanBackgroundEdges: true,
  destination: '',
  overlayText: 'RTBO RefRoom',
  programNote: ''
};

function scopedKey(user = {}, scope = 'state') {
  const identity = String(user.email || user.id || user.role || 'guest').toLowerCase();
  return `rtbo-refroom-${scope}:${identity}`;
}

function refroomCodeFromHash() {
  if (typeof window === 'undefined') return '';
  const [, code = ''] = String(window.location.hash || '').replace(/^#\/?/, '').split('/');
  try {
    return decodeURIComponent(code).trim();
  } catch {
    return code.trim();
  }
}

function safeReadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage can be unavailable in private windows. The room still works for the current session.
  }
}

function createId(prefix = 'refroom') {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMeetingCode() {
  return `REF-${Math.random().toString(36).slice(2, 5).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function dateInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function timeInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseInviteEmails(value = '') {
  return Array.from(new Set(
    String(value)
      .split(/[\s,;]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ));
}

function inviteRecipientCount(room = {}) {
  const memberCount = Array.isArray(room.invited_member_ids) ? room.invited_member_ids.length : 0;
  const emailCount = Array.isArray(room.invited_emails) ? room.invited_emails.length : parseInviteEmails(room.invited_emails).length;
  return memberCount + emailCount;
}

async function refroomApiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

async function refroomApiPost(endpoint, payload) {
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

function userInitials(user = {}) {
  const name = String(user.name || user.email || user.role || 'User').trim();
  return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'RR';
}

function displayName(user = {}) {
  return user.name || user.email || 'Current User';
}

function memberLabel(member = {}) {
  return [member.name || member.email || 'Member', String(member.role_label || member.role || '').replace(/_/g, ' ')].filter(Boolean).join(' / ');
}

function formatClock(seconds = 0) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map(value => String(value).padStart(2, '0')).join(':');
}

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function supportedMimeType() {
  if (!window.MediaRecorder) return '';
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ].find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function safeFilename(value = 'refroom') {
  return String(value || 'refroom')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'refroom';
}

function downloadBlob(blob, filename) {
  if (!blob || blob.size <= 0) return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function downloadTextFile(filename, text) {
  return downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
}

function downloadJsonFile(filename, value) {
  return downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }), filename);
}

function participantIdForMember(member = {}) {
  return `member-${member.id}`;
}

function participantLocationLabel(value = 'main', rooms = []) {
  if (value === 'main') return 'Main Room';
  if (value === 'waiting') return 'Main Waiting Room';
  if (value.startsWith('room:')) {
    const id = value.slice(5);
    return rooms.find(room => String(room.id) === String(id))?.name || 'Breakout Room';
  }
  if (value.startsWith('waiting:')) {
    const id = value.slice(8);
    const name = rooms.find(room => String(room.id) === String(id))?.name || 'Breakout Room';
    return `${name} Waiting Room`;
  }
  return 'Main Room';
}

function formatChatExport(messages = [], title = 'RefRoom Chat') {
  if (messages.length === 0) {
    return `${title}\nNo messages were saved for this meeting.\n`;
  }
  return [
    title,
    `Saved: ${new Date().toLocaleString()}`,
    '',
    ...messages.map(message => [
      `[${formatDateTime(message.at)}] ${message.user || 'Participant'}`,
      message.meetingTitle ? `Meeting: ${message.meetingTitle}${message.meetingCode ? ` (${message.meetingCode})` : ''}` : '',
      message.message || message.emoji || ''
    ].filter(Boolean).join('\n'))
  ].join('\n\n');
}

function CameraFeedTile({ feed, onRemove, onMakePrimary }) {
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.srcObject = feed.stream || null;
    }
  }, [feed.stream]);

  return (
    <article className="rtbo-refroom-camera-tile">
      <video ref={feedRef} autoPlay playsInline muted />
      <div>
        <strong>{feed.label}</strong>
        <small>{feed.deviceId ? 'Camera source' : 'Browser camera'}</small>
      </div>
      <div className="rtbo-refroom-card-actions">
        <button type="button" onClick={() => onMakePrimary(feed)}>Make Primary</button>
        <button className="danger" type="button" onClick={() => onRemove(feed.id)}>Remove</button>
      </div>
    </article>
  );
}

export default function RefRoom({ user = {}, onStatus = () => {}, canManageMeetings = false, mode = 'workspace' }) {
  const isPublicPlayer = mode === 'player';
  const isProductionStudio = mode === 'production';
  const panelOptions = isProductionStudio ? PRODUCTION_PANELS : isPublicPlayer ? PLAYER_PANELS : REFROOM_PANELS;
  const displayUser = useMemo(
    () => (isPublicPlayer && !user.name && !user.email ? { ...user, name: 'RTBO RefRoom', role: 'viewer' } : user),
    [isPublicPlayer, user]
  );
  const videoRef = useRef(null);
  const viewportRef = useRef(null);
  const recorderRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraFeedsRef = useRef([]);
  const audioFeedsRef = useRef([]);
  const recordingAudioContextRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(null);
  const meetingFormRef = useRef(null);

  const [activePanel, setActivePanel] = useState(() => isProductionStudio ? 'Production' : 'Studio');
  const [roomActive, setRoomActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [captionsOpen, setCaptionsOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [reaction, setReaction] = useState('');
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [chatEmojiPickerOpen, setChatEmojiPickerOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(() => Number(safeReadJson(scopedKey(displayUser, 'volume'), 80)) || 80);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [deviceError, setDeviceError] = useState('');
  const [devices, setDevices] = useState({ audioInputs: [], videoInputs: [] });
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedExtraCameraDevice, setSelectedExtraCameraDevice] = useState('');
  const [selectedExtraAudioDevice, setSelectedExtraAudioDevice] = useState('');
  const [cameraFeeds, setCameraFeeds] = useState([]);
  const [cameraSources, setCameraSources] = useState(() => safeReadJson(scopedKey(displayUser, 'cameraSources'), []));
  const [audioFeeds, setAudioFeeds] = useState([]);
  const [audioSources, setAudioSources] = useState(() => safeReadJson(scopedKey(displayUser, 'audioSources'), []));
  const [captionDraft, setCaptionDraft] = useState('');
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [invitationSendingId, setInvitationSendingId] = useState('');
  const [activeMeetingId, setActiveMeetingId] = useState('');
  const [breakoutRooms, setBreakoutRooms] = useState(() => safeReadJson(scopedKey(displayUser, 'breakoutRooms'), []));
  const [breakoutName, setBreakoutName] = useState('');
  const [participantLocations, setParticipantLocations] = useState(() => safeReadJson(scopedKey(displayUser, 'participantLocations'), {}));
  const [participantRoles, setParticipantRoles] = useState(() => safeReadJson(scopedKey(displayUser, 'participantRoles'), {}));
  const [surveyForm, setSurveyForm] = useState(EMPTY_SURVEY_FORM);
  const [surveys, setSurveys] = useState(() => safeReadJson(scopedKey(displayUser, 'surveys'), []));
  const [production, setProduction] = useState(() => ({
    ...DEFAULT_PRODUCTION,
    ...safeReadJson(scopedKey(displayUser, 'production'), {})
  }));
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    roomTitle: isPublicPlayer ? 'RefRoom Public Player' : DEFAULT_SETTINGS.roomTitle,
    meetingCode: refroomCodeFromHash() || createMeetingCode(),
    ...(isPublicPlayer ? {} : safeReadJson(scopedKey(displayUser, 'settings'), {}))
  }));
  const [rooms, setRooms] = useState(() => isPublicPlayer ? [] : safeReadJson(scopedKey(displayUser, 'rooms'), []));
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM_FORM);
  const [editingRoomId, setEditingRoomId] = useState('');
  const [publicMeetingCreatorOpen, setPublicMeetingCreatorOpen] = useState(false);
  const [messages, setMessages] = useState(() => safeReadJson(scopedKey(displayUser, 'messages'), []));
  const [messageDraft, setMessageDraft] = useState('');
  const [recordings, setRecordings] = useState(() => safeReadJson(scopedKey(displayUser, 'recordings'), []));
  const [transcript, setTranscript] = useState(() => safeReadJson(scopedKey(displayUser, 'transcript'), []));

  const programStream = screenSharing && screenStream ? screenStream : localStream;
  const activeMeeting = useMemo(() => rooms.find(room => String(room.id) === String(activeMeetingId)) || null, [activeMeetingId, rooms]);
  const currentParticipant = useMemo(() => ({
    id: 'current-user',
    name: displayName(displayUser),
    role: displayUser.role || 'member',
    status: roomActive ? (recording ? 'Recording' : 'In Room') : 'Not Connected',
    mic: micEnabled,
    camera: cameraEnabled,
    email: displayUser.email || '',
    isCurrentUser: true
  }), [cameraEnabled, displayUser, micEnabled, recording, roomActive]);
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter(member => [member.name, member.email, member.role_label, member.role].some(value => String(value || '').toLowerCase().includes(query)));
  }, [memberSearch, members]);
  const selectedInviteMembers = useMemo(() => {
    const selectedIds = new Set((roomForm.invited_member_ids || []).map(id => String(id)));
    return members.filter(member => selectedIds.has(String(member.id)));
  }, [members, roomForm.invited_member_ids]);
  const activeMeetingInviteMembers = useMemo(() => {
    const ids = activeMeeting?.invited_member_ids || roomForm.invited_member_ids || [];
    const selectedIds = new Set(ids.map(id => String(id)));
    return members.filter(member => selectedIds.has(String(member.id)));
  }, [activeMeeting, members, roomForm.invited_member_ids]);
  const refroomParticipants = useMemo(() => [
    currentParticipant,
    ...activeMeetingInviteMembers.map(member => ({
      id: participantIdForMember(member),
      memberId: member.id,
      name: member.name || member.email || 'Member',
      email: member.email,
      role: participantRoles[participantIdForMember(member)] || 'attendee',
      status: participantLocations[participantIdForMember(member)] ? participantLocationLabel(participantLocations[participantIdForMember(member)], breakoutRooms) : 'Invited',
      mic: false,
      camera: false,
      isCurrentUser: false
    }))
  ], [activeMeetingInviteMembers, breakoutRooms, currentParticipant, participantLocations, participantRoles]);
  const breakoutLocationOptions = useMemo(() => [
    ['main', 'Main Room'],
    ['waiting', 'Main Waiting Room'],
    ...breakoutRooms.flatMap(room => [
      [`room:${room.id}`, room.name],
      [`waiting:${room.id}`, `${room.name} Waiting Room`]
    ])
  ], [breakoutRooms]);
  const currentMeetingMessages = useMemo(() => {
    const meetingId = String(activeMeeting?.id || activeMeetingId || '');
    const meetingCode = String(activeMeeting?.meetingCode || settings.meetingCode || '');
    return messages.filter(message => (
      (meetingId && String(message.meetingId || '') === meetingId)
      || (meetingCode && String(message.meetingCode || '') === meetingCode)
    ));
  }, [activeMeeting, activeMeetingId, messages, settings.meetingCode]);
  const stageBackgroundUrl = production.customBackground || production.backgroundImage || LOGO_SRC;
  const stageStyle = {
    '--refroom-stage-bg': `url("${stageBackgroundUrl}")`
  };
  const stageClassName = [
    'rtbo-refroom-viewport',
    production.backgroundBlur ? 'has-blurred-background' : '',
    production.cleanBackgroundEdges ? 'has-clean-background-edges' : ''
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (!canManageMeetings) return;
    loadMeetingWorkspace();
  }, [canManageMeetings]);

  useEffect(() => {
    if (!isPublicPlayer) return;
    const code = refroomCodeFromHash();
    if (!code) return;
    loadPublicMeeting(code);
  }, [isPublicPlayer]);

  useEffect(() => {
    if (isPublicPlayer) return;
    safeWriteJson(scopedKey(displayUser, 'settings'), settings);
  }, [displayUser, isPublicPlayer, settings]);

  useEffect(() => {
    if (isPublicPlayer) return;
    safeWriteJson(scopedKey(displayUser, 'rooms'), rooms);
  }, [displayUser, isPublicPlayer, rooms]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'messages'), messages);
  }, [displayUser, messages]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'recordings'), recordings);
  }, [displayUser, recordings]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'transcript'), transcript);
  }, [displayUser, transcript]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'volume'), volume);
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, Number(volume) / 100));
    }
  }, [displayUser, volume, programStream]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'breakoutRooms'), breakoutRooms);
  }, [breakoutRooms, displayUser]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'participantLocations'), participantLocations);
  }, [displayUser, participantLocations]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'participantRoles'), participantRoles);
  }, [displayUser, participantRoles]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'surveys'), surveys);
  }, [displayUser, surveys]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'production'), production);
  }, [displayUser, production]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'cameraSources'), cameraSources);
  }, [cameraSources, displayUser]);

  useEffect(() => {
    safeWriteJson(scopedKey(displayUser, 'audioSources'), audioSources);
  }, [audioSources, displayUser]);

  useEffect(() => {
    if (!panelOptions.includes(activePanel)) {
      setActivePanel(panelOptions[0]);
    }
  }, [activePanel, panelOptions]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = programStream || null;
    }
  }, [programStream]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => {
    cameraFeedsRef.current = cameraFeeds;
  }, [cameraFeeds]);

  useEffect(() => {
    audioFeedsRef.current = audioFeeds;
  }, [audioFeeds]);

  useEffect(() => {
    const updateFullscreenState = () => setFullscreenActive(document.fullscreenElement === viewportRef.current);
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  useEffect(() => {
    if (!roomActive) return undefined;
    const timer = window.setInterval(() => setElapsed(current => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [roomActive]);

  useEffect(() => {
    refreshDevices();
    return () => {
      stopStream(localStreamRef.current);
      stopStream(screenStreamRef.current);
      cameraFeedsRef.current.forEach(feed => stopStream(feed.stream));
      audioFeedsRef.current.forEach(feed => stopStream(feed.stream));
      recordingAudioContextRef.current?.close?.();
    };
  }, []);

  function updateStatus(message) {
    setStatusMessage(message);
    onStatus(message);
  }

  async function loadMeetingWorkspace() {
    setLoadingMeetings(true);
    try {
      const data = await refroomApiGet('/refroom.php');
      setRooms(Array.isArray(data.meetings) ? data.meetings : []);
      setMembers(Array.isArray(data.members) ? data.members : []);
      updateStatus('RefRoom meetings and member invite list loaded.');
    } catch (error) {
      updateStatus(error.message || 'RefRoom meeting data could not be loaded.');
    } finally {
      setLoadingMeetings(false);
    }
  }

  async function loadPublicMeeting(meetingCode) {
    try {
      const data = await refroomApiGet(`/refroom.php?code=${encodeURIComponent(meetingCode)}`);
      const meeting = data.meeting;
      if (!meeting?.meetingCode) return;
      setRooms(currentRoomsWith(meeting));
      setActiveMeetingId(String(meeting.id || meeting.meetingCode));
      setSettings(current => ({
        ...current,
        roomTitle: meeting.title || current.roomTitle,
        passcode: meeting.passcode || '',
        meetingCode: meeting.meetingCode
      }));
      updateStatus('RefRoom meeting loaded from invite link.');
    } catch (error) {
      updateStatus(error.message || 'RefRoom meeting could not be loaded from this invite link.');
    }
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInputs: deviceList.filter(device => device.kind === 'audioinput'),
        videoInputs: deviceList.filter(device => device.kind === 'videoinput')
      });
    } catch {
      setDeviceError('Media devices could not be listed by this browser.');
    }
  }

  function stopStream(stream) {
    stream?.getTracks?.().forEach(track => track.stop());
  }

  function deviceLabel(deviceId, collection, fallback) {
    return collection.find(device => device.deviceId === deviceId)?.label || fallback;
  }

  function buildRecordingStream(stream) {
    const sourceStream = stream || programStream || localStream;
    if (!sourceStream) return null;
    recordingAudioContextRef.current?.close?.();
    recordingAudioContextRef.current = null;

    const mixedStream = new MediaStream();
    sourceStream.getVideoTracks().forEach(track => mixedStream.addTrack(track));

    const audioTracks = [
      ...sourceStream.getAudioTracks(),
      ...audioFeedsRef.current.flatMap(feed => feed.stream?.getAudioTracks?.() || [])
    ].filter((track, index, list) => track?.readyState === 'live' && track.enabled && list.indexOf(track) === index);

    if (audioTracks.length === 0) return mixedStream;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || audioTracks.length === 1) {
      audioTracks.forEach(track => mixedStream.addTrack(track));
      return mixedStream;
    }

    try {
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      audioTracks.forEach(track => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });
      destination.stream.getAudioTracks().forEach(track => mixedStream.addTrack(track));
      recordingAudioContextRef.current = audioContext;
    } catch {
      audioTracks.forEach(track => mixedStream.addTrack(track));
    }
    return mixedStream;
  }

  async function addCameraFeed() {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateStatus('This browser does not support additional camera sources.');
      return;
    }
    const deviceId = selectedExtraCameraDevice || selectedVideoDevice || '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      });
      const feed = {
        id: createId('camera'),
        deviceId,
        label: deviceLabel(deviceId, devices.videoInputs, `Camera ${cameraFeeds.length + 1}`),
        stream,
        addedAt: new Date().toISOString()
      };
      setCameraFeeds(current => [...current, feed]);
      setCameraSources(current => [...current, { id: feed.id, deviceId: feed.deviceId, label: feed.label, addedAt: feed.addedAt }]);
      setSelectedExtraCameraDevice('');
      updateStatus(`${feed.label} added as a RefRoom camera source.`);
    } catch (error) {
      updateStatus(error?.message || 'The selected camera could not be added.');
    }
  }

  function removeCameraFeed(feedId) {
    setCameraFeeds(current => {
      const target = current.find(feed => String(feed.id) === String(feedId));
      stopStream(target?.stream);
      return current.filter(feed => String(feed.id) !== String(feedId));
    });
    setCameraSources(current => current.filter(feed => String(feed.id) !== String(feedId)));
    updateStatus('Camera source removed.');
  }

  function makeCameraPrimary(feed) {
    if (!feed?.stream) return;
    const oldVideoTracks = localStream?.getVideoTracks?.() || [];
    const feedVideoTracks = feed.stream.getVideoTracks();
    const audioTracks = localStream?.getAudioTracks?.() || [];
    const nextStream = new MediaStream([...feedVideoTracks, ...audioTracks]);
    oldVideoTracks.forEach(track => {
      if (!feedVideoTracks.includes(track)) track.stop();
    });
    setLocalStream(nextStream);
    setRoomActive(true);
    setCameraEnabled(true);
    updateStatus(`${feed.label} is now the main program camera.`);
  }

  async function addAudioFeed() {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateStatus('This browser does not support additional microphone sources.');
      return;
    }
    const deviceId = selectedExtraAudioDevice || selectedAudioDevice || '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false
      });
      const feed = {
        id: createId('microphone'),
        deviceId,
        label: deviceLabel(deviceId, devices.audioInputs, `Microphone ${audioFeeds.length + 1}`),
        stream,
        muted: false,
        addedAt: new Date().toISOString()
      };
      setAudioFeeds(current => [...current, feed]);
      setAudioSources(current => [...current, { id: feed.id, deviceId: feed.deviceId, label: feed.label, addedAt: feed.addedAt }]);
      setSelectedExtraAudioDevice('');
      updateStatus(`${feed.label} added as a RefRoom microphone source.`);
    } catch (error) {
      updateStatus(error?.message || 'The selected microphone could not be added.');
    }
  }

  function toggleAudioFeed(feedId) {
    setAudioFeeds(current => current.map(feed => {
      if (String(feed.id) !== String(feedId)) return feed;
      const nextMuted = !feed.muted;
      feed.stream?.getAudioTracks?.().forEach(track => {
        track.enabled = !nextMuted;
      });
      updateStatus(`${feed.label} ${nextMuted ? 'muted' : 'unmuted'}.`);
      return { ...feed, muted: nextMuted };
    }));
  }

  function removeAudioFeed(feedId) {
    setAudioFeeds(current => {
      const target = current.find(feed => String(feed.id) === String(feedId));
      stopStream(target?.stream);
      return current.filter(feed => String(feed.id) !== String(feedId));
    });
    setAudioSources(current => current.filter(feed => String(feed.id) !== String(feedId)));
    updateStatus('Microphone source removed.');
  }

  async function startRoom() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setDeviceError('This browser does not support camera and microphone access.');
      return null;
    }

    try {
      setDeviceError('');
      stopStream(localStream);
      const constraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        video: selectedVideoDevice
          ? { deviceId: { exact: selectedVideoDevice } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setRoomActive(true);
      setElapsed(0);
      setMicEnabled(stream.getAudioTracks().every(track => track.enabled));
      setCameraEnabled(stream.getVideoTracks().every(track => track.enabled));
      await refreshDevices();
      updateStatus('RefRoom started with camera and microphone enabled.');

      if (settings.autoRecord) {
        window.setTimeout(() => startRecording(stream), 250);
      }
      return stream;
    } catch (error) {
      const message = error?.message || 'Camera or microphone permission was denied.';
      setDeviceError(message);
      updateStatus(`RefRoom could not start: ${message}`);
      return null;
    }
  }

  function endRoom() {
    if (recording) recorderRef.current?.stop();
    stopStream(localStream);
    stopStream(screenStream);
    cameraFeeds.forEach(feed => stopStream(feed.stream));
    audioFeeds.forEach(feed => stopStream(feed.stream));
    setLocalStream(null);
    setScreenStream(null);
    setCameraFeeds([]);
    setAudioFeeds([]);
    setRoomActive(false);
    setScreenSharing(false);
    setHandRaised(false);
    setReaction('');
    setElapsed(0);
    updateStatus('RefRoom ended and media tracks were released.');
  }

  async function restartMediaWithSelectedDevices() {
    if (!roomActive) {
      await refreshDevices();
      return;
    }
    await startRoom();
  }

  async function toggleMic() {
    const stream = localStream || await startRoom();
    if (!stream) return;
    const next = !micEnabled;
    stream.getAudioTracks().forEach(track => {
      track.enabled = next;
    });
    setMicEnabled(next);
    updateStatus(next ? 'Microphone unmuted.' : 'Microphone muted.');
  }

  async function toggleCamera() {
    const stream = localStream || await startRoom();
    if (!stream) return;
    const next = !cameraEnabled;
    stream.getVideoTracks().forEach(track => {
      track.enabled = next;
    });
    setCameraEnabled(next);
    updateStatus(next ? 'Camera turned on.' : 'Camera turned off.');
  }

  async function startScreenShare() {
    if (!settings.allowScreenShare) {
      updateStatus('Screen sharing is disabled in RefRoom settings.');
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setDeviceError('This browser does not support screen sharing.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(stream);
      setScreenSharing(true);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenSharing(false);
        setScreenStream(null);
        updateStatus('Screen sharing stopped.');
      });
      updateStatus('Screen sharing is now active.');
    } catch (error) {
      updateStatus(error?.message || 'Screen sharing was cancelled.');
    }
  }

  function stopScreenShare() {
    stopStream(screenStream);
    setScreenStream(null);
    setScreenSharing(false);
    updateStatus('Returned to camera view.');
  }

  async function startRecording(streamOverride) {
    const baseStream = streamOverride || programStream || await startRoom();
    const stream = buildRecordingStream(baseStream);
    if (!stream || !window.MediaRecorder) {
      updateStatus('Recording is not supported by this browser.');
      return;
    }

    const mimeType = supportedMimeType();
    recordingChunksRef.current = [];
    recordingStartedAtRef.current = new Date();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = event => {
      if (event.data?.size > 0) recordingChunksRef.current.push(event.data);
    };
    recorder.onstop = () => saveRecordingBlob(mimeType || 'video/webm');
    recorder.start(1000);
    setRecording(true);
    updateStatus('RefRoom recording started.');
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function saveRecordingBlob(mimeType) {
    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    const startedAt = recordingStartedAtRef.current || new Date();
    const meetingSlug = safeFilename(activeMeeting?.title || settings.roomTitle || 'refroom');
    const filename = `${meetingSlug}-${startedAt.toISOString().replace(/[:.]/g, '-')}.webm`;
    const downloaded = settings.saveAllRecordings !== false && downloadBlob(blob, filename);
    setRecordings(current => [
      {
        id: createId('recording'),
        filename,
        meetingId: activeMeeting?.id || activeMeetingId || '',
        meetingCode: activeMeeting?.meetingCode || settings.meetingCode,
        meetingTitle: activeMeeting?.title || settings.roomTitle,
        createdAt: startedAt.toISOString(),
        duration: elapsed,
        size: blob.size,
        savedToComputer: downloaded,
        cameraSources: cameraFeedsRef.current.map(feed => feed.label),
        audioSources: audioFeedsRef.current.map(feed => feed.label)
      },
      ...current
    ]);
    recordingAudioContextRef.current?.close?.();
    recordingAudioContextRef.current = null;
    setRecording(false);
    updateStatus(downloaded ? 'Recording stopped and was saved to this computer.' : 'Recording stopped. Browser download permission is required to save the file.');
  }

  async function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) {
      updateStatus('Picture-in-picture is not available in this browser.');
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      updateStatus(error?.message || 'Picture-in-picture could not be opened.');
    }
  }

  async function toggleFullscreen() {
    const viewport = viewportRef.current;
    if (!viewport?.requestFullscreen) {
      updateStatus('Fullscreen mode is not available in this browser.');
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreenActive(false);
      } else {
        await viewport.requestFullscreen();
        setFullscreenActive(true);
      }
    } catch (error) {
      updateStatus(error?.message || 'Fullscreen mode could not be opened.');
    }
  }

  function addEmojiToMessage(emoji) {
    setMessageDraft(current => `${current}${current ? ' ' : ''}${emoji}`);
    setReaction(emoji);
    setChatEmojiPickerOpen(false);
  }

  function sendEmojiReaction(emoji) {
    setReaction(emoji);
    setReactionPickerOpen(false);
    setMessages(current => [
      ...current,
      {
        id: createId('message'),
        user: displayName(displayUser),
        message: emoji,
        emoji,
        meetingId: activeMeeting?.id || activeMeetingId || '',
        meetingCode: activeMeeting?.meetingCode || settings.meetingCode,
        meetingTitle: activeMeeting?.title || settings.roomTitle,
        at: new Date().toISOString()
      }
    ]);
  }

  function updateProduction(name, value) {
    setProduction(current => ({ ...current, [name]: value }));
  }

  function selectVirtualBackground(background) {
    setProduction(current => ({
      ...current,
      backgroundMode: background.id,
      backgroundImage: background.value,
      customBackground: background.id === 'custom' ? current.customBackground : ''
    }));
  }

  function uploadCustomBackground(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      updateStatus('Select an image file for the RefRoom background.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProduction(current => ({
        ...current,
        backgroundMode: 'custom',
        backgroundImage: '',
        customBackground: String(reader.result || '')
      }));
      updateStatus('Custom RefRoom background applied.');
    };
    reader.readAsDataURL(file);
  }

  function resolveInviteMeeting(roomOrEvent) {
    if (roomOrEvent?.meetingCode || roomOrEvent?.title || roomOrEvent?.id) return roomOrEvent;
    return activeMeeting || {
      title: settings.roomTitle,
      passcode: settings.passcode,
      meetingCode: settings.meetingCode,
      invited_emails: []
    };
  }

  function inviteUrlForMeeting(roomOrEvent) {
    const meeting = resolveInviteMeeting(roomOrEvent);
    const code = meeting.meetingCode || settings.meetingCode;
    return `${window.location.origin}${window.location.pathname}#refroom/${encodeURIComponent(code)}`;
  }

  function inviteTextForMeeting(roomOrEvent) {
    const meeting = resolveInviteMeeting(roomOrEvent);
    const inviteUrl = inviteUrlForMeeting(meeting);
    return [
      `${meeting.title || settings.roomTitle || 'RefRoom Meeting'}`,
      meeting.startsAt ? `When: ${formatDateTime(meeting.startsAt)}` : '',
      meeting.purpose ? `Purpose: ${meeting.purpose}` : '',
      `Meeting Code: ${meeting.meetingCode || settings.meetingCode}`,
      meeting.passcode ? `Passcode: ${meeting.passcode}` : '',
      `Join RefRoom: ${inviteUrl}`
    ].filter(Boolean).join('\n');
  }

  async function copyInvite(roomOrEvent) {
    const meeting = resolveInviteMeeting(roomOrEvent);
    const invite = inviteTextForMeeting(meeting);
    try {
      await navigator.clipboard.writeText(invite);
      updateStatus('RefRoom invite copied to the clipboard.');
    } catch {
      updateStatus('Invite could not be copied by this browser.');
    }
  }

  function openEmailInvite(roomOrEvent) {
    const meeting = resolveInviteMeeting(roomOrEvent);
    const recipients = Array.isArray(meeting.invited_emails) ? meeting.invited_emails : parseInviteEmails(meeting.invited_emails);
    const subject = encodeURIComponent(`RefRoom Invitation - ${meeting.title || settings.roomTitle || 'Meeting'}`);
    const body = encodeURIComponent(inviteTextForMeeting(meeting));
    const to = recipients.map(encodeURIComponent).join(',');
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    updateStatus('Email invite draft opened with the RefRoom join link.');
  }

  function openMeetingCreator() {
    if (!isPublicPlayer) setActivePanel('Meetings');
    setRoomForm(current => {
      if (current.title || current.date || current.time) return current;
      const next = new Date(Date.now() + 30 * 60 * 1000);
      return {
        ...current,
        title: 'RefRoom Meeting',
        date: dateInputValue(next),
        time: timeInputValue(next)
      };
    });
    setPublicMeetingCreatorOpen(true);
    window.setTimeout(() => meetingFormRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 0);
  }

  function openPublicPlayer() {
    if (typeof window !== 'undefined') {
      window.location.hash = `refroom/${encodeURIComponent(settings.meetingCode)}`;
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    setMessages(current => [
      ...current,
      {
        id: createId('message'),
        user: displayName(displayUser),
        message: messageDraft.trim(),
        meetingId: activeMeeting?.id || activeMeetingId || '',
        meetingCode: activeMeeting?.meetingCode || settings.meetingCode,
        meetingTitle: activeMeeting?.title || settings.roomTitle,
        at: new Date().toISOString()
      }
    ]);
    setMessageDraft('');
  }

  function saveCurrentChatToComputer() {
    const exportMessages = currentMeetingMessages.length > 0 ? currentMeetingMessages : messages;
    const title = `${activeMeeting?.title || settings.roomTitle || 'RefRoom'} Chat`;
    const filename = `${safeFilename(title)}-${new Date().toISOString().slice(0, 10)}.txt`;
    downloadTextFile(filename, formatChatExport(exportMessages, title));
    updateStatus('Current meeting chat was saved to this computer.');
  }

  function saveAllChatsToComputer() {
    const filename = `refroom-all-meeting-chats-${new Date().toISOString().slice(0, 10)}.txt`;
    downloadTextFile(filename, formatChatExport(messages, 'All RefRoom Meeting Chats'));
    updateStatus('All saved RefRoom meeting chats were downloaded to this computer.');
  }

  function saveAllChatsJson() {
    const filename = `refroom-all-meeting-chats-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJsonFile(filename, messages);
    updateStatus('All saved RefRoom meeting chats were exported as JSON.');
  }

  function saveRecordingLogToComputer() {
    const filename = `refroom-recording-log-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJsonFile(filename, recordings);
    updateStatus('RefRoom recording log was saved to this computer.');
  }

  function saveCaption(event) {
    event.preventDefault();
    if (!captionDraft.trim()) return;
    setTranscript(current => [
      ...current,
      {
        id: createId('caption'),
        speaker: displayName(displayUser),
        text: captionDraft.trim(),
        at: new Date().toISOString()
      }
    ]);
    setCaptionDraft('');
  }

  async function saveRoom(event) {
    event.preventDefault();
    if (!roomForm.title.trim() || !roomForm.date || !roomForm.time) {
      updateStatus('Complete the room title, date, and time before saving the RefRoom meeting.');
      return;
    }
    const invitedEmails = parseInviteEmails(roomForm.invited_emails);
    const selectedMemberIds = roomForm.invited_member_ids || [];
    if (roomForm.sendInvitations && selectedMemberIds.length === 0 && invitedEmails.length === 0) {
      updateStatus('Add at least one invite email or selected member before sending RefRoom invitations.');
      return;
    }
    const startsAt = `${roomForm.date}T${roomForm.time}`;
    const nextRoom = {
      id: editingRoomId || createId('room'),
      title: roomForm.title.trim(),
      purpose: roomForm.purpose.trim(),
      passcode: roomForm.passcode.trim(),
      startsAt,
      date: roomForm.date,
      time: roomForm.time,
      meetingCode: editingRoomId
        ? rooms.find(room => room.id === editingRoomId)?.meetingCode || createMeetingCode()
        : createMeetingCode(),
      invited_member_ids: selectedMemberIds,
      invited_emails: Array.from(new Set([
        ...selectedInviteMembers.map(member => member.email).filter(Boolean),
        ...invitedEmails
      ]))
    };

    setSavingMeeting(true);
    try {
      if (canManageMeetings) {
        const payload = {
          action: editingRoomId ? 'update' : 'create',
          id: editingRoomId,
          meeting: nextRoom
        };
        const data = await refroomApiPost('/refroom.php', payload);
        const savedMeeting = data.meeting || nextRoom;
        setRooms(Array.isArray(data.meetings) ? data.meetings : currentRoomsWith(savedMeeting));
        setEditingRoomId('');
        setRoomForm(EMPTY_ROOM_FORM);
        updateStatus(data.message || (editingRoomId ? 'RefRoom meeting updated.' : 'RefRoom meeting scheduled.'));
        if (roomForm.sendInvitations) {
          await sendRoomInvitations(savedMeeting);
        }
      } else if (isPublicPlayer) {
        let savedMeeting = null;
        let apiMessage = '';
        try {
          const data = await refroomApiPost('/refroom.php', { action: 'create_public', meeting: nextRoom });
          savedMeeting = data.meeting || nextRoom;
          apiMessage = data.message || '';
        } catch {
          savedMeeting = {
            ...nextRoom,
            invite_status: 'draft_ready',
            invite_recipient_count: inviteRecipientCount(nextRoom),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          apiMessage = 'RefRoom meeting created. Copy or email the invite link to share it.';
        }
        setRooms(currentRoomsWith(savedMeeting));
        setActiveMeetingId(String(savedMeeting.id || savedMeeting.meetingCode));
        setSettings(current => ({
          ...current,
          roomTitle: savedMeeting.title || current.roomTitle,
          passcode: savedMeeting.passcode || '',
          meetingCode: savedMeeting.meetingCode || current.meetingCode
        }));
        setEditingRoomId('');
        setRoomForm(EMPTY_ROOM_FORM);
        updateStatus(apiMessage || 'RefRoom meeting created. The invite link is ready to share.');
        if (roomForm.sendInvitations) {
          openEmailInvite(savedMeeting);
        }
      } else {
        setRooms(current => editingRoomId
          ? current.map(room => (String(room.id) === String(editingRoomId) ? nextRoom : room))
          : [nextRoom, ...current]
        );
        setEditingRoomId('');
        setRoomForm(EMPTY_ROOM_FORM);
        updateStatus(editingRoomId ? 'RefRoom meeting updated.' : 'RefRoom meeting scheduled.');
      }
    } catch (error) {
      updateStatus(error.message || 'RefRoom meeting could not be saved.');
    } finally {
      setSavingMeeting(false);
    }
  }

  function currentRoomsWith(savedMeeting) {
    const exists = rooms.some(room => String(room.id) === String(savedMeeting.id));
    return exists
      ? rooms.map(room => (String(room.id) === String(savedMeeting.id) ? savedMeeting : room))
      : [savedMeeting, ...rooms];
  }

  function editRoom(room) {
    const [date = '', time = ''] = String(room.startsAt || '').split('T');
    setEditingRoomId(room.id);
    setRoomForm({
      title: room.title || '',
      date: room.date || date,
      time: room.time || time,
      purpose: room.purpose || '',
      passcode: room.passcode || '',
      invited_member_ids: Array.isArray(room.invited_member_ids) ? room.invited_member_ids : [],
      invited_emails: Array.isArray(room.invited_emails) ? room.invited_emails.join(', ') : '',
      sendInvitations: false
    });
    if (isPublicPlayer) setPublicMeetingCreatorOpen(true);
    else setActivePanel('Meetings');
  }

  async function deleteRoom(roomId) {
    if (canManageMeetings) {
      try {
        const data = await refroomApiPost('/refroom.php', { action: 'delete', id: roomId });
        setRooms(Array.isArray(data.meetings) ? data.meetings : rooms.filter(room => String(room.id) !== String(roomId)));
        if (String(editingRoomId) === String(roomId)) {
          setEditingRoomId('');
          setRoomForm(EMPTY_ROOM_FORM);
        }
        updateStatus(data.message || 'RefRoom meeting deleted.');
      } catch (error) {
        updateStatus(error.message || 'RefRoom meeting could not be deleted.');
      }
      return;
    }
    setRooms(current => current.filter(room => String(room.id) !== String(roomId)));
    if (String(editingRoomId) === String(roomId)) {
      setEditingRoomId('');
      setRoomForm(EMPTY_ROOM_FORM);
    }
    updateStatus('RefRoom meeting deleted.');
  }

  async function sendRoomInvitations(room) {
    if (!canManageMeetings) {
      updateStatus('Only admins can send RefRoom invitations to members.');
      return;
    }
    if (!room?.id) {
      updateStatus('Save the meeting before sending RefRoom invitations.');
      return;
    }
    if (inviteRecipientCount(room) === 0) {
      updateStatus('Select one or more members or invite emails before sending RefRoom invitations.');
      return;
    }

    setInvitationSendingId(String(room.id));
    try {
      const data = await refroomApiPost('/refroom.php', { action: 'send_invites', id: room.id });
      setRooms(Array.isArray(data.meetings) ? data.meetings : currentRoomsWith(data.meeting || room));
      updateStatus(data.message || 'RefRoom invitations sent.');
    } catch (error) {
      await loadMeetingWorkspace();
      updateStatus(error.message || 'RefRoom invitations could not be sent.');
    } finally {
      setInvitationSendingId('');
    }
  }

  function toggleInviteMember(memberId) {
    setRoomForm(current => {
      const selected = new Set((current.invited_member_ids || []).map(id => String(id)));
      const key = String(memberId);
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      return { ...current, invited_member_ids: [...selected] };
    });
  }

  function seedParticipantState(room) {
    const invitedIds = (room?.invited_member_ids || []).map(id => String(id));
    setParticipantRoles(current => {
      const next = { ...current, 'current-user': 'host' };
      members.forEach(member => {
        if (invitedIds.includes(String(member.id))) {
          const id = participantIdForMember(member);
          if (!next[id]) next[id] = 'attendee';
        }
      });
      return next;
    });
    setParticipantLocations(current => {
      const next = { ...current, 'current-user': 'main' };
      members.forEach(member => {
        if (invitedIds.includes(String(member.id))) {
          const id = participantIdForMember(member);
          if (!next[id]) next[id] = settings.waitingRoom ? 'waiting' : 'main';
        }
      });
      return next;
    });
  }

  async function startScheduledRoom(room) {
    setSettings(current => ({
      ...current,
      roomTitle: room.title,
      passcode: room.passcode,
      meetingCode: room.meetingCode
    }));
    setActiveMeetingId(String(room.id));
    seedParticipantState(room);
    setActivePanel('Studio');
    await startRoom();
  }

  function updateSetting(name, value) {
    setSettings(current => ({ ...current, [name]: value }));
  }

  function createBreakoutRoom(event) {
    event.preventDefault();
    const name = breakoutName.trim();
    if (!name) {
      updateStatus('Enter a breakout room name before creating it.');
      return;
    }
    setBreakoutRooms(current => [
      ...current,
      { id: createId('breakout'), name, createdAt: new Date().toISOString(), meetingId: activeMeeting?.id || activeMeetingId || '' }
    ]);
    setBreakoutName('');
    updateStatus(`${name} breakout room created.`);
  }

  function deleteBreakoutRoom(roomId) {
    setBreakoutRooms(current => current.filter(room => String(room.id) !== String(roomId)));
    setParticipantLocations(current => {
      const next = { ...current };
      Object.keys(next).forEach(id => {
        if (String(next[id]) === `room:${roomId}` || String(next[id]) === `waiting:${roomId}`) next[id] = 'main';
      });
      return next;
    });
    updateStatus('Breakout room removed and participants were returned to the main room.');
  }

  function moveParticipant(participantId, location) {
    setParticipantLocations(current => ({ ...current, [participantId]: location }));
  }

  function setParticipantRole(participantId, role) {
    setParticipantRoles(current => ({ ...current, [participantId]: role }));
  }

  function moveAllWaitingToMain() {
    setParticipantLocations(current => {
      const next = { ...current };
      Object.keys(next).forEach(id => {
        if (String(next[id]).startsWith('waiting')) next[id] = 'main';
      });
      return next;
    });
    updateStatus('Waiting-room participants moved into meeting rooms.');
  }

  function distributeToBreakouts() {
    if (breakoutRooms.length === 0) {
      updateStatus('Create at least one breakout room before distributing participants.');
      return;
    }
    const movable = refroomParticipants.filter(participant => !participant.isCurrentUser);
    setParticipantLocations(current => {
      const next = { ...current };
      movable.forEach((participant, index) => {
        const room = breakoutRooms[index % breakoutRooms.length];
        next[participant.id] = `room:${room.id}`;
      });
      return next;
    });
    updateStatus('Invited participants were distributed across breakout rooms.');
  }

  function saveSurvey(event) {
    event.preventDefault();
    if (!surveyForm.title.trim() || !surveyForm.question.trim()) {
      updateStatus('Complete the survey title and question before saving.');
      return;
    }
    const options = surveyForm.type === 'Short Answer'
      ? []
      : surveyForm.options.split('\n').map(option => option.trim()).filter(Boolean);
    if (surveyForm.type !== 'Short Answer' && options.length === 0) {
      updateStatus('Add at least one survey option.');
      return;
    }
    setSurveys(current => [
      {
        id: createId('survey'),
        meetingId: activeMeeting?.id || activeMeetingId || '',
        meetingCode: activeMeeting?.meetingCode || settings.meetingCode,
        title: surveyForm.title.trim(),
        question: surveyForm.question.trim(),
        type: surveyForm.type,
        options,
        anonymous: Boolean(surveyForm.anonymous),
        status: 'draft',
        responses: {},
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    setSurveyForm(EMPTY_SURVEY_FORM);
    updateStatus('Survey saved.');
  }

  function updateSurveyStatus(surveyId, status) {
    setSurveys(current => current.map(survey => String(survey.id) === String(surveyId) ? { ...survey, status } : survey));
  }

  function deleteSurvey(surveyId) {
    setSurveys(current => current.filter(survey => String(survey.id) !== String(surveyId)));
    updateStatus('Survey deleted.');
  }

  function submitSurveyResponse(survey, answer) {
    setSurveys(current => current.map(item => {
      if (String(item.id) !== String(survey.id)) return item;
      return {
        ...item,
        responses: {
          ...(item.responses || {}),
          [currentParticipant.id]: {
            answer,
            at: new Date().toISOString(),
            name: survey.anonymous ? '' : currentParticipant.name
          }
        }
      };
    }));
    updateStatus('Survey response saved.');
  }

  const stats = [
    ['Participants', refroomParticipants.length, roomActive ? 'Current browser participant connected' : 'Selected invitees for the form'],
    ['Scheduled', rooms.length, 'Saved RefRoom meetings'],
    ['Recordings', recordings.length, 'Local browser recordings saved'],
    ['Room Time', formatClock(elapsed), roomActive ? 'Room is active' : 'Room is idle']
  ];
  const rootClassName = [
    isPublicPlayer ? 'rtbo-section rtbo-refroom-public-page' : 'rtbo-dashboard-card rtbo-focused-page-card',
    'rtbo-refroom-page',
    isProductionStudio ? 'rtbo-refroom-production-mode' : '',
    isPublicPlayer ? 'rtbo-refroom-player-mode' : ''
  ].filter(Boolean).join(' ');
  const headerCopy = isProductionStudio
    ? {
        eyebrow: 'Production Studio',
        title: 'RefRoom Studio',
        description: 'Control RefRoom scenes, sources, overlays, microphones, backgrounds, and broadcast setup from the Command Center.'
      }
    : isPublicPlayer
      ? {
          eyebrow: 'Public Video Player',
          title: 'RefRoom',
          description: 'Watch the RTBO RefRoom player for virtual officiating meetings, film rooms, training broadcasts, and live production sessions.'
        }
      : {
          eyebrow: 'Virtual Meeting Studio',
          title: 'RefRoom',
          description: 'Run virtual meetings, officiating film rooms, training sessions, recordings, chat, screen share, and meeting controls from one workspace.'
        };

  return (
    <section className={rootClassName}>
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">{headerCopy.eyebrow}</p>
          <h3>{headerCopy.title}</h3>
          <p>{headerCopy.description}</p>
        </div>
      </div>

      {statusMessage && <p className="rtbo-dashboard-status">{statusMessage}</p>}
      {deviceError && <p className="form-message error">{deviceError}</p>}

      {isPublicPlayer && (
        <section className="rtbo-refroom-public-actions" aria-label="RefRoom meeting actions">
          <div>
            <strong>{activeMeeting ? activeMeeting.title : 'Create or join a RefRoom meeting'}</strong>
            <span>{activeMeeting ? `Code: ${activeMeeting.meetingCode}` : 'Create a meeting first, then share the invite link or email draft.'}</span>
          </div>
          <div className="rtbo-refroom-form-actions">
            <button className="btn" type="button" onClick={openMeetingCreator}>Create Meeting</button>
            <button className="btn secondary dark-btn" type="button" onClick={() => copyInvite(activeMeeting || null)} disabled={!activeMeeting}>Copy Invite</button>
            <button className="btn secondary dark-btn" type="button" onClick={() => openEmailInvite(activeMeeting || null)} disabled={!activeMeeting}>Email Invite</button>
          </div>
        </section>
      )}

      {!isPublicPlayer && !isProductionStudio && <div className="rtbo-refroom-menu-row">
        <nav className="rtbo-refroom-tabs" aria-label="RefRoom workspace">
          {panelOptions.map(panel => (
            <button
              className={activePanel === panel ? 'active' : ''}
              key={panel}
              type="button"
              onClick={() => setActivePanel(panel)}
            >
              {panel}
            </button>
          ))}
        </nav>
        <div className="rtbo-refroom-menu-actions">
          <button type="button" onClick={copyInvite}>Copy Invite</button>
          <button className={roomActive ? 'danger' : ''} type="button" onClick={roomActive ? endRoom : startRoom}>
            {roomActive ? 'End Room' : 'Start Room'}
          </button>
        </div>
      </div>}

      {!isPublicPlayer && !isProductionStudio && <div className="rtbo-refroom-stat-grid" aria-label="RefRoom status">
        {stats.map(([label, value, detail]) => (
          <article className="rtbo-refroom-stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>}

      {activePanel === 'Studio' && (
        <div className="rtbo-refroom-studio-grid">
          <section className="rtbo-refroom-stage-card">
            <div className="rtbo-refroom-stage-head">
              <div>
                <h4>{isPublicPlayer ? 'RefRoom Public Player' : settings.roomTitle}</h4>
                <p>{isPublicPlayer ? `${activeMeeting ? activeMeeting.title : 'No meeting selected'} / Code: ${settings.meetingCode}` : `Code: ${settings.meetingCode} / Layout: ${settings.selectedLayout}`}</p>
              </div>
              <div className="rtbo-refroom-live-flags">
                <span className={roomActive || production.destination ? 'is-live' : ''}>{isPublicPlayer ? (production.destination ? 'Program Live' : activeMeeting ? 'Meeting Loaded' : 'No Live Feed') : roomActive ? 'Room Live' : 'Room Idle'}</span>
                {recording && <span className="is-recording">REC</span>}
                {screenSharing && <span>Screen Share</span>}
              </div>
            </div>

            <div className={stageClassName} ref={viewportRef} style={stageStyle}>
              {isPublicPlayer ? (
                <>
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    preload="metadata"
                    poster={PUBLIC_PLAYER_POSTER}
                    className="rtbo-refroom-public-video"
                    aria-label="RTBO RefRoom public video player"
                  >
                    {production.destination && <source src={production.destination} />}
                  </video>
                  {!production.destination && (
                    <div className="rtbo-refroom-player-standby">
                      <strong>{activeMeeting ? activeMeeting.title : 'No live program connected.'}</strong>
                      <span>{activeMeeting ? 'This meeting exists. The player will show video after the host connects a stream.' : 'Create or open a meeting invite to prepare the player and share a join link.'}</span>
                    </div>
                  )}
                </>
              ) : programStream ? (
                <video ref={videoRef} autoPlay playsInline muted className={production.backgroundBlur ? 'uses-background-blur' : ''} />
              ) : (
                <div className="rtbo-refroom-video-placeholder">
                  <img src={LOGO_SRC} alt="Raising The Bar Officiating logo" />
                  <span>{userInitials(displayUser)}</span>
                  <strong>{displayName(displayUser)}</strong>
                  <small>Start the room to enable the camera, microphone, and meeting viewport.</small>
                </div>
              )}
              {production.brandOverlay !== false && <div className="rtbo-refroom-program-badge">Program</div>}
              {production.lowerThird !== false && (
                <div className="rtbo-refroom-lower-third">
                  <strong>{isPublicPlayer ? (activeMeeting?.title || 'Raising The Bar Officiating') : (production.overlayText || displayName(displayUser))}</strong>
                  <span>{isPublicPlayer ? (activeMeeting ? `Meeting Code ${activeMeeting.meetingCode}` : 'RefRoom Public Program') : settings.meetingMode}</span>
                </div>
              )}
              {captionsOpen && transcript.length > 0 && (
                <div className="rtbo-refroom-caption-overlay">
                  {transcript.slice(-1).map(line => <span key={line.id}>{line.text}</span>)}
                </div>
              )}
              {reaction && <div className="rtbo-refroom-reaction">{reaction}</div>}
              <button className="rtbo-refroom-fullscreen-button" type="button" onClick={toggleFullscreen}>
                {fullscreenActive ? 'Exit Full Screen' : 'Full Screen'}
              </button>
            </div>

            {isPublicPlayer ? (
              <div className="rtbo-refroom-control-grid rtbo-refroom-player-control-grid" aria-label="RefRoom player controls">
                <button type="button" onClick={toggleFullscreen}>{fullscreenActive ? 'Exit Full' : 'Full Screen'}</button>
                <button type="button" onClick={openMeetingCreator}>Create Meeting</button>
                <button type="button" onClick={() => copyInvite(activeMeeting || null)} disabled={!activeMeeting}>Copy Invite</button>
                <button type="button" onClick={() => openEmailInvite(activeMeeting || null)} disabled={!activeMeeting}>Email Invite</button>
              </div>
            ) : (
              <>
                <div className="rtbo-refroom-control-grid" aria-label="Meeting controls">
                  <button type="button" aria-pressed={!micEnabled} onClick={toggleMic}>{micEnabled ? 'Mute' : 'Unmute'}</button>
                  <button type="button" aria-pressed={!cameraEnabled} onClick={toggleCamera}>{cameraEnabled ? 'Camera Off' : 'Camera On'}</button>
                  <button type="button" aria-pressed={screenSharing} onClick={screenSharing ? stopScreenShare : startScreenShare}>{screenSharing ? 'Stop Share' : 'Share Screen'}</button>
                  <button type="button" aria-pressed={recording} onClick={recording ? stopRecording : () => startRecording()}>{recording ? 'Stop Record' : 'Record'}</button>
                  <button type="button" aria-pressed={captionsOpen} onClick={() => setCaptionsOpen(current => !current)}>Captions</button>
                  <button type="button" aria-pressed={chatOpen} onClick={() => setChatOpen(current => !current)}>Chat</button>
                  <button type="button" aria-pressed={participantsOpen} onClick={() => setParticipantsOpen(current => !current)}>Participants</button>
                  <button type="button" aria-pressed={handRaised} onClick={() => setHandRaised(current => !current)}>{handRaised ? 'Lower Hand' : 'Raise Hand'}</button>
                  <button type="button" onClick={togglePictureInPicture}>PiP</button>
                  <button type="button" onClick={toggleFullscreen}>{fullscreenActive ? 'Exit Full' : 'Full Screen'}</button>
                  <button type="button" onClick={copyInvite}>Invite</button>
                  <button className="danger" type="button" onClick={endRoom}>End</button>
                </div>
                <label className="rtbo-refroom-volume-control">Volume
                  <input type="range" min="0" max="100" value={volume} onChange={event => setVolume(Number(event.target.value))} />
                  <span>{volume}%</span>
                </label>
              </>
            )}
          </section>

          {!isPublicPlayer && <aside className="rtbo-refroom-side-stack">
            <section className="rtbo-refroom-panel">
              <h4>Layouts</h4>
              <div className="rtbo-refroom-choice-grid">
                {REFROOM_LAYOUTS.map(layout => (
                  <button
                    className={settings.selectedLayout === layout ? 'active' : ''}
                    key={layout}
                    type="button"
                    onClick={() => updateSetting('selectedLayout', layout)}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            </section>

            {participantsOpen && (
              <section className="rtbo-refroom-panel">
                <h4>Participants</h4>
                <div className="rtbo-refroom-participant-row">
                  <span>{userInitials(displayUser)}</span>
                  <div>
                    <strong>{currentParticipant.name}</strong>
                    <small>{currentParticipant.status} / {currentParticipant.mic ? 'Mic on' : 'Muted'} / {currentParticipant.camera ? 'Camera on' : 'Camera off'}</small>
                  </div>
                </div>
                {handRaised && <p className="form-message">Your hand is raised.</p>}
              </section>
            )}

            <section className="rtbo-refroom-panel">
              <h4>Reactions</h4>
              <div className="rtbo-refroom-choice-grid compact">
                {REACTIONS.map(item => (
                  <button key={item} type="button" onClick={() => setReaction(current => current === item ? '' : item)}>{item}</button>
                ))}
              </div>
              <div className="rtbo-refroom-popover-wrap">
                <button type="button" onClick={() => setReactionPickerOpen(current => !current)}>Choose Emoji</button>
                {reactionPickerOpen && (
                  <div className="rtbo-refroom-emoji-popover" role="menu" aria-label="Emoji reactions">
                    {EMOJI_REACTIONS.map(item => (
                      <button key={item} type="button" onClick={() => sendEmojiReaction(item)}>{item}</button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rtbo-refroom-panel">
              <h4>Sources</h4>
              <div className="rtbo-refroom-source-counts">
                <span>{cameraFeeds.length + (localStream ? 1 : 0)} cameras</span>
                <span>{audioFeeds.length + (localStream?.getAudioTracks?.().length ? 1 : 0)} microphones</span>
              </div>
              <button className="rtbo-refroom-source-button" type="button" onClick={() => setActivePanel('Production')}>Open Production Studio</button>
            </section>
          </aside>}
        </div>
      )}

      {(activePanel === 'Meetings' || (isPublicPlayer && publicMeetingCreatorOpen)) && (
        <section className="rtbo-refroom-panel" ref={meetingFormRef}>
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>{isPublicPlayer ? 'Create RefRoom Meeting' : 'Schedule RefRoom'}</h4>
              <p>{isPublicPlayer ? 'Create the meeting first. After it is created, copy the invite link or open an email draft for people to join from the main website.' : 'Create meeting rooms, select invited members, and send invitations after the meeting has been created.'}</p>
            </div>
            <div className="rtbo-refroom-form-actions">
              {canManageMeetings && <button className="btn secondary dark-btn" type="button" onClick={loadMeetingWorkspace} disabled={loadingMeetings}>{loadingMeetings ? 'Loading...' : 'Refresh Meetings'}</button>}
              {editingRoomId && <button className="btn secondary dark-btn" type="button" onClick={() => { setEditingRoomId(''); setRoomForm(EMPTY_ROOM_FORM); }}>Cancel Edit</button>}
              {isPublicPlayer && <button className="btn secondary dark-btn" type="button" onClick={() => setPublicMeetingCreatorOpen(false)}>Close</button>}
            </div>
          </div>
          <form className="rtbo-refroom-form-grid" onSubmit={saveRoom}>
            <label>Room Title<input value={roomForm.title} onChange={event => setRoomForm(current => ({ ...current, title: event.target.value }))} /></label>
            <label>Date<input type="date" value={roomForm.date} onChange={event => setRoomForm(current => ({ ...current, date: event.target.value }))} /></label>
            <label>Time<input type="time" value={roomForm.time} onChange={event => setRoomForm(current => ({ ...current, time: event.target.value }))} /></label>
            <label>Passcode<input value={roomForm.passcode} onChange={event => setRoomForm(current => ({ ...current, passcode: event.target.value }))} /></label>
            <label className="wide">Purpose<textarea value={roomForm.purpose} onChange={event => setRoomForm(current => ({ ...current, purpose: event.target.value }))} /></label>
            <label className="wide">Invite Email Addresses
              <textarea value={roomForm.invited_emails} onChange={event => setRoomForm(current => ({ ...current, invited_emails: event.target.value }))} placeholder="name@example.com, second@example.com" />
            </label>
            {canManageMeetings && (
              <section className="rtbo-refroom-invite-panel wide" aria-label="Meeting invitation recipients">
                <div className="rtbo-refroom-section-head">
                  <div>
                    <h4>Member Invitations</h4>
                    <p>Select members from the member database. Invitations are sent by email and released as in-app notifications after the meeting is saved.</p>
                  </div>
                  <span>{selectedInviteMembers.length} selected</span>
                </div>
                <label className="rtbo-refroom-member-search">Search Members
                  <input value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Search by name, email, or role" />
                </label>
                <div className="rtbo-refroom-member-picker">
                  {loadingMeetings && <p className="rtbo-empty-state">Loading members...</p>}
                  {!loadingMeetings && filteredMembers.length === 0 && <p className="rtbo-empty-state">No members with email addresses are available for this search.</p>}
                  {filteredMembers.map(member => {
                    const checked = (roomForm.invited_member_ids || []).map(id => String(id)).includes(String(member.id));
                    return (
                      <label className="rtbo-refroom-member-option" key={member.id}>
                        <input type="checkbox" checked={checked} onChange={() => toggleInviteMember(member.id)} />
                        <span>{memberLabel(member)}<small>{member.email}</small></span>
                      </label>
                    );
                  })}
                </div>
                <label className="rtbo-refroom-toggle">
                  <span>{isPublicPlayer ? 'Open an email draft immediately after creating this meeting' : 'Send invitations immediately after saving this meeting'}</span>
                  <input type="checkbox" checked={Boolean(roomForm.sendInvitations)} onChange={event => setRoomForm(current => ({ ...current, sendInvitations: event.target.checked }))} />
                </label>
              </section>
            )}
            {!canManageMeetings && (
              <label className="rtbo-refroom-toggle wide">
                <span>Open an email draft immediately after creating this meeting</span>
                <input type="checkbox" checked={Boolean(roomForm.sendInvitations)} onChange={event => setRoomForm(current => ({ ...current, sendInvitations: event.target.checked }))} />
              </label>
            )}
            <div className="rtbo-refroom-form-actions">
              <button className="btn" type="submit" disabled={savingMeeting}>{savingMeeting ? 'Saving...' : editingRoomId ? 'Save Changes' : 'Create Meeting'}</button>
              <button className="btn secondary dark-btn" type="button" onClick={() => setRoomForm(EMPTY_ROOM_FORM)} disabled={savingMeeting}>Reset</button>
            </div>
          </form>

          <div className="rtbo-refroom-card-grid">
            {rooms.length === 0 && <p className="rtbo-empty-state">No RefRoom meetings have been scheduled yet.</p>}
            {rooms.map(room => (
              <article className="rtbo-refroom-room-card" key={room.id}>
                <span>{formatDateTime(room.startsAt)}</span>
                <strong>{room.title}</strong>
                {room.purpose && <p>{room.purpose}</p>}
                <small>
                  Code: {room.meetingCode}{room.passcode ? ' / Passcode set' : ''}
                  {inviteRecipientCount(room) > 0 ? ` / ${inviteRecipientCount(room)} invitee${inviteRecipientCount(room) === 1 ? '' : 's'}` : ''}
                  {room.invite_status ? ` / Invite status: ${String(room.invite_status).replace(/_/g, ' ')}` : ''}
                </small>
                {room.invite_sent_at && <small>Invites sent {formatDateTime(room.invite_sent_at)} to {room.invite_recipient_count || inviteRecipientCount(room)} recipient(s).</small>}
                <div className="rtbo-refroom-card-actions">
                  {!isPublicPlayer && <button type="button" onClick={() => startScheduledRoom(room)}>Start</button>}
                  <button type="button" onClick={() => copyInvite(room)}>Copy Invite</button>
                  <button type="button" onClick={() => openEmailInvite(room)}>Email Invite</button>
                  {canManageMeetings && <button type="button" onClick={() => sendRoomInvitations(room)} disabled={String(invitationSendingId) === String(room.id) || inviteRecipientCount(room) === 0}>{String(invitationSendingId) === String(room.id) ? 'Sending...' : 'Send Invitations'}</button>}
                  {!isPublicPlayer && <button type="button" onClick={() => editRoom(room)}>Edit</button>}
                  {!isPublicPlayer && <button className="danger" type="button" onClick={() => deleteRoom(room.id)}>Delete</button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activePanel === 'Participants' && (
        <section className="rtbo-refroom-panel">
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>Participant Control Center</h4>
              <p>Manage hosts, co-hosts, waiting rooms, and breakout movement for the active RefRoom meeting.</p>
            </div>
            <button className="btn secondary dark-btn" type="button" onClick={moveAllWaitingToMain}>Admit Waiting Rooms</button>
          </div>
          <div className="rtbo-refroom-table-wrap">
            <table className="rtbo-refroom-table">
              <thead><tr><th>Name</th><th>Role</th><th>Location</th><th>Microphone</th><th>Camera</th><th>Actions</th></tr></thead>
              <tbody>
                {refroomParticipants.map(participant => (
                  <tr key={participant.id}>
                    <td>{participant.name}<small>{participant.email}</small></td>
                    <td>
                      <select value={participantRoles[participant.id] || (participant.isCurrentUser ? 'host' : participant.role || 'attendee')} onChange={event => setParticipantRole(participant.id, event.target.value)}>
                        {PARTICIPANT_ROLES.map(role => <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={participantLocations[participant.id] || (participant.isCurrentUser ? 'main' : 'waiting')} onChange={event => moveParticipant(participant.id, event.target.value)}>
                        {breakoutLocationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td>{participant.mic ? 'On' : 'Muted'}</td>
                    <td>{participant.camera ? 'On' : 'Off'}</td>
                    <td>
                      {participant.isCurrentUser ? (
                        <>
                          <button type="button" onClick={toggleMic}>{participant.mic ? 'Mute' : 'Unmute'}</button>
                          <button type="button" onClick={toggleCamera}>{participant.camera ? 'Camera Off' : 'Camera On'}</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => moveParticipant(participant.id, 'main')}>Move Main</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activePanel === 'Breakouts' && (
        <section className="rtbo-refroom-panel">
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>Breakout Sessions</h4>
              <p>Create waiting rooms and breakout rooms, then move participants between sessions.</p>
            </div>
            <button className="btn secondary dark-btn" type="button" onClick={distributeToBreakouts}>Distribute Participants</button>
          </div>
          <form className="rtbo-refroom-chat-form" onSubmit={createBreakoutRoom}>
            <input value={breakoutName} onChange={event => setBreakoutName(event.target.value)} placeholder="Breakout room name" />
            <button className="btn" type="submit">Create Room</button>
          </form>
          <div className="rtbo-refroom-breakout-grid">
            {breakoutRooms.length === 0 && <p className="rtbo-empty-state">No breakout rooms have been created yet.</p>}
            {breakoutRooms.map(room => {
              const inRoom = refroomParticipants.filter(participant => participantLocations[participant.id] === `room:${room.id}`);
              const waiting = refroomParticipants.filter(participant => participantLocations[participant.id] === `waiting:${room.id}`);
              return (
                <article className="rtbo-refroom-breakout-card" key={room.id}>
                  <div className="rtbo-refroom-section-head">
                    <div>
                      <h4>{room.name}</h4>
                      <p>{inRoom.length} in room / {waiting.length} waiting</p>
                    </div>
                    <button className="danger" type="button" onClick={() => deleteBreakoutRoom(room.id)}>Remove</button>
                  </div>
                  <strong>In Room</strong>
                  {inRoom.length === 0 && <small>No participants assigned.</small>}
                  {inRoom.map(participant => <span className="rtbo-refroom-location-pill" key={participant.id}>{participant.name}</span>)}
                  <strong>Waiting Room</strong>
                  {waiting.length === 0 && <small>No participants waiting.</small>}
                  {waiting.map(participant => <span className="rtbo-refroom-location-pill" key={participant.id}>{participant.name}</span>)}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activePanel === 'Surveys' && (
        <section className="rtbo-refroom-panel">
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>Meeting Surveys</h4>
              <p>Create live survey questions, publish them, and collect responses inside RefRoom.</p>
            </div>
          </div>
          <form className="rtbo-refroom-form-grid" onSubmit={saveSurvey}>
            <label>Survey Title<input value={surveyForm.title} onChange={event => setSurveyForm(current => ({ ...current, title: event.target.value }))} /></label>
            <label>Type<select value={surveyForm.type} onChange={event => setSurveyForm(current => ({ ...current, type: event.target.value }))}>{SURVEY_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
            <label className="wide">Question<textarea value={surveyForm.question} onChange={event => setSurveyForm(current => ({ ...current, question: event.target.value }))} /></label>
            {surveyForm.type !== 'Short Answer' && <label className="wide">Options<textarea value={surveyForm.options} onChange={event => setSurveyForm(current => ({ ...current, options: event.target.value }))} /></label>}
            <label className="rtbo-refroom-toggle"><span>Anonymous Responses</span><input type="checkbox" checked={Boolean(surveyForm.anonymous)} onChange={event => setSurveyForm(current => ({ ...current, anonymous: event.target.checked }))} /></label>
            <div className="rtbo-refroom-form-actions"><button className="btn" type="submit">Save Survey</button></div>
          </form>
          <div className="rtbo-refroom-survey-grid">
            {surveys.length === 0 && <p className="rtbo-empty-state">No RefRoom surveys have been created yet.</p>}
            {surveys.map(survey => (
              <article className="rtbo-refroom-survey-card" key={survey.id}>
                <span>{survey.status}</span>
                <strong>{survey.title}</strong>
                <p>{survey.question}</p>
                <small>{Object.keys(survey.responses || {}).length} response(s)</small>
                {survey.status === 'published' && survey.type !== 'Short Answer' && (
                  <div className="rtbo-refroom-survey-options">
                    {survey.options.map(option => <button type="button" key={option} onClick={() => submitSurveyResponse(survey, option)}>{option}</button>)}
                  </div>
                )}
                {survey.status === 'published' && survey.type === 'Short Answer' && (
                  <form className="rtbo-refroom-chat-form" onSubmit={event => { event.preventDefault(); submitSurveyResponse(survey, event.currentTarget.elements.answer.value); event.currentTarget.reset(); }}>
                    <input name="answer" placeholder="Response" />
                    <button type="submit">Submit</button>
                  </form>
                )}
                <div className="rtbo-refroom-card-actions">
                  <button type="button" onClick={() => updateSurveyStatus(survey.id, 'published')}>Publish</button>
                  <button type="button" onClick={() => updateSurveyStatus(survey.id, 'closed')}>Close</button>
                  <button className="danger" type="button" onClick={() => deleteSurvey(survey.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activePanel === 'Chat' && (
        <section className="rtbo-refroom-panel">
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>Meeting Chat</h4>
              <p>Chats are kept by meeting and can be saved to the computer at any time.</p>
            </div>
            <div className="rtbo-refroom-form-actions">
              <button className="btn secondary dark-btn" type="button" onClick={saveCurrentChatToComputer}>Save Current Chat</button>
              <button className="btn secondary dark-btn" type="button" onClick={saveAllChatsToComputer}>Save All Chats</button>
              <button className="btn secondary dark-btn" type="button" onClick={saveAllChatsJson}>Export JSON</button>
            </div>
          </div>
          <div className="rtbo-refroom-chat-log">
            {messages.length === 0 && <p className="rtbo-empty-state">No chat messages yet.</p>}
            {messages.map(message => (
              <article key={message.id}>
                <span>{message.user} / {formatDateTime(message.at)}{message.meetingTitle ? ` / ${message.meetingTitle}` : ''}</span>
                <p>{message.message}</p>
              </article>
            ))}
          </div>
          <form className="rtbo-refroom-chat-form" onSubmit={sendMessage}>
            <input value={messageDraft} onChange={event => setMessageDraft(event.target.value)} placeholder="Type a RefRoom message..." />
            <div className="rtbo-refroom-popover-wrap">
              <button type="button" onClick={() => setChatEmojiPickerOpen(current => !current)}>Emoji</button>
              {chatEmojiPickerOpen && (
                <div className="rtbo-refroom-emoji-popover align-right" role="menu" aria-label="Message emojis">
                  {EMOJI_REACTIONS.map(item => (
                    <button key={item} type="button" onClick={() => addEmojiToMessage(item)}>{item}</button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn" type="submit">Send</button>
          </form>
        </section>
      )}

      {activePanel === 'Recordings' && (
        <section className="rtbo-refroom-panel">
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>Recordings & Transcript</h4>
              <p>All recordings are saved to the computer when recording stops. Meeting chats can be exported from the Chat panel.</p>
            </div>
            <button className="btn secondary dark-btn" type="button" onClick={saveRecordingLogToComputer}>Save Recording Log</button>
          </div>
          <form className="rtbo-refroom-chat-form" onSubmit={saveCaption}>
            <input value={captionDraft} onChange={event => setCaptionDraft(event.target.value)} placeholder="Add caption or transcript note..." />
            <button className="btn" type="submit">Add Note</button>
          </form>
          <div className="rtbo-refroom-card-grid">
            <article className="rtbo-refroom-room-card">
              <span>Transcript Notes</span>
              <strong>{transcript.length}</strong>
              {transcript.slice(-4).map(line => <p key={line.id}>{line.text}</p>)}
            </article>
            {recordings.length === 0 && <p className="rtbo-empty-state">No local recordings have been created yet.</p>}
            {recordings.map(item => (
              <article className="rtbo-refroom-room-card" key={item.id}>
                <span>{formatDateTime(item.createdAt)}</span>
                <strong>{item.filename}</strong>
                <small>{formatClock(item.duration)} / {(item.size / 1024 / 1024).toFixed(2)} MB / {item.savedToComputer ? 'Saved to computer' : 'Needs browser download permission'}</small>
                {item.meetingTitle && <small>{item.meetingTitle} / {item.meetingCode}</small>}
                {Array.isArray(item.cameraSources) && item.cameraSources.length > 0 && <small>Cameras: {item.cameraSources.join(', ')}</small>}
                {Array.isArray(item.audioSources) && item.audioSources.length > 0 && <small>Microphones: {item.audioSources.join(', ')}</small>}
              </article>
            ))}
          </div>
        </section>
      )}

      {activePanel === 'Production' && (
        <div className={`rtbo-refroom-window-backdrop${isProductionStudio ? ' is-docked' : ''}`} role="presentation">
        <section className="rtbo-refroom-panel rtbo-refroom-production-window" role="dialog" aria-modal="false" aria-label="Production Studio">
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>Production Studio</h4>
              <p>Build the RefRoom production setup with scenes, overlays, multi-source cameras, microphones, virtual backgrounds, and broadcast controls. The public player lives on the main website RefRoom page.</p>
            </div>
            <div className="rtbo-refroom-form-actions">
              {isProductionStudio ? (
                <>
                  <button className="btn secondary dark-btn" type="button" onClick={copyInvite}>Copy Public Player Link</button>
                  <button className="btn secondary dark-btn" type="button" onClick={openPublicPlayer}>Open Public Player</button>
                </>
              ) : (
                <>
                  <button className="btn secondary dark-btn" type="button" onClick={() => setActivePanel('Studio')}>Open Stage</button>
                  <button className="btn secondary dark-btn" type="button" onClick={() => setActivePanel('Studio')}>Close Window</button>
                </>
              )}
            </div>
          </div>

          <div className="rtbo-refroom-production-grid">
            <article className="rtbo-refroom-production-card">
              <h4>Camera Sources</h4>
              <label>Camera
                <select value={selectedExtraCameraDevice} onChange={event => setSelectedExtraCameraDevice(event.target.value)}>
                  <option value="">Default camera</option>
                  {devices.videoInputs.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
                </select>
              </label>
              <button type="button" onClick={addCameraFeed}>Add Camera</button>
              <div className="rtbo-refroom-camera-grid">
                {cameraFeeds.length === 0 && <small>No extra cameras added.</small>}
                {cameraFeeds.map(feed => <CameraFeedTile key={feed.id} feed={feed} onRemove={removeCameraFeed} onMakePrimary={makeCameraPrimary} />)}
              </div>
            </article>

            <article className="rtbo-refroom-production-card">
              <h4>Microphone Sources</h4>
              <label>Microphone
                <select value={selectedExtraAudioDevice} onChange={event => setSelectedExtraAudioDevice(event.target.value)}>
                  <option value="">Default microphone</option>
                  {devices.audioInputs.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
                </select>
              </label>
              <button type="button" onClick={addAudioFeed}>Add Microphone</button>
              <div className="rtbo-refroom-audio-list">
                {audioFeeds.length === 0 && <small>No extra microphones added.</small>}
                {audioFeeds.map(feed => (
                  <article className="rtbo-refroom-audio-row" key={feed.id}>
                    <span>{feed.label}</span>
                    <button type="button" onClick={() => toggleAudioFeed(feed.id)}>{feed.muted ? 'Unmute' : 'Mute'}</button>
                    <button className="danger" type="button" onClick={() => removeAudioFeed(feed.id)}>Remove</button>
                  </article>
                ))}
              </div>
            </article>

            <article className="rtbo-refroom-production-card wide">
              <h4>Virtual Backgrounds</h4>
              <div className="rtbo-refroom-background-grid">
                {VIRTUAL_BACKGROUNDS.map(background => (
                  <button
                    className={production.backgroundMode === background.id ? 'active' : ''}
                    key={background.id}
                    type="button"
                    onClick={() => selectVirtualBackground(background)}
                  >
                    <img src={background.value} alt="" />
                    <span>{background.label}</span>
                  </button>
                ))}
              </div>
              <label>Choose Image<input type="file" accept="image/*" onChange={uploadCustomBackground} /></label>
              <div className="rtbo-refroom-toggle-grid">
                <label className="rtbo-refroom-toggle"><span>Blur Background</span><input type="checkbox" checked={Boolean(production.backgroundBlur)} onChange={event => updateProduction('backgroundBlur', event.target.checked)} /></label>
                <label className="rtbo-refroom-toggle"><span>No Blurred Edges</span><input type="checkbox" checked={Boolean(production.cleanBackgroundEdges)} onChange={event => updateProduction('cleanBackgroundEdges', event.target.checked)} /></label>
              </div>
            </article>

            <article className="rtbo-refroom-production-card wide">
              <h4>Public Player Feed</h4>
              <div className="rtbo-refroom-form-grid">
                <label className="wide">Lower Third / Overlay Text<input value={production.overlayText} onChange={event => updateProduction('overlayText', event.target.value)} /></label>
                <label className="wide">Video Source URL<input value={production.destination} onChange={event => updateProduction('destination', event.target.value)} placeholder="Paste a playable MP4/WebM/HLS URL for the public RefRoom player" /></label>
                <label className="wide">Program Note<textarea value={production.programNote} onChange={event => updateProduction('programNote', event.target.value)} placeholder="Optional production note for the host team" /></label>
              </div>
              <div className="rtbo-refroom-toggle-grid">
                <label className="rtbo-refroom-toggle">
                  <span>Show Lower Third</span>
                  <input type="checkbox" checked={Boolean(production.lowerThird)} onChange={event => updateProduction('lowerThird', event.target.checked)} />
                </label>
                <label className="rtbo-refroom-toggle">
                  <span>Show Program Badge</span>
                  <input type="checkbox" checked={Boolean(production.brandOverlay)} onChange={event => updateProduction('brandOverlay', event.target.checked)} />
                </label>
              </div>
            </article>
          </div>
        </section>
        </div>
      )}

      {activePanel === 'Settings' && (
        <section className="rtbo-refroom-panel">
          <h4>Room Settings</h4>
          <div className="rtbo-refroom-form-grid">
            <label>Room Title<input value={settings.roomTitle} onChange={event => updateSetting('roomTitle', event.target.value)} /></label>
            <label>Meeting Code<input value={settings.meetingCode} onChange={event => updateSetting('meetingCode', event.target.value)} /></label>
            <label>Passcode<input value={settings.passcode} onChange={event => updateSetting('passcode', event.target.value)} /></label>
            <label>Meeting Mode<select value={settings.meetingMode} onChange={event => updateSetting('meetingMode', event.target.value)}><option>Meeting Only</option><option>Training Studio</option><option>Meeting + Training Studio</option><option>Recording Studio</option></select></label>
            <label>Recording Quality<select value={settings.recordingQuality} onChange={event => updateSetting('recordingQuality', event.target.value)}><option>720p</option><option>1080p</option><option>4K</option></select></label>
            <label>Camera<select value={selectedVideoDevice} onChange={event => setSelectedVideoDevice(event.target.value)}><option value="">Default camera</option>{devices.videoInputs.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>
            <label>Microphone<select value={selectedAudioDevice} onChange={event => setSelectedAudioDevice(event.target.value)}><option value="">Default microphone</option>{devices.audioInputs.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}</select></label>
            <div className="rtbo-refroom-toggle-grid wide">
              {[
                ['waitingRoom', 'Waiting Room'],
                ['captions', 'Captions'],
                ['liveTranscript', 'Live Transcript'],
                ['chat', 'Chat'],
                ['participantsPanel', 'Participants Panel'],
                ['autoRecord', 'Auto Record'],
                ['saveAllRecordings', 'Always Save Recordings'],
                ['saveMeetingChats', 'Save Meeting Chats'],
                ['allowScreenShare', 'Screen Share']
              ].map(([key, label]) => (
                <label className="rtbo-refroom-toggle" key={key}>
                  <span>{label}</span>
                  <input type="checkbox" checked={Boolean(settings[key])} disabled={key === 'saveAllRecordings' || key === 'saveMeetingChats'} onChange={event => updateSetting(key, event.target.checked)} />
                </label>
              ))}
            </div>
            <div className="rtbo-refroom-form-actions">
              <button className="btn secondary dark-btn" type="button" onClick={restartMediaWithSelectedDevices}>Apply Devices</button>
              <button className="btn secondary dark-btn" type="button" onClick={refreshDevices}>Refresh Devices</button>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
