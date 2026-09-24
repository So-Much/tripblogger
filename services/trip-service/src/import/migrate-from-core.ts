import 'dotenv/config';
import { DataSource } from 'typeorm';

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
  const trip = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 1433),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? 'tripblogger_trips',
    options: { encrypt: false, trustServerCertificate: true, useUTC: true },
  });
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
  await core.destroy();
  await trip.destroy();
  console.log(JSON.stringify({ trips: trips.length }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
