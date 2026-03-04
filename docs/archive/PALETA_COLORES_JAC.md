# Paleta de Colores – Sistema JAC

**Versión:** 1.0  
**Objetivo:** Definir la paleta de colores para el tema custom de Angular Material. Seria, profesional, basada en azul.

---

## 1. Criterio de Selección

- **Azul naval (Navy Blue):** Transmite confianza, formalidad e institucionalidad. Adecuado para un sistema que maneja datos financieros, auditoría y trámites legales.
- **Contraste:** Cumplir accesibilidad (WCAG) en textos sobre fondos.
- **Neutralidad:** Evitar colores que sugieran partidos o afiliaciones políticas.

---

## 2. Paleta Principal

### Primary (Azul naval)

| Variable | Hex | Uso |
|----------|-----|-----|
| `primary-50` | `#e3f2fd` | Fondos muy suaves, hover sutil |
| `primary-100` | `#bbdefb` | Fondos de chips, badges secundarios |
| `primary-200` | `#90caf9` | Bordes, estados disabled |
| `primary-300` | `#64b5f6` | Iconos secundarios |
| `primary-400` | `#42a5f5` | Links hover |
| `primary-500` | `#1976d2` | **Color principal** – botones, toolbar, links |
| `primary-600` | `#1565c0` | Botones hover, estados activos |
| `primary-700` | `#0d47a1` | **Primary dark** – toolbar, headers |
| `primary-800` | `#0a3d91` | Sombra, profundidad |
| `primary-900` | `#002171` | Texto sobre fondos claros |

**Base:** `#1976d2` (Material Blue 700) – azul profesional, equilibrado entre serio y accesible.

### Accent (Acento – complemento)

| Variable | Hex | Uso |
|----------|-----|-----|
| `accent-500` | `#00838f` | **Acento principal** – CTAs, FAB, highlights |
| `accent-600` | `#006064` | Accent hover |
| `accent-700` | `#004d52` | Accent dark |

**Base:** `#00838f` (Cyan 800) – teal que complementa el azul sin competir.

### Warn (Errores, alertas)

| Variable | Hex | Uso |
|----------|-----|-----|
| `warn-500` | `#c62828` | Errores, validaciones fallidas |
| `warn-600` | `#b71c1c` | Warn hover |

### Success (Éxito, confirmación)

| Variable | Hex | Uso |
|----------|-----|-----|
| `success-500` | `#2e7d32` | Pagos exitosos, estados al día |

---

## 3. Neutros (Grises)

| Variable | Hex | Uso |
|----------|-----|-----|
| `grey-50` | `#fafafa` | Fondo de página |
| `grey-100` | `#f5f5f5` | Fondos de cards, superficies |
| `grey-200` | `#eeeeee` | Bordes, dividers |
| `grey-300` | `#e0e0e0` | Bordes hover |
| `grey-400` | `#bdbdbd` | Placeholder, disabled |
| `grey-500` | `#9e9e9e` | Iconos secundarios |
| `grey-600` | `#757575` | Texto secundario |
| `grey-700` | `#616161` | Texto cuerpo |
| `grey-800` | `#424242` | Texto principal |
| `grey-900` | `#212121` | Texto sobre fondos claros |

---

## 4. Configuración Angular Material

```scss
// Ejemplo en styles.scss o theme file
@use '@angular/material' as mat;

$jac-primary: mat.define-palette((
  50: #e3f2fd,
  100: #bbdefb,
  200: #90caf9,
  300: #64b5f6,
  400: #42a5f5,
  500: #1976d2,  // main
  600: #1565c0,
  700: #0d47a1,
  800: #0a3d91,
  900: #002171,
  contrast: (
    50: rgba(black, 0.87),
    100: rgba(black, 0.87),
    200: rgba(black, 0.87),
    300: rgba(black, 0.87),
    400: rgba(black, 0.87),
    500: white,
    600: white,
    700: white,
    800: white,
    900: white,
  )
));

$jac-accent: mat.define-palette((
  500: #00838f,
  600: #006064,
  700: #004d52,
  contrast: (
    500: white,
    600: white,
    700: white,
  )
));

$jac-warn: mat.define-palette(mat.$red-palette, 800);

$jac-theme: mat.define-light-theme((
  color: (
    primary: $jac-primary,
    accent: $jac-accent,
    warn: $jac-warn,
  )
));

@include mat.all-component-themes($jac-theme);
```

---

## 5. Tailwind (opcional)

Si usas Tailwind para layout, puedes extender la paleta:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        50: '#e3f2fd',
        500: '#1976d2',
        700: '#0d47a1',
      },
      accent: {
        500: '#00838f',
      },
    },
  },
},
```

---

## 6. Vista previa (referencia rápida)

| Uso | Color | Hex |
|-----|-------|-----|
| Toolbar, header | Azul oscuro | `#0d47a1` |
| Botones primarios | Azul | `#1976d2` |
| Botones acento (Pagar, Crear) | Teal | `#00838f` |
| Links | Azul | `#1976d2` |
| Fondo página | Gris claro | `#fafafa` |
| Errores | Rojo | `#c62828` |
| Éxito | Verde | `#2e7d32` |

---

## 7. Personalización futura

Para ajustar la paleta:

1. Mantener el contraste de texto (mín. 4.5:1 para cuerpo, 3:1 para grande).
2. Probar en modo claro y oscuro si se implementa.
3. Actualizar este documento al cambiar valores.

---

**Referencia:** `ARQUITECTURA_FRONTEND_ANGULAR.md` (sección 8.4 Tema custom).
