# Validación del Checklist Operación Juntas

**Fecha:** 2025-02-18 (actualizado)  
**Objetivo:** Resultado de la verificación en código de los ítems del `CHECKLIST_OPERACION_JUNTAS.md`.

---

## Resumen ejecutivo

| Área | Estado | Observaciones |
|------|--------|---------------|
| Usuario inactivo | ✅ OK | UsuarioInactivoError en cartas, pagos, LetterEmissionRunner |
| Listado usuarios (filtro activo) | ✅ OK | Filtro Todos/Activos/Inactivos implementado |
| Bootstrap tarifas/requisitos | ✅ OK | Mensaje "Configure tarifas" en dashboard, pagos, deuda; tieneTarifas en mi-junta |
| Tarifas (editar) | ✅ OK | Frontend: Editar crea nueva tarifa con fechaVigencia=hoy |
| referenciaExterna pagos | ✅ OK | Efectivo: null; Transferencia: obligatoria; Online: transactionId |
| Búsqueda usuarios en pagos | ✅ OK | Autocomplete por nombre/documento con debounce |
| Dashboard contable | ✅ OK | Estadísticas por método, tipo, año, mes en módulo pagos |
| Filtros listado pagos | ✅ OK | Tipo, fechas, búsqueda por usuario/consecutivo/referencia |
| Rechazar carta | ✅ OK | POST /cartas/:id/rechazar con motivo opcional |
| Autovalidación cartas | ✅ OK | Si cumple requisitos → emisión automática; si no → RequisitosCartaNoCumplidosError |
| Consumo pago CARTA | ✅ OK | vigencia → false al aprobar (prisma-letter-emission-context) |
| Descarga documentos | ✅ OK | GET /documentos/:id/descargar; usuario-documentos con botón descargar |
| Estado inicial requisitos | ⚠️ Por diseño | No se crean EstadoRequisito al crear usuario; getRequisitosParaCarta usa MORA por defecto |
| Rol FISCAL | ✅ OK | Implementado: solo lectura (pagos, auditorías, usuarios, cartas, requisitos, tarifas, documentos) |

---

## Detalle por ítem

### 2.1 Usuario inactivo

**Validación:** ¿Se valida `activo` al solicitar carta o al pagar?

**Resultado:** ✅ Sí.

- `cartas.service.ts`: valida `usuario.activo` antes de solicitar; lanza `UsuarioInactivoError`.
- `pagos.service.ts`: valida `usuario.activo` en registrar efectivo/transferencia; lanza `UsuarioInactivoError`.
- `LetterEmissionRunner`: valida activo antes de emitir.
- Frontend: tipo `VerificarPagoCodigo` con `USUARIO_INACTIVO` para mostrar mensaje.

---

### 2.2 Bootstrap tarifas/requisitos

**Validación:** ¿Hay mensaje cuando no hay tarifas?

**Resultado:** ✅ Sí.

- `mi-junta.service`: `tieneTarifas` en GET /mi-junta.
- Dashboard: banner cuando `tieneTarifas() === false`.
- Pagos (tab Registrar): mensaje "Configure las tarifas antes de registrar pagos".
- Deuda: SinTarifaVigenteError con mensaje amigable + enlace a Tarifas.
- Requisitos: no se crean al crear junta (decisión documentada).

---

### 3.2 Tarifas – Editar

**Validación:** ¿Existe edición de tarifas?

**Resultado:** ✅ Sí.

- Frontend: botón "Editar" en tarifas vigentes.
- Al editar: formulario prellenado; al guardar crea nueva tarifa con `fechaVigencia = hoy`.
- La anterior deja de ser vigente para meses futuros (getTarifaVigente usa fechaVigencia DESC).

---

### 4.1 referenciaExterna en pagos

**Resultado:** ✅ Correcto. Efectivo: null; Transferencia: obligatoria; Online: transactionId.

---

### 4.3 Búsqueda usuarios en pagos

**Resultado:** ✅ Sí. mat-autocomplete con debounce, usuariosFiltrados, GET /usuarios?search=.

---

### 4.3 Filtros en listado pagos

**Resultado:** ✅ Sí. Filtros por tipo (JUNTA/CARTA), fechaDesde, fechaHasta, search (usuario, consecutivo, referencia). Paginación.

---

### 5.1 Rechazar carta

**Resultado:** ✅ Sí. POST /cartas/:id/rechazar con body `{ motivoRechazo?: string }`. Solo SECRETARIA. Frontend: botón Rechazar junto a Validar, diálogo con motivo.

---

### 5.1 Autovalidación de cartas

**Resultado:** ✅ Sí. CartasService.solicitar valida requisitos; si cumple emite con `emitLetter`; si no → RequisitosCartaNoCumplidosError. emitidaPorId: AFILIADO propio → ADMIN junta; SECRETARIA → id SECRETARIA.

---

### 5.3 Consumo pago CARTA

**Resultado:** ✅ Sí. prisma-letter-emission-context actualiza vigencia=false al aprobar.

---

### 7.1 Descarga documentos

**Resultado:** ✅ Sí. GET /documentos/:id/descargar (URL firmada). usuario-documentos: botón "Descargar" por documento. Admin, Secretaria, Tesorera, Fiscal pueden ver documentos de otros.

---

### 9.1 Dashboard contable

**Resultado:** ✅ Sí. Tab "Dashboard contable" con total, por método, por tipo, por año, por mes (últimos 24).

---

### 12. Rol FISCAL

**Resultado:** ✅ Implementado. Rol FISCAL con permisos de solo lectura (PAGOS_VER, AUDITORIAS_VER, USUARIOS_VER, CARTAS_VER, REQUISITOS_VER, TARIFAS_VER). Ver DISENO_ROL_FISCAL.md.

---

### 6.1 Estado inicial requisitos

**Resultado:** ⚠️ Por diseño. No se crean EstadoRequisito al crear usuario. `getRequisitosParaCarta` usa `estado ?? 'MORA'` y `obligacionActiva ?? true` cuando no hay EstadoRequisito. El modificador asigna estado manualmente.

---

## Ítems pendientes o parciales

| Ítem | Estado | Nota |
|------|--------|------|
| Eliminar usuario | Pendiente | Documentar política (soft delete vs hard delete) |
| Exportar pagos | Opcional | Pendiente |
| Política tarifas (no eliminar) | Documentar | Inmutabilidad |
| Historial laboral: Datepicker | UI | Verificar si usa Material Datepicker |
| Cron jobs: múltiples instancias | Documentar | Estrategia de lock |
| Contenido export junta | Documentar | Qué incluye JSON/CSV |

---

## Próximos pasos sugeridos

1. ~~Documentar política de eliminación de usuarios.~~ ✅ `POLITICA_ELIMINACION_USUARIOS.md`
2. ~~Documentar política de inmutabilidad de tarifas.~~ ✅ `politicasInmutabilidad.md` §3.1
3. ~~Documentar contenido del export JSON/CSV de junta.~~ ✅ `EXPORT_JUNTA_CONTENIDO.md`
4. ~~Exportar pagos a CSV/Excel.~~ ✅ GET /pagos/exportar, botón "Exportar CSV" en listado.
