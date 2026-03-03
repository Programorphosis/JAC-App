# Análisis: Pilares de Arquitectura de Soluciones vs Proyecto JAC

**Versión:** 1.0  
**Fecha:** 2026-03-03  
**Referencia:** Libro "Arquitectura de soluciones para líderes tecnológicos" y marcos de referencia (AWS Well-Architected, Azure, etc.)

---

## 1. Marco de referencia: los pilares

Los marcos de arquitectura de soluciones más reconocidos (AWS Well-Architected, Azure Well-Architected, Google Cloud) definen **seis pilares** como cimientos de una arquitectura robusta. Si el libro que consultas menciona **cuatro pilares**, suelen ser un subconjunto o agrupación de estos:

| Pilar | Descripción breve |
|-------|-------------------|
| **1. Excelencia operativa** | Optimizar operaciones, automatización, observabilidad, mejora continua |
| **2. Seguridad** | Proteger datos, identidad, infraestructura; cumplimiento normativo |
| **3. Fiabilidad** | Disponibilidad, recuperación ante fallos, tolerancia a fallos |
| **4. Eficiencia del rendimiento** | Escalabilidad, optimización de recursos, latencia |
| **5. Optimización de costos** | Control de gastos, eficiencia económica |
| **6. Sostenibilidad** | Impacto ambiental, eficiencia energética |

**Interpretación para 4 pilares:** Muchos libros condensan en cuatro: **Seguridad**, **Fiabilidad**, **Excelencia operativa** y **Eficiencia del rendimiento** (o **Costos**). Este análisis cubre los seis para dar una visión completa.

---

## 2. Resumen ejecutivo

| Pilar | Alineación | Fortalezas | Gaps principales |
|-------|------------|------------|------------------|
| Excelencia operativa | 🟢 Alta | CI, Docker, health checks, logs JSON, backups | CD manual, alertas sin configurar, métricas básicas |
| Seguridad | 🟢 Alta | JWT, RBAC, auditoría, rate limit, HMAC webhook, cifrado Wompi | 2FA pendiente, política retención |
| Fiabilidad | 🟢 Alta | Transacciones serializables, idempotencia, reconciliación Wompi | Prueba de restauración pendiente |
| Eficiencia del rendimiento | 🟡 Media | Índices multi-tenant, pool conexiones, micro-pausas crons | Sin métricas de latencia, sin autoescalado |
| Optimización de costos | 🟡 Media | VPS, S3 STANDARD_IA backups, pool limitado | Sin análisis de costos por junta |
| Sostenibilidad | 🟡 Baja | No explícito | Sin métricas ni objetivos de eficiencia energética |

---

## 3. Análisis detallado por pilar

### 3.1 Excelencia operativa

**Objetivo:** Operar y monitorear sistemas de forma eficiente, con automatización y mejora continua.

#### Lo que el proyecto JAC hace bien ✅

| Práctica | Evidencia |
|----------|-----------|
| **CI (Integración Continua)** | `.github/workflows/ci.yml`: lint backend, build backend y frontend en cada push/PR a master/main |
| **Infraestructura como código** | Dockerfiles multi-stage, docker-compose, Caddy para HTTPS |
| **Health checks** | `/health/live` (liveness) y `/health/ready` (readiness con DB) |
| **Logs estructurados** | `ProdLogger` JSON en producción para integración con Loki, CloudWatch, etc. |
| **Backups automatizados** | `scripts/backup-db.sh` con cron diario, retención local 30 días, S3 90 días |
| **Validación de entorno** | `validateEnv()` en arranque; falla si faltan variables críticas |
| **Documentación operativa** | `GUIA_DESPLIEGUE_PRODUCCION.md`, `CHECKLIST_SAAS_PROFESIONAL.md`, `BACKUP_RESTORE.md` |
| **Monitoreo básico** | Uptime Kuma en `docker-compose.monitoring.yml` |

#### Lo que falta o se puede mejorar ⚠️

