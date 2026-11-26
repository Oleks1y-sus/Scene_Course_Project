import { randomBytes } from 'node:crypto';

const TRANSLITERATION: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
  и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ь: '', ю: 'yu', я: 'ya', ы: 'y', э: 'e', ё: 'e', ъ: '',
};

export const slugify = (value: string): string => {
  const transliterated = Array.from(value.toLowerCase())
    .map((character) => TRANSLITERATION[character] ?? character)
    .join('');

  const slug = transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return slug || 'webinar';
};

export const uniqueSlug = (title: string): string => {
  const suffix = randomBytes(4).toString('hex');
  return `${slugify(title)}-${suffix}`;
};
