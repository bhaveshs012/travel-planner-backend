FROM node:16-alpine

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install

COPY . .

RUN chown -R node:node /home/node/app

USER node

EXPOSE 8000

CMD ["npm", "run", "dev"]