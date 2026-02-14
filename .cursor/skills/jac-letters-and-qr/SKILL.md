---
name: jac-letters-and-qr
description: Implements or reviews the letters module (request, validation, PDF, QR verification). Use when working on cartas, letter endpoints, PDF generation, QR generation, or public validation of letters. References flujoSolicitudCarta, validacionesDeCartaQR.
---

# Módulo de cartas y QR JAC

## Cuándo usar esta skill

- Implementar solicitud de carta, validación por secretaría o emisión automática.
- Generar PDF de carta e insertar QR en el documento.
- Exponer endpoint público de validación de carta por QR (para terceros).
- Integrar con LetterService en la capa de dominio.

## Requisitos para emitir carta

- Deuda junta = 0 (calculada, no almacenada).
- Requisitos adicionales = AL_DIA según EstadoRequisito (o usuario exento: obligacionActiva = false). La validación se hace por getRequisitosParaCarta; los documentos son solo soporte, no determinan el estado.
- Pago tipo CARTA registrado.
- Carta en estado PENDIENTE (no duplicar solicitudes pendientes).

Validación dentro de una **transacción**; si algo falla, no actualizar la carta.

## Flujo unificado

- No hay dos flujos (digital vs presencial); mismo backend, mismas tablas. Solo cambia quién ejecuta (usuario o secretaría).
- Estado general del usuario: `GET /usuarios/:id/estado-general` devuelve deuda calculada, requisitos adicionales (estado por RequisitoTipo), existencia de pago carta (sin almacenar estados derivados).

## QR y validación pública

- El QR contiene solo un **identificador** (ej. UUID o token único), no datos sensibles en claro.
- Al aprobar la carta: generar `qrToken` (único), generar PDF, guardar en S3, actualizar carta con: estado APROBADA, consecutivo, anio, fechaEmision, emitidaPorId, rutaPdf (URL/ruta S3), hashDocumento (opcional, SHA256 del PDF para integridad). Para cartas rechazadas puede guardarse motivoRechazo (opcional).
- Endpoint público (sin auth): `GET /public/validar-carta/:qrToken`. Backend busca la carta por qrToken, verifica estado (APROBADA), opcionalmente recalcula hash del PDF y compara con hashDocumento; responde con vista pública (válida, nombre, documento parcial, fecha, junta). Registrar auditoría de la consulta.
- No poner datos personales completos ni deudas en el contenido del QR; la verificación se hace en backend.

## Documentos de referencia

- **flujoSolicitudCarta.md** – Flujo unificado, pasos digital y presencial, tablas.
- **validacionesDeCartaQR.md** – Contenido del QR, momento de generación, flujo de validación, seguridad.
