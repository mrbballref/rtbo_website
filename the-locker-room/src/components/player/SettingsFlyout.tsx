import { LANGUAGE_OPTIONS } from '@/lib/constants/languages';
import { PLAYBACK_SPEED_OPTIONS, VIDEO_QUALITY_OPTIONS } from '@/lib/constants/quality';
import { Icon } from '@/components/player/Icon';
import { ToggleSwitch } from '@/components/player/ToggleSwitch';

export function SettingsFlyout({
  open,
  speed,
  onSpeedChange,
  language,
  onLanguageChange,
  captionsOn,
  onCaptionsChange,
  quality,
  onQualityChange,
  availableQualities,
  theater,
  onTheater,
  onFullscreen,
  onPictureInPicture,
  onClose
}: {
  open: boolean;
  speed: number;
  onSpeedChange: (value: number) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  captionsOn: boolean;
  onCaptionsChange: (value: boolean) => void;
  quality: string;
  onQualityChange: (value: string) => void;
  availableQualities: Set<string>;
  theater: boolean;
  onTheater: () => void;
  onFullscreen: () => void;
  onPictureInPicture: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const choose = <T,>(handler: (value: T) => void, value: T) => {
    handler(value);
    onClose();
  };

  return (
    <aside className="settings-flyout" aria-label="Video player settings">
      <div className="settings-header">
        <div>
          <p>Locker Room Controls</p>
          <strong>Playback Settings</strong>
        </div>
        <button type="button" className="settings-close" aria-label="Close settings" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <label className="settings-field">
        <span>Playback speed</span>
        <select value={speed} onChange={(event) => choose(onSpeedChange, Number(event.target.value))}>
          {PLAYBACK_SPEED_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-field">
        <span>Language</span>
        <select value={language} onChange={(event) => choose(onLanguageChange, event.target.value)}>
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <ToggleSwitch
        label="Subtitles / closed captions"
        checked={captionsOn}
        onChange={(value) => choose(onCaptionsChange, value)}
      />

      <label className="settings-field">
        <span>Subtitle language</span>
        <select value={language} onChange={(event) => choose(onLanguageChange, event.target.value)}>
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-field">
        <span>Quality</span>
        <select value={quality} onChange={(event) => choose(onQualityChange, event.target.value)}>
          {VIDEO_QUALITY_OPTIONS.map((option) => (
            <option key={option} value={option} disabled={option !== 'Auto' && !availableQualities.has(option)}>
              {option === 'Auto' || availableQualities.has(option) ? option : `${option} - not uploaded`}
            </option>
          ))}
        </select>
      </label>

      <div className="settings-actions">
        <button type="button" onClick={() => { onTheater(); onClose(); }} className={theater ? 'active' : ''}>
          <Icon name="theater" />
          Theater screen
        </button>
        <button type="button" onClick={() => { onFullscreen(); onClose(); }}>
          <Icon name="fullscreen" />
          Full screen
        </button>
        <button type="button" onClick={() => { onPictureInPicture(); onClose(); }}>
          <Icon name="pip" />
          Picture-in-picture
        </button>
      </div>
    </aside>
  );
}
