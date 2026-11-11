# trial-redis

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Repository size](https://img.shields.io/github/repo-size/kamaslau/trial-redis?color=56BEB8)

Trial or micro-service unit of [Redis](https://redis.io/docs/) with [official Node.js client driver](https://redis.io/docs/clients/nodejs/).

The [Official RedisInsight](https://redis.com/redis-enterprise/redis-insight/) or [Another Redis Desktop Manager](https://github.com/qishibo/AnotherRedisDesktopManager) is recommended as the desktop client.

## Service URL

- Database (Redis) [redis://localhost:6379](redis://localhost:6379)

## Default user

None, as default.

## Usage

### Start up with [Docker Compose](https://docs.docker.com/compose/)

```bash
# Initiate .env file
cp .env.example .env
# Start services
docker compose up -d
```

Update existing composed containers with latest images:

```bash
docker compose pull && \
docker compose down && \
docker compose up -d
```

### Start services individually

#### Redis

Launch Redis with docker on port _6379_.

```bash
docker run --name redis -d -p 6379:6379 --restart=unless-stopped redis/redis-stack-server:latest
```

## Test Drive

Requires Node.js matching `package.json`.engines.node version.

Start Node.js application on [http://localhost:3000](http://localhost:3000).

```bash
# Run once
pnpm start
# Watch mode, restarts on file changes
pnpm start:dev
```

## Further operations

```bash
# Enter container and initiate shell
docker exec -it redis sh
```

## References

- [Redis on Docker Hub](https://hub.docker.com/_/redis)
- https://developer.redis.com/create/docker/redis-on-docker/
