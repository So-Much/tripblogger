import { Injectable } from '@nestjs/common';
import type { PlanTravelMode } from '@tripblogger/itinerary-engine';
import type { TripStopEntity } from './entities/trip-stop.entity';
import { GeoRoutingClient } from '../legs/geo-routing.client';

/** Compatibility wrapper — trips.service still injects TravelLegsService. */
@Injectable()
export class TravelLegsService {
  constructor(private readonly geo: GeoRoutingClient) {}

  recomputeDayLegs(orderedStops: TripStopEntity[], defaultTravelMode: PlanTravelMode) {
    return this.geo.recomputeDayLegs(orderedStops, defaultTravelMode);
  }
}
