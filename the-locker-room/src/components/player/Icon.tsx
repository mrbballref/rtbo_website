import type { SVGProps } from 'react';

export type IconName =
  | 'play'
  | 'pause'
  | 'stop'
  | 'rewind'
  | 'fast-forward'
  | 'next'
  | 'previous'
  | 'volume'
  | 'record'
  | 'settings'
  | 'download'
  | 'upload'
  | 'fullscreen'
  | 'theater'
  | 'pip'
  | 'captions'
  | 'close';

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const common = {
    fill: 'currentColor',
    stroke: 'currentColor',
    strokeWidth: 0,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {name === 'play' && <path {...common} d="M8 5v14l11-7z" />}
      {name === 'pause' && <path {...common} d="M7 5h4v14H7zm6 0h4v14h-4z" />}
      {name === 'stop' && <path {...common} d="M7 7h10v10H7z" />}
      {name === 'rewind' && <path {...common} d="M11 6v12l-8-6zm10 0v12l-8-6z" />}
      {name === 'fast-forward' && <path {...common} d="M3 6v12l8-6zm10 0v12l8-6z" />}
      {name === 'previous' && <path {...common} d="M6 6h3v12H6zm4 6 8 6V6z" />}
      {name === 'next' && <path {...common} d="M15 6h3v12h-3zm-1 6-8 6V6z" />}
      {name === 'volume' && <path {...common} d="M4 9v6h4l5 4V5L8 9zm12.5-2.5a7.5 7.5 0 0 1 0 11l1.6 1.6a9.8 9.8 0 0 0 0-14.2zm-2.4 2.4a4 4 0 0 1 0 6.2l1.5 1.5a6.2 6.2 0 0 0 0-9.2z" />}
      {name === 'record' && <circle {...common} cx="12" cy="12" r="7" />}
      {name === 'settings' && (
        <path {...common} d="m19.4 13.5.1-1.5-.1-1.5 2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A8 8 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5-.1 1.5.1 1.5-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5L10 21.5h4l.4-2.6A8 8 0 0 0 17 17.4l2.4 1 2-3.4zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
      )}
      {name === 'download' && <path {...common} d="M11 4h2v8l3-3 1.4 1.4L12 15.8l-5.4-5.4L8 9l3 3zM5 18h14v2H5z" />}
      {name === 'upload' && <path {...common} d="M11 20h2v-8l3 3 1.4-1.4L12 8.2l-5.4 5.4L8 15l3-3zM5 4h14v2H5z" />}
      {name === 'fullscreen' && <path {...common} d="M4 4h7v2H7.4l4.1 4.1-1.4 1.4L6 7.4V11H4zm9 0h7v7h-2V7.4l-4.1 4.1-1.4-1.4L16.6 6H13zM4 13h2v3.6l4.1-4.1 1.4 1.4L7.4 18H11v2H4zm14 3.6V13h2v7h-7v-2h3.6l-4.1-4.1 1.4-1.4z" />}
      {name === 'theater' && <path {...common} d="M3 5h18v11H3zm2 2v7h14V7zm1 11h12v2H6z" />}
      {name === 'pip' && <path {...common} d="M3 5h18v14H3zm2 2v10h14V7zm7 5h6v4h-6z" />}
      {name === 'captions' && <path {...common} d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm4.2 5.5a2.8 2.8 0 0 1 2.2-1.1c1 0 1.8.4 2.4 1.1L11.4 12a1.3 1.3 0 0 0-1-.5 1.5 1.5 0 0 0 0 3 1.4 1.4 0 0 0 1.1-.5l1.4 1.4a3.2 3.2 0 1 1-4.7-4.9zm7 0a2.8 2.8 0 0 1 2.2-1.1c1 0 1.8.4 2.4 1.1L18.4 12a1.3 1.3 0 0 0-1-.5 1.5 1.5 0 0 0 0 3 1.4 1.4 0 0 0 1.1-.5l1.4 1.4a3.2 3.2 0 1 1-4.7-4.9z" />}
      {name === 'close' && <path {...common} d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4zm12.6 1.4L6.4 19 5 17.6 17.6 5z" />}
    </svg>
  );
}
