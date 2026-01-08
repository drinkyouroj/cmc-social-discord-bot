FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY admin/package.json ./package.json
RUN npm install --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY admin ./admin
COPY admin/prisma ./prisma
WORKDIR /app/admin
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/admin
COPY --from=build /app/admin/.next ./.next
COPY --from=build /app/admin/public ./public
COPY --from=build /app/admin/package.json ./package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/prisma /app/prisma
EXPOSE 3000
CMD ["npm", "run", "start"]

