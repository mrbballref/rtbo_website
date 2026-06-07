import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';

const FPS = 30;
const INTRO_SECONDS = 4;
const CONTENT_SECONDS = 69;
const OUTRO_SECONDS = 5;
const DURATION_SECONDS = INTRO_SECONDS + CONTENT_SECONDS + OUTRO_SECONDS;
const INTRO_FRAMES = INTRO_SECONDS * FPS;
const OUTRO_FRAMES = OUTRO_SECONDS * FPS;
const NARRATION_START_FRAMES = INTRO_FRAMES + 18;
const SCALE = CONTENT_SECONDS / 60;
const CAPTION_LEAD_SECONDS = 0.12;
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ORANGE = '#f58220';
const ORANGE_DEEP = '#ff5a1f';
const CYAN = '#22d3ee';
const WHITE = '#f8fafc';
const BLACK = '#05070a';
const PHOTO_FILTER = 'brightness(1.42) saturate(1.18) contrast(1.02)';

export const rtbMarketingScenes = [
  {
    id: 'opening',
    start: 0,
    end: 4,
    visual: 'Basketball bounce, whistle close-up, court lights, referee shoes stepping onto hardwood.',
    voiceover: 'Every game deserves officials who are prepared, confident, and ready for the moment.',
    text: 'Raise the Standard.',
    motion: 'Fast cuts, logo fade-in, subtle camera shake, whistle sound hit.'
  },
  {
    id: 'classroom-intro',
    start: 4,
    end: 9,
    visual: 'Instructor teaching new officials in a classroom with game footage projected.',
    voiceover: "At Raising The Bar Officiating School, officials don't just learn the game...",
    text: 'Raising The Bar Officiating School',
    motion: 'Slide-in title, projector glow, warm classroom lighting.'
  },
  {
    id: 'film-breakdown',
    start: 9,
    end: 15,
    visual: 'Instructor pauses basketball footage and marks player contact, angles, and referee positioning.',
    voiceover: 'They learn how to see the game, break down footage, recognize plays, and make decisions with purpose.',
    text: 'Video Breakdown • Play Recognition • Decision Making',
    motion: 'Animated circles, arrows, freeze-frame highlights.'
  },
  {
    id: 'rules-philosophy',
    start: 15,
    end: 22,
    visual: 'Whiteboard or smartboard showing Rules, Mechanics, Philosophy, Game Management.',
    voiceover: 'From basketball rules and mechanics to officiating philosophies and game management, training is built to sharpen judgment and court presence.',
    text: 'Rules. Mechanics. Philosophy. Presence.',
    motion: 'Kinetic text reveal on each keyword.'
  },
  {
    id: 'refzone-university',
    start: 22,
    end: 28,
    visual: 'Online learning dashboard mockup with modules, lesson thumbnails, quiz card, and progress bar.',
    voiceover: 'Then continue your development with RefZone University — online learning that keeps officials growing beyond the classroom.',
    text: 'RefZone University — Keep Learning. Keep Growing.',
    motion: 'Clean UI animation, progress bar fill, laptop/tablet transition.'
  },
  {
    id: 'live-game',
    start: 28,
    end: 35,
    visual: 'Three referees officiating a live basketball game as Lead, Center, and Trail.',
    voiceover: 'Now take that knowledge to the floor, where three-person crews work positioning, communication, coverage, and confidence in real time.',
    text: 'Live Game Reps — 3-Person Crew Development',
    motion: 'Court-map overlay, labels for Lead, Center, Trail.'
  },
  {
    id: 'sideline-observation',
    start: 35,
    end: 41,
    visual: 'Instructor observes from sideline with clipboard or tablet as officials make calls.',
    voiceover: 'Experienced instructors observe the details — the calls, the no-calls, the angles, and the presence.',
    text: 'Real-Time Observation',
    motion: 'Slow motion on call moments, highlight frame effect.'
  },
  {
    id: 'postgame-feedback',
    start: 41,
    end: 48,
    visual: 'Instructor meets with three referees after the game and reviews film on a tablet.',
    voiceover: 'After the final horn, the growth continues with direct feedback, film review, and practical next steps officials can use immediately.',
    text: 'Feedback That Builds Officials',
    motion: 'Warm tone shift, lower-third: Post-Game Evaluation.'
  },
  {
    id: 'got-u-nex',
    start: 48,
    end: 54,
    visual: 'Got U Nex assigning platform mockup showing available games, accepted assignment, calendar, and crew list.',
    voiceover: 'And with the Got U Nex Ref Assigning Platform, officials and assignors can stay connected, organized, and ready for the next opportunity.',
    text: 'Got U Nex — Assignments. Communication. Opportunity.',
    motion: 'Dashboard cards animate in, assignment accepted checkmark.'
  },
  {
    id: 'final-cta',
    start: 54,
    end: 60,
    visual: 'Montage of classroom, online learning, live game, post-game feedback, assignment accepted, then logo.',
    voiceover: 'Raising The Bar Officiating Inc. Register for school. Sign up for RefZone University. Get your next assignment with Got U Nex.',
    text: 'Register. Learn. Get Assigned.',
    motion: 'Logo lockup, CTA, QR/contact placeholder, music resolve.'
  }
];

