import { getAllExercises } from '@/lib/supabase';
import BlockTestSuite from './BlockTestSuite';

export default async function TestBlokkenPage() {
  let dbExercises = [];
  let dbError = null;
  try {
    dbExercises = await getAllExercises();
  } catch (e) {
    dbError = e.message;
  }
  return <BlockTestSuite dbExercises={dbExercises} dbError={dbError} />;
}
