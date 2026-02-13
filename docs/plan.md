📘 Planeación Integral del Sistema Digital para Junta de Acción Comunal (Versión Consolidada y Actualizada)
1. Contexto y Objetivo del Proyecto

La Junta de Acción Comunal (JAC) opera procesos críticos de forma manual:

Cobro de cuotas

Validación de requisitos

Expedición de cartas laborales

Control de obligaciones (junta y agua)

-Problemas actuales:

Filas y tiempos muertos

Riesgo de errores contables

Falta de trazabilidad

Dependencia de personas clave

Difícil auditoría histórica

-Objetivo del sistema

Diseñar un sistema digital robusto, auditable y profesional que:

Digitalice procesos sin eliminar la operación presencial

Mantenga historial legal completo

Permita pagos presenciales y online (solo pagos totales)

Genere cartas solo si se cumplen TODOS los requisitos

Sea defendible ante auditoría

Sirva como base escalable para otras juntas

2. Principios Rectores del Sistema

❌ No hay auto-registro

✅ Usuarios creados por ADMIN o SECRETARIA

✅ Carga inicial desde libro físico

❌ No pagos parciales

✅ Solo pagos TOTALES

✅ Modelo híbrido (presencial + digital)

✅ Nada se sobreescribe (historial como ley)

✅ La deuda se calcula bajo demanda (no se almacena)

✅ Todas las entidades críticas tienen consecutivo auditable desde la implementación

3. Arquitectura Empresarial Definitiva

Se adopta arquitectura en capas limpia:

Controllers
    ↓
Application Layer (Casos de Uso)
    ↓
Domain Layer (Reglas del negocio puras)
    ↓
Infrastructure Layer (Prisma, S3, Wompi, JWT)

3.1 Domain Layer (Core del sistema)

Aquí viven reglas puras:

DebtService

PaymentService

LetterService

WaterService

AuditService

Esta capa:

No depende de HTTP

No depende de Nest decorators

No depende directamente de Prisma

Contiene reglas determinísticas

Es el corazón del sistema.

3.2 Application Layer

Orquesta:

Recibe DTO

Valida permisos

Maneja transacciones

Llama servicios de dominio

Persiste vía repositorios

Aquí viven los módulos:

users

payments

letters

water

audit

auth

3.3 Infrastructure

Prisma ORM

PostgreSQL

AWS S3

Wompi

JWT

Nginx

PM2

Backups automáticos

4. Modelo Lógico de Negocio
4.1 Cuotas Junta

Valor mensual depende del estado laboral:

Trabajando → 20.000 COP

No trabajando → 3.000 COP

El estado laboral es histórico.

4.2 Historial Laboral

Tabla: historial_laboral

usuario_id

estado_laboral

fecha_inicio

fecha_fin (NULL = vigente)

creado_por

Nunca se edita un registro histórico.

5. Cálculo de Deuda (Regla Formal)

La deuda:

No se guarda.

No se acumula automáticamente.

Se calcula bajo demanda.

Algoritmo:

Identificar último pago

Generar meses vencidos

Consultar estado laboral vigente en cada mes

Obtener tarifa correspondiente según vigencia

Sumar valores

Servicio responsable: DebtService (Domain)

Determinístico y auditable.

6. Agua (Obligación Independiente)

Entidad independiente de la junta.

Tablas:

estado_agua (estado actual)
historial_agua (histórico completo)

Gestión por rol RECEPTOR_AGUA.

No afecta cálculo de deuda de junta.

7. Cartas Laborales

Requisitos obligatorios:

Junta en deuda = 0

Agua = al día

Pago carta registrado

Reglas:

Validación automática

Generación PDF

Registro con consecutivo único

Evento en auditoría

Servicio responsable: LetterService

8. Pagos
Reglas

No pagos parciales

Pago exacto total

Transacción obligatoria

Validación de monto contra deuda calculada (tipo JUNTA) o contra monto configurado (tipo CARTA)

Registro solo tras confirmación (online)

Campos (alineados al schema): id, juntaId, usuarioId, tipo (JUNTA | CARTA), metodo (EFECTIVO | TRANSFERENCIA | ONLINE), monto, consecutivo, referenciaExterna, registradoPorId, fechaPago. El consecutivo es obligatorio y se obtiene de la tabla Consecutivo (o lógica por junta/tipo/anio).

