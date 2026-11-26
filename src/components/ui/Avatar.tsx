'use client';

import { useEffect, useState } from 'react';

const FALLBACK = '/img/avatars/avatar-01.svg';

export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <img
      src={failed || !src ? FALLBACK : src}
      alt={name}
      className={`avatar avatar--${size} ${className}`.trim()}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
    />
  );
}
