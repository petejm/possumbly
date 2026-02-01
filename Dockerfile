# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/web/package*.json ./packages/web/

# Install all dependencies
RUN npm install

# Copy source files
COPY tsconfig.base.json ./
COPY packages/server ./packages/server
COPY packages/web ./packages/web

# Build both packages
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for sharp
RUN apk add --no-cache vips-dev

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files for production install
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/

# Install production dependencies only
RUN npm install --workspace=@possumbly/server --omit=dev

# Copy built files
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory with proper ownership
RUN mkdir -p /data/uploads/templates /data/uploads/memes && \
    chown -R nodejs:nodejs /data /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/possumbly.db
ENV UPLOADS_PATH=/data/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the server with entrypoint
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "packages/server/dist/index.js"]
