# Use an official Node.js lightweight image
FROM node:18-alpine

# Set metadata for your image
LABEL maintainer="Mayank Lohani"

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your frontend source code into the container
COPY . .

# Expose port 5173 for the Vite server
EXPOSE 5173

# Command to run the Vite dev server, ensuring it binds to all network interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]