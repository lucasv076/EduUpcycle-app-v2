// Server Component — haalt één oefening op uit Supabase en geeft hem door
import { notFound } from 'next/navigation';
import { getExerciseById } from '@/lib/supabase';
import ExercisePage from './ExercisePage';

export async function generateMetadata({ params }) {
  try {
    const ex = await getExerciseById(params.id);
    if (!ex) return { title: 'Oefening niet gevonden' };
    return { title: `${ex.title} – EduUpcycle` };
  } catch {
    return { title: 'EduUpcycle Oefening' };
  }
}

export default async function StudentExercisePage({ params }) {
  let exercise = null;

  try {
    exercise = await getExerciseById(params.id);
  } catch (e) {
    // Supabase niet bereikbaar of fout
    console.error('[student/[id]]', e.message);
  }

  if (!exercise) {
    notFound();
  }

  return <ExercisePage exercise={exercise} />;
}