const rtboAdCaptions = [
  [0.1, 4.821, 'Every game deserves officials who are prepared, confident, and ready for the moment.'],
  [4.821, 9.285, "At Raising The Bar Officiating School, officials don't just learn the game."],
  [9.285, 15.446, 'They learn how to see the game, break down footage, recognize plays, and make decisions with purpose.'],
  [15.446, 22.991, 'From basketball rules and mechanics to officiating philosophies and game management, training is built to sharpen judgment and court presence.'],
  [22.991, 29.308, 'Then continue your development with RefZone University, online learning that keeps officials growing beyond the classroom.'],
  [29.308, 36.785, 'Now take that knowledge to the floor, where three-person crews work positioning, communication, coverage, and confidence in real time.'],
  [36.785, 43.225, 'Experienced instructors observe the details: the calls, the no-calls, the angles, and the presence.'],
  [43.225, 50.837, 'After the final horn, the growth continues with direct feedback, film review, and practical next steps officials can use immediately.'],
  [50.837, 58.493, 'And with the Got U Nex Ref Assigning Platform, officials and assignors can stay connected, organized, and ready for the next opportunity.'],
  [58.493, 62.265, 'Raising The Bar Officiating Inc. Register for school.'],
  [62.265, 64.81, 'Sign up for RefZone University.'],
  [64.81, 67.466, 'Get your next assignment with Got U Nex.']
].map(([start, end, text]) => ({ start, end, text }));

function frameFromSeconds(seconds) {
  return Math.round((INTRO_SECONDS + seconds * SCALE) * FPS);
}

function captionFrameFromSeconds(seconds) {
  return Math.round((NARRATION_START_FRAMES / FPS + Math.max(0, seconds - CAPTION_LEAD_SECONDS)) * FPS);
}

function img(path) {
  return staticFile(`assets/images/${path}`);
}

function audio(path) {
  return staticFile(`assets/audio/${path}`);
}

function ease(frame, input, output) {
  return interpolate(frame, input, output, {
    ...CLAMP,
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  });
}

function inOut(localFrame, duration, delay = 0) {
  const inValue = ease(localFrame, [delay, delay + 20], [0, 1]);
  const outValue = interpolate(localFrame, [duration - 18, duration], [1, 0], {
    ...CLAMP,
    easing: Easing.in(Easing.cubic)
  });
  return inValue * outValue;
}

function ScenePhoto({ src, localFrame, duration, position = 'center', dark = 0.62 }) {
  const scale = interpolate(localFrame, [0, duration], [1.05, 1.16], CLAMP);
  const x = interpolate(localFrame, [0, duration], [-1.2, 1.2], CLAMP);
  const veil = Math.max(0, dark - 0.38);

  return (
    <>
      <Img
        src={img(src)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: position,
          transform: `scale(${scale}) translate3d(${x}%, 0, 0)`,
          filter: PHOTO_FILTER
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: `rgba(5,7,10,${veil})` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,7,10,.46), rgba(5,7,10,.16) 48%, rgba(5,7,10,.02))' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.18), transparent 38%, rgba(245,130,32,.12))', mixBlendMode: 'screen' }} />
    </>
  );
}

function Texture({ frame }) {
  const scan = (frame * 0.22) % 100;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: BLACK }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 20%, rgba(245,130,32,.34), transparent 28%), radial-gradient(circle at 84% 70%, rgba(34,211,238,.2), transparent 32%), linear-gradient(135deg, #080c12, #19222d 58%, #0a0f15)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '70px 70px', transform: `translate3d(${-frame * 0.12}px, ${frame * 0.08}px, 0)`, opacity: 0.36 }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${Math.max(0, scan - 11)}%, rgba(245,130,32,.18) ${scan}%, transparent ${Math.min(100, scan + 11)}%)`, mixBlendMode: 'screen' }} />
    </AbsoluteFill>
  );
}

