# syntax=docker/dockerfile:1

# --- Builder stage ---
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# --- Runtime stage ---
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/.output .output/

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
