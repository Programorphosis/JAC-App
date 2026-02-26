# Flujo de Bootstrap y Onboarding de Juntas – Sistema JAC

**Versión:** 1.1  
**Objetivo:** Inicialización del sistema, Platform Admin y creación/administración básica de juntas (Modelo B: onboarding manual con panel).

---

## 1. Modelo de Negocio

**Modelo B: Onboarding Manual con Platform Admin**

- Las juntas se acercan al proveedor del sistema.
- El proveedor usa un **panel de Platform Admin** (UI sencilla) para crear juntas y administrarlas.
- Endpoints de plataforma protegidos por rol **PLATFORM_ADMIN**.
- Se entregan credenciales al admin inicial de cada junta.
- Esencial para multi-tenant desde el inicio; la complejidad se puede aumentar después.

---

## 2. Platform Admin

### 2.1 Concepto

- **Usuario con rol PLATFORM_ADMIN:** no pertenece a ninguna junta (`juntaId = null`).
- Solo puede acceder a rutas de plataforma (`/api/platform/*`).
- No accede a datos de una junta concreta; gestiona el catálogo de juntas.
- Se crea en el bootstrap (primera vez).

### 2.2 Schema

- **Rol:** `PLATFORM_ADMIN` añadido al enum `RolNombre`.
- **Usuario:** `juntaId` es opcional (`String?`). Si es `null`, el usuario es platform admin.
- Resto de usuarios siempre tienen `juntaId` asignado.

### 2.3 Autenticación

- Mismo JWT que el resto (userId, juntaId, roles).
- Para platform admin: `juntaId` viene como `null`, `roles` incluye `PLATFORM_ADMIN`.
- Guard: rutas `/api/platform/*` exigen rol `PLATFORM_ADMIN`; el resto exige `juntaId` y no permite `PLATFORM_ADMIN` como único rol para acceder a datos de junta.

---

## 3. Bootstrap (Primera Vez)

### 3.1 Objetivo

Inicializar el sistema cuando está vacío: roles base, primera junta y **primer usuario Platform Admin**.

### 3.2 Proceso

1. **Migración de roles:** Crea los 6 roles:
   - PLATFORM_ADMIN
   - ADMIN
   - SECRETARIA
   - TESORERA
   - RECEPTOR_AGUA
   - AFILIADO

2. **Bootstrap:** `POST /api/bootstrap`
   - **Condición:** Solo si `count(juntas) === 0`.
   - **Protección:** Token de entorno `BOOTSTRAP_TOKEN` en header `X-Bootstrap-Token` (recomendado).
   - **Body (ejemplo):**
     ```json
     {
       "platformAdmin": {
         "nombres": "Admin",
         "apellidos": "Plataforma",
         "tipoDocumento": "CC",
         "numeroDocumento": "00000000",
         "password": "contraseña-segura-inicial"
       },
       "primeraJunta": {
         "nombre": "Junta de Acción Comunal Barrio X",
         "nit": "123456789",
         "montoCarta": 3000,
         "adminUser": {
           "nombres": "Juan",
           "apellidos": "Pérez",
           "tipoDocumento": "CC",
           "numeroDocumento": "12345678",
           "telefono": "3001234567",
           "direccion": "Calle 123 #45-67"
         }
       }
     }
     ```

3. **Proceso interno:**
   - Crear usuario Platform Admin (`juntaId = null`, rol PLATFORM_ADMIN).
   - Llamar a `JuntaService.createJunta(...)` para la primera junta.
   - Generar contraseña temporal para el admin de la junta.
   - Registrar auditoría.

4. **Respuesta:**
   - Credenciales del platform admin (para acceder al panel).
   - Credenciales del admin de la primera junta (para entregar a la junta).

5. **Después del bootstrap:** Toda nueva junta se crea desde el **panel de Platform Admin** (o, si se desea, desde un script CLI de respaldo).

---

## 4. Endpoints de Plataforma (Protegidos)

