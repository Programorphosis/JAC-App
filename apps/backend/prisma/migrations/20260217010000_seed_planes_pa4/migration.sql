-- Seed planes base (PA-4)
INSERT INTO "Plan" ("id", "nombre", "precioMensual", "precioAnual", "limiteUsuarios", "limiteStorageMb", "limiteCartasMes", "diasPrueba", "activo")
SELECT gen_random_uuid(), 'Básico', 0, 0, 50, 100, 20, 30, true
WHERE NOT EXISTS (SELECT 1 FROM "Plan" WHERE nombre = 'Básico');

INSERT INTO "Plan" ("id", "nombre", "precioMensual", "precioAnual", "limiteUsuarios", "limiteStorageMb", "limiteCartasMes", "diasPrueba", "activo")
SELECT gen_random_uuid(), 'Premium', 50000, 500000, 200, 500, 100, 14, true
WHERE NOT EXISTS (SELECT 1 FROM "Plan" WHERE nombre = 'Premium');

-- Suscripciones para juntas existentes (plan Básico, 1 año)
INSERT INTO "Suscripcion" ("id", "juntaId", "planId", "fechaVencimiento", "estado")
SELECT gen_random_uuid(), j.id, p.id, NOW() + INTERVAL '1 year', 'ACTIVA'
FROM "Junta" j
CROSS JOIN (SELECT id FROM "Plan" WHERE nombre = 'Básico' LIMIT 1) p
WHERE NOT EXISTS (SELECT 1 FROM "Suscripcion" s WHERE s."juntaId" = j.id);
