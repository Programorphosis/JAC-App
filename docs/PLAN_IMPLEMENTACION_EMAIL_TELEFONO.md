# Plan de implementación: Email y teléfono – unicidad, validación y verificación

**Objetivo:** Implementar todas las fases del análisis (`ANALISIS_EMAIL_TELEFONO_UNICIDAD_VALIDACION.md`) de una vez, incluyendo la Fase 5 (verificación de correo).

---

## 1. Verificación del estado actual (revisión 2026-03-03)

### 1.1 Prisma – Usuario y Junta

| Campo | Modelo | Estado actual | Índices |
|-------|--------|---------------|---------|
| email | Usuario | `String?` | `@@index([email])` – NO unique |
| telefono | Usuario | `String?` | Ninguno |
| email | Junta | `String?` | Ninguno |
| telefono | Junta | `String?` | Ninguno |

### 1.2 Flujos de creación/actualización

**Junta – Crear:**
- `CreateJuntaParams` / `CreateJuntaPlatformDto` / `BootstrapPrimeraJuntaDto`: **no incluyen** email ni telefono.
- `junta.service.createJunta`: crea junta sin email/telefono (solo nombre, nit, montoCarta, terminos).
- **junta-form (Platform):** tiene campos telefono/email en el HTML, pero en modo creación **no los envía** en el body (solo envía nombre, nit, montoCarta, planId, diasPrueba, aceptoTerminos, adminUser).

**Junta – Actualizar:**
- Platform `actualizar`: acepta telefono, email. Funciona.
- Mi-junta `actualizarDatos`: acepta telefono, email. Funciona.
- Ambos permiten null (no obligatorios).

**Usuario – Crear:**
- `CreateUserDto`: tiene `telefono`, **no tiene** `email`.
- `users.service.crear`: guarda telefono sin validación de unicidad ni formato.

**Usuario – Actualizar:**
- `UpdateUserDto`: tiene `telefono`, **no tiene** `email`.
- Sin validación de unicidad ni formato de teléfono.

**Usuario – Email:**
- Se guarda en `auth.service.cambiarPassword` cuando `requiereCambioPassword=true`.
- **No se valida unicidad** antes de guardar.
- Recuperación usa `findFirst` por email → si hay duplicados, ambigüedad.

### 1.3 Discrepancias detectadas

1. **junta-form (crear):** Los campos telefono/email existen pero no se envían al backend. Hay que añadirlos al body emitido y al DTO.
2. **Bootstrap:** No pide email/telefono para la junta. Si hacemos Junta obligatorios, el bootstrap debe incluirlos (o valores por defecto para la primera junta).
3. **CodigoRecuperacion:** Ya existe. Para Fase 5 (verificación de correo) podemos reutilizar el mismo modelo o crear uno específico para verificación de email (ej. `CodigoVerificacionEmail`). El análisis sugiere reutilizar el flujo similar a recuperación.

---

## 2. Alcance acordado

### Usuario
- Email y telefono **nullable**.
- Al agregar/modificar: validar unicidad.
- Email: `@@unique([email])` global.
- Telefono: único por junta (validación en app o partial unique index).
- Normalización: email `trim().toLowerCase()`, telefono E.164 Colombia.

### Junta
- Email y telefono **obligatorios** al crear.
- Migración para juntas existentes con null (rellenar con placeholder o exigir actualización).

### Fase 5 – Verificación de correo
- Campo `emailVerificado Boolean @default(false)` en Usuario.
- Flujo: usuario ingresa email → se envía código → usuario confirma → se guarda email + `emailVerificado=true`.
- Integrar en: cambiar contraseña (primer login), crear/editar usuario (si se añade email al DTO).

---

## 3. Orden de implementación

### Fase 1: Junta – email y telefono obligatorios

1. **Migración Prisma:** Hacer `Junta.email` y `Junta.telefono` obligatorios.
   - Si hay juntas con null: migración en dos pasos o script que rellene `"pendiente@junta.local"` / `"+570000000000"` antes de NOT NULL.
2. **CreateJuntaParams:** Añadir `email: string`, `telefono: string` obligatorios.
3. **CreateJuntaPlatformDto / BootstrapPrimeraJuntaDto:** Añadir email, telefono con validación.
4. **junta.service.createJunta:** Pasar email y telefono al `tx.junta.create`.
5. **junta-form (crear):** Incluir telefono y email en el body emitido; hacerlos obligatorios (Validators.required).
6. **Bootstrap:** Añadir email y telefono a `primeraJunta` en el DTO y en la llamada a createJunta. Para bootstrap inicial, se pueden pedir en el body o usar valores por defecto si el flujo es script/API.

