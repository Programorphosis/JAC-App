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
| Afiliados | 1001001–1001013 | (documento = contraseña) |

**Login:** `POST /api/auth/login` con `{ "numeroDocumento": "12345678", "password": "12345678" }`

---

## 2. Datos de demo

- Junta "Junta Barrio Centro (Dev)"
- 15 afiliados, tarifas, historial laboral, requisitos
- Pagos, cartas aprobadas

---

## 3. Checklist antes de la demo

- [ ] `npm run db:seed` ejecutado
- [ ] Backend y frontend corriendo (`npm run dev`)
- [ ] Credenciales anotadas (tabla arriba)
- [ ] Dashboard con métricas visibles
- [ ] Sección Ayuda accesible (`/ayuda`)
- [ ] Flujo de pago online (Wompi sandbox) si aplica
