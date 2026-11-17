# Hidden Peak Dining

Hidden Peak Dining is a mobile-first restaurant operations workspace. It addresses a common communication problem in busy, multi-team workplaces: important updates are scattered across informal conversations, employees do not know which information applies to their team, and operational changes can be missed between shifts.

The app gives employees a shared place to communicate with their teams and see operational updates. Team message boards, role-aware announcements, notifications, and shared inventory records connect conversations to day-to-day work. The repository contains an Expo client, a NestJS API, a PostgreSQL data layer, and container and infrastructure definitions.

## How it improves employee communication

- **Team-specific context:** Employees see teams to which they belong and use a separate message board for each team. Access checks on both REST requests and realtime room joins prevent users from reading another team's communication.
- **A shared, persistent record:** Messages are saved in PostgreSQL rather than being limited to a transient conversation. Messages can be categorized (including announcements, urgent updates, and shift updates), replied to, pinned, and edited; deletion is soft so message history can be retained.
- **Faster awareness:** Socket.IO broadcasts new messages and operational events to authorized team rooms. In-app notifications are stored for recipients and can be marked read. Per-user notification preferences are checked before selected notifications are created.
- **Clear responsibility:** User roles (employee, manager, and administrator) and team membership roles control who can create teams, manage memberships, post special message types, and perform administrative actions.
- **Communication tied to operations:** Team assignments on inventory and a transaction history make stock changes visible alongside the teams responsible for them. This helps reduce missed handoffs and ambiguity about shared resources.

These features provide a common communication channel and a record of updates. They do not by themselves guarantee that every employee has read or acted on an update; workflows such as push delivery and offline message queuing are not currently implemented.

## Architecture

```text
Expo / React Native client (iOS, Android, web)
        | HTTPS/JSON REST: /api
        | Socket.IO: authenticated realtime events
        v
NestJS API (one deployable application)
  ├── Authentication and user/account management
  ├── Teams and memberships
  ├── Team messages and notifications
  ├── Inventory and transaction history
  └── Realtime gateway and transactional outbox publisher
        | Prisma ORM
        v
PostgreSQL (source of truth)

Optional Redis ── Socket.IO adapter for cross-instance event fan-out
```

### Client

`apps/mobile` is an Expo Router application built with React Native and TypeScript. The same client supports native mobile targets and web. Its screens cover sign-in/registration, home, team message boards, teams, inventory, profile, notifications, and manager/administrator workflows.

The client uses a small API module for REST calls, TanStack Query for server-state caching and refresh, and Zustand for authentication state. Access and refresh tokens are stored with Expo SecureStore on native platforms; the web build uses tab-scoped `sessionStorage`. The client refreshes an expired access token when possible. The realtime bridge joins the user's authorized team rooms and refreshes the relevant message, inventory, or notification data when events arrive.

### API and domain boundaries

`services/api` is a single NestJS application, not a collection of independently deployed microservices. Domain responsibilities are separated into controllers and providers for authentication, users, teams, messages, inventory, notifications, realtime events, and persistence. REST endpoints use the `/api` prefix; generated API documentation is served at `/api/docs`.

The API validates request DTOs, uses JWT authentication and role/membership authorization, and accesses PostgreSQL through Prisma. PostgreSQL is the source of truth; Redis is optional and is used by the Socket.IO adapter when configured, allowing events to be fanned out across API instances. Without Redis, realtime sockets work within a single API instance.

### Data model

The Prisma schema in `services/api/prisma/schema.prisma` defines the main entities:

- **Users and teams:** `User`, `Team`, and `TeamMembership` model employee accounts, teams, and membership-level permissions. Accounts and teams can be suspended/deactivated or archived without deleting all related records.
- **Communication:** `Message` stores team-scoped posts, message type, edit/delete timestamps, and parent-child replies. Related models represent reads and reactions. `Notification` stores user-specific updates and read status.
- **Inventory:** `InventoryItem` and `InventoryTeamAssignment` represent shared stock and team responsibility. `InventoryTransaction` records quantity changes, the actor, previous/new quantities, notes, and an idempotency key. A `NULL` quantity means the item has not been counted; it is different from zero.
- **Supporting records:** Refresh tokens support revocation, audit logs record selected administrative changes, and outbox events persist changes awaiting realtime publication.

### Realtime and reliable event flow

For a team message, the API first checks the sender's membership and permissions. It then writes the message, eligible notification records, and an outbox event in a database transaction. The outbox publisher periodically reads unpublished events and emits Socket.IO events to team rooms or individual user rooms. This keeps the saved message and the intent to publish it together, so a temporary publishing failure leaves an event available for retry. The client uses realtime events to refresh its saved server data.

