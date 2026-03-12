FROM node:20-alpine

WORKDIR /app

COPY client/package*.json ./client/
RUN cd client && npm install --legacy-peer-deps

COPY client/ ./client/
RUN cd client && npm run build

COPY server/package*.json ./server/
RUN cd server && npm install --legacy-peer-deps --omit=dev

COPY server/ ./server/
RUN mkdir -p /app/builds /app/logs

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000
WORKDIR /app/server
CMD ["node", "index.js"]
