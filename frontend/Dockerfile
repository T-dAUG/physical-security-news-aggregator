FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 8080

# Start command
CMD ["npm", "start"]