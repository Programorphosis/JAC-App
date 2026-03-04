# Fase 9.0 – Cimiento del Frontend Angular

**Fecha:** 2025-02-14  
**Objetivo:** Proyecto Angular configurado, auth y layout base.

---

## Resumen del trabajo

Se creó el proyecto Angular 19 en `apps/frontend` reemplazando React, se configuró Angular Material con paleta JAC, Tailwind para layout, y se implementó el flujo completo de autenticación.

---

## Cambios realizados

### 1. Stack

- Angular 19 + Angular Material + Tailwind v4
- TypeScript, HttpClient, RxJS
- Paleta JAC (azul naval, teal) en Material
- Environments: apiUrl, appName

### 2. Core Auth

- **AuthService:** login, logout, refresh, currentUser (signal), isPlatformAdmin, hasRole
- **AuthGuard:** protege rutas, redirect a /login
- **PlatformAdminGuard:** solo PLATFORM_ADMIN
- **JWT Interceptor:** token en headers, refresh en 401
- Tokens en sessionStorage (compatible con redirect Wompi)

### 3. Página de login

- Formulario: tipo documento, número, contraseña
- Checkbox "Acceso Platform Admin"
- Redirección según rol: /platform o /

### 4. Layout base

- Toolbar con menú, nombre usuario, logout
- Sidenav con enlaces por rol (Juntas / Inicio)
- Separación Tailwind (solo contenedores) vs Material (componentes)

### 5. Rutas

- /login (público)
- / (authGuard, dashboard)
- /platform (platformAdminGuard, placeholder)

### 6. Correcciones

- CORS backend: puerto 4200
- Fix .mdc-notched-outline__notch (conflicto Tailwind+Material)

---

## Referencias

- ARQUITECTURA_FRONTEND_ANGULAR.md
- PALETA_COLORES_JAC.md
- flujoBootstrapYOnboarding.md
