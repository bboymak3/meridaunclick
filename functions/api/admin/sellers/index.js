// functions/api/admin/sellers/index.js
// GET: List all seller profiles (admin only)

import { corsHeaders, requireAdmin, errorResponse, corsResponse, jsonResponse } from '../../../_lib/auth.js';

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    // REQUIRE ADMIN AUTH (was fake auth - now actually verifies)
    const { user, error } = await requireAdmin(request, env);
    if (error) return error;

    if (!env.DB) {
      return errorResponse('Base de datos no disponible', 500);
    }

    // Check if sellers_profiles table exists
    const tableCheck = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sellers_profiles'").first();
    if (!tableCheck) {
      const agentSellers = await env.DB.prepare(`
        SELECT u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role,
               COALESCE(u.plan_type, 'basic') as plan_type,
               u.avatar, u.phone, u.whatsapp,
               (SELECT b.title FROM businesses b WHERE b.user_id = u.id LIMIT 1) as store_name,
               (SELECT COUNT(*) FROM businesses b WHERE b.user_id = u.id) as business_count,
               u.created_at
        FROM users u
        WHERE u.role IN ('agent', 'user')
          AND u.id IN (SELECT DISTINCT user_id FROM businesses)
        ORDER BY u.created_at DESC
      `).all();

      return jsonResponse({ sellers: agentSellers.results || [] });
    }

    // Discover actual columns in sellers_profiles table
    const colRows = await env.DB.prepare("PRAGMA table_info(sellers_profiles)").all();
    const existingCols = (colRows.results || []).map(r => r.name);
    const colSet = new Set(existingCols);

    const spSelects = [];
    if (colSet.has('user_id')) spSelects.push('sp.user_id');
    if (colSet.has('store_name')) spSelects.push("sp.store_name");
    else spSelects.push("(SELECT b.title FROM businesses b WHERE b.user_id = sp.user_id LIMIT 1) as store_name");
    if (colSet.has('description')) spSelects.push("sp.description");
    else spSelects.push("'' as description");
    if (colSet.has('avatar')) spSelects.push("sp.avatar");
    else spSelects.push("'' as avatar");
    if (colSet.has('city')) spSelects.push("sp.city");
    else spSelects.push("'' as city");
    if (colSet.has('state')) spSelects.push("sp.state");
    else spSelects.push("'' as state");
    if (colSet.has('phone')) spSelects.push("sp.phone");
    else spSelects.push("'' as phone");
    if (colSet.has('whatsapp')) spSelects.push("sp.whatsapp");
    else spSelects.push("'' as whatsapp");
    if (colSet.has('instagram')) spSelects.push("sp.instagram");
    else spSelects.push("'' as instagram");
    if (colSet.has('facebook')) spSelects.push("sp.facebook");
    else spSelects.push("'' as facebook");
    if (colSet.has('tiktok')) spSelects.push("sp.tiktok");
    else spSelects.push("'' as tiktok");
    if (colSet.has('rating')) spSelects.push("sp.rating");
    else spSelects.push("0 as rating");
    if (colSet.has('total_sales')) spSelects.push("sp.total_sales");
    else spSelects.push("0 as total_sales");
    if (colSet.has('created_at')) spSelects.push("sp.created_at");
    else spSelects.push("'' as created_at");
    if (colSet.has('updated_at')) spSelects.push("sp.updated_at");
    else spSelects.push("'' as updated_at");

    const query = `
      SELECT ${spSelects.join(', ')},
             COALESCE(u.name, 'Sin nombre') as user_name,
             u.email as user_email,
             u.role as user_role,
             COALESCE(u.plan_type, 'basic') as plan_type,
             (SELECT COUNT(*) FROM businesses b WHERE b.user_id = sp.user_id) as business_count
      FROM sellers_profiles sp
      LEFT JOIN users u ON sp.user_id = u.id
      ORDER BY sp.created_at DESC
    `;

    const sellers = await env.DB.prepare(query).all();
    return jsonResponse({ sellers: sellers.results || [] });
  } catch (error) {
    console.error('Sellers list error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}