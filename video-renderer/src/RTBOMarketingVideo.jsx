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

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const BRAND_ORANGE = '#f58220';
const BURNISHED_ORANGE = '#ff5a1f';
const COOL_ACCENT = '#22d3ee';
const PAPER = '#f8fafc';
const INK = '#05070a';
const FPS = 30;

const scenes = [
  {
    id: 'open',
    from: 0,
    duration: 150,
    image: 'rtbo_web_banner_2.jpg',
    eyebrow: 'We will serve and will be of service to the game',
    title: 'Raising The Bar Officiating Inc.',
    body: 'Professional basketball officiating, training, assigning, and leadership development.',
    accent: 'Service | Integrity | Precision'
  },
  {
    id: 'training',
    from: 150,
    duration: 180,
    image: 'training_img_1.jpg',
    eyebrow: 'Elite Training',
    title: 'Train with purpose.',
    body: 'Schools, camps, RefZone University, rules study, mechanics, film lab habits, and real-court mentorship.',
    accent: 'Officials leave sharper, steadier, and ready for the next assignment.',
    stats: ['Rules', 'Mechanics', 'Film', 'Mentorship']
  },
  {
    id: 'assigning',
    from: 330,
    duration: 180,
    image: 'assigning-workflow-crew.jpg',
    eyebrow: 'Assigning + Operations',
    title: 'Build crews that run clean.',
    body: 'RTBO supports schools, leagues, tournaments, and organizations with dependable crews, clear communication, availability, confirmations, and game-day accountability.',
    accent: 'Schedules. Crews. Alerts. Reports.',
    stats: ['Assigning', 'Communication', 'Check-ins', 'Reports']
  },
  {
    id: 'development',
    from: 510,
    duration: 210,
    image: 'three-person-crew.jpg',
    eyebrow: 'Evaluation + Growth',
    title: 'Develop every official.',
    body: 'Observation, feedback, film review, testing, certification, and promotion-ready standards help officials grow with confidence.',
    accent: 'Accountability creates consistency.',
    stats: ['Observe', 'Evaluate', 'Coach', 'Advance']
  },
  {
    id: 'close',
    from: 720,
    duration: 180,
    image: 'banner_3.jpg',
    eyebrow: 'Raise the standard',
    title: 'Ready for better officiating support?',
    body: 'Partner with RTBO for training, assignments, events, technology, and a culture built around service to the game.',
    accent: 'rtbofficiating.com',
    stats: ['Schools', 'Leagues', 'Tournaments', 'Officials']
  }
];

function image(name) {
  return staticFile(`assets/images/${name}`);
}

function audio(name) {
  return staticFile(`assets/audio/${name}`);
}

function enter(localFrame, duration, delay = 0) {
  const inValue = interpolate(localFrame, [delay, delay + 28], [0, 1], {
    ...CLAMP,
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  });
  const outValue = interpolate(localFrame, [duration - 24, duration], [1, 0], {
    ...CLAMP,
    easing: Easing.in(Easing.cubic)
  });
  return inValue * outValue;
}

function BrandTexture({ frame }) {
  const sweep = (frame * 0.26) % 100;
  const slowSweep = (frame * 0.12 + 38) % 100;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: INK }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 18% 20%, rgba(245,130,32,.28), transparent 24%), radial-gradient(circle at 84% 72%, rgba(34,211,238,.13), transparent 28%), linear-gradient(135deg, #020305, #0d1117 52%, #15191f)',
          opacity: 0.95
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          transform: `translate3d(${-frame * 0.16}px, ${frame * 0.1}px, 0)`,
          opacity: 0.42
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(104deg, transparent ${Math.max(0, sweep - 10)}%, rgba(245,130,32,.2) ${sweep}%, transparent ${Math.min(100, sweep + 10)}%)`,
          mixBlendMode: 'screen',
          opacity: 0.66
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(76deg, transparent ${Math.max(0, slowSweep - 8)}%, rgba(34,211,238,.12) ${slowSweep}%, transparent ${Math.min(100, slowSweep + 8)}%)`,
          mixBlendMode: 'screen',
          opacity: 0.42
        }}
      />
    </AbsoluteFill>
  );
}

