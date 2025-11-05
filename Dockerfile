# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./

RUN npm ci

COPY . .

# ensure proper build even if it modified for build-inlining and stuffs
ENV NODE_ENV=production

RUN npm run build:production

RUN npm prune --omit=dev && npm cache clean --force

# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

RUN adduser -D safe_user
USER safe_user

# A pretty decent default settings
ENV NODE_ENV=production
ENV LOG_FORMAT=json
ENV LOG_LEVEL=warn

CMD ["node", "./dist/main.js"]
