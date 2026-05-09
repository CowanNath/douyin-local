FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=build /app/dist ./dist

EXPOSE 7077
ENV PORT=7077
ENV VIDEO_DIR=/videos
VOLUME /videos
CMD ["node", "server/index.js"]
