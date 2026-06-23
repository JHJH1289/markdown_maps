param(
  [string]$ProjectId = "markdown-maps",
  [string]$Region = "asia-northeast3",
  [string]$ServiceName = "markdown-maps-backend",
  [string]$CorsAllowedOriginPatterns = "https://*.vercel.app,http://localhost:*,http://127.0.0.1:*"
)

$ErrorActionPreference = "Stop"

$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloud) {
  $candidate = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
  if (Test-Path $candidate) {
    $gcloud = $candidate
  } else {
    throw "gcloud was not found. Open a new terminal or add Google Cloud SDK to PATH."
  }
} else {
  $gcloud = $gcloud.Source
}

function Invoke-Gcloud {
  & $gcloud @args
  if ($LASTEXITCODE -ne 0) {
    throw "gcloud failed with exit code $LASTEXITCODE"
  }
}

$values = @{}

foreach ($envFile in @(
  (Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"),
  (Join-Path $PSScriptRoot ".env.local")
)) {
  if (-not (Test-Path $envFile)) {
    continue
  }

  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $parts = $line.Split("=", 2)
    $values[$parts[0].Trim()] = $parts[1].Trim()
  }
}

foreach ($name in @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")) {
  if (-not $values[$name]) {
    throw "Missing $name in .env.local or backend/.env.local"
  }
}

$googleClientId = if ($values["GOOGLE_CLIENT_ID"]) {
  $values["GOOGLE_CLIENT_ID"]
} else {
  $values["VITE_GOOGLE_CLIENT_ID"]
}

if (-not $googleClientId) {
  throw "Missing GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID in .env.local or backend/.env.local"
}

$snapshotId = if ($values["SUPABASE_SNAPSHOT_ID"]) { $values["SUPABASE_SNAPSHOT_ID"] } else { "default" }

$cloudRunEnv = @{
  STORAGE_BACKEND = "supabase"
  SUPABASE_URL = $values["SUPABASE_URL"]
  SUPABASE_SERVICE_ROLE_KEY = $values["SUPABASE_SERVICE_ROLE_KEY"]
  SUPABASE_SNAPSHOT_ID = $snapshotId
  CORS_ALLOWED_ORIGIN_PATTERNS = $CorsAllowedOriginPatterns
  GOOGLE_CLIENT_ID = $googleClientId
}

$cloudRunEnvFile = Join-Path ([System.IO.Path]::GetTempPath()) "markdown-maps-cloud-run-env-$([Guid]::NewGuid()).yaml"

try {
  $cloudRunEnv.GetEnumerator() | Sort-Object Name | ForEach-Object {
    "$($_.Name): $($_.Value | ConvertTo-Json -Compress)"
  } | Set-Content -Path $cloudRunEnvFile -Encoding UTF8

  Invoke-Gcloud config set project $ProjectId --quiet
  Invoke-Gcloud config set run/region $Region --quiet
  Invoke-Gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --quiet

  Invoke-Gcloud run deploy $ServiceName `
    --source $PSScriptRoot `
    --region $Region `
    --allow-unauthenticated `
    --env-vars-file $cloudRunEnvFile `
    --quiet
} finally {
  Remove-Item -LiteralPath $cloudRunEnvFile -Force -ErrorAction SilentlyContinue
}
