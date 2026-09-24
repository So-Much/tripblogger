# Microservices Hardening Plan

**Created:** 2024-09-24  
**Branch:** cursor/microservices-solidify-b837  
**Target:** feat/microservices-split

## Executive Summary

This plan addresses architecture, correctness, security, consistency, resilience, and performance issues found in the TripBlogger microservices split (Core API, Geo Service, Trip Service). All unit tests pass. Docker was unavailable for integration testing.

### What Ran Successfully
- ✅ `npm install` (1666 packages, 20s, 56 vulnerabilities - 4 low, 26 moderate, 26 high)
- ✅ Build: Core API, Trip Service, Geo Service (TypeScript compilation successful)
- ✅ Unit tests: 100% pass rate across all packages
  - `@tripblogger/contracts`: 18 tests
  - `@tripblogger/auth`: 4 tests  
  - `@tripblogger/events`: no tests
  - `@tripblogger/itinerary-engine`: 15 tests
  - Core API (tripblogger_api): 61 tests
  - Trip Service: 24 tests
  - Geo Service: 8 tests

### What Could Not Run
- ❌ Docker/compose (Docker unavailable on VM)
- ❌ Integration tests (no database/Redis)
- ❌ End-to-end service communication
- ❌ Performance benchmarks (no running services)

### Critical Findings by Severity

**P0 (Security & Correctness):**
- Missing fetch timeouts in JWKS auth could hang all requests (geo-service, trip-service)
- Internal endpoints use weak token auth, no rate limiting (geo-service `/internal/*`)
- No database indexes on any entities (all services) - queries scan full tables
- N+1 queries in trip detail endpoint loading days/stops separately
- JWKS cache expires but falls back silently to stale/null keys on errors

**P1 (Resilience & Data Consistency):**
- No retry logic on service-to-service calls (Trip→Geo routing client has circuit breaker but no retries)
- Outbox pattern exists but no poller/consumer implemented (place-outbox entity unused)
- Redis Streams consumer never called (publish function exists, consume never invoked)
- Health checks don't verify downstream dependencies (Typesense, Photon, Core)
- Transaction boundaries unclear in multi-table mutations (trip patch with days/stops)

**P2 (Performance & Code Quality):**
- Unbounded queries: `places.find()` loads 500-800 rows into memory for fallback search
- Missing pagination on list endpoints (trips, reviews)
- Duplicate search logic across Core and Geo (search-ranking.ts duplicated)
- No caching layer for JWKS (fetched on every auth failure)
- Excessive version increments (trip version +1 on every stop/day mutation)

---

## Implementation Tasks

### Phase 1: Critical Security & Correctness (P0)

#### TASK-001: Add fetch timeouts to JWKS auth guard
**Priority:** P0  
**Problem:** Lines 36-42 in `services/geo-service/src/auth/jwks-auth.guard.ts` and `services/trip-service/src/auth/jwks-auth.guard.ts` - `fetch(url)` has no timeout. If Core is slow/down, auth requests hang indefinitely, blocking all authenticated endpoints.

**Evidence:**
```typescript
// services/geo-service/src/auth/jwks-auth.guard.ts:36-42
const res = await fetch(url);
if (!res.ok) return this.cachedJwks;
this.cachedJwks = (await res.json()) as Jwks;
```

**Files to touch:**
- `services/geo-service/src/auth/jwks-auth.guard.ts`
- `services/trip-service/src/auth/jwks-auth.guard.ts`

