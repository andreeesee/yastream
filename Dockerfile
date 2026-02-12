FROM node:24-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build || true

FROM node:24-alpine AS production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml* ./pnpm-lock.yaml*
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./server.js
RUN mkdir -p logs tmp && chown -R nodejs:nodejs logs tmp
USER nodejs
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:55913/manifest.json', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1
EXPOSE 55913
ENV NODE_ENV=production
ENV PORT=55913
LABEL maintainer="Tam Thai"
LABEL description="Stremio addon for streaming Asian content from KissKH"
LABEL org.opencontainers.image.source="https://github.com/hoangtamthai/AsiaView"

# Start the application
CMD ["pnpm", "start"]