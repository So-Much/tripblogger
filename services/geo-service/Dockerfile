FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY services/geo-service/package.json ./services/geo-service/package.json
COPY tripblogger_api/package.json ./tripblogger_api/package.json
COPY tripblogger_app/package.json ./tripblogger_app/package.json
RUN npm ci --ignore-scripts --workspace=geo-service --workspace=@tripblogger/contracts --workspace=@tripblogger/auth --workspace=@tripblogger/events --include-workspace-root
COPY packages ./packages
COPY services/geo-service ./services/geo-service
WORKDIR /app/services/geo-service
EXPOSE 3000
CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
