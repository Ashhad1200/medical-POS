# PharmaFlow POS (Vite SPA) — build then serve with nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# API base is baked in at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Public storefront origin (landing app) for the "View store" link
ARG VITE_STOREFRONT_URL
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
