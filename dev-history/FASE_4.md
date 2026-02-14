# Fase 4 – Módulo deuda y consultas

**Fecha:** Febrero 2025  
**Referencia:** ROADMAP.md § Fase 4, calculadoraDeDeuda.md, flujoDePagos.md

---

## 1. Objetivo cumplido

Exponer el cálculo de deuda de forma segura. Sin almacenar resultado; solo cálculo bajo demanda.

---

## 2. Alineación con ROADMAP

| Requisito ROADMAP | Implementado |
|-------------------|--------------|
| `GET /usuarios/:id/deuda` → llama `DebtService.calculateUserDebt` | ✓ |
| Respuesta: `total` y opcionalmente `detalle` por mes | ✓ |
| Filtro por `juntaId` y que el usuario pertenezca a la junta del token | ✓ |
| Sin almacenar resultado; solo cálculo bajo demanda | ✓ |

---

## 3. Endpoint implementado

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | /api/usuarios/:usuarioId/deuda | ADMIN, SECRETARIA, TESORERA, CIUDADANO | Consultar deuda calculada |

### Autorización

- **ADMIN, SECRETARIA, TESORERA:** pueden consultar deuda de cualquier usuario de la junta.
- **CIUDADANO:** solo puede consultar su propia deuda (`usuarioId` debe coincidir con el usuario autenticado).

### Query params

| Param | Tipo | Descripción |
|-------|------|-------------|
| detalle | string | `true` o `1` para incluir desglose por mes. Por defecto solo `total`. |

### Respuesta exitosa

```json
{
  "data": {
    "total": 26000,
    "detalle": [
      { "year": 2024, "month": 12, "estadoLaboral": "TRABAJANDO", "tarifaAplicada": 20000 },
      { "year": 2025, "month": 1, "estadoLaboral": "NO_TRABAJANDO", "tarifaAplicada": 3000 },
      { "year": 2025, "month": 2, "estadoLaboral": "NO_TRABAJANDO", "tarifaAplicada": 3000 }
    ]
  },
  "meta": { "timestamp": "2025-02-12T..." }
}
```

Sin `?detalle=true`, la respuesta es `{ data: { total: 26000 }, meta: {...} }`.

### Errores mapeados

| Error dominio | HTTP | Descripción |
|---------------|------|-------------|
| UsuarioNoEncontradoError | 404 | Usuario no existe o no pertenece a la junta |
| SinHistorialLaboralError | 422 | Usuario sin historial laboral |
| SinTarifaVigenteError | 422 | No hay tarifa vigente para el periodo |
| HistorialLaboralSuperpuestoError | 422 | Superposición en historial laboral |

---

## 4. Estructura de archivos

```
application/
└── deuda/
    ├── deuda.controller.ts
    └── deuda.module.ts
```

---

## 5. Integración con Domain Layer

- **DebtService:** `calculateUserDebt({ usuarioId, juntaId, fechaCorte? })` → `DebtResult`
- **PrismaDebtDataProvider:** implementación vía DebtModule (infraestructura)
- **Algoritmo:** calculadoraDeDeuda.md – último pago → meses vencidos → estado laboral por mes → tarifa vigente

---

## 6. Criterio de cierre (ROADMAP)

> Endpoint deuda devuelve total (y detalle) coherente con calculadoraDeDeuda.md.

- [x] GET /api/usuarios/:usuarioId/deuda
- [x] Respuesta con total y detalle opcional
- [x] Filtro por juntaId (token)
- [x] Roles: ADMIN, SECRETARIA, TESORERA (cualquier usuario); CIUDADANO (solo propio)
- [x] Errores de dominio mapeados a HTTP

**Fase 4 cerrada.**
