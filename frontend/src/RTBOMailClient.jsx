import React, { useEffect, useMemo, useRef, useState } from 'react';
import './rtbo-mail.css';

const RTBO_THEME_KEY = 'rtbo-theme';

function formatLabel(value = '') {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function formatNotificationTimestamp(value = '') {
  if (!value) return 'Just now';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getRtboTheme() {
  const storedTheme = localStorage.getItem(RTBO_THEME_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
  const documentTheme = document.documentElement.dataset.theme;
  return documentTheme === 'light' ? 'light' : 'dark';
}

const rtbomailEmailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function rtbomailStorageKey(user = {}) {
  return `rtbomail-distribution-lists:${String(user.email || user.id || user.role || 'guest').toLowerCase()}`;
}

function rtbomailCalendarStorageKey(user = {}) {
  return `rtbomail-calendar:${String(user.email || user.id || user.role || 'guest').toLowerCase()}`;
}

function rtbomailScopedStorageKey(user = {}, scope = 'state') {
  return `rtbomail-${scope}:${String(user.email || user.id || user.role || 'guest').toLowerCase()}`;
}

function rtbomailReadStoredArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rtbomailXmlEscape(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function rtbomailUuid() {
  return window.crypto?.randomUUID?.() || `rtbo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function rtbomailDownloadTextFile(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function rtbomailNormalizeEmail(value = '') {
  const email = String(value || '').trim().replace(/^mailto:/i, '').replace(/[<>,;]+$/g, '').toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function rtbomailRecipientName(row = [], email = '') {
  const emailIndex = row.findIndex(cell => String(cell || '').toLowerCase().includes(email));
  return row
    .filter((cell, index) => index !== emailIndex)
    .map(cell => String(cell || '').trim())
    .find(cell => cell && !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(cell)) || '';
}

function rtbomailRecipientsFromRows(rows = []) {
  const recipients = new Map();
  rows.forEach(row => {
    const cells = Array.isArray(row) ? row : [row];
    const rowText = cells.join(' ');
    const matches = rowText.match(rtbomailEmailPattern) || [];
    matches.forEach(match => {
      const email = rtbomailNormalizeEmail(match);
      if (email && !recipients.has(email)) {
        recipients.set(email, { email, name: rtbomailRecipientName(cells, email) });
      }
    });
  });
  return [...recipients.values()];
}

function rtbomailRecipientsFromText(value = '') {
  return rtbomailRecipientsFromRows(String(value || '').split(/\r?\n/).map(line => line.split(/[,;\t]/)));
}

function rtbomailParseCsv(text = '', delimiter = ',') {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter(items => items.some(item => String(item || '').trim()));
}

function rtbomailXmlText(value = '') {
  const parser = new DOMParser();
  return parser.parseFromString(value, 'application/xml');
}

async function rtbomailInflateZipEntry(bytes, method) {
  if (method === 0) return bytes;
  if (method !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read compressed Excel worksheets. Save the worksheet as CSV and import it again.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function rtbomailReadZipEntries(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error('Excel workbook could not be read.');

  const entryCount = view.getUint16(eocd + 10, true);
  let centralOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = {};

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) break;
    const method = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    entries[name] = decoder.decode(await rtbomailInflateZipEntry(compressed, method));
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function rtbomailParseXlsxRecipients(file) {
  const entries = await rtbomailReadZipEntries(file);
  const sharedXml = entries['xl/sharedStrings.xml'];
  const sharedStrings = sharedXml
    ? [...rtbomailXmlText(sharedXml).querySelectorAll('si')].map(item => [...item.querySelectorAll('t')].map(text => text.textContent || '').join(''))
    : [];
  const sheetNames = Object.keys(entries).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const rows = [];

  sheetNames.forEach(name => {
    const xml = rtbomailXmlText(entries[name]);
    xml.querySelectorAll('sheetData row').forEach(rowNode => {
      const row = [];
      rowNode.querySelectorAll('c').forEach(cell => {
        const type = cell.getAttribute('t') || '';
        let value = '';
        if (type === 's') {
          value = sharedStrings[Number(cell.querySelector('v')?.textContent || 0)] || '';
        } else if (type === 'inlineStr') {
          value = [...cell.querySelectorAll('t')].map(node => node.textContent || '').join('');
        } else {
          value = cell.querySelector('v')?.textContent || '';
        }
        row.push(value);
      });
      rows.push(row);
    });
  });

  return rtbomailRecipientsFromRows(rows);
}

async function rtbomailImportRecipientsFromFile(file) {
  const extension = String(file.name || '').split('.').pop()?.toLowerCase();
  if (extension === 'xlsx' || extension === 'xlsm' || extension === 'xls') {
    return rtbomailParseXlsxRecipients(file);
  }
  const text = await file.text();
  const delimiter = extension === 'tsv' ? '\t' : ',';
  return rtbomailRecipientsFromRows(rtbomailParseCsv(text, delimiter));
}

function rtbomailAttachmentSize(bytes = 0) {
  const size = Number(bytes || 0);
  if (size >= 1048576) return `${(size / 1048576).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function rtbomailFileToAttachment(file) {
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`${file.name} is larger than the 15 MB RTBOMAIL attachment limit.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve({
        id: `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        content: result.includes(',') ? result.split(',').pop() : result
      });
    };
    reader.onerror = () => reject(new Error(`${file.name} could not be attached.`));
    reader.readAsDataURL(file);
  });
}

function createRtbomailDraft(user = {}) {
  return {
    mode: 'New Email',
    from: user.email || '',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    priority: 'Normal',
    sensitivity: 'Normal',
    category: 'General Announcement',
    audience: ['super_admin', 'admin'].includes(user.role) ? 'officials' : 'admins',
    distributionListId: '',
    sendMethod: 'Bulk Queue Delivery',
    scheduledDate: '',
    scheduledTime: '',
    body: '',
    includeOfficials: false,
    includeNewsletter: false,
    includeSchools: false,
    includeObservers: false,
    duplicateProtection: true,
    unsubscribeFooter: true,
    readReceipt: false,
    deliveryReceipt: false,
    followUpFlag: false,
    focusedInbox: true,
    encryptMessage: false,
    attachments: []
  };
}

export default function RTBOMailClient({
  user = {},
  messages = [],
  unreadCount = 0,
  onMarkRead = () => {},
  onMarkAllRead = () => {},
  onSendMessage = async () => {},
  canManageAdminUsers = false
}) {
  const [activeFolder, setActiveFolder] = useState('Inbox');
  const [selectedMailId, setSelectedMailId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mailStatus, setMailStatus] = useState('');
  const [mailTheme, setMailTheme] = useState(getRtboTheme);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [draft, setDraft] = useState(() => createRtbomailDraft(user));
  const [localDrafts, setLocalDrafts] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'drafts')));
  const [localSent, setLocalSent] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'sent')));
  const [archivedIds, setArchivedIds] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'archived')));
  const [trashIds, setTrashIds] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'trash')));
  const [flaggedIds, setFlaggedIds] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'flagged')));
  const [pinnedIds, setPinnedIds] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'pinned')));
  const [junkIds, setJunkIds] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'junk')));
  const [snoozedIds, setSnoozedIds] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'snoozed')));
  const [distributionLists, setDistributionLists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(rtbomailStorageKey(user)) || '[]');
    } catch {
      return [];
    }
  });
  const [calendarItems, setCalendarItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(rtbomailCalendarStorageKey(user)) || '[]');
    } catch {
      return [];
    }
  });
  const [calendarForm, setCalendarForm] = useState({
    type: 'appointment',
    title: '',
    date: '',
    time: '',
    notes: ''
  });
  const [distributionListName, setDistributionListName] = useState('');
  const [importingDistributionList, setImportingDistributionList] = useState(false);
  const mailBodyRef = useRef(null);
  const mailAttachmentInputRef = useRef(null);
  const [adminUsers, setAdminUsers] = useState(() => rtbomailReadStoredArray(rtbomailScopedStorageKey(user, 'admin-users')));
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    role: 'Admin',
    permissions: 'Create, Send, Receive',
    status: 'Active'
  });

  const selectedDistributionList = distributionLists.find(list => list.id === draft.distributionListId) || null;
  const selectedDistributionRecipients = selectedDistributionList?.recipients || [];
  const directRecipients = useMemo(() => rtbomailRecipientsFromText([draft.to, draft.cc, draft.bcc].filter(Boolean).join('\n')), [draft.to, draft.cc, draft.bcc]);
  const directRecipientEmails = directRecipients.map(recipient => recipient.email);
  const distributionRecipientEmails = selectedDistributionRecipients.map(recipient => recipient.email);
  const resolvedRecipientEmails = [...new Set([...directRecipientEmails, ...distributionRecipientEmails])];
  const selectedRecipients = canManageAdminUsers ? resolvedRecipientEmails.length : 0;
  const normalizedUserEmail = rtbomailNormalizeEmail(user.email || '');
  const rtbomailAccountEmail = normalizedUserEmail.endsWith('@rtboofficiating.com') ? normalizedUserEmail : 'admin@rtboofficiating.com';
  const rtbomailAccountDomain = (rtbomailAccountEmail.split('@')[1] || 'rtboofficiating.com').toLowerCase();
  const rtbomailDeviceSettings = {
    accountName: 'RTBOMAIL',
    displayName: user.name || 'Raising The Bar Officiating Inc.',
    email: rtbomailAccountEmail,
    username: rtbomailAccountEmail,
    incomingType: 'IMAP',
    incomingServer: `mail.${rtbomailAccountDomain}`,
    incomingPort: '993',
    incomingSecurity: 'SSL/TLS',
    outgoingServer: `mail.${rtbomailAccountDomain}`,
    outgoingPort: '587',
    outgoingSecurity: 'STARTTLS',
    outgoingAuth: 'Required'
  };
  const signatureText = `\n\n${[
    '--',
    'Raising The Bar Officiating Inc.',
    user.name || '',
    user.email ? `Email: ${user.email}` : 'Email: admin@rtbofficiating.com',
    'Phone#: (501) 240-4961',
    'Web: https://rtboofficiating.com'
  ].filter(Boolean).join('\n')}`;

  const inboxMessages = useMemo(() => messages.map(notification => ({
    id: `server-${notification.id}`,
    notificationId: notification.id,
    folder: 'Inbox',
    unread: !notification.is_read,
    from: notification.actor_name || notification.metadata?.released_by || 'RTBO Mail',
    to: user.email || 'Current user',
    subject: notification.title || 'RTBO Message',
    body: notification.body || 'No message details provided.',
    priority: notification.metadata?.priority || 'Normal',
    category: notification.type ? formatLabel(notification.type) : 'Message',
    createdAt: notification.created_at,
    source: 'server'
  })).filter(message => !archivedIds.includes(message.id) && !trashIds.includes(message.id)), [messages, archivedIds, trashIds, user.email]);

  const archivedMessages = messages
    .filter(notification => archivedIds.includes(`server-${notification.id}`))
    .map(notification => ({
      id: `server-${notification.id}`,
      notificationId: notification.id,
      folder: 'Archived',
      unread: !notification.is_read,
      from: notification.actor_name || notification.metadata?.released_by || 'RTBO Mail',
      to: user.email || 'Current user',
      subject: notification.title || 'RTBO Message',
      body: notification.body || 'No message details provided.',
      priority: notification.metadata?.priority || 'Normal',
      category: notification.type ? formatLabel(notification.type) : 'Message',
      createdAt: notification.created_at,
      source: 'server'
    }));
  const trashMessages = messages
    .filter(notification => trashIds.includes(`server-${notification.id}`))
    .map(notification => ({
      id: `server-${notification.id}`,
      notificationId: notification.id,
      folder: 'Trash',
      unread: !notification.is_read,
      from: notification.actor_name || notification.metadata?.released_by || 'RTBO Mail',
      to: user.email || 'Current user',
      subject: notification.title || 'RTBO Message',
      body: notification.body || 'No message details provided.',
      priority: notification.metadata?.priority || 'Normal',
      category: notification.type ? formatLabel(notification.type) : 'Message',
      createdAt: notification.created_at,
      source: 'server'
    }));
  const templateMessages = [];
  const distributionListMessages = distributionLists.map(list => ({
    id: list.id,
    folder: 'Distribution Lists',
    unread: false,
    from: 'RTBOMAIL Distribution Lists',
    to: `${Number(list.recipients?.length || 0).toLocaleString()} recipients`,
    subject: list.name,
    body: (list.recipients || []).slice(0, 40).map(recipient => `${recipient.name ? `${recipient.name} ` : ''}<${recipient.email}>`).join('\n') || 'No recipients imported yet.',
    priority: 'Normal',
    category: 'Distribution List',
    createdAt: list.createdAt,
    source: 'distribution-list',
    recipientCount: Number(list.recipients?.length || 0)
  }));
  const allMailMessages = [...inboxMessages, ...localSent, ...localDrafts, ...archivedMessages, ...trashMessages, ...distributionListMessages];
  const focusedMessages = inboxMessages.filter(message => message.unread || ['High', 'Urgent'].includes(message.priority));
  const otherMessages = inboxMessages.filter(message => !focusedMessages.some(focused => focused.id === message.id));
  const sortedCalendarItems = [...calendarItems].sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
  const calendarBuckets = {
    appointment: sortedCalendarItems.filter(item => item.type === 'appointment'),
    reminder: sortedCalendarItems.filter(item => item.type === 'reminder'),
    task: sortedCalendarItems.filter(item => item.type === 'task')
  };
  const folderMessages = {
    Inbox: inboxMessages,
    'Focused Inbox': focusedMessages,
    Other: otherMessages,
    Sent: localSent,
    Drafts: localDrafts,
    Scheduled: localDrafts.filter(item => item.sendMethod === 'Schedule Delivery'),
    Outbox: localDrafts.filter(item => item.sendMethod === 'Send Immediately'),
    Templates: templateMessages,
    'Distribution Lists': distributionListMessages,
    Archived: archivedMessages,
    Flagged: allMailMessages.filter(message => flaggedIds.includes(message.id) || message.followUpFlag),
    Pinned: allMailMessages.filter(message => pinnedIds.includes(message.id)),
    Snoozed: allMailMessages.filter(message => snoozedIds.includes(message.id)),
    'Junk Email': allMailMessages.filter(message => junkIds.includes(message.id)),
    'Deleted Items': trashMessages
  };
  const folders = [
    ['Inbox', unreadCount],
    ['Focused Inbox', folderMessages['Focused Inbox'].length],
    ['Other', folderMessages.Other.length],
    ['Sent', localSent.length],
    ['Drafts', localDrafts.length],
    ['Scheduled', folderMessages.Scheduled.length],
    ['Outbox', folderMessages.Outbox.length],
    ['Templates', templateMessages.length],
    ['Distribution Lists', distributionLists.length],
    ['Flagged', folderMessages.Flagged.length],
    ['Pinned', folderMessages.Pinned.length],
    ['Snoozed', folderMessages.Snoozed.length],
    ['Archived', archivedMessages.length],
    ['Junk Email', folderMessages['Junk Email'].length],
    ['Deleted Items', trashMessages.length]
  ];
  const topMenuItems = ['Mail', 'Calendar', 'Device Setup'];
  const visibleMessages = (folderMessages[activeFolder] || []).filter(message => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    return [message.from, message.to, message.subject, message.body, message.category].some(value => String(value || '').toLowerCase().includes(search));
  });
  const selectedMail = visibleMessages.find(message => message.id === selectedMailId) || visibleMessages[0] || null;

  useEffect(() => {
    if (activeFolder !== 'Compose' && selectedMail && selectedMail.id !== selectedMailId) {
      setSelectedMailId(selectedMail.id);
    }
  }, [activeFolder, selectedMail, selectedMailId]);

  useEffect(() => {
    localStorage.setItem(rtbomailStorageKey(user), JSON.stringify(distributionLists));
  }, [distributionLists, user]);

  useEffect(() => {
    const syncMailTheme = () => setMailTheme(getRtboTheme());
    const observer = new MutationObserver(syncMailTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('rtbo-theme-change', syncMailTheme);
    window.addEventListener('storage', syncMailTheme);
    syncMailTheme();
    return () => {
      observer.disconnect();
      window.removeEventListener('rtbo-theme-change', syncMailTheme);
      window.removeEventListener('storage', syncMailTheme);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(rtbomailCalendarStorageKey(user), JSON.stringify(calendarItems));
  }, [calendarItems, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'drafts'), JSON.stringify(localDrafts));
  }, [localDrafts, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'sent'), JSON.stringify(localSent));
  }, [localSent, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'archived'), JSON.stringify(archivedIds));
  }, [archivedIds, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'trash'), JSON.stringify(trashIds));
  }, [trashIds, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'flagged'), JSON.stringify(flaggedIds));
  }, [flaggedIds, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'pinned'), JSON.stringify(pinnedIds));
  }, [pinnedIds, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'junk'), JSON.stringify(junkIds));
  }, [junkIds, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'snoozed'), JSON.stringify(snoozedIds));
  }, [snoozedIds, user]);

  useEffect(() => {
    localStorage.setItem(rtbomailScopedStorageKey(user, 'admin-users'), JSON.stringify(adminUsers));
  }, [adminUsers, user]);

  function updateDraft(event) {
    const { name, value, type, checked } = event.target;
    setDraft(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function updateCalendarForm(event) {
    const { name, value } = event.target;
    setCalendarForm(current => ({ ...current, [name]: value }));
  }

  function saveCalendarItem(event) {
    event.preventDefault();
    if (!calendarForm.title.trim() || !calendarForm.date) {
      setMailStatus('Calendar title and date are required.');
      return;
    }
    const item = {
      id: `calendar-${Date.now()}`,
      ...calendarForm,
      title: calendarForm.title.trim(),
      notes: calendarForm.notes.trim(),
      createdAt: new Date().toISOString()
    };
    setCalendarItems(current => [item, ...current]);
    setCalendarForm({ type: calendarForm.type, title: '', date: '', time: '', notes: '' });
    setMailStatus(`${formatLabel(item.type)} saved to the RTBOMAIL calendar.`);
  }

  function removeCalendarItem(id) {
    setCalendarItems(current => current.filter(item => item.id !== id));
    setMailStatus('Calendar item removed.');
  }

  function formatDeviceSettings() {
    return [
      `${rtbomailDeviceSettings.accountName} smart device setup`,
      `Name: ${rtbomailDeviceSettings.displayName}`,
      `Email: ${rtbomailDeviceSettings.email}`,
      `Username: ${rtbomailDeviceSettings.username}`,
      `Incoming mail: ${rtbomailDeviceSettings.incomingType}`,
      `Incoming server: ${rtbomailDeviceSettings.incomingServer}`,
      `Incoming port/security: ${rtbomailDeviceSettings.incomingPort} ${rtbomailDeviceSettings.incomingSecurity}`,
      `Outgoing server: ${rtbomailDeviceSettings.outgoingServer}`,
      `Outgoing port/security: ${rtbomailDeviceSettings.outgoingPort} ${rtbomailDeviceSettings.outgoingSecurity}`,
      `Outgoing authentication: ${rtbomailDeviceSettings.outgoingAuth}`
    ].join('\n');
  }

  async function copyDeviceSettings() {
    const text = formatDeviceSettings();
    try {
      await navigator.clipboard.writeText(text);
      setMailStatus('Smart-device RTBOMAIL settings copied.');
    } catch {
      setMailStatus(text);
    }
  }

  function downloadAppleMailProfile() {
    const profileId = `com.rtbofficiating.rtbomail.${rtbomailDeviceSettings.username.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase()}`;
    const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>EmailAccountDescription</key>
      <string>${rtbomailXmlEscape(rtbomailDeviceSettings.accountName)}</string>
      <key>EmailAccountName</key>
      <string>${rtbomailXmlEscape(rtbomailDeviceSettings.displayName)}</string>
      <key>EmailAccountType</key>
      <string>EmailTypeIMAP</string>
      <key>EmailAddress</key>
      <string>${rtbomailXmlEscape(rtbomailDeviceSettings.email)}</string>
      <key>IncomingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>IncomingMailServerHostName</key>
      <string>${rtbomailXmlEscape(rtbomailDeviceSettings.incomingServer)}</string>
      <key>IncomingMailServerPortNumber</key>
      <integer>${rtbomailXmlEscape(rtbomailDeviceSettings.incomingPort)}</integer>
      <key>IncomingMailServerUseSSL</key>
      <true/>
      <key>IncomingMailServerUsername</key>
      <string>${rtbomailXmlEscape(rtbomailDeviceSettings.username)}</string>
      <key>OutgoingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>OutgoingMailServerHostName</key>
      <string>${rtbomailXmlEscape(rtbomailDeviceSettings.outgoingServer)}</string>
      <key>OutgoingMailServerPortNumber</key>
      <integer>${rtbomailXmlEscape(rtbomailDeviceSettings.outgoingPort)}</integer>
      <key>OutgoingMailServerUseSSL</key>
      <true/>
      <key>OutgoingMailServerUsername</key>
      <string>${rtbomailXmlEscape(rtbomailDeviceSettings.username)}</string>
      <key>PayloadDescription</key>
      <string>RTBOMAIL smart-device mail account. Enter the mailbox password on the device.</string>
      <key>PayloadDisplayName</key>
      <string>RTBOMAIL</string>
      <key>PayloadIdentifier</key>
      <string>${rtbomailXmlEscape(profileId)}.mail</string>
      <key>PayloadType</key>
      <string>com.apple.mail.managed</string>
      <key>PayloadUUID</key>
      <string>${rtbomailUuid()}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>RTBOMAIL smart-device setup profile.</string>
  <key>PayloadDisplayName</key>
  <string>RTBOMAIL Mail Account</string>
  <key>PayloadIdentifier</key>
  <string>${rtbomailXmlEscape(profileId)}</string>
  <key>PayloadOrganization</key>
  <string>Raising The Bar Officiating Inc.</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${rtbomailUuid()}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;
    rtbomailDownloadTextFile('rtbomail.mobileconfig', profile, 'application/x-apple-aspen-config');
    setMailStatus('Apple Mail setup profile downloaded. Install it on the smart device and enter the mailbox password.');
  }

  function resetDraft() {
    setDraft(createRtbomailDraft(user));
    setMailStatus('New RTBO Mail message started.');
  }

  function insertIntoDraftBody(prefix = '', suffix = '') {
    const textarea = mailBodyRef.current;
    setDraft(current => {
      const start = textarea?.selectionStart ?? current.body.length;
      const end = textarea?.selectionEnd ?? current.body.length;
      const selected = current.body.slice(start, end);
      const nextBody = `${current.body.slice(0, start)}${prefix}${selected || 'text'}${suffix}${current.body.slice(end)}`;
      window.requestAnimationFrame(() => {
        textarea?.focus();
        const cursor = start + prefix.length + (selected || 'text').length;
        textarea?.setSelectionRange(cursor, cursor);
      });
      return { ...current, body: nextBody };
    });
  }

  async function attachMailFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setMailStatus(`Attaching ${files.length.toLocaleString()} file${files.length === 1 ? '' : 's'}...`);
    try {
      const attachments = await Promise.all(files.map(rtbomailFileToAttachment));
      setDraft(current => ({
        ...current,
        attachments: [...(current.attachments || []), ...attachments]
      }));
      setMailStatus(`${attachments.length.toLocaleString()} file${attachments.length === 1 ? '' : 's'} attached. They will be sent with distribution email delivery.`);
    } catch (error) {
      setMailStatus(error.message || 'One or more files could not be attached.');
    } finally {
      event.target.value = '';
    }
  }

  function removeDraftAttachment(id) {
    setDraft(current => ({
      ...current,
      attachments: (current.attachments || []).filter(attachment => attachment.id !== id)
    }));
    setMailStatus('Attachment removed.');
  }

  function runMailTool(tool) {
    if (tool === 'Bold') insertIntoDraftBody('**', '**');
    if (tool === 'Italic') insertIntoDraftBody('_', '_');
    if (tool === 'Underline') insertIntoDraftBody('<u>', '</u>');
    if (tool === 'Link') insertIntoDraftBody('[', '](https://)');
    if (tool === 'Template') {
      const template = templateMessages[0];
      if (!template) {
        setMailStatus('No RTBOMAIL templates have been saved yet.');
        return;
      }
      setDraft(current => ({ ...current, subject: current.subject || template.subject, body: current.body || template.body, category: template.category }));
      setMailStatus('Template loaded into the draft.');
    }
    if (tool === 'Signature') {
      setDraft(current => ({ ...current, body: current.body.includes(signatureText.trim()) ? current.body : `${current.body}${signatureText}` }));
      setMailStatus('RTBO signature added.');
    }
    if (tool === 'Attach File') {
      mailAttachmentInputRef.current?.click();
    }
  }

  async function importDistributionList(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingDistributionList(true);
    setMailStatus(`Importing ${file.name}...`);
    try {
      const recipients = await rtbomailImportRecipientsFromFile(file);
      if (!recipients.length) {
        setMailStatus('No valid email addresses were found in the worksheet.');
        return;
      }
      const list = {
        id: `list-${Date.now()}`,
        name: distributionListName.trim() || file.name.replace(/\.[^.]+$/, ''),
        sourceFile: file.name,
        recipients,
        createdAt: new Date().toISOString()
      };
      setDistributionLists(current => [list, ...current]);
      setDistributionListName('');
      setDraft(current => ({ ...current, distributionListId: list.id }));
      setActiveFolder('Compose');
      setMailStatus(`${list.name} imported with ${recipients.length.toLocaleString()} unique recipient${recipients.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setMailStatus(error.message || 'Distribution list could not be imported.');
    } finally {
      setImportingDistributionList(false);
      event.target.value = '';
    }
  }

  function deleteDistributionList(id) {
    const list = distributionLists.find(item => item.id === id);
    if (!list || !window.confirm(`Delete distribution list "${list.name}"?`)) return;
    setDistributionLists(current => current.filter(item => item.id !== id));
    setDraft(current => current.distributionListId === id ? { ...current, distributionListId: '' } : current);
    setMailStatus('Distribution list deleted.');
  }

  function saveDraft() {
    const saved = {
      ...draft,
      id: `draft-${Date.now()}`,
      folder: draft.sendMethod === 'Schedule Delivery' ? 'Scheduled' : 'Drafts',
      unread: false,
      createdAt: new Date().toISOString(),
      source: 'draft'
    };
    setLocalDrafts(current => [saved, ...current]);
    setActiveFolder(saved.folder);
    setSelectedMailId(saved.id);
    setMailStatus(saved.folder === 'Scheduled' ? 'Scheduled message saved.' : 'Draft saved.');
  }

  async function sendDraft() {
    if (!draft.subject.trim() || !draft.body.trim()) {
      setMailStatus('Subject and message body are required before sending.');
      return;
    }
    if ((draft.attachments || []).length > 0 && !(canManageAdminUsers && resolvedRecipientEmails.length > 0)) {
      setMailStatus('Attachments require direct recipients or a distribution list so RTBOMAIL can send a real email.');
      return;
    }
    setMailStatus('Sending RTBO Mail message...');
    try {
      const delivery = await onSendMessage({
        ...draft,
        body: draft.unsubscribeFooter ? `${draft.body}${signatureText}` : draft.body,
        selectedRecipients,
        recipientEmails: canManageAdminUsers ? resolvedRecipientEmails : [],
        attachments: canManageAdminUsers ? (draft.attachments || []) : [],
        distributionListName: canManageAdminUsers ? (selectedDistributionList?.name || '') : '',
        distributionRecipientCount: canManageAdminUsers ? selectedDistributionRecipients.length : 0
      });
      const sent = {
        ...draft,
        id: `sent-${Date.now()}`,
        folder: 'Sent',
        unread: false,
        createdAt: new Date().toISOString(),
        source: 'sent'
      };
      setLocalSent(current => [sent, ...current]);
      setActiveFolder('Sent');
      setSelectedMailId(sent.id);
      setDraft(createRtbomailDraft(user));
      setMailStatus(delivery?.message || 'Message sent.');
    } catch (error) {
      setMailStatus(error.message || 'RTBO Mail could not send this message.');
    }
  }

  function prepareReply(message, mode = 'Reply') {
    if (!message) return;
    setDraft(current => ({
      ...current,
      mode,
      to: message.from,
      subject: `${mode === 'Forward' ? 'Fwd' : 'Re'}: ${message.subject || ''}`.trim(),
      body: `\n\nOn ${formatNotificationTimestamp(message.createdAt)}, ${message.from} wrote:\n${message.body}`
    }));
    setActiveFolder('Compose');
  }

  function archiveMessage(message) {
    if (!message) {
      setMailStatus('Select a message first.');
      return;
    }
    if (message.source === 'server') setArchivedIds(current => [...new Set([...current, message.id])]);
    setMailStatus('Message archived.');
  }

  function deleteMessage(message) {
    if (!message) {
      setMailStatus('Select a message first.');
      return;
    }
    if (message.source === 'distribution-list') {
      deleteDistributionList(message.id);
      return;
    }
    if (message.source === 'server') setTrashIds(current => [...new Set([...current, message.id])]);
    setMailStatus('Message moved to Trash.');
  }

  function toggleMessageCollection(message, ids, setter, activeLabel, inactiveLabel) {
    if (!message) {
      setMailStatus('Select a message first.');
      return;
    }
    const exists = ids.includes(message.id);
    setter(current => exists ? current.filter(id => id !== message.id) : [...new Set([...current, message.id])]);
    setMailStatus(exists ? inactiveLabel : activeLabel);
  }

  function addAdminUser() {
    if (!newAdmin.name.trim() || !newAdmin.email.trim()) {
      setMailStatus('Enter the admin name and email address.');
      return;
    }
    setAdminUsers(current => [{ ...newAdmin }, ...current]);
    setNewAdmin({ name: '', email: '', role: 'Admin', permissions: 'Create, Send, Receive', status: 'Active' });
    setMailStatus('RTBO Mail admin user saved.');
  }

  function loadTemplate(message) {
    setDraft(current => ({
      ...current,
      mode: 'New Email',
      category: message.category,
      subject: message.subject,
      body: message.body
    }));
    setActiveFolder('Compose');
  }

  function newMail() {
    setDraft(createRtbomailDraft(user));
    setActiveFolder('Compose');
    setMailStatus('New RTBOMAIL message started.');
  }

  return (
    <section className={`rtbo-dashboard-card rtbo-focused-page-card rtbo-mail-page rtbo-mail-${mailTheme}`}>
      <div className="rtbo-dashboard-card-head">
        <div>
          <p className="eyebrow">Standalone Email Client</p>
          <h3>Rtbomail</h3>
          <p>Mail, calendar items, smart-device setup, distribution lists, attachments, unread counts, and server-backed RTBO delivery in one workspace.</p>
        </div>
        <div className="rtbo-mail-head-actions">
          <span className="rtbo-notification-badge">{unreadCount} unread</span>
          <button className="btn secondary dark-btn" type="button" onClick={onMarkAllRead} disabled={!unreadCount}>Mark All as Read</button>
          {canManageAdminUsers && (
            <button className="btn secondary dark-btn" type="button" onClick={() => setShowAdminPanel(current => !current)}>Admin Users</button>
          )}
        </div>
      </div>

      <div className="rtbo-mail-command-ribbon" aria-label="RTBOMAIL command ribbon">
        <div className="rtbo-mail-ribbon-group primary">
          <button className="rtbo-mail-new-message-command" type="button" onClick={newMail}>New Message</button>
          <button type="button" onClick={saveDraft} disabled={activeFolder !== 'Compose'}>Save Draft</button>
          <button type="button" onClick={sendDraft} disabled={activeFolder !== 'Compose'}>Send</button>
        </div>
        <nav className="rtbo-mail-top-menu" aria-label="RTBOMAIL top menu">
          {topMenuItems.map(item => {
            const target = item === 'Mail' ? 'Inbox' : item;
            const isActive = item === 'Mail'
              ? !['Calendar', 'Device Setup', 'Compose'].includes(activeFolder)
              : activeFolder === item;
            return (
              <button className={isActive ? 'active' : ''} type="button" key={item} onClick={() => setActiveFolder(target)}>
                {item}
              </button>
            );
          })}
        </nav>
        <div className="rtbo-mail-ribbon-group">
          <button type="button" onClick={() => prepareReply(selectedMail, 'Reply')} disabled={!selectedMail || selectedMail.source === 'distribution-list'}>Reply</button>
          <button type="button" onClick={() => prepareReply(selectedMail, 'Reply All')} disabled={!selectedMail || selectedMail.source === 'distribution-list'}>Reply All</button>
          <button type="button" onClick={() => prepareReply(selectedMail, 'Forward')} disabled={!selectedMail || selectedMail.source === 'distribution-list'}>Forward</button>
        </div>
        <div className="rtbo-mail-ribbon-group">
          <button type="button" onClick={() => archiveMessage(selectedMail)} disabled={!selectedMail}>Archive</button>
          <button type="button" onClick={() => deleteMessage(selectedMail)} disabled={!selectedMail}>Delete</button>
          <button type="button" onClick={() => selectedMail?.notificationId && onMarkRead(selectedMail.notificationId)} disabled={!selectedMail?.unread || !selectedMail?.notificationId}>Mark Read</button>
          <button type="button" onClick={() => toggleMessageCollection(selectedMail, flaggedIds, setFlaggedIds, 'Message flagged.', 'Message flag removed.')} disabled={!selectedMail}>Flag</button>
          <button type="button" onClick={() => toggleMessageCollection(selectedMail, pinnedIds, setPinnedIds, 'Message pinned.', 'Message unpinned.')} disabled={!selectedMail}>Pin</button>
          <button type="button" onClick={() => toggleMessageCollection(selectedMail, snoozedIds, setSnoozedIds, 'Message snoozed.', 'Message removed from snoozed.')} disabled={!selectedMail}>Snooze</button>
          <button type="button" onClick={() => toggleMessageCollection(selectedMail, junkIds, setJunkIds, 'Message marked as junk.', 'Message restored from junk.')} disabled={!selectedMail}>Junk</button>
        </div>
        <label className="rtbo-mail-global-search">
          <span>Search</span>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search mail" />
        </label>
      </div>

      <div className="rtbo-mail-stats" aria-label="RTBO Mail delivery summary">
        <article><span>Inbox</span><strong>{inboxMessages.length.toLocaleString()}</strong></article>
        <article><span>Unread</span><strong>{unreadCount.toLocaleString()}</strong></article>
        <article><span>Lists</span><strong>{distributionLists.length.toLocaleString()}</strong></article>
        <article><span>Imported</span><strong>{distributionLists.reduce((sum, list) => sum + Number(list.recipients?.length || 0), 0).toLocaleString()}</strong></article>
        <article><span>Direct</span><strong>{directRecipientEmails.length.toLocaleString()}</strong></article>
        <article><span>Selected</span><strong>{selectedRecipients.toLocaleString()}</strong></article>
      </div>

      {canManageAdminUsers && (
      <section className="rtbo-mail-distribution-panel">
        <div>
          <h4>Distribution Lists</h4>
          <p>Import Excel, CSV, or TSV worksheets with email addresses. RTBOMAIL removes duplicates and sends imported lists through server-side batches without an application recipient cap.</p>
        </div>
        <div className="rtbo-mail-distribution-import">
          <input value={distributionListName} onChange={(event) => setDistributionListName(event.target.value)} placeholder="Distribution list name" />
          <label className="rtbo-mail-file-import">
            <span>{importingDistributionList ? 'Importing...' : 'Import Excel / CSV'}</span>
            <input type="file" accept=".xlsx,.xls,.xlsm,.csv,.tsv" onChange={importDistributionList} disabled={importingDistributionList} />
          </label>
        </div>
        {distributionLists.length > 0 && (
          <div className="rtbo-mail-distribution-list">
            {distributionLists.slice(0, 6).map(list => (
              <article key={list.id}>
                <div>
                  <strong>{list.name}</strong>
                  <span>{Number(list.recipients?.length || 0).toLocaleString()} recipients</span>
                  <small>{list.sourceFile || 'Manual list'} / {formatNotificationTimestamp(list.createdAt)}</small>
                </div>
                <div className="button-row">
                  <button className="btn secondary dark-btn" type="button" onClick={() => { setDraft(current => ({ ...current, distributionListId: list.id })); setActiveFolder('Compose'); }}>Use</button>
                  <button className="btn secondary dark-btn danger-action" type="button" onClick={() => deleteDistributionList(list.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      )}

      {showAdminPanel && (
        <section className="rtbo-mail-admin-panel">
          <div>
            <h4>Admin User Account Management</h4>
            <p>Super Admin can prepare RTBO Mail users for create, send, receive, reply, archive, and read-only workflows.</p>
          </div>
          <div className="rtbo-mail-admin-form">
            <input name="name" value={newAdmin.name} onChange={(event) => setNewAdmin(current => ({ ...current, name: event.target.value }))} placeholder="Admin name" />
            <input name="email" value={newAdmin.email} onChange={(event) => setNewAdmin(current => ({ ...current, email: event.target.value }))} placeholder="Admin email" />
            <select name="role" value={newAdmin.role} onChange={(event) => setNewAdmin(current => ({ ...current, role: event.target.value }))}>
              <option>Super Admin</option>
              <option>Admin</option>
              <option>Campaign Manager</option>
              <option>Inbox Manager</option>
              <option>Read Only</option>
            </select>
            <select name="permissions" value={newAdmin.permissions} onChange={(event) => setNewAdmin(current => ({ ...current, permissions: event.target.value }))}>
              <option>Full Access</option>
              <option>Create, Send, Receive</option>
              <option>Create & Draft Only</option>
              <option>Receive & Reply Only</option>
              <option>View Only</option>
            </select>
            <button className="btn" type="button" onClick={addAdminUser}>Create User</button>
          </div>
          <div className="rtbo-mail-admin-list">
            {adminUsers.length === 0 && <p className="rtbo-empty-state">No RTBOMAIL admin users have been added yet.</p>}
            {adminUsers.map(admin => (
              <article key={admin.email}>
                <strong>{admin.name}</strong>
                <span>{admin.email}</span>
                <small>{admin.role} / {admin.permissions} / {admin.status}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="rtbo-mail-shell">
        <aside className="rtbo-mail-folders" aria-label="RTBO Mail folders">
          {folders.map(([folder, count]) => (
            <button className={activeFolder === folder ? 'active' : ''} type="button" key={folder} onClick={() => setActiveFolder(folder)}>
              <span>{folder}</span>
              {count !== null && <b>{Number(count || 0) > 99 ? '99+' : count}</b>}
            </button>
          ))}
        </aside>

        {activeFolder === 'Compose' ? (
          <div className="rtbo-mail-compose">
            <div className="rtbo-mail-mode-row">
              {['New Email', 'Reply', 'Reply All', 'Forward'].map(mode => (
                <button className={draft.mode === mode ? 'active' : ''} type="button" key={mode} onClick={() => setDraft(current => ({ ...current, mode }))}>{mode}</button>
              ))}
            </div>
            <div className="rtbo-mail-compose-grid">
              <form className="rtbo-mail-form" onSubmit={(event) => { event.preventDefault(); sendDraft(); }}>
                <input name="from" value={draft.from} onChange={updateDraft} placeholder="From" />
                <input name="to" value={draft.to} onChange={updateDraft} placeholder="To" />
                <input name="cc" value={draft.cc} onChange={updateDraft} placeholder="CC" />
                <input name="bcc" value={draft.bcc} onChange={updateDraft} placeholder="BCC" />
                <input name="subject" value={draft.subject} onChange={updateDraft} placeholder="Subject" />
                <div className="rtbo-mail-form-grid">
                  <select name="distributionListId" value={draft.distributionListId} onChange={updateDraft}>
                    <option value="">No distribution list</option>
                    {distributionLists.map(list => <option key={list.id} value={list.id}>{list.name} ({Number(list.recipients?.length || 0).toLocaleString()})</option>)}
                  </select>
                  <select name="priority" value={draft.priority} onChange={updateDraft}>
                    <option>Low</option>
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                  <select name="sensitivity" value={draft.sensitivity} onChange={updateDraft}>
                    <option>Normal</option>
                    <option>Personal</option>
                    <option>Private</option>
                    <option>Confidential</option>
                  </select>
                  <select name="category" value={draft.category} onChange={updateDraft}>
                    <option>General Announcement</option>
                    <option>Training School</option>
                    <option>Assignment Update</option>
                    <option>Newsletter</option>
                    <option>Invoice Notice</option>
                    <option>Rules Update</option>
                    <option>Emergency Notice</option>
                  </select>
                  <select name="audience" value={draft.audience} onChange={updateDraft}>
                    {canManageAdminUsers ? (
                      <>
                        <option value="officials">Officials</option>
                        <option value="admins">Admins</option>
                        <option value="coaches">Coaches</option>
                        <option value="school_admins">School Admins</option>
                        <option value="everyone">Everyone</option>
                      </>
                    ) : (
                      <option value="admins">Admins</option>
                    )}
                  </select>
                  <select name="sendMethod" value={draft.sendMethod} onChange={updateDraft}>
                    <option>Bulk Queue Delivery</option>
                    <option>Send Immediately</option>
                    <option>Schedule Delivery</option>
                    <option>Save as Draft</option>
                  </select>
                </div>
                <div className="rtbo-mail-editor-toolbar" aria-label="Message tools">
                  {['Bold', 'Italic', 'Underline', 'Link', 'Attach File', 'Template', 'Signature'].map(tool => (
                    <button type="button" key={tool} onClick={() => runMailTool(tool)}>{tool}</button>
                  ))}
                </div>
                <input
                  ref={mailAttachmentInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={attachMailFiles}
                  aria-hidden="true"
                  tabIndex="-1"
                />
                {(draft.attachments || []).length > 0 && (
                  <div className="rtbo-mail-attachment-list" aria-label="Attached files">
                    {(draft.attachments || []).map(attachment => (
                      <span key={attachment.id || attachment.name}>
                        {attachment.name} <small>{rtbomailAttachmentSize(attachment.size)}</small>
                        <button type="button" onClick={() => removeDraftAttachment(attachment.id)}>Remove</button>
                      </span>
                    ))}
                  </div>
                )}
                <textarea ref={mailBodyRef} name="body" value={draft.body} onChange={updateDraft} placeholder="Write your email here." />
                <div className="rtbo-mail-options">
                  {[
                    ['duplicateProtection', 'Duplicate Protection'],
                    ['unsubscribeFooter', 'RTBO Signature'],
                    ['readReceipt', 'Read Receipt'],
                    ['deliveryReceipt', 'Delivery Receipt'],
                    ['followUpFlag', 'Follow Up'],
                    ['focusedInbox', 'Focused Inbox'],
                    ['encryptMessage', 'Encrypt']
                  ].map(([name, label]) => (
                    <label key={name}>
                      <span>{label}</span>
                      <input type="checkbox" name={name} checked={Boolean(draft[name])} onChange={updateDraft} />
                    </label>
                  ))}
                </div>
                <div className="rtbo-mail-schedule-row">
                  <input type="date" name="scheduledDate" value={draft.scheduledDate} onChange={updateDraft} />
                  <input type="time" name="scheduledTime" value={draft.scheduledTime} onChange={updateDraft} />
                </div>
                <div className="rtbo-form-toolbar">
                  <button className="btn" type="submit">Send</button>
                  <button className="btn secondary dark-btn" type="button" onClick={saveDraft}>Save Draft</button>
                  <button className="btn secondary dark-btn" type="button" onClick={resetDraft}>Create New</button>
                </div>
              </form>
              <article className="rtbo-mail-preview">
                <span>Live Preview</span>
                <h4>{draft.subject || 'Email Subject Preview'}</h4>
                <dl>
                  <div><dt>From</dt><dd>{draft.from}</dd></div>
                  <div><dt>To</dt><dd>{draft.to || selectedDistributionList?.name || `Audience: ${formatLabel(draft.audience)}`}</dd></div>
                  <div><dt>Priority</dt><dd>{draft.priority}</dd></div>
                  <div><dt>Security</dt><dd>{draft.sensitivity}{draft.encryptMessage ? ' / Encrypted' : ''}</dd></div>
                  <div><dt>Recipients</dt><dd>{resolvedRecipientEmails.length ? `${resolvedRecipientEmails.length.toLocaleString()} imported/direct` : 'Audience delivery'}</dd></div>
                  <div><dt>Attachments</dt><dd>{(draft.attachments || []).length ? `${draft.attachments.length.toLocaleString()} file${draft.attachments.length === 1 ? '' : 's'}` : 'None'}</dd></div>
                </dl>
                <p>{draft.body || 'Your message preview will appear here.'}</p>
                {draft.unsubscribeFooter && (
                  <div className="rtbo-mail-signature">
                    <strong>{user.name || 'Raising The Bar Officiating Inc.'}</strong>
                    {user.role && <span>{formatLabel(user.role)}</span>}
                    <small>{[user.email || 'admin@rtboofficiating.com', '(501) 240-4961', 'https://rtbofficiating.com'].filter(Boolean).join(' / ')}</small>
                  </div>
                )}
              </article>
            </div>
          </div>
        ) : activeFolder === 'Calendar' ? (
          <div className="rtbo-mail-calendar-panel">
            <header className="rtbo-mail-workspace-head">
              <div>
                <span>Calendar</span>
                <h4>Appointments, Reminders, and Tasks</h4>
              </div>
              <div className="rtbo-mail-workspace-actions">
                <button type="button" onClick={() => setCalendarForm(current => ({ ...current, type: 'appointment' }))}>Appointment</button>
                <button type="button" onClick={() => setCalendarForm(current => ({ ...current, type: 'reminder' }))}>Reminder</button>
                <button type="button" onClick={() => setCalendarForm(current => ({ ...current, type: 'task' }))}>Task</button>
              </div>
            </header>
            <form className="rtbo-mail-calendar-form" onSubmit={saveCalendarItem}>
              <label>
                <span>Type</span>
                <select name="type" value={calendarForm.type} onChange={updateCalendarForm}>
                  <option value="appointment">Appointment</option>
                  <option value="reminder">Reminder</option>
                  <option value="task">Task</option>
                </select>
              </label>
              <label>
                <span>Title</span>
                <input name="title" value={calendarForm.title} onChange={updateCalendarForm} placeholder="Add title" />
              </label>
              <label>
                <span>Date</span>
                <input type="date" name="date" value={calendarForm.date} onChange={updateCalendarForm} />
              </label>
              <label>
                <span>Time</span>
                <input type="time" name="time" value={calendarForm.time} onChange={updateCalendarForm} />
              </label>
              <label className="rtbo-mail-calendar-notes">
                <span>Notes</span>
                <input name="notes" value={calendarForm.notes} onChange={updateCalendarForm} placeholder="Location, assignment, reminder, or task notes" />
              </label>
              <button type="submit">Save Calendar Item</button>
            </form>
            <div className="rtbo-mail-calendar-grid">
              {[
                ['appointment', 'Appointments'],
                ['reminder', 'Reminders'],
                ['task', 'Tasks']
              ].map(([type, title]) => (
                <section className="rtbo-mail-calendar-list" key={type}>
                  <h5>{title}</h5>
                  {calendarBuckets[type].length === 0 && <p className="rtbo-empty-state">No {title.toLowerCase()} saved yet.</p>}
                  {calendarBuckets[type].map(item => (
                    <article key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{[item.date, item.time].filter(Boolean).join(' at ') || 'Date pending'}</span>
                        {item.notes && <p>{item.notes}</p>}
                      </div>
                      <button type="button" onClick={() => removeCalendarItem(item.id)}>Remove</button>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          </div>
        ) : activeFolder === 'Device Setup' ? (
          <div className="rtbo-mail-device-panel">
            <header className="rtbo-mail-workspace-head">
              <div>
                <span>Smart Device Setup</span>
                <h4>Add RTBOMAIL to Phone and Tablet Mail Apps</h4>
              </div>
              <div className="rtbo-mail-workspace-actions">
                <button type="button" onClick={copyDeviceSettings}>Copy Settings</button>
                <button type="button" onClick={downloadAppleMailProfile}>Download Apple Profile</button>
              </div>
            </header>
            <div className="rtbo-mail-device-grid">
              <section>
                <h5>Account</h5>
                <dl>
                  <div><dt>Name</dt><dd>{rtbomailDeviceSettings.displayName}</dd></div>
                  <div><dt>Email</dt><dd>{rtbomailDeviceSettings.email}</dd></div>
                  <div><dt>Username</dt><dd>{rtbomailDeviceSettings.username}</dd></div>
                </dl>
              </section>
              <section>
                <h5>Incoming Mail</h5>
                <dl>
                  <div><dt>Type</dt><dd>{rtbomailDeviceSettings.incomingType}</dd></div>
                  <div><dt>Server</dt><dd>{rtbomailDeviceSettings.incomingServer}</dd></div>
                  <div><dt>Port</dt><dd>{rtbomailDeviceSettings.incomingPort}</dd></div>
                  <div><dt>Security</dt><dd>{rtbomailDeviceSettings.incomingSecurity}</dd></div>
                </dl>
              </section>
              <section>
                <h5>Outgoing Mail</h5>
                <dl>
                  <div><dt>Server</dt><dd>{rtbomailDeviceSettings.outgoingServer}</dd></div>
                  <div><dt>Port</dt><dd>{rtbomailDeviceSettings.outgoingPort}</dd></div>
                  <div><dt>Security</dt><dd>{rtbomailDeviceSettings.outgoingSecurity}</dd></div>
                  <div><dt>Authentication</dt><dd>{rtbomailDeviceSettings.outgoingAuth}</dd></div>
                </dl>
              </section>
            </div>
            <div className="rtbo-mail-device-steps">
              <article>
                <strong>iPhone or iPad</strong>
                <p>Open Mail account settings, choose Other, add a Mail Account, then use the account, incoming, and outgoing values shown here. The downloaded profile can prefill the same values and will still require the mailbox password.</p>
              </article>
              <article>
                <strong>Android</strong>
                <p>Open the phone mail app, choose Add Account, select Other or IMAP, and enter these RTBOMAIL settings. Use the RTBOMAIL mailbox password when the device asks for authentication.</p>
              </article>
            </div>
          </div>
        ) : (
          <div className="rtbo-mail-reader">
            <div className="rtbo-mail-reader-grid">
              <div className="rtbo-mail-list">
                {visibleMessages.length === 0 && <p className="rtbo-empty-state">No mail in this folder.</p>}
                {visibleMessages.map(message => (
                  <article className={`${message.unread ? 'unread' : ''}${selectedMail?.id === message.id ? ' selected' : ''}`} key={message.id}>
                    <button type="button" onClick={() => setSelectedMailId(message.id)}>
                      <strong>{message.subject || 'No subject'}</strong>
                      <span>{message.from}</span>
                      <small>{formatNotificationTimestamp(message.createdAt)} / {message.category}</small>
                    </button>
                    {message.unread && message.notificationId && (
                      <button className="rtbo-mail-mark-read" type="button" onClick={() => onMarkRead(message.notificationId)}>Mark as Read</button>
                    )}
                    {message.source === 'template' && (
                      <button className="rtbo-mail-mark-read" type="button" onClick={() => loadTemplate(message)}>Use Template</button>
                    )}
                  </article>
                ))}
              </div>
              <article className="rtbo-mail-open-message">
                {selectedMail ? (
                  <>
                    <div className="rtbo-mail-open-head">
                      <div>
                        <span>{selectedMail.priority} / {selectedMail.category}</span>
                        <h4>{selectedMail.subject}</h4>
                        <p>{selectedMail.from} to {selectedMail.to}</p>
                        <small>{formatNotificationTimestamp(selectedMail.createdAt)}</small>
                      </div>
                      <div className="rtbo-form-toolbar">
                        {selectedMail.unread && selectedMail.notificationId && (
                          <button className="btn secondary dark-btn" type="button" onClick={() => onMarkRead(selectedMail.notificationId)}>Mark as Read</button>
                        )}
                        <button className="btn secondary dark-btn" type="button" onClick={() => prepareReply(selectedMail, 'Reply')}>Reply</button>
                        <button className="btn secondary dark-btn" type="button" onClick={() => prepareReply(selectedMail, 'Forward')}>Forward</button>
                        {selectedMail.source === 'distribution-list' && (
                          <button className="btn secondary dark-btn" type="button" onClick={() => { setDraft(current => ({ ...current, distributionListId: selectedMail.id })); setActiveFolder('Compose'); }}>Use List</button>
                        )}
                        <button className="btn secondary dark-btn" type="button" onClick={() => archiveMessage(selectedMail)}>Archive</button>
                        <button className="btn secondary dark-btn" type="button" onClick={() => deleteMessage(selectedMail)}>Delete</button>
                      </div>
                    </div>
                    <p className="rtbo-mail-open-body">{selectedMail.body}</p>
                  </>
                ) : (
                  <p className="rtbo-empty-state">Select a message to read it.</p>
                )}
              </article>
            </div>
          </div>
        )}
      </div>
      {mailStatus && <p className="form-message">{mailStatus}</p>}
    </section>
  );
}
