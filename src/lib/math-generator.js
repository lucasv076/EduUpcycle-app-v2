// Client-side math question generator — produces fresh questions per attempt

export const THEMA_EMOJIS = {
  appel:    '🍎',
  peer:     '🍐',
  banaan:   '🍌',
  aardbei:  '🍓',
  ei:       '🥚',
  blad:     '🍃',
  bloem:    '🌸',
  ster:     '⭐',
  bal:      '⚽',
  vis:      '🐟',
  vlinder:  '🦋',
  kikker:   '🐸',
};
const THEMA_KEYS = Object.keys(THEMA_EMOJIS);

export function randomThema() {
  return THEMA_KEYS[Math.floor(Math.random() * THEMA_KEYS.length)];
}

// Parses "a OP b = ___" → { a, op, b } or null
export function parseSomNums(tekst) {
  const m = tekst.match(/^(\d+)\s*([+\-−])\s*(\d+)\s*=\s*___/);
  if (!m) return null;
  return { a: parseInt(m[1]), op: m[2], b: parseInt(m[3]) };
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function numsFromTekst(tekst) {
  return (tekst.replace(/___/g, '').match(/\d+/g) || []).map(Number).filter(n => n > 0);
}

function rangeFromSommen(sommen) {
  const nums = sommen.flatMap(s => numsFromTekst(s.tekst));
  if (!nums.length) return { lo: 2, hi: 10 };
  return { lo: Math.max(1, Math.min(...nums)), hi: Math.max(...nums) };
}

// bereikMax = highest number allowed in the som (set by AI, e.g. 10 for "tot 10")
function makeSom(bewerking, lo, bereikMax) {
  let a, b, antwoord, tekst;
  switch (bewerking) {
    case 'vermenigvuldigen': {
      const half = Math.max(lo, Math.floor(Math.sqrt(bereikMax)));
      a = rand(lo, half); b = rand(lo, half);
      antwoord = a * b; tekst = `${a} × ${b} = ___`;
      break;
    }
    case 'optellen': {
      // Both a and b ≥ lo, a + b ≤ bereikMax
      const maxA = bereikMax - lo;
      if (maxA < lo) return null;
      a = rand(lo, maxA);
      const maxB = bereikMax - a;
      if (maxB < lo) return null;
      b = rand(lo, maxB);
      antwoord = a + b; tekst = `${a} + ${b} = ___`;
      break;
    }
    case 'aftrekken': {
      // a ≤ bereikMax, b ≥ 1, answer = a - b ≥ lo
      if (bereikMax <= lo) return null;
      a = rand(lo + 1, bereikMax);
      b = rand(1, a - lo);   // ensures answer = a - b ≥ lo
      antwoord = a - b; tekst = `${a} − ${b} = ___`;
      break;
    }
    case 'delen': {
      b = rand(2, Math.max(2, Math.floor(Math.sqrt(bereikMax))));
      antwoord = rand(lo, Math.floor(bereikMax / b));
      a = antwoord * b;
      tekst = `${a} ÷ ${b} = ___`;
      break;
    }
    default:
      return null;
  }
  return { tekst, antwoord, bewerking };
}

function freshVulIn(data, count) {
  const sommen = data.sommen || [];
  if (!sommen.length) return data;

  const freq = {};
  sommen.forEach(s => { freq[s.bewerking] = (freq[s.bewerking] || 0) + 1; });
  const bewerkingen = Object.keys(freq);

  // Use AI-provided range; fall back to derived range only if not set
  const derived = rangeFromSommen(sommen);
  const lo = data.bereik_min != null ? data.bereik_min : Math.max(1, derived.lo);
  const bereikMax = data.bereik_max != null ? data.bereik_max : Math.max(lo + 4, derived.hi);

  // Distribute count proportionally across all bewerkingen (preserves optellen+aftrekken mix)
  const total = sommen.length;
  const planned = {};
  bewerkingen.forEach(b => { planned[b] = Math.max(1, Math.round((freq[b] / total) * count)); });
  const plannedTotal = Object.values(planned).reduce((a, b) => a + b, 0);
  if (plannedTotal !== count) {
    const topB = [...bewerkingen].sort((a, b) => freq[b] - freq[a])[0];
    planned[topB] += count - plannedTotal;
  }

  const result = [];
  const seen = new Set();

  for (const bewerking of bewerkingen) {
    let remaining = planned[bewerking];
    let attempts = remaining * 40;
    while (remaining > 0 && attempts-- > 0) {
      const s = makeSom(bewerking, lo, bereikMax);
      if (s && !seen.has(s.tekst)) {
        seen.add(s.tekst);
        result.push(s);
        remaining--;
      }
    }
  }

  // Shuffle so bewerkingen are interleaved
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  // Only use thema if AI provided it — no random fallback
  return result.length >= count ? { ...data, sommen: result } : data;
}

const OP_SYM = { vermenigvuldigen: '×', optellen: '+', aftrekken: '−', delen: '÷' };

function freshGoedFout(data, count) {
  const stellingen = data.stellingen || [];
  if (!stellingen.length) return data;

  const freq = {};
  stellingen.forEach(s => { freq[s.bewerking] = (freq[s.bewerking] || 0) + 1; });
  const bewerking = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];

  const allNums = stellingen.flatMap(s => numsFromTekst(s.tekst));
  const lo = allNums.length ? Math.max(1, Math.min(...allNums)) : 2;
  const hi = Math.max(lo + 2, allNums.length ? Math.max(...allNums) : 10);

  const result = [];
  const seen = new Set();
  let attempts = count * 40;
  // Track how many correct vs wrong we've added to keep ~50/50
  let correctCount = 0;

  while (result.length < count && attempts-- > 0) {
    let a, b, correct, tekst;

    switch (bewerking) {
      case 'vermenigvuldigen': a = rand(lo, hi); b = rand(lo, hi); correct = a * b; break;
      case 'optellen':        a = rand(lo, hi); b = rand(lo, hi); correct = a + b; break;
      case 'aftrekken':       b = rand(lo, hi); a = b + rand(lo, hi); correct = a - b; break;
      case 'delen':
        b = rand(Math.max(2, lo), Math.max(2, hi));
        correct = rand(lo, hi);
        a = correct * b;
        break;
      default: return data;
    }

    const wantWrong = correctCount > result.length - correctCount ? true : Math.random() > 0.5;
    let display = correct;
    let klopt = true;
    if (wantWrong) {
      const offset = rand(1, Math.max(1, Math.floor(correct * 0.2) + 2));
      display = correct + (Math.random() > 0.5 ? offset : -offset);
      if (display !== correct) klopt = false;
    }

    const sym = OP_SYM[bewerking] || '?';
    tekst = `${a} ${sym} ${b} = ${display}`;

    if (!seen.has(tekst)) {
      seen.add(tekst);
      if (klopt) correctCount++;
      result.push({ tekst, klopt, bewerking });
    }
  }

  return result.length >= count ? { ...data, stellingen: result } : data;
}

