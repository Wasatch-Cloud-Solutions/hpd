# Hidden Peak Dining

Hidden Peak Dining is a mobile-first restaurant operations workspace. This repository contains an Expo/React Native client, a NestJS REST and Socket.IO API, and a PostgreSQL/Prisma data layer. The backend is organized into domain controllers (authentication, users, teams, messages, inventory, and notifications) so those domains can be split into deployable services later without changing the mobile API contracts.

## Requirements

- Node.js 20 or newer and npm
- Docker Desktop (or local PostgreSQL 16 and Redis 7)
- Expo Go for device testing, or an iOS/Android simulator

## Run locally

1. Copy `.env.example` to `services/api/.env` and `apps/mobile/.env.example` to `apps/mobile/.env`. Replace both JWT secrets and the seed administrator password with unique random values in the API file. Keep `.env` files out of source control.
2. Start the development data services: `docker compose up -d`.
3. Install packages: `npm install`.
4. Generate the Prisma client and apply the migration:

   ```powershell
   npm run db:generate
   npm run db:migrate -- --name initial
   npm run db:seed
   ```

   The seed creates Front of House, Deli, and Private Dining if absent. It creates an administrator only when `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set.
5. Start the API: `npm run dev:api`. Swagger is available at `http://localhost:3000/api/docs`.
6. In another terminal, start Expo: `npm run dev:mobile`. For a physical device, set `EXPO_PUBLIC_API_URL` to the host machine's LAN address (for example `http://192.168.1.20:3000/api`).

For Android emulators, use `http://10.0.2.2:3000/api` as the API URL. For iOS simulators, `http://localhost:3000/api` works.

## Build the backend container

The backend is currently one NestJS API service; its authentication, messaging, team, inventory, and notification domains are modules in that service. Build its production image from the repository root so npm can resolve the workspace lockfile:

```powershell
docker build -f services/api/Dockerfile -t hidden-peak-api:local .
```

Run it with the API's required secrets and database settings supplied through the environment (or an environment file that is not committed). `DATABASE_URL` and `REDIS_URL` must point to services reachable from the container; `localhost` inside the API container refers to the API container itself. The image does not include or start PostgreSQL or Redis; local development can continue using the official images in `docker-compose.yml`. Database migrations should be run as a deployment step, not automatically when the API container starts. The build context excludes environment files and `kube/`, including Kubernetes secrets.

## Build the frontend containers

The Expo client has a production web image and a separate development-server image. Build from the repository root so npm can resolve the workspace lockfile. The web API URL is embedded in the exported client at build time:

```powershell
docker build -f apps/mobile/Dockerfile.web --build-arg EXPO_PUBLIC_API_URL=https://api.example.com/api -t hidden-peak-frontend:local .
```

Run the production image on port 80. For mobile development, build and run the Expo server separately:

```powershell
docker build -f apps/mobile/Dockerfile.dev -t hidden-peak-mobile-dev:local .
docker run --rm -p 8081:8081 -e EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api hidden-peak-mobile-dev:local
```

Set `EXPO_PUBLIC_API_URL` to an address reachable from the browser or mobile device (replace the sample LAN address). Expo SecureStore is native-only; the web client stores its tokens in `sessionStorage`, which is cleared when its browser tab closes. For production browser authentication, prefer HttpOnly, Secure, SameSite cookies over JavaScript-accessible tokens.

## Implemented functionality

- Password-hashed employee registration and login, short-lived JWT access tokens, rotating/revocable refresh tokens, account status checks, and server-side role checks.
- Team discovery, manager team creation, membership assignment/removal, manager roles, and archival rather than destructive team deletion.
- Team-scoped message boards, replies, edits, pinning, pagination, and authenticated Socket.IO team rooms. Membership is checked before joining a room.
- Inventory creation with an unset (NULL) quantity, team assignments, search, archive, history, low-stock display, and quantity updates protected by PostgreSQL row locks and idempotency keys.
- PostgreSQL outbox records for message and inventory events; a publisher emits committed events through Socket.IO. Redis is used as the Socket.IO adapter when configured.
- Profile, employee directory for managers, account status/role management for administrators, in-app notifications, and Expo-ready mobile navigation.
- Expo SecureStore token persistence, automatic refresh on expired access tokens, TanStack Query server state, and a shared olive design system.
- Automated database-backed concurrency/idempotency and Socket.IO team-isolation smoke tests.

## API outline

All REST endpoints are under `/api`; authenticated endpoints use `Authorization: Bearer <accessToken>`.

- `GET /api/health`
- `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/change-password`
- `GET/PATCH /api/users/me`; manager directory at `GET /api/users`
- `GET/POST /api/teams`; team membership and archival routes under `/api/teams/:id`
- `GET/POST /api/teams/:id/messages`; message edit, reply, pin, and delete routes under `/api/messages/:id`
- `GET/POST /api/inventory`; item read/edit/archive, `/adjust`, `/set-quantity`, and `/history`
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`
- `GET /api/docs` for the generated OpenAPI/Swagger interface

The Socket.IO endpoint is the API origin. Send the access token in the connection `auth.token` field, then emit `team.join` with a team ID. Events are scoped to authorized team rooms (`message.created`, `inventory.updated`).

Run unit checks with `npm test --workspace @hidden-peak/api` and Expo type checks with `npm run typecheck --workspace @hidden-peak/mobile`. With the API and local database running, run concurrency checks using `npm run test:integration` and set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; realtime tests additionally need `TEST_MEMBER_EMAIL` / `TEST_MEMBER_PASSWORD` for an active team member.

## Data integrity and security notes

- PostgreSQL is the source of truth. Inventory quantity is nullable; NULL means not counted and is distinct from zero.
- Each adjustment requires a UUID `Idempotency-Key`. Updates lock the inventory row and record both quantities in an append-only transaction history.
- Team and inventory records are archived, and message records are soft-deleted; historical activity remains available.
- The API validates DTOs, uses parameterized Prisma operations, hashes passwords, restricts CORS unless `CORS_ORIGIN` is configured, applies Helmet, and rate-limits requests.
- Use TLS termination and a managed secrets store for a production deployment. AWS infrastructure and deployment automation are intentionally not included.

## Current development boundary

This is the working foundation for the requirements, not a claim that every requested production feature is finished. Push-notification delivery, offline operation queuing, exhaustive audit coverage, mobile reaction/read-receipt controls, complete manager/admin workflows, broader end-to-end coverage, and independently deployable service packaging still need implementation before production use. They should be completed in the phases described in [agentReadMe.md](./agentReadMe.md).