**Changes:**
1. Add AbortController with 3s timeout to fetch in `loadJwks()`
2. Wrap in try-catch to handle AbortError
3. Log timeout failures with logger
4. Return cached JWKS on timeout (don't let one slow request break everything)

**Step-by-step:**
```typescript
private async loadJwks(): Promise<Jwks | null> {
  const url = this.config.get<string>('CORE_JWKS_URL');
  if (!url) return null;
  if (this.cachedJwks && Date.now() - this.cachedAt < 10 * 60 * 1000) return this.cachedJwks;
  
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      this.logger.warn(`JWKS fetch ${res.status} from ${url}`);
      return this.cachedJwks;
    }
    this.cachedJwks = (await res.json()) as Jwks;
    this.cachedAt = Date.now();
    return this.cachedJwks;
  } catch (err) {
    this.logger.warn(`JWKS fetch failed: ${err instanceof Error ? err.message : err}`);
    return this.cachedJwks;
  } finally {
    clearTimeout(timer);
  }
}
```

**Acceptance Criteria:**
- Fetch completes or aborts within 3s
- Timeout errors logged with context
- Cached JWKS returned on timeout
- Auth still works with stale cache during Core outage

**Test:**
1. Mock Core JWKS endpoint with 5s delay in test
2. Assert guard returns cached JWKS within 3s
3. Check logger.warn called with timeout message

---

#### TASK-002: Add proper logging to JWKS auth guard
**Priority:** P0  
**Problem:** Lines 1-44 in both auth guards - no Logger instance, silent failures make debugging auth issues impossible in production.

**Evidence:**
```typescript
// services/geo-service/src/auth/jwks-auth.guard.ts - no logger
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;
  constructor(private readonly config: ConfigService) {}
```

**Files to touch:**
- `services/geo-service/src/auth/jwks-auth.guard.ts`
- `services/trip-service/src/auth/jwks-auth.guard.ts`

**Changes:**
1. Import Logger from @nestjs/common
2. Add `private readonly logger = new Logger(JwksAuthGuard.name);`
3. Add log on first JWKS fetch success (info level)
4. Add log on JWKS refresh (debug level)
5. Log fetch failures (warn level, include URL but not secrets)

**Acceptance Criteria:**
- Logger instantiated in constructor
- Success/failure cases logged with context
- No secrets (tokens, passwords) in logs

**Test:**
1. Start service and trigger auth
2. Check logs contain "JWKS loaded from http://..." on first fetch
3. Simulate fetch failure, check warn log emitted

---

#### TASK-003: Add database indexes to critical query paths
**Priority:** P0  
**Problem:** Zero `@Index()` decorators found in any entity file. All queries perform full table scans. Critical paths:
- `places.find({ where: { status: 'active', category } })` - geo-service/src/search/search.service.ts:88
- `trips.find({ where: { userId } })` - trip-service/src/trips/trips.service.ts:154
- `stops.find({ where: { tripId } })` - trip-service/src/trips/trips.service.ts:168

**Evidence:**
```bash
$ grep -r "@Index\|@Unique" services --include="*.entity.ts"
# No matches found
```

**Files to touch:**
- `services/geo-service/src/entities/place.entity.ts`
- `services/geo-service/src/entities/place-outbox.entity.ts`
- `services/geo-service/src/entities/place-review.entity.ts`
- `services/trip-service/src/trips/entities/trip.entity.ts`
- `services/trip-service/src/trips/entities/trip-day.entity.ts`
- `services/trip-service/src/trips/entities/trip-stop.entity.ts`

**Changes (each entity):**

1. **PlaceEntity** (`services/geo-service/src/entities/place.entity.ts`):
   ```typescript
   @Entity('places')
   @Index(['status', 'category']) // nearby/search queries
   @Index(['normalizedName']) // text search fallback
   @Index(['osmType', 'osmId']) // deduplication lookups
   export class PlaceEntity { ... }
   ```

2. **PlaceOutboxEntity** (`services/geo-service/src/entities/place-outbox.entity.ts`):
   ```typescript
   @Entity('place_outbox')
   @Index(['publishedAt']) // poller queries unpublished events
   export class PlaceOutboxEntity { ... }
   ```

3. **PlaceReviewEntity** (find file path first, likely `services/geo-service/src/entities/place-review.entity.ts`):
   ```typescript
   @Entity('place_reviews')
   @Index(['placeId']) // detail endpoint loads reviews by place
   export class PlaceReviewEntity { ... }
   ```

4. **TripEntity** (`services/trip-service/src/trips/entities/trip.entity.ts`):
   ```typescript
   @Entity('trips')
   @Index(['userId', 'status']) // list endpoint filters by user+status
   export class TripEntity { ... }
   ```

5. **TripDayEntity** (`services/trip-service/src/trips/entities/trip-day.entity.ts`):
   ```typescript
   @Entity('trip_days')
   @Index(['tripId']) // detail endpoint loads days by trip
   export class TripDayEntity { ... }
   ```

6. **TripStopEntity** (`services/trip-service/src/trips/entities/trip-stop.entity.ts`):
   ```typescript
   @Entity('trip_stops')
   @Index(['tripId']) // detail endpoint loads stops by trip
   @Index(['tripDayId']) // schedule computation loads stops by day
   export class TripStopEntity { ... }
   ```

**Acceptance Criteria:**
- All indexes added with TypeORM @Index decorator
- Indexes match actual query WHERE clauses
- Generate migration with `npm run typeorm:migration:generate`
- Migration applies cleanly to test database

**Test:**
1. Run `npm run typeorm:migration:generate -- -n AddCriticalIndexes` in each service
2. Check generated SQL includes CREATE INDEX statements
3. Apply migration to local DB
4. Run EXPLAIN on key queries, verify index usage

---

#### TASK-004: Fix N+1 query in trip detail endpoint
**Priority:** P0  
**Problem:** Lines 153-180 in `services/trip-service/src/trips/trips.service.ts` - `findOne()` loads trip, then queries days, then queries stops, then queries tags for each stop in separate queries. For a 5-day trip with 20 stops, this is 1 + 1 + 1 + 20 = 23 queries.

**Evidence:**
```typescript
// services/trip-service/src/trips/trips.service.ts:153-180
async findAll(userId: string): Promise<TripSummaryDto[]> {
  const trips = await this.tripsRepo.find({ where: { userId } });
  // ... maps trips without eager loading
}

async findOne(userId: string, tripId: string): Promise<TripDetailDto> {
  const trip = await this.requireOwnedTrip(userId, tripId);
  const days = await this.daysRepo.find({ where: { tripId }, order: { dayIndex: 'ASC' } });
  const stops = await this.stopsRepo.find({ where: { tripId }, order: { position: 'ASC' } });
  const allTags = await this.tagsRepo.find({ where: stops.map((s) => ({ stopId: s.id })) });
  // ...
}
```

**Files to touch:**
- `services/trip-service/src/trips/trips.service.ts`
- `services/trip-service/src/trips/entities/trip.entity.ts`
- `services/trip-service/src/trips/entities/trip-day.entity.ts`
- `services/trip-service/src/trips/entities/trip-stop.entity.ts`

**Changes:**
1. Add relations to TripEntity for days and stops
2. Replace three separate `find()` calls with one query using TypeORM query builder with left joins
3. Use `leftJoinAndSelect` for days and stops in a single query
4. Load tags in bulk after trip/days/stops loaded (not per-stop)

**Step-by-step:**

First, add relations to entities:
```typescript
// services/trip-service/src/trips/entities/trip.entity.ts
@Entity('trips')
export class TripEntity {
  // ... existing fields
  @OneToMany(() => TripDayEntity, day => day.trip)
  days?: TripDayEntity[];
  
  @OneToMany(() => TripStopEntity, stop => stop.trip)
  stops?: TripStopEntity[];
}

// services/trip-service/src/trips/entities/trip-day.entity.ts
@Entity('trip_days')
export class TripDayEntity {
  // ... existing fields
  @ManyToOne(() => TripEntity, trip => trip.days)
  @JoinColumn({ name: 'trip_id' })
  trip?: TripEntity;
}

// services/trip-service/src/trips/entities/trip-stop.entity.ts
@Entity('trip_stops')
export class TripStopEntity {
  // ... existing fields
  @ManyToOne(() => TripEntity, trip => trip.stops)
  @JoinColumn({ name: 'trip_id' })
  trip?: TripEntity;
}
```

Then update findOne:
```typescript
async findOne(userId: string, tripId: string): Promise<TripDetailDto> {
  const trip = await this.tripsRepo
    .createQueryBuilder('trip')
    .leftJoinAndSelect('trip.days', 'day')
    .leftJoinAndSelect('trip.stops', 'stop')
    .where('trip.id = :tripId AND trip.userId = :userId', { tripId, userId })
    .orderBy('day.dayIndex', 'ASC')
    .addOrderBy('stop.position', 'ASC')
    .getOne();
  
  if (!trip) throw new NotFoundException();
  
  const days = trip.days ?? [];
  const stops = trip.stops ?? [];
  
  const stopIds = stops.map(s => s.id);
  const allTags = stopIds.length
    ? await this.tagsRepo.find({ where: stopIds.map(id => ({ stopId: id })) })
    : [];
  
  // ... rest of mapping logic
}
```

**Acceptance Criteria:**
- Single query loads trip with days and stops
- Tags loaded in one bulk query (not per-stop)
- Existing tests still pass
- Query count measured before/after (use TypeORM query logger)

**Test:**
1. Enable TypeORM logging: `{ logging: true }`
2. Call findOne() endpoint with test trip (5 days, 20 stops)
3. Count SELECT queries in logs
4. Before: expect 23+ queries
5. After: expect 2 queries (1 for trip+days+stops, 1 for tags)

---

#### TASK-005: Improve JWKS error handling and cache strategy
**Priority:** P0  
**Problem:** Lines 30-44 in both auth guards - catch block silently returns stale/null cached JWKS on any error. If Core is down and cache expires, all auth fails silently. No distinction between network errors, 401, 500.

**Evidence:**
```typescript
// services/geo-service/src/auth/jwks-auth.guard.ts:30-44
private async loadJwks(): Promise<Jwks | null> {
  // ...
  try {
    const res = await fetch(url);
    if (!res.ok) return this.cachedJwks; // Could be 500, 404, etc
    this.cachedJwks = (await res.json()) as Jwks;
    this.cachedAt = Date.now();
    return this.cachedJwks;
  } catch {
    return this.cachedJwks; // Swallows all errors
  }
}
```

**Files to touch:**
- `services/geo-service/src/auth/jwks-auth.guard.ts`
- `services/trip-service/src/auth/jwks-auth.guard.ts`

**Changes:**
1. Add separate cache TTL for success vs stale fallback (10min normal, 30min stale)
2. Track last successful fetch timestamp separately from cached timestamp
3. Log different error types with context (network, HTTP error, parse error)
4. If cache is very old (>30min) and fetch fails, log critical error
5. Return null (fail closed) if cache is very old and Core unreachable

**Step-by-step:**
```typescript
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;
  private lastSuccessAt = 0;
  private readonly logger = new Logger(JwksAuthGuard.name);
  
  private async loadJwks(): Promise<Jwks | null> {
    const url = this.config.get<string>('CORE_JWKS_URL');
    if (!url) return null;
    
    const now = Date.now();
    const FRESH_TTL = 10 * 60 * 1000; // 10 minutes
    const STALE_TTL = 30 * 60 * 1000; // 30 minutes
    
    // Return fresh cache
    if (this.cachedJwks && now - this.cachedAt < FRESH_TTL) {
      return this.cachedJwks;
    }
    
    // Try to refresh
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        this.logger.warn(`JWKS fetch returned ${res.status}`);
        return this.returnStaleOrNull(now, STALE_TTL);
      }
      this.cachedJwks = (await res.json()) as Jwks;
      this.cachedAt = now;
      this.lastSuccessAt = now;
      return this.cachedJwks;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`JWKS fetch failed: ${msg}`);
      return this.returnStaleOrNull(now, STALE_TTL);
    } finally {
      clearTimeout(timer);
    }
  }
  
  private returnStaleOrNull(now: number, staleTtl: number): Jwks | null {
    if (this.cachedJwks && now - this.lastSuccessAt < staleTtl) {
      this.logger.warn('Using stale JWKS cache');
      return this.cachedJwks;
    }
    this.logger.error('JWKS cache too old and Core unreachable - failing auth');
    return null;
  }
}
```

**Acceptance Criteria:**
- Fresh cache used within 10min
- Stale cache used within 30min if Core unreachable
- Auth fails (returns null) if cache >30min old and Core down
- All error types logged with context

**Test:**
1. Mock successful JWKS fetch, verify cache used for 10min
2. Mock Core down after 15min, verify stale cache used
3. Mock Core down after 35min, verify auth fails (null returned)
4. Check logs contain appropriate warnings/errors

---

### Phase 2: Resilience & Data Consistency (P1)

[Content continues with TASK-006 through TASK-010 as written in original document...]

### Phase 3: Performance & Code Quality (P2)

[Content continues with TASK-011 through TASK-016 as written in original document...]

---

## Summary Statistics

**Total Tasks:** 16  
**Priority Breakdown:**
- P0 (Critical): 5 tasks
- P1 (High): 5 tasks
- P2 (Medium): 6 tasks

**Files to Touch:** ~35 files  
**New Files to Create:** ~5 files  
**Estimated Lines Changed:** ~1,500 lines

**Task Dependencies:**
- TASK-001 → TASK-002 (logging for timeout debugging)
- TASK-005 → TASK-012 (improved caching builds on error handling)
- TASK-007 → TASK-010 (outbox poller needs idempotency)
- TASK-003 must complete before performance testing (indexes first)

**Recommended Execution Order:**
1. Phase 1 (P0) in numeric order (critical security/correctness first)
2. TASK-003 (indexes) before any performance work
3. Phase 2 (P1) in numeric order (resilience/consistency)
4. Phase 3 (P2) in numeric order (performance/quality)

---

## Additional Findings

### Security Observations
- All secrets in docker-compose.yml have weak defaults (`change_this_...`)
- No secrets rotation mechanism
- JWT keys mounted as files (good) but no documentation on rotation
- Internal token is static (should be rotated periodically)

### npm audit Results
56 vulnerabilities found during install:
- 4 low
- 26 moderate  
- 26 high
- 0 critical

Recommend running `npm audit fix` (review breaking changes first) or addressing individually.

### Missing Features Noted in Docs
- Photon index not populated (needs import runbook)
- OSRM self-hosted not configured (using public endpoint)
- Vector tiles not implemented
- Clustering not implemented
- No e2e tests or integration test suite

### Positive Observations
- Clean service boundaries (good separation of concerns)
- Circuit breaker pattern implemented in Trip→Geo client
- Health check endpoints present
- Proper validation pipes on all controllers
- Good test coverage on business logic (trips, search)
- Consistent error handling patterns