function freshTabel(data, count) {
  const { operator, factor, rijen } = data;
  if (!rijen?.length || !factor) return data;

  const getallen = rijen.map(r => r.getal).filter(n => typeof n === 'number');
  const lo = getallen.length ? Math.max(1, Math.min(...getallen)) : 1;
  const hi = Math.max(lo + count, getallen.length ? Math.max(...getallen) + 2 : 10);

  const newGetallen = new Set();
  let attempts = count * 30;
  while (newGetallen.size < count && attempts-- > 0) newGetallen.add(rand(lo, hi));

  const blankFrac = rijen.length ? rijen.filter(r => r.uitkomst === null).length / rijen.length : 0.6;

  const newRijen = [...newGetallen].map(getal => {
    let antwoord;
    if (operator === '×') antwoord = getal * factor;
    else if (operator === '+') antwoord = getal + factor;
    else if (operator === '−') antwoord = getal - factor;
    else antwoord = getal;

    const isBlank = Math.random() < Math.max(0.4, blankFrac);
    return { getal, uitkomst: isBlank ? null : antwoord, antwoord };
  });

  // Guarantee at least one blank and one shown
  const blanks = newRijen.filter(r => r.uitkomst === null);
  if (blanks.length === 0) newRijen[0].uitkomst = null;
  if (blanks.length === newRijen.length) newRijen[0].uitkomst = newRijen[0].antwoord;

  return { ...data, rijen: newRijen };
}

function freshGetallenLijn(data) {
  const { lijn_min = 0, lijn_max = 20, stap = 1, te_plaatsen: orig = [], gegeven_getallen = [] } = data;
  const stepSize = Math.max(1, stap);

  // All valid tick positions excluding endpoints and given anchors
  const excluded = new Set([lijn_min, lijn_max, ...gegeven_getallen]);
  const pool = [];
  for (let p = lijn_min + stepSize; p < lijn_max; p += stepSize) {
    if (!excluded.has(p)) pool.push(p);
  }

  if (pool.length === 0) return data;

  // Keep same count as original (min 2, max pool size)
  const count = Math.min(Math.max(2, orig.length), pool.length);

  // Shuffle pool and take first `count` positions
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const te_plaatsen = pool.slice(0, count).sort((a, b) => a - b);

  return { ...data, te_plaatsen };
}

export function generateFreshRekensomData(rekensomData, questionType, count = 5) {
  if (!rekensomData) return null;
  try {
    if (questionType === 'vul_in') return freshVulIn(rekensomData, count);
    if (questionType === 'goed_fout') return freshGoedFout(rekensomData, count);
    if (questionType === 'vermenigvuldig_tabel') return freshTabel(rekensomData, count);
    if (questionType === 'getallenlijn') return freshGetallenLijn(rekensomData);
  } catch (e) {
    console.warn('math-generator fallback:', e);
  }
  return rekensomData;
}
