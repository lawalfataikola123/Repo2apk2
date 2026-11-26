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
