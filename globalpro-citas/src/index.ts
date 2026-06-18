// src/index.ts — GlobalPro Citas Worker v2
// Chat con LLM + Agendamiento automático + Puente a Globalprov2

import { Env, ChatMessage, CitaRequest, SlotDisponible, VehiculoTaller } from './types';

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

// ─── Consultar Vehículo DIRECTO en tallerv2_db (lectura) ────────
async function consultarVehiculoEnTaller(env: Env, patente: string): Promise<{
  success: boolean;
  vehiculo?: VehiculoTaller;
  error?: string;
}> {
  try {
    const pat = patente.toUpperCase().trim();

    // Buscar vehículo en tallerv2_db
    const vehiculo = await env.TALLER_DB.prepare(
      'SELECT v.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.rut as cliente_rut ' +
      'FROM Vehiculos v LEFT JOIN Clientes c ON v.cliente_id = c.id ' +
      'WHERE UPPER(v.patente_placa) = ? LIMIT 1'
    ).bind(pat).first() as any;

    if (!vehiculo) {
      return { success: false, error: 'Vehículo no encontrado en nuestra base de datos' };
    }

    // Buscar última orden de trabajo
    const ultimaOrden = await env.TALLER_DB.prepare(
      'SELECT numero_orden, fecha_ingreso, servicios_seleccionados, estado, monto_total ' +
      'FROM OrdenesTrabajo WHERE patente_placa = ? ORDER BY id DESC LIMIT 1'
    ).bind(pat).first() as any;

    // Contar total de órdenes
    const totalOrd = await env.TALLER_DB.prepare(
      'SELECT COUNT(*) as cnt FROM OrdenesTrabajo WHERE patente_placa = ?'
    ).bind(pat).first() as any;

    const result: VehiculoTaller = {
      id: vehiculo.id,
      patente_placa: vehiculo.patente_placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      cilindrada: vehiculo.cilindrada,
      combustible: vehiculo.combustible,
      kilometraje: vehiculo.kilometraje,
      color: vehiculo.color,
      cliente_id: vehiculo.cliente_id,
      fecha_registro: vehiculo.fecha_registro,
      cliente_nombre: vehiculo.cliente_nombre,
      cliente_telefono: vehiculo.cliente_telefono,
      cliente_rut: vehiculo.cliente_rut,
      total_ordenes: totalOrd?.cnt || 0,
      ultima_orden: ultimaOrden ? {
        numero_orden: ultimaOrden.numero_orden,
        fecha_ingreso: ultimaOrden.fecha_ingreso,
        servicios_seleccionados: ultimaOrden.servicios_seleccionados,
        estado: ultimaOrden.estado,
        monto_total: ultimaOrden.monto_total || 0,
      } : undefined,
    };

    return { success: true, vehiculo: result };
  } catch (error: any) {
    console.error('Error consultando vehículo en tallerv2_db:', error);
    return { success: false, error: 'Error al consultar el vehículo: ' + error.message };
  }
}

// ─── Enviar Orden a Globalprov2 (como orden express) ─────────
async function enviarOrdenAGlobalprov2(env: Env, cita: any, vehiculoData: any): Promise<{
  success: boolean;
  numero_orden?: number;
  error?: string;
}> {
  try {
    const url = `${env.GLOBALPROV2_URL}/api/public/crear-orden-express`;
    console.log('Enviando orden a Globalprov2:', url);

    const body = {
      patente: cita.patente,
      marca: vehiculoData?.marca || cita.marca || '',
      modelo: vehiculoData?.modelo || cita.modelo || '',
      cliente: cita.nombre_cliente,
      telefono: cita.telefono,
      direccion: cita.direccion || '',
      referencia_direccion: cita.referencia_direccion || '',
      notas_diagnostico: `Cita agendada via Chat IA\nServicio: ${cita.servicio}\nFecha: ${cita.fecha_cita} ${cita.hora_cita}\n${cita.observaciones || ''}`.trim(),
      express: true,
      fecha_ingreso: new Date().toISOString().split('T')[0],
      origen: 'chat_ia',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('Globalprov2 response status:', response.status, 'body:', responseText);

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr: any) {
      console.error('Failed to parse Globalprov2 response:', parseErr);
      return { success: false, error: 'Respuesta inválida de Globalprov2: ' + responseText.substring(0, 200) };
    }

    if (data.success && data.numero_orden) {
      console.log('Orden creada en Globalprov2, número:', data.numero_orden);
      return { success: true, numero_orden: data.numero_orden };
    } else {
      console.error('Globalprov2 rechazó la orden:', JSON.stringify(data));
      return { success: false, error: data.error || 'Error al crear orden en Globalprov2' };
    }
  } catch (error: any) {
    console.error('Error enviando orden a Globalprov2:', error.message, error.stack);
    return { success: false, error: 'Error de conexión con Globalprov2: ' + error.message };
  }
}

