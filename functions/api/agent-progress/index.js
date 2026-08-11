// functions/api/agent-progress/index.js
// GET: Get agent profile (level, XP, badges, progress)
// POST: Submit class answers (complete a class)

import { corsHeaders, requireAuth } from '../../_lib/auth.js';

// XP thresholds per level
const LEVEL_XP = [
  0,      // Level 1: 0 XP
  100,    // Level 2: 100 XP
  250,    // Level 3: 250 XP
  450,    // Level 4: 450 XP
  700,    // Level 5: 700 XP
  1000,   // Level 6: 1000 XP
  1400,   // Level 7: 1400 XP
  1900,   // Level 8: 1900 XP
  2500,   // Level 9: 2500 XP
  3200,   // Level 10: 3200 XP
];

function calcLevel(xp) {
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

function xpForNextLevel(level) {
  if (level >= 10) return LEVEL_XP[9];
  return LEVEL_XP[level]; // XP needed for next level
}

function xpForCurrentLevel(level) {
  if (level <= 1) return 0;
  return LEVEL_XP[level - 2]; // XP threshold for current level
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

    // Get class progress details
    const { results: progress } = await env.DB.prepare(
      `SELECT ucp.*, ac.title, ac.xp_reward
       FROM user_class_progress ucp
       JOIN agent_classes ac ON ac.id = ucp.class_id
       WHERE ucp.user_id = ?
       ORDER BY ucp.completed_at DESC`
    ).bind(userId).all();

    // Calculate derived stats
    const level = calcLevel(profile.xp);
    const nextXp = xpForNextLevel(level);
    const currentLevelXp = xpForCurrentLevel(level);
    const xpInCurrentLevel = profile.xp - currentLevelXp;
    const xpNeeded = nextXp - currentLevelXp;
    const progressPercent = level >= 10 ? 100 : Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));

    // Check if exam is available (level 10)
    const examAvailable = level >= 10 && !profile.exam_passed;

    return new Response(JSON.stringify({
      profile,
      level,
      xp: profile.xp,
      xp_in_current_level: xpInCurrentLevel,
      xp_needed_for_next: xpNeeded,
      progress_percent: progressPercent,
      exam_available: examAvailable,
      is_partner: profile.is_partner === 1,
      badges,
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
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;
    const body = await context.request.json();
    const { class_id, answers } = body; // answers = [{question_id, answer: 'a'|'b'|'c'|'d'}, ...]

    if (!class_id || !answers || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'class_id y answers son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get class and XP reward
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

    // Get correct answers for this class
    const { results: questions } = await env.DB.prepare(
      'SELECT id, correct_answer FROM class_questions WHERE class_id = ?'
    ).bind(class_id).all();

    // Grade answers
    let correct = 0;
    const results = [];
    for (const ans of answers) {
      const q = questions.find(q => q.id === ans.question_id);
      if (q) {
        const isCorrect = q.correct_answer === ans.answer;
        if (isCorrect) correct++;
        results.push({ question_id: ans.question_id, correct: isCorrect });
      }
    }

    const totalQuestions = questions.length;
    const allCorrect = correct === totalQuestions && totalQuestions > 0;
    const xpEarned = allCorrect ? cls.xp_reward : Math.floor(cls.xp_reward * 0.5); // Half XP if not all correct

    // Save progress
    try {
      await env.DB.prepare(`
        INSERT INTO user_class_progress (user_id, class_id, completed, correct_answers, total_questions, xp_earned, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(userId, class_id, allCorrect ? 1 : 0, correct, totalQuestions, xpEarned).run();
    } catch (e) {
      // Update if record exists (retry)
      await env.DB.prepare(`
        UPDATE user_class_progress SET completed = ?, correct_answers = ?, total_questions = ?, xp_earned = ?, completed_at = datetime('now')
        WHERE user_id = ? AND class_id = ?
      `).bind(allCorrect ? 1 : 0, correct, totalQuestions, xpEarned, userId, classId).run();
    }

    // Update agent profile XP
    await env.DB.prepare('UPDATE agent_profiles SET xp = xp + ?, total_classes_completed = total_classes_completed + ?, updated_at = datetime(\'now\') WHERE user_id = ?')
      .bind(xpEarned, 1, userId).run();

    // Check level up
    const updated = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    const newLevel = calcLevel(updated.xp);
    const oldLevel = calcLevel(updated.xp - xpEarned);

    // Award level-up badge if leveled up
    let leveledUp = false;
    if (newLevel > oldLevel) {
      leveledUp = true;
      await env.DB.prepare('UPDATE agent_profiles SET level = ? WHERE user_id = ?').bind(newLevel, userId).run();
      // Badge for level milestones
      const milestones = { 3: 'Aprendiz', 5: 'Intermedio', 7: 'Avanzado', 10: 'Experto' };
      if (milestones[newLevel]) {
        await env.DB.prepare(`
          INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
          VALUES (?, 'level_up', ?, ?, 'fas fa-star')
        `).bind(userId, 'Nivel ' + newLevel + ': ' + milestones[newLevel], 'Alcanzaste el nivel ' + newLevel).run();
      }
    }

    // Badge for first class completed
    const progressCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_class_progress WHERE user_id = ? AND completed = 1').bind(userId).first();
    if (progressCount.cnt === 1) {
      await env.DB.prepare(`
        INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
        VALUES (?, 'first_class', 'Primera Clase', 'Completaste tu primera clase', 'fas fa-graduation-cap')
      `).bind(userId).run();
    }

    return new Response(JSON.stringify({
      message: allCorrect ? 'Clase completada perfectamente!' : 'Clase completada con errores',
      correct_answers: correct,
      total_questions: totalQuestions,
      xp_earned: xpEarned,
      all_correct: allCorrect,
      leveled_up: leveledUp,
      new_level: newLevel,
      old_level: oldLevel,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al procesar clase', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
