'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ScrollRevealInit } from '@/components/ScrollRevealInit';

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="error-page">
        <ScrollRevealInit>
        <div className="error-page__content">
          <h1 className="error-page__code">404</h1>
          <h2 className="error-page__title">Сторінку не знайдено</h2>
          <p className="error-page__text">
            Можливо, вона була видалена або ви ввели невірну адресу.
          </p>
          <Link href="/" className="btn btn--primary">
            На головну
          </Link>
        </div>
        </ScrollRevealInit>
      </div>
      <Footer />
    </>
  );
}