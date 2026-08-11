// functions/api/partners/[id].js
// GET: Public profile of a user/agent (with badges, levels, etc.)

import { corsHeaders } from '../../_lib/auth.js';

function calcLevel(xp) {
  const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const userId = params.id;

    const user = await env.DB.prepare(
      'SELECT id, name, avatar, bio, phone, whatsapp, role, created_at FROM users WHERE id = ? AND is_active = 1'
    ).bind(userId).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get agent profile
    const agentProfile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();

    // Get badges
    const { results: badges } = await env.DB.prepare(
      'SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC'
    ).bind(userId).all();

    // Get completed classes
    const { results: completedClasses } = await env.DB.prepare(`
      SELECT ucp.*, ac.title
      FROM user_class_progress ucp
      JOIN agent_classes ac ON ac.id = ucp.class_id
      WHERE ucp.user_id = ? AND ucp.completed = 1
      ORDER BY ucp.completed_at DESC
    `).bind(userId).all();

    // Calculate level
    let level = 1;
    let xp = 0;
    if (agentProfile) {
      xp = agentProfile.xp || 0;
      level = calcLevel(xp);
    }

    return new Response(JSON.stringify({
      user,
      agent_profile: agentProfile,
      level,
      xp,
      is_partner: agentProfile ? agentProfile.is_partner === 1 : false,
      badges,
      completed_classes: completedClasses,
      total_badges: badges.length,
      total_classes_completed: completedClasses.length,
      exam_passed: agentProfile ? agentProfile.exam_passed === 1 : false,
      exam_passed_at: agentProfile ? agentProfile.exam_passed_at : null,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener perfil publico', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
