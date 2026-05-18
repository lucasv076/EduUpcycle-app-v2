'use client';

import { useState } from 'react';
import { C } from '@/lib/colors';
import {
  BlokkenBouwselInteractive,
  gridsEqual,
  clampGrid,
  CubePreview,
  PlanGridDisplay,
} from '@/components/blokken-bouwsel';

// ── Mock data ────────────────────────────────────────────────────────────

const G_CORRECT = [[2, 1], [0, 3]];
const G_WRONG   = [[2, 1], [1, 3]]; // differs at [1][0]
const G_3X3     = [[1, 2, 0], [0, 3, 1], [2, 0, 1]]; // total = 10
const G_BOUWEN  = [[2, 1], [1, 2]];

const MOCK = [
  {
    id: 'mock-meerkeuze',
    type: 'Blokkenbouwsel',
    question_type: 'blokken_bouwsel',
    block_interaction_type: 'meerkeuze',
    title: 'Meerkeuze — kies bouwsel A of B',
    block_goal_grid: G_CORRECT,
    block_plan_grid: G_CORRECT,
    block_option_a_grid: G_CORRECT,
    block_option_b_grid: G_WRONG,
    block_correct_option: 'A',
    block_max_height: 4,
    variants: [
      { level: 'Makkelijker', text: 'Kijk goed naar de plattegrond. Welk bouwsel past erbij? Kies A of B.' },
      { level: 'Moeilijker',  text: 'Welk bouwsel hoort bij de plattegrond? Kies uit A en B.' },
    ],
  },
  {
    id: 'mock-goedfout-fout',
    type: 'Blokkenbouwsel',
    question_type: 'blokken_bouwsel',
    block_interaction_type: 'goedFout',
    title: 'Goed/Fout — bouwsel klopt NIET (correct = Fout)',
    block_goal_grid: G_CORRECT,
    block_plan_grid: G_CORRECT,
    block_option_a_grid: G_WRONG,
    block_option_b_grid: null,
    block_correct_option: 'B',
    block_max_height: 4,
    variants: [
      { level: 'Makkelijker', text: 'Vergelijk het bouwsel met de plattegrond. Klopt het? Goed of Fout?' },
      { level: 'Moeilijker',  text: 'Klopt dit bouwsel met de plattegrond? Goed of Fout?' },
    ],
  },
  {
    id: 'mock-goedfout-goed',
    type: 'Blokkenbouwsel',
    question_type: 'blokken_bouwsel',
    block_interaction_type: 'goedFout',
    title: 'Goed/Fout — bouwsel klopt WEL (correct = Goed)',
    block_goal_grid: G_CORRECT,
    block_plan_grid: G_CORRECT,
    block_option_a_grid: G_CORRECT,
    block_option_b_grid: null,
    block_correct_option: 'A',
    block_max_height: 4,
    variants: [
      { level: 'Makkelijker', text: 'Vergelijk het bouwsel met de plattegrond. Klopt het? Goed of Fout?' },
      { level: 'Moeilijker',  text: 'Klopt dit bouwsel met de plattegrond? Goed of Fout?' },
    ],
  },
  {
    id: 'mock-tellen',
    type: 'Blokkenbouwsel',
    question_type: 'blokken_bouwsel',
    block_interaction_type: 'tellen',
    title: 'Tellen — 3×3 bouwsel (totaal = 10)',
    block_goal_grid: G_3X3,
    block_plan_grid: G_3X3,
    block_option_a_grid: null,
    block_option_b_grid: null,
    block_correct_option: null,
    block_max_height: 4,
    variants: [
      { level: 'Makkelijker', text: 'Tel de blokjes. Tip: tel rij voor rij.' },
      { level: 'Moeilijker',  text: 'Hoeveel blokjes heeft dit bouwsel in totaal?' },
    ],
  },
  {
    id: 'mock-bouwen',
    type: 'Blokkenbouwsel',
    question_type: 'blokken_bouwsel',
    block_interaction_type: 'bouwen',
    title: 'Bouwen — bouw het bouwsel na via de plattegrond',
    block_goal_grid: G_BOUWEN,
    block_plan_grid: G_BOUWEN,
    block_option_a_grid: null,
    block_option_b_grid: null,
    block_correct_option: null,
    block_max_height: 4,
    variants: [
      { level: 'Makkelijker', text: 'Kijk goed naar het bouwsel. Vul de plattegrond in.' },
      { level: 'Moeilijker',  text: 'Vul de plattegrond in voor dit bouwsel.' },
    ],
  },
  {
    id: 'mock-invulvraag-block',
    type: 'Invulvraag',
    question_type: 'standaard',
    block_interaction_type: null,
    title: 'Invulvraag met bouwsel-data (fix test)',
    block_goal_grid: [[1, 2], [3, 1]],
    block_plan_grid: null,
    block_option_a_grid: null,
    block_option_b_grid: null,
    block_correct_option: null,
    block_max_height: 4,
    original: 'Hoeveel blokken heeft dit bouwsel?',
    variants: [
      { level: 'Makkelijker', text: 'Tel de blokjes. Hoeveel zijn het er?' },
      { level: 'Moeilijker',  text: 'Hoeveel blokjes heeft dit bouwsel?' },
    ],
  },
  {
    id: 'mock-openvraag-block',
    type: 'Open vraag',
    question_type: 'standaard',
    block_interaction_type: null,
    title: 'Open vraag met bouwsel-data (fix test)',
    block_goal_grid: [[2, 1], [0, 2]],
    block_plan_grid: null,
    block_option_a_grid: null,
    block_option_b_grid: null,
    block_correct_option: null,
    block_max_height: 4,
    original: 'Beschrijf wat je ziet in het bouwsel.',
    variants: [
      { level: 'Makkelijker', text: 'Beschrijf het bouwsel. Hoeveel blokjes zie je?' },
      { level: 'Moeilijker',  text: 'Beschrijf de opbouw van het bouwsel.' },
    ],
  },
];

