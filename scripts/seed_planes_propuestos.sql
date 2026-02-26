-- =============================================================================
-- Script: Planes propuestos para JAC App
-- Ejecutar en pgAdmin (Query Tool) sobre la base de datos del proyecto.
-- Usa precios altos de cada rango y promedio en precios por demanda.
-- =============================================================================
-- Precios por demanda (promedio): usuario (500+2000)/2=1250, MB (50+200)/2=125, carta (1000+3000)/2=2000
-- =============================================================================

-- Opcional: eliminar planes existentes antes de insertar (descomentar si aplica)
-- DELETE FROM "Plan" WHERE nombre IN ('Gratuito', 'Básico', 'Estándar', 'Premium', 'Empresarial');

INSERT INTO "Plan" (
  "id",
  "nombre",
  "descripcion",
  "precioMensual",
  "precioAnual",
  "limiteUsuarios",
  "limiteStorageMb",
  "limiteCartasMes",
  "permiteUsuariosIlimitados",
  "permiteStorageIlimitado",
  "permiteCartasIlimitadas",
  "esPersonalizable",
  "diasPrueba",
  "activo",
  "precioPorUsuarioAdicional",
  "precioPorMbAdicional",
  "precioPorCartaAdicional"
) VALUES
  -- 1. Gratuito / Prueba: 0 COP, límites bajos, 30 días prueba
  (
    gen_random_uuid(),
    'Gratuito',
    'Plan de prueba para juntas pequeñas. 30 días de prueba.',
    0,
    0,
    50,
    200,
    20,
    false,
    false,
    false,
    false,
    30,
    true,
    NULL,
    NULL,
    NULL
  ),
  -- 2. Básico: 50.000 COP/mes, 100 usuarios, 500 MB, 60 cartas/mes
  (
    gen_random_uuid(),
    'Básico',
    'Para juntas con actividad estable. Barrio pequeño.',
    50000,
    500000,
    100,
    500,
    60,
    false,
    false,
    false,
    false,
    14,
    true,
    NULL,
    NULL,
    NULL
  ),
  -- 3. Estándar: 120.000 COP/mes, 300 usuarios, 2 GB, 150 cartas/mes, personalizable
  (
    gen_random_uuid(),
    'Estándar',
    'Para juntas urbanas medianas. Permite overrides y cobro por demanda.',
    120000,
    1200000,
    300,
    2048,
    150,
    false,
    false,
    false,
    true,
    14,
    true,
    1250,
    125,
    2000
  ),
  -- 4. Premium: 250.000 COP/mes, 500 usuarios, 10 GB, 300 cartas/mes, personalizable
  (
    gen_random_uuid(),
    'Premium',
    'Para juntas grandes. Límites amplios y personalización.',
    250000,
    2500000,
    500,
    10240,
    300,
    false,
    false,
    false,
    true,
    7,
    true,
    1250,
    125,
    2000
  ),
  -- 5. Empresarial: 350.000 COP/mes, ilimitado, personalizable
  (
    gen_random_uuid(),
    'Empresarial',
    'Plan a medida para federaciones o juntas con necesidades especiales.',
    350000,
    3500000,
    NULL,
    NULL,
    NULL,
    true,
    true,
    true,
    true,
    0,
    true,
    1250,
    125,
    2000
  )
ON CONFLICT ("nombre") DO UPDATE SET
  "descripcion" = EXCLUDED."descripcion",
  "precioMensual" = EXCLUDED."precioMensual",
  "precioAnual" = EXCLUDED."precioAnual",
  "limiteUsuarios" = EXCLUDED."limiteUsuarios",
  "limiteStorageMb" = EXCLUDED."limiteStorageMb",
  "limiteCartasMes" = EXCLUDED."limiteCartasMes",
  "permiteUsuariosIlimitados" = EXCLUDED."permiteUsuariosIlimitados",
  "permiteStorageIlimitado" = EXCLUDED."permiteStorageIlimitado",
  "permiteCartasIlimitadas" = EXCLUDED."permiteCartasIlimitadas",
  "esPersonalizable" = EXCLUDED."esPersonalizable",
  "diasPrueba" = EXCLUDED."diasPrueba",
  "activo" = EXCLUDED."activo",
  "precioPorUsuarioAdicional" = EXCLUDED."precioPorUsuarioAdicional",
  "precioPorMbAdicional" = EXCLUDED."precioPorMbAdicional",
  "precioPorCartaAdicional" = EXCLUDED."precioPorCartaAdicional";
