# PrithviQ AI API Keys and Environment Variables

This document explains where to get every key or connection value used by the PrithviQ backend.

## Important: What You Need Right Now

For the currently implemented health endpoints, you do **not** need any external API key.

You only need the backend dependencies installed and the API running:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

The backend health check works without database, Redis, storage, or model credentials.

Do not send secret values through chat and do not commit them to GitHub. Copy [backend/.env.example](backend/.env.example) to `backend/.env` and put secret values there.

## Quick Status Table

| Variable | Needed now? | Needed for | Secret? | Where it comes from |
|---|---:|---|---:|---|
| `JWT_SECRET` | No | Login and authentication | Yes | Generate locally with a cryptographically secure command |
| `DATABASE_URL` | No | PostgreSQL/PostGIS persistence | Yes | Local Docker, Supabase, Neon, Railway, or managed PostgreSQL |
| `REDIS_URL` | No | Analysis queue, caching, and rate limits | Usually | Local Docker, Redis Cloud, Upstash, or managed Redis |
| `OBJECT_STORAGE_ENDPOINT` | No | Image and report storage | No | MinIO locally, AWS S3, Cloudflare R2, or another S3 provider |
| `OBJECT_STORAGE_BUCKET` | No | Private object bucket name | No | You create this bucket in the storage provider |
| `OBJECT_STORAGE_ACCESS_KEY` | No | Object-storage authentication | Yes | S3/MinIO/R2 access credentials |
| `OBJECT_STORAGE_SECRET_KEY` | No | Object-storage authentication | Yes | S3/MinIO/R2 secret credentials |
| `MODEL_REGISTRY_URL` | No | Real AI model service | No | Your model server or registry URL |
| `MODEL_REGISTRY_TOKEN` | No | Private model registry access | Yes | Your model provider or registry |
| `NOMINATIM_BASE_URL` | No | Region boundary lookup | No | Default public Nominatim URL |
| `NOMINATIM_USER_AGENT` | No | Identifies your backend to Nominatim | No | You define this string |
| `SENTRY_DSN` | No | Optional error monitoring | No | Sentry project settings |
| `VITE_API_BASE_URL` | No | Frontend-to-backend connection | No | You define this URL locally |

## 1. `JWT_SECRET`

### Purpose

Signs and verifies login access tokens and refresh-token sessions.

### How to get it

You do not get this from a website. Generate it locally.

PowerShell:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

If the default `python` command is unavailable, use the Python executable configured for your machine.

Example `.env` value:

```env
JWT_SECRET=paste-the-generated-random-value-here
```

Requirements:

- Use at least 32 random bytes.
- Never use `password`, `secret`, or a predictable phrase.
- Never expose it to the frontend.
- Rotate it after a suspected leak. Rotating it invalidates existing tokens.

## 2. `DATABASE_URL`

### Purpose

Connects the API to PostgreSQL. PostGIS is required for geographic boundaries and result polygons.

### Local development: Docker PostgreSQL/PostGIS

Use a PostGIS image in Docker Compose:

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: prithviq
      POSTGRES_PASSWORD: change-this-local-password
      POSTGRES_DB: prithviq
    ports:
      - "5432:5432"
```

Then use:

```env
DATABASE_URL=postgresql+asyncpg://prithviq:change-this-local-password@localhost:5432/prithviq
```

### Hosted options

You can create a PostgreSQL/PostGIS database from:

- Supabase: create a project and copy the database connection string.
- Neon: create a project and copy the pooled connection string.
- Railway: add a PostgreSQL service and copy its connection variable.
- AWS RDS or another managed PostgreSQL provider: create a database and enable PostGIS.

Before using a hosted connection string, confirm that PostGIS is enabled:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

The database URL contains a password, so treat it as a secret.

## 3. `REDIS_URL`

### Purpose

Stores short-lived job state, rate-limit counters, and the analysis queue backend.

### Local development

```powershell
docker run --name prithviq-redis -p 6379:6379 -d redis:7
```

Then use:

```env
REDIS_URL=redis://localhost:6379/0
```

### Hosted options

- Redis Cloud: create a database and copy its connection URL.
- Upstash Redis: create a database and copy the Redis URL.
- Railway or another cloud provider: create a Redis service and copy the URL.

A Redis URL may contain a password. Keep it private.

## 4. S3-Compatible Object Storage

The upload workflow stores original satellite files, normalized rasters, GeoJSON evidence, previews, and reports in private object storage.

Required variables:

```env
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=prithviq-private
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=
```

### Option A: MinIO for local development

Start MinIO:

```powershell
docker run --name prithviq-minio -p 9000:9000 -p 9001:9001 -d `
  -e MINIO_ROOT_USER=minioadmin `
  -e MINIO_ROOT_PASSWORD=change-this-local-password `
  quay.io/minio/minio server /data --console-address ":9001"
```

Create a bucket named `prithviq-private` in the MinIO console at `http://localhost:9001`.

Use:

```env
OBJECT_STORAGE_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_BUCKET=prithviq-private
OBJECT_STORAGE_ACCESS_KEY=minioadmin
OBJECT_STORAGE_SECRET_KEY=change-this-local-password
```

These values are local development credentials only.

### Option B: Amazon S3

1. Open AWS Console.
2. Create a private S3 bucket.
3. Create an IAM user or workload identity with access limited to that bucket.
4. Generate an access key only if workload identity is not available.
5. Store the access key and secret in the deployment secret manager.

