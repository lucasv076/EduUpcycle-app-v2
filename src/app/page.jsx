import Link from 'next/link';
import { C } from '@/lib/colors';

const ZwijsenLogo = ({ size = 14 }) => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
    {[['z', C.orange], ['w', C.red], ['ij', C.blue], ['s', C.yellow], ['e', C.green], ['n', C.teal]].map(([l, bg]) => (
      <span key={l} style={{
        background: bg,
        color: 'white',
        fontWeight: 900,
        fontSize: size,
        padding: `${Math.round(size * 0.15)}px ${Math.round(size * 0.42)}px`,
        borderRadius: 3,
      }}>
        {l}
      </span>
    ))}
  </div>
);

const Card = ({ href, title, subtitle, description, badge, accent, cta }) => (
  <Link href={href} style={{ textDecoration: 'none' }}>
    <article style={{
      background: 'white',
      borderRadius: 18,
      border: `1.5px solid ${C.border}`,
      padding: 24,
      minHeight: 280,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 14px 42px rgba(44,19,64,0.08)',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{
            background: accent,
            color: 'white',
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.6,
            padding: '4px 10px',
          }}>
            {badge}
          </span>
          <span style={{ color: C.textLight, fontSize: 12 }}>{subtitle}</span>
        </div>

        <h2 style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 10, color: C.text }}>{title}</h2>
        <p style={{ color: C.textMid, lineHeight: 1.6, fontSize: 14 }}>{description}</p>
      </div>

      <div style={{
        marginTop: 20,
        fontWeight: 800,
        fontSize: 14,
        color: accent,
      }}>
        {cta} →
      </div>
    </article>
  </Link>
);

export default function HomePortalPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(165deg, #F7F2FB 0%, #F0FAF6 45%, #FDF7EC 100%)',
      color: C.text,
      padding: '40px 20px 56px',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 36,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ZwijsenLogo size={13} />
            <div style={{ width: 1, height: 22, background: '#D7C8E2' }} />
            <span style={{ fontWeight: 800, letterSpacing: -0.2 }}>EduUpcycle</span>
          </div>
          <span style={{
            background: C.purple,
            color: 'white',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
            padding: '4px 11px',
          }}>
            GEEN LOGIN NODIG
          </span>
        </header>

        <section style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.03, color: C.purpleDark, marginBottom: 12 }}>
            Kies je werkruimte
          </h1>
          <p style={{ maxWidth: 760, fontSize: 16, lineHeight: 1.6, color: C.textMid }}>
            De flow is nu duidelijk gescheiden: docenten genereren en beoordelen oefeningen in een portal,
            leerlingen werken zelfstandig in hun eigen oefenomgeving.
          </p>
        </section>

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
        }}>
          <Card
            href="/teacher"
            title="Docent Portal"
            subtitle="PDF → AI → Goedkeuren"
            description="Upload werkboek-PDF's, laat AI oefeningen maken, beoordeel kwaliteit en publiceer naar de leerlingomgeving."
            badge="DOCENT"
            accent={C.purple}
            cta="Naar docentomgeving"
          />

          <Card
            href="/student"
            title="Leerling Portal"
            subtitle="Maken op eigen tempo"
            description="Bekijk beschikbare oefeningen, open een opdracht en maak de makkelijke en moeilijkere versie zonder afleiding."
            badge="LEERLING"
            accent={C.teal}
            cta="Naar leerlingomgeving"
          />
        </section>
      </div>
    </main>
  );
}
