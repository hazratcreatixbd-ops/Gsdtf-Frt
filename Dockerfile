# ====================================================
# FRIDAY AI Assistant — Standalone Production Dockerfile
# Optimized for Google Cloud Run, Render, Railway, Fly.io, or self-hosted Docker
# ====================================================

FROM node:22-alpine

WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
RUN npm ci

# 2. Copy source code and build production web assets
COPY . .
RUN npm run build

# 3. Environment configuration
ENV NODE_ENV=production
# Cloud Run injects PORT (e.g. 8080)
ENV PORT=8080

EXPOSE 8080
EXPOSE 3000

# 4. Start FRIDAY full-stack server
CMD ["npm", "start"]
