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
  const activeIndex = Math.min(sceneCount - 1, Math.floor((frame / Math.max(1, durationInFrames)) * sceneCount));
  const activeScene = scenes[activeIndex] || scenes[0];
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#05070a', color: '#fff', fontFamily: 'Inter, Arial, sans-serif' }}>
      {voiceoverPath ? <Audio src={asset(voiceoverPath)} /> : null}
      {scenes.map((scene, index) => {
        const [start, duration] = segmentFrames(index, sceneCount, durationInFrames);
        const visual = asset(scene.visual || visuals[index % Math.max(1, visuals.length)]?.src || poster);
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
                    opacity: 0.58,
                    transform: `scale(${1.06 + index * 0.004}) translate3d(${index % 2 === 0 ? '-1.5%' : '1.5%'}, ${index % 2 === 0 ? '1%' : '-1%'}, 0)`,
                    filter: 'saturate(1.12) contrast(1.05)'
                  }}
                />
              ) : null}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(5,7,10,.95), rgba(5,7,10,.62) 52%, rgba(5,7,10,.24))' }} />
              <div style={{ position: 'absolute', left: 86, right: 86, bottom: 92, display: 'grid', gap: 22 }}>
                <span style={{ color: '#f58220', fontSize: 28, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase' }}>{scene.kind || 'Lesson'}</span>
                <h1 style={{ maxWidth: 1120, margin: 0, fontSize: 68, lineHeight: 1.04, fontWeight: 950 }}>{scene.title || lessonTitle}</h1>
                <p style={{ maxWidth: 1120, margin: 0, color: '#e5edf7', fontSize: 32, lineHeight: 1.32, fontWeight: 650 }}>{clip(scene.text, 360)}</p>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <div style={{ position: 'absolute', left: 48, right: 48, top: 34, display: 'flex', justifyContent: 'space-between', gap: 32, alignItems: 'center' }}>
        <strong style={{ color: '#f58220', fontSize: 30, fontWeight: 950 }}>{trackTitle}</strong>
        <span style={{ color: '#cbd5e1', fontSize: 24, fontWeight: 800 }}>{lessonTitle}</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, background: 'rgba(255,255,255,.16)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: '#f58220' }} />
      </div>
      <div style={{ position: 'absolute', right: 52, bottom: 34, color: '#f8fafc', fontSize: 22, fontWeight: 900 }}>RefZone University</div>
    </AbsoluteFill>
  );
}