| Gap | Impacto | Recomendación |
|-----|---------|---------------|
| **CD (Despliegue Continuo)** | Deploy manual; riesgo de errores humanos | Pipeline GitHub Actions: build imagen → push registry → deploy por SSH o similar |
| **Alertas no configuradas** | No se detectan fallos hasta que el usuario reporta | Configurar notificaciones en Uptime Kuma (email, Slack) |
| **Métricas de latencia** | No hay visibilidad de rendimiento por endpoint | Añadir middleware de métricas (Prometheus, o logs de latencia) |
| **Prueba de restauración** | No se ha validado que los backups sean restaurables | Ejecutar `restore-db.sh` al menos una vez y documentar |
| **Runbooks** | Procedimientos de incidentes no formalizados | Documentar: "DB caída", "Wompi webhook fallando", "S3 no responde" |

---

### 3.2 Seguridad

**Objetivo:** Proteger información y sistemas; cumplir normativas; gestionar identidad y acceso.

#### Lo que el proyecto JAC hace bien ✅

| Práctica | Evidencia |
|----------|-----------|
| **Autenticación** | JWT con `userId`, `juntaId`, `roles`; refresh token rotativo |
| **Autorización** | RBAC con guards por rol; `juntaId` siempre del token, nunca del frontend |
| **Multi-tenant estricto** | Toda consulta filtra por `juntaId`; skill `jac-multitenant-queries` |
| **Auditoría** | Tabla `Auditoria` inmutable; eventos: pago, carta, login, impersonación, cambio de rol |
| **Rate limiting** | ThrottlerModule: global 60/min, login 5/min, pagos 20/min |
| **Webhook seguro** | HMAC en webhook Wompi |
| **Credenciales Wompi cifradas** | AES-256-GCM en DB; clave maestra en env |
| **Headers de seguridad** | Helmet en NestJS |
| **HTTPS obligatorio** | Caddy con Let's Encrypt |
| **Inmutabilidad** | `politicasInmutabilidad.md`; Pago, HistorialLaboral, Auditoria sin UPDATE/DELETE |
| **Documentación legal** | `docs/legal/`; términos, privacidad, cancelación |

#### Lo que falta o se puede mejorar ⚠️

| Gap | Impacto | Recomendación |
|-----|---------|---------------|
| **2FA** | Cuentas ADMIN/Platform Admin vulnerables a robo de contraseña | Implementar TOTP (Google Authenticator); obligatorio para PLATFORM_ADMIN |
| **Política de retención** | No documentada formalmente | Definir retención por tipo de dato (pagos 5 años, logs X años) y documentar en privacidad |
| **Cifrado en reposo DB/S3** | Depende del proveedor | Verificar SSE en S3; LUKS o cifrado nativo en disco si VPS propio |
| **Hash encadenado en auditoría** | Anti-manipulación opcional | Implementar si se requiere máxima defensa ante auditoría regulatoria |

---

### 3.3 Fiabilidad

**Objetivo:** Garantizar que el sistema funcione de forma consistente y se recupere ante fallos.

#### Lo que el proyecto JAC hace bien ✅

| Práctica | Evidencia |
|----------|-----------|
| **Transacciones** | Pagos con `isolationLevel: 'Serializable'` |
| **Idempotencia** | `referenciaExterna` única en pagos online; webhook y retorno usan misma función |
| **Reconciliación Wompi** | Job nocturno compara APPROVED en Wompi vs BD; registra faltantes |
| **Health checks** | Readiness detecta DB caída; Docker no arranca backend si DB no está lista |
| **Backups** | Diarios, locales + S3; script de restauración documentado |
| **Pool de conexiones** | `connection_limit=5` evita agotar recursos en VPS pequeño |
| **Micro-pausas en crons** | 150ms entre juntas en facturación día 1; evita saturar CPU |
| **Flujos documentados** | `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md` |

#### Lo que falta o se puede mejorar ⚠️

| Gap | Impacto | Recomendación |
|-----|---------|---------------|
| **Prueba de restauración** | No se sabe si los backups funcionan | Ejecutar restore en entorno de prueba; documentar resultado |
| **Reintentos en llamadas externas** | Wompi, S3, Mailgun pueden fallar transitoriamente | Añadir retry con backoff en clientes HTTP |
| **Circuit breaker** | Fallo en Wompi puede cascadear | Considerar circuit breaker para integraciones externas si hay muchos fallos |
| **Replicación DB** | Sin réplica; punto único de fallo | Para escalar: considerar réplica de solo lectura para consultas pesadas |

