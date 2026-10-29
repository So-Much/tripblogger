# Microservices Hardening Plan

**Created:** 2026-09-24  
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
- No database indexes on any entities (all services) - queries scan full tables
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
- Excessive version increments (trip version +1 on every stop/day mutation)
- No rate limiting on internal endpoints
- Missing unit tests for events package

---

## Implementation Tasks

### Phase 1: Critical Security & Correctness (P0)

#### TASK-001: Add fetch timeouts and logging to JWKS auth guard
**Priority:** P0  
**Problem:** Lines 31-44 in `services/geo-service/src/auth/jwks-auth.guard.ts` and `services/trip-service/src/auth/jwks-auth.guard.ts` - `fetch(url)` has no timeout. If Core is slow/down, auth requests hang indefinitely, blocking all authenticated endpoints. Additionally, no Logger instance exists, making debugging impossible.

**Evidence:**
```typescript
// services/geo-service/src/auth/jwks-auth.guard.ts:31-44
private async loadJwks(): Promise<Jwks | null> {
  const url = this.config.get<string>('CORE_JWKS_URL');
  if (!url) return null;
  if (this.cachedJwks && Date.now() - this.cachedAt < 10 * 60 * 1000) return this.cachedJwks;
  try {
    const res = await fetch(url);  // NO TIMEOUT
    if (!res.ok) return this.cachedJwks;
    this.cachedJwks = (await res.json()) as Jwks;
    this.cachedAt = Date.now();
    return this.cachedJwks;
  } catch {
    return this.cachedJwks;  // Silent failure
  }
}

// No logger field in class
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;
  constructor(private readonly config: ConfigService) {}  // No logger
```

**Files to touch:**
- `services/geo-service/src/auth/jwks-auth.guard.ts`
- `services/trip-service/src/auth/jwks-auth.guard.ts`

**Changes:**
1. Import Logger from @nestjs/common
2. Add logger field: `private readonly logger = new Logger(JwksAuthGuard.name);`
3. Add AbortController with 3s timeout to fetch in `loadJwks()`
4. Wrap in try-catch to handle AbortError
5. Log timeout failures, fetch errors, and success cases
6. Return cached JWKS on timeout (don't let one slow request break everything)

**Step-by-step:**
```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyAccessToken, type Jwks } from '@tripblogger/auth';

@Injectable()
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;
  private readonly logger = new Logger(JwksAuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException();
    const jwks = await this.loadJwks();
    try {
      req.user = await verifyAccessToken({
        token,
        jwks: jwks ?? undefined,
        hsSecret: this.config.get<string>('JWT_ACCESS_SECRET'),
        issuer: jwks?.keys.length ? 'tripblogger-core' : undefined,
      });
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async loadJwks(): Promise<Jwks | null> {
    const url = this.config.get<string>('CORE_JWKS_URL');
    if (!url) return null;
    
    const now = Date.now();
    if (this.cachedJwks && now - this.cachedAt < 10 * 60 * 1000) {
      return this.cachedJwks;
    }
    
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        this.logger.warn(`JWKS fetch returned ${res.status} from ${url}`);
        return this.cachedJwks;
      }
      this.cachedJwks = (await res.json()) as Jwks;
      this.cachedAt = now;
      this.logger.log(`JWKS loaded from ${url}`);
      return this.cachedJwks;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`JWKS fetch failed: ${msg}`);
      return this.cachedJwks;
    } finally {
      clearTimeout(timer);
    }
  }
}
```

**Acceptance Criteria:**
- Fetch completes or aborts within 3s
- Timeout errors logged with context
- Cached JWKS returned on timeout
- Auth still works with stale cache during Core outage
- Success/failure cases logged

**Test:**
1. Mock Core JWKS endpoint with 5s delay
2. Assert guard returns cached JWKS within 3s
3. Check logger.warn called with timeout message
4. Mock successful fetch, check logger.log called

---

#### TASK-002: Add database indexes to critical query paths
**Priority:** P0  
**Problem:** Zero `@Index()` decorators found in any entity file. All queries perform full table scans. Critical paths identified:
- `places.find({ where: { status: 'active', category } })` - geo-service/src/search/search.service.ts:88
- `trips.find({ where: { userId } })` - trip-service/src/trips/trips.service.ts:154
- `stops.find({ where: { tripId } })` - trip-service/src/trips/trips.service.ts:168

**Evidence:**
```bash
$ grep -r "@Index\|@Unique" services --include="*.entity.ts"
# No matches found

# Queries without indexes:
services/geo-service/src/search/search.service.ts:88
  const all = await this.places.find({ where: { status: 'active', category }, take: 500 });

services/trip-service/src/trips/trips.service.ts:154
  const trips = await this.tripsRepo.find({ where: { userId }, order: { updatedAt: 'DESC' } });

services/trip-service/src/trips/trips.service.ts:168
  const stops = await this.stopsRepo.find({ where: { tripId }, order: { position: 'ASC' } });
```

**Files to touch:**
- `services/geo-service/src/entities/place.entity.ts`
- `services/geo-service/src/entities/place-outbox.entity.ts`
- `services/geo-service/src/entities/place-review.entity.ts`
- `services/trip-service/src/trips/entities/trip.entity.ts`
- `services/trip-service/src/trips/entities/trip-day.entity.ts`
- `services/trip-service/src/trips/entities/trip-stop.entity.ts`

**Changes:**
Add `@Index()` decorators to entities matching actual query patterns:

1. **PlaceEntity** (`services/geo-service/src/entities/place.entity.ts`):
   ```typescript
   import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
   
   @Entity('places')
   @Index(['status', 'category'])
   @Index(['normalizedName'])
   @Index(['osmType', 'osmId'])
   export class PlaceEntity {
     // ... existing fields
   }
   ```

2. **PlaceOutboxEntity** (`services/geo-service/src/entities/place-outbox.entity.ts`):
   ```typescript
   import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
   
   @Entity('place_outbox')
   @Index(['publishedAt'])
   export class PlaceOutboxEntity {
     // ... existing fields
   }
   ```

3. **PlaceReviewEntity** (`services/geo-service/src/entities/place-review.entity.ts`):
   ```typescript
   @Entity('place_reviews')
   @Index(['placeId'])
   export class PlaceReviewEntity {
     // ... existing fields
   }
   ```

4. **TripEntity** (`services/trip-service/src/trips/entities/trip.entity.ts`):
   ```typescript
   import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
   
   @Entity('trips')
   @Index(['userId', 'status'])
   @Index(['updatedAt'])
   export class TripEntity {
     // ... existing fields
   }
   ```

5. **TripDayEntity** (`services/trip-service/src/trips/entities/trip-day.entity.ts`):
   ```typescript
   @Entity('trip_days')
   @Index(['tripId'])
   export class TripDayEntity {
     // ... existing fields
   }
   ```

6. **TripStopEntity** (`services/trip-service/src/trips/entities/trip-stop.entity.ts`):
   ```typescript
   @Entity('trip_stops')
   @Index(['tripId'])
   @Index(['tripDayId'])
   export class TripStopEntity {
     // ... existing fields
   }
   ```

**Acceptance Criteria:**
- All indexes added with TypeORM @Index decorator
- Indexes match actual query WHERE clauses
- Code compiles without errors
- Can generate migrations (if TypeORM CLI configured)

**Test:**
1. Build each service: `npm run build -w geo-service` and `npm run build -w trip-service`
2. Check no TypeScript errors
3. If database available, run `npm run typeorm:migration:generate -- -n AddCriticalIndexes` and verify SQL includes CREATE INDEX

---

#### TASK-003: Improve JWKS error handling and cache strategy
**Priority:** P0  
**Problem:** Lines 31-44 in both auth guards - catch block silently returns stale/null cached JWKS on any error. If Core is down and cache expires, all auth fails silently. No distinction between network errors, 401, 500.

**Evidence:**
```typescript
// services/geo-service/src/auth/jwks-auth.guard.ts:31-44
private async loadJwks(): Promise<Jwks | null> {
  const url = this.config.get<string>('CORE_JWKS_URL');
  if (!url) return null;
  if (this.cachedJwks && Date.now() - this.cachedAt < 10 * 60 * 1000) return this.cachedJwks;
  try {
    const res = await fetch(url);
    if (!res.ok) return this.cachedJwks; // Could be 500, 404, etc - all treated same
    this.cachedJwks = (await res.json()) as Jwks;
    this.cachedAt = Date.now();
    return this.cachedJwks;
  } catch {
    return this.cachedJwks; // Swallows all errors, could return null if never cached
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

  constructor(private readonly config: ConfigService) {}

  // ... canActivate same as before ...

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
      this.logger.log('JWKS refreshed successfully');
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
- All error types logged with appropriate level

**Test:**
1. Mock successful JWKS fetch, verify cache used for 10min
2. Mock Core down after 15min, verify stale cache used
3. Mock Core down after 35min, verify auth fails (null returned)
4. Check logs contain appropriate warnings/errors at each stage

---

### Phase 2: Resilience & Data Consistency (P1)

#### TASK-004: Implement retry logic in GeoRoutingClient
**Priority:** P1  
**Problem:** Lines 62-90 in `services/trip-service/src/legs/geo-routing.client.ts` - circuit breaker pattern exists but no retry on transient failures. Single network blip causes trip updates to lose routing data.

**Evidence:**
```typescript
// services/trip-service/src/legs/geo-routing.client.ts:62-90
async tableLegs(
  points: Array<{ lat: number; lng: number }>,
  mode: 'car' | 'bike' | 'foot',
): Promise<Leg[]> {
  if (this.isOpen()) {
    return points.slice(1).map(() => ({ durationS: null, distanceM: null }));
  }
  const base = this.config.get<string>('GEO_BASE_URL') ?? 'http://127.0.0.1:3003';
  const token = this.config.get<string>('GEO_INTERNAL_TOKEN') ?? '';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/internal/routing/table-legs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': token },
      body: JSON.stringify({ points, mode }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`geo ${res.status}`);
    this.record(true);
    const body = (await res.json()) as { legs: Leg[] };
    return body.legs ?? [];
  } catch (err) {
    this.record(false);
    throw err; // Propagates immediately, no retry
  } finally {
    clearTimeout(timer);
  }
}
```

**Files to touch:**
- `services/trip-service/src/legs/geo-routing.client.ts`

**Changes:**
1. Add retry logic with exponential backoff (3 attempts: 0ms, 500ms, 1s)
2. Only retry on network errors and 5xx, not 4xx
3. Use separate timeout per attempt (4s each, 12s total max)
4. Log each retry attempt with context

**Step-by-step:**
```typescript
async tableLegs(
  points: Array<{ lat: number; lng: number }>,
  mode: 'car' | 'bike' | 'foot',
): Promise<Leg[]> {
  if (this.isOpen()) {
    return points.slice(1).map(() => ({ durationS: null, distanceM: null }));
  }

  const base = this.config.get<string>('GEO_BASE_URL') ?? 'http://127.0.0.1:3003';
  const token = this.config.get<string>('GEO_INTERNAL_TOKEN') ?? '';
  const url = `${base.replace(/\/$/, '')}/api/internal/routing/table-legs`;
  const body = JSON.stringify({ points, mode });

  const delays = [0, 500, 1000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      this.logger.log(`Retry attempt ${attempt + 1} for Geo routing`);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': token },
        body,
        signal: ctrl.signal,
      });

      if (res.status >= 400 && res.status < 500) {
        // Client error, don't retry
        throw new Error(`geo ${res.status}`);
      }

      if (!res.ok) {
        // Server error, will retry
        lastError = new Error(`geo ${res.status}`);
        continue;
      }

      this.record(true);
      const result = (await res.json()) as { legs: Leg[] };
      return result.legs ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof Error && err.name === 'AbortError') {
        this.logger.warn(`Geo routing timeout on attempt ${attempt + 1}`);
      }
      // Will retry unless it's the last attempt or a 4xx
    } finally {
      clearTimeout(timer);
    }
  }

  this.record(false);
  throw lastError ?? new Error('All retry attempts failed');
}
```

**Acceptance Criteria:**
- Retries up to 3 times on 5xx and network errors
- No retry on 4xx errors (fail fast)
- Exponential backoff: 0ms, 500ms, 1s
- Each attempt has 4s timeout
- Logs each retry with context

**Test:**
1. Mock Geo endpoint to return 503 twice, then 200
2. Assert tableLegs succeeds after 2 retries
3. Mock Geo endpoint to return 400
4. Assert tableLegs fails immediately without retry
5. Check logs for retry messages

---

#### TASK-005: Implement outbox pattern poller for place events
**Priority:** P1  
**Problem:** Entity exists at `services/geo-service/src/entities/place-outbox.entity.ts` but no code writes to it or polls it. Events aren't published to Redis Streams. Geo changes don't propagate to other services.

**Evidence:**
```bash
$ grep -r "PlaceOutboxEntity" services/geo-service/src
services/geo-service/src/entities/place-outbox.entity.ts:export class PlaceOutboxEntity
services/geo-service/src/app.module.ts:import { PlaceOutboxEntity }
# Only imported in module, never used in services

