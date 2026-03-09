# Demo – JAC App

Credenciales y checklist para preparar una presentación.

---

## 1. Credenciales de prueba

**Origen:** `npm run db:seed` (solo desarrollo local). **NUNCA** en producción.

| Rol | Documento | Contraseña |
|-----|-----------|------------|
| Platform Admin | 00000000 | 00000000 |
| Admin Junta | 12345678 | 12345678 |
| Secretaria | 1001014 | 1001014 |
| Tesorera | 1001015 | 1001015 |
| María (carta lista descargar) | 1001001 | 1001001 |
| Carlos (carta lista descargar) | 1001002 | 1001002 |
| Ana (listo solicitar carta) | 1001003 | 1001003 |
| Pedro, Laura, Roberto (con deuda) | 1001004–1001006 | (documento = contraseña) |

**Login:** `POST /api/auth/login` con `{ "numeroDocumento": "12345678", "password": "12345678" }`

---

## 2. Datos de demo

- Junta "Junta Barrio Centro (Dev)" **sin requisitos**, con tarifas
- 8 afiliados con distintos estados para probar flujos:
  - **María, Carlos:** Cartas APROBADA listas para descargar (PDF + validación QR)
  - **Ana:** Pago carta al día, listo para solicitar (no para descargar)
  - **Pedro, Laura, Roberto:** Con deuda → probar flujo de pagos
  - **Secretaria, Tesorera:** roles administrativos

---

## 3. Checklist antes de la demo

- [ ] `npm run db:seed` ejecutado
- [ ] Backend y frontend corriendo (`npm run dev`)
- [ ] Credenciales anotadas (tabla arriba)
- [ ] Dashboard con métricas visibles
- [ ] Sección Ayuda accesible (`/ayuda`)
- [ ] Flujo de pago online (Wompi sandbox) si aplica
