-- Migración: Agregar columnas faltantes a la tabla businesses
-- Error: D1_ERROR: table businesses has no column named web_url: SQLITE_ERROR
--
-- Aplicar con:
--   wrangler d1 execute generico_db --remote --command="ALTER TABLE businesses ADD COLUMN web_url TEXT"
--   wrangler d1 execute generico_db --remote --command="ALTER TABLE businesses ADD COLUMN web_page_mode TEXT DEFAULT 'auto'"
--   wrangler d1 execute generico_db --remote --command="ALTER TABLE businesses ADD COLUMN google_maps_url TEXT"
--
-- O vía dashboard de Cloudflare: D1 -> generico_db -> Query -> pegar cada ALTER -> Execute

-- 1. web_url (URL del sitio web del negocio)
ALTER TABLE businesses ADD COLUMN web_url TEXT;

-- 2. web_page_mode (modo de página web: auto, external, none)
ALTER TABLE businesses ADD COLUMN web_page_mode TEXT DEFAULT 'auto';

-- 3. google_maps_url (URL del perfil de Google Maps)
ALTER TABLE businesses ADD COLUMN google_maps_url TEXT;
