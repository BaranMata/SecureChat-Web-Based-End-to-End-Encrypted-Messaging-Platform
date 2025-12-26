FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# package.json'a eklediğimiz start komutunu çalıştırır
CMD ["npm", "run", "start"]