'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { C } from '@/lib/colors';
import { BlokkenBouwselInteractive, gridsEqual, CubePreview, PlanGridDisplay, clampGrid } from '@/components/blokken-bouwsel';
import { GetallenLijnInteractief } from '@/components/getallenlijn';
import { GeldTellenInteractief } from '@/components/geld-tellen';
import { TafelSpinInteractief } from '@/components/tafel-spin';
import SubmissionHistory from '@/components/SubmissionHistory';
import { getProgress, recordAttempt } from '@/lib/progress';
import { generateFreshRekensomData, generateFreshBlokkenData, THEMA_EMOJIS, parseSomNums } from '@/lib/math-generator';

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
  'geld_tellen':          'Je telt euro-briefjes en munten op en berekent het totaalbedrag.',
  'tafel_spin':           'Je oefent de tafels door keer- en deelsommen in te vullen op het spinnenweb.',
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

// ── Uitleg-generator: kindvriendelijke uitleg bij fout antwoord ──────
function generateUitleg(som, questionType) {
  if (!som) return null;

  // Vul-in sommen: meerdere formaten herkennen
  if (questionType === 'vul_in') {
    const tekst = som.tekst;
    const answer = som.antwoord;

    // Format: a + b = ___ of a - b = ___
    const fmtResult = tekst.match(/^(\d+)\s*([+\-−])\s*(\d+)\s*=\s*___/);
    if (fmtResult) {
      const a = parseInt(fmtResult[1]), op = fmtResult[2], b = parseInt(fmtResult[3]);
      const isAdd = op === '+';
      const isSub = op === '-' || op === '−';
      if (isAdd) {
        if (b <= 5) {
          const steps = Array.from({ length: b }, (_, i) => a + i + 1);
          return `Tel ${b} verder vanaf ${a}: ${steps.join(', ')}. Dus ${a} + ${b} = ${answer}.`;
        }
        return `${a} + ${b} = ${answer}. Tip: splits ${b} in stukjes die makkelijker zijn!`;
      }
      if (isSub) {
        if (b <= 5) {
          const steps = Array.from({ length: b }, (_, i) => a - i - 1);
          return `Tel ${b} terug vanaf ${a}: ${steps.join(', ')}. Dus ${a} − ${b} = ${answer}.`;
        }
        return `${a} − ${b} = ${answer}. Tip: hoeveel moet je van ${a} afhalen om op ${answer} te komen?`;
      }
    }

    // Format: a + ___ = c  (vul aan)
    const fmtMid = tekst.match(/^(\d+)\s*([+\-−])\s*___\s*=\s*(\d+)/);
    if (fmtMid) {
      const a = parseInt(fmtMid[1]), op = fmtMid[2], c = parseInt(fmtMid[3]);
      const isAdd = op === '+';
      const isSub = op === '-' || op === '−';
      if (isAdd) return `Hoeveel moet je bij ${a} optellen om ${c} te krijgen? ${c} − ${a} = ${answer}.`;
      if (isSub) return `Hoeveel moet je van ${a} afhalen om ${c} te krijgen? ${a} − ${c} = ${answer}.`;
    }

    // Format: ___ + b = c  of  ___ - b = c
    const fmtStart = tekst.match(/^___\s*([+\-−])\s*(\d+)\s*=\s*(\d+)/);
    if (fmtStart) {
      const op = fmtStart[1], b = parseInt(fmtStart[2]), c = parseInt(fmtStart[3]);
      const isAdd = op === '+';
      const isSub = op === '-' || op === '−';
      if (isAdd) return `Welk getal plus ${b} is ${c}? ${c} − ${b} = ${answer}.`;
      if (isSub) return `Welk getal min ${b} is ${c}? ${c} + ${b} = ${answer}.`;
    }

    // Format: a × b = ___ (vermenigvuldiging / tafelsommen)
    const fmtMul = tekst.match(/^(\d+)\s*[×x*]\s*(\d+)\s*=\s*___/);
    if (fmtMul) {
      const a = parseInt(fmtMul[1]), b = parseInt(fmtMul[2]);
      return `${a} × ${b} = ${answer}. Tip: tel ${a} keer het getal ${b} op!`;
    }

    return `Het goede antwoord is ${answer}.`;
  }

  // Goed/fout stellingen: leg uit waarom het goed of fout is
  if (questionType === 'goed_fout') {
    const m = som.tekst.match(/^(\d+)\s*([+\-−×x*])\s*(\d+)\s*=\s*(\d+)/);
    if (!m) return som.klopt ? 'Deze som klopt!' : 'Deze som klopt niet.';
    const a = parseInt(m[1]);
    const opChar = m[2];
    const b = parseInt(m[3]);
    const shown = parseInt(m[4]);
    const isAdd = opChar === '+';
    const isSub = opChar === '-' || opChar === '−';
    const isMul = opChar === '×' || opChar === 'x' || opChar === '*';
    const real = isAdd ? a + b : isSub ? a - b : isMul ? a * b : null;
    if (real === null) return som.klopt ? 'Deze som klopt!' : 'Deze som klopt niet.';
    if (som.klopt) {
      return `${a} ${opChar} ${b} = ${shown} klopt! Goed gezien.`;
    }
    return `${a} ${opChar} ${b} = ${real}, niet ${shown}. Dus deze som klopt niet.`;
  }

  return null;
}

