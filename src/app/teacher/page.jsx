'use client';

import { useState, useCallback, useRef } from 'react';
import { C, TYPE_COLORS, confColor } from '@/lib/colors';
import { DEMO_EXERCISES } from '@/lib/demo-data';
import { extractPdfPages, extractImageFile } from '@/lib/pdf-extract';
import { ExerciseIllustration } from '@/components/illustrations';
import { BlokkenBouwselInteractive, CubePreview, PlanGridDisplay, clampGrid } from '@/components/blokken-bouwsel';

// ── Tiny helpers ──────────────────────────────────────────────────────
const Badge = ({ label, bg, color, small }) => (
  <span style={{ background: bg, color, fontSize: small ? 10 : 11, fontWeight: 700,
    padding: small ? '2px 6px' : '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
    {label}
  </span>
);

const SL = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 800, color: C.textLight, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 8, marginTop: 4 }}>{children}</div>
);

const IB = ({ children }) => (
  <div style={{ background: C.purpleBg, borderRadius: 8, padding: 12, marginBottom: 10 }}>{children}</div>
);

const ZwijsenLogo = ({ size = 14 }) => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
    {[['z', C.orange], ['w', C.red], ['ij', C.blue], ['s', C.yellow], ['e', C.green], ['n', C.teal]].map(([l, bg]) => (
      <span key={l} style={{ background: bg, color: 'white', fontWeight: 900, fontSize: size,
        padding: `${Math.round(size * 0.15)}px ${Math.round(size * 0.42)}px`, borderRadius: 3 }}>
        {l}
      </span>
    ))}
  </div>
);

// ── Steps ─────────────────────────────────────────────────────────────
const STEPS = ['Bestanden uploaden', 'AI verwerkt', 'Beoordelen', 'Klaar'];
const PROC = [
  "Bestanden analyseren en pagina's/afbeeldingen extraheren",
  'Tekst per pagina extraheren',
  'Oefeningen herkennen en vraagtypes detecteren',
  'Interactieve varianten genereren',
];

