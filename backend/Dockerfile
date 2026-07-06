# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# Copy source from builder
COPY --from=builder /app/src ./src

EXPOSE 5050
CMD ["npm", "start"]
