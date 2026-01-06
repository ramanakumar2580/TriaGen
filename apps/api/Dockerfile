# --- Builder Stage ---
FROM node:20-alpine AS builder

# Install build tools
RUN apk add --no-cache openssl python3 make g++ jq

WORKDIR /app

# 1. Copy everything
COPY . .

# 2. Install dependencies (This puts them in /app/node_modules)
RUN npm install

# 3. Generate Prisma Client (Critical for database)
WORKDIR /app/apps/api
RUN npx prisma generate

# 4. Build the API
RUN npm install -g @nestjs/cli
RUN nest build

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# 1. Copy the Root node_modules (This is the FIX: Accessing the real dependencies)
COPY --from=builder /app/node_modules ./node_modules

# 2. Copy the built API files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000

# Start the server (Using the find command to locate main.js automatically)
CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]