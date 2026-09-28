// functions/_lib/academy-path.js
// Academia: ruta de aprendizaje por modulos.
//
//   - Las clases activas se ordenan por modulo (General, Fundamentos,
//     Intermedio, Avanzado, ..., Examen Final), luego por "orden en modulo",
//     "orden" e id.
//   - Solo se puede hacer la primera clase no aprobada; las siguientes quedan
//     bloqueadas hasta aprobar la anterior.
//   - El examen final se desbloquea al aprobar todas las clases activas.

export const MODULE_ORDER = ['General', 'Fundamentos', 'Intermedio', 'Avanzado', 'Examen Final'];

export function moduleRank(module) {
  var i = MODULE_ORDER.indexOf(module || 'General');
  // Modulos personalizados: despues de "Avanzado" y antes de "Examen Final"
  return i === -1 ? MODULE_ORDER.length - 1.5 : i;
}

function num(v) { return Number(v) || 0; }

/**
 * Ordena las clases de la ruta y marca cuales estan bloqueadas.
 * Cada fila necesita: id, module, module_order, sort_order y
 * completed (o is_completed).
 */
export function applyPath(rows) {
  var list = (rows || []).slice().sort(function (a, b) {
    return (moduleRank(a.module) - moduleRank(b.module)) ||
      String(a.module || 'General').localeCompare(String(b.module || 'General')) ||
      (num(a.module_order) - num(b.module_order)) ||
      (num(a.sort_order) - num(b.sort_order)) ||
      (num(a.id) - num(b.id));
  });
  var blocked = false;
  list.forEach(function (c) {
    var done = num(c.completed !== undefined ? c.completed : c.is_completed) === 1;
    c.is_locked = !done && blocked ? 1 : 0;
    if (!done) blocked = true;
  });
  return list;
}

async function ensurePathColumns(db) {
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))").run();
  } catch (e) {}
  var alters = [
    "ALTER TABLE agent_classes ADD COLUMN module TEXT DEFAULT 'General'",
    "ALTER TABLE agent_classes ADD COLUMN module_order INTEGER DEFAULT 0"
  ];
  for (var i = 0; i < alters.length; i++) {
    try { await db.prepare(alters[i]).run(); } catch (e) { /* ya existe */ }
  }
}

/** Ruta completa del agente: clases ordenadas, bloqueos y requisito del examen. */
export async function getPath(db, userId) {
  await ensurePathColumns(db);
  var res = await db.prepare(
    'SELECT ac.id, ac.title, ac.module, ac.module_order, ac.sort_order, COALESCE(ucp.completed, 0) AS completed ' +
    'FROM agent_classes ac LEFT JOIN user_class_progress ucp ON ucp.class_id = ac.id AND ucp.user_id = ? ' +
    'WHERE ac.is_active = 1'
  ).bind(userId).all();
  var classes = applyPath(res.results || []);
  var completed = classes.filter(function (c) { return num(c.completed) === 1; }).length;
  return {
    classes: classes,
    completed: completed,
    total: classes.length,
    exam_unlocked: classes.length > 0 && completed === classes.length,
  };
}

/** Clase bloqueada para este agente? (una clase ya aprobada nunca lo esta) */
export async function isClassLocked(db, userId, classId) {
  var path = await getPath(db, userId);
  var c = path.classes.find(function (x) { return String(x.id) === String(classId); });
  return !!(c && c.is_locked);
}