Base: `/api/platform`. Todos exigen JWT con rol `PLATFORM_ADMIN`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/platform/juntas | Listar juntas (paginado). Filtros opcionales. |
| GET | /api/platform/juntas/:id | Detalle de una junta (nombre, nit, montoCarta, fechas, conteos básicos). |
| POST | /api/platform/juntas | Crear junta + admin inicial. Body: nombre, nit?, montoCarta?, adminUser: {...}. |
| PATCH | /api/platform/juntas/:id | Edición básica: nombre, nit, montoCarta, activo (si se define). |
| GET | /api/platform/juntas/:id/resumen | Resumen básico (cantidad usuarios, pagos recientes, etc.) para el panel. |

**Creación de junta (POST /api/platform/juntas):**

- Llama a `JuntaService.createJunta(...)`.
- Genera contraseña temporal para el admin.
- Respuesta incluye credenciales temporales para entregar a la junta.
- Auditoría con `ejecutadoPorId` = platform admin.

---

## 5. Panel de Platform Admin (UI Sencilla)

### 5.1 Alcance Mínimo

- **Login:** Mismo flujo de auth; usuario con rol PLATFORM_ADMIN y `juntaId` null.
- **Ruta base:** `/platform` (o `/admin`). Solo accesible si el usuario es PLATFORM_ADMIN.
- **Vistas:**
  1. **Listado de juntas:** Tabla con nombre, NIT, monto carta, fecha creación, estado (activo). Acción “Ver” / “Editar”.
  2. **Crear junta:** Formulario con nombre, NIT, monto carta, datos del admin inicial (nombres, apellidos, documento, tipo doc, teléfono, dirección). Botón “Crear” → llama a `POST /api/platform/juntas`. Mostrar credenciales temporales al crear.
  3. **Detalle / Edición de junta:** Ver datos básicos y opcionalmente editar nombre, NIT, monto carta (y activo si se implementa).
  4. **Resumen (opcional):** Por junta, cifras básicas (número de usuarios, pagos del mes, etc.) para apoyo operativo.

### 5.2 Tecnología

- Misma app Angular (Angular Material, Tailwind) que el resto.
- Rutas bajo `/platform/*` con guard que compruebe rol PLATFORM_ADMIN.
- Si el usuario no es platform admin, redirigir a la app normal de junta o a login.
- Referencia: `ARQUITECTURA_FRONTEND_ANGULAR.md`.

### 5.3 Sin complejidad extra por ahora

- No gestión de usuarios por junta desde el panel (eso lo hace cada ADMIN de junta).
- No facturación ni métricas avanzadas.
- Solo lo necesario: listar, crear, editar básico y ver resumen sencillo.

---

## 6. Arquitectura de Creación de Juntas

### 6.1 Servicio Reutilizable

`JuntaService.createJunta(params)` (Application layer):

- Crea Junta.
- Crea Usuario admin (con `juntaId` de la junta, rol ADMIN).
- Asigna rol ADMIN.
- Configura `montoCarta` si se proporciona.
- Retorna junta y usuario creados.

**Usado por:**
- Bootstrap (primera junta).
- `POST /api/platform/juntas` (panel).
- Opcional: script CLI de respaldo.

---

## 7. Flujo Operativo Completo

```
┌─────────────────────────────────────────────────────────┐
│ 1. DESPLIEGUE INICIAL                                   │
│    - Migración crea roles (incl. PLATFORM_ADMIN)        │
│    - Sistema vacío (0 juntas)                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. BOOTSTRAP (Una sola vez)                             │
│    POST /api/bootstrap (con token de entorno)           │
│    → Crea usuario Platform Admin (juntaId = null)       │
│    → Crea primera junta + admin de esa junta            │
│    → Entrega credenciales a proveedor y a la junta      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. USO DIARIO – PLATFORM ADMIN                          │
│    - Proveedor inicia sesión en /platform               │
│    - Lista juntas, crea nuevas, edita datos básicos     │
│    - Al crear junta: recibe credenciales temporales    │
│      y se las entrega a la junta                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. A FUTURO                                             │
│    - Más métricas, más campos editables                 │
│    - Auto-registro con aprobación, etc.                 │
└─────────────────────────────────────────────────────────┘
```

---

## 7.1 Pasos de configuración inicial para junta nueva

