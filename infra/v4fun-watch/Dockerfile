FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY test ./test

RUN addgroup -S watcher && adduser -S watcher -G watcher \
  && mkdir -p /data && chown -R watcher:watcher /app /data

USER watcher

CMD ["node", "src/site-worker.mjs"]
