FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat jq
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Fix package.json
RUN jq 'del(.packageManager)' package.json > tmp.json && mv tmp.json package.json
RUN jq 'del(.packageManager)' apps/web/package.json > tmp.json && mv tmp.json apps/web/package.json || true

# Install Alpine-specific binaries (Fixes the CSS crash)
RUN npm install lightningcss-linux-x64-musl --cpu=x64 --os=linux --libc=musl --save-optional

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

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]