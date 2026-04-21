# ─── Build stage ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copier tous les manifests pour que npm workspaces puisse résoudre
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY mobile/package.json ./mobile/

# Installe uniquement les workspaces nécessaires au serveur
# (évite de tirer Expo/React Native dans l'image)
RUN npm ci \
    --workspace=@touti/server \
    --workspace=@touti/shared \
    --include-workspace-root \
    --no-audit --no-fund

# Copier les sources et builder
COPY shared ./shared
COPY server ./server
RUN npm run build --workspace=@touti/shared
RUN npm run build --workspace=@touti/server

# ─── Runtime stage ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# On ne copie que ce qui sert à exécuter
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared ./shared

EXPOSE 2567
CMD ["node", "server/dist/index.js"]
