# Stage 1: Build & Dependencies
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production Engine
FROM node:18-alpine

WORKDIR /usr/src/app

# Install PM2 globally in the production image
RUN npm install -g pm2

# Copy production node_modules from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy app files
COPY package.json ecosystem.config.js ./
COPY api/ ./api/
COPY public/ ./public/

# Expose Port
EXPOSE ${PORT:-3000}

# Start the application using PM2 runtime
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
