import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Locker Room - Raising The Bar Officiating',
    short_name: 'Locker Room',
    description: 'Secure basketball game film player and download exchange.',
    start_url: '/',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#b8331c',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      },
      {
        src: '/brand/rtbo_logo_.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any'
      }
    ]
  };
}
