FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
CMD ["node", "--enable-source-maps", "dist/index.js"]