---

### 3.4 Eficiencia del rendimiento

**Objetivo:** Usar los recursos de forma eficiente; escalar según demanda; optimizar latencia.

#### Lo que el proyecto JAC hace bien ✅

| Práctica | Evidencia |
|----------|-----------|
| **Índices multi-tenant** | `@@index([juntaId, fechaPago])`, `(juntaId, estado)`, etc. en migración `20260219100000` |
| **Pool de conexiones** | Limitado a 5; evita agotar Postgres en VPS 2GB |
| **Cálculo de deuda bajo demanda** | No se almacena; se calcula cuando se necesita |
| **Cache de assets frontend** | Nginx: 1 año para JS/CSS con hash; `immutable` |
| **Capacidad documentada** | `GUIA_DESPLIEGUE_PRODUCCION.md`: 100–300 juntas, 20–40 usuarios concurrentes |

#### Lo que falta o se puede mejorar ⚠️

| Gap | Impacto | Recomendación |
|-----|---------|---------------|
| **Métricas de latencia** | No hay visibilidad de cuellos de botella | Middleware que registre latencia por endpoint; alertas si > 400ms |
| **Queries lentas** | No se monitorean | Habilitar `log_min_duration_statement` en Postgres; revisar logs |
| **Cache de consultas frecuentes** | Tarifas, planes se consultan repetidamente | Cache en memoria (Redis o similar) para datos que cambian poco |
| **Autoescalado** | No existe | Para >100 juntas: considerar múltiples instancias detrás de load balancer |

---

### 3.5 Optimización de costos

**Objetivo:** Minimizar gastos sin sacrificar capacidad; entender el costo por recurso.

#### Lo que el proyecto JAC hace bien ✅

| Práctica | Evidencia |
|----------|-----------|
| **VPS en lugar de servicios gestionados** | Menor costo para MVP; Lightsail, DigitalOcean, etc. |
| **S3 STANDARD_IA para backups** | Más barato que STANDARD para datos que se leen raramente |
| **Pool de conexiones limitado** | Evita sobreprovisionar Postgres |
| **Bucket separado para backups** | Permisos y políticas de ciclo de vida distintas; facturación clara |
| **Retención diferenciada** | Local 30 días, S3 90 días; evita acumular datos innecesarios |

#### Lo que falta o se puede mejorar ⚠️

| Gap | Impacto | Recomendación |
|-----|---------|---------------|
| **Análisis de costos por junta** | No se sabe cuánto cuesta operar cada junta | Métricas: storage por junta, emails enviados, requests; dashboard interno |
| **Lifecycle policy S3** | Backups viejos en STANDARD_IA indefinidamente | Mover a Glacier después de 90 días para reducir costo |
| **Alertas de gasto** | No hay alertas si AWS/S3 sube de precio | Configurar alertas de facturación en AWS |
| **Optimización de imágenes** | Dockerfiles podrían reducir tamaño | Revisar capas; usar imágenes Alpine donde aplique |

---

### 3.6 Sostenibilidad

**Objetivo:** Reducir impacto ambiental; eficiencia energética; viabilidad a largo plazo.

#### Lo que el proyecto JAC hace bien ✅

| Práctica | Evidencia |
|----------|-----------|
| **Arquitectura eficiente** | Cálculo bajo demanda; no almacenar datos redundantes |
| **VPS compartido** | Menor huella que servidores dedicados subutilizados |
| **Código mantenible** | Capas claras, documentación; facilita evolución sin reescribir |

#### Lo que falta o se puede mejorar ⚠️

| Gap | Impacto | Recomendación |
|-----|---------|---------------|
| **Sin métricas de sostenibilidad** | No hay objetivos ni seguimiento | Para madurez: considerar carbono por request, eficiencia por usuario |
| **Región de datos** | No documentado | Elegir región AWS cercana a usuarios (ej. sa-east-1) reduce latencia y puede reducir energía |
| **Horarios de jobs** | Crons 2:00 AM, 9:00 AM | Evitar picos de demanda; ya está bien dimensionado |

