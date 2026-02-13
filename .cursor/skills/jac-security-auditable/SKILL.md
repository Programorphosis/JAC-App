---
name: jac-security-auditable
description: Applies security measures for auditable and regulator-ready systems. Use when implementing auth, JWT, guards, webhook verification, rate limiting, or protecting against SQL injection, XSS, CSRF. References investigacionImplementacionDeSeguridadDeLaApp, 00_ARQUITECTURA_RECTOR copy.
---

# Seguridad para sistemas auditables JAC

## Cuándo usar esta skill

- Implementar o revisar autenticación (JWT, refresh tokens).
- Configurar guards por rol y validación por juntaId.
- Verificar webhooks (Wompi: HMAC/firma).
- Añadir rate limiting, protección contra fuerza bruta o replay.
- Revisar validación de inputs (DTO, sanitización, SQL/XSS/CSRF).

## Principio base

Todo dato con impacto legal debe ser inmutable o trazable. El backend es la única fuente de verdad; el frontend no decide permisos ni montos. Seguridad > Auditoría > Consistencia > Velocidad.

## Autenticación

- JWT con expiración corta. Incluir userId, juntaId, roles en el payload.
- Refresh token rotativo; opcional: revocación en DB.
- Nunca confiar en juntaId (ni roles sensibles) enviados desde el frontend; siempre usar el token.

## Autorización

- Guards por rol (ADMIN, SECRETARIA, TESORERA, RECEPTOR_AGUA, CIUDADANO). Validar en backend en cada endpoint que toque recursos sensibles.
- Toda operación sobre entidades de junta debe estar acotada por juntaId del token.

## Webhook (Wompi)

- Verificar firma/HMAC antes de procesar. Validar estado APPROVED y monto exacto contra la intención o la deuda calculada.
- Idempotencia por referenciaExterna (transactionId) para evitar doble registro.

## Protecciones básicas

- SQL: usar Prisma (ORM); evitar SQL raw dinámico con concatenación.
- XSS: sanitizar inputs; headers CSP si aplica.
- CSRF: tokens CSRF o SameSite cookies según stack.
- Fuerza bruta: rate limiting en login y en endpoints de pago; opcional captcha.

## Infraestructura

- Secrets en variables de entorno (no .env en repo). HTTPS obligatorio en producción.
- Logs centralizados; no exponer la base de datos a internet.

## Documento de referencia

**investigacionImplementacionDeSeguridadDeLaApp.md** – Capas de seguridad, inmutabilidad, auditoría, lenguaje para auditorías.
