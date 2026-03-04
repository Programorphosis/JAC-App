# Rol TESORERA – Especificación Frontend y Backend

**Documento oficial** – Todo lo que un usuario con rol TESORERA puede y debe hacer en la aplicación.

**Referencias:** `flujoDePagos.md`, `ROL_AFILIADO_FRONTEND.md`, `00_ARQUITECTURA_RECTOR copy.md`

---

## 1. Principio del rol

La TESORERA es la **única que registra pagos en efectivo y transferencia**. Unifica la contabilidad de la junta. Debe tener una UI robusta para:

- Registrar pagos (efectivo, transferencia, online)
- Buscar usuarios fácilmente al registrar
- Hacer seguimiento a los pagos registrados
- Ver auditorías de pagos
- Cambiar estado laboral (historial) con UI clara y datepicker
- Dashboard contable con ingresos por mes, total, por año

---

## 2. Acceso y menú (TESORERA)

| Elemento | Visible | Ruta |
|----------|---------|------|
| Inicio | ✓ | `/` |
| Usuarios (listado) | ✓ | `/usuarios` |
| Mi cuenta | ✓ | `/usuarios/:myId` |
| **Pagos** | ✓ | `/pagos` |
| Requisitos (config) | ✗ | — |
| Cartas (pendientes) | ✗ | — |
| Tarifas (crear, listar) | ✓ | `/tarifas` |
| **Auditorías** | ✓ | `/auditorias` |

**Sidebar:** Inicio, Usuarios, Mi cuenta, Pagos, Tarifas, Auditorías.

---

## 3. Módulo Pagos – Funcionalidades

### 3.1 Registrar pagos

- **Efectivo/Transferencia JUNTA:** Selector de usuario + método + referencia (si transferencia).
- **Efectivo/Transferencia CARTA:** Idem.
- **Online JUNTA/CARTA:** Botones por usuario para generar link Wompi.

**Mejora requerida:** En lugar de un dropdown con todos los usuarios, usar **búsqueda/autocomplete** para encontrar usuarios por nombre, apellido o documento. La lista puede ser larga; la tesorera debe poder buscar rápido.

### 3.2 Listado y seguimiento de pagos

- **Nueva sección:** Tabla de pagos registrados.
- Filtros: usuario, tipo (JUNTA/CARTA), rango de fechas.
- Columnas: fecha, usuario, tipo, método, monto, consecutivo, registrado por.
- Paginación.

### 3.3 Dashboard contable

- **Ingresos por mes:** Total de pagos (JUNTA + CARTA) agrupados por mes.
- **Total general:** Suma de todos los pagos.
- **Por año:** Desglose anual.
- Vista inicial: últimos 12 meses + total.
- (Futuro: gráficos, exportar)

---

## 4. Auditorías

- TESORERA debe poder **ver auditorías**, especialmente de pagos.
- Filtro por entidad: Pago (por defecto para TESORERA) o Todas.
- Backend: añadir rol TESORERA al endpoint GET /auditorias.
- Frontend: `puedeVerAuditorias()` debe incluir TESORERA.

---

## 5. Historial laboral (UI robusta)

- TESORERA puede crear historial para cualquier usuario (junto con ADMIN).
- **Mejora:** Usar **Material Datepicker** en lugar de `input type="date"`.
- Angular Material incluye `MatDatepickerModule`.
- Formato visual más claro: calendario popup, selección de fechas intuitiva.

---

## 6. Endpoints backend necesarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/pagos` | Listar pagos de la junta. Query: `usuarioId`, `tipo`, `fechaDesde`, `fechaHasta`, `page`, `limit`. Solo TESORERA. |
| GET | `/pagos/estadisticas` | Estadísticas contables: ingresos por mes, total, por año. Solo TESORERA. |
| GET | `/usuarios?search=...` | Listar usuarios con búsqueda por nombre, apellido o documento. |
| GET | `/auditorias` | Incluir TESORERA en Roles. |

---

## 7. Checklist de implementación

### Backend
- [ ] Añadir TESORERA a Roles en auditorias.controller
- [ ] GET /pagos (listar con filtros)
- [ ] GET /pagos/estadisticas
- [ ] GET /usuarios?search=... (búsqueda)

### Frontend
- [ ] puedeVerAuditorias() incluye TESORERA
- [ ] Layout: TESORERA ve Auditorías
- [ ] Pagos: autocomplete/búsqueda de usuarios
- [ ] Pagos: sección listado y seguimiento
- [ ] Pagos: dashboard contable (o ruta /pagos/dashboard)
- [ ] Historial laboral: Material Datepicker

---

*Documento creado para guiar el desarrollo del rol TESORERA.*
