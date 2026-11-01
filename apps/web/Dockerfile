FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_OUTPUT=standalone
RUN pnpm build

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --create-home --uid 10001 appuser
COPY --from=build --chown=appuser /app/.next/standalone ./
COPY --from=build --chown=appuser /app/.next/static ./.next/static
USER appuser
EXPOSE 3000
# The web app has no /health of its own: a 200 from the landing page is its liveness signal.
# (The API's probe path is /health; see apps/api/Dockerfile and docker-compose.yml.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
