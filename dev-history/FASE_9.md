# Fase 9 – Frontend administrativo (Angular)

**Fecha:** 2025-02-14  
**Objetivo:** Gestión por secretaría, tesorería, modificadores de requisitos, admin; y panel de Platform Admin.

---

## Resumen del trabajo

Se implementó el frontend Angular 19 completo con Angular Material y Tailwind, cubriendo todas las fases 9.0–9.5 del roadmap: cimiento, Platform Admin, Usuarios y Deuda, Pagos, Requisitos Adicionales, Cartas y Documentos.

---

## Cambios realizados

### 9.0 Cimiento (previamente)

- Proyecto Angular 19 en `apps/frontend`
- Angular Material + Tailwind configurados
- AuthService, AuthGuard, PlatformAdminGuard, JWT Interceptor
- Login funcional, layout base (toolbar, sidenav según rol)

### 9.1 Panel Platform Admin

- Rutas: `/platform/juntas`, `/platform/juntas/nueva`, `/platform/juntas/:id`
- Listado de juntas con tabla Material y paginador
- Crear junta: formulario con datos admin inicial; muestra credenciales temporales tras crear
- Detalle/edición de junta: ver y editar nombre, NIT, monto carta
- Platform component con `router-outlet` para rutas hijas

### 9.2 Módulo Usuarios y Deuda

- Listado usuarios (`/usuarios`), crear (`/usuarios/nuevo`), detalle (`/usuarios/:id`)
- Formulario crear/editar usuario (roles, contraseña en creación)
- Detalle usuario con pestañas:
  - **Deuda:** consulta deuda calculada con detalle por mes
  - **Historial laboral:** listar y agregar registros (TRABAJANDO/NO_TRABAJANDO)
  - **Requisitos:** estado y obligación por requisito
  - **Cartas:** estado general, solicitar carta, listar cartas del usuario
  - **Documentos:** subir y listar documentos (RECIBO_AGUA, SOPORTE_CARTA)
- Tarifas: listado y creación (`/tarifas`)

### 9.3 Módulo Pagos

- Página `/pagos`:
  - Registrar pago efectivo JUNTA (usuario, método EFECTIVO/TRANSFERENCIA)
  - Registrar pago carta efectivo
  - Crear intención pago online JUNTA/CARTA (redirección a Wompi)
- Página `/pagos/retorno`: verificación de pago al retorno de Wompi

### 9.4 Requisitos Adicionales

- Página `/requisitos`: listado RequisitoTipo, crear nuevo
- En detalle usuario: pestaña Requisitos con cambio de estado (AL_DIA/MORA) y obligación (exentar/activar)
- Backend: `requisitoTipoId` añadido a respuesta de estado general

### 9.5 Módulo Cartas y Documentos

- Página `/cartas`: listado cartas pendientes, botón Validar
- En detalle usuario: pestaña Cartas (estado general, solicitar, listar cartas)
- En detalle usuario: pestaña Documentos (subir, listar, descargar)
- Backend: `GET /cartas?usuarioId=` y `GET /cartas?estado=PENDIENTE`

### Backend adicional

- `GET /cartas`: listar por usuario o pendientes (estado=PENDIENTE)
- Estado general: incluye `requisitoTipoId` en cada requisito para actualizaciones

---

## Estructura de rutas

| Ruta | Guard | Descripción |
|------|-------|-------------|
| `/login` | — | Público |
| `/` | AuthGuard | Dashboard |
| `/usuarios` | AuthGuard | Listado usuarios |
| `/usuarios/nuevo` | AuthGuard | Crear usuario |
| `/usuarios/:id` | AuthGuard | Detalle usuario |
| `/pagos` | AuthGuard | Pagos |
| `/pagos/retorno` | AuthGuard | Retorno Wompi |
| `/requisitos` | AuthGuard | Requisitos tipo |
| `/cartas` | AuthGuard | Cartas pendientes |
| `/tarifas` | AuthGuard | Tarifas |
| `/platform/juntas` | PlatformAdminGuard | Listado juntas |
| `/platform/juntas/nueva` | PlatformAdminGuard | Crear junta |
| `/platform/juntas/:id` | PlatformAdminGuard | Detalle junta |

---

## Reglas transversales

- Todas las llamadas con JWT; nunca enviar `juntaId` en body
- No enviar montos de pago desde frontend para JUNTA; backend calcula
- Tailwind solo en contenedores `div`; nunca en componentes `mat-*`

---

## Referencias

- ROADMAP.md Fase 9
- ARQUITECTURA_FRONTEND_ANGULAR.md
- definicionDomainServices.md
- flujoRequisitosAdicionales.md
- flujoSolicitudCarta.md
