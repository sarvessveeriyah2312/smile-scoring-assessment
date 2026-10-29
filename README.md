# Smile Scoring

Upload a photo and get a **0–100 smile score** worked out by Google's MediaPipe Face Landmarker, with the measurements and the calculation shown next to every result.

| | Link |
|---|---|
| **Frontend** (Vercel) | https://smileanalysis.vercel.app |
| **Backend API** (Render) | https://smile-scoring-assessment.onrender.com |
| **API docs** (Swagger) | https://smile-scoring-assessment.onrender.com/docs |

> The backend runs on Render's free plan, so it sleeps when idle. The first request after a quiet spell can take up to a minute while it wakes up and loads the MediaPipe model.

## Architecture

```
Browser ──► Next.js on Vercel ──/api/* rewrite──► FastAPI on Render (Docker) ──► Neon Postgres
            smileanalysis.vercel.app                     │                      (data + images)
                                                         └────────────────────► Render Key Value (Redis)
                                                                                (rate limits, session cache,
                                                                                 analysis cache)
```

- **Stack**: Next.js 16 (App Router), React 19, TypeScript and Tailwind on the frontend. FastAPI, async SQLAlchemy and MediaPipe on the backend, because the face-analysis libraries are Python-first.
- **One origin**: the browser only talks to the Vercel domain, and Next.js forwards `/api/*` to the backend. That keeps the login cookie first-party and means there's no CORS setup.
- **Auth**: email/password (Argon2) or Google. Sessions are random tokens in an `httpOnly` cookie, and only a hash is stored, so logout revokes them server-side. Failed logins are rate-limited in Redis.
- **Smile analysis**: uploads return straight away, and scoring runs as a background task. The score is `(mouthSmileLeft + mouthSmileRight) / 2 × 100`, and both raw values are shown with the result. Results are cached by image hash, and analyses left pending by a restart are resumed on startup.
- **Storage**: images are kept in Postgres, separate from upload records, so they survive Render deploys without a persistent disk.
- **Structure**: a monorepo with the frontend and backend side by side, each deployed on its own. The backend is grouped by feature (`users/`, `uploads/`). The frontend splits public pages `(site)` from the logged-in area `(app)`.
- **State**: one React context for the logged-in user and component state for everything else, plus polling while a score is pending. Nothing yet needs a state library.
- **Encryption**: request and response values and the images are AES-256-GCM encrypted between browser and server.

### Monorepo layout

```
.
├── frontend/                      # Next.js app → Vercel (root directory: frontend)
│   └── src/
│       ├── app/
│       │   ├── (site)/            # Public pages: home, login, register
│       │   └── (app)/             # Logged-in area: upload, upload history, details
│       ├── auth/                  # Auth context, header account menu
│       ├── components/            # Form field, score display, dialogs, Google button
│       ├── lib/                   # API client, encryption, upload helpers
│       ├── sidebar/               # Sidebar collapse state
│       └── theme/                 # Light/dark mode
└── backend/                       # FastAPI app → Render via Dockerfile (root directory: backend)
    ├── main.py                    # App setup, startup (tables, upgrades, model load)
    ├── database.py                # Async Postgres engine
    ├── cache.py                   # Shared Redis client
    ├── encryption_middleware.py   # Decrypts requests / encrypts JSON responses
    ├── payload_crypto.py          # AES-256-GCM helpers
    ├── schema_upgrades.py         # Idempotent schema changes run on startup
    ├── Dockerfile
    ├── users/                     # Accounts, sessions, login rate limit, Google OAuth
    └── uploads/                   # Upload routes, image storage, MediaPipe analysis
```

## Assumptions

- A "smile score" means how much the person is smiling, based on the mouth corners. It doesn't judge teeth, dental health or attractiveness.
- One face per photo is enough. When there are several, the first face found is scored.
- Users only ever see their own uploads. There are no admin, team or sharing features.
- Uploads are everyday photos: JPG, PNG, WEBP or GIF, up to 10 MB.
- The brief's encryption requirement is about keeping payloads out of plain view. Because the key ships in the frontend, HTTPS remains the real transport protection.
- Free-tier hosting is acceptable for a demo, including Render's cold start.
- The backend runs as a single instance, so in-process background tasks are enough.

## Next steps

1. **CI**: lint, type-check, tests and a Docker build on every pull request.
2. **Tests**: pytest with `httpx` for the API (auth flow, rate limit, ownership checks, score formula), Vitest and React Testing Library for components, and Playwright for the upload-to-score journey across browsers.
3. **Auth hardening**: restrict trusted proxy headers so the per-IP login limit can't be bypassed, add an `Origin` check on state-changing routes, security headers (CSP, HSTS), email verification, password reset and session rotation.
4. **Data**: Alembic migrations, images in object storage (S3 or similar) behind a CDN, and pagination on the upload list.
5. **Background work**: a proper queue (for example Arq or Celery on Redis) with a separate worker, retries and failure alerts.
6. **Operations**: pinned dependencies, structured logging, error tracking (Sentry), a health-check endpoint, and infrastructure as code (Terraform) with separate staging and production environments.

## What I'd do differently with more time

- **Write tests alongside the features.** I'd start from the first commit rather than leaving them for later. The scoring, auth and ownership rules are the parts most worth protecting.
- **Share types between frontend and backend.** I'd generate the TypeScript types from FastAPI's OpenAPI schema instead of writing them twice, ideally in a monorepo, so an API change breaks the frontend build rather than the running app.
- **Use migrations from day one.** Alembic would have replaced the hand-written schema upgrades.
- **Store images in object storage from the start**, rather than in Postgres to work around the hosting setup.
- **Rethink payload encryption.** A key shipped in the browser can't truly protect data. I'd rather rely on HTTPS and encrypt images at rest with server-held keys, unless the client specifically needs encryption in the browser.
- **Push status changes** with server-sent events instead of polling, and use TanStack Query on the frontend once more pages share the same data.
