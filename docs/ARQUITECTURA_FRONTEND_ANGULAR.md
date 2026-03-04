# Arquitectura Frontend Angular – Sistema JAC

**Versión:** 1.0  
**Objetivo:** Definir cómo se construye el frontend del sistema JAC usando Angular, alineado a los principios rectores y al backend NestJS.

---

## 1. Principios Rectores Aplicados al Frontend

El frontend **no es fuente de verdad**. Solo presenta datos y dispara acciones. Las reglas viven en el backend.

| Principio | Implicación en Frontend |
|-----------|-------------------------|
| Backend es fuente de verdad | No validar reglas críticas en frontend; solo UX. El backend rechaza lo inválido. |
| No confiar en juntaId del cliente | Nunca enviar `juntaId` en body/query; el JWT lo provee al backend. |
| Seguridad > Auditoría > Consistencia | JWT en todas las peticiones; refresh automático; guards por rol. |
| Multi-tenant lógico | Usuario ve solo datos de su junta (o catálogo si es Platform Admin). |
| Sin pagos parciales | UI no permite montos editables para pago JUNTA; solo "Pagar ahora" que dispara intención. |
| Modelo híbrido | Misma app para autogestión y gestión asistida; cambia según rol. |

---

## 2. Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Angular** | 19+ | Framework principal |
| **TypeScript** | 5.x | Lenguaje (obligatorio en Angular) |
| **Angular Material** | 19+ | Componentes UI (tablas, formularios, modales, etc.) |
| **Tailwind CSS** | 4.x | Layout, espaciado, responsividad |
| **HttpClient** | (incluido) | Peticiones HTTP (reemplaza Axios) |
| **RxJS** | (incluido) | Programación reactiva, manejo de estado |

**Integración Material + Tailwind (sin mezclar):**
- **Angular Material:** Componentes de negocio (tablas, formularios, dialogs, snackbars, steppers). Sin clases Tailwind en elementos Material.
- **Tailwind:** Solo en contenedores `div` para layout (grid, flex), espaciado (padding, margin), breakpoints, utilidades.
- **Regla:** Nunca poner clases Tailwind en `mat-*`. Envolver componentes Material en `div` con Tailwind para posicionar/dimensionar.

---

