// functions/api/admin/chat-logs/index.js
// GET: List ALL conversations with search (admin only)
// GET with ?conversation_id=X: Get messages for a specific conversation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

async function ensureTables(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, business_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL, seller_id INTEGER NOT NULL,
      last_message TEXT, last_message_at TEXT,
      buyer_unread INTEGER DEFAULT 0, seller_unread INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(buyer_id, seller_id, business_id)
    )`).run();
  } catch (e) {}
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL, content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    )`).run();
  } catch (e) {}
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring(7);
    const user = await verifyJWT(token, env.JWT_SECRET || 'aunclick_jwt_secret_2024_secure');
    if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (user.role !== 'admin') return new Response(JSON.stringify({ error: 'Solo administradores' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await ensureTables(env.DB);

    const url = new URL(request.url);
    const params = url.searchParams;

    // ─── If conversation_id provided, return messages ─────────
    const conversationId = params.get('conversation_id');
    if (conversationId) {
      const convId = parseInt(conversationId);
      if (!convId) {
        return new Response(JSON.stringify({ error: 'ID inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get conversation info
      const conv = await env.DB.prepare(`
        SELECT c.*,
               b.title as business_title, b.slug as business_slug,
               ub.name as buyer_name, ub.email as buyer_email,
               us.name as seller_name, us.email as seller_email
        FROM conversations c
        LEFT JOIN businesses b ON c.business_id = b.id
        LEFT JOIN users ub ON c.buyer_id = ub.id
        LEFT JOIN users us ON c.seller_id = us.id
        WHERE c.id = ?
      `).bind(convId).first();

      if (!conv) {
        return new Response(JSON.stringify({ error: 'Conversación no encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get all messages
      const msgs = await env.DB.prepare(`
        SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at,
               u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `).bind(convId).all();

      return new Response(JSON.stringify({
        conversation: {
          id: conv.id,
          business_id: conv.business_id,
          business_title: conv.business_title,
          business_slug: conv.business_slug,
          buyer: { id: conv.buyer_id, name: conv.buyer_name, email: conv.buyer_email },
          seller: { id: conv.seller_id, name: conv.seller_name, email: conv.seller_email },
          created_at: conv.created_at,
          last_message_at: conv.last_message_at,
          message_count: msgs.results.length,
        },
        messages: msgs.results.map(m => ({
          id: m.id,
          sender_id: m.sender_id,
          sender_name: m.sender_name,
          content: m.content,
          is_read: m.is_read,
          created_at: m.created_at,
        })),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── List all conversations with search ───────────────────
    const search = params.get('search') || '';
    const page = parseInt(params.get('page')) || 1;
    const limit = Math.min(parseInt(params.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;

    const conditions = [];
    const bindings = [];

    if (search) {
      conditions.push(`(
        ub.name LIKE ? OR us.name LIKE ? OR
        ub.email LIKE ? OR us.email LIKE ? OR
        b.title LIKE ? OR c.last_message LIKE ?
      )`);
      const s = `%${search}%`;
      bindings.push(s, s, s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM conversations c
      LEFT JOIN users ub ON c.buyer_id = ub.id
      LEFT JOIN users us ON c.seller_id = us.id
      LEFT JOIN businesses b ON c.business_id = b.id
      ${whereClause}
    `).bind(...bindings).first();
    const total = countResult ? countResult.total : 0;

    // Fetch
    const conversations = await env.DB.prepare(`
      SELECT c.id, c.business_id, c.buyer_id, c.seller_id,
             c.last_message, c.last_message_at, c.created_at,
             c.buyer_unread, c.seller_unread,
             b.title as business_title, b.slug as business_slug,
             ub.name as buyer_name, ub.email as buyer_email,
             us.name as seller_name, us.email as seller_email,
             (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
      FROM conversations c
      LEFT JOIN users ub ON c.buyer_id = ub.id
      LEFT JOIN users us ON c.seller_id = us.id
      LEFT JOIN businesses b ON c.business_id = b.id
      ${whereClause}
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    return new Response(JSON.stringify({
      conversations: conversations.results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { total_conversations: total },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Admin chat-logs error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor: ' + error.message, debug: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}