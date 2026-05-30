import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'The Locker Room | Raising The Bar Officiating',
    template: '%s | The Locker Room'
  },
  description:
    'Secure basketball game film viewing, downloading, captions, audit logging, and email notifications for Raising The Bar Officiating.',
  applicationName: 'The Locker Room',
  keywords: [
    'basketball officiating',
    'game film',
    'Raising The Bar Officiating',
    'officials training',
    'video player',
    'film exchange'
  ],
  authors: [{ name: 'Raising The Bar Officiating' }],
  openGraph: {
    title: 'The Locker Room',
    description: 'Secure basketball game film viewing and downloading for officials.',
    siteName: 'Raising The Bar Officiating',
    type: 'website',
    images: ['/brand/rtbo_logo_.webp']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Locker Room',
    description: 'Secure basketball game film viewing and downloading for officials.',
    images: ['/brand/rtbo_logo_.webp']
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg'
  },
  manifest: '/manifest.webmanifest'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#151515'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: 'Raising The Bar Officiating',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/brand/rtbo_logo_.webp`
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
