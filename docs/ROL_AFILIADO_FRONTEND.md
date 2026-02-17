# Rol AFILIADO – Especificación Completa Frontend

**Documento oficial** – Todo lo que un usuario con rol AFILIADO puede y debe hacer en la aplicación.  
Referencias: `flujoDePagos.md`, `flujoSolicitudCarta.md`, `ARQUITECTURA_FRONTEND_ANGULAR.md` Fase 10.

---

## 1. Principio del rol

El AFILIADO es un miembro de la junta que **solo puede pagar online** (Wompi). No registra pagos en efectivo ni transferencia; eso lo hace TESORERA/SECRETARIA. Su flujo es **autónomo y digital**.

---

## 2. Acceso y menú

| Elemento | Visible | Ruta |
|----------|---------|------|
| Inicio | ✓ | `/` |
| Mi cuenta | ✓ | `/usuarios/:myId` |
| Usuarios (listado) | ✗ | — |
| Pagos (módulo tesorería) | ✗ | — |
| Requisitos (config) | ✗ | — |
| Cartas (pendientes admin) | ✗ | — |
| Tarifas | ✗ | — |

**Sidebar:** Solo "Inicio" y "Mi cuenta".

---

## 3. Mi cuenta – Pestañas y permisos

### 3.1 Tab Deuda

**Qué ve:**
- Total de deuda calculada (suma de cuotas según historial laboral y tarifas).
- Detalle por mes (año-mes, estado laboral, tarifa aplicada).

**Qué puede hacer:**
- **Si deuda > 0:** Botón **"Pagar deuda online"**.
  - Llama `POST /pagos/online/intencion` con `{ usuarioId: myId }`.
  - Backend devuelve `{ checkoutUrl, referencia, monto }`.
  - Redirigir a `checkoutUrl` (Wompi).
  - Wompi redirige de vuelta a `/pagos/retorno?transaction_id=xxx`.
- **Si deuda = 0:** Mensaje "Sin deuda. Está al día con la junta."

**Estado actual:** ✓ Implementado (botón "Pagar deuda online" cuando deuda > 0).

---

### 3.2 Tab Historial laboral

**Qué ve:**
- Lista de registros (estado, fecha inicio, fecha fin).
- Solo lectura.

**Qué puede hacer:**
- Nada. No puede crear ni editar historial (solo ADMIN/SECRETARIA).

**Estado actual:** ✓ Correcto (solo lectura).

---

### 3.3 Tab Pagos (historial de pagos)

**Qué ve:**
- Lista de sus pagos (fecha, tipo, método, monto, consecutivo).
- Solo lectura. No puede registrar pagos en efectivo (eso lo hace TESORERA).

**Qué puede hacer:**
- Nada. Solo consultar su historial.

**Estado actual:** ✓ Implementado (tab visible solo para AFILIADO en Mi cuenta).

---

### 3.4 Tab Requisitos

**Qué ve:**
- Estado de cada requisito (nombre, estado AL_DIA/MORA, obligación activa).
- Solo lectura. No puede cambiar estados (eso lo hace el modificador o ADMIN).

**Qué puede hacer:**
- Nada. Solo consultar.

**Estado actual:** ✓ Correcto.

---

### 3.5 Tab Cartas (Estado para carta)

**Qué ve:**
- **Deuda junta:** monto o "Sin deuda".
- **Pago carta:** Sí / No.
- **Requisitos:** lista con estado de cada uno.
- **Cartas del usuario:** tabla (estado, fecha solicitud, consecutivo).
- Botón **"Solicitar carta"** solo si cumple todas las condiciones.

**Condiciones para solicitar carta:**
1. `deuda_junta === 0`
2. `pago_carta === true`
3. Todos los requisitos con `obligacionActiva === true` deben tener `estado === 'AL_DIA'`.
4. No tener carta en estado PENDIENTE.

**Qué puede hacer según estado:**

