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
1. Tu ÚNICA función es agendar citas. NUNCA hables de registrar vehículos, consultar vehículos, ni nada fuera de citas
2. NUNCA menciones bases de datos, registros, ni sistemas internos al cliente
3. Si preguntan por precios, muestra los servicios con sus precios de REFERENCIA. ACLARA SIEMPRE que los precios son referenciales y pueden variar, especialmente en: Servicio a Domicilio (varía según distancia) y servicios que involucren repuestos (varía según marca/modelo del vehículo). Para cotización exacta: +56939026185
4. Si preguntan algo fuera de citas: "Mi función es ayudarte a agendar una cita. ¿En qué servicio estás interesado?"
5. Mantén SIEMPRE el contexto de la cita. NO repitas datos que ya tienes
6. Sé conciso: máximo 3-4 líneas por respuesta

REGLAS CRÍTICAS DE FECHA Y HORA:
- Cuando el cliente diga "mañana", "el martes", "este viernes", etc., SIEMPRE convierte a fecha numérica YYYY-MM-DD usando la fecha de referencia de arriba
- El campo fecha en el JSON DEBE SER SIEMPRE formato YYYY-MM-DD (ejemplo: 2026-06-23). NUNCA pongas "martes", "mañana", "viernes", etc.
- El campo hora DEBE SER SIEMPRE formato HH:MM en 24 horas (ejemplo: 14:30). NUNCA pongas "3pm", "4:00 pm", etc. Convierte: 3pm=15:00, 10am=10:00, 12pm=12:00
- Si el cliente dice una hora como "a las 3" o "a las 4", asume PM (tarde) y convierte: 3→15:00, 4→16:00, 10→10:00 (AM si es mañana)
- Si la fecha que pide el cliente es domingo, avisa que están cerrados y sugiere lunes
- Si la hora pedida está fuera de horario (antes de 08:00 o después de 18:00 entre semana, o antes de 09:00 o después de 14:00 sábado), sugiere el horario más cercano

SERVICIOS DISPONIBLES (precios REFERENCIALES — pueden variar según vehículo y ubicación):
${servicios}

NOTA IMPORTANTE SOBRE PRECIOS:
- Los precios mostrados son REFERENCIALES. El costo final puede variar según el modelo del vehículo, repuestos necesarios y ubicación.
- Servicios a DOMICILIO: el precio varía según la distancia al taller.
- Servicios con REPUESTOS: el precio varía según la marca y modelo del vehículo.
- Para una cotización exacta, el cliente debe llamar al +56939026185 o contactar por WhatsApp.

FLUJO DE AGENDAMIENTO (simple, sin complicaciones):
Paso 1: Pregunta qué servicio necesita
Paso 2: Pregunta fecha y hora preferida (el cliente puede decir "mañana", "el martes", etc.)
Paso 3: Pregunta la patente del vehículo (solo para identificar, no es obligatorio validarla)
Paso 4: Pregunta nombre y teléfono de contacto
Paso 5: Confirma todos los datos con la fecha en NUMÉROS (DD/MM/YYYY) y genera el JSON

