# Plan de implementación: Wompi por junta

**Versión:** 1.0  
**Estado:** En desarrollo  
**Última actualización:** 2025-02-17

---

## 1. Objetivo y principios

### 1.1 Objetivo

Cada junta recibe los pagos de sus afiliados directamente en su propia cuenta Bancolombia, mediante su propia cuenta Wompi. El dinero no pasa por la plataforma.

### 1.2 Principios rectores

- **Código limpio:** Nombres claros, responsabilidades bien definidas, sin duplicación.
- **Mantenible:** Cambios localizados, tests, documentación al día.
- **Escalable:** Diseño que soporte N juntas sin degradación.
- **Seguridad:** Credenciales encriptadas en BD, nunca en logs ni respuestas.
- **Sin soluciones temporales:** Implementación definitiva desde el inicio.
- **Auditable:** Cambios de configuración registrados en auditoría.

### 1.3 Separación de responsabilidades

| Uso | Credenciales | Destino del dinero |
|-----|--------------|-------------------|
| **Pagos junta** (afiliados → junta) | Por junta (Junta.wompi*) | Cuenta Bancolombia de la junta |
| **Facturación plataforma** (junta → plataforma) | Globales (env) | Cuenta Bancolombia de la plataforma |

Las variables de entorno actuales (`WOMPI_*`) se reservan exclusivamente para la facturación de la plataforma (pagos de suscripciones). Los pagos de afiliados a juntas usan credenciales por junta.

### 1.4 Fase de pruebas

Para pruebas iniciales, la junta activa puede configurarse con las mismas credenciales que la plataforma (copiadas manualmente). En producción, cada junta tendrá su propia cuenta Wompi.

---

## 2. Arquitectura

### 2.1 Modelo de datos

```
Junta
├── wompiPrivateKey      String?   (encriptado)
├── wompiPublicKey       String?   (encriptado)
├── wompiIntegritySecret String?   (encriptado)
├── wompiEventsSecret    String?   (encriptado)
└── wompiEnvironment     String?   ("sandbox" | "production")
```

- **Encriptación:** AES-256-GCM con `ENCRYPTION_MASTER_KEY` (32 bytes).
- **Nullable:** Junta sin configurar = no puede recibir pagos online (o fallback según política).

### 2.2 Flujo de pago online (por junta)

```
1. Usuario solicita pago online (deuda o carta)
2. PagosService.crearIntencionPago*:
   - Carga Junta + credenciales Wompi
   - Si no tiene credenciales → error "Configure Wompi para esta junta"
   - Desencripta credenciales
   - WompiService.crearPaymentLink(params, credencialesJunta)
   - redirectUrl = baseUrl + "?junta_id=" + juntaId
   - Guarda IntencionPago (wompiLinkId, juntaId, ...)
3. Usuario redirigido a checkout.wompi.co
4. Usuario paga (dinero va a cuenta Bancolombia de la junta)
5a. Webhook: Wompi → POST /webhooks/wompi
     - payment_link_id → IntencionPago → juntaId
     - Carga wompiEventsSecret de junta
     - Valida firma con ese secret
     - registrarPagoDesdeProveedor
5b. Retorno: Wompi redirige a /pagos/retorno?junta_id=X&transaction_id=Y
     - Frontend llama GET /pagos/online/verificar?transaction_id=Y&junta_id=X
     - Backend usa credenciales de junta X → obtenerTransaccion
     - Si APPROVED → registrarPagoDesdeProveedor
```

### 2.3 Flujo de facturación plataforma

Las facturas de la plataforma (suscripciones) usan las credenciales globales (`WOMPI_*` en env). Este flujo es independiente y no cambia con esta implementación.

---

## 3. Componentes a crear/modificar

### 3.1 Nuevos

| Componente | Ubicación | Responsabilidad |
|------------|-----------|-----------------|
| EncryptionService | infrastructure/encryption/ | Encriptar/desencriptar credenciales |
| ActualizarWompiJuntaDto | platform/dto/ | Validación de entrada |
| JuntaWompiCardComponent | platform/junta-detail/ | UI configuración Wompi |
| WompiCredenciales (interface) | infrastructure/wompi/ | Tipo para credenciales por llamada |

### 3.2 Modificados

| Componente | Cambios |
|------------|---------|
| Schema Prisma | 5 campos en Junta |
| WompiService | Aceptar credenciales por llamada |
| PagosService | Cargar credenciales junta, pasar a Wompi |
| WebhooksController | Resolver junta, validar con secret de junta |
| PagosController | Verificar: requerir junta_id |
| PlatformJuntasService | actualizarWompi, no exponer credenciales en GET |
| PagosRetornoComponent | Leer junta_id, pasarlo a API |

### 3.3 Sin cambios

- PaymentRegistrationRunner
- IntencionPago, Pago
- Lógica de deuda, consecutivos
- Flujo de facturación plataforma

---

## 4. Políticas de decisión

### 4.1 Junta sin credenciales

**Decisión:** Error explícito. No hay fallback a credenciales globales para pagos junta.

**Motivo:** Evitar mezclar modelos y obligar configuración explícita.

### 4.2 Webhook URL

**Decisión:** Una sola URL `/api/webhooks/wompi` para todas las juntas.

**Motivo:** Cada junta configura la misma URL en su dashboard Wompi. La resolución de junta se hace por `payment_link_id` → IntencionPago.

### 4.3 Redirect URL

**Decisión:** Incluir `junta_id` en la URL base. Wompi añade `transaction_id`.

**Formato:** `{WOMPI_REDIRECT_URL}?junta_id={juntaId}` → Wompi redirige a `...?junta_id=X&transaction_id=Y`

### 4.4 Auditoría

**Decisión:** Registrar `CONFIG_WOMPI_JUNTA` cuando se actualiza configuración (sin incluir valores de credenciales).

---

## 5. Criterios de aceptación

- [ ] Junta puede configurar credenciales Wompi desde Platform Admin.
- [ ] Credenciales almacenadas encriptadas en BD.
- [ ] Pago online (JUNTA) usa credenciales de la junta.
- [ ] Pago online (CARTA) usa credenciales de la junta.
- [ ] Webhook valida firma con secret de la junta correspondiente.
- [ ] Retorno funciona con junta_id en URL.
- [ ] Junta sin credenciales → error claro al intentar pago online.
- [ ] Facturación plataforma sigue usando credenciales globales.
- [ ] Documentación actualizada.
- [ ] Sin credenciales en logs ni respuestas API.

---

## 6. Referencias

- `WOMPI_VARIABLES_ENTORNO.md` – Variables actuales (facturación plataforma)
- `WOMPI_POR_JUNTA_ROADMAP.md` – Roadmap de implementación
- `WOMPI_POR_JUNTA_DOC.md` – Documentación técnica detallada
- `flujoDePagos.md` – Flujo general de pagos
- `PLAN_ADMINISTRADOR_PLATAFORMA.md` – Config Wompi por junta (sección 2.5)
