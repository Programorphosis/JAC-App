# Análisis: Unicidad y validación de email y teléfono

**Objetivo:** Robustecer email y teléfono: evitar duplicados, validar en todos los flujos, mejorar seguridad y escalabilidad.

---

## 1. Estado actual

### 1.1 Modelo de datos

**Usuario:**
```prisma
email     String?   // index, NO unique
telefono  String?   // sin index, sin unique
@@unique([juntaId, numeroDocumento])
@@index([email])
```

**Junta:**
```prisma
email     String?
telefono  String?
// Sin constraints
```

**Problemas:**
- Email: se pueden duplicar. Si dos usuarios tienen el mismo email, la recuperación de contraseña (`findFirst`) envía al primero encontrado → ambigüedad.
- Telefono: sin validación, sin unicidad. Se acepta cualquier string.
- CreateUserDto: tiene telefono, NO tiene email (el email se pide al cambiar contraseña por primera vez).
- UpdateUserDto: tiene telefono, NO tiene email (el email no se edita desde el formulario de usuarios).

### 1.2 Puntos donde se usa email

| Flujo | Archivo | Qué hace |
|-------|---------|----------|
| Cambiar contraseña (primer login) | auth.service.cambiarPassword | Guarda email si requiereCambioPassword |
| Recuperar contraseña (solicitar código) | auth.service.solicitarCodigoRecuperacion | Busca usuario por email, envía código |
| Recuperar contraseña (verificar) | auth.service.verificarCodigoYRecuperar | Busca usuario por email |
| Crear usuario | users.service.crear | No usa email (no está en DTO) |
| Actualizar usuario | users.service.actualizar | No usa email (no está en UpdateUserDto) |

### 1.3 Puntos donde se usa telefono

| Flujo | Archivo | Validación |
|-------|---------|------------|
| Crear usuario | users.service.crear | Ninguna |
| Actualizar usuario | users.service.actualizar | Ninguna |
| Usuario form (frontend) | usuario-form | Ninguna |

### 1.4 Flujo de recuperación actual

1. Usuario ingresa email en paso 1.
2. Backend: si existe usuario con ese email, envía código. Si no, responde "enviado" igual (no revelar).
3. Paso 2: muestra "Código enviado a {{ email }}", pide código + nueva contraseña.
4. El email se guarda en `emailEnviado` (variable en memoria). Si el usuario recarga, pierde el paso y debe volver a paso 1.

**Mejora sugerida:** En paso 2, mostrar email enmascarado (ej. `j***@ejemplo.com`) para reducir riesgo de shoulder surfing, sin perder usabilidad.

---

## 2. Alcance de unicidad – Usuario (email y telefono nullable)

**Principio:** En Usuario, email y telefono **pueden ser null**. Pero **cuando se agregan o modifican**, deben ser únicos.

- El email lo agrega el usuario al cambiar contraseña por primera vez (o el admin al crear/editar).
- El telefono lo agrega el admin al crear/editar usuario (o el usuario en su perfil, si se implementa).
- Si el valor se proporciona, se valida unicidad antes de guardar.

### 2.1 Email

**Propuesta: nullable + único cuando no es null.**

- `Usuario.email` sigue siendo `String?` (nullable).
- Cuando el usuario ingresa email (primer cambio de contraseña, o edición): validar que no exista otro usuario con ese email.
- `@@unique([email])` en Prisma: permite múltiples NULL; los valores no null deben ser únicos.
- Motivo: recuperación de contraseña busca por email; si dos usuarios comparten email, ambigüedad.

### 2.2 Telefono

**Propuesta: nullable + único por junta cuando no es null.**

- `Usuario.telefono` sigue siendo `String?` (nullable).
- Cuando se agrega o modifica: validar unicidad dentro de la junta (o global, según decisión).
- Implementación: validación en aplicación al crear/actualizar; o partial unique index en BD.

---

## 3. Validación

### 3.1 Email

- Formato: RFC 5322 simplificado o `@IsEmail()` de class-validator.
- Normalización: `trim().toLowerCase()` antes de guardar.
- Longitud máxima: 254 caracteres (RFC).

**Dónde validar:**
- cambiarPassword (ya valida con regex)
- solicitarCodigoRecuperacion (DTO)
- verificarCodigoRecuperacion (DTO)
- Crear/actualizar usuario: cuando se añada email al DTO

### 3.2 Telefono

**Formato Colombia:** 10 dígitos. Celulares: 3XX XXXXXXX. Fijos: 601, 602, etc. + área.

