// functions/api/migrate/agent-academy.js
// GET: Migrate DB for Agent Academy system (classes, questions, levels, badges)
// Run once: /api/migrate/agent-academy

import { corsHeaders } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB no disponible' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    // 1. agent_classes - Classes created by admin
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS agent_classes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          content TEXT DEFAULT '',
          xp_reward INTEGER DEFAULT 10,
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      results.push({ table: 'agent_classes', status: 'created' });
    } catch (e) {
      results.push({ table: 'agent_classes', status: 'error', error: e.message });
    }

    // 2. class_questions - Questions per class
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS class_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          class_id INTEGER NOT NULL,
          question TEXT NOT NULL,
          option_a TEXT NOT NULL,
          option_b TEXT NOT NULL,
          option_c TEXT NOT NULL,
          option_d TEXT NOT NULL,
          correct_answer TEXT NOT NULL CHECK(correct_answer IN ('a', 'b', 'c', 'd')),
          explanation TEXT DEFAULT '',
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (class_id) REFERENCES agent_classes(id) ON DELETE CASCADE
        )
      `).run();
      results.push({ table: 'class_questions', status: 'created' });
    } catch (e) {
      results.push({ table: 'class_questions', status: 'error', error: e.message });
    }

    // 3. user_class_progress - User progress per class
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_class_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          class_id INTEGER NOT NULL,
          completed INTEGER DEFAULT 0,
          correct_answers INTEGER DEFAULT 0,
          total_questions INTEGER DEFAULT 0,
          xp_earned INTEGER DEFAULT 0,
          completed_at TEXT,
          UNIQUE(user_id, class_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (class_id) REFERENCES agent_classes(id)
        )
      `).run();
      results.push({ table: 'user_class_progress', status: 'created' });
    } catch (e) {
      results.push({ table: 'user_class_progress', status: 'error', error: e.message });
    }

    // 4. agent_profiles - Level/XP tracking per user
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS agent_profiles (
          user_id INTEGER PRIMARY KEY,
          level INTEGER DEFAULT 1,
          xp INTEGER DEFAULT 0,
          xp_to_next_level INTEGER DEFAULT 100,
          total_classes_completed INTEGER DEFAULT 0,
          exam_passed INTEGER DEFAULT 0,
          exam_passed_at TEXT,
          exam_attempts INTEGER DEFAULT 0,
          last_exam_at TEXT,
          is_partner INTEGER DEFAULT 0,
          partner_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `).run();
      results.push({ table: 'agent_profiles', status: 'created' });
    } catch (e) {
      results.push({ table: 'agent_profiles', status: 'error', error: e.message });
    }

    // 5. user_badges - Badges/medals earned
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_badges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          badge_type TEXT NOT NULL,
          badge_name TEXT NOT NULL,
          badge_description TEXT DEFAULT '',
          badge_icon TEXT DEFAULT 'fas fa-medal',
          earned_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `).run();
      results.push({ table: 'user_badges', status: 'created' });
    } catch (e) {
      results.push({ table: 'user_badges', status: 'error', error: e.message });
    }

    // 6. Add avatar column to users if missing
    try {
      await env.DB.prepare('ALTER TABLE users ADD COLUMN avatar TEXT').run();
      results.push({ table: 'users', column: 'avatar', status: 'added' });
    } catch (e) {
      results.push({ table: 'users', column: 'avatar', status: e.message && e.message.includes('duplicate') ? 'already exists' : 'error: ' + e.message });
    }

    return new Response(JSON.stringify({ success: true, message: 'Migracion Agent Academy completada', results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error en migracion', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
