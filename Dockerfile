# Use Node 18 Alpine for high performance and small image size
FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package info
# This copies package.json (and package-lock.json if you generate one later)
COPY package*.json ./

# 10X FIX: We use 'npm install' with '--omit=dev' because a lockfile wasn't found.
# This ensures a fast, production-only install without the strict lockfile requirement.
RUN npm install --omit=dev

# Copy the rest of the application code
# This includes your 'api' and 'public' folders
COPY . .

# Expose Port 3000 (Synchronized with Railway Networking and your index.js)
EXPOSE 3000

# Health check to ensure the engine is responsive
# It checks the endpoint defined in your index.js
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Command to run the application
# This triggers the "start" script in your package.json:
# "pm2-runtime start ecosystem.config.js"
CMD ["npm", "start"]
