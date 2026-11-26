'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children?: React.ReactElement<{ className?: string; ref?: React.Ref<HTMLElement> }>;
  delay?: string;
}

export function ScrollRevealInit({ children, delay = '' }: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Захист: якщо children не передано або це не HTML/React-елемент
  if (!React.isValidElement(children)) {
    return children ?? null;
  }

  const existingClassName = children.props?.className || '';
  const combinedClassName = `${existingClassName} scroll-reveal ${delay} ${
    isVisible ? 'is-visible' : ''
  }`.trim();

  return React.cloneElement(children, {
    ref,
    className: combinedClassName,
  });
}