function CourtLines({ frame }) {
  const pulse = 0.45 + Math.sin(frame / 24) * 0.18;
  const lineColor = `rgba(255,255,255,${0.16 + pulse * 0.12})`;
  const orange = `rgba(245,130,32,${0.28 + pulse * 0.22})`;

  return (
    <div
      style={{
        position: 'absolute',
        right: -90,
        bottom: -70,
        width: 1040,
        height: 640,
        transform: `rotate(-8deg) translate3d(${Math.sin(frame / 42) * 16}px, ${Math.cos(frame / 38) * 10}px, 0)`,
        opacity: 0.78
      }}
    >
      <div style={{ position: 'absolute', inset: 24, border: `3px solid ${lineColor}`, borderRadius: 30 }} />
      <div style={{ position: 'absolute', top: 24, bottom: 24, left: '50%', width: 3, background: lineColor }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 192, height: 192, marginLeft: -96, marginTop: -96, border: `3px solid ${lineColor}`, borderRadius: 999 }} />
      <div style={{ position: 'absolute', left: 24, top: 190, width: 260, height: 260, border: `3px solid ${orange}`, borderLeft: 0, borderRadius: '0 170px 170px 0' }} />
      <div style={{ position: 'absolute', right: 24, top: 190, width: 260, height: 260, border: `3px solid ${orange}`, borderRight: 0, borderRadius: '170px 0 0 170px' }} />
      <div style={{ position: 'absolute', left: 172, top: 250, width: 18, height: 18, borderRadius: 999, background: BRAND_ORANGE, boxShadow: '0 0 34px rgba(245,130,32,.9)' }} />
      <div style={{ position: 'absolute', right: 172, top: 380, width: 18, height: 18, borderRadius: 999, background: COOL_ACCENT, boxShadow: '0 0 34px rgba(34,211,238,.62)' }} />
    </div>
  );
}

function BackgroundPhoto({ name, localFrame, duration, align = 'center' }) {
  const progress = interpolate(localFrame, [0, duration], [0, 1], CLAMP);
  const scale = interpolate(progress, [0, 1], [1.08, 1.18]);
  const x = interpolate(progress, [0, 1], [-2.8, 2.2]);

  return (
    <>
      <Img
        src={image(name)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: align,
          opacity: 0.62,
          filter: 'saturate(1.08) contrast(1.12) brightness(.78)',
          transform: `scale(${scale}) translate3d(${x}%, 0, 0)`
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(4,6,10,.98), rgba(4,6,10,.78) 46%, rgba(4,6,10,.28))' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.66))' }} />
    </>
  );
}

function LogoBug() {
  return (
    <div
      style={{
        position: 'absolute',
        left: 54,
        top: 42,
        height: 74,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '10px 20px 10px 12px',
        border: '1px solid rgba(255,255,255,.18)',
        background: 'rgba(5,7,10,.66)',
        boxShadow: '0 18px 42px rgba(0,0,0,.26)',
        borderRadius: 16
      }}
    >
      <Img src={image('logo.png')} style={{ width: 54, height: 54, objectFit: 'contain' }} />
      <div style={{ display: 'grid', gap: 2 }}>
        <strong style={{ color: PAPER, fontSize: 20, fontWeight: 950, lineHeight: 1 }}>RTBO</strong>
        <span style={{ color: '#cbd5e1', fontSize: 15, fontWeight: 800, lineHeight: 1 }}>Raising The Bar Officiating</span>
      </div>
    </div>
  );
}

