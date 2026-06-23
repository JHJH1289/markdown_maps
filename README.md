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
