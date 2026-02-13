📘 DOCUMENTO RECTOR – Arquitectura Oficial del Sistema

Versión: 1.1 – Alineado con SCHEMA BASE v1.1

1. Propósito del Sistema

Construir una plataforma SaaS multi-tenant para gestión de Juntas de Acción Comunal en Colombia, diseñada para:

Escalar a múltiples juntas.

Mantener aislamiento lógico estricto por junta.

Ser defendible ante auditorías legales y contables.

Convertirse en producto comercial vendible.

Servir como base para futuros sistemas comunales.

El sistema prioriza:

Seguridad > Trazabilidad > Estabilidad > Escalabilidad

2. Modelo Arquitectónico Oficial

**Naming:** En implementación (Prisma, NestJS) se usan los nombres del schema en camelCase; en documentación se puede usar snake_case como equivalente conceptual (junta_id = juntaId).

🔹 Tipo: Multi-Tenant Lógico
🔹 Base de datos: PostgreSQL única
🔹 Aislamiento: Por juntaId (UUID)
🔹 ORM: Prisma
🔹 Backend: NestJS

En esta etapa:

❌ No se usan bases separadas por junta.

❌ No se usan esquemas separados.

✔ Se usa una sola base con aislamiento lógico obligatorio.

3. Regla Fundamental del Sistema
TODA entidad que pertenezca a una junta DEBE contener juntaId.

No hay excepciones.

Esto aplica a:

Usuario

Pago

Carta

Tarifa

Auditoria

Consecutivo

Cualquier módulo futuro

Si una entidad pertenece al dominio de la junta → lleva juntaId.

4. Principio de Persistencia

El sistema persiste hechos, no estados derivados.

✔ Se guardan pagos.
✔ Se guardan cambios de estado.
✔ Se guardan historiales.
✔ Se guardan auditorías.

❌ No se guarda deuda.
❌ No se guarda “estado calculado”.
❌ No se guarda saldo acumulado.

La deuda siempre se calcula dinámicamente.

5. Estructura Base de Entidades

Tablas principales oficiales:

juntas

usuarios

roles

usuario_roles

historial_laboral

tarifas

pagos

estado_agua

historial_agua

cartas

documentos

consecutivos

auditoria

No existe tabla “deudas”.

**Regla de juntaId:** Toda consulta debe pasar por la validación de juntaId. Las entidades sin juntaId directo (Documento, EstadoAgua) se filtran vía Usuario: `where: { usuario: { juntaId: authUser.juntaId } }`. No hay excepciones.

6. Aislamiento Multi-Tenant (Regla Técnica Crítica)
6.1 Regla Absoluta

Ninguna consulta puede ejecutarse sin filtro por juntaId.

Ejemplo correcto:

where: {
  juntaId: authUser.juntaId,
  id: pagoId
}


Ejemplo prohibido:

where: { id: pagoId }

6.2 Índices Obligatorios

Toda tabla multi-tenant debe tener:

Índice por juntaId

Índices compuestos cuando aplique (juntaId + campo crítico)

Ejemplo ya aplicado:

@@unique([juntaId, anio, consecutivo])

7. Seguridad Obligatoria
7.1 Autenticación

El JWT debe contener: userId, juntaId (null para Platform Admin), roles. Nunca se recibe juntaId desde frontend.

Usuario Platform Admin: juntaId = null, rol PLATFORM_ADMIN. Solo accede a rutas /api/platform/* (crear/administrar juntas). No accede a datos operativos de una junta concreta.

7.2 Middleware Obligatorio

Cada request debe:

Validar JWT

Extraer juntaId del token

Forzar filtrado por juntaId en toda operación

Aplicar RBAC

7.3 Backend es Fuente de Verdad

El frontend no decide reglas.

El backend valida todo.

No hay lógica crítica en frontend.

8. Auditoría Obligatoria

Toda acción sensible debe generar registro en Auditoria:

Ejemplos obligatorios:

Registro de pago

Cambio de estado de agua

Emisión de carta

Cambio de historial laboral

Cambio de obligación de agua

La auditoría debe contener:

juntaId

entidad

entidadId

acción

metadata JSON

ejecutadoPorId

fecha

La auditoría es inmutable.

9. Consecutivos Legales

Las cartas deben:

Tener consecutivo anual

Ser únicos por junta + año

Reiniciarse cada año

Ser generados únicamente en backend

Nunca depender del frontend

10. Estado del Agua (Regla Oficial)

El sistema cambia a MORA automáticamente el día 1 de cada mes.

No existen pagos adelantados.

Si el usuario no paga antes del 1 → queda en MORA.

Solo el rol RECEPTOR_AGUA puede cambiar a AL_DIA.

Usuarios con obligacionActiva = false omiten validación de agua.

11. Escalabilidad Futura

El sistema se diseña para permitir en el futuro:

Migración a base de datos por junta.

Subdominios por junta.

Sharding por junta.

Arquitectura distribuida.

En etapa actual:

✔ Base compartida
✔ Aislamiento lógico
✔ Deploy único

12. Filosofía de Desarrollo

1️⃣ Primero estabilidad
2️⃣ Luego trazabilidad
3️⃣ Luego automatización
4️⃣ Luego escalabilidad

No se introduce complejidad sin justificación de negocio.

13. Jerarquía de Documentos

Este documento:

Prevalece sobre cualquier documento técnico anterior.

Prevalece sobre decisiones improvisadas.

Es la base de diseño del sistema.

Si algún MD previo contradice este documento,
este documento tiene prioridad.