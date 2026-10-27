# syntax=docker/dockerfile:1

# Imagem base Debian (glibc + OpenSSL 3) para o engine do Prisma funcionar sem ajustes
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 1. Dependências (o postinstall roda "prisma generate", por isso o schema entra antes)
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
# --include=dev: o build precisa de typescript/tailwind mesmo se NODE_ENV=production vier do Coolify
RUN npm ci --include=dev

# 2. Build do Next.js (output: 'standalone')
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis NEXT_PUBLIC_* são embutidas no bundle durante o build.
# No Coolify, marque-as como "Build Variable".
ARG NEXT_PUBLIC_BRADESCO_ENV
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_OPENPIX_APP_ID
ARG NEXT_PUBLIC_OPENPIX_ENV
ARG NEXT_PUBLIC_PAGARME_API_KEY
ARG NEXT_PUBLIC_PAGARME_ENV
ARG NEXT_PUBLIC_PAGARME_KEY_PUBLIC
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV NEXT_TELEMETRY_DISABLED=1

# Alguns módulos (auth, Stripe, Resend) exigem segredos já na importação, que o
# "next build" executa. Valores fictícios só para este passo; em runtime valem os reais.
# NODE_ENV fixo em production: com "development" o Next quebra no prerender do /404.
RUN NODE_ENV=production \
    NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-build-placeholder}" \
    JWT_SECRET="${JWT_SECRET:-build-placeholder}" \
    STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_build_placeholder}" \
    RESEND_API_KEY="${RESEND_API_KEY:-re_build_placeholder}" \
    DATABASE_URL="${DATABASE_URL:-postgresql://build:build@localhost:5432/build}" \
    sh -c "npx prisma generate && npx next build"

# 3. Runtime
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    RUN_MIGRATIONS=false

# CLI do Prisma para aplicar migrações no start (mesma versão do package.json)
RUN npm install -g prisma@6.19.3 && npm cache clean --force

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Garante que o engine do Prisma (client em output customizado) esteja presente
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma

USER nextjs
EXPOSE 3000

# Migrações desativadas por padrão: o banco atual foi criado via "db push" e não tem
# histórico em _prisma_migrations. Ative com RUN_MIGRATIONS=true só após fazer o baseline.
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then prisma migrate deploy; fi && exec node server.js"]
