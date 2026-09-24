FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY services/trip-service/package.json ./services/trip-service/package.json
COPY tripblogger_api/package.json ./tripblogger_api/package.json
COPY tripblogger_app/package.json ./tripblogger_app/package.json
RUN npm ci --ignore-scripts --workspace=trip-service --workspace=@tripblogger/itinerary-engine --workspace=@tripblogger/auth --workspace=@tripblogger/events --include-workspace-root
COPY packages ./packages
COPY services/trip-service ./services/trip-service
WORKDIR /app/services/trip-service
EXPOSE 3000
CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
