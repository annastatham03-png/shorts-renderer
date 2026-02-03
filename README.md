# YouTube Channel Dashboard (Next.js + Supabase + Prisma)

Free-tier optimized dashboard for connecting a YouTube channel, tracking daily stats, managing a content queue, and manually uploading approved MP4s.

## Features
- Google OAuth login + YouTube channel connect (YouTube Data API v3).
- Dashboard with channel title, subscriber count, total views, and last 10 uploads.
- Daily snapshot table (stored once per day via GitHub Actions cron).
- Content Queue CRUD (topic, script, status: draft/review/approved).
- Upload Center for approved content with YouTube upload.
- Security: refresh-token encryption, rate-limited API routes, approval required for upload.

## Local setup
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Set environment variables**
   ```bash
   cp .env.example .env.local
   ```
3. **Configure Supabase**
   - Create a Supabase project and copy the Postgres connection string.
   - Update `DATABASE_URL` in `.env.local`.
4. **Run Prisma migrations**
   ```bash
   npx prisma migrate dev
   ```
5. **Run the app**
   ```bash
   npm run dev
   ```

## Supabase + Prisma setup
1. Create a Supabase project.
2. Grab the connection string from **Project Settings → Database**.
3. Add the connection string to `DATABASE_URL`.
4. Run `npx prisma migrate dev` locally to create tables.

## Google Cloud OAuth + YouTube Data API setup
1. Create a Google Cloud project.
2. Enable **YouTube Data API v3**.
3. Configure OAuth consent screen and add scopes:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.upload`
4. Create OAuth credentials for a Web application.
5. Add redirect URI:
   - `https://your-domain.com/api/auth/callback/google`
6. Copy the Client ID/Secret into `.env.local`.

## Daily snapshot cron (GitHub Actions)
A GitHub Actions workflow calls the snapshot API route daily using a secret header.
- Set `SNAPSHOT_CRON_SECRET` in `.env.local` and in the GitHub repo secrets.
- Set `SNAPSHOT_ENDPOINT` in GitHub repo secrets (e.g. `https://your-domain.com/api/snapshots`).

## Deployment guide (Vercel + Supabase)
1. **Push to GitHub** and create a new Vercel project.
2. **Set environment variables** in Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
   - `ENCRYPTION_KEY`
   - `SNAPSHOT_CRON_SECRET`
3. **Set Google OAuth redirect URI** to Vercel domain:
   - `https://your-vercel-domain.com/api/auth/callback/google`
4. **Run Prisma migrations**
   - Use `npx prisma migrate deploy` in Vercel build or manually.
5. **Configure GitHub Actions secret**
   - `SNAPSHOT_CRON_SECRET` for the cron workflow.

## API routes
- `POST /api/snapshots` — cron-triggered daily snapshot (requires `x-cron-secret`).
- `GET/POST /api/content-queue` — list/create content queue items.
- `PATCH/DELETE /api/content-queue/:id` — update/delete content queue items.
- `POST /api/upload` — upload approved MP4 to YouTube.

## Security notes
- Refresh tokens are encrypted with AES-256-GCM using `ENCRYPTION_KEY`.
- API routes enforce a simple in-memory rate limit (replace with Redis in production).
- Uploads require content items to be `approved` before proceeding.
