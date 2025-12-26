FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
