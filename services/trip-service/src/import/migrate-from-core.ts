import 'dotenv/config';
import { DataSource } from 'typeorm';
import { tripDataSourceOptions } from '../database/data-source';

async function main() {
  const core = new DataSource({
    type: 'mssql',
    host: process.env.CORE_DB_HOST ?? process.env.DB_HOST,
    port: Number(process.env.CORE_DB_PORT ?? process.env.DB_PORT ?? 1433),
    username: process.env.CORE_DB_USERNAME ?? process.env.DB_USERNAME,
    password: process.env.CORE_DB_PASSWORD ?? process.env.DB_PASSWORD,
    database: process.env.CORE_DB_NAME ?? 'tripblogger',
    options: { encrypt: false, trustServerCertificate: true, useUTC: true },
  });
  const trip = new DataSource(tripDataSourceOptions());
  await core.initialize();
  await trip.initialize();
  const trips = (await core.query('SELECT * FROM trips')) as Array<Record<string, unknown>>;
  for (const row of trips) {
    await trip.query(
      `IF NOT EXISTS (SELECT 1 FROM trips WHERE id = @0)
       INSERT INTO trips (id, user_id, title, destination_label, destination_lat, destination_lng, start_date, end_date, default_travel_mode, default_buffer_minutes, default_day_start_time, status, version, budget_amount, budget_currency, timezone, created_at, updated_at)
       VALUES (@0,@1,@2,@3,@4,@5,@6,@7,@8,@9,@10,@11,@12,@13,@14,'+07:00',SYSUTCDATETIME(),SYSUTCDATETIME())`,
      [
        row.id,
        row.user_id,
        row.title,
        row.destination_label,
        row.destination_lat,
        row.destination_lng,
        row.start_date,
        row.end_date,
        row.default_travel_mode,
        row.default_buffer_minutes,
        row.default_day_start_time,
        row.status,
        row.version,
        row.budget_amount,
        row.budget_currency,
      ],
    );
  }
  const days = (await core.query('SELECT id, trip_id, date, day_index, start_time FROM trip_days')) as Array<Record<string, unknown>>;
  for (const row of days) {
    await trip.query(
      `IF NOT EXISTS (SELECT 1 FROM trip_days WHERE id = @0)
       INSERT INTO trip_days (id, trip_id, date, day_index, start_time)
       VALUES (@0,@1,@2,@3,@4)`,
      [row.id, row.trip_id, row.date, row.day_index, row.start_time],
    );
  }
  const stops = (await core.query(
    `SELECT id, trip_id, trip_day_id, position, name, address, lat, lng, category, external_place_id, opening_hours_raw, location_id,
            duration_minutes, buffer_after_minutes, travel_mode_override, anchor_time, priority, status,
            travel_from_prev_seconds, travel_from_prev_distance_m, travel_mode_used, travel_computed_at, note,
            estimated_cost_amount, estimated_cost_currency, cost_items_json
     FROM trip_stops`,
  )) as Array<Record<string, unknown>>;
  for (const row of stops) {
    await trip.query(
      `IF NOT EXISTS (SELECT 1 FROM trip_stops WHERE id = @0)
       INSERT INTO trip_stops (
         id, trip_id, trip_day_id, position, name, address, lat, lng, category, external_place_id, opening_hours_raw, place_id,
         duration_minutes, buffer_after_minutes, travel_mode_override, anchor_time, priority, status,
         travel_from_prev_seconds, travel_from_prev_distance_m, travel_mode_used, travel_computed_at, note,
         estimated_cost_amount, estimated_cost_currency, cost_items_json, created_at, updated_at
       ) VALUES (
         @0,@1,@2,@3,@4,@5,@6,@7,@8,@9,@10,@11,@12,@13,@14,@15,@16,@17,@18,@19,@20,@21,@22,@23,@24,@25,SYSUTCDATETIME(),SYSUTCDATETIME()
       )`,
      [
        row.id, row.trip_id, row.trip_day_id, row.position, row.name, row.address, row.lat, row.lng, row.category,
        row.external_place_id, row.opening_hours_raw, row.location_id, row.duration_minutes, row.buffer_after_minutes,
        row.travel_mode_override, row.anchor_time, row.priority, row.status, row.travel_from_prev_seconds,
        row.travel_from_prev_distance_m, row.travel_mode_used, row.travel_computed_at, row.note, row.estimated_cost_amount,
        row.estimated_cost_currency, row.cost_items_json,
      ],
    );
  }
  const tags = (await core.query('SELECT id, trip_stop_id, tag, is_system FROM trip_stop_tags')) as Array<Record<string, unknown>>;
  for (const row of tags) {
    await trip.query(
      `IF NOT EXISTS (SELECT 1 FROM trip_stop_tags WHERE id = @0)
       INSERT INTO trip_stop_tags (id, trip_stop_id, tag, is_system) VALUES (@0,@1,@2,@3)`,
      [row.id, row.trip_stop_id, row.tag, row.is_system],
    );
  }
  await core.destroy();
  await trip.destroy();
  console.log(JSON.stringify({ trips: trips.length, days: days.length, stops: stops.length, tags: tags.length }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
