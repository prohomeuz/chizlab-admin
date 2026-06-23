# CHIZLAB Materials — Infrastructure Operations Guide

## Prerequisites

- Docker 24+ and Docker Compose v2+ (`docker compose` — note: no hyphen)
- `curl` available on the host (used by the MinIO healthcheck)
- Ports 5432, 6379, 9000, 9001, 3000, 80 free on the host

---

## Quick start

```bash
# 1. Copy and fill in secrets
cp .env.example .env
# Edit .env — at minimum change all "changeme" and "change-this-*" values

# 2. Bring everything up (detached)
docker compose -f infra/docker-compose.yml up -d

# 3. (First run only) Create the MinIO bucket — see MinIO Setup below
bash infra/minio-init.sh
```

---

## Run infrastructure only (recommended for local app development)

When developing api or admin locally (outside Docker), start only the backing services:

```bash
docker compose -f infra/docker-compose.yml up postgres redis minio -d
```

Your local NestJS and React processes connect to `localhost:5432`, `localhost:6379`, and `localhost:9000`.

---

## Scale AI workers

```bash
docker compose -f infra/docker-compose.yml up --scale ai-worker=3 -d
```

---

## MinIO setup (first run)

> **CRITICAL:** The `minio_data` named volume holds all uploaded media. Never run
> `docker volume rm chizlab-admin_minio_data` unless you intend to permanently
> delete all stored files.

**Option A — web console**

Open http://localhost:9001, log in with `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`,
and create a bucket named `chizlab-media` with public download policy.

**Option B — init script (recommended)**

```bash
bash infra/minio-init.sh
```

Requires the `mc` (MinIO Client) binary — install via `brew install minio/stable/mc`
or https://min.io/docs/minio/linux/reference/minio-mc.html.

---

## Service URLs

| Service          | URL                               | Notes                          |
|------------------|-----------------------------------|--------------------------------|
| NestJS API       | http://localhost:3000             | Phase 2                        |
| Admin panel      | http://localhost:80               | Phase 2                        |
| Swagger (admin)  | http://localhost:3000/docs/admin  | Phase 2                        |
| Swagger (public) | http://localhost:3000/docs/public | Phase 2                        |
| MinIO S3 API     | http://localhost:9000             | Ready now                      |
| MinIO console    | http://localhost:9001             | Ready now — bucket setup here  |

---

## Tear down

```bash
# Stop containers but keep volumes (data is safe)
docker compose -f infra/docker-compose.yml down

# Stop AND remove volumes (DESTRUCTIVE — deletes all data)
docker compose -f infra/docker-compose.yml down -v
```
