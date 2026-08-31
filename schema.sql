-- Consolidated schema extracted from repository
-- Generated to provide a DB schema file for meridaunclick (use for D1/R2 migration)
-- Edit as needed before applying in a new environment

-- ------------------------------
-- globalpro-citas migration
-- ------------------------------

-- Servicios disponibles
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

-- Horarios por día
CREATE TABLE IF NOT EXISTS horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dia_semana TEXT NOT NULL UNIQUE,
    hora_apertura TEXT NOT NULL DEFAULT '08:00',
    hora_cierre TEXT NOT NULL DEFAULT '18:00',
    intervalo_minutos INTEGER DEFAULT 30,
    activo INTEGER DEFAULT 1
);

-- Fechas bloqueadas
CREATE TABLE IF NOT EXISTS bloqueos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL UNIQUE,
    motivo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Config
CREATE TABLE IF NOT EXISTS config (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON Citas(fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON Citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_patente ON Citas(patente);
CREATE INDEX IF NOT EXISTS idx_citas_telefono ON Citas(telefono);

-- ------------------------------
-- Users migration (example)
-- ------------------------------

PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  whatsapp TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  avatar TEXT,
  bio TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  account_type TEXT DEFAULT 'free',
  user_type TEXT DEFAULT 'business',
  whatsapp_enabled INTEGER DEFAULT 1,
  google_id TEXT,
  auth_provider TEXT DEFAULT 'email',
  plan TEXT,
  plan_starts_at TEXT,
  plan_expires_at TEXT,
  seller_owner_id INTEGER
);

-- After validating copy steps, the migration script renames users_new to users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
PRAGMA foreign_keys=ON;

-- ------------------------------
-- Agent / Academy tables
-- ------------------------------

CREATE TABLE IF NOT EXISTS agent_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT DEFAULT '',
  xp_reward INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS class_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT DEFAULT '',
  option_d TEXT DEFAULT '',
  correct_answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  points INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_class_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  completed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  completed_at TEXT,
  UNIQUE(user_id, class_id)
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id INTEGER PRIMARY KEY,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,
  total_classes_completed INTEGER DEFAULT 0,
  exam_passed INTEGER DEFAULT 0,
  exam_passed_at TEXT,
  exam_attempts INTEGER DEFAULT 0,
  last_exam_at TEXT,
  is_partner INTEGER DEFAULT 0,
  partner_at TEXT,
  graduated INTEGER DEFAULT 0,
  graduated_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT DEFAULT '',
  badge_icon TEXT DEFAULT 'fas fa-medal',
  earned_at TEXT DEFAULT (datetime('now'))
);

-- ------------------------------
-- Sellers / Profiles
-- ------------------------------

CREATE TABLE IF NOT EXISTS sellers_profiles (
  user_id INTEGER PRIMARY KEY,
  store_name TEXT,
  description TEXT,
  avatar TEXT,
  cover_photo TEXT,
  address TEXT,
  city TEXT DEFAULT 'Mérida',
  state TEXT DEFAULT 'Mérida',
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  rating REAL DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ------------------------------
-- Conversations / Messages (chat)
-- ------------------------------

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  last_message TEXT,
  last_message_at TEXT,
  buyer_unread INTEGER DEFAULT 0,
  seller_unread INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(buyer_id, seller_id, business_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ------------------------------
-- Other tables (examples)
-- ------------------------------

-- video_carousel (used by video-carousel API)
CREATE TABLE IF NOT EXISTS video_carousel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  url TEXT,
  thumbnail TEXT,
  order_index INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- product_comments (if present elsewhere in codebase)
CREATE TABLE IF NOT EXISTS product_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- End of schema file
