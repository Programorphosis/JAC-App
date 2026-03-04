# Plan SEO – JAC App

Análisis del estado actual y estrategia para mejorar el SEO sin cambios drásticos, priorizando agregar valor (landing, meta tags, etc.).

---

## Estado actual

| Aspecto | Estado | Impacto SEO |
|---------|--------|-------------|
| **Tipo de app** | SPA pura (sin SSR) | Google indexa, pero el HTML inicial llega casi vacío; el crawler debe ejecutar JS |
| **Ruta raíz (/) ** | Redirige a `/login` si no autenticado | No hay contenido indexable en la raíz; Google ve solo login |
| **Landing page** | No existe | No hay página de ventas/valor para posicionar |
| **Meta tags** | Solo `<title>JAC App</title>` en index.html | Sin description, sin og:*, Google no sabe de qué trata |
| **Meta dinámicos** | No se usa `Meta` ni `Title` de Angular | Todas las rutas comparten el mismo título |
| **robots.txt** | No existe | No se guía a los crawlers |
| **sitemap.xml** | No existe | Google no tiene mapa de URLs |
| **Lazy loading** | Sí (rutas con loadComponent) | Bueno para rendimiento |
| **Compresión** | gzip en nginx | Bueno para velocidad |
| **Páginas legales** | Sí: /legal/terminos, privacidad, cancelación | Contenido estático indexable |

---

## Estrategia recomendada (por fases)

### Fase 1: Quick wins (bajo esfuerzo, alto impacto)

**Qué:** Añadir archivos estáticos y meta básicos.

**Cambios:**
1. **robots.txt** en `public/`:
   ```
   User-agent: *
   Allow: /
   Sitemap: https://jacapp.online/sitemap.xml
   ```
2. **sitemap.xml** en `public/` con URLs: `/`, `/login`, `/legal/terminos`, `/legal/privacidad`, `/legal/cancelacion`
3. **index.html**: meta description y og: básicos (title, description, image)
4. **lang="es"** en el `<html>` (contenido en español)

**Por qué:** Google necesita robots.txt y sitemap para rastrear bien. La meta description y og: mejoran snippets y compartidos en redes.

**Esfuerzo:** Bajo. Solo archivos estáticos + editar index.html.

---

### Fase 2: Landing page (prioridad alta)

**Qué:** Página de entrada en `/` para visitantes no autenticados, en lugar de ir directo al login.

**Flujo actual:**
```
/ → authGuard → /login (si no autenticado)
```

**Flujo nuevo:**
```
/ → Landing (público, indexable)
/login → Login (público)
/dashboard, /pagos, etc. → authGuard → /login si no autenticado
```

**Contenido de la landing:**
- Hero: valor prop (“Sistema digital para Juntas de Acción Comunal”)
- Funcionalidades: pagos, cartas, requisitos, auditoría
- CTA: “Iniciar sesión” / “Solicitar demo”
- Enfoque local: “Para juntas en Puerto Gaitán, Meta, Colombia”
- Enlaces a términos, privacidad

**Por qué:**
- La raíz pasa a ser contenido rico y indexable
- Permite posicionar por “software juntas acción comunal”, “sistema JAC Colombia”, etc.
- No cambia la lógica del app; solo se añade una ruta pública

**Esfuerzo:** Medio. Nuevo componente + ajuste de rutas (path `''` con dos comportamientos: landing si no auth, redirect a dashboard si auth).

---

### Fase 3: Meta tags dinámicos

**Qué:** Usar `Meta` y `Title` de Angular en cada ruta pública.

**Páginas a configurar:**
- Landing: título y description orientados a SEO
- Login: “Iniciar sesión – JAC App”
- Legal (términos, privacidad, cancelación): títulos y descriptions específicos

**Ejemplo:**
```typescript
constructor(private title: Title, private meta: Meta) {}
ngOnInit() {
  this.title.setTitle('Sistema para Juntas de Acción Comunal | JAC App');
  this.meta.updateTag({ name: 'description', content: '...' });
  this.meta.updateTag({ property: 'og:title', content: '...' });
}
```

**Por qué:** Cada URL tendrá un título y descripción propios en los resultados de búsqueda.

**Esfuerzo:** Bajo. Inyectar servicios y configurar en cada componente público.

---

### Fase 4: Páginas de contenido (opcional, después)

**Qué:** Páginas estáticas tipo:
- `/software-juntas-accion-comunal`
- `/funcionalidades`
- `/precios` (si aplica)

**Por qué:** Más contenido para long-tail: “cómo legalizar junta acción comunal”, “requisitos actas JAC 2026”, etc.

**Esfuerzo:** Medio. Nuevos componentes y rutas.

---

### Fase 5: SSR (Angular Universal) – futuro

**Qué:** `ng add @nguniversal/express-engine` para renderizar en servidor.

**Por qué:** Mejor indexación y Core Web Vitals al tener HTML completo desde el primer request.

**Cuándo:** Cuando el tráfico orgánico sea relevante y el esfuerzo compense. Implica cambios en build y despliegue (Node para SSR o prerender).

**Esfuerzo:** Alto.

---

## Orden sugerido

| Orden | Fase | Esfuerzo | Impacto |
|-------|------|----------|---------|
| 1 | Quick wins (robots, sitemap, meta básicos) | Bajo | Alto |
| 2 | Landing page | Medio | Muy alto |
| 3 | Meta dinámicos | Bajo | Medio |
| 4 | Páginas de contenido | Medio | Medio |
| 5 | SSR | Alto | Alto (a largo plazo) |

---

## Qué no hacer ahora

- **SSR de entrada:** Demasiado invasivo; priorizar landing y meta.
- **Blog:** Añade complejidad; se puede plantear más adelante.
- **Competir por términos genéricos:** Enfocarse en “software JAC”, “juntas acción comunal Colombia”, “sistema JAC Puerto Gaitán”, etc.

---

## Resumen ejecutivo

1. **Empezar por Fase 1** (robots, sitemap, meta en index.html).
2. **Seguir con Fase 2** (landing en `/`): es el cambio que más mejora el SEO sin tocar el core del app.
3. **Luego Fase 3** (meta dinámicos en rutas públicas).
4. **SSR** cuando el proyecto esté más maduro y el SEO sea una prioridad clara.

Con la landing y los quick wins se gana la mayor parte del beneficio con esfuerzo moderado.

---

## Nota: URLs de Wompi (tras implementar landing)

Tras mover la app a `/app`, las URLs de retorno de Wompi cambian. Actualiza en `.env.production` (ver `docs/DESPLIEGUE.md`):

```
WOMPI_REDIRECT_URL=https://jacapp.online/app/pagos/retorno
WOMPI_REDIRECT_URL_FACTURAS=https://jacapp.online/app/facturas-plataforma/retorno
```
