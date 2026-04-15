import './globals.css';

export const metadata = {
  title: 'EduUpcycle — Zwijsen AI Tool',
  description: 'Transformeer werkboek-PDFs naar interactieve oefeningen met AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
