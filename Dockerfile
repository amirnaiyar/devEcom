# Use Node.js v21.1.0
FROM node:21.1.0

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD [ "node", "src/app.js" ]