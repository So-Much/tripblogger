# ADR 0001: Gateway + three services

**Date:** 2026-09-14  
**Status:** Accepted

## Context

Plan-trip and map/search were modules inside one Nest monolith. We need independent scale and a path to self-hosted geo.

## Decision

Use Traefik as the HTTP gateway and three NestJS processes: Core (auth/users/posts/commerce), Trip, Geo. Not Nest microservices TCP, not Kubernetes.

## Consequences

The Expo app keeps one base URL. Compose on 1–2 VPS matches the Windows dev machine. More process overhead; contracts live in `packages/*`.
