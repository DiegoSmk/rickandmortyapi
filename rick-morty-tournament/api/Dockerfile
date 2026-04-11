FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache bash curl

COPY package.json ./

RUN npm install

COPY . .

ENV NODE_ENV=development
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "run", "dev"]
