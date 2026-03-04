# Fase 7 – Módulo cartas

**Fecha:** 2025-02-14  
**Objetivo:** Solicitud, validación, emisión con PDF y QR verificable.

---

## Resumen del trabajo

Se implementó el flujo completo de cartas laborales: estado general del usuario, subida de documentos, pago tipo CARTA (efectivo/transferencia/online), solicitud, validación con requisitos (deuda=0, requisitos AL_DIA, pago carta), generación de PDF con QR y verificación pública.

---

## Cambios realizados

### 1. Endpoints implementados

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /usuarios/:id/estado-general | Deuda junta, requisitos, pago CARTA (calculado, sin almacenar) |
| POST | /documentos | Subida a S3 (RECIBO_AGUA, SOPORTE_CARTA) |
| GET | /usuarios/:id/documentos | Listar documentos del usuario |
| GET | /documentos/:id/descargar | URL firmada para descargar |
| POST | /pagos/carta | Pago CARTA efectivo/transferencia |
| POST | /pagos/carta/online/intencion | Intención pago CARTA online (Wompi) |
| POST | /cartas/solicitar | Crear carta PENDIENTE |
| POST | /cartas/:id/validar | Validar y aprobar (LetterService) |
| GET | /public/validar-carta/:qrToken | Verificación pública sin auth |

### 2. Estructura S3 (prefijos por tipo)

| Tipo | Ruta en S3 | Ejemplo CloudFront |
|------|------------|---------------------|
| Cartas | `cartas/{juntaId}/{userId}/{anio}-{consecutivo}.pdf` | `.../cartas/junta-123/user-456/2025-1.pdf` |
| Documentos | `documentos/{juntaId}/{userId}/{tipo}/{uuid}.{ext}` | `.../documentos/junta-123/user-456/RECIBO_AGUA/abc.pdf` |

### 3. Dominio e infraestructura

- **LetterService**: validaciones (deuda=0, requisitos AL_DIA, pago CARTA), consecutivo anual, qrToken, PDF.
- **LetterEmissionRunner**: orquesta emisión en transacción con PrismaLetterEmissionContext.
- **CartaPdfService**: genera PDF con pdf-lib, inserta QR (URL: APP_PUBLIC_URL/api/public/validar-carta/{qrToken}), sube a S3 en `cartas/`, calcula hash SHA256.
- **PrismaLetterEmissionContext**: getCarta, hasPagoCarta, getRequisitosParaCarta, getNextConsecutivoCarta, updateCartaAprobada, generateCartaPdf.

### 4. Reglas de negocio

- Una sola carta PENDIENTE por usuario.
- Validación: deuda junta = 0, todos los requisitos con obligacionActiva=true en AL_DIA, pago tipo CARTA existente.
- Monto carta desde Junta.montoCarta (nunca desde frontend).
- QR: solo token UUID; validación en backend; sin datos sensibles.
- PDF: generado solo al aprobar; si S3 no configurado, carta se aprueba sin rutaPdf (dev).

### 5. Auditoría

- SOLICITUD_CARTA, EMISION_CARTA, SUBIDA_DOCUMENTO, CONSULTA_VALIDACION_PUBLICA.

### 6. Rate limiting

- validar-carta: 30/min por IP (Throttle en PublicController).

---

## Variables de entorno

| Variable | Uso |
|----------|-----|
| APP_PUBLIC_URL | URL base del API para el QR (ej. https://api.tudominio.com). Por defecto: http://localhost:3000 |
| AWS_* | S3 para documentos y PDF de cartas |

---

## Correcciones aplicadas en cierre

1. **CartaPdfService.baseUrl**: eliminado fallback a CORS_ORIGIN (es frontend; el QR debe apuntar al backend).
2. **GET /usuarios/:id/documentos**: agregado según flujoDocumentos.md para listar documentos del usuario.

---

## Pendiente (opcional / futuro)

- POST /cartas/:id/rechazar con motivoRechazo (flujoSolicitudCarta lo menciona como opcional).
- Hash encadenado en auditoría (Fase 8, opcional).

---

## Referencias

- flujoSolicitudCarta.md
- validacionesDeCartaQR.md
- flujoDocumentos.md
- definicionDomainServices.md (LetterService)
