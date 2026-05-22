// Server Component — haalt één oefening op uit Supabase en geeft hem door
import { notFound } from 'next/navigation';
import { getExerciseById, getAllExercises } from '@/lib/supabase';
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
  let allIds = [];

  try {
    exercise = await getExerciseById(params.id);
    // Haal alle oefeningen op voor "volgende vraag" navigatie
    const all = await getAllExercises();
    allIds = (all || []).map(e => ({ id: e.id, topic: e.topic, question_type: e.question_type, title: e.title }));
  } catch (e) {
    console.error('[student/[id]]', e.message);
  }

  if (!exercise) {
    notFound();
  }

  const {
    source_page_image_data_url,
    source_file,
    source_file_type,
    ...studentExercise
  } = exercise;

  return <ExercisePage exercise={studentExercise} allExercises={allIds} />;
}