function PhotoStack({ frame }) {
  const photos = [
    ['carousel_img_1.jpg', 'Camp reps'],
    ['carousel_img_3.jpg', 'Live mentorship'],
    ['u-got-nex-ref-platform.jpg', 'Digital tools']
  ];

  return (
    <div style={{ position: 'absolute', right: 92, top: 170, width: 510, height: 590 }}>
      {photos.map(([photo, label], index) => {
        const start = index * 56 + 4;
        const end = index === photos.length - 1 ? 178 : start + 66;
        const opacity = interpolate(frame, [start, start + 14, end - 14, end], [0, 1, 1, 0], CLAMP);
        const scale = interpolate(opacity, [0, 1], [0.94, 1], CLAMP);
        const lift = interpolate(opacity, [0, 1], [36, 0], CLAMP) + Math.sin((frame + index * 18) / 28) * 5;
        return (
          <div
            key={photo}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24,
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,.2)',
              boxShadow: '0 26px 58px rgba(0,0,0,.46)',
              opacity,
              transform: `translate3d(0, ${lift}px, 0) scale(${scale})`
            }}
          >
            <Img src={image(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(5,7,10,.58))' }} />
            <div
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                bottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 18,
                padding: '18px 20px',
                borderRadius: 18,
                background: 'rgba(5,7,10,.72)',
                border: '1px solid rgba(245,130,32,.34)'
              }}
            >
              <strong style={{ color: PAPER, fontSize: 28, fontWeight: 950 }}>{label}</strong>
              <span style={{ color: BRAND_ORANGE, fontSize: 18, fontWeight: 950 }}>{index + 1}/3</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ frame }) {
  const { durationInFrames } = useVideoConfig();
  const width = interpolate(frame, [0, durationInFrames], [0, 100], CLAMP);

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, background: 'rgba(255,255,255,.14)' }}>
      <div style={{ width: `${width}%`, height: '100%', background: `linear-gradient(90deg, ${BRAND_ORANGE}, ${COOL_ACCENT}, ${PAPER})` }} />
    </div>
  );
}

function MarketingAudio() {
  return (
    <>
      <Audio
        src={audio('rtbo-marketing-bed.wav')}
        volume={(audioFrame) => {
          const fadeIn = interpolate(audioFrame, [0, 44], [0, 0.38], CLAMP);
          const fadeOut = interpolate(audioFrame, [830, 900], [1, 0], CLAMP);
          const duck = audioFrame >= 24 && audioFrame <= 860 ? 0.58 : 1;
          return fadeIn * fadeOut * duck;
        }}
      />
      <Sequence from={30}>
        <Audio
          src={audio('rtbo-marketing-narration.mp3')}
          volume={(audioFrame) => {
            const fadeIn = interpolate(audioFrame, [0, 12], [0, 0.95], CLAMP);
            const fadeOut = interpolate(audioFrame, [790, 820], [1, 0], CLAMP);
            return fadeIn * fadeOut;
          }}
        />
      </Sequence>
    </>
  );
}