// ── Student Preview Modal ─────────────────────────────────────────────
function StudentPreview({ exercise, onClose }) {
  const [phase, setPhase]       = useState('easy');
  const [answer, setAnswer]     = useState('');
  const [mathAnswers, setMathAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const easyVariant = exercise.variants?.[0];
  const hardVariant = exercise.variants?.[1];
  const hasVariants = !!(easyVariant && hardVariant);

  const MATH_TYPES = ['vul_in', 'goed_fout', 'vermenigvuldig_tabel'];
  const isMathType = MATH_TYPES.includes(exercise.question_type);
  const activeRekensomData = isMathType
    ? ((phase === 'hard' ? hardVariant?.rekensom_data : easyVariant?.rekensom_data) ?? exercise.rekensom_data)
    : null;

  const isBlockQuestion = exercise.question_type === 'blokken_bouwsel';
  const VALID_BLOCK_TYPES = ['tellen', 'goedFout', 'bouwen', 'meerkeuze'];
  const blockInteractionType = isBlockQuestion
    ? (VALID_BLOCK_TYPES.includes(exercise.block_interaction_type)
        ? exercise.block_interaction_type
        : (exercise.block_option_a_grid?.length && exercise.block_option_b_grid?.length
            ? 'meerkeuze'
            : 'goedFout'))
    : null;
  const isHardVariant = phase === 'hard';
  const activeBlockInteractionType = isBlockQuestion && isHardVariant
    ? 'bouwen'
    : blockInteractionType;
  const isBuildMode    = activeBlockInteractionType === 'bouwen';
  const isTellenMode   = activeBlockInteractionType === 'tellen';
  const isGoedFoutMode = activeBlockInteractionType === 'goedFout';
  const isMeerkeuzMode = activeBlockInteractionType === 'meerkeuze';
  const maxH = exercise.block_max_height || 5;

  const questionText = hasVariants
    ? (phase === 'hard' ? hardVariant.text : easyVariant.text)
    : exercise.original;

  const blockTotalCount = isTellenMode && exercise.block_plan_grid
    ? exercise.block_plan_grid.flat().reduce((s, v) => s + v, 0) : null;
  const goedFoutCorrect = isGoedFoutMode
    ? (exercise.block_correct_option === 'A' ? 'Goed' : 'Fout') : null;

  const handleSubmit = () => setSubmitted(true);
  const handleNextLevel = () => { setAnswer(''); setMathAnswers({}); setSubmitted(false); setPhase('hard'); };
  const handleDone = () => setPhase('done');

  const renderInput = () => {

    // ── Vul in ──
    if (exercise.question_type === 'vul_in' && activeRekensomData?.sommen) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeRekensomData.sommen.map((som, i) => {
            const parts = som.tekst.split('___');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
                background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 14px' }}>
                <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700 }}>{parts[0]}</span>
                <input type="number" value={mathAnswers[i] ?? ''} disabled={submitted}
                  onChange={e => setMathAnswers(p => ({ ...p, [i]: e.target.value }))}
                  placeholder="?" style={{ width: 64, fontSize: 18, fontWeight: 700, textAlign: 'center',
                    border: `2px solid ${C.purple}`, borderRadius: 6, padding: '4px', fontFamily: 'monospace' }} />
                {parts[1] && <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700 }}>{parts[1]}</span>}
                {submitted && <span style={{ fontSize: 12, color: Number(mathAnswers[i]) === som.antwoord ? C.green : C.red, fontWeight: 700 }}>
                  {Number(mathAnswers[i]) === som.antwoord ? '✓' : `→ ${som.antwoord}`}
                </span>}
              </div>
            );
          })}
        </div>
      );
    }

    // ── Goed/Fout ──
    if (exercise.question_type === 'goed_fout' && activeRekensomData?.stellingen) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeRekensomData.stellingen.map((s, i) => (
            <div key={i} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, marginBottom: 8 }}>{s.tekst}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Goed', 'Fout'].map(opt => (
                  <button key={opt} type="button" disabled={submitted}
                    onClick={() => !submitted && setMathAnswers(p => ({ ...p, [i]: opt }))}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 7, fontSize: 14, fontWeight: 700,
                      border: `2px solid ${mathAnswers[i] === opt ? (opt === 'Goed' ? C.green : C.red) : C.border}`,
                      background: mathAnswers[i] === opt ? (opt === 'Goed' ? C.greenLight : C.redLight) : C.white,
                      color: mathAnswers[i] === opt ? (opt === 'Goed' ? C.green : C.red) : C.text,
                      cursor: submitted ? 'default' : 'pointer' }}>
                    {opt === 'Goed' ? '✓ Goed' : '✗ Fout'}
                  </button>
                ))}
              </div>
              {submitted && <div style={{ fontSize: 12, marginTop: 6, color: (mathAnswers[i] === 'Goed') === s.klopt ? C.green : C.red, fontWeight: 700 }}>
                {(mathAnswers[i] === 'Goed') === s.klopt ? '✓ Correct' : `Antwoord: ${s.klopt ? 'Goed' : 'Fout'}`}
              </div>}
            </div>
          ))}
        </div>
      );
    }

    // ── Vermenigvuldig-tabel ──
    if (exercise.question_type === 'vermenigvuldig_tabel' && activeRekensomData?.rijen) {
      const { operator, factor, rijen } = activeRekensomData;
      let bi = 0;
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>
            <thead><tr>
              <td style={{ background: C.purple, color: 'white', textAlign: 'center', padding: '6px 12px', borderRadius: 5 }}>{operator}</td>
              {rijen.map((r, i) => <td key={i} style={{ background: C.purpleLight, color: C.purpleDark, textAlign: 'center', padding: '6px 12px', borderRadius: 5 }}>{r.getal}</td>)}
            </tr></thead>
            <tbody><tr>
              <td style={{ background: C.purpleLight, color: C.purpleDark, textAlign: 'center', padding: '6px 12px', borderRadius: 5 }}>{factor}</td>
              {rijen.map((r, i) => {
                if (r.uitkomst !== null) return <td key={i} style={{ background: C.bg, textAlign: 'center', padding: '6px 12px', borderRadius: 5 }}>{r.uitkomst}</td>;
                const idx = bi++;
                return (
                  <td key={i} style={{ border: `2px solid ${C.purple}`, borderRadius: 5, textAlign: 'center', padding: 3 }}>
                    <input type="number" value={mathAnswers[idx] ?? ''} disabled={submitted}
                      onChange={e => setMathAnswers(p => ({ ...p, [idx]: e.target.value }))}
                      placeholder="?" style={{ width: 48, fontSize: 16, fontWeight: 700, textAlign: 'center', border: 'none', background: 'transparent', fontFamily: 'monospace' }} />
                    {submitted && <div style={{ fontSize: 10, color: Number(mathAnswers[idx]) === r.antwoord ? C.green : C.red }}>
                      {Number(mathAnswers[idx]) === r.antwoord ? '✓' : `→${r.antwoord}`}
                    </div>}
                  </td>
                );
              })}
            </tr></tbody>
          </table>
        </div>
      );
    }

    if (isBlockQuestion && isTellenMode) {
      const displayGrid = clampGrid(
        exercise.block_goal_grid || exercise.block_plan_grid || exercise.block_option_a_grid, maxH);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayGrid.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>Bouwsel — tel alle blokjes</div>
              <CubePreview grid={displayGrid} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, color: C.textMid }}>Aantal blokken:</label>
            <input type="number" min="0" value={answer} onChange={e => setAnswer(e.target.value)}
              disabled={submitted} placeholder="Voer het aantal in..."
              style={{ border: `2px solid ${submitted ? C.green : C.border}`, borderRadius: 8,
                padding: '10px 14px', fontSize: 16, maxWidth: 140, color: C.text,
                background: submitted ? C.greenLight : C.white, fontFamily: 'inherit' }} />
          </div>
        </div>
      );
    }

    if (isBlockQuestion && isGoedFoutMode) {
      const shownGrid = clampGrid(exercise.block_option_a_grid || exercise.block_goal_grid, maxH);
      const planGrid  = clampGrid(exercise.block_plan_grid || exercise.block_goal_grid, maxH);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shownGrid.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>Dit bouwsel</div>
              <CubePreview grid={shownGrid} />
            </div>
          )}
          {planGrid.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>Plattegrond (bovenaanzicht)</div>
              <PlanGridDisplay grid={planGrid} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {['Goed', 'Fout'].map(opt => (
              <button key={opt} type="button" disabled={submitted}
                onClick={() => !submitted && setAnswer(opt)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, fontSize: 15, fontWeight: 700,
                  border: `2px solid ${answer === opt ? (opt === 'Goed' ? C.green : C.red) : C.border}`,
                  background: answer === opt ? (opt === 'Goed' ? C.greenLight : C.redLight) : C.white,
                  color: answer === opt ? (opt === 'Goed' ? C.green : C.red) : C.text,
                  cursor: submitted ? 'default' : 'pointer' }}>
                {opt === 'Goed' ? '✓ Goed' : '✗ Fout'}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (isBlockQuestion && isBuildMode) {
      const targetGrid = clampGrid(exercise.block_goal_grid || exercise.block_plan_grid, maxH);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {targetGrid.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>
                Dit bouwsel moet je nabouwen — vul hieronder de plattegrond in
              </div>
              <CubePreview grid={targetGrid} />
            </div>
          )}
          <BlokkenBouwselInteractive
            goalGrid={exercise.block_goal_grid}
            planGrid={exercise.block_plan_grid}
            optionAGrid={exercise.block_option_a_grid}
            optionBGrid={exercise.block_option_b_grid}
            correctOption={exercise.block_correct_option}
            maxHeight={maxH}
            onAnswered={(val) => setAnswer(val)}
            disabled={submitted}
            buildMode
            showPlanHint={false}
            showFeedback={submitted}
          />
        </div>
      );
    }

    if (isBlockQuestion && isMeerkeuzMode) return (
      <BlokkenBouwselInteractive
        goalGrid={exercise.block_goal_grid}
        planGrid={exercise.block_plan_grid}
        optionAGrid={exercise.block_option_a_grid}
        optionBGrid={exercise.block_option_b_grid}
        correctOption={exercise.block_correct_option}
        maxHeight={maxH}
        sourceImageDataUrl={exercise.source_page_image_data_url}
        showSourceImage
        buildMode={false}
      />
    );

    if (exercise.type === 'Invulvraag') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 13, color: C.textMid }}>Jouw antwoord:</label>
        <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
          disabled={submitted} placeholder="Typ hier je antwoord..."
          style={{ border: `2px solid ${submitted ? C.green : C.border}`, borderRadius: 8,
            padding: '10px 14px', fontSize: 16, width: 220, color: C.text,
            background: submitted ? C.greenLight : C.white, fontFamily: 'inherit' }} />
      </div>
    );

    if (exercise.type === 'Open vraag' || exercise.type === 'Tekenopgave') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 13, color: C.textMid }}>Jouw antwoord:</label>
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitted}
          placeholder="Schrijf je antwoord hier..." rows={4}
          style={{ border: `2px solid ${submitted ? C.green : C.border}`, borderRadius: 8,
            padding: '10px 14px', fontSize: 14, resize: 'none', color: C.text, fontFamily: 'inherit' }} />
      </div>
    );

    if (exercise.type === 'Meerkeuze') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Antwoord A', 'Antwoord B', 'Antwoord C', 'Antwoord D'].map((opt, i) => (
          <button key={i} onClick={() => !submitted && setAnswer(opt)} disabled={submitted}
            style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 8, fontSize: 14,
              border: `2px solid ${answer === opt ? C.purple : C.border}`,
              background: answer === opt ? C.purpleLight : C.white, color: C.text,
              fontWeight: answer === opt ? 600 : 400 }}>
            {String.fromCharCode(65 + i)}. {opt}
          </button>
        ))}
      </div>
    );

    if (exercise.type === 'Manipulatieopdracht') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 13, color: C.textMid }}>Jouw antwoord:</label>
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitted}
          placeholder="Beschrijf wat je hebt gedaan..." rows={3}
          style={{ border: `2px solid ${submitted ? C.green : C.border}`, borderRadius: 8,
            padding: '10px 14px', fontSize: 14, resize: 'none', color: C.text, fontFamily: 'inherit' }} />
      </div>
    );

    return null;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
      onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, width: 560, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: C.yellow, padding: '13px 20px', borderRadius: '16px 16px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ZwijsenLogo size={12} />
            <span style={{ fontWeight: 700, fontSize: 12, color: C.text }}>Leerlingweergave</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: C.text }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Topic + pagina badge */}
          <div style={{ background: C.yellow, display: 'inline-block', padding: '4px 12px',
            borderRadius: 6, fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 14 }}>
            Pagina {exercise.page} · {exercise.topic}
          </div>

          {/* Niveau-indicator (alleen als er varianten zijn) */}
          {hasVariants && phase !== 'done' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <div style={{
                background: phase === 'easy' ? C.greenLight : '#f0f0f0',
                color: phase === 'easy' ? C.green : C.textLight,
                border: `1.5px solid ${phase === 'easy' ? C.green : '#ddd'}`,
                borderRadius: 99, padding: '4px 14px', fontSize: 11, fontWeight: 700,
              }}>① Makkelijker</div>
              <div style={{
                background: phase === 'hard' ? C.pinkLight : '#f0f0f0',
                color: phase === 'hard' ? C.pink : C.textLight,
                border: `1.5px solid ${phase === 'hard' ? C.pink : '#ddd'}`,
                borderRadius: 99, padding: '4px 14px', fontSize: 11, fontWeight: 700,
              }}>② Moeilijker</div>
            </div>
          )}

          {/* Klaar-scherm */}
          {phase === 'done' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green, marginBottom: 8 }}>Super gedaan!</div>
              <div style={{ fontSize: 14, color: C.textMid, marginBottom: 24 }}>
                Je hebt beide niveaus afgerond!
              </div>
              <button onClick={onClose} style={{ background: C.purple, color: 'white', border: 'none',
                borderRadius: 8, padding: '12px 32px', fontWeight: 700, fontSize: 14 }}>
                Sluiten
              </button>
            </div>
          ) : (
            <>
              {/* Vraagstekst */}
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 20,
                lineHeight: 1.6, background: C.bg, borderRadius: 10, padding: '14px 16px',
                border: `1px solid ${C.border}` }}>
                {questionText}
              </div>

              {/* Invoerveld op basis van vraagtype */}
              {renderInput()}

              {/* Antwoord controleren / feedback */}
              {!submitted ? (
                <button onClick={handleSubmit}
                  disabled={isMathType ? Object.keys(mathAnswers).length === 0 : !answer}
                  style={{ marginTop: 20, background: C.purple, color: 'white', border: 'none',
                    borderRadius: 8, padding: '11px 28px', fontWeight: 700, fontSize: 14,
                    opacity: (isMathType ? Object.keys(mathAnswers).length > 0 : !!answer) ? 1 : 0.45,
                    cursor: (isMathType ? Object.keys(mathAnswers).length > 0 : !!answer) ? 'pointer' : 'not-allowed' }}>
                  Antwoord controleren →
                </button>
              ) : (
                <div style={{ marginTop: 20 }}>
                  <div style={{ background: C.greenLight, borderRadius: 10, padding: '12px 16px',
                    border: `1.5px solid ${C.green}`, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>✓ Goed gedaan!</div>
                    <div style={{ fontSize: 13, color: C.text }}>
                      {phase === 'easy' && hasVariants
                        ? 'Klaar voor de moeilijkere versie?'
                        : 'Je hebt de oefening afgerond.'}
                    </div>
                  </div>

                  {phase === 'easy' && hasVariants && (
                    <button onClick={handleNextLevel}
                      style={{ background: `linear-gradient(135deg, ${C.pink}, #A0004A)`, color: 'white',
                        border: 'none', borderRadius: 8, padding: '11px 28px', fontWeight: 700, fontSize: 14 }}>
                      Moeilijkere versie proberen →
                    </button>
                  )}

                  {phase === 'hard' && (
                    <button onClick={handleDone}
                      style={{ background: C.green, color: 'white', border: 'none',
                        borderRadius: 8, padding: '11px 28px', fontWeight: 700, fontSize: 14 }}>
                      🎉 Afronden
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────
export default function EduUpcycleApp() {
  // State
  const [step, setStep]             = useState(0);
  const [files, setFiles]           = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [procIdx, setProcIdx]       = useState(-1);
  const [procMsg, setProcMsg]       = useState('');
  const [exercises, setExercises]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingType, setEditingType] = useState(false);
  const [editedType, setEditedType]   = useState('');
  const [previewEx, setPreviewEx]     = useState(null);
  const [mode, setMode]               = useState(null); // 'ai' | 'demo'
  const [pageImages, setPageImages]   = useState({});   // { page: dataUrl }
  const [error, setError]             = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [savedLinks, setSavedLinks]   = useState([]);   // [{ id, title }] na Supabase-opslag
  const [saving, setSaving]           = useState(false);
  const fileInputRef = useRef(null);

  const selected  = exercises.find(e => e.id === selectedId);
  const approved  = exercises.filter(e => e.status === 'approved').length;
  const allDone   = exercises.every(e => e.status !== null) && exercises.length > 0;
  const tc        = TYPE_COLORS[selected?.type] ?? { bg: C.purpleLight, text: C.purple };

  // ── File handling ───────────────────────────────────────────────────
  const handleFiles = useCallback((newFiles) => {
    const accepted = Array.from(newFiles).filter(
      f => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    if (accepted.length === 0) {
      setError('Selecteer PDF-, PNG- of JPG-bestanden.');
      return;
    }
    setFiles(prev => [...prev, ...accepted]);
    setError(null);
  }, []);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ── Upload & process ────────────────────────────────────────────────
  const doProcess = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setStep(1);
    setError(null);

    try {
      // Stap 1 & 2: extractie (client-side)
      setProcIdx(0);
      setProcMsg(`${files.length} bestand(en) laden…`);

      let allPages = [];
      for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi];
        setProcMsg(`Pagina's extraheren: ${file.name}…`);
        setProcIdx(0);
        const pages = file.type === 'application/pdf'
          ? await extractPdfPages(file)
          : await extractImageFile(file);
        // Bewaar pagina-afbeeldingen
        const imgMap = {};
        pages.forEach(p => { imgMap[`${file.name}-p${p.page}`] = p.imageDataUrl; });
        setPageImages(prev => ({ ...prev, ...imgMap }));

        allPages.push(...pages.map(p => ({
          ...p,
          fileName: file.name,
          pageKey: `${file.name}-p${p.page}`,
        })));
      }

      setProcIdx(1);
      setProcMsg(`${allPages.length} pagina('s) geëxtraheerd`);
      await new Promise(r => setTimeout(r, 400));

      // Stap 3: AI analyse — in chunks van CHUNK_SIZE pagina's
      // Grote werkboeken (rekenen/taal/lezen) bevatten honderden pagina's;
      // één grote request zou de Groq context-limiet overschrijden.
      const CHUNK_SIZE = 4;

      // Bewaar pagina's met tekst (PDF) of een vision-afbeelding (PNG/JPG).
      // Afbeeldingsbestanden hebben geen tekst maar wél aiImageDataUrl.
      let sourcePages = allPages.filter(
        p => (p.text && p.text.trim().length > 30) || p.aiImageDataUrl
      );
      if (sourcePages.length === 0) sourcePages = allPages.slice(0, CHUNK_SIZE);

      const pageChunks = [];
      for (let i = 0; i < sourcePages.length; i += CHUNK_SIZE) {
        pageChunks.push(sourcePages.slice(i, i + CHUNK_SIZE));
      }
      if (pageChunks.length === 0) pageChunks.push(allPages.slice(0, CHUNK_SIZE));

      setProcIdx(2);
      let allExercises = [];
      let resultMode = 'ai';

            // 5 seconden wachten tussen chunks: gratis tier = max 15 req/min
      const CHUNK_DELAY_MS = 5000;
      let rateLimitHits = 0;

      for (let ci = 0; ci < pageChunks.length; ci++) {
        const chunk = pageChunks[ci];
        const p1 = chunk[0].page;
        const p2 = chunk[chunk.length - 1].page;

        if (ci > 0) {
          setProcMsg(`Even wachten (rate limit)… pagina's ${p1}–${p2} volgt zo`);
          setProcMsg(`Even wachten… pagina's ${p1}–${p2} volgt zo`);
          await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
        }

        setProcMsg(`AI analyseert pagina's ${p1}–${p2} (deel ${ci + 1} van ${pageChunks.length})…`);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pages: chunk.map(p => ({
              page: p.page,
              text: p.text,
              fileName: p.fileName,
              aiImageDataUrl: p.aiImageDataUrl || null,
            })),
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          if (err.error === 'NO_API_KEY') {
            setProcMsg('Geen API key gevonden — demo-modus laden…');
            await new Promise(r => setTimeout(r, 600));
            allExercises = DEMO_EXERCISES;
            resultMode = 'demo';
            break;
          } else if (err.error === 'CONTEXT_TOO_LONG') {
            setProcMsg(`Pagina's ${p1}–${p2} te lang voor AI — overgeslagen`);
            await new Promise(r => setTimeout(r, 800));
          } else if (err.error === 'RATE_LIMIT') {
            // Extra wachttijd en opnieuw proberen
            setProcMsg(`Rate limit bereikt — 15 seconden wachten…`);
            await new Promise(r => setTimeout(r, 15000));
            rateLimitHits++;
            if (rateLimitHits >= 3) {
              // Quota op — val terug op demo-modus
              setProcMsg('Dagelijkse quota bereikt — demo-modus laden…');
              await new Promise(r => setTimeout(r, 800));
              allExercises = DEMO_EXERCISES;
              resultMode = 'demo';
              break;
            }
            setProcMsg(`Rate limit — 20 seconden wachten (${rateLimitHits}/3)…`);
            await new Promise(r => setTimeout(r, 20000));
            ci--; // zelfde chunk opnieuw
          } else {
            throw new Error(err.message || `API fout bij pagina's ${p1}–${p2}`);
          }
        } else {
          rateLimitHits = 0; // succesvolle aanroep reset de teller
          const chunkResult = await response.json();
          allExercises.push(...(chunkResult.exercises || []));
          resultMode = chunkResult.mode || 'ai';
        }
      }
      setProcIdx(3);
      setProcMsg(`${allExercises.length} oefeningen gevonden!`);
      await new Promise(r => setTimeout(r, 600));

      // Klaar → naar review stap
      const pageImageByFileAndPage = new Map(
        allPages.map((p) => [`${p.fileName}-p${p.page}`, p.imageDataUrl])
      );

      setProcIdx(4);
      setExercises(allExercises.map((ex, i) => {
        const imageKey = `${ex.fileName}-p${ex.page}`;
        return {
          ...ex,
          id: i + 1,
          status: null,
          source_page_image_data_url: pageImageByFileAndPage.get(imageKey) || null,
        };
      }));
      setMode(resultMode);
      setSelectedId(1);
      setStep(2);

    } catch (err) {
      console.error('Process error:', err);
      const message = String(err?.message || 'Onbekende fout');
      if (message.includes('PDF_JS_LOAD_FAILED')) {
        setError('PDF-engine kon niet geladen worden. Ververs de pagina (Ctrl+F5) en probeer opnieuw.');
      } else {
        setError(`Fout bij verwerking: ${message}`);
      }
      setStep(0);
    } finally {
      setUploading(false);
    }
  };

  // ── Exercise actions ────────────────────────────────────────────────
  const doStatus = (id, status) => {
    setExercises(ex => ex.map(e => e.id === id ? { ...e, status } : e));
    const next = exercises.find(e => e.status === null && e.id !== id);
    if (next) setSelectedId(next.id);
  };

  const doSaveType = () => {
    setExercises(ex => ex.map(e => e.id === selectedId ? { ...e, type: editedType } : e));
    setEditingType(false);
  };

  // ── Opslaan naar Supabase ───────────────────────────────────────────
  const doSave = async () => {
    const approved = exercises.filter(e => e.status === 'approved');
    if (approved.length === 0) { setStep(3); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/save-exercises', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ exercises: approved }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || `Opslaan mislukt (HTTP ${res.status})`);
      }

      if (data?.error === 'NO_SUPABASE') {
        setError('Supabase is niet geconfigureerd. Voeg SUPABASE_URL en SUPABASE_ANON_KEY toe en herstart de server.');
        setSavedLinks([]);
      } else if (data?.error && !data.saved?.length) {
        throw new Error(data.message || 'Opslaan in Supabase is mislukt.');
      }

      if (data.saved?.length > 0) {
        // Supabase werkt → sla links op voor de student-pagina
        setSavedLinks(data.saved.map(ex => ({ id: ex.id, title: ex.title })));
      } else {
        // Geen opgeslagen records teruggekregen → alleen JSON export beschikbaar
        setSavedLinks([]);
      }
    } catch (err) {
      console.warn('Supabase opslaan mislukt:', err.message);
      setError(`Opslaan naar Supabase mislukt: ${err.message}`);
      setSavedLinks([]);
    } finally {
      setSaving(false);
      setStep(3);
    }
  };

  // ── Drop handlers ───────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>

      {/* ── Header ── */}
      <header style={{ background: `linear-gradient(135deg, ${C.purpleDark}, ${C.purple})`,
        color: 'white', height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
        <ZwijsenLogo size={15} />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.25)' }} />
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>EduUpcycle</span>
        <span style={{ background: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: 800,
          padding: '2px 7px', borderRadius: 99, letterSpacing: 0.5 }}>DOCENT PORTAL</span>
        <span style={{ background: C.pink, fontSize: 9, fontWeight: 800,
          padding: '2px 7px', borderRadius: 99, letterSpacing: 0.5 }}>AI TOOL</span>
        {mode && (
          <span style={{ background: mode === 'ai' ? C.green : C.yellow, fontSize: 9, fontWeight: 800,
            padding: '2px 7px', borderRadius: 99 }}>
            {mode === 'ai' ? 'AI MODUS' : 'DEMO MODUS'}
          </span>
        )}
        <a href="/" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.86)',
          fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
          Portalen
        </a>
        <a href="/student" style={{ color: 'rgba(255,255,255,0.86)',
          fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
          Leerlingzijde
        </a>
      </header>

      {/* ── Step bar ── */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
        padding: '14px 28px', display: 'flex', alignItems: 'center' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: i < step ? C.green : i === step ? C.purple : C.border,
                color: i <= step ? 'white' : C.textLight, fontWeight: 800, fontSize: 13,
                boxShadow: i === step ? `0 0 0 3px ${C.purpleLight}` : 'none' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 700 : 400, whiteSpace: 'nowrap',
                color: i === step ? C.purple : i < step ? C.green : C.textLight }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 10px', borderRadius: 2,
                background: i < step ? C.green : C.border }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '32px 28px', maxWidth: 1280, margin: '0 auto' }}>

        {/* Error banner */}
        {error && (
          <div style={{ background: C.redLight, border: `1.5px solid ${C.red}`, borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: C.red, fontWeight: 700 }}>⚠</span>
            <span style={{ color: C.red, fontSize: 13 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none',
              border: 'none', color: C.red, fontWeight: 700, fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* ─ Step 0: Upload ─ */}
        {step === 0 && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.purple, marginBottom: 6 }}>Bestanden uploaden</h1>
              <p style={{ color: C.textMid, fontSize: 14 }}>Sleep PDF's of PNG/JPG-afbeeldingen, of klik om te bladeren</p>
            </div>

            {/* Drop zone */}
            <div
              className={dragOver ? 'drop-active' : ''}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 540, minHeight: 200, border: `2.5px dashed ${C.purple}`,
                borderRadius: 18, background: C.white, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 12, padding: 28,
                boxShadow: '0 2px 12px rgba(109,32,119,0.08)', transition: 'all 0.2s',
              }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple
                style={{ display: 'none' }}
                onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
              <div style={{ width: 56, height: 56, borderRadius: 14, background: C.purpleLight,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📄</div>
              <div style={{ fontWeight: 700, color: C.purple, fontSize: 15 }}>
                {files.length === 0 ? 'Sleep bestanden hier of klik om te bladeren' : `${files.length} bestand(en) geselecteerd`}
              </div>
              <div style={{ fontSize: 12, color: C.textMid }}>PDF · PNG · JPG · meerdere bestanden tegelijk mogelijk</div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ width: 540, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{f.type === 'application/pdf' ? '📄' : '🖼'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: C.textMid }}>{(f.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
                        padding: '4px 10px', fontSize: 11, color: C.textMid }}>
                      ✕ Verwijder
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Start button */}
            {files.length > 0 && (
              <button onClick={doProcess} disabled={uploading}
                style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
                  color: 'white', border: 'none', borderRadius: 9,
                  padding: '13px 36px', fontWeight: 700, fontSize: 15,
                  boxShadow: '0 2px 12px rgba(109,32,119,0.35)' }}>
                {uploading ? 'Bezig…' : `Analyseer ${files.length} bestand${files.length > 1 ? 'en' : ''} →`}
              </button>
            )}

            <div style={{ display: 'flex', gap: 28, opacity: 0.6 }}>
              {['PDF & PNG/JPG', 'AI-analyse', 'Varianten', 'Review-UI'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.textMid }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─ Step 1: Processing ─ */}
        {step === 1 && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, marginTop: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.purple, marginBottom: 6 }}>AI analyseert je werkboek…</h1>
              <p style={{ color: C.textMid, fontSize: 13 }}>{procMsg}</p>
            </div>
            <div style={{ width: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PROC.map((label, i) => {
                const done = procIdx > i, active = procIdx === i;
                return (
                  <div key={i} style={{ background: C.white, borderRadius: 10, padding: '14px 18px',
                    border: `1.5px solid ${done ? C.green : active ? C.purple : C.border}`,
                    display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.3s' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? C.green : active ? C.purple : C.border }}>
                      {done   && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
                      {active && <div style={{ width: 14, height: 14, border: '2.5px solid white',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.75s linear infinite' }} />}
                    </div>
                    <span style={{ fontSize: 13, color: done || active ? C.text : C.textLight,
                      fontWeight: active ? 600 : 400 }}>{label}</span>
                    {done && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.green, fontWeight: 700 }}>Klaar</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─ Step 2: Review ─ */}
        {step === 2 && (
          <div className="fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: C.purple, marginBottom: 4 }}>Beoordelen & valideren</h1>
                <p style={{ color: C.textMid, fontSize: 13 }}>
                  {approved} van {exercises.length} oefeningen goedgekeurd
                  {allDone && <span style={{ color: C.green, fontWeight: 700, marginLeft: 8 }}>· Alles beoordeeld!</span>}
                </p>
              </div>
              {allDone && (
                <button onClick={doSave} disabled={saving} style={{
                  background: `linear-gradient(135deg, ${C.pink}, #A0004A)`,
                  color: 'white', border: 'none', borderRadius: 9,
                  padding: '11px 26px', fontWeight: 700, fontSize: 14,
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 2px 10px rgba(200,0,92,0.35)' }}>
                  {saving ? 'Opslaan…' : 'Opslaan & afronden →'}
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: C.border, borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ width: `${exercises.length ? (approved / exercises.length) * 100 : 0}%`,
                height: '100%', background: C.green, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

              {/* Exercise list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
                {exercises.map(ex => {
                  const etc = TYPE_COLORS[ex.type] ?? { bg: C.purpleLight, text: C.purple };
                  return (
                    <div key={ex.id} onClick={() => { setSelectedId(ex.id); setEditingType(false); }}
                      style={{ background: ex.id === selectedId ? C.purpleLight : C.white,
                        border: `1.5px solid ${ex.id === selectedId ? C.purple : C.border}`,
                        borderRadius: 10, padding: '11px 13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.35 }}>{ex.title}</span>
                        {ex.status === 'approved' && <Badge label="✓ OK"   bg={C.greenLight}  color={C.green} small />}
                        {ex.status === 'rejected' && <Badge label="✗ Afg." bg={C.redLight}    color={C.red}   small />}
                        {ex.status === null       && <Badge label="Open"   bg="#FFF8DC"        color="#7A5500" small />}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <Badge label={ex.type}              bg={etc.bg}  color={etc.text}              small />
                        <Badge label={`${ex.confidence}%`}  bg={C.bg}    color={confColor(ex.confidence)} small />
                        <Badge label={`p.${ex.page}`}       bg={C.bg}    color={C.textMid}              small />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail panel */}
              {selected && (
                <div style={{ background: C.white, borderRadius: 12, border: `1.5px solid ${C.border}`,
                  overflow: 'hidden', boxShadow: '0 2px 16px rgba(109,32,119,0.07)' }}>

                  {/* Panel header */}
                  <div style={{ background: `linear-gradient(135deg, ${C.purpleDark}, ${C.purple})`,
                    padding: '13px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{selected.title}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setPreviewEx(selected)} style={{
                        background: 'rgba(255,255,255,0.18)', color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
                        padding: '5px 12px', fontSize: 11, fontWeight: 600 }}>
                        👁 Leerlingweergave
                      </button>
                      <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white',
                        fontSize: 11, padding: '4px 10px', borderRadius: 99 }}>
                        Pagina {selected.page}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Left: original + image */}
                    <div>
                      {/* Pagina-afbeelding als die beschikbaar is */}
                      {Object.keys(pageImages).length > 0 && (
                        <>
                          <SL>Paginaweergave (PDF)</SL>
                          <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden',
                            border: `1px solid ${C.border}`, maxHeight: 200 }}>
                            <img
                              src={pageImages[Object.keys(pageImages).find(k => k.includes(`p${selected.page}`))] || Object.values(pageImages)[0]}
                              alt={`Pagina ${selected.page}`}
                              style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }}
                            />
                          </div>
                        </>
                      )}

                      <SL>Originele tekst (PDF)</SL>
                      <div style={{ background: '#FFFBF0', border: '1px solid #E5D8A0',
                        borderRadius: 8, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 12.5, color: C.text,
                          lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selected.original}</div>
                      </div>
                      <SL>AI-notitie</SL>
                      <div style={{ background: C.blueLight, border: '1px solid #B8D0F5',
                        borderRadius: 8, padding: 12, fontSize: 12, color: C.blue, lineHeight: 1.55 }}>
                        💡 {selected.note}
                      </div>
                    </div>

                    {/* Right: AI output */}
                    <div>
                      <SL>AI-detectie</SL>

                      <IB>
                        <div style={{ fontSize: 10, color: C.textLight, marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>Vraagtype</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {editingType && selected.status === null ? (
                            <>
                              <select value={editedType} onChange={e => setEditedType(e.target.value)}
                                style={{ border: `1.5px solid ${C.purple}`, borderRadius: 6,
                                  padding: '5px 8px', fontSize: 13, color: C.text, background: 'white' }}>
                                {Object.keys(TYPE_COLORS).map(t => <option key={t}>{t}</option>)}
                              </select>
                              <button onClick={doSaveType} style={{ background: C.green, color: 'white',
                                border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600 }}>Opslaan</button>
                              <button onClick={() => setEditingType(false)} style={{ background: C.border, color: C.textMid,
                                border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>✕</button>
                            </>
                          ) : (
                            <>
                              <Badge label={selected.type} bg={tc.bg} color={tc.text} />
                              {selected.status === null && (
                                <button onClick={() => { setEditingType(true); setEditedType(selected.type); }}
                                  style={{ background: 'none', border: `1px solid ${C.border}`, color: C.textMid,
                                    borderRadius: 6, padding: '3px 9px', fontSize: 11 }}>
                                  ✎ Aanpassen
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </IB>

                      <IB>
                        <div style={{ fontSize: 10, color: C.textLight, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>AI-vertrouwen</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${selected.confidence}%`, height: '100%',
                              background: confColor(selected.confidence), borderRadius: 4, transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: confColor(selected.confidence), minWidth: 36 }}>
                            {selected.confidence}%
                          </span>
                        </div>
                        {selected.confidence < 78 && (
                          <div style={{ fontSize: 11, color: C.orange, marginTop: 5 }}>
                            ⚠ Lage zekerheid — controleer dit vraagtype handmatig
                          </div>
                        )}
                      </IB>

                      <IB>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>Onderwerp</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{selected.topic}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>Moeilijkheid</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{selected.difficulty}</div>
                          </div>
                          <div style={{ gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2 }}>Interactief formaat</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.teal }}>{selected.format}</div>
                          </div>
                        </div>
                      </IB>

                      <SL>Gegenereerde varianten</SL>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selected.variants?.map(v => (
                          <div key={v.level} style={{ background: C.bg, borderRadius: 8,
                            padding: '10px 12px', border: `1px solid ${C.border}` }}>
                            <Badge label={v.level}
                              bg={v.level === 'Makkelijker' ? C.greenLight : C.pinkLight}
                              color={v.level === 'Makkelijker' ? C.green : C.pink} small />
                            <div style={{ fontSize: 12, color: C.text, marginTop: 7, lineHeight: 1.55 }}>{v.text}</div>
                          </div>
                        ))}
                      </div>

                      {selected.question_type === 'blokken_bouwsel' && (() => {
                        const sit = ['tellen','goedFout','bouwen','meerkeuze'].includes(selected.block_interaction_type)
                          ? selected.block_interaction_type
                          : (selected.block_option_a_grid?.length && selected.block_option_b_grid?.length ? 'meerkeuze' : 'goedFout');
                        const smaxH = selected.block_max_height ?? 5;
                        const previewGrid = clampGrid(
                          selected.block_goal_grid || selected.block_plan_grid || selected.block_option_a_grid, smaxH);
                        const previewPlan = clampGrid(selected.block_plan_grid || selected.block_goal_grid, smaxH);
                        return (
                          <>
                            <SL style={{ marginTop: 12 }}>
                              Blokkenbouwsel preview
                              <span style={{ marginLeft: 8, fontWeight: 400, color: C.teal, textTransform: 'none', fontSize: 10 }}>
                                ({sit})
                              </span>
                            </SL>
                            {selected.block_auto_generated && (
                              <div style={{ background: '#FFF8DC', border: '1px solid #E5D8A0',
                                borderRadius: 8, padding: '8px 12px', fontSize: 11,
                                color: '#7A5500', marginBottom: 10 }}>
                                ⚠ AI kon geen blokdata uit de PDF lezen — grids zijn automatisch gegenereerd.
                                Controleer via "Leerlingweergave" vóór goedkeuren.
                              </div>
                            )}
                            {previewGrid.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>
                                    {sit === 'tellen' ? 'Bouwsel (leerling telt blokjes)' : '3D bouwsel'}
                                  </div>
                                  <CubePreview grid={previewGrid} />
                                </div>
                                {sit !== 'tellen' && previewPlan.length > 0 && (
                                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Plattegrond</div>
                                    <PlanGridDisplay grid={previewPlan} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: 10, fontSize: 12 }}>
                                Geen blokdata beschikbaar.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Action bar */}
                  {selected.status === null ? (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px',
                      display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#FAFAFA' }}>
                      <button onClick={() => doStatus(selected.id, 'rejected')} style={{
                        background: 'white', color: C.red, border: `1.5px solid ${C.red}`,
                        borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: 13 }}>
                        ✗ Afwijzen
                      </button>
                      <button onClick={() => doStatus(selected.id, 'approved')} style={{
                        background: `linear-gradient(135deg, ${C.green}, #1E8039)`,
                        color: 'white', border: 'none', borderRadius: 8, padding: '9px 26px',
                        fontWeight: 700, fontSize: 13, boxShadow: '0 2px 8px rgba(45,170,79,0.3)' }}>
                        ✓ Goedkeuren
                      </button>
                    </div>
                  ) : (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px',
                      display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA' }}>
                      {selected.status === 'approved'
                        ? <span style={{ color: C.green, fontWeight: 700 }}>✓ Goedgekeurd</span>
                        : <span style={{ color: C.red,   fontWeight: 700 }}>✗ Afgewezen</span>}
                      <button onClick={() => setExercises(ex => ex.map(e => e.id === selected.id ? { ...e, status: null } : e))}
                        style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${C.border}`,
                          color: C.textMid, borderRadius: 6, padding: '6px 14px', fontSize: 12 }}>
                        Ongedaan maken
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─ Step 3: Done ─ */}
        {step === 3 && (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 40 }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: C.greenLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
              boxShadow: `0 0 0 8px ${C.greenLight}` }}>✓</div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.purple, marginBottom: 6 }}>Oefeningen opgeslagen!</h1>
              <p style={{ color: C.textMid }}>
                {approved} van {exercises.length} oefeningen zijn goedgekeurd en klaarstaan als interactieve content.
              </p>
            </div>

            {/* Supabase student-links (alleen als opslaan gelukt is) */}
            {savedLinks.length > 0 && (
              <div style={{ width: 560, background: C.greenLight, borderRadius: 12,
                padding: '16px 20px', border: `1.5px solid ${C.green}` }}>
                <div style={{ fontWeight: 700, color: C.green, marginBottom: 12, fontSize: 14 }}>
                  ✓ Opgeslagen in database · Deel deze links met leerlingen:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedLinks.map(link => (
                    <div key={link.id} style={{ background: C.white, borderRadius: 8,
                      padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{link.title}</span>
                      <a href={`/student/${link.id}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: C.teal, fontWeight: 700, textDecoration: 'none' }}>
                        /student/{link.id.slice(0, 8)}… →
                      </a>
                    </div>
                  ))}
                </div>
                <a href="/student" target="_blank" rel="noreferrer"
                  style={{ display: 'block', marginTop: 10, fontSize: 12, color: C.textMid, textDecoration: 'none' }}>
                  Of deel de overzichtspagina: /student
                </a>
              </div>
            )}

            {/* Geen Supabase → toon info */}
            {savedLinks.length === 0 && (
              <div style={{ width: 560, background: C.blueLight, borderRadius: 12,
                padding: '14px 18px', border: `1px solid #B8D0F5`, fontSize: 13, color: C.blue }}>
                💡 Voeg <code>SUPABASE_URL</code> en <code>SUPABASE_ANON_KEY</code> toe aan je
                environment variables om oefeningen op te slaan en student-links te genereren.
              </div>
            )}

            {/* Export als JSON */}
            <button onClick={() => {
              const data = exercises.filter(e => e.status === 'approved');
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'eduurcycle-oefeningen.json'; a.click();
              URL.revokeObjectURL(url);
            }} style={{ background: C.teal, color: 'white', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontWeight: 700, fontSize: 13 }}>
              📥 Exporteer als JSON
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, width: 540 }}>
              {exercises.filter(e => e.status === 'approved').map(ex => {
                const etc = TYPE_COLORS[ex.type] ?? { bg: C.purpleLight, text: C.purple };
                return (
                  <div key={ex.id} style={{ background: C.white, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>{ex.title}</div>
                    <Badge label={ex.type} bg={etc.bg} color={etc.text} small />
                  </div>
                );
              })}
            </div>

            <button onClick={() => {
              setStep(0); setExercises([]); setSelectedId(null);
              setFiles([]); setPageImages({}); setMode(null); setProcIdx(-1);
              setSavedLinks([]);
            }} style={{ background: `linear-gradient(135deg, ${C.purpleDark}, ${C.purple})`,
              color: 'white', border: 'none', borderRadius: 9, padding: '13px 32px',
              fontWeight: 700, fontSize: 14, marginTop: 8,
              boxShadow: '0 2px 12px rgba(109,32,119,0.35)' }}>
              Nieuwe bestanden uploaden
            </button>
          </div>
        )}
      </div>

      {/* Student preview modal */}
      {previewEx && <StudentPreview exercise={previewEx} onClose={() => setPreviewEx(null)} />}
    </div>
  );
}
