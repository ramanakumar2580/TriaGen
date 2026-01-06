# --- Builder Stage ---
FROM node:20-alpine AS builder

# Install build tools
RUN apk add --no-cache openssl python3 make g++ jq

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including NestJS CLI)
RUN npm install

# Copy Prisma schema and generate client
COPY apps/api/prisma ./prisma/
RUN npx prisma@5.22.0 generate

# Copy source code
COPY . .

# Fix package.json issues
RUN jq 'del(.packageManager)' package.json > tmp.json && mv tmp.json package.json
RUN jq 'del(.packageManager)' apps/web/package.json > tmp.json && mv tmp.json apps/web/package.json || true
RUN jq 'del(.packageManager)' apps/api/package.json > tmp.json && mv tmp.json apps/api/package.json || true

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Build the API
WORKDIR /app/apps/api
RUN nest build

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# Copy node_modules from builder (Critical for NestJS to work)
COPY --from=builder /app/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]