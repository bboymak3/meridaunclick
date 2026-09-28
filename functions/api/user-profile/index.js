// functions/api/user-profile/index.js
// GET: Get current user's profile (for editing)
// PUT: Update user's profile info + avatar

import { corsHeaders, requireAuth } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;

    const user = await env.DB.prepare(
      'SELECT id, name, email, phone, whatsapp, avatar, bio, role, created_at FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get agent profile if exists
    let agentProfile = null;
    if (user.role === 'agent' || user.role === 'admin') {
      agentProfile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
    }

    // Get badges count
    const badgeCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_badges WHERE user_id = ?').bind(userId).first();

    return new Response(JSON.stringify({ user, agent_profile: agentProfile, badge_count: badgeCount.cnt }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al obtener perfil', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPut(context) {
  try {
    const auth = await requireAuth(context.request, context.env);
    if (auth.error) return auth.error;

    const { env } = context;
    const userId = auth.user.id;
    const body = await context.request.json();
    const { name, phone, whatsapp, bio, avatar } = body;

    // Build dynamic update
    const updates = [];
    const values = [];

    const bad = (msg) => new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    if (name !== undefined) {
      const n = String(name || '').trim();
      if (n.length < 2) return bad('El nombre es obligatorio');
      if (n.length > 80) return bad('El nombre es demasiado largo (máximo 80 caracteres)');
      updates.push('name = ?'); values.push(n);
    }
    if (phone !== undefined) {
      const ph = String(phone || '').trim();
      if (ph.length > 30 || /[^0-9+()\-\s.]/.test(ph)) return bad('Teléfono no válido');
      updates.push('phone = ?'); values.push(ph);
    }
    if (whatsapp !== undefined) {
      const wa = String(whatsapp || '').trim();
      if (wa.length > 30 || /[^0-9+()\-\s.]/.test(wa)) return bad('WhatsApp no válido');
      updates.push('whatsapp = ?'); values.push(wa);
    }
    if (bio !== undefined) {
      const b = String(bio || '').trim();
      if (b.length > 500) return bad('La presentación es demasiado larga (máximo 500 caracteres)');
      updates.push('bio = ?'); values.push(b);
    }
    if (avatar !== undefined) {
      const av = String(avatar || '').trim();
      // Solo URLs propias (subidas con /api/upload) o https
      if (av && !/^(https:\/\/|\/(?!\/))/i.test(av)) return bad('Foto no válida');
      if (av.length > 500) return bad('Foto no válida');
      updates.push('avatar = ?'); values.push(av || null);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(userId);

    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    const updated = await env.DB.prepare(
      'SELECT id, name, email, phone, whatsapp, avatar, bio, role, created_at FROM users WHERE id = ?'
    ).bind(userId).first();

    return new Response(JSON.stringify({ message: 'Perfil actualizado exitosamente', user: updated }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error al actualizar perfil', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
