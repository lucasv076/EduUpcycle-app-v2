# EduUpcycle — Zwijsen Werkboek Digitalisering

AI-gestuurde tool die statische PDF-werkboekpagina's van Uitgeverij Zwijsen transformeert naar interactieve digitale oefeningen.

## Wat doet het?

1. **Upload** een of meerdere Zwijsen-werkboek PDF's
2. **AI analyseert** automatisch de tekst en herkent oefeningen, vraagtypes, moeilijkheidsgraad
3. **Beoordeel** elk voorstel: pas het vraagtype aan, bekijk de leerlingweergave, keur goed of af
4. **Exporteer** goedgekeurde oefeningen als JSON voor verdere verwerking

## Tech stack

- **Next.js 14** (App Router)
- **Groq API** (Llama 3.3 70B) — gratis tier compatible
- **pdfjs-dist** — client-side PDF tekst- en afbeeldingsextractie
- **React 18** met inline styles in Zwijsen huisstijl

## Lokaal draaien

```bash
# 1. Clone de repo
git clone https://github.com/JOUW-USERNAME/eduurcycle.git
cd eduurcycle

# 2. Installeer dependencies
npm install

# 3. Maak .env.local aan (of kopieer .env.example)
cp .env.example .env.local
# Vul je Groq API key in: https://console.groq.com

# 4. Start de dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployen naar Vercel

### Stap 1: Push naar GitHub

```bash
cd eduurcycle
git init
git add .
git commit -m "Initial commit: EduUpcycle app"
git branch -M main
git remote add origin https://github.com/JOUW-USERNAME/eduurcycle.git
git push -u origin main
```

### Stap 2: Vercel koppelen

1. Ga naar [vercel.com/new](https://vercel.com/new)
2. Importeer je GitHub repository
3. Voeg **Environment Variable** toe:
   - Key: `GROQ_API_KEY`
   - Value: je Groq API key
4. Klik **Deploy**

De app is dan live op `https://eduurcycle.vercel.app` (of je eigen domein).

## Demo-modus

Zonder `GROQ_API_KEY` draait de app automatisch in demo-modus met 4 vooraf gedefinieerde oefeningen uit Rekentijger groep 3A.

## Projectstructuur

```
eduurcycle/
├── src/
│   ├── app/
│   │   ├── page.jsx          # Hoofd-UI (upload, review, export)
│   │   ├── layout.jsx         # Root layout
│   │   ├── globals.css        # Globale styles + animaties
│   │   └── api/analyze/
│   │       └── route.js       # POST endpoint → Groq API
│   ├── components/
│   │   └── illustrations.jsx  # SVG illustraties per vraagtype
│   └── lib/
│       ├── colors.js          # Zwijsen brand palette
│       ├── ai-prompt.js       # System prompt voor AI-analyse
│       ├── demo-data.js       # Fallback oefeningen (demo-modus)
│       └── pdf-extract.js     # PDF → tekst + afbeeldingen
├── package.json
├── jsconfig.json              # @/ path alias
├── next.config.mjs            # Webpack config (pdf.js compat)
├── vercel.json                # Vercel deployment config
├── .env.example               # Template voor API key
└── .gitignore
```

## Groq API key aanmaken

1. Ga naar [console.groq.com](https://console.groq.com)
2. Maak een account aan (gratis)
3. Ga naar **API Keys** → **Create API Key**
4. Kopieer de key naar je `.env.local`

De gratis tier heeft ruime limieten voor development en demo's.

---

Gebouwd voor het Industry Project van Fontys × Uitgeverij Zwijsen.
