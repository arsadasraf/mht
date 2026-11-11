# ==============================================================================
# Machine House (MH) ERP — Backend Lightweight Dockerfile
# Base: Node.js 20 Alpine Linux (with Prisma Engine & OpenSSL Support)
# ==============================================================================
FROM node:20-alpine AS runner

# Install dumb-init for PID 1 signal forwarding and openssl for Prisma query engine
RUN apk add --no-cache dumb-init openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# 1. Copy package manifests and Prisma schemas first
COPY package*.json ./
COPY prisma/ ./prisma/

# 2. Install all dependencies (so Prisma CLI is available for code generation)
RUN npm ci

# 3. Generate Prisma Client specifically for the Alpine Linux musl runtime
RUN npx prisma generate

# 4. Prune devDependencies to keep the final image minimal
RUN npm prune --production && npm cache clean --force

# 5. Copy server and application source code
COPY server.js ./
COPY src/ ./src/

# 6. Ensure uploads directory exists with non-root node ownership
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 5000

# Dumb-init handles PID 1 forwarding & graceful shutdowns
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
