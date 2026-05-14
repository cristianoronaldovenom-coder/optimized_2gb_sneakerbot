
# EXTREME PERFORMANCE UPGRADES

## Enabled Optimizations
- Shared browser pool
- HTTP-first monitors
- Smart retry engine
- Proxy scoring
- SQLite WAL mode
- gzip compression
- keep-alive agents
- request batching
- adaptive polling
- browser context recycling
- memory-safe scheduler
- lazy task loading
- capped concurrency
- auto cleanup loops
- lightweight logging
- async task pipelines
- queue prioritization
- monitor throttling
- garbage collection tuning
- low-memory PM2 config

## Recommended Runtime
NODE_OPTIONS="--max-old-space-size=768 --optimize-for-size"

## Recommended nginx
- gzip on
- keepalive enabled
- proxy cache
- HTTP/2
