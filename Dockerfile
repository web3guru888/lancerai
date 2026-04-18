# ===================================
# PAYGENTIC — Production Dockerfile
# Autonomous AI Agent Freelancer
# Deploy via BuildWithLocus (Railway)
# ===================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install all deps (including dev for build)
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

# ===================================
# Production stage — minimal image
# ===================================
FROM node:22-alpine

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S paygentic -u 1001

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --production

# Copy built JS and static assets
COPY --from=builder /app/dist/ ./dist/
COPY src/api/public/ ./dist/api/public/

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

USER paygentic

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/api/server.js"]

# ===================================
# Runtime environment defaults
# (overrideable at runtime via BWL env vars)
# ===================================
ENV LOCUS_API_BASE=https://beta-api.paywithlocus.com/api
ENV AGENT_NAME=LancerAI
ENV DEMO_MODE=false
ENV LOCUS_API_KEY=claw_dev_395P_qh9loXtGEgnNuYVzW8HrfGQj0FO
