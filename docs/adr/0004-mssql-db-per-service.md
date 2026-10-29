# ADR 0004: SQL Server database-per-service

**Date:** 2026-09-14  
**Status:** Accepted

## Context

The product already uses SQL Server. Postgres+PostGIS would be a better geo store but was rejected to keep one engine.

## Decision

Three databases on one SQL Server instance: `tripblogger`, `tripblogger_trips`, `tripblogger_geo`. No cross-DB FKs. Typesense/Photon keep their own disk.

## Consequences

Geo nearby without PostGIS uses Typesense geo or in-memory haversine. Instance-level HA is shared.
