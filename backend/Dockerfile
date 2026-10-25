# ==============================================================================
# Machine House (MH) ERP — Backend Lightweight Dockerfile
# Base: Node.js Latest Alpine Linux (Lightweight Footprint)
# ==============================================================================
FROM node:alpine AS runner

# Install dumb-init for clean process signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy package descriptors first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies and clean cache
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code
COPY server.js ./
COPY src/ ./src/

# Create uploads directory and set permissions for node user
RUN mkdir -p uploads && chown -R node:node /app

# Switch to non-root node user for security
USER node

EXPOSE 5000

# Dumb-init handles PID 1 forwarding & graceful shutdowns
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