// Geld-tellen uitleg — werkt voor zowel 'tellen' als 'wisselgeld' modus
function generateGeldUitleg(geldData) {
  if (!geldData || geldData.totaal == null) return null;

  const fmt = (n) => `€${Number(n).toFixed(2).replace('.', ',')}`;
  const isWisselgeld = geldData.modus === 'wisselgeld';

  if (isWisselgeld && geldData.prijs != null) {
    // Wisselgeld: bereken betaald bedrag, trek prijs af
    const items = (geldData.items || []).filter(i => i.waarde > 0 && i.aantal > 0);
    const betaald = items.reduce((s, it) => s + it.waarde * it.aantal, 0);
    const betaaldParts = [];
    for (const item of items) {
      const label = item.waarde >= 1 ? `€${item.waarde}` : `${Math.round(item.waarde * 100)}ct`;
      for (let n = 0; n < item.aantal; n++) betaaldParts.push(label);
    }
    const betaaldStr = betaaldParts.length > 1 ? `${betaaldParts.join(' + ')} = ${fmt(betaald)}` : fmt(betaald);
    return `Je betaalt ${betaaldStr} en het kost ${fmt(geldData.prijs)}. Wisselgeld: ${fmt(betaald)} − ${fmt(geldData.prijs)} = ${fmt(geldData.totaal)}.`;
  }

  // Tellen-modus: tel alle munten en briefjes op
  const items = (geldData.items || []).filter(i => i.waarde > 0 && i.aantal > 0);
  const parts = [];
  for (const item of items) {
    const label = item.waarde >= 1 ? `€${item.waarde}` : `${Math.round(item.waarde * 100)}ct`;
    for (let n = 0; n < item.aantal; n++) parts.push(label);
  }
  if (parts.length === 0) return null;
  return `Tel alle bedragen bij elkaar op: ${parts.join(' + ')} = ${fmt(geldData.totaal)}.`;
}

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

