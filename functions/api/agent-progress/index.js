// functions/api/agent-progress/index.js
// GET: Get agent profile (level, XP, badges, progress) - also auto-creates tables
// POST: Submit class answers (complete a class) - supports scoring by points

import { corsHeaders, requireAuth } from '../../_lib/auth.js';

const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

function calcLevel(xp) {
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

function xpForNextLevel(level) {
  if (level >= 10) return LEVEL_XP[9];
  return LEVEL_XP[level];
}

function xpForCurrentLevel(level) {
  if (level <= 1) return 0;
  return LEVEL_XP[level - 2];
}

async function ensureTables(db) {
  const tables = [
    "CREATE TABLE IF NOT EXISTS agent_classes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, content TEXT DEFAULT '', xp_reward INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, exam_type TEXT DEFAULT 'multiple_choice' CHECK(exam_type IN ('multiple_choice','number_select','true_false_none')), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS class_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, question TEXT NOT NULL, option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT DEFAULT '', option_d TEXT DEFAULT '', correct_answer TEXT NOT NULL, explanation TEXT DEFAULT '', points INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))) ",
    "CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))",
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))) ",
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now'))) ",
    "CREATE TABLE IF NOT EXISTS class_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, user_id INTEGER NOT NULL, assigned_by INTEGER, assigned_at TEXT DEFAULT (datetime('now')), status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','failed')), score INTEGER DEFAULT 0, max_score INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(class_id, user_id))"
  ];
  for (const sql of tables) {
    try { await db.prepare(sql).run(); } catch(e) {}
  }
  // Add new columns if missing
  const cols = [
    "ALTER TABLE agent_classes ADD COLUMN exam_type TEXT DEFAULT 'multiple_choice'",
    "ALTER TABLE class_questions ADD COLUMN points INTEGER DEFAULT 10",
    "ALTER TABLE user_class_progress ADD COLUMN total_points INTEGER DEFAULT 0",
    "ALTER TABLE agent_profiles ADD COLUMN graduated INTEGER DEFAULT 0",
    "ALTER TABLE agent_profiles ADD COLUMN graduated_at TEXT",
    "ALTER TABLE users ADD COLUMN avatar TEXT"
  ];
  for (const sql of cols) {
    try { await db.prepare(sql).run(); } catch(e) {}
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;

    // Auto-create tables on first access
    await ensureTables(env.DB);

    // Get or create agent profile
    let profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    if (!profile) {
      await env.DB.prepare('INSERT INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();
      profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    }

    // Get badges
    const { results: badges } = await env.DB.prepare(
      'SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC'
    ).bind(userId).all();

    // Get assigned classes (pending/in_progress)
    const { results: assignments } = await env.DB.prepare(
      'SELECT ca.*, ac.title, ac.exam_type, ac.xp_reward FROM class_assignments ca JOIN agent_classes ac ON ac.id = ca.class_id WHERE ca.user_id = ? AND ca.status IN (\'pending\',\'in_progress\') ORDER BY ca.assigned_at DESC'
    ).bind(userId).all();

    // Get class progress details
    const { results: progress } = await env.DB.prepare(
      'SELECT ucp.*, ac.title, ac.xp_reward, ac.exam_type FROM user_class_progress ucp JOIN agent_classes ac ON ac.id = ucp.class_id WHERE ucp.user_id = ? ORDER BY ucp.completed_at DESC'
    ).bind(userId).all();

    // Calculate derived stats
    const level = calcLevel(profile.xp);
    const nextXp = xpForNextLevel(level);
    const currentLevelXp = xpForCurrentLevel(level);
    const xpInCurrentLevel = profile.xp - currentLevelXp;
    const xpNeeded = nextXp - currentLevelXp;
    const progressPercent = level >= 10 ? 100 : Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));
    const examAvailable = level >= 10 && !profile.exam_passed;

    return new Response(JSON.stringify({
      profile, level, xp: profile.xp,
      xp_in_current_level: xpInCurrentLevel,
      xp_needed_for_next: xpNeeded,
      progress_percent: progressPercent,
      exam_available: examAvailable,
      is_partner: profile.is_partner === 1,
      is_graduated: profile.graduated === 1,
      badges, completed_classes: progress,
      pending_assignments: assignments,
      total_badges: badges.length,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener progreso', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;
    const body = await context.request.json();
    const { class_id, answers } = body;

    if (!class_id || !answers || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'class_id y answers son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await ensureTables(env.DB);

    // Get class info
    const cls = await env.DB.prepare('SELECT * FROM agent_classes WHERE id = ? AND is_active = 1').bind(class_id).first();
    if (!cls) {
      return new Response(JSON.stringify({ error: 'Clase no encontrada o inactiva' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already completed
    const existing = await env.DB.prepare(
      'SELECT * FROM user_class_progress WHERE user_id = ? AND class_id = ? AND completed = 1'
    ).bind(userId, class_id).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Esta clase ya fue completada', already_completed: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get questions with points
    const { results: questions } = await env.DB.prepare(
      'SELECT id, correct_answer, points FROM class_questions WHERE class_id = ?'
    ).bind(class_id).all();

    // Grade answers - support multiple answer formats
    let correct = 0;
    let totalPoints = 0;
    let maxPoints = 0;
    const results = [];

    for (const ans of answers) {
      const q = questions.find(function(q) { return q.id === ans.question_id; });
      if (q) {
        maxPoints += (q.points || 10);
        const isCorrect = String(q.correct_answer).toLowerCase() === String(ans.answer).toLowerCase();
        if (isCorrect) {
          correct++;
          totalPoints += (q.points || 10);
        }
        results.push({ question_id: ans.question_id, correct: isCorrect, points_earned: isCorrect ? (q.points || 10) : 0 });
      }
    }

    const totalQuestions = questions.length;
    const allCorrect = correct === totalQuestions && totalQuestions > 0;
    const scorePercent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    // XP earned: full if all correct or score >= 80%, half otherwise
    const xpEarned = (allCorrect || scorePercent >= 80) ? cls.xp_reward : Math.floor(cls.xp_reward * 0.5);

    // Save progress (INSERT OR REPLACE to handle retries)
    await env.DB.prepare(
      "INSERT INTO user_class_progress (user_id, class_id, completed, correct_answers, total_questions, total_points, xp_earned, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
    ).bind(userId, class_id, allCorrect ? 1 : 0, correct, totalQuestions, totalPoints, xpEarned).run();

    // Update agent profile XP
    await env.DB.prepare(
      "UPDATE agent_profiles SET xp = xp + ?, total_classes_completed = total_classes_completed + 1, updated_at = datetime('now') WHERE user_id = ?"
    ).bind(xpEarned, userId).run();

    // Update assignment status if exists
    await env.DB.prepare(
      "UPDATE class_assignments SET status = ?, score = ?, max_score = ?, completed_at = datetime('now') WHERE user_id = ? AND class_id = ? AND status IN ('pending','in_progress')"
    ).bind(allCorrect ? 'completed' : 'failed', totalPoints, maxPoints, userId, class_id).run();

    // Check level up
    const updated = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    const newLevel = calcLevel(updated.xp);
    const oldLevel = calcLevel(updated.xp - xpEarned);

    let leveledUp = false;
    if (newLevel > oldLevel) {
      leveledUp = true;
      await env.DB.prepare('UPDATE agent_profiles SET level = ? WHERE user_id = ?').bind(newLevel, userId).run();
      var milestones = { 3: 'Aprendiz', 5: 'Intermedio', 7: 'Avanzado', 10: 'Experto' };
      if (milestones[newLevel]) {
        await env.DB.prepare(
          "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'level_up', ?, ?, 'fas fa-star')"
        ).bind(userId, 'Nivel ' + newLevel + ': ' + milestones[newLevel], 'Alcanzaste el nivel ' + newLevel).run();
      }
    }

    // Badge for first class completed
    var progressCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_class_progress WHERE user_id = ? AND completed = 1').bind(userId).first();
    if (progressCount.cnt === 1) {
      await env.DB.prepare(
        "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'first_class', 'Primera Clase', 'Completaste tu primera clase', 'fas fa-graduation-cap')"
      ).bind(userId).run();
    }

    // Perfect score badge
    if (allCorrect && totalQuestions >= 5) {
      var perfectExists = await env.DB.prepare("SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = 'perfect_score'").bind(userId).first();
      if (perfectExists.cnt === 0) {
        await env.DB.prepare(
          "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'perfect_score', 'Puntuacion Perfecta', 'Respondiste todas las preguntas correctamente', 'fas fa-crown')"
        ).bind(userId).run();
      }
    }

    return new Response(JSON.stringify({
      message: allCorrect ? 'Clase completada perfectamente!' : 'Clase completada - Calificacion: ' + scorePercent + '%',
      correct_answers: correct,
      total_questions: totalQuestions,
      total_points: totalPoints,
      max_points: maxPoints,
      score_percent: scorePercent,
      xp_earned: xpEarned,
      all_correct: allCorrect,
      leveled_up: leveledUp,
      new_level: newLevel,
      old_level: oldLevel,
      results: results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al procesar clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
