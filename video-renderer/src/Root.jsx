import React from 'react';
import { Composition } from 'remotion';
import { RefZoneLessonVideo } from './RefZoneLessonVideo.jsx';

const FPS = 30;

export function RemotionRoot() {
  return (
    <Composition
      id="RefZoneLessonVideo"
      component={RefZoneLessonVideo}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{}}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.ceil((props.durationSeconds || props.estimatedDurationSeconds || 240) * FPS)
      })}
    />
  );
}
