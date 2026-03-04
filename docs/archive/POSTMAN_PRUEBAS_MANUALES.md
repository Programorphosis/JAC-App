# Guía de Pruebas Manuales con Postman – API JAC

**Base URL:** `http://localhost:3000/api`  
**Versión:** 1.0

---

## 1. Configuración Inicial

### Variables de entorno en Postman

Crear un entorno con:

| Variable | Valor inicial | Descripción |
|----------|---------------|-------------|
| `baseUrl` | `http://localhost:3000/api` | URL base de la API |
| `accessToken` | (vacío) | Se llena tras login |
| `juntaId` | (vacío) | Se llena tras login (para referencia) |

### Headers comunes

Para endpoints autenticados:

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer {{accessToken}}` |
| `Content-Type` | `application/json` |

---

## 2. Flujo de Pruebas (Orden Recomendado)

### Paso 0: Bootstrap (solo primera vez)

Solo si la base está vacía (sin juntas).

---

### 2.1 Bootstrap

**POST** `{{baseUrl}}/bootstrap`

**Headers:**

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `X-Bootstrap-Token` | Valor de `BOOTSTRAP_TOKEN` en `.env` (ej: `your-bootstrap-token-here`) |

**Body (raw JSON):**

```json
{
  "platformAdmin": {
    "nombres": "Admin",
    "apellidos": "Plataforma",
    "tipoDocumento": "CC",
    "numeroDocumento": "00000000",
    "password": "Admin123!"
  },
  "primeraJunta": {
    "nombre": "Junta Barrio Centro",
    "nit": "900123456",
    "montoCarta": 5000,
    "adminUser": {
      "nombres": "Juan",
      "apellidos": "Pérez",
      "tipoDocumento": "CC",
      "numeroDocumento": "12345678",
      "telefono": "3001234567",
      "direccion": "Calle 10 #5-20"
    }
  }
}
```

**Respuesta esperada:** 201 Created. Guardar la contraseña temporal del admin de la junta para el siguiente login.

---

### 2.2 Login (Usuario de Junta – ADMIN)

**POST** `{{baseUrl}}/auth/login`

**Headers:**

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

**Body (raw JSON):**

```json
{    
  "tipoDocumento": "CC",
  "numeroDocumento": "12345678",
  "password": "CONTRASEÑA_TEMPORAL_DEL_BOOTSTRAP"
}
```

> Si el admin cambió la contraseña, usar la nueva. Para pruebas iniciales usar la temporal del bootstrap.

**Respuesta:** Copiar `data.accessToken` y guardarlo en la variable `accessToken` del entorno.

---

### 2.3 Login (Platform Admin)

**POST** `{{baseUrl}}/auth/login`

**Body:**

```json
{
  "tipoDocumento": "CC",
  "numeroDocumento": "00000000",
  "password": "Admin123!",
  "juntaId": "platform"
}
```

---

### 2.4 Refresh Token

**POST** `{{baseUrl}}/auth/refresh`

**Body:**

```json
{
  "refreshToken": "TOKEN_DE_REFRESCO_OBTENIDO_EN_LOGIN"
}
```

---

### 2.5 Perfil (me)

**GET** `{{baseUrl}}/auth/me`

**Headers:** `Authorization: Bearer {{accessToken}}`

---

## 3. Usuarios

**Base:** `{{baseUrl}}/usuarios`  
**Auth:** JWT + JuntaGuard  
**Roles:** ADMIN, SECRETARIA (según endpoint)

### 3.1 Listar usuarios

**GET** `{{baseUrl}}/usuarios?page=1&limit=20`

**Headers:** `Authorization: Bearer {{accessToken}}`

---

### 3.2 Obtener usuario

**GET** `{{baseUrl}}/usuarios/{{usuarioId}}`

**Headers:** `Authorization: Bearer {{accessToken}}`

---

### 3.3 Crear usuario

**POST** `{{baseUrl}}/usuarios`

**Headers:** `Authorization: Bearer {{accessToken}}`  
**Content-Type:** `application/json`

**Body:**

```json
{
  "tipoDocumento": "CC",
  "numeroDocumento": "87654321",
  "nombres": "María",
  "apellidos": "García",
  "telefono": "3109876543",
  "direccion": "Carrera 5 #10-15",
  "password": "Password123!",
  "roles": ["AFILIADO"]
}
```

Roles válidos: `ADMIN`, `SECRETARIA`, `TESORERA`, `RECEPTOR_AGUA`, `AFILIADO`.

---

### 3.4 Actualizar usuario

**PATCH** `{{baseUrl}}/usuarios/{{usuarioId}}`

**Body (campos opcionales):**

```json
{
  "nombres": "María",
  "apellidos": "García López",
  "telefono": "3109876543",
  "direccion": "Nueva dirección",
  "activo": true
}
```

---

## 4. Historial Laboral

**Base:** `{{baseUrl}}/usuarios/{{usuarioId}}/historial-laboral`  
**Roles:** ADMIN, SECRETARIA, TESORERA (listar); ADMIN, SECRETARIA (crear)

### 4.1 Listar historial

**GET** `{{baseUrl}}/usuarios/{{usuarioId}}/historial-laboral`

---

### 4.2 Crear historial

**POST** `{{baseUrl}}/usuarios/{{usuarioId}}/historial-laboral`

**Body:**

```json
{
  "estado": "TRABAJANDO",
  "fechaInicio": "2024-01-01",
  "fechaFin": "2025-12-31"
}
```

`estado`: `TRABAJANDO` o `NO_TRABAJANDO`. `fechaFin` es opcional (null = vigente).

---

## 5. Tarifas

**Base:** `{{baseUrl}}/tarifas`  
**Roles:** ADMIN, SECRETARIA, TESORERA (listar); ADMIN, SECRETARIA (crear)

### 5.1 Listar tarifas

**GET** `{{baseUrl}}/tarifas`

---

### 5.2 Crear tarifa

**POST** `{{baseUrl}}/tarifas`

**Body:**

```json
{
  "estadoLaboral": "TRABAJANDO",
  "valorMensual": 15000,
  "fechaVigencia": "2024-01-01"
}
```

`estadoLaboral`: `TRABAJANDO` o `NO_TRABAJANDO`.

---

## 6. Deuda

**Base:** `{{baseUrl}}/usuarios/{{usuarioId}}/deuda`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO (AFILIADO solo su propia deuda)

### 6.1 Obtener deuda

**GET** `{{baseUrl}}/usuarios/{{usuarioId}}/deuda`

**GET** (con detalle por mes):  
`{{baseUrl}}/usuarios/{{usuarioId}}/deuda?detalle=true`

---

## 7. Estado General (para carta)

**Base:** `{{baseUrl}}/usuarios/{{usuarioId}}/estado-general`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO (AFILIADO solo sí mismo)

### 7.1 Obtener estado general

**GET** `{{baseUrl}}/usuarios/{{usuarioId}}/estado-general`

Devuelve: `deuda_junta`, `requisitos`, `pago_carta`.

---

## 8. Pagos

**Base:** `{{baseUrl}}/pagos`  
**Auth:** JWT + JuntaGuard

### 8.1 Pago efectivo JUNTA

**POST** `{{baseUrl}}/pagos`  
**Roles:** TESORERA, ADMIN, SECRETARIA

**Body (efectivo):**

```json
{
  "usuarioId": "UUID_DEL_USUARIO",
  "metodo": "EFECTIVO"
}
```

**Body (transferencia):**

```json
{
  "usuarioId": "UUID_DEL_USUARIO",
  "metodo": "TRANSFERENCIA",
  "referenciaExterna": "TRF-001-2025"
}
```

---

### 8.2 Pago CARTA (efectivo/transferencia)

**POST** `{{baseUrl}}/pagos/carta`  
**Roles:** TESORERA, ADMIN, SECRETARIA

**Body:**

```json
{
  "usuarioId": "UUID_DEL_USUARIO",
  "metodo": "EFECTIVO"
}
```

O con `"metodo": "TRANSFERENCIA"` y `"referenciaExterna": "..."`.

---

### 8.3 Intención pago JUNTA online

**POST** `{{baseUrl}}/pagos/online/intencion`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO

**Body:**

```json
{
  "usuarioId": "UUID_DEL_USUARIO"
}
```

Respuesta: `checkoutUrl` para redirigir a Wompi.

---

### 8.4 Intención pago CARTA online

**POST** `{{baseUrl}}/pagos/carta/online/intencion`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO

**Body:**

```json
{
  "usuarioId": "UUID_DEL_USUARIO"
}
```

---

### 8.5 Verificar pago online (tras retorno de Wompi)

**GET** `{{baseUrl}}/pagos/online/verificar?transaction_id=ID_TRANSACCION_WOMPI`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO

---

## 9. Requisitos

**Base:** `{{baseUrl}}/requisitos` y `{{baseUrl}}/usuarios/{{usuarioId}}/requisitos`  
**Roles:** ADMIN (CRUD tipo); varios (estado/obligación)

### 9.1 Listar requisitos tipo

**GET** `{{baseUrl}}/requisitos`  
**Roles:** ADMIN

---

### 9.2 Crear requisito tipo

**POST** `{{baseUrl}}/requisitos`  
**Roles:** ADMIN

**Body:**

```json
{
  "nombre": "Agua",
  "modificadorId": "UUID_USUARIO_RECEPTOR_AGUA_O_NULL",
  "tieneCorteAutomatico": true
}
```

---

### 9.3 Actualizar requisito tipo

**PATCH** `{{baseUrl}}/requisitos/{{requisitoTipoId}}`  
**Roles:** ADMIN

**Body:**

```json
{
  "nombre": "Agua",
  "modificadorId": "UUID_O_NULL",
  "tieneCorteAutomatico": true,
  "activo": true
}
```

---

### 9.4 Cambiar estado de requisito (por usuario)

**POST** `{{baseUrl}}/usuarios/{{usuarioId}}/requisitos/{{requisitoTipoId}}/estado`  
**Roles:** ADMIN, SECRETARIA, TESORERA, RECEPTOR_AGUA, AFILIADO

**Body:**

```json
{
  "estado": "AL_DIA"
}
```

`estado`: `AL_DIA` o `MORA`.

---

### 9.5 Cambiar obligación de requisito

**PATCH** `{{baseUrl}}/usuarios/{{usuarioId}}/requisitos/{{requisitoTipoId}}/obligacion`  
**Roles:** ADMIN

**Body:**

```json
{
  "obligacionActiva": false
}
```

---

## 10. Documentos

**Base:** `{{baseUrl}}/documentos`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO

### 10.1 Subir documento

**POST** `{{baseUrl}}/documentos`  
**Content-Type:** `multipart/form-data`

| Key | Type | Value |
|-----|------|-------|
| `usuarioId` | Text | UUID del usuario |
| `tipo` | Text | `RECIBO_AGUA` o `SOPORTE_CARTA` |
| `file` | File | Archivo (máx. 5 MB) |

---

### 10.2 Listar documentos de un usuario

**GET** `{{baseUrl}}/usuarios/{{usuarioId}}/documentos`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO (AFILIADO solo propios)

Respuesta: `{ "data": [ { "id", "tipo", "rutaS3", "fechaSubida" }, ... ] }`

---

### 10.3 Descargar documento

**GET** `{{baseUrl}}/documentos/{{documentoId}}/descargar`  
**Roles:** ADMIN, SECRETARIA, TESORERA, AFILIADO (AFILIADO solo propios)

Respuesta: `{ "data": { "url": "URL_FIRMADA_S3" } }`

---

## 11. Cartas

**Base:** `{{baseUrl}}/cartas`  
**Roles:** Según endpoint

### 11.1 Solicitar carta

**POST** `{{baseUrl}}/cartas/solicitar`  
**Roles:** ADMIN, SECRETARIA, AFILIADO

**Body:**

```json
{
  "usuarioId": "UUID_DEL_USUARIO"
}
```

---

### 11.2 Validar y aprobar carta

**POST** `{{baseUrl}}/cartas/{{cartaId}}/validar`  
**Roles:** ADMIN, SECRETARIA

Sin body.

---

## 12. Endpoint Público (sin auth)

### 12.1 Validar carta por QR

**GET** `{{baseUrl}}/public/validar-carta/{{qrToken}}`

Sin headers de auth. El `qrToken` se obtiene de una carta APROBADA.

---

## 13. Platform Admin (juntaId null)

**Base:** `{{baseUrl}}/platform/juntas`  
**Auth:** JWT + PlatformAdminGuard (rol PLATFORM_ADMIN)

### 13.1 Listar juntas

**GET** `{{baseUrl}}/platform/juntas?page=1&limit=20`

---

### 13.2 Obtener junta

**GET** `{{baseUrl}}/platform/juntas/{{juntaId}}`

---

### 13.3 Crear junta

**POST** `{{baseUrl}}/platform/juntas`

**Body:**

```json
{
  "nombre": "Junta Barrio Norte",
  "nit": "900654321",
  "montoCarta": 4000,
  "adminUser": {
    "nombres": "Ana",
    "apellidos": "López",
    "tipoDocumento": "CC",
    "numeroDocumento": "11223344",
    "telefono": "3201112233",
    "direccion": "Av 5 #20-30"
  }
}
```

---

### 13.4 Actualizar junta

**PATCH** `{{baseUrl}}/platform/juntas/{{juntaId}}`

**Body:**

```json
{
  "nombre": "Junta Barrio Norte Actualizado",
  "nit": "900654321",
  "montoCarta": 4500
}
```

---

## 14. Health

**GET** `{{baseUrl}}/health`

Sin auth. Verifica conectividad con la base de datos.

---

## 15. Códigos de Respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validación, token bootstrap, etc.) |
| 401 | Unauthorized (token inválido o expirado) |
| 403 | Forbidden (sin permiso para la acción) |
| 404 | Not Found |
| 409 | Conflict (ej. pago duplicado, bootstrap ya ejecutado) |
| 422 | Unprocessable Entity (lógica de negocio rechazada) |
| 429 | Too Many Requests (rate limit) |

---

## 16. Script Postman para guardar token

En la pestaña **Tests** del request de Login, añadir:

```javascript
if (pm.response.code === 200) {
  const json = pm.response.json();
  if (json.data && json.data.accessToken) {
    pm.environment.set("accessToken", json.data.accessToken);
  }
}
```

---

## 17. Orden de Prueba Sugerido

1. `GET /health` – Verificar que el backend responde.
2. `POST /bootstrap` – Si es primera vez (con `X-Bootstrap-Token`).
3. `POST /auth/login` – Con credenciales del admin de la junta.
4. `GET /auth/me` – Verificar token.
5. `GET /usuarios` – Listar usuarios.
6. `POST /usuarios` – Crear usuario AFILIADO.
7. `POST /usuarios/:id/historial-laboral` – Dar historial laboral.
8. `POST /tarifas` – Crear tarifa vigente.
9. `GET /usuarios/:id/deuda?detalle=true` – Ver deuda.
10. `POST /pagos` – Registrar pago efectivo JUNTA (si hay deuda).
11. `POST /requisitos` – Crear requisito tipo (ej. Agua).
12. `POST /usuarios/:id/requisitos/:rtId/estado` – Poner requisito AL_DIA.
13. `POST /pagos/carta` – Registrar pago CARTA.
14. `GET /usuarios/:id/estado-general` – Ver estado para carta.
15. `POST /cartas/solicitar` – Solicitar carta.
16. `POST /cartas/:id/validar` – Aprobar carta.
17. `GET /public/validar-carta/:qrToken` – Validar QR (copiar qrToken de la carta aprobada).
