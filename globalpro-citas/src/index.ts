// src/index.ts — GlobalPro Citas Worker
// Chat con LLM + Agendamiento automático + WhatsApp (UltraMsg)

import { Env, ChatMessage, CitaRequest, SlotDisponible } from './types';

const MODEL_ID = '@cf/meta/llama-3.1-8b-instruct-fp8';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── System Prompt para el Chat de Agendamiento ────────────────
function getSystemPrompt(businessName: string, servicios: string): string {
  return `Eres un asistente virtual experto en servicios automotrices de "${businessName}". Tu MISIÓN PRINCIPAL es ayudar a los clientes a AGENDAR CITAS de manera eficiente y amigable.

REGLAS IMPORTANTES:
1. Saluda siempre de forma cálida y profesional
2. Guía al cliente paso a paso para agendar su cita
3. Si el cliente proporciona su patente/placa, infórmale sobre su vehículo y historial reciente
4. Sugiere servicios basados en el historial del vehículo
5. Cuando tengas toda la info (patente, nombre, teléfono, servicio, fecha, hora), genera un JSON de agendamiento
6. Siempre habla en español
7. Sé conciso pero amigable

SERVICIOS DISPONIBLES:
${servicios}

FLUJO DE AGENDAMIENTO:
Paso 1: Pregunta la patente del vehículo
Paso 2: Muestra info del vehículo (si está en la base de datos)
Paso 3: Pregunta qué servicio necesita
Paso 4: Pregunta fecha y hora preferida
Paso 5: Pregunta nombre y teléfono de contacto
Paso 6: Confirma todos los datos

CUANDO tengas TODOS los datos, responde con este formato ESPECIAL al final:
[CITA_JSON]
{"patente":"XXX","nombre":"XXX","telefono":"XXX","servicio":"XXX","fecha":"YYYY-MM-DD","hora":"HH:MM","observaciones":""}
[/CITA_JSON]

Si falta algún dato, NO generes el JSON. Pregunta amablemente por lo que falta.

RESPUESTAS CORTAS:
- Mantén respuestas de máximo 3-4 líneas
- Usa emojis relevantes: 🚗 🔧 📅 ⏰ ✅
- Si preguntan por precios, da rangos aproximados`;
}

// ─── WhatsApp via UltraMsg ────────────────────────────────────
async function sendWhatsApp(env: Env, to: string, body: string): Promise<boolean> {
  const instanceId = env.ULTRAMSG_INSTANCE_ID;
  const token = env.ULTRAMSG_TOKEN;
  if (!instanceId || !token) {
    console.log('UltraMsg not configured, skipping WhatsApp');
    return false;
  }

  try {
    const phone = to.startsWith('+') ? to : `+${to}`;
    const whatsAppTo = phone.replace(/[^0-9]/g, '') + '@c.us';
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        to: whatsAppTo,
        body: body,
      }),
    });

    const result = await response.json() as any;
    return result.status === 'success' || result.sent === true;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
}

async function notifyNewCita(env: Env, cita: any): Promise<{ negocio: boolean; cliente: boolean }> {
  const negocioMsg = `🔧 *NUEVA CITA AGENDADA* 🔧

📅 Fecha: ${cita.fecha_cita}
⏰ Hora: ${cita.hora_cita}
👤 Cliente: ${cita.nombre_cliente}
📞 Teléfono: ${cita.telefono}
🚗 Patente: ${cita.patente}${cita.marca ? ' (' + cita.marca + ' ' + cita.modelo + ')' : ''}
🔧 Servicio: ${cita.servicio}
${cita.observaciones ? '📝 Notas: ' + cita.observaciones : ''}
---
Canal: ${cita.canal || 'chat'}`;

  const clienteMsg = `✅ *Tu cita ha sido agendada!*

🗓️ ${env.BUSINESS_NAME}
📅 Fecha: ${cita.fecha_cita}
⏰ Hora: ${cita.hora_cita}
🔧 Servicio: ${cita.servicio}

📍 Te esperamos en nuestras instalaciones.
📞 Si necesitas cambiar o cancelar, contáctanos al ${env.BUSINESS_PHONE}

¡Gracias por confiar en nosotros! 🚗`;

  const [negocioResult, clienteResult] = await Promise.all([
    sendWhatsApp(env, env.BUSINESS_PHONE, negocioMsg),
    sendWhatsApp(env, cita.telefono, clienteMsg),
  ]);

  return { negocio: negocioResult, cliente: clienteResult };
}