| Situación | Acción |
|-----------|--------|
| `deuda_junta > 0` | Mostrar: "Debe pagar su deuda de la junta antes de solicitar carta." + **Botón "Pagar deuda online"** (mismo flujo que tab Deuda). |
| `pago_carta === false` | Mostrar: "Debe pagar la carta." + **Botón "Pagar carta online"** → `POST /pagos/carta/online/intencion`. |
| Requisitos no al día | Mostrar cuáles: "Agua: en Mora. Debe regularizar con la junta." (el modificador marca AL_DIA). |
| Carta PENDIENTE | Mensaje: "Tiene una carta pendiente de validación." Sin botón solicitar. |
| Cumple todo | **Botón "Solicitar carta"** → `POST /cartas/solicitar`. |
| Carta APROBADA | Sección destacada **"Su carta laboral está lista"** con botón **"Descargar PDF"**. También en tabla "Mis cartas". Dashboard muestra aviso y enlace directo. |

**Estado actual:**
- ✓ Muestra estado.
- ✓ Botón "Solicitar carta" cuando cumple.
- ✓ Botón "Pagar deuda online" cuando deuda > 0.
- ✓ Botón "Pagar carta online" cuando !pago_carta.
- ✓ Mensajes claros sobre qué falta (deuda, pago carta, requisitos, carta pendiente).
- ✓ Descarga de PDF de carta aprobada (endpoint GET /cartas/:id/descargar).

---

### 3.6 Tab Documentos

**Qué ve:**
- Lista de documentos subidos (tipo, fecha).
- Opción de subir (recibo agua, soporte carta).

**Qué puede hacer:**
- Subir documentos **solo para sí mismo** (RECIBO_AGUA, SOPORTE_CARTA).
- Descargar sus propios documentos.

**Estado actual:** ✓ Correcto.

---

## 4. Flujo de pago online (Wompi)

### 4.1 Pago deuda junta

1. Usuario en Mi cuenta → Deuda o Cartas.
2. Clic en "Pagar deuda online".
3. Frontend: `POST /pagos/online/intencion` con `{ usuarioId }`.
4. Backend: calcula deuda, crea intención en Wompi, devuelve `checkoutUrl`.
5. Frontend: `window.location.href = checkoutUrl`.
6. Usuario paga en Wompi.
7. Wompi redirige a: `{APP_URL}/pagos/retorno?transaction_id=xxx` (configurar en Wompi).
8. Página retorno: `GET /pagos/online/verificar?transaction_id=xxx`.
9. Backend: consulta Wompi, si APPROVED registra pago.
10. Mostrar resultado (éxito/error).
11. **"Volver"** → redirigir a **Mi cuenta** (`/usuarios/:myId`), no a `/pagos`.

**Estado actual:**
- ✓ Botón "Pagar deuda online" implementado.
- ✓ Página retorno: "Volver" va a Mi cuenta cuando AFILIADO (o usuario sin acceso a /pagos).

### 4.2 Pago carta

1. Usuario en Mi cuenta → Cartas.
2. Clic en "Pagar carta online".
3. Frontend: `POST /pagos/carta/online/intencion` con `{ usuarioId }`.
4. Backend: usa `Junta.montoCarta`, crea intención, devuelve `checkoutUrl`.
5. Mismo flujo 5–11 que pago deuda.

**Estado actual:** ✓ Implementado (botón "Pagar carta online" en tab Cartas).

---

## 5. Página de retorno (`/pagos/retorno`)

**Requisitos:**
- Ruta accesible sin guard de Pagos (o con guard que permita AFILIADO tras pago).
- Recibir `transaction_id` por query.
- Llamar `GET /pagos/online/verificar?transaction_id=xxx`.
- Mostrar: "Pago registrado correctamente" o mensaje de error.
- Botón **"Volver a Mi cuenta"** → `/usuarios/:myId` (usando `auth.currentUser().id`).

**Estado actual:** ✓ "Volver" navega a Mi cuenta para AFILIADO.

---

## 6. Inicio (Dashboard)

**Para AFILIADO:**
- Mensaje de bienvenida.
- Resumen rápido: "Su deuda: $X" o "Sin deuda".
- "Estado para carta: puede solicitar" / "Debe pagar deuda" / "Debe pagar carta" / etc.
- Enlace a "Ir a Mi cuenta".

**Estado actual:** ✓ Dashboard con resumen para AFILIADO (deuda, estado carta, enlace a Mi cuenta).

---

## 7. Checklist de implementación frontend

### 7.1 Tab Deuda (`usuario-deuda`)

