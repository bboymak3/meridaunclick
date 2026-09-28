// functions/_lib/wiki-store.js
// Ediciones de la wiki guardadas en D1 (tabla wiki_overrides) que se
// superponen a los datos por defecto de estados-data.js. Asi el admin puede
// cambiar textos, listas, telefonos y el bloque de asesoria legal sin tocar
// el codigo. slug = '_global' guarda la configuracion comun.

import { ESTADOS, WIKI_GLOBAL_DEFAULTS, WIKI_STATE_FIELDS } from './estados-data.js';

export const GLOBAL_SLUG = '_global';

export async function ensureWikiTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS wiki_overrides (
       slug TEXT PRIMARY KEY,
       data TEXT NOT NULL,
       updated_at TEXT DEFAULT (datetime('now')),
       updated_by INTEGER
     )`
  ).run();
}

function parse(row) {
  if (!row || !row.data) return {};
  try {
    const d = JSON.parse(row.data);
    return d && typeof d === 'object' ? d : {};
  } catch (e) {
    return {};
  }
}

/** All overrides as { slug: data }. Returns {} if the table doesn't exist yet. */
export async function loadAllOverrides(env) {
  if (!env.DB) return {};
  try {
    const r = await env.DB.prepare('SELECT slug, data, updated_at FROM wiki_overrides').all();
    const out = {};
    for (const row of r.results || []) out[row.slug] = { ...parse(row), _updated_at: row.updated_at };
    return out;
  } catch (e) {
    return {};
  }
}

export async function loadOverride(env, slug) {
  if (!env.DB) return {};
  try {
    const row = await env.DB.prepare('SELECT data, updated_at FROM wiki_overrides WHERE slug = ?').bind(slug).first();
    return row ? { ...parse(row), _updated_at: row.updated_at } : {};
  } catch (e) {
    return {};
  }
}

function isSet(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Default state data with the admin's non-empty overrides applied. */
export function mergeEstado(estado, override) {
  const o = override || {};
  const out = { ...estado, banner_url: '', emergencias_extra: [], envios: [], datos_utiles: '' };
  for (const f of WIKI_STATE_FIELDS) {
    if (isSet(o[f])) out[f] = o[f];
  }
  out.area = Number(out.area) || estado.area;
  out.population = Number(out.population) || estado.population;
  return out;
}

export function mergeGlobal(override) {
  const o = override || {};
  const out = { ...WIKI_GLOBAL_DEFAULTS };
  for (const k of Object.keys(WIKI_GLOBAL_DEFAULTS)) {
    if (k === 'legal_enabled') {
      if (typeof o[k] === 'boolean') out[k] = o[k];
    } else if (isSet(o[k])) {
      out[k] = String(o[k]);
    }
  }
  return out;
}

// ─── Validation of admin input ───
const LIST_FIELDS = ['economia', 'atractivos', 'municipios'];
const PAIR_FIELDS = ['emergencias_extra', 'envios'];

function toLines(v) {
  const arr = Array.isArray(v) ? v : String(v || '').split('\n');
  return arr.map(x => String(x).trim()).filter(Boolean).slice(0, 200).map(x => x.slice(0, 300));
}

/** Clean a state override coming from the admin panel. */
export function sanitizeStateOverride(input) {
  const out = {};
  for (const f of WIKI_STATE_FIELDS) {
    if (!(f in (input || {}))) continue;
    const v = input[f];
    if (LIST_FIELDS.includes(f)) {
      out[f] = toLines(v);
    } else if (PAIR_FIELDS.includes(f)) {
      // Lines "Nombre | Teléfono | Detalle (opcional)"
      out[f] = toLines(v).map(line => {
        const [name, phone, detail] = line.split('|').map(x => (x || '').trim());
        return { name: name || '', phone: phone || '', detail: detail || '' };
      }).filter(x => x.name);
    } else if (f === 'area' || f === 'population') {
      const n = Number(String(v).replace(/[^0-9.]/g, ''));
      if (n > 0) out[f] = n;
    } else if (f === 'banner_url') {
      const u = String(v || '').trim();
      if (!u || /^https?:\/\//i.test(u) || u.startsWith('/')) out[f] = u.slice(0, 500);
    } else {
      out[f] = String(v || '').trim().slice(0, 4000);
    }
  }
  return out;
}

export function sanitizeGlobalOverride(input) {
  const out = {};
  for (const k of Object.keys(WIKI_GLOBAL_DEFAULTS)) {
    if (!(k in (input || {}))) continue;
    if (k === 'legal_enabled') out[k] = !!input[k];
    else if (k.endsWith('_url')) {
      const u = String(input[k] || '').trim();
      if (!u || /^https?:\/\//i.test(u)) out[k] = u.slice(0, 300);
    } else out[k] = String(input[k] || '').trim().slice(0, 1000);
  }
  return out;
}

export function isValidWikiSlug(slug) {
  return slug === GLOBAL_SLUG || ESTADOS.some(e => e.slug === slug);
}

/** WhatsApp link for the legal block. */
export function legalWhatsappUrl(g) {
  const phone = String(g.legal_phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(g.legal_message || '')}`;
}
