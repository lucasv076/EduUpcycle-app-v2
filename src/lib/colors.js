// ── Zwijsen brand palette ─────────────────────────────────────────────
// Gebaseerd op https://www.zwijsen.nl/
export const C = {
  purple:      '#6D2077',
  purpleDark:  '#4A1552',
  purpleLight: '#EDE0F2',
  purpleBg:    '#F8F3FB',
  pink:        '#C8005C',
  pinkLight:   '#FFE8F4',
  orange:      '#E8421D',
  yellow:      '#F0B400',
  yellowLight: '#FFF8DC',
  green:       '#2DAA4F',
  greenLight:  '#E8F7ED',
  teal:        '#009AA4',
  tealLight:   '#E0F5F6',
  blue:        '#1F4FA0',
  blueLight:   '#E8EEF9',
  red:         '#D42B2B',
  redLight:    '#FDECEA',
  text:        '#2C1340',
  textMid:     '#5C4070',
  textLight:   '#9B89AC',
  border:      '#DDD0E6',
  bg:          '#F8F3FB',
  white:       '#FFFFFF',
};

// Kleuren per vraagtype
export const TYPE_COLORS = {
  'Open vraag':          { bg: '#E8EEF9', text: '#1F4FA0' },
  'Invulvraag':          { bg: '#E0F5F6', text: '#009AA4' },
  'Meerkeuze':           { bg: '#E8F7ED', text: '#2DAA4F' },
  'Tekenopgave':         { bg: '#FFF8DC', text: '#7A5500' },
  'Manipulatieopdracht': { bg: '#FFE8F4', text: '#C8005C' },
};

export const confColor = (c) =>
  c >= 90 ? C.green : c >= 78 ? C.yellow : C.orange;
