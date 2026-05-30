import { Icon, type IconName } from '@/components/player/Icon';

export function ControlButton({
  icon,
  label,
  active,
  tone,
  onClick,
  disabled
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  tone?: 'green' | 'scarlet' | 'gold' | 'neutral';
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClass = active ? `is-active is-${tone ?? 'neutral'}` : '';
  return (
    <button
      type="button"
      className={`chrome-button ${toneClass}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="button-glow" />
      <Icon name={icon} className="control-icon" />
    </button>
  );
}
