// functions/api/agent-exam/index.js
// GET: Get exam status and 10 random questions (only if level 10 and not passed)
// POST: Submit exam answers

import { corsHeaders, requireAuth } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function calcLevel(xp) {
  const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;

    // Get profile
    let profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    if (!profile) {
      await env.DB.prepare('INSERT INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();
      profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    }

    // Check prerequisites
    const level = calcLevel(profile.xp);

    return new Response(JSON.stringify({
      level,
      exam_passed: profile.exam_passed === 1,
      exam_passed_at: profile.exam_passed_at,
      exam_attempts: profile.exam_attempts,
      can_take_exam: level >= 10 && profile.exam_passed !== 1,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener estado del examen', details: error.message }), {
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
    const { answers } = body; // [{question_id, answer: 'a'|'b'|'c'|'d'}, ...]

    if (!answers || !Array.isArray(answers) || answers.length !== 10) {
      return new Response(JSON.stringify({ error: 'Debes responder exactamente 10 preguntas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get profile
    let profile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Perfil de agente no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check level requirement
    const level = calcLevel(profile.xp);
    if (level < 10) {
      return new Response(JSON.stringify({ error: 'Necesitas alcanzar nivel 10 para tomar el examen', required_level: 10, current_level: level }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already passed
    if (profile.exam_passed === 1) {
      return new Response(JSON.stringify({ error: 'Ya aprobaste el examen', exam_passed: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all questions from all active classes (pool for exam)
    const { results: allQuestions } = await env.DB.prepare(`
      SELECT cq.* FROM class_questions cq
      JOIN agent_classes ac ON ac.id = cq.class_id
      WHERE ac.is_active = 1
    `).bind().all();

    if (allQuestions.length < 10) {
      return new Response(JSON.stringify({ error: 'No hay suficientes preguntas en el banco para generar el examen (mínimo 10)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Grade answers
    let correct = 0;
    for (const ans of answers) {
      const q = allQuestions.find(q => q.id === ans.question_id);
      if (q && q.correct_answer === ans.answer) {
        correct++;
      }
    }

    const allCorrect = correct === 10;
    const passed = allCorrect; // ALL must be correct

    // Update exam attempts
    await env.DB.prepare(`
      UPDATE agent_profiles SET
        exam_attempts = exam_attempts + 1,
        last_exam_at = datetime('now'),
        updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(userId).run();

    if (passed) {
      // Award exam passed badge and partner status
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE agent_profiles SET
            exam_passed = 1,
            exam_passed_at = datetime('now'),
            is_partner = 1,
            partner_at = datetime('now'),
            updated_at = datetime('now')
          WHERE user_id = ?
        `).bind(userId),
        env.DB.prepare(`
          INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
          VALUES (?, 'exam_passed', 'Examen Aprobado', 'Aprobaste el examen final con todas las respuestas correctas', 'fas fa-trophy')
        `).bind(userId),
        env.DB.prepare(`
          INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description, badge_icon)
          VALUES (?, 'partner', 'Partner Digital Certificado', 'Eres un Partner Digital certificado de AunClick', 'fas fa-certificate')
        `).bind(userId),
      ]);
    }

    return new Response(JSON.stringify({
      passed,
      correct_answers: correct,
      total_questions: 10,
      exam_attempts: profile.exam_attempts + 1,
      message: passed
        ? 'Felicidades! Aprobaste el examen y eres ahora un Partner Digital Certificado!'
        : `No aprobaste. Necesitas ${10 - correct} respuestas correctas mas. Intenta de nuevo.`,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al procesar examen', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
