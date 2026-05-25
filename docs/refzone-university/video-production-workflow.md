# RefZone University Video Production Workflow

## Production Stack

RefZone University course videos are produced with [Remotion](https://www.remotion.dev/docs/renderer/render-media) for video rendering and [ElevenLabs Text to Speech with timing](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps) for human-style voiceover and captions.

- Remotion creates real MP4 videos from React, course data, and visual assets. It supports local/server rendering and programmatic generation.
- ElevenLabs converts lesson scripts into voiceover audio and returns character-level timing data used to create `.vtt` closed captions.
- Remotion is the production fit for RefZone because the course visuals, screenshots, transcripts, and tests already live in the website data model.

## Data Flow

1. Edit or publish courses in the Super Admin Education command center.
2. Run `npm run refzone:video-jobs` from the project root.
3. The generator reads `frontend/public/refzone-course-materials.json`.
4. It writes `frontend/public/refzone-course-video-jobs.json`.
5. Each job maps one course lesson to:
   - MP4 output path: `/assets/videos/refzone/{course}/{lesson}.mp4`
   - captions path: `/assets/videos/refzone/{course}/{lesson}.vtt`
   - voiceover path: `/assets/audio/refzone/{course}/{lesson}.mp3`
   - transcript metadata path: `/assets/videos/refzone/{course}/{lesson}.json`
   - downloadable reading packet links served by `refzone-course-file.php`
   - visual aids and screenshots for render scenes
6. Run `ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... npm run refzone:render-videos -- --course=nfhs --limit=1` to produce MP3, VTT, transcript JSON, and MP4 files.
7. Use `--all` to render all jobs or `--course={courseId}` / `--day={dayId}` to render a controlled production batch.
8. Use `npm run refzone:render-videos -- --course=nfhs --limit=1 --dry-run` to inspect the selected render jobs without calling ElevenLabs or rendering video.

## Live Production Rule

The student course player always uses the same course data as the command center. When the rendered MP4 exists and the job is marked `published: true`, the player loads the published video file. When the MP4 has not been rendered yet but the ElevenLabs MP3 exists, the player uses that real voiceover with synchronized course visuals and captions. Browser speech synthesis is not used for production narration.

## Renderer Implementation Notes

The renderer lives in `video-renderer/`. It reads `frontend/public/refzone-course-video-jobs.json`, requests ElevenLabs voiceover with timing, writes captions, renders a Remotion MP4 with matching visual scenes, and regenerates the manifest so the course player can detect published assets.

Recommended environment variables:

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
REFZONE_VIDEO_OUTPUT_DIR=frontend/public/assets/videos/refzone
REFZONE_AUDIO_OUTPUT_DIR=frontend/public/assets/audio/refzone
```

For production hosting, generated MP4, VTT, and MP3 assets should be written to the website public asset paths or a CDN path that the manifest can reference.
