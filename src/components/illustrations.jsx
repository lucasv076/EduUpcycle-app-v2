'use client';

// ── SVG Illustraties in Zwijsen-stijl ────────────────────────────────
// Worden dynamisch gegenereerd op basis van exercise type/topic.
// Dit zijn standaard illustraties per vraagtype die worden getoond
// naast de oefening in de detail-view.

import { C } from '@/lib/colors';

// Vierkantgetallen illustratie (rekenen)
export function SquareNumbersIllustration() {
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:8,display:'block'}}>
      <rect width="320" height="180" rx="8" fill="#FFFBF0"/>
      <defs><pattern id="g1" width="18" height="18" patternUnits="userSpaceOnUse">
        <path d="M18 0L0 0 0 18" fill="none" stroke="#E5D8A0" strokeWidth="0.7"/>
      </pattern></defs>
      <rect width="320" height="180" rx="8" fill="url(#g1)"/>
      <rect x="20" y="110" width="18" height="18" rx="2" fill="#E8421D" opacity="0.85"/>
      <text x="29" y="142" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#E8421D">1</text>
      <text x="29" y="156" textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#9B89AC">1×1</text>
      <rect x="60" y="92" width="36" height="36" rx="2" fill="#F0B400" opacity="0.8"/>
      <line x1="78" y1="92" x2="78" y2="128" stroke="white" strokeWidth="1.5"/>
      <line x1="60" y1="110" x2="96" y2="110" stroke="white" strokeWidth="1.5"/>
      <text x="78" y="142" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#7A5500">4</text>
      <text x="78" y="156" textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#9B89AC">2×2</text>
      <rect x="118" y="74" width="54" height="54" rx="2" fill="#6D2077" opacity="0.75"/>
      <line x1="136" y1="74" x2="136" y2="128" stroke="white" strokeWidth="1.2"/>
      <line x1="154" y1="74" x2="154" y2="128" stroke="white" strokeWidth="1.2"/>
      <line x1="118" y1="92" x2="172" y2="92" stroke="white" strokeWidth="1.2"/>
      <line x1="118" y1="110" x2="172" y2="110" stroke="white" strokeWidth="1.2"/>
      <text x="145" y="142" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#6D2077">9</text>
      <text x="145" y="156" textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#9B89AC">3×3</text>
      <rect x="192" y="56" width="72" height="72" rx="2" fill="#2DAA4F" opacity="0.7"/>
      <line x1="210" y1="56" x2="210" y2="128" stroke="white" strokeWidth="1.2"/>
      <line x1="228" y1="56" x2="228" y2="128" stroke="white" strokeWidth="1.2"/>
      <line x1="246" y1="56" x2="246" y2="128" stroke="white" strokeWidth="1.2"/>
      <line x1="192" y1="74" x2="264" y2="74" stroke="white" strokeWidth="1.2"/>
      <line x1="192" y1="92" x2="264" y2="92" stroke="white" strokeWidth="1.2"/>
      <line x1="192" y1="110" x2="264" y2="110" stroke="white" strokeWidth="1.2"/>
      <text x="228" y="142" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="13" fill="#1E6B33">16</text>
      <text x="228" y="156" textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#9B89AC">4×4</text>
      <path d="M29 105 L78 87 L145 69 L228 51" fill="none" stroke="#DDD0E6" strokeWidth="1.5" strokeDasharray="4,3"/>
      <circle cx="298" cy="92" r="18" fill="#F0B400"/>
      <text x="298" y="99" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="20" fill="white">?</text>
      <rect x="8" y="8" width="180" height="20" rx="5" fill="#6D2077"/>
      <text x="16" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="white">Vierkantallen: 1, 4, 9, 16…</text>
    </svg>
  );
}

