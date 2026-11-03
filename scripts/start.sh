#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -x .venv/bin/python ]]; then
  echo 'Python ortamı bulunamadı. README.md içindeki ilk kurulumu tamamlayın.' >&2
  exit 1
fi

if ! .venv/bin/python - <<'PY'
import sys
try:
    import fastapi, uvicorn, sqlglot, multipart
except ImportError as error:
    print(f'Backend bağımlılığı eksik: {error}', file=sys.stderr)
    raise SystemExit(1)
PY
then
  echo 'Kurulum: .venv/bin/python -m pip install -r requirements.txt' >&2
  exit 1
fi

if ! command -v npm >/dev/null || [[ ! -x frontend/node_modules/.bin/tsc || ! -x frontend/node_modules/.bin/vite ]]; then
  echo 'Arayüz araçları eksik. frontend dizininde npm install çalıştırın.' >&2
  exit 1
fi

(cd frontend && npm run build)
echo 'TraceQuery: http://127.0.0.1:8000 — kapatmak için Ctrl+C'
exec .venv/bin/python -m uvicorn tracequery.app:app --app-dir backend --host 127.0.0.1 --port 8000
