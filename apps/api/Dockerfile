# apps/api/Dockerfile
FROM node:20-alpine AS builder

# Install OpenSSL 3.0 and necessary build tools for Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
# This ensures Prisma generates the correct engine for Alpine ARM64
RUN npx prisma generate

COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

# Re-install OpenSSL in the production stage too
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

# Using the "find" method we discussed to ensure we hit the right main.js
CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]