function LogoBug() {
  return (
    <div style={{ position: 'absolute', left: 54, top: 42, height: 76, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px 10px 12px', border: '1px solid rgba(255,255,255,.2)', background: 'rgba(5,7,10,.68)', borderRadius: 16, boxShadow: '0 18px 42px rgba(0,0,0,.28)' }}>
      <Img src={img('rtbo-ad/rtbo-logo.png')} style={{ width: 56, height: 56, objectFit: 'contain' }} />
      <div style={{ display: 'grid', gap: 3 }}>
        <strong style={{ color: WHITE, fontSize: 21, fontWeight: 950, lineHeight: 1 }}>RTBO</strong>
        <span style={{ color: '#cbd5e1', fontSize: 15, fontWeight: 800 }}>Raising The Bar Officiating</span>
      </div>
    </div>
  );
}

function Headline({ eyebrow, title, body, localFrame, duration, width = 930 }) {
  const show = inOut(localFrame, duration, 6);
  const x = interpolate(show, [0, 1], [-46, 0], CLAMP);
  return (
    <div style={{ position: 'absolute', left: 86, top: 178, width, opacity: show, transform: `translate3d(${x}px, 0, 0)` }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '9px 15px', borderRadius: 999, border: '1px solid rgba(245,130,32,.58)', background: 'rgba(5,7,10,.62)', color: ORANGE, fontSize: 22, fontWeight: 950, textTransform: 'uppercase' }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: CYAN, boxShadow: '0 0 18px rgba(34,211,238,.8)' }} />
        {eyebrow}
      </div>
      <h1 style={{ margin: '28px 0 0', color: WHITE, fontSize: 78, lineHeight: 1, fontWeight: 950, letterSpacing: 0, textShadow: '0 18px 46px rgba(0,0,0,.42)' }}>{title}</h1>
      {body ? <p style={{ maxWidth: 880, margin: '26px 0 0', color: '#dbeafe', fontSize: 32, lineHeight: 1.24, fontWeight: 750 }}>{body}</p> : null}
    </div>
  );
}

function TextPill({ children, style }) {
  return (
    <div style={{ padding: '14px 18px', borderLeft: `6px solid ${ORANGE}`, background: 'rgba(255,255,255,.1)', color: WHITE, fontSize: 25, lineHeight: 1.15, fontWeight: 950, boxShadow: '0 18px 46px rgba(0,0,0,.22)', ...style }}>
      {children}
    </div>
  );
}

