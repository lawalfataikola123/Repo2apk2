# Backend deployment checklist

The API now requires account authentication for build creation, build status, history, and deletion.

## Required production environment

- `NODE_ENV=production`
- `JWT_SECRET`: random secret, at least 32 characters. Generate one with `openssl rand -hex 32`.
- `CLIENT_URL`: exact HTTPS origin of the deployed web client.
- `PORT`: supplied by the hosting platform.

## Private GitHub source repositories

Set `GITHUB_TOKEN` to a fine-grained GitHub token with **Contents: Read-only** access to the source repositories that users need to build. Do not put the token in a repository URL, frontend code, or commit it to Git.

## Persistence

The JSON stores are intended for a **single backend instance**. Mount persistent storage at `server/data` so accounts and build history survive redeploys. Mount `builds/` as persistent storage if generated APKs must survive restarts. For multiple server instances, migrate these stores to a shared database and shared artifact storage.

## Deployment note

These source changes do not automatically configure hosting environment variables or storage volumes. After setting the variables and mounts, redeploy the backend and verify `GET /api/health`, account registration/login, authenticated build submission, and APK download.

## Flutterwave plans

The checkout offers the previously selected plans: **$5 monthly for 30 days** and **$20 lifetime**. Monthly purchases extend an active monthly expiry by 30 days; lifetime access does not expire and supersedes monthly access.

Configure these backend-only environment variables:

- `FLW_SECRET_KEY`: Flutterwave secret key. Use test-mode keys first, then live keys after successful testing. Never expose this value to the client or commit it.
- `FLW_SECRET_HASH`: webhook secret hash configured in the Flutterwave dashboard.
- `API_BASE_URL`: public HTTPS backend origin, without a trailing slash, used for the payment callback.
- `CLIENT_URL`: public HTTPS frontend origin.

Set the Flutterwave webhook URL to `https://YOUR_API_HOST/api/payment/webhook` and use the same secret hash. The backend verifies transaction ID, reference, successful status, currency, and amount with Flutterwave before activating a plan. Configure the environment variables in the hosting provider, not in Git.
