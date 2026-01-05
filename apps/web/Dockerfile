# --- Builder Stage ---
FROM node:20-alpine AS builder

# 1. Install libc6-compat (Required for Next.js on Alpine)
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# 🔥 CRITICAL FIX: Remove "packageManager" field to prevent Yarn/NPM conflict
# This deletes the line from both the root and the web package.json
RUN sed -i '/"packageManager":/d' ./package.json || true
RUN sed -i '/"packageManager":/d' ./apps/web/package.json || true

# 2. Accept API URL (Passed via --build-arg during docker build)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 3. Build the Next.js app
RUN npm run build

# --- Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# 4. Set production environment (Fixed format)
ENV NODE_ENV=production

# 5. Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Note: Next.js 'standalone' mode copies package.json and node_modules auto-magically

EXPOSE 3000

CMD ["node", "apps/web/server.js"]