$ grep -r "outbox" services/geo-service/src/contribute
# No matches - contribute service doesn't write to outbox

$ grep -r "publish\|consume" services --include="*.ts" | grep -v node_modules | grep -v ".spec"
packages/events/src/streams.ts:export async function publish(
packages/events/src/streams.ts:export async function consume(
packages/events/src/index.ts:export { publish, consume } from './streams';
# Functions exist but never called
```

**Files to touch:**
- `services/geo-service/src/contribute/contribute.service.ts` (write outbox records)
- `services/geo-service/src/outbox/outbox-poller.service.ts` (new file)
- `services/geo-service/src/app.module.ts` (register poller)

**Changes:**

1. **Update contribute.service.ts** - write outbox records on place create/update:
   ```typescript
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { PlaceOutboxEntity } from '../entities/place-outbox.entity';
   
   @Injectable()
   export class ContributeService {
     constructor(
       @InjectRepository(PlaceEntity) private readonly places: Repository<PlaceEntity>,
       @InjectRepository(PlaceContributionEntity) private readonly contributions: Repository<PlaceContributionEntity>,
       @InjectRepository(PlaceOutboxEntity) private readonly outbox: Repository<PlaceOutboxEntity>,
       private readonly typesense: TypesensePlaces,
     ) {}
   
     async createPlace(userId: string, dto: CreatePlaceDto) {
       const auto = (await this.approvedCount(userId)) >= AUTO_APPROVE_AFTER;
       const place = await this.places.save(/* ... existing create ... */);
       
       // Write to outbox
       if (auto) {
         const outbox = this.outbox.create({
           eventType: 'place.created',
           payloadJson: JSON.stringify({
             type: 'place.created',
             occurredAt: new Date().toISOString(),
             data: { placeId: place.id, name: place.name, category: place.category },
           }),
           publishedAt: null,
         });
         await this.outbox.save(outbox);
       }
       
       // ... rest of method
     }
   }
   ```

2. **Create outbox-poller.service.ts**:
   ```typescript
   import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository, IsNull } from 'typeorm';
   import { publish, type RedisLike } from '@tripblogger/events';
   import { PlaceOutboxEntity } from '../entities/place-outbox.entity';
   
   @Injectable()
   export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
     private readonly logger = new Logger(OutboxPollerService.name);
     private intervalId: NodeJS.Timeout | null = null;
     
     constructor(
       @InjectRepository(PlaceOutboxEntity) private readonly outbox: Repository<PlaceOutboxEntity>,
       @Inject('REDIS_CLIENT') private readonly redis: RedisLike,
     ) {}
     
     onModuleInit() {
       this.intervalId = setInterval(() => this.poll(), 5000);
       this.logger.log('Outbox poller started');
     }
     
     onModuleDestroy() {
       if (this.intervalId) clearInterval(this.intervalId);
       this.logger.log('Outbox poller stopped');
     }
     
     private async poll() {
       try {
         const pending = await this.outbox.find({
           where: { publishedAt: IsNull() },
           order: { createdAt: 'ASC' },
           take: 100,
         });
         
         for (const entry of pending) {
           try {
             const event = JSON.parse(entry.payloadJson);
             await publish(this.redis, 'place.events', event);
             entry.publishedAt = new Date();
             await this.outbox.save(entry);
             this.logger.debug(`Published ${entry.eventType} (${entry.id})`);
           } catch (err) {
             this.logger.error(`Failed to publish ${entry.id}: ${err}`);
           }
         }
       } catch (err) {
         this.logger.error(`Outbox poll failed: ${err}`);
       }
     }
   }
   ```

3. **Update app.module.ts**:
   ```typescript
   import { OutboxPollerService } from './outbox/outbox-poller.service';
   
   @Module({
     // ... existing imports ...
     providers: [
       // ... existing providers ...
       OutboxPollerService,
     ],
   })
   export class AppModule {}
   ```

**Acceptance Criteria:**
- Outbox records created on place create/update
- Poller runs every 5s
- Unpublished events published to Redis `place.events` stream
- Published events marked with timestamp
- Errors logged but don't crash poller

**Test:**
1. Create a place via contribute endpoint
2. Check `place_outbox` table has unpublished record (requires DB)
3. Wait 5s, check record now has `published_at` timestamp
4. Use Redis CLI to verify event in stream: `XREAD COUNT 1 STREAMS place.events 0`

---

#### TASK-006: Add health check for downstream dependencies
**Priority:** P1  
**Problem:** Lines 20-38 in `services/geo-service/src/health/health.controller.ts` and `services/trip-service/src/health/health.controller.ts` - readiness checks only verify DB and Redis. Doesn't check Typesense (required for search) or Photon (required for reverse geocoding) in Geo. Doesn't check Geo availability in Trip. Service reports ready but requests fail.

**Evidence:**
```typescript
// services/geo-service/src/health/health.controller.ts:20-38
@Get('ready')
async ready(@Res({ passthrough: true }) res: Response) {
  let db: 'ok' | 'fail' = 'ok';
  let redis: 'ok' | 'fail' = 'ok';
  try {
    await this.dataSource.query('SELECT 1');
  } catch {
    db = 'fail';
  }
  try {
    const pong = await this.redis.ping();
    if (pong !== 'PONG' && pong !== 'pong') redis = 'fail';
  } catch {
    redis = 'fail';
  }
  // Missing: Typesense, Photon checks
  const status = db === 'fail' ? 'unready' : redis === 'fail' ? 'degraded' : 'ok';
  res.status(db === 'fail' ? 503 : 200);
  return { status, timestamp: new Date().toISOString(), checks: { db, redis } };
}