8.1 Pago tipo JUNTA: monto = deuda calculada. Backend calcula y exige coincidencia exacta.

8.2 Pago tipo CARTA: monto configurable por junta. ADMIN o TESORERA (u otros con permiso) configuran el valor en la junta (ej. montoCarta en Junta). Al registrar, el monto debe coincidir con el configurado para esa junta.

8.3 Método TRANSFERENCIA: registro manual por TESORERA. referenciaExterna = número o consecutivo de la transferencia (identificador único). Validación manual, sin webhook. Solo aplica a pagos presenciales o asistidos.

8.4 Método ONLINE: referenciaExterna provista por el proveedor de pagos (idempotencia). Webhook + retorno + reconciliación según flujos documentados.

El consecutivo inicia desde la implementación.

9. Modelo de Datos Consolidado

Se congela estructura Prisma como base estable.

Principios:

Claves foráneas estrictas

Índices en campos críticos

Transacciones en pagos

Ningún dato calculado persistido

Consecutivos en entidades auditables (pagos, cartas)

10. Auditoría Formal

Tabla Auditoria (estructura real, según schema): id, juntaId, entidad, entidadId, accion, metadata (JSON), ejecutadoPorId, fecha. El campo metadata puede incluir datos antes/después cuando aplique (por ejemplo en cambios de estado o ediciones), pero la estructura oficial es un único campo metadata y ejecutadoPorId.

Interceptor global en NestJS.

Todo cambio crítico genera evento.

11. Modelo Híbrido (Inmutable)

No existen dos procesos.

Existe uno:

Autogestión

Gestión asistida

Ambos usan el mismo backend.

Regla de oro:

Todo trámite físico debe quedar registrado.

El sistema es fuente única de verdad.

12. Seguridad

JWT con expiración

Guards por rol

Validaciones en Application

Validaciones críticas en Domain

Variables de entorno seguras

HTTPS obligatorio

13. Bootstrap y Onboarding de Juntas

Modelo B: Onboarding Manual con Platform Admin. Las juntas se acercan al proveedor; el proveedor usa un panel de Platform Admin (UI sencilla) para crear juntas y administrarlas. Endpoints de plataforma protegidos por rol PLATFORM_ADMIN. Esencial para multi-tenant desde el inicio.

Platform Admin: Usuario con rol PLATFORM_ADMIN y sin junta (juntaId = null). Solo accede a rutas /api/platform/*. Gestiona el catálogo de juntas (listar, crear, edición básica).

Bootstrap (primera vez): Endpoint `POST /api/bootstrap` que crea roles base (incl. PLATFORM_ADMIN), el primer usuario Platform Admin y la primera junta con su admin. Solo funciona si no hay juntas existentes.

Nuevas juntas: Desde el panel de Platform Admin (POST /api/platform/juntas). La lógica está en un servicio reutilizable `JuntaService.createJunta(...)`. Opcional: script CLI como respaldo.

Roles base: Migración crea PLATFORM_ADMIN, ADMIN, SECRETARIA, TESORERA, RECEPTOR_AGUA, CIUDADANO. Los de junta son globales; PLATFORM_ADMIN es el único sin junta.

Referencia completa: `flujoBootstrapYOnboarding.md`.

14. Stack Confirmado

Backend:

Node 18+

NestJS

Prisma

PostgreSQL

JWT

Multer

AWS S3

Wompi

Frontend:

React

Vite

Tailwind

Axios

Sin TypeScript en MVP

Infraestructura:

VPS

Nginx

PM2

Backups diarios

15. Alcance del MVP

Todo lo planeado en este documento y en el ROADMAP forma parte del MVP. No hay funcionalidades "post-MVP" definidas en esta etapa; el alcance es el sistema completo según la documentación.

16. Estado Real del Proyecto (Actualizado)

✔ Planeación funcional cerrada
✔ Arquitectura definida en capas
✔ Modelo ER definido
✔ Principios de auditoría definidos
✔ Consecutivos definidos
✔ Stack confirmado

⏳ Desarrollo backend en fase estructural
⏳ Prisma congelado estructuralmente

17. Principio Final del Sistema

Este sistema:

No es solo una app

Es un registro contable digital

Es un soporte legal

Es una base escalable para múltiples juntas

Está diseñado para no requerir rediseño estructural futuro