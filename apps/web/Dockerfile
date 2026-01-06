# --- Builder Stage ---
FROM node:20-alpine AS builder

# 1. Install dependencies + jq + libc6-compat
RUN apk add --no-cache libc6-compat jq

WORKDIR /app

COPY package*.json ./
# Install dependencies (including dev dependencies)
RUN npm install --legacy-peer-deps

COPY . .

# 🔥 FIX 1: Delete "packageManager" to stop conflicts
RUN jq 'del(.packageManager)' package.json > tmp.json && mv tmp.json package.json
RUN jq 'del(.packageManager)' apps/web/package.json > tmp.json && mv tmp.json apps/web/package.json || true

# 2. Accept API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED 1

# 🔥 FIX 2: Manually install the missing Alpine binary
# This fixes the "lightningcss.linux-x64-musl.node" error
RUN npm install lightningcss-linux-x64-musl --cpu=x64 --os=linux --libc=musl --save-optional

# 🔥 FIX 3: Build Next.js
WORKDIR /app/apps/web
RUN npx next build

# --- Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Capture the ARG as an ENV again for the runner
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 3. Copy necessary files
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]