// functions/sitemap-paginas.xml/index.js
// GET /sitemap-paginas.xml — see functions/_lib/sitemap.js

import { buildPaginas, xmlResponse } from '../_lib/sitemap.js';

export async function onRequestGet({ env }) {
  try {
    return xmlResponse(await buildPaginas(env));
  } catch (error) {
    return new Response('Error generating sitemap', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
