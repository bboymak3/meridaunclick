-- ============================================================
-- Nuevas tablas para Un Click - Expansion de funcionalidades
-- ============================================================

-- 1. RESEÑAS Y CALIFICACIONES
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(business_id, user_id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);

-- 2. CUPONES Y OFERTAS
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT,
  discount TEXT,
  discount_type TEXT DEFAULT 'percentage' CHECK(discount_type IN ('percentage', 'fixed', 'free_shipping', 'bogo')),
  terms TEXT,
  start_date TEXT,
  end_date TEXT,
  max_uses INTEGER DEFAULT 0,
  current_uses INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_coupons_business ON coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);

-- 3. EVENTOS Y ACTIVIDADES
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  end_date TEXT,
  event_time TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  lat REAL,
  lng REAL,
  category TEXT DEFAULT 'general' CHECK(category IN ('general', 'musica', 'deporte', 'cultura', 'gastronomia', 'tecnologia', 'negocios', 'otro')),
  image_url TEXT,
  is_free INTEGER DEFAULT 1,
  ticket_url TEXT,
  is_active INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_state ON events(state);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- 4. RESERVAS Y CITAS
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  booking_date TEXT NOT NULL,
  booking_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  service_name TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_bookings_business ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

-- 5. MARKETPLACE / PRODUCTOS
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL,
  currency TEXT DEFAULT 'USD',
  category TEXT DEFAULT 'general' CHECK(category IN ('general', 'vehiculos', 'inmuebles', 'electronica', 'servicios', 'ropa', 'hogar', 'otro')),
  condition TEXT DEFAULT 'new' CHECK(condition IN ('new', 'used', 'refurbished')),
  images TEXT,
  city TEXT,
  state TEXT,
  whatsapp TEXT,
  is_active INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'sold')),
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 6. PUNTOS DE FIDELIZACION
CREATE TABLE IF NOT EXISTS points_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_id INTEGER,
  points INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('visit', 'review', 'checkin', 'booking', 'referral', 'admin_bonus', 'redeem')),
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_points_user ON points_log(user_id);

-- 7. SERVICIOS DE EMERGENCIA
CREATE TABLE IF NOT EXISTS emergency_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('hospital', 'farmacia', 'bombero', 'policia', 'ambulancia', 'defensa_civil', 'otro')),
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  lat REAL,
  lng REAL,
  is_24h INTEGER DEFAULT 0,
  website TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emergency_category ON emergency_services(category);
CREATE INDEX IF NOT EXISTS idx_emergency_state ON emergency_services(state);

-- 8. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('new_business', 'review', 'booking', 'coupon', 'event', 'points', 'system', 'job', 'chat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 9. CONFIGURACIONES DEL SITIO (admin settings)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Settings iniciales
INSERT OR IGNORE INTO site_settings (key, value) VALUES
('ai_chatbot_enabled', '0'),
('ai_chatbot_welcome', 'Hola, soy el asistente virtual de Un Click. Puedo ayudarte a buscar negocios, eventos y ofertas. Escribe lo que buscas.'),
('reviews_enabled', '1'),
('coupons_enabled', '1'),
('events_enabled', '1'),
('bookings_enabled', '1'),
('marketplace_enabled', '1'),
('points_enabled', '1'),
('emergency_enabled', '1'),
('points_per_visit', '10'),
('points_per_review', '25'),
('points_per_booking', '50'),
('points_per_checkin', '5');

-- Datos iniciales: Servicios de emergencia Venezuela
INSERT OR IGNORE INTO emergency_services (name, category, phone, address, city, state, is_24h, notes) VALUES
('Servicio de Emergencia 171', 'ambulancia', '171', 'Venezuela', 'Caracas', 'Distrito Capital', 1, 'Numero unico de emergencias'),
('Policia Nacional Bolivariana', 'policia', '911', 'Venezuela', 'Caracas', 'Distrito Capital', 1, 'Emergencias policiales'),
('Bomberos de Venezuela', 'bombero', '171', 'Venezuela', 'Caracas', 'Distrito Capital', 1, 'Emergencias de incendio y rescate'),
('Defensa Civil', 'defensa_civil', '171', 'Venezuela', 'Caracas', 'Distrito Capital', 1, 'Proteccion civil y desastres naturales'),
('Hospital Universitario de Los Andes', 'hospital', '+58-274-2511535', 'Av. Independencia, Nucleo Universitario', 'Merida', 'Mérida', 1, 'Hospital de referencia en los Andes'),
('Hospital Central de Maracaibo', 'hospital', '+58-261-7926381', 'Av. 66, Frente a la Plaza de Toros', 'Maracaibo', 'Zulia', 1, 'Hospital tipo I'),
('Hospital General del Sur', 'hospital', '+58-260-7662101', 'Av. Jose Felix Ribas', 'San Cristobal', 'Tachira', 1, 'Hospital regional'),
('Hospital Rafael Guerra', 'hospital', '+58-263-6321011', 'Calle Arzobispo Mendez', 'Barinas', 'Barinas', 1, 'Hospital tipo III'),
('Farmacia Cruz Azul - Merida', 'farmacia', '+58-274-2522200', 'Av. 16 de Septiembre', 'Merida', 'Mérida', 1, 'Guardia las 24 horas'),
('Farmacia Cruz Azul - Maracaibo', 'farmacia', '+58-261-7459444', 'Av. 5 de Julio', 'Maracaibo', 'Zulia', 1, 'Guardia las 24 horas');
