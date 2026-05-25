# RefZone University Video Production Workflow

## Production Stack

RefZone University course videos should be produced with [Remotion](https://www.remotion.dev/docs/renderer/render-media) for video rendering and [ElevenLabs Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) for voiceover.

- Remotion creates real MP4 videos from React, course data, and visual assets. It supports local/server rendering and programmatic generation.
- ElevenLabs Text to Speech converts lesson scripts into voiceover audio that can be attached to each rendered lesson.
- Synthesia remains a hosted alternative for avatar/template videos, but Remotion is the better fit for RefZone because the course visuals, screenshots, transcripts, and tests already live in the website data model.

## Data Flow

1. Edit or publish courses in the Super Admin Education command center.
2. Run `npm run refzone:video-jobs` from the project root.
3. The generator reads `frontend/public/refzone-course-materials.json`.
4. It writes `frontend/public/refzone-course-video-jobs.json`.
5. Each job maps one course lesson to:
   - MP4 output path: `/assets/videos/refzone/{course}/{lesson}.mp4`
   - captions path: `/assets/videos/refzone/{course}/{lesson}.vtt`
   - voiceover path: `/assets/audio/refzone/{course}/{lesson}.mp3`
   - visual aids and screenshots for render scenes

## Live Production Rule

The student course player always uses the same course data as the command center. When the rendered MP4 exists and the job is marked `published: true`, the player loads the published video file. When the MP4 has not been rendered yet, the player still functions by playing a generated lesson video with the same visual aids, transcript captions, and browser voiceover. Reading materials come directly from the command-center course data into the Files drawer. This prevents empty placeholders while the production render pipeline is being completed.

## Renderer Implementation Notes

The next production rendering step is to install Remotion into a dedicated renderer package or service, then render each job from `refzone-course-video-jobs.json`.

Recommended environment variables:

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
REFZONE_VIDEO_OUTPUT_DIR=frontend/public/assets/videos/refzone
REFZONE_AUDIO_OUTPUT_DIR=frontend/public/assets/audio/refzone
```

For production hosting, generated MP4, VTT, and MP3 assets should be written to the website public asset paths or a CDN path that the manifest can reference.