// ─── Consultar Vehículo en API externa ──────────────────────
async function consultarVehiculo(env: Env, patente: string): Promise<any> {
  try {
    const response = await fetch(env.VEHICULO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patente: patente.toUpperCase().trim() }),
    });
    return await response.json() as any;
  } catch (error) {
    console.error('Error consultando vehículo:', error);
    return { success: false, error: 'No se pudo consultar el vehículo' };
  }
}

// ─── Disponibilidad de Citas ────────────────────────────────
async function getDisponibilidad(env: Env, fecha: string): Promise<{ slots: SlotDisponible[]; cerrado: boolean }> {
  // Get day of week in Spanish
  const dateObj = new Date(fecha + 'T12:00:00');
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaSemana = dias[dateObj.getDay()];

  // Check horario
  const horario = await env.DB.prepare('SELECT * FROM horarios WHERE dia_semana = ?').bind(diaSemana).first() as any;
  if (!horario || !horario.activo) {
    return { slots: [], cerrado: true };
  }

  // Check bloqueos
  const bloqueo = await env.DB.prepare('SELECT * FROM bloqueos WHERE fecha = ?').bind(fecha).first();
  if (bloqueo) {
    return { slots: [], cerrado: true };
  }

  // Get max citas por dia
  const configMax = await env.DB.prepare("SELECT valor FROM config WHERE clave = 'max_citas_por_dia'").first() as any;
  const maxCitas = configMax ? parseInt(configMax.valor) : 20;

  // Get existing citas for that date
  const citasExistentes = await env.DB.prepare("SELECT hora_cita FROM Citas WHERE fecha_cita = ? AND estado NOT IN ('cancelada')").bind(fecha).all();
  const horasOcupadas = new Set((citasExistentes.results as any[]).map(c => c.hora_cita));

  // Generate time slots
  const slots: SlotDisponible[] = [];
  const [aperturaH, aperturaM] = horario.hora_apertura.split(':').map(Number);
  const [cierreH, cierreM] = horario.hora_cierre.split(':').map(Number);
  const intervalo = horario.intervalo_minutos || 30;

  let currentMinutes = aperturaH * 60 + aperturaM;
  const endMinutes = cierreH * 60 + cierreM;

  // Check minimum advance time (2 hours from now)
  const now = new Date();
  const fechaMinima = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  while (currentMinutes + 60 <= endMinutes) { // Reserve at least 60 min before closing
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // Check if slot is in the past
    const slotTime = new Date(fecha + 'T' + horaStr + ':00');
    if (slotTime > fechaMinima) {
      const ocupadasEnSlot = Array.from(horasOcupadas).filter(oh => {
        const [ohH, ohM] = oh.split(':').map(Number);
        const ohMinutes = ohH * 60 + ohM;
        return Math.abs(ohMinutes - currentMinutes) < 60;
      }).length;

      slots.push({
        hora: horaStr,
        disponibles: Math.max(0, maxCitas - ocupadasEnSlot),
        maximo: maxCitas,
      });
    }
    currentMinutes += intervalo;
  }

  return { slots, cerrado: false };
}

// ─── CORS handler ───────────────────────────────────────────
function handleCors(): Response {
  return new Response(null, { headers: CORS_HEADERS });
}

