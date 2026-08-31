-- Migration: Agregar nuevas categorias a meridaunclick (D1: generico_db)
-- Categorias nuevas:
--   1. Camaras de Seguridad (tipo: servicios-varios, slug: camaras-de-seguridad)
--   2. Bufete de Abogados (tipo: servicios-profesionales, slug: bufete-de-abogados)
--
-- Como aplicarlo:
--   wrangler d1 execute generico_db --remote --file=scripts/add-categories.sql
--   wrangler d1 execute generico_db --local  --file=scripts/add-categories.sql
--
-- Nota: usa INSERT OR IGNORE para que sea idempotente (no falla si ya existen).

-- Camaras de Seguridad — tipo: servicios-varios (sort_order 85)
INSERT OR IGNORE INTO categories (name, slug, icon, color, sort_order, is_active, tipo_negocio_id)
SELECT 'Cámaras de Seguridad', 'camaras-de-seguridad', 'fas fa-video', '#1e88e5', 85, 1, id
FROM tipos_negocio WHERE slug = 'servicios-varios';

-- Bufete de Abogados — tipo: servicios-profesionales (sort_order 51)
INSERT OR IGNORE INTO categories (name, slug, icon, color, sort_order, is_active, tipo_negocio_id)
SELECT 'Bufete de Abogados', 'bufete-de-abogados', 'fas fa-gavel', '#5d4037', 51, 1, id
FROM tipos_negocio WHERE slug = 'servicios-profesionales';

-- Verificar resultado
SELECT id, name, slug, icon, color, sort_order, tipo_negocio_id
FROM categories
WHERE slug IN ('camaras-de-seguridad', 'bufete-de-abogados')
ORDER BY sort_order;
