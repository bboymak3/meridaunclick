// functions/api/academy-config/index.js
// Configuracion propia de la Academia: canales de YouTube de los profesores.
// GET: publico. PUT: solo admin.
//
// Respuesta: { config: { youtube_channels: [{url, name}], youtube_channel_url, youtube_channel_name } }
// (youtube_channel_url/name = primer canal, por compatibilidad)

import { corsHeaders, requireAdmin } from '../../_lib/auth.js';

const MAX_CHANNELS = 4;

async function ensureTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS academy_config (key TEXT PRIMARY KEY, value TEXT DEFAULT '', updated_at TEXT DEFAULT (datetime('now')))").run();
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Normaliza una URL de canal de YouTube. Devuelve '' si no es valida. */
function normalizeChannelUrl(raw) {
  var url = String(raw || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  var parsed;
  try { parsed = new URL(url); } catch (e) { return ''; }
  if (!/(^|\.)youtube\.com$/i.test(parsed.hostname)) return '';
  var path = parsed.pathname.replace(/\/+$/, '');
  if (!path || path === '/') return '';
  return 'https://www.youtube.com' + path;
}

async function readConfig(db) {
  var rows = await db.prepare('SELECT key, value FROM academy_config').all();
  var map = {};
  (rows.results || []).forEach(function (r) { map[r.key] = r.value || ''; });
  var channels = [];
  try { channels = JSON.parse(map.youtube_channels || '[]'); } catch (e) { channels = []; }
  if (!Array.isArray(channels)) channels = [];
  channels = channels.filter(function (c) { return c && c.url; }).slice(0, MAX_CHANNELS);
  // Configuracion anterior (un solo canal)
  if (!channels.length && map.youtube_channel_url) {
    channels = [{ url: map.youtube_channel_url, name: map.youtube_channel_name || '' }];
  }
  return {
    youtube_channels: channels,
    youtube_channel_url: channels[0] ? channels[0].url : '',
    youtube_channel_name: channels[0] ? channels[0].name : '',
  };
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

    // Acepta la lista nueva o el formato anterior de un solo canal
    var input = Array.isArray(body.channels) ? body.channels
      : [{ url: body.youtube_channel_url, name: body.youtube_channel_name }];
    var channels = [];
    for (var i = 0; i < input.length; i++) {
      var c = input[i] || {};
      var rawUrl = String(c.url || '').trim();
      var name = String(c.name || '').trim().slice(0, 100);
      if (!rawUrl && !name) continue; // fila vacia
      var url = normalizeChannelUrl(rawUrl);
      if (!url) {
        return json({ error: 'El canal ' + (i + 1) + ' no es una URL de YouTube valida (ej: https://www.youtube.com/@tucanal)' }, 400);
      }
      if (channels.some(function (x) { return x.url.toLowerCase() === url.toLowerCase(); })) continue;
      channels.push({ url: url, name: name });
    }
    if (channels.length > MAX_CHANNELS) {
      return json({ error: 'Maximo ' + MAX_CHANNELS + ' canales' }, 400);
    }

    var values = {
      youtube_channels: JSON.stringify(channels),
      youtube_channel_url: channels[0] ? channels[0].url : '',
      youtube_channel_name: channels[0] ? channels[0].name : '',
    };
    var stmts = Object.keys(values).map(function (k) {
      return db.prepare("INSERT INTO academy_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(k, values[k]);
    });
    await db.batch(stmts);

    return json({ message: channels.length === 1 ? 'Canal guardado' : channels.length + ' canales guardados', config: await readConfig(db) });
  } catch (error) {
    return json({ error: 'Error al guardar configuracion', details: error.message }, 500);
  }
}
