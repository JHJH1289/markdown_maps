# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Backend JSON storage

Spring Boot backend lives in `backend`.

```bash
cd backend
./mvnw spring-boot:run
```

On Windows:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

The backend serves:

- `GET /api/mind-map`
- `PUT /api/mind-map`

For the personal-tool workflow, snapshots are saved as one JSON document at `backend/data/mind-map.json` by default. Start the Vite dev server separately with `npm run dev`; Vite proxies `/api` to `http://localhost:8080`.

You can move the JSON file without changing the frontend:

```powershell
$env:STORAGE_BACKEND = "json"
$env:MARKDOWN_MAPS_STORAGE_PATH = "D:\markdown-maps-data\mind-map.json"
cd backend
.\mvnw.cmd spring-boot:run
```

## Supabase storage

The Supabase path is still kept for later expansion. Set `STORAGE_BACKEND=supabase` to store the same snapshot JSON in Supabase Postgres instead of the local JSON file.

1. Open the Supabase SQL Editor for project `oxufnvvzgnxsveukeajm`.
2. Run `supabase/migrations/001_mind_map_snapshots.sql`.
3. Start the backend with Supabase credentials:

```powershell
$env:SUPABASE_URL = "https://oxufnvvzgnxsveukeajm.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
$env:SUPABASE_SNAPSHOT_ID = "default"
$env:STORAGE_BACKEND = "supabase"
cd backend
.\mvnw.cmd spring-boot:run
```

Keep `SUPABASE_SERVICE_ROLE_KEY` on the backend only. Do not put it in Vite env vars or frontend code.

## Supabase Auth in the web app

The Vite app can also sign users in directly with Supabase Auth and save one mind map snapshot per user. Run the migration above so the row-level security policies are installed, then set these frontend environment variables:

```powershell
$env:VITE_SUPABASE_URL = "https://oxufnvvzgnxsveukeajm.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "<anon-public-key>"
npm run dev
```

For hosted deployments, add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values in the hosting provider's environment settings. The app uses `auth.uid()` as the snapshot row id, so each logged-in user can only read and update their own data.

## Free-first deployment

Recommended low-cost deployment shape:

- Frontend: Vercel
- Backend: Google Cloud Run
- Durable online storage: Supabase storage mode, or another managed store later

The backend can run with the JSON storage mode on Cloud Run, but Cloud Run container files are ephemeral. Use JSON mode for a quick demo only. For durable online data, set `STORAGE_BACKEND=supabase` and provide the Supabase backend credentials as Cloud Run environment variables.

### Backend on Cloud Run

The backend Docker image is defined in `backend/Dockerfile`. The app reads Cloud Run's `PORT` environment variable via `server.port=${PORT:8080}`.

From the `backend` directory:

```powershell
gcloud run deploy markdown-maps-backend `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --set-env-vars "STORAGE_BACKEND=json,CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*,https://*.vercel.app"
```

After Vercel gives you the final frontend URL, update CORS:

```powershell
gcloud run services update markdown-maps-backend `
  --region asia-northeast3 `
  --update-env-vars "CORS_ALLOWED_ORIGIN_PATTERNS=https://your-project.vercel.app,http://localhost:*,http://127.0.0.1:*"
```

For Supabase-backed durable storage:

```powershell
gcloud run services update markdown-maps-backend `
  --region asia-northeast3 `
  --update-env-vars "STORAGE_BACKEND=supabase,SUPABASE_URL=https://your-project.supabase.co,SUPABASE_SERVICE_ROLE_KEY=<service-role-key>,SUPABASE_SNAPSHOT_ID=default"
```

### Frontend on Vercel

Set this Vercel environment variable before the production build:

```text
VITE_API_BASE_URL=https://your-cloud-run-service-url
```

Then deploy the repository root to Vercel. The Vercel settings are in `vercel.json`.
