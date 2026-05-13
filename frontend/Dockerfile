FROM node:22-slim

# Install with NODE_ENV=production so npm ci skips devDependencies.
# Compose then sets NODE_ENV=development at runtime so the session
# middleware doesn't force secure cookies (we serve HTTP, not HTTPS,
# during the compose smoke).
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY app ./app
COPY bin ./bin
COPY public ./public

EXPOSE 3000
CMD ["node", "bin/www"]
