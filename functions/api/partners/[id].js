// GET: Public profile of a user/agent (academy profile - badges, levels, classes)
// Public endpoint - no auth required
// This is the ACADEMY profile, completely separate from the user dashboard profile

import { corsHeaders } from '../../_lib/auth.js';
import { calcLevel, levelName, LEVEL_XP } from '../../_lib/academy-levels.js';

async function ensureTables(db) {
  var tables = [
    "CREATE TABLE IF NOT EXISTS agent_profiles (user_id INTEGER PRIMARY KEY, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_to_next_level INTEGER DEFAULT 100, total_classes_completed INTEGER DEFAULT 0, exam_passed INTEGER DEFAULT 0, exam_passed_at TEXT, exam_attempts INTEGER DEFAULT 0, last_exam_at TEXT, is_partner INTEGER DEFAULT 0, partner_at TEXT, graduated INTEGER DEFAULT 0, graduated_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, badge_description TEXT DEFAULT '', badge_icon TEXT DEFAULT 'fas fa-medal', earned_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS user_class_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, class_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, correct_answers INTEGER DEFAULT 0, total_questions INTEGER DEFAULT 0, total_points INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, completed_at TEXT, UNIQUE(user_id, class_id))",
    "CREATE TABLE IF NOT EXISTS agent_classes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, content TEXT DEFAULT '', xp_reward INTEGER DEFAULT 10, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))"
  ];
  for (var i = 0; i < tables.length; i++) {
    try { await db.prepare(tables[i]).run(); } catch(e) {}
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    var env = context.env;
    var userId = context.params.id;

    await ensureTables(env.DB);

    // Get user basic info - use safe query that handles missing columns
    var user;
    try {
      user = await env.DB.prepare(
        'SELECT id, name, avatar, bio, phone, whatsapp, role, created_at FROM users WHERE id = ?'
      ).bind(userId).first();
    } catch(e) {
      // If columns don't exist, try minimal query
      try {
        user = await env.DB.prepare('SELECT id, name FROM users WHERE id = ?').bind(userId).first();
      } catch(e2) {
        return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create agent profile (this is the ACADEMY profile)
    var agentProfile;
    try {
      agentProfile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
      if (!agentProfile) {
        await env.DB.prepare('INSERT INTO agent_profiles (user_id) VALUES (?)').bind(userId).run();
        agentProfile = await env.DB.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').bind(userId).first();
      }
    } catch(e) {
      agentProfile = null;
    }

    // Get badges
    var badges = [];
    try {
      var badgeResult = await env.DB.prepare(
        'SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC'
      ).bind(userId).all();
      badges = badgeResult.results || [];
    } catch(e) {}

    // Get completed classes
    var completedClasses = [];
    try {
      var classResult = await env.DB.prepare(`
        SELECT ucp.*, ac.title
        FROM user_class_progress ucp
        LEFT JOIN agent_classes ac ON ac.id = ucp.class_id
        WHERE ucp.user_id = ? AND ucp.completed = 1
        ORDER BY ucp.completed_at DESC
      `).bind(userId).all();
      completedClasses = classResult.results || [];
    } catch(e) {}

    // Calculate level from XP
    var xp = agentProfile ? (agentProfile.xp || 0) : 0;
    var level = calcLevel(xp);

    // Ruta de aprendizaje: clases activas vs aprobadas
    var pathTotal = 0;
    try {
      var pt = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM agent_classes WHERE is_active = 1').first();
      pathTotal = (pt && pt.cnt) || 0;
    } catch(e) {}

    // Certificado (Partners): fecha de emision y codigo verificable
    var isPartner = !!agentProfile && (agentProfile.is_partner === 1 || agentProfile.exam_passed === 1 || agentProfile.graduated === 1);
    var certificate = null;
    if (isPartner) {
      var issuedAt = agentProfile.exam_passed_at || agentProfile.partner_at || agentProfile.graduated_at || null;
      var year = issuedAt ? String(issuedAt).slice(0, 4) : String(new Date().getUTCFullYear());
      certificate = {
        issued_at: issuedAt,
        code: 'AC-' + year + '-' + String(user.id).padStart(5, '0'),
      };
    }

    return new Response(JSON.stringify({
      // User basic info (name, avatar, bio)
      user: user,
      // Academy-specific profile data
      agent_profile: agentProfile,
      level: level,
      level_name: levelName(level),
      level_xp: LEVEL_XP,
      xp: xp,
      is_partner: isPartner,
      certificate: certificate,
      path_total: pathTotal,
      exam_attempts: agentProfile ? (agentProfile.exam_attempts || 0) : 0,
      is_graduated: agentProfile ? (agentProfile.graduated === 1) : false,
      // Academy data: badges earned
      badges: badges,
      // Academy data: completed classes with scores
      completed_classes: completedClasses,
      total_badges: badges.length,
      total_classes_completed: completedClasses.length,
      exam_passed: agentProfile ? (agentProfile.exam_passed === 1) : false,
      exam_passed_at: agentProfile ? agentProfile.exam_passed_at : null,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Partner profile error:', error.message);
    return new Response(JSON.stringify({ error: 'Error al obtener perfil de academia', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
