FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

EXPOSE 4000

# Development: use ts-node-dev for hot reload
CMD ["npm", "run", "dev"]