- [x] Si `deuda.total > 0`: mostrar botón "Pagar deuda online".
- [x] Al clic: llamar `PagosService.crearIntencionOnline(usuarioId)`.
- [x] Redirigir a `result.checkoutUrl`.
- [x] Manejar errores (ej. DEUDA_CERO, usuario no encontrado).

### 7.2 Tab Cartas (`usuario-cartas`)

- [x] Si `deuda_junta > 0`: mensaje claro + botón "Pagar deuda online" (reutilizar lógica).
- [x] Si `!pago_carta`: mensaje "Debe pagar la carta" + botón "Pagar carta online".
- [x] Al clic "Pagar carta online": `PagosService.crearIntencionCartaOnline(usuarioId)` → redirect.
- [x] Si requisitos no OK: listar cuáles faltan (ej. "Agua: en Mora").
- [x] Mantener botón "Solicitar carta" cuando `puedeSolicitar()`.
- [x] Si carta APROBADA: botón "Descargar PDF" (endpoint GET /cartas/:id/descargar).

### 7.3 Página Retorno (`pagos-retorno`)

- [x] Cambiar "Volver" para que vaya a `/usuarios/:myId` (usando `auth.currentUser().id`).
- [x] Si usuario no puede ver `/pagos`, nunca redirigir ahí.

### 7.4 Dashboard

- [x] Para AFILIADO: mostrar resumen (deuda, estado carta) y enlace a Mi cuenta.

### 7.5 Rutas y guards

- [x] `/pagos/retorno` accesible por AFILIADO (sin `pagosGuard`).

---

## 8. Endpoints backend que usa AFILIADO

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/usuarios/:id` | Ver su perfil (id = propio) |
| GET | `/usuarios/:id/deuda` | Consultar deuda |
| GET | `/usuarios/:id/estado-general` | Estado para carta |
| GET | `/usuarios/:id/historial-laboral` | Ver historial |
| GET | `/usuarios/:id/documentos` | Listar documentos |
| POST | `/documentos` | Subir documento (propio) |
| GET | `/documentos/:id/descargar` | Descargar documento |
| GET | `/cartas?usuarioId=xxx` | Listar sus cartas |
| POST | `/pagos/online/intencion` | Crear intención pago JUNTA |
| POST | `/pagos/carta/online/intencion` | Crear intención pago CARTA |
| GET | `/pagos/online/verificar` | Verificar pago tras retorno Wompi |
| GET | `/pagos/mi-historial` | Ver historial de pagos propio (solo lectura) |
| POST | `/cartas/solicitar` | Solicitar carta |
| GET | `/cartas/:id/descargar` | Obtener URL firmada para descargar PDF de carta aprobada |

**Todos validan que AFILIADO solo actúe sobre sí mismo cuando aplica.**

---

## 9. Resumen de implementación (completado)

| # | Elemento | Estado |
|---|----------|--------|
| 1 | Botón "Pagar deuda online" en tab Deuda | ✓ |
| 2 | Botón "Pagar deuda online" en tab Cartas cuando deuda > 0 | ✓ |
| 3 | Botón "Pagar carta online" en tab Cartas cuando !pago_carta | ✓ |
| 4 | Página retorno: "Volver" → Mi cuenta (no /pagos) | ✓ |
| 5 | Mensajes claros cuando no puede solicitar (qué falta) | ✓ |
| 6 | Dashboard con resumen para AFILIADO | ✓ |
| 7 | Descargar PDF de carta aprobada (backend + frontend) | ✓ |

---

## 10. Flujo completo AFILIADO (caso feliz)

1. Login → Inicio.
2. Clic "Mi cuenta" → `/usuarios/:myId`.
3. Tab Deuda: ve total. Si > 0 → "Pagar deuda online" → Wompi → paga → retorno → "Pago registrado".
4. Tab Cartas: si ya pagó deuda pero no carta → "Pagar carta online" → Wompi → paga → retorno.
5. Tab Cartas: si deuda=0, pago_carta=true, requisitos OK → "Solicitar carta".
6. Carta queda PENDIENTE. Secretaria valida.
7. Cuando APROBADA: (futuro) descargar PDF.

---

*Documento creado para asegurar que el rol AFILIADO quede completo antes de continuar con otros roles.*