// Tekenopgave illustratie
export function DrawingIllustration() {
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:8,display:'block'}}>
      <rect width="320" height="180" rx="8" fill="#FFFBF0"/>
      <defs><pattern id="g2" width="18" height="18" patternUnits="userSpaceOnUse">
        <path d="M18 0L0 0 0 18" fill="none" stroke="#E5D8A0" strokeWidth="0.7"/>
      </pattern></defs>
      <rect width="320" height="180" rx="8" fill="url(#g2)"/>
      <rect x="22" y="72" width="36" height="36" rx="1" fill="#F0B400" opacity="0.5"/>
      <rect x="22" y="72" width="36" height="36" fill="none" stroke="#1F4FA0" strokeWidth="2.5" rx="2"/>
      <text x="40" y="125" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#1F4FA0">9 hokjes</text>
      <path d="M78 90 Q110 70 138 90" fill="none" stroke="#9B89AC" strokeWidth="1.8" markerEnd="url(#arr2)"/>
      <defs><marker id="arr2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
        <path d="M0,0 L0,6 L7,3 z" fill="#9B89AC"/>
      </marker></defs>
      <text x="108" y="68" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#9B89AC">tekenen!</text>
      <rect x="148" y="54" width="54" height="54" rx="1" fill="#6D2077" opacity="0.35"/>
      <rect x="148" y="54" width="54" height="54" fill="none" stroke="#1F4FA0" strokeWidth="2.5" rx="2"/>
      <text x="175" y="125" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#1F4FA0">__ hokjes</text>
      <rect x="224" y="44" width="72" height="72" fill="none" stroke="#DDD0E6" strokeWidth="1.5" rx="2" strokeDasharray="5,4"/>
      <text x="260" y="86" textAnchor="middle" fontFamily="Arial" fontSize="26" fill="#DDD0E6" fontWeight="900">?</text>
      <text x="260" y="125" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#9B89AC">__ hokjes</text>
      <rect x="8" y="8" width="224" height="20" rx="5" fill="#1F4FA0"/>
      <text x="16" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="white">Teken het kleinste vierkant eromheen</text>
      <circle cx="300" cy="18" r="12" fill="#F0B400"/>
      <text x="300" y="24" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="15" fill="white">?</text>
    </svg>
  );
}

// Manipulatieopdracht illustratie (tegels leggen)
export function TilesIllustration() {
  const colors1 = [['#2DAA4F','#F0B400','#009AA4','#E8421D'],['#F0B400','#6D2077','#2DAA4F','#1F4FA0'],['#009AA4','#E8421D','#F0B400','#2DAA4F']];
  const colors2 = [['#2DAA4F','#F0B400','#009AA4'],['#E8421D','#6D2077','#1F4FA0'],['#F0B400','#2DAA4F','#E8421D']];
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:8,display:'block'}}>
      <rect width="320" height="180" rx="8" fill="#E8F7ED"/>
      {colors1.map((row,ri) =>
        row.map((fill,ci) => <rect key={`t${ri}${ci}`} x={12+ci*26} y={22+ri*26} width="22" height="22" rx="3" fill={fill} stroke="white" strokeWidth="1.5"/>)
      )}
      <text x="64" y="112" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#1E6B33">12 tegels</text>
      <path d="M132 80 L158 80" stroke="#1E6B33" strokeWidth="2.5" markerEnd="url(#arr3)"/>
      <defs><marker id="arr3" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
        <path d="M0,0 L0,6 L7,3 z" fill="#1E6B33"/>
      </marker></defs>
      <text x="145" y="72" textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#1E6B33">leg!</text>
      <rect x="168" y="28" width="108" height="108" rx="3" fill="white" stroke="#2DAA4F" strokeWidth="2"/>
      {colors2.map((row,ri) =>
        row.map((fill,ci) => <rect key={`r${ri}${ci}`} x={172+ci*34} y={32+ri*34} width="30" height="30" rx="2" fill={fill} stroke="white" strokeWidth="1.5"/>)
      )}
      <rect x="192" y="143" width="64" height="18" rx="5" fill="#2DAA4F"/>
      <text x="224" y="155" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="white">9 tegels ✓</text>
      {['#1F4FA0','#6D2077','#009AA4'].map((fill,i) =>
        <rect key={`ov${i}`} x={12+i*26} y={118} width="22" height="22" rx="3" fill={fill} stroke="white" strokeWidth="1.5" opacity="0.4"/>
      )}
      <text x="45" y="156" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#5C4070">3 over</text>
      <rect x="8" y="8" width="120" height="18" rx="5" fill="#2DAA4F"/>
      <text x="16" y="21" fontFamily="Arial" fontWeight="700" fontSize="10" fill="white">{'12 tegels → grootste ▢'}</text>
    </svg>
  );
}

