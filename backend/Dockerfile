FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for caching layer
COPY package*.json ./
RUN npm install

# Build TypeScript code
COPY . .
RUN npm run build

# Production Image
FROM node:22-alpine

WORKDIR /app

# Only copy what's needed for production
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Ensure uploads directory exists
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["npm", "start"]
