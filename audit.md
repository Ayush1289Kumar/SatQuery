# SatQuery / PrithviQ - Complete Codebase Audit
Date: 2026-09-10 | Branch: `backend` | Commit: `3fcc334`
Scope: backend/app, src, api.md, backend-integration.md, api_key.md, env/config, tests

> `image.png` is binary and cannot be rendered here, so Section 1 lists the 5 backend errors that MUST occur with current code. Match your screenshot to one of them.

## 0. TL;DR + Immediate Fixes

- Backend tests 42/42 pass, `tsc -b` clean. Prototype is coherent for demo, not production.
- `backend/app/config.py:43-47` sets `env_file=".env"`. From repo root that resolves to `<root>/.env` (missing), NOT `backend/.env`. So `AI_PROVIDER`, `GEMINI_API_KEY`, JWT/DB/Redis/S3 silently fall back to defaults (`mock`/`None`). This alone explains Gemini fallback answers and 503 readiness.
- `GET /api/v1/health/ready` is DESIGNED to 503: `backend/app/main.py:121 worker="not_configured"` always, plus any missing JWT/DB/Redis/S3 forces `not_ready`.
- Frontend `src/lib/api.ts` sends zero `Authorization` headers; backend `backend/app/deps.py:24-57` accepts any/no token when `DEMO_MODE=true`. Contract says `Bearer` but no JWT exists.
- Upload+AI is mock: hardcoded bbox/bands, fake 9s timeline, TIFF accepted at upload but skipped for Gemini, no persistence/queue/S3/GPU.
- HEAD commit `3fcc334 Added API keys` committed only 7x `__pycache__/*.pyc`, no source. Revert it. `backend/.env` is correctly gitignored and NOT tracked - keep it that way, rotate any key pasted in chat/screenshots.

## 1. Why This Error Occurs (image.png - 5 candidates)

### 1A. 503 on GET /api/v1/health/ready - EXPECTED
File backend/app/main.py:107-127. `worker` hardcoded `not_configured`; auth/db/redis/storage `not_configured` unless env set. `ready=all(...)` so default=503 `not_ready`. Tests assert this backend/tests/test_health.py:37-56. Fix: split liveness vs readiness in UI.

### 1B. NETWORK_ERROR / Cannot reach server - backend not running
File src/lib/api.ts:118-128,14. API_BASE defaults to http://localhost:8000/api/v1. No .env.local, no vite proxy (vite.config.ts:1-11). Wrong port/path or CORS mismatch -> NETWORK_ERROR. Fix: create .env.local, ensure uvicorn on 8000, retry UI.

### 1C. 415 UNSUPPORTED_MEDIA_TYPE on uploads/initiate
File backend/app/routers/uploads.py:17-49. Allowed tif/tiff->image/tiff, png->image/png, jpg/jpeg->image/jpeg. Ext must match MIME. Frontend src/App.tsx:319-325 falls back to `file.type||octet-stream` for webp/jp2/extensionless -> 415. See backend/tests/test_uploads.py:44-77. Fix: pre-validate, restrict picker.

### 1D. Gemini ignored / fallback answer
Chain: backend/app/config.py:30,43-47 env_file=.env never loads backend/.env from root -> stays mock; store.py:91,153-174 retains bytes only if gemini; ai.py:27,90-96 TIFF not supported, missing key -> used=False. backend/.env has gemini+key but ignored from root; 19MB cap drops large. Fix: env_file=backend/.env, log provider bool, transcode TIFF.

### 1E. 409 RESULT_NOT_READY / NO_ANALYSIS on results/latest
File backend/app/store.py:519-550. Mock 9s timeline vs 1s poll OK, but real-AI thread race + in-memory reset on reload -> 404/409. Fix: backoff, treat 409 as retry, persist store.


## 2. Repo Map (condensed)

- main.py: FastAPI + CORS allow_credentials+* + req-id middleware + health versioned.
- config.py: Settings + cors split + lru_cache.
- deps.py: DemoUser bypass when DEMO_MODE=true.
- schemas.py: Upload/Session/Analysis + envelope/problem.
- routers: mock initiate/PUT/complete/session/analysis/job/result lifecycle.
- store.py: RLock dicts + idempotency + unbounded AI threads + ensure_result on GET.
- worker.py: keyword router + fixed rings + 9s timeline.
- ai.py: lazy genai + sanitized errors + TIFF excluded.
- api.ts: typed client + resolveStorageUrl + poll 1s/180s via window.setTimeout.
- App.tsx: handleContinue/Analyze pipelines + fileContentType fallback.
- UploadScreen: slice drops extras, URLs never revoked. RegionMap: direct Nominatim. MapView: LayerGroup leak. report.ts: local TXT only. Tests 42 pass.

## 3. Critical P0

1. Env never loaded config.py:43-47 - fix env_file to backend/.env.
2. No real auth deps.py - add JWT.
3. In-memory store only - needs DB/Redis/S3/TTL.
4. Mock storage hardcoded geo - needs S3+raster validate.
## 4. Major P1

- Upload precheck missing; sequential uploads slow; no progress; sessionIdRef lost on reload; reset leaks URLs.
- Poller no backoff/jitter, random Idempotency-Key defeats retry, 180s fixed, no 401 refresh.
- Geometry: only first ring kept, Multi holes dropped, crash on Point/Line; popup raw HTML XSS if server-controlled.
- MapView adds LayerGroup per render, removes only latest; no fitBounds.
- RegionMap no UA, no persist cache, random fallback polygon misleading.
- Health envelope request_id local vs header req_ confusing.
- Docs drift: api.md says not implemented but mock exists; model defaults differ 2.0-flash vs 2.5-flash; VITE_DEMO false vs backend demo true.
- package lucide-react ^1.41.0 invalid (0.x real); npm build timeout on three.js bundle; no lint/CI/Docker/Sentry/rate-limit.

## 5. Security

- Rotate local Gemini key; never commit/paste; keep backend/.env ignored; rm pycache + fix message.
- Over-perm CORS + auth bypass + trusted content-length/filename + raw HTML = XSS/CSRF/DoS surface.
- Move Nominatim to backend proxy with UA+cache; keep Gemini server-only, no VITE_GEMINI_*.

## 6. Fix Plan Ordered

1. git rm --cached pycache, ignore it, rotate key, strip quotes/spaces.
2. config env_file backend/.env + startup provider log (no secrets).
3. .env.local VITE_API_BASE_URL + vite proxy + readiness banner + retry.
4. Pre-validate + parallel uploads + revoke URLs.
5. TIFF transcode or clear block + 19MB upfront.
6. JWT auth + frontend attach/refresh.
7. Persist DB/Redis/S3 + cancel + GET no side-effects.
8. Backend reports + region proxy; fix MapView cleanup/fitBounds/escape.
9. Pin deps, add pytest/httpx, lint, CI, Dockerfile.

## 7. Verification 2026-09-10

- pytest backend/tests -q = 42 passed. tsc -b clean. npm build timed out (large bundle, retry with longer timeout).
- git status ?? audit.md image.png; ls-files env only examples; check-ignore backend/.env ignored good.
