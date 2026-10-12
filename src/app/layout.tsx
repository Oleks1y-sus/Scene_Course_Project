import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ScrollRevealInit from "@/components/ScrollRevealInit"; 

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Сцена — платформа інтерактивних онлайн-заходів',
  description: 'Сцена — платформа для вебінарів і онлайн-заходів: інтерактивні опитування, чат, питання та відповіді й аналітика, що залучають аудиторію та приносять дохід.',
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={inter.className}>
      <head>
        <link rel="icon" href="/img/logo.png" type="image/png" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide-core.min.css" />
        {/* <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js');` }} /> */}
      </head>
      <body>
        <ScrollRevealInit />
        {children}
      </body>
    </html>
  );
}