**Opciones de validación:**
- **A) Estricta:** E.164: `+57` + 10 dígitos. Ej: `+573001234567`.
- **B) Flexible:** 10 dígitos, con o sin +57. Normalizar a E.164 al guardar.
- **C) Mínima:** Solo dígitos, longitud 10–12.

**Propuesta:** B. Aceptar: `3001234567`, `573001234567`, `+573001234567`. Normalizar a `+573001234567` (12 caracteres) para consistencia.

**Regex sugerida:** `^(\+57)?[0-9]{10}$` o `^\+?57?[0-9]{10}$` (ajustar según si permitimos con/sin +57).

**Dónde validar:**
- CreateUserDto, UpdateUserDto (cuando telefono se envía)
- cambiarPassword: no aplica (no pide teléfono)
- Recuperación: no usa teléfono actualmente
- Junta: actualizar-datos-junta.dto, platform dto

---

## 4. Cambios por capa

### 4.1 Prisma

```prisma
model Usuario {
  // ...
  email     String?  // Añadir: @@unique en partial index (solo no-null)
  telefono  String?  // Normalizado E.164
  // ...
  @@unique([juntaId, numeroDocumento])
  @@unique([email])  // Prisma: @@unique en nullable permite múltiples null
}
```

En Prisma, `@@unique([email])` con email nullable permite varios NULL; los valores no null deben ser únicos.

Para **Usuario**.telefono por junta: `@@unique([juntaId, telefono])` es problemático porque (null, null) y (junta1, null) pueden colisionar. Opciones:
- Partial unique index en SQL: `CREATE UNIQUE INDEX ... ON Usuario(juntaId, telefono) WHERE telefono IS NOT NULL AND juntaId IS NOT NULL`
- O: `@@unique([juntaId, telefono])` – en PostgreSQL, NULL != NULL, así que (junta1, null) puede repetirse. Mejor usar raw migration para partial index.

**Nota:** Hacer obligatorio **Junta**.telefono (véase §6) no resuelve la unicidad de **Usuario**.telefono; son entidades distintas. Usuario puede tener telefono null aunque Junta lo tenga obligatorio.

**Simplificación:** 
- Email: `@@unique([email])` – Prisma lo soporta.
- Telefono Usuario: unique por junta vía partial index en migración manual, o validación solo en aplicación (check antes de insert/update).

### 4.2 Backend – validación de duplicados

**Email (en crear/actualizar/cambiarPassword):**
```ts
if (email) {
  const existente = await prisma.usuario.findFirst({
    where: { email: emailNorm, id: { not: excluirUsuarioId } },
  });
  if (existente) throw new ConflictException('Este correo ya está registrado');
}
```

**Telefono (en crear/actualizar usuario):**
```ts
if (telefonoNorm) {
  const existente = await prisma.usuario.findFirst({
    where: {
      juntaId,
      telefono: telefonoNorm,
      id: { not: excluirUsuarioId },
    },
  });
  if (existente) throw new ConflictException('Este teléfono ya está registrado en la junta');
}
```

### 4.3 DTOs

- **CreateUserDto:** Añadir `email?: string` (opcional), `@IsEmail()`. Validar `@Matches()` para telefono.
- **UpdateUserDto:** Añadir `email?: string`, `telefono?: string` con validaciones.
- **CambiarPasswordDto:** Ya valida email. Añadir check de unicidad en auth.service.
- **OlvideContrasenaDto:** Ya tiene `@IsEmail()`.

### 4.4 Normalización

- **Email:** `trim().toLowerCase()` en todos los puntos de entrada.
- **Telefono:** función `normalizarTelefonoColombia(valor): string | null` que devuelva `+57XXXXXXXXXX` o null si inválido.

### 4.5 Dónde validar unicidad (Usuario)

| Momento | Flujo | Acción |
|---------|-------|--------|
| Agregar email | Cambiar contraseña (primer login) | Validar único antes de guardar |
| Agregar email | Crear usuario (si se añade email al DTO) | Validar único |
| Modificar email | Actualizar usuario (si se añade email al DTO) | Validar único, excluir propio id |
| Agregar telefono | Crear usuario | Validar único por junta |
| Modificar telefono | Actualizar usuario | Validar único por junta, excluir propio id |

---

## 5. Verificación de correo (futuro)

**Objetivo:** Al ingresar el email, poder verificar que el usuario tiene acceso a ese correo antes de guardarlo.

### 5.1 Flujo propuesto

1. Usuario ingresa email (ej. en cambiar contraseña por primera vez).
2. Backend: envía código de verificación al email (similar a recuperación).
3. Usuario ingresa el código recibido.
4. Backend: valida código y guarda el email como **verificado**.
5. Solo entonces se persiste el email en Usuario.

