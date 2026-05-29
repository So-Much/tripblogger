import { Injectable } from '@nestjs/common';
import { TRIPS_REALTIME_EVENTS } from './trips.events';
import { TripsRealtimeGateway } from './trips.realtime.gateway';

@Injectable()
export class TripsRealtimeBroadcastService {
  constructor(private readonly gateway: TripsRealtimeGateway) {}

  emitStopAdded(tripId: string, payload: unknown) {
    this.gateway.server.to(this.room(tripId)).emit(TRIPS_REALTIME_EVENTS.stopAdded, payload);
  }

  emitStopDeleted(tripId: string, payload: unknown) {
    this.gateway.server.to(this.room(tripId)).emit(TRIPS_REALTIME_EVENTS.stopDeleted, payload);
  }

  emitStopsReordered(tripId: string, payload: unknown) {
    this.gateway.server.to(this.room(tripId)).emit(TRIPS_REALTIME_EVENTS.stopsReordered, payload);
  }

  emitStopStatusChanged(tripId: string, payload: unknown) {
    this.gateway.server.to(this.room(tripId)).emit(TRIPS_REALTIME_EVENTS.stopStatusChanged, payload);
  }

  emitRecommendationsReady(tripId: string, count: number) {
    this.gateway.server
      .to(this.room(tripId))
      .emit(TRIPS_REALTIME_EVENTS.recommendationsReady, { tripId, count });
  }

  emitMemberJoined(tripId: string, payload: unknown) {
    this.gateway.server.to(this.room(tripId)).emit(TRIPS_REALTIME_EVENTS.memberJoined, payload);
  }

  private room(tripId: string) {
    return `trip:${tripId}`;
  }
}
