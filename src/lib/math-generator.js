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

  const thema = data.thema || randomThema();
  return result.length >= count ? { ...data, thema, sommen: result } : { ...data, thema };
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

// Geen 1ct/2ct (moeilijk wisselgeld) en geen €200/€500 (onrealistisch in schoolcontext)
const BRIEFJE_POOL = [5, 10, 20, 50, 100];
const MUNT_POOL    = [0.05, 0.10, 0.20, 0.50, 1, 2];
// Prijzen altijd veelvoud van 5ct → wisselgeld vereist nooit 1ct/2ct
const CENT_OPTIONS = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95];

function generateDisstractors(correct, count = 3) {
  const seen = new Set([correct]);
  const result = [];
  const offsets = [5, 10, 15, 20, 25, 50, 100]; // in centen
  let attempts = 100;
  while (result.length < count && attempts-- > 0) {
    const cents = offsets[rand(0, offsets.length - 1)];
    const sign = Math.random() > 0.5 ? 1 : -1;
    const candidate = Math.round((correct + sign * cents / 100) * 100) / 100;
    if (candidate > 0 && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
  }
  return result;
}

function buildGeldBase(data) {
  const modus = Math.random() > 0.5 ? 'wisselgeld' : 'tellen';

  if (modus === 'wisselgeld') {
    const betaaldWaarde = BRIEFJE_POOL[rand(0, BRIEFJE_POOL.length - 1)];
    const centen        = CENT_OPTIONS[rand(0, CENT_OPTIONS.length - 1)];
    const euroPart      = rand(1, Math.max(1, betaaldWaarde - 2));
    const prijs         = Math.round((euroPart + centen) * 100) / 100;
    const safePrijs     = prijs >= betaaldWaarde ? betaaldWaarde - 0.05 : prijs;
    const totaal        = Math.round((betaaldWaarde - safePrijs) * 100) / 100;
    return { ...data, modus: 'wisselgeld', items: [{ soort: 'briefje', waarde: betaaldWaarde, aantal: 1 }], prijs: safePrijs, totaal };
  }

  const numItems = rand(2, 4);
  const items    = [];
  const seen     = new Set();
  let attempts   = 60;
  while (items.length < numItems && attempts-- > 0) {
    const isBriefje = Math.random() > 0.5;
    const pool      = isBriefje ? BRIEFJE_POOL : MUNT_POOL;
    const waarde    = pool[rand(0, pool.length - 1)];
    const key       = `${isBriefje ? 'b' : 'm'}-${waarde}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ soort: isBriefje ? 'briefje' : 'munt', waarde, aantal: rand(1, 3) });
  }
  if (!items.length) return data;
  const totaal = Math.round(items.reduce((s, it) => s + it.waarde * it.aantal, 0) * 100) / 100;
  return { ...data, modus: 'tellen', items, totaal, prijs: undefined };
}

function freshGeldTellen(data) {
  const base = buildGeldBase(data);
  const VALID_TYPES = ['invul', 'meerkeuze', 'goed_fout'];
  const geld_vraag_type = VALID_TYPES.includes(data.geld_vraag_type)
    ? data.geld_vraag_type
    : VALID_TYPES[rand(0, VALID_TYPES.length - 1)];

  if (geld_vraag_type === 'meerkeuze') {
    const distractors = generateDisstractors(base.totaal);
    const opties = [base.totaal, ...distractors].sort(() => Math.random() - 0.5);
    return { ...base, geld_vraag_type: 'meerkeuze', opties, correct_optie: opties.indexOf(base.totaal) };
  }

  if (geld_vraag_type === 'goed_fout') {
    const klopt = Math.random() > 0.5;
    let getoond_bedrag = base.totaal;
    if (!klopt) {
      const offsets = [5, 10, 20, 25, 50];
      let attempts = 20;
      while (attempts-- > 0) {
        const cents = offsets[rand(0, offsets.length - 1)];
        const sign  = Math.random() > 0.5 ? 1 : -1;
        const c = Math.round((base.totaal + sign * cents / 100) * 100) / 100;
        if (c > 0 && c !== base.totaal) { getoond_bedrag = c; break; }
      }
    }
    return { ...base, geld_vraag_type: 'goed_fout', getoond_bedrag, klopt };
  }

  return { ...base, geld_vraag_type: 'invul' };
}

function generateTafelDistractors(antwoord, tafel, count = 3) {
  const seen = new Set([antwoord]);
  const candidates = [];
  for (let k = 1; k <= 6 && candidates.length < count * 3; k++) {
    const c1 = antwoord + tafel * k;
    const c2 = antwoord - tafel * k;
    if (c1 > 0 && !seen.has(c1)) { seen.add(c1); candidates.push(c1); }
    if (c2 > 0 && !seen.has(c2)) { seen.add(c2); candidates.push(c2); }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}

function freshTafelSpin(data, count = 5) {
  const tafel = data.tafel || 3;
  const bewerkingen = Array.isArray(data.bewerkingen) && data.bewerkingen.length
    ? data.bewerkingen
    : ['keren'];
  const tvt = ['invul', 'meerkeuze'].includes(data.tafel_vraag_type)
    ? data.tafel_vraag_type
    : 'invul';

  const lo = Math.max(1, data.bereik_min ?? 1);
  const hi = Math.max(lo + 2, data.bereik_max ?? 10);

  const vragen = [];
  const seen = new Set();
  let attempts = count * 40;

  while (vragen.length < count && attempts-- > 0) {
    const bewerking = bewerkingen[rand(0, bewerkingen.length - 1)];
    const getal = rand(lo, hi);
    let tekst, antwoord;

    if (bewerking === 'keren') {
      tekst = `${tafel} × ${getal} = ___`;
      antwoord = tafel * getal;
    } else {
      antwoord = getal;
      tekst = `${tafel * getal} ÷ ${tafel} = ___`;
    }

    if (seen.has(tekst)) continue;
    seen.add(tekst);

    const vraag = { tekst, antwoord, bewerking, getal };
    if (tvt === 'meerkeuze') {
      const distractors = generateTafelDistractors(antwoord, tafel, 3);
      const opties = [antwoord, ...distractors].sort(() => Math.random() - 0.5);
      vraag.opties = opties;
      vraag.correct_optie_index = opties.indexOf(antwoord);
    }
    vragen.push(vraag);
  }

  return vragen.length >= count
    ? { ...data, tafel_vraag_type: tvt, vragen }
    : data;
}

export function generateFreshRekensomData(rekensomData, questionType, count = 5) {
  if (!rekensomData) return null;
  try {
    if (questionType === 'vul_in') return freshVulIn(rekensomData, count);
    if (questionType === 'goed_fout') return freshGoedFout(rekensomData, count);
    if (questionType === 'vermenigvuldig_tabel') return freshTabel(rekensomData, count);
    if (questionType === 'getallenlijn') return freshGetallenLijn(rekensomData);
    if (questionType === 'geld_tellen') return freshGeldTellen(rekensomData);
    if (questionType === 'tafel_spin') return freshTafelSpin(rekensomData, count);
  } catch (e) {
    console.warn('math-generator fallback:', e);
  }
  return rekensomData;
}