Use an endpoint appropriate to your AWS region, or leave the endpoint empty if the backend SDK uses the standard AWS endpoint.

Never use an AWS root-account access key.

### Option C: Cloudflare R2

1. Open Cloudflare Dashboard.
2. Create an R2 bucket.
3. Create an R2 API token with access limited to that bucket.
4. Copy the S3-compatible endpoint, access key ID, and secret access key.

R2 uses an S3-compatible endpoint, so it can use the same configuration fields.

## 5. `MODEL_REGISTRY_URL` and `MODEL_REGISTRY_TOKEN`

### Purpose

These values are only needed when the real AI analysis workers are connected.

```env
MODEL_REGISTRY_URL=https://your-model-service.example.com
MODEL_REGISTRY_TOKEN=
```

Possible sources:

- A self-hosted FastAPI or TorchServe inference service.
- Hugging Face private model access token.
- AWS SageMaker endpoint.
- Google Vertex AI endpoint.
- Azure Machine Learning endpoint.
- A private model registry used by your team.

For a public local model running on the same machine, a token may not be needed:

```env
MODEL_REGISTRY_URL=http://localhost:8001
MODEL_REGISTRY_TOKEN=
```

Do not place model tokens in React variables such as `VITE_MODEL_REGISTRY_TOKEN`. Any `VITE_` value is exposed to the browser bundle.

## 6. Nominatim Configuration

### Purpose

The frontend currently uses Nominatim directly for city boundaries. Production should proxy this request through the backend so caching, attribution, rate limiting, and provider policy are controlled centrally.

Default URL:

```env
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
```

Nominatim generally does not require an API key for permitted usage. It does require a descriptive user agent:

```env
NOMINATIM_USER_AGENT=PrithviQ/1.0 contact:your-email@example.com
```

Use a real project identity and contact address. Follow the provider's current usage policy, cache responses, and avoid bulk or uncontrolled requests.

A provider API key is only needed if you replace Nominatim with a commercial geocoding or boundary provider such as Mapbox, HERE, Google Maps, or Esri. Add that provider's key to a backend-only variable if you make that change.

## 7. `SENTRY_DSN` (Optional)

### Purpose

Sends backend errors and diagnostic events to Sentry.

### How to get it

1. Create an account at Sentry.
2. Create a Python/FastAPI project.
3. Open the project settings.
4. Copy the DSN.

Set it only in the backend environment:

```env
SENTRY_DSN=https://public-key@o0.ingest.sentry.io/project-id
```

A DSN is not equivalent to an admin password, but it should still not be exposed unnecessarily.

## 8. `VITE_API_BASE_URL`

### Purpose

Tells the React frontend where the FastAPI backend is running.

Local development:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Production example:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api/v1
```

This is not a secret. It is safe to use in the frontend.

## 9. Map Tile Credentials

The current frontend uses public Carto and Esri tile URLs. No key is currently configured for those URLs.

For production, check each provider's terms and attribution requirements. If you switch to a provider that requires a key:

- Store the key in a backend proxy where possible.
- If the browser must receive it, use a restricted public key limited by domain and allowed APIs.
- Never use a private server credential in `VITE_` variables.

Potential providers include Mapbox, MapTiler, Google Maps, and commercial Esri services.

## 10. Suggested Local `.env`

This is a development template, not a set of real credentials:

```env
APP_NAME=PrithviQ API
APP_ENV=development
API_PREFIX=/api/v1
ALLOWED_ORIGINS=http://localhost:5173

JWT_SECRET=generate-a-random-value-locally
JWT_ISSUER=prithviq-api
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=14

DATABASE_URL=postgresql+asyncpg://prithviq:local-password@localhost:5432/prithviq
REDIS_URL=redis://localhost:6379/0

OBJECT_STORAGE_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_BUCKET=prithviq-private
OBJECT_STORAGE_ACCESS_KEY=minioadmin
OBJECT_STORAGE_SECRET_KEY=local-minio-password

MODEL_REGISTRY_URL=http://localhost:8001
MODEL_REGISTRY_TOKEN=
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=PrithviQ/1.0 contact:your-email@example.com
SENTRY_DSN=
```

Frontend `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 11. Secret Storage Rules

- Never commit `.env`, `.env.local`, cloud credentials, JWT secrets, or database passwords.
- Keep `.env.example` placeholders only.
- Use GitHub Actions secrets, Vercel environment variables, AWS Secrets Manager, Azure Key Vault, or another deployment secret manager in production.
- Use different credentials for development, staging, and production.
- Restrict storage credentials to the required bucket and operations.
- Rotate credentials after accidental exposure.
- Redact credentials from logs and error reports.
- Do not paste secrets into issue trackers, screenshots, or chat.

## 12. What to Provide to the Developer

You do not need to provide every key immediately. The implementation can proceed in this order:

### Now: health API

No keys required.

### Upload and persistence stage

Provide through a private environment or secret manager:

- `DATABASE_URL`
- `REDIS_URL`
- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY`
- `OBJECT_STORAGE_SECRET_KEY`

### Authentication stage

Generate and configure:

- `JWT_SECRET`

### Real AI stage

Provide:

- `MODEL_REGISTRY_URL`
- `MODEL_REGISTRY_TOKEN`, only if the model service is private

### Production operations stage

Optional:

- `SENTRY_DSN`
- Any restricted commercial map or geocoding provider key

Never provide secret values directly in conversation. Configure them in the local `backend/.env` file or your deployment platform.
