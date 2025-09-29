FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Install curl for health checks
RUN apk add --no-cache curl

# Expose metrics port
EXPOSE 9091

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9091/health || exit 1

# Start the monitoring service
CMD ["node", "index.js"]