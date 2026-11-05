# Rikuy Lab: one image for the public deployment (web build served by the hub, plus the cloud AI gateway).
#   docker build --build-arg VITE_CLOUD_URL=https://example.org/nube -t rikuy .
#   hub:   docker run -p 8787:8787 rikuy                       (default command)
#   cloud: docker run -p 8788:8788 rikuy npm start -w @rikuy/cloud
FROM node:24-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --no-audit --no-fund
# MediaPipe hand assets are optional at runtime (hand tracking degrades gracefully without them).
RUN node apps/web/scripts/mediapipe-assets.mjs || echo "mediapipe assets unavailable, continuing"
ARG VITE_CLOUD_URL=/nube
ENV VITE_CLOUD_URL=${VITE_CLOUD_URL}
RUN npm run build -w @rikuy/web

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
ENV PORT=8787 HUB_DATA_DIR=/data
EXPOSE 8787 8788
CMD ["npm", "start", "-w", "@rikuy/hub"]
