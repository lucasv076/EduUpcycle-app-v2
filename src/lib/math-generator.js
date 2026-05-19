// Client-side math question generator — produces fresh questions per attempt

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

function makeSom(bewerking, lo, hi) {
  let a, b, antwoord, tekst;
  switch (bewerking) {
    case 'vermenigvuldigen':
      a = rand(lo, hi); b = rand(lo, hi);
      antwoord = a * b; tekst = `${a} × ${b} = ___`;
      break;
    case 'optellen':
      a = rand(lo, hi); b = rand(lo, hi);
      antwoord = a + b; tekst = `${a} + ${b} = ___`;
      break;
    case 'aftrekken':
      b = rand(lo, hi); a = b + rand(lo, hi);
      antwoord = a - b; tekst = `${a} − ${b} = ___`;
      break;
    case 'delen':
      b = rand(Math.max(2, lo), Math.max(2, hi));
      antwoord = rand(lo, hi);
      a = antwoord * b;
      tekst = `${a} ÷ ${b} = ___`;
      break;
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
  const bewerking = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];

  const { lo, hi } = rangeFromSommen(sommen);
  const safeHi = Math.max(lo + 2, hi);

  const result = [];
  const seen = new Set();
  let attempts = count * 40;

  while (result.length < count && attempts-- > 0) {
    const s = makeSom(bewerking, lo, safeHi);
    if (s && !seen.has(s.tekst)) {
      seen.add(s.tekst);
      result.push(s);
    }
  }

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

export function generateFreshRekensomData(rekensomData, questionType, count = 5) {
  if (!rekensomData) return null;
  try {
    if (questionType === 'vul_in') return freshVulIn(rekensomData, count);
    if (questionType === 'goed_fout') return freshGoedFout(rekensomData, count);
    if (questionType === 'vermenigvuldig_tabel') return freshTabel(rekensomData, count);
  } catch (e) {
    console.warn('math-generator fallback:', e);
  }
  return rekensomData;
}
