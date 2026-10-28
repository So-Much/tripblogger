# Build from repo root: docker build -f tripblogger_api/Dockerfile .
# Shared packages expose TypeScript source, so the runtime uses ts-node.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/auth/package.json packages/auth/
COPY packages/contracts/package.json packages/contracts/
COPY packages/events/package.json packages/events/
COPY packages/itinerary-engine/package.json packages/itinerary-engine/
COPY services/geo-service/package.json services/geo-service/
COPY services/trip-service/package.json services/trip-service/
COPY tripblogger_api/package.json tripblogger_api/
COPY tripblogger_app/package.json tripblogger_app/
RUN npm ci --ignore-scripts --workspace=tripblogger-api --workspace=@tripblogger/itinerary-engine --workspace=@tripblogger/contracts --workspace=@tripblogger/auth --workspace=@tripblogger/events --include-workspace-root \
  && npm rebuild sharp
COPY packages ./packages
COPY tripblogger_api ./tripblogger_api
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
WORKDIR /app/tripblogger_api
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "/app/node_modules/ts-node/dist/bin.js", "--transpile-only", "src/main.ts"]
