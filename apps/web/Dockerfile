# --- Builder Stage ---
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat jq
WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Fix package.json for standalone build
RUN jq 'del(.packageManager)' package.json > tmp.json && mv tmp.json package.json
RUN jq 'del(.packageManager)' apps/web/package.json > tmp.json && mv tmp.json apps/web/package.json || true

# Install CSS fix for Linux
RUN npm install lightningcss-linux-x64-musl --cpu=x64 --os=linux --libc=musl --save-optional

# Build the Web App
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED 1

WORKDIR /app/apps/web
RUN npx next build

# --- Runner Stage ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 1. Copy the Standalone build
# (This creates the folder structure /app/apps/web/server.js)
COPY --from=builder /app/apps/web/.next/standalone ./

# 2. FIX: Copy Static files to the NESTED folder (Critical for CSS)
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# 3. FIX: Copy Public files to the NESTED folder (Critical for Images)
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

# Start the server from the correct nested path
CMD ["node", "apps/web/server.js"]