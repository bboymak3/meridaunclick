// functions/api/agent-progress/index.js
// GET: Get agent profile (level, XP, badges, progress)
// POST: Submit class answers - scoring by points, 70% to pass, allows retries if failed

import { corsHeaders, requireAuth } from '../../_lib/auth.js';
import { ensureAcademyVideoSchema, youtubeId, videoScore, MIN_WATCH_RATIO } from '../../_lib/academy-video.js';
import { getPath, isClassLocked } from '../../_lib/academy-path.js';

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
  var tables = [
    "CREATE TABLE IF NOT EXISTS agent_classes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, content TEXT DEFAULT '', xp_reward INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS class_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, question TEXT NOT NULL, option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT DEFAULT '', option_d TEXT DEFAULT '', correct_answer TEXT NOT NULL, explanation TEXT DEFAULT '', points INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))",
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))"
  ];
  for (var i = 0; i < tables.length; i++) {
    try { await db.prepare(tables[i]).run(); } catch(e) {}
  }
  // Ensure columns exist (migration may have created tables without these)
  try { await db.prepare("ALTER TABLE class_questions ADD COLUMN points INTEGER DEFAULT 10").run(); } catch(e) {}
  try { await db.prepare("ALTER TABLE user_class_progress ADD COLUMN total_points INTEGER DEFAULT 0").run(); } catch(e) {}
  await ensureAcademyVideoSchema(db);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Seguimiento del video: 'video_start' al empezar a verlo (reinicia el progreso)