function LogoIntroScene({ localFrame, duration }) {
  const logoIn = ease(localFrame, [8, 34], [0, 1]);
  const logoOut = interpolate(localFrame, [duration - 26, duration], [1, 0], {
    ...CLAMP,
    easing: Easing.in(Easing.cubic)
  });
  const show = logoIn * logoOut;
  const glow = interpolate(localFrame, [0, duration], [0.2, 0.72], CLAMP);
  const line = interpolate(localFrame, [46, duration - 24], [0, 1], CLAMP);

  return (
    <AbsoluteFill>
      <Texture frame={localFrame} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 44%, rgba(245,130,32,${glow}), rgba(12,18,24,.34) 34%, rgba(5,7,10,.84) 72%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 108, height: 3, background: `linear-gradient(90deg, transparent, ${ORANGE}, ${CYAN}, transparent)`, transform: `scaleX(${line})`, opacity: 0.9 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 132, height: 3, background: `linear-gradient(90deg, transparent, ${CYAN}, ${ORANGE}, transparent)`, transform: `scaleX(${line})`, opacity: 0.9 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', opacity: show, transform: `translateY(${interpolate(show, [0, 1], [24, 0], CLAMP)}px) scale(${interpolate(show, [0, 1], [0.94, 1], CLAMP)})` }}>
        <div>
          <Img src={img('rtbo-ad/rtbo-logo.png')} style={{ width: 330, height: 330, objectFit: 'contain', filter: 'drop-shadow(0 28px 64px rgba(0,0,0,.5))' }} />
          <h1 style={{ margin: '24px 0 0', color: WHITE, fontSize: 78, lineHeight: 1, fontWeight: 950, letterSpacing: 0, textShadow: '0 18px 42px rgba(0,0,0,.42)' }}>Raising The Bar Officiating Inc.</h1>
          <p style={{ margin: '18px auto 0', maxWidth: 1180, color: '#e8edf3', fontSize: 34, lineHeight: 1.18, fontWeight: 900, textTransform: 'uppercase' }}>We Will Serve, and Will Be Of Service To The Game!</p>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function LogoOutroScene({ localFrame, duration }) {
  const show = inOut(localFrame, duration, 3);
  const glow = interpolate(localFrame, [0, duration], [0.5, 0.82], CLAMP);
  const line = interpolate(localFrame, [8, 44], [0, 1], CLAMP);

  return (
    <AbsoluteFill>
      <Texture frame={localFrame + 1600} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 42%, rgba(245,130,32,${glow}), rgba(4,8,13,.52) 36%, rgba(3,5,8,.92) 76%)` }} />
      <div style={{ position: 'absolute', left: 190, right: 190, top: 134, height: 4, background: `linear-gradient(90deg, transparent, ${ORANGE}, ${CYAN}, ${ORANGE}, transparent)`, transform: `scaleX(${line})`, opacity: 0.95 }} />
      <div style={{ position: 'absolute', left: 190, right: 190, bottom: 126, height: 4, background: `linear-gradient(90deg, transparent, ${CYAN}, ${ORANGE}, ${CYAN}, transparent)`, transform: `scaleX(${line})`, opacity: 0.95 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', opacity: show, transform: `translateY(${interpolate(show, [0, 1], [24, 0], CLAMP)}px) scale(${interpolate(show, [0, 1], [0.95, 1], CLAMP)})` }}>
        <div>
          <Img src={img('rtbo-ad/rtbo-logo.png')} style={{ width: 360, height: 360, objectFit: 'contain', filter: 'drop-shadow(0 30px 72px rgba(0,0,0,.55))' }} />
          <h1 style={{ margin: '20px 0 0', color: WHITE, fontSize: 82, lineHeight: 1, fontWeight: 950, letterSpacing: 0, textShadow: '0 18px 46px rgba(0,0,0,.45)' }}>Raising The Bar Officiating Inc.</h1>
          <p style={{ margin: '22px auto 0', maxWidth: 1260, color: '#f6f8fb', fontSize: 38, lineHeight: 1.18, fontWeight: 950, textTransform: 'uppercase', textShadow: '0 12px 34px rgba(0,0,0,.5)' }}>We Will Serve, and Will Be Of Service To The Game!</p>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function OpeningScene({ localFrame, duration }) {
  const cut = Math.floor(localFrame / 26) % 4;
  const show = inOut(localFrame, duration, 2);
  return (
    <AbsoluteFill>
      <Texture frame={localFrame} />
      {cut === 0 ? <ScenePhoto src="rtbo-ad/three-person-crew-evaluation.png" localFrame={localFrame} duration={duration} dark={0.72} position="center" /> : null}
      {cut === 1 ? <ScenePhoto src="rtbo-ad/court-officials-briefing.png" localFrame={localFrame} duration={duration} dark={0.68} position="center" /> : null}
      {cut >= 2 ? <ScenePhoto src="rtbo-ad/court-mechanics-training.png" localFrame={localFrame} duration={duration} dark={0.7} position="center" /> : null}
      <div style={{ position: 'absolute', left: 86, bottom: 140, opacity: show, transform: `scale(${interpolate(show, [0, 1], [0.9, 1], CLAMP)})` }}>
        <Img src={img('rtbo-ad/rtbo-logo.png')} style={{ width: 180, height: 180, objectFit: 'contain', filter: 'drop-shadow(0 22px 42px rgba(0,0,0,.5))' }} />
        <h1 style={{ margin: '12px 0 0', color: WHITE, fontSize: 92, lineHeight: 0.96, fontWeight: 950, letterSpacing: 0 }}>Raise the Standard.</h1>
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${Math.sin(localFrame * .7) * 5}px, ${Math.cos(localFrame * .55) * 4}px, 0)` }} />
    </AbsoluteFill>
  );
}

function FilmBreakdownScene({ localFrame, duration }) {
  const draw = interpolate(localFrame, [12, duration - 20], [0, 1], CLAMP);
  return (
    <AbsoluteFill>
      <ScenePhoto src="rtbo-ad/three-person-crew-evaluation.png" localFrame={localFrame} duration={duration} dark={0.48} position="center" />
      <LogoBug />
      <Headline eyebrow="Film Breakdown" title="See the game." body="Break down footage, recognize plays, and make decisions with purpose." localFrame={localFrame} duration={duration} width={780} />
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="1010" cy="430" r={120 * draw} fill="none" stroke={ORANGE} strokeWidth="8" strokeDasharray="18 12" opacity=".95" />
        <circle cx="1390" cy="470" r={88 * draw} fill="none" stroke={CYAN} strokeWidth="7" opacity=".75" />
        <path d="M1040 540 C1160 610 1260 630 1390 560" fill="none" stroke={ORANGE} strokeWidth="7" strokeDasharray="14 14" strokeDashoffset={(1 - draw) * 200} opacity=".9" />
        <path d="M830 710 L980 515" fill="none" stroke={CYAN} strokeWidth="6" strokeDasharray="13 12" strokeDashoffset={(1 - draw) * 220} opacity=".85" />
      </svg>
      <TextPill style={{ position: 'absolute', left: 86, bottom: 104, width: 840 }}>Video Breakdown • Play Recognition • Decision Making</TextPill>
    </AbsoluteFill>
  );
}

