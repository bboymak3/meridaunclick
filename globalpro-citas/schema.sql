-- ============================================
-- GLOBALPRO CITAS - D1 Database Schema
-- ============================================

-- Servicios disponibles para agendar
CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    icono TEXT DEFAULT 'wrench',
    duracion_minutos INTEGER DEFAULT 60,
    precio_min TEXT,
    activo INTEGER DEFAULT 1,
    orden INTEGER DEFAULT 0
);

-- Horarios de atención por día
CREATE TABLE IF NOT EXISTS horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dia_semana TEXT NOT NULL UNIQUE,  -- lunes, martes, miercoles, jueves, viernes, sabado, domingo
    hora_apertura TEXT NOT NULL DEFAULT '08:00',
    hora_cierre TEXT NOT NULL DEFAULT '18:00',
    intervalo_minutos INTEGER DEFAULT 30,
    activo INTEGER DEFAULT 1
);

-- Fechas bloqueadas (feriados, etc.)
CREATE TABLE IF NOT EXISTS bloqueos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL UNIQUE,  -- YYYY-MM-DD
    motivo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Citas agendadas
CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Info del vehículo
    patente TEXT NOT NULL,
    marca TEXT,
    modelo TEXT,
    anio INTEGER,
    cilindrada TEXT,
    -- Info del cliente
    nombre_cliente TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT,
    -- Detalles de la cita
    servicio TEXT NOT NULL,
    fecha_cita TEXT NOT NULL,      -- YYYY-MM-DD
    hora_cita TEXT NOT NULL,       -- HH:MM
    duracion_minutos INTEGER DEFAULT 60,
    observaciones TEXT,
    estado TEXT DEFAULT 'pendiente',  -- pendiente, confirmada, completada, cancelada, no_asistio
    -- Origen
    canal TEXT DEFAULT 'chat',    -- chat, web, whatsapp
    -- Notificaciones
    notificada_negocio INTEGER DEFAULT 0,
    notificada_cliente INTEGER DEFAULT 0,
    recordatorio_enviado INTEGER DEFAULT 0,
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Configuración general
CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Servicios populares
INSERT OR IGNORE INTO servicios (nombre, descripcion, icono, duracion_minutos, precio_min, orden) VALUES
('Cambio de Aceite', 'Cambio de aceite de motor y filtro', 'oil-can', 30, '$15.000', 1),
('Revisión General', 'Inspección completa del vehículo', 'search', 60, '$25.000', 2),
('Scanner Diagnóstico', 'Diagnóstico electrónico con scanner OBD2', 'microchip', 30, '$20.000', 3),
('Frenos', 'Revisión y cambio de pastillas/discos de freno', 'hand-paper', 60, '$35.000', 4),
('Revisión Eléctrica', 'Diagnóstico del sistema eléctrico', 'bolt', 45, '$20.000', 5),
('Aire Acondicionado', 'Recarga y revisión de A/C', 'snowflake', 45, '$25.000', 6),
('Revisión Técnica', 'Preparación para revisión técnica', 'clipboard-check', 60, '$30.000', 7),
('Servicio a Domicilio', 'Mecánico a domicilio', 'truck', 90, '$40.000', 8);

-- Horarios por defecto (lunes a viernes 08:00-18:00, sábado 09:00-14:00)
INSERT OR IGNORE INTO horarios (dia_semana, hora_apertura, hora_cierre, intervalo_minutos, activo) VALUES
('lunes', '08:00', '18:00', 30, 1),
('martes', '08:00', '18:00', 30, 1),
('miercoles', '08:00', '18:00', 30, 1),
('jueves', '08:00', '18:00', 30, 1),
('viernes', '08:00', '18:00', 30, 1),
('sabado', '09:00', '14:00', 30, 1),
('domingo', '00:00', '00:00', 30, 0);

-- Configuración
INSERT OR IGNORE INTO config (clave, valor) VALUES
('max_citas_por_dia', '20'),
('anticipacion_dias', '30'),
('limite_horas_antes', '2');

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_patente ON citas(patente);
CREATE INDEX IF NOT EXISTS idx_citas_telefono ON citas(telefono);
CREATE INDEX IF NOT EXISTS idx_citas_created ON citas(created_at);
