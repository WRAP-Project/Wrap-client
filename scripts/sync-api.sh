#!/usr/bin/env bash
# Pulls the OpenAPI spec that springdoc-openapi auto-generates from the
# running Spring Boot backend, and writes it into api/openapi.yaml.
set -euo pipefail

URL="${API_DOCS_URL:-http://localhost:8080/v3/api-docs.yaml}"
OUT="$(dirname "$0")/../api/openapi.yaml"

echo "Fetching OpenAPI spec from $URL"
curl -fsS "$URL" -o "$OUT"
echo "Wrote $OUT"
