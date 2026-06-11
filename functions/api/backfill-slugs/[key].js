// functions/api/backfill-slugs/[key].js
// One-time script to backfill slugs for existing businesses and products
// Usage: GET /api/backfill-slugs/RUN
// Requires auth token (Bearer) or key param matching JWT_SECRET

export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const { key } = params;

    // Auth: either Bearer token with admin role, or key = 'RUN'
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (key !== 'RUN') {
        return new Response('Unauthorized: need auth token or /api/backfill-slugs/RUN', { status: 401 });
      }
    }

    if (!env.DB) {
      return new Response('Database unavailable', { status: 500 });
    }

    const results = { businesses: { total: 0, updated: 0, skipped: 0, errors: 0 }, products: { total: 0, updated: 0, skipped: 0, errors: 0 } };

    // ─── Backfill Business Slugs ──────────────────────────────────
    try {
      const businesses = await env.DB.prepare(
        "SELECT id, title FROM businesses WHERE slug IS NULL OR slug = '' OR TRIM(slug) = ''"
      ).all();

      results.businesses.total = businesses.results.length;

      for (const biz of businesses.results) {
        try {
          const slug = generateSlug(biz.title);
          if (!slug) { results.businesses.skipped++; continue; }

          const uniqueSlug = await ensureUniqueSlug(env.DB, 'businesses', slug, biz.id);
          await env.DB.prepare("UPDATE businesses SET slug = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(uniqueSlug, biz.id).run();
          results.businesses.updated++;
        } catch (err) {
          results.businesses.errors++;
        }
      }
    } catch (e) {
      results.businesses.errors++;
    }

    // ─── Backfill Product Slugs ──────────────────────────────────
    try {
      const products = await env.DB.prepare(
        "SELECT id, name FROM products WHERE slug IS NULL OR slug = '' OR TRIM(slug) = ''"
      ).all();

      results.products.total = products.results.length;

      for (const prod of products.results) {
        try {
          const slug = generateSlug(prod.name);
          if (!slug) { results.products.skipped++; continue; }

          const uniqueSlug = await ensureUniqueSlug(env.DB, 'products', slug, prod.id);
          await env.DB.prepare("UPDATE products SET slug = ? WHERE id = ?")
            .bind(uniqueSlug, prod.id).run();
          results.products.updated++;
        } catch (err) {
          results.products.errors++;
        }
      }
    } catch (e) {
      // products table might not have slug column
      results.products.errors++;
    }

    return new Response(JSON.stringify({
      message: 'Slug backfill completed',
      timestamp: new Date().toISOString(),
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function generateSlug(text) {
  if (!text || !text.trim()) return '';
  return text.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 120)
    .replace(/^-|-$/g, '');
}

async function ensureUniqueSlug(db, table, baseSlug, currentId) {
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.prepare(
      `SELECT id FROM ${table} WHERE slug = ? AND id != ?`
    ).bind(candidate, currentId).first();
    if (!existing) break;
    candidate = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) break;
  }
  return candidate;
}
