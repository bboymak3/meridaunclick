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
  // Calcular fecha de hoy y próximos días en Chile (America/Santiago) con soporte automático de horario de verano
  const now = new Date();
  const chileTimeStr = now.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  const chileTime = new Date(chileTimeStr);
  const hoyStr = `${chileTime.getFullYear()}-${String(chileTime.getMonth() + 1).padStart(2, '0')}-${String(chileTime.getDate()).padStart(2, '0')}`;
  const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const diaHoy = diasSemana[chileTime.getDay()];
  const maniana = new Date(chileTime); maniana.setDate(maniana.getDate() + 1);
  const manianaStr = `${maniana.getFullYear()}-${String(maniana.getMonth() + 1).padStart(2, '0')}-${String(maniana.getDate()).padStart(2, '0')}`;
  const pasadoManiana = new Date(chileTime); pasadoManiana.setDate(pasadoManiana.getDate() + 2);
  const pasadoManianaStr = `${pasadoManiana.getFullYear()}-${String(pasadoManiana.getMonth() + 1).padStart(2, '0')}-${String(pasadoManiana.getDate()).padStart(2, '0')}`;
  // Hora actual en Chile
  const horaChile = `${String(chileTime.getHours()).padStart(2, '0')}:${String(chileTime.getMinutes()).padStart(2, '0')}`;

  return `Eres un asistente de AGENDAMIENTO de CITAS de "${businessName}". Tu ÚNICA función es ayudar a los clientes a agendar citas. NADA más.

FECHA Y HORA ACTUAL EN CHILE (America/Santiago):
- Hoy es ${diaHoy} ${hoyStr}
- La hora actual en Chile es ${horaChile}
- Mañana es ${diasSemana[maniana.getDay()]} ${manianaStr}
- Pasado mañana es ${diasSemana[pasadoManiana.getDay()]} ${pasadoManianaStr}
- Los días de atención son lunes a sábado (domingo cerrado)
- Horario: lunes a viernes 08:00-18:00, sábado 09:00-14:00
- USA SIEMPRE la fecha de Chile como referencia. Si la hora actual en Chile es pasada las 18:00 (entre semana) o 14:00 (sábado), cualquier cita para "hoy" debe rechazarse

REGLAS ESTRICTAS:
1. NUNCA hables de registrar vehículos, crear cuentas, ni nada que no sea agendar o consultar citas
2. Si la patente NO está en la base de datos, NO lo menciones. Continúa con la cita normalmente
3. Si preguntan por precios: "Llámanos al +56939026185 o WhatsApp para información de precios."
4. Si preguntan algo fuera de citas: "Mi función es ayudarte a agendar o consultar citas. ¿Qué necesitas?"
5. Mantén SIEMPRE el contexto de la cita. NO repitas datos que ya tienes
6. NUNCA digas "¿Necesitas registrarlo?" ni menciones registros de vehículos
7. Sé conciso: máximo 3-4 líneas por respuesta
8. Si el cliente pregunta por una CITA EXISTENTE ("tengo cita", "cuándo es mi cita", "quiero ver mi cita"), busca en la sección "CITAS EXISTENTES" del contexto y responde con la info. Si no hay citas, dile que no tiene citas pendientes

REGLAS CRÍTICAS DE FECHA Y HORA:
- Cuando el cliente diga "mañana", "el martes", "este viernes", etc., SIEMPRE convierte a fecha numérica YYYY-MM-DD usando la fecha de referencia de arriba
- El campo fecha en el JSON DEBE SER SIEMPRE formato YYYY-MM-DD (ejemplo: 2026-06-23). NUNCA pongas "martes", "mañana", "viernes", etc.
- El campo hora DEBE SER SIEMPRE formato HH:MM en 24 horas (ejemplo: 14:30). NUNCA pongas "3pm", "4:00 pm", etc. Convierte: 3pm=15:00, 10am=10:00, 12pm=12:00
- Si el cliente dice una hora como "a las 3" o "a las 4", asume PM (tarde) y convierte: 3→15:00, 4→16:00, 10→10:00 (AM si es mañana)
- Si la fecha que pide el cliente es domingo, avisa que están cerrados y sugiere lunes
- Si la hora pedida está fuera de horario (antes de 08:00 o después de 18:00 entre semana, o antes de 09:00 o después de 14:00 sábado), sugiere el horario más cercano

SERVICIOS DISPONIBLES:
${servicios}

FLUJO DE AGENDAMIENTO:
Paso 1: Pregunta la patente del vehículo
Paso 2: Si tienes info del vehículo, menciónala brevemente. Si NO, continúa sin comentar
Paso 3: Si el cliente pregunta por citas existentes, responde con la info de la sección CITAS EXISTENTES
Paso 4: Si quiere agendar, pregunta qué servicio necesita
Paso 5: Pregunta fecha y hora preferida (el cliente puede decir "mañana", "el martes", etc.)
Paso 6: Pregunta nombre y teléfono de contacto
Paso 7: Confirma todos los datos con la fecha en NUMÉROS (DD/MM/YYYY) y genera el JSON

CUANDO tengas TODOS los datos, responde con este formato ESPECIAL al final:
[CITA_JSON]
{"patente":"XXX","nombre":"XXX","telefono":"XXX","servicio":"XXX","fecha":"YYYY-MM-DD","hora":"HH:MM","observaciones":""}
[/CITA_JSON]

EJEMPLO CORRECTO del JSON:
[CITA_JSON]
{"patente":"ABC123","nombre":"Juan Pérez","telefono":"+56912345678","servicio":"Cambio de Aceite","fecha":"2026-06-23","hora":"10:30","observaciones":""}
[/CITA_JSON]

EJEMPLO INCORRECTO (NUNCA hagas esto):
{"fecha":"martes","hora":"3pm"} ← ESTO ESTA MAL
{"fecha":"mañana","hora":"4:00 pm"} ← ESTO ESTA MAL

Si falta algún dato, NO generes el JSON. Pregunta amablemente por lo que falta.

RESPUESTAS:
- Habla SIEMPRE sobre citas, fechas, servicios, horarios
- Usa emojis: 🚗 🔧 📅 ⏰ ✅
- Al confirmar la cita, muestra la fecha en formato legible: "martes 23 de junio, 2026 a las 10:30 hrs"`;
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

