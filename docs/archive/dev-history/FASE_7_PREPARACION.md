# Fase 7 – Módulo cartas – Preparación

**Fecha:** 2025-02-13  
**Objetivo:** Alistar todo para iniciar la implementación del módulo de cartas laborales.

---

## Estado de dependencias

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| Fase 6 (Requisitos) | ✅ Completada | RequisitoService, getRequisitosParaCarta, LetterService integrado |
| Fase 5 (Pagos) | ✅ Completada | Pago efectivo, transferencia, online (Wompi) |
| Fase 4 (Deuda) | ✅ Completada | DebtService, cálculo dinámico |
| Modelo Carta (Prisma) | ✅ Existe | id, juntaId, usuarioId, consecutivo, anio, estado, qrToken, fechaSolicitud, fechaEmision, rutaPdf, hashDocumento, motivoRechazo |
| Modelo Documento (Prisma) | ✅ Existe | id, usuarioId, tipo, rutaS3, subidoPorId, fechaSubida |
| LetterService (dominio) | ✅ Existe | emitLetter, validaciones (deuda, requisitos, pago CARTA) |
| LetterEmissionRunner | ✅ Existe | Orquesta emisión con PrismaLetterEmissionContext |
| generateCartaPdf | ⚠️ Stub | Retorna null; falta implementar PDF con QR |

---

## Entregables Fase 7 (orden sugerido)

### 1. GET /usuarios/:id/estado-general
**Prioridad:** Alta – base para flujo digital y presencial.

- Calcular deuda junta (DebtService).
- Obtener requisitos (getRequisitosParaCarta).
- Verificar existencia pago tipo CARTA.
- Respuesta: `{ deuda_junta, requisitos, pago_carta }`.
- Sin almacenar estado; todo calculado.
- **Dependencias:** DebtService, IRequisitoRepository (o LetterEmissionContext), Prisma para Pago.

### 2. POST /pagos tipo CARTA
**Prioridad:** Alta – requisito para validar carta.

- Monto = Junta.montoCarta (backend; nunca desde frontend).
- Si montoCarta es null → error (junta no configurada).
- Consecutivo tipo PAGO_CARTA.
- Métodos: EFECTIVO, TRANSFERENCIA, ONLINE (según flujo).
- **Nota:** PaymentService actual solo registra JUNTA. Extender o crear `registerCartaPayment` en dominio/application.

### 3. POST /documentos
**Prioridad:** Alta – soporte para carta (recibo, etc.).

- Multer + AWS S3.
- Key S3: `{juntaId}/{usuarioId}/{tipo}/{uuid}.{ext}`.
- Tipos: RECIBO_AGUA, SOPORTE_CARTA.
- Validar: usuarioId pertenece a junta del token; tamaño ≤ 5 MB; formatos PDF, JPG, PNG.
- Crear registro Documento; auditoría.
- **Infra:** Configurar S3 (bucket, credenciales). Ver `flujoDocumentos.md`, `configuracionInfraestructura.md`.

### 4. POST /cartas/solicitar
**Prioridad:** Alta.

- Validar: no existe carta PENDIENTE para el usuario en la junta.
- Crear Carta: estado PENDIENTE, consecutivo y anio temporales (o placeholder hasta validar), qrToken placeholder (UUID).
- **Nota:** La carta en PENDIENTE puede tener consecutivo=0, anio=0, qrToken=uuid temporal hasta que se apruebe. O definir si se genera consecutivo al solicitar (consultar flujo).
- **Referencia:** flujoSolicitudCarta.md – consecutivo y qrToken se generan al **aprobar**, no al solicitar.

### 5. POST /cartas/:id/validar
**Prioridad:** Alta.

- Llamar LetterEmissionRunner.emitLetter (ya implementado).
- LetterService valida: deuda=0, requisitos AL_DIA, pago CARTA, carta PENDIENTE.
- Si OK: consecutivo anual, qrToken, PDF (cuando se implemente), actualizar APROBADA, auditoría.
- **Pendiente:** Implementar generateCartaPdf (PDF con QR insertado).

### 6. Generación de PDF con QR
**Prioridad:** Media – puede ser stub inicial.

- Librería: pdf-lib, pdfkit o similar.
- Contenido QR: `https://{dominio}/validar-carta/{qrToken}`.
- Subir PDF a S3; guardar rutaPdf y opcionalmente hashDocumento.
- **Referencia:** validacionesDeCartaQR.md.

### 7. GET /public/validar-carta/:qrToken
**Prioridad:** Alta – verificación externa.

- Sin autenticación.
- Buscar carta por qrToken; verificar estado=APROBADA.
- Respuesta: HTML o JSON con: válida, nombre, documento parcial, fecha, junta.
- Auditoría de consulta.
- **Seguridad:** Rate limiting recomendado (Fase 8).

---

## Infraestructura necesaria

| Recurso | Estado | Acción |
|---------|--------|--------|
| AWS S3 bucket | Por configurar | Crear bucket; variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_DOCS |
| Multer | Por instalar | `npm install multer @types/multer` en backend |
| AWS SDK (S3) | Por instalar | `@aws-sdk/client-s3` |
| PDF + QR | Por instalar | `pdf-lib` o `pdfkit`, `qrcode` |

---

## Orden de implementación recomendado

1. **Estado general** – GET /usuarios/:id/estado-general (sin dependencias de S3).
2. **Pago CARTA** – Extender pagos para tipo CARTA (monto desde Junta.montoCarta).
3. **Documentos** – POST /documentos + S3 (requiere config AWS).
4. **Solicitar carta** – POST /cartas/solicitar.
5. **Validar carta** – POST /cartas/:id/validar (LetterEmissionRunner ya existe; falta PDF).
6. **PDF + QR** – Implementar generateCartaPdf en PrismaLetterEmissionContext o servicio dedicado.
7. **Validación pública** – GET /public/validar-carta/:qrToken.

---

## Documentos de referencia

- `docs/flujoSolicitudCarta.md` – Flujo unificado, pasos, tablas.
- `docs/validacionesDeCartaQR.md` – Contenido QR, momento de generación, seguridad.
- `docs/flujoDocumentos.md` – Tipos, S3, permisos.
- `docs/definicionDomainServices.md` – LetterService, PaymentService.
- `docs/convencionesAPI.md` – Códigos HTTP, estructura respuesta.

---

## Consideración de schema: Carta en PENDIENTE

El modelo actual exige `consecutivo`, `anio` y `qrToken` obligatorios. Según el flujo:
- **consecutivo** y **qrToken** se generan al aprobar, no al solicitar.
- Opciones: (a) Migración: hacer `consecutivo Int?` para PENDIENTE (null hasta aprobar); (b) Usar valores temporales (consecutivo=0, qrToken=uuid) y actualizar al aprobar. La opción (a) es más limpia pero requiere migración.

---

## Checklist pre-inicio

- [ ] Variables de entorno para S3 definidas en `.env.example`.
- [ ] Junta.montoCarta configurado en bootstrap/juntas existentes (no null para probar pago CARTA).
- [ ] Decidir estrategia para consecutivo/qrToken en cartas PENDIENTE (ver consideración arriba).
