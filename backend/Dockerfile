FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
