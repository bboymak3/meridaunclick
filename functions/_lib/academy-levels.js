// functions/_lib/academy-levels.js
// Academia: niveles y XP (una sola fuente de verdad para el servidor).
//
// Como se gana XP:
//   - Clase normal: el XP que el admin le asigne (por defecto 10).
//   - Clase con video: 10 (video) + 2 por respuesta correcta + 10 de bono
//     si acierta todas = hasta 30 XP.
//   - Examen final aprobado (o graduacion desde el admin): +150 XP, una vez.
// Los niveles son de reconocimiento; el examen se desbloquea al aprobar todas
// las clases de la ruta (ver academy-path.js), no por nivel.

export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
export const EXAM_XP = 150;
export const LEVEL_MILESTONES = { 3: 'Aprendiz', 5: 'Intermedio', 7: 'Avanzado', 10: 'Experto' };

export function calcLevel(xp) {
  var level = 1;
  for (var i = LEVEL_XP.length - 1; i >= 0; i--) {
    if ((xp || 0) >= LEVEL_XP[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

/** Nombre del nivel (igual en academia.html y perfil.html). */
export function levelName(level) {
  if (level >= 10) return 'Experto';
  if (level >= 7) return 'Avanzado';
  if (level >= 5) return 'Intermedio';
  if (level >= 3) return 'Aprendiz';
  return 'Principiante';
}

/**
 * Suma XP a un agente, actualiza su nivel y entrega las medallas de nivel
 * (3, 5, 7 y 10) que correspondan. Devuelve { oldLevel, newLevel, leveledUp }.
 */
export async function addXp(db, userId, amount) {
  await db.prepare('INSERT OR IGNORE INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();
  var before = await db.prepare('SELECT xp FROM agent_profiles WHERE user_id = ?').bind(userId).first();
  var oldXp = (before && before.xp) || 0;
  var newXp = oldXp + (amount || 0);
  var oldLevel = calcLevel(oldXp);
  var newLevel = calcLevel(newXp);
  await db.prepare("UPDATE agent_profiles SET xp = ?, level = ?, updated_at = datetime('now') WHERE user_id = ?")
    .bind(newXp, newLevel, userId).run();
  for (var lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
    if (!LEVEL_MILESTONES[lvl]) continue;
    var type = 'level_up_' + lvl;
    var exists = await db.prepare('SELECT COUNT(*) AS cnt FROM user_badges WHERE user_id = ? AND badge_type = ?').bind(userId, type).first();
    if (!exists || exists.cnt === 0) {
      await db.prepare("INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, ?, ?, ?, 'fas fa-star')")
        .bind(userId, type, 'Nivel ' + lvl + ': ' + LEVEL_MILESTONES[lvl], 'Alcanzaste el nivel ' + lvl).run();
    }
  }
  return { oldLevel: oldLevel, newLevel: newLevel, leveledUp: newLevel > oldLevel };
}
