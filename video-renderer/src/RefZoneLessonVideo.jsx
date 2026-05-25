import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

function asset(path = '') {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return staticFile(value.replace(/^\//, ''));
}

function clip(value = '', max = 240) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}.`;
}

function segmentFrames(index, count, totalFrames) {
  const start = Math.floor((index / count) * totalFrames);
  const end = Math.floor(((index + 1) / count) * totalFrames);
  return [start, Math.max(1, end - start)];
}

function CourtMotion({ frame, index }) {
  const ballX = interpolate(frame, [0, 150, 300], [72, 398, 172], CLAMP);
  const ballY = 178 + Math.sin((frame + index * 19) / 17) * 58;
  const officialX = interpolate(frame, [0, 300], [408, 118], CLAMP);
  const laneGlow = 0.3 + Math.abs(Math.sin((frame + index * 9) / 20)) * 0.45;

  return (
    <div
      style={{
        position: 'absolute',
        right: 74,
        top: 148,
        width: 560,
        height: 376,
        border: '2px solid rgba(245,130,32,.54)',
        borderRadius: 22,
        background: 'rgba(5,7,10,.48)',
        boxShadow: '0 22px 54px rgba(0,0,0,.34), inset 0 0 44px rgba(245,130,32,.12)',
        overflow: 'hidden',
        transform: `translate3d(${Math.sin((frame + index * 11) / 40) * 14}px, ${Math.cos(frame / 44) * 8}px, 0)`
      }}
    >
      <div style={{ position: 'absolute', inset: 32, border: '2px solid rgba(255,255,255,.38)', borderRadius: 10 }} />
      <div style={{ position: 'absolute', left: 276, top: 32, bottom: 32, width: 2, background: 'rgba(255,255,255,.32)' }} />
      <div style={{ position: 'absolute', left: 230, top: 142, width: 100, height: 100, border: '2px solid rgba(255,255,255,.32)', borderRadius: 999 }} />
      <div style={{ position: 'absolute', left: 32, top: 112, width: 150, height: 154, border: `2px solid rgba(245,130,32,${laneGlow})`, borderLeft: 0 }} />
      <div style={{ position: 'absolute', right: 32, top: 112, width: 150, height: 154, border: `2px solid rgba(245,130,32,${laneGlow})`, borderRight: 0 }} />
      <div style={{ position: 'absolute', left: 140, top: 170, right: 140, height: 3, background: 'linear-gradient(90deg, transparent, rgba(245,130,32,.82), transparent)', transform: `rotate(${Math.sin(frame / 24) * 10}deg)` }} />
      <div style={{ position: 'absolute', left: ballX, top: ballY, width: 24, height: 24, borderRadius: 999, background: '#f58220', boxShadow: '0 0 20px rgba(245,130,32,.9)' }} />
      <div style={{ position: 'absolute', left: officialX, bottom: 64, width: 18, height: 44, borderRadius: 10, background: '#f8fafc', boxShadow: '0 0 0 6px rgba(248,250,252,.12)' }} />
      <div style={{ position: 'absolute', left: officialX - 11, bottom: 114, width: 40, height: 2, background: '#f8fafc', transform: `rotate(${Math.sin(frame / 18) * 22}deg)` }} />
      <span style={{ position: 'absolute', left: 30, bottom: 22, color: '#f58220', fontSize: 20, fontWeight: 950 }}>Live mechanics map</span>
    </div>
  );
}

function EvidenceStrip({ frame, scene, index }) {
  const labels = ['Read', 'Apply', 'Defend'];
  return (
    <div
      style={{
        position: 'absolute',
        left: 86,
        right: 86,
        bottom: 42,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16
      }}
    >
      {labels.map((label, labelIndex) => (
        <div
          key={label}
          style={{
            minHeight: 82,
            border: '1px solid rgba(245,130,32,.44)',
            borderRadius: 16,
            padding: '16px 18px',
            background: 'rgba(5,7,10,.72)',
            boxShadow: '0 12px 28px rgba(0,0,0,.24)',
            transform: `translateY(${Math.sin((frame + labelIndex * 16 + index * 7) / 24) * 5}px)`
          }}
        >
          <strong style={{ display: 'block', color: '#f58220', fontSize: 22, fontWeight: 950 }}>{label}</strong>
          <span style={{ display: 'block', marginTop: 5, color: '#e5edf7', fontSize: 19, fontWeight: 740, lineHeight: 1.25 }}>
            {labelIndex === 0 ? scene.kind || 'Lesson source' : labelIndex === 1 ? 'Game evidence' : 'Supervisor-ready answer'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RefZoneLessonVideo({
  trackTitle = 'RefZone University',
  lessonTitle = 'Course Lesson',
  voiceoverPath = '',
  poster = '',
  visuals = [],
  scenePlan = []
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scenes = scenePlan.length ? scenePlan : [{
    title: lessonTitle,
    kind: 'Lesson',
    text: 'RefZone University course lesson.',
    visual: poster || visuals[0]?.src
  }];
  const sceneCount = scenes.length;
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], CLAMP);

  return (
    <AbsoluteFill style={{ background: '#05070a', color: '#fff', fontFamily: 'Inter, Arial, sans-serif' }}>
      {voiceoverPath ? <Audio src={asset(voiceoverPath)} /> : null}
      {scenes.map((scene, index) => {
        const [start, duration] = segmentFrames(index, sceneCount, durationInFrames);
        const localFrame = Math.max(0, Math.min(duration, frame - start));
        const visual = asset(scene.visual || visuals[index % Math.max(1, visuals.length)]?.src || poster);
        const sceneProgress = interpolate(localFrame, [0, duration], [0, 100], CLAMP);
        const imageScale = interpolate(localFrame, [0, duration], [1.07, 1.2], CLAMP);
        const imageX = interpolate(localFrame, [0, duration], index % 2 ? [3.2, -3.2] : [-3.2, 3.2], CLAMP);
        const imageY = interpolate(localFrame, [0, duration], index % 2 ? [-2.1, 2.1] : [2.1, -2.1], CLAMP);
        const copyX = interpolate(localFrame, [0, 24], [-46, 0], CLAMP);
        const copyOpacity = interpolate(localFrame, [0, 20], [0, 1], CLAMP);
        const scan = (localFrame * 1.22 + index * 11) % 100;

        return (
          <Sequence key={`${scene.id || scene.title}-${index}`} from={start} durationInFrames={duration}>
            <AbsoluteFill style={{ overflow: 'hidden' }}>
              {visual ? (
                <Img
                  src={visual}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.62,
                    transform: `scale(${imageScale}) translate3d(${imageX}%, ${imageY}%, 0)`,
                    filter: 'saturate(1.16) contrast(1.08)'
                  }}
                />
              ) : null}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,7,10,.97), rgba(5,7,10,.72) 48%, rgba(5,7,10,.26))' }} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(102deg, transparent ${Math.max(0, scan - 12)}%, rgba(245,130,32,.2) ${scan}%, transparent ${Math.min(100, scan + 12)}%)`,
                  mixBlendMode: 'screen'
                }}
              />
              <CourtMotion frame={localFrame} index={index} />
              <div
                style={{
                  position: 'absolute',
                  left: 86,
                  top: 150,
                  width: 1040,
                  display: 'grid',
                  gap: 24,
                  opacity: copyOpacity,
                  transform: `translate3d(${copyX}px, 0, 0)`
                }}
              >
                <span style={{ color: '#f58220', fontSize: 28, fontWeight: 950, letterSpacing: 0, textTransform: 'uppercase' }}>{scene.kind || 'Lesson'}</span>
                <h1 style={{ margin: 0, color: '#fff', fontSize: 66, lineHeight: 1.04, fontWeight: 950, letterSpacing: 0 }}>{scene.title || lessonTitle}</h1>
                <p style={{ maxWidth: 980, margin: 0, color: '#e5edf7', fontSize: 31, lineHeight: 1.32, fontWeight: 650 }}>{clip(scene.text, 360)}</p>
                <div style={{ width: 420, height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.16)' }}>
                  <div style={{ width: `${sceneProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f58220, #fff)' }} />
                </div>
              </div>
              <EvidenceStrip frame={localFrame} scene={scene} index={index} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <div style={{ position: 'absolute', left: 48, right: 48, top: 34, display: 'flex', justifyContent: 'space-between', gap: 32, alignItems: 'center' }}>
        <strong style={{ color: '#f58220', fontSize: 30, fontWeight: 950, letterSpacing: 0 }}>{trackTitle}</strong>
        <span style={{ color: '#cbd5e1', fontSize: 24, fontWeight: 800 }}>{lessonTitle}</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, background: 'rgba(255,255,255,.16)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: '#f58220' }} />
      </div>
      <div style={{ position: 'absolute', right: 52, bottom: 34, color: '#f8fafc', fontSize: 22, fontWeight: 900 }}>RefZone University</div>
    </AbsoluteFill>
  );
}
