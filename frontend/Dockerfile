FROM node:20-slim AS base
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- dev ----
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build ----
FROM deps AS builder
COPY . .
RUN npm run build:editor && npm run build:runtime \
    # Vite emits the entry html at its source-relative path; flatten it so
    # nginx can serve <bundle>/index.html directly.
    && mv dist/editor/src/editor/index.html dist/editor/index.html \
    && mv dist/runtime/src/runtime/index.html dist/runtime/index.html \
    && rm -rf dist/editor/src dist/runtime/src

# ---- serve (nginx) ----
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist/editor /usr/share/nginx/html/editor
COPY --from=builder /app/dist/runtime /usr/share/nginx/html/runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
