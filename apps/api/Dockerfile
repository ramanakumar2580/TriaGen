# --- Builder Stage ---
FROM node:20-alpine AS builder

# Install build tools
RUN apk add --no-cache openssl python3 make g++ jq

WORKDIR /app

# 1. Copy the entire project first
COPY . .

# 2. Enter API folder and Install Dependencies LOCALLY
# This fixes the "Cannot find module" errors
WORKDIR /app/apps/api
RUN npm install

# 3. Generate Prisma Client (Critical for database)
# We go back to root if your prisma schema is in a shared spot, 
# OR stay here if it is inside apps/api. 
# Based on your logs, it looks like prisma is inside apps/api.
RUN npx prisma generate

# 4. Build the API
RUN npm install -g @nestjs/cli
RUN nest build

# --- Runner Stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Copy the built files from the builder stage
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/main.js"]