function RulesScene({ localFrame, duration }) {
  const words = ['Rules', 'Mechanics', 'Philosophy', 'Presence'];
  return (
    <AbsoluteFill>
      <ScenePhoto src="rtbo-ad/court-mechanics-training.png" localFrame={localFrame} duration={duration} dark={0.58} position="center" />
      <LogoBug />
      <Headline eyebrow="Court Classroom" title="Sharpen judgment." body="Training connects rules, mechanics, philosophy, and game management to real court presence." localFrame={localFrame} duration={duration} width={840} />
      <div style={{ position: 'absolute', right: 90, top: 176, width: 560, display: 'grid', gap: 18 }}>
        {words.map((word, index) => {
          const show = ease(localFrame, [index * 24 + 10, index * 24 + 30], [0, 1]);
          return (
            <div key={word} style={{ opacity: show, transform: `translate3d(${interpolate(show, [0, 1], [48, 0], CLAMP)}px, 0, 0)`, padding: '24px 28px', border: '1px solid rgba(245,130,32,.45)', background: index % 2 ? 'rgba(34,211,238,.12)' : 'rgba(245,130,32,.15)', borderRadius: 18, color: WHITE, fontSize: 46, fontWeight: 950 }}>
              {word}.
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function RefZoneScene({ localFrame, duration }) {
  const progress = interpolate(localFrame, [18, duration - 16], [8, 86], CLAMP);
  const cards = ['Video Lesson', 'Rules Quiz', 'Film Notes', 'Progress Review'];
  return (
    <AbsoluteFill>
      <Texture frame={localFrame + 400} />
      <LogoBug />
      <Headline eyebrow="RefZone University" title="Keep learning." body="Online learning keeps officials growing beyond the classroom." localFrame={localFrame} duration={duration} width={770} />
      <div style={{ position: 'absolute', right: 96, top: 140, width: 680, height: 720, borderRadius: 26, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(8,13,21,.86)', boxShadow: '0 30px 80px rgba(0,0,0,.42)', padding: 34 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26 }}>
          <Img src={img('refzone/refzone_u_logo.png')} style={{ width: 66, height: 66, objectFit: 'contain' }} />
          <div>
            <strong style={{ display: 'block', color: WHITE, fontSize: 31, fontWeight: 950 }}>RefZone University</strong>
            <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 800 }}>Official development workspace</span>
          </div>
        </div>
        <div style={{ height: 14, borderRadius: 999, background: 'rgba(255,255,255,.15)', overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${ORANGE}, ${CYAN})` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {cards.map((card, index) => {
            const show = ease(localFrame, [index * 12 + 10, index * 12 + 28], [0, 1]);
            return (
              <div key={card} style={{ minHeight: 140, opacity: show, transform: `translateY(${interpolate(show, [0, 1], [28, 0], CLAMP)}px)`, borderRadius: 18, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.07)', padding: 18 }}>
                <span style={{ color: ORANGE, fontSize: 18, fontWeight: 950 }}>0{index + 1}</span>
                <strong style={{ display: 'block', color: WHITE, marginTop: 12, fontSize: 25, fontWeight: 950 }}>{card}</strong>
                <p style={{ margin: '10px 0 0', color: '#cbd5e1', fontSize: 17, lineHeight: 1.25, fontWeight: 700 }}>Study, practice, and track your next step.</p>
              </div>
            );
          })}
        </div>
      </div>
      <TextPill style={{ position: 'absolute', left: 86, bottom: 108, width: 650 }}>Keep Learning. Keep Growing.</TextPill>
    </AbsoluteFill>
  );
}

function LiveGameScene({ localFrame, duration }) {
  const labels = [
    ['Lead', 610, 700],
    ['Center', 1080, 360],
    ['Trail', 1540, 270]
  ];
  return (
    <AbsoluteFill>
      <ScenePhoto src="rtbo-ad/three-person-crew-evaluation.png" localFrame={localFrame} duration={duration} dark={0.35} position="center" />
      <LogoBug />
      <Headline eyebrow="Live Game Reps" title="Work as a crew." body="Positioning, communication, coverage, and confidence in real time." localFrame={localFrame} duration={duration} width={780} />
      {labels.map(([label, x, y], index) => {
        const show = ease(localFrame, [index * 14 + 20, index * 14 + 38], [0, 1]);
        return (
          <div key={label} style={{ position: 'absolute', left: x, top: y, opacity: show, transform: `translateY(${interpolate(show, [0, 1], [22, 0], CLAMP)}px)`, display: 'grid', justifyItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, background: CYAN, boxShadow: '0 0 26px rgba(34,211,238,.82)' }} />
            <div style={{ padding: '10px 16px', borderRadius: 999, background: 'rgba(5,7,10,.76)', border: '1px solid rgba(34,211,238,.5)', color: WHITE, fontSize: 24, fontWeight: 950 }}>{label}</div>
          </div>
        );
      })}
      <TextPill style={{ position: 'absolute', left: 86, bottom: 104, width: 710 }}>3-Person Crew Development</TextPill>
    </AbsoluteFill>
  );
}

function ObservationScene({ localFrame, duration }) {
  return (
    <AbsoluteFill>
      <ScenePhoto src="rtbo-ad/three-person-crew-evaluation.png" localFrame={localFrame} duration={duration} dark={0.46} position="center" />
      <LogoBug />
      <Headline eyebrow="Real-Time Observation" title="Observe the details." body="The calls, the no-calls, the angles, and the presence." localFrame={localFrame} duration={duration} width={820} />
      <div style={{ position: 'absolute', right: 98, bottom: 124, width: 520, borderRadius: 24, border: `3px solid ${ORANGE}`, background: 'rgba(5,7,10,.72)', padding: 28, boxShadow: '0 28px 72px rgba(0,0,0,.48)' }}>
        <strong style={{ color: ORANGE, fontSize: 30, fontWeight: 950 }}>Highlight Frame</strong>
        {['Angles', 'Coverage', 'Communication', 'Presence'].map((item, index) => (
          <div key={item} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, color: WHITE, fontSize: 24, fontWeight: 900 }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', color: BLACK, background: index <= localFrame / 34 ? '#22c55e' : 'rgba(255,255,255,.16)' }}>✓</span>
            {item}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function FeedbackScene({ localFrame, duration }) {
  return (
    <AbsoluteFill>
      <ScenePhoto src="rtbo-ad/court-officials-briefing.png" localFrame={localFrame} duration={duration} dark={0.42} position="center" />
      <LogoBug />
      <Headline eyebrow="Post-Game Evaluation" title="Feedback that builds officials." body="Direct feedback, film review, and practical next steps officials can use immediately." localFrame={localFrame} duration={duration} width={900} />
      <div style={{ position: 'absolute', left: 86, right: 86, bottom: 82, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {['Direct Feedback', 'Film Review', 'Next Steps'].map((item, index) => (
          <div key={item} style={{ minHeight: 112, borderRadius: 18, border: '1px solid rgba(255,255,255,.18)', background: index === 1 ? 'rgba(34,211,238,.13)' : 'rgba(245,130,32,.15)', padding: 24 }}>
            <span style={{ color: ORANGE, fontSize: 18, fontWeight: 950 }}>0{index + 1}</span>
            <strong style={{ display: 'block', color: WHITE, fontSize: 28, marginTop: 8, fontWeight: 950 }}>{item}</strong>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function GotUNexScene({ localFrame, duration }) {
  const cards = [
    ['Available Game', 'Varsity • 7:00 PM'],
    ['Assignment Accepted', 'Crew confirmed'],
    ['Crew List', 'Lead • Center • Trail'],
    ['Calendar Sync', 'Ready for game day']
  ];
  return (
    <AbsoluteFill>
      <Texture frame={localFrame + 900} />
      <ScenePhoto src="u-got-nex-ref-platform.jpg" localFrame={localFrame} duration={duration} dark={0.76} position="center" />
      <LogoBug />
      <Headline eyebrow="Got U Nex" title="Stay connected." body="Officials and assignors stay organized and ready for the next opportunity." localFrame={localFrame} duration={duration} width={760} />
      <div style={{ position: 'absolute', right: 92, top: 146, width: 680, height: 690, borderRadius: 24, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(8,13,21,.86)', padding: 30 }}>
        <strong style={{ color: WHITE, fontSize: 34, fontWeight: 950 }}>Assigning Dashboard</strong>
        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          {cards.map(([title, detail], index) => {
            const show = ease(localFrame, [index * 14 + 14, index * 14 + 32], [0, 1]);
            return (
              <div key={title} style={{ opacity: show, transform: `translateX(${interpolate(show, [0, 1], [42, 0], CLAMP)}px)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: '20px 22px', borderRadius: 16, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.08)' }}>
                <div>
                  <strong style={{ color: WHITE, fontSize: 25, fontWeight: 950 }}>{title}</strong>
                  <span style={{ display: 'block', marginTop: 6, color: '#cbd5e1', fontSize: 18, fontWeight: 760 }}>{detail}</span>
                </div>
                <span style={{ width: 42, height: 42, borderRadius: 999, display: 'grid', placeItems: 'center', background: index === 1 ? '#22c55e' : ORANGE, color: BLACK, fontSize: 24, fontWeight: 950 }}>✓</span>
              </div>
            );
          })}
        </div>
      </div>
      <TextPill style={{ position: 'absolute', left: 86, bottom: 104, width: 760 }}>Assignments. Communication. Opportunity.</TextPill>
    </AbsoluteFill>
  );
}

function FinalScene({ localFrame, duration }) {
  const show = inOut(localFrame, duration, 4);
  const photos = ['rtbo-ad/court-mechanics-training.png', 'rtbo-ad/three-person-crew-evaluation.png', 'rtbo-ad/court-officials-briefing.png'];
  return (
    <AbsoluteFill>
      <Texture frame={localFrame + 1200} />
      {photos.map((photo, index) => {
        const opacity = interpolate(localFrame, [index * 22, index * 22 + 18, duration - 10], [0, 0.34, 0.16], CLAMP);
        return <Img key={photo} src={img(photo)} style={{ position: 'absolute', left: `${index * 31}%`, top: 0, width: '46%', height: '100%', objectFit: 'cover', opacity, filter: PHOTO_FILTER }} />;
      })}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(245,130,32,.28), rgba(0,0,0,.34) 50%, rgba(0,0,0,.62))' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 88, display: 'grid', justifyItems: 'center', textAlign: 'center', opacity: show, transform: `translateY(${interpolate(show, [0, 1], [32, 0], CLAMP)}px)` }}>
        <Img src={img('rtbo-ad/rtbo-logo.png')} style={{ width: 270, height: 270, objectFit: 'contain', filter: 'drop-shadow(0 26px 60px rgba(0,0,0,.56))' }} />
        <h1 style={{ margin: '10px 0 0', maxWidth: 1120, color: WHITE, fontSize: 78, lineHeight: 1.02, fontWeight: 950, letterSpacing: 0 }}>Raising The Bar Officiating Inc.</h1>
        <p style={{ margin: '22px 0 0', color: '#e2e8f0', fontSize: 34, fontWeight: 820 }}>Register. Learn. Get Assigned.</p>
        <div style={{ marginTop: 32, display: 'flex', gap: 18, alignItems: 'center' }}>
          <span style={{ padding: '18px 28px', borderRadius: 999, background: `linear-gradient(90deg, ${ORANGE}, ${ORANGE_DEEP})`, color: BLACK, fontSize: 31, fontWeight: 950 }}>rtbofficiating.com</span>
          <span style={{ padding: '18px 28px', borderRadius: 999, border: '1px solid rgba(255,255,255,.24)', background: 'rgba(255,255,255,.08)', color: WHITE, fontSize: 27, fontWeight: 950 }}>QR / Contact Placeholder</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ClassroomScene({ localFrame, duration }) {
  return (
    <AbsoluteFill>
      <ScenePhoto src="rtbo-ad/court-mechanics-training.png" localFrame={localFrame} duration={duration} dark={0.48} position="center" />
      <LogoBug />
      <Headline eyebrow="Officiating School" title="Learn how to see the game." body="Officials don't just learn the game. They learn preparation, confidence, and purpose." localFrame={localFrame} duration={duration} width={850} />
      <TextPill style={{ position: 'absolute', left: 86, bottom: 104, width: 680 }}>Raising The Bar Officiating School</TextPill>
    </AbsoluteFill>
  );
}

function SceneRenderer({ scene, localFrame, duration }) {
  if (scene.id === 'opening') return <OpeningScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'classroom-intro') return <ClassroomScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'film-breakdown') return <FilmBreakdownScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'rules-philosophy') return <RulesScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'refzone-university') return <RefZoneScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'live-game') return <LiveGameScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'sideline-observation') return <ObservationScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'postgame-feedback') return <FeedbackScene localFrame={localFrame} duration={duration} />;
  if (scene.id === 'got-u-nex') return <GotUNexScene localFrame={localFrame} duration={duration} />;
  return <FinalScene localFrame={localFrame} duration={duration} />;
}