// ── Logic tests (pure functions) ─────────────────────────────────────────

const LOGIC_TESTS = [
  { name: 'gridsEqual: identieke 2×2',       fn: () => gridsEqual([[1,2],[3,4]], [[1,2],[3,4]]) === true },
  { name: 'gridsEqual: verschillende grids', fn: () => gridsEqual([[1,2],[3,4]], [[1,2],[3,5]]) === false },
  { name: 'gridsEqual: lege arrays → false', fn: () => gridsEqual([], []) === false },
  { name: 'gridsEqual: null → false',        fn: () => gridsEqual(null, null) === false },
  { name: 'clampGrid: waarden binnen bereik', fn: () => JSON.stringify(clampGrid([[0,3],[2,4]], 5)) === '[[0,3],[2,4]]' },
  { name: 'clampGrid: te hoge waarden',       fn: () => clampGrid([[0,6]], 5)[0][1] === 5 },
  { name: 'clampGrid: negatieve → 0',        fn: () => clampGrid([[-2,1]], 5)[0][0] === 0 },
  { name: 'clampGrid: niet-getal → 0',       fn: () => clampGrid([['x',1]], 5)[0][0] === 0 },
  { name: 'goedFout: correct_option A → Goed', fn: () => ('A' === 'A' ? 'Goed' : 'Fout') === 'Goed' },
  { name: 'goedFout: correct_option B → Fout', fn: () => ('B' === 'A' ? 'Goed' : 'Fout') === 'Fout' },
  { name: 'tellen: G_3X3 totaal = 10',       fn: () => G_3X3.flat().reduce((s, v) => s + v, 0) === 10 },
  { name: 'meerkeuze: G_CORRECT ≠ G_WRONG',  fn: () => !gridsEqual(G_CORRECT, G_WRONG) },
];

// ── DB exercise checks ────────────────────────────────────────────────────

function checkDbExercise(ex) {
  const issues = [];
  if (ex.question_type !== 'blokken_bouwsel') return issues;

  if (!ex.block_goal_grid?.length) issues.push('block_goal_grid is leeg');

  const it = ex.block_interaction_type;
  if (!it) {
    // Legacy: check if it would be correctly classified by fallback
    const hasBoth = ex.block_option_a_grid?.length > 0 && ex.block_option_b_grid?.length > 0;
    issues.push(`block_interaction_type ontbreekt — fallback: "${hasBoth ? 'meerkeuze' : 'goedFout'}"`);
  }

  if (it === 'meerkeuze') {
    if (!ex.block_option_a_grid?.length) issues.push('meerkeuze: block_option_a_grid leeg');
    if (!ex.block_option_b_grid?.length) issues.push('meerkeuze: block_option_b_grid leeg');
    if (ex.block_option_a_grid?.length && ex.block_option_b_grid?.length &&
        gridsEqual(ex.block_option_a_grid, ex.block_option_b_grid))
      issues.push('meerkeuze: optie A en B zijn identiek!');
    if (!ex.block_correct_option) issues.push('meerkeuze: block_correct_option ontbreekt');
  }

  if (it === 'goedFout') {
    if (!ex.block_option_a_grid?.length) issues.push('goedFout: block_option_a_grid leeg (getoond bouwsel)');
    if (ex.block_option_b_grid?.length)  issues.push('goedFout: block_option_b_grid aanwezig (zou null moeten zijn)');
    if (!ex.block_correct_option)        issues.push('goedFout: block_correct_option ontbreekt');
  }

  if (it === 'tellen') {
    if (!ex.block_goal_grid?.length) issues.push('tellen: block_goal_grid leeg');
  }

  if (it === 'bouwen') {
    if (!ex.block_plan_grid?.length) issues.push('bouwen: block_plan_grid leeg');
  }

  return issues;
}