// services/trip-service/src/health/health.controller.ts - same pattern, no Geo check
```

**Files to touch:**
- `services/geo-service/src/health/health.controller.ts`
- `services/geo-service/src/search/typesense.client.ts` (add health method)
- `services/geo-service/src/geocode/photon.client.ts` (add health method)
- `services/trip-service/src/health/health.controller.ts`
- `services/trip-service/src/legs/geo-routing.client.ts` (add health method)

**Changes:**

1. **Geo Service health** - add Typesense and Photon checks:
   ```typescript
   import { TypesensePlaces } from '../search/typesense.client';
   import { PhotonClient } from '../geocode/photon.client';
   
   export class HealthController {
     constructor(
       private readonly dataSource: DataSource,
       @Inject(REDIS_CLIENT) private readonly redis: { ping: () => Promise<string> },
       private readonly typesense: TypesensePlaces,
       private readonly photon: PhotonClient,
     ) {}
     
     @Get('ready')
     async ready(@Res({ passthrough: true }) res: Response) {
       const checks = {
         db: 'ok' as 'ok' | 'fail',
         redis: 'ok' as 'ok' | 'fail',
         typesense: 'ok' as 'ok' | 'fail',
         photon: 'ok' as 'ok' | 'fail',
       };
       
       // DB check
       try {
         await this.dataSource.query('SELECT 1');
       } catch {
         checks.db = 'fail';
       }
       
       // Redis check
       try {
         const pong = await this.redis.ping();
         if (pong !== 'PONG' && pong !== 'pong') checks.redis = 'fail';
       } catch {
         checks.redis = 'fail';
       }
       
       // Typesense check
       try {
         await this.typesense.healthCheck();
       } catch {
         checks.typesense = 'fail';
       }
       
       // Photon check
       try {
         await this.photon.healthCheck();
       } catch {
         checks.photon = 'fail';
       }
       
       const status = checks.db === 'fail' ? 'unready'
         : checks.redis === 'fail' || checks.typesense === 'fail' || checks.photon === 'fail' ? 'degraded'
         : 'ok';
       
       res.status(checks.db === 'fail' ? 503 : 200);
       return { status, timestamp: new Date().toISOString(), checks };
     }
   }
   ```

2. **Add health methods to clients**:
   ```typescript
   // services/geo-service/src/search/typesense.client.ts
   async healthCheck(): Promise<void> {
     const ctrl = new AbortController();
     const timer = setTimeout(() => ctrl.abort(), 2000);
     try {
       const res = await fetch(`${this.url}/health`, { signal: ctrl.signal });
       if (!res.ok) throw new Error(`Typesense health ${res.status}`);
     } finally {
       clearTimeout(timer);
     }
   }
   
   // services/geo-service/src/geocode/photon.client.ts
   async healthCheck(): Promise<void> {
     const base = this.config.get<string>('PHOTON_URL') ?? 'http://127.0.0.1:2322';
     const ctrl = new AbortController();
     const timer = setTimeout(() => ctrl.abort(), 2000);
     try {
       const res = await fetch(`${base}/api`, { signal: ctrl.signal });
       if (!res.ok) throw new Error(`Photon health ${res.status}`);
     } finally {
       clearTimeout(timer);
     }
   }
   
   // services/trip-service/src/legs/geo-routing.client.ts
   async healthCheck(): Promise<void> {
     if (this.isOpen()) {
       throw new Error('Circuit breaker open');
     }
     // Just check if circuit breaker is open
   }
   ```

3. **Trip Service health** - add Geo check:
   ```typescript
   import { GeoRoutingClient } from '../legs/geo-routing.client';
   
   export class HealthController {
     constructor(
       private readonly dataSource: DataSource,
       @Inject(REDIS_CLIENT) private readonly redis: { ping: () => Promise<string> },
       private readonly geoClient: GeoRoutingClient,
     ) {}
     
     @Get('ready')
     async ready(@Res({ passthrough: true }) res: Response) {
       const checks = {
         db: 'ok' as 'ok' | 'fail',
         redis: 'ok' as 'ok' | 'fail',
         geo: 'ok' as 'ok' | 'fail',
       };
       
       // ... existing db/redis checks ...
       
       // Geo service check
       try {
         await this.geoClient.healthCheck();
       } catch {
         checks.geo = 'fail';
       }
       
       const status = checks.db === 'fail' ? 'unready'
         : checks.redis === 'fail' || checks.geo === 'fail' ? 'degraded'
         : 'ok';
       
       res.status(checks.db === 'fail' ? 503 : 200);
       return { status, timestamp: new Date().toISOString(), checks };
     }
   }
   ```

**Acceptance Criteria:**
- Health endpoint checks all critical dependencies
- Returns 503 if DB down (unready)
- Returns 200 with status=degraded if Redis/Typesense/Photon/Geo down
- Each check has 2s timeout
- Response includes individual check statuses

**Test:**
1. Start all services, call GET /api/health/ready
2. Assert status=ok, all checks pass
3. Stop Typesense, call health endpoint
4. Assert status=degraded, typesense=fail
5. Stop DB, call health endpoint
6. Assert status=unready, 503 response

---

#### TASK-007: Add explicit transaction boundaries to trip mutations
**Priority:** P1  
**Problem:** Lines 177-312 in `services/trip-service/src/trips/trips.service.ts` - `patch()` method updates trip, days, and stops across multiple `save()` calls. Line 189 shows transaction wrapper exists but not used consistently. If one operation fails mid-flight, database could be left in inconsistent state (e.g., days updated but trip version not incremented).

**Evidence:**
```typescript
// services/trip-service/src/trips/trips.service.ts:177-312
async patch(userId: string, tripId: string, dto: PatchTripDto, expectedVersion?: number): Promise<TripDetailDto> {
  const trip = await this.requireOwnedTrip(userId, tripId);
  this.assertVersion(trip, expectedVersion);
  const modeChanged = dto.defaultTravelMode !== undefined && dto.defaultTravelMode !== trip.defaultTravelMode;
  
  // Line 189: Transaction exists but other methods don't use it
  await this.tripsRepo.manager.transaction(async (em) => {
    const tripsRepo = em.getRepository(TripEntity);
    const daysRepo = em.getRepository(TripDayEntity);
    const stopsRepo = em.getRepository(TripStopEntity);
    // ... updates inside transaction ...
  });
  
  return this.findOne(userId, tripId);
}