export default function ExercisePage({ exercise, allExercises = [] }) {
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
  const [mastered, setMastered]   = useState(false);
  const [freshBlockData, setFreshBlockData] = useState(null);
  const recorded = useRef(false);

  const [mounted, setMounted] = useState(false);

  // Initialize session ID on mount
  useEffect(() => {
    setMounted(true);
    setSessionId(getSessionId());
  }, []);

  const easyVariant = exercise.variants?.[0];
  const hardVariant = exercise.variants?.[1];
  const hasVariants = !!(easyVariant && hardVariant);

  // Math question type detection
  const MATH_TYPES = ['vul_in', 'goed_fout', 'vermenigvuldig_tabel', 'getallenlijn', 'geld_tellen', 'tafel_spin'];
  const isMathType = MATH_TYPES.includes(exercise.question_type);
  const activeRekensomData = isMathType
    ? ((phase === 'hard' ? hardVariant?.rekensom_data : easyVariant?.rekensom_data) ?? exercise.rekensom_data)
    : null;

  // Verse vragen worden gegenereerd via useEffect; tot die tijd valt terug op activeRekensomData
  const displayRekensomData = currentRekensomData ?? activeRekensomData;

  const isBlockQuestion = exercise.question_type === 'blokken_bouwsel';
  // Effectieve block data: verse data overschrijft originele exercise data
  const blockEx = freshBlockData ? { ...exercise, ...freshBlockData } : exercise;

  const VALID_BLOCK_TYPES = ['tellen', 'goedFout', 'bouwen', 'meerkeuze'];
  const blockInteractionType = isBlockQuestion
    ? (VALID_BLOCK_TYPES.includes(exercise.block_interaction_type)
        ? exercise.block_interaction_type
        : (blockEx.block_option_a_grid?.length && blockEx.block_option_b_grid?.length
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
  const maxH = blockEx.block_max_height || 5;

  // Bij laden: haal opgeslagen studentniveau op en bepaal startfase
  useEffect(() => {
    const p = getProgress(exercise.id);
    setStreak(p);
    // Niveau bepaalt startvariant:
    //   easy   → alleen easy variant
    //   medium → easy, dan hard (standaard flow)
    //   hard   → start direct op hard variant
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
  const blockTotalCount = isTellenMode && blockEx.block_plan_grid
    ? blockEx.block_plan_grid.flat().reduce((s, v) => s + v, 0)
    : null;

  const goedFoutCorrectAnswer = isGoedFoutMode
    ? (blockEx.block_correct_option === 'A' ? 'Goed' : 'Fout')
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
        if (exercise.question_type === 'geld_tellen') {
          const rekData = displayRekensomData ?? exercise.rekensom_data;
          const gvt = rekData?.geld_vraag_type || 'invul';
          if (gvt === 'meerkeuze')
            return parseInt(mathAnswers[0]) === rekData?.correct_optie;
          if (gvt === 'goed_fout')
            return (mathAnswers[0] === 'Goed') === rekData?.klopt;
          const inputVal = String(mathAnswers[0] || '').replace(',', '.').trim();
          const studentAmount = parseFloat(inputVal);
          return !isNaN(studentAmount) && rekData?.totaal != null && Math.abs(studentAmount - rekData.totaal) < 0.005;
        }
        if (exercise.question_type === 'tafel_spin') {
          const vragen = displayRekensomData.vragen || [];
          const tvt = displayRekensomData.tafel_vraag_type || 'invul';
          if (tvt === 'meerkeuze')
            return vragen.length > 0 && vragen.every((v, i) => parseInt(mathAnswers[i]) === v.correct_optie_index);
          return vragen.length > 0 && vragen.every((v, i) => Number(mathAnswers[i]) === v.antwoord);
        }
        return false;
      })()
    : null;

  const isAnswerCorrect = submitted
    ? isMathType
      ? mathIsCorrect
      : isBuildMode
        ? gridsEqual(answer, blockEx.block_plan_grid)
        : isTellenMode
          ? Number(answer) === blockTotalCount
          : isGoedFoutMode
            ? answer === goedFoutCorrectAnswer
            : isBlockQuestion
              ? answer === blockEx.block_correct_option
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
  // NB: fase-wissel gebeurt NIET hier — dat doet handleRetry/handleDone,
  // zodat de leerling eerst feedback op het huidige antwoord ziet.
  const record = (correct) => {
    if (recorded.current) return;
    recorded.current = true;
    const { progress: updated, levelChange } = recordAttempt(exercise.id, correct);
    setStreak(updated);
    if (levelChange) {
      setLevelMsg(levelChange);
      setTimeout(() => setLevelMsg(null), 6000);
    }
    // 3x goed op hard → klaar! (automatisch naar done na 3s)
    if (correct && updated.level === 'hard' && updated.correctStreak >= 3) {
      setMastered(true);
      setTimeout(() => setPhase('done'), 3500);
    }
  };

  // Auto-record elke poging (goed én fout) in het streak-systeem
  useEffect(() => {
    if (submitted && isCorrect === true) {
      record(true);
    } else if (submitted && isCorrect === false) {
      record(false);
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
    // Nieuwe blokken bij overgang naar moeilijker niveau
    if (isBlockQuestion) {
      setFreshBlockData(generateFreshBlokkenData(exercise));
    }
  };

  const handleRetry = () => {
    setAnswer('');
    setMathAnswers({});
    setSubmitted(false);
    recorded.current = false; // Reset zodat volgende poging ook geregistreerd wordt
    setInputKey(k => k + 1);

    // Lees huidig niveau uit progress en pas fase aan
    const currentProgress = getProgress(exercise.id);
    const newPhase = (currentProgress.level === 'hard' && hasVariants) ? 'hard' : 'easy';
    setPhase(newPhase);

    if (isMathType) {
      const data = (newPhase === 'hard' ? hardVariant?.rekensom_data : easyVariant?.rekensom_data) ?? exercise.rekensom_data;
      setCurrentRekensomData(data ? generateFreshRekensomData(data, exercise.question_type, 5) : null);
    }

    // Genereer vers blokkenbouwsel
    if (isBlockQuestion) {
      setFreshBlockData(generateFreshBlokkenData(exercise));
    }
  };

  const handleSkip = () => {
    record(false); // opgeven = fout voor streak
    if (phase === 'easy' && hasVariants && streak.level !== 'easy') {
      // Medium/hard niveau: ga door naar hard variant
      setAnswer('');
      setMathAnswers({});
      setSubmitted(false);
      setAttempts(0);
      recorded.current = false;
      setPhase('hard');
      if (isBlockQuestion) setFreshBlockData(generateFreshBlokkenData(exercise));
    } else {
      setPhase('done');
    }
  };

  const handleDone = () => {
    // Alleen als correct registreren als we echt weten dat het goed was
    if (isCorrect === true) record(true);
    setPhase('done');
  };

  // Geen auto-advance meer — leerling kiest zelf via knoppen
  // (Volgende som / Uitdagingsversie / Afronden)

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
        if (exercise.question_type === 'geld_tellen') {
          return mathAnswers[0] !== undefined && String(mathAnswers[0]).trim() !== '';
        }
        if (exercise.question_type === 'tafel_spin') {
          const vragen = displayRekensomData.vragen || [];
          return vragen.length > 0 && vragen.every((_, i) => mathAnswers[i] !== undefined && String(mathAnswers[i]).trim() !== '');
        }
        return false;
      })()
    : false;

  // ── Input op basis van vraagtype ──────────────────────────────────────
  const renderInput = () => {

    // Wacht op client-side mount voor math-types (voorkomt hydration mismatch door random getallen)
    if (isMathType && !mounted) {
      return (
        <div style={{ padding: 20, textAlign: 'center', color: C.textMid, fontSize: 14 }}>
          Oefening laden...
        </div>
      );
    }

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
            const hasVerhaal = !!som.verhaal_tekst;

            return (
              <div key={i} style={{
                display: 'flex', flexDirection: hasVerhaal ? 'column' : 'row',
                alignItems: hasVerhaal ? 'stretch' : 'center', gap: hasVerhaal ? 10 : 10,
                background: submitted ? (isRight ? C.greenLight : C.redLight) : C.bg,
                border: `1.5px solid ${submitted ? (isRight ? C.green : C.red) : C.border}`,
                borderRadius: 10, padding: hasVerhaal ? '14px 16px' : '10px 16px', flexWrap: 'wrap',
              }}>
                {/* Verhaaltje per som */}
                {hasVerhaal ? (
                  <>
                    <div style={{ fontSize: 15, color: C.text, lineHeight: 1.6 }}>
                      <span style={{ fontSize: 17, marginRight: 6 }}>📖</span>
                      {som.verhaal_tekst}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.textMid }}>Antwoord:</span>
                      <input
                        type="number"
                        value={userVal}
                        onChange={e => !submitted && setMathAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                        disabled={submitted}
                        placeholder="?"
                        style={{
                          width: 80, fontSize: 20, fontWeight: 700, textAlign: 'center',
                          border: `2px solid ${submitted ? (isRight ? C.green : C.red) : C.purple}`,
                          borderRadius: 8, padding: '6px 4px', fontFamily: 'monospace',
                          color: C.text, background: submitted ? 'transparent' : C.white,
                        }}
                      />
                      {submitted && !isRight && (
                        <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>
                          → {som.antwoord}
                        </span>
                      )}
                      {submitted && isRight && (
                        <span style={{ fontSize: 16, color: C.green }}>✓</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
                {!submitted && attempts > 0 && <EmojiHint som={som} emoji={emoji} />}
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
      const { operator, factor, rijen, verhaal } = displayRekensomData;
      let blankIndex = 0;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Verhaalcontext */}
          {verhaal && (
            <div style={{
              background: '#FFF8E1', border: `1.5px solid #FFD54F`,
              borderRadius: 10, padding: '10px 14px',
              fontSize: 14, color: C.text, lineHeight: 1.5,
            }}>
              <span style={{ fontSize: 16, marginRight: 6 }}>📖</span>
              <strong>{verhaal.zin}</strong>
              {verhaal.vraag && <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>{verhaal.vraag}</div>}
            </div>
          )}
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

    // ── Geld tellen: euro briefjes en munten ──
    if (exercise.question_type === 'geld_tellen') {
      const geldData = displayRekensomData ?? exercise.rekensom_data;
      if (geldData?.items) {
        return (
          <GeldTellenInteractief
            key={`gt-${phase}-${inputKey}`}
            data={geldData}
            submitted={submitted}
            value={mathAnswers[0] ?? ''}
            onAnswerChange={(val) => setMathAnswers(prev => ({ ...prev, 0: val }))}
            isCorrect={submitted ? mathIsCorrect : null}
          />
        );
      }
    }

    // ── Tafel spin: spinnenweb met aapje in het midden ──
    if (exercise.question_type === 'tafel_spin') {
      const spinData = displayRekensomData ?? exercise.rekensom_data;
      if (spinData?.vragen?.length) {
        return (
          <TafelSpinInteractief
            key={`ts-${phase}-${inputKey}`}
            data={spinData}
            submitted={submitted}
            mathAnswers={mathAnswers}
            onAnswerChange={(i, val) => setMathAnswers(prev => ({ ...prev, [i]: val }))}
          />
        );
      }
    }

    if (isBlockQuestion && isTellenMode) {
      const displayGrid = clampGrid(
        blockEx.block_goal_grid || blockEx.block_plan_grid || blockEx.block_option_a_grid,
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
      const shownGrid = clampGrid(blockEx.block_option_a_grid || blockEx.block_goal_grid, maxH);
      const planGrid = clampGrid(blockEx.block_plan_grid || blockEx.block_goal_grid, maxH);
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
      const targetGrid = clampGrid(blockEx.block_goal_grid || blockEx.block_plan_grid, maxH);
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
            key={`blk-build-${inputKey}`}
            goalGrid={blockEx.block_goal_grid}
            planGrid={blockEx.block_plan_grid}
            optionAGrid={blockEx.block_option_a_grid}
            optionBGrid={blockEx.block_option_b_grid}
            correctOption={blockEx.block_correct_option}
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
        key={`blk-mc-${inputKey}`}
        goalGrid={blockEx.block_goal_grid}
        planGrid={blockEx.block_plan_grid}
        optionAGrid={blockEx.block_option_a_grid}
        optionBGrid={blockEx.block_option_b_grid}
        correctOption={blockEx.block_correct_option}
        maxHeight={maxH}
        onAnswered={(val) => setAnswer(val)}
        disabled={submitted}
        buildMode={false}
        showFeedback={submitted}
      />
    );

    if (exercise.type === 'Invulvraag') {
      const blockGrid = blockEx.block_goal_grid?.length > 0
        ? clampGrid(blockEx.block_goal_grid, maxH)
        : blockEx.block_plan_grid?.length > 0
          ? clampGrid(blockEx.block_plan_grid, maxH)
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
      const blockGrid = blockEx.block_goal_grid?.length > 0
        ? clampGrid(blockEx.block_goal_grid, maxH)
        : blockEx.block_plan_grid?.length > 0
          ? clampGrid(blockEx.block_plan_grid, maxH)
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

        {/* Fase-indicator */}
        {phase !== 'done' && phase === 'hard' && hasVariants && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{
              background: C.pinkLight, color: C.pink,
              border: `1.5px solid ${C.pink}`,
              borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 700,
            }}>Uitdagingsversie</div>
          </div>
        )}

        {/* Streak voortgang — 3 niveaus */}
        {phase !== 'done' && (
          <div style={{ fontSize: 12, color: C.textMid, marginBottom: 20 }}>
            {/* Niveau-balk */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
              {['easy', 'medium', 'hard'].map((lvl, i) => {
                const labels = { easy: '⭐ Makkelijk', medium: '⭐⭐ Gemiddeld', hard: '⭐⭐⭐ Moeilijk' };
                const colors = { easy: C.green, medium: C.orange, hard: C.red };
                const isActive = streak.level === lvl;
                return (
                  <div key={lvl} style={{
                    flex: 1, textAlign: 'center', padding: '6px 8px', borderRadius: 8,
                    fontSize: 11, fontWeight: isActive ? 800 : 500,
                    background: isActive ? colors[lvl] + '22' : '#f5f5f5',
                    border: `2px solid ${isActive ? colors[lvl] : 'transparent'}`,
                    color: isActive ? colors[lvl] : C.textLight,
                    transition: 'all 0.3s ease',
                  }}>
                    {labels[lvl]}
                  </div>
                );
              })}
            </div>
            {/* Streak indicator */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {streak.level !== 'hard' && (
                <>
                  <span>{streak.correctStreak}/3 goed voor niveau omhoog</span>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                      background: i < streak.correctStreak ? C.green : '#ddd',
                      transition: 'background 0.3s ease' }} />
                  ))}
                </>
              )}
              {streak.level !== 'easy' && streak.incorrectStreak > 0 && (
                <>
                  {streak.level !== 'hard' && <span style={{ color: C.textLight, margin: '0 4px' }}>·</span>}
                  <span style={{ color: C.red }}>{streak.incorrectStreak}/2 fout voor niveau omlaag</span>
                  {[0, 1].map(i => (
                    <span key={i} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                      background: i < streak.incorrectStreak ? C.red : '#ddd',
                      transition: 'background 0.3s ease' }} />
                  ))}
                </>
              )}
              {streak.level === 'hard' && (
                <>
                  <span style={{ fontWeight: 600, color: '#F57F17' }}>
                    {streak.correctStreak}/3 goed voor klaar!
                  </span>
                  {[0, 1, 2].map(i => (
                    <span key={`m${i}`} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                      background: i < streak.correctStreak ? '#FFD600' : '#ddd',
                      transition: 'background 0.3s ease' }} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Level-up / level-down melding */}
        {levelMsg && (
          <div style={{
            background: levelMsg === 'up' ? C.greenLight : '#FFF3E0',
            border: `1.5px solid ${levelMsg === 'up' ? C.green : '#FF9800'}`,
            borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            fontSize: 15, fontWeight: 700, textAlign: 'center',
            color: levelMsg === 'up' ? C.green : '#E65100',
            animation: 'fadeIn 0.4s ease',
          }}>
            {levelMsg === 'up'
              ? streak.level === 'medium'
                ? '⬆ Goed bezig! Je gaat naar gemiddeld niveau.'
                : '⬆ Super! Je gaat naar het moeilijkste niveau!'
              : streak.level === 'medium'
                ? '⬇ Geen zorgen! Je gaat terug naar gemiddeld niveau.'
                : '⬇ Geen zorgen! Je gaat terug naar het makkelijke niveau.'}
          </div>
        )}

        {/* Mastery melding: 3x goed op hard = klaar! */}
        {mastered && phase !== 'done' && (
          <div style={{
            background: 'linear-gradient(135deg, #FFF8E1, #FFFDE7)',
            border: '2px solid #FFD600',
            borderRadius: 14, padding: '20px 24px', marginBottom: 20,
            textAlign: 'center', animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{ fontSize: 48, marginBottom: 6 }}>🏆</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#F57F17' }}>
              Super gedaan! 3× goed op het moeilijkste niveau!
            </div>
            <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>
              Je gaat zo naar het overzicht...
            </div>
          </div>
        )}

        {/* ── Klaar-scherm ── */}
        {phase === 'done' ? (() => {
          // Bepaal volgende oefening:
          // Prioriteit: zelfde question_type > zelfde topic > volgende in lijst
          const currentIdx = allExercises.findIndex(e => e.id === exercise.id);
          const others = allExercises.filter(e => e.id !== exercise.id);
          const sameQuestionType = others.filter(e => e.question_type === exercise.question_type);
          const nextInList = currentIdx >= 0 && currentIdx < allExercises.length - 1
            ? allExercises[currentIdx + 1] : others[0];

          let nextExercise, nextLabel;
          if (sameQuestionType.length > 0) {
            nextExercise = sameQuestionType[0];
            nextLabel = 'Volgende vraag (zelfde type) →';
          } else if (nextInList) {
            nextExercise = nextInList;
            nextLabel = 'Volgende oefening →';
          } else {
            nextExercise = null;
            nextLabel = null;
          }
          const nextId = nextExercise?.id || null;
          return (
            <div style={{ background: `linear-gradient(135deg, ${C.white}, #F7F2FB)`,
              borderRadius: 20, padding: '44px 32px',
              textAlign: 'center', border: `2px solid ${C.green}`,
              boxShadow: '0 8px 32px rgba(109,32,119,0.12)' }}>
              <div style={{ fontSize: 72, marginBottom: 12 }}>
                {mastered ? '🏆' : streak.level === 'hard' ? '⭐' : streak.level === 'medium' ? '🌟' : '🎉'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: mastered ? '#F57F17' : C.green, marginBottom: 8 }}>
                {mastered
                  ? 'Superknap!'
                  : ['Geweldig!', 'Super gedaan!', 'Fantastisch!', 'Top!'][Math.floor(Date.now() / 1000) % 4]}
              </div>
              <div style={{ fontSize: 16, color: C.textMid, marginBottom: 8, lineHeight: 1.6 }}>
                {mastered
                  ? 'Je hebt 3× goed gescoord op het moeilijkste niveau. Knap!'
                  : streak.level === 'easy'
                    ? 'Je hebt de oefening afgerond!'
                    : 'Je hebt alle versies van deze oefening afgerond!'}
              </div>
              <div style={{ fontSize: 13, color: C.textLight, marginBottom: 24 }}>
                Totaal: {streak.totalCorrect} van {streak.totalAttempts} goed
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {nextId && (
                  <Link href={`/student/${nextId}`}>
                    <button type="button" style={{ background: C.purple, color: 'white', border: 'none',
                      borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15,
                      cursor: 'pointer' }}>
                      {nextLabel}
                    </button>
                  </Link>
                )}
                <Link href="/student">
                  <button type="button" style={{ background: C.white, color: C.purple,
                    border: `2px solid ${C.purple}`,
                    borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15,
                    cursor: 'pointer' }}>
                    ← Terug naar menu
                  </button>
                </Link>
              </div>
            </div>
          );
        })() : (
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
                        : phase === 'easy' && hasVariants && streak.level !== 'easy'
                          ? 'Goed! Nu de uitdagingsversie van deze oefening.'
                          : 'Je hebt de oefening afgerond!'}
                    </div>

                    {/* Uitleg per som bij fout antwoord */}
                    {isAnswerCorrect === false && isMathType && displayRekensomData && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.red}33` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          💡 Zo doe je het:
                        </div>
                        {exercise.question_type === 'vul_in' && displayRekensomData.sommen && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {displayRekensomData.sommen.map((som, i) => {
                              if (Number(mathAnswers[i]) === som.antwoord) return null; // skip goed beantwoorde
                              const uitleg = generateUitleg(som, 'vul_in');
                              if (!uitleg) return null;
                              return (
                                <div key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.5,
                                  background: '#fff', borderRadius: 8, padding: '8px 12px',
                                  border: `1px solid ${C.border}` }}>
                                  {uitleg}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {exercise.question_type === 'goed_fout' && displayRekensomData.stellingen && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {displayRekensomData.stellingen.map((stelling, i) => {
                              const correctAns = stelling.klopt ? 'Goed' : 'Fout';
                              if (mathAnswers[i] === correctAns) return null;
                              const uitleg = generateUitleg(stelling, 'goed_fout');
                              if (!uitleg) return null;
                              return (
                                <div key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.5,
                                  background: '#fff', borderRadius: 8, padding: '8px 12px',
                                  border: `1px solid ${C.border}` }}>
                                  {uitleg}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {exercise.question_type === 'geld_tellen' && (() => {
                          const geldData = displayRekensomData ?? exercise.rekensom_data;
                          const uitleg = generateGeldUitleg(geldData);
                          if (!uitleg) return null;
                          return (
                            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5,
                              background: '#fff', borderRadius: 8, padding: '8px 12px',
                              border: `1px solid ${C.border}` }}>
                              {uitleg}
                            </div>
                          );
                        })()}
                        {exercise.question_type === 'getallenlijn' && displayRekensomData?.te_plaatsen && (() => {
                          const stap = displayRekensomData.stap ?? 1;
                          const lijnMin = displayRekensomData.lijn_min ?? 0;
                          const lijnMax = displayRekensomData.lijn_max ?? 1000;
                          const gegeven = [...(displayRekensomData.gegeven_getallen ?? [lijnMin, lijnMax])].sort((a, b) => a - b);
                          const fout = displayRekensomData.te_plaatsen.filter(pos => Number(mathAnswers[pos]) !== pos);
                          if (fout.length === 0) return null;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {fout.map(pos => {
                                // Vind de twee dichtstbijzijnde ankerpunten (zichtbare labels op de lijn)
                                let lower = gegeven[0], upper = gegeven[gegeven.length - 1];
                                for (let i = 0; i < gegeven.length - 1; i++) {
                                  if (pos >= gegeven[i] && pos <= gegeven[i + 1]) {
                                    lower = gegeven[i];
                                    upper = gegeven[i + 1];
                                    break;
                                  }
                                }
                                const verschil = pos - lower;
                                const bereik = upper - lower;
                                const fraction = bereik > 0 ? verschil / bereik : 0;
                                const aantalStreepjes = stap > 0 ? Math.round(verschil / stap) : 0;

                                // Kindvriendelijke positiebeschrijving
                                let waar;
                                if (fraction <= 0.15) waar = `heel dicht bij ${lower}`;
                                else if (fraction >= 0.45 && fraction <= 0.55) waar = `halverwege ${lower} en ${upper}`;
                                else if (fraction >= 0.85) waar = `bijna bij ${upper}`;
                                else if (fraction < 0.5) waar = `tussen ${lower} en het midden`;
                                else waar = `voorbij het midden, richting ${upper}`;

                                // Tel-hint (alleen als het niet te veel streepjes zijn)
                                const telTekst = aantalStreepjes > 0 && aantalStreepjes <= 10
                                  ? ` Tel ${aantalStreepjes} streepje${aantalStreepjes !== 1 ? 's' : ''} vanaf ${lower}.`
                                  : '';

                                return (
                                  <div key={pos} style={{ fontSize: 13, color: C.text, lineHeight: 1.6,
                                    background: '#fff', borderRadius: 8, padding: '8px 12px',
                                    border: `1px solid ${C.border}` }}>
                                    <strong>{pos}</strong> ligt tussen <strong>{lower}</strong> en <strong>{upper}</strong>.
                                    {` Het is ${verschil} meer dan ${lower} — dat is ${waar}.${telTekst}`}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: isBuildMode ? 12 : 0 }}>
                  {isAnswerCorrect === false && (isMathType || isBlockQuestion) && (
                    <button type="button" onClick={handleRetry}
                      style={{ background: C.purple, color: 'white', border: 'none',
                        borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      ← Probeer opnieuw
                    </button>
                  )}
                  {isAnswerCorrect === true && (isMathType || isBlockQuestion) && (
                    <button type="button" onClick={handleRetry}
                      style={{ background: C.purple, color: 'white', border: 'none',
                        borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                      {isBlockQuestion ? 'Volgende opdracht →' : 'Volgende som →'}
                    </button>
                  )}
                  <button type="button" onClick={handleDone}
                    style={{ background: C.white, color: C.purple,
                      border: `2px solid ${C.purple}`,
                      borderRadius: 10, padding: '13px 32px', fontWeight: 700,
                      fontSize: 15, cursor: 'pointer' }}>
                    Afronden
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <SubmissionHistory exerciseId={exercise.id} />
      </div>
    </div>
  );
}
