# Guía: Configurar Wompi en una junta

Guía paso a paso para que una junta pueda recibir pagos online (cuota, carta) con sus propias credenciales Wompi.

**Referencias técnicas:** `WOMPI_POR_JUNTA_DOC.md`, `WOMPI_WEBHOOK_CONFIG.md`, `WOMPI_TARJETAS_PRUEBA_SANDBOX.md`

---

## 1. Requisitos previos

- La junta debe tener una cuenta en [comercios.wompi.co](https://comercios.wompi.co)
- El administrador de la plataforma debe haber configurado `ENCRYPTION_MASTER_KEY` en el backend
- Para pruebas: usar credenciales Sandbox (`prv_test_*`, `pub_test_*`, etc.)

---

## 2. Dónde configurar

Hay dos formas según el rol:

| Rol | Dónde |
|-----|-------|
| **Administrador de plataforma** | Platform → Juntas → [Junta] → Tarjeta "Wompi" |
| **Admin de la junta** | Mi JAC → Configuración → Credenciales Wompi |

---

## 3. Datos necesarios (desde Wompi)

En el [Dashboard de Wompi](https://comercios.wompi.co/) de la junta:

1. **Desarrollo** → **Programadores**
   - Llave privada (`prv_test_...` o `prv_prod_...`)
   - Llave pública (`pub_test_...` o `pub_prod_...`)

2. **Mi cuenta** → **Secretos para integración técnica**
   - Secreto de integridad (`test_integrity_...` o `prod_integrity_...`)
   - Secreto de eventos (`test_events_...` o `prod_events_...`)

3. **Ambiente:** `sandbox` (pruebas) o `production` (dinero real)

---

## 4. Pasos de configuración

### 4.1 Ingresar credenciales

En la tarjeta Wompi (Platform o Mi JAC → Configuración):

1. Pegar **Llave privada**
2. Pegar **Llave pública**
3. Pegar **Secreto de integridad**
4. Pegar **Secreto de eventos**
5. Seleccionar **Ambiente** (sandbox / production)
6. Guardar

Las credenciales se guardan encriptadas en la base de datos.

### 4.2 Configurar webhook en Wompi

Para que los pagos se registren automáticamente (sin esperar al retorno del usuario):

1. En el dashboard de Wompi de la junta: **Desarrollo** → **Programadores** → **URL de eventos**
2. Configurar: `https://tu-dominio.com/api/webhooks/wompi`
3. En desarrollo local: usar ngrok u otro túnel (Wompi no alcanza localhost)

**Importante:** El **Secreto de eventos** que pegaste en la app debe ser exactamente el mismo que muestra Wompi para esa cuenta. Sin él, el webhook rechazará los eventos.

Ver detalles en `WOMPI_WEBHOOK_CONFIG.md`.

---

## 5. Verificación

1. **Crear intención de pago** (cuota o carta) desde un afiliado de la junta
2. **Pagar** con tarjeta de prueba (sandbox): `4242 4242 4242 4242` → APPROVED
3. **Comprobar** que el pago aparece registrado en la junta

Si el webhook está configurado, el pago se registra al instante. Si no, el usuario al retornar a la app dispara la verificación y el pago se registra igual (rescate).

---

## 6. Errores frecuentes

| Error | Causa | Solución |
|------|-------|----------|
| "Wompi no configurado" | Junta sin credenciales | Completar todos los campos en la tarjeta Wompi |
| Webhook rechazado | Events Secret incorrecto o no configurado | Verificar que wompiEventsSecret coincida con el de Wompi |
| Pago no se registra | URL de eventos no configurada en Wompi | Configurar webhook en dashboard Wompi |
| Transacción no encontrada | Ambiente distinto (sandbox vs prod) | Usar credenciales del mismo ambiente |

---

## 7. Checklist

- [ ] Credenciales ingresadas (privada, pública, integridad, eventos)
- [ ] Ambiente correcto (sandbox para pruebas)
- [ ] URL de eventos configurada en Wompi
- [ ] Prueba de pago exitosa con tarjeta `4242 4242 4242 4242`
