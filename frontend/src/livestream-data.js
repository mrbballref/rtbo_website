export const livestreamChannels = [
  {
    id: 'website',
    label: 'Website',
    mark: 'WEB',
    status: 'Primary',
    title: 'RTBO Website Broadcast',
    description: 'The main home for school coverage, film breakdowns, court mechanics, guest instruction, and promotional moments.',
    icon: '3d_rtbo_livestream_icon.jpg',
    streamUrl: '',
    embedUrl: '',
    embedHtml: '',
    watchUrl: '#livestream',
    aspect: 'wide'
  },
  {
    id: 'youtube',
    label: 'YouTube',
    mark: 'YT',
    status: 'Simulcast',
    title: 'YouTube Live',
    description: 'Public livestream and replay destination for training sessions, school highlights, and shareable long-form video.',
    icon: '3d_youtube_livestream_icon.jpg',
    streamUrl: '',
    embedUrl: '',
    embedHtml: '',
    watchUrl: 'https://www.youtube.com',
    aspect: 'wide'
  },
  {
    id: 'facebook',
    label: 'Facebook',
    mark: 'FB',
    status: 'Community',
    title: 'Facebook Live',
    description: 'Community-facing coverage for parents, partner schools, organizations, coaches, and basketball supporters.',
    icon: '3d_facebook_livestream_icon.jpg',
    streamUrl: '',
    embedUrl: '',
    embedHtml: '',
    watchUrl: 'https://www.facebook.com',
    aspect: 'wide'
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    mark: 'TT',
    status: 'Vertical',
    title: 'TikTok Live',
    description: 'Vertical live moments, short training clips, behind-the-scenes school energy, and promotional recaps.',
    icon: '3d_tiktok_livestream_icon.jpg',
    streamUrl: '',
    embedUrl: '',
    embedHtml: '',
    watchUrl: 'https://www.tiktok.com',
    aspect: 'vertical'
  },
  {
    id: 'instagram',
    label: 'Instagram',
    mark: 'IG',
    status: 'Social',
    title: 'Instagram Live',
    description: 'Promotional live coverage, reels-ready highlights, official interviews, and event-day audience engagement.',
    icon: '3d_instagram_livestream_icon.jpg',
    streamUrl: '',
    embedUrl: '',
    embedHtml: '',
    watchUrl: 'https://www.instagram.com',
    aspect: 'vertical'
  }
];

export const livestreamSchedule = [
  ['June 9-10, 2026', 'UAPB - H.O. Clemmons Arena', 'Training school coverage, mechanics, rules instruction, and film review.'],
  ['June 19, 2026', 'UCA - Farris Center', 'Live court instruction, mentorship, and promotional school moments.'],
  ['July 21-22, 2026', 'UALR - Jack Stephens Center', 'Evaluation clips, film breakdowns, interviews, and training recaps.']
];

export const livestreamRunOfShow = [
  'Pre-school welcome, daily schedule, and sponsor or partner recognition.',
  'Live court mechanics, rules instruction, guest teaching blocks, and film breakdowns.',
  'Official interviews, evaluation clips, promotional recaps, and replay-ready highlights.'
];

export const livestreamInitialChat = [];

export const livestreamScenes = [
  {
    id: 'opening',
    name: 'Opening Slate',
    cue: 'Pre-Show',
    layout: 'Slate',
    sources: ['Logo', 'Countdown', 'Music'],
    note: 'Branded holding screen before the training school starts.'
  },
  {
    id: 'court',
    name: 'Court Cam',
    cue: 'Program',
    layout: 'Wide',
    sources: ['Court Camera', 'Mic A', 'Score Strip'],
    note: 'Main live court coverage for drills, mechanics, and teaching blocks.'
  },
  {
    id: 'breakdown',
    name: 'Film Breakdown',
    cue: 'Teach',
    layout: 'Picture-in-picture',
    sources: ['Replay', 'Clinician Cam', 'Telestration'],
    note: 'Replay analysis with clinician commentary and on-screen points.'
  },
  {
    id: 'interview',
    name: 'Guest Interview',
    cue: 'Guest',
    layout: 'Split',
    sources: ['Host', 'Guest', 'Lower Third'],
    note: 'Two-up interview setup for clinicians, guests, and officials.'
  },
  {
    id: 'promo',
    name: 'Promo Close',
    cue: 'Close',
    layout: 'Vertical clips',
    sources: ['Highlights', 'CTA', 'Logo'],
    note: 'Short-form promotional moments for social platforms.'
  }
];

export const livestreamOverlays = [
  ['logo', 'RTBO Logo Bug'],
  ['scorebug', 'Training Score Strip'],
  ['lowerThird', 'Lower Third'],
  ['comment', 'Viewer Comment'],
  ['countdown', 'Countdown Timer']
];

export const livestreamDestinations = [
  ['website', 'Website', 'Ready'],
  ['youtube', 'YouTube', 'Ready'],
  ['facebook', 'Facebook', 'Ready'],
  ['tiktok', 'TikTok', 'Vertical'],
  ['instagram', 'Instagram', 'Vertical']
];

export const livestreamStudioSources = [
  ['cameraA', 'Court Camera', 'Camera', 84],
  ['cameraB', 'Clinician Camera', 'Camera', 76],
  ['screen', 'Screen Share', 'Source', 68],
  ['guest', 'Remote Guest', 'Guest', 72],
  ['mic', 'Floor Audio', 'Audio', 81]
];

export const livestreamProducerComments = [
  ['Coach Williams', 'Great angle on the block-charge teaching point.'],
  ['Official Davis', 'Can you show that rotation again from the weak side?'],
  ['Parent View', 'The live training coverage looks outstanding.'],
  ['RTBO Staff', 'Reminder: interviews start after the next teaching block.']
];
