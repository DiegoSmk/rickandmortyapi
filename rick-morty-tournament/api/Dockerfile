FROM node:22-alpine AS base

WORKDIR /app

RUN apk add --no-cache bash curl

FROM base AS development

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "run", "dev"]

FROM base AS builder

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM base AS production-deps

COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS production

COPY package*.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY src/db/migrations ./src/db/migrations

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "run", "start:prod"]
