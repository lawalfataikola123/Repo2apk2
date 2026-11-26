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

## Flutterwave payments

Configure these backend-only environment variables before enabling checkout:

- `BUILD_PRICE_NGN`: price for one APK build, as a whole-number NGN amount (for example `500`). Choose your own price; the code does not hardcode one.
- `FLW_SECRET_KEY`: Flutterwave secret key. Use test-mode keys for testing, then live keys after verification. Never expose this value to the client or commit it.
- `FLW_SECRET_HASH`: webhook secret hash configured in the Flutterwave dashboard.
- `API_BASE_URL`: public HTTPS backend origin, without a trailing slash, used for the payment callback.

Set the Flutterwave webhook URL to `https://YOUR_API_HOST/api/payment/webhook` and use the same secret hash. Payment confirmation is verified against Flutterwave's transaction API before one build credit is granted. Configure `BUILD_PRICE_NGN`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, and `API_BASE_URL` in the host's environment settings.
