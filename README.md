# infra-blocks-redis

[![Blocks](https://img.shields.io/badge/infra--blocks-index-555?style=flat-square)](https://github.com/kamaslau/infra-blocks)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Repository size](https://img.shields.io/github/repo-size/kamaslau/infra-blocks-redis?color=56BEB8)

A unit, not a demo: one service, one port, one documented credential, disposable with a single command.

Typical use: a cache, a session store, or a job queue that has to exist before the application that fills it can be tested.

[Redis](https://redis.io/docs/) with the [official Node.js client](https://redis.io/docs/clients/nodejs/). Desktop clients: [RedisInsight](https://redis.io/insight/) or [Another Redis Desktop Manager](https://github.com/qishibo/AnotherRedisDesktopManager).

## Service URL

- Database (Redis) `redis://localhost:6379`

Ports can be changed in `.env`; see Usage.

## Default user

None by default — Redis starts without auth, and the port is published. Fine for a laptop or an intranet host you control; not fine on a public interface.

## Usage

### Start with [Docker Compose](https://docs.docker.com/compose/)

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

```bash
docker run --name redis -d -p 6379:6379 --restart=unless-stopped redis/redis-stack-server:latest
```

## Verify

```bash
docker compose exec -T redis redis-cli ping
```

`PONG` is the whole answer. If you want the round trip an application actually makes:

```bash
docker compose exec -T redis redis-cli set healthcheck ok && \
docker compose exec -T redis redis-cli get healthcheck
```

`src/` contains the same check through the official Node.js driver — `pnpm start` — which is the closer proof when the client is a Node service.

### What the demo reports when it fails

Each `GET /` writes a key and reads it back, logging one line per step with the status text from [http-response-text](https://github.com/kamaslau/http-response-text). The service listens on `APP_PORT` (3000), not on the Redis port:

```bash
cp .env.example .env
pnpm install
pnpm start
curl -s http://127.0.0.1:3000/
# {"key":"sample-key:lastRequestedAt","value":"1763000000000"}
# Set (201 Created) { key: 'sample-key:lastRequestedAt', value: 1763000000000 }
# Get (200 OK) { key: 'sample-key:lastRequestedAt', value: '1763000000000' }
```

| What happened | What you see | Process |
|---|---|---|
| Store unreachable at startup | `Connect (503 Service Unavailable) redis unreachable: redis://localhost:6379` | exits `1` |
| Connection drops while serving | `Client (503 Service Unavailable) Socket closed unexpectedly`, request answers `503` | keeps running |
| Command refused (wrong type, OOM) | request answers `500` with `{ "error": "Internal Server Error" }` | keeps running |
| `APP_PORT` already in use | `Listen (409 Conflict) listen EADDRINUSE: address already in use :::3000` | exits `1` |

The client retries three times before giving up, because the default strategy retries forever and leaves `connect()` unsettled — the process would log without ever failing. Message language follows `LANG` / `LC_ALL`, matched against `listLanguages()` from the installed http-response-text (`en`, `zh`, `ja`, `fr` today); anything else falls back to English.

## Why this shape

`redis/redis-stack-server` rather than the plain `redis` image, because the JSON and search types are the reason Redis is useful beyond a key-value cache, and switching images later means switching persistence formats too.

Persistence is left at the image default. A cache should lose its contents on restart; a queue should not, and that is the point where you add `--appendonly yes` to the service command rather than change the image. Writing that down is cheaper than rediscovering it after a restart during a demo.

The volume at `/data` exists so `docker compose down` does not throw away the RDB on every code change — only `down -v` does. The distinction matters because the most common way to lose a queue is a `down -v` run out of habit.

No auth, and the port published on the host. This is the same trade-off as the other data units: the readable default is worth more than a credential on a machine that is already behind the client's firewall, and it stops being true the moment the machine is not.

## Notes for deployments in China

`redis/redis-stack-server` pulls from Docker Hub; configure a registry mirror or pre-pull before the handover. `appendonly` plus a volume is the combination that survives a host reboot — verify it once with `redis-cli info persistence` rather than assuming.

---

Part of [infrastructure blocks](https://github.com/kamaslau/infra-blocks) · ← back to index · [what I do](https://www.kamaslau.com/works?utm_source=github&utm_medium=repo-readme&utm_campaign=always-on&utm_content=unit)
