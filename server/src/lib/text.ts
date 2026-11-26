const FORBIDDEN_CHARACTERS = /[<>]/;
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

export const normalizeText = (value: string, multiline = false): string => {
  let normalized = value
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\r\n?/g, '\n');

  if (multiline) {
    normalized = normalized
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  } else {
    normalized = normalized.replace(/\s+/g, ' ');
  }

  return normalized.trim();
};

export const hasMarkup = (value: string): boolean => FORBIDDEN_CHARACTERS.test(value);

export const countLetters = (value: string): number => {
  return Array.from(value).filter((character) => /\p{L}/u.test(character)).length;
};

export const isValidDisplayName = (value: string): boolean => {
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u.test(value)) return false;
  if (countLetters(value) < 2) return false;
  return true;
};

export const cleanupDisplayName = (value: string): string => {
  return normalizeText(value).replace(/^[.'’\-\s]+|[.'’\-\s]+$/g, '').trim();
};

export const TITLE_ALLOWED = /^[\p{L}\p{M}\p{N}\s.,:;!?'"()&+–—/№%-]+$/u;
export const BIO_ALLOWED = /^[\p{L}\p{M}\p{N}\s.,:;!?'"()&+–—/№%#@\n-]*$/u;
export const TAG_ALLOWED = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

export const isAllowedTitle = (value: string): boolean =>
  TITLE_ALLOWED.test(value) && countLetters(value) >= 2;

export const isAllowedBio = (value: string): boolean => BIO_ALLOWED.test(value);

export const isAllowedTag = (value: string): boolean =>
  TAG_ALLOWED.test(value) && value.length >= 2 && value.length <= 24;

export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
