// functions/sitemap-medicos.xml/index.js
// GET /sitemap-medicos.xml — see functions/_lib/sitemap.js

import { buildMedicos, xmlResponse } from '../_lib/sitemap.js';

export async function onRequestGet({ env }) {
  try {
    return xmlResponse(await buildMedicos(env));
  } catch (error) {
    return new Response('Error generating sitemap', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