// ─── Consultar Citas Existentes (por patente o teléfono) ─────
async function consultarCitas(env: Env, filtro: { patente?: string; telefono?: string }): Promise<any[]> {
  try {
    let query = "SELECT id, patente, nombre_cliente, telefono, servicio, fecha_cita, hora_cita, estado, observaciones, canal FROM Citas WHERE estado NOT IN ('cancelada', 'no_asistio') AND fecha_cita >= ?";
    const now = new Date();
    const chileStr = now.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    const chile = new Date(chileStr);
    const hoyChile = `${chile.getFullYear()}-${String(chile.getMonth() + 1).padStart(2, '0')}-${String(chile.getDate()).padStart(2, '0')}`;
    const params: any[] = [hoyChile];

    if (filtro.patente) {
      query += ' AND UPPER(patente) = ?';
      params.push(filtro.patente.toUpperCase().trim());
    } else if (filtro.telefono) {
      query += ' AND telefono = ?';
      params.push(filtro.telefono.trim());
    }

    query += ' ORDER BY fecha_cita ASC, hora_cita ASC LIMIT 10';

    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).all();
    return (result.results as any[]) || [];
  } catch (error: any) {
    console.error('Error consultando citas:', error);
    return [];
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
      notas_diagnostico: `Cita agendada via Chat IA | Servicio: ${cita.servicio} | Fecha: ${cita.fecha_cita} ${cita.hora_cita} | ${cita.observaciones || ''}`.trim(),
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

      // ─── GET /api/consultar-citas ──────────────────────────
      if (path === '/api/consultar-citas' && request.method === 'GET') {
        const patente = url.searchParams.get('patente');
        const telefono = url.searchParams.get('telefono');
        if (!patente && !telefono) {
          return new Response(JSON.stringify({ error: 'Se requiere patente o teléfono' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const citas = await consultarCitas(env, { patente: patente || undefined, telefono: telefono || undefined });
        return new Response(JSON.stringify({ success: true, citas }), {
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
        const serviciosResult = await env.DB.prepare('SELECT nombre, descripcion, duracion_minutos FROM servicios WHERE activo = 1 ORDER BY orden').all();
        const serviciosText = (serviciosResult.results as any[]).map((s, i) =>
          `${i + 1}. ${s.nombre} — ${s.descripcion || 'Servicio profesional'}`
        ).join('\n');

        let systemPrompt = getSystemPrompt(env.BUSINESS_NAME, serviciosText);

        // If patente provided, lookup DIRECTLY in tallerv2_db + consult existing citas
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
            // Vehículo no encontrado — NO mencionar registro, simplemente continuar con la cita
            systemPrompt += `\n\nLa patente "${patente.toUpperCase()}" no tiene historial en nuestro sistema. Continúa normalmente con el agendamiento sin mencionar esto al cliente. NO preguntes sobre registrar el vehículo.`;
          }

          // Consultar citas existentes para esta patente
          const citasExistentes = await consultarCitas(env, { patente });
          if (citasExistentes.length > 0) {
            systemPrompt += `\n\nCITAS EXISTENTES (patente ${patente.toUpperCase()}):\nEl cliente tiene ${citasExistentes.length} cita(s) pendiente(s). Información para el cliente si pregunta:`;
            for (const c of citasExistentes) {
              // Convertir fecha YYYY-MM-DD a formato legible DD/MM/YYYY
              const parts = c.fecha_cita.split('-');
              const fechaLegible = `${parts[2]}/${parts[1]}/${parts[0]}`;
              systemPrompt += `\n- 📅 Cita: ${fechaLegible} a las ${c.hora_cita} hrs | Servicio: ${c.servicio} | Estado: ${c.estado} | Cliente: ${c.nombre_cliente} | Tel: ${c.telefono}`;
            }
            systemPrompt += `\nSi el cliente pregunta por su cita, muéstrale esta información. Si quiere agendar otra, verifica que no choque con estas fechas.`;
          } else {
            systemPrompt += `\n\nCITAS EXISTENTES: No hay citas pendientes o futuras para esta patente.`;
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
        const nowStat = new Date();
        const chileStatStr = nowStat.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
        const chileStat = new Date(chileStatStr);
        const hoy = `${chileStat.getFullYear()}-${String(chileStat.getMonth() + 1).padStart(2, '0')}-${String(chileStat.getDate()).padStart(2, '0')}`;
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

      // ─── GET /api/citas/rango — Para calendario Globalprov2 ────
      if (path === '/api/citas/rango' && request.method === 'GET') {
        const inicio = url.searchParams.get('inicio');
        const fin = url.searchParams.get('fin');
        if (!inicio || !fin) {
          return new Response(JSON.stringify({ error: 'Parámetros inicio y fin requeridos (YYYY-MM-DD)' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const citas = await env.DB.prepare(
          "SELECT id, patente, nombre_cliente, telefono, servicio, fecha_cita, hora_cita, estado, observaciones, canal, duracion_minutos, created_at FROM Citas WHERE fecha_cita >= ? AND fecha_cita <= ? AND estado NOT IN ('cancelada', 'no_asistio') ORDER BY fecha_cita, hora_cita"
        ).bind(inicio, fin).all();

        return new Response(JSON.stringify({ success: true, citas: citas.results }), {
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
