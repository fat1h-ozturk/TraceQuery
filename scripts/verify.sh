#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .artifacts/verification
echo 'Doğrulama kaydı: .artifacts/verification/latest.log'
{
  .venv/bin/python -c 'import fastapi, sqlglot, httpx'
  .venv/bin/python -m pytest -c backend/pytest.ini -rs
  (cd frontend && npm run build && npm run test:e2e)
} 2>&1 | tee .artifacts/verification/latest.log
