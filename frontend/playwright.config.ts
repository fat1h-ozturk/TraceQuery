import {defineConfig} from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',
 use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure'},
 webServer:[
  {command:'../.venv/bin/python -m uvicorn tracequery.app:app --app-dir ../backend --host 127.0.0.1 --port 8000',url:'http://127.0.0.1:8000/openapi.json',reuseExistingServer:false},
  {command:'npm run dev -- --port 5173 --strictPort',url:'http://127.0.0.1:5173',reuseExistingServer:false},
 ],
});