// ─── Main Worker ────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    try {
      // ─── API Routes ─────────────────────────────────────────

      // GET /api/servicios — List available services
      if (path === '/api/servicios' && request.method === 'GET') {
        const servicios = await env.DB.prepare('SELECT * FROM servicios WHERE activo = 1 ORDER BY orden ASC').all();
        return new Response(JSON.stringify({ servicios: servicios.results }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // GET /api/disponibilidad — Check available slots
      if (path === '/api/disponibilidad' && request.method === 'GET') {
        const fecha = url.searchParams.get('fecha');
        if (!fecha) {
          return new Response(JSON.stringify({ error: 'Fecha requerida (formato YYYY-MM-DD)' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const result = await getDisponibilidad(env, fecha);
        return new Response(JSON.stringify(result), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/consultar-vehiculo — Query vehicle info
      if (path === '/api/consultar-vehiculo' && request.method === 'POST') {
        const body = await request.json() as { patente: string };
        if (!body.patente) {
          return new Response(JSON.stringify({ error: 'Patente requerida' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const vehiculoData = await consultarVehiculo(env, body.patente);
        return new Response(JSON.stringify(vehiculoData), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/agendar — Create appointment
      if (path === '/api/agendar' && request.method === 'POST') {
        const body = await request.json() as CitaRequest;

        // Validate required fields
        if (!body.patente || !body.nombre || !body.telefono || !body.servicio || !body.fecha || !body.hora) {
          return new Response(JSON.stringify({
            error: 'Faltan campos requeridos',
            requeridos: ['patente', 'nombre', 'telefono', 'servicio', 'fecha', 'hora'],
          }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Check availability
        const disp = await getDisponibilidad(env, body.fecha);
        if (disp.cerrado) {
          return new Response(JSON.stringify({ error: 'No hay disponibilidad para esa fecha' }), {
            status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        const slot = disp.slots.find(s => s.hora === body.hora);
        if (!slot || slot.disponibles <= 0) {
          return new Response(JSON.stringify({ error: 'No hay cupos disponibles para esa hora' }), {
            status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Check for duplicate appointment
        const existente = await env.DB.prepare(
          "SELECT id FROM Citas WHERE patente = ? AND fecha_cita = ? AND hora_cita = ? AND estado NOT IN ('cancelada', 'no_asistio')"
        ).bind(body.patente.toUpperCase().trim(), body.fecha, body.hora).first();

        if (existente) {
          return new Response(JSON.stringify({ error: 'Ya existe una cita para esa patente en ese horario' }), {
            status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Get service duration
        const servicio = await env.DB.prepare('SELECT duracion_minutos FROM servicios WHERE nombre = ?').bind(body.servicio).first() as any;
        const duracion = servicio ? servicio.duracion_minutos : 60;

        // Insert appointment
        const result = await env.DB.prepare(`
          INSERT INTO Citas (patente, marca, modelo, anio, nombre_cliente, telefono, email, servicio, fecha_cita, hora_cita, duracion_minutos, observaciones, canal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          body.patente.toUpperCase().trim(),
          body.marca || null,
          body.modelo || null,
          body.anio || null,
          body.nombre.trim(),
          body.telefono.trim(),
          body.email || null,
          body.servicio,
          body.fecha,
          body.hora,
          duracion,
          body.observaciones || null,
          body.canal || 'chat'
        ).run();

        const citaId = result.meta.last_row_id;

        // Get the created appointment
        const cita = await env.DB.prepare('SELECT * FROM Citas WHERE id = ?').bind(citaId).first() as any;

        // Send WhatsApp notifications
        const notifResult = await notifyNewCita(env, cita);

        // Update notification status
        await env.DB.prepare(
          "UPDATE Citas SET notificada_negocio = ?, notificada_cliente = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(notifResult.negocio ? 1 : 0, notifResult.cliente ? 1 : 0, citaId).run();

        return new Response(JSON.stringify({
          success: true,
          mensaje: 'Cita agendada exitosamente',
          cita: {
            id: citaId,
            patente: cita.patente,
            nombre: cita.nombre_cliente,
            telefono: cita.telefono,
            servicio: cita.servicio,
            fecha: cita.fecha_cita,
            hora: cita.hora_cita,
            estado: cita.estado,
          },
          notificaciones: notifResult,
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/chat — LLM Chat
      if (path === '/api/chat' && request.method === 'POST') {
        const { messages, patente } = await request.json() as { messages: ChatMessage[]; patente?: string };

        if (!messages || messages.length === 0) {
          return new Response(JSON.stringify({ error: 'No se proporcionaron mensajes' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Get servicios for system prompt
        const serviciosResult = await env.DB.prepare('SELECT nombre, descripcion, duracion_minutos, precio_min FROM servicios WHERE activo = 1 ORDER BY orden').all();
        const serviciosText = (serviciosResult.results as any[]).map((s, i) =>
          `${i + 1}. ${s.nombre}${s.precio_min ? ' (desde ' + s.precio_min + ')' : ''} — ${s.descripcion || 'Servicio profesional'}`
        ).join('\n');

        // Build system prompt
        let systemPrompt = getSystemPrompt(env.BUSINESS_NAME, serviciosText);

        // If patente was provided, lookup vehicle and add context
        if (patente) {
          const vehiculo = await consultarVehiculo(env, patente);
          if (vehiculo.success && vehiculo.vehiculo) {
            const v = vehiculo.vehiculo;
            systemPrompt += `\n\nCONTEXTO DEL VEHÍCULO ACTUAL:\n- Patente: ${v.patente_placa}\n- Vehículo: ${v.marca} ${v.modelo} ${v.anio}\n- Kilometraje: ${v.kilometraje || 'N/A'}\n- Combustible: ${v.combustible || 'N/A'}\n- Dueño: ${v.cliente?.nombre || 'N/A'}\n- Total órdenes: ${v.total_ordenes || 0}`;

            if (v.ordenes && v.ordenes.length > 0) {
              const lastOrder = v.ordenes[0];
              systemPrompt += `\n\nÚLTIMO SERVICIO:\n- OT: ${lastOrder.numero_orden || 'N/A'}\n- Fecha: ${lastOrder.fecha || 'N/A'}\n- Servicio: ${lastOrder.servicios || 'N/A'}\n- Técnico: ${lastOrder.tecnico || 'N/A'}\n- Monto: $${(lastOrder.monto_total || 0).toLocaleString()}`;
            }
          }
        }

        // Ensure system prompt is first
        const chatMessages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
        ];

        // Add user/assistant messages (skip any existing system prompts)
        for (const msg of messages) {
          if (msg.role !== 'system') {
            chatMessages.push(msg);
          }
        }

        // Call Workers AI
        const aiResponse = await env.AI.run(MODEL_ID, {
          messages: chatMessages,
          max_tokens: 1024,
          stream: true,
        });

        // Return SSE stream
        return new Response(aiResponse as ReadableStream, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // GET /api/citas/stats — Simple stats (for admin)
      if (path === '/api/citas/stats' && request.method === 'GET') {
        const hoy = new Date().toISOString().split('T')[0];
        const [totalCitas, citasHoy, citasPendientes] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as total FROM Citas').first(),
          env.DB.prepare('SELECT COUNT(*) as total FROM Citas WHERE fecha_cita = ?').bind(hoy).first(),
          env.DB.prepare("SELECT COUNT(*) as total FROM Citas WHERE estado = 'pendiente'").first(),
        ]);

        return new Response(JSON.stringify({
          total: (totalCitas as any).total,
          hoy: (citasHoy as any).total,
          pendientes: (citasPendientes as any).total,
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/notificar-test — Test WhatsApp notification
      if (path === '/api/notificar-test' && request.method === 'POST') {
        const body = await request.json() as { telefono?: string };
        const to = body.telefono || env.BUSINESS_PHONE;
        const sent = await sendWhatsApp(env, to, '🔧 *Test Global Pro Citas*\n\nEste es un mensaje de prueba del sistema de agendamiento.\n✅ Funcionando correctamente.');
        return new Response(JSON.stringify({ success: sent, to }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ─── Static Assets (Chat UI) ────────────────────────────
      // If no API route matched, serve static assets
      return env.ASSETS.fetch(request);

    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
