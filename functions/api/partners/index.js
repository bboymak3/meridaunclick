// functions/api/partners/index.js
// GET: List all certified partners (level 10 + exam passed)

import { corsHeaders } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const { searchParams } = new URL(context.request.url);
    const detailed = searchParams.get('detailed') === '1';

    const { results } = await env.DB.prepare(`
      SELECT
        u.id, u.name, u.avatar, u.bio, u.phone, u.whatsapp, u.role,
        ap.level, ap.xp, ap.exam_passed_at, ap.partner_at,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count,
        (SELECT COUNT(*) FROM user_class_progress WHERE user_id = u.id AND completed = 1) as classes_completed
      FROM users u
      JOIN agent_profiles ap ON ap.user_id = u.id
      WHERE ap.is_partner = 1 AND ap.exam_passed = 1
      ORDER BY ap.partner_at DESC
    `).bind().all();

    let partners = results;

    // If detailed, also fetch badges for each partner
    if (detailed && results.length > 0) {
      const userIds = results.map(r => r.id);
      const placeholders = userIds.map(() => '?').join(',');
      const { results: allBadges } = await env.DB.prepare(
        `SELECT * FROM user_badges WHERE user_id IN (${placeholders}) ORDER BY earned_at DESC`
      ).bind(...userIds).all();

      partners = results.map(p => ({
        ...p,
        badges: allBadges.filter(b => b.user_id === p.id),
      }));
    }

    return new Response(JSON.stringify({ partners, total: results.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener partners', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
