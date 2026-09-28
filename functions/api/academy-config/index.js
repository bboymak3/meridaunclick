// functions/api/academy-config/index.js
// Configuracion propia de la Academia (canal de YouTube).
// GET: publico. PUT: solo admin.

import { corsHeaders, requireAdmin } from '../../_lib/auth.js';

const KEYS = ['youtube_channel_url', 'youtube_channel_name'];

async function ensureTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS academy_config (key TEXT PRIMARY KEY, value TEXT DEFAULT '', updated_at TEXT DEFAULT (datetime('now')))").run();
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function readConfig(db) {
  var config = {};
  KEYS.forEach(function (k) { config[k] = ''; });
  var rows = await db.prepare('SELECT key, value FROM academy_config').all();
  (rows.results || []).forEach(function (r) {
    if (KEYS.indexOf(r.key) !== -1) config[r.key] = r.value || '';
  });
  return config;
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    await ensureTable(context.env.DB);
    return json({ config: await readConfig(context.env.DB) });
  } catch (error) {
    return json({ error: 'Error al cargar configuracion', details: error.message }, 500);
  }
}

export async function onRequestPut(context) {
  try {
    var auth = await requireAdmin(context.request, context.env);
    if (auth.error) return auth.error;

    var db = context.env.DB;
    var body = await context.request.json();
    await ensureTable(db);

    var url = String(body.youtube_channel_url || '').trim();
    if (url) {
      var parsed;
      try { parsed = new URL(url); } catch (e) { parsed = null; }
      if (!parsed || !/(^|\.)youtube\.com$/.test(parsed.hostname)) {
        return json({ error: 'La URL del canal debe ser de youtube.com (ej: https://www.youtube.com/@tucanal)' }, 400);
      }
      url = parsed.origin.replace('://youtube.com', '://www.youtube.com') + parsed.pathname.replace(/\/+$/, '');
    }
    var name = String(body.youtube_channel_name || '').trim().slice(0, 100);

    var values = { youtube_channel_url: url, youtube_channel_name: name };
    var stmts = KEYS.map(function (k) {
      return db.prepare("INSERT INTO academy_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(k, values[k]);
    });
    await db.batch(stmts);

    return json({ message: 'Canal guardado', config: values });
  } catch (error) {
    return json({ error: 'Error al guardar configuracion', details: error.message }, 500);
  }
}
