# Smile Scoring

Upload a photo and get a **0–100 smile score** worked out by Google's MediaPipe Face Landmarker, with the measurements and the calculation shown next to every result.

| | Link |
|---|---|
| **Frontend** (Vercel) | https://smileanalysis.vercel.app |
| **Backend API** (Render) | https://smile-scoring-assessment.onrender.com |
| **API docs** (Swagger) | https://smile-scoring-assessment.onrender.com/docs |

> The backend runs on Render's free plan, so it sleeps when idle. The first request after a quiet spell can take up to a minute while it wakes up and loads the MediaPipe model.

---

## Contents

- [Features](#features)
- [How the smile score works](#how-the-smile-score-works)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Security](#security)
- [Database](#database)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)

---

## Features

- **Accounts**: sign up and log in with email and password, or with Google.
- **Image upload**: drag and drop or pick JPG, PNG, WEBP or GIF images up to 10 MB each.
- **Smile analysis**: each upload is scored in the background by MediaPipe Face Landmarker. Uploads return straight away and the score fills in moments later.
- **Explainable results**: every score shows `mouthSmileLeft`, `mouthSmileRight` and the exact calculation.
- **Upload History**: a grid of past uploads with scores, a details page per image, and delete with confirmation.
- **Encrypted API traffic**: request and response values, and the images themselves, are AES-256-GCM encrypted and only decrypted in the browser.
- **Light and dark mode**, a collapsible sidebar, breadcrumbs, and a hamburger menu on phones.

## How the smile score works

MediaPipe Face Landmarker rates dozens of facial expressions ("blendshapes") from 0 to 1. Smile Scoring uses two of them:

| Blendshape | Meaning |
|---|---|
| `mouthSmileLeft` | how far the left corner of the mouth is pulled up |
| `mouthSmileRight` | how far the right corner of the mouth is pulled up |

```
score = (mouthSmileLeft + mouthSmileRight) / 2 × 100

e.g. (0.71 + 0.74) / 2 × 100 = 72.5
```

| Score | Label |
|---|---|
| 0–19 | No smile |
| 20–49 | Slight smile |
| 50–79 | Smiling |
| 80–100 | Big smile |

Both raw values are stored alongside the score. If a photo has several faces, the first one MediaPipe finds is scored. If no face is found, the upload is kept and marked "No face found". The score measures expression, not teeth or dental health.

## Architecture

```
Browser ──► Next.js on Vercel ──/api/* rewrite──► FastAPI on Render (Docker) ──► Neon Postgres
            smileanalysis.vercel.app                     │                      (data + images)
                                                         └────────────────────► Render Key Value (Redis)
                                                                                (rate limits, session cache,
                                                                                 analysis cache)
```

- The browser only ever talks to the Vercel domain. Next.js forwards `/api/*` to the backend, so the login cookie belongs to the frontend's domain and no CORS setup is needed.
- Smile analysis runs as a FastAPI background task inside the backend process. Analyses left pending by a restart are resumed on startup.
- Images are stored in Postgres (`stored_files` table), so they survive Render deploys without a persistent disk.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy 2 (async) with asyncpg, Pydantic |
| Face analysis | MediaPipe Face Landmarker, Pillow, NumPy |
| Database | PostgreSQL (Neon in production) |
| Cache / rate limiting | Redis (Render Key Value in production) |
| Auth | Argon2 password hashing (pwdlib), opaque session tokens, Google OAuth 2.0 |
| Encryption | AES-256-GCM: `cryptography` on the server, Web Crypto in the browser |
| Hosting | Vercel (frontend), Render Docker web service (backend) |

## Project structure

```
.
├── backend/
│   ├── main.py                    # App setup, startup (tables, upgrades, model load)
│   ├── database.py                # Async engine; accepts Neon/Render-style URLs
│   ├── schema_upgrades.py         # Idempotent schema changes run on startup
│   ├── encryption_middleware.py   # Decrypts requests / encrypts JSON responses
│   ├── payload_crypto.py          # AES-256-GCM helpers
│   ├── cache.py                   # Shared Redis client
│   ├── ids.py                     # UUIDv7 generator
│   ├── download_model.py          # Fetches the Face Landmarker model
│   ├── Dockerfile
│   ├── users/                     # Accounts, sessions, login rate limit, Google OAuth
│   └── uploads/                   # Upload routes, image storage, MediaPipe analysis
└── frontend/
    └── src/
        ├── app/
        │   ├── (site)/            # Public pages: home, login, register
        │   └── (app)/             # Logged-in area: upload, upload history, details
        ├── auth/                  # Auth context, header account menu
        ├── components/            # Form field, score display, dialogs, Google button
        ├── lib/                   # API client, encryption, upload helpers
        ├── sidebar/               # Sidebar collapse state
        └── theme/                 # Light/dark mode
```

## Running locally

### Prerequisites

- **Python 3.13**
- **Node.js 22**
- **PostgreSQL** (any recent version)
- **Redis** (for example `brew install redis && brew services start redis`)

### Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python download_model.py     # downloads models/face_landmarker.task
cp .env.example .env                   # then fill it in (see below)
createdb smile_scoring
.venv/bin/fastapi dev main.py          # http://localhost:8000, docs at /docs
```

Tables are created automatically on first start.

Generate a payload key for `.env`:

```bash
python3 -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode())"
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_PAYLOAD_KEY=<same value as PAYLOAD_KEY>" > .env.local
npm run dev                            # http://localhost:3000
```

## Environment variables

### Backend (`backend/.env`, Render)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL. `postgresql://…?sslmode=require` (Neon) is converted automatically. Use Neon's **direct** endpoint, not `-pooler`. |
| `PAYLOAD_KEY` | yes | Base64-encoded 32-byte AES key. Must match the frontend's `NEXT_PUBLIC_PAYLOAD_KEY`. |
| `REDIS_URL` | yes | e.g. `redis://localhost:6379/0`, or Render Key Value's internal URL. |
| `COOKIE_SECURE` | yes | `false` locally, `true` in production (HTTPS-only cookies). |
| `GOOGLE_CLIENT_ID` | for Google sign-in | From Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | for Google sign-in | From Google Cloud Console. |
| `PUBLIC_URL` | for Google sign-in | The frontend's address, e.g. `http://localhost:3000` or `https://smileanalysis.vercel.app`. |

### Frontend (`frontend/.env.local`, Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_PAYLOAD_KEY` | yes | Same value as the backend's `PAYLOAD_KEY`. Baked in at build time. |
| `BACKEND_URL` | in production | e.g. `https://smile-scoring-assessment.onrender.com`. Defaults to `http://localhost:8000`. Read at build time. |

## API reference

All routes are under `/api` when called through the frontend. Request bodies and JSON responses are encrypted (see [Security](#security)). Interactive docs: [`/docs`](https://smile-scoring-assessment.onrender.com/docs). Endpoints that take a body can't be tried from there, because it sends unencrypted JSON.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | – | Create an account (email; password 8–128 chars with a letter, a number and a symbol) |
| `POST` | `/auth/login` | – | Log in; sets the `session` cookie. Rate limited. |
| `POST` | `/auth/logout` | – | Revokes the session and clears the cookie |
| `GET` | `/auth/me` | ✓ | The logged-in user |
| `GET` | `/auth/google/login` | – | Starts Google sign-in (browser redirect) |
| `GET` | `/auth/google/callback` | – | Google's return URL; logs in and redirects to `/upload` |
| `POST` | `/uploads` | ✓ | Upload an image (multipart: encrypted `filename` and `file`) |
| `GET` | `/uploads` | ✓ | Your uploads with smile results, newest first |
| `GET` | `/uploads/{id}` | ✓ | One upload with its smile result |
| `GET` | `/uploads/{id}/image` | ✓ | The image as encrypted bytes (supports ETag / 304) |
| `DELETE` | `/uploads/{id}` | ✓ | Delete an upload, its image and its analysis |

Smile results have a `status` of `pending`, `done` or `failed`.

## Security

- **Payload encryption**: JSON request values and response values are encrypted with AES-256-GCM (one random nonce per value; keys stay readable). Uploads are multipart with the file bytes and filename encrypted, and images are served as encrypted bytes. The browser decrypts them before display. The key ships in the frontend bundle, so this keeps data out of plain view; **HTTPS remains the real protection**.
- **Passwords** need 8–128 characters with at least one letter, one number and one symbol, and are hashed with Argon2. Failed logins take the same time whether or not the email exists.
- **Sessions** are random tokens in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only a SHA-256 hash is stored, and logout deletes it server-side, so a copied token stops working immediately.
- **Login rate limiting**: 5 failures per email and 20 per IP within 15 minutes, then HTTP 429 (Redis).
- **Uploads** are checked by their actual bytes, not filename or claimed type. Users can only see or delete their own images; anything else returns 404.
- **Google sign-in** uses a `state` check and only accepts verified Google emails.

## Database

| Table | Purpose |
|---|---|
| `users` | Accounts. `id` is a **UUIDv7**; `password_hash` is empty for Google-only accounts; `google_sub` links Google. |
| `sessions` | Hashed session tokens with expiry |
| `uploads` | Upload records (owner, filename, type, size) |
| `stored_files` | Image bytes, kept separate so listing uploads never loads them |
| `smile_analyses` | Status, `face_found`, `smile_left`, `smile_right`, `score` per upload |

Tables are created on startup, and `schema_upgrades.py` applies idempotent changes to existing databases, including converting integer user ids to UUIDv7 while preserving data. There's no migration tool yet; Alembic would be the next step if the schema keeps changing.

## Deployment

### Frontend: Vercel

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework | Next.js |
| Env vars | `BACKEND_URL`, `NEXT_PUBLIC_PAYLOAD_KEY` (set before building) |

### Backend: Render (Docker web service)

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Docker (`./Dockerfile`), needed for MediaPipe's graphics libraries |
| Build / Start command | empty (handled by the Dockerfile) |
| Env vars | `DATABASE_URL`, `REDIS_URL`, `PAYLOAD_KEY`, `COOKIE_SECURE=true`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_URL` |

Also on Render: a **Key Value** instance in the same region, and its internal URL as `REDIS_URL`.

### Database: Neon

Use the direct connection string (without `-pooler`) as `DATABASE_URL`. Keep Neon and Render in the same region (currently US East / Ohio).

### Google sign-in: Google Cloud Console

OAuth client of type *Web application*:

- **Authorised JavaScript origins**: `http://localhost:3000`, `https://smileanalysis.vercel.app`
- **Authorised redirect URIs**: `http://localhost:3000/api/auth/google/callback`, `https://smileanalysis.vercel.app/api/auth/google/callback`
