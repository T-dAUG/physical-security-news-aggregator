# Dockerfile - Backend
FROM node:24-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 4000

# Use HTTP healthcheck instead of missing file
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:4000/health || exit 1

CMD ["npm", "start"]