function ServiceRail({ localFrame, duration, labels }) {
  const progress = interpolate(localFrame, [14, duration - 20], [0, labels.length], CLAMP);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${labels.length}, 1fr)`,
        gap: 12,
        width: 820,
        marginTop: 18
      }}
    >
      {labels.map((label, index) => {
        const active = progress >= index + 0.18;
        return (
          <div
            key={label}
            style={{
              minHeight: 70,
              padding: '14px 12px',
              borderRadius: 14,
              border: `1px solid ${active ? 'rgba(245,130,32,.9)' : 'rgba(255,255,255,.16)'}`,
              background: active ? 'rgba(245,130,32,.16)' : 'rgba(255,255,255,.07)',
              boxShadow: active ? '0 0 28px rgba(245,130,32,.16)' : 'none',
              color: active ? PAPER : '#94a3b8',
              fontSize: 18,
              fontWeight: 900,
              textAlign: 'center',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function CopyBlock({ scene, localFrame, duration, compact = false }) {
  const show = enter(localFrame, duration, 8);
  const slide = interpolate(show, [0, 1], [54, 0], CLAMP);

  return (
    <div
      style={{
        position: 'absolute',
        left: 86,
        top: compact ? 188 : 202,
        width: compact ? 1020 : 960,
        transform: `translate3d(${slide}px, 0, 0)`,
        opacity: show
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 14px',
          borderRadius: 999,
          border: '1px solid rgba(245,130,32,.52)',
          background: 'rgba(5,7,10,.58)',
          color: BRAND_ORANGE,
          fontSize: 22,
          fontWeight: 950,
          textTransform: 'uppercase'
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 999, background: COOL_ACCENT, boxShadow: '0 0 22px rgba(34,211,238,.7)' }} />
        {scene.eyebrow}
      </div>
      <h1
        style={{
          margin: '28px 0 0',
          color: PAPER,
          fontSize: compact ? 78 : 92,
          lineHeight: 0.98,
          fontWeight: 950,
          letterSpacing: 0,
          maxWidth: compact ? 1000 : 900,
          textShadow: '0 20px 54px rgba(0,0,0,.42)'
        }}
      >
        {scene.title}
      </h1>
      <p
        style={{
          margin: '30px 0 0',
          color: '#dbeafe',
          fontSize: compact ? 32 : 35,
          lineHeight: 1.23,
          fontWeight: 720,
          maxWidth: compact ? 950 : 870
        }}
      >
        {scene.body}
      </p>
      <div
        style={{
          marginTop: 34,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 15,
          padding: '15px 20px',
          borderLeft: `7px solid ${BRAND_ORANGE}`,
          background: 'rgba(255,255,255,.1)',
          color: PAPER,
          fontSize: 27,
          lineHeight: 1.16,
          fontWeight: 950,
          boxShadow: '0 18px 46px rgba(0,0,0,.22)'
        }}
      >
        {scene.accent}
      </div>
      {scene.stats ? <ServiceRail localFrame={localFrame} duration={duration} labels={scene.stats} /> : null}
    </div>
  );
}

function LowerThird({ scene, localFrame, duration }) {
  const show = enter(localFrame, duration, 18);

  return (
    <div
      style={{
        position: 'absolute',
        left: 86,
        right: 86,
        bottom: 56,
        minHeight: 116,
        borderTop: '1px solid rgba(255,255,255,.18)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 18,
        opacity: show,
        transform: `translate3d(0, ${interpolate(show, [0, 1], [34, 0], CLAMP)}px, 0)`
      }}
    >
      {[
        ['For Officials', 'Training, mentorship, film, and promotion-ready habits.'],
        ['For Clients', 'Reliable crews, transparent communication, and event confidence.'],
        ['For The Game', 'Professional standards that protect every possession.']
      ].map(([title, body]) => (
        <article
          key={title}
          style={{
            padding: '22px 24px',
            background: 'rgba(5,7,10,.62)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 18
          }}
        >
          <strong style={{ color: scene.id === 'close' ? COOL_ACCENT : BRAND_ORANGE, fontSize: 23, fontWeight: 950 }}>{title}</strong>
          <p style={{ margin: '8px 0 0', color: '#dbeafe', fontSize: 20, lineHeight: 1.28, fontWeight: 720 }}>{body}</p>
        </article>
      ))}
    </div>
  );
}

function IntroScene({ scene, localFrame }) {
  const logoShow = enter(localFrame, scene.duration, 6);
  const logoScale = interpolate(logoShow, [0, 1], [0.74, 1], CLAMP);

  return (
    <AbsoluteFill>
      <BackgroundPhoto name={scene.image} localFrame={localFrame} duration={scene.duration} />
      <CourtLines frame={localFrame} />
      <div
        style={{
          position: 'absolute',
          right: 114,
          top: 150,
          width: 500,
          height: 500,
          opacity: logoShow,
          transform: `scale(${logoScale}) rotate(${Math.sin(localFrame / 36) * 1.5}deg)`,
          filter: 'drop-shadow(0 30px 70px rgba(0,0,0,.58))'
        }}
      >
        <Img src={image('logo.png')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <CopyBlock scene={scene} localFrame={localFrame} duration={scene.duration} />
      <div
        style={{
          position: 'absolute',
          left: 86,
          bottom: 82,
          width: 870,
          height: 10,
          borderRadius: 999,
          background: 'rgba(255,255,255,.16)',
          overflow: 'hidden',
          opacity: logoShow
        }}
      >
        <div
          style={{
            width: `${interpolate(localFrame, [16, scene.duration - 18], [0, 100], CLAMP)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${BRAND_ORANGE}, ${COOL_ACCENT}, ${PAPER})`
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function ServiceScene({ scene, localFrame }) {
  return (
    <AbsoluteFill>
      <BackgroundPhoto name={scene.image} localFrame={localFrame} duration={scene.duration} />
      <CourtLines frame={localFrame + scene.from} />
      <LogoBug />
      <CopyBlock scene={scene} localFrame={localFrame} duration={scene.duration} compact={scene.id === 'assigning'} />
      {scene.id === 'training' ? <PhotoStack frame={localFrame} /> : null}
      {scene.id === 'development' ? (
        <div
          style={{
            position: 'absolute',
            right: 104,
            top: 202,
            width: 520,
            minHeight: 420,
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,.18)',
            background: 'rgba(5,7,10,.68)',
            boxShadow: '0 28px 72px rgba(0,0,0,.4)',
            padding: 34
          }}
        >
          {['Observe the work', 'Coach the details', 'Measure the growth', 'Raise the opportunity'].map((step, index) => {
            const active = localFrame > 26 + index * 32;
            return (
              <div key={step} style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 26, opacity: active ? 1 : 0.38 }}>
                <span
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: active ? BRAND_ORANGE : 'rgba(255,255,255,.12)',
                    color: active ? INK : PAPER,
                    fontSize: 24,
                    fontWeight: 950
                  }}
                >
                  {index + 1}
                </span>
                <strong style={{ color: PAPER, fontSize: 30, fontWeight: 950 }}>{step}</strong>
              </div>
            );
          })}
        </div>
      ) : null}
      <LowerThird scene={scene} localFrame={localFrame} duration={scene.duration} />
    </AbsoluteFill>
  );
}

function CloseScene({ scene, localFrame }) {
  const show = enter(localFrame, scene.duration, 4);
  const logoScale = interpolate(show, [0, 1], [0.86, 1], CLAMP);

  return (
    <AbsoluteFill>
      <BackgroundPhoto name={scene.image} localFrame={localFrame} duration={scene.duration} align="center 42%" />
      <CourtLines frame={localFrame + 720} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(245,130,32,.18), rgba(0,0,0,.4) 48%, rgba(0,0,0,.78))' }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 92,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          opacity: show,
          transform: `translate3d(0, ${interpolate(show, [0, 1], [34, 0], CLAMP)}px, 0)`
        }}
      >
        <Img
          src={image('logo.png')}
          style={{
            width: 280,
            height: 280,
            objectFit: 'contain',
            marginBottom: 18,
            transform: `scale(${logoScale})`,
            filter: 'drop-shadow(0 24px 48px rgba(0,0,0,.58))'
          }}
        />
        <span style={{ color: BRAND_ORANGE, fontSize: 27, fontWeight: 950, textTransform: 'uppercase' }}>{scene.eyebrow}</span>
        <h1 style={{ margin: '18px 0 0', maxWidth: 1100, color: PAPER, fontSize: 82, lineHeight: 1, fontWeight: 950, letterSpacing: 0 }}>
          {scene.title}
        </h1>
        <p style={{ margin: '26px auto 0', maxWidth: 1120, color: '#e2e8f0', fontSize: 32, lineHeight: 1.24, fontWeight: 760 }}>
          {scene.body}
        </p>
        <div
          style={{
            marginTop: 34,
            padding: '18px 30px',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${BRAND_ORANGE}, ${BURNISHED_ORANGE})`,
            color: INK,
            fontSize: 34,
            fontWeight: 950,
            boxShadow: '0 22px 54px rgba(245,130,32,.28)'
          }}
        >
          {scene.accent}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 204,
          right: 204,
          bottom: 72,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          opacity: show
        }}
      >
        {scene.stats.map((item, index) => (
          <div
            key={item}
            style={{
              minHeight: 72,
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(255,255,255,.18)',
              background: index % 2 ? 'rgba(34,211,238,.12)' : 'rgba(245,130,32,.14)',
              color: PAPER,
              borderRadius: 16,
              fontSize: 23,
              fontWeight: 950
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function RTBOMarketingVideo() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: INK, color: PAPER, fontFamily: 'Inter, Arial, Helvetica, sans-serif' }}>
      <MarketingAudio />
      <BrandTexture frame={frame} />
      {scenes.map((scene) => {
        const localFrame = frame - scene.from;
        return (
          <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration}>
            {scene.id === 'open' ? (
              <IntroScene scene={scene} localFrame={localFrame} />
            ) : scene.id === 'close' ? (
              <CloseScene scene={scene} localFrame={localFrame} />
            ) : (
              <ServiceScene scene={scene} localFrame={localFrame} />
            )}
          </Sequence>
        );
      })}
      <ProgressBar frame={frame} />
      <div
        style={{
          position: 'absolute',
          right: 52,
          top: 44,
          color: '#cbd5e1',
          fontSize: 18,
          fontWeight: 900,
          textTransform: 'uppercase',
          opacity: 0.78
        }}
      >
        30 second brand film
      </div>
    </AbsoluteFill>
  );
}

export const rtboMarketingVideoConfig = {
  durationInFrames: 30 * FPS,
  fps: FPS,
  width: 1920,
  height: 1080
};
