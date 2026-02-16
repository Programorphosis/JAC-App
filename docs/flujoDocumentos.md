# Flujo de Documentos (Upload) – Sistema JAC

**Versión:** 1.0  
**Objetivo:** Definir el módulo de subida de documentos (recibo de agua, soporte de carta) y su integración con S3.

---

## 1. Principio Multi-Tenant

**Regla absoluta:** Toda consulta de Documento debe filtrar por `juntaId`. Como Documento no tiene `juntaId` directo, el filtro se hace vía `Usuario.juntaId`:

```typescript
// Correcto: filtrar por usuario que pertenece a la junta
where: {
  usuario: {
    juntaId: authUser.juntaId
  }
}
```

Nunca consultar Documento sin validar que el usuario pertenezca a la junta del token.

---

## 2. Tipos de Documento

| Tipo | Uso | Validación para carta |
|------|-----|------------------------|
| RECIBO_AGUA | Comprobante de pago de agua | No determina estado. El estado se valida por EstadoRequisito (el modificador del RequisitoTipo marca AL_DIA). |
| SOPORTE_CARTA | Documento adjunto a solicitud de carta | Soporte administrativo; la emisión de carta depende de deuda=0, requisitos adicionales AL_DIA y pago carta. |

---

## 3. Modelo de Datos (Schema)

```
Documento:
  id, usuarioId, tipo, rutaS3, subidoPorId, fechaSubida
```

- **tipo:** String (RECIBO_AGUA, SOPORTE_CARTA, u otros que se definan).
- **rutaS3:** URL o key del objeto en S3.
- **subidoPorId:** Usuario que subió el archivo.

---

## 4. Estructura en S3

Los objetos se organizan por prefijo según el tipo de contenido:

| Prefijo | Estructura | Ejemplo |
|---------|------------|---------|
| `documentos/` | `documentos/{juntaId}/{usuarioId}/{tipo}/{uuid}.{ext}` | `documentos/junta-123/user-456/RECIBO_AGUA/a1b2c3d4.pdf` |
| `cartas/` | `cartas/{juntaId}/{usuarioId}/{anio}-{consecutivo}.pdf` | `cartas/junta-123/user-456/2025-1.pdf` |

- **documentos/**: recibos, soportes (RECIBO_AGUA, SOPORTE_CARTA).
- **cartas/**: PDFs de cartas laborales emitidas (consecutivo anual).
- **juntaId** y **usuarioId** permiten organización y limpieza por junta.
- **uuid** en documentos evita colisiones; **consecutivo** en cartas facilita identificación.

---

## 5. Validaciones de Subida

| Validación | Valor | Descripción |
|------------|-------|-------------|
| Tamaño máximo | 5 MB | Por archivo |
| Formatos permitidos | PDF, JPG, JPEG, PNG | Para recibo agua y soporte carta |
| Tipos MIME | application/pdf, image/jpeg, image/png | Validar en backend |

---

## 6. Flujo de Subida

1. **Frontend:** Usuario selecciona archivo → `POST /api/documentos` con `multipart/form-data`.
2. **Backend:**
   - Validar autenticación y que `usuarioId` pertenezca a la junta del token.
   - Validar tipo, tamaño y formato.
   - Generar key S3: `{juntaId}/{usuarioId}/{tipo}/{uuid}.{ext}`.
   - Subir a S3 (Multer + SDK AWS).
   - Crear registro en Documento (usuarioId, tipo, rutaS3, subidoPorId).
   - Registrar auditoría.
3. **Respuesta:** `201 Created` con `{ data: { id, tipo, rutaS3, fechaSubida } }`.

---

## 7. Permisos por Rol

| Rol | Subir documento | Ver documentos |
|-----|-----------------|----------------|
| AFILIADO | Propios (usuarioId = self) | Propios |
| SECRETARIA, TESORERA, modificador de requisito | En nombre de usuarios de su junta | Usuarios de su junta |
| ADMIN | En nombre de cualquier usuario de su junta | Usuarios de su junta |

Toda operación debe validar `juntaId` del token.

---

## 8. Integración con Cartas

- Los documentos tipo RECIBO_AGUA o SOPORTE_CARTA son **soporte administrativo**.
- La decisión de emitir carta depende de: deuda=0, requisitos adicionales AL_DIA (o exento), pago tipo CARTA.
- El documento no determina el estado; solo el modificador del RequisitoTipo actualiza EstadoRequisito.

---

## 9. Endpoints Sugeridos

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/documentos | Subir documento (multipart). Body: usuarioId, tipo, file |
| GET | /api/usuarios/:id/documentos | Listar documentos de un usuario (filtrado por junta) |
| GET | /api/documentos/:id | Obtener un documento (si pertenece a la junta) |
| GET | /api/documentos/:id/descargar | URL firmada o redirect para descargar desde S3 |

---

**Referencias:** `flujoSolicitudCarta.md`, `00_ARQUITECTURA_RECTOR copy.md`, `SCHEMA BASE v1.md`.