Socket connections are authenticated with an access token. Team membership is checked before a socket can join `team:<id>`; user-specific notifications are sent to `user:<id>`. With `REDIS_URL` configured, the Socket.IO Redis adapter shares room events between API instances.

## Repository layout

```text
apps/mobile/                 Expo Router mobile and web client
services/api/                 NestJS API, Prisma schema, migrations, tests
docker-compose.yml            Local PostgreSQL and Redis
kube/                         Kubernetes frontend, API, and Redis manifests
k8s/                          Terraform configuration for Kubernetes resources
tf/                           Terraform configuration for AWS networking/compute
argo/                         Argo CD application definition
```

## Run locally

### Requirements

- Node.js 20 or newer and npm
- Docker Desktop (or local PostgreSQL 16 and Redis 7)
- Expo Go for device testing, or an iOS/Android simulator

### Setup

1. Copy `.env.example` to `services/api/.env` and `apps/mobile/.env.example` to `apps/mobile/.env`. Set unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values and configure `DATABASE_URL`. Keep local `.env` files out of source control.
2. Start local PostgreSQL and Redis:

   ```powershell
   docker compose up -d
   ```

3. Install dependencies and prepare the database:

   ```powershell
   npm install
   npm run db:generate
   npm run db:migrate -- --name initial
   npm run db:seed
   ```

   The seed creates the Front of House, Deli, and Private Dining teams if absent. It creates an administrator only when `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are configured.

4. Start the API and client in separate terminals:

   ```powershell
   npm run dev:api
   npm run dev:mobile
   ```

   The API listens on `http://localhost:3000`; Swagger is available at `http://localhost:3000/api/docs`. Set `EXPO_PUBLIC_API_URL` to an address reachable from the client. For Android emulators use `http://10.0.2.2:3000/api`; for physical devices use the host machine's LAN address.

## Containers and deployment

The backend and production web client each have a Dockerfile. Build from the repository root so npm can use the workspace lockfile:

```powershell
docker build -f services/api/Dockerfile -t hidden-peak-api:local .
docker build -f apps/mobile/Dockerfile.web --build-arg EXPO_PUBLIC_API_URL=https://example.com/api -t hidden-peak-frontend:local .
```

The production web image serves the exported Expo web app with Nginx and proxies `/api/` requests to the backend. `apps/mobile/Dockerfile.dev` is provided for running the Expo development server in a container. The API image does not bundle PostgreSQL or Redis; configure reachable database/cache URLs and secrets at runtime. Run Prisma migrations as a deployment step.

The repository also includes AWS Terraform configuration (`tf/`, `k8s/`), Kubernetes manifests (`kube/`), and an Argo CD application (`argo/`). These describe an intended deployment path using AWS infrastructure and Kubernetes. Treat them as deployment configuration that must be reviewed and completed for the target environment, not as a guarantee of a production-ready deployment. Before applying infrastructure or manifests, replace any inline credentials with managed secrets, rotate credentials that may have been committed, verify network access and TLS, and review database exposure, access policies, resource sizing, and image references.

## API and realtime interface

REST endpoints are under `/api`. The main routes include:

- `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/change-password`
- `GET/PATCH /api/users/me`; manager directory at `GET /api/users`
- `GET/POST /api/teams` and team membership/management routes under `/api/teams/:id`
- `GET/POST /api/teams/:id/messages`; replies, edits, pinning, reads, reactions, and deletion under `/api/messages/:id`
- Inventory routes under `/api/inventory`, including `/adjust`, `/set-quantity`, and item `/history`
- `GET /api/notifications` and notification read routes under `/api/notifications`
- `GET /api/health` and `GET /api/docs`

Socket.IO connects to the API origin. The client supplies the access token in the connection `auth.token` field, then emits `team.join` with a team ID. The gateway authorizes team-room membership and broadcasts events such as `message.created` and `inventory.updated`; user notifications are emitted as `notification.created`.

## Tests and checks

```powershell
npm test --workspace @hidden-peak/api
npm run typecheck --workspace @hidden-peak/mobile
```

With the API and database running, the integration checks are available through `npm run test:integration` and `npm run test:realtime`. They require the configured administrator credentials; the realtime check also requires credentials for an active team member. The tests exercise concurrent/idempotent inventory updates and authorization of realtime team rooms.

## Current scope

The project implements the core team communication and restaurant operations flows, but is still a development foundation rather than a complete production system. In particular, device-token storage does not yet provide push-notification delivery, offline operation queuing is not implemented, audit coverage is partial, and broader end-to-end testing and production deployment hardening remain. The API domains are logically separated within one application; independently deployable services are not currently provided. See [agentReadMe.md](./agentReadMe.md) for additional project context.
