# Preparación demo – JAC App

**Objetivo:** Checklist para tener el sistema listo para la primera presentación del proyecto. Cada ítem incluye estado, ubicación y criterios de aceptación.

**Última actualización:** 2026-02-26

---

## Prioridad alta (impacto en la demo)

### 1. Seed / datos de demo
**Estado:** ✅ Implementado

Junta precargada con datos realistas (15–20 usuarios, pagos, tarifas, 2–3 cartas aprobadas, requisitos).

| Dónde | Evidencia |
|-------|-----------|
| Script | `apps/backend/prisma/seed-dev.ts` |
| Comando | `npm run db:seed` (desde raíz) |
| Credenciales | `docs/CREDENCIALES_DEMO.md` |

---

### 2. Onboarding guiado
**Estado:** ✅ Implementado

Checklist visual tras crear junta: "Configura tarifas" → "Subir escudo" → "Opcional: requisitos" → "Listo".

| Dónde | Evidencia |
|-------|-----------|
| Componente | `dashboard.component` |
| Lógica | `tieneTarifas`, `escudoConfigurado` desde `mi-junta` |

---

### 3. Dashboard de métricas
**Estado:** ✅ Implementado

Cifras clave: usuarios activos, pagos del mes, cartas emitidas.

| Dónde | Evidencia |
|-------|-----------|
| Backend | `GET /api/mi-junta/metricas` |
| Frontend | Tarjetas en `dashboard.component` |
| Roles | ADMIN, SECRETARIA, TESORERA, FISCAL |

---

### 4. Guía rápida de usuario
**Estado:** ✅ Implementado

Sección "Ayuda" con descripción de cada rol.

| Dónde | Evidencia |
|-------|-----------|
| Ruta | `/ayuda` |
| Componente | `ayuda.component` |

---

## Prioridad media (profesionalismo)

### 5. CI/CD básico
**Estado:** ✅ Implementado

| Dónde | Evidencia |
|-------|-----------|
| Workflow | `.github/workflows/ci.yml` |
| Trigger | push/PR a `master` o `main` |
| Jobs | Lint backend, build backend, build frontend |

---

### 6. Documentación de API (Swagger)
**Estado:** ✅ Implementado

| Dónde | Evidencia |
|-------|-----------|
| Backend | `@nestjs/swagger` en `main.ts` |
| URL | `/api/docs` (dev o `SWAGGER_ENABLED=true`) |
| Tags | auth, usuarios, pagos, cartas, mi-junta, tarifas |

---

### 7. Prueba de restauración de backup
**Estado:** ✅ Documentado

| Dónde | Evidencia |
|-------|-----------|
| Documentación | `docs/BACKUP_RESTORE.md` |
| Scripts | `scripts/backup-db.sh`, `scripts/restore-db.sh` |

---

### 8. Mejoras de UX
**Estado:** ✅ Implementado

Empty states y skeletons en listados principales.

| Dónde | Evidencia |
|-------|-----------|
| Estilos compartidos | `src/styles/_list-states.scss` |
| Componentes | usuarios-list, pagos (listado), cartas |

---

## Prioridad baja

### 9. Reporte anual por junta
**Estado:** ✅ Implementado

| Dónde | Evidencia |
|-------|-----------|
| Backend | `GET /api/mi-junta/reporte-anual?anio=2025` |
| Frontend | Botón en Mi junta (sección Ingresos) |

---

### 10. Reactivación post-cancelación
**Estado:** ✅ Implementado

| Dónde | Evidencia |
|-------|-----------|
| Backend | `POST /api/mi-junta/suscripcion/reactivar` |
| Frontend | Botón en plan-suscripcion (cuando `cancelacionSolicitada`) |

---

### 11. PWA
**Estado:** ✅ Implementado

| Dónde | Evidencia |
|-------|-----------|
| Config | `manifest.webmanifest`, `ngsw-config.json` |
| nginx | Reglas para ngsw-worker.js, manifest (no-cache) |

---

### 12. 2FA para Platform Admin
**Estado:** ❌ Pendiente

---

## Resumen

| Prioridad | Hechos | Pendientes |
|-----------|--------|------------|
| Alta      | 4/4    | 0          |
| Media     | 4/4    | 0          |
| Baja      | 3/4    | 1          |

---

## Antes de la demo

1. **Seed** – `npm run db:seed` y validar datos.
2. **Ensayo** – Login Secretaria (1001014), Tesorera (1001015); recorrer flujos clave.
3. **CI** – Push a GitHub y verificar workflow.

---

## Archivos clave (mantenimiento)

| Área | Archivos |
|------|----------|
| Estilos skeleton/empty | `src/styles/_list-states.scss` |
| PWA | `ngsw-config.json`, `public/manifest.webmanifest`, `nginx.conf` |
| Swagger | `main.ts` (DocumentBuilder), controllers con `@ApiTags` |
| Backup/restore | `docs/BACKUP_RESTORE.md`, `scripts/*.sh` |

**Nota PWA (monorepo):** `@angular/service-worker` está en `package.json` raíz para que el build de Angular resuelva correctamente el paquete. El frontend también lo declara en sus dependencias.
