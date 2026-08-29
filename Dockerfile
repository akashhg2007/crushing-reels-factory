FROM node:20-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for TypeScript)
RUN npm install

# Copy source
COPY . .

# Create directories for runtime data
RUN mkdir -p output tokens data

EXPOSE 3000

# Use tsx to run TypeScript directly
CMD ["npx", "tsx", "src/index.ts", "serve"]
