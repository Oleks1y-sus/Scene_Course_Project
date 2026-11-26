import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@splidejs/splide/dist/css/splide-core.min.css';
import './globals.css';
import './app.css';
import { AuthProvider } from '@/components/AuthProvider';
import DemoModal from '@/components/DemoModal';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Сцена — платформа інтерактивних онлайн-заходів',
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Команда «Сцена»' }],
  keywords: ['вебінари', 'онлайн-заходи', 'платформа вебінарів', 'інтерактивні заходи', 'Сцена'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    url: '/',
    siteName: SITE_NAME,
    title: 'Сцена — платформа інтерактивних онлайн-заходів',
    description: SITE_DESCRIPTION,
    images: [{ url: '/img/photo-video-preview.png', width: 1280, height: 720, alt: 'Платформа «Сцена»' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Сцена — платформа інтерактивних онлайн-заходів',
    description: SITE_DESCRIPTION,
    images: ['/img/photo-video-preview.png'],
  },
  icons: {
    icon: [{ url: '/img/logo.png', type: 'image/png' }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={inter.className} data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          {children}
          <DemoModal />
        </AuthProvider>
      </body>
    </html>
  );
}
