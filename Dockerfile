FROM node:24-slim AS builder
WORKDIR /app

RUN npm install -g pnpm

# Install build tools for better-sqlite3
RUN apt update && apt install -y python3 make g++

COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM node:24-slim AS production
WORKDIR /app

RUN apt update && apt install -y ffmpeg

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/CHANGELOG.md ./CHANGELOG.md
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=2 \
    CMD wget -q --spider http://127.0.0.1:55913/manifest.json || exit 1

EXPOSE 55913
ENV NODE_ENV=production
ENV PORT=55913

LABEL maintainer="Tam Thai"
LABEL description="Stremio addon to stream asian dramas, series and movie"
LABEL org.opencontainers.image.source="https://github.com/hoangtamthai/yastream"

CMD ["node", "dist/server.js"]