---

## 4. Alineación con la filosofía del libro

### Si el libro usa 4 pilares (Seguridad, Fiabilidad, Excelencia operativa, Eficiencia)

| Pilar | Alineación | Comentario |
|-------|------------|------------|
| **Seguridad** | 🟢 **Muy alineado** | JWT, RBAC, auditoría, inmutabilidad, cifrado. Falta 2FA y política retención. |
| **Fiabilidad** | 🟢 **Muy alineado** | Transacciones, idempotencia, reconciliación, backups. Falta prueba de restore. |
| **Excelencia operativa** | 🟢 **Alineado** | CI, Docker, health checks, logs, backups. Falta CD y alertas. |
| **Eficiencia** | 🟡 **Parcialmente alineado** | Índices y pool bien; faltan métricas y cache. |

### Principios que el proyecto ya encarna

1. **"Seguridad por diseño"** — Inmutabilidad, auditoría, backend como fuente de verdad.
2. **"No inventar; documentar"** — Flujos, convenciones y reglas explícitas.
3. **"Estabilidad antes que velocidad"** — Filosofía del documento rector: estabilidad → trazabilidad → automatización → escalabilidad.
4. **"Cimientos sólidos"** — Domain layer puro, sin dependencias de framework; defendible ante auditoría.

---

## 5. Plan de mejora priorizado

### Corto plazo (1–2 sprints)

| # | Acción | Pilar | Esfuerzo |
|---|--------|-------|----------|
| 1 | Configurar alertas en Uptime Kuma (email/Slack) | Excelencia operativa | Bajo |
| 2 | Ejecutar y documentar prueba de restauración de backup | Fiabilidad | Bajo |
| 3 | Implementar 2FA para Platform Admin (obligatorio) | Seguridad | Medio |
| 4 | Documentar política de retención de datos | Seguridad | Bajo |

### Medio plazo (3–6 meses)

| # | Acción | Pilar | Esfuerzo |
|---|--------|-------|----------|
| 5 | Pipeline CD: deploy automático tras merge a main | Excelencia operativa | Medio |
| 6 | Métricas de latencia por endpoint (middleware + logs) | Eficiencia, Excelencia | Medio |
| 7 | Lifecycle policy S3: backups >90 días → Glacier | Optimización costos | Bajo |
| 8 | Reintentos con backoff en Wompi, S3, Mailgun | Fiabilidad | Medio |

### Largo plazo (según crecimiento)

| # | Acción | Pilar | Esfuerzo |
|---|--------|-------|----------|
| 9 | Cache (Redis) para tarifas, planes | Eficiencia | Medio |
| 10 | Dashboard de costos por junta | Optimización costos | Alto |
| 11 | Circuit breaker para integraciones externas | Fiabilidad | Medio |
| 12 | Autoescalado (múltiples instancias + load balancer) | Eficiencia | Alto |

---

## 6. Conclusión

El proyecto JAC está **bien alineado** con los pilares de arquitectura de soluciones para sistemas que deben ser **auditables, seguros y confiables**. Las prioridades del dominio (juntas de acción comunal, pagos, cartas laborales) coinciden con un diseño que prioriza:

- **Seguridad** y trazabilidad sobre velocidad
- **Inmutabilidad** de datos críticos
- **Backend como fuente de verdad**
- **Multi-tenant estricto**

Los principales gaps están en **operaciones** (CD, alertas, prueba de restore) y en **observabilidad** (métricas de latencia, costos). Ninguno es bloqueante para producción actual; son mejoras para madurez operativa y escalabilidad futura.

---

**Referencias**

- `plan.md` — Principios rectores
- `00_ARQUITECTURA_RECTOR copy.md` — Arquitectura oficial
- `CHECKLIST_SAAS_PROFESIONAL.md` — Estado detallado por área
- `GUIA_DESPLIEGUE_PRODUCCION.md` — Infraestructura y capacidad
- `investigacionImplementacionDeSeguridadDeLaApp.md` — Medidas de seguridad
- AWS Well-Architected Framework: https://docs.aws.amazon.com/wellarchitected/