### 5.2 Modelo (opcional)

```prisma
model Usuario {
  email           String?
  emailVerificado Boolean  @default(false)  // true = el usuario confirmó acceso al correo
}
```

- Si `emailVerificado = false` y hay email: el email está guardado pero no confirmado (p. ej. pendiente de verificación).
- Para recuperación de contraseña: se podría exigir `emailVerificado = true` o permitir cualquier email registrado (comportamiento actual).

### 5.3 Fases

- **Fase 1 (actual):** Guardar email sin verificación. Unicidad y validación de formato.
- **Fase 2 (futuro):** Añadir flujo de verificación: enviar código → usuario confirma → marcar `emailVerificado = true`.

---

## 6. Flujo de recuperación – mejoras

### 6.1 Mostrar email enmascarado en paso 2

En lugar de `Código enviado a juan@ejemplo.com`, usar `Código enviado a j***@e***.com` para reducir exposición.

### 6.2 Persistir paso al recargar (opcional)

Guardar en sessionStorage: `{ step: 2, email: masked, timestamp }` para que al recargar no se pierda. Considerar ventana de tiempo (ej. 15 min) por seguridad.

### 6.3 No revelar si el email existe

Ya implementado: siempre se responde "enviado". Mantener.

---

## 7. Junta – email y telefono obligatorios

**Propuesta: hacer email y telefono obligatorios en Junta** (no nullables).

### 7.1 Motivo

- **Al crear una junta** se deben registrar todos los datos de contacto necesarios.
- Las notificaciones (facturas, vencimientos, pagos) van a `Junta.email`; si es null, no hay destino.
- El teléfono es el canal principal de contacto con la junta.
- Evita juntas incompletas y mejora la calidad de datos.

### 7.2 Cambios en Junta

**Prisma:**
```prisma
model Junta {
  // ...
  telefono  String   // obligatorio (antes String?)
  email     String   // obligatorio (antes String?)
  // ...
}
```

**Crear junta:**
- `CreateJuntaParams` debe incluir `email` y `telefono` en el payload.
- `CreateJuntaAdminUser` y `junta.create` deben recibirlos obligatoriamente.
- Actualizar: `CreateJuntaParams`, `JuntaService.createJunta`, DTOs de platform/junta.

**Actualizar junta:**
- `email` y `telefono` no pueden ser null; si se permiten, validar que no queden vacíos.

### 7.3 Unicidad en Junta (opcional)

Con email y telefono obligatorios:
- **Junta.email:** `@@unique` global para evitar duplicados entre juntas.
- **Junta.telefono:** `@@unique` global o por región si se decide.

### 7.4 Flujos afectados

- **Bootstrap / onboarding:** formulario de creación de junta debe pedir email y telefono.
- **Platform Admin:** crear junta (`POST /platform/juntas`) y editar junta.
- **Mi junta:** actualizar datos de contacto (si el admin de junta puede editar).

### 7.5 Juntas existentes con null

Si ya hay juntas con `email` o `telefono` null, la migración debe:
1. Opción A: rellenar con valores por defecto (ej. `"pendiente@junta.local"`) y luego migrar a NOT NULL.
2. Opción B: migración en dos pasos: primero obligar en backend/creación, luego migración que exija valores para registros existentes (manual o script).

---

## 8. Orden de implementación sugerido

1. **Junta obligatorios:** Hacer `Junta.email` y `Junta.telefono` obligatorios. Migración + actualizar CreateJuntaParams, formularios de creación/edición.
2. **Prisma Usuario:** `@@unique([email])` en Usuario. Migración.
3. **Utilidad:** `normalizarTelefonoColombia()` y `validarTelefonoColombia()`.
4. **Backend:** validación de email único en cambiarPassword. Validación de telefono en users.service crear/actualizar.
5. **DTOs:** `@IsEmail()` donde aplique. Validación telefono en CreateUserDto, UpdateUserDto.
6. **Añadir email a CreateUserDto/UpdateUserDto** (opcional): si se quiere que el admin pueda poner email al crear usuario.
7. **Frontend:** mensajes de error cuando falle por duplicado. Máscara de email en recuperación paso 2.
8. **Telefono Usuario unique por junta:** partial unique index o validación en aplicación.

---

## 9. Resumen de archivos a tocar

| Capa | Archivos |
|------|----------|
| Prisma | schema.prisma (Usuario, Junta), migraciones |
| Backend | auth.service, users.service, junta.service, platform-juntas (crear/editar junta), DTOs |
| Utilidad | validacion-telefono.util.ts (nuevo) |
| Frontend | usuario-form, recuperar-contrasena, formularios de junta (bootstrap, platform) |
