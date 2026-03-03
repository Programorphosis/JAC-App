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

| Rol | Tipo doc | Documento | Contraseña |
|-----|----------|-----------|------------|
| **Platform Admin** | CC | 00000000 | DevPlatform123! |
| **Admin Junta** | CC | 12345678 | DevAdmin123! |
| **Secretaria** | CC | 1001014 | Demo123! |
| **Tesorera** | CC | 1001015 | Demo123! |
| **Afiliados** | CC | 1001001 – 1001013 | Demo123! |

---

## Login

- **URL:** `POST /api/auth/login`
- **Body:** `{ "numeroDocumento": "12345678", "password": "DevAdmin123!" }`
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
