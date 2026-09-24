# ADR 0005: Redis Streams for domain events

**Date:** 2026-09-14  
**Status:** Accepted

## Context

We already run Redis for cache/BullMQ. Kafka is too heavy for 1–2 VPS.

## Decision

Publish domain events with `@tripblogger/events` (`XADD` / `XREADGROUP`). Streams: `place.events`, `trip.events`, `user.events`.

## Consequences

At-least-once delivery; consumers must be idempotent. Can swap the package internals later without changing event shapes.