function AudioBed() {
  return (
    <>
      <Audio
        src={audio('rtbo-78-ad-bed.wav')}
        volume={(audioFrame) => {
          const fadeIn = interpolate(audioFrame, [0, 50], [0, 0.42], CLAMP);
          const fadeOut = interpolate(audioFrame, [DURATION_SECONDS * FPS - 100, DURATION_SECONDS * FPS], [1, 0], CLAMP);
          const duck = audioFrame >= NARRATION_START_FRAMES && audioFrame <= NARRATION_START_FRAMES + 2015 ? 0.6 : 1;
          return fadeIn * fadeOut * duck;
        }}
      />
      <Sequence from={NARRATION_START_FRAMES}>
        <Audio
          src={audio('rtbo-60-ad-narration.mp3')}
          volume={(audioFrame) => {
            const fadeIn = interpolate(audioFrame, [0, 12], [0, 1], CLAMP);
            const fadeOut = interpolate(audioFrame, [1980, 2015], [1, 0], CLAMP);
            return fadeIn * fadeOut;
          }}
        />
      </Sequence>
    </>
  );
}

function ProgressBar() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const width = interpolate(frame, [0, durationInFrames], [0, 100], CLAMP);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, background: 'rgba(255,255,255,.14)' }}>
      <div style={{ width: `${width}%`, height: '100%', background: `linear-gradient(90deg, ${ORANGE}, ${CYAN}, ${WHITE})` }} />
    </div>
  );
}

