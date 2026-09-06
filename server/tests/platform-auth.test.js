const {
  app,
  request,
  closePool,
  makePlatformAdmin,
  makeTenant,
} = require('./helpers');

afterAll(closePool);

describe('platformAuth gate', () => {
  it('401 without a token', async () => {
    const res = await request(app).get('/api/platform/health');
    expect(res.status).toBe(401);
  });

  it('401 with a garbage token', async () => {
    const res = await request(app)
      .get('/api/platform/health')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('403 for a valid tenant-admin token (not a platform admin)', async () => {
    const tenant = await makeTenant();
    const res = await request(app)
      .get('/api/platform/health')
      .set('Authorization', `Bearer ${tenant.token}`);
    expect(res.status).toBe(403);
  });

  it('200 for a platform-admin token', async () => {
    const op = await makePlatformAdmin();
    const res = await request(app)
      .get('/api/platform/health')
      .set('Authorization', `Bearer ${op.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.db.connected).toBe(true);
  });

  it('also guards the legacy /api/admin/* routes', async () => {
    const tenant = await makeTenant();
    const op = await makePlatformAdmin();
    const asTenant = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tenant.token}`);
    const asOp = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${op.token}`);
    expect(asTenant.status).toBe(403);
    expect(asOp.status).toBe(200);
  });
});
