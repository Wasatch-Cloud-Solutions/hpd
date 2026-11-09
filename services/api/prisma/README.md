# Configure PostgreSQL on AWS RDS

This guide connects the NestJS API to an AWS RDS for PostgreSQL database and applies the database structure in this folder. Prisma is the source of truth:

- `schema.prisma` describes the database models, enums, and PostgreSQL connection.
- `migrations/` contains the versioned SQL changes Prisma applies, in timestamp order.
- `seed.ts` optionally inserts the starter teams and an administrator. It is not a schema migration.

Do not paste the migration SQL into the RDS query editor for a normal deployment. Use `prisma migrate deploy` so Prisma applies each migration once and records it in `_prisma_migrations`.

## 1. Create the RDS database

In the AWS Console, create an **Amazon RDS for PostgreSQL** database in the same VPC as the API:

1. Select a PostgreSQL engine version supported by RDS and compatible with the project's Prisma schema.
2. Set an initial database name, for example `hiddenpeak`. The database name in the connection URL must match this value.
3. Use a private DB subnet group and disable public access. Place the database in private subnets.
4. Configure a security group that allows inbound TCP port `5432` only from the security group used by the API's EKS worker nodes or pods. Do not allow access from `0.0.0.0/0`.
5. Enable automatic backups and choose a retention period appropriate for the environment. Store the database master password in AWS Secrets Manager.

If Terraform already created the RDS instance, use its endpoint, database name, VPC, and security group. Do not assume its endpoint or database name; check the deployed resource outputs and settings.

## 2. Configure network access

The API must be able to resolve and connect to the RDS endpoint over the VPC network:

- The RDS security group must allow port `5432` from the API workload's security group.
- Network ACLs and routes must allow the traffic between the private subnets.
- Keep RDS private; use VPN, a bastion, or an approved temporary tunnel for administrative access instead of making it public.

For EKS, confirm which security group is actually attached to the API's nodes or pods in your cluster. Allowing an unrelated cluster or VPC security group will not grant connectivity.

## 3. Set the API database URL

The Prisma datasource reads `DATABASE_URL` from the API process environment. Store it as a key in the Kubernetes Secret used by the API, in the same namespace as the API Deployment (the current manifests use `prod`). Use the RDS endpoint, database name, and a least-privilege application database user.

The URL format is:

```text
postgresql://DB_USER:URL_ENCODED_PASSWORD@RDS_ENDPOINT:5432/DB_NAME?schema=public&sslmode=require
```

Replace each placeholder with the matching RDS value. URL-encode special characters in the password (for example, `@` becomes `%40`). `sslmode=require` encrypts the connection; for stronger server identity verification, configure Prisma with the appropriate RDS CA certificate according to your deployment's certificate-management setup.

The Secret must contain a `DATABASE_URL` key. It should also contain the API's `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` keys; add `REDIS_URL` if the API should use Redis. Do not commit populated Secret manifests or credentials. Kubernetes Secrets are base64-encoded by default, not encrypted just by being Secrets; enable encryption at rest for the cluster and restrict RBAC access. For AWS-managed credentials, use an approved Secrets Manager-to-Kubernetes integration to create or refresh the namespaced Secret.

Reference the Secret from the API Deployment. Replace `backend-secrets` with the actual Secret name if yours differs:

```yaml
spec:
  template:
    spec:
      containers:
        - name: backend
          envFrom:
            - secretRef:
                name: backend-secrets
```

The Secret must exist in the same namespace as the Deployment. After changing or rotating its values, restart the API pods so they receive the new environment values. Never expose `DATABASE_URL` in the frontend or a ConfigMap.

For a local migration run, set `DATABASE_URL` in the current terminal from a secure source without writing it into the repository. Then run from the repository root:

```powershell
$env:DATABASE_URL = "postgresql://DB_USER:URL_ENCODED_PASSWORD@RDS_ENDPOINT:5432/DB_NAME?schema=public&sslmode=require"
```

## 4. Apply the Prisma migrations

In production, run migrations once as a Kubernetes Job or deployment-pipeline step before rolling out API replicas. The migration runner must use the same namespace and Secret as the API, and its image must contain the Prisma CLI, schema, and checked-in migrations. For example, adapt this Job to your migration image and actual Secret name:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: api-migrate
  namespace: prod
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: YOUR_MIGRATION_IMAGE
          workingDir: /app
          command:
            - npx
            - prisma
            - migrate
            - deploy
            - --schema
            - services/api/prisma/schema.prisma
          envFrom:
            - secretRef:
                name: backend-secrets
```

Use your deployment pipeline to create the Job and wait for it to complete before updating the API Deployment. Do not run migrations independently in every API container at startup. The example is a template: `YOUR_MIGRATION_IMAGE` must include the Prisma CLI and the repository's `services/api/prisma` files at the shown paths.

For a local migration run, install dependencies if they are not already installed:

```powershell
npm ci
npm run prisma:generate --workspace @hidden-peak/api
npx prisma migrate status --schema .\services\api\prisma\schema.prisma
npx prisma migrate deploy --schema .\services\api\prisma\schema.prisma
npx prisma migrate status --schema .\services\api\prisma\schema.prisma
```

`migrate deploy` applies the checked-in migrations without creating new ones.

The current migration history includes the initial schema and a later `token_version` column migration. Keep the whole `migrations/` directory with the deployed application version. Do not edit migrations that have already run in a shared environment; create a new migration for future schema changes.

## 5. Optional seed data

After migrations succeed, the optional seed command creates the starter teams. It creates an administrator only when `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are provided:

```powershell
npm run db:seed
```

Use a unique, strong administrator password supplied through a secret, and do not put production seed credentials in source control. The seed uses upserts for the initial teams and administrator, so it can be re-run, but decide whether creating an initial administrator is appropriate for the production environment.

## Troubleshooting

- **Connection timeout:** Check VPC/subnet routing, network ACLs, the RDS security-group ingress rule, and that the API or migration runner is in a network allowed to reach RDS.
- **Authentication failed:** Verify the username, password, URL-encoding, and database name. Rotate credentials if they were exposed.
- **TLS error:** Keep `sslmode=require`; if the deployment requires CA verification, provide the current AWS RDS CA bundle and configure the Prisma connection accordingly.
- **Migration reports drift or fails:** Review the exact Prisma error and database state before changing anything. Back up production data and avoid manually editing `_prisma_migrations`.

After deployment, keep automated backups enabled and test restoring them periodically.
