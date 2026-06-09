// functions/api/ai-chat/index.js
// POST: Public AI chatbot endpoint — no auth required

import ZAI from 'z-ai-web-dev-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// ─── JWT helpers (included for consistency, auth not required) ────────
function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return JSON.parse(atob(base64));
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
  const sigPad = sigBase64.length % 4;
  if (sigPad) sigBase64 += '='.repeat(4 - sigPad);
  const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
  if (!isValid) return null;
  const payload = base64urlDecode(payloadB64);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ─── POST: Chat with AI ───────────────────────────────────────────
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // ── Parse request body ────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'El cuerpo de la solicitud debe ser JSON válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, history } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'El campo "message" es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userMessage = message.trim();

    // Limit message length
    if (userMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'El mensaje es demasiado largo (máximo 2000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Check if chatbot is enabled ────────────────────────────────
    if (env.DB) {
      try {
        const chatbotSetting = await env.DB
          .prepare("SELECT value FROM admin_settings WHERE key = ?")
          .bind('ai_chatbot_enabled')
          .first();

        if (chatbotSetting && chatbotSetting.value === '0') {
          return new Response(
            JSON.stringify({ error: 'Chatbot deshabilitado' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        // If settings table doesn't exist yet, continue anyway
        console.warn('Could not check ai_chatbot_enabled setting:', e.message);
      }
    }

    // ── Get welcome message / extra context from settings ─────────
    let welcomeContext = '';
    if (env.DB) {
      try {
        const welcomeRow = await env.DB
          .prepare("SELECT value FROM admin_settings WHERE key = ?")
          .bind('ai_chatbot_welcome')
          .first();

        if (welcomeRow && welcomeRow.value) {
          welcomeContext = welcomeRow.value;
        }
      } catch (e) {
        // Ignore — use default context
      }
    }

    // ── Build system prompt ───────────────────────────────────────
    const systemPrompt = `Eres un asistente virtual amigable y servicial del directorio de negocios "Un Click Mérida".

Tu identidad y propósito:
- Te llamas "Un Click Assistant" y eres la cara amigable del directorio de negocios Un Click en Mérida, Venezuela.
- Tu misión es ayudar a los usuarios a encontrar negocios, servicios, eventos, cupones de descuento y todo lo que ofrece la plataforma.
${welcomeContext ? `- Contexto adicional proporcionado por el administrador: "${welcomeContext}"\n` : ''}
- Siempre respondes en español.

Reglas de comportamiento:
1. Sé amigable, conciso y directo. Respuestas cortas pero útiles (máximo 3-4 oraciones salvo que el usuario pida más detalle).
2. Si el usuario pregunta por un negocio específico (restaurante, clínica, tienda, etc.), sugiérele usar la página de búsqueda en la web para encontrarlo. Por ejemplo: "Puedes encontrar [tipo de negocio] usando nuestro buscador en la página principal."
3. Si pregunta por eventos, dile que puede ver los eventos más recientes en la sección de eventos del sitio.
4. Si pregunta por cupones o descuentos, menciónale la sección de cupones donde puede encontrar ofertas activas.
5. Si pregunta por publicar su propio negocio, explícale brevemente cómo registrarse y agregar su negocio al directorio.
6. Si el usuario saluda, responde de forma cálida y pregúntale en qué puedes ayudarle.
7. NO menciones otras plataformas, directorios, redes sociales o competidores. Solo habla de Un Click.
8. NO inventes información sobre negocios específicos que no estén en tu contexto. Si no estás seguro, sugiere buscar en el sitio.
9. Si el usuario es grosero o pide algo inapropiado, redirige la conversación con amabilidad hacia los servicios de Un Click.
10. Mantén un tono profesional pero cercano y accesible.`;

    // ── Build conversation history ─────────────────────────────────
    const conversationHistory = [];

    if (Array.isArray(history) && history.length > 0) {
      // Accept last 10 messages max to avoid token limits
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationHistory.push({
            role: msg.role,
            content: String(msg.content || '').trim(),
          });
        }
      }
    }

    // ── Call z-ai-web-dev-sdk ─────────────────────────────────────
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
    });

    const reply = completion.choices[0].message.content;

    // ── Return response ───────────────────────────────────────────
    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI Chat error:', error);

    // Return a user-friendly error without leaking internals
    return new Response(
      JSON.stringify({ error: 'Lo sentimos, no pude procesar tu mensaje. Por favor, intenta de nuevo.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