// y 'video_complete' al terminarlo. El servidor comprueba que haya pasado el
// tiempo real del video entre ambos.
async function handleVideoAction(env, userId, body) {
  var classId = body.class_id;
  var cls = await env.DB.prepare('SELECT id, video_url FROM agent_classes WHERE id = ? AND is_active = 1').bind(classId).first();
  if (!cls || !youtubeId(cls.video_url)) return json({ error: 'Esta clase no tiene video' }, 404);
  if (await isClassLocked(env.DB, userId, classId)) return json({ error: 'Primero aprueba la clase anterior', locked: true }, 403);

  await env.DB.prepare('INSERT OR IGNORE INTO user_class_progress (user_id, class_id, completed) VALUES (?, ?, 0)').bind(userId, classId).run();
  var row = await env.DB.prepare('SELECT completed, video_completed, video_started_at, video_duration FROM user_class_progress WHERE user_id = ? AND class_id = ?').bind(userId, classId).first();

  if (body.action === 'video_start') {
    var duration = Math.max(0, Math.min(6 * 3600, Math.round(Number(body.duration) || 0)));
    await env.DB.prepare(
      "UPDATE user_class_progress SET video_completed = 0, video_started_at = datetime('now'), video_duration = ? WHERE user_id = ? AND class_id = ?"
    ).bind(duration, userId, classId).run();
    return json({ ok: true, video_completed: false });
  }

  // video_complete
  if (!row || !row.video_started_at || !(row.video_duration > 0)) return json({ error: 'Debes reproducir el video desde el inicio' }, 400);
  var elapsedRow = await env.DB.prepare(
    "SELECT CAST((julianday('now') - julianday(video_started_at)) * 86400 AS INTEGER) AS elapsed FROM user_class_progress WHERE user_id = ? AND class_id = ?"
  ).bind(userId, classId).first();
  var elapsed = (elapsedRow && elapsedRow.elapsed) || 0;
  var needed = Math.floor((row.video_duration || 0) * MIN_WATCH_RATIO);
  if (elapsed < needed) {
    return json({ error: 'Debes ver el video completo sin adelantarlo', elapsed: elapsed, needed: needed }, 400);
  }
  await env.DB.prepare('UPDATE user_class_progress SET video_completed = 1 WHERE user_id = ? AND class_id = ?').bind(userId, classId).run();
  return json({ ok: true, video_completed: true });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    var auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    var env = context.env;
    var userId = auth.user.id;

    await ensureTables(env.DB);

    // Get or create agent profile
    var profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    if (!profile) {
      await env.DB.prepare('INSERT INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();
      profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    }

    // Get badges
    var badgesResp = await env.DB.prepare(
      'SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC'
    ).bind(userId).all();
    var badges = badgesResp.results || [];

    // Get class progress details
    var progressResp = await env.DB.prepare(
      'SELECT ucp.*, ac.title, ac.xp_reward FROM user_class_progress ucp JOIN agent_classes ac ON ac.id = ucp.class_id WHERE ucp.user_id = ? ORDER BY ucp.completed_at DESC'
    ).bind(userId).all();
    var progress = progressResp.results || [];

    // Calculate derived stats
    var level = calcLevel(profile.xp);
    var nextXp = xpForNextLevel(level);
    var currentLevelXp = xpForCurrentLevel(level);
    var xpInCurrentLevel = profile.xp - currentLevelXp;
    var xpNeeded = nextXp - currentLevelXp;
    var progressPercent = level >= 10 ? 100 : Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));
    // El examen final se desbloquea al aprobar todas las clases de la ruta
    var path = await getPath(env.DB, userId);
    var examAvailable = path.exam_unlocked && !profile.exam_passed && (profile.exam_attempts || 0) < 3;

    return new Response(JSON.stringify({
      profile: profile,
      level: level,
      xp: profile.xp,
      xp_in_current_level: xpInCurrentLevel,
      xp_needed_for_next: xpNeeded,
      progress_percent: progressPercent,
      exam_available: examAvailable,
      path_completed: path.completed,
      path_total: path.total,
      exam_attempts: profile.exam_attempts || 0,
      attempts_remaining: Math.max(0, 3 - (profile.exam_attempts || 0)),
      is_partner: profile.is_partner === 1,
      is_graduated: profile.graduated === 1,
      badges: badges,
      completed_classes: progress,
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
    var auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    var env = context.env;
    var userId = auth.user.id;
    var body = await context.request.json();
    var class_id = body.class_id;
    var answers = body.answers;

    if (class_id && (body.action === 'video_start' || body.action === 'video_complete')) {
      await ensureTables(env.DB);
      return await handleVideoAction(env, userId, body);
    }

    if (!class_id || !answers || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'class_id y answers son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await ensureTables(env.DB);
    await env.DB.prepare('INSERT OR IGNORE INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();

    // Get class info
    var cls = await env.DB.prepare('SELECT * FROM agent_classes WHERE id = ? AND is_active = 1').bind(class_id).first();
    if (!cls) {
      return new Response(JSON.stringify({ error: 'Clase no encontrada o inactiva' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // BUG #2 FIX: Allow retries if not yet passed (completed !== 1)
    var existing = await env.DB.prepare(
      'SELECT * FROM user_class_progress WHERE user_id = ? AND class_id = ?'
    ).bind(userId, class_id).first();
    if (existing && existing.completed === 1) {
      return new Response(JSON.stringify({ error: 'Esta clase ya fue aprobada', already_completed: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ruta de aprendizaje: hay que aprobar las clases en orden
    if (await isClassLocked(env.DB, userId, class_id)) {
      return json({ error: 'Primero aprueba la clase anterior', locked: true }, 403);
    }

    // Clase con video: primero hay que ver el video completo
    if (youtubeId(cls.video_url) && (!existing || existing.video_completed !== 1)) {
      return json({ error: 'Debes ver el video completo antes de responder', video_required: true }, 403);
    }

    // Get questions with points
    var qResp = await env.DB.prepare(
      'SELECT id, correct_answer, points FROM class_questions WHERE class_id = ?'
    ).bind(class_id).all();
    var questions = qResp.results || [];

    // Grade answers
    var correct = 0;
    var totalPoints = 0;
    var maxPoints = 0;
    var results = [];
    var seen = {};

    for (var i = 0; i < answers.length; i++) {
      var ans = answers[i] || {};
      // Cada pregunta cuenta una sola vez
      if (seen[ans.question_id]) continue;
      seen[ans.question_id] = true;
      var q = null;
      for (var j = 0; j < questions.length; j++) {
        if (questions[j].id === ans.question_id) { q = questions[j]; break; }
      }
      if (q) {
        maxPoints += (q.points || 10);
        var isCorrect = String(q.correct_answer).toLowerCase() === String(ans.answer).toLowerCase();
        if (isCorrect) {
          correct++;
          totalPoints += (q.points || 10);
        }
        results.push({ question_id: ans.question_id, correct: isCorrect, points_earned: isCorrect ? (q.points || 10) : 0 });
      }
    }

    var totalQuestions = questions.length;
    var scorePercent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    // BUG #2 FIX: Only mark completed if score >= 70%
    var passed = scorePercent >= 70;

    // XP earned: full if passed, half otherwise (but only on first pass or first attempt)
    var xpEarned = passed ? cls.xp_reward : Math.floor(cls.xp_reward * 0.5);

    // Clase con video: 10 pts por el video + 2 por respuesta correcta + 10 si
    // todas son correctas. Aprueba con 70% de respuestas correctas.
    var isVideo = !!youtubeId(cls.video_url);
    var breakdown = null;
    if (isVideo) {
      breakdown = videoScore(correct, totalQuestions);
      totalPoints = breakdown.points;
      maxPoints = breakdown.max_points;
      scorePercent = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
      passed = scorePercent >= 70;
      xpEarned = breakdown.points;
    }

    // BUG #2 FIX: Only count as completed when passed
    // BUG #3 FIX: Only add XP and increment count on first pass
    if (existing) {
      // Update existing record
      if (passed) {
        // First time passing — set completed and award full XP
        var passUpdate = await env.DB.prepare(
          "UPDATE user_class_progress SET completed = 1, correct_answers = ?, total_questions = ?, total_points = ?, xp_earned = ?, completed_at = datetime('now') WHERE user_id = ? AND class_id = ? AND COALESCE(completed, 0) = 0"
        ).bind(correct, totalQuestions, totalPoints, xpEarned, userId, class_id).run();

        // BUG #3 FIX: Only add XP if this is first time passing (existing was not completed)
        // (y solo si esta peticion fue la que marco la clase como aprobada)
        if (existing.completed !== 1 && passUpdate.meta && passUpdate.meta.changes > 0) {
          await env.DB.prepare(
            "UPDATE agent_profiles SET xp = xp + ?, total_classes_completed = total_classes_completed + 1, updated_at = datetime('now') WHERE user_id = ?"
          ).bind(xpEarned, userId).run();
        }
      } else {
        // Failed attempt — update score but keep completed = 0, no XP
        // (en clases con video hay que volver a verlo para reintentar)
        await env.DB.prepare(
          "UPDATE user_class_progress SET correct_answers = ?, total_questions = ?, total_points = ?, xp_earned = 0" + (isVideo ? ", video_completed = 0" : "") + " WHERE user_id = ? AND class_id = ?"
        ).bind(correct, totalQuestions, totalPoints, userId, class_id).run();
      }
    } else {
      // First attempt
      await env.DB.prepare(
        "INSERT INTO user_class_progress (user_id, class_id, completed, correct_answers, total_questions, total_points, xp_earned, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      ).bind(userId, class_id, passed ? 1 : 0, correct, totalQuestions, totalPoints, passed ? xpEarned : 0).run();

      // BUG #3 FIX: Only add XP if passed
      if (passed) {
        await env.DB.prepare(
          "UPDATE agent_profiles SET xp = xp + ?, total_classes_completed = total_classes_completed + 1, updated_at = datetime('now') WHERE user_id = ?"
        ).bind(xpEarned, userId).run();
      }
    }

    // Check level up (only if XP was awarded)
    var updated = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    var newLevel = calcLevel(updated.xp);
    var oldLevel = calcLevel(updated.xp - (passed ? xpEarned : 0));

    var leveledUp = false;
    if (newLevel > oldLevel) {
      leveledUp = true;
      await env.DB.prepare('UPDATE agent_profiles SET level = ? WHERE user_id = ?').bind(newLevel, userId).run();
      var milestones = { 3: 'Aprendiz', 5: 'Intermedio', 7: 'Avanzado', 10: 'Experto' };
      if (milestones[newLevel]) {
        // BUG #6 FIX: Check for existing badge before inserting
        var badgeExists = await env.DB.prepare("SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = 'level_up_" + newLevel + "'").bind(userId).first();
        if (badgeExists.cnt === 0) {
          await env.DB.prepare(
            "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'level_up_" + newLevel + "', ?, ?, 'fas fa-star')"
          ).bind(userId, 'Nivel ' + newLevel + ': ' + milestones[newLevel], 'Alcanzaste el nivel ' + newLevel).run();
        }
      }
    }

    // Badge for first class completed
    var progressCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_class_progress WHERE user_id = ? AND completed = 1').bind(userId).first();
    if (progressCount.cnt === 1) {
      var firstExists = await env.DB.prepare("SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = 'first_class'").bind(userId).first();
      if (firstExists.cnt === 0) {
        await env.DB.prepare(
          "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'first_class', 'Primera Clase', 'Completaste tu primera clase', 'fas fa-graduation-cap')"
        ).bind(userId).run();
      }
    }

    // Perfect score badge (>= 90% with 5+ questions)
    if (scorePercent >= 90 && totalQuestions >= 5) {
      var perfectExists = await env.DB.prepare("SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ? AND badge_type = 'perfect_score'").bind(userId).first();
      if (perfectExists.cnt === 0) {
        await env.DB.prepare(
          "INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon) VALUES (?, 'perfect_score', 'Puntuacion Perfecta', ?, 'fas fa-crown')"
        ).bind(userId, 'Obtuviste ' + scorePercent + '% en un quiz').run();
      }
    }

    return new Response(JSON.stringify({
      message: passed ? 'Clase aprobada! Calificacion: ' + scorePercent + '%' : 'Clase no aprobada: ' + scorePercent + '% (necesitas 70%)',
      correct_answers: correct,
      total_questions: totalQuestions,
      total_points: totalPoints,
      max_points: maxPoints,
      score_percent: scorePercent,
      passed: passed,
      xp_earned: passed ? xpEarned : 0,
      leveled_up: leveledUp,
      new_level: newLevel,
      old_level: oldLevel,
      results: results,
      is_video: isVideo,
      score_breakdown: breakdown,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al procesar clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
