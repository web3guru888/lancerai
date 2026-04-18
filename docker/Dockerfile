# ===================================
# LancerAI — Production Dockerfile
# (Alternate location: docker/Dockerfile)
# ===================================

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

FROM node:22-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S lancerai -u 1001

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --production

COPY --from=builder /app/dist/ ./dist/
COPY src/api/public/ ./dist/api/public/

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

USER lancerai

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/api/server.js"]
