FROM node:24-alpine

WORKDIR /app/backend

# Only copy backend dependencies for faster builds
COPY backend/package*.json ./
RUN npm ci

# Copy the backend code
COPY backend/. .

# Set environment
ENV NODE_ENV=production

EXPOSE 4000

# Start the server
CMD ["node", "index.js"]