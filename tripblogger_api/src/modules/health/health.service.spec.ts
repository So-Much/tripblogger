import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns unready + 503 when DataSource.query throws', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('down')),
    };
    const redis = { ping: jest.fn().mockResolvedValue('PONG') };
    const svc = new HealthService(dataSource as never, redis as never);
    const result = await svc.getReady();
    expect(result.httpStatus).toBe(503);
    expect(result.body.status).toBe('unready');
    expect(result.body.checks.db).toBe('fail');
  });

  it('returns degraded when redis fails but db is ok', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([{ '': 1 }]) };
    const redis = { ping: jest.fn().mockRejectedValue(new Error('no redis')) };
    const svc = new HealthService(dataSource as never, redis as never);
    const result = await svc.getReady();
    expect(result.httpStatus).toBe(200);
    expect(result.body.status).toBe('degraded');
    expect(result.body.checks.redis).toBe('fail');
  });
});
