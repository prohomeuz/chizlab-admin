#!/usr/bin/env bash
# =============================================================
# minio-init.sh — One-time MinIO bucket initialization
# =============================================================
# Run this once after the first `docker compose up` to create
# the chizlab-media bucket and set its download policy.
#
# Requires: mc (MinIO Client)
#   macOS:  brew install minio/stable/mc
#   Linux:  https://min.io/docs/minio/linux/reference/minio-mc.html
#
# Usage:
#   bash infra/minio-init.sh
#
# The script reads MINIO_ACCESS_KEY, MINIO_SECRET_KEY, and
# MINIO_BUCKET from .env if present, or falls back to defaults.
# =============================================================

set -euo pipefail

# ── Load .env if it exists ───────────────────────────────────
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  # Export only the vars we need (avoid sourcing everything)
  export $(grep -E '^(MINIO_ACCESS_KEY|MINIO_SECRET_KEY|MINIO_BUCKET)=' "$ENV_FILE" | xargs)
fi

MINIO_ALIAS="chizlab-local"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin123}"
MINIO_BUCKET="${MINIO_BUCKET:-chizlab-media}"

echo "==> Configuring mc alias '${MINIO_ALIAS}' → ${MINIO_ENDPOINT}"
mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"

echo "==> Checking/creating bucket '${MINIO_BUCKET}'"
if mc ls "${MINIO_ALIAS}/${MINIO_BUCKET}" > /dev/null 2>&1; then
  echo "    Bucket already exists — skipping creation."
else
  mc mb "${MINIO_ALIAS}/${MINIO_BUCKET}"
  echo "    Bucket created."
fi

echo "==> Setting bucket policy to 'download' (public read)"
mc anonymous set download "${MINIO_ALIAS}/${MINIO_BUCKET}"

echo ""
echo "Done. MinIO bucket '${MINIO_BUCKET}' is ready."
echo "Console: ${MINIO_ENDPOINT/9000/9001} (login with your MINIO_ACCESS_KEY / MINIO_SECRET_KEY)"