// But addStop, patchStop, deleteStop, moveStop don't use transactions:
async addStop(userId: string, tripId: string, dto: AddStopDto, expectedVersion?: number): Promise<TripMutationResult> {
  const trip = await this.requireOwnedTrip(userId, tripId);
  this.assertVersion(trip, expectedVersion);
  // ... multiple save operations without transaction wrapper ...
  await this.stopsRepo.save(siblings);  // Line 382
  const saved = await this.stopsRepo.save(stop);  // Line 410
  trip.version = trip.version + 1;
  await this.tripsRepo.save(trip);  // Line 417 - if this fails, stops already saved
}
```

**Files to touch:**
- `services/trip-service/src/trips/trips.service.ts`

**Changes:**
Wrap multi-repository mutations in `this.tripsRepo.manager.transaction()` for: `addStop()`, `patchStop()`, `moveStop()`, `deleteStop()`. The `patch()` method already uses transactions, so verify it's correct.

**Step-by-step for addStop():**
```typescript
async addStop(
  userId: string,
  tripId: string,
  dto: AddStopDto,
  expectedVersion?: number,
): Promise<TripMutationResult> {
  await this.tripsRepo.manager.transaction(async (manager) => {
    const tripsRepo = manager.getRepository(TripEntity);
    const daysRepo = manager.getRepository(TripDayEntity);
    const stopsRepo = manager.getRepository(TripStopEntity);
    
    const trip = await tripsRepo.findOne({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException();
    this.assertVersion(trip, expectedVersion);
    
    if (dto.tripDayId) {
      const day = await daysRepo.findOne({
        where: { id: dto.tripDayId, tripId },
      });
      if (!day) throw new NotFoundException('Day not found');
    }
    
    const siblings = await stopsRepo.find({
      where: { tripId },
      order: { position: 'ASC' },
    });
    
    const insertAt =
      dto.position !== undefined
        ? Math.min(Math.max(0, dto.position), siblings.length)
        : siblings.length;
    
    for (const s of siblings) {
      if (s.position >= insertAt) {
        s.position += 1;
      }
    }
    if (siblings.length) {
      await stopsRepo.save(siblings);
    }
    
    const placeId =
      dto.place.source === 'db' && UUID_RE.test(dto.place.id) ? dto.place.id : null;
    
    const stop = stopsRepo.create({
      tripId,
      tripDayId: dto.tripDayId ?? null,
      position: insertAt,
      name: dto.place.name,
      address: dto.place.address ?? null,
      lat: String(dto.place.lat),
      lng: String(dto.place.lng),
      category: dto.place.category ?? null,
      externalPlaceId: dto.place.id,
      openingHoursRaw: dto.place.openingHours ?? null,
      placeId,
      durationMinutes: dto.durationMinutes ?? 60,
      bufferAfterMinutes: null,
      travelModeOverride: dto.travelModeOverride ?? null,
      anchorTime: dto.anchorTime ?? null,
      priority: dto.priority ?? 'nice',
      status: 'todo',
      travelFromPrevSeconds: null,
      travelFromPrevDistanceM: null,
      travelModeUsed: null,
    });
    const saved = await stopsRepo.save(stop);
    
    if (dto.tags?.length) {
      await this.syncTags(saved.id, dto.tags);
    }
    
    trip.version = trip.version + 1;
    await tripsRepo.save(trip);
    
    if (saved.tripDayId) {
      await this.recomputeLegsForDay(trip, saved.tripDayId);
    }
  });
  
  const detail = await this.findOne(userId, tripId);
  return { trip: detail };
}
```

Apply the same pattern to `patchStop()`, `moveStop()`, and `deleteStop()`.

**Acceptance Criteria:**
- All multi-table mutations wrapped in transactions
- Transaction managers used for all repo operations within transaction
- Exceptions cause automatic rollback
- Existing tests still pass

**Test:**
1. Mock `stopsRepo.save()` to throw error in middle of addStop()
2. Assert trip version not incremented
3. Assert no stops were saved
4. Verify database rolled back to consistent state (requires integration test)

---

#### TASK-008: Add idempotency keys to event handlers
**Priority:** P1  
**Problem:** Redis Streams delivers at-least-once. If `consume()` is called (currently it isn't per TASK-005, but when implemented), duplicate events could be processed. No deduplication mechanism exists. The events package also lacks any unit tests.

**Evidence:**
```typescript
// packages/events/src/streams.ts:23-58 - consume() acks immediately after handler
export async function consume(
  redis: RedisLike,
  stream: string,
  group: string,
  consumer: string,
  handler: (event: DomainEvent<unknown>) => Promise<void>,
): Promise<void> {
  // ...
  for (const [id, fields] of entries) {
    const event = JSON.parse(raw) as DomainEvent<unknown>;
    await handler(event); // Handler could fail, event redelivered
    await redis.xack(stream, group, id); // Ack after handler
  }
}

// packages/events/src/envelope.ts - no eventId field
export interface DomainEvent<T = unknown> {
  type: string;
  occurredAt: string;
  data: T;
}

$ find packages/events -name "*.spec.ts"
# No test files found
```

**Files to touch:**
- `packages/events/src/envelope.ts` (add eventId to DomainEvent)
- `packages/events/src/streams.ts` (update publish to generate eventId, update consume signature)
- `services/geo-service/src/entities/processed-event.entity.ts` (new)
- Future event handler implementations (pattern documented in task)

**Changes:**

1. **Update DomainEvent interface** (`packages/events/src/envelope.ts`):
   ```typescript
   export interface DomainEvent<T = unknown> {
     type: string;
     occurredAt: string;
     eventId?: string; // Optional for backward compat
     data: T;
   }
   ```

2. **Update publish to generate eventId** (`packages/events/src/streams.ts`):
   ```typescript
   import { randomUUID } from 'crypto';
   
   export async function publish(
     redis: RedisLike,
     stream: string,
     event: DomainEvent<unknown>,
   ): Promise<string> {
     const enriched = {
       ...event,
       eventId: event.eventId ?? randomUUID(),
     };
     return redis.xadd(stream, '*', 'data', JSON.stringify(enriched));
   }
   ```

3. **Update consume signature** (`packages/events/src/streams.ts`):
   ```typescript
   export async function consume(
     redis: RedisLike,
     stream: string,
     group: string,
     consumer: string,
     handler: (event: DomainEvent<unknown>, eventId: string, ack: () => Promise<void>) => Promise<void>,
   ): Promise<void> {
     // ... existing setup ...
     for (const [id, fields] of entries) {
       const dataIdx = fields.indexOf('data');
       const raw = dataIdx >= 0 ? fields[dataIdx + 1] : '';
       const event = JSON.parse(raw) as DomainEvent<unknown>;
       const eventId = event.eventId ?? id;
       
       await handler(event, eventId, async () => {
         await redis.xack(stream, group, id);
       });
     }
   }
   ```

4. **Create ProcessedEventEntity** (`services/geo-service/src/entities/processed-event.entity.ts`):
   ```typescript
   import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
   
   @Entity('processed_events')
   export class ProcessedEventEntity {
     @PrimaryColumn({ type: 'nvarchar', length: 64 })
     eventId!: string;
     
     @Column({ name: 'event_type', type: 'nvarchar', length: 64 })
     eventType!: string;
     
     @Column({ name: 'stream_name', type: 'nvarchar', length: 64 })
     streamName!: string;
     
     @CreateDateColumn({ name: 'processed_at' })
     processedAt!: Date;
   }
   ```

5. **Document handler pattern** (example for future use):
   ```typescript
   async handleEvent(event: DomainEvent<unknown>, eventId: string, ack: () => Promise<void>) {
     // Check if already processed
     const existing = await this.processedEvents.findOne({ where: { eventId } });
     if (existing) {
       await ack(); // Already processed, just ack
       return;
     }
     
     // Process event
     await this.doWork(event);
     
     // Record as processed
     await this.processedEvents.save({
       eventId,
       eventType: event.type,
       streamName: 'place.events',
     });
     
     await ack();
   }
   ```

**Acceptance Criteria:**
- All published events have unique eventId
- Consume handler receives eventId and ack callback
- Handler pattern documented for idempotency
- Backward compatible (eventId optional)

**Test:**
1. Unit tests for publish: verify eventId generated
2. Unit tests for consume: verify handler receives eventId
3. Integration test: publish event twice with same eventId, verify handler only processes once (requires handler implementation)

---

### Phase 3: Performance & Code Quality (P2)

#### TASK-009: Add pagination to unbounded queries
**Priority:** P2  
**Problem:** Lines 88, 138 in `services/geo-service/src/search/search.service.ts` - fallback queries load 500-800 rows into memory. For nearby search, loads all active places in category (could be thousands). No pagination on list endpoints.

**Evidence:**
```typescript
// services/geo-service/src/search/search.service.ts:88
async nearby(...): Promise<MapPlaceDto[]> {
  try {
    // ... typesense attempt ...
  } catch (err) {
    this.logger.warn(`Typesense nearby fallback`);
  }
  const all = await this.places.find({ where: { status: 'active', category }, take: 500 });
  return all
    .map((p) => this.toDto(p, { lat, lng }))
    .filter((p) => p.distanceM != null && p.distanceM <= radius)
    .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
    .slice(0, limit);
}

// services/geo-service/src/search/search.service.ts:138
async nearestWithin(lat: number, lng: number, radiusM = REVERSE_SNAP_RADIUS_M): Promise<MapPlaceDto | null> {
  try {
    // ... typesense attempt ...
  } catch (err) {
    this.logger.warn(`Typesense nearestWithin fallback`);
  }
  const candidates = await this.places.find({ where: { status: 'active' }, take: 800 });
  const ranked = candidates
    .map((p) => this.toDto(p, { lat, lng }))
    .filter((p) => p.distanceM != null && p.distanceM <= radiusM)
    .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  return ranked[0] ?? null;
}

// services/trip-service/src/trips/trips.service.ts:154
async findAll(userId: string): Promise<TripSummaryDto[]> {
  const trips = await this.tripsRepo.find({
    where: { userId },
    order: { updatedAt: 'DESC' },
  });
  return trips.map((t) => this.toSummary(t));
}
```

**Files to touch:**
- `services/geo-service/src/search/search.service.ts`
- `services/trip-service/src/trips/trips.service.ts`
- `services/trip-service/src/trips/trips.controller.ts`

**Changes:**

1. **Add bounding box to nearby() fallback** (`search.service.ts`):
   ```typescript
   async nearby(
     lat: number,
     lng: number,
     category: string,
     radius = 1500,
     limit = 40,
   ): Promise<MapPlaceDto[]> {
     try {
       const ids = await this.typesense.nearbyIds(lat, lng, category, radius, limit);
       if (ids.length) {
         const rows = await this.places.find({ where: ids.map((id) => ({ id })) });
         return rows.map((p) => this.toDto(p, { lat, lng }));
       }
     } catch (err) {
       this.logger.warn(`Typesense nearby fallback`);
     }
     
     // Bounding box filter
     const latDelta = (radius / 111_000); // ~111km per degree lat
     const lngDelta = (radius / (111_000 * Math.cos(lat * Math.PI / 180)));
     
     const candidates = await this.places.createQueryBuilder('p')
       .where('p.status = :status AND p.category = :category', { status: 'active', category })
       .andWhere('p.lat BETWEEN :minLat AND :maxLat', {
         minLat: String(lat - latDelta),
         maxLat: String(lat + latDelta),
       })
       .andWhere('p.lng BETWEEN :minLng AND :maxLng', {
         minLng: String(lng - lngDelta),
         maxLng: String(lng + lngDelta),
       })
       .take(200)
       .getMany();
     
     return candidates
       .map((p) => this.toDto(p, { lat, lng }))
       .filter((p) => p.distanceM != null && p.distanceM <= radius)
       .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
       .slice(0, limit);
   }
   ```

2. **Add pagination to findAll trips** (`trips.service.ts`):
   ```typescript
   async findAll(
     userId: string,
     page = 1,
     pageSize = 20,
   ): Promise<{ trips: TripSummaryDto[]; total: number; page: number; pageSize: number }> {
     const [trips, total] = await this.tripsRepo.findAndCount({
       where: { userId },
       order: { updatedAt: 'DESC' },
       skip: (page - 1) * pageSize,
       take: pageSize,
     });
     
     const summaries = trips.map((t) => this.toSummary(t));
     return { trips: summaries, total, page, pageSize };
   }
   ```

3. **Update controller** (`trips.controller.ts`):
   ```typescript
   @Get()
   async findAll(
     @Req() req: { user: { sub: string } },
     @Query('page') page?: string,
     @Query('pageSize') pageSize?: string,
   ) {
     const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
     const size = pageSize ? Math.min(100, Math.max(1, parseInt(pageSize, 10))) : 20;
     return this.tripsService.findAll(req.user.sub, pageNum, size);
   }
   ```

**Acceptance Criteria:**
- Nearby fallback uses bounding box filter (not full table scan)
- findAll trips supports page/pageSize query params
- Maximum pageSize capped at 100
- Response includes pagination metadata (total, page, pageSize)
- Backward compatible (page/pageSize optional)

**Test:**
1. Create 50 trips for test user
2. Call GET /api/trips?page=1&pageSize=20
3. Assert response has 20 trips and total=50
4. Call GET /api/trips?page=2&pageSize=20
5. Assert response has next 20 trips
6. Call GET /api/trips (no params)
7. Assert default pagination applied

---

#### TASK-010: Optimize trip detail query pattern
**Priority:** P2  
**Problem:** Lines 161-175 in `services/trip-service/src/trips/trips.service.ts` - `findOne()` uses 4 separate queries (trip, days, stops, tags). While not as severe as initially thought (tags use IN clause), this can still be optimized with TypeORM relations for better performance.

**Evidence:**
```typescript
// services/trip-service/src/trips/trips.service.ts:161-175
async findOne(userId: string, tripId: string): Promise<TripDetailDto> {
  const trip = await this.requireOwnedTrip(userId, tripId);  // Query 1

  const days = await this.daysRepo.find({  // Query 2
    where: { tripId },
    order: { dayIndex: 'ASC' },
  });
  const stops = await this.stopsRepo.find({  // Query 3
    where: { tripId },
    order: { position: 'ASC' },
  });

  const tagsByStopId = await this.loadTagsByStopId(stops.map((s) => s.id));  // Query 4 (with IN clause)
  return this.toDetail(trip, days, stops, tagsByStopId);
}

// Current: 4 queries for single trip detail
// Possible: 2 queries with relations (trip+days+stops in one, tags in one)
```

**Files to touch:**
- `services/trip-service/src/trips/trips.service.ts`
- `services/trip-service/src/trips/entities/trip.entity.ts` (add relations)
- `services/trip-service/src/trips/entities/trip-day.entity.ts` (add relation)
- `services/trip-service/src/trips/entities/trip-stop.entity.ts` (add relation)

**Changes:**
1. Add TypeORM relations to entities
2. Use query builder with leftJoinAndSelect to fetch trip+days+stops in one query
3. Keep tags query separate (already optimized with IN)

**Step-by-step:**

First, add relations to entities:
```typescript
// services/trip-service/src/trips/entities/trip.entity.ts
import { OneToMany } from 'typeorm';
import { TripDayEntity } from './trip-day.entity';
import { TripStopEntity } from './trip-stop.entity';

@Entity('trips')
export class TripEntity {
  // ... existing fields ...
  
  @OneToMany(() => TripDayEntity, day => day.trip)
  days?: TripDayEntity[];
  
  @OneToMany(() => TripStopEntity, stop => stop.trip)
  stops?: TripStopEntity[];
}

// services/trip-service/src/trips/entities/trip-day.entity.ts
import { ManyToOne, JoinColumn } from 'typeorm';
import { TripEntity } from './trip.entity';

@Entity('trip_days')
export class TripDayEntity {
  // ... existing fields ...
  
  @ManyToOne(() => TripEntity, trip => trip.days)
  @JoinColumn({ name: 'trip_id' })
  trip?: TripEntity;
}

// services/trip-service/src/trips/entities/trip-stop.entity.ts
import { ManyToOne, JoinColumn } from 'typeorm';
import { TripEntity } from './trip.entity';

@Entity('trip_stops')
export class TripStopEntity {
  // ... existing fields ...
  
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
  
  const tagsByStopId = await this.loadTagsByStopId(stops.map(s => s.id));
  return this.toDetail(trip, days, stops, tagsByStopId);
}
```

**Acceptance Criteria:**
- Relations added to entities
- findOne uses single query for trip+days+stops
- Tags still loaded separately (already optimized)
- Query count reduced from 4 to 2
- Existing tests pass

**Test:**
1. Enable TypeORM query logging
2. Call findOne with test trip (5 days, 10 stops)
3. Count SELECT queries in logs
4. Verify 2 queries: one for trip+days+stops JOIN, one for tags
5. Run existing unit tests, verify all pass

---

#### TASK-011: Deduplicate search ranking logic
**Priority:** P2  
**Problem:** `packages/contracts/src/search-ranking.ts` and `tripblogger_api/src/modules/map/utils/search-ranking.ts` contain duplicate implementations of the same ranking algorithm. Code drift risk. Core API should import from @tripblogger/contracts.

**Evidence:**
```bash
$ find . -name "*ranking*" -type f | grep -v node_modules
./packages/contracts/src/search-ranking.ts
./packages/contracts/src/search-ranking.spec.ts
./tripblogger_api/src/modules/map/utils/search-ranking.ts
./tripblogger_api/src/modules/map/utils/search-ranking.spec.ts

$ wc -l packages/contracts/src/search-ranking.ts tripblogger_api/src/modules/map/utils/search-ranking.ts
  115 packages/contracts/src/search-ranking.ts
  115 tripblogger_api/src/modules/map/utils/search-ranking.ts
  230 total
# Same line count, likely duplicates
```

**Files to touch:**
- `tripblogger_api/src/modules/map/utils/search-ranking.ts` (delete)
- `tripblogger_api/src/modules/map/utils/search-ranking.spec.ts` (delete)
- `tripblogger_api/src/modules/map/map.service.ts` (update import)
- `tripblogger_api/src/modules/map/map.service.search.spec.ts` (update import)

**Changes:**
1. Delete duplicate files in Core API
2. Update all imports to use @tripblogger/contracts
3. Verify tests still pass

**Step-by-step:**
```bash
# Delete duplicate files
rm tripblogger_api/src/modules/map/utils/search-ranking.ts
rm tripblogger_api/src/modules/map/utils/search-ranking.spec.ts

# Update imports in all affected files
# Before:
import { rankPlaces } from './utils/search-ranking';

# After:
import { rankPlaces } from '@tripblogger/contracts';
```

Files with imports to update:
- `tripblogger_api/src/modules/map/map.service.ts`
- `tripblogger_api/src/modules/map/map.service.search.spec.ts`

**Acceptance Criteria:**
- Duplicate files deleted
- All imports updated to @tripblogger/contracts
- Core API tests pass
- Core API builds without errors

**Test:**
1. Delete files
2. Update imports
3. Run `npm run test:api`
4. Run `npm run build -w tripblogger-api`
5. Assert no import errors, all tests pass

---

#### TASK-012: Review and reduce unnecessary version increments
**Priority:** P2  
**Problem:** Lines throughout `services/trip-service/src/trips/trips.service.ts` - `trip.version` incremented on every mutation (addStop, patchStop, patchDay, deleteStop, moveStop). Version meant for optimistic concurrency but incremented even for minor changes. This could cause unnecessary conflicts if multiple clients edit simultaneously.

**Evidence:**
```typescript
// services/trip-service/src/trips/trips.service.ts - version++ in many places

// Line 222: patch() increments version
trip.version = trip.version + 1;
await tripsRepo.save(trip);

// Line 333: patchDay() increments version
trip.version = trip.version + 1;
await this.tripsRepo.save(trip);

// Line 417: addStop() increments version
trip.version = trip.version + 1;
await this.tripsRepo.save(trip);

// Line 483: patchStop() increments version (even for just note changes)
trip.version = trip.version + 1;
await this.tripsRepo.save(trip);

// Concern: Every small change increments version, causing conflicts
```

**Files to touch:**
- `services/trip-service/src/trips/trips.service.ts`

**Changes:**
1. Add JSDoc comment explaining version increment policy
2. Review each increment - keep for structural changes, remove for content-only changes
3. Define clear policy: structural (add/remove/move) = increment, content (note/cost) = no increment

**Decision criteria:**
- **Structural change** (add/remove/reorder): increment version
- **Content change** (note, cost, name): consider not incrementing
- **Metadata change** (trip title, dates): increment version

**Step-by-step:**
```typescript
/**
 * Trip version is incremented on structural changes to prevent conflicts:
 * - Adding/removing/moving stops or days
 * - Changing trip metadata (title, dates, travel mode, day start times)
 * 
 * Version MAY NOT be incremented on content-only changes that don't affect
 * structure or scheduling:
 * - Updating stop notes
 * - Changing stop costs (unless it affects budget calculations other clients need)
 * 
 * This policy balances conflict detection with usability - minor edits
 * don't force all clients to refresh.
 */

// Review each method:
// - patch(): KEEP (changes trip metadata/structure)
// - patchDay(): KEEP (changes scheduling)
// - addStop(): KEEP (structural)
// - patchStop(): CONDITIONAL (note-only = skip, structural = keep)
// - deleteStop(): KEEP (structural)
// - moveStop(): KEEP (structural)
```

For patchStop, only increment if structural fields changed:
```typescript
async patchStop(userId: string, tripId: string, stopId: string, dto: PatchStopDto): Promise<TripMutationResult> {
  const trip = await this.requireOwnedTrip(userId, tripId);
  const stop = await this.stopsRepo.findOne({ where: { id: stopId, tripId } });
  if (!stop) throw new NotFoundException('Stop not found');

  let structuralChange = false;
  
  if (dto.durationMinutes !== undefined) {
    stop.durationMinutes = dto.durationMinutes;
    structuralChange = true; // Affects schedule
  }
  if (dto.travelModeOverride !== undefined) {
    stop.travelModeOverride = dto.travelModeOverride;
    structuralChange = true; // Affects routing
  }
  if (dto.anchorTime !== undefined) {
    stop.anchorTime = dto.anchorTime;
    structuralChange = true; // Affects schedule
  }
  if (dto.priority !== undefined) {
    stop.priority = dto.priority;
    structuralChange = true; // Could affect UX/filters
  }
  if (dto.status !== undefined) {
    stop.status = dto.status;
    structuralChange = true; // Affects schedule
  }
  
  // Content-only changes (no version increment needed)
  if (dto.note !== undefined) stop.note = dto.note;
  if (dto.estimatedCostAmount !== undefined) stop.estimatedCostAmount = /* ... */;
  if (dto.estimatedCostCurrency !== undefined) stop.estimatedCostCurrency = /* ... */;
  if (dto.costItems !== undefined) { /* ... */ }
  
  await this.stopsRepo.save(stop);
  
  if (structuralChange) {
    trip.version = trip.version + 1;
    await this.tripsRepo.save(trip);
  }
  
  // ... rest
}
```

**Acceptance Criteria:**
- Version policy documented in code
- patchStop only increments version on structural changes
- Other methods reviewed (keep current behavior or document decision)
- Tests updated if behavior changed

**Test:**
1. Create trip with 2 stops
2. PATCH stop note only
3. Assert trip version unchanged
4. PATCH stop duration
5. Assert trip version incremented
6. Verify no regression in existing tests

---

#### TASK-013: Add rate limiting to internal endpoints
**Priority:** P2  
**Problem:** Lines 40-58 in `services/geo-service/src/internal/internal.controller.ts` - internal endpoints protected by token but no rate limiting. Trip service could overwhelm Geo with routing requests during bulk operations.

**Evidence:**
```typescript
// services/geo-service/src/internal/internal.controller.ts:34-58
@Controller('internal')
export class InternalController {
  constructor(
    private readonly search: SearchService,
    private readonly osrm: OsrmRoutingProvider,
    private readonly config: ConfigService,
  ) {}

  @Get('places/:id')
  async getPlace(@Param('id') id: string, @Headers('x-internal-token') token?: string) {
    this.assertToken(token);
    // ... no rate limit
  }

  @Post('routing/table-legs')
  async tableLegs(@Body() dto: TableLegsDto, @Headers('x-internal-token') token?: string) {
    this.assertToken(token);
    // ... no rate limit
  }
}
```

**Files to touch:**
- `services/geo-service/src/internal/rate-limit.guard.ts` (new)
- `services/geo-service/src/internal/internal.controller.ts` (apply guard)
- `services/geo-service/src/app.module.ts` (register guard)

**Changes:**

1. **Create rate-limit.guard.ts**:
   ```typescript
   import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common';
   
   @Injectable()
   export class InternalRateLimitGuard implements CanActivate {
     private requests = new Map<string, number[]>();
     
     canActivate(context: ExecutionContext): boolean {
       const req = context.switchToHttp().getRequest();
       const token = req.headers['x-internal-token'] ?? 'anonymous';
       const now = Date.now();
       const window = 60_000; // 1 minute
       const limit = 100; // 100 requests per minute per token
       
       const timestamps = this.requests.get(token) ?? [];
       const recent = timestamps.filter(t => now - t < window);
       
       if (recent.length >= limit) {
         throw new TooManyRequestsException('Internal rate limit exceeded');
       }
       
       recent.push(now);
       this.requests.set(token, recent);
       
       // Cleanup old entries periodically
       if (this.requests.size > 1000) {
         this.requests.clear();
       }
       
       return true;
     }
   }
   ```

2. **Apply guard to controller**:
   ```typescript
   import { UseGuards } from '@nestjs/common';
   import { InternalRateLimitGuard } from './rate-limit.guard';
   
   @Controller('internal')
   @UseGuards(InternalRateLimitGuard)
   export class InternalController {
     // ... existing methods
   }
   ```

3. **Register in module**:
   ```typescript
   import { InternalRateLimitGuard } from './internal/rate-limit.guard';
   
   @Module({
     providers: [
       // ... existing
       InternalRateLimitGuard,
     ],
   })
   export class AppModule {}
   ```

**Acceptance Criteria:**
- Internal endpoints limited to 100 req/min per token
- 429 response when limit exceeded
- Rate limit state cleaned up periodically
- Doesn't block legitimate traffic

**Test:**
1. Make 100 requests to /internal/routing/table-legs in 30 seconds
2. Assert all succeed
3. Make 101st request immediately
4. Assert 429 Too Many Requests response
5. Wait 60 seconds, verify rate limit resets

---

#### TASK-014: Add unit tests for events package
**Priority:** P2  
**Problem:** `packages/events/src/` has no test files. Core infrastructure (publish/consume) untested. ADR 0005 mentions "at-least-once delivery; consumers must be idempotent" but no tests verify this behavior.

**Evidence:**
```bash
$ find packages/events -name "*.spec.ts" -o -name "*.test.ts"
# No results

$ cat packages/events/package.json | grep test
  "test": "jest"
# Test script exists but no test files
```

**Files to touch:**
- `packages/events/src/streams.spec.ts` (new)
- `packages/events/package.json` (verify jest config)

**Changes:**

Create comprehensive test suite for streams.ts:
```typescript
// packages/events/src/streams.spec.ts
import { publish, consume } from './streams';
import type { DomainEvent } from './envelope';

describe('Redis Streams', () => {
  let redis: MockRedis;

  beforeEach(() => {
    redis = new MockRedis();
  });

  describe('publish', () => {
    it('adds event to stream with generated ID', async () => {
      const event: DomainEvent = {
        type: 'place.created',
        occurredAt: '2026-09-24T12:00:00Z',
        data: { placeId: '123' },
      };

      const id = await publish(redis, 'place.events', event);

      expect(id).toBe('1-0');
      expect(redis.xadd).toHaveBeenCalledWith(
        'place.events',
        '*',
        'data',
        expect.stringContaining('place.created'),
      );
    });

    it('generates unique eventId for each event', async () => {
      const event: DomainEvent = {
        type: 'place.created',
        occurredAt: '2026-09-24T12:00:00Z',
        data: { placeId: '123' },
      };

      await publish(redis, 'place.events', event);
      await publish(redis, 'place.events', event);

      const calls = (redis.xadd as jest.Mock).mock.calls;
      const event1 = JSON.parse(calls[0][3]);
      const event2 = JSON.parse(calls[1][3]);

      expect(event1.eventId).toBeDefined();
      expect(event2.eventId).toBeDefined();
      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('preserves existing eventId if provided', async () => {
      const event: DomainEvent = {
        type: 'place.created',
        occurredAt: '2026-09-24T12:00:00Z',
        eventId: 'custom-id-123',
        data: { placeId: '123' },
      };

      await publish(redis, 'place.events', event);

      const calls = (redis.xadd as jest.Mock).mock.calls;
      const published = JSON.parse(calls[0][3]);
      expect(published.eventId).toBe('custom-id-123');
    });
  });

  describe('consume', () => {
    it('creates consumer group if not exists', async () => {
      redis.xreadgroup.mockResolvedValue(null);

      await consume(redis, 'place.events', 'geo', 'worker-1', async () => {});

      expect(redis.xgroup).toHaveBeenCalledWith(
        'CREATE',
        'place.events',
        'geo',
        '0',
        'MKSTREAM',
      );
    });

    it('ignores BUSYGROUP error', async () => {
      redis.xgroup.mockRejectedValue(new Error('BUSYGROUP group already exists'));
      redis.xreadgroup.mockResolvedValue(null);

      await expect(
        consume(redis, 'place.events', 'geo', 'worker-1', async () => {})
      ).resolves.not.toThrow();
    });

    it('rethrows non-BUSYGROUP errors', async () => {
      redis.xgroup.mockRejectedValue(new Error('Connection failed'));
      redis.xreadgroup.mockResolvedValue(null);

      await expect(
        consume(redis, 'place.events', 'geo', 'worker-1', async () => {})
      ).rejects.toThrow('Connection failed');
    });

    it('calls handler for each event', async () => {
      const events = [
        { type: 'place.created', occurredAt: '2026-09-24T12:00:00Z', data: {} },
        { type: 'place.updated', occurredAt: '2026-09-24T12:01:00Z', data: {} },
      ];
      
      redis.xreadgroup.mockResolvedValue([
        ['place.events', [
          ['1-0', ['data', JSON.stringify(events[0])]],
          ['1-1', ['data', JSON.stringify(events[1])]],
        ]],
      ]);

      const handler = jest.fn(async (event, eventId, ack) => { await ack(); });

      await consume(redis, 'place.events', 'geo', 'worker-1', handler);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ type: 'place.created' }),
        expect.any(String),
        expect.any(Function),
      );
    });

    it('acks events after handler completes', async () => {
      redis.xreadgroup.mockResolvedValue([
        ['place.events', [
          ['1-0', ['data', JSON.stringify({ type: 'place.created', occurredAt: '2026-09-24T12:00:00Z', data: {} })]],
        ]],
      ]);

      const handler = jest.fn(async (event, eventId, ack) => {
        await ack();
      });

      await consume(redis, 'place.events', 'geo', 'worker-1', handler);

      expect(redis.xack).toHaveBeenCalledWith('place.events', 'geo', '1-0');
    });

    it('does not ack if handler throws', async () => {
      redis.xreadgroup.mockResolvedValue([
        ['place.events', [
          ['1-0', ['data', JSON.stringify({ type: 'place.created', occurredAt: '2026-09-24T12:00:00Z', data: {} })]],
        ]],
      ]);

      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));

      await expect(
        consume(redis, 'place.events', 'geo', 'worker-1', handler)
      ).rejects.toThrow('Handler failed');

      expect(redis.xack).not.toHaveBeenCalled();
    });

    it('uses eventId from event if present', async () => {
      redis.xreadgroup.mockResolvedValue([
        ['place.events', [
          ['1-0', ['data', JSON.stringify({ type: 'place.created', occurredAt: '2026-09-24T12:00:00Z', eventId: 'evt-123', data: {} })]],
        ]],
      ]);

      const handler = jest.fn(async (event, eventId, ack) => {
        expect(eventId).toBe('evt-123');
        await ack();
      });

      await consume(redis, 'place.events', 'geo', 'worker-1', handler);
    });

    it('falls back to stream id if eventId missing', async () => {
      redis.xreadgroup.mockResolvedValue([
        ['place.events', [
          ['1-0', ['data', JSON.stringify({ type: 'place.created', occurredAt: '2026-09-24T12:00:00Z', data: {} })]],
        ]],
      ]);

      const handler = jest.fn(async (event, eventId, ack) => {
        expect(eventId).toBe('1-0');
        await ack();
      });

      await consume(redis, 'place.events', 'geo', 'worker-1', handler);
    });
  });
});

