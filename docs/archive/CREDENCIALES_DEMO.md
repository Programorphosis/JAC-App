# Credenciales de demo – JAC App

**Origen:** `apps/backend/prisma/seed-dev.ts`  
**Uso:** Solo desarrollo local. **NUNCA** en producción.

---

## Cómo cargar las credenciales

```bash
npm run db:reset -w backend -- --force   # Reset BD + seed automático
# o
npm run db:seed                           # Solo seed (si la BD ya existe)
```

---

## Usuarios creados por el seed

**Contraseña = número de documento** para todos. Platform Admin no requiere cambio; el resto sí.

| Rol | Tipo doc | Documento | Contraseña |
|-----|----------|-----------|------------|
| **Platform Admin** | CC | 00000000 | 00000000 |
| **Admin Junta** | CC | 12345678 | 12345678 |
| **Secretaria** | CC | 1001014 | 1001014 |
| **Tesorera** | CC | 1001015 | 1001015 |
| **Afiliados** | CC | 1001001 – 1001013 | (mismo que documento) |

---

## Login

- **URL:** `POST /api/auth/login`
- **Body:** `{ "numeroDocumento": "12345678", "password": "12345678" }`
- **Frontend:** http://localhost:4200 → Login

---

## Datos de demo incluidos

- Junta "Junta Barrio Centro (Dev)"
- 15 afiliados (1001001–1001015; Secretaria y Tesorera en 1001014 y 1001015)
- Tarifas (TRABAJANDO, NO_TRABAJANDO)
- Historial laboral
- Requisitos (agua, aseo)
- 12 pagos cuota junta, 5 pagos carta
- 3 cartas aprobadas