## 3. Estructura de Proyecto

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── core/                    # Singleton, app-wide
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── platform-admin.guard.ts
│   │   │   │   └── jwt.interceptor.ts
│   │   │   ├── api/
│   │   │   │   └── api.service.ts   # Base URL, HttpClient
│   │   │   └── layout/
│   │   │       └── layout.component.ts
│   │   ├── shared/                  # Componentes y pipes reutilizables
│   │   │   ├── components/
│   │   │   ├── pipes/
│   │   │   └── directives/
│   │   ├── features/
│   │   │   ├── auth/                # Login, logout
│   │   │   ├── platform/            # Panel Platform Admin
│   │   │   ├── usuarios/
│   │   │   ├── deuda/
│   │   │   ├── pagos/
│   │   │   ├── requisitos/
│   │   │   ├── cartas/
│   │   │   ├── documentos/
│   │   │   └── ...
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   ├── styles/
│   └── index.html
├── angular.json
├── tailwind.config.js
└── package.json
```

**Convención:** Cada feature agrupa componentes, servicios y rutas de un dominio. Core contiene servicios singleton (auth, API).

---

## 4. Rutas y Guards

### 4.1 Estructura de Rutas

| Ruta | Guard | Descripción |
|------|-------|-------------|
| `/login` | — | Público |
| `/platform` | PlatformAdminGuard | Panel Platform Admin (juntaId null, rol PLATFORM_ADMIN) |
| `/platform/juntas` | PlatformAdminGuard | Listado juntas |
| `/platform/juntas/nueva` | PlatformAdminGuard | Crear junta |
| `/platform/juntas/:id` | PlatformAdminGuard | Detalle/edición junta |
| `/` | AuthGuard | App de junta (usuarios con juntaId) |
| `/usuarios` | AuthGuard + RolGuard | ADMIN, SECRETARIA |
| `/usuarios/:id/deuda` | AuthGuard | Consulta deuda |
| `/pagos` | AuthGuard + RolGuard | TESORERA, ADMIN |
| `/requisitos` | AuthGuard | Requisitos adicionales |
| `/cartas` | AuthGuard | Solicitudes y validación |
| `/documentos` | AuthGuard | Subida y listado |
| `/perfil` | AuthGuard | Usuario actual |

### 4.2 Guards

- **AuthGuard:** Exige JWT válido. Si no hay token o expiró → redirect a `/login`.
- **PlatformAdminGuard:** Exige `juntaId === null` y rol `PLATFORM_ADMIN`. Si no → redirect a `/` o `/login`.
- **RolGuard (opcional):** Exige uno de los roles permitidos para la ruta.

---

## 5. Autenticación y HTTP

### 5.1 Flujo de Auth

1. **Login:** `POST /api/auth/login` con `tipoDocumento`, `numeroDocumento`, `password` (y `juntaId: "platform"` para Platform Admin).
2. **Respuesta:** `accessToken`, `refreshToken`, `expiresIn`, `user`.
3. **Almacenamiento:** `sessionStorage` (tokens se borran al cerrar pestaña; compatible con redirect de Wompi).
4. **Refresh:** Interceptor detecta 401 → llama `POST /api/auth/refresh` con `refreshToken` → reintenta request con nuevo `accessToken`.

### 5.2 Interceptor JWT

- Añade `Authorization: Bearer <accessToken>` a todas las peticiones a `/api/*`.
- Si respuesta 401: intentar refresh; si falla → logout y redirect a login.
- No enviar `juntaId` en headers ni body; el backend lo obtiene del token.

### 5.3 Servicio Auth

- `login(credenciales)`, `logout()`, `refresh()`, `getCurrentUser()`.
- `Observable<Usuario | null>` para estado del usuario actual.
- Métodos `isPlatformAdmin()`, `hasRole(rol)`.

---

## 6. Convenciones de API (Frontend)

Según `convencionesAPI.md`:

- **Base URL:** `environment.apiUrl` (ej. `http://localhost:3000/api`).
- **Respuesta exitosa:** `{ data: T, meta?: {...} }`.
- **Respuesta error:** `{ error: { code, message, details? }, meta? }`.
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`.
- **Paginación:** `?page=1&limit=20`; respuesta con `meta.page`, `meta.total`, etc.

El frontend debe tipar las respuestas y manejar códigos de error (`DEUDA_CERO`, `MONTO_INCORRECTO`, etc.) para mostrar mensajes adecuados.

---

## 7. Fases de Desarrollo del Frontend

Alineadas al ROADMAP y a la disponibilidad del backend.

### Fase 9.0 – Cimiento del Frontend Angular

**Objetivo:** Proyecto Angular configurado, auth y layout base.

- [ ] Crear proyecto Angular en `apps/frontend`.
- [ ] Configurar Angular Material + tema.
- [ ] Configurar Tailwind para layout.
- [ ] Estructura core: AuthService, AuthGuard, JWT Interceptor.
- [ ] Página de login funcional (POST /api/auth/login).
- [ ] Layout base: toolbar, sidenav (según rol).
- [ ] Variables de entorno: `apiUrl`.

**Criterio:** Login exitoso, token guardado, redirect según rol (platform vs junta).

---

### Fase 9.1 – Panel Platform Admin

**Objetivo:** Gestión de juntas desde panel Platform Admin.

- [ ] Rutas `/platform/*` con PlatformAdminGuard.
- [ ] Listado de juntas: tabla Material, GET /api/platform/juntas.
- [ ] Crear junta: formulario, POST /api/platform/juntas, mostrar credenciales temporales.
- [ ] Detalle/edición junta: GET/PATCH /api/platform/juntas/:id.
- [ ] (Opcional) Resumen por junta: GET /api/platform/juntas/:id/resumen.

**Criterio:** Platform Admin puede listar, crear y editar juntas; credenciales mostradas al crear.

---

### Fase 9.2 – Módulo Usuarios y Deuda

**Objetivo:** CRUD usuarios, historial laboral, consulta deuda.

- [ ] Listado usuarios: GET /api/usuarios (paginado).
- [ ] Crear/editar usuario: POST/PATCH /api/usuarios.
- [ ] Historial laboral: GET/POST /api/usuarios/:id/historial-laboral.
- [ ] Consulta deuda: GET /api/usuarios/:id/deuda (o /deuda?usuarioId=).
- [ ] Tarifas: GET/POST /api/tarifas (si aplica).

**Criterio:** ADMIN/SECRETARIA gestionan usuarios; deuda mostrada correctamente.

---

### Fase 9.3 – Módulo Pagos

**Objetivo:** Registro pagos efectivo, intención pago online.

- [ ] Registro pago efectivo JUNTA: POST /api/pagos (body: usuarioId, método EFECTIVO).
- [ ] Registro pago efectivo CARTA: POST /api/pagos/carta.
- [ ] Intención pago online: POST /api/pagos/online/intencion → redirect a Wompi.
- [ ] Verificación al retorno: GET /api/pagos/online/verificar.
- [ ] No enviar monto desde frontend para JUNTA; backend calcula.

**Criterio:** Pagos efectivos registrados; flujo online hasta redirect.

---

### Fase 9.4 – Requisitos Adicionales

**Objetivo:** Gestión de requisitos (agua, basura, etc.).

- [ ] Listado RequisitoTipo: GET /api/requisitos.
- [ ] CRUD RequisitoTipo (ADMIN): POST, PATCH /api/requisitos.
- [ ] Cambio estado: POST /api/usuarios/:id/requisitos/:requisitoTipoId/estado.
- [ ] Cambio obligación: PATCH /api/usuarios/:id/requisitos/:requisitoTipoId/obligacion.

**Criterio:** Modificadores y ADMIN gestionan requisitos por usuario.

---

### Fase 9.5 – Módulo Cartas y Documentos

**Objetivo:** Solicitud carta, validación, documentos.

- [ ] Estado general: GET /api/usuarios/:id/estado-general.
- [ ] Subida documento: POST /api/documentos.
- [ ] Listado documentos usuario: GET /api/usuarios/:id/documentos.
- [ ] Solicitar carta: POST /api/cartas/solicitar.
- [ ] Validar carta: POST /api/cartas/:id/validar (ADMIN/SECRETARIA).
- [ ] Descargar PDF: GET /api/documentos/:id/descargar.

**Criterio:** Flujo solicitud → validación → carta emitida con PDF.

---

### Fase 10 – Frontend Usuario (Autogestión)

**Objetivo:** Vistas para AFILIADO (consulta deuda, pago online, solicitud carta).

- [ ] Consulta deuda propia.
- [ ] Botón "Pagar ahora" → intención online.
- [ ] Subida documento (recibo agua, etc.).
- [ ] Solicitud de carta; seguimiento estado.
- [ ] Mismo backend; solo cambia quién ejecuta (usuario vs personal).

**Criterio:** Usuario puede consultar deuda, pagar online y solicitar carta sin asistencia.

---

## 8. Decisiones de Arquitectura (Definidas)

### 8.1 Almacenamiento de Tokens

**Decisión:** `sessionStorage`.

- Más seguro que localStorage (se borra al cerrar pestaña).
- **Compatible con Wompi:** El flujo de pago online usa redirect en la misma pestaña: usuario va a Wompi → paga → Wompi redirige de vuelta a nuestra app. Mientras sea la misma pestaña y mismo origen, `sessionStorage` persiste. No hay conflicto.
- Si el usuario cierra la pestaña durante el pago en Wompi, al volver deberá iniciar sesión de nuevo; el pago igual se registra vía webhook en backend.

### 8.2 Standalone vs NgModules

**Decisión:** Standalone (Angular 17+).

- Componentes autocontenidos; menos boilerplate; enfoque actual de Angular.

### 8.3 State Management

**Decisión:** Servicios + RxJS.

- `BehaviorSubject` para usuario actual y estado simple.
- Adecuado para este proyecto: multi-tenant, auditable, sin estado global complejo. NgRx añadiría complejidad innecesaria.

### 8.4 Tema Angular Material

**Decisión:** Tema custom con paleta de la marca JAC.

- Paleta: azul naval (#1976d2) como primary, teal (#00838f) como accent. (Detalle en `archive/PALETA_COLORES_JAC.md`.)
- Seria y profesional; adecuada para sistema institucional y financiero.
- Personalizable según identidad visual de cada junta.

### 8.5 Puerto del Frontend

**Decisión:** 4200 (por defecto de Angular).

- Backend debe tener `CORS_ORIGIN=http://localhost:4200` en desarrollo.

### 8.6 Estructura de Carpetas

**Decisión:** Feature-based (`features/usuarios`, `features/pagos`, etc.).

---

## 9. Referencias

| Documento | Contenido |
|-----------|------------|
| `plan.md` | Principios rectores, stack |
| `archive/PALETA_COLORES_JAC.md` | Paleta custom (azul naval, teal) |
| `00_ARQUITECTURA_RECTOR copy.md` | Multi-tenant, seguridad |
| `convencionesAPI.md` | Contrato API |
| `flujoBootstrapYOnboarding.md` | Panel Platform Admin |
| `ROADMAP.md` | Fases 9 y 10 |
| `POSTMAN_PRUEBAS_MANUALES.md` | Endpoints disponibles |

---

**Este documento es la fuente de verdad para la arquitectura del frontend Angular. Cualquier cambio debe reflejarse aquí.**
