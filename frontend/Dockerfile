FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies (package.json will be copied later)
COPY package*.json ./
RUN npm ci --silent

# Copy source code
COPY . .

# Build the app (Vite dev server will be used in development)
# In production you would run npm run build, but for dev we expose the dev server port
EXPOSE 5173

# Default command to start Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
