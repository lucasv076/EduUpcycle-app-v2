'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { C } from '@/lib/colors';
import { BlokkenBouwselInteractive, gridsEqual, CubePreview, PlanGridDisplay, clampGrid } from '@/components/blokken-bouwsel';
import { GetallenLijnInteractief } from '@/components/getallenlijn';
import SubmissionHistory from '@/components/SubmissionHistory';
import { getProgress, recordAttempt } from '@/lib/progress';
import { generateFreshRekensomData, THEMA_EMOJIS, parseSomNums } from '@/lib/math-generator';

// Generate or retrieve a stable session ID
function getSessionId() {
  if (typeof window === 'undefined') return null;
  let sessionId = localStorage.getItem('eduupcycle_session_id');
  if (!sessionId) {
    sessionId = 'student_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('eduupcycle_session_id', sessionId);
  }
  return sessionId;
}

const VAARDIGHEID_MAP = {
  // Standaard types
  'Open vraag':           'Je schrijft een antwoord in je eigen woorden.',
  'Invulvraag':           'Je vult het juiste woord of getal in.',
  'Meerkeuze':            'Je kiest het goede antwoord uit de opties.',
  'Tekenopgave':          'Je maakt een tekening of schets.',
  'Manipulatieopdracht':  'Je ordent, sorteert of verplaatst elementen.',
  // Rekensommen
  'vul_in':               'Je berekent de uitkomst en vult het lege vakje in.',
  'goed_fout':            'Je controleert of de rekensom klopt en kiest Goed of Fout.',
  'vermenigvuldig_tabel': 'Je vult de ontbrekende uitkomsten in de tabel in.',
  'getallenlijn':         'Je plaatst de getallen op de juiste plek op de getallenlijn.',
  // Blokkenbouwsel per interactietype
  'blokken_meerkeuze':    'Je herkent welk 3D-bouwsel bij de plattegrond hoort.',
  'blokken_tellen':       'Je telt hoeveel blokjes er in het bouwsel zitten.',
  'blokken_goedFout':     'Je controleert of het bouwsel klopt met de plattegrond.',
  'blokken_bouwen':       'Je vult zelf de plattegrond in bij een 3D-bouwsel.',
};

function buildLeerdoel(topic, type, blockInteractionType, questionType) {
  const parts = topic ? topic.split(/\s*[–—-]\s*/) : [];
  const vak  = parts.length >= 2 ? parts[0].trim() : null;
  const doel = parts.length >= 2 ? parts.slice(1).join(' – ').trim() : (topic || '');

  const key = type === 'Blokkenbouwsel' && blockInteractionType
    ? `blokken_${blockInteractionType}`
    : questionType && questionType !== 'standaard' && questionType !== 'blokken_bouwsel'
      ? questionType
      : type;
  const vaardigheid = VAARDIGHEID_MAP[key] || null;

  return { vak, doel, vaardigheid };
}

const ZwijsenLogo = () => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
    {[['z', C.orange], ['w', C.red], ['ij', C.blue], ['s', C.yellow], ['e', C.green], ['n', C.teal]].map(([l, bg]) => (
      <span key={l} style={{ background: bg, color: 'white', fontWeight: 900, fontSize: 14,
        padding: '2px 6px', borderRadius: 3 }}>{l}</span>
    ))}
  </div>
);

const MAX_VIZ = 12;

function EmojiHint({ som, emoji }) {
  if (!emoji) return null;
  const parsed = parseSomNums(som.tekst);
  if (!parsed || parsed.a > MAX_VIZ || parsed.b > MAX_VIZ) return null;
  const { a, op, b } = parsed;
  const isAdd = op === '+';
  const isSub = op === '-' || op === '−';
  if (!isAdd && !isSub) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2,
      paddingLeft: 10, borderLeft: `2px solid #DDD0E6`, marginLeft: 6, flexShrink: 0, flexWrap: 'wrap' }}>
      {isAdd ? (
        <>
          {Array.from({ length: a }, (_, i) => <span key={`a${i}`} style={{ fontSize: 17, lineHeight: 1 }}>{emoji}</span>)}
          <span style={{ fontSize: 12, color: '#9B89AC', fontWeight: 700, margin: '0 3px' }}>|</span>
          {Array.from({ length: b }, (_, i) => <span key={`b${i}`} style={{ fontSize: 17, lineHeight: 1 }}>{emoji}</span>)}
        </>
      ) : (
        Array.from({ length: a }, (_, i) => (
          <span key={i} style={{ fontSize: 17, lineHeight: 1, opacity: i >= (a - b) ? 0.2 : 1 }}>{emoji}</span>
        ))
      )}
    </div>
  );
}

