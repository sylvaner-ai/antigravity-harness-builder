# ==============================================================================
# Antigravity Harness Builder — Multi-stage Production Dockerfile (§8.4)
# Aucun secret ne doit être passé au moment du build ni intégré dans l'image
# ==============================================================================

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Installation des dépendances avec verrouillage strict
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# 2. Vérification TypeScript strict et Build de production Next.js (standalone)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run typecheck && npm run build
RUN npx esbuild src/db/migrate.ts --bundle --platform=node --format=cjs --external:pg --outfile=dist/migrate.cjs
RUN npx esbuild scripts/create-user.ts --bundle --platform=node --format=cjs --external:pg --outfile=dist/create-user.cjs

# 3. Image finale minimale d'exécution avec utilisateur non-root
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs \
 && mkdir -p /data/storage \
 && chown -R nextjs:nodejs /data/storage

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000

# Les migrations passent avant le démarrage du serveur : le schéma est à jour avant le contrôle de santé.
# Elles sont additives, donc sans risque pour l'ancien conteneur encore en service pendant la bascule.
CMD ["sh", "-c", "node dist/migrate.cjs && exec node server.js"]
