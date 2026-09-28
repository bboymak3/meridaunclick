/**
 * HolaX - Horario estructurado de negocios / consultorios
 *
 * Compartido por las Pages Functions (ficha SSR, API) y el navegador
 * (editor del panel, badge "Abierto ahora"). Formato guardado en
 * businesses.schedule_json:
 *   { "days": { "mo": [["08:00","12:00"],["14:00","18:00"]], "tu": [...], ... },
 *     "note": "Previa cita" }
 */

export const DAYS = [
    { key: 'mo', label: 'Lunes', short: 'Lun', schema: 'Monday', js: 1 },
    { key: 'tu', label: 'Martes', short: 'Mar', schema: 'Tuesday', js: 2 },
    { key: 'we', label: 'Miércoles', short: 'Mié', schema: 'Wednesday', js: 3 },
    { key: 'th', label: 'Jueves', short: 'Jue', schema: 'Thursday', js: 4 },
    { key: 'fr', label: 'Viernes', short: 'Vie', schema: 'Friday', js: 5 },
    { key: 'sa', label: 'Sábado', short: 'Sáb', schema: 'Saturday', js: 6 },
    { key: 'su', label: 'Domingo', short: 'Dom', schema: 'Sunday', js: 0 },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validate/normalize any input (object or JSON string). Returns null if empty. */
export function parseSchedule(input) {
    let raw = input;
    if (!raw) return null;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return null; }
    }
    if (!raw || typeof raw !== 'object') return null;
    const days = {};
    let any = false;
    for (const d of DAYS) {
        const ranges = Array.isArray(raw.days && raw.days[d.key]) ? raw.days[d.key] : [];
        const clean = ranges
            .filter(r => Array.isArray(r) && TIME_RE.test(r[0]) && TIME_RE.test(r[1]) && r[0] < r[1])
            .slice(0, 2)
            .map(r => [r[0], r[1]]);
        if (clean.length) { days[d.key] = clean; any = true; }
    }
    const note = String(raw.note || '').trim().slice(0, 200);
    if (!any && !note) return null;
    return { days, note };
}

function rangesText(ranges) {
    return ranges.map(r => r[0] + '–' + r[1]).join(' y ');
}

/** Human summary, grouping consecutive days with the same hours. */
export function scheduleToText(s) {
    if (!s) return '';
    const parts = [];
    let i = 0;
    while (i < DAYS.length) {
        const r = s.days[DAYS[i].key];
        if (!r) { i++; continue; }
        const key = JSON.stringify(r);
        let j = i;
        while (j + 1 < DAYS.length && JSON.stringify(s.days[DAYS[j + 1].key] || null) === key) j++;
        const label = j > i ? DAYS[i].short + '–' + DAYS[j].short : DAYS[i].short;
        parts.push(label + ' ' + rangesText(r));
        i = j + 1;
    }
    let text = parts.join(' · ');
    if (s.note) text += (text ? ' · ' : '') + s.note;
    return text;
}

/** schema.org openingHoursSpecification */
export function openingHoursSpecification(s) {
    if (!s) return [];
    const out = [];
    for (const d of DAYS) {
        for (const r of s.days[d.key] || []) {
            out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/' + d.schema, opens: r[0], closes: r[1] });
        }
    }
    return out;
}

/** Venezuela is UTC-4 all year. Returns { open, label } for the given Date. */
export function openStatus(s, now) {
    if (!s || !Object.keys(s.days).length) return null;
    const ve = new Date((now || new Date()).getTime() - 4 * 3600 * 1000);
    const jsDay = ve.getUTCDay();
    const hhmm = String(ve.getUTCHours()).padStart(2, '0') + ':' + String(ve.getUTCMinutes()).padStart(2, '0');
    const today = DAYS.find(d => d.js === jsDay);
    const ranges = s.days[today.key] || [];
    const current = ranges.find(r => hhmm >= r[0] && hhmm < r[1]);
    if (current) return { open: true, label: 'Abierto ahora · cierra a las ' + current[1] };
    const later = ranges.find(r => hhmm < r[0]);
    if (later) return { open: false, label: 'Cerrado · abre hoy a las ' + later[0] };
    for (let k = 1; k <= 7; k++) {
        const d = DAYS.find(x => x.js === (jsDay + k) % 7);
        const r = s.days[d.key];
        if (r && r.length) return { open: false, label: 'Cerrado · abre ' + (k === 1 ? 'mañana' : 'el ' + d.label.toLowerCase()) + ' a las ' + r[0][0] };
    }
    return { open: false, label: 'Cerrado' };
}

// ─── FAQs por negocio (businesses.faqs) ───
export function parseFaqs(input) {
    let raw = input;
    if (!raw) return [];
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return []; }
    }
    if (!Array.isArray(raw)) return [];
    return raw
        .map(f => ({ q: String((f && f.q) || '').trim().slice(0, 200), a: String((f && f.a) || '').trim().slice(0, 1000) }))
        .filter(f => f.q && f.a)
        .slice(0, 8);
}

// ─── Browser: expose helpers for the dashboard editor and the ficha ───
if (typeof window !== 'undefined') {
    window.HolaxHorario = { DAYS, parseSchedule, scheduleToText, openStatus, parseFaqs };

    // "Abierto ahora" badge on the business page (data rendered by the server)
    const applyBadge = () => {
        document.querySelectorAll('[data-hx-schedule]').forEach(el => {
            const s = parseSchedule(el.getAttribute('data-hx-schedule'));
            const st = openStatus(s);
            if (!st) return;
            el.textContent = st.label;
            el.classList.toggle('is-open', st.open);
            el.classList.toggle('is-closed', !st.open);
            el.hidden = false;
        });
        const now = new Date(Date.now() - 4 * 3600 * 1000).getUTCDay();
        document.querySelectorAll('[data-hx-day]').forEach(row => {
            row.classList.toggle('is-today', Number(row.getAttribute('data-hx-day')) === now);
        });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBadge);
    else applyBadge();
}
