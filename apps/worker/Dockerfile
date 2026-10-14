FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY supabase ./supabase
RUN npm ci
ENV PROJECT_ROOT=/app
USER node
CMD ["npm", "run", "worker"]
