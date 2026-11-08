FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY services/api/package.json ./services/api/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json

RUN npm ci --workspace @hidden-peak/api --include-workspace-root=false

COPY services/api ./services/api

RUN npm run prisma:generate --workspace @hidden-peak/api \
    && npm run build --workspace @hidden-peak/api

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/services/api/package.json ./services/api/package.json
COPY --from=build /app/apps/mobile/package.json ./apps/mobile/package.json
COPY --from=build /app/services/api/prisma ./services/api/prisma

RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true \
    npm ci --omit=dev --workspace @hidden-peak/api --include-workspace-root=false

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/services/api/dist ./services/api/dist

WORKDIR /app/services/api
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER node
CMD ["node", "dist/src/main.js"]
