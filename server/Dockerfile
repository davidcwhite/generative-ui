FROM node:20-alpine

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port and start
EXPOSE 3000
CMD ["node", "dist/index.js"]
