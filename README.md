# Portfolio Admin

A full-stack portfolio website with public frontend and private admin dashboard. Upload ZIP files or register Git repos, preview, deploy to Netlify or Vercel, manage versions with rollback, and stream build logs in real-time.

## Features

- **Public portfolio** — visitors see published projects with links to live sites
- **Admin dashboard** — JWT-authenticated panel at `/admin`
- **ZIP upload** — drag-and-drop ZIP files, auto-extracted to cloud storage
- **Git integration** — register repos by URL for deployment
- **Netlify & Vercel deploy** — one-click deploy with auto site creation
- **Versioning** — every upload creates a version; rollback to any previous version
- **Build logs** — real-time log streaming via Server-Sent Events
- **Cloud storage** — Vercel Blob (default) or AWS S3/CloudFront

## Quick Start (Local)

```bash
cd portfolio-admin
npm install
cp .env.example .env        # fill in your values
npm run setup               # create admin user
npm run dev                 # http://localhost:3000
```

- **Portfolio:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Admin:** http://localhost:3000/admin

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "init"
gh repo create portfolio-admin --public --push
```

### 2. Import on Vercel

Go to [vercel.com/new](https://vercel.com/new) and import your repo.

### 3. Add Integrations

In your Vercel project dashboard:

**Storage — Add Vercel Postgres:**
- Go to Storage tab → Create → Postgres
- The `POSTGRES_URL` env var is set automatically

**Storage — Add Vercel Blob:**
- Go to Storage tab → Create → Blob
- The `BLOB_READ_WRITE_TOKEN` env var is set automatically

### 4. Set Environment Variables

In Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | A random 32+ character string |
| `STORAGE_PROVIDER` | `blob` |
| `NETLIFY_TOKEN` | *(optional)* Your Netlify token |
| `VERCEL_TOKEN` | *(optional)* Your Vercel token |

### 5. Deploy

Push to main — Vercel auto-deploys.

### 6. Create Admin User

```bash
# Locally (pointing to your Vercel Postgres)
POSTGRES_URL="your-vercel-postgres-url" npm run setup
```

Or visit `/login` — if no users exist, you'll be prompted to create one.

## Deploy to Netlify

Netlify supports Next.js via the [Next.js Runtime](https://docs.netlify.com/integrations/frameworks/next-js/).

```bash
npm i -D @netlify/plugin-nextjs
```

Add `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Set environment variables in Netlify dashboard (same as above).

**For storage on Netlify,** use `STORAGE_PROVIDER=s3` with AWS S3 (see below).

## AWS S3 / CloudFront Storage

Instead of Vercel Blob, you can use S3:

1. Create an S3 bucket
2. Create a CloudFront distribution pointing to the bucket
3. Set env vars:

```
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket-name
CLOUDFRONT_DOMAIN=d1234.cloudfront.net
```

4. Set the S3 bucket policy to allow CloudFront access:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFront",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-bucket-name/*"
  }]
}
```

## Project Structure

```
portfolio-admin/
├── app/
│   ├── layout.jsx          Root layout
│   ├── globals.css         Global styles (dark theme)
│   ├── page.jsx            Public portfolio homepage
│   ├── login/page.jsx      Login + first-time setup
│   ├── admin/page.jsx      Admin dashboard (client component)
│   └── api/
│       ├── auth/login/     POST — sign in
│       ├── auth/me/        GET — current user
│       ├── setup/          GET/POST — DB init + create admin
│       ├── sites/          GET — list, POST — create from git
│       ├── sites/upload/   POST — create site from ZIP
│       ├── sites/[id]/     GET, PATCH, DELETE
│       ├── sites/[id]/upload/   POST — new version from ZIP
│       ├── sites/[id]/deploy/   POST — deploy to Netlify/Vercel
│       ├── sites/[id]/versions/ GET — list versions
│       ├── sites/[id]/rollback/[versionId]/ POST — rollback
│       ├── logs/           GET — all recent logs
│       └── logs/[siteId]/  GET (JSON/SSE), DELETE
├── lib/
│   ├── db.mjs              Vercel Postgres setup + schema
│   ├── auth.mjs            JWT generation + verification
│   ├── storage.mjs         Vercel Blob OR S3 storage abstraction
│   ├── logs.mjs            Logging + SSE event bus
│   └── utils.mjs           slugify, content-type helpers
├── scripts/
│   └── setup.mjs           CLI script to create admin user
├── package.json
├── next.config.js
└── jsconfig.json
```

## API Endpoints

All admin endpoints require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Sign in (public) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/setup` | Check if setup needed (public) |
| POST | `/api/setup` | Create first admin (public) |
| GET | `/api/sites?public=true` | List live sites (public) |
| GET | `/api/sites` | List all sites |
| POST | `/api/sites` | Create from Git URL |
| POST | `/api/sites/upload` | Create from ZIP |
| GET | `/api/sites/[id]` | Site detail + versions + logs |
| PATCH | `/api/sites/[id]` | Update metadata |
| DELETE | `/api/sites/[id]` | Delete site + files |
| POST | `/api/sites/[id]/upload` | Upload new version (ZIP) |
| POST | `/api/sites/[id]/deploy` | Deploy to Netlify/Vercel |
| GET | `/api/sites/[id]/versions` | List versions |
| POST | `/api/sites/[id]/rollback/[vId]` | Rollback |
| GET | `/api/logs` | Recent logs |
| GET | `/api/logs/[siteId]` | Site logs (add `?stream=true` for SSE) |
| DELETE | `/api/logs/[siteId]` | Clear logs |

## Security

- JWT authentication (24h expiry) on all admin routes
- Passwords hashed with bcrypt (10 rounds)
- ZIP-only file upload filter
- Path traversal protection in file operations
- `.git` and `__MACOSX` entries filtered from ZIP extraction
- First-time setup only allowed when zero users exist
- Public API only exposes sites with `status='live'`
