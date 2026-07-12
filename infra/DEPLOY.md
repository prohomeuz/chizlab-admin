# CHIZLAB Admin — VPS Deploy Guide

One-time setup steps for deploying this project on a fresh VPS (Ubuntu 22.04,
Docker + Compose already installed). After this initial setup, deploys happen
automatically via GitHub Actions on every push to `main`.

---

## 1. Clone the repo

```bash
sudo mkdir -p /opt/chizlab-admin
sudo chown "$USER":"$USER" /opt/chizlab-admin
git clone <repo-url> /opt/chizlab-admin
cd /opt/chizlab-admin
```

---

## 2. Configure environment

```bash
cp infra/.env.example infra/.env
nano infra/.env
```

At minimum, change the following before going live:

| Variable | Notes |
|---|---|
| `POSTGRES_PASSWORD` | change from the example value |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ADMIN_PIN` | change from default `12345678` |
| `MINIO_SECRET_KEY` | change from default `minioadmin123` |
| `INTERNAL_CALLBACK_SECRET` | generate a random hex value |
| `GEMINI_API_KEY` | required — AI worker will not start without it |
| `CORS_ORIGINS` | set to `https://admin.chizlab.uz` |
| `PUBLIC_ALLOWED_ORIGINS` | hostnames allowed to call `/api/public/*` (defaults to `chizlab.uz,www.chizlab.uz,api.chizlab.uz`) |
| `MINIO_PUBLIC_URL` | set to `https://media.chizlab.uz` (dedicated media subdomain, see §4a) |
| `API_PORT` | set to `8005` (this server's reserved port) |
| `ADMIN_PORT` | set to `3005` (this server's reserved port) |

Every value marked `changeme` / `change_me_*` / `change-this-*` in
`infra/.env.example` must be replaced with a real secret.

---

## 3. Start the stack

```bash
cd /opt/chizlab-admin
docker compose -f infra/docker-compose.yml up -d --build
```

The `minio-init` service creates the media bucket automatically on first boot.
Check status with:

```bash
docker compose -f infra/docker-compose.yml ps
```

---

## 4. External Nginx (host, not containerized)

This server already runs other projects, so CHIZLAB is fronted by the host's
Nginx rather than a containerized one. Example server block for
`admin.chizlab.uz`:

```nginx
server {
    listen 80;
    server_name admin.chizlab.uz;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /media/ {
        proxy_pass http://127.0.0.1:9100/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site and issue a TLS certificate:

```bash
sudo ln -s /etc/nginx/sites-available/admin.chizlab.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d admin.chizlab.uz
```

---

## 4a. Media subdomain (`media.chizlab.uz`)

Media links are now served from a dedicated subdomain that maps the MinIO
bucket to its root, so a file lives at `https://media.chizlab.uz/<uuid>.pdf`
(instead of `https://admin.chizlab.uz/media/chizlab-media/<uuid>.pdf`).

**Order matters — do these BEFORE flipping `MINIO_PUBLIC_URL` / running the
migration, or existing links will 404:**

1. **DNS:** add an `A` record `media.chizlab.uz → <server IP>`.
2. **Nginx** server block:

```nginx
server {
    listen 80;
    server_name media.chizlab.uz;

    client_max_body_size 100M;

    # Map the subdomain root to the MinIO bucket (note both trailing slashes):
    #   media.chizlab.uz/<uuid>.pdf  ->  127.0.0.1:9100/chizlab-media/<uuid>.pdf
    location / {
        proxy_pass http://127.0.0.1:9100/chizlab-media/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/media.chizlab.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d media.chizlab.uz
```

3. **Verify** the bucket is reachable through the new host (must return `200`):

```bash
curl -I https://media.chizlab.uz/<some-existing-uuid>.pdf
```

4. Set `MINIO_PUBLIC_URL=https://media.chizlab.uz` and redeploy the API + AI
   worker. **New** uploads now use the new URL.
5. **Migrate existing rows** so old materials point at the new host too
   (the objects are unchanged — only the URL prefix is rewritten):

```bash
docker compose -f infra/docker-compose.yml exec api npm run migration:run
```

   The `MigrateMediaUrlDomain` migration rewrites
   `https://admin.chizlab.uz/media/chizlab-media/…` → `https://media.chizlab.uz/…`
   for `media_url` and `cover_url`.

> Keep the old `location /media/` block on `admin.chizlab.uz` for a while as a
> fallback; both hosts serve the same bucket, so nothing breaks during the
> transition.

### `api.chizlab.uz` (public read-only API, separate subdomain)

The external platform consumes `/api/public/*` on its own subdomain, not under
`admin.chizlab.uz`. This vhost proxies **only** the public API and its Swagger
docs to the same backend (`127.0.0.1:8005`) — `/api/admin/*` and
`/internal/*` are intentionally not reachable here, even though they're
already JWT/secret-guarded, as defense in depth.

```nginx
server {
    listen 80;
    server_name api.chizlab.uz;

    location /api/public/ {
        proxy_pass http://127.0.0.1:8005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger UI for the public API, mounted at the bare /docs path
    # (apps/api/src/main.ts mounts the same public document at both
    # /docs/public and /docs — no path rewrite needed here).
    location /docs {
        proxy_pass http://127.0.0.1:8005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        return 404;
    }
}
```

Enable the site and issue a TLS certificate:

```bash
sudo ln -s /etc/nginx/sites-available/api.chizlab.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.chizlab.uz
```

This requires a DNS `A` record for `api.chizlab.uz` pointing at the same
server as `admin.chizlab.uz`.

---

## 5. GitHub Secrets (for automated deploy)

Add these repository secrets in GitHub (`Settings → Secrets and variables → Actions`):

| Secret | Value |
|---|---|
| `VPS_HOST` | server IP or hostname |
| `VPS_USER` | SSH user with access to `/opt/chizlab-admin` and Docker |
| `VPS_SSH_KEY` | private key matching a public key authorized on the server |

Once set, every push to `main` that passes the `docker-build` CI job will SSH
into the server, `git pull`, and run
`docker compose -f infra/docker-compose.yml up -d --build`.
