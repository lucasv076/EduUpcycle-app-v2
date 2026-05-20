// ── Antwoordvalidatie per rekentype ───────────────────────────────────
//
// validateAnswer(userAnswer, correctAnswer, type, options?) →
//   { status: 'correct' | 'incorrect' | 'not-validatable', reason?: string }
//
// status:
//   - 'correct'         antwoord komt overeen
//   - 'incorrect'       antwoord komt niet overeen
//   - 'not-validatable' geen automatisch oordeel mogelijk
//                       (open vraag, tekenopgave, geen referentie)
//
// reason geeft een korte uitleg voor logging / feedback,
// niet bedoeld om direct aan de leerling te tonen.

// Normaliseer tekst: kleine letters, geen leestekens, één spatie tussen woorden.
export function normalizeText(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?'"()\[\]]/g, '')
    .replace(/\s+/g, ' ');
}

// Probeer een string als getal te parsen.
// Accepteert Nederlandse komma-decimaal, spaties als duizendtalscheiding,
// en valuta-tekens (€, $) als optionele prefix.
export function parseNumeric(s) {
  if (s === null || s === undefined) return NaN;
  let str = String(s).trim();
  if (!str) return NaN;

  // Verwijder valuta-tekens en het woord 'euro'
  str = str.replace(/€|\$|euro/gi, '').trim();

  // Verwijder spaties (duizendtalscheiding)
  str = str.replace(/\s/g, '');

  // Heeft het zowel '.' als ','? Dan is ',' decimaal en '.' duizendtal (NL).
  // Anders: enkele ',' wordt decimaalpunt.
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  // Moet nu een geldig getal-patroon zijn (geen extra letters).
  if (!/^-?\d+(\.\d+)?$/.test(str)) return NaN;

  return parseFloat(str);
}

// Splits een correct-antwoord in mogelijke alternatieven.
// AI levert soms "12 | 13" of "rood/blauw" voor opdrachten met meer dan
// één geldig antwoord.
function splitAlternatives(answer) {
  return String(answer)
    .split(/\s*\|\s*|\s*\/\s*/)
    .map(a => a.trim())
    .filter(Boolean);
}

// Vergelijk twee waarden numeriek met een kleine tolerantie voor floating point.
function numbersEqual(a, b) {
  return Math.abs(a - b) < 1e-9;
}

// ── Validators per type ───────────────────────────────────────────────

function validateMeerkeuze(userAnswer, correctAnswer) {
  // Bij meerkeuze klikt de leerling een hele optie aan,
  // dus we vergelijken de hele string genormaliseerd.
  if (normalizeText(userAnswer) === normalizeText(correctAnswer)) {
    return { status: 'correct' };
  }
  return { status: 'incorrect', reason: 'verkeerde optie gekozen' };
}

function validateInvulvraag(userAnswer, correctAnswer) {
  const alternatives = splitAlternatives(correctAnswer);

  for (const alt of alternatives) {
    const userNum = parseNumeric(userAnswer);
    const altNum = parseNumeric(alt);

    // Beide getallen: numeriek vergelijken
    if (!isNaN(userNum) && !isNaN(altNum)) {
      if (numbersEqual(userNum, altNum)) return { status: 'correct' };
      continue;
    }

    // Tekstuele invulvraag (bv. een woord)
    if (normalizeText(userAnswer) === normalizeText(alt)) {
      return { status: 'correct' };
    }
  }

  // Geef hint over welk type fout
  const userIsNumber = !isNaN(parseNumeric(userAnswer));
  const correctIsNumber = !isNaN(parseNumeric(alternatives[0]));
  if (correctIsNumber && !userIsNumber) {
    return { status: 'incorrect', reason: 'er werd een getal verwacht' };
  }
  return { status: 'incorrect', reason: 'antwoord komt niet overeen' };
}

// ── Hoofdfunctie ──────────────────────────────────────────────────────

export function validateAnswer(userAnswer, correctAnswer, type) {
  // Geen referentie-antwoord → niet valideerbaar
  if (correctAnswer === null || correctAnswer === undefined) {
    return { status: 'not-validatable', reason: 'geen referentie-antwoord' };
  }
  const trimmedCorrect = String(correctAnswer).trim();
  if (!trimmedCorrect || trimmedCorrect.toLowerCase() === 'n.v.t.') {
    return { status: 'not-validatable', reason: 'geen referentie-antwoord' };
  }

  // Open / tekenen / manipuleren: niet automatisch te valideren
  if (
    type === 'Open vraag' ||
    type === 'Tekenopgave' ||
    type === 'Manipulatieopdracht'
  ) {
    return { status: 'not-validatable', reason: `type ${type} kan niet automatisch beoordeeld worden` };
  }

  // Leeg gebruikersantwoord telt als fout (niet als 'leeg' = goed)
  if (userAnswer === null || userAnswer === undefined || String(userAnswer).trim() === '') {
    return { status: 'incorrect', reason: 'geen antwoord gegeven' };
  }

  if (type === 'Meerkeuze') return validateMeerkeuze(userAnswer, correctAnswer);
  if (type === 'Invulvraag') return validateInvulvraag(userAnswer, correctAnswer);

  // Onbekend type: val terug op invulvraag-logica
  return validateInvulvraag(userAnswer, correctAnswer);
}

// Convenience: oude API die true / false / null teruggaf.
// Houden we voor backwards compat in de UI.
export function checkAnswer(userAnswer, correctAnswer, type) {
  const result = validateAnswer(userAnswer, correctAnswer, type);
  if (result.status === 'correct') return true;
  if (result.status === 'incorrect') return false;
  return null;
}
