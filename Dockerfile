FROM node:20-alpine

WORKDIR /app

# Copy package configuration
COPY package.json ./

# Copy all source files and assets
COPY . .

# Expose default HTTP port for interactive demos
EXPOSE 3000

# Default command runs test suite then starts web server
CMD ["node", "scripts/serve.js"]
