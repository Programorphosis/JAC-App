# ──────────────────────────────────────────────
# Etapa 1: build Angular
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# npm install: apps/frontend no tiene package-lock.json propio (monorepo usa el de la raíz)
RUN npm install

COPY . .
# ng build --configuration production usa environment.prod.ts
RUN npm run build -- --configuration production

# ──────────────────────────────────────────────
# Etapa 2: nginx (imagen mínima ~25 MB)
# ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Angular 17+ application builder → dist/frontend/browser/
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Eliminar config default de nginx
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
