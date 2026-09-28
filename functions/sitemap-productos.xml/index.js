// functions/sitemap-productos.xml/index.js
// GET /sitemap-productos.xml — see functions/_lib/sitemap.js

import { buildProductos, xmlResponse } from '../_lib/sitemap.js';

export async function onRequestGet({ env }) {
  try {
    return xmlResponse(await buildProductos(env));
  } catch (error) {
    return new Response('Error generating sitemap', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
