// functions/api/admin/academy-agents/index.js
// GET (admin): progreso de todos los alumnos de la academia en una sola
// consulta. Incluye agentes (rol agent) y cualquier usuario que tenga perfil
// de academia (los alumnos pueden tener cuenta normal).

import { corsHeaders, requireAdmin } from '../../../_lib/auth.js';
import { calcLevel, levelName } from '../../../_lib/academy-levels.js';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    var auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;
    var db = context.env.DB;

    var tables = [
      "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))"
    ];
    for (var i = 0; i < tables.length; i++) {
      try { await db.prepare(tables[i]).run(); } catch (e) {}
    }

    var res = await db.prepare(
      "SELECT u.id, u.name, u.avatar, u.role, " +
      "COALESCE(ap.xp, 0) AS xp, COALESCE(ap.exam_passed, 0) AS exam_passed, COALESCE(ap.exam_attempts, 0) AS exam_attempts, " +
      "COALESCE(ap.is_partner, 0) AS is_partner, COALESCE(ap.graduated, 0) AS graduated, " +
      "ap.exam_passed_at, ap.partner_at, ap.graduated_at, ap.updated_at AS last_activity, " +
      "(SELECT COUNT(*) FROM user_class_progress ucp WHERE ucp.user_id = u.id AND ucp.completed = 1) AS classes_completed, " +
      "(SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) AS total_badges " +
      "FROM users u LEFT JOIN agent_profiles ap ON ap.user_id = u.id " +
      "WHERE u.role = 'agent' OR ap.user_id IS NOT NULL " +
      "ORDER BY COALESCE(ap.xp, 0) DESC, u.name ASC LIMIT 500"
    ).all();

    var pathRow = await db.prepare('SELECT COUNT(*) AS cnt FROM agent_classes WHERE is_active = 1').first().catch(function () { return null; });

    var agents = (res.results || []).map(function (a) {
      var lvl = calcLevel(a.xp);
      return Object.assign({}, a, {
        level: lvl,
        level_name: levelName(lvl),
        is_partner: a.is_partner === 1 || a.exam_passed === 1 || a.graduated === 1,
        certificate_issued_at: a.exam_passed_at || a.partner_at || a.graduated_at || null,
      });
    });

    return json({ agents: agents, total: agents.length, path_total: (pathRow && pathRow.cnt) || 0 });
  } catch (error) {
    return json({ error: 'Error al cargar el progreso de agentes', details: error.message }, 500);
  }
}
