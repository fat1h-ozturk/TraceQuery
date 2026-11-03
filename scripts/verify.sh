#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
.venv/bin/python -c 'import fastapi, sqlglot, httpx'
.venv/bin/python -m pytest -c backend/pytest.ini -rs
(cd frontend && npm run build && npm run test:e2e)