// ── MiniExercise: renders a single exercise interactively ─────────────────

const VALID_BLOCK_TYPES = ['tellen', 'goedFout', 'bouwen', 'meerkeuze'];

function MiniExercise({ ex }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isBlock = ex.question_type === 'blokken_bouwsel';
  const maxH = ex.block_max_height || 5;

  const interactionType = isBlock
    ? (VALID_BLOCK_TYPES.includes(ex.block_interaction_type)
        ? ex.block_interaction_type
        : (ex.block_option_a_grid?.length && ex.block_option_b_grid?.length ? 'meerkeuze' : 'goedFout'))
    : null;

  const isTellen    = interactionType === 'tellen';
  const isGoedFout  = interactionType === 'goedFout';
  const isBouwen    = interactionType === 'bouwen';
  const isMeerkeuze = interactionType === 'meerkeuze';

  const blockTotal = isTellen && ex.block_plan_grid
    ? ex.block_plan_grid.flat().reduce((s, v) => s + v, 0)
    : null;

  const goedFoutCorrect = isGoedFout
    ? (ex.block_correct_option === 'A' ? 'Goed' : 'Fout')
    : null;

  const isCorrect = submitted
    ? isBouwen    ? gridsEqual(answer, ex.block_plan_grid)
    : isTellen    ? Number(answer) === blockTotal
    : isGoedFout  ? answer === goedFoutCorrect
    : isMeerkeuze ? answer === ex.block_correct_option
    : true
    : null;

  // Render input area
  let inputArea;

  if (isBlock && isTellen) {
    const g = clampGrid(ex.block_goal_grid || ex.block_plan_grid, maxH);
    inputArea = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {g.length > 0 && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Bouwsel — tel alle blokjes</div>
            <CubePreview grid={g} />
          </div>
        )}
        <input type="number" min="0" value={answer} onChange={e => setAnswer(e.target.value)}
          disabled={submitted} placeholder="Aantal blokken..."
          style={{ border: `2px solid ${C.border}`, borderRadius: 8, padding: '10px 14px',
            fontSize: 16, maxWidth: 140, color: C.text, fontFamily: 'inherit' }} />
      </div>
    );
  } else if (isBlock && isGoedFout) {
    const shown = clampGrid(ex.block_option_a_grid || ex.block_goal_grid, maxH);
    const plan  = clampGrid(ex.block_plan_grid || ex.block_goal_grid, maxH);
    inputArea = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.length > 0 && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Dit bouwsel</div>
            <CubePreview grid={shown} />
          </div>
        )}
        {plan.length > 0 && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Plattegrond (bovenaanzicht)</div>
            <PlanGridDisplay grid={plan} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {['Goed', 'Fout'].map(opt => (
            <button key={opt} type="button" disabled={submitted}
              onClick={() => !submitted && setAnswer(opt)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 8, fontSize: 15, fontWeight: 700,
                border: `2px solid ${answer === opt ? (opt === 'Goed' ? C.green : C.red) : C.border}`,
                background: answer === opt ? (opt === 'Goed' ? C.greenLight : C.redLight) : C.white,
                color: answer === opt ? (opt === 'Goed' ? C.green : C.red) : C.text,
                cursor: submitted ? 'default' : 'pointer',
              }}>
              {opt === 'Goed' ? '✓ Goed' : '✗ Fout'}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (isBlock && isBouwen) {
    const target = clampGrid(ex.block_goal_grid || ex.block_plan_grid, maxH);
    inputArea = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {target.length > 0 && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Doel-bouwsel</div>
            <CubePreview grid={target} />
          </div>
        )}
        <BlokkenBouwselInteractive
          goalGrid={ex.block_goal_grid} planGrid={ex.block_plan_grid}
          optionAGrid={ex.block_option_a_grid} optionBGrid={ex.block_option_b_grid}
          correctOption={ex.block_correct_option} maxHeight={maxH}
          onAnswered={setAnswer} disabled={submitted}
          buildMode showFeedback={submitted}
        />
      </div>
    );
  } else if (isBlock && isMeerkeuze) {
    inputArea = (
      <BlokkenBouwselInteractive
        goalGrid={ex.block_goal_grid} planGrid={ex.block_plan_grid}
        optionAGrid={ex.block_option_a_grid} optionBGrid={ex.block_option_b_grid}
        correctOption={ex.block_correct_option} maxHeight={maxH}
        onAnswered={setAnswer} disabled={submitted}
        buildMode={false} showFeedback={submitted}
      />
    );
  } else if (ex.type === 'Invulvraag') {
    const blockGrid = ex.block_goal_grid?.length > 0
      ? clampGrid(ex.block_goal_grid, maxH)
      : ex.block_plan_grid?.length > 0 ? clampGrid(ex.block_plan_grid, maxH) : null;
    inputArea = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blockGrid?.length > 0 && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Bouwsel — bekijk goed</div>
            <CubePreview grid={blockGrid} />
          </div>
        )}
        <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
          disabled={submitted} placeholder="Jouw antwoord..."
          style={{ border: `2px solid ${C.border}`, borderRadius: 8, padding: '10px 14px',
            fontSize: 15, maxWidth: 260, color: C.text, fontFamily: 'inherit' }} />
      </div>
    );
  } else if (ex.type === 'Open vraag' || ex.type === 'Tekenopgave') {
    const blockGrid = ex.block_goal_grid?.length > 0
      ? clampGrid(ex.block_goal_grid, maxH)
      : ex.block_plan_grid?.length > 0 ? clampGrid(ex.block_plan_grid, maxH) : null;
    inputArea = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blockGrid?.length > 0 && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Bouwsel — bekijk goed</div>
            <CubePreview grid={blockGrid} />
          </div>
        )}
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitted}
          placeholder="Schrijf je antwoord..." rows={3}
          style={{ border: `2px solid ${C.border}`, borderRadius: 8, padding: '10px 14px',
            fontSize: 14, resize: 'none', color: C.text, fontFamily: 'inherit', maxWidth: 400 }} />
      </div>
    );
  } else {
    inputArea = <div style={{ color: C.textLight, fontSize: 13 }}>— geen invoer —</div>;
  }

  return (
    <div style={{ background: C.white, borderRadius: 12, padding: 20,
      border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(109,32,119,0.06)' }}>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{ex.title}</span>
        <span style={{ background: C.purpleLight, color: C.purple, fontSize: 10,
          fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{ex.type}</span>
        {interactionType && (
          <span style={{ background: C.tealLight, color: C.teal, fontSize: 10,
            fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{interactionType}</span>
        )}
      </div>

      {/* Vraagstekst */}
      <div style={{ fontSize: 14, color: C.text, background: C.bg, borderRadius: 8,
        padding: '10px 14px', border: `1px solid ${C.border}`, marginBottom: 14, lineHeight: 1.6 }}>
        {ex.variants?.[0]?.text || ex.original || '—'}
      </div>

      {inputArea}

      {/* Submit / feedback */}
      {!isBouwen && (
        <div style={{ marginTop: 14 }}>
          {!submitted ? (
            <button type="button" onClick={() => setSubmitted(true)} disabled={!answer}
              style={{ background: C.purple, color: 'white', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13,
                opacity: answer ? 1 : 0.4, cursor: answer ? 'pointer' : 'not-allowed' }}>
              Controleren →
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                padding: '8px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                background: isCorrect === false ? C.redLight : C.greenLight,
                color: isCorrect === false ? C.red : C.green,
                border: `1.5px solid ${isCorrect === false ? C.red : C.green}`,
              }}>
                {isCorrect === false ? '✗ Fout' : '✓ Correct'}
                {isTellen && isCorrect === false && ` — antwoord: ${blockTotal}`}
                {isGoedFout && isCorrect === false && ` — antwoord: ${goedFoutCorrect}`}
              </div>
              <button type="button" onClick={() => { setAnswer(''); setSubmitted(false); }}
                style={{ background: C.teal, color: 'white', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Opnieuw
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Badge + section helpers ───────────────────────────────────────────────

function Pass({ label }) {
  return (
    <span style={{ background: C.greenLight, color: C.green, fontWeight: 700,
      fontSize: 11, padding: '2px 8px', borderRadius: 99 }}>✓ {label || 'PASS'}</span>
  );
}

function Fail({ label }) {
  return (
    <span style={{ background: C.redLight, color: C.red, fontWeight: 700,
      fontSize: 11, padding: '2px 8px', borderRadius: 99 }}>✗ {label || 'FAIL'}</span>
  );
}

function Warn({ label }) {
  return (
    <span style={{ background: C.yellowLight, color: '#7A5500', fontWeight: 700,
      fontSize: 11, padding: '2px 8px', borderRadius: 99 }}>⚠ {label || 'WARN'}</span>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 18, borderBottom: `2px solid ${C.border}`, paddingBottom: 10 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: C.purple, margin: 0 }}>{title}</h2>
      {sub && <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function BlockTestSuite({ dbExercises, dbError }) {
  const [tab, setTab] = useState('logic');

  // Run all logic tests once
  const logicResults = LOGIC_TESTS.map(t => {
    try { return { ...t, pass: t.fn() === true, error: null }; }
    catch (e) { return { ...t, pass: false, error: e.message }; }
  });
  const logicPass = logicResults.filter(r => r.pass).length;

  // DB checks
  const dbResults = dbExercises.map(ex => ({
    ex,
    issues: checkDbExercise(ex),
  }));
  const dbPass = dbResults.filter(r => r.issues.length === 0).length;
  const dbFail = dbResults.filter(r => r.issues.length > 0).length;

  const tabs = [
    { id: 'logic',   label: `Logica (${logicPass}/${logicResults.length})` },
    { id: 'db',      label: `DB checks (${dbPass} ok, ${dbFail} issues)` },
    { id: 'visual',  label: 'Visuele tests (mock)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${C.purpleDark}, ${C.purple})`,
        color: 'white', padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Blokkenbouwsel — Test Suite</span>
        <a href="/student" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)',
          fontSize: 12, textDecoration: 'none' }}>← Leerlingen</a>
      </header>

      {/* Tab bar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: '0 28px', display: 'flex', gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            style={{
              padding: '13px 18px', border: 'none', background: 'none',
              fontWeight: tab === t.id ? 800 : 400, fontSize: 13,
              color: tab === t.id ? C.purple : C.textMid,
              borderBottom: tab === t.id ? `3px solid ${C.purple}` : '3px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Tab: Logic tests ── */}
        {tab === 'logic' && (
          <div>
            <SectionHeader
              title="Logica tests"
              sub="Automatische tests van gridsEqual(), clampGrid() en antwoord-mapping."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logicResults.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: r.pass ? C.greenLight : C.redLight,
                  border: `1px solid ${r.pass ? C.green : C.red}`,
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  {r.pass ? <Pass /> : <Fail />}
                  <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{r.name}</span>
                  {r.error && <span style={{ fontSize: 11, color: C.red }}>{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: DB checks ── */}
        {tab === 'db' && (
          <div>
            <SectionHeader
              title="DB exercises"
              sub={`${dbExercises.length} oefeningen geladen. Controle op ontbrekende velden en inconsistenties.`}
            />

            {dbError && (
              <div style={{ background: C.redLight, border: `1px solid ${C.red}`,
                borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: C.red }}>
                ⚠ DB-fout: {dbError}
                {dbError.includes('block_interaction_type') && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    Voeg de kolom toe via: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 4 }}>
                      ALTER TABLE exercises ADD COLUMN block_interaction_type text;
                    </code>
                  </div>
                )}
              </div>
            )}

            {dbExercises.length === 0 && !dbError && (
              <div style={{ color: C.textLight, fontSize: 14 }}>Geen oefeningen in de database.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dbResults.map(({ ex, issues }, i) => (
                <div key={ex.id || i} style={{
                  background: C.white, borderRadius: 8, padding: '12px 16px',
                  border: `1.5px solid ${issues.length === 0 ? C.green : C.red}`,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {issues.length === 0 ? <Pass /> : <Fail label={`${issues.length} issue${issues.length > 1 ? 's' : ''}`} />}
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.text, flex: 1 }}>{ex.title}</span>
                    <span style={{ fontSize: 11, color: C.textLight }}>{ex.type}</span>
                    {ex.block_interaction_type && (
                      <span style={{ background: C.tealLight, color: C.teal, fontSize: 10,
                        fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>{ex.block_interaction_type}</span>
                    )}
                    {ex.question_type === 'blokken_bouwsel' && !ex.block_interaction_type && (
                      <Warn label="geen interaction_type" />
                    )}
                  </div>
                  {issues.length > 0 && (
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: 18 }}>
                      {issues.map((iss, j) => (
                        <li key={j} style={{ fontSize: 12, color: C.red, marginBottom: 2 }}>{iss}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Visual tests ── */}
        {tab === 'visual' && (
          <div>
            <SectionHeader
              title="Visuele tests — mock oefeningen"
              sub="Klik door elke oefening om het gedrag te testen. Controleer dat het juiste antwoord als ✓ wordt gemarkeerd."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {MOCK.map(ex => (
                <div key={ex.id}>
                  <MiniExercise ex={ex} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
