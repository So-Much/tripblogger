import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Typesense, { Client } from 'typesense';
import type { PlaceEntity } from '../entities/place.entity';

const COLLECTION = 'places';

@Injectable()
export class TypesensePlaces implements OnModuleInit {
  private readonly logger = new Logger(TypesensePlaces.name);
  private client: Client | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = new Typesense.Client({
        nodes: [
          {
            host: this.config.get<string>('TYPESENSE_HOST') ?? '127.0.0.1',
            port: this.config.get<number>('TYPESENSE_PORT') ?? 8108,
            protocol: 'http',
          },
        ],
        apiKey: this.config.get<string>('TYPESENSE_API_KEY') ?? 'xyz',
        connectionTimeoutSeconds: 2,
      });
    } catch (err) {
      this.logger.warn(`Typesense client init failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  async ensureCollection(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.collections(COLLECTION).retrieve();
    } catch {
      await this.client.collections().create({
        name: COLLECTION,
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'normalized_name', type: 'string' },
          { name: 'aliases', type: 'string', optional: true },
          { name: 'address', type: 'string', optional: true },
          { name: 'category', type: 'string', facet: true },
          { name: 'location', type: 'geopoint' },
          { name: 'rating_avg', type: 'float' },
          { name: 'review_count', type: 'int32' },
          { name: 'popularity', type: 'float' },
          { name: 'status', type: 'string', facet: true },
          { name: 'source', type: 'string' },
        ],
        default_sorting_field: 'popularity',
      } as never);
    }
  }

  async upsertPlaces(places: PlaceEntity[]): Promise<void> {
    if (!this.client || !places.length) return;
    await this.ensureCollection();
    const docs = places.map((p) => ({
      id: p.id,
      name: p.name,
      normalized_name: p.normalizedName,
      aliases: p.aliases ?? '',
      address: p.address ?? '',
      category: p.category,
      location: [Number(p.lat), Number(p.lng)],
      rating_avg: Number(p.ratingAvg) || 0,
      review_count: p.reviewCount || 0,
      popularity: Number(p.popularity) || 0,
      status: p.status,
      source: p.source,
    }));
    await this.client.collections(COLLECTION).documents().import(docs, { action: 'upsert' });
  }

  async searchIds(q: string, bias: { lat: number; lng: number } | null, limit: number): Promise<string[]> {
    if (!this.client) throw new Error('typesense_unavailable');
    await this.ensureCollection();
    const search: Record<string, unknown> = {
      q,
      query_by: 'name,normalized_name,aliases,address',
      prefix: true,
      num_typos: 2,
      per_page: limit,
      filter_by: 'status:=active',
    };
    if (bias) {
      search.sort_by = `location(${bias.lat},${bias.lng}):asc`;
    }
    const res = await this.client.collections(COLLECTION).documents().search(search);
    return (res.hits ?? []).map((h) => String((h.document as { id: string }).id));
  }

  async nearbyIds(
    lat: number,
    lng: number,
    category: string,
    radiusM: number,
    limit: number,
  ): Promise<string[]> {
    if (!this.client) throw new Error('typesense_unavailable');
    await this.ensureCollection();
    const km = Math.max(0.1, radiusM / 1000);
    const res = await this.client.collections(COLLECTION).documents().search({
      q: '*',
      query_by: 'name',
      filter_by: `status:=active && category:=${category} && location:(${lat},${lng},${km} km)`,
      per_page: limit,
      sort_by: `location(${lat},${lng}):asc`,
    });
    return (res.hits ?? []).map((h) => String((h.document as { id: string }).id));
  }

  /** Nearest active places of any category within radius (for reverse snap). */
  async nearbyIdsAnyCategory(lat: number, lng: number, radiusM: number, limit: number): Promise<string[]> {
    if (!this.client) throw new Error('typesense_unavailable');
    await this.ensureCollection();
    const km = Math.max(0.05, radiusM / 1000);
    const res = await this.client.collections(COLLECTION).documents().search({
      q: '*',
      query_by: 'name',
      filter_by: `status:=active && location:(${lat},${lng},${km} km)`,
      per_page: limit,
      sort_by: `location(${lat},${lng}):asc`,
    });
    return (res.hits ?? []).map((h) => String((h.document as { id: string }).id));
  }

  async healthCheck(): Promise<void> {
    const host = this.config.get<string>('TYPESENSE_HOST') ?? '127.0.0.1';
    const port = this.config.get<number>('TYPESENSE_PORT') ?? 8108;
    const url = `http://${host}:${port}/health`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Typesense health ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
