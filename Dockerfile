# Dockerfile for the Todo App
FROM node:24-alpine

# Setting working directory inside the container
WORKDIR /app

# Copying package.json and package-lock.json
COPY package*.json .

# Installing dependencies
RUN npm install

# Copying the rest of the application code
COPY . .

# Copy Prisma schema and generate client
RUN npx prisma generate

# Exposing the application port
EXPOSE 5000

# Starting the application
CMD [ "node", "./src/server.js" ]