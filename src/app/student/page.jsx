// Server Component — haalt alle oefeningen op uit Supabase
import Link from 'next/link';
import { getAllExercises } from '@/lib/supabase';
import { C, TYPE_COLORS } from '@/lib/colors';

const ZwijsenLogo = () => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
    {[['z', C.orange], ['w', C.red], ['ij', C.blue], ['s', C.yellow], ['e', C.green], ['n', C.teal]].map(([l, bg]) => (
      <span key={l} style={{ background: bg, color: 'white', fontWeight: 900, fontSize: 14,
        padding: '2px 6px', borderRadius: 3 }}>{l}</span>
    ))}
  </div>
);

export default async function StudentListPage() {
  let exercises = [];
  let dbError   = null;

  try {
    exercises = await getAllExercises();
  } catch (e) {
    dbError = e.message;
  }

  const typeColors = (type) => TYPE_COLORS[type] ?? { bg: C.purpleLight, text: C.purple };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${C.purpleDark}, ${C.purple})`,
        color: 'white', padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <ZwijsenLogo />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.25)' }} />
        <span style={{ fontWeight: 800, fontSize: 16 }}>Oefeningen</span>
        <span style={{ background: C.yellow, color: C.text, fontSize: 9, fontWeight: 800,
          padding: '2px 7px', borderRadius: 99 }}>LEERLING</span>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.purple, marginBottom: 6 }}>
          Kies een oefening
        </h1>
        <p style={{ color: C.textMid, fontSize: 14, marginBottom: 28 }}>
          Klik op een oefening om te beginnen. Elke oefening heeft een makkelijke en een moeilijkere versie.
        </p>

        {/* Foutmelding als Supabase niet werkt */}
        {dbError && (
          <div style={{ background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 10,
            padding: '12px 16px', marginBottom: 24, fontSize: 13, color: C.red }}>
            ⚠ Database niet bereikbaar: {dbError}
          </div>
        )}

        {/* Leeg */}
        {exercises.length === 0 && !dbError && (
          <div style={{ background: C.white, borderRadius: 12, padding: 40, textAlign: 'center',
            border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, color: C.textMid }}>
              Er staan nog geen oefeningen klaar.
            </div>
            <div style={{ fontSize: 13, color: C.textLight, marginTop: 6 }}>
              De leerkracht moet eerst oefeningen goedkeuren in EduUpcycle.
            </div>
          </div>
        )}

        {/* Oefeningen grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {exercises.map(ex => {
            const tc = typeColors(ex.type);
            return (
              <Link key={ex.id} href={`/student/${ex.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: C.white, borderRadius: 12, padding: '18px 20px',
                  border: `1.5px solid ${C.border}`, transition: 'all 0.15s',
                  boxShadow: '0 2px 8px rgba(109,32,119,0.06)', cursor: 'pointer' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text,
                      lineHeight: 1.4, flex: 1, marginRight: 10 }}>{ex.title}</span>
                    <span style={{ background: tc.bg, color: tc.text, fontSize: 10,
                      fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      whiteSpace: 'nowrap', flexShrink: 0 }}>{ex.type}</span>
                  </div>

                  <div style={{ fontSize: 12, color: C.textMid, marginBottom: 12, lineHeight: 1.5 }}>
                    {ex.topic} · Pagina {ex.page}
                  </div>

                  {/* Variant-preview */}
                  {ex.variants?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: C.greenLight, color: C.green, fontSize: 10,
                        fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>① Makkelijker</span>
                      <span style={{ background: C.pinkLight, color: C.pink, fontSize: 10,
                        fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>② Moeilijker</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
