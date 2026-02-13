# Convenciones de API – Sistema JAC

**Versión:** 1.0  
**Objetivo:** Establecer contrato estándar de respuestas, errores y convenciones HTTP para la API REST.

---

## 1. Estructura de Respuesta Exitosa

Toda respuesta exitosa sigue el formato:

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-02-12T10:30:00.000Z",
    "requestId": "uuid-opcional"
  }
}
```

- **data:** Contiene el payload de la respuesta (objeto o array).
- **meta:** Opcional. Metadatos como timestamp, requestId para trazabilidad.

**Excepción:** Para respuestas muy simples (ej. `DELETE` sin body), se puede devolver solo `{ "data": null }` o status 204 No Content.

---

## 2. Estructura de Respuesta de Error

Toda respuesta de error sigue el formato:

```json
{
  "error": {
    "code": "DEUDA_CERO",
    "message": "Usuario ya está al día, no hay deuda por pagar",
    "details": {}
  },
  "meta": {
    "timestamp": "2025-02-12T10:30:00.000Z"
  }
}
```

- **error.code:** Código único en UPPER_SNAKE_CASE para identificación programática.
- **error.message:** Mensaje legible para el usuario o logs.
- **error.details:** Opcional. Objeto con información adicional (ej. campos de validación, IDs).

---

## 3. Códigos HTTP

| Código | Uso |
|--------|-----|
| 200 | OK – Operación exitosa (GET, PATCH, PUT) |
| 201 | Created – Recurso creado (POST) |
| 204 | No Content – Operación exitosa sin body (DELETE) |
| 400 | Bad Request – Validación fallida, datos inválidos |
| 401 | Unauthorized – No autenticado o token inválido/expirado |
| 403 | Forbidden – Autenticado pero sin permiso para la acción |
| 404 | Not Found – Recurso no existe o no pertenece a la junta |
| 409 | Conflict – Conflicto de negocio (ej. pago duplicado, carta pendiente) |
| 422 | Unprocessable Entity – Lógica de negocio rechazada (ej. monto incorrecto) |
| 429 | Too Many Requests – Rate limit excedido |
| 500 | Internal Server Error – Error no controlado del servidor |

---

## 4. Códigos de Error de Dominio (ejemplos)

| Código | HTTP | Descripción |
|--------|------|-------------|
| VALIDACION_FALLIDA | 400 | Errores de validación de DTO |
| TOKEN_INVALIDO | 401 | JWT inválido o expirado |
| SIN_PERMISO | 403 | Rol insuficiente |
| RECURSO_NO_ENCONTRADO | 404 | Recurso no existe o no pertenece a junta |
| DEUDA_CERO | 422 | Usuario ya al día, no puede pagar |
| MONTO_INCORRECTO | 422 | Monto no coincide con deuda calculada |
| PAGO_DUPLICADO | 409 | referenciaExterna ya registrada |
| CARTA_PENDIENTE_EXISTE | 409 | Usuario ya tiene carta pendiente |
| REQUISITOS_CARTA_NO_CUMPLIDOS | 422 | Deuda, agua o pago carta faltante |
| AGUA_NO_AL_DIA | 422 | Estado agua no permite emitir carta |

---

## 5. Prefijo de API

Todas las rutas de la API usan el prefijo `/api`:

- `GET /api/usuarios/:id/deuda`
- `POST /api/pagos`
- `GET /api/health` (o `/api/health` para consistencia)

---

## 6. Autenticación

- **Header:** `Authorization: Bearer <access_token>`
- **Refresh:** `POST /api/auth/refresh` con body `{ "refreshToken": "..." }`
- Respuesta 401 cuando el token es inválido o expirado.

---

## 7. Paginación (cuando aplique)

Para listados paginados:

**Query params:** `?page=1&limit=20`

**Respuesta:**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 8. Ordenamiento (cuando aplique)

**Query params:** `?sort=nombre&order=asc` (asc | desc)

---

## 9. Filtrado por juntaId

**Regla absoluta:** El `juntaId` nunca se recibe del cliente. Se extrae del JWT en cada request. Toda consulta filtra implícitamente por `juntaId` del token.

---

## 10. Versionado

Para el MVP se usa `/api` sin versión. Si en el futuro se requiere versionado, se adoptará `/api/v1`, `/api/v2`, etc.

---

**Referencia:** Este documento es la fuente de verdad para el contrato de la API. Los controllers deben respetar estas convenciones.
