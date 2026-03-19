FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-factor 2 \
  && pnpm config set fetch-retry-mintimeout 10000 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm config set network-timeout 120000

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps/web-admin/package.json apps/web-admin/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile --filter @smart/web-admin...

FROM base AS build
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @smart/web-admin build

FROM base AS runner
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NODE_ENV=production
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
COPY --from=build /app/apps/web-admin/.next/standalone ./
COPY --from=build /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=build /app/apps/web-admin/public ./apps/web-admin/public
EXPOSE 3000
CMD ["node", "apps/web-admin/server.js"]