function CaptionOverlay({ frame }) {
  const activeCaption = rtboAdCaptions.find((caption) => {
    const from = captionFrameFromSeconds(caption.start);
    const to = captionFrameFromSeconds(caption.end);
    return frame >= from && frame < to;
  });

  if (!activeCaption) {
    return null;
  }

  const from = captionFrameFromSeconds(activeCaption.start);
  const to = captionFrameFromSeconds(activeCaption.end);
  const localFrame = frame - from;
  const duration = Math.max(1, to - from);
  const fadeIn = interpolate(localFrame, [0, 2], [0, 1], CLAMP);
  const fadeOut = interpolate(localFrame, [duration - 4, duration], [1, 0], CLAMP);
  const opacity = Math.min(fadeIn, fadeOut);
  const captionFontSize = activeCaption.text.length > 120 ? 30 : activeCaption.text.length > 88 ? 33 : 38;

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity }}>
      <div style={{ maxWidth: 1320, minHeight: 74, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 34px' }}>
        <p style={{ margin: 0, color: WHITE, fontSize: captionFontSize, lineHeight: 1.18, fontWeight: 900, textAlign: 'center', letterSpacing: 0, WebkitTextStroke: '1.5px rgba(0,0,0,.88)', textShadow: '0 3px 4px rgba(0,0,0,.95), 0 7px 18px rgba(0,0,0,.88), 0 0 32px rgba(0,0,0,.72)' }}>{activeCaption.text}</p>
      </div>
    </div>
  );
}

