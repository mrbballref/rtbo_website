import React, { useEffect, useMemo, useRef, useState } from 'react';
import './refroom.css';

const REFROOM_PANELS = ['Studio', 'Meetings', 'Participants', 'Chat', 'Recordings', 'Settings'];
const REFROOM_LAYOUTS = ['Speaker View', 'Gallery View', 'Film Study', 'Screen Share', 'Broadcast Desk'];
const REACTIONS = ['Applause', 'Agree', 'Question', 'Slow Down', 'Rule Check'];

const DEFAULT_SETTINGS = {
  roomTitle: 'RefRoom',
  passcode: '',
  waitingRoom: true,
  captions: true,
  liveTranscript: true,
  chat: true,
  participantsPanel: true,
  autoRecord: false,
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
  passcode: ''
};

function scopedKey(user = {}, scope = 'state') {
  const identity = String(user.email || user.id || user.role || 'guest').toLowerCase();
  return `rtbo-refroom-${scope}:${identity}`;
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

function userInitials(user = {}) {
  const name = String(user.name || user.email || user.role || 'User').trim();
  return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'RR';
}

function displayName(user = {}) {
  return user.name || user.email || 'Current User';
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

export default function RefRoom({ user = {}, onStatus = () => {} }) {
  const videoRef = useRef(null);
  const viewportRef = useRef(null);
  const recorderRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(null);

  const [activePanel, setActivePanel] = useState('Studio');
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
  const [elapsed, setElapsed] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [deviceError, setDeviceError] = useState('');
  const [devices, setDevices] = useState({ audioInputs: [], videoInputs: [] });
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    meetingCode: createMeetingCode(),
    ...safeReadJson(scopedKey(user, 'settings'), {})
  }));
  const [rooms, setRooms] = useState(() => safeReadJson(scopedKey(user, 'rooms'), []));
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM_FORM);
  const [editingRoomId, setEditingRoomId] = useState('');
  const [messages, setMessages] = useState(() => safeReadJson(scopedKey(user, 'messages'), []));
  const [messageDraft, setMessageDraft] = useState('');
  const [recordings, setRecordings] = useState(() => safeReadJson(scopedKey(user, 'recordings'), []));
  const [transcript, setTranscript] = useState(() => safeReadJson(scopedKey(user, 'transcript'), []));

  const programStream = screenSharing && screenStream ? screenStream : localStream;
  const currentParticipant = useMemo(() => ({
    id: user.email || user.id || 'current-user',
    name: displayName(user),
    role: user.role || 'member',
    status: roomActive ? (recording ? 'Recording' : 'In Room') : 'Not Connected',
    mic: micEnabled,
    camera: cameraEnabled
  }), [cameraEnabled, micEnabled, recording, roomActive, user]);

  useEffect(() => {
    safeWriteJson(scopedKey(user, 'settings'), settings);
  }, [settings, user]);

  useEffect(() => {
    safeWriteJson(scopedKey(user, 'rooms'), rooms);
  }, [rooms, user]);

  useEffect(() => {
    safeWriteJson(scopedKey(user, 'messages'), messages);
  }, [messages, user]);

  useEffect(() => {
    safeWriteJson(scopedKey(user, 'recordings'), recordings);
  }, [recordings, user]);

  useEffect(() => {
    safeWriteJson(scopedKey(user, 'transcript'), transcript);
  }, [transcript, user]);

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
    if (!roomActive) return undefined;
    const timer = window.setInterval(() => setElapsed(current => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [roomActive]);

  useEffect(() => {
    refreshDevices();
    return () => {
      stopStream(localStreamRef.current);
      stopStream(screenStreamRef.current);
    };
  }, []);

  function updateStatus(message) {
    setStatusMessage(message);
    onStatus(message);
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
    setLocalStream(null);
    setScreenStream(null);
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
    const stream = streamOverride || programStream || await startRoom();
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
    const filename = `refroom-${startedAt.toISOString().replace(/[:.]/g, '-')}.webm`;
    if (blob.size > 0) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    setRecordings(current => [
      {
        id: createId('recording'),
        filename,
        createdAt: startedAt.toISOString(),
        duration: elapsed,
        size: blob.size
      },
      ...current
    ]);
    setRecording(false);
    updateStatus('Recording stopped and the WebM file was downloaded.');
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
      } else {
        await viewport.requestFullscreen();
      }
    } catch (error) {
      updateStatus(error?.message || 'Fullscreen mode could not be opened.');
    }
  }

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#${settings.meetingCode}`;
    const invite = [
      `${settings.roomTitle}`,
      `Meeting Code: ${settings.meetingCode}`,
      settings.passcode ? `Passcode: ${settings.passcode}` : '',
      inviteUrl
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(invite);
      updateStatus('RefRoom invite copied to the clipboard.');
    } catch {
      updateStatus('Invite could not be copied by this browser.');
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    setMessages(current => [
      ...current,
      {
        id: createId('message'),
        user: displayName(user),
        message: messageDraft.trim(),
        at: new Date().toISOString()
      }
    ]);
    setMessageDraft('');
  }

  function saveCaption(event) {
    event.preventDefault();
    if (!captionDraft.trim()) return;
    setTranscript(current => [
      ...current,
      {
        id: createId('caption'),
        speaker: displayName(user),
        text: captionDraft.trim(),
        at: new Date().toISOString()
      }
    ]);
    setCaptionDraft('');
  }

  function saveRoom(event) {
    event.preventDefault();
    if (!roomForm.title.trim() || !roomForm.date || !roomForm.time) {
      updateStatus('Complete the room title, date, and time before saving the RefRoom meeting.');
      return;
    }
    const startsAt = `${roomForm.date}T${roomForm.time}`;
    const nextRoom = {
      id: editingRoomId || createId('room'),
      title: roomForm.title.trim(),
      purpose: roomForm.purpose.trim(),
      passcode: roomForm.passcode.trim(),
      startsAt,
      meetingCode: editingRoomId
        ? rooms.find(room => room.id === editingRoomId)?.meetingCode || createMeetingCode()
        : createMeetingCode()
    };
    setRooms(current => editingRoomId
      ? current.map(room => (room.id === editingRoomId ? nextRoom : room))
      : [nextRoom, ...current]
    );
    setEditingRoomId('');
    setRoomForm(EMPTY_ROOM_FORM);
    updateStatus(editingRoomId ? 'RefRoom meeting updated.' : 'RefRoom meeting scheduled.');
  }

  function editRoom(room) {
    const [date = '', time = ''] = String(room.startsAt || '').split('T');
    setEditingRoomId(room.id);
    setRoomForm({
      title: room.title || '',
      date,
      time,
      purpose: room.purpose || '',
      passcode: room.passcode || ''
    });
    setActivePanel('Meetings');
  }

  function deleteRoom(roomId) {
    setRooms(current => current.filter(room => room.id !== roomId));
    if (editingRoomId === roomId) {
      setEditingRoomId('');
      setRoomForm(EMPTY_ROOM_FORM);
    }
    updateStatus('RefRoom meeting deleted.');
  }

  async function startScheduledRoom(room) {
    setSettings(current => ({
      ...current,
      roomTitle: room.title,
      passcode: room.passcode,
      meetingCode: room.meetingCode
    }));
    setActivePanel('Studio');
    await startRoom();
  }

  function updateSetting(name, value) {
    setSettings(current => ({ ...current, [name]: value }));
  }

  const stats = [
    ['Participants', roomActive ? 1 : 0, roomActive ? 'Current browser participant connected' : 'No one is connected'],
    ['Scheduled', rooms.length, 'Saved RefRoom meetings'],
    ['Recordings', recordings.length, 'Local browser recordings saved'],
    ['Room Time', formatClock(elapsed), roomActive ? 'Room is active' : 'Room is idle']
  ];

  return (
    <section className="rtbo-dashboard-card rtbo-focused-page-card rtbo-refroom-page">
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Virtual Meeting Studio</p>
          <h3>RefRoom</h3>
          <p>Run virtual meetings, officiating film rooms, training sessions, recordings, chat, screen share, and meeting controls from one workspace.</p>
        </div>
        <div className="rtbo-form-toolbar">
          <button className="btn secondary dark-btn" type="button" onClick={copyInvite}>Copy Invite</button>
          <button className={roomActive ? 'btn danger' : 'btn'} type="button" onClick={roomActive ? endRoom : startRoom}>
            {roomActive ? 'End Room' : 'Start Room'}
          </button>
        </div>
      </div>

      {statusMessage && <p className="rtbo-dashboard-status">{statusMessage}</p>}
      {deviceError && <p className="form-message error">{deviceError}</p>}

      <nav className="rtbo-refroom-tabs" aria-label="RefRoom workspace">
        {REFROOM_PANELS.map(panel => (
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

      <div className="rtbo-refroom-stat-grid" aria-label="RefRoom status">
        {stats.map(([label, value, detail]) => (
          <article className="rtbo-refroom-stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>

      {activePanel === 'Studio' && (
        <div className="rtbo-refroom-studio-grid">
          <section className="rtbo-refroom-stage-card">
            <div className="rtbo-refroom-stage-head">
              <div>
                <h4>{settings.roomTitle}</h4>
                <p>Code: {settings.meetingCode} / Layout: {settings.selectedLayout}</p>
              </div>
              <div className="rtbo-refroom-live-flags">
                <span className={roomActive ? 'is-live' : ''}>{roomActive ? 'Room Live' : 'Room Idle'}</span>
                {recording && <span className="is-recording">REC</span>}
                {screenSharing && <span>Screen Share</span>}
              </div>
            </div>

            <div className="rtbo-refroom-viewport" ref={viewportRef}>
              {programStream ? (
                <video ref={videoRef} autoPlay playsInline muted />
              ) : (
                <div className="rtbo-refroom-video-placeholder">
                  <span>{userInitials(user)}</span>
                  <strong>{displayName(user)}</strong>
                  <small>Start the room to enable the camera, microphone, and meeting viewport.</small>
                </div>
              )}
              <div className="rtbo-refroom-program-badge">Program</div>
              <div className="rtbo-refroom-lower-third">
                <strong>{displayName(user)}</strong>
                <span>{settings.meetingMode}</span>
              </div>
              {captionsOpen && transcript.length > 0 && (
                <div className="rtbo-refroom-caption-overlay">
                  {transcript.slice(-1).map(line => <span key={line.id}>{line.text}</span>)}
                </div>
              )}
              {reaction && <div className="rtbo-refroom-reaction">{reaction}</div>}
            </div>

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
              <button type="button" onClick={toggleFullscreen}>Fullscreen</button>
              <button type="button" onClick={copyInvite}>Invite</button>
              <button className="danger" type="button" onClick={endRoom}>End</button>
            </div>
          </section>

          <aside className="rtbo-refroom-side-stack">
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
                  <span>{userInitials(user)}</span>
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
            </section>
          </aside>
        </div>
      )}

      {activePanel === 'Meetings' && (
        <section className="rtbo-refroom-panel">
          <div className="rtbo-refroom-section-head">
            <div>
              <h4>Schedule RefRoom</h4>
              <p>Create meeting rooms and start them from the same dashboard window.</p>
            </div>
            {editingRoomId && <button className="btn secondary dark-btn" type="button" onClick={() => { setEditingRoomId(''); setRoomForm(EMPTY_ROOM_FORM); }}>Cancel Edit</button>}
          </div>
          <form className="rtbo-refroom-form-grid" onSubmit={saveRoom}>
            <label>Room Title<input value={roomForm.title} onChange={event => setRoomForm(current => ({ ...current, title: event.target.value }))} /></label>
            <label>Date<input type="date" value={roomForm.date} onChange={event => setRoomForm(current => ({ ...current, date: event.target.value }))} /></label>
            <label>Time<input type="time" value={roomForm.time} onChange={event => setRoomForm(current => ({ ...current, time: event.target.value }))} /></label>
            <label>Passcode<input value={roomForm.passcode} onChange={event => setRoomForm(current => ({ ...current, passcode: event.target.value }))} /></label>
            <label className="wide">Purpose<textarea value={roomForm.purpose} onChange={event => setRoomForm(current => ({ ...current, purpose: event.target.value }))} /></label>
            <div className="rtbo-refroom-form-actions">
              <button className="btn" type="submit">{editingRoomId ? 'Save Changes' : 'Save Meeting'}</button>
              <button className="btn secondary dark-btn" type="button" onClick={() => setRoomForm(EMPTY_ROOM_FORM)}>Reset</button>
            </div>
          </form>

          <div className="rtbo-refroom-card-grid">
            {rooms.length === 0 && <p className="rtbo-empty-state">No RefRoom meetings have been scheduled yet.</p>}
            {rooms.map(room => (
              <article className="rtbo-refroom-room-card" key={room.id}>
                <span>{formatDateTime(room.startsAt)}</span>
                <strong>{room.title}</strong>
                {room.purpose && <p>{room.purpose}</p>}
                <small>Code: {room.meetingCode}{room.passcode ? ' / Passcode set' : ''}</small>
                <div className="rtbo-refroom-card-actions">
                  <button type="button" onClick={() => startScheduledRoom(room)}>Start</button>
                  <button type="button" onClick={() => editRoom(room)}>Edit</button>
                  <button className="danger" type="button" onClick={() => deleteRoom(room.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activePanel === 'Participants' && (
        <section className="rtbo-refroom-panel">
          <h4>Participant Control Center</h4>
          <div className="rtbo-refroom-table-wrap">
            <table className="rtbo-refroom-table">
              <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Microphone</th><th>Camera</th><th>Actions</th></tr></thead>
              <tbody>
                <tr>
                  <td>{currentParticipant.name}</td>
                  <td>{String(currentParticipant.role).replace(/_/g, ' ')}</td>
                  <td>{currentParticipant.status}</td>
                  <td>{currentParticipant.mic ? 'On' : 'Muted'}</td>
                  <td>{currentParticipant.camera ? 'On' : 'Off'}</td>
                  <td><button type="button" onClick={toggleMic}>{currentParticipant.mic ? 'Mute' : 'Unmute'}</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activePanel === 'Chat' && (
        <section className="rtbo-refroom-panel">
          <h4>Meeting Chat</h4>
          <div className="rtbo-refroom-chat-log">
            {messages.length === 0 && <p className="rtbo-empty-state">No chat messages yet.</p>}
            {messages.map(message => (
              <article key={message.id}>
                <span>{message.user} / {formatDateTime(message.at)}</span>
                <p>{message.message}</p>
              </article>
            ))}
          </div>
          <form className="rtbo-refroom-chat-form" onSubmit={sendMessage}>
            <input value={messageDraft} onChange={event => setMessageDraft(event.target.value)} placeholder="Type a RefRoom message..." />
            <button className="btn" type="submit">Send</button>
          </form>
        </section>
      )}

      {activePanel === 'Recordings' && (
        <section className="rtbo-refroom-panel">
          <h4>Recordings & Transcript</h4>
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
                <small>{formatClock(item.duration)} / {(item.size / 1024 / 1024).toFixed(2)} MB</small>
              </article>
            ))}
          </div>
        </section>
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
                ['allowScreenShare', 'Screen Share']
              ].map(([key, label]) => (
                <label className="rtbo-refroom-toggle" key={key}>
                  <span>{label}</span>
                  <input type="checkbox" checked={Boolean(settings[key])} onChange={event => updateSetting(key, event.target.checked)} />
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