// Vloertjes illustratie (kleuren/patronen)
export function FloorTilesIllustration() {
  const left = [['#F0B400','#E8421D'],['#2DAA4F','#1F4FA0']];
  const right = [['#F0B400','#2DAA4F','#E8421D'],['#1F4FA0','#F0B400','#009AA4'],['#6D2077','#E8421D','#F0B400']];
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:8,display:'block'}}>
      <rect width="320" height="180" rx="8" fill="#FFF8DC"/>
      <rect x="8" y="8" width="172" height="20" rx="5" fill="#F0B400"/>
      <text x="16" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="white">Vloertjes in vierkanten leggen</text>
      <text x="46" y="52" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#7A5500">{'2 vloertjes → 4'}</text>
      {left.map((row,ri) =>
        row.map((fill,ci) => <rect key={`v${ri}${ci}`} x={12+ci*34} y={58+ri*34} width="30" height="30" rx="2" fill={fill} stroke="white" strokeWidth="2"/>)
      )}
      <rect x="18" y="133" width="62" height="16" rx="4" fill="#F0B400"/>
      <text x="49" y="145" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="white">2×2 = 4 ✓</text>
      <text x="218" y="52" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#7A5500">{'3 vloertjes → 9'}</text>
      {right.map((row,ri) =>
        row.map((fill,ci) => <rect key={`w${ri}${ci}`} x={160+ci*34} y={58+ri*34} width="30" height="30" rx="2" fill={fill} stroke="white" strokeWidth="2"/>)
      )}
      <rect x="164" y="133" width="62" height="16" rx="4" fill="#2DAA4F"/>
      <text x="195" y="145" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="white">3×3 = 9 ✓</text>
      <line x1="108" y1="50" x2="108" y2="155" stroke="#DDD0E6" strokeWidth="1.5" strokeDasharray="4,3"/>
      <rect x="8" y="158" width="304" height="16" rx="4" fill="#6D2077"/>
      <text x="160" y="170" textAnchor="middle" fontFamily="Arial" fontSize="10" fontWeight="700" fill="white">Maak met 4 vloertjes een vierkant van 16. Teken en kleur!</text>
    </svg>
  );
}

// Meerkeuze illustratie (generiek)
export function MultipleChoiceIllustration() {
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:8,display:'block'}}>
      <rect width="320" height="180" rx="8" fill="#E8EEF9"/>
      <rect x="8" y="8" width="140" height="20" rx="5" fill="#1F4FA0"/>
      <text x="16" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="white">Kies het juiste antwoord</text>
      {['A', 'B', 'C'].map((letter, i) => (
        <g key={letter}>
          <rect x="30" y={45 + i * 42} width="260" height="34" rx="8" fill="white" stroke={i === 1 ? '#2DAA4F' : '#DDD0E6'} strokeWidth={i === 1 ? 2.5 : 1.5}/>
          <circle cx="54" cy={62 + i * 42} r="12" fill={i === 1 ? '#2DAA4F' : '#F8F3FB'} stroke={i === 1 ? '#2DAA4F' : '#DDD0E6'} strokeWidth="1.5"/>
          <text x="54" y={67 + i * 42} textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="13" fill={i === 1 ? 'white' : '#9B89AC'}>{letter}</text>
          <rect x="76" y={53 + i * 42} width={100 + i * 30} height="10" rx="3" fill={i === 1 ? '#E8F7ED' : '#F0ECF4'} opacity="0.8"/>
        </g>
      ))}
      <text x="160" y="175" textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#9B89AC">Tik op het juiste antwoord</text>
    </svg>
  );
}