Cuando se crea una junta (bootstrap o panel Platform Admin), el ADMIN de la junta debe configurar lo siguiente antes de que la operación sea plena:

| Paso | Configuración | Obligatorio | Dónde |
|------|---------------|------------|-------|
| 1 | **Tarifas** | Sí | TESORERA: módulo Tarifas. Crear al menos una tarifa por estado laboral (TRABAJANDO, NO_TRABAJANDO) con fechaVigencia vigente. Sin tarifa, el cálculo de deuda falla con `SinTarifaVigenteError`. |
| 2 | **montoCarta** | Sí (si se emiten cartas) | Junta: monto por emisión de carta. Configurable al crear junta o en edición. |
| 3 | **Requisitos adicionales** | No | ADMIN: módulo Requisitos. Crear RequisitoTipo (agua, basura, etc.) según necesidad. Si no hay requisitos, la validación de carta no los exige. |
| 4 | **vigenciaCartaMeses** | No | Junta: meses de vigencia de la carta emitida. Por defecto 3. |

**Mensajes al usuario:** Si la junta no tiene tarifas vigentes, el dashboard, pagos y deuda muestran mensaje "Configure las tarifas" con enlace al módulo Tarifas. Ver `tieneTarifas` en GET /mi-junta.

**Referencia:** `CHECKLIST_OPERACION_JUNTAS.md` §2.2, `calculadoraDeDeuda.md`, `flujoRequisitosAdicionales.md`.

---

## 8. Seguridad

### 8.1 Bootstrap

- Solo si no hay juntas.
- Protegido con `BOOTSTRAP_TOKEN` en header.
- Registrar auditoría.

### 8.2 Platform Admin

- Endpoints `/api/platform/*` solo con JWT y rol PLATFORM_ADMIN.
- Front: rutas `/platform` solo para usuarios con PLATFORM_ADMIN.
- Usuarios con junta no acceden a datos de otras juntas; platform admin no accede a datos operativos de una junta (pagos, cartas, etc.) salvo resumen básico si se implementa.

### 8.3 Credenciales de Juntas

- Contraseña temporal segura al crear admin de junta.
- Opcional: forzar cambio en primer login o link de activación.

---

## 9. Auditoría

Eventos a registrar (entre otros):

- Creación de junta: `entidad: "Junta"`, `accion: "CREACION_JUNTA"`, `juntaId` = nueva junta, `ejecutadoPorId` = platform admin (o null en bootstrap).
- Edición de junta: `accion: "ACTUALIZACION_JUNTA"`, `ejecutadoPorId` = platform admin.

---

## 10. Checklist de Implementación

- [ ] Migración: roles base (incl. PLATFORM_ADMIN) y `Usuario.juntaId` opcional.
- [ ] Servicio `JuntaService.createJunta(...)` reutilizable.
- [ ] Bootstrap: `POST /api/bootstrap` (crea platform admin + primera junta).
- [ ] Endpoints: GET/POST/PATCH /api/platform/juntas, GET /api/platform/juntas/:id.
- [ ] Guard: solo PLATFORM_ADMIN en rutas /api/platform.
- [ ] Panel: login, listado juntas, crear junta, editar junta (y opcional resumen).
- [ ] Generación de contraseñas temporales seguras.
- [ ] Auditoría de creación/edición de juntas.
- [ ] (Opcional) Script CLI `seed:create-junta` como respaldo.

---

## 11. Resumen

| Elemento | Decisión |
|----------|----------|
| Creación de juntas | Desde panel Platform Admin (endpoint protegido). |
| Quién crea | Usuario con rol PLATFORM_ADMIN (`juntaId = null`). |
| UI | Panel sencillo en la misma app: listar, crear, editar básico. |
| Bootstrap | Crea platform admin + primera junta; después todo por panel. |
| Escalabilidad | Mantener servicio `createJunta` y añadir más pantallas o flujos cuando haga falta. |

---

**Referencias:** `plan.md`, `00_ARQUITECTURA_RECTOR copy.md`, `SCHEMA BASE v1.md`, `convencionesAPI.md`.
