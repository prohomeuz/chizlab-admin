# Build context: repo root (set in docker-compose)
# This lets us copy packages/contracts/ which is outside apps/admin/

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy contracts (needed for @contracts alias resolution)
COPY packages/contracts ./packages/contracts

# Copy design tokens (imported via relative path from apps/admin/src/styles/)
COPY design ./design

# Install admin dependencies
COPY apps/admin/package.json apps/admin/package-lock.json* ./apps/admin/
WORKDIR /app/apps/admin
RUN npm ci

# Copy rest of admin source
COPY apps/admin/ .

# Build (vite alias ../../packages/contracts → /app/packages/contracts ✓)
RUN npm run build

# ── Production stage (nginx) ──────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  # Proxy API, Swagger docs, and health to the NestJS backend.\n\
  # NOTE: /internal is intentionally excluded — it must only be reachable\n\
  # from within the Docker network (ai-worker -> api directly).\n\
  location ~ ^/(api|docs|health) {\n\
    proxy_pass http://api:3000;\n\
    proxy_http_version 1.1;\n\
    proxy_set_header Host $host;\n\
    proxy_set_header X-Real-IP $remote_addr;\n\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
  }\n\
\n\
  location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n\
    expires 1y;\n\
    add_header Cache-Control "public, immutable";\n\
    try_files $uri =404;\n\
  }\n\
\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
