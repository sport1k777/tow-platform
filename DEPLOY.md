# Deploy

Push to `main` deploys to the VPS at `/opt/tow24`.

This app is Expo web + NestJS (not Next.js). The root `Dockerfile` builds the web image and exposes **3000**. The API and Postgres are in `docker-compose.prod.yml`. Local `docker-compose.yml` stays as Postgres-on-5433 for development — do not replace it.

## GitHub Secrets

Add these in the GitHub repo:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | What to put |
| --- | --- |
| `SERVER_HOST` | VPS IP or hostname |
| `SERVER_USER` | Linux user that owns `/opt/tow24` and can run Docker |
| `SERVER_SSH_KEY` | Private SSH key for that user (full PEM, including BEGIN/END lines) |

`SERVER_SSH_KEY` is only the **private** key. Put the matching **public** key in the VPS `~/.ssh/authorized_keys`. Never commit the private key or `.env`.

On the VPS, clone this repo to `/opt/tow24` and create `/opt/tow24/.env` (copy `.env.docker.example`). Manual fallback: `./deploy.sh`.
