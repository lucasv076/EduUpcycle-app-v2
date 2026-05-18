import { describe, it, expect } from 'vitest';
import {
  validateAnswer,
  checkAnswer,
  normalizeText,
  parseNumeric,
} from './answer-validation.js';

// ── Helpers ───────────────────────────────────────────────────────────

describe('normalizeText', () => {
  it('zet alles om naar kleine letters', () => {
    expect(normalizeText('HALLO')).toBe('hallo');
  });

  it('verwijdert leestekens', () => {
    expect(normalizeText('Hoi, wereld!')).toBe('hoi wereld');
  });

  it('reduceert meerdere spaties tot één', () => {
    expect(normalizeText('  veel    spaties  ')).toBe('veel spaties');
  });

  it('werkt met null en undefined', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('parseNumeric', () => {
  it('parseert simpele gehele getallen', () => {
    expect(parseNumeric('12')).toBe(12);
    expect(parseNumeric('0')).toBe(0);
    expect(parseNumeric('-7')).toBe(-7);
  });

  it('parseert Nederlandse komma-decimalen', () => {
    expect(parseNumeric('1,5')).toBe(1.5);
    expect(parseNumeric('0,25')).toBe(0.25);
  });

  it('parseert Engelse punt-decimalen', () => {
    expect(parseNumeric('1.5')).toBe(1.5);
  });

  it('parseert getallen met duizendtalscheiding (spatie)', () => {
    expect(parseNumeric('1 000')).toBe(1000);
  });

  it('parseert getallen met duizendtal-punt en komma-decimaal', () => {
    expect(parseNumeric('1.234,56')).toBe(1234.56);
  });

  it('verwijdert euro-tekens', () => {
    expect(parseNumeric('€ 5,00')).toBe(5);
    expect(parseNumeric('5 euro')).toBe(5);
  });

  it('geeft NaN bij niet-getal', () => {
    expect(parseNumeric('abc')).toBeNaN();
    expect(parseNumeric('')).toBeNaN();
    expect(parseNumeric('12abc')).toBeNaN();
  });
});

// ── Meerkeuze ─────────────────────────────────────────────────────────

describe('validateAnswer — Meerkeuze', () => {
  it('keurt exact gelijke optie goed', () => {
    const r = validateAnswer('Rood', 'Rood', 'Meerkeuze');
    expect(r.status).toBe('correct');
  });

  it('keurt verschillende hoofdletters goed', () => {
    const r = validateAnswer('rood', 'Rood', 'Meerkeuze');
    expect(r.status).toBe('correct');
  });

  it('keurt verkeerde optie af', () => {
    const r = validateAnswer('Blauw', 'Rood', 'Meerkeuze');
    expect(r.status).toBe('incorrect');
  });

  it('keurt leeg antwoord af', () => {
    const r = validateAnswer('', 'Rood', 'Meerkeuze');
    expect(r.status).toBe('incorrect');
    expect(r.reason).toMatch(/geen antwoord/i);
  });
});

// ── Invulvraag (rekentypes) ───────────────────────────────────────────

describe('validateAnswer — Invulvraag met getallen (Optellen)', () => {
  it('keurt exact gelijk getal goed', () => {
    expect(validateAnswer('12', '12', 'Invulvraag').status).toBe('correct');
  });

  it('keurt willekeurige tekst af (de bug uit fase 1)', () => {
    expect(validateAnswer('random iets', '12', 'Invulvraag').status).toBe('incorrect');
  });

  it('keurt verkeerd getal af', () => {
    expect(validateAnswer('13', '12', 'Invulvraag').status).toBe('incorrect');
  });

  it('keurt antwoord met spaties rondom goed', () => {
    expect(validateAnswer(' 12 ', '12', 'Invulvraag').status).toBe('correct');
  });

  it('keurt negatieve getallen goed', () => {
    expect(validateAnswer('-3', '-3', 'Invulvraag').status).toBe('correct');
    expect(validateAnswer('-3', '3', 'Invulvraag').status).toBe('incorrect');
  });

  it('hint dat er een getal verwacht werd', () => {
    const r = validateAnswer('twaalf', '12', 'Invulvraag');
    expect(r.status).toBe('incorrect');
    expect(r.reason).toMatch(/getal/i);
  });
});

describe('validateAnswer — Invulvraag met decimalen (Geld / Maten)', () => {
  it('accepteert NL-komma versus EN-punt', () => {
    expect(validateAnswer('1,5', '1.5', 'Invulvraag').status).toBe('correct');
    expect(validateAnswer('1.5', '1,5', 'Invulvraag').status).toBe('correct');
  });

  it('accepteert euro-prefix', () => {
    expect(validateAnswer('€5,00', '5', 'Invulvraag').status).toBe('correct');
    expect(validateAnswer('5 euro', '5', 'Invulvraag').status).toBe('correct');
  });

  it('rekent 5,00 en 5 als gelijk', () => {
    expect(validateAnswer('5,00', '5', 'Invulvraag').status).toBe('correct');
  });
});

describe('validateAnswer — Invulvraag met alternatieven', () => {
  it('accepteert het eerste alternatief', () => {
    expect(validateAnswer('12', '12 | 13', 'Invulvraag').status).toBe('correct');
  });

  it('accepteert het tweede alternatief', () => {
    expect(validateAnswer('13', '12 | 13', 'Invulvraag').status).toBe('correct');
  });

  it('keurt iets buiten de lijst af', () => {
    expect(validateAnswer('14', '12 | 13', 'Invulvraag').status).toBe('incorrect');
  });

  it('werkt ook met / als scheidingsteken', () => {
    expect(validateAnswer('rood', 'rood / blauw', 'Invulvraag').status).toBe('correct');
    expect(validateAnswer('blauw', 'rood / blauw', 'Invulvraag').status).toBe('correct');
  });
});

describe('validateAnswer — Invulvraag met woord-antwoord', () => {
  it('keurt woord goed (case-insensitive)', () => {
    expect(validateAnswer('Appel', 'appel', 'Invulvraag').status).toBe('correct');
  });

  it('keurt verkeerd woord af', () => {
    expect(validateAnswer('peer', 'appel', 'Invulvraag').status).toBe('incorrect');
  });
});

// ── Open vragen / Tekenopgaven ────────────────────────────────────────

describe('validateAnswer — Open vraag', () => {
  it('is niet automatisch valideerbaar', () => {
    const r = validateAnswer('lang antwoord', 'voorbeeldantwoord', 'Open vraag');
    expect(r.status).toBe('not-validatable');
  });
});

describe('validateAnswer — Tekenopgave', () => {
  it('is niet automatisch valideerbaar', () => {
    const r = validateAnswer('iets', 'n.v.t.', 'Tekenopgave');
    expect(r.status).toBe('not-validatable');
  });
});

describe('validateAnswer — Manipulatieopdracht', () => {
  it('is niet automatisch valideerbaar', () => {
    const r = validateAnswer('iets', 'n.v.t.', 'Manipulatieopdracht');
    expect(r.status).toBe('not-validatable');
  });
});

// ── Edge cases ────────────────────────────────────────────────────────

describe('validateAnswer — edge cases', () => {
  it('geen correctAnswer → niet valideerbaar', () => {
    expect(validateAnswer('12', '', 'Invulvraag').status).toBe('not-validatable');
    expect(validateAnswer('12', null, 'Invulvraag').status).toBe('not-validatable');
    expect(validateAnswer('12', undefined, 'Invulvraag').status).toBe('not-validatable');
  });

  it('correctAnswer is "n.v.t." → niet valideerbaar', () => {
    expect(validateAnswer('iets', 'n.v.t.', 'Invulvraag').status).toBe('not-validatable');
    expect(validateAnswer('iets', 'N.V.T.', 'Invulvraag').status).toBe('not-validatable');
  });

  it('onbekend type valt terug op invulvraag-logica', () => {
    expect(validateAnswer('12', '12', 'OnbekendType').status).toBe('correct');
    expect(validateAnswer('13', '12', 'OnbekendType').status).toBe('incorrect');
  });
});

// ── Backwards-compat wrapper ──────────────────────────────────────────

describe('checkAnswer (oude API: true/false/null)', () => {
  it('geeft true bij correct', () => {
    expect(checkAnswer('12', '12', 'Invulvraag')).toBe(true);
  });

  it('geeft false bij incorrect', () => {
    expect(checkAnswer('random', '12', 'Invulvraag')).toBe(false);
  });

  it('geeft null bij niet valideerbaar', () => {
    expect(checkAnswer('iets', 'n.v.t.', 'Tekenopgave')).toBe(null);
    expect(checkAnswer('iets', '', 'Invulvraag')).toBe(null);
  });
});
