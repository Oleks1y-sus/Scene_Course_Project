/**
 * Lightweight, deterministic content moderation for user-generated titles and
 * descriptions. Text is normalised (Unicode NFKC, leetspeak, diacritics,
 * zero-width characters, repeated letters) before matching so that simple
 * obfuscation tricks cannot bypass the filter.
 *
 * Reports remain the primary moderation mechanism for images, names and
 * subjective content. This filter only catches clear profanity and creates an
 * audit trail for the administrator.
 */

const CYRILLIC_STEMS = [
  'хуй',
  'хуя',
  'хуе',
  'пизд',
  'пизж',
  'бляд',
  'блят',
  'ебат',
  'ебал',
  'ебан',
  'еби',
  'ебуч',
  'заєб',
  'заеб',
  'наєб',
  'наеб',
  'від' + 'єб',
  'отъеб',
  'мудак',
  'мудил',
  'гандон',
  'гівнюк',
  'говнюк',
  'срак',
  'сран',
  'долбо',
  'шлюх',
  'шалав',
  'курв',
  'сучар',
  'падл',
  'вирод',
  'дегенерат',
];

const LATIN_STEMS = [
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'dick',
  'cunt',
  'whore',
  'slut',
  'nigg',
  'faggot',
  'retard',
  'porn',
  'nazi',
  'motherfuck',
];

const LATIN_LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'l',
  '+': 't',
  '€': 'e',
  '£': 'l',
};

const CYRILLIC_LEET: Record<string, string> = {
  '0': 'о',
  '3': 'з',
  '4': 'ч',
  '6': 'б',
  '@': 'а',
  $: 'с',
  '!': 'і',
};

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', i: 'і', k: 'к', m: 'м',
  o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
};

const fold = (value: string): string =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const collapseRepeats = (value: string): string => value.replace(/(.)\1{2,}/g, '$1');

const applyMap = (value: string, map: Record<string, string>): string =>
  Array.from(value)
    .map((character) => map[character] ?? character)
    .join('');

const normalizeCyrillic = (value: string): string =>
  value
    .replace(/[йїі]/g, 'и')
    .replace(/[єёэ]/g, 'е')
    .replace(/ґ/g, 'г')
    .replace(/ы/g, 'и')
    .replace(/ъ/g, '');

const latinise = (value: string): string =>
  fold(applyMap(value, LATIN_LEET)).replace(/[^a-z]/g, '');

const cyrillise = (value: string): string => {
  const mapped = fold(applyMap(value, CYRILLIC_LEET));
  const mixed = Array.from(mapped)
    .map((character) => LATIN_TO_CYRILLIC[character] ?? character)
    .join('');
  return normalizeCyrillic(mixed.replace(/[^а-яіїєґёыэъ]/g, ''));
};

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
}

export const scanForProfanity = (value: string): ModerationResult => {
  const latinCompact = collapseRepeats(latinise(value));
  const cyrillicCompact = collapseRepeats(cyrillise(value));

  for (const stem of LATIN_STEMS) {
    if (latinCompact.includes(stem)) {
      return { flagged: true, reason: 'AUTOMATED_PROFANITY' };
    }
  }

  for (const stem of CYRILLIC_STEMS) {
    if (cyrillicCompact.includes(normalizeCyrillic(stem))) {
      return { flagged: true, reason: 'AUTOMATED_PROFANITY' };
    }
  }

  // "ass" is only matched as a standalone word, otherwise words such as
  // "class" or "passion" would be false positives.
  const latinWords = fold(value)
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (latinWords.some((word) => word === 'ass' || word === 'asses')) {
    return { flagged: true, reason: 'AUTOMATED_PROFANITY' };
  }

  return { flagged: false };
};

export const scanWebinarContent = (parts: Array<string | null | undefined>): ModerationResult => {
  return scanForProfanity(parts.filter((part): part is string => Boolean(part)).join(' \n '));
};
