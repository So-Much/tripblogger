# ADR 0002: Typesense + Photon for search

**Date:** 2026-09-14  
**Status:** Accepted

## Context

Public Photon/Nominatim/Overpass have no SLA and cannot mix in user-contributed POIs. Pelias needs Elasticsearch.

## Decision

Index POIs in Typesense (typo + prefix + geo). Self-host Photon for address/reverse (Vietnam extract). Rank with `@tripblogger/contracts` `rankPlaces`. No paid providers.

## Consequences

Must run an OSM import and host Typesense/Photon volumes on D. Search works degraded (SQL) if Typesense is down. Reverse fails closed (503) if Photon has no index.
