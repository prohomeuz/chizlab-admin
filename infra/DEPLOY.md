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
| `PUBLIC_API_KEY` / `INTERNAL_CALLBACK_SECRET` | generate random hex values |
| `GEMINI_API_KEY` | required — AI worker will not start without it |
| `CORS_ORIGINS` | set to `https://admin.chizlab.uz` |
| `MINIO_PUBLIC_URL` | set to `https://admin.chizlab.uz/media/chizlab-media` |
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
