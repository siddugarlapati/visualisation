# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Accept build argument for API URL
ARG VITE_API_URL=http://backend:8000
ENV VITE_API_URL=$VITE_API_URL

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application with environment variables
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy the built assets from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support SPA routing (React Router)
# We create this file inline using echo for simplicity, or we could COPY a file
RUN echo 'server { \
    listen 80; \
    location / { \
    root   /usr/share/nginx/html; \
    index  index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