export function RTBOAdvertisingVideo() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BLACK, color: WHITE, fontFamily: 'Inter, Arial, Helvetica, sans-serif' }}>
      <AudioBed />
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <LogoIntroScene localFrame={frame} duration={INTRO_FRAMES} />
      </Sequence>
      {rtbMarketingScenes.map((scene) => {
        const from = frameFromSeconds(scene.start);
        const end = frameFromSeconds(scene.end);
        const duration = Math.max(1, end - from);
        const localFrame = frame - from;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={duration}>
            <SceneRenderer scene={scene} localFrame={localFrame} duration={duration} />
          </Sequence>
        );
      })}
      <Sequence from={frameFromSeconds(60)} durationInFrames={OUTRO_FRAMES}>
        <LogoOutroScene localFrame={frame - frameFromSeconds(60)} duration={OUTRO_FRAMES} />
      </Sequence>
      <div style={{ position: 'absolute', right: 52, top: 44, color: '#cbd5e1', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', opacity: 0.78 }}>RTBO advertising film</div>
      <CaptionOverlay frame={frame} />
      <ProgressBar />
    </AbsoluteFill>
  );
}

export const rtboAdvertisingVideoConfig = {
  durationInFrames: DURATION_SECONDS * FPS,
  fps: FPS,
  width: 1920,
  height: 1080
};
