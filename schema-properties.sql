-- ============================================================
-- Schema para Inmuebles - Un Click
-- Tablas: properties, property_images, property_contacts, property_favorites
-- Base de datos: generico_db
-- ============================================================

-- Tabla de propiedades/inmuebles
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK(property_type IN ('casa', 'apartamento', 'terreno', 'local_comercial', 'oficina', 'hotel', 'finca', 'galpon', 'estacionamiento', 'otro')),
  operation_type TEXT NOT NULL CHECK(operation_type IN ('venta', 'alquiler', 'venta_alquiler')),
  price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  address TEXT,
  city TEXT DEFAULT 'Mérida',
  state TEXT DEFAULT 'Mérida',
  country TEXT DEFAULT 'Venezuela',
  lat REAL,
  lng REAL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  area REAL,
  area_unit TEXT DEFAULT 'm2',
  year_built INTEGER,
  floors INTEGER,
  has_pool INTEGER DEFAULT 0,
  has_garden INTEGER DEFAULT 0,
  has_ac INTEGER DEFAULT 0,
  has_kitchen INTEGER DEFAULT 0,
  has_furniture INTEGER DEFAULT 0,
  has_security INTEGER DEFAULT 0,
  has_elevator INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'sold', 'rented')),
  featured INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de imágenes de propiedades
CREATE TABLE IF NOT EXISTS property_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_cover INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Tabla de contactos/mensajes de propiedades
CREATE TABLE IF NOT EXISTS property_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- Tabla de favoritos de propiedades
CREATE TABLE IF NOT EXISTS property_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, property_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_operation ON properties(operation_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_user ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_latlng ON properties(lat, lng);
CREATE INDEX IF NOT EXISTS idx_properties_state ON properties(state);
CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_contacts_property ON property_contacts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_favorites_user ON property_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_property_favorites_property ON property_favorites(property_id);
