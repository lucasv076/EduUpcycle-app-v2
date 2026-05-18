// ── Demo data: vooraf geanalyseerde oefeningen ──────────────────────
// Wordt gebruikt als fallback wanneer er geen AI API-key is ingesteld.
// Gebaseerd op Rekentijger groep 3A, pagina 21–22 (vierkanten).

export const DEMO_EXERCISES = [
  {
    id: 1, page: 21,
    title: 'Welke getallen kun je als vierkant tekenen?',
    original:
      'teken de getallen 1, 2, 3, 4, 5, … 20. gebruik ruitjespapier.\n' +
      'welke getallen kun je als vierkant tekenen?',
    type: 'Open vraag',
    confidence: 87,
    difficulty: 'Gemiddeld',
    topic: 'Meetkunde – Vierkantallen',
    format: 'Tekenveld + open antwoordvak',
    note:
      'Bevat een tekendeel (ruitjespapier) en een open antwoordvraag. ' +
      'Aanbeveling: combineer een digitaal rasterveld met een antwoordinvoer.',
    variants: [
      { level: 'Makkelijker', text: 'Welke van deze getallen kun je als vierkant tekenen? Kies uit: 1, 4, 7, 9, 11.' },
      { level: 'Moeilijker',  text: 'Welke getallen tot 50 kun je als vierkant tekenen? Leg uit hoe je dat weet.' },
    ],
    source_page_image_data_url: null,
    status: null,
  },
  {
    id: 2, page: 21,
    title: 'Teken het kleinste vierkant eromheen',
    original:
      'teken het kleinste vierkant eromheen.\n' +
      'hoeveel hokjes zijn dat bij elkaar?',
    type: 'Invulvraag',
    confidence: 94,
    difficulty: 'Gemiddeld',
    topic: 'Meetkunde – Oppervlakte',
    format: 'Numeriek invulveld',
    note:
      'Heldere invulvraag. Digitaal: leerling typt het aantal hokjes in een invulvak. Hoge AI-zekerheid.',
    variants: [
      { level: 'Makkelijker', text: 'Hoeveel hokjes heeft een vierkant van 2 × 2?' },
      { level: 'Moeilijker',  text: 'Hoeveel hokjes heeft het kleinste vierkant om getal 16 heen?' },
    ],
    source_page_image_data_url: null,
    status: null,
  },
  {
    id: 3, page: 22,
    title: 'Pak 12 tegels – het grootste vierkant',
    original:
      'pak 12 tegels. leg daarmee het grootste vierkant.\n' +
      'hoeveel tegels? hoeveel over?',
    type: 'Invulvraag',
    confidence: 91,
    difficulty: 'Gemiddeld',
    topic: 'Meetkunde – Vierkantsgetal',
    format: 'Twee numerieke invulvelden',
    note:
      'Twee deelvragen (hoeveel tegels + hoeveel over). Digitaal: twee aparte invulvakjes. ' +
      'Let op: de oorspronkelijke opgave vereist fysieke tegels.',
    variants: [
      { level: 'Makkelijker', text: 'Je hebt 9 tegels. Kun je een vierkant maken? Hoeveel blijven er over?' },
      { level: 'Moeilijker',  text: 'Pak 30 tegels. Leg het grootste vierkant. Hoeveel gebruik je? Hoeveel blijven over?' },
    ],
    source_page_image_data_url: null,
    status: null,
  },
  {
    id: 4, page: 22,
    title: 'Maak vierkanten – teken en kleur de vloertjes',
    original:
      'maak vierkanten. gebruik deze vloertjes.\n' +
      'teken en kleur de vloertjes in de vierkanten.\n' +
      'maak met 2 vloertjes een vierkant van 4.\n' +
      'maak met 3 vloertjes een vierkant van 9.',
    type: 'Tekenopgave',
    confidence: 72,
    difficulty: 'Moeilijk',
    topic: 'Meetkunde – Kwadraten visualiseren',
    format: 'Drag-and-drop kleurrooster',
    note:
      'Lage AI-zekerheid (72%). Bevat fysiek materiaal (vloertjes) dat niet ' +
      '1-op-1 digitaal te reproduceren is. Aanbeveling: klik-om-in-te-kleuren raster.',
    variants: [
      { level: 'Makkelijker', text: 'Kleur een vierkant van 4 hokjes in het raster.' },
      { level: 'Moeilijker',  text: 'Maak met 6 vloertjes twee verschillende vierkanten. Lukt dat?' },
    ],
    source_page_image_data_url: null,
    status: null,
  },
];
