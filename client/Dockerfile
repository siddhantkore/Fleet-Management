FROM node:20-alpine

WORKDIR /app

# Copy package file first
COPY package.json ./

# Install dependencies
# This will generate a fresh package-lock.json with all latest versions
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev", "--", "--host"]
