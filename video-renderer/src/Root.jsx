import React from 'react';
import { Composition } from 'remotion';
import { RefZoneLessonVideo } from './RefZoneLessonVideo.jsx';
import { RTBOAdvertisingVideo, rtboAdvertisingVideoConfig } from './RTBOAdvertisingVideo.jsx';
import { RTBOMarketingVideo, rtboMarketingVideoConfig } from './RTBOMarketingVideo.jsx';

const FPS = 30;

export function RemotionRoot() {
  return (
    <>
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
      <Composition
        id="RTBOMarketingVideo"
        component={RTBOMarketingVideo}
        fps={rtboMarketingVideoConfig.fps}
        width={rtboMarketingVideoConfig.width}
        height={rtboMarketingVideoConfig.height}
        durationInFrames={rtboMarketingVideoConfig.durationInFrames}
        defaultProps={{}}
      />
      <Composition
        id="RTBOAdvertisingVideo"
        component={RTBOAdvertisingVideo}
        fps={rtboAdvertisingVideoConfig.fps}
        width={rtboAdvertisingVideoConfig.width}
        height={rtboAdvertisingVideoConfig.height}
        durationInFrames={rtboAdvertisingVideoConfig.durationInFrames}
        defaultProps={{}}
      />
    </>
  );
}
