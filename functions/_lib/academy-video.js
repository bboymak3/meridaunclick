// functions/_lib/academy-video.js
// Academia: clases con video de YouTube.
//
// Reglas de una clase con video:
//   - El agente debe ver el video completo (sin cerrarlo) antes de responder.
//   - 5 preguntas de seleccion simple.
//   - Puntaje: 10 por ver el video + 2 por respuesta correcta
//     + 10 de bono si responde todas bien (maximo 30).
//   - Aprueba con 70% de respuestas correctas (4 de 5). Si no aprueba,
//     debe volver a ver el video para intentarlo de nuevo.

export const VIDEO_POINTS = 10;
export const POINTS_PER_ANSWER = 2;
export const PERFECT_BONUS = 10;
export const VIDEO_QUESTIONS = 5;
// Tolerancia del servidor: el tiempo real entre "inicio" y "fin" debe ser
// al menos este porcentaje de la duracion del video.
export const MIN_WATCH_RATIO = 0.85;

const YT_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/;

/** Extrae el ID de un video de YouTube (o '' si la URL no es valida). */
export function youtubeId(url) {
  var s = String(url || '').trim();
  if (!s) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  var m = s.match(YT_RE);
  return m ? m[1] : '';
}

/** Columnas nuevas de la academia (se crean solas, como el resto de tablas). */
export async function ensureAcademyVideoSchema(db) {
  var alters = [
    "ALTER TABLE agent_classes ADD COLUMN video_url TEXT DEFAULT ''",
    "ALTER TABLE agent_classes ADD COLUMN teacher TEXT DEFAULT ''",
    "ALTER TABLE user_class_progress ADD COLUMN video_completed INTEGER DEFAULT 0",
    "ALTER TABLE user_class_progress ADD COLUMN video_started_at TEXT",
    "ALTER TABLE user_class_progress ADD COLUMN video_duration INTEGER DEFAULT 0"
  ];
  for (var i = 0; i < alters.length; i++) {
    try { await db.prepare(alters[i]).run(); } catch (e) { /* ya existe */ }
  }
}

/** Puntaje de una clase con video. */
export function videoScore(correct, total) {
  var perfect = total > 0 && correct === total;
  var answerPoints = correct * POINTS_PER_ANSWER;
  var bonus = perfect ? PERFECT_BONUS : 0;
  return {
    video_points: VIDEO_POINTS,
    answer_points: answerPoints,
    bonus_points: bonus,
    points: VIDEO_POINTS + answerPoints + bonus,
    max_points: VIDEO_POINTS + total * POINTS_PER_ANSWER + PERFECT_BONUS,
    perfect: perfect,
  };
}

/**
 * Valida y normaliza la lista de preguntas enviada por el admin.
 * Devuelve { questions } o { error }.
 */
export function normalizeQuestions(list, isVideo) {
  if (!Array.isArray(list)) return { error: 'questions debe ser una lista' };
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var q = list[i] || {};
    var item = {
      question: String(q.question || '').trim(),
      option_a: String(q.option_a || '').trim(),
      option_b: String(q.option_b || '').trim(),
      option_c: String(q.option_c || '').trim(),
      option_d: String(q.option_d || '').trim(),
      correct_answer: String(q.correct_answer || '').trim().toLowerCase(),
      explanation: String(q.explanation || '').trim(),
      points: isVideo ? POINTS_PER_ANSWER : (parseInt(q.points, 10) || 10),
    };
    var n = i + 1;
    if (!item.question) return { error: 'La pregunta ' + n + ' no tiene texto' };
    if (!item.option_a || !item.option_b) return { error: 'La pregunta ' + n + ' necesita al menos las opciones A y B' };
    if (['a', 'b', 'c', 'd'].indexOf(item.correct_answer) === -1) return { error: 'La pregunta ' + n + ' no tiene respuesta correcta' };
    if (!item['option_' + item.correct_answer]) return { error: 'La respuesta correcta de la pregunta ' + n + ' esta vacia' };
    out.push(item);
  }
  if (isVideo && out.length !== VIDEO_QUESTIONS) {
    return { error: 'Una clase con video debe tener exactamente ' + VIDEO_QUESTIONS + ' preguntas' };
  }
  return { questions: out };
}

/** Reemplaza todas las preguntas de una clase (en un solo batch). */
export async function replaceQuestions(db, classId, questions) {
  var stmts = [db.prepare('DELETE FROM class_questions WHERE class_id = ?').bind(classId)];
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    stmts.push(db.prepare(
      'INSERT INTO class_questions (class_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, points, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(classId, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation, q.points, i));
  }
  await db.batch(stmts);
}
