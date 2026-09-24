# Build from repo root: docker build -f tripblogger_api/Dockerfile .
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY tripblogger_api/package.json ./tripblogger_api/package.json
COPY tripblogger_app/package.json ./tripblogger_app/package.json
RUN npm ci --ignore-scripts --workspace=tripblogger-api --workspace=@tripblogger/itinerary-engine --workspace=@tripblogger/contracts --workspace=@tripblogger/auth --workspace=@tripblogger/events --include-workspace-root

FROM deps AS build
COPY tripblogger_api ./tripblogger_api
COPY packages ./packages
WORKDIR /app
RUN npm run build -w tripblogger-api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/tripblogger_api ./tripblogger_api
USER app
WORKDIR /app/tripblogger_api
EXPOSE 3000
CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
