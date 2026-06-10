// functions/api/notifications/index.js
// GET: Get current user's notifications (supports ?unread=1 filter)
// POST: Mark notifications as read (body: {notification_ids: [1,2,3]} or {all_read: true})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return JSON.parse(atob(base64));
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
  const sigPad = sigBase64.length % 4;
  if (sigPad) sigBase64 += '='.repeat(4 - sigPad);
  const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
  if (!isValid) return null;
  const payload = base64urlDecode(payloadB64);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

async function getUserFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyJWT(token, env.JWT_SECRET);
}

// ─── GET: Get user notifications ──────────────────────────────────
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === '1';

    // Pagination
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;

    // Build query based on filter
    let whereClause = 'WHERE n.user_id = ?';
    const bindings = [user.id];

    if (unreadOnly) {
      whereClause += ' AND n.is_read = 0';
    }

    // Count unread notifications
    const unreadCount = await env.DB.prepare(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(user.id).first();

    // Count total (for pagination)
    const countQuery = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first();

    // Fetch notifications
    const notifications = await env.DB.prepare(`
      SELECT
        n.id,
        n.type,
        n.title,
        n.message,
        n.link,
        n.is_read,
        n.created_at
      FROM notifications n
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      notifications: notifications.results,
      unread_count: unreadCount.unread_count,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ─── POST: Mark notifications as read ────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // Auth required
    const user = await getUserFromRequest(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { notification_ids, all_read } = body;

    // Mark all as read
    if (all_read) {
      await env.DB.prepare(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
      ).bind(user.id).run();

      return new Response(JSON.stringify({ message: 'Todas las notificaciones marcadas como leídas' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark specific notifications as read
    if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
      // Validate all IDs are integers
      const validIds = notification_ids.filter(id => Number.isInteger(id) && id > 0);

      if (validIds.length === 0) {
        return new Response(JSON.stringify({ error: 'notification_ids debe contener IDs válidos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Only mark notifications that belong to this user
      const placeholders = validIds.map(() => '?').join(', ');
      await env.DB.prepare(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders}) AND is_read = 0`
      ).bind(user.id, ...validIds).run();

      return new Response(JSON.stringify({ message: `${validIds.length} notificaciones marcadas como leídas` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Se requiere notification_ids o all_read en el cuerpo de la petición' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
