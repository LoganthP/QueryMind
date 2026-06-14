# Use Node.js for building and serving the frontend
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the frontend application
RUN npm run build

# Use a lightweight Node server to serve the built static files
# We can use serve for a simple static deployment, or just expose Vite preview.
# But for production, typically we use Nginx. Let's use Nginx.
FROM nginx:alpine

# Copy built assets from the build stage to Nginx serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the default Nginx port (can be overridden, but standard is 80)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
