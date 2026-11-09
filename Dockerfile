# ==============================================================================
# ديوان السعادة – نغم يجمعنا | منصة الطرب والتراث اليمني الأصيل
# Dockerfile Production Build
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build Vite frontend production bundle
RUN npm run build

# ==============================================================================
# Production Runtime Stage
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --only=production --legacy-peer-deps && npm install -g tsx

# Copy built frontend assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/metadata.json ./metadata.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Persistent volume for database and dynamic data
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