Si el cliente menciona la patente al inicio, anótala y continúa preguntando el servicio. NO busques validar la patente ni consultes sistemas externos.

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
      // ─── GET /api/servicios — Servicios unificados para el chat ─
      if (path === '/api/servicios' && request.method === 'GET') {
        const servicios = await env.DB.prepare('SELECT * FROM servicios_unificados WHERE activo = 1 ORDER BY orden ASC, id ASC').all();
        return new Response(JSON.stringify({ servicios: servicios.results }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ═══════════════════════════════════════════════════════
      // ADMIN API — CRUD de Servicios Unificados
      // ═══════════════════════════════════════════════════════

      // GET /api/admin/servicios — Listar todos (incluye inactivos)
      if (path === '/api/admin/servicios' && request.method === 'GET') {
        const servicios = await env.DB.prepare('SELECT * FROM servicios_unificados ORDER BY orden ASC, id ASC').all();
        return new Response(JSON.stringify({ success: true, servicios: servicios.results, total: servicios.results.length }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/admin/servicios — Crear servicio
      if (path === '/api/admin/servicios' && request.method === 'POST') {
        const body = await request.json() as { nombre: string; descripcion?: string; categoria?: string; precio?: number; duracion_minutos?: number; activo?: number; orden?: number };
        if (!body.nombre || !body.nombre.trim()) {
          return new Response(JSON.stringify({ error: 'Nombre del servicio requerido' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const maxOrd = await env.DB.prepare('SELECT MAX(orden) as m FROM servicios_unificados').first() as any;
        const nextOrd = (maxOrd?.m || 0) + 1;
        const result = await env.DB.prepare(
          'INSERT INTO servicios_unificados (nombre, descripcion, categoria, precio, duracion_minutos, activo, origen, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          body.nombre.trim(),
          body.descripcion || '',
          body.categoria || 'General',
          body.precio || 0,
          body.duracion_minutos || 60,
          body.activo !== undefined ? body.activo : 1,
          'manual',
          body.orden || nextOrd
        ).run();
        return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id, mensaje: 'Servicio creado' }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // PUT /api/admin/servicios/:id — Editar servicio
      const adminMatch = path.match(/^\/api\/admin\/servicios\/(\d+)$/);
      if (adminMatch && request.method === 'PUT') {
        const id = parseInt(adminMatch[1]);
        const body = await request.json() as { nombre?: string; descripcion?: string; categoria?: string; precio?: number; duracion_minutos?: number; activo?: number; orden?: number };
        const existing = await env.DB.prepare('SELECT id FROM servicios_unificados WHERE id = ?').bind(id).first();
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Servicio no encontrado' }), {
            status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        await env.DB.prepare(
          'UPDATE servicios_unificados SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), categoria = COALESCE(?, categoria), precio = COALESCE(?, precio), duracion_minutos = COALESCE(?, duracion_minutos), activo = COALESCE(?, activo), orden = COALESCE(?, orden), updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(
          body.nombre?.trim() || null,
          body.descripcion || null,
          body.categoria || null,
          body.precio !== undefined ? body.precio : null,
          body.duracion_minutos !== undefined ? body.duracion_minutos : null,
          body.activo !== undefined ? body.activo : null,
          body.orden !== undefined ? body.orden : null,
          id
        ).run();
        return new Response(JSON.stringify({ success: true, mensaje: 'Servicio actualizado' }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // DELETE /api/admin/servicios/:id — Eliminar servicio
      if (adminMatch && request.method === 'DELETE') {
        const id = parseInt(adminMatch[1]);
        await env.DB.prepare('DELETE FROM servicios_unificados WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true, mensaje: 'Servicio eliminado' }), {
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

        // Get service duration from unified table
        const servicio = await env.DB.prepare('SELECT duracion_minutos FROM servicios_unificados WHERE nombre = ? AND activo = 1').bind(body.servicio).first() as any;
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
        const { messages } = await request.json() as { messages: ChatMessage[] };

        if (!messages || messages.length === 0) {
          return new Response(JSON.stringify({ error: 'No se proporcionaron mensajes' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Get servicios from own DB
        const serviciosResult = await env.DB.prepare('SELECT nombre, descripcion, duracion_minutos, precio, categoria FROM servicios_unificados WHERE activo = 1 ORDER BY orden ASC, id ASC').all();
        const serviciosText = (serviciosResult.results as any[]).map((s, i) => {
          const precioStr = s.precio > 0 ? `$${(s.precio as number).toLocaleString('es-CL')} (ref.)` : 'Consultar precio';
          return `${i + 1}. ${s.nombre} — ${s.descripcion || 'Servicio profesional'} — ${precioStr} (${s.categoria || 'General'}, ~${s.duracion_minutos} min)`;
        }).join('\n');

        const systemPrompt = getSystemPrompt(env.BUSINESS_NAME, serviciosText);

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
