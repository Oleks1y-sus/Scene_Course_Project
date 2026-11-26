import { describe, expect, it } from 'vitest';
import { scanForProfanity, scanWebinarContent } from './services/moderation.js';

describe('content moderation', () => {
  it('allows ordinary Ukrainian titles', () => {
    expect(scanForProfanity('Практичний воркшоп з UX-досліджень').flagged).toBe(false);
    expect(scanForProfanity('Фінансова грамотність для фрілансерів').flagged).toBe(false);
    expect(scanForProfanity('Сукня та стиль: осінній гардероб').flagged).toBe(false);
  });

  it('does not flag the Latin substring inside a normal word', () => {
    expect(scanForProfanity('Classic product management').flagged).toBe(false);
    expect(scanForProfanity('Passion for design').flagged).toBe(false);
  });

  it('detects straightforward profanity', () => {
    expect(scanForProfanity('fuck this webinar').flagged).toBe(true);
    expect(scanForProfanity('ти хуй').flagged).toBe(true);
  });

  it('normalises leetspeak and punctuation tricks', () => {
    expect(scanForProfanity('F.u.c.k webinar').flagged).toBe(true);
    expect(scanForProfanity('f u c k').flagged).toBe(true);
    expect(scanForProfanity('b!tch session').flagged).toBe(true);
    expect(scanForProfanity('fuuuck').flagged).toBe(true);
    expect(scanForProfanity('піздєц').flagged).toBe(true);
  });

  it('scans combined webinar content and tags', () => {
    expect(scanWebinarContent(['Нормальна назва', 'Опис без порушень', 'design']).flagged).toBe(false);
    expect(scanWebinarContent(['Нормальна назва', 'Опис', 'fuck']).flagged).toBe(true);
  });
});
