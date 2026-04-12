# Use LTS Alpine image for minimal footprint
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package configurations
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the TypeScript compilation (assuming tsc is running or we run ts-node)
# The current server uses ts-node for development, but for prod we should compile.
# Since we might rely on ts-node for quick Cloud Run testing, we'll install typescript globally or devDeps.
# Actually, it's better to just run the install for all deps, build, then prune.

# Re-running npm install to get dev dependencies for build
RUN npm install
RUN npm run build
RUN npm prune --production

# Expose the port (Cloud Run sets the PORT env var dynamically, usually 8080)
EXPOSE 8080

# Start command
# Cloud Run sets PORT environment variable, the app must bind to it.
CMD ["node", "dist/index.js"]