export default function ExercisePage({ exercise }) {
  const [phase, setPhase]         = useState('easy');
  const [answer, setAnswer]       = useState('');
  const [mathAnswers, setMathAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [currentRekensomData, setCurrentRekensomData] = useState(null);
  const [inputKey, setInputKey]   = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [attempts, setAttempts]   = useState(0);
  const [streak, setStreak]       = useState({ correctStreak: 0, incorrectStreak: 0, level: 'easy', totalAttempts: 0, totalCorrect: 0 });
  const [levelMsg, setLevelMsg]   = useState(null);
  const recorded = useRef(false);

  // Initialize session ID on mount
  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const easyVariant = exercise.variants?.[0];
  const hardVariant = exercise.variants?.[1];
  const hasVariants = !!(easyVariant && hardVariant);

  // Math question type detection
  const MATH_TYPES = ['vul_in', 'goed_fout', 'vermenigvuldig_tabel', 'getallenlijn'];
  const isMathType = MATH_TYPES.includes(exercise.question_type);
  const activeRekensomData = isMathType
    ? ((phase === 'hard' ? hardVariant?.rekensom_data : easyVariant?.rekensom_data) ?? exercise.rekensom_data)
    : null;

  // Verse vragen worden gegenereerd via useEffect; tot die tijd valt terug op activeRekensomData
  const displayRekensomData = currentRekensomData ?? activeRekensomData;

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
  const isBuildMode = activeBlockInteractionType === 'bouwen';
  const isTellenMode = activeBlockInteractionType === 'tellen';
  const isGoedFoutMode = activeBlockInteractionType === 'goedFout';
  const isMeerkeuzMode = activeBlockInteractionType === 'meerkeuze';
  const maxH = exercise.block_max_height || 5;

  // Bij laden: haal opgeslagen studentniveau op
  useEffect(() => {
    const p = getProgress('student');
    setStreak(p);
    if (p.level === 'hard' && hasVariants) {
      setPhase('hard');
    }
  }, [hasVariants]);

  // Genereer verse rekensommen bij fase-start (5 willekeurige vragen per poging)
  useEffect(() => {
    if (!isMathType) return;
    const data = (phase === 'hard' ? hardVariant?.rekensom_data : easyVariant?.rekensom_data) ?? exercise.rekensom_data;
    setCurrentRekensomData(data ? generateFreshRekensomData(data, exercise.question_type, 5) : null);
  }, [phase]);

  const rawQuestionText = hasVariants
    ? (phase === 'hard' ? hardVariant.text : easyVariant.text)
    : exercise.original;
  const questionText = isBlockQuestion
    ? rawQuestionText.replace(/\b[Aa]\s*,\s*[Bb]\s*,?\s*(?:of|en)\s+[Cc]\b/g, 'A of B')
    : rawQuestionText;

  // For block exercises, track whether the answer is actually correct
  const blockTotalCount = isTellenMode && exercise.block_plan_grid
    ? exercise.block_plan_grid.flat().reduce((s, v) => s + v, 0)
    : null;

  const goedFoutCorrectAnswer = isGoedFoutMode
    ? (exercise.block_correct_option === 'A' ? 'Goed' : 'Fout')
    : null;

  // Math correctness check
  const mathIsCorrect = submitted && isMathType && displayRekensomData
    ? (() => {
        if (exercise.question_type === 'vul_in') {
          const sommen = displayRekensomData.sommen || [];
          return sommen.length > 0 && sommen.every((s, i) => Number(mathAnswers[i]) === s.antwoord);
        }
        if (exercise.question_type === 'goed_fout') {
          const stellingen = displayRekensomData.stellingen || [];
          return stellingen.length > 0 && stellingen.every((s, i) =>
            (mathAnswers[i] === 'Goed') === s.klopt
          );
        }
        if (exercise.question_type === 'vermenigvuldig_tabel') {
          const blankRijen = (displayRekensomData.rijen || []).filter(r => r.uitkomst === null);
          return blankRijen.length > 0 && blankRijen.every((r, i) => Number(mathAnswers[i]) === r.antwoord);
        }
        if (exercise.question_type === 'getallenlijn') {
          const positions = displayRekensomData.te_plaatsen || [];
          return positions.length > 0 && positions.every(pos => Number(mathAnswers[pos]) === pos);
        }
        return false;
      })()
    : null;

  const isAnswerCorrect = submitted
    ? isMathType
      ? mathIsCorrect
      : isBuildMode
        ? gridsEqual(answer, exercise.block_plan_grid)
        : isTellenMode
          ? Number(answer) === blockTotalCount
          : isGoedFoutMode
            ? answer === goedFoutCorrectAnswer
            : isBlockQuestion
              ? answer === exercise.block_correct_option
              : true
    : null;

  // For progress tracking: only block and math exercises have real validation
  const isCorrect = submitted
    ? (isBlockQuestion || isMathType) ? isAnswerCorrect : null
    : null;

  // Save submission when answer is submitted
  useEffect(() => {
    if (submitted && sessionId && answer) {
      const submittedGrid = isBlockQuestion ? answer : null;

      fetch('/api/save-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: exercise.id,
          sessionId,
          difficultyLevel: phase,
          answer: (isBlockQuestion && !isTellenMode && !isGoedFoutMode) ? null : answer,
          isCorrect: isAnswerCorrect,
          submittedGrid,
        }),
      }).catch(err => {
        console.error('Failed to save submission:', err);
      });
    }
  }, [submitted, sessionId, answer, exercise.id, isBlockQuestion, isAnswerCorrect, phase]);

  // Registreer poging in streak/progress systeem
  const record = (correct) => {
    if (recorded.current) return;
    recorded.current = true;
    const { progress: updated, levelChange } = recordAttempt('student', correct);
    setStreak(updated);
    if (levelChange) {
      setLevelMsg(levelChange);
      setTimeout(() => setLevelMsg(null), 3000);
    }
  };

  // Auto-record correct answers
  useEffect(() => {
    if (submitted && isCorrect === true) {
      record(true);
    }
  }, [submitted, isCorrect]);

  const handleSubmit = () => {
    setAttempts(a => a + 1);
    setSubmitted(true);
  };

  const handleNextLevel = () => {
    setCurrentRekensomData(null);
    setAnswer('');
    setMathAnswers({});
    setSubmitted(false);
    setAttempts(0);
    recorded.current = false;
    setInputKey(k => k + 1);
    setPhase('hard');
  };

  const handleRetry = () => {
    setAnswer('');
    setMathAnswers({});
    setSubmitted(false);
    setInputKey(k => k + 1);
    if (isMathType) {
      const data = (phase === 'hard' ? hardVariant?.rekensom_data : easyVariant?.rekensom_data) ?? exercise.rekensom_data;
      setCurrentRekensomData(data ? generateFreshRekensomData(data, exercise.question_type, 5) : null);
    }
  };

  const handleSkip = () => {
    record(false); // opgeven = fout voor streak
    if (phase === 'easy' && hasVariants) {
      setAnswer('');
      setMathAnswers({});
      setSubmitted(false);
      setAttempts(0);
      recorded.current = false;
      setPhase('hard');
    } else {
      setPhase('done');
    }
  };

  const handleDone = () => {
    // Alleen als correct registreren als we echt weten dat het goed was
    if (isCorrect === true) record(true);
    setPhase('done');
  };

  // Auto-advance naar moeilijker bij goed antwoord (na 2s)
  useEffect(() => {
    if (submitted && isCorrect === true && phase === 'easy' && hasVariants) {
      const t = setTimeout(handleNextLevel, 2000);
      return () => clearTimeout(t);
    }
  }, [submitted, isCorrect, phase, hasVariants]);

  // ── Math: check of alle verplichte velden ingevuld zijn ──────────────
  const mathAnswersComplete = isMathType && displayRekensomData
    ? (() => {
        if (exercise.question_type === 'vul_in') {
          const sommen = displayRekensomData.sommen || [];
          return sommen.length > 0 && sommen.every((_, i) => mathAnswers[i] !== undefined && mathAnswers[i] !== '');
        }
        if (exercise.question_type === 'goed_fout') {
          const stellingen = displayRekensomData.stellingen || [];
          return stellingen.length > 0 && stellingen.every((_, i) => mathAnswers[i] !== undefined);
        }
        if (exercise.question_type === 'vermenigvuldig_tabel') {
          const blankRijen = (displayRekensomData.rijen || []).filter(r => r.uitkomst === null);
          return blankRijen.length > 0 && blankRijen.every((_, i) => mathAnswers[i] !== undefined && mathAnswers[i] !== '');
        }
        if (exercise.question_type === 'getallenlijn') {
          const positions = displayRekensomData.te_plaatsen || [];
          return positions.length > 0 && positions.every(pos => mathAnswers[pos] !== undefined);
        }
        return false;
      })()
    : false;

  // ── Input op basis van vraagtype ──────────────────────────────────────
  const renderInput = () => {

    // ── Vul in: rekensom met lege vakjes ──
    if (exercise.question_type === 'vul_in' && displayRekensomData?.sommen) {
      const sommen = displayRekensomData.sommen;
      const emoji = THEMA_EMOJIS[displayRekensomData.thema] || null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sommen.map((som, i) => {
            const parts = som.tekst.split('___');
            const userVal = mathAnswers[i] ?? '';
            const isRight = submitted ? Number(userVal) === som.antwoord : null;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: submitted ? (isRight ? C.greenLight : C.redLight) : C.bg,
                border: `1.5px solid ${submitted ? (isRight ? C.green : C.red) : C.border}`,
                borderRadius: 10, padding: '10px 16px', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: C.text }}>
                  {parts[0]}
                </span>
                <input
                  type="number"
                  value={userVal}
                  onChange={e => !submitted && setMathAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  disabled={submitted}
                  placeholder="?"
                  style={{
                    width: 72, fontSize: 20, fontWeight: 700, textAlign: 'center',
                    border: `2px solid ${submitted ? (isRight ? C.green : C.red) : C.purple}`,
                    borderRadius: 8, padding: '6px 4px', fontFamily: 'monospace',
                    color: C.text, background: submitted ? 'transparent' : C.white,
                  }}
                />
                {parts[1] && (
                  <span style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: C.text }}>
                    {parts[1]}
                  </span>
                )}
                {submitted && !isRight && (
                  <span style={{ fontSize: 13, color: C.red, fontWeight: 600, marginLeft: 6 }}>
                    → {som.antwoord}
                  </span>
                )}
                {submitted && isRight && (
                  <span style={{ fontSize: 16, color: C.green, marginLeft: 6 }}>✓</span>
                )}
                {!submitted && <EmojiHint som={som} emoji={emoji} />}
              </div>
            );
          })}
        </div>
      );
    }

    // ── Goed/Fout: beoordelingsstellingen ──
    if (exercise.question_type === 'goed_fout' && displayRekensomData?.stellingen) {
      const stellingen = displayRekensomData.stellingen;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stellingen.map((stelling, i) => {
            const chosen = mathAnswers[i];
            const correctAns = stelling.klopt ? 'Goed' : 'Fout';
            const isRight = submitted ? chosen === correctAns : null;
            return (
              <div key={i} style={{
                background: submitted ? (isRight ? C.greenLight : C.redLight) : C.bg,
                border: `1.5px solid ${submitted ? (isRight ? C.green : C.red) : C.border}`,
                borderRadius: 10, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 19, fontFamily: 'monospace', fontWeight: 700, color: C.text, marginBottom: 10 }}>
                  {stelling.tekst}
                  {submitted && !isRight && (
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 600, marginLeft: 10 }}>
                      (antwoord: {correctAns})
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Goed', 'Fout'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitted}
                      onClick={() => !submitted && setMathAnswers(prev => ({ ...prev, [i]: opt }))}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 15, fontWeight: 700,
                        border: `2px solid ${chosen === opt ? (opt === 'Goed' ? C.green : C.red) : C.border}`,
                        background: chosen === opt ? (opt === 'Goed' ? C.greenLight : C.redLight) : C.white,
                        color: chosen === opt ? (opt === 'Goed' ? C.green : C.red) : C.text,
                        cursor: submitted ? 'default' : 'pointer',
                      }}
                    >
                      {opt === 'Goed' ? '✓ Goed' : '✗ Fout'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ── Vermenigvuldig-tabel ──
    if (exercise.question_type === 'vermenigvuldig_tabel' && displayRekensomData?.rijen) {
      const { operator, factor, rijen } = displayRekensomData;
      let blankIndex = 0;
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            borderCollapse: 'separate', borderSpacing: 4,
            fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
          }}>
            <thead>
              <tr>
                <td style={{
                  background: C.purple, color: 'white', textAlign: 'center',
                  padding: '8px 14px', borderRadius: 6, minWidth: 44,
                }}>{operator}</td>
                {rijen.map((r, i) => (
                  <td key={i} style={{
                    background: C.purpleLight, color: C.purpleDark, textAlign: 'center',
                    padding: '8px 14px', borderRadius: 6, minWidth: 44,
                  }}>{r.getal}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{
                  background: C.purpleLight, color: C.purpleDark, textAlign: 'center',
                  padding: '8px 14px', borderRadius: 6,
                }}>{factor}</td>
                {rijen.map((r, i) => {
                  if (r.uitkomst !== null) {
                    return (
                      <td key={i} style={{
                        background: C.bg, color: C.text, textAlign: 'center',
                        padding: '8px 14px', borderRadius: 6,
                      }}>{r.uitkomst}</td>
                    );
                  }
                  const idx = blankIndex++;
                  const userVal = mathAnswers[idx] ?? '';
                  const isRight = submitted ? Number(userVal) === r.antwoord : null;
                  return (
                    <td key={i} style={{
                      background: submitted ? (isRight ? C.greenLight : C.redLight) : C.white,
                      border: `2px solid ${submitted ? (isRight ? C.green : C.red) : C.purple}`,
                      borderRadius: 6, textAlign: 'center', padding: 4,
                    }}>
                      <input
                        type="number"
                        value={userVal}
                        onChange={e => !submitted && setMathAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                        disabled={submitted}
                        placeholder="?"
                        style={{
                          width: 52, fontSize: 18, fontWeight: 700, textAlign: 'center',
                          border: 'none', background: 'transparent',
                          fontFamily: 'monospace', color: C.text,
                        }}
                      />
                      {submitted && !isRight && (
                        <div style={{ fontSize: 11, color: C.red }}>→{r.antwoord}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    // ── Getallenlijn: sleep getallen naar de juiste plek ──
    if (exercise.question_type === 'getallenlijn' && displayRekensomData?.te_plaatsen) {
      return (
        <GetallenLijnInteractief
          key={`gl-${phase}-${inputKey}`}
          data={displayRekensomData}
          submitted={submitted}
          disabled={submitted}
          onPlacementsChange={(placements) => setMathAnswers(placements)}
        />
      );
    }

    if (isBlockQuestion && isTellenMode) {
      const displayGrid = clampGrid(
        exercise.block_goal_grid || exercise.block_plan_grid || exercise.block_option_a_grid,
        maxH
      );
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {displayGrid.length > 0 ? (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
                Bouwsel — tel alle blokjes
              </div>
              <CubePreview grid={displayGrid} />
            </div>
          ) : (
            <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: 12, fontSize: 13 }}>
              Geen bouwsel-data beschikbaar voor deze oefening.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>
              Aantal blokken:
            </label>
            <input
              type="number"
              min="0"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Voer het aantal in..."
              style={{
                border: `2px solid ${submitted ? C.green : C.border}`,
                borderRadius: 10, padding: '12px 16px', fontSize: 18, maxWidth: 160,
                color: C.text, background: submitted ? C.greenLight : C.white,
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      );
    }

    if (isBlockQuestion && isGoedFoutMode) {
      const shownGrid = clampGrid(exercise.block_option_a_grid || exercise.block_goal_grid, maxH);
      const planGrid = clampGrid(exercise.block_plan_grid || exercise.block_goal_grid, maxH);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shownGrid.length > 0 ? (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
                Dit bouwsel
              </div>
              <CubePreview grid={shownGrid} />
            </div>
          ) : null}
          {planGrid.length > 0 ? (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
                Plattegrond (bovenaanzicht)
              </div>
              <PlanGridDisplay grid={planGrid} />
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 12 }}>
            {['Goed', 'Fout'].map(opt => (
              <button
                key={opt}
                type="button"
                disabled={submitted}
                onClick={() => !submitted && setAnswer(opt)}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 16, fontWeight: 700,
                  border: `2px solid ${answer === opt ? (opt === 'Goed' ? C.green : C.red) : C.border}`,
                  background: answer === opt ? (opt === 'Goed' ? C.greenLight : C.redLight) : C.white,
                  color: answer === opt ? (opt === 'Goed' ? C.green : C.red) : C.text,
                  cursor: submitted ? 'default' : 'pointer',
                }}
              >
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {targetGrid.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
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
        onAnswered={(val) => setAnswer(val)}
        disabled={submitted}
        buildMode={false}
        showFeedback={submitted}
      />
    );

    if (exercise.type === 'Invulvraag') {
      const blockGrid = exercise.block_goal_grid?.length > 0
        ? clampGrid(exercise.block_goal_grid, maxH)
        : exercise.block_plan_grid?.length > 0
          ? clampGrid(exercise.block_plan_grid, maxH)
          : null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {blockGrid?.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
                Bouwsel — bekijk goed
              </div>
              <CubePreview grid={blockGrid} />
            </div>
          )}
          {exercise.source_page_image_data_url && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>
                Opdracht uit werkboek
              </div>
              <img src={exercise.source_page_image_data_url} alt="Opdracht"
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 6 }} />
            </div>
          )}
          <label style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>Jouw antwoord:</label>
          <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
            disabled={submitted} placeholder="Typ hier je antwoord..."
            style={{ border: `2px solid ${submitted ? C.green : C.border}`,
              borderRadius: 10, padding: '12px 16px', fontSize: 18, maxWidth: 280,
              color: C.text, background: submitted ? C.greenLight : C.white, fontFamily: 'inherit' }} />
        </div>
      );
    }

    if (exercise.type === 'Open vraag' || exercise.type === 'Tekenopgave'
      || exercise.type === 'Manipulatieopdracht') {
      const blockGrid = exercise.block_goal_grid?.length > 0
        ? clampGrid(exercise.block_goal_grid, maxH)
        : exercise.block_plan_grid?.length > 0
          ? clampGrid(exercise.block_plan_grid, maxH)
          : null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {blockGrid?.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>
                Bouwsel — bekijk goed
              </div>
              <CubePreview grid={blockGrid} />
            </div>
          )}
          {exercise.source_page_image_data_url && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>
                Opdracht uit werkboek
              </div>
              <img src={exercise.source_page_image_data_url} alt="Opdracht"
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 6 }} />
            </div>
          )}
          <label style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>Jouw antwoord:</label>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitted}
            placeholder="Schrijf je antwoord hier..." rows={5}
            style={{ border: `2px solid ${submitted ? C.green : C.border}`,
              borderRadius: 10, padding: '12px 16px', fontSize: 15, resize: 'none',
              color: C.text, fontFamily: 'inherit', maxWidth: 500 }} />
        </div>
      );
    }

    if (exercise.type === 'Meerkeuze') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
        {['Antwoord A', 'Antwoord B', 'Antwoord C', 'Antwoord D'].map((opt, i) => (
          <button type="button" key={i} onClick={() => !submitted && setAnswer(opt)} disabled={submitted}
            style={{ textAlign: 'left', padding: '13px 18px', borderRadius: 10, fontSize: 15,
              border: `2px solid ${answer === opt ? C.purple : C.border}`,
              background: answer === opt ? C.purpleLight : C.white, color: C.text,
              fontWeight: answer === opt ? 700 : 400, cursor: submitted ? 'default' : 'pointer' }}>
            {String.fromCharCode(65 + i)}. {opt}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${C.purpleDark}, ${C.purple})`,
        color: 'white', padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <ZwijsenLogo />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.25)' }} />
        <span style={{ fontWeight: 800, fontSize: 16 }}>Oefeningen</span>
        <Link href="/" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.75)',
          fontSize: 12, textDecoration: 'none' }}>Portalen</Link>
        <Link href="/student" style={{ marginLeft: 14, color: 'rgba(255,255,255,0.75)',
          fontSize: 12, textDecoration: 'none' }}>← Terug naar overzicht</Link>
      </header>

      <div style={{ maxWidth: isBlockQuestion ? 920 : 680, margin: '0 auto', padding: '40px 24px' }}>

        {/* Topic badge */}
        <div style={{ background: C.yellow, display: 'inline-block', padding: '5px 14px',
          borderRadius: 8, fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 16 }}>
          Pagina {exercise.page} &middot; {exercise.topic}
        </div>

        {/* Titel */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 16, lineHeight: 1.3 }}>
          {exercise.title}
        </h1>

        {/* Leerdoel-balk */}
        {(() => {
          const ld = buildLeerdoel(exercise.topic, exercise.type, blockInteractionType, exercise.question_type);
          return (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: '#F0E8FB',
              borderLeft: `5px solid ${C.purple}`,
              borderRadius: 12,
              border: `1.5px solid ${C.purple}`,
              padding: '14px 18px',
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🎯</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Leerdoel
                </div>
                {ld.doel && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                    {ld.vak && (
                      <span style={{ color: C.textMid, fontWeight: 600 }}>{ld.vak} &rsaquo; </span>
                    )}
                    {ld.doel}
                  </div>
                )}
                {ld.vaardigheid && (
                  <div style={{ fontSize: 13, color: C.textMid, fontWeight: 500, lineHeight: 1.4 }}>
                    {ld.vaardigheid}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Niveau-indicator */}
        {hasVariants && phase !== 'done' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{
              background: phase === 'easy' ? C.greenLight : '#f0f0f0',
              color: phase === 'easy' ? C.green : C.textLight,
              border: `1.5px solid ${phase === 'easy' ? C.green : '#ddd'}`,
              borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 700,
            }}>① Makkelijker</div>
            <div style={{
              background: phase === 'hard' ? C.pinkLight : '#f0f0f0',
              color: phase === 'hard' ? C.pink : C.textLight,
              border: `1.5px solid ${phase === 'hard' ? C.pink : '#ddd'}`,
              borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 700,
            }}>② Moeilijker</div>
          </div>
        )}

        {/* Streak voortgang */}
        {phase !== 'done' && (
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
            {streak.level === 'easy' ? (
              <>
                <span>Niveau: makkelijk</span>
                <span style={{ color: C.textLight }}>·</span>
                <span>{streak.correctStreak}/3 goed voor moeilijker</span>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                    background: i < streak.correctStreak ? C.green : '#ddd' }} />
                ))}
              </>
            ) : (
              <>
                <span style={{ fontWeight: 600 }}>Niveau: moeilijk</span>
                {streak.incorrectStreak > 0 && (
                  <>
                    <span style={{ color: C.textLight }}>·</span>
                    <span>{streak.incorrectStreak}/2 fout voor makkelijker</span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Level-up / level-down melding */}
        {levelMsg && (
          <div style={{
            background: levelMsg === 'up' ? C.greenLight : '#FFF3E0',
            border: `1.5px solid ${levelMsg === 'up' ? C.green : '#FF9800'}`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            fontSize: 14, fontWeight: 700, textAlign: 'center',
            color: levelMsg === 'up' ? C.green : '#E65100',
          }}>
            {levelMsg === 'up'
              ? '⬆ Goed bezig! Je gaat naar moeilijker niveau.'
              : '⬇ Geen zorgen! Je gaat terug naar het makkelijkere niveau.'}
          </div>
        )}

        {/* ── Klaar-scherm ── */}
        {phase === 'done' ? (
          <div style={{ background: C.white, borderRadius: 16, padding: 40,
            textAlign: 'center', border: `1px solid ${C.border}`,
            boxShadow: '0 4px 24px rgba(109,32,119,0.08)' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginBottom: 10 }}>
              Super gedaan!
            </div>
            <div style={{ fontSize: 15, color: C.textMid, marginBottom: 28 }}>
              Je hebt beide niveaus afgerond!
            </div>
            <Link href="/student">
              <button type="button" style={{ background: C.purple, color: 'white', border: 'none',
                borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15,
                cursor: 'pointer' }}>
                Nog een oefening →
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ background: C.white, borderRadius: 16, padding: 28,
            border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(109,32,119,0.08)' }}>

            {/* Vraagstekst */}
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 24,
              lineHeight: 1.7, background: C.bg, borderRadius: 10, padding: '16px 18px',
              border: `1px solid ${C.border}` }}>
              {questionText}
            </div>

            {/* Invoerveld */}
            {renderInput()}

            {/* Submit / feedback */}
            {!submitted ? (
              <button type="button" onClick={handleSubmit} disabled={isMathType ? !mathAnswersComplete : !answer}
                style={{ marginTop: 24, background: C.purple, color: 'white', border: 'none',
                  borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15,
                  opacity: (isMathType ? mathAnswersComplete : !!answer) ? 1 : 0.4,
                  cursor: (isMathType ? mathAnswersComplete : !!answer) ? 'pointer' : 'not-allowed' }}>
                Antwoord controleren →
              </button>
            ) : (
              <div style={{ marginTop: 24 }}>
                {/* Build mode shows its own feedback inside BlokkenBouwselInteractive */}
                {!isBuildMode && (
                  <div style={{
                    background: isAnswerCorrect === false ? C.redLight : C.greenLight,
                    borderRadius: 12, padding: '14px 18px',
                    border: `1.5px solid ${isAnswerCorrect === false ? C.red : C.green}`,
                    marginBottom: 16,
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4,
                      color: isAnswerCorrect === false ? C.red : C.green }}>
                      {isAnswerCorrect === false ? '✗ Niet helemaal goed…' : '✓ Goed gedaan!'}
                    </div>
                    <div style={{ fontSize: 13, color: C.text }}>
                      {isAnswerCorrect === false
                        ? isMathType
                          ? 'Kijk naar de rode vakjes — het goede antwoord staat erbij.'
                          : isTellenMode
                            ? `Tel nog eens! Het goede antwoord is ${blockTotalCount}.`
                            : isGoedFoutMode
                              ? `Niet goed. Het antwoord is: ${goedFoutCorrectAnswer}.`
                              : 'Kijk nog eens goed naar de plattegrond.'
                        : phase === 'easy' && hasVariants
                          ? 'Klaar voor de moeilijkere versie?'
                          : 'Je hebt de oefening afgerond!'}
                    </div>
                  </div>
                )}

                {phase === 'easy' && hasVariants && (
                  isAnswerCorrect === false && isMathType ? (
                    <button type="button" onClick={handleRetry}
                      style={{ background: C.purple, color: 'white', border: 'none',
                        borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      ← Probeer opnieuw met nieuwe sommen
                    </button>
                  ) : (
                    <button type="button" onClick={handleNextLevel}
                      style={{ background: `linear-gradient(135deg, ${C.pink}, #A0004A)`,
                        color: 'white', border: 'none', borderRadius: 10,
                        padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      Moeilijkere versie proberen →
                    </button>
                  )
                )}

                {phase === 'hard' && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: isBuildMode ? 12 : 0 }}>
                    {isAnswerCorrect === false && isMathType && (
                      <button type="button" onClick={handleRetry}
                        style={{ background: C.purple, color: 'white', border: 'none',
                          borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                        ← Probeer opnieuw
                      </button>
                    )}
                    <button type="button" onClick={handleDone}
                      style={{ background: C.green, color: 'white', border: 'none',
                        borderRadius: 10, padding: '13px 32px', fontWeight: 700,
                        fontSize: 15, cursor: 'pointer' }}>
                      🎉 Afronden
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <SubmissionHistory exerciseId={exercise.id} />
      </div>
    </div>
  );
}