### Fase 2: Usuario – unicidad y validación

7. **Prisma Usuario:** `@@unique([email])`. Migración.
8. **Utilidad:** `normalizarTelefonoColombia()`, `validarTelefonoColombia()` en `validacion-telefono.util.ts`.
9. **auth.service.cambiarPassword:** Validar unicidad de email antes de guardar; normalizar.
10. **users.service:** Validar unicidad email (si se añade al DTO) y telefono por junta; normalizar.
11. **CreateUserDto / UpdateUserDto:** Añadir `email?: string` con `@IsEmail()`; validar telefono con `@Matches()` o custom validator.
12. **Partial unique index telefono:** Migración SQL para `(juntaId, telefono) WHERE telefono IS NOT NULL` o validación solo en app.

### Fase 3: DTOs y mensajes

13. **DTOs:** Completar validaciones en CambiarPasswordDto, OlvideContrasenaDto, etc.
14. **Frontend:** Mostrar mensajes de error cuando falle por duplicado (ConflictException).
15. **Recuperación paso 2:** Mostrar email enmascarado (ej. `j***@e***.com`).

### Fase 4: Teléfono Usuario – unicidad por junta

16. Implementar validación en users.service (crear/actualizar) o partial unique index.

### Fase 5: Verificación de correo

17. **Prisma:** Añadir `emailVerificado Boolean @default(false)` a Usuario.
18. **Backend:** Endpoint o flujo integrado:
   - Opción A: En `cambiarPassword` (primer login): si viene email, enviar código → paso 2 pide código → al verificar, guardar email + emailVerificado.
   - Opción B: Endpoint separado `POST /auth/verificar-email` (solicitar código) y `POST /auth/confirmar-email` (verificar código y guardar).
19. **Modelo CodigoRecuperacion vs CodigoVerificacionEmail:** Reutilizar `CodigoRecuperacion` con tipo/metadata, o crear `CodigoVerificacionEmail` (usuarioId null hasta confirmar, email en metadata). El flujo de verificación es distinto: el usuario aún no tiene cuenta o está agregando email por primera vez.
20. **Flujo detallado Fase 5:**
   - Usuario ingresa email (en cambiar-password o en usuario-form).
   - Backend: si email ya existe y está verificado en otro usuario → ConflictException.
   - Backend: envía código al email (nuevo tipo de código: verificación, no recuperación).
   - Usuario ingresa código.
   - Backend: valida código, guarda email en Usuario + `emailVerificado=true`.
   - Para recuperación de contraseña: solo usuarios con `emailVerificado=true` (o permitir cualquiera con email registrado, según decisión).

---

## 4. Archivos a modificar/crear

| Capa | Archivos |
|------|----------|
| Prisma | schema.prisma (Usuario, Junta), migraciones |
| Backend | junta.service, bootstrap (service, dto), platform-juntas (service, DTO), mi-junta (actualizarDatos si aplica), auth.service, users.service, DTOs |
| Utilidad | validacion-telefono.util.ts (nuevo) |
| Frontend | junta-form, usuario-form, recuperar-contrasena, cambiar-password |

---

## 5. Decisiones pendientes (opcional)

- **Junta.email/telefono unique:** ¿Único global entre juntas? El análisis sugiere opcional.
- **Fase 5 – recuperación:** ¿Exigir `emailVerificado=true` para recuperar contraseña, o permitir cualquier email registrado?
- **Bootstrap primera junta:** Si el bootstrap se llama por API/script sin UI, ¿valores por defecto para email/telefono o hacerlos obligatorios en el body?

---

## 6. Criterios de aceptación

- [ ] Junta: email y telefono obligatorios al crear; migración sin errores.
- [ ] Usuario: email único global; telefono único por junta.
- [ ] cambiarPassword: valida unicidad de email.
- [ ] users.service: valida unicidad y formato de email/telefono.
- [ ] DTOs con validaciones adecuadas.
- [ ] Frontend: mensajes de error, máscara de email en recuperación.
- [ ] Fase 5: flujo de verificación de correo operativo (cambiar-password y/o usuario-form).