class MockRedis {
  xadd = jest.fn().mockResolvedValue('1-0');
  xgroup = jest.fn().mockResolvedValue('OK');
  xreadgroup = jest.fn().mockResolvedValue(null);
  xack = jest.fn().mockResolvedValue(1);
}
```

**Acceptance Criteria:**
- Tests cover publish (ID generation, eventId handling)
- Tests cover consume (group creation, handler invocation, acking)
- Tests verify error handling (BUSYGROUP, handler failures)
- All tests pass: `npm test -w @tripblogger/events`
- Coverage >80% for streams.ts

**Test:**
Run `npm test -w @tripblogger/events` and verify:
- All tests pass
- No errors or warnings
- Coverage report shows >80% line coverage

---

## Summary Statistics

**Total Tasks:** 14  
**Priority Breakdown:**
- P0 (Critical): 3 tasks
- P1 (High): 5 tasks
- P2 (Medium): 6 tasks

**Files to Touch:** ~30 files  
**New Files to Create:** ~5 files  
**Estimated Lines Changed:** ~1,200 lines

**Task Dependencies:**
- None of the P0 tasks depend on each other (can be parallelized)
- TASK-005 (outbox poller) → TASK-008 (idempotency)
- TASK-002 (indexes) should complete before performance testing
- TASK-010 (query optimization) requires TASK-002 (indexes) for accurate measurement

**Parallel Execution Groups:**

**Group A (P0 - can run in parallel):**
- TASK-001: Auth guard timeouts/logging (services/*/auth/jwks-auth.guard.ts)
- TASK-002: Database indexes (services/*/entities/*.entity.ts)
- TASK-003: JWKS error handling (services/*/auth/jwks-auth.guard.ts)

**Group B (P1 - can run in parallel after Group A):**
- TASK-004: Retry logic (services/trip-service/src/legs/geo-routing.client.ts)
- TASK-006: Health checks (services/*/health/health.controller.ts)
- TASK-007: Transactions (services/trip-service/src/trips/trips.service.ts)

**Group C (P1 - depends on Group B):**
- TASK-005: Outbox poller (services/geo-service/src/outbox/, contribute/)
- TASK-008: Idempotency (packages/events/src/, services/geo-service/src/entities/)

**Group D (P2 - can run in parallel after indexes):**
- TASK-009: Pagination (services/*/search/, services/trip-service/src/trips/)
- TASK-010: Query optimization (services/trip-service/src/trips/, entities/)
- TASK-011: Deduplicate (tripblogger_api/src/modules/map/)
- TASK-012: Version policy (services/trip-service/src/trips/trips.service.ts)
- TASK-013: Rate limiting (services/geo-service/src/internal/)
- TASK-014: Tests (packages/events/src/streams.spec.ts)

**Recommended Execution Order:**
1. Execute Group A tasks in parallel (3 agents)
2. Execute Group B tasks in parallel (3 agents)
3. Execute Group C tasks sequentially (outbox before idempotency)
4. Execute Group D tasks in parallel (6 agents)

---

## Additional Findings

### Security Observations
- All secrets in docker-compose.yml have weak defaults (`change_this_...`)
- No secrets rotation mechanism documented
- JWT keys mounted as files (good) but no rotation documentation
- Internal token is static (should be rotated periodically)

### npm audit Results
56 vulnerabilities found during install:
- 4 low
- 26 moderate
- 26 high
- 0 critical

Recommend running `npm audit fix` after reviewing breaking changes.

### Missing Features Noted in Docs
- Photon index not populated (needs import runbook)
- OSRM self-hosted not configured (using public endpoint)
- Vector tiles not implemented
- Clustering not implemented
- No e2e tests or integration test suite
- Migrations not configured for services (TypeORM CLI scripts missing)

### Positive Observations
- Clean service boundaries (good separation of concerns)
- Circuit breaker pattern implemented in Trip→Geo client
- Health check endpoints present on all services
- Proper validation pipes on all controllers
- Good test coverage on business logic (trips, search, contracts)
- Consistent error handling patterns
- Transaction support already present in patch() method
