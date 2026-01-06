# --- Builder Stage ---
FROM node:20-alpine AS builder

# 1. Install build tools + jq
RUN apk add --no-cache openssl python3 make g++ jq

WORKDIR /app

COPY package*.json ./

# 2. Install dependencies (This installs EVERYTHING, including NestJS)
RUN npm install

# 3. Generate Prisma Client
COPY apps/api/prisma ./prisma/
RUN npx prisma@5.22.0 generate

# 4. Copy source code
COPY . .

# 🔥 FIX 1: Fix packageManager issues
RUN jq 'del(.packageManager)' package.json > tmp.json && mv tmp.json package.json
RUN jq 'del(.packageManager)' apps/web/package.json > tmp.json && mv tmp.json apps/web/package.json || true
RUN jq 'del(.packageManager)' apps/api/package.json > tmp.json && mv tmp.json apps/api/package.json || true

# 🔥 FIX 2: Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# 🔥 FIX 3: Build inside the correct folder
WORKDIR /app/apps/api
RUN nest build

# --- Production Stage ---
FROM node:20-alpine AS runner

# 5. Install OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# 🔥 CRITICAL FIX: Copy the working node_modules from builder
# We do NOT run 'npm install' here anymore. We take the modules that we know work.
COPY --from=builder /app/node_modules ./node_modules

# 7. Copy built files from the API subfolder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Copy the prisma client engine specifically
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

# 8. Start the server
CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]