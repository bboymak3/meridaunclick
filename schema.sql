-- ============================================================
-- Esquema D1 para Un Click - Directorio Nacional de Venezuela
-- Base de datos: generico_db
-- ID: 38dd85ba-03dc-4937-af19-4d1c41a18f27
-- Dominio: aunclick.pages.dev
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  whatsapp TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user', 'agent')),
  avatar TEXT,
  bio TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#1a73e8',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  business_type TEXT DEFAULT 'negocio' CHECK(business_type IN ('negocio', 'profesional', 'servicio', 'restaurante', 'tienda', 'otro')),
  address TEXT,
  city TEXT DEFAULT 'Mérida',
  state TEXT DEFAULT 'Mérida',
  country TEXT DEFAULT 'Venezuela',
  lat REAL,
  lng REAL,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  email_contact TEXT,
  schedule TEXT,
  has_parking INTEGER DEFAULT 0,
  has_wifi INTEGER DEFAULT 0,
  has_card INTEGER DEFAULT 0,
  has_delivery INTEGER DEFAULT 0,
  has_outdoor INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'closed')),
  featured INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_cover INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, business_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_type ON businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_latlng ON businesses(lat, lng);
CREATE INDEX IF NOT EXISTS idx_businesses_state ON businesses(state);
CREATE INDEX IF NOT EXISTS idx_images_business ON images(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_business ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Tabla de estados de Venezuela
CREATE TABLE IF NOT EXISTS states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO states (name, slug) VALUES
('Amazonas', 'amazonas'),
('Anzoátegui', 'anzoategui'),
('Apure', 'apure'),
('Aragua', 'aragua'),
('Barinas', 'barinas'),
('Bolívar', 'bolivar'),
('Carabobo', 'carabobo'),
('Cojedes', 'cojedes'),
('Delta Amacuro', 'delta-amacuro'),
('Distrito Capital', 'distrito-capital'),
('Falcón', 'falcon'),
('Guárico', 'guarico'),
('Lara', 'lara'),
('Mérida', 'merida'),
('Miranda', 'miranda'),
('Monagas', 'monagas'),
('Nueva Esparta', 'nueva-esparta'),
('Portuguesa', 'portuguesa'),
('Sucre', 'sucre'),
('Táchira', 'tachira'),
('Trujillo', 'trujillo'),
('Vargas', 'vargas'),
('Yaracuy', 'yaracuy'),
('Zulia', 'zulia');

INSERT OR IGNORE INTO users (name, email, phone, password_hash, role) VALUES
('Administrador', 'admin@aunclick.pages.dev', '+58-414-000-0000', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

INSERT OR IGNORE INTO categories (name, slug, icon, color, description, sort_order) VALUES
('Farmacias', 'farmacias', 'fas fa-pills', '#e74c3c', 'Farmacias y droguerías', 1),
('Clínicas y Hospitales', 'clinicas-hospitales', 'fas fa-hospital', '#c0392b', 'Centros médicos, clínicas y hospitales', 2),
('Laboratorios', 'laboratorios', 'fas fa-flask', '#e67e22', 'Laboratorios clínicos y de análisis', 3),
('Ópticas', 'opticas', 'fas fa-eye', '#9b59b6', 'Ópticas y centros de visión', 4),
('Veterinarias', 'veterinarias', 'fas fa-paw', '#27ae60', 'Clínicas veterinarias y tiendas de mascotas', 5),
('Gimnasios', 'gimnasios', 'fas fa-dumbbell', '#2980b9', 'Gimnasios y centros de fitness', 6),
('Dentistas', 'dentistas', 'fas fa-tooth', '#1abc9c', 'Clínicas dentales y odontología', 7),
('Naturistas', 'naturistas', 'fas fa-leaf', '#16a085', 'Tiendas naturistas y productos orgánicos', 8),
('Restaurantes', 'restaurantes', 'fas fa-utensils', '#e74c3c', 'Restaurantes y comedores', 10),
('Bares y Discotecas', 'bares-discotecas', 'fas fa-cocktail', '#8e44ad', 'Bares, discotecas y vida nocturna', 11),
('Cafeterías', 'cafeterias', 'fas fa-coffee', '#795548', 'Cafeterías y casas de té', 12),
('Panaderías', 'panaderias', 'fas fa-bread-slice', '#d35400', 'Panaderías y pastelerías', 13),
('Supermercados', 'supermercados', 'fas fa-shopping-cart', '#2ecc71', 'Supermercados y abastos', 14),
('Fruver', 'fruver', 'fas fa-apple-alt', '#27ae60', 'Frutas, verduras y hortalizas', 15),
('Heladerías', 'heladerias', 'fas fa-ice-cream', '#e91e63', 'Heladerías y neveras', 16),
('Pizzerías', 'pizzerias', 'fas fa-pizza-slice', '#f44336', 'Pizzerías y ventas de pizza', 17),
('Ropas', 'ropas', 'fas fa-tshirt', '#e91e63', 'Tiendas de ropa y moda', 20),
('Zapaterías', 'zapaterias', 'fas fa-shoe-prints', '#795548', 'Zapaterías y venta de calzado', 21),
('Joyerías', 'joyerias', 'fas fa-gem', '#9c27b0', 'Joyerías y accesorios', 22),
('Perfumerías', 'perfumerias', 'fas fa-spray-can', '#e91e63', 'Perfumerías y cosméticos', 23),
('Barberías', 'barberias', 'fas fa-cut', '#607d8b', 'Barberías y peluquerías para hombres', 24),
('Salón y Spa', 'salon-spa', 'fas fa-spa', '#9c27b0', 'Salones de belleza y spas', 25),
('Auto Talleres', 'auto-talleres', 'fas fa-wrench', '#ff9800', 'Talleres mecánicos y automotriz', 30),
('Auto Repuestos', 'auto-repuestos', 'fas fa-car', '#795548', 'Repuestos y accesorios para vehículos', 31),
('Auto Lavado', 'auto-lavado', 'fas fa-car-side', '#00bcd4', 'Lavaderos de autos', 32),
('Concesionarios', 'concesionarios', 'fas fa-car-alt', '#3f51b5', 'Agencias y concesionarios de vehículos', 33),
('Motos', 'motos', 'fas fa-motorcycle', '#ff5722', 'Venta y repuestos de motos', 34),
('Transportes', 'transportes', 'fas fa-bus', '#2196f3', 'Servicios de transporte y envíos', 35),
('Ferreterías', 'ferreterias', 'fas fa-tools', '#ff9800', 'Ferreterías y materiales de construcción', 40),
('Mueblerías', 'mueblerias', 'fas fa-couch', '#795548', 'Muebles y decoración del hogar', 41),
('Electrodomésticos', 'electrodomesticos', 'fas fa-tv', '#607d8b', 'Electrodomésticos y equipos', 42),
('Pinturas', 'pinturas', 'fas fa-paint-roller', '#e91e63', 'Tiendas de pinturas y materiales', 43),
('Cerrajerías', 'cerrajerias', 'fas fa-key', '#f44336', 'Servicios de cerrajería', 44),
('Eléctricos', 'electricos', 'fas fa-bolt', '#ffeb3b', 'Servicios eléctricos', 45),
('Inmobiliarias', 'inmobiliarias', 'fas fa-building', '#3f51b5', 'Agencias inmobiliarias', 50),
('Jurídicos', 'juridicos', 'fas fa-gavel', '#607d8b', 'Abogados y servicios legales', 51),
('Publicidad', 'publicidad', 'fas fa-bullhorn', '#e91e63', 'Agencias de publicidad y marketing', 52),
('Fotografía', 'fotografia', 'fas fa-camera', '#9c27b0', 'Fotógrafos y estudio fotográfico', 53),
('Imprenta', 'imprenta', 'fas fa-print', '#795548', 'Imprentas y servicios de impresión', 54),
('Tecnología', 'tecnologia', 'fas fa-laptop', '#2196f3', 'Tiendas de tecnología y computadoras', 55),
('Seguridad', 'seguridad', 'fas fa-shield-alt', '#f44336', 'Servicios de seguridad', 56),
('Celulares', 'celulares', 'fas fa-mobile-alt', '#00bcd4', 'Tiendas de celulares y accesorios', 57),
('Academias', 'academias', 'fas fa-graduation-cap', '#3f51b5', 'Academias y centros de formación', 60),
('Colegios', 'colegios', 'fas fa-school', '#2196f3', 'Colegios y escuelas', 61),
('Librerías', 'librerias', 'fas fa-book', '#4caf50', 'Librerías y papelerías', 62),
('Universidades', 'universidades', 'fas fa-university', '#1a237e', 'Universidades y educación superior', 63),
('Hoteles y Posadas', 'hoteles-posadas', 'fas fa-bed', '#e91e63', 'Hoteles, posadas y hosterías', 70),
('Agencias de Viaje', 'agencias-de-viaje', 'fas fa-plane', '#2196f3', 'Agencias de turismo y viajes', 71),
('Artesanías', 'artesanias', 'fas fa-palette', '#ff9800', 'Artesanías andinas y productos locales', 72),
('Encomiendas', 'encomiendas', 'fas fa-box', '#795548', 'Servicios de encomiendas y paquetería', 73),
('Variedades', 'variedades', 'fas fa-store', '#607d8b', 'Tiendas de variedades y bazares', 80),
('Domicilios', 'domicilios', 'fas fa-motorcycle', '#ff5722', 'Servicios de domicilio y delivery', 81),
('Sublimación', 'sublimacion', 'fas fa-tshirt', '#9c27b0', 'Sublimación y personalización', 82),
('Lavanderías', 'lavanderias', 'fas fa-tint', '#03a9f4', 'Lavanderías y tintorerías', 83),
('Desechables', 'desechables', 'fas fa-trash', '#ffeb3b', 'Productos desechables y empaques', 84),
('Bicicletas', 'bicicletas', 'fas fa-bicycle', '#4caf50', 'Tiendas y taller de bicicletas', 85);
