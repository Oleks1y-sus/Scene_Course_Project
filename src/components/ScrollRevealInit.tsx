'use client';

import { useEffect } from 'react';
// import { usePathname } from 'next/navigation';

export default function ScrollRevealInit() {
 // const pathname = usePathname(); // Потрібно для перезапуску при зміні сторінок

  useEffect(() => {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const scrollObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.1,
    });

    revealElements.forEach((element) => scrollObserver.observe(element));

    // Очищення обсерватора при розмонтуванні або зміні сторінки
    return () => {
      scrollObserver.disconnect();
    };
  }, []); // [pathname]Ефект спрацьовує заново, якщо користувач перейшов на іншу сторінку

  return null; // Компонент нічого не рендерить у DOM, лише виконує логіку
}
