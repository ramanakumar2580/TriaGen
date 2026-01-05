# --- Builder Stage ---
FROM node:20-alpine AS builder

# 1. Install build tools (Python, Make, G++)
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

COPY package*.json ./

# 2. Install dependencies
RUN npm install

# 3. Generate Prisma Client (Using fixed path & version)
COPY apps/api/prisma ./prisma/
RUN npx prisma@5.22.0 generate

# 4. Build the app
COPY . .

# 🔥 CRITICAL FIX: Remove "packageManager" field to prevent Yarn/NPM conflict
# We run this on both root and app package.json files just to be safe
RUN sed -i '/"packageManager":/d' ./package.json || true
RUN sed -i '/"packageManager":/d' ./apps/web/package.json || true
RUN sed -i '/"packageManager":/d' ./apps/api/package.json || true

RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

# 5. Install OpenSSL for Prisma in production
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# 6. Install only production dependencies
RUN npm install --omit=dev

# 7. Copy built files and Prisma engines from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

# 8. Start the server
CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]