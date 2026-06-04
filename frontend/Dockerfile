# Stage 1: Build React App
FROM node:20-slim AS builder

WORKDIR /app

# Copy package configurations
COPY frontend/package.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Inject VITE_API_BASE_URL as an empty string to use relative URLs in production
ENV VITE_API_BASE_URL=""

# Build production bundle
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY infrastructure/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
