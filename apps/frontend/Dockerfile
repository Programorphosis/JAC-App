# ──────────────────────────────────────────────
# Etapa 1: build Angular
# ──────────────────────────────────────────────
FROM node:20.18-alpine AS builder

WORKDIR /app

COPY package*.json ./
# npm install: apps/frontend no tiene package-lock.json propio (monorepo usa el de la raíz)
RUN npm install

COPY . .
# ng build --configuration production usa environment.prod.ts
RUN npm run build -- --configuration production

# ──────────────────────────────────────────────
# Etapa 2: nginx no-root (imagen mínima ~25 MB)
# ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -f /etc/nginx/conf.d/default.conf.bak \
 && chown -R nginx:nginx /usr/share/nginx/html \
 && chown -R nginx:nginx /var/cache/nginx \
 && chown -R nginx:nginx /var/log/nginx \
 && touch /var/run/nginx.pid \
 && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