// Invulvraag illustratie (generiek)
export function FillInIllustration() {
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:8,display:'block'}}>
      <rect width="320" height="180" rx="8" fill="#E0F5F6"/>
      <rect x="8" y="8" width="120" height="20" rx="5" fill="#009AA4"/>
      <text x="16" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="white">Vul het getal in</text>
      <rect x="24" y="50" width="80" height="14" rx="3" fill="#B0DFE3" opacity="0.6"/>
      <text x="130" y="62" fontFamily="Arial" fontWeight="900" fontSize="22" fill="#009AA4">+</text>
      <rect x="158" y="50" width="80" height="14" rx="3" fill="#B0DFE3" opacity="0.6"/>
      <text x="260" y="62" fontFamily="Arial" fontWeight="900" fontSize="22" fill="#009AA4">=</text>
      <rect x="24" y="80" width="272" height="44" rx="10" fill="white" stroke="#009AA4" strokeWidth="2.5"/>
      <text x="40" y="107" fontFamily="Arial" fontSize="20" fill="#DDD0E6">___</text>
      <line x1="32" y1="108" x2="108" y2="108" stroke="#009AA4" strokeWidth="2" strokeDasharray="4,3"/>
      <circle cx="282" cy="102" r="14" fill="#F0B400"/>
      <text x="282" y="108" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="16" fill="white">?</text>
      <text x="160" y="148" textAnchor="middle" fontFamily="Arial" fontSize="10" fill="#5C4070">Typ je antwoord in het vak</text>
      <rect x="60" y="158" width="200" height="14" rx="3" fill="#B0DFE3" opacity="0.3"/>
    </svg>
  );
}

// Open vraag illustratie (generiek)
export function OpenQuestionIllustration() {
  return (
    <svg width="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:8,display:'block'}}>
      <rect width="320" height="180" rx="8" fill="#E8EEF9"/>
      <rect x="8" y="8" width="110" height="20" rx="5" fill="#1F4FA0"/>
      <text x="16" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="white">Leg uit hoe je…</text>
      <rect x="20" y="42" width="280" height="100" rx="10" fill="white" stroke="#1F4FA0" strokeWidth="2"/>
      {[0,1,2,3].map(i => (
        <rect key={i} x="32" y={56+i*20} width={220 - i*40} height="8" rx="3" fill="#E0E7F4" opacity={1 - i*0.15}/>
      ))}
      <text x="270" y="130" fontFamily="Arial" fontSize="9" fill="#9B89AC">0 / 200</text>
      <circle cx="48" cy="158" r="10" fill="#F0B400" opacity="0.7"/>
      <text x="48" y="163" textAnchor="middle" fontFamily="Arial" fontWeight="900" fontSize="12" fill="white">💡</text>
      <text x="68" y="163" fontFamily="Arial" fontSize="10" fill="#5C4070">Schrijf in je eigen woorden</text>
    </svg>
  );
}

// ── Kies illustratie op basis van exercise type ──────────────────────
const TYPE_ILLUSTRATION_MAP = {
  'Open vraag': OpenQuestionIllustration,
  'Invulvraag': FillInIllustration,
  'Meerkeuze': MultipleChoiceIllustration,
  'Tekenopgave': DrawingIllustration,
  'Manipulatieopdracht': TilesIllustration,
};

/**
 * Geeft een passende illustratie-SVG terug op basis van het exercise type.
 * Als het type onbekend is, wordt een generieke rekenen-illustratie getoond.
 */
export function ExerciseIllustration({ type }) {
  const Component = TYPE_ILLUSTRATION_MAP[type] || SquareNumbersIllustration;
  return <Component />;
}
