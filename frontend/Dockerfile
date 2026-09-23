# AIDEN Frontend — production image (docker-compose / Nginx-gateway path)
# Build:  docker build -t aiden-frontend ./frontend
# The Vercel path (vercel.json) does NOT use this file.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api/v1
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_ENABLE_MOCK_DATA=false
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
