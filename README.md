# Markdown Maps

Markdown Maps는 마인드맵 노드와 Markdown 문서를 함께 관리하는 웹 애플리케이션입니다. 각 노드는 하나의 Markdown 문서와 연결되며, Google 로그인 후 사용자별 스냅샷을 온라인에 저장할 수 있습니다.

배포 주소: https://markdownmaps.vercel.app

## 주요 기능

- Google 계정 로그인
- 사용자별 마인드맵 스냅샷 분리 저장
- 노드 기반 마인드맵 편집
- 노드별 Markdown 문서 작성 및 미리보기
- 노드 제목 검색 및 해당 노드로 이동
- 노드 추가, 삭제, 복사, 붙여넣기
- 노드 간 연결선 생성 및 삭제
- 연결선 선택, Delete/Backspace 삭제
- 우클릭 메뉴로 노드/선 삭제
- Ctrl + 드래그 또는 우클릭 드래그로 영역 선택
- 자동 정렬
- 수동 저장 버튼
- 5분 주기 자동 저장
- 자동 저장 켜기/끄기
- 라이트/다크 테마
- 개인별 데이터가 없을 때 `새 노드 1` 기본 워크스페이스 제공

## 기술 스택

### Frontend

- React 19
- TypeScript
- Vite
- Zustand
- React Flow (`@xyflow/react`)
- `@uiw/react-md-editor`
- Google Identity Services
- ESLint
- Vercel

### Backend

- Java 17
- Spring Boot 3.5
- Spring Web MVC
- Google API Client
- Jackson
- Maven
- Docker
- Google Cloud Run

### Storage / Auth

- Supabase Postgres
- Supabase REST API
- Google OAuth ID Token 검증
- 로컬 JSON 저장 모드 지원

## 프로젝트 구조

```text
markdown_maps/
  src/                 React 프론트엔드
  backend/             Spring Boot 백엔드
  backend/data/        로컬 JSON 저장소 기본 데이터
  supabase/migrations/ Supabase 테이블 마이그레이션
  vercel.json          Vercel 배포 설정
```

## 동작 방식

1. 사용자가 Google 계정으로 로그인합니다.
2. 프론트엔드는 Google ID 토큰을 백엔드 요청에 `Authorization: Bearer ...` 형태로 전달합니다.
3. 백엔드는 Google ID 토큰을 검증하고, 토큰의 `sub` 값을 사용자 고유 ID로 사용합니다.
4. 사용자 ID를 스냅샷 ID로 삼아 Supabase 또는 JSON 저장소에서 마인드맵 데이터를 읽고 씁니다.
5. 저장된 스냅샷이 없으면 기본 워크스페이스로 `새 노드 1` 하나가 표시됩니다.

## API

백엔드는 마인드맵 스냅샷을 하나의 JSON 문서로 저장합니다.

```http
GET /api/mind-map
PUT /api/mind-map
```

`PUT /api/mind-map` 요청 body 예시:

```json
{
  "nodes": [],
  "edges": [],
  "documents": [],
  "selectedDocumentId": null
}
```

## 로컬 실행

### 1. 프론트엔드 환경변수

루트의 `.env.local`에 값을 설정합니다.

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Google OAuth 설정의 승인된 JavaScript 원본에 로컬 주소를 추가해야 합니다.

```text
http://localhost:5173
```

### 2. 백엔드 실행

JSON 저장 모드로 실행할 수 있습니다.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Supabase 저장 모드로 실행하려면 백엔드 환경변수를 설정합니다. `SUPABASE_SERVICE_ROLE_KEY`는 백엔드에서만 사용해야 하며 프론트엔드에 노출하면 안 됩니다.

```powershell
$env:STORAGE_BACKEND = "supabase"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
$env:GOOGLE_CLIENT_ID = "your-google-client-id.apps.googleusercontent.com"
cd backend
.\mvnw.cmd spring-boot:run
```

### 3. 프론트엔드 실행

```powershell
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

## Supabase 설정

Supabase SQL Editor에서 마이그레이션을 실행합니다.

```sql
-- supabase/migrations/001_mind_map_snapshots.sql
```

저장 테이블은 사용자별 스냅샷 JSON을 저장합니다. 현재 백엔드는 Google 사용자 ID를 row id로 사용합니다.

## 배포 구성

현재 배포 구조는 다음과 같습니다.

```text
Vercel React Frontend
        |
        v
Google Cloud Run Spring Boot Backend
        |
        v
Supabase Postgres
```

### Vercel 환경변수

```env
VITE_API_BASE_URL=https://your-cloud-run-service-url
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Cloud Run 환경변수

```env
STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
CORS_ALLOWED_ORIGIN_PATTERNS=https://*.vercel.app,http://localhost:*,http://127.0.0.1:*
```

백엔드 배포 스크립트:

```powershell
cd backend
.\deploy-cloud-run.ps1
```

프론트엔드 배포:

```powershell
npx vercel --prod --yes
```

## 검증 명령어

```powershell
npm run build
npm run lint
cd backend
.\mvnw.cmd test
```

## 보안 메모

- Google Client ID는 프론트엔드에 포함될 수 있습니다.
- Google Client Secret은 현재 구조에서 사용하지 않습니다.
- Supabase Service Role Key는 반드시 백엔드 환경변수로만 관리해야 합니다.
- 프론트엔드는 Google ID 토큰만 전달하고, 백엔드가 해당 토큰을 검증합니다.
