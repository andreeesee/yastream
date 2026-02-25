FROM node:24-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:24-alpine AS production
WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
RUN apk add --no-cache ffmpeg

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/CHANGELOG.md ./CHANGELOG.md
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:55913/manifest.json', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

EXPOSE 55913
ENV NODE_ENV=production
ENV PORT=55913

LABEL maintainer="Tam Thai"
LABEL description="Stremio addon to stream asian dramas, series and movie "
LABEL org.opencontainers.image.source="https://github.com/hoangtamthai/yastream"

CMD ["node", "dist/server.js"]