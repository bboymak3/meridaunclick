// functions/sitemap.xml/index.js
// GET /sitemap.xml — sitemap index pointing to the per-section sitemaps
// (see functions/_lib/sitemap.js)

import { buildIndex, xmlResponse } from '../_lib/sitemap.js';

export async function onRequestGet() {
  return xmlResponse(buildIndex());
}
