import { Metadata } from 'next';

// Base metadata configuration
export const baseMetadata: Metadata = {
  metadataBase: new URL('https://goherethere.com'),
  title: {
    template: '%s | HereThere',
    default: 'HereThere - Smart Travel Planning Made Simple',
  },
  description:
    'Plan your perfect trip with HereThere. Use smart travel planning tools that help you avoid crowds and discover the best times to visit popular destinations.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://goherethere.com',
    siteName: 'HereThere',
    images: [
      {
        url: '/images/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'HereThere - Smart Travel Planning',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};
