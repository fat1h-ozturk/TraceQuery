import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';

export default defineConfig({
 testDir:'./e2e',
 use:{baseURL:'http://127.0.0.1:8000',trace:'retain-on-failure'},
 webServer:{
  command:'.venv/bin/python -m uvicorn tracequery.app:app --app-dir backend --host 127.0.0.1 --port 8000',
  cwd:fileURLToPath(new URL('..',import.meta.url)),
  url:'http://127.0.0.1:8000/openapi.json',
  reuseExistingServer:false,
 },
});