// ─── Disponibilidad de Citas ────────────────────────────────
async function getDisponibilidad(env: Env, fecha: string): Promise<{ slots: SlotDisponible[]; cerrado: boolean }> {
  const dateObj = new Date(fecha + 'T12:00:00');
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaSemana = dias[dateObj.getDay()];

  const horario = await env.DB.prepare('SELECT * FROM horarios WHERE dia_semana = ?').bind(diaSemana).first() as any;
  if (!horario || !horario.activo) {
    return { slots: [], cerrado: true };
  }

  const bloqueo = await env.DB.prepare('SELECT * FROM bloqueos WHERE fecha = ?').bind(fecha).first();
  if (bloqueo) {
    return { slots: [], cerrado: true };
  }

  const configMax = await env.DB.prepare("SELECT valor FROM config WHERE clave = 'max_citas_por_dia'").first() as any;
  const maxCitas = configMax ? parseInt(configMax.valor) : 20;

  const citasExistentes = await env.DB.prepare("SELECT hora_cita FROM Citas WHERE fecha_cita = ? AND estado NOT IN ('cancelada')").bind(fecha).all();
  const horasOcupadas = new Set((citasExistentes.results as any[]).map(c => c.hora_cita));

  const slots: SlotDisponible[] = [];
  const [aperturaH, aperturaM] = horario.hora_apertura.split(':').map(Number);
  const [cierreH, cierreM] = horario.hora_cierre.split(':').map(Number);
  const intervalo = horario.intervalo_minutos || 30;

  let currentMinutes = aperturaH * 60 + aperturaM;
  const endMinutes = cierreH * 60 + cierreM;

  const now = new Date();
  const fechaMinima = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  while (currentMinutes + 60 <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

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

    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    try {
      // ─── GET /api/servicios ──────────────────────────────
      if (path === '/api/servicios' && request.method === 'GET') {
        const servicios = await env.DB.prepare('SELECT * FROM servicios WHERE activo = 1 ORDER BY orden ASC').all();
        return new Response(JSON.stringify({ servicios: servicios.results }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ─── GET /api/disponibilidad ──────────────────────────
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

      // ─── POST /api/consultar-vehiculo ──────────────────────
      // Ahora consulta DIRECTO tallerv2_db (lectura)
      if (path === '/api/consultar-vehiculo' && request.method === 'POST') {
        const body = await request.json() as { patente: string };
        if (!body.patente) {
          return new Response(JSON.stringify({ error: 'Patente requerida' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const result = await consultarVehiculoEnTaller(env, body.patente);
        return new Response(JSON.stringify(result), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ─── POST /api/agendar ────────────────────────────────
      // Crea cita en DB propia + envía orden a Globalprov2
      if (path === '/api/agendar' && request.method === 'POST') {
        const body = await request.json() as CitaRequest;

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

        // Check for duplicate
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

        // Consultar vehículo en tallerv2_db para enriquecer datos
        const vehiculoResult = await consultarVehiculoEnTaller(env, body.patente);
        const marcaAuto = vehiculoResult.vehiculo?.marca || body.marca || null;
        const modeloAuto = vehiculoResult.vehiculo?.modelo || body.modelo || null;
        const anioAuto = vehiculoResult.vehiculo?.anio || body.anio || null;

        // Insert appointment in own DB
        const result = await env.DB.prepare(`
          INSERT INTO Citas (patente, marca, modelo, anio, nombre_cliente, telefono, email, servicio, fecha_cita, hora_cita, duracion_minutos, observaciones, canal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          body.patente.toUpperCase().trim(),
          marcaAuto,
          modeloAuto,
          anioAuto,
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

        // ─── ENVIAR ORDEN A GLOBALPROV2 ─────────────────────
        const ordenResult = await enviarOrdenAGlobalprov2(env, cita, vehiculoResult.vehiculo);

        // Update cita with orden status
        const numOrden = ordenResult.numero_orden ? String(ordenResult.numero_orden) : null;
        await env.DB.prepare(
          "UPDATE Citas SET orden_enviada = ?, numero_orden_globalprov2 = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(ordenResult.success ? 1 : 0, numOrden, citaId).run();

        return new Response(JSON.stringify({
          success: true,
          mensaje: ordenResult.success
            ? 'Cita agendada y orden creada exitosamente'
            : 'Cita agendada (la orden se enviará en breve)',
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
          orden_globalprov2: ordenResult.success ? {
            numero: ordenResult.numero_orden,
            formato: 'EXP' + String(ordenResult.numero_orden).padStart(6, '0'),
          } : null,
          orden_error: ordenResult.error || null,
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ─── POST /api/chat — LLM Chat con contexto de tallerv2_db
      if (path === '/api/chat' && request.method === 'POST') {
        const { messages, patente } = await request.json() as { messages: ChatMessage[]; patente?: string };

        if (!messages || messages.length === 0) {
          return new Response(JSON.stringify({ error: 'No se proporcionaron mensajes' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Get servicios from own DB
        const serviciosResult = await env.DB.prepare('SELECT nombre, descripcion, duracion_minutos, precio_min FROM servicios WHERE activo = 1 ORDER BY orden').all();
        const serviciosText = (serviciosResult.results as any[]).map((s, i) =>
          `${i + 1}. ${s.nombre}${s.precio_min ? ' (desde ' + s.precio_min + ')' : ''} — ${s.descripcion || 'Servicio profesional'}`
        ).join('\n');

        let systemPrompt = getSystemPrompt(env.BUSINESS_NAME, serviciosText);

        // If patente provided, lookup DIRECTLY in tallerv2_db
        if (patente) {
          const vehiculoData = await consultarVehiculoEnTaller(env, patente);
          if (vehiculoData.success && vehiculoData.vehiculo) {
            const v = vehiculoData.vehiculo;
            systemPrompt += `\n\nCONTEXTO DEL VEHÍCULO ACTUAL:\n- Patente: ${v.patente_placa}\n- Vehículo: ${v.marca} ${v.modelo} ${v.anio || 'N/A'}\n- Kilometraje: ${v.kilometraje || 'N/A'}\n- Combustible: ${v.combustible || 'N/A'}\n- Dueño: ${v.cliente_nombre || 'N/A'}\n- Teléfono dueño: ${v.cliente_telefono || 'N/A'}\n- Total órdenes en taller: ${v.total_ordenes || 0}`;

            if (v.ultima_orden) {
              const lo = v.ultima_orden;
              systemPrompt += `\n\nÚLTIMO SERVICIO EN TALLER:\n- OT N°: ${lo.numero_orden}\n- Fecha: ${lo.fecha_ingreso}\n- Servicios: ${lo.servicios_seleccionados || 'N/A'}\n- Estado: ${lo.estado}\n- Monto: $${(lo.monto_total || 0).toLocaleString()}`;
            }
          } else {
            systemPrompt += `\n\nEl vehículo con patente "${patente.toUpperCase()}" NO está registrado en nuestra base de datos del taller. Pregunta al cliente si desea registrarlo.`;
          }
        }

        const chatMessages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
        ];

        for (const msg of messages) {
          if (msg.role !== 'system') {
            chatMessages.push(msg);
          }
        }

        const aiResponse = await env.AI.run(MODEL_ID, {
          messages: chatMessages,
          max_tokens: 1024,
          stream: true,
        });

        return new Response(aiResponse as ReadableStream, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // ─── GET /api/citas/stats ─────────────────────────────
      if (path === '/api/citas/stats' && request.method === 'GET') {
        const hoy = new Date().toISOString().split('T')[0];
        const [totalCitas, citasHoy, citasPendientes, ordenesEnviadas] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as total FROM Citas').first(),
          env.DB.prepare('SELECT COUNT(*) as total FROM Citas WHERE fecha_cita = ?').bind(hoy).first(),
          env.DB.prepare("SELECT COUNT(*) as total FROM Citas WHERE estado = 'pendiente'").first(),
          env.DB.prepare('SELECT COUNT(*) as total FROM Citas WHERE orden_enviada = 1').first(),
        ]);

        return new Response(JSON.stringify({
          total: (totalCitas as any).total,
          hoy: (citasHoy as any).total,
          pendientes: (citasPendientes as any).total,
          ordenes_enviadas_globalprov2: (ordenesEnviadas as any).total,
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ─── Static Assets (Chat UI) ────────────────────────────
      return env.ASSETS.fetch(request);

    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Error interno', details: